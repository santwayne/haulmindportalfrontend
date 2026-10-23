import { Navigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { type RootState } from '../../redux/store';
import { isTokenValid } from '../../utils/auth';

interface SuperAdminProtectedRouteProps {
  children: React.ReactNode;
  redirectTo?: string;
}

/**
 * SuperAdminProtectedRoute - Component to protect superadmin routes
 * 
 * @param children - The component to render if authenticated as superadmin
 * @param redirectTo - Optional custom redirect path (defaults to /superadmin/login)
 */
const SuperAdminProtectedRoute = ({ 
  children, 
  redirectTo 
}: SuperAdminProtectedRouteProps) => {
  const location = useLocation();
  const { superAdminInfo } = useSelector((state: RootState) => state.superAdminAuth);
  const token = localStorage.getItem('token');

  // Check localStorage for superAdminInfo if Redux doesn't have it
  let effectiveSuperAdminInfo = superAdminInfo;
  
  if (token && !effectiveSuperAdminInfo) {
    try {
      const storedSuperAdminInfo = localStorage.getItem('superAdminInfo');
      if (storedSuperAdminInfo) {
        const parsed = JSON.parse(storedSuperAdminInfo);
        if (parsed && parsed.userData) {
          effectiveSuperAdminInfo = parsed;
        }
      }
    } catch (e) {
      // Ignore parsing errors
    }
  }

  // Check if token was recently set (grace period for fresh login)
  const tokenSetTime = sessionStorage.getItem('tokenSetTime');
  const now = Date.now();
  const recentlyLoggedIn = tokenSetTime && (now - parseInt(tokenSetTime)) < 10000;

  // Check token validity - skip validation for recently logged in users
  let tokenValid = true;
  if (!recentlyLoggedIn) {
    tokenValid = isTokenValid();
  } else {
    tokenValid = !!token;
  }

  // Check if user is authenticated as superadmin
  const isSuperAdmin = !!(token && effectiveSuperAdminInfo && effectiveSuperAdminInfo.userData && tokenValid);

  if (!isSuperAdmin) {
    const loginPath = redirectTo || '/superadmin/login';
    return <Navigate to={loginPath} state={{ from: location }} replace />;
  }

  // Check if superadmin is active
  const superAdminStatus = effectiveSuperAdminInfo?.userData?.status;
  if (!recentlyLoggedIn && superAdminStatus !== undefined && superAdminStatus !== 'active') {
    localStorage.removeItem('token');
    localStorage.removeItem('superAdminInfo');
    const loginPath = redirectTo || '/superadmin/login';
    return <Navigate to={loginPath} state={{ from: location, inactive: true }} replace />;
  }

  return <>{children}</>;
};

export default SuperAdminProtectedRoute;
