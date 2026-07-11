import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, handleApiError } from "@/lib/api-guard";
import { logAudit } from "@/lib/audit";

export async function POST() {
  try {
    const session = await requireSession(["OWNER", "ADMIN"]);
    const existing = await prisma.metaIntegration.findUnique({ where: { organizationId: session.organizationId } });
    await prisma.metaIntegration.deleteMany({ where: { organizationId: session.organizationId } });
    await logAudit({
      organizationId: session.organizationId,
      actorId: session.userId,
      action: "delete",
      entityType: "MetaIntegration",
      entityId: existing?.id ?? session.organizationId,
      before: existing ?? undefined,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
