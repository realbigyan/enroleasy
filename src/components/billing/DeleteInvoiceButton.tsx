"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";

export function DeleteInvoiceButton({
  invoiceId,
  invoiceNumber,
  variant = "icon",
  onDeleted,
}: {
  invoiceId: string;
  invoiceNumber: string;
  variant?: "icon" | "button";
  onDeleted?: () => void;
}) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!window.confirm(`Delete ${invoiceNumber}? This permanently removes the invoice/receipt and reverses any ledger entries. This can't be undone.`)) {
      return;
    }
    setDeleting(true);
    const res = await fetch(`/api/invoices/${invoiceId}`, { method: "DELETE" });
    if (!res.ok) {
      setDeleting(false);
      window.alert("Couldn't delete this invoice — please try again.");
      return;
    }
    if (onDeleted) {
      onDeleted();
    } else {
      router.push("/dashboard/billing");
      router.refresh();
    }
  }

  if (variant === "button") {
    return (
      <button
        onClick={handleDelete}
        disabled={deleting}
        className="flex items-center gap-1.5 rounded-md border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
      >
        <Trash2 className="h-3.5 w-3.5" /> {deleting ? "Deleting…" : "Delete"}
      </button>
    );
  }

  return (
    <button
      onClick={handleDelete}
      disabled={deleting}
      title="Delete invoice"
      className="text-slate-400 hover:text-red-600 disabled:opacity-50"
    >
      <Trash2 className="h-4 w-4" />
    </button>
  );
}
