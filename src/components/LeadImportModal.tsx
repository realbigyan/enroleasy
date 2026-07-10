"use client";

import { useState } from "react";
import { X, Upload } from "lucide-react";
import { parseCsv, guessMapping } from "@/lib/csv";

const FIELD_LABELS: { key: string; label: string; required?: boolean }[] = [
  { key: "fullName", label: "Full name", required: true },
  { key: "email", label: "Email" },
  { key: "phone", label: "Phone" },
  { key: "interestedCountry", label: "Interested country" },
  { key: "targetIntake", label: "Target intake" },
  { key: "externalId", label: "External / lead ID (for dedup on re-upload)" },
];

const SOURCES = ["CSV_IMPORT", "META_ADS", "WEBSITE", "REFERRAL", "WALK_IN", "SOCIAL_MEDIA", "EVENT", "PARTNER_AGENT", "OTHER"];

type Summary = { created: number; skippedDuplicates: number; totalRows: number; errors: { row: number; reason: string }[] };

export function LeadImportModal({ onClose, onImported }: { onClose: () => void; onImported: () => void }) {
  const [csvText, setCsvText] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [previewRowCount, setPreviewRowCount] = useState(0);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [source, setSource] = useState("CSV_IMPORT");
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setSummary(null);
    const text = await file.text();
    const { headers: h, rows } = parseCsv(text);
    if (h.length === 0) {
      setError("Couldn't find any columns in that file — is it a valid CSV?");
      return;
    }
    setCsvText(text);
    setFileName(file.name);
    setHeaders(h);
    setPreviewRowCount(rows.length);
    setMapping(guessMapping(h));
  }

  async function submit() {
    if (!csvText) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/leads/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csvText, mapping, defaultSource: source }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Import failed");
        return;
      }
      setSummary(data);
      onImported();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Import leads from CSV</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className="mt-1 text-sm text-slate-500">
          Works with any CSV — including a lead export downloaded directly from Meta Ads Manager.
          This is a one-time bulk upload, not a live feed; for automatic intake, set up the
          webhook or the Meta integration on the Integrations page instead.
        </p>

        {!summary && (
          <>
            <div className="mt-4">
              <label className="flex cursor-pointer items-center justify-center gap-2 rounded-md border-2 border-dashed border-slate-300 px-4 py-6 text-sm text-slate-500 hover:border-indigo-400 hover:text-indigo-600">
                <Upload className="h-4 w-4" />
                {fileName || "Choose a CSV file…"}
                <input type="file" accept=".csv,text/csv" className="hidden" onChange={onFile} />
              </label>
            </div>

            {headers.length > 0 && (
              <>
                <p className="mt-4 text-xs text-slate-500">{previewRowCount} data row(s) detected. Map your columns:</p>
                <div className="mt-2 space-y-2">
                  {FIELD_LABELS.map((f) => (
                    <div key={f.key} className="flex items-center gap-3">
                      <label className="w-56 flex-shrink-0 text-sm">
                        {f.label}{f.required && <span className="text-red-500"> *</span>}
                      </label>
                      <select
                        value={mapping[f.key] ?? ""}
                        onChange={(e) => setMapping({ ...mapping, [f.key]: e.target.value })}
                        className="flex-1 rounded-md border border-slate-300 px-3 py-1.5 text-sm"
                      >
                        <option value="">— don&apos;t import —</option>
                        {headers.map((h) => (
                          <option key={h} value={h}>{h}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>

                <div className="mt-4 flex items-center gap-3">
                  <label className="w-56 flex-shrink-0 text-sm">Tag new leads with source</label>
                  <select
                    value={source}
                    onChange={(e) => setSource(e.target.value)}
                    className="flex-1 rounded-md border border-slate-300 px-3 py-1.5 text-sm"
                  >
                    {SOURCES.map((s) => (
                      <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
                    ))}
                  </select>
                </div>
              </>
            )}

            {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

            <div className="mt-6 flex justify-end gap-2">
              <button onClick={onClose} className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50">
                Cancel
              </button>
              <button
                onClick={submit}
                disabled={!csvText || !mapping.fullName || loading}
                className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {loading ? "Importing…" : "Import leads"}
              </button>
            </div>
          </>
        )}

        {summary && (
          <div className="mt-4">
            <div className="rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-800">
              Created {summary.created} new lead{summary.created === 1 ? "" : "s"} out of {summary.totalRows} row(s).
              {summary.skippedDuplicates > 0 && ` Skipped ${summary.skippedDuplicates} duplicate(s) already in your CRM.`}
            </div>
            {summary.errors.length > 0 && (
              <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                <p className="font-medium">{summary.errors.length} row(s) had a problem:</p>
                <ul className="mt-1 list-disc pl-5">
                  {summary.errors.slice(0, 10).map((e, i) => (
                    <li key={i}>Row {e.row}: {e.reason}</li>
                  ))}
                </ul>
                {summary.errors.length > 10 && <p className="mt-1 text-xs">…and {summary.errors.length - 10} more.</p>}
              </div>
            )}
            <div className="mt-4 flex justify-end">
              <button onClick={onClose} className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
