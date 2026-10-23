import apiClient from "../apiClient";

// ✅ GET ALL VEHICLES/TRUCKS WITH FILTERS
export const listTrucks = async (params?: {
  status?: string;
  make?: string;
  model?: string;
  driverId?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: string;
}) => {
  try {
    const response = await apiClient.get('/dispatcher/vehicle', { params });
    return response.data;
  } catch (error) {
    console.error('Error fetching trucks:', error);
    throw error;
  }
};

// ✅ GET TRUCK BY ID
export const getTruckById = async (id: string) => {
  try {
    const response = await apiClient.get(`/dispatcher/vehicle/${id}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching truck:', error);
    throw error;
  }
};

// ✅ UPDATE TRUCK LOCATION
export const updateTruckLocation = async (id: string, locationData: {
  latitude: number;
  longitude: number;
  address?: string;
  speed?: number;
  fuelLevel?: number;
  engineOn?: boolean;
}) => {
  try {
    const response = await apiClient.patch(`/dispatcher/vehicle/${id}/location`, locationData);
    return response.data;
  } catch (error) {
    console.error('Error updating truck location:', error);
    throw error;
  }
};

// ✅ UPDATE TRUCK STATUS
export const updateTruckStatus = async (id: string, status: string) => {
  try {
    const response = await apiClient.patch(`/dispatcher/vehicle/${id}/status`, { status });
    return response.data;
  } catch (error) {
    console.error('Error updating truck status:', error);
    throw error;
  }
};

// ✅ GET TRUCK STATISTICS
export const getTruckStats = async () => {
  try {
    const response = await apiClient.get('/dispatcher/vehicle/stats/overview');
    return response.data;
  } catch (error) {
    console.error('Error fetching truck statistics:', error);
    throw error;
  }
};

// ✅ GET TRUCK ROUTE HISTORY
export const getTruckRouteHistory = async (id: string, params?: {
  startDate?: string;
  endDate?: string;
  limit?: number;
}) => {
  try {
    const response = await apiClient.get(`/dispatcher/vehicle/${id}/route-history`, { params });
    return response.data;
  } catch (error) {
    console.error('Error fetching truck route history:', error);
    throw error;
  }
};

// ✅ GET TRUCK MAINTENANCE RECORDS
export const getTruckMaintenance = async (id: string) => {
  try {
    const response = await apiClient.get(`/dispatcher/vehicle/${id}/maintenance`);
    return response.data;
  } catch (error) {
    console.error('Error fetching truck maintenance:', error);
    throw error;
  }
};

// ✅ UPDATE TRUCK MAINTENANCE
export const updateTruckMaintenance = async (id: string, maintenanceData: {
  lastService?: Date;
  nextService?: Date;
  tyreCondition?: 'good' | 'fair' | 'poor';
  brakeCondition?: 'good' | 'fair' | 'poor';
  engineHealth?: 'good' | 'fair' | 'poor';
  issues?: string[];
}) => {
  try {
    const response = await apiClient.patch(`/dispatcher/vehicle/${id}/maintenance`, maintenanceData);
    return response.data;
  } catch (error) {
    console.error('Error updating truck maintenance:', error);
    throw error;
  }
};

// ✅ GET TRUCK DRIVER BEHAVIOR
export const getTruckDriverBehavior = async (id: string) => {
  try {
    const response = await apiClient.get(`/dispatcher/vehicle/${id}/driver-behavior`);
    return response.data;
  } catch (error) {
    console.error('Error fetching truck driver behavior:', error);
    throw error;
  }
};

// ✅ GET TRUCK ENGINE HEALTH
export const getTruckEngineHealth = async (id: string) => {
  try {
    const response = await apiClient.get(`/dispatcher/vehicle/${id}/engine-health`);
    return response.data;
  } catch (error) {
    console.error('Error fetching truck engine health:', error);
    throw error;
  }
};
