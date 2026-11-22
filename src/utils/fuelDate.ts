// Fuel report dates are calendar days stored as UTC midnight
// (2026-11-04T00:00:00Z means 4 Nov). Reading them in the browser's time zone
// shows the day before anywhere west of UTC (all of Canada), so these helpers
// always read the date part in UTC. createdAt is a real timestamp and stays local.

type DatedReport = { date?: string | Date | null; createdAt?: string | Date | null };

const pad = (n: number) => String(n).padStart(2, "0");

const localKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** 'YYYY-MM-DD' calendar day of a fuel report, or '' when it has no date. */
export const reportDateKey = (r: DatedReport): string => {
  if (r.date) {
    const d = new Date(r.date);
    return Number.isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
  }
  if (r.createdAt) {
    const d = new Date(r.createdAt);
    return Number.isNaN(d.getTime()) ? "" : localKey(d);
  }
  return "";
};

/** Display a fuel report's day, e.g. 11/4/2026 (or 2026-11-04 with locale 'en-CA'). */
export const formatReportDate = (
  r: DatedReport,
  locale?: string,
  options: Intl.DateTimeFormatOptions = {}
): string => {
  const key = reportDateKey(r);
  if (!key) return "";
  const [y, m, d] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString(locale, { ...options, timeZone: "UTC" });
};

/** Year and 0-based month of a fuel report's day. */
export const reportYearMonth = (r: DatedReport): { year: number; month: number } | null => {
  const key = reportDateKey(r);
  if (!key) return null;
  const [y, m] = key.split("-").map(Number);
  return { year: y, month: m - 1 };
};

/** Today's date in the user's own time zone, as 'YYYY-MM-DD' (for date inputs). */
export const todayLocalISO = (): string => localKey(new Date());

const SLASH_DATE = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2}|\d{4})$/;

/**
 * Month-first or day-first? 'DMY' if any date has a first part over 12,
 * 'MDY' if any has a second part over 12, null when every date fits both.
 */
export const detectDateOrder = (values: unknown[]): "MDY" | "DMY" | null => {
  let mdy = true;
  let dmy = true;
  for (const v of values) {
    const m = SLASH_DATE.exec(String(v ?? "").trim());
    if (!m) continue;
    if (Number(m[1]) > 12) mdy = false;
    if (Number(m[2]) > 12) dmy = false;
  }
  if (mdy && !dmy) return "MDY";
  if (dmy && !mdy) return "DMY";
  return null;
};

/** True when the values contain slash dates like 05/11/2026. */
export const hasSlashDates = (values: unknown[]): boolean =>
  values.some((v) => SLASH_DATE.test(String(v ?? "").trim()));
