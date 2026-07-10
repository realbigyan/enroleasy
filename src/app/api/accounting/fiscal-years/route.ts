import { NextResponse } from "next/server";
import { requireSession, handleApiError } from "@/lib/api-guard";
import { getCurrentNepaliFiscalYear, listKnownFiscalYears } from "@/lib/accounting/fiscal-year";

const ACCOUNTING_ROLES = ["OWNER", "ADMIN"] as const;

export async function GET() {
  try {
    await requireSession([...ACCOUNTING_ROLES]);
    const currentFiscalYear = getCurrentNepaliFiscalYear();
    const known = new Set(listKnownFiscalYears());
    known.add(currentFiscalYear);
    const fiscalYears = Array.from(known).sort();
    return NextResponse.json({ fiscalYears, currentFiscalYear });
  } catch (err) {
    return handleApiError(err);
  }
}
