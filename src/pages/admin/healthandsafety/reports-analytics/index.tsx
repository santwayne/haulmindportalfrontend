import React, { useState, useEffect } from 'react';
import {
  FaChartBar,
  FaFilePdf,
  FaCalendarAlt,
  FaFilter,
  FaChartLine,
  FaChartPie,
  FaExclamationTriangle,
  FaCheckCircle,
  FaClipboardList,
  FaTimes,
  FaInfoCircle,
  FaTrash
} from 'react-icons/fa';

import {
  getAnalyticsStats,
  getIncidentTrends,
  getInspectionStatus,
  getReports,
  generateReport,
  deleteReport
} from '../../../../axios/api/healthSafety';

interface ToastNotification {
  id: number;
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
}

interface Report {
  _id: string;
  reportNumber: string;
  title: string;
  type: string;
  period: string;
  generatedDate: string;
  status: 'generated' | 'pending' | 'failed';
  fileUrl?: string;
  fileName?: string;
  fileType?: string;
}

const ToastNotificationComponent = ({ notification, onClose }: { notification: ToastNotification; onClose: (id: number) => void }) => {
  const icons = {
    success: <FaCheckCircle className="text-green-500" size={24} />,
    error: <FaExclamationTriangle className="text-red-500" size={24} />,
    info: <FaInfoCircle className="text-blue-500" size={24} />,
    warning: <FaExclamationTriangle className="text-yellow-500" size={24} />
  };

  const bgColors = {
    success: 'bg-green-50 border-green-200',
    error: 'bg-card border-red-200',
    info: 'bg-card border-blue-200',
    warning: 'bg-card border-yellow-200'
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      onClose(notification.id);
    }, 5000);
    return () => clearTimeout(timer);
  }, [notification.id, onClose]);

  return (
    <div className={`fixed top-4 right-4 flex items-start gap-3 p-4 rounded-lg border-2 shadow-lg z-[10000] ${bgColors[notification.type]} min-w-[300px] max-w-[500px]`}>
      <div className="flex-shrink-0 mt-0.5">
        {icons[notification.type]}
      </div>
      <p className="flex-1 text-sm font-medium text-primary">{notification.message}</p>
      <button
        onClick={() => onClose(notification.id)}
        className="flex-shrink-0 text-secondary hover:text-secondary transition-colors"
      >
        <FaTimes size={16} />
      </button>
    </div>
  );
};

