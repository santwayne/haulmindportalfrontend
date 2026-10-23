
import apiClient from "../apiClient";
import { type AxiosResponse } from 'axios';

// Base service types for backward compatibility
export type BaseVehicleServiceType =
  | 'oil-change'
  | 'dpf-filter'
  | 'valve-adjustment'
  | 'radiator-change'
  | 'oil-pump'
  | 'coolant-filter'
  | 'after-treatment-system'
  | 'transmission-service'
  | 'brake-inspection'
  | 'tire-rotation'
  | 'general-maintenance'
  | 'inspection'
  | 'other';

// Extended type to support custom service types (kebab-case format)
// Custom service types are generated from company service names
export type VehicleServiceType = BaseVehicleServiceType | string;

export type VehicleServicePriority = 'low' | 'medium' | 'high' | 'urgent';
export type VehicleServiceStatus = 'pending' | 'in-progress' | 'completed';

interface Error {
  response?: {
    data?: {
      message: string;
    };
  };
}

// Vehicle Service Data Types
export interface VehicleServiceData {
  vehicleId?: string;
  unitNumber?: string;
  unitType?: string;
  makeModel?: string;
  serviceType: VehicleServiceType;
  priority: VehicleServicePriority;
  dueDate: string;
  dueMileage: number;
  assignedMechanic?: string;
  description?: string;
  status?: VehicleServiceStatus;
  serviceDate?: string;
  odometer?: number;
  parts?: string;
  notes?: string;
  serviceProvider?: string;
  invoiceNumber?: string;
  amount?: number;
  estimatedCost?: number;
  estimatedTime?: string;
  mechanicType?: 'internal' | 'external';
  externalMechanicName?: string;
  externalMechanicCompany?: string;
  externalMechanicPhone?: string;
  externalMechanicEmail?: string;
}

export interface UpdateServiceData extends Partial<VehicleServiceData> {}

export interface ServiceFilters {
  priority?: VehicleServicePriority;
  status?: VehicleServiceStatus;
  serviceType?: VehicleServiceType;
  mechanic?: string;
  vehicleId?: string;
  unitNumber?: string;
}

interface AssignedMechanicDetails {
  _id: string;
  first_name: string;
  last_name: string;
  email: string;
}

export interface VehicleServiceResponse {
  _id: string;
  vehicleId?: {
    _id: string;
    plateNumber: string;
    internalId?: string;
    model?: string;
    make?: string;
    year?: number;
  };
  unitNumber?: string;
  unitType?: string;
  makeModel?: string;
  serviceType: VehicleServiceType;
  priority: VehicleServicePriority;
  dueDate?: string;
  dueMileage?: number;
  serviceDate?: string;
  odometer?: number;
  assignedMechanic?: string | AssignedMechanicDetails;
  description?: string;
  invoiceNumber?: string;
  notes?: string;
  amount?: number;
  status: VehicleServiceStatus;
  parts?: Array<{ partName?: string; partNumber?: string; quantity?: number; cost?: number }> | string | null;
  mechanicType?: 'internal' | 'external';
  externalMechanicName?: string;
  externalMechanicCompany?: string;
  externalMechanicPhone?: string;
  externalMechanicEmail?: string;
  createdAt: string;
  updatedAt: string;
}

// ✅ CREATE VEHICLE SERVICE
export const createVehicleService = async (data: VehicleServiceData) => {
  try {
    console.log('🚀 FRONTEND: Creating vehicle service with data:', data);
    const res: AxiosResponse = await apiClient.post('admin/vehicle-service', data);
    console.log('✅ FRONTEND: Create service response:', res.data);
    return res.data;
  } catch (error) {
    console.log('❌ FRONTEND: Create service error:', error);
    return (error as Error).response?.data;
  }
};

// ✅ UPDATE VEHICLE SERVICE (full update)
export const updateVehicleService = async (id: string, data: UpdateServiceData) => {
  try {
    console.log('🚀 FRONTEND: Updating vehicle service:', id, 'with data:', data);
    const res: AxiosResponse = await apiClient.put(`admin/vehicle-service/${id}`, data);
    console.log('✅ FRONTEND: Update service response:', res.data);
    return res.data;
  } catch (error) {
    console.log('❌ FRONTEND: Update service error:', error);
    return (error as Error).response?.data;
  }
};

