import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession, handleApiError, ApiError } from "@/lib/api-guard";
import { logAudit } from "@/lib/audit";

const ACCOUNTING_ROLES = ["OWNER", "ADMIN"] as const;

const updateSchema = z.object({
  paid: z.boolean(),
});

async function assertOwned(id: string, organizationId: string) {
  const payslip = await prisma.payslip.findUnique({ where: { id } });
  if (!payslip || payslip.organizationId !== organizationId) throw new ApiError(404, "Payslip not found");
  return payslip;
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await requireSession([...ACCOUNTING_ROLES]);
    const payslip = await prisma.payslip.findUnique({ where: { id }, include: { employee: true, paymentAccount: true } });
    if (!payslip || payslip.organizationId !== session.organizationId) throw new ApiError(404, "Payslip not found");
    return NextResponse.json({ payslip });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await requireSession([...ACCOUNTING_ROLES]);
    const before = await assertOwned(id, session.organizationId);
    const body = updateSchema.parse(await req.json());
    const payslip = await prisma.payslip.update({ where: { id }, data: { paidAt: body.paid ? new Date() : null } });
    await logAudit({
      organizationId: session.organizationId,
      actorId: session.userId,
      action: "update",
      entityType: "Payslip",
      entityId: id,
      before,
      after: payslip,
    });
    return NextResponse.json({ payslip });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await requireSession([...ACCOUNTING_ROLES]);
    await assertOwned(id, session.organizationId);
    await prisma.journalEntry.deleteMany({ where: { sourceType: "PAYROLL", sourceId: id } });
    await prisma.payslip.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
