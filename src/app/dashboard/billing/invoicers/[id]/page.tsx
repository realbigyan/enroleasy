"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Upload, Image as ImageIcon, QrCode } from "lucide-react";

type TaxIdType = "PAN" | "VAT";

type InvoicerForm = {
  name: string;
  invoicePrefix: string;
  receiptPrefix: string;
  logoUrl: string;
  addressLine1: string;
  addressLine2: string;
  taxIdType: TaxIdType | "";
  taxIdNumber: string;
  bankAccountName: string;
  bankAccountNumber: string;
  bankName: string;
  bankBranch: string;
  bankSwift: string;
  qrCodeUrl: string;
  footerWebsite: string;
  footerPhone: string;
  footerEmail: string;
};

const EMPTY_FORM: InvoicerForm = {
  name: "",
  invoicePrefix: "",
  receiptPrefix: "",
  logoUrl: "",
  addressLine1: "",
  addressLine2: "",
  taxIdType: "",
  taxIdNumber: "",
  bankAccountName: "",
  bankAccountNumber: "",
  bankName: "",
  bankBranch: "",
  bankSwift: "",
  qrCodeUrl: "",
  footerWebsite: "",
  footerPhone: "",
  footerEmail: "",
};

async function uploadImage(file: File): Promise<string> {
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
  return uploaded.secure_url as string;
}

