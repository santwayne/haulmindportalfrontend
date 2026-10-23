import apiClient from '../apiClient';

/**
 * Login API
 */
export const login = async (credentials: { email: string; password: string }) => {
  try {
    const res = await apiClient.post('/login', credentials);
    return res.data;
  } catch (error: any) {
    console.error('Login error:', error);
    return error.response?.data || { success: false, message: 'Login failed' };
  }
};

/**
 * Register Admin API
 */
export const registerAdmin = async (data: any) => {
  try {
    const res = await apiClient.post('/admin/register', data);
    return res.data;
  } catch (error: any) {
    console.error('Register error:', error);
    return error.response?.data || { success: false, message: 'Registration failed' };
  }
};

/**
 * Super Admin Login API
 */
export const loginSuperAdmin = async (credentials: { email: string; password: string }) => {
  try {
    const res = await apiClient.post('/superadmin/login', credentials);
    return res.data;
  } catch (error: any) {
    console.error('Super admin login error:', error);
    return error.response?.data || { success: false, message: 'Login failed' };
  }
};

/**
 * Get Current User Profile API
 */
export const getCurrentUserProfile = async () => {
  try {
    const res = await apiClient.get('/auth/me');
    return res.data;
  } catch (error: any) {
    console.error('Get profile error:', error);
    return error.response?.data || { success: false, message: 'Failed to get profile' };
  }
};

/**
 * Update Current User Profile API
 */
export const updateCurrentUserProfile = async (data: any) => {
  try {
    const res = await apiClient.put('/auth/me', data);
    return res.data;
  } catch (error: any) {
    console.error('Update profile error:', error);
    return error.response?.data || { success: false, message: 'Failed to update profile' };
  }
};

/**
 * Change Password API
 */
export const changePassword = async (data: { newPassword: string }) => {
  try {
    const res = await apiClient.put('/auth/change-password', data);
    return res.data;
  } catch (error: any) {
    console.error('Change password error:', error);
    return error.response?.data || { success: false, message: 'Failed to change password' };
  }
};

/**
 * Logout API - records logout for attendance tracking
 */
export const logout = async () => {
  try {
    const res = await apiClient.post('/auth/logout');
    return res.data;
  } catch (error: any) {
    // Even if API fails, we should still logout locally
    console.error('Logout API error:', error);
    return { success: true, message: 'Logged out' };
  }
};

/**
 * Forgot Password — sends a reset link to the given email
 */
export const forgotPassword = async (data: { email: string }) => {
  try {
    const res = await apiClient.post('/auth/forgot-password', data);
    return res.data;
  } catch (error: any) {
    return error.response?.data || { success: false, message: 'Request failed. Please try again.' };
  }
};

/**
 * Reset Password — submits new password using the token from the email link
 */
export const resetPassword = async (token: string, data: { password: string }) => {
  try {
    const res = await apiClient.post(`/auth/reset-password/${token}`, data);
    return res.data;
  } catch (error: any) {
    return error.response?.data || { success: false, message: 'Reset failed. Please try again.' };
  }
};

/**
 * Accept Employee Invite — submits new password using the invite token from the email link
 */
export const acceptInvite = async (token: string, data: { password: string }) => {
  try {
    const res = await apiClient.post(`/auth/accept-invite/${token}`, data);
    return res.data;
  } catch (error: any) {
    return error.response?.data || { success: false, message: 'Failed to accept invite. Please try again.' };
  }
};

/**
 * Auto logout API - records auto logout for attendance tracking
 */
export const autoLogout = async () => {
  try {
    const res = await apiClient.post('/auth/auto-logout');
    return res.data;
  } catch (error: any) {
    // Even if API fails, we should still logout locally
    console.error('Auto logout API error:', error);
    return { success: true, message: 'Auto logged out' };
  }
};
