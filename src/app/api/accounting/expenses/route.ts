import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession, handleApiError, ApiError } from "@/lib/api-guard";
import { getNepaliFiscalYear } from "@/lib/accounting/fiscal-year";
import { suggestExpenseTdsRate } from "@/lib/accounting/tds-rates";
import { getSystemAccountByCode } from "@/lib/accounting/system-accounts";
import { logAudit } from "@/lib/audit";

const ACCOUNTING_ROLES = ["OWNER", "ADMIN"] as const;

const createSchema = z.object({
  vendorId: z.string().optional().nullable(),
  accountId: z.string().min(1), // expense category (debit)
  paymentAccountId: z.string().min(1), // cash/bank/AP (credit)
  date: z.string(),
  description: z.string().min(1),
  amount: z.number().positive(),
  vatAmount: z.number().min(0).default(0),
  hasVatInvoice: z.boolean().default(false),
  // If omitted, defaults to the standard Nepal TDS rate for the invoice type
  // (1.5% with a VAT invoice, 15% on a PAN-only bill).
  tdsRate: z.number().min(0).max(100).optional(),
  attachmentUrl: z.string().url().optional().nullable(),
});

export async function GET(req: NextRequest) {
  try {
    const session = await requireSession([...ACCOUNTING_ROLES]);
    const fiscalYear = req.nextUrl.searchParams.get("fiscalYear");
    const expenses = await prisma.expense.findMany({
      where: {
        organizationId: session.organizationId,
        ...(fiscalYear ? { fiscalYear } : {}),
      },
      include: { vendor: true, account: true, paymentAccount: true },
      orderBy: { date: "desc" },
    });
    return NextResponse.json({ expenses });
  } catch (err) {
    return handleApiError(err);
  }
}

// Records a business expense and auto-posts the corresponding double-entry
// journal entry:
//   Dr Expense account            amount
//   Dr VAT Receivable (if any)    vatAmount
//     Cr Payment account (cash/bank/AP)   amount + vatAmount - tdsAmount
//     Cr TDS Payable (if any)             tdsAmount
// TDS is withheld from the vendor per Income Tax Act 2058 secs. 87-92 and
// owed to IRD, not paid out — hence it reduces the payment account credit.
export async function POST(req: NextRequest) {
  try {
    const session = await requireSession([...ACCOUNTING_ROLES]);
    const body = createSchema.parse(await req.json());

    const [expenseAccount, paymentAccount] = await Promise.all([
      prisma.account.findUnique({ where: { id: body.accountId } }),
      prisma.account.findUnique({ where: { id: body.paymentAccountId } }),
    ]);
    if (!expenseAccount || expenseAccount.organizationId !== session.organizationId) {
      throw new ApiError(404, "Expense category account not found");
    }
    if (!paymentAccount || paymentAccount.organizationId !== session.organizationId) {
      throw new ApiError(404, "Payment account not found");
    }
    if (body.vendorId) {
      const vendor = await prisma.vendor.findUnique({ where: { id: body.vendorId } });
      if (!vendor || vendor.organizationId !== session.organizationId) {
        throw new ApiError(404, "Vendor not found");
      }
    }

    const tdsRate = body.tdsRate ?? suggestExpenseTdsRate(body.hasVatInvoice);
    const tdsAmount = Math.round(body.amount * (tdsRate / 100) * 100) / 100;
    const netPayment = body.amount + body.vatAmount - tdsAmount;
    if (netPayment < 0) {
      throw new ApiError(400, "TDS + VAT cannot exceed the expense amount");
    }

    const date = new Date(body.date);
    const fiscalYear = getNepaliFiscalYear(date);

    const expense = await prisma.expense.create({
      data: {
        organizationId: session.organizationId,
        vendorId: body.vendorId ?? null,
        accountId: body.accountId,
        paymentAccountId: body.paymentAccountId,
        date,
        fiscalYear,
        description: body.description,
        amount: body.amount,
        vatAmount: body.vatAmount,
        hasVatInvoice: body.hasVatInvoice,
        tdsRate,
        tdsAmount,
        attachmentUrl: body.attachmentUrl ?? null,
      },
      include: { vendor: true, account: true, paymentAccount: true },
    });

    const lines: { accountId: string; debit: number; credit: number; memo: string }[] = [
      { accountId: body.accountId, debit: body.amount, credit: 0, memo: "Expense" },
    ];
    if (body.vatAmount > 0) {
      const vatReceivable = await getSystemAccountByCode(session.organizationId, "1040", "VAT Receivable (Input VAT)");
      lines.push({ accountId: vatReceivable.id, debit: body.vatAmount, credit: 0, memo: "Input VAT" });
    }
    lines.push({ accountId: body.paymentAccountId, debit: 0, credit: netPayment, memo: "Net payment" });
    if (tdsAmount > 0) {
      const tdsPayable = await getSystemAccountByCode(session.organizationId, "2030", "TDS Payable");
      lines.push({ accountId: tdsPayable.id, debit: 0, credit: tdsAmount, memo: `TDS withheld @ ${tdsRate}%` });
    }

    await prisma.journalEntry.create({
      data: {
        organizationId: session.organizationId,
        date,
        fiscalYear,
        reference: expense.id,
        description: `Expense: ${body.description}`,
        sourceType: "EXPENSE",
        sourceId: expense.id,
        createdById: session.userId,
        lines: { create: lines },
      },
    });

    await logAudit({
      organizationId: session.organizationId,
      actorId: session.userId,
      action: "create",
      entityType: "Expense",
      entityId: expense.id,
      after: expense,
    });

    return NextResponse.json({ expense }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
