import { useState, useEffect, useCallback, useRef } from "react";
import {
  FileText, Search, Download, X, ChevronRight,
  RefreshCw, MapPin, Calendar, Package, Shield,
  AlertCircle, CheckCircle, Clock, Filter, Truck, Users,
  Play, XCircle,
} from "lucide-react";
import { getManifests } from "../../../../axios/api/manifest";
import ExcelJS from "exceljs";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ManifestOrder {
  id: string; orderNumber: string; customerOrderNo: string; orderType: string;
  status: string; pickupLocation: string; deliveryLocation: string;
  pickupDate: string | null; deliveryDate: string | null;
  commodity: string; weight: number; weightUnit: string;
  noOfPackages: number; valueOfGoods: number;
  pars: string; paps: string; trailerSealNo: string;
  shipper: string; receiver: string;
  customer: { id: string; name: string; email: string } | null;
}
interface ManifestDriver {
  id: string; name: string; email: string; phone: string;
  profileImageUrl: string | null; internalId: string;
  licenceNumber: string; licenceExpiry: string | null;
}
interface ManifestTruck {
  id: string; unitNumber: string; plateNumber: string; vinNumber: string;
  make: string; model: string; year: string; type: string; status: string;
  ownership: string; internalId: string; registrationCountry: string; registrationProvince: string;
}
interface ManifestTrailer {
  id: string; unitNumber: string; plateNumber: string; vinNumber: string;
  make: string; model: string; year: string; type: string; status: string;
  ownership: string; internalId: string; registrationCountry: string; registrationProvince: string;
}
interface Manifest {
  id: string; tripNumber: string; status: string;
  plannedStartDate: string | null; plannedEndDate: string | null;
  actualStartDate: string | null; actualEndDate: string | null;
  startLocation: { place?: string } | null; endLocation: { place?: string } | null;
  notes: string; documentsApproved: boolean;
  manifest: { type?: { referenceNumber?: string; status?: string } } | null;
  borderCompliance: { status?: string; papsNumber?: string; parsNumber?: string } | null;
  driver: ManifestDriver | null; coDriver: ManifestDriver | null;
  truck: ManifestTruck | null; trailer: ManifestTrailer | null;
  orders: ManifestOrder[]; orderCount: number; createdAt: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const STATUS_CFG: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  planned: { label: "Planned", color: "text-blue-700", bg: "bg-card", icon: <Clock size={10} /> },
  manifest_pending: { label: "Manifest Pending", color: "text-amber-700", bg: "bg-amber-50", icon: <AlertCircle size={10} /> },
  "in-progress": { label: "In Progress", color: "text-indigo-700", bg: "bg-indigo-50", icon: <Play size={10} /> },
  completed: { label: "Completed", color: "text-green-700", bg: "bg-green-50", icon: <CheckCircle size={10} /> },
  cancelled: { label: "Cancelled", color: "text-red-700", bg: "bg-card", icon: <XCircle size={10} /> },
};

const fmt = (d: string | null | undefined) =>
  d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" }) : "—";

