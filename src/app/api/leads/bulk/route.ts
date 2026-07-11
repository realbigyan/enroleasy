import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession, handleApiError, ApiError } from "@/lib/api-guard";
import { logAudit } from "@/lib/audit";

const LEAD_STAGES = [
  "NEW", "CONTACTED", "TRIAL_BOOKED", "TRIAL_DONE", "QUALIFIED", "COUNSELING",
  "APPLICATION_STARTED", "OFFER_RECEIVED", "VISA_STAGE", "ENROLLED", "LOST",
] as const;

const bodySchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("changeStage"), ids: z.array(z.string()).min(1).max(500), stage: z.enum(LEAD_STAGES) }),
  z.object({ action: z.literal("assignCounselor"), ids: z.array(z.string()).min(1).max(500), counselorId: z.string().nullable() }),
  z.object({ action: z.literal("addTag"), ids: z.array(z.string()).min(1).max(500), tag: z.string().min(1).max(40) }),
  z.object({ action: z.literal("delete"), ids: z.array(z.string()).min(1).max(500) }),
]);

// Bulk actions scope every write to `organizationId: session.organizationId`
// in addition to `id IN (ids)`, so an id belonging to another org (or one
// that doesn't exist) is just silently excluded rather than erroring —
// same "quiet exclusion" pattern as any other org-scoped findMany.
export async function POST(req: NextRequest) {
  try {
    const session = await requireSession(["OWNER", "ADMIN", "COUNSELOR"]);
    const body = bodySchema.parse(await req.json());

    if (body.action === "delete" && !["OWNER", "ADMIN"].includes(session.role)) {
      throw new ApiError(403, "Insufficient permissions");
    }

    let affected = 0;

    if (body.action === "changeStage") {
      const result = await prisma.lead.updateMany({
        where: { id: { in: body.ids }, organizationId: session.organizationId },
        data: { stage: body.stage },
      });
      affected = result.count;
    } else if (body.action === "assignCounselor") {
      if (body.counselorId) {
        const counselor = await prisma.user.findUnique({ where: { id: body.counselorId } });
        if (!counselor || counselor.organizationId !== session.organizationId || !counselor.isActive) {
          throw new ApiError(400, "Selected counselor is not valid");
        }
      }
      const result = await prisma.lead.updateMany({
        where: { id: { in: body.ids }, organizationId: session.organizationId },
        data: { assignedCounselorId: body.counselorId },
      });
      affected = result.count;
    } else if (body.action === "addTag") {
      const leads = await prisma.lead.findMany({
        where: { id: { in: body.ids }, organizationId: session.organizationId },
        select: { id: true, tags: true },
      });
      await prisma.$transaction(
        leads
          .filter((l) => !l.tags.includes(body.tag))
          .map((l) =>
            prisma.lead.update({ where: { id: l.id }, data: { tags: [...l.tags, body.tag] } })
          )
      );
      affected = leads.length;
    } else {
      const result = await prisma.lead.deleteMany({
        where: { id: { in: body.ids }, organizationId: session.organizationId },
      });
      affected = result.count;
    }

    await logAudit({
      organizationId: session.organizationId,
      actorId: session.userId,
      action: `bulk_${body.action}`,
      entityType: "Lead",
      entityId: `bulk:${affected}`,
      after: body,
    });

    return NextResponse.json({ ok: true, affected });
  } catch (err) {
    return handleApiError(err);
  }
}
