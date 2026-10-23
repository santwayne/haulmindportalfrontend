import { Routes, Route, Navigate } from "react-router-dom";
import { Suspense, lazy } from "react";
import ManifestLayout from "../../components/manifest/ManifestLayout";
import Loading from "../../components/common/Loading";

const Dashboard  = lazy(() => import("../../pages/admin/manifest/Dashboard/index"));
const Trucks     = lazy(() => import("../../pages/admin/manifest/Trucks/index"));
const Trailers   = lazy(() => import("../../pages/admin/manifest/Trailers/index"));
const Drivers    = lazy(() => import("../../pages/admin/manifest/Drivers/index"));

function ManifestRoutes() {
  const basePath = "/admin/manifest";
  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        <Route element={<ManifestLayout basePath={basePath} />}>
          <Route index element={<Navigate to={`${basePath}/dashboard`} replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="trucks"    element={<Trucks />} />
          <Route path="trailers"  element={<Trailers />} />
          <Route path="drivers"   element={<Drivers />} />
        </Route>
      </Routes>
    </Suspense>
  );
}

export default ManifestRoutes;
