import type { AxiosResponse } from 'axios';
import apiClient from '../apiClient';

export interface Yard {
  _id?: string;
  yardId: string;
  yardName: string;
  yardCode: string;
  yardType: 'parking' | 'drop yard' | 'terminal' | 'maintenance' | 'warehouse';
  status: 'active' | 'inactive';
  address?: string;
  unit?: string;
  city?: string;
  stateProvince?: string;
  country?: string;
  zipPostalCode?: string;
  coordinates?: {
    latitude: number | null;
    longitude: number | null;
    geocodedAt: string | null;
  };
  company?: string;
  createdBy?: string;
  updatedBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateYardData {
  yardName: string;
  yardCode: string;
  yardType: 'parking' | 'drop yard' | 'terminal' | 'maintenance' | 'warehouse';
  status?: 'active' | 'inactive';
  address: string;
  unit?: string;
  city: string;
  stateProvince: string;
  country: string;
  zipPostalCode: string;
}

export interface UpdateYardData {
  yardName?: string;
  yardCode?: string;
  yardType?: 'parking' | 'drop yard' | 'terminal' | 'maintenance' | 'warehouse';
  status?: 'active' | 'inactive';
  address?: string;
  unit?: string;
  city?: string;
  stateProvince?: string;
  country?: string;
  zipPostalCode?: string;
}

// Get all yards
export const getAllYards = async (): Promise<{ success: boolean; data: Yard[]; count: number }> => {
  try {
    const res: AxiosResponse = await apiClient.get('hr/fleet-maintenance/yards');
    return res.data;
  } catch (error) {
    console.error('Error fetching yards:', error);
    return (error as any).response?.data || { success: false, data: [], count: 0 };
  }
};

// Get yard by ID
export const getYardById = async (id: string): Promise<{ success: boolean; data: Yard }> => {
  try {
    const res: AxiosResponse = await apiClient.get(`hr/fleet-maintenance/yards/${id}`);
    return res.data;
  } catch (error) {
    console.error('Error fetching yard:', error);
    return (error as any).response?.data;
  }
};

// Create yard
export const createYard = async (data: CreateYardData): Promise<{ success: boolean; message: string; data: Yard }> => {
  try {
    const res: AxiosResponse = await apiClient.post('hr/fleet-maintenance/yards', data);
    return res.data;
  } catch (error) {
    console.error('Error creating yard:', error);
    return (error as any).response?.data;
  }
};

// Update yard
export const updateYard = async (id: string, data: UpdateYardData): Promise<{ success: boolean; message: string; data: Yard }> => {
  try {
    const res: AxiosResponse = await apiClient.put(`hr/fleet-maintenance/yards/${id}`, data);
    return res.data;
  } catch (error) {
    console.error('Error updating yard:', error);
    return (error as any).response?.data;
  }
};

// Delete yard
export const deleteYard = async (id: string): Promise<{ success: boolean; message: string }> => {
  try {
    const res: AxiosResponse = await apiClient.delete(`hr/fleet-maintenance/yards/${id}`);
    return res.data;
  } catch (error) {
    console.error('Error deleting yard:', error);
    return (error as any).response?.data;
  }
};

