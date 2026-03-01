import { format, parseISO, differenceInDays } from "date-fns";

/**
 * Safe ISO date parsing - prevents crashes from malformed dates
 */
export function safeParseISO(value) {
  if (!value || typeof value !== "string") return null;
  try {
    const d = parseISO(value);
    return Number.isNaN(d.getTime()) ? null : d;
  } catch {
    return null;
  }
}

/**
 * Convert date to month bucket for grouping analytics data
 */
export function toMonthBucket(date) {
  if (!date) return null;
  try {
    return {
      key: format(date, "yyyy-MM"),
      label: format(date, "MMM yyyy")
    };
  } catch {
    return null;
  }
}

/**
 * Clamp number between min and max values
 */
export function clamp(n, min, max) {
  const x = Number(n);
  if (Number.isNaN(x)) return min;
  return Math.min(max, Math.max(min, x));
}

/**
 * Calculate days between two dates safely
 */
export function safeDateDifference(date1, date2) {
  const d1 = safeParseISO(date1);
  const d2 = safeParseISO(date2);
  if (!d1 || !d2) return null;
  return differenceInDays(d2, d1);
}