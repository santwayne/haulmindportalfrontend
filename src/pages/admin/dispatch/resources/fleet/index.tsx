import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { listFleetUnits } from "../../../../../axios/api/fleet.units";
import { listOrder } from "../../../../../axios/api/distapcher";
import { Search, X, CheckCircle, AlertCircle, Truck, MapPin } from "lucide-react";


interface FleetUnit {
  _id?: string;
  unitNo?: string;
  unitType?: string;
  makeModel?: string;
  make?: string;
  model?: string;
  vinNo?: string;
  licensePlate?: string;
  year?: string | number;
  currentOdometer?: string | number;
  capacity?: string;
  status?: string;
  reason?: string;
  type?: string;
}

interface UnitAssignmentSummary {
  orderId: string;
  orderNumber?: string;
  customerOrderNo?: string;
  tripNo?: string;
  driverName?: string;
  status?: string;
  route?: string;
  pickupDate?: string;
  deliveryDate?: string;
}

interface UnitAssignmentInsight {
  activeOrders: UnitAssignmentSummary[];
  pastOrders: UnitAssignmentSummary[];
  pairedUnits: string[];
}

interface UnitLoadStats {
  totalLoads: number;
  pendingLoads: number;
}

const formatNumber = (value?: string | number | null) => {
  if (value === null || value === undefined || value === "") return "—";
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric)) return String(value);
  return numeric.toLocaleString();
};

const formatStatusBadge = (status?: string) => {
  const normalized = (status || "").toLowerCase();
  if (normalized === "active") {
    return "bg-[var(--accent-green)]/10 text-[var(--accent-green)]";
  }
  if (normalized === "inactive") {
    return "bg-[var(--accent-purple)]/10 text-[var(--accent-purple)]";
  }
  return "bg-card border border-theme text-secondary";
};

const normalizeAddress = (value: string) => value?.replace(/\s+/g, " ").trim() || "";

const extractLocationString = (location: any): string => {
  if (!location) return "";
  if (typeof location === "string") return normalizeAddress(location);
  if (typeof location !== "object") return "";
  if (location.place) return normalizeAddress(location.place);
  if (location.placeId) {
    const place = location.placeId;
    if (typeof place === "string") return normalizeAddress(place);
    if (place?.currentLocation?.address) return normalizeAddress(place.currentLocation.address);
    if (place?.name) return normalizeAddress(place.name);
  }
  if (location.currentLocation?.address) return normalizeAddress(location.currentLocation.address);
  if (location.address) return normalizeAddress(location.address);
  if (location.name) return normalizeAddress(location.name);
  return "";
};

const truncateText = (value: string, max: number = 40) => {
  if (!value) return "";
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
};

const formatOrderRoute = (order: any) => {
  if (!order) return "Route pending";
  const pickup = normalizeAddress(extractLocationString(order.pickupLocation) || "Origin");
  const dropoff = normalizeAddress(extractLocationString(order.deliveryLocation) || "Destination");
  return `${truncateText(pickup)} → ${truncateText(dropoff)}`;
};

const normalizeKey = (type: "truck" | "trailer", value?: string | number | null) => {
  if (value === null || value === undefined) return null;
  return `${type}:${String(value).trim().toLowerCase()}`;
};

