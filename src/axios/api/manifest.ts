import type { AxiosResponse } from 'axios';
import apiClient from '../apiClient';

interface ApiError {
  response?: { data?: { message: string } };
}

export const getManifests = async (params?: {
  search?: string;
  status?: string;
  page?: number;
  limit?: number;
}) => {
  try {
    const query = new URLSearchParams();
    if (params?.search) query.append('search', params.search);
    if (params?.status) query.append('status', params.status);
    if (params?.page) query.append('page', params.page.toString());
    if (params?.limit) query.append('limit', params.limit.toString());
    const res: AxiosResponse = await apiClient.get(`admin/manifests?${query.toString()}`);
    return res.data;
  } catch (error) {
    return (error as ApiError).response?.data;
  }
};

export const getManifestById = async (id: string) => {
  try {
    const res: AxiosResponse = await apiClient.get(`admin/manifests/${id}`);
    return res.data;
  } catch (error) {
    return (error as ApiError).response?.data;
  }
};
