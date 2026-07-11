import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession, handleApiError, ApiError } from "@/lib/api-guard";
import { logAudit } from "@/lib/audit";
import { getOrCreateStageConfigs } from "@/lib/pipeline-stages";

export async function GET() {
  try {
    const session = await requireSession();
    const configs = await getOrCreateStageConfigs(session.organizationId);
    return NextResponse.json({ stages: configs });
  } catch (err) {
    return handleApiError(err);
  }
}

const updateSchema = z.object({
  stages: z
    .array(
      z.object({
        id: z.string(),
        label: z.string().min(1).max(40),
        order: z.number().int(),
        isActive: z.boolean(),
      })
    )
    .min(1),
});

// Bulk update — the Customize page always sends the full set back together
// (reorder/relabel/toggle all happen client-side then save at once).
export async function PATCH(req: NextRequest) {
  try {
    const session = await requireSession(["OWNER", "ADMIN"]);
    const body = updateSchema.parse(await req.json());

    const existing = await prisma.pipelineStageConfig.findMany({
      where: { organizationId: session.organizationId },
    });
    const existingIds = new Set(existing.map((c) => c.id));
    for (const s of body.stages) {
      if (!existingIds.has(s.id)) throw new ApiError(404, "Stage config not found");
    }
    if (body.stages.every((s) => !s.isActive)) {
      throw new ApiError(400, "At least one stage must remain visible");
    }

    await prisma.$transaction(
      body.stages.map((s) =>
        prisma.pipelineStageConfig.update({
          where: { id: s.id },
          data: { label: s.label, order: s.order, isActive: s.isActive },
        })
      )
    );

    await logAudit({
      organizationId: session.organizationId,
      actorId: session.userId,
      action: "update",
      entityType: "PipelineStageConfig",
      entityId: session.organizationId,
      before: existing,
      after: body.stages,
    });

    const configs = await getOrCreateStageConfigs(session.organizationId);
    return NextResponse.json({ stages: configs });
  } catch (err) {
    return handleApiError(err);
  }
}
