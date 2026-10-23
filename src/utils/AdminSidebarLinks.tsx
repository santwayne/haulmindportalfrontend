import {
    MdDashboard,
    MdSettings,
    MdBusiness,

    MdPeople,
    MdCreditCard
} from "react-icons/md";
import { BsPersonVcard } from "react-icons/bs";
import { RiBillLine } from "react-icons/ri";
import { RiFoldersLine } from "react-icons/ri";
import { FaTruck,FaUsers, FaGraduationCap } from "react-icons/fa";

export type AdminSidebarLink = {
    key: string;
    icon: React.ReactNode;
    label: string;
    children?: AdminSidebarLink[];
    action?: string;
};

export const AdminSidebarLinks: AdminSidebarLink[] = [
    {
        key: "dashboard",
        icon: <MdDashboard />,
        label: "Home",
    },
    {
        key: "quick-stats",
        icon: <BsPersonVcard />,
        label: "Quick Stats",
    },
    {
        key: "truck-profile",
        icon: <FaTruck />,
        label: "Fleet Profile",
    },

    // {
    //     key: "member",
    //     icon: <HiOutlineUsers />,
    //     label: "Member",
    // },
    // {
    //     key: "slots",
    //     icon: <RiBarChart2Fill />,
    //     label: "Slots",
    // },
    {
        key: "invoice",
        icon: <RiBillLine />,
        label: "Invoices",
    },
    {
        key: "subscription",
        icon: <MdCreditCard />,
        label: "My Subscription",
    },
    {
        key: "company-documents",
        icon: <RiFoldersLine />,
        label: "Company Documents",
    },
    {
        key: "hr-training-content",
        icon: <FaGraduationCap />,
        label: "HR Training Content",
    },
    {
        key: "systemsetting",
        icon: <MdSettings />,
        label: "Settings",
        children: [
            {
                key: "employees",
                icon: <MdPeople />,
                label: "Employees",
            },
            {
                key: "customers",
                icon: <FaUsers />,
                label: "Customers",
            },
            {
                key: "drivers",
                icon: <FaTruck />,
                label: "Drivers",
              },
            {
                key: "company",
                icon: <MdBusiness />,
                label: "Company Settings",
            },
            // {
            //     key: "integrations",
            //     icon: <MdApi />,
            //     label: "API's",
            // }


        ],
    },
];
