import { Routes, Route } from "react-router-dom";
import { Suspense, lazy } from "react";
import Layout from "../../components/fleetMaintain/Layout";
import Loading from "../../components/common/Loading";


const Dashboard = lazy(() => import("../../pages/admin/fleetMaintenance/Dashboard/index"));
const VehicleEldMonitor = lazy(() => import("../../pages/admin/fleetMaintenance/vehicle-eld-monitor/index"));
const SpareParts = lazy(() => import("../../pages/admin/fleetMaintenance/sparePart/index"))
const CostReports = lazy(() => import("../../pages/admin/fleetMaintenance/costReport/index"))
const FleetUnits = lazy(() => import("../../pages/admin/fleetMaintenance/fleetUnits/index"))
const Trucks = lazy(() => import("../../pages/admin/fleetMaintenance/trucks/Trucks"))
const Trailers = lazy(() => import("../../pages/admin/fleetMaintenance/trailers/index"))
const ComplianceDashboard = lazy(() => import("../../pages/admin/fleetMaintenance/Dashboard/index"))
const ScheduledServicesLog = lazy(() => import("../../pages/admin/fleetMaintenance/scheduledServicesLog/index"))
const GeneralRepairsLog = lazy(() => import("../../pages/admin/fleetMaintenance/generalRepairsLog/index"))
// const RegulatorySafety = lazy(() => import("../../pages/admin/fleetMaintenance/regulatorySafety/index"))
const VehicleDocuments = lazy(() => import("../../pages/admin/fleetMaintenance/vehicleDocument/VehicleDocuments"))
const FleetInvoices = lazy(() => import("../../pages/admin/fleetMaintenance/invoices"))
const Customers = lazy(() => import("../../pages/admin/fleetMaintenance/customers/index"))
const Yards = lazy(() => import("../../pages/admin/fleetMaintenance/yards/index"))
const TruckProfile = lazy(() => import("../../pages/admin/fleetMaintenance/truckProfile/index"))
const Profile = lazy(() => import("../../pages/admin/dashboard/Profile/index"))
const Issues = lazy(() => import("../../pages/admin/dispatch/resources/issues/index"))
const TrainingContent = lazy(() => import("../../pages/admin/training/TrainingContentView"))
const MaintenanceSettings = lazy(() => import("../../pages/admin/fleetMaintenance/maintenanceSettings/index"))

function FleetMaintainRoutes() {
    return (
        <Suspense fallback={<Loading />}>
            <Routes>
                <Route element={<Layout />}>
                    <Route index element={<Dashboard />} />
                    <Route path="/vehicle-monitor" element={<VehicleEldMonitor />} />
                    <Route path="/profile" element={<Profile />} />

                    <Route path="/parts" element={<SpareParts />} />
                    <Route path="/vehicle-documents" element={<VehicleDocuments />} />
                    <Route path="/cost-reports" element={<CostReports />} />
                    <Route path="/fleet-units" element={<FleetUnits />} />
                    <Route path="/trucks" element={<Trucks />} />
                    <Route path="/trucks/:category" element={<Trucks />} />
                    <Route path="/trailers" element={<Trailers />} />
                    <Route path="/compliance-dashboard" element={<ComplianceDashboard />} />
                    <Route path="/scheduled-services-log" element={<ScheduledServicesLog />} />
                    <Route path="/maintenance-orders-log" element={<GeneralRepairsLog />} />
                    {/* <Route path="/regulatory-safety" element={<RegulatorySafety />} /> */}
                    <Route path="/invoices" element={<FleetInvoices />} />
                    <Route path="/customers" element={<Customers />} />
                    <Route path="/yards" element={<Yards />} />
                    <Route path="/truck-profile" element={<TruckProfile />} />
                    <Route path="/issues" element={<Issues />} />
                    <Route path="/training" element={<TrainingContent />} />
                    <Route path="/maintenance-settings" element={<MaintenanceSettings />} />
                </Route>
            </Routes>
        </Suspense>
    )
}

export default FleetMaintainRoutes