import { useDispatch } from 'react-redux';
import { useNavigate, useLocation } from 'react-router-dom';
import { userLogOut } from '../redux/slices/userSlice';
import { superAdminLogOut } from '../redux/slices/superAdminSlice';
import { message } from 'antd';
import { clearAuth } from '../utils/auth';
import { logout as apiLogout, autoLogout as apiAutoLogout } from '../axios/api/auth';

export const useLogout = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  const logout = async (isAutoLogout = false) => {
    try {
      console.log('🚪 Logout initiated, isAutoLogout:', isAutoLogout);
      
      // Call logout API to record attendance (wait for it to complete)
      try {
        if (isAutoLogout) {
          console.log('📡 Calling auto logout API...');
          await apiAutoLogout();
          console.log('✅ Auto logout API completed');
        } else {
          console.log('📡 Calling logout API...');
          await apiLogout();
          console.log('✅ Logout API completed');
        }
      } catch (apiError) {
        console.error('❌ Logout API error:', apiError);
        // Continue with logout even if API fails
      }

      // Determine redirect path based on current route
      const isSuperAdmin = location.pathname.startsWith('/superadmin');
      const redirectPath = isSuperAdmin ? '/superadmin/login' : '/';
      
      // Clear user data from Redux store (admin and superadmin)
      dispatch(userLogOut());
      dispatch(superAdminLogOut());
      
      // Clear all authentication data using utility
      clearAuth();
      
      // Show success message
      if (isAutoLogout) {
        message.warning('Logged out due to inactivity');
      } else {
        message.success('Logged out successfully');
      }
      
      // Navigate to appropriate login page
      navigate(redirectPath);
    } catch (error) {
      console.error('Logout error:', error);
      message.error('Error during logout');
      // Ensure auth is cleared even on error
      clearAuth();
      navigate('/');
    }
  };

  return { logout };
};
