import { useState, useEffect, useRef } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import DispatchSidebar from "./Sidebar";
import DispatchHeader from "./Header";
import ExpiringDriverDocumentsPopup from "../common/ExpiringDriverDocumentsPopup";
import DocumentUploadNotification from "../common/DocumentUploadNotification";
import { useExpiringDriverDocuments } from "../../hooks/useExpiringDriverDocuments";
import AIChatAssistant from "../ai/AIChatAssistant";
import { socketService } from "../../services/socketService";
import { useChat } from "../../contexts/ChatContext";
import { MessageCircle, X } from "lucide-react";

// WhatsApp-style popup toast for incoming driver messages
const ChatMessagePopup = ({ navigate }: { navigate: (path: string) => void }) => {
    const { chatNotification, clearChatNotification, setActiveDriverId } = useChat();
    const [visible, setVisible] = useState(false);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        if (chatNotification) {
            setVisible(true);
            if (timerRef.current) clearTimeout(timerRef.current);
            timerRef.current = setTimeout(() => {
                setVisible(false);
                clearChatNotification();
            }, 5000);
        }
        return () => { if (timerRef.current) clearTimeout(timerRef.current); };
    }, [chatNotification]);

    if (!visible || !chatNotification) return null;

    const handleView = () => {
        setVisible(false);
        clearChatNotification();
        setActiveDriverId(chatNotification.driverId);
        navigate("/dispatch/chat");
    };

    const handleDismiss = () => {
        setVisible(false);
        clearChatNotification();
    };

    return (
        <div className="fixed bottom-6 right-6 z-[9999] animate-chat-popup">
            <div className="bg-card rounded-2xl shadow-2xl border border-theme w-80 overflow-hidden">
                {/* Green header bar like WhatsApp */}
                <div className="bg-[#25D366] px-4 py-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <MessageCircle size={16} className="text-white" />
                        <span className="text-white text-xs font-semibold tracking-wide">New Message</span>
                    </div>
                    <button onClick={handleDismiss} className="text-white/80 hover:text-white transition-colors">
                        <X size={14} />
                    </button>
                </div>
                {/* Body */}
                <div className="p-4">
                    <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#25D366]/10 flex items-center justify-center flex-shrink-0">
                            <span className="text-[#25D366] font-bold text-sm">
                                {chatNotification.driverName.charAt(0).toUpperCase()}
                            </span>
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="font-semibold text-primary text-sm truncate">{chatNotification.driverName}</p>
                            <p className="text-secondary text-sm mt-0.5 line-clamp-2">{chatNotification.message}</p>
                        </div>
                    </div>
                    <button
                        onClick={handleView}
                        className="mt-3 w-full py-2 bg-[#25D366] hover:bg-[#20c05c] text-white text-sm font-semibold rounded-lg transition-colors"
                    >
                        View Chat
                    </button>
                </div>
                {/* Auto-dismiss progress bar */}
                <div className="h-1 bg-card">
                    <div className="h-full bg-[#25D366] animate-[shrink_5s_linear_forwards]" style={{ transformOrigin: 'left' }} />
                </div>
            </div>
        </div>
    );
};

