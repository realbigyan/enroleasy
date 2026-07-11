import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession, handleApiError, ApiError } from "@/lib/api-guard";
import { getNepaliFiscalYear } from "@/lib/accounting/fiscal-year";
import { logAudit } from "@/lib/audit";

const ACCOUNTING_ROLES = ["OWNER", "ADMIN"] as const;

const createSchema = z.object({
  accountId: z.string().min(1),
  paymentAccountId: z.string().min(1),
  name: z.string().min(1),
  purchaseDate: z.string(),
  cost: z.number().positive(),
  usefulLifeYears: z.number().int().positive(),
  salvageValue: z.number().min(0).default(0),
  method: z.enum(["STRAIGHT_LINE", "DIMINISHING_BALANCE"]).default("STRAIGHT_LINE"),
});

export async function GET() {
  try {
    const session = await requireSession([...ACCOUNTING_ROLES]);
    const assets = await prisma.fixedAsset.findMany({
      where: { organizationId: session.organizationId },
      include: { account: true, depreciationEntries: { orderBy: { fiscalYear: "asc" } } },
      orderBy: { purchaseDate: "desc" },
    });
    const withBookValue = assets.map((a: (typeof assets)[number]) => {
      const accumulated = a.depreciationEntries.reduce((sum: number, d: { amount: number }) => sum + d.amount, 0);
      return { ...a, accumulatedDepreciation: accumulated, bookValue: a.cost - accumulated };
    });
    return NextResponse.json({ fixedAssets: withBookValue });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession([...ACCOUNTING_ROLES]);
    const body = createSchema.parse(await req.json());

    const [account, paymentAccount] = await Promise.all([
      prisma.account.findUnique({ where: { id: body.accountId } }),
      prisma.account.findUnique({ where: { id: body.paymentAccountId } }),
    ]);
    if (!account || account.organizationId !== session.organizationId) throw new ApiError(404, "Fixed asset account not found");
    if (!paymentAccount || paymentAccount.organizationId !== session.organizationId) throw new ApiError(404, "Payment account not found");
    if (body.salvageValue >= body.cost) throw new ApiError(400, "Salvage value must be less than cost");

    const purchaseDate = new Date(body.purchaseDate);
    const fixedAsset = await prisma.fixedAsset.create({
      data: {
        organizationId: session.organizationId,
        accountId: body.accountId,
        paymentAccountId: body.paymentAccountId,
        name: body.name,
        purchaseDate,
        cost: body.cost,
        usefulLifeYears: body.usefulLifeYears,
        salvageValue: body.salvageValue,
        method: body.method,
      },
      include: { account: true },
    });

    await prisma.journalEntry.create({
      data: {
        organizationId: session.organizationId,
        date: purchaseDate,
        fiscalYear: getNepaliFiscalYear(purchaseDate),
        description: `Fixed asset purchase: ${body.name}`,
        sourceType: "FIXED_ASSET",
        sourceId: fixedAsset.id,
        createdById: session.userId,
        lines: {
          create: [
            { accountId: body.accountId, debit: body.cost, credit: 0, memo: "Asset purchase" },
            { accountId: body.paymentAccountId, debit: 0, credit: body.cost, memo: "Asset purchase" },
          ],
        },
      },
    });

    await logAudit({
      organizationId: session.organizationId,
      actorId: session.userId,
      action: "create",
      entityType: "FixedAsset",
      entityId: fixedAsset.id,
      after: fixedAsset,
    });

    return NextResponse.json({ fixedAsset }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
