import jwt from "jsonwebtoken";

// Google OAuth SSO for staff login — an alternative to email/password for
// EXISTING users only. Uses ONE EnrolEasy-owned Google Cloud OAuth client
// (not one per consultancy, same model as the Meta integration in
// src/lib/meta.ts): a staff member signs in with Google, we look up a User
// row whose email matches the verified Google account email, and log them
// in. This never creates a new Organization or User — someone with no
// matching account gets a clear "ask your workspace owner to invite you"
// message instead. Until GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET are set, every
// function here is inert and the login page simply hides the button.
const STATE_SECRET = process.env.JWT_SECRET ?? "dev-secret-change-me";
const GOOGLE_AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_ENDPOINT = "https://www.googleapis.com/oauth2/v3/userinfo";

export function isGoogleSSOConfigured(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

function getGoogleClientId(): string {
  const id = process.env.GOOGLE_CLIENT_ID;
  if (!id) throw new Error("GOOGLE_CLIENT_ID is not configured");
  return id;
}

function getGoogleClientSecret(): string {
  const secret = process.env.GOOGLE_CLIENT_SECRET;
  if (!secret) throw new Error("GOOGLE_CLIENT_SECRET is not configured");
  return secret;
}

// Short-lived CSRF-protection state for the OAuth redirect round-trip. No
// user/org context is embedded (unlike Meta's connect flow) since this runs
// before the visitor is authenticated at all — it just proves the callback
// corresponds to a /start call this server issued, within the last 10 minutes.
export function signOAuthState(): string {
  return jwt.sign({ purpose: "google_sso" }, STATE_SECRET, { expiresIn: "10m" });
}

export function verifyOAuthState(state: string): boolean {
  try {
    const decoded = jwt.verify(state, STATE_SECRET) as { purpose?: string };
    return decoded.purpose === "google_sso";
  } catch {
    return false;
  }
}

export function buildGoogleAuthUrl(redirectUri: string, state: string): string {
  const url = new URL(GOOGLE_AUTH_ENDPOINT);
  url.searchParams.set("client_id", getGoogleClientId());
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("state", state);
  // Skip the account picker only when there's exactly one signed-in Google
  // session; otherwise Google shows it automatically. "select_account" makes
  // switching accounts easy for staff who use Google for both work and
  // personal — more relevant here than for a one-time app connect flow.
  url.searchParams.set("prompt", "select_account");
  return url.toString();
}

export async function exchangeCodeForTokens(code: string, redirectUri: string): Promise<{ access_token: string }> {
  const res = await fetch(GOOGLE_TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: getGoogleClientId(),
      client_secret: getGoogleClientSecret(),
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });
  const data = await res.json();
  if (!res.ok || !data.access_token) {
    throw new Error(data.error_description ?? data.error ?? "Failed to exchange code for an access token");
  }
  return data;
}

export type GoogleUserInfo = {
  email: string;
  email_verified: boolean;
  name?: string;
  picture?: string;
};

export async function fetchGoogleUserInfo(accessToken: string): Promise<GoogleUserInfo> {
  const res = await fetch(GOOGLE_USERINFO_ENDPOINT, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = await res.json();
  if (!res.ok || !data.email) {
    throw new Error("Failed to fetch Google account info");
  }
  return data;
}
