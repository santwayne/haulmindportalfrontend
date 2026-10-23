import { useState, useEffect } from "react";
import { DollarSign, Truck, TrendingUp, Calendar, X } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  Legend,
} from "recharts";
import { getRevenuePerMile, type VehicleRevenueData, type MonthlyTrendData } from "../../../../../axios/api/analytics.revenuePerMile";

const RevenuePerMilePage = () => {


  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [vehicleRevenueData, setVehicleRevenueData] = useState<VehicleRevenueData[]>([]);
  const [monthlyTrendData, setMonthlyTrendData] = useState<MonthlyTrendData[]>([]);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalMiles, setTotalMiles] = useState(0);
  const [averageRevenuePerMile, setAverageRevenuePerMile] = useState(0);
  const [, setTotalVehicles] = useState(0);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [showDateFilter, setShowDateFilter] = useState(false);

  // Fetch revenue per mile data
  useEffect(() => {
    fetchRevenuePerMile();
  }, []);

  const fetchRevenuePerMile = async (dateParams?: { startDate?: string; endDate?: string }) => {
    setLoading(true);
    try {
      const params = dateParams || {};
      const response = await getRevenuePerMile(
        params.startDate || startDate || undefined,
        params.endDate || endDate || undefined
      );

      if (response.success) {
        setVehicleRevenueData(response.data.vehicleRevenue || []);
        setMonthlyTrendData(response.data.monthlyTrend || []);
        setTotalRevenue(response.data.summary.totalRevenue || 0);
        setTotalMiles(response.data.summary.totalMiles || 0);
        setAverageRevenuePerMile(response.data.summary.averageRevenuePerMile || 0);
        setTotalVehicles(response.data.summary.totalVehicles || 0);
      }
    } catch (error) {
      console.error("Error fetching revenue per mile data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDateFilter = () => {
    fetchRevenuePerMile({ startDate, endDate });
    setShowDateFilter(false);
  };

  const clearFilters = () => {
    setStartDate("");
    setEndDate("");
    setSearchTerm("");
    fetchRevenuePerMile({ startDate: "", endDate: "" });
  };

  const filteredData = vehicleRevenueData.filter(
    (item) =>
      item.unitNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.plateNumber.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen" >
      <div className="relative w-full mx-auto">


        {/* Main content */}
        <div className="relative z-10 px-4 pt-3 pb-6">
          {/* Header Section */}
          <div className="mb-4 relative z-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-bold text-primary">Revenue Per Mile</h1>
              </div>
              <div className="flex items-center gap-2">
                {/* Date Filter Toggle */}
                <button
                  onClick={() => setShowDateFilter(!showDateFilter)}
                  className="px-4 py-2 bg-card border border-theme rounded-lg hover:bg-[rgba(255,255,255,0.03)] flex items-center gap-2 transition-colors text-sm"
                >
                  <Calendar size={18} />
                  Date Filter
                </button>

                {/* Clear Filters */}
                {(startDate || endDate || searchTerm) && (
                  <button
                    onClick={clearFilters}
                    className="px-4 py-2 bg-card border border-theme rounded-lg hover:bg-[rgba(255,255,255,0.03)] flex items-center gap-2 transition-colors text-sm text-[#A855F7]"
                  >
                    <X size={18} />
                    Clear
                  </button>
                )}
              </div>
            </div>

            {/* Date Filter Panel */}
            {showDateFilter && (
              <div className="mt-4 bg-card rounded-lg shadow-sm border border-theme p-4">
                <div className="flex flex-wrap items-end gap-4">
                  <div className="flex-1 min-w-[200px]">
                    <label className="block text-sm font-medium text-primary mb-2">Start Date</label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full px-4 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="flex-1 min-w-[200px]">
                    <label className="block text-sm font-medium text-primary mb-2">End Date</label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full px-4 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <button
                    onClick={handleDateFilter}
                    className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                  >
                    Apply Filter
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="bg-card rounded-lg p-4 shadow-sm border border-theme">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-secondary mb-1">Average Revenue/Mile</p>
                  <p className="text-2xl font-bold text-primary">${averageRevenuePerMile.toFixed(2)}</p>
                </div>
                <div className="bg-green-50 rounded-lg p-3">
                  <DollarSign className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </div>

            <div className="bg-card rounded-lg p-4 shadow-sm border border-theme">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-secondary mb-1">Total Revenue</p>
                  <p className="text-2xl font-bold text-primary">${totalRevenue.toLocaleString()}</p>
                </div>
                <div className="bg-card rounded-lg p-3">
                  <TrendingUp className="w-6 h-6 text-[var(--accent-navyblue)]" />
                </div>
              </div>
            </div>

            <div className="bg-card rounded-lg p-4 shadow-sm border border-theme">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-secondary mb-1">Total Miles</p>
                  <p className="text-2xl font-bold text-primary">{totalMiles.toLocaleString()}</p>
                </div>
                <div className="bg-card rounded-lg p-3">
                  <Truck className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </div>
          </div>

          {/* Charts Section */}
          {loading ? (
            <div className="flex justify-center items-center py-12 bg-card rounded-lg shadow-sm border border-theme">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--accent-blue)]"></div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
                {/* Revenue Per Mile by Truck - Bar Chart */}
                <div className="bg-card rounded-lg shadow-sm border border-theme p-6">
                  <h2 className="text-lg font-semibold text-primary mb-4">
                    Revenue Per Mile by Truck
                  </h2>

                  {vehicleRevenueData.length > 0 ? (
                    <div style={{ width: "100%", height: 300 }}>
                      <ResponsiveContainer>
                        <BarChart data={vehicleRevenueData} barCategoryGap="20%">

                          {/* GRID */}
                          <CartesianGrid stroke="rgba(255,255,255,0.08)" />

                          {/* X AXIS */}
                          <XAxis
                            dataKey="plateNumber"
                            stroke="rgba(255,255,255,0.5)"
                            style={{ fontSize: "11px" }}
                          />

                          {/* Y AXIS */}
                          <YAxis
                            stroke="rgba(255,255,255,0.5)"
                            style={{ fontSize: "11px" }}
                            domain={[0, "dataMax + 1"]}   // ✅ ensures visibility
                            tickFormatter={(value) => `$${value.toFixed(2)}`}
                          />

                          {/* 🔥 TOOLTIP (FIXED CURSOR ISSUE) */}
                          <Tooltip
                            cursor={{ fill: "rgba(0,209,255,0.08)" }}   // ✅ NO MORE GREY BLOCK
                            contentStyle={{
                              backgroundColor: "#121A2B",
                              border: "1px solid rgba(255,255,255,0.1)",
                              borderRadius: "8px",
                              boxShadow: "0 4px 20px rgba(0,0,0,0.5)",
                              fontSize: "12px",
                              color: "#fff",
                            }}
                            formatter={(value) => `$${(value as number).toFixed(2)}`}
                          />

                          {/* 🔥 BAR */}
                          <Bar
                            dataKey="revenuePerMile"
                            fill="url(#revenueGradient)"
                            name="Revenue/Mile"
                            radius={[8, 8, 0, 0]}
                            minPointSize={5}
                            activeBar={{
                              fill: "url(#hoverGradient)",   // ✅ themed hover
                              stroke: "var(--accent-blue)",
                              strokeWidth: 1,
                              style: {
                                filter: "drop-shadow(0 0 8px rgba(0,209,255,0.5))",
                              },
                            }}
                          />

                          {/* 🔥 GRADIENTS */}
                          <defs>
                            {/* NORMAL */}
                            <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="var(--accent-blue)" stopOpacity={1} />
                              <stop offset="100%" stopColor="var(--accent-purple)" stopOpacity={0.7} />
                            </linearGradient>

                            {/* HOVER */}
                            <linearGradient id="hoverGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="var(--accent-blue)" stopOpacity={1} />
                              <stop offset="50%" stopColor="var(--accent-purple)" stopOpacity={0.9} />
                              <stop offset="100%" stopColor="#0B1220" stopOpacity={0.4} />
                            </linearGradient>
                          </defs>

                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="text-center py-12 text-secondary">
                      No data available
                    </div>
                  )}
                </div>

                {/* Monthly Trend - Line Chart */}
                <div className="bg-card rounded-lg shadow-sm border border-theme p-6">
                  <h2 className="text-lg font-semibold text-primary mb-4">Monthly Revenue Trend</h2>
                  {monthlyTrendData.length > 0 ? (
                    <div style={{ width: '100%', height: 300 }}>
                      <ResponsiveContainer>
                        <LineChart data={monthlyTrendData}>
                          <CartesianGrid stroke="rgba(255,255,255,0.08)" />
                          <XAxis
                            dataKey="month"
                            stroke="rgba(255,255,255,0.5)"
                            style={{ fontSize: '11px' }}
                          />
                          <YAxis
                            stroke="rgba(255,255,255,0.5)"
                            style={{ fontSize: '11px' }}
                            yAxisId="left"
                            tickFormatter={(value) => `$${value.toFixed(2)}`}
                          />
                          <YAxis
                            stroke="rgba(255,255,255,0.5)"
                            style={{ fontSize: '11px' }}
                            yAxisId="right"
                            orientation="right"
                            tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: '#121A2B',
                              border: '1px solid rgba(255,255,255,0.1)',
                              borderRadius: '8px',
                              boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
                              fontSize: '12px',
                              color: '#fff'
                            }}
                          />
                          <Legend />
                          <Line
                            yAxisId="left"
                            type="monotone"
                            dataKey="revenuePerMile"
                            stroke="var(--accent-blue)"
                            strokeWidth={2}
                            name="Revenue/Mile"
                            dot={{ fill: 'var(--accent-blue)', r: 4 }}
                          />
                          <Line
                            yAxisId="right"
                            type="monotone"
                            dataKey="totalRevenue"
                            stroke="#10b981"
                            strokeWidth={2}
                            name="Total Revenue"
                            dot={{ fill: '#10b981', r: 4 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="text-center py-12 text-secondary">
                      No trend data available
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Truck-wise Details Table */}
          <div className="bg-card rounded-lg shadow-sm border border-theme">
            <div className="px-6 py-4 border-b border-theme">
              <h2 className="text-lg font-semibold text-primary">Truck-wise Details</h2>
            </div>

            {/* Search Bar */}
            <div className="p-4 border-b border-theme">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search by truck ID or plate number..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-theme bg-card text-primary focus:ring-2 focus:ring-[var(--accent-blue)] focus:border-transparent"
                />
                <Truck className="absolute left-3 top-1/2 transform -translate-y-1/2 text-secondary w-5 h-5" />
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-card border-b border-theme">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-[var(--accent-navyblue)] uppercase tracking-wider">
                      Truck ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-[var(--accent-navyblue)] uppercase tracking-wider">
                      Plate Number
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-[var(--accent-navyblue)] uppercase tracking-wider">
                      Revenue Per Mile
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-[var(--accent-navyblue)] uppercase tracking-wider">
                      Total Miles
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-[var(--accent-navyblue)] uppercase tracking-wider">
                      Total Revenue
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-card divide-theme">
                  {filteredData.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-secondary">
                        No trucks found
                      </td>
                    </tr>
                  ) : (
                    filteredData.map((item) => (
                      <tr key={item.vehicleId} className="hover:bg-[rgba(255,255,255,0.03)] transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-primary">{item.unitNumber}</div>
                          {item.make && item.model && (
                            <div className="text-xs text-secondary">{item.make} {item.model}</div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-primary">{item.plateNumber}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-semibold text-green-600">
                            ${item.revenuePerMile.toFixed(2)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-primary">{item.totalMiles.toLocaleString()}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-primary">
                            ${item.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RevenuePerMilePage;

