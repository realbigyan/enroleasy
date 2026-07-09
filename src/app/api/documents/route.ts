import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession, handleApiError, ApiError } from "@/lib/api-guard";

const DOCUMENT_TYPES = [
  "PASSPORT", "TRANSCRIPT", "VISA", "OFFER_LETTER", "CERTIFICATE", "OTHER",
  "PERSONAL_ID", "PERSONAL_ACADEMIC", "PERSONAL_ENGLISH", "PERSONAL_CV", "PERSONAL_WORK_EXPERIENCE",
  "SPOUSE_ID", "SPOUSE_ACADEMIC", "SPOUSE_ENGLISH", "SPOUSE_CV", "SPOUSE_WORK_EXPERIENCE", "SPOUSE_MARRIAGE_CERTIFICATE",
  "SPONSOR_ID", "SPONSOR_RELATIONSHIP", "SPONSOR_PROOF_OF_INCOME",
  "BANK_LOAN", "BANK_BALANCE_CERTIFICATE",
] as const;

const createSchema = z.object({
  studentId: z.string(),
  type: z.enum(DOCUMENT_TYPES),
  fileName: z.string(),
  url: z.string().url(),
  publicId: z.string().optional().nullable(),
});

export async function GET(req: NextRequest) {
  try {
    const session = await requireSession();
    const studentId = req.nextUrl.searchParams.get("studentId");
    const documents = await prisma.document.findMany({
      where: {
        organizationId: session.organizationId,
        ...(studentId ? { studentId } : {}),
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ documents });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession(["OWNER", "ADMIN", "ADMIN_ASSIST", "COUNSELOR", "DOCUMENTATION_OFFICER"]);
    const body = createSchema.parse(await req.json());

    const student = await prisma.student.findUnique({ where: { id: body.studentId } });
    if (!student || student.organizationId !== session.organizationId) {
      throw new ApiError(404, "Student not found");
    }

    const document = await prisma.document.create({
      data: {
        ...body,
        organizationId: session.organizationId,
        uploadedById: session.userId,
      },
    });
    return NextResponse.json({ document }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
