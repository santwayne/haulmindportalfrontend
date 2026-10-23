import  { type AxiosResponse } from 'axios'
import apiClient from '../apiClient'

interface Error {
  response?: {
    data?: {
      message: string,
    }
  }
}

export const listCustomer = async () =>{
    try {
    const res: AxiosResponse = await apiClient.get(`dispatcher/customer`);
    console.log('==res ', res)
    return res.data;
  } catch (error: any) {
    return error?.response?.data || { success: false, message: error?.message || 'Failed to fetch customers', data: null };
  }
}


export const deleteCustomer = async (id:string) =>{
    try {
    const res: AxiosResponse = await apiClient.delete(`dispatcher/customer/${id}`);
    console.log('==res ', res)
    return res.data;
  } catch (error) {
    return (error as Error).response?.data;
  }
}

export const updateCustomer = async (id: string, data: any) => {
  try {
    // Backend expects PUT /dispatcher/customer/:id
    const res: AxiosResponse = await apiClient.put(`dispatcher/customer/${id}`, data);
    console.log('==updateCustomer res ', res);
    return res.data;
  } catch (error) {
    return (error as Error).response?.data;
  }
}

export const createtCustomer = async (data: any) =>{
    try {
    const res: AxiosResponse = await apiClient.post(`dispatcher/customer`,data);
    console.log('==res ', res)
    return res.data;
  } catch (error) {
    return (error as Error).response?.data;
  }
}

export const deleteContact = async (id:string) =>{
    try {
    const res: AxiosResponse = await apiClient.delete(`dispatcher/contact/${id}`);
    console.log('==res ', res)
    return res.data;
  } catch (error) {
    return (error as Error).response?.data;
  }
}
export const updateContact = async (id:string, data: any) =>{
    try {
    const res: AxiosResponse = await apiClient.put(`dispatcher/contact/${id}`,data);
    console.log('==res ', res)
    return res.data;
  } catch (error) {
    return (error as Error).response?.data;
  }
}
export const listContact = async () =>{
    try {
    const res: AxiosResponse = await apiClient.get(`dispatcher/contact`);
    console.log('==res ', res)
    return res.data;
  } catch (error) {
    return (error as Error).response?.data;
  }
}
export const createContact = async (data: any) =>{
    try {
    const res: AxiosResponse = await apiClient.post(`dispatcher/contact`,data);
    console.log('==res ', res)
    return res.data;
  } catch (error) {
    return (error as Error).response?.data;
  }
}

export const updateStatusVendor = async (id: string, status: any) =>{
    try {
    const res: AxiosResponse = await apiClient.patch(`dispatcher/vendor/${id}/status`,status);
    console.log('==res ', res)
    return res.data;
  } catch (error) {
    return (error as Error).response?.data;
  }
}

export const listVendor = async () =>{
    try {
    const res: AxiosResponse = await apiClient.get(`dispatcher/vendor`);
    console.log('==res ', res)
    return res.data;
  } catch (error) {
    return (error as Error).response?.data;
  }
}
export const deleteVendor = async (id:string) =>{
    try {
    const res: AxiosResponse = await apiClient.delete(`dispatcher/vendor/${id}`);
    console.log('==res ', res)
    return res.data;
  } catch (error) {
    return (error as Error).response?.data;
  }
}
export const updateVendor = async (id:string, data: any) =>{
    try {
    const res: AxiosResponse = await apiClient.put(`dispatcher/vendor/${id}`,data);
    console.log('==res ', res)
    return res.data;
  } catch (error) {
    return (error as Error).response?.data;
  }
}
export const createVendor = async (data: any) =>{
    try {
    const res: AxiosResponse = await apiClient.post(`dispatcher/vendor`,data);
    console.log('==res ', res)
    return res.data;
  } catch (error) {
    return (error as Error).response?.data;
  }
}

export const deleteFleet = async (id:string) =>{
    try {
    const res: AxiosResponse = await apiClient.delete(`dispatcher/fleet/${id}`);
    console.log('==res ', res)
    return res.data;
  } catch (error) {
    return (error as Error).response?.data;
  }
}
export const updateStatusFleet = async (id:string) =>{
    try {
    const res: AxiosResponse = await apiClient.patch(`dispatcher/fleet/${id}/status`);
    console.log('==res ', res)
    return res.data;
  } catch (error) {
    return (error as Error).response?.data;
  }
}
export const updateFleet = async (id:string, data: any) =>{
    try {
    const res: AxiosResponse = await apiClient.put(`dispatcher/fleet/${id}`,data);
    console.log('==res ', res)
    return res.data;
  } catch (error) {
    return (error as Error).response?.data;
  }
}

