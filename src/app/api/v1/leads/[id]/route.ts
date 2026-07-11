import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiKey, ApiKeyError, handleApiKeyError } from "@/lib/api-keys";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { logAudit } from "@/lib/audit";

const updateSchema = z.object({
  fullName: z.string().min(2).optional(),
  email: z.string().email().optional().nullable(),
  phone: z.string().optional().nullable(),
  stage: z
    .enum([
      "NEW", "CONTACTED", "TRIAL_BOOKED", "TRIAL_DONE", "QUALIFIED", "COUNSELING",
      "APPLICATION_STARTED", "OFFER_RECEIVED", "VISA_STAGE", "ENROLLED", "LOST",
    ])
    .optional(),
  interestedCountry: z.string().optional().nullable(),
  targetIntake: z.string().optional().nullable(),
});

async function assertOwned(organizationId: string, id: string) {
  const lead = await prisma.lead.findUnique({ where: { id } });
  if (!lead || lead.organizationId !== organizationId) throw new ApiKeyError(404, "Lead not found");
  return lead;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const key = await requireApiKey(req);
    const { allowed, retryAfterSeconds } = await checkRateLimit(`v1:${key.apiKeyId}`, 120, 60);
    if (!allowed) return rateLimitResponse(retryAfterSeconds);

    const { id } = await params;
    const lead = await assertOwned(key.organizationId, id);
    return NextResponse.json({ lead });
  } catch (err) {
    return handleApiKeyError(err);
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const key = await requireApiKey(req, { requireWrite: true });
    const { allowed, retryAfterSeconds } = await checkRateLimit(`v1:${key.apiKeyId}`, 120, 60);
    if (!allowed) return rateLimitResponse(retryAfterSeconds);

    const { id } = await params;
    const before = await assertOwned(key.organizationId, id);
    const body = updateSchema.parse(await req.json());
    const lead = await prisma.lead.update({ where: { id }, data: body });

    await logAudit({
      organizationId: key.organizationId,
      actorId: null,
      action: "update",
      entityType: "Lead",
      entityId: id,
      before,
      after: lead,
    });

    return NextResponse.json({ lead });
  } catch (err) {
    return handleApiKeyError(err);
  }
}
