import React, { useState, useRef } from 'react';
import { Upload, X, CheckCircle, AlertCircle, XCircle, ChevronDown, ChevronUp, Loader2, FileText, Save } from 'lucide-react';
import type { MessageInstance } from 'antd/es/message/interface';
import { parseFuelCardPdf, confirmFuelCardImport } from '../../../../../axios/api/dispatcher.fuelreport';

interface FleetUnitOption {
  id: string;
  unitNo: string;
  unitType?: string;
  makeModel?: string;
}

interface DraftRow {
  _rowIndex: number;
  matchStatus: 'matched' | 'review' | 'unmatched';
  cardNumber?: string;
  date: string;
  transactionNumber?: string;
  storeCity?: string;
  state?: string;
  country?: string;
  product?: string;
  driverIdRaw?: string;
  driverName?: string | null;
  driverId_db?: string | null;
  vehicleRaw?: string;
  vehicleId_db?: string | null;
  vehicleUnitNo?: string | null;
  quantity?: number;
  fuelAmount?: number;
  taxHst?: number;
  taxQst?: number;
  invoiceAmount?: number;
  currency: string;
  odometer?: string;
  cardDescription?: string;
  time?: string;
  alreadyImported?: boolean;
  skip: boolean;
}

type Step = 'upload' | 'review' | 'done';
type RowFilter = 'all' | 'needs-attention' | 'skipped';

interface Props {
  onClose: () => void;
  onImported: () => void;
  fleetUnits: FleetUnitOption[];
  messageApi: MessageInstance;
  /** File picked in the generic CSV import that turned out to be a Pilot Flying J report */
  initialFile?: File | null;
}

const STATUS_CONFIG = {
  matched: { icon: CheckCircle, color: '#059669', bg: 'rgba(5,150,105,0.08)', label: 'Matched' },
  review: { icon: AlertCircle, color: '#d97706', bg: 'rgba(251,191,36,0.1)', label: 'Review' },
  unmatched: { icon: XCircle, color: '#EF4444', bg: 'rgba(239,68,68,0.1)', label: 'Unmatched' },
};

const fmt = (n?: number) => (n !== undefined && n !== null ? n.toFixed(2) : '—');
const fmtDate = (iso: string) => {
  // Statement dates are calendar days stored as UTC midnight: read them in UTC
  try { return new Date(iso).toLocaleDateString('en-CA', { year: 'numeric', month: 'short', day: '2-digit', timeZone: 'UTC' }); }
  catch { return iso; }
};

