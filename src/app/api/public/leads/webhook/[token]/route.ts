import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handleApiError, ApiError } from "@/lib/api-guard";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import type { LeadSource } from "@prisma/client";

// Generic incoming lead webhook — option 1 of the lead-intake feature.
// Three intended callers, all sharing this one endpoint:
//   1. Zapier's "Webhooks by Zapier" action / Make.com's "HTTP" module,
//      triggered by their own already-Meta-approved Facebook Lead Ads
//      trigger. No Meta Developer App or App Review needed on EnrolEasy's
//      side for this path.
//   2. A consultancy's OWN website contact/signup form, submitted directly
//      as a plain HTML form (its `action` pointed at this URL — no
//      JavaScript required, works on any site builder). See the `redirect`
//      handling below.
//   3. The same form via the embeddable JS snippet (public/embed/lead-form.js)
//      for an AJAX, no-page-reload experience — see the CORS headers below.
//
// The URL itself embeds the org's secret token (`leadWebhookToken`) instead of
// the public, guessable `slug` used by the marketing-site booking form — this
// endpoint can create leads unattended and at volume, so it needs an
// unguessable identifier.
//
// Field names are intentionally flexible: no-code tools and hand-built forms
// alike get to use whatever field/input names they already have, so we accept
// several common aliases for each field rather than forcing one exact shape.
const VALID_SOURCES: LeadSource[] = [
  "WEBSITE", "REFERRAL", "WALK_IN", "SOCIAL_MEDIA", "EVENT",
  "PARTNER_AGENT", "META_ADS", "CSV_IMPORT", "OTHER",
];

// Opened up broadly since this is a public, token-gated write endpoint meant
// to be called from arbitrary third-party domains (a consultancy's own
// website) — same trust model as the webhook URL itself, not a new exposure.
const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function withCors(res: NextResponse): NextResponse {
  Object.entries(CORS_HEADERS).forEach(([k, v]) => res.headers.set(k, v));
  return res;
}

export async function OPTIONS() {
  return withCors(new NextResponse(null, { status: 204 }));
}

function firstString(body: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const v = body[key];
    if (typeof v === "string" && v.trim().length > 0) return v.trim();
    if (typeof v === "number") return String(v);
  }
  return undefined;
}

// Accepts JSON (Zapier/Make/the JS snippet) as well as standard HTML form
// encoding (a plain <form method="POST"> submit sends
// application/x-www-form-urlencoded; some page builders use multipart
// instead) — Request.formData() transparently handles both of those.
async function parseBody(req: NextRequest): Promise<Record<string, unknown>> {
  const contentType = req.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    try {
      return await req.json();
    } catch {
      throw new ApiError(400, "Expected a JSON body");
    }
  }
  try {
    const form = await req.formData();
    const body: Record<string, unknown> = {};
    form.forEach((value, key) => {
      if (typeof value === "string") body[key] = value;
    });
    return body;
  } catch {
    throw new ApiError(400, "Expected a JSON or form-encoded body");
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;

    // Keyed by the webhook token itself (not IP) - callers here are
    // third-party services (Zapier, Make, a consultancy's own site) whose
    // IPs vary or are shared across many customers, but the token uniquely
    // identifies one org's inbound feed. 60/min comfortably covers a real
    // burst of ad-lead deliveries while still capping runaway retries.
    const { allowed, retryAfterSeconds } = await checkRateLimit(`lead-webhook:${token}`, 60, 60);
    if (!allowed) return withCors(rateLimitResponse(retryAfterSeconds));

    const org = await prisma.organization.findUnique({ where: { leadWebhookToken: token } });
    if (!org) throw new ApiError(404, "Unknown or rotated webhook token");

    const body = await parseBody(req);

    // Some tools nest the actual lead fields (e.g. Zapier's raw Meta payload
    // shape is { field_data: [...] } style) — support a flat top-level shape
    // primarily, but also unwrap a single common nesting under "lead" or "data".
    const flat = (typeof body.lead === "object" && body.lead) ? (body.lead as Record<string, unknown>)
      : (typeof body.data === "object" && body.data) ? (body.data as Record<string, unknown>)
      : body;

    const firstName = firstString(flat, ["firstName", "first_name"]);
    const lastName = firstString(flat, ["lastName", "last_name"]);
    const fullNameRaw = firstString(flat, ["fullName", "full_name", "name"]);
    const fullName = fullNameRaw ?? [firstName, lastName].filter(Boolean).join(" ").trim();

    const email = firstString(flat, ["email", "email_address"]);
    const phone = firstString(flat, ["phone", "phone_number", "phoneNumber"]);
    const interestedCountry = firstString(flat, ["interestedCountry", "interested_country", "country"]);
    const targetIntake = firstString(flat, ["targetIntake", "target_intake", "intake"]);
    const externalId = firstString(flat, ["externalId", "external_id", "leadId", "lead_id", "id", "leadgen_id"]);
    const sourceRaw = firstString(flat, ["source"]);
    const source = (sourceRaw && VALID_SOURCES.includes(sourceRaw.toUpperCase() as LeadSource))
      ? (sourceRaw.toUpperCase() as LeadSource)
      : "OTHER";
    // Only meaningful for plain-HTML-form submissions: a hidden field pointing
    // back at the consultancy's own thank-you page, so the visitor never sees
    // an enroleasy.com response. Absent for Zapier/Make/JS-snippet callers,
    // which just want JSON back. Must be absolute (NextResponse.redirect
    // requires it) — a relative or malformed value is treated as not provided
    // rather than throwing.
    const redirectCandidate = firstString(flat, ["redirect", "redirect_url", "thank_you_url", "thankyou_url"]);
    const redirectTo = redirectCandidate && /^https?:\/\//i.test(redirectCandidate) ? redirectCandidate : undefined;

    if (!fullName) {
      if (redirectTo) return withCors(NextResponse.redirect(`${redirectTo}${redirectTo.includes("?") ? "&" : "?"}lead_error=missing_name`, 303));
      throw new ApiError(400, "Provide a fullName (or firstName/lastName, or name)");
    }
    if (!email && !phone) {
      if (redirectTo) return withCors(NextResponse.redirect(`${redirectTo}${redirectTo.includes("?") ? "&" : "?"}lead_error=missing_contact`, 303));
      throw new ApiError(400, "Provide an email or phone number");
    }

    // Dedup: if this delivery has already been recorded (retried webhook,
    // duplicate Zap run, etc.) don't create a second Lead for it.
    if (externalId) {
      const existing = await prisma.lead.findUnique({
        where: { organizationId_externalId: { organizationId: org.id, externalId } },
      });
      if (existing) {
        if (redirectTo) return withCors(NextResponse.redirect(redirectTo, 303));
        return withCors(NextResponse.json({ ok: true, duplicate: true, leadId: existing.id }));
      }
    }

    const lead = await prisma.lead.create({
      data: {
        organizationId: org.id,
        fullName,
        email,
        phone,
        interestedCountry,
        targetIntake,
        source,
        stage: "NEW",
        externalId,
        lastActivityAt: new Date(),
      },
    });

    if (redirectTo) return withCors(NextResponse.redirect(redirectTo, 303));
    return withCors(NextResponse.json({ ok: true, leadId: lead.id }, { status: 201 }));
  } catch (err) {
    return withCors(handleApiError(err));
  }
}
