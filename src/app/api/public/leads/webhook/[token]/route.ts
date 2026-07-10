import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handleApiError, ApiError } from "@/lib/api-guard";
import type { LeadSource } from "@prisma/client";

// Generic incoming lead webhook — option 1 of the lead-intake feature.
// Point a Zapier "Webhooks by Zapier" action (triggered by Zapier's built-in,
// already-Meta-approved "New Lead in Facebook Lead Ads" trigger) or a Make.com
// "HTTP" module at this URL. No Meta Developer App or App Review needed on
// EnrolEasy's side — Zapier/Make already hold that approval, and each
// consultancy wires up their own Zap independently. See the Integrations
// settings page for the exact URL and step-by-step setup notes.
//
// The URL itself embeds the org's secret token (`leadWebhookToken`) instead of
// the public, guessable `slug` used by the marketing-site booking form — this
// endpoint can create leads unattended and at volume, so it needs an
// unguessable identifier.
//
// Field names are intentionally flexible: no-code tools let a user map
// whatever JSON keys they want, so we accept several common aliases for each
// field rather than forcing one exact shape.
const VALID_SOURCES: LeadSource[] = [
  "WEBSITE", "REFERRAL", "WALK_IN", "SOCIAL_MEDIA", "EVENT",
  "PARTNER_AGENT", "META_ADS", "CSV_IMPORT", "OTHER",
];

function firstString(body: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const v = body[key];
    if (typeof v === "string" && v.trim().length > 0) return v.trim();
    if (typeof v === "number") return String(v);
  }
  return undefined;
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;
    const org = await prisma.organization.findUnique({ where: { leadWebhookToken: token } });
    if (!org) throw new ApiError(404, "Unknown or rotated webhook token");

    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      throw new ApiError(400, "Expected a JSON body");
    }

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

    if (!fullName) throw new ApiError(400, "Provide a fullName (or firstName/lastName, or name)");
    if (!email && !phone) throw new ApiError(400, "Provide an email or phone number");

    // Dedup: if this delivery has already been recorded (retried webhook,
    // duplicate Zap run, etc.) don't create a second Lead for it.
    if (externalId) {
      const existing = await prisma.lead.findUnique({
        where: { organizationId_externalId: { organizationId: org.id, externalId } },
      });
      if (existing) {
        return NextResponse.json({ ok: true, duplicate: true, leadId: existing.id });
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

    return NextResponse.json({ ok: true, leadId: lead.id }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
