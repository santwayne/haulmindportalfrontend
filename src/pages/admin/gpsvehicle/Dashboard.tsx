import { useState, useEffect } from "react";
import { Loader2, Calendar, TrendingUp, MapPin, Truck, User, Package, Route, Users } from "lucide-react";
import { getDispatcherDashboard, getTodayDeliveries, getTomorrowPickups } from "../../../axios/api/distapcher";


interface Delivery {
  id: string;
  _id?: string;
  orderNumber: string;
  customerOrderNo?: string;
  tripNo?: string;
  customerName: string;
  deliveryLocation: string;
  deliveryDate?: string;
  deliveryTime: string;
  status: string;
  driverName: string;
  driver?: {
    _id: string;
    name?: string;
    email?: string;
    phone?: string;
  } | null;
  coDriver?: {
    _id: string;
    name?: string;
    email?: string;
    phone?: string;
  } | null;
  truckPlate: string;
  truck?: {
    _id: string;
    licensePlate?: string;
    internalId?: string;
    unitNumber?: string;
    make?: string;
    model?: string;
  } | null;
  trailer?: {
    _id: string;
    licensePlate?: string;
    trailerNumber?: string;
    unitNumber?: string;
  } | null;
  items: number;
}

interface Pickup {
  id: string;
  _id?: string;
  orderNumber: string;
  customerOrderNo?: string;
  tripNo?: string;
  customerName: string;
  pickupLocation: string;
  pickupDate?: string;
  pickupTime: string;
  status: string;
  driverName: string;
  driver?: {
    _id: string;
    name?: string;
    email?: string;
    phone?: string;
  } | null;
  coDriver?: {
    _id: string;
    name?: string;
    email?: string;
    phone?: string;
  } | null;
  truckPlate: string;
  truck?: {
    _id: string;
    licensePlate?: string;
    internalId?: string;
    unitNumber?: string;
    make?: string;
    model?: string;
  } | null;
  trailer?: {
    _id: string;
    licensePlate?: string;
    trailerNumber?: string;
    unitNumber?: string;
  } | null;
  items: number;
}

