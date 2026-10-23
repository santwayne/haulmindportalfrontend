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
        <div className="flex h-screen bg-main text-primary">

            {/* Sidebar */}
            <div className="flex-shrink-0 h-screen overflow-hidden">
                <Sidebar
                    isCollapsed={isSidebarCollapsed}
                    onToggle={toggleSidebar}
                />
            </div>

            {/* Main content */}
            <div className="flex flex-col flex-1 h-full overflow-hidden">

                {/* Header */}
                <div className="flex-shrink-0">
                    <Header onToggleSidebar={toggleSidebar} />
                </div>

                {/* Content */}
                <main className="flex-1 overflow-y-auto bg-main">
                    <Outlet />
                </main>

            </div>

            {/* Global Popup */}
            <ExpiringDocumentsPopup
                isOpen={showExpiringToast}
                onClose={handleCloseToast}
                onViewDocuments={handleViewDocuments}
                daysThreshold={30}
                showOnlyOnce={false}
            />

            {/* AI Assistant */}
            <AIChatAssistant />

        </div>
    );
}

export default Layout