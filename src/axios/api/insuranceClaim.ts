import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://portal.logistiqinnovations.ca/api/v1';

// Get all insurance claims
export const getInsuranceClaims = async (params?: {
  status?: string;
  claimType?: string;
  search?: string;
  page?: number;
  limit?: number;
}) => {
  try {
    const token = localStorage.getItem('token');
    const response = await axios.get(`${API_BASE_URL}/admin/insurance-claims`, {
      headers: {
        Authorization: `Bearer ${token}`
      },
      params
    });
    return response.data;
  } catch (error: any) {
    throw error.response?.data || error;
  }
};

// Get insurance claim by ID
export const getInsuranceClaimById = async (id: string) => {
  try {
    const token = localStorage.getItem('token');
    const response = await axios.get(`${API_BASE_URL}/admin/insurance-claims/${id}`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    return response.data;
  } catch (error: any) {
    throw error.response?.data || error;
  }
};

// Create insurance claim
export const createInsuranceClaim = async (data: any) => {
  try {
    const token = localStorage.getItem('token');
    const response = await axios.post(`${API_BASE_URL}/admin/insurance-claims`, data, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    return response.data;
  } catch (error: any) {
    throw error.response?.data || error;
  }
};

// Update insurance claim
export const updateInsuranceClaim = async (id: string, data: any) => {
  try {
    const token = localStorage.getItem('token');
    const response = await axios.put(`${API_BASE_URL}/admin/insurance-claims/${id}`, data, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    return response.data;
  } catch (error: any) {
    throw error.response?.data || error;
  }
};

// Delete insurance claim
export const deleteInsuranceClaim = async (id: string) => {
  try {
    const token = localStorage.getItem('token');
    const response = await axios.delete(`${API_BASE_URL}/admin/insurance-claims/${id}`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    return response.data;
  } catch (error: any) {
    throw error.response?.data || error;
  }
};

// Get insurance claim statistics
export const getInsuranceClaimStats = async () => {
  try {
    const token = localStorage.getItem('token');
    const response = await axios.get(`${API_BASE_URL}/admin/insurance-claims/stats`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    return response.data;
  } catch (error: any) {
    throw error.response?.data || error;
  }
};