export const listFleet = async () =>{
    try {
    const res: AxiosResponse = await apiClient.get(`dispatcher/fleet`);
    console.log('==res ', res)
    return res.data;
  } catch (error) {
    return (error as Error).response?.data;
  }
}
export const createFleet = async (data: any) =>{
    try {
    const res: AxiosResponse = await apiClient.post(`dispatcher/fleet`,data);
    console.log('==res ', res)
    return res.data;
  } catch (error) {
    return (error as Error).response?.data;
  }
}
export const listTrailers = async (params?: { page?: number; limit?: number; search?: string; status?: string; operationStatus?: string; type?: string; isAttached?: boolean; sortBy?: string; sortOrder?: string }) => {
    try {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.status) queryParams.append('status', params.status);
    if (params?.operationStatus) queryParams.append('operationStatus', params.operationStatus);
    if (params?.type) queryParams.append('type', params.type);
    if (params?.isAttached !== undefined) queryParams.append('isAttached', params.isAttached.toString());
    if (params?.sortBy) queryParams.append('sortBy', params.sortBy);
    if (params?.sortOrder) queryParams.append('sortOrder', params.sortOrder);
    
    const queryString = queryParams.toString();
    const url = `dispatcher/trailer${queryString ? `?${queryString}` : ''}`;
    
    const res: AxiosResponse = await apiClient.get(url);
    console.log('==res ', res)
    return res.data;
  } catch (error) {
    return (error as Error).response?.data;
  }
}

export const createTrailer = async (data: any) => {
  try {
    const res: AxiosResponse = await apiClient.post(`dispatcher/trailer`, data);
    console.log('==res ', res)
    return res.data;
  } catch (error) {
    return (error as Error).response?.data;
  }
}

export const updateTrailer = async (id: string, data: any) => {
  try {
    const res: AxiosResponse = await apiClient.put(`dispatcher/trailer/${id}`, data);
    console.log('==res ', res)
    return res.data;
  } catch (error) {
    return (error as Error).response?.data;
  }
}

export const deleteTrailer = async (id: string) => {
  try {
    const res: AxiosResponse = await apiClient.delete(`dispatcher/trailer/${id}`);
    console.log('==res ', res)
    return res.data;
  } catch (error) {
    return (error as Error).response?.data;
  }
}

export const getTrailerById = async (id: string) => {
  try {
    const res: AxiosResponse = await apiClient.get(`dispatcher/trailer/${id}`);
    console.log('==res ', res)
    return res.data;
  } catch (error) {
    return (error as Error).response?.data;
  }
}

export const searchTrailers = async (query: string) => {
  try {
    const res: AxiosResponse = await apiClient.get(`dispatcher/trailer/search?q=${query}`);
    console.log('==res ', res)
    return res.data;
  } catch (error) {
    return (error as Error).response?.data;
  }
}

export const getTrailerStats = async () => {
  try {
    const res: AxiosResponse = await apiClient.get(`dispatcher/trailer/stats`);
    console.log('==res ', res)
    return res.data;
  } catch (error) {
    return (error as Error).response?.data;
  }
}

export const updateTrailerStatus = async (id: string, status: string) => {
  try {
    const res: AxiosResponse = await apiClient.patch(`dispatcher/trailer/${id}/status`, { status });
    console.log('==res ', res)
    return res.data;
  } catch (error) {
    return (error as Error).response?.data;
  }
}
export const deleteVehicle = async (id:string) =>{
  try {
    const res: AxiosResponse = await apiClient.delete(`dispatcher/vehicle/${id}`);
    console.log('==res ', res)
    return res.data;
  } catch (error) {
    console.log(error);
    return (error as Error).response?.data;
  }
}

