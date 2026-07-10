import jwt from "jsonwebtoken";

// Native Meta (Facebook/Instagram) Lead Ads integration — option 2 of the
// lead-intake feature. Uses ONE EnrolEasy-owned Meta Developer App (not one
// per consultancy): each org connects their own Facebook Page via OAuth
// ("Facebook Login for Business"), and EnrolEasy's single app calls the
// Graph API on their behalf using that page's access token.
//
// This requires a real Meta Developer App plus a one-time App Review
// approval for the `leads_retrieval`, `pages_show_list`, and
// `pages_manage_metadata` permissions before any of this can actually work —
// that review is controlled entirely by Meta (needs a live privacy policy,
// a demo video, business verification, and can take days to weeks). Until
// META_APP_ID / META_APP_SECRET / META_WEBHOOK_VERIFY_TOKEN are set, every
// function here is inert and the connect flow shows a clear "not yet
// available" state rather than silently failing.
const GRAPH_API_VERSION = "v21.0";
const GRAPH_API_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;
const STATE_SECRET = process.env.JWT_SECRET ?? "dev-secret-change-me";

// Short-lived httpOnly cookie holding the Pages fetched mid-OAuth-flow, used
// only when a Facebook user manages more than one Page and needs to pick
// which one to connect. Named here so the callback and page-picker routes
// (which aren't allowed extra named exports themselves, per Next.js's App
// Router route-handler conventions) share one source of truth.
export const META_PENDING_PAGES_COOKIE = "enroleasy_meta_pending_pages";

export function isMetaConfigured(): boolean {
  return Boolean(process.env.META_APP_ID && process.env.META_APP_SECRET && process.env.META_WEBHOOK_VERIFY_TOKEN);
}

export function getMetaAppId(): string {
  const id = process.env.META_APP_ID;
  if (!id) throw new Error("META_APP_ID is not configured");
  return id;
}

function getMetaAppSecret(): string {
  const secret = process.env.META_APP_SECRET;
  if (!secret) throw new Error("META_APP_SECRET is not configured");
  return secret;
}

export function getMetaWebhookVerifyToken(): string {
  const token = process.env.META_WEBHOOK_VERIFY_TOKEN;
  if (!token) throw new Error("META_WEBHOOK_VERIFY_TOKEN is not configured");
  return token;
}

// Short-lived CSRF-protection state for the OAuth redirect round-trip —
// ties the callback back to the org/user that started the connect flow.
export function signOAuthState(payload: { organizationId: string; userId: string }): string {
  return jwt.sign(payload, STATE_SECRET, { expiresIn: "10m" });
}

export function verifyOAuthState(state: string): { organizationId: string; userId: string } | null {
  try {
    return jwt.verify(state, STATE_SECRET) as { organizationId: string; userId: string };
  } catch {
    return null;
  }
}

export type MetaPage = { id: string; name: string; access_token: string };

export async function exchangeCodeForUserToken(code: string, redirectUri: string): Promise<string> {
  const url = new URL(`${GRAPH_API_BASE}/oauth/access_token`);
  url.searchParams.set("client_id", getMetaAppId());
  url.searchParams.set("client_secret", getMetaAppSecret());
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("code", code);
  const res = await fetch(url.toString());
  const data = await res.json();
  if (!res.ok || !data.access_token) {
    throw new Error(data.error?.message ?? "Failed to exchange code for an access token");
  }
  return data.access_token as string;
}

// Exchanges a short-lived user token for a long-lived one (~60 days), so the
// page access tokens derived from it are also long-lived instead of
// expiring within hours.
export async function exchangeForLongLivedUserToken(shortLivedToken: string): Promise<string> {
  const url = new URL(`${GRAPH_API_BASE}/oauth/access_token`);
  url.searchParams.set("grant_type", "fb_exchange_token");
  url.searchParams.set("client_id", getMetaAppId());
  url.searchParams.set("client_secret", getMetaAppSecret());
  url.searchParams.set("fb_exchange_token", shortLivedToken);
  const res = await fetch(url.toString());
  const data = await res.json();
  if (!res.ok || !data.access_token) {
    throw new Error(data.error?.message ?? "Failed to obtain a long-lived access token");
  }
  return data.access_token as string;
}

export async function listManagedPages(userAccessToken: string): Promise<MetaPage[]> {
  const url = new URL(`${GRAPH_API_BASE}/me/accounts`);
  url.searchParams.set("access_token", userAccessToken);
  url.searchParams.set("fields", "id,name,access_token");
  const res = await fetch(url.toString());
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message ?? "Failed to list Facebook Pages");
  return (data.data ?? []) as MetaPage[];
}

// Resolves a webhook's leadgen_id into the actual submitted field data.
export async function fetchLeadFields(leadgenId: string, pageAccessToken: string): Promise<Record<string, string>> {
  const url = new URL(`${GRAPH_API_BASE}/${leadgenId}`);
  url.searchParams.set("access_token", pageAccessToken);
  const res = await fetch(url.toString());
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message ?? "Failed to fetch lead details from the Graph API");

  const fields: Record<string, string> = {};
  for (const item of (data.field_data ?? []) as { name: string; values: string[] }[]) {
    fields[item.name] = item.values?.[0] ?? "";
  }
  return fields;
}
