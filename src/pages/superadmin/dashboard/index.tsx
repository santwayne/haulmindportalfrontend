import { useState, useEffect } from 'react';
import {
  DollarSign,
  Building2,
  UserCheck,
  MoreHorizontal,
  ArrowUp,
  ArrowDown,
  Package
} from 'lucide-react';
import { getSuperAdminDashboard } from '../../../axios/api/superadmin';

const SuperAdminOverview = () => {
  const [selectedTimeRange, setSelectedTimeRange] = useState('30d');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dashboardData, setDashboardData] = useState<any>(null);

  useEffect(() => {
    fetchDashboardData();
  }, [selectedTimeRange]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getSuperAdminDashboard(selectedTimeRange);

      console.log('Dashboard API Response:', response);

      if (response?.success && response?.data) {
        console.log('Dashboard Data:', response.data);
        setDashboardData(response.data);
      } else {
        setError(response?.message || 'Failed to load dashboard data');
      }
    } catch (err: any) {
      console.error('Dashboard fetch error:', err);
      setError(err?.message || 'An error occurred while fetching dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (num: number) => {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(num);
  };

  const getStatusColor = (status: string) => {
    const statusLower = status.toLowerCase();
    switch (statusLower) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-blue-100 text-blue-800';
      case 'trial': return 'bg-blue-100 text-blue-800';
      case 'suspended': return 'bg-red-100 text-red-800';
      case 'cancelled': return 'bg-card text-primary';
      case 'no subscription': return 'bg-card text-primary';
      default: return 'bg-card text-primary';
    }
  };

  const getPlanColor = (plan: string) => {
    const planLower = plan.toLowerCase();
    if (planLower.includes('enterprise')) return 'bg-purple-100 text-purple-800';
    if (planLower.includes('professional')) return 'bg-blue-100 text-blue-800';
    if (planLower.includes('starter') || planLower.includes('basic')) return 'bg-green-100 text-green-800';
    return 'bg-card text-primary';
  };

  if (loading) {
    return (
      <div className="w-full flex items-center justify-center py-20">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-secondary">Loading dashboard data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full flex items-center justify-center py-20">
        <div className="text-center">
          <p className="text-[#A855F7] mb-4 text-lg font-medium">{error}</p>
          <button
            onClick={fetchDashboardData}
            className="px-6 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!dashboardData || !dashboardData.stats) {
    return (
      <div className="w-full flex items-center justify-center py-20">
        <div className="text-center">
          <p className="text-secondary mb-4 text-lg">No data available</p>
          <button
            onClick={fetchDashboardData}
            className="px-6 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const stats = dashboardData.stats;
  const recentCustomers = dashboardData.recentCustomers || [];

  // Debug logging
  console.log('Dashboard Data:', dashboardData);
  console.log('Stats object:', stats);
  console.log('Total Customers:', stats.totalCustomers, typeof stats.totalCustomers);
  console.log('Active Subscriptions:', stats.activeSubscriptions, typeof stats.activeSubscriptions);
  console.log('Current Month Revenue:', stats.currentMonthRevenue, typeof stats.currentMonthRevenue);

  const statsArray = [
    {
      title: 'Total Customers',
      value: typeof stats.totalCustomers === 'number' ? stats.totalCustomers.toLocaleString() : (stats.totalCustomers || '0'),
      change: typeof stats.customerGrowth === 'number' ? `${stats.customerGrowth >= 0 ? '+' : ''}${stats.customerGrowth.toFixed(1)}%` : '0%',
      trend: (typeof stats.customerGrowth === 'number' && stats.customerGrowth >= 0) ? 'up' : 'down',
      icon: Building2,
      color: 'bg-blue-500'
    },
    {
      title: 'Active Subscriptions',
      value: typeof stats.activeSubscriptions === 'number' ? stats.activeSubscriptions.toLocaleString() : (stats.activeSubscriptions || '0'),
      change: typeof stats.subscriptionGrowth === 'number' ? `${stats.subscriptionGrowth >= 0 ? '+' : ''}${stats.subscriptionGrowth.toFixed(1)}%` : '0%',
      trend: (typeof stats.subscriptionGrowth === 'number' && stats.subscriptionGrowth >= 0) ? 'up' : 'down',
      icon: UserCheck,
      color: 'bg-green-500'
    },
    {
      title: 'Current Month Revenue',
      value: formatCurrency(typeof stats.currentMonthRevenue === 'number' ? stats.currentMonthRevenue : 0),
      change: typeof stats.revenueChange === 'number' ? `${stats.revenueChange >= 0 ? '+' : ''}${stats.revenueChange.toFixed(1)}%` : '0%',
      trend: (typeof stats.revenueChange === 'number' && stats.revenueChange >= 0) ? 'up' : 'down',
      icon: DollarSign,
      color: 'bg-purple-500'
    },
    {
      title: 'Active Customers',
      value: typeof stats.totalActiveCustomers === 'number' ? stats.totalActiveCustomers.toLocaleString() : (stats.totalActiveCustomers || stats.activeCustomers || '0'),
      change: typeof stats.customerGrowth === 'number' ? `${stats.customerGrowth >= 0 ? '+' : ''}${stats.customerGrowth.toFixed(1)}%` : '0%',
      trend: (typeof stats.customerGrowth === 'number' && stats.customerGrowth >= 0) ? 'up' : 'down',
      icon: Package,
      color: 'bg-orange-500'
    }
  ];

  return (
    <>
      <div className="w-full">
        <div className="p-6">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-primary mb-2">Super Admin Dashboard</h1>
            <p className="text-secondary">Overview of your platform metrics and customer activity</p>
          </div>

          {/* Time Range Selector */}
          <div className="mb-6">
            <div className="flex space-x-1 bg-card p-1 rounded-lg w-fit">
              {['7d', '30d', '90d', '1y'].map((range) => (
                <button
                  key={range}
                  onClick={() => setSelectedTimeRange(range)}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${selectedTimeRange === range
                      ? 'bg-card text-purple-600 shadow-sm'
                      : 'text-secondary hover:text-primary'
                    }`}
                >
                  {range}
                </button>
              ))}
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {statsArray.map((stat, index) => {
              const IconComponent = stat.icon;
              return (
                <div key={index} className="bg-card rounded-xl shadow-sm border border-theme p-6">
                  <div className="flex items-center justify-between">
                    <div className={`${stat.color} p-3 rounded-lg`}>
                      <IconComponent className="w-6 h-6 text-white" />
                    </div>
                    <div className={`flex items-center text-sm font-medium ${stat.trend === 'up' ? 'text-green-600' : 'text-[#A855F7]'
                      }`}>
                      {stat.trend === 'up' ? (
                        <ArrowUp className="w-4 h-4 mr-1" />
                      ) : (
                        <ArrowDown className="w-4 h-4 mr-1" />
                      )}
                      {stat.change}
                    </div>
                  </div>
                  <div className="mt-4">
                    <h3 className="text-2xl font-bold text-primary">{stat.value}</h3>
                    <p className="text-secondary text-sm mt-1">{stat.title}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Recent Customers */}
            <div className="lg:col-span-2 bg-card rounded-xl shadow-sm border border-theme">
              <div className="px-6 py-4 border-b border-theme">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-primary">Recent Customers</h2>
                  <button className="text-purple-600 hover:text-purple-700 text-sm font-medium">
                    View All Customers
                  </button>
                </div>
              </div>
              <div className="overflow-hidden">
                {recentCustomers.length > 0 ? (
                  recentCustomers.map((customer: any) => (
                    <div key={customer.id} className="px-6 py-4 border-b border-theme last:border-b-0 hover:bg-[rgba(255,255,255,0.03)]">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="bg-purple-100 p-2 rounded-lg">
                            <Building2 className="w-5 h-5 text-purple-600" />
                          </div>
                          <div>
                            <h3 className="font-medium text-primary">{customer.adminName || 'N/A'}</h3>
                            <div className="text-secondary text-sm space-y-0.5">
                              <p>
                                <span className="font-medium">Company:</span>{' '}
                                {customer.companyName ? (
                                  <span className="text-primary">{customer.companyName}</span>
                                ) : (
                                  <span className="text-[#F59E0B] italic">Company not created</span>
                                )}
                              </p>
                              <p className="text-xs text-secondary">Joined {customer.joined}</p>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-4">
                          <div className="text-right">
                            <p className="text-sm font-medium text-primary">{customer.revenue}</p>
                            <p className="text-xs text-secondary">{customer.instances || 1} instances</p>
                          </div>
                          <div className="flex flex-col space-y-1">
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${getPlanColor(customer.plan)}`}>
                              {customer.plan}
                            </span>
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(customer.status)}`}>
                              {customer.status}
                            </span>
                          </div>
                          <button className="p-1 hover:bg-[rgba(255,255,255,0.03)] rounded">
                            <MoreHorizontal className="w-4 h-4 text-secondary" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="px-6 py-8 text-center text-secondary">
                    No recent customers found
                  </div>
                )}
              </div>
            </div>

            {/* Sidebar Content */}
            <div className="space-y-6">
              {/* Additional Stats */}
              {dashboardData.subscriptionStats && (
                <div className="bg-card rounded-xl shadow-sm border border-theme p-6">
                  <h2 className="text-lg font-semibold text-primary mb-4">Subscription Overview</h2>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-secondary">Total</span>
                      <span className="font-semibold">{dashboardData.subscriptionStats.total || 0}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-secondary">Active</span>
                      <span className="font-semibold text-green-600">{dashboardData.subscriptionStats.active || 0}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-secondary">Pending</span>
                      <span className="font-semibold text-[#00FFA3]">{dashboardData.subscriptionStats.pending || 0}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-secondary">Cancelled</span>
                      <span className="font-semibold text-[#A855F7]">{dashboardData.subscriptionStats.cancelled || 0}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default SuperAdminOverview;