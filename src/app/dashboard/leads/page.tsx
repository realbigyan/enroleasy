"use client";

import { useEffect, useState } from "react";
import { Plus, Upload } from "lucide-react";
import { LeadImportModal } from "@/components/LeadImportModal";

const STAGES = [
  "NEW", "CONTACTED", "TRIAL_BOOKED", "TRIAL_DONE", "QUALIFIED", "COUNSELING",
  "APPLICATION_STARTED", "OFFER_RECEIVED", "VISA_STAGE", "ENROLLED", "LOST",
] as const;

type Lead = {
  id: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  stage: (typeof STAGES)[number];
  interestedCountry: string | null;
};

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [form, setForm] = useState({ fullName: "", email: "", phone: "", interestedCountry: "" });

  async function load() {
    setLoading(true);
    const res = await fetch("/api/leads");
    const data = await res.json();
    setLeads(data.leads ?? []);
    setLoading(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch on mount
    load();
  }, []);

  async function createLead(e: React.FormEvent) {
    e.preventDefault();
    await fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setForm({ fullName: "", email: "", phone: "", interestedCountry: "" });
    setShowForm(false);
    load();
  }

  async function changeStage(id: string, stage: string) {
    setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, stage: stage as Lead["stage"] } : l)));
    await fetch(`/api/leads/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stage }),
    });
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Leads pipeline</h1>
          <p className="mt-1 text-sm text-slate-500">{leads.length} leads in your pipeline</p>
        </div>
        <div className="flex gap-2">
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- real file download, not a page route */}
          <a
            href="/api/leads/export"
            className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50"
          >
            Export CSV
          </a>
          <button
            onClick={() => setShowImport(true)}
            className="flex items-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50"
          >
            <Upload className="h-4 w-4" /> Import CSV
          </button>
          <button
            onClick={() => setShowForm((v) => !v)}
            className="flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            <Plus className="h-4 w-4" /> New lead
          </button>
        </div>
      </div>

      {showImport && (
        <LeadImportModal onClose={() => setShowImport(false)} onImported={load} />
      )}

      {showForm && (
        <form onSubmit={createLead} className="mt-4 grid gap-3 rounded-xl border border-slate-200 bg-white p-5 sm:grid-cols-4">
          <input required placeholder="Full name" value={form.fullName}
            onChange={(e) => setForm({ ...form, fullName: e.target.value })}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
          <input placeholder="Email" value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
          <input placeholder="Phone" value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
          <input placeholder="Interested country" value={form.interestedCountry}
            onChange={(e) => setForm({ ...form, interestedCountry: e.target.value })}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
          <button type="submit" className="sm:col-span-4 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">
            Add lead
          </button>
        </form>
      )}

      {loading ? (
        <p className="mt-8 text-sm text-slate-500">Loading…</p>
      ) : (
        <div className="mt-6 flex gap-4 overflow-x-auto pb-4">
          {STAGES.map((stage) => (
            <div key={stage} className="w-64 flex-shrink-0">
              <div className="mb-2 flex items-center justify-between px-1">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {stage.replace(/_/g, " ")}
                </h3>
                <span className="text-xs text-slate-400">
                  {leads.filter((l) => l.stage === stage).length}
                </span>
              </div>
              <div className="space-y-2">
                {leads
                  .filter((l) => l.stage === stage)
                  .map((lead) => (
                    <div key={lead.id} className="rounded-lg border border-slate-200 bg-white p-3 text-sm">
                      <p className="font-medium">{lead.fullName}</p>
                      {lead.interestedCountry && (
                        <p className="text-xs text-slate-500">{lead.interestedCountry}</p>
                      )}
                      <select
                        value={lead.stage}
                        onChange={(e) => changeStage(lead.id, e.target.value)}
                        className="mt-2 w-full rounded border border-slate-200 bg-slate-50 px-1 py-1 text-xs"
                      >
                        {STAGES.map((s) => (
                          <option key={s} value={s}>
                            {s.replace(/_/g, " ")}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
