/* eslint-disable @typescript-eslint/no-explicit-any -- API payloads (paystubs, settlements, bills) are untyped JSON */
import { useEffect, useMemo, useState } from 'react';
import { X, Truck, RefreshCw, AlertCircle } from 'lucide-react';
import { getTruckWork, createSettlement } from '../../axios/api/account.settlement';
import PayAdjustments from './PayAdjustments';
import { type PayLine, newPayLine, sumPayLines, toApiPayLines, payLinesError } from '../../utils/payLines';

// Owner-operator settlement made per TRUCK (client 15 Nov): every load the truck ran in the
// period, whoever drove it. If our own driver drove the O/O truck, his pay is deducted
// from the settlement ("it's also a payroll, just B2B").

interface WorkLine {
    order: string;
    loadNumber: string;
    tripType: string;
    driverNames: string;
    periodFrom?: string;
    periodTo?: string;
    origin: string;
    destination: string;
    payType: string;
    rate: number;
    miles: number;
    amount: number;
    alreadySettledIn?: string | null;
    selected?: boolean;
}

interface Props {
    open: boolean;
    trucks: any[];
    onClose: () => void;
    onCreated: (message: string) => void;
}

const r2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100;
const truckLabel = (t: any) => t?.internalId || t?.unitNumber || t?.plateNumber || t?.vehicleNumber || t?._id;
const fmt = (d?: string) => (d ? new Date(d).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }) : '');

