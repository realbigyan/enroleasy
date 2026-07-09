import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession, handleApiError } from "@/lib/api-guard";

export async function GET() {
  try {
    const session = await requireSession();
    const [notifications, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: { organizationId: session.organizationId, recipientId: session.userId },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
      prisma.notification.count({
        where: { organizationId: session.organizationId, recipientId: session.userId, read: false },
      }),
    ]);
    return NextResponse.json({ notifications, unreadCount });
  } catch (err) {
    return handleApiError(err);
  }
}

const updateSchema = z.object({
  id: z.string().optional(), // mark a single notification read
  markAll: z.boolean().optional(),
});

export async function PATCH(req: NextRequest) {
  try {
    const session = await requireSession();
    const body = updateSchema.parse(await req.json());

    if (body.markAll) {
      await prisma.notification.updateMany({
        where: { organizationId: session.organizationId, recipientId: session.userId, read: false },
        data: { read: true },
      });
      return NextResponse.json({ ok: true });
    }

    if (body.id) {
      await prisma.notification.updateMany({
        where: { id: body.id, organizationId: session.organizationId, recipientId: session.userId },
        data: { read: true },
      });
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
