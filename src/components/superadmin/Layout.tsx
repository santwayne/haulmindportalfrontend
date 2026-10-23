// src/components/superadmin/Layout.tsx
import { useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import Header from "./Header";
import AIChatAssistant from "../ai/AIChatAssistant";

const Layout = () => {
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

    const toggleSidebar = () => {
        setIsSidebarCollapsed(!isSidebarCollapsed);
    };

    return (
        <div className="flex h-screen bg-main overflow-hidden">
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
                    <Header />
                </div>
                
                {/* Main content with scroll */}
                <main className="flex-1 overflow-y-auto pl-5 p-4 pb-20">
                    <Outlet />
                </main>
            </div>
            
            {/* Footer fixed at bottom */}
            <footer className="text-center py-3 text-xs fixed bottom-0 left-0 w-full z-50 border-t"
                style={{ backgroundColor: 'var(--bg-card)', borderColor: 'rgba(17,131,224,0.12)', color: 'var(--text-secondary)' }}>
                © {new Date().getFullYear()} Logistiq Innovation Platform. All rights reserved.
            </footer>
            
            {/* AI Chat Assistant */}
            <AIChatAssistant />
        </div>
    );
};

export default Layout;

