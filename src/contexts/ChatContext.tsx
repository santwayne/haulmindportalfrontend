// ChatContext.tsx
import { createContext, useContext, useState, useEffect, useMemo, useCallback } from "react";

export interface ChatNotification {
    driverId: string;
    driverName: string;
    message: string;
}

const ChatContext = createContext<any>(null);

export const ChatProvider = ({ children }: any) => {
    const [activeDriverId, setActiveDriverId] = useState<string | null>(null);
    const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
    const [chatNotification, setChatNotification] = useState<ChatNotification | null>(null);

    const totalUnread = useMemo(
        () => Object.values(unreadCounts).reduce((sum, n) => sum + n, 0),
        [unreadCounts]
    );

    // Auto-clear unread when a driver becomes active
    useEffect(() => {
        if (activeDriverId) {
            setUnreadCounts(prev => {
                const next = { ...prev };
                delete next[activeDriverId];
                return next;
            });
        }
    }, [activeDriverId]);

    const addUnread = useCallback((driverId: string) => {
        setUnreadCounts(prev => ({ ...prev, [driverId]: (prev[driverId] || 0) + 1 }));
    }, []);

    const clearUnread = useCallback((driverId: string) => {
        setUnreadCounts(prev => {
            const next = { ...prev };
            delete next[driverId];
            return next;
        });
    }, []);

    const setInitialUnreadCounts = useCallback((counts: Record<string, number>) => {
        setUnreadCounts(counts);
    }, []);

    const clearChatNotification = useCallback(() => setChatNotification(null), []);

    const contextValue = useMemo(() => ({
        activeDriverId, setActiveDriverId,
        unreadCounts, totalUnread, addUnread, clearUnread, setInitialUnreadCounts,
        chatNotification, setChatNotification, clearChatNotification
    }), [activeDriverId, unreadCounts, totalUnread, addUnread, clearUnread, setInitialUnreadCounts, chatNotification, clearChatNotification]);

    return (
        <ChatContext.Provider value={contextValue}>
            {children}
        </ChatContext.Provider>
    );
};

export const useChat = () => useContext(ChatContext);