export const listVehicle = async (params?: { page?: number; limit?: number; search?: string; status?: string; sortBy?: string; sortOrder?: string }) => {
    try {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.status) queryParams.append('status', params.status);
    if (params?.sortBy) queryParams.append('sortBy', params.sortBy);
    if (params?.sortOrder) queryParams.append('sortOrder', params.sortOrder);
    
    const queryString = queryParams.toString();
    const url = `dispatcher/vehicle${queryString ? `?${queryString}` : ''}`;
    
    const res: AxiosResponse = await apiClient.get(url);
    console.log('==res ', res)
    return res.data;
  } catch (error: any) {
    console.log(error);
    // Return error response data if available, otherwise return error structure
    return error?.response?.data || { success: false, message: error?.message || 'Failed to fetch vehicles', data: null };
  }
}

export const getVehiclesWithTracking = async (params?: { page?: number; limit?: number; search?: string; type?: string; status?: string; operationStatus?: string; ownership?: string }) => {
  try {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.type) queryParams.append('type', params.type);
    if (params?.status) queryParams.append('status', params.status);
    if (params?.operationStatus) queryParams.append('operationStatus', params.operationStatus);
    if (params?.ownership) queryParams.append('ownership', params.ownership);
    
    const queryString = queryParams.toString();
    const url = `dispatcher/vehicle/tracking${queryString ? `?${queryString}` : ''}`;
    
    const res: AxiosResponse = await apiClient.get(url);
    return res.data;
  } catch (error: any) {
    console.error('❌ getVehiclesWithTracking API error:', error);
    return error?.response?.data || { success: false, message: 'Failed to fetch vehicles with tracking', data: [] };
  }
}

export const getTrailersWithTracking = async (params?: { page?: number; limit?: number; search?: string; type?: string; status?: string; operationStatus?: string; isAttached?: boolean }) => {
  try {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.type) queryParams.append('type', params.type);
    if (params?.status) queryParams.append('status', params.status);
    if (params?.operationStatus) queryParams.append('operationStatus', params.operationStatus);
    if (params?.isAttached !== undefined) queryParams.append('isAttached', params.isAttached.toString());
    
    const queryString = queryParams.toString();
    const url = `dispatcher/trailer/tracking${queryString ? `?${queryString}` : ''}`;
    
    const res: AxiosResponse = await apiClient.get(url);
    return res.data;
  } catch (error: any) {
    console.error('❌ getTrailersWithTracking API error:', error);
    return error?.response?.data || { success: false, message: 'Failed to fetch trailers with tracking', data: [] };
  }
}

export const getActiveOrdersWithTracking = async () => {
  try {
    const res: AxiosResponse = await apiClient.get('dispatcher/orders/tracking');
    return res.data;
  } catch (error: any) {
    console.error('❌ getActiveOrdersWithTracking API error:', error);
    return error?.response?.data || { success: false, message: 'Failed to fetch active orders with tracking', data: [] };
  }
}

export const getGpsVehicleDashboardStats = async () => {
  try {
    const res: AxiosResponse = await apiClient.get(`admin/gps-vehicle/dashboard-stats`);
    return res.data;
  } catch (error: any) {
    return error?.response?.data || { success: false, message: error?.message || 'Failed to fetch GPS vehicle dashboard stats', data: null };
  }
}

export const createVehicle = async (data: any) =>{
    try {
    const res: AxiosResponse = await apiClient.post(`dispatcher/vehicle`,data);
    console.log('==res ', res)
    return res.data;
  } catch (error) {
    return (error as Error).response?.data;
  }
}
export const updateVehicle = async (id: string, data: any) => {
  try {
    const res: AxiosResponse = await apiClient.put(`dispatcher/vehicle/${id}`, data);
    console.log('==res ', res);
    return res.data;
  } catch (error) {
    return (error as Error).response?.data;
  }
}
export const deleteServiceRate = async (id:string) =>{
    try {
    const res: AxiosResponse = await apiClient.delete(`dispatcher/service-rate/${id}`);
    console.log('==res ', res)
    return res.data;
  } catch (error) {
    return (error as Error).response?.data;
  }
}
export const updateServiceRate = async (id:string, data: any) =>{
    try {
    const res: AxiosResponse = await apiClient.put(`dispatcher/service-rate/${id}`,data);
    console.log('==res ', res)
    return res.data;
  } catch (error) {
    return (error as Error).response?.data;
  }
}
export const listServiceRate = async () =>{
    try {
    const res: AxiosResponse = await apiClient.get(`dispatcher/service-rate`);
    console.log('==res ', res)
    return res.data;
  } catch (error) {
    return (error as Error).response?.data;
  }
}
export const createServiceRate = async (data: any) =>{
    try {
    const res: AxiosResponse = await apiClient.post(`dispatcher/service-rate`,data);
    console.log('==res ', res)
    return res.data;
  } catch (error) {
    return (error as Error).response?.data;
  }
}

