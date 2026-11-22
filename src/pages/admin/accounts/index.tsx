import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUserRole } from '../../../utils/auth';
import {
  ArrowDownCircle, ArrowUpCircle, CheckCircle2, Clock, Gauge, TrendingUp,
  FileText, Receipt, Users, IdCard, Handshake, Wrench, Calendar,
} from 'lucide-react';
import { getAccountsDashboard } from '../../../axios/api/account.dashboard';

// Accounts dashboard, simplified on the client's request (15 Nov):
// "just add payables, receivables, paid payrolls, pending payrolls, per mile cost and per mile profit".
// Paid payrolls only count payrolls marked paid (before, any payroll record counted as paid).

interface Kpis {
  payables: number;
  payablesOverdue: number;
  payablesCount: number;
  receivables: number;
  receivablesOverdue: number;
  paidPayrolls: number;
  paidPayrollCount: number;
  pendingPayrolls: number;
  pendingPayrollCount: number;
  totalMiles: number;
  revenue: number;
  totalCost: number;
  costPerMile: number;
  profitPerMile: number;
}

const EMPTY: Kpis = {
  payables: 0, payablesOverdue: 0, payablesCount: 0, receivables: 0, receivablesOverdue: 0,
  paidPayrolls: 0, paidPayrollCount: 0, pendingPayrolls: 0, pendingPayrollCount: 0,
  totalMiles: 0, revenue: 0, totalCost: 0, costPerMile: 0, profitPerMile: 0,
};

