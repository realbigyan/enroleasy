"use client";

import { useEffect, useState } from "react";

type ActiveSession = {
  id: string;
  userAgent: string | null;
  ipAddress: string | null;
  createdAt: string;
  lastSeenAt: string;
  isCurrent: boolean;
};

function describeDevice(userAgent: string | null) {
  if (!userAgent) return "Unknown device";
  if (/iphone|ipad/i.test(userAgent)) return "iOS device";
  if (/android/i.test(userAgent)) return "Android device";
  if (/mac os/i.test(userAgent)) return "Mac";
  if (/windows/i.test(userAgent)) return "Windows PC";
  if (/linux/i.test(userAgent)) return "Linux";
  return "Unknown device";
}

export default function SettingsPage() {
  const [pwForm, setPwForm] = useState({ currentPassword: "", newPassword: "", confirm: "" });
  const [pwLoading, setPwLoading] = useState(false);
  const [pwMessage, setPwMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [emailForm, setEmailForm] = useState({ currentPassword: "", newEmail: "" });
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailMessage, setEmailMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [twoFactorEnabled, setTwoFactorEnabled] = useState<boolean | null>(null);
  const [setupData, setSetupData] = useState<{ secret: string; qrCodeDataUrl: string } | null>(null);
  const [confirmCode, setConfirmCode] = useState("");
  const [disablePassword, setDisablePassword] = useState("");
  const [twoFALoading, setTwoFALoading] = useState(false);
  const [twoFAMessage, setTwoFAMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [sessions, setSessions] = useState<ActiveSession[] | null>(null);
  const [sessionsMessage, setSessionsMessage] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => setTwoFactorEnabled(Boolean(data.twoFactorEnabled)))
      .catch(() => setTwoFactorEnabled(false));
    refreshSessions();
  }, []);

  async function refreshSessions() {
    try {
      const res = await fetch("/api/auth/sessions");
      const data = await res.json();
      setSessions(data.sessions ?? []);
    } catch {
      setSessions([]);
    }
  }

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

  async function onStartTwoFactorSetup() {
    setTwoFAMessage(null);
    setTwoFALoading(true);
    try {
      const res = await fetch("/api/auth/2fa/setup", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setTwoFAMessage({ type: "error", text: data.error ?? "Could not start 2FA setup" });
        return;
      }
      setSetupData({ secret: data.secret, qrCodeDataUrl: data.qrCodeDataUrl });
    } finally {
      setTwoFALoading(false);
    }
  }

  async function onConfirmTwoFactor(e: React.FormEvent) {
    e.preventDefault();
    setTwoFAMessage(null);
    setTwoFALoading(true);
    try {
      const res = await fetch("/api/auth/2fa/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: confirmCode }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setTwoFAMessage({ type: "error", text: data.error ?? "Invalid code" });
        return;
      }
      setTwoFactorEnabled(true);
      setSetupData(null);
      setConfirmCode("");
      setTwoFAMessage({ type: "success", text: "Two-factor authentication is now enabled." });
    } finally {
      setTwoFALoading(false);
    }
  }

  async function onDisableTwoFactor(e: React.FormEvent) {
    e.preventDefault();
    setTwoFAMessage(null);
    setTwoFALoading(true);
    try {
      const res = await fetch("/api/auth/2fa/disable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: disablePassword }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setTwoFAMessage({ type: "error", text: data.error ?? "Could not disable 2FA" });
        return;
      }
      setTwoFactorEnabled(false);
      setDisablePassword("");
      setTwoFAMessage({ type: "success", text: "Two-factor authentication disabled." });
    } finally {
      setTwoFALoading(false);
    }
  }

  async function onRevokeSession(id: string) {
    setSessionsMessage(null);
    const res = await fetch(`/api/auth/sessions/${id}`, { method: "DELETE" });
    if (!res.ok) {
      setSessionsMessage("Could not log out that device.");
      return;
    }
    await refreshSessions();
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold">Account Settings</h1>
      <p className="mt-1 text-sm text-slate-500">Update your login email, password, and security options.</p>

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

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="font-semibold">Two-factor authentication</h2>
          <p className="mt-1 text-sm text-slate-500">
            Require a 6-digit code from an authenticator app (Google Authenticator, Authy, 1Password, etc.) in
            addition to your password when logging in.
          </p>

          {twoFactorEnabled === null && <p className="mt-4 text-sm text-slate-400">Loading…</p>}

          {twoFactorEnabled === true && !setupData && (
            <form onSubmit={onDisableTwoFactor} className="mt-4 space-y-3">
              <p className="text-sm font-medium text-green-600">Two-factor authentication is enabled.</p>
              <div>
                <label className="block text-sm font-medium">Enter your password to disable it</label>
                <input
                  required
                  type="password"
                  value={disablePassword}
                  onChange={(e) => setDisablePassword(e.target.value)}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                />
              </div>
              {twoFAMessage && (
                <p className={`text-sm ${twoFAMessage.type === "success" ? "text-green-600" : "text-red-600"}`}>
                  {twoFAMessage.text}
                </p>
              )}
              <button
                type="submit"
                disabled={twoFALoading}
                className="rounded-md border border-red-300 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
              >
                {twoFALoading ? "Disabling…" : "Disable 2FA"}
              </button>
            </form>
          )}

          {twoFactorEnabled === false && !setupData && (
            <div className="mt-4">
              {twoFAMessage && (
                <p className={`mb-3 text-sm ${twoFAMessage.type === "success" ? "text-green-600" : "text-red-600"}`}>
                  {twoFAMessage.text}
                </p>
              )}
              <button
                onClick={onStartTwoFactorSetup}
                disabled={twoFALoading}
                className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {twoFALoading ? "Starting…" : "Enable 2FA"}
              </button>
            </div>
          )}

          {setupData && (
            <form onSubmit={onConfirmTwoFactor} className="mt-4 space-y-3">
              <p className="text-sm">Scan this QR code with your authenticator app:</p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={setupData.qrCodeDataUrl} alt="2FA setup QR code" className="h-40 w-40" />
              <p className="text-xs text-slate-500">
                Can&apos;t scan it? Enter this code manually:{" "}
                <span className="font-mono">{setupData.secret}</span>
              </p>
              <div>
                <label className="block text-sm font-medium">Enter the 6-digit code to confirm</label>
                <input
                  required
                  inputMode="numeric"
                  maxLength={6}
                  value={confirmCode}
                  onChange={(e) => setConfirmCode(e.target.value.replace(/\D/g, ""))}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                />
              </div>
              {twoFAMessage && (
                <p className={`text-sm ${twoFAMessage.type === "success" ? "text-green-600" : "text-red-600"}`}>
                  {twoFAMessage.text}
                </p>
              )}
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={twoFALoading || confirmCode.length !== 6}
                  className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  {twoFALoading ? "Confirming…" : "Confirm & enable"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSetupData(null);
                    setConfirmCode("");
                  }}
                  className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="font-semibold">Active sessions</h2>
          <p className="mt-1 text-sm text-slate-500">Devices currently logged into your account.</p>

          {sessionsMessage && <p className="mt-2 text-sm text-red-600">{sessionsMessage}</p>}

          {sessions === null && <p className="mt-4 text-sm text-slate-400">Loading…</p>}
          {sessions !== null && sessions.length === 0 && (
            <p className="mt-4 text-sm text-slate-400">No active sessions found.</p>
          )}

          {sessions !== null && sessions.length > 0 && (
            <ul className="mt-4 space-y-3">
              {sessions.map((s) => (
                <li
                  key={s.id}
                  className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-3 py-2"
                >
                  <div>
                    <p className="text-sm font-medium">
                      {describeDevice(s.userAgent)}
                      {s.isCurrent && (
                        <span className="ml-2 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                          This device
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-slate-500">
                      {s.ipAddress ?? "Unknown IP"} · last active {new Date(s.lastSeenAt).toLocaleString()}
                    </p>
                  </div>
                  {!s.isCurrent && (
                    <button
                      onClick={() => onRevokeSession(s.id)}
                      className="text-sm font-medium text-red-600 hover:text-red-700"
                    >
                      Log out
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
