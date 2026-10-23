import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { Truck, Users, Package, Loader2, Search, ChevronLeft, ChevronRight, Plus, Route, TrendingUp, Calendar, UserCheck, UserX, DollarSign } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  getDispatcherDashboard,
  listDriver,
  listTrip,
  listOrder,
  getOrderById,
  updateOrder
} from "../../../../axios/api/distapcher";
import NewOrderSidebar from "./order-list/NewOrderSidebar";
import { listFleetUnits, type FleetUnitDto } from "../../../../axios/api/fleet.units";
import { getUserRole } from "../../../../utils/auth";


interface DashboardStats {
  vehicles: {
    total: number;
    active: number;
    withDriver: number;
  };
  trailers: {
    total: number;
    active: number;
    inUse: number;
  };
  drivers: {
    total: number;
    active: number;
    onShift: number;
  };
  trips: {
    total: number;
    planned: number;
    inProgress: number;
    completed: number;
    today: number;
    tomorrow: number;
  };
}

interface Driver {
  _id: string;
  name: string;
  email?: string;
  phone?: string;
  status?: string;
  internalId?: string;
  details?: {
    vehicle?: any;
    licenceNumber?: string;
    employeeCode?: string;
  };
}

type FleetUnit = FleetUnitDto;

interface Trip {
  _id: string;
  tripNumber: string;
  driver?: {
    _id: string;
    name: string;
    email?: string;
    phone?: string;
  };
  truck?: {
    _id: string;
    plateNumber?: string;
    internalId?: string;
    make?: string;
    model?: string;
  };
  trailer?: {
    _id: string;
    plateNumber?: string;
    trailerNumber?: string;
  };
  orders?: Array<{
    _id: string;
    orderNumber: string;
    customerOrderNo?: string;
    status?: string;
    customer?: any;
  }>;
  status: 'planned' | 'in-progress' | 'completed' | 'cancelled';
  plannedStartDate?: string | null;
  plannedEndDate?: string;
  actualStartDate?: string;
  actualEndDate?: string;
  notes?: string;
}
type PaymentStatus = 'PENDING' | 'PAID' | 'OVERDUE';

interface Order {
  id: string;
  orderNo: string;
  custOrderNo?: string;
  tripNo?: string;
  orderDate?: string;
  orderType?: string;
  totalItems?: number;
  companyName?: string;
  customerName?: string;
  pickupDate?: string;
  pickupLocation?: string;
  pickupRefNo?: string;
  deliveryDate?: string;
  deliveryLocation?: string;
  deliveryRefNo?: string;
  totalAmount?: string;
  currency?: string;
  status: string;
  driver?: string;
  coDriver?: string;
  truckNo?: string;
  trailerNo?: string;
  paymentStatus?: PaymentStatus;
  // Keep original fields if needed for broader compatibility, or just use the mapped ones. 
  // For this component, we only use the mapped ones.
}





interface FeatureCard {
  id: string;
  title: string;
  value: string;
  subtitle: string;
  icon: React.ComponentType<any>;
  bgColor: string;
  iconColor: string;
  accentColor: string;
  percentage: number;
}

