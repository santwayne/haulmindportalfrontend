import { useState, useEffect } from 'react';
import { Search, Plus, Edit, Trash2, Download, Filter, DollarSign, TrendingDown, TrendingUp, MapPin, FileText, Users, X, AlertCircle, CheckCircle } from 'lucide-react';
import {
  getSettlements,
  getSettlementStats,
  createSettlement,
  updateSettlement,
  getDeductionAdditions,
  createDeductionAddition,
  updateDeductionAddition,
  deleteDeductionAddition,
  getMilesTracking,
  getMilesTrackingStats,
  createMilesTracking,
  updateMilesTracking
} from '../../../../axios/api/account.settlement';
import { getAllVehicles } from '../../../../axios/api/vehicle';
import { getAllDrivers } from '../../../../axios/api/driver';

interface Settlement {
  _id: string;
  settlementId: string;
  driver: {
    _id: string;
    name: string;
    email?: string;
    phone?: string;
    internalId?: string;
  };
  payPeriod: {
    startDate: string;
    endDate: string;
  };
  status: 'Pending' | 'Processing' | 'Paid' | 'Cancelled';
  grossPay: number;
  deductions: number;
  additions: number;
  netPay: number;
}

interface DeductionAddition {
  _id: string;
  name: string;
  type: 'Deduction' | 'Addition';
  recurrence: string;
  amount: number;
  assignedTo: {
    _id: string;
    name: string;
    email?: string;
    phone?: string;
    internalId?: string;
  };
}

interface MilesTracking {
  _id: string;
  date: string;
  vehicle: {
    _id: string;
    plateNumber?: string;
    unitNumber?: string;
    internalId?: string;
    make?: string;
    model?: string;
  };
  driver: {
    _id: string;
    name: string;
    email?: string;
    phone?: string;
    internalId?: string;
  };
  state: string;
  totalMiles: number;
  loadedMiles: number;
  emptyMiles: number;
  iftaMiles: number;
}

interface Notification {
  type: 'success' | 'error';
  message: string;
}

