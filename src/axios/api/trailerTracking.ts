import apiClient from "../apiClient";

// ✅ GET ALL TRAILERS WITH FILTERS
export const listTrailers = async (params?: {
  status?: string;
  type?: string;
  isAttached?: boolean;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: string;
}) => {
  try {
    const response = await apiClient.get('/trailer-tracking', { params });
    return response.data;
  } catch (error) {
    console.error('Error fetching trailers:', error);
    throw error;
  }
};

// ✅ GET TRAILER BY ID
export const getTrailerById = async (id: string) => {
  try {
    const response = await apiClient.get(`/trailer-tracking/${id}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching trailer:', error);
    throw error;
  }
};

// ✅ UPDATE TRAILER LOCATION
export const updateTrailerLocation = async (id: string, locationData: {
  latitude: number;
  longitude: number;
  address?: string;
  speed?: number;
  sensors?: any;
}) => {
  try {
    const response = await apiClient.patch(`/trailer-tracking/${id}/location`, locationData);
    return response.data;
  } catch (error) {
    console.error('Error updating trailer location:', error);
    throw error;
  }
};

// ✅ GET TRAILER STATISTICS
export const getTrailerStats = async () => {
  try {
    const response = await apiClient.get('/trailer-tracking/stats/overview');
    return response.data;
  } catch (error) {
    console.error('Error fetching trailer statistics:', error);
    throw error;
  }
};
