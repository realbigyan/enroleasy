import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { requireSession, handleApiError } from "@/lib/api-guard";

// Manages the org's secret lead-intake webhook token (option 1 of the lead
// integrations feature). The token is embedded in the webhook URL itself
// (e.g. .../api/public/leads/webhook/<token>) rather than sent as a header,
// since no-code tools like Zapier/Make handle a plain POST URL with zero
// extra configuration.
function generateToken(): string {
  return crypto.randomBytes(24).toString("hex");
}

export async function GET() {
  try {
    const session = await requireSession(["OWNER", "ADMIN"]);
    let org = await prisma.organization.findUnique({
      where: { id: session.organizationId },
      select: { leadWebhookToken: true, slug: true },
    });
    if (!org?.leadWebhookToken) {
      const token = generateToken();
      org = await prisma.organization.update({
        where: { id: session.organizationId },
        data: { leadWebhookToken: token },
        select: { leadWebhookToken: true, slug: true },
      });
    }
    // slug is also returned here (not just the token) since the Integrations
    // page needs it to build the reception/walk-in kiosk link + QR code.
    return NextResponse.json({ token: org.leadWebhookToken, orgSlug: org.slug });
  } catch (err) {
    return handleApiError(err);
  }
}

// Rotates the token — invalidates the old webhook URL immediately (any Zap
// or scenario still pointed at the old URL will start getting 404s).
export async function POST() {
  try {
    const session = await requireSession(["OWNER", "ADMIN"]);
    const token = generateToken();
    await prisma.organization.update({
      where: { id: session.organizationId },
      data: { leadWebhookToken: token },
    });
    return NextResponse.json({ token });
  } catch (err) {
    return handleApiError(err);
  }
}
