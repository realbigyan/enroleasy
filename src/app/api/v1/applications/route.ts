import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiKey, ApiKeyError, handleApiKeyError } from "@/lib/api-keys";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { logAudit } from "@/lib/audit";
import type { ApplicationStatus } from "@prisma/client";

const createSchema = z.object({
  studentId: z.string(),
  destinationId: z.string(),
  requiredIelts: z.number().optional().nullable(),
  requiredPte: z.number().optional().nullable(),
});

export async function GET(req: NextRequest) {
  try {
    const key = await requireApiKey(req);
    const { allowed, retryAfterSeconds } = await checkRateLimit(`v1:${key.apiKeyId}`, 120, 60);
    if (!allowed) return rateLimitResponse(retryAfterSeconds);

    const status = req.nextUrl.searchParams.get("status");
    const applications = await prisma.application.findMany({
      where: {
        organizationId: key.organizationId,
        ...(status ? { status: status as ApplicationStatus } : {}),
      },
      include: { student: true, destination: true },
      orderBy: { updatedAt: "desc" },
      take: 100,
    });
    return NextResponse.json({ applications });
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

    const student = await prisma.student.findUnique({ where: { id: body.studentId } });
    if (!student || student.organizationId !== key.organizationId) {
      throw new ApiKeyError(400, "studentId does not belong to this organization");
    }
    const destination = await prisma.destination.findUnique({ where: { id: body.destinationId } });
    if (!destination || destination.organizationId !== key.organizationId) {
      throw new ApiKeyError(400, "destinationId does not belong to this organization");
    }

    const application = await prisma.application.create({
      data: { ...body, organizationId: key.organizationId },
      include: { student: true, destination: true },
    });

    await logAudit({
      organizationId: key.organizationId,
      actorId: null,
      action: "create",
      entityType: "Application",
      entityId: application.id,
      after: application,
    });

    return NextResponse.json({ application }, { status: 201 });
  } catch (err) {
    return handleApiKeyError(err);
  }
}