const Index = () => {
  const navigate = useNavigate();
  const userRole = getUserRole();
  const isDispatcher = userRole === 'dispatcher';
  const basePath = isDispatcher ? '/dispatch' : '/admin/dispatch';

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [, setDrivers] = useState<Driver[]>([]);
  const [, setVehicles] = useState<FleetUnit[]>([]);
  const [, setTrailers] = useState<FleetUnit[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [orderSearchTerm, setOrderSearchTerm] = useState("");
  const [activeTab,] = useState<"drivers" | "vehicles" | "trailers" | "trips" | "orders">("drivers");

  // Additional dashboard metrics
  const [unassignedDrivers, setUnassignedDrivers] = useState(0);
  const [driversOnLeave, setDriversOnLeave] = useState(0);
  const [truckUtilization, setTruckUtilization] = useState(0);
  const [trailerUtilization, setTrailerUtilization] = useState(0);
  const [revenuePerMile, setRevenuePerMile] = useState(0);
  const [deliveriesToday, setDeliveriesToday] = useState(0);
  const [pickupsToday, setPickupsToday] = useState(0);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(100);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<any>(null);
  // Filter state
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [operationStatusFilter, setOperationStatusFilter] = useState<string>("");
  const [typeFilter, setTypeFilter] = useState<string>("");


  // Refs for scrollbar synchronization
  const topScrollRef = useRef<HTMLDivElement>(null);
  const bottomScrollRef = useRef<HTMLDivElement>(null);

  // Refs for trips table scrollbar synchronization
  const tripsTopScrollRef = useRef<HTMLDivElement>(null);
  const tripsBottomScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);
  const handleSaveOrder = async () => {
    // Order is already saved by the sidebar component
    // Close sidebar first, then refresh the list to get properly formatted data
    setSidebarOpen(false);
    setEditingOrder(null);
    // Wait a moment for the order to be saved in the database
    setTimeout(() => {
      fetchOrders();
    }, 500);
  };
  useEffect(() => {
    if (!loading) {
      setCurrentPage(1);
      setSearchTerm("");
      setStatusFilter("");
      setOperationStatusFilter("");
      setTypeFilter("");
      fetchCurrentData();
    }
  }, [activeTab, loading]);

  // Sync scroll between top and bottom scrollbars
  useEffect(() => {
    const topScroll = topScrollRef.current;
    const bottomScroll = bottomScrollRef.current;

    if (!topScroll || !bottomScroll) return;

    let isScrolling = false;

    const handleTopScroll = () => {
      if (isScrolling) return;
      isScrolling = true;
      bottomScroll.scrollLeft = topScroll.scrollLeft;
      requestAnimationFrame(() => {
        isScrolling = false;
      });
    };

    const handleBottomScroll = () => {
      if (isScrolling) return;
      isScrolling = true;
      topScroll.scrollLeft = bottomScroll.scrollLeft;
      requestAnimationFrame(() => {
        isScrolling = false;
      });
    };

    // Sync scroll widths
    const syncScrollWidths = () => {
      const bottomScrollWidth = bottomScroll.scrollWidth;
      const topInner = topScroll.querySelector('.top-scroll-content') as HTMLElement;
      if (topInner && bottomScrollWidth > 0) {
        topInner.style.width = `${bottomScrollWidth}px`;
        topScroll.scrollLeft = bottomScroll.scrollLeft;
      }
    };

    // Initial sync - wait for table to render
    const timeoutId = setTimeout(syncScrollWidths, 100);
    const timeoutId2 = setTimeout(syncScrollWidths, 300);
    const timeoutId3 = setTimeout(syncScrollWidths, 500);

    // Observe table changes
    const tableObserver = new MutationObserver(() => {
      syncScrollWidths();
    });

    const bottomTable = bottomScroll.querySelector('table');
    if (bottomTable) {
      tableObserver.observe(bottomTable, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['style', 'class']
      });
    }

    topScroll.addEventListener('scroll', handleTopScroll, { passive: true });
    bottomScroll.addEventListener('scroll', handleBottomScroll, { passive: true });
    window.addEventListener('resize', syncScrollWidths);

    return () => {
      clearTimeout(timeoutId);
      clearTimeout(timeoutId2);
      clearTimeout(timeoutId3);
      tableObserver.disconnect();
      topScroll.removeEventListener('scroll', handleTopScroll);
      bottomScroll.removeEventListener('scroll', handleBottomScroll);
      window.removeEventListener('resize', syncScrollWidths);
    };
  }, [orders, loading, activeTab]);

  // Sync scroll between top and bottom scrollbars for trips table
  useEffect(() => {
    const topScroll = tripsTopScrollRef.current;
    const bottomScroll = tripsBottomScrollRef.current;

    if (!topScroll || !bottomScroll) return;

    let isScrolling = false;

    const handleTopScroll = () => {
      if (isScrolling) return;
      isScrolling = true;
      bottomScroll.scrollLeft = topScroll.scrollLeft;
      requestAnimationFrame(() => {
        isScrolling = false;
      });
    };

    const handleBottomScroll = () => {
      if (isScrolling) return;
      isScrolling = true;
      topScroll.scrollLeft = bottomScroll.scrollLeft;
      requestAnimationFrame(() => {
        isScrolling = false;
      });
    };

    // Sync scroll widths
    const syncScrollWidths = () => {
      const bottomScrollWidth = bottomScroll.scrollWidth;
      const topInner = topScroll.querySelector('.trips-top-scroll-content') as HTMLElement;
      if (topInner && bottomScrollWidth > 0) {
        topInner.style.width = `${bottomScrollWidth}px`;
        topScroll.scrollLeft = bottomScroll.scrollLeft;
      }
    };

    // Initial sync - wait for table to render
    const timeoutId = setTimeout(syncScrollWidths, 100);
    const timeoutId2 = setTimeout(syncScrollWidths, 300);
    const timeoutId3 = setTimeout(syncScrollWidths, 500);

    // Observe table changes
    const tableObserver = new MutationObserver(() => {
      syncScrollWidths();
    });

    const bottomTable = bottomScroll.querySelector('table');
    if (bottomTable) {
      tableObserver.observe(bottomTable, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['style', 'class']
      });
    }

    topScroll.addEventListener('scroll', handleTopScroll, { passive: true });
    bottomScroll.addEventListener('scroll', handleBottomScroll, { passive: true });
    window.addEventListener('resize', syncScrollWidths);

    return () => {
      clearTimeout(timeoutId);
      clearTimeout(timeoutId2);
      clearTimeout(timeoutId3);
      tableObserver.disconnect();
      topScroll.removeEventListener('scroll', handleTopScroll);
      bottomScroll.removeEventListener('scroll', handleBottomScroll);
      window.removeEventListener('resize', syncScrollWidths);
    };
  }, [trips, loading, activeTab]);

  const extractLocationString = (location: any): string => {
    if (!location) return '';
    if (typeof location === 'string') return location;
    if (typeof location !== 'object') return '';

    try {
      // Try different paths to get the location string
      // First check if place field exists
      if (location.place && typeof location.place === 'string') {
        return location.place;
      }

      // Check if placeId is populated (object) with currentLocation
      if (location.placeId) {
        if (typeof location.placeId === 'object' && location.placeId !== null) {
          // Check for populated Place object
          if (location.placeId.currentLocation?.address && typeof location.placeId.currentLocation.address === 'string') {
            return location.placeId.currentLocation.address;
          }
          if (location.placeId.name && typeof location.placeId.name === 'string') {
            return location.placeId.name;
          }
        }
      }

      // Fallback to other fields
      if (location.address && typeof location.address === 'string') {
        return location.address;
      }
      if (location.name && typeof location.name === 'string') {
        return location.name;
      }
    } catch (error) {
      console.error('Error extracting location string:', error);
    }

    return '';
  };

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      const dashboardRes = await getDispatcherDashboard();

      if (dashboardRes.success && dashboardRes.data) {
        const data = dashboardRes.data;

        const totalVehicles = data.totalVehicles ?? data.truckUtilization?.total ?? 0;
        const activeVehicles = data.activeVehicles ?? data.truckUtilization?.active ?? 0;
        const totalTrailers = data.totalTrailers ?? data.trailerUtilization?.total ?? 0;
        const activeTrailers = data.activeTrailers ?? data.trailerUtilization?.active ?? 0;

        setStats({
          vehicles: {
            total: totalVehicles,
            active: activeVehicles,
            withDriver: data.vehiclesWithDriver ?? 0,
          },
          trailers: {
            total: totalTrailers,
            active: activeTrailers,
            inUse: data.trailersInUse ?? 0,
          },
          drivers: {
            total: data.totalDrivers ?? 0,
            active: data.activeDrivers ?? 0,
            onShift: data.driversOnShift ?? 0,
          },
          trips: {
            total: data.totalTrips ?? 0,
            planned: data.plannedTrips ?? 0,
            inProgress: data.inProgressTrips ?? 0,
            completed: data.completedTrips ?? 0,
            today: data.todayTrips ?? 0,
            tomorrow: data.tomorrowTrips ?? 0,
          },
        });

        // Set utilization percentages
        setTruckUtilization(data.truckUtilization?.percentage ?? 0);
        setTrailerUtilization(data.trailerUtilization?.percentage ?? 0);

        // Set revenue per mile
        setRevenuePerMile(data.revenuePerMile ?? 0);

        // Set today's trips count (for deliveries/pickups)
        setDeliveriesToday(data.todayTrips ?? 0);
        setPickupsToday(data.todayTrips ?? 0);

        // Set drivers on leave and unassigned drivers from API response
        setDriversOnLeave(data.driversOnLeave ?? 0);
        setUnassignedDrivers(data.unassignedDrivers ?? 0);
      }

    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
      setTimeout(() => {
        fetchCurrentData();
      }, 100);
    }
  };


  const fetchDrivers = async (page: number = currentPage, search: string = searchTerm, status: string = statusFilter) => {
    try {
      const res = await listDriver({
        page,
        limit: itemsPerPage,
        search: search || undefined,
        status: status || undefined,
        sortBy: 'createdAt',
        sortOrder: 'desc'
      });
      if (res.success) {
        if (res.data) {
          const driversData = Array.isArray(res.data) ? res.data : [];
          const total = res.pagination?.total || res.count || driversData.length || 0;
          setDrivers(driversData);
          setTotalItems(total);
          setTotalPages(res.pagination?.pages || Math.ceil(total / itemsPerPage) || 0);
        } else {
          setDrivers([]);
          setTotalItems(0);
          setTotalPages(0);
        }
      } else {
        setDrivers([]);
        setTotalItems(0);
        setTotalPages(0);
      }
    } catch (error) {
      console.error("Error fetching drivers:", error);
      setDrivers([]);
      setTotalItems(0);
      setTotalPages(0);
    }
  };

  const fetchVehicles = async (_page: number = currentPage, search: string = searchTerm, status: string = statusFilter) => {
    try {
      const res = await listFleetUnits({
        search: search || undefined,
        status: status === "Active" || status === "Inactive" ? status.toLowerCase() as "active" | "inactive" : undefined,
        category: "trucks"
      });
      if (res.success && res.data) {
        const vehicleData = Array.isArray(res.data) ? res.data : [];
        const total = vehicleData.length || 0;
        setVehicles(vehicleData);
        setTotalItems(total);
        setTotalPages(1);
      } else {
        setVehicles([]);
        setTotalItems(0);
        setTotalPages(0);
      }
    } catch (error) {
      console.error("Error fetching vehicles:", error);
      setVehicles([]);
      setTotalItems(0);
      setTotalPages(0);
    }
  };

  const fetchTrailers = async (_page: number = currentPage, search: string = searchTerm, status: string = statusFilter, operationStatus: string = operationStatusFilter, type: string = typeFilter) => {
    try {
      const res = await listFleetUnits({
        search: search || undefined,
        status: status === "Active" || status === "Inactive" ? status.toLowerCase() as "active" | "inactive" : undefined,
        category: "trailers"
      });
      if (res.success && res.data) {
        let trailerData = Array.isArray(res.data) ? res.data : [];

        if (operationStatus) {
          trailerData = trailerData.filter((t: FleetUnit) =>
            t.operationStatus?.toLowerCase() === operationStatus.toLowerCase()
          );
        }

        if (type) {
          trailerData = trailerData.filter((t: FleetUnit) =>
            t.trailerType?.toLowerCase() === type.toLowerCase() ||
            t.unitType?.toLowerCase().includes(type.toLowerCase())
          );
        }

        const total = trailerData.length || 0;
        setTrailers(trailerData);
        setTotalItems(total);
        setTotalPages(1);
      } else {
        setTrailers([]);
        setTotalItems(0);
        setTotalPages(0);
      }
    } catch (error) {
      console.error("Error fetching trailers:", error);
      setTrailers([]);
      setTotalItems(0);
      setTotalPages(0);
    }
  };
  const fetchOrders = async () => {
    // Don't set global loading state to avoid infinite loop with useEffects
    try {
      const response = await listOrder({
        page: currentPage,
        limit: itemsPerPage,
        status: statusFilter || undefined,
      });

      if (response?.success && response?.data) {
        const formattedOrders = response.data.map((order: any) => ({
          id: order._id,
          orderNo: order.orderNumber || order._id,
          custOrderNo: order.customerOrderNo || '',
          tripNo: order.tripNo || '',
          orderDate: order.orderDate
            ? new Date(order.orderDate).toLocaleString('en-US', {
              month: '2-digit',
              day: '2-digit',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
              hour12: true,
            })
            : '',
          orderType: order.orderType || 'Regular',
          totalItems: order.noOfPackages || 0,
          companyName: 'Black River Logistics Ltd',
          customerName: order.customer?.name || 'N/A',
          pickupDate: order.pickupDate
            ? new Date(order.pickupDate).toLocaleDateString('en-US')
            : '',
          pickupLocation: order.pickupLocation || '',
          pickupRefNo: order.pickupRefNo || '',
          deliveryDate: order.deliveryDate
            ? new Date(order.deliveryDate).toLocaleDateString('en-US')
            : '',
          deliveryLocation: order.deliveryLocation || '',
          deliveryRefNo: order.deliveryRefNo || '',
          totalAmount: (order.rate || order.totalAmount || 0).toFixed(2),
          currency: order.rateCurrency || order.currency || 'CAD',
          status: order.status || 'QUOTED',
          driver: order.driver?.name || '',
          coDriver: order.coDriver?.name || '',
          truckNo:
            order.truck?.licensePlate ||
            order.truck?.unitNo ||
            order.truck?.internalId ||
            '',
          trailerNo:
            order.trailer?.licensePlate ||
            order.trailer?.unitNo ||
            '',
        }));

        setOrders(formattedOrders);
        // Set pagination info if available
        if (response.pagination) {
          setTotalItems(response.pagination.total || formattedOrders.length);
          setTotalPages(response.pagination.pages || Math.ceil((response.pagination.total || formattedOrders.length) / itemsPerPage));
        } else {
          setTotalItems(formattedOrders.length);
          setTotalPages(Math.ceil(formattedOrders.length / itemsPerPage));
        }
      } else {
        setOrders([]);
        setTotalItems(0);
        setTotalPages(0);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
      setOrders([]);
      setTotalItems(0);
      setTotalPages(0);
    }
  };




  useEffect(() => {
    if (loading) return;
    const timer = setTimeout(() => {
      setCurrentPage(1);
      fetchCurrentData();
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm]); // Removed loading from dependencies to prevent infinite loop

  useEffect(() => {
    if (loading) return;
    setCurrentPage(1);
    fetchCurrentData();
  }, [statusFilter, operationStatusFilter, typeFilter, itemsPerPage]); // Removed loading from dependencies to prevent infinite loop

  useEffect(() => {
    if (loading) return;
    fetchCurrentData();
  }, [currentPage]); // Removed loading from dependencies to prevent infinite loop

  const fetchTrips = async (page: number = currentPage, search: string = searchTerm, status: string = statusFilter) => {
    try {
      const res = await listTrip({
        page,
        limit: itemsPerPage,
        search: search || undefined,
        status: status || undefined,
      });
      if (res.success) {
        if (res.data) {
          const tripData = Array.isArray(res.data) ? res.data : (res.data.data || []);
          const total = res.pagination?.totalItems || res.pagination?.total || res.count || tripData.length || 0;
          setTrips(tripData);
          setTotalItems(total);
          setTotalPages(res.pagination?.totalPages || res.pagination?.pages || Math.ceil(total / itemsPerPage) || 0);
        } else {
          setTrips([]);
          setTotalItems(0);
          setTotalPages(0);
        }
      } else {
        setTrips([]);
        setTotalItems(0);
        setTotalPages(0);
      }
    } catch (error) {
      console.error("Error fetching trips:", error);
      setTrips([]);
      setTotalItems(0);
      setTotalPages(0);
    }
  };

  const fetchCurrentData = useCallback(() => {
    if (activeTab === "drivers") {
      fetchDrivers(currentPage, searchTerm, statusFilter);
    } else if (activeTab === "vehicles") {
      fetchVehicles(currentPage, searchTerm, statusFilter);
    } else if (activeTab === "trailers") {
      fetchTrailers(currentPage, searchTerm, statusFilter, operationStatusFilter, typeFilter);
    } else if (activeTab === "trips") {
      fetchTrips(currentPage, searchTerm, statusFilter);
    }
    // Always fetch orders regardless of active tab
    fetchOrders();
  }, [activeTab, currentPage, searchTerm, statusFilter, operationStatusFilter, typeFilter, itemsPerPage]);



  const filteredOrders = orders.filter(order => {
    if (!orderSearchTerm) return true;
    const search = orderSearchTerm.toLowerCase();
    return (
      order.orderNo?.toLowerCase().includes(search) ||
      order.custOrderNo?.toLowerCase().includes(search) ||
      order.customerName?.toLowerCase().includes(search) ||
      order.companyName?.toLowerCase().includes(search) ||
      order.tripNo?.toLowerCase().includes(search) ||
      order.driver?.toLowerCase().includes(search) ||
      order.truckNo?.toLowerCase().includes(search) ||
      order.trailerNo?.toLowerCase().includes(search)
    );
  });
  // Build feature cards
  const features: FeatureCard[] = [
    {
      id: "vehicles",
      title: "Total Vehicles",
      value: stats?.vehicles.total.toString() || "0",
      subtitle: `Active: ${stats?.vehicles.active || 0} | With Driver: ${stats?.vehicles.withDriver || 0}`,
      icon: Truck,
      bgColor: "bg-card",
      iconColor: "text-[#00D1FF]",
      accentColor: "bg-blue-600",
      percentage: stats?.vehicles.total ? Math.min(100, (stats.vehicles.active / stats.vehicles.total) * 100) : 0,
    },
    {
      id: "drivers",
      title: "Total Drivers",
      value: stats?.drivers.total.toString() || "0",
      subtitle: `Active: ${stats?.drivers.active || 0} | On Shift: ${stats?.drivers.onShift || 0}`,
      icon: Users,
      bgColor: "bg-[var(--accent-green)]/10",
      iconColor: "text-[var(--accent-green)]",
      accentColor: "bg-green-600",
      percentage: stats?.drivers.total ? Math.min(100, (stats.drivers.active / stats.drivers.total) * 100) : 0,
    },
    {
      id: "trailers",
      title: "Total Trailers",
      value: stats?.trailers.total.toString() || "0",
      subtitle: `Active: ${stats?.trailers.active || 0} | In Use: ${stats?.trailers.inUse || 0}`,
      icon: Package,
      bgColor: "bg-card",
      iconColor: "text-purple-600",
      accentColor: "bg-purple-600",
      percentage: stats?.trailers.total ? Math.min(100, (stats.trailers.active / stats.trailers.total) * 100) : 0,
    },
    {
      id: "trips",
      title: "Total Trips",
      value: stats?.trips.total.toString() || "0",
      subtitle: `Planned: ${stats?.trips.planned || 0} | In Progress: ${stats?.trips.inProgress || 0} | Completed: ${stats?.trips.completed || 0}`,
      icon: Route,
      bgColor: "bg-card",
      iconColor: "text-[#F59E0B]",
      accentColor: "bg-orange-600",
      percentage: stats?.trips.total ? Math.min(100, ((stats.trips.inProgress + stats.trips.completed) / stats.trips.total) * 100) : 0,
    },
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" >
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-[var(--accent-blue)] mx-auto mb-4" />
          <p className="text-secondary">Loading dashboard...</p>
        </div>
      </div>
    );
  }
  const getSafePercentage = (value: number) => {
    if (!value || isNaN(value)) return 0;
    return Math.max(8, Math.min(92, value));
  };


  // Gradient colors
  const getGradient = (type: string) => {
    switch (type) {
      case "blue":
        return "linear-gradient(90deg, #00D1FF, #0066FF)";
      case "green":
        return "linear-gradient(90deg, #00FFA3, #00C853)";
      case "purple":
        return "linear-gradient(90deg, #A855F7, #6D28D9)";
      case "orange":
        return "linear-gradient(90deg, #F59E0B, #F97316)";
      default:
        return "linear-gradient(90deg, #00D1FF, #0066FF)";
    }
  };
  return (
    <>
      <div className="min-h-screen" >
        <div className="relative w-full mx-auto">
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
                <h1 className="text-xl font-bold text-white">Overview</h1>
                <div className="flex items-center gap-2 text-white/90">
                  <span className="text-xs">Dispatch Dashboard</span>
                </div>
              </div>
            </div>


            {/* Stats Cards */}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 -mt-2 mb-4">
              {features.map((feature) => {
                const Icon = feature.icon;

                return (
                  <div
                    key={feature.id}
                    onClick={() =>
                      navigate(
                        `${basePath}/${feature.id === "vehicles" || feature.id === "trailers"
                          ? "fleets"
                          : feature.id
                        }`
                      )
                    }
                    className="
          relative overflow-hidden rounded-xl p-4 cursor-pointer
          bg-gradient-to-br from-[#0B1A2A] to-[#0F2A44]
          border border-white/10
          hover:scale-[1.03] transition-all duration-300
          shadow-md hover:shadow-[0_0_12px_rgba(0,209,255,0.15)]
        "
                  >
                    {/* Glow */}
                    <div className="absolute inset-0 opacity-0 hover:opacity-100 transition duration-500">
                      <div className={`absolute inset-0 blur-2xl opacity-10 ${feature.accentColor}`} />
                    </div>

                    <div className="flex items-start justify-between mb-3 relative z-10">
                      <div>
                        <h3 className="text-sm text-white/70">{feature.title}</h3>
                        <div className="text-2xl font-bold text-white">{feature.value}</div>
                        <p className="text-xs text-white/60">{feature.subtitle}</p>
                      </div>

                      <div className="relative">
                        <div className={`absolute inset-0 blur-lg opacity-25 ${feature.accentColor}`} />
                        <div className="relative bg-white/5 p-2 rounded-lg">
                          <Icon className={feature.iconColor} size={22} />
                        </div>
                      </div>
                    </div>

                    {/* Progress */}
                    <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden relative">
                      <div
                        className="absolute inset-0 blur-md opacity-30"
                        style={{
                          width: `${getSafePercentage(feature.percentage)}%`,
                          background: getGradient(feature.accentColor.includes("blue") ? "blue" :
                            feature.accentColor.includes("green") ? "green" :
                              feature.accentColor.includes("purple") ? "purple" : "orange"),
                        }}
                      />
                      <div
                        className="h-full rounded-full relative overflow-hidden"
                        style={{
                          width: `${getSafePercentage(feature.percentage)}%`,
                          background: getGradient(feature.accentColor.includes("blue") ? "blue" :
                            feature.accentColor.includes("green") ? "green" :
                              feature.accentColor.includes("purple") ? "purple" : "orange"),
                        }}
                      >
                        <div className="absolute inset-0 animate-shimmer" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Additional Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">

              {/* Reusable Card Function */}
              {[
                {
                  title: "Truck Utilization",
                  value: `${truckUtilization}%`,
                  subtitle: "Active trucks in use",
                  icon: Truck,
                  color: "blue",
                  raw: truckUtilization,
                  path: "/utilization"
                },
                {
                  title: "Trailer Utilization",
                  value: `${trailerUtilization}%`,
                  subtitle: "Active trailers in use",
                  icon: Package,
                  color: "purple",
                  raw: trailerUtilization,
                  path: "/utilization"
                },
                {
                  title: "Revenue Per Mile",
                  value: `$${revenuePerMile.toFixed(2)}`,
                  subtitle: "Average revenue per mile",
                  icon: DollarSign,
                  color: "green",
                  raw: revenuePerMile,
                  path: "/revenue-per-mile"
                },
                {
                  title: "Deliveries Today",
                  value: deliveriesToday,
                  subtitle: "Scheduled for today",
                  icon: Calendar,
                  color: "orange",
                  raw: deliveriesToday,
                  path: "/deliveries"
                },
                {
                  title: "Pickups Today",
                  value: pickupsToday,
                  subtitle: "Scheduled for today",
                  icon: TrendingUp,
                  color: "green",
                  raw: pickupsToday,
                  path: "/pickups"
                },
                {
                  title: "Unassigned Drivers",
                  value: unassignedDrivers,
                  subtitle: "Available for assignment",
                  icon: UserX,
                  color: "purple",
                  raw: unassignedDrivers,
                  path: "/drivers?filter=unassigned"
                },
                {
                  title: "Drivers on Leave",
                  value: driversOnLeave,
                  subtitle: "Currently on leave",
                  icon: UserCheck,
                  color: "blue",
                  raw: driversOnLeave,
                  path: "/drivers-on-leave"
                }
              ].map((card, i) => {
                const Icon = card.icon;
                const gradient = getGradient(card.color);
                const percent = getSafePercentage(card.raw);

                return (
                  <div
                    key={i}
                    onClick={() => navigate(`${basePath}${card.path}`)}
                    className="
          relative overflow-hidden rounded-xl p-4 cursor-pointer
          bg-gradient-to-br from-[#0B1A2A] to-[#0F2A44]
          border border-white/10
          hover:scale-[1.03] transition-all duration-300
          shadow-md hover:shadow-[0_0_12px_rgba(0,209,255,0.12)]
        "
                  >
                    {/* Glow Background */}
                    <div className="absolute inset-0 opacity-0 hover:opacity-100 transition duration-500">
                      <div className="absolute inset-0 blur-2xl opacity-10" style={{ background: gradient }} />
                    </div>

                    {/* Content */}
                    <div className="flex items-start justify-between mb-3 relative z-10">
                      <div>
                        <h3 className="text-sm text-white/70">{card.title}</h3>
                        <div className="text-2xl font-bold text-white">{card.value}</div>
                        <p className="text-xs text-white/60">{card.subtitle}</p>
                      </div>

                      {/* Icon Glow */}
                      <div className="relative">
                        <div
                          className="absolute inset-0 blur-lg opacity-25 rounded-full"
                          style={{ background: gradient }}
                        />
                        <div className="relative bg-white/5 p-2 rounded-lg">
                          <Icon className="text-white" size={22} />
                        </div>
                      </div>
                    </div>


                    <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden relative mt-2">

                      {/* Glow base */}
                      <div
                        className="absolute inset-0 blur-md opacity-40"
                        style={{
                          width: `${percent}%`,
                          background: gradient,
                        }}
                      />

                      {/* Main bar */}
                      <div
                        className="h-full rounded-full relative overflow-hidden"
                        style={{
                          width: `${percent}%`,
                          background: gradient,
                        }}
                      >
                        {/* Moving shine */}
                        <div className="absolute inset-0 shimmer-overlay" />

                        {/* Pulse glow */}
                        <div className="absolute inset-0 animate-pulse opacity-30" />
                      </div>
                    </div>
                  </div>
                );
              })}

            </div>


            {/* Orders Table Section - Below Tabs */}
            <div className="bg-card rounded-lg shadow-sm border border-theme overflow-hidden mt-4">
              <div className="px-6 py-4 border-b border-theme flex items-center justify-between">
                <h2 className="text-lg font-semibold text-primary">Orders</h2>
                <button
                  onClick={() => {
                    setEditingOrder(null);
                    setSidebarOpen(true);
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-[var(--accent-navyblue)] !text-white rounded-lg  hover:bg-[var(--accent-navyblue)]/90  transition-colors shadow-sm hover:shadow-md"
                >
                  <Plus className="w-5 h-5" />
                  Add Order
                </button>
              </div>

              {/* Search and Filter Bar for Orders */}
              <div className="p-4 border-b border-theme">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-secondary w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Search orders..."
                    value={orderSearchTerm}
                    onChange={(e) => setOrderSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-[var(--accent-blue)] focus:border-transparent"
                  />
                </div>
              </div>

              {/* Orders Table */}
              {/* Top Scrollbar - Only visible horizontal scrollbar */}
              <style>{`
              .top-scrollbar-container::-webkit-scrollbar {
                height: 8px;
              }
              .top-scrollbar-container::-webkit-scrollbar-track {
                background: #f7fafc;
              }
              .top-scrollbar-container::-webkit-scrollbar-thumb {
                background: #cbd5e0;
                border-radius: 4px;
              }
              .top-scrollbar-container::-webkit-scrollbar-thumb:hover {
                background: #a0aec0;
              }
              .table-container-hidden-scrollbar {
                scrollbar-width: none; /* Firefox */
                -ms-overflow-style: none; /* IE and Edge */
              }
              .table-container-hidden-scrollbar::-webkit-scrollbar {
                display: none; /* Chrome, Safari, Opera */
              }
            `}</style>
              <div
                ref={topScrollRef}
                className="overflow-x-auto overflow-y-hidden top-scrollbar-container"
                style={{
                  maxHeight: '20px',
                  marginBottom: '2px',
                  scrollbarWidth: 'thin',
                  scrollbarColor: '#224c75 #111c24' /* Firefox */
                }}
              >
                <div className="top-scroll-content" style={{ height: '1px' }}></div>
              </div>
              {/* Main Table - Scrollbar hidden, controlled by top scrollbar */}
              <div
                ref={bottomScrollRef}
                className="overflow-x-auto table-container-hidden-scrollbar"
              >
                <table className="w-full">
                  <thead className="bg-card">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-primary uppercase tracking-wider">
                        Order ID
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-primary uppercase tracking-wider">
                        Order Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-primary uppercase tracking-wider">
                        Payment
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-primary uppercase tracking-wider">
                        Company Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-primary uppercase tracking-wider">
                        Customer Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-primary uppercase tracking-wider">
                        Pickup Date/Location/Ref No
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-primary uppercase tracking-wider">
                        Delivery Date/Location/Ref No
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-primary uppercase tracking-wider">
                        Amount
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-primary uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-primary uppercase tracking-wider">
                        Driver
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-primary uppercase tracking-wider">
                        Truck#/Trailer#
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-card">
                    {filteredOrders.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="px-6 py-8 text-center text-secondary">
                          No Orders found
                        </td>
                      </tr>
                    ) : (
                      filteredOrders.map((order) => (
                        <tr
                          key={order.id}
                          className="hover:bg-[rgba(255,255,255,0.03)] cursor-pointer transition-colors"
                          onClick={async () => {
                            try {
                              // Fetch full order data
                              const fullOrderResponse = await getOrderById(order.id);
                              if (fullOrderResponse?.success && fullOrderResponse?.data) {
                                setEditingOrder(fullOrderResponse.data);
                                setSidebarOpen(true);
                              } else {
                                console.error('Failed to fetch order details');
                              }
                            } catch (error) {
                              console.error('Error fetching order:', error);
                            }
                          }}
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-primary">{order.custOrderNo || order.orderNo}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-primary">{order.orderDate}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="relative">
                              <select
                                value={order.paymentStatus || 'PENDING'}
                                onChange={async (e) => {
                                  const newPaymentStatus = e.target.value;
                                  try {
                                    const res = await updateOrder(order.id, { paymentStatus: newPaymentStatus });
                                    if (res?.success) {
                                      fetchOrders();
                                    }
                                  } catch (err) {
                                    console.error('Error updating payment status:', err);
                                  }
                                }}
                                onClick={(e) => e.stopPropagation()}
                                style={{
                                  backgroundColor: "#0F1F2E",
                                  color: "#fff"
                                }}
                                className={`
        text-xs font-medium rounded-full px-3 py-1.5 pr-8
        border appearance-none cursor-pointer outline-none
        bg-[#0F1F2E] border-white/10
        focus:ring-2 focus:ring-[#00D1FF]

        ${order.paymentStatus === 'PAID'
                                    ? 'text-green-400 border-green-400/30'
                                    : order.paymentStatus === 'PENDING'
                                      ? 'text-orange-400 border-orange-400/30'
                                      : order.paymentStatus === 'OVERDUE'
                                        ? 'text-red-400 border-red-400/30'
                                        : 'text-white/80 border-white/10'
                                  }
      `}
                              >
                                <option value="PENDING" className="bg-[#0F1F2E] text-orange-400">
                                  Pending
                                </option>
                                <option value="PAID" className="bg-[#0F1F2E] text-green-400">
                                  Paid
                                </option>
                                <option value="OVERDUE" className="bg-[#0F1F2E] text-red-400">
                                  Overdue
                                </option>
                              </select>

                              {/* Arrow */}
                              <div className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-white/60">
                                ▼
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-primary">
                            {order.companyName}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-primary">
                            {order.customerName}
                          </td>
                          <td className="px-6 py-4" style={{ maxWidth: '300px', minWidth: '200px' }}>
                            {(() => {
                              const pickupLoc = extractLocationString(order.pickupLocation);
                              return pickupLoc ? (
                                <div className="text-sm space-y-1">
                                  <div
                                    className="text-primary break-words"
                                    style={{
                                      maxHeight: '3em',
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                      display: '-webkit-box',
                                      WebkitLineClamp: 2,
                                      WebkitBoxOrient: 'vertical',
                                      wordBreak: 'break-word'
                                    }}
                                    title={pickupLoc}
                                  >
                                    {pickupLoc}
                                  </div>
                                  {order.pickupRefNo && (
                                    <div className="text-secondary text-xs truncate" title={order.pickupRefNo}>
                                      Ref: {order.pickupRefNo}
                                    </div>
                                  )}
                                  {order.pickupDate && <div className="text-[#A855F7] text-xs">{order.pickupDate}</div>}
                                </div>
                              ) : (
                                <span className="text-sm text-secondary">-</span>
                              );
                            })()}
                          </td>
                          <td className="px-6 py-4" style={{ maxWidth: '300px', minWidth: '200px' }}>
                            {(() => {
                              const deliveryLoc = extractLocationString(order.deliveryLocation);
                              return deliveryLoc ? (
                                <div className="text-sm space-y-1">
                                  <div
                                    className="text-primary break-words"
                                    style={{
                                      maxHeight: '3em',
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                      display: '-webkit-box',
                                      WebkitLineClamp: 2,
                                      WebkitBoxOrient: 'vertical',
                                      wordBreak: 'break-word'
                                    }}
                                    title={deliveryLoc}
                                  >
                                    {deliveryLoc}
                                  </div>
                                  {order.deliveryRefNo && (
                                    <div className="text-secondary text-xs truncate" title={order.deliveryRefNo}>
                                      Ref: {order.deliveryRefNo}
                                    </div>
                                  )}
                                  {order.deliveryDate && <div className="text-[#A855F7] text-xs">{order.deliveryDate}</div>}
                                </div>
                              ) : (
                                <span className="text-sm text-secondary">-</span>
                              );
                            })()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-primary">
                              {order.currency || 'CAD'} {order.totalAmount || (order as any).valueOfGoods || '0'}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="relative">
                              <select
                                value={order.status || 'quoted'}
                                onChange={async (e) => {
                                  const newStatus = e.target.value;
                                  try {
                                    const res = await updateOrder(order.id, { status: newStatus });
                                    if (res?.success) {
                                      fetchOrders();
                                    }
                                  } catch (err) {
                                    console.error('Error updating status:', err);
                                  }
                                }}
                                onClick={(e) => e.stopPropagation()}
                                style={{
                                  backgroundColor: "#0F1F2E",
                                  color: "#fff"
                                }}
                                className={`
        text-xs font-medium rounded-full px-3 py-1.5 pr-8
        border appearance-none cursor-pointer outline-none
        bg-[#0F1F2E] border-white/10
        focus:ring-2 focus:ring-[#00D1FF]

        ${order.status === 'quoted'
                                    ? 'text-yellow-400 border-yellow-400/30'
                                    : order.status === 'planned'
                                      ? 'text-blue-400 border-blue-400/30'
                                      : order.status === 'completed'
                                        ? 'text-green-400 border-green-400/30'
                                        : order.status === 'delivered'
                                          ? 'text-purple-400 border-purple-400/30'
                                          : order.status === 'in-delivery'
                                            ? 'text-orange-400 border-orange-400/30'
                                            : order.status === 'canceled'
                                              ? 'text-red-400 border-red-400/30'
                                              : 'text-white/80 border-white/10'
                                  }
      `}
                              >
                                <option value="planned" className="bg-[#0F1F2E] text-white">Planned</option>
                                <option value="quoted" className="bg-[#0F1F2E] text-white">Quoted</option>
                                <option value="in-delivery" className="bg-[#0F1F2E] text-orange-400">In Delivery</option>
                                <option value="delivered" className="bg-[#0F1F2E] text-purple-400">Delivered</option>
                                <option value="completed" className="bg-[#0F1F2E] text-green-400">Completed</option>
                                <option value="canceled" className="bg-[#0F1F2E] text-red-400">Canceled</option>
                              </select>

                              {/* Custom Arrow */}
                              <div className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-white/60">
                                ▼
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-primary">
                            <div className="flex flex-col">
                              <span className="text-sm font-medium text-primary line-clamp-1" title={order.driver || ''}>
                                <span className="text-secondary font-normal mr-1">Driver:</span>
                                {order.driver || "-"}
                              </span>
                              {order.coDriver && (
                                <span className="text-xs font-medium text-primary mt-1 line-clamp-1" title={order.coDriver}>
                                  <span className="text-secondary font-normal mr-1">Co-Driver:</span>
                                  {order.coDriver}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-primary">
                            {order.truckNo || order.trailerNo ? (
                              <div>
                                {order.truckNo && <div>Truck: {order.truckNo}</div>}
                                {order.trailerNo && <div>Trailer: {order.trailerNo}</div>}
                              </div>
                            ) : (
                              "-"
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Orders Pagination */}
              {totalPages > 1 && (
                <div className="px-6 py-4 border-t border-theme bg-card flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-primary">
                      Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems} results
                    </span>
                    <select
                      value={itemsPerPage}
                      onChange={(e) => {
                        setItemsPerPage(Number(e.target.value));
                        setCurrentPage(1);
                      }}
                      className="px-3 py-1.5 border border-theme rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value={10}>10 per page</option>
                      <option value={25}>25 per page</option>
                      <option value={50}>50 per page</option>
                      <option value={100}>100 per page</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className={`p-2 border rounded-lg transition-colors ${currentPage === 1
                        ? "bg-white/5 text-secondary cursor-not-allowed"
                        : "bg-card text-primary hover:bg-[rgba(255,255,255,0.03)] border-theme"
                        }`}
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>

                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum;
                        if (totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (currentPage <= 3) {
                          pageNum = i + 1;
                        } else if (currentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i;
                        } else {
                          pageNum = currentPage - 2 + i;
                        }

                        return (
                          <button
                            key={pageNum}
                            onClick={() => setCurrentPage(pageNum)}
                            className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${currentPage === pageNum
                              ? "bg-blue-600 !text-white"
                              : "bg-card text-primary hover:bg-[rgba(255,255,255,0.03)] border border-theme"
                              }`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                    </div>

                    <button
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                      className={`p-2 border rounded-lg transition-colors ${currentPage === totalPages
                        ? "bg-white/5 text-secondary cursor-not-allowed"
                        : "bg-card text-primary hover:bg-[rgba(255,255,255,0.03)] border-theme"
                        }`}
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
            {sidebarOpen &&
              createPortal(
                <>
                  <div
                    className="fixed inset-0 bg-black/50"
                    style={{ zIndex: 99999 }}
                    onClick={() => setSidebarOpen(false)}
                  />
                  <div
                    className="fixed top-0 right-0 h-screen w-full max-w-5xl bg-card"
                    style={{ zIndex: 100000 }}
                  >
                    <NewOrderSidebar
                      order={editingOrder}
                      onClose={() => {
                        setSidebarOpen(false);
                        setEditingOrder(null);
                      }}
                      onSave={handleSaveOrder}
                    />
                  </div>
                </>,
                document.body
              )
            }

          </div>
        </div>


      </div >
    </>
  );
};

export default Index;
