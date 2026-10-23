import { useRef, useState } from "react";
import { Upload, Download, X, CheckCircle, AlertCircle, SkipForward } from "lucide-react";
import * as XLSX from 'xlsx';

interface ImportError {
  row: number;
  reason: string;
  data?: Record<string, any>;
}

interface ImportResult {
  success: boolean;
  imported: number;
  skipped: number;
  errors: ImportError[];
  total: number;
  message?: string;
}

interface TemplateColumn {
  header: string;
  example: string;
  required?: boolean;
}

interface FileHeader {
  original: string;
  normalized: string;
  sample: string;
}

interface ImportButtonProps {
  onImport: (file: File, fieldMap: Record<string, string>) => Promise<ImportResult>;
  templateColumns: TemplateColumn[];
  templateFileName?: string;
  accept?: string;
  label?: string;
}

function normalizeKey(k: string): string {
  return String(k).trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let cur = '', inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') inQ = !inQ;
    else if (c === ',' && !inQ) { result.push(cur.trim()); cur = ''; }
    else cur += c;
  }
  result.push(cur.trim());
  return result;
}

async function parseFileHeaders(file: File): Promise<FileHeader[]> {
  return new Promise((resolve, reject) => {
    const ext = file.name.split('.').pop()?.toLowerCase();
    const reader = new FileReader();

    if (ext === 'csv') {
      reader.onload = (e) => {
        const text = e.target?.result as string;
        const lines = text.split('\n').filter(l => l.trim());
        if (!lines.length) { resolve([]); return; }
        const headers = parseCSVLine(lines[0]);
        const samples = lines.length > 1 ? parseCSVLine(lines[1]) : [];
        resolve(headers.map((h, i) => ({ original: h, normalized: normalizeKey(h), sample: samples[i] || '' })));
      };
      reader.onerror = reject;
      reader.readAsText(file);
    } else {
      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          const wb = XLSX.read(data, { type: 'array' });
          const ws = wb.Sheets[wb.SheetNames[0]];
          const rows = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1 });
          if (!rows.length) { resolve([]); return; }
          const headerRow = (rows[0] as any[]).map(v => v == null ? '' : String(v));
          const sampleRow = rows.length > 1 ? (rows[1] as any[]).map(v => v == null ? '' : String(v)) : [];
          resolve(headerRow.filter(h => h).map((h, i) => ({ original: h, normalized: normalizeKey(h), sample: sampleRow[i] || '' })));
        } catch (err) { reject(err); }
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    }
  });
}

function buildAutoMap(headers: FileHeader[], cols: TemplateColumn[]): Record<string, string> {
  const map: Record<string, string> = {};
  for (const h of headers) {
    const hn = h.normalized.replace(/_/g, '');

    // 1. Exact normalized match  (e.g. "make" → make)
    const exact = cols.find(c => c.header === h.normalized);
    if (exact) { map[h.normalized] = exact.header; continue; }

    // 2. Strip-underscore equality  (e.g. "platenumber" → plate_number)
    const fuzzy = cols.find(c => c.header.replace(/_/g, '') === hn);
    if (fuzzy) { map[h.normalized] = fuzzy.header; continue; }

    // 3. Prefix / contains match — handles truncated names like "plate" → plate_number,
    //    "trailer" → trailer_number, "unit" → unit_number
    const partial = cols.find(c => {
      const fn = c.header.replace(/_/g, '');
      return (fn.startsWith(hn) || hn.startsWith(fn)) && Math.min(fn.length, hn.length) >= 3;
    });
    if (partial) { map[h.normalized] = partial.header; }
  }
  return map;
}

