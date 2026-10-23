import { useState, useEffect, useCallback, useRef } from "react";
import {
  Users, Search, X, ChevronRight, RefreshCw, AlertCircle, Filter, Download, CheckCircle,
} from "lucide-react";
import { getAllDrivers } from "../../../../axios/api/driver";
import ExcelJS from "exceljs";

// ─── Types ────────────────────────────────────────────────────────────────────

interface DriverData {
  _id: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  status?: string;
  internalId?: string;
  profileImageUrl?: string;
  joinDate?: string;
  details?: {
    licenceNumber?: string;
    licenceExpiry?: string;
    jobType?: string;
    payType?: string;
    payRate?: number;
    fastCardNo?: string;
    fastCardExpiry?: string;
    citizenship?: string;
    gender?: string;
    hireDate?: string;
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmt = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" }) : "—";

const driverFullName = (d: DriverData) =>
  d.name || [d.firstName, d.lastName].filter(Boolean).join(" ") || "—";

const initials = (d: DriverData) => {
  const n = driverFullName(d);
  return n
    .split(" ")
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join("");
};

const DriverAvatar = ({ driver: d, size }: { driver: DriverData; size: "sm" | "md" }) => {
  const [err, setErr] = useState(false);
  const cls = size === "md" ? "w-10 h-10" : "w-8 h-8";
  const textCls = size === "md" ? "text-sm" : "text-xs";
  if (d.profileImageUrl && !err) {
    return (
      <img
        src={d.profileImageUrl}
        alt=""
        className={`${cls} rounded-full object-cover flex-shrink-0 border-2 border-white/30`}
        onError={() => setErr(true)}
      />
    );
  }
  return (
    <div className={`${cls} rounded-full bg-[var(--accent-blue)]/10 text-[var(--accent-blue)] font-bold ${textCls} flex items-center justify-center flex-shrink-0`}>
      {initials(d)}
    </div>
  );
};

const StatusBadge = ({ status }: { status?: string }) => {
  const active = (status || "").toLowerCase() === "active";
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${active ? "bg-green-50 text-green-700" : "bg-card text-secondary"}`}>
      {active ? <CheckCircle size={10} /> : null}{status || "—"}
    </span>
  );
};

// ─── Excel export ─────────────────────────────────────────────────────────────

const exportToExcel = async (drivers: DriverData[]) => {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Drivers");
  const hStyle: Partial<ExcelJS.Style> = {
    font: { bold: true, color: { argb: "FFFFFFFF" } },
    fill: { type: "pattern", pattern: "solid", fgColor: { argb: "FF42AEEC" } },
    alignment: { horizontal: "center", vertical: "middle" },
  };
  ws.columns = [
    { header: "Name", key: "name", width: 22 }, { header: "Email", key: "email", width: 26 },
    { header: "Phone", key: "phone", width: 16 }, { header: "Status", key: "status", width: 12 },
    { header: "Internal ID", key: "internalId", width: 14 }, { header: "Licence #", key: "licence", width: 18 },
    { header: "Licence Expiry", key: "licExpiry", width: 16 }, { header: "Job Type", key: "jobType", width: 16 },
    { header: "Pay Type", key: "payType", width: 14 }, { header: "Pay Rate", key: "payRate", width: 12 },
    { header: "Fast Card #", key: "fastCard", width: 16 }, { header: "Fast Card Expiry", key: "fastExpiry", width: 18 },
    { header: "Citizenship", key: "citizenship", width: 16 }, { header: "Gender", key: "gender", width: 12 },
    { header: "Hire Date", key: "hireDate", width: 14 }, { header: "Join Date", key: "joinDate", width: 14 },
  ];
  ws.getRow(1).eachCell((c) => { Object.assign(c, { style: hStyle }); });
  ws.getRow(1).height = 24;
  drivers.forEach((d, i) => {
    const r = ws.addRow({
      name: driverFullName(d), email: d.email || "", phone: d.phone || "",
      status: d.status || "", internalId: d.internalId || "",
      licence: d.details?.licenceNumber || "", licExpiry: fmt(d.details?.licenceExpiry),
      jobType: d.details?.jobType || "", payType: d.details?.payType || "",
      payRate: d.details?.payRate || "", fastCard: d.details?.fastCardNo || "",
      fastExpiry: fmt(d.details?.fastCardExpiry), citizenship: d.details?.citizenship || "",
      gender: d.details?.gender || "", hireDate: fmt(d.details?.hireDate), joinDate: fmt(d.joinDate),
    });
    if (i % 2 === 1) r.eachCell((c) => { c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF8FBFF" } }; });
  });
  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob); const a = document.createElement("a");
  a.href = url; a.download = `drivers_${new Date().toISOString().split("T")[0]}.xlsx`; a.click();
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

const SlidePanel = ({ driver: d, onClose }: { driver: DriverData; onClose: () => void }) => {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h); return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  return (
    <>
      <div className="fixed inset-0 bg-black/20 backdrop-blur-[1px] z-40" onClick={onClose} />
      <div
        ref={ref}
        className="fixed right-0 top-0 h-full w-full max-w-[520px] bg-card z-50 shadow-2xl flex flex-col overflow-hidden"
        style={{ animation: "slideInRight .22s ease-out" }}
      >
        <div
          className="flex items-center justify-between px-5 py-4 flex-shrink-0"

        >
          <div className="flex items-center gap-3">
            <DriverAvatar driver={d} size="md" />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-headings text-base">{driverFullName(d)}</span>
                <StatusBadge status={d.status} />
              </div>
              <p className="text-[11px] text-headings/70 mt-0.5">{d.internalId || d.email || ""}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => exportToExcel([d])} className="flex items-center gap-1.5 px-3 py-1.5 bg-card/15 hover:bg-card/25 text-white text-xs font-medium rounded-lg  bg-[var(--accent-navyblue)]">
              <Download size={13} /> Export
            </button>
            <button onClick={onClose} className="p-1.5 hover:bg-card/20 rounded-lg text-white"><X size={18} /></button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div className="rounded-xl border border-theme p-4">
            <p className="text-xs font-bold text-secondary uppercase tracking-wider mb-3">Contact Info</p>
            <div className="grid grid-cols-2 gap-3">
              <DR label="Full Name" value={driverFullName(d)} />
              <DR label="Internal ID" value={d.internalId} />
              <DR label="Email" value={d.email} />
              <DR label="Phone" value={d.phone} />
              <DR label="Status" value={<StatusBadge status={d.status} />} />
              <DR label="Join Date" value={fmt(d.joinDate)} />
            </div>
          </div>

          <div className="rounded-xl border border-theme p-4">
            <p className="text-xs font-bold text-secondary uppercase tracking-wider mb-3">Licence & Compliance</p>
            <div className="grid grid-cols-2 gap-3">
              <DR label="Licence #" value={d.details?.licenceNumber} />
              <DR label="Licence Expiry" value={fmt(d.details?.licenceExpiry)} />
              <DR label="Fast Card #" value={d.details?.fastCardNo} />
              <DR label="Fast Card Expiry" value={fmt(d.details?.fastCardExpiry)} />
              <DR label="Citizenship" value={d.details?.citizenship} />
            </div>
          </div>

          <div className="rounded-xl border border-theme p-4">
            <p className="text-xs font-bold text-secondary uppercase tracking-wider mb-3">Employment</p>
            <div className="grid grid-cols-2 gap-3">
              <DR label="Job Type" value={d.details?.jobType} />
              <DR label="Pay Type" value={d.details?.payType} />
              <DR label="Pay Rate" value={d.details?.payRate ? `$${d.details.payRate}` : ""} />
              <DR label="Hire Date" value={fmt(d.details?.hireDate)} />
              <DR label="Gender" value={d.details?.gender} />
            </div>
          </div>
        </div>
      </div>
      <style>{`@keyframes slideInRight{from{transform:translateX(100%)}to{transform:translateX(0)}}`}</style>
    </>
  );
};

// ─── Main page ─────────────────────────────────────────────────────────────────

const DriversPage = () => {
  const [drivers, setDrivers] = useState<DriverData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [selected, setSelected] = useState<DriverData | null>(null);
  const [exporting, setExporting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await getAllDrivers(1, 200, search || undefined, statusFilter || undefined);
      if (res?.success || res?.data) setDrivers(res?.data || []);
      else setError(res?.message || "Failed to load drivers");
    } catch { setError("Failed to load drivers"); }
    finally { setLoading(false); }
  }, [search, statusFilter]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="p-6 min-h-screen bg-main">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-primary flex items-center gap-2">
            <Users size={20} className="text-[var(--accent-blue)]" /> Drivers
          </h1>
          <p className="text-sm text-secondary mt-0.5">{drivers.length} drivers</p>
        </div>
        <button
          onClick={async () => { setExporting(true); try { await exportToExcel(drivers); } finally { setExporting(false); } }}
          disabled={exporting || !drivers.length}
          className="flex items-center gap-2 px-4 py-2 bg-[var(--accent-navyblue)] hover:bg-[var(--accent-blue)] disabled:opacity-50 !text-white text-sm font-medium rounded-lg transition-colors"
        >
          {exporting ? <RefreshCw size={14} className="animate-spin" /> : <Download size={14} />} Export
        </button>
      </div>

      <div className="bg-card rounded-xl shadow-sm border border-theme px-4 py-3 flex items-center gap-3 flex-wrap mb-5">
        <div className="relative flex-1 min-w-[180px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary" />
          <input type="text" placeholder="Search name, email…" value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-2 text-sm border border-theme rounded-lg outline-none focus:border-[var(--accent-blue)] focus:ring-1 focus:ring-[var(--accent-blue)]/20" />
        </div>
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-secondary" />
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
            className="text-sm border border-theme rounded-lg px-3 py-2 outline-none focus:border-[var(--accent-blue)] bg-card">
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
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
      ) : drivers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3 text-secondary">
          <Users size={40} strokeWidth={1} /><p className="text-sm">No drivers found</p>
        </div>
      ) : (
        <div className="bg-card rounded-xl shadow-sm border border-theme overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full" style={{ minWidth: "820px" }}>
              <thead className="bg-card border-b border-theme">
                <tr>
                  {["Driver", "Email", "Phone", "Status", "Internal ID", "Licence #", "Licence Expiry", "Job Type", ""].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold text-headings uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-theme divide-white/5">
                {drivers.map((d) => (
                  <tr key={d._id} onClick={() => setSelected(d)} className="hover:bg-[var(--accent-blue)]/5 cursor-pointer group transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2.5">
                        <DriverAvatar driver={d} size="sm" />
                        <div>
                          <p className="text-sm font-semibold text-primary">{driverFullName(d)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-secondary">{d.email || "—"}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-secondary">{d.phone || "—"}</td>
                    <td className="px-4 py-3 whitespace-nowrap"><StatusBadge status={d.status} /></td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-secondary">{d.internalId || "—"}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-secondary">{d.details?.licenceNumber || "—"}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-secondary">{fmt(d.details?.licenceExpiry)}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-secondary">{d.details?.jobType || "—"}</td>
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

      {selected && <SlidePanel driver={selected} onClose={() => setSelected(null)} />}
    </div>
  );
};

export default DriversPage;
