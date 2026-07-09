"use client";

import { useEffect, useState } from "react";

type Application = {
  id: string;
  status: string;
  student: { fullName: string };
  destination: { university: string; course: string; country: string; intake: string };
};

const STATUSES = [
  "DRAFT", "SUBMITTED", "UNDER_REVIEW", "OFFER_CONDITIONAL", "OFFER_UNCONDITIONAL",
  "DEPOSIT_PAID", "VISA_APPLIED", "VISA_APPROVED", "REJECTED", "WITHDRAWN",
];

export default function ApplicationsPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/applications");
    const data = await res.json();
    setApplications(data.applications ?? []);
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

  return (
    <div>
      <h1 className="text-2xl font-semibold">Applications</h1>
      <p className="mt-1 text-sm text-slate-500">{applications.length} applications in flight</p>

      {loading ? (
        <p className="mt-8 text-sm text-slate-500">Loading…</p>
      ) : (
        <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-left text-slate-500">
              <tr>
                <th className="px-4 py-3">Student</th>
                <th className="px-4 py-3">Destination</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {applications.map((a) => (
                <tr key={a.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
