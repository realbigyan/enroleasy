import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession, handleApiError, ApiError } from "@/lib/api-guard";
import { getNepaliFiscalYear } from "@/lib/accounting/fiscal-year";
import { logAudit } from "@/lib/audit";

const ACCOUNTING_ROLES = ["OWNER", "ADMIN"] as const;

const lineSchema = z.object({
  accountId: z.string().min(1),
  debit: z.number().min(0).default(0),
  credit: z.number().min(0).default(0),
  memo: z.string().optional().nullable(),
});

const createSchema = z.object({
  date: z.string(), // ISO date
  reference: z.string().optional().nullable(),
  description: z.string().min(1),
  lines: z.array(lineSchema).min(2),
});

export async function GET(req: NextRequest) {
  try {
    const session = await requireSession([...ACCOUNTING_ROLES]);
    const fiscalYear = req.nextUrl.searchParams.get("fiscalYear");
    const accountId = req.nextUrl.searchParams.get("accountId");

    const entries = await prisma.journalEntry.findMany({
      where: {
        organizationId: session.organizationId,
        ...(fiscalYear ? { fiscalYear } : {}),
        ...(accountId ? { lines: { some: { accountId } } } : {}),
      },
      include: { lines: { include: { account: true } } },
      orderBy: { date: "desc" },
    });
    return NextResponse.json({ entries });
  } catch (err) {
    return handleApiError(err);
  }
}

// Records a manual double-entry journal entry. Debit and credit totals must
// balance exactly — this is the one invariant that makes it "double-entry"
// bookkeeping rather than just a transaction log.
export async function POST(req: NextRequest) {
  try {
    const session = await requireSession([...ACCOUNTING_ROLES]);
    const body = createSchema.parse(await req.json());

    for (const line of body.lines) {
      if (line.debit > 0 && line.credit > 0) {
        throw new ApiError(400, "A single journal line cannot have both a debit and a credit — use two lines");
      }
      if (line.debit === 0 && line.credit === 0) {
        throw new ApiError(400, "Every journal line needs a non-zero debit or credit");
      }
    }
    const totalDebit = body.lines.reduce((sum, l) => sum + l.debit, 0);
    const totalCredit = body.lines.reduce((sum, l) => sum + l.credit, 0);
    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      throw new ApiError(400, `Entry does not balance: debits ${totalDebit.toFixed(2)} vs credits ${totalCredit.toFixed(2)}`);
    }

    const accountIds = body.lines.map((l) => l.accountId);
    const accounts = await prisma.account.findMany({ where: { id: { in: accountIds } } });
    for (const account of accounts) {
      if (account.organizationId !== session.organizationId) {
        throw new ApiError(404, "One or more accounts not found");
      }
    }
    if (accounts.length !== new Set(accountIds).size) {
      throw new ApiError(404, "One or more accounts not found");
    }

    const date = new Date(body.date);
    const entry = await prisma.journalEntry.create({
      data: {
        organizationId: session.organizationId,
        date,
        fiscalYear: getNepaliFiscalYear(date),
        reference: body.reference,
        description: body.description,
        sourceType: "MANUAL",
        createdById: session.userId,
        lines: { create: body.lines.map((l) => ({ accountId: l.accountId, debit: l.debit, credit: l.credit, memo: l.memo })) },
      },
      include: { lines: { include: { account: true } } },
    });
    await logAudit({
      organizationId: session.organizationId,
      actorId: session.userId,
      action: "create",
      entityType: "JournalEntry",
      entityId: entry.id,
      after: entry,
    });
    return NextResponse.json({ entry }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
