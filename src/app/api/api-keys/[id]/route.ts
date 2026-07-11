import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, ApiError, handleApiError } from "@/lib/api-guard";
import { logAudit } from "@/lib/audit";

// Revokes an API key. Revocation is immediate and permanent (no "un-revoke")
// — same trust model as rotating the lead-intake webhook token.
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession(["OWNER", "ADMIN"]);
    const { id } = await params;

    const key = await prisma.apiKey.findUnique({ where: { id } });
    if (!key || key.organizationId !== session.organizationId) {
      throw new ApiError(404, "API key not found");
    }

    await prisma.apiKey.update({ where: { id }, data: { revokedAt: new Date() } });

    await logAudit({
      organizationId: session.organizationId,
      actorId: session.userId,
      action: "revoke",
      entityType: "ApiKey",
      entityId: id,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