const Dashboard = () => {

  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [deliveriesToday, setDeliveriesToday] = useState<Delivery[]>([]);
  const [pickupsTomorrow, setPickupsTomorrow] = useState<Pickup[]>([]);
  const [deliveriesLoading, setDeliveriesLoading] = useState(false);
  const [pickupsLoading, setPickupsLoading] = useState(false);

  const scrollToDeliveries = () => {
    const element = document.getElementById('deliveries-today-table');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const scrollToPickups = () => {
    const element = document.getElementById('pickups-tomorrow-table');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  useEffect(() => {
    const fetchAll = async () => {
      try {
        setLoading(true);
        setDeliveriesLoading(true);
        setPickupsLoading(true);

        const [dashRes, deliveriesRes, pickupsRes] = await Promise.all([
          getDispatcherDashboard(),
          getTodayDeliveries(),
          getTomorrowPickups(),
        ]);

        if (dashRes?.success && dashRes.data) {
          setDashboardData(dashRes.data);
        }

        if (deliveriesRes?.success && deliveriesRes.data) {
          setDeliveriesToday(deliveriesRes.data || []);
        }

        if (pickupsRes?.success && pickupsRes.data) {
          setPickupsTomorrow(pickupsRes.data || []);
        }
      } catch (error) {
        console.error("Error fetching GPS dashboard data:", error);
      } finally {
        setLoading(false);
        setDeliveriesLoading(false);
        setPickupsLoading(false);
      }
    };

    fetchAll();
  }, []);

  const getStatusBadge = (status: string) => {
    const statusLower = status.toLowerCase();
    if (statusLower === "completed") {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
          Completed
        </span>
      );
    }
    if (statusLower === "in transit" || statusLower === "in progress") {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
          {statusLower === "in transit" ? "In Transit" : "In Progress"}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
        Scheduled
      </span>
    );
  };

  const getSafePercentage = (value: number) => {
    if (!value || isNaN(value)) return 0;
    return Math.max(8, Math.min(92, value));
  };

  const getGradient = (type: string) => {
    switch (type) {
      case "blue": return "linear-gradient(90deg, #00D1FF, #0066FF)";
      case "green": return "linear-gradient(90deg, #00FFA3, #00C853)";
      case "purple": return "linear-gradient(90deg, #A855F7, #6D28D9)";
      case "orange": return "linear-gradient(90deg, #F59E0B, #F97316)";
      default: return "linear-gradient(90deg, #00D1FF, #0066FF)";
    }
  };

  const totalTrucks = dashboardData?.totalVehicles ?? dashboardData?.truckUtilization?.total ?? 0;
  const activeTrucks = dashboardData?.activeVehicles ?? dashboardData?.truckUtilization?.active ?? 0;
  const totalTrailers = dashboardData?.totalTrailers ?? dashboardData?.trailerUtilization?.total ?? 0;
  const activeTrailers = dashboardData?.activeTrailers ?? dashboardData?.trailerUtilization?.active ?? 0;
  const totalDrivers = dashboardData?.totalDrivers ?? 0;
  const activeDrivers = dashboardData?.activeDrivers ?? dashboardData?.driversOnShift ?? 0;
  const totalTrips = dashboardData?.totalTrips ?? 0;
  const inProgressTrips = dashboardData?.inProgressTrips ?? 0;

  const statCards = [
    {
      id: "trucks",
      title: "Total Trucks",
      value: totalTrucks,
      subtitle: `Active: ${activeTrucks} | With Driver: ${dashboardData?.vehiclesWithDriver ?? 0}`,
      icon: Truck,
      iconColor: "text-[#00D1FF]",
      accentColor: "bg-blue-600",
      gradient: "blue",
      percentage: totalTrucks ? Math.min(100, (activeTrucks / totalTrucks) * 100) : 0,
    },
    {
      id: "trailers",
      title: "Total Trailers",
      value: totalTrailers,
      subtitle: `Active: ${activeTrailers} | In Use: ${dashboardData?.trailersInUse ?? 0}`,
      icon: Package,
      iconColor: "text-purple-400",
      accentColor: "bg-purple-600",
      gradient: "purple",
      percentage: totalTrailers ? Math.min(100, (activeTrailers / totalTrailers) * 100) : 0,
    },
    {
      id: "drivers",
      title: "Total Drivers",
      value: totalDrivers,
      subtitle: `On Shift: ${dashboardData?.driversOnShift ?? 0} | Active: ${activeDrivers}`,
      icon: Users,
      iconColor: "text-[#00FFA3]",
      accentColor: "bg-green-600",
      gradient: "green",
      percentage: totalDrivers ? Math.min(100, (activeDrivers / totalDrivers) * 100) : 0,
    },
    {
      id: "trips",
      title: "Total Trips",
      value: totalTrips,
      subtitle: `In Progress: ${inProgressTrips} | Today: ${dashboardData?.todayTrips ?? 0}`,
      icon: Route,
      iconColor: "text-[#F59E0B]",
      accentColor: "bg-orange-600",
      gradient: "orange",
      percentage: totalTrips ? Math.min(100, (inProgressTrips / totalTrips) * 100) : 0,
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

  return (
    <>
      <div className="min-h-screen" >
        <div className="relative w-full mx-auto p-2">
          {/* Main content */}
          <div className="relative z-10 px-4 pt-3 pb-6">
            {/* Header Section */}
            <div className="mb-4 relative z-10">
              <div className="flex items-center justify-between">
                <h1 className="text-xl font-bold text-[var(--accent-navyblue)]">GPS Vehicle Tracking</h1>
                <div className="flex items-center gap-2 text-white/90">
                  <span className="text-xs">Dashboard</span>
                </div>
              </div>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 -mt-2 mb-4">
              {statCards.map((card) => {
                const Icon = card.icon;
                return (
                  <div
                    key={card.id}
                    className="relative overflow-hidden rounded-xl p-4
                      bg-gradient-to-br from-[#0B1A2A] to-[#0F2A44]
                      border border-white/10
                      hover:scale-[1.03] transition-all duration-300
                      shadow-md hover:shadow-[0_0_12px_rgba(0,209,255,0.15)]"
                  >
                    <div className="absolute inset-0 opacity-0 hover:opacity-100 transition duration-500">
                      <div className={`absolute inset-0 blur-2xl opacity-10 ${card.accentColor}`} />
                    </div>
                    <div className="flex items-start justify-between mb-3 relative z-10">
                      <div>
                        <h3 className="text-sm text-white/70">{card.title}</h3>
                        <div className="text-2xl font-bold text-white">{card.value}</div>
                        <p className="text-xs text-white/60">{card.subtitle}</p>
                      </div>
                      <div className="relative">
                        <div className={`absolute inset-0 blur-lg opacity-25 ${card.accentColor}`} />
                        <div className="relative bg-white/5 p-2 rounded-lg">
                          <Icon className={card.iconColor} size={22} />
                        </div>
                      </div>
                    </div>
                    <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden relative">
                      <div
                        className="absolute inset-0 blur-md opacity-30"
                        style={{ width: `${getSafePercentage(card.percentage)}%`, background: getGradient(card.gradient) }}
                      />
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${getSafePercentage(card.percentage)}%`, background: getGradient(card.gradient) }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Deliveries Today and Pickups Today summary cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
              {/* Deliveries Today */}
              <div
                onClick={scrollToDeliveries}
                className="bg-card rounded-lg p-3 shadow-sm border border-theme hover:shadow-md transition-all cursor-pointer hover:border-[var(--accent-blue)]/20 hover:scale-[1.02] active:scale-[0.98]"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h3 className="text-sm font-bold text-[var(--accent-navyblue)] mb-1">Deliveries Today</h3>
                    <div className="flex items-baseline gap-2 mb-0.5">
                      <span className="text-xl font-bold text-primary">{deliveriesToday.length}</span>
                    </div>
                    <p className="text-xs text-secondary">Scheduled for today</p>
                  </div>
                  <div className="bg-card rounded-lg p-2 shadow-sm">
                    <Calendar className="text-[#F59E0B]" size={21} strokeWidth={2} />
                  </div>
                </div>
              </div>

              {/* Pickups Today */}
              <div
                onClick={scrollToPickups}
                className="bg-card rounded-lg p-3 shadow-sm border border-theme hover:shadow-md transition-all cursor-pointer hover:border-[var(--accent-blue)]/20 hover:scale-[1.02] active:scale-[0.98]"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h3 className="text-sm font-bold text-[var(--accent-navyblue)] mb-1">Pickups Tomorrow</h3>
                    <div className="flex items-baseline gap-2 mb-0.5">
                      <span className="text-xl font-bold text-primary">{pickupsTomorrow.length}</span>
                    </div>
                    <p className="text-xs text-secondary">Scheduled for tomorrow</p>
                  </div>
                  <div className="bg-card rounded-lg p-2 shadow-sm">
                    <TrendingUp className="text-[#00FFA3]" size={21} strokeWidth={2} />
                  </div>
                </div>
              </div>
            </div>

            {/* Deliveries Today Listing */}
            <div id="deliveries-today-table" className="bg-card rounded-lg shadow-sm border border-theme mb-4">
              <div className="p-4 border-b border-theme">
                <h2 className="text-lg font-bold text-white">Deliveries Today</h2>
                <p className="text-sm text-secondary mt-1">Scheduled deliveries for today</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-card border-b border-theme">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--accent-navyblue)] uppercase tracking-wider">
                        Order Number
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--accent-navyblue)] uppercase tracking-wider">
                        Customer
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--accent-navyblue)] uppercase tracking-wider">
                        Delivery Location
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--accent-navyblue)] uppercase tracking-wider">
                        Time
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--accent-navyblue)] uppercase tracking-wider">
                        Driver
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--accent-navyblue)] uppercase tracking-wider">
                        Truck
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--accent-navyblue)] uppercase tracking-wider">
                        Items
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--accent-navyblue)] uppercase tracking-wider">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-card divide-y divide-theme">
                    {deliveriesLoading ? (
                      <tr>
                        <td colSpan={8} className="px-4 py-8 text-center">
                          <Loader2 className="w-5 h-5 animate-spin text-[var(--accent-navyblue)] mx-auto" />
                        </td>
                      </tr>
                    ) : deliveriesToday.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-4 py-8 text-center text-secondary">
                          No deliveries scheduled for today
                        </td>
                      </tr>
                    ) : (
                      deliveriesToday.map((delivery) => (
                        <tr key={delivery.id || delivery._id} className="hover:bg-[rgba(255,255,255,0.03)] transition-colors">
                          <td className="px-4 py-3">
                            <div className="text-sm font-medium text-primary">{delivery.orderNumber || 'N/A'}</div>
                            {delivery.customerOrderNo && (
                              <div className="text-xs text-secondary">Cust: {delivery.customerOrderNo}</div>
                            )}
                            {delivery.tripNo && (
                              <div className="text-xs text-[var(--accent-navyblue)]">Trip: {delivery.tripNo}</div>
                            )}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="text-sm text-primary">{delivery.customerName || 'N/A'}</div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center text-sm text-primary">
                              <MapPin className="w-4 h-4 mr-1 text-secondary flex-shrink-0" />
                              <span className="truncate max-w-xs">{delivery.deliveryLocation || 'Location not specified'}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="text-sm text-primary">{delivery.deliveryTime || 'Not specified'}</div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center text-sm text-primary">
                              <User className="w-4 h-4 mr-1 text-secondary flex-shrink-0" />
                              <div>
                                <div>{delivery.driverName || 'Not assigned'}</div>
                                {delivery.coDriver?.name && (
                                  <div className="text-xs text-secondary">Co: {delivery.coDriver.name}</div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center text-sm text-primary">
                              <Truck className="w-4 h-4 mr-1 text-secondary flex-shrink-0" />
                              <div>
                                <div>{delivery.truckPlate || 'Not assigned'}</div>
                                {delivery.trailer?.licensePlate && (
                                  <div className="text-xs text-secondary">Trailer: {delivery.trailer.licensePlate}</div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="text-sm text-primary">{delivery.items || 0}</div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            {getStatusBadge(delivery.status)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pickups Tomorrow Listing */}
            <div id="pickups-tomorrow-table" className="bg-card rounded-lg shadow-sm border border-theme">
              <div className="p-4 border-b border-theme">
                <h2 className="text-lg font-bold text-white">Pickups Tomorrow</h2>
                <p className="text-sm text-secondary mt-1">Scheduled pickups for tomorrow</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-card border-b border-theme">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--accent-navyblue)] uppercase tracking-wider">
                        Order Number
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--accent-navyblue)] uppercase tracking-wider">
                        Customer
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--accent-navyblue)] uppercase tracking-wider">
                        Pickup Location
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--accent-navyblue)] uppercase tracking-wider">
                        Time
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--accent-navyblue)] uppercase tracking-wider">
                        Driver
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--accent-navyblue)] uppercase tracking-wider">
                        Truck
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--accent-navyblue)] uppercase tracking-wider">
                        Items
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--accent-navyblue)] uppercase tracking-wider">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-card divide-y divide-theme">
                    {pickupsLoading ? (
                      <tr>
                        <td colSpan={8} className="px-4 py-8 text-center">
                          <Loader2 className="w-5 h-5 animate-spin text-[var(--accent-navyblue)] mx-auto" />
                        </td>
                      </tr>
                    ) : pickupsTomorrow.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-4 py-8 text-center text-secondary">
                          No pickups scheduled for tomorrow
                        </td>
                      </tr>
                    ) : (
                      pickupsTomorrow.map((pickup) => (
                        <tr key={pickup.id || pickup._id} className="hover:bg-[rgba(255,255,255,0.03)] transition-colors">
                          <td className="px-4 py-3">
                            <div className="text-sm font-medium text-primary">{pickup.orderNumber || 'N/A'}</div>
                            {pickup.customerOrderNo && (
                              <div className="text-xs text-secondary">Cust: {pickup.customerOrderNo}</div>
                            )}
                            {pickup.tripNo && (
                              <div className="text-xs text-[var(--accent-navyblue)]">Trip: {pickup.tripNo}</div>
                            )}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="text-sm text-primary">{pickup.customerName || 'N/A'}</div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center text-sm text-primary">
                              <MapPin className="w-4 h-4 mr-1 text-secondary flex-shrink-0" />
                              <span className="truncate max-w-xs">{pickup.pickupLocation || 'Location not specified'}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="text-sm text-primary">{pickup.pickupTime || 'Not specified'}</div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center text-sm text-primary">
                              <User className="w-4 h-4 mr-1 text-secondary flex-shrink-0" />
                              <div>
                                <div>{pickup.driverName || 'Not assigned'}</div>
                                {pickup.coDriver?.name && (
                                  <div className="text-xs text-secondary">Co: {pickup.coDriver.name}</div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center text-sm text-primary">
                              <Truck className="w-4 h-4 mr-1 text-secondary flex-shrink-0" />
                              <div>
                                <div>{pickup.truckPlate || 'Not assigned'}</div>
                                {pickup.trailer?.licensePlate && (
                                  <div className="text-xs text-secondary">Trailer: {pickup.trailer.licensePlate}</div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="text-sm text-primary">{pickup.items || 0}</div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            {getStatusBadge(pickup.status)}
                          </td>
                        </tr>
                      ))
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

export default Dashboard;