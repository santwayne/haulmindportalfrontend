import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LayoutGrid } from 'lucide-react';
import { getUserInfo, getUserRole } from '../../utils/auth';
import { getCurrentUserProfile } from '../../axios/api/auth';

const PORTAL_LABELS: Record<string, string> = {
  dispatch_load: 'Dispatch Load',
  gps: 'GPS',
  human_resource: 'Human Resource',
  fleet_maintenance: 'Fleet Maintenance',
  mechanic: 'Mechanic',
  compliance: 'Compliance',
  accounts: 'Accounts',
  health_safety: 'Health & Safety',
  manifest: 'Manifest',
};

const PORTAL_ROUTES: Record<string, string> = {
  dispatch_load: '/dispatch',
  gps: '/gpsvehicle',
  human_resource: '/Management',
  fleet_maintenance: '/fleetmaintenance',
  mechanic: '/mechanics/dashboard',
  compliance: '/compliance',
  accounts: '/accounts',
  health_safety: '/healthandsafety',
  manifest: '/manifest',
};

const ROLE_PORTAL_MAP: Record<string, string> = {
  dispatcher: 'dispatch_load',
  hr: 'human_resource',
  accountant: 'accounts',
  'Fleet Maintenance Manager': 'fleet_maintenance',
  'Compliance Manager': 'compliance',
  'safety officer': 'health_safety',
  'Maintenance Crew (Mechanics)': 'mechanic',
};

const getAccessiblePortals = (): string[] => {
  try {
    const info = getUserInfo();
    const portals: string[] = info?.userData?.portals || [];
    const role = getUserRole();
    const all = new Set(portals.filter((p) => p !== 'manifest'));
    if (role && ROLE_PORTAL_MAP[role]) all.add(ROLE_PORTAL_MAP[role]);
    return Array.from(all);
  } catch {
    return [];
  }
};

export default function PortalSwitcher() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const [portals, setPortals] = useState<string[]>(() => getAccessiblePortals());

  useEffect(() => {
    getCurrentUserProfile().then((res) => {
      if (res?.success && res?.data) {
        const freshPortals: string[] = res.data.portals || [];

        try {
          const stored = localStorage.getItem('userInfo');
          if (stored) {
            const parsed = JSON.parse(stored);
            if (parsed?.userData) {
              parsed.userData.portals = freshPortals;
              localStorage.setItem('userInfo', JSON.stringify(parsed));
            }
          }
        } catch (_) {}

        const role = getUserRole();
        const all = new Set(freshPortals.filter((p) => p !== 'manifest'));
        if (role && ROLE_PORTAL_MAP[role]) all.add(ROLE_PORTAL_MAP[role]);
        setPortals(Array.from(all));
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  if (portals.length < 2) return null;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(prev => !prev)}
        className="header-btn flex items-center gap-1.5 text-sm"
        title="Switch Portal"
      >
        <LayoutGrid size={18} />
        <span className="hidden sm:inline text-secondary">Switch Portal</span>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-52 bg-card border border-theme rounded-xl shadow-2xl z-[200] overflow-hidden py-1">
          {portals.map((key) => (
            <button
              key={key}
              onClick={() => {
                setOpen(false);
                navigate(PORTAL_ROUTES[key] || '/');
              }}
              className="w-full text-left px-4 py-2.5 text-sm text-primary hover:bg-[rgba(15,31,23,0.05)] transition-colors"
            >
              {PORTAL_LABELS[key] || key}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