const Layout = () => {
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [documentNotification, setDocumentNotification] = useState<any>(null);
    const [showDocumentNotification, setShowDocumentNotification] = useState(false);
    const { activeDriverId, addUnread, setChatNotification } = useChat();
    const activeDriverIdRef = useRef<string | null>(null);
    const navigate = useNavigate();

    // Keep ref in sync so socket handlers avoid stale closures
    useEffect(() => {
        activeDriverIdRef.current = activeDriverId;
    }, [activeDriverId]);

    // Debug: Component mount
    useEffect(() => {
        console.log('🚀 DISPATCHER LAYOUT: Component mounted');
        console.log('🚀 DISPATCHER LAYOUT: Initial documentNotification state:', documentNotification);
        console.log('🚀 DISPATCHER LAYOUT: Socket service available?', !!socketService);
        console.log('🚀 DISPATCHER LAYOUT: Socket connected?', socketService.isConnected());
        console.log('🚀 DISPATCHER LAYOUT: Socket authenticated?', socketService.getIsAuthenticated());

        const socket = socketService.getSocket();
        if (socket) {
            console.log('🚀 DISPATCHER LAYOUT: Socket ID:', socket.id);
            console.log('🚀 DISPATCHER LAYOUT: Socket connected status:', socket.connected);
        }
    }, []); // Run only on mount

    // Debug: Monitor documentNotification and showDocumentNotification state changes
    useEffect(() => {
        console.log('🔄🔄🔄 DISPATCHER STATE CHANGE: State updated! 🔄🔄🔄');
        console.log('🔄 DISPATCHER STATE CHANGE: documentNotification:', JSON.stringify(documentNotification, null, 2));
        console.log('🔄 DISPATCHER STATE CHANGE: showDocumentNotification:', showDocumentNotification);
        console.log('🔄 DISPATCHER STATE CHANGE: Should component render?', showDocumentNotification && !!documentNotification);
        console.log('🔄 DISPATCHER STATE CHANGE: Has orderId?', !!documentNotification?.orderId);

        if (documentNotification && showDocumentNotification) {
            console.log('✅✅✅ DISPATCHER STATE CHANGE: POPUP SHOULD BE VISIBLE NOW! ✅✅✅');
            console.log('✅ DISPATCHER STATE CHANGE: Notification details:', {
                orderId: documentNotification.orderId,
                orderNumber: documentNotification.orderNumber,
                driverName: documentNotification.driverName,
                type: documentNotification.type,
                message: documentNotification.message
            });
        } else {
            console.log('❌ DISPATCHER STATE CHANGE: Popup will NOT render');
            console.log('❌ DISPATCHER STATE CHANGE: showDocumentNotification:', showDocumentNotification);
            console.log('❌ DISPATCHER STATE CHANGE: documentNotification exists?', !!documentNotification);
        }
    }, [documentNotification, showDocumentNotification]);
    const {
        showExpiringPopup: showDriverExpiringPopup,
        handleClosePopup: handleCloseDriverPopup,
        handleViewDocuments: handleViewDriverDocuments
    } = useExpiringDriverDocuments();

    const toggleSidebar = () => {
        setIsSidebarCollapsed(!isSidebarCollapsed);
    };

    // Global Socket.IO listener for document upload notifications (DISPATCHER)
    useEffect(() => {
        console.log('🌐 DISPATCHER GLOBAL: Setting up Socket.IO document upload listener...');
        console.log('🌐 DISPATCHER GLOBAL: Socket.IO connected?', socketService.isConnected());
        console.log('🌐 DISPATCHER GLOBAL: Socket.IO authenticated?', socketService.getIsAuthenticated());

        // FORCE Socket.IO connection
        const initSocketConnection = async () => {
            const token = localStorage.getItem('token');
            if (!token) {
                console.error('❌ DISPATCHER GLOBAL: No auth token found');
                return;
            }

            console.log('🔌 DISPATCHER GLOBAL: Token found, forcing Socket.IO connection...');

            try {
                await socketService.connect(token);
                console.log('✅ DISPATCHER GLOBAL: Socket.IO connected successfully');
                console.log('✅ DISPATCHER GLOBAL: Socket ID:', socketService.getSocket()?.id);
            } catch (error) {
                console.error('❌ DISPATCHER GLOBAL: Failed to connect Socket.IO:', error);
            }
        };

        initSocketConnection();

        const handleDocumentUpload = (notification: any) => {
            console.log('🎉🎉🎉 DISPATCHER GLOBAL NOTIFICATION RECEIVED! 🎉🎉🎉');
            console.log('📢 DISPATCHER GLOBAL: Raw notification:', notification);
            console.log('📢 DISPATCHER GLOBAL: Is array?', Array.isArray(notification));
            console.log('📢 DISPATCHER GLOBAL: Notification type:', typeof notification);

            // Handle array format - unwrap if needed
            let notificationData = notification;
            if (Array.isArray(notification) && notification.length > 0) {
                notificationData = notification[0];
                console.log('📢 DISPATCHER GLOBAL: Unwrapped from array:', notificationData);
            }

            console.log('📢 DISPATCHER GLOBAL: Final notification data:', JSON.stringify(notificationData, null, 2));
            console.log('📢 DISPATCHER GLOBAL: notificationData type:', typeof notificationData);
            console.log('📢 DISPATCHER GLOBAL: notificationData.orderId:', notificationData?.orderId);

            // Validate notification before setting
            if (!notificationData || typeof notificationData !== 'object') {
                console.error('❌ DISPATCHER GLOBAL: Invalid notification data - not an object:', notificationData);
                return;
            }

            if (!notificationData.orderId) {
                console.error('❌ DISPATCHER GLOBAL: Invalid notification data - missing orderId:', notificationData);
                return;
            }

            console.log('📢 DISPATCHER GLOBAL: Order ID:', notificationData.orderId);
            console.log('📢 DISPATCHER GLOBAL: Order Number:', notificationData.orderNumber);
            console.log('📢 DISPATCHER GLOBAL: Driver Name:', notificationData.driverName);

            console.log('🔄 DISPATCHER GLOBAL: About to update state...');
            console.log('🔄 DISPATCHER GLOBAL: Current showDocumentNotification:', showDocumentNotification);
            console.log('🔄 DISPATCHER GLOBAL: Current documentNotification:', documentNotification);

            // Set notification data and show popup (like expiring documents pattern)
            setDocumentNotification(notificationData);
            setShowDocumentNotification(true);

            console.log('✅✅✅ DISPATCHER GLOBAL: State updated! ✅✅✅');
            console.log('✅ DISPATCHER GLOBAL: setDocumentNotification called with:', JSON.stringify(notificationData, null, 2));
            console.log('✅ DISPATCHER GLOBAL: setShowDocumentNotification called with: true');

            // Verify state was set (check after a brief delay)
            setTimeout(() => {
                console.log('🔍 DISPATCHER GLOBAL: Verifying state after 100ms...');
                // Note: We can't read state here, but React should have updated it
            }, 100);
        };

        // Wait for socket to be ready before registering listener
        const registerListener = () => {
            const socket = socketService.getSocket();
            console.log('🔍 DISPATCHER GLOBAL: Checking socket status...');
            console.log('🔍 DISPATCHER GLOBAL: Socket exists?', !!socket);
            console.log('🔍 DISPATCHER GLOBAL: Socket connected?', socket?.connected);
            console.log('🔍 DISPATCHER GLOBAL: Socket ID:', socket?.id);
            console.log('🔍 DISPATCHER GLOBAL: Socket authenticated?', socketService.getIsAuthenticated());

            if (!socket || !socket.connected) {
                console.warn('⚠️ DISPATCHER GLOBAL: Socket not ready yet, retrying in 500ms...');
                setTimeout(registerListener, 500);
                return;
            }

            if (!socketService.getIsAuthenticated()) {
                console.warn('⚠️ DISPATCHER GLOBAL: Socket not authenticated yet, retrying in 500ms...');
                setTimeout(registerListener, 500);
                return;
            }

            console.log('✅ DISPATCHER GLOBAL: Socket is ready and authenticated! Registering listener...');
            console.log('✅ DISPATCHER GLOBAL: Socket ID:', socket.id);
            console.log('✅ DISPATCHER GLOBAL: Socket connected:', socket.connected);


            // Register via service
            socketService.onDocumentUploadNotification(handleDocumentUpload);
            console.log('✅ DISPATCHER GLOBAL: Socket.IO listener registered via service');
            socketService.offNewMessage(handleIncomingMessage);
            socketService.onNewMessage(handleIncomingMessage);

            // Also add direct socket listener as PRIMARY handler
            const directListener = (data: any) => {
                console.log('🔔🔔🔔 DISPATCHER GLOBAL: Direct socket listener triggered! 🔔🔔🔔');
                console.log('🔔 DISPATCHER GLOBAL: Raw data received:', data);
                console.log('🔔 DISPATCHER GLOBAL: Data type:', typeof data);
                console.log('🔔 DISPATCHER GLOBAL: Is array?', Array.isArray(data));
                handleDocumentUpload(data);
            };
            socket.on('documentUploadNotification', directListener);
            console.log('✅ DISPATCHER GLOBAL: Direct socket listener registered as PRIMARY');

            // Add catch-all listener as BACKUP handler
            socket.onAny((eventName: string, ...args: any[]) => {
                if (eventName === 'documentUploadNotification') {
                    console.log('🎯🎯🎯 DISPATCHER GLOBAL: onAny caught documentUploadNotification!', args);
                    // Unwrap the data
                    let notificationData = args[0];
                    if (Array.isArray(args[0]) && args[0].length > 0) {
                        notificationData = args[0][0];
                        console.log('🎯 DISPATCHER GLOBAL: Unwrapped from array:', notificationData);
                    }
                    // Call handler
                    console.log('🎯 DISPATCHER GLOBAL: Calling handleDocumentUpload from onAny...');
                    handleDocumentUpload(notificationData);
                }
            });
            console.log('✅ DISPATCHER GLOBAL: Catch-all listener (onAny) registered as BACKUP');
        };

        // Start registration after connection attempt
        setTimeout(registerListener, 1000);

        // Re-register listener when socket reconnects
        const socket = socketService.getSocket();
        if (socket) {
            const handleReconnect = () => {
                console.log('🔄 DISPATCHER GLOBAL: Socket reconnected! Re-registering listener...');
                socketService.onDocumentUploadNotification(handleDocumentUpload);
                console.log('✅ DISPATCHER GLOBAL: Listener re-registered');


            };

            socket.on('connect', handleReconnect);

            // Cleanup
            return () => {
                socket.off('connect', handleReconnect);
                // Note: onAnyHandler is registered inside registerListener, cleanup happens there
                socketService.offDocumentUploadNotification(handleDocumentUpload);
                console.log('🔇 DISPATCHER GLOBAL: Stopped listening');
                socketService.offNewMessage(handleIncomingMessage);
            };
        } else {
            return () => {
                socketService.offDocumentUploadNotification(handleDocumentUpload);
                console.log('🔇 DISPATCHER GLOBAL: Stopped listening');
            };
        }
    }, []); // Empty deps - handler uses functional setState to avoid stale closures

    const handleIncomingMessage = (message: any) => {
        // Only notify for messages sent by drivers (not dispatchers or system)
        if (message.senderType && message.senderType !== 'driver') return;

        let driverId = message.driverId;
        if (typeof driverId === "object") {
            driverId = driverId?._id;
        }
        if (!driverId) return;

        // Use ref to avoid stale closure (effect registered once on mount)
        if (activeDriverIdRef.current !== driverId) {
            const driverName = message.senderName || message.driverName || "Driver";
            addUnread(driverId);
            setChatNotification({
                driverId,
                driverName,
                message: message.message || "New message received",
            });
        }
    };

    return (
        <div className="flex h-screen bg-[#eeeeee]">
            {/* Sidebar with independent scroll */}
            <div className="flex-shrink-0 h-screen overflow-hidden">
                <DispatchSidebar
                    isCollapsed={isSidebarCollapsed}
                />
            </div>

            {/* Main content area with independent scroll */}
            <div className="flex flex-col flex-1 h-full overflow-hidden">
                {/* Header - fixed at top */}
                <div className="flex-shrink-0">
                    <DispatchHeader
                        onToggleSidebar={toggleSidebar} />
                </div>

                {/* Main content with scroll */}
                <main className="flex-1 overflow-y-auto bg-main">
                    <Outlet />
                </main>
            </div>

            {/* Global Expiring Driver Documents Popup */}
            <ExpiringDriverDocumentsPopup
                isOpen={showDriverExpiringPopup}
                onClose={handleCloseDriverPopup}
                onViewDocuments={handleViewDriverDocuments}
                daysThreshold={30}
                showOnlyOnce={false}
            />

            {/* AI Chat Assistant */}
            <AIChatAssistant />

            {/* Global Document Upload Notification - Like expiring documents popup */}
            {showDocumentNotification && documentNotification && (
                <DocumentUploadNotification
                    notification={documentNotification}
                    onClose={() => {
                        console.log('❌ DISPATCHER: Closing notification...');
                        setShowDocumentNotification(false);
                        setDocumentNotification(null);
                    }}
                    userRole="dispatcher"
                />
            )}

            {/* WhatsApp-style Driver Message Popup */}
            <ChatMessagePopup navigate={navigate} />

        </div>
    );
};

export default Layout;