export const listLoad = async (params?: { page?: number; limit?: number; search?: string; status?: string; sortBy?: string; sortOrder?: string }) => {
    try {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.status) queryParams.append('status', params.status);
    if (params?.sortBy) queryParams.append('sortBy', params.sortBy);
    if (params?.sortOrder) queryParams.append('sortOrder', params.sortOrder);
    
    const queryString = queryParams.toString();
    const url = `dispatcher/load${queryString ? `?${queryString}` : ''}`;
    
    const res: AxiosResponse = await apiClient.get(url);
    console.log('==res ', res)
    return res.data;
  } catch (error: any) {
    console.log(error);
    return error?.response?.data || { success: false, message: error?.message || 'Failed to fetch loads', data: null };
  }
}
export const createLoad = async (data: any) =>{
    try {
    console.log('==res ', data)
    const res: AxiosResponse = await apiClient.post(`dispatcher/load`,data);
    console.log('==res ', res)
    return res.data;
  } catch (error) {
    console.log(error);

    return (error as Error).response?.data;
  }
}

export const updateLoad = async (id: string, data: any) => {
  try {
    console.log('🔍 updateLoad API called with:', { id, data });
    const res: AxiosResponse = await apiClient.put(`dispatcher/load/${id}`, data);
    console.log('🔍 updateLoad API response:', res);
    console.log('🔍 updateLoad API response data:', res.data);
    return res.data;
  } catch (error) {
    console.error('❌ updateLoad API error:', error);
    return (error as Error).response?.data;
  }
}

export const assignDriverTruck = async (loadId: string, driverId: string, vehicleId: string, trailerId?: string, planDate?: string) => {
  try {
    const res: AxiosResponse = await apiClient.post(`dispatcher/load/${loadId}/assign`, {
      driverId,
      vehicleId,
      trailerId,
      planDate
    });
    return res.data;
  } catch (error) {
    console.error('❌ assignDriverTruck API error:', error);
    return (error as Error).response?.data;
  }
}

export const deleteLoad = async (id: string) => {
  try {
    const res: AxiosResponse = await apiClient.delete(`dispatcher/load/${id}`);
    console.log('==res ', res)
    return res.data;
  } catch (error) {
    console.log(error);
    return (error as Error).response?.data;
  }
}


export const listDriver = async (params?: { page?: number; limit?: number; search?: string; status?: string; sortBy?: string; sortOrder?: string; assignment?: 'assigned' | 'unassigned' | 'all' }) => {
    try {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.status) queryParams.append('status', params.status);
    if (params?.assignment) queryParams.append('assignment', params.assignment);
    if (params?.sortBy) queryParams.append('sortBy', params.sortBy);
    if (params?.sortOrder) queryParams.append('sortOrder', params.sortOrder);
    
    const queryString = queryParams.toString();
    const url = `dispatcher/driver${queryString ? `?${queryString}` : ''}`;
    
    const res: AxiosResponse = await apiClient.get(url);
    console.log('==res ', res)
    return res.data;
  } catch (error: any) {
    console.log(error);
    return error?.response?.data || { success: false, message: error?.message || 'Failed to fetch drivers', data: null };
  }
}






export const listFaciliator = async () =>{
    try {
    const res: AxiosResponse = await apiClient.get(`dispatcher/faciliator`);
    console.log('==res ', res)
    return res.data;
  } catch (error: any) {
    console.log(error);
    return error?.response?.data || { success: false, message: error?.message || 'Failed to fetch facilitators', data: null };
  }
}

// Issue CRUD APIs
export const createIssue = async (data: any) => {
  try {
    const res: AxiosResponse = await apiClient.post(`dispatcher/issue`, data);
    return res.data;
  } catch (error) {
    console.log(error);
    return (error as Error).response?.data;
  }
}

