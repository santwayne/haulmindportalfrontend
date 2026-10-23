import { useState, useEffect } from "react";
import { Truck, Package, MapPin, CheckCircle, XCircle } from "lucide-react";
import { getUtilization } from "../../../../../axios/api/distapcher";

interface Truck {
  id: string;
  _id?: string;
  unitNumber?: string;
  internalId?: string;
  plateNumber: string;
  vinNumber?: string;
  make: string;
  model: string;
  year?: string;
  type?: string;
  weight?: string;
  uom?: string;
  registrationCountry?: string;
  registrationProvince?: string;
  status?: string;
  operationStatus?: string;
  ownership?: string;
  subType?: string;
  currentLocation: string;
  latitude?: string;
  longitude?: string;
  speed?: number;
  fuelLevel?: number;
  odometer?: number;
  driver?: {
    _id: string;
    name?: string;
    email?: string;
    phone?: string;
  } | null;
  trailer?: {
    _id: string;
    unitNumber?: string;
    trailer?: string;
    plateNumber?: string;
  } | null;
  serviceStatus: string;
  capacity?: string;
  serialNumber?: string;
  compliance?: string;
  category?: string;
}

interface Trailer {
  id: string;
  _id?: string;
  unitNumber?: string;
  internalId?: string;
  trailer?: string;
  trailerNumber: string;
  plateNumber: string;
  vinNumber?: string;
  make?: string;
  model?: string;
  year?: string;
  type?: string;
  weight?: string;
  uom?: string;
  registrationCountry?: string;
  registrationProvince?: string;
  status?: string;
  operationStatus?: string;
  loadedStatus?: string;
  ownership?: string;
  subType?: string;
  currentLocation: string;
  latitude?: string;
  longitude?: string;
  speed?: number;
  capacity?: string;
  isAttached?: boolean;
  attachedVehicle?: {
    _id: string;
    unitNumber?: string;
    plateNumber?: string;
    make?: string;
    model?: string;
  } | null;
  cargoDetails?: any;
  sensors?: any;
  trailerStatus: string;
  serviceStatus: string;
  compliance?: string;
  category?: string;
}

