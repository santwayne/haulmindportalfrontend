import { type AxiosResponse } from 'axios';
import apiClient from '../apiClient';

// Uses the shared API client (same base URL, token and session-expiry handling as
// the rest of the portal). This file previously called a hard-coded production URL.

const errorBody = (error: any) => error?.response?.data || { success: false, message: error?.message || 'Request failed' };

// Get all insurance claims (the page filters client-side, so ask for the full list)
export const getInsuranceClaims = async (params?: {
  status?: string;
  claimType?: string;
  search?: string;
  page?: number;
  limit?: number;
}) => {
  try {
    const res: AxiosResponse = await apiClient.get('admin/insurance-claims', {
      params: { limit: 1000, ...params }
    });
    return res.data;
  } catch (error: any) {
    return errorBody(error);
  }
};

// Get insurance claim by ID
export const getInsuranceClaimById = async (id: string) => {
  try {
    const res: AxiosResponse = await apiClient.get(`admin/insurance-claims/${id}`);
    return res.data;
  } catch (error: any) {
    return errorBody(error);
  }
};

// Create insurance claim — pass FormData to include document files
export const createInsuranceClaim = async (data: any) => {
  try {
    const res: AxiosResponse = await apiClient.post('admin/insurance-claims', data);
    return res.data;
  } catch (error: any) {
    return errorBody(error);
  }
};

// Update insurance claim — pass FormData to add files / remove documents
export const updateInsuranceClaim = async (id: string, data: any) => {
  try {
    const res: AxiosResponse = await apiClient.put(`admin/insurance-claims/${id}`, data);
    return res.data;
  } catch (error: any) {
    return errorBody(error);
  }
};

// Delete insurance claim
export const deleteInsuranceClaim = async (id: string) => {
  try {
    const res: AxiosResponse = await apiClient.delete(`admin/insurance-claims/${id}`);
    return res.data;
  } catch (error: any) {
    return errorBody(error);
  }
};

// Get insurance claim statistics
export const getInsuranceClaimStats = async () => {
  try {
    const res: AxiosResponse = await apiClient.get('admin/insurance-claims/stats');
    return res.data;
  } catch (error: any) {
    return errorBody(error);
  }
};