export const updateIssue = async (id: string, data: any) => {
  try {
    const res: AxiosResponse = await apiClient.put(`dispatcher/issue/${id}`, data);
    return res.data;
  } catch (error) {
    console.log(error);
    return (error as Error).response?.data;
  }
}

export const deleteIssue = async (id: string) => {
  try {
    const res: AxiosResponse = await apiClient.delete(`dispatcher/issue/${id}`);
    return res.data;
  } catch (error) {
    console.log(error);
    return (error as Error).response?.data;
  }
}

export const getIssueById = async (id: string) => {
  try {
    const res: AxiosResponse = await apiClient.get(`dispatcher/issue/${id}`);
    return res.data;
  } catch (error) {
    console.log(error);
    return (error as Error).response?.data;
  }
}

export const listIssues = async (page: number = 1, limit: number = 10) => {
  try {
    const res: AxiosResponse = await apiClient.get(`dispatcher/issue?page=${page}&limit=${limit}`);
    return res.data;
  } catch (error) {
    console.log(error);
    return (error as Error).response?.data;
  }
}

export const searchIssues = async (keyword: string) => {
  try {
    const res: AxiosResponse = await apiClient.get(`dispatcher/issue/search?keyword=${keyword}`);
    return res.data;
  } catch (error) {
    console.log(error);
    return (error as Error).response?.data;
  }
}

// Delivery management APIs
export const getDeliveryLoads = async () => {
  try {
    const res: AxiosResponse = await apiClient.get(`dispatcher/delivery-loads`);
    return res.data;
  } catch (error) {
    console.error('❌ getDeliveryLoads API error:', error);
    return (error as Error).response?.data;
  }
}

export const uploadDeliveryDocument = async (loadId: string, documentType: string, file: File) => {
  try {
    const formData = new FormData();
    formData.append('document', file);
    
    const res: AxiosResponse = await apiClient.post(
      `dispatcher/load/${loadId}/delivery-document/${documentType}`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      }
    );
    return res.data;
  } catch (error) {
    console.error('❌ uploadDeliveryDocument API error:', error);
    return (error as Error).response?.data;
  }
}

export const updatePaymentStatus = async (
  loadId: string, 
  paymentMethod: string, 
  paymentReference: string, 
  paymentDate: string, 
  notes?: string
) => {
  try {
    const res: AxiosResponse = await apiClient.post(`dispatcher/load/${loadId}/payment`, {
      paymentMethod,
      paymentReference,
      paymentDate,
      notes
    });
    return res.data;
  } catch (error) {
    console.error('❌ updatePaymentStatus API error:', error);
    return (error as Error).response?.data;
  }
}

export const getDispatcherDashboard = async () => {
  try {
    const res: AxiosResponse = await apiClient.get(`dispatcher/dashboard`);
    return res.data;
  } catch (error) {
    console.error('❌ getDispatcherDashboard API error:', error);
    return (error as Error).response?.data;
  }
}

export const getUtilization = async () => {
  try {
    const res: AxiosResponse = await apiClient.get(`dispatcher/utilization`);
    return res.data;
  } catch (error) {
    console.error('❌ getUtilization API error:', error);
    return (error as Error).response?.data;
  }
}

export const getTodayDeliveries = async () => {
  try {
    const res: AxiosResponse = await apiClient.get(`dispatcher/deliveries`);
    return res.data;
  } catch (error) {
    console.error('❌ getTodayDeliveries API error:', error);
    return (error as Error).response?.data;
  }
}

export const getTodayPickups = async () => {
  try {
    const res: AxiosResponse = await apiClient.get(`dispatcher/pickups`);
    return res.data;
  } catch (error) {
    console.error('❌ getTodayPickups API error:', error);
    return (error as Error).response?.data || { success: false, message: 'Failed to fetch today\'s pickups', data: [] };
  }
}

export const getTomorrowPickups = async () => {
  try {
    const res: AxiosResponse = await apiClient.get(`dispatcher/pickups/tomorrow`);
    return res.data;
  } catch (error) {
    console.error('❌ getTomorrowPickups API error:', error);
    return (error as Error).response?.data || { success: false, message: 'Failed to fetch tomorrow\'s pickups', data: [] };
  }
}

