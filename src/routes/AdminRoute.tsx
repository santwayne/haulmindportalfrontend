import { Routes, Route, Navigate } from "react-router-dom";
import { Suspense, lazy } from "react";
import Layout from "../components/admin/Layout";
import Loading from "../components/common/Loading";
import ErrorBoundary from "../components/common/ErrorBoundary";
import { getUserRole } from "../utils/auth";

const Dashboard = lazy(() => import("../pages/admin/dashboard/index"));
const Profile = lazy(() => import("../pages/admin/dashboard/Profile/index"));
const QuickStats = lazy(() => import("../pages/admin/dashboard/quckstats/QuickStats"))
const Slots = lazy(() => import("../pages/admin/dashboard/slot/index"));
const Member = lazy(() => import("../pages/admin/dashboard/member/index"));
const Invoice = lazy(() => import("../pages/admin/dashboard/invoice/index"));
const TruckProfile = lazy(() => import("../pages/admin/fleetMaintenance/truckProfile/index"));
const Driver = lazy(() => import("../pages/admin/driverManagement/driverslist/index"))
const Customers = lazy(() => import("../pages/admin/driverManagement/customers/index"))

const Integrations = lazy(() => import("../pages/admin/dashboard/setting/Api"))
const Employees = lazy(() => import("../pages/admin/driverManagement/employees/index"));
const CompanyManage = lazy(() => import("../pages/admin/dashboard/setting/Company"))
const CompanyDocuments = lazy(() => import("../pages/admin/dashboard/documents/index"));

const DispatchRoutes = lazy(() => import("./AdminFeatures/DispatchRoutes"));
const GpsVehicleRoutes = lazy(() => import("./AdminFeatures/GpsVehicleRoutes"))
const DriverManagement = lazy(() => import("./AdminFeatures/HRManagementRoutes"))
const ComplianceRoute = lazy(() => import('./AdminFeatures/CompilanceRoute'))
const FleetMaintainRoute = lazy(() => import("./AdminFeatures/FleetMaintainRoutes"))
const MechanicsRoutes = lazy(() => import("./AdminFeatures/MechanicsRoutes"))
const AccountsRoute = lazy(() => import("./AdminFeatures/AccountsRoutes"))
const HealthSafetyRoutes = lazy(() => import("./AdminFeatures/HealthSafetyRoutes"))
const Subscription = lazy(() => import("../pages/admin/subscription/index"))
const AdminHRTrainingView = lazy(() => import("../pages/admin/training/hrTraining/AdminHRTrainingView"))
const ManifestRoutes = lazy(() => import("./AdminFeatures/ManifestRoutes"))

function AdminRoute() {
  const userRole = getUserRole();

  // If Maintenance Crew (Mechanics) tries to access admin routes, redirect to /mechanics (no admin prefix)
  if (userRole === 'Maintenance Crew (Mechanics)') {
    return <Navigate to="/mechanics/orders" replace />;
  }

  // If dispatcher tries to access admin routes, redirect to dispatcher routes
  if (userRole === 'dispatcher') {
    return <Navigate to="/dispatch" replace />;
  }
  
  // If HR tries to access admin routes, redirect to Management routes
  if (userRole === 'hr') {
    return <Navigate to="/Management" replace />;
  }
  
  // If Fleet Maintenance Manager tries to access admin routes, redirect to fleetmaintenance routes
  if (userRole === 'Fleet Maintenance Manager') {
    return <Navigate to="/fleetmaintenance" replace />;
  }
  
  // If Compliance Manager tries to access admin routes, redirect to compliance routes
  if (userRole === 'Compliance Manager') {
    return <Navigate to="/compliance" replace />;
  }
  
  // If safety officer tries to access admin routes, redirect to healthandsafety routes (without /admin prefix)
  if (userRole === 'safety officer') {
    return <Navigate to="/healthandsafety" replace />;
  }
  
  // If accountant tries to access admin routes, redirect to accounts routes (without /admin prefix)
  if (userRole === 'accountant') {
    return <Navigate to="/accounts" replace />;
  }

  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        {/* Redirect /admin/login to root login page */}
        <Route 
          path="login" 
          element={<Navigate to="/" replace />} 
        />
        {/* Redirect /admin/register to root register page */}
        <Route 
          path="register" 
          element={<Navigate to="/register" replace />} 
        />
        
        {/* Protected Routes - Main Admin Layout Routes */}
        <Route 
          element={<Layout />}
        >
          <Route index element={<ErrorBoundary><Dashboard /></ErrorBoundary>} />
          <Route path="dashboard" element={<ErrorBoundary><Dashboard /></ErrorBoundary>} />
          <Route path="profile" element={<ErrorBoundary><Profile /></ErrorBoundary>} />
          <Route path="quick-stats" element={<ErrorBoundary><QuickStats /></ErrorBoundary>} />
          <Route path="member" element={<ErrorBoundary><Member /></ErrorBoundary>} />
          <Route path="slots" element={<ErrorBoundary><Slots /></ErrorBoundary>} />
          <Route path="invoice" element={<ErrorBoundary><Invoice /></ErrorBoundary>} />
          <Route path="truck-profile" element={<ErrorBoundary><TruckProfile /></ErrorBoundary>} />

          <Route path="employees" element={<ErrorBoundary><Employees /></ErrorBoundary>} />
          <Route path="customers" element={<ErrorBoundary><Customers /></ErrorBoundary>} />
          <Route path="company" element={<ErrorBoundary><CompanyManage /></ErrorBoundary>} />
          <Route path="drivers" element={<ErrorBoundary><Driver /></ErrorBoundary>} />
          <Route path="integrations" element={<ErrorBoundary><Integrations /></ErrorBoundary>} />
          <Route path="company-documents" element={<ErrorBoundary><CompanyDocuments /></ErrorBoundary>} />
          <Route path="subscription" element={<ErrorBoundary><Subscription /></ErrorBoundary>} />
          <Route path="hr-training-content" element={<ErrorBoundary><AdminHRTrainingView /></ErrorBoundary>} />
        </Route>
        
        {/* Protected Feature Routes */}
        <Route 
          path="dispatch/*" 
          element={<DispatchRoutes />} 
        />
        <Route 
          path="gpsvehicle/*" 
          element={<GpsVehicleRoutes />} 
        />
        <Route 
          path="Management/*" 
          element={<DriverManagement />} 
        />
        <Route 
          path="compliance/*" 
          element={<ComplianceRoute />} 
        />
        <Route 
          path="accounts/*" 
          element={<AccountsRoute />} 
        />
        <Route 
          path="fleetmaintenance/*" 
          element={<FleetMaintainRoute />} 
        />
        <Route 
          path="mechanics/*" 
          element={<MechanicsRoutes />} 
        />
        <Route
          path="healthandsafety/*"
          element={<HealthSafetyRoutes />}
        />
        <Route
          path="manifest/*"
          element={<ManifestRoutes />}
        />
      </Routes>
    </Suspense>
  );
}

export default AdminRoute;
