import { useState } from "react";
import { Outlet } from "react-router-dom";
import ManifestSidebar from "./ManifestSidebar";
import ManifestHeader from "./ManifestHeader";

interface ManifestLayoutProps {
  basePath?: string;
}

function ManifestLayout({ basePath = "/admin/manifest" }: ManifestLayoutProps) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  return (
    <div className="flex h-screen bg-main">
      <div className="flex-shrink-0 h-screen overflow-hidden">
        <ManifestSidebar isCollapsed={isSidebarCollapsed} basePath={basePath} />
      </div>

      <div className="flex flex-col flex-1 h-full overflow-hidden">
        <div className="flex-shrink-0">
          <ManifestHeader
            isSidebarCollapsed={isSidebarCollapsed}
            onToggleSidebar={() => setIsSidebarCollapsed((c) => !c)}
            basePath={basePath}
          />
        </div>

        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default ManifestLayout;
