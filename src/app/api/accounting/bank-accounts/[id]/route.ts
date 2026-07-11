import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession, handleApiError, ApiError } from "@/lib/api-guard";
import { logAudit } from "@/lib/audit";

const ACCOUNTING_ROLES = ["OWNER", "ADMIN"] as const;

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  accountNumber: z.string().optional().nullable(),
  bankName: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
});

async function assertOwned(organizationId: string, id: string) {
  const bankAccount = await prisma.bankAccount.findUnique({ where: { id } });
  if (!bankAccount || bankAccount.organizationId !== organizationId) throw new ApiError(404, "Bank account not found");
  return bankAccount;
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await requireSession([...ACCOUNTING_ROLES]);
    const bankAccount = await assertOwned(session.organizationId, id);
    const account = await prisma.account.findUnique({ where: { id: bankAccount.accountId } });
    const transactions = await prisma.bankTransaction.findMany({
      where: { bankAccountId: id },
      include: { counterAccount: true },
      orderBy: { date: "asc" },
    });
    return NextResponse.json({ bankAccount: { ...bankAccount, account }, transactions });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await requireSession([...ACCOUNTING_ROLES]);
    const before = await assertOwned(session.organizationId, id);
    const body = updateSchema.parse(await req.json());
    const bankAccount = await prisma.bankAccount.update({ where: { id }, data: body });
    await logAudit({
      organizationId: session.organizationId,
      actorId: session.userId,
      action: "update",
      entityType: "BankAccount",
      entityId: id,
      before,
      after: bankAccount,
    });
    return NextResponse.json({ bankAccount });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await requireSession([...ACCOUNTING_ROLES]);
    const before = await assertOwned(session.organizationId, id);
    const txCount = await prisma.bankTransaction.count({ where: { bankAccountId: id } });
    if (txCount > 0) {
      throw new ApiError(400, "Cannot delete a bank account with recorded transactions — deactivate it instead");
    }
    await prisma.bankAccount.delete({ where: { id } });
    await logAudit({
      organizationId: session.organizationId,
      actorId: session.userId,
      action: "delete",
      entityType: "BankAccount",
      entityId: id,
      before,
    });
    // The linked GL account carries no journal lines yet if there are no
    // transactions (an opening-balance entry, if any, is on the linked
    // account too — leave that account+entry in place for audit history
    // rather than deleting them, matching the "no hard deletes on posted
    // journal entries" rule used elsewhere in the ledger).
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
