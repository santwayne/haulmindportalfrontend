import { Suspense } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { ArrowLeft, Satellite, Truck, Package, Route as RouteIcon, Users } from 'lucide-react';
import Loading from '../../components/common/Loading';
import { getDashboardRoute } from '../../utils/auth';

// Shared, read-only GPS dashboard for every department (HR, Accounts, Fleet Maintenance,
// Compliance, Health & Safety, Mechanics, ...). It reuses the same live trackers as the
// admin/dispatcher GPS module, so every department sees where trucks, trailers and
// active trips are. No create/edit/delete actions live here.
const TABS = [
  { to: '/gps-dashboard/truck', label: 'Trucks', icon: Truck },
  { to: '/gps-dashboard/trailer', label: 'Trailers', icon: Package },
  { to: '/gps-dashboard/trip', label: 'Trips', icon: RouteIcon },
  { to: '/gps-dashboard/people', label: 'Drivers & Staff', icon: Users },
];

// Absolute paths on purpose: this page is a pathless layout under a splat route, so a
// relative link resolves against the current tab and piles up as /truck/truck/...
const HEADER_HEIGHT = 64; // px — keep in sync with the header below

const GpsDashboard = () => {
  const navigate = useNavigate();

  return (
    <div className="h-screen flex flex-col bg-main overflow-hidden">
      {/* Header */}
      <div
        className="flex-shrink-0 flex items-center justify-between gap-3 px-4 border-b border-theme bg-card"
        style={{ height: HEADER_HEIGHT }}
      >
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => navigate(getDashboardRoute())}
            className="p-2 rounded-lg border border-theme text-secondary hover:text-primary transition-colors"
            title="Back to dashboard"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="p-2 rounded-lg hidden sm:block" style={{ backgroundColor: 'rgba(5,150,105,0.12)' }}>
            <Satellite className="w-5 h-5" style={{ color: 'var(--accent-navyblue)' }} />
          </div>
          <div className="min-w-0 hidden md:block">
            <h1 className="text-lg font-semibold text-primary leading-tight">GPS Dashboard</h1>
            <p className="text-xs text-secondary">Live tracking — view only</p>
          </div>
        </div>

        <nav className="flex items-center gap-1 sm:gap-2 overflow-x-auto">
          {TABS.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `px-3 py-2 rounded-lg text-sm font-medium border transition-colors flex items-center gap-2 whitespace-nowrap ${
                  isActive ? 'text-white' : 'text-secondary border-theme hover:text-primary'
                }`
              }
              style={({ isActive }) =>
                isActive ? { backgroundColor: 'var(--accent-navyblue)', borderColor: 'var(--accent-navyblue)' } : undefined
              }
            >
              <Icon className="w-4 h-4" />
              <span className="hidden sm:inline">{label}</span>
            </NavLink>
          ))}
        </nav>
      </div>

      {/* Tracker area. The trackers are built as full-screen pages (h-screen); inside this
          hub they must fill the remaining space instead, so h-screen is scoped to 100%. */}
      <style>{`.gps-dashboard-body .h-screen { height: 100% !important; }`}</style>
      <div className="gps-dashboard-body flex-1 min-h-0 overflow-hidden">
        <Suspense fallback={<Loading />}>
          <Outlet />
        </Suspense>
      </div>
    </div>
  );
};

export default GpsDashboard;
