import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { Suspense, lazy } from "react";
import React from "react";
import Loading from "../components/common/Loading";
import ErrorBoundary from "../components/common/ErrorBoundary";
import { getUserRole } from "../utils/auth";

const DispatchRoutes = lazy(() => import("./AdminFeatures/DispatchRoutes"));
const GpsVehicleRoutes = lazy(() => import("./AdminFeatures/GpsVehicleRoutes"));

// Debug wrapper to log route changes
const RouteDebugger = ({ children }: { children: React.ReactNode }) => {
  React.useEffect(() => {
    console.log('📍 Dispatcher route:', window.location.pathname);
  }, [window.location.pathname]);
  return <>{children}</>;
};

function DispatcherRoute() {
  const location = useLocation();
  // Check if user is dispatcher
  const userRole = getUserRole();
  
  // If not dispatcher, redirect to login
  if (userRole !== 'dispatcher') {
    return <Navigate to="/" replace />;
  }

  // Determine which route component to render based on pathname
  const isGpsVehicleRoute = location.pathname.startsWith('/gpsvehicle');

  return (
    <Suspense fallback={<Loading />}>
      <RouteDebugger>
        <Routes>
          {/* Dispatch Routes - matches /dispatch/* */}
          <Route 
            path="*" 
            element={
              isGpsVehicleRoute ? (
                <ErrorBoundary><GpsVehicleRoutes /></ErrorBoundary>
              ) : (
                <ErrorBoundary><DispatchRoutes /></ErrorBoundary>
              )
            } 
          />
        </Routes>
      </RouteDebugger>
    </Suspense>
  );
}

export default DispatcherRoute;

