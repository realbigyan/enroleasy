"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";

type Student = {
  id: string;
  countryOfBirth: string | null;
  currentCountry: string | null;
  passportNo: string | null;
  passportExpiry: string | null;
  tags: string[];
  archivedAt: string | null;
};

type LanguageStatus = "IELTS" | "PTE" | "DUOLINGO" | "MOI" | "NONE";

type AcademicStudent = {
  id: string;
  academicGpaPercent: number | null;
  gapYears: number | null;
  englishTestType: LanguageStatus | null;
  englishScore: number | null;
};

type EducationRecord = {
  id: string;
  institution: string;
  qualification: string;
  fieldOfStudy: string | null;
  yearCompleted: number | null;
};

type EmergencyContact = {
  id: string;
  kind: "PRIMARY" | "SECONDARY";
  name: string;
  relation: string | null;
  phone: string | null;
  email: string | null;
};

type ExamBooking = {
  id: string;
  testType: "IELTS" | "PTE" | "DUOLINGO";
  examDate: string;
  center: string | null;
  status: string;
  resultScore: number | null;
};

export function TravelDetails({ student }: { student: Student }) {
  const router = useRouter();
  const [form, setForm] = useState({
    countryOfBirth: student.countryOfBirth ?? "",
    currentCountry: student.currentCountry ?? "",
    passportNo: student.passportNo ?? "",
    passportExpiry: student.passportExpiry ? student.passportExpiry.slice(0, 10) : "",
  });
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    await fetch(`/api/students/${student.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        passportExpiry: form.passportExpiry ? new Date(form.passportExpiry).toISOString() : null,
      }),
    });
    setSaving(false);
    router.refresh();
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <h2 className="font-semibold">Personal & Travel Details</h2>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div>
          <label className="block text-xs font-medium text-slate-500">Country of birth</label>
          <input value={form.countryOfBirth} onChange={(e) => setForm({ ...form, countryOfBirth: e.target.value })}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500">Current country</label>
          <input value={form.currentCountry} onChange={(e) => setForm({ ...form, currentCountry: e.target.value })}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500">Passport number</label>
          <input value={form.passportNo} onChange={(e) => setForm({ ...form, passportNo: e.target.value })}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500">Passport expiry</label>
          <input type="date" value={form.passportExpiry} onChange={(e) => setForm({ ...form, passportExpiry: e.target.value })}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
        </div>
      </div>
      <button onClick={save} disabled={saving} className="mt-3 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50">
        {saving ? "Saving…" : "Save details"}
      </button>
    </div>
  );
}

export function AcademicProfilePanel({ student }: { student: AcademicStudent }) {
  const router = useRouter();
  const LANGUAGE_OPTIONS: LanguageStatus[] = ["IELTS", "PTE", "DUOLINGO", "MOI", "NONE"];
  const [form, setForm] = useState({
    academicGpaPercent: student.academicGpaPercent != null ? String(student.academicGpaPercent) : "",
    gapYears: student.gapYears != null ? String(student.gapYears) : "",
    englishTestType: (student.englishTestType ?? "NONE") as LanguageStatus,
    englishScore: student.englishScore != null ? String(student.englishScore) : "",
  });
  const [saving, setSaving] = useState(false);
  const needsScore = form.englishTestType !== "NONE" && form.englishTestType !== "MOI";

  async function save() {
    setSaving(true);
    await fetch(`/api/students/${student.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        academicGpaPercent: form.academicGpaPercent ? Number(form.academicGpaPercent) : null,
        gapYears: form.gapYears ? Number(form.gapYears) : null,
        englishTestType: form.englishTestType,
        englishScore: needsScore && form.englishScore ? Number(form.englishScore) : null,
      }),
    });
    setSaving(false);
    router.refresh();
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <h2 className="font-semibold">Academic Profile</h2>
      <p className="mt-1 text-xs text-slate-500">Used to match this student against course entry requirements.</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div>
          <label className="block text-xs font-medium text-slate-500">GPA / Percentage</label>
          <input type="number" step="0.01" value={form.academicGpaPercent}
            onChange={(e) => setForm({ ...form, academicGpaPercent: e.target.value })}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500">Gap (years)</label>
          <input type="number" value={form.gapYears}
            onChange={(e) => setForm({ ...form, gapYears: e.target.value })}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500">English test</label>
          <select value={form.englishTestType}
            onChange={(e) => setForm({ ...form, englishTestType: e.target.value as LanguageStatus })}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm">
            {LANGUAGE_OPTIONS.map((t) => (
              <option key={t} value={t}>{t === "NONE" ? "No test taken" : t}</option>
            ))}
          </select>
        </div>
        {needsScore && (
          <div>
            <label className="block text-xs font-medium text-slate-500">Score</label>
            <input type="number" step="0.1" value={form.englishScore}
              onChange={(e) => setForm({ ...form, englishScore: e.target.value })}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
          </div>
        )}
      </div>
      <button onClick={save} disabled={saving} className="mt-3 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50">
        {saving ? "Saving…" : "Save academic profile"}
      </button>
    </div>
  );
}

