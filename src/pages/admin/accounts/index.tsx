import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUserRole } from '../../../utils/auth';
import {
  DollarSign,
  TrendingUp,
  Users,
  Receipt,
  FileText,
  Calculator,
  BarChart3,
  Handshake,
  TrendingDown,
  CheckCircle2,
  CreditCard,
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
  UserCheck,
  UserX,
  Truck,
  Container,
  IdCard
} from 'lucide-react';

interface Invoice {
  _id: string;
  clientName?: string;
  clientCompany?: string;
  amount?: number | string;
  status?: string;
  dueDate?: string;
}

interface Expense {
  _id: string;
  type?: string;
  amount?: number | string;
  userId?: { name?: string };
  date?: string;
}

interface Payroll {
  _id: string;
  totalSalary?: number | string;
  userId?: {
    name?: string;
    role?: string;
  };
}

const Dashboard = () => {
  const navigate = useNavigate();
  const userRole = getUserRole();
  // Determine route prefix based on user role
  // Accountant and HR users access via /accounts/*, admin users via /admin/accounts/*
  const routePrefix = (userRole === 'hr' || userRole === 'accountant') ? '/accounts' : '/admin/accounts';

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [payrolls, setPayrolls] = useState<Payroll[]>([]);
  const [loading, setLoading] = useState(true);
  const [dashboardStats, setDashboardStats] = useState({
    totalRevenue: 0,
    totalExpenses: 0,
    totalPayroll: 0,
    netProfit: 0,
    paidInvoices: 0,
    unpaidOverdue: 0,
    employeePaid: 0,
    employeeUnpaid: 0,
    driverPaid: 0,
    driverUnpaid: 0,
    vendorPayment: 0,
    invoiceCount: 0,
    expenseCount: 0,
    payrollCount: 0,
    employeePaidCount: 0,
    employeeUnpaidCount: 0,
    driverPaidCount: 0,
    driverUnpaidCount: 0,
    fleetCounts: { drivers: 0, employees: 0, trucks: 0, trailers: 0 }
  });

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // Import your API functions
      const { listInvoices } = await import('../../../axios/api/account.invoices');
      const { listExpenses } = await import('../../../axios/api/account.expense');
      const { listPayrolls } = await import('../../../axios/api/account.payroll');
      const { getAccountsDashboard } = await import('../../../axios/api/account.dashboard');

      const [invoicesRes, expensesRes, payrollsRes, dashboardRes] = await Promise.all([
        listInvoices(),
        listExpenses(),
        listPayrolls(),
        getAccountsDashboard()
      ]);

      const invoicesData = invoicesRes?.success ? invoicesRes.data || [] : [];
      const expensesData = expensesRes?.success ? expensesRes.data || [] : [];
      const payrollsData = payrollsRes?.success ? payrollsRes.data || [] : [];

      setInvoices(invoicesData);
      setExpenses(expensesData);
      setPayrolls(payrollsData);

      // Set dashboard statistics from API
      if (dashboardRes?.success && dashboardRes.data) {
        const apiData = dashboardRes.data;
        setDashboardStats({
          totalRevenue: apiData.totalRevenue ?? 0,
          totalExpenses: apiData.totalExpenses ?? 0,
          totalPayroll: apiData.totalPayroll ?? 0,
          netProfit: apiData.netProfit ?? 0,
          paidInvoices: apiData.paidInvoices ?? 0,
          unpaidOverdue: apiData.unpaidOverdue ?? 0,
          employeePaid: apiData.employeePaid ?? 0,
          employeeUnpaid: apiData.employeeUnpaid ?? 0,
          driverPaid: apiData.driverPaid ?? 0,
          driverUnpaid: apiData.driverUnpaid ?? 0,
          vendorPayment: apiData.vendorPayment ?? 0,
          invoiceCount: apiData.invoiceCount ?? invoicesData.length,
          expenseCount: apiData.expenseCount ?? expensesData.length,
          payrollCount: apiData.payrollCount ?? apiData.employeePayrollCount ?? 0,
          employeePaidCount: apiData.employeePaidCount ?? 0,
          employeeUnpaidCount: apiData.employeeUnpaidCount ?? 0,
          driverPaidCount: apiData.driverPaidCount ?? 0,
          driverUnpaidCount: apiData.driverUnpaidCount ?? 0,
          fleetCounts: apiData.fleetCounts ?? { drivers: 0, employees: 0, trucks: 0, trailers: 0 },
        });
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setInvoices([]);
      setExpenses([]);
      setPayrolls([]);
    } finally {
      setLoading(false);
    }
  };

  const normalizeAmount = (value?: number | string) => {
    const numeric = typeof value === 'string' ? parseFloat(value) : value;
    return Number.isFinite(numeric) ? Number(numeric) : 0;
  };

  // Use API data if available, otherwise calculate from local data
  const totalRevenue = dashboardStats.totalRevenue || invoices.reduce((sum, inv) => sum + normalizeAmount(inv.amount), 0);
  const pendingRevenue = invoices
    .filter((inv) => inv.status === 'pending')
    .reduce((sum, inv) => sum + normalizeAmount(inv.amount), 0);
  const totalExpenses = dashboardStats.totalExpenses || expenses.reduce((sum, exp) => sum + normalizeAmount(exp.amount), 0);
  const totalPayroll = dashboardStats.totalPayroll || payrolls.reduce((sum, payroll) => sum + normalizeAmount(payroll.totalSalary), 0);
  const netProfit = dashboardStats.netProfit || (totalRevenue - totalExpenses - totalPayroll);

  // Row 1: Total Revenue, Total Expenses, Net Profit
  const row1Cards = [
    {
      id: 'revenue',
      title: 'Total Revenue',
      value: `$${totalRevenue.toLocaleString()}`,
      subtitle: `${dashboardStats.invoiceCount} invoices`,
      icon: DollarSign,
      bgColor: 'bg-[rgba(0,255,163,0.1)]',
      iconColor: 'text-[var(--accent-green)]',
      cardBg: 'bg-card'
    },
    {
      id: 'expenses',
      title: 'Total Expenses',
      value: `$${totalExpenses.toLocaleString()}`,
      subtitle: `${dashboardStats.expenseCount} transactions`,
      icon: TrendingDown,
      bgColor: 'bg-[rgba(244,63,94,0.1)]',
      iconColor: 'text-[var(--accent-red)]',
      cardBg: 'bg-card'
    },
    {
      id: 'profit',
      title: 'Net Profit',
      value: `$${netProfit.toLocaleString()}`,
      subtitle: 'Revenue - Expenses - Payroll',
      icon: TrendingUp,
      bgColor: 'bg-[rgba(168,85,247,0.1)]',
      iconColor: 'text-[var(--accent-purple)]',
      cardBg: 'bg-card'
    }
  ];

  // Row 2: Total Payroll, Paid Invoices, Unpaid Invoices
  const row2Cards = [
    {
      id: 'payroll',
      title: 'Total Payroll',
      value: `$${totalPayroll.toLocaleString()}`,
      subtitle: `${dashboardStats.payrollCount} employees`,
      icon: Users,
      bgColor: '',
      iconColor: 'text-[var(--accent-blue)]',
      cardBg: 'bg-card'
    },
    {
      id: 'paid-invoices',
      title: 'Paid Invoices',
      value: `$${dashboardStats.paidInvoices.toLocaleString()}`,
      subtitle: 'Total paid amount',
      icon: CheckCircle,
      bgColor: 'bg-[rgba(0,255,163,0.1)]',
      iconColor: 'text-[var(--accent-green)]',
      cardBg: 'bg-card'
    },
    {
      id: 'unpaid-overdue',
      title: 'Unpaid Invoices',
      value: `$${dashboardStats.unpaidOverdue.toLocaleString()}`,
      subtitle: 'Overdue payments',
      icon: XCircle,
      bgColor: 'bg-[rgba(244,63,94,0.1)]',
      iconColor: 'text-[var(--accent-red)]',
      cardBg: 'bg-card'
    }
  ];

  // Row 3: Employee Paid & Unpaid (Combined)
  const row3Cards = [
    {
      id: 'employees',
      title: 'Employees',
      paidCount: dashboardStats.employeePaidCount,
      unpaidCount: dashboardStats.employeeUnpaidCount,
      totalCount: dashboardStats.employeePaidCount + dashboardStats.employeeUnpaidCount,
      icon: Users,
      bgColor: '',
      iconColor: 'text-[var(--accent-blue)]',
      cardBg: 'bg-card'
    }
  ];

  // Row 4: Driver Paid & Unpaid (Combined)
  const row4Cards = [
    {
      id: 'drivers',
      title: 'Drivers',
      paidCount: dashboardStats.driverPaidCount,
      unpaidCount: dashboardStats.driverUnpaidCount,
      totalCount: dashboardStats.driverPaidCount + dashboardStats.driverUnpaidCount,
      icon: Truck,
      bgColor: '',
      iconColor: 'text-[var(--accent-navyblue)]',
      cardBg: 'bg-card'
    }
  ];

  // Row 5: Fleet & Staff totals (Drivers, Employees, Trucks, Trailers)
  const fleetCards = [
    {
      id: 'fleet-drivers',
      title: 'Drivers',
      value: dashboardStats.fleetCounts.drivers,
      subtitle: 'Total drivers',
      icon: IdCard,
      iconColor: 'text-[var(--accent-navyblue)]',
      path: `${routePrefix}/driverpayroll`
    },
    {
      id: 'fleet-employees',
      title: 'Employees',
      value: dashboardStats.fleetCounts.employees,
      subtitle: 'Total employees',
      icon: Users,
      iconColor: 'text-[var(--accent-blue)]',
      path: `${routePrefix}/payroll`
    },
    {
      id: 'fleet-trucks',
      title: 'Trucks',
      value: dashboardStats.fleetCounts.trucks,
      subtitle: 'Total trucks',
      icon: Truck,
      iconColor: 'text-[var(--accent-green)]',
      path: `${routePrefix}/fleet-maintenance`
    },
    {
      id: 'fleet-trailers',
      title: 'Trailers',
      value: dashboardStats.fleetCounts.trailers,
      subtitle: 'Total trailers',
      icon: Container,
      iconColor: 'text-[var(--accent-purple)]',
      path: `${routePrefix}/fleet-maintenance`
    }
  ];

  const quickActions = [
    {
      id: 'settlements',
      title: 'Settlements',
      subtitle: 'Driver & operator pay',
      value: payrolls.filter(p => p.userId?.role === 'driver').length,
      icon: Handshake,
      bgColor: '',
      iconColor: 'text-[var(--accent-green)]',
      path: `${routePrefix}/settlements`
    },
    {
      id: 'expenses',
      title: 'Expenses',
      subtitle: `${expenses.length} transactions`,
      value: `$${totalExpenses.toLocaleString()}`,
      icon: Receipt,
      bgColor: '',
      iconColor: 'text-[var(--accent-red)]',
      path: `${routePrefix}/expenses`
    },
    {
      id: 'invoices',
      title: 'Invoices',
      subtitle: `${invoices.filter(inv => inv.status === 'pending').length} pending`,
      value: invoices.length,
      icon: FileText,
      bgColor: '',
      iconColor: 'text-[var(--accent-orange)]',
      path: `${routePrefix}/invoice`
    },
    {
      id: 'payroll',
      title: 'Payroll',
      subtitle: 'Employees',
      value: payrolls.length,
      icon: Users,
      bgColor: '',
      iconColor: 'text-[var(--accent-amber)]',
      path: `${routePrefix}/payroll`
    },
    {
      id: 'driver-payroll',
      title: 'Driver Payroll',
      subtitle: 'Active drivers',
      value: payrolls.filter(p => p.userId?.role === 'driver').length,
      icon: Users,
      bgColor: '',
      iconColor: 'text-[var(--accent-blue)]',
      path: `${routePrefix}/driverpayroll`
    },
    {
      id: 'paystubs',
      title: 'Gross Payroll',
      subtitle: 'View all paystubs',
      value: '—',
      icon: FileText,
      bgColor: '',
      iconColor: 'text-[var(--accent-indigo)]',
      path: `${routePrefix}/paystubs`
    },
    {
      id: 'config',
      title: 'Accounting Config',
      subtitle: 'Chart of accounts',
      value: '—',
      icon: BarChart3,
      bgColor: '',
      iconColor: 'text-[var(--accent-purple)]',
      path: `${routePrefix}/config`
    }
  ];

  if (loading) {
    return (
      <div className="min-h-screen p-4 bg-main px-6 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-[var(--accent-blue)]"></div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-main" >
        <div className="relative w-full mx-auto p-2">
          {/* Gradient band */}
          <div
            className="absolute inset-x-0 top-0"

            aria-hidden="true"
          />

          {/* Main content */}
          <div className="relative z-10 px-4 pt-3 pb-6">
            {/* Header Section */}
            <div className="mb-4 relative z-10">
              <div className="flex items-center justify-between">
                <h1 className="text-lg font-semibold text-[var(--text-primary)]">Accounts Management</h1>
                <span className="text-xs text-secondary">Financial Overview</span>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="space-y-3 -mt-2 mb-4">
              {/* Row 1: Total Revenue, Total Expenses, Net Profit */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {row1Cards.map((feature) => {
                  const Icon = feature.icon;
                  return (
                    <div
                      key={feature.id}
                      onClick={() => {
                        if (feature.id === 'revenue' || feature.id === 'profit') {
                          navigate(`${routePrefix}/invoice`);
                        } else if (feature.id === 'expenses') {
                          navigate(`${routePrefix}/expenses`);
                        }
                      }}
                      className={`${feature.cardBg} rounded-lg p-3 shadow-sm hover:shadow-md transition-all cursor-pointer border border-[rgba(255,255,255,0.04)] hover:border-[rgba(0,209,255,0.15)] hover:scale-[1.02] active:scale-[0.98]`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <p className="text-xs text-secondary font-medium mb-1 uppercase tracking-wide">{feature.title}</p>
                          <span className="text-xl font-bold text-[var(--text-primary)]">{feature.value}</span>
                          <p className="text-xs text-secondary mt-1">{feature.subtitle}</p>
                        </div>
                        <div className={`${feature.bgColor} rounded-lg p-2`}>
                          <Icon className={feature.iconColor} size={20} strokeWidth={1.8} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Row 2: Total Payroll, Paid Invoices, Unpaid Invoices */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {row2Cards.map((feature) => {
                  const Icon = feature.icon;
                  return (
                    <div
                      key={feature.id}
                      onClick={() => {
                        if (feature.id === 'paid-invoices' || feature.id === 'unpaid-overdue') {
                          navigate(`${routePrefix}/invoice`);
                        } else if (feature.id === 'payroll') {
                          navigate(`${routePrefix}/payroll`);
                        }
                      }}
                      className={`${feature.cardBg} rounded-lg p-3 shadow-sm hover:shadow-md transition-all cursor-pointer border border-[rgba(255,255,255,0.04)] hover:border-[rgba(0,209,255,0.15)] hover:scale-[1.02] active:scale-[0.98]`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <p className="text-xs text-secondary font-medium mb-1 uppercase tracking-wide">{feature.title}</p>
                          <span className="text-xl font-bold text-[var(--text-primary)]">{feature.value}</span>
                          <p className="text-xs text-secondary mt-1">{feature.subtitle}</p>
                        </div>
                        <div className={`${feature.bgColor} rounded-lg p-2`}>
                          <Icon className={feature.iconColor} size={20} strokeWidth={1.8} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Row 3: Employees & Drivers (Paid & Unpaid Combined) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Employees Card */}
                {row3Cards.map((feature) => {
                  const Icon = feature.icon;
                  return (
                    <div
                      key={feature.id}
                      onClick={() => navigate(`${routePrefix}/payroll`)}
                      className={`${feature.cardBg} rounded-lg p-3 shadow-sm hover:shadow-md transition-all cursor-pointer border border-[rgba(255,255,255,0.04)] hover:border-[rgba(0,209,255,0.15)] hover:scale-[1.02] active:scale-[0.98]`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <p className="text-xs text-secondary font-medium mb-2 uppercase tracking-wide">{feature.title}</p>
                          <div className="flex items-center gap-5 mb-1">
                            <div className="flex items-center gap-2">
                              <UserCheck className="text-[var(--accent-green)]" size={16} />
                              <div>
                                <span className="text-lg font-bold text-[var(--text-primary)]">{feature.paidCount}</span>
                                <p className="text-xs text-secondary">Paid</p>
                              </div>
                            </div>
                            <div className="w-px h-8 bg-[rgba(255,255,255,0.06)]" />
                            <div className="flex items-center gap-2">
                              <UserX className="text-[var(--accent-amber)]" size={16} />
                              <div>
                                <span className="text-lg font-bold text-[var(--text-primary)]">{feature.unpaidCount}</span>
                                <p className="text-xs text-secondary">Unpaid</p>
                              </div>
                            </div>
                          </div>
                          <p className="text-xs text-secondary">Total: {feature.totalCount} employees</p>
                        </div>
                        <div className="rounded-lg p-2">
                          <Icon className={feature.iconColor} size={20} strokeWidth={1.8} />
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Drivers Card */}
                {row4Cards.map((feature) => {
                  const Icon = feature.icon;
                  return (
                    <div
                      key={feature.id}
                      onClick={() => navigate(`${routePrefix}/driverpayroll`)}
                      className={`${feature.cardBg} rounded-lg p-3 shadow-sm hover:shadow-md transition-all cursor-pointer border border-[rgba(255,255,255,0.04)] hover:border-[rgba(0,209,255,0.15)] hover:scale-[1.02] active:scale-[0.98]`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <p className="text-xs text-secondary font-medium mb-2 uppercase tracking-wide">{feature.title}</p>
                          <div className="flex items-center gap-5 mb-1">
                            <div className="flex items-center gap-2">
                              <CheckCircle className="text-[var(--accent-green)]" size={16} />
                              <div>
                                <span className="text-lg font-bold text-[var(--text-primary)]">{feature.paidCount}</span>
                                <p className="text-xs text-secondary">Paid</p>
                              </div>
                            </div>
                            <div className="w-px h-8 bg-[rgba(255,255,255,0.06)]" />
                            <div className="flex items-center gap-2">
                              <Clock className="text-[var(--accent-amber)]" size={16} />
                              <div>
                                <span className="text-lg font-bold text-[var(--text-primary)]">{feature.unpaidCount}</span>
                                <p className="text-xs text-secondary">Unpaid</p>
                              </div>
                            </div>
                          </div>
                          <p className="text-xs text-secondary">Total: {feature.totalCount} drivers</p>
                        </div>
                        <div className="rounded-lg p-2">
                          <Icon className={feature.iconColor} size={20} strokeWidth={1.8} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Row 5: Fleet & Staff Totals */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {fleetCards.map((card) => {
                  const Icon = card.icon;
                  return (
                    <div
                      key={card.id}
                      onClick={() => navigate(card.path)}
                      className="bg-card rounded-lg p-3 shadow-sm hover:shadow-md transition-all cursor-pointer border border-[rgba(255,255,255,0.04)] hover:border-[rgba(0,209,255,0.15)] hover:scale-[1.02] active:scale-[0.98]"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <p className="text-xs text-secondary font-medium mb-1 uppercase tracking-wide">{card.title}</p>
                          <span className="text-xl font-bold text-[var(--text-primary)]">{card.value}</span>
                          <p className="text-xs text-secondary mt-1">{card.subtitle}</p>
                        </div>
                        <div className="rounded-lg p-2">
                          <Icon className={card.iconColor} size={20} strokeWidth={1.8} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Quick Actions Section */}
            <div className="bg-card rounded-lg shadow-sm border border-theme overflow-hidden p-6 mb-4">
              <h2 className="text-sm font-semibold text-secondary uppercase tracking-widest mb-4">Quick Actions & Modules</h2>

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-4">
                {quickActions.map((action) => {
                  const Icon = action.icon;
                  return (
                    <div
                      key={action.id}
                      onClick={() => navigate(action.path)}
                      className="group p-4 rounded-xl border border-[rgba(255,255,255,0.04)] hover:border-[rgba(0,209,255,0.15)] bg-[var(--bg-card-light)] hover:bg-[rgba(0,209,255,0.04)] transition-all cursor-pointer"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="p-2 rounded-lg bg-[rgba(255,255,255,0.04)] group-hover:bg-[rgba(0,209,255,0.08)] transition-colors">
                          <Icon className={`h-4 w-4 ${action.iconColor}`} />
                        </div>
                        <span className="text-base font-bold text-[var(--text-primary)]">
                          {action.value}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-[var(--text-primary)]">{action.title}</p>
                      <p className="text-xs text-secondary mt-0.5">{action.subtitle}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Module Highlights */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
              {/* Settlement Module */}
              <div className="bg-card rounded-lg shadow-sm border border-[rgba(255,255,255,0.04)] overflow-hidden">
                <div className="p-4 border-b border-[rgba(255,255,255,0.04)]">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-[rgba(0,209,255,0.08)] rounded-lg">
                        <Calculator className="text-[var(--accent-blue)]" size={18} />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-[var(--text-primary)]">Settlement Module</h3>
                        <p className="text-xs text-secondary">Driver & Owner-Operator Pay</p>
                      </div>
                    </div>
                    <button
                      onClick={() => navigate(`${routePrefix}/settlements`)}
                      className="px-3 py-1.5 border border-[rgba(0,209,255,0.2)] text-[var(--accent-blue)] hover:bg-[rgba(0,209,255,0.08)] rounded-lg text-xs font-medium transition-all"
                    >
                      View →
                    </button>
                  </div>
                </div>
                <div className="p-4">
                  <div className="space-y-2">
                    <div className="flex items-start gap-2 p-2 bg-[rgba(255,255,255,0.02)] rounded-lg">
                      <CheckCircle2 className="text-[var(--accent-green)] mt-0.5 shrink-0" size={14} />
                      <div>
                        <p className="text-xs font-medium text-[var(--text-primary)]">Trip-wise Calculations</p>
                        <p className="text-xs text-secondary">Miles, Rate, FSC, Accessorials</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2 p-2 bg-[rgba(255,255,255,0.02)] rounded-lg">
                      <CheckCircle2 className="text-[var(--accent-green)] mt-0.5 shrink-0" size={14} />
                      <div>
                        <p className="text-xs font-medium text-[var(--text-primary)]">Auto-Generated</p>
                        <p className="text-xs text-secondary">Ready-to-approve settlement sheets</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Expense Management */}
              <div className="bg-card rounded-lg shadow-sm border border-[rgba(255,255,255,0.04)] overflow-hidden">
                <div className="p-4 border-b border-[rgba(255,255,255,0.04)]">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-[rgba(244,63,94,0.08)] rounded-lg">
                        <Receipt className="text-[var(--accent-red)]" size={18} />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-[var(--text-primary)]">Expense Management</h3>
                        <p className="text-xs text-secondary">Track All Company Expenses</p>
                      </div>
                    </div>
                    <button
                      onClick={() => navigate(`${routePrefix}/expenses`)}
                      className="px-3 py-1.5 border border-[rgba(0,209,255,0.2)] text-[var(--accent-blue)] hover:bg-[rgba(0,209,255,0.08)] rounded-lg text-xs font-medium transition-all"
                    >
                      View →
                    </button>
                  </div>
                </div>
                <div className="p-4">
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <div className="p-2 bg-[rgba(255,255,255,0.02)] rounded-lg border border-[rgba(245,158,11,0.15)]">
                      <CreditCard className="text-[var(--accent-orange)] mb-1" size={14} />
                      <p className="text-xs font-medium text-[var(--text-primary)]">Fuel Receipts</p>
                    </div>
                    <div className="p-2 bg-[rgba(255,255,255,0.02)] rounded-lg border border-[rgba(0,209,255,0.15)]">
                      <FileText className="text-[var(--accent-blue)] mb-1" size={14} />
                      <p className="text-xs font-medium text-[var(--text-primary)]">Repairs</p>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-xs text-secondary">
                      <CheckCircle2 className="text-[var(--accent-green)] shrink-0" size={13} />
                      <span>Upload receipts with images</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-secondary">
                      <CheckCircle2 className="text-[var(--accent-green)] shrink-0" size={13} />
                      <span>Auto-reflect in P&L & settlements</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Alerts */}
            {pendingRevenue > 0 && (
              <div className="bg-card rounded-lg shadow-sm border border-[rgba(255,255,255,0.04)] p-4">
                <h3 className="text-xs font-semibold text-secondary uppercase tracking-widest mb-3">Alerts & Notifications</h3>
                <div
                  onClick={() => navigate(`${routePrefix}/invoice`)}
                  className="flex items-center p-3 bg-[rgba(255,255,255,0.02)] border border-[rgba(251,191,36,0.2)] rounded-lg cursor-pointer hover:bg-[rgba(251,191,36,0.05)] transition-colors"
                >
                  <AlertCircle className="text-[var(--accent-amber)] mr-3 shrink-0" size={18} />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-[var(--text-primary)]">Pending Invoices</p>
                    <p className="text-xs text-secondary mt-0.5">${pendingRevenue.toLocaleString()} in pending payments</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default Dashboard;