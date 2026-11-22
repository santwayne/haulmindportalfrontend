import { getUserInfo, getUserRole } from './auth';

/** Portal keys an admin can grant under HR → Employees → Advanced Permissions. */
export type PortalKey =
  | 'dispatch_load' | 'gps' | 'human_resource' | 'fleet_maintenance' | 'mechanic'
  | 'compliance' | 'accounts' | 'health_safety' | 'manifest';

/** The role whose own panel each portal is. */
export const PORTAL_MAIN_ROLE: Record<PortalKey, string> = {
  dispatch_load: 'dispatcher',
  gps: 'dispatcher',
  human_resource: 'hr',
  fleet_maintenance: 'Fleet Maintenance Manager',
  mechanic: 'Maintenance Crew (Mechanics)',
  compliance: 'Compliance Manager',
  accounts: 'accountant',
  health_safety: 'safety officer',
  manifest: 'admin',
};

export const getGrantedPortals = (): string[] => {
  try {
    const portals = getUserInfo()?.userData?.portals;
    return Array.isArray(portals) ? portals : [];
  } catch {
    return [];
  }
};

/**
 * True when the logged-in user may open a portal: it is their own role's panel, or an admin
 * granted it to them in Advanced Permissions. Before this, every panel only let in its own role,
 * so granted portals showed in the switcher but bounced back to the login page.
 */
export const canAccessPortal = (...portals: PortalKey[]): boolean => {
  const role = getUserRole();
  if (!role) return false;
  if (portals.some((p) => PORTAL_MAIN_ROLE[p] === role)) return true;
  const granted = getGrantedPortals();
  return portals.some((p) => granted.includes(p));
};
