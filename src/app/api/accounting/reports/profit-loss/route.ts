import { NextRequest, NextResponse } from "next/server";
import { requireSession, handleApiError } from "@/lib/api-guard";
import { getCurrentNepaliFiscalYear } from "@/lib/accounting/fiscal-year";
import { getAccountBalancesForFiscalYear } from "@/lib/accounting/reports";

const ACCOUNTING_ROLES = ["OWNER", "ADMIN"] as const;

export async function GET(req: NextRequest) {
  try {
    const session = await requireSession([...ACCOUNTING_ROLES]);
    const fiscalYear = req.nextUrl.searchParams.get("fiscalYear") ?? getCurrentNepaliFiscalYear();

    const rows = await getAccountBalancesForFiscalYear(session.organizationId, fiscalYear);
    const income = rows.filter((r) => r.type === "INCOME" && (r.debit !== 0 || r.credit !== 0));
    const expense = rows.filter((r) => r.type === "EXPENSE" && (r.debit !== 0 || r.credit !== 0));
    const totalIncome = income.reduce((sum: number, r) => sum + r.balance, 0);
    const totalExpense = expense.reduce((sum: number, r) => sum + r.balance, 0);
    const netProfit = totalIncome - totalExpense;

    return NextResponse.json({ fiscalYear, income, expense, totalIncome, totalExpense, netProfit });
  } catch (err) {
    return handleApiError(err);
  }
}
