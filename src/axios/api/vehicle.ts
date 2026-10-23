import apiClient from '../apiClient';
import type { AxiosResponse } from 'axios';

// Vehicle/Truck Management APIs

// Get all vehicles with filters and pagination
export const getAllVehicles = async (
  page: number = 1,
  limit: number = 100,
  search?: string,
  type?: string,
  status?: string,
  operationStatus?: string,
  ownership?: string,
  yard?: string,
  sortBy?: string,
  sortOrder?: string
) => {
  try {
    const params = new URLSearchParams();
    params.append('page', page.toString());
    params.append('limit', limit.toString());
    
    if (search) params.append('search', search);
    if (type) params.append('type', type);
    if (status) params.append('status', status);
    if (operationStatus) params.append('operationStatus', operationStatus);
    if (ownership) params.append('ownership', ownership);
    if (yard) params.append('yard', yard);
    if (sortBy) params.append('sortBy', sortBy);
    if (sortOrder) params.append('sortOrder', sortOrder);
    
    const res: AxiosResponse = await apiClient.get(`dispatcher/vehicle?${params.toString()}`);
    return res.data;
  } catch (error) {
    console.log(error);
    return (error as any).response?.data;
  }
};

// Create vehicle
export const createVehicle = async (data: FormData) => {
  try {
    const res: AxiosResponse = await apiClient.post('dispatcher/vehicle', data, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return res.data;
  } catch (error) {
    console.log(error);
    return (error as any).response?.data;
  }
};

// Update vehicle
export const updateVehicle = async (id: string, data: FormData) => {
  try {
    const res: AxiosResponse = await apiClient.put(`dispatcher/vehicle/${id}`, data, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return res.data;
  } catch (error) {
    console.log(error);
    return (error as any).response?.data;
  }
};

// Get vehicle by ID
export const getVehicleById = async (id: string) => {
  try {
    const res: AxiosResponse = await apiClient.get(`dispatcher/vehicle/${id}`);
    return res.data;
  } catch (error) {
    console.log(error);
    return (error as any).response?.data;
  }
};

// Delete vehicle
export const deleteVehicle = async (id: string) => {
  try {
    const res: AxiosResponse = await apiClient.delete(`dispatcher/vehicle/${id}`);
    return res.data;
  } catch (error) {
    console.log(error);
    return (error as any).response?.data;
  }
};

