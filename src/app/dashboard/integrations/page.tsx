"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Webhook, Link2, Upload, Copy, Check, ExternalLink, AlertTriangle, QrCode, KeyRound, Trash2 } from "lucide-react";
import Link from "next/link";

type MetaStatus = {
  configured: boolean;
  integration: { pageName: string; status: string; lastLeadAt: string | null; updatedAt: string } | null;
};

type ApiKeySummary = {
  id: string;
  name: string;
  keyPrefix: string;
  scope: "READ_ONLY" | "READ_WRITE";
  lastUsedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
};

export default function IntegrationsPage() {
  return (
    <Suspense fallback={<p className="text-sm text-slate-500">Loading…</p>}>
      <IntegrationsPageInner />
    </Suspense>
  );
}

function IntegrationsPageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // ── Option 1: generic webhook ────────────────────────────────────────
  const [webhookToken, setWebhookToken] = useState<string | null>(null);
  const [orgSlug, setOrgSlug] = useState<string | null>(null);
  const [origin, setOrigin] = useState("");
  const [copied, setCopied] = useState(false);
  const [rotating, setRotating] = useState(false);

  // ── Reception / walk-in kiosk form ───────────────────────────────────
  const [receptionCopied, setReceptionCopied] = useState(false);

  // ── Option 2: native Meta integration ────────────────────────────────
  const [metaStatus, setMetaStatus] = useState<MetaStatus | null>(null);
  const [pendingPages, setPendingPages] = useState<{ id: string; name: string }[] | null>(null);
  const [metaBanner, setMetaBanner] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // ── Developer API keys ────────────────────────────────────────────────
  const [apiKeys, setApiKeys] = useState<ApiKeySummary[] | null>(null);
  const [newKeyName, setNewKeyName] = useState("");
  const [newKeyScope, setNewKeyScope] = useState<"READ_ONLY" | "READ_WRITE">("READ_ONLY");
  const [creatingKey, setCreatingKey] = useState(false);
  const [freshKey, setFreshKey] = useState<string | null>(null);
  const [freshKeyCopied, setFreshKeyCopied] = useState(false);
  const [apiKeyError, setApiKeyError] = useState<string | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data load on mount
    setOrigin(window.location.origin);
    fetch("/api/integrations/webhook").then((r) => r.json()).then((d) => {
      setWebhookToken(d.token);
      setOrgSlug(d.orgSlug);
    });
    loadMetaStatus();
    loadApiKeys();

    const connected = searchParams.get("meta_connected");
    const error = searchParams.get("meta_error");
    const select = searchParams.get("meta_select");
    if (connected) setMetaBanner({ type: "success", text: `Connected to Facebook Page "${connected}".` });
    if (error) setMetaBanner({ type: "error", text: error });
    if (select) {
      fetch("/api/integrations/meta/pages").then((r) => r.json()).then((d) => setPendingPages(d.pages ?? []));
    }
    if (connected || error || select) {
      router.replace("/dashboard/integrations");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount
  }, []);

  function loadMetaStatus() {
    fetch("/api/integrations/meta/status").then((r) => r.json()).then(setMetaStatus);
  }

  function loadApiKeys() {
    fetch("/api/api-keys").then((r) => r.json()).then((d) => setApiKeys(d.keys ?? []));
  }

  async function createApiKey(e: React.FormEvent) {
    e.preventDefault();
    setApiKeyError(null);
    setCreatingKey(true);
    try {
      const res = await fetch("/api/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newKeyName, scope: newKeyScope }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setApiKeyError(data.error ?? "Could not create key");
        return;
      }
      setFreshKey(data.plaintext);
      setNewKeyName("");
      loadApiKeys();
    } finally {
      setCreatingKey(false);
    }
  }

  async function revokeApiKey(id: string) {
    if (!confirm("Revoke this API key? Any script using it will stop working immediately.")) return;
    await fetch(`/api/api-keys/${id}`, { method: "DELETE" });
    loadApiKeys();
  }

  function copyFreshKey() {
    if (!freshKey) return;
    navigator.clipboard.writeText(freshKey);
    setFreshKeyCopied(true);
    setTimeout(() => setFreshKeyCopied(false), 2000);
  }

  async function rotateToken() {
    if (!confirm("Rotate the webhook token? The old URL will stop working immediately — update any Zap or scenario pointed at it.")) return;
    setRotating(true);
    try {
      const res = await fetch("/api/integrations/webhook", { method: "POST" });
      const data = await res.json();
      setWebhookToken(data.token);
    } finally {
      setRotating(false);
    }
  }

  function copyUrl() {
    if (!webhookToken) return;
    navigator.clipboard.writeText(webhookUrl());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function webhookUrl() {
    return `${origin}/api/public/leads/webhook/${webhookToken}`;
  }

  function receptionUrl() {
    return `${origin}/book/${orgSlug}?kiosk=1`;
  }

  function copyReceptionUrl() {
    if (!orgSlug) return;
    navigator.clipboard.writeText(receptionUrl());
    setReceptionCopied(true);
    setTimeout(() => setReceptionCopied(false), 2000);
  }

  async function selectPage(pageId: string) {
    const res = await fetch("/api/integrations/meta/select-page", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pageId }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      setMetaBanner({ type: "success", text: `Connected to Facebook Page "${data.pageName}".` });
      setPendingPages(null);
      loadMetaStatus();
    } else {
      setMetaBanner({ type: "error", text: data.error ?? "Could not connect that Page" });
    }
  }

  async function disconnectMeta() {
    if (!confirm("Disconnect this Facebook Page? Leads will stop flowing in automatically until you reconnect.")) return;
    await fetch("/api/integrations/meta/disconnect", { method: "POST" });
    loadMetaStatus();
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold">Integrations</h1>
      <p className="mt-1 text-sm text-slate-500">
        Get leads into EnrolEasy automatically, bulk-upload them from a file, or connect your own tools via the API.
      </p>

      <div className="mt-6 space-y-6">
        {/* ── OPTION 1: Generic webhook ─────────────────────────────── */}
        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center gap-2">
            <Webhook className="h-5 w-5 text-indigo-600" />
            <h2 className="font-semibold">Lead intake webhook</h2>
            <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
              Ready now — no approval needed
            </span>
          </div>
          <p className="mt-2 text-sm text-slate-600">
            Point Zapier&apos;s or Make.com&apos;s built-in Facebook Lead Ads trigger at this URL, and every new
            lead gets created here automatically. Works today because Zapier/Make already hold Meta&apos;s
            approval for reading lead ads — EnrolEasy doesn&apos;t need its own.
          </p>

          <div className="mt-3 flex items-center gap-2">
            <input
              readOnly
              value={webhookToken ? webhookUrl() : "Loading…"}
              className="flex-1 rounded-md border border-slate-300 bg-slate-50 px-3 py-2 font-mono text-xs"
              onFocus={(e) => e.target.select()}
            />
            <button
              onClick={copyUrl}
              disabled={!webhookToken}
              className="flex items-center gap-1 rounded-md border border-slate-300 px-3 py-2 text-sm font-medium hover:bg-slate-50 disabled:opacity-50"
            >
              {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
              {copied ? "Copied" : "Copy"}
            </button>
            <button
              onClick={rotateToken}
              disabled={rotating}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium hover:bg-slate-50 disabled:opacity-50"
            >
              Rotate
            </button>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            Keep this URL secret — anyone with it can create leads in your CRM. Rotating it immediately invalidates the old URL.
          </p>

          <details className="mt-4 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm">
            <summary className="cursor-pointer font-medium text-slate-700">Setup notes — Zapier</summary>
            <ol className="mt-2 list-decimal space-y-1 pl-5 text-slate-600">
              <li>In Zapier, create a Zap with trigger <strong>Facebook Lead Ads → New Lead</strong>, and connect your Facebook account/page (Zapier handles this approval, not EnrolEasy).</li>
              <li>Add an action step: <strong>Webhooks by Zapier → POST</strong>.</li>
              <li>Set the URL to the webhook URL above.</li>
              <li>Set Payload Type to <strong>JSON</strong>, and map fields: <code>full_name</code>, <code>email</code>, <code>phone_number</code> from the lead trigger — plus <code>id</code> if you want duplicate-safe re-runs.</li>
              <li>Turn the Zap on. New leads will appear in your Leads pipeline with source &quot;Other&quot; (or whatever you map in the <code>source</code> field).</li>
            </ol>
          </details>
          <details className="mt-2 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm">
            <summary className="cursor-pointer font-medium text-slate-700">Setup notes — Make.com</summary>
            <ol className="mt-2 list-decimal space-y-1 pl-5 text-slate-600">
              <li>Create a scenario with the <strong>Facebook Lead Ads → Watch Leads</strong> trigger module, and connect your Facebook account.</li>
              <li>Add an <strong>HTTP → Make a request</strong> module.</li>
              <li>Method: POST, URL: the webhook URL above, Body type: JSON, mapping the same fields as the Zapier notes.</li>
              <li>Run the scenario once manually to confirm a lead shows up in EnrolEasy, then turn on scheduling.</li>
            </ol>
          </details>
          <details className="mt-2 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm">
            <summary className="cursor-pointer font-medium text-slate-700">Setup notes — your own website&apos;s contact form</summary>
            <p className="mt-2 text-slate-600">
              Already have a signup or contact form on your own site? Connect it directly — no Zapier/Make account needed.
            </p>
            <p className="mt-3 font-medium text-slate-700">Option A — plain HTML, no JavaScript</p>
            <p className="mt-1 text-slate-600">
              Point your form&apos;s <code>action</code> at the webhook URL above, and add a hidden field with your
              own thank-you page so visitors never leave your site:
            </p>
            <pre className="mt-2 overflow-x-auto rounded bg-slate-900 p-3 text-xs text-slate-100">
{`<form action="${webhookToken ? webhookUrl() : "YOUR_WEBHOOK_URL"}" method="POST">
  <input type="hidden" name="redirect" value="https://your-site.com/thank-you" />
  <input name="fullName" placeholder="Full name" required />
  <input name="email" type="email" placeholder="Email" />
  <input name="phone" placeholder="Phone" />
  <button type="submit">Send</button>
</form>`}
            </pre>
            <p className="mt-3 font-medium text-slate-700">Option B — JS snippet, no page reload</p>
            <p className="mt-1 text-slate-600">
              For an inline, no-reload experience instead, add the script tag once and mark your form —
              don&apos;t include the hidden <code>redirect</code> field for this option:
            </p>
            <pre className="mt-2 overflow-x-auto rounded bg-slate-900 p-3 text-xs text-slate-100">
{`<script src="${origin || "https://enroleasy.com"}/embed/lead-form.js" async></script>
<form data-enroleasy-lead="${webhookToken ? webhookUrl() : "YOUR_WEBHOOK_URL"}">
  <input name="fullName" placeholder="Full name" required />
  <input name="email" type="email" placeholder="Email" />
  <input name="phone" placeholder="Phone" />
  <button type="submit">Send</button>
  <p data-enroleasy-success hidden>Thanks — we&apos;ll be in touch!</p>
  <p data-enroleasy-error hidden></p>
</form>`}
            </pre>
            <p className="mt-2 text-xs text-slate-400">
              Either way, leads land in your pipeline tagged source &quot;Other&quot; by default — add a hidden{" "}
              <code>source</code> field set to <code>WEBSITE</code> if you&apos;d rather tag them that way.
            </p>
          </details>
        </section>

        {/* ── OPTION 2: Native Meta integration ────────────────────────── */}
        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center gap-2">
            <Link2 className="h-5 w-5 text-indigo-600" />
            <h2 className="font-semibold">Native Meta (Facebook) integration</h2>
            {metaStatus?.configured ? (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                Pending Meta App Review
              </span>
            ) : (
              <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-600">
                Not yet available
              </span>
            )}
          </div>

          <div className="mt-2 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <p>
              This connects your Facebook Page directly — no Zapier/Make needed — but it requires EnrolEasy&apos;s
              Meta Developer App to be approved by Meta for the <code>leads_retrieval</code> permission. That
              review is controlled entirely by Meta (privacy policy, demo video, business verification) and can
              take days to weeks. Until it&apos;s approved, use the webhook above — it&apos;s fully working today.
            </p>
          </div>

          {metaBanner && (
            <div className={`mt-3 rounded-md border p-3 text-sm ${metaBanner.type === "success" ? "border-green-200 bg-green-50 text-green-800" : "border-red-200 bg-red-50 text-red-700"}`}>
              {metaBanner.text}
            </div>
          )}

          {pendingPages && (
            <div className="mt-3 rounded-md border border-slate-200 p-3">
              <p className="text-sm font-medium">Your Facebook account manages more than one Page — pick which one to connect:</p>
              <div className="mt-2 space-y-1">
                {pendingPages.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => selectPage(p.id)}
                    className="block w-full rounded-md border border-slate-200 px-3 py-2 text-left text-sm hover:bg-slate-50"
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="mt-4">
            {metaStatus?.integration ? (
              <div className="flex items-center justify-between rounded-md border border-slate-200 p-3 text-sm">
                <div>
                  <p className="font-medium">Connected: {metaStatus.integration.pageName}</p>
                  <p className="text-xs text-slate-500">
                    {metaStatus.integration.lastLeadAt
                      ? `Last lead received ${new Date(metaStatus.integration.lastLeadAt).toLocaleString()}`
                      : "No leads received yet"}
                  </p>
                </div>
                <button onClick={disconnectMeta} className="text-xs font-medium text-red-600 hover:underline">
                  Disconnect
                </button>
              </div>
            ) : (
              <a
                href="/api/integrations/meta/connect"
                className={`inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium text-white ${metaStatus?.configured ? "bg-indigo-600 hover:bg-indigo-700" : "pointer-events-none bg-slate-300"}`}
              >
                <Link2 className="h-4 w-4" /> Connect Facebook Page
              </a>
            )}
          </div>

          <details className="mt-4 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm">
            <summary className="cursor-pointer font-medium text-slate-700">What happens once this is approved</summary>
            <ol className="mt-2 list-decimal space-y-1 pl-5 text-slate-600">
              <li>Click &quot;Connect Facebook Page&quot; and approve access in the Facebook dialog.</li>
              <li>If your account manages multiple Pages, pick the one running your lead ads.</li>
              <li>New leads submitted through any lead form on that Page arrive here within seconds, tagged source &quot;Meta Ads&quot;.</li>
              <li>No Zapier/Make account or per-lead cost involved — this talks to Meta directly.</li>
            </ol>
          </details>
        </section>

        {/* ── OPTION 3: CSV import ──────────────────────────────────────── */}
        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-indigo-600" />
            <h2 className="font-semibold">CSV import</h2>
            <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
              Ready now
            </span>
          </div>
          <p className="mt-2 text-sm text-slate-600">
            Always-available fallback — export leads from Meta Ads Manager (or any source) as a CSV and
            upload it. Not a live feed: it&apos;s a manual, repeatable bulk import with automatic duplicate
            detection by email, phone, or lead ID.
          </p>
          <Link
            href="/dashboard/leads"
            className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-indigo-600 hover:underline"
          >
            Go to Leads → Import CSV <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        </section>

        {/* ── Reception / walk-in kiosk form ────────────────────────────── */}
        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center gap-2">
            <QrCode className="h-5 w-5 text-indigo-600" />
            <h2 className="font-semibold">Reception / walk-in form</h2>
            <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
              Ready now
            </span>
          </div>
          <p className="mt-2 text-sm text-slate-600">
            For visitors who walk into your office — put this on a tablet at reception, or print the QR code
            so people scan it with their own phone while they wait. It&apos;s full-screen, touch-friendly, resets
            itself after each submission, and tags leads &quot;Walk-in&quot; so they&apos;re easy to tell apart from
            website traffic in your reports.
          </p>

          <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-start">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <input
                  readOnly
                  value={orgSlug ? receptionUrl() : "Loading…"}
                  className="flex-1 rounded-md border border-slate-300 bg-slate-50 px-3 py-2 font-mono text-xs"
                  onFocus={(e) => e.target.select()}
                />
                <button
                  onClick={copyReceptionUrl}
                  disabled={!orgSlug}
                  className="flex items-center gap-1 rounded-md border border-slate-300 px-3 py-2 text-sm font-medium hover:bg-slate-50 disabled:opacity-50"
                >
                  {receptionCopied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                  {receptionCopied ? "Copied" : "Copy"}
                </button>
              </div>
              <p className="mt-2 text-xs text-slate-400">
                Open this URL on any tablet or computer at your office and leave it there — no login needed,
                and it&apos;s safe for the public since it only ever creates a new lead, nothing else.
              </p>
            </div>
            {orgSlug && (
              <div className="flex flex-col items-center gap-1">
                {/* eslint-disable-next-line @next/next/no-img-element -- authenticated API-generated image, not a static asset */}
                <img
                  src="/api/integrations/reception/qrcode"
                  alt="QR code linking to your reception sign-up form"
                  className="h-32 w-32 rounded-md border border-slate-200"
                />
                <span className="text-xs text-slate-400">Scan to sign up</span>
              </div>
            )}
          </div>
        </section>

        {/* ── Developer API keys ────────────────────────────────────────── */}
        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-indigo-600" />
            <h2 className="font-semibold">Developer API</h2>
            <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
              Ready now
            </span>
          </div>
          <p className="mt-2 text-sm text-slate-600">
            Call EnrolEasy&apos;s REST API from your own scripts or BI tools — read/write leads, students, and
            applications without opening the dashboard. Each key is scoped read-only or read-write and can be
            revoked at any time.
          </p>

          {freshKey && (
            <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3">
              <p className="text-sm font-medium text-amber-800">
                Copy this key now — it won&apos;t be shown again.
              </p>
              <div className="mt-2 flex items-center gap-2">
                <input
                  readOnly
                  value={freshKey}
                  className="flex-1 rounded-md border border-slate-300 bg-white px-3 py-2 font-mono text-xs"
                  onFocus={(e) => e.target.select()}
                />
                <button
                  onClick={copyFreshKey}
                  className="flex items-center gap-1 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium hover:bg-slate-50"
                >
                  {freshKeyCopied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                  {freshKeyCopied ? "Copied" : "Copy"}
                </button>
              </div>
              <button
                onClick={() => setFreshKey(null)}
                className="mt-2 text-xs font-medium text-amber-700 hover:underline"
              >
                Done, hide this
              </button>
            </div>
          )}

          <form onSubmit={createApiKey} className="mt-4 flex flex-wrap items-end gap-2">
            <div className="flex-1" style={{ minWidth: "160px" }}>
              <label className="block text-xs font-medium text-slate-600">Key name</label>
              <input
                required
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                placeholder="e.g. Reporting script"
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600">Access</label>
              <select
                value={newKeyScope}
                onChange={(e) => setNewKeyScope(e.target.value as "READ_ONLY" | "READ_WRITE")}
                className="mt-1 rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              >
                <option value="READ_ONLY">Read only</option>
                <option value="READ_WRITE">Read + write</option>
              </select>
            </div>
            <button
              type="submit"
              disabled={creatingKey}
              className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {creatingKey ? "Creating…" : "Create key"}
            </button>
          </form>
          {apiKeyError && <p className="mt-2 text-sm text-red-600">{apiKeyError}</p>}

          {apiKeys === null && <p className="mt-4 text-sm text-slate-400">Loading…</p>}
          {apiKeys !== null && apiKeys.filter((k) => !k.revokedAt).length === 0 && (
            <p className="mt-4 text-sm text-slate-400">No API keys yet.</p>
          )}
          {apiKeys !== null && apiKeys.filter((k) => !k.revokedAt).length > 0 && (
            <ul className="mt-4 space-y-2">
              {apiKeys.filter((k) => !k.revokedAt).map((k) => (
                <li
                  key={k.id}
                  className="flex items-center justify-between rounded-md border border-slate-100 bg-slate-50 px-3 py-2 text-sm"
                >
                  <div>
                    <p className="font-medium">
                      {k.name}{" "}
                      <span className="ml-1 rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-600">
                        {k.scope === "READ_WRITE" ? "Read + write" : "Read only"}
                      </span>
                    </p>
                    <p className="text-xs text-slate-500">
                      <code>{k.keyPrefix}…</code> · created {new Date(k.createdAt).toLocaleDateString()}
                      {k.lastUsedAt ? ` · last used ${new Date(k.lastUsedAt).toLocaleDateString()}` : " · never used"}
                    </p>
                  </div>
                  <button
                    onClick={() => revokeApiKey(k.id)}
                    className="flex items-center gap-1 text-xs font-medium text-red-600 hover:underline"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Revoke
                  </button>
                </li>
              ))}
            </ul>
          )}

          <details className="mt-4 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm">
            <summary className="cursor-pointer font-medium text-slate-700">Quick start — curl example</summary>
            <p className="mt-2 text-slate-600">List your leads:</p>
            <pre className="mt-2 overflow-x-auto rounded bg-slate-900 p-3 text-xs text-slate-100">
{`curl "${origin || "https://enroleasy.com"}/api/v1/leads" \\
  -H "Authorization: Bearer YOUR_API_KEY"`}
            </pre>
            <p className="mt-3 text-slate-600">Create a lead (requires a read-write key):</p>
            <pre className="mt-2 overflow-x-auto rounded bg-slate-900 p-3 text-xs text-slate-100">
{`curl -X POST "${origin || "https://enroleasy.com"}/api/v1/leads" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"fullName": "Jane Doe", "email": "jane@example.com"}'`}
            </pre>
            <p className="mt-2 text-xs text-slate-400">
              Also available: <code>GET/PATCH /api/v1/leads/:id</code>, <code>GET/POST /api/v1/students</code>,{" "}
              <code>GET /api/v1/students/:id</code>, <code>GET/POST /api/v1/applications</code>, and{" "}
              <code>GET /api/v1/applications/:id</code>. Requests are rate-limited to 120/minute per key.
            </p>
          </details>
        </section>
      </div>
    </div>
  );
}
