import type { AxiosResponse } from "axios";
import apiClient from "../apiClient";

interface Error {
  response?: {
    data?: {
      message: string,
    }
  }
}

// ✅ Get All Admins (Customers)
export const getAllAdmins = async (search?: string, status?: string, page: number = 1, limit: number = 100) => {
  try {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });
    
    if (search) params.append('search', search);
    if (status && status !== 'all') params.append('status', status);
    
    const res: AxiosResponse = await apiClient.get(`superadmin/admin?${params.toString()}`);
    return res.data;
  } catch (error) {
    console.log(error);
    return (error as Error).response?.data;
  }
};

// ✅ Get Admin by ID
export const getAdminById = async (id: string) => {
  try {
    const res: AxiosResponse = await apiClient.get(`superadmin/admin/${id}`);
    return res.data;
  } catch (error) {
    console.log(error);
    return (error as Error).response?.data;
  }
};

// ✅ Create Admin
export const createAdmin = async (data: any) => {
  try {
    const res: AxiosResponse = await apiClient.post('superadmin/admin', data);
    return res.data;
  } catch (error) {
    console.log(error);
    return (error as Error).response?.data;
  }
};

// ✅ Update Admin
export const updateAdmin = async (id: string, data: any) => {
  try {
    const res: AxiosResponse = await apiClient.put(`superadmin/admin/${id}`, data);
    return res.data;
  } catch (error) {
    console.log(error);
    return (error as Error).response?.data;
  }
};

// ✅ Delete Admin
export const deleteAdmin = async (id: string) => {
  try {
    console.log('🔗 API Call: DELETE superadmin/admin/' + id);
    const res: AxiosResponse = await apiClient.delete(`superadmin/admin/${id}`);
    console.log('✅ Delete API Response:', res.data);
    return res.data;
  } catch (error: any) {
    console.error('❌ Delete API Error:', error);
    // Return error response data if available, otherwise throw
    if (error?.response?.data) {
      return error.response.data;
    }
    // Re-throw if it's a network error or other issue
    throw error;
  }
};

// ✅ Assign a plan to a client (manual, no Stripe checkout)
export const assignPlanToAdmin = async (
  adminId: string,
  data: {
    planId: string;
    subscriptionType: string;
    truckCount?: number;
    customAmount?: number;
    allowedRoles?: string[];
    blockedRoles?: string[];
  }
) => {
  try {
    const res: AxiosResponse = await apiClient.post(`superadmin/admin/${adminId}/assign-plan`, data);
    return res.data;
  } catch (error) {
    console.log(error);
    return (error as Error).response?.data;
  }
};

// ============ PLAN MANAGEMENT ============

// ✅ Get All Plans
export const getAllPlans = async (status?: string, planType?: string) => {
  try {
    const params = new URLSearchParams();
    if (status && status !== 'all') params.append('status', status);
    if (planType && planType !== 'all') params.append('planType', planType);
    
    const res: AxiosResponse = await apiClient.get(`superadmin/plan?${params.toString()}`);
    return res.data;
  } catch (error) {
    console.log(error);
    return (error as Error).response?.data;
  }
};

// ✅ Get Plan by ID
export const getPlanById = async (id: string) => {
  try {
    const res: AxiosResponse = await apiClient.get(`superadmin/plan/${id}`);
    return res.data;
  } catch (error) {
    console.log(error);
    return (error as Error).response?.data;
  }
};

// ✅ Create Plan
export const createPlan = async (data: any) => {
  try {
    const res: AxiosResponse = await apiClient.post('superadmin/plan', data);
    return res.data;
  } catch (error) {
    console.log(error);
    return (error as Error).response?.data;
  }
};

// ✅ Update Plan
export const updatePlan = async (id: string, data: any) => {
  try {
    const res: AxiosResponse = await apiClient.put(`superadmin/plan/${id}`, data);
    return res.data;
  } catch (error) {
    console.log(error);
    return (error as Error).response?.data;
  }
};

// ✅ Delete Plan
export const deletePlan = async (id: string) => {
  try {
    const res: AxiosResponse = await apiClient.delete(`superadmin/plan/${id}`);
    return res.data;
  } catch (error) {
    console.log(error);
    return (error as Error).response?.data;
  }
};

// ============ DASHBOARD ============

// ✅ Get Super Admin Dashboard Data
export const getSuperAdminDashboard = async (timeRange?: string) => {
  try {
    const params = new URLSearchParams();
    if (timeRange) params.append('timeRange', timeRange);
    
    const res: AxiosResponse = await apiClient.get(`superadmin/dashboard?${params.toString()}`);
    return res.data;
  } catch (error) {
    console.log(error);
    return (error as Error).response?.data;
  }
};

// ============ REVENUE ============

// ✅ Get Super Admin Revenue Data
export const getSuperAdminRevenue = async (status?: string, page: number = 1, limit: number = 50) => {
  try {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });
    if (status && status !== 'all') params.append('status', status);
    
    const res: AxiosResponse = await apiClient.get(`superadmin/revenue?${params.toString()}`);
    return res.data;
  } catch (error) {
    console.log(error);
    return (error as Error).response?.data;
  }
};

// ============ INVOICES ============

// ✅ Get Super Admin Invoices
export const getSuperAdminInvoices = async () => {
  try {
    const res: AxiosResponse = await apiClient.get('superadmin/invoices');
    return res.data;
  } catch (error) {
    console.log(error);
    return (error as Error).response?.data;
  }
};

// ============ SYSTEM SETTINGS ============

// ✅ Get Super Admin Settings
export const getSuperAdminSettings = async () => {
  try {
    const res: AxiosResponse = await apiClient.get('superadmin/system-settings');
    return res.data;
  } catch (error) {
    console.log(error);
    return (error as Error).response?.data;
  }
};

// ✅ Update Super Admin Settings
export const updateSuperAdminSettings = async (data: any) => {
  try {
    const res: AxiosResponse = await apiClient.put('superadmin/system-settings', data);
    return res.data;
  } catch (error) {
    console.log(error);
    return (error as Error).response?.data;
  }
};

// ============ ALLOWED ROLES ============

// ✅ Get Allowed Roles for Admin (based on subscription)
export const getAllowedRolesForAdmin = async () => {
  try {
    const res: AxiosResponse = await apiClient.get('admin/allowed-roles');
    return res.data;
  } catch (error) {
    console.log(error);
    return (error as Error).response?.data;
  }
};

