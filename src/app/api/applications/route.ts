import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession, handleApiError } from "@/lib/api-guard";
import type { ApplicationStatus } from "@prisma/client";

const createSchema = z.object({
  studentId: z.string(),
  destinationId: z.string(),
  requiredIelts: z.number().optional().nullable(),
  requiredPte: z.number().optional().nullable(),
});

export async function GET(req: NextRequest) {
  try {
    const session = await requireSession();
    const status = req.nextUrl.searchParams.get("status");
    const applications = await prisma.application.findMany({
      where: {
        organizationId: session.organizationId,
        ...(status ? { status: status as ApplicationStatus } : {}),
      },
      include: { student: true, destination: true },
      orderBy: { updatedAt: "desc" },
    });
    return NextResponse.json({ applications });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession(["OWNER", "ADMIN", "COUNSELOR"]);
    const body = createSchema.parse(await req.json());
    const application = await prisma.application.create({
      data: { ...body, organizationId: session.organizationId },
    });
    return NextResponse.json({ application }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
