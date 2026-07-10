import { NextRequest, NextResponse } from "next/server";
import { requireSession, handleApiError, ApiError } from "@/lib/api-guard";
import { getCurrentNepaliFiscalYear, getFiscalYearBounds } from "@/lib/accounting/fiscal-year";
import { getAccountBalancesAsOf } from "@/lib/accounting/reports";

const ACCOUNTING_ROLES = ["OWNER", "ADMIN"] as const;

// Balance sheet is a cumulative snapshot as of the fiscal-year end (or
// today, for the current/ongoing fiscal year) — not a one-year period like
// the P&L. Since the books never mechanically "close" income and expense
// accounts into retained earnings, their cumulative net (all income minus
// all expense, to date) is folded into Equity here as "Retained Earnings
// (Cumulative)" so Assets always ties out to Liabilities + Equity.
export async function GET(req: NextRequest) {
  try {
    const session = await requireSession([...ACCOUNTING_ROLES]);
    const fiscalYear = req.nextUrl.searchParams.get("fiscalYear") ?? getCurrentNepaliFiscalYear();
    const { end } = getFiscalYearBounds(fiscalYear);
    if (Number.isNaN(end.getTime())) throw new ApiError(400, "Invalid fiscal year");
    const asOfDate = new Date(Math.min(Date.now(), end.getTime() - 1));

    const rows = await getAccountBalancesAsOf(session.organizationId, asOfDate);
    const assets = rows.filter((r) => r.type === "ASSET" && (r.debit !== 0 || r.credit !== 0));
    const liabilities = rows.filter((r) => r.type === "LIABILITY" && (r.debit !== 0 || r.credit !== 0));
    const equity = rows.filter((r) => r.type === "EQUITY" && (r.debit !== 0 || r.credit !== 0));
    const income = rows.filter((r) => r.type === "INCOME");
    const expense = rows.filter((r) => r.type === "EXPENSE");

    const totalAssets = assets.reduce((sum: number, r) => sum + r.balance, 0);
    const totalLiabilities = liabilities.reduce((sum: number, r) => sum + r.balance, 0);
    const totalIncomeCumulative = income.reduce((sum: number, r) => sum + r.balance, 0);
    const totalExpenseCumulative = expense.reduce((sum: number, r) => sum + r.balance, 0);
    const retainedEarningsCumulative = totalIncomeCumulative - totalExpenseCumulative;
    const totalEquity = equity.reduce((sum: number, r) => sum + r.balance, 0) + retainedEarningsCumulative;

    return NextResponse.json({
      fiscalYear,
      asOfDate,
      assets,
      liabilities,
      equity,
      retainedEarningsCumulative,
      totalAssets,
      totalLiabilities,
      totalEquity,
      balanced: Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 0.01,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
