import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, handleApiError } from "@/lib/api-guard";
import type { TestType } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    const session = await requireSession();
    const testType = req.nextUrl.searchParams.get("type"); // IELTS | PTE | DUOLINGO
    const mockTests = await prisma.mockTest.findMany({
      where: {
        isPublished: true,
        OR: [{ organizationId: session.organizationId }, { organizationId: null }],
        ...(testType ? { testType: testType as TestType } : {}),
      },
      include: { _count: { select: { questions: true } } },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ mockTests });
  } catch (err) {
    return handleApiError(err);
  }
}
