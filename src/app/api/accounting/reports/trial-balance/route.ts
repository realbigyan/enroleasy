import { NextRequest, NextResponse } from "next/server";
import { requireSession, handleApiError, ApiError } from "@/lib/api-guard";
import { getCurrentNepaliFiscalYear, getFiscalYearBounds } from "@/lib/accounting/fiscal-year";
import { getAccountBalancesAsOf } from "@/lib/accounting/reports";

const ACCOUNTING_ROLES = ["OWNER", "ADMIN"] as const;

export async function GET(req: NextRequest) {
  try {
    const session = await requireSession([...ACCOUNTING_ROLES]);
    const fiscalYear = req.nextUrl.searchParams.get("fiscalYear") ?? getCurrentNepaliFiscalYear();
    const { end } = getFiscalYearBounds(fiscalYear);
    if (Number.isNaN(end.getTime())) throw new ApiError(400, "Invalid fiscal year");
    const asOfDate = new Date(Math.min(Date.now(), end.getTime() - 1));

    const rows = await getAccountBalancesAsOf(session.organizationId, asOfDate);
    const totalDebit = rows.reduce((sum: number, r) => sum + r.debit, 0);
    const totalCredit = rows.reduce((sum: number, r) => sum + r.credit, 0);

    return NextResponse.json({ fiscalYear, asOfDate, rows, totalDebit, totalCredit });
  } catch (err) {
    return handleApiError(err);
  }
}