export const getAuditTrail = async () => {
  try {
    const res: AxiosResponse = await apiClient.get(`dispatcher/audit`);
    return res.data;
  } catch (error) {
    console.error('❌ getAuditTrail API error:', error);
    return (error as Error).response?.data || { success: false, message: 'Failed to fetch audit trail', data: [] };
  }
}

export const getDriversOnLeave = async () => {
  try {
    const res: AxiosResponse = await apiClient.get(`dispatcher/drivers-on-leave`);
    return res.data;
  } catch (error) {
    console.error('❌ getDriversOnLeave API error:', error);
    return (error as Error).response?.data;
  }
}

export const getRouteAnalysis = async () => {
  try {
    const res: AxiosResponse = await apiClient.get(`dispatcher/routes`);
    return res.data;
  } catch (error) {
    console.error('❌ getRouteAnalysis API error:', error);
    return (error as Error).response?.data;
  }
}

// Order management APIs
export const createOrder = async (data: FormData | any) => {
  try {
    const res: AxiosResponse = await apiClient.post(`dispatcher/order`, data, {
      headers: {
        'Content-Type': data instanceof FormData ? 'multipart/form-data' : 'application/json'
      }
    });
    console.log('==res ', res);
    return res.data;
  } catch (error) {
    console.log(error);
    return (error as Error).response?.data;
  }
}

export const listOrder = async (params?: {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  orderType?: string;
  accountingStatus?: string;
  loadBoard?: string;
  sortBy?: string;
  sortOrder?: string
}) => {
  try {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.status) queryParams.append('status', params.status);
    if (params?.orderType) queryParams.append('orderType', params.orderType);
    if (params?.accountingStatus) queryParams.append('accountingStatus', params.accountingStatus);
    if (params?.loadBoard) queryParams.append('loadBoard', params.loadBoard);
    if (params?.sortBy) queryParams.append('sortBy', params.sortBy);
    if (params?.sortOrder) queryParams.append('sortOrder', params.sortOrder);
    
    const queryString = queryParams.toString();
    const url = `dispatcher/order${queryString ? `?${queryString}` : ''}`;
    
    const res: AxiosResponse = await apiClient.get(url);
    console.log('==res ', res);
    return res.data;
  } catch (error: any) {
    console.log(error);
    return error?.response?.data || { success: false, message: error?.message || 'Failed to fetch orders', data: null };
  }
}

export const getOrderById = async (id: string) => {
  try {
    const res: AxiosResponse = await apiClient.get(`dispatcher/order/${id}`);
    console.log('==res ', res);
    return res.data;
  } catch (error) {
    console.log(error);
    return (error as Error).response?.data;
  }
}

export const approveOrderDocuments = async (id: string, approveWithoutDocuments: boolean = false) => {
  try {
    const res: AxiosResponse = await apiClient.post(`dispatcher/order/${id}/approve-documents`, {
      approveWithoutDocuments
    });
    return res.data;
  } catch (error: any) {
    console.error('approveOrderDocuments API error:', error);
    throw error?.response?.data || error;
  }
};

export const updateOrder = async (id: string, data: FormData | any) => {
  try {
    const res: AxiosResponse = await apiClient.put(`dispatcher/order/${id}`, data, {
      headers: {
        'Content-Type': data instanceof FormData ? 'multipart/form-data' : 'application/json'
      }
    });
    console.log('==res ', res);
    return res.data;
  } catch (error) {
    console.log(error);
    return (error as Error).response?.data;
  }
}

export const deleteOrder = async (id: string) => {
  try {
    const res: AxiosResponse = await apiClient.delete(`dispatcher/order/${id}`);
    console.log('==res ', res);
    return res.data;
  } catch (error) {
    console.log(error);
    return (error as Error).response?.data;
  }
}

