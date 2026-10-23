import { useState, useEffect, useRef } from 'react';
import {
    Truck, Activity, Clock, Wifi, AlertTriangle,
    Wrench, Navigation, Zap
} from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { getHOSEldData } from '../../../../axios/api/compliance.hosEld';
import { getSocket } from '../../../../socket/socketClient';
import { getAllYards, type Yard } from '../../../../axios/api/fleet.yards';

// Fix for default marker icons in Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Component to handle map center updates
const MapController: React.FC<{ center: [number, number]; zoom: number }> = ({ center, zoom }) => {
    const map = useMap();

    useEffect(() => {
        map.setView(center, zoom);
    }, [map, center, zoom]);

    return null;
};

// Create custom vehicle icon for Leaflet
const createVehicleIcon = (color: string) => {
    const svg = `
        <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
            <circle cx="16" cy="16" r="14" fill="white" stroke="${color}" stroke-width="2"/>
            <circle cx="16" cy="16" r="8" fill="${color}"/>
        </svg>
    `;

    return L.divIcon({
        html: svg,
        className: 'custom-vehicle-icon',
        iconSize: [32, 32],
        iconAnchor: [16, 16],
    });
};

interface VehicleLocation {
    _id: string;
    unitNo: string;
    internalId: string;
    licensePlate: string;
    makeModel: string;
    status: string;
    operationStatus: string;
    location: {
        latitude: number;
        longitude: number;
        address: string;
        updatedAt: Date;
    };
    yard?: {
        _id?: string;
        yardName?: string;
        coordinates?: {
            latitude: number | null;
            longitude: number | null;
        };
    };
    speed: number;
    engineOn: boolean;
    engineHours: number;
    driver?: string;
    orderNumber?: string;
    tripNumber?: string;
}

