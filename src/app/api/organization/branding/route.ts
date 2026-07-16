import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession, handleApiError } from "@/lib/api-guard";
import { logAudit } from "@/lib/audit";

// The org's own logo, shown in the dashboard sidebar in place of the
// EnrolEasy wordmark — separate from Invoicer.logoUrl (which brands
// invoices/receipts/payslips and can differ per billing entity).
// OWNER-only, matching the rest of org-wide branding/identity settings.
const OWNER_ONLY = ["OWNER"] as const;

const updateSchema = z.object({
  logoUrl: z.string().url().nullable(),
});

export async function GET() {
  try {
    const session = await requireSession([...OWNER_ONLY]);
    const organization = await prisma.organization.findUnique({
      where: { id: session.organizationId },
      select: { id: true, name: true, logoUrl: true },
    });
    return NextResponse.json({ organization });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await requireSession([...OWNER_ONLY]);
    const before = await prisma.organization.findUnique({
      where: { id: session.organizationId },
      select: { id: true, name: true, logoUrl: true },
    });
    const body = updateSchema.parse(await req.json());
    const organization = await prisma.organization.update({
      where: { id: session.organizationId },
      data: { logoUrl: body.logoUrl },
      select: { id: true, name: true, logoUrl: true },
    });
    await logAudit({
      organizationId: session.organizationId,
      actorId: session.userId,
      action: "update",
      entityType: "Organization",
      entityId: session.organizationId,
      before,
      after: organization,
    });
    return NextResponse.json({ organization });
  } catch (err) {
    return handleApiError(err);
  }
}
