// Helpers for the NC (new customer registration) view of the Dynamic BI activity curves.

const DAY_CODES = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const MS_PER_DAY = 86_400_000;

/**
 * Counts how often each weekday occurs between two YYYY-MM-DD dates, inclusive.
 * Keys are the report's day codes ('mon', 'tue', ...). Uses UTC so a date always
 * maps to the same weekday as the API's day-of-week grouping.
 */
export function countWeekdayOccurrences(start?: string, end?: string): Record<string, number> {
  const counts: Record<string, number> = Object.fromEntries(DAY_CODES.map((code) => [code, 0]));
  if (!start || !end) return counts;

  const startMs = Date.parse(`${start.slice(0, 10)}T00:00:00Z`);
  const endMs = Date.parse(`${end.slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(startMs) || Number.isNaN(endMs)) return counts;

  for (let ms = startMs; ms <= endMs; ms += MS_PER_DAY) {
    counts[DAY_CODES[new Date(ms).getUTCDay()]] += 1;
  }
  return counts;
}

export interface Extremes<T> {
  peak: T[];
  lowest: T[];
  peakValue: number;
  lowestValue: number;
  allEqual: boolean; // True when every in-scope item has the same value
}

/**
 * Finds the highest and lowest items, keeping all ties. Zero is a valid lowest
 * value. Items whose getValue returns null are out of scope and never rank.
 */
export function findExtremes<T>(items: T[], getValue: (item: T) => number | null): Extremes<T> {
  const scored = items
    .map((item) => ({ item, value: getValue(item) }))
    .filter((entry): entry is { item: T; value: number } => entry.value !== null);

  if (scored.length === 0) {
    return { peak: [], lowest: [], peakValue: 0, lowestValue: 0, allEqual: false };
  }

  const values = scored.map((entry) => entry.value);
  const peakValue = Math.max(...values);
  const lowestValue = Math.min(...values);

  return {
    peak: scored.filter((entry) => entry.value === peakValue).map((entry) => entry.item),
    lowest: scored.filter((entry) => entry.value === lowestValue).map((entry) => entry.item),
    peakValue,
    lowestValue,
    allEqual: peakValue === lowestValue,
  };
}

/**
 * Returns the hours the report's hour filters keep, or an empty array when all 24 are kept.
 * Mirrors how the report request treats selectedHours and the startHour/endHour range.
 */
export function resolveAppliedHours(filters: {
  selectedHours?: number[];
  startHour: number | null;
  endHour: number | null;
}): number[] {
  const selected = filters.selectedHours ?? [];
  if (selected.length > 0 && selected.length < 24) return selected;
  if (selected.length === 0 && filters.startHour !== null && filters.endHour !== null) {
    const hours: number[] = [];
    for (let hour = filters.startHour; hour <= filters.endHour; hour++) hours.push(hour);
    return hours.length === 24 ? [] : hours;
  }
  return [];
}
