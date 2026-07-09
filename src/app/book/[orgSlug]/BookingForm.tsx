"use client";

import { useState } from "react";

export function BookingForm({ orgSlug }: { orgSlug: string }) {
  const [form, setForm] = useState({ fullName: "", email: "", phone: "", interestedCountry: "", targetScore: "" });
  const [status, setStatus] = useState<"idle" | "submitting" | "done" | "error">("idle");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("submitting");
    const res = await fetch("/api/public/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orgSlug, ...form }),
    });
    setStatus(res.ok ? "done" : "error");
  }

  if (status === "done") {
    return (
      <p className="mt-6 rounded-md bg-green-50 p-4 text-sm text-green-700">
        Thanks! We&apos;ve received your details and will be in touch shortly.
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-3">
      <input required placeholder="Full name" value={form.fullName}
        onChange={(e) => setForm({ ...form, fullName: e.target.value })}
        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
      <input type="email" placeholder="Email" value={form.email}
        onChange={(e) => setForm({ ...form, email: e.target.value })}
        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
      <input placeholder="Phone" value={form.phone}
        onChange={(e) => setForm({ ...form, phone: e.target.value })}
        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
      <input placeholder="Country you're interested in" value={form.interestedCountry}
        onChange={(e) => setForm({ ...form, interestedCountry: e.target.value })}
        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
      <input placeholder="Target score (e.g. Band 7.0)" value={form.targetScore}
        onChange={(e) => setForm({ ...form, targetScore: e.target.value })}
        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
      {status === "error" && <p className="text-sm text-red-600">Something went wrong — please try again.</p>}
      <button
        type="submit"
        disabled={status === "submitting"}
        className="w-full rounded-md bg-indigo-600 px-4 py-2 font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
      >
        {status === "submitting" ? "Submitting…" : "Book my free consultation"}
      </button>
    </form>
  );
}
