import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession, handleApiError, ApiError } from "@/lib/api-guard";
import { logAudit } from "@/lib/audit";

const bodySchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("archive"), ids: z.array(z.string()).min(1).max(500) }),
  z.object({ action: z.literal("unarchive"), ids: z.array(z.string()).min(1).max(500) }),
  z.object({ action: z.literal("addTag"), ids: z.array(z.string()).min(1).max(500), tag: z.string().min(1).max(40) }),
]);

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession(["OWNER", "ADMIN", "ADMIN_ASSIST", "COUNSELOR"]);
    const body = bodySchema.parse(await req.json());

    if ((body.action === "archive" || body.action === "unarchive") && !["OWNER", "ADMIN"].includes(session.role)) {
      throw new ApiError(403, "Insufficient permissions");
    }

    let affected = 0;

    if (body.action === "archive" || body.action === "unarchive") {
      const result = await prisma.student.updateMany({
        where: { id: { in: body.ids }, organizationId: session.organizationId },
        data: { archivedAt: body.action === "archive" ? new Date() : null },
      });
      affected = result.count;
    } else {
      const students = await prisma.student.findMany({
        where: { id: { in: body.ids }, organizationId: session.organizationId },
        select: { id: true, tags: true },
      });
      await prisma.$transaction(
        students
          .filter((s) => !s.tags.includes(body.tag))
          .map((s) =>
            prisma.student.update({ where: { id: s.id }, data: { tags: [...s.tags, body.tag] } })
          )
      );
      affected = students.length;
    }

    await logAudit({
      organizationId: session.organizationId,
      actorId: session.userId,
      action: `bulk_${body.action}`,
      entityType: "Student",
      entityId: `bulk:${affected}`,
      after: body,
    });

    return NextResponse.json({ ok: true, affected });
  } catch (err) {
    return handleApiError(err);
  }
}
