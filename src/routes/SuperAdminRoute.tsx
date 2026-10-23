import { Routes, Route } from "react-router-dom";
import { Suspense, lazy } from "react";
import App from "../components/superadmin/Layout";
import Loading from "../components/common/Loading";
import SuperAdminProtectedRoute from "../components/auth/SuperAdminProtectedRoute";
import SuperAdminPublicRoute from "../components/auth/SuperAdminPublicRoute";

const Login = lazy(() => import("../pages/superadmin/auth/Login"))
const ForgotPassword = lazy(() => import("../pages/superadmin/auth/ForgotPassword"))

const Dashboard = lazy(() => import("../pages/superadmin/dashboard/index"));
const Viewalladmins = lazy(() => import("../pages/superadmin/adminAccount/ViewAllAccounts"))
const Billing = lazy(() => import("../pages/superadmin/billing/index"))
const SystemSetting = lazy(() => import("../pages/superadmin/setting/index"))
const Revenue = lazy(() => import("../pages/superadmin/revenue/index"))
const Invoices = lazy(() => import("../pages/superadmin/invoices/index"))


function SuperAdminRoute() {
    return (
        <Suspense fallback={
            <Loading />
        }>


            <Routes>
                {/* Public Routes */}
                <Route
                    path="login"
                    element={
                        <SuperAdminPublicRoute>
                            <Login />
                        </SuperAdminPublicRoute>
                    }
                />
                <Route path="forgot-password" element={<ForgotPassword />} />
                
                {/* Protected Routes - SuperAdmin Dashboard */}
                <Route 
                    element={
                        <SuperAdminProtectedRoute>
                            <App />
                        </SuperAdminProtectedRoute>
                    }
                >
                    <Route path="dashboard" element={<Dashboard />} />
                    <Route path="viewalladmins" element={<Viewalladmins />} />
                    <Route path="revenue" element={<Revenue />} />
                    <Route path="billing" element={<Billing />} />
                    <Route path="invoices" element={<Invoices />} />
                    <Route path="systemsetting" element={<SystemSetting />} />
                    {/* Redirect root to dashboard */}
                    <Route index element={<Dashboard />} />
                </Route>
            </Routes>
        </Suspense>
    )
}

export default SuperAdminRoute;