// Trip Management APIs
export const createTrip = async (tripData: any, files?: { documents?: File[], loadSecurementPictures?: File[] }) => {
  try {
    // If files are provided, use FormData; otherwise use JSON
    if (files && (files.documents?.length || files.loadSecurementPictures?.length)) {
      const formData = new FormData();
      
      // Append all trip data fields
      Object.keys(tripData).forEach(key => {
        const value = tripData[key];
        if (value !== null && value !== undefined) {
          if (Array.isArray(value)) {
            // Handle arrays (like orders)
            value.forEach((item, index) => {
              if (typeof item === 'object' && item !== null) {
                // For objects, stringify them
                formData.append(`${key}[${index}]`, JSON.stringify(item));
              } else {
                formData.append(`${key}[${index}]`, String(item));
              }
            });
          } else if (typeof value === 'object' && value !== null) {
            // Stringify objects
            formData.append(key, JSON.stringify(value));
          } else {
            formData.append(key, String(value));
          }
        }
      });
      
      // Append document files
      if (files.documents) {
        files.documents.forEach((file, index) => {
          formData.append('documents', file);
          // If documentType is provided in tripData, append it
          if (tripData.documentTypes && tripData.documentTypes[index]) {
            formData.append(`documentType`, tripData.documentTypes[index]);
          }
        });
        // Remove documentTypes from tripData before stringifying (it's only for FormData)
        delete tripData.documentTypes;
      }
      
      // Append load securement pictures
      if (files.loadSecurementPictures) {
        files.loadSecurementPictures.forEach(file => {
          formData.append('loadSecurementPictures', file);
        });
      }
      
      const res: AxiosResponse = await apiClient.post(`dispatcher/trip`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return res.data;
    } else {
      // No files, send as JSON
      const res: AxiosResponse = await apiClient.post(`dispatcher/trip`, tripData);
      return res.data;
    }
  } catch (error: any) {
    console.error('createTrip API error:', error);
    // Return error response data instead of throwing, so validation errors can be handled
    if (error?.response?.data) {
      return error.response.data;
    }
    throw error;
  }
};

export const listTrip = async (params?: {
  page?: number;
  limit?: number;
  status?: string;
  driver?: string;
  truck?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
}) => {
  try {
    const res: AxiosResponse = await apiClient.get(`dispatcher/trip`, { params });
    return res.data;
  } catch (error: any) {
    console.error('listTrip API error:', error);
    throw error?.response?.data || error;
  }
};

export const getTripById = async (id: string) => {
  try {
    const res: AxiosResponse = await apiClient.get(`dispatcher/trip/${id}`);
    return res.data;
  } catch (error: any) {
    console.error('getTripById API error:', error);
    throw error?.response?.data || error;
  }
};

export const updateTrip = async (id: string, tripData: any) => {
  try {
    const res: AxiosResponse = await apiClient.put(`dispatcher/trip/${id}`, tripData);
    return res.data;
  } catch (error: any) {
    console.error('updateTrip API error:', error);
    throw error?.response?.data || error;
  }
};

export const deleteTrip = async (id: string) => {
  try {
    const res: AxiosResponse = await apiClient.delete(`dispatcher/trip/${id}`);
    return res.data;
  } catch (error: any) {
    console.error('deleteTrip API error:', error);
    throw error?.response?.data || error;
  }
};

export const assignOrdersToTrip = async (tripId: string, orders: string[]) => {
  try {
    const res: AxiosResponse = await apiClient.post(`dispatcher/trip/${tripId}/assign`, { orders });
    return res.data;
  } catch (error: any) {
    console.error('assignOrdersToTrip API error:', error);
    throw error?.response?.data || error;
  }
};

export const startTrip = async (id: string) => {
  try {
    const res: AxiosResponse = await apiClient.post(`dispatcher/trip/${id}/start`);
    return res.data;
  } catch (error: any) {
    console.error('startTrip API error:', error);
    throw error?.response?.data || error;
  }
};

export const completeTrip = async (id: string) => {
  try {
    const res: AxiosResponse = await apiClient.post(`dispatcher/trip/${id}/complete`);
    return res.data;
  } catch (error: any) {
    console.error('completeTrip API error:', error);
    throw error?.response?.data || error;
  }
};

export const approveTripCompletion = async (id: string, action: 'approve' | 'reject', rejectionReason?: string) => {
  try {
    const res: AxiosResponse = await apiClient.post(`dispatcher/trip/${id}/approve-completion`, {
      action,
      rejectionReason
    });
    return res.data;
  } catch (error: any) {
    console.error('approveTripCompletion API error:', error);
    throw error?.response?.data || error;
  }
};

export const approveTripDocuments = async (id: string, approveWithoutDocuments: boolean = false) => {
  try {
    const res: AxiosResponse = await apiClient.post(`dispatcher/trip/${id}/approve-documents`, {
      approveWithoutDocuments
    });
    return res.data;
  } catch (error: any) {
    console.error('approveTripDocuments API error:', error);
    throw error?.response?.data || error;
  }
};

export const rejectTripDocuments = async (id: string, reason: string) => {
  try {
    const res: AxiosResponse = await apiClient.post(`dispatcher/trip/${id}/reject-documents`, { reason });
    return res.data;
  } catch (error: any) {
    console.error('rejectTripDocuments API error:', error);
    throw error?.response?.data || error;
  }
};

export const uploadTripDocument = async (tripId: string, file: File, description?: string, documentType?: string) => {
  try {
    const formData = new FormData();
    formData.append('document', file);
    if (description) {
      formData.append('description', description);
    }
    if (documentType) {
      formData.append('documentType', documentType);
    }
    const res: AxiosResponse = await apiClient.post(`dispatcher/trip/${tripId}/documents`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return res.data;
  } catch (error: any) {
    console.error('uploadTripDocument API error:', error);
    throw error?.response?.data || error;
  }
};

export const deleteTripDocument = async (tripId: string, documentId: string) => {
  try {
    const res: AxiosResponse = await apiClient.delete(`dispatcher/trip/${tripId}/documents/${documentId}`);
    return res.data;
  } catch (error: any) {
    console.error('deleteTripDocument API error:', error);
    throw error?.response?.data || error;
  }
};

export const getTripDocumentSignedUrl = async (tripId: string, documentId: string, disposition: 'inline' | 'attachment' = 'inline') => {
  try {
    const res: AxiosResponse = await apiClient.get(`dispatcher/trip/${tripId}/documents/${documentId}/signed-url`, {
      params: { disposition }
    });
    return res.data;
  } catch (error: any) {
    console.error('getTripDocumentSignedUrl API error:', error);
    throw error?.response?.data || error;
  }
};

export const getOrderAttachmentSignedUrl = async (orderId: string, attachmentId: string, disposition: 'inline' | 'attachment' = 'inline') => {
  try {
    const res: AxiosResponse = await apiClient.get(`dispatcher/order/${orderId}/attachments/${attachmentId}/signed-url`, {
      params: { disposition }
    });
    return res.data;
  } catch (error: any) {
    console.error('getOrderAttachmentSignedUrl API error:', error);
    throw error?.response?.data || error;
  }
};

export const createBulkOrders = async (orders: any[]) => {
  try {
    const res: AxiosResponse = await apiClient.post(`dispatcher/order/bulk`, { orders });
    console.log('==createBulkOrders res ', res);
    return res.data;
  } catch (error) {
    console.log(error);
    return (error as Error).response?.data;
  }
}

// Note: autoExtractOrderData has been removed - document validation is now integrated into createOrder and updateOrder

export const getOrderSuggestions = async (field: string, value: string, customerId?: string) => {
  try {
    const params: any = { field, value };
    if (customerId) params.customerId = customerId;
    
    const res: AxiosResponse = await apiClient.get(`dispatcher/order/suggestions`, { params });
    return res.data;
  } catch (error: any) {
    console.error('getOrderSuggestions API error:', error);
    return { success: false, data: [] };
  }
}
export const importDriversFromFile = async (file: File, fieldMap: Record<string, string> = {}) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('fieldMap', JSON.stringify(fieldMap));
  try {
    const res: AxiosResponse = await apiClient.post('dispatcher/driver/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return res.data;
  } catch (error: any) {
    return error?.response?.data || { success: false, message: error?.message };
  }
};

export const importVehiclesFromFile = async (file: File, fieldMap: Record<string, string> = {}) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('fieldMap', JSON.stringify(fieldMap));
  try {
    const res: AxiosResponse = await apiClient.post('dispatcher/vehicle/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return res.data;
  } catch (error: any) {
    return error?.response?.data || { success: false, message: error?.message };
  }
};

export const importTrailersFromFile = async (file: File, fieldMap: Record<string, string> = {}) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('fieldMap', JSON.stringify(fieldMap));
  try {
    const res: AxiosResponse = await apiClient.post('dispatcher/trailer/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return res.data;
  } catch (error: any) {
    return error?.response?.data || { success: false, message: error?.message };
  }
};
