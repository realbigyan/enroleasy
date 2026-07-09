import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession, handleApiError, ApiError } from "@/lib/api-guard";

const createSchema = z.object({
  institutionId: z.string(),
  name: z.string().min(2),
  level: z.string().optional().nullable(),
  durationMonths: z.number().int().positive().optional().nullable(),
  feeAmount: z.number().nonnegative().optional().nullable(),
  feeCurrency: z.string().default("USD"),
  careerOutcomes: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  minGpaPercent: z.number().optional().nullable(),
  maxGapYears: z.number().int().optional().nullable(),
  languageTestType: z.enum(["IELTS", "PTE", "DUOLINGO", "MOI", "NOT_REQUIRED"]).default("NOT_REQUIRED"),
  languageMinScore: z.number().optional().nullable(),
});

async function assertInstitutionEditable(sessionUserId: string, sessionOrgId: string, institutionId: string) {
  const institution = await prisma.institution.findUnique({ where: { id: institutionId } });
  if (!institution) throw new ApiError(404, "Institution not found");
  if (institution.organizationId !== null && institution.organizationId !== sessionOrgId) {
    throw new ApiError(404, "Institution not found");
  }
  if (institution.organizationId === null) {
    const user = await prisma.user.findUnique({ where: { id: sessionUserId }, select: { isSuperAdmin: true } });
    if (!user?.isSuperAdmin) throw new ApiError(403, "Only a platform superadmin can edit the shared global catalog");
  }
  return institution;
}

export async function GET(req: NextRequest) {
  try {
    const session = await requireSession();
    const institutionId = req.nextUrl.searchParams.get("institutionId");
    if (!institutionId) throw new ApiError(400, "institutionId is required");
    const institution = await prisma.institution.findUnique({ where: { id: institutionId } });
    if (!institution || (institution.organizationId !== null && institution.organizationId !== session.organizationId)) {
      throw new ApiError(404, "Institution not found");
    }
    const courses = await prisma.course.findMany({ where: { institutionId }, orderBy: { name: "asc" } });
    return NextResponse.json({ courses });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession(["OWNER", "ADMIN", "CONTENT_MANAGER"]);
    const body = createSchema.parse(await req.json());
    await assertInstitutionEditable(session.userId, session.organizationId, body.institutionId);

    if (body.languageTestType !== "NOT_REQUIRED" && body.languageTestType !== "MOI" && body.languageMinScore == null) {
      throw new ApiError(400, "languageMinScore is required for IELTS/PTE/DUOLINGO requirements");
    }

    const course = await prisma.course.create({ data: body });
    return NextResponse.json({ course }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
