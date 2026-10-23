// hooks/useQuickActions.ts
import { Users, Settings, FileText, Truck, AlertCircle,  Briefcase, LayoutDashboard, AlertOctagon, FileCheck, Package, DollarSign, UserCheck, ShieldCheck, Wrench, Plus, User, BarChart3, CreditCard } from "lucide-react";

export interface QuickActionOption {
    id: string;
    type: 'command' | 'navigation' | 'create' | 'search';
    title: string;
    description: string;
    path?: string;
    icon: React.ReactNode;
    keywords: string[];
    roles?: ('admin' | 'hr' | 'compliance' | 'fleet' | 'dispatch' | 'safety' | 'superadmin' | 'accountant')[];
}




export const useQuickActions = () => {
    const availableActions: QuickActionOption[] = [
        // Navigation commands - Admin
        {
            id: 'goto-dispatch',
            type: 'navigation',
            title: 'Go to Dispatch',
            description: 'Open dispatch operations',
            path: '/admin/dispatch/operations',
            icon: <Package size={16} />,
            keywords: ['dispatch', 'operations', 'loads', 'delivery'],
            roles: ['admin']
        },
        {
            id: 'goto-drivers',
            type: 'navigation',
            title: 'Go to Drivers',
            description: 'Manage drivers and documents',
            path: '/admin/Management/drivers',
            icon: <User size={16} />,
            keywords: ['drivers', 'driver management', 'employees'],
            roles: ['admin']
        },
        {
            id: 'goto-payroll',
            type: 'navigation',
            title: 'Go to Payroll',
            description: 'View and manage payroll',
            path: '/admin/accounts/payroll',
            icon: <DollarSign size={16} />,
            keywords: ['payroll', 'payment', 'salary', 'wages'],
            roles: ['admin']
        },
        {
            id: 'goto-invoices',
            type: 'navigation',
            title: 'Go to Invoices',
            description: 'Manage invoices',
            path: '/admin/accounts/invoice',
            icon: <FileText size={16} />,
            keywords: ['invoices', 'billing', 'invoicing', 'invoice'],
            roles: ['admin']
        },
        {
            id: 'goto-expenses',
            type: 'navigation',
            title: 'Go to Expenses',
            description: 'Track expenses',
            path: '/admin/accounts/expenses',
            icon: <DollarSign size={16} />,
            keywords: ['expenses', 'spending', 'costs'],
            roles: ['admin']
        },
        {
            id: 'goto-gps',
            type: 'navigation',
            title: 'Go to GPS Tracking',
            description: 'Track vehicles in real-time',
            path: '/admin/gpsvehicle/tracking',
            icon: <Truck size={16} />,
            keywords: ['gps', 'tracking', 'vehicles', 'location'],
            roles: ['admin']
        },
        {
            id: 'goto-compliance',
            type: 'navigation',
            title: 'Go to Compliance',
            description: 'Compliance management',
            path: '/admin/compliance/documents',
            icon: <ShieldCheck size={16} />,
            keywords: ['compliance', 'regulations', 'safety'],
            roles: ['admin']
        },
        {
            id: 'goto-fleet',
            type: 'navigation',
            title: 'Go to Fleet Maintenance',
            description: 'Manage vehicle maintenance',
            path: '/admin/fleetmaintenance/schedule',
            icon: <Wrench size={16} />,
            keywords: ['fleet', 'maintenance', 'vehicles', 'service'],
            roles: ['admin']
        },

        // HR Specific Routes
        {
            id: 'hr-dashboard',
            type: 'navigation',
            title: 'HR Dashboard',
            description: 'Go to HR Dashboard',
            path: '/Management',
            icon: <UserCheck size={16} />,
            keywords: ['dashboard', 'home', 'main'],
            roles: ['hr']
        },
        {
            id: 'hr-drivers',
            type: 'navigation',
            title: 'Drivers',
            description: 'Manage drivers',
            path: '/Management/drivers',
            icon: <Truck size={16} />,
            keywords: ['drivers', 'trucks', 'staff'],
            roles: ['hr']
        },
        {
            id: 'hr-employees',
            type: 'navigation',
            title: 'Employee Directory',
            description: 'View all employees',
            path: '/Management/employeelist',
            icon: <User size={16} />,
            keywords: ['employees', 'staff', 'directory', 'people'],
            roles: ['hr']
        },
        {
            id: 'hr-documents',
            type: 'navigation',
            title: 'Employee Documents',
            description: 'View employee documents',
            path: '/Management/documents',
            icon: <FileText size={16} />,
            keywords: ['documents', 'files', 'paperwork'],
            roles: ['hr']
        },
        {
            id: 'hr-company-documents',
            type: 'navigation',
            title: 'Company Documents',
            description: 'View company documents',
            path: '/Management/company-documents',
            icon: <FileText size={16} />,
            keywords: ['company', 'documents', 'files'],
            roles: ['hr']
        },
        {
            id: 'hr-attendance',
            type: 'navigation',
            title: 'Attendance',
            description: 'View attendance records',
            path: '/Management/attendence',
            icon: <FileText size={16} />,
            keywords: ['attendance', 'time', 'clock'],
            roles: ['hr']
        },
        {
            id: 'hr-employee-profiles',
            type: 'navigation',
            title: 'Employee Portfolio',
            description: 'View employee profiles',
            path: '/Management/employee-profiles',
            icon: <User size={16} />,
            keywords: ['portfolio', 'profiles', 'employee'],
            roles: ['hr']
        },
        {
            id: 'hr-driver-profiles',
            type: 'navigation',
            title: 'Driver Portfolio',
            description: 'View driver profiles',
            path: '/Management/driver-profiles',
            icon: <User size={16} />,
            keywords: ['portfolio', 'profiles', 'driver'],
            roles: ['hr']
        },
        {
            id: 'hr-issues',
            type: 'navigation',
            title: 'Issues',
            description: 'View reported issues',
            path: '/Management/issues',
            icon: <ShieldCheck size={16} />,
            keywords: ['issues', 'problems', 'reports'],
            roles: ['hr']
        },

        // Compliance Specific Routes
        {
            id: 'comp-summary',
            type: 'navigation',
            title: 'Compliance Summary',
            description: 'Compliance Dashboard',
            path: '/compliance',
            icon: <ShieldCheck size={16} />,
            keywords: ['compliance', 'summary', 'dashboard'],
            roles: ['compliance']
        },
        {
            id: 'comp-hos',
            type: 'navigation',
            title: 'HOS & ELD',
            description: 'Hours of Service & ELD',
            path: '/compliance/hos-eld',
            icon: <FileText size={16} />,
            keywords: ['hos', 'eld', 'hours', 'service'],
            roles: ['compliance']
        },
        {
            id: 'comp-cvsa',
            type: 'navigation',
            title: 'CVSA Inspection',
            description: 'CVSA Inspection Reports',
            path: '/compliance/cvsa-inspection',
            icon: <ShieldCheck size={16} />,
            keywords: ['cvsa', 'inspection', 'report'],
            roles: ['compliance']
        },
        {
            id: 'comp-monthly',
            type: 'navigation',
            title: 'Monthly Report',
            description: 'View monthly compliance reports',
            path: '/compliance/monthly-report',
            icon: <FileText size={16} />,
            keywords: ['monthly', 'report', 'compliance'],
            roles: ['compliance']
        },
        {
            id: 'comp-tickets',
            type: 'navigation',
            title: 'Tickets',
            description: 'Fines & Penalties',
            path: '/compliance/tickets',
            icon: <FileText size={16} />,
            keywords: ['tickets', 'fines', 'penalties'],
            roles: ['compliance']
        },
        {
            id: 'comp-incidents',
            type: 'navigation',
            title: 'Incidents & Accidents',
            description: 'Reported incidents and accidents',
            path: '/compliance/incidents',
            icon: <ShieldCheck size={16} />,
            keywords: ['incidents', 'accidents', 'crash'],
            roles: ['compliance']
        },
        {
            id: 'comp-profile',
            type: 'navigation',
            title: 'Profile',
            description: 'View Profile',
            path: '/compliance/profile',
            icon: <UserCheck size={16} />,
            keywords: ['profile', 'user'],
            roles: ['compliance']
        },

        // Fleet Maintenance Specific Routes
        {
            id: 'fleet-dashboard',
            type: 'navigation',
            title: 'Fleet Dashboard',
            description: 'Go to Fleet Dashboard',
            path: '/fleetmaintenance',
            icon: <Truck size={16} />,
            keywords: ['fleet', 'dashboard', 'home'],
            roles: ['fleet']
        },
        {
            id: 'fleet-units',
            type: 'navigation',
            title: 'Fleets',
            description: 'Manage Fleet Units',
            path: '/fleetmaintenance/fleet-units',
            icon: <Truck size={16} />,
            keywords: ['fleet', 'units', 'trucks', 'vehicles'],
            roles: ['fleet']
        },
        {
            id: 'fleet-docs',
            type: 'navigation',
            title: 'Fleet Documents',
            description: 'View fleet documents',
            path: '/fleetmaintenance/vehicle-documents',
            icon: <FileText size={16} />,
            keywords: ['fleet', 'documents', 'files'],
            roles: ['fleet']
        },
        {
            id: 'fleet-scheduled',
            type: 'navigation',
            title: 'Scheduled Services',
            description: 'View scheduled services log',
            path: '/fleetmaintenance/scheduled-services-log',
            icon: <Wrench size={16} />,
            keywords: ['scheduled', 'service', 'maintenance', 'log'],
            roles: ['fleet']
        },
        {
            id: 'fleet-repairs',
            type: 'navigation',
            title: 'Maintenance Orders',
            description: 'View maintenance orders log',
            path: '/fleetmaintenance/maintenance-orders-log',
            icon: <Wrench size={16} />,
            keywords: ['repair', 'maintenance', 'fix', 'log'],
            roles: ['fleet']
        },
        {
            id: 'fleet-regulatory',
            type: 'navigation',
            title: 'Regulatory & Safety',
            description: 'Regulatory and safety compliance',
            path: '/fleetmaintenance/regulatory-safety',
            icon: <ShieldCheck size={16} />,
            keywords: ['regulatory', 'safety', 'compliance'],
            roles: ['fleet']
        },
        {
            id: 'fleet-parts',
            type: 'navigation',
            title: 'Spare Parts',
            description: 'Spare Parts Inventory',
            path: '/fleetmaintenance/spare-parts',
            icon: <Package size={16} />,
            keywords: ['parts', 'inventory', 'spare'],
            roles: ['fleet']
        },
        {
            id: 'fleet-fuel',
            type: 'navigation',
            title: 'Fuel Reports',
            description: 'View fuel reports',
            path: '/accounts/fuel-reports',
            icon: <DollarSign size={16} />,
            keywords: ['fuel', 'gas', 'diesel', 'report'],
            roles: ['fleet', 'accountant']
        },
        {
            id: 'fleet-invoices',
            type: 'navigation',
            title: 'Fleet Invoices',
            description: 'View fleet invoices',
            path: '/fleetmaintenance/invoices',
            icon: <FileText size={16} />,
            keywords: ['invoice', 'billing', 'fleet'],
            roles: ['fleet']
        },
        {
            id: 'fleet-truck-profile',
            type: 'navigation',
            title: 'Truck & Trailer Profile',
            description: 'View profiles',
            path: '/fleetmaintenance/truck-profile',
            icon: <Truck size={16} />,
            keywords: ['truck', 'trailer', 'profile'],
            roles: ['fleet']
        },
        {
            id: 'fleet-profile',
            type: 'navigation',
            title: 'Profile',
            description: 'View Profile',
            path: '/fleetmaintenance/profile',
            icon: <UserCheck size={16} />,
            keywords: ['profile', 'user'],
            roles: ['fleet']
        },

        // Dispatch Specific Routes
        {
            id: 'dispatch-dashboard',
            type: 'navigation',
            title: 'Dispatch Dashboard',
            description: 'Go to Dispatch Dashboard',
            path: '/dispatch/dashboard',
            icon: <Package size={16} />,
            keywords: ['dispatch', 'dashboard', 'home'],
            roles: ['dispatch']
        },
        {
            id: 'dispatch-orders',
            type: 'navigation',
            title: 'Order List',
            description: 'View order list',
            path: '/dispatch/order-list',
            icon: <FileText size={16} />,
            keywords: ['orders', 'list', 'dispatch'],
            roles: ['dispatch']
        },
        {
            id: 'dispatch-bulk',
            type: 'navigation',
            title: 'Bulk Order',
            description: 'Bulk order management',
            path: '/dispatch/bulk-order',
            icon: <Package size={16} />,
            keywords: ['bulk', 'order', 'dispatch'],
            roles: ['dispatch']
        },
        {
            id: 'dispatch-trips',
            type: 'navigation',
            title: 'Trips',
            description: 'View trips',
            path: '/dispatch/trips',
            icon: <Truck size={16} />,
            keywords: ['trips', 'delivery', 'route'],
            roles: ['dispatch']
        },
        {
            id: 'dispatch-scheduling',
            type: 'navigation',
            title: 'Trip Scheduling',
            description: 'Schedule trips',
            path: '/dispatch/scheduling',
            icon: <FileText size={16} />,
            keywords: ['scheduling', 'schedule', 'planning'],
            roles: ['dispatch']
        },
        {
            id: 'dispatch-drivers',
            type: 'navigation',
            title: 'Drivers',
            description: 'View drivers',
            path: '/dispatch/drivers',
            icon: <User size={16} />,
            keywords: ['drivers', 'staff', 'dispatch'],
            roles: ['dispatch']
        },
        {
            id: 'dispatch-fleets',
            type: 'navigation',
            title: 'Fleets',
            description: 'View fleets',
            path: '/dispatch/fleets',
            icon: <Truck size={16} />,
            keywords: ['fleets', 'vehicles', 'trucks'],
            roles: ['dispatch']
        },
        {
            id: 'dispatch-contacts',
            type: 'navigation',
            title: 'Contacts',
            description: 'View contacts',
            path: '/dispatch/contacts',
            icon: <UserCheck size={16} />,
            keywords: ['contacts', 'people', 'directory'],
            roles: ['dispatch']
        },
        {
            id: 'dispatch-places',
            type: 'navigation',
            title: 'Places',
            description: 'View places',
            path: '/dispatch/places',
            icon: <ShieldCheck size={16} />,
            keywords: ['places', 'locations', 'map'],
            roles: ['dispatch']
        },
        {
            id: 'dispatch-gps',
            type: 'navigation',
            title: 'GPS Dashboard',
            description: 'GPS Tracking Dashboard',
            path: '/gpsvehicle',
            icon: <Truck size={16} />,
            keywords: ['gps', 'tracking', 'vehicle', 'map', 'dashboard'],
            roles: ['dispatch']
        },
        {
            id: 'dispatch-gps-live',
            type: 'navigation',
            title: 'Live Tracking',
            description: 'Real-time vehicle tracking',
            path: '/gpsvehicle/livetracking/truck',
            icon: <Truck size={16} />,
            keywords: ['live', 'tracking', 'real-time', 'gps'],
            roles: ['dispatch']
        },
        {
            id: 'dispatch-gps-truck',
            type: 'navigation',
            title: 'Truck Tracking',
            description: 'Track trucks',
            path: '/gpsvehicle/livetracking/truck',
            icon: <Truck size={16} />,
            keywords: ['truck', 'tracking', 'gps'],
            roles: ['dispatch']
        },
        {
            id: 'dispatch-gps-trailer',
            type: 'navigation',
            title: 'Trailer Tracking',
            description: 'Track trailers',
            path: '/gpsvehicle/livetracking/trailer',
            icon: <Truck size={16} />,
            keywords: ['trailer', 'tracking', 'gps'],
            roles: ['dispatch']
        },
        {
            id: 'dispatch-gps-trip',
            type: 'navigation',
            title: 'Trip Tracking',
            description: 'Track active trips',
            path: '/gpsvehicle/livetracking/trip',
            icon: <Truck size={16} />,
            keywords: ['trip', 'tracking', 'gps', 'route'],
            roles: ['dispatch']
        },
        {
            id: 'dispatch-gps-fleets',
            type: 'navigation',
            title: 'GPS Fleets',
            description: 'View GPS fleets',
            path: '/gpsvehicle/vehicles',
            icon: <Truck size={16} />,
            keywords: ['gps', 'fleets', 'vehicles'],
            roles: ['dispatch']
        },
        {
            id: 'dispatch-gps-drivers',
            type: 'navigation',
            title: 'GPS Drivers',
            description: 'View GPS drivers',
            path: '/gpsvehicle/drivers',
            icon: <User size={16} />,
            keywords: ['gps', 'drivers', 'staff'],
            roles: ['dispatch']
        },

        // Safety Officer Actions
        {
            id: 'safety-summary',
            type: 'navigation',
            title: 'Health & Safety Summary',
            description: 'Safety Dashboard',
            path: '/healthandsafety/health-safety-summary',
            icon: <LayoutDashboard size={16} />,
            keywords: ['safety', 'dashboard', 'summary'],
            roles: ['safety']
        },
        {
            id: 'safety-incidents',
            type: 'navigation',
            title: 'Incidents & Accidents',
            description: 'Manage safety incidents',
            path: '/healthandsafety/incidents-accidents',
            icon: <AlertCircle size={16} />,
            keywords: ['safety', 'incidents', 'accidents', 'report'],
            roles: ['safety']
        },
        {
            id: 'safety-hazards',
            type: 'navigation',
            title: 'Hazards Management',
            description: 'Manage hazards',
            path: '/healthandsafety/inspections-hazards',
            icon: <AlertOctagon size={16} />,
            keywords: ['safety', 'hazards', 'risk', 'management'],
            roles: ['safety']
        },
        {
            id: 'safety-inspections',
            type: 'navigation',
            title: 'Safety Inspections',
            description: 'View safety inspections',
            path: '/healthandsafety/safety-inspections',
            icon: <FileCheck size={16} />,
            keywords: ['safety', 'inspections', 'check'],
            roles: ['safety']
        },
        {
            id: 'safety-training',
            type: 'navigation',
            title: 'Training & Certificates',
            description: 'Manage safety training',
            path: '/healthandsafety/training-certificates',
            icon: <FileText size={16} />,
            keywords: ['safety', 'training', 'certificates', 'education'],
            roles: ['safety']
        },
        {
            id: 'safety-policies',
            type: 'navigation',
            title: 'Policy & Documents',
            description: 'Safety policies',
            path: '/healthandsafety/policies-documents',
            icon: <FileText size={16} />,
            keywords: ['safety', 'policy', 'documents', 'rules'],
            roles: ['safety']
        },
        {
            id: 'safety-compliance',
            type: 'navigation',
            title: 'Compliance Records',
            description: 'View compliance records',
            path: '/healthandsafety/compliance-records',
            icon: <FileText size={16} />,
            keywords: ['safety', 'compliance', 'records'],
            roles: ['safety']
        },
        {
            id: 'safety-committee',
            type: 'navigation',
            title: 'H&S Committee',
            description: 'Safety committee & CAPA',
            path: '/healthandsafety/committee-capa',
            icon: <Users size={16} />,
            keywords: ['safety', 'committee', 'capa', 'meeting'],
            roles: ['safety']
        },
        {
            id: 'safety-trucking',
            type: 'navigation',
            title: 'Trucking Operations',
            description: 'Safety in trucking',
            path: '/healthandsafety/trucking-operations',
            icon: <Truck size={16} />,
            keywords: ['safety', 'trucking', 'operations'],
            roles: ['safety']
        },
        {
            id: 'safety-emergency',
            type: 'navigation',
            title: 'Emergency Procedures',
            description: 'Emergency protocols',
            path: '/healthandsafety/emergency-procedures',
            icon: <AlertCircle size={16} />,
            keywords: ['safety', 'emergency', 'procedures', '911'],
            roles: ['safety']
        },

        // HR Actions (HR only has access to Management portal)
        {
            id: 'hr-management-home',
            type: 'navigation',
            title: 'HR Dashboard',
            description: 'HR Management Home',
            path: '/Management',
            icon: <LayoutDashboard size={16} />,
            keywords: ['hr', 'dashboard', 'home', 'management'],
            roles: ['hr']
        },
        {
            id: 'hr-drivers',
            type: 'navigation',
            title: 'Drivers Management',
            description: 'Manage drivers',
            path: '/Management/drivers',
            icon: <Truck size={16} />,
            keywords: ['hr', 'drivers', 'staff'],
            roles: ['hr']
        },
        {
            id: 'hr-employees',
            type: 'navigation',
            title: 'Employees List',
            description: 'Manage employees',
            path: '/Management/employeelist',
            icon: <Users size={16} />,
            keywords: ['hr', 'employees', 'staff', 'list'],
            roles: ['hr']
        },
        {
            id: 'hr-documents',
            type: 'navigation',
            title: 'Employee Documents',
            description: 'Manage documents',
            path: '/Management/documents',
            icon: <FileText size={16} />,
            keywords: ['hr', 'documents', 'files', 'records'],
            roles: ['hr']
        },
        {
            id: 'hr-company-documents',
            type: 'navigation',
            title: 'Company Documents',
            description: 'View company docs',
            path: '/Management/company-documents',
            icon: <Briefcase size={16} />,
            keywords: ['hr', 'company', 'documents', 'policy'],
            roles: ['hr']
        },
        {
            id: 'hr-attendance',
            type: 'navigation',
            title: 'Attendance Tracking',
            description: 'Track attendance',
            path: '/Management/attendence',
            icon: <UserCheck size={16} />,
            keywords: ['hr', 'attendance', 'time', 'tracking'],
            roles: ['hr']
        },
        {
            id: 'hr-employee-profiles',
            type: 'navigation',
            title: 'Employee Portfolio',
            description: 'Employee profiles',
            path: '/Management/employee-profiles',
            icon: <User size={16} />,
            keywords: ['hr', 'profiles', 'portfolio', 'employee'],
            roles: ['hr']
        },
        {
            id: 'hr-driver-profiles',
            type: 'navigation',
            title: 'Driver Portfolio',
            description: 'Driver profiles',
            path: '/Management/driver-profiles',
            icon: <Truck size={16} />,
            keywords: ['hr', 'profiles', 'portfolio', 'driver'],
            roles: ['hr']
        },
        {
            id: 'hr-issues',
            type: 'navigation',
            title: 'Issues Management',
            description: 'Manage issues',
            path: '/Management/issues',
            icon: <AlertCircle size={16} />,
            keywords: ['hr', 'issues', 'problems', 'complaints'],
            roles: ['hr']
        },

        // Accounts Actions for Accountant Role
        {
            id: 'accountant-accounts-dashboard',
            type: 'navigation',
            title: 'Accounts Dashboard',
            description: 'Financial overview',
            path: '/accounts',
            icon: <DollarSign size={16} />,
            keywords: ['accountant', 'accounts', 'finance', 'dashboard'],
            roles: ['accountant']
        },
        {
            id: 'accountant-settlements',
            type: 'navigation',
            title: 'Settlements',
            description: 'Manage settlements',
            path: '/accounts/settlements',
            icon: <FileCheck size={16} />,
            keywords: ['accountant', 'accounts', 'settlements', 'payment'],
            roles: ['accountant']
        },
        {
            id: 'accountant-expenses',
            type: 'navigation',
            title: 'Expense Management',
            description: 'Manage expenses',
            path: '/accounts/expenses',
            icon: <DollarSign size={16} />,
            keywords: ['accountant', 'accounts', 'expenses', 'costs'],
            roles: ['accountant']
        },
        {
            id: 'accountant-invoicing',
            type: 'navigation',
            title: 'Invoicing',
            description: 'Manage invoices',
            path: '/accounts/invoice',
            icon: <FileText size={16} />,
            keywords: ['accountant', 'accounts', 'invoices', 'billing'],
            roles: ['accountant']
        },
        {
            id: 'accountant-payroll',
            type: 'navigation',
            title: 'Employees Payroll',
            description: 'Manage payroll',
            path: '/accounts/payroll',
            icon: <Users size={16} />,
            keywords: ['accountant', 'accounts', 'payroll', 'salary'],
            roles: ['accountant']
        },
        {
            id: 'accountant-driver-payroll',
            type: 'navigation',
            title: 'Driver Payroll',
            description: 'Driver payments',
            path: '/accounts/driverpayroll',
            icon: <Truck size={16} />,
            keywords: ['accountant', 'accounts', 'driver', 'payroll'],
            roles: ['accountant']
        },
        {
            id: 'accountant-fleet-finance',
            type: 'navigation',
            title: 'Fleet & Maint. Finance',
            description: 'Fleet financials',
            path: '/accounts/fleet-maintenance',
            icon: <Wrench size={16} />,
            keywords: ['accountant', 'accounts', 'fleet', 'maintenance', 'finance'],
            roles: ['accountant']
        },
        {
            id: 'accountant-receipts',
            type: 'navigation',
            title: 'Receipts & Notes',
            description: 'View receipts',
            path: '/accounts/receipts-notes',
            icon: <FileText size={16} />,
            keywords: ['accountant', 'accounts', 'receipts', 'notes'],
            roles: ['accountant']
        },
        {
            id: 'accountant-accounting-config',
            type: 'navigation',
            title: 'Accounting Config',
            description: 'Finance settings',
            path: '/accounts/config',
            icon: <Settings size={16} />,
            keywords: ['accountant', 'accounts', 'config', 'settings'],
            roles: ['accountant']
        },
        {
            id: 'accountant-cash-flow',
            type: 'navigation',
            title: 'Cash Flow Insights',
            description: 'Financial insights',
            path: '/accounts/cash-flow-insights',
            icon: <DollarSign size={16} />,
            keywords: ['accountant', 'accounts', 'cash', 'flow', 'insights'],
            roles: ['accountant']
        },
        {
            id: 'accountant-tax-setup',
            type: 'navigation',
            title: 'Tax Setup',
            description: 'Tax management',
            path: '/accounts/tax-setup',
            icon: <DollarSign size={16} />,
            keywords: ['accountant', 'accounts', 'tax', 'setup'],
            roles: ['accountant']
        },
        {
            id: 'dispatch-profile',
            type: 'navigation',
            title: 'Profile',
            description: 'View Profile',
            path: '/dispatch/profile',
            icon: <UserCheck size={16} />,
            keywords: ['profile', 'user'],
            roles: ['dispatch']
        },

        // Shared or Profile
        {
            id: 'goto-profile',
            type: 'navigation',
            title: 'Go to My Profile',
            description: 'View your profile',
            path: '/admin/profile', /* Note: Adjust path if HR has different profile path - handled in Profile click but good to have here if searchable */
            icon: <UserCheck size={16} />,
            keywords: ['profile', 'account', 'settings', 'user'],
            roles: ['admin', 'hr', 'compliance', 'fleet', 'dispatch']
        },

        // Create commands - Admin Only
        {
            id: 'create-load',
            type: 'create',
            title: 'Create New Load',
            description: 'Add a new delivery load',
            path: '/admin/dispatch/NewLoad',
            icon: <Plus size={16} />,
            keywords: ['create load', 'new load', 'add load'],
            roles: ['admin']
        },
        {
            id: 'create-driver',
            type: 'create',
            title: 'Create New Driver',
            description: 'Add a new driver',
            path: '/admin/Management/drivers',
            icon: <Plus size={16} />,
            keywords: ['create driver', 'new driver', 'add driver'],
            roles: ['admin']
        },
        {
            id: 'create-payroll',
            type: 'create',
            title: 'Create New Payroll',
            description: 'Generate payroll record',
            path: '/admin/accounts/payroll',
            icon: <Plus size={16} />,
            keywords: ['create payroll', 'new payroll', 'generate payroll'],
            roles: ['admin']
        },
        {
            id: 'create-invoice',
            type: 'create',
            title: 'Create New Invoice',
            description: 'Create invoice',
            path: '/admin/accounts/invoice',
            icon: <Plus size={16} />,
            keywords: ['create invoice', 'new invoice'],
            roles: ['admin']
        },
        {
            id: 'create-expense',
            type: 'create',
            title: 'Create New Expense',
            description: 'Record expense',
            path: '/admin/accounts/expenses',
            icon: <Plus size={16} />,
            keywords: ['create expense', 'new expense'],
            roles: ['admin']
        },
        // SuperAdmin Navigation
        {
            id: 'superadmin-dashboard',
            type: 'navigation',
            title: 'SuperAdmin Dashboard',
            description: 'View overview and statistics',
            path: '/superadmin/dashboard',
            icon: <LayoutDashboard size={16} />,
            keywords: ['dashboard', 'overview', 'statistics', 'superadmin'],
            roles: ['superadmin']
        },
        {
            id: 'superadmin-admin-accounts',
            type: 'navigation',
            title: 'Admin Accounts',
            description: 'View and manage all admin accounts',
            path: '/superadmin/viewalladmins',
            icon: <Users size={16} />,
            keywords: ['admin accounts', 'admins', 'users', 'accounts', 'manage admins'],
            roles: ['superadmin']
        },
        {
            id: 'superadmin-billing',
            type: 'navigation',
            title: 'Plan Management',
            description: 'Manage subscription plans and billing',
            path: '/superadmin/billing',
            icon: <CreditCard size={16} />,
            keywords: ['billing', 'plans', 'subscription', 'plan management', 'pricing'],
            roles: ['superadmin']
        },
        {
            id: 'superadmin-revenue',
            type: 'navigation',
            title: 'Revenue Generated',
            description: 'View revenue and financial reports',
            path: '/superadmin/revenue',
            icon: <BarChart3 size={16} />,
            keywords: ['revenue', 'financial', 'reports', 'money', 'income', 'earnings'],
            roles: ['superadmin']
        },
        {
            id: 'superadmin-settings',
            type: 'navigation',
            title: 'System Settings',
            description: 'Configure system settings',
            path: '/superadmin/systemsetting',
            icon: <Settings size={16} />,
            keywords: ['settings', 'system', 'configuration', 'preferences'],
            roles: ['superadmin']
        },
    ];

    const filterActions = (query: string, role: 'admin' | 'hr' | 'compliance' | 'fleet' | 'dispatch' | 'safety' | 'superadmin' | 'accountant' = 'admin'): QuickActionOption[] => {
        const searchQuery = query.toLowerCase();

        // For superadmin, only show superadmin actions
        if (role === 'superadmin') {
            return availableActions.filter(action => {
                // Only show actions with superadmin role
                if (!action.roles?.includes('superadmin')) {
                    return false;
                }

                return action.keywords.some(keyword => keyword.toLowerCase().includes(searchQuery)) ||
                    action.title.toLowerCase().includes(searchQuery) ||
                    action.description.toLowerCase().includes(searchQuery);
            });
        }

        // Ensure admin has access to all actions
        let actionsToFilter = availableActions;

        if (role === 'admin') {
            // For admin, we want to include all actions, but check if we need to adjust paths
            // Most sub-modules are mounted under /admin in AdminRoute.tsx
            // e.g. /Management -> /admin/Management
            // However, some actions already have /admin prefix (the original admin ones)

            actionsToFilter = availableActions.map(action => {
                // If it's an admin action, keep as is
                if (action.roles?.includes('admin')) return action;

                // Skip superadmin actions for regular admin
                if (action.roles?.includes('superadmin')) {
                    return null;
                }

                // If it's a module action (hr, dispatch, etc) and doesn't start with /admin
                // We need to prepend /admin (unless it's an absolute external URL or similar, but here they are internal)
                // BUT, we need to be careful. Let's look at the paths.
                // hr: /Management/drivers
                // dispatch: /dispatch/dashboard
                // These perfectly map to AdminRoute children: path="Management/*", path="dispatch/*"
                // So yes, we prepend /admin

                if (action.path && !action.path.startsWith('/admin')) {
                    return {
                        ...action,
                        path: `/admin${action.path}`
                    };
                }

                return action;
            }).filter(Boolean) as QuickActionOption[];
        }

        return actionsToFilter.filter(action => {
            // Filter by role - if admin, allow everything (we verified/mapped above)
            // If specific role, restrict
            if (role !== 'admin' && action.roles && !action.roles.includes(role)) {
                return false;
            }

            // Exclude superadmin actions (superadmin case already handled above)
            if (action.roles?.includes('superadmin')) {
                return false;
            }

            return action.keywords.some(keyword => keyword.toLowerCase().includes(searchQuery)) ||
                action.title.toLowerCase().includes(searchQuery) ||
                action.description.toLowerCase().includes(searchQuery);
        });
    };

    return {
        availableActions,
        filterActions
    };
};