const buildUnitAssignments = (orders: any[]) => {
  const map: Record<string, UnitAssignmentInsight> = {};
  const ensure = (key: string) => {
    if (!map[key]) {
      map[key] = { activeOrders: [], pastOrders: [], pairedUnits: [] };
    }
    return map[key];
  };

  orders.forEach((order) => {
    const summary: UnitAssignmentSummary = {
      orderId: order._id,
      orderNumber: order.orderNumber,
      customerOrderNo: order.customerOrderNo,
      tripNo: order.tripNo,
      driverName: order.driver?.name,
      status: order.status,
      route: formatOrderRoute(order),
      pickupDate: order.pickupDate,
      deliveryDate: order.deliveryDate
    };

    // Get truck identifiers - check various possible fields
    const truckObj = order.truck;
    const truckIdentifiers = [
      normalizeKey("truck", truckObj?._id),
      normalizeKey("truck", truckObj?.unitNo),
      normalizeKey("truck", truckObj?.internalId),
      normalizeKey("truck", truckObj?.licensePlate),
      normalizeKey("truck", truckObj?.plateNumber),
      normalizeKey("truck", truckObj?.unitNumber)
    ].filter(Boolean) as string[];

    // Get trailer identifiers - check various possible fields
    const trailerObj = order.trailer;
    const trailerIdentifiers = [
      normalizeKey("trailer", trailerObj?._id),
      normalizeKey("trailer", trailerObj?.unitNo),
      normalizeKey("trailer", trailerObj?.licensePlate),
      normalizeKey("trailer", trailerObj?.plateNumber),
      normalizeKey("trailer", trailerObj?.trailerNumber),
      normalizeKey("trailer", trailerObj?.unitNumber)
    ].filter(Boolean) as string[];

    const trailerLabel = trailerObj?.unitNo || trailerObj?.licensePlate || trailerObj?.plateNumber || trailerObj?.trailerNumber || trailerObj?.makeModel;
    const truckLabel = truckObj?.unitNo || truckObj?.licensePlate || truckObj?.plateNumber || truckObj?.internalId || truckObj?.makeModel;

    truckIdentifiers.forEach((key) => {
      const store = ensure(key);
      const isCompleted = (order.status || "").toUpperCase() === "COMPLETED" || (order.status || "").toLowerCase() === "completed";
      if (isCompleted) {
        store.pastOrders.push(summary);
      } else {
        store.activeOrders.push(summary);
      }
      if (trailerLabel && !store.pairedUnits.includes(trailerLabel)) {
        store.pairedUnits.push(trailerLabel);
      }
    });

    trailerIdentifiers.forEach((key) => {
      const store = ensure(key);
      const isCompleted = (order.status || "").toUpperCase() === "COMPLETED" || (order.status || "").toLowerCase() === "completed";
      if (isCompleted) {
        store.pastOrders.push(summary);
      } else {
        store.activeOrders.push(summary);
      }
      if (truckLabel && !store.pairedUnits.includes(truckLabel)) {
        store.pairedUnits.push(truckLabel);
      }
    });
  });

  return map;
};

const buildUnitLoadStats = (orders: any[]) => {
  const map: Record<string, UnitLoadStats> = {};
  orders.forEach((order) => {
    const loadStatus = (order?.status || "").toUpperCase();
    const isCompleted = loadStatus === "COMPLETED";

    // Get truck identifiers from order.truck object
    const truckObj = order?.truck;
    const truckKeys = [
      normalizeKey("truck", truckObj?._id),
      normalizeKey("truck", truckObj?.unitNo),
      normalizeKey("truck", truckObj?.internalId),
      normalizeKey("truck", truckObj?.licensePlate),
      normalizeKey("truck", truckObj?.plateNumber),
      normalizeKey("truck", truckObj?.unitNumber),
      normalizeKey("truck", order?.truckNo),
      normalizeKey("truck", order?.truckNumber),
      normalizeKey("truck", order?.truckId)
    ].filter(Boolean) as string[];

    // Get trailer identifiers from order.trailer object
    const trailerObj = order?.trailer;
    const trailerKeys = [
      normalizeKey("trailer", trailerObj?._id),
      normalizeKey("trailer", trailerObj?.unitNo),
      normalizeKey("trailer", trailerObj?.licensePlate),
      normalizeKey("trailer", trailerObj?.plateNumber),
      normalizeKey("trailer", trailerObj?.trailerNumber),
      normalizeKey("trailer", trailerObj?.unitNumber),
      normalizeKey("trailer", order?.trailerNo),
      normalizeKey("trailer", order?.trailerNumber),
      normalizeKey("trailer", order?.trailerId)
    ].filter(Boolean) as string[];

    [...truckKeys, ...trailerKeys].forEach((key) => {
      if (!key) return;
      if (!map[key]) {
        map[key] = { totalLoads: 0, pendingLoads: 0 };
      }
      map[key].totalLoads += 1;
      if (!isCompleted) {
        map[key].pendingLoads += 1;
      }
    });
  });
  return map;
};

const getUnitIdentifiers = (unit: FleetUnit, type: "truck" | "trailer") => {
  return [
    normalizeKey(type, unit._id),
    normalizeKey(type, unit.unitNo),
    normalizeKey(type, unit.licensePlate),
    normalizeKey(type, unit.vinNo)
  ].filter(Boolean) as string[];
};


