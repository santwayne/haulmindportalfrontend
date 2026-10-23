import { useState, useEffect, useCallback, useRef } from "react";
import {
  Truck, Search, X, ChevronRight, RefreshCw, AlertCircle, Filter, Download,
} from "lucide-react";
import { getAllVehicles } from "../../../../axios/api/vehicle";
import ExcelJS from "exceljs";

// ─── Types ────────────────────────────────────────────────────────────────────

interface TruckData {
  _id: string;
  unitNumber?: string;
  plateNumber?: string;
  vinNumber?: string;
  make?: string;
  model?: string;
  year?: string;
  type?: string;
  status?: string;
  ownership?: string;
  internalId?: string;
  registrationCountry?: string;
  registrationProvince?: string;
  subType?: string;
  compliance?: string;
  odometer?: number;
  fuelLevel?: number;
  speed?: number;
  capacity?: string;
  safetyExpiryDate?: string;
  currentLocation?: { address?: string };
  driver?: { name?: string; firstName?: string; lastName?: string; internalId?: string };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const STATUS_COLOR: Record<string, string> = {
  "In Service": "bg-green-50 text-green-700",
  "Out of Service": "bg-card text-red-700",
  Maintenance: "bg-amber-50 text-amber-700",
  moving: "bg-card text-blue-700",
  idle: "bg-card text-secondary",
  stopped: "bg-card text-secondary",
};

const fmt = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" }) : "—";

const StatusBadge = ({ status }: { status?: string }) => {
  const cls = STATUS_COLOR[status || ""] || "bg-card text-secondary";
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${cls}`}>
      {status || "—"}
    </span>
  );
};

// ─── Excel export ─────────────────────────────────────────────────────────────

const exportToExcel = async (trucks: TruckData[]) => {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Trucks");
  const hStyle: Partial<ExcelJS.Style> = {
    font: { bold: true, color: { argb: "FFFFFFFF" } },
    fill: { type: "pattern", pattern: "solid", fgColor: { argb: "FF42AEEC" } },
    alignment: { horizontal: "center", vertical: "middle" },
  };
  ws.columns = [
    { header: "Unit #", key: "unit", width: 14 }, { header: "Plate #", key: "plate", width: 14 },
    { header: "VIN", key: "vin", width: 22 }, { header: "Make", key: "make", width: 14 },
    { header: "Model", key: "model", width: 14 }, { header: "Year", key: "year", width: 10 },
    { header: "Type", key: "type", width: 16 }, { header: "Status", key: "status", width: 16 },
    { header: "Ownership", key: "ownership", width: 18 }, { header: "Internal ID", key: "internalId", width: 14 },
    { header: "Registration", key: "reg", width: 20 }, { header: "Compliance", key: "compliance", width: 16 },
    { header: "Safety Expiry", key: "safety", width: 16 }, { header: "Driver", key: "driver", width: 22 },
    { header: "Odometer", key: "odometer", width: 12 }, { header: "Fuel %", key: "fuel", width: 10 },
    { header: "Location", key: "location", width: 30 },
  ];
  ws.getRow(1).eachCell((c) => { Object.assign(c, { style: hStyle }); });
  ws.getRow(1).height = 24;
  trucks.forEach((t, i) => {
    const driverName = t.driver?.name || [t.driver?.firstName, t.driver?.lastName].filter(Boolean).join(" ") || "";
    const r = ws.addRow({
      unit: t.unitNumber || "", plate: t.plateNumber || "", vin: t.vinNumber || "",
      make: t.make || "", model: t.model || "", year: t.year || "", type: t.type || "",
      status: t.status || "", ownership: t.ownership || "", internalId: t.internalId || "",
      reg: [t.registrationProvince, t.registrationCountry].filter(Boolean).join(", "),
      compliance: t.compliance || "", safety: fmt(t.safetyExpiryDate), driver: driverName,
      odometer: t.odometer || "", fuel: t.fuelLevel !== undefined ? `${t.fuelLevel}%` : "",
      location: t.currentLocation?.address || "",
    });
    if (i % 2 === 1) r.eachCell((c) => { c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF8FBFF" } }; });
  });
  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob); const a = document.createElement("a");
  a.href = url; a.download = `trucks_${new Date().toISOString().split("T")[0]}.xlsx`; a.click();
  URL.revokeObjectURL(url);
};

// ─── Detail Row ───────────────────────────────────────────────────────────────

const DR = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="flex flex-col gap-0.5">
    <span className="text-[10px] font-semibold text-secondary uppercase tracking-wider">{label}</span>
    <span className="text-sm text-primary">{value || <span className="text-gray-300">—</span>}</span>
  </div>
);

// ─── Slide-in panel ───────────────────────────────────────────────────────────

const SlidePanel = ({ truck: t, onClose }: { truck: TruckData; onClose: () => void }) => {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h); return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  const driverName = t.driver?.name || [t.driver?.firstName, t.driver?.lastName].filter(Boolean).join(" ") || "";

  return (
    <>
      <div className="fixed inset-0 bg-black/20 backdrop-blur-[1px] z-40" onClick={onClose} />
      <div
        ref={ref}
        className="fixed right-0 top-0 h-full w-full max-w-[520px] bg-card z-50 shadow-2xl flex flex-col overflow-hidden"
        style={{ animation: "slideInRight .22s ease-out" }}
      >
        <div
          className="flex items-center justify-between px-5 py-4 border-b border-white/10 flex-shrink-0 bg-card"

        >
          <div>
            <div className="flex items-center gap-2">
              <Truck size={16} className="text-headings" />
              <span className="font-bold text-headings text-base">{t.unitNumber || t.plateNumber}</span>
              <StatusBadge status={t.status} />
            </div>
            <p className="text-[11px] text-secondary mt-0.5">{[t.make, t.model, t.year].filter(Boolean).join(" · ")}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => exportToExcel([t])}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-card/15 hover:bg-card/25 text-primary text-xs font-medium rounded-lg  bg-[var(--accent-navyblue)]"
            >
              <Download size={13} /> Export
            </button>
            <button onClick={onClose} className="p-1.5 hover:bg-card/20 rounded-lg text-primary"><X size={18} /></button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div className="rounded-xl border border-theme p-4">
            <p className="text-xs font-bold text-secondary uppercase tracking-wider mb-3">Identification</p>
            <div className="grid grid-cols-2 gap-3">
              <DR label="Unit #" value={t.unitNumber} />
              <DR label="Plate #" value={t.plateNumber} />
              <DR label="VIN" value={t.vinNumber} />
              <DR label="Internal ID" value={t.internalId} />
              <DR label="Make" value={t.make} />
              <DR label="Model" value={t.model} />
              <DR label="Year" value={t.year} />
              <DR label="Type" value={t.type} />
            </div>
          </div>

          <div className="rounded-xl border border-theme p-4">
            <p className="text-xs font-bold text-secondary uppercase tracking-wider mb-3">Status & Compliance</p>
            <div className="grid grid-cols-2 gap-3">
              <DR label="Status" value={<StatusBadge status={t.status} />} />
              <DR label="Ownership" value={t.ownership} />
              <DR label="Sub Type" value={t.subType} />
              <DR label="Compliance" value={t.compliance} />
              <DR label="Safety Expiry" value={fmt(t.safetyExpiryDate)} />
              <DR label="Registration" value={[t.registrationProvince, t.registrationCountry].filter(Boolean).join(", ")} />
            </div>
          </div>

          <div className="rounded-xl border border-theme p-4">
            <p className="text-xs font-bold text-secondary uppercase tracking-wider mb-3">Operational</p>
            <div className="grid grid-cols-2 gap-3">
              <DR label="Driver" value={driverName} />
              <DR label="Capacity" value={t.capacity} />
              <DR label="Odometer" value={t.odometer ? `${t.odometer.toLocaleString()} km` : ""} />
              <DR label="Fuel" value={t.fuelLevel !== undefined ? `${t.fuelLevel}%` : ""} />
              <DR label="Speed" value={t.speed !== undefined ? `${t.speed} km/h` : ""} />
              <DR label="Location" value={t.currentLocation?.address} />
            </div>
          </div>
        </div>
      </div>
      <style>{`@keyframes slideInRight{from{transform:translateX(100%)}to{transform:translateX(0)}}`}</style>
    </>
  );
};

// ─── Main page ─────────────────────────────────────────────────────────────────

const TrucksPage = () => {
  const [trucks, setTrucks] = useState<TruckData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [selected, setSelected] = useState<TruckData | null>(null);
  const [exporting, setExporting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await getAllVehicles(1, 200, search || undefined, undefined, statusFilter || undefined);
      if (res?.success) setTrucks(res.data || []);
      else setError(res?.message || "Failed to load trucks");
    } catch { setError("Failed to load trucks"); }
    finally { setLoading(false); }
  }, [search, statusFilter]);

  useEffect(() => { load(); }, [load]);

  const statusOptions = ["", "In Service", "Out of Service", "Maintenance", "moving", "idle", "stopped"];

  return (
    <div className="p-6 min-h-screen bg-main">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-headings flex items-center gap-2">
            <Truck size={20} className="text-[var(--accent-navyblue)]" /> Trucks
          </h1>
          <p className="text-sm text-secondary mt-0.5">{trucks.length} trucks in fleet</p>
        </div>
        <button
          onClick={async () => { setExporting(true); try { await exportToExcel(trucks); } finally { setExporting(false); } }}
          disabled={exporting || !trucks.length}
          className="flex items-center gap-2 px-4 py-2 bg-[var(--accent-navyblue)] hover:bg-[var(--accent-blue)] disabled:opacity-50 !text-white text-sm font-medium rounded-lg transition-colors "
        >
          {exporting ? <RefreshCw size={14} className="animate-spin" /> : <Download size={14} />} Export
        </button>
      </div>

      {/* Toolbar */}
      <div className="bg-card rounded-xl shadow-sm border border-theme px-4 py-3 flex items-center gap-3 flex-wrap mb-5">
        <div className="relative flex-1 min-w-[180px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary" />
          <input
            type="text" placeholder="Search unit, plate, VIN…" value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-2 text-sm border border-theme rounded-lg outline-none focus:border-[var(--accent-blue)] focus:ring-1 focus:ring-[var(--accent-blue)]/20"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-secondary" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-sm border border-theme rounded-lg px-3 py-2
  bg-[var(--bg-card)] text-[var(--text-primary)]
  outline-none focus:ring-2 focus:ring-[var(--accent-blue)]
  focus:border-[var(--accent-blue)]
  cursor-pointer transition-all"
          >
            {statusOptions.map((s) => (
              <option
                key={s}
                value={s}
                className="bg-[var(--bg-card)] text-[var(--text-primary)]"
              >
                {s || "All Statuses"}
              </option>
            ))}
          </select>
        </div>
        <button onClick={load} className="p-2 rounded-lg hover:bg-[rgba(255,255,255,0.03)] text-secondary hover:text-[var(--accent-blue)] border border-theme">
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-4 bg-card border border-red-100 rounded-xl text-red-700 text-sm mb-4">
          <AlertCircle size={16} />{error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="w-10 h-10 border-2 border-[var(--accent-blue)] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : trucks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3 text-secondary">
          <Truck size={40} strokeWidth={1} /><p className="text-sm">No trucks found</p>
        </div>
      ) : (
        <div className="bg-card rounded-xl shadow-sm border border-theme overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full" style={{ minWidth: "900px" }}>
              <thead className="bg-card border-b border-theme">
                <tr>
                  {["Unit #", "Plate #", "Make / Model", "Year", "Type", "Status", "Ownership", "Driver", "Compliance", ""].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold text-headings uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-theme divide-white/5">
                {trucks.map((t) => {
                  const driverName = t.driver?.name || [t.driver?.firstName, t.driver?.lastName].filter(Boolean).join(" ") || "";
                  return (
                    <tr key={t._id} onClick={() => setSelected(t)} className="hover:bg-[var(--accent-blue)]/5 cursor-pointer group transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-sm font-semibold text-secondary">{t.unitNumber || "—"}</span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-secondary">{t.plateNumber || "—"}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <p className="text-sm font-medium text-secondary">{[t.make, t.model].filter(Boolean).join(" ") || "—"}</p>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-secondary">{t.year || "—"}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-secondary">{t.type || "—"}</td>
                      <td className="px-4 py-3 whitespace-nowrap"><StatusBadge status={t.status} /></td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-secondary">{t.ownership || "—"}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-secondary">{driverName || "—"}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {t.compliance && (
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${t.compliance === "COMPLIANT" ? "bg-green-50 text-green-700" : t.compliance === "NON-COMPLIANT" ? "bg-card text-red-700" : "bg-amber-50 text-amber-700"}`}>
                            {t.compliance}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right pr-4">
                        <ChevronRight size={15} className="text-gray-300 group-hover:text-[var(--accent-blue)] transition-colors inline-block" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {selected && <SlidePanel truck={selected} onClose={() => setSelected(null)} />}
    </div>
  );
};

export default TrucksPage;
