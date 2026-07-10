import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession, handleApiError, ApiError } from "@/lib/api-guard";

const ACCOUNTING_ROLES = ["OWNER", "ADMIN"] as const;

const updateSchema = z.object({
  reconciled: z.boolean(),
});

async function assertOwned(organizationId: string, id: string) {
  const tx = await prisma.bankTransaction.findUnique({ where: { id }, include: { bankAccount: true } });
  if (!tx || tx.bankAccount.organizationId !== organizationId) throw new ApiError(404, "Transaction not found");
  return tx;
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await requireSession([...ACCOUNTING_ROLES]);
    await assertOwned(session.organizationId, id);
    const body = updateSchema.parse(await req.json());
    const transaction = await prisma.bankTransaction.update({ where: { id }, data: { reconciled: body.reconciled } });
    return NextResponse.json({ transaction });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await requireSession([...ACCOUNTING_ROLES]);
    await assertOwned(session.organizationId, id);
    await prisma.journalEntry.deleteMany({ where: { sourceType: "BANK", sourceId: id } });
    await prisma.bankTransaction.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
