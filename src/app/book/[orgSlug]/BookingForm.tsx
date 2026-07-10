"use client";

import { useEffect, useState } from "react";

const EMPTY_FORM = { fullName: "", email: "", phone: "", interestedCountry: "", targetScore: "" };

export function BookingForm({ orgSlug, kiosk = false }: { orgSlug: string; kiosk?: boolean }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [status, setStatus] = useState<"idle" | "submitting" | "done" | "error">("idle");

  // Kiosk mode resets itself a few seconds after a successful submission so
  // the tablet/device is immediately ready for the next walk-in visitor,
  // without anyone needing to touch it in between.
  useEffect(() => {
    if (!kiosk || status !== "done") return;
    const timer = setTimeout(() => {
      setForm(EMPTY_FORM);
      setStatus("idle");
    }, 6000);
    return () => clearTimeout(timer);
  }, [kiosk, status]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("submitting");
    const res = await fetch("/api/public/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orgSlug, ...form, source: kiosk ? "WALK_IN" : "WEBSITE" }),
    });
    setStatus(res.ok ? "done" : "error");
  }

  const inputClass = kiosk
    ? "w-full rounded-lg border border-slate-300 px-4 py-4 text-lg"
    : "w-full rounded-md border border-slate-300 px-3 py-2 text-sm";

  if (status === "done") {
    return (
      <div className={kiosk ? "mt-8 rounded-lg bg-green-50 p-8 text-center" : "mt-6 rounded-md bg-green-50 p-4"}>
        <p className={kiosk ? "text-xl font-medium text-green-700" : "text-sm text-green-700"}>
          Thanks! We&apos;ve received your details and will be in touch shortly.
        </p>
        {kiosk && <p className="mt-2 text-sm text-green-600">Ready for the next person in a moment…</p>}
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className={kiosk ? "mt-8 space-y-4" : "mt-6 space-y-3"}>
      <input required placeholder="Full name" value={form.fullName}
        onChange={(e) => setForm({ ...form, fullName: e.target.value })}
        className={inputClass} />
      <input type="email" placeholder="Email" value={form.email}
        onChange={(e) => setForm({ ...form, email: e.target.value })}
        className={inputClass} />
      <input placeholder="Phone" value={form.phone}
        onChange={(e) => setForm({ ...form, phone: e.target.value })}
        className={inputClass} />
      <input placeholder="Country you're interested in" value={form.interestedCountry}
        onChange={(e) => setForm({ ...form, interestedCountry: e.target.value })}
        className={inputClass} />
      <input placeholder="Target score (e.g. Band 7.0)" value={form.targetScore}
        onChange={(e) => setForm({ ...form, targetScore: e.target.value })}
        className={inputClass} />
      {status === "error" && <p className="text-sm text-red-600">Something went wrong — please try again.</p>}
      <button
        type="submit"
        disabled={status === "submitting"}
        className={
          kiosk
            ? "w-full rounded-lg bg-indigo-600 px-4 py-4 text-lg font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            : "w-full rounded-md bg-indigo-600 px-4 py-2 font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        }
      >
        {status === "submitting" ? "Submitting…" : kiosk ? "Submit" : "Book my free consultation"}
      </button>
    </form>
  );
}
