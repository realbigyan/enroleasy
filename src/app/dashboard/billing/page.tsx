"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Trash2 } from "lucide-react";
import { PersonCombobox } from "@/components/ui/PersonCombobox";
import { DeleteInvoiceButton } from "@/components/billing/DeleteInvoiceButton";
import { TDS_RULES } from "@/lib/accounting/tds-rates";

type Invoicer = { id: string; name: string; invoicePrefix: string; isDefault: boolean; isActive: boolean; taxIdType: "PAN" | "VAT" | null };
type Invoice = {
  id: string;
  invoiceNumber: string;
  billedToType: "STUDENT" | "PARTNER";
  feeType: string;
  amount: number;
  currency: string;
  status: "PAID" | "UNPAID" | "VOID";
  issueDate: string;
  invoicer: { name: string };
  student: { fullName: string } | null;
  partner: { name: string } | null;
};

// `rate` is used for a plain PAN invoice (client types the per-unit taxable
// rate directly, nothing to add or back out). `grossAmount` is used for VAT
// invoices (client types what the customer actually pays, VAT-inclusive,
// and the taxable rate is worked backward from it). `netAmount` is used for
// PAN commission invoices billed to a partner (client types what actually
// lands in the bank after the partner withholds TDS, and the taxable/
// invoiced rate is worked backward from that) — see `computedLineItems`.
type LineItemForm = { hsCode: string; description: string; quantity: string; rate: string; grossAmount: string; netAmount: string };

const emptyLineItem = (): LineItemForm => ({ hsCode: "", description: "", quantity: "1", rate: "", grossAmount: "", netAmount: "" });

const VAT_RATE = 0.13;
// The rate a partner withholds (TDS) before paying out commission on a PAN
// bill — Income Tax Act 2058, Section 88(1) general clause ("commission").
// Kept in sync with the single source of truth in tds-rates.ts rather than
// hardcoded here; falls back to 15 if that rule is ever renamed/removed.
const COMMISSION_TDS_RATE = (TDS_RULES.find((r) => r.key === "COMMISSION")?.rate ?? 15) / 100;

