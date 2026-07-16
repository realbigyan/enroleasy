import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PrintButton } from "@/components/student/PrintButton";

const NEPALI_MONTHS: Record<number, string> = {
  1: "Baishakh", 2: "Jestha", 3: "Ashadh", 4: "Shrawan", 5: "Bhadra", 6: "Ashwin",
  7: "Kartik", 8: "Mangsir", 9: "Poush", 10: "Magh", 11: "Falgun", 12: "Chaitra",
};

// Fiscal-year order index for each Nepali calendar month (Shrawan = 0 ... Ashadh = 11),
// used to sort/compare payslips chronologically across a "from month/FY to month/FY" range.
const FISCAL_MONTH_INDEX: Record<number, number> = { 4: 0, 5: 1, 6: 2, 7: 3, 8: 4, 9: 5, 10: 6, 11: 7, 12: 8, 1: 9, 2: 10, 3: 11 };

function sortKey(fiscalYear: string, month: number): number {
  const bsYear = Number(fiscalYear.split("/")[0]);
  return bsYear * 12 + (FISCAL_MONTH_INDEX[month] ?? 0);
}

function formatMoney(n: number) {
  return `NPR ${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default async function PayslipPrintPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ids?: string; fromFY?: string; fromMonth?: string; toFY?: string; toMonth?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const session = await getSession();
  if (!session) notFound();

  const employee = await prisma.employee.findUnique({ where: { id } });
  if (!employee || employee.organizationId !== session.organizationId) notFound();

  const allPayslips = await prisma.payslip.findMany({
    where: { employeeId: id, organizationId: session.organizationId },
    include: { paymentAccount: true },
  });

  let selected;
  if (sp.ids) {
    const idSet = new Set(sp.ids.split(","));
    selected = allPayslips.filter((p) => idSet.has(p.id));
  } else if (sp.fromFY && sp.fromMonth && sp.toFY && sp.toMonth) {
    const from = sortKey(sp.fromFY, Number(sp.fromMonth));
    const to = sortKey(sp.toFY, Number(sp.toMonth));
    const [lo, hi] = from <= to ? [from, to] : [to, from];
    selected = allPayslips.filter((p) => {
      const k = sortKey(p.fiscalYear, p.month);
      return k >= lo && k <= hi;
    });
  } else {
    selected = allPayslips;
  }

  selected = [...selected].sort((a, b) => sortKey(a.fiscalYear, a.month) - sortKey(b.fiscalYear, b.month));

  if (selected.length === 0) notFound();

  const invoicer = await prisma.invoicer.findFirst({ where: { organizationId: session.organizationId, isDefault: true } });
  const org = await prisma.organization.findUnique({ where: { id: session.organizationId } });
  const letterheadName = invoicer?.name ?? org?.name ?? "";
  const letterheadLogo = invoicer?.logoUrl ?? org?.logoUrl ?? null;
  const letterheadAddress = invoicer?.addressLine1 ?? null;

  return (
    <div>
      <div className="flex items-center justify-between print:hidden">
        <Link href={`/dashboard/accounting/payroll/${id}`} className="flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-700">
          <ArrowLeft className="h-4 w-4" /> Back to {employee.name}
        </Link>
        <PrintButton />
      </div>

      {selected.map((p, i) => (
        <div
          key={p.id}
          className={`mt-4 rounded-xl border border-slate-200 bg-white p-8 print:border-0 print:p-0 ${
            i < selected.length - 1 ? "print:break-after-page" : ""
          }`}
        >
          <div className="flex items-start justify-between border-b border-slate-100 pb-6">
            <div>
              {letterheadLogo && (
                // eslint-disable-next-line @next/next/no-img-element -- external Cloudinary URL, not a local asset
                <img src={letterheadLogo} alt={letterheadName} className="h-16 w-16 rounded object-contain" />
              )}
              <p className={`${letterheadLogo ? "mt-2" : ""} text-lg font-semibold`}>{letterheadName}</p>
              {letterheadAddress && <p className="text-sm text-slate-500">{letterheadAddress}</p>}
            </div>
            <div className="text-right">
              <h1 className="text-xl font-semibold uppercase">Payslip</h1>
              <p className="mt-1 text-sm text-slate-500">{NEPALI_MONTHS[p.month] ?? p.month} {p.fiscalYear}</p>
              <span
                className={`mt-2 inline-block rounded px-2 py-0.5 text-xs font-medium ${
                  p.paidAt ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
                }`}
              >
                {p.paidAt ? "Paid" : "Unpaid"}
              </span>
            </div>
          </div>

          <div className="mt-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Employee</p>
            <p className="mt-1 font-medium">{employee.name}</p>
            <p className="text-sm text-slate-500">
              {[employee.designation, employee.panNumber ? `PAN ${employee.panNumber}` : null].filter(Boolean).join(" · ") || "—"}
            </p>
          </div>

          <table className="mt-6 w-full text-sm">
            <tbody>
              <tr className="border-b border-slate-100">
                <td className="py-2 text-slate-500">Basic Salary</td>
                <td className="py-2 text-right">{formatMoney(employee.basicSalary)}</td>
              </tr>
              <tr className="border-b border-slate-100">
                <td className="py-2 text-slate-500">Allowances</td>
                <td className="py-2 text-right">{formatMoney(employee.allowances)}</td>
              </tr>
              <tr className="border-b border-slate-100 bg-slate-50">
                <td className="py-2 font-medium">Gross Pay</td>
                <td className="py-2 text-right font-medium">{formatMoney(p.grossPay)}</td>
              </tr>
              {p.ssfEmployee > 0 && (
                <tr className="border-b border-slate-100">
                  <td className="py-2 text-slate-500">SSF Contribution (11%)</td>
                  <td className="py-2 text-right text-red-600">- {formatMoney(p.ssfEmployee)}</td>
                </tr>
              )}
              {p.tdsAmount > 0 && (
                <tr className="border-b border-slate-100">
                  <td className="py-2 text-slate-500">TDS (Income Tax)</td>
                  <td className="py-2 text-right text-red-600">- {formatMoney(p.tdsAmount)}</td>
                </tr>
              )}
              <tr className="bg-green-50">
                <td className="py-2 font-semibold">Net Pay</td>
                <td className="py-2 text-right font-semibold">{formatMoney(p.netPay)}</td>
              </tr>
            </tbody>
          </table>

          <p className="mt-6 text-xs text-slate-400">
            Paid via {p.paymentAccount.name}{p.paidAt ? ` on ${new Date(p.paidAt).toLocaleDateString()}` : ""}.
          </p>
        </div>
      ))}
    </div>
  );
}