const GpsSection = () => {
    const [activeTab, setActiveTab] = useState<'overview' | 'gps' | 'maintenance'>('overview');

    const [, setLoading] = useState(false);
    const [vehicles, setVehicles] = useState<any[]>([]);
    const [summary, setSummary] = useState({
        totalVehicles: 0,
        activeVehicles: 0,
        totalDrivers: 0,
        compliantDrivers: 0,
        activeViolations: 0,
        uncertifiedLogs: 0
    });

    // GPS Tab State
    const [vehicleLocations, setVehicleLocations] = useState<VehicleLocation[]>([]);
    const [yards, setYards] = useState<Yard[]>([]);
    const [mapCenter, setMapCenter] = useState<[number, number]>([43.6532, -79.3832]); // Default to Toronto [lat, lng]
    const [mapZoom, setMapZoom] = useState<number>(6);
    const socketRef = useRef<any>(null);

    // Helper function to get vehicle location (Samsara or yard fallback)
    const getVehicleLocation = (vehicle: VehicleLocation): { lat: number; lng: number; address: string; isYardLocation: boolean } | null => {
        // First, try to use Samsara location if valid
        const samsaraLat = vehicle.location?.latitude;
        const samsaraLng = vehicle.location?.longitude;

        if (samsaraLat && samsaraLng && !isNaN(samsaraLat) && !isNaN(samsaraLng) && samsaraLat !== 0 && samsaraLng !== 0) {
            return {
                lat: samsaraLat,
                lng: samsaraLng,
                address: vehicle.location.address || 'Location from Samsara',
                isYardLocation: false
            };
        }

        // Fallback to yard location if available
        if (vehicle.yard?.coordinates?.latitude && vehicle.yard?.coordinates?.longitude) {
            const yardLat = vehicle.yard.coordinates.latitude;
            const yardLng = vehicle.yard.coordinates.longitude;

            if (!isNaN(yardLat) && !isNaN(yardLng) && yardLat !== 0 && yardLng !== 0) {
                return {
                    lat: yardLat,
                    lng: yardLng,
                    address: `${vehicle.yard.yardName || 'Yard'} - Yard Location`,
                    isYardLocation: true
                };
            }
        }

        return null;
    };

    // Fetch yards data
    const fetchYards = async () => {
        try {
            const response = await getAllYards();
            if (response?.success && response?.data) {
                setYards(response.data || []);
            }
        } catch (error) {
            console.error('Error fetching yards:', error);
        }
    };

    // Fetch HOS/ELD data
    const fetchHOSData = async () => {
        setLoading(true);
        try {
            const response = await getHOSEldData();
            if (response?.success && response?.data) {
                const vehicleList = response.data.vehicleStatusList || [];
                const vehiclesData = response.data.vehicles || [];

                // If no vehicles returned, clear state (likely no company assigned)
                if (vehicleList.length === 0 && vehiclesData.length === 0) {
                    console.log('⚠️ No vehicles returned from API - likely no company assigned');
                    setVehicles([]);
                    setVehicleLocations([]);
                    setSummary({
                        totalVehicles: 0,
                        activeVehicles: 0,
                        totalDrivers: 0,
                        compliantDrivers: 0,
                        activeViolations: 0,
                        uncertifiedLogs: 0
                    });
                    setLoading(false);
                    return;
                }

                // Enrich vehicles with yard information from backend response
                const enrichedVehicles = vehicleList.map((vehicle: any) => {
                    // Find the full vehicle data
                    const fullVehicle = vehiclesData.find((v: any) =>
                        v._id === vehicle._id ||
                        v.unitNumber === vehicle.unitNo ||
                        v.internalId === vehicle.internalId ||
                        v.plateNumber === vehicle.licensePlate
                    );

                    // Use yard from backend response if available, otherwise try to find from yards list
                    let yardData = null;
                    if (fullVehicle?.yard) {
                        // Backend already provides yard data
                        if (fullVehicle.yard.coordinates) {
                            yardData = {
                                _id: fullVehicle.yard._id,
                                yardName: fullVehicle.yard.yardName,
                                coordinates: fullVehicle.yard.coordinates
                            };
                        } else {
                            // Fallback: find from yards list
                            const yardId = typeof fullVehicle.yard === 'string' ? fullVehicle.yard : (fullVehicle.yard._id || fullVehicle.yard);
                            const foundYard = yards.find(y => y._id === yardId || y._id?.toString() === yardId?.toString());
                            if (foundYard) {
                                yardData = {
                                    _id: foundYard._id,
                                    yardName: foundYard.yardName,
                                    coordinates: foundYard.coordinates
                                };
                            }
                        }
                    }

                    return {
                        ...vehicle,
                        yard: yardData || undefined
                    };
                });

                setVehicles(enrichedVehicles);
                setSummary(response.data.summary || {
                    totalVehicles: 0,
                    activeVehicles: 0,
                    totalDrivers: 0,
                    compliantDrivers: 0,
                    activeViolations: 0,
                    uncertifiedLogs: 0
                });
            } else {
                // API returned unsuccessful response - clear data
                console.log('⚠️ API returned unsuccessful response - clearing vehicle data');
                setVehicles([]);
                setVehicleLocations([]);
                setSummary({
                    totalVehicles: 0,
                    activeVehicles: 0,
                    totalDrivers: 0,
                    compliantDrivers: 0,
                    activeViolations: 0,
                    uncertifiedLogs: 0
                });
            }
        } catch (error) {
            console.error('Error fetching HOS/ELD data:', error);
            // On error, clear data to prevent showing stale data
            setVehicles([]);
            setVehicleLocations([]);
            setSummary({
                totalVehicles: 0,
                activeVehicles: 0,
                totalDrivers: 0,
                compliantDrivers: 0,
                activeViolations: 0,
                uncertifiedLogs: 0
            });
        } finally {
            setLoading(false);
        }
    };

    // Initialize Socket.IO for GPS tracking
    useEffect(() => {
        if (activeTab === 'gps') {
            const socket = getSocket();
            socketRef.current = socket;

            // Join compliance GPS room
            socket.emit('joinComplianceGPS');

            // Listen for vehicle location updates
            socket.on('vehicleLocationsUpdate', (locations: VehicleLocation[]) => {
                console.log('📍 Received vehicle locations update:', locations.length, 'vehicles');

                // CRITICAL: Only show vehicles that match the vehicles from API (company-filtered)
                // Create a set of vehicle IDs from the API response to filter socket updates
                const apiVehicleIds = new Set(vehicles.map(v =>
                    v._id || v.unitNo || v.internalId || v.licensePlate
                ));

                // Filter socket locations to only include vehicles from API response
                const filteredLocations = locations.filter(location => {
                    const vehicleId = location._id || location.unitNo || location.internalId || location.licensePlate;
                    return apiVehicleIds.has(vehicleId);
                });

                console.log(`📍 Filtered ${filteredLocations.length} vehicles from ${locations.length} socket updates (company-filtered)`);

                // Enrich locations with yard data from vehicles state (if not already included from socket)
                const enrichedLocations = filteredLocations.map((location) => {
                    // Use yard from socket if available, otherwise try to find from vehicles state
                    if (!location.yard) {
                        const vehicle = vehicles.find(v =>
                            v._id === location._id ||
                            v.unitNo === location.unitNo ||
                            v.internalId === location.internalId ||
                            v.licensePlate === location.licensePlate
                        );

                        if (vehicle?.yard) {
                            location.yard = vehicle.yard;
                        }
                    }

                    // Debug logging for vehicles with yard location
                    const vehicleLocation = getVehicleLocation(location);
                    if (vehicleLocation?.isYardLocation) {
                        console.log(`🏭 Vehicle ${location.unitNo || location.licensePlate} using yard location:`, vehicleLocation);
                    }

                    return location;
                });

                setVehicleLocations(enrichedLocations);

                // Update map center to first vehicle if available (using yard as fallback)
                if (enrichedLocations.length > 0) {
                    const firstVehicle = enrichedLocations[0];
                    const vehicleLocation = getVehicleLocation(firstVehicle);

                    if (vehicleLocation) {
                        setMapCenter([vehicleLocation.lat, vehicleLocation.lng]);
                        setMapZoom(10);
                    }
                }
            });

            return () => {
                socket.emit('leaveComplianceGPS');
                socket.off('vehicleLocationsUpdate');
            };
        }
    }, [activeTab, vehicles]);

    useEffect(() => {
        fetchYards();
    }, []);

    useEffect(() => {
        // Always fetch HOS data, even if no yards (yards might be empty if no company)
        fetchHOSData();
    }, [yards]);



    // Calculate engine hours data for chart
    const engineHoursData = vehicles
        .filter((v: any) => v.engineHours && v.engineHours > 0) // Only show vehicles with engine hours data
        .map((v: any) => ({
            name: v.id || v.unitNo || v.unitNumber || 'Unknown',
            hours: v.engineHours || 0
        }))
        .sort((a, b) => b.hours - a.hours) // Sort by hours descending
        .slice(0, 10); // Limit to top 10 for readability

    // Calculate status distribution for pie chart
    const statusDistribution = {
        moving: vehicles.filter((v: any) => v.status === 'moving' || v.status === 'active').length,
        idle: vehicles.filter((v: any) => v.status === 'idle' || v.status === 'stopped').length,
        offline: vehicles.filter((v: any) => v.status === 'offline' || !v.status).length
    };

    const STATUS_DATA = [
        { name: 'Moving', value: statusDistribution.moving, color: '#10b981' },
        { name: 'Idle', value: statusDistribution.idle, color: '#f59e0b' },
        { name: 'Offline', value: statusDistribution.offline, color: '#6b7280' },
    ];

    // Mock maintenance alerts (can be replaced with real data later)
    const MAINTENANCE_ALERTS: any[] = [];

    return (
        <div className="min-h-screen bg-main font-sans pb-12">
            {/* Header */}
            <div className="top-0 z-30 bg-card shadow-sm">
                <div className="px-8 py-5 flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold text-primary flex items-center gap-3">
                            <Navigation size={28} className="text-[#00D1FF]" />
                            GPS Tracking & Monitoring
                        </h1>
                        <p className="text-sm text-secondary mt-1 ml-10">Real-time vehicle location and operational data</p>
                    </div>
                </div>

                {/* Navigation Tabs */}
                <div className="px-8 flex gap-6">
                    {['overview', 'gps', 'maintenance'].map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab as any)}
                            className={`pb-3 px-2 text-sm font-bold capitalize transition-colors border-b-2 ${activeTab === tab ? 'border-blue-500 text-[#00D1FF]' : 'border-transparent text-secondary'
                                }`}
                        >
                            {tab === 'overview' ? 'Overview' : tab === 'gps' ? 'GPS Map' : 'Maintenance'}
                        </button>
                    ))}
                </div>
            </div>

            <div className="w-full mx-auto px-4 mt-8">
                {/* --- OVERVIEW TAB --- */}
                {activeTab === 'overview' && (
                    <div className="space-y-6">
                        {/* Stats Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="bg-card p-5 rounded-xl shadow-sm border border-theme">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="text-xs text-secondary uppercase tracking-wide font-medium">Total Vehicles</p>
                                        <h3 className="text-2xl font-bold text-primary mt-1">{summary.totalVehicles || vehicles.length}</h3>
                                    </div>
                                    <div className="p-2 bg-card text-[#00D1FF] rounded-lg">
                                        <Truck size={20} />
                                    </div>
                                </div>
                                <div className="mt-4 flex gap-2">
                                    <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded">{summary.activeVehicles || 0} Active</span>
                                    <span className="text-xs font-medium text-secondary bg-card px-2 py-0.5 rounded">{statusDistribution.offline || 0} Offline</span>
                                </div>
                            </div>

                            <div className="bg-card p-5 rounded-xl shadow-sm border border-theme">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="text-xs text-secondary uppercase tracking-wide font-medium">Avg Idle Time</p>
                                        <h3 className="text-2xl font-bold text-primary mt-1">
                                            {vehicles.length > 0 ? 'Calculating...' : 'N/A'}
                                        </h3>
                                    </div>
                                    <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
                                        <Clock size={20} />
                                    </div>
                                </div>
                                <div className="mt-4">
                                    <span className="text-xs text-secondary">
                                        {vehicles.length > 0 ? 'Data will appear when available' : 'No vehicles to track'}
                                    </span>
                                </div>
                            </div>

                            <div className="bg-card p-5 rounded-xl shadow-sm border border-theme">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="text-xs text-secondary uppercase tracking-wide font-medium">Total Distance</p>
                                        <h3 className="text-2xl font-bold text-primary mt-1">
                                            {vehicles.length > 0 ? 'Calculating...' : '0 mi'}
                                        </h3>
                                    </div>
                                    <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                                        <Navigation size={20} />
                                    </div>
                                </div>
                                <div className="mt-4">
                                    <span className="text-xs text-secondary">
                                        {vehicles.length > 0 ? 'This week (Fleet)' : 'No data available'}
                                    </span>
                                </div>
                            </div>

                            <div className="bg-card p-5 rounded-xl shadow-sm border border-theme">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="text-xs text-secondary uppercase tracking-wide font-medium">Fuel Efficiency</p>
                                        <h3 className="text-2xl font-bold text-primary mt-1">
                                            {vehicles.length > 0 ? 'Calculating...' : 'N/A'}
                                        </h3>
                                    </div>
                                    <div className="p-2 bg-green-50 text-green-600 rounded-lg">
                                        <Zap size={20} />
                                    </div>
                                </div>
                                <div className="mt-4">
                                    <span className="text-xs text-secondary">
                                        {vehicles.length > 0 ? 'Data will appear when available' : 'No vehicles to track'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Vehicle List */}
                        {/* <div className="bg-card rounded-xl shadow-sm border border-theme overflow-hidden">
                            <div className="px-6 py-4 border-b border-theme flex justify-between items-center gap-4">
                                <h3 className="font-bold text-primary">Vehicle Status List</h3>

                                <div className="flex items-center gap-3">
                                    <div className="relative">
                                        <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-secondary" />
                                        <input
                                            type="text"
                                            placeholder="Search vehicle..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            className="pl-9 pr-4 py-2 border border-theme rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                    <button className="p-2 text-secondary hover:bg-[rgba(255,255,255,0.03)] rounded-lg">
                                        <RefreshCw size={18} />
                                    </button>
                                </div>
                            </div>

                            <table className="w-full text-sm text-left">
                                <thead className="bg-card text-secondary font-medium">
                                    <tr>
                                        <th className="px-6 py-3">Vehicle ID</th>
                                        <th className="px-6 py-3">Assigned Driver</th>
                                        <th className="px-6 py-3">Status</th>
                                        <th className="px-6 py-3">Last Ping</th>
                                        <th className="px-6 py-3">Location</th>
                                        <th className="px-6 py-3">Idle Time</th>
                                        <th className="px-6 py-3">Engine Hours</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {filteredVehicles.map((v) => (
                                        <tr key={v.id} className="hover:bg-blue-50/20 transition-colors group">
                                            <td className="px-6 py-4 font-bold text-primary flex items-center gap-2">
                                                <Truck size={16} className="text-secondary group-hover:text-blue-500" />
                                                {v.id}
                                            </td>
                                            <td className="px-6 py-4">
                                                {v.driver === 'Unassigned' ? (
                                                    <span className="text-secondary italic">Unassigned</span>
                                                ) : (
                                                    <div className="flex flex-col">
                                                        <span className="text-primary font-medium group-hover:text-[#00D1FF] transition-colors">
                                                            {v.driver}
                                                            {v.isCoDriver && (
                                                                <span className="ml-2 text-xs text-[#00D1FF] bg-card px-1.5 py-0.5 rounded">Co-Driver</span>
                                                            )}
                                                        </span>
                                                        {v.driverEmail && (
                                                            <span className="text-xs text-secondary mt-0.5">{v.driverEmail}</span>
                                                        )}
                                                        {v.driverPhone && (
                                                            <span className="text-xs text-secondary">{v.driverPhone}</span>
                                                        )}
                                                        {(v.orderNumber || v.tripNumber || v.customerOrderNo) && (
                                                            <span className="text-xs text-secondary mt-1">
                                                                Order: {v.orderNumber || v.customerOrderNo || v.tripNumber || 'N/A'}
                                                            </span>
                                                        )}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium uppercase tracking-wide
                             ${v.status === 'active' || v.status === 'moving' ? 'bg-green-100 text-green-700' :
                                                        v.status === 'idle' ? 'bg-amber-100 text-amber-700' : 'bg-card text-secondary'}`}>
                                                    {v.status === 'moving' && <Activity size={12} className="animate-pulse" />}
                                                    {v.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-secondary">{v.lastPing}</td>
                                            <td className="px-6 py-4 flex items-center gap-1.5 text-primary">
                                                <MapPin size={14} className="text-secondary" />
                                                {v.location}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`${v.idleTime && v.idleTime !== '-' && parseInt(v.idleTime) > 3 ? 'text-[#A855F7] font-bold' : 'text-secondary'}`}>
                                                    {v.idleTime || '-'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 font-mono text-secondary">
                                                {v.engineHours ? v.engineHours.toLocaleString() : '0'} h
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div> */}
                    </div>
                )}

                {/* --- LIVE GPS TAB --- */}
                {activeTab === 'gps' && (
                    <div className="space-y-6">
                        <div className="bg-card rounded-xl shadow-sm border border-theme h-[600px] relative overflow-hidden">
                            {vehicleLocations.length === 0 && vehicles.length === 0 ? (
                                <div className="absolute inset-0 flex items-center justify-center bg-card z-10">
                                    <div className="text-center p-8">
                                        <Navigation className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                                        <h3 className="text-lg font-semibold text-primary mb-2">No Vehicles Available</h3>
                                        <p className="text-sm text-secondary max-w-md">
                                            No vehicles are currently available for tracking. This may be because no company is assigned to your account.
                                        </p>
                                        <p className="text-xs text-secondary mt-2">
                                            Please contact your administrator to assign a company.
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <MapContainer
                                    center={mapCenter}
                                    zoom={mapZoom}
                                    style={{ width: '100%', height: '100%' }}
                                    scrollWheelZoom={true}
                                >
                                    <TileLayer
                                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                    />
                                    <MapController center={mapCenter} zoom={mapZoom} />
                                    {vehicleLocations.map((vehicle) => {
                                        const vehicleLocation = getVehicleLocation(vehicle);

                                        if (!vehicleLocation) {
                                            return null;
                                        }

                                        const statusColor = vehicle.status === 'moving' ? '#10b981' :
                                            vehicle.status === 'idle' ? '#f59e0b' :
                                                vehicle.status === 'active' ? '#3b82f6' : '#6b7280';

                                        return (
                                            <Marker
                                                key={vehicle._id}
                                                position={[vehicleLocation.lat, vehicleLocation.lng]}
                                                icon={createVehicleIcon(statusColor)}
                                            >
                                                <Popup>
                                                    <div className="p-2">
                                                        <p className="font-semibold text-sm">{vehicle.unitNo || vehicle.internalId || vehicle.licensePlate}</p>
                                                        <p className="text-xs text-secondary">{vehicle.licensePlate || vehicle.makeModel || 'Vehicle'}</p>
                                                        <p className="text-xs text-secondary mt-1">
                                                            {vehicleLocation.address}
                                                            {vehicleLocation.isYardLocation && (
                                                                <span className="ml-1 text-xs text-amber-600 font-medium">(Yard Location)</span>
                                                            )}
                                                        </p>
                                                        {vehicle.driver && (
                                                            <p className="text-xs text-[#00D1FF] mt-1">Driver: {vehicle.driver}</p>
                                                        )}
                                                        {(vehicle.orderNumber || vehicle.tripNumber) && (
                                                            <p className="text-xs text-purple-600 mt-1">
                                                                Order: {vehicle.orderNumber || vehicle.tripNumber}
                                                            </p>
                                                        )}
                                                    </div>
                                                </Popup>
                                            </Marker>
                                        );
                                    })}
                                </MapContainer>
                            )}

                            {/* Info Card */}
                            {vehicleLocations.length > 0 && (
                                <div className="absolute top-4 left-4 bg-card/90 backdrop-blur-sm p-4 rounded-lg shadow-lg border border-theme z-[1000]">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Wifi size={18} className="text-green-500 animate-pulse" />
                                        <h3 className="text-sm font-bold text-primary">Live ELD Location Feed</h3>
                                    </div>
                                    <p className="text-xs text-secondary mb-2">
                                        {vehicleLocations.length} vehicle{vehicleLocations.length !== 1 ? 's' : ''} tracked
                                    </p>
                                    <p className="text-xs text-secondary">
                                        Updating every 5 seconds from Samsara
                                    </p>
                                </div>
                            )}

                            {/* Vehicle List Sidebar */}
                            {vehicleLocations.length > 0 && (
                                <div className="absolute top-4 right-4 bg-card/90 backdrop-blur-sm p-4 rounded-lg shadow-lg border border-theme z-[1000] max-w-xs max-h-[400px] overflow-y-auto">
                                    <h4 className="text-sm font-bold text-primary mb-3">Active Vehicles</h4>
                                    <div className="space-y-2">
                                        {vehicleLocations.map((vehicle) => (
                                            <div key={vehicle._id} className="flex items-center gap-2 p-2 hover:bg-[rgba(255,255,255,0.03)] rounded cursor-pointer">
                                                <div
                                                    className="w-3 h-3 rounded-full"
                                                    style={{
                                                        backgroundColor: vehicle.status === 'moving' ? '#10b981' :
                                                            vehicle.status === 'idle' ? '#f59e0b' :
                                                                vehicle.status === 'active' ? '#3b82f6' : '#6b7280'
                                                    }}
                                                />
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs font-semibold text-primary truncate">{vehicle.unitNo || vehicle.internalId || vehicle.licensePlate}</p>
                                                    {(() => {
                                                        const vehicleLocation = getVehicleLocation(vehicle);
                                                        return vehicleLocation ? (
                                                            <p className="text-xs text-secondary truncate">
                                                                {vehicleLocation.address}
                                                                {vehicleLocation.isYardLocation && (
                                                                    <span className="ml-1 text-amber-600 font-medium">(Yard)</span>
                                                                )}
                                                            </p>
                                                        ) : (
                                                            <p className="text-xs text-secondary truncate">Location unknown</p>
                                                        );
                                                    })()}
                                                    {vehicle.driver && (
                                                        <p className="text-xs text-[#00D1FF] truncate">Driver: {vehicle.driver}</p>
                                                    )}
                                                    {(vehicle.orderNumber || vehicle.tripNumber) && (
                                                        <p className="text-xs text-purple-600 truncate">
                                                            Order: {vehicle.orderNumber || vehicle.tripNumber}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* --- MAINTENANCE TAB --- */}
                {activeTab === 'maintenance' && (
                    <div className="space-y-6">
                        {/* Alerts */}
                        {MAINTENANCE_ALERTS.length > 0 && (
                            <div className="bg-card p-6 rounded-xl shadow-sm border border-theme">
                                <h3 className="font-bold text-primary mb-4 flex items-center gap-2">
                                    <AlertTriangle size={20} className="text-amber-500" />
                                    Active Maintenance Indicators
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    {MAINTENANCE_ALERTS.map((alert: any) => (
                                        <div key={alert.id} className={`p-4 rounded-lg border-l-4 shadow-sm
                     ${alert.severity === 'high' ? 'bg-card border-red-500' :
                                                alert.severity === 'medium' ? 'bg-amber-50 border-amber-500' : 'bg-card border-blue-500'}`}>
                                            <div className="flex justify-between items-start">
                                                <h4 className={`font-bold text-sm ${alert.severity === 'high' ? 'text-red-700' :
                                                    alert.severity === 'medium' ? 'text-amber-700' : 'text-blue-700'
                                                    }`}>{alert.type}</h4>
                                                <span className="text-xs text-secondary">{alert.time}</span>
                                            </div>
                                            <p className="text-sm font-medium text-primary mt-1">{alert.vehicle}</p>
                                            <p className="text-xs text-secondary mt-1">{alert.description}</p>

                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Engine Hours Chart */}
                            <div className="bg-card p-6 rounded-xl shadow-sm border border-theme">
                                <h3 className="font-bold text-primary mb-6 flex items-center gap-2">
                                    <Wrench size={18} className="text-secondary" />
                                    Engine Hours vs Thresholds
                                </h3>
                                {engineHoursData.length > 0 ? (
                                    <>
                                        <div className="h-64">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <BarChart data={engineHoursData} layout="vertical">
                                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                                    <XAxis type="number" stroke="#9ca3af" fontSize={12} />
                                                    <YAxis dataKey="name" type="category" stroke="#6b7280" fontSize={12} width={80} />
                                                    <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }} />
                                                    <Bar dataKey="hours" fill="var(--accent-blue)" radius={[0, 4, 4, 0]} barSize={20} />
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </div>
                                        <div className="mt-4 text-xs text-center text-secondary">
                                            Vehicles approaching 15,000 engine hours require major service.
                                        </div>
                                    </>
                                ) : (
                                    <div className="h-64 flex items-center justify-center">
                                        <div className="text-center">
                                            <Wrench className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                                            <p className="text-secondary text-sm">No engine hours data available</p>
                                            <p className="text-secondary text-xs mt-1">Engine hours will appear here once vehicles are tracked</p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Vehicle Status Distribution */}
                            <div className="bg-card p-6 rounded-xl shadow-sm border border-theme">
                                <h3 className="font-bold text-primary mb-6 flex items-center gap-2">
                                    <Activity size={18} className="text-secondary" />
                                    Real-time Vehicle Status
                                </h3>
                                {vehicles.length > 0 ? (
                                    <>
                                        <div className="h-64 flex justify-center">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <PieChart>
                                                    <Pie
                                                        data={STATUS_DATA}
                                                        cx="50%"
                                                        cy="50%"
                                                        innerRadius={60}
                                                        outerRadius={80}
                                                        paddingAngle={5}
                                                        dataKey="value"
                                                    >
                                                        {STATUS_DATA.map((entry: any, index: number) => (
                                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                                        ))}
                                                    </Pie>
                                                    <Tooltip />
                                                </PieChart>
                                            </ResponsiveContainer>
                                        </div>
                                        <div className="flex justify-center gap-6 mt-4">
                                            {STATUS_DATA.map((item: any) => (
                                                <div key={item.name} className="flex items-center gap-2">
                                                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                                                    <span className="text-sm text-secondary">{item.name}</span>
                                                    <span className="text-sm font-bold text-primary">{item.value}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </>
                                ) : (
                                    <div className="h-64 flex items-center justify-center">
                                        <div className="text-center">
                                            <Activity className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                                            <p className="text-secondary text-sm">No vehicle data available</p>
                                            <p className="text-secondary text-xs mt-1">Vehicle status will appear here once vehicles are tracked</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
};

export default GpsSection;