export default function BillingPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [invoicers, setInvoicers] = useState<Invoicer[]>([]);
  const [students, setStudents] = useState<{ id: string; fullName: string }[]>([]);
  const [partners, setPartners] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showInvoicerForm, setShowInvoicerForm] = useState(false);
  const [form, setForm] = useState({
    documentKind: "INVOICE" as "INVOICE" | "RECEIPT",
    billedToType: "STUDENT" as "STUDENT" | "PARTNER",
    studentId: "",
    partnerId: "",
    feeType: "MANUAL",
    currency: "USD",
    includeVat: false,
  });
  const [lineItems, setLineItems] = useState<LineItemForm[]>([emptyLineItem()]);
  const [invoicerForm, setInvoicerForm] = useState({ name: "", invoicePrefix: "" });

  async function load() {
    setLoading(true);
    const [invRes, icRes, stRes, ptRes] = await Promise.all([
      fetch("/api/invoices"),
      fetch("/api/invoicers"),
      fetch("/api/students"),
      fetch("/api/partners"),
    ]);
    const invData = await invRes.json();
    const icData = await icRes.json();
    const stData = await stRes.json();
    const ptData = await ptRes.json();
    setInvoices(invData.invoices ?? []);
    setInvoicers(icData.invoicers ?? []);
    setStudents(stData.students ?? []);
    setPartners(ptData.partners ?? []);
    setLoading(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch on mount
    load();
  }, []);

  const collected = invoices.filter((i) => i.status === "PAID").reduce((sum, i) => sum + i.amount, 0);
  const outstanding = invoices.filter((i) => i.status === "UNPAID").reduce((sum, i) => sum + i.amount, 0);

  // The New Invoice form has no invoicer picker — /api/invoices always bills
  // from whichever invoicer has isDefault: true. A VAT invoice can only be
  // issued if that invoicer is itself VAT-registered; otherwise every
  // invoice it issues must be a PAN invoice.
  const defaultInvoicer = invoicers.find((ic) => ic.isDefault) ?? invoicers[0];
  const canChargeVat = defaultInvoicer?.taxIdType === "VAT";

  // Billing a partner for commission on a PAN invoice is the one case where
  // the partner (not us) withholds tax before paying — so "what we'll
  // actually receive" and "what we invoice as taxable commission" are two
  // different numbers, and it's the net figure landing in the bank that's
  // known first (e.g. a bank statement line).
  const isPartnerCommissionPan = !form.includeVat && form.billedToType === "PARTNER" && form.feeType === "COMMISSION";

  // Each row's amount input means something different depending on mode:
  //   - VAT invoice: "Amount" is what the client pays (gross, VAT-inclusive)
  //     -> taxable rate = gross / 1.13.
  //   - PAN commission billed to a partner: "Amount" is what we'll actually
  //     receive after the partner withholds 15% TDS -> taxable rate =
  //     net / (1 - 0.15) = net / 0.85.
  //   - Plain PAN invoice: "Rate" is the taxable rate directly, nothing to
  //     back out.
  const computedLineItems = lineItems.map((li) => {
    const quantity = Number(li.quantity) || 0;
    if (form.includeVat) {
      const gross = Number(li.grossAmount) || 0;
      const taxableAmount = gross / (1 + VAT_RATE);
      const rate = quantity > 0 ? taxableAmount / quantity : 0;
      return { hsCode: li.hsCode.trim() || undefined, description: li.description.trim(), quantity, rate, taxableAmount, settled: gross };
    }
    if (isPartnerCommissionPan) {
      const net = Number(li.netAmount) || 0;
      const taxableAmount = net / (1 - COMMISSION_TDS_RATE);
      const rate = quantity > 0 ? taxableAmount / quantity : 0;
      return { hsCode: li.hsCode.trim() || undefined, description: li.description.trim(), quantity, rate, taxableAmount, settled: net };
    }
    const rate = Number(li.rate) || 0;
    const taxableAmount = quantity * rate;
    return { hsCode: li.hsCode.trim() || undefined, description: li.description.trim(), quantity, rate, taxableAmount, settled: taxableAmount };
  });
  const validLineItems = computedLineItems.filter((li) => li.description && li.quantity > 0);
  const subtotal = validLineItems.reduce((sum, li) => sum + li.taxableAmount, 0);
  // "settled" totals what money actually changes hands for the line — the
  // client's payment on a VAT invoice, our net receipt on a PAN commission
  // invoice, or (for a plain PAN invoice) the taxable amount itself. Grand
  // total below is always exactly the sum of what was typed, never
  // re-derived by multiplying the subtotal by a rate again, so it can't
  // drift by a paisa from rounding the same figure twice.
  const settledTotal = validLineItems.reduce((sum, li) => sum + li.settled, 0);
  const grandTotal = form.includeVat ? settledTotal : subtotal;
  const vatAmount = form.includeVat ? settledTotal - subtotal : 0;
  const tdsWithheld = isPartnerCommissionPan ? subtotal - settledTotal : 0;

  function updateLineItem(index: number, patch: Partial<LineItemForm>) {
    setLineItems((prev) => prev.map((li, i) => (i === index ? { ...li, ...patch } : li)));
  }

  function addLineItem() {
    setLineItems((prev) => [...prev, emptyLineItem()]);
  }

  function removeLineItem(index: number) {
    setLineItems((prev) => (prev.length === 1 ? prev : prev.filter((_, i) => i !== index)));
  }

  async function createInvoice(e: React.FormEvent) {
    e.preventDefault();
    if (validLineItems.length === 0) return;
    if (form.billedToType === "STUDENT" ? !form.studentId : !form.partnerId) return;
    await fetch("/api/invoices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        billedToType: form.billedToType,
        studentId: form.billedToType === "STUDENT" ? form.studentId : undefined,
        partnerId: form.billedToType === "PARTNER" ? form.partnerId : undefined,
        feeType: form.feeType,
        lineItems: validLineItems.map(({ hsCode, description, quantity, rate }) => ({ hsCode, description, quantity, rate })),
        includeVat: canChargeVat && form.includeVat,
        currency: form.currency,
        markPaid: form.documentKind === "RECEIPT",
      }),
    });
    setForm({ documentKind: "INVOICE", billedToType: "STUDENT", studentId: "", partnerId: "", feeType: "MANUAL", currency: "USD", includeVat: false });
    setLineItems([emptyLineItem()]);
    setShowForm(false);
    load();
  }

  async function createInvoicer(e: React.FormEvent) {
    e.preventDefault();
    await fetch("/api/invoicers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(invoicerForm),
    });
    setInvoicerForm({ name: "", invoicePrefix: "" });
    setShowInvoicerForm(false);
    load();
  }

  async function markPaid(id: string) {
    setInvoices((prev) => prev.map((i) => (i.id === id ? { ...i, status: "PAID" } : i)));
    await fetch(`/api/invoices/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "PAID" }),
    });
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Billing</h1>
          <p className="mt-1 text-sm text-slate-500">Invoices, fees, and revenue.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowInvoicerForm((v) => !v)}
            className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50"
          >
            + Invoicer
          </button>
          <button
            onClick={() => setShowForm((v) => !v)}
            className="flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            <Plus className="h-4 w-4" /> New Invoice / Receipt
          </button>
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-500">Collected</p>
          <p className="mt-1 text-2xl font-semibold text-green-600">{collected.toFixed(2)}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-500">Outstanding</p>
          <p className="mt-1 text-2xl font-semibold text-red-600">{outstanding.toFixed(2)}</p>
        </div>
      </div>

      {showInvoicerForm && (
        <form onSubmit={createInvoicer} className="mt-4 grid gap-3 rounded-xl border border-slate-200 bg-white p-5 sm:grid-cols-3">
          <input required placeholder="Legal entity name (e.g. Everest Global Pvt Ltd)" value={invoicerForm.name}
            onChange={(e) => setInvoicerForm({ ...invoicerForm, name: e.target.value })}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm sm:col-span-2" />
          <input required placeholder="Prefix (e.g. EGC)" value={invoicerForm.invoicePrefix}
            onChange={(e) => setInvoicerForm({ ...invoicerForm, invoicePrefix: e.target.value.toUpperCase() })}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
          <button type="submit" className="sm:col-span-3 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">
            Add invoicer
          </button>
        </form>
      )}

      {showForm && (
        <form onSubmit={createInvoice} className="mt-4 space-y-3 rounded-xl border border-slate-200 bg-white p-5">
          <div className="grid gap-3 sm:grid-cols-4">
            <div className="flex overflow-hidden rounded-md border border-slate-300 text-sm sm:col-span-4">
              {(["INVOICE", "RECEIPT"] as const).map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setForm({ ...form, documentKind: k })}
                  className={`flex-1 px-3 py-2 font-medium ${form.documentKind === k ? "bg-indigo-600 text-white" : "bg-white text-slate-600 hover:bg-slate-50"}`}
                >
                  {k === "INVOICE" ? "Invoice (payment pending)" : "Receipt (payment already received)"}
                </button>
              ))}
            </div>
            <select value={form.billedToType} onChange={(e) => setForm({ ...form, billedToType: e.target.value as "STUDENT" | "PARTNER" })}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm">
              <option value="STUDENT">Bill a student</option>
              <option value="PARTNER">Bill a partner</option>
            </select>
            {form.billedToType === "STUDENT" ? (
              <PersonCombobox
                options={students.map((s) => ({ id: s.id, label: s.fullName }))}
                value={form.studentId}
                onChange={(id) => setForm({ ...form, studentId: id })}
                placeholder="Search student…"
              />
            ) : (
              <PersonCombobox
                options={partners.map((p) => ({ id: p.id, label: p.name }))}
                value={form.partnerId}
                onChange={(id) => setForm({ ...form, partnerId: id })}
                placeholder="Search partner…"
              />
            )}
            <select value={form.feeType} onChange={(e) => setForm({ ...form, feeType: e.target.value })}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm">
              <option value="MANUAL">Manual</option>
              <option value="MEMBERSHIP">Membership</option>
              <option value="COMMISSION">Commission</option>
            </select>
            <input placeholder="Currency" value={form.currency}
              onChange={(e) => setForm({ ...form, currency: e.target.value })}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
          </div>

          <div>
            <div className="grid grid-cols-12 gap-2 px-1 text-xs font-medium text-slate-500">
              <span className="col-span-2">H.S. Code</span>
              <span className="col-span-4">Description</span>
              <span className="col-span-1">Qty</span>
              {form.includeVat ? (
                <>
                  <span className="col-span-2">Amount (client pays)</span>
                  <span className="col-span-2">Taxable (auto)</span>
                </>
              ) : isPartnerCommissionPan ? (
                <>
                  <span className="col-span-2">Net received (after 15% TDS)</span>
                  <span className="col-span-2">Taxable (auto)</span>
                </>
              ) : (
                <>
                  <span className="col-span-2">Rate</span>
                  <span className="col-span-2">Amount</span>
                </>
              )}
              <span className="col-span-1"></span>
            </div>
            <div className="mt-1 space-y-2">
              {lineItems.map((li, i) => (
                <div key={i} className="grid grid-cols-12 gap-2">
                  <input placeholder="Optional" value={li.hsCode}
                    onChange={(e) => updateLineItem(i, { hsCode: e.target.value })}
                    className="col-span-2 rounded-md border border-slate-300 px-2 py-1.5 text-sm" />
                  <input required placeholder="e.g. PB IELTS" value={li.description}
                    onChange={(e) => updateLineItem(i, { description: e.target.value })}
                    className="col-span-4 rounded-md border border-slate-300 px-2 py-1.5 text-sm" />
                  <input required type="number" step="0.01" min="0" value={li.quantity}
                    onChange={(e) => updateLineItem(i, { quantity: e.target.value })}
                    className="col-span-1 rounded-md border border-slate-300 px-2 py-1.5 text-sm" />
                  {form.includeVat ? (
                    <>
                      <input required type="number" step="0.01" min="0" placeholder="e.g. 25000" value={li.grossAmount}
                        onChange={(e) => updateLineItem(i, { grossAmount: e.target.value })}
                        className="col-span-2 rounded-md border border-slate-300 px-2 py-1.5 text-sm" />
                      <span className="col-span-2 self-center text-sm text-slate-500">
                        {((Number(li.grossAmount) || 0) / (1 + VAT_RATE)).toFixed(2)}
                      </span>
                    </>
                  ) : isPartnerCommissionPan ? (
                    <>
                      <input required type="number" step="0.01" min="0" placeholder="e.g. 3300" value={li.netAmount}
                        onChange={(e) => updateLineItem(i, { netAmount: e.target.value })}
                        className="col-span-2 rounded-md border border-slate-300 px-2 py-1.5 text-sm" />
                      <span className="col-span-2 self-center text-sm text-slate-500">
                        {((Number(li.netAmount) || 0) / (1 - COMMISSION_TDS_RATE)).toFixed(2)}
                      </span>
                    </>
                  ) : (
                    <>
                      <input required type="number" step="0.01" min="0" value={li.rate}
                        onChange={(e) => updateLineItem(i, { rate: e.target.value })}
                        className="col-span-2 rounded-md border border-slate-300 px-2 py-1.5 text-sm" />
                      <span className="col-span-2 self-center text-sm text-slate-500">
                        {((Number(li.quantity) || 0) * (Number(li.rate) || 0)).toFixed(2)}
                      </span>
                    </>
                  )}
                  <button type="button" onClick={() => removeLineItem(i)} className="col-span-1 self-center text-slate-400 hover:text-red-600">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
            <button type="button" onClick={addLineItem} className="mt-2 text-xs font-medium text-indigo-600 hover:underline">
              + Add line item
            </button>
            {form.includeVat && (
              <p className="mt-2 text-xs text-slate-400">
                Type what the client actually pays for each line — the taxable amount and 13% VAT are worked out automatically.
              </p>
            )}
            {isPartnerCommissionPan && (
              <p className="mt-2 text-xs text-slate-400">
                Type what actually lands in the bank per booking (net of the partner&apos;s 15% TDS) — the taxable commission to invoice is worked out automatically.
              </p>
            )}
          </div>

          <div className="flex items-center justify-between rounded-lg bg-slate-50 p-3">
            <div>
              <p className="mb-1 text-xs font-medium text-slate-500">Invoice type</p>
              <div className="flex overflow-hidden rounded-md border border-slate-300 text-sm">
                <button
                  type="button"
                  onClick={() => setForm({ ...form, includeVat: false })}
                  className={`px-3 py-1.5 font-medium ${!form.includeVat ? "bg-indigo-600 text-white" : "bg-white text-slate-600 hover:bg-slate-50"}`}
                >
                  PAN Invoice
                </button>
                <button
                  type="button"
                  disabled={!canChargeVat}
                  onClick={() => setForm({ ...form, includeVat: true })}
                  title={canChargeVat ? undefined : `${defaultInvoicer?.name ?? "This invoicer"} is PAN-registered only — VAT can't be charged until it's VAT-registered.`}
                  className={`px-3 py-1.5 font-medium ${
                    form.includeVat && canChargeVat ? "bg-indigo-600 text-white" : "bg-white text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:bg-white"
                  }`}
                >
                  VAT Invoice (+13%)
                </button>
              </div>
              {!canChargeVat && defaultInvoicer && (
                <p className="mt-1 text-xs text-slate-400">
                  {defaultInvoicer.name} is PAN-registered — invoices issue as PAN only.
                </p>
              )}
            </div>
            <div className="text-right text-sm">
              <p className="text-slate-500">Taxable amount: <span className="font-medium text-slate-800">{subtotal.toFixed(2)}</span></p>
              {form.includeVat && (
                <>
                  <p className="text-slate-500">13% VAT: <span className="font-medium text-slate-800">{vatAmount.toFixed(2)}</span></p>
                  <p className="text-slate-700">Client pays: <span className="font-semibold">{grandTotal.toFixed(2)}</span></p>
                </>
              )}
              {isPartnerCommissionPan && (
                <>
                  <p className="text-slate-500">15% TDS withheld: <span className="font-medium text-slate-800">{tdsWithheld.toFixed(2)}</span></p>
                  <p className="text-slate-700">We receive (net): <span className="font-semibold">{settledTotal.toFixed(2)}</span></p>
                </>
              )}
            </div>
          </div>

          <button type="submit" disabled={validLineItems.length === 0 || (form.billedToType === "STUDENT" ? !form.studentId : !form.partnerId)} className="w-full rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50">
            {form.documentKind === "RECEIPT" ? "Create receipt" : "Create invoice"}
          </button>
        </form>
      )}

      {invoicers.length > 0 && (
        <div className="mt-6 flex flex-wrap gap-2 text-xs text-slate-500">
          Invoicers: {invoicers.map((ic) => (
            <span key={ic.id} className="flex items-center gap-1.5 rounded bg-slate-100 px-2 py-1">
              {ic.name} ({ic.invoicePrefix}){ic.isDefault ? " · default" : ""}
              <Link href={`/dashboard/billing/invoicers/${ic.id}`} className="font-medium text-indigo-600 hover:underline">
                Edit branding
              </Link>
            </span>
          ))}
        </div>
      )}

      {loading ? (
        <p className="mt-8 text-sm text-slate-500">Loading…</p>
      ) : (
        <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-left text-slate-500">
              <tr>
                <th className="px-4 py-3">Invoice #</th>
                <th className="px-4 py-3">Billed to</th>
                <th className="px-4 py-3">Fee type</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Issued</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium">
                    <Link href={`/dashboard/billing/invoices/${inv.id}`} className="text-indigo-600 hover:underline">
                      {inv.invoiceNumber}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    {inv.student?.fullName ?? inv.partner?.name ?? "—"}
                    <span className="ml-1 text-xs text-slate-400">{inv.billedToType}</span>
                  </td>
                  <td className="px-4 py-3">{inv.feeType}</td>
                  <td className="px-4 py-3">{inv.currency} {inv.amount.toFixed(2)}</td>
                  <td className="px-4 py-3">
                    {inv.status === "UNPAID" ? (
                      <button onClick={() => markPaid(inv.id)} className="rounded bg-amber-100 px-2 py-1 text-xs text-amber-700 hover:bg-green-100 hover:text-green-700">
                        Mark paid
                      </button>
                    ) : (
                      <span className="rounded bg-green-100 px-2 py-1 text-xs text-green-700">{inv.status}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-500">{new Date(inv.issueDate).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-right">
                    <DeleteInvoiceButton
                      invoiceId={inv.id}
                      invoiceNumber={inv.invoiceNumber}
                      onDeleted={() => setInvoices((prev) => prev.filter((i) => i.id !== inv.id))}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
