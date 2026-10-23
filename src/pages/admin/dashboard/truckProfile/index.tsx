import { useMemo, useState, useEffect } from "react";
import {
  FaTruck,
  FaRoute,
  FaShieldAlt,
  FaClipboardCheck,
  FaTicketAlt,
  FaExclamationTriangle,
  FaWrench,
  FaBoxes,
  FaUser,
  FaSpinner,
} from "react-icons/fa";
import { FLEET_COLORS } from "../../fleetMaintenance/colorUtils";
import { getTruckProfile } from "../../../../axios/api/admin";
import { listFleetUnits } from "../../../../axios/api/fleet.units";



// Types for API response
type TruckProfileData = {
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
    updatedAt?: Date;
  };
  internalId?: string;
  currentDriver?: {
    _id: string;
    name: string;
    email: string;
    phone: string;
  } | null;
  currentAssignment?: {
    type: 'load' | 'trip';
    id: string;
    loadNumber?: string;
    tripNumber?: string;
    status: string;
    assignedAt?: Date;
    startedAt?: Date;
    pickupDate?: Date;
    deliveryDate?: Date;
    customer?: string;
    route?: {
      pickup: string;
      dropoff: string;
    };
    actualStartDate?: Date;
    plannedStartDate?: Date;
    startLocation?: string;
    endLocation?: string;
  } | null;
  assignmentHistory: Array<{
    type: 'load' | 'trip';
    id: string;
    loadNumber?: string;
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
    actualStartDate?: Date;
    actualEndDate?: Date;
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

const sectionCardStyle = {
  borderColor: FLEET_COLORS.focusRing,
  borderWidth: '1px',
  boxShadow: `0 17.82px 34.65px ${FLEET_COLORS.focusRing}`,
};

const TruckProfile = () => {
  const [truckProfile, setTruckProfile] = useState<TruckProfileData | null>(null);
  const [trucks, setTrucks] = useState<Array<{ unitNo: string; _id: string }>>([]);
  const [selectedUnit, setSelectedUnit] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<"30d" | "60d" | "90d">("30d");
  const [driverFilter, setDriverFilter] = useState<"all" | string>("all");

  // Fetch all trucks on mount
  useEffect(() => {
    const fetchTrucks = async () => {
      try {
        const response = await listFleetUnits({ category: "trucks" });
        if (response?.success && response?.data) {
          const truckList = response.data.map((t: any) => ({
            unitNo: t.unitNo,
            _id: t._id
          }));
          setTrucks(truckList);
          if (truckList.length > 0 && !selectedUnit) {
            setSelectedUnit(truckList[0].unitNo);
          }
        }
      } catch (error) {
        console.error("Error fetching trucks:", error);
      }
    };

    fetchTrucks();
  }, []);

  // Fetch truck profile when unit, dateRange, or driverFilter changes
  useEffect(() => {
    if (!selectedUnit) return;

    const fetchProfile = async () => {
      setLoading(true);
      try {
        const response = await getTruckProfile(selectedUnit, dateRange, driverFilter);
        if (response?.success && response?.data) {
          setTruckProfile(response.data);
        } else {
          setTruckProfile(null);
        }
      } catch (error) {
        console.error("Error fetching truck profile:", error);
        setTruckProfile(null);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [selectedUnit, dateRange, driverFilter]);

  // Assignment history is already filtered by backend, so use it directly
  const filteredAssignmentHistory = useMemo(() => {
    if (!truckProfile) return [];
    return truckProfile.assignmentHistory;
  }, [truckProfile]);

  if (loading) {
    return (
      <div className="min-h-screen p-6 bg-main flex items-center justify-center">
        <div className="text-center">
          <FaSpinner className="w-12 h-12 text-[#00D1FF] animate-spin mx-auto mb-4" />
          <p className="text-secondary">Loading truck profile...</p>
        </div>
      </div>
    );
  }

  if (!truckProfile) {
    return (
      <div className="min-h-screen p-6 bg-card">
        <div className="max-w-7xl mx-auto">
          <p className="text-secondary">No truck profile found.</p>
        </div>
      </div>
    );
  }

  const { compliance, fleet } = truckProfile;

  return (
    <div
      className="min-h-screen bg-main"
      style={{ padding: 'calc(1.5rem * 0.99)' }}
    >
      <div className="max-w-7xl mx-auto" style={{ gap: 'calc(2rem * 0.99)' }}>
        <header className="flex flex-col md:flex-row md:items-center md:justify-between" style={{ gap: 'calc(1rem * 0.99)', marginBottom: 'calc(2rem * 0.99)' }}>
          <div className="flex items-start flex-1" style={{ gap: 'calc(1rem * 0.99)' }}>
            <div
              className="rounded-2xl shadow-lg text-white"
              style={{
                background: FLEET_COLORS.gradient,
                boxShadow: `0 19.8px 39.6px ${FLEET_COLORS.focusRing}`,
                border: `1px solid ${FLEET_COLORS.primary}`,
                padding: 'calc(0.75rem * 0.99)',
              }}
            >
              <FaTruck style={{ width: 'calc(2rem * 0.99)', height: 'calc(2rem * 0.99)' }} />
            </div>
            <div>
              <p className="tracking-wider uppercase" style={{ fontSize: 'calc(0.75rem * 0.99)', color: '#E6EDF3' }}>
                Fleet Profile
              </p>
              <h1 className="font-bold" style={{ fontSize: 'calc(2.25rem * 0.99)', color: '#E6EDF3' }}>
                {truckProfile.unitNumber}
              </h1>
              <p style={{ fontSize: 'calc(0.875rem * 0.99)', color: '#8B9BB4' }}>
                Consolidated compliance + fleet health overview.
              </p>
            </div>
          </div>
          <div className="flex flex-col md:flex-row" style={{ gap: 'calc(0.75rem * 0.99)' }}>
            <select
              value={selectedUnit}
              onChange={(event) => setSelectedUnit(event.target.value)}
              className="w-full rounded-2xl font-medium shadow-lg"
              style={{
                background: "#121A2B",
                color: '#E6EDF3',
                boxShadow: `0 14.85px 29.7px ${FLEET_COLORS.focusRing}`,
                border: `1px solid ${FLEET_COLORS.primary}`,
                fontSize: 'calc(0.875rem * 0.99)',
                padding: 'calc(0.75rem * 0.99) calc(1rem * 0.99)',
                width: 'calc(12rem * 0.99)',
              }}
            >
              {trucks.map((truck) => (
                <option key={truck._id} value={truck.unitNo}>
                  {truck.unitNo}
                </option>
              ))}
            </select>
            <select
              value={dateRange}
              onChange={(event) => setDateRange(event.target.value as "30d" | "60d" | "90d")}
              className="w-full rounded-2xl font-medium shadow-lg"
              style={{
                background: "#121A2B",
                color: '#E6EDF3',
                boxShadow: `0 14.85px 29.7px ${FLEET_COLORS.focusRing}`,
                border: `1px solid ${FLEET_COLORS.primary}`,
                fontSize: 'calc(0.875rem * 0.99)',
                padding: 'calc(0.75rem * 0.99) calc(1rem * 0.99)',
                width: 'calc(12rem * 0.99)',
              }}
            >
              <option value="30d">Last 30 days</option>
              <option value="60d">Last 60 days</option>
              <option value="90d">Last 90 days</option>
            </select>
            <select
              value={driverFilter}
              onChange={(event) => setDriverFilter(event.target.value)}
              className="w-full rounded-2xl font-medium shadow-lg"
              style={{
                background: "#121A2B",
                color: '#E6EDF3',
                boxShadow: `0 14.85px 29.7px ${FLEET_COLORS.focusRing}`,
                border: `1px solid ${FLEET_COLORS.primary}`,
                fontSize: 'calc(0.875rem * 0.99)',
                padding: 'calc(0.75rem * 0.99) calc(1rem * 0.99)',
                width: 'calc(12rem * 0.99)',
              }}
            >
              <option value="all">All drivers</option>
              {truckProfile && Array.from(new Set(truckProfile.assignmentHistory.map(a => a.driver.name))).map((driverName) => (
                <option key={driverName} value={driverName}>
                  {driverName}
                </option>
              ))}
            </select>
          </div>
        </header>

        <section
          className="rounded-2xl bg-card grid grid-cols-1 lg:grid-cols-4"
          style={{
            ...sectionCardStyle,
            border: `1px solid ${FLEET_COLORS.primary}`,
            padding: 'calc(1.5rem * 0.99)',
            gap: 'calc(1.5rem * 0.99)',
            marginBottom: 'calc(2rem * 0.99)',
          }}
        >
          <div className="lg:col-span-2" style={{ gap: 'calc(0.5rem * 0.99)' }}>
            <p className="font-semibold uppercase" style={{ fontSize: 'calc(0.75rem * 0.99)', color: '#8B9BB4' }}>Vehicle</p>
            <h2 className="font-bold" style={{ fontSize: 'calc(1.5rem * 0.99)', color: '#E6EDF3', marginTop: 'calc(0.5rem * 0.99)' }}>
              {truckProfile.makeModel}
            </h2>
            <p style={{ fontSize: 'calc(0.875rem * 0.99)', color: '#8B9BB4', marginTop: 'calc(0.5rem * 0.99)' }}>
              VIN {truckProfile.vinNo} • Plate {truckProfile.licensePlate}
            </p>
            <p style={{ fontSize: 'calc(0.875rem * 0.99)', color: '#8B9BB4', marginTop: 'calc(0.5rem * 0.99)' }}>
              {truckProfile.currentDriver ? (
                <>
                  Assigned Driver:{" "}
                  <span className="font-semibold" style={{ color: '#E6EDF3' }}>
                    {truckProfile.currentDriver.name}
                  </span>
                  {truckProfile.currentDriver.phone && (
                    <> • {truckProfile.currentDriver.phone}</>
                  )}
                </>
              ) : (
                <span style={{ color: 'rgba(139,155,180,0.5)' }}>No driver assigned</span>
              )}
            </p>
            <div className="flex flex-wrap" style={{ marginTop: 'calc(1rem * 0.99)', gap: 'calc(0.75rem * 0.99)' }}>
              <span className="rounded-full font-semibold border" style={{
                fontSize: 'calc(0.75rem * 0.99)',
                padding: 'calc(0.25rem * 0.99) calc(0.75rem * 0.99)',
                backgroundColor: 'rgba(0,255,163,0.1)',
                color: '#00FFA3',
                borderColor: 'rgba(0,255,163,0.3)'
              }}>
                {truckProfile.status}
              </span>
              <span className="rounded-full font-semibold border" style={{
                fontSize: 'calc(0.75rem * 0.99)',
                padding: 'calc(0.25rem * 0.99) calc(0.75rem * 0.99)',
                backgroundColor: 'rgba(0,209,255,0.1)',
                color: '#00D1FF',
                borderColor: 'rgba(0,209,255,0.3)'
              }}>
                {truckProfile.operationStatus}
              </span>
              {truckProfile.currentAssignment && (
                <span className="rounded-full font-semibold border" style={{
                  fontSize: 'calc(0.75rem * 0.99)',
                  padding: 'calc(0.25rem * 0.99) calc(0.75rem * 0.99)',
                  backgroundColor: 'rgba(168,85,247,0.1)',
                  color: '#A78BFA',
                  borderColor: 'rgba(168,85,247,0.3)'
                }}>
                  {truckProfile.currentAssignment.type === 'load' ? 'Active Load' : 'Active Trip'}
                </span>
              )}
            </div>
          </div>
          <div className="flex flex-col lg:col-span-2 sm:flex-row" style={{ gap: 'calc(1rem * 0.99)' }}>
            <div className="flex-1 rounded-2xl bg-card" style={{
              border: `1px solid ${FLEET_COLORS.primary}40`,
              padding: 'calc(1rem * 0.99)',
            }}>
              <p className="font-semibold uppercase" style={{ fontSize: 'calc(0.75rem * 0.99)', color: '#8B9BB4' }}>
                Odometer
              </p>
              <p className="font-bold" style={{ fontSize: 'calc(1.875rem * 0.99)', color: '#E6EDF3', marginTop: 'calc(0.5rem * 0.99)' }}>
                {truckProfile.currentOdometer.toLocaleString()} km
              </p>
              <p style={{ fontSize: 'calc(0.75rem * 0.99)', color: '#8B9BB4', marginTop: 'calc(0.25rem * 0.99)' }}>Last recorded via CAN bus</p>
            </div>
            <div className="flex-1 rounded-2xl bg-card" style={{
              border: `1px solid ${FLEET_COLORS.primary}40`,
              padding: 'calc(1rem * 0.99)',
            }}>
              <p className="font-semibold uppercase" style={{ fontSize: 'calc(0.75rem * 0.99)', color: '#8B9BB4' }}>
                Utilization
              </p>
              <p className="font-bold" style={{ fontSize: 'calc(1.875rem * 0.99)', color: '#E6EDF3', marginTop: 'calc(0.5rem * 0.99)' }}>
                {truckProfile.currentAssignment ? 'Active' : 'Available'}
              </p>
              <p style={{ fontSize: 'calc(0.75rem * 0.99)', color: '#8B9BB4', marginTop: 'calc(0.25rem * 0.99)' }}>
                {truckProfile.currentAssignment
                  ? `${truckProfile.currentAssignment.type === 'load' ? 'Load' : 'Trip'}: ${truckProfile.currentAssignment.loadNumber || truckProfile.currentAssignment.tripNumber || 'N/A'}`
                  : 'No active assignment'}
              </p>
            </div>
          </div>
        </section>

        {/* Current Assignment Section */}
        {truckProfile.currentAssignment && (
          <section className="rounded-2xl bg-card" style={{
            ...sectionCardStyle,
            border: `1px solid ${FLEET_COLORS.primary}`,
            padding: 'calc(1.5rem * 0.99)',
            marginBottom: 'calc(2rem * 0.99)',
          }}>
            <div className="flex items-center text-sm" style={{
              gap: 'calc(0.75rem * 0.99)',
              color: '#8B9BB4',
              fontSize: 'calc(0.875rem * 0.99)',
              marginBottom: 'calc(1rem * 0.99)'
            }}>
              <FaRoute className="text-[#00D1FF]" />
              Current Assignment
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: 'calc(1rem * 0.99)' }}>
              <div className="rounded-lg p-3" style={{ border: `1px solid ${FLEET_COLORS.primary}30`, backgroundColor: 'rgba(255,255,255,0.04)' }}>
                <p className="uppercase" style={{ fontSize: 'calc(0.75rem * 0.99)', color: '#8B9BB4' }}>Type</p>
                <p className="font-semibold capitalize" style={{ fontSize: 'calc(1.125rem * 0.99)', color: '#E6EDF3', marginTop: 'calc(0.25rem * 0.99)' }}>
                  {truckProfile.currentAssignment.type}
                </p>
              </div>
              <div className="rounded-lg p-3" style={{ border: `1px solid ${FLEET_COLORS.primary}30`, backgroundColor: 'rgba(255,255,255,0.04)' }}>
                <p className="uppercase" style={{ fontSize: 'calc(0.75rem * 0.99)', color: '#8B9BB4' }}>
                  {truckProfile.currentAssignment.type === 'load' ? 'Load Number' : 'Trip Number'}
                </p>
                <p className="font-semibold" style={{ fontSize: 'calc(1.125rem * 0.99)', color: '#E6EDF3', marginTop: 'calc(0.25rem * 0.99)' }}>
                  {truckProfile.currentAssignment.loadNumber || truckProfile.currentAssignment.tripNumber || 'N/A'}
                </p>
              </div>
              {truckProfile.currentAssignment.type === 'load' && truckProfile.currentAssignment.route && (
                <>
                  <div className="rounded-lg p-3" style={{ border: `1px solid ${FLEET_COLORS.primary}30`, backgroundColor: 'rgba(255,255,255,0.04)' }}>
                    <p className="uppercase" style={{ fontSize: 'calc(0.75rem * 0.99)', color: '#8B9BB4' }}>Pickup</p>
                    <p className="font-medium" style={{ fontSize: 'calc(0.875rem * 0.99)', color: '#E6EDF3', marginTop: 'calc(0.25rem * 0.99)' }}>
                      {truckProfile.currentAssignment.route.pickup}
                    </p>
                  </div>
                  <div className="rounded-lg p-3" style={{ border: `1px solid ${FLEET_COLORS.primary}30`, backgroundColor: 'rgba(255,255,255,0.04)' }}>
                    <p className="uppercase" style={{ fontSize: 'calc(0.75rem * 0.99)', color: '#8B9BB4' }}>Dropoff</p>
                    <p className="font-medium" style={{ fontSize: 'calc(0.875rem * 0.99)', color: '#E6EDF3', marginTop: 'calc(0.25rem * 0.99)' }}>
                      {truckProfile.currentAssignment.route.dropoff}
                    </p>
                  </div>
                </>
              )}
              {truckProfile.currentAssignment.type === 'trip' && (
                <>
                  <div className="rounded-lg p-3" style={{ border: `1px solid ${FLEET_COLORS.primary}30`, backgroundColor: 'rgba(255,255,255,0.04)' }}>
                    <p className="uppercase" style={{ fontSize: 'calc(0.75rem * 0.99)', color: '#8B9BB4' }}>Start Location</p>
                    <p className="font-medium" style={{ fontSize: 'calc(0.875rem * 0.99)', color: '#E6EDF3', marginTop: 'calc(0.25rem * 0.99)' }}>
                      {truckProfile.currentAssignment.startLocation || 'N/A'}
                    </p>
                  </div>
                  <div className="rounded-lg p-3" style={{ border: `1px solid ${FLEET_COLORS.primary}30`, backgroundColor: 'rgba(255,255,255,0.04)' }}>
                    <p className="uppercase" style={{ fontSize: 'calc(0.75rem * 0.99)', color: '#8B9BB4' }}>End Location</p>
                    <p className="font-medium" style={{ fontSize: 'calc(0.875rem * 0.99)', color: '#E6EDF3', marginTop: 'calc(0.25rem * 0.99)' }}>
                      {truckProfile.currentAssignment.endLocation || 'N/A'}
                    </p>
                  </div>
                </>
              )}
              <div className="rounded-lg p-3" style={{ border: `1px solid ${FLEET_COLORS.primary}30`, backgroundColor: 'rgba(255,255,255,0.04)' }}>
                <p className="uppercase" style={{ fontSize: 'calc(0.75rem * 0.99)', color: '#8B9BB4' }}>Status</p>
                <span className="inline-flex items-center rounded-full font-semibold border" style={{
                  padding: 'calc(0.25rem * 0.99) calc(0.75rem * 0.99)',
                  fontSize: 'calc(0.75rem * 0.99)',
                  marginTop: 'calc(0.25rem * 0.99)',
                  ...(truckProfile.currentAssignment.status === 'completed' || truckProfile.currentAssignment.status === 'delivered'
                    ? { backgroundColor: 'rgba(0,255,163,0.1)', color: '#00FFA3', borderColor: 'rgba(0,255,163,0.3)' }
                    : { backgroundColor: 'rgba(0,209,255,0.1)', color: '#00D1FF', borderColor: 'rgba(0,209,255,0.3)' })
                }}>
                  {truckProfile.currentAssignment.status}
                </span>
              </div>
              {truckProfile.currentAssignment.assignedAt && (
                <div className="rounded-lg p-3" style={{ border: `1px solid ${FLEET_COLORS.primary}30`, backgroundColor: 'rgba(255,255,255,0.04)' }}>
                  <p className="uppercase" style={{ fontSize: 'calc(0.75rem * 0.99)', color: '#8B9BB4' }}>Assigned At</p>
                  <p className="font-medium" style={{ fontSize: 'calc(0.875rem * 0.99)', color: '#E6EDF3', marginTop: 'calc(0.25rem * 0.99)' }}>
                    {new Date(truckProfile.currentAssignment.assignedAt).toLocaleString()}
                  </p>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Assignment History Section */}
        <section className="rounded-2xl bg-card" style={{
          ...sectionCardStyle,
          border: `1px solid ${FLEET_COLORS.primary}`,
          padding: 'calc(1.5rem * 0.99)',
          marginBottom: 'calc(2rem * 0.99)',
        }}>
          <div className="flex items-center text-sm" style={{
            gap: 'calc(0.75rem * 0.99)',
            color: '#8B9BB4',
            fontSize: 'calc(0.875rem * 0.99)',
            marginBottom: 'calc(1rem * 0.99)'
          }}>
            <FaUser className="text-[#A78BFA]" />
            Assignment History
          </div>
          {filteredAssignmentHistory.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm" style={{
                borderCollapse: 'separate',
                borderSpacing: 0,
                fontSize: 'calc(0.875rem * 0.99)'
              }}>
                <thead className="uppercase" style={{ fontSize: 'calc(0.75rem * 0.99)', color: '#8B9BB4', background: 'rgba(0,209,255,0.04)' }}>
                  <tr>
                    <th className="text-left" style={{
                      padding: 'calc(0.5rem * 0.99) calc(0.75rem * 0.99)',
                      borderBottom: `1px solid ${FLEET_COLORS.primary}40`
                    }}>Date</th>
                    <th className="text-left" style={{
                      padding: 'calc(0.5rem * 0.99) calc(0.75rem * 0.99)',
                      borderBottom: `1px solid ${FLEET_COLORS.primary}40`
                    }}>Type</th>
                    <th className="text-left" style={{
                      padding: 'calc(0.5rem * 0.99) calc(0.75rem * 0.99)',
                      borderBottom: `1px solid ${FLEET_COLORS.primary}40`
                    }}>Driver</th>
                    <th className="text-left" style={{
                      padding: 'calc(0.5rem * 0.99) calc(0.75rem * 0.99)',
                      borderBottom: `1px solid ${FLEET_COLORS.primary}40`
                    }}>Load/Trip #</th>
                    <th className="text-left" style={{
                      padding: 'calc(0.5rem * 0.99) calc(0.75rem * 0.99)',
                      borderBottom: `1px solid ${FLEET_COLORS.primary}40`
                    }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAssignmentHistory.map((assignment) => (
                    <tr key={`${assignment.type}-${assignment.id}`} style={{
                      color: '#E6EDF3',
                      borderBottom: `1px solid ${FLEET_COLORS.primary}20`
                    }} className="hover:bg-[rgba(255,255,255,0.03)]">
                      <td style={{ padding: 'calc(0.5rem * 0.99) calc(0.75rem * 0.99)' }}>
                        {assignment.assignedAt
                          ? new Date(assignment.assignedAt).toLocaleDateString()
                          : assignment.actualStartDate
                            ? new Date(assignment.actualStartDate).toLocaleDateString()
                            : 'N/A'}
                      </td>
                      <td style={{ padding: 'calc(0.5rem * 0.99) calc(0.75rem * 0.99)' }}>
                        <span className="capitalize">{assignment.type}</span>
                      </td>
                      <td style={{ padding: 'calc(0.5rem * 0.99) calc(0.75rem * 0.99)' }}>
                        <div>
                          <p className="font-semibold">{assignment.driver.name}</p>
                          {assignment.driver.phone && (
                            <p style={{ fontSize: 'calc(0.75rem * 0.99)', color: '#8B9BB4' }}>{assignment.driver.phone}</p>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: 'calc(0.5rem * 0.99) calc(0.75rem * 0.99)' }}>
                        {assignment.loadNumber || assignment.tripNumber || 'N/A'}
                      </td>
                      <td style={{ padding: 'calc(0.5rem * 0.99) calc(0.75rem * 0.99)' }}>
                        <span className="inline-flex items-center rounded-full font-semibold border" style={{
                          padding: 'calc(0.25rem * 0.99) calc(0.5rem * 0.99)',
                          fontSize: 'calc(0.75rem * 0.99)',
                          ...(assignment.status === 'completed' || assignment.status === 'delivered'
                            ? { backgroundColor: 'rgba(0,255,163,0.1)', color: '#00FFA3', borderColor: 'rgba(0,255,163,0.3)' }
                            : assignment.status === 'in-progress' || assignment.status === 'in-delivery'
                              ? { backgroundColor: 'rgba(0,209,255,0.1)', color: '#00D1FF', borderColor: 'rgba(0,209,255,0.3)' }
                              : { backgroundColor: 'rgba(255,255,255,0.06)', color: '#8B9BB4', borderColor: 'rgba(255,255,255,0.1)' })
                        }}>
                          {assignment.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p style={{ color: '#8B9BB4', textAlign: 'center', padding: 'calc(2rem * 0.99) 0', fontSize: 'calc(0.875rem * 0.99)' }}>No assignment history found.</p>
          )}
        </section>

        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4" style={{ gap: 'calc(1rem * 0.99)', marginBottom: 'calc(2rem * 0.99)' }}>
          <div className="rounded-2xl bg-card" style={{
            ...sectionCardStyle,
            border: `1px solid ${FLEET_COLORS.primary}`,
            padding: 'calc(1.25rem * 0.99)',
          }}>
            <div className="flex items-center text-sm" style={{
              gap: 'calc(0.75rem * 0.99)',
              color: '#8B9BB4',
              fontSize: 'calc(0.875rem * 0.99)'
            }}>
              <FaShieldAlt className="text-[#00FFA3]" />
              CVSA Snapshot
            </div>
            <p className="font-semibold" style={{
              marginTop: 'calc(0.5rem * 0.99)',
              fontSize: 'calc(0.875rem * 0.99)',
              color: '#E6EDF3'
            }}>
              {compliance.cvsa.lastInspection}
            </p>
            <p style={{
              fontSize: 'calc(0.75rem * 0.99)',
              color: '#8B9BB4',
              marginBottom: 'calc(0.5rem * 0.99)'
            }}>
              Result:{" "}
              <span className="font-semibold" style={{
                color: compliance.cvsa.result === 'Pass' ? '#00FFA3' :
                  compliance.cvsa.result === 'Fail' ? '#F87171' :
                    '#FCD34D'
              }}>
                {compliance.cvsa.result}
              </span>
            </p>
            {compliance.cvsa.violations.length > 0 ? (
              <ul className="list-disc list-inside" style={{
                fontSize: 'calc(0.75rem * 0.99)',
                color: '#8B9BB4',
                gap: 'calc(0.25rem * 0.99)'
              }}>
                {compliance.cvsa.violations.map((item, idx) => (
                  <li key={idx} style={{ marginTop: 'calc(0.25rem * 0.99)' }}>{item}</li>
                ))}
              </ul>
            ) : (
              <p style={{ fontSize: 'calc(0.75rem * 0.99)', color: 'rgba(139,155,180,0.5)' }}>No violations</p>
            )}
            <p style={{
              fontSize: 'calc(0.75rem * 0.99)',
              color: 'rgba(139,155,180,0.5)',
              marginTop: 'calc(0.75rem * 0.99)'
            }}>Officer {compliance.cvsa.officer}</p>
          </div>

          <div className="rounded-2xl bg-card" style={{
            ...sectionCardStyle,
            border: `1px solid ${FLEET_COLORS.primary}`,
            padding: 'calc(1.25rem * 0.99)',
            gap: 'calc(0.75rem * 0.99)'
          }}>
            <div className="flex items-center text-sm" style={{
              gap: 'calc(0.75rem * 0.99)',
              color: '#8B9BB4',
              fontSize: 'calc(0.875rem * 0.99)',
              marginBottom: 'calc(0.75rem * 0.99)'
            }}>
              <FaTicketAlt className="text-[#FCD34D]" />
              Tickets
            </div>
            {compliance.tickets.length > 0 ? (
              compliance.tickets.map((ticket) => (
                <div key={ticket.id} className="rounded-xl bg-card" style={{
                  padding: 'calc(0.75rem * 0.99)',
                  fontSize: 'calc(0.75rem * 0.99)',
                  color: '#E6EDF3',
                  border: '1px solid rgba(245,158,11,0.25)',
                  marginBottom: 'calc(0.75rem * 0.99)'
                }}>
                  <div className="flex justify-between">
                    <span className="font-semibold">{ticket.category}</span>
                    <span style={{
                      color: ticket.status === 'Paid' ? '#00FFA3' :
                        ticket.status === 'Contested' ? '#00D1FF' :
                          '#F87171'
                    }}>
                      {ticket.status}
                    </span>
                  </div>
                  <div className="flex justify-between" style={{ color: '#8B9BB4', marginTop: 'calc(0.25rem * 0.99)' }}>
                    <span>{ticket.issued}</span>
                    <span>${ticket.amount}</span>
                  </div>
                </div>
              ))
            ) : (
              <p style={{ fontSize: 'calc(0.75rem * 0.99)', color: 'rgba(139,155,180,0.5)' }}>No tickets</p>
            )}
          </div>

          <div className="rounded-2xl bg-card" style={{
            ...sectionCardStyle,
            border: `1px solid ${FLEET_COLORS.primary}`,
            padding: 'calc(1.25rem * 0.99)',
            gap: 'calc(0.75rem * 0.99)'
          }}>
            <div className="flex items-center text-sm" style={{
              gap: 'calc(0.75rem * 0.99)',
              color: '#8B9BB4',
              fontSize: 'calc(0.875rem * 0.99)',
              marginBottom: 'calc(0.75rem * 0.99)'
            }}>
              <FaExclamationTriangle className="text-[#F87171]" />
              Incidents
            </div>
            {compliance.incidents.length > 0 ? (
              compliance.incidents.map((incident) => (
                <div key={incident.id} className="rounded-xl bg-card" style={{
                  padding: 'calc(0.75rem * 0.99)',
                  fontSize: 'calc(0.75rem * 0.99)',
                  color: '#E6EDF3',
                  border: '1px solid rgba(239,68,68,0.25)',
                  marginBottom: 'calc(0.75rem * 0.99)'
                }}>
                  <div className="flex justify-between font-semibold">
                    <span>{incident.type}</span>
                    <span style={{
                      color: incident.severity === 'Low' ? '#00FFA3' :
                        incident.severity === 'Medium' ? '#FCD34D' :
                          '#F87171'
                    }}>
                      {incident.severity}
                    </span>
                  </div>
                  <p style={{ color: '#8B9BB4', marginTop: 'calc(0.25rem * 0.99)' }}>{incident.date}</p>
                  <p style={{ color: '#8B9BB4', marginTop: 'calc(0.25rem * 0.99)' }}>{incident.resolution}</p>
                </div>
              ))
            ) : (
              <p style={{ fontSize: 'calc(0.75rem * 0.99)', color: 'rgba(139,155,180,0.5)' }}>No incidents</p>
            )}
          </div>

          <div className="rounded-2xl bg-card" style={{
            ...sectionCardStyle,
            border: `1px solid ${FLEET_COLORS.primary}`,
            padding: 'calc(1.25rem * 0.99)',
            gap: 'calc(0.75rem * 0.99)'
          }}>
            <div className="flex items-center text-sm" style={{
              gap: 'calc(0.75rem * 0.99)',
              color: '#8B9BB4',
              fontSize: 'calc(0.875rem * 0.99)',
              marginBottom: 'calc(0.75rem * 0.99)'
            }}>
              <FaExclamationTriangle className="text-[#F59E0B]" />
              Accidents
            </div>
            {compliance.accidents.length > 0 ? (
              compliance.accidents.map((accident) => (
                <div key={accident.id} className="rounded-xl bg-card" style={{
                  padding: 'calc(0.75rem * 0.99)',
                  fontSize: 'calc(0.75rem * 0.99)',
                  color: '#E6EDF3',
                  border: '1px solid rgba(249,115,22,0.25)',
                  marginBottom: 'calc(0.75rem * 0.99)'
                }}>
                  <div className="flex justify-between font-semibold">
                    <span>{accident.type}</span>
                    <span style={{
                      color: accident.severity === 'Low' ? '#00FFA3' :
                        accident.severity === 'Medium' ? '#FCD34D' :
                          '#F87171'
                    }}>
                      {accident.severity}
                    </span>
                  </div>
                  <p style={{ color: '#8B9BB4', marginTop: 'calc(0.25rem * 0.99)' }}>{accident.date}</p>
                  <p style={{ color: '#8B9BB4', marginTop: 'calc(0.25rem * 0.99)' }}>{accident.resolution}</p>
                </div>
              ))
            ) : (
              <p style={{ fontSize: 'calc(0.75rem * 0.99)', color: 'rgba(139,155,180,0.5)' }}>No accidents</p>
            )}
          </div>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-2" style={{ gap: 'calc(1rem * 0.99)', marginBottom: 'calc(2rem * 0.99)' }}>
          <div className="rounded-2xl bg-card" style={{
            ...sectionCardStyle,
            border: `1px solid ${FLEET_COLORS.primary}`,
            padding: 'calc(1.25rem * 0.99)',
            gap: 'calc(1rem * 0.99)'
          }}>
            <div className="flex items-center text-sm" style={{
              gap: 'calc(0.75rem * 0.99)',
              color: '#8B9BB4',
              fontSize: 'calc(0.875rem * 0.99)',
              marginBottom: 'calc(1rem * 0.99)'
            }}>
              <FaClipboardCheck className="text-[#00D1FF]" />
              Service log with prices
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm" style={{
                borderCollapse: 'separate',
                borderSpacing: 0,
                fontSize: 'calc(0.875rem * 0.99)'
              }}>
                <thead className="uppercase" style={{ fontSize: 'calc(0.75rem * 0.99)', color: '#8B9BB4', background: 'rgba(0,209,255,0.04)' }}>
                  <tr>
                    <th className="text-left" style={{
                      padding: 'calc(0.5rem * 0.99) calc(0.75rem * 0.99)',
                      borderBottom: `1px solid ${FLEET_COLORS.primary}40`
                    }}>Date</th>
                    <th className="text-left" style={{
                      padding: 'calc(0.5rem * 0.99) calc(0.75rem * 0.99)',
                      borderBottom: `1px solid ${FLEET_COLORS.primary}40`
                    }}>Vendor</th>
                    <th className="text-left" style={{
                      padding: 'calc(0.5rem * 0.99) calc(0.75rem * 0.99)',
                      borderBottom: `1px solid ${FLEET_COLORS.primary}40`
                    }}>Description</th>
                    <th className="text-left" style={{
                      padding: 'calc(0.5rem * 0.99) calc(0.75rem * 0.99)',
                      borderBottom: `1px solid ${FLEET_COLORS.primary}40`
                    }}>Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {fleet.serviceLogs.length > 0 ? (
                    fleet.serviceLogs.map((service) => (
                      <tr key={service.id} style={{
                        color: '#E6EDF3',
                        borderBottom: `1px solid ${FLEET_COLORS.primary}20`
                      }}>
                        <td style={{ padding: 'calc(0.5rem * 0.99) calc(0.75rem * 0.99)' }}>{service.date}</td>
                        <td style={{ padding: 'calc(0.5rem * 0.99) calc(0.75rem * 0.99)' }}>{service.vendor}</td>
                        <td style={{ padding: 'calc(0.5rem * 0.99) calc(0.75rem * 0.99)' }}>{service.description}</td>
                        <td style={{ padding: 'calc(0.5rem * 0.99) calc(0.75rem * 0.99)' }} className="font-semibold">${service.cost}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} style={{
                        padding: 'calc(1rem * 0.99) calc(0.75rem * 0.99)',
                        textAlign: 'center',
                        color: '#8B9BB4',
                        fontSize: 'calc(0.875rem * 0.99)'
                      }}>
                        No service logs found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-2xl bg-card" style={{
            ...sectionCardStyle,
            border: `1px solid ${FLEET_COLORS.primary}`,
            padding: 'calc(1.25rem * 0.99)',
            gap: 'calc(1rem * 0.99)'
          }}>
            <div className="flex items-center text-sm" style={{
              gap: 'calc(0.75rem * 0.99)',
              color: '#8B9BB4',
              fontSize: 'calc(0.875rem * 0.99)',
              marginBottom: 'calc(1rem * 0.99)'
            }}>
              <FaWrench className="text-[#A78BFA]" />
              Issues & repairs
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm" style={{
                borderCollapse: 'separate',
                borderSpacing: 0,
                fontSize: 'calc(0.875rem * 0.99)'
              }}>
                <thead className="uppercase" style={{ fontSize: 'calc(0.75rem * 0.99)', color: '#8B9BB4', background: 'rgba(0,209,255,0.04)' }}>
                  <tr>
                    <th className="text-left" style={{
                      padding: 'calc(0.5rem * 0.99) calc(0.75rem * 0.99)',
                      borderBottom: `1px solid ${FLEET_COLORS.primary}40`
                    }}>Date</th>
                    <th className="text-left" style={{
                      padding: 'calc(0.5rem * 0.99) calc(0.75rem * 0.99)',
                      borderBottom: `1px solid ${FLEET_COLORS.primary}40`
                    }}>Issue</th>
                    <th className="text-left" style={{
                      padding: 'calc(0.5rem * 0.99) calc(0.75rem * 0.99)',
                      borderBottom: `1px solid ${FLEET_COLORS.primary}40`
                    }}>Resolution</th>
                    <th className="text-left" style={{
                      padding: 'calc(0.5rem * 0.99) calc(0.75rem * 0.99)',
                      borderBottom: `1px solid ${FLEET_COLORS.primary}40`
                    }}>Downtime</th>
                  </tr>
                </thead>
                <tbody>
                  {fleet.repairs.length > 0 ? (
                    fleet.repairs.map((repair) => (
                      <tr key={repair.id} style={{
                        color: '#E6EDF3',
                        borderBottom: `1px solid ${FLEET_COLORS.primary}20`
                      }}>
                        <td style={{ padding: 'calc(0.5rem * 0.99) calc(0.75rem * 0.99)' }}>{repair.date}</td>
                        <td style={{ padding: 'calc(0.5rem * 0.99) calc(0.75rem * 0.99)' }}>{repair.issue}</td>
                        <td style={{ padding: 'calc(0.5rem * 0.99) calc(0.75rem * 0.99)' }}>{repair.resolution}</td>
                        <td style={{ padding: 'calc(0.5rem * 0.99) calc(0.75rem * 0.99)' }}>{repair.downtimeHours} hrs</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} style={{
                        padding: 'calc(1rem * 0.99) calc(0.75rem * 0.99)',
                        textAlign: 'center',
                        color: '#8B9BB4',
                        fontSize: 'calc(0.875rem * 0.99)'
                      }}>
                        No repairs found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-2" style={{ gap: 'calc(1rem * 0.99)' }}>
          <div className="rounded-2xl bg-card" style={{
            ...sectionCardStyle,
            border: `1px solid ${FLEET_COLORS.primary}`,
            padding: 'calc(1.25rem * 0.99)',
            gap: 'calc(1rem * 0.99)'
          }}>
            <div className="flex items-center text-sm" style={{
              gap: 'calc(0.75rem * 0.99)',
              color: '#8B9BB4',
              fontSize: 'calc(0.875rem * 0.99)',
              marginBottom: 'calc(1rem * 0.99)'
            }}>
              <FaBoxes className="text-[#818CF8]" />
              Spare parts usage
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm" style={{
                borderCollapse: 'separate',
                borderSpacing: 0,
                fontSize: 'calc(0.875rem * 0.99)'
              }}>
                <thead className="uppercase" style={{ fontSize: 'calc(0.75rem * 0.99)', color: '#8B9BB4', background: 'rgba(0,209,255,0.04)' }}>
                  <tr>
                    <th className="text-left" style={{
                      padding: 'calc(0.5rem * 0.99) calc(0.75rem * 0.99)',
                      borderBottom: `1px solid ${FLEET_COLORS.primary}40`
                    }}>Part</th>
                    <th className="text-left" style={{
                      padding: 'calc(0.5rem * 0.99) calc(0.75rem * 0.99)',
                      borderBottom: `1px solid ${FLEET_COLORS.primary}40`
                    }}>Qty</th>
                    <th className="text-left" style={{
                      padding: 'calc(0.5rem * 0.99) calc(0.75rem * 0.99)',
                      borderBottom: `1px solid ${FLEET_COLORS.primary}40`
                    }}>Cost</th>
                    <th className="text-left" style={{
                      padding: 'calc(0.5rem * 0.99) calc(0.75rem * 0.99)',
                      borderBottom: `1px solid ${FLEET_COLORS.primary}40`
                    }}>Reference</th>
                  </tr>
                </thead>
                <tbody>
                  {fleet.spareParts.length > 0 ? (
                    fleet.spareParts.map((part) => (
                      <tr key={`${part.reference}-${part.partName}`} style={{
                        color: '#E6EDF3',
                        borderBottom: `1px solid ${FLEET_COLORS.primary}20`
                      }}>
                        <td style={{ padding: 'calc(0.5rem * 0.99) calc(0.75rem * 0.99)' }} className="font-semibold">{part.partName}</td>
                        <td style={{ padding: 'calc(0.5rem * 0.99) calc(0.75rem * 0.99)' }}>{part.quantity}</td>
                        <td style={{ padding: 'calc(0.5rem * 0.99) calc(0.75rem * 0.99)' }}>${part.cost.toFixed(2)}</td>
                        <td style={{ padding: 'calc(0.5rem * 0.99) calc(0.75rem * 0.99)', fontSize: 'calc(0.75rem * 0.99)', color: '#8B9BB4' }}>{part.reference}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} style={{
                        padding: 'calc(1rem * 0.99) calc(0.75rem * 0.99)',
                        textAlign: 'center',
                        color: '#8B9BB4',
                        fontSize: 'calc(0.875rem * 0.99)'
                      }}>
                        No spare parts usage found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </section>

      </div>
    </div>
  );
};

export default TruckProfile;

