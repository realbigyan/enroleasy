"use client";

import { useEffect, useState } from "react";
import { Plus } from "lucide-react";

type Task = {
  id: string;
  title: string;
  status: string;
  dueAt: string | null;
  lead: { fullName: string } | null;
  student: { fullName: string } | null;
};

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");

  async function load() {
    setLoading(true);
    const res = await fetch("/api/tasks");
    const data = await res.json();
    setTasks(data.tasks ?? []);
    setLoading(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch on mount
    load();
  }, []);

  async function createTask(e: React.FormEvent) {
    e.preventDefault();
    await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });
    setTitle("");
    setShowForm(false);
    load();
  }

  async function toggleDone(id: string, status: string) {
    const next = status === "DONE" ? "OPEN" : "DONE";
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, status: next } : t)));
    await fetch(`/api/tasks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Follow-up tasks</h1>
          <p className="mt-1 text-sm text-slate-500">{tasks.length} tasks</p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          <Plus className="h-4 w-4" /> New task
        </button>
      </div>

      {showForm && (
        <form onSubmit={createTask} className="mt-4 flex gap-3 rounded-xl border border-slate-200 bg-white p-5">
          <input required placeholder="Task title" value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm" />
          <button type="submit" className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">
            Add
          </button>
        </form>
      )}

      {loading ? (
        <p className="mt-8 text-sm text-slate-500">Loading…</p>
      ) : (
        <ul className="mt-6 divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
          {tasks.map((t) => (
            <li key={t.id} className="flex items-center gap-3 px-4 py-3">
              <input
                type="checkbox"
                checked={t.status === "DONE"}
                onChange={() => toggleDone(t.id, t.status)}
                className="h-4 w-4"
              />
              <div className="flex-1">
                <p className={t.status === "DONE" ? "text-sm text-slate-400 line-through" : "text-sm"}>
                  {t.title}
                </p>
                <p className="text-xs text-slate-400">
                  {t.lead?.fullName ?? t.student?.fullName ?? "Unlinked"}
                  {t.dueAt ? ` · due ${new Date(t.dueAt).toLocaleDateString()}` : ""}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
