import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PrintButton } from "@/components/student/PrintButton";

export default async function InvoiceViewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: { invoicer: true, student: true, partner: true },
  });

  if (!invoice || invoice.organizationId !== session?.organizationId) notFound();

  const billedToName = invoice.student?.fullName ?? invoice.partner?.name ?? "—";
  const billedToContact = invoice.student ? [invoice.student.email, invoice.student.phone].filter(Boolean).join(" · ") : null;
  const taxIdLabel = invoice.invoicer.taxIdType && invoice.invoicer.taxIdNumber
    ? `${invoice.invoicer.taxIdType}: ${invoice.invoicer.taxIdNumber}`
    : null;
  const hasBankDetails = invoice.invoicer.bankAccountNumber || invoice.invoicer.bankName;
  const postedToLedger = invoice.currency.trim().toUpperCase() === "NPR";

  return (
    <div>
      <div className="flex items-center justify-between print:hidden">
        <Link href="/dashboard/billing" className="flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-700">
          <ArrowLeft className="h-4 w-4" /> Back to Billing
        </Link>
        <PrintButton />
      </div>

      {!postedToLedger && (
        <p className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700 print:hidden">
          Not posted to the accounting ledger — the ledger tracks NPR only, and this invoice is in {invoice.currency}. Record its NPR-equivalent manually via a journal entry if needed.
        </p>
      )}

      <div className="mt-4 rounded-xl border border-slate-200 bg-white p-8 print:border-0 print:p-0">
        <div className="flex items-start justify-between border-b border-slate-100 pb-6">
          <div className="flex items-start gap-4">
            {invoice.invoicer.logoUrl && (
              // eslint-disable-next-line @next/next/no-img-element -- external Cloudinary URL, not a local asset
              <img src={invoice.invoicer.logoUrl} alt={invoice.invoicer.name} className="h-14 w-14 rounded object-contain" />
            )}
            <div>
              <p className="text-lg font-semibold">{invoice.invoicer.name}</p>
              {invoice.invoicer.addressLine1 && <p className="text-sm text-slate-500">{invoice.invoicer.addressLine1}</p>}
              {invoice.invoicer.addressLine2 && <p className="text-sm text-slate-500">{invoice.invoicer.addressLine2}</p>}
              {taxIdLabel && <p className="mt-1 text-xs text-slate-400">{taxIdLabel}</p>}
            </div>
          </div>
          <div className="text-right">
            <h1 className="text-xl font-semibold">{invoice.status === "PAID" ? "Receipt" : "Invoice"}</h1>
            <p className="mt-1 text-sm text-slate-500">{invoice.invoiceNumber}</p>
            <p className="mt-2 text-xs text-slate-400">Issued {new Date(invoice.issueDate).toLocaleDateString()}</p>
            {invoice.dueDate && <p className="text-xs text-slate-400">Due {new Date(invoice.dueDate).toLocaleDateString()}</p>}
            <span
              className={`mt-2 inline-block rounded px-2 py-0.5 text-xs font-medium ${
                invoice.status === "PAID" ? "bg-green-100 text-green-700" : invoice.status === "VOID" ? "bg-slate-200 text-slate-600" : "bg-amber-100 text-amber-700"
              }`}
            >
              {invoice.status}
            </span>
          </div>
        </div>

        <div className="mt-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Billed To</p>
          <p className="mt-1 font-medium">{billedToName}</p>
          {billedToContact && <p className="text-sm text-slate-500">{billedToContact}</p>}
        </div>

        <table className="mt-6 w-full text-sm">
          <thead className="border-b border-slate-200 text-left text-slate-500">
            <tr>
              <th className="py-2">Description</th>
              <th className="py-2">Fee Type</th>
              <th className="py-2 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-slate-100">
              <td className="py-3">{invoice.description ?? "—"}</td>
              <td className="py-3">{invoice.feeType}</td>
              <td className="py-3 text-right">{invoice.currency} {invoice.amount.toFixed(2)}</td>
            </tr>
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={2} className="pt-3 text-right font-medium">Total</td>
              <td className="pt-3 text-right font-semibold">{invoice.currency} {invoice.amount.toFixed(2)}</td>
            </tr>
          </tfoot>
        </table>

        {invoice.status === "PAID" ? (
          <p className="mt-6 text-sm text-green-700">Paid on {invoice.paidAt ? new Date(invoice.paidAt).toLocaleDateString() : "—"}.</p>
        ) : (
          (hasBankDetails || invoice.invoicer.qrCodeUrl) && (
            <div className="mt-6 flex flex-wrap items-start justify-between gap-6 rounded-lg border border-slate-100 bg-slate-50 p-4">
              {hasBankDetails && (
                <div className="text-sm">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Payment Details</p>
                  {invoice.invoicer.bankAccountName && <p className="mt-1">Account Name: {invoice.invoicer.bankAccountName}</p>}
                  {invoice.invoicer.bankAccountNumber && <p>Account Number: {invoice.invoicer.bankAccountNumber}</p>}
                  {invoice.invoicer.bankName && <p>Bank: {invoice.invoicer.bankName}</p>}
                  {invoice.invoicer.bankBranch && <p>Branch: {invoice.invoicer.bankBranch}</p>}
                  {invoice.invoicer.bankSwift && <p>Swift: {invoice.invoicer.bankSwift}</p>}
                </div>
              )}
              {invoice.invoicer.qrCodeUrl && (
                // eslint-disable-next-line @next/next/no-img-element -- external Cloudinary URL, not a local asset
                <img src={invoice.invoicer.qrCodeUrl} alt="Payment QR" className="h-28 w-28 rounded border border-slate-200 object-contain" />
              )}
            </div>
          )
        )}

        {(invoice.invoicer.footerWebsite || invoice.invoicer.footerPhone || invoice.invoicer.footerEmail) && (
          <div className="mt-8 border-t border-slate-100 pt-4 text-center text-xs text-slate-400">
            {[invoice.invoicer.footerWebsite, invoice.invoicer.footerPhone, invoice.invoicer.footerEmail].filter(Boolean).join("  ·  ")}
          </div>
        )}

        {invoice.status === "PAID" && (
          <p className="mt-2 text-center text-[10px] text-slate-400">This payment is non-refundable.</p>
        )}
      </div>
    </div>
  );
}
