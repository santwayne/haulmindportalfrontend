import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
} from "recharts";
import {
  Truck,
  Users,
  Package,
  Wrench,
  FileText,
  AlertTriangle,
  Calendar,
  Clock,
  RefreshCw,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import {
  quickStats,
  loadsPerMonth,
  revenueTrend,
  fuelEfficiency,
  recentAlerts,
} from "../../../../axios/api/main.dashboard";
import Card from "../../../../components/admin/Card";

interface Stats {
  totalVehicles: number;
  driversOnDuty: number;
  activeTrips: number;
  activeLoads?: number;
  pendingWorkOrders: number;
  pendingInvoices: number;
}

interface LoadData {
  name: string;
  value: number;
}

interface RevenueData {
  name: string;
  value: number;
}

interface MaintenanceDue {
  plateNumber: string;
  nextServiceDate: string;
}

interface ExpiringDoc {
  name: string;
  type?: "driver" | "vehicle";
  documentType?: string;
  expiryDate?: string;
  license?: { expiryDate: string };
}

interface DelayedLoad {
  _id: string;
  loadId?: string;
  deliveryDate: string;
  status: string;
}

interface Alerts {
  maintenanceDue: MaintenanceDue[];
  expiringDocs: ExpiringDoc[];
  delayedLoads: DelayedLoad[];
}

interface TripsPerMonth {
  month: string;
  total: number;
}

// ── Dark-theme chart tooltip ───────────────────────────────────────────────
const DarkTooltip = ({
  active,
  payload,
  label,
  formatter,
}: {
  active?: boolean;
  payload?: any[];
  label?: string;
  formatter?: (v: number) => string;
}) => {
  if (!active || !payload?.length) return null;
  const val = payload[0].value as number;
  return (
    <div className="bg-[#0B1220] border border-[rgba(6,55,122,0.5)] rounded-lg px-3 py-2 shadow-xl text-xs">
      <p className="text-[#8B9BB4] mb-0.5">{label}</p>
      <p className="text-[#42aeec] font-semibold">
        {formatter ? formatter(val) : val}
      </p>
    </div>
  );
};

export default function QuickStatsUI() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats>({
    totalVehicles: 0,
    driversOnDuty: 0,
    activeTrips: 0,
    activeLoads: 0,
    pendingWorkOrders: 0,
    pendingInvoices: 0,
  });
  const [_loadsData, setLoadsData] = useState<LoadData[]>([]);
  const [revenueData, setRevenueData] = useState<RevenueData[]>([]);
  const [alerts, setAlerts] = useState<Alerts>({
    maintenanceDue: [],
    expiringDocs: [],
    delayedLoads: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [alertError, setAlertError] = useState<string | null>(null);
  const [tripsPerMonth, setTripsPerMonth] = useState<TripsPerMonth[]>([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      setAlertError(null);
      const quickStatsData = await quickStats();


      setTripsPerMonth(quickStatsData.data.tripsPerMonth);
      console.log("quickStatsData.data.tripsPerMonth", quickStatsData.data.tripsPerMonth)

      const results = await Promise.allSettled([
        quickStatsData,
        loadsPerMonth(),
        revenueTrend(),
        fuelEfficiency(),
        recentAlerts(),
      ]);

    


      // Quick Stats
      if (results[0].status === "fulfilled" && results[0].value?.success) {
        const d = results[0].value.data;
        setStats({
          totalVehicles: d.totalVehicles || 0,
          driversOnDuty: d.driversOnDuty || 0,
          activeTrips: d.activeTrips || d.activeLoads || 0,
          activeLoads: d.activeTrips || d.activeLoads || 0,
          pendingWorkOrders: d.pendingWorkOrders || 0,
          pendingInvoices: d.pendingInvoices || 0,
        });
        if (results[0].value.requiresCompanySetup && results[0].value.message) {
          setError(results[0].value.message);
        }
      } else {
        const msg =
          results[0].status === "rejected"
            ? "Failed to fetch statistics"
            : results[0].value?.message || "Failed to fetch statistics";
        setError(msg);
      }

      // Loads per Month
      if (results[1].status === "fulfilled" && results[1].value?.success) {
        const arr = results[1].value.data;
        setLoadsData(
          arr?.length
            ? arr.map((item: { month: string; total: number }) => ({
              name: item.month ? item.month.substring(0, 3) : "N/A",
              value: item.total || 0,
            }))
            : []
        );
      } else {
        setLoadsData([]);
      }

      // Revenue Trend
      if (results[2].status === "fulfilled" && results[2].value?.success) {
        const arr = results[2].value.data;
        setRevenueData(
          arr?.length
            ? arr.map((item: { month: string; totalRevenue: number }) => ({
              name: item.month ? item.month.substring(0, 3) : "N/A",
              value: item.totalRevenue || 0,
            }))
            : []
        );
      } else {
        setRevenueData([]);
      }

      // Alerts
      if (results[4].status === "fulfilled") {
        if (results[4].value?.success && results[4].value.alerts) {
          const a = results[4].value.alerts;
          setAlerts({
            maintenanceDue: a.maintenanceDue || [],
            expiringDocs: a.expiringDocs || [],
            delayedLoads: a.delayedLoads || [],
          });
          setAlertError(null);
        } else if (results[4].value?.error) {
          setAlertError(results[4].value.error);
          setAlerts({ maintenanceDue: [], expiringDocs: [], delayedLoads: [] });
        }
      } else {
        setAlertError("Unable to load alerts");
        setAlerts({ maintenanceDue: [], expiringDocs: [], delayedLoads: [] });
      }
    } catch (err) {
      setError("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  // Calculate revenue change % between last two non-zero months
  const revenueChange = useMemo(() => {
    const nonZero = revenueData.filter((d) => d.value > 0);
    if (nonZero.length < 2) return null;
    const prev = nonZero[nonZero.length - 2].value;
    const curr = nonZero[nonZero.length - 1].value;
    return (((curr - prev) / prev) * 100).toFixed(1);
  }, [revenueData]);

  const formatDate = (ds: string): string => {
    if (!ds) return "N/A";
    try {
      return new Date(ds).toLocaleDateString("en-GB");
    } catch {
      return "Invalid Date";
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-screen bg-main">
        <div className="text-center">
          <RefreshCw className="animate-spin h-10 w-10 text-[#42aeec] mx-auto mb-3" />
          <p className="text-secondary">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 flex items-center justify-center min-h-screen bg-main">
        <div className="text-center bg-[#121A2B] p-6 rounded-xl border border-[rgba(6,55,122,0.4)] shadow-lg">
          <AlertTriangle className="h-12 w-12 text-rose-500 mx-auto mb-3" />
          <div className="text-[#A855F7] text-lg font-semibold mb-2">{error}</div>
          <button
            onClick={fetchDashboardData}
            className="mt-3 px-5 py-2 bg-[#06377a] text-white rounded-lg hover:bg-[#1a6db8] transition font-medium inline-flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-5 space-y-5 bg-main min-h-screen relative overflow-hidden ">
      {/* Ambient glow orbs */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-[#06377a]/8 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-[#A855F7]/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-1/3 w-64 h-64 bg-[#1a6db8]/6 rounded-full blur-3xl pointer-events-none" />

      {/* ── Stat Cards ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 relative z-10">
        <StatCard title="Total Vehicles" value={stats.totalVehicles} icon={<Truck className="h-5 w-5" />} color="blue" onClick={() => navigate("/admin/fleetmaintenance/fleet-units")} />
        <StatCard title="Drivers on Duty" value={stats.driversOnDuty} icon={<Users className="h-5 w-5" />} color="green" onClick={() => navigate("/admin/dispatch/drivers")} />
        <StatCard title="Active Trips" value={stats.activeTrips || stats.activeLoads || 0} icon={<Package className="h-5 w-5" />} color="purple" onClick={() => navigate("/admin/dispatch/trips")} />
        <StatCard title="Pending Work Orders" value={stats.pendingWorkOrders} icon={<Wrench className="h-5 w-5" />} color="orange" onClick={() => navigate("/admin/fleetmaintenance/maintenance-orders-log")} />
        <StatCard title="Pending Invoices" value={stats.pendingInvoices} icon={<FileText className="h-5 w-5" />} color="red" onClick={() => navigate("/admin/accounts/invoice")} />
      </div>

      {/* ── Charts ───────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 relative z-10">

        {/* Trips per Month — Bar Chart */}
        <DashCard
          className="lg:col-span-2 cursor-pointer"
          onClick={() => navigate("/admin/dispatch/trips")}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-primary flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-[#06377a]/25">
                <Package className="h-4 w-4 text-[#42aeec]" />
              </span>
              Trips per Month
            </h3>

            <span className="flex items-center gap-1.5 text-xs text-[#8B9BB4]">
              <span className="w-2 h-2 rounded-full bg-[#00FFA3] animate-pulse shadow-[0_0_6px_#00FFA3]" />
              Live
            </span>
          </div>

          {

            (tripsPerMonth?.length || 0) > 0 ? (
              <div style={{ width: "100%", height: 220 }}>
                <ResponsiveContainer>
                  <BarChart data={tripsPerMonth} barCategoryGap="20%">

                    <defs>
                      <linearGradient id="tripBarGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#42aeec" stopOpacity={0.9} />
                        <stop offset="100%" stopColor="#06377a" stopOpacity={0.6} />
                      </linearGradient>
                    </defs>

                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="rgba(255,255,255,0.05)"
                      vertical={false}
                    />

                    {/* ✅ use month */}
                    <XAxis
                      dataKey="month"
                      stroke="#8B9BB4"
                      tick={{ fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />

                    {/* Y axis */}
                    <YAxis
                      stroke="#8B9BB4"
                      tick={{ fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      allowDecimals={false}
                      width={28}
                    />

                    <Tooltip
                      content={<DarkTooltip />}
                      cursor={{ fill: "rgba(6,55,122,0.15)" }}
                    />

                    {/* ✅ use total */}
                    <Bar
                      dataKey="total"
                      fill="url(#tripBarGrad)"
                      name="Trips"
                      radius={[6, 6, 0, 0]}
                      maxBarSize={48}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyState
                icon={<Package className="h-10 w-10" />}
                label="No trip data available"
              />
            )}
        </DashCard>

        {/* Revenue Trend — Area Chart */}
        <DashCard className="cursor-pointer" onClick={() => navigate("/admin/accounts/invoice")}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-primary flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-[#00FFA3]/10">
                <FileText className="h-4 w-4 text-[#00FFA3]" />
              </span>
              Revenue Trend
            </h3>
            {revenueChange !== null && (
              <span className={`flex items-center gap-1 text-xs font-semibold ${parseFloat(revenueChange) >= 0 ? "text-[#00FFA3]" : "text-rose-400"}`}>
                {parseFloat(revenueChange) >= 0
                  ? <TrendingUp className="h-3.5 w-3.5" />
                  : <TrendingDown className="h-3.5 w-3.5" />}
                {parseFloat(revenueChange) >= 0 ? "+" : ""}{revenueChange}%
              </span>
            )}
          </div>

          {revenueData.length > 0 ? (
            <div style={{ width: "100%", height: 190 }}>
              <ResponsiveContainer>
                <AreaChart data={revenueData}>
                  <defs>
                    <linearGradient id="revenueAreaGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#00FFA3" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#00FFA3" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="name" stroke="#8B9BB4" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis stroke="#8B9BB4" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} width={36} tickFormatter={(v) => `$${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`} />
                  <Tooltip content={<DarkTooltip formatter={(v) => `$${v.toLocaleString()}`} />} cursor={{ stroke: "rgba(0,255,163,0.2)", strokeWidth: 1 }} />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="#00FFA3"
                    strokeWidth={2.5}
                    fill="url(#revenueAreaGrad)"
                    dot={{ r: 3, fill: "#00FFA3", strokeWidth: 0 }}
                    activeDot={{ r: 5, fill: "#00FFA3", stroke: "#0B1220", strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState icon={<FileText className="h-10 w-10" />} label="No revenue data available" />
          )}
        </DashCard>
      </div>

      {/* ── Alerts + Summary ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 relative z-10">

        {/* Recent Alerts */}
        <DashCard className="lg:col-span-2">
          <h3 className="text-sm font-semibold mb-4 text-primary flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-rose-500/10">
              <AlertTriangle className="h-4 w-4 text-rose-400" />
            </span>
            Recent Alerts
          </h3>

          {alertError ? (
            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-medium text-amber-300">Alert System Unavailable</p>
                <p className="text-xs text-[#8B9BB4] mt-0.5">{alertError}</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">

              {/* Maintenance Due */}
              <AlertSection
                title="Maintenance Due"
                count={alerts.maintenanceDue?.length || 0}
                icon={<Wrench className="h-3.5 w-3.5 text-rose-400" />}
                accentColor="rose"
                onClick={() => navigate("/admin/fleetmaintenance/scheduled-services-log")}
              >
                {alerts.maintenanceDue?.length > 0 ? (
                  alerts.maintenanceDue.map((v, i) => (
                    <AlertItem
                      key={i}
                      color="rose"
                      leftIcon={<Truck className="h-4 w-4 text-rose-400" />}
                      title={v.plateNumber}
                      subtitle={formatDate(v.nextServiceDate)}
                      badge="Overdue"
                      onClick={() => navigate("/admin/fleetmaintenance/scheduled-services-log")}
                    />
                  ))
                ) : (
                  <OkRow label="No maintenance overdue" />
                )}
              </AlertSection>

              {/* Document Expiry */}
              <AlertSection
                title="Document Expiry"
                count={alerts.expiringDocs?.length || 0}
                icon={<FileText className="h-3.5 w-3.5 text-amber-400" />}
                accentColor="amber"
                onClick={() => navigate("/admin/Management/documents")}
              >
                {alerts.expiringDocs?.length > 0 ? (
                  alerts.expiringDocs.map((doc, i) => (
                    <AlertItem
                      key={i}
                      color="amber"
                      leftIcon={
                        doc.type === "vehicle"
                          ? <Truck className="h-4 w-4 text-amber-400" />
                          : <Users className="h-4 w-4 text-amber-400" />
                      }
                      title={`${doc.documentType || "Document"} — ${doc.name}`}
                      subtitle={formatDate(doc.license?.expiryDate || doc.expiryDate || "")}
                      badge="Expiring"
                      onClick={() => navigate("/admin/Management/documents")}
                    />
                  ))
                ) : (
                  <OkRow label="All documents valid" />
                )}
              </AlertSection>

              {/* Delayed Trips */}
              <AlertSection
                title="Delayed Trips"
                count={alerts.delayedLoads?.length || 0}
                icon={<Clock className="h-3.5 w-3.5 text-orange-400" />}
                accentColor="orange"
                onClick={() => navigate("/admin/dispatch/trips")}
              >
                {alerts.delayedLoads?.length > 0 ? (
                  alerts.delayedLoads.map((trip, i) => (
                    <AlertItem
                      key={i}
                      color="orange"
                      leftIcon={<Package className="h-4 w-4 text-[#F59E0B]" />}
                      title={`Trip #${trip.loadId || trip._id}`}
                      subtitle={`${formatDate(trip.deliveryDate)} • ${trip.status}`}
                      badge="Delayed"
                      onClick={() => navigate("/admin/dispatch/trips")}
                    />
                  ))
                ) : (
                  <OkRow label="All trips on track" />
                )}
              </AlertSection>

            </div>
          )}
        </DashCard>

        {/* Summary */}
        <DashCard>
          <h3 className="text-sm font-semibold mb-4 text-primary">Summary</h3>
          <div className="space-y-1">
            <SummaryItem label="Total Vehicles" value={stats.totalVehicles} icon={<Truck className="h-3.5 w-3.5 text-[#42aeec]" />} />
            <SummaryItem label="Active Trips" value={stats.activeTrips || stats.activeLoads || 0} icon={<Package className="h-3.5 w-3.5 text-[#A855F7]" />} />
            <SummaryItem label="Drivers on Duty" value={stats.driversOnDuty} icon={<Users className="h-3.5 w-3.5 text-[#00FFA3]" />} />
            <SummaryItem label="Pending Work Orders" value={stats.pendingWorkOrders} icon={<Wrench className="h-3.5 w-3.5 text-[#F59E0B]" />} />
            <SummaryItem label="Pending Invoices" value={stats.pendingInvoices} icon={<FileText className="h-3.5 w-3.5 text-rose-400" />} />
          </div>

          <button
            onClick={fetchDashboardData}
            className="mt-5 w-full px-3 py-2.5 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-all duration-300 relative overflow-hidden group
              bg-[#06377a]/30 border border-[#42aeec]/30 text-[#42aeec]
              hover:bg-[#06377a]/50 hover:border-[#42aeec]/60 hover:shadow-[0_0_20px_rgba(6,55,122,0.35)]"
          >
            <span className="absolute inset-0 bg-gradient-to-r from-transparent via-[#1a6db8]/15 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
            <RefreshCw className="h-3.5 w-3.5 relative z-10" />
            <span className="relative z-10">Refresh Data</span>
          </button>
        </DashCard>
      </div>

    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function DashCard({ children, className = "", onClick }: { children: React.ReactNode; className?: string; onClick?: () => void }) {
  return (
    <div
      className={`bg-[#121A2B] backdrop-blur-md rounded-xl p-4 border border-[rgba(6,55,122,0.35)] hover:border-[rgba(6,55,122,0.6)] shadow-md transition-all duration-300 ${onClick ? "cursor-pointer hover:-translate-y-0.5 hover:shadow-[0_0_24px_rgba(6,55,122,0.25)]" : ""} ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

function AlertSection({
  title, children, count, icon, accentColor, onClick,
}: {
  title: string; children: React.ReactNode; count: number;
  icon: React.ReactNode; accentColor: string; onClick?: () => void;
}) {
  const badgeBg: Record<string, string> = {
    rose: "bg-rose-500/20 text-rose-300",
    amber: "bg-amber-500/20 text-amber-300",
    orange: "bg-orange-500/20 text-orange-300",
  };
  return (
    <div>
      <div
        className={`flex items-center justify-between mb-2 ${onClick ? "cursor-pointer" : ""}`}
        onClick={onClick}
      >
        <div className="flex items-center gap-1.5 text-xs font-semibold text-primary">
          {icon}
          {title}
        </div>
        {count > 0 && (
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${badgeBg[accentColor] || badgeBg.rose}`}>
            {count}
          </span>
        )}
      </div>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function AlertItem({
  color, leftIcon, title, subtitle, badge, onClick,
}: {
  color: "rose" | "amber" | "orange";
  leftIcon: React.ReactNode;
  title: string;
  subtitle: string;
  badge: string;
  onClick?: () => void;
}) {
  const styles: Record<string, string> = {
    rose: "bg-rose-500/10 border-rose-500/20 hover:border-rose-500/40",
    amber: "bg-amber-500/10 border-amber-500/20 hover:border-amber-500/40",
    orange: "bg-orange-500/10 border-orange-500/20 hover:border-orange-500/40",
  };
  const badgeStyles: Record<string, string> = {
    rose: "bg-rose-500/20 text-rose-300 border border-rose-500/30",
    amber: "bg-amber-500/20 text-amber-300 border border-amber-500/30",
    orange: "bg-orange-500/20 text-orange-300 border border-orange-500/30",
  };
  return (
    <div
      className={`flex justify-between items-center p-2.5 rounded-lg border transition-all ${styles[color]} ${onClick ? "cursor-pointer" : ""}`}
      onClick={onClick}
    >
      <div className="flex items-center gap-2">
        {leftIcon}
        <div>
          <div className="font-medium text-xs text-primary">{title}</div>
          <div className="text-[10px] text-[#8B9BB4] flex items-center gap-1 mt-0.5">
            <Calendar className="h-3 w-3" />
            {subtitle}
          </div>
        </div>
      </div>
      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${badgeStyles[color]}`}>
        {badge}
      </span>
    </div>
  );
}

function OkRow({ label }: { label: string }) {
  return (
    <div className="text-xs text-[#8B9BB4] px-2.5 py-2 bg-[#00FFA3]/5 border border-[#00FFA3]/10 rounded-lg flex items-center gap-2">
      <span className="h-1.5 w-1.5 rounded-full bg-[#00FFA3] shadow-[0_0_6px_#00FFA3]" />
      {label}
    </div>
  );
}

function SummaryItem({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <div className="flex justify-between items-center py-2.5 border-b border-[rgba(6,55,122,0.25)] last:border-0">
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-xs text-[#8B9BB4]">{label}</span>
      </div>
      <span className="text-sm font-bold text-primary">{value}</span>
    </div>
  );
}

function EmptyState({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="h-52 flex flex-col items-center justify-center text-[#8B9BB4]">
      <div className="opacity-20 mb-2">{icon}</div>
      <p className="text-xs">{label}</p>
    </div>
  );
}

function StatCard({
  title, value, icon, color, onClick,
}: {
  title: string; value: number; icon: React.ReactNode; color: string; onClick?: () => void;
}) {
  const styles: Record<string, { bg: string; text: string; glow: string }> = {
    blue: { bg: "bg-[#06377a]/25", text: "text-[#42aeec]", glow: "shadow-[0_0_18px_rgba(6,55,122,0.4)]" },
    green: { bg: "bg-[#00FFA3]/10", text: "text-[#00FFA3]", glow: "shadow-[0_0_18px_rgba(0,255,163,0.25)]" },
    purple: { bg: "bg-[#A855F7]/10", text: "text-[#A855F7]", glow: "shadow-[0_0_18px_rgba(168,85,247,0.25)]" },
    orange: { bg: "bg-[#F59E0B]/10", text: "text-[#F59E0B]", glow: "shadow-[0_0_18px_rgba(245,158,11,0.25)]" },
    red: { bg: "bg-rose-500/10", text: "text-rose-400", glow: "shadow-[0_0_18px_rgba(244,63,94,0.25)]" },
  };
  const s = styles[color] || styles.blue;

  return (
    <Card onClick={onClick} className="cursor-pointer hover:scale-[1.02] active:scale-[0.98] card-premium">
      <div className="flex items-start gap-3">
        <div className={`rounded-xl p-2.5 ${s.bg} ${s.glow}`}>
          <div className={s.text}>{icon}</div>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-[#8B9BB4] truncate">{title}</p>
          <p className="text-2xl font-bold text-primary mt-0.5">{value}</p>
        </div>
      </div>
      <div className="mt-3 h-[2px] rounded-full overflow-hidden bg-white/5">
        <div className={`h-full ${s.bg} w-3/5`} />
      </div>
    </Card>
  );
}
