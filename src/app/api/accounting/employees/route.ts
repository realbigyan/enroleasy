import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession, handleApiError } from "@/lib/api-guard";
import { logAudit } from "@/lib/audit";

const ACCOUNTING_ROLES = ["OWNER", "ADMIN"] as const;

const createSchema = z.object({
  name: z.string().min(1),
  panNumber: z.string().optional(),
  designation: z.string().optional(),
  basicSalary: z.number().positive(),
  allowances: z.number().min(0).default(0),
  ssfEnrolled: z.boolean().default(false),
});

export async function GET() {
  try {
    const session = await requireSession([...ACCOUNTING_ROLES]);
    const employees = await prisma.employee.findMany({
      where: { organizationId: session.organizationId },
      orderBy: { name: "asc" },
    });
    return NextResponse.json({ employees });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession([...ACCOUNTING_ROLES]);
    const body = createSchema.parse(await req.json());
    const employee = await prisma.employee.create({
      data: {
        organizationId: session.organizationId,
        name: body.name,
        panNumber: body.panNumber,
        designation: body.designation,
        basicSalary: body.basicSalary,
        allowances: body.allowances,
        ssfEnrolled: body.ssfEnrolled,
      },
    });
    await logAudit({
      organizationId: session.organizationId,
      actorId: session.userId,
      action: "create",
      entityType: "Employee",
      entityId: employee.id,
      after: employee,
    });
    return NextResponse.json({ employee }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
