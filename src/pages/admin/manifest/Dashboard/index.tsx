import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Truck, Package, Users, AlertCircle, ArrowRight, RefreshCw,
} from "lucide-react";
import { getAllVehicles } from "../../../../axios/api/vehicle";
import { getAllTrailers } from "../../../../axios/api/trailer";
import { getAllDrivers } from "../../../../axios/api/driver";

interface Stats {
  totalTrucks: number;
  totalTrailers: number;
  totalDrivers: number;
}

const StatCard = ({
  icon, label, value, sub, color, onClick, bgStyle
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  sub?: string;
  color: string;
  bgStyle: React.CSSProperties;
  onClick?: () => void;
}) => (
  <div
    onClick={onClick}
    style={bgStyle}
    className={`rounded-xl p-5 shadow-sm border border-white/10 flex items-start gap-4 ${onClick ? "cursor-pointer hover:shadow-lg hover:brightness-110 transition-all group" : ""}`}
  >
    <div className="rounded-xl p-3 flex-shrink-0 bg-white/10">
      <span className={color}>{icon}</span>
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-xs text-white/60 font-medium uppercase tracking-wider mb-1">{label}</p>
      <p className="text-2xl font-bold text-white">{value}</p>
      {sub && <p className="text-xs text-white/50 mt-0.5">{sub}</p>}
    </div>
    {onClick && (
      <ArrowRight
        size={16}
        className="text-white/30 group-hover:text-white/80 transition-colors mt-1 flex-shrink-0"
      />
    )}
  </div>
);

const Dashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<Stats>({
    totalTrucks: 0,
    totalTrailers: 0,
    totalDrivers: 0,
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [tRes, trRes, dRes] = await Promise.all([
        getAllVehicles(1, 500),
        getAllTrailers(1, 500),
        getAllDrivers(1, 500),
      ]);

      setStats({
        totalTrucks: tRes?.pagination?.total || tRes?.data?.length || 0,
        totalTrailers: trRes?.pagination?.total || trRes?.data?.length || 0,
        totalDrivers: dRes?.pagination?.total || dRes?.data?.length || 0,
      });
    } catch {
      setError("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div className="p-6 min-h-screen bg-main">
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[var(--accent-blue)]" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 min-h-screen bg-main">
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-headings">Dashboard</h1>
          <p className="text-sm text-secondary mt-0.5">Manifest portal overview</p>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-2 px-4 py-2 bg-card rounded-lg shadow-sm border border-theme text-sm text-secondary hover:border-[var(--accent-blue)] hover:text-[var(--accent-blue)] transition-colors"
        >
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-4 bg-card border border-red-100 rounded-xl text-red-700 text-sm mb-5">
          <AlertCircle size={16} />{error}
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <StatCard
          icon={<Truck size={22} />}
          label="Trucks"
          value={stats.totalTrucks}
          sub="In fleet"
          color="text-[#4eecd8]"
          bgStyle={{ background: "linear-gradient(135deg, #0d3d3a 0%, #0a4f4a 60%, #0d5e58 100%)" }}
          onClick={() => navigate("/admin/manifest/trucks")}
        />
        <StatCard
          icon={<Package size={22} />}
          label="Trailers"
          value={stats.totalTrailers}
          sub="In fleet"
          color="text-[#42aeec]"
          bgStyle={{ background: "linear-gradient(135deg, #0a2a4a 0%, #0d3d6e 60%, #0f4d87 100%)" }}
          onClick={() => navigate("/admin/manifest/trailers")}
        />
        <StatCard
          icon={<Users size={22} />}
          label="Drivers"
          value={stats.totalDrivers}
          sub="Active staff"
          color="text-[#b78aff]"
          bgStyle={{ background: "linear-gradient(135deg, #2a1060 0%, #3b1a7a 60%, #4a2090 100%)" }}
          onClick={() => navigate("/admin/manifest/drivers")}
        />
      </div>
    </div>
  );
};

export default Dashboard;