import { Routes, Route } from "react-router-dom";
import { Suspense, lazy } from "react";
import Layout from "../../components/healthSafety/Layout";
import Loading from "../../components/common/Loading";
import ErrorBoundary from "../../components/common/ErrorBoundary";

const HealthSafetyDashboard = lazy(() => import("../../pages/admin/healthandsafety/Dashboard"));
const IncidentsAccidents = lazy(() => import("../../pages/admin/healthandsafety/incidents-accidents/index"));
const InspectionsHazards = lazy(() => import("../../pages/admin/healthandsafety/inspections-hazards/index"));
const TrainingCertificates = lazy(() => import("../../pages/admin/healthandsafety/training-certificates/index"));
const PoliciesDocuments = lazy(() => import("../../pages/admin/healthandsafety/policies-documents/index"));
const CommitteeCAPA = lazy(() => import("../../pages/admin/healthandsafety/committee-capa/index"));
const ReportsAnalytics = lazy(() => import("../../pages/admin/healthandsafety/reports-analytics/index"));
const ComplianceRecords = lazy(() => import("../../pages/admin/healthandsafety/ComplianceRecords/index"));
const SafetyInspections = lazy(() => import("../../pages/admin/healthandsafety/SafetyInspections/index"));
const TruckingOperations = lazy(() => import("../../pages/admin/healthandsafety/TruckingOperations/index"));
const ToolboxTalks = lazy(() => import("../../pages/admin/healthandsafety/toolbox-talks/index"));
const EmergencyProcedures = lazy(() => import("../../pages/admin/healthandsafety/emergency-procedures/index"));
// const DocumentLibrary = lazy(() => import("../../pages/admin/healthandsafety/document-library/index"));
const SafetyBulletins = lazy(() => import("../../pages/admin/healthandsafety/safety-bulletins/index"));
const Profile = lazy(() => import("../../pages/admin/dashboard/Profile/index"));
const TrainingContent = lazy(() => import("../../pages/admin/training/TrainingContentView"));

function HealthSafetyRoutes() {
  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<ErrorBoundary><HealthSafetyDashboard /></ErrorBoundary>} />
          <Route path="health-safety-summary" element={<ErrorBoundary><HealthSafetyDashboard /></ErrorBoundary>} />
          <Route path="dashboard" element={<ErrorBoundary><HealthSafetyDashboard /></ErrorBoundary>} />
          <Route path="incidents-accidents" element={<ErrorBoundary><IncidentsAccidents /></ErrorBoundary>} />
          <Route path="inspections-hazards" element={<ErrorBoundary><InspectionsHazards /></ErrorBoundary>} />
          <Route path="training-certificates" element={<ErrorBoundary><TrainingCertificates /></ErrorBoundary>} />
          <Route path="policies-documents" element={<ErrorBoundary><PoliciesDocuments /></ErrorBoundary>} />
          <Route path="committee-capa" element={<ErrorBoundary><CommitteeCAPA /></ErrorBoundary>} />
          <Route path="reports-analytics" element={<ErrorBoundary><ReportsAnalytics /></ErrorBoundary>} />
          <Route path="compliance-records" element={<ErrorBoundary><ComplianceRecords /></ErrorBoundary>} />
          <Route path="safety-inspections" element={<ErrorBoundary><SafetyInspections /></ErrorBoundary>} />
          <Route path="trucking-operations" element={<ErrorBoundary><TruckingOperations /></ErrorBoundary>} />
          <Route path="toolbox-talks" element={<ErrorBoundary><ToolboxTalks /></ErrorBoundary>} />
          <Route path="emergency-procedures" element={<ErrorBoundary><EmergencyProcedures /></ErrorBoundary>} />
          {/* <Route path="document-library" element={<ErrorBoundary><DocumentLibrary /></ErrorBoundary>} /> */}
          <Route path="safety-bulletins" element={<ErrorBoundary><SafetyBulletins /></ErrorBoundary>} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/training" element={<ErrorBoundary><TrainingContent /></ErrorBoundary>} />
        </Route>
      </Routes>
    </Suspense>
  );
}

export default HealthSafetyRoutes;

