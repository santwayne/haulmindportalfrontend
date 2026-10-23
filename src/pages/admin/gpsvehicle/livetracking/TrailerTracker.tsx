import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { RefreshCw, Package, Search, ChevronLeft, ChevronRight, MapPin, Truck, Gauge, X } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { getSocket } from "../../../../socket/socketClient";
import { listFleetUnits, type FleetUnitDto } from '../../../../axios/api/fleet.units';

// Fix for default marker icons in Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Type definitions
// Use FleetUnit for trailers (unitType !== "Truck")
type Trailer = Omit<FleetUnitDto, 'status' | 'currentLocation'> & {
    trailer: string; // Mapped from unitNo
    plateNumber: string; // Mapped from licensePlate
    type: 'dry_van' | 'refrigerated' | 'flatbed' | 'tanker' | 'container'; // Mapped from trailerType/unitType
    capacity: string;
    status: 'moving' | 'idle' | 'stopped' | 'maintenance'; // Mapped from operationStatus
    speed: number;
    isAttached: boolean;
    attachedVehicle?: {
        _id: string;
        plateNumber: string;
        make: string;
        model: string;
        driver?: {
            _id: string;
            name: string;
        };
    };
    currentLocation: {
        address: string;
        longitude: string | number;
        latitude: string | number;
        updatedAt: string | Date;
    };
    internalId?: string; // For Termoking integration
};

const statusColors: Record<string, string> = {
    moving: "#10b981",
    idle: "#f59e0b",
    stopped: "#ef4444",
    maintenance: "#6b7280",
};

const statusBgColors: Record<string, string> = {
    moving: "#d1fae5",
    idle: "#fef3c7",
    stopped: "#fee2e2",
    maintenance: "#f3f4f6",
};

// Component to handle map center updates
const MapController: React.FC<{ center: [number, number]; zoom: number }> = ({ center, zoom }) => {
    const map = useMap();

    useEffect(() => {
        map.setView(center, zoom);
    }, [map, center, zoom]);

    return null;
};

// Create custom trailer icon for Leaflet
const createTrailerIcon = (color: string) => {
    const svg = `
        <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
            <circle cx="20" cy="20" r="18" fill="white" stroke="${color}" stroke-width="2"/>
            <g transform="translate(6, 8)">
                <rect x="2" y="8" width="24" height="12" fill="${color}" rx="1"/>
                <rect x="3" y="9" width="22" height="10" fill="white" opacity="0.3"/>
                <circle cx="8" cy="22" r="2.5" fill="#333"/>
                <circle cx="20" cy="22" r="2.5" fill="#333"/>
                <circle cx="30" cy="22" r="2.5" fill="#333"/>
            </g>
        </svg>
    `;

    return L.divIcon({
        html: svg,
        className: 'custom-trailer-icon',
        iconSize: [40, 40],
        iconAnchor: [20, 20],
    });
};

