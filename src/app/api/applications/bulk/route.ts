import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession, handleApiError, ApiError } from "@/lib/api-guard";
import { logAudit } from "@/lib/audit";

const STATUSES = [
  "DRAFT", "SUBMITTED", "UNDER_REVIEW", "OFFER_CONDITIONAL", "OFFER_UNCONDITIONAL",
  "DEPOSIT_PAID", "VISA_APPLIED", "VISA_APPROVED", "REJECTED", "WITHDRAWN",
] as const;

const bodySchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("changeStatus"), ids: z.array(z.string()).min(1).max(500), status: z.enum(STATUSES) }),
  z.object({ action: z.literal("assignDocOfficer"), ids: z.array(z.string()).min(1).max(500), docOfficerId: z.string().nullable() }),
]);

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession(["OWNER", "ADMIN", "COUNSELOR", "DOCUMENTATION_OFFICER"]);
    const body = bodySchema.parse(await req.json());

    let affected = 0;

    if (body.action === "changeStatus") {
      const result = await prisma.application.updateMany({
        where: { id: { in: body.ids }, organizationId: session.organizationId },
        data: { status: body.status },
      });
      affected = result.count;
    } else {
      if (body.docOfficerId) {
        const officer = await prisma.user.findUnique({ where: { id: body.docOfficerId } });
        if (
          !officer ||
          officer.organizationId !== session.organizationId ||
          officer.role !== "DOCUMENTATION_OFFICER" ||
          !officer.isActive
        ) {
          throw new ApiError(400, "Selected documentation officer is not valid");
        }
      }
      const result = await prisma.application.updateMany({
        where: { id: { in: body.ids }, organizationId: session.organizationId },
        data: { assignedDocOfficerId: body.docOfficerId },
      });
      affected = result.count;
    }

    await logAudit({
      organizationId: session.organizationId,
      actorId: session.userId,
      action: `bulk_${body.action}`,
      entityType: "Application",
      entityId: `bulk:${affected}`,
      after: body,
    });

    return NextResponse.json({ ok: true, affected });
  } catch (err) {
    return handleApiError(err);
  }
}
