import ExcelJS from 'exceljs';

const cellText = (value: ExcelJS.CellValue): string => {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === 'object') {
    if ('result' in value) return cellText((value.result ?? '') as ExcelJS.CellValue);
    if ('richText' in value) return value.richText.map((part) => part.text).join('');
    if ('text' in value) return cellText(value.text as ExcelJS.CellValue);
    return '';
  }
  return String(value);
};

// The import reads one simple line per row, so separators inside a cell would
// shift its columns.
const cleanCell = (text: string) => text.replace(/[,;\r\n]+/g, ' ').replace(/\s+/g, ' ').trim();

/** Converts the first non-empty sheet of an .xlsx file for the CSV import. */
export const xlsxToCsvFile = async (file: File): Promise<File> => {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(await file.arrayBuffer());

  const sheet = workbook.worksheets.find((s) => s.actualRowCount > 0);
  if (!sheet) throw new Error('This Excel file has no data');

  const lines: string[] = [];
  sheet.eachRow({ includeEmpty: false }, (row) => {
    const cells: string[] = [];
    for (let col = 1; col <= sheet.columnCount; col++) {
      const cell = row.getCell(col);
      // A merged title ("Pilot Flying J - Customer Portal" across every column) would otherwise
      // repeat in each column and be taken as every header. Keep it in its first cell only.
      const isMergedCopy = cell.isMerged && cell.master && cell.master.address !== cell.address;
      cells.push(isMergedCopy ? '' : cleanCell(cellText(cell.value)));
    }
    if (cells.some(Boolean)) lines.push(cells.join(','));
  });
  if (lines.length === 0) throw new Error('This Excel file has no data');

  return new File([lines.join('\n')], file.name.replace(/\.xlsx$/i, '.csv'), { type: 'text/csv' });
};
