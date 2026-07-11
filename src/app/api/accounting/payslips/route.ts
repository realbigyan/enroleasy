import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession, handleApiError, ApiError } from "@/lib/api-guard";
import { getCurrentNepaliFiscalYear } from "@/lib/accounting/fiscal-year";
import { computeMonthlyPayslip } from "@/lib/accounting/tds-rates";
import { getSystemAccountByCode } from "@/lib/accounting/system-accounts";
import { logAudit } from "@/lib/audit";

const ACCOUNTING_ROLES = ["OWNER", "ADMIN"] as const;

const createSchema = z.object({
  employeeId: z.string().min(1),
  paymentAccountId: z.string().min(1),
  month: z.number().int().min(1).max(12), // Nepali month, 1 = Baishakh
  fiscalYear: z.string().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const session = await requireSession([...ACCOUNTING_ROLES]);
    const { searchParams } = new URL(req.url);
    const employeeId = searchParams.get("employeeId") ?? undefined;
    const fiscalYear = searchParams.get("fiscalYear") ?? undefined;
    const payslips = await prisma.payslip.findMany({
      where: { organizationId: session.organizationId, employeeId, fiscalYear },
      include: { employee: true },
      orderBy: [{ fiscalYear: "desc" }, { month: "desc" }],
    });
    return NextResponse.json({ payslips });
  } catch (err) {
    return handleApiError(err);
  }
}

// Generates one month's payslip for an employee: computes gross/SSF/TDS/net
// via the standard annualize-and-divide method, records the Payslip, and
// auto-posts a balanced journal entry (Dr Salary & Wages for the full
// employer cost, Cr TDS Payable / SSF Payable / payment account).
export async function POST(req: NextRequest) {
  try {
    const session = await requireSession([...ACCOUNTING_ROLES]);
    const body = createSchema.parse(await req.json());
    const fiscalYear = body.fiscalYear ?? getCurrentNepaliFiscalYear();

    const employee = await prisma.employee.findUnique({ where: { id: body.employeeId } });
    if (!employee || employee.organizationId !== session.organizationId) throw new ApiError(404, "Employee not found");

    const paymentAccount = await prisma.account.findUnique({ where: { id: body.paymentAccountId } });
    if (!paymentAccount || paymentAccount.organizationId !== session.organizationId) throw new ApiError(404, "Payment account not found");

    const existing = await prisma.payslip.findUnique({
      where: { employeeId_fiscalYear_month: { employeeId: body.employeeId, fiscalYear, month: body.month } },
    });
    if (existing) throw new ApiError(400, "A payslip for this employee, month, and fiscal year already exists");

    const calc = computeMonthlyPayslip(employee.basicSalary, employee.allowances, employee.ssfEnrolled);

    const payslip = await prisma.payslip.create({
      data: {
        employeeId: body.employeeId,
        organizationId: session.organizationId,
        paymentAccountId: body.paymentAccountId,
        month: body.month,
        fiscalYear,
        grossPay: calc.grossPay,
        ssfEmployee: calc.ssfEmployee,
        ssfEmployer: calc.ssfEmployer,
        taxableIncome: calc.taxableIncome,
        tdsAmount: calc.tdsAmount,
        netPay: calc.netPay,
      },
    });

    const salaryExpense = await getSystemAccountByCode(session.organizationId, "5010", "Salary & Wages");
    const tdsPayable = await getSystemAccountByCode(session.organizationId, "2030", "TDS Payable");
    const ssfPayable = await getSystemAccountByCode(session.organizationId, "2050", "SSF Payable");

    const debitAmount = calc.grossPay + calc.ssfEmployer;
    const lines: { accountId: string; debit: number; credit: number; memo: string }[] = [
      { accountId: salaryExpense.id, debit: debitAmount, credit: 0, memo: `${employee.name} — payroll cost` },
    ];
    if (calc.tdsAmount > 0) lines.push({ accountId: tdsPayable.id, debit: 0, credit: calc.tdsAmount, memo: `${employee.name} — salary TDS` });
    const ssfTotal = calc.ssfEmployee + calc.ssfEmployer;
    if (ssfTotal > 0) lines.push({ accountId: ssfPayable.id, debit: 0, credit: ssfTotal, memo: `${employee.name} — SSF contribution` });
    lines.push({ accountId: body.paymentAccountId, debit: 0, credit: calc.netPay, memo: `${employee.name} — net pay` });

    await prisma.journalEntry.create({
      data: {
        organizationId: session.organizationId,
        date: new Date(),
        fiscalYear,
        description: `Payroll: ${employee.name} (month ${body.month}, FY ${fiscalYear})`,
        sourceType: "PAYROLL",
        sourceId: payslip.id,
        createdById: session.userId,
        lines: { create: lines },
      },
    });

    await logAudit({
      organizationId: session.organizationId,
      actorId: session.userId,
      action: "create",
      entityType: "Payslip",
      entityId: payslip.id,
      after: payslip,
    });

    return NextResponse.json({ payslip }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
