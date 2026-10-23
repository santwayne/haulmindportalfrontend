import React, { useState, useEffect,useMemo } from "react";
import { getSocket } from "../../../../socket/socketClient";
import { listVehicle } from "../../../../axios/api/distapcher";
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { ChevronLeft, ChevronRight, ExternalLink, X, Search, Fuel, Gauge, MapPin, User, Activity} from "lucide-react";

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
        <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
            <circle cx="20" cy="20" r="18" fill="white" stroke="${color}" stroke-width="2"/>
            <circle cx="20" cy="20" r="10" fill="${color}"/>
        </svg>
    `;
    
    return L.divIcon({
        html: svg,
        className: 'custom-vehicle-icon',
        iconSize: [40, 40],
        iconAnchor: [20, 20],
    });
};

interface Vehicle {
  _id: string;
  internalId: string;
  plateNumber: string;
  make: string;
  model: string;
  year: number;
  status: "moving" | "idle" | "stopped" | "maintenance";
  speed: number;
  fuelLevel: number;
  odometer: number;
  engineOn: boolean;
  currentLocation: {
    address: string;
    latitude: string | number;
    longitude: string | number;
    updatedAt: string;
  };
  driver?: {
    name: string;
  };
}

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

const ProfessionalFleetTracker: React.FC = () => {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [vehiclesLoaded, setVehiclesLoaded] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [location, setLocation] = useState<[number, number] | null>(null);
  const [mapZoom, setMapZoom] = useState<number>(12);
  const [search, setSearch] = useState<string>("");
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);
  const [isInfoPanelOpen, setIsInfoPanelOpen] = useState<boolean>(true);

  const socket = useMemo(() => getSocket(), []);

  // Fetch vehicles from backend
  useEffect(() => {
    const fetchVehicles = async () => {
      try {
        const res = await listVehicle();
        if (res.success) {
          const data = res.data?.vehicles || [];
          const formatted = data.map((v: Vehicle) => ({
            ...v,
            currentLocation: {
              ...v.currentLocation,
              latitude: Number(v.currentLocation.latitude),
              longitude: Number(v.currentLocation.longitude),
            },
          }));

          setVehicles(formatted);
          if (formatted.length > 0) handleVehicleClick(formatted[0]);
        }
      } catch (err) {
        // silently handled
      } finally {
        setVehiclesLoaded(true);
      }
    };
    fetchVehicles();
  }, []);

  // Handle vehicle selection
  const handleVehicleClick = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
    const lat = Number(vehicle.currentLocation?.latitude);
    const lng = Number(vehicle.currentLocation?.longitude);

    if (!isNaN(lat) && !isNaN(lng)) {
      setLocation([lat, lng]);
      setMapZoom(12);
    }

    // Leave previous vehicle updates
    socket.emit("leaveVehicle");

    // Join new vehicle updates
    socket.emit("joinVehicle", vehicle._id);

    // Listen for vehicle updates
    socket.off("vehicleLocation");
    socket.on("vehicleLocation", (data) => {
      setVehicles((prev) =>
        prev.map((v) => (v._id === data._id ? { ...v, ...data } : v))
      );

      if (vehicle._id === data._id) {
        const lat = Number(data.currentLocation.latitude);
        const lng = Number(data.currentLocation.longitude);
        if (!isNaN(lat) && !isNaN(lng)) {
          setLocation([lat, lng]);
        }
        setSelectedVehicle({ ...vehicle, ...data });
      }
    });
  };

  // Open info panel in new tab
  const openInNewTab = () => {
    if (!selectedVehicle) return;
    openVehicleInNewTab(selectedVehicle);
  };


  // Filter vehicles by search
  const filteredVehicles = vehicles.filter((v) =>
    v.plateNumber.toLowerCase().includes(search.toLowerCase())
  );

  // Open vehicle in new tab
  const openVehicleInNewTab = (vehicle: Vehicle) => {
    const lat = Number(vehicle.currentLocation?.latitude);
    const lng = Number(vehicle.currentLocation?.longitude);

    const mapUrl = `https://www.google.com/maps?q=${lat},${lng}&z=15`;

    const vehicleContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Vehicle Tracker - ${vehicle.plateNumber}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: system-ui, -apple-system, sans-serif; 
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              min-height: 100vh;
              display: flex;
              align-items: center;
              justify-content: center;
              padding: 20px;
            }
            .container { 
              max-width: 900px; 
              width: 100%;
              background: white; 
              border-radius: 20px; 
              box-shadow: 0 20px 60px rgba(0,0,0,0.3);
              overflow: hidden;
            }
            .header {
              background: linear-gradient(135deg, ${statusColors[vehicle.status]}, ${statusColors[vehicle.status]}dd);
              color: white;
              padding: 30px;
              text-align: center;
            }
            .header h1 { font-size: 32px; margin-bottom: 10px; }
            .header p { opacity: 0.9; font-size: 16px; }
            .content { padding: 40px; }
            .status-badge {
              display: inline-block;
              padding: 8px 20px;
              border-radius: 25px;
              font-size: 14px;
              font-weight: 700;
              margin: 20px 0;
              background: ${statusBgColors[vehicle.status]};
              color: ${statusColors[vehicle.status]};
            }
            .metrics {
              display: grid;
              grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
              gap: 20px;
              margin: 30px 0;
            }
            .metric-card {
              background: #f9fafb;
              padding: 20px;
              border-radius: 12px;
              border-left: 4px solid ${statusColors[vehicle.status]};
            }
            .metric-label {
              color: #6b7280;
              font-size: 12px;
              font-weight: 600;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              margin-bottom: 8px;
            }
            .metric-value {
              color: #1f2937;
              font-size: 24px;
              font-weight: 700;
            }
            .info-section {
              background: #f9fafb;
              padding: 25px;
              border-radius: 12px;
              margin: 20px 0;
            }
            .info-row {
              display: flex;
              justify-content: space-between;
              padding: 15px 0;
              border-bottom: 1px solid #e5e7eb;
            }
            .info-row:last-child { border-bottom: none; }
            .label { color: #6b7280; font-weight: 600; }
            .value { color: #1f2937; font-weight: 700; text-align: right; }
            .map-button {
              display: inline-block;
              background: ${statusColors[vehicle.status]};
              color: white;
              padding: 15px 30px;
              border-radius: 10px;
              text-decoration: none;
              font-weight: 600;
              margin-top: 20px;
              transition: transform 0.2s, box-shadow 0.2s;
            }
            .map-button:hover {
              transform: translateY(-2px);
              box-shadow: 0 10px 20px rgba(0,0,0,0.2);
            }
            .timestamp {
              text-align: center;
              color: #9ca3af;
              font-size: 14px;
              margin-top: 30px;
              padding-top: 20px;
              border-top: 1px solid #e5e7eb;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🚗 ${vehicle.plateNumber}</h1>
              <p>${vehicle.make} ${vehicle.model} (${vehicle.year})</p>
              <div class="status-badge">${vehicle.status.toUpperCase()}</div>
            </div>
            
            <div class="content">
              <div class="metrics">
                <div class="metric-card">
                  <div class="metric-label">Speed</div>
                  <div class="metric-value">${vehicle.speed} <span style="font-size: 16px;">km/h</span></div>
                </div>
                <div class="metric-card">
                  <div class="metric-label">Fuel Level</div>
                  <div class="metric-value">${vehicle.fuelLevel} <span style="font-size: 16px;">%</span></div>
                </div>
                <div class="metric-card">
                  <div class="metric-label">Odometer</div>
                  <div class="metric-value">${(vehicle.odometer / 1000).toFixed(1)} <span style="font-size: 16px;">k km</span></div>
                </div>
              </div>

              <div class="info-section">
                <div class="info-row">
                  <span class="label">Engine Status</span>
                  <span class="value" style="color: ${vehicle.engineOn ? '#10b981' : '#ef4444'}">
                    ${vehicle.engineOn ? '✓ Running' : '✗ Off'}
                  </span>
                </div>
                ${vehicle.driver ? `
                <div class="info-row">
                  <span class="label">Driver</span>
                  <span class="value">${vehicle.driver.name}</span>
                </div>
                ` : ''}
                <div class="info-row">
                  <span class="label">Internal ID</span>
                  <span class="value">${vehicle.internalId}</span>
                </div>
                <div class="info-row">
                  <span class="label">Current Location</span>
                  <span class="value" style="max-width: 60%; text-align: right;">${vehicle.currentLocation?.address}</span>
                </div>
              </div>

              <div style="text-align: center;">
                <a href="${mapUrl}" target="_blank" class="map-button">
                  📍 View on Google Maps
                </a>
              </div>

              <div class="timestamp">
                Last updated: ${new Date(vehicle.currentLocation?.updatedAt).toLocaleString()}
              </div>
            </div>
          </div>
        </body>
      </html>
    `;

    const newWindow = window.open('', '_blank', 'width=1000,height=800');
    if (newWindow) {
      newWindow.document.write(vehicleContent);
      newWindow.document.close();
    }
  };


  return (
    <div className="flex h-screen bg-main">
      {/* Left Sidebar */}
      <div
        className={`bg-card shadow-xl transition-all duration-300 ease-in-out ${isSidebarOpen ? "w-96" : "w-0"
          } overflow-hidden`}
      >
        <div className="h-full flex flex-col">
          {/* Header */}
          <div className="bg-gradient-to-r from-[rgba(0,209,255,0.2)] via-[rgba(0,209,255,0.15)] to-[rgba(168,85,247,0.2)] p-4 border border-theme rounded-lg">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold flex items-center gap-2 text-primary">
                <Activity className="w-5 h-5 text-accent" />
                Fleet Tracker
              </h2>
              <button
                onClick={() => setIsSidebarOpen(false)}
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
                className="w-full pl-10 pr-4 py-1.5 text-sm rounded-lg bg-card text-primary placeholder:text-secondary border border-theme focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)]"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          {/* Vehicle List */}
          <div className="flex-1 overflow-y-auto p-3 bg-main">
            {filteredVehicles.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-secondary">No vehicles found</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredVehicles.map((v) => (
                  <div
                    key={v._id}
                    className={`p-3 rounded-xl cursor-pointer transition-all duration-200 border-2 relative group ${selectedVehicle?._id === v._id
                        ? "bg-main border-[var(--accent-blue)] shadow-md"
                        : "bg-card border-theme hover:border-blue-300 hover:shadow-sm"
                      }`}
                  >
                    {/* Open in New Tab Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openVehicleInNewTab(v);
                      }}
                      className="absolute top-2 right-2 p-2 bg-card rounded-lg shadow-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-[rgba(0,209,255,0.1)] z-10"
                      title="Open in new tab"
                    >
                      <ExternalLink className="w-4 h-4 text-[#00D1FF]" />
                    </button>

                    <div onClick={() => handleVehicleClick(v)}>
                      {/* Plate Number & Status */}
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-bold text-base text-primary">
                          {v.plateNumber}
                        </h3>
                        <span
                          className="px-2 py-0.5 rounded-full text-xs font-semibold"
                          style={{
                            backgroundColor: statusBgColors[v.status],
                            color: statusColors[v.status],
                          }}
                        >
                          {v.status.toUpperCase()}
                        </span>
                      </div>

                      {/* Vehicle Details */}
                      <div className="space-y-2 text-xs">
                        <div className="flex items-center gap-2 text-secondary">
                          <User className="w-3 h-3" />
                          <span>
                            {v?.driver ? v?.driver?.name : "No driver assigned"}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-secondary">
                          <MapPin className="w-3 h-3" />
                          <span className="truncate">{v.currentLocation?.address || 'Location unavailable'}</span>
                        </div>
                        <div className="flex items-center justify-between text-secondary mt-2 pt-2 border-t border-theme">
                          <span className="flex items-center gap-1">
                            <Gauge className="w-3 h-3" />
                            {v.speed} km/h
                          </span>
                          <span className="flex items-center gap-1">
                            <Fuel className="w-3 h-3" />
                            {v.fuelLevel}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sidebar Toggle Button (when closed) */}
      {!isSidebarOpen && (
        <button
          onClick={() => setIsSidebarOpen(true)}
          className="absolute left-0 top-1/2 transform -translate-y-1/2 bg-[rgba(0,209,255,0.15)] text-white p-2 rounded-r-lg shadow-lg hover:bg-[rgba(0,209,255,0.25)] transition-colors z-10"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      )}

      {/* Right Map */}
      <div className="flex-1 relative">
        {!vehiclesLoaded ? (
          <div className="w-full h-full flex items-center justify-center bg-[var(--bg-main)]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[var(--accent-blue)] mx-auto mb-3" />
              <p className="text-secondary text-sm">Loading fleet data...</p>
            </div>
          </div>
        ) : (
        <MapContainer
          center={location || [20.5937, 78.9629]}
          zoom={mapZoom}
          style={{ width: '100%', height: '100%' }}
          scrollWheelZoom={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {location && (
            <MapController center={location} zoom={mapZoom} />
          )}
          {selectedVehicle && location && (
            <Marker
              position={location}
              icon={createVehicleIcon(statusColors[selectedVehicle.status] || "#3b82f6")}
            >
              <Popup>
                <div className="p-2">
                  <p className="font-semibold text-sm">{selectedVehicle.plateNumber}</p>
                  <p className="text-xs text-secondary">{selectedVehicle.make} {selectedVehicle.model} ({selectedVehicle.year})</p>
                  <p className="text-xs text-secondary mt-1">{selectedVehicle.currentLocation?.address || 'Location unknown'}</p>
                  {selectedVehicle.driver && (
                    <p className="text-xs text-[#00D1FF] mt-1">Driver: {selectedVehicle.driver.name}</p>
                  )}
                  <div className="flex gap-4 mt-2 text-xs">
                    <span className="flex items-center gap-1">
                      <Gauge className="w-3 h-3" />
                      {selectedVehicle.speed} km/h
                    </span>
                    <span className="flex items-center gap-1">
                      <Fuel className="w-3 h-3" />
                      {selectedVehicle.fuelLevel}%
                    </span>
                  </div>
                </div>
              </Popup>
            </Marker>
          )}
        </MapContainer>
        )} {/* end vehiclesLoaded ternary */}

        {/* Advanced Info Panel */}
        {selectedVehicle && isInfoPanelOpen && (
          <div className="absolute top-4 right-4 bg-card rounded-xl shadow-2xl w-80 overflow-hidden border border-theme z-[1000]">
            {/* Header */}
            <div
              className="p-4 text-white"
              style={{
                background: `linear-gradient(135deg, ${statusColors[selectedVehicle.status]}, ${statusColors[selectedVehicle.status]}dd)`,
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xl font-bold">{selectedVehicle.plateNumber}</h3>
                <div className="flex gap-2">
                  <button
                    onClick={openInNewTab}
                    className="p-2 hover:bg-card/20 rounded-lg transition-colors"
                    title="Open selected vehicle in new tab"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setIsInfoPanelOpen(false)}
                    className="p-2 hover:bg-card/20 rounded-lg transition-colors"
                    title="Close"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <p className="text-sm opacity-90">
                {selectedVehicle.make} {selectedVehicle.model} ({selectedVehicle.year})
              </p>
            </div>

            {/* Content */}
            <div className="p-5 space-y-4 max-h-96 overflow-y-auto">
              {/* Status Row */}
              <div className="flex items-center justify-between p-3 bg-card rounded-lg">
                <span className="text-secondary font-medium">Status</span>
                <span
                  className="px-3 py-1 rounded-full text-xs font-bold"
                  style={{
                    backgroundColor: statusBgColors[selectedVehicle.status],
                    color: statusColors[selectedVehicle.status],
                  }}
                >
                  {selectedVehicle.status.toUpperCase()}
                </span>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-card rounded-lg border border-theme">
                  <div className="flex items-center gap-2 text-[#00D1FF] mb-1">
                    <Gauge className="w-4 h-4" />
                    <span className="text-xs font-medium">Speed</span>
                  </div>
                  <p className="text-xl font-bold text-primary">
                    {selectedVehicle.speed} <span className="text-sm">km/h</span>
                  </p>
                </div>

                <div className="p-3 bg-card rounded-lg border border-theme">
                  <div className="flex items-center gap-2 text-[#00FFA3] mb-1">
                    <Fuel className="w-4 h-4" />
                    <span className="text-xs font-medium">Fuel</span>
                  </div>
                  <p className="text-xl font-bold text-primary">
                    {selectedVehicle.fuelLevel} <span className="text-sm">%</span>
                  </p>
                </div>
              </div>

              {/* Details */}
              <div className="space-y-3">
                <div className="flex justify-between py-2 border-b border-theme">
                  <span className="text-secondary">Odometer</span>
                  <span className="font-semibold text-primary">
                    {selectedVehicle.odometer.toLocaleString()} km
                  </span>
                </div>

                <div className="flex justify-between py-2 border-b border-theme">
                  <span className="text-secondary">Engine</span>
                  <span
                    className={`font-semibold ${selectedVehicle.engineOn ? "text-green-600" : "text-[#A855F7]"
                      }`}
                  >
                    {selectedVehicle.engineOn ? "On ✓" : "Off ✗"}
                  </span>
                </div>

                {selectedVehicle.driver && (
                  <div className="flex justify-between py-2 border-b border-theme">
                    <span className="text-secondary">Driver</span>
                    <span className="font-semibold text-primary">
                      {selectedVehicle.driver.name}
                    </span>
                  </div>
                )}

                <div className="py-2">
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-secondary mt-1 flex-shrink-0" />
                    <div>
                      <p className="text-xs text-secondary mb-1">Location</p>
                      <p className="text-sm text-primary">
                        {selectedVehicle.currentLocation?.address}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Status Legend */}
        <div className="absolute bottom-4 left-4 bg-card p-2 rounded-lg shadow-lg text-xs z-[1000]">
          <div className="font-semibold mb-2 text-primary">Vehicle Status:</div>
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-primary">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#10b981' }}></div>
              <span>Moving</span>
            </div>
            <div className="flex items-center gap-2 text-primary">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#f59e0b' }}></div>
              <span>Idle</span>
            </div>
            <div className="flex items-center gap-2 text-primary">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#ef4444' }}></div>
              <span>Stopped</span>
            </div>
            <div className="flex items-center gap-2 text-primary">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#6b7280' }}></div>
              <span>Maintenance</span>
            </div>
          </div>
        </div>

        {/* Reopen Info Panel Button */}
        {selectedVehicle && !isInfoPanelOpen && (
          <button
            onClick={() => setIsInfoPanelOpen(true)}
            className="absolute top-4 right-4 bg-card p-2 rounded-lg shadow-lg hover:shadow-xl transition-shadow border border-theme z-[1000]"
            title="Show vehicle info"
          >
            <Activity className="w-5 h-5 text-[#00D1FF]" />
          </button>
        )}
      </div>
    </div>
  );
};

export default ProfessionalFleetTracker;