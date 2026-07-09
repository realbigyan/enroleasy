import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, handleApiError, ApiError } from "@/lib/api-guard";
import type { SkillArea, TestType } from "@prisma/client";

function scoreForSkill(testType: TestType, pct: number): number {
  switch (testType) {
    case "IELTS":
      return Math.round(pct * 9 * 2) / 2; // nearest 0.5, 0-9
    case "PTE":
      return Math.round(10 + pct * 80); // 10-90
    case "DUOLINGO":
      return Math.round(10 + pct * 150); // 10-160
    default:
      return Math.round(pct * 100);
  }
}

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: attemptId } = await params;
    await requireSession();

    const attempt = await prisma.testAttempt.findUnique({
      where: { id: attemptId },
      include: { mockTest: true, answers: { include: { question: true } } },
    });
    if (!attempt) throw new ApiError(404, "Attempt not found");
    if (attempt.status !== "IN_PROGRESS") throw new ApiError(400, "Attempt already submitted");

    // Give an ungraded score to subjective answers so the attempt can be
    // finalized immediately. Replace with a real AI-scoring call later —
    // aiFeedback flags these as pending expert/AI review in the meantime.
    for (const answer of attempt.answers) {
      if (answer.scoreAwarded === null) {
        const placeholder = answer.responseText ? answer.question.maxScore * 0.6 : 0;
        await prisma.answer.update({
          where: { id: answer.id },
          data: {
            scoreAwarded: placeholder,
            aiFeedback: answer.responseText
              ? "Provisional score — pending full review of written/spoken response."
              : "No response submitted.",
          },
        });
      }
    }

    const scored = await prisma.answer.findMany({
      where: { attemptId },
      include: { question: true },
    });

    const bySkill = new Map<SkillArea, { earned: number; max: number }>();
    for (const a of scored) {
      const bucket = bySkill.get(a.question.skill) ?? { earned: 0, max: 0 };
      bucket.earned += a.scoreAwarded ?? 0;
      bucket.max += a.question.maxScore;
      bySkill.set(a.question.skill, bucket);
    }

    const skillScores: Record<string, number> = {};
    let totalEarned = 0;
    let totalMax = 0;
    for (const [skill, { earned, max }] of bySkill.entries()) {
      const pct = max > 0 ? earned / max : 0;
      skillScores[skill] = scoreForSkill(attempt.mockTest.testType, pct);
      totalEarned += earned;
      totalMax += max;
    }
    const overallPct = totalMax > 0 ? totalEarned / totalMax : 0;
    const overallBand = scoreForSkill(attempt.mockTest.testType, overallPct);

    const updated = await prisma.testAttempt.update({
      where: { id: attemptId },
      data: {
        status: "SCORED",
        submittedAt: new Date(),
        overallBand,
        listeningScore: skillScores["LISTENING"] ?? null,
        readingScore: skillScores["READING"] ?? null,
        writingScore: skillScores["WRITING"] ?? null,
        speakingScore: skillScores["SPEAKING"] ?? null,
      },
    });

    return NextResponse.json({ attempt: updated });
  } catch (err) {
    return handleApiError(err);
  }
}
