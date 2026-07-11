"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { LogoMark } from "@/components/Logo";

const GOOGLE_ERROR_MESSAGES: Record<string, string> = {
  google_not_configured: "Google sign-in isn't set up on this deployment yet.",
  google_cancelled: "Google sign-in was cancelled.",
  google_invalid_state: "That Google sign-in link expired. Please try again.",
  google_email_unverified: "Your Google account's email isn't verified.",
  google_no_account: "No EnrolEasy account uses this Google email. Ask your workspace owner to invite you first.",
  google_ambiguous_account: "This email matches more than one workspace. Please log in with your password instead.",
  google_failed: "Google sign-in failed. Please try again or use your password.",
};

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4">
      <path fill="#4285F4" d="M23.52 12.27c0-.85-.08-1.66-.22-2.45H12v4.63h6.47a5.53 5.53 0 0 1-2.4 3.63v3h3.88c2.27-2.09 3.57-5.17 3.57-8.81Z" />
      <path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.95-2.92l-3.88-3c-1.08.72-2.45 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.27v3.1A12 12 0 0 0 12 24Z" />
      <path fill="#FBBC05" d="M5.27 14.27a7.2 7.2 0 0 1 0-4.54v-3.1H1.27a12 12 0 0 0 0 10.74l4-3.1Z" />
      <path fill="#EA4335" d="M12 4.77c1.76 0 3.35.61 4.6 1.8l3.44-3.44C17.95 1.19 15.24 0 12 0A12 12 0 0 0 1.27 6.63l4 3.1C6.22 6.88 8.87 4.77 12 4.77Z" />
    </svg>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [form, setForm] = useState({ email: "", password: "" });
  // Initialized lazily from the ?error= query param (set by the Google SSO
  // callback redirect) rather than in an effect, so there's no
  // render-then-immediately-setState cascade on first paint.
  const [error, setError] = useState<string | null>(() => {
    const errorCode = searchParams.get("error");
    return errorCode ? (GOOGLE_ERROR_MESSAGES[errorCode] ?? "Something went wrong. Please try again.") : null;
  });
  const [loading, setLoading] = useState(false);
  const [challengeToken, setChallengeToken] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [googleEnabled, setGoogleEnabled] = useState(false);

  useEffect(() => {
    fetch("/api/auth/google/status")
      .then((res) => res.json())
      .then((data) => setGoogleEnabled(Boolean(data.configured)))
      .catch(() => setGoogleEnabled(false));
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Invalid credentials");
      return;
    }
    if (data.twoFactorRequired) {
      setChallengeToken(data.challengeToken);
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  async function onVerifyCode(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/auth/verify-2fa", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ challengeToken, code }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Invalid verification code");
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  if (challengeToken) {
    return (
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-8">
        <Link href="/" className="mb-6 flex items-center gap-2 font-semibold">
          <LogoMark className="h-6 w-6" /> EnrolEasy
        </Link>
        <h1 className="text-xl font-semibold">Two-factor verification</h1>
        <p className="mt-1 text-sm text-slate-500">
          Enter the 6-digit code from your authenticator app.
        </p>

        <form onSubmit={onVerifyCode} className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium">Verification code</label>
            <input
              required
              inputMode="numeric"
              autoFocus
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-center text-lg tracking-widest focus:border-indigo-500 focus:outline-none"
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={loading || code.length !== 6}
            className="w-full rounded-md bg-indigo-600 px-4 py-2 font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {loading ? "Verifying…" : "Verify"}
          </button>
          <button
            type="button"
            onClick={() => {
              setChallengeToken(null);
              setCode("");
              setError(null);
            }}
            className="w-full text-center text-sm text-slate-500 hover:text-slate-700"
          >
            Back to login
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-8">
      <Link href="/" className="mb-6 flex items-center gap-2 font-semibold">
        <LogoMark className="h-6 w-6" /> EnrolEasy
      </Link>
      <h1 className="text-xl font-semibold">Log in to your workspace</h1>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      {googleEnabled && (
        <>
          <a
            href="/api/auth/google/start"
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <GoogleIcon /> Continue with Google
          </a>
          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-slate-200" />
            <span className="text-xs text-slate-400">OR</span>
            <div className="h-px flex-1 bg-slate-200" />
          </div>
        </>
      )}

      <form onSubmit={onSubmit} className={`space-y-4 ${googleEnabled ? "" : "mt-6"}`}>
        <div>
          <label className="block text-sm font-medium">Email</label>
          <input
            required
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
          />
        </div>
        <div>
          <div className="flex items-center justify-between">
            <label className="block text-sm font-medium">Password</label>
            <Link href="/forgot-password" className="text-xs font-medium text-indigo-600">
              Forgot password?
            </Link>
          </div>
          <input
            required
            type="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-indigo-600 px-4 py-2 font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {loading ? "Logging in…" : "Log in"}
        </button>
      </form>
      <p className="mt-4 text-center text-sm text-slate-500">
        Don&apos;t have a workspace yet?{" "}
        <Link href="/register" className="font-medium text-indigo-600">
          Start free trial
        </Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="flex flex-1 items-center justify-center px-4 py-12">
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
