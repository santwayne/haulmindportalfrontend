/* eslint-disable @typescript-eslint/no-explicit-any -- API payloads (paystubs, settlements, bills) are untyped JSON */
import { useEffect, useMemo, useState } from 'react';
import { Download, Truck, Package, Wrench, Calendar } from 'lucide-react';
import { getMaintenanceExpenseSummary, setUnitPurchasePrice } from '../../axios/api/account.fleetMaintenance';
import { downloadExcel, MONEY_FMT } from '../../utils/excelExport';

// Fleet maintenance spend (client 15 Nov): how much we spend on each truck and trailer, each
// month, with a custom date range; in-house repairs vs outside breakdowns; parts; and what each
// unit was bought for.

interface Row {
    vehicle: string;
    vehicleId: string;
    unitType: 'Truck' | 'Trailer';
    totalExpense: number;
    inHouseRepairs: number;
    outsideRepairs: number;
    parts: number;
    services: number;
    otherExpenses: number;
    purchasePrice: number;
    monthly: Record<string, number>;
    costPerMile: number;
    breakdown: string;
    entries: number;
}

interface Meta {
    months: string[];
    monthlyTotals: Record<string, number>;
    totals: { total: number; trucks: number; trailers: number; inHouseRepairs: number; outsideRepairs: number; parts: number; purchasePrice: number };
}

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const money = (n: number) => `$${(Number(n) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const monthLabel = (m: string) => {
    const [y, mo] = m.split('-').map(Number);
    return new Date(y, (mo || 1) - 1, 1).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
};

const presets = () => {
    const now = new Date();
    return {
        'This month': [new Date(now.getFullYear(), now.getMonth(), 1), now],
        'Last month': [new Date(now.getFullYear(), now.getMonth() - 1, 1), new Date(now.getFullYear(), now.getMonth(), 0)],
        'Last 3 months': [new Date(now.getFullYear(), now.getMonth() - 2, 1), now],
        'This year': [new Date(now.getFullYear(), 0, 1), now],
        'Last year': [new Date(now.getFullYear() - 1, 0, 1), new Date(now.getFullYear() - 1, 11, 31)],
    } as Record<string, [Date, Date]>;
};

export default function FleetSpendReport({ search, onError }: { search?: string; onError?: (msg: string) => void }) {
    const p = presets();
    const [startDate, setStartDate] = useState(iso(p['This year'][0]));
    const [endDate, setEndDate] = useState(iso(p['This year'][1]));
    const [unitType, setUnitType] = useState('');
    const [rows, setRows] = useState<Row[]>([]);
    const [meta, setMeta] = useState<Meta | null>(null);
    const [loading, setLoading] = useState(false);
    const [view, setView] = useState<'units' | 'monthly'>('units');
    const [editingPrice, setEditingPrice] = useState<Record<string, string>>({});

    const load = async () => {
        setLoading(true);
        try {
            const res = await getMaintenanceExpenseSummary({ search: search || undefined, startDate, endDate, unitType: unitType || undefined });
            if (res?.success) {
                setRows(res.data || []);
                setMeta(res.meta || null);
            } else {
                onError?.(res?.message || 'Failed to load fleet spend');
            }
        } catch (e: any) {
            onError?.(e?.response?.data?.message || 'Failed to load fleet spend');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [startDate, endDate, unitType, search]);

    const months = meta?.months || [];
    const totals = meta?.totals;

    const savePrice = async (row: Row) => {
        const value = parseFloat(editingPrice[row.vehicleId]);
        if (isNaN(value) || value < 0) return;
        const res = await setUnitPurchasePrice({ unitId: row.vehicleId, purchasePrice: value }).catch((e) => e?.response?.data);
        if (res?.success) {
            setEditingPrice(prev => { const n = { ...prev }; delete n[row.vehicleId]; return n; });
            load();
        } else {
            onError?.(res?.message || 'Could not save the purchase price');
        }
    };

    const exportExcel = () => {
        downloadExcel(`Fleet_Spend_${startDate}_to_${endDate}`, [
            {
                name: 'By Unit',
                columns: [
                    { header: 'Unit', value: (r: Row) => r.vehicle },
                    { header: 'Type', value: (r: Row) => r.unitType },
                    { header: 'In-house repairs', value: (r: Row) => r.inHouseRepairs, numFmt: MONEY_FMT },
                    { header: 'Outside repairs / breakdowns', value: (r: Row) => r.outsideRepairs, numFmt: MONEY_FMT },
                    { header: 'Parts', value: (r: Row) => r.parts, numFmt: MONEY_FMT },
                    { header: 'Services', value: (r: Row) => r.services, numFmt: MONEY_FMT },
                    { header: 'Other expenses', value: (r: Row) => r.otherExpenses, numFmt: MONEY_FMT },
                    { header: 'Total spend', value: (r: Row) => r.totalExpense, numFmt: MONEY_FMT },
                    { header: 'Purchase price', value: (r: Row) => r.purchasePrice || '', numFmt: MONEY_FMT },
                    { header: 'Cost per mile', value: (r: Row) => r.costPerMile, numFmt: MONEY_FMT },
                ],
                rows,
            },
            {
                name: 'By Month',
                columns: [
                    { header: 'Unit', value: (r: Row) => r.vehicle },
                    { header: 'Type', value: (r: Row) => r.unitType },
                    ...months.map(m => ({ header: monthLabel(m), value: (r: Row) => r.monthly[m] || 0, numFmt: MONEY_FMT })),
                    { header: 'Total', value: (r: Row) => r.totalExpense, numFmt: MONEY_FMT },
                ],
                rows,
            },
        ]);
    };

    const cards = useMemo(() => totals ? [
        { label: 'Total spend', value: totals.total, icon: Wrench },
        { label: 'Trucks', value: totals.trucks, icon: Truck },
        { label: 'Trailers', value: totals.trailers, icon: Package },
        { label: 'In-house repairs', value: totals.inHouseRepairs, icon: Wrench },
        { label: 'Outside repairs / breakdowns', value: totals.outsideRepairs, icon: Wrench },
        { label: 'Parts', value: totals.parts, icon: Package },
    ] : [], [totals]);

    return (
        <div className="p-4 space-y-4">
            <div className="flex flex-wrap items-end gap-3">
                <div className="flex flex-wrap gap-2">
                    {Object.entries(p).map(([label, [a, b]]) => (
                        <button
                            key={label}
                            onClick={() => { setStartDate(iso(a)); setEndDate(iso(b)); }}
                            className={`px-3 py-1.5 text-xs rounded-lg border border-theme ${startDate === iso(a) && endDate === iso(b) ? 'bg-[var(--accent-navyblue)] !text-white' : 'hover:bg-[rgba(15,31,23,0.05)]'}`}
                        >
                            {label}
                        </button>
                    ))}
                </div>
                <div className="flex items-center gap-2">
                    <Calendar size={16} className="text-secondary" />
                    <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="px-2 py-1.5 text-sm border border-theme rounded-lg bg-[var(--bg-card)]" />
                    <span className="text-secondary text-sm">to</span>
                    <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="px-2 py-1.5 text-sm border border-theme rounded-lg bg-[var(--bg-card)]" />
                </div>
                <select value={unitType} onChange={e => setUnitType(e.target.value)} className="px-3 py-1.5 text-sm border border-theme rounded-lg bg-[var(--bg-card)]">
                    <option value="">Trucks & trailers</option>
                    <option value="Truck">Trucks only</option>
                    <option value="Trailer">Trailers only</option>
                </select>
                <div className="flex gap-1 ml-auto">
                    <button onClick={() => setView('units')} className={`px-3 py-1.5 text-xs rounded-lg border border-theme ${view === 'units' ? 'bg-[var(--accent-navyblue)] !text-white' : ''}`}>Per unit</button>
                    <button onClick={() => setView('monthly')} className={`px-3 py-1.5 text-xs rounded-lg border border-theme ${view === 'monthly' ? 'bg-[var(--accent-navyblue)] !text-white' : ''}`}>Per month</button>
                    <button onClick={exportExcel} disabled={!rows.length} className="px-3 py-1.5 text-xs rounded-lg border border-theme flex items-center gap-1 disabled:opacity-50">
                        <Download size={14} /> Excel
                    </button>
                </div>
            </div>

            {cards.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                    {cards.map(c => (
                        <div key={c.label} className="border border-theme rounded-lg p-3">
                            <p className="text-xs text-secondary flex items-center gap-1"><c.icon size={12} /> {c.label}</p>
                            <p className="text-lg font-semibold text-primary mt-1">{money(c.value)}</p>
                        </div>
                    ))}
                </div>
            )}

            {loading ? (
                <div className="p-8 text-center text-secondary">Loading...</div>
            ) : rows.length === 0 ? (
                <div className="p-8 text-center text-secondary">No maintenance spend in this period.</div>
            ) : view === 'units' ? (
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="border-b border-theme text-xs uppercase text-headings">
                            <tr>
                                <th className="px-3 py-2 text-left">Unit</th>
                                <th className="px-3 py-2 text-left">Type</th>
                                <th className="px-3 py-2 text-right">In-house repairs</th>
                                <th className="px-3 py-2 text-right">Outside / breakdowns</th>
                                <th className="px-3 py-2 text-right">Parts</th>
                                <th className="px-3 py-2 text-right">Services</th>
                                <th className="px-3 py-2 text-right">Other expenses</th>
                                <th className="px-3 py-2 text-right">Total spend</th>
                                <th className="px-3 py-2 text-right">Bought for</th>
                                <th className="px-3 py-2 text-right">Cost / mile</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-theme">
                            {rows.map(r => (
                                <tr key={r.vehicleId} className="hover:bg-[rgba(15,31,23,0.03)]" title={r.breakdown}>
                                    <td className="px-3 py-2 font-medium text-[#059669]">{r.vehicle}</td>
                                    <td className="px-3 py-2">{r.unitType}</td>
                                    <td className="px-3 py-2 text-right">{money(r.inHouseRepairs)}</td>
                                    <td className="px-3 py-2 text-right">{money(r.outsideRepairs)}</td>
                                    <td className="px-3 py-2 text-right">{money(r.parts)}</td>
                                    <td className="px-3 py-2 text-right">{money(r.services)}</td>
                                    <td className="px-3 py-2 text-right">{money(r.otherExpenses)}</td>
                                    <td className="px-3 py-2 text-right font-semibold">{money(r.totalExpense)}</td>
                                    <td className="px-3 py-2 text-right">
                                        {editingPrice[r.vehicleId] !== undefined ? (
                                            <span className="inline-flex items-center gap-1">
                                                <input
                                                    type="number" min="0" step="0.01" autoFocus
                                                    value={editingPrice[r.vehicleId]}
                                                    onChange={e => setEditingPrice(prev => ({ ...prev, [r.vehicleId]: e.target.value }))}
                                                    onKeyDown={e => { if (e.key === 'Enter') savePrice(r); if (e.key === 'Escape') setEditingPrice(prev => { const n = { ...prev }; delete n[r.vehicleId]; return n; }); }}
                                                    className="w-28 px-2 py-1 text-right border border-theme rounded bg-[var(--bg-card)]"
                                                />
                                                <button onClick={() => savePrice(r)} className="text-xs text-[var(--accent-blue)]">Save</button>
                                            </span>
                                        ) : (
                                            <button
                                                onClick={() => setEditingPrice(prev => ({ ...prev, [r.vehicleId]: r.purchasePrice ? String(r.purchasePrice) : '' }))}
                                                className="hover:underline"
                                                title="Set what this unit was bought for"
                                            >
                                                {r.purchasePrice ? money(r.purchasePrice) : <span className="text-secondary">+ Add</span>}
                                            </button>
                                        )}
                                    </td>
                                    <td className="px-3 py-2 text-right">{r.costPerMile ? `$${r.costPerMile.toFixed(2)}` : '—'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="border-b border-theme text-xs uppercase text-headings">
                            <tr>
                                <th className="px-3 py-2 text-left sticky left-0 bg-card">Unit</th>
                                {months.map(m => <th key={m} className="px-3 py-2 text-right whitespace-nowrap">{monthLabel(m)}</th>)}
                                <th className="px-3 py-2 text-right">Total</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-theme">
                            {rows.map(r => (
                                <tr key={r.vehicleId}>
                                    <td className="px-3 py-2 font-medium sticky left-0 bg-card">{r.vehicle} <span className="text-xs text-secondary">({r.unitType})</span></td>
                                    {months.map(m => <td key={m} className="px-3 py-2 text-right">{r.monthly[m] ? money(r.monthly[m]) : '—'}</td>)}
                                    <td className="px-3 py-2 text-right font-semibold">{money(r.totalExpense)}</td>
                                </tr>
                            ))}
                            <tr className="font-semibold border-t-2 border-theme">
                                <td className="px-3 py-2 sticky left-0 bg-card">All units</td>
                                {months.map(m => <td key={m} className="px-3 py-2 text-right">{money(meta?.monthlyTotals?.[m] || 0)}</td>)}
                                <td className="px-3 py-2 text-right">{money(totals?.total || 0)}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
