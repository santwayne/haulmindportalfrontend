/**
 * Authentication utility functions
 */

/**
 * Check if user is authenticated (admin) and active
 * @returns boolean - true if authenticated and active
 */
export const isAuthenticated = (): boolean => {
  const token = localStorage.getItem('token');
  const userInfo = localStorage.getItem('userInfo');
  if (!token || !userInfo) return false;
  
  try {
    const parsed = JSON.parse(userInfo);
    const status = parsed?.userData?.status;
    // User must be authenticated AND (active or status undefined for backward compatibility)
    return status === undefined || status === 'active';
  } catch (e) {
    return false;
  }
};

/**
 * Check if user is authenticated as superadmin and active
 * @returns boolean - true if authenticated as superadmin and active
 */
export const isSuperAdmin = (): boolean => {
  const token = localStorage.getItem('token');
  // Check Redux store for superadmin info
  try {
    const superAdminInfo = localStorage.getItem('superAdminInfo');
    if (!token || !superAdminInfo) return false;
    
    const parsed = JSON.parse(superAdminInfo);
    const status = parsed?.userData?.status;
    // Superadmin must be authenticated AND (active or status undefined for backward compatibility)
    return status === undefined || status === 'active';
  } catch (e) {
    return false;
  }
};

/**
 * Get current user role
 * @returns string | null - user role or null
 */
export const getUserRole = (): string | null => {
  // Try to get from Redux (admin)
  try {
    const userInfo = localStorage.getItem('userInfo');
    if (userInfo) {
      const parsed = JSON.parse(userInfo);
      return parsed?.userData?.role || null;
    }
  } catch (e) {
    // Ignore parsing errors
  }
  
  // Try to get from Redux (superadmin)
  try {
    const superAdminInfo = localStorage.getItem('superAdminInfo');
    if (superAdminInfo) {
      const parsed = JSON.parse(superAdminInfo);
      return parsed?.userData?.role || null;
    }
  } catch (e) {
    // Ignore parsing errors
  }
  
  return null;
};

/**
 * Get current user info
 * @returns object | null - user info or null
 */
export const getUserInfo = (): any | null => {
  // Try admin format (Redux)
  try {
    const userInfo = localStorage.getItem('userInfo');
    if (userInfo) {
      return JSON.parse(userInfo);
    }
  } catch (e) {
    // Ignore parsing errors
  }
  
  // Try superadmin format (Redux)
  try {
    const superAdminInfo = localStorage.getItem('superAdminInfo');
    if (superAdminInfo) {
      return JSON.parse(superAdminInfo);
    }
  } catch (e) {
    // Ignore parsing errors
  }
  
  return null;
};

/**
 * Clear all authentication data
 */
export const clearAuth = (): void => {
  localStorage.removeItem('token');
  localStorage.removeItem('userInfo');
  localStorage.removeItem('superAdminInfo');
  // Legacy cleanup (remove old localStorage keys)
  localStorage.removeItem('userRole');
  localStorage.removeItem('userData');
};

/**
 * Check if token is expired (basic check - JWT tokens should be validated on backend)
 * @param token - JWT token string
 * @returns boolean - true if token appears to be expired
 */
export const isTokenExpired = (token: string | null): boolean => {
  if (!token) return true;
  
  try {
    // Decode JWT token (basic decode without verification)
    const payload = JSON.parse(atob(token.split('.')[1]));
    const exp = payload.exp;
    
    if (!exp) return false; // No expiration claim means token doesn't expire (valid)
    
    // Check if token is expired (exp is in seconds)
    return Date.now() >= exp * 1000;
  } catch (e) {
    // If token is malformed, consider it expired
    return true;
  }
};

/**
 * Validate token and check if it's expired
 * @returns boolean - true if token is valid and not expired
 */
export const isTokenValid = (): boolean => {
  const token = localStorage.getItem('token');
  if (!token) return false;
  
  // Check if token is expired
  if (isTokenExpired(token)) {
    clearAuth();
    return false;
  }
  
  return true;
};

/**
 * Get current user ID
 * @returns string | null - user ID or null
 */
export const getUserId = (): string | null => {
  try {
    const userInfo = localStorage.getItem('userInfo');
    if (userInfo) {
      const parsed = JSON.parse(userInfo);
      return parsed?.userData?._id || parsed?.userData?.id || null;
    }
  } catch (e) {
    // Ignore parsing errors
  }
  
  try {
    const superAdminInfo = localStorage.getItem('superAdminInfo');
    if (superAdminInfo) {
      const parsed = JSON.parse(superAdminInfo);
      return parsed?.userData?._id || parsed?.userData?.id || null;
    }
  } catch (e) {
    // Ignore parsing errors
  }
  
  return null;
};

/**
 * Get dashboard route based on user role
 * @returns string - dashboard route path
 */
export const getDashboardRoute = (): string => {
  const role = getUserRole();
  
  if (!role) {
    return '/admin';
  }
  
  switch (role) {
    case 'dispatcher':
      return '/dispatch';
    case 'hr':
      return '/Management';
    case 'accountant':
      return '/accounts';
    case 'Fleet Maintenance Manager':
      return '/fleetmaintenance';
    case 'Compliance Manager':
      return '/compliance';
    case 'safety officer':
      return '/healthandsafety';
    case 'Maintenance Crew (Mechanics)':
      return '/mechanics/dashboard';
    case 'admin':
    case 'superadmin':
    default:
      return '/admin';
  }
};

