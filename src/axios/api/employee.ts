import apiClient from '../apiClient';
import type { AxiosResponse } from 'axios';

// Employee Management APIs

// Get all employees with filters and pagination
export const getAllEmployees = async (page: number = 1, limit: number = 10, search?: string, role?: string, status?: string, sortBy?: string, sortOrder?: string, hasRole?: string) => {
  try {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });
    
    if (search) params.append('search', search);
    if (role) params.append('role', role);
    if (status) params.append('status', status);
    if (sortBy) params.append('sortBy', sortBy);
    if (sortOrder) params.append('sortOrder', sortOrder);
    if (hasRole) params.append('hasRole', hasRole);
    
    const res: AxiosResponse = await apiClient.get(`employee?${params.toString()}`);
    return res.data;
  } catch (error) {
    console.log(error);
    return (error as any).response?.data;
  }
};

// Get employee by ID
export const getEmployeeById = async (id: string) => {
  try {
    const res: AxiosResponse = await apiClient.get(`employee/${id}`);
    return res.data;
  } catch (error) {
    console.log(error);
    return (error as any).response?.data;
  }
};

// Create new employee
export const createEmployee = async (data: any) => {
  try {
    const res: AxiosResponse = await apiClient.post('employee', data);
    return res.data;
  } catch (error) {
    console.log(error);
    return (error as any).response?.data;
  }
};

// Update employee
export const updateEmployee = async (id: string, data: any) => {
  try {
    const res: AxiosResponse = await apiClient.put(`employee/${id}`, data);
    return res.data;
  } catch (error) {
    console.log(error);
    return (error as any).response?.data;
  }
};

// Update employee status
export const updateEmployeeStatus = async (id: string, status: string) => {
  try {
    const res: AxiosResponse = await apiClient.patch(`employee/${id}/status`, { status });
    return res.data;
  } catch (error) {
    console.log(error);
    return (error as any).response?.data;
  }
};

// Delete employee
export const deleteEmployee = async (id: string) => {
  try {
    const res: AxiosResponse = await apiClient.delete(`employee/${id}`);
    return res.data;
  } catch (error) {
    console.log(error);
    return (error as any).response?.data;
  }
};

// Bulk delete employees
export const bulkDeleteEmployees = async (ids: string[]) => {
  try {
    const res: AxiosResponse = await apiClient.delete('employee/bulk/delete', { data: { ids } });
    return res.data;
  } catch (error) {
    console.log(error);
    return (error as any).response?.data;
  }
};

// Get employee statistics
export const getEmployeeStats = async () => {
  try {
    console.log('🔍 Making API call to employee/stats');
    const res: AxiosResponse = await apiClient.get('employee/stats');
    console.log('🔍 Employee stats API response:', res.data);
    return res.data;
  } catch (error) {
    console.error('❌ Employee stats API error:', error);
    console.error('❌ Error response:', (error as any).response?.data);
    return (error as any).response?.data;
  }
};

// Reset employee password
export const resetEmployeePassword = async (id: string, password: string) => {
  try {
    const res: AxiosResponse = await apiClient.patch(`employee/${id}/reset-password`, { password });
    return res.data;
  } catch (error) {
    console.log(error);
    return (error as any).response?.data;
  }
};

export const importEmployeesFromFile = async (file: File, fieldMap: Record<string, string> = {}) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('fieldMap', JSON.stringify(fieldMap));
  try {
    const res: AxiosResponse = await apiClient.post('employee/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return res.data;
  } catch (error) {
    return (error as any).response?.data;
  }
};
