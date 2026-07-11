"use client";

import { Fragment, useEffect, useState } from "react";
import { ChevronDown, ChevronUp, History, CheckSquare, X } from "lucide-react";
import { STAGE_VALUES, STAGE_LABELS, type ApplicationStageValue } from "@/lib/application-stages";

type Application = {
  id: string;
  status: string;
  studentId: string;
  student: { fullName: string };
  destination: { university: string; course: string; country: string; intake: string };
  currentStage: ApplicationStageValue | null;
  currentStageOther: string | null;
  currentStageUpdatedAt: string | null;
  assignedDocOfficer: { id: string; name: string } | null;
};

type StageLog = {
  id: string;
  description: string;
  createdAt: string;
  author: { name: string } | null;
};

type DocOfficer = { id: string; name: string; role: string; isActive: boolean };

const STATUSES = [
  "DRAFT", "SUBMITTED", "UNDER_REVIEW", "OFFER_CONDITIONAL", "OFFER_UNCONDITIONAL",
  "DEPOSIT_PAID", "VISA_APPLIED", "VISA_APPROVED", "REJECTED", "WITHDRAWN",
];

const STAGE_MANAGER_ROLES = ["OWNER", "ADMIN", "DOCUMENTATION_OFFICER"];

function stageBadge(a: Application) {
  if (!a.currentStage) return <span className="text-xs text-slate-400">Not set</span>;
  const label = a.currentStage === "OTHER" ? (a.currentStageOther ?? "Other") : STAGE_LABELS[a.currentStage];
  return <span className="rounded bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700">{label}</span>;
}

