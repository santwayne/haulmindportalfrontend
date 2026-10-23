import { useState } from "react";
import { Outlet } from "react-router-dom";
import GpsHeader from "./Header";
import GpsSidebar from "./Sidebar";
import ExpiringDocumentsPopup from "../common/ExpiringDocumentsPopup";
import { useExpiringDocuments } from "../../hooks/useExpiringDocuments";
import AIChatAssistant from "../ai/AIChatAssistant";

const Layout = () => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const {
    showExpiringToast,
    handleCloseToast,
    handleViewDocuments,
  } = useExpiringDocuments();

  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  return (
    <div className="flex h-screen bg-[#eeeeee]">
      {/* Sidebar with independent scroll */}
      <div className="flex-shrink-0 h-screen overflow-hidden">
        <GpsSidebar
          isCollapsed={isSidebarCollapsed}
        />
      </div>

      {/* Main content area with independent scroll */}
      <div className="flex flex-col flex-1 h-full overflow-hidden">
        {/* Header - fixed at top */}
        <div className="flex-shrink-0">
          <GpsHeader
            onToggleSidebar={toggleSidebar}
          />
        </div>

        {/* Main content with scroll */}
        <main className="flex-1 overflow-y-auto bg-main">
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
};

export default Layout;
