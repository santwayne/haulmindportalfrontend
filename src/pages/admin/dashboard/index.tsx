import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    MapPin,
    Users,
    Truck as TruckIcon,
    Wrench,
    ShieldCheck,
    DollarSign,
    Heart,
    Settings,
    FileText
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { getAdminDashboard, type Trip, type Truck, type DashboardStats, recentAlerts } from '../../../axios/api/main.dashboard';
import { getActiveOrdersWithTracking } from '../../../axios/api/distapcher';
import Card from '../../../components/admin/Card';

// Fix for default marker icons in Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Status → color mapping
const STATUS_COLORS: Record<string, { bg: string; border: string; glow: string }> = {
    active: { bg: '#16A34A', border: '#22C55E', glow: '#00FFA380' },
    'in progress': { bg: '#0891B2', border: '#22D3EE', glow: '#00D1FF80' },
    scheduled: { bg: '#D97706', border: '#F59E0B', glow: '#FCD34D80' },
    idle: { bg: '#D97706', border: '#F59E0B', glow: '#FCD34D80' },
    pending: { bg: '#EA580C', border: '#F97316', glow: '#FB923C80' },
    maintenance: { bg: '#C2410C', border: '#EA580C', glow: '#FB923C80' },
    offline: { bg: '#4B5563', border: '#6B7280', glow: '#9CA3AF40' },
    completed: { bg: '#4B5563', border: '#6B7280', glow: '#9CA3AF40' },
};

const getStatusColor = (status: string) => {
    return STATUS_COLORS[status?.toLowerCase()]?.border || '#6B7280';
};

const createVehicleIcon = (status: string) => {
    const s = STATUS_COLORS[status?.toLowerCase()] || STATUS_COLORS.offline;
    const truckSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg"><path d="M1 3h15v13H1z"/><path d="M16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>`;
    const html = `<div style="
        width:38px;height:38px;
        background:${s.bg};
        border:2.5px solid ${s.border};
        border-radius:50%;
        display:flex;align-items:center;justify-content:center;
        box-shadow:0 0 14px ${s.glow}, 0 2px 6px rgba(0,0,0,0.5);
        cursor:pointer;
    ">${truckSvg}</div>`;
    return L.divIcon({ html, className: '', iconSize: [38, 38], iconAnchor: [19, 19] });
};

// Component to handle map center updates
const MapController: React.FC<{ center: [number, number]; zoom: number }> = ({ center, zoom }) => {
    const map = useMap();

    useEffect(() => {
        map.setView(center, zoom);
    }, [map, center, zoom]);

    return null;
};


interface ActiveOrderGroup {
    _id: string;
    driverId: string;
    driver: {
        _id: string;
        name: string;
        email: string;
        phone: string;
    };
    truck?: {
        _id: string;
        plateNumber: string;
        make: string;
        model: string;
        unitNumber: string;
        internalId: string;
        trackingKey?: string;
    };
    orders: Array<{
        _id: string;
        orderNumber: string;
        customerOrderNo?: string;
        tripNo?: string;
        status: string;
    }>;
    currentLocation?: {
        lat: number;
        lng: number;
        address: string;
    };
    speed: number;
    engineOn: boolean;
    orderCount: number;
}

interface FeatureCard {
    id: string;
    title: string;
    value: string;
    change: string;
    trend: string;
    subtitle: string;
    icon: React.ComponentType<any>;
    percentage: number;
    route: string;

    color: "blue" | "green" | "purple" | "orange" | "cyan" | "emerald" | "rose" | "indigo" | "amber";
}


interface RecentTrips {
    _id: string,
    tripNo: string,
    customerOrderNo?: string,
    driver: {
        name: string
    },
    status: string,
    deliveryLocation: {
        place: string,
        latitude: number,
        longitude: number,

    },
    createdAt: string,
    driverAcceptanceStatus: string
}

interface RecentAlerts {
    _id: string;
    documentType: string;
    name:string;
    expiryDate: string;
    lisence:{
        expiryDate: string;
    }
}











