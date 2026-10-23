import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate, useLocation } from 'react-router-dom';
import type { RootState } from '../redux/store';

export const useExpiringVehicleDocuments = () => {
    const [showExpiringToast, setShowExpiringToast] = useState(false);
    const [expiringDocuments, setExpiringDocuments] = useState<any[]>([]);
    const navigate = useNavigate();
    const location = useLocation();
    
    const { userInfo } = useSelector((state: RootState) => state.userAuth);
    
    // Type assertion to handle the nested userData structure
    const userData = (userInfo as any)?.userData;

    // Check if we're in Compliance panel routes
    const isCompliancePanel = location.pathname.startsWith('/compliance');

    // Check for expiring documents continuously (only in Compliance panel)
    useEffect(() => {
        // Only check if we're in Compliance panel routes
        if (!isCompliancePanel) {
            setShowExpiringToast(false);
            return;
        }

        console.log('🔍 useExpiringVehicleDocuments useEffect triggered (Compliance panel only)');
        
        const checkExpiringDocuments = async () => {
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
            
            // Check for admin, superadmin, or Compliance Manager roles
            const userRole = effectiveUserData?.role;
            if (!effectiveUserInfo || !userRole || !['admin', 'Compliance Manager', 'superadmin'].includes(userRole)) {
                return;
            }

            // Compliance side doesn't need to call this API
            // Return empty data to avoid permission errors
            setExpiringDocuments([]);
            setShowExpiringToast(false);
        };

        // Add a small delay before first check to allow Redux state to update after login
        const initialCheckTimeout = setTimeout(() => {
            checkExpiringDocuments();
        }, 500); // 500ms delay

        // Set up interval to check every 30 seconds
        const interval = setInterval(() => {
            checkExpiringDocuments();
        }, 30 * 1000); // 30 seconds

        // Cleanup interval and timeout on unmount
        return () => {
            clearInterval(interval);
            clearTimeout(initialCheckTimeout);
        };
    }, [userInfo, userData, isCompliancePanel]);

    const handleCloseToast = () => {
        setShowExpiringToast(false);
    };

    const handleViewDocuments = () => {
        setShowExpiringToast(false);
        navigate('/compliance/vehicle-documents');
    };

    return {
        showExpiringToast,
        expiringDocuments,
        setShowExpiringToast,
        handleCloseToast,
        handleViewDocuments
    };
};