const money = (n: number) => `$${(Number(n) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const PERIODS: { id: string; label: string; range: () => [string, string] | null }[] = [
  { id: 'month', label: 'This month', range: () => { const n = new Date(); return [iso(new Date(n.getFullYear(), n.getMonth(), 1)), iso(n)]; } },
  { id: 'last', label: 'Last month', range: () => { const n = new Date(); return [iso(new Date(n.getFullYear(), n.getMonth() - 1, 1)), iso(new Date(n.getFullYear(), n.getMonth(), 0))]; } },
  { id: 'year', label: 'This year', range: () => { const n = new Date(); return [iso(new Date(n.getFullYear(), 0, 1)), iso(n)]; } },
  { id: 'all', label: 'All time', range: () => null },
];

const Dashboard = () => {
  const navigate = useNavigate();
  const userRole = getUserRole();
  // Accountant and HR users access via /accounts/*, admin users via /admin/accounts/*
  const routePrefix = (userRole === 'hr' || userRole === 'accountant') ? '/accounts' : '/admin/accounts';

  const [period, setPeriod] = useState('month');
  const [custom, setCustom] = useState<{ start: string; end: string }>({ start: '', end: '' });
  const [kpis, setKpis] = useState<Kpis>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      let params: { startDate?: string; endDate?: string } = {};
      if (period === 'custom') {
        if (!custom.start || !custom.end) { setLoading(false); return; }
        params = { startDate: custom.start, endDate: custom.end };
      } else {
        const r = PERIODS.find(p => p.id === period)?.range();
        if (r) params = { startDate: r[0], endDate: r[1] };
      }
      const res = await getAccountsDashboard(params);
      if (res?.success && res.data) setKpis({ ...EMPTY, ...res.data });
      else setError(res?.message || 'Could not load the dashboard');
      setLoading(false);
    };
    load();
  }, [period, custom.start, custom.end]);

  const cards = [
    {
      id: 'payables', title: 'Payables', value: money(kpis.payables), icon: ArrowUpCircle, color: 'text-[var(--accent-red)]',
      sub: `${kpis.payablesCount} open bills${kpis.payablesOverdue > 0 ? ` · ${money(kpis.payablesOverdue)} overdue` : ''}`,
      path: `${routePrefix}/payables`,
    },
    {
      id: 'receivables', title: 'Receivables', value: money(kpis.receivables), icon: ArrowDownCircle, color: 'text-[var(--accent-green)]',
      sub: kpis.receivablesOverdue > 0 ? `${money(kpis.receivablesOverdue)} overdue` : 'Unpaid customer invoices',
      path: `${routePrefix}/invoice`,
    },
    {
      id: 'paid-payrolls', title: 'Paid Payrolls', value: money(kpis.paidPayrolls), icon: CheckCircle2, color: 'text-[var(--accent-green)]',
      sub: `${kpis.paidPayrollCount} payrolls / settlements marked paid`,
      path: `${routePrefix}/payroll`,
    },
    {
      id: 'pending-payrolls', title: 'Pending Payrolls', value: money(kpis.pendingPayrolls), icon: Clock, color: 'text-yellow-500',
      sub: `${kpis.pendingPayrollCount} generated, not paid yet`,
      path: `${routePrefix}/driverpayroll`,
    },
    {
      id: 'cost-per-mile', title: 'Cost per Mile', value: kpis.totalMiles > 0 ? `$${kpis.costPerMile.toFixed(2)}` : '—', icon: Gauge, color: 'text-[var(--accent-orange)]',
      sub: kpis.totalMiles > 0 ? `${money(kpis.totalCost)} over ${kpis.totalMiles.toLocaleString('en-US', { maximumFractionDigits: 0 })} mi` : 'No delivered miles in this period',
      path: `${routePrefix}/finance-report`,
    },
    {
      id: 'profit-per-mile', title: 'Profit per Mile', value: kpis.totalMiles > 0 ? `$${kpis.profitPerMile.toFixed(2)}` : '—', icon: TrendingUp,
      color: kpis.profitPerMile < 0 ? 'text-[var(--accent-red)]' : 'text-[var(--accent-purple)]',
      sub: kpis.totalMiles > 0 ? `Revenue ${money(kpis.revenue)} − cost ${money(kpis.totalCost)}` : 'No delivered miles in this period',
      path: `${routePrefix}/finance-report`,
    },
  ];

  const links = [
    { title: 'Accounts Payable', icon: ArrowUpCircle, path: `${routePrefix}/payables` },
    { title: 'Invoicing', icon: FileText, path: `${routePrefix}/invoice` },
    { title: 'Employees Payroll', icon: Users, path: `${routePrefix}/payroll` },
    { title: 'Driver Payroll', icon: IdCard, path: `${routePrefix}/driverpayroll` },
    { title: 'Settlements', icon: Handshake, path: `${routePrefix}/settlements` },
    { title: 'Expenses', icon: Receipt, path: `${routePrefix}/expenses` },
    { title: 'Fleet & Maint. Finance', icon: Wrench, path: `${routePrefix}/fleet-maintenance` },
  ];

  return (
    <div className="min-h-screen bg-main p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-[var(--text-primary)]">Accounts</h1>
          <p className="text-xs text-secondary">What we owe, what we are owed, payroll, and cost / profit per mile</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {PERIODS.map(p => (
            <button
              key={p.id}
              onClick={() => setPeriod(p.id)}
              className={`px-3 py-1.5 text-xs rounded-lg border border-theme ${period === p.id ? 'bg-[var(--accent-navyblue)] !text-white' : 'hover:bg-[rgba(15,31,23,0.05)]'}`}
            >
              {p.label}
            </button>
          ))}
          <button
            onClick={() => setPeriod('custom')}
            className={`px-3 py-1.5 text-xs rounded-lg border border-theme flex items-center gap-1 ${period === 'custom' ? 'bg-[var(--accent-navyblue)] !text-white' : 'hover:bg-[rgba(15,31,23,0.05)]'}`}
          >
            <Calendar size={12} /> Custom
          </button>
          {period === 'custom' && (
            <>
              <input type="date" value={custom.start} onChange={e => setCustom(c => ({ ...c, start: e.target.value }))} className="px-2 py-1 text-xs border border-theme rounded-lg bg-[var(--bg-card)]" />
              <input type="date" value={custom.end} onChange={e => setCustom(c => ({ ...c, end: e.target.value }))} className="px-2 py-1 text-xs border border-theme rounded-lg bg-[var(--bg-card)]" />
            </>
          )}
        </div>
      </div>

      {error && <div className="text-sm text-red-500">{error}</div>}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map(c => {
          const Icon = c.icon;
          return (
            <button
              key={c.id}
              onClick={() => navigate(c.path)}
              className="text-left bg-card border border-theme rounded-xl p-5 hover:shadow-lg transition-shadow cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm text-secondary">{c.title}</p>
                <Icon size={22} className={c.color} />
              </div>
              <p className="text-3xl font-bold mt-3 text-[var(--text-primary)]">
                {loading ? <span className="inline-block h-8 w-28 rounded bg-[rgba(128,128,128,0.2)] animate-pulse align-middle" /> : c.value}
              </p>
              <p className="text-xs text-secondary mt-2">{c.sub}</p>
            </button>
          );
        })}
      </div>

      <div>
        <h2 className="text-xs font-semibold text-secondary uppercase tracking-widest mb-3">Go to</h2>
        <div className="flex flex-wrap gap-2">
          {links.map(l => {
            const Icon = l.icon;
            return (
              <button key={l.title} onClick={() => navigate(l.path)} className="px-3 py-2 text-sm border border-theme rounded-lg bg-card hover:shadow flex items-center gap-2 cursor-pointer">
                <Icon size={16} className="text-[var(--accent-blue)]" /> {l.title}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
