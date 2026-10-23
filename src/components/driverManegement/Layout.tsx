import { useState } from "react";
import { Outlet } from "react-router-dom";
import Header from './Header'
import Sidebar from './Sidebar'
import ExpiringDocumentsToast from "../common/ExpiringDocumentsToast";
import { useExpiringDocuments } from "../../hooks/useExpiringDocuments";
import AIChatAssistant from "../ai/AIChatAssistant";

function Layout() {
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const {
        showExpiringToast,
        expiringDocuments,
        handleCloseToast,
        handleViewDocuments
    } = useExpiringDocuments();

    const toggleSidebar = () => {
        setIsSidebarCollapsed(!isSidebarCollapsed);
    };
    console.log("showExpiringToast", showExpiringToast)

    return (
        <div className="flex h-screen bg-main">
            {/* Sidebar with independent scroll */}
            <div className="flex-shrink-0 h-screen overflow-hidden">
                <Sidebar
                    isCollapsed={isSidebarCollapsed}
                />
            </div>

            {/* Main content area with independent scroll */}
            <div className="flex flex-col flex-1 h-full overflow-hidden">
                {/* Header - fixed at top */}
                <div className="flex-shrink-0">
                    <Header onToggleSidebar={toggleSidebar} />
                </div>

                <main className="flex-1 overflow-y-auto bg-main">
                    <Outlet />
                </main>
            </div>

            {/* Expiring Employee Documents Toast (HR Panel Only) */}
            <ExpiringDocumentsToast
                isOpen={showExpiringToast}
                onClose={handleCloseToast}
                onViewDocuments={handleViewDocuments}
                count={expiringDocuments.length}
            />
            
            {/* AI Chat Assistant */}
            <AIChatAssistant />
        </div>
    );
}

export default Layout