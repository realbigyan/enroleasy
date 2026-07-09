import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession, handleApiError, ApiError } from "@/lib/api-guard";

const schema = z.object({
  questionId: z.string(),
  responseText: z.string().optional().nullable(),
  responseAudioUrl: z.string().optional().nullable(),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: attemptId } = await params;
    await requireSession();
    const body = schema.parse(await req.json());

    const attempt = await prisma.testAttempt.findUnique({ where: { id: attemptId } });
    if (!attempt) throw new ApiError(404, "Attempt not found");
    if (attempt.status !== "IN_PROGRESS") throw new ApiError(400, "Attempt already submitted");

    const question = await prisma.question.findUnique({ where: { id: body.questionId } });
    if (!question) throw new ApiError(404, "Question not found");

    // Auto-grade objective question types immediately; essays/speaking are
    // graded on submit (placeholder for future AI-scoring integration).
    let isCorrect: boolean | null = null;
    let scoreAwarded: number | null = null;
    if (["MULTIPLE_CHOICE", "TRUE_FALSE_NOTGIVEN", "MATCHING", "FILL_BLANK"].includes(question.type)) {
      const correct = JSON.stringify(question.correctAnswer).toLowerCase();
      const given = JSON.stringify(body.responseText ?? "").toLowerCase();
      isCorrect = correct === given;
      scoreAwarded = isCorrect ? question.maxScore : 0;
    }

    const answer = await prisma.answer.upsert({
      where: { attemptId_questionId: { attemptId, questionId: body.questionId } },
      create: {
        attemptId,
        questionId: body.questionId,
        responseText: body.responseText,
        responseAudioUrl: body.responseAudioUrl,
        isCorrect,
        scoreAwarded,
      },
      update: {
        responseText: body.responseText,
        responseAudioUrl: body.responseAudioUrl,
        isCorrect,
        scoreAwarded,
      },
    });
    return NextResponse.json({ answer });
  } catch (err) {
    return handleApiError(err);
  }
}
