"use client";

import { useEffect, useState } from "react";
import { Plus } from "lucide-react";

type Partner = {
  id: string;
  name: string;
  type: "REFERRAL" | "B2B_APPLICATION" | "EXAM_BODY";
  contactEmail: string | null;
  contactPhone: string | null;
  address: string | null;
  panNumber: string | null;
  isActive: boolean;
  _count: { referredLeads: number; referredStudents: number };
};

const TYPES = ["REFERRAL", "B2B_APPLICATION", "EXAM_BODY"] as const;

export default function PartnersPage() {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: "",
    type: "REFERRAL" as (typeof TYPES)[number],
    contactEmail: "",
    contactPhone: "",
    address: "",
    panNumber: "",
  });

  async function load() {
    setLoading(true);
    const res = await fetch("/api/partners");
    const data = await res.json();
    setPartners(data.partners ?? []);
    setLoading(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch on mount
    load();
  }, []);

  async function createPartner(e: React.FormEvent) {
    e.preventDefault();
    await fetch("/api/partners", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setForm({ name: "", type: "REFERRAL", contactEmail: "", contactPhone: "", address: "", panNumber: "" });
    setShowForm(false);
    load();
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Partner Directory</h1>
          <p className="mt-1 text-sm text-slate-500">Referral agents, B2B application partners, and exam bodies.</p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          <Plus className="h-4 w-4" /> New Partner
        </button>
      </div>

      {showForm && (
        <form onSubmit={createPartner} className="mt-4 grid gap-3 rounded-xl border border-slate-200 bg-white p-5 sm:grid-cols-4">
          <input required placeholder="Partner name" value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
          <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as (typeof TYPES)[number] })}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm">
            {TYPES.map((t) => (
              <option key={t} value={t}>{t.replace(/_/g, " ")}</option>
            ))}
          </select>
          <input placeholder="Contact email" value={form.contactEmail}
            onChange={(e) => setForm({ ...form, contactEmail: e.target.value })}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
          <input placeholder="Contact phone" value={form.contactPhone}
            onChange={(e) => setForm({ ...form, contactPhone: e.target.value })}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
          <input placeholder="Address" value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm sm:col-span-2" />
          <input placeholder="PAN/VAT number" value={form.panNumber}
            onChange={(e) => setForm({ ...form, panNumber: e.target.value })}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm sm:col-span-2" />
          <button type="submit" className="sm:col-span-4 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">
            Add partner
          </button>
        </form>
      )}

      {loading ? (
        <p className="mt-8 text-sm text-slate-500">Loading…</p>
      ) : (
        <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-left text-slate-500">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Contact</th>
                <th className="px-4 py-3">PAN/VAT</th>
                <th className="px-4 py-3">Referred / Converted</th>
              </tr>
            </thead>
            <tbody>
              {partners.map((p) => (
                <tr key={p.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium">{p.name}</td>
                  <td className="px-4 py-3">
                    <span className="rounded bg-slate-100 px-2 py-0.5 text-xs">{p.type.replace(/_/g, " ")}</span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{p.contactEmail ?? p.contactPhone ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-600">{p.panNumber ?? "—"}</td>
                  <td className="px-4 py-3">{p._count.referredLeads} referred · {p._count.referredStudents} converted</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