export function EducationPanel({ studentId, records }: { studentId: string; records: EducationRecord[] }) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ institution: "", qualification: "", fieldOfStudy: "", yearCompleted: "" });

  async function add(e: React.FormEvent) {
    e.preventDefault();
    await fetch(`/api/students/${studentId}/education`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, yearCompleted: form.yearCompleted ? Number(form.yearCompleted) : null }),
    });
    setForm({ institution: "", qualification: "", fieldOfStudy: "", yearCompleted: "" });
    setShowForm(false);
    router.refresh();
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Education</h2>
        <button onClick={() => setShowForm((v) => !v)} className="flex items-center gap-1 text-xs font-medium text-indigo-600">
          <Plus className="h-3.5 w-3.5" /> Add qualification
        </button>
      </div>
      {showForm && (
        <form onSubmit={add} className="mt-3 grid gap-2 sm:grid-cols-2">
          <input required placeholder="Institution" value={form.institution} onChange={(e) => setForm({ ...form, institution: e.target.value })}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
          <input required placeholder="Qualification (e.g. Bachelor's)" value={form.qualification} onChange={(e) => setForm({ ...form, qualification: e.target.value })}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
          <input placeholder="Field of study" value={form.fieldOfStudy} onChange={(e) => setForm({ ...form, fieldOfStudy: e.target.value })}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
          <input placeholder="Year completed" value={form.yearCompleted} onChange={(e) => setForm({ ...form, yearCompleted: e.target.value })}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
          <button type="submit" className="sm:col-span-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">
            Add
          </button>
        </form>
      )}
      {records.length === 0 ? (
        <p className="mt-2 text-sm text-slate-500">No qualifications on file.</p>
      ) : (
        <ul className="mt-3 space-y-2 text-sm">
          {records.map((r) => (
            <li key={r.id} className="border-t border-slate-100 pt-2 first:border-0 first:pt-0">
              <p className="font-medium">{r.qualification} — {r.institution}</p>
              <p className="text-slate-500">{r.fieldOfStudy ?? ""} {r.yearCompleted ? `· ${r.yearCompleted}` : ""}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function EmergencyContactsPanel({ studentId, contacts }: { studentId: string; contacts: EmergencyContact[] }) {
  const router = useRouter();
  const primary = contacts.find((c) => c.kind === "PRIMARY");
  const secondary = contacts.find((c) => c.kind === "SECONDARY");

  async function save(kind: "PRIMARY" | "SECONDARY", form: { name: string; relation: string; phone: string; email: string }) {
    await fetch(`/api/students/${studentId}/emergency-contacts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind, ...form }),
    });
    router.refresh();
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <h2 className="font-semibold">Emergency Contacts</h2>
      <div className="mt-3 grid gap-4 sm:grid-cols-2">
        <ContactSlot label="Primary" contact={primary} onSave={(form) => save("PRIMARY", form)} />
        <ContactSlot label="Secondary" contact={secondary} onSave={(form) => save("SECONDARY", form)} />
      </div>
    </div>
  );
}

function ContactSlot({
  label,
  contact,
  onSave,
}: {
  label: string;
  contact?: EmergencyContact;
  onSave: (form: { name: string; relation: string; phone: string; email: string }) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    name: contact?.name ?? "",
    relation: contact?.relation ?? "",
    phone: contact?.phone ?? "",
    email: contact?.email ?? "",
  });

  if (!editing && !contact) {
    return (
      <div className="rounded-lg border border-slate-100 p-3 text-sm">
        <p className="text-xs font-medium uppercase text-slate-400">{label}</p>
        <p className="mt-1 text-slate-400">Not set</p>
        <button onClick={() => setEditing(true)} className="mt-1 text-xs font-medium text-indigo-600">Add</button>
      </div>
    );
  }

  if (editing) {
    return (
      <div className="rounded-lg border border-slate-100 p-3 text-sm">
        <p className="text-xs font-medium uppercase text-slate-400">{label}</p>
        <div className="mt-2 space-y-2">
          <input placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full rounded border border-slate-300 px-2 py-1 text-sm" />
          <input placeholder="Relation" value={form.relation} onChange={(e) => setForm({ ...form, relation: e.target.value })}
            className="w-full rounded border border-slate-300 px-2 py-1 text-sm" />
          <input placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
            className="w-full rounded border border-slate-300 px-2 py-1 text-sm" />
          <button
            onClick={() => {
              onSave(form);
              setEditing(false);
            }}
            className="rounded bg-indigo-600 px-3 py-1 text-xs font-medium text-white"
          >
            Save
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-slate-100 p-3 text-sm">
      <p className="text-xs font-medium uppercase text-slate-400">{label}</p>
      <p className="mt-1 font-medium">{contact?.name}</p>
      <p className="text-slate-500">{contact?.relation} · {contact?.phone}</p>
      <button onClick={() => setEditing(true)} className="mt-1 text-xs font-medium text-indigo-600">Edit</button>
    </div>
  );
}

export function ExamBookingsPanel({ studentId, bookings }: { studentId: string; bookings: ExamBooking[] }) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ testType: "IELTS", examDate: "", center: "" });

  async function add(e: React.FormEvent) {
    e.preventDefault();
    await fetch(`/api/students/${studentId}/exam-bookings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, examDate: new Date(form.examDate).toISOString() }),
    });
    setForm({ testType: "IELTS", examDate: "", center: "" });
    setShowForm(false);
    router.refresh();
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Exam Bookings</h2>
        <button onClick={() => setShowForm((v) => !v)} className="flex items-center gap-1 text-xs font-medium text-indigo-600">
          <Plus className="h-3.5 w-3.5" /> Add booking
        </button>
      </div>
      {showForm && (
        <form onSubmit={add} className="mt-3 grid gap-2 sm:grid-cols-3">
          <select value={form.testType} onChange={(e) => setForm({ ...form, testType: e.target.value })}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm">
            <option value="IELTS">IELTS</option>
            <option value="PTE">PTE</option>
            <option value="DUOLINGO">Duolingo</option>
          </select>
          <input required type="date" value={form.examDate} onChange={(e) => setForm({ ...form, examDate: e.target.value })}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
          <input placeholder="Test center" value={form.center} onChange={(e) => setForm({ ...form, center: e.target.value })}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
          <button type="submit" className="sm:col-span-3 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">
            Add booking
          </button>
        </form>
      )}
      {bookings.length === 0 ? (
        <p className="mt-2 text-sm text-slate-500">No exam bookings on file.</p>
      ) : (
        <ul className="mt-3 space-y-2 text-sm">
          {bookings.map((b) => (
            <li key={b.id} className="border-t border-slate-100 pt-2 first:border-0 first:pt-0">
              <p className="font-medium">{b.testType} — {new Date(b.examDate).toLocaleDateString()}</p>
              <p className="text-slate-500">{b.center ?? "Center TBD"} · {b.status}{b.resultScore ? ` · Result: ${b.resultScore}` : ""}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function ArchiveButton({ studentId, archived }: { studentId: string; archived: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function toggle() {
    if (!confirm(archived ? "Restore this student?" : "Archive this student?")) return;
    setLoading(true);
    await fetch(`/api/students/${studentId}/archive`, { method: "POST" });
    setLoading(false);
    router.refresh();
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={`rounded-md px-3 py-1.5 text-xs font-medium ${
        archived ? "bg-green-100 text-green-700 hover:bg-green-200" : "bg-red-50 text-red-600 hover:bg-red-100"
      }`}
    >
      {archived ? "Restore" : "Archive"}
    </button>
  );
}
