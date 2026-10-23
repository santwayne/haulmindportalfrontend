import { useState, useEffect, useRef } from 'react';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Truck,
  MapPin,
  Calendar,
  FileText,
  Receipt,
  Users,
  BarChart3,
  PieChart,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
  Fuel,
  Search,
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Clock,
  CreditCard,
  RefreshCw,
  IdCard
} from 'lucide-react';
import { getFinanceReport } from '../../../../axios/api/account.financeReport';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  Legend
} from 'recharts';

type TimePeriod = '2weeks' | '1month' | 'monthly' | 'quarterly' | 'half-yearly' | 'yearly';
type ViewType = 'overview' | 'trucks' | 'trips' | 'payable';

type PayableSubCategory = 'all' | 'expense' | 'employee-payroll' | 'driver-payroll' | 'fuel' | 'fleet-invoice';

interface PayableItem {
  id: string;
  subCategory: Exclude<PayableSubCategory, 'all'>;
  description: string;
  reference: string;
  amount: number;
  date: string;
  status: string;
}

type PayableSortKey = 'date' | 'amount' | 'subCategory' | 'status';
type PayableSortDir = 'asc' | 'desc';

interface TruckFinancialData {
  id: string;
  truckNumber: string;
  revenue: number;
  expenses: number;
  payroll: number;
  netProfit: number;
  trips: number;
  miles: number;
  fuelCost: number;
  fleetInvoiceCost: number;
}

interface TripFinancialData {
  id: string;
  tripNumber: string;
  truckNumber: string;
  truckId?: string;
  driverName?: string;
  origin: string;
  destination: string;
  revenue: number;
  expenses: number;
  fuelCost?: number;
  driverPay: number;
  netProfit: number;
  date: string;
  status: 'completed' | 'in-progress' | 'pending';
  totalMiles?: number;
  startDate?: string;
  endDate?: string;
}

interface TimeBasedReport {
  period: string;
  revenue: number;
  expenses: number;
  payroll: number;
  invoices: number;
  netProfit: number;
  invoiceCount: number;
  expenseCount: number;
  payrollCount: number;
}

