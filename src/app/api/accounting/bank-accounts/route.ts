import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession, handleApiError } from "@/lib/api-guard";
import { getSystemAccountByCode } from "@/lib/accounting/system-accounts";
import { getCurrentNepaliFiscalYear } from "@/lib/accounting/fiscal-year";

const ACCOUNTING_ROLES = ["OWNER", "ADMIN"] as const;

const createSchema = z.object({
  name: z.string().min(1),
  kind: z.enum(["BANK", "CASH"]).default("BANK"),
  accountNumber: z.string().optional().nullable(),
  bankName: z.string().optional().nullable(),
  currency: z.string().default("NPR"),
  openingBalance: z.number().default(0),
});

export async function GET() {
  try {
    const session = await requireSession([...ACCOUNTING_ROLES]);
    const bankAccounts = await prisma.bankAccount.findMany({
      where: { organizationId: session.organizationId },
      include: { account: true },
      orderBy: { name: "asc" },
    });
    // Balance = opening balance + net of all posted journal lines on the linked account.
    const withBalances = await Promise.all(
      bankAccounts.map(async (ba: (typeof bankAccounts)[number]) => {
        const sum = await prisma.journalLine.aggregate({
          where: { accountId: ba.accountId },
          _sum: { debit: true, credit: true },
        });
        const net = (sum._sum.debit ?? 0) - (sum._sum.credit ?? 0);
        return { ...ba, balance: ba.openingBalance + net };
      })
    );
    return NextResponse.json({ bankAccounts: withBalances });
  } catch (err) {
    return handleApiError(err);
  }
}

// Creates a bank/cash account and its backing GL account (a child of "1010
// Cash in Hand" or "1020 Bank Accounts" depending on kind), then posts an
// opening-balance journal entry against Owner's Capital if openingBalance != 0.
export async function POST(req: NextRequest) {
  try {
    const session = await requireSession([...ACCOUNTING_ROLES]);
    const body = createSchema.parse(await req.json());

    const parentCode = body.kind === "CASH" ? "1010" : "1020";
    const parentName = body.kind === "CASH" ? "Cash in Hand" : "Bank Accounts";
    const parent = await getSystemAccountByCode(session.organizationId, parentCode, parentName);

    // Generate a unique sub-account code under the parent, e.g. 1020-1, 1020-2.
    const siblingCount = await prisma.account.count({ where: { parentId: parent.id } });
    const code = `${parentCode}-${siblingCount + 1}`;

    const account = await prisma.account.create({
      data: {
        organizationId: session.organizationId,
        code,
        name: body.name,
        type: "ASSET",
        parentId: parent.id,
        description: `Bank/cash account: ${body.name}`,
      },
    });

    const bankAccount = await prisma.bankAccount.create({
      data: {
        organizationId: session.organizationId,
        accountId: account.id,
        name: body.name,
        kind: body.kind,
        accountNumber: body.accountNumber ?? null,
        bankName: body.bankName ?? null,
        currency: body.currency,
        openingBalance: body.openingBalance,
      },
      include: { account: true },
    });

    if (body.openingBalance !== 0) {
      const ownersCapital = await getSystemAccountByCode(session.organizationId, "3010", "Owner's Capital");
      const date = new Date();
      await prisma.journalEntry.create({
        data: {
          organizationId: session.organizationId,
          date,
          fiscalYear: getCurrentNepaliFiscalYear(),
          description: `Opening balance: ${body.name}`,
          sourceType: "OPENING_BALANCE",
          sourceId: bankAccount.id,
          createdById: session.userId,
          lines: {
            create:
              body.openingBalance > 0
                ? [
                    { accountId: account.id, debit: body.openingBalance, credit: 0, memo: "Opening balance" },
                    { accountId: ownersCapital.id, debit: 0, credit: body.openingBalance, memo: "Opening balance" },
                  ]
                : [
                    { accountId: ownersCapital.id, debit: -body.openingBalance, credit: 0, memo: "Opening balance" },
                    { accountId: account.id, debit: 0, credit: -body.openingBalance, memo: "Opening balance" },
                  ],
          },
        },
      });
    }

    return NextResponse.json({ bankAccount }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
