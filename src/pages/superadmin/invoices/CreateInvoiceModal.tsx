import { useEffect, useMemo, useState } from 'react';
import type React from 'react';
import { Modal, Select, message } from 'antd';
import { Receipt } from 'lucide-react';
import { createSuperAdminInvoice, getAllAdmins, getAllPlans } from '../../../axios/api/superadmin';
import type { CreateInvoicePayload } from '../../../axios/api/superadmin';
import { BILLING_CYCLE_OPTIONS } from './billingCycle';
import { formatCAD, priceForTrucks } from '../../../utils/planPricing';
import type { PricingPlan } from '../../../utils/planPricing';

interface AdminOption {
  _id: string;
  name: string;
  email: string;
  internalId?: string;
  company?: { companyName?: string };
  currentSubscription?: {
    maxTrucks?: number;
    subscriptionType?: string;
    plan?: { _id: string };
  } | null;
}

interface PlanOption extends PricingPlan {
  _id: string;
  planName: string;
  status: 'active' | 'inactive';
}

interface Props {
  open: boolean;
  onClose: () => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- same loose Invoice shape the page already uses
  onCreated: (invoice: any) => void;
}

const iCls = 'block w-full rounded-lg border px-3 py-2.5 text-sm text-primary bg-transparent focus:outline-none';
const iStyle: React.CSSProperties = { borderColor: 'rgba(5,150,105,0.2)' };
const label = 'text-xs font-medium text-secondary';
const divider = { borderColor: 'rgba(5,150,105,0.12)' };

// Local calendar date as YYYY-MM-DD (toISOString would shift it to UTC)
const ymd = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const today = () => ymd(new Date());

/** End of the period for a start date + billing cycle ('' when the cycle has no end). */
const defaultEndDate = (start: string, cycle: string): string => {
  if (!start) return '';
  const d = new Date(`${start}T00:00:00`);
  if (cycle === 'monthly') d.setMonth(d.getMonth() + 1);
  else if (cycle === '6-months') d.setMonth(d.getMonth() + 6);
  else if (cycle === 'yearly') d.setFullYear(d.getFullYear() + 1);
  else return '';
  d.setDate(d.getDate() - 1);
  return ymd(d);
};

const CYCLE_MONTHS: Record<string, number> = { monthly: 1, '6-months': 6, yearly: 12 };

const emptyForm = {
  adminId: '',
  planId: '',
  planName: '',
  truckCount: '',
  billingCycle: 'monthly',
  amount: '',
  taxAmount: '',
  discountAmount: '',
  paymentStatus: 'pending' as 'pending' | 'paid',
  paymentMethod: '',
  transactionId: '',
  subscriptionStartDate: today(),
  subscriptionEndDate: defaultEndDate(today(), 'monthly'),
  notes: '',
};

