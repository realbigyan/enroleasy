import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession, handleApiError } from "@/lib/api-guard";
import { seedChartOfAccounts } from "@/lib/accounting/chart-of-accounts";

const ACCOUNTING_ROLES = ["OWNER", "ADMIN"] as const;

const createSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  type: z.enum(["ASSET", "LIABILITY", "EQUITY", "INCOME", "EXPENSE"]),
  parentId: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
});

// Auto-seeds the default Nepal-oriented chart of accounts the first time an
// org has zero accounts, so the ledger is usable immediately without a
// separate onboarding step.
// Debit-normal account types (ASSET, EXPENSE) show balance = debit - credit;
// credit-normal types (LIABILITY, EQUITY, INCOME) show balance = credit - debit.
const DEBIT_NORMAL_TYPES = new Set(["ASSET", "EXPENSE"]);

export async function GET() {
  try {
    const session = await requireSession([...ACCOUNTING_ROLES]);
    const count = await prisma.account.count({ where: { organizationId: session.organizationId } });
    if (count === 0) {
      await seedChartOfAccounts(session.organizationId);
    }
    const accounts = await prisma.account.findMany({
      where: { organizationId: session.organizationId },
      orderBy: { code: "asc" },
    });
    const sums = await prisma.journalLine.groupBy({
      by: ["accountId"],
      where: { account: { organizationId: session.organizationId } },
      _sum: { debit: true, credit: true },
    });
    type SumRow = { debit: number | null; credit: number | null };
    const sumByAccount = new Map<string, SumRow>(
      sums.map((s: { accountId: string; _sum: SumRow }) => [s.accountId, s._sum])
    );
    const accountsWithBalance = accounts.map((a: { id: string; type: string }) => {
      const sum = sumByAccount.get(a.id);
      const debit = sum?.debit ?? 0;
      const credit = sum?.credit ?? 0;
      const balance = DEBIT_NORMAL_TYPES.has(a.type) ? debit - credit : credit - debit;
      return { ...a, balance };
    });
    return NextResponse.json({ accounts: accountsWithBalance });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession([...ACCOUNTING_ROLES]);
    const body = createSchema.parse(await req.json());
    const account = await prisma.account.create({
      data: {
        organizationId: session.organizationId,
        code: body.code,
        name: body.name,
        type: body.type,
        parentId: body.parentId ?? null,
        description: body.description ?? null,
      },
    });
    return NextResponse.json({ account }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