export default function SettlementSystem() {
  const [activeTab, setActiveTab] = useState('driver-settlements');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState<Notification | null>(null);

  // Data states
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [deductions, setDeductions] = useState<DeductionAddition[]>([]);
  const [milesTracking, setMilesTracking] = useState<MilesTracking[]>([]);
  const [, setStats] = useState<any>(null);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);

  // Modal states
  const [showSettlementModal, setShowSettlementModal] = useState(false);
  const [showDeductionModal, setShowDeductionModal] = useState(false);
  const [showMilesModal, setShowMilesModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [itemToDelete, setItemToDelete] = useState<{ id: string; type: 'deduction' } | null>(null);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form states
  const [settlementForm, setSettlementForm] = useState({
    driver: '',
    payPeriod: { startDate: '', endDate: '' },
    grossPay: '',
    deductions: '0',
    additions: '0',
    status: 'Pending' as 'Pending' | 'Processing' | 'Paid' | 'Cancelled',
    paymentMethod: '',
    paymentReference: '',
    notes: ''
  });

  const [deductionForm, setDeductionForm] = useState({
    name: '',
    type: 'Deduction' as 'Deduction' | 'Addition',
    recurrence: 'One-time' as 'One-time' | 'Weekly' | 'Bi-weekly' | 'Monthly' | 'Quarterly' | 'Yearly',
    amount: '',
    assignedTo: '',
    startDate: '',
    endDate: '',
    description: ''
  });

  const [milesForm, setMilesForm] = useState({
    date: '',
    vehicle: '',
    driver: '',
    state: '',
    totalMiles: '',
    loadedMiles: '0',
    emptyMiles: '0',
    iftaMiles: '',
    notes: ''
  });

  const tabs = [
    { id: 'driver-settlements', label: 'Driver/O-O Settlements', icon: Users },
    { id: 'deductions-additions', label: 'Deductions & Additions', icon: TrendingDown },
    { id: 'miles-tracking', label: 'Miles Tracking & Reporting', icon: MapPin }
  ];

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  // Fetch drivers and vehicles
  const fetchDrivers = async () => {
    try {
      // Backend getAllDrivers doesn't support status filter, so we filter on frontend
      const response = await getAllDrivers(1, 1000);
      console.log('🔍 Drivers API response:', response);
      if (response?.success) {
        const allDrivers = response.data || [];
        console.log('📊 All drivers from API:', allDrivers.length);
        console.log('📋 Driver statuses:', allDrivers.map((d: any) => ({
          name: d.name,
          status: d.status,
          _id: d._id
        })));

        // Show all drivers except explicitly inactive ones
        const driverList = allDrivers.filter((driver: any) =>
          driver.status !== 'inactive'
        );
        console.log('✅ Filtered drivers:', driverList.length, 'out of', allDrivers.length);
        console.log('📋 Final driver list:', driverList.map((d: any) => ({
          name: d.name,
          status: d.status,
          _id: d._id
        })));
        setDrivers(driverList);
      } else {
        console.warn('⚠️ Drivers API returned success: false', response);
        setDrivers([]);
      }
    } catch (error) {
      console.error('❌ Error fetching drivers:', error);
      setDrivers([]);
    }
  };

  const fetchVehicles = async () => {
    try {
      // Vehicle status values: 'In Service', 'Out of Service', 'Maintenance', etc.
      // Fetch all vehicles and filter on frontend if needed
      const response = await getAllVehicles(1, 1000);
      console.log('🔍 Vehicles API response:', response);
      if (response?.success && Array.isArray(response.data)) {
        // Filter to show only active/in-service vehicles
        const activeVehicles = response.data.filter((vehicle: any) =>
          !vehicle.status ||
          vehicle.status === 'In Service' ||
          vehicle.status === 'IN SERVICE' ||
          vehicle.operationStatus === 'IN SERVICE'
        );
        console.log('✅ Fetched vehicles:', activeVehicles.length, 'out of', response.data.length, activeVehicles);
        setVehicles(activeVehicles);
      } else {
        console.warn('⚠️ No vehicles found or invalid response:', response);
        setVehicles([]);
      }
    } catch (error) {
      console.error('❌ Error fetching vehicles:', error);
      setVehicles([]);
    }
  };


  // Fetch settlements
  const fetchSettlements = async () => {
    setLoading(true);
    try {
      const response = await getSettlements({
        search: searchTerm || undefined,
        page: 1,
        limit: 100
      });
      if (response?.success) {
        setSettlements(response.data || []);
      } else {
        showNotification('error', response?.message || 'Failed to fetch settlements');
      }
    } catch (error) {
      showNotification('error', 'Error fetching settlements');
    } finally {
      setLoading(false);
    }
  };

  // Fetch deductions/additions
  const fetchDeductions = async () => {
    setLoading(true);
    try {
      const response = await getDeductionAdditions({
        search: searchTerm || undefined,
        page: 1,
        limit: 100
      });
      if (response?.success) {
        setDeductions(response.data || []);
      } else {
        showNotification('error', response?.message || 'Failed to fetch deductions/additions');
      }
    } catch (error) {
      showNotification('error', 'Error fetching deductions/additions');
    } finally {
      setLoading(false);
    }
  };

  // Fetch miles tracking
  const fetchMilesTracking = async () => {
    setLoading(true);
    try {
      const response = await getMilesTracking({
        search: searchTerm || undefined,
        page: 1,
        limit: 100
      });
      if (response?.success) {
        setMilesTracking(response.data || []);
      } else {
        showNotification('error', response?.message || 'Failed to fetch miles tracking');
      }
    } catch (error) {
      showNotification('error', 'Error fetching miles tracking');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (id: string, type: 'deduction') => {
    setItemToDelete({ id, type });
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;

    try {
      if (itemToDelete.type === 'deduction') {
        const response = await deleteDeductionAddition(itemToDelete.id);
        if (response?.success) {
          showNotification('success', 'Deleted successfully');
          fetchDeductions();
        } else {
          showNotification('error', response?.message || 'Failed to delete');
        }
      }
    } catch (error) {
      showNotification('error', 'Error deleting item');
    } finally {
      setShowDeleteModal(false);
      setItemToDelete(null);
    }
  };

  // Fetch stats
  const fetchStats = async () => {
    try {
      // Calculate current week date range
      const today = new Date();
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay()); // Sunday
      startOfWeek.setHours(0, 0, 0, 0);
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6); // Saturday
      endOfWeek.setHours(23, 59, 59, 999);

      const settlementStats = await getSettlementStats();
      const milesStats = await getMilesTrackingStats({
        startDate: startOfWeek.toISOString().split('T')[0],
        endDate: endOfWeek.toISOString().split('T')[0]
      });

      const statsData: any = {
        totalSettlements: 0,
        pendingCount: 0,
        pendingAmount: 0,
        activeDrivers: 0,
        totalMiles: 0
      };

      // Use stats from API if available
      if (settlementStats?.success && settlementStats.data) {
        statsData.totalSettlements = settlementStats.data.totalNetPay || 0;
        statsData.pendingCount = settlementStats.data.pendingCount || 0;
        statsData.pendingAmount = settlementStats.data.pendingAmount || 0;
        statsData.activeDrivers = settlementStats.data.activeDrivers || 0;
      } else {
        // Fallback: calculate from actual settlements data
        if (settlements.length > 0) {
          statsData.totalSettlements = settlements.reduce((sum, s) => sum + (s.netPay || 0), 0);
          statsData.pendingCount = settlements.filter(s => s.status === 'Pending').length;
          statsData.pendingAmount = settlements
            .filter(s => s.status === 'Pending')
            .reduce((sum, s) => sum + (s.netPay || 0), 0);
          const uniqueDrivers = new Set(settlements.map(s => s.driver?._id).filter(Boolean));
          statsData.activeDrivers = uniqueDrivers.size;
        }
      }

      // Use miles stats from API if available
      if (milesStats?.success && milesStats.data) {
        statsData.totalMiles = milesStats.data.totalMiles || 0;
      } else {
        // Fallback: calculate from actual miles tracking data for current week
        if (milesTracking.length > 0) {
          const weekMiles = milesTracking.filter(m => {
            const recordDate = new Date(m.date);
            return recordDate >= startOfWeek && recordDate <= endOfWeek;
          });
          statsData.totalMiles = weekMiles.reduce((sum, m) => sum + (m.totalMiles || 0), 0);
        }
      }

      setStats(statsData);
    } catch (error) {
      console.error('Error fetching stats:', error);
      // On error, try to calculate from existing data
      const statsData: any = {
        totalSettlements: settlements.reduce((sum, s) => sum + (s.netPay || 0), 0),
        pendingCount: settlements.filter(s => s.status === 'Pending').length,
        pendingAmount: settlements
          .filter(s => s.status === 'Pending')
          .reduce((sum, s) => sum + (s.netPay || 0), 0),
        activeDrivers: new Set(settlements.map(s => s.driver?._id).filter(Boolean)).size,
        totalMiles: 0
      };

      // Calculate week miles
      const today = new Date();
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay());
      startOfWeek.setHours(0, 0, 0, 0);
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      endOfWeek.setHours(23, 59, 59, 999);

      const weekMiles = milesTracking.filter(m => {
        const recordDate = new Date(m.date);
        return recordDate >= startOfWeek && recordDate <= endOfWeek;
      });
      statsData.totalMiles = weekMiles.reduce((sum, m) => sum + (m.totalMiles || 0), 0);

      setStats(statsData);
    }
  };

  useEffect(() => {
    fetchStats();
    fetchDrivers();
    fetchVehicles();
    // Fetch miles tracking on initial load for summary cards (settlements will be fetched by activeTab useEffect)
    fetchMilesTracking();
  }, []);

  useEffect(() => {
    if (activeTab === 'driver-settlements') {
      fetchSettlements();
    } else if (activeTab === 'deductions-additions') {
      fetchDeductions();
    } else if (activeTab === 'miles-tracking') {
      fetchMilesTracking();
    }
  }, [activeTab, searchTerm]);

  // Format pay period
  const formatPayPeriod = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const startMonth = start.toLocaleDateString('en-US', { month: 'short' });
    const startDay = start.getDate();
    const endDay = end.getDate();
    const year = start.getFullYear();
    return `${startMonth} ${startDay}-${endDay}, ${year}`;
  };


  // Calculate current week for miles tracking
  const getCurrentWeekRange = () => {
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay()); // Sunday
    startOfWeek.setHours(0, 0, 0, 0);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6); // Saturday
    endOfWeek.setHours(23, 59, 59, 999);
    return { startOfWeek, endOfWeek };
  };

  // Calculate summary values from actual data
  const calculateSummaryValues = () => {
    // Total Settlements: Sum of all net pay from settlements
    const totalSettlements = settlements.reduce((sum, s) => sum + (s.netPay || 0), 0);

    // Pending Payments: Count and amount of pending settlements
    const pendingSettlements = settlements.filter(s => s.status === 'Pending');
    const pendingCount = pendingSettlements.length;
    const pendingAmount = pendingSettlements.reduce((sum, s) => sum + (s.netPay || 0), 0);

    // Total Miles (Week): Sum of total miles for current week
    const { startOfWeek, endOfWeek } = getCurrentWeekRange();
    const weekMiles = milesTracking.filter(m => {
      const recordDate = new Date(m.date);
      return recordDate >= startOfWeek && recordDate <= endOfWeek;
    });
    const totalMiles = weekMiles.reduce((sum, m) => sum + (m.totalMiles || 0), 0);

    // Active Drivers: Unique drivers from settlements
    const uniqueDrivers = new Set(settlements.map(s => s.driver?._id).filter(Boolean));
    const activeDrivers = uniqueDrivers.size;

    return {
      totalSettlements,
      pendingCount,
      pendingAmount,
      totalMiles,
      activeDrivers
    };
  };

  // Summary Cards Data - calculated from actual data
  const summaryValues = calculateSummaryValues();
  const summaryCards = [
    {
      title: 'Total Settlements',
      value: `$${summaryValues.totalSettlements.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      change: '+12.5%',
      icon: DollarSign,
      color: 'text-[var(--accent-blue)]'
    },
    {
      title: 'Pending Payments',
      value: `$${summaryValues.pendingAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      change: `${summaryValues.pendingCount} pending`,
      icon: FileText,
      color: 'text-[var(--accent-red)]'
    },
    {
      title: 'Total Miles (Week)',
      value: summaryValues.totalMiles.toLocaleString(),
      change: '+8.3%',
      icon: MapPin,
      color: 'text-[var(--accent-green)]'
    },
    {
      title: 'Active Drivers',
      value: summaryValues.activeDrivers.toString(),
      change: summaryValues.activeDrivers > 0 ? '100% active' : '0% active',
      icon: Users,
      color: 'text-[var(--accent-purple)]'
    }
  ];

  // Filter data based on search
  const filteredSettlements = settlements.filter(s =>
    s.settlementId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.driver?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredDeductions = deductions.filter(d =>
    d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.assignedTo?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredMilesTracking = milesTracking.filter(m =>
    m.driver?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.vehicle?.plateNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.vehicle?.unitNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.vehicle?.internalId?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-main ">
      {notification && (
        <div className={`fixed top-4 right-4 z-[10000] flex items-center gap-3 px-6 py-4 rounded-lg shadow-lg ${notification.type === 'success' ? 'bg-green-500' : 'bg-red-500'
          } text-white`}>
          {notification.type === 'success' ? (
            <CheckCircle size={20} />
          ) : (
            <AlertCircle size={20} />
          )}
          <span>{notification.message}</span>
          <button onClick={() => setNotification(null)}>
            <X size={20} />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="p-5">
        <div className="bg-card border-b border-theme">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-headings" >Settlement Management</h1>
                <p className="text-sm text-secondary mt-1">
                  Manage driver settlements, deductions/additions, and miles tracking for IFTA reporting
                </p>
              </div>
              {activeTab === 'driver-settlements' && (
                <button
                  onClick={() => {
                    setEditingItem(null);
                    setSettlementForm({
                      driver: '',
                      payPeriod: { startDate: '', endDate: '' },
                      grossPay: '',
                      deductions: '0',
                      additions: '0',
                      status: 'Pending',
                      paymentMethod: '',
                      paymentReference: '',
                      notes: ''
                    });
                    setShowSettlementModal(true);
                  }}

                  className="px-4 py-2 hover:shadow-lg hover:scale-105 transform duration-200 !text-white rounded-lg transition-all flex items-center gap-2 bg-[var(--accent-navyblue)]"

                >
                  <Plus className="w-4 h-4" />
                  New Settlement Generation
                </button>
              )}
            </div>
          </div>

          {/* Tabs */}
          <div className="px-6">
            <div className="flex gap-1 border-b border-theme">
              {tabs.map(tab => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === tab.id
                      ? 'border-[var(--accent-blue)] text-[var(--accent-navyblue)]'
                      : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--accent-navyblue)] hover:border-theme'
                      }`}
                  >
                    <Icon className="w-4 h-4 text-current" /> {/* ✅ important */}
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
      {/* Summary Cards */}
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {summaryCards.map((card, index) => {
            const Icon = card.icon;

            return (
              <div
                key={index}
                className="rounded-xl border border-theme bg-card p-6 shadow-sm hover:shadow-md transition-all"
              >
                <div className="flex items-center justify-between mb-4 flex-nowrap ">

                  {/* Icon */}
                  <div className=" rounded-lg bg-card  ">
                    <div className='flex gap-1 flex-nowrap'>
                      <Icon
                        className={`w-4 h-4 ${card.color
                          }`}
                      />
                      {/* Title */}
                      <h3 className="text-secondary text-sm font-medium mb-1">
                        {card.title}
                      </h3>
                    </div>
                  </div>

                  {/* Change */}
                  <span className={`text-sm font-medium  ${card.color}  mx-0 my-0`}>
                    {card.change}
                  </span>
                </div>



                {/* Value */}
                <p className="text-2xl font-bold text-[var(--text-primary)]">
                  {card.value}
                </p>
              </div>
            );
          })}
        </div>

        {/* Main Content */}
        <div className="bg-card rounded-lg shadow">
          {/* Toolbar */}
          <div className="p-4 border-b border-theme flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-secondary w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-theme rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-64"
                />
              </div>
              <button className="p-2 border border-theme rounded-lg hover:bg-[rgba(255,255,255,0.03)] transition-colors">
                <Filter className="w-4 h-4 text-secondary" />
              </button>
            </div>
            <div className="flex items-center gap-2">
              <button className="px-4 py-2 text-sm border border-theme rounded-lg hover:bg-[rgba(255,255,255,0.03)] transition-colors flex items-center gap-2">
                <Download className="w-4 h-4" />
                Export
              </button>
              {activeTab === 'deductions-additions' && (
                <button
                  onClick={() => {
                    setEditingItem(null);
                    setDeductionForm({
                      name: '',
                      type: 'Deduction',
                      recurrence: 'One-time',
                      amount: '',
                      assignedTo: '',
                      startDate: '',
                      endDate: '',
                      description: ''
                    });
                    setShowDeductionModal(true);
                  }}
                  className="px-4 py-2 text-sm hover:shadow-lg hover:scale-105 transform duration-200 !text-white rounded-lg transition-all flex items-center gap-2 bg-[var(--accent-navyblue)]"

                >
                  <Plus className="w-4 h-4" />
                  Add New
                </button>
              )}
              {activeTab === 'miles-tracking' && (
                <button
                  onClick={() => {
                    setEditingItem(null);
                    setMilesForm({
                      date: '',
                      vehicle: '',
                      driver: '',
                      state: '',
                      totalMiles: '',
                      loadedMiles: '0',
                      emptyMiles: '0',
                      iftaMiles: '',
                      notes: ''
                    });
                    setShowMilesModal(true);
                  }}
                  className="px-4 py-2 text-sm hover:shadow-lg hover:scale-105 transform duration-200 !text-white rounded-lg transition-all flex items-center gap-2"

                >
                  <Plus className="w-4 h-4" />
                  Add New
                </button>
              )}
            </div>
          </div>

          {/* Driver/O-O Settlements List */}
          {activeTab === 'driver-settlements' && (
            <div className="overflow-x-auto">
              {loading ? (
                <div className="flex justify-center items-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                </div>
              ) : filteredSettlements.length === 0 ? (
                <div className="text-center py-12 text-secondary">
                  No settlements found
                </div>
              ) : (
                <table className="w-full">
                  <thead className="bg-card border-b border-theme text-headings">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium  uppercase tracking-wider">Settlement ID</th>
                      <th className="px-6 py-3 text-left text-xs font-medium  uppercase tracking-wider">Pay Period</th>
                      <th className="px-6 py-3 text-left text-xs font-medium  uppercase tracking-wider">Payee</th>
                      <th className="px-6 py-3 text-left text-xs font-medium  uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium  uppercase tracking-wider">Gross Pay</th>
                      <th className="px-6 py-3 text-left text-xs font-medium  uppercase tracking-wider">Deductions</th>
                      <th className="px-6 py-3 text-left text-xs font-medium  uppercase tracking-wider">Net Pay</th>
                      <th className="px-6 py-3 text-left text-xs font-medium  uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-card divide-y divide-theme divide-white/5">
                    {filteredSettlements.map(settlement => (
                      <tr
                        key={settlement._id}
                        className="hover:bg-[rgba(255,255,255,0.03)] cursor-pointer transition-colors"
                        onClick={() => {
                          setSelectedItem({ ...settlement, type: 'settlement' });
                          setShowDetailModal(true);
                        }}
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-[#00D1FF]">{settlement.settlementId}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary">
                          {formatPayPeriod(settlement.payPeriod.startDate, settlement.payPeriod.endDate)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary">{settlement.driver?.name || 'Unknown'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${settlement.status === 'Paid' ? 'bg-green-100 text-green-800' :
                            settlement.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' :
                              settlement.status === 'Processing' ? 'bg-blue-100 text-blue-800' :
                                'bg-card text-secondary'
                            }`}>
                            {settlement.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary">${settlement.grossPay.toLocaleString()}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-[#A855F7]">-${settlement.deductions.toLocaleString()}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-secondary">${settlement.netPay.toLocaleString()}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center gap-2">

                            <button
                              onClick={() => {
                                setEditingItem(settlement);
                                setSettlementForm({
                                  driver: settlement.driver._id,
                                  payPeriod: {
                                    startDate: settlement.payPeriod.startDate.split('T')[0],
                                    endDate: settlement.payPeriod.endDate.split('T')[0]
                                  },
                                  grossPay: settlement.grossPay.toString(),
                                  deductions: settlement.deductions.toString(),
                                  additions: settlement.additions.toString(),
                                  status: settlement.status,
                                  paymentMethod: '',
                                  paymentReference: '',
                                  notes: ''
                                });
                                setShowSettlementModal(true);
                              }}
                              className="p-1   rounded hover:bg-[var(--accent-blue)]/10"
                              title="Edit"
                            >
                              <Edit className="w-4 h-4 text-[var(--accent-blue)]" />
                            </button>

                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* Deductions & Additions Manager */}
          {activeTab === 'deductions-additions' && (
            <div className="overflow-x-auto">
              {loading ? (
                <div className="flex justify-center items-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                </div>
              ) : filteredDeductions.length === 0 ? (
                <div className="text-center py-12 text-secondary">
                  No deductions/additions found
                </div>
              ) : (
                <table className="w-full">
                  <thead className="bg-card border-b border-theme">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-headings uppercase tracking-wider">Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-headings uppercase tracking-wider">Type</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-headings uppercase tracking-wider">Recurrence</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-headings uppercase tracking-wider">Amount</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-headings uppercase tracking-wider">Assigned To</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-headings uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-card divide-y divide-theme divide-white/5 ">
                    {filteredDeductions.map(item => (
                      <tr
                        key={item._id}
                        className="hover:bg-[rgba(255,255,255,0.03)] cursor-pointer transition-colors"
                        onClick={() => {
                          setSelectedItem({ ...item, type: 'deduction' });
                          setShowDetailModal(true);
                        }}
                      >
                        <td className="px-6 py-4 text-sm font-medium text-secondary">{item.name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 w-fit ${item.type === 'Addition' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}>
                            {item.type === 'Addition' ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                            {item.type}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary">{item.recurrence}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-secondary">${item.amount.toLocaleString()}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary">
                          {item.assignedTo?.name || <span className="italic text-red-400">Deleted user</span>}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                setEditingItem(item);
                                setDeductionForm({
                                  name: item.name,
                                  type: item.type,
                                  recurrence: item.recurrence as 'One-time' | 'Weekly' | 'Bi-weekly' | 'Monthly' | 'Quarterly' | 'Yearly',
                                  amount: item.amount.toString(),
                                  assignedTo: item.assignedTo?._id || '',
                                  startDate: '',
                                  endDate: '',
                                  description: ''
                                });
                                setShowDeductionModal(true);
                              }}
                              className="p-1  hover:bg-blue-50 rounded"
                            >
                              <Edit className="w-4 h-4 text-[var(--accent-blue)]" />
                            </button>
                            <button
                              onClick={() => handleDelete(item._id, 'deduction')}
                              className="p-1 text-[#A855F7] hover:bg-red-50 rounded"
                            >
                              <Trash2 className="w-4 h-4 text-[var(--accent-red)]" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* Miles Tracking & Reporting */}
          {activeTab === 'miles-tracking' && (
            <div className="overflow-x-auto">
              {loading ? (
                <div className="flex justify-center items-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                </div>
              ) : filteredMilesTracking.length === 0 ? (
                <div className="text-center py-12 text-secondary">
                  No miles tracking records found
                </div>
              ) : (
                <table className="w-full">
                  <thead className="bg-card border-b border-theme">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">Vehicle</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">Driver</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">State/Province</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">Total Miles</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">Loaded Miles</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">Empty Miles</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">IFTA Miles</th>
                    </tr>
                  </thead>
                  <tbody className="bg-card divide-y divide-theme divide-white/5">
                    {filteredMilesTracking.map(record => (
                      <tr
                        key={record._id}
                        className="hover:bg-[rgba(255,255,255,0.03)] cursor-pointer transition-colors"
                        onClick={() => {
                          setSelectedItem({ ...record, type: 'miles' });
                          setShowDetailModal(true);
                        }}
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-primary">
                          {new Date(record.date).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-[#00D1FF]">
                          {record.vehicle?.plateNumber || record.vehicle?.unitNumber || record.vehicle?.internalId || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-primary">{record.driver?.name || 'Unknown'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-medium">
                            {record.state}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-primary">{record.totalMiles}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">{record.loadedMiles}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-[#F59E0B]">{record.emptyMiles}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-[#00D1FF] font-medium">{record.iftaMiles}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Settlement Modal */}
      {
        showSettlementModal && (
          <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-[100] flex items-center justify-center overflow-auto p-4">
            <div className="bg-card rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-theme sticky top-0 bg-card z-10 flex justify-between items-center">
                <h3 className="text-xl font-bold text-[var(--accent-navyblue)]">
                  {editingItem ? 'Edit Settlement' : 'Create New Settlement'}
                </h3>
                <button onClick={() => setShowSettlementModal(false)} className="text-secondary hover:text-secondary">
                  <X size={24} />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--accent-navyblue)] mb-2">Driver *</label>
                  <select
                    value={settlementForm.driver}
                    onChange={(e) => setSettlementForm({ ...settlementForm, driver: e.target.value })}
                    className="w-full px-4 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option className='form-option' value="">Select Driver</option>
                    {Array.isArray(drivers) && drivers.length > 0 ? (
                      drivers.map(driver => (
                        <option className='form-option' key={driver._id} value={driver._id}>
                          {driver.name || driver.email || `Driver ${driver._id}`}
                        </option>
                      ))
                    ) : (
                      <option value="" disabled>No drivers available</option>
                    )}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-headings mb-2">Start Date *</label>
                    <input
                      type="date"
                      value={settlementForm.payPeriod.startDate}
                      onChange={(e) => setSettlementForm({ ...settlementForm, payPeriod: { ...settlementForm.payPeriod, startDate: e.target.value } })}
                      className="w-full px-4 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-blue-500"
                      style={{ colorScheme: 'dark' }}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-headings mb-2">End Date *</label>
                    <input
                      type="date"
                      value={settlementForm.payPeriod.endDate}
                      onChange={(e) =>
                        setSettlementForm({
                          ...settlementForm,
                          payPeriod: {
                            ...settlementForm.payPeriod,
                            endDate: e.target.value,
                          },
                        })
                      }
                      className="w-full px-4 py-2 border border-theme rounded-lg 
  bg-card text-[var(--text-primary)] 
  focus:ring-2 focus:ring-[var(--accent-blue)]"
                      style={{ colorScheme: 'dark' }}   // ✅ important
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-headings mb-2">Gross Pay *</label>
                    <input
                      type="number"
                      value={settlementForm.grossPay}
                      onChange={(e) => setSettlementForm({ ...settlementForm, grossPay: e.target.value })}
                      className="w-full px-4 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-blue-500"
                      required
                      min="0"
                      step="0.01"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-headings mb-2">Deductions</label>
                    <input
                      type="number"
                      value={settlementForm.deductions}
                      onChange={(e) => setSettlementForm({ ...settlementForm, deductions: e.target.value })}
                      className="w-full px-4 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-blue-500"
                      min="0"
                      step="0.01"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-headings mb-2">Additions</label>
                    <input
                      type="number"
                      value={settlementForm.additions}
                      onChange={(e) => setSettlementForm({ ...settlementForm, additions: e.target.value })}
                      className="w-full px-4 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-blue-500"
                      min="0"
                      step="0.01"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-headings mb-2">Status</label>
                  <select
                    value={settlementForm.status}
                    onChange={(e) => setSettlementForm({ ...settlementForm, status: e.target.value as any })}
                    className="w-full px-4 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option className='form-option' value="Pending">Pending</option>
                    <option className='form-option' value="Processing">Processing</option>
                    <option className='form-option' value="Paid">Paid</option>
                    <option className='form-option' value="Cancelled">Cancelled</option>
                  </select>
                </div>
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => setShowSettlementModal(false)}
                    className="flex-1 px-4 py-2 border border-theme rounded-lg hover:bg-[rgba(255,255,255,0.03)]"
                    disabled={submitting}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={async () => {
                      if (!settlementForm.driver || !settlementForm.payPeriod.startDate || !settlementForm.payPeriod.endDate || !settlementForm.grossPay) {
                        showNotification('error', 'Please fill in all required fields');
                        return;
                      }
                      if (!(parseFloat(settlementForm.grossPay) > 0)) {
                        showNotification('error', 'Gross pay must be greater than $0');
                        return;
                      }
                      setSubmitting(true);
                      try {
                        const payload = {
                          driver: settlementForm.driver,
                          payPeriod: {
                            startDate: settlementForm.payPeriod.startDate,
                            endDate: settlementForm.payPeriod.endDate
                          },
                          grossPay: parseFloat(settlementForm.grossPay),
                          deductions: parseFloat(settlementForm.deductions) || 0,
                          additions: parseFloat(settlementForm.additions) || 0,
                          status: settlementForm.status,
                          paymentMethod: settlementForm.paymentMethod || undefined,
                          paymentReference: settlementForm.paymentReference || undefined,
                          notes: settlementForm.notes || undefined
                        };
                        const response = editingItem
                          ? await updateSettlement(editingItem._id, payload)
                          : await createSettlement(payload);
                        if (response?.success) {
                          showNotification('success', editingItem ? 'Settlement updated successfully' : 'Settlement created successfully');
                          setShowSettlementModal(false);
                          fetchSettlements();
                          fetchStats();
                        } else {
                          showNotification('error', response?.message || 'Failed to save settlement');
                        }
                      } catch (error) {
                        showNotification('error', 'Error saving settlement');
                      } finally {
                        setSubmitting(false);
                      }
                    }}
                    style={{
                      background: 'var(--accent-navyblue)'
                    }}
                    className="flex-1 px-4 py-2 !text-white rounded-lg  disabled:opacity-50"
                    disabled={submitting}
                  >
                    {submitting ? 'Saving...' : editingItem ? 'Update' : 'Create'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )
      }

      {/* Deduction/Addition Modal */}
      {
        showDeductionModal && (
          <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-[100] flex items-center justify-center overflow-auto p-4">
            <div className="bg-card rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-theme sticky top-0 bg-card z-10 flex justify-between items-center">
                <h3 className="text-xl font-bold text-headings">
                  {editingItem ? 'Edit Deduction/Addition' : 'Create New Deduction/Addition'}
                </h3>
                <button onClick={() => setShowDeductionModal(false)} className="text-secondary hover:text-secondary">
                  <X size={24} />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-headings mb-2">Name *</label>
                  <input
                    type="text"
                    value={deductionForm.name}
                    onChange={(e) => setDeductionForm({ ...deductionForm, name: e.target.value })}
                    className="w-full px-4 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-headings mb-2">Type *</label>
                    <select
                      value={deductionForm.type}
                      onChange={(e) => setDeductionForm({ ...deductionForm, type: e.target.value as any })}
                      className="w-full px-4 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      <option className='form-option' value="Deduction">Deduction</option>
                      <option className='form-option' value="Addition">Addition</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-headings mb-2">Recurrence *</label>
                    <select
                      value={deductionForm.recurrence}
                      onChange={(e) => setDeductionForm({ ...deductionForm, recurrence: e.target.value as any })}
                      className="w-full px-4 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      <option className='form-option' value="One-time">One-time</option>
                      <option className='form-option' value="Weekly">Weekly</option>
                      <option className='form-option' value="Bi-weekly">Bi-weekly</option>
                      <option className='form-option' value="Monthly">Monthly</option>
                      <option className='form-option' value="Quarterly">Quarterly</option>
                      <option className='form-option' value="Yearly">Yearly</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-headings mb-2">Amount *</label>
                    <input
                      type="number"
                      value={deductionForm.amount}
                      onChange={(e) => setDeductionForm({ ...deductionForm, amount: e.target.value })}
                      className="w-full px-4 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-blue-500"
                      required
                      min="0"
                      step="0.01"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-headings mb-2">Assigned To (Driver) *</label>
                    <select
                      value={deductionForm.assignedTo}
                      onChange={(e) => setDeductionForm({ ...deductionForm, assignedTo: e.target.value })}
                      className="w-full px-4 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      <option className='form-option' value="">Select Driver</option>
                      {drivers.map(driver => (
                        <option className='form-option' key={driver._id} value={driver._id}>{driver.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-headings mb-2">Description</label>
                  <textarea
                    value={deductionForm.description}
                    onChange={(e) => setDeductionForm({ ...deductionForm, description: e.target.value })}
                    className="w-full px-4 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-blue-500"
                    rows={3}
                  />
                </div>
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => setShowDeductionModal(false)}
                    className="flex-1 px-4 py-2 border border-theme rounded-lg hover:bg-[rgba(255,255,255,0.03)]"
                    disabled={submitting}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={async () => {
                      if (!deductionForm.name || !deductionForm.amount || !deductionForm.assignedTo) {
                        showNotification('error', 'Please fill in all required fields');
                        return;
                      }
                      setSubmitting(true);
                      try {
                        const payload = {
                          name: deductionForm.name,
                          type: deductionForm.type,
                          recurrence: deductionForm.recurrence,
                          amount: parseFloat(deductionForm.amount),
                          assignedTo: deductionForm.assignedTo,
                          startDate: deductionForm.startDate || undefined,
                          endDate: deductionForm.endDate || undefined,
                          description: deductionForm.description || undefined
                        };
                        const response = editingItem
                          ? await updateDeductionAddition(editingItem._id, payload)
                          : await createDeductionAddition(payload);
                        if (response?.success) {
                          showNotification('success', editingItem ? 'Updated successfully' : 'Created successfully');
                          setShowDeductionModal(false);
                          fetchDeductions();
                        } else {
                          showNotification('error', response?.message || 'Failed to save');
                        }
                      } catch (error) {
                        showNotification('error', 'Error saving');
                      } finally {
                        setSubmitting(false);
                      }
                    }}
                    style={{ background: 'var(--accent-navyblue)' }}
                    className="flex-1 px-4 py-2  !text-white rounded-lg  disabled:opacity-50"
                    disabled={submitting}
                  >
                    {submitting ? 'Saving...' : editingItem ? 'Update' : 'Create'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )
      }

      {/* Miles Tracking Modal */}
      {
        showMilesModal && (
          <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-[100] flex items-center justify-center overflow-auto p-4">
            <div className="bg-card rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-theme sticky top-0 bg-card z-10 flex justify-between items-center">
                <h3 className="text-xl font-bold text-primary">
                  {editingItem ? 'Edit Miles Tracking' : 'Create New Miles Tracking'}
                </h3>
                <button onClick={() => setShowMilesModal(false)} className="text-secondary hover:text-secondary">
                  <X size={24} />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-primary mb-2">Date *</label>
                    <input
                      type="date"
                      value={milesForm.date}
                      onChange={(e) => setMilesForm({ ...milesForm, date: e.target.value })}
                      className="w-full px-4 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-primary mb-2">State/Province *</label>
                    <input
                      type="text"
                      value={milesForm.state}
                      onChange={(e) => setMilesForm({ ...milesForm, state: e.target.value.toUpperCase() })}
                      className="w-full px-4 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., CA, TX, NY"
                      maxLength={2}
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-primary mb-2">Driver *</label>
                    <select
                      value={milesForm.driver}
                      onChange={(e) => setMilesForm({ ...milesForm, driver: e.target.value })}
                      className="w-full px-4 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      <option value="">Select Driver</option>
                      {drivers.map(driver => (
                        <option key={driver._id} value={driver._id}>{driver.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-primary mb-2">Vehicle *</label>
                    <select
                      value={milesForm.vehicle}
                      onChange={(e) => setMilesForm({ ...milesForm, vehicle: e.target.value })}
                      className="w-full px-4 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      <option value="">Select Vehicle</option>
                      {Array.isArray(vehicles) && vehicles.length > 0 ? (
                        vehicles.map(vehicle => {
                          const vehicleId = vehicle._id;
                          const displayName = vehicle.plateNumber || vehicle.unitNumber || vehicle.internalId || vehicle._id;
                          const makeModel = [vehicle.make, vehicle.model].filter(Boolean).join(' ').trim();
                          const fullDisplayName = makeModel ? `${displayName} - ${makeModel}` : displayName;
                          return (
                            <option key={vehicle._id} value={vehicleId}>
                              {fullDisplayName}
                            </option>
                          );
                        })
                      ) : (
                        <option value="" disabled>No vehicles available</option>
                      )}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-primary mb-2">Total Miles *</label>
                    <input
                      type="number"
                      value={milesForm.totalMiles}
                      onChange={(e) => setMilesForm({ ...milesForm, totalMiles: e.target.value })}
                      className="w-full px-4 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-blue-500"
                      required
                      min="0"
                      step="0.01"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-primary mb-2">IFTA Miles *</label>
                    <input
                      type="number"
                      value={milesForm.iftaMiles}
                      onChange={(e) => setMilesForm({ ...milesForm, iftaMiles: e.target.value })}
                      className="w-full px-4 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-blue-500"
                      required
                      min="0"
                      step="0.01"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-primary mb-2">Loaded Miles</label>
                    <input
                      type="number"
                      value={milesForm.loadedMiles}
                      onChange={(e) => setMilesForm({ ...milesForm, loadedMiles: e.target.value })}
                      className="w-full px-4 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-blue-500"
                      min="0"
                      step="0.01"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-primary mb-2">Empty Miles</label>
                    <input
                      type="number"
                      value={milesForm.emptyMiles}
                      onChange={(e) => setMilesForm({ ...milesForm, emptyMiles: e.target.value })}
                      className="w-full px-4 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-blue-500"
                      min="0"
                      step="0.01"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-primary mb-2">Notes</label>
                  <textarea
                    value={milesForm.notes}
                    onChange={(e) => setMilesForm({ ...milesForm, notes: e.target.value })}
                    className="w-full px-4 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-blue-500"
                    rows={3}
                  />
                </div>
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => setShowMilesModal(false)}
                    className="flex-1 px-4 py-2 border border-theme rounded-lg hover:bg-[rgba(255,255,255,0.03)]"
                    disabled={submitting}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={async () => {
                      if (!milesForm.date || !milesForm.driver || !milesForm.vehicle || !milesForm.state || !milesForm.totalMiles || !milesForm.iftaMiles) {
                        showNotification('error', 'Please fill in all required fields');
                        return;
                      }
                      setSubmitting(true);
                      try {
                        const payload = {
                          date: milesForm.date,
                          driver: milesForm.driver,
                          vehicle: milesForm.vehicle,
                          state: milesForm.state,
                          totalMiles: parseFloat(milesForm.totalMiles),
                          loadedMiles: parseFloat(milesForm.loadedMiles) || 0,
                          emptyMiles: parseFloat(milesForm.emptyMiles) || 0,
                          iftaMiles: parseFloat(milesForm.iftaMiles),
                          notes: milesForm.notes || undefined
                        };
                        const response = editingItem
                          ? await updateMilesTracking(editingItem._id, payload)
                          : await createMilesTracking(payload);
                        if (response?.success) {
                          showNotification('success', editingItem ? 'Updated successfully' : 'Created successfully');
                          setShowMilesModal(false);
                          fetchMilesTracking();
                          fetchStats();
                        } else {
                          showNotification('error', response?.message || 'Failed to save');
                        }
                      } catch (error) {
                        showNotification('error', 'Error saving');
                      } finally {
                        setSubmitting(false);
                      }
                    }}
                    style={{ background: 'var(--accent-navyblue)' }}
                    className="flex-1 px-4 py-2  !text-white rounded-lg  disabled:opacity-50"
                    disabled={submitting}
                  >
                    {submitting ? 'Saving...' : editingItem ? 'Update' : 'Create'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )
      }
      {/* Delete Confirmation Modal */}
      {
        showDeleteModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40">
            <div className="bg-card rounded-lg shadow-xl w-full max-w-md p-6">
              <div className="flex items-center gap-3 mb-4 text-[#A855F7]">
                <Trash2 className="w-6 h-6" />
                <h3 className="text-lg font-bold">Confirm Deletion</h3>
              </div>
              <p className="text-secondary mb-6">
                Are you sure you want to delete this item? This action cannot be undone.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="px-4 py-2 text-primary bg-card rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  className="px-4 py-2 !text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
                  style={{
                    boxShadow: '0 4px 6px -1px rgba(220, 38, 38, 0.3)'
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )
      }

      {/* Detail View Modal */}
      {
        showDetailModal && selectedItem && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="bg-card rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 text-[var(--accent-navyblue)] p-6 flex justify-between items-center rounded-t-xl ">
                <div className="flex items-center gap-3">
                  {selectedItem.type === 'settlement' && <DollarSign className="w-7 h-7 text-[var(--accent-navyblue)]" />}
                  {selectedItem.type === 'deduction' && (selectedItem.type === 'Addition' ? <TrendingUp className="w-7 h-7 text-[var(--accent-navyblue)]" /> : <TrendingDown className="w-7 h-7 text-[var(--accent-navyblue)]" />)}
                  {selectedItem.type === 'miles' && <MapPin className="w-7 h-7 text-[var(--accent-navyblue)]" />}
                  <div>
                    <h3 className="text-2xl font-bold text-[var(--accent-navyblue)]">
                      {selectedItem.type === 'settlement' && 'Settlement Details'}
                      {selectedItem.type === 'deduction' && 'Deduction/Addition Details'}
                      {selectedItem.type === 'miles' && 'Miles Tracking Details'}
                    </h3>
                    <p className="text-white/80 text-sm mt-1">
                      {selectedItem.type === 'settlement' && `ID: ${selectedItem.settlementId}`}
                      {selectedItem.type === 'deduction' && selectedItem.name}
                      {selectedItem.type === 'miles' && `Date: ${new Date(selectedItem.date).toLocaleDateString()}`}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="text-white hover:bg-card/20 rounded-lg p-2 transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="p-6 space-y-6">
                {/* Settlement Details */}
                {selectedItem.type === 'settlement' && (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="bg-card rounded-lg p-4 border-2 border-theme">
                        <label className="text-xs font-semibold text-headings uppercase tracking-wide mb-2 block">Driver/Payee</label>
                        <p className="text-lg font-bold text-secondary">{selectedItem.driver?.name || 'Unknown'}</p>
                        {selectedItem.driver?.email && (
                          <p className="text-sm text-secondary mt-1">{selectedItem.driver.email}</p>
                        )}
                        {selectedItem.driver?.phone && (
                          <p className="text-sm text-secondary">{selectedItem.driver.phone}</p>
                        )}
                        {selectedItem.driver?.internalId && (
                          <p className="text-xs text-[#00D1FF] mt-2">ID: {selectedItem.driver.internalId}</p>
                        )}
                      </div>

                      <div className="bg-card rounded-lg p-4 border-2 border-theme">
                        <label className="text-xs font-semibold text-[var(--accent-purple)] uppercase tracking-wide mb-2 block">Pay Period</label>
                        <p className="text-lg font-bold text-secondary">
                          {formatPayPeriod(selectedItem.payPeriod.startDate, selectedItem.payPeriod.endDate)}
                        </p>
                        <div className="mt-2 space-y-1">
                          <p className="text-sm text-secondary">Start: {new Date(selectedItem.payPeriod.startDate).toLocaleDateString()}</p>
                          <p className="text-sm text-secondary">End: {new Date(selectedItem.payPeriod.endDate).toLocaleDateString()}</p>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-card rounded-lg p-4 border-2 border-theme">
                        <label className="text-xs font-semibold text-[var(--accent-green)] uppercase tracking-wide mb-1 block">Gross Pay</label>
                        <p className="text-3xl font-bold text-secondary">${selectedItem.grossPay.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                      </div>

                      <div className="bg-card rounded-lg p-4 border-2 border-theme">
                        <label className="text-xs font-semibold text-[var(--accent-orange)] uppercase tracking-wide mb-1 block">Status</label>
                        <span className={`inline-block px-4 py-2 rounded-full text-sm font-bold ${selectedItem.status === 'Paid' ? 'bg-green-500 text-white' :
                          selectedItem.status === 'Pending' ? 'bg-yellow-500 text-white' :
                            selectedItem.status === 'Processing' ? 'bg-blue-500 text-white' :
                              'bg-gray-500 text-white'
                          }`}>
                          {selectedItem.status}
                        </span>
                      </div>
                    </div>

                    <div className="bg-card rounded-lg p-4 border border-theme">
                      <h4 className="text-sm font-bold text-headings mb-3 uppercase tracking-wide">Payment Breakdown</h4>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center py-2 border-b border-theme">
                          <span className="text-primary font-medium">Gross Pay</span>
                          <span className="text-lg font-bold text-green-600">${selectedItem.grossPay.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-theme">
                          <span className="text-primary font-medium">Deductions</span>
                          <span className="text-lg font-bold text-[#A855F7]">-${selectedItem.deductions.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-theme">
                          <span className="text-primary font-medium">Additions</span>
                          <span className="text-lg font-bold text-[#00D1FF]">+${selectedItem.additions.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                        <div className="flex justify-between items-center py-3 bg-gradient-to-r from-purple-100 to-purple-200 rounded-lg px-3 mt-3">
                          <span className="text-purple-900 font-bold text-lg">Net Pay</span>
                          <span className="text-2xl font-bold text-purple-900">${selectedItem.netPay.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {/* Deduction/Addition Details */}
                {selectedItem.type === 'deduction' && (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
                        <label className="text-xs font-semibold text-blue-900 uppercase tracking-wide mb-2 block">Name</label>
                        <p className="text-xl font-bold text-blue-900">{selectedItem.name}</p>
                      </div>

                      <div className={`rounded-lg p-4 border ${selectedItem.type === 'Addition'
                        ? 'bg-gradient-to-br from-green-50 to-green-100 border-green-200'
                        : 'bg-gradient-to-br from-red-50 to-red-100 border-red-200'
                        }`}>
                        <label className={`text-xs font-semibold uppercase tracking-wide mb-2 block flex items-center gap-2 ${selectedItem.type === 'Addition' ? 'text-green-900' : 'text-red-900'
                          }`}>
                          {selectedItem.type === 'Addition' ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                          Type
                        </label>
                        <p className={`text-xl font-bold ${selectedItem.type === 'Addition' ? 'text-green-900' : 'text-red-900'}`}>
                          {selectedItem.type}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 border border-purple-200">
                        <label className="text-xs font-semibold text-purple-900 uppercase tracking-wide mb-1 block">Amount</label>
                        <p className="text-3xl font-bold text-purple-700">${selectedItem.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                      </div>

                      <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-4 border border-orange-200">
                        <label className="text-xs font-semibold text-orange-900 uppercase tracking-wide mb-1 block">Recurrence</label>
                        <p className="text-xl font-bold text-orange-900">{selectedItem.recurrence}</p>
                      </div>
                    </div>

                    <div className="bg-gradient-to-br from-cyan-50 to-cyan-100 rounded-lg p-4 border border-cyan-200">
                      <label className="text-xs font-semibold text-cyan-900 uppercase tracking-wide mb-2 block">Assigned To</label>
                      <p className="text-lg font-bold text-cyan-900">{selectedItem.assignedTo?.name || 'Deleted user'}</p>
                      {selectedItem.assignedTo?.email && (
                        <p className="text-sm text-cyan-700 mt-1">{selectedItem.assignedTo.email}</p>
                      )}
                      {selectedItem.assignedTo?.phone && (
                        <p className="text-sm text-cyan-700">{selectedItem.assignedTo.phone}</p>
                      )}
                      {selectedItem.assignedTo?.internalId && (
                        <p className="text-xs text-cyan-600 mt-2">ID: {selectedItem.assignedTo.internalId}</p>
                      )}
                    </div>
                  </>
                )}

                {/* Miles Tracking Details */}
                {selectedItem.type === 'miles' && (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
                        <label className="text-xs font-semibold text-blue-900 uppercase tracking-wide mb-2 block">Date</label>
                        <p className="text-lg font-bold text-blue-900">{new Date(selectedItem.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                      </div>

                      <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 border border-purple-200">
                        <label className="text-xs font-semibold text-purple-900 uppercase tracking-wide mb-2 block">State/Province</label>
                        <span className="inline-block px-4 py-2 bg-purple-500 text-white rounded-full text-xl font-bold">
                          {selectedItem.state}
                        </span>
                      </div>

                      <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
                        <label className="text-xs font-semibold text-green-900 uppercase tracking-wide mb-1 block">Total Miles</label>
                        <p className="text-3xl font-bold text-green-700">{selectedItem.totalMiles.toLocaleString()}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="bg-gradient-to-br from-cyan-50 to-cyan-100 rounded-lg p-4 border border-cyan-200">
                        <label className="text-xs font-semibold text-cyan-900 uppercase tracking-wide mb-2 block">Vehicle</label>
                        <p className="text-lg font-bold text-cyan-900">
                          {selectedItem.vehicle?.plateNumber || selectedItem.vehicle?.internalId || 'N/A'}
                        </p>
                        {selectedItem.vehicle?.make && selectedItem.vehicle?.model && (
                          <p className="text-sm text-cyan-700 mt-1">
                            {selectedItem.vehicle.make} {selectedItem.vehicle.model}
                          </p>
                        )}
                      </div>

                      <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-4 border border-orange-200">
                        <label className="text-xs font-semibold text-orange-900 uppercase tracking-wide mb-2 block">Driver</label>
                        <p className="text-lg font-bold text-orange-900">{selectedItem.driver?.name || 'Unknown'}</p>
                        {selectedItem.driver?.email && (
                          <p className="text-sm text-orange-700 mt-1">{selectedItem.driver.email}</p>
                        )}
                      </div>
                    </div>

                    <div className="bg-card rounded-lg p-4 border border-theme">
                      <h4 className="text-sm font-bold text-primary mb-3 uppercase tracking-wide">Miles Breakdown</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-card rounded-lg p-3 border border-theme">
                          <label className="text-xs text-secondary mb-1 block">Total Miles</label>
                          <p className="text-2xl font-bold text-primary">{selectedItem.totalMiles.toLocaleString()}</p>
                        </div>
                        <div className="bg-card rounded-lg p-3 border border-theme">
                          <label className="text-xs text-secondary mb-1 block">Loaded Miles</label>
                          <p className="text-2xl font-bold text-green-600">{selectedItem.loadedMiles.toLocaleString()}</p>
                        </div>
                        <div className="bg-card rounded-lg p-3 border border-theme">
                          <label className="text-xs text-secondary mb-1 block">Empty Miles</label>
                          <p className="text-2xl font-bold text-[#F59E0B]">{selectedItem.emptyMiles.toLocaleString()}</p>
                        </div>
                        <div className="bg-card rounded-lg p-3 border border-blue-300 bg-card">
                          <label className="text-xs text-[#00D1FF] mb-1 block font-semibold">IFTA Miles</label>
                          <p className="text-2xl font-bold text-blue-700">{selectedItem.iftaMiles.toLocaleString()}</p>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div className="sticky bottom-0 bg-card p-4 border-t border-theme rounded-b-xl flex justify-end">
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="px-6 py-2.5 bg-[var(--accent-navyblue)] !text-white rounded-lg font-semibold hover:shadow-lg hover:scale-105 transform transition-all duration-200"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )
      }
    </div >
  );
}
