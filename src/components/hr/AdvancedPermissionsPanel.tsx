import { useEffect, useMemo, useState } from 'react';
import { ShieldCheck, Save, Check } from 'lucide-react';
import { updateEmployeePortals } from '../../axios/api/employee';
import { getUserInfo, getUserRole } from '../../utils/auth';

/**
 * HR → Employees → Advanced Permissions.
 * Before: this tab only re-listed the employees, with nothing to set. The backend already
 * stored extra "portals" per user, but there was no screen to grant them.
 * Now each sign-in employee has a row of portals (departments) they can open in addition
 * to their own role's panel. Saved per employee.
 */

type Employee = {
  _id: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  role?: string;
  portals?: string[];
};

const PORTALS: { key: string; label: string; role: string }[] = [
  { key: 'dispatch_load', label: 'Dispatch', role: 'dispatcher' },
  { key: 'gps', label: 'GPS', role: 'dispatcher' },
  { key: 'human_resource', label: 'HR', role: 'hr' },
  { key: 'accounts', label: 'Accounts', role: 'accountant' },
  { key: 'fleet_maintenance', label: 'Fleet Maintenance', role: 'Fleet Maintenance Manager' },
  { key: 'mechanic', label: 'Mechanic', role: 'Maintenance Crew (Mechanics)' },
  { key: 'compliance', label: 'Compliance', role: 'Compliance Manager' },
  { key: 'health_safety', label: 'Health & Safety', role: 'safety officer' },
];

const ROLE_LABELS: Record<string, string> = {
  dispatcher: 'Dispatcher',
  hr: 'HR',
  accountant: 'Accountant',
  'Fleet Maintenance Manager': 'Fleet Maintenance Manager',
  'Maintenance Crew (Mechanics)': 'Mechanic',
  'Compliance Manager': 'Compliance Manager',
  'safety officer': 'Safety Officer',
};

const sameSet = (a: string[], b: string[]) => a.length === b.length && a.every((x) => b.includes(x));

