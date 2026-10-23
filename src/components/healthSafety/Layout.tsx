import { useState } from "react";
import { Outlet } from "react-router-dom";
import HealthSafetySidebar from "./Sidebar";
import HealthSafetyHeader from "./Header";
import AIChatAssistant from "../ai/AIChatAssistant";

const Layout = () => {
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

    const toggleSidebar = () => {
        setIsSidebarCollapsed(!isSidebarCollapsed);
    };

    return (
        <div className="flex h-screen bg-[#eeeeee]">
            {/* Sidebar with independent scroll */}
            <div className="flex-shrink-0 h-screen overflow-hidden">
                <HealthSafetySidebar
                    isCollapsed={isSidebarCollapsed}
                />
            </div>

            {/* Main content area with independent scroll */}
            <div className="flex flex-col flex-1 h-full overflow-hidden">
                {/* Header - fixed at top */}
                <div className="flex-shrink-0">
                    <HealthSafetyHeader onToggleSidebar={toggleSidebar} />
                </div>

                {/* Main content with scroll */}
                <main className="flex-1 overflow-y-auto">
                    <Outlet />
                </main>
            </div>
            
            {/* AI Chat Assistant */}
            <AIChatAssistant />
        </div>
    );
};

export default Layout;

