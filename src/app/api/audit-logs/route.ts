import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, handleApiError } from "@/lib/api-guard";

export async function GET() {
  try {
    const session = await requireSession(["OWNER", "ADMIN"]);
    const logs = await prisma.auditLog.findMany({
      where: { organizationId: session.organizationId },
      include: { actor: true },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    return NextResponse.json({ logs });
  } catch (err) {
    return handleApiError(err);
  }
}
