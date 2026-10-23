import { useState, useEffect } from "react";
import {
  FaTruck,
  FaRoute,
  FaShieldAlt,
  FaClipboardCheck,
  FaTicketAlt,
  FaExclamationTriangle,
  FaWrench,
  FaTrailer,
  FaSpinner,
} from "react-icons/fa";
// import { FLEET_COLORS } from "../colorUtils"; // Removing dependency on old colorUtils for new design
import { getTruckProfile } from "../../../../axios/api/admin";
import { listVehicle, listTrailers } from "../../../../axios/api/distapcher";
import TimelineNotes from "../../../../components/common/TimelineNotes";

// Helper Component for Stats
const StatCard = ({ title, value, subtitle, icon: Icon, bgColor, iconColor, textColor }: any) => (
  <div className="bg-card rounded-xl p-6 border border-theme shadow-lg flex items-start justify-between">
    <div>
      <p className={`text-xs font-semibold text-secondary uppercase tracking-wide ${textColor}`}>{title}</p>
      <h3 className={`text-2xl font-bold mt-2 ${textColor}`}>{value}</h3>
      <p className="text-xs text-secondary mt-1">{subtitle}</p>
    </div>
    <div className={`p-3 rounded-lg ${bgColor}`}>
      <Icon className={`w-6 h-6 ${iconColor}`} />
    </div>
  </div>
);

// Static data types
type VehicleProfileData = {
  _id: string;
  unitNumber: string;
  licensePlate: string;
  vinNo: string;
  make: string;
  model: string;
  makeModel: string;
  year?: number;
  status: string;
  operationStatus: string;
  currentOdometer: number;
  currentLocation?: {
    address?: string;
    longitude?: string;
    latitude?: string;
  };
  internalId?: string;
  currentDriver?: {
    _id: string;
    name: string;
    email: string;
    phone: string;
  } | null;
  currentAssignment?: {
    type: 'order' | 'trip';
    id: string;
    orderNumber?: string;
    tripNumber?: string;
    status: string;
    customer?: string;
    route?: {
      pickup: string;
      dropoff: string;
    };
  } | null;
  assignmentHistory: Array<{
    type: 'order' | 'trip';
    id: string;
    orderNumber?: string;
    tripNumber?: string;
    driver: {
      _id: string;
      name: string;
      email: string;
      phone: string;
    };
    status: string;
    assignedAt?: Date;
    startedAt?: Date;
    completedAt?: Date;
  }>;
  compliance: {
    cvsa: {
      lastInspection: string;
      result: string;
      violations: string[];
      officer: string;
    };
    tickets: Array<{
      id: string;
      issued: string;
      category: string;
      amount: number;
      status: string;
    }>;
    incidents: Array<{
      id: string;
      date: string;
      type: string;
      severity: string;
      resolution: string;
    }>;
    accidents: Array<{
      id: string;
      date: string;
      type: string;
      severity: string;
      resolution: string;
    }>;
  };
  fleet: {
    serviceLogs: Array<{
      id: string;
      date: string;
      vendor: string;
      description: string;
      cost: number;
    }>;
    repairs: Array<{
      id: string;
      date: string;
      issue: string;
      resolution: string;
      downtimeHours: number;
    }>;
    spareParts: Array<{
      partNumber: string;
      partName: string;
      description?: string;
      category?: string;
      quantity: number;
      cost: number;
      reference: string;
    }>;
  };
};

