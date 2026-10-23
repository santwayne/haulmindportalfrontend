import { Routes, Route } from "react-router-dom";
import { Suspense, lazy } from "react";
import Layout from "../../components/driverManegement/Layout";
import Loading from "../../components/common/Loading";


const Dashboard = lazy(() => import("../../pages/admin/driverManagement/index"));
const Driver = lazy(() => import("../../pages/admin/driverManagement/driverslist/index"))
const EmployeeList = lazy(() => import("../../pages/admin/driverManagement/employees/index"))
const Customers = lazy(() => import("../../pages/admin/driverManagement/customers/index"))
const Documents = lazy(() => import("../../pages/admin/driverManagement/document/index"))
const Attendence = lazy(() => import("../../pages/admin/driverManagement/Attendance/index"))
const Issues = lazy(() => import("../../pages/admin/dispatch/resources/issues/index"))
const CompanyDocuments = lazy(() => import("../../pages/admin/dashboard/documents/index"))
const VehicleDocuments = lazy(() => import("../../pages/admin/fleetMaintenance/vehicleDocument/VehicleDocuments"))
const UserProfilesPortfolio = lazy(() => import("../../pages/admin/driverManagement/userProfiles/index"))
const DriverProfiles = lazy(() => import("../../pages/admin/driverManagement/driverportfolio/index"))
const Profile = lazy(() => import("../../pages/admin/dashboard/Profile/index"));
const TrainingCertificates = lazy(() => import("../../pages/admin/driverManagement/trainingCertificates/index"));
// const DrugTest = lazy(() => import("../../pages/admin/driverManagement/drugTest/index"));
const TrainingTestManagement = lazy(() => import("../../pages/admin/driverManagement/trainingTestManagement/index"));
const DriverTrainingCenter = lazy(() => import("../../pages/admin/driverManagement/driverTrainingCenter/index"));
const ELDDocuments = lazy(() => import("../../pages/admin/accounts/eld-documents/index"));
const Trucks = lazy(() => import("../../pages/admin/driverManagement/trucks/Trucks"));
const Trailers = lazy(() => import("../../pages/admin/driverManagement/trailers/index"));
const HRRoleBasedTraining = lazy(() => import("../../pages/admin/training/hrTraining/HRRoleBasedTraining"));
const TrainingContent = lazy(() => import("../../pages/admin/training/TrainingContentView"));

function DriverManagementRoutes() {
    return (
        <Suspense fallback={<Loading />}>
            <Routes>
                <Route element={<Layout />}>
                    <Route index element={<Dashboard />} />
                    <Route path="/drivers" element={<Driver />} />
                    {/* <Route path="/scheduling" element={<Scheduling />} /> */}

                    <Route path="/profile" element={<Profile />} />
                    <Route path="/employeelist" element={<EmployeeList />} />
                    <Route path="/customers" element={<Customers />} />
                    <Route path="/documents" element={<Documents />} />
                    <Route path="/company-documents" element={<CompanyDocuments />} />
                    <Route path="/vehicle-documents" element={<VehicleDocuments />} />
                    <Route path="/attendence" element={<Attendence />} />
                    <Route path="/issues" element={<Issues />} />
                    <Route path="/employee-profiles" element={<UserProfilesPortfolio />} />
                    <Route path="/driver-profiles" element={<DriverProfiles />} />
                    <Route path="/driver-training-center" element={<DriverTrainingCenter />} />
                    {/* Legacy routes - kept for backward compatibility, redirect to driver-training-center */}
                    <Route path="/training-certificates" element={<TrainingCertificates />} />
                    {/* <Route path="/drug-test" element={<DrugTest />} /> */}
                    <Route path="/training-test-management" element={<TrainingTestManagement />} />
                    <Route path="/eld-documents" element={<ELDDocuments />} />
                    <Route path="/trucks" element={<Trucks />} />
                    <Route path="/trailers" element={<Trailers />} />
                    <Route path="/role-based-training" element={<HRRoleBasedTraining />} />
                    <Route path="/training" element={<TrainingContent />} />
                </Route>
            </Routes>
        </Suspense>
    )
}

export default DriverManagementRoutes