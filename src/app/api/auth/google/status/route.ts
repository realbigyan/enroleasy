import { NextResponse } from "next/server";
import { isGoogleSSOConfigured } from "@/lib/google-oauth";

// Public, unauthenticated — drives whether the login page shows the
// "Continue with Google" button. Safe to expose: it reveals nothing beyond
// whether this deployment has a Google OAuth client configured.
export async function GET() {
  return NextResponse.json({ configured: isGoogleSSOConfigured() });
}
