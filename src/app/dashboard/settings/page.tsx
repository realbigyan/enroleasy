"use client";

import { useState } from "react";

export default function SettingsPage() {
  const [pwForm, setPwForm] = useState({ currentPassword: "", newPassword: "", confirm: "" });
  const [pwLoading, setPwLoading] = useState(false);
  const [pwMessage, setPwMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [emailForm, setEmailForm] = useState({ currentPassword: "", newEmail: "" });
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailMessage, setEmailMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  async function onChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwMessage(null);
    if (pwForm.newPassword !== pwForm.confirm) {
      setPwMessage({ type: "error", text: "New passwords don't match." });
      return;
    }
    setPwLoading(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: pwForm.currentPassword,
          newPassword: pwForm.newPassword,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setPwMessage({ type: "error", text: data.error ?? "Could not update password" });
        return;
      }
      setPwMessage({ type: "success", text: "Password updated." });
      setPwForm({ currentPassword: "", newPassword: "", confirm: "" });
    } finally {
      setPwLoading(false);
    }
  }

  async function onChangeEmail(e: React.FormEvent) {
    e.preventDefault();
    setEmailMessage(null);
    setEmailLoading(true);
    try {
      const res = await fetch("/api/auth/change-email", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(emailForm),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setEmailMessage({ type: "error", text: data.error ?? "Could not update email" });
        return;
      }
      setEmailMessage({ type: "success", text: `Email updated to ${data.email}.` });
      setEmailForm({ currentPassword: "", newEmail: "" });
    } finally {
      setEmailLoading(false);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold">Account Settings</h1>
      <p className="mt-1 text-sm text-slate-500">Update your login email and password.</p>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="font-semibold">Change password</h2>
          <form onSubmit={onChangePassword} className="mt-4 space-y-3">
            <div>
              <label className="block text-sm font-medium">Current password</label>
              <input
                required
                type="password"
                value={pwForm.currentPassword}
                onChange={(e) => setPwForm({ ...pwForm, currentPassword: e.target.value })}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium">New password</label>
              <input
                required
                type="password"
                minLength={8}
                value={pwForm.newPassword}
                onChange={(e) => setPwForm({ ...pwForm, newPassword: e.target.value })}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium">Confirm new password</label>
              <input
                required
                type="password"
                minLength={8}
                value={pwForm.confirm}
                onChange={(e) => setPwForm({ ...pwForm, confirm: e.target.value })}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              />
            </div>
            {pwMessage && (
              <p className={`text-sm ${pwMessage.type === "success" ? "text-green-600" : "text-red-600"}`}>
                {pwMessage.text}
              </p>
            )}
            <button
              type="submit"
              disabled={pwLoading}
              className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {pwLoading ? "Saving…" : "Update password"}
            </button>
          </form>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="font-semibold">Change email</h2>
          <form onSubmit={onChangeEmail} className="mt-4 space-y-3">
            <div>
              <label className="block text-sm font-medium">New email</label>
              <input
                required
                type="email"
                value={emailForm.newEmail}
                onChange={(e) => setEmailForm({ ...emailForm, newEmail: e.target.value })}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium">Current password</label>
              <input
                required
                type="password"
                value={emailForm.currentPassword}
                onChange={(e) => setEmailForm({ ...emailForm, currentPassword: e.target.value })}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              />
            </div>
            {emailMessage && (
              <p className={`text-sm ${emailMessage.type === "success" ? "text-green-600" : "text-red-600"}`}>
                {emailMessage.text}
              </p>
            )}
            <button
              type="submit"
              disabled={emailLoading}
              className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {emailLoading ? "Saving…" : "Update email"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
