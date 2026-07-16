import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession, handleApiError } from "@/lib/api-guard";
import { logAudit } from "@/lib/audit";

const createSchema = z.object({
  name: z.string().min(2),
  type: z.enum(["REFERRAL", "B2B_APPLICATION", "EXAM_BODY"]).default("REFERRAL"),
  contactEmail: z.string().email().optional().nullable(),
  contactPhone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  panNumber: z.string().optional().nullable(),
  commissionPct: z.number().optional().nullable(),
});

export async function GET(req: NextRequest) {
  try {
    const session = await requireSession();
    const type = req.nextUrl.searchParams.get("type");
    const partners = await prisma.partner.findMany({
      where: {
        organizationId: session.organizationId,
        ...(type ? { type: type as "REFERRAL" | "B2B_APPLICATION" | "EXAM_BODY" } : {}),
      },
      include: {
        _count: { select: { referredLeads: true, referredStudents: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ partners });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession(["OWNER", "ADMIN"]);
    const body = createSchema.parse(await req.json());
    const partner = await prisma.partner.create({
      data: { ...body, organizationId: session.organizationId },
    });
    await logAudit({
      organizationId: session.organizationId,
      actorId: session.userId,
      action: "create",
      entityType: "Partner",
      entityId: partner.id,
      after: partner,
    });
    return NextResponse.json({ partner }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
