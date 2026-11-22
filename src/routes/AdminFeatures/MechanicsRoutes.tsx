import { Routes, Route, Navigate } from "react-router-dom";
import { Suspense, lazy } from "react";
import MechanicsLayout from "../../components/mechanics/MechanicsLayout";
import Loading from "../../components/common/Loading";

const Dashboard = lazy(() => import("../../pages/admin/mechanics/Dashboard"));
const Orders = lazy(() => import("../../pages/admin/mechanics/Orders"));
const AssignTasks = lazy(() => import("../../pages/admin/mechanics/AssignTasks"));
const Parts = lazy(() => import("../../pages/admin/fleetMaintenance/sparePart/index"));
const Invoices = lazy(() => import("../../pages/admin/fleetMaintenance/invoices"));

interface MechanicsRoutesProps {
  basePath?: string; // "/mechanics" for mechanics user, "/admin/mechanics" for admin
}

function MechanicsRoutes({ basePath = "/admin/mechanics" }: MechanicsRoutesProps) {
  const dashboardPath = `${basePath}/dashboard`;
  const assignTasksPath = `${basePath}/assign-tasks`;
  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        <Route element={<MechanicsLayout basePath={basePath} />}>
          <Route index element={<Navigate to={dashboardPath} replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="assign-tasks" element={<AssignTasks />} />
          <Route path="completed-orders" element={<Orders defaultStatus="completed" />} />
          <Route path="parts" element={<Parts />} />
          <Route path="invoices" element={<Invoices />} />
          {/* Old links: Orders + Services were merged into Assign Tasks; Profile was removed */}
          <Route path="orders" element={<Navigate to={assignTasksPath} replace />} />
          <Route path="services" element={<Navigate to={assignTasksPath} replace />} />
          <Route path="profile" element={<Navigate to={dashboardPath} replace />} />
        </Route>
      </Routes>
    </Suspense>
  );
}

export default MechanicsRoutes;
