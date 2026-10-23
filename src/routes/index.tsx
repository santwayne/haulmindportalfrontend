import { Routes, Route } from "react-router-dom";
import { Suspense, lazy } from "react";
import PublicRoute from "../components/auth/PublicRoute";
import Loading from "../components/common/Loading";
import { useInactivityTimer } from "../hooks/useInactivityTimer";

// All role route bundles are lazy — only the bundle for the logged-in role is ever downloaded
const SuperAdminRoute = lazy(() => import("./SuperAdminRoute"));
const AdminRoute = lazy(() => import("./AdminRoute"));
const DispatcherRoute = lazy(() => import("./DispatcherRoute"));
const HRRoute = lazy(() => import("./HRRoute"));
const AccountantRoute = lazy(() => import("./AccountantRoute"));
const FleetMaintenanceRoute = lazy(() => import("./FleetMaintenanceRoute"));
const ComplianceRoute = lazy(() => import("./ComplianceRoute"));
const SafetyOfficerRoute = lazy(() => import("./SafetyOfficerRoute"));
const MechanicsRoute = lazy(() => import("./MechanicsRoute"));
const GpsDashboardRoute = lazy(() => import("./GpsDashboardRoute"));
const InvoicePayment = lazy(() => import("../pages/customer/InvoicePayment"));

const Login = lazy(() => import("../pages/admin/auth/Login"));
const Register = lazy(() => import("../pages/admin/auth/Register"));
const ForgotPassword = lazy(() => import("../pages/admin/auth/ForgotPassword"));
const ResetPassword = lazy(() => import("../pages/admin/auth/ResetPassword"));
const AcceptInvite = lazy(() => import("../pages/admin/auth/AcceptInvite"));

const AppRoutes = () => {
  // Initialize inactivity timer for automatic logout after 1 hour of inactivity
  // This hook must be called inside Router context (which AppRoutes is)
  useInactivityTimer();

  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        {/* Root route - show login page */}
        <Route
          path="/"
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          }
        />

        {/* Public registration route */}
        <Route
          path="/register"
          element={
            <PublicRoute>
              <Register />
            </PublicRoute>
          }
        />

        <Route path='/superadmin/*' element={<SuperAdminRoute />} />
        <Route path='/admin/*' element={<AdminRoute />} />

        {/* Dispatcher routes (without /admin prefix) */}
        <Route path='/dispatch/*' element={<DispatcherRoute />} />
        <Route path='/gpsvehicle/*' element={<DispatcherRoute />} />

        {/* HR routes (without /admin prefix) */}
        <Route path='/Management/*' element={<HRRoute />} />

        {/* Accountant routes (without /admin prefix) */}
        <Route path='/accounts/*' element={<AccountantRoute />} />

        {/* Fleet Maintenance Manager routes (without /admin prefix) */}
        <Route path='/fleetmaintenance/*' element={<FleetMaintenanceRoute />} />

        {/* Compliance Manager routes (without /admin prefix) */}
        <Route path='/compliance/*' element={<ComplianceRoute />} />

        {/* Safety Officer routes (without /admin prefix) */}
        <Route path='/healthandsafety/*' element={<SafetyOfficerRoute />} />

        {/* Mechanics routes (without /admin prefix) - for Maintenance Crew (Mechanics) role */}
        <Route path='/mechanics/*' element={<MechanicsRoute />} />

        {/* Shared read-only GPS dashboard (Drivers & Employees) — available to every department */}
        <Route path='/gps-dashboard/*' element={<GpsDashboardRoute />} />

        {/* Password reset routes (public — no auth required) */}
        <Route
          path="/forgot-password"
          element={
            <PublicRoute>
              <ForgotPassword />
            </PublicRoute>
          }
        />
        <Route path="/reset-password/:token" element={<ResetPassword />} />
        <Route path="/accept-invite/:token" element={<AcceptInvite />} />

        {/* Public customer routes */}
        <Route path='/invoice/:invoiceId' element={<InvoicePayment />} />
      </Routes>
    </Suspense>
  );
};

export default AppRoutes;
