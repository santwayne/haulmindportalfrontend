import apiClient from '../apiClient';
import type { AxiosResponse } from 'axios';

// Customer Management APIs

// Get all customers with filters and pagination
export const getAllCustomers = async (_page: number = 1, _limit: number = 10, search?: string, status?: string, type?: string, sortBy?: string, sortOrder?: string) => {
  try {
    const params = new URLSearchParams();
    
    if (search) params.append('search', search);
    if (status) params.append('status', status);
    if (type) params.append('type', type);
    if (sortBy) params.append('sortBy', sortBy);
    if (sortOrder) params.append('sortOrder', sortOrder);
    
    const res: AxiosResponse = await apiClient.get(`dispatcher/customer?${params.toString()}`);
    return res.data;
  } catch (error) {
    console.log(error);
    return (error as any).response?.data;
  }
};

// Create customer
export const createCustomer = async (data: any) => {
  try {
    const res: AxiosResponse = await apiClient.post('dispatcher/customer', data);
    return res.data;
  } catch (error) {
    console.log(error);
    return (error as any).response?.data;
  }
};

// Update customer
export const updateCustomer = async (id: string, data: any) => {
  try {
    const res: AxiosResponse = await apiClient.put(`dispatcher/customer/${id}`, data);
    return res.data;
  } catch (error) {
    console.log(error);
    return (error as any).response?.data;
  }
};

// Get customer by ID
export const getCustomerById = async (id: string) => {
  try {
    const res: AxiosResponse = await apiClient.get(`dispatcher/customer/${id}`);
    return res.data;
  } catch (error) {
    console.log(error);
    return (error as any).response?.data;
  }
};

// Delete customer
export const deleteCustomer = async (id: string) => {
  try {
    const res: AxiosResponse = await apiClient.delete(`dispatcher/customer/${id}`);
    return res.data;
  } catch (error) {
    console.log(error);
    return (error as any).response?.data;
  }
};

// Import customers from CSV/Excel
export const importCustomersFromFile = async (file: File, fieldMap: Record<string, string>) => {
  try {
    const form = new FormData();
    form.append('file', file);
    form.append('fieldMap', JSON.stringify(fieldMap));
    const res: AxiosResponse = await apiClient.post('dispatcher/customer/import', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  } catch (error) {
    console.log(error);
    return (error as any).response?.data;
  }
};

