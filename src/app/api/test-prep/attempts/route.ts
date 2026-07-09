import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession, handleApiError, ApiError } from "@/lib/api-guard";

const createSchema = z.object({
  mockTestId: z.string(),
  studentId: z.string().optional().nullable(),
});

export async function GET() {
  try {
    const session = await requireSession();
    const student = await prisma.student.findUnique({ where: { userId: session.userId } });
    const attempts = await prisma.testAttempt.findMany({
      where:
        session.role === "STUDENT"
          ? { OR: [{ userId: session.userId }, { studentId: student?.id }] }
          : { mockTest: { organizationId: session.organizationId } },
      include: { mockTest: true },
      orderBy: { startedAt: "desc" },
    });
    return NextResponse.json({ attempts });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    const body = createSchema.parse(await req.json());

    const mockTest = await prisma.mockTest.findUnique({ where: { id: body.mockTestId } });
    if (!mockTest) throw new ApiError(404, "Mock test not found");
    if (mockTest.organizationId && mockTest.organizationId !== session.organizationId) {
      throw new ApiError(403, "Mock test not available for this organization");
    }

    let studentId = body.studentId ?? null;
    if (session.role === "STUDENT") {
      const student = await prisma.student.findUnique({ where: { userId: session.userId } });
      studentId = student?.id ?? null;
    }

    const attempt = await prisma.testAttempt.create({
      data: {
        mockTestId: mockTest.id,
        studentId,
        userId: session.userId,
        status: "IN_PROGRESS",
      },
    });
    return NextResponse.json({ attempt }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
