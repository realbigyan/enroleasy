"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Trash2 } from "lucide-react";

type Invoicer = { id: string; name: string; invoicePrefix: string; isDefault: boolean; isActive: boolean };
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

type LineItemForm = { hsCode: string; description: string; quantity: string; rate: string };

const emptyLineItem = (): LineItemForm => ({ hsCode: "", description: "", quantity: "1", rate: "" });

export default function BillingPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [invoicers, setInvoicers] = useState<Invoicer[]>([]);
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
    const [invRes, icRes] = await Promise.all([fetch("/api/invoices"), fetch("/api/invoicers")]);
    const invData = await invRes.json();
    const icData = await icRes.json();
    setInvoices(invData.invoices ?? []);
    setInvoicers(icData.invoicers ?? []);
    setLoading(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch on mount
    load();
  }, []);

  const collected = invoices.filter((i) => i.status === "PAID").reduce((sum, i) => sum + i.amount, 0);
  const outstanding = invoices.filter((i) => i.status === "UNPAID").reduce((sum, i) => sum + i.amount, 0);

  const validLineItems = lineItems
    .map((li) => ({
      hsCode: li.hsCode.trim() || undefined,
      description: li.description.trim(),
      quantity: Number(li.quantity) || 0,
      rate: Number(li.rate) || 0,
    }))
    .filter((li) => li.description && li.quantity > 0 && li.rate >= 0);
  const subtotal = validLineItems.reduce((sum, li) => sum + li.quantity * li.rate, 0);
  const vatAmount = form.includeVat ? subtotal * 0.13 : 0;
  const grandTotal = subtotal + vatAmount;

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
    await fetch("/api/invoices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        billedToType: form.billedToType,
        studentId: form.billedToType === "STUDENT" ? form.studentId : undefined,
        partnerId: form.billedToType === "PARTNER" ? form.partnerId : undefined,
        feeType: form.feeType,
        lineItems: validLineItems,
        includeVat: form.includeVat,
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
              <input required placeholder="Student ID" value={form.studentId}
                onChange={(e) => setForm({ ...form, studentId: e.target.value })}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
            ) : (
              <input required placeholder="Partner ID" value={form.partnerId}
                onChange={(e) => setForm({ ...form, partnerId: e.target.value })}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
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
              <span className="col-span-2">Qty</span>
              <span className="col-span-2">Rate</span>
              <span className="col-span-1">Amount</span>
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
                    className="col-span-2 rounded-md border border-slate-300 px-2 py-1.5 text-sm" />
                  <input required type="number" step="0.01" min="0" value={li.rate}
                    onChange={(e) => updateLineItem(i, { rate: e.target.value })}
                    className="col-span-2 rounded-md border border-slate-300 px-2 py-1.5 text-sm" />
                  <span className="col-span-1 self-center text-sm text-slate-500">
                    {((Number(li.quantity) || 0) * (Number(li.rate) || 0)).toFixed(2)}
                  </span>
                  <button type="button" onClick={() => removeLineItem(i)} className="col-span-1 self-center text-slate-400 hover:text-red-600">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
            <button type="button" onClick={addLineItem} className="mt-2 text-xs font-medium text-indigo-600 hover:underline">
              + Add line item
            </button>
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
                  onClick={() => setForm({ ...form, includeVat: true })}
                  className={`px-3 py-1.5 font-medium ${form.includeVat ? "bg-indigo-600 text-white" : "bg-white text-slate-600 hover:bg-slate-50"}`}
                >
                  VAT Invoice (+13%)
                </button>
              </div>
            </div>
            <div className="text-right text-sm">
              <p className="text-slate-500">Taxable amount: <span className="font-medium text-slate-800">{subtotal.toFixed(2)}</span></p>
              {form.includeVat && (
                <>
                  <p className="text-slate-500">13% VAT: <span className="font-medium text-slate-800">{vatAmount.toFixed(2)}</span></p>
                  <p className="text-slate-700">Grand amount: <span className="font-semibold">{grandTotal.toFixed(2)}</span></p>
                </>
              )}
            </div>
          </div>

          <button type="submit" disabled={validLineItems.length === 0} className="w-full rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50">
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
