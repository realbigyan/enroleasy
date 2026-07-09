"use client";

import { useEffect, useState } from "react";
import { Plus } from "lucide-react";

type LogEntry = {
  id: string;
  type: string;
  description: string;
  createdAt: string;
  author: { name: string } | null;
};

export function ActivityTimeline({ studentId }: { studentId: string }) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ type: "note", description: "" });

  async function load() {
    setLoading(true);
    const res = await fetch(`/api/activity-logs?studentId=${studentId}`);
    const data = await res.json();
    setLogs(data.logs ?? []);
    setLoading(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch on mount
    load();
  }, [studentId]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    await fetch("/api/activity-logs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentId, ...form }),
    });
    setForm({ type: "note", description: "" });
    setShowForm(false);
    load();
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Activity Timeline</h2>
        <button onClick={() => setShowForm((v) => !v)} className="flex items-center gap-1 text-xs font-medium text-indigo-600">
          <Plus className="h-3.5 w-3.5" /> Log activity
        </button>
      </div>
      {showForm && (
        <form onSubmit={add} className="mt-3 flex gap-2">
          <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}
            className="rounded-md border border-slate-300 px-2 py-2 text-sm">
            <option value="call">Call</option>
            <option value="email">Email</option>
            <option value="meeting">Meeting</option>
            <option value="note">Note</option>
          </select>
          <input required placeholder="What happened?" value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm" />
          <button type="submit" className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">
            Log
          </button>
        </form>
      )}
      {loading ? (
        <p className="mt-3 text-sm text-slate-500">Loading…</p>
      ) : logs.length === 0 ? (
        <p className="mt-3 text-sm text-slate-500">No activity logged yet.</p>
      ) : (
        <ul className="mt-3 space-y-2 text-sm">
          {logs.map((l) => (
            <li key={l.id} className="border-t border-slate-100 pt-2 first:border-0 first:pt-0">
              <p>
                <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs uppercase text-slate-500">{l.type}</span>{" "}
                {l.description}
              </p>
              <p className="text-xs text-slate-400">{l.author?.name ?? "System"} · {new Date(l.createdAt).toLocaleString()}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
