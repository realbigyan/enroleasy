import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession, handleApiError, ApiError } from "@/lib/api-guard";
import { logAudit } from "@/lib/audit";

const updateSchema = z.object({
  name: z.string().min(2).optional(),
  isActive: z.boolean().optional(),
  contactEmail: z.string().email().optional().nullable(),
  contactPhone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  taxIdType: z.enum(["PAN", "VAT"]).optional().nullable(),
  panNumber: z.string().optional().nullable(),
  commissionPct: z.number().optional().nullable(),
});

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await requireSession();
    const partner = await prisma.partner.findUnique({
      where: { id },
      include: { referredLeads: true, referredStudents: true, invoices: true },
    });
    if (!partner || partner.organizationId !== session.organizationId) throw new ApiError(404, "Partner not found");
    return NextResponse.json({ partner });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await requireSession(["OWNER", "ADMIN"]);
    const existing = await prisma.partner.findUnique({ where: { id } });
    if (!existing || existing.organizationId !== session.organizationId) throw new ApiError(404, "Partner not found");
    const body = updateSchema.parse(await req.json());
    const partner = await prisma.partner.update({ where: { id }, data: body });
    await logAudit({
      organizationId: session.organizationId,
      actorId: session.userId,
      action: "update",
      entityType: "Partner",
      entityId: id,
      before: existing,
      after: partner,
    });
    return NextResponse.json({ partner });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await requireSession(["OWNER", "ADMIN"]);
    const existing = await prisma.partner.findUnique({ where: { id } });
    if (!existing || existing.organizationId !== session.organizationId) throw new ApiError(404, "Partner not found");
    await prisma.partner.delete({ where: { id } });
    await logAudit({
      organizationId: session.organizationId,
      actorId: session.userId,
      action: "delete",
      entityType: "Partner",
      entityId: id,
      before: existing,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
