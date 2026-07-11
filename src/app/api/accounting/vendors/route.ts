import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession, handleApiError } from "@/lib/api-guard";
import { logAudit } from "@/lib/audit";

const ACCOUNTING_ROLES = ["OWNER", "ADMIN"] as const;

const createSchema = z.object({
  name: z.string().min(1),
  panNumber: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  phone: z.string().optional().nullable(),
});

export async function GET() {
  try {
    const session = await requireSession([...ACCOUNTING_ROLES]);
    const vendors = await prisma.vendor.findMany({
      where: { organizationId: session.organizationId },
      orderBy: { name: "asc" },
    });
    return NextResponse.json({ vendors });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession([...ACCOUNTING_ROLES]);
    const body = createSchema.parse(await req.json());
    const vendor = await prisma.vendor.create({
      data: { organizationId: session.organizationId, ...body },
    });
    await logAudit({
      organizationId: session.organizationId,
      actorId: session.userId,
      action: "create",
      entityType: "Vendor",
      entityId: vendor.id,
      after: vendor,
    });
    return NextResponse.json({ vendor }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
