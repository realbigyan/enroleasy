import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession, handleApiError } from "@/lib/api-guard";
import type { LeadStage } from "@prisma/client";

const createSchema = z.object({
  fullName: z.string().min(2),
  email: z.string().email().optional().nullable(),
  phone: z.string().optional().nullable(),
  source: z.enum(["WEBSITE", "REFERRAL", "WALK_IN", "SOCIAL_MEDIA", "EVENT", "PARTNER_AGENT", "OTHER"]).optional(),
  interestedCountry: z.string().optional().nullable(),
  targetIntake: z.string().optional().nullable(),
  assignedCounselorId: z.string().optional().nullable(),
});

export async function GET(req: NextRequest) {
  try {
    const session = await requireSession();
    const stage = req.nextUrl.searchParams.get("stage");
    const leads = await prisma.lead.findMany({
      where: {
        organizationId: session.organizationId,
        ...(stage ? { stage: stage as LeadStage } : {}),
      },
      include: { assignedCounselor: true },
      orderBy: { updatedAt: "desc" },
    });
    return NextResponse.json({ leads });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession(["OWNER", "ADMIN", "COUNSELOR"]);
    const body = createSchema.parse(await req.json());
    const lead = await prisma.lead.create({
      data: { ...body, organizationId: session.organizationId },
    });
    return NextResponse.json({ lead }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
