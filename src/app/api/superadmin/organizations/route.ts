import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin, handleApiError } from "@/lib/api-guard";

// Platform-wide view across every consultancy — only a superadmin can see
// other tenants' organizations at all; every other endpoint in the app is
// scoped to session.organizationId.
export async function GET() {
  try {
    await requireSuperAdmin();
    const organizations = await prisma.organization.findMany({
      include: {
        subscription: true,
        _count: { select: { users: true, students: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ organizations });
  } catch (err) {
    return handleApiError(err);
  }
}
