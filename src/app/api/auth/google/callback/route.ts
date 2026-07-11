import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { setSessionCookie } from "@/lib/auth";
import {
  isGoogleSSOConfigured,
  verifyOAuthState,
  exchangeCodeForTokens,
  fetchGoogleUserInfo,
} from "@/lib/google-oauth";
import { checkRateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";

function loginError(origin: string, code: string) {
  return NextResponse.redirect(new URL(`/login?error=${code}`, origin));
}

// Google's redirect target after the consent screen. Only ever logs in an
// EXISTING, active user whose email matches the verified Google account —
// never creates a new Organization or User. Someone with no matching
// account gets sent back with a clear error instead.
export async function GET(req: NextRequest) {
  const origin = req.nextUrl.origin;
  const ip = getClientIp(req);
  const { allowed, retryAfterSeconds } = await checkRateLimit(`google-sso-callback:${ip}`, 20, 300);
  if (!allowed) return rateLimitResponse(retryAfterSeconds);

  if (!isGoogleSSOConfigured()) return loginError(origin, "google_not_configured");

  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const oauthError = req.nextUrl.searchParams.get("error");

  // The user declined on Google's consent screen, or Google itself errored.
  if (oauthError) return loginError(origin, "google_cancelled");
  if (!code || !state || !verifyOAuthState(state)) return loginError(origin, "google_invalid_state");

  try {
    const redirectUri = new URL("/api/auth/google/callback", origin).toString();
    const { access_token } = await exchangeCodeForTokens(code, redirectUri);
    const googleUser = await fetchGoogleUserInfo(access_token);

    if (!googleUser.email_verified) return loginError(origin, "google_email_unverified");

    const email = googleUser.email.toLowerCase();
    // Email is only unique WITHIN an organization (@@unique([organizationId,
    // email])), not globally — the same address could exist in more than one
    // workspace. Password login can disambiguate implicitly (you need the
    // right password for whichever account you mean); SSO can't, so refuse
    // rather than guessing which org to log into.
    const matches = await prisma.user.findMany({ where: { email, isActive: true } });

    if (matches.length === 0) return loginError(origin, "google_no_account");
    if (matches.length > 1) return loginError(origin, "google_ambiguous_account");

    const user = matches[0];

    // SSO is treated as already-strong authentication (Google enforces its
    // own account security, including its own 2FA) - it bypasses this app's
    // TOTP challenge rather than stacking a second prompt on top of it.
    await setSessionCookie(
      {
        userId: user.id,
        organizationId: user.organizationId,
        role: user.role,
        name: user.name,
        email: user.email,
      },
      { userAgent: req.headers.get("user-agent"), ipAddress: ip }
    );

    return NextResponse.redirect(new URL("/dashboard", origin));
  } catch (err) {
    console.error("Google SSO callback failed:", err instanceof Error ? err.message : err);
    return loginError(origin, "google_failed");
  }
}
