"use client";

import { useEffect, useState } from "react";
import { FileText, Trash2, Upload, Download, X } from "lucide-react";

type DocType =
  | "PASSPORT" | "TRANSCRIPT" | "VISA" | "OFFER_LETTER" | "CERTIFICATE" | "OTHER"
  | "PERSONAL_ID" | "PERSONAL_ACADEMIC" | "PERSONAL_ENGLISH" | "PERSONAL_CV" | "PERSONAL_WORK_EXPERIENCE"
  | "SPOUSE_ID" | "SPOUSE_ACADEMIC" | "SPOUSE_ENGLISH" | "SPOUSE_CV" | "SPOUSE_WORK_EXPERIENCE" | "SPOUSE_MARRIAGE_CERTIFICATE"
  | "SPONSOR_ID" | "SPONSOR_RELATIONSHIP" | "SPONSOR_PROOF_OF_INCOME"
  | "BANK_LOAN" | "BANK_BALANCE_CERTIFICATE";

type Doc = {
  id: string;
  type: DocType;
  fileName: string;
  url: string;
  createdAt: string;
};

const CATEGORY_GROUPS: { label: string; options: { value: DocType; label: string }[] }[] = [
  {
    label: "Personal",
    options: [
      { value: "PERSONAL_ID", label: "ID" },
      { value: "PERSONAL_ACADEMIC", label: "Academic" },
      { value: "PERSONAL_ENGLISH", label: "English" },
      { value: "PERSONAL_CV", label: "CV" },
      { value: "PERSONAL_WORK_EXPERIENCE", label: "Work Experience" },
    ],
  },
  {
    label: "Spouse",
    options: [
      { value: "SPOUSE_ID", label: "ID" },
      { value: "SPOUSE_ACADEMIC", label: "Academic" },
      { value: "SPOUSE_ENGLISH", label: "English" },
      { value: "SPOUSE_CV", label: "CV" },
      { value: "SPOUSE_WORK_EXPERIENCE", label: "Work Experience" },
      { value: "SPOUSE_MARRIAGE_CERTIFICATE", label: "Marriage Certificate" },
    ],
  },
  {
    label: "Sponsors",
    options: [
      { value: "SPONSOR_ID", label: "ID" },
      { value: "SPONSOR_RELATIONSHIP", label: "Relationship" },
      { value: "SPONSOR_PROOF_OF_INCOME", label: "Proof of Income" },
    ],
  },
  {
    label: "Bank",
    options: [
      { value: "BANK_LOAN", label: "Loan" },
      { value: "BANK_BALANCE_CERTIFICATE", label: "Balance Certificate" },
    ],
  },
  {
    label: "Other",
    options: [{ value: "OTHER", label: "Other" }],
  },
];

const LABELS: Record<DocType, string> = Object.fromEntries(
  CATEGORY_GROUPS.flatMap((g) => g.options.map((o) => [o.value, `${g.label} · ${o.label}`]))
) as Record<DocType, string>;
// Legacy types that predate the category groups above.
LABELS.PASSPORT = "Passport";
LABELS.TRANSCRIPT = "Transcript";
LABELS.VISA = "Visa";
LABELS.OFFER_LETTER = "Offer Letter";
LABELS.CERTIFICATE = "Certificate";
LABELS.OTHER = "Other";

export function DocumentManager({ studentId }: { studentId: string }) {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [downloadingZip, setDownloadingZip] = useState(false);

  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingName, setPendingName] = useState("");
  const [pendingType, setPendingType] = useState<DocType>("PERSONAL_ID");

  async function load() {
    setLoading(true);
    const res = await fetch(`/api/documents?studentId=${studentId}`);
    const data = await res.json();
    setDocs(data.documents ?? []);
    setLoading(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch on mount
    load();
  }, [studentId]);

  function onFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setPendingFile(file);
    setPendingName(file.name);
    setPendingType("PERSONAL_ID");
  }

  function cancelPending() {
    setPendingFile(null);
    setPendingName("");
  }

  async function confirmUpload() {
    if (!pendingFile) return;
    setUploading(true);
    try {
      const signRes = await fetch("/api/documents/sign", { method: "POST" });
      const sign = await signRes.json();
      if (!signRes.ok) throw new Error(sign.error ?? "Could not get upload signature");

      const form = new FormData();
      form.append("file", pendingFile);
      form.append("api_key", sign.apiKey);
      form.append("timestamp", String(sign.timestamp));
      form.append("signature", sign.signature);
      form.append("folder", sign.folder);

      const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${sign.cloudName}/auto/upload`, {
        method: "POST",
        body: form,
      });
      const uploaded = await uploadRes.json();
      if (!uploadRes.ok) throw new Error(uploaded.error?.message ?? "Upload failed");

      await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId,
          type: pendingType,
          fileName: pendingName.trim() || pendingFile.name,
          url: uploaded.secure_url,
          publicId: uploaded.public_id,
        }),
      });
      setPendingFile(null);
      setPendingName("");
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this document?")) return;
    setDocs((prev) => prev.filter((d) => d.id !== id));
    await fetch(`/api/documents/${id}`, { method: "DELETE" });
  }

  async function downloadAll() {
    setDownloadingZip(true);
    try {
      const res = await fetch(`/api/students/${studentId}/documents/zip`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Could not build zip");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "documents.zip";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Download failed");
    } finally {
      setDownloadingZip(false);
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 print:hidden">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-semibold">Documents</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={downloadAll}
            disabled={downloadingZip || docs.length === 0}
            className="flex items-center gap-1 rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
          >
            <Download className="h-3.5 w-3.5" />
            {downloadingZip ? "Zipping…" : "Download all (.zip)"}
          </button>
          <label className="flex cursor-pointer items-center gap-1 rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700">
            <Upload className="h-3.5 w-3.5" />
            Choose file
            <input type="file" className="hidden" onChange={onFileSelected} disabled={uploading} />
          </label>
        </div>
      </div>

      {pendingFile && (
        <div className="mt-3 rounded-lg border border-indigo-200 bg-indigo-50 p-3">
          <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
            <input
              value={pendingName}
              onChange={(e) => setPendingName(e.target.value)}
              placeholder="Document name"
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
            <select
              value={pendingType}
              onChange={(e) => setPendingType(e.target.value as DocType)}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              {CATEGORY_GROUPS.map((group) => (
                <optgroup key={group.label} label={group.label}>
                  {group.options.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <button
              onClick={confirmUpload}
              disabled={uploading}
              className="rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {uploading ? "Uploading…" : "Upload"}
            </button>
            <button
              onClick={cancelPending}
              disabled={uploading}
              className="flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-700"
            >
              <X className="h-3.5 w-3.5" /> Cancel
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <p className="mt-3 text-sm text-slate-500">Loading…</p>
      ) : docs.length === 0 ? (
        <p className="mt-3 text-sm text-slate-500">No documents uploaded.</p>
      ) : (
        <ul className="mt-3 space-y-2 text-sm">
          {docs.map((d) => (
            <li key={d.id} className="flex items-center justify-between border-t border-slate-100 pt-2 first:border-0 first:pt-0">
              <a href={d.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-indigo-600 hover:underline">
                <FileText className="h-4 w-4" />
                {d.fileName}
                <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-500">{LABELS[d.type] ?? d.type}</span>
              </a>
              <button onClick={() => remove(d.id)} className="text-slate-400 hover:text-red-600">
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
