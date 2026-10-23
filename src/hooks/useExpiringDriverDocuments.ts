import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import type { RootState } from '../redux/store';



export const useExpiringDriverDocuments = () => {
    const [showExpiringPopup, setShowExpiringPopup] = useState(false);
    const [, setExpiringDocuments] = useState<any[]>([]);
    const navigate = useNavigate();
    
    const { userInfo } = useSelector((state: RootState) => state.userAuth);
    
    // Type assertion to handle the nested userData structure
    const userData = (userInfo as any)?.userData;

    // Check for expiring documents continuously
    useEffect(() => {
        console.log('🔍 useExpiringDriverDocuments useEffect triggered');
        console.log('🔍 userInfo:', userInfo);
        console.log('🔍 userData:', userData);
        console.log('🔍 userData.role:', userData?.role);
        
        const checkExpiringDocuments = async () => {
            console.log('🔍 checkExpiringDriverDocuments called');
            console.log('🔍 userInfo check:', userInfo);
            console.log('🔍 userData check:', userData);
            console.log('🔍 role check:', userData?.role);
            console.log('🔍 authorized roles check:', ['admin', 'hr', 'superadmin', 'dispatcher'].includes(userData?.role || ''));
            
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
                            console.log('✅ Using userInfo from localStorage as fallback');
                        }
                    }
                } catch (e) {
                    console.error('Error parsing userInfo from localStorage:', e);
                }
            }
            
            if (!effectiveUserInfo || !effectiveUserData || !['admin', 'hr', 'superadmin', 'dispatcher'].includes(effectiveUserData.role)) {
                console.log('❌ User not authorized or no userInfo');
                return;
            }

            try {
                console.log('🔍 Making API call to get expiring driver documents...');
                // Import the API function dynamically to avoid circular imports
                const { getExpiringDriverDocuments } = await import('../axios/api/compilance.driverdoc');
                const response = await getExpiringDriverDocuments(30); // Check for documents expiring in next 30 days
                
                console.log('🔍 API Response:', response);
                console.log('🔍 Response success:', response?.success);
                console.log('🔍 Response data:', response?.data);
                console.log('🔍 Data length:', response?.data?.length);
                
                if (response && response.success && response.data && response.data.length > 0) {
                    console.log('✅ Found expiring driver documents, setting popup to true');
                    setExpiringDocuments(response.data);
                    setShowExpiringPopup(true);
                    console.log('🚨 Showing toast for expiring driver documents:', response.data.length);
                } else {
                    console.log('❌ No expiring driver documents found or API failed');
                    setShowExpiringPopup(false);
                }
            } catch (error: any) {
                // Silently handle errors - don't crash the app for background checks
                // Only log if it's not a 403/401 (those are handled by interceptor)
                if (error?.response?.status !== 403 && error?.response?.status !== 401) {
                    console.error('❌ Error checking expiring driver documents:', error);
                }
                setShowExpiringPopup(false);
            }
        };

        // Add a small delay before first check to allow Redux state to update after login
        // This prevents race conditions where API calls happen before auth state is ready
        console.log('🔍 Starting initial check with delay...');
        const initialCheckTimeout = setTimeout(() => {
            checkExpiringDocuments();
        }, 500); // 500ms delay to allow Redux state to update

        // Set up interval to check every 30 seconds
        console.log('🔍 Setting up 30-second interval...');
        const interval = setInterval(() => {
            console.log('⏰ 30-second interval triggered');
            checkExpiringDocuments();
        }, 30 * 1000); // 30 seconds

        // Cleanup interval and timeout on unmount
        return () => {
            console.log('🔍 Cleaning up interval and timeout');
            clearInterval(interval);
            clearTimeout(initialCheckTimeout);
        };
    }, [userInfo, userData]);

    const handleClosePopup = () => {
        setShowExpiringPopup(false);
        // Popup will show again in next check if documents are still expiring
    };

    const handleViewDocuments = () => {
        // Navigate to driver documents page using React Router
        setShowExpiringPopup(false);
        navigate('/admin/compliance/compilance-summary');
    };

    return {
        showExpiringPopup,
        setShowExpiringPopup,
        handleClosePopup,
        handleViewDocuments
    };
};
