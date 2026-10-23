import apiClient from '../apiClient';

// Maintenance Expense Summary
export const getMaintenanceExpenseSummary = async (params?: { search?: string }) => {
  try {
    const response = await apiClient.get('/hr/fleet-maintenance/expense-summary', { params });
    return response.data;
  } catch (error: any) {
    console.error('Error fetching maintenance expense summary:', error);
    throw error;
  }
};

// Parts Cost Log
export const getPartsCostLog = async (params?: { search?: string }) => {
  try {
    const response = await apiClient.get('/hr/fleet-maintenance/parts-cost-log', { params });
    return response.data;
  } catch (error: any) {
    console.error('Error fetching parts cost log:', error);
    throw error;
  }
};

export const createPartsCostLog = async (data: {
  partNumber: string;
  description: string;
  unitCost: number;
  quantity: number;
  dateOfUse: string;
  vehicle: string;
  vehicleId?: string;
  workOrderId?: string;
  sparePartId?: string;
}) => {
  try {
    const response = await apiClient.post('/hr/fleet-maintenance/parts-cost-log', data);
    return response.data;
  } catch (error: any) {
    console.error('Error creating parts cost log:', error);
    throw error;
  }
};

export const updatePartsCostLog = async (id: string, data: {
  partNumber?: string;
  description?: string;
  unitCost?: number;
  quantity?: number;
  dateOfUse?: string;
  vehicle?: string;
  vehicleId?: string;
  workOrderId?: string;
  sparePartId?: string;
}) => {
  try {
    const response = await apiClient.put(`/hr/fleet-maintenance/parts-cost-log/${id}`, data);
    return response.data;
  } catch (error: any) {
    console.error('Error updating parts cost log:', error);
    throw error;
  }
};

export const deletePartsCostLog = async (id: string) => {
  try {
    const response = await apiClient.delete(`/hr/fleet-maintenance/parts-cost-log/${id}`);
    return response.data;
  } catch (error: any) {
    console.error('Error deleting parts cost log:', error);
    throw error;
  }
};

// Labor Rates
export const getLaborRates = async (params?: { search?: string }) => {
  try {
    const response = await apiClient.get('/hr/fleet-maintenance/labor-rates', { params });
    return response.data;
  } catch (error: any) {
    console.error('Error fetching labor rates:', error);
    throw error;
  }
};

export const createLaborRate = async (data: {
  rateType: string;
  description?: string;
  rate: number;
  isActive?: boolean;
}) => {
  try {
    const response = await apiClient.post('/hr/fleet-maintenance/labor-rates', data);
    return response.data;
  } catch (error: any) {
    console.error('Error creating labor rate:', error);
    throw error;
  }
};

export const updateLaborRate = async (id: string, data: {
  rateType?: string;
  description?: string;
  rate?: number;
  isActive?: boolean;
}) => {
  try {
    const response = await apiClient.put(`/hr/fleet-maintenance/labor-rates/${id}`, data);
    return response.data;
  } catch (error: any) {
    console.error('Error updating labor rate:', error);
    throw error;
  }
};

export const deleteLaborRate = async (id: string) => {
  try {
    const response = await apiClient.delete(`/hr/fleet-maintenance/labor-rates/${id}`);
    return response.data;
  } catch (error: any) {
    console.error('Error deleting labor rate:', error);
    throw error;
  }
};

// Maintenance Plan Financials
export const getMaintenancePlans = async (params?: { search?: string }) => {
  try {
    const response = await apiClient.get('/hr/fleet-maintenance/maintenance-plans', { params });
    return response.data;
  } catch (error: any) {
    console.error('Error fetching maintenance plans:', error);
    throw error;
  }
};

export const createMaintenancePlan = async (data: {
  planName: string;
  vehicle: string;
  vehicleId?: string;
  plannedCost: number;
  actualCost?: number;
  status?: string;
  plannedDate?: string;
  completedDate?: string;
  description?: string;
}) => {
  try {
    const response = await apiClient.post('/hr/fleet-maintenance/maintenance-plans', data);
    return response.data;
  } catch (error: any) {
    console.error('Error creating maintenance plan:', error);
    throw error;
  }
};

export const updateMaintenancePlan = async (id: string, data: {
  planName?: string;
  vehicle?: string;
  vehicleId?: string;
  plannedCost?: number;
  actualCost?: number;
  status?: string;
  plannedDate?: string;
  completedDate?: string;
  description?: string;
}) => {
  try {
    const response = await apiClient.put(`/hr/fleet-maintenance/maintenance-plans/${id}`, data);
    return response.data;
  } catch (error: any) {
    console.error('Error updating maintenance plan:', error);
    throw error;
  }
};

export const deleteMaintenancePlan = async (id: string) => {
  try {
    const response = await apiClient.delete(`/hr/fleet-maintenance/maintenance-plans/${id}`);
    return response.data;
  } catch (error: any) {
    console.error('Error deleting maintenance plan:', error);
    throw error;
  }
};

// Fleet Maintenance Stats
export const getFleetMaintenanceStats = async () => {
  try {
    const response = await apiClient.get('/hr/fleet-maintenance/stats');
    return response.data;
  } catch (error: any) {
    console.error('Error fetching fleet maintenance stats:', error);
    throw error;
  }
};

