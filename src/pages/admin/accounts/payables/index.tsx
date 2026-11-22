/* eslint-disable @typescript-eslint/no-explicit-any -- API payloads (paystubs, settlements, bills) are untyped JSON */
import { todayLocalISO } from '../../../../utils/fuelDate';
import { useEffect, useMemo, useState } from 'react';
import { Plus, Search, X, AlertCircle, CheckCircle, DollarSign, FileText, Trash2, Edit2, Truck, Clock, Paperclip } from 'lucide-react';
import {
    listBills, getBillStats, createBill, updateBill, deleteBill, recordBillPayment, deleteBillPayment,
    getBillAttachmentUrl, BILL_CATEGORIES, type Bill,
} from '../../../../axios/api/account.payables';
import { downloadExcel, MONEY_FMT, fmtDate } from '../../../../utils/excelExport';

// Accounts Payable - what the company owes: carriers we sold loads to (created automatically
// from the order), repair shops, suppliers, insurance... with payments against each bill.

type Tab = 'open' | 'overdue' | 'paid' | 'carrier' | 'all';
const TABS: { id: Tab; label: string }[] = [
    { id: 'open', label: 'Open' },
    { id: 'overdue', label: 'Overdue' },
    { id: 'carrier', label: 'Carrier loads' },
    { id: 'paid', label: 'Paid' },
    { id: 'all', label: 'All' },
];

