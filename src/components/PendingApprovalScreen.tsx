"use client";

import { useRouter } from "next/navigation";
import { Clock, LogOut } from "lucide-react";

export function PendingApprovalScreen({ orgName }: { orgName: string }) {
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen flex-1 items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-8 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
          <Clock className="h-6 w-6 text-amber-600" />
        </div>
        <h1 className="mt-4 text-lg font-semibold">Awaiting approval</h1>
        <p className="mt-2 text-sm text-slate-500">
          {orgName}&apos;s workspace has been created, but trial access needs to be approved by our team before you can
          start using EnrolEasy. We&apos;ll be in touch shortly — no action needed on your end.
        </p>
        <button
          onClick={logout}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
        >
          <LogOut className="h-4 w-4" /> Log out
        </button>
      </div>
    </div>
  );
}
