import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiKey, handleApiKeyError } from "@/lib/api-keys";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { logAudit } from "@/lib/audit";
import type { LeadStage } from "@prisma/client";

// Public developer API — GET/POST /api/v1/leads. Authenticated with an API
// key (Authorization: Bearer ee_live_...) instead of the session cookie used
// by the internal /api/leads. Mirrors that route's shape so the same client
// code largely works against either.
const createSchema = z.object({
  fullName: z.string().min(2),
  email: z.string().email().optional().nullable(),
  phone: z.string().optional().nullable(),
  source: z.enum(["WEBSITE", "REFERRAL", "WALK_IN", "SOCIAL_MEDIA", "EVENT", "PARTNER_AGENT", "OTHER"]).optional(),
  interestedCountry: z.string().optional().nullable(),
  targetIntake: z.string().optional().nullable(),
});

export async function GET(req: NextRequest) {
  try {
    const key = await requireApiKey(req);
    const { allowed, retryAfterSeconds } = await checkRateLimit(`v1:${key.apiKeyId}`, 120, 60);
    if (!allowed) return rateLimitResponse(retryAfterSeconds);

    const stage = req.nextUrl.searchParams.get("stage");
    const leads = await prisma.lead.findMany({
      where: {
        organizationId: key.organizationId,
        ...(stage ? { stage: stage as LeadStage } : {}),
      },
      orderBy: { updatedAt: "desc" },
      take: 100,
    });
    return NextResponse.json({ leads });
  } catch (err) {
    return handleApiKeyError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const key = await requireApiKey(req, { requireWrite: true });
    const { allowed, retryAfterSeconds } = await checkRateLimit(`v1:${key.apiKeyId}`, 120, 60);
    if (!allowed) return rateLimitResponse(retryAfterSeconds);

    const body = createSchema.parse(await req.json());
    const lead = await prisma.lead.create({
      data: { ...body, organizationId: key.organizationId },
    });

    await logAudit({
      organizationId: key.organizationId,
      actorId: null,
      action: "create",
      entityType: "Lead",
      entityId: lead.id,
      after: lead,
    });

    return NextResponse.json({ lead }, { status: 201 });
  } catch (err) {
    return handleApiKeyError(err);
  }
}
