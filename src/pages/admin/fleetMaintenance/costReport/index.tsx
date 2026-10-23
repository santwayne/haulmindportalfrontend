import { useState, useMemo } from 'react';
import {  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from 'recharts';
import { Calendar, Truck, DollarSign, Wrench, Filter, TrendingUp, TrendingDown } from 'lucide-react';

// Type definitions
interface CostReportItem {
  vehicleId: string;
  plateNumber: string;
  year: number;
  month: number;
  totalCost: number;
  workOrders: number;
}

interface Vehicle {
  id: string;
  plateNumber: string;
}

interface MonthlyData {
  month: string;
  totalCost: number;
  workOrders: number;
  vehicles: Set<string>;
}

interface ChartData {
  month: string;
  totalCost: number;
  workOrders: number;
  vehicleCount: number;
  avgCostPerVehicle: number;
}

interface VehicleBreakdown {
  plateNumber: string;
  totalCost: number;
  workOrders: number;
}

interface SummaryStats {
  totalCost: number;
  totalWorkOrders: number;
  uniqueVehicles: number;
  avgCostPerWorkOrder: number;
}

const CostReports = () => {
  const [selectedYear, setSelectedYear] = useState('2024');
  const [selectedVehicle, setSelectedVehicle] = useState('all');
  const [selectedDateRange, setSelectedDateRange] = useState('12months');

  // Static data based on the backend structure
  const costReportsData: CostReportItem[] = [
    {
      vehicleId: '1',
      plateNumber: 'ABC-123',
      year: 2024,
      month: 1,
      totalCost: 2500,
      workOrders: 3,
    },
    {
      vehicleId: '1',
      plateNumber: 'ABC-123',
      year: 2024,
      month: 2,
      totalCost: 1800,
      workOrders: 2,
    },
    {
      vehicleId: '1',
      plateNumber: 'ABC-123',
      year: 2024,
      month: 3,
      totalCost: 3200,
      workOrders: 4,
    },
    {
      vehicleId: '2',
      plateNumber: 'XYZ-456',
      year: 2024,
      month: 1,
      totalCost: 1900,
      workOrders: 2,
    },
    {
      vehicleId: '2',
      plateNumber: 'XYZ-456',
      year: 2024,
      month: 2,
      totalCost: 2300,
      workOrders: 3,
    },
    {
      vehicleId: '2',
      plateNumber: 'XYZ-456',
      year: 2024,
      month: 3,
      totalCost: 1600,
      workOrders: 1,
    },
    {
      vehicleId: '3',
      plateNumber: 'DEF-789',
      year: 2024,
      month: 1,
      totalCost: 2800,
      workOrders: 4,
    },
    {
      vehicleId: '3',
      plateNumber: 'DEF-789',
      year: 2024,
      month: 2,
      totalCost: 2100,
      workOrders: 2,
    },
    {
      vehicleId: '3',
      plateNumber: 'DEF-789',
      year: 2024,
      month: 3,
      totalCost: 2900,
      workOrders: 3,
    },
  ];

  const vehicles: Vehicle[] = [
    { id: 'all', plateNumber: 'All Vehicles' },
    { id: '1', plateNumber: 'ABC-123' },
    { id: '2', plateNumber: 'XYZ-456' },
    { id: '3', plateNumber: 'DEF-789' },
  ];

  const monthNames = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];

  // Filter and process data based on selections
  const filteredData = useMemo(() => {
    let filtered = costReportsData.filter(item => {
      if (selectedYear !== 'all' && item.year !== parseInt(selectedYear)) return false;
      if (selectedVehicle !== 'all' && item.vehicleId !== selectedVehicle) return false;
      return true;
    });

    return filtered;
  }, [selectedYear, selectedVehicle]);

  // Prepare chart data
  const monthlyChartData = useMemo((): ChartData[] => {
    const monthlyData: Record<string, MonthlyData> = {};
    
    filteredData.forEach(item => {
      const monthKey = `${item.year}-${item.month}`;
      const monthName = monthNames[item.month - 1];
      
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = {
          month: monthName,
          totalCost: 0,
          workOrders: 0,
          vehicles: new Set()
        };
      }
      
      monthlyData[monthKey].totalCost += item.totalCost;
      monthlyData[monthKey].workOrders += item.workOrders;
      monthlyData[monthKey].vehicles.add(item.plateNumber);
    });

    return Object.values(monthlyData).map(item => ({
      month: item.month,
      totalCost: item.totalCost,
      workOrders: item.workOrders,
      vehicleCount: item.vehicles.size,
      avgCostPerVehicle: Math.round(item.totalCost / item.vehicles.size)
    }));
  }, [filteredData]);

  // Vehicle breakdown for pie chart
  const vehicleBreakdown = useMemo((): VehicleBreakdown[] => {
    const breakdown: Record<string, VehicleBreakdown> = {};
    
    filteredData.forEach(item => {
      if (!breakdown[item.plateNumber]) {
        breakdown[item.plateNumber] = {
          plateNumber: item.plateNumber,
          totalCost: 0,
          workOrders: 0
        };
      }
      
      breakdown[item.plateNumber].totalCost += item.totalCost;
      breakdown[item.plateNumber].workOrders += item.workOrders;
    });

    return Object.values(breakdown);
  }, [filteredData]);

  // Calculate summary statistics
  const summaryStats = useMemo((): SummaryStats => {
    const totalCost = filteredData.reduce((sum, item) => sum + item.totalCost, 0);
    const totalWorkOrders = filteredData.reduce((sum, item) => sum + item.workOrders, 0);
    const uniqueVehicles = new Set(filteredData.map(item => item.plateNumber)).size;
    const avgCostPerWorkOrder = totalWorkOrders > 0 ? totalCost / totalWorkOrders : 0;

    return {
      totalCost,
      totalWorkOrders,
      uniqueVehicles,
      avgCostPerWorkOrder: Math.round(avgCostPerWorkOrder)
    };
  }, [filteredData]);

  const COLORS = ['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd', '#8c564b', '#e377c2', '#7f7f7f'];

  // Custom tooltip for charts
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card p-3 !border !border-theme rounded-lg shadow-lg">
          <p className="font-semibold text-primary">{`${label}`}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }}>
              {`${entry.dataKey === 'totalCost' ? 'Total Cost' : 'Work Orders'}: ${
                entry.dataKey === 'totalCost' ? `$${entry.value.toLocaleString()}` : entry.value
              }`}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="min-h-screen p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-primary mb-2">Maintenance Cost Reports</h1>
          <p className="text-secondary">Track and analyze vehicle maintenance costs and expenses</p>
        </div>

        {/* Filters */}
        <div className="bg-card rounded-lg shadow-sm !border border-theme p-6 mb-6">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-2">
              <Filter className="h-5 w-5 text-secondary" />
              <span className="font-medium text-primary">Filters:</span>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-sm text-secondary">Year:</span>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="px-3 py-2 !border !border-theme rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[120px]"
              >
                <option value="2024">2024</option>
                <option value="2023">2023</option>
                <option value="all">All Years</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-secondary">Vehicle:</span>
              <select
                value={selectedVehicle}
                onChange={(e) => setSelectedVehicle(e.target.value)}
                className="px-3 py-2 border !border-theme rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[140px]"
              >
                {vehicles.map(vehicle => (
                  <option key={vehicle.id} value={vehicle.id}>
                    {vehicle.plateNumber}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-secondary">Period:</span>
              <select
                value={selectedDateRange}
                onChange={(e) => setSelectedDateRange(e.target.value)}
                className="px-3 py-2 border border-theme rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[150px]"
              >
                <option value="12months">Last 12 Months</option>
                <option value="6months">Last 6 Months</option>
                <option value="3months">Last 3 Months</option>
              </select>
            </div>

            {/* <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
              <Download className="h-4 w-4" />
              Export Report
            </button> */}
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-card rounded-lg shadow-sm border !border-theme p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-secondary">Total Cost</p>
                <p className="text-2xl font-bold text-primary">${summaryStats.totalCost.toLocaleString()}</p>
              </div>
              <DollarSign className="h-8 w-8 text-green-600" />
            </div>
            <div className="mt-2 flex items-center text-sm">
              <TrendingUp className="h-4 w-4 text-green-600 mr-1" />
              <span className="text-green-600">12% vs last period</span>
            </div>
          </div>

          <div className="bg-card rounded-lg shadow-sm border border-theme p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-secondary">Work Orders</p>
                <p className="text-2xl font-bold text-primary">{summaryStats.totalWorkOrders}</p>
              </div>
              <Wrench className="h-8 w-8 text-[#00D1FF]" />
            </div>
            <div className="mt-2 flex items-center text-sm">
              <TrendingDown className="h-4 w-4 text-[#A855F7] mr-1" />
              <span className="text-[#A855F7]">5% vs last period</span>
            </div>
          </div>

          <div className="bg-card rounded-lg shadow-sm border-theme border p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-secondary">Vehicles</p>
                <p className="text-2xl font-bold text-primary">{summaryStats.uniqueVehicles}</p>
              </div>
              <Truck className="h-8 w-8 text-purple-600" />
            </div>
            <div className="mt-2 flex items-center text-sm">
              <span className="text-secondary">Active vehicles</span>
            </div>
          </div>

          <div className="bg-card rounded-lg shadow-sm border-theme border p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-secondary">Avg Cost/Order</p>
                <p className="text-2xl font-bold text-primary">${summaryStats.avgCostPerWorkOrder}</p>
              </div>
              <Calendar className="h-8 w-8 text-[#F59E0B]" />
            </div>
            <div className="mt-2 flex items-center text-sm">
              <TrendingUp className="h-4 w-4 text-green-600 mr-1" />
              <span className="text-green-600">8% vs last period</span>
            </div>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Monthly Cost and Work Orders Trend */}
          <div className="bg-card rounded-lg shadow-sm border-theme border p-6">
            <h3 className="text-lg font-semibold text-primary mb-4">Monthly Cost & Work Orders Analysis</h3>
            <ResponsiveContainer width="100%" height={350}>
              <LineChart data={monthlyChartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="month" 
                  stroke="#6b7280"
                  fontSize={12}
                  tickLine={false}
                  axisLine={{ stroke: '#e5e7eb' }}
                />
                <YAxis 
                  yAxisId="cost"
                  orientation="left"
                  stroke="#6b7280"
                  fontSize={12}
                  tickLine={false}
                  axisLine={{ stroke: '#e5e7eb' }}
                  tickFormatter={(value) => `$${value.toLocaleString()}`}
                />
                <YAxis 
                  yAxisId="orders"
                  orientation="right"
                  stroke="#6b7280"
                  fontSize={12}
                  tickLine={false}
                  axisLine={{ stroke: '#e5e7eb' }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend 
                  wrapperStyle={{ fontSize: '14px' }}
                  iconType="circle"
                />
                <Line 
                  yAxisId="cost"
                  type="monotone" 
                  dataKey="totalCost" 
                  stroke="#1f77b4" 
                  strokeWidth={3}
                  dot={{ fill: '#1f77b4', strokeWidth: 2, r: 5 }}
                  activeDot={{ r: 7, stroke: '#1f77b4', strokeWidth: 2 }}
                  name="Total Cost ($)"
                />
                <Line 
                  yAxisId="orders"
                  type="monotone" 
                  dataKey="workOrders" 
                  stroke="#ff7f0e" 
                  strokeWidth={3}
                  dot={{ fill: '#ff7f0e', strokeWidth: 2, r: 5 }}
                  activeDot={{ r: 7, stroke: '#ff7f0e', strokeWidth: 2 }}
                  name="Work Orders"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Vehicle Cost Distribution */}
          <div className="bg-card rounded-lg shadow-sm border-theme border p-6">
            <h3 className="text-lg font-semibold text-primary mb-4">Cost Distribution by Vehicle</h3>
            <div className="flex items-center justify-center">
              <div style={{ width: '70%', height: '350px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={vehicleBreakdown}
                      cx="50%"
                      cy="50%"
                      outerRadius={120}
                      innerRadius={60}
                      paddingAngle={3}
                      dataKey="totalCost"
                      stroke="#ffffff"
                      strokeWidth={2}
                      label={(props: any) =>
                        props.percent && props.percent > 0.05 ? `${props.plateNumber}` : ''
                      }
                      labelLine={false}
                    >
                      {vehicleBreakdown.map((_entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={COLORS[index % COLORS.length]} 
                        />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value, _name, props: any) => [
                        `${(value as number).toLocaleString()}`,
                        props.payload.plateNumber
                      ]}
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="ml-6">
                <div className="space-y-3">
                  {vehicleBreakdown.map((vehicle, index) => (
                    <div key={vehicle.plateNumber} className="flex items-center space-x-3">
                      <div 
                        className="w-4 h-4 rounded-full" 
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      ></div>
                      <div>
                        <div className="text-sm font-medium text-primary">{vehicle.plateNumber}</div>
                        <div className="text-xs text-secondary">${vehicle.totalCost.toLocaleString()}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

   

        {/* Detailed Table */}
        <div className="bg-card rounded-lg shadow-sm border !border-theme">
          <div className="px-6 py-4 !border-b !border-theme">
            <h3 className="text-lg font-semibold text-primary">Detailed Cost Breakdown</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-card">
                <tr className="border-b border-theme">
                  <th className="px-6 py-4 text-left text-xs font-semibold text-secondary uppercase tracking-wider border-0">
                    Vehicle
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-secondary uppercase tracking-wider border-0">
                    Month/Year
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-secondary uppercase tracking-wider border-0">
                    Total Cost
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-secondary uppercase tracking-wider border-0">
                    Work Orders
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-secondary uppercase tracking-wider border-0">
                    Avg Cost/Order
                  </th>
                </tr>
              </thead>
              <tbody className="bg-card">
                {filteredData.map((item, index) => (
                  <tr 
                    key={index} 
                    className={`border-0 hover:bg-card transition-colors duration-150 ${
                      index !== filteredData.length - 1 ? 'border-b border-theme' : ''
                    }`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap border-0">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                          <Truck className="h-4 w-4 text-[#00D1FF]" />
                        </div>
                        <span className="text-sm font-medium text-primary">{item.plateNumber}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary border-0">
                      {monthNames[item.month - 1]} {item.year}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap border-0">
                      <span className="text-sm font-semibold text-primary">
                        ${item.totalCost.toLocaleString()}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap border-0">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {item.workOrders} orders
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary border-0">
                      ${Math.round(item.totalCost / item.workOrders).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Vehicle Summary Cards */}
        <div className="mt-8">
          <h3 className="text-lg font-semibold text-primary mb-4">Vehicle Summary</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {vehicleBreakdown.map((vehicle, index) => (
              <div key={vehicle.plateNumber} className="bg-card rounded-lg shadow-sm border-theme border p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-primary">{vehicle.plateNumber}</h4>
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-secondary">Total Cost:</span>
                    <span className="font-medium">${vehicle.totalCost.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-secondary">Work Orders:</span>
                    <span className="font-medium">{vehicle.workOrders}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-secondary">Avg per Order:</span>
                    <span className="font-medium">${Math.round(vehicle.totalCost / vehicle.workOrders).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CostReports;