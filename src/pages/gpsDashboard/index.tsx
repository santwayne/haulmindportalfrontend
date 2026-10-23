import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Satellite, MapPin, Search, ArrowLeft, Users, IdCard } from 'lucide-react';
import { listDriver } from '../../axios/api/distapcher';
import { getAllEmployees } from '../../axios/api/employee';
import { getDashboardRoute } from '../../utils/auth';

interface DriverRow {
  _id: string;
  name: string;
  email?: string;
  phone?: string;
  status?: string;
  location?: { address?: string };
  vehicle?: { unitNumber?: string; internalId?: string } | string | null;
}

interface EmployeeRow {
  _id: string;
  name: string;
  email?: string;
  role?: string;
  status?: string;
}

// Read-only GPS dashboard shared across every department. No create/edit/delete
// actions live here — that stays in the admin/dispatcher GPS module.
const GpsDashboard = () => {
  const navigate = useNavigate();
  const [tab, setTab] = useState<'drivers' | 'employees'>('drivers');
  const [drivers, setDrivers] = useState<DriverRow[]>([]);
  const [employees, setEmployees] = useState<EmployeeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [driverRes, employeeRes] = await Promise.all([
          listDriver({ limit: 200 }),
          getAllEmployees(1, 200),
        ]);
        if (driverRes?.success) {
          setDrivers(driverRes.data || []);
        }
        if (employeeRes?.success) {
          setEmployees(employeeRes.data || []);
        }
      } catch (error) {
        console.error('Error loading GPS dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const filteredDrivers = drivers.filter((d) =>
    !search || d.name?.toLowerCase().includes(search.toLowerCase()) || d.email?.toLowerCase().includes(search.toLowerCase())
  );
  const filteredEmployees = employees.filter((e) =>
    !search || e.name?.toLowerCase().includes(search.toLowerCase()) || e.email?.toLowerCase().includes(search.toLowerCase())
  );

  const statusBadge = (status?: string) => {
    const active = status === 'active';
    return (
      <span
        className="text-xs px-2 py-0.5 rounded-full font-medium"
        style={{
          backgroundColor: active ? 'rgba(0,255,163,0.1)' : 'rgba(148,163,184,0.15)',
          color: active ? '#00FFA3' : 'var(--text-secondary)',
        }}
      >
        {status || 'unknown'}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-main">
      <div className="px-4 pt-4 pb-10 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(getDashboardRoute())}
              className="p-2 rounded-lg border border-theme text-secondary hover:text-primary transition-colors"
              title="Back to dashboard"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="p-2 rounded-lg" style={{ backgroundColor: 'rgba(17,131,224,0.12)' }}>
              <Satellite className="w-5 h-5" style={{ color: 'var(--accent-navyblue)' }} />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-primary">GPS Dashboard</h1>
              <p className="text-xs text-secondary">Drivers & Employees — view only</p>
            </div>
          </div>
        </div>

        {/* Tabs + Search */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setTab('drivers')}
              className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors flex items-center gap-2 ${tab === 'drivers' ? 'text-white' : 'text-secondary border-theme'}`}
              style={tab === 'drivers' ? { backgroundColor: 'var(--accent-navyblue)', borderColor: 'var(--accent-navyblue)' } : undefined}
            >
              <IdCard className="w-4 h-4" /> Drivers ({drivers.length})
            </button>
            <button
              onClick={() => setTab('employees')}
              className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors flex items-center gap-2 ${tab === 'employees' ? 'text-white' : 'text-secondary border-theme'}`}
              style={tab === 'employees' ? { backgroundColor: 'var(--accent-navyblue)', borderColor: 'var(--accent-navyblue)' } : undefined}
            >
              <Users className="w-4 h-4" /> Employees ({employees.length})
            </button>
          </div>
          <div className="relative max-w-xs w-full">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-secondary" />
            <input
              type="text"
              placeholder={`Search ${tab}...`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-3 py-2 w-full border border-theme rounded-lg bg-card text-sm text-primary focus:outline-none focus:ring-2 focus:ring-[var(--accent-navyblue)]"
            />
          </div>
        </div>

        {/* Content */}
        <div className="bg-card rounded-xl border border-theme overflow-hidden">
          {loading ? (
            <div className="py-16 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--accent-navyblue)]" />
              <p className="mt-2 text-secondary text-sm">Loading...</p>
            </div>
          ) : tab === 'drivers' ? (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="border-b border-theme">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-secondary uppercase">Name</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-secondary uppercase">Contact</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-secondary uppercase">Vehicle</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-secondary uppercase">Location</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-secondary uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-theme">
                  {filteredDrivers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-10 text-center text-secondary text-sm">No drivers found</td>
                    </tr>
                  ) : (
                    filteredDrivers.map((d) => (
                      <tr key={d._id} className="hover:bg-[rgba(255,255,255,0.03)]">
                        <td className="px-4 py-3 text-sm font-medium text-primary whitespace-nowrap">{d.name || 'Unknown'}</td>
                        <td className="px-4 py-3 text-sm text-secondary whitespace-nowrap">{d.email || d.phone || 'N/A'}</td>
                        <td className="px-4 py-3 text-sm text-secondary whitespace-nowrap">
                          {typeof d.vehicle === 'string' ? d.vehicle : d.vehicle?.unitNumber || d.vehicle?.internalId || '—'}
                        </td>
                        <td className="px-4 py-3 text-sm text-secondary whitespace-nowrap">
                          <span className="flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5" />
                            {d.location?.address || 'Unknown'}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">{statusBadge(d.status)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="border-b border-theme">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-secondary uppercase">Name</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-secondary uppercase">Email</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-secondary uppercase">Role</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-secondary uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-theme">
                  {filteredEmployees.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-10 text-center text-secondary text-sm">No employees found</td>
                    </tr>
                  ) : (
                    filteredEmployees.map((e) => (
                      <tr key={e._id} className="hover:bg-[rgba(255,255,255,0.03)]">
                        <td className="px-4 py-3 text-sm font-medium text-primary whitespace-nowrap">{e.name || 'Unknown'}</td>
                        <td className="px-4 py-3 text-sm text-secondary whitespace-nowrap">{e.email || 'N/A'}</td>
                        <td className="px-4 py-3 text-sm text-secondary whitespace-nowrap capitalize">{e.role || 'N/A'}</td>
                        <td className="px-4 py-3 whitespace-nowrap">{statusBadge(e.status)}</td>
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

export default GpsDashboard;
