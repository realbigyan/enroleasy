"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

type OrgSettings = {
  id: string;
  name: string;
  taxRegistrationType: "VAT_REGISTERED" | "PAN_ONLY" | null;
  panVatNumber: string | null;
};

export default function AccountingSettingsPage() {
  const [org, setOrg] = useState<OrgSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [taxRegistrationType, setTaxRegistrationType] = useState<"" | "VAT_REGISTERED" | "PAN_ONLY">("");
  const [panVatNumber, setPanVatNumber] = useState("");

  async function load() {
    setLoading(true);
    const res = await fetch("/api/accounting/settings");
    const data = await res.json();
    setOrg(data.organization ?? null);
    setTaxRegistrationType(data.organization?.taxRegistrationType ?? "");
    setPanVatNumber(data.organization?.panVatNumber ?? "");
    setLoading(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch on mount
    load();
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    setSaving(true);
    const res = await fetch("/api/accounting/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        taxRegistrationType: taxRegistrationType || null,
        panVatNumber: panVatNumber || null,
      }),
    });
    setSaving(false);
    if (res.ok) {
      setMessage({ type: "success", text: "Saved." });
      load();
    } else {
      const data = await res.json().catch(() => ({}));
      setMessage({ type: "error", text: data.error ?? "Could not save settings" });
    }
  }

  return (
    <div>
      <Link href="/dashboard/accounting" className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700">
        <ArrowLeft className="h-3.5 w-3.5" /> Chart of Accounts
      </Link>
      <h1 className="mt-1 text-2xl font-semibold">Accounting Settings</h1>
      <p className="mt-1 text-sm text-slate-500">Tax registration determines how VAT and TDS are calculated on invoices and expenses.</p>

      {loading ? (
        <p className="mt-8 text-sm text-slate-500">Loading…</p>
      ) : (
        <form onSubmit={save} className="mt-6 max-w-xl space-y-4 rounded-xl border border-slate-200 bg-white p-5">
          <div>
            <label className="block text-sm font-medium">Organization</label>
            <p className="mt-1 text-sm text-slate-500">{org?.name}</p>
          </div>

          <div>
            <label className="block text-sm font-medium">Tax registration type</label>
            <select value={taxRegistrationType} onChange={(e) => setTaxRegistrationType(e.target.value as typeof taxRegistrationType)}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none">
              <option value="">Not set</option>
              <option value="VAT_REGISTERED">VAT Registered — charges 13% VAT, 1.5% TDS on VAT-invoiced services</option>
              <option value="PAN_ONLY">PAN Only — no VAT, 15% TDS on PAN-only service bills</option>
            </select>
            <p className="mt-1 text-xs text-slate-500">
              This sets the default TDS rate suggested when recording expenses. VAT-registered orgs should invoice with 13% VAT added where applicable.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium">PAN / VAT number</label>
            <input value={panVatNumber} onChange={(e) => setPanVatNumber(e.target.value)}
              placeholder="e.g. 123456789"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none" />
          </div>

          {message && (
            <p className={`text-sm ${message.type === "success" ? "text-green-600" : "text-red-600"}`}>{message.text}</p>
          )}

          <button type="submit" disabled={saving}
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50">
            {saving ? "Saving…" : "Save settings"}
          </button>
        </form>
      )}
    </div>
  );
}
