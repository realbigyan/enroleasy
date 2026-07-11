import { NextRequest, NextResponse } from "next/server";
import { isGoogleSSOConfigured, signOAuthState, buildGoogleAuthUrl } from "@/lib/google-oauth";
import { checkRateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";

// Kicks off "Continue with Google" from the login page — redirects to
// Google's OAuth consent screen. Public/unauthenticated by design (this IS
// the login flow), gated only on the platform having a Google OAuth client
// configured at all.
export async function GET(req: NextRequest) {
  const ip = getClientIp(req);
  const { allowed, retryAfterSeconds } = await checkRateLimit(`google-sso-start:${ip}`, 20, 300);
  if (!allowed) return rateLimitResponse(retryAfterSeconds);

  if (!isGoogleSSOConfigured()) {
    return NextResponse.redirect(
      new URL("/login?error=google_not_configured", req.nextUrl.origin)
    );
  }

  const redirectUri = new URL("/api/auth/google/callback", req.nextUrl.origin).toString();
  const state = signOAuthState();
  return NextResponse.redirect(buildGoogleAuthUrl(redirectUri, state));
}
