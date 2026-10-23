import { Routes, Route } from "react-router-dom";
import { Suspense, lazy } from "react";
import Layout from "../../components/accounts/Layout";
import Loading from "../../components/common/Loading";

// Existing
const Dashboard = lazy(() => import("../../pages/admin/accounts/index"));
const Invoices = lazy(() => import("../../pages/admin/accounts/invoice/index"));
const Expenses = lazy(() => import("../../pages/admin/accounts/expenses/index"));
const Payroll = lazy(() => import("../../pages/admin/accounts/payroll/index"));
const MonthlySalaryReport = lazy(() => import("../../pages/admin/accounts/payroll/MonthlySalaryReport"));
const DriverPayroll = lazy(() => import("../../pages/admin/accounts/driverpayroll/index"));
const Paystubs = lazy(() => import("../../pages/admin/accounts/paystubs/index"));

// New Pages
const AccountingConfig = lazy(() => import("../../pages/admin/accounts/config/index"));
const Settlements = lazy(() => import("../../pages/admin/accounts/settlements/index"));
const FleetMaintenance = lazy(() => import("../../pages/admin/accounts/fleet-maintenance/index"));
const ReceiptsNotes = lazy(() => import("../../pages/admin/accounts/receipts-notes/index"));
const TaxSetup = lazy(() => import("../../pages/admin/accounts/tax-setup/index"));
const CashFlowInsights = lazy(() => import("../../pages/admin/accounts/cash-flow-insights/index"));
const Profile = lazy(() => import("../../pages/admin/dashboard/Profile/index"));
const FinanceReport = lazy(() => import("../../pages/admin/accounts/finance-report/index"));
const TrainingContent = lazy(() => import("../../pages/admin/training/TrainingContentView"));
const FuelReports = lazy(() => import("../../pages/admin/dispatch/resources/fuel-reports/index"));

function AccountsRoutes() {
    return (
        <Suspense fallback={<Loading />}>
            <Routes>
                <Route element={<Layout />}>

                    {/* Default Dashboard */}
                    <Route index element={<Dashboard />} />

                    {/* Existing Routes */}
                    <Route path="/invoice" element={<Invoices />} />
                    <Route path="/expenses" element={<Expenses />} />
                    <Route path="/payroll" element={<Payroll />} />
                    <Route path="/payroll/monthly-report" element={<MonthlySalaryReport />} />
                    <Route path="/driverpayroll" element={<DriverPayroll />} />
                    <Route path="/gross-pay" element={<Paystubs />} />

                    {/* New Routes */}
                    <Route path="/config" element={<AccountingConfig />} />
                    <Route path="/settlements" element={<Settlements />} />
                    <Route path="/fleet-maintenance" element={<FleetMaintenance />} />
                    <Route path="/tax-setup" element={<TaxSetup />} />
                    <Route path="/receipts-notes" element={<ReceiptsNotes />} />
                    <Route path="/cash-flow-insights" element={<CashFlowInsights />} />
                    <Route path="/profile" element={<Profile />} />
                    <Route path="/finance-report" element={<FinanceReport />} />
                    <Route path="/fuel-reports" element={<FuelReports />} />
                    <Route path="/training" element={<TrainingContent />} />
                </Route>
            </Routes>
        </Suspense>
    );
}

export default AccountsRoutes;
