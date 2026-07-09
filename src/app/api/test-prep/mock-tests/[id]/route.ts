import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, handleApiError, ApiError } from "@/lib/api-guard";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await requireSession();
    const mockTest = await prisma.mockTest.findUnique({
      where: { id },
      include: {
        questions: {
          select: {
            id: true, skill: true, type: true, prompt: true, passageText: true,
            audioUrl: true, imageUrl: true, options: true, maxScore: true,
            // correctAnswer intentionally withheld from the client
          },
        },
      },
    });
    if (!mockTest) throw new ApiError(404, "Mock test not found");
    return NextResponse.json({ mockTest });
  } catch (err) {
    return handleApiError(err);
  }
}
