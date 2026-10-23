import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  LineChart,
  Line,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts";
import { COLORS, hexToRgba, getStatusColor } from '../../../theme/colors';
import {
  FaShieldAlt,
  FaExclamationTriangle,
  FaClipboardList,
  FaFileContract,
  FaChartLine,
  FaUserInjured,
  FaTools,
  FaChevronRight,
} from '../../../theme/icons';
import { getUserRole } from '../../../utils/auth';
import {
  getDashboardStats,
  getRecentActivity,
  getUpcomingTasks,
} from '../../../axios/api/healthSafety';
import { getGpsVehicleDashboardStats } from '../../../axios/api/distapcher';

/* ===========================
   STAT CARD (HR DASHBOARD STYLE)
=========================== */
interface StatCardProps {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  color: string;
  className: string;
  trend?: {
    value: number;
    direction: 'up' | 'down';
    label: string;

  };
  onClick?: () => void;
  urgent?: boolean;
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon,
  color,
  trend,
  onClick,
  urgent,
  className
}) => {
  return (
    <div
      onClick={onClick}
      className={` ${className} rounded-lg p-3 shadow-sm border border-theme
  hover:shadow-md hover:border-[var(--accent-blue)]/20
  transition-all cursor-pointer
  hover:scale-[1.02] active:scale-[0.98]`}
    >
      <div className="flex items-start justify-between mb-2">
        <div>
          <h3 className="text-sm font-bold text-primary mb-1">
            {title}
          </h3>

          <span className="text-xl font-bold text-primary">
            {value}
          </span>

          {trend && (
            <p
              className={`text-xs mt-0.5 ${trend.direction === 'up'
                ? 'text-[#A855F7]'
                : 'text-green-600'
                }`}
            >
              {trend.direction === 'up' ? '↑' : '↓'} {trend.value}% {trend.label}
            </p>
          )}
        </div>

        <div
          className="rounded-lg p-2"
          style={{ backgroundColor: hexToRgba(color, 0.15) }}
        >
          <div style={{ color }}>{icon}</div>
        </div>
      </div>

      {urgent && (
        <span className="text-xs font-semibold text-[#A855F7]">
          Requires attention
        </span>
      )}
    </div>
  );
};

