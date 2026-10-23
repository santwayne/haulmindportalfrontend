import {
  MdDashboard,
  MdEventNote,
  MdContacts,
} from "react-icons/md";
import {
  FaTruck,
  FaUserTie,
  FaWarehouse,
  FaRoute,
  FaDollarSign,
  FaShippingFast,
  FaBoxOpen,
  FaUserClock,
  FaHistory,
  FaComments,
  FaGraduationCap,
} from "react-icons/fa";

type DispatchSidebarLinks = {
  key: string;
  icon: React.ReactNode;
  label: string;
  action?: "open-new-order";
};

// Flattened list – removed dropdowns
export const DispatchSidebarLinks: DispatchSidebarLinks[] = [
  {
    key: "/admin/dispatch/dashboard",
    icon: <MdDashboard />,
    label: "Dashboard",
  }, {
    key: "/admin/dispatch/trips",
    icon: <FaRoute />,
    label: "Trips",
  },

  {
    key: "/admin/dispatch/scheduling",
    icon: <MdEventNote />,
    label: "Trip Scheduling",
  },

  // Resources - now flat
  {
    key: "/admin/dispatch/drivers",
    icon: <FaUserTie />,
    label: "Drivers",
  },
  {
    key: "/admin/dispatch/fleets",
    icon: <FaTruck />,
    label: "Fleets",
  },
  {
    key: "/admin/dispatch/contacts",
    icon: <MdContacts />,
    label: "Customer",
  },

  // Utilization & Analytics
  {
    key: "/admin/dispatch/utilization",
    icon: <FaWarehouse />,
    label: "Truck & Trailer Utilization",
  },
  {
    key: "/admin/dispatch/revenue-per-mile",
    icon: <FaDollarSign />,
    label: "Revenue Per Mile",
  },
  {
    key: "/admin/dispatch/deliveries",
    icon: <FaShippingFast />,
    label: "Deliveries",
  },
  {
    key: "/admin/dispatch/pickups",
    icon: <FaBoxOpen />,
    label: "Pickups",
  },
  {
    key: "/admin/dispatch/drivers-on-leave",
    icon: <FaUserClock />,
    label: "Drivers on Leave",
  },
  {
    key: "/admin/dispatch/audit",
    icon: <FaHistory />,
    label: "Audit Trail",
  },
  {
    key: "/admin/dispatch/chat",
    icon: <FaComments />,
    label: "Chat",
  },
  {
    key: "/admin/dispatch/training",
    icon: <FaGraduationCap />,
    label: "Training Content",
  },

];
