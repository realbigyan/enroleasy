import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession, handleApiError } from "@/lib/api-guard";

const createSchema = z.object({
  fullName: z.string().min(2),
  email: z.string().email().optional().nullable(),
  phone: z.string().optional().nullable(),
  passportNo: z.string().optional().nullable(),
  fromLeadId: z.string().optional().nullable(),
});

export async function GET(req: NextRequest) {
  try {
    const session = await requireSession();
    const q = req.nextUrl.searchParams.get("q");
    const students = await prisma.student.findMany({
      where: {
        organizationId: session.organizationId,
        ...(q ? { fullName: { contains: q, mode: "insensitive" } } : {}),
      },
      include: { applications: true, testAttempts: { orderBy: { startedAt: "desc" }, take: 3 } },
      orderBy: { updatedAt: "desc" },
    });
    return NextResponse.json({ students });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession(["OWNER", "ADMIN", "ADMIN_ASSIST", "COUNSELOR"]);
    const body = createSchema.parse(await req.json());
    const student = await prisma.student.create({
      data: { ...body, organizationId: session.organizationId },
    });
    if (body.fromLeadId) {
      await prisma.lead.update({ where: { id: body.fromLeadId }, data: { stage: "ENROLLED" } });
    }
    return NextResponse.json({ student }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
