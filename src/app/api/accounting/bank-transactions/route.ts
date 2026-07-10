import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession, handleApiError, ApiError } from "@/lib/api-guard";
import { getNepaliFiscalYear } from "@/lib/accounting/fiscal-year";

const ACCOUNTING_ROLES = ["OWNER", "ADMIN"] as const;

const createSchema = z.object({
  bankAccountId: z.string().min(1),
  counterAccountId: z.string().min(1),
  date: z.string(),
  description: z.string().min(1),
  amount: z.number().refine((n) => n !== 0, "Amount cannot be zero"), // positive = deposit, negative = withdrawal
});

// Records a bank/cash movement not already captured via the Expense flow —
// e.g. a customer payment received directly, an owner's capital injection,
// loan proceeds, bank interest, or a bank fee — and posts the matching
// journal entry against the bank account's linked GL account.
export async function POST(req: NextRequest) {
  try {
    const session = await requireSession([...ACCOUNTING_ROLES]);
    const body = createSchema.parse(await req.json());

    const bankAccount = await prisma.bankAccount.findUnique({ where: { id: body.bankAccountId } });
    if (!bankAccount || bankAccount.organizationId !== session.organizationId) {
      throw new ApiError(404, "Bank account not found");
    }
    const counterAccount = await prisma.account.findUnique({ where: { id: body.counterAccountId } });
    if (!counterAccount || counterAccount.organizationId !== session.organizationId) {
      throw new ApiError(404, "Counter account not found");
    }

    const date = new Date(body.date);
    const fiscalYear = getNepaliFiscalYear(date);
    const magnitude = Math.abs(body.amount);

    const transaction = await prisma.bankTransaction.create({
      data: {
        bankAccountId: body.bankAccountId,
        counterAccountId: body.counterAccountId,
        date,
        description: body.description,
        amount: body.amount,
      },
      include: { counterAccount: true },
    });

    await prisma.journalEntry.create({
      data: {
        organizationId: session.organizationId,
        date,
        fiscalYear,
        description: `${bankAccount.name}: ${body.description}`,
        sourceType: "BANK",
        sourceId: transaction.id,
        createdById: session.userId,
        lines: {
          create:
            body.amount > 0
              ? [
                  { accountId: bankAccount.accountId, debit: magnitude, credit: 0, memo: "Deposit" },
                  { accountId: body.counterAccountId, debit: 0, credit: magnitude, memo: "Deposit" },
                ]
              : [
                  { accountId: body.counterAccountId, debit: magnitude, credit: 0, memo: "Withdrawal" },
                  { accountId: bankAccount.accountId, debit: 0, credit: magnitude, memo: "Withdrawal" },
                ],
        },
      },
    });

    return NextResponse.json({ transaction }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
