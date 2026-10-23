import {
  MdDashboard,
  MdOutlineMap,
} from "react-icons/md";
import { FaTruck, FaCogs, FaUserTie, FaRoute } from "react-icons/fa";

type DispatchSidebarLinks = {
  key: string;
  icon: React.ReactNode;
  label: string;
  children?: DispatchSidebarLinks[];
  action?: "open-new-load";
};

export const GpsSidebarLinks: DispatchSidebarLinks[] = [
  {
    key: "/admin/gpsvehicle",
    icon: <MdDashboard />,
    label: "Dashboard",
  },
  {
    key: "/admin/gpsvehicle/livetracking",
    icon: <MdOutlineMap />,
    label: "Live Tracking",
    children: [
      {
        key: "/admin/gpsvehicle/livetracking/truck",
        icon: <FaTruck />,
        label: "Truck Tracking",
      },
      {
        key: "/admin/gpsvehicle/livetracking/trailer",
        icon: <FaCogs />, // or another trailer-specific icon if you want
        label: "Trailer Tracking",
      },
      {
        key: "/admin/gpsvehicle/livetracking/trip",
        icon: <FaRoute />,
        label: "Trip Tracking",
      },
    ],
  },

  {
    key: "/admin/gpsvehicle/vehicles",
    icon: <FaTruck />,
    label: "Fleets",
  },
  {
    key: "/admin/gpsvehicle/drivers",
    icon: <FaUserTie />,
    label: "Drivers",
  },
  // {
  //   key: "/admin/gpsvehicle/productivity",
  //   icon: <GiProgression />,
  //   label: "Productivity",
  //   children: [
  //     {
  //       key: "/admin/gpsvehicle/triphistory",
  //       icon: <MdDashboard />,
  //       label: "Trip History",
  //     },
  //   ],
  // },
  // {
  //   key: "/admin/gpsvehicle/compilance",
  //   icon: <MdOutlineSecurity />,
  //   label: "Compliance",
  //   children: [
  //     {
  //       key: "/admin/gpsvehicle/productivity/compilance",
  //       icon: <RiFileListLine />,
  //       label: "Compliance Reports",
  //     },
  //   ],
  // },
  // {
  //   key: "/admin/gpsvehicle/safety",
  //   icon: <MdOutlineSecurity />,
  //   label: "Safety",
  //   children: [
  //     {
  //       key: "/admin/gpsvehicle/safety/safety",
  //       icon: <MdDashboard />,
  //       label: "Safety Dashboard",
  //     },
  //   ],
  // },
  // {
  //   key: "/admin/gpsvehicle/maintenance",
  //   icon: <MdOutlineBuild />,
  //   label: "Maintenance",
  //   children: [
  //     {
  //       key: "/admin/gpsvehicle/maintenance/logs",
  //       icon: <RiFileListLine />,
  //       label: "Logs",
  //     },
  //   ],
  // },
  // {
  //   key: "/admin/gpsvehicle/sustainability",
  //   icon: <MdOutlineEco />,
  //   label: "Sustainability",
  //   children: [
  //     {
  //       key: "/admin/gpsvehicle/sustainability/overview",
  //       icon: <MdDashboard />,
  //       label: "Overview",
  //     },
  //   ],
  // },
  // {
  //   key: "/admin/gpsvehicle/people",
  //   icon: <MdOutlinePeople />,
  //   label: "People",
  //   children: [
  //     {
  //       key: "/admin/gpsvehicle/people/staff",
  //       icon: <MdDashboard />,
  //       label: "Staff",
  //     },
  //   ],
  // },
  // {
  //   key: "/admin/gpsvehicle/messages",
  //   icon: <MdOutlineMessage />,
  //   label: "Messages",
  // },
  // {
  //   key: "/admin/gpsvehicle/notifications",
  //   icon: <MdNotificationsActive />,
  //   label: "Notifications",
  // },
  // {
  //   key: "/admin/gpsvehicle/videorecordings",
  //   icon: <MdVideoLibrary />,
  //   label: "Video Recordings",
  // },
  // {
  //   key: "/admin/gpsvehicle/reports",
  //   icon: <MdOutlineReport />,
  //   label: "Reports",
  //   children: [
  //     {
  //       key: "/admin/gpsvehicle/reports/safety",
  //       icon: <RiFileListLine />,
  //       label: "Safety Reports",
  //     },
  //   ],
  // },
  // {
  //   key: "/admin/gpsvehicle/groups&rules",
  //   icon: <MdOutlineRule />,
  //   label: "Groups & Rules",
  //   children: [
  //     {
  //       key: "/admin/gpsvehicle/groups&rules/manage",
  //       icon: <MdDashboard />,
  //       label: "Manage Rules",
  //     },
  //   ],
  // },
  // {
  //   key: "/admin/gpsvehicle/add-in-management",
  //   icon: <FaCogs />,
  //   label: "Add in Management",
  //   children: [
  //     {
  //       key: "/admin/gpsvehicle/add-in-management/settings",
  //       icon: <MdDashboard />,
  //       label: "Settings",
  //     },
  //   ],
  // },
  // {
  //   key: "/admin/gpsvehicle/support",
  //   icon: <MdOutlineSupport />,
  //   label: "Support",
  //   children: [
  //     {
  //       key: "/admin/gpsvehicle/support/help",
  //       icon: <MdDashboard />,
  //       label: "Help Desk",
  //     },
  //   ],
  // },
  // {
  //   key: "/admin/gpsvehicle/system",
  //   icon: <MdSettings />,
  //   label: "System",
  //   children: [
  //     {
  //       key: "/admin/gpsvehicle/system/config",
  //       icon: <MdDashboard />,
  //       label: "Configuration",
  //     },
  //   ],
  // },
];
