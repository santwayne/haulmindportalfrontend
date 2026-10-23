import { useState, useEffect } from 'react';
import { message } from 'antd';
import {
  createVehicleService,
  updateVehicleService,
  updateServiceStatus,
  deleteVehicleService,
  listVehicleServices,
  getVehicleServiceById,
  type VehicleServiceData,
  type UpdateServiceData,
  type ServiceFilters,
  type VehicleServiceResponse
} from '../axios/api/vehicleService';

export const useVehicleServices = (filters?: ServiceFilters) => {
  const [services, setServices] = useState<VehicleServiceResponse[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Fetch services
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

  // Create service
  const createService = async (data: VehicleServiceData) => {
    setSubmitting(true);
    try {
      const response = await createVehicleService(data);
      if (response?.success) {
        message.success('Service created successfully');
        await fetchServices(); // Refresh the list
        return response;
      } else {
        message.error(response?.message || 'Failed to create service');
        return response;
      }
    } catch (error) {
      console.error('Error creating service:', error);
      message.error('Failed to create service');
      return null;
    } finally {
      setSubmitting(false);
    }
  };

  // Update service
  const updateService = async (id: string, data: UpdateServiceData) => {
    setSubmitting(true);
    try {
      const response = await updateVehicleService(id, data);
      if (response?.success) {
        message.success('Service updated successfully');
        await fetchServices(); // Refresh the list
        return response;
      } else {
        message.error(response?.message || 'Failed to update service');
        return response;
      }
    } catch (error) {
      console.error('Error updating service:', error);
      message.error('Failed to update service');
      return null;
    } finally {
      setSubmitting(false);
    }
  };

  // Update service status
  const updateStatus = async (id: string, status: 'pending' | 'in-progress' | 'completed') => {
    try {
      const response = await updateServiceStatus(id, status);
      if (response?.success) {
        message.success('Service status updated successfully');
        await fetchServices(); // Refresh the list
        return response;
      } else {
        message.error(response?.message || 'Failed to update service status');
        return response;
      }
    } catch (error) {
      console.error('Error updating service status:', error);
      message.error('Failed to update service status');
      return null;
    }
  };

  // Delete service
  const deleteService = async (id: string) => {
    setSubmitting(true);
    try {
      const response = await deleteVehicleService(id);
      if (response?.success) {
        message.success('Service deleted successfully');
        await fetchServices(); // Refresh the list
        return response;
      } else {
        message.error(response?.message || 'Failed to delete service');
        return response;
      }
    } catch (error) {
      console.error('Error deleting service:', error);
      message.error('Failed to delete service');
      return null;
    } finally {
      setSubmitting(false);
    }
  };

  // Get single service
  const getService = async (id: string) => {
    try {
      const response = await getVehicleServiceById(id);
      if (response?.success) {
        return response.data;
      } else {
        message.error(response?.message || 'Failed to fetch service');
        return null;
      }
    } catch (error) {
      console.error('Error fetching service:', error);
      message.error('Failed to fetch service');
      return null;
    }
  };

  // Load services on mount or when filters change
  useEffect(() => {
    fetchServices();
  }, [filters]);

  return {
    services,
    loading,
    submitting,
    fetchServices,
    createService,
    updateService,
    updateStatus,
    deleteService,
    getService
  };
};



