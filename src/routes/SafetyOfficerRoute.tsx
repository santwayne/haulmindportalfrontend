import { Routes, Route, Navigate } from "react-router-dom";
import { Suspense, lazy } from "react";
import React from "react";
import Loading from "../components/common/Loading";
import ErrorBoundary from "../components/common/ErrorBoundary";
import { getUserRole } from "../utils/auth";

const HealthSafetyRoutes = lazy(() => import("./AdminFeatures/HealthSafetyRoutes"));

// Debug wrapper to log route changes
const RouteDebugger = ({ children }: { children: React.ReactNode }) => {
  React.useEffect(() => {
    console.log('📍 Safety Officer Route:', window.location.pathname);
  }, [window.location.pathname]);
  return <>{children}</>;
};

function SafetyOfficerRoute() {
  const userRole = getUserRole();

  // If not safety officer, redirect to login
  if (userRole !== 'safety officer') {
    return <Navigate to="/" replace />;
  }

  return (
    <Suspense fallback={<Loading />}>
      <RouteDebugger>
        <Routes>
          {/* Health and Safety Routes - matches /admin/healthandsafety/* */}
          <Route
            path="*"
            element={<ErrorBoundary><HealthSafetyRoutes /></ErrorBoundary>}
          />
        </Routes>
      </RouteDebugger>
    </Suspense>
  );
}

export default SafetyOfficerRoute;

