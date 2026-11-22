import { Navigate, Route, Routes } from "react-router-dom";
import { Suspense, lazy } from "react";
import Loading from "../components/common/Loading";
import { isAuthenticated, isTokenValid, getUserRole } from "../utils/auth";

const GpsDashboard = lazy(() => import("../pages/gpsDashboard"));
const TruckTracker = lazy(() => import("../pages/admin/gpsvehicle/livetracking/TruckTracker"));
const TrailerTracker = lazy(() => import("../pages/admin/gpsvehicle/livetracking/TrailerTracker"));
const TripTracker = lazy(() => import("../pages/admin/gpsvehicle/livetracking/TripTracker"));
const PeopleDirectory = lazy(() => import("../pages/gpsDashboard/PeopleDirectory"));

// Shared read-only GPS dashboard (live truck / trailer / trip tracking + drivers & staff)
// available to every authenticated staff role except drivers themselves, who have their
// own mobile app.
function GpsDashboardRoute() {
  const role = getUserRole();

  if (!isAuthenticated() || !isTokenValid() || !role || role === 'driver') {
    return <Navigate to="/" replace />;
  }

  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        <Route element={<GpsDashboard />}>
          <Route index element={<Navigate to="/gps-dashboard/truck" replace />} />
          <Route path="truck" element={<TruckTracker />} />
          <Route path="trailer" element={<TrailerTracker />} />
          <Route path="trip" element={<TripTracker />} />
          <Route path="people" element={<PeopleDirectory />} />
          <Route path="*" element={<Navigate to="/gps-dashboard/truck" replace />} />
        </Route>
      </Routes>
    </Suspense>
  );
}

export default GpsDashboardRoute;
