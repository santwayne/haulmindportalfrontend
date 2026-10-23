import { useState, useEffect } from 'react';
import { Users, UserCheck, FileText, AlertTriangle, Clock, RefreshCw, AlertCircle } from 'lucide-react';
import { getEmployeeStats } from '../../../axios/api/employee';
import { getEmployeeDocumentStats, getExpiringDocuments } from '../../../axios/api/employeeDocument';
import ExpiringDocumentsPopup from '../../../components/common/ExpiringDocumentsPopup';

interface EmployeeStats {
  totalEmployees: number;
  activeEmployees: number;
  inactiveEmployees: number;
  roleStats: Array<{
    _id: string;
    count: number;
  }>;
  monthlyStats: Array<{
    _id: {
      year: number;
      month: number;
    };
    count: number;
  }>;
}

interface DocumentStats {
  totalDocuments: number;
  validDocuments: number;
  expiredDocuments: number;
  pendingDocuments: number;
  rejectedDocuments: number;
  expiringSoon: number;
  documentTypes: {
    [key: string]: number;
  };
}

const EmployeeDashboard = () => {
  const [employeeStats, setEmployeeStats] = useState<EmployeeStats | null>(null);
  const [documentStats, setDocumentStats] = useState<DocumentStats | null>(null);
  const [expiringDocuments, setExpiringDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showExpiringPopup, setShowExpiringPopup] = useState(false);

  useEffect(() => {
    // Check authentication state
    const userInfo = localStorage.getItem('userInfo');
    const token = localStorage.getItem('token');
    console.log('🔐 User Info from localStorage:', userInfo);
    console.log('🔑 Token from localStorage:', token);

    if (!token || !userInfo) {
      console.log('❌ User not authenticated - redirecting to login');
      setError('Please log in to access this page');
      return;
    }

    fetchDashboardData();
  }, []);

  const fetchDashboardData = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const [employeeStatsRes, documentStatsRes, expiringDocsRes] = await Promise.all([
        getEmployeeStats(),
        getEmployeeDocumentStats(),
        getExpiringDocuments(30) // Documents expiring in next 30 days
      ]);

      console.log('🔍 Employee Stats Response:', employeeStatsRes);
      console.log('🔍 Document Stats Response:', documentStatsRes);
      console.log('🔍 Expiring Docs Response:', expiringDocsRes);

      if (employeeStatsRes.success) {
        setEmployeeStats(employeeStatsRes.data);
      } else {
        console.error('Failed to fetch employee stats:', employeeStatsRes);
        setError(`Employee stats error: ${employeeStatsRes.message || 'Unknown error'}`);
      }

      if (documentStatsRes.success) {
        setDocumentStats(documentStatsRes.data);
      } else {
        console.error('Failed to fetch document stats');
      }

      if (expiringDocsRes.success) {
        setExpiringDocuments(expiringDocsRes.data);
      } else {
        console.error('Failed to fetch expiring documents');
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setError('Failed to load dashboard data. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Check for expiring documents and show popup
  useEffect(() => {
    if (documentStats && documentStats.expiringSoon > 0) {
      // Show popup after a short delay to let the page load
      const timer = setTimeout(() => {
        setShowExpiringPopup(true);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [documentStats]);

  const handleRefresh = () => {
    fetchDashboardData(true);
  };

  const stats = [
    {
      title: 'Total Employees',
      value: employeeStats?.totalEmployees?.toString() || '0',
      change: '+8%',
      icon: Users,
      color: 'text-blue-500',
      bgColor: 'bg-card'
    },
    {
      title: 'Active Employees',
      value: employeeStats?.activeEmployees?.toString() || '0',
      change: '+3%',
      icon: UserCheck,
      color: 'text-green-500',
      bgColor: 'bg-green-50'
    },
    {
      title: 'Total Documents',
      value: documentStats?.totalDocuments?.toString() || '0',
      change: '+12%',
      icon: FileText,
      color: 'text-yellow-500',
      bgColor: 'bg-card'
    },
    {
      title: 'Expiring Soon',
      value: documentStats?.expiringSoon?.toString() || '0',
      change: '-2',
      icon: AlertTriangle,
      color: 'text-red-500',
      bgColor: 'bg-card'
    }
  ];

  // Generate role distribution from API data
  const roleDistribution = employeeStats?.roleStats?.map(role => {
    const percentage = employeeStats.totalEmployees > 0
      ? Math.round((role.count / employeeStats.totalEmployees) * 100)
      : 0;

    return {
      role: role._id.charAt(0).toUpperCase() + role._id.slice(1).replace(/([A-Z])/g, ' $1'),
      count: role.count,
      percentage
    };
  }) || [];

  // Generate recent activity from expiring documents
  const recentActivity = expiringDocuments.slice(0, 4).map(doc => {
    const daysUntilExpiry = Math.ceil((new Date(doc.expiryDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));

    return {
      name: doc.employee?.name || 'Unknown Employee',
      action: `${doc.documentType} expires in ${daysUntilExpiry} days`,
      time: `${daysUntilExpiry} days`,
      status: daysUntilExpiry <= 7 ? 'warning' : daysUntilExpiry <= 14 ? 'info' : 'success'
    };
  });

  // Add some mock recent activities if no expiring documents
  const mockActivities = [
    {
      name: 'System',
      action: 'Employee dashboard updated',
      time: 'Just now',
      status: 'success'
    },
    {
      name: 'HR Team',
      action: 'Monthly report generated',
      time: '1 hour ago',
      status: 'info'
    }
  ];

  const allRecentActivity = recentActivity.length > 0 ? recentActivity : mockActivities;



  if (loading) {
    return (
      <div className="min-h-screen p-4 bg-main px-6 flex items-center justify-center">
        <div className="text-slate-500">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 bg-main px-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 mb-2">Employee Dashboard</h1>
              <p className="text-slate-600">Overview of employee management and document status</p>
            </div>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="mt-4 sm:mt-0 flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-card border border-red-200 rounded-xl p-4 flex items-center">
            <AlertCircle className="w-5 h-5 text-red-500 mr-3" />
            <span className="text-red-700">{error}</span>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {stats.map((stat, index) => (
            <div key={index} className={`rounded-xl p-4 border border-opacity-50 ${stat.bgColor.replace('bg-', 'bg-').replace('50', '50')} border-${stat.color.split('-')[1]}-200`}>
              <div className={`text-2xl font-bold mb-1 ${stat.color.replace('text-', 'text-').replace('500', '700')}`}>
                {stat.value}
              </div>
              <div className={`text-sm font-medium ${stat.color.replace('text-', 'text-').replace('500', '600')}`}>
                {stat.title}
              </div>
              <div className="mt-2 flex items-center justify-between">
                <div className={`text-xs font-semibold ${stat.change.startsWith('+') ? 'text-green-600' :
                    stat.change.startsWith('-') ? 'text-[#A855F7]' : 'text-slate-600'
                  }`}>
                  {stat.change} vs last month
                </div>
                <stat.icon className={`w-5 h-5 ${stat.color} opacity-80`} />
              </div>
            </div>
          ))}
        </div>

        {/* Role Distribution and Document Status */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="col-span-1 md:col-span-2 bg-card rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-800">Employee Role Distribution</h3>
            </div>
            <div className="p-6 space-y-4">
              {roleDistribution.length > 0 ? (
                roleDistribution.map((role, index) => (
                  <div key={index}>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-slate-700">{role.role}</span>
                      <span className="text-sm text-slate-500">{role.count} employees ({role.percentage}%)</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all"
                        style={{ width: `${Math.min(role.percentage * 3, 100)}%` }}
                      />
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-slate-500">
                  <Users className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                  <p>No role data available</p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-card rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-800">Document Status</h3>
            </div>
            <div className="p-6 space-y-5">
              <div className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-lg transition-colors">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-green-500 rounded-full mr-3 shadow-sm"></div>
                  <span className="text-sm font-medium text-slate-700">Valid</span>
                </div>
                <span className="text-sm font-bold text-slate-800">{documentStats?.validDocuments || 0}</span>
              </div>
              <div className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-lg transition-colors">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-yellow-500 rounded-full mr-3 shadow-sm"></div>
                  <span className="text-sm font-medium text-slate-700">Pending</span>
                </div>
                <span className="text-sm font-bold text-slate-800">{documentStats?.pendingDocuments || 0}</span>
              </div>
              <div className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-lg transition-colors">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-red-500 rounded-full mr-3 shadow-sm"></div>
                  <span className="text-sm font-medium text-slate-700">Expired</span>
                </div>
                <span className="text-sm font-bold text-slate-800">{documentStats?.expiredDocuments || 0}</span>
              </div>
              <div className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-lg transition-colors">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-slate-500 rounded-full mr-3 shadow-sm"></div>
                  <span className="text-sm font-medium text-slate-700">Rejected</span>
                </div>
                <span className="text-sm font-bold text-slate-800">{documentStats?.rejectedDocuments || 0}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-card rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-8">
          <div className="p-6 border-b border-slate-100">
            <h3 className="text-lg font-bold text-slate-800">Recent Employee Activity</h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {allRecentActivity.length > 0 ? (
                allRecentActivity.map((activity, index) => (
                  <div key={index} className="flex items-center justify-between py-3 border-b border-slate-100 last:border-0 hover:bg-slate-50 px-2 rounded-lg transition-colors">
                    <div className="flex items-center space-x-3">
                      <div className={`w-2.5 h-2.5 rounded-full ${activity.status === 'success' ? 'bg-green-500' :
                          activity.status === 'warning' ? 'bg-yellow-500' :
                            activity.status === 'info' ? 'bg-blue-500' :
                              'bg-slate-500'
                        }`} />
                      <div>
                        <p className="font-semibold text-slate-800">{activity.name}</p>
                        <p className="text-sm text-slate-500">{activity.action}</p>
                      </div>
                    </div>
                    <span className="text-xs font-medium text-slate-400 bg-slate-100 px-2 py-1 rounded-full">{activity.time}</span>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-slate-500">
                  <Clock className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                  <p>No recent activity</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Expiring Documents Popup */}
      <ExpiringDocumentsPopup
        isOpen={showExpiringPopup}
        onClose={() => setShowExpiringPopup(false)}
        onViewDocuments={() => {
          // Navigate to documents page
          window.location.href = '/admin/employee/documents';
        }}
        daysThreshold={30}
        showOnlyOnce={true}
      />
    </div>
  );
};

export default EmployeeDashboard;