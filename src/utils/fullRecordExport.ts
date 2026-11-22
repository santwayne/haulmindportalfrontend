import ExcelJS from 'exceljs';

/**
 * "Download report" for Employees, Drivers and Customers.
 *
 * The old exports had 8–11 hand-picked columns (no hire date, address, licence expiry, etc.).
 * The client wants everything that is on the record. This flattens each record into one row:
 * the important columns come first in a fixed order, then every other filled-in field,
 * so new fields added to the forms show up in the report without code changes.
 */

export type PreferredColumn = { header: string; get: (r: any) => unknown; width?: number };

// Never exported: secrets, internal plumbing, file blobs
const EXCLUDED_KEYS = new Set([
  'password', 'pin', 'pinHash', 'passwordHash', 'passwordResetToken', 'passwordResetExpires', 'inviteToken',
  'refreshToken', 'tokens', 'token', 'fcmToken', 'expoPushToken', 'pushToken', '__v', 'stripeCustomerId',
  'flagsUpdatedBy', 'createdBy', 'updatedBy', 'company', 'raw', 'customerDetails', 'details',
  'profileImage', 'profileImageUrl', 'avatar', 'documents', 'files', 'attachments', 'portals',
]);
const EXCLUDED_SUFFIXES = ['Key', 'Url', 'Base64'];

const ISO_DATE = /^\d{4}-\d{2}-\d{2}(T[\d:.]+Z?([+-]\d{2}:?\d{2})?)?$/;

const titleCase = (key: string) =>
  key
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());

/** Calendar date as YYYY-MM-DD. Stored dates are UTC midnight, so read the UTC day. */
export const formatExportDate = (v: unknown): string => {
  if (!v) return '';
  const d = new Date(v as any);
  if (Number.isNaN(d.getTime())) return String(v);
  return d.toISOString().slice(0, 10);
};

const formatValue = (v: unknown): string | number | boolean => {
  if (v === null || v === undefined) return '';
  if (typeof v === 'number' || typeof v === 'boolean') return typeof v === 'boolean' ? (v ? 'Yes' : 'No') : v;
  if (v instanceof Date) return formatExportDate(v);
  if (typeof v === 'string') return ISO_DATE.test(v) ? formatExportDate(v) : v;
  if (Array.isArray(v)) {
    if (v.every((x) => x === null || ['string', 'number', 'boolean'].includes(typeof x))) return v.filter((x) => x !== null && x !== '').join(', ');
    // Arrays of objects (e.g. emergency contacts): name/value pairs joined
    return v
      .map((x) => (x && typeof x === 'object' ? Object.entries(x).filter(([k, val]) => !EXCLUDED_KEYS.has(k) && k !== '_id' && val !== '' && val != null && typeof val !== 'object').map(([k, val]) => `${titleCase(k)}: ${formatValue(val)}`).join('; ') : String(x)))
      .filter(Boolean)
      .join(' | ');
  }
  return '';
};

/** Flatten nested objects into "Parent Child" columns. */
const flatten = (obj: any, prefix = '', out: Record<string, unknown> = {}, depth = 0): Record<string, unknown> => {
  if (!obj || typeof obj !== 'object' || depth > 3) return out;
  for (const [key, value] of Object.entries(obj)) {
    if (EXCLUDED_KEYS.has(key) && !(key === 'details' || key === 'customerDetails')) continue;
    if (key === '_id' || EXCLUDED_SUFFIXES.some((s) => key.endsWith(s))) continue;
    const label = prefix ? `${prefix} ${titleCase(key)}` : titleCase(key);
    if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
      // `details` / `customerDetails` hold the form fields: flatten them without a prefix
      const childPrefix = key === 'details' || key === 'customerDetails' ? prefix : label;
      flatten(value, childPrefix, out, depth + 1);
    } else {
      const formatted = formatValue(value);
      if (formatted === '' || formatted === undefined) continue;
      if (out[label] === undefined || out[label] === '') out[label] = formatted;
    }
  }
  return out;
};

export async function exportFullRecords(opts: {
  records: any[];
  sheetName: string;
  fileName: string;
  preferred: PreferredColumn[];
  headerColor?: string;
}) {
  const { records, sheetName, fileName, preferred, headerColor = 'FF42AEEC' } = opts;

  const preferredHeaders = new Set(preferred.map((p) => p.header.toLowerCase()));
  const flatRows = records.map((r) => flatten(r));

  // Extra columns: every field that has a value on at least one record, not already a preferred column
  const extraHeaders: string[] = [];
  const seen = new Set<string>();
  flatRows.forEach((row) => {
    Object.keys(row).forEach((h) => {
      const lower = h.toLowerCase();
      if (preferredHeaders.has(lower) || seen.has(lower)) return;
      seen.add(lower);
      extraHeaders.push(h);
    });
  });
  extraHeaders.sort((a, b) => a.localeCompare(b));

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Logistiq Innovation';
  workbook.created = new Date();
  const sheet = workbook.addWorksheet(sheetName, { views: [{ state: 'frozen', ySplit: 1 }] });

  sheet.columns = [
    ...preferred.map((p) => ({ header: p.header, key: `p:${p.header}`, width: p.width ?? Math.max(14, p.header.length + 4) })),
    ...extraHeaders.map((h) => ({ header: h, key: `x:${h}`, width: Math.min(40, Math.max(14, h.length + 4)) })),
  ];

  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: headerColor } };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
  headerRow.height = 30;

  records.forEach((r, i) => {
    const values: Record<string, unknown> = {};
    preferred.forEach((p) => {
      let v: unknown;
      try { v = p.get(r); } catch { v = ''; }
      values[`p:${p.header}`] = formatValue(v);
    });
    extraHeaders.forEach((h) => { values[`x:${h}`] = flatRows[i][h] ?? ''; });
    const row = sheet.addRow(values);
    row.alignment = { vertical: 'middle' };
  });

  sheet.eachRow((row, i) => {
    if (i > 1) row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: i % 2 === 0 ? 'FFF0F9FF' : 'FFFFFFFF' } };
    row.eachCell((cell) => { cell.border = { bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } } }; });
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  URL.revokeObjectURL(url);
  document.body.removeChild(a);
}
