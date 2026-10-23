import { useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { useLogout } from './useLogout';
import { isAuthenticated, isSuperAdmin } from '../utils/auth';

/**
 * Custom hook to handle automatic logout after inactivity
 * Logs out user after 1 hour (3600000 ms) of inactivity
 * Resets timer on user activity (mouse movement, clicks, keyboard input, scroll, touch)
 */
export const useInactivityTimer = () => {
  const { logout } = useLogout();
  const location = useLocation();
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastActivityRef = useRef<number>(Date.now());
  
  // Inactivity timeout: 1 hour = 3600000 milliseconds
  const INACTIVITY_TIMEOUT = 60 * 60 * 1000; // 1 hour in milliseconds

  // Check if current route is a login/register page
  const isLoginPage = useCallback(() => {
    const path = location.pathname;
    return path === '/' || 
           path === '/register' || 
           path === '/superadmin/login' ||
           path.startsWith('/login');
  }, [location.pathname]);

  const resetTimer = useCallback(() => {
    // Don't set timer on login pages
    if (isLoginPage()) {
      return;
    }

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Check if user is authenticated before setting timer
    const isAuth = isAuthenticated() || isSuperAdmin();
    
    if (!isAuth) {
      return; // Don't set timer if not authenticated
    }

    // Update last activity time
    lastActivityRef.current = Date.now();

    // Set new timeout for logout
    timeoutRef.current = setTimeout(() => {
      console.log('⏰ Inactivity timeout reached. Auto-logging out...');
      logout(true); // Pass true to indicate auto-logout
    }, INACTIVITY_TIMEOUT);
  }, [logout, isLoginPage]);

  const handleActivity = useCallback(() => {
    // Don't track activity on login pages
    if (isLoginPage()) {
      return;
    }

    // Only reset timer if user is authenticated
    if (isAuthenticated() || isSuperAdmin()) {
      resetTimer();
    }
  }, [resetTimer, isLoginPage]);

  useEffect(() => {
    // Don't set up timer on login pages
    if (isLoginPage()) {
      return;
    }

    // Only set up timer if user is authenticated
    if (isAuthenticated() || isSuperAdmin()) {
      // Initial timer setup
      resetTimer();

      // Event listeners for user activity
      const events = [
        'mousedown',
        'mousemove',
        'keypress',
        'scroll',
        'touchstart',
        'click',
        'keydown'
      ];

      // Add event listeners
      events.forEach(event => {
        document.addEventListener(event, handleActivity, true);
      });

      // Also check on visibility change (when user switches tabs/windows)
      const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible') {
          // User came back to the tab, check if we should reset timer
          const timeSinceLastActivity = Date.now() - lastActivityRef.current;
          if (timeSinceLastActivity < INACTIVITY_TIMEOUT) {
            // Still within timeout, reset timer
            resetTimer();
          } else {
            // Too much time has passed, logout
            console.log('⏰ Tab was inactive for too long. Auto-logging out...');
            logout(true); // Pass true to indicate auto-logout
          }
        }
      };

      document.addEventListener('visibilitychange', handleVisibilityChange);

      // Cleanup function
      return () => {
        // Clear timeout
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }

        // Remove event listeners
        events.forEach(event => {
          document.removeEventListener(event, handleActivity, true);
        });

        document.removeEventListener('visibilitychange', handleVisibilityChange);
      };
    }
  }, [handleActivity, resetTimer, logout, isLoginPage]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);
};

