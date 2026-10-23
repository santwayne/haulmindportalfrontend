// HealthSafetySidebarLinks.ts (No change needed, it's perfect)
import { MdDashboard } from "react-icons/md";
import {
    FaExclamationTriangle,
    FaShieldAlt,
    FaClipboardList,
    FaFileAlt,
    FaUsersCog,
    FaChartBar,
    FaFileContract, // Added for policies to align with dashboard
    FaClipboardCheck, // For Safety Inspections
    FaTruck, // For Trucking Operations

    FaAmbulance, // For Emergency Procedures
    FaGraduationCap, // For Training Content
    FaSatelliteDish // For GPS Dashboard
} from "react-icons/fa";

type HealthSafetySidebarLink = {
    key: string;
    icon: React.ReactNode;
    label: string;
    children?: HealthSafetySidebarLink[];
    action?: string;
};

export const HealthSafetySidebarLinks: HealthSafetySidebarLink[] = [
    {
        key: "health-safety-summary",
        icon: <MdDashboard />,
        label: "Health & Safety Summary",
    },
    {
        key: "incidents-accidents",
        icon: <FaExclamationTriangle />,
        label: "Incidents & Accidents",
    },
    {
        key: "inspections-hazards",
        icon: <FaShieldAlt />,
        label: "Hazards Management",
    },
    {
        key: "safety-inspections",
        icon: <FaClipboardCheck />,
        label: "Safety Inspections",
    },
    {
        key: "training-certificates",
        icon: <FaClipboardList />,
        label: "Training & Certificates",
    },
    {
        // Changed icon to FaFileContract for policy emphasis
        key: "policies-documents",
        icon: <FaFileContract />,
        label: "Policy & Documents",
    },
    {
        key: "compliance-records",
        icon: <FaFileAlt />,
        label: "Compliance Records",
    },
    {
        key: "committee-capa",
        icon: <FaUsersCog />,
        label: "H&S Committee & CAPA",
    },
    {
        key: "trucking-operations",
        icon: <FaTruck />,
        label: "Trucking Operations",
    },
    {
        key: "emergency-procedures",
        icon: <FaAmbulance />,
        label: "Emergency Procedures",
    },
    // {
    //     key: "document-library",
    //     icon: <FaFolder />,
    //     label: "Document Library",
    // },

    {
        key: "reports-analytics",
        icon: <FaChartBar />,
        label: "Reports & Analytics",
    },
    {
        key: "training",
        icon: <FaGraduationCap />,
        label: "Training Content",
    },
    {
        key: "/gps-dashboard",
        icon: <FaSatelliteDish />,
        label: "GPS Dashboard",
    }
];