export default function InvoicerSettingsPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [form, setForm] = useState<InvoicerForm>(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingQr, setUploadingQr] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function load() {
    setLoading(true);
    const res = await fetch(`/api/invoicers/${id}`);
    const data = await res.json();
    if (res.ok && data.invoicer) {
      const inv = data.invoicer;
      setForm({
        name: inv.name ?? "",
        invoicePrefix: inv.invoicePrefix ?? "",
        receiptPrefix: inv.receiptPrefix ?? "",
        logoUrl: inv.logoUrl ?? "",
        addressLine1: inv.addressLine1 ?? "",
        addressLine2: inv.addressLine2 ?? "",
        taxIdType: inv.taxIdType ?? "",
        taxIdNumber: inv.taxIdNumber ?? "",
        bankAccountName: inv.bankAccountName ?? "",
        bankAccountNumber: inv.bankAccountNumber ?? "",
        bankName: inv.bankName ?? "",
        bankBranch: inv.bankBranch ?? "",
        bankSwift: inv.bankSwift ?? "",
        qrCodeUrl: inv.qrCodeUrl ?? "",
        footerWebsite: inv.footerWebsite ?? "",
        footerPhone: inv.footerPhone ?? "",
        footerEmail: inv.footerEmail ?? "",
      });
    }
    setLoading(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch on mount/id change
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function onLogoSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploadingLogo(true);
    try {
      const url = await uploadImage(file);
      setForm((f) => ({ ...f, logoUrl: url }));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Logo upload failed");
    } finally {
      setUploadingLogo(false);
    }
  }

  async function onQrSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploadingQr(true);
    try {
      const url = await uploadImage(file);
      setForm((f) => ({ ...f, qrCodeUrl: url }));
    } catch (err) {
      alert(err instanceof Error ? err.message : "QR upload failed");
    } finally {
      setUploadingQr(false);
    }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch(`/api/invoicers/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          taxIdType: form.taxIdType || null,
          receiptPrefix: form.receiptPrefix || null,
          logoUrl: form.logoUrl || null,
          addressLine1: form.addressLine1 || null,
          addressLine2: form.addressLine2 || null,
          taxIdNumber: form.taxIdNumber || null,
          bankAccountName: form.bankAccountName || null,
          bankAccountNumber: form.bankAccountNumber || null,
          bankName: form.bankName || null,
          bankBranch: form.bankBranch || null,
          bankSwift: form.bankSwift || null,
          qrCodeUrl: form.qrCodeUrl || null,
          footerWebsite: form.footerWebsite || null,
          footerPhone: form.footerPhone || null,
          footerEmail: form.footerEmail || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not save changes");
      setSaved(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save changes");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="text-sm text-slate-500">Loading…</p>;

  return (
    <div>
      <Link href="/dashboard/billing" className="flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-700">
        <ArrowLeft className="h-4 w-4" /> Back to Billing
      </Link>
      <h1 className="mt-2 text-2xl font-semibold">Invoice Branding — {form.name}</h1>
      <p className="mt-1 text-sm text-slate-500">This appears on every invoice and receipt issued by this entity.</p>

      <form onSubmit={save} className="mt-6 space-y-6">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="font-semibold">Logo & Business Details</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2 flex items-center gap-4">
              {form.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- external Cloudinary URL, not a local asset
                <img src={form.logoUrl} alt="Logo" className="h-16 w-16 rounded border border-slate-200 object-contain" />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded border border-dashed border-slate-300 text-slate-300">
                  <ImageIcon className="h-6 w-6" />
                </div>
              )}
              <label className="flex cursor-pointer items-center gap-1 rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50">
                <Upload className="h-3.5 w-3.5" />
                {uploadingLogo ? "Uploading…" : "Upload logo"}
                <input type="file" accept="image/*" className="hidden" onChange={onLogoSelected} disabled={uploadingLogo} />
              </label>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500">Business Name</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500">Invoice Prefix</label>
              <input value={form.invoicePrefix} onChange={(e) => setForm({ ...form, invoicePrefix: e.target.value.toUpperCase() })}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500">Address Line 1</label>
              <input value={form.addressLine1} onChange={(e) => setForm({ ...form, addressLine1: e.target.value })}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500">Address Line 2</label>
              <input value={form.addressLine2} onChange={(e) => setForm({ ...form, addressLine2: e.target.value })}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="font-semibold">Tax Identification</h2>
          <div className="mt-3 flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-3">
              {(["PAN", "VAT"] as TaxIdType[]).map((t) => (
                <label key={t} className="flex items-center gap-1.5 text-sm">
                  <input
                    type="checkbox"
                    checked={form.taxIdType === t}
                    onChange={() => setForm({ ...form, taxIdType: form.taxIdType === t ? "" : t })}
                    className="h-4 w-4"
                  />
                  {t}
                </label>
              ))}
            </div>
            <input
              placeholder={form.taxIdType ? `${form.taxIdType} number` : "PAN/VAT number"}
              value={form.taxIdNumber}
              onChange={(e) => setForm({ ...form, taxIdNumber: e.target.value })}
              disabled={!form.taxIdType}
              className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-50 disabled:text-slate-400"
            />
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="font-semibold">Bank Details</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-slate-500">Account Name</label>
              <input value={form.bankAccountName} onChange={(e) => setForm({ ...form, bankAccountName: e.target.value })}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500">Account Number</label>
              <input value={form.bankAccountNumber} onChange={(e) => setForm({ ...form, bankAccountNumber: e.target.value })}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500">Bank</label>
              <input value={form.bankName} onChange={(e) => setForm({ ...form, bankName: e.target.value })}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500">Branch</label>
              <input value={form.bankBranch} onChange={(e) => setForm({ ...form, bankBranch: e.target.value })}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500">Swift</label>
              <input value={form.bankSwift} onChange={(e) => setForm({ ...form, bankSwift: e.target.value })}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
            </div>
          </div>

          <div className="mt-4 flex items-center gap-4 border-t border-slate-100 pt-4">
            {form.qrCodeUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- external Cloudinary URL, not a local asset
              <img src={form.qrCodeUrl} alt="Payment QR" className="h-20 w-20 rounded border border-slate-200 object-contain" />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded border border-dashed border-slate-300 text-slate-300">
                <QrCode className="h-6 w-6" />
              </div>
            )}
            <label className="flex cursor-pointer items-center gap-1 rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50">
              <Upload className="h-3.5 w-3.5" />
              {uploadingQr ? "Uploading…" : "Upload payment QR"}
              <input type="file" accept="image/*" className="hidden" onChange={onQrSelected} disabled={uploadingQr} />
            </label>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="font-semibold">Footer</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <div>
              <label className="block text-xs font-medium text-slate-500">Website</label>
              <input value={form.footerWebsite} onChange={(e) => setForm({ ...form, footerWebsite: e.target.value })}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500">Phone</label>
              <input value={form.footerPhone} onChange={(e) => setForm({ ...form, footerPhone: e.target.value })}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500">Email</label>
              <input type="email" value={form.footerEmail} onChange={(e) => setForm({ ...form, footerEmail: e.target.value })}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
            </div>
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex items-center gap-3">
          <button type="submit" disabled={saving}
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50">
            {saving ? "Saving…" : "Save changes"}
          </button>
          {saved && <span className="text-sm text-green-600">Saved.</span>}
        </div>
      </form>
    </div>
  );
}
