import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate, useLocation } from 'react-router-dom';
import type { RootState } from '../redux/store';

export const useExpiringDocuments = () => {
    const [showExpiringToast, setShowExpiringToast] = useState(false);
    const [showExpiringPopup, setShowExpiringPopup] = useState(false);
    const [expiringDocuments, setExpiringDocuments] = useState<any[]>([]);
    const navigate = useNavigate();
    const location = useLocation();
    
    const { userInfo } = useSelector((state: RootState) => state.userAuth);
    
    // Type assertion to handle the nested userData structure
    const userData = (userInfo as any)?.userData;

    // Check if we're in HR or Accountant panel routes
    const isHRPanel = location.pathname.startsWith('/Management') || location.pathname.startsWith('/accounts');

    // Check for expiring documents continuously (only in HR panel)
    useEffect(() => {
        // Only check if we're in HR panel routes
        if (!isHRPanel) {
            setShowExpiringToast(false);
            setShowExpiringPopup(false);
            return;
        }

        console.log('🔍 useExpiringDocuments useEffect triggered (HR panel only)');
        
        const oneHourInMs = 60 * 60 * 1000; // 1 hour in milliseconds

        
        // Check if it's time to show alerts (every hour after login)
        const shouldShowAlerts = (): boolean => {
            try {
                const loginTimestamp = localStorage.getItem('loginTimestamp');
                if (!loginTimestamp) {
                    // If no login timestamp, don't show alerts (wait for next login)
                    console.log('⏳ No login timestamp found - waiting for user login...');
                    return false;
                }
                
                const loginTime = parseInt(loginTimestamp, 10);
                const currentTime = Date.now();
                const timeSinceLogin = currentTime - loginTime;
                console.log("timeSinceLogin", timeSinceLogin, "ms");
                
                // Calculate which hour mark we're at (1st hour, 2nd hour, etc.)
                const hoursSinceLogin = Math.floor(timeSinceLogin / oneHourInMs);
                
                    // Get the last hour mark when alerts were shown
                const lastShownHourKey = 'expiringDocsLastShownHour';
                const lastShownHour = localStorage.getItem(lastShownHourKey);
              
                
                    if (timeSinceLogin <= 10000 && !lastShownHour) {
                    console.log("🚀 Showing popup within 10 seconds of login");
                    localStorage.setItem(lastShownHourKey, "0");
                    return true;
                    }
                // Must be at least 1 hour since login
                if (hoursSinceLogin < 1) {
                    return false;
                   }
                

            
                
                // If we haven't shown alerts yet, or we're at a new hour mark, show alerts
                if (!lastShownHour || parseInt(lastShownHour, 10) < hoursSinceLogin) {
                    // Update the last shown hour
                    localStorage.setItem(lastShownHourKey, hoursSinceLogin.toString());
                    return true;
                }

                
                  

                
                return false;
            } catch (e) {
                console.error('Error checking login time:', e);
                // On error, allow showing alerts (for existing sessions)
                return true;
            }
        };
        
        const checkExpiringDocuments = async () => {
            // Check if it's time to show alerts (every hour after login)
            if (!shouldShowAlerts()) {
                const loginTimestamp = localStorage.getItem('loginTimestamp');
                if (loginTimestamp) {
                    const loginTime = parseInt(loginTimestamp, 10);
                    const currentTime = Date.now();
                    const timeSinceLogin = currentTime - loginTime;
                    const hoursSinceLogin = Math.floor(timeSinceLogin / oneHourInMs);
                    const minutesUntilNextHour = Math.ceil((oneHourInMs - (timeSinceLogin % oneHourInMs)) / 1000 / 60);
                    
                    if (hoursSinceLogin < 1) {
                        console.log(`⏳ Waiting for 1 hour after login before showing alerts... (${Math.ceil((oneHourInMs - timeSinceLogin) / 1000 / 60)} minutes remaining)`);
                    } else {
                        console.log(`⏳ Next alert will show in ${minutesUntilNextHour} minutes (at hour ${hoursSinceLogin + 1})`);
                    }
                }
                setShowExpiringToast(false);
                setShowExpiringPopup(false);
                return;
            }
            
            // Check both Redux and localStorage for userInfo (fallback for timing issues)
            let effectiveUserInfo = userInfo;
            let effectiveUserData = userData;
            
            if (!effectiveUserInfo) {
                try {
                    const storedUserInfo = localStorage.getItem('userInfo');
                    if (storedUserInfo) {
                        const parsed = JSON.parse(storedUserInfo);
                        if (parsed && parsed.userData) {
                            effectiveUserInfo = parsed;
                            effectiveUserData = parsed.userData;
                        }
                    }
                } catch (e) {
                    console.error('Error parsing userInfo from localStorage:', e);
                }
            }
            
            if (!effectiveUserInfo || !effectiveUserData || !['admin', 'hr', 'accountant', 'superadmin'].includes(effectiveUserData.role)) {
                return;
            }

            try { 
                // Check only employee documents (vehicle documents moved to Fleet Maintenance)
                const [employeeDocsRes, vehicleDocsRes] = await Promise.all([
  import('../axios/api/employeeDocument').then(m => m.getExpiringDocuments(30)),
  import('../axios/api/compilance.vehicledoc').then(m => m.getExpiringVehicleDocuments(30))
]);

const employeeDocs = employeeDocsRes?.data || [];
const vehicleDocs = vehicleDocsRes?.data || [];

const allDocs = [...employeeDocs, ...vehicleDocs];
                      
if (allDocs.length > 0) {
    setExpiringDocuments(allDocs);
    console.log("Expiring documents found:", allDocs);
    setShowExpiringToast(true);
    setShowExpiringPopup(true);
} else {
    setShowExpiringToast(false);
    setShowExpiringPopup(false);
}
            //  
            } catch (error: any) {
                // Silently handle errors - don't crash the app for background checks
                if (error?.response?.status !== 403 && error?.response?.status !== 401) {
                    console.error('❌ Error checking expiring documents:', error);
                }
                setShowExpiringToast(false);
                setShowExpiringPopup(false);
            }
        };

        // Calculate time until next hour mark
        const getTimeUntilNextHour = (): number => {
            const loginTimestamp = localStorage.getItem('loginTimestamp');
            if (!loginTimestamp) {
                return 0; // Show immediately for existing sessions
            }
            
            const loginTime = parseInt(loginTimestamp, 10);
            const currentTime = Date.now();
            const timeSinceLogin = currentTime - loginTime;
            const timeUntilNextHour = oneHourInMs - (timeSinceLogin % oneHourInMs);
            
            return timeUntilNextHour;
        };
        
        // Set up initial check and scheduling
        let scheduledTimeout: ReturnType<typeof setTimeout> | null = null;
        
        const scheduleNextHourCheck = () => {
            const timeUntilNextHour = getTimeUntilNextHour();
            
            if (timeUntilNextHour > 0 && timeUntilNextHour < oneHourInMs) {
                console.log(`⏰ Scheduling next alert check in ${Math.round(timeUntilNextHour / 1000 / 60)} minutes...`);
                
                // Clear any existing scheduled timeout
                if (scheduledTimeout) {
                    clearTimeout(scheduledTimeout);
                }
                
                // Schedule check at the next hour mark
                scheduledTimeout = setTimeout(() => {
                    checkExpiringDocuments();
                    // After showing alerts, schedule the next hour check
                    scheduleNextHourCheck();
                }, timeUntilNextHour);
            }
        };
        
        // Initial check with delay to allow Redux state to update after login
        const initialCheckTimeout = setTimeout(() => {
            checkExpiringDocuments();
            // Schedule the next hour check
            scheduleNextHourCheck();
        }, 500); // 500ms delay

        // Set up interval to check every minute (for accurate hourly timing)
        // This ensures we catch the exact hour mark even if the scheduled timeout is missed
        const interval = setInterval(() => {
            checkExpiringDocuments();
        }, 60 * 1000); // Check every minute for accurate timing

        // Cleanup interval and timeout on unmount
        return () => {
            clearInterval(interval);
            clearTimeout(initialCheckTimeout);
            if (scheduledTimeout) {
                clearTimeout(scheduledTimeout);
            }
        };
    }, [userInfo, userData, isHRPanel]);

    const handleCloseToast = () => {
        setShowExpiringToast(false);
    };

    const handleClosePopup = () => {
        setShowExpiringPopup(false);
    };

    const handleViewDocuments = () => {
        setShowExpiringToast(false);
        setShowExpiringPopup(false);
        navigate('/Management/documents');
    };

    return {
        showExpiringToast,
        showExpiringPopup,
        expiringDocuments,
        setShowExpiringToast,
        setShowExpiringPopup,
        handleCloseToast,
        handleClosePopup,
        handleViewDocuments
    };
};
