import { Routes, Route, Navigate } from "react-router-dom";
import { Suspense, lazy } from "react";
import Loading from "../components/common/Loading";
import ErrorBoundary from "../components/common/ErrorBoundary";
import { canAccessPortal } from "../utils/portalAccess";

const MechanicsRoutes = lazy(() => import("./AdminFeatures/MechanicsRoutes"));

function MechanicsRoute() {

  // Only mechanics can access /mechanics/* routes
  if (!canAccessPortal('mechanic')) {
    return <Navigate to="/" replace />;
  }

  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        <Route path="*" element={<ErrorBoundary><MechanicsRoutes basePath="/mechanics" /></ErrorBoundary>} />
      </Routes>
    </Suspense>
  );
}

export default MechanicsRoute;

