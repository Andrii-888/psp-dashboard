/**
 * Pad number to 2 digits
 */
export function pad2(n: number) {
  return String(n).padStart(2, "0");
}

/**
 * Convert Date → YYYY-MM-DD
 */
export function toYmd(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

/**
 * Start of month for given date
 */
export function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
