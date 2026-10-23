import React, { useState, useEffect, useCallback } from "react";
import {
  LayoutGrid,
  CheckCircle,
  Play,
  TrendingUp,
  DollarSign,
  Wrench,
  Package,
  ChevronDown,
  Calendar,
  ArrowRight,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getUserRole } from "../../../../utils/auth";
import { getMechanicDashboard, type MechanicDashboardData } from "../../../../axios/api/mechanicOrders";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const userRole = getUserRole();
  const basePath = userRole === "Maintenance Crew (Mechanics)" ? "/mechanics" : "/admin/mechanics";

  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [selectedYear,] = useState(now.getFullYear());
  const [monthDropdownOpen, setMonthDropdownOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<MechanicDashboardData>({
    total: 0,
    completed: 0,
    pending: 0,
    completionRate: 0,
    myAssigned: 0,
    myCompleted: 0,
    myPending: 0,
    totalRepairAmount: 0,
    avgRepairCost: 0,
    recentOrders: [],
  });

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getMechanicDashboard({
        month: selectedMonth + 1,
        year: selectedYear,
      });
      if (res?.success && res?.data) {
        setStats(res.data);
      } else {
        setError(res?.message || "Failed to load dashboard");
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || "Failed to load dashboard");
      setStats((prev) => ({ ...prev, recentOrders: [] }));
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, selectedYear]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const recentOrders = stats.recentOrders || [];

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0 }).format(n);

  const statusBadge = (status: string) => {
    const s = (status || "").toLowerCase();
    const styles: Record<string, string> = {
      completed: "bg-green-100 text-green-800",
      "in-progress": "bg-blue-100 text-blue-800",
      pending: "bg-amber-100 text-amber-800",
      created: "bg-card text-headings",
      assigned: "bg-amber-100 text-amber-800",
      shared: "bg-amber-100 text-amber-800",
    };
    const style = styles[s] || "bg-card text-headings";
    return (
      <span className={`px-2 py-0.5 rounded text-xs font-medium ${style}`}>
        {status}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="p-6 min-h-screen bg-main ">
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[var(--accent-blue)]" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 min-h-screen bg-main">
      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-card px-4 py-3 text-red-800">
          {error}
        </div>
      )}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-bold text-headings">Mechanics Dashboard</h1>
          <p className="text-sm text-secondary mt-1">Overview of maintenance orders for the selected month</p>
        </div>

        <div className="relative">
          <button
            onClick={() => setMonthDropdownOpen(!monthDropdownOpen)}
            className="flex items-center gap-2 px-4 py-2.5 bg-card border border-theme rounded-lg hover:bg-[rgba(255,255,255,0.03)] hover:border-gray-400 transition"
          >
            <Calendar className="text-secondary" size={18} />
            <span className="text-sm font-medium text-headings">
              {MONTHS[selectedMonth]} {selectedYear}
            </span>
            <ChevronDown className={`text-secondary transition ${monthDropdownOpen ? "rotate-180" : ""}`} size={16} />
          </button>
          {monthDropdownOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setMonthDropdownOpen(false)}
              />
              <div className="absolute right-0 mt-1 z-20 bg-card rounded-lg shadow-lg border border-theme py-2 min-w-[200px] overflow-y-auto max-h-64">
                {Array.from({ length: 12 }, (_, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setSelectedMonth(i);
                      setMonthDropdownOpen(false);
                    }}
                    className={`w-full px-4 py-2 text-left text-sm hover:bg-[rgba(255,255,255,0.03)] ${selectedMonth === i ? "bg-[var(--accent-blue)]/10 text-[var(--accent-blue)] font-medium" : "text-headings"
                      }`}
                  >
                    {MONTHS[i]} {selectedYear}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="p-4 rounded-lg border-2 border-theme bg-card hover:border-[var(--accent-blue)]/40 transition">
          <div className="flex items-center gap-2">
            <LayoutGrid className="text-[var(--accent-blue)]" size={20} />
            <span className="text-sm font-medium text-[var(--accent-blue)]">Total Orders</span>
          </div>
          <p className="text-2xl font-bold  mt-1">{stats.total}</p>
          <p className="text-xs text-secondary mt-0.5">This month</p>
        </div>

        <div className="p-4 rounded-lg border-2 border-theme bg-card hover:border-green-500/40 transition">
          <div className="flex items-center gap-2">
            <CheckCircle className="text-green-600" size={20} />
            <span className="text-sm font-medium text-[var(--accent-green)]">Completed</span>
          </div>
          <p className="text-2xl font-bold  mt-1">{stats.completed}</p>
          <p className="text-xs text-secondary  mt-0.5">This month</p>
        </div>

        <div className="p-4 rounded-lg border-2 border-theme bg-card hover:border-amber-500/40 transition">
          <div className="flex items-center gap-2">
            <Play className="text-amber-600" size={20} />
            <span className="text-sm font-medium text-[var(--accent-amber)]">Pending</span>
          </div>
          <p className="text-2xl font-bold text-primary mt-1">{stats.pending}</p>
          <p className="text-xs text-secondary mt-0.5">This month</p>
        </div>

        <div className="p-4 rounded-lg border-2 border-theme bg-card hover:border-[var(--accent-blue)]/40 transition">
          <div className="flex items-center gap-2">
            <TrendingUp className="text-[var(--accent-blue)]" size={20} />
            <span className="text-sm font-medium text-[var(--accent-blue)]">Completion Rate</span>
          </div>
          <p className="text-2xl font-bold text-primary mt-1">{stats.completionRate}%</p>
          <p className="text-xs text-secondary mt-0.5">This month</p>
        </div>
      </div>

      {/* My Workload / Workload Overview & Financial */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6 ">
        <div className="p-5 rounded-lg border border-theme bg-card ">
          <h2 className="text-sm font-bold text-headings mb-4 flex items-center gap-2">
            <Wrench className="text-[var(--accent-navyblue)]" size={18} />
            {userRole === "Maintenance Crew (Mechanics)" ? "My Workload" : "Workload Overview"}
          </h2>
          <div className="grid grid-cols-3 gap-4 ">
            <div className="p-3 rounded-lg bg-card border-2 border-theme">
              <p className="text-xs text-secondary">Assigned</p>
              <p className="text-lg font-bold text-primary">{stats.myAssigned}</p>
            </div>
            <div className="p-3 rounded-lg bg-card border-2 border-theme">
              <p className="text-xs text-[var(--accent-green)]">Completed</p>
              <p className="text-lg font-bold text-[var(--accent-green)]">{stats.myCompleted}</p>
            </div>
            <div className="p-3 rounded-lg bg-card border-2 border-theme">
              <p className="text-xs text-[var(--accent-amber)]">Pending</p>
              <p className="text-lg font-bold text-[var(--accent-amber)]">{stats.myPending}</p>
            </div>
          </div>
        </div>

        <div className="p-5 rounded-lg border border-theme bg-card">
          <h2 className="text-sm font-bold text-headings mb-4 flex items-center gap-2">
            <DollarSign className="text-[var(--accent-navyblue)]" size={18} />
            Repair Summary
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 rounded-lg bg-card">
              <p className="text-xs text-secondary">Total Repair Amount</p>
              <p className="text-lg font-bold text-headings">{formatCurrency(stats.totalRepairAmount)}</p>
            </div>
            <div className="p-3 rounded-lg bg-card">
              <p className="text-xs text-secondary">Avg Repair Cost</p>
              <p className="text-lg font-bold text-headings">{formatCurrency(stats.avgRepairCost)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Orders */}
      <div className="bg-card rounded-lg shadow-sm border border-theme overflow-hidden ">
        <div className="px-4 py-3 border-b border-theme bg-gradient-to-r from-[var(--accent-blue)]/5 to-transparent flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-sm font-bold text-headings flex items-center gap-2">
              <Package className="text-[var(--accent-navyblue)]" size={18} />
              Recent Orders
            </h2>
            <p className="text-xs text-secondary mt-0.5">Last 5 orders</p>
          </div>
          <button
            onClick={() => navigate(`${basePath}/orders`)}
            className="flex items-center gap-2 text-sm font-medium text-[var(--accent-blue)] hover:text-[#3598c4] transition"
          >
            View all orders
            <ArrowRight size={16} />
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-card border-b border-theme">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-headings uppercase">Unit</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-headings uppercase">Description</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-headings uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-headings uppercase">Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-headings uppercase">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-theme divide-white/5">
              {recentOrders.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-secondary">
                    No recent orders
                  </td>
                </tr>
              ) : (
                recentOrders.map((order) => (
                  <tr
                    key={order.id}
                    className="hover:bg-[rgba(255,255,255,0.03)] cursor-pointer transition"
                    onClick={() => navigate(`${basePath}/orders`)}
                  >
                    <td className="px-4 py-3 text-sm font-medium text-secondary">{order.unit}</td>
                    <td className="px-4 py-3 text-sm text-secondary">{order.description}</td>
                    <td className="px-4 py-3">{statusBadge(order.status ?? '')}</td>
                    <td className="px-4 py-3 text-sm text-secondary">
                      {order.date
                        ? new Date(order.date).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })
                        : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`${basePath}/orders`);
                        }}
                        className="text-sm font-medium text-[var(--accent-blue)] hover:text-[#3598c4]"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

