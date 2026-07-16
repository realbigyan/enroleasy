// Nepal TDS (Tax Deducted at Source) rates under the Income Tax Act 2058
// (2002), Section 88 (withholding on rent/royalty/service charge/commission
// etc.). Verified 2026-07-16 against the FY 2083/84 (2026/27) Finance Act
// rate schedule — every rate below is unchanged from FY 2082/83, notably:
//   - Section 88(1) general clause: "commission" (and rent/royalty/service
//     charge/sales bonus) is withheld at 15% — confirms COMMISSION below.
//   - Section 88(1) proviso 4: service charge paid to a VAT-registered
//     resident service provider is withheld at only 1.5% instead — this is
//     why issuing a VAT invoice (when the issuer is actually VAT-registered)
//     lowers the payer's withholding vs. a PAN-only bill.
// Source: https://www.saca.com.np/tds-rates-nepal-fy-2083-84/ (published
// Jun 2026, FY 2083/84). Rates are set by the annual Finance Act/Budget and
// can change each Nepali fiscal year — re-verify every Shrawan (~mid-July)
// against the new Finance Act before relying on this for a new fiscal year.
export type TdsRule = { key: string; label: string; rate: number; note?: string };

export const TDS_RULES: TdsRule[] = [
  { key: "SERVICE_VAT_INVOICE", label: "Service with VAT invoice", rate: 1.5 },
  { key: "SERVICE_PAN_BILL", label: "Service on PAN bill (no VAT)", rate: 15 },
  { key: "RENT", label: "House / office rent", rate: 10 },
  { key: "CONSULTANCY", label: "Consultancy / professional fee", rate: 15 },
  { key: "COMMISSION", label: "Commission / royalty", rate: 15 },
  { key: "DIVIDEND", label: "Dividend", rate: 5 },
  { key: "NON_RESIDENT_SERVICE", label: "Payment to a non-resident for services", rate: 5 },
  { key: "OTHER", label: "Other / not listed", rate: 0 },
];

/** Suggests the TDS rate for an expense based on whether it came with a VAT invoice. */
export function suggestExpenseTdsRate(hasVatInvoice: boolean): number {
  return hasVatInvoice ? 1.5 : 15;
}

// Progressive salary TDS slabs, FY 2083/84 (2026/27), resident individual
// taxpayer, annual NPR. Budget 2083/84 substantially restructured these:
// the old FY 2082/83 schedule (0% to 500k / 10% / 20% / 30% / 36%) is gone.
//   - Tax-free-equivalent threshold doubled: 500,000 -> 1,000,000 (though
//     it's no longer a true 0% band for most taxpayers — see below).
//   - Top marginal rate cut: 39% -> 29% (36% -> 29% in this codebase, since
//     only the individual schedule was modeled here; Nepal previously also
//     had a separate, higher-threshold married-couple schedule, but Budget
//     2083/84 removed that distinction and unified everyone onto one
//     schedule, so there is now only one slab table to maintain).
// Source: https://www.saca.com.np/tds-rates-nepal-fy-2083-84/ and
// https://nitipartners.com/income-tax-changes-as-per-budget-2083-84-2026-27/
// (both accessed/verified 2026-07-16). Re-verify every Shrawan (~mid-July)
// against the new Finance Act before relying on this for a new fiscal year.
export const SALARY_TDS_SLABS_INDIVIDUAL_2083_84 = [
  { upTo: 1_000_000, rate: 0.01 },
  { upTo: 1_500_000, rate: 0.1 },
  { upTo: 2_500_000, rate: 0.2 },
  { upTo: 4_000_000, rate: 0.27 },
  { upTo: Infinity, rate: 0.29 },
];

// The first slab above is taxed at 1%, not 0% — UNLESS the taxpayer is a
// registered sole proprietorship, is receiving pension income, or is a
// natural person contributing to a pension fund / contribution-based Social
// Security Fund (SSF), in which case that first NPR 1,000,000 is untaxed
// (Schedule 1, Section 1(1)(ka)). This payroll module already tracks
// SSF enrollment per employee, so `computeMonthlyPayslip` below picks this
// table automatically for SSF-enrolled staff rather than the 1% table.
export const SALARY_TDS_SLABS_SSF_ENROLLED_2083_84 = [
  { upTo: 1_000_000, rate: 0 },
  { upTo: 1_500_000, rate: 0.1 },
  { upTo: 2_500_000, rate: 0.2 },
  { upTo: 4_000_000, rate: 0.27 },
  { upTo: Infinity, rate: 0.29 },
];

/** Computes annual income tax on `annualTaxableIncome` (NPR) using the progressive slabs above. */
export function computeSalaryTax(annualTaxableIncome: number, slabs = SALARY_TDS_SLABS_INDIVIDUAL_2083_84): number {
  let tax = 0;
  let lower = 0;
  for (const slab of slabs) {
    if (annualTaxableIncome <= lower) break;
    const taxableInSlab = Math.min(annualTaxableIncome, slab.upTo) - lower;
    tax += taxableInSlab * slab.rate;
    lower = slab.upTo;
  }
  return Math.round(tax);
}

// Social Security Fund (SSF) contribution rates: 11% employee-side
// (deducted from gross pay) + 20% employer-side (additional cost to the
// business, not deducted from the employee), for SSF-enrolled employees.
export const SSF_EMPLOYEE_RATE = 0.11;
export const SSF_EMPLOYER_RATE = 0.2;

export type PayslipCalculation = {
  grossPay: number;
  ssfEmployee: number;
  ssfEmployer: number;
  taxableIncome: number;
  tdsAmount: number;
  netPay: number;
};

/**
 * Computes one month's payslip figures for a fixed monthly salary using the
 * standard Nepal "annualize and divide" method: this month's taxable income
 * is projected across 12 months, taxed at the annual progressive slabs, and
 * the resulting annual tax is divided by 12 for this month's TDS. This is a
 * simplification suited to a flat monthly salary — if pay changes mid-year,
 * a proper payroll would recompute cumulatively against tax already
 * withheld year-to-date rather than treating each month independently.
 * SSF employee contribution is treated as fully deductible before tax.
 */
export function computeMonthlyPayslip(
  basicSalary: number,
  allowances: number,
  ssfEnrolled: boolean,
  slabs = ssfEnrolled ? SALARY_TDS_SLABS_SSF_ENROLLED_2083_84 : SALARY_TDS_SLABS_INDIVIDUAL_2083_84
): PayslipCalculation {
  const grossPay = basicSalary + allowances;
  const ssfEmployee = ssfEnrolled ? Math.round(grossPay * SSF_EMPLOYEE_RATE * 100) / 100 : 0;
  const ssfEmployer = ssfEnrolled ? Math.round(grossPay * SSF_EMPLOYER_RATE * 100) / 100 : 0;
  const monthlyTaxable = grossPay - ssfEmployee;
  const annualTaxable = monthlyTaxable * 12;
  const annualTax = computeSalaryTax(annualTaxable, slabs);
  const tdsAmount = Math.round((annualTax / 12) * 100) / 100;
  const netPay = Math.round((grossPay - ssfEmployee - tdsAmount) * 100) / 100;
  return { grossPay, ssfEmployee, ssfEmployer, taxableIncome: monthlyTaxable, tdsAmount, netPay };
}
