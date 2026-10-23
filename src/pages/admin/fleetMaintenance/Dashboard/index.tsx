import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  Calendar,
  DollarSign,
  Truck,
  Clock,
  FileText,
  XCircle,
  Wrench,
  Activity
} from 'lucide-react';
import {  FaCheckCircle } from 'react-icons/fa';
import { getUserRole } from '../../../../utils/auth';
import {
  type ComplianceDashboardResponse,
  type CompliancePmUnit,
  fetchComplianceDashboard
} from '../../../../axios/api/complianceDashboard';



const formatCurrency = (amount: number) => {
  return `CA$${new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount)}`;
};

const ComplianceDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [selectedPeriod, setSelectedPeriod] = useState<'month' | 'ytd'>('month');
  const [data, setData] = useState<ComplianceDashboardResponse['data'] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requiresCompanySetup, setRequiresCompanySetup] = useState(false);

  const getBasePath = () => {
    const role = getUserRole();
    return role === 'Fleet Maintenance Manager' ? '/fleetmaintenance' : '/admin/fleetmaintenance';
  };

  // Fetch dashboard data from API
  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      setError(null);
      setRequiresCompanySetup(false);
      try {
        const response = await fetchComplianceDashboard();
        if (response?.success && response.data) {
          setData(response.data);
          if (response.requiresCompanySetup) {
            setRequiresCompanySetup(true);
          }
        } else {
          setError(response?.message || 'Failed to load dashboard data');
        }
      } catch (err: any) {
        console.error('Error fetching dashboard data:', err);
        setError(err?.response?.data?.message || 'An error occurred while loading dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  // Static data initialization - REMOVED - Now using API
  /* useEffect(() => {
    // Initialize with static data instead of API call
    const staticData: ComplianceDashboardResponse['data'] = {
      fleetOperational: {
        activeTrucks: 45,
        outOfServiceTrucks: 3,
        vehiclesUnderRepair: 5,
        vehiclesWithPendingService: 8
      },
      safetyAlerts: [
        {
          unitNo: 'TR-001',
          makeModel: 'Freightliner Cascadia 2020',
          safetyExpiry: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
          daysUntilExpiry: -5,
          status: 'expired'
        },
        {
          unitNo: 'TR-015',
          makeModel: 'Peterbilt 579 2021',
          safetyExpiry: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
          daysUntilExpiry: 15,
          status: 'warning'
        },
        {
          unitNo: 'TR-028',
          makeModel: 'Kenworth T680 2019',
          safetyExpiry: new Date(Date.now() + 22 * 24 * 60 * 60 * 1000).toISOString(),
          daysUntilExpiry: 22,
          status: 'warning'
        }
      ],
      pmStatus: [
        {
          unitNo: 'TR-005',
          makeModel: 'Volvo VNL 2022',
          currentOdometer: 145000,
          overdueCount: 1,
          dueCount: 2,
          nextServices: [
            {
              type: 'Oil Change',
              dueAt: 140000,
              kmRemaining: -5000,
              status: 'overdue'
            },
            {
              type: 'Tire Rotation',
              dueAt: 150000,
              kmRemaining: 5000,
              status: 'due'
            }
          ]
        },
        {
          unitNo: 'TR-012',
          makeModel: 'Mack Anthem 2021',
          currentOdometer: 98000,
          overdueCount: 0,
          dueCount: 1,
          nextServices: [
            {
              type: 'Brake Inspection',
              dueAt: 100000,
              kmRemaining: 2000,
              status: 'due'
            }
          ]
        },
        {
          unitNo: 'TR-020',
          makeModel: 'International LT 2020',
          currentOdometer: 125000,
          overdueCount: 0,
          dueCount: 0,
          nextServices: [
            {
              type: 'Regular Service',
              dueAt: 130000,
              kmRemaining: 5000,
              status: 'ok'
            }
          ]
        }
      ],
      invoiceSummary: {
        month: {
          total: 45678.50,
          byType: {
            scheduled: 23456.00,
            general: 15678.50,
            safety: 6544.00
          },
          count: 28
        },
        ytd: {
          total: 345678.90,
          byType: {
            scheduled: 187654.50,
            general: 115678.40,
            safety: 42346.00
          },
          count: 198
        }
      },
      inactiveUnits: 7,
      complianceDocuments: [
        {
          _id: 'doc-001',
          documentType: 'safety_inspection',
          documentNumber: 'SI-2024-001',
          expiryDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'expired',
          daysUntilExpiry: -10,
          assetType: 'vehicle',
          unitNo: 'TR-003',
          makeModel: 'Freightliner Cascadia 2019',
          plateNumber: 'ABC-1234',
          unitType: 'Truck'
        },
        {
          _id: 'doc-002',
          documentType: 'registration',
          documentNumber: 'REG-2024-045',
          expiryDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'due',
          daysUntilExpiry: 5,
          assetType: 'vehicle',
          unitNo: 'TR-007',
          makeModel: 'Peterbilt 579 2020',
          plateNumber: 'XYZ-5678',
          unitType: 'Truck'
        },
        {
          _id: 'doc-003',
          documentType: 'insurance',
          documentNumber: 'INS-2024-089',
          expiryDate: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'due',
          daysUntilExpiry: 12,
          assetType: 'vehicle',
          unitNo: 'TR-011',
          makeModel: 'Kenworth T680 2021',
          plateNumber: 'DEF-9012',
          unitType: 'Truck'
        },
        {
          _id: 'doc-004',
          documentType: 'cvor',
          documentNumber: 'CVOR-2024-012',
          expiryDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'expired',
          daysUntilExpiry: -3,
          assetType: 'vehicle',
          unitNo: 'TR-018',
          makeModel: 'Volvo VNL 2018',
          plateNumber: 'GHI-3456',
          unitType: 'Truck'
        },
        {
          _id: 'doc-005',
          documentType: 'annual_inspection',
          documentNumber: 'AI-2024-023',
          expiryDate: new Date(Date.now() + 18 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'due',
          daysUntilExpiry: 18,
          assetType: 'vehicle',
          unitNo: 'TR-025',
          makeModel: 'Mack Anthem 2022',
          plateNumber: 'JKL-7890',
          unitType: 'Truck'
        },
        {
          _id: 'doc-006',
          documentType: 'permit',
          documentNumber: 'PER-2024-056',
          expiryDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'expired',
          daysUntilExpiry: -7,
          assetType: 'trailer',
          unitNo: 'TL-002',
          makeModel: 'Utility Trailer 53ft',
          plateNumber: 'TL-2345',
          unitType: 'Trailer'
        },
        {
          _id: 'doc-007',
          documentType: 'dot_number',
          documentNumber: 'DOT-987654',
          expiryDate: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'due',
          daysUntilExpiry: 25,
          assetType: 'vehicle',
          unitNo: 'TR-032',
          makeModel: 'International LT 2021',
          plateNumber: 'MNO-1357',
          unitType: 'Truck'
        },
        {
          _id: 'doc-008',
          documentType: 'safety_inspection',
          documentNumber: 'SI-2024-078',
          expiryDate: new Date(Date.now() + 35 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'due',
          daysUntilExpiry: 35,
          assetType: 'vehicle',
          unitNo: 'TR-014',
          makeModel: 'Freightliner Cascadia 2021',
          plateNumber: 'PQR-2468',
          unitType: 'Truck'
        },
        {
          _id: 'doc-009',
          documentType: 'registration',
          documentNumber: 'REG-2024-091',
          expiryDate: new Date(Date.now() + 42 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'due',
          daysUntilExpiry: 42,
          assetType: 'trailer',
          unitNo: 'TL-005',
          makeModel: 'Great Dane Trailer 48ft',
          plateNumber: 'TL-5678',
          unitType: 'Trailer'
        },
        {
          _id: 'doc-010',
          documentType: 'insurance',
          documentNumber: 'INS-2024-112',
          expiryDate: new Date(Date.now() + 50 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'due',
          daysUntilExpiry: 50,
          assetType: 'vehicle',
          unitNo: 'TR-019',
          makeModel: 'Peterbilt 389 2020',
          plateNumber: 'STU-3691',
          unitType: 'Truck'
        },
        {
          _id: 'doc-011',
          documentType: 'cvor',
          documentNumber: 'CVOR-2024-045',
          expiryDate: new Date(Date.now() + 28 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'due',
          daysUntilExpiry: 28,
          assetType: 'vehicle',
          unitNo: 'TR-023',
          makeModel: 'Kenworth W900 2019',
          plateNumber: 'VWX-4826',
          unitType: 'Truck'
        },
        {
          _id: 'doc-012',
          documentType: 'annual_inspection',
          documentNumber: 'AI-2024-067',
          expiryDate: new Date(Date.now() + 38 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'due',
          daysUntilExpiry: 38,
          assetType: 'vehicle',
          unitNo: 'TR-029',
          makeModel: 'Volvo VNR 2022',
          plateNumber: 'YZA-7043',
          unitType: 'Truck'
        },
        {
          _id: 'doc-013',
          documentType: 'permit',
          documentNumber: 'PER-2024-084',
          expiryDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'due',
          daysUntilExpiry: 45,
          assetType: 'trailer',
          unitNo: 'TL-008',
          makeModel: 'Wabash Trailer 45ft',
          plateNumber: 'TL-8024',
          unitType: 'Trailer'
        },
        {
          _id: 'doc-014',
          documentType: 'dot_number',
          documentNumber: 'DOT-654321',
          expiryDate: new Date(Date.now() + 55 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'due',
          daysUntilExpiry: 55,
          assetType: 'vehicle',
          unitNo: 'TR-036',
          makeModel: 'Mack Pinnacle 2021',
          plateNumber: 'BCD-9157',
          unitType: 'Truck'
        },
        {
          _id: 'doc-015',
          documentType: 'safety_inspection',
          documentNumber: 'SI-2024-102',
          expiryDate: new Date(Date.now() + 32 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'due',
          daysUntilExpiry: 32,
          assetType: 'trailer',
          unitNo: 'TL-011',
          makeModel: 'Timpte Trailer 53ft',
          plateNumber: 'TL-1065',
          unitType: 'Trailer'
        }
      ]
    };

    setData(staticData);
    setLoading(false);
  }, []); */


  const pmStatus = useMemo<CompliancePmUnit[]>(() => data?.pmStatus || [], [data]);
  const invoiceSummary = useMemo(() => data?.invoiceSummary || null, [data]);
  const inactiveUnits = data?.inactiveUnits || 0;
  const fleetOperational = data?.fleetOperational || {
    activeTrucks: 0,
    outOfServiceTrucks: 0,
    vehiclesUnderRepair: 0,
    vehiclesWithPendingService: 0
  };


  const currentInvoices =
    selectedPeriod === 'month' ? invoiceSummary?.month : invoiceSummary?.ytd;

  // Overdue services count is now calculated from actual VehicleService records in the backend

  if (loading) {
    return (
      <div className="min-h-screen p-4 bg-main px-6 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-blue-500"></div>
      </div>
    );
  }

  // Create dynamic service type cards from pending services
  // Deduplicate by service name (case-insensitive) to prevent duplicate cards
  const pendingServiceCards = data?.pendingServicesByType
    ? (() => {
      console.log('🎴 Frontend: Received pendingServicesByType:', data.pendingServicesByType);
      console.log('🎴 Frontend: Keys:', Object.keys(data.pendingServicesByType));

      const deduplicated = new Map();

      Object.entries(data.pendingServicesByType).forEach(([serviceName, count]) => {
        const numCount = typeof count === 'number' ? count : 0;
        console.log(`  🎴 Processing: "${serviceName}": ${numCount}`);

        if (numCount > 0) {
          // Use lowercase as key for case-insensitive deduplication
          const normalizedKey = serviceName.toLowerCase().trim();

          if (deduplicated.has(normalizedKey)) {
            // Merge counts if duplicate found
            const existing = deduplicated.get(normalizedKey);
            if (existing) {
              existing.count += numCount;
              console.log(`  ⚠️ Frontend: Merged duplicate "${serviceName}" -> "${existing.name}": ${existing.count} total`);
            }
          } else {
            // New service - use original name for display
            deduplicated.set(normalizedKey, {
              name: serviceName.trim(),
              count: numCount
            });
            console.log(`  ➕ Frontend: Added "${serviceName}": ${numCount}`);
          }
        }
      });

      console.log('🎴 Frontend: Final deduplicated cards:', Array.from(deduplicated.values()));

      // Convert to array of card objects
      return Array.from(deduplicated.values()).map(({ name, count }) => ({
        id: `pending-${name.toLowerCase().replace(/\s+/g, '-')}`,
        title: name,
        value: count,
        subtitle: 'Pending',
        icon: Clock,

        // ✅ THEME COLORS
        bgColor: 'bg-[var(--accent-amber)]/10',
        iconColor: 'text-[var(--accent-amber)]',
        textColor: 'text-[var(--accent-amber)]',

        onClick: () => navigate(`${getBasePath()}/scheduled-services-log`)
      }));
    })()
    : [];

  const features = [
    {
      id: 'active-trucks',
      title: 'Active Trucks',
      value: fleetOperational.activeTrucks,
      subtitle: 'In service',
      icon: Activity,
      bgColor: 'bg-[var(--accent-blue)]/10',
      iconColor: 'text-[var(--accent-blue)]',
      textColor: 'text-[var(--accent-blue)]',
      onClick: () => navigate(`${getBasePath()}/trucks`)
    },
    {
      id: 'out-of-service',
      title: 'Out of Service',
      value: fleetOperational.outOfServiceTrucks,
      subtitle: 'Requires attention',
      icon: XCircle,
      bgColor: 'bg-[var(--accent-red)]/10',
      iconColor: 'text-[var(--accent-red)]',
      textColor: 'text-[var(--accent-red)]',
      onClick: () => navigate(`${getBasePath()}/trucks`)
    },
    {
      id: 'under-repair',
      title: 'Under Repair',
      value: fleetOperational.vehiclesUnderRepair,
      subtitle: 'In maintenance',
      icon: Wrench,
      bgColor: 'bg-[var(--accent-amber)]/10',
      iconColor: 'text-[var(--accent-amber)]',
      textColor: 'text-[var(--accent-amber)]',
      onClick: () => navigate(`${getBasePath()}/maintenance-orders-log`)
    },
    {
      id: 'overdue',
      title: 'Overdue Services',
      value: data?.overdueServicesCount || 0,
      subtitle: 'Requires attention',
      icon: Clock,
      bgColor: 'bg-[var(--accent-amber)]/10',
      iconColor: 'text-[var(--accent-amber)]',
      textColor: 'text-[var(--accent-amber)]',
      onClick: () => navigate(`${getBasePath()}/scheduled-services-log`)
    },
    {
      id: 'maintenance',
      title: 'Total Maintenance',
      value: currentInvoices ? formatCurrency(currentInvoices.total) : 'CA$0.00',
      subtitle: selectedPeriod === 'month' ? 'This Month' : 'Year to Date',
      icon: DollarSign,
      bgColor: 'bg-[var(--accent-green)]/10',
      iconColor: 'text-[var(--accent-green)]',
      textColor: 'text-[var(--accent-green)]',
      onClick: () => navigate(`${getBasePath()}/maintenance-orders-log`)
    },
    {
      id: 'inactive',
      title: 'Inactive Units',
      value: inactiveUnits,
      subtitle: 'Retired / Maintenance',
      icon: Truck,
      bgColor: 'bg-[var(--accent-indigo)]/10',
      iconColor: 'text-[var(--accent-indigo)]',
      textColor: 'text-[var(--accent-indigo)]',
      onClick: () => navigate(`${getBasePath()}/trucks`)
    }
  ];

  const invoiceBreakdown = [
    {
      id: 'scheduled',
      title: 'Scheduled',
      subtitle: `${currentInvoices?.count || 0} invoices`,
      value: currentInvoices ? formatCurrency(currentInvoices.byType.scheduled) : 'CA$0.00',
      icon: Calendar,
      bgColor: 'bg-[var(--accent-blue)]/10',
      iconColor: 'text-[var(--accent-blue)]',
      textColor: 'text-[var(--accent-blue)]'
    },
    {
      id: 'general',
      title: 'General',
      subtitle: `${currentInvoices?.count || 0} invoices`,
      value: currentInvoices ? formatCurrency(currentInvoices.byType.general) : 'CA$0.00',
      icon: FileText,
      bgColor: 'bg-[var(--accent-indigo)]/10',
      iconColor: 'text-[var(--accent-indigo)]',
      textColor: 'text-[var(--accent-indigo)]'
    },
    {
      id: 'safety',
      title: 'Safety',
      subtitle: `${currentInvoices?.count || 0} invoices`,
      value: currentInvoices ? formatCurrency(currentInvoices.byType.safety) : 'CA$0.00',
      icon: AlertTriangle,
      bgColor: 'bg-[var(--accent-purple)]/10',
      iconColor: 'text-[var(--accent-purple)]',
      textColor: 'text-[var(--accent-purple)]'
    }
  ];

  return (
    <>
      <div className="min-h-screen bg-main " >
        <div className="w-full mx-auto p-2 relative">
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
                <h1 className="text-xl font-bold text-[var(--accent-navyblue)]">Overview</h1>
                <div className="flex items-center gap-2 text-[var(--accent-navyblue)]/90">
                  <span className="text-xs">Fleet Maintenance</span>
                </div>
              </div>
            </div>

            {/* Alert Messages */}
            {requiresCompanySetup && (
              <div className="mb-4 flex items-center gap-3 bg-amber-50 border border-amber-200 text-amber-700 px-4 py-3 rounded-lg shadow-sm">
                <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm font-medium">Please complete your company settings to view compliance data.</span>
              </div>
            )}

            {error && !requiresCompanySetup && (
              <div className="mb-4 flex items-center gap-3 bg-card border border-red-200 text-red-700 px-4 py-3 rounded-lg shadow-sm">
                <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm font-medium">{error}</span>
              </div>
            )}

            {/* Period Selector */}
            <div className="mb-4 bg-card rounded-lg shadow-sm border border-theme p-4">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <p className="text-xs text-secondary">Reporting Period</p>
                  <h3 className="text-base font-bold text-[var(--accent-navyblue)]">
                    {selectedPeriod === 'month' ? 'This Month' : 'Year to Date'}
                  </h3>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setSelectedPeriod('month')}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${selectedPeriod === 'month'
                      ? 'bg-[var(--accent-navyblue)] !text-white shadow'
                      : 'bg-card text-secondary hover:bg-gray-200'
                      }`}
                  >
                    This Month
                  </button>
                  <button
                    onClick={() => setSelectedPeriod('ytd')}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${selectedPeriod === 'ytd'
                      ? 'bg-[var(--accent-navyblue)] !text-white shadow'
                      : 'bg-card text-secondary hover:bg-gray-200'
                      }`}
                  >
                    Year to Date
                  </button>
                </div>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-4 ">
              {/* Fleet Operational Stats - First Row (Active Trucks, Out of Service, Under Repair) */}
              {features.slice(0, 3).map((feature) => {
                const Icon = feature.icon;
                return (
                  <div
                    key={feature.id}
                    onClick={feature.onClick}
                    className="card-premium cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h3 className={`text-sm font-bold  mb-1 ${feature.textColor}`}>
                          {feature.title}
                        </h3>
                        <div className="flex items-baseline gap-2 mb-0.5">
                          <span className={`text-xl font-bold ${feature.textColor}`}>{feature.value}</span>
                        </div>
                        <p className="text-xs text-secondary">{feature.subtitle}</p>
                      </div>
                      <div className={`${feature.bgColor} rounded-lg p-2 shadow-sm`}>
                        <Icon className={feature.iconColor} size={21} strokeWidth={2} />
                      </div>
                    </div>
                  </div>
                );
              })}
              {/* Dynamic Pending Service Cards - Show first pending service card in first row if available */}
              {pendingServiceCards.slice(0, 1).map((serviceCard) => (
                <div
                  key={serviceCard.id}
                  onClick={serviceCard.onClick}
                  className="card-premium cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
                >
                  <div className="flex items-start justify-between mb-2">

                    <div className="flex-1">
                      <h3 className={`text-sm font-semibold mb-1 ${serviceCard.textColor}`}>
                        {serviceCard.title}
                      </h3>

                      <div className="flex items-baseline gap-2 mb-0.5">
                        <span className={`text-xl font-bold ${serviceCard.textColor}`}>
                          {serviceCard.value}
                        </span>
                      </div>

                      <p className="text-xs text-secondary">
                        {serviceCard.subtitle}
                      </p>
                    </div>

                    <div className={`${serviceCard.bgColor} rounded-lg p-2`}>
                      <Clock
                        className={serviceCard.iconColor}
                        size={21}
                        strokeWidth={2}
                      />
                    </div>

                  </div>
                </div>
              ))}
            </div>

            {/* Additional Stats Cards - Second Row (Safety, Overdue, Maintenance, Inactive, and remaining Pending Service Cards) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
              {/* Safety, Overdue, Maintenance, Inactive cards */}
              {features.slice(3).map((feature) => {
                const Icon = feature.icon;
                return (
                  <div
                    key={feature.id}
                    onClick={feature.onClick}
                    className="card-premium cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h3 className={`text-sm font-bold  mb-1 ${feature.textColor}`}>
                          {feature.title}
                        </h3>
                        <div className="flex items-baseline gap-2 mb-0.5">
                          <span className={`text-xl font-bold ${feature.textColor}`}>{feature.value}</span>
                        </div>
                        <p className="text-xs text-secondary">{feature.subtitle}</p>
                      </div>
                      <div className={`${feature.bgColor} rounded-lg p-2 shadow-sm`}>
                        <Icon className={feature.iconColor} size={21} strokeWidth={2} />
                      </div>
                    </div>
                  </div>
                );
              })}
              {/* Remaining Pending Service Cards (skip first one as it's in first row) */}
              {pendingServiceCards.slice(1).map((serviceCard) => {
                return (
                  <div
                    key={serviceCard.id}
                    onClick={serviceCard.onClick}
                    className={`${serviceCard.bgColor} rounded-lg p-3 shadow-sm hover:shadow-md transition-all cursor-pointer border border-transparent hover:border-[var(--accent-blue)]/20 hover:scale-[1.02] active:scale-[0.98]`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h3 className="text-sm font-bold  mb-1">
                          {serviceCard.title}
                        </h3>
                        <div className="flex items-baseline gap-2 mb-0.5">
                          <span className="text-xl font-bold ">{serviceCard.value}</span>
                        </div>
                        <p className="text-xs text-secondary">{serviceCard.subtitle}</p>
                      </div>
                      <div className={`${serviceCard.bgColor} rounded-lg p-2 shadow-sm`}>
                        <Clock className={serviceCard.iconColor} size={21} strokeWidth={2} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Invoice Breakdown Section */}
            <div className="bg-card rounded-lg shadow-sm border border-theme overflow-hidden p-6 mb-6">
              <h2 className="text-lg font-bold text-white mb-4">Invoice Breakdown</h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {invoiceBreakdown.map((item) => {
                  const Icon = item.icon;

                  return (
                    <div
                      key={item.id}
                      onClick={() => navigate(`${getBasePath()}/invoices`)}
                      className="card-premium cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
                    >
                      <div className="flex items-center justify-between mb-3">

                        <div className={`${item.bgColor} p-2 rounded-lg`}>
                          <Icon className={`h-5 w-5 ${item.iconColor}`} />
                        </div>

                        <span className={`text-lg font-bold ${item.textColor}`}>
                          {item.value}
                        </span>

                      </div>

                      <p className={`text-sm font-semibold ${item.textColor}`}>
                        {item.title}
                      </p>

                      <p className="text-xs text-secondary mt-1">
                        {item.subtitle}
                      </p>

                    </div>
                  );
                })}
              </div>
            </div>


            {/* Scheduled Service Status */}
            <div className="bg-card rounded-lg shadow-sm border border-theme overflow-hidden">
              <div
                onClick={() => navigate(`${getBasePath()}/scheduled-services-log`)}
                className="px-6 py-4 border-b border-theme bg-card cursor-pointer hover:bg-[rgba(255,255,255,0.03)] transition-colors"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-white flex items-center">
                    <Calendar className="h-5 w-5 mr-2 text-white" />
                    Scheduled Service Status
                  </h3>
                  <span className="text-sm text-secondary">View All →</span>
                </div>
                <p className="text-xs text-secondary mt-1 ml-7">Next service due for each active unit</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-card">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-headings uppercase">Unit No.</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-headings uppercase">Type</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-headings uppercase">Make/Model</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-headings uppercase">Current Odometer</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-headings uppercase">Next Service Due</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-headings uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-theme divide-white/5 ">
                    {pmStatus.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-secondary">
                          No data available. Please configure custom services in Company Settings and ensure units have completed service history.
                        </td>
                      </tr>
                    ) : (
                      pmStatus.map((unit) => {
                        // Get the earliest upcoming service (including "ok" status to show what's next)
                        const nextService = [...unit.nextServices]
                          .sort((a, b) => {
                            // Sort by dueDate if available (days-based), otherwise by kmRemaining
                            if (a.dueDate && b.dueDate) {
                              return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
                            }
                            if (a.dueDate) return -1; // Days-based services come first
                            if (b.dueDate) return 1;
                            return a.kmRemaining - b.kmRemaining;
                          })[0];

                        return (
                          <tr
                            key={unit.unitNo}
                            className={`hover:bg-[rgba(255,255,255,0.03)] transition-colors ${unit.overdueCount > 0 ? 'bg-card' : unit.dueCount > 0 ? 'bg-card' : ''
                              }`}
                          >
                            <td className="px-6 py-4 font-medium text-secondary">{unit.unitNo}</td>
                            <td className="px-6 py-4">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${unit.unitType === 'Truck'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-purple-100 text-purple-800'
                                }`}>
                                {unit.unitType || 'N/A'}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-secondary">{unit.makeModel || '—'}</td>
                            <td className="px-6 py-4 text-secondary">{unit.currentOdometer.toLocaleString()} km</td>
                            <td className="px-6 py-4">
                              {nextService ? (
                                <div>
                                  <p className="font-medium text-secondary">{nextService.type}</p>
                                  <p className="text-sm text-secondary">
                                    {nextService.dueDate ? (
                                      // Days-based service
                                      (() => {
                                        const today = new Date();
                                        today.setHours(0, 0, 0, 0);
                                        const dueDate = new Date(nextService.dueDate);
                                        const daysRemaining = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                                        if (daysRemaining < 0) {
                                          return `OVERDUE by ${Math.abs(daysRemaining)} day${Math.abs(daysRemaining) !== 1 ? 's' : ''}`;
                                        } else if (daysRemaining <= 7) {
                                          return `${daysRemaining} day${daysRemaining !== 1 ? 's' : ''} remaining (${dueDate.toLocaleDateString()})`;
                                        } else {
                                          return `${daysRemaining} day${daysRemaining !== 1 ? 's' : ''} until due (${dueDate.toLocaleDateString()})`;
                                        }
                                      })()
                                    ) : (
                                      // Km/miles-based service
                                      nextService.kmRemaining <= 0
                                        ? `OVERDUE by ${Math.abs(nextService.kmRemaining).toLocaleString()} km`
                                        : nextService.status === 'ok'
                                          ? `${nextService.kmRemaining.toLocaleString()} km until due`
                                          : `${nextService.kmRemaining.toLocaleString()} km remaining`
                                    )}
                                  </p>
                                </div>
                              ) : unit.nextServices.length === 0 ? (
                                <span className="text-secondary text-sm">No services configured</span>
                              ) : (
                                <span className="text-secondary text-sm">No upcoming services</span>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              {unit.overdueCount > 0 ? (
                                <span className="inline-flex px-3 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                                  <XCircle className="mr-1" size={12} /> {unit.overdueCount} Overdue
                                </span>
                              ) : unit.dueCount > 0 ? (
                                <span className="inline-flex px-3 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                                  <AlertTriangle className="mr-1" size={12} /> {unit.dueCount} Due Soon
                                </span>
                              ) : (
                                <span className="inline-flex px-3 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                                  <FaCheckCircle className="mr-1" size={12} /> OK
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ComplianceDashboard;