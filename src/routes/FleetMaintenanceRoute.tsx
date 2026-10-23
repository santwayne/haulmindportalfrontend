import { Routes, Route, Navigate } from "react-router-dom";
import { Suspense, lazy } from "react";
import React from "react";
import Loading from "../components/common/Loading";
import ErrorBoundary from "../components/common/ErrorBoundary";
import { getUserRole } from "../utils/auth";

const FleetMaintainRoutes = lazy(() => import("./AdminFeatures/FleetMaintainRoutes"));

// Debug wrapper to log route changes
const RouteDebugger = ({ children }: { children: React.ReactNode }) => {
  React.useEffect(() => {
    console.log('📍 Fleet Maintenance route:', window.location.pathname);
  }, [window.location.pathname]);
  return <>{children}</>;
};

function FleetMaintenanceRoute() {
  // Check if user is Fleet Maintenance Manager
  const userRole = getUserRole();
  
  // If not Fleet Maintenance Manager, redirect to login
  if (userRole !== 'Fleet Maintenance Manager') {
    return <Navigate to="/" replace />;
  }

  return (
    <Suspense fallback={<Loading />}>
      <RouteDebugger>
        <Routes>
          {/* Fleet Maintenance Routes - matches /fleetmaintenance/* */}
          <Route 
            path="*" 
            element={<ErrorBoundary><FleetMaintainRoutes /></ErrorBoundary>} 
          />
        </Routes>
      </RouteDebugger>
    </Suspense>
  );
}

export default FleetMaintenanceRoute;

