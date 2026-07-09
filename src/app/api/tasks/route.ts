import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession, handleApiError } from "@/lib/api-guard";
import type { TaskStatus } from "@prisma/client";

const createSchema = z.object({
  title: z.string().min(2),
  dueAt: z.string().datetime().optional().nullable(),
  assignedToId: z.string().optional().nullable(),
  leadId: z.string().optional().nullable(),
  studentId: z.string().optional().nullable(),
});

export async function GET(req: NextRequest) {
  try {
    const session = await requireSession();
    const status = req.nextUrl.searchParams.get("status");
    const tasks = await prisma.task.findMany({
      where: {
        organizationId: session.organizationId,
        ...(status ? { status: status as TaskStatus } : {}),
      },
      include: { assignedTo: true, lead: true, student: true },
      orderBy: { dueAt: "asc" },
    });
    return NextResponse.json({ tasks });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession(["OWNER", "ADMIN", "COUNSELOR"]);
    const body = createSchema.parse(await req.json());
    const task = await prisma.task.create({
      data: {
        ...body,
        dueAt: body.dueAt ? new Date(body.dueAt) : null,
        organizationId: session.organizationId,
      },
    });
    return NextResponse.json({ task }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
