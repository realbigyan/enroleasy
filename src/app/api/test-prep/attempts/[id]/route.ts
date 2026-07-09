import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, handleApiError, ApiError } from "@/lib/api-guard";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await requireSession();
    const attempt = await prisma.testAttempt.findUnique({
      where: { id },
      include: {
        mockTest: { include: { questions: true } },
        answers: { include: { question: true } },
      },
    });
    if (!attempt) throw new ApiError(404, "Attempt not found");
    return NextResponse.json({ attempt });
  } catch (err) {
    return handleApiError(err);
  }
}