// ✅ UPDATE SERVICE STATUS
export const updateServiceStatus = async (id: string, status: 'pending' | 'in-progress' | 'completed') => {
  try {
    console.log('🚀 FRONTEND: Updating service status:', id, 'to:', status);
    const res: AxiosResponse = await apiClient.patch(`admin/vehicle-service/${id}/status`, { status });
    console.log('✅ FRONTEND: Update status response:', res.data);
    return res.data;
  } catch (error) {
    console.log('❌ FRONTEND: Update status error:', error);
    return (error as Error).response?.data;
  }
};

// ✅ DELETE VEHICLE SERVICE
export const deleteVehicleService = async (id: string) => {
  try {
    console.log('🚀 FRONTEND: Deleting vehicle service:', id);
    const res: AxiosResponse = await apiClient.delete(`admin/vehicle-service/${id}`);
    console.log('✅ FRONTEND: Delete service response:', res.data);
    return res.data;
  } catch (error) {
    console.log('❌ FRONTEND: Delete service error:', error);
    return (error as Error).response?.data;
  }
};

// ✅ LIST VEHICLE SERVICES WITH FILTERS
export const listVehicleServices = async (filters?: ServiceFilters) => {
  try {
    console.log('🚀 FRONTEND: Listing vehicle services with filters:', filters);
    const params = new URLSearchParams();
    
    if (filters?.priority) params.append('priority', filters.priority);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.serviceType) params.append('serviceType', filters.serviceType);
    if (filters?.mechanic) params.append('mechanic', filters.mechanic);
    if (filters?.vehicleId) params.append('vehicleId', filters.vehicleId);
    if (filters?.unitNumber) params.append('unitNumber', filters.unitNumber);

    const queryString = params.toString();
    const url = `admin/vehicle-service${queryString ? `?${queryString}` : ''}`;
    
    console.log('📡 FRONTEND: Making request to:', url);
    const res: AxiosResponse = await apiClient.get(url);
    console.log('✅ FRONTEND: List services response:', res.data);
    return res.data;
  } catch (error) {
    console.log('❌ FRONTEND: List services error:', error);
    return (error as Error).response?.data;
  }
};

// ✅ GET SINGLE VEHICLE SERVICE
export const getVehicleServiceById = async (id: string) => {
  try {
    console.log('🚀 FRONTEND: Getting vehicle service by ID:', id);
    const res: AxiosResponse = await apiClient.get(`admin/vehicle-service/${id}`);
    console.log('✅ FRONTEND: Get service by ID response:', res.data);
    return res.data;
  } catch (error) {
    console.log('❌ FRONTEND: Get service by ID error:', error);
    return (error as Error).response?.data;
  }
};

// ✅ GET INCOMING MAINTENANCE COUNT
export const getIncomingMaintenanceCount = async () => {
  try {
    console.log('🚀 FRONTEND: Getting incoming maintenance count');
    const res: AxiosResponse = await apiClient.get('admin/vehicle-service/incoming-maintenance');
    console.log('✅ FRONTEND: Incoming maintenance count response:', res.data);
    return res.data;
  } catch (error) {
    console.log('❌ FRONTEND: Get incoming maintenance count error:', error);
    return (error as Error).response?.data;
  }
};

export const getSamsaraUpcomingServices = async (): Promise<{
  success: boolean;
  count: number;
  data: VehicleServiceResponse[];
}> => {
  try {
    const res: AxiosResponse<{
      success: boolean;
      count: number;
      data: VehicleServiceResponse[];
    }> = await apiClient.get('admin/vehicle-service/samsara-upcoming');

    return res.data;
  } catch (error) {
    console.error('Error fetching Samsara upcoming services:', error);

    return {
      success: false,
      count: 0,
      data: [],
    };
  }
};