const ProfessionalTrailerTracker: React.FC = () => {
    const [trailers, setTrailers] = useState<Trailer[]>([]);
    const [selectedTrailer, setSelectedTrailer] = useState<Trailer | null>(null);
    const [searchTerm, setSearchTerm] = useState<string>('');
    const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);
    const [loading, setLoading] = useState<boolean>(true);
    const [mapCenter, setMapCenter] = useState<[number, number]>([56.1304, -106.3468]); // Default to Canada
    const [mapZoom, setMapZoom] = useState<number>(6);
    const mapRef = useRef<L.Map | null>(null);

    const socket = useMemo(() => getSocket(), []);

    // Handle trailer selection
    const handleTrailerClick = useCallback((trailer: Trailer) => {
        console.log('🚛 Trailer selected:', trailer.plateNumber);
        setSelectedTrailer(trailer);

        // Center map on selected trailer
        const lat = Number(trailer.currentLocation?.latitude);
        const lng = Number(trailer.currentLocation?.longitude);
        if (!isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0) {
            setMapCenter([lat, lng]);
            setMapZoom(15);
            console.log('🗺️ Map centered on selected trailer');
        }

        // Leave previous trailer updates
        socket.emit("leaveTrailer");

        // Join new trailer updates (use internalId if available, otherwise _id)
        const trailerId = trailer.internalId || trailer._id;
        if (trailerId) {
            socket.emit("joinTrailer", trailerId);
        }

        // Listen for trailer updates
        socket.off("trailerLocation");
        socket.on("trailerLocation", (data) => {
            console.log('📍 Trailer location update:', data.plateNumber);
            setTrailers((prev) =>
                prev.map((t) => (t._id === data._id ? { ...t, ...data } : t))
            );

            if (trailer._id === data._id) {
                setSelectedTrailer((prev) => prev ? { ...prev, ...data } : data);

                // Update map center for real-time tracking
                const newLat = Number(data.currentLocation?.latitude);
                const newLng = Number(data.currentLocation?.longitude);
                if (!isNaN(newLat) && !isNaN(newLng) && newLat !== 0 && newLng !== 0) {
                    setMapCenter([newLat, newLng]);
                }
            }
        });
    }, [socket]);

    // Fetch trailers from backend
    const fetchTrailersData = useCallback(async () => {
        setLoading(true);
        try {
            const userInfoString = localStorage.getItem('userInfo');
            let userInfo: any = null;
            if (userInfoString) {
                try {
                    userInfo = JSON.parse(userInfoString);
                } catch (err) {
                    console.error('Error parsing userInfo from localStorage:', err);
                }
            }

            // Handle different userInfo structures (userData.company or direct company)
            const userRole = userInfo?.role || userInfo?.userData?.role;
            const userCompany = userInfo?.company || userInfo?.userData?.company;
            const isSuperadmin = userRole === 'superadmin';
            const isDispatcher = userRole === 'dispatcher';
            const hasCompany = Boolean(userCompany);

            // Allow dispatchers to call API even if company is not visible in localStorage
            // The backend will handle company filtering based on the authenticated user
            if (userInfo && !isSuperadmin && !isDispatcher && !hasCompany) {
                setTrailers([]);
                return;
            }

            // Fetch trailers from FleetUnit (unitType !== "Truck")
            const res = await listFleetUnits({ category: "trailers" });
            if (res?.success && res.data) {
                const data = Array.isArray(res.data) ? res.data : [];
                // Map FleetUnit to Trailer format for compatibility
                const formatted = data.map((t: FleetUnitDto): Trailer => {
                    // Map unitType to trailer type enum
                    const mapUnitTypeToTrailerType = (unitType: string): 'dry_van' | 'refrigerated' | 'flatbed' | 'tanker' | 'container' => {
                        const lower = unitType.toLowerCase();
                        if (lower.includes('reefer') || lower.includes('refrigerated')) return 'refrigerated';
                        if (lower.includes('flatbed')) return 'flatbed';
                        if (lower.includes('tank')) return 'tanker';
                        if (lower.includes('container')) return 'container';
                        return 'dry_van'; // default
                    };

                    return {
                        ...t,
                        trailer: t.unitNo || t.licensePlate,
                        plateNumber: t.licensePlate || t.unitNo,
                        type: mapUnitTypeToTrailerType(t.unitType),
                        capacity: t.capacity || "",
                        status: (t.operationStatus === "in-transit" ? "moving" :
                            t.operationStatus === "maintenance" ? "maintenance" :
                                t.operationStatus === "idle" ? "idle" : "stopped") as 'moving' | 'idle' | 'stopped' | 'maintenance',
                        speed: (t as any).speed || 0,
                        isAttached: false, // TODO: Implement attachment logic if needed
                        currentLocation: {
                            address: t.currentLocation?.address || "",
                            latitude: Number(t.currentLocation?.latitude ?? 0),
                            longitude: Number(t.currentLocation?.longitude ?? 0),
                            updatedAt: t.currentLocation?.updatedAt || new Date().toISOString()
                        }
                    };
                });

                setTrailers(formatted);

                // Set map center to first trailer if available with valid location
                if (formatted.length > 0 && formatted[0].currentLocation) {
                    const firstTrailer = formatted[0];
                    const lat = Number(firstTrailer.currentLocation.latitude);
                    const lng = Number(firstTrailer.currentLocation.longitude);
                    if (!isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0) {
                        setMapCenter([lat, lng]);
                        setMapZoom(12);
                    } else {
                        // If no valid location, default to Canada
                        setMapCenter([56.1304, -106.3468]);
                        setMapZoom(6);
                    }
                } else {
                    // If no trailers or no location data, default to Canada
                    setMapCenter([56.1304, -106.3468]);
                    setMapZoom(6);
                }

                if (formatted.length > 0 && !selectedTrailer) {
                    handleTrailerClick(formatted[0]);
                }
            } else {
                setTrailers([]);
                // If no trailers, default to Canada
                setMapCenter([56.1304, -106.3468]);
                setMapZoom(6);
            }
        } catch (err) {
            console.error('Error fetching trailers:', err);
            setTrailers([]);
        } finally {
            setLoading(false);
        }
    }, [selectedTrailer, handleTrailerClick]);

    useEffect(() => {
        fetchTrailersData();
    }, [fetchTrailersData]);

    // Filter trailers by search
    const filteredTrailers = trailers.filter(trailer => {
        const searchLower = searchTerm.toLowerCase();
        return (
            trailer.plateNumber.toLowerCase().includes(searchLower) ||
            trailer.trailer.toLowerCase().includes(searchLower) ||
            trailer.type.toLowerCase().includes(searchLower) ||
            (trailer.attachedVehicle?.plateNumber && trailer.attachedVehicle.plateNumber.toLowerCase().includes(searchLower))
        );
    });

    if (loading && trailers.length === 0) {
        return (
            <div className="flex items-center justify-center h-screen bg-main">
                <div className="text-center">
                    <RefreshCw className="w-8 h-8 animate-spin text-accent mx-auto mb-4" />
                    <p className="text-secondary">Loading trailer tracking data...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-screen bg-main overflow-hidden">
            {/* Left Sidebar */}
            <div
                className={`bg-card shadow-xl transition-all duration-300 ease-in-out ${sidebarCollapsed ? "w-0" : "w-72"
                    } overflow-hidden`}
            >
                <div className="h-full flex flex-col ">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-[rgba(0,209,255,0.2)] via-[rgba(0,209,255,0.15)] to-[rgba(168,85,247,0.2)] p-4 border border-theme rounded-lg">

                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-bold flex items-center gap-2 text-[var(--accent-navyblue)]">
                                <Package className="w-5 h-5 text-[var(--accent-navyblue)]" />
                                Trailer Tracker
                            </h2>

                            <button
                                onClick={() => setSidebarCollapsed(true)}
                                className="p-1 hover:bg-[rgba(255,255,255,0.08)] rounded-lg transition-colors"
                            >
                                <ChevronLeft className="w-5 h-5 text-secondary hover:text-primary" />
                            </button>
                        </div>

                        {/* Search Bar */}
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-3 h-3 text-secondary" />

                            <input
                                type="text"
                                placeholder="Search by plate number..."
                                className="w-full pl-10 pr-4 py-1.5 text-sm rounded-lg 
      bg-card text-primary placeholder:text-secondary 
      border border-theme 
      focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)]"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>

                    </div>

                    {/* Trailer List */}
                    <div className="flex-1 overflow-y-auto p-3 bg-main">
                        {filteredTrailers.length === 0 ? (
                            <div className="text-center py-8">
                                <p className="text-secondary">No trailers found</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {filteredTrailers.map((t) => (
                                    <div
                                        key={t._id}
                                        onClick={() => handleTrailerClick(t)}
                                        className={`p-3 rounded-xl cursor-pointer transition-all duration-200 border-2 ${selectedTrailer?._id === t._id
                                            ? "bg-main border-[var(--accent-blue)] shadow-md"
                                            : "bg-card border-theme hover:border-blue-300 hover:shadow-sm"
                                            }`}
                                    >
                                        {/* Plate Number & Status */}
                                        <div className="flex items-center justify-between mb-3">
                                            <h3 className="font-bold text-base text-[var(--accent-navyblue)]">
                                                {t.plateNumber}
                                            </h3>
                                            <span
                                                className="px-2 py-0.5 rounded-full text-xs font-semibold"
                                                style={{
                                                    backgroundColor: statusBgColors[t.status],
                                                    color: statusColors[t.status],
                                                }}
                                            >
                                                {t.status.toUpperCase()}
                                            </span>
                                        </div>

                                        {/* Trailer Details */}
                                        <div className="space-y-2 text-xs">
                                            <div className="flex items-center gap-2 text-secondary">
                                                <Package className="w-3 h-3" />
                                                <span>{t.trailer} - {t.type}</span>
                                            </div>
                                            {t.attachedVehicle && (
                                                <div className="flex items-center gap-2 text-secondary">
                                                    <Truck className="w-3 h-3" />
                                                    <span>
                                                        Attached to: {t.attachedVehicle.plateNumber}
                                                        {t.attachedVehicle.driver && ` (${t.attachedVehicle.driver.name})`}
                                                    </span>
                                                </div>
                                            )}
                                            <div className="flex items-center gap-2 text-secondary">
                                                <MapPin className="w-3 h-3" />
                                                <span className="truncate">{t.currentLocation?.address || 'Location unavailable'}</span>
                                            </div>
                                            {t.speed !== undefined && (
                                                <div className="flex items-center gap-1 text-secondary mt-2 pt-2 border-t border-theme">
                                                    <Gauge className="w-3 h-3" />
                                                    <span>{t.speed} km/h</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Sidebar Toggle Button (when closed) */}
            {sidebarCollapsed && (
                <button
                    onClick={() => setSidebarCollapsed(false)}
                    className="absolute left-0 top-1/2 transform -translate-y-1/2 bg-[rgba(0,209,255,0.15)] text-white p-2 rounded-r-lg shadow-lg hover:bg-[rgba(0,209,255,0.15)]/90 transition-colors z-10"
                >
                    <ChevronRight className="w-5 h-5" />
                </button>
            )}

            {/* Right Map */}
            <div className="flex-1 relative" style={{ height: '100vh', minHeight: '100vh' }}>
                <MapContainer
                    center={mapCenter}
                    zoom={mapZoom}
                    style={{ height: '100%', width: '100%', zIndex: 0 }}
                    ref={mapRef}
                >
                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <MapController center={mapCenter} zoom={mapZoom} />

                    {/* Trailer Markers */}
                    {filteredTrailers.map((trailer) => {
                        const lat = Number(trailer.currentLocation?.latitude);
                        const lng = Number(trailer.currentLocation?.longitude);

                        if (isNaN(lat) || isNaN(lng) || lat === 0 || lng === 0) {
                            return null;
                        }

                        const markerColor = statusColors[trailer.status] || '#6b7280';

                        return (
                            <Marker
                                key={trailer._id}
                                position={[lat, lng]}
                                icon={createTrailerIcon(markerColor)}
                                eventHandlers={{
                                    click: () => {
                                        handleTrailerClick(trailer);
                                    },
                                }}
                            >
                                <Popup>
                                    <div className="p-2">
                                        <h3 className="font-bold text-sm mb-2">{trailer.plateNumber}</h3>
                                        <div className="space-y-1 text-xs">
                                            <div className="flex items-center justify-between">
                                                <span className="text-secondary">Status:</span>
                                                <span
                                                    className="px-2 py-0.5 rounded-full text-xs font-semibold"
                                                    style={{
                                                        backgroundColor: statusBgColors[trailer.status],
                                                        color: statusColors[trailer.status],
                                                    }}
                                                >
                                                    {trailer.status.toUpperCase()}
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span className="text-secondary">Type:</span>
                                                <span className="font-medium">{trailer.type}</span>
                                            </div>
                                            {trailer.speed !== undefined && (
                                                <div className="flex items-center justify-between">
                                                    <span className="text-secondary">Speed:</span>
                                                    <span className="font-medium">{trailer.speed} km/h</span>
                                                </div>
                                            )}
                                            {trailer.attachedVehicle && (
                                                <div className="flex items-center justify-between">
                                                    <span className="text-secondary">Attached to:</span>
                                                    <span className="font-medium">{trailer.attachedVehicle.plateNumber}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </Popup>
                            </Marker>
                        );
                    })}
                </MapContainer>

                {/* Selected Trailer Info Panel */}
                {selectedTrailer && (
                    <div className="absolute top-4 right-4 bg-card rounded-lg shadow-lg p-3 max-w-xs z-[1000]">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-base font-bold text-[var(--accent-navyblue)]">{selectedTrailer.plateNumber}</h3>
                            <button
                                onClick={() => setSelectedTrailer(null)}
                                className="p-1 hover:bg-[rgba(255,255,255,0.03)] rounded transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="space-y-2 text-sm">
                            <div className="flex items-center justify-between">
                                <span className="text-secondary">Status</span>
                                <span
                                    className="px-2 py-1 rounded-full text-xs font-semibold"
                                    style={{
                                        backgroundColor: statusBgColors[selectedTrailer.status],
                                        color: statusColors[selectedTrailer.status],
                                    }}
                                >
                                    {selectedTrailer.status.toUpperCase()}
                                </span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-secondary">Type</span>
                                <span className="font-medium">{selectedTrailer.type}</span>
                            </div>
                            {selectedTrailer.speed !== undefined && (
                                <div className="flex items-center justify-between">
                                    <span className="text-secondary">Speed</span>
                                    <span className="font-medium">{selectedTrailer.speed} km/h</span>
                                </div>
                            )}
                            {selectedTrailer.attachedVehicle && (
                                <div className="flex items-center justify-between">
                                    <span className="text-secondary">Attached Vehicle</span>
                                    <span className="font-medium">{selectedTrailer.attachedVehicle.plateNumber}</span>
                                </div>
                            )}
                            <div className="pt-2 border-t border-theme">
                                <p className="text-xs text-secondary truncate">
                                    {selectedTrailer.currentLocation?.address || 'Location unavailable'}
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Status Legend */}
                <div className="absolute bottom-4 left-4 bg-card p-2 rounded-lg shadow-lg text-xs z-[1000]">
                    <div className="font-semibold mb-2 text-[var(--accent-navyblue)]">Trailer Status:</div>
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#10b981' }}></div>
                            <span>Moving</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#f59e0b' }}></div>
                            <span>Idle</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#ef4444' }}></div>
                            <span>Stopped</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#6b7280' }}></div>
                            <span>Maintenance</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProfessionalTrailerTracker;
