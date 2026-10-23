import axios, { type AxiosResponse } from 'axios'
import { clearAuth } from '../utils/auth';
import { store } from '../redux/store';
import { userLogOut } from '../redux/slices/userSlice';
import { superAdminLogOut } from '../redux/slices/superAdminSlice';

const adminBaseUrl = import.meta.env.VITE_APP_BASE_URL

// Debug: Log the base URL to console
console.log('Admin API VITE_APP_BASE_URL:', adminBaseUrl);

export const adminApi = axios.create({
  baseURL: adminBaseUrl || 'http://localhost:3000/api/v1'
})
interface Error {
  response?: {
    data?: {
      message: string,
    }
  }
}

// Helper function to handle token expiration logout
const handleTokenExpiration = (isLoginPage: boolean, isBackgroundRequest: boolean) => {
  if (isLoginPage || isBackgroundRequest) {
    return;
  }
  
  console.warn('⚠️ Token has expired. Logging out and clearing session...');
  
  // Clear all authentication data
  clearAuth();
  
  // Dispatch Redux logout actions
  store.dispatch(userLogOut());
  store.dispatch(superAdminLogOut());
  
  // Determine redirect path based on current route
  const isSuperAdmin = window.location.pathname.startsWith('/superadmin');
  const redirectPath = isSuperAdmin ? '/superadmin/login' : '/';
  
  // Redirect to login page
  setTimeout(() => {
    window.location.href = redirectPath;
  }, 100);
};

