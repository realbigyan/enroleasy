import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession, handleApiError, ApiError } from "@/lib/api-guard";

const ACCOUNTING_ROLES = ["OWNER", "ADMIN"] as const;

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  panNumber: z.string().nullable().optional(),
  designation: z.string().nullable().optional(),
  basicSalary: z.number().positive().optional(),
  allowances: z.number().min(0).optional(),
  ssfEnrolled: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

async function assertOwned(id: string, organizationId: string) {
  const employee = await prisma.employee.findUnique({ where: { id } });
  if (!employee || employee.organizationId !== organizationId) throw new ApiError(404, "Employee not found");
  return employee;
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await requireSession([...ACCOUNTING_ROLES]);
    const employee = await assertOwned(id, session.organizationId);
    const payslips = await prisma.payslip.findMany({
      where: { employeeId: id },
      orderBy: [{ fiscalYear: "desc" }, { month: "desc" }],
    });
    return NextResponse.json({ employee, payslips });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await requireSession([...ACCOUNTING_ROLES]);
    await assertOwned(id, session.organizationId);
    const body = updateSchema.parse(await req.json());
    const employee = await prisma.employee.update({ where: { id }, data: body });
    return NextResponse.json({ employee });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await requireSession([...ACCOUNTING_ROLES]);
    await assertOwned(id, session.organizationId);
    const payslips = await prisma.payslip.findMany({ where: { employeeId: id } });
    if (payslips.length > 0) {
      await prisma.journalEntry.deleteMany({
        where: { sourceType: "PAYROLL", sourceId: { in: payslips.map((p: { id: string }) => p.id) } },
      });
    }
    await prisma.employee.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
