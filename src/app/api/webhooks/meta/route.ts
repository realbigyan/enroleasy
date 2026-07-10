import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { fetchLeadFields, getMetaWebhookVerifyToken, isMetaConfigured } from "@/lib/meta";

// Meta's webhook subscription for the "leadgen" field on a Page. This one
// endpoint serves every connected organization — Meta sends the page_id in
// each event, which is how we resolve which org (and which stored
// pageAccessToken) it belongs to.

// Step 1 of setting up a webhook subscription in the Meta App dashboard:
// Meta calls this GET with hub.mode=subscribe to verify you control the
// endpoint before it will start sending real events.
export async function GET(req: NextRequest) {
  if (!isMetaConfigured()) {
    return NextResponse.json({ error: "Meta integration not configured" }, { status: 503 });
  }
  const mode = req.nextUrl.searchParams.get("hub.mode");
  const token = req.nextUrl.searchParams.get("hub.verify_token");
  const challenge = req.nextUrl.searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === getMetaWebhookVerifyToken() && challenge) {
    return new NextResponse(challenge, { status: 200 });
  }
  return NextResponse.json({ error: "Verification failed" }, { status: 403 });
}

function pick(fields: Record<string, string>, names: string[]): string | undefined {
  for (const n of names) {
    if (fields[n]) return fields[n];
  }
  return undefined;
}

export async function POST(req: NextRequest) {
  if (!isMetaConfigured()) {
    return NextResponse.json({ error: "Meta integration not configured" }, { status: 503 });
  }

  const rawBody = await req.text();

  // Verify the request genuinely came from Meta (HMAC over the raw body
  // using the app secret) before trusting anything in it.
  const signature = req.headers.get("x-hub-signature-256");
  const appSecret = process.env.META_APP_SECRET;
  if (signature && appSecret) {
    const expected = "sha256=" + crypto.createHmac("sha256", appSecret).update(rawBody).digest("hex");
    const sigBuf = Buffer.from(signature);
    const expBuf = Buffer.from(expected);
    const valid = sigBuf.length === expBuf.length && crypto.timingSafeEqual(sigBuf, expBuf);
    if (!valid) return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: {
    entry?: { id?: string; changes?: { field?: string; value?: { leadgen_id?: string; page_id?: string } }[] }[];
  };
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Meta expects a fast 200 to acknowledge receipt; process inline since a
  // single Graph API lookup + DB write comfortably fits within the timeout.
  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      if (change.field !== "leadgen" || !change.value?.leadgen_id) continue;
      const pageId = change.value.page_id ?? entry.id;
      const leadgenId = change.value.leadgen_id;
      try {
        await processLeadgenEvent(pageId, leadgenId);
      } catch (err) {
        // Log and move on — one bad event shouldn't fail the whole batch,
        // and Meta will retry the delivery on a non-2xx response anyway.
        console.error("Meta leadgen webhook processing failed", { pageId, leadgenId, err });
      }
    }
  }

  return NextResponse.json({ ok: true });
}

async function processLeadgenEvent(pageId: string | undefined, leadgenId: string) {
  if (!pageId) return;
  const integration = await prisma.metaIntegration.findFirst({ where: { pageId } });
  if (!integration || integration.status !== "CONNECTED") return;

  // Already processed this exact lead (Meta occasionally redelivers)?
  const existing = await prisma.lead.findUnique({
    where: { organizationId_externalId: { organizationId: integration.organizationId, externalId: leadgenId } },
  });
  if (existing) return;

  const fields = await fetchLeadFields(leadgenId, integration.pageAccessToken);
  const fullName = pick(fields, ["full_name", "name"]) ??
    [pick(fields, ["first_name"]), pick(fields, ["last_name"])].filter(Boolean).join(" ").trim();
  const email = pick(fields, ["email"]);
  const phone = pick(fields, ["phone_number", "phone"]);

  if (!fullName || (!email && !phone)) {
    console.error("Meta lead missing required fields, skipped", { leadgenId, fields: Object.keys(fields) });
    return;
  }

  await prisma.lead.create({
    data: {
      organizationId: integration.organizationId,
      fullName,
      email,
      phone,
      source: "META_ADS",
      stage: "NEW",
      externalId: leadgenId,
      lastActivityAt: new Date(),
    },
  });

  await prisma.metaIntegration.update({
    where: { id: integration.id },
    data: { lastLeadAt: new Date() },
  });
}