export default function AdvancedPermissionsPanel({ employees, loading }: { employees: Employee[]; loading: boolean }) {
  const myRole = getUserRole();
  const myId = getUserInfo()?.userData?._id || getUserInfo()?.userData?.id;
  const canEdit = myRole === 'admin' || myRole === 'superadmin' || myRole === 'hr';

  const [draft, setDraft] = useState<Record<string, string[]>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [rowMsg, setRowMsg] = useState<Record<string, { ok: boolean; text: string }>>({});
  const [saved, setSaved] = useState<Record<string, string[]>>({});

  useEffect(() => {
    const init: Record<string, string[]> = {};
    employees.forEach((e) => { init[e._id] = (e.portals || []).filter((p) => p !== 'manifest'); });
    setDraft(init);
    setSaved(init);
  }, [employees]);

  const rows = useMemo(() => employees.filter((e) => e.role && ROLE_LABELS[e.role]), [employees]);

  const toggle = (id: string, key: string) => {
    setDraft((d) => {
      const cur = d[id] || [];
      return { ...d, [id]: cur.includes(key) ? cur.filter((k) => k !== key) : [...cur, key] };
    });
    setRowMsg((m) => { const n = { ...m }; delete n[id]; return n; });
  };

  const save = async (emp: Employee) => {
    setSaving(emp._id);
    const portals = draft[emp._id] || [];
    const res = await updateEmployeePortals(emp._id, portals);
    setSaving(null);
    if (res?.success) {
      setSaved((s) => ({ ...s, [emp._id]: portals }));
      setRowMsg((m) => ({ ...m, [emp._id]: { ok: true, text: 'Saved. They see it after their next page load.' } }));
    } else {
      setRowMsg((m) => ({ ...m, [emp._id]: { ok: false, text: res?.message || 'Could not save' } }));
    }
  };

  const nameOf = (e: Employee) => e.name || [e.firstName, e.lastName].filter(Boolean).join(' ') || e.email || '—';

  return (
    <div className="bg-card rounded-lg shadow-sm border border-theme overflow-hidden">
      <div className="p-4 border-b border-theme flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-[var(--accent-blue)] mt-0.5" />
        <div>
          <h2 className="text-lg font-semibold text-primary">Advanced Permissions: extra portal access</h2>
          <p className="text-sm text-secondary">
            Every employee always has their own department. Tick any other departments they should also open,
            then click Save. They switch between them with “Switch Portal” at the top of the screen.
          </p>
          {!canEdit && (
            <p className="text-sm text-[var(--accent-orange,#d97706)] mt-1">Only the company admin or HR can change these.</p>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-card border-b border-theme">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-[var(--accent-navyblue)] uppercase">Employee</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-[var(--accent-navyblue)] uppercase">Own department</th>
              {PORTALS.map((p) => (
                <th key={p.key} className="px-2 py-3 text-center text-xs font-medium text-[var(--accent-navyblue)] uppercase whitespace-nowrap">{p.label}</th>
              ))}
              <th className="px-4 py-3 text-left text-xs font-medium text-[var(--accent-navyblue)] uppercase"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-color,rgba(15,31,23,0.08))]">
            {loading ? (
              <tr><td colSpan={PORTALS.length + 3} className="px-4 py-8 text-center text-secondary">Loading…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={PORTALS.length + 3} className="px-4 py-8 text-center text-secondary">
                No employees with a portal login yet. Add an employee with a role (Dispatcher, HR, Accountant, Fleet Maintenance Manager, Compliance Manager, Safety Officer or Mechanic) first.
              </td></tr>
            ) : rows.map((emp) => {
              const own = PORTALS.filter((p) => p.role === emp.role).map((p) => p.key);
              const cur = draft[emp._id] || [];
              const changed = !sameSet(cur, saved[emp._id] || []);
              const isSelf = !!myId && String(myId) === String(emp._id);
              const editable = canEdit && !(myRole === 'hr' && isSelf);
              return (
                <tr key={emp._id} className="hover:bg-[rgba(15,31,23,0.03)]">
                  <td className="px-4 py-3">
                    <div className="text-sm font-medium text-primary">{nameOf(emp)}</div>
                    <div className="text-xs text-secondary">{emp.email}</div>
                  </td>
                  <td className="px-4 py-3 text-sm text-primary whitespace-nowrap">{ROLE_LABELS[emp.role || ''] || emp.role}</td>
                  {PORTALS.map((p) => {
                    const isOwn = own.includes(p.key);
                    return (
                      <td key={p.key} className="px-2 py-3 text-center">
                        {isOwn ? (
                          <span title="Their own department" className="inline-flex items-center justify-center w-5 h-5 rounded bg-[var(--accent-green)]/20 text-[var(--accent-green)]"><Check size={14} /></span>
                        ) : (
                          <input
                            type="checkbox"
                            aria-label={`${nameOf(emp)}: ${p.label}`}
                            className="w-4 h-4 accent-[var(--accent-blue)] cursor-pointer disabled:cursor-not-allowed"
                            checked={cur.includes(p.key)}
                            disabled={!editable}
                            onChange={() => toggle(emp._id, p.key)}
                          />
                        )}
                      </td>
                    );
                  })}
                  <td className="px-4 py-3 whitespace-nowrap">
                    <button
                      onClick={() => save(emp)}
                      disabled={!editable || !changed || saving === emp._id}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg bg-[var(--accent-blue)] text-white disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <Save size={14} /> {saving === emp._id ? 'Saving…' : 'Save'}
                    </button>
                    {isSelf && myRole === 'hr' && <div className="text-xs text-secondary mt-1">Your own access is set by the admin.</div>}
                    {rowMsg[emp._id] && (
                      <div className={`text-xs mt-1 ${rowMsg[emp._id].ok ? 'text-[var(--accent-green)]' : 'text-red-400'}`}>{rowMsg[emp._id].text}</div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
