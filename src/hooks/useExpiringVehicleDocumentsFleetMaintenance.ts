import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate, useLocation } from 'react-router-dom';
import type { RootState } from '../redux/store';

export const useExpiringVehicleDocumentsFleetMaintenance = () => {
    const [showExpiringToast, setShowExpiringToast] = useState(false);
    const [expiringDocuments, setExpiringDocuments] = useState<any[]>([]);
    const navigate = useNavigate();
    const location = useLocation();
    
    const { userInfo } = useSelector((state: RootState) => state.userAuth);
    
    // Type assertion to handle the nested userData structure
    const userData = (userInfo as any)?.userData;

    // Check if we're in Fleet Maintenance panel routes
    const isFleetMaintenancePanel = location.pathname.startsWith('/fleetmaintenance') || location.pathname.startsWith('/admin/fleetmaintenance');
    
    // Check for expiring documents continuously (only in Fleet Maintenance panel)
    useEffect(() => {
        // Only check if we're in Fleet Maintenance panel routes
        if (!isFleetMaintenancePanel) {
            setShowExpiringToast(false);
            return;
        }

        console.log('🔍 useExpiringVehicleDocumentsFleetMaintenance useEffect triggered (Fleet Maintenance panel only)');
        
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
            
            // Check for admin, superadmin, or Fleet Maintenance Manager roles
            const userRole = effectiveUserData?.role;
            console.log('👤 Effective user info for expiring docs check:', userRole);
            if (!effectiveUserInfo || !userRole || !['admin', 'Fleet Maintenance Manager', 'superadmin'].includes(userRole)) {
                return;
            }

            try {
                // Fetch expiring vehicle documents
                const vehicleDocsRes = await import('../axios/api/compilance.vehicledoc').then(m => m.getExpiringVehicleDocuments(30));
                console.log('📄 Expiring vehicle documents response:---------------', vehicleDocsRes);
                
                // Handle vehicle documents
                if (vehicleDocsRes && vehicleDocsRes.success && vehicleDocsRes.data && vehicleDocsRes.data.length > 0) {
                    setExpiringDocuments(vehicleDocsRes.data);
                    setShowExpiringToast(true);
                } else {
                    setExpiringDocuments([]);
                    setShowExpiringToast(false);
                }
            } catch (error: any) {
                // Silently handle errors - don't crash the app for background checks
                if (error?.response?.status !== 403 && error?.response?.status !== 401) {
                    console.error('❌ Error checking expiring vehicle documents:', error);
                }
                setExpiringDocuments([]);
                setShowExpiringToast(false);
            }
        };

        // Add a small delay before first check to allow Redux state to update after login
        const initialCheckTimeout = setTimeout(() => {
            console.log('⏱ Initial check for expiring vehicle documents after delay');
            checkExpiringDocuments();
        }, 500); // 500ms delay

        // Set up interval to check every 30 seconds
        const interval = setInterval(() => {
            checkExpiringDocuments();
        }, 59*60*1000); // 59 minutes

        // Cleanup interval and timeout on unmount
        return () => {
            clearInterval(interval);
            clearTimeout(initialCheckTimeout);
        };
    }, [userInfo, userData, isFleetMaintenancePanel]);

    const handleCloseToast = () => {
        setShowExpiringToast(false);
    };

    const handleViewDocuments = () => {
        setShowExpiringToast(false);
        // Navigate based on current route prefix
        const basePath = location.pathname.startsWith('/admin/fleetmaintenance') 
            ? '/admin/fleetmaintenance/vehicle-documents' 
            : '/fleetmaintenance/vehicle-documents';
        navigate(basePath);
    };

    return {
        showExpiringToast,
        expiringDocuments,
        setShowExpiringToast,
        handleCloseToast,
        handleViewDocuments
    };
};

