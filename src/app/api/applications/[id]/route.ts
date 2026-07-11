import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession, handleApiError, ApiError } from "@/lib/api-guard";
import { logAudit } from "@/lib/audit";

const updateSchema = z.object({
  status: z.enum([
    "DRAFT", "SUBMITTED", "UNDER_REVIEW", "OFFER_CONDITIONAL", "OFFER_UNCONDITIONAL",
    "DEPOSIT_PAID", "VISA_APPLIED", "VISA_APPROVED", "REJECTED", "WITHDRAWN",
  ]).optional(),
  submittedAt: z.string().datetime().optional(),
  decisionAt: z.string().datetime().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await requireSession(["OWNER", "ADMIN", "COUNSELOR", "DOCUMENTATION_OFFICER"]);
    const existing = await prisma.application.findUnique({ where: { id } });
    if (!existing || existing.organizationId !== session.organizationId) {
      throw new ApiError(404, "Application not found");
    }
    const body = updateSchema.parse(await req.json());
    const application = await prisma.application.update({
      where: { id },
      data: {
        ...body,
        submittedAt: body.submittedAt ? new Date(body.submittedAt) : undefined,
        decisionAt: body.decisionAt ? new Date(body.decisionAt) : undefined,
      },
    });
    await logAudit({
      organizationId: session.organizationId,
      actorId: session.userId,
      action: "update",
      entityType: "Application",
      entityId: id,
      before: existing,
      after: application,
    });
    return NextResponse.json({ application });
  } catch (err) {
    return handleApiError(err);
  }
}
