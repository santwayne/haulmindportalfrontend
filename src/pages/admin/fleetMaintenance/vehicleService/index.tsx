import { useState, useEffect } from 'react';
import {
  Plus,
  Edit,
  Trash2,
  Search,
  X
} from 'lucide-react';
import { message } from 'antd';
import {
  createVehicleService,
  updateVehicleService,
  updateServiceStatus,
  deleteVehicleService,
  listVehicleServices,
  type VehicleServiceData,
  type UpdateServiceData,
  type ServiceFilters,
  type VehicleServiceResponse
} from '../../../../axios/api/vehicleService';

// Types
interface ServiceFormData {
  vehicleId: string;
  serviceType: 'oil-change' | 'tire-rotation' | 'brake-inspection' | 'general-maintenance' | 'other';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  dueDate: string;
  dueMileage: number;
  assignedMechanic: string;
  description: string;
}

const VehicleServiceManagement = () => {
  // State management
  const [services, setServices] = useState<VehicleServiceResponse[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [showEditModal, setShowEditModal] = useState<boolean>(false);
  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);
  const [selectedService, setSelectedService] = useState<VehicleServiceResponse | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Filters
  const [filters, setFilters] = useState<ServiceFilters>({});
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Form data
  const [formData, setFormData] = useState<ServiceFormData>({
    vehicleId: '',
    serviceType: 'oil-change',
    priority: 'medium',
    dueDate: '',
    dueMileage: 0,
    assignedMechanic: '',
    description: ''
  });

  // Mock data for dropdowns (replace with actual API calls)
  const vehicles = [
    { _id: '1', vehicleNumber: 'ABC-123', model: 'Freightliner' },
    { _id: '2', vehicleNumber: 'XYZ-456', model: 'Volvo' },
  ];

  const mechanics = [
    { _id: '1', first_name: 'John', last_name: 'Doe' },
    { _id: '2', first_name: 'Jane', last_name: 'Smith' },
  ];

  // Load services on component mount
  useEffect(() => {
    fetchServices();
  }, [filters]);

  // ✅ FETCH SERVICES WITH FILTERS
  const fetchServices = async () => {
    setLoading(true);
    try {
      const response = await listVehicleServices(filters);
      if (response?.success) {
        setServices(response.data || []);
      } else {
        message.error(response?.message || 'Failed to fetch services');
      }
    } catch (error) {
      console.error('Error fetching services:', error);
      message.error('Failed to fetch services');
    } finally {
      setLoading(false);
    }
  };

  // ✅ CREATE SERVICE
  const handleCreateService = async () => {
    setSubmitting(true);
    try {
      const serviceData: VehicleServiceData = {
        vehicleId: formData.vehicleId,
        serviceType: formData.serviceType,
        priority: formData.priority,
        dueDate: formData.dueDate,
        dueMileage: formData.dueMileage,
        assignedMechanic: formData.assignedMechanic,
        description: formData.description
      };

      const response = await createVehicleService(serviceData);
      if (response?.success) {
        message.success('Service created successfully');
        setShowCreateModal(false);
        resetForm();
        fetchServices();
      } else {
        message.error(response?.message || 'Failed to create service');
      }
    } catch (error) {
      console.error('Error creating service:', error);
      message.error('Failed to create service');
    } finally {
      setSubmitting(false);
    }
  };

  // ✅ UPDATE SERVICE
  const handleUpdateService = async () => {
    if (!selectedService) return;

    setSubmitting(true);
    try {
      const updateData: UpdateServiceData = {
        vehicleId: formData.vehicleId,
        serviceType: formData.serviceType,
        priority: formData.priority,
        dueDate: formData.dueDate,
        dueMileage: formData.dueMileage,
        assignedMechanic: formData.assignedMechanic,
        description: formData.description
      };

      const response = await updateVehicleService(selectedService._id, updateData);
      if (response?.success) {
        message.success('Service updated successfully');
        setShowEditModal(false);
        resetForm();
        fetchServices();
      } else {
        message.error(response?.message || 'Failed to update service');
      }
    } catch (error) {
      console.error('Error updating service:', error);
      message.error('Failed to update service');
    } finally {
      setSubmitting(false);
    }
  };

  // ✅ UPDATE SERVICE STATUS
  const handleUpdateStatus = async (serviceId: string, status: 'pending' | 'in-progress' | 'completed') => {
    try {
      const response = await updateServiceStatus(serviceId, status);
      if (response?.success) {
        message.success('Service status updated successfully');
        fetchServices();
      } else {
        message.error(response?.message || 'Failed to update service status');
      }
    } catch (error) {
      console.error('Error updating service status:', error);
      message.error('Failed to update service status');
    }
  };

  // ✅ DELETE SERVICE
  const handleDeleteService = async () => {
    if (!selectedService) return;

    setSubmitting(true);
    try {
      const response = await deleteVehicleService(selectedService._id);
      if (response?.success) {
        message.success('Service deleted successfully');
        setShowDeleteModal(false);
        fetchServices();
      } else {
        message.error(response?.message || 'Failed to delete service');
      }
    } catch (error) {
      console.error('Error deleting service:', error);
      message.error('Failed to delete service');
    } finally {
      setSubmitting(false);
    }
  };

  // Helper functions
  const resetForm = () => {
    setFormData({
      vehicleId: '',
      serviceType: 'oil-change',
      priority: 'medium',
      dueDate: '',
      dueMileage: 0,
      assignedMechanic: '',
      description: ''
    });
  };

  const openEditModal = (service: VehicleServiceResponse) => {
    setSelectedService(service);
    setFormData({
      vehicleId: service.vehicleId?._id || '',
      serviceType: service.serviceType as any,
      priority: service.priority as any,
      dueDate: service.dueDate ? service.dueDate.split('T')[0] : '', // Convert to YYYY-MM-DD format
      dueMileage: service.dueMileage || 0,
      assignedMechanic: (typeof service.assignedMechanic === 'object' && service.assignedMechanic?._id) || (typeof service.assignedMechanic === 'string' ? service.assignedMechanic : ''),
      description: service.description || ''
    });
    setShowEditModal(true);
  };

  const openDeleteModal = (service: VehicleServiceResponse) => {
    setSelectedService(service);
    setShowDeleteModal(true);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-card text-primary';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'in-progress': return 'bg-blue-100 text-blue-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-card text-primary';
    }
  };

  const filteredServices = services.filter(service =>
    (service.vehicleId?.plateNumber?.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
    service.serviceType.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (typeof service.assignedMechanic === 'object' && service.assignedMechanic?.first_name?.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (typeof service.assignedMechanic === 'object' && service.assignedMechanic?.last_name?.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="p-6 bg-card min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-primary mb-2">Vehicle Service Management</h1>
          <p className="text-secondary">Manage vehicle maintenance services and schedules</p>
        </div>

        {/* Filters and Search */}
        <div className="bg-card rounded-lg shadow-sm p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="flex flex-col md:flex-row gap-4 items-center">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-secondary h-4 w-4" />
                <input
                  type="text"
                  placeholder="Search services..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <select
                value={filters.priority || ''}
                onChange={(e) => setFilters({ ...filters, priority: e.target.value as any || undefined })}
                className="px-4 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Priorities</option>
                <option value="urgent">Urgent</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>

              <select
                value={filters.status || ''}
                onChange={(e) => setFilters({ ...filters, status: e.target.value as any || undefined })}
                className="px-4 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="in-progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
            </div>

            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Create Service
            </button>
          </div>
        </div>

        {/* Services Table */}
        <div className="bg-card rounded-lg shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-secondary">Loading services...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-theme">
                <thead className="bg-card">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                      Vehicle
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                      Service Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                      Priority
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                      Due Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                      Assigned Mechanic
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-card divide-y divide-theme">
                  {filteredServices.map((service) => (
                    <tr key={service._id} className="hover:bg-[rgba(255,255,255,0.03)]">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-primary">
                            {service.vehicleId?.plateNumber || service.vehicleId?.internalId || 'N/A'}
                          </div>
                          <div className="text-sm text-secondary">{service.vehicleId?.make || ''} {service.vehicleId?.model || ''}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-primary">
                        {service.serviceType.replace('-', ' ').toUpperCase()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPriorityColor(service.priority)}`}>
                          {service.priority.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(service.status)}`}>
                            {service.status.replace('-', ' ').toUpperCase()}
                          </span>
                          {service.status !== 'completed' && (
                            <select
                              value={service.status}
                              onChange={(e) => handleUpdateStatus(service._id, e.target.value as any)}
                              className="text-xs border border-theme rounded px-2 py-1"
                            >
                              <option value="pending">Pending</option>
                              <option value="in-progress">In Progress</option>
                              <option value="completed">Completed</option>
                            </select>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-primary">
                        {service.dueDate ? new Date(service.dueDate).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-primary">
                        {typeof service.assignedMechanic === 'object' && service.assignedMechanic
                          ? `${service.assignedMechanic.first_name || ''} ${service.assignedMechanic.last_name || ''}`.trim() || 'N/A'
                          : 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openEditModal(service)}
                            className="text-[#00D1FF] hover:text-blue-900"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => openDeleteModal(service)}
                            className="text-[#A855F7] hover:text-red-900"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Create Service Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-card rounded-lg p-6 w-full max-w-md">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Create Service</h3>
                <button onClick={() => setShowCreateModal(false)}>
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-primary mb-1">Vehicle</label>
                  <select
                    value={formData.vehicleId}
                    onChange={(e) => setFormData({ ...formData, vehicleId: e.target.value })}
                    className="w-full px-3 py-2 border border-theme rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select Vehicle</option>
                    {vehicles.map(vehicle => (
                      <option key={vehicle._id} value={vehicle._id}>
                        {vehicle.vehicleNumber} - {vehicle.model}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-primary mb-1">Service Type</label>
                  <select
                    value={formData.serviceType}
                    onChange={(e) => setFormData({ ...formData, serviceType: e.target.value as any })}
                    className="w-full px-3 py-2 border border-theme rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="oil-change">Oil Change</option>
                    <option value="tire-rotation">Tire Rotation</option>
                    <option value="brake-inspection">Brake Inspection</option>
                    <option value="general-maintenance">General Maintenance</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-primary mb-1">Priority</label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                    className="w-full px-3 py-2 border border-theme rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-primary mb-1">Due Date</label>
                  <input
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                    className="w-full px-3 py-2 border border-theme rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-primary mb-1">Due Mileage</label>
                  <input
                    type="number"
                    value={formData.dueMileage}
                    onChange={(e) => setFormData({ ...formData, dueMileage: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-theme rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-primary mb-1">Assigned Mechanic</label>
                  <select
                    value={formData.assignedMechanic}
                    onChange={(e) => setFormData({ ...formData, assignedMechanic: e.target.value })}
                    className="w-full px-3 py-2 border border-theme rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select Mechanic</option>
                    {mechanics.map(mechanic => (
                      <option key={mechanic._id} value={mechanic._id}>
                        {mechanic.first_name} {mechanic.last_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-primary mb-1">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-theme rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <button
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 text-secondary border border-theme rounded-md hover:bg-[rgba(255,255,255,0.03)]"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateService}
                    disabled={submitting}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    {submitting ? 'Creating...' : 'Create Service'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Edit Service Modal */}
        {showEditModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-card rounded-lg p-6 w-full max-w-md">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Edit Service</h3>
                <button onClick={() => setShowEditModal(false)}>
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Same form fields as create modal */}
                <div>
                  <label className="block text-sm font-medium text-primary mb-1">Vehicle</label>
                  <select
                    value={formData.vehicleId}
                    onChange={(e) => setFormData({ ...formData, vehicleId: e.target.value })}
                    className="w-full px-3 py-2 border border-theme rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select Vehicle</option>
                    {vehicles.map(vehicle => (
                      <option key={vehicle._id} value={vehicle._id}>
                        {vehicle.vehicleNumber} - {vehicle.model}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Add other form fields here - same as create modal */}
                <div>
                  <label className="block text-sm font-medium text-primary mb-1">Service Type</label>
                  <select
                    value={formData.serviceType}
                    onChange={(e) => setFormData({ ...formData, serviceType: e.target.value as any })}
                    className="w-full px-3 py-2 border border-theme rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="oil-change">Oil Change</option>
                    <option value="tire-rotation">Tire Rotation</option>
                    <option value="brake-inspection">Brake Inspection</option>
                    <option value="general-maintenance">General Maintenance</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-primary mb-1">Priority</label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                    className="w-full px-3 py-2 border border-theme rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-primary mb-1">Due Date</label>
                  <input
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                    className="w-full px-3 py-2 border border-theme rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-primary mb-1">Due Mileage</label>
                  <input
                    type="number"
                    value={formData.dueMileage}
                    onChange={(e) => setFormData({ ...formData, dueMileage: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-theme rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-primary mb-1">Assigned Mechanic</label>
                  <select
                    value={formData.assignedMechanic}
                    onChange={(e) => setFormData({ ...formData, assignedMechanic: e.target.value })}
                    className="w-full px-3 py-2 border border-theme rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select Mechanic</option>
                    {mechanics.map(mechanic => (
                      <option key={mechanic._id} value={mechanic._id}>
                        {mechanic.first_name} {mechanic.last_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-primary mb-1">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-theme rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <button
                    onClick={() => setShowEditModal(false)}
                    className="px-4 py-2 text-secondary border border-theme rounded-md hover:bg-[rgba(255,255,255,0.03)]"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleUpdateService}
                    disabled={submitting}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    {submitting ? 'Updating...' : 'Update Service'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteModal && selectedService && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-card rounded-lg p-6 w-full max-w-md">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Delete Service</h3>
                <button onClick={() => setShowDeleteModal(false)}>
                  <X className="h-5 w-5" />
                </button>
              </div>

              <p className="text-secondary mb-6">
                Are you sure you want to delete this service? This action cannot be undone.
              </p>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="px-4 py-2 text-secondary border border-theme rounded-md hover:bg-[rgba(255,255,255,0.03)]"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteService}
                  disabled={submitting}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
                >
                  {submitting ? 'Deleting...' : 'Delete Service'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VehicleServiceManagement;