const FinanceReport = () => {
  const [activeView, setActiveView] = useState<ViewType>('overview');
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('monthly');
  const [loading, setLoading] = useState(true);
  const [dataLoaded, setDataLoaded] = useState(false); // Track if we've loaded data from backend
  const [overview, setOverview] = useState({
    totalRevenue: 0,
    totalExpenses: 0,
    totalPayroll: 0,
    netProfit: 0,
    totalTrips: 0,
    activeTrucks: 0
  });
  const [invoiceSummary, setInvoiceSummary] = useState({
    paidInvoices: 0,
    pendingInvoices: 0,
    overdueInvoices: 0
  });
  const [expenseBreakdown, setExpenseBreakdown] = useState({
    fuelCosts: 0,
    fleetInvoices: 0,
    otherExpenses: 0
  });
  const [truckFinancialData, setTruckFinancialData] = useState<TruckFinancialData[]>([]);
  const [tripFinancialData, setTripFinancialData] = useState<TripFinancialData[]>([]);
  const [timeBasedData, setTimeBasedData] = useState<TimeBasedReport[]>([]);

  // ── Payable tab state ──
  const [payableItems, setPayableItems] = useState<PayableItem[]>([]);
  const [payableLoading, setPayableLoading] = useState(false);
  const [payableLoaded, setPayableLoaded] = useState(false);
  const [payableSubFilter, setPayableSubFilter] = useState<PayableSubCategory>('all');
  const [payableSearch, setPayableSearch] = useState('');
  const [payableStatusFilter, setPayableStatusFilter] = useState('all');
  const [payableSortKey, setPayableSortKey] = useState<PayableSortKey>('date');
  const [payableSortDir, setPayableSortDir] = useState<PayableSortDir>('desc');
  const [payablePage, setPayablePage] = useState(1);
  const PAYABLE_PAGE_SIZE = 15;

  const topScrollRef = useRef<HTMLDivElement>(null);
  const bottomScrollRef = useRef<HTMLDivElement>(null);

  // Synchronize scrollbars for trip-wise table
  useEffect(() => {
    const topScroll = topScrollRef.current;
    const bottomScroll = bottomScrollRef.current;

    if (!topScroll || !bottomScroll) return;

    const handleTopScroll = () => {
      if (bottomScroll) {
        bottomScroll.scrollLeft = topScroll.scrollLeft;
      }
    };

    const handleBottomScroll = () => {
      if (topScroll) {
        topScroll.scrollLeft = bottomScroll.scrollLeft;
      }
    };

    topScroll.addEventListener('scroll', handleTopScroll);
    bottomScroll.addEventListener('scroll', handleBottomScroll);

    // Set the width of top scrollbar content to match table width
    const updateScrollWidth = () => {
      const table = bottomScroll.querySelector('table');
      const scrollContent = topScroll.querySelector('.top-scroll-content');
      if (table && scrollContent) {
        (scrollContent as HTMLElement).style.width = `${table.scrollWidth}px`;
      }
    };

    updateScrollWidth();

    // Update scroll width when window resizes or data changes
    const resizeObserver = new ResizeObserver(updateScrollWidth);
    if (bottomScroll) resizeObserver.observe(bottomScroll);

    return () => {
      topScroll.removeEventListener('scroll', handleTopScroll);
      bottomScroll.removeEventListener('scroll', handleBottomScroll);
      resizeObserver.disconnect();
    };
  }, [activeView, tripFinancialData]);

  // Fetch finance report data on initial mount
  useEffect(() => {
    console.log('📊 [useEffect] Initial mount - fetching finance report data');
    fetchFinanceReport();
  }, []); // Empty dependency array - only run on mount

  // Fetch finance report data when timePeriod changes
  useEffect(() => {
    if (dataLoaded) { // Only refetch if we've already loaded data once
      console.log('📊 [useEffect] Period changed - fetching data for period:', timePeriod);
      fetchFinanceReport();
    }
  }, [timePeriod]);

  // Also fetch when switching to time-based view
  useEffect(() => {
    if ((activeView as string) === 'time-based' && dataLoaded) {
      console.log('📊 [useEffect] Switched to time-based view, fetching data');
      fetchFinanceReport();
    }
  }, [activeView]);

  // Fetch payable data on first switch to payable tab
  useEffect(() => {
    if (activeView === 'payable' && !payableLoaded) {
      fetchPayableData();
    }
  }, [activeView]);

  const fetchFinanceReport = async () => {
    setLoading(true);
    try {
      console.log('📊 [Finance Report Frontend] Calling API with period:', timePeriod);
      const response = await getFinanceReport({ period: timePeriod });

      console.log('📊 [Finance Report Frontend] API Response:', {
        success: response?.success,
        hasData: !!response?.data,
        hasOverview: !!response?.data?.overview,
        overview: response?.data?.overview,
        truckWiseCount: response?.data?.truckWise?.length || 0,
        tripWiseCount: response?.data?.tripWise?.length || 0,
        timeBasedCount: response?.data?.timeBased?.length || 0,
        fullResponse: response
      });

      if (response?.success && response?.data) {
        console.log('📊 [Finance Report Frontend] Full response data:', {
          overview: response.data.overview,
          truckWiseCount: response.data.truckWise?.length || 0,
          tripWiseCount: response.data.tripWise?.length || 0,
          timeBasedCount: response.data.timeBased?.length || 0
        });

        // Set overview data - ensure we use the backend data even if it's 0
        if (response.data.overview) {
          const overviewData = {
            totalRevenue: Number(response.data.overview.totalRevenue) || 0,
            totalExpenses: Number(response.data.overview.totalExpenses) || 0,
            totalPayroll: Number(response.data.overview.totalPayroll) || 0,
            netProfit: Number(response.data.overview.netProfit) || 0,
            totalTrips: Number(response.data.overview.totalTrips) || 0,
            activeTrucks: Number(response.data.overview.activeTrucks) || 0
          };
          console.log('📊 [Finance Report Frontend] Setting overview:', overviewData);
          setOverview(overviewData);
        } else {
          console.warn('📊 [Finance Report Frontend] No overview data in response');
        }

        // Set invoice summary data
        if (response.data.invoiceSummary) {
          const invoiceSummaryData = {
            paidInvoices: Number(response.data.invoiceSummary.paidInvoices) || 0,
            pendingInvoices: Number(response.data.invoiceSummary.pendingInvoices) || 0,
            overdueInvoices: Number(response.data.invoiceSummary.overdueInvoices) || 0
          };
          console.log('📊 [Finance Report Frontend] Setting invoice summary:', invoiceSummaryData);
          setInvoiceSummary(invoiceSummaryData);
        } else {
          console.warn('📊 [Finance Report Frontend] No invoice summary data in response');
          setInvoiceSummary({ paidInvoices: 0, pendingInvoices: 0, overdueInvoices: 0 });
        }

        // Set expense breakdown data
        if (response.data.expenseBreakdown) {
          const expenseBreakdownData = {
            fuelCosts: Number(response.data.expenseBreakdown.fuelCosts) || 0,
            fleetInvoices: Number(response.data.expenseBreakdown.fleetInvoices) || 0,
            otherExpenses: Number(response.data.expenseBreakdown.otherExpenses) || 0
          };
          console.log('📊 [Finance Report Frontend] Setting expense breakdown:', expenseBreakdownData);
          setExpenseBreakdown(expenseBreakdownData);
        } else {
          console.warn('📊 [Finance Report Frontend] No expense breakdown data in response');
          setExpenseBreakdown({ fuelCosts: 0, fleetInvoices: 0, otherExpenses: 0 });
        }

        setTruckFinancialData(response.data.truckWise || []);
        setTripFinancialData(response.data.tripWise || []);
        // Always set timeBasedData, even if empty array, to avoid using static fallback
        setTimeBasedData(response.data.timeBased || []);
        setDataLoaded(true); // Mark that we've loaded data from backend
      } else {
        console.error('📊 [Finance Report Frontend] API response not successful:', {
          success: response?.success,
          message: response?.message,
          data: response?.data
        });
        setDataLoaded(true); // Mark as loaded even on error to avoid static fallback
      }
    } catch (error: any) {
      console.error('📊 [Finance Report Frontend] Error fetching finance report:', {
        error,
        message: error?.message,
        response: error?.response,
        status: error?.response?.status,
        data: error?.response?.data
      });
      setDataLoaded(true); // Mark as loaded even on error to avoid static fallback
    } finally {
      setLoading(false);
    }
  };

  const toNum = (v: unknown): number => {
    const n = typeof v === 'string' ? parseFloat(v as string) : Number(v);
    return isNaN(n) ? 0 : n;
  };

  const toIso = (v: unknown): string => {
    if (!v) return new Date().toISOString();
    const d = new Date(v as string);
    return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
  };

  const fetchPayableData = async () => {
    setPayableLoading(true);
    try {
      // Import all API modules in parallel
      const [
        { listExpenses },
        { listPayrolls },
        { listFuelReport },
        { getFleetInvoices },
      ] = await Promise.all([
        import('../../../../axios/api/account.expense'),
        import('../../../../axios/api/account.payroll'),
        import('../../../../axios/api/dispatcher.fuelreport'),
        import('../../../../axios/api/fleet.invoices'),
      ]);

      // Fetch all data sources in parallel — each returns { success, data: [...] }
      const [expRes, payRes, fuelRes, fleetInvRes] = await Promise.allSettled([
        listExpenses(),
        listPayrolls(),
        listFuelReport({ limit: 500, sortBy: 'createdAt', sortOrder: 'desc' }),
        getFleetInvoices(),
      ]);

      const items: PayableItem[] = [];

      // ── Expenses ──────────────────────────────────────────────────
      // listExpenses() returns { success, data: Expense[] }
      if (expRes.status === 'fulfilled' && expRes.value?.success && Array.isArray(expRes.value.data)) {
        expRes.value.data.forEach((e: any) => {
          // type can be a string or a populated ExpenseType object
          const typeName = typeof e.type === 'object' ? (e.type?.name || 'Expense') : (e.type || e.description || 'Expense');
          items.push({
            id: e._id,
            subCategory: 'expense',
            description: typeName,
            reference: e._id?.slice(-6).toUpperCase() || '',
            amount: toNum(e.amount),
            date: toIso(e.date || e.createdAt),
            status: (e.status || 'paid').toLowerCase(),
          });
        });
      }

      // ── Payrolls — split into employee vs driver ──────────────────
      // listPayrolls() returns { success, data: Payroll[] }
      if (payRes.status === 'fulfilled' && payRes.value?.success) {
        const allPayrolls: any[] = payRes.value.data || [];
        allPayrolls.forEach((p: any) => {
          // userId may be a populated object { _id, name, role } or just an ObjectId string
          const userObj = typeof p.userId === 'object' ? p.userId : null;
          const role = (userObj?.role || '').toLowerCase();
          const isDriver = role === 'driver';
          const name = userObj?.name || (isDriver ? 'Driver' : 'Employee');
          // Build a human-readable reference from role + pay period
          const periodLabel = p.payPeriod || (p.month && p.year ? `${p.month}/${p.year}` : '') || '';
          items.push({
            id: p._id,
            subCategory: isDriver ? 'driver-payroll' : 'employee-payroll',
            description: name,
            reference: [role || 'staff', periodLabel].filter(Boolean).join(' · '),
            amount: toNum(p.totalSalary || p.netPay || p.grossPay),
            date: toIso(p.payDate || p.createdAt),
            status: (p.status || 'pending').toLowerCase(),
          });
        });
      }

      // ── Fuel Reports ──────────────────────────────────────────────
      // listFuelReport() returns { success, data: FuelReport[], pagination }
      if (fuelRes.status === 'fulfilled' && fuelRes.value?.success) {
        const fuelList: any[] = Array.isArray(fuelRes.value.data) ? fuelRes.value.data : [];
        fuelList.forEach((f: any) => {
          // transactionAmount is the primary amount field in FuelReport model
          const amount = toNum(f.transactionAmount || f.totalCost || 0);
          // vehicle/unit is a populated object; backend may set 'N/A' as fallback — skip those
          const vehicleObj = typeof f.vehicle === 'object' ? f.vehicle : (typeof f.unit === 'object' ? f.unit : null);
          const isValid = (v: any) => v && v !== 'N/A';
          const vehicleLabel =
            [vehicleObj?.unitNo, vehicleObj?.plateNumber, vehicleObj?.internalId, vehicleObj?.makeModel, f.truckNumber]
              .find(isValid) || 'Unknown';
          // fuel type: product field or types array or legacy type string
          const fuelTypeLabel = f.product || (Array.isArray(f.types) && f.types[0]) || f.type || 'Fuel';
          items.push({
            id: f._id,
            subCategory: 'fuel',
            description: `${vehicleLabel} — ${fuelTypeLabel}`,
            reference: f.transactionNumber || f.receiptNumber || f._id?.slice(-6).toUpperCase() || '',
            amount,
            date: toIso(f.date || f.createdAt),
            status: (f.status || 'pending').toLowerCase(),
          });
        });
      }

      // ── Fleet Invoices ────────────────────────────────────────────
      // getFleetInvoices() returns { success, data: InvoiceRow[] }
      // InvoiceRow fields: _id, invoiceNumber, customerName, total, status, invoiceDate, dueDate
      if (fleetInvRes.status === 'fulfilled' && fleetInvRes.value?.success && Array.isArray(fleetInvRes.value.data)) {
        fleetInvRes.value.data.forEach((fi: any) => {
          items.push({
            id: fi._id,
            subCategory: 'fleet-invoice',
            description: fi.customerName || fi.vendorName || fi.description || 'Fleet Invoice',
            reference: fi.invoiceNumber || fi._id?.slice(-6).toUpperCase() || '',
            amount: toNum(fi.total || fi.totalAmount || fi.amount),
            date: toIso(fi.invoiceDate || fi.dueDate || fi.createdAt),
            status: (fi.status || 'pending').toLowerCase(),
          });
        });
      }

      setPayableItems(items);
      setPayableLoaded(true);
    } catch (err) {
      console.error('Error fetching payable data:', err);
    } finally {
      setPayableLoading(false);
    }
  };

  // Static Trip-wise Financial Data (fallback)


  // Static Monthly Reports (fallback)
  const staticMonthlyReports: TimeBasedReport[] = [
    {
      period: 'January 2024',
      revenue: 625000,
      expenses: 225000,
      payroll: 91500,
      invoices: 625000,
      netProfit: 308500,
      invoiceCount: 225,
      expenseCount: 180,
      payrollCount: 45
    },
    {
      period: 'February 2024',
      revenue: 580000,
      expenses: 210000,
      payroll: 85000,
      invoices: 580000,
      netProfit: 285000,
      invoiceCount: 210,
      expenseCount: 165,
      payrollCount: 42
    },
    {
      period: 'March 2024',
      revenue: 650000,
      expenses: 235000,
      payroll: 95000,
      invoices: 650000,
      netProfit: 320000,
      invoiceCount: 235,
      expenseCount: 190,
      payrollCount: 48
    },
    {
      period: 'April 2024',
      revenue: 620000,
      expenses: 228000,
      payroll: 92000,
      invoices: 620000,
      netProfit: 300000,
      invoiceCount: 220,
      expenseCount: 175,
      payrollCount: 44
    },
    {
      period: 'May 2024',
      revenue: 680000,
      expenses: 245000,
      payroll: 98000,
      invoices: 680000,
      netProfit: 337000,
      invoiceCount: 245,
      expenseCount: 200,
      payrollCount: 50
    },
    {
      period: 'June 2024',
      revenue: 640000,
      expenses: 232000,
      payroll: 94000,
      invoices: 640000,
      netProfit: 314000,
      invoiceCount: 230,
      expenseCount: 185,
      payrollCount: 46
    }
  ];

  // Static Quarterly Reports (fallback)
  const staticQuarterlyReports: TimeBasedReport[] = [
    {
      period: 'Q1 2024',
      revenue: 1855000,
      expenses: 670000,
      payroll: 271500,
      invoices: 1855000,
      netProfit: 913500,
      invoiceCount: 670,
      expenseCount: 535,
      payrollCount: 135
    },
    {
      period: 'Q2 2024',
      revenue: 1940000,
      expenses: 705000,
      payroll: 284000,
      invoices: 1940000,
      netProfit: 951000,
      invoiceCount: 695,
      expenseCount: 560,
      payrollCount: 140
    },
    {
      period: 'Q3 2024',
      revenue: 2100000,
      expenses: 760000,
      payroll: 305000,
      invoices: 2100000,
      netProfit: 1035000,
      invoiceCount: 750,
      expenseCount: 600,
      payrollCount: 150
    },
    {
      period: 'Q4 2024',
      revenue: 2050000,
      expenses: 740000,
      payroll: 298000,
      invoices: 2050000,
      netProfit: 1012000,
      invoiceCount: 730,
      expenseCount: 585,
      payrollCount: 146
    }
  ];

  // Static Half-Yearly Reports (fallback)
  const staticHalfYearlyReports: TimeBasedReport[] = [
    {
      period: 'H1 2024',
      revenue: 3795000,
      expenses: 1375000,
      payroll: 555500,
      invoices: 3795000,
      netProfit: 1864500,
      invoiceCount: 1365,
      expenseCount: 1095,
      payrollCount: 275
    },
    {
      period: 'H2 2024',
      revenue: 4150000,
      expenses: 1500000,
      payroll: 603000,
      invoices: 4150000,
      netProfit: 2047000,
      invoiceCount: 1480,
      expenseCount: 1185,
      payrollCount: 296
    },
    {
      period: 'H1 2023',
      revenue: 3600000,
      expenses: 1300000,
      payroll: 525000,
      invoices: 3600000,
      netProfit: 1775000,
      invoiceCount: 1290,
      expenseCount: 1030,
      payrollCount: 257
    },
    {
      period: 'H2 2023',
      revenue: 3600000,
      expenses: 1300000,
      payroll: 525000,
      invoices: 3600000,
      netProfit: 1775000,
      invoiceCount: 1290,
      expenseCount: 1030,
      payrollCount: 258
    }
  ];

  // Static Yearly Reports (fallback)
  const staticYearlyReports: TimeBasedReport[] = [
    {
      period: '2024',
      revenue: 7945000,
      expenses: 2875000,
      payroll: 1158500,
      invoices: 7945000,
      netProfit: 3911500,
      invoiceCount: 2845,
      expenseCount: 2280,
      payrollCount: 571
    },
    {
      period: '2023',
      revenue: 7200000,
      expenses: 2600000,
      payroll: 1050000,
      invoices: 7200000,
      netProfit: 3550000,
      invoiceCount: 2580,
      expenseCount: 2060,
      payrollCount: 515
    },
    {
      period: '2022',
      revenue: 6800000,
      expenses: 2450000,
      payroll: 980000,
      invoices: 6800000,
      netProfit: 3370000,
      invoiceCount: 2430,
      expenseCount: 1940,
      payrollCount: 485
    }
  ];

  const formatCurrency = (amount: number | undefined | null) => {
    // Handle undefined, null, NaN, or invalid numbers
    if (amount === undefined || amount === null || isNaN(amount) || typeof amount !== 'number') {
      return '$0.00';
    }
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      completed:    'bg-[rgba(0,255,163,0.1)]  text-[var(--accent-green)] border-[rgba(0,255,163,0.2)]',
      'in-progress':'bg-[rgba(0,209,255,0.1)]  text-[var(--accent-blue)]  border-[rgba(0,209,255,0.2)]',
      pending:      'bg-[rgba(251,191,36,0.1)] text-[var(--accent-amber)] border-[rgba(251,191,36,0.2)]'
    };
    return styles[status as keyof typeof styles] || 'bg-card text-secondary border-theme';
  };

  // Calculate totals from actual data
  // Prioritize overview data from backend, but fallback to truck-wise calculation if overview is 0
  const totalRevenue = overview.totalRevenue > 0
    ? overview.totalRevenue
    : truckFinancialData.reduce((sum, truck) => sum + (Number(truck.revenue) || 0), 0);
  const totalExpenses = overview.totalExpenses > 0
    ? overview.totalExpenses
    : truckFinancialData.reduce((sum, truck) => sum + (Number(truck.expenses) || 0), 0);
  const totalPayroll = overview.totalPayroll > 0
    ? overview.totalPayroll
    : truckFinancialData.reduce((sum, truck) => sum + (Number(truck.payroll) || 0), 0);
  const totalNetProfit = overview.netProfit !== 0
    ? overview.netProfit
    : truckFinancialData.reduce((sum, truck) => sum + (Number(truck.netProfit) || 0), 0);
  const totalTrips = overview.totalTrips > 0
    ? overview.totalTrips
    : truckFinancialData.reduce((sum, truck) => sum + (Number(truck.trips) || 0), 0);

  console.log('📊 [Finance Report Frontend] Calculated totals:', {
    totalRevenue,
    totalExpenses,
    totalPayroll,
    totalNetProfit,
    totalTrips,
    overview,
    truckDataCount: truckFinancialData.length
  });

  const getCurrentReports = () => {
    // Always use backend data if we've loaded it (even if empty array)
    // Only use static data during initial load before backend data is fetched
    if (dataLoaded) {
      return timeBasedData; // Use backend data (even if empty)
    }
    // Only use static fallback during initial load before data is fetched
    switch (timePeriod) {
      case 'monthly':
        return staticMonthlyReports;
      case 'quarterly':
        return staticQuarterlyReports;
      case 'half-yearly':
        return staticHalfYearlyReports;
      case 'yearly':
        return staticYearlyReports;
      default:
        return staticMonthlyReports;
    }
  };

  const overviewStats = [
    {
      title: 'Total Revenue',
      value: formatCurrency(totalRevenue),
      subtitle: 'From all trucks',
      icon: DollarSign,
      iconColor: 'text-[var(--accent-green)]',
      cardBg: 'bg-card',
      trend: '—'
    },
    {
      title: 'Total Expenses',
      value: formatCurrency(totalExpenses),
      subtitle: 'Operating costs',
      icon: TrendingDown,
      iconColor: 'text-[var(--accent-red)]',
      cardBg: 'bg-card',
      trend: '—'
    },
    {
      title: 'Total Payroll',
      value: formatCurrency(totalPayroll),
      subtitle: 'Driver & employee costs',
      icon: Users,
      iconColor: 'text-[var(--accent-blue)]',
      cardBg: 'bg-card',
      trend: '—'
    },
    {
      title: 'Net Profit',
      value: formatCurrency(totalNetProfit),
      subtitle: 'Revenue - Expenses - Payroll',
      icon: TrendingUp,
      iconColor: 'text-[var(--accent-purple)]',
      cardBg: 'bg-card',
      trend: '—'
    },
    {
      title: 'Total Trips',
      value: totalTrips.toString(),
      subtitle: 'Completed trips',
      icon: MapPin,
      iconColor: 'text-cyan-500',
      cardBg: 'bg-card',
      trend: '—'
    },
    {
      title: 'Active Trucks',
      value: (overview.activeTrucks || truckFinancialData.length).toString(),
      subtitle: 'Fleet size',
      icon: Truck,
      iconColor: 'text-[var(--accent-orange)]',
      cardBg: 'bg-card',
      trend: '—'
    }
  ];

  return (
    <div className="min-h-screen" >
      <div className="relative w-full mx-auto p-2">


        {/* Main content */}
        <div className="relative z-10 px-4 pt-3 pb-6">
          {/* Header Section */}
          <div className="mb-4 relative z-10">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-bold text-[var(--text-primary)]">Finance Report</h1>
                <p className="text-xs text-secondary mt-1">Comprehensive financial insights and analysis</p>
              </div>

            </div>
          </div>

          {/* View Tabs */}
          <div className="bg-card rounded-lg shadow-sm border border-theme p-2 mb-4">
            <div className="flex gap-2">
              {[
                { id: 'overview', label: 'Overview', icon: BarChart3 },
                { id: 'trucks', label: 'Truck-wise', icon: Truck },
                { id: 'trips', label: 'Trip-wise', icon: MapPin },
                { id: 'payable', label: 'Payables', icon: CreditCard }
              ].map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveView(tab.id as ViewType)}
                    className={`flex-1 px-4 py-2 rounded-lg font-medium text-sm transition-all flex items-center justify-center gap-2 ${activeView === tab.id
                      ? 'bg-[var(--accent-navyblue)] !text-headings shadow-md'
                      : 'text-headings hover:bg-[rgba(255,255,255,0.03)]'
                      }`}
                  >
                    <Icon size={16} />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="p-8 text-center text-secondary">Loading finance report data...</div>
          )}

          {/* Overview View */}
          {!loading && activeView === 'overview' && (
            <div className="space-y-4">
              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {overviewStats.map((stat, index) => {
                  const Icon = stat.icon;
                  return (
                    <div
                      key={index}
                      className={`${stat.cardBg} rounded-lg p-3 shadow-sm hover:shadow-md transition-all border border-transparent hover:border-[var(--accent-blue)]/20`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <p className="text-xs text-secondary uppercase tracking-wide mb-1">{stat.title}</p>
                          <div className="flex items-baseline gap-2 mb-0.5">
                            <span className="text-xl font-bold text-primary">{stat.value}</span>
                            {stat.trend !== '—' && (
                              <span className={`text-xs font-medium flex items-center gap-1 ${stat.trend.startsWith('+') ? 'text-[var(--accent-green)]' : 'text-[var(--accent-red)]'
                                }`}>
                                {stat.trend.startsWith('+') ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                                {stat.trend}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-secondary">{stat.subtitle}</p>
                        </div>
                        <div className={` rounded-lg p-2 shadow-sm`}>
                          <Icon className={stat.iconColor} size={21} strokeWidth={2} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Consolidated Financial Summary */}
              <div className="bg-card rounded-lg shadow-sm border border-theme p-6">
                <h2 className="text-lg font-bold text-[var(--text-primary)] mb-4 flex items-center gap-2">
                  <PieChart size={20} className="text-[var(--accent-navyblue)]" />
                  Consolidated Financial Summary
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                  <div className="p-4  rounded-lg border border-theme bg-[var(--accent-green)]/20">
                    <div className="text-sm text-primary mb-1">Accounts Revenue</div>
                    <div className="text-2xl font-bold text-primary">{formatCurrency(totalRevenue)}</div>
                    <div className="text-xs text-primary mt-1">From invoices</div>
                  </div>
                  <div className="p-4  rounded-lg border border-theme bg-[var(--accent-red)]/20">
                    <div className="text-sm text-primary mb-1">Total Expenses</div>
                    <div className="text-2xl font-bold text-primary">{formatCurrency(totalExpenses)}</div>
                    <div className="text-xs text-primary mt-1">Operating costs</div>
                  </div>
                  <div className="p-4  rounded-lg border border-theme bg-[var(--accent-blue)]/20">
                    <div className="text-sm text-primary mb-1">Payroll Costs</div>
                    <div className="text-2xl font-bold text-primary">{formatCurrency(totalPayroll)}</div>
                    <div className="text-xs text-primary mt-1">Employee & driver</div>
                  </div>
                  <div className="p-4  rounded-lg border border-theme bg-[var(--accent-purple)]/20">
                    <div className="text-sm text-primary mb-1">Net Profit</div>
                    <div className="text-2xl font-bold text-primary">{formatCurrency(totalNetProfit)}</div>
                    <div className="text-xs text-primary mt-1">After all costs</div>
                  </div>
                </div>

                {/* Overall Comparison Chart */}
                <div className="mt-6">
                  <h3 className="text-base font-semibold text-[var(--text-primary)] mb-4">Revenue vs Expenses vs Net Profit Comparison</h3>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={[
                          {
                            name: 'Overall',
                            Revenue: totalRevenue,
                            Expenses: totalExpenses + totalPayroll,
                            'Net Profit': totalNetProfit
                          }
                        ]}
                        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                        style={{ backgroundColor: 'transparent' }}
                      >
                        <CartesianGrid stroke="var(--border-color)" strokeDasharray="3 3" />

                        <XAxis
                          dataKey="name"
                          stroke="var(--text-secondary)"
                          style={{ fontSize: '12px' }}
                        />

                        <YAxis
                          stroke="var(--text-secondary)"
                          style={{ fontSize: '12px' }}
                        />

                        <Tooltip
                          cursor={{ fill: 'transparent' }}   // 🚀 THIS removes grey hover layer
                          wrapperStyle={{
                            background: 'transparent',
                            outline: 'none'
                          }}
                          contentStyle={{
                            backgroundColor: 'var(--bg-card)',
                            border: '1px solid var(--border-color)',
                            borderRadius: '10px',
                            boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                            color: 'var(--text-primary)'
                          }}
                          itemStyle={{ color: 'var(--text-primary)' }}
                          labelStyle={{ color: 'var(--text-secondary)' }}
                          formatter={(value) => formatCurrency(value as number)}
                        />

                        <Legend
                          wrapperStyle={{
                            color: 'var(--text-secondary)',
                            fontSize: '12px'
                          }}
                        />

                        <Bar dataKey="Revenue" fill="#10b981" radius={[8, 8, 0, 0]} />
                        <Bar dataKey="Expenses" fill="#ef4444" radius={[8, 8, 0, 0]} />
                        <Bar dataKey="Net Profit" fill="#8b5cf6" radius={[8, 8, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Financial Health Analysis */}
                <div className="mt-6 bg-card rounded-xl border border-theme p-5">
                  <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
                    <PieChart size={15} className="text-[var(--accent-blue)]" />
                    Financial Health Analysis
                  </h3>
                  {(() => {
                    const totalCosts = totalExpenses + totalPayroll;
                    const costRatio = totalRevenue > 0 ? totalCosts / totalRevenue : 0;
                    const costPct = totalRevenue > 0 ? (costRatio * 100) : 0;
                    const profitPct = totalRevenue > 0 ? (totalNetProfit / totalRevenue) * 100 : 0;
                    const isOverBudget = totalCosts > totalRevenue;
                    // For the visual bar: revenue is 1 unit, costs may exceed it
                    // Scale so max(revenue, costs) = 100%
                    const maxVal = Math.max(totalRevenue, totalCosts);
                    const revWidth = maxVal > 0 ? (totalRevenue / maxVal) * 100 : 0;
                
                    return (
                      <div className="space-y-4">
                        {/* Revenue row */}
                        <div>
                          <div className="flex justify-between items-center mb-1.5 border border-theme">
                            <div className="flex items-center gap-2">
                              <div className="w-2.5 h-2.5 rounded-full bg-[rgba(0,255,163,0.06)]0"></div>
                              <span className="text-xs font-medium text-secondary">Revenue (Baseline)</span>
                            </div>
                            <span className="text-xs font-bold text-[var(--accent-green)]">{formatCurrency(totalRevenue)}</span>
                          </div>
                          <div className="h-7 bg-[var(--accent-navyblue)]/20 rounded-lg overflow-hidden border border-theme">
                            <div className="h-full bg-gradient-to-r from-[var(--accent-green)] to-[var(--accent-green)] rounded-lg flex items-center px-3 transition-all"
                              style={{ width: `${revWidth}%`, minWidth: totalRevenue > 0 ? '30px' : '0' }}>
                              <span className="text-xs font-bold text-headings drop-shadow">100%</span>
                            </div>
                          </div>
                        </div>
                        {/* Total Costs row */}
                        <div>
                          <div className="flex justify-between items-center mb-1.5">
                            <div className="flex items-center gap-2">
                              <div className={`w-2.5 h-2.5 rounded-full ${isOverBudget ? 'bg-[var(--accent-red)]' : 'bg-[var(--accent-red)]'}`}></div>
                              <span className="text-xs font-medium text-secondary">Total Costs <span className="text-secondary">(Expenses + Payroll)</span></span>
                            </div>
                            <div className="flex items-center gap-2 border border-theme">
                              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${isOverBudget ? 'bg-[rgba(244,63,94,0.1)] text-[var(--accent-red)]' : 'bg-[rgba(245,158,11,0.1)] text-[var(--accent-orange)]'}`}>
                                {costPct.toFixed(1)}% of revenue
                              </span>
                              <span className="text-xs font-bold text-[var(--text-primary)]">{formatCurrency(totalCosts)}</span>
                            </div>
                          </div>
                          <div className="h-7 bg-[rgba(255,255,255,0.07)] rounded-lg overflow-hidden relative border border-theme">
                            {/* Revenue limit marker */}
                            {isOverBudget && totalRevenue > 0 && (
                              <div className="absolute inset-y-0 border-r-2 border-dashed border-[var(--accent-green)] z-10"
                                style={{ left: `${revWidth}%` }}>
                                <span className="absolute -top-5 -translate-x-1/2 text-[9px] font-bold text-[var(--accent-green)] whitespace-nowrap">Revenue limit</span>
                              </div>
                            )}
                            <div className="h-full rounded-lg flex items-center px-3 transition-all bg-[var(--accent-red)]/80"
                            >
                              <span className="text-xs font-bold text-headings drop-shadow">{costPct.toFixed(1)}%</span>
                            </div>
                          </div>
                        </div>
                        {/* Net result */}
                        <div className={`flex items-center justify-between p-3 rounded-lg border ${totalNetProfit >= 0 ? 'bg-[rgba(0,255,163,0.06)] border-[rgba(0,255,163,0.2)]' : 'bg-card border-[rgba(244,63,94,0.2)]'}`}>
                          <div className="flex items-center gap-2">
                            {totalNetProfit >= 0
                              ? <TrendingUp size={16} className="text-[var(--accent-green)]" />
                              : <TrendingDown size={16} className="text-[var(--accent-red)]" />}
                            <span className="text-xs font-semibold text-[var(--text-primary)]">
                              Net {totalNetProfit >= 0 ? 'Profit' : 'Loss'}
                            </span>
                          </div>
                          <div className="text-right">
                            <span className={`text-sm font-bold ${totalNetProfit >= 0 ? 'text-[var(--accent-green)]' : 'text-[var(--accent-red)]'}`}>
                              {totalNetProfit < 0 ? '-' : ''}{formatCurrency(Math.abs(totalNetProfit))}
                            </span>
                            <span className="text-xs text-secondary ml-2">
                              ({totalRevenue > 0 ? `${Math.abs(profitPct).toFixed(1)}%` : '0%'} {totalNetProfit >= 0 ? 'margin' : 'over budget'})
                            </span>
                          </div>
                        </div>
                        {/* Three KPI pills */}
                        <div className="grid grid-cols-3 gap-3 pt-1">
                          <div className="text-center p-2 bg-card rounded-lg border border-theme shadow-sm">
                            <div className="text-xs text-secondary mb-0.5">Expenses</div>
                            <div className="text-sm font-bold text-[var(--accent-red)]">{formatCurrency(totalExpenses)}</div>
                            <div className="text-xs text-secondary">{totalRevenue > 0 ? ((totalExpenses / totalRevenue) * 100).toFixed(1) : '0'}%</div>
                          </div>
                          <div className="text-center p-2 bg-card rounded-lg border border-theme shadow-sm">
                            <div className="text-xs text-secondary mb-0.5">Payroll</div>
                            <div className="text-sm font-bold text-[var(--accent-blue)]">{formatCurrency(totalPayroll)}</div>
                            <div className="text-xs text-secondary">{totalRevenue > 0 ? ((totalPayroll / totalRevenue) * 100).toFixed(1) : '0'}%</div>
                          </div>
                          <div className="text-center p-2 bg-card rounded-lg border border-theme shadow-sm">
                            <div className="text-xs text-secondary mb-0.5">Profit Margin</div>
                            <div className={`text-sm font-bold ${profitPct >= 0 ? 'text-[var(--accent-green)]' : 'text-[var(--accent-red)]'}`}>
                              {profitPct >= 0 ? '+' : ''}{profitPct.toFixed(1)}%
                            </div>
                            <div className="text-xs text-secondary">{totalNetProfit >= 0 ? 'Profitable' : 'At Loss'}</div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Quick Insights */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="bg-card rounded-lg shadow-sm border border-theme p-6">
                  <h3 className="text-base font-bold text-[var(--text-primary)] mb-4 flex items-center gap-2">
                    <FileText size={18} className="text-[var(--accent-navyblue)]" />
                    Invoice Summary
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center p-3  rounded-lg">
                      <span className="text-sm font-medium text-primary">Paid Invoices</span>
                      <span className="text-lg font-bold text-primary">{formatCurrency(invoiceSummary.paidInvoices)}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-card rounded-lg">
                      <span className="text-sm font-medium text-primary">Pending Invoices</span>
                      <span className="text-lg font-bold text-primary">{formatCurrency(invoiceSummary.pendingInvoices)}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-card rounded-lg">
                      <span className="text-sm font-medium text-primary">Overdue Invoices</span>
                      <span className="text-lg font-bold text-primary">{formatCurrency(invoiceSummary.overdueInvoices)}</span>
                    </div>
                  </div>
                  {dataLoaded && invoiceSummary.paidInvoices === 0 && invoiceSummary.pendingInvoices === 0 && invoiceSummary.overdueInvoices === 0 && (
                    <p className="text-xs text-secondary mt-2 text-center">No invoice data available</p>
                  )}
                </div>

                <div className="bg-card rounded-lg shadow-sm border border-theme p-6">
                  <h3 className="text-base font-bold text-[var(--text-primary)] mb-4 flex items-center gap-2">
                    <Receipt size={18} className="text-[var(--accent-navyblue)]" />
                    Expense Breakdown
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center p-3 bg-card rounded-lg">
                      <span className="text-sm font-medium text-primary">Fuel Costs</span>
                      <span className="text-lg font-bold text-primary">{formatCurrency(expenseBreakdown.fuelCosts)}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-card rounded-lg">
                      <span className="text-sm font-medium text-primary">Fleet Invoices</span>
                      <span className="text-lg font-bold text-primary">{formatCurrency(expenseBreakdown.fleetInvoices)}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-card rounded-lg">
                      <span className="text-sm font-medium text-primary">Other Expenses</span>
                      <span className="text-lg font-bold text-primary">{formatCurrency(expenseBreakdown.otherExpenses)}</span>
                    </div>
                  </div>
                  {dataLoaded && expenseBreakdown.fuelCosts === 0 && expenseBreakdown.fleetInvoices === 0 && expenseBreakdown.otherExpenses === 0 && (
                    <p className="text-xs text-secondary mt-2 text-center">No expense data available</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Truck-wise View */}
          {!loading && activeView === 'trucks' && (
            <div className="space-y-4">
              {/* Period Selector for Truck-wise */}
              <div className="bg-card rounded-lg shadow-sm border border-theme p-4">
                <div className="flex items-center gap-4 flex-wrap">
                  <label className="text-sm font-medium text-secondary">Timeline:</label>
                  <div className="flex gap-2 flex-wrap">
                    {(['2weeks', '1month', 'monthly', 'quarterly', 'half-yearly', 'yearly'] as TimePeriod[]).map((period) => {
                      const getPeriodLabel = (p: TimePeriod) => {
                        switch (p) {
                          case '2weeks': return '2 Weeks';
                          case '1month': return '1 Month';
                          case 'monthly': return 'Monthly';
                          case 'quarterly': return 'Quarterly';
                          case 'half-yearly': return 'Half-Yearly';
                          case 'yearly': return 'Yearly';
                          default: return p;
                        }
                      };
                      return (
                        <button
                          key={period}
                          onClick={() => setTimePeriod(period)}
                          disabled={loading}
                          className={`px-3 py-1.5 rounded-lg font-medium text-xs transition-all ${timePeriod === period
                            ? 'bg-[var(--accent-navyblue)] text-[var(--text-primary)] shadow-md'
                            : 'bg-card text-secondary hover:bg-[rgba(255,255,255,0.06)] hover:text-[var(--text-primary)]'
                            } ${loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                        >
                          {getPeriodLabel(period)}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Truck-wise Comparison Chart - Grouped by Time Period */}
              <div className="bg-card rounded-lg shadow-sm border border-theme p-6">
                <h2 className="text-lg font-bold text-[var(--text-primary)] mb-4 flex items-center gap-2">
                  <BarChart3 size={20} className="text-[var(--accent-blue)]" />
                  Truck-wise Revenue vs Expenses vs Net Profit (Grouped by {(() => {
                    switch (timePeriod) {
                      case '2weeks': return '2 Weeks';
                      case '1month': return '1 Month';
                      default: return 'Month';
                    }
                  })()})
                </h2>
                <div className="h-96 mb-6">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={(() => {
                        // Group truck trips by time period using trip data
                        const periodMap = new Map<string, {
                          period: string;
                          Revenue: number;
                          Expenses: number;
                          'Net Profit': number;
                          truckCount: number;
                        }>();

                        // Use trip data to group by time period (trips are linked to trucks)
                        // First pass: collect all trips and group by period
                        const periodTruckMap = new Map<string, Set<string>>();

                        tripFinancialData.forEach(trip => {
                          let periodKey = '';
                          let periodLabel = '';

                          try {
                            if (trip.date) {
                              const date = new Date(trip.date);

                              if (timePeriod === '2weeks') {
                                // Group by 2-week periods
                                const year = date.getFullYear();
                                const weekNumber = Math.floor((date.getTime() - new Date(year, 0, 1).getTime()) / (7 * 24 * 60 * 60 * 1000));
                                const twoWeekPeriod = Math.floor(weekNumber / 2) + 1;
                                periodKey = `${year}-W${twoWeekPeriod}`;
                                periodLabel = `Week ${(twoWeekPeriod - 1) * 2 + 1}-${twoWeekPeriod * 2}, ${year}`;
                              } else if (timePeriod === '1month') {
                                // Group by month
                                const year = date.getFullYear();
                                const month = date.getMonth() + 1;
                                periodKey = `${year}-${month.toString().padStart(2, '0')}`;
                                const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                                periodLabel = `${monthNames[month - 1]} ${year}`;
                              } else {
                                // Monthly (same as 1month for now)
                                const year = date.getFullYear();
                                const month = date.getMonth() + 1;
                                periodKey = `${year}-${month.toString().padStart(2, '0')}`;
                                const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                                periodLabel = `${monthNames[month - 1]} ${year}`;
                              }
                            } else {
                              periodKey = 'Unknown';
                              periodLabel = 'Unknown';
                            }
                          } catch (e) {
                            periodKey = 'Unknown';
                            periodLabel = 'Unknown';
                          }

                          if (!periodMap.has(periodKey)) {
                            periodMap.set(periodKey, {
                              period: periodLabel,
                              Revenue: 0,
                              Expenses: 0,
                              'Net Profit': 0,
                              truckCount: 0
                            });
                            periodTruckMap.set(periodKey, new Set());
                          }

                          const periodData = periodMap.get(periodKey)!;
                          periodData.Revenue += Number(trip.revenue) || 0;
                          periodData.Expenses += (Number(trip.expenses) || 0) + (Number(trip.driverPay) || 0);
                          periodData['Net Profit'] += Number(trip.netProfit) || 0;

                          // Track unique trucks per period
                          if (trip.truckNumber) {
                            const truckSet = periodTruckMap.get(periodKey)!;
                            truckSet.add(trip.truckNumber);
                          }
                        });

                        // Update truck counts
                        periodTruckMap.forEach((truckSet, periodKey) => {
                          const periodData = periodMap.get(periodKey);
                          if (periodData) {
                            periodData.truckCount = truckSet.size;
                          }
                        });

                        // Convert to array and sort by period
                        return Array.from(periodMap.values()).sort((a, b) => {
                          return a.period.localeCompare(b.period);
                        });
                      })()}
                      margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis
                        dataKey="period"
                        stroke="#6b7280"
                        style={{ fontSize: '11px' }}
                        height={60}
                      />
                      <YAxis
                        stroke="#6b7280"
                        style={{ fontSize: '11px' }}
                        tickFormatter={(value) => `$${value.toLocaleString()}`}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#fff',
                          border: 'none',
                          borderRadius: '8px',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                          fontSize: '12px'
                        }}
                        formatter={(value) => formatCurrency(value as number)}
                        labelFormatter={(label, payload) => {
                          if (payload && payload[0]) {
                            const data = payload[0].payload;
                            return `${data.period}${data.truckCount ? ` (${data.truckCount} trucks)` : ''}`;
                          }
                          return label;
                        }}
                      />
                      <Legend
                        wrapperStyle={{ fontSize: '12px', paddingTop: '20px' }}
                        iconType="square"
                      />
                      <Bar dataKey="Revenue" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} />
                      <Bar dataKey="Expenses" stackId="a" fill="#ef4444" radius={[0, 0, 0, 0]} />
                      <Bar dataKey="Net Profit" stackId="a" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-card rounded-xl shadow-sm border border-theme">
                <div className="flex items-center justify-between px-6 py-4 border-b border-theme">
                  <h2 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
                    <Truck size={18} className="text-[var(--accent-navyblue)]" />
                    Truck-wise Financial Performance
                  </h2>
                  <button className="px-3 py-1.5 bg-card hover:bg-[rgba(255,255,255,0.06)] text-secondary rounded-lg text-xs font-medium transition-all flex items-center gap-2">
                    <Filter size={13} />
                    Filter
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full" style={{ minWidth: '1100px' }}>
                    <thead>
                      <tr >
                        <th className="px-4 py-3 text-left text-xs font-semibold text-secondary uppercase tracking-wider whitespace-nowrap">Truck ID</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-secondary uppercase tracking-wider whitespace-nowrap">Truck #</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-secondary uppercase tracking-wider whitespace-nowrap">Revenue</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-secondary uppercase tracking-wider whitespace-nowrap">Expenses</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-secondary uppercase tracking-wider whitespace-nowrap">Payroll</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-secondary uppercase tracking-wider whitespace-nowrap">Net Profit</th>
                        <th className="px-4 py-3 text-center text-xs font-semibold text-secondary uppercase tracking-wider whitespace-nowrap" style={{ minWidth: '100px' }}>Margin</th>
                        <th className="px-4 py-3 text-center text-xs font-semibold text-secondary uppercase tracking-wider whitespace-nowrap">Trips</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-secondary uppercase tracking-wider whitespace-nowrap">Miles</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-secondary uppercase tracking-wider whitespace-nowrap">Rev/Mile</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-secondary uppercase tracking-wider whitespace-nowrap">Cost/Mile</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-secondary uppercase tracking-wider whitespace-nowrap">Profit/Mile</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-secondary uppercase tracking-wider whitespace-nowrap">Fuel Cost</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-secondary uppercase tracking-wider whitespace-nowrap">Fleet Invoice</th>
                      </tr>
                    </thead>
                    <tbody className="divide-theme divide-white/5">
                      {truckFinancialData.map((truck, idx) => {
                        const profitMargin = truck.revenue > 0 ? (truck.netProfit / truck.revenue) * 100 : 0;
                        const totalCost = truck.expenses + truck.payroll;
                        const hasMiles = truck.miles > 0;
                        const revPerMile = hasMiles ? truck.revenue / truck.miles : null;
                        const costPerMile = hasMiles ? totalCost / truck.miles : null;
                        const profitPerMile = hasMiles ? truck.netProfit / truck.miles : null;
                        const shortId = truck.id ? truck.id.slice(-6).toUpperCase() : '—';
                        const dash = <span className="text-secondary font-light">—</span>;
                        return (
                          <tr key={truck.id} className={`transition-colors ${idx % 2 === 0 ? 'bg-card' : 'bg-[var(--accent-navyblue)]/20'}`}>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span className="text-xs font-mono bg-card text-[#00D1FF] border border-[rgba(0,209,255,0.2)] px-2 py-0.5 rounded">#{shortId}</span>
                            </td>
                            <td className="px-4 py-3 text-sm font-bold text-[var(--text-primary)] whitespace-nowrap">{truck.truckNumber}</td>
                            <td className="px-4 py-3 text-sm text-right font-semibold text-[var(--accent-green)] whitespace-nowrap">{formatCurrency(truck.revenue)}</td>
                            <td className="px-4 py-3 text-sm text-right text-[var(--text-primary)] whitespace-nowrap">{formatCurrency(truck.expenses)}</td>
                            <td className="px-4 py-3 text-sm text-right text-[var(--text-primary)] whitespace-nowrap">{formatCurrency(truck.payroll)}</td>
                            <td className={`px-4 py-3 text-sm text-right font-bold whitespace-nowrap ${truck.netProfit >= 0 ? 'text-[var(--accent-green)]' : 'text-[var(--accent-red)]'}`}>
                              {truck.netProfit < 0 ? '-' : ''}{formatCurrency(Math.abs(truck.netProfit))}
                            </td>
                            <td className="px-4 py-3 text-sm text-center whitespace-nowrap">
                              <div className="flex flex-col items-center gap-1">
                                <span className={`text-xs font-bold ${profitMargin > 0 ? 'text-[var(--accent-green)]' : 'text-[var(--accent-red)]'}`}>
                                  {profitMargin.toFixed(1)}%
                                </span>
                                <div className="w-16 bg-[rgba(255,255,255,0.07)] rounded-full h-1.5 overflow-hidden">
                                  <div
                                    className={`h-1.5 rounded-full transition-all ${profitMargin > 0 ? 'bg-[var(--accent-green)]' : 'bg-[var(--accent-red)]'}`}
                                    style={{ width: `${Math.min(Math.max(profitMargin, 0), 100)}%` }}
                                  />
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-sm text-center whitespace-nowrap">
                              <span className={`inline-flex items-center justify-center min-w-[28px] h-6 px-2 rounded-full text-xs font-semibold ${truck.trips > 0 ? 'bg-[var(--accent-blue)]/10 text-[var(--accent-blue)]' : 'bg-card text-secondary'}`}>
                                {truck.trips}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-right text-[var(--text-primary)] whitespace-nowrap">{hasMiles ? truck.miles.toLocaleString(undefined, { maximumFractionDigits: 1 }) : dash}</td>
                            <td className="px-4 py-3 text-sm text-right whitespace-nowrap">{revPerMile !== null ? <span className="text-[var(--text-primary)]">${revPerMile.toFixed(2)}</span> : dash}</td>
                            <td className="px-4 py-3 text-sm text-right whitespace-nowrap">{costPerMile !== null ? <span className="text-[var(--text-primary)]">${costPerMile.toFixed(2)}</span> : dash}</td>
                            <td className="px-4 py-3 text-sm text-right whitespace-nowrap">
                              {profitPerMile !== null
                                ? <span className={profitPerMile >= 0 ? 'text-[var(--accent-green)] font-medium' : 'text-[var(--accent-red)] font-medium'}>{profitPerMile < 0 ? '-' : ''}${Math.abs(profitPerMile).toFixed(2)}</span>
                                : dash}
                            </td>
                            <td className="px-4 py-3 text-sm text-right text-[var(--text-primary)] whitespace-nowrap">{formatCurrency(truck.fuelCost)}</td>
                            <td className="px-4 py-3 text-sm text-right text-[var(--text-primary)] whitespace-nowrap">{formatCurrency(truck.fleetInvoiceCost)}</td>
                          </tr>
                        );
                      })}
                      {truckFinancialData.length === 0 && (
                        <tr><td colSpan={14} className="px-4 py-10 text-center text-secondary text-sm">No truck data available for this period</td></tr>
                      )}
                      {truckFinancialData.length > 0 && (() => {
                        const totMiles = truckFinancialData.reduce((s, t) => s + t.miles, 0);
                        const totRev = truckFinancialData.reduce((s, t) => s + t.revenue, 0);
                        const totExp = truckFinancialData.reduce((s, t) => s + t.expenses, 0);
                        const totPay = truckFinancialData.reduce((s, t) => s + t.payroll, 0);
                        const totCost = totExp + totPay;
                        const totProfit = truckFinancialData.reduce((s, t) => s + t.netProfit, 0);
                        const totTrips = truckFinancialData.reduce((s, t) => s + t.trips, 0);
                        const hasTotMiles = totMiles > 0;
                        const totMargin = totRev > 0 ? (totProfit / totRev) * 100 : 0;
                        return (
                          <tr className="font-bold border-t-2 border-[var(--accent-blue)]/30 bg-[var(--accent-blue)]/5">
                            <td colSpan={2} className="px-4 py-3 text-sm text-[var(--text-primary)] font-bold">Fleet Total</td>
                            <td className="px-4 py-3 text-sm text-right text-[var(--accent-green)] font-bold whitespace-nowrap">{formatCurrency(totRev)}</td>
                            <td className="px-4 py-3 text-sm text-right text-[var(--text-primary)] font-bold whitespace-nowrap">{formatCurrency(totExp)}</td>
                            <td className="px-4 py-3 text-sm text-right text-[var(--text-primary)] font-bold whitespace-nowrap">{formatCurrency(totPay)}</td>
                            <td className={`px-4 py-3 text-sm text-right font-bold whitespace-nowrap ${totProfit >= 0 ? 'text-[var(--accent-green)]' : 'text-[var(--accent-red)]'}`}>{formatCurrency(totProfit)}</td>
                            <td className="px-4 py-3 text-sm text-center font-bold text-[var(--text-primary)] whitespace-nowrap">{totMargin.toFixed(1)}%</td>
                            <td className="px-4 py-3 text-sm text-center font-bold text-[var(--text-primary)] whitespace-nowrap">{totTrips}</td>
                            <td className="px-4 py-3 text-sm text-right text-[var(--text-primary)] font-bold whitespace-nowrap">{hasTotMiles ? totMiles.toLocaleString(undefined, { maximumFractionDigits: 1 }) : <span className="text-secondary font-light">—</span>}</td>
                            <td className="px-4 py-3 text-sm text-right text-[var(--text-primary)] font-bold whitespace-nowrap">{hasTotMiles ? `${(totRev / totMiles).toFixed(2)}` : <span className="text-secondary font-light">—</span>}</td>
                            <td className="px-4 py-3 text-sm text-right text-[var(--text-primary)] font-bold whitespace-nowrap">{hasTotMiles ? `${(totCost / totMiles).toFixed(2)}` : <span className="text-secondary font-light">—</span>}</td>
                            <td className={`px-4 py-3 text-sm text-right font-bold whitespace-nowrap ${totProfit >= 0 ? 'text-[var(--accent-green)]' : 'text-[var(--accent-red)]'}`}>{hasTotMiles ? `$${(totProfit / totMiles).toFixed(2)}` : <span className="text-secondary font-light">—</span>}</td>
                            <td className="px-4 py-3 text-sm text-right text-[var(--text-primary)] font-bold whitespace-nowrap">{formatCurrency(truckFinancialData.reduce((s, t) => s + t.fuelCost, 0))}</td>
                            <td className="px-4 py-3 text-sm text-right text-[var(--text-primary)] font-bold whitespace-nowrap">{formatCurrency(truckFinancialData.reduce((s, t) => s + t.fleetInvoiceCost, 0))}</td>
                          </tr>
                        );
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Trip-wise View */}
          {!loading && activeView === 'trips' && (
            <div className="space-y-4">
              {/* Period Selector for Trip-wise */}
              <div className="bg-card rounded-lg shadow-sm border border-theme p-4">
                <div className="flex items-center gap-4 flex-wrap">
                  <label className="text-sm font-medium text-secondary">Timeline:</label>
                  <div className="flex gap-2 flex-wrap">
                    {(['2weeks', '1month', 'monthly', 'quarterly', 'half-yearly', 'yearly'] as TimePeriod[]).map((period) => {
                      const getPeriodLabel = (p: TimePeriod) => {
                        switch (p) {
                          case '2weeks': return '2 Weeks';
                          case '1month': return '1 Month';
                          case 'monthly': return 'Monthly';
                          case 'quarterly': return 'Quarterly';
                          case 'half-yearly': return 'Half-Yearly';
                          case 'yearly': return 'Yearly';
                          default: return p;
                        }
                      };
                      return (
                        <button
                          key={period}
                          onClick={() => setTimePeriod(period)}
                          disabled={loading}
                          className={`px-3 py-1.5 rounded-lg font-medium text-xs transition-all ${timePeriod === period
                            ? 'bg-[var(--accent-navyblue)] text-[var(--text-primary)] shadow-md'
                            : 'bg-card text-secondary hover:bg-[rgba(255,255,255,0.06)] hover:text-[var(--text-primary)]'
                            } ${loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                        >
                          {getPeriodLabel(period)}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Trip-wise Comparison Chart - Grouped by Time Period */}
              <div className="bg-card rounded-lg shadow-sm border border-theme p-6">
                <h2 className="text-lg font-bold text-[var(--text-primary)] mb-4 flex items-center gap-2">
                  <BarChart3 size={20} className="text-[var(--accent-blue)]" />
                  Trip-wise Revenue vs Expenses vs Net Profit (Grouped by {(() => {
                    switch (timePeriod) {
                      case '2weeks': return '2 Weeks';
                      case '1month': return '1 Month';
                      default: return 'Month';
                    }
                  })()})
                </h2>
                <div className="h-96 mb-6">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={(() => {
                        // Group trips by time period
                        const periodMap = new Map<string, {
                          period: string;
                          Revenue: number;
                          Expenses: number;
                          'Net Profit': number;
                          tripCount: number;
                        }>();

                        tripFinancialData.forEach(trip => {
                          let periodKey = '';
                          let periodLabel = '';

                          try {
                            // Use startDate for grouping, fallback to date if startDate is not available
                            const dateToUse = trip.startDate || trip.date;
                            if (dateToUse) {
                              const date = new Date(dateToUse);

                              if (timePeriod === '2weeks') {
                                // Group by 2-week periods
                                const year = date.getFullYear();
                                const weekNumber = Math.floor((date.getTime() - new Date(year, 0, 1).getTime()) / (7 * 24 * 60 * 60 * 1000));
                                const twoWeekPeriod = Math.floor(weekNumber / 2) + 1;
                                periodKey = `${year}-W${twoWeekPeriod}`;
                                periodLabel = `Week ${(twoWeekPeriod - 1) * 2 + 1}-${twoWeekPeriod * 2}, ${year}`;
                              } else if (timePeriod === '1month') {
                                // Group by month
                                const year = date.getFullYear();
                                const month = date.getMonth() + 1;
                                periodKey = `${year}-${month.toString().padStart(2, '0')}`;
                                const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                                periodLabel = `${monthNames[month - 1]} ${year}`;
                              } else {
                                // Monthly (same as 1month for now)
                                const year = date.getFullYear();
                                const month = date.getMonth() + 1;
                                periodKey = `${year}-${month.toString().padStart(2, '0')}`;
                                const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                                periodLabel = `${monthNames[month - 1]} ${year}`;
                              }
                            } else {
                              periodKey = 'Unknown';
                              periodLabel = 'Unknown';
                            }
                          } catch (e) {
                            periodKey = 'Unknown';
                            periodLabel = 'Unknown';
                          }

                          if (!periodMap.has(periodKey)) {
                            periodMap.set(periodKey, {
                              period: periodLabel,
                              Revenue: 0,
                              Expenses: 0,
                              'Net Profit': 0,
                              tripCount: 0
                            });
                          }

                          const periodData = periodMap.get(periodKey)!;
                          periodData.Revenue += Number(trip.revenue) || 0;
                          periodData.Expenses += (Number(trip.expenses) || 0) + (Number(trip.driverPay) || 0);
                          periodData['Net Profit'] += Number(trip.netProfit) || 0;
                          periodData.tripCount += 1;
                        });

                        // Convert to array and sort by period
                        return Array.from(periodMap.values()).sort((a, b) => {
                          // Simple string comparison should work for date-based periods
                          return a.period.localeCompare(b.period);
                        });
                      })()}
                      margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis
                        dataKey="period"
                        stroke="#6b7280"
                        style={{ fontSize: '11px' }}
                        height={60}
                      />
                      <YAxis
                        stroke="#6b7280"
                        style={{ fontSize: '11px' }}
                        tickFormatter={(value) => `$${value.toLocaleString()}`}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#fff',
                          border: 'none',
                          borderRadius: '8px',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                          fontSize: '12px'
                        }}
                        formatter={(value) => formatCurrency(value as number)}
                        labelFormatter={(label, payload) => {
                          if (payload && payload[0]) {
                            const data = payload[0].payload;
                            return `${data.period} (${data.tripCount} trips)`;
                          }
                          return label;
                        }}
                      />
                      <Legend
                        wrapperStyle={{ fontSize: '12px', paddingTop: '20px' }}
                        iconType="square"
                      />
                      <Bar dataKey="Revenue" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} />
                      <Bar dataKey="Expenses" stackId="a" fill="#ef4444" radius={[0, 0, 0, 0]} />
                      <Bar dataKey="Net Profit" stackId="a" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-card rounded-xl shadow-sm border border-theme">
                <div className="flex items-center justify-between px-6 py-4 border-b border-theme">
                  <h2 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
                    <MapPin size={18} className="text-[var(--accent-blue)]" />
                    Trip-wise Financial Details
                  </h2>
                  <button className="px-3 py-1.5 bg-card hover:bg-[rgba(255,255,255,0.06)] text-secondary rounded-lg text-xs font-medium transition-all flex items-center gap-2">
                    <Filter size={13} />
                    Filter
                  </button>
                </div>
                <div className="bg-card rounded-lg shadow-sm border border-theme overflow-hidden mb-6">
                  {/* Top Scrollbar - Only visible horizontal scrollbar */}
                  <style>{`
              .top-scrollbar-container {
                overflow-x: auto;
                overflow-y: hidden;
              }
              .top-scrollbar-container::-webkit-scrollbar {
                height: 10px;
              }
              .top-scrollbar-container::-webkit-scrollbar-track {
                background: #f7fafc;
                border-radius: 5px;
              }
              .top-scrollbar-container::-webkit-scrollbar-thumb {
                background: var(--accent-blue);
                border-radius: 5px;
              }
              .top-scrollbar-container::-webkit-scrollbar-thumb:hover {
                background: rgba(0,209,255,0.15);
              }
              .table-container-with-scrollbar {
                overflow-x: auto;
                overflow-y: visible;
              }
              .table-container-with-scrollbar::-webkit-scrollbar {
                height: 10px;
              }
              .table-container-with-scrollbar::-webkit-scrollbar-track {
                background: #f7fafc;
                border-radius: 5px;
              }
              .table-container-with-scrollbar::-webkit-scrollbar-thumb {
                background: var(--accent-blue);
                border-radius: 5px;
              }
              .table-container-with-scrollbar::-webkit-scrollbar-thumb:hover {
                background: rgba(0,209,255,0.15);
              }
            `}</style>
                  <div
                    ref={topScrollRef}
                    className="top-scrollbar-container"
                    style={{
                      height: '20px',
                      marginBottom: '8px',
                      paddingTop: '8px',
                      scrollbarWidth: 'thin',
                      /* Firefox */
                    }}
                  >
                    <div className="top-scroll-content" style={{ height: '1px', minWidth: '100%' }}></div>
                  </div>
                  {/* Main Table with visible scrollbar */}
                  <div
                    ref={bottomScrollRef}
                    className="table-container-with-scrollbar"
                  >
                    <table className="w-full" style={{ minWidth: '1400px' }}>
                      <thead>
                        <tr >
                          <th className="px-4 py-3 text-left text-xs font-semibold text-secondary uppercase tracking-wider whitespace-nowrap">Trip ID</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-secondary uppercase tracking-wider whitespace-nowrap">Trip #</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-secondary uppercase tracking-wider whitespace-nowrap">Truck</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-secondary uppercase tracking-wider whitespace-nowrap">Driver</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-secondary uppercase tracking-wider" style={{ minWidth: '180px' }}>Route</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-secondary uppercase tracking-wider whitespace-nowrap">Miles</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-secondary uppercase tracking-wider whitespace-nowrap">Start Date</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-secondary uppercase tracking-wider whitespace-nowrap">End Date</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-secondary uppercase tracking-wider whitespace-nowrap">Revenue</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-secondary uppercase tracking-wider whitespace-nowrap">Fuel Cost</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-secondary uppercase tracking-wider whitespace-nowrap">Other Exp</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-secondary uppercase tracking-wider whitespace-nowrap">Driver Pay</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-secondary uppercase tracking-wider whitespace-nowrap">Net Profit</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-secondary uppercase tracking-wider whitespace-nowrap">Rev/Mile</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-secondary uppercase tracking-wider whitespace-nowrap">Cost/Mile</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-secondary uppercase tracking-wider whitespace-nowrap">Profit/Mile</th>
                          <th className="px-4 py-3 text-center text-xs font-semibold text-secondary uppercase tracking-wider whitespace-nowrap" style={{ minWidth: '100px' }}>Margin</th>
                          <th className="px-4 py-3 text-center text-xs font-semibold text-secondary uppercase tracking-wider whitespace-nowrap">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-theme divide-white/5">
                        {tripFinancialData.map((trip, idx) => {
                          const revenue = Number(trip.revenue) || 0;
                          const fuelCost = Number(trip.fuelCost) || 0;
                          const otherExp = Math.max(0, (Number(trip.expenses) || 0) - fuelCost);
                          const driverPay = Number(trip.driverPay) || 0;
                          const netProfit = Number(trip.netProfit) || 0;
                          const miles = Number(trip.totalMiles) || 0;
                          const hasMiles = miles > 0;
                          const profitMargin = revenue > 0 ? (netProfit / revenue) * 100 : 0;
                          const totalCost = (Number(trip.expenses) || 0) + driverPay;
                          const revPerMile = hasMiles ? revenue / miles : null;
                          const costPerMile = hasMiles ? totalCost / miles : null;
                          const profitPerMile = hasMiles ? netProfit / miles : null;
                          const shortId = trip.id ? trip.id.slice(-6).toUpperCase() : '—';
                          const dash = <span className="text-secondary font-light">—</span>;
                          let formattedStartDate = '—';
                          let formattedEndDate = '—';
                          try { if (trip.startDate) formattedStartDate = new Date(trip.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' }); } catch { }
                          try { if (trip.endDate) formattedEndDate = new Date(trip.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' }); } catch { }
                          const routeText = trip.origin && trip.destination && trip.origin !== 'N/A' && trip.destination !== 'N/A'
                            ? `${trip.origin} → ${trip.destination}`
                            : trip.origin !== 'N/A' ? trip.origin : trip.destination !== 'N/A' ? trip.destination : '—';
                          return (
                            <tr key={trip.id} className={`hover:bg-[rgba(255,255,255,0.03)] transition-colors ${idx % 2 === 0 ? 'bg-card' : 'bg-[var(--accent-navyblue)]/20'}`}>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <span className="text-xs font-mono bg-card text-[var(--accent-blue)] border border-[rgba(0,209,255,0.2)] px-2 py-0.5 rounded">#{shortId}</span>
                              </td>
                              <td className="px-4 py-3 text-sm font-bold text-secondary whitespace-nowrap">{trip.tripNumber || '—'}</td>
                              <td className="px-4 py-3 text-sm font-semibold text-secondary whitespace-nowrap">{trip.truckNumber || '—'}</td>
                              <td className="px-4 py-3 text-sm text-secondary whitespace-nowrap">{trip.driverName || <span className="text-secondary">—</span>}</td>
                              <td className="px-4 py-3 text-sm text-secondary">
                                <div className="relative group inline-flex items-center gap-1 min-w-0 cursor-default">
                                  <span className="text-secondary font-medium truncate" style={{ maxWidth: '80px' }}>{trip.origin && trip.origin !== 'N/A' ? trip.origin : <span className="text-secondary">—</span>}</span>
                                  <ArrowUpRight size={12} className="text-[var(--accent-blue)] flex-shrink-0" />
                                  <span className="text-secondary font-medium truncate" style={{ maxWidth: '80px' }}>{trip.destination && trip.destination !== 'N/A' ? trip.destination : <span className="text-secondary">—</span>}</span>
                                  {routeText !== '—' && (
                                    <div className="absolute z-50 bottom-full left-0 mb-1.5 px-2.5 py-1.5 bg-gray-900 text-secondary text-xs rounded-lg whitespace-nowrap shadow-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-150">
                                      {trip.origin && trip.origin !== 'N/A' ? trip.origin : '—'}
                                      <span className="mx-1.5 text-[var(--accent-blue)]">→</span>
                                      {trip.destination && trip.destination !== 'N/A' ? trip.destination : '—'}
                                    </div>
                                  )}
                                </div>
                              </td>
                              <td className="px-4 py-3 text-sm text-right text-secondary whitespace-nowrap">{hasMiles ? miles.toLocaleString(undefined, { maximumFractionDigits: 1 }) : dash}</td>
                              <td className="px-4 py-3 text-sm text-secondary whitespace-nowrap">{formattedStartDate}</td>
                              <td className="px-4 py-3 text-sm text-secondary whitespace-nowrap">{formattedEndDate}</td>
                              <td className="px-4 py-3 text-sm text-right font-semibold text-[var(--accent-green)] whitespace-nowrap">{formatCurrency(revenue)}</td>
                              <td className="px-4 py-3 text-sm text-right whitespace-nowrap">{fuelCost > 0 ? <span className="text-[var(--text-primary)]">{formatCurrency(fuelCost)}</span> : dash}</td>
                              <td className="px-4 py-3 text-sm text-right whitespace-nowrap">{otherExp > 0 ? <span className="text-[var(--text-primary)]">{formatCurrency(otherExp)}</span> : dash}</td>
                              <td className="px-4 py-3 text-sm text-right whitespace-nowrap">{driverPay > 0 ? <span className="text-[var(--text-primary)]">{formatCurrency(driverPay)}</span> : dash}</td>
                              <td className={`px-4 py-3 text-sm text-right font-bold whitespace-nowrap ${netProfit >= 0 ? 'text-[var(--accent-green)]' : 'text-[var(--accent-red)]'}`}>
                                {netProfit < 0 ? '-' : ''}{formatCurrency(Math.abs(netProfit))}
                              </td>
                              <td className="px-4 py-3 text-sm text-right whitespace-nowrap">{revPerMile !== null ? <span className="text-[var(--text-primary)]">${revPerMile.toFixed(2)}</span> : dash}</td>
                              <td className="px-4 py-3 text-sm text-right whitespace-nowrap">{costPerMile !== null ? <span className="text-[var(--text-primary)]">${costPerMile.toFixed(2)}</span> : dash}</td>
                              <td className="px-4 py-3 text-sm text-right whitespace-nowrap">
                                {profitPerMile !== null
                                  ? <span className={profitPerMile >= 0 ? 'text-[var(--accent-green)] font-medium' : 'text-[var(--accent-red)] font-medium'}>{profitPerMile < 0 ? '-' : ''}${Math.abs(profitPerMile).toFixed(2)}</span>
                                  : dash}
                              </td>
                              <td className="px-4 py-3 text-sm text-center whitespace-nowrap">
                                <div className="flex flex-col items-center gap-1">
                                  <span className={`text-xs font-bold ${profitMargin > 0 ? 'text-[var(--accent-green)]' : 'text-[var(--accent-red)]'}`}>
                                    {isNaN(profitMargin) ? '0.0' : profitMargin.toFixed(1)}%
                                  </span>
                                  <div className="w-14 bg-[rgba(255,255,255,0.07)] rounded-full h-1.5 overflow-hidden">
                                    <div className={`h-1.5 rounded-full ${profitMargin > 0 ? 'bg-[var(--accent-green)]' : 'bg-[var(--accent-red)]'}`}
                                      style={{ width: `${Math.min(Math.max(profitMargin, 0), 100)}%` }} />
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-sm text-center whitespace-nowrap">
                                <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getStatusBadge(trip.status || 'planned')}`}>
                                  {(trip.status || 'planned').replace('-', ' ')}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                        {tripFinancialData.length === 0 && (
                          <tr><td colSpan={18} className="px-4 py-10 text-center text-secondary text-sm">No trip data available for this period</td></tr>
                        )}
                        {tripFinancialData.length > 0 && (() => {
                          const totMiles = tripFinancialData.reduce((s, t) => s + (Number(t.totalMiles) || 0), 0);
                          const totRev = tripFinancialData.reduce((s, t) => s + (Number(t.revenue) || 0), 0);
                          const totFuelCost = tripFinancialData.reduce((s, t) => s + (Number(t.fuelCost) || 0), 0);
                          const totOtherExp = tripFinancialData.reduce((s, t) => s + Math.max(0, (Number(t.expenses) || 0) - (Number(t.fuelCost) || 0)), 0);
                          const totPay = tripFinancialData.reduce((s, t) => s + (Number(t.driverPay) || 0), 0);
                          const totProfit = tripFinancialData.reduce((s, t) => s + (Number(t.netProfit) || 0), 0);
                          const totCost = totFuelCost + totOtherExp + totPay;
                          const hasTotMiles = totMiles > 0;
                          const totMargin = totRev > 0 ? (totProfit / totRev) * 100 : 0;
                          const dash = <span className="text-secondary font-light">—</span>;
                          return (
                            <tr className="font-bold border-t-2 border-[var(--accent-blue)]/30 bg-[var(--accent-blue)]/5">
                              <td colSpan={4} className="px-4 py-3 text-sm text-secondary font-bold whitespace-nowrap">All Trips Total</td>
                              <td className="px-4 py-3 whitespace-nowrap"></td>
                              <td className="px-4 py-3 text-sm text-right text-secondary font-bold whitespace-nowrap">{hasTotMiles ? totMiles.toLocaleString(undefined, { maximumFractionDigits: 1 }) : dash}</td>
                              <td colSpan={2} className="px-4 py-3 whitespace-nowrap"></td>
                              <td className="px-4 py-3 text-sm text-right text-[var(--accent-green)] font-bold whitespace-nowrap">{formatCurrency(totRev)}</td>
                              <td className="px-4 py-3 text-sm text-right text-[var(--text-primary)] font-bold whitespace-nowrap">{totFuelCost > 0 ? formatCurrency(totFuelCost) : dash}</td>
                              <td className="px-4 py-3 text-sm text-right text-[var(--text-primary)] font-bold whitespace-nowrap">{totOtherExp > 0 ? formatCurrency(totOtherExp) : dash}</td>
                              <td className="px-4 py-3 text-sm text-right text-[var(--text-primary)] font-bold whitespace-nowrap">{totPay > 0 ? formatCurrency(totPay) : dash}</td>
                              <td className={`px-4 py-3 text-sm text-right font-bold whitespace-nowrap ${totProfit >= 0 ? 'text-[var(--accent-green)]' : 'text-[var(--accent-red)]'}`}>{formatCurrency(totProfit)}</td>
                              <td className="px-4 py-3 text-sm text-right text-[var(--text-primary)] font-bold whitespace-nowrap">{hasTotMiles ? `${(totRev / totMiles).toFixed(2)}` : dash}</td>
                              <td className="px-4 py-3 text-sm text-right text-[var(--text-primary)] font-bold whitespace-nowrap">{hasTotMiles ? `${(totCost / totMiles).toFixed(2)}` : dash}</td>
                              <td className={`px-4 py-3 text-sm text-right font-bold whitespace-nowrap ${totProfit >= 0 ? 'text-[var(--accent-green)]' : 'text-[var(--accent-red)]'}`}>{hasTotMiles ? `$${(totProfit / totMiles).toFixed(2)}` : dash}</td>
                              <td className="px-4 py-3 text-sm text-center font-bold text-secondary whitespace-nowrap">{totMargin.toFixed(1)}%</td>
                              <td className="px-4 py-3 whitespace-nowrap"></td>
                            </tr>
                          );
                        })()}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Time-based Reports View — removed */}
          {false && (
            <div className="space-y-4">
              {/* Period Selector */}
              <div className="bg-card rounded-lg shadow-sm border border-theme p-4">
                <div className="flex items-center gap-4">
                  <label className="text-sm font-medium text-secondary">Report Period:</label>
                  <div className="flex gap-2 flex-wrap">
                    {(['2weeks', '1month', 'monthly', 'quarterly', 'half-yearly', 'yearly'] as TimePeriod[]).map((period) => {
                      const getPeriodLabel = (p: TimePeriod) => {
                        switch (p) {
                          case '2weeks': return '2 Weeks';
                          case '1month': return '1 Month';
                          case 'half-yearly': return 'Half Yearly';
                          default: return p.charAt(0).toUpperCase() + p.slice(1);
                        }
                      };
                      return (
                        <button
                          key={period}
                          onClick={() => {
                            console.log('📊 [Time Period] Changing period to:', period);
                            setTimePeriod(period);
                          }}
                          disabled={loading}
                          className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${timePeriod === period
                            ? 'bg-gradient-to-r from-[var(--accent-blue)] to-[rgba(0,209,255,0.15)] text-[var(--text-primary)] shadow-md'
                            : 'bg-card text-secondary hover:bg-[rgba(255,255,255,0.06)] hover:text-[var(--text-primary)]'
                            } ${loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                        >
                          {getPeriodLabel(period)}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Loading State */}
              {loading && (
                <div className="bg-card rounded-lg shadow-sm border border-theme p-8 text-center text-secondary">
                  Loading time-based reports for {timePeriod}...
                </div>
              )}

              {/* Empty State */}
              {!loading && getCurrentReports().length === 0 && dataLoaded && (
                <div className="bg-card rounded-lg shadow-sm border border-theme p-8 text-center">
                  <Calendar size={48} className="mx-auto text-secondary mb-4" />
                  <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">No Data Available</h3>
                  <p className="text-secondary mb-4">No financial data found for the selected period ({timePeriod}).</p>
                  <p className="text-sm text-secondary">Try selecting a different period or check if you have invoices, expenses, or payroll records.</p>
                </div>
              )}

              {/* Charts and Summary - Only show when not loading and have data */}
              {!loading && getCurrentReports().length > 0 && (
                <>

                  {/* Time-based Comparison Chart */}
                  <div className="bg-card rounded-lg shadow-sm border border-theme p-6">
                    <h2 className="text-lg font-bold text-[var(--text-primary)] mb-4 flex items-center gap-2">
                      <BarChart3 size={20} className="text-[var(--accent-blue)]" />
                      {(() => {
                        switch (timePeriod) {
                          case '2weeks': return '2 Weeks';
                          case '1month': return '1 Month';
                          case 'half-yearly': return 'Half Yearly';
                          default: return timePeriod.charAt(0).toUpperCase() + timePeriod.slice(1);
                        }
                      })()} Revenue vs Expenses vs Net Profit Trend
                    </h2>
                    <div className="h-96 mb-6">
                      {getCurrentReports().length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart
                            data={getCurrentReports().map(report => ({
                              period: report.period,
                              Revenue: Number(report.revenue) || 0,
                              Expenses: (Number(report.expenses) || 0) + (Number(report.payroll) || 0),
                              'Net Profit': Number(report.netProfit) || 0
                            }))}
                            margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                            <XAxis
                              dataKey="period"
                              stroke="#6b7280"
                              style={{ fontSize: '11px' }}
                              height={60}
                            />
                            <YAxis
                              stroke="#6b7280"
                              style={{ fontSize: '11px' }}
                              tickFormatter={(value) => `$${value.toLocaleString()}`}
                            />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: '#fff',
                                border: 'none',
                                borderRadius: '8px',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                                fontSize: '12px'
                              }}
                              formatter={(value) => formatCurrency(value as number)}
                            />
                            <Legend />
                            <Line
                              type="monotone"
                              dataKey="Revenue"
                              stroke="#10b981"
                              strokeWidth={3}
                              dot={{ fill: '#10b981', r: 5 }}
                              activeDot={{ r: 7 }}
                            />
                            <Line
                              type="monotone"
                              dataKey="Expenses"
                              stroke="#ef4444"
                              strokeWidth={3}
                              dot={{ fill: '#ef4444', r: 5 }}
                              activeDot={{ r: 7 }}
                            />
                            <Line
                              type="monotone"
                              dataKey="Net Profit"
                              stroke="#8b5cf6"
                              strokeWidth={3}
                              dot={{ fill: '#8b5cf6', r: 5 }}
                              activeDot={{ r: 7 }}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="flex items-center justify-center h-full text-secondary">
                          No data available for chart
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Time-based Comparison Bar Chart */}
                  <div className="bg-card rounded-lg shadow-sm border border-theme p-6">
                    <h2 className="text-lg font-bold text-[var(--text-primary)] mb-4 flex items-center gap-2">
                      <BarChart3 size={20} className="text-[var(--accent-blue)]" />
                      {(() => {
                        switch (timePeriod) {
                          case '2weeks': return '2 Weeks';
                          case '1month': return '1 Month';
                          case 'half-yearly': return 'Half Yearly';
                          default: return timePeriod.charAt(0).toUpperCase() + timePeriod.slice(1);
                        }
                      })()} Comparison
                    </h2>
                    <div className="h-96 mb-6">
                      {getCurrentReports().length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={getCurrentReports().map(report => ({
                              period: report.period,
                              Revenue: Number(report.revenue) || 0,
                              Expenses: (Number(report.expenses) || 0) + (Number(report.payroll) || 0),
                              'Net Profit': Number(report.netProfit) || 0
                            }))}
                            margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                            <XAxis
                              dataKey="period"
                              stroke="#6b7280"
                              style={{ fontSize: '11px' }}
                              height={60}
                            />
                            <YAxis
                              stroke="#6b7280"
                              style={{ fontSize: '11px' }}
                              tickFormatter={(value) => `$${value.toLocaleString()}`}
                            />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: '#fff',
                                border: 'none',
                                borderRadius: '8px',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                                fontSize: '12px'
                              }}
                              formatter={(value) => formatCurrency(value as number)}
                              labelFormatter={(label) => `Period: ${label}`}
                            />
                            <Legend
                              wrapperStyle={{ fontSize: '12px', paddingTop: '20px' }}
                              iconType="square"
                            />
                            <Bar dataKey="Revenue" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} />
                            <Bar dataKey="Expenses" stackId="a" fill="#ef4444" radius={[0, 0, 0, 0]} />
                            <Bar dataKey="Net Profit" stackId="a" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="flex items-center justify-center h-full text-secondary">
                          No data available for chart
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Summary Cards for Time-based Reports */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-card rounded-lg shadow-sm border border-theme p-4">
                      <div className="text-sm text-secondary mb-1">Average Revenue</div>
                      <div className="text-2xl font-bold text-[var(--accent-green)]">
                        {formatCurrency(
                          getCurrentReports().length > 0
                            ? getCurrentReports().reduce((sum, r) => sum + (Number(r.revenue) || 0), 0) / getCurrentReports().length
                            : 0
                        )}
                      </div>
                      <div className="text-xs text-secondary mt-1">
                        Per {timePeriod === 'half-yearly' ? 'half year' : timePeriod === 'yearly' ? 'year' : timePeriod.slice(0, -2)}
                      </div>
                    </div>
                    <div className="bg-card rounded-lg shadow-sm border border-theme p-4">
                      <div className="text-sm text-secondary mb-1">Average Expenses</div>
                      <div className="text-2xl font-bold text-[var(--accent-red)]">
                        {formatCurrency(
                          getCurrentReports().length > 0
                            ? getCurrentReports().reduce((sum, r) => sum + (Number(r.expenses) || 0), 0) / getCurrentReports().length
                            : 0
                        )}
                      </div>
                      <div className="text-xs text-secondary mt-1">
                        Per {timePeriod === 'half-yearly' ? 'half year' : timePeriod === 'yearly' ? 'year' : timePeriod.slice(0, -2)}
                      </div>
                    </div>
                    <div className="bg-card rounded-lg shadow-sm border border-theme p-4">
                      <div className="text-sm text-secondary mb-1">Average Profit</div>
                      <div className="text-2xl font-bold text-[var(--accent-purple)]">
                        {formatCurrency(
                          getCurrentReports().length > 0
                            ? getCurrentReports().reduce((sum, r) => sum + (Number(r.netProfit) || 0), 0) / getCurrentReports().length
                            : 0
                        )}
                      </div>
                      <div className="text-xs text-secondary mt-1">
                        Per {timePeriod === 'half-yearly' ? 'half year' : timePeriod === 'yearly' ? 'year' : timePeriod.slice(0, -2)}
                      </div>
                    </div>
                    <div className="bg-card rounded-lg shadow-sm border border-theme p-4">
                      <div className="text-sm text-secondary mb-1">Profit Margin</div>
                      <div className="text-2xl font-bold text-[#00D1FF]">
                        {(() => {
                          const totalRevenue = getCurrentReports().reduce((sum, r) => sum + (Number(r.revenue) || 0), 0);
                          const totalProfit = getCurrentReports().reduce((sum, r) => sum + (Number(r.netProfit) || 0), 0);
                          return totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(1) : '0.0';
                        })()}
                        %
                      </div>
                      <div className="text-xs text-secondary mt-1">Overall margin</div>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ── Payables Tab ── */}
          {activeView === 'payable' && (() => {
            const PAYABLE_META: Record<Exclude<PayableSubCategory, 'all'>, { label: string; color: string; bg: string; textColor: string; icon: React.ReactNode }> = {
              expense: { label: 'Expense', color: '#ef4444', bg: 'bg-card', textColor: 'text-[var(--accent-red)]', icon: <Receipt size={13} /> },
              'employee-payroll': { label: 'Employee Payroll', color: '#3b82f6', bg: 'bg-card', textColor: 'text-[var(--accent-blue)]', icon: <Users size={13} /> },
              'driver-payroll': { label: 'Driver Payroll', color: '#10b981', bg: 'bg-[rgba(0,255,163,0.08)]', textColor: 'text-[var(--accent-green)]', icon: <IdCard size={13} /> },
              fuel: { label: 'Fuel Cost', color: '#f59e0b', bg: 'bg-[rgba(251,191,36,0.08)]', textColor: 'text-[var(--accent-amber)]', icon: <Fuel size={13} /> },
              'fleet-invoice': { label: 'Fleet Invoice', color: '#8b5cf6', bg: 'bg-[rgba(168,85,247,0.08)]', textColor: 'text-[var(--accent-purple)]', icon: <DollarSign size={13} /> },
            };

            const STATUS_META: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
              paid: { bg: 'bg-[rgba(0,255,163,0.1)]', text: 'text-[var(--accent-green)]', icon: <CheckCircle2 size={11} /> },
              unpaid: { bg: 'bg-[rgba(244,63,94,0.1)]', text: 'text-[var(--accent-red)]', icon: <XCircle size={11} /> },
              pending: { bg: 'bg-[rgba(251,191,36,0.1)]', text: 'text-[var(--accent-amber)]', icon: <Clock size={11} /> },
              overdue: { bg: 'bg-[rgba(245,158,11,0.1)]', text: 'text-[var(--accent-orange)]', icon: <AlertCircle size={11} /> },
              completed: { bg: 'bg-[rgba(0,255,163,0.1)]', text: 'text-[var(--accent-green)]', icon: <CheckCircle2 size={11} /> },
              approved: { bg: 'bg-[rgba(0,255,163,0.1)]', text: 'text-[var(--accent-green)]', icon: <CheckCircle2 size={11} /> },
              active: { bg: 'bg-[rgba(0,209,255,0.1)]', text: 'text-[var(--accent-blue)]', icon: <Clock size={11} /> },
            };

            const fmtCur = (n: number) =>
              new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

            // Filtered items
            const filtered = payableItems.filter(item => {
              if (payableSubFilter !== 'all' && item.subCategory !== payableSubFilter) return false;
              if (payableStatusFilter !== 'all' && item.status !== payableStatusFilter) return false;
              if (payableSearch) {
                const q = payableSearch.toLowerCase();
                if (!item.description.toLowerCase().includes(q) && !item.reference.toLowerCase().includes(q)) return false;
              }
              return true;
            });

            // Summary totals
            const totalPayable = filtered.reduce((s, i) => s + i.amount, 0);
            const totalPaid = filtered.filter(i => i.status === 'paid' || i.status === 'completed' || i.status === 'approved').reduce((s, i) => s + i.amount, 0);
            const totalOutstanding = totalPayable - totalPaid;
            const overdueCount = filtered.filter(i => i.status === 'overdue').length;

            // Per-category totals
            const catTotals = (Object.keys(PAYABLE_META) as Exclude<PayableSubCategory, 'all'>[]).map(cat => ({
              cat,
              total: payableItems.filter(i => i.subCategory === cat).reduce((s, i) => s + i.amount, 0),
              count: payableItems.filter(i => i.subCategory === cat).length,
            }));

            // Sort
            const sorted = [...filtered].sort((a, b) => {
              let cmp = 0;
              if (payableSortKey === 'date') cmp = new Date(a.date).getTime() - new Date(b.date).getTime();
              else if (payableSortKey === 'amount') cmp = a.amount - b.amount;
              else if (payableSortKey === 'subCategory') cmp = a.subCategory.localeCompare(b.subCategory);
              else if (payableSortKey === 'status') cmp = a.status.localeCompare(b.status);
              return payableSortDir === 'asc' ? cmp : -cmp;
            });

            const totalPgPages = Math.max(1, Math.ceil(sorted.length / PAYABLE_PAGE_SIZE));
            const pageRows = sorted.slice((payablePage - 1) * PAYABLE_PAGE_SIZE, payablePage * PAYABLE_PAGE_SIZE);

            const handlePayableSort = (key: PayableSortKey) => {
              if (payableSortKey === key) setPayableSortDir(d => d === 'asc' ? 'desc' : 'asc');
              else { setPayableSortKey(key); setPayableSortDir('desc'); }
              setPayablePage(1);
            };

            const SortIcon = ({ k }: { k: PayableSortKey }) =>
              payableSortKey === k
                ? (payableSortDir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />)
                : <ChevronsUpDown size={12} className="text-secondary" />;

            return (
              <div className="space-y-4">

                {/* Refresh button */}
                <div className="flex justify-end">
                  <button
                    onClick={() => { setPayableLoaded(false); fetchPayableData(); }}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-secondary border border-theme bg-card rounded-lg hover:bg-[rgba(255,255,255,0.03)] transition"
                  >
                    <RefreshCw size={13} className={payableLoading ? 'animate-spin text-[var(--accent-blue)]' : ''} />
                    Refresh
                  </button>
                </div>

                {/* Summary KPI cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="bg-card rounded-xl border border-theme p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <CreditCard size={15} className="text-[var(--accent-blue)]" />
                      <span className="text-xs text-secondary font-medium uppercase tracking-wide">Total Payables</span>
                    </div>
                    <div className="text-2xl font-bold text-[var(--text-primary)]">{fmtCur(totalPayable)}</div>
                    <div className="text-xs text-secondary mt-1">{filtered.length} records</div>
                  </div>
                  <div className="bg-card rounded-xl border border-theme p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <CheckCircle2 size={15} className="text-[var(--accent-green)]" />
                      <span className="text-xs text-secondary font-medium uppercase tracking-wide">Paid / Settled</span>
                    </div>
                    <div className="text-2xl font-bold text-[var(--accent-green)]">{fmtCur(totalPaid)}</div>
                    <div className="text-xs text-secondary mt-1">{totalPayable > 0 ? Math.round((totalPaid / totalPayable) * 100) : 0}% of total</div>
                  </div>
                  <div className="bg-card rounded-xl border border-theme p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <TrendingDown size={15} className="text-[var(--accent-red)]" />
                      <span className="text-xs text-secondary font-medium uppercase tracking-wide">Outstanding</span>
                    </div>
                    <div className="text-2xl font-bold text-[var(--accent-red)]">{fmtCur(totalOutstanding)}</div>
                    <div className="text-xs text-secondary mt-1">{totalPayable > 0 ? Math.round((totalOutstanding / totalPayable) * 100) : 0}% unpaid</div>
                  </div>
                  <div className="bg-card rounded-xl border border-theme p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <AlertCircle size={15} className="text-[var(--accent-orange)]" />
                      <span className="text-xs text-secondary font-medium uppercase tracking-wide">Overdue Items</span>
                    </div>
                    <div className="text-2xl font-bold text-[var(--accent-orange)]">{overdueCount}</div>
                    <div className="text-xs text-secondary mt-1">Need attention</div>
                  </div>
                </div>

                {/* Category breakdown cards */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                  {catTotals.map(({ cat, total, count }) => {
                    const meta = PAYABLE_META[cat];
                    const isActive = payableSubFilter === cat;
                    return (
                      <button
                        key={cat}
                        onClick={() => { setPayableSubFilter(isActive ? 'all' : cat); setPayablePage(1); }}
                        className={`rounded-xl p-3 text-left border transition ${isActive ? 'border-[var(--accent-blue)] bg-[var(--accent-blue)]/5 shadow-sm' : 'border-theme bg-card hover:border-[var(--accent-blue)]/40'}`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: meta.color + '20', color: meta.color }}>
                            {meta.icon}
                          </span>
                          {isActive && <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-blue)]" />}
                        </div>
                        <div className="text-sm font-bold text-[var(--text-primary)] truncate">{fmtCur(total)}</div>
                        <div className="text-xs text-secondary mt-0.5 truncate">{meta.label}</div>
                        <div className="text-xs text-secondary">{count} items</div>
                      </button>
                    );
                  })}
                </div>

                {/* Filters */}
                <div className="bg-card rounded-xl border border-theme p-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-1.5 text-secondary text-sm font-medium">
                      <Filter size={13} />
                      Filters
                    </div>

                    {/* Search */}
                    <div className="relative flex-1 min-w-[180px] max-w-xs">
                      <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-secondary" />
                      <input
                        type="text"
                        placeholder="Search payables…"
                        value={payableSearch}
                        onChange={e => { setPayableSearch(e.target.value); setPayablePage(1); }}
                        className="w-full pl-8 pr-3 py-1.5 text-sm border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)]/30 focus:border-[var(--accent-blue)]"
                      />
                    </div>

                    {/* Category */}
                    <select
                      value={payableSubFilter}
                      onChange={e => { setPayableSubFilter(e.target.value as PayableSubCategory); setPayablePage(1); }}
                      className="text-sm border border-theme rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)]/30 focus:border-[var(--accent-blue)] bg-card"
                    >
                      <option value="all">All Categories</option>
                      {(Object.keys(PAYABLE_META) as Exclude<PayableSubCategory, 'all'>[]).map(k => (
                        <option key={k} value={k}>{PAYABLE_META[k].label}</option>
                      ))}
                    </select>

                    {/* Status */}
                    <select
                      value={payableStatusFilter}
                      onChange={e => { setPayableStatusFilter(e.target.value); setPayablePage(1); }}
                      className="text-sm border border-theme rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)]/30 focus:border-[var(--accent-blue)] bg-card"
                    >
                      <option value="all">All Statuses</option>
                      <option value="paid">Paid</option>
                      <option value="unpaid">Unpaid</option>
                      <option value="pending">Pending</option>
                      <option value="overdue">Overdue</option>
                      <option value="completed">Completed</option>
                    </select>

                    {(payableSubFilter !== 'all' || payableStatusFilter !== 'all' || payableSearch) && (
                      <button
                        onClick={() => { setPayableSubFilter('all'); setPayableStatusFilter('all'); setPayableSearch(''); setPayablePage(1); }}
                        className="text-xs text-[var(--accent-blue)] hover:underline"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>

                {/* Table */}
                <div className="bg-card rounded-xl border border-theme">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-theme">
                    <div>
                      <h2 className="text-sm font-semibold text-[var(--text-primary)]">Payables List</h2>
                      <p className="text-xs text-secondary">Showing {Math.min(pageRows.length, PAYABLE_PAGE_SIZE)} of {filtered.length} records</p>
                    </div>
                  </div>

                  {payableLoading ? (
                    <div className="flex items-center justify-center py-16 gap-3 text-secondary">
                      <RefreshCw size={20} className="animate-spin text-[var(--accent-blue)]" />
                      <span className="text-sm">Loading payables…</span>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-card text-xs text-secondary uppercase tracking-wide">
                            <th className="text-left px-4 py-2.5 font-medium">
                              <button onClick={() => handlePayableSort('subCategory')} className="flex items-center gap-1 text-secondary">
                                Category <SortIcon k="subCategory" />
                              </button>
                            </th>
                            <th className="text-left px-4 py-2.5 font-medium text-secondary">Description</th>
                            <th className="text-left px-4 py-2.5 font-medium text-secondary">Reference</th>
                            <th className="text-right px-4 py-2.5 font-medium">
                              <button onClick={() => handlePayableSort('amount')} className="flex items-center gap-1 text-headings ml-auto">
                                Amount <SortIcon k="amount" />
                              </button>
                            </th>
                            <th className="text-left px-4 py-2.5 font-medium">
                              <button onClick={() => handlePayableSort('date')} className="flex items-center gap-1 text-secondary">
                                Date <SortIcon k="date" />
                              </button>
                            </th>
                            <th className="text-left px-4 py-2.5 font-medium">
                              <button onClick={() => handlePayableSort('status')} className="flex items-center gap-1 text-secondary">
                                Status <SortIcon k="status" />
                              </button>
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-theme divide-white/5">
                          {pageRows.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="text-center py-14 text-secondary text-sm">
                                {payableItems.length === 0 ? 'No payable records found.' : 'No records match the selected filters.'}
                              </td>
                            </tr>
                          ) : pageRows.map(row => {
                            const catMeta = PAYABLE_META[row.subCategory];
                            const stMeta = STATUS_META[row.status] ?? { bg: 'bg-card', text: 'text-secondary', icon: null };
                            return (
                              <tr key={`${row.subCategory}-${row.id}`} className="hover:bg-[rgba(255,255,255,0.03)] transition">
                                <td className="px-4 py-2.5">
                                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${catMeta.bg} ${catMeta.textColor}`}>
                                    {catMeta.icon}
                                    {catMeta.label}
                                  </span>
                                </td>
                                <td className="px-4 py-2.5 text-secondary max-w-[200px]">
                                  <div className="truncate">{row.description}</div>
                                </td>
                                <td className="px-4 py-2.5 text-secondary text-xs font-mono">{row.reference}</td>
                                <td className="px-4 py-2.5 text-right font-semibold text-secondary">
                                  {formatCurrency(row.amount)}
                                </td>
                                <td className="px-4 py-2.5 text-secondary text-xs whitespace-nowrap">
                                  {new Date(row.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                </td>
                                <td className="px-4 py-2.5">
                                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${stMeta.bg} ${stMeta.text}`}>
                                    {stMeta.icon}
                                    {row.status.charAt(0).toUpperCase() + row.status.slice(1)}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>

                        {/* Totals footer */}
                        {pageRows.length > 0 && (
                          <tfoot>
                            <tr className="bg-[var(--accent-blue)]/5 border-t-2 border-[var(--accent-blue)]/20 font-semibold">
                              <td colSpan={3} className="px-4 py-2.5 text-sm ">
                                Filtered Total ({filtered.length} records)
                              </td>
                              <td className="px-4 py-2.5 text-right text-sm font-bold ">
                                {formatCurrency(totalPayable)}
                              </td>
                              <td colSpan={2} className="px-4 py-2.5 text-xs text-secondary">
                                Paid: {fmtCur(totalPaid)} · Outstanding: {fmtCur(totalOutstanding)}
                              </td>
                            </tr>
                          </tfoot>
                        )}
                      </table>
                    </div>
                  )}

                  {/* Pagination */}
                  {totalPgPages > 1 && (
                    <div className="flex items-center justify-between px-4 py-3 border-t border-theme">
                      <span className="text-xs text-secondary">Page {payablePage} of {totalPgPages}</span>
                      <div className="flex items-center gap-1">
                        <button onClick={() => setPayablePage(p => Math.max(1, p - 1))} disabled={payablePage === 1}
                          className="px-2.5 py-1 text-xs border border-theme rounded hover:bg-[rgba(255,255,255,0.03)] disabled:opacity-40 disabled:cursor-not-allowed">
                          Prev
                        </button>
                        {Array.from({ length: Math.min(5, totalPgPages) }, (_, i) => {
                          const p = totalPgPages <= 5 ? i + 1 : Math.max(1, Math.min(payablePage - 2, totalPgPages - 4)) + i;
                          return (
                            <button key={p} onClick={() => setPayablePage(p)}
                              className={`w-7 h-7 text-xs rounded transition ${p === payablePage ? 'bg-[var(--accent-blue)] text-headings font-semibold' : 'border border-theme text-secondary hover:bg-[rgba(255,255,255,0.03)]'}`}>
                              {p}
                            </button>
                          );
                        })}
                        <button onClick={() => setPayablePage(p => Math.min(totalPgPages, p + 1))} disabled={payablePage === totalPgPages}
                          className="px-2.5 py-1 text-xs border border-theme rounded hover:bg-[rgba(255,255,255,0.03)] disabled:opacity-40 disabled:cursor-not-allowed">
                          Next
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

        </div>
      </div>
    </div>
  );
};

export default FinanceReport;
