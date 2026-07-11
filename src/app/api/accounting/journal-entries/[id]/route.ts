import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, handleApiError, ApiError } from "@/lib/api-guard";
import { logAudit } from "@/lib/audit";

const ACCOUNTING_ROLES = ["OWNER", "ADMIN"] as const;

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await requireSession([...ACCOUNTING_ROLES]);
    const entry = await prisma.journalEntry.findUnique({
      where: { id },
      include: { lines: { include: { account: true } } },
    });
    if (!entry || entry.organizationId !== session.organizationId) throw new ApiError(404, "Journal entry not found");
    return NextResponse.json({ entry });
  } catch (err) {
    return handleApiError(err);
  }
}

// Only MANUAL entries can be deleted directly. Entries auto-posted from an
// Invoice/Expense/Payslip/etc. carry the audit trail for that record — they
// should be reversed by editing/voiding the source, not deleted here, so
// the books and the source record never disagree silently.
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await requireSession([...ACCOUNTING_ROLES]);
    const entry = await prisma.journalEntry.findUnique({ where: { id } });
    if (!entry || entry.organizationId !== session.organizationId) throw new ApiError(404, "Journal entry not found");
    if (entry.sourceType !== "MANUAL") {
      throw new ApiError(400, "This entry was auto-posted and can't be deleted directly — reverse it from its source record instead");
    }
    await prisma.journalEntry.delete({ where: { id } });
    await logAudit({
      organizationId: session.organizationId,
      actorId: session.userId,
      action: "delete",
      entityType: "JournalEntry",
      entityId: id,
      before: entry,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
