// Nepal's official fiscal year runs Shrawan 1 to Ashadh-end on the Bikram
// Sambat (BS) calendar — NOT the Baishakh 1 Nepali new year, and NOT the
// Gregorian calendar year. BS month lengths vary year to year (set by
// Nepal's calendar authority), so there is no formula-based AD<->BS
// conversion; it requires a lookup table.
//
// For fiscal-year bookkeeping we only need one boundary date per year
// (Shrawan 1's AD-equivalent date), not a full day-by-day BS calendar.
// Verified against nepalicalendar.rat32.com (official BS calendar, Nepal
// Ministry of Information data):
//   Shrawan 1, 2082 BS -> July 17, 2025 AD
//   Shrawan 1, 2083 BS -> July 17, 2026 AD
//
// Years outside SHRAWAN_1_DATES fall back to July 17 of the corresponding
// AD year (BS year - 57), which matches every verified data point so far.
// This is a documented approximation: Shrawan 1 has historically landed on
// July 16 or 17, so the fallback carries at most ~1 day of uncertainty for
// transactions dated exactly on the boundary in an unverified year — it
// does not affect any other date. Extend this table with verified dates
// (e.g. from nepalicalendar.rat32.com/<year>/shrawan) as more years are
// confirmed, especially before relying on it for a BS year far in the past
// or future.
const SHRAWAN_1_DATES: Record<number, string> = {
  2082: "2025-07-17",
  2083: "2026-07-17",
};

const BS_TO_AD_YEAR_OFFSET = 57;

function shrawan1(bsYear: number): Date {
  const iso = SHRAWAN_1_DATES[bsYear];
  if (iso) return new Date(`${iso}T00:00:00Z`);
  // Fallback: July 17 of the matching AD year.
  const adYear = bsYear - BS_TO_AD_YEAR_OFFSET;
  return new Date(Date.UTC(adYear, 6, 17)); // month is 0-indexed: 6 = July
}

function fiscalYearLabel(bsYear: number): string {
  return `${bsYear}/${String((bsYear + 1) % 100).padStart(2, "0")}`;
}

/**
 * Given any AD date, returns the Nepali fiscal year label it falls in,
 * e.g. "2082/83" for any date from Shrawan 1, 2082 through Ashadh-end, 2083.
 */
export function getNepaliFiscalYear(date: Date): string {
  const adYear = date.getUTCFullYear();
  // The BS year whose Shrawan 1 falls in this AD year is (adYear + 57); a
  // date could also belong to the fiscal year that started the previous AD
  // year, or (rarely, for dates very early/late in the AD year) the next.
  const candidates = [adYear + BS_TO_AD_YEAR_OFFSET - 1, adYear + BS_TO_AD_YEAR_OFFSET, adYear + BS_TO_AD_YEAR_OFFSET + 1];
  for (const bsYear of candidates) {
    const start = shrawan1(bsYear);
    const end = shrawan1(bsYear + 1);
    if (date >= start && date < end) return fiscalYearLabel(bsYear);
  }
  // Should be unreachable given the 3-candidate spread, but keep a sane fallback.
  return fiscalYearLabel(adYear + BS_TO_AD_YEAR_OFFSET);
}

/** Returns the current Nepali fiscal year label, e.g. "2082/83". */
export function getCurrentNepaliFiscalYear(): string {
  return getNepaliFiscalYear(new Date());
}

/**
 * Returns the [start, end) AD date bounds for a fiscal year label like
 * "2082/83" — start is Shrawan 1 2082, end is the following Shrawan 1
 * (exclusive), i.e. Ashadh-end 2083 is the last day included.
 */
export function getFiscalYearBounds(fiscalYearLabel: string): { start: Date; end: Date } {
  const bsYear = Number(fiscalYearLabel.split("/")[0]);
  return { start: shrawan1(bsYear), end: shrawan1(bsYear + 1) };
}

/** All fiscal years that have at least one verified boundary date, for UI pickers. */
export function listKnownFiscalYears(): string[] {
  const years = Object.keys(SHRAWAN_1_DATES).map(Number).sort((a, b) => a - b);
  return years.map(fiscalYearLabel);
}