const CreateInvoiceModal = ({ open, onClose, onCreated }: Props) => {
  const [admins, setAdmins] = useState<AdminOption[]>([]);
  const [plans, setPlans] = useState<PlanOption[]>([]);
  const [loadingLists, setLoadingLists] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [amountTouched, setAmountTouched] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm({ ...emptyForm, subscriptionStartDate: today(), subscriptionEndDate: defaultEndDate(today(), 'monthly') });
    setAmountTouched(false);
    if (admins.length && plans.length) return;
    setLoadingLists(true);
    Promise.all([getAllAdmins(undefined, undefined, 1, 500), getAllPlans()])
      .then(([a, p]) => {
        if (a?.success) setAdmins(a.data || []);
        if (p?.success) setPlans(p.data || []);
      })
      .finally(() => setLoadingLists(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const plan = plans.find(p => p._id === form.planId) || null;
  const usesTrucks = !!plan && plan.planType === 'monthly' && (plan.monthly?.truckPricing?.tiers?.length ?? 0) > 0;

  // Suggested amount from the plan; the Super Admin can still type over it.
  const suggestedAmount = useMemo(() => {
    if (!plan) return null;
    if (plan.planType === 'lifetime') {
      return form.billingCycle === 'one-time' ? plan.lifetime?.oneTime?.price ?? null : null;
    }
    const months = CYCLE_MONTHS[form.billingCycle];
    if (!months) return null;
    if (usesTrucks) {
      const n = Number(form.truckCount);
      if (!n || n < 1) return null;
      return priceForTrucks(n, plan.monthly?.truckPricing) * months;
    }
    return (plan.monthly?.fullApp?.price ?? 0) * months;
  }, [plan, usesTrucks, form.billingCycle, form.truckCount]);

  useEffect(() => {
    if (!amountTouched && suggestedAmount !== null) {
      setForm(f => ({ ...f, amount: String(Math.round(suggestedAmount * 100) / 100) }));
    }
  }, [suggestedAmount, amountTouched]);

  const set = <K extends keyof typeof emptyForm>(key: K, value: (typeof emptyForm)[K]) =>
    setForm(f => ({ ...f, [key]: value }));

  const onSelectAdmin = (adminId: string) => {
    const a = admins.find(x => x._id === adminId);
    const sub = a?.currentSubscription;
    setForm(f => ({
      ...f,
      adminId,
      // Pre-fill from the customer's current plan, if any
      planId: sub?.plan?._id && plans.some(p => p._id === sub.plan?._id) ? sub.plan._id : f.planId,
      truckCount: sub?.maxTrucks ? String(sub.maxTrucks) : f.truckCount,
      billingCycle: sub?.subscriptionType === '1-year' ? 'yearly' : sub?.subscriptionType === '6-months' ? '6-months' : f.billingCycle,
    }));
  };

  const onCycle = (cycle: string) =>
    setForm(f => ({ ...f, billingCycle: cycle, subscriptionEndDate: defaultEndDate(f.subscriptionStartDate, cycle) }));

  const onStart = (start: string) =>
    setForm(f => ({ ...f, subscriptionStartDate: start, subscriptionEndDate: defaultEndDate(start, f.billingCycle) }));

  const num = (v: string) => (v === '' ? 0 : Number(v));
  const total = Math.round((num(form.amount) + num(form.taxAmount) - num(form.discountAmount)) * 100) / 100;

  const submit = async () => {
    if (!form.adminId) return message.error('Choose a customer');
    if (!form.planId && !form.planName.trim()) return message.error('Choose a plan or type what the invoice is for');
    if (form.amount === '' || isNaN(Number(form.amount)) || Number(form.amount) < 0) return message.error('Enter a valid amount');
    if ([form.taxAmount, form.discountAmount].some(v => v !== '' && (isNaN(Number(v)) || Number(v) < 0))) {
      return message.error('Tax and discount must be 0 or more');
    }
    if (total < 0) return message.error("Discount can't be more than amount + tax");
    if (form.subscriptionEndDate && form.subscriptionEndDate < form.subscriptionStartDate) {
      return message.error('End date must be after the start date');
    }

    const payload: CreateInvoicePayload = {
      adminId: form.adminId,
      planId: form.planId || undefined,
      planName: form.planId ? undefined : form.planName.trim(),
      billingCycle: form.billingCycle as CreateInvoicePayload['billingCycle'],
      amount: num(form.amount),
      taxAmount: num(form.taxAmount),
      discountAmount: num(form.discountAmount),
      paymentStatus: form.paymentStatus,
      paymentMethod: form.paymentMethod || undefined,
      transactionId: form.transactionId || undefined,
      subscriptionStartDate: form.subscriptionStartDate,
      subscriptionEndDate: form.subscriptionEndDate || undefined,
      notes: [usesTrucks && form.truckCount ? `${form.truckCount} trucks` : '', form.notes.trim()].filter(Boolean).join(' · ') || undefined,
    };

    setSaving(true);
    const res = await createSuperAdminInvoice(payload);
    setSaving(false);
    if (res?.success) {
      message.success(`Invoice ${res.data?.invoiceNumber || ''} created`);
      onCreated(res.data);
      onClose();
    } else {
      message.error(res?.message || 'Failed to create invoice');
    }
  };

  const adminLabel = (a: AdminOption) =>
    `${a.company?.companyName || a.name}${a.internalId ? ` · ${a.internalId}` : ''} — ${a.email}`;

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width={640}
      title={null}
      centered
      destroyOnHidden
      styles={{
        content: { background: 'var(--bg-card)', padding: 0, borderRadius: 16, overflow: 'hidden', border: '1px solid rgba(5,150,105,0.2)' },
        body: { background: 'var(--bg-card)', padding: 0 },
      }}
    >
      <div className="flex flex-col" style={{ maxHeight: 'calc(100vh - 48px)' }}>
        <div className="px-6 pt-5 pb-4 flex items-center gap-3 border-b flex-shrink-0" style={divider}>
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'rgba(5,150,105,0.12)' }}>
            <Receipt className="w-4 h-4" style={{ color: 'var(--accent-navyblue)' }} />
          </div>
          <div>
            <h3 className="font-semibold text-primary">Create Invoice</h3>
            <p className="text-xs text-secondary">Bill a customer for a plan, renewal or one-off charge</p>
          </div>
        </div>

        <div className="px-6 py-5 space-y-4 overflow-y-auto flex-1 min-h-0">
          <div className="space-y-1.5">
            <label className={label}>Customer <span className="text-red-400">*</span></label>
            <Select
              className="w-full"
              size="large"
              showSearch
              loading={loadingLists}
              placeholder="Search by company, name, email or ID"
              value={form.adminId || undefined}
              onChange={onSelectAdmin}
              optionFilterProp="label"
              options={admins.map(a => ({ value: a._id, label: adminLabel(a) }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className={label}>Plan</label>
              <Select
                className="w-full"
                size="large"
                allowClear
                loading={loadingLists}
                placeholder="Custom charge (no plan)"
                value={form.planId || undefined}
                onChange={(v) => { set('planId', v || ''); setAmountTouched(false); }}
                options={plans.map(p => ({ value: p._id, label: `${p.planName}${p.status === 'inactive' ? ' (inactive)' : ''}` }))}
              />
            </div>
            <div className="space-y-1.5">
              <label className={label}>Billing Cycle</label>
              <select className={iCls} style={{ ...iStyle, backgroundColor: 'var(--bg-card)' }} value={form.billingCycle} onChange={(e) => onCycle(e.target.value)}>
                {BILLING_CYCLE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>

          {!form.planId && (
            <div className="space-y-1.5">
              <label className={label}>What is this invoice for? <span className="text-red-400">*</span></label>
              <input className={iCls} style={iStyle} value={form.planName} onChange={(e) => set('planName', e.target.value)} placeholder="e.g. Setup fee, extra trucks, onboarding" />
            </div>
          )}

          {usesTrucks && (
            <div className="space-y-1.5">
              <label className={label}>Truck Count</label>
              <input type="number" min={1} className={iCls} style={iStyle} value={form.truckCount}
                onChange={(e) => { set('truckCount', e.target.value); setAmountTouched(false); }} placeholder="e.g. 12" />
            </div>
          )}

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <label className={label}>Amount (CAD) <span className="text-red-400">*</span></label>
              <input type="number" min={0} step="0.01" className={iCls} style={iStyle} value={form.amount}
                onChange={(e) => { set('amount', e.target.value); setAmountTouched(true); }} placeholder="0.00" />
            </div>
            <div className="space-y-1.5">
              <label className={label}>Tax</label>
              <input type="number" min={0} step="0.01" className={iCls} style={iStyle} value={form.taxAmount}
                onChange={(e) => set('taxAmount', e.target.value)} placeholder="0.00" />
            </div>
            <div className="space-y-1.5">
              <label className={label}>Discount</label>
              <input type="number" min={0} step="0.01" className={iCls} style={iStyle} value={form.discountAmount}
                onChange={(e) => set('discountAmount', e.target.value)} placeholder="0.00" />
            </div>
          </div>
          {suggestedAmount !== null && amountTouched && Number(form.amount) !== suggestedAmount && (
            <button type="button" className="text-xs hover:underline" style={{ color: 'var(--accent-navyblue)' }}
              onClick={() => setAmountTouched(false)}>
              Use plan price ({formatCAD(suggestedAmount)})
            </button>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className={label}>Period Start</label>
              <input type="date" className={iCls} style={iStyle} value={form.subscriptionStartDate} onChange={(e) => onStart(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <label className={label}>Period End <span className="font-normal">(optional)</span></label>
              <input type="date" className={iCls} style={iStyle} value={form.subscriptionEndDate} onChange={(e) => set('subscriptionEndDate', e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className={label}>Payment Status</label>
              <select className={iCls} style={{ ...iStyle, backgroundColor: 'var(--bg-card)' }} value={form.paymentStatus}
                onChange={(e) => set('paymentStatus', e.target.value as 'pending' | 'paid')}>
                <option value="pending">Pending (not paid yet)</option>
                <option value="paid">Paid</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className={label}>Payment Method</label>
              <select className={iCls} style={{ ...iStyle, backgroundColor: 'var(--bg-card)' }} value={form.paymentMethod}
                onChange={(e) => set('paymentMethod', e.target.value)}>
                <option value="">—</option>
                <option value="e-transfer">Interac e-Transfer</option>
                <option value="bank transfer">Bank transfer / EFT</option>
                <option value="cheque">Cheque</option>
                <option value="card">Card</option>
                <option value="cash">Cash</option>
              </select>
            </div>
          </div>

          {form.paymentStatus === 'paid' && (
            <div className="space-y-1.5">
              <label className={label}>Reference / Transaction ID <span className="font-normal">(optional)</span></label>
              <input className={iCls} style={iStyle} value={form.transactionId} onChange={(e) => set('transactionId', e.target.value)} placeholder="e.g. e-Transfer reference" />
            </div>
          )}

          <div className="space-y-1.5">
            <label className={label}>Notes <span className="font-normal">(optional)</span></label>
            <textarea rows={2} className={`${iCls} resize-none`} style={iStyle} value={form.notes} onChange={(e) => set('notes', e.target.value)} />
          </div>
        </div>

        <div className="px-6 pb-5 pt-4 flex items-center justify-between gap-3 border-t flex-shrink-0" style={divider}>
          <div className="text-sm text-secondary">
            Total: <span className="font-semibold text-primary">{formatCAD(total)}</span>
          </div>
          <div className="flex gap-3">
            <button onClick={onClose} disabled={saving}
              className="px-4 py-2 rounded-lg text-sm font-medium text-secondary border border-theme hover:text-primary transition-colors disabled:opacity-50">
              Cancel
            </button>
            <button onClick={submit} disabled={saving}
              className="px-5 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-60"
              style={{ backgroundColor: 'var(--accent-navyblue)' }}>
              {saving ? 'Creating...' : 'Create Invoice'}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default CreateInvoiceModal;
