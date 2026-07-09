"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";

type Application = {
  id: string;
  status: string;
  destination: { university: string; course: string; country: string; intake: string };
  assignedDocOfficer: { id: string; name: string } | null;
};

type Destination = {
  id: string;
  university: string;
  course: string;
  country: string;
  intake: string;
};

type StaffMember = {
  id: string;
  name: string;
  role: string;
  isActive: boolean;
};

export function ApplicationsPanel({
  studentId,
  applications,
  canCreate,
}: {
  studentId: string;
  applications: Application[];
  canCreate: boolean;
}) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [docOfficers, setDocOfficers] = useState<StaffMember[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [destinationId, setDestinationId] = useState("");
  const [assignedDocOfficerId, setAssignedDocOfficerId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function openForm() {
    setShowForm(true);
    setError(null);
    if (destinations.length === 0) {
      setLoadingOptions(true);
      const [destRes, teamRes] = await Promise.all([fetch("/api/destinations"), fetch("/api/team")]);
      const destData = await destRes.json();
      const teamData = await teamRes.json();
      setDestinations(destData.destinations ?? []);
      setDocOfficers(
        (teamData.staff ?? []).filter((s: StaffMember) => s.role === "DOCUMENTATION_OFFICER" && s.isActive)
      );
      setLoadingOptions(false);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!destinationId) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId, destinationId, assignedDocOfficerId: assignedDocOfficerId || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not create application");
      setShowForm(false);
      setDestinationId("");
      setAssignedDocOfficerId("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create application");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Applications</h2>
        {canCreate && !showForm && (
          <button
            onClick={openForm}
            className="print:hidden flex items-center gap-1 text-xs font-medium text-indigo-600 hover:underline"
          >
            <Plus className="h-3.5 w-3.5" /> Add application
          </button>
        )}
      </div>

      {showForm && (
        <div className="print:hidden mt-3 rounded-lg border border-indigo-200 bg-indigo-50 p-3">
          {loadingOptions ? (
            <p className="text-sm text-slate-500">Loading options…</p>
          ) : destinations.length === 0 ? (
            <p className="text-sm text-slate-500">
              No destinations/courses set up yet. Add one under Institutions first.
            </p>
          ) : (
            <form onSubmit={submit} className="space-y-2">
              <select
                required
                value={destinationId}
                onChange={(e) => setDestinationId(e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="">Select a destination / course…</option>
                {destinations.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.university} — {d.course} ({d.country}, {d.intake})
                  </option>
                ))}
              </select>
              {docOfficers.length > 0 ? (
                <select
                  value={assignedDocOfficerId}
                  onChange={(e) => setAssignedDocOfficerId(e.target.value)}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                >
                  <option value="">Assign to Documentation Officer (optional)…</option>
                  {docOfficers.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name}
                    </option>
                  ))}
                </select>
              ) : (
                <p className="text-xs text-slate-500">
                  No Documentation Officers registered yet — everyone with that role will be notified once you add one.
                </p>
              )}
              {error && <p className="text-xs text-red-600">{error}</p>}
              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  disabled={submitting || !destinationId}
                  className="rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  {submitting ? "Creating…" : "Create application"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  disabled={submitting}
                  className="flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-700"
                >
                  <X className="h-3.5 w-3.5" /> Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {applications.length === 0 ? (
        <p className="mt-2 text-sm text-slate-500">No applications yet.</p>
      ) : (
        <ul className="mt-3 space-y-3 text-sm">
          {applications.map((a) => (
            <li key={a.id} className="border-t border-slate-100 pt-3 first:border-0 first:pt-0">
              <p className="font-medium">{a.destination.university} — {a.destination.course}</p>
              <p className="text-slate-500">{a.destination.country} · {a.destination.intake}</p>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <span className="inline-block rounded bg-slate-100 px-2 py-0.5 text-xs">{a.status.replace(/_/g, " ")}</span>
                <span className="inline-block rounded bg-indigo-50 px-2 py-0.5 text-xs text-indigo-700">
                  {a.assignedDocOfficer ? `Assigned: ${a.assignedDocOfficer.name}` : "Unassigned"}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
