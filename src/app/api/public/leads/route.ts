import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { handleApiError, ApiError } from "@/lib/api-guard";

// Public, unauthenticated endpoint — the intake form for an org's marketing
// site (e.g. "book a free trial class") posts here directly. Identifies the
// org by its public slug, never by internal IDs.
const schema = z.object({
  orgSlug: z.string(),
  fullName: z.string().min(2),
  email: z.string().email().optional().nullable(),
  phone: z.string().optional().nullable(),
  interestedCountry: z.string().optional().nullable(),
  targetScore: z.string().optional().nullable(),
  // Set by the reception/walk-in kiosk mode of this same form (?kiosk=1) so
  // in-person signups are distinguishable from real website traffic in
  // reporting. Anything else falls back to the WEBSITE default.
  source: z.enum(["WEBSITE", "WALK_IN"]).optional(),
  // Honeypot field — real users never fill this in; bots often do.
  website: z.string().max(0).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = schema.parse(await req.json());
    if (body.website) {
      // Silently accept but drop honeypot-triggered submissions.
      return NextResponse.json({ ok: true });
    }
    if (!body.email && !body.phone) {
      throw new ApiError(400, "Provide an email or phone number");
    }

    const org = await prisma.organization.findUnique({ where: { slug: body.orgSlug } });
    if (!org) throw new ApiError(404, "Unknown organization");

    const lead = await prisma.lead.create({
      data: {
        organizationId: org.id,
        fullName: body.fullName,
        email: body.email,
        phone: body.phone,
        interestedCountry: body.interestedCountry,
        targetScore: body.targetScore,
        source: body.source ?? "WEBSITE",
        stage: "NEW",
        lastActivityAt: new Date(),
      },
    });

    return NextResponse.json({ ok: true, leadId: lead.id }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
