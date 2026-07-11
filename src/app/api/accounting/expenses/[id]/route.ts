import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, handleApiError, ApiError } from "@/lib/api-guard";
import { logAudit } from "@/lib/audit";

const ACCOUNTING_ROLES = ["OWNER", "ADMIN"] as const;

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await requireSession([...ACCOUNTING_ROLES]);
    const expense = await prisma.expense.findUnique({
      where: { id },
      include: { vendor: true, account: true, paymentAccount: true },
    });
    if (!expense || expense.organizationId !== session.organizationId) throw new ApiError(404, "Expense not found");
    return NextResponse.json({ expense });
  } catch (err) {
    return handleApiError(err);
  }
}

// Deleting an expense also removes the journal entry it auto-posted, so the
// ledger and the expense list never drift out of sync (unlike manual
// journal entries, which can't be deleted once they're linked to a source
// record — here the Expense *is* the source record, so it owns the entry).
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await requireSession([...ACCOUNTING_ROLES]);
    const expense = await prisma.expense.findUnique({ where: { id } });
    if (!expense || expense.organizationId !== session.organizationId) throw new ApiError(404, "Expense not found");

    await prisma.journalEntry.deleteMany({ where: { sourceType: "EXPENSE", sourceId: id } });
    await prisma.expense.delete({ where: { id } });
    await logAudit({
      organizationId: session.organizationId,
      actorId: session.userId,
      action: "delete",
      entityType: "Expense",
      entityId: id,
      before: expense,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
