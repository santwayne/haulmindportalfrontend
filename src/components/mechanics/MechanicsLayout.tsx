import { useState } from "react";
import { Outlet } from "react-router-dom";
import MechanicsSidebar from "./MechanicsSidebar";
import MechanicsHeader from "./MechanicsHeader";

interface MechanicsLayoutProps {
  basePath?: string;
}

function MechanicsLayout({ basePath = "/admin/mechanics" }: MechanicsLayoutProps) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  return (
    <div className="flex h-screen bg-[#eeeeee]">
      <div className="flex-shrink-0 h-screen overflow-hidden">
        <MechanicsSidebar isCollapsed={isSidebarCollapsed} basePath={basePath} />
      </div>

      <div className="flex flex-col flex-1 h-full overflow-hidden">
        <div className="flex-shrink-0 fleet-header-container">
          <MechanicsHeader isSidebarCollapsed={isSidebarCollapsed} onToggleSidebar={toggleSidebar} basePath={basePath} />
        </div>

        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default MechanicsLayout;