const TruckProfile = () => {
  const [activeTab, setActiveTab] = useState<"truck" | "trailer">("truck");
  const [selectedUnit, setSelectedUnit] = useState<string>("");
  const [timeFilter, setTimeFilter] = useState<"30d" | "60d" | "90d" | "all">("30d");
  const [units, setUnits] = useState<Array<{ unitNo: string; _id: string; unitType: string }>>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);

  // Fetch units list when tab changes
  useEffect(() => {
    const fetchUnits = async () => {
      try {
        setLoading(true);
        if (activeTab === "truck") {
          // Fetch vehicles
          const response = await listVehicle({ limit: 1000 });
          if (response?.success && response?.data) {
            const vehicles = Array.isArray(response.data.data) ? response.data.data : response.data;
            const unitList = vehicles.map((v: any) => ({
              unitNo: v.unitNumber || v.internalId || v.plateNumber || v._id,
              _id: v._id,
              unitType: "Truck"
            }));
            setUnits(unitList);
            if (unitList.length > 0 && (!selectedUnit || !unitList.find((u: any) => u.unitNo === selectedUnit))) {
              setSelectedUnit(unitList[0].unitNo);
            }
          } else {
            setUnits([]);
          }
        } else {
          // Fetch trailers
          const response = await listTrailers({ limit: 1000 });
          if (response?.success && response?.data) {
            const trailers = Array.isArray(response.data.data) ? response.data.data : response.data;
            const unitList = trailers.map((t: any) => ({
              unitNo: t.unitNumber || t.internalId || t.plateNumber || t.trailer || t._id,
              _id: t._id,
              unitType: "Trailer"
            }));
            setUnits(unitList);
            if (unitList.length > 0 && (!selectedUnit || !unitList.find((u: any) => u.unitNo === selectedUnit))) {
              setSelectedUnit(unitList[0].unitNo);
            }
          } else {
            setUnits([]);
          }
        }
      } catch (error) {
        console.error("Error fetching units:", error);
        setUnits([]);
      } finally {
        setLoading(false);
      }
    };

    fetchUnits();
  }, [activeTab]);

  // Fetch profile when unit or timeFilter changes
  useEffect(() => {
    if (!selectedUnit) {
      setSelectedVehicle(null);
      return;
    }

    const fetchProfile = async () => {
      try {
        setProfileLoading(true);
        const unitType = activeTab === "truck" ? "Truck" : "trailer";
        const dateRange = timeFilter === "all" ? undefined : timeFilter;
        const response = await getTruckProfile(selectedUnit, dateRange, "all", unitType);
        if (response?.success && response?.data) {
          // Map API response to VehicleProfileData format
          const profileData: VehicleProfileData = {
            _id: response.data._id,
            unitNumber: response.data.unitNumber,
            licensePlate: response.data.licensePlate,
            vinNo: response.data.vinNo,
            make: response.data.make,
            model: response.data.model,
            makeModel: response.data.makeModel,
            year: response.data.year,
            status: response.data.status,
            operationStatus: response.data.operationStatus,
            currentOdometer: response.data.currentOdometer || 0,
            currentLocation: response.data.currentLocation || {},
            internalId: response.data.internalId,
            currentDriver: response.data.currentDriver || null,
            currentAssignment: response.data.currentAssignment || null,
            assignmentHistory: response.data.assignmentHistory || [],
            compliance: response.data.compliance || {
              cvsa: {
                lastInspection: "No inspections",
                result: "N/A",
                violations: [],
                officer: "N/A"
              },
              tickets: [],
              incidents: [],
              accidents: []
            },
            fleet: response.data.fleet || {
              serviceLogs: [],
              repairs: [],
              spareParts: []
            }
          };
          setSelectedVehicle(profileData);
        } else {
          setSelectedVehicle(null);
        }
      } catch (error) {
        console.error("Error fetching profile:", error);
        setSelectedVehicle(null);
      } finally {
        setProfileLoading(false);
      }
    };

    fetchProfile();
  }, [selectedUnit, activeTab, timeFilter]);

  // Use data directly from selectedVehicle (already filtered by backend based on timeFilter)
  const filteredData = selectedVehicle ? {
    serviceLogs: selectedVehicle.fleet.serviceLogs || [],
    repairs: selectedVehicle.fleet.repairs || [],
    tickets: selectedVehicle.compliance.tickets || [],
    incidents: selectedVehicle.compliance.incidents || [],
    accidents: selectedVehicle.compliance.accidents || [],
    assignmentHistory: selectedVehicle.assignmentHistory || []
  } : {
    serviceLogs: [],
    repairs: [],
    tickets: [],
    incidents: [],
    accidents: [],
    assignmentHistory: []
  };

  const totalServiceCost = filteredData.serviceLogs.reduce((sum, log) => sum + (log.cost || 0), 0);
  const totalRepairDowntime = filteredData.repairs.reduce((sum, repair) => sum + (repair.downtimeHours || 0), 0);
  const totalTickets = filteredData.tickets.length;
  const totalIncidents = filteredData.incidents.length + filteredData.accidents.length;

  // Loading state
  if (loading || profileLoading) {
    return (
      <div className="min-h-screen bg-main p-6 flex items-center justify-center">
        <div className="text-center">
          <FaSpinner className="w-12 h-12 text-[#00D1FF] animate-spin mx-auto mb-4" />
          <p className="text-secondary font-medium">Loading {activeTab === "truck" ? "truck" : "trailer"} profile...</p>
        </div>
      </div>
    );
  }

  // No units available
  if (!selectedVehicle && units.length === 0) {
    return (
      <div className="min-h-screen bg-main p-6">
        <div className="max-w-7xl mx-auto text-center py-20">
          <div className="bg-card rounded-2xl p-10 shadow-lg inline-block">
            <FaExclamationTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-headings">No Units Found</h3>
            <p className="text-secondary mt-2">No {activeTab === "truck" ? "trucks" : "trailers"} are currently available in the system.</p>
          </div>
        </div>
      </div>
    );
  }

  // No selected vehicle
  if (!selectedVehicle) {
    return (
      <div className="min-h-screen bg-main p-6">
        <div className="max-w-7xl mx-auto text-center py-20">
          <div className="bg-card rounded-2xl p-10 shadow-lg inline-block">
            <FaExclamationTriangle className="w-12 h-12 text-secondary mx-auto mb-4" />
            <h3 className="text-xl font-bold text-headings">No Profile Data</h3>
            <p className="text-secondary mt-2">No profile data available for the selected unit.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-10 p-5 bg-main" >
      <div className="relative w-full mx-auto">


        <div className="relative z-10 px-4 pt-6 pb-6">
          {/* Header & Filters Container */}
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6 mb-8">
            {/* Title Section */}
            <div>
              <div className="flex items-center gap-3 text-white mb-2">
                {activeTab === "truck" ? <FaTruck className="w-6 h-6 text-[var(--accent-navyblue)]" /> : <FaTrailer className="w-6 h-6 text-[var(--accent-navyblue)]" />}
                <h1 className="text-3xl font-bold text-headings tracking-tight">{activeTab === "truck" ? "Truck Profile" : "Trailer Profile"}</h1>
              </div>
              <p className="text-secondary text-sm font-medium ml-9">
                Comprehensive analytics and maintenance history for {selectedVehicle.makeModel}
              </p>

              {/* Tab Switcher */}
              <div className="flex gap-2 mt-6 ml-1">
                <button
                  onClick={() => { setActiveTab("truck"); setSelectedUnit(""); }}
                  className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === "truck" ? "bg-[rgba(0,209,255,0.12)] text-[#00D1FF] border border-[rgba(0,209,255,0.3)]" : "bg-[rgba(255,255,255,0.05)] text-secondary hover:bg-[rgba(255,255,255,0.08)] border border-transparent"
                    }`}
                >
                  Trucks
                </button>
                <button
                  onClick={() => { setActiveTab("trailer"); setSelectedUnit(""); }}
                  className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === "trailer" ? "bg-[rgba(0,209,255,0.12)] text-[#00D1FF] border border-[rgba(0,209,255,0.3)]" : "bg-[rgba(255,255,255,0.05)] text-secondary hover:bg-[rgba(255,255,255,0.08)] border border-transparent"
                    }`}
                >
                  Trailers
                </button>
              </div>

            </div>

            {/* Filters Section */}
            <div className="bg-card rounded-xl p-4 border border-theme flex flex-col sm:flex-row gap-4">
              <div>
                <label className="block text-xs font-bold text-secondary uppercase tracking-wider mb-1">Select Unit</label>
                <select
                  value={selectedUnit}
                  onChange={(e) => setSelectedUnit(e.target.value)}
                  className="w-full sm:w-40 px-3 py-2 bg-card text-headings text-sm font-semibold rounded-lg focus:outline-none focus:ring-2 focus:ring-white/50 border-none"
                >
                  {units.map((unit) => (
                    <option key={unit._id} value={unit.unitNo}>{unit.unitNo}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-secondary uppercase tracking-wider mb-1">Time Period</label>
                <select
                  value={timeFilter}
                  onChange={(e) => setTimeFilter(e.target.value as any)}
                  className="w-full sm:w-40 px-3 py-2 bg-card text-headings text-sm font-semibold rounded-lg focus:outline-none focus:ring-2 focus:ring-white/50 border-none"
                >
                  <option value="30d">Last 30 Days</option>
                  <option value="60d">Last 60 Days</option>
                  <option value="90d">Last 90 Days</option>
                  <option value="all">All Time</option>
                </select>
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatCard
              title="Total Service Cost"
              value={`CA$ ${totalServiceCost.toLocaleString()}`}
              subtitle="Maintenance spend"
              icon={FaWrench}
              bgColor="bg-card"
              iconColor="text-[var(--accent-navyblue)]"
              textColor="text-[var(--accent-navyblue)]"
            />
            <StatCard
              title="Repair Downtime"
              value={`${totalRepairDowntime} hours`}
              subtitle="Total operational loss"
              icon={FaExclamationTriangle}
              bgColor="bg-card"
              iconColor="text-[var(--accent-orange)]"
              textColor="text-[var(--accent-orange)]"
            />
            <StatCard
              title="Tickets Issued"
              value={totalTickets}
              subtitle="Compliance violations"
              icon={FaTicketAlt}
              bgColor="bg-card"
              iconColor="text-[var(--accent-green)]"
              textColor="text-[var(--accent-green)]"
            />
            <StatCard
              title="Incidents & Accidents"
              value={totalIncidents}
              subtitle="Safety events reported"
              icon={FaShieldAlt}
              bgColor="bg-card"
              iconColor="text-[var(--accent-purple)]"
              textColor="text-[var(--accent-purple)]"
            />
          </div>


          {/* Vehicle Information Card */}
          <section className="rounded-xl border border-theme shadow-lg bg-card p-6 grid grid-cols-1 gap-6 lg:grid-cols-4 mb-6 relative overflow-hidden">

            {/* Decorative side bar */}
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-blue-400 to-blue-600"></div>

            <div className="lg:col-span-2 space-y-2">
              <p className="text-xs font-bold uppercase text-secondary tracking-wider">Vehicle Details</p>
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-bold text-headings">{selectedVehicle.makeModel}</h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[rgba(255,255,255,0.06)] text-secondary border border-theme">{selectedVehicle.year}</span>
              </div>

              <p className="text-sm text-secondary font-medium">
                VIN: <span className="text-headings">{selectedVehicle.vinNo}</span> • Plate: <span className="text-headings">{selectedVehicle.licensePlate}</span>
              </p>
              {activeTab === "truck" && selectedVehicle.currentDriver && (
                <p className="text-sm text-secondary mt-2">
                  Driver: <span className="font-semibold text-[var(--accent-navyblue)]">{selectedVehicle.currentDriver.name}</span>
                  <span className="text-xs text-secondary ml-2">{selectedVehicle.currentDriver.phone}</span>
                </p>
              )}
              <div className="mt-4 flex flex-wrap gap-2">
                <span className={`rounded-lg px-3 py-1 text-xs font-bold border ${selectedVehicle.status === 'Active' ? 'bg-[rgba(0,255,163,0.1)] text-[#00FFA3] border-[rgba(0,255,163,0.3)]' : 'bg-[rgba(255,255,255,0.05)] text-secondary border-[rgba(255,255,255,0.1)]'}`}>
                  {selectedVehicle.status}
                </span>
                <span className="rounded-lg px-3 py-1 text-xs font-bold bg-[rgba(0,209,255,0.1)] text-[var(--accent-navyblue)] border border-[rgba(0,209,255,0.3)]">
                  {selectedVehicle.operationStatus}
                </span>
              </div>
            </div>

            <div className="space-y-4 pt-2">
              <div>
                <p className="text-xs font-bold uppercase text-secondary tracking-wider">Odometer</p>
                <p className="text-xl font-bold text-headings font-mono">
                  {activeTab === "truck" ? selectedVehicle.currentOdometer.toLocaleString() : "N/A"} <span className="text-sm text-secondary font-sans">{activeTab === "truck" ? "mi" : ""}</span>
                </p>
              </div>
              {selectedVehicle.currentLocation && (
                <div>
                  <p className="text-xs font-bold uppercase text-secondary tracking-wider">Location</p>
                  <p className="text-sm font-semibold text-headings truncate">{selectedVehicle.currentLocation.address || "Unknown"}</p>
                </div>
              )}
            </div>

            <div className="space-y-4 pt-2">
              {selectedVehicle.currentAssignment && (
                <div>
                  <p className="text-xs font-bold uppercase text-secondary tracking-wider">Current Assignment</p>
                  <div className="mt-1">
                    <span className="inline-block px-2 py-1 rounded-md bg-[rgba(168,85,247,0.1)] text-[#A78BFA] border border-[rgba(168,85,247,0.3)] text-xs font-bold mb-1">
                      {selectedVehicle.currentAssignment.type === "order" ? "Order" : selectedVehicle.currentAssignment.type === "trip" ? "Trip" : "Load"}
                    </span>
                    <p className="text-lg font-bold text-headings">
                      {selectedVehicle.currentAssignment.orderNumber || selectedVehicle.currentAssignment.tripNumber}
                    </p>
                  </div>
                </div>
              )}
              {!selectedVehicle.currentAssignment && (
                <div>
                  <p className="text-xs font-bold uppercase text-secondary tracking-wider">Assignment</p>
                  <p className="text-sm font-medium text-secondary italic mt-1">Unassigned</p>
                </div>
              )}
            </div>
          </section>


          {/* Compliance Section */}
          <section className="bg-card rounded-xl shadow-lg border border-theme p-6 mb-6">
            <div className="flex items-center gap-2 mb-6 border-b border-theme pb-4">
              <FaShieldAlt className="w-5 h-5 text-white" />
              <h3 className="text-lg font-bold text-white">Compliance & Safety</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* CVSA Card */}
              <div className="bg-card rounded-xl p-5 border border-theme">

                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-[rgba(0,209,255,0.1)] rounded-lg text-[var(--accent-navyblue)]">
                      <FaClipboardCheck className="w-4 h-4" />
                    </div>
                    <span className="text-sm font-bold text-headings">Last CVSA Inspection</span>
                  </div>
                  <span className={`px-2 py-1 text-xs font-bold rounded border ${selectedVehicle.compliance?.cvsa?.result === "Pass" ? "bg-[rgba(0,255,163,0.1)] text-[#00FFA3] border-[rgba(0,255,163,0.3)]" : "bg-[rgba(248,113,113,0.1)] text-[#F87171] border-[rgba(248,113,113,0.3)]"
                    }`}>
                    {selectedVehicle.compliance?.cvsa?.result || "N/A"}
                  </span>
                </div>

                <div className="space-y-2 pl-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-secondary">Date</span>
                    <span className="font-semibold text-headings">{selectedVehicle.compliance?.cvsa?.lastInspection || "N/A"}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-secondary">Officer</span>
                    <span className="font-semibold text-headings">{selectedVehicle.compliance?.cvsa?.officer || "N/A"}</span>
                  </div>
                </div>

                {selectedVehicle.compliance?.cvsa?.violations && selectedVehicle.compliance.cvsa.violations.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-theme">
                    <p className="text-xs font-bold text-[#A855F7] uppercase tracking-wide mb-2">Violations Reported</p>
                    <ul className="text-xs text-secondary space-y-1">
                      {selectedVehicle.compliance.cvsa.violations.map((v, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-red-400">•</span> {v}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Tickets Card */}
              <div className="bg-card rounded-xl p-5 border border-theme">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-[rgba(0,255,163,0.1)] rounded-lg text-[#00FFA3]">
                      <FaTicketAlt className="w-4 h-4" />
                    </div>
                    <span className="text-sm font-bold text-headings">Tickets</span>
                  </div>
                  {timeFilter !== "all" && (
                    <span className="text-xs font-medium text-secondary bg-card px-2 py-1 rounded border border-theme">
                      {filteredData.tickets?.length || 0} in period
                    </span>
                  )}
                </div>

                {filteredData.tickets && filteredData.tickets.length > 0 ? (
                  <div className="space-y-3 max-h-[160px] overflow-y-auto pr-1">
                    {filteredData.tickets.map((ticket) => (
                      <div key={ticket.id} className="bg-card p-3 rounded-lg border border-theme shadow-sm text-xs">
                        <div className="flex justify-between items-start mb-1">
                          <span className="font-bold text-headings">{ticket.category}</span>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${ticket.status === "Paid" ? "bg-[rgba(0,255,163,0.1)] text-[#00FFA3] border-[rgba(0,255,163,0.3)]" : "bg-[rgba(252,211,77,0.1)] text-[#FCD34D] border-[rgba(252,211,77,0.3)]"
                            }`}>{ticket.status}</span>
                        </div>
                        <div className="flex justify-between text-secondary mt-1">
                          <span>{ticket.issued}</span>
                          <span className="font-medium text-headings">CA$ {ticket.amount}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-32 text-secondary">
                    <FaClipboardCheck className="w-8 h-8 mb-2 opacity-20" />
                    <p className="text-xs">No tickets recorded</p>
                  </div>
                )}
              </div>
            </div>
          </section>


          {/* Fleet Maintenance Section */}
          <section className="bg-card rounded-xl shadow-lg border border-theme p-6 mb-6">
            <div className="flex items-center gap-2 mb-6 border-b border-theme pb-4">
              <FaWrench className="w-5 h-5 text-white" />
              <h3 className="text-lg font-bold text-white">Fleet Maintenance</h3>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Service Logs */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-bold text-headings">Service Logs</h4>
                  <span className="text-xs text-secondary bg-[rgba(255,255,255,0.06)] px-2 py-1 rounded-full border border-theme">{filteredData.serviceLogs.length} Records</span>
                </div>
                <div className="space-y-3">
                  {filteredData.serviceLogs.length > 0 ? (
                    filteredData.serviceLogs.map((log) => (
                      <div key={log.id} className="group border border-theme rounded-lg p-3 hover:border-blue-400 hover:shadow-sm transition-all bg-card">
                        <div className="flex justify-between items-start mb-1.5">
                          <div className="flex-1">
                            <p className="text-sm font-bold text-headings group-hover:text-[#00D1FF] transition-colors">{log.description}</p>
                            <p className="text-xs text-secondary mt-1 flex items-center gap-2">
                              <span className="bg-[rgba(255,255,255,0.06)] px-1.5 py-0.5 rounded text-[10px] uppercase font-bold tracking-wide text-secondary">{log.vendor}</span>
                              <span>{log.date}</span>
                            </p>
                          </div>
                          <p className="text-sm font-bold text-headings">CA$ {log.cost}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 border-2 border-dashed border-theme rounded-xl">
                      <p className="text-xs text-secondary">No service logs found in this period</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Repairs */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-bold text-headings">Repairs & Issues</h4>
                  <span className="text-xs text-secondary bg-[rgba(255,255,255,0.06)] px-2 py-1 rounded-full border border-theme">{filteredData.repairs.length} Records</span>
                </div>
                <div className="space-y-3">
                  {filteredData.repairs.length > 0 ? (
                    filteredData.repairs.map((repair) => (
                      <div key={repair.id} className="group border border-theme rounded-lg p-3 hover:border-orange-400 hover:shadow-sm transition-all bg-card">
                        <div className="flex justify-between items-start mb-1.5">
                          <div className="flex-1">
                            <p className="text-sm font-bold text-headings group-hover:text-[#F59E0B] transition-colors">{repair.issue}</p>
                            <p className="text-xs text-secondary mt-1">{repair.date}</p>
                          </div>
                          <p className="text-xs font-bold text-[#F59E0B] bg-card px-2 py-1 rounded-lg">{repair.downtimeHours}h Downtime</p>
                        </div>
                        <p className="text-xs text-secondary mt-2 p-2 bg-card rounded-md">
                          <span className="font-semibold text-headings">Resolution:</span> {repair.resolution}
                        </p>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 border-2 border-dashed border-theme rounded-xl">
                      <p className="text-xs text-secondary">No repairs recorded in this period</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-theme">
              <h4 className="text-sm font-bold text-headings mb-4">Spare Parts Usage</h4>
              {selectedVehicle.fleet?.spareParts && selectedVehicle.fleet.spareParts.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {selectedVehicle.fleet.spareParts.map((part) => (
                    <div key={part.partNumber} className="border border-theme bg-card rounded-lg p-3 flex justify-between items-center">
                      <div>
                        <p className="text-sm font-bold text-headings">{part.partName}</p>
                        <p className="text-[10px] font-mono text-secondary mt-0.5">{part.partNumber}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-bold text-headings">Qty: {part.quantity}</p>
                        <p className="text-xs font-medium text-secondary">CA$ {part.cost}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-secondary italic">No spare parts used.</p>
              )}
            </div>
          </section>

          {/* Assignment History */}
          {filteredData.assignmentHistory.length > 0 && (
            <section className="bg-card rounded-xl shadow-lg border border-theme p-6">
              <div className="flex items-center justify-between mb-6 border-b border-theme pb-4">
                <div className="flex items-center gap-2">
                  <FaRoute className="w-5 h-5 text-white" />
                  <h3 className="text-lg font-bold text-white">Assignment History</h3>
                </div>
                <span className="text-xs font-medium text-secondary bg-[rgba(255,255,255,0.06)] px-3 py-1 rounded-full border border-theme">
                  {filteredData.assignmentHistory.length} assignments
                </span>
              </div>

              <div className="space-y-3">
                {filteredData.assignmentHistory.map((assignment) => (
                  <div key={assignment.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border border-theme rounded-xl hover:bg-[rgba(255,255,255,0.03)] transition-colors">
                    <div className="flex items-start gap-4">
                      <div className={`p-2 rounded-full ${assignment.type === 'order' ? 'bg-[rgba(168,85,247,0.1)] text-[#A78BFA]' : 'bg-[rgba(129,140,248,0.1)] text-[#818CF8]'}`}>
                        {(assignment.type === 'order') ? <FaTruck className="w-4 h-4 text-[var(--accent-navyblue)]" /> : <FaRoute className="w-4 h-4" />}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-headings">
                          {assignment.orderNumber || assignment.tripNumber}
                        </p>
                        <p className="text-xs text-secondary mt-1">
                          <span className="font-semibold">{assignment.driver.name}</span> • {assignment.driver.phone}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 sm:mt-0 flex items-center gap-4">
                      {assignment.completedAt && (
                        <div className="text-right">
                          <p className="text-[10px] text-secondary bg-[rgba(255,255,255,0.06)] px-2 py-1 rounded inline-block border border-theme">
                            Completed: {new Date(assignment.completedAt).toLocaleDateString()}
                          </p>
                        </div>
                      )}
                      <span className={`px-3 py-1 text-xs font-bold rounded-lg border ${assignment.status === "Completed" ? "bg-[rgba(0,255,163,0.1)] text-[#00FFA3] border-[rgba(0,255,163,0.3)]" : "bg-[rgba(0,209,255,0.1)] text-[#00D1FF] border-[rgba(0,209,255,0.3)]"
                        }`}>
                        {assignment.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Timeline & Notes */}
          {selectedVehicle && (
            <TimelineNotes
              entityType={activeTab === "truck" ? "trucks" : "trailers"}
              entityId={selectedVehicle._id}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default TruckProfile;
