import {
    MdDashboard,
    MdSettings
} from "react-icons/md";
import { RiBillLine, RiBarChart2Fill } from "react-icons/ri";
import { HiOutlineUsers } from "react-icons/hi2";
import { FaFileInvoice } from "react-icons/fa";

type SuperAdminSidebarLink = {
    key: string;
    icon: React.ReactNode;
    label: string;
    children?: SuperAdminSidebarLink[];
};

export const SuperAdminSidebarLink: SuperAdminSidebarLink[] = [
    {
        key: "/superadmin/dashboard",
        icon: <MdDashboard />,
        label: "Overview",
    },
    {
        key: "/superadmin/viewalladmins",
        icon: <HiOutlineUsers />,
        label: "Admin Accounts",
    },
    {
        key: "/superadmin/billing",
        icon: <RiBillLine />,
        label: "Plan Management",
    },
    {
        key: "/superadmin/revenue",
        icon: <RiBarChart2Fill />,
        label: "Revenue Generated",
    },
    {
        key: "/superadmin/invoices",
        icon: <FaFileInvoice />,
        label: "Invoices",
    },
    {
        key: "/superadmin/systemsetting",
        icon: <MdSettings />,
        label: "System Settings",
    },
];
