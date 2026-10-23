import { Navigate, Route, Routes } from "react-router-dom";
import { Suspense, lazy } from "react";
import Loading from "../components/common/Loading";
import { isAuthenticated, isTokenValid, getUserRole } from "../utils/auth";

const GpsDashboard = lazy(() => import("../pages/gpsDashboard"));

// Shared read-only GPS dashboard (Drivers & Employees) available to every
// authenticated staff role except drivers themselves, who have their own mobile app.
function GpsDashboardRoute() {
  const role = getUserRole();

  if (!isAuthenticated() || !isTokenValid() || !role || role === 'driver') {
    return <Navigate to="/" replace />;
  }

  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        <Route index element={<GpsDashboard />} />
      </Routes>
    </Suspense>
  );
}

export default GpsDashboardRoute;
