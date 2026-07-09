"use client";

import { useEffect, useState } from "react";
import { FileText, Trash2, Upload } from "lucide-react";

type DocType = "PASSPORT" | "TRANSCRIPT" | "VISA" | "OFFER_LETTER" | "CERTIFICATE" | "OTHER";

type Doc = {
  id: string;
  type: DocType;
  fileName: string;
  url: string;
  createdAt: string;
};

const TYPES: DocType[] = ["PASSPORT", "TRANSCRIPT", "VISA", "OFFER_LETTER", "CERTIFICATE", "OTHER"];

export function DocumentManager({ studentId }: { studentId: string }) {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [type, setType] = useState<DocType>("OTHER");
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);

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

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    try {
      const signRes = await fetch("/api/documents/sign", { method: "POST" });
      const sign = await signRes.json();
      if (!signRes.ok) throw new Error(sign.error ?? "Could not get upload signature");

      const form = new FormData();
      form.append("file", file);
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
          type,
          fileName: file.name,
          url: uploaded.secure_url,
          publicId: uploaded.public_id,
        }),
      });
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

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Documents</h2>
        <div className="flex items-center gap-2">
          <select
            value={type}
            onChange={(e) => setType(e.target.value as DocType)}
            className="rounded border border-slate-300 px-2 py-1 text-xs"
          >
            {TYPES.map((t) => (
              <option key={t} value={t}>
                {t.replace(/_/g, " ")}
              </option>
            ))}
          </select>
          <label className="flex cursor-pointer items-center gap-1 rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700">
            <Upload className="h-3.5 w-3.5" />
            {uploading ? "Uploading…" : "Upload"}
            <input type="file" className="hidden" onChange={handleFile} disabled={uploading} />
          </label>
        </div>
      </div>

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
                <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-500">{d.type.replace(/_/g, " ")}</span>
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