const money = (n: number, cur = 'CAD') => `${cur === 'USD' ? 'US$' : '$'}${(Number(n) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const day = (d?: string) => (d ? new Date(d).toLocaleDateString('en-CA') : '—');
const today = () => todayLocalISO();
const plusDays = (n: number) => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10);

const emptyForm = {
    vendorName: '', vendorInvoiceNumber: '', category: 'Other', billDate: today(), dueDate: plusDays(30),
    amount: '', taxAmount: '', currency: 'CAD', description: '', notes: '',
};

export default function AccountsPayable() {
    const [tab, setTab] = useState<Tab>('open');
    const [search, setSearch] = useState('');
    const [bills, setBills] = useState<Bill[]>([]);
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

    const [formOpen, setFormOpen] = useState(false);
    const [editing, setEditing] = useState<Bill | null>(null);
    const [form, setForm] = useState({ ...emptyForm });
    const [file, setFile] = useState<File | null>(null);
    const [saving, setSaving] = useState(false);

    const [paying, setPaying] = useState<Bill | null>(null);
    const [payment, setPayment] = useState({ amount: '', date: today(), method: 'Cheque', reference: '', notes: '' });
    const [viewing, setViewing] = useState<Bill | null>(null);

    const notify = (type: 'success' | 'error', message: string) => {
        setToast({ type, message });
        setTimeout(() => setToast(null), 4000);
    };

    const load = async () => {
        setLoading(true);
        try {
            const params: Record<string, string> = {};
            if (tab === 'open' || tab === 'overdue' || tab === 'paid') params.status = tab;
            if (tab === 'carrier') params.source = 'brokered_load';
            if (search.trim()) params.search = search.trim();
            const [b, st] = await Promise.all([listBills(params), getBillStats()]);
            if (b?.success) setBills(b.data || []);
            else notify('error', b?.message || 'Could not load bills');
            if (st?.success) setStats(st.data);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const t = setTimeout(load, 250);
        return () => clearTimeout(t);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tab, search]);

    const openNew = () => { setEditing(null); setForm({ ...emptyForm }); setFile(null); setFormOpen(true); };
    const openEdit = (b: Bill) => {
        setEditing(b);
        setForm({
            vendorName: b.vendorName, vendorInvoiceNumber: b.vendorInvoiceNumber || '', category: b.category,
            billDate: (b.billDate || '').slice(0, 10), dueDate: (b.dueDate || '').slice(0, 10),
            amount: String(b.amount), taxAmount: b.taxAmount ? String(b.taxAmount) : '', currency: b.currency,
            description: b.description || '', notes: b.notes || '',
        });
        setFile(null);
        setFormOpen(true);
    };

    const saveBill = async () => {
        if (!form.vendorName.trim()) return notify('error', 'Vendor / payee is required');
        if (!(parseFloat(form.amount) > 0)) return notify('error', 'Amount must be more than 0');
        setSaving(true);
        try {
            const fd = new FormData();
            Object.entries(form).forEach(([k, v]) => fd.append(k, String(v ?? '')));
            if (file) fd.append('attachment', file);
            const res = editing ? await updateBill(editing._id, fd) : await createBill(fd);
            if (res?.success) {
                notify('success', res.message || 'Saved');
                setFormOpen(false);
                load();
            } else notify('error', res?.message || 'Could not save the bill');
        } finally {
            setSaving(false);
        }
    };

    const openPay = (b: Bill) => {
        setPaying(b);
        setPayment({ amount: String(b.balance ?? b.amount), date: today(), method: 'Cheque', reference: '', notes: '' });
    };

    const savePayment = async () => {
        if (!paying) return;
        const res = await recordBillPayment(paying._id, {
            amount: parseFloat(payment.amount) || undefined, date: payment.date, method: payment.method,
            reference: payment.reference, notes: payment.notes,
        });
        if (res?.success) {
            notify('success', res.message || 'Payment recorded');
            setPaying(null);
            if (viewing?._id === paying._id) setViewing(res.data);
            load();
        } else notify('error', res?.message || 'Could not record the payment');
    };

    const removeBill = async (b: Bill) => {
        if (!window.confirm(`Delete bill ${b.billNumber} from ${b.vendorName}?`)) return;
        const res = await deleteBill(b._id);
        if (res?.success) { notify('success', res.message || 'Deleted'); load(); }
        else notify('error', res?.message || 'Could not delete');
    };

    const removePayment = async (b: Bill, paymentId: string) => {
        if (!window.confirm('Remove this payment?')) return;
        const res = await deleteBillPayment(b._id, paymentId);
        if (res?.success) { setViewing(res.data); load(); }
        else notify('error', res?.message || 'Could not remove the payment');
    };

    const openFile = async (b: Bill) => {
        const res = await getBillAttachmentUrl(b._id);
        if (res?.success && res.url) window.open(res.url, '_blank');
        else notify('error', res?.message || 'No file attached');
    };

    const exportExcel = () => downloadExcel(`Accounts_Payable_${today()}`, [{
        name: 'Payables',
        columns: [
            { header: 'Bill #', value: (b: Bill) => b.billNumber },
            { header: 'Vendor', value: (b: Bill) => b.vendorName },
            { header: 'Vendor invoice #', value: (b: Bill) => b.vendorInvoiceNumber || '' },
            { header: 'Category', value: (b: Bill) => b.category },
            { header: 'Load #', value: (b: Bill) => b.orderNumber || '' },
            { header: 'Bill date', value: (b: Bill) => fmtDate(b.billDate) },
            { header: 'Due date', value: (b: Bill) => fmtDate(b.dueDate) },
            { header: 'Amount', value: (b: Bill) => (b.amount || 0) + (b.taxAmount || 0), numFmt: MONEY_FMT },
            { header: 'Paid', value: (b: Bill) => b.paidAmount || 0, numFmt: MONEY_FMT },
            { header: 'Balance', value: (b: Bill) => b.balance || 0, numFmt: MONEY_FMT },
            { header: 'Currency', value: (b: Bill) => b.currency },
            { header: 'Status', value: (b: Bill) => b.status },
        ],
        rows: bills,
    }]);

    const isOverdue = (b: Bill) => (b.status === 'unpaid' || b.status === 'partial') && b.dueDate && new Date(b.dueDate) < new Date(new Date().toDateString());
    const totalShown = useMemo(() => bills.reduce((s, b) => s + (b.status === 'void' ? 0 : b.balance || 0), 0), [bills]);

    const cards = [
        { label: 'Total payable', value: stats?.totalPayable, sub: `${stats?.openCount || 0} open bills`, icon: DollarSign },
        { label: 'Overdue', value: stats?.overdue, sub: `${stats?.overdueCount || 0} bills`, icon: AlertCircle, danger: true },
        { label: 'Due in 7 days', value: stats?.dueThisWeek, icon: Clock },
        { label: 'Owed to carriers', value: stats?.carrierPayable, sub: 'Loads sold to other carriers', icon: Truck },
        { label: 'Paid this month', value: stats?.paidThisMonth, icon: CheckCircle },
    ];

    return (
        <div className="p-6 space-y-6">
            {toast && (
                <div className={`fixed top-4 right-4 z-[10002] px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 text-sm ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'} !text-white`}>
                    {toast.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />} {toast.message}
                </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-headings">Accounts Payable</h1>
                    <p className="text-sm text-secondary">Bills to pay: carriers (loads sold to other trucking companies), repair shops, suppliers.</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={exportExcel} disabled={!bills.length} className="px-4 py-2 border border-theme rounded-lg text-sm disabled:opacity-50">Export Excel</button>
                    <button onClick={openNew} className="px-4 py-2 rounded-lg !text-white bg-[var(--accent-navyblue)] text-sm flex items-center gap-2"><Plus size={16} /> New Bill</button>
                </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {cards.map(c => (
                    <div key={c.label} className="bg-card border border-theme rounded-xl p-4">
                        <p className="text-xs text-secondary flex items-center gap-1"><c.icon size={14} /> {c.label}</p>
                        <p className={`text-xl font-bold mt-1 ${c.danger && (c.value || 0) > 0 ? 'text-red-500' : 'text-primary'}`}>{money(c.value || 0)}</p>
                        {c.sub && <p className="text-xs text-secondary mt-1">{c.sub}</p>}
                    </div>
                ))}
            </div>

            <div className="bg-card border border-theme rounded-xl">
                <div className="flex flex-wrap items-center justify-between gap-3 p-4 border-b border-theme">
                    <div className="flex gap-1">
                        {TABS.map(t => (
                            <button key={t.id} onClick={() => setTab(t.id)} className={`px-3 py-1.5 text-sm rounded-lg ${tab === t.id ? 'bg-[var(--accent-navyblue)] !text-white' : 'hover:bg-[rgba(15,31,23,0.05)]'}`}>{t.label}</button>
                        ))}
                    </div>
                    <div className="relative">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary" />
                        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search vendor, bill #, load #" className="pl-9 pr-3 py-2 text-sm border border-theme rounded-lg bg-[var(--bg-card)] w-72" />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="text-xs uppercase text-headings border-b border-theme">
                            <tr>
                                <th className="px-4 py-3 text-left">Bill #</th>
                                <th className="px-4 py-3 text-left">Vendor / Payee</th>
                                <th className="px-4 py-3 text-left">Category</th>
                                <th className="px-4 py-3 text-left">Bill date</th>
                                <th className="px-4 py-3 text-left">Due</th>
                                <th className="px-4 py-3 text-right">Amount</th>
                                <th className="px-4 py-3 text-right">Balance</th>
                                <th className="px-4 py-3 text-left">Status</th>
                                <th className="px-4 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-theme">
                            {loading ? (
                                <tr><td colSpan={9} className="px-4 py-8 text-center text-secondary">Loading...</td></tr>
                            ) : bills.length === 0 ? (
                                <tr><td colSpan={9} className="px-4 py-8 text-center text-secondary">No bills here.</td></tr>
                            ) : bills.map(b => (
                                <tr key={b._id} className="hover:bg-[rgba(15,31,23,0.03)] cursor-pointer" onClick={() => setViewing(b)}>
                                    <td className="px-4 py-3 font-medium text-[#059669]">{b.billNumber}</td>
                                    <td className="px-4 py-3">
                                        {b.vendorName}
                                        {b.source === 'brokered_load' && <span className="ml-2 text-[10px] px-2 py-0.5 rounded-full bg-[var(--accent-blue)]/15 text-[var(--accent-blue)]">Load {b.orderNumber}</span>}
                                        {b.vendorInvoiceNumber && <span className="block text-xs text-secondary">Inv #{b.vendorInvoiceNumber}</span>}
                                    </td>
                                    <td className="px-4 py-3">{b.category}</td>
                                    <td className="px-4 py-3">{day(b.billDate)}</td>
                                    <td className={`px-4 py-3 ${isOverdue(b) ? 'text-red-500 font-medium' : ''}`}>{day(b.dueDate)}</td>
                                    <td className="px-4 py-3 text-right">{money((b.amount || 0) + (b.taxAmount || 0), b.currency)}</td>
                                    <td className="px-4 py-3 text-right font-semibold">{money(b.balance || 0, b.currency)}</td>
                                    <td className="px-4 py-3">
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${b.status === 'paid' ? 'bg-green-500/15 text-green-500' : b.status === 'partial' ? (isOverdue(b) ? 'bg-red-500/15 text-red-500' : 'bg-blue-500/15 text-blue-400') : b.status === 'void' ? 'bg-gray-500/15 text-secondary' : isOverdue(b) ? 'bg-red-500/15 text-red-500' : 'bg-yellow-500/15 text-yellow-500'}`}>
                                            {b.status === 'partial' ? (isOverdue(b) ? 'Part paid · Overdue' : 'Part paid') : isOverdue(b) ? 'Overdue' : b.status.charAt(0).toUpperCase() + b.status.slice(1)}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                                        <div className="flex justify-end gap-1">
                                            {(b.status === 'unpaid' || b.status === 'partial') && (
                                                <button onClick={() => openPay(b)} className="px-2 py-1 text-xs rounded bg-green-600 !text-white">Pay</button>
                                            )}
                                            {b.attachmentUrl && <button onClick={() => openFile(b)} className="p-1.5 rounded hover:bg-[rgba(15,31,23,0.05)]" title="Open attached invoice"><Paperclip size={15} /></button>}
                                            <button onClick={() => openEdit(b)} className="p-1.5 rounded hover:bg-[rgba(15,31,23,0.05)]" title="Edit"><Edit2 size={15} /></button>
                                            <button onClick={() => removeBill(b)} className="p-1.5 rounded hover:bg-red-500/10 text-red-500" title="Delete"><Trash2 size={15} /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {bills.length > 0 && (
                    <div className="p-4 border-t border-theme text-right text-sm">Balance of bills shown: <strong>{money(totalShown)}</strong></div>
                )}
            </div>

            {/* New / edit bill */}
            {formOpen && (
                <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-[10001] flex items-center justify-center p-4">
                    <div className="bg-card rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-5 border-b border-theme flex justify-between items-center">
                            <h4 className="text-lg font-bold text-headings">{editing ? `Edit ${editing.billNumber}` : 'New Bill'}</h4>
                            <button onClick={() => setFormOpen(false)}><X size={20} /></button>
                        </div>
                        <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                            <label className="md:col-span-2 text-sm">Vendor / payee *
                                <input value={form.vendorName} onChange={e => setForm({ ...form, vendorName: e.target.value })} className="mt-1 w-full px-3 py-2 border border-theme rounded-lg bg-[var(--bg-card)]" placeholder="e.g. Kal Tire, XYZ Transport Inc." />
                            </label>
                            <label className="text-sm">Vendor invoice #
                                <input value={form.vendorInvoiceNumber} onChange={e => setForm({ ...form, vendorInvoiceNumber: e.target.value })} className="mt-1 w-full px-3 py-2 border border-theme rounded-lg bg-[var(--bg-card)]" />
                            </label>
                            <label className="text-sm">Category
                                <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className="mt-1 w-full px-3 py-2 border border-theme rounded-lg bg-[var(--bg-card)]">
                                    {BILL_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </label>
                            <label className="text-sm">Bill date
                                <input type="date" value={form.billDate} onChange={e => setForm({ ...form, billDate: e.target.value })} className="mt-1 w-full px-3 py-2 border border-theme rounded-lg bg-[var(--bg-card)]" />
                            </label>
                            <label className="text-sm">Due date
                                <input type="date" value={form.dueDate} onChange={e => setForm({ ...form, dueDate: e.target.value })} className="mt-1 w-full px-3 py-2 border border-theme rounded-lg bg-[var(--bg-card)]" />
                            </label>
                            <label className="text-sm">Amount (before tax) *
                                <input type="number" min="0" step="0.01" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} className="mt-1 w-full px-3 py-2 border border-theme rounded-lg bg-[var(--bg-card)]" />
                            </label>
                            <label className="text-sm">Tax (GST/HST)
                                <input type="number" min="0" step="0.01" value={form.taxAmount} onChange={e => setForm({ ...form, taxAmount: e.target.value })} className="mt-1 w-full px-3 py-2 border border-theme rounded-lg bg-[var(--bg-card)]" />
                            </label>
                            <label className="text-sm">Currency
                                <select value={form.currency} onChange={e => setForm({ ...form, currency: e.target.value })} className="mt-1 w-full px-3 py-2 border border-theme rounded-lg bg-[var(--bg-card)]">
                                    <option value="CAD">CAD</option><option value="USD">USD</option>
                                </select>
                            </label>
                            <label className="text-sm">Attach invoice (PDF / image)
                                <input type="file" accept="application/pdf,image/*" onChange={e => setFile(e.target.files?.[0] || null)} className="mt-1 w-full text-sm" />
                            </label>
                            <label className="md:col-span-2 text-sm">Description
                                <input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="mt-1 w-full px-3 py-2 border border-theme rounded-lg bg-[var(--bg-card)]" />
                            </label>
                            <label className="md:col-span-2 text-sm">Notes
                                <textarea rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className="mt-1 w-full px-3 py-2 border border-theme rounded-lg bg-[var(--bg-card)]" />
                            </label>
                        </div>
                        <div className="p-5 border-t border-theme flex justify-end gap-2">
                            <button onClick={() => setFormOpen(false)} className="px-4 py-2 border border-theme rounded-lg text-sm">Cancel</button>
                            <button onClick={saveBill} disabled={saving} className="px-5 py-2 rounded-lg !text-white bg-[var(--accent-navyblue)] text-sm disabled:opacity-50">{saving ? 'Saving...' : 'Save Bill'}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Record payment */}
            {paying && (
                <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-[10002] flex items-center justify-center p-4">
                    <div className="bg-card rounded-xl shadow-xl max-w-md w-full">
                        <div className="p-5 border-b border-theme flex justify-between items-center">
                            <div>
                                <h4 className="text-lg font-bold text-headings">Pay {paying.vendorName}</h4>
                                <p className="text-xs text-secondary">{paying.billNumber} · balance {money(paying.balance || 0, paying.currency)}</p>
                            </div>
                            <button onClick={() => setPaying(null)}><X size={20} /></button>
                        </div>
                        <div className="p-5 space-y-3">
                            <label className="block text-sm">Amount
                                <input type="number" min="0" step="0.01" value={payment.amount} onChange={e => setPayment({ ...payment, amount: e.target.value })} className="mt-1 w-full px-3 py-2 border border-theme rounded-lg bg-[var(--bg-card)]" />
                            </label>
                            <label className="block text-sm">Date
                                <input type="date" value={payment.date} onChange={e => setPayment({ ...payment, date: e.target.value })} className="mt-1 w-full px-3 py-2 border border-theme rounded-lg bg-[var(--bg-card)]" />
                            </label>
                            <label className="block text-sm">Method
                                <select value={payment.method} onChange={e => setPayment({ ...payment, method: e.target.value })} className="mt-1 w-full px-3 py-2 border border-theme rounded-lg bg-[var(--bg-card)]">
                                    {['Cheque', 'Bank Transfer', 'EFT', 'Cash', 'Credit Card', 'Other'].map(m => <option key={m} value={m}>{m}</option>)}
                                </select>
                            </label>
                            <label className="block text-sm">Cheque # / reference
                                <input value={payment.reference} onChange={e => setPayment({ ...payment, reference: e.target.value })} className="mt-1 w-full px-3 py-2 border border-theme rounded-lg bg-[var(--bg-card)]" />
                            </label>
                        </div>
                        <div className="p-5 border-t border-theme flex justify-end gap-2">
                            <button onClick={() => setPaying(null)} className="px-4 py-2 border border-theme rounded-lg text-sm">Cancel</button>
                            <button onClick={savePayment} className="px-5 py-2 rounded-lg !text-white bg-green-600 text-sm">Record Payment</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Bill details */}
            {viewing && (
                <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-[10001] flex items-center justify-center p-4" onClick={() => setViewing(null)}>
                    <div className="bg-card rounded-xl shadow-xl max-w-xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <div className="p-5 border-b border-theme flex justify-between items-center">
                            <div>
                                <h4 className="text-lg font-bold text-headings">{viewing.billNumber} · {viewing.vendorName}</h4>
                                <p className="text-xs text-secondary">{viewing.category}{viewing.orderNumber ? ` · Load ${viewing.orderNumber}` : ''}</p>
                            </div>
                            <button onClick={() => setViewing(null)}><X size={20} /></button>
                        </div>
                        <div className="p-5 space-y-4 text-sm">
                            <div className="grid grid-cols-2 gap-3">
                                <div><span className="text-secondary">Bill date</span><p>{day(viewing.billDate)}</p></div>
                                <div><span className="text-secondary">Due</span><p>{day(viewing.dueDate)}</p></div>
                                <div><span className="text-secondary">Amount</span><p>{money(viewing.amount, viewing.currency)}{viewing.taxAmount ? ` + tax ${money(viewing.taxAmount, viewing.currency)}` : ''}</p></div>
                                <div><span className="text-secondary">Balance</span><p className="font-semibold">{money(viewing.balance || 0, viewing.currency)}</p></div>
                            </div>
                            {viewing.description && <p>{viewing.description}</p>}
                            <div>
                                <p className="font-medium mb-2">Payments</p>
                                {(viewing.payments || []).length === 0 ? <p className="text-secondary">No payments yet.</p> : (
                                    <div className="space-y-1">
                                        {viewing.payments.map(p => (
                                            <div key={p._id} className="flex justify-between items-center border border-theme rounded-lg px-3 py-2">
                                                <span>{day(p.date)} · {p.method}{p.reference ? ` #${p.reference}` : ''}</span>
                                                <span className="flex items-center gap-2">{money(p.amount, viewing.currency)}
                                                    <button onClick={() => removePayment(viewing, p._id)} className="text-red-500" title="Remove payment"><Trash2 size={14} /></button>
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="p-5 border-t border-theme flex justify-end gap-2">
                            {viewing.attachmentUrl && <button onClick={() => openFile(viewing)} className="px-4 py-2 border border-theme rounded-lg text-sm flex items-center gap-1"><FileText size={14} /> Invoice</button>}
                            {(viewing.status === 'unpaid' || viewing.status === 'partial') && <button onClick={() => openPay(viewing)} className="px-4 py-2 rounded-lg !text-white bg-green-600 text-sm">Pay</button>}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
