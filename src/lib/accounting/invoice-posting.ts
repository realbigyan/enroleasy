import { prisma } from "@/lib/prisma";
import { getNepaliFiscalYear } from "@/lib/accounting/fiscal-year";
import { getSystemAccountByCode } from "@/lib/accounting/system-accounts";
import { seedChartOfAccounts } from "@/lib/accounting/chart-of-accounts";

// Wires the CRM billing module (Invoice) into the double-entry ledger.
// Only NPR-denominated invoices are posted — the accounting module is a
// single-currency (NPR) Nepal-compliant ledger, and posting a USD invoice
// amount as if it were NPR would silently corrupt every report. Invoices in
// other currencies (e.g. USD application fees) are left out of the ledger;
// record their NPR-equivalent manually via a journal entry if needed.
//
// Accrual pattern (matches how a service business recognizes billing):
//   1. On invoice creation           -> Dr Accounts Receivable / Cr Income   ("INVOICE")
//   2. When the invoice is marked paid -> Dr Cash in Hand / Cr Accounts Receivable ("INVOICE_PAYMENT")
// A receipt (invoice created already-paid) posts both legs immediately.
// The payment leg always defaults to Cash in Hand since the invoice form
// doesn't currently capture which bank/cash account received the money —
// reclassify to the correct bank account directly in the ledger if paid by
// transfer.

const FEE_TYPE_INCOME_ACCOUNT_CODE: Record<string, string> = {
  MANUAL: "4020", // Consultancy / Application Service Fees
  MEMBERSHIP: "4010", // Tuition / Membership Fees
  COMMISSION: "4030", // Commission Income
};

type InvoiceForPosting = {
  id: string;
  organizationId: string;
  invoiceNumber: string;
  feeType: string;
  description: string | null;
  amount: number;
  currency: string;
  issueDate: Date;
};

function isNpr(currency: string): boolean {
  return currency.trim().toUpperCase() === "NPR";
}

export async function postInvoiceAccrual(invoice: InvoiceForPosting, createdById: string): Promise<void> {
  if (!isNpr(invoice.currency)) return;
  await seedChartOfAccounts(invoice.organizationId);

  const existing = await prisma.journalEntry.findFirst({ where: { sourceType: "INVOICE", sourceId: invoice.id } });
  if (existing) return;

  const receivable = await getSystemAccountByCode(invoice.organizationId, "1030", "Accounts Receivable");
  const incomeCode = FEE_TYPE_INCOME_ACCOUNT_CODE[invoice.feeType] ?? "4040";
  const income = await getSystemAccountByCode(invoice.organizationId, incomeCode, "Income");

  await prisma.journalEntry.create({
    data: {
      organizationId: invoice.organizationId,
      date: invoice.issueDate,
      fiscalYear: getNepaliFiscalYear(invoice.issueDate),
      reference: invoice.invoiceNumber,
      description: `Invoice ${invoice.invoiceNumber}${invoice.description ? `: ${invoice.description}` : ""}`,
      sourceType: "INVOICE",
      sourceId: invoice.id,
      createdById,
      lines: {
        create: [
          { accountId: receivable.id, debit: invoice.amount, credit: 0, memo: "Invoice billed" },
          { accountId: income.id, debit: 0, credit: invoice.amount, memo: "Invoice billed" },
        ],
      },
    },
  });
}

export async function postInvoicePayment(invoice: InvoiceForPosting, createdById: string, paidAt: Date): Promise<void> {
  if (!isNpr(invoice.currency)) return;
  await seedChartOfAccounts(invoice.organizationId);

  const existing = await prisma.journalEntry.findFirst({ where: { sourceType: "INVOICE_PAYMENT", sourceId: invoice.id } });
  if (existing) return;

  const receivable = await getSystemAccountByCode(invoice.organizationId, "1030", "Accounts Receivable");
  const cash = await getSystemAccountByCode(invoice.organizationId, "1010", "Cash in Hand");

  await prisma.journalEntry.create({
    data: {
      organizationId: invoice.organizationId,
      date: paidAt,
      fiscalYear: getNepaliFiscalYear(paidAt),
      reference: invoice.invoiceNumber,
      description: `Payment received: ${invoice.invoiceNumber}`,
      sourceType: "INVOICE_PAYMENT",
      sourceId: invoice.id,
      createdById,
      lines: {
        create: [
          { accountId: cash.id, debit: invoice.amount, credit: 0, memo: "Payment received" },
          { accountId: receivable.id, debit: 0, credit: invoice.amount, memo: "Payment received" },
        ],
      },
    },
  });
}

export async function reverseInvoicePayment(invoiceId: string): Promise<void> {
  await prisma.journalEntry.deleteMany({ where: { sourceType: "INVOICE_PAYMENT", sourceId: invoiceId } });
}

export async function reverseInvoiceAccrual(invoiceId: string): Promise<void> {
  await prisma.journalEntry.deleteMany({ where: { sourceType: "INVOICE", sourceId: invoiceId } });
}
