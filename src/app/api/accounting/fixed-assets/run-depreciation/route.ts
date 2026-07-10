import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession, handleApiError } from "@/lib/api-guard";
import { getCurrentNepaliFiscalYear, getFiscalYearBounds } from "@/lib/accounting/fiscal-year";
import { computeDepreciationForYear } from "@/lib/accounting/depreciation";
import { getSystemAccountByCode } from "@/lib/accounting/system-accounts";

const ACCOUNTING_ROLES = ["OWNER", "ADMIN"] as const;

const runSchema = z.object({
  fiscalYear: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession([...ACCOUNTING_ROLES]);
    const body = runSchema.parse(await req.json().catch(() => ({})));
    const fiscalYear = body.fiscalYear ?? getCurrentNepaliFiscalYear();
    const { end } = getFiscalYearBounds(fiscalYear);

    const assets = await prisma.fixedAsset.findMany({
      where: { organizationId: session.organizationId, isActive: true },
      include: { depreciationEntries: true },
    });

    const depreciationExpense = await getSystemAccountByCode(session.organizationId, "5080", "Depreciation Expense");
    const accumulatedDepreciation = await getSystemAccountByCode(session.organizationId, "1140", "Accumulated Depreciation");

    const results: { assetId: string; name: string; amount: number; skipped?: string }[] = [];

    for (const asset of assets) {
      if (asset.depreciationEntries.some((d: { fiscalYear: string }) => d.fiscalYear === fiscalYear)) {
        results.push({ assetId: asset.id, name: asset.name, amount: 0, skipped: "already run for this fiscal year" });
        continue;
      }
      const priorAccumulated = asset.depreciationEntries.reduce((sum: number, d: { amount: number }) => sum + d.amount, 0);
      const amount = computeDepreciationForYear(asset.method, asset.cost, asset.salvageValue, asset.usefulLifeYears, priorAccumulated);
      if (amount <= 0) {
        results.push({ assetId: asset.id, name: asset.name, amount: 0, skipped: "fully depreciated" });
        continue;
      }

      const entry = await prisma.depreciationEntry.create({
        data: { fixedAssetId: asset.id, fiscalYear, amount },
      });
      await prisma.journalEntry.create({
        data: {
          organizationId: session.organizationId,
          date: end,
          fiscalYear,
          description: `Depreciation: ${asset.name} (${fiscalYear})`,
          sourceType: "DEPRECIATION",
          sourceId: entry.id,
          createdById: session.userId,
          lines: {
            create: [
              { accountId: depreciationExpense.id, debit: amount, credit: 0, memo: asset.name },
              { accountId: accumulatedDepreciation.id, debit: 0, credit: amount, memo: asset.name },
            ],
          },
        },
      });
      results.push({ assetId: asset.id, name: asset.name, amount });
    }

    return NextResponse.json({ fiscalYear, results });
  } catch (err) {
    return handleApiError(err);
  }
}