export default function FuelCardImportModal({ onClose, onImported, fleetUnits, messageApi, initialFile }: Props) {
  const [step, setStep] = useState<Step>('upload');
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState<File | null>(initialFile ?? null);
  const [parsing, setParsing] = useState(false);
  const [rows, setRows] = useState<DraftRow[]>([]);
  const [parseStats, setParseStats] = useState({ total: 0, matched: 0, review: 0, unmatched: 0 });
  const [saving, setSaving] = useState(false);
  const [saveResult, setSaveResult] = useState<{ success: number; failed: number; skipped?: number; errors: string[] } | null>(null);
  const [parseTotals, setParseTotals] = useState<{ invoiceAmount: number; byCurrency: Record<string, number>; alreadyImported: number } | null>(null);
  const [rowFilter, setRowFilter] = useState<RowFilter>('all');
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = (f: File) => {
    const n = f.name.toLowerCase();
    if (!n.endsWith('.pdf') && !n.endsWith('.xlsx') && !n.endsWith('.xls')) {
      messageApi.error(n.endsWith('.csv')
        ? 'CSV files go through "Import CSV / Excel". Upload the fuel card report as Excel or PDF here.'
        : 'Please upload a PDF or Excel (.xlsx / .xls) file');
      return;
    }
    setFile(f);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  const handleParse = async () => {
    if (!file) return;
    setParsing(true);
    try {
      const res = await parseFuelCardPdf(file);
      if (!res?.success) {
        messageApi.error(res?.message || 'Failed to read the report');
        return;
      }
      setRows(res.data.rows);
      setParseTotals(res.data.totals ? { ...res.data.totals, alreadyImported: res.data.alreadyImported || 0 } : null);
      if (res.data.alreadyImported) {
        messageApi.info(`${res.data.alreadyImported} transaction(s) were already imported and are skipped`);
      }
      setParseStats({
        total: res.data.totalRows,
        matched: res.data.matched,
        review: res.data.review,
        unmatched: res.data.unmatched,
      });
      setStep('review');
    } catch {
      messageApi.error('Failed to read the report');
    } finally {
      setParsing(false);
    }
  };

  // Picking a truck for one row also fills every other row with the same card unit that has
  // no truck yet, so a report for one card doesn't need the truck chosen row by row
  const cardUnitKey = (r?: DraftRow) => String(r?.vehicleRaw || r?.cardDescription || '').trim().toLowerCase();
  const assignVehicle = (idx: number, vehicleId: string) => {
    const unit = fleetUnits.find(u => u.id === vehicleId);
    const patch = {
      vehicleId_db: vehicleId || null,
      vehicleUnitNo: unit?.unitNo || null,
      matchStatus: (vehicleId ? 'matched' : 'unmatched') as DraftRow['matchStatus'],
    };
    setRows(prev => {
      const key = cardUnitKey(prev.find(r => r._rowIndex === idx));
      return prev.map(r => (r._rowIndex === idx || (vehicleId && key && !r.vehicleId_db && cardUnitKey(r) === key))
        ? { ...r, ...patch } : r);
    });
  };

  const assignVehicleToUnassigned = (vehicleId: string) => {
    if (!vehicleId) return;
    const unit = fleetUnits.find(u => u.id === vehicleId);
    const n = rows.filter(r => !r.skip && !r.vehicleId_db).length;
    setRows(prev => prev.map(r => (r.skip || r.vehicleId_db)
      ? r
      : { ...r, vehicleId_db: vehicleId, vehicleUnitNo: unit?.unitNo || null, matchStatus: 'matched' as const }));
    messageApi.success(`Truck ${unit?.unitNo || ''} set on ${n} row(s)`);
  };

  const toggleSkip = (idx: number) => {
    setRows(prev => prev.map(r => r._rowIndex === idx ? { ...r, skip: !r.skip } : r));
  };

  const acceptAllMatched = () => {
    // All matched rows are already accepted — just make unmatched/review rows skipped
    // Actually do nothing, just scroll user attention to review rows
    messageApi.info('All matched rows will be saved. Review or skip the remaining rows.');
  };

  const skipAllUnmatched = () => {
    setRows(prev => prev.map(r =>
      (r.matchStatus === 'unmatched' && !r.vehicleId_db) ? { ...r, skip: true } : r
    ));
    messageApi.info('Unmatched rows have been marked as skip');
  };

  const toggleExpand = (idx: number) => {
    setExpandedRows(prev => {
      const s = new Set(prev);
      if (s.has(idx)) s.delete(idx); else s.add(idx);
      return s;
    });
  };

  const handleSave = async () => {
    const toSave = rows.filter(r => !r.skip);
    const unresolved = toSave.filter(r => !r.vehicleId_db);
    if (unresolved.length > 0) {
      messageApi.warning(`${unresolved.length} row(s) still have no vehicle assigned. Assign or skip them.`);
      return;
    }
    setSaving(true);
    try {
      const res = await confirmFuelCardImport(toSave);
      if (!res?.success && !res?.data) {
        messageApi.error(res?.message || 'Failed to save');
        return;
      }
      setSaveResult(res.data || { success: res.data?.success || 0, failed: 0, errors: [] });
      setStep('done');
      if ((res.data?.success || 0) > 0) onImported();
    } catch {
      messageApi.error('Failed to save fuel reports');
    } finally {
      setSaving(false);
    }
  };

  const visibleRows = rows.filter(r => {
    if (rowFilter === 'needs-attention') return !r.skip && r.matchStatus !== 'matched';
    if (rowFilter === 'skipped') return r.skip;
    return true;
  });

  const activeRows = rows.filter(r => !r.skip);
  const readyToSave = activeRows.every(r => r.vehicleId_db);

  // ── Upload step ──────────────────────────────────────────────────────────
  if (step === 'upload') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}>
        <div className="relative w-full max-w-lg mx-4 rounded-xl p-6" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
          <button onClick={onClose} className="absolute top-4 right-4 text-secondary hover:text-primary transition-colors">
            <X size={18} />
          </button>

          <div className="flex items-center gap-2 mb-5">
            <FileText size={20} style={{ color: 'var(--accent-blue)' }} />
            <h2 className="text-lg font-semibold text-headings">Import Fuel Card Report</h2>
          </div>

          {/* Drop zone */}
          <div
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className="flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed cursor-pointer transition-all p-8"
            style={{
              borderColor: dragging ? 'var(--accent-blue)' : 'var(--border-color)',
              backgroundColor: dragging ? 'rgba(5,150,105,0.05)' : 'var(--bg-secondary)',
            }}
          >
            <Upload size={32} style={{ color: file ? '#059669' : 'var(--text-secondary)' }} />
            {file ? (
              <div className="text-center">
                <p className="font-medium text-headings">{file.name}</p>
                <p className="text-xs text-secondary mt-1">{(file.size / 1024).toFixed(1)} KB</p>
              </div>
            ) : (
              <div className="text-center">
                <p className="font-medium text-primary">Drop your report here or click to browse</p>
                <p className="text-xs text-secondary mt-1">Pilot Flying J transaction report (Excel or PDF), or EFS / Comdata report (PDF). Every transaction is read from the file; already imported ones are skipped.</p>
              </div>
            )}
            <input ref={fileInputRef} type="file" accept=".pdf,.xlsx,.xls" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
          </div>

          <div className="flex gap-3 mt-5">
            <button onClick={onClose} className="flex-1 py-2 rounded-lg text-sm font-medium text-secondary border border-theme hover:bg-secondary transition-all">
              Cancel
            </button>
            <button
              onClick={handleParse}
              disabled={!file || parsing}
              className="flex-1 py-2 rounded-lg text-sm font-semibold transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              style={{ backgroundColor: 'var(--accent-blue)', color: '#000' }}
            >
              {parsing ? <><Loader2 size={14} className="animate-spin" /> Parsing…</> : 'Read report'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Done step ────────────────────────────────────────────────────────────
  if (step === 'done') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}>
        <div className="relative w-full max-w-md mx-4 rounded-xl p-6" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
          <div className="text-center">
            <CheckCircle size={48} className="mx-auto mb-4" style={{ color: '#059669' }} />
            <h2 className="text-xl font-semibold text-headings mb-2">Import Complete</h2>
            {saveResult && (
              <div className="space-y-1 text-sm text-secondary mb-4">
                <p><span className="font-semibold" style={{ color: '#059669' }}>{saveResult.success}</span> fuel reports saved</p>
                {saveResult.failed > 0 && <p><span className="font-semibold text-red-400">{saveResult.failed}</span> failed</p>}
                {!!saveResult.skipped && <p><span className="font-semibold">{saveResult.skipped}</span> already imported (not saved again)</p>}
              </div>
            )}
            {saveResult?.errors?.length ? (
              <div className="text-left text-xs text-red-400 bg-red-900/10 rounded-lg p-3 mb-4 max-h-32 overflow-y-auto space-y-1">
                {saveResult.errors.map((e, i) => <div key={i}>{e}</div>)}
              </div>
            ) : null}
            <button onClick={onClose} className="w-full py-2 rounded-lg text-sm font-semibold" style={{ backgroundColor: 'var(--accent-blue)', color: '#000' }}>
              Done
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Review step ──────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}>
      <div className="flex flex-col h-full max-h-full m-4 lg:m-6 rounded-xl overflow-hidden" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-theme flex-shrink-0">
          <div className="flex items-center gap-3">
            <FileText size={18} style={{ color: 'var(--accent-blue)' }} />
            <div>
              <h2 className="text-base font-semibold text-headings">Review Imported Transactions</h2>
              <p className="text-xs text-secondary">
                {file?.name}
                {parseTotals && (
                  <> · {rows.length} transactions · Invoice total {Object.entries(parseTotals.byCurrency).map(([c, v]) => `${c === 'CAD' ? 'CAD' : 'USD'} ${v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`).join(' + ')}
                    {parseTotals.alreadyImported ? ` · ${parseTotals.alreadyImported} already imported` : ''}</>
                )}
              </p>
            </div>
          </div>

          {/* Stats pills */}
          <div className="flex items-center gap-2 mx-4">
            {(['matched', 'review', 'unmatched'] as const).map(s => {
              const cfg = STATUS_CONFIG[s];
              const count = s === 'matched' ? parseStats.matched : s === 'review' ? parseStats.review : parseStats.unmatched;
              return (
                <div key={s} className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: cfg.bg, color: cfg.color }}>
                  <cfg.icon size={11} />
                  {count}
                </div>
              );
            })}
          </div>

          <button onClick={onClose} className="text-secondary hover:text-primary transition-colors ml-2">
            <X size={18} />
          </button>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-3 px-5 py-3 border-b border-theme flex-shrink-0 flex-wrap">
          {/* Filter tabs */}
          <div className="flex rounded-lg overflow-hidden border border-theme text-xs">
            {([['all', 'All'], ['needs-attention', 'Needs Attention'], ['skipped', 'Skipped']] as [RowFilter, string][]).map(([v, label]) => (
              <button
                key={v}
                onClick={() => setRowFilter(v)}
                className="px-3 py-1.5 transition-colors"
                style={{
                  backgroundColor: rowFilter === v ? 'var(--accent-blue)' : 'transparent',
                  color: rowFilter === v ? '#000' : 'var(--text-secondary)',
                }}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="flex-1" />

          {activeRows.some(r => !r.vehicleId_db) && (
            <select
              value=""
              onChange={e => assignVehicleToUnassigned(e.target.value)}
              className="text-xs px-2 py-1.5 rounded-lg border border-theme bg-[var(--bg-card)] text-primary"
              title="Set one truck on every row that has no truck yet"
            >
              <option value="">Set truck on all unassigned rows…</option>
              {fleetUnits.map(u => (
                <option key={u.id} value={u.id}>{u.unitNo}</option>
              ))}
            </select>
          )}
          <button onClick={skipAllUnmatched} className="text-xs px-3 py-1.5 rounded-lg border border-theme text-secondary hover:text-primary transition-colors">
            Skip All Unmatched
          </button>
          <button onClick={acceptAllMatched} className="text-xs px-3 py-1.5 rounded-lg border border-theme text-secondary hover:text-primary transition-colors">
            Accept All Matched
          </button>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-y-auto">
          <table className="w-full text-xs">
            <thead className="sticky top-0 z-10" style={{ backgroundColor: 'var(--bg-secondary)' }}>
              <tr className="border-b border-theme">
                <th className="text-left px-3 py-2 text-secondary font-medium w-24">Status</th>
                <th className="text-left px-3 py-2 text-secondary font-medium">Date</th>
                <th className="text-left px-3 py-2 text-secondary font-medium">Driver ID</th>
                <th className="text-left px-3 py-2 text-secondary font-medium">Vehicle</th>
                <th className="text-left px-3 py-2 text-secondary font-medium">Product</th>
                <th className="text-right px-3 py-2 text-secondary font-medium">Qty</th>
                <th className="text-right px-3 py-2 text-secondary font-medium">Fuel Amt</th>
                <th className="text-right px-3 py-2 text-secondary font-medium">Invoice</th>
                <th className="text-center px-3 py-2 text-secondary font-medium w-16">Cur</th>
                <th className="text-center px-3 py-2 text-secondary font-medium w-16">Skip</th>
                <th className="w-8" />
              </tr>
            </thead>
            <tbody>
              {visibleRows.length === 0 && (
                <tr><td colSpan={11} className="text-center py-12 text-secondary">No rows match the current filter.</td></tr>
              )}
              {visibleRows.map(row => {
                const cfg = STATUS_CONFIG[row.matchStatus];
                const expanded = expandedRows.has(row._rowIndex);
                return (
                  <React.Fragment key={row._rowIndex}>
                    <tr
                      className="border-b border-theme transition-colors"
                      style={{
                        opacity: row.skip ? 0.4 : 1,
                        backgroundColor: expanded ? 'rgba(5,150,105,0.03)' : undefined,
                      }}
                    >
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-1 px-2 py-1 rounded-full w-fit" style={{ backgroundColor: cfg.bg }}>
                          <cfg.icon size={10} style={{ color: cfg.color }} />
                          <span style={{ color: cfg.color, fontSize: 10 }}>{row.alreadyImported ? 'Already imported' : cfg.label}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2 text-primary whitespace-nowrap">{fmtDate(row.date)}</td>
                      <td className="px-3 py-2 text-secondary">{row.driverName || row.driverIdRaw || '—'}</td>
                      <td className="px-3 py-2">
                        {row.vehicleUnitNo ? (
                          <span className="text-primary">{row.vehicleUnitNo}</span>
                        ) : (
                          <span className="text-red-400">{row.vehicleRaw || '—'} <span className="opacity-60">(unmatched)</span></span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-secondary max-w-[120px] truncate">{row.product || '—'}</td>
                      <td className="px-3 py-2 text-right text-primary font-mono">{fmt(row.quantity)}</td>
                      <td className="px-3 py-2 text-right text-primary font-mono">{fmt(row.fuelAmount)}</td>
                      <td className="px-3 py-2 text-right font-semibold font-mono" style={{ color: '#059669' }}>{fmt(row.invoiceAmount)}</td>
                      <td className="px-3 py-2 text-center">
                        <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: 'rgba(15,31,23,0.05)', color: 'var(--text-secondary)' }}>
                          {row.currency}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-center">
                        <button
                          onClick={() => toggleSkip(row._rowIndex)}
                          className="w-8 h-4 rounded-full transition-all relative"
                          style={{ backgroundColor: row.skip ? '#EF4444' : 'rgba(15,31,23,0.1)' }}
                        >
                          <span className="absolute top-0.5 h-3 w-3 rounded-full bg-white transition-all" style={{ left: row.skip ? 'calc(100% - 14px)' : '2px' }} />
                        </button>
                      </td>
                      <td className="px-2 py-2">
                        <button onClick={() => toggleExpand(row._rowIndex)} className="text-secondary hover:text-primary transition-colors">
                          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </button>
                      </td>
                    </tr>

                    {expanded && (
                      <tr className="border-b border-theme">
                        <td colSpan={11} className="px-4 py-3" style={{ backgroundColor: 'rgba(5,150,105,0.03)' }}>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            {/* Vehicle assignment */}
                            <div>
                              <label className="block text-secondary mb-1 font-medium">Assign Vehicle</label>
                              <select
                                value={row.vehicleId_db || ''}
                                onChange={e => assignVehicle(row._rowIndex, e.target.value)}
                                className="w-full px-2 py-1.5 rounded border border-theme text-primary"
                                style={{ backgroundColor: 'var(--bg-secondary)', fontSize: 12 }}
                              >
                                <option value="">— Select vehicle —</option>
                                {fleetUnits.map(u => (
                                  <option key={u.id} value={u.id}>{u.unitNo}{u.makeModel ? ` — ${u.makeModel}` : ''}</option>
                                ))}
                              </select>
                              {row.vehicleRaw && (
                                <p className="text-secondary mt-1" style={{ fontSize: 11 }}>PDF value: <span className="text-yellow-400">{row.vehicleRaw}</span></p>
                              )}
                            </div>

                            {/* Details */}
                            <div className="space-y-1">
                              <div className="text-secondary">Transaction#: <span className="text-primary">{row.transactionNumber || '—'}</span></div>
                              <div className="text-secondary">Location: <span className="text-primary">{[row.storeCity, row.state, row.country].filter(Boolean).join(', ') || '—'}</span></div>
                              <div className="text-secondary">Odometer: <span className="text-primary">{row.odometer || '—'}</span></div>
                            </div>

                            <div className="space-y-1">
                              <div className="text-secondary">Card#: <span className="text-primary">{row.cardNumber || '—'}</span></div>
                              <div className="text-secondary">HST: <span className="text-primary">{fmt(row.taxHst)}</span></div>
                              <div className="text-secondary">QST: <span className="text-primary">{fmt(row.taxQst)}</span></div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-4 border-t border-theme flex-shrink-0">
          <div className="text-sm text-secondary">
            <span className="font-semibold text-primary">{activeRows.length}</span> of {rows.length} rows will be saved
            {!readyToSave && activeRows.filter(r => !r.vehicleId_db).length > 0 && (
              <span className="text-red-400 ml-2">— {activeRows.filter(r => !r.vehicleId_db).length} still need a vehicle</span>
            )}
          </div>
          <div className="flex gap-3">
            <button onClick={() => setStep('upload')} className="px-4 py-2 rounded-lg text-sm border border-theme text-secondary hover:text-primary transition-colors">
              ← Back
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !readyToSave}
              className="px-5 py-2 rounded-lg text-sm font-semibold transition-all disabled:opacity-50 flex items-center gap-2"
              style={{ backgroundColor: '#059669', color: '#000' }}
            >
              {saving ? <><Loader2 size={14} className="animate-spin" /> Saving…</> : <><Save size={14} /> Save {activeRows.length} Reports</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
