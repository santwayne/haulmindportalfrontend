import ExcelJS from 'exceljs';

// Shared Excel export helper. Uses the same look as the existing Drivers / Employees
// exports (blue header row, zebra rows, frozen header) so every report matches.

type Cell = string | number | boolean | null | undefined;

export interface ExcelColumn<T> {
  header: string;
  width?: number;
  value: (row: T) => Cell;
  /** Excel number format, e.g. '#,##0.00' */
  numFmt?: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- sheets of different row types go in one workbook
export interface ExcelSheet<T = any> {
  name: string;
  columns: ExcelColumn<T>[];
  rows: T[];
}

/** Excel number format for money columns: $1,250.50 */
export const MONEY_FMT = '"$"#,##0.00';

const HEADER_FILL = 'FF42AEEC';
const ZEBRA_FILL = 'FFF0F9FF';

const safeSheetName = (name: string) => name.replace(/[\\/?*[\]:]/g, ' ').slice(0, 31) || 'Sheet';

export async function downloadExcel(fileBase: string, sheets: ExcelSheet[]) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Logistiq Innovation';
  workbook.created = new Date();

  sheets.forEach((s) => {
    const sheet = workbook.addWorksheet(safeSheetName(s.name), { views: [{ state: 'frozen', ySplit: 1 }] });
    sheet.columns = s.columns.map((c, i) => ({ header: c.header, key: `c${i}`, width: c.width ?? 18 }));

    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_FILL } };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    headerRow.height = 22;

    s.rows.forEach((r) => {
      const data: Record<string, Cell> = {};
      s.columns.forEach((c, i) => {
        let v: Cell;
        try { v = c.value(r); } catch { v = ''; }
        data[`c${i}`] = v === null || v === undefined ? '' : v;
      });
      const row = sheet.addRow(data);
      row.alignment = { vertical: 'middle', wrapText: true };
    });

    s.columns.forEach((c, i) => {
      if (c.numFmt) sheet.getColumn(i + 1).numFmt = c.numFmt;
    });

    sheet.eachRow((row, i) => {
      if (i > 1) row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: i % 2 === 0 ? ZEBRA_FILL : 'FFFFFFFF' } };
      row.eachCell((cell) => { cell.border = { bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } } }; });
    });
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${fileBase}-${new Date().toISOString().split('T')[0]}.xlsx`;
  document.body.appendChild(a);
  a.click();
  URL.revokeObjectURL(url);
  document.body.removeChild(a);
}

/** A two-column "Summary" sheet from [label, value] pairs. Empty label = blank spacer row. */
export function summarySheet(pairs: Array<[string, Cell]>, name = 'Summary'): ExcelSheet<[string, Cell]> {
  return {
    name,
    rows: pairs,
    columns: [
      { header: 'Metric', width: 40, value: (p) => p[0] },
      { header: 'Value', width: 22, value: (p) => p[1] },
    ],
  };
}

/** Count rows by a key, sorted by count desc → [label, count] pairs for summarySheet. */
export function countBy<T>(rows: T[], key: (r: T) => string | undefined | null, prefix = ''): Array<[string, number]> {
  const m = new Map<string, number>();
  rows.forEach((r) => {
    const k = (key(r) || 'Not set').toString();
    m.set(k, (m.get(k) || 0) + 1);
  });
  return [...m.entries()].sort((a, b) => b[1] - a[1]).map(([k, v]) => [`${prefix}${k}`, v]);
}

export const fmtDate = (v?: string | Date | null) => {
  if (!v) return '';
  const d = new Date(v);
  return isNaN(d.getTime()) ? String(v) : d.toLocaleDateString();
};

export const fmtDateTime = (v?: string | Date | null) => {
  if (!v) return '';
  const d = new Date(v);
  return isNaN(d.getTime()) ? String(v) : d.toLocaleString();
};

/** Money as text, for sheets that mix amounts and counts in one column (Summary). */
export const fmtMoney = (v?: number | null) =>
  `$${(Number(v) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const yesNo = (v?: boolean | null) => (v === true ? 'Yes' : v === false ? 'No' : '');

export const titleCase = (v?: string | null) =>
  (v || '').replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

/** Month label like "2026-03" for grouping. */
export const monthKey = (v?: string | Date | null) => {
  if (!v) return 'Not set';
  const d = new Date(v);
  return isNaN(d.getTime()) ? 'Not set' : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

/** Build columns automatically from the keys of plain objects (for API data with a flexible shape). */
export function autoColumns(rows: Array<Record<string, unknown>>): ExcelColumn<Record<string, unknown>>[] {
  const keys: string[] = [];
  rows.forEach((r) => Object.keys(r || {}).forEach((k) => {
    if (!keys.includes(k) && k !== '_id' && k !== '__v') keys.push(k);
  }));
  return keys.map((k) => ({
    header: titleCase(k.replace(/([a-z])([A-Z])/g, '$1 $2')),
    width: 18,
    value: (r) => {
      const v = r?.[k];
      if (v === null || v === undefined) return '';
      if (typeof v === 'object') return JSON.stringify(v);
      return v as string | number | boolean;
    },
  }));
}
