"use client";

import { useEffect, useState } from "react";

const PLANS = ["STARTER", "GROWTH", "SCALE"] as const;
const STATUSES = ["PENDING_APPROVAL", "TRIALING", "ACTIVE", "PAST_DUE", "CANCELED"] as const;

type Plan = (typeof PLANS)[number];
type Status = (typeof STATUSES)[number];

type Organization = {
  id: string;
  name: string;
  slug: string;
  country: string | null;
  createdAt: string;
  subscription: {
    plan: Plan;
    status: Status;
    seats: number;
    trialEndsAt: string | null;
  } | null;
  _count: { users: number; students: number };
};

type EditState = { plan: Plan; status: Status; seats: number; trialEndsAt: string };

function toDateInputValue(iso: string | null) {
  return iso ? iso.slice(0, 10) : "";
}

export function SuperadminOrganizationsClient() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [edits, setEdits] = useState<Record<string, EditState>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ id: string; text: string; ok: boolean } | null>(null);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/superadmin/organizations");
    const data = await res.json();
    const orgs: Organization[] = data.organizations ?? [];
    setOrganizations(orgs);
    setEdits(
      Object.fromEntries(
        orgs.map((o) => [
          o.id,
          {
            plan: o.subscription?.plan ?? "STARTER",
            status: o.subscription?.status ?? "PENDING_APPROVAL",
            seats: o.subscription?.seats ?? 5,
            trialEndsAt: toDateInputValue(o.subscription?.trialEndsAt ?? null),
          },
        ])
      )
    );
    setLoading(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch on mount
    load();
  }, []);

  function updateEdit(id: string, patch: Partial<EditState>) {
    setEdits((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  }

  async function approveTrial(id: string) {
    setSavingId(id);
    setMessage(null);
    try {
      const trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
      const res = await fetch(`/api/superadmin/organizations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "TRIALING", trialEndsAt }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage({ id, text: data.error ?? "Could not approve trial", ok: false });
        return;
      }
      setMessage({ id, text: "Trial approved — 14 days starting now.", ok: true });
      load();
    } finally {
      setSavingId(null);
    }
  }

  async function save(id: string) {
    const edit = edits[id];
    setSavingId(id);
    setMessage(null);
    try {
      const res = await fetch(`/api/superadmin/organizations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan: edit.plan,
          status: edit.status,
          seats: edit.seats,
          trialEndsAt: edit.trialEndsAt || null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage({ id, text: data.error ?? "Could not save changes", ok: false });
        return;
      }
      setMessage({ id, text: "Saved.", ok: true });
      load();
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold">Superadmin — Consultancies</h1>
      <p className="mt-1 text-sm text-slate-500">
        Every registered consultancy, with its plan, seats, and trial status. Changes here take effect immediately.
      </p>

      {loading ? (
        <p className="mt-8 text-sm text-slate-500">Loading…</p>
      ) : (
        <div className="mt-6 space-y-4">
          {organizations.map((org) => {
            const edit = edits[org.id];
            if (!edit) return null;
            return (
              <div key={org.id} className="rounded-xl border border-slate-200 bg-white p-5">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold">{org.name}</p>
                      {org.subscription?.status === "PENDING_APPROVAL" && (
                        <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                          Awaiting approval
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500">
                      {org.slug} · {org.country ?? "No country set"} · joined{" "}
                      {new Date(org.createdAt).toLocaleDateString()}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {org._count.users} staff · {org._count.students} students
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-500">Plan</label>
                    <select
                      value={edit.plan}
                      onChange={(e) => updateEdit(org.id, { plan: e.target.value as Plan })}
                      className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
                    >
                      {PLANS.map((p) => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500">Status</label>
                    <select
                      value={edit.status}
                      onChange={(e) => updateEdit(org.id, { status: e.target.value as Status })}
                      className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500">Seats</label>
                    <input
                      type="number"
                      min={1}
                      value={edit.seats}
                      onChange={(e) => updateEdit(org.id, { seats: Number(e.target.value) })}
                      className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500">Trial ends</label>
                    <input
                      type="date"
                      value={edit.trialEndsAt}
                      onChange={(e) => updateEdit(org.id, { trialEndsAt: e.target.value })}
                      className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
                    />
                  </div>
                </div>

                <div className="mt-4 flex items-center gap-3">
                  <button
                    onClick={() => save(org.id)}
                    disabled={savingId === org.id}
                    className="rounded-md bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {savingId === org.id ? "Saving…" : "Save changes"}
                  </button>
                  {org.subscription?.status === "PENDING_APPROVAL" && (
                    <button
                      onClick={() => approveTrial(org.id)}
                      disabled={savingId === org.id}
                      className="rounded-md bg-green-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
                    >
                      Approve 14-day trial
                    </button>
                  )}
                  {message?.id === org.id && (
                    <span className={`text-sm ${message.ok ? "text-green-600" : "text-red-600"}`}>
                      {message.text}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
