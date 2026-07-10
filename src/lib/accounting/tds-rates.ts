// Nepal TDS (Tax Deducted at Source) rates under the Income Tax Act 2058
// (2002), Sections 87-92, as applicable for FY 2082/83. Rates are set by
// the annual Finance Act/Budget and can change each Nepali fiscal year —
// review and update this list every Shrawan (~mid-July) against the new
// Finance Act before relying on it for a new fiscal year.
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

// Progressive salary TDS slabs, FY 2082/83, individual (unmarried) resident
// taxpayer, annual NPR. Nepal also has separate (higher-threshold) slabs for
// married couples and additional rules for remote-area/disability rebates —
// this covers the common individual case; extend per-employee if needed.
// Source: Income Tax Act 2058 as amended by the Finance Act for 2082/83.
export const SALARY_TDS_SLABS_INDIVIDUAL_2082_83 = [
  { upTo: 500_000, rate: 0 },
  { upTo: 700_000, rate: 0.1 },
  { upTo: 1_000_000, rate: 0.2 },
  { upTo: 2_000_000, rate: 0.3 },
  { upTo: Infinity, rate: 0.36 },
];

/** Computes annual income tax on `annualTaxableIncome` (NPR) using the progressive slabs above. */
export function computeSalaryTax(annualTaxableIncome: number, slabs = SALARY_TDS_SLABS_INDIVIDUAL_2082_83): number {
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
  slabs = SALARY_TDS_SLABS_INDIVIDUAL_2082_83
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
