import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession, handleApiError, ApiError } from "@/lib/api-guard";
import { logAudit } from "@/lib/audit";

const updateSchema = z.object({
  fullName: z.string().min(2).optional(),
  email: z.string().email().optional().nullable(),
  phone: z.string().optional().nullable(),
  stage: z
    .enum([
      "NEW", "CONTACTED", "QUALIFIED", "COUNSELING",
      "APPLICATION_STARTED", "OFFER_RECEIVED", "VISA_STAGE", "ENROLLED", "LOST",
    ])
    .optional(),
  interestedCountry: z.string().optional().nullable(),
  targetIntake: z.string().optional().nullable(),
  assignedCounselorId: z.string().optional().nullable(),
});

async function assertOwned(organizationId: string, id: string) {
  const lead = await prisma.lead.findUnique({ where: { id } });
  if (!lead || lead.organizationId !== organizationId) throw new ApiError(404, "Lead not found");
  return lead;
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await requireSession();
    const lead = await assertOwned(session.organizationId, id);
    const full = await prisma.lead.findUnique({
      where: { id: lead.id },
      include: { assignedCounselor: true, notes: { orderBy: { createdAt: "desc" } }, tasks: true },
    });
    return NextResponse.json({ lead: full });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await requireSession(["OWNER", "ADMIN", "COUNSELOR"]);
    const before = await assertOwned(session.organizationId, id);
    const body = updateSchema.parse(await req.json());
    const lead = await prisma.lead.update({ where: { id }, data: body });
    await logAudit({
      organizationId: session.organizationId,
      actorId: session.userId,
      action: "update",
      entityType: "Lead",
      entityId: id,
      before,
      after: lead,
    });
    return NextResponse.json({ lead });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await requireSession(["OWNER", "ADMIN"]);
    const before = await assertOwned(session.organizationId, id);
    await prisma.lead.delete({ where: { id } });
    await logAudit({
      organizationId: session.organizationId,
      actorId: session.userId,
      action: "delete",
      entityType: "Lead",
      entityId: id,
      before,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
