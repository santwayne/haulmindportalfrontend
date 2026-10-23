import { Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { type RootState } from '../../redux/store';

interface PublicRouteProps {
  children: React.ReactNode;
  redirectTo?: string;
  allowedRoles?: string[];
}

/**
 * PublicRoute - Component for public routes (login, register)
 * Redirects authenticated users away from auth pages
 * 
 * @param children - The component to render if not authenticated
 * @param redirectTo - Custom redirect path for authenticated users
 * @param allowedRoles - Optional roles that can still access this route when authenticated
 */
const PublicRoute = ({ 
  children, 
  redirectTo,
  allowedRoles 
}: PublicRouteProps) => {
  const { userInfo } = useSelector((state: RootState) => state.userAuth);
  const { superAdminInfo } = useSelector((state: RootState) => state.superAdminAuth);
  const token = localStorage.getItem('token');

  // Check localStorage as fallback (for immediate access after login before Redux updates)
  let effectiveUserInfo = userInfo;
  let effectiveSuperAdminInfo = superAdminInfo;
  
  if (token) {
    // Check localStorage for userInfo (admin)
    if (!userInfo || !userInfo.userData) {
      try {
        const storedUserInfo = localStorage.getItem('userInfo');
        if (storedUserInfo) {
          const parsed = JSON.parse(storedUserInfo);
          if (parsed && parsed.userData) {
            effectiveUserInfo = parsed;
          }
        }
      } catch (e) {
        // Ignore parsing errors
      }
    }
    
    // Check localStorage for superAdminInfo
    if (!superAdminInfo || !superAdminInfo.userData) {
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
  }

  // Check if user is authenticated - only if we have complete authentication info
  const hasCompleteUserInfo = !!(effectiveUserInfo && effectiveUserInfo.userData && effectiveUserInfo.userData.role);
  const hasCompleteSuperAdminInfo = !!(effectiveSuperAdminInfo && effectiveSuperAdminInfo.userData && effectiveSuperAdminInfo.userData.role);
  
  const isAdminAuthenticated = !!(token && hasCompleteUserInfo);
  const isSuperAdminAuthenticated = !!(token && hasCompleteSuperAdminInfo && !effectiveUserInfo);
  const isAuthenticated = isAdminAuthenticated || isSuperAdminAuthenticated;

  // If authenticated and route is not allowed for authenticated users
  if (isAuthenticated && (hasCompleteUserInfo || hasCompleteSuperAdminInfo)) {
    // Determine user role for allowedRoles check
    const currentRole = effectiveUserInfo?.userData?.role || effectiveSuperAdminInfo?.userData?.role;
    
    // If allowedRoles is specified and user's role is in the list, allow access
    if (allowedRoles && currentRole) {
      if (allowedRoles.includes(currentRole)) {
        return <>{children}</>;
      }
    }

    // Determine redirect path based on authentication type
    let defaultRedirect = '/admin/dashboard';
    if (isSuperAdminAuthenticated && !isAdminAuthenticated) {
      defaultRedirect = '/superadmin/dashboard';
    }

    const redirectPath = redirectTo || defaultRedirect;
    return <Navigate to={redirectPath} replace />;
  }

  return <>{children}</>;
};

export default PublicRoute;
