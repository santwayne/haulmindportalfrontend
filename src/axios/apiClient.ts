// src/config/apiClient.js
import axios from "axios";
import { clearAuth } from "../utils/auth";
import { store } from "../redux/store";
import { userLogOut } from "../redux/slices/userSlice";
import { superAdminLogOut } from "../redux/slices/superAdminSlice";

const baseUrl = import.meta.env.VITE_APP_BASE_URL || 'http://localhost:3000/api/v1'

// Debug: Log the base URL to console
console.log('VITE_APP_BASE_URL:', baseUrl);

// Create instance
const apiClient = axios.create({
  baseURL: baseUrl // Base URL for all requests with fallback
});

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

// Request interceptor - Add token or any header
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token"); // Or get from Redux/Context
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // Don't set Content-Type for FormData - axios will set it automatically with boundary
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - Handle errors globally
apiClient.interceptors.response.use(
  (response) => {
    // Check for trial expired flag in response
    const responseData = response.data;
    if (responseData && responseData.trialExpired === true) {
      const isLoginPage = window.location.pathname === '/' || 
                         window.location.pathname === '/admin/adminLogin' ||
                         window.location.pathname === '/superadmin/login';
      const isSubscriptionPage = window.location.pathname.includes('/admin/subscription') || 
                                window.location.pathname.includes('/subscription');
      
      // Don't show toast on login or subscription pages
      if (!isLoginPage && !isSubscriptionPage) {
        // Show toast notification using global function
        const showToast = (window as any).showTrialExpiredToast;
        if (showToast && typeof showToast === 'function') {
          const message = responseData.trialExpiredMessage || "Your subscription has ended. Purchase to continue use.";
          showToast(message);
        }
      }
    }
    
    // Check for successful responses (200) with success: false and token expiration message
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
      // Log detailed error information (only for non-background requests)
      if (!isBackgroundRequest) {
        console.error('❌ 403 Forbidden Error:', {
          message: errorMessage,
          url: error.config?.url,
          status: error.response.status,
          data: error.response.data
        });
      }
      
      // Check if it's a trial expiration or subscription required issue
      const errorData = error.response?.data || {};
      const isTrialExpired = errorData.trialExpired === true || errorData.subscriptionRequired === true;
      const isAccessDenied = errorData.accessDenied === true;
      const isSubscriptionPage = window.location.pathname.includes('/admin/subscription') || 
                                 window.location.pathname.includes('/subscription');
      
      if (isTrialExpired && !isSubscriptionPage && !isBackgroundRequest && !isLoginPage) {
        // Show toast notification
        const showToast = (window as any).showTrialExpiredToast;
        if (showToast && typeof showToast === 'function') {
          const message = errorData.trialExpiredMessage || "Your subscription has ended. Purchase to continue use.";
          showToast(message);
        }
        
        // If access is denied (write operation blocked), show additional error message
        if (isAccessDenied) {
          console.error('❌ Access denied - trial expired:', errorData.message);
        }
        
        // Don't logout or redirect - just show toast and reject the promise
        return Promise.reject(error);
      }
      
      // Check if it's a token issue (invalid/expired token)
      if ((errorMessage.includes('Invalid token') || errorMessage.includes('token')) && !isLoginPage && !isBackgroundRequest) {
        console.warn('⚠️ Token issue detected. Clearing token and redirecting to login...');
        clearAuth();
        store.dispatch(userLogOut());
        store.dispatch(superAdminLogOut());
        // Only redirect if not already on login page
        if (!isLoginPage) {
          // Use setTimeout to avoid redirect loop
          setTimeout(() => {
            window.location.href = '/';
          }, 100);
        }
        return Promise.reject(error);
      }
      
      // Check if it's an inactive account
      if (errorMessage.includes('not active') || errorMessage.includes('inactive') || errorMessage.includes('Account is inactive')) {
        if (!isBackgroundRequest) {
          console.error('❌ Account is inactive. Clearing token and redirecting to login...');
          clearAuth();
          store.dispatch(userLogOut());
          store.dispatch(superAdminLogOut());
          // Only redirect if not already on login page
          if (!isLoginPage) {
            setTimeout(() => {
              window.location.href = '/admin/login';
            }, 100);
          }
        }
        return Promise.reject(error);
      }
      
      // Check if it's a role/permission issue
      if (errorMessage.includes('Access denied') || errorMessage.includes('role')) {
        if (!isBackgroundRequest) {
          console.error('❌ Access denied. Your role does not have permission to access this resource.');
        }
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
        // Use setTimeout to avoid redirect loop
        setTimeout(() => {
          window.location.href = '/admin/login';
        }, 100);
      }
      return Promise.reject(error);
    }
    
    // For network errors or other errors, just reject without redirecting
    return Promise.reject(error);
  }
);

export default apiClient;
