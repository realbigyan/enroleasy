import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import {
  verifyOAuthState,
  exchangeCodeForUserToken,
  exchangeForLongLivedUserToken,
  listManagedPages,
  META_PENDING_PAGES_COOKIE,
} from "@/lib/meta";

const STATE_SECRET = process.env.JWT_SECRET ?? "dev-secret-change-me";

function redirectToSettings(origin: string, params: Record<string, string>) {
  const url = new URL("/dashboard/integrations", origin);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  return NextResponse.redirect(url.toString());
}

// Facebook redirects back here after the user approves (or denies) the
// OAuth dialog. On success, fetches the Pages the user manages; if there's
// more than one, stashes them in a short-lived signed cookie and sends the
// user to a page-picker on the Integrations page instead of guessing.
export async function GET(req: NextRequest) {
  const origin = req.nextUrl.origin;
  const error = req.nextUrl.searchParams.get("error");
  if (error) {
    return redirectToSettings(origin, { meta_error: "You declined the Facebook connection request." });
  }

  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  if (!code || !state) {
    return redirectToSettings(origin, { meta_error: "Missing code or state from Facebook's redirect." });
  }

  const claims = verifyOAuthState(state);
  if (!claims) {
    return redirectToSettings(origin, { meta_error: "That connection link expired — please try connecting again." });
  }

  try {
    const redirectUri = new URL("/api/integrations/meta/callback", origin).toString();
    const shortLivedToken = await exchangeCodeForUserToken(code, redirectUri);
    const longLivedToken = await exchangeForLongLivedUserToken(shortLivedToken);
    const pages = await listManagedPages(longLivedToken);

    if (pages.length === 0) {
      return redirectToSettings(origin, {
        meta_error: "That Facebook account doesn't manage any Pages. Connect an account that's an admin of the Page running your lead ads.",
      });
    }

    if (pages.length === 1) {
      const page = pages[0];
      await prisma.metaIntegration.upsert({
        where: { organizationId: claims.organizationId },
        create: {
          organizationId: claims.organizationId,
          pageId: page.id,
          pageName: page.name,
          pageAccessToken: page.access_token,
          connectedByUserId: claims.userId,
          status: "CONNECTED",
        },
        update: {
          pageId: page.id,
          pageName: page.name,
          pageAccessToken: page.access_token,
          connectedByUserId: claims.userId,
          status: "CONNECTED",
        },
      });
      return redirectToSettings(origin, { meta_connected: page.name });
    }

    // Multiple pages — let the user pick which one on the settings page.
    // Only id/name/token travel in the cookie; nothing is persisted yet.
    const pendingToken = jwt.sign(
      { organizationId: claims.organizationId, userId: claims.userId, pages },
      STATE_SECRET,
      { expiresIn: "10m" }
    );
    const cookieStore = await cookies();
    cookieStore.set(META_PENDING_PAGES_COOKIE, pendingToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 600,
    });
    return redirectToSettings(origin, { meta_select: "1" });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Something went wrong connecting to Facebook";
    return redirectToSettings(origin, { meta_error: message });
  }
}
