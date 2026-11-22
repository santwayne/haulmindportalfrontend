import { todayLocalISO } from '../../../../utils/fuelDate';
import { useEffect, useState } from 'react';
import { Search, Users, IdCard, Download } from 'lucide-react';
import { getAllEmployees } from '../../../../axios/api/employee';
import { listDriver } from '../../../../axios/api/distapcher';

interface StaffRow {
  _id: string;
  name: string;
  email?: string;
  phone?: string;
  role?: string;
  status?: string;
  type: 'employee' | 'driver';
  paymentMethod?: string;
  rateInfo?: string;
  vehicle?: string;
}

const statusBadge = (status?: string) => {
  const active = status === 'active';
  return (
    <span
      className="text-xs px-2 py-0.5 rounded-full font-medium"
      style={{
        backgroundColor: active ? 'rgba(5,150,105,0.1)' : 'rgba(148,163,184,0.15)',
        color: active ? '#059669' : 'var(--text-secondary)',
      }}
    >
      {status || 'unknown'}
    </span>
  );
};

const typeBadge = (type: 'employee' | 'driver') => (
  <span
    className="text-xs px-2 py-0.5 rounded-full font-medium"
    style={{
      backgroundColor: type === 'driver' ? 'rgba(5,150,105,0.12)' : 'rgba(168,85,247,0.12)',
      color: type === 'driver' ? 'var(--accent-navyblue)' : 'var(--accent-purple)',
    }}
  >
    {type === 'driver' ? 'Driver' : 'Employee'}
  </span>
);

