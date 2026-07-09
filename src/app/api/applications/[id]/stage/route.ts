import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession, handleApiError, ApiError } from "@/lib/api-guard";
import { STAGE_VALUES, STAGE_LABELS } from "@/lib/application-stages";

const updateSchema = z
  .object({
    stage: z.enum(STAGE_VALUES),
    otherLabel: z.string().optional().nullable(),
    note: z.string().optional().nullable(),
  })
  .refine((v) => v.stage !== "OTHER" || (v.otherLabel && v.otherLabel.trim().length > 0), {
    message: "otherLabel is required when stage is OTHER",
    path: ["otherLabel"],
  });

// Documentation Officers manually record each stage of the offline
// university/visa process (this varies by destination country, hence the
// free-text OTHER option). Every change is also written to the shared
// ActivityLog so there's a full audit trail, visible on the student's
// activity timeline too.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await requireSession(["OWNER", "ADMIN", "DOCUMENTATION_OFFICER"]);
    const body = updateSchema.parse(await req.json());

    const existing = await prisma.application.findUnique({ where: { id } });
    if (!existing || existing.organizationId !== session.organizationId) {
      throw new ApiError(404, "Application not found");
    }

    const label = body.stage === "OTHER" ? body.otherLabel!.trim() : STAGE_LABELS[body.stage];

    const [application] = await prisma.$transaction([
      prisma.application.update({
        where: { id },
        data: {
          currentStage: body.stage,
          currentStageOther: body.stage === "OTHER" ? body.otherLabel!.trim() : null,
          currentStageUpdatedAt: new Date(),
        },
      }),
      prisma.activityLog.create({
        data: {
          organizationId: session.organizationId,
          applicationId: id,
          studentId: existing.studentId,
          authorId: session.userId,
          type: "stage_change",
          description: body.note ? `Stage set to "${label}" — ${body.note}` : `Stage set to "${label}"`,
        },
      }),
    ]);

    return NextResponse.json({ application });
  } catch (err) {
    return handleApiError(err);
  }
}
