"use client";

import { useEffect, useState } from "react";
import { Save } from "lucide-react";

type FieldWithValue = {
  id: string;
  name: string;
  fieldType: "TEXT" | "NUMBER" | "DATE" | "SELECT";
  options: string[];
  value: string | null;
};

export function CustomFieldsPanel({
  entityType,
  entityId,
}: {
  entityType: "LEAD" | "STUDENT" | "APPLICATION";
  entityId: string;
}) {
  const [fields, setFields] = useState<FieldWithValue[]>([]);
  const [loading, setLoading] = useState(true);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    const res = await fetch(`/api/custom-fields/values?entityType=${entityType}&entityId=${entityId}`);
    const data = await res.json();
    setFields(data.fields ?? []);
    setLoading(false);
    setDirty(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch on mount
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityId]);

  function setValue(id: string, value: string) {
    setFields((prev) => prev.map((f) => (f.id === id ? { ...f, value } : f)));
    setDirty(true);
  }

  async function save() {
    setSaving(true);
    await fetch("/api/custom-fields/values", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        entityType,
        entityId,
        values: fields.map((f) => ({ definitionId: f.id, value: f.value || null })),
      }),
    });
    setSaving(false);
    setDirty(false);
  }

  if (loading) return null;
  if (fields.length === 0) return null;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 print:hidden">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Custom fields</h2>
        {dirty && (
          <button
            onClick={save}
            disabled={saving}
            className="flex items-center gap-2 rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            <Save className="h-3.5 w-3.5" /> {saving ? "Saving…" : "Save"}
          </button>
        )}
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {fields.map((f) => (
          <label key={f.id} className="block text-sm">
            <span className="text-xs font-medium text-slate-500">{f.name}</span>
            {f.fieldType === "SELECT" ? (
              <select
                value={f.value ?? ""}
                onChange={(e) => setValue(f.id, e.target.value)}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="">—</option>
                {f.options.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type={f.fieldType === "NUMBER" ? "number" : f.fieldType === "DATE" ? "date" : "text"}
                value={f.value ?? ""}
                onChange={(e) => setValue(f.id, e.target.value)}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            )}
          </label>
        ))}
      </div>
    </div>
  );
}
