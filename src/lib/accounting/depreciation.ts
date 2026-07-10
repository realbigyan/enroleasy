// Standard book/accounting depreciation (straight-line and diminishing
// balance), computed per fixed asset per Nepali fiscal year. Note: this is
// NOT the same as IRD's tax depreciation (which uses fixed-rate asset
// "pools" — 5%/25%/20%/15% etc. — rather than per-asset schedules). This
// module covers the books-of-account side; tax depreciation for the annual
// return is a separate calculation an accountant would still need to do.

export function computeStraightLineDepreciation(
  cost: number,
  salvageValue: number,
  usefulLifeYears: number,
  priorAccumulated: number
): number {
  const totalDepreciable = Math.max(0, cost - salvageValue);
  if (usefulLifeYears <= 0) return 0;
  const annual = totalDepreciable / usefulLifeYears;
  const remaining = totalDepreciable - priorAccumulated;
  return Math.round(Math.max(0, Math.min(annual, remaining)) * 100) / 100;
}

export function computeDiminishingBalanceDepreciation(
  cost: number,
  salvageValue: number,
  usefulLifeYears: number,
  priorAccumulated: number
): number {
  const bookValue = cost - priorAccumulated;
  if (bookValue <= salvageValue || usefulLifeYears <= 0) return 0;
  // Rate that fully depreciates cost -> salvageValue over usefulLifeYears.
  // Falls back to a 2/usefulLife "double declining" style rate when
  // salvageValue is 0 (the exponential formula is undefined at 0).
  const rate = salvageValue > 0 && cost > 0 ? 1 - Math.pow(salvageValue / cost, 1 / usefulLifeYears) : 2 / usefulLifeYears;
  const amount = bookValue * rate;
  return Math.round(Math.max(0, Math.min(amount, bookValue - salvageValue)) * 100) / 100;
}

export function computeDepreciationForYear(
  method: "STRAIGHT_LINE" | "DIMINISHING_BALANCE",
  cost: number,
  salvageValue: number,
  usefulLifeYears: number,
  priorAccumulated: number
): number {
  return method === "STRAIGHT_LINE"
    ? computeStraightLineDepreciation(cost, salvageValue, usefulLifeYears, priorAccumulated)
    : computeDiminishingBalanceDepreciation(cost, salvageValue, usefulLifeYears, priorAccumulated);
}
