import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession, handleApiError } from "@/lib/api-guard";
import { logAudit } from "@/lib/audit";

// Blank strings from the create form arrive as "" rather than omitted/null —
// without normalizing them first, contactEmail's .email() check rejects ""
// as an invalid address and creation fails even when the field was just
// left empty.
const blankToNull = (v: unknown) => (typeof v === "string" && v.trim() === "" ? null : v);

const createSchema = z.object({
  name: z.string().min(2),
  type: z.enum(["REFERRAL", "B2B_APPLICATION", "EXAM_BODY"]).default("REFERRAL"),
  contactEmail: z.preprocess(blankToNull, z.string().email().nullable().optional()),
  contactPhone: z.preprocess(blankToNull, z.string().nullable().optional()),
  addressLine1: z.preprocess(blankToNull, z.string().nullable().optional()),
  addressLine2: z.preprocess(blankToNull, z.string().nullable().optional()),
  addressLine3: z.preprocess(blankToNull, z.string().nullable().optional()),
  taxIdType: z.enum(["PAN", "VAT"]).optional().nullable(),
  panNumber: z.preprocess(blankToNull, z.string().nullable().optional()),
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
