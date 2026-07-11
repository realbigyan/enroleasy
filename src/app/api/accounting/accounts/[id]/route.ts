import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession, handleApiError, ApiError } from "@/lib/api-guard";
import { logAudit } from "@/lib/audit";

const ACCOUNTING_ROLES = ["OWNER", "ADMIN"] as const;

const updateSchema = z.object({
  code: z.string().min(1).optional(),
  name: z.string().min(1).optional(),
  parentId: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
});

async function assertOwned(organizationId: string, id: string) {
  const account = await prisma.account.findUnique({ where: { id } });
  if (!account || account.organizationId !== organizationId) throw new ApiError(404, "Account not found");
  return account;
}

// Returns the account plus its full journal-line history (oldest first) so
// the UI can compute a running balance.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await requireSession([...ACCOUNTING_ROLES]);
    const account = await assertOwned(session.organizationId, id);
    const lines = await prisma.journalLine.findMany({
      where: { accountId: id },
      include: { journalEntry: true },
      orderBy: { journalEntry: { date: "asc" } },
    });
    return NextResponse.json({ account, lines });
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
    const account = await prisma.account.update({ where: { id }, data: body });
    await logAudit({
      organizationId: session.organizationId,
      actorId: session.userId,
      action: "update",
      entityType: "Account",
      entityId: id,
      before,
      after: account,
    });
    return NextResponse.json({ account });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await requireSession([...ACCOUNTING_ROLES]);
    const account = await assertOwned(session.organizationId, id);
    const lineCount = await prisma.journalLine.count({ where: { accountId: id } });
    if (lineCount > 0) {
      throw new ApiError(400, "Cannot delete an account that has journal entries — deactivate it instead");
    }
    const childCount = await prisma.account.count({ where: { parentId: id } });
    if (childCount > 0) {
      throw new ApiError(400, "Cannot delete an account that has sub-accounts — reassign or delete those first");
    }
    await prisma.account.delete({ where: { id } });
    await logAudit({
      organizationId: session.organizationId,
      actorId: session.userId,
      action: "delete",
      entityType: "Account",
      entityId: id,
      before: account,
    });
    return NextResponse.json({ ok: true, accountCode: account.code });
  } catch (err) {
    return handleApiError(err);
  }
}
