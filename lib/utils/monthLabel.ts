const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * Formats the month a given number of months before a YYYY-MM-DD date, such as "Nov'26".
 * Returns null when the date is missing or malformed.
 */
export function formatMonthLabel(anchorDate: string | undefined, monthsBack = 0): string | null {
  const match = anchorDate?.match(/^(\d{4})-(\d{2})-\d{2}$/);
  if (!match) return null;

  const month = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1 - monthsBack, 1));
  const year = String(month.getUTCFullYear()).slice(-2);
  return `${MONTH_NAMES[month.getUTCMonth()]}'${year}`;
}