const StaffList = () => {
  const [tab, setTab] = useState<'all' | 'employees' | 'drivers'>('all');
  const [rows, setRows] = useState<StaffRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      try {
        const [empRes, drvRes] = await Promise.all([
          getAllEmployees(1, 500),
          listDriver({ limit: 500 }),
        ]);

        const employees: StaffRow[] = (empRes?.data || []).map((e: any) => ({
          _id: e._id,
          name: e.name || `${e.firstName || ''} ${e.lastName || ''}`.trim(),
          email: e.email,
          phone: e.phone,
          role: e.role,
          status: e.status,
          type: 'employee' as const,
          rateInfo: e.details?.payType || '—',
        }));

        const drivers: StaffRow[] = (drvRes?.data || []).map((d: any) => {
          const pm = d.details?.paymentMethod || d.paymentMethod || '';
          let rateInfo = '—';
          if (pm === 'PAID PERCENT') rateInfo = `${d.details?.percentageRate || 0}%`;
          else if (pm === 'PAID PER MILE') rateInfo = `$${d.details?.salaryPerMile || d.details?.mileRate || 0}/mi`;
          else if (pm === 'PAID BY TRIP') rateInfo = `$${d.details?.perTripAmount || 0}/trip`;
          else if (pm === 'PAID PER HOUR') rateInfo = `$${d.details?.hourlyRate || 0}/hr`;
          else if (pm === 'PAID PER DAY') rateInfo = `$${d.details?.dailyRate || 0}/day`;

          const vehicle = typeof d.vehicle === 'object'
            ? (d.vehicle?.unitNumber || d.vehicle?.internalId || '—')
            : (d.vehicle || '—');

          return {
            _id: d._id,
            name: d.name,
            email: d.email,
            phone: d.phone,
            role: (d.details?.companyFlag || d.companyFlag) ? 'Owner Operator' : 'Company Driver',
            status: d.status,
            type: 'driver' as const,
            paymentMethod: pm || '—',
            rateInfo,
            vehicle,
          };
        });

        setRows([...employees, ...drivers]);
      } catch (err) {
        console.error('Failed to load staff:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  const filtered = rows.filter((r) => {
    if (tab === 'employees' && r.type !== 'employee') return false;
    if (tab === 'drivers' && r.type !== 'driver') return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      r.name?.toLowerCase().includes(q) ||
      r.email?.toLowerCase().includes(q) ||
      r.role?.toLowerCase().includes(q)
    );
  });

  const exportCSV = () => {
    const header = ['Type', 'Name', 'Email', 'Phone', 'Role / Driver Type', 'Payment / Pay Type', 'Rate', 'Status'];
    const csvRows = filtered.map((r) => [
      r.type === 'driver' ? 'Driver' : 'Employee',
      r.name || '',
      r.email || '',
      r.phone || '',
      r.role || '',
      r.paymentMethod || r.rateInfo || '',
      r.rateInfo || '',
      r.status || '',
    ]);
    const csv = [header, ...csvRows].map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `staff-list-${todayLocalISO()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const empCount = rows.filter((r) => r.type === 'employee').length;
  const drvCount = rows.filter((r) => r.type === 'driver').length;

  return (
    <div className="min-h-screen bg-main px-6 py-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-primary flex items-center gap-2">
              <Users className="w-6 h-6 text-[var(--accent-navyblue)]" />
              Staff Directory
            </h1>
            <p className="text-sm text-secondary mt-1">All employees and drivers — read only</p>
          </div>
          <button
            onClick={exportCSV}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white"
            style={{ backgroundColor: 'var(--accent-navyblue)' }}
          >
            <Download className="w-4 h-4" /> Export CSV
          </button>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-card border border-theme rounded-xl p-4">
            <p className="text-xs text-secondary uppercase">Total Staff</p>
            <p className="text-2xl font-bold text-primary mt-1">{rows.length}</p>
          </div>
          <div className="bg-card border border-theme rounded-xl p-4">
            <p className="text-xs text-secondary uppercase">Employees</p>
            <p className="text-2xl font-bold mt-1" style={{ color: 'var(--accent-purple)' }}>{empCount}</p>
          </div>
          <div className="bg-card border border-theme rounded-xl p-4">
            <p className="text-xs text-secondary uppercase">Drivers</p>
            <p className="text-2xl font-bold mt-1" style={{ color: 'var(--accent-navyblue)' }}>{drvCount}</p>
          </div>
        </div>

        {/* Tabs + Search */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            {(['all', 'employees', 'drivers'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors flex items-center gap-1.5 ${tab === t ? 'text-white' : 'text-secondary border-theme'}`}
                style={tab === t ? { backgroundColor: 'var(--accent-navyblue)', borderColor: 'var(--accent-navyblue)' } : undefined}
              >
                {t === 'employees' ? <Users className="w-3.5 h-3.5" /> : t === 'drivers' ? <IdCard className="w-3.5 h-3.5" /> : null}
                {t === 'all' ? `All (${rows.length})` : t === 'employees' ? `Employees (${empCount})` : `Drivers (${drvCount})`}
              </button>
            ))}
          </div>
          <div className="relative max-w-xs w-full">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-secondary" />
            <input
              type="text"
              placeholder="Search name, email, role..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-3 py-2 w-full border border-theme rounded-lg bg-card text-sm text-primary focus:outline-none focus:ring-2 focus:ring-[var(--accent-navyblue)]"
            />
          </div>
        </div>

        {/* Table */}
        <div className="bg-card rounded-xl border border-theme overflow-hidden">
          {loading ? (
            <div className="py-16 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--accent-navyblue)]" />
              <p className="mt-2 text-secondary text-sm">Loading staff...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="border-b border-theme">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-secondary uppercase">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-secondary uppercase">Name</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-secondary uppercase">Email</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-secondary uppercase">Phone</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-secondary uppercase">Role / Type</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-secondary uppercase">Pay Rate</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-secondary uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-theme">
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-10 text-center text-secondary text-sm">
                        No staff found
                      </td>
                    </tr>
                  ) : (
                    filtered.map((r) => (
                      <tr key={`${r.type}-${r._id}`} className="hover:bg-[rgba(15,31,23,0.03)]">
                        <td className="px-4 py-3 whitespace-nowrap">{typeBadge(r.type)}</td>
                        <td className="px-4 py-3 text-sm font-medium text-primary whitespace-nowrap">{r.name || '—'}</td>
                        <td className="px-4 py-3 text-sm text-secondary whitespace-nowrap">{r.email || '—'}</td>
                        <td className="px-4 py-3 text-sm text-secondary whitespace-nowrap">{r.phone || '—'}</td>
                        <td className="px-4 py-3 text-sm text-secondary whitespace-nowrap capitalize">{r.role || '—'}</td>
                        <td className="px-4 py-3 text-sm text-secondary whitespace-nowrap">{r.rateInfo || '—'}</td>
                        <td className="px-4 py-3 whitespace-nowrap">{statusBadge(r.status)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StaffList;