export default function TruckSettlementModal({ open, trucks, onClose, onCreated }: Props) {
    const [truckId, setTruckId] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [ratePerMile, setRatePerMile] = useState('');
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [lines, setLines] = useState<WorkLine[]>([]);
    const [payee, setPayee] = useState<{ _id?: string; name: string; address?: string } | null>(null);
    const [payeeName, setPayeeName] = useState('');
    const [additions, setAdditions] = useState<PayLine[]>([]);
    const [deductions, setDeductions] = useState<PayLine[]>([]);
    const [billNumber, setBillNumber] = useState('');
    const [chequeNumber, setChequeNumber] = useState('');
    const [gstNumber, setGstNumber] = useState('');
    const [status, setStatus] = useState<'Pending' | 'Processing' | 'Paid'>('Pending');
    const [notes, setNotes] = useState('');
    const [loaded, setLoaded] = useState(false);
    const [rateSource, setRateSource] = useState<string>('');

    useEffect(() => {
        if (!open) return;
        setTruckId(''); setStartDate(''); setEndDate(''); setRatePerMile('');
        setLines([]); setPayee(null); setPayeeName(''); setAdditions([]); setDeductions([]);
        setBillNumber(''); setChequeNumber(''); setGstNumber(''); setStatus('Pending'); setNotes('');
        setError(null); setLoaded(false); setRateSource('');
    }, [open]);

    // Auto-load work when all three required fields are set
    useEffect(() => {
        if (truckId && startDate && endDate && !loaded && !loading) {
            loadWork();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [truckId, startDate, endDate]);

    // Owner-operator trucks first
    const sortedTrucks = useMemo(() => [...trucks].sort((a, b) => {
        const ao = a.ownership === 'OWNER OPERATOR' ? 0 : 1;
        const bo = b.ownership === 'OWNER OPERATOR' ? 0 : 1;
        return ao - bo || String(truckLabel(a)).localeCompare(String(truckLabel(b)));
    }), [trucks]);

    const loadWork = async () => {
        if (!truckId || !startDate || !endDate) {
            setError('Select a truck and the pay period first');
            return;
        }
        setError(null);
        setLoading(true);
        try {
            const res = await getTruckWork({
                truckId, startDate, endDate,
                ...(parseFloat(ratePerMile) > 0 ? { ratePerMile: parseFloat(ratePerMile) } : {}),
            });
            if (!res?.success) {
                setError(res?.message || 'Could not load the work for this truck');
                return;
            }
            const d = res.data;
            setLines((d.lines || []).map((l: WorkLine) => ({ ...l, selected: !l.alreadySettledIn })));
            setPayee(d.payee);
            setPayeeName(d.payee?.name || '');
            if (!ratePerMile && d.rates?.ratePerMile) setRatePerMile(String(d.rates.ratePerMile));
            setRateSource(d.rates?.source || '');
            // Our own drivers on this truck -> suggested deductions (editable)
            setDeductions(prev => [
                ...prev.filter(p => p.source !== 'suggested'),
                ...(d.suggestedDeductions || []).map((s: any) => newPayLine(s.memo, s.amount, 'suggested')),
            ]);
            setLoaded(true);
        } finally {
            setLoading(false);
        }
    };

    const toggleLine = (order: string) =>
        setLines(prev => prev.map(x => (String(x.order) === String(order) && !x.alreadySettledIn ? { ...x, selected: !x.selected } : x)));

    const applyRate = (value: string) => {
        setRatePerMile(value);
        const rate = parseFloat(value);
        if (rate > 0) setLines(prev => prev.map(l => ({ ...l, rate, amount: r2(l.miles * rate) })));
    };

    const selected = lines.filter(l => l.selected);
    const gross = r2(selected.reduce((s, l) => s + l.amount, 0));
    const miles = r2(selected.reduce((s, l) => s + l.miles, 0));
    const net = r2(gross + sumPayLines(additions) - sumPayLines(deductions));

    const save = async () => {
        if (!truckId || !startDate || !endDate) return setError('Select a truck and the pay period');
        if (selected.length === 0) return setError('Tick at least one load');
        if (gross <= 0) return setError('Gross is $0. Enter the rate per mile for this owner-operator first.');
        if (!payee?._id && !payeeName.trim()) return setError('Enter who is being paid (owner-operator / company name)');
        const linesErr = payLinesError(additions, deductions);
        if (linesErr) return setError(linesErr);

        setSaving(true);
        setError(null);
        try {
            const res = await createSettlement({
                truck: truckId,
                driver: payee?._id || undefined,
                payeeName: payeeName.trim() || payee?.name,
                payeeAddress: payee?.address || '',
                payPeriod: { startDate, endDate },
                lineItems: selected.map(l => ({
                    order: l.order, loadNumber: l.loadNumber, tripType: l.tripType, driverNames: l.driverNames,
                    periodFrom: l.periodFrom, periodTo: l.periodTo, origin: l.origin, destination: l.destination,
                    payType: l.payType, rate: l.rate, miles: l.miles, amount: l.amount,
                })),
                additionItems: toApiPayLines(additions),
                deductionItems: toApiPayLines(deductions),
                billNumber, chequeNumber, gstNumber, status, notes,
            });
            if (res?.success) {
                onCreated(`Settlement ${res.data?.settlementId || ''} created for truck #${truckLabel(trucks.find(t => t._id === truckId))}`);
                onClose();
            } else {
                setError(res?.message || 'Could not create the settlement');
            }
        } finally {
            setSaving(false);
        }
    };

    if (!open) return null;

    return (
        <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-[10001] flex items-center justify-center p-4">
            <div className="bg-card rounded-xl shadow-xl max-w-6xl w-full max-h-[92vh] overflow-y-auto">
                <div className="p-5 border-b border-theme sticky top-0 bg-card z-10 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <Truck className="text-[var(--accent-blue)]" size={22} />
                        <div>
                            <h4 className="text-lg font-bold text-headings">Owner-Operator Settlement by Truck</h4>
                            <p className="text-xs text-secondary">All loads the truck ran in the period, whoever drove it. Our own drivers' pay is deducted.</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-lg hover:bg-[rgba(15,31,23,0.05)]"><X size={22} /></button>
                </div>

                <div className="p-5 space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
                        <div className="md:col-span-2">
                            <label className="block text-xs font-medium text-headings mb-1">Truck *</label>
                            <select value={truckId} onChange={e => { setTruckId(e.target.value); setLoaded(false); }} className="w-full px-3 py-2 border border-theme rounded-lg bg-[var(--bg-card)] text-sm">
                                <option value="">Select truck</option>
                                {sortedTrucks.map(t => (
                                    <option key={t._id} value={t._id}>
                                        #{truckLabel(t)}{t.ownership === 'OWNER OPERATOR' ? ' — Owner-Operator' : ''}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-headings mb-1">From *</label>
                            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full px-3 py-2 border border-theme rounded-lg bg-[var(--bg-card)] text-sm" />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-headings mb-1">To *</label>
                            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full px-3 py-2 border border-theme rounded-lg bg-[var(--bg-card)] text-sm" />
                        </div>
                        <button onClick={loadWork} disabled={loading} className="px-4 py-2 rounded-lg !text-white bg-[var(--accent-navyblue)] flex items-center justify-center gap-2 text-sm disabled:opacity-50">
                            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> {loaded ? 'Reload loads' : 'Load truck work'}
                        </button>
                    </div>

                    {error && (
                        <div className="flex items-center gap-2 text-sm text-red-500 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
                            <AlertCircle size={16} /> {error}
                        </div>
                    )}

                    {loaded && (
                        <>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                                <div className="md:col-span-2">
                                    <label className="block text-xs font-medium text-headings mb-1">Pay to (owner-operator) *</label>
                                    <input value={payeeName} onChange={e => setPayeeName(e.target.value)} placeholder="e.g. 10017030 MANITOBA LTD. | Neeraj Chawla" className="w-full px-3 py-2 border border-theme rounded-lg bg-[var(--bg-card)] text-sm" />
                                    {!payee && <p className="text-xs text-yellow-500 mt-1">No owner-operator is linked to this truck; type the payee name.</p>}
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-headings mb-1">Rate per mile</label>
                                    <input type="number" step="0.01" min="0" value={ratePerMile} onChange={e => applyRate(e.target.value)} placeholder="Enter rate"
                                        className={`w-full px-3 py-2 border rounded-lg bg-[var(--bg-card)] text-sm ${parseFloat(ratePerMile) > 0 ? 'border-theme' : 'border-red-500'}`} />
                                    {!(parseFloat(ratePerMile) > 0) && <p className="text-xs text-red-500 mt-1">No rate on this owner-operator's profile. Enter it to work out the gross.</p>}
                                    {parseFloat(ratePerMile) > 0 && rateSource === 'lastSettlement' && <p className="text-xs text-secondary mt-1">From this truck's last settlement.</p>}
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-headings mb-1">GST No.</label>
                                    <input value={gstNumber} onChange={e => setGstNumber(e.target.value)} className="w-full px-3 py-2 border border-theme rounded-lg bg-[var(--bg-card)] text-sm" />
                                </div>
                            </div>

                            {lines.length > 0 && lines.every(l => l.alreadySettledIn) && (
                                <div className="flex items-center gap-2 text-sm text-yellow-500 bg-yellow-500/10 border border-yellow-500/30 rounded-lg px-3 py-2">
                                    <AlertCircle size={16} /> Every load of this truck in this period is already in a settlement ({Array.from(new Set(lines.map(l => l.alreadySettledIn))).join(', ')}). Set that settlement to Cancelled (Edit → Status) to settle these loads again.
                                </div>
                            )}
                            <div className="border border-theme rounded-lg overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="text-xs text-secondary uppercase">
                                        <tr className="border-b border-theme">
                                            <th className="px-2 py-2 text-left">
                                                <input type="checkbox" className="w-4 h-4 cursor-pointer accent-[var(--accent-green)]" checked={lines.length > 0 && lines.every(l => l.selected || l.alreadySettledIn)}
                                                    onChange={e => setLines(prev => prev.map(l => ({ ...l, selected: l.alreadySettledIn ? false : e.target.checked })))} />
                                            </th>
                                            <th className="px-2 py-2 text-left">Load #</th>
                                            <th className="px-2 py-2 text-left">Type</th>
                                            <th className="px-2 py-2 text-left">Driver(s)</th>
                                            <th className="px-2 py-2 text-left">Period</th>
                                            <th className="px-2 py-2 text-left">From</th>
                                            <th className="px-2 py-2 text-left">To</th>
                                            <th className="px-2 py-2 text-right">Rate</th>
                                            <th className="px-2 py-2 text-right">Miles</th>
                                            <th className="px-2 py-2 text-right">Amount</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {lines.length === 0 ? (
                                            <tr><td colSpan={10} className="px-3 py-6 text-center text-secondary">No delivered loads for this truck in the period.</td></tr>
                                        ) : lines.map(l => (
                                            <tr key={l.order}
                                                // The whole row ticks / unticks the load (the small checkbox alone was
                                                // hard to hit - client 19 Nov: "not able to click on any load")
                                                onClick={(e) => {
                                                    if (l.alreadySettledIn) return;
                                                    if ((e.target as HTMLElement).closest('input')) return; // miles / amount boxes
                                                    toggleLine(l.order);
                                                }}
                                                title={l.alreadySettledIn ? `Already paid in ${l.alreadySettledIn}. Set that settlement to Cancelled to settle this load again.` : 'Click to tick / untick this load'}
                                                className={`border-b border-theme/50 ${l.alreadySettledIn ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer hover:bg-[rgba(5,150,105,0.06)]'} ${l.selected ? 'bg-[var(--accent-green)]/10' : ''}`}>
                                                <td className="px-2 py-2">
                                                    <input type="checkbox" disabled={!!l.alreadySettledIn} checked={!!l.selected}
                                                        className="w-4 h-4 cursor-pointer accent-[var(--accent-green)]"
                                                        onChange={() => toggleLine(l.order)} />
                                                </td>
                                                <td className="px-2 py-2 font-medium">
                                                    {l.loadNumber || '—'}
                                                    {l.alreadySettledIn && <span className="ml-2 text-[10px] px-2 py-0.5 rounded-full bg-yellow-500/15 text-yellow-500">In {l.alreadySettledIn}</span>}
                                                </td>
                                                <td className="px-2 py-2">{l.tripType}</td>
                                                <td className="px-2 py-2">{l.driverNames || '—'}</td>
                                                <td className="px-2 py-2 whitespace-nowrap">{fmt(l.periodFrom)} - {fmt(l.periodTo)}</td>
                                                <td className="px-2 py-2">{l.origin}</td>
                                                <td className="px-2 py-2">{l.destination}</td>
                                                <td className="px-2 py-2 text-right">${l.rate.toFixed(2)}</td>
                                                <td className="px-2 py-2 text-right">
                                                    {/* Miles can be corrected here (a load whose address wasn't found on the map
                                                        comes in at 0 miles); the amount follows miles x rate (client 19 Nov) */}
                                                    <input type="number" step="0.01" min="0" value={l.miles}
                                                        title={l.miles > 0 ? 'Miles' : 'This load has no miles - type them in'}
                                                        onChange={e => {
                                                            const m = parseFloat(e.target.value) || 0;
                                                            setLines(prev => prev.map(x => (x.order === l.order ? { ...x, miles: m, amount: r2(m * x.rate) } : x)));
                                                        }}
                                                        className={`w-24 px-2 py-1 text-right border rounded bg-[var(--bg-card)] ${l.miles > 0 ? 'border-theme' : 'border-yellow-500'}`} />
                                                </td>
                                                <td className="px-2 py-2 text-right">
                                                    <input type="number" step="0.01" min="0" value={l.amount}
                                                        onChange={e => setLines(prev => prev.map(x => (x.order === l.order ? { ...x, amount: parseFloat(e.target.value) || 0 } : x)))}
                                                        className="w-24 px-2 py-1 text-right border border-theme rounded bg-[var(--bg-card)]" />
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <PayAdjustments
                                title="Additions & Deductions"
                                additions={additions}
                                deductions={deductions}
                                onChange={(a, d) => { setAdditions(a); setDeductions(d); }}
                            />

                            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                                <div>
                                    <label className="block text-xs font-medium text-headings mb-1">Bill #</label>
                                    <input value={billNumber} onChange={e => setBillNumber(e.target.value)} className="w-full px-3 py-2 border border-theme rounded-lg bg-[var(--bg-card)] text-sm" />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-headings mb-1">Cheque #</label>
                                    <input value={chequeNumber} onChange={e => setChequeNumber(e.target.value)} className="w-full px-3 py-2 border border-theme rounded-lg bg-[var(--bg-card)] text-sm" />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-headings mb-1">Status</label>
                                    <select value={status} onChange={e => setStatus(e.target.value as any)} className="w-full px-3 py-2 border border-theme rounded-lg bg-[var(--bg-card)] text-sm">
                                        <option value="Pending">Pending</option>
                                        <option value="Processing">Processing</option>
                                        <option value="Paid">Paid</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-headings mb-1">Notes</label>
                                    <input value={notes} onChange={e => setNotes(e.target.value)} className="w-full px-3 py-2 border border-theme rounded-lg bg-[var(--bg-card)] text-sm" />
                                </div>
                            </div>

                            {selected.some(l => !(l.miles > 0)) && (
                                <p className="text-xs text-yellow-500">
                                    {selected.filter(l => !(l.miles > 0)).length} ticked load(s) have 0 miles. Type the miles in the Miles column - they are also saved on the load.
                                </p>
                            )}
                            <div className="flex flex-wrap justify-end gap-6 text-sm border-t border-theme pt-4">
                                <span>Loads: <strong>{selected.length}</strong></span>
                                <span>Total miles: <strong>{miles.toFixed(2)}</strong></span>
                                <span>Gross: <strong>${gross.toFixed(2)}</strong></span>
                                <span className="text-green-600">+${sumPayLines(additions).toFixed(2)}</span>
                                <span className="text-red-600">−${sumPayLines(deductions).toFixed(2)}</span>
                                <span className="text-base">Net pay: <strong>${net.toFixed(2)}</strong></span>
                            </div>
                        </>
                    )}
                </div>

                <div className="p-5 border-t border-theme flex justify-end gap-3 sticky bottom-0 bg-card">
                    <button onClick={onClose} className="px-4 py-2 border border-theme rounded-lg text-sm">Cancel</button>
                    <button onClick={save} disabled={!loaded || saving} className="px-5 py-2 rounded-lg !text-white bg-[var(--accent-navyblue)] text-sm disabled:opacity-50">
                        {saving ? 'Saving...' : 'Create Settlement'}
                    </button>
                </div>
            </div>
        </div>
    );
}
