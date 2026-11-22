import { Routes, Route, Navigate } from "react-router-dom";
import { Suspense, lazy } from "react";
import React from "react";
import Loading from "../components/common/Loading";
import ErrorBoundary from "../components/common/ErrorBoundary";
import { canAccessPortal } from "../utils/portalAccess";

const CompilanceRoutes = lazy(() => import("./AdminFeatures/CompilanceRoute"));

// Debug wrapper to log route changes
const RouteDebugger = ({ children }: { children: React.ReactNode }) => {
  React.useEffect(() => {
    console.log('📍 Compliance route:', window.location.pathname);
  }, [window.location.pathname]);
  return <>{children}</>;
};

function ComplianceRoute() {
  // Check if user is Compliance Manager
  
  // If not Compliance Manager, redirect to login
  if (!canAccessPortal('compliance')) {
    return <Navigate to="/" replace />;
  }

  return (
    <Suspense fallback={<Loading />}>
      <RouteDebugger>
        <Routes>
          {/* Compliance Routes - matches /compliance/* */}
          <Route 
            path="*" 
            element={<ErrorBoundary><CompilanceRoutes /></ErrorBoundary>} 
          />
        </Routes>
      </RouteDebugger>
    </Suspense>
  );
}

export default ComplianceRoute;

