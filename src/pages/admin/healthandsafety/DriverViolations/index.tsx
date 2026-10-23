import React, { useState, useEffect } from 'react';
import {
  FaExclamationTriangle,
  FaTachometerAlt,
  FaCarCrash,
  FaFilter,
  FaSync,
  FaPlus,
  FaTrash,
  FaEye
} from 'react-icons/fa';
import { message, Modal, Spin } from 'antd';
import {
  getDriverViolations,
  getViolationStats,
  syncGeotabViolations,
  deleteViolation
} from '../../../../axios/api/violations';
import type { DriverViolation } from '../../../../axios/api/violations';
import { getAllEmployees } from '../../../../axios/api/employee';
import { listFleetUnits } from '../../../../axios/api/fleet.units';

interface FilterState {
  driver?: string;
  vehicle?: string;
  violationType?: string;
  severity?: string;
  status?: string;
  source?: string;
  fromDate?: string;
  toDate?: string;
  search?: string;
}

const DriverViolationsPage: React.FC = () => {
  const [violations, setViolations] = useState<DriverViolation[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [filters, setFilters] = useState<FilterState>({});
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [selectedViolation, setSelectedViolation] = useState<DriverViolation | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [, setShowAddModal] = useState(false);
  const [, setDrivers] = useState<any[]>([]);
  const [, setVehicles] = useState<any[]>([]);

  // Fetch violations
  const fetchViolations = async (page: number = 1) => {
    setLoading(true);
    try {
      const res = await getDriverViolations({
        ...filters,
        page,
        limit: pagination.limit
      });

      if (res.success) {
        setViolations(res.data);
        setPagination(res.pagination);
      } else {
        message.error(res.message || 'Failed to fetch violations');
      }
    } catch (error: any) {
      console.error('Error fetching violations:', error);
      message.error(error?.response?.data?.message || 'Failed to fetch violations');
    } finally {
      setLoading(false);
    }
  };

  // Fetch statistics
  const fetchStats = async () => {
    try {
      const res = await getViolationStats({
        fromDate: filters.fromDate,
        toDate: filters.toDate
      });

      if (res.success) {
        setStats(res.data);
      }
    } catch (error) {
      console.error('Error fetching violation stats:', error);
    }
  };

  // Fetch drivers and vehicles for filters
  const fetchDriversAndVehicles = async () => {
    try {
      const [driversRes, vehiclesRes] = await Promise.all([
        getAllEmployees(),
        listFleetUnits()
      ]);

      if (driversRes.success) {
        setDrivers(driversRes.data.filter((emp: any) => emp.role === 'driver'));
      }

      if (vehiclesRes.success) {
        setVehicles(vehiclesRes.data);
      }
    } catch (error) {
      console.error('Error fetching drivers/vehicles:', error);
    }
  };

  // Sync from Geotab
  const handleSync = async () => {
    Modal.confirm({
      title: 'Sync Violations from Geotab',
      content: 'This will fetch violations from Geotab telematics system for the last 7 days. Continue?',
      onOk: async () => {
        setSyncing(true);
        try {
          const res = await syncGeotabViolations(7);

          if (res.success) {
            message.success(res.message);
            fetchViolations(1);
            fetchStats();
          } else {
            message.error(res.message || 'Sync failed');
          }
        } catch (error: any) {
          console.error('Error syncing violations:', error);
          message.error(error?.response?.data?.message || 'Sync failed');
        } finally {
          setSyncing(false);
        }
      }
    });
  };

  // Handle delete
  const handleDelete = async (id: string) => {
    Modal.confirm({
      title: 'Delete Violation',
      content: 'Are you sure you want to delete this violation? This action cannot be undone.',
      okType: 'danger',
      onOk: async () => {
        try {
          const res = await deleteViolation(id);

          if (res.success) {
            message.success('Violation deleted successfully');
            fetchViolations(pagination.page);
            fetchStats();
          } else {
            message.error(res.message || 'Failed to delete violation');
          }
        } catch (error: any) {
          console.error('Error deleting violation:', error);
          message.error(error?.response?.data?.message || 'Failed to delete violation');
        }
      }
    });
  };

  // Handle view details
  const handleViewDetails = (violation: DriverViolation) => {
    setSelectedViolation(violation);
    setShowDetailsModal(true);
  };

  // Apply filters
  const handleApplyFilters = () => {
    fetchViolations(1);
    fetchStats();
  };

  // Reset filters
  const handleResetFilters = () => {
    setFilters({});
    fetchViolations(1);
    fetchStats();
  };

  useEffect(() => {
    fetchViolations(1);
    fetchStats();
    fetchDriversAndVehicles();
  }, []);

  // Helper functions
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800';
      case 'major': return 'bg-orange-100 text-orange-800';
      case 'moderate': return 'bg-yellow-100 text-yellow-800';
      case 'minor': return 'bg-blue-100 text-blue-800';
      default: return 'bg-card text-primary';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'acknowledged': return 'bg-blue-100 text-blue-800';
      case 'resolved': return 'bg-green-100 text-green-800';
      case 'disputed': return 'bg-purple-100 text-purple-800';
      case 'dismissed': return 'bg-card text-primary';
      default: return 'bg-card text-primary';
    }
  };

  const formatViolationType = (type: string) => {
    return type.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  };

  return (
    <div className="p-6 bg-card min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-primary mb-2">Driver Violations</h1>
        <p className="text-secondary">Monitor and manage driver violations from Geotab and manual entries</p>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="bg-gradient-to-br from-red-500 to-red-600 text-white rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold">{stats.total || 0}</div>
                <div className="text-sm opacity-90 mt-1">Total Violations</div>
              </div>
              <FaExclamationTriangle size={32} className="opacity-80" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold">{stats.byType?.speeding || 0}</div>
                <div className="text-sm opacity-90 mt-1">Speeding Violations</div>
              </div>
              <FaTachometerAlt size={32} className="opacity-80" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 text-white rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold">
                  {(stats.byType?.['harsh-braking'] || 0) + (stats.byType?.['harsh-acceleration'] || 0)}
                </div>
                <div className="text-sm opacity-90 mt-1">Harsh Driving</div>
              </div>
              <FaCarCrash size={32} className="opacity-80" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold">{stats.bySeverity?.critical || 0}</div>
                <div className="text-sm opacity-90 mt-1">Critical Violations</div>
              </div>
              <FaExclamationTriangle size={32} className="opacity-80" />
            </div>
          </div>
        </div>
      )}

      {/* Actions Bar */}
      <div className="bg-card rounded-lg shadow-sm border border-theme p-4 mb-6">
        <div className="flex flex-wrap gap-3 items-center justify-between">
          <div className="flex gap-3">
            <button
              onClick={handleSync}
              disabled={syncing}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition"
            >
              <FaSync className={syncing ? 'animate-spin' : ''} />
              {syncing ? 'Syncing...' : 'Sync from Geotab'}
            </button>

            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
            >
              <FaPlus />
              Add Violation
            </button>
          </div>

          <div className="flex gap-3">
            <input
              type="text"
              placeholder="Search by ID, driver, vehicle..."
              value={filters.search || ''}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              onKeyDown={(e) => e.key === 'Enter' && handleApplyFilters()}
              className="px-4 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />

            <button
              onClick={handleApplyFilters}
              className="flex items-center gap-2 px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition"
            >
              <FaFilter />
              Apply
            </button>

            <button
              onClick={handleResetFilters}
              className="px-4 py-2 bg-gray-200 text-primary rounded-lg hover:bg-gray-300 transition"
            >
              Reset
            </button>
          </div>
        </div>

        {/* Filters Row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
          <select
            value={filters.violationType || ''}
            onChange={(e) => setFilters({ ...filters, violationType: e.target.value || undefined })}
            className="px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All Types</option>
            <option value="speeding">Speeding</option>
            <option value="harsh-braking">Harsh Braking</option>
            <option value="harsh-acceleration">Harsh Acceleration</option>
            <option value="excessive-idling">Excessive Idling</option>
            <option value="lane-violation">Lane Violation</option>
            <option value="traffic-light">Traffic Light</option>
            <option value="hours-of-service">Hours of Service</option>
            <option value="other">Other</option>
          </select>

          <select
            value={filters.severity || ''}
            onChange={(e) => setFilters({ ...filters, severity: e.target.value || undefined })}
            className="px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All Severities</option>
            <option value="minor">Minor</option>
            <option value="moderate">Moderate</option>
            <option value="major">Major</option>
            <option value="critical">Critical</option>
          </select>

          <select
            value={filters.status || ''}
            onChange={(e) => setFilters({ ...filters, status: e.target.value || undefined })}
            className="px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="acknowledged">Acknowledged</option>
            <option value="resolved">Resolved</option>
            <option value="disputed">Disputed</option>
            <option value="dismissed">Dismissed</option>
          </select>

          <select
            value={filters.source || ''}
            onChange={(e) => setFilters({ ...filters, source: e.target.value || undefined })}
            className="px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All Sources</option>
            <option value="geotab">Geotab</option>
            <option value="manual">Manual</option>
            <option value="police-ticket">Police Ticket</option>
            <option value="inspection">Inspection</option>
          </select>
        </div>
      </div>

      {/* Violations Table */}
      <div className="bg-card rounded-lg shadow-sm border border-theme overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Spin size="large" />
          </div>
        ) : violations.length === 0 ? (
          <div className="text-center py-20">
            <FaExclamationTriangle className="mx-auto text-secondary mb-4" size={48} />
            <p className="text-secondary text-lg">No violations found</p>
            <p className="text-secondary text-sm mt-2">Try adjusting your filters or sync from Geotab</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-theme">
                <thead className="bg-card">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                      Violation ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                      Driver
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                      Vehicle
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                      Severity
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                      Points
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-card divide-y divide-theme">
                  {violations.map((violation) => (
                    <tr key={violation._id} className="hover:bg-[rgba(255,255,255,0.03)] transition">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-primary">
                        {violation.violationId}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div>
                          <div className="font-medium text-primary">{violation.driver?.name || 'N/A'}</div>
                          <div className="text-secondary text-xs">{violation.driver?.internalId || ''}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div>
                          <div className="font-medium text-primary">{violation.vehicle?.unitNo || 'N/A'}</div>
                          <div className="text-secondary text-xs">{violation.vehicle?.licensePlate || ''}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-primary">
                        {formatViolationType(violation.violationType)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getSeverityColor(violation.severity)}`}>
                          {violation.severity.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-primary">
                        {new Date(violation.date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(violation.status)}`}>
                          {violation.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-primary">
                        {violation.points}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleViewDetails(violation)}
                            className="text-[#00D1FF] hover:text-blue-800 p-1"
                            title="View Details"
                          >
                            <FaEye />
                          </button>
                          <button
                            onClick={() => handleDelete(violation._id)}
                            className="text-[#A855F7] hover:text-red-800 p-1"
                            title="Delete"
                          >
                            <FaTrash />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="px-6 py-4 bg-card border-t border-theme">
              <div className="flex items-center justify-between">
                <div className="text-sm text-primary">
                  Showing <span className="font-medium">{(pagination.page - 1) * pagination.limit + 1}</span> to{' '}
                  <span className="font-medium">
                    {Math.min(pagination.page * pagination.limit, pagination.total)}
                  </span>{' '}
                  of <span className="font-medium">{pagination.total}</span> violations
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => fetchViolations(pagination.page - 1)}
                    disabled={pagination.page === 1}
                    className="px-4 py-2 border border-theme rounded-lg text-sm font-medium text-primary bg-card hover:bg-[rgba(255,255,255,0.03)] disabled:bg-card disabled:text-secondary disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => fetchViolations(pagination.page + 1)}
                    disabled={pagination.page === pagination.totalPages}
                    className="px-4 py-2 border border-theme rounded-lg text-sm font-medium text-primary bg-card hover:bg-[rgba(255,255,255,0.03)] disabled:bg-card disabled:text-secondary disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Details Modal */}
      {selectedViolation && (
        <Modal
          title="Violation Details"
          open={showDetailsModal}
          onCancel={() => {
            setShowDetailsModal(false);
            setSelectedViolation(null);
          }}
          footer={null}
          width={800}
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-secondary">Violation ID</label>
                <div className="text-lg font-bold text-primary">{selectedViolation.violationId}</div>
              </div>
              <div>
                <label className="text-sm font-medium text-secondary">Date</label>
                <div className="text-lg text-primary">{new Date(selectedViolation.date).toLocaleString()}</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-secondary">Driver</label>
                <div className="text-lg text-primary">{selectedViolation.driver?.name || 'N/A'}</div>
              </div>
              <div>
                <label className="text-sm font-medium text-secondary">Vehicle</label>
                <div className="text-lg text-primary">{selectedViolation.vehicle?.unitNo || 'N/A'}</div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium text-secondary">Type</label>
                <div className="text-lg text-primary">{formatViolationType(selectedViolation.violationType)}</div>
              </div>
              <div>
                <label className="text-sm font-medium text-secondary">Severity</label>
                <div>
                  <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getSeverityColor(selectedViolation.severity)}`}>
                    {selectedViolation.severity.toUpperCase()}
                  </span>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-secondary">Points</label>
                <div className="text-lg font-bold text-[#A855F7]">{selectedViolation.points}</div>
              </div>
            </div>

            {selectedViolation.violationDetails && (
              <div>
                <label className="text-sm font-medium text-secondary">Violation Details</label>
                <div className="bg-card p-4 rounded-lg mt-2">
                  {selectedViolation.violationDetails.speedLimit && (
                    <div className="flex justify-between py-2 border-b border-theme">
                      <span className="text-primary">Speed Limit:</span>
                      <span className="font-semibold">{selectedViolation.violationDetails.speedLimit} km/h</span>
                    </div>
                  )}
                  {selectedViolation.violationDetails.actualSpeed && (
                    <div className="flex justify-between py-2 border-b border-theme">
                      <span className="text-primary">Actual Speed:</span>
                      <span className="font-semibold text-[#A855F7]">{selectedViolation.violationDetails.actualSpeed} km/h</span>
                    </div>
                  )}
                  {selectedViolation.violationDetails.speedOver && (
                    <div className="flex justify-between py-2">
                      <span className="text-primary">Speed Over:</span>
                      <span className="font-semibold text-[#A855F7]">+{selectedViolation.violationDetails.speedOver} km/h</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {selectedViolation.description && (
              <div>
                <label className="text-sm font-medium text-secondary">Description</label>
                <div className="text-primary mt-2">{selectedViolation.description}</div>
              </div>
            )}

            {selectedViolation.location && (
              <div>
                <label className="text-sm font-medium text-secondary">Location</label>
                <div className="text-primary mt-2">
                  {selectedViolation.location.address || `${selectedViolation.location.latitude}, ${selectedViolation.location.longitude}`}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-secondary">Status</label>
                <div className="mt-2">
                  <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(selectedViolation.status)}`}>
                    {selectedViolation.status.toUpperCase()}
                  </span>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-secondary">Source</label>
                <div className="text-lg text-primary mt-2">{selectedViolation.source.toUpperCase()}</div>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default DriverViolationsPage;

