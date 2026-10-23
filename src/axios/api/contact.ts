import apiClient from '../apiClient';
import type { AxiosResponse } from 'axios';

// Contact Management APIs

// Get all contacts with filters and pagination
export const getAllContacts = async (page: number = 1, limit: number = 10, search?: string, status?: string, sortBy?: string, sortOrder?: string) => {
  try {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });
    
    if (search) params.append('search', search);
    if (status) params.append('status', status);
    if (sortBy) params.append('sortBy', sortBy);
    if (sortOrder) params.append('sortOrder', sortOrder);
    params.append('role', 'contact');
    
    const res: AxiosResponse = await apiClient.get(`employee?${params.toString()}`);
    return res.data;
  } catch (error) {
    console.log(error);
    return (error as any).response?.data;
  }
};

// Create contact
export const createContact = async (data: any) => {
  try {
    const res: AxiosResponse = await apiClient.post('contact', data);
    return res.data;
  } catch (error) {
    console.log(error);
    return (error as any).response?.data;
  }
};

// Update contact
export const updateContact = async (id: string, data: any) => {
  try {
    const res: AxiosResponse = await apiClient.put(`contact/${id}`, data);
    return res.data;
  } catch (error) {
    console.log(error);
    return (error as any).response?.data;
  }
};

// Delete contact
export const deleteContact = async (id: string) => {
  try {
    const res: AxiosResponse = await apiClient.delete(`contact/${id}`);
    return res.data;
  } catch (error) {
    console.log(error);
    return (error as any).response?.data;
  }
};