const UtilizationPage = () => {

  const [activeTab, setActiveTab] = useState<"trucks" | "trailers">("trucks");
  const [searchTerm, setSearchTerm] = useState("");
  const [trucks, setTrucks] = useState<Truck[]>([]);
  const [trailers, setTrailers] = useState<Trailer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUtilizationData();
  }, []);

  const fetchUtilizationData = async () => {
    try {
      setLoading(true);
      const response = await getUtilization();
      if (response.success && response.data) {
        setTrucks(response.data.trucks || []);
        setTrailers(response.data.trailers || []);
      }
    } catch (error) {
      console.error("Error fetching utilization data:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredTrucks = trucks.filter(
    (truck) => {
      const searchLower = searchTerm.toLowerCase();
      return (
        (truck.plateNumber || '').toLowerCase().includes(searchLower) ||
        (truck.currentLocation || '').toLowerCase().includes(searchLower) ||
        (truck.make || '').toLowerCase().includes(searchLower) ||
        (truck.model || '').toLowerCase().includes(searchLower) ||
        (truck.unitNumber || '').toLowerCase().includes(searchLower) ||
        (truck.internalId || '').toLowerCase().includes(searchLower) ||
        (truck.vinNumber || '').toLowerCase().includes(searchLower) ||
        (truck.driver?.name || '').toLowerCase().includes(searchLower)
      );
    }
  );

  const filteredTrailers = trailers.filter(
    (trailer) => {
      const searchLower = searchTerm.toLowerCase();
      return (
        (trailer.plateNumber || '').toLowerCase().includes(searchLower) ||
        (trailer.trailerNumber || '').toLowerCase().includes(searchLower) ||
        (trailer.trailer || '').toLowerCase().includes(searchLower) ||
        (trailer.currentLocation || '').toLowerCase().includes(searchLower) ||
        (trailer.unitNumber || '').toLowerCase().includes(searchLower) ||
        (trailer.internalId || '').toLowerCase().includes(searchLower) ||
        (trailer.vinNumber || '').toLowerCase().includes(searchLower)
      );
    }
  );

  const getServiceStatusBadge = (status: string) => {
    if (status.toLowerCase() === "in service") {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[var(--accent-green)]/10 text-[var(--accent-green)]">
          <CheckCircle className="w-3 h-3 mr-1" />
          In Service
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[var(--accent-purple)]/10 text-[var(--accent-purple)]">
        <XCircle className="w-3 h-3 mr-1" />
        Out of Service
      </span>
    );
  };

  const getTrailerStatusBadge = (status: string) => {
    if (status.toLowerCase() === "loaded") {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[var(--accent-blue)]/10 text-[var(--accent-blue)]">
          Loaded
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-card border border-theme text-primary">
        Empty
      </span>
    );
  };

  return (
    <div className="min-h-screen" >
      <div className="relative w-full mx-auto">


        {/* Main content */}
        <div className="relative z-10 px-4 pt-3 pb-6">
          {/* Header Section */}
          <div className="mb-4 relative z-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">

                <h1 className="text-xl font-bold text-primary">Truck & Trailer Utilization</h1>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="bg-card rounded-lg shadow-sm mb-4">
            <div className="border-b border-theme">
              <nav className="flex -mb-px">
                <button
                  onClick={() => setActiveTab("trucks")}
                  className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === "trucks"
                    ? "border-accent !text-[var(--accent-navyblue)]"
                    : "border-transparent text-secondary hover:text-primary hover:border-theme"
                    }`}
                >
                  <div className="flex items-center gap-2">
                    <Truck className="w-4 h-4" />
                    Trucks ({trucks.length})
                  </div>
                </button>
                <button
                  onClick={() => setActiveTab("trailers")}
                  className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === "trailers"
                    ? "border-accent !text-[var(--accent-navyblue)]"
                    : "border-transparent text-secondary hover:text-primary hover:border-theme"
                    }`}
                >
                  <div className="flex items-center gap-2">
                    <Package className="w-4 h-4" />
                    Trailers ({trailers.length})
                  </div>
                </button>
              </nav>
            </div>

            {/* Search Bar */}
            <div className="p-4 border-b border-theme">
              <div className="relative">
                <input
                  type="text"
                  placeholder={`Search ${activeTab}...`}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-theme bg-card text-primary rounded-lg focus:ring-2 focus:ring-[var(--accent-blue)] focus:border-transparent"
                />
                <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-secondary w-5 h-5" />
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-card border-b border-theme">
                  <tr>
                    {activeTab === "trucks" ? (
                      <>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-[var(--accent-navyblue)] uppercase tracking-wider">
                          Unit/Plate
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-[var(--accent-navyblue)] uppercase tracking-wider">
                          Make/Model/Year
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-[var(--accent-navyblue)] uppercase tracking-wider">
                          Driver
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-[var(--accent-navyblue)] uppercase tracking-wider">
                          Location
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-[var(--accent-navyblue)] uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-[var(--accent-navyblue)] uppercase tracking-wider">
                          Details
                        </th>
                      </>
                    ) : (
                      <>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-[var(--accent-navyblue)] uppercase tracking-wider">
                          Trailer/Plate
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-[var(--accent-navyblue)] uppercase tracking-wider">
                          Make/Model/Type
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-[var(--accent-navyblue)] uppercase tracking-wider">
                          Attached Vehicle
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-[var(--accent-navyblue)] uppercase tracking-wider">
                          Location
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-[var(--accent-navyblue)] uppercase tracking-wider">
                          Load Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-[var(--accent-navyblue)] uppercase tracking-wider">
                          Service Status
                        </th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody className="bg-card  divide-theme">
                  {loading ? (
                    <tr>
                      <td colSpan={activeTab === "trucks" ? 6 : 6} className="px-6 py-8 text-center text-secondary">
                        Loading...
                      </td>
                    </tr>
                  ) : activeTab === "trucks" ? (
                    filteredTrucks.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-8 text-center text-secondary">
                          No trucks found
                        </td>
                      </tr>
                    ) : (
                      filteredTrucks.map((truck) => (
                        <tr key={truck.id} className="hover:bg-[rgba(255,255,255,0.03)] transition-colors">
                          <td className="px-6 py-4">
                            <div className="text-sm font-medium text-primary">{truck.plateNumber || 'N/A'}</div>
                            <div className="text-xs text-secondary">
                              Unit: {truck.unitNumber || truck.internalId || 'N/A'}
                            </div>
                            {truck.vinNumber && (
                              <div className="text-xs text-secondary">VIN: {truck.vinNumber}</div>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-primary">{truck.make || 'N/A'} {truck.model || ''}</div>
                            {truck.year && (
                              <div className="text-xs text-secondary">Year: {truck.year}</div>
                            )}
                            {truck.type && (
                              <div className="text-xs text-secondary">Type: {truck.type}</div>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            {truck.driver ? (
                              <>
                                <div className="text-sm text-primary">{truck.driver.name || 'N/A'}</div>
                                {truck.driver.phone && (
                                  <div className="text-xs text-secondary">{truck.driver.phone}</div>
                                )}
                              </>
                            ) : (
                              <div className="text-sm text-secondary">No driver assigned</div>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center text-sm text-primary">
                              <MapPin className="w-4 h-4 mr-1 text-secondary flex-shrink-0" />
                              <span className="truncate max-w-xs">{truck.currentLocation || 'Unknown'}</span>
                            </div>
                            {truck.speed !== undefined && truck.speed > 0 && (
                              <div className="text-xs text-secondary">Speed: {truck.speed} km/h</div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {getServiceStatusBadge(truck.serviceStatus)}
                            {truck.operationStatus && (
                              <div className="text-xs text-secondary mt-1">{truck.operationStatus}</div>
                            )}
                          </td>
                          <td className="px-6 py-4 text-sm text-secondary">
                            {truck.odometer !== undefined && (
                              <div>Odometer: {truck.odometer.toLocaleString()} km</div>
                            )}
                            {truck.fuelLevel !== undefined && (
                              <div>Fuel: {truck.fuelLevel}%</div>
                            )}
                            {truck.capacity && (
                              <div>Capacity: {truck.capacity}</div>
                            )}
                            {truck.trailer && (
                              <div className="text-xs text-accent">Trailer: {truck.trailer.unitNumber || truck.trailer.trailer || truck.trailer.plateNumber}</div>
                            )}
                          </td>
                        </tr>
                      ))
                    )
                  ) : (
                    filteredTrailers.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-8 text-center text-secondary">
                          No trailers found
                        </td>
                      </tr>
                    ) : (
                      filteredTrailers.map((trailer) => (
                        <tr key={trailer.id} className="hover:bg-[rgba(255,255,255,0.03)] transition-colors">
                          <td className="px-6 py-4">
                            <div className="text-sm font-medium text-primary">{trailer.plateNumber || 'N/A'}</div>
                            <div className="text-xs text-secondary">
                              Trailer: {trailer.trailerNumber || trailer.trailer || 'N/A'}
                            </div>
                            {(trailer.unitNumber || trailer.internalId) && (
                              <div className="text-xs text-secondary">
                                Unit: {trailer.unitNumber || trailer.internalId}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            {(trailer.make || trailer.model) && (
                              <div className="text-sm text-primary">{trailer.make || ''} {trailer.model || ''}</div>
                            )}
                            {trailer.type && (
                              <div className="text-xs text-secondary">Type: {trailer.type}</div>
                            )}
                            {trailer.year && (
                              <div className="text-xs text-secondary">Year: {trailer.year}</div>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            {trailer.attachedVehicle ? (
                              <>
                                <div className="text-sm text-primary">
                                  {trailer.attachedVehicle.unitNumber || trailer.attachedVehicle.plateNumber || 'N/A'}
                                </div>
                                {(trailer.attachedVehicle.make || trailer.attachedVehicle.model) && (
                                  <div className="text-xs text-secondary">
                                    {trailer.attachedVehicle.make} {trailer.attachedVehicle.model}
                                  </div>
                                )}
                              </>
                            ) : (
                              <div className="text-sm text-secondary">Not attached</div>
                            )}
                            {trailer.isAttached && (
                              <div className="text-xs text-[var(--accent-green)]">Attached</div>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center text-sm text-primary">
                              <MapPin className="w-4 h-4 mr-1 text-secondary flex-shrink-0" />
                              <span className="truncate max-w-xs">{trailer.currentLocation || 'Unknown'}</span>
                            </div>
                            {trailer.speed !== undefined && trailer.speed > 0 && (
                              <div className="text-xs text-secondary">Speed: {trailer.speed} km/h</div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {getTrailerStatusBadge(trailer.trailerStatus)}
                            {trailer.loadedStatus && (
                              <div className="text-xs text-secondary mt-1">{trailer.loadedStatus}</div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {getServiceStatusBadge(trailer.serviceStatus)}
                            {trailer.operationStatus && (
                              <div className="text-xs text-secondary mt-1">{trailer.operationStatus}</div>
                            )}
                            {trailer.capacity && (
                              <div className="text-xs text-secondary mt-1">Cap: {trailer.capacity}</div>
                            )}
                          </td>
                        </tr>
                      ))
                    )
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UtilizationPage;

