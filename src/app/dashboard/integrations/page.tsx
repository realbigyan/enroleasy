"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Webhook, Facebook, Upload, Copy, Check, ExternalLink, AlertTriangle } from "lucide-react";
import Link from "next/link";

type MetaStatus = {
  configured: boolean;
  integration: { pageName: string; status: string; lastLeadAt: string | null; updatedAt: string } | null;
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
  const [origin, setOrigin] = useState("");
  const [copied, setCopied] = useState(false);
  const [rotating, setRotating] = useState(false);

  // ── Option 2: native Meta integration ────────────────────────────────
  const [metaStatus, setMetaStatus] = useState<MetaStatus | null>(null);
  const [pendingPages, setPendingPages] = useState<{ id: string; name: string }[] | null>(null);
  const [metaBanner, setMetaBanner] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data load on mount
    setOrigin(window.location.origin);
    fetch("/api/integrations/webhook").then((r) => r.json()).then((d) => setWebhookToken(d.token));
    loadMetaStatus();

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
        Get leads into EnrolEasy automatically, or bulk-upload them from a file.
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
        </section>

        {/* ── OPTION 2: Native Meta integration ────────────────────────── */}
        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center gap-2">
            <Facebook className="h-5 w-5 text-indigo-600" />
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
                <Facebook className="h-4 w-4" /> Connect Facebook Page
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
      </div>
    </div>
  );
}