const ReportsAnalytics = () => {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<string>('monthly');
  const [notifications, setNotifications] = useState<ToastNotification[]>([]);
  const [notificationId, setNotificationId] = useState(0);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [generateLoading, setGenerateLoading] = useState(false);

  // Delete Modal State
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [reportToDelete, setReportToDelete] = useState<string | null>(null);

  const [stats, setStats] = useState({
    totalIncidents: 0,
    openIncidents: 0,
    totalInspections: 0,
    passedInspections: 0,
    totalTraining: 0,
    completedTraining: 0,
    activePolicies: 0,
    expiringCertificates: 0
  });

  const [incidentTrends, setIncidentTrends] = useState<any[]>([]);
  const [inspectionStatus, setInspectionStatus] = useState<any>({});

  const [generateFormData, setGenerateFormData] = useState({
    title: '',
    type: 'Monthly Summary',
    periodType: 'monthly',
    fileType: 'pdf'
  });

  const CUSTOM_COLORS = {
    background: '#EDF8FF',
    primary: '#016ab2',
    dark: '#063f6f',
    light: '#398bc3',
    gradient: 'linear-gradient(90deg, var(--accent-blue) 0%, var(--accent-blue) 40%, rgba(0,209,255,0.15) 100%)',
    gradientVertical: 'linear-gradient(to bottom right, #016ab2, #063f6f)',
  };

  const showNotification = (type: 'success' | 'error' | 'info' | 'warning', message: string) => {
    const id = notificationId + 1;
    setNotificationId(id);
    setNotifications([...notifications, { id, type, message }]);
  };

  const removeNotification = (id: number) => {
    setNotifications(notifications.filter(n => n.id !== id));
  };

  const fetchStats = async () => {
    try {
      const response = await getAnalyticsStats({ periodType: selectedPeriod });
      if (response?.success && response.data) {
        setStats({
          totalIncidents: response.data.totalIncidents || 0,
          openIncidents: response.data.openIncidents || 0,
          totalInspections: response.data.totalInspections || 0,
          passedInspections: response.data.passedInspections || 0,
          totalTraining: response.data.totalTraining || 0,
          completedTraining: response.data.completedTraining || 0,
          activePolicies: response.data.activePolicies || 0,
          expiringCertificates: response.data.expiringCertificates || 0
        });
      } else if (response && !response.success) {
        showNotification('error', response.message || 'Failed to fetch statistics');
      }
    } catch (error: any) {
      console.error('Error fetching stats:', error);
      showNotification('error', error?.response?.data?.message || error?.message || 'Failed to fetch statistics');
    }
  };

  const fetchTrends = async () => {
    try {
      const response = await getIncidentTrends({ periodType: selectedPeriod });
      if (response?.success && Array.isArray(response.data)) {
        setIncidentTrends(response.data);
      } else if (response && !response.success) {
        console.error('Failed to fetch trends:', response.message);
      } else {
        setIncidentTrends([]);
      }
    } catch (error: any) {
      console.error('Error fetching trends:', error);
      setIncidentTrends([]);
    }
  };

  const fetchInspectionStatus = async () => {
    try {
      const response = await getInspectionStatus({ periodType: selectedPeriod });
      if (response?.success && response.data) {
        setInspectionStatus(response.data);
      } else if (response && !response.success) {
        console.error('Failed to fetch inspection status:', response.message);
        setInspectionStatus({});
      } else {
        setInspectionStatus({});
      }
    } catch (error: any) {
      console.error('Error fetching inspection status:', error);
      setInspectionStatus({});
    }
  };

  const fetchReports = async () => {
    try {
      setLoading(true);
      const response = await getReports();
      if (response?.success && Array.isArray(response.data)) {
        setReports(response.data.map((item: any) => ({
          _id: item._id,
          reportNumber: item.reportNumber || 'N/A',
          title: item.title || 'Untitled Report',
          type: item.type || 'Custom',
          period: item.period || 'N/A',
          generatedDate: item.generatedDate || item.createdAt || new Date().toISOString(),
          status: item.status || 'pending',
          fileUrl: item.fileUrl,
          fileName: item.fileName,
          fileType: item.fileType
        })));
      } else if (response && !response.success) {
        showNotification('error', response.message || 'Failed to fetch reports');
        setReports([]);
      } else {
        setReports([]);
      }
    } catch (error: any) {
      console.error('Error fetching reports:', error);
      showNotification('error', error?.response?.data?.message || error?.message || 'Failed to fetch reports');
      setReports([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    fetchTrends();
    fetchInspectionStatus();
    fetchReports();
  }, [selectedPeriod]);

  const handleGenerateReport = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setGenerateLoading(true);
      const response = await generateReport({
        title: generateFormData.title || `${generateFormData.type} - ${new Date().toLocaleDateString()}`,
        type: generateFormData.type,
        periodType: generateFormData.periodType,
        fileType: generateFormData.fileType
      });

      if (response?.success) {
        showNotification('success', 'Report generated successfully');
        setShowGenerateModal(false);
        setGenerateFormData({
          title: '',
          type: 'Monthly Summary',
          periodType: 'monthly',
          fileType: 'pdf'
        });
        fetchReports();
      } else {
        showNotification('error', response?.message || 'Failed to generate report');
      }
    } catch (error: any) {
      console.error('Error generating report:', error);
      showNotification('error', error?.response?.data?.message || 'Failed to generate report');
    } finally {
      setGenerateLoading(false);
    }
  };

  const handleDeleteReport = (id: string) => {
    setReportToDelete(id);
    setShowDeleteModal(true);
  };

  const confirmDeleteReport = async () => {
    if (!reportToDelete) return;

    try {
      const response = await deleteReport(reportToDelete);
      if (response?.success) {
        showNotification('success', 'Report deleted successfully');
        fetchReports();
      } else {
        showNotification('error', response?.message || 'Failed to delete report');
      }
    } catch (error: any) {
      console.error('Error deleting report:', error);
      showNotification('error', error?.response?.data?.message || 'Failed to delete report');
    } finally {
      setShowDeleteModal(false);
      setReportToDelete(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'generated': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'failed': return 'bg-red-100 text-red-800';
      default: return 'bg-card text-primary';
    }
  };

  // Calculate chart percentages for inspection status
  const inspectionTotal = (inspectionStatus.scheduled || 0) +
    (inspectionStatus['in-progress'] || 0) +
    (inspectionStatus.completed || 0) +
    (inspectionStatus.overdue || 0);

  const inspectionPercentages = inspectionTotal > 0 ? {
    scheduled: ((inspectionStatus.scheduled || 0) / inspectionTotal * 100).toFixed(1),
    inProgress: ((inspectionStatus['in-progress'] || 0) / inspectionTotal * 100).toFixed(1),
    completed: ((inspectionStatus.completed || 0) / inspectionTotal * 100).toFixed(1),
    overdue: ((inspectionStatus.overdue || 0) / inspectionTotal * 100).toFixed(1)
  } : { scheduled: 0, inProgress: 0, completed: 0, overdue: 0 };

  return (
    <div className="min-h-screen p-6 bg-main">
      <div className="w-full mx-auto">
        {/* Toast Notifications */}
        <div className="fixed top-4 right-4 z-[10001] space-y-2">
          {notifications.map(notification => (
            <ToastNotificationComponent
              key={notification.id}
              notification={notification}
              onClose={removeNotification}
            />
          ))}
        </div>

        {/* Header */}
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold mb-2 text-headings">
              Reports & Analytics
            </h1>
            <p className="text-secondary">View and generate health & safety reports and analytics</p>
          </div>
          <button
            onClick={() => setShowGenerateModal(true)}
            className="px-4 py-2 rounded-lg !text-white shadow-md hover:opacity-90 transition flex items-center gap-2 bg-[var(--accent-navyblue)]"

          >
            <FaChartBar /> Generate Report
          </button>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <div className="bg-[var(--accent-red)]/20 rounded-xl p-6 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <FaExclamationTriangle className="text-red-500 text-2xl" />
              <span className="text-2xl font-bold" >
                {stats.totalIncidents}
              </span>
            </div>
            <p className="text-secondary text-sm">Total Incidents</p>
            <p className="text-xs text-secondary mt-1">{stats.openIncidents} Open</p>
          </div>

          <div className=" rounded-xl p-6 shadow-lg bg-[var(--accent-blue)]/20">
            <div className="flex items-center justify-between mb-4">
              <FaClipboardList className="text-blue-500 text-2xl" />
              <span className="text-2xl font-bold" >
                {stats.totalInspections}
              </span>
            </div>
            <p className="text-secondary text-sm">Total Inspections</p>
            <p className="text-xs text-secondary mt-1">{stats.passedInspections} Passed</p>
          </div>

          <div className=" rounded-xl p-6 shadow-lg bg-[var(--accent-green)]/20">
            <div className="flex items-center justify-between mb-4">
              <FaCheckCircle className="text-green-500 text-2xl" />
              <span className="text-2xl font-bold" >
                {stats.totalTraining}
              </span>
            </div>
            <p className="text-secondary text-sm">Training Programs</p>
            <p className="text-xs text-secondary mt-1">{stats.completedTraining} Completed</p>
          </div>

          <div className=" rounded-xl p-6 shadow-lg bg-[var(--accent-purple)]/20">
            <div className="flex items-center justify-between mb-4">
              <FaFilePdf className="text-purple-500 text-2xl" />
              <span className="text-2xl font-bold" >
                {stats.activePolicies}
              </span>
            </div>
            <p className="text-secondary text-sm">Active Policies</p>
            <p className="text-xs text-secondary mt-1">{stats.expiringCertificates} Expiring Soon</p>
          </div>
        </div>

        {/* Period Filter */}
        <div className="bg-card rounded-xl p-4 shadow-lg mb-6">
          <div className="flex items-center gap-4">
            <FaFilter className="text-secondary" />
            <span className="font-medium text-primary">Period:</span>
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="px-4 py-2 text-sm border border-theme rounded-lg
  bg-[var(--bg-card)] text-[var(--text-primary)]
  focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)]
  focus:border-[var(--accent-blue)]
  cursor-pointer transition-all"
            >
              <option value="daily" className="bg-[var(--bg-card)] text-[var(--text-primary)]">
                Daily
              </option>

              <option value="weekly" className="bg-[var(--bg-card)] text-[var(--text-primary)]">
                Weekly
              </option>

              <option value="monthly" className="bg-[var(--bg-card)] text-[var(--text-primary)]">
                Monthly
              </option>

              <option value="quarterly" className="bg-[var(--bg-card)] text-[var(--text-primary)]">
                Quarterly
              </option>

              <option value="yearly" className="bg-[var(--bg-card)] text-[var(--text-primary)]">
                Yearly
              </option>
            </select>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className="bg-card rounded-xl p-6 shadow-lg">
            <h3 className="text-lg font-semibold mb-4" >
              Incident Trends
            </h3>
            <div className="h-64 flex items-center justify-center">
              {incidentTrends && incidentTrends.length > 0 ? (
                <div className="w-full space-y-2">
                  <div className="text-sm text-secondary mb-4">
                    Total incidents in period: {incidentTrends.reduce((sum: number, t: any) => sum + (t.count || 0), 0)}
                  </div>
                  <div className="space-y-1 max-h-48 overflow-y-auto">
                    {incidentTrends.slice(0, 7).map((trend: any, idx: number) => {
                      const maxCount = Math.max(...incidentTrends.map((t: any) => t.count || 0), 1);
                      const percentage = maxCount > 0 ? Math.min(((trend.count || 0) / maxCount) * 100, 100) : 0;
                      return (
                        <div key={idx} className="flex items-center gap-2">
                          <span className="text-xs text-secondary w-20 truncate">{trend.date || 'N/A'}</span>
                          <div className="flex-1 bg-gray-200 rounded-full h-6 relative">
                            <div
                              className="h-6 rounded-full flex items-center justify-center text-white text-xs"
                              style={{ width: `${percentage}%`, backgroundColor: CUSTOM_COLORS.primary }}
                            >
                              {trend.count || 0}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="text-center text-secondary">
                  <FaChartLine className="text-4xl mb-2 mx-auto" />
                  <p>No incident data available</p>
                  <p className="text-xs mt-1">Try selecting a different period</p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-card rounded-xl p-6 shadow-lg">
            <h3 className="text-lg font-semibold mb-4" >
              Inspection Status
            </h3>
            <div className="h-64 flex items-center justify-center">
              {inspectionTotal > 0 ? (
                <div className="w-full space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold" style={{ color: CUSTOM_COLORS.primary }}>
                        {inspectionStatus.scheduled || 0}
                      </div>
                      <div className="text-xs text-secondary">Scheduled ({inspectionPercentages.scheduled}%)</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-[#00FFA3]">
                        {inspectionStatus['in-progress'] || 0}
                      </div>
                      <div className="text-xs text-secondary">In Progress ({inspectionPercentages.inProgress}%)</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {inspectionStatus.completed || 0}
                      </div>
                      <div className="text-xs text-secondary">Completed ({inspectionPercentages.completed}%)</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-[#A855F7]">
                        {inspectionStatus.overdue || 0}
                      </div>
                      <div className="text-xs text-secondary">Overdue ({inspectionPercentages.overdue}%)</div>
                    </div>
                  </div>
                  <div className="flex gap-1 h-4 rounded-full overflow-hidden">
                    <div
                      style={{ width: `${inspectionPercentages.scheduled}%`, backgroundColor: CUSTOM_COLORS.primary }}
                      title={`Scheduled: ${inspectionPercentages.scheduled}%`}
                    />
                    <div
                      className="bg-yellow-500"
                      style={{ width: `${inspectionPercentages.inProgress}%` }}
                      title={`In Progress: ${inspectionPercentages.inProgress}%`}
                    />
                    <div
                      className="bg-green-500"
                      style={{ width: `${inspectionPercentages.completed}%` }}
                      title={`Completed: ${inspectionPercentages.completed}%`}
                    />
                    <div
                      className="bg-red-500"
                      style={{ width: `${inspectionPercentages.overdue}%` }}
                      title={`Overdue: ${inspectionPercentages.overdue}%`}
                    />
                  </div>
                </div>
              ) : (
                <div className="text-center text-secondary">
                  <FaChartPie className="text-4xl mb-2 mx-auto" />
                  <p>No inspection data available</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Reports Table */}
        <div className="bg-card rounded-xl shadow-lg overflow-hidden">
          <div className="p-4 border-b border-theme">
            <h3 className="text-lg font-semibold" >
              Generated Reports
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead >
                <tr>
                  <th className="px-6 py-4 text-left text-headings font-semibold">Report #</th>
                  <th className="px-6 py-4 text-left text-headings font-semibold">Title</th>
                  <th className="px-6 py-4 text-left text-headings font-semibold">Type</th>
                  <th className="px-6 py-4 text-left text-headings font-semibold">Period</th>
                  <th className="px-6 py-4 text-left text-headings font-semibold">Generated Date</th>
                  <th className="px-6 py-4 text-left text-headings font-semibold">Status</th>
                  <th className="px-6 py-4 text-left text-headings font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-secondary">
                      Loading...
                    </td>
                  </tr>
                ) : reports.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-secondary">
                      No reports found
                    </td>
                  </tr>
                ) : (
                  reports.map((report) => (
                    <tr key={report._id} className="border-b border-theme hover:bg-[rgba(255,255,255,0.03)]">
                      <td className="px-6 py-4 font-medium">{report.reportNumber}</td>
                      <td className="px-6 py-4">{report.title}</td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-semibold">
                          {report.type}
                        </span>
                      </td>
                      <td className="px-6 py-4">{report.period}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <FaCalendarAlt className="text-secondary" />
                          {new Date(report.generatedDate).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(report.status)}`}>
                          {report.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">

                          <button
                            onClick={() => handleDeleteReport(report._id)}
                            className="p-2 text-[#A855F7] hover:bg-red-50 rounded-lg transition"
                            title="Delete"
                          >
                            <FaTrash />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Generate Report Modal */}
        {showGenerateModal && (
          <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <div className="bg-card rounded-xl shadow-2xl max-w-md w-full">
              <div className="p-6 border-b border-theme">
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-bold">Generate Report</h2>
                  <button
                    onClick={() => setShowGenerateModal(false)}
                    className="text-secondary hover:text-secondary"
                  >
                    <FaTimes size={24} />
                  </button>
                </div>
              </div>
              <form onSubmit={handleGenerateReport} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-headings mb-1">Title</label>
                  <input
                    type="text"
                    value={generateFormData.title}
                    onChange={(e) => setGenerateFormData({ ...generateFormData, title: e.target.value })}
                    placeholder="Auto-generated if left empty"
                    className="w-full border border-theme p-2 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-headings mb-1">Report Type *</label>
                  <select
                    value={generateFormData.type}
                    onChange={(e) =>
                      setGenerateFormData({
                        ...generateFormData,
                        type: e.target.value,
                      })
                    }
                    required
                    className="w-full px-3 py-2 text-sm border border-theme rounded-lg
  bg-[var(--bg-card)] text-[var(--text-primary)]
  focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)]
  focus:border-[var(--accent-blue)]
  cursor-pointer transition-all"
                  >
                    <option value="Monthly Summary" className="bg-[var(--bg-card)] text-[var(--text-primary)]">
                      Monthly Summary
                    </option>

                    <option value="Incident Analysis" className="bg-[var(--bg-card)] text-[var(--text-primary)]">
                      Incident Analysis
                    </option>

                    <option value="Inspection Summary" className="bg-[var(--bg-card)] text-[var(--text-primary)]">
                      Inspection Summary
                    </option>

                    <option value="Training Report" className="bg-[var(--bg-card)] text-[var(--text-primary)]">
                      Training Report
                    </option>

                    <option value="CAPA Report" className="bg-[var(--bg-card)] text-[var(--text-primary)]">
                      CAPA Report
                    </option>

                    <option value="Custom" className="bg-[var(--bg-card)] text-[var(--text-primary)]">
                      Custom
                    </option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-headings mb-1">Period Type *</label>
                  <select
                    value={generateFormData.periodType}
                    onChange={(e) =>
                      setGenerateFormData({
                        ...generateFormData,
                        periodType: e.target.value,
                      })
                    }
                    required
                    className="w-full px-3 py-2 text-sm border border-theme rounded-lg
  bg-[var(--bg-card)] text-[var(--text-primary)]
  focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)]
  focus:border-[var(--accent-blue)]
  cursor-pointer transition-all"
                  >
                    <option value="daily" className="bg-[var(--bg-card)] text-[var(--text-primary)]">
                      Daily
                    </option>

                    <option value="weekly" className="bg-[var(--bg-card)] text-[var(--text-primary)]">
                      Weekly
                    </option>

                    <option value="monthly" className="bg-[var(--bg-card)] text-[var(--text-primary)]">
                      Monthly
                    </option>

                    <option value="quarterly" className="bg-[var(--bg-card)] text-[var(--text-primary)]">
                      Quarterly
                    </option>

                    <option value="yearly" className="bg-[var(--bg-card)] text-[var(--text-primary)]">
                      Yearly
                    </option>
                  </select>
                </div>

                <div className="flex justify-end gap-4 pt-4 border-t">
                  <button
                    type="button"
                    onClick={() => setShowGenerateModal(false)}
                    className="px-4 py-2 border border-theme rounded-lg hover:bg-[rgba(255,255,255,0.03)]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={generateLoading}
                    className="px-4 py-2 rounded-lg !text-white disabled:opacity-50 bg-[var(--accent-navyblue)]"
                  >
                    {generateLoading ? 'Generating...' : 'Generate'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>


      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-card rounded-2xl shadow-2xl p-6 w-full max-w-md transform transition-all scale-100 opacity-100">
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
                <FaTrash className="text-[#A855F7] text-xl" />
              </div>
              <h3 className="text-xl font-bold text-primary mb-2">Delete Confirmation</h3>
              <p className="text-secondary text-sm mb-6">
                Are you sure you want to delete this report? This action cannot be undone.
              </p>
              <div className="flex gap-3 w-full">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="flex-1 px-4 py-2 bg-card text-primary font-bold rounded-xl hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDeleteReport}
                  className="flex-1 px-4 py-2 bg-red-600 !text-white font-bold rounded-xl hover:bg-red-700 transition-colors shadow-lg shadow-red-200"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>

  );
};

export default ReportsAnalytics;