const Index = () => {
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [mapReady, setMapReady] = useState(false);
    const [dashboardData, setDashboardData] = useState<{
        stats: DashboardStats;
        trips: Trip[];
        trucks: Truck[];
        recentTrips: RecentTrips[];

    } | null>(null);
    const [activeOrders, setActiveOrders] = useState<ActiveOrderGroup[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [showAllTrips, setShowAllTrips] = useState(false);
    const [showAllDrivers, setShowAllDrivers] = useState(false);
    const [recentAlert, setRecentAlerts] = useState<RecentAlerts[]>([]);
    const [showAllAlerts, setShowAllAlerts] = useState(false);

    const drivers = dashboardData?.recentTrips || [];
  const displayedAlerts = Array.isArray(recentAlert)
  ? (showAllAlerts ? recentAlert : recentAlert.slice(0, 5))
  : [];
    console.log('🚨 Displayed alerts:', displayedAlerts);

    useEffect(() => {
        fetchDashboardData();
        fetchActiveOrders();

        // Refresh active orders every 30 seconds to update tracking locations
        const interval = setInterval(() => {
            fetchActiveOrders();
        }, 30000);

        return () => clearInterval(interval);
    }, []);

    const fetchDashboardData = async () => {
        setLoading(true);
        setError(null);
        try {
            // Parallel fetch — halves wait time vs sequential await
            const [response, alertResponse] = await Promise.all([
                getAdminDashboard(),
                recentAlerts(),
            ]);




            if (response.success && response.data) {

                // Ensure stats are properly formatted with default values
                const stats = response.data.stats || {};
                const filteredData = {
                    ...response.data,
                    stats: {
                        activeLoads: Number(stats.activeLoads) || 0,
                        vehiclesOnline: Number(stats.vehiclesOnline) || 0,
                        activeDrivers: Number(stats.activeDrivers) || 0,
                        pendingTasks: Number(stats.pendingTasks) || 0,
                        complianceRate: Number(stats.complianceRate) || 0,
                        monthlyRevenue: Number(stats.monthlyRevenue) || 0,
                        openIncidents: Number(stats.openIncidents) || 0,
                        maintenanceOrdersCount: Number(stats.maintenanceOrdersCount) || 0
                    },
                    trips: response.data.trips || [],
                    trucks: response.data.trucks || [],
                    recentTrips: response.data.recentTrips || []
                };
                console.log('📊 Dashboard data received:', {
                    stats: filteredData.stats,
                    tripsCount: filteredData.trips.length,
                    trucksCount: filteredData.trucks.length,
                    trips: filteredData.trips.map(t => ({ id: t.id, tripNumber: t.tripNumber, status: t.status })),
                    recentTrips: filteredData.recentTrips
                });
                setDashboardData(filteredData);
            } else {
                setError(response.message || 'Failed to fetch dashboard data');

            }

            if(alertResponse.success && alertResponse.alerts) {
                console.log('📢 Recent alerts received:', alertResponse.alerts);
                 setRecentAlerts(alertResponse.alerts.expiringDocs || []);

            }
        } catch (err: any) {
            setError((err as any).message || 'An error occurred');
        } finally {
            setLoading(false);
            // Mount map only after cards are painted — avoids tile downloads competing with API calls
            setTimeout(() => setMapReady(true), 100);
        }
    };

    const fetchActiveOrders = async () => {
        try {
            const response = await getActiveOrdersWithTracking();
            if (response?.success && response?.data) {
                const ordersData = Array.isArray(response.data) ? response.data : [];
                // Filter orders that have trucks with tracking keys and current locations
                const ordersWithTracking = ordersData.filter((order: ActiveOrderGroup) =>
                    order.truck?.trackingKey &&
                    order.currentLocation &&
                    order.currentLocation.lat &&
                    order.currentLocation.lng &&
                    order.currentLocation.lat !== 0 &&
                    order.currentLocation.lng !== 0
                );
                setActiveOrders(ordersWithTracking);
                console.log('📍 Active orders with tracking:', ordersWithTracking.length);
            }
        } catch (err: any) {
            console.error('Error fetching active orders with tracking:', err);
        }
    };

    // Calculate map center based on active orders with tracking and trips with trucks
    const mapCenter = useMemo((): [number, number] => {
        const coordinates: { lat: number; lng: number }[] = [];

        // Add active orders with tracking
        activeOrders.forEach(order => {
            if (order.currentLocation && order.currentLocation.lat && order.currentLocation.lng &&
                order.currentLocation.lat !== 0 && order.currentLocation.lng !== 0) {
                coordinates.push({ lat: order.currentLocation.lat, lng: order.currentLocation.lng });
            }
        });

        // Add trips with trucks that have current locations or yard locations
        if (dashboardData) {
            dashboardData.trips.forEach(trip => {
                if (!trip.truckInfo) return;

                // Don't add if already in activeOrders
                const alreadyAdded = activeOrders.some(order =>
                    order.truck?.plateNumber === trip.truckInfo?.licensePlate ||
                    order.truck?.unitNumber === trip.truckInfo?.unitNo
                );
                if (alreadyAdded) return;

                // Prefer current location, fallback to yard location
                if (trip.currentLat && trip.currentLng &&
                    trip.currentLat !== 0 && trip.currentLng !== 0) {
                    coordinates.push({ lat: trip.currentLat, lng: trip.currentLng });
                } else if (trip.truckInfo.yard?.coordinates?.latitude &&
                    trip.truckInfo.yard?.coordinates?.longitude) {
                    coordinates.push({
                        lat: trip.truckInfo.yard.coordinates.latitude,
                        lng: trip.truckInfo.yard.coordinates.longitude
                    });
                } else if (trip.originLat && trip.originLng) {
                    // Fallback to origin if no current location or yard
                    coordinates.push({ lat: trip.originLat, lng: trip.originLng });
                }
            });

            // Add standalone trucks (both with current location and yard location)
            dashboardData.trucks.forEach(truck => {
                if (truck.latitude && truck.longitude) {
                    coordinates.push({ lat: truck.latitude, lng: truck.longitude });
                }
            });
        }

        if (coordinates.length > 0) {
            const avgLat = coordinates.reduce((sum, coord) => sum + coord.lat, 0) / coordinates.length;
            const avgLng = coordinates.reduce((sum, coord) => sum + coord.lng, 0) / coordinates.length;
            return [avgLat, avgLng];
        }

        return [39.8283, -98.5795]; // Center of USA
    }, [activeOrders, dashboardData]);

    const mapZoom = useMemo(() => {
        if (activeOrders.length > 0) return 6;
        if (dashboardData && (dashboardData.trips.length > 0 || dashboardData.trucks.length > 0)) return 6;
        return 5;
    }, [activeOrders, dashboardData]);

    // Build features cards with real data
    const features: FeatureCard[] = useMemo(() => {
        if (!dashboardData) return [];

        const stats = dashboardData.stats;

        return [
            {
                id: "dispatch",
                title: "Dispatch & Load",
                value: stats.activeLoads.toString(),
                change: "+0%",
                trend: "up",
                subtitle: "Active Trips",
                icon: TruckIcon,
                percentage: Math.min(100, (stats.activeLoads / 50) * 100),
                route: "/admin/dispatch",
                color: "blue"
            },
            {
                id: "gps",
                title: "GPS Tracking",
                value: stats.vehiclesOnline.toString(),
                change: "+0%",
                trend: "up",
                subtitle: "Vehicles Online",
                icon: MapPin,
                percentage: stats.vehiclesOnline > 0 ? Math.min(100, (stats.vehiclesOnline / 20) * 100) : 0,
                route: "/admin/gpsvehicle",
                color: "emerald"
            },
            {
                id: "driver",
                title: "Human Resources",
                value: stats.activeDrivers.toString(),
                change: "+0%",
                trend: "up",
                subtitle: "Active Drivers",
                icon: Users,
                percentage: stats.activeDrivers > 0 ? Math.min(100, (stats.activeDrivers / 30) * 100) : 0,
                route: "/admin/Management",
                color: "purple"
            },
            {
                id: "maintenance",
                title: "Fleet Maintenance",
                value: stats.pendingTasks.toString(),
                change: "-0%",
                trend: "down",
                subtitle: "Pending Tasks",
                icon: Wrench,
                percentage: stats.pendingTasks > 0 ? Math.min(100, (stats.pendingTasks / 30) * 100) : 0,
                route: "/admin/fleetmaintenance",
                color: "amber"
            },
            {
                id: "mechanics",
                title: "Mechanics",
                value: (stats.maintenanceOrdersCount ?? 0).toString(),
                change: "+0%",
                trend: "up",
                subtitle: "Maintenance Orders",
                icon: Settings,
                percentage: (stats.maintenanceOrdersCount ?? 0) > 0 ? Math.min(100, ((stats.maintenanceOrdersCount ?? 0) / 50) * 100) : 0,
                route: "/admin/mechanics/dashboard",
                color: "cyan"
            },
            {
                id: "compliance",
                title: "Compliance",
                value: `${stats.complianceRate}%`,
                change: "+0%",
                trend: "up",
                subtitle: "Compliance Rate",
                icon: ShieldCheck,
                percentage: stats.complianceRate,
                route: "/admin/compliance",
                color: "green"
            },
            {
                id: "billing",
                title: "Accounts",
                value: `$${stats.monthlyRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
                change: "+0%",
                trend: "up",
                subtitle: "This Month",
                icon: DollarSign,
                percentage: stats.monthlyRevenue > 0 ? Math.min(100, (stats.monthlyRevenue / 100000) * 100) : 0,
                route: "/admin/accounts",
                color: "orange"
            },
            {
                id: "health",
                title: "Health & Safety",
                value: stats.openIncidents.toString(),
                change: "-0%",
                trend: "down",
                subtitle: "Open Incidents",
                icon: Heart,
                percentage: stats.openIncidents > 0 ? Math.min(100, (stats.openIncidents / 20) * 100) : 0,
                route: "/admin/healthandsafety",
                color: "rose"
            },
            {
                id: "manifest",
                title: "Manifest",
                value: stats.activeLoads.toString(),
                change: "+0%",
                trend: "up",
                subtitle: "Active Trips",
                icon: FileText,
                percentage: stats.activeLoads > 0 ? Math.min(100, (stats.activeLoads / 50) * 100) : 0,
                route: "/admin/manifest",
                color: "indigo"
            }
        ];
    }, [dashboardData]);

    const handleCardClick = (route: string) => {
        navigate(route);
    };

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <p className="text-[#A855F7] mb-4">Error: {error}</p>
                    <button
                        onClick={fetchDashboardData}
                        className="px-4 py-2 bg-[var(--accent-blue)] text-white rounded-lg hover:bg-[var(--accent-blue)]"
                    >
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    // ✅ OUTSIDE JSX (top of component)
    const colorStyles = {
        blue: { bg: "bg-gradient-to-br from-[#0B3B5C] to-[#0F6EA8]", text: "text-[#00D1FF]", bar: "bg-[#00D1FF]", glow: "shadow-[0_0_20px_rgba(0,209,255,0.25)]" },
        emerald: { bg: "bg-gradient-to-br from-[#064E3B] to-[#059669]", text: "text-[#34D399]", bar: "bg-[#34D399]", glow: "shadow-[0_0_20px_rgba(52,211,153,0.25)]" },
        purple: { bg: "bg-gradient-to-br from-[#2E1065] to-[#7C3AED]", text: "text-[#A78BFA]", bar: "bg-[#A78BFA]", glow: "shadow-[0_0_20px_rgba(167,139,250,0.25)]" },
        amber: { bg: "bg-gradient-to-br from-[#451A03] to-[#D97706]", text: "text-[#FCD34D]", bar: "bg-[#FCD34D]", glow: "shadow-[0_0_20px_rgba(252,211,77,0.25)]" },
        cyan: { bg: "bg-gradient-to-br from-[#083344] to-[#0891B2]", text: "text-[#22D3EE]", bar: "bg-[#22D3EE]", glow: "shadow-[0_0_20px_rgba(34,211,238,0.25)]" },
        green: { bg: "bg-gradient-to-br from-[#052E16] to-[#16A34A]", text: "text-[#4ADE80]", bar: "bg-[#4ADE80]", glow: "shadow-[0_0_20px_rgba(74,222,128,0.25)]" },
        orange: { bg: "bg-gradient-to-br from-[#431407] to-[#EA580C]", text: "text-[#FB923C]", bar: "bg-[#FB923C]", glow: "shadow-[0_0_20px_rgba(251,146,60,0.25)]" },
        rose: { bg: "bg-gradient-to-br from-[#4C0519] to-[#E11D48]", text: "text-[#FB7185]", bar: "bg-[#FB7185]", glow: "shadow-[0_0_20px_rgba(251,113,133,0.25)]" },
        indigo: { bg: "bg-gradient-to-br from-[#1E1B4B] to-[#4F46E5]", text: "text-[#818CF8]", bar: "bg-[#818CF8]", glow: "shadow-[0_0_20px_rgba(129,140,248,0.25)]" },
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[var(--bg-main)] px-4.5 pt-3.5 pb-1">
                <div className="flex items-center justify-between mb-3">
                    <h1 className="text-xl font-bold text-white">Overview</h1>
                </div>
                {/* Skeleton stat cards — visible immediately, no blank screen */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-3">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="rounded-2xl bg-card border border-theme p-4 animate-pulse">
                            <div className="flex items-start gap-4">
                                <div className="w-11 h-11 rounded-xl bg-[rgba(255,255,255,0.06)]" />
                                <div className="flex-1 space-y-2">
                                    <div className="h-3 w-24 rounded bg-[rgba(255,255,255,0.06)]" />
                                    <div className="h-6 w-12 rounded bg-[rgba(255,255,255,0.06)]" />
                                    <div className="h-2 w-20 rounded bg-[rgba(255,255,255,0.04)]" />
                                </div>
                            </div>
                            <div className="mt-4 h-[3px] rounded-full bg-[rgba(255,255,255,0.05)]" />
                        </div>
                    ))}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-4">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="rounded-2xl bg-card border border-theme p-4 animate-pulse">
                            <div className="flex items-start gap-3">
                                <div className="w-10 h-10 rounded-xl bg-[rgba(255,255,255,0.06)]" />
                                <div className="flex-1 space-y-2">
                                    <div className="h-3 w-20 rounded bg-[rgba(255,255,255,0.06)]" />
                                    <div className="h-5 w-10 rounded bg-[rgba(255,255,255,0.06)]" />
                                </div>
                            </div>
                            <div className="mt-3 h-[3px] rounded-full bg-[rgba(255,255,255,0.05)]" />
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <>
            <div className="min-h-screen bg-[var(--bg-main)]">
                <div className="relative w-full mx-auto">

                    {/* Main content */}
                    <div className="relative z-10 px-4.5 pt-3.5 pb-1 ">
                        {/* Header Section */}
                        {/* <div className="mb-4.5 relative z-10 "> */}
                        <div className="flex items-center justify-between">
                            <h1 className="text-xl font-bold text-white" style={{ fontSize: '1.25rem' }}>Overview</h1>
                            <div className="flex items-center gap-2 text-white/90">
                                <span className="text-xs" style={{ fontSize: '0.75rem' }}>Home</span>
                            </div>
                            {/* </div> */}
                        </div>

                        {/* Features Cards — Row 1: 4 cards */}
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 -mt-2 mb-3">
                            {features.slice(0, 4).map((feature) => {
                                const styles = colorStyles[feature.color] || colorStyles.blue;
                                const Icon = feature.icon;
                                return (
                                    <Card
                                        key={feature.id}
                                        onClick={() => handleCardClick(feature.route)}
                                        className="cursor-pointer hover:scale-[1.02] active:scale-[0.98] card-premium"
                                    >
                                        <div className="flex items-start gap-2 sm:gap-4">
                                            <div className={`flex-shrink-0 rounded-xl p-2 sm:p-3 ${styles.bg} ${styles.glow}`}>
                                                <Icon className={styles.text} size={18} strokeWidth={2} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h3 className="text-xs sm:text-sm font-semibold text-primary leading-snug">{feature.title}</h3>
                                                <div className="text-xl sm:text-2xl font-bold text-primary mt-1">{feature.value}</div>
                                                <p className="text-xs text-secondary mt-0.5 leading-snug">{feature.subtitle}</p>
                                            </div>
                                            <div className="hidden sm:flex text-xs font-semibold text-secondary items-center gap-1 mt-1 flex-shrink-0">
                                                <span className="text-[var(--accent-green)]">↗</span>
                                                {Math.round(feature.percentage)}%
                                            </div>
                                        </div>
                                        <div className="mt-3 sm:mt-4 h-[3px] bg-[rgba(255,255,255,0.05)] rounded-full overflow-hidden">
                                            <div className={`h-full rounded-full ${styles.bar}`} style={{ width: `${Math.max(feature.percentage, 4)}%`, opacity: feature.percentage === 0 ? 0.35 : 1 }} />
                                        </div>
                                    </Card>
                                );
                            })}
                        </div>

                        {/* Features Cards — Row 2: 5 cards */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-4">
                            {features.slice(4).map((feature) => {
                                const styles = colorStyles[feature.color] || colorStyles.blue;
                                const Icon = feature.icon;
                                return (
                                    <Card
                                        key={feature.id}
                                        onClick={() => handleCardClick(feature.route)}
                                        className="cursor-pointer hover:scale-[1.02] active:scale-[0.98] card-premium"
                                    >
                                        <div className="flex items-start gap-2 sm:gap-3">
                                            <div className={`flex-shrink-0 rounded-xl p-2 sm:p-3 ${styles.bg} ${styles.glow}`}>
                                                <Icon className={styles.text} size={16} strokeWidth={2} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h3 className="text-xs font-semibold text-primary truncate leading-snug">{feature.title}</h3>
                                                <div className="text-lg sm:text-xl font-bold text-primary mt-1">{feature.value}</div>
                                                <p className="text-xs text-secondary mt-0.5 truncate">{feature.subtitle}</p>
                                            </div>
                                        </div>
                                        <div className="mt-3 h-[3px] bg-[rgba(255,255,255,0.05)] rounded-full overflow-hidden">
                                            <div className={`h-full rounded-full ${styles.bar}`} style={{ width: `${Math.max(feature.percentage, 4)}%`, opacity: feature.percentage === 0 ? 0.35 : 1 }} />
                                        </div>
                                    </Card>
                                );
                            })}
                        </div>

                        {/* Active Trips Section */}
                        {/* Active Trips Section */}
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                            {/* ================= LEFT: MAP ================= */}
                            <div className="lg:col-span-7 bg-card border border-theme rounded-2xl shadow-[0_0_40px_rgba(0,209,255,0.08)] overflow-hidden">

                                {/* HEADER */}
                                <div className="flex items-center justify-between px-5 py-4 border-b border-theme bg-gradient-to-r from-[rgba(0,209,255,0.06)] to-transparent">
                                    <h2 className="text-sm font-semibold text-primary">Live Fleet Map</h2>
                                    <button
                                        onClick={() => navigate('/admin/gpsvehicle/livetracking/truck')}
                                        className="px-3 py-1 text-xs rounded-md bg-[rgba(0,209,255,0.1)] text-[var(--accent-blue)] hover:bg-[rgba(0,209,255,0.2)] transition"
                                    >
                                        View Full Map
                                    </button>
                                </div>

                                {/* MAP — deferred until after cards paint to avoid tile downloads blocking API responses */}
                                <div className="relative h-[220px] sm:h-[260px] lg:h-[310px] m-4 rounded-xl overflow-hidden border border-theme">
                                    {!mapReady ? (
                                        <div className="w-full h-full flex items-center justify-center bg-[rgba(0,209,255,0.03)]">
                                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--accent-blue)]" />
                                        </div>
                                    ) : (
                                    <MapContainer
                                        center={mapCenter}
                                        zoom={mapZoom}
                                        style={{ height: "100%", width: "100%" }}
                                        zoomControl={false}
                                    >
                                        <MapController center={mapCenter} zoom={mapZoom} />
                                        <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />

                                        {/* Active orders with real GPS */}
                                        {activeOrders.map((order, i) => {
                                            if (!order.currentLocation?.lat || !order.currentLocation?.lng) return null;
                                            return (
                                                <Marker
                                                    key={`order-${i}`}
                                                    position={[order.currentLocation.lat, order.currentLocation.lng]}
                                                    icon={createVehicleIcon('active')}
                                                >
                                                    <Popup className="map-popup">
                                                        <div style={{ background: '#121A2B', color: '#E6EDF3', padding: '8px', borderRadius: '8px', minWidth: '160px' }}>
                                                            <p style={{ fontWeight: 700, marginBottom: 4 }}>{order.truck?.unitNumber || order.truck?.plateNumber || 'Truck'}</p>
                                                            <p style={{ fontSize: 11, color: '#8B9BB4' }}>{order.driver?.name}</p>
                                                            <p style={{ fontSize: 11, color: '#00FFA3', marginTop: 4 }}>● Active — {order.orderCount} order(s)</p>
                                                            <p style={{ fontSize: 10, color: '#8B9BB4', marginTop: 2 }}>{order.currentLocation.address}</p>
                                                        </div>
                                                    </Popup>
                                                </Marker>
                                            );
                                        })}

                                        {/* Standalone trucks from dashboard */}
                                        {dashboardData?.trucks.map((truck, i) => {
                                            if (!truck.latitude || !truck.longitude) return null;
                                            const alreadyCovered = activeOrders.some(o =>
                                                o.truck?.unitNumber === truck.unitNo || o.truck?.plateNumber === truck.licensePlate
                                            );
                                            if (alreadyCovered) return null;
                                            return (
                                                <Marker
                                                    key={`truck-${i}`}
                                                    position={[truck.latitude, truck.longitude]}
                                                    icon={createVehicleIcon(truck.operationStatus)}
                                                >
                                                    <Popup>
                                                        <div style={{ background: '#121A2B', color: '#E6EDF3', padding: '8px', borderRadius: '8px', minWidth: '160px' }}>
                                                            <p style={{ fontWeight: 700, marginBottom: 4 }}>{truck.unitNo} — {truck.licensePlate}</p>
                                                            <p style={{ fontSize: 11, color: '#8B9BB4' }}>{truck.makeModel}</p>
                                                            <p style={{ fontSize: 11, marginTop: 4, color: getStatusColor(truck.operationStatus) }}>
                                                                ● {truck.operationStatus}
                                                            </p>
                                                            <p style={{ fontSize: 10, color: '#8B9BB4', marginTop: 2 }}>{truck.address}</p>
                                                        </div>
                                                    </Popup>
                                                </Marker>
                                            );
                                        })}

                                        {/* Trips with current location */}
                                        {dashboardData?.trips.map((trip, i) => {
                                            const lat = trip.currentLat;
                                            const lng = trip.currentLng;
                                            if (!lat || !lng) return null;
                                            return (
                                                <Marker
                                                    key={`trip-${i}`}
                                                    position={[lat, lng]}
                                                    icon={createVehicleIcon(trip.status)}
                                                >
                                                    <Popup>
                                                        <div style={{ background: '#121A2B', color: '#E6EDF3', padding: '8px', borderRadius: '8px', minWidth: '160px' }}>
                                                            <p style={{ fontWeight: 700, marginBottom: 4 }}>{trip.tripNumber}</p>
                                                            <p style={{ fontSize: 11, color: '#8B9BB4' }}>{trip.origin} → {trip.destination}</p>
                                                            <p style={{ fontSize: 11, marginTop: 4, color: getStatusColor(trip.status) }}>● {trip.status}</p>
                                                        </div>
                                                    </Popup>
                                                </Marker>
                                            );
                                        })}
                                    </MapContainer>
                                    )}

                                    {/* LEGEND */}
                                    {/* <div className="absolute bottom-3 left-3 z-[1000] flex gap-3 text-xs bg-[rgba(10,18,32,0.85)] px-3 py-2 rounded-lg border border-[rgba(255,255,255,0.08)] backdrop-blur-md">
                                        {[
                                            { label: 'Active', color: '#22C55E', glow: '#00FFA3', count: (dashboardData?.trucks.filter(t => t.operationStatus?.toLowerCase() === 'active').length ?? 0) + activeOrders.length },
                                            { label: 'Idle',   color: '#F59E0B', glow: '#FCD34D', count: dashboardData?.trucks.filter(t => t.operationStatus?.toLowerCase() === 'idle').length ?? 0 },
                                            { label: 'Maintenance', color: '#EA580C', glow: '#FB923C', count: dashboardData?.trucks.filter(t => t.operationStatus?.toLowerCase() === 'maintenance').length ?? 0 },
                                            { label: 'Offline', color: '#6B7280', glow: '#9CA3AF', count: dashboardData?.trucks.filter(t => t.operationStatus?.toLowerCase() === 'offline').length ?? 0 },
                                        ].map(item => (
                                            <span key={item.label} className="flex items-center gap-1.5 text-secondary">
                                                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: item.color, boxShadow: `0 0 5px ${item.glow}` }} />
                                                {item.label} ({item.count})
                                            </span>
                                        ))}
                                    </div> */}
                                </div>
                            </div>

                            {/* ================= MIDDLE: DISPATCH ================= */}
                            <div className="lg:col-span-3 bg-card border border-theme rounded-2xl p-4 shadow-[0_0_30px_rgba(0,209,255,0.05)]">

                                {/* Header */}
                                <div className="flex justify-between mb-4">
                                    <h2 className="text-sm font-semibold text-primary">Dispatch Center</h2>

                                    {(dashboardData?.recentTrips?.length || 0) > 3 && (
                                        <button
                                            onClick={() => setShowAllTrips(!showAllTrips)}
                                            className="text-xs !text-[var(--accent-navyblue)] hover:underline"
                                        >
                                            {showAllTrips ? "Show Less" : "View All"}
                                        </button>
                                    )}
                                </div>

                                {/* Trips List */}
                                {(dashboardData?.recentTrips || [])
                                    .slice(
                                        0,
                                        showAllTrips
                                            ? (dashboardData?.recentTrips?.length || 0) // ✅ fix here
                                            : 3
                                    )
                                    .map((trip, i) => {

                                        // ✅ Status Mapping
                                        const statusMap: Record<string, { label: string; color: string }> = {
                                            "in-progress": { label: "In Progress", color: "blue" },
                                            "in-delivery": { label: "In Progress", color: "blue" },
                                            "planned": { label: "Scheduled", color: "green" },
                                            "quoted": { label: "Pending", color: "orange" },
                                            "completed": { label: "Completed", color: "gray" }
                                        };

                                        const current = statusMap[trip.status] || { label: "Pending", color: "orange" };

                                        const route = trip.deliveryLocation?.place || "Unknown Location";
                                        const driverName = trip.driver?.name || "Unassigned";

                                        return (
                                            <div
                                                key={trip.customerOrderNo || i}
                                                className="mb-3 p-3 rounded-xl bg-[rgba(255,255,255,0.02)] border border-theme"
                                            >
                                                {/* Top Row */}
                                                <div className="flex justify-between text-xs mb-1">
                                                    <span className="text-[var(--accent-navyblue)] font-semibold">
                                                        {trip.customerOrderNo || "N/A"}
                                                    </span>

                                                    <span
                                                        className={`
                px-2 py-0.5 rounded-full text-xs
                ${current.color === "blue" && "bg-[rgba(0,209,255,0.1)] text-[var(--accent-blue)]"}
                ${current.color === "green" && "bg-[rgba(0,255,163,0.1)] text-[var(--accent-green)]"}
                ${current.color === "orange" && "bg-[rgba(245,158,11,0.1)] text-[var(--accent-orange)]"}
                ${current.color === "gray" && "bg-gray-500/20 text-gray-300"}
              `}
                                                    >
                                                        {current.label}
                                                    </span>
                                                </div>

                                                {/* Route */}
                                                <div className="text-sm text-primary">
                                                    {route}
                                                </div>

                                                {/* Driver */}
                                                <div className="text-xs text-secondary mt-1">
                                                    {driverName}
                                                </div>
                                            </div>
                                        );
                                    })}

                                {/* Empty State */}
                                {(dashboardData?.recentTrips || []).length === 0 && (
                                    <div className="text-center text-gray-400 text-sm py-6">
                                        No recent trips found
                                    </div>
                                )}
                            </div>

                            {/* ================= RIGHT: ALERTS ================= */}
<div className="lg:col-span-2 bg-card border border-theme rounded-2xl p-4 shadow-[0_0_30px_rgba(0,209,255,0.05)]">

  <div className="flex justify-between mb-4">
    <h2 className="text-sm font-semibold text-primary">Expiring Documents</h2>

    <button
      onClick={() => setShowAllAlerts(prev => !prev)}
      className="text-xs !text-[var(--accent-navyblue)]"
    >
      {showAllAlerts ? "Show Less" : "View All"}
    </button>
  </div>

  {displayedAlerts.length > 0 ? (
    displayedAlerts.map((doc) => {
      const expiry = new Date(doc.expiryDate).toLocaleDateString();
      const licenseExpiry = doc.lisence?.expiryDate
        ? new Date(doc.lisence.expiryDate).toLocaleDateString()
        : null;

      return (
        <div key={doc._id} className="flex gap-3 mb-4 items-start">

          <div className="p-2 rounded-lg bg-red-500/20 text-red-400">
            ⚠
          </div>

          <div>
            <p className="text-sm text-primary">
              {doc.name} ({doc.documentType})
            </p>

            <p className="text-xs text-secondary">
              Doc Expiry: {expiry}
            </p>

            {licenseExpiry && (
              <p className="text-xs text-secondary">
                License Expiry: {licenseExpiry}
              </p>
            )}
          </div>

        </div>
      );
    })
  ) : (
    <p className="text-xs text-secondary">No expiring documents 🎉</p>
  )}

</div>

                        </div>

                        {/* ================= RECENT TRIPS + DRIVER STATUS ================= */}
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6">

                            {/* ================= LEFT: RECENT TRIPS ================= */}
                            <div className="lg:col-span-8 bg-card border border-theme rounded-2xl shadow-[0_0_40px_rgba(0,209,255,0.08)] overflow-hidden">

                                <div className="flex items-center justify-between px-5 py-4 border-b border-theme
    bg-gradient-to-r from-[rgba(0,209,255,0.08)] to-transparent">
                                    <h2 className="text-sm font-semibold text-primary">Recent Trips</h2>
                                    
                                </div>

                                <div className="overflow-x-auto">
                                <table className="w-full text-sm min-w-[520px]">
                                    <thead className="text-xs text-secondary uppercase border-b border-theme">
                                        <tr>
                                            <th className="px-5 py-3 text-left">Trip ID</th>
                                            <th className="px-5 py-3 text-left">Route</th>
                                            <th className="px-5 py-3 text-left">Driver</th>
                                            <th className="px-5 py-3 text-left">Status</th>
                                            <th className="px-5 py-3 text-left">Departed</th>

                                        </tr>
                                    </thead>

                                    <tbody>
                                        {(dashboardData?.recentTrips || []).length > 0 ? (
                                            dashboardData?.recentTrips?.map((trip, i) => {

                                                // ✅ Status Mapping (backend → UI)
                                                const statusMap: Record<string, string> = {
                                                    "in-progress": "In Progress",
                                                    "in-delivery": "In Progress",
                                                    "planned": "Scheduled",
                                                    "quoted": "Pending",
                                                    "completed": "Completed"
                                                };

                                                const statusStyles: Record<string, string> = {
                                                    "In Progress": "bg-blue-500/20 text-blue-400",
                                                    "Scheduled": "bg-green-500/20 text-green-400",
                                                    "Pending": "bg-yellow-500/20 text-yellow-400",
                                                    "Completed": "bg-gray-500/20 text-gray-300"
                                                };

                                                const formattedStatus = statusMap[trip.status] || "Pending";

                                                // ✅ Route (you only have deliveryLocation)
                                                const route = trip.deliveryLocation?.place || "Unknown Location";

                                                // ✅ Driver Name
                                                const driverName = trip.driver?.name || "Unassigned";

                                                // ✅ Time (if createdAt exists)
                                                const departed = trip.createdAt
                                                    ? new Date(trip.createdAt).toLocaleString()
                                                    : "--";

                                                return (
                                                    <tr
                                                        key={trip._id || i}
                                                        className="border-b border-theme hover:bg-[rgba(0,209,255,0.04)]"
                                                    >
                                                        {/* Trip ID */}
                                                        <td className="px-5 py-4 text-primary">
                                                            {trip.customerOrderNo || "N/A"}
                                                        </td>

                                                        {/* Route */}
                                                        <td className="px-5 py-4 text-secondary">
                                                            {route}
                                                        </td>

                                                        {/* Driver */}
                                                        <td className="px-5 py-4 text-primary">
                                                            {driverName}
                                                        </td>

                                                        {/* Status */}
                                                        <td className="px-5 py-4">
                                                            <span
                                                                className={`px-2 py-1 rounded-full text-xs ${statusStyles[formattedStatus]}`}
                                                            >
                                                                {formattedStatus}
                                                            </span>
                                                        </td>

                                                        {/* Departed */}
                                                        <td className="px-5 py-4 text-secondary">
                                                            {departed}
                                                        </td>


                                                    </tr>
                                                );
                                            })
                                        ) : (
                                            <tr>
                                                <td colSpan={6} className="text-center py-6 text-gray-400">
                                                    No recent trips found
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                                </div>
                            </div>

                            {/* ================= RIGHT: DRIVER STATUS ================= */}




                            <div className="lg:col-span-4 bg-card border border-theme rounded-2xl p-4 shadow-[0_0_40px_rgba(0,209,255,0.08)]">

                                {/* Header */}
                                <div className="flex justify-between mb-4">
                                    <h2 className="text-sm font-semibold text-primary">Driver Status</h2>

                                    {drivers.length > 5 && (
                                        <button
                                            onClick={() => setShowAllDrivers(!showAllDrivers)}
                                            className="text-xs text-[var(--accent-blue)] hover:underline"
                                        >
                                            {showAllDrivers ? "Show Less" : "View All"}
                                        </button>
                                    )}
                                </div>

                                {/* Driver List */}
                                {drivers
                                    .slice(0, showAllDrivers ? drivers.length : 5)
                                    .map((trip, i) => {

                                        const name = trip.driver?.name || "Unknown";

                                        // ✅ Use driverAcceptanceStatus ONLY
                                        const statusMap: Record<string, { label: string; color: string }> = {
                                            accepted: { label: "Accepted", color: "green" },
                                            pending: { label: "Pending", color: "yellow" },
                                            rejected: { label: "Rejected", color: "red" }
                                        };

                                        const current = statusMap[trip.driverAcceptanceStatus] || {
                                            label: "Unknown",
                                            color: "gray"
                                        };

                                        return (
                                            <div key={trip._id || i} className="flex items-center justify-between mb-4">

                                                {/* Left */}
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-[rgba(255,255,255,0.1)] flex items-center justify-center text-xs text-primary">
                                                        {name[0]}
                                                    </div>

                                                    <div>
                                                        <p className="text-sm text-primary">{name}</p>

                                                        <div className="flex items-center gap-2 text-xs text-secondary">
                                                            <span
                                                                className={`w-2 h-2 rounded-full
                    ${current.color === "green" && "bg-green-400"}
                    ${current.color === "yellow" && "bg-yellow-400"}
                    ${current.color === "red" && "bg-red-500"}
                    ${current.color === "gray" && "bg-gray-500"}
                  `}
                                                            />
                                                            {current.label}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Right (Time from createdAt) */}
                                                <span className="text-xs text-secondary">
                                                    {trip.createdAt
                                                        ? new Date(trip.createdAt).toLocaleTimeString()
                                                        : "--"}
                                                </span>
                                            </div>
                                        );
                                    })}

                                {/* Empty State */}
                                {drivers.length === 0 && (
                                    <div className="text-center text-gray-400 text-sm py-6">
                                        No driver data available
                                    </div>
                                )}
                            </div>

                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default Index;
