import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession, handleApiError } from "@/lib/api-guard";
import { notifyRole } from "@/lib/notify";
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
    const session = await requireSession(["OWNER", "ADMIN", "COUNSELOR", "DOCUMENTATION_OFFICER"]);
    const body = createSchema.parse(await req.json());
    const application = await prisma.application.create({
      data: { ...body, organizationId: session.organizationId },
      include: { student: true, destination: true },
    });

    // Documentation Officers pick up new applications from here — they don't
    // watch the counsellor's workflow directly, so this is their trigger to
    // start the offline university/visa process.
    notifyRole({
      organizationId: session.organizationId,
      roles: ["DOCUMENTATION_OFFICER"],
      type: "application_created",
      title: "New application to process",
      body: `${application.student.fullName} → ${application.destination.university} (${application.destination.course})`,
      link: `/dashboard/students/${application.studentId}`,
    }).catch((err) => console.error("Failed to notify documentation officers:", err));

    return NextResponse.json({ application }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