adminApi.interceptors.request.use(
  (config) => {
    // Use the standard token key (same as main apiClient)
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

adminApi.interceptors.response.use(
  (response) => {
    // Check for successful responses (200) with success: false and token expiration message
    const responseData = response.data;
    if (responseData && responseData.success === false && responseData.message) {
      const isLoginPage = window.location.pathname === '/' || 
                         window.location.pathname === '/admin/adminLogin' ||
                         window.location.pathname === '/superadmin/login';
      const isBackgroundRequest = !!(response.config?.url?.includes('expiring') || 
                                  response.config?.url?.includes('notification'));
      
      // Check if message indicates token expiration
      if (responseData.message.includes('Token has expired') || 
          responseData.message.includes('token expired') ||
          responseData.message.includes('Please login again')) {
        handleTokenExpiration(isLoginPage, isBackgroundRequest);
        // Return a rejected promise to trigger error handling in components
        return Promise.reject({
          response: {
            data: responseData,
            status: 401
          }
        });
      }
    }
    
    return response;
  },
  async (error) => {
    // Don't redirect if already on login page or if error is from a background request
    const isLoginPage = window.location.pathname === '/' || 
                       window.location.pathname === '/admin/adminLogin' ||
                       window.location.pathname === '/superadmin/login';
    const isBackgroundRequest = !!(error.config?.url?.includes('expiring') || 
                                error.config?.url?.includes('notification'));
    
    // Check for token expiration message in error response
    const errorMessage = error.response?.data?.message || '';
    const errorData = error.response?.data || {};
    
    // Handle token expiration from error responses
    if (errorMessage && (
        errorMessage.includes('Token has expired') || 
        errorMessage.includes('token expired') ||
        errorMessage.includes('Please login again')
      ) || 
      (errorData.success === false && errorMessage && errorMessage.includes('expired'))
    ) {
      handleTokenExpiration(isLoginPage, isBackgroundRequest);
      return Promise.reject(error);
    }
    
    // Handle 403 Forbidden errors
    if (error.response && error.response.status === 403) {
      // Check if it's a trial expiration or subscription required issue
      const errorData = error.response?.data || {};
      const isTrialExpired = errorData.trialExpired === true || errorData.subscriptionRequired === true;
      const isSubscriptionPage = window.location.pathname.includes('/admin/subscription') || 
                                 window.location.pathname.includes('/subscription');
      
      if (isTrialExpired && !isSubscriptionPage && !isBackgroundRequest && !isLoginPage) {
        console.warn('⚠️ Trial expired or subscription required. Redirecting to subscription page...');
        // Don't logout - just redirect to subscription page
        setTimeout(() => {
          window.location.href = '/admin/subscription';
        }, 100);
        return Promise.reject(error);
      }
    }
    
    // Handle 401 Unauthorized errors
    if (error.response && error.response.status === 401 && !isLoginPage && !isBackgroundRequest) {
      console.warn('⚠️ Unauthorized. Token may be expired. Clearing storage...');
      clearAuth();
      store.dispatch(userLogOut());
      store.dispatch(superAdminLogOut());
      // Only redirect if not already on login page
      if (!isLoginPage) {
        setTimeout(() => {
          window.location.href = '/admin/login';
        }, 100);
      }
      return Promise.reject(error);
    }
    
    return Promise.reject(error);
  });

export default adminApi;


export const createContact = async (data: any) =>{
  try {

    const res: AxiosResponse = await adminApi.post(`admin/contact`,data);
    console.log('==res ', res)
    return res.data;
  } catch (error) {
    console.log(error);

    return (error as Error).response?.data;
  }
}
export const updateContact = async (id:string,data: any) =>{
  try {

    const res: AxiosResponse = await adminApi.put(`admin/contact/${id}`,data);
    console.log('==res ', res)
    return res.data;
  } catch (error) {
    console.log(error);

    return (error as Error).response?.data;
  }
}

export const  deleteContact = async (id:string) =>{
  try {

    const res: AxiosResponse = await adminApi.delete(`admin/contact/${id}`);
    console.log('==res ', res)
    return res.data;
  } catch (error) {
    console.log(error);

    return (error as Error).response?.data;
  }
}

export const  listContact = async () =>{
  try {

    const res: AxiosResponse = await adminApi.get(`admin/contact`);
    console.log('==res ', res)
    return res.data;
  } catch (error) {
    console.log(error);

    return (error as Error).response?.data;
  }
}

export const  searchContact = async (name:string) =>{
  try {

    const res: AxiosResponse = await adminApi.get(`admin/contact/search?name=${name}`);
    console.log('==res ', res)
    return res.data;
  } catch (error) {
    console.log(error);

    return (error as Error).response?.data;
  }
}

export const createCustomer = async (data: any) =>{
  try {

    const res: AxiosResponse = await adminApi.post(`admin/customer`,data);
    console.log('==res ', res)
    return res.data;
  } catch (error) {
    console.log(error);

    return (error as Error).response?.data;
  }
}

export const updateCustomer = async (id: string, data: any) =>{
  try {

    const res: AxiosResponse = await adminApi.put(`admin/customer/${id}`,data);
    console.log('==res ', res)
    return res.data;
  } catch (error) {
    console.log(error);

    return (error as Error).response?.data;
  }
}

export const deleteCustomer = async (id: string) =>{
  try {

    const res: AxiosResponse = await adminApi.delete(`admin/customer/${id}`);
    console.log('==res ', res)
    return res.data;
  } catch (error) {
    console.log(error);

    return (error as Error).response?.data;
  }
}

export const searchCustomer = async (name: string) =>{
  try {

    const res: AxiosResponse = await adminApi.post(`admin/customer/search?name=${name}`);
    console.log('==res ', res)
    return res.data;
  } catch (error) {
    console.log(error);

    return (error as Error).response?.data;
  }
}


export const listCustomer = async () =>{
  try {

    const res: AxiosResponse = await adminApi.get(`admin/customer`);
    console.log('==res ', res)
    return res.data;
  } catch (error) {
    console.log(error);

    return (error as Error).response?.data;
  }
}


export const listVehicle = async () =>{
  try {

    const res: AxiosResponse = await adminApi.get(`admin/vehicle`);
    console.log('==res ', res)
    return res.data;
  } catch (error) {
    console.log(error);

    return (error as Error).response?.data;
  }
}

export const createDriver = async (data: any) =>{
    try {

    const res: AxiosResponse = await adminApi.post(`admin/driver`,data);
    console.log('==res ', res)
    return res.data;
  } catch (error) {
    console.log(error);

    return (error as Error).response?.data;
  }
}

export const updateDriver = async (id: string, data: any) =>{
    try {

    const res: AxiosResponse = await adminApi.put(`admin/driver/${id}`,data);
    console.log('==res ', res)
    return res.data;
  } catch (error) {
    console.log(error);

    return (error as Error).response?.data;
  }
}

export const deleteDriver = async (id: string) =>{
    try {

    const res: AxiosResponse = await adminApi.delete(`admin/driver/${id}`);
    console.log('==res ', res)
    return res.data;
  } catch (error) {
    console.log(error);

    return (error as Error).response?.data;
  }
}
export const listDriver = async () =>{
    try {

    const res: AxiosResponse = await adminApi.get(`admin/driver`);
    console.log('==res ', res)
    return res.data;
  } catch (error) {
    console.log(error);

    return (error as Error).response?.data;
  }
}
export const updateDriverStatus = async (id: string) =>{
    try {

    const res: AxiosResponse = await adminApi.patch(`admin/driver/${id}/status`);
    console.log('==res ', res)
    return res.data;
  } catch (error) {
    console.log(error);

    return (error as Error).response?.data;
  }
}





export const createUsers = async (data:any) =>{
    try {

    const res: AxiosResponse = await adminApi.post(`hr/user`,data);
    console.log('==res ', res)
    return res.data;
  } catch (error) {
    console.log(error);

    return (error as Error).response?.data;
  }
}

export const getUsers = async (role:any) =>{
    try {

    const res: AxiosResponse = await adminApi.patch(`hr/user?role=${role}`);
    console.log('==res ', res)
    return res.data;
  } catch (error) {
    console.log(error);

    return (error as Error).response?.data;
  }
}