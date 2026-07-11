import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession, handleApiError } from "@/lib/api-guard";
import { logAudit } from "@/lib/audit";

const createSchema = z.object({
  country: z.string(),
  university: z.string(),
  course: z.string(),
  intake: z.string(),
  tuitionFeeUsd: z.number().optional().nullable(),
});

export async function GET() {
  try {
    const session = await requireSession();
    const destinations = await prisma.destination.findMany({
      where: { organizationId: session.organizationId },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ destinations });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession(["OWNER", "ADMIN", "COUNSELOR"]);
    const body = createSchema.parse(await req.json());
    const destination = await prisma.destination.create({
      data: { ...body, organizationId: session.organizationId },
    });
    await logAudit({
      organizationId: session.organizationId,
      actorId: session.userId,
      action: "create",
      entityType: "Destination",
      entityId: destination.id,
      after: destination,
    });
    return NextResponse.json({ destination }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
