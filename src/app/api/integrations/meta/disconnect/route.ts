import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, handleApiError } from "@/lib/api-guard";

export async function POST() {
  try {
    const session = await requireSession(["OWNER", "ADMIN"]);
    await prisma.metaIntegration.deleteMany({ where: { organizationId: session.organizationId } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