function downloadTemplate(columns: TemplateColumn[], fileName: string) {
  const header = columns.map(c => c.header).join(',');
  const example = columns.map(c => `"${c.example}"`).join(',');
  const blob = new Blob([`${header}\n${example}\n`], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = fileName; a.click();
  URL.revokeObjectURL(url);
}

function downloadErrorReport(errors: ImportError[], fileName: string) {
  if (!errors.length) return;
  const cols = ['Row', 'Reason', ...Object.keys(errors[0].data || {})];
  const rows = errors.map(e => [e.row, `"${e.reason}"`, ...Object.values(e.data || {}).map(v => `"${v}"`)].join(','));
  const blob = new Blob([[cols.join(','), ...rows].join('\n')], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = fileName; a.click();
  URL.revokeObjectURL(url);
}

export default function ImportButton({
  onImport,
  templateColumns,
  templateFileName = 'import_template.csv',
  accept = '.csv,.xlsx,.xls',
  label = 'Import'
}: ImportButtonProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<'idle' | 'mapping' | 'result'>('idle');
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [fileHeaders, setFileHeaders] = useState<FileHeader[]>([]);
  const [fieldMap, setFieldMap] = useState<Record<string, string>>({});
  const [showAllColumns, setShowAllColumns] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [showTemplate, setShowTemplate] = useState(false);
  const [headerError, setHeaderError] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setPendingFile(file);
    setHeaderError(null);
    try {
      const headers = await parseFileHeaders(file);
      if (!headers.length) { setHeaderError('No columns found in file.'); return; }
      setFileHeaders(headers);
      setFieldMap(buildAutoMap(headers, templateColumns));
      setStep('mapping');
    } catch {
      setHeaderError('Could not read file. Make sure it is a valid CSV or Excel file.');
    }
  };

  const handleImport = async () => {
    if (!pendingFile) return;
    setLoading(true);
    try {
      const res = await onImport(pendingFile, fieldMap);
      setResult(res);
      setStep('result');
    } catch {
      setResult({ success: false, imported: 0, skipped: 0, errors: [], total: 0, message: 'Upload failed. Please try again.' });
      setStep('result');
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setStep('idle');
    setPendingFile(null);
    setFileHeaders([]);
    setFieldMap({});
    setShowAllColumns(false);
    setResult(null);
    setHeaderError(null);
  };

  const unmappedRequired = templateColumns.filter(
    tc => tc.required && !Object.values(fieldMap).includes(tc.header)
  );

  return (
    <>
      <div className="flex items-center gap-1">
        <button
          onClick={() => setShowTemplate(true)}
          title="View importable fields"
          className="w-10 h-10 border border-theme rounded-lg flex items-center justify-center text-secondary hover:text-primary hover:bg-[rgba(255,255,255,0.05)] transition-colors"
        >
          <Download className="w-4 h-4" />
        </button>
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={loading || step !== 'idle'}
          title={`${label} from CSV or Excel`}
          className="w-10 h-10 border border-theme rounded-lg flex items-center justify-center text-secondary hover:text-primary hover:bg-[rgba(255,255,255,0.05)] transition-colors disabled:opacity-50"
        >
          <Upload className="w-4 h-4" />
        </button>
        <input ref={fileInputRef} type="file" accept={accept} className="hidden" onChange={handleFileChange} />
      </div>

      {/* File read error */}
      {headerError && (
        <div className="fixed inset-0 z-[3000] flex items-center justify-center bg-black/75 p-4">
          <div className="bg-card rounded-xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="text-red-500 flex-shrink-0" size={20} />
              <p className="text-sm text-red-600">{headerError}</p>
            </div>
            <button onClick={reset} className="w-full px-4 py-2 text-sm border border-theme rounded-lg text-secondary">Close</button>
          </div>
        </div>
      )}

      {/* Template / fields reference modal */}
      {showTemplate && (
        <div className="fixed inset-0 z-[3000] flex items-center justify-center bg-black/75 p-4">
          <div className="bg-card rounded-xl shadow-2xl w-full max-w-lg">
            <div className="flex items-center justify-between p-4 border-b border-theme">
              <h3 className="font-semibold text-primary">Import Fields Reference</h3>
              <button onClick={() => setShowTemplate(false)} className="text-secondary hover:text-primary">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-3">
              <p className="text-sm text-secondary">
                Your file can use any column names — you'll map them to these fields in the next step after uploading.
              </p>
              <div className="overflow-x-auto rounded-lg border border-theme">
                <table className="w-full text-xs">
                  <thead className="bg-[rgba(255,255,255,0.04)]">
                    <tr>
                      <th className="text-left px-3 py-2 text-secondary font-medium">Field</th>
                      <th className="text-left px-3 py-2 text-secondary font-medium">Example</th>
                      <th className="text-left px-3 py-2 text-secondary font-medium">Required</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-theme">
                    {templateColumns.map(col => (
                      <tr key={col.header}>
                        <td className="px-3 py-2 text-primary font-mono">{col.header}</td>
                        <td className="px-3 py-2 text-secondary">{col.example}</td>
                        <td className="px-3 py-2">
                          {col.required
                            ? <span className="text-red-500 text-xs font-medium">Required</span>
                            : <span className="text-secondary text-xs">Optional</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="flex gap-3 p-4 border-t border-theme">
              <button onClick={() => setShowTemplate(false)} className="flex-1 px-4 py-2 text-sm border border-theme rounded-lg text-secondary hover:bg-card transition-colors">
                Close
              </button>
              <button
                onClick={() => { downloadTemplate(templateColumns, templateFileName); setShowTemplate(false); }}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm bg-[var(--accent-navyblue)] text-white rounded-lg font-medium hover:opacity-90 transition-colors"
              >
                <Download className="w-4 h-4" />
                Download Template
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Column mapping modal */}
      {step === 'mapping' && (
        <div className="fixed inset-0 z-[3000] flex items-center justify-center bg-black/75 p-4">
          <div className="bg-card rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-theme flex-shrink-0">
              <div>
                <h3 className="font-semibold text-primary">Map Your Columns</h3>
                <p className="text-xs text-secondary mt-0.5">
                  {pendingFile?.name} &mdash; {fileHeaders.length} column{fileHeaders.length !== 1 ? 's' : ''} detected
                </p>
              </div>
              <button onClick={reset} className="text-secondary hover:text-primary">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 p-4 space-y-3">
              {(() => {
                // A column is "potentially mappable" if its name partially overlaps with a known field
                const isMappable = (h: FileHeader) => {
                  const hn = h.normalized.replace(/_/g, '');
                  return templateColumns.some(tc => {
                    const fn = tc.header.replace(/_/g, '');
                    return hn.includes(fn) || fn.includes(hn) || hn.length >= 3 && fn.includes(hn.slice(0, 3));
                  });
                };

                const matchedHeaders = fileHeaders.filter(h => fieldMap[h.normalized]);
                const mappableUnmatched = fileHeaders.filter(h => !fieldMap[h.normalized] && isMappable(h));
                const visibleHeaders = showAllColumns
                  ? [...matchedHeaders, ...mappableUnmatched]
                  : matchedHeaders;

                return (
                  <>
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-secondary">
                        We auto-detected matches where possible. Adjust any that are wrong, then click Import.
                      </p>
                      {mappableUnmatched.length > 0 && (
                        <button
                          onClick={() => setShowAllColumns(v => !v)}
                          className="text-xs text-[var(--accent-navyblue)] hover:underline flex-shrink-0 ml-3"
                        >
                          {showAllColumns
                            ? `Hide ${mappableUnmatched.length} unmatched`
                            : `+ ${mappableUnmatched.length} more column${mappableUnmatched.length !== 1 ? 's' : ''}`}
                        </button>
                      )}
                    </div>
                    <div className="overflow-x-auto rounded-lg border border-theme">
                      <table className="w-full text-sm">
                        <thead className="bg-[rgba(255,255,255,0.04)]">
                          <tr>
                            <th className="text-left px-3 py-2 text-secondary font-medium text-xs w-1/3">Your Column</th>
                            <th className="text-left px-3 py-2 text-secondary font-medium text-xs w-1/4">Sample Value</th>
                            <th className="text-left px-3 py-2 text-secondary font-medium text-xs">Maps To</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-theme">
                          {visibleHeaders.map(h => (
                            <tr key={h.normalized}>
                              <td className="px-3 py-2 font-mono text-xs text-primary">{h.original}</td>
                              <td className="px-3 py-2 text-xs text-secondary truncate max-w-[120px]">{h.sample || <span className="italic opacity-50">empty</span>}</td>
                              <td className="px-3 py-2">
                                <select
                                  value={fieldMap[h.normalized] || '__skip__'}
                                  onChange={e => {
                                    const val = e.target.value;
                                    setFieldMap(prev => {
                                      const next = { ...prev };
                                      if (val === '__skip__') delete next[h.normalized];
                                      else next[h.normalized] = val;
                                      return next;
                                    });
                                  }}
                                  className="w-full text-xs bg-card border border-theme rounded px-2 py-1.5 text-primary focus:outline-none focus:border-[var(--accent-navyblue)]"
                                >
                                  <option value="__skip__">— Skip this column —</option>
                                  {templateColumns.map(tc => (
                                    <option key={tc.header} value={tc.header}>
                                      {tc.header}{tc.required ? ' *' : ''}
                                    </option>
                                  ))}
                                </select>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                );
              })()}

              {unmappedRequired.length > 0 && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
                  <AlertCircle className="text-amber-500 flex-shrink-0 mt-0.5" size={14} />
                  <p className="text-xs text-amber-800">
                    Required fields not yet mapped: <strong>{unmappedRequired.map(f => f.header).join(', ')}</strong>.
                    Rows missing these values will be skipped with an error.
                  </p>
                </div>
              )}
            </div>

            <div className="flex gap-3 p-4 border-t border-theme flex-shrink-0">
              <button
                onClick={reset}
                className="flex-1 px-4 py-2 text-sm border border-theme rounded-lg text-secondary hover:bg-card transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleImport}
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm bg-[var(--accent-navyblue)] text-white rounded-lg font-medium hover:opacity-90 transition-colors disabled:opacity-50"
              >
                {loading
                  ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  : <Upload className="w-4 h-4" />}
                {loading ? 'Importing...' : 'Start Import'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Result modal */}
      {step === 'result' && result && (
        <div className="fixed inset-0 z-[3000] flex items-center justify-center bg-black/75 p-4">
          <div className="bg-card rounded-xl shadow-2xl w-full max-w-lg">
            <div className="flex items-center justify-between p-4 border-b border-theme">
              <h3 className="font-semibold text-primary">Import Result</h3>
              <button onClick={reset} className="text-secondary hover:text-primary">
                <X className="w-5 h-5" />
              </button>
            </div>

            {!result.success && !result.imported ? (
              <div className="p-4">
                <div className="flex items-center gap-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <AlertCircle className="text-red-500 flex-shrink-0" size={20} />
                  <p className="text-sm text-red-800">{result.message || 'Import failed.'}</p>
                </div>
              </div>
            ) : (
              <div className="p-4 space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  <div className="text-center p-3 bg-green-50 border border-green-200 rounded-lg">
                    <CheckCircle className="text-green-600 mx-auto mb-1" size={20} />
                    <div className="text-2xl font-bold text-green-700">{result.imported}</div>
                    <div className="text-xs text-green-600 font-medium">Imported</div>
                  </div>
                  <div className="text-center p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <SkipForward className="text-blue-500 mx-auto mb-1" size={20} />
                    <div className="text-2xl font-bold text-blue-700">{result.skipped}</div>
                    <div className="text-xs text-blue-600 font-medium">Skipped</div>
                  </div>
                  <div className="text-center p-3 bg-red-50 border border-red-200 rounded-lg">
                    <AlertCircle className="text-red-500 mx-auto mb-1" size={20} />
                    <div className="text-2xl font-bold text-red-700">{result.errors.length}</div>
                    <div className="text-xs text-red-600 font-medium">Errors</div>
                  </div>
                </div>
                <p className="text-xs text-secondary text-center">
                  Processed {result.total} row(s). Skipped rows already exist in the system.
                </p>
                {result.errors.length > 0 && (
                  <div>
                    <div className="text-xs font-semibold text-primary mb-2">Failed rows:</div>
                    <div className="max-h-40 overflow-y-auto space-y-1 rounded-lg border border-theme p-2">
                      {result.errors.map((e, i) => (
                        <div key={i} className="text-xs flex gap-2">
                          <span className="text-secondary font-mono w-10 flex-shrink-0">Row {e.row}</span>
                          <span className="text-red-600">{e.reason}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-3 p-4 border-t border-theme">
              <button onClick={reset} className="flex-1 px-4 py-2 text-sm border border-theme rounded-lg text-secondary hover:bg-card transition-colors">
                Close
              </button>
              {result.errors.length > 0 && (
                <button
                  onClick={() => downloadErrorReport(result.errors, 'import_errors.csv')}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Download Error Report
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
