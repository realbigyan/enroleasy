import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession, handleApiError, ApiError } from "@/lib/api-guard";
import type { Course, Institution, StudentLanguageStatus } from "@prisma/client";

const searchSchema = z.object({
  studentId: z.string().optional().nullable(),
  gpaPercent: z.number().optional().nullable(),
  gapYears: z.number().int().optional().nullable(),
  languageTestType: z.enum(["IELTS", "PTE", "DUOLINGO", "MOI", "NONE"]).optional().nullable(),
  languageScore: z.number().optional().nullable(),
  country: z.string().optional().nullable(),
  saveToStudent: z.boolean().optional().default(false),
});

// A course's language requirement is met by the student's own test result.
function meetsLanguage(
  courseType: Course["languageTestType"],
  courseMinScore: number | null,
  studentType: StudentLanguageStatus | null | undefined,
  studentScore: number | null | undefined
) {
  if (courseType === "NOT_REQUIRED") return true;
  if (courseType === "MOI") return studentType === "MOI";
  return studentType === courseType && studentScore != null && courseMinScore != null && studentScore >= courseMinScore;
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession(["OWNER", "ADMIN", "COUNSELOR", "DOCUMENTATION_OFFICER"]);
    const body = searchSchema.parse(await req.json());

    let gpaPercent = body.gpaPercent ?? null;
    let gapYears = body.gapYears ?? null;
    let languageTestType = body.languageTestType ?? null;
    let languageScore = body.languageScore ?? null;

    if (body.studentId) {
      const student = await prisma.student.findUnique({ where: { id: body.studentId } });
      if (!student || student.organizationId !== session.organizationId) {
        throw new ApiError(404, "Student not found");
      }
      // Fall back to the student's saved profile for any field not provided in this search.
      gpaPercent = gpaPercent ?? student.academicGpaPercent;
      gapYears = gapYears ?? student.gapYears;
      languageTestType = languageTestType ?? student.englishTestType;
      languageScore = languageScore ?? student.englishScore;

      if (body.saveToStudent) {
        await prisma.student.update({
          where: { id: student.id },
          data: {
            academicGpaPercent: gpaPercent ?? undefined,
            gapYears: gapYears ?? undefined,
            englishTestType: languageTestType ?? undefined,
            englishScore: languageScore ?? undefined,
          },
        });
      }
    }

    const institutions = await prisma.institution.findMany({
      where: {
        isActive: true,
        OR: [{ organizationId: session.organizationId }, { organizationId: null }],
        ...(body.country ? { country: body.country } : {}),
      },
      include: { courses: { where: { isActive: true } } },
    });

    type Match = { institution: Omit<Institution, "courses">; course: Course; meetsGpa: boolean; meetsGap: boolean; meetsLanguage: boolean };
    const eligible: Match[] = [];

    for (const institution of institutions) {
      for (const course of institution.courses) {
        const meetsGpa = course.minGpaPercent == null || (gpaPercent != null && gpaPercent >= course.minGpaPercent);
        const meetsGap = course.maxGapYears == null || (gapYears != null && gapYears <= course.maxGapYears);
        const meetsLang = meetsLanguage(course.languageTestType, course.languageMinScore, languageTestType, languageScore);

        if (meetsGpa && meetsGap && meetsLang) {
          const institutionRest: Omit<Institution, "courses"> = {
            id: institution.id,
            organizationId: institution.organizationId,
            name: institution.name,
            country: institution.country,
            type: institution.type,
            locations: institution.locations,
            website: institution.website,
            logoUrl: institution.logoUrl,
            introduction: institution.introduction,
            isActive: institution.isActive,
            createdAt: institution.createdAt,
            updatedAt: institution.updatedAt,
          };
          eligible.push({ institution: institutionRest, course, meetsGpa, meetsGap, meetsLanguage: meetsLang });
        }
      }
    }

    eligible.sort((a, b) => a.institution.name.localeCompare(b.institution.name) || a.course.name.localeCompare(b.course.name));

    return NextResponse.json({
      criteria: { gpaPercent, gapYears, languageTestType, languageScore },
      results: eligible,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
