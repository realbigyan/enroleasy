"use client";

import { useEffect, useState } from "react";
import { ArrowUp, ArrowDown, Eye, EyeOff, Plus, Trash2, Save } from "lucide-react";

type StageConfig = {
  id: string;
  stage: string;
  label: string;
  order: number;
  isActive: boolean;
};

type FieldDefinition = {
  id: string;
  entityType: "LEAD" | "STUDENT" | "APPLICATION";
  name: string;
  fieldType: "TEXT" | "NUMBER" | "DATE" | "SELECT";
  options: string[];
  order: number;
  isActive: boolean;
};

const ENTITY_TABS = [
  { value: "LEAD", label: "Leads" },
  { value: "STUDENT", label: "Students" },
  { value: "APPLICATION", label: "Applications" },
] as const;

export default function CustomizePage() {
  const [stages, setStages] = useState<StageConfig[]>([]);
  const [stagesLoading, setStagesLoading] = useState(true);
  const [stagesDirty, setStagesDirty] = useState(false);
  const [savingStages, setSavingStages] = useState(false);

  const [entityType, setEntityType] = useState<(typeof ENTITY_TABS)[number]["value"]>("LEAD");
  const [fields, setFields] = useState<FieldDefinition[]>([]);
  const [fieldsLoading, setFieldsLoading] = useState(true);
  const [newField, setNewField] = useState({ name: "", fieldType: "TEXT" as FieldDefinition["fieldType"], options: "" });
  const [creatingField, setCreatingField] = useState(false);

  async function loadStages() {
    setStagesLoading(true);
    const res = await fetch("/api/pipeline-stages");
    const data = await res.json();
    setStages((data.stages ?? []).sort((a: StageConfig, b: StageConfig) => a.order - b.order));
    setStagesLoading(false);
    setStagesDirty(false);
  }

  async function loadFields(type: string) {
    setFieldsLoading(true);
    const res = await fetch(`/api/custom-fields?entityType=${type}`);
    const data = await res.json();
    setFields(data.definitions ?? []);
    setFieldsLoading(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch on mount
    loadStages();
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- refetch when tab changes
    loadFields(entityType);
  }, [entityType]);

  function moveStage(index: number, dir: -1 | 1) {
    setStages((prev) => {
      const next = [...prev];
      const target = index + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next.map((s, i) => ({ ...s, order: i }));
    });
    setStagesDirty(true);
  }

  function renameStage(id: string, label: string) {
    setStages((prev) => prev.map((s) => (s.id === id ? { ...s, label } : s)));
    setStagesDirty(true);
  }

  function toggleStageActive(id: string) {
    setStages((prev) => prev.map((s) => (s.id === id ? { ...s, isActive: !s.isActive } : s)));
    setStagesDirty(true);
  }

  async function saveStages() {
    setSavingStages(true);
    const res = await fetch("/api/pipeline-stages", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stages: stages.map(({ id, label, order, isActive }) => ({ id, label, order, isActive })) }),
    });
    setSavingStages(false);
    if (res.ok) await loadStages();
  }

  async function createField(e: React.FormEvent) {
    e.preventDefault();
    if (!newField.name.trim()) return;
    setCreatingField(true);
    await fetch("/api/custom-fields", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        entityType,
        name: newField.name.trim(),
        fieldType: newField.fieldType,
        options:
          newField.fieldType === "SELECT"
            ? newField.options.split(",").map((o) => o.trim()).filter(Boolean)
            : [],
      }),
    });
    setNewField({ name: "", fieldType: "TEXT", options: "" });
    setCreatingField(false);
    await loadFields(entityType);
  }

  async function toggleFieldActive(field: FieldDefinition) {
    await fetch(`/api/custom-fields/${field.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !field.isActive }),
    });
    await loadFields(entityType);
  }

  async function deleteField(id: string) {
    if (!confirm("Delete this custom field? Any values already recorded for it will be lost.")) return;
    await fetch(`/api/custom-fields/${id}`, { method: "DELETE" });
    await loadFields(entityType);
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold">Customize</h1>
      <p className="mt-1 text-sm text-slate-500">
        Control your leads pipeline columns and add extra fields to leads, students, and applications.
      </p>

      <div className="mt-6 rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Leads pipeline stages</h2>
          {stagesDirty && (
            <button
              onClick={saveStages}
              disabled={savingStages}
              className="flex items-center gap-2 rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              <Save className="h-3.5 w-3.5" /> {savingStages ? "Saving…" : "Save changes"}
            </button>
          )}
        </div>
        <p className="mt-1 text-xs text-slate-500">
          Reorder, rename, or hide Kanban columns. Hidden stages keep any leads already on them — leads just
          won&apos;t show a hidden column, and the stage remains a valid option to switch back to.
        </p>

        {stagesLoading ? (
          <p className="mt-4 text-sm text-slate-500">Loading…</p>
        ) : (
          <ul className="mt-4 divide-y divide-slate-100">
            {stages.map((s, i) => (
              <li key={s.id} className="flex items-center gap-3 py-2">
                <div className="flex flex-col">
                  <button
                    onClick={() => moveStage(i, -1)}
                    disabled={i === 0}
                    className="text-slate-400 hover:text-slate-700 disabled:opacity-25"
                  >
                    <ArrowUp className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => moveStage(i, 1)}
                    disabled={i === stages.length - 1}
                    className="text-slate-400 hover:text-slate-700 disabled:opacity-25"
                  >
                    <ArrowDown className="h-3.5 w-3.5" />
                  </button>
                </div>
                <input
                  value={s.label}
                  onChange={(e) => renameStage(s.id, e.target.value)}
                  className="flex-1 rounded-md border border-slate-200 px-2 py-1.5 text-sm"
                />
                <span className="w-40 truncate text-xs text-slate-400">{s.stage}</span>
                <button
                  onClick={() => toggleStageActive(s.id)}
                  className={`flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium ${
                    s.isActive ? "border-slate-200 text-slate-600 hover:bg-slate-50" : "border-slate-200 bg-slate-100 text-slate-400"
                  }`}
                >
                  {s.isActive ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                  {s.isActive ? "Visible" : "Hidden"}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-6 rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="font-semibold">Custom fields</h2>
        <p className="mt-1 text-xs text-slate-500">
          Track extra data your org needs on leads, students, or applications without waiting on a code change.
        </p>

        <div className="mt-4 flex gap-1 border-b border-slate-200">
          {ENTITY_TABS.map((t) => (
            <button
              key={t.value}
              onClick={() => setEntityType(t.value)}
              className={`px-3 py-2 text-sm font-medium ${
                entityType === t.value
                  ? "border-b-2 border-indigo-600 text-indigo-700"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {fieldsLoading ? (
          <p className="mt-4 text-sm text-slate-500">Loading…</p>
        ) : (
          <ul className="mt-4 divide-y divide-slate-100">
            {fields.length === 0 && <li className="py-3 text-sm text-slate-500">No custom fields yet.</li>}
            {fields.map((f) => (
              <li key={f.id} className="flex items-center gap-3 py-2">
                <div className="flex-1">
                  <p className="text-sm font-medium">{f.name}</p>
                  <p className="text-xs text-slate-400">
                    {f.fieldType}
                    {f.fieldType === "SELECT" && f.options.length > 0 ? ` · ${f.options.join(", ")}` : ""}
                  </p>
                </div>
                <button
                  onClick={() => toggleFieldActive(f)}
                  className={`flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium ${
                    f.isActive ? "border-slate-200 text-slate-600 hover:bg-slate-50" : "border-slate-200 bg-slate-100 text-slate-400"
                  }`}
                >
                  {f.isActive ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                  {f.isActive ? "Visible" : "Hidden"}
                </button>
                <button onClick={() => deleteField(f.id)} className="text-slate-400 hover:text-red-600">
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}

        <form onSubmit={createField} className="mt-4 grid gap-2 rounded-lg bg-slate-50 p-3 sm:grid-cols-4">
          <input
            required
            placeholder="Field name"
            value={newField.name}
            onChange={(e) => setNewField({ ...newField, name: e.target.value })}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm sm:col-span-2"
          />
          <select
            value={newField.fieldType}
            onChange={(e) => setNewField({ ...newField, fieldType: e.target.value as FieldDefinition["fieldType"] })}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="TEXT">Text</option>
            <option value="NUMBER">Number</option>
            <option value="DATE">Date</option>
            <option value="SELECT">Select (dropdown)</option>
          </select>
          {newField.fieldType === "SELECT" ? (
            <input
              placeholder="Options, comma-separated"
              value={newField.options}
              onChange={(e) => setNewField({ ...newField, options: e.target.value })}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          ) : (
            <div />
          )}
          <button
            type="submit"
            disabled={creatingField}
            className="flex items-center justify-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 sm:col-span-4"
          >
            <Plus className="h-4 w-4" /> Add custom field
          </button>
        </form>
      </div>
    </div>
  );
}