const StatusBadge = ({ status }: { status: string }) => {
  const c = STATUS_CFG[status] || { label: status, color: "text-primary", bg: "bg-card", icon: null };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${c.bg} ${c.color}`}>
      {c.icon}{c.label}
    </span>
  );
};

// ─── Excel export ─────────────────────────────────────────────────────────────

const exportToExcel = async (manifests: Manifest[]) => {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Logistiq";

  const hStyle: Partial<ExcelJS.Style> = {
    font: { bold: true, color: { argb: "FFFFFFFF" } },
    fill: { type: "pattern", pattern: "solid", fgColor: { argb: "FF42AEEC" } },
    alignment: { horizontal: "center", vertical: "middle" },
    border: { bottom: { style: "thin", color: { argb: "FFD0D0D0" } }, right: { style: "thin", color: { argb: "FFD0D0D0" } } },
  };

  // Sheet 1 – Manifests
  const s1 = wb.addWorksheet("Manifests");
  s1.columns = [
    { header: "Trip #", key: "tripNumber", width: 16 },
    { header: "Status", key: "status", width: 18 },
    { header: "Truck Unit", key: "truckUnit", width: 14 },
    { header: "Truck Plate", key: "truckPlate", width: 14 },
    { header: "Truck VIN", key: "truckVin", width: 22 },
    { header: "Truck Make/Model", key: "truckMM", width: 18 },
    { header: "Truck Year", key: "truckYear", width: 11 },
    { header: "Truck Type", key: "truckType", width: 14 },
    { header: "Trailer Unit", key: "trailerUnit", width: 14 },
    { header: "Trailer Plate", key: "trailerPlate", width: 14 },
    { header: "Trailer VIN", key: "trailerVin", width: 22 },
    { header: "Trailer Type", key: "trailerType", width: 14 },
    { header: "Driver", key: "driver", width: 22 },
    { header: "Driver Phone", key: "driverPhone", width: 16 },
    { header: "Licence #", key: "licence", width: 18 },
    { header: "Licence Expiry", key: "licExpiry", width: 16 },
    { header: "Co-Driver", key: "coDriver", width: 22 },
    { header: "Origin", key: "origin", width: 26 },
    { header: "Destination", key: "dest", width: 26 },
    { header: "Planned Start", key: "pStart", width: 16 },
    { header: "Planned End", key: "pEnd", width: 16 },
    { header: "Actual Start", key: "aStart", width: 16 },
    { header: "Actual End", key: "aEnd", width: 16 },
    { header: "Orders", key: "orders", width: 10 },
    { header: "Docs Approved", key: "docs", width: 15 },
    { header: "PAPS #", key: "paps", width: 16 },
    { header: "PARS #", key: "pars", width: 16 },
    { header: "Border Status", key: "border", width: 16 },
  ];
  s1.getRow(1).eachCell((c) => { Object.assign(c, { style: hStyle }); });
  s1.getRow(1).height = 24;
  manifests.forEach((m, i) => {
    const r = s1.addRow({
      tripNumber: m.tripNumber, status: STATUS_CFG[m.status]?.label || m.status,
      truckUnit: m.truck?.unitNumber || "", truckPlate: m.truck?.plateNumber || "",
      truckVin: m.truck?.vinNumber || "", truckMM: [m.truck?.make, m.truck?.model].filter(Boolean).join(" "),
      truckYear: m.truck?.year || "", truckType: m.truck?.type || "",
      trailerUnit: m.trailer?.unitNumber || "", trailerPlate: m.trailer?.plateNumber || "",
      trailerVin: m.trailer?.vinNumber || "", trailerType: m.trailer?.type || "",
      driver: m.driver?.name || "", driverPhone: m.driver?.phone || "",
      licence: m.driver?.licenceNumber || "", licExpiry: fmt(m.driver?.licenceExpiry),
      coDriver: m.coDriver?.name || "",
      origin: m.startLocation?.place || "", dest: m.endLocation?.place || "",
      pStart: fmt(m.plannedStartDate), pEnd: fmt(m.plannedEndDate),
      aStart: fmt(m.actualStartDate), aEnd: fmt(m.actualEndDate),
      orders: m.orderCount, docs: m.documentsApproved ? "Yes" : "No",
      paps: m.borderCompliance?.papsNumber || "", pars: m.borderCompliance?.parsNumber || "",
      border: m.borderCompliance?.status || "",
    });
    r.getCell("docs").font = { color: { argb: m.documentsApproved ? "FF16A34A" : "FFDC2626" } };
    if (i % 2 === 1) r.eachCell((c) => { c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF8FBFF" } }; });
  });

  // Sheet 2 – Orders
  const s2 = wb.addWorksheet("Orders");
  s2.columns = [
    { header: "Trip #", key: "trip", width: 16 }, { header: "Order #", key: "order", width: 16 },
    { header: "Cust Order #", key: "custOrder", width: 18 }, { header: "Customer", key: "cust", width: 22 },
    { header: "Type", key: "type", width: 12 }, { header: "Status", key: "status", width: 16 },
    { header: "Pickup", key: "pickup", width: 28 }, { header: "Delivery", key: "delivery", width: 28 },
    { header: "Pickup Date", key: "pd", width: 14 }, { header: "Delivery Date", key: "dd", width: 14 },
    { header: "Commodity", key: "commodity", width: 20 }, { header: "Weight", key: "weight", width: 14 },
    { header: "Packages", key: "pkgs", width: 11 }, { header: "Value ($)", key: "val", width: 12 },
    { header: "Shipper", key: "shipper", width: 20 }, { header: "Receiver", key: "receiver", width: 20 },
    { header: "PAPS", key: "paps", width: 14 }, { header: "PARS", key: "pars", width: 14 },
    { header: "Seal #", key: "seal", width: 14 },
  ];
  s2.getRow(1).eachCell((c) => { Object.assign(c, { style: hStyle }); });
  s2.getRow(1).height = 24;
  manifests.forEach((m) =>
    m.orders.forEach((o, i) => {
      const r = s2.addRow({
        trip: m.tripNumber, order: o.orderNumber, custOrder: o.customerOrderNo,
        cust: o.customer?.name || "", type: o.orderType, status: o.status,
        pickup: o.pickupLocation, delivery: o.deliveryLocation,
        pd: fmt(o.pickupDate), dd: fmt(o.deliveryDate),
        commodity: o.commodity, weight: o.weight ? `${o.weight} ${o.weightUnit}` : "",
        pkgs: o.noOfPackages, val: o.valueOfGoods,
        shipper: o.shipper, receiver: o.receiver, paps: o.paps, pars: o.pars, seal: o.trailerSealNo,
      });
      if (i % 2 === 1) r.eachCell((c) => { c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF8FBFF" } }; });
    })
  );

  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `manifests_${new Date().toISOString().split("T")[0]}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
};

