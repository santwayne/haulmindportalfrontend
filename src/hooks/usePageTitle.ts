import { useLocation } from 'react-router-dom';

const SEGMENT_TITLES: Record<string, string> = {
    // General
    'profile': 'Profile',
    'training': 'Training Content',

    // Admin
    'quick-stats': 'Quick Stats',
    'truck-profile': 'Fleet Profile',
    'invoice': 'Invoices',
    'invoices': 'Invoices',
    'subscription': 'Subscription & Plans',
    'company-documents': 'Company Documents',
    'hr-training-content': 'HR Training Content',
    'employees': 'Employees',
    'customers': 'Customers',
    'drivers': 'Drivers',
    'company': 'Company Settings',
    'member': 'Member',
    'slots': 'Slots',
    'integrations': 'API Integrations',

    // Super Admin
    'viewalladmins': 'Admin Accounts',
    'billing': 'Plan Management',
    'revenue': 'Revenue Generated',
    'systemsetting': 'System Settings',

    // Dispatch
    'trips': 'Trips',
    'scheduling': 'Trip Scheduling',
    'fleets': 'Fleets',
    'contacts': 'Customer Contacts',
    'utilization': 'Truck & Trailer Utilization',
    'revenue-per-mile': 'Revenue Per Mile',
    'deliveries': 'Deliveries',
    'pickups': 'Pickups',
    'drivers-on-leave': 'Drivers on Leave',
    'audit': 'Audit Trail',
    'chat': 'Chat',

    // GPS
    'livetracking': 'Live Tracking',
    'vehicles': 'Fleets',
    'truck': 'Truck Tracking',
    'trailer': 'Trailer Tracking',
    'trip': 'Trip Tracking',

    // HR Management
    'employeelist': 'Employees',
    'attendence': 'Attendance Tracking',
    'employee-profiles': 'Employee Portfolio',
    'driver-profiles': 'Driver Portfolio',
    'driver-training-center': 'Driver Training Center',
    'drug-test': 'Drug Test',
    'eld-documents': 'ELD Documents',
    'trucks': 'Trucks',
    'trailers': 'Trailers',
    'role-based-training': 'Role-Based Training',

    // Accounts
    'finance-report': 'Finance Report',
    'settlements': 'Settlements',
    'expenses': 'Expense Management',
    'payroll': 'Employees Payroll',
    'driverpayroll': 'Driver Payroll',
    'gross-pay': 'Gross Payroll',
    'fleet-maintenance': 'Fleet & Maintenance Finance',
    'fuel-reports': 'Fuel Reports',
    'receipts-notes': 'Receipts & Notes',
    'config': 'Accounting Config',
    'cash-flow-insights': 'Cash Flow Insights',
    'tax-setup': 'Tax Setup & Rate Management',

    // Fleet Maintenance
    'scheduled-services-log': 'Scheduled Services Log',
    'maintenance-orders-log': 'Maintenance Orders Log',
    'parts': 'Parts',
    'yards': 'Yards',
    'issues': 'Issues',

    // Health & Safety
    'health-safety-summary': 'Health & Safety Summary',
    'incidents-accidents': 'Incidents & Accidents',
    'inspections-hazards': 'Hazards Management',
    'safety-inspections': 'Safety Inspections',
    'training-certificates': 'Training & Certificates',
    'policies-documents': 'Policy & Documents',
    'compliance-records': 'Compliance Records',
    'committee-capa': 'H&S Committee & CAPA',
    'trucking-operations': 'Trucking Operations',
    'emergency-procedures': 'Emergency Procedures',
    'reports-analytics': 'Reports & Analytics',

    // Mechanics
    'orders': 'Maintenance Orders',
    'completed-orders': 'Completed Orders',
    'services': 'Services',

    // Role dashboard pages (shown for all roles except admin home)
    'dashboard': 'Dashboard',

    // Compliance
    'compilance-summary': 'Compliance Summary',
    'hos-eld': 'HOS & ELD',
    'cvsa-inspection': 'CVSA Inspection',
    'monthly-report': 'Carrier Profile',
    'tickets': 'Tickets (Fines & Penalties)',
    'accidents': 'Accidents',
    'insurance-claims': 'Insurance Claims',
};

// The only paths that show NO title — the main admin home/overview page
const ADMIN_HOME_PATHS = new Set(['/admin', '/admin/dashboard']);

function autoTitle(segment: string): string {
    return segment
        .split('-')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
}

export function usePageTitle(): string | null {
    const { pathname } = useLocation();

    const path =
        pathname.endsWith('/') && pathname.length > 1
            ? pathname.slice(0, -1)
            : pathname;

    // Only the admin overview page shows no title
    if (ADMIN_HOME_PATHS.has(path)) return null;

    const segments = path.split('/').filter(Boolean);
    const lastSegment = segments[segments.length - 1] || '';

    if (!lastSegment) return null;

    return SEGMENT_TITLES[lastSegment] ?? autoTitle(lastSegment);
}
