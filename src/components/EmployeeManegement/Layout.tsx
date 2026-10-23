import { useState } from "react";
import { Outlet } from "react-router-dom";
import Header from './Header'
import Sidebar from './Sidebar'
import ExpiringDocumentsPopup from "../common/ExpiringDocumentsPopup";
import { useExpiringDocuments } from "../../hooks/useExpiringDocuments";
import AIChatAssistant from "../ai/AIChatAssistant";

function Layout() {
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const { showExpiringToast, handleCloseToast, handleViewDocuments } = useExpiringDocuments();

    const toggleSidebar = () => {
        setIsSidebarCollapsed(!isSidebarCollapsed);
    };

    return (
        <div className="flex h-screen bg-[#eeeeee]">
            {/* Sidebar with independent scroll */}
            <div className="flex-shrink-0 h-screen overflow-hidden">
                <Sidebar
                    isCollapsed={isSidebarCollapsed}
                    onToggle={toggleSidebar}
                />
            </div>

            {/* Main content area with independent scroll */}
            <div className="flex flex-col flex-1 h-full overflow-hidden">
                {/* Header - fixed at top */}
                <div className="flex-shrink-0 pl-5">
                    <Header onToggleSidebar={toggleSidebar} />
                </div>

                {/* Main content with scroll */}
                <main className="flex-1 overflow-y-auto pl-5 p-4 pb-20">
                    <Outlet />
                </main>
            </div>

            {/* Global Expiring Documents Popup */}
            <ExpiringDocumentsPopup
                isOpen={showExpiringToast}
                onClose={handleCloseToast}
                onViewDocuments={handleViewDocuments}
                daysThreshold={30}
                showOnlyOnce={false}
            />
            
            {/* AI Chat Assistant */}
            <AIChatAssistant />
        </div>
    );
}

export default Layout