export default function ApplicationsPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [docOfficers, setDocOfficers] = useState<DocOfficer[]>([]);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [stageForm, setStageForm] = useState<{ stage: ApplicationStageValue; otherLabel: string; note: string }>({
    stage: "APPLICATION",
    otherLabel: "",
    note: "",
  });
  const [savingStage, setSavingStage] = useState(false);

  const [historyId, setHistoryId] = useState<string | null>(null);
  const [historyLogs, setHistoryLogs] = useState<StageLog[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkStatus, setBulkStatus] = useState("");
  const [bulkDocOfficerId, setBulkDocOfficerId] = useState("");
  const [bulkBusy, setBulkBusy] = useState(false);

  async function load() {
    setLoading(true);
    const [appsRes, meRes, teamRes] = await Promise.all([
      fetch("/api/applications"),
      fetch("/api/auth/me"),
      fetch("/api/team"),
    ]);
    const appsData = await appsRes.json();
    const meData = await meRes.json();
    const teamData = await teamRes.json();
    setApplications(appsData.applications ?? []);
    setRole(meData.user?.role ?? null);
    setDocOfficers((teamData.staff ?? []).filter((u: DocOfficer) => u.role === "DOCUMENTATION_OFFICER" && u.isActive));
    setLoading(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch on mount
    load();
  }, []);

  async function changeStatus(id: string, status: string) {
    setApplications((prev) => prev.map((a) => (a.id === id ? { ...a, status } : a)));
    await fetch(`/api/applications/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
  }

  function openStageEditor(a: Application) {
    setHistoryId(null);
    setEditingId(a.id);
    setStageForm({
      stage: a.currentStage ?? "APPLICATION",
      otherLabel: a.currentStage === "OTHER" ? a.currentStageOther ?? "" : "",
      note: "",
    });
  }

  async function saveStage(id: string) {
    setSavingStage(true);
    try {
      const res = await fetch(`/api/applications/${id}/stage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stage: stageForm.stage,
          otherLabel: stageForm.stage === "OTHER" ? stageForm.otherLabel : undefined,
          note: stageForm.note || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not update stage");
      setApplications((prev) => prev.map((a) => (a.id === id ? { ...a, ...data.application } : a)));
      setEditingId(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Could not update stage");
    } finally {
      setSavingStage(false);
    }
  }

  async function toggleHistory(id: string) {
    if (historyId === id) {
      setHistoryId(null);
      return;
    }
    setEditingId(null);
    setHistoryId(id);
    setLoadingHistory(true);
    const res = await fetch(`/api/activity-logs?applicationId=${id}`);
    const data = await res.json();
    setHistoryLogs((data.logs ?? []).filter((l: { type: string }) => l.type === "stage_change"));
    setLoadingHistory(false);
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

  function toggleSelectAll() {
    setSelected((prev) => (prev.size === applications.length ? new Set() : new Set(applications.map((a) => a.id))));
  }

  async function runBulk(body: Record<string, unknown>) {
    if (selected.size === 0) return;
    setBulkBusy(true);
    await fetch("/api/applications/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: Array.from(selected), ...body }),
    });
    setBulkBusy(false);
    setSelected(new Set());
    load();
  }

  async function bulkChangeStatus() {
    if (!bulkStatus) return;
    await runBulk({ action: "changeStatus", status: bulkStatus });
    setBulkStatus("");
  }

  async function bulkAssignDocOfficer() {
    const docOfficerId = bulkDocOfficerId === "__unassign__" ? null : bulkDocOfficerId || null;
    await runBulk({ action: "assignDocOfficer", docOfficerId });
    setBulkDocOfficerId("");
  }

  const canManageStage = role != null && STAGE_MANAGER_ROLES.includes(role);

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Applications</h1>
          <p className="mt-1 text-sm text-slate-500">{applications.length} applications in flight</p>
        </div>
        <button
          onClick={toggleSelectMode}
          className={`flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-medium ${
            selectMode ? "border-indigo-300 bg-indigo-50 text-indigo-700" : "border-slate-300 bg-white hover:bg-slate-50"
          }`}
        >
          <CheckSquare className="h-4 w-4" /> {selectMode ? "Cancel select" : "Select"}
        </button>
      </div>

      {selectMode && selected.size > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 p-3">
          <span className="text-sm font-medium text-indigo-800">{selected.size} selected</span>

          <select
            value={bulkStatus}
            onChange={(e) => setBulkStatus(e.target.value)}
            className="rounded-md border border-slate-300 px-2 py-1.5 text-xs"
          >
            <option value="">Change status…</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s.replace(/_/g, " ")}
              </option>
            ))}
          </select>
          <button
            onClick={bulkChangeStatus}
            disabled={bulkBusy || !bulkStatus}
            className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs font-medium hover:bg-slate-50 disabled:opacity-50"
          >
            Apply
          </button>

          <select
            value={bulkDocOfficerId}
            onChange={(e) => setBulkDocOfficerId(e.target.value)}
            className="rounded-md border border-slate-300 px-2 py-1.5 text-xs"
          >
            <option value="">Assign doc officer…</option>
            <option value="__unassign__">Unassign</option>
            {docOfficers.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
          <button
            onClick={bulkAssignDocOfficer}
            disabled={bulkBusy || !bulkDocOfficerId}
            className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs font-medium hover:bg-slate-50 disabled:opacity-50"
          >
            Apply
          </button>

          <button
            onClick={() => setSelected(new Set())}
            className="ml-auto flex items-center gap-1 text-xs font-medium text-indigo-700 hover:underline"
          >
            <X className="h-3.5 w-3.5" /> Clear
          </button>
        </div>
      )}

      {loading ? (
        <p className="mt-8 text-sm text-slate-500">Loading…</p>
      ) : (
        <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-left text-slate-500">
              <tr>
                {selectMode && (
                  <th className="w-8 px-4 py-3">
                    <input
                      type="checkbox"
                      checked={applications.length > 0 && selected.size === applications.length}
                      onChange={toggleSelectAll}
                      className="h-3.5 w-3.5"
                    />
                  </th>
                )}
                <th className="px-4 py-3">Student</th>
                <th className="px-4 py-3">Destination</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Stage</th>
                <th className="px-4 py-3">Assigned to</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {applications.map((a) => (
                <Fragment key={a.id}>
                  <tr className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                    {selectMode && (
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selected.has(a.id)}
                          onChange={() => toggleSelected(a.id)}
                          className="h-3.5 w-3.5"
                        />
                      </td>
                    )}
                    <td className="px-4 py-3 font-medium">{a.student.fullName}</td>
                    <td className="px-4 py-3 text-slate-600">
                      {a.destination.university} — {a.destination.course} ({a.destination.country})
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={a.status}
                        onChange={(e) => changeStatus(a.id, e.target.value)}
                        className="rounded border border-slate-200 bg-slate-50 px-2 py-1 text-xs"
                      >
                        {STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {s.replace(/_/g, " ")}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3">{stageBadge(a)}</td>
                    <td className="px-4 py-3 text-slate-600">
                      {a.assignedDocOfficer ? a.assignedDocOfficer.name : <span className="text-slate-400">Unassigned</span>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {canManageStage && (
                          <button
                            onClick={() => (editingId === a.id ? setEditingId(null) : openStageEditor(a))}
                            className="flex items-center gap-1 text-xs font-medium text-indigo-600 hover:underline"
                          >
                            Update {editingId === a.id ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                          </button>
                        )}
                        <button
                          onClick={() => toggleHistory(a.id)}
                          className="flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-700"
                        >
                          <History className="h-3 w-3" /> History
                        </button>
                      </div>
                    </td>
                  </tr>
                  {editingId === a.id && (
                    <tr className="border-b border-slate-100 bg-indigo-50/40">
                      <td colSpan={selectMode ? 7 : 6} className="px-4 py-3">
                        <div className="grid gap-2 sm:grid-cols-4">
                          <select
                            value={stageForm.stage}
                            onChange={(e) => setStageForm({ ...stageForm, stage: e.target.value as ApplicationStageValue })}
                            className="rounded-md border border-slate-300 px-2 py-1.5 text-xs"
                          >
                            {STAGE_VALUES.map((s) => (
                              <option key={s} value={s}>
                                {STAGE_LABELS[s]}
                              </option>
                            ))}
                          </select>
                          {stageForm.stage === "OTHER" && (
                            <input
                              placeholder="Custom stage label"
                              value={stageForm.otherLabel}
                              onChange={(e) => setStageForm({ ...stageForm, otherLabel: e.target.value })}
                              className="rounded-md border border-slate-300 px-2 py-1.5 text-xs"
                            />
                          )}
                          <input
                            placeholder="Note (optional)"
                            value={stageForm.note}
                            onChange={(e) => setStageForm({ ...stageForm, note: e.target.value })}
                            className="rounded-md border border-slate-300 px-2 py-1.5 text-xs sm:col-span-2"
                          />
                          <div className="flex items-center gap-2 sm:col-span-4">
                            <button
                              onClick={() => saveStage(a.id)}
                              disabled={savingStage || (stageForm.stage === "OTHER" && !stageForm.otherLabel.trim())}
                              className="rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                            >
                              {savingStage ? "Saving…" : "Save stage"}
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              disabled={savingStage}
                              className="text-xs font-medium text-slate-500 hover:text-slate-700"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                  {historyId === a.id && (
                    <tr className="border-b border-slate-100 bg-slate-50">
                      <td colSpan={selectMode ? 7 : 6} className="px-4 py-3">
                        {loadingHistory ? (
                          <p className="text-xs text-slate-500">Loading history…</p>
                        ) : historyLogs.length === 0 ? (
                          <p className="text-xs text-slate-500">No stage history recorded yet.</p>
                        ) : (
                          <ul className="space-y-1.5">
                            {historyLogs.map((l) => (
                              <li key={l.id} className="text-xs text-slate-600">
                                <span className="text-slate-400">{new Date(l.createdAt).toLocaleString()}</span>{" "}
                                — {l.description} <span className="text-slate-400">({l.author?.name ?? "System"})</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
