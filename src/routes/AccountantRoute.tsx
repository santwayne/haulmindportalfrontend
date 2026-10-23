import { Routes, Route, Navigate } from "react-router-dom";
import { Suspense, lazy } from "react";
import React from "react";
import Loading from "../components/common/Loading";
import ErrorBoundary from "../components/common/ErrorBoundary";
import { getUserRole } from "../utils/auth";

const AccountsRoutes = lazy(() => import("./AdminFeatures/AccountsRoutes"));

// Debug wrapper to log route changes
const RouteDebugger = ({ children }: { children: React.ReactNode }) => {
  React.useEffect(() => {
    console.log('📍 Accountant route:', window.location.pathname);
  }, [window.location.pathname]);
  return <>{children}</>;
};

function AccountantRoute() {
  // Check if user is accountant
  const userRole = getUserRole();
  
  // If not accountant, redirect to login
  if (userRole !== 'accountant') {
    return <Navigate to="/" replace />;
  }

  return (
    <Suspense fallback={<Loading />}>
      <RouteDebugger>
        <Routes>
          {/* Accounts Routes - matches /accounts/* */}
          <Route 
            path="*" 
            element={
              <ErrorBoundary><AccountsRoutes /></ErrorBoundary>
            } 
          />
        </Routes>
      </RouteDebugger>
    </Suspense>
  );
}

export default AccountantRoute;