// ─── Detail Row helpers ───────────────────────────────────────────────────────

const DR = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="flex flex-col gap-0.5">
    <span className="text-[10px] font-semibold text-secondary uppercase tracking-wider">{label}</span>
    <span className="text-sm text-primary">{value || <span className="text-gray-300">—</span>}</span>
  </div>
);

const SecTitle = ({ icon, title }: { icon: React.ReactNode; title: string }) => (
  <div className="flex items-center gap-2 mb-3">
    <div className="p-1.5 rounded-lg bg-[var(--accent-blue)]/10 text-[var(--accent-blue)]">{icon}</div>
    <h3 className="text-sm font-bold text-primary">{title}</h3>
  </div>
);

// ─── Slide-in panel ───────────────────────────────────────────────────────────

const SlidePanel = ({ manifest: m, onClose }: { manifest: Manifest; onClose: () => void }) => {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  return (
    <>
      <div className="fixed inset-0 bg-black/20 backdrop-blur-[1px] z-40" onClick={onClose} />
      <div
        ref={ref}
        className="fixed right-0 top-0 h-full w-full max-w-[560px] bg-card z-50 shadow-2xl flex flex-col overflow-hidden"
        style={{ animation: "slideInRight .22s ease-out" }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 border-b border-white/10 flex-shrink-0"
          style={{ background: "linear-gradient(135deg, var(--accent-blue) 0%, rgba(0,209,255,0.15) 100%)" }}
        >
          <div>
            <div className="flex items-center gap-2">
              <FileText size={16} className="text-white" />
              <span className="font-bold text-white text-base">{m.tripNumber}</span>
              <StatusBadge status={m.status} />
            </div>
            <p className="text-[11px] text-white/70 mt-0.5">
              Created {fmt(m.createdAt)} · {m.orderCount} order{m.orderCount !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => exportToExcel([m])}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-card/15 hover:bg-card/25 text-white text-xs font-medium rounded-lg transition-colors"
            >
              <Download size={13} /> Export
            </button>
            <button onClick={onClose} className="p-1.5 hover:bg-card/20 rounded-lg text-white transition-colors">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">

          {/* Truck */}
          <div className="rounded-xl border border-theme p-4">
            <SecTitle icon={<Truck size={14} />} title="Truck" />
            {m.truck ? (
              <div className="grid grid-cols-2 gap-3">
                <DR label="Unit #" value={m.truck.unitNumber} />
                <DR label="Plate #" value={m.truck.plateNumber} />
                <DR label="VIN" value={m.truck.vinNumber} />
                <DR label="Make / Model" value={[m.truck.make, m.truck.model].filter(Boolean).join(" ")} />
                <DR label="Year" value={m.truck.year} />
                <DR label="Type" value={m.truck.type} />
                <DR label="Status" value={m.truck.status} />
                <DR label="Ownership" value={m.truck.ownership} />
                <DR label="Registration" value={[m.truck.registrationProvince, m.truck.registrationCountry].filter(Boolean).join(", ")} />
                <DR label="Internal ID" value={m.truck.internalId} />
              </div>
            ) : <p className="text-sm text-secondary">No truck assigned</p>}
          </div>

          {/* Trailer */}
          <div className="rounded-xl border border-theme p-4">
            <SecTitle icon={<Package size={14} />} title="Trailer" />
            {m.trailer ? (
              <div className="grid grid-cols-2 gap-3">
                <DR label="Unit #" value={m.trailer.unitNumber} />
                <DR label="Plate #" value={m.trailer.plateNumber} />
                <DR label="VIN" value={m.trailer.vinNumber} />
                <DR label="Make / Model" value={[m.trailer.make, m.trailer.model].filter(Boolean).join(" ")} />
                <DR label="Year" value={m.trailer.year} />
                <DR label="Type" value={m.trailer.type} />
                <DR label="Status" value={m.trailer.status} />
                <DR label="Ownership" value={m.trailer.ownership} />
                <DR label="Registration" value={[m.trailer.registrationProvince, m.trailer.registrationCountry].filter(Boolean).join(", ")} />
                <DR label="Internal ID" value={m.trailer.internalId} />
              </div>
            ) : <p className="text-sm text-secondary">No trailer assigned</p>}
          </div>

          {/* Driver */}
          <div className="rounded-xl border border-theme p-4">
            <SecTitle icon={<Users size={14} />} title="Driver" />
            {m.driver ? (
              <div className="grid grid-cols-2 gap-3">
                <DR label="Name" value={m.driver.name} />
                <DR label="Internal ID" value={m.driver.internalId} />
                <DR label="Phone" value={m.driver.phone} />
                <DR label="Email" value={m.driver.email} />
                <DR label="Licence #" value={m.driver.licenceNumber} />
                <DR label="Licence Expiry" value={fmt(m.driver.licenceExpiry)} />
              </div>
            ) : <p className="text-sm text-secondary">No driver assigned</p>}
            {m.coDriver && (
              <div className="mt-3 pt-3 border-t border-theme">
                <p className="text-[10px] font-semibold text-secondary uppercase tracking-wider mb-2">Co-Driver</p>
                <div className="grid grid-cols-2 gap-3">
                  <DR label="Name" value={m.coDriver.name} />
                  <DR label="Phone" value={m.coDriver.phone} />
                  <DR label="Internal ID" value={m.coDriver.internalId} />
                  <DR label="Email" value={m.coDriver.email} />
                </div>
              </div>
            )}
          </div>

          {/* Trip details */}
          <div className="rounded-xl border border-theme p-4">
            <SecTitle icon={<MapPin size={14} />} title="Trip Details" />
            <div className="grid grid-cols-2 gap-3">
              <DR label="Origin" value={m.startLocation?.place} />
              <DR label="Destination" value={m.endLocation?.place} />
              <DR label="Planned Start" value={fmt(m.plannedStartDate)} />
              <DR label="Planned End" value={fmt(m.plannedEndDate)} />
              <DR label="Actual Start" value={fmt(m.actualStartDate)} />
              <DR label="Actual End" value={fmt(m.actualEndDate)} />
              <DR label="Docs Approved" value={m.documentsApproved
                ? <span className="text-green-600 font-medium flex items-center gap-1"><CheckCircle size={12} />Yes</span>
                : <span className="text-red-500 font-medium flex items-center gap-1"><X size={12} />No</span>} />
              <DR label="Notes" value={m.notes} />
            </div>
          </div>

          {/* Border Compliance */}
          {m.borderCompliance && (
            <div className="rounded-xl border border-theme p-4">
              <SecTitle icon={<Shield size={14} />} title="Border Compliance" />
              <div className="grid grid-cols-2 gap-3">
                <DR label="Status" value={m.borderCompliance.status} />
                <DR label="PAPS #" value={m.borderCompliance.papsNumber} />
                <DR label="PARS #" value={m.borderCompliance.parsNumber} />
              </div>
            </div>
          )}

          {/* Orders */}
          {m.orders.length > 0 && (
            <div className="rounded-xl border border-theme p-4">
              <SecTitle icon={<FileText size={14} />} title={`Orders (${m.orders.length})`} />
              <div className="space-y-3">
                {m.orders.map((o) => (
                  <div key={o.id} className="rounded-lg bg-card p-3 border border-theme">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-primary">{o.orderNumber}</span>
                      <StatusBadge status={o.status} />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <DR label="Customer" value={o.customer?.name} />
                      <DR label="Type" value={o.orderType} />
                      <DR label="Pickup" value={o.pickupLocation} />
                      <DR label="Delivery" value={o.deliveryLocation} />
                      <DR label="Pickup Date" value={fmt(o.pickupDate)} />
                      <DR label="Delivery Date" value={fmt(o.deliveryDate)} />
                      <DR label="Commodity" value={o.commodity} />
                      <DR label="Weight" value={o.weight ? `${o.weight} ${o.weightUnit}` : ""} />
                      <DR label="Packages" value={o.noOfPackages ? String(o.noOfPackages) : ""} />
                      <DR label="Value" value={o.valueOfGoods ? `$${o.valueOfGoods.toLocaleString()}` : ""} />
                      <DR label="Shipper" value={o.shipper} />
                      <DR label="Receiver" value={o.receiver} />
                      {o.paps && <DR label="PAPS" value={o.paps} />}
                      {o.pars && <DR label="PARS" value={o.pars} />}
                      {o.trailerSealNo && <DR label="Seal #" value={o.trailerSealNo} />}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      <style>{`@keyframes slideInRight { from{transform:translateX(100%)} to{transform:translateX(0)} }`}</style>
    </>
  );
};

// ─── Main page ─────────────────────────────────────────────────────────────────

const STATUS_OPTS = [
  { value: "", label: "All Statuses" }, { value: "planned", label: "Planned" },
  { value: "manifest_pending", label: "Manifest Pending" }, { value: "in-progress", label: "In Progress" },
  { value: "completed", label: "Completed" }, { value: "cancelled", label: "Cancelled" },
];

const ManifestListPage = () => {
  const [manifests, setManifests] = useState<Manifest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [selected, setSelected] = useState<Manifest | null>(null);
  const [exporting, setExporting] = useState(false);
  const [total, setTotal] = useState(0);

  const fetch = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await getManifests({ search, status: statusFilter, limit: 200 });
      if (res?.success) { setManifests(res.data || []); setTotal(res.pagination?.total || res.data?.length || 0); }
      else setError(res?.message || "Failed to load");
    } catch { setError("Failed to load manifests"); }
    finally { setLoading(false); }
  }, [search, statusFilter]);

  useEffect(() => { fetch(); }, [fetch]);

  const handleExportAll = async () => {
    if (!manifests.length) return;
    setExporting(true);
    try { await exportToExcel(manifests); } finally { setExporting(false); }
  };

  return (
    <div className="p-6 min-h-screen bg-main">
      {/* Page header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-primary flex items-center gap-2">
            <FileText size={20} className="text-[var(--accent-blue)]" /> Manifests
          </h1>
          <p className="text-sm text-secondary mt-0.5">{total} total records</p>
        </div>
        <button
          onClick={handleExportAll}
          disabled={exporting || !manifests.length}
          className="flex items-center gap-2 px-4 py-2 bg-[var(--accent-blue)] hover:bg-[var(--accent-blue)] disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
        >
          {exporting ? <RefreshCw size={14} className="animate-spin" /> : <Download size={14} />}
          Export Excel
        </button>
      </div>

      {/* Toolbar */}
      <div className="bg-card rounded-xl shadow-sm border border-theme px-4 py-3 flex items-center gap-3 flex-wrap mb-5">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary" />
          <input
            type="text" placeholder="Search trip number…" value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-2 text-sm border border-theme rounded-lg outline-none focus:border-[var(--accent-blue)] focus:ring-1 focus:ring-[var(--accent-blue)]/20"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-secondary" />
          <select
            value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
            className="text-sm border border-theme rounded-lg px-3 py-2 outline-none focus:border-[var(--accent-blue)] bg-card"
          >
            {STATUS_OPTS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <button
          onClick={fetch}
          className="p-2 rounded-lg hover:bg-[rgba(255,255,255,0.03)] text-secondary hover:text-[var(--accent-blue)] transition-colors border border-theme"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
        </button>
        <span className="text-xs text-secondary ml-auto">{manifests.length} record{manifests.length !== 1 ? "s" : ""}</span>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-4 bg-card border border-red-100 rounded-xl text-red-700 text-sm mb-4">
          <AlertCircle size={16} />{error}
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <div className="w-10 h-10 border-2 border-[var(--accent-blue)] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-secondary">Loading manifests…</p>
        </div>
      ) : manifests.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3 text-secondary">
          <FileText size={40} strokeWidth={1} />
          <p className="text-sm">No manifests found</p>
        </div>
      ) : (
        <div className="bg-card rounded-xl shadow-sm border border-theme overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full" style={{ minWidth: "960px" }}>
              <thead className="bg-card border-b border-theme">
                <tr>
                  {["Trip #", "Status", "Truck", "Trailer", "Driver", "Route", "Orders", "Planned Start", "Docs", ""].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold text-secondary uppercase tracking-wider whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {manifests.map((m) => (
                  <tr
                    key={m.id}
                    onClick={() => setSelected(m)}
                    className="hover:bg-[var(--accent-blue)]/5 cursor-pointer transition-colors group"
                  >
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-sm font-semibold text-[var(--accent-blue)]">{m.tripNumber}</span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap"><StatusBadge status={m.status} /></td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {m.truck ? (
                        <div>
                          <p className="text-sm font-medium text-primary">{m.truck.unitNumber || m.truck.plateNumber}</p>
                          <p className="text-[11px] text-secondary">{[m.truck.make, m.truck.model].filter(Boolean).join(" ")}</p>
                        </div>
                      ) : <span className="text-gray-300 text-sm">—</span>}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {m.trailer ? (
                        <div>
                          <p className="text-sm font-medium text-primary">{m.trailer.unitNumber || m.trailer.plateNumber}</p>
                          <p className="text-[11px] text-secondary">{m.trailer.type}</p>
                        </div>
                      ) : <span className="text-gray-300 text-sm">—</span>}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {m.driver ? (
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-[var(--accent-blue)]/10 text-[var(--accent-blue)] flex items-center justify-center text-[11px] font-bold flex-shrink-0">
                            {m.driver.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-primary">{m.driver.name}</p>
                            <p className="text-[11px] text-secondary">{m.driver.internalId}</p>
                          </div>
                        </div>
                      ) : <span className="text-gray-300 text-sm">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 max-w-[200px]">
                        <span className="text-sm text-primary truncate" style={{ maxWidth: 80 }}>{m.startLocation?.place || "—"}</span>
                        <ChevronRight size={11} className="text-gray-300 flex-shrink-0" />
                        <span className="text-sm text-primary truncate" style={{ maxWidth: 80 }}>{m.endLocation?.place || "—"}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-center">
                      <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${m.orderCount > 0 ? "bg-[var(--accent-blue)]/10 text-[var(--accent-blue)]" : "bg-card text-secondary"}`}>
                        {m.orderCount}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 text-sm text-secondary">
                        <Calendar size={11} className="text-secondary" />{fmt(m.plannedStartDate)}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {m.documentsApproved
                        ? <CheckCircle size={15} className="text-green-500" />
                        : <X size={15} className="text-gray-300" />}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right pr-4">
                      <ChevronRight size={15} className="text-gray-300 group-hover:text-[var(--accent-blue)] transition-colors inline-block" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {selected && <SlidePanel manifest={selected} onClose={() => setSelected(null)} />}
    </div>
  );
};

export default ManifestListPage;
