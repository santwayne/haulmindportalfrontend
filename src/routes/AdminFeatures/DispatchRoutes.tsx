
import { Routes, Route } from "react-router-dom";
import { Suspense, lazy } from "react";
import Layout from "../../components/dispatch/Layout";
import Loading from "../../components/common/Loading";

const DispatchDashboard = lazy(() => import("../../pages/admin/dispatch/operations/index"));

const Dispatch = lazy(() => import("../../pages/admin/dispatch/operations/dispatch/index"))

const Scheduling = lazy(() => import("../../pages/admin/driverManagement/schedulePage/index"))


const Trips = lazy(() => import("../../pages/admin/dispatch/operations/tripsOrder"))

const DriversPage = lazy(() => import("../../pages/admin/dispatch/resources/drivers"))
const Fleets = lazy(() => import("../../pages/admin/dispatch/resources/fleet/index"))

const Contacts = lazy(() => import("../../pages/admin/driverManagement/customers/index"))
const Profile = lazy(() => import("../../pages/admin/dashboard/Profile/index"))

const Utilization = lazy(() => import("../../pages/admin/dispatch/operations/utilization/index"))
const RevenuePerMile = lazy(() => import("../../pages/admin/dispatch/operations/revenue-per-mile/index"))
const Deliveries = lazy(() => import("../../pages/admin/dispatch/operations/deliveries/index"))
const Pickups = lazy(() => import("../../pages/admin/dispatch/operations/pickups/index"))
const DriversOnLeave = lazy(() => import("../../pages/admin/dispatch/operations/drivers-on-leave/index"))
const AuditTrail = lazy(() => import("../../pages/admin/dispatch/operations/audit/index"))
const ChatPage = lazy(() => import("../../pages/admin/dispatch/chat/index"))
const TrainingContent = lazy(() => import("../../pages/admin/training/TrainingContentView"))


function DispatchRoutes() {
  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        <Route element={<Layout />}>

          <Route index element={<DispatchDashboard />} />
          <Route path="/dashboard" element={<DispatchDashboard />} />
          <Route path="/profile" element={<Profile />} />
          {/* <Route path="/order-list" element={<OrderList />} /> */}
        
          <Route path="/trips" element={<Trips />} />
   
          <Route path="/dispatch" element={<Dispatch />} />
     
       
          <Route path="/scheduling" element={<Scheduling />} />
      

          <Route path="/drivers" element={<DriversPage />} />
          <Route path="/fleets" element={<Fleets />} />
          <Route path="/contacts" element={<Contacts />} />
          
          <Route path="/utilization" element={<Utilization />} />
          <Route path="/revenue-per-mile" element={<RevenuePerMile />} />
          <Route path="/deliveries" element={<Deliveries />} />
          <Route path="/pickups" element={<Pickups />} />
          <Route path="/drivers-on-leave" element={<DriversOnLeave />} />
          <Route path="/audit" element={<AuditTrail />} />
          <Route path="/chat" element={<ChatPage />} />
          <Route path="/training" element={<TrainingContent />} />
       



        </Route>
      </Routes>
    </Suspense>
  );
}

export default DispatchRoutes;