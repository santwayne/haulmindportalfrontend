import React, { useState, useEffect, useRef } from 'react';
import {
    Car,
    Gauge,
    MapPin,
    Search,
    Filter,
    Eye,
    Navigation,
    Clock,
    Circle,
    AlertTriangle,
    ChevronLeft,
    ChevronRight,
    X,
    User,
    Wrench,
    Activity,
    TrendingUp,
    FileText,
    Image as ImageIcon,
    Truck,
    Route
} from 'lucide-react';
import apiClient from '../../../../axios/apiClient';
import { listOrder } from '../../../../axios/api/distapcher';

import type { ReactNode } from "react";

interface SortHeaderProps {
    field: string;
    children: ReactNode;
    className?: string;
}

interface Vehicle {
    _id: string;
    internalId: string;
    plateNumber: string;
    vinNumber: string;
    make: string;
    model: string;
    year: number;
    unitNumber?: string;
    trackingKey?: string;
    type?: string;
    ownership?: string;
    driver: {
        _id: string;
        name: string;
        phone: string;
    } | null;
    status: string;
    vehicleImage: { imageUrl: string }[];
    documents: { documentUrl: string }[];
    avatar: string;
    hasTrailer: boolean;
    trailer?: {
        _id: string;
        trailerNumber?: string;
        plateNumber?: string;
        unitNumber?: string;
    };
    trailerDetails: {
        serialNumber: string;
        capacity: string;
        status: string;
    } | null;
    currentLocation: {
        address: string;
        longitude: string;
        latitude: string;
        updatedAt: Date;
    };
    speed: number;
    fuelLevel: number;
    odometer: number;
    engineOn: boolean;
    driverBehaviour: {
        harshBraking: number;
        speedingEvents: number;
        idlingDuration: number;
    };
    engineHealth: {
        faultCodes: { code: string; description: string }[];
        batteryVoltage: number;
        engineHours: number;
    };
    trips: {
        startTime: Date;
        endTime: Date;
        route: { latitude: string; longitude: string; timestamp: Date }[];
    }[];
}

interface VehicleAssignment {
    loadId: string;
    customer: string;
    origin: string;
    destination: string;
    dispatcher: string;
    eta: string;
    milesToday: number;
    milesThisWeek: number;
    lastCheckpoint: string;
}

const DEFAULT_ASSIGNMENT: VehicleAssignment = {
    loadId: "Unassigned",
    customer: "—",
    origin: "—",
    destination: "—",
    dispatcher: "—",
    eta: "—",
    milesToday: 0,
    milesThisWeek: 0,
    lastCheckpoint: "Awaiting dispatch",
};

// Mock assignments removed - using real trip data only

const getAssignmentForVehicle = (vehicle: Vehicle, assignments: Record<string, VehicleAssignment>): VehicleAssignment => {
    // Try all possible vehicle identifiers in priority order (normalize to strings)
    const vehicleIdentifiers = [
        vehicle._id?.toString()?.trim(),
        vehicle.internalId?.toString()?.trim(),
        vehicle.plateNumber?.toString()?.trim(),
        vehicle.vinNumber?.toString()?.trim()
    ].filter(Boolean) as string[];

    // Check assignments map with all possible identifiers
    for (const identifier of vehicleIdentifiers) {
        const normalizedId = String(identifier).trim();
        if (normalizedId && assignments[normalizedId]) {
            return assignments[normalizedId];
        }
    }

    // No real assignment found - return default
    return DEFAULT_ASSIGNMENT;
};

const formatMiles = (value: number) => `${value.toLocaleString()} mi`;





