import { Routes, Route, Navigate} from "react-router-dom";
import { Suspense, lazy } from "react";
import React from "react";
import Loading from "../components/common/Loading";
import ErrorBoundary from "../components/common/ErrorBoundary";
import { canAccessPortal } from "../utils/portalAccess";

const HRManagementRoutes = lazy(() => import("./AdminFeatures/HRManagementRoutes"));

// Debug wrapper to log route changes
const RouteDebugger = ({ children }: { children: React.ReactNode }) => {
  React.useEffect(() => {
    console.log('📍 HR route:', window.location.pathname);
  }, [window.location.pathname]);
  return <>{children}</>;
};

function HRRoute() {
  // Check if user is HR
  
  // If not HR, redirect to login
  if (!canAccessPortal('human_resource')) {
    return <Navigate to="/" replace />;
  }

  // HR only has access to Management portal (Human Resource Portal)
  // Accounts portal is now only for accountant role
  return (
    <Suspense fallback={<Loading />}>
      <RouteDebugger>
        <Routes>
          {/* Management Routes - matches /Management/* */}
          <Route 
            path="*" 
            element={
              <ErrorBoundary><HRManagementRoutes /></ErrorBoundary>
            } 
          />
        </Routes>
      </RouteDebugger>
    </Suspense>
  );
}

export default HRRoute;

