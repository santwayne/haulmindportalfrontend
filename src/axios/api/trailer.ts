import apiClient from '../apiClient';
import type { AxiosResponse } from 'axios';

// Trailer Management APIs

// Get all trailers with filters and pagination
export const getAllTrailers = async (
  page: number = 1,
  limit: number = 100,
  search?: string,
  type?: string,
  status?: string,
  operationStatus?: string,
  yard?: string,
  ownership?: string,
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
    if (yard) params.append('yard', yard);
    if (ownership) params.append('ownership', ownership);
    if (sortBy) params.append('sortBy', sortBy);
    if (sortOrder) params.append('sortOrder', sortOrder);
    
    const res: AxiosResponse = await apiClient.get(`dispatcher/trailer?${params.toString()}`);
    return res.data;
  } catch (error) {
    console.log(error);
    return (error as any).response?.data;
  }
};

// Create trailer
export const createTrailer = async (data: FormData) => {
  try {
    const res: AxiosResponse = await apiClient.post('dispatcher/trailer', data, {
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

// Update trailer
export const updateTrailer = async (id: string, data: FormData) => {
  try {
    const res: AxiosResponse = await apiClient.put(`dispatcher/trailer/${id}`, data, {
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

// Get trailer by ID
export const getTrailerById = async (id: string) => {
  try {
    const res: AxiosResponse = await apiClient.get(`dispatcher/trailer/${id}`);
    return res.data;
  } catch (error) {
    console.log(error);
    return (error as any).response?.data;
  }
};

// Delete trailer
export const deleteTrailer = async (id: string) => {
  try {
    const res: AxiosResponse = await apiClient.delete(`dispatcher/trailer/${id}`);
    return res.data;
  } catch (error) {
    console.log(error);
    return (error as any).response?.data;
  }
};

// Search trailers
export const searchTrailers = async (query: string) => {
  try {
    const res: AxiosResponse = await apiClient.get(`dispatcher/trailer/search?q=${encodeURIComponent(query)}`);
    return res.data;
  } catch (error) {
    console.log(error);
    return (error as any).response?.data;
  }
};

// Get trailer statistics
export const getTrailerStats = async () => {
  try {
    const res: AxiosResponse = await apiClient.get('dispatcher/trailer/stats');
    return res.data;
  } catch (error) {
    console.log(error);
    return (error as any).response?.data;
  }
};

