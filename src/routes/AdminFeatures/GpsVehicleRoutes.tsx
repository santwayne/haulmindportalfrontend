import { Routes, Route, Navigate } from "react-router-dom";
import { Suspense, lazy } from "react";
import Layout from "../../components/gpsvehicle/Layout";
import Loading from "../../components/common/Loading";
const GpsDashboard = lazy(() => import("../../pages/admin/gpsvehicle/Dashboard"));
const Assets = lazy(() => import("../../pages/admin/gpsvehicle/assets/index"))
const TripHistory = lazy(() => import("../../pages/admin/gpsvehicle/productivity/TripHistory"))


const LiveTracking = lazy(() => import("../../pages/admin/gpsvehicle/livetracking/TruckTracker"))
const Vehicles = lazy(() => import("../../pages/admin/gpsvehicle/vehicles/index"))
const Drivers = lazy(() => import("../../pages/admin/gpsvehicle/drivers/index"))
const LiveTrackingTrailer = lazy(() => import("../../pages/admin/gpsvehicle/livetracking/TrailerTracker"))
const LiveTrackingTrip = lazy(() => import("../../pages/admin/gpsvehicle/livetracking/TripTracker"))



function GpsVehicleRoutes() {
  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<GpsDashboard />} />
          {/* <Route path="gpsvechile" element={<GpsDashboard />} /> */}

          <Route path="assets" element={<Assets />} />
          <Route path="vehicles" element={<Vehicles />} />
          <Route path="drivers" element={<Drivers />} />
          <Route path="livetracking" element={<Navigate to="livetracking/truck" replace />} />
          <Route path="livetracking/truck" element={<LiveTracking />} />

          <Route path="livetracking/trailer" element={<LiveTrackingTrailer />} />
          <Route path="livetracking/trip" element={<LiveTrackingTrip />} />
          <Route path="triphistory" element={<TripHistory />} />
        
        </Route>
      </Routes>
    </Suspense>
  )
}

export default GpsVehicleRoutes