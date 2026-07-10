import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, handleApiError } from "@/lib/api-guard";
import { getCurrentNepaliFiscalYear } from "@/lib/accounting/fiscal-year";
import { getSystemAccountByCode } from "@/lib/accounting/system-accounts";

const ACCOUNTING_ROLES = ["OWNER", "ADMIN"] as const;

const SOURCE_LABELS: Record<string, string> = {
  EXPENSE: "Vendor / service TDS (secs. 87-92)",
  PAYROLL: "Salary TDS",
};

// TDS withheld this fiscal year, broken down by source — vendor/service
// payments vs. staff salaries — since IRD requires separate withholding
// returns for each. Pulled from credits to the TDS Payable account (2030),
// which both the expense and payroll modules post to automatically.
export async function GET(req: NextRequest) {
  try {
    const session = await requireSession([...ACCOUNTING_ROLES]);
    const fiscalYear = req.nextUrl.searchParams.get("fiscalYear") ?? getCurrentNepaliFiscalYear();

    const tdsPayable = await getSystemAccountByCode(session.organizationId, "2030", "TDS Payable");
    const lines = await prisma.journalLine.findMany({
      where: { accountId: tdsPayable.id, journalEntry: { fiscalYear } },
      include: { journalEntry: { select: { sourceType: true, sourceId: true, date: true, description: true } } },
    });

    type Bucket = { sourceType: string; label: string; total: number; count: number };
    const buckets = new Map<string, Bucket>();
    let total = 0;
    for (const line of lines) {
      const net = line.credit - line.debit; // credits increase TDS Payable, debits (e.g. reversal) decrease it
      total += net;
      const key = line.journalEntry.sourceType;
      const existing = buckets.get(key) ?? { sourceType: key, label: SOURCE_LABELS[key] ?? key, total: 0, count: 0 };
      existing.total += net;
      existing.count += 1;
      buckets.set(key, existing);
    }

    return NextResponse.json({ fiscalYear, total, byCategory: Array.from(buckets.values()) });
  } catch (err) {
    return handleApiError(err);
  }
}