const VehicleList = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');
    const [currentPage, setCurrentPage] = useState(1);
    const [vehiclesPerPage, setVehiclesPerPage] = useState(10);
    const [sortBy, setSortBy] = useState('plateNumber');
    const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
    const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
    const [showDetails, setShowDetails] = useState(false);
    const [showDetailsSidebar, setShowDetailsSidebar] = useState(false);
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [loading, setLoading] = useState(true);
    const [vehicleAssignments, setVehicleAssignments] = useState<Record<string, VehicleAssignment>>({});

    // Refs for scrollbar synchronization
    const topScrollRef = useRef<HTMLDivElement>(null);
    const bottomScrollRef = useRef<HTMLDivElement>(null);

    // Fetch vehicles, trips, and loads from API
    useEffect(() => {
        const fetchAllData = async () => {
            try {
                setLoading(true);

                // Fetch vehicles
                const vehiclesRes = await apiClient.get('/admin/vehicles/list');
                let formattedVehicles: Vehicle[] = [];

                if (vehiclesRes.data.success && vehiclesRes.data.data?.vehicles) {
                    formattedVehicles = vehiclesRes.data.data.vehicles.map((v: any) => ({
                        _id: v._id,
                        internalId: v.internalId || v.unitNo || v._id,
                        plateNumber: v.plateNumber || v.licensePlate || 'N/A',
                        vinNumber: v.vinNumber || v.vinNo || 'N/A',
                        make: v.make || 'Unknown',
                        model: v.model || 'Unknown',
                        year: v.year || new Date().getFullYear(),
                        driver: null,
                        status: v.status || 'stopped',
                        vehicleImage: [],
                        documents: [],
                        avatar: 'https://via.placeholder.com/100x100/6366f1/ffffff?text=Vehicle',
                        hasTrailer: false,
                        trailerDetails: null,
                        currentLocation: {
                            address: v.currentLocation?.address || 'Location not available',
                            longitude: String(v.currentLocation?.longitude || '0'),
                            latitude: String(v.currentLocation?.latitude || '0'),
                            updatedAt: v.currentLocation?.updatedAt ? new Date(v.currentLocation.updatedAt) : new Date()
                        },
                        speed: v.speed || 0,
                        fuelLevel: v.fuelLevel || 0,
                        odometer: v.odometer || 0,
                        engineOn: v.engineOn || false,
                        driverBehaviour: v.driverBehaviour || {
                            harshBraking: 0,
                            speedingEvents: 0,
                            idlingDuration: 0
                        },
                        engineHealth: v.engineHealth || {
                            faultCodes: [],
                            batteryVoltage: 12.0,
                            engineHours: 0
                        },
                        trips: []
                    }));
                    setVehicles(formattedVehicles);
                }

                // Fetch all orders (all statuses to show any assignment)
                const allOrdersRes = await listOrder({ limit: 500 }); // Fetch all orders, no status filter
                let allOrders: any[] = [];

                if (allOrdersRes?.success && Array.isArray(allOrdersRes?.data)) {
                    allOrders = allOrdersRes.data;
                } else {
                    // Fallback: try fetching by status individually
                    const quotedOrdersRes = await listOrder({ status: 'QUOTED', limit: 200 });
                    const inProgressOrdersRes = await listOrder({ status: 'IN_PROGRESS', limit: 200 });
                    const dispatchedOrdersRes = await listOrder({ status: 'dispatched', limit: 200 });
                    const completedOrdersRes = await listOrder({ status: 'COMPLETED', limit: 200 });
                    const quotedOrders = quotedOrdersRes?.success && Array.isArray(quotedOrdersRes?.data) ? quotedOrdersRes.data : [];
                    const inProgressOrders = inProgressOrdersRes?.success && Array.isArray(inProgressOrdersRes?.data) ? inProgressOrdersRes.data : [];
                    const dispatchedOrders = dispatchedOrdersRes?.success && Array.isArray(dispatchedOrdersRes?.data) ? dispatchedOrdersRes.data : [];
                    const completedOrders = completedOrdersRes?.success && Array.isArray(completedOrdersRes?.data) ? completedOrdersRes.data : [];
                    allOrders = [...quotedOrders, ...inProgressOrders, ...dispatchedOrders, ...completedOrders];
                }

                console.log(`📊 Found ${allOrders.length} orders to process`);
                console.log('📋 Sample order data:', allOrders[0] ? {
                    orderNumber: allOrders[0].orderNumber,
                    customerOrderNo: allOrders[0].customerOrderNo,
                    status: allOrders[0].status,
                    truck: allOrders[0].truck ? {
                        _id: allOrders[0].truck._id,
                        unitNumber: allOrders[0].truck.unitNumber,
                        internalId: allOrders[0].truck.internalId,
                        plateNumber: allOrders[0].truck.plateNumber
                    } : 'No truck'
                } : 'No orders');

                // Create assignments map from orders only
                const assignments: Record<string, VehicleAssignment> = {};

                // Process orders - prioritize in-progress, then dispatched, then others
                const sortedOrders = [...allOrders].sort((a: any, b: any) => {
                    const statusPriority: Record<string, number> = {
                        'IN_PROGRESS': 1,
                        'in-progress': 1,
                        'dispatched': 2,
                        'DISPATCHED': 2,
                        'QUOTED': 3,
                        'quoted': 3,
                        'COMPLETED': 4,
                        'completed': 4,
                        'cancelled': 5,
                        'CANCELLED': 5
                    };
                    return (statusPriority[a.status] || 99) - (statusPriority[b.status] || 99);
                });

                sortedOrders.forEach((order: any) => {
                    if (!order.truck) {
                        console.warn('⚠️ Order missing truck:', order.orderNumber || order._id);
                        return;
                    }

                    // Extract all possible vehicle identifiers from the order's truck
                    const truck = order.truck;
                    const truckIds: string[] = [];

                    // Add all possible ID formats (convert to strings for consistent comparison)
                    if (truck._id) {
                        const idStr = typeof truck._id === 'string' ? truck._id : truck._id.toString();
                        truckIds.push(idStr);
                    }
                    if (truck.unitNumber) truckIds.push(String(truck.unitNumber));
                    if (truck.internalId) truckIds.push(String(truck.internalId));
                    if (truck.plateNumber) truckIds.push(String(truck.plateNumber));
                    if (truck.licensePlate) truckIds.push(String(truck.licensePlate));

                    if (truckIds.length === 0) {
                        console.warn('⚠️ Order truck has no identifiable ID:', order.orderNumber || order._id, truck);
                        return;
                    }

                    // Extract origin and destination from order
                    let origin = '—';
                    let destination = '—';

                    // Get pickup location
                    if (order.pickupLocation) {
                        origin = order.pickupLocation.place ||
                            order.pickupLocation.address ||
                            (order.pickupLocation.placeId?.name) ||
                            (order.pickupLocation.placeId?.currentLocation?.address) ||
                            (typeof order.pickupLocation === 'string' ? order.pickupLocation : '—');
                    }

                    // Get delivery location
                    if (order.deliveryLocation) {
                        destination = order.deliveryLocation.place ||
                            order.deliveryLocation.address ||
                            (order.deliveryLocation.placeId?.name) ||
                            (order.deliveryLocation.placeId?.currentLocation?.address) ||
                            (typeof order.deliveryLocation === 'string' ? order.deliveryLocation : '—');
                    }

                    // Extract customer name
                    let customerName = '—';
                    if (order.customer) {
                        customerName = order.customer.name ||
                            (typeof order.customer === 'string' ? order.customer : '—');
                    }

                    const driverName = order.driver?.name || '—';

                    // Calculate ETA
                    let eta = '—';
                    if (order.deliveryDate) {
                        eta = `ETA ${new Date(order.deliveryDate).toLocaleString()}`;
                    }

                    // Calculate distance (rough estimate if route data available)
                    let distance = 0;
                    if (order.route?.totalDistance) {
                        distance = Math.round(order.route.totalDistance * 0.621371); // Convert km to miles
                    }

                    // Store assignment with multiple keys for lookup
                    const assignment: VehicleAssignment = {
                        loadId: order.orderNumber || order.customerOrderNo || `Order-${order._id?.toString().slice(-6)}`,
                        customer: customerName,
                        origin: origin,
                        destination: destination,
                        dispatcher: driverName,
                        eta: eta,
                        milesToday: distance,
                        milesThisWeek: 0, // Would need to calculate from order history
                        lastCheckpoint: order.status === 'IN_PROGRESS' || order.status === 'in-progress' ? 'En route' :
                            order.status === 'dispatched' || order.status === 'DISPATCHED' ? 'Dispatched' :
                                order.status === 'COMPLETED' || order.status === 'completed' ? 'Delivered' :
                                    order.status
                    };

                    // Store assignment with all possible vehicle ID formats for flexible lookup
                    // Since orders are sorted by priority, we only store the first assignment for each vehicle
                    // This ensures in-progress orders take priority over planned orders
                    truckIds.forEach(truckId => {
                        if (truckId) {
                            // Normalize the ID to string for consistent comparison
                            const normalizedId = String(truckId).trim();
                            if (normalizedId && !assignments[normalizedId]) {
                                assignments[normalizedId] = assignment;
                            }
                        }
                    });

                    // Log assignment creation for debugging
                    if (truckIds.length > 0) {
                        const storedCount = truckIds.filter(id => assignments[String(id).trim()]).length;
                        console.log(`✅ Order ${assignment.loadId} (${order.status}): Matched ${storedCount}/${truckIds.length} vehicle IDs`, truckIds);
                    }
                });

                console.log(`📋 Total assignments created: ${Object.keys(assignments).length}`);
                if (Object.keys(assignments).length > 0) {
                    console.log('📋 Assignment keys (first 10):', Object.keys(assignments).slice(0, 10));
                    console.log('📋 Sample assignment:', assignments[Object.keys(assignments)[0]]);
                }

                // Log vehicle IDs for debugging
                console.log(`🚛 Total vehicles: ${formattedVehicles.length}`);
                if (formattedVehicles.length > 0) {
                    console.log('🚛 Sample vehicle IDs (first 3):', formattedVehicles.slice(0, 3).map(v => ({
                        _id: v._id?.toString(),
                        internalId: v.internalId,
                        plateNumber: v.plateNumber
                    })));
                }

                setVehicleAssignments(assignments);
            } catch (error) {
                console.error('Error fetching data:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchAllData();

        // Refresh assignments every 30 seconds
        const interval = setInterval(() => {
            fetchAllData();
        }, 30000);

        return () => clearInterval(interval);
    }, []);

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'moving': return 'text-[var(--accent-green)] bg-[var(--accent-green)]/10 border-theme';
            case 'idle': return 'text-secondary bg-card border-theme';
            case 'stopped': return 'text-primary bg-card border-theme';
            case 'maintenance': return 'text-[var(--accent-red)] bg-[var(--accent-red)]/10 border-theme';
            default: return 'text-primary bg-card border-theme';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'moving': return <Navigation className="w-3 h-3" />;
            case 'idle': return <Clock className="w-3 h-3" />;
            case 'stopped': return <Circle className="w-3 h-3" />;
            case 'maintenance': return <AlertTriangle className="w-3 h-3" />;
            default: return <Circle className="w-3 h-3" />;
        }
    };

    const getSpeedColor = (speed: number, status: string) => {
        if (status === 'moving' && speed > 0) return 'text-accent';
        return 'text-secondary';
    };

    // Filter and search logic
    const filteredVehicles = vehicles.filter(vehicle => {
        const matchesStatus = filterStatus === 'all' || vehicle.status === filterStatus;
        const matchesSearch =
            vehicle.plateNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
            vehicle.internalId.toLowerCase().includes(searchTerm.toLowerCase()) ||
            vehicle.currentLocation.address.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesStatus && matchesSearch;
    });

    const sortedVehicles = [...filteredVehicles].sort((a, b) => {
        let aValue: string | number;
        let bValue: string | number;

        switch (sortBy) {
            case "plateNumber":
                aValue = a.plateNumber;
                bValue = b.plateNumber;
                break;
            case "internalId":
                aValue = a.internalId;
                bValue = b.internalId;
                break;
            case "speed":
                aValue = a.speed;
                bValue = b.speed;
                break;
            case "assignment":
                aValue = getAssignmentForVehicle(a, vehicleAssignments).loadId;
                bValue = getAssignmentForVehicle(b, vehicleAssignments).loadId;
                break;
            case "miles":
                aValue = getAssignmentForVehicle(a, vehicleAssignments).milesToday;
                bValue = getAssignmentForVehicle(b, vehicleAssignments).milesToday;
                break;
            case "status":
                aValue = a.status;
                bValue = b.status;
                break;
            case "location":
                aValue = a.currentLocation.address;
                bValue = b.currentLocation.address;
                break;
            default:
                aValue = a.plateNumber;
                bValue = b.plateNumber;
        }

        return compareValues(aValue, bValue, sortOrder);
    });

    function compareValues<T extends string | number>(
        a: T,
        b: T,
        order: "asc" | "desc"
    ): number {
        if (typeof a === "string" && typeof b === "string") {
            return order === "asc" ? a.localeCompare(b) : b.localeCompare(a);
        }
        if (typeof a === "number" && typeof b === "number") {
            return order === "asc" ? a - b : b - a;
        }
        return 0;
    }

    // Pagination
    const indexOfLastVehicle = currentPage * vehiclesPerPage;
    const indexOfFirstVehicle = indexOfLastVehicle - vehiclesPerPage;
    const currentVehicles = sortedVehicles.slice(indexOfFirstVehicle, indexOfLastVehicle);
    const totalPages = Math.ceil(sortedVehicles.length / vehiclesPerPage);

    const handleSort = (field: string) => {
        if (sortBy === field) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(field);
            setSortOrder('asc');
        }
    };

    const handleViewDetails = (vehicle: Vehicle) => {
        setSelectedVehicle(vehicle);
        setShowDetails(true);
    };

    const SortHeader: React.FC<SortHeaderProps> = ({
        field,
        children,
        className = "",
    }) => (
        <th
            className={`px-6 py-4 text-left text-xs font-semibold text-[var(--accent-blue)] uppercase tracking-wider cursor-pointer hover:bg-[rgba(255,255,255,0.03)] transition-colors duration-150 ${className}`}
            onClick={() => handleSort(field)}
        >
            <div className="flex items-center gap-1">
                <span>{children}</span>
                {sortBy === field && (
                    <span className="text-[var(--accent-blue)] text-sm font-bold">
                        {sortOrder === "asc" ? "↑" : "↓"}
                    </span>
                )}
            </div>
        </th>
    );

    // Stats calculation
    const totalMilesToday = vehicles.reduce((sum, vehicle) => sum + getAssignmentForVehicle(vehicle, vehicleAssignments).milesToday, 0);

    const stats = {
        total: vehicles.length,
        moving: vehicles.filter(v => v.status === 'moving').length,
        idle: vehicles.filter(v => v.status === 'idle').length,
        stopped: vehicles.filter(v => v.status === 'stopped').length,
        maintenance: vehicles.filter(v => v.status === 'maintenance').length,
        milesToday: totalMilesToday
    };

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
    }, [currentVehicles, vehicles, searchTerm, filterStatus]);

    if (loading) {
        return (
            <div className="min-h-screen p-4 bg-card px-6 flex items-center justify-center">
                <div className="text-secondary">Loading vehicles...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen p-4 bg-main px-6">
            <div className="w-full mx-auto p-2">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-primary mb-2">Vehicle Fleet</h1>
                            <p className="text-secondary">Manage and monitor your vehicle fleet</p>
                        </div>
                    </div>
                </div>



                {/* Stats Cards */}
                <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-8">

                    {/* Total Vehicles */}
                    <div className="rounded-xl p-4 bg-card border border-theme">
                        <div className="text-2xl font-bold text-primary mb-1">
                            {stats.total}
                        </div>
                        <div className="text-sm font-medium text-secondary">
                            Total Vehicles
                        </div>
                    </div>

                    {/* Moving */}
                    <div className="rounded-xl p-4 bg-[var(--accent-green)]/10 border border-theme">
                        <div className="text-2xl font-bold text-[var(--accent-green)] mb-1">
                            {stats.moving}
                        </div>
                        <div className="text-sm font-medium text-[var(--accent-green)]">
                            Moving
                        </div>
                        <div className="w-full bg-[var(--accent-green)]/10 rounded-full h-1 mt-2">
                            <div
                                className="bg-[var(--accent-green)] h-1 rounded-full"
                                style={{ width: `${(stats.moving / stats.total) * 100}%` }}
                            />
                        </div>
                    </div>

                    {/* Idle */}
                    <div className="rounded-xl p-4 bg-[var(--accent-orange)]/10 border border-theme">
                        <div className="text-2xl font-bold text-[var(--accent-orange)] mb-1">
                            {stats.idle}
                        </div>
                        <div className="text-sm font-medium text-[var(--accent-orange)]">
                            Idle
                        </div>
                        <div className="w-full bg-[var(--accent-orange)]/10 rounded-full h-1 mt-2">
                            <div
                                className="bg-[var(--accent-orange)] h-1 rounded-full"
                                style={{ width: `${(stats.idle / stats.total) * 100}%` }}
                            />
                        </div>
                    </div>

                    {/* Stopped */}
                    <div className="rounded-xl p-4 bg-[var(--accent-purple)]/10 border border-theme">
                        <div className="text-2xl font-bold text-[var(--accent-purple)] mb-1">
                            {stats.stopped}
                        </div>
                        <div className="text-sm font-medium text-[var(--accent-purple)]">
                            Stopped
                        </div>
                        <div className="w-full bg-[var(--accent-purple)]/10 rounded-full h-1 mt-2">
                            <div
                                className="bg-[var(--accent-purple)] h-1 rounded-full"
                                style={{ width: `${(stats.stopped / stats.total) * 100}%` }}
                            />
                        </div>
                    </div>

                    {/* Maintenance */}
                    <div className="rounded-xl p-4 bg-[var(--accent-red)]/10 border border-theme">
                        <div className="text-2xl font-bold text-[var(--accent-red)] mb-1">
                            {stats.maintenance}
                        </div>
                        <div className="text-sm font-medium text-[var(--accent-red)]">
                            Maintenance
                        </div>
                        <div className="w-full bg-[var(--accent-red)]/10 rounded-full h-1 mt-2">
                            <div
                                className="bg-[var(--accent-red)] h-1 rounded-full"
                                style={{ width: `${(stats.maintenance / stats.total) * 100}%` }}
                            />
                        </div>
                    </div>

                    {/* Miles Logged */}
                    <div className="rounded-xl p-4 bg-[var(--accent-orange)]/10 border border-theme">
                        <div className="text-2xl font-bold text-[var(--accent-orange)] mb-1">
                            {stats.milesToday.toLocaleString()}
                        </div>
                        <div className="text-sm font-medium text-[var(--accent-orange)]">
                            Miles Logged Today
                        </div>
                        <p className="text-xs text-secondary mt-1">
                            Across active assignments
                        </p>
                    </div>

                </div>


                {/* Filters and Search */}
                <div className="bg-card rounded-xl shadow-sm border border-theme mb-6 overflow-hidden">
                    <div className="p-6 border-b border-theme">
                        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                            <div className="flex-1">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-secondary w-5 h-5" />
                                    <input
                                        type="text"
                                        placeholder="Search by plate number, internal ID, or location..."
                                        className="w-full pl-10 pr-4 py-2 bg-card text-primary text-sm border border-theme rounded-lg focus:ring-2 focus:ring-[var(--accent-blue)] focus:border-[var(--accent-blue)] transition-colors duration-150"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="flex gap-3">
                                <div className="relative">
                                    <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-secondary w-4 h-4" />
                                    <select
                                        className="pl-10 pr-8 py-2 text-sm border border-theme rounded-lg focus:ring-2 focus:ring-[var(--accent-blue)] focus:border-[var(--accent-blue)] appearance-none bg-card text-primary min-w-40 transition-colors duration-150"
                                        value={filterStatus}
                                        onChange={(e) => setFilterStatus(e.target.value)}
                                    >
                                        <option value="all">All Status</option>
                                        <option value="moving">Moving</option>
                                        <option value="idle">Idle</option>
                                        <option value="stopped">Stopped</option>
                                        <option value="maintenance">Maintenance</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div className="mt-4 flex justify-between items-center text-sm text-secondary">
                            <span>Showing {indexOfFirstVehicle + 1}-{Math.min(indexOfLastVehicle, sortedVehicles.length)} of {sortedVehicles.length} vehicles</span>
                            <div className="flex items-center space-x-2">
                                <span>Show:</span>
                                <select
                                    className="border border-theme rounded-lg px-3 py-1 text-sm bg-card text-primary focus:ring-2 focus:ring-[var(--accent-blue)] focus:border-[var(--accent-blue)]"
                                    value={vehiclesPerPage}
                                    onChange={(e) => { setVehiclesPerPage(Number(e.target.value)); setCurrentPage(1); }}
                                >
                                    <option value="10">10</option>
                                    <option value="25">25</option>
                                    <option value="50">50</option>
                                </select>
                                <span>per page</span>
                            </div>
                        </div>
                    </div>

                    {/* Table */}
                    {/* Top Scrollbar - Only visible horizontal scrollbar */}
                    <style>{`
                        .top-scrollbar-container::-webkit-scrollbar {
                            height: 6px;
                        }
                        .top-scrollbar-container::-webkit-scrollbar-track {
                            background: transparent;
                        }
                        .top-scrollbar-container::-webkit-scrollbar-thumb {
                            background: rgba(0,209,255,0.25);
                            border-radius: 4px;
                        }
                        .top-scrollbar-container::-webkit-scrollbar-thumb:hover {
                            background: rgba(0,209,255,0.45);
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
                            scrollbarColor: '#224c75 #111c24'  /* Firefox */
                        }}
                    >
                        <div className="top-scroll-content" style={{ height: '1px' }}></div>
                    </div>
                    {/* Main Table - Scrollbar hidden, controlled by top scrollbar */}
                    <div
                        ref={bottomScrollRef}
                        className="overflow-x-auto overflow-y-visible table-container-hidden-scrollbar"
                    >
                        <table className="min-w-full divide-theme" style={{ minWidth: '1400px' }}>
                            <thead className="bg-card">
                                <tr>
                                    <SortHeader field="internalId">Vehicle ID</SortHeader>
                                    <SortHeader field="plateNumber">Plate Number</SortHeader>
                                    <SortHeader field="location">Current Location</SortHeader>
                                    <SortHeader field="speed">Speed</SortHeader>
                                    <SortHeader field="assignment">Assigned Load</SortHeader>
                                    <SortHeader field="miles">Miles Driven</SortHeader>
                                    <SortHeader field="status">Status</SortHeader>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-[var(--accent-blue)] uppercase tracking-wider">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-card  divide-theme">
                                {currentVehicles.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="px-6 py-12 text-center">
                                            <div className="flex flex-col items-center justify-center">
                                                <Car className="w-12 h-12 text-secondary mb-4" />
                                                <p className="text-secondary font-medium">No vehicles found</p>
                                                <p className="text-secondary text-sm mt-1">
                                                    {searchTerm || filterStatus !== 'all'
                                                        ? 'Try adjusting your search or filter criteria'
                                                        : 'No vehicles are available for your company'}
                                                </p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    currentVehicles.map((vehicle) => {
                                        const assignment = getAssignmentForVehicle(vehicle, vehicleAssignments);
                                        return (
                                            <tr
                                                key={vehicle._id}
                                                className="hover:bg-[rgba(255,255,255,0.03)] transition-colors duration-150 cursor-pointer"
                                                onClick={() => {
                                                    setSelectedVehicle(vehicle);
                                                    setShowDetailsSidebar(true);
                                                }}
                                            >
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center">
                                                        <div className="p-2 bg-[var(--accent-blue)]/10 rounded-lg mr-3 border border-[var(--accent-blue)]/20">
                                                            <Car className="w-5 h-5 text-accent" />
                                                        </div>
                                                        <div className="text-sm font-semibold text-primary">
                                                            {vehicle.internalId}
                                                        </div>
                                                    </div>
                                                </td>

                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm font-medium text-primary">
                                                        {vehicle.plateNumber}
                                                    </div>
                                                </td>

                                                <td className="px-6 py-4">
                                                    <div className="flex items-start space-x-2">
                                                        <MapPin className="w-4 h-4 text-secondary mt-0.5 flex-shrink-0" />
                                                        <div className="text-sm text-primary max-w-xs">
                                                            {vehicle.currentLocation.address}
                                                        </div>
                                                    </div>
                                                    <div className="text-xs text-secondary mt-1 ml-6">
                                                        {vehicle.currentLocation.latitude}, {vehicle.currentLocation.longitude}
                                                    </div>
                                                </td>

                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center space-x-2">
                                                        <Gauge className={`w-4 h-4 ${getSpeedColor(vehicle.speed, vehicle.status)}`} />
                                                        <span className={`text-sm font-medium ${getSpeedColor(vehicle.speed, vehicle.status)}`}>
                                                            {vehicle.speed} km/h
                                                        </span>
                                                    </div>
                                                </td>

                                                <td className="px-6 py-4">
                                                    <div className="space-y-1">
                                                        <div className="text-sm font-semibold text-primary flex items-center space-x-2">
                                                            <Route className="w-4 h-4 text-[var(--accent-blue)]" />
                                                            <span>{assignment.loadId}</span>
                                                        </div>
                                                        <p className="text-xs text-secondary">
                                                            {assignment.origin} → {assignment.destination}
                                                        </p>
                                                        <p className="text-xs text-secondary">
                                                            Dispatcher: {assignment.dispatcher}
                                                        </p>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm font-semibold text-primary">
                                                        {formatMiles(assignment.milesToday)} today
                                                    </div>
                                                    <p className="text-xs text-secondary">
                                                        {formatMiles(assignment.milesThisWeek)} this week
                                                    </p>
                                                </td>

                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border ${getStatusColor(vehicle.status)}`}>
                                                        {getStatusIcon(vehicle.status)}
                                                        <span className="capitalize">{vehicle.status}</span>
                                                    </span>
                                                </td>

                                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium" onClick={(e) => e.stopPropagation()}>
                                                    <button
                                                        onClick={() => handleViewDetails(vehicle)}
                                                        className="inline-flex items-center space-x-1 text-accent hover:text-[var(--accent-blue)] px-3 py-2 rounded-lg hover:bg-[rgba(255,255,255,0.05)] transition-colors duration-150 text-sm font-medium"
                                                    >
                                                        <Eye className="w-4 h-4" />
                                                        <span>Details</span>
                                                    </button>
                                                </td>
                                            </tr>
                                        )
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="bg-card px-6 py-4 border-t border-theme flex items-center justify-between">
                            <div className="flex-1 flex justify-between sm:hidden">
                                <button
                                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                                    disabled={currentPage === 1}
                                    className="relative inline-flex items-center px-4 py-2 border border-theme text-secondary text-sm font-medium rounded-lg bg-card hover:bg-[rgba(255,255,255,0.05)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-150"
                                >
                                    Previous
                                </button>
                                <button
                                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                                    disabled={currentPage === totalPages}
                                    className="ml-3 relative inline-flex items-center px-4 py-2 border border-theme text-secondary text-sm font-medium rounded-lg bg-card hover:bg-[rgba(255,255,255,0.05)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-150"
                                >
                                    Next
                                </button>
                            </div>
                            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                                <div>
                                    <p className="text-sm text-primary font-medium">
                                        Showing <span className="font-semibold">{indexOfFirstVehicle + 1}</span> to{' '}
                                        <span className="font-semibold">{Math.min(indexOfLastVehicle, sortedVehicles.length)}</span> of{' '}
                                        <span className="font-semibold">{sortedVehicles.length}</span> results
                                    </p>
                                </div>
                                <div>
                                    <nav className="relative z-0 inline-flex rounded-lg shadow-sm -space-x-px">
                                        <button
                                            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                                            disabled={currentPage === 1}
                                            className="relative inline-flex items-center px-3 py-2 rounded-l-lg border border-theme text-secondary bg-card text-sm font-medium hover:bg-[rgba(255,255,255,0.05)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-150"
                                        >
                                            <ChevronLeft className="h-4 w-4" />
                                        </button>

                                        {[...Array(totalPages)].map((_, index) => {
                                            const page = index + 1;
                                            return (
                                                <button
                                                    key={page}
                                                    onClick={() => setCurrentPage(page)}
                                                    className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium transition-colors duration-150 ${currentPage === page
                                                        ? 'z-10 bg-[var(--accent-blue)] border-[var(--accent-blue)] text-white font-semibold'
                                                        : 'bg-card border-theme text-secondary hover:bg-[rgba(255,255,255,0.05)]'
                                                        }`}
                                                >
                                                    {page}
                                                </button>
                                            );
                                        })}

                                        <button
                                            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                                            disabled={currentPage === totalPages}
                                            className="relative inline-flex items-center px-3 py-2 rounded-r-lg border border-theme text-secondary bg-card text-sm font-medium hover:bg-[rgba(255,255,255,0.05)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-150"
                                        >
                                            <ChevronRight className="h-4 w-4" />
                                        </button>
                                    </nav>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Vehicle Details Modal */}
                {showDetails && selectedVehicle && (() => {
                    const assignmentDetails = getAssignmentForVehicle(selectedVehicle, vehicleAssignments);
                    return (
                        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] overflow-hidden">
                            <div className="absolute transition-opacity" onClick={() => setShowDetails(false)} />
                            <div className="absolute inset-y-0 right-0 max-w-2xl w-full bg-card shadow-xl">
                                <div className="flex h-full flex-col">
                                    {/* Header */}
                                    <div className="bg-card px-6 py-4 border-b border-theme">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center space-x-3">

                                                <div className="w-12 h-12 rounded-lg bg-[rgba(255,255,255,0.08)] flex items-center justify-center border border-theme">
                                                    <Truck className="w-6 h-6 text-[var(--accent-blue)]" />
                                                </div>

                                                <div>
                                                    <h2 className="text-xl font-bold text-primary">
                                                        {selectedVehicle.internalId}
                                                    </h2>
                                                    <p className="text-sm text-secondary">{selectedVehicle.plateNumber}</p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => setShowDetails(false)}
                                                className="p-2 hover:bg-[rgba(255,255,255,0.08)] rounded-lg transition-colors duration-150"
                                            >
                                                <X className="w-5 h-5 text-secondary" />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 overflow-y-auto">
                                        <div className="p-6 space-y-6">

                                            {/* Basic Information */}
                                            <div className="bg-card border border-theme rounded-lg p-6">
                                                <h3 className="text-lg font-semibold text-primary mb-4 flex items-center">
                                                    <Car className="w-5 h-5 mr-2 text-accent" />
                                                    Vehicle Information
                                                </h3>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="text-sm font-medium text-secondary">Internal ID</label>
                                                        <p className="text-sm text-primary font-medium">{selectedVehicle.internalId}</p>
                                                    </div>
                                                    <div>
                                                        <label className="text-sm font-medium text-secondary">Plate Number</label>
                                                        <p className="text-sm text-primary font-medium">{selectedVehicle.plateNumber}</p>
                                                    </div>
                                                    <div>
                                                        <label className="text-sm font-medium text-secondary">VIN Number</label>
                                                        <p className="text-sm text-primary font-medium">{selectedVehicle.vinNumber}</p>
                                                    </div>
                                                    <div>
                                                        <label className="text-sm font-medium text-secondary">Make & Model</label>
                                                        <p className="text-sm text-primary font-medium">{selectedVehicle.make} {selectedVehicle.model}</p>
                                                    </div>
                                                    <div>
                                                        <label className="text-sm font-medium text-secondary">Year</label>
                                                        <p className="text-sm text-primary font-medium">{selectedVehicle.year}</p>
                                                    </div>
                                                    <div>
                                                        <label className="text-sm font-medium text-secondary">Odometer</label>
                                                        <p className="text-sm text-primary font-medium">{selectedVehicle.odometer.toLocaleString()} km</p>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Driver Information */}
                                            <div className="bg-card border border-theme rounded-lg p-6">
                                                <h3 className="text-lg font-semibold text-primary mb-4 flex items-center">
                                                    <User className="w-5 h-5 mr-2 text-[var(--accent-green)]" />
                                                    Driver Information
                                                </h3>
                                                {selectedVehicle.driver ? (
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                        <div>
                                                            <label className="text-sm font-medium text-secondary">Driver Name</label>
                                                            <p className="text-sm text-primary font-medium">{selectedVehicle.driver.name}</p>
                                                        </div>
                                                        <div>
                                                            <label className="text-sm font-medium text-secondary">Phone Number</label>
                                                            <p className="text-sm text-primary font-medium">{selectedVehicle.driver.phone}</p>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="text-sm text-secondary italic">No driver assigned</div>
                                                )}
                                            </div>

                                            {/* Current Status */}
                                            <div className="bg-card border border-theme rounded-lg p-6">
                                                <h3 className="text-lg font-semibold text-primary mb-4 flex items-center">
                                                    <Activity className="w-5 h-5 mr-2 text-[var(--accent-purple)]" />
                                                    Current Status
                                                </h3>
                                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                                    <div>
                                                        <label className="text-sm font-medium text-secondary">Status</label>
                                                        <div className="mt-1">
                                                            <span className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border ${getStatusColor(selectedVehicle.status)}`}>
                                                                {getStatusIcon(selectedVehicle.status)}
                                                                <span className="capitalize">{selectedVehicle.status}</span>
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <label className="text-sm font-medium text-secondary">Speed</label>
                                                        <p className={`text-sm font-medium ${getSpeedColor(selectedVehicle.speed, selectedVehicle.status)}`}>
                                                            {selectedVehicle.speed} km/h
                                                        </p>
                                                    </div>
                                                    <div>
                                                        <label className="text-sm font-medium text-secondary">Miles Today</label>
                                                        <p className="text-sm font-medium text-primary">
                                                            {formatMiles(assignmentDetails.milesToday)}
                                                        </p>
                                                        <p className="text-xs text-secondary">
                                                            {formatMiles(assignmentDetails.milesThisWeek)} this week
                                                        </p>
                                                    </div>
                                                    <div>
                                                        <label className="text-sm font-medium text-secondary">Engine</label>
                                                        <p className="text-sm text-primary font-medium">
                                                            {selectedVehicle.engineOn ? (
                                                                <span className="text-[var(--accent-green)]">ON</span>
                                                            ) : (
                                                                <span className="text-[var(--accent-purple)]">OFF</span>
                                                            )}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Location Information */}
                                            <div className="bg-card border border-theme rounded-lg p-6">
                                                <h3 className="text-lg font-semibold text-primary mb-4 flex items-center">
                                                    <MapPin className="w-5 h-5 mr-2 text-[var(--accent-purple)]" />
                                                    Current Location
                                                </h3>
                                                <div className="space-y-2">
                                                    <div>
                                                        <label className="text-sm font-medium text-secondary">Address</label>
                                                        <p className="text-sm text-primary">{selectedVehicle.currentLocation.address}</p>
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div>
                                                            <label className="text-sm font-medium text-secondary">Latitude</label>
                                                            <p className="text-sm text-primary font-mono">{selectedVehicle.currentLocation.latitude}</p>
                                                        </div>
                                                        <div>
                                                            <label className="text-sm font-medium text-secondary">Longitude</label>
                                                            <p className="text-sm text-primary font-mono">{selectedVehicle.currentLocation.longitude}</p>
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <label className="text-sm font-medium text-secondary">Last Updated</label>
                                                        <p className="text-sm text-primary">{new Date(selectedVehicle.currentLocation.updatedAt).toLocaleString()}</p>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Assignment Information */}
                                            <div className="bg-card border border-theme rounded-lg p-6">
                                                <h3 className="text-lg font-semibold text-primary mb-4 flex items-center">
                                                    <Route className="w-5 h-5 mr-2 text-accent" />
                                                    Current Load
                                                </h3>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="text-sm font-medium text-secondary">Load ID</label>
                                                        <p className="text-sm text-primary font-semibold">{assignmentDetails.loadId}</p>
                                                        <p className="text-xs text-secondary">{assignmentDetails.customer}</p>
                                                    </div>
                                                    <div>
                                                        <label className="text-sm font-medium text-secondary">Dispatcher</label>
                                                        <p className="text-sm text-primary font-medium">{assignmentDetails.dispatcher}</p>
                                                        <p className="text-xs text-secondary">{assignmentDetails.eta}</p>
                                                    </div>
                                                    <div>
                                                        <label className="text-sm font-medium text-secondary">Route</label>
                                                        <p className="text-sm text-primary">{assignmentDetails.origin}</p>
                                                        <p className="text-xs text-secondary">→ {assignmentDetails.destination}</p>
                                                    </div>
                                                    <div>
                                                        <label className="text-sm font-medium text-secondary">Last checkpoint</label>
                                                        <p className="text-sm text-primary">{assignmentDetails.lastCheckpoint}</p>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Trailer Information */}
                                            {selectedVehicle.hasTrailer && selectedVehicle.trailerDetails && (
                                                <div className="bg-card border border-theme rounded-lg p-6">
                                                    <h3 className="text-lg font-semibold text-primary mb-4 flex items-center">
                                                        <Truck className="w-5 h-5 mr-2 text-[var(--accent-orange)]" />
                                                        Trailer Information
                                                    </h3>
                                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                        <div>
                                                            <label className="text-sm font-medium text-secondary">Serial Number</label>
                                                            <p className="text-sm text-primary font-medium">{selectedVehicle.trailerDetails.serialNumber}</p>
                                                        </div>
                                                        <div>
                                                            <label className="text-sm font-medium text-secondary">Capacity</label>
                                                            <p className="text-sm text-primary font-medium">{selectedVehicle.trailerDetails.capacity}</p>
                                                        </div>
                                                        <div>
                                                            <label className="text-sm font-medium text-secondary">Status</label>
                                                            <p className="text-sm text-primary font-medium capitalize">{selectedVehicle.trailerDetails.status}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Driver Behaviour */}
                                            <div className="bg-card border border-theme rounded-lg p-6">
                                                <h3 className="text-lg font-semibold text-primary mb-4 flex items-center">
                                                    <TrendingUp className="w-5 h-5 mr-2 text-[var(--accent-blue)]" />
                                                    Driver Behaviour Metrics
                                                </h3>
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                    <div className="text-center p-4 bg-[rgba(255,255,255,0.03)] rounded-lg border border-theme">
                                                        <div className="text-2xl font-bold text-[var(--accent-purple)]">{selectedVehicle.driverBehaviour.harshBraking}</div>
                                                        <div className="text-sm text-secondary">Harsh Braking Events</div>
                                                    </div>
                                                    <div className="text-center p-4 bg-[var(--accent-orange)]/10 rounded-lg border border-[var(--accent-orange)]/20">
                                                        <div className="text-2xl font-bold text-[var(--accent-orange)]">{selectedVehicle.driverBehaviour.speedingEvents}</div>
                                                        <div className="text-sm text-secondary">Speeding Events</div>
                                                    </div>
                                                    <div className="text-center p-4 bg-[rgba(255,255,255,0.03)] rounded-lg border border-theme">
                                                        <div className="text-2xl font-bold text-accent">{selectedVehicle.driverBehaviour.idlingDuration}</div>
                                                        <div className="text-sm text-secondary">Idling Duration (min)</div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Engine Health */}
                                            <div className="bg-card border border-theme rounded-lg p-6">
                                                <h3 className="text-lg font-semibold text-primary mb-4 flex items-center">
                                                    <Wrench className="w-5 h-5 mr-2 text-[var(--accent-green)]" />
                                                    Engine Health
                                                </h3>
                                                <div className="space-y-4">
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                        <div>
                                                            <label className="text-sm font-medium text-secondary">Battery Voltage</label>
                                                            <p className="text-sm text-primary font-medium">{selectedVehicle.engineHealth.batteryVoltage}V</p>
                                                        </div>
                                                        <div>
                                                            <label className="text-sm font-medium text-secondary">Engine Hours</label>
                                                            <p className="text-sm text-primary font-medium">{selectedVehicle.engineHealth.engineHours} hours</p>
                                                        </div>
                                                    </div>

                                                    {/* Fault Codes */}
                                                    <div>
                                                        <label className="text-sm font-medium text-secondary mb-2 block">Fault Codes</label>
                                                        {selectedVehicle.engineHealth.faultCodes.length > 0 ? (
                                                            <div className="space-y-2">
                                                                {selectedVehicle.engineHealth.faultCodes.map((fault, index) => (
                                                                    <div key={index} className="p-3 bg-[var(--accent-red)]/10 border border-[var(--accent-red)]/30 rounded-lg">
                                                                        <div className="flex items-start space-x-2">
                                                                            <AlertTriangle className="w-4 h-4 text-[var(--accent-red)] mt-0.5" />
                                                                            <div>
                                                                                <div className="text-sm font-medium text-[var(--accent-red)]">{fault.code}</div>
                                                                                <div className="text-sm text-secondary">{fault.description}</div>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        ) : (
                                                            <div className="p-3 bg-[var(--accent-green)]/10 border border-[var(--accent-green)]/30 rounded-lg text-sm text-[var(--accent-green)]">
                                                                No fault codes detected
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Recent Trips */}
                                            <div className="bg-card border border-theme rounded-lg p-6">
                                                <h3 className="text-lg font-semibold text-primary mb-4 flex items-center">
                                                    <Route className="w-5 h-5 mr-2 text-[var(--accent-blue)]" />
                                                    Recent Trips
                                                </h3>
                                                {selectedVehicle.trips.length > 0 ? (
                                                    <div className="space-y-3">
                                                        {selectedVehicle.trips.map((trip, index) => (
                                                            <div key={index} className="p-4 bg-card border border-theme rounded-lg">
                                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                                    <div>
                                                                        <label className="text-xs font-medium text-secondary">Start Time</label>
                                                                        <p className="text-sm text-primary">{new Date(trip.startTime).toLocaleString()}</p>
                                                                    </div>
                                                                    <div>
                                                                        <label className="text-xs font-medium text-secondary">End Time</label>
                                                                        <p className="text-sm text-primary">{new Date(trip.endTime).toLocaleString()}</p>
                                                                    </div>
                                                                </div>
                                                                <div className="mt-2">
                                                                    <label className="text-xs font-medium text-secondary">Route Points</label>
                                                                    <p className="text-sm text-primary">{trip.route.length} GPS coordinates recorded</p>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <div className="text-sm text-secondary italic">No recent trips recorded</div>
                                                )}
                                            </div>

                                            {/* Vehicle Images */}
                                            {selectedVehicle.vehicleImage.length > 0 && (
                                                <div className="bg-card border border-theme rounded-lg p-6">
                                                    <h3 className="text-lg font-semibold text-primary mb-4 flex items-center">
                                                        <ImageIcon className="w-5 h-5 mr-2 text-[var(--accent-purple)]" />
                                                        Vehicle Images
                                                    </h3>
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                        {selectedVehicle.vehicleImage.map((image, index) => (
                                                            <img
                                                                key={index}
                                                                src={image.imageUrl}
                                                                alt={`Vehicle ${index + 1}`}
                                                                className="w-full h-48 object-cover rounded-lg border border-theme"
                                                            />
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Documents */}
                                            {selectedVehicle.documents.length > 0 && (
                                                <div className="bg-card border border-theme rounded-lg p-6">
                                                    <h3 className="text-lg font-semibold text-primary mb-4 flex items-center">
                                                        <FileText className="w-5 h-5 mr-2 text-[var(--accent-purple)]" />
                                                        Documents
                                                    </h3>
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                        {selectedVehicle.documents.map((doc, index) => (
                                                            <div key={index} className="relative">
                                                                <img
                                                                    src={doc.documentUrl}
                                                                    alt={`Document ${index + 1}`}
                                                                    className="w-full h-32 object-cover rounded-lg border border-theme"
                                                                />
                                                                <div className="absolute top-2 left-2 px-2 py-1 bg-black bg-opacity-75 text-accenttext-xs rounded">
                                                                    Document {index + 1}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })()}

                {/* Vehicle Details Sidebar */}
                {showDetailsSidebar && selectedVehicle && (
                    <>
                        {/* Overlay */}
                        <div
                            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity"
                            onClick={() => {
                                setShowDetailsSidebar(false);
                                setTimeout(() => setSelectedVehicle(null), 300);
                            }}
                        ></div>

                        {/* Sidebar Panel */}
                        <div
                            className="fixed right-0 top-0 h-full w-full md:w-2/3 lg:w-1/2 bg-card shadow-2xl z-50 overflow-y-auto transform transition-transform duration-300 translate-x-0"
                        >
                            <div className="p-6">
                                {/* Header */}
                                <div className="flex justify-between items-center mb-6 pb-4 border-b-2 border-theme">
                                    <h2 className="text-2xl font-bold text-primary">Vehicle Details</h2>
                                    <button
                                        onClick={() => {
                                            setShowDetailsSidebar(false);
                                            setTimeout(() => setSelectedVehicle(null), 300);
                                        }}
                                        className="p-2 rounded-lg text-secondary hover:text-secondary hover:bg-[rgba(255,255,255,0.03)] transition-all"
                                    >
                                        <X size={24} />
                                    </button>
                                </div>

                                <div className="space-y-6">
                                    {/* Vehicle Header */}
                                    <div className="bg-gradient-to-r from-[var(--accent-blue)]/20 to-[var(--accent-purple)]/20 border border-white/10 p-6 rounded-lg">
                                        <div className="flex items-center gap-4">
                                            <div className="h-16 w-16 flex-shrink-0">
                                                <div className="h-16 w-16 rounded-full flex items-center justify-center text-white text-2xl border-2 border-white/20 bg-[rgba(255,255,255,0.1)]">
                                                    <Truck size={28} />
                                                </div>
                                            </div>
                                            <div className="flex-1">
                                                <h3 className="text-xl font-bold text-primary mb-1">{selectedVehicle.plateNumber}</h3>
                                                <p className="text-secondary text-sm flex items-center gap-2">
                                                    <Car size={16} />
                                                    Vehicle ID: <span className="font-semibold text-primary">{selectedVehicle.internalId}</span>
                                                </p>
                                                <span
                                                    className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold mt-2 ${selectedVehicle.status === "moving"
                                                        ? "bg-[var(--accent-green)]/20 text-[var(--accent-green)] border border-[var(--accent-green)]/30"
                                                        : selectedVehicle.status === "idle"
                                                            ? "bg-[var(--accent-orange)]/20 text-[var(--accent-orange)] border border-[var(--accent-orange)]/30"
                                                            : selectedVehicle.status === "maintenance"
                                                                ? "bg-[var(--accent-red)]/20 text-[var(--accent-red)] border border-[var(--accent-red)]/30"
                                                                : "bg-[rgba(255,255,255,0.08)] text-secondary border border-theme"
                                                        }`}
                                                >
                                                    {selectedVehicle.status === "moving" ? (
                                                        <>
                                                            <Navigation size={16} />
                                                            Moving
                                                        </>
                                                    ) : selectedVehicle.status === "idle" ? (
                                                        <>
                                                            <Clock size={16} />
                                                            Idle
                                                        </>
                                                    ) : selectedVehicle.status === "maintenance" ? (
                                                        <>
                                                            <AlertTriangle size={16} />
                                                            Maintenance
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Circle size={16} />
                                                            {selectedVehicle.status}
                                                        </>
                                                    )}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Vehicle Information */}
                                    <div className="bg-card p-6 rounded-lg border border-theme">
                                        <h4 className="font-semibold text-primary mb-4 text-lg flex items-center gap-2">
                                            <Car size={20} className="text-accent" />
                                            Vehicle Information
                                        </h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <p className="text-sm text-secondary mb-1">Internal ID</p>
                                                <p className="font-medium text-primary">{selectedVehicle.internalId}</p>
                                            </div>
                                            <div>
                                                <p className="text-sm text-secondary mb-1">Plate Number</p>
                                                <p className="font-medium text-primary">{selectedVehicle.plateNumber}</p>
                                            </div>
                                            <div>
                                                <p className="text-sm text-secondary mb-1">VIN Number</p>
                                                <p className="font-medium text-primary">{selectedVehicle.vinNumber || "—"}</p>
                                            </div>
                                            <div>
                                                <p className="text-sm text-secondary mb-1">Make / Model</p>
                                                <p className="font-medium text-primary">{selectedVehicle.make} {selectedVehicle.model}</p>
                                            </div>
                                            <div>
                                                <p className="text-sm text-secondary mb-1">Year</p>
                                                <p className="font-medium text-primary">{selectedVehicle.year || "—"}</p>
                                            </div>
                                            {selectedVehicle.driver && (
                                                <div>
                                                    <p className="text-sm text-secondary mb-1">Assigned Driver</p>
                                                    <p className="font-medium text-primary">{selectedVehicle.driver.name || "—"}</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Location Information */}
                                    {selectedVehicle.currentLocation && (
                                        <div className="bg-card p-6 rounded-lg border border-theme">
                                            <h4 className="font-semibold text-primary mb-4 text-lg flex items-center gap-2">
                                                <MapPin size={20} className="text-accent" />
                                                Current Location
                                            </h4>
                                            <div>
                                                <p className="text-sm text-secondary mb-1">Address</p>
                                                <p className="font-medium text-primary">{selectedVehicle.currentLocation.address}</p>
                                                <p className="text-xs text-secondary mt-1">
                                                    {selectedVehicle.currentLocation.latitude}, {selectedVehicle.currentLocation.longitude}
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    {/* Assignment Information */}
                                    {(() => {
                                        const assignment = getAssignmentForVehicle(selectedVehicle, vehicleAssignments);
                                        if (assignment.loadId !== "Unassigned") {
                                            return (
                                                <div className="bg-card p-6 rounded-lg border border-theme">
                                                    <h4 className="font-semibold text-primary mb-4 text-lg flex items-center gap-2">
                                                        <Route size={20} className="text-accent" />
                                                        Current Assignment
                                                    </h4>
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                        <div>
                                                            <p className="text-sm text-secondary mb-1">Load ID</p>
                                                            <p className="font-medium text-primary">{assignment.loadId}</p>
                                                        </div>
                                                        <div>
                                                            <p className="text-sm text-secondary mb-1">Customer</p>
                                                            <p className="font-medium text-primary">{assignment.customer}</p>
                                                        </div>
                                                        <div>
                                                            <p className="text-sm text-secondary mb-1">Origin</p>
                                                            <p className="font-medium text-primary">{assignment.origin}</p>
                                                        </div>
                                                        <div>
                                                            <p className="text-sm text-secondary mb-1">Destination</p>
                                                            <p className="font-medium text-primary">{assignment.destination}</p>
                                                        </div>
                                                        <div>
                                                            <p className="text-sm text-secondary mb-1">Miles Today</p>
                                                            <p className="font-medium text-primary">{formatMiles(assignment.milesToday)}</p>
                                                        </div>
                                                        <div>
                                                            <p className="text-sm text-secondary mb-1">ETA</p>
                                                            <p className="font-medium text-primary">{assignment.eta}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        }
                                        return null;
                                    })()}

                                    {/* Performance Metrics */}
                                    <div className="bg-card p-6 rounded-lg border border-theme">
                                        <h4 className="font-semibold text-primary mb-4 text-lg flex items-center gap-2">
                                            <Activity size={20} className="text-accent" />
                                            Performance Metrics
                                        </h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <p className="text-sm text-secondary mb-1">Current Speed</p>
                                                <p className="font-medium text-primary">{selectedVehicle.speed} km/h</p>
                                            </div>
                                            <div>
                                                <p className="text-sm text-secondary mb-1">Fuel Level</p>
                                                <p className="font-medium text-primary">{selectedVehicle.fuelLevel}%</p>
                                            </div>
                                            {selectedVehicle.odometer && (
                                                <div>
                                                    <p className="text-sm text-secondary mb-1">Odometer</p>
                                                    <p className="font-medium text-primary">{selectedVehicle.odometer.toLocaleString()} mi</p>
                                                </div>
                                            )}
                                            <div>
                                                <p className="text-sm text-secondary mb-1">Engine Status</p>
                                                <p className="font-medium text-primary">{selectedVehicle.engineOn ? "On" : "Off"}</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex justify-end gap-3 pt-4 border-t-2 border-theme">
                                        <button
                                            onClick={() => {
                                                setShowDetailsSidebar(false);
                                                setTimeout(() => setSelectedVehicle(null), 300);
                                            }}
                                            className="px-6 py-2.5 bg-[rgba(255,255,255,0.08)] text-secondary font-medium rounded-lg hover:bg-[rgba(255,255,255,0.12)] border border-theme transition-all"
                                        >
                                            Close
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default VehicleList;