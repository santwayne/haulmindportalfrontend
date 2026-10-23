import { Routes, Route, Navigate } from "react-router-dom";
import { Suspense, lazy } from "react";
import MechanicsLayout from "../../components/mechanics/MechanicsLayout";
import Loading from "../../components/common/Loading";

const Dashboard = lazy(() => import("../../pages/admin/mechanics/Dashboard"));
const Orders = lazy(() => import("../../pages/admin/mechanics/Orders"));
const Services = lazy(() => import("../../pages/admin/mechanics/Services"));
const Profile = lazy(() => import("../../pages/admin/mechanics/Profile"));

interface MechanicsRoutesProps {
  basePath?: string; // "/mechanics" for mechanics user, "/admin/mechanics" for admin
}

function MechanicsRoutes({ basePath = "/admin/mechanics" }: MechanicsRoutesProps) {
  const dashboardPath = `${basePath}/dashboard`;
  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        <Route element={<MechanicsLayout basePath={basePath} />}>
          <Route index element={<Navigate to={dashboardPath} replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="orders" element={<Orders />} />
          <Route path="completed-orders" element={<Orders defaultStatus="completed" />} />
          <Route path="services" element={<Services />} />
          <Route path="profile" element={<Profile />} />
        </Route>
      </Routes>
    </Suspense>
  );
}

export default MechanicsRoutes;

