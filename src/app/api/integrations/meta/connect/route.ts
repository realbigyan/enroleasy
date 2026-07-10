import { NextRequest, NextResponse } from "next/server";
import { requireSession, handleApiError, ApiError } from "@/lib/api-guard";
import { isMetaConfigured, getMetaAppId, signOAuthState } from "@/lib/meta";

// Kicks off "Connect Facebook Page" — redirects to Facebook's OAuth dialog.
// Requires a real Meta Developer App (META_APP_ID/META_APP_SECRET) and,
// before the requested permissions actually work for anyone but the app's
// own test users, Meta's App Review approval — see the Integrations page for
// the visible status note. This route itself works as soon as the app id is
// set; App Review only gates what the resulting token can do.
export async function GET(req: NextRequest) {
  try {
    const session = await requireSession(["OWNER", "ADMIN"]);
    if (!isMetaConfigured()) {
      throw new ApiError(503, "The Meta integration isn't configured yet on this deployment. See the Integrations page for setup notes.");
    }

    const redirectUri = new URL("/api/integrations/meta/callback", req.nextUrl.origin).toString();
    const state = signOAuthState({ organizationId: session.organizationId, userId: session.userId });

    const dialog = new URL("https://www.facebook.com/v21.0/dialog/oauth");
    dialog.searchParams.set("client_id", getMetaAppId());
    dialog.searchParams.set("redirect_uri", redirectUri);
    dialog.searchParams.set("state", state);
    dialog.searchParams.set("scope", "pages_show_list,pages_manage_metadata,leads_retrieval");

    return NextResponse.redirect(dialog.toString());
  } catch (err) {
    return handleApiError(err);
  }
}