const Index = () => {
  const [fleetTab, setFleetTab] = useState<"trucks" | "trailers">("trucks");
  const [fleetUnitsLoading, setFleetUnitsLoading] = useState(false);
  const [fleetUnits, setFleetUnits] = useState<{ trucks: FleetUnit[]; trailers: FleetUnit[] }>({
    trucks: [],
    trailers: [],
  });
  const [fleetError, setFleetError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [unitAssignments, setUnitAssignments] = useState<Record<string, UnitAssignmentInsight>>({});
  const [unitLoadStats, setUnitLoadStats] = useState<Record<string, UnitLoadStats>>({});
  const [previewUnitId, setPreviewUnitId] = useState<string | null>(null);
  const [selectedUnit, setSelectedUnit] = useState<FleetUnit | null>(null);
  const [showUnitDetails, setShowUnitDetails] = useState(false);

  // Refs for scrollbar synchronization
  const topScrollRef = useRef<HTMLDivElement>(null);
  const bottomScrollRef = useRef<HTMLDivElement>(null);

  const loadFleetUnits = useCallback(async () => {
    try {
      setFleetUnitsLoading(true);
      setFleetError(null);
      const [truckRes, trailerRes] = await Promise.all([
        listFleetUnits({ category: "trucks" }),
        listFleetUnits({ category: "trailers" }),
      ]);

      const parseUnits = (res: any) => {
        if (!res?.success) return [];
        const payload = res.data ?? res.data?.data;
        if (Array.isArray(payload)) return payload;
        if (Array.isArray(res.data?.data)) return res.data.data;
        return res.data?.units || [];
      };

      setFleetUnits({
        trucks: parseUnits(truckRes),
        trailers: parseUnits(trailerRes),
      });
    } catch (error: any) {
      console.error("Error fetching fleet units:", error);
      setFleetError(error?.response?.data?.message || "Unable to load fleet units");
      setFleetUnits({ trucks: [], trailers: [] });
    } finally {
      setFleetUnitsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFleetUnits();
  }, [loadFleetUnits]);

  const fetchFleetInsights = useCallback(async () => {
    try {
      const orderRes = await listOrder({ page: 1, limit: 500 });
      const orderPayload = Array.isArray(orderRes?.data)
        ? orderRes.data
        : Array.isArray(orderRes?.data?.data)
          ? orderRes.data.data
          : [];
      if (orderRes?.success && Array.isArray(orderPayload)) {
        setUnitAssignments(buildUnitAssignments(orderPayload));
        setUnitLoadStats(buildUnitLoadStats(orderPayload));
      } else {
        setUnitAssignments({});
        setUnitLoadStats({});
      }
    } catch (error) {
      console.error("Error building fleet insights:", error);
      setUnitAssignments({});
      setUnitLoadStats({});
    }
  }, []);

  useEffect(() => {
    fetchFleetInsights();
  }, [fetchFleetInsights]);

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
  }, [fleetUnits, fleetTab, searchTerm, statusFilter]);

  const visibleFleetUnits = useMemo(() => fleetUnits[fleetTab] || [], [fleetUnits, fleetTab]);

  const getAssignmentForUnit = useCallback(
    (unit: FleetUnit) => {
      const type = fleetTab === "trucks" ? "truck" : "trailer";
      const identifiers = getUnitIdentifiers(unit, type);
      for (const id of identifiers) {
        if (unitAssignments[id]) {
          return unitAssignments[id];
        }
      }
      return undefined;
    },
    [fleetTab, unitAssignments]
  );

  const getLoadStatsForUnit = useCallback(
    (unit: FleetUnit) => {
      const type = fleetTab === "trucks" ? "truck" : "trailer";
      const identifiers = getUnitIdentifiers(unit, type);
      for (const id of identifiers) {
        if (unitLoadStats[id]) {
          return unitLoadStats[id];
        }
      }
      return undefined;
    },
    [fleetTab, unitLoadStats]
  );

  const filteredUnits = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return visibleFleetUnits.filter((unit) => {
      const matchesSearch =
        !query ||
        [unit.unitNo, unit.licensePlate, unit.makeModel, unit.make, unit.model, unit.vinNo]
          .filter(Boolean)
          .some((value) => value!.toString().toLowerCase().includes(query));
      const matchesStatus =
        statusFilter === "all" || (unit.status || "").toLowerCase() === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [visibleFleetUnits, searchTerm, statusFilter]);

  const summary = useMemo(() => {
    const total = visibleFleetUnits.length;
    const active = visibleFleetUnits.filter(
      (unit) => (unit.status || "").toLowerCase() === "active"
    ).length;
    const standby = total - active;
    return { total, active, standby };
  }, [visibleFleetUnits]);

  const assignmentSnapshot = useMemo(() => {
    let unitsWithActiveOrders = 0;
    let availableUnits = 0;
    visibleFleetUnits.forEach((unit) => {
      const type = fleetTab === "trucks" ? "truck" : "trailer";
      const identifiers = getUnitIdentifiers(unit, type);
      const assignment = identifiers
        .map((id) => unitAssignments[id])
        .find(Boolean);
      if (assignment?.activeOrders.length) {
        unitsWithActiveOrders += 1;
      } else {
        availableUnits += 1;
      }
    });
    return { unitsWithActiveOrders, availableUnits };
  }, [visibleFleetUnits, fleetTab, unitAssignments]);

  return (
    <div className="min-h-screen bg-main p-6 ">
      <div className="w-full mx-auto space-y-6">
        <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase text-secondary">Dispatch Fleet</p>
            <h1 className="text-3xl font-bold text-[var(--accent-navyblue)]">Fleet Units</h1>
            <p className="text-sm text-secondary">
              View the same truck and trailer roster configured inside Fleet Maintenance.
            </p>
          </div>
          <div className="flex items-center gap-2 bg-card border border-theme rounded-2xl p-1 w-fit">
            {(["trucks", "trailers"] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => {
                  setFleetTab(tab);
                  setSearchTerm("");
                  setStatusFilter("all");
                }}
                className={`px-4 py-2 text-sm font-semibold rounded-2xl transition-colors ${fleetTab === tab ? "bg-card !text-[var(--accent-navyblue)] shadow" : "text-secondary"
                  }`}
              >
                {tab === "trucks" ? "Trucks" : "Trailers"}
              </button>
            ))}
          </div>
        </header>

        <section className="grid grid-cols-1 gap-2 md:grid-cols-3">
          {/* Total Units – Pastel Orange */}
          <div className="rounded-lg p-3 shadow-sm bg-card">
            <p className="text-[10px] font-semibold uppercase text-[var(--accent-orange)]">
              Total Units
            </p>
            <p className="text-xl font-semibold mt-0.5 text-[var(--accent-orange)]">
              {summary.total}
            </p>
            <p className="text-[11px] text-orange-500">
              {fleetTab === "trucks" ? "Primary power units" : "All trailers in pool"}
            </p>
          </div>

          {/* Active – Pastel Green */}
          <div className="rounded-lg p-3 shadow-sm bg-[var(--accent-green)]/10">
            <p className="text-[10px] font-semibold uppercase text-[var(--accent-green)]">
              Active
            </p>
            <p className="text-xl font-semibold mt-0.5 text-[var(--accent-green)]">
              {summary.active}
            </p>
            <p className="text-[11px] text-[var(--accent-green)]">
              Passing checks / ready for assignment
            </p>
          </div>

          {/* Currently Dispatched – Pastel Purple */}
          <div className="rounded-lg p-3 shadow-sm bg-card">
            <p className="text-[10px] font-semibold uppercase text-[var(--accent-purple)]">
              Currently Dispatched
            </p>
            <p className="text-xl font-semibold mt-0.5 text-[var(--accent-purple)]">
              {assignmentSnapshot.unitsWithActiveOrders}
            </p>
            <p className="text-[11px] text-[var(--accent-purple)]">
              {assignmentSnapshot.availableUnits} available in pool
            </p>
          </div>
        </section>


        <section className="bg-card rounded-2xl shadow-lg border border-theme p-6 space-y-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-1 items-center gap-3 rounded-2xl border border-theme px-4 py-2 bg-card">
              <Search className="w-4 h-4 text-secondary" />
              <input
                type="text"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder={`Search ${fleetTab === "trucks" ? "trucks" : "trailers"} by unit #, VIN, plate…`}
                className="flex-1 bg-transparent text-sm text-primary outline-none"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as "all" | "active" | "inactive")}
              className="rounded-2xl border border-theme px-4 py-2 text-sm"
            >
              <option className="form-option" value="all">All status</option>
              <option className="form-option" value="active">Active</option>
              <option className="form-option" value="inactive">Inactive</option>
            </select>
          </div>

          <div className=" bg-card">
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
              className="overflow-x-auto overflow-y-visible table-container-hidden-scrollbar"
            >
              <table className="min-w-full text-sm" style={{ minWidth: '1200px' }}>
                {/* Header */}
                <thead className="bg-card">
                  <tr className="border-b border-theme">
                    <th className="px-6 py-3 text-left font-semibold text-[var(--accent-navyblue)]">Unit No.</th>
                    <th className="px-6 py-3 text-left font-semibold text-[var(--accent-navyblue)]">Type</th>
                    <th className="px-6 py-3 text-left font-semibold text-[var(--accent-navyblue)]">Make / Model</th>
                    <th className="px-6 py-3 text-left font-semibold text-[var(--accent-navyblue)]">VIN</th>
                    <th className="px-6 py-3 text-left font-semibold text-[var(--accent-navyblue)]">License Plate</th>
                    <th className="px-6 py-3 text-left font-semibold text-[var(--accent-navyblue)]">Year</th>
                    <th className="px-6 py-3 text-left font-semibold text-[var(--accent-navyblue)]">Odometer</th>
                    {fleetTab === "trailers" && (
                      <th className="px-6 py-3 text-left font-semibold text-[var(--accent-navyblue)]">Capacity</th>
                    )}
                    <th className="px-6 py-3 text-left font-semibold text-[var(--accent-navyblue)]">Dispatch Snapshot</th>
                    <th className="px-6 py-3 text-left font-semibold text-[var(--accent-navyblue)]">Status</th>
                    <th className="px-6 py-3 text-left font-semibold text-[var(--accent-navyblue)]">Comment</th>
                  </tr>
                </thead>

                {/* Body */}
                <tbody className="divide-theme">
                  {fleetUnitsLoading ? (
                    <tr>
                      <td
                        colSpan={fleetTab === "trailers" ? 11 : 10}
                        className="px-6 py-8 text-center text-secondary"
                      >
                        Loading fleet units…
                      </td>
                    </tr>
                  ) : fleetError ? (
                    <tr>
                      <td
                        colSpan={fleetTab === "trailers" ? 11 : 10}
                        className="px-6 py-8 text-center text-red-500"
                      >
                        {fleetError}
                      </td>
                    </tr>
                  ) : filteredUnits.length ? (
                    filteredUnits.map((unit, index) => {
                      const makeModel =
                        unit.makeModel ||
                        [unit.make, unit.model]
                          .filter(Boolean)
                          .join(" ")
                          .trim();
                      const previewKey =
                        unit._id ||
                        unit.unitNo ||
                        unit.licensePlate ||
                        unit.vinNo ||
                        unit.makeModel ||
                        `unit-${index}`;
                      return (
                        <tr
                          key={previewKey}
                          className="hover:bg-[rgba(0,209,255,0.05)] transition-colors cursor-pointer"
                          onClick={() => {
                            setSelectedUnit(unit);
                            setShowUnitDetails(true);
                          }}
                        >
                          <td className="px-6 py-4 font-semibold text-primary">
                            {unit.unitNo || "—"}
                          </td>
                          <td className="px-6 py-4 text-secondary">{unit.unitType || unit.type || "—"}</td>
                          <td className="px-6 py-4 text-secondary">{makeModel || "—"}</td>
                          <td className="px-6 py-4 text-secondary">{unit.vinNo || "—"}</td>
                          <td className="px-6 py-4 text-secondary">{unit.licensePlate || "—"}</td>
                          <td className="px-6 py-4 text-secondary">{unit.year || "—"}</td>
                          <td className="px-6 py-4 text-secondary">{formatNumber(unit.currentOdometer)}</td>
                          {fleetTab === "trailers" && (
                            <td className="px-6 py-4 text-secondary">{unit.capacity || "—"}</td>
                          )}
                          <td className="px-6 py-4 text-sm text-secondary align-top">
                            {(() => {
                              const assignment = getAssignmentForUnit(unit);
                              const loadStats = getLoadStatsForUnit(unit);
                              const activeOrder = assignment?.activeOrders[0];
                              return (
                                <div
                                  className="relative flex items-start gap-2"
                                  onMouseLeave={() => setPreviewUnitId((prev) => (prev === previewKey ? null : prev))}
                                >
                                  <button
                                    type="button"
                                    className={`mt-1 rounded-full border p-2 text-xs font-semibold uppercase ${activeOrder ? "text-accent border-theme" : "text-secondary border-theme"
                                      }`}
                                    title={activeOrder ? "View assignment details" : "No active assignment"}
                                    onMouseEnter={() => setPreviewUnitId(previewKey)}
                                    onFocus={() => setPreviewUnitId(previewKey)}
                                    onClick={() => setPreviewUnitId((prev) => (prev === previewKey ? null : previewKey))}
                                  >
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      fill="none"
                                      viewBox="0 0 24 24"
                                      strokeWidth={1.5}
                                      stroke="currentColor"
                                      className="w-4 h-4"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M2.25 12s3-6.75 9.75-6.75S21.75 12 21.75 12s-3 6.75-9.75 6.75S2.25 12 2.25 12z"
                                      />
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                                      />
                                    </svg>
                                  </button>
                                  <div className="space-y-2 max-w-[220px]">
                                    {/* ROUTE */}
                                    <div className="font-semibold text-primary truncate">
                                      {activeOrder?.route || "Available"}
                                    </div>

                                    {/* ORDER + DRIVER */}
                                    <div className="text-xs text-secondary leading-tight">
                                      <div>
                                        #{activeOrder?.customerOrderNo || activeOrder?.orderNumber || "—"}
                                      </div>
                                      <div>
                                        {activeOrder?.driverName || "TBD"}
                                      </div>
                                    </div>

                                    {/* TAGS (TRAILER / TRUCK) */}
                                    {assignment?.pairedUnits?.length ? (
                                      <div className="flex flex-wrap gap-1">
                                        {assignment.pairedUnits.map((label) => (
                                          <span
                                            key={`${unit._id}-pair-${label}`}
                                            className="text-[10px] px-2 py-[2px] rounded-full bg-muted text-primary font-medium"
                                          >
                                            {fleetTab === "trucks" ? "TRL" : "TRK"} {label}
                                          </span>
                                        ))}
                                      </div>
                                    ) : null}

                                    {/* LOAD STATS */}
                                    {loadStats && (
                                      <div className="text-[11px] text-secondary">
                                        {loadStats.pendingLoads}/{loadStats.totalLoads}
                                      </div>
                                    )}
                                  </div>
                                  {previewUnitId === previewKey && (
                                    <div className="absolute left-12 top-0 z-20 w-64 rounded-xl border border-theme bg-card p-4 shadow-lg">
                                      <p className="text-xs font-semibold text-secondary">Dispatch preview</p>
                                      <p className="mt-1 text-sm font-semibold text-primary">
                                        {activeOrder?.route || "No active assignment"}
                                      </p>
                                      <p className="text-xs text-secondary">
                                        Order #{activeOrder?.customerOrderNo || activeOrder?.orderNumber || "—"}
                                      </p>
                                      {activeOrder?.tripNo && (
                                        <p className="text-xs text-secondary">
                                          Trip #{activeOrder.tripNo}
                                        </p>
                                      )}
                                      <p className="text-xs text-secondary">
                                        Driver {activeOrder?.driverName || "Not assigned"}
                                      </p>
                                      {assignment?.pairedUnits?.length ? (
                                        <p className="text-xs text-secondary mt-1">
                                          Paired: {assignment.pairedUnits.join(", ")}
                                        </p>
                                      ) : null}
                                      {loadStats && (
                                        <p className="text-xs text-secondary mt-1">
                                          {loadStats.pendingLoads}/{loadStats.totalLoads} loads pending
                                        </p>
                                      )}
                                    </div>
                                  )}
                                </div>
                              );
                            })()}
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${formatStatusBadge(
                                unit.status
                              )}`}
                            >
                              {unit.status || "Unknown"}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-secondary">{unit.reason || "—"}</td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td
                        colSpan={fleetTab === "trailers" ? 11 : 10}
                        className="px-6 py-8 text-center text-secondary"
                      >
                        No {fleetTab === "trucks" ? "truck" : "trailer"} units match your filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Unit Details Sidebar */}
        {showUnitDetails && selectedUnit && (
          <>
            {/* Overlay */}
            <div
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity"
              onClick={() => {
                setShowUnitDetails(false);
                setTimeout(() => setSelectedUnit(null), 300);
              }}
            ></div>

            {/* Sidebar Panel */}
            <div
              className="fixed right-0 top-0 h-full w-full md:w-2/3 lg:w-1/2 bg-card shadow-2xl z-50 overflow-y-auto transform transition-transform duration-300 translate-x-0"
            >
              <div className="p-6">
                {/* Header */}
                <div className="flex justify-between items-center mb-6 pb-4 border-b-2 border-theme">
                  <h2 className="text-2xl font-bold text-primary">Fleet Unit Details</h2>
                  <button
                    onClick={() => {
                      setShowUnitDetails(false);
                      setTimeout(() => setSelectedUnit(null), 300);
                    }}
                    className="p-2 rounded-lg text-secondary hover:text-secondary hover:bg-[rgba(255,255,255,0.03)] transition-all"
                  >
                    <X size={24} />
                  </button>
                </div>

                <div className="space-y-6">
                  {/* Unit Header */}
                  <div className="bg-gradient-to-r from-[rgba(0,209,255,0.2)] to-[rgba(168,85,247,0.2)] text-white p-6 rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="h-20 w-20 flex-shrink-0">
                        <div className="h-20 w-20 rounded-full flex items-center justify-center text-white font-bold text-2xl border-4 border-white bg-gradient-to-br from-[var(--accent-blue)] to-[var(--accent-purple)]">
                          <Truck size={32} />
                        </div>
                      </div>
                      <div className="flex-1">
                        <h3 className="text-2xl font-bold mb-1">{selectedUnit.unitNo || 'N/A'}</h3>
                        <p className="text-secondary text-sm flex items-center gap-2">
                          <Truck size={16} />
                          {fleetTab === "trucks" ? "Truck" : "Trailer"} Unit
                        </p>
                        <span
                          className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold mt-2 ${(selectedUnit.status || "").toLowerCase() === "active"
                            ? "bg-emerald-500 text-white"
                            : "bg-red-500 text-white"
                            }`}
                        >
                          {(selectedUnit.status || "").toLowerCase() === "active" ? (
                            <>
                              <CheckCircle size={16} />
                              Active
                            </>
                          ) : (
                            <>
                              <AlertCircle size={16} />
                              Inactive
                            </>
                          )}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Unit Information */}
                  <div className="bg-card p-6 rounded-lg border border-theme">
                    <h4 className="font-semibold text-primary mb-4 text-lg flex items-center gap-2">
                      <Truck size={20} className="text-accent" />
                      Unit Information
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-secondary mb-1">Unit Number</p>
                        <p className="font-medium text-primary">{selectedUnit.unitNo || "—"}</p>
                      </div>
                      <div>
                        <p className="text-sm text-secondary mb-1">Type</p>
                        <p className="font-medium text-primary">{selectedUnit.unitType || selectedUnit.type || "—"}</p>
                      </div>
                      <div>
                        <p className="text-sm text-secondary mb-1">Make / Model</p>
                        <p className="font-medium text-primary">
                          {selectedUnit.makeModel || [selectedUnit.make, selectedUnit.model].filter(Boolean).join(" ") || "—"}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-secondary mb-1">VIN Number</p>
                        <p className="font-medium text-primary">{selectedUnit.vinNo || "—"}</p>
                      </div>
                      <div>
                        <p className="text-sm text-secondary mb-1">License Plate</p>
                        <p className="font-medium text-primary">{selectedUnit.licensePlate || "—"}</p>
                      </div>
                      <div>
                        <p className="text-sm text-secondary mb-1">Year</p>
                        <p className="font-medium text-primary">{selectedUnit.year || "—"}</p>
                      </div>
                      <div>
                        <p className="text-sm text-secondary mb-1">Current Odometer</p>
                        <p className="font-medium text-primary">{formatNumber(selectedUnit.currentOdometer)}</p>
                      </div>
                      {fleetTab === "trailers" && selectedUnit.capacity && (
                        <div>
                          <p className="text-sm text-secondary mb-1">Capacity</p>
                          <p className="font-medium text-primary">{selectedUnit.capacity}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Dispatch Snapshot */}
                  {(() => {
                    const assignment = getAssignmentForUnit(selectedUnit);
                    const loadStats = getLoadStatsForUnit(selectedUnit);
                    const activeOrder = assignment?.activeOrders[0];

                    if (!assignment && !loadStats) return null;

                    return (
                      <div className=" p-6 rounded-lg border border-theme">
                        <h4 className="font-semibold text-primary mb-4 text-lg flex items-center gap-2">
                          <MapPin size={20} className="text-accent" />
                          Dispatch Snapshot
                        </h4>
                        <div className="space-y-4">
                          {activeOrder ? (
                            <>
                              <div>
                                <p className="text-sm text-secondary mb-1">Current Assignment</p>
                                <p className="font-medium text-primary">{activeOrder.route || "Available"}</p>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <p className="text-sm text-secondary mb-1">Order Number</p>
                                  <p className="font-medium text-primary">#{activeOrder.customerOrderNo || activeOrder.orderNumber || "—"}</p>
                                </div>
                                {activeOrder.tripNo && (
                                  <div>
                                    <p className="text-sm text-secondary mb-1">Trip Number</p>
                                    <p className="font-medium text-primary">#{activeOrder.tripNo}</p>
                                  </div>
                                )}
                                <div>
                                  <p className="text-sm text-secondary mb-1">Driver</p>
                                  <p className="font-medium text-primary">{activeOrder.driverName || "TBD"}</p>
                                </div>
                                <div>
                                  <p className="text-sm text-secondary mb-1">Status</p>
                                  <p className="font-medium text-primary">{activeOrder.status?.replace('_', ' ') || "—"}</p>
                                </div>
                                {activeOrder.pickupDate && (
                                  <div>
                                    <p className="text-sm text-secondary mb-1">Pickup Date</p>
                                    <p className="font-medium text-primary">
                                      {new Date(activeOrder.pickupDate).toLocaleDateString('en-US', {
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric'
                                      })}
                                    </p>
                                  </div>
                                )}
                                {activeOrder.deliveryDate && (
                                  <div>
                                    <p className="text-sm text-secondary mb-1">Delivery Date</p>
                                    <p className="font-medium text-primary">
                                      {new Date(activeOrder.deliveryDate).toLocaleDateString('en-US', {
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric'
                                      })}
                                    </p>
                                  </div>
                                )}
                              </div>
                              {assignment?.pairedUnits?.length > 0 && (
                                <div>
                                  <p className="text-sm text-secondary mb-2">Paired Units</p>
                                  <div className="flex flex-wrap gap-2">
                                    {assignment.pairedUnits.map((label) => (
                                      <span
                                        key={`${selectedUnit._id}-pair-${label}`}
                                        className="text-xs px-3 py-1 rounded-full border border-theme text-secondary font-semibold uppercase bg-card"
                                      >
                                        {fleetTab === "trucks" ? "Trailer" : "Truck"} {label}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </>
                          ) : (
                            <div>
                              <p className="text-sm text-secondary mb-1">Current Assignment</p>
                              <p className="font-medium text-primary">Available</p>
                              <p className="text-xs text-secondary mt-1">No active assignment</p>
                            </div>
                          )}
                          {loadStats && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-theme">
                              <div>
                                <p className="text-sm text-secondary mb-1">Total Loads</p>
                                <p className="font-medium text-primary">{loadStats.totalLoads}</p>
                              </div>
                              <div>
                                <p className="text-sm text-secondary mb-1">Pending Loads</p>
                                <p className="font-medium text-primary">{loadStats.pendingLoads}</p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Status & Comment */}
                  <div className="bg-card p-6 rounded-lg border border-theme">
                    <h4 className="font-semibold text-primary mb-4 text-lg">Status & Comments</h4>
                    <div className="space-y-4">
                      <div>
                        <p className="text-sm text-secondary mb-1">Status</p>
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold ${formatStatusBadge(
                            selectedUnit.status
                          )}`}
                        >
                          {selectedUnit.status || "Unknown"}
                        </span>
                      </div>
                      {selectedUnit.reason && (
                        <div>
                          <p className="text-sm text-secondary mb-1">Comment / Reason</p>
                          <p className="font-medium text-primary">{selectedUnit.reason}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex justify-end gap-3 pt-4 border-t-2 border-theme">
                    <button
                      onClick={() => {
                        setShowUnitDetails(false);
                        setTimeout(() => setSelectedUnit(null), 300);
                      }}
                      className="px-6 py-2.5 bg-card border border-theme text-primary font-medium rounded-lg hover:bg-[rgba(255,255,255,0.05)] transition-all"
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

export default Index;


