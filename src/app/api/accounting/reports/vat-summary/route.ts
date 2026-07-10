import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, handleApiError } from "@/lib/api-guard";
import { getCurrentNepaliFiscalYear } from "@/lib/accounting/fiscal-year";
import { getAccountBalancesForFiscalYear } from "@/lib/accounting/reports";

const ACCOUNTING_ROLES = ["OWNER", "ADMIN"] as const;

// Input VAT = VAT paid on purchases/expenses (account 1040, claimable
// against output VAT). Output VAT = VAT charged on sales (account 2020) —
// currently only populated once invoices are wired to auto-post journal
// entries; until then this will show as zero, which is expected, not a bug.
// Net VAT payable to IRD = output - input (negative means a carry-forward
// credit rather than a payment due).
export async function GET(req: NextRequest) {
  try {
    const session = await requireSession([...ACCOUNTING_ROLES]);
    const fiscalYear = req.nextUrl.searchParams.get("fiscalYear") ?? getCurrentNepaliFiscalYear();

    const rows = await getAccountBalancesForFiscalYear(session.organizationId, fiscalYear);
    const inputVatRow = rows.find((r) => r.code === "1040");
    const outputVatRow = rows.find((r) => r.code === "2020");
    const inputVat = inputVatRow?.debit ?? 0;
    const outputVat = outputVatRow?.credit ?? 0;
    const netVatPayable = outputVat - inputVat;

    const expenses = await prisma.expense.findMany({
      where: { organizationId: session.organizationId, fiscalYear, vatAmount: { gt: 0 } },
      include: { vendor: true },
      orderBy: { date: "asc" },
    });

    return NextResponse.json({
      fiscalYear,
      inputVat,
      outputVat,
      netVatPayable,
      inputVatDetail: expenses.map((e: (typeof expenses)[number]) => ({
        id: e.id,
        date: e.date,
        description: e.description,
        vendor: e.vendor?.name ?? null,
        amount: e.amount,
        vatAmount: e.vatAmount,
      })),
    });
  } catch (err) {
    return handleApiError(err);
  }
}