/* ===========================
   MAIN DASHBOARD
=========================== */
const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const role = getUserRole();
  const basePath =
    role === 'safety officer'
      ? '/healthandsafety'
      : '/admin/healthandsafety';

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>({
    overdueCAPA: 0,
    policyGaps: 0,
    expiredCertificates: 0,
    openIncidents: 0,
    totalIncidents: 0,
    openHazards: 0,
    overdueInspections: 0,
    activeRTWCases: 0,
  });

  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [upcomingTasks, setUpcomingTasks] = useState<any[]>([]);
  const [gpsDashboardData, setGpsDashboardData] = useState<any>(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [statsRes, activityRes, tasksRes, gpsRes] = await Promise.all([
        getDashboardStats(),
        getRecentActivity(10),
        getUpcomingTasks(),
        getGpsVehicleDashboardStats(),
      ]);

      if (statsRes?.success) setStats(statsRes.data || {});
      if (activityRes?.success) setRecentActivity(activityRes.data || []);
      if (tasksRes?.success) setUpcomingTasks(tasksRes.data || []);
      if (gpsRes?.success) setGpsDashboardData(gpsRes.data || null);
    } finally {
      setLoading(false);
    }
  };

  // Check if GPS data has values
  const hasWatchingData = gpsDashboardData?.watchingReport &&
    Array.isArray(gpsDashboardData.watchingReport) &&
    gpsDashboardData.watchingReport.some((item: any) => item.value > 0);

  const hasUtilizationData = gpsDashboardData?.driverUtilizationData &&
    Array.isArray(gpsDashboardData.driverUtilizationData) &&
    gpsDashboardData.driverUtilizationData.some((item: any) => item.value > 0);

  const hasSpeedingData = gpsDashboardData?.speedingData &&
    Array.isArray(gpsDashboardData.speedingData) &&
    gpsDashboardData.speedingData.some((item: any) => item.speeding > 0 || item.events > 0);

  // Use real data if available, otherwise use placeholder data
  const watchingReportData = gpsDashboardData?.watchingReport || Array.from({ length: 24 }, (_, i) => ({
    name: String(i).padStart(2, '0'),
    value: 0
  }));

  const driverUtilizationData = gpsDashboardData?.driverUtilizationData || [
    { day: "Mon", value: 0 },
    { day: "Tue", value: 0 },
    { day: "Wed", value: 0 },
    { day: "Thu", value: 0 },
    { day: "Fri", value: 0 },
    { day: "Sat", value: 0 },
    { day: "Sun", value: 0 },
  ];

  const speedingData = gpsDashboardData?.speedingData || [
    { month: "SEP", speeding: 0, events: 0 },
    { month: "OCT", speeding: 0, events: 0 },
    { month: "NOV", speeding: 0, events: 0 },
    { month: "DEC", speeding: 0, events: 0 },
    { month: "JAN", speeding: 0, events: 0 },
    { month: "FEB", speeding: 0, events: 0 },
  ];

  const safetyScore = gpsDashboardData?.safetyScore || 0;

  // Custom Circular Progress Component
  const CircularProgress = ({ percentage }: { percentage: number }) => {
    const radius = 85;
    const strokeWidth = 12;
    const normalizedRadius = radius - strokeWidth * 2;
    const circumference = normalizedRadius * 2 * Math.PI;
    const strokeDasharray = `${circumference} ${circumference}`;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;

    // Use lighter colors if no data
    const hasData = percentage > 0;

    return (
      <div className="relative flex items-center justify-center">
        <svg
          height={radius * 2}
          width={radius * 2}
          className="transform -rotate-90"
        >
          <circle
            stroke="#E5E7EB"
            fill="transparent"
            strokeWidth={strokeWidth}
            r={normalizedRadius}
            cx={radius}
            cy={radius}
          />
          <circle
            stroke={hasData ? "url(#gradient)" : "#E0F2FE"}
            fill="transparent"
            strokeWidth={strokeWidth}
            strokeDasharray={strokeDasharray}
            style={{ strokeDashoffset }}
            strokeLinecap="round"
            r={normalizedRadius}
            cx={radius}
            cy={radius}
          />
          <defs>
            <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="var(--accent-blue)" />
              <stop offset="100%" stopColor="var(--accent-blue)" />
            </linearGradient>
          </defs>
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-base mb-2 ${hasData ? 'text-secondary' : 'text-secondary'}`}>
            Safety Score
          </span>
          <span className={`text-2xl font-bold ${hasData ? 'text-primary' : 'text-secondary'}`}>
            {percentage}%
          </span>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-main">
        <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-blue-500"></div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-main">
        <div className="relative w-full mx-auto p-2">
          {/* Gradient Header */}
          <div
            className="absolute inset-x-0 top-0 h-[101px]"

          />

          <div className="relative z-10 px-4 pt-3 pb-6">
            {/* Header */}
            <div className="mb-4 flex items-center justify-between">
              <h1 className="text-xl font-bold text-white">
                Health & Safety Dashboard
              </h1>


            </div>

            {/* Critical Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
              <StatCard
                title="Overdue CAPA"
                value={stats.overdueCAPA}
                icon={<FaTools size={21} />}
                color={COLORS.status.danger}
                className="bg-[var(--accent-red)]/20"
                urgent={stats.overdueCAPA > 0}
                onClick={() =>
                  navigate(`${basePath}/committee-capa?filter=overdue`)
                }
              />

              <StatCard
                title="Policy Gaps"
                value={stats.policyGaps}
                icon={<FaFileContract size={21} />}
                color={COLORS.status.warning}
                className="bg-[var(--accent-orange)]/20"
              />

              <StatCard
                title="Expired Certificates"
                value={stats.expiredCertificates}
                icon={<FaClipboardList size={21} />}
                color={COLORS.status.warning}
                className="bg-[var(--accent-amber)]/20"
              />

              <StatCard
                title="Open Incidents"
                value={stats.openIncidents}
                icon={<FaExclamationTriangle size={21} />}
                color={COLORS.modules.incident}
                className="bg-[var(--accent-red)]/20"
              />
            </div>

            {/* Secondary Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-6 border border-theme rounded-xl p-3">

              <StatCard
                title="Total Incidents"
                value={stats.totalIncidents}
                icon={<FaChartLine size={21} />}
                color={COLORS.modules.reports}
                className="bg-[var(--accent-blue)]/20"
              />

              <StatCard
                title="Open Hazards"
                value={stats.openHazards}
                icon={<FaShieldAlt size={21} />}
                color={COLORS.modules.hazard}
                className="bg-[var(--accent-amber)]/20"
              />

              <StatCard
                title="Overdue Inspections"
                value={stats.overdueInspections}
                icon={<FaClipboardList size={21} />}
                color={COLORS.modules.inspection}
                className="bg-[var(--accent-navyblue)]/20"
              />

              <StatCard
                title="RTW Cases"
                value={stats.activeRTWCases}
                icon={<FaUserInjured size={21} />}
                color={COLORS.modules.committee}
                className="bg-[var(--accent-purple)]/20"
              />

            </div>

            {/* Charts Section - Moved from GPS Dashboard */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
              {/* Watching Report */}
              <div className="bg-card p-4 rounded-lg shadow-sm">
                <h3 className="text-sm font-bold text-headings mb-3">Watching Report</h3>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={watchingReportData}
                      barCategoryGap="20%"
                      style={{ backgroundColor: 'transparent' }} // ✅ remove bg
                    >
                      <XAxis
                        dataKey="name"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: 'var(--text-secondary)', fontSize: 12 }}
                      />

                      <YAxis hide />

                      <Tooltip
                        cursor={{ fill: 'transparent' }} // 🚀 MOST IMPORTANT (removes grey hover)
                        wrapperStyle={{
                          background: 'transparent',
                          outline: 'none'
                        }}
                        contentStyle={{
                          backgroundColor: 'var(--bg-card)',
                          border: '1px solid var(--border-color)',
                          borderRadius: '8px',
                          color: 'var(--text-primary)',
                          boxShadow: '0 8px 20px rgba(0,0,0,0.4)'
                        }}
                        itemStyle={{ color: 'var(--text-primary)' }}
                        labelStyle={{ color: 'var(--text-secondary)' }}
                      />

                      <Bar
                        dataKey="value"
                        fill={hasWatchingData ? "url(#barGradient)" : "var(--bg-secondary)"}
                        radius={[6, 6, 6, 6]}
                      />

                      <defs>
                        <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="var(--accent-blue)" />
                          <stop offset="100%" stopColor="var(--accent-blue)" />
                        </linearGradient>
                      </defs>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Driver Utilization */}
              <div className="bg-card p-4 rounded-lg shadow-sm">
                <h3 className="text-sm font-bold text-primary mb-3">Driver Utilization</h3>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={driverUtilizationData}>
                      <XAxis
                        dataKey="day"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#9CA3AF', fontSize: 12 }}
                      />
                      <YAxis hide />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#1F2937',
                          border: 'none',
                          borderRadius: '8px',
                          color: 'white'
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="value"
                        stroke={hasUtilizationData ? "var(--accent-blue)" : "#BAE6FD"}
                        strokeWidth={3}
                        dot={{ fill: hasUtilizationData ? 'var(--accent-blue)' : '#BAE6FD', strokeWidth: 0, r: 4 }}
                        activeDot={{ r: 6, fill: hasUtilizationData ? 'var(--accent-blue)' : '#BAE6FD' }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Driver Safety Scorecard */}
              <div className="bg-card p-4 rounded-lg shadow-sm">
                <h3 className="text-sm font-bold text-headings mb-3">Driver Safety Scorecard</h3>
                <div className="flex justify-center items-center h-48">
                  <CircularProgress percentage={safetyScore} />
                </div>
              </div>
            </div>

            {/* Speeding Violations */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-6">
              <div className="bg-card p-4 rounded-lg shadow-sm">
                <h3 className="text-sm font-bold text-headings mb-3">Speeding Violations</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={speedingData}>
                      <XAxis
                        dataKey="month"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#9CA3AF', fontSize: 12 }}
                      />
                      <YAxis hide />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#1F2937',
                          border: 'none',
                          borderRadius: '8px',
                          color: 'white'
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="speeding"
                        stackId="1"
                        stroke={hasSpeedingData ? "var(--accent-blue)" : "#E0F2FE"}
                        fill={hasSpeedingData ? "url(#speedingGradient)" : "#F0F9FF"}
                        strokeWidth={2}
                      />
                      <Area
                        type="monotone"
                        dataKey="events"
                        stackId="2"
                        stroke={hasSpeedingData ? "var(--accent-blue)" : "#BAE6FD"}
                        fill={hasSpeedingData ? "url(#eventsGradient)" : "#E0F2FE"}
                        strokeWidth={2}
                      />
                      <defs>
                        <linearGradient id="speedingGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="var(--accent-blue)" stopOpacity={0.3} />
                          <stop offset="100%" stopColor="var(--accent-blue)" stopOpacity={0.1} />
                        </linearGradient>
                        <linearGradient id="eventsGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="var(--accent-blue)" stopOpacity={0.3} />
                          <stop offset="100%" stopColor="var(--accent-blue)" stopOpacity={0.1} />
                        </linearGradient>
                      </defs>
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex items-center justify-center space-x-6 mt-4">
                  <div className="flex items-center space-x-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: hasSpeedingData ? 'var(--accent-blue)' : '#E0F2FE' }}
                    ></div>
                    <span className={`text-sm ${hasSpeedingData ? 'text-secondary' : 'text-secondary'}`}>
                      Speeding %
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: hasSpeedingData ? 'var(--accent-blue)' : '#BAE6FD' }}
                    ></div>
                    <span className={`text-sm ${hasSpeedingData ? 'text-secondary' : 'text-secondary'}`}>
                      Speeding Events
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Recent Activity */}
              <div className="lg:col-span-2 bg-card rounded-lg p-4 shadow-sm border border-theme">
                <h2 className="text-sm font-bold text-primary mb-3">
                  Recent Activity
                </h2>

                <div className="space-y-2">
                  {recentActivity.length === 0 ? (
                    <p className="text-xs text-secondary text-center py-4">
                      No recent activity
                    </p>
                  ) : (
                    recentActivity.map((a) => {
                      const status = getStatusColor(a.status);
                      return (
                        <div
                          key={a.id}
                          className="flex items-start gap-3 p-3 rounded-lg hover:bg-[rgba(255,255,255,0.03)] border border-theme"
                        >
                          <div
                            className="p-2 rounded-lg"
                            style={{
                              backgroundColor: status.bg,
                              color: status.text,
                            }}
                          >
                            <FaExclamationTriangle size={14} />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-primary">
                              {a.title}
                            </p>
                            <p className="text-xs text-secondary">
                              {a.description}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Upcoming Tasks */}
              <div className="bg-card rounded-lg p-4 shadow-sm border border-theme">
                <h2 className="text-sm font-bold text-primary mb-3">
                  Upcoming Tasks
                </h2>

                <div className="space-y-2">
                  {upcomingTasks.length === 0 ? (
                    <p className="text-xs text-secondary text-center py-4">
                      No upcoming tasks
                    </p>
                  ) : (
                    upcomingTasks.map((t) => (
                      <div
                        key={t.id}
                        className="flex items-center justify-between p-2 rounded-lg border border-theme hover:bg-[rgba(255,255,255,0.03)]"
                      >
                        <div>
                          <p className="text-sm font-medium text-primary">
                            {t.title}
                          </p>
                          <p className="text-xs text-secondary">{t.date}</p>
                        </div>
                        <FaChevronRight size={14} className="text-secondary" />
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Dashboard;
