"use client";

import { useEffect, useState } from "react";
import { Plus, Upload, CheckSquare, X } from "lucide-react";
import { LeadImportModal } from "@/components/LeadImportModal";

// Fixed underlying enum values — still the full set of stages a lead can be
// in, and used as a fallback until the org's pipeline stage config loads.
const ALL_STAGES = [
  "NEW", "CONTACTED", "TRIAL_BOOKED", "TRIAL_DONE", "QUALIFIED", "COUNSELING",
  "APPLICATION_STARTED", "OFFER_RECEIVED", "VISA_STAGE", "ENROLLED", "LOST",
] as const;

type Lead = {
  id: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  stage: (typeof ALL_STAGES)[number];
  interestedCountry: string | null;
};

type StageConfig = {
  id: string;
  stage: (typeof ALL_STAGES)[number];
  label: string;
  order: number;
  isActive: boolean;
};

type Counselor = { id: string; name: string; role: string; isActive: boolean };

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [stageConfigs, setStageConfigs] = useState<StageConfig[]>([]);
  const [counselors, setCounselors] = useState<Counselor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [form, setForm] = useState({ fullName: "", email: "", phone: "", interestedCountry: "" });

  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkStage, setBulkStage] = useState<string>("");
  const [bulkCounselorId, setBulkCounselorId] = useState<string>("");
  const [bulkTag, setBulkTag] = useState("");
  const [bulkBusy, setBulkBusy] = useState(false);

  async function load() {
    setLoading(true);
    const [leadsRes, stagesRes, teamRes] = await Promise.all([
      fetch("/api/leads"),
      fetch("/api/pipeline-stages"),
      fetch("/api/team"),
    ]);
    const leadsData = await leadsRes.json();
    const stagesData = await stagesRes.json();
    const teamData = await teamRes.json();
    setLeads(leadsData.leads ?? []);
    setStageConfigs(
      (stagesData.stages ?? []).slice().sort((a: StageConfig, b: StageConfig) => a.order - b.order)
    );
    setCounselors((teamData.staff ?? []).filter((u: Counselor) => u.role === "COUNSELOR" && u.isActive));
    setLoading(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch on mount
    load();
  }, []);

  // Columns shown on the board: active stages in the org's configured order,
  // falling back to the full enum (default labels) before config has loaded.
  const visibleStages: { stage: (typeof ALL_STAGES)[number]; label: string }[] =
    stageConfigs.length > 0
      ? stageConfigs.filter((s) => s.isActive).map((s) => ({ stage: s.stage, label: s.label }))
      : ALL_STAGES.map((s) => ({ stage: s, label: s.replace(/_/g, " ") }));

  // Every stage remains selectable in the per-lead dropdown (even hidden
  // ones) so a lead already on a hidden stage can still be moved off it.
  const selectableStages: { stage: (typeof ALL_STAGES)[number]; label: string }[] =
    stageConfigs.length > 0
      ? stageConfigs.slice().sort((a, b) => a.order - b.order).map((s) => ({ stage: s.stage, label: s.label }))
      : ALL_STAGES.map((s) => ({ stage: s, label: s.replace(/_/g, " ") }));

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

  function toggleSelectMode() {
    setSelectMode((v) => !v);
    setSelected(new Set());
  }

  function toggleSelected(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function runBulk(body: Record<string, unknown>) {
    if (selected.size === 0) return;
    setBulkBusy(true);
    await fetch("/api/leads/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: Array.from(selected), ...body }),
    });
    setBulkBusy(false);
    setSelected(new Set());
    load();
  }

  async function bulkChangeStage() {
    if (!bulkStage) return;
    await runBulk({ action: "changeStage", stage: bulkStage });
    setBulkStage("");
  }

  async function bulkAssignCounselor() {
    const counselorId = bulkCounselorId === "__unassign__" ? null : bulkCounselorId || null;
    await runBulk({ action: "assignCounselor", counselorId });
    setBulkCounselorId("");
  }

  async function bulkAddTag() {
    if (!bulkTag.trim()) return;
    await runBulk({ action: "addTag", tag: bulkTag.trim() });
    setBulkTag("");
  }

  async function bulkDelete() {
    if (!confirm(`Delete ${selected.size} lead(s)? This cannot be undone.`)) return;
    await runBulk({ action: "delete" });
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
            onClick={toggleSelectMode}
            className={`flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-medium ${
              selectMode ? "border-indigo-300 bg-indigo-50 text-indigo-700" : "border-slate-300 bg-white hover:bg-slate-50"
            }`}
          >
            <CheckSquare className="h-4 w-4" /> {selectMode ? "Cancel select" : "Select"}
          </button>
          <button
            onClick={() => setShowForm((v) => !v)}
            className="flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            <Plus className="h-4 w-4" /> New lead
          </button>
        </div>
      </div>

      {selectMode && selected.size > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 p-3">
          <span className="text-sm font-medium text-indigo-800">{selected.size} selected</span>

          <select
            value={bulkStage}
            onChange={(e) => setBulkStage(e.target.value)}
            className="rounded-md border border-slate-300 px-2 py-1.5 text-xs"
          >
            <option value="">Move to stage…</option>
            {selectableStages.map(({ stage: s, label: l }) => (
              <option key={s} value={s}>
                {l}
              </option>
            ))}
          </select>
          <button
            onClick={bulkChangeStage}
            disabled={bulkBusy || !bulkStage}
            className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs font-medium hover:bg-slate-50 disabled:opacity-50"
          >
            Apply
          </button>

          <select
            value={bulkCounselorId}
            onChange={(e) => setBulkCounselorId(e.target.value)}
            className="rounded-md border border-slate-300 px-2 py-1.5 text-xs"
          >
            <option value="">Assign counselor…</option>
            <option value="__unassign__">Unassign</option>
            {counselors.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <button
            onClick={bulkAssignCounselor}
            disabled={bulkBusy || !bulkCounselorId}
            className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs font-medium hover:bg-slate-50 disabled:opacity-50"
          >
            Apply
          </button>

          <input
            placeholder="Add tag…"
            value={bulkTag}
            onChange={(e) => setBulkTag(e.target.value)}
            className="w-28 rounded-md border border-slate-300 px-2 py-1.5 text-xs"
          />
          <button
            onClick={bulkAddTag}
            disabled={bulkBusy || !bulkTag.trim()}
            className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs font-medium hover:bg-slate-50 disabled:opacity-50"
          >
            Apply
          </button>

          <button
            onClick={bulkDelete}
            disabled={bulkBusy}
            className="ml-auto flex items-center gap-1 rounded-md bg-red-600 px-2 py-1.5 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
          >
            Delete
          </button>
          <button
            onClick={() => setSelected(new Set())}
            className="flex items-center gap-1 text-xs font-medium text-indigo-700 hover:underline"
          >
            <X className="h-3.5 w-3.5" /> Clear
          </button>
        </div>
      )}

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
          {visibleStages.map(({ stage, label }) => (
            <div key={stage} className="w-64 flex-shrink-0">
              <div className="mb-2 flex items-center justify-between px-1">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {label}
                </h3>
                <span className="text-xs text-slate-400">
                  {leads.filter((l) => l.stage === stage).length}
                </span>
              </div>
              <div className="space-y-2">
                {leads
                  .filter((l) => l.stage === stage)
                  .map((lead) => (
                    <div
                      key={lead.id}
                      className={`rounded-lg border bg-white p-3 text-sm ${
                        selectMode && selected.has(lead.id) ? "border-indigo-400 ring-1 ring-indigo-300" : "border-slate-200"
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        {selectMode && (
                          <input
                            type="checkbox"
                            checked={selected.has(lead.id)}
                            onChange={() => toggleSelected(lead.id)}
                            className="mt-1 h-3.5 w-3.5 flex-shrink-0"
                          />
                        )}
                        <div className="flex-1">
                          <p className="font-medium">{lead.fullName}</p>
                          {lead.interestedCountry && (
                            <p className="text-xs text-slate-500">{lead.interestedCountry}</p>
                          )}
                          <select
                            value={lead.stage}
                            onChange={(e) => changeStage(lead.id, e.target.value)}
                            className="mt-2 w-full rounded border border-slate-200 bg-slate-50 px-1 py-1 text-xs"
                          >
                            {selectableStages.map(({ stage: s, label: l }) => (
                              <option key={s} value={s}>
                                {l}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
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
