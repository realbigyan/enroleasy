import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiKey, handleApiKeyError } from "@/lib/api-keys";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { logAudit } from "@/lib/audit";

const createSchema = z.object({
  fullName: z.string().min(2),
  email: z.string().email().optional().nullable(),
  phone: z.string().optional().nullable(),
  passportNo: z.string().optional().nullable(),
});

export async function GET(req: NextRequest) {
  try {
    const key = await requireApiKey(req);
    const { allowed, retryAfterSeconds } = await checkRateLimit(`v1:${key.apiKeyId}`, 120, 60);
    if (!allowed) return rateLimitResponse(retryAfterSeconds);

    const q = req.nextUrl.searchParams.get("q");
    const students = await prisma.student.findMany({
      where: {
        organizationId: key.organizationId,
        ...(q ? { fullName: { contains: q, mode: "insensitive" } } : {}),
      },
      orderBy: { updatedAt: "desc" },
      take: 100,
    });
    return NextResponse.json({ students });
  } catch (err) {
    return handleApiKeyError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const key = await requireApiKey(req, { requireWrite: true });
    const { allowed, retryAfterSeconds } = await checkRateLimit(`v1:${key.apiKeyId}`, 120, 60);
    if (!allowed) return rateLimitResponse(retryAfterSeconds);

    const body = createSchema.parse(await req.json());
    const student = await prisma.student.create({
      data: { ...body, organizationId: key.organizationId },
    });

    await logAudit({
      organizationId: key.organizationId,
      actorId: null,
      action: "create",
      entityType: "Student",
      entityId: student.id,
      after: student,
    });

    return NextResponse.json({ student }, { status: 201 });
  } catch (err) {
    return handleApiKeyError(err);
  }
}
