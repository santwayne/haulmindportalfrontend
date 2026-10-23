import { Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { type RootState } from '../../redux/store';

interface SuperAdminPublicRouteProps {
  children: React.ReactNode;
  redirectTo?: string;
}

/**
 * SuperAdminPublicRoute - Component for superadmin public routes (login)
 * Redirects authenticated superadmins away from login page
 * 
 * @param children - The component to render if not authenticated
 * @param redirectTo - Custom redirect path for authenticated superadmins
 */
const SuperAdminPublicRoute = ({ 
  children, 
  redirectTo 
}: SuperAdminPublicRouteProps) => {
  const { superAdminInfo } = useSelector((state: RootState) => state.superAdminAuth);
  const token = localStorage.getItem('token');

  // Check if user is authenticated as superadmin
  const isSuperAdmin = !!(token && superAdminInfo);

  // If authenticated as superadmin, redirect to dashboard
  if (isSuperAdmin) {
    const redirectPath = redirectTo || '/superadmin/dashboard';
    return <Navigate to={redirectPath} replace />;
  }

  return <>{children}</>;
};

export default SuperAdminPublicRoute;

