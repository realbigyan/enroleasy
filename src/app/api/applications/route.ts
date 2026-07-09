import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession, handleApiError, ApiError } from "@/lib/api-guard";
import { notifyRole, notifyUsers } from "@/lib/notify";
import type { ApplicationStatus } from "@prisma/client";

const createSchema = z.object({
  studentId: z.string(),
  destinationId: z.string(),
  requiredIelts: z.number().optional().nullable(),
  requiredPte: z.number().optional().nullable(),
  assignedDocOfficerId: z.string().optional().nullable(),
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
      include: { student: true, destination: true, assignedDocOfficer: true },
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

    if (body.assignedDocOfficerId) {
      const officer = await prisma.user.findUnique({ where: { id: body.assignedDocOfficerId } });
      if (
        !officer ||
        officer.organizationId !== session.organizationId ||
        officer.role !== "DOCUMENTATION_OFFICER" ||
        !officer.isActive
      ) {
        throw new ApiError(400, "Selected documentation officer is not valid");
      }
    }

    const application = await prisma.application.create({
      data: { ...body, organizationId: session.organizationId },
      include: { student: true, destination: true, assignedDocOfficer: true },
    });

    // Notify whoever needs to pick this up next: the specifically assigned
    // Documentation Officer if one was chosen, otherwise fall back to
    // pinging every Documentation Officer in the org.
    const notifyPromise = body.assignedDocOfficerId
      ? notifyUsers({
          organizationId: session.organizationId,
          userIds: [body.assignedDocOfficerId],
          type: "application_created",
          title: "New application assigned to you",
          body: `${application.student.fullName} → ${application.destination.university} (${application.destination.course})`,
          link: `/dashboard/students/${application.studentId}`,
        })
      : notifyRole({
          organizationId: session.organizationId,
          roles: ["DOCUMENTATION_OFFICER"],
          type: "application_created",
          title: "New application to process",
          body: `${application.student.fullName} → ${application.destination.university} (${application.destination.course})`,
          link: `/dashboard/students/${application.studentId}`,
        });
    notifyPromise.catch((err) => console.error("Failed to notify documentation officer(s):", err));

    return NextResponse.json({ application }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
