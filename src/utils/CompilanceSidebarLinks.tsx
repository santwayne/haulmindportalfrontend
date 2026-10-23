import {
    MdDashboard,
} from "react-icons/md";
import { RiBillLine } from "react-icons/ri";
import { FaClipboardCheck, FaChartBar, FaTicketAlt, FaExclamationTriangle, FaShieldAlt, FaGraduationCap, FaSatelliteDish } from "react-icons/fa";

type CompilanceSidebarLink = {
    key: string;
    icon: React.ReactNode;
    label: string;
    children?: CompilanceSidebarLink[];
    action?: string;
};

export const CompilanceSidebarLinks: CompilanceSidebarLink[] = [
    {
        key: "compilance-summary",
        icon: <MdDashboard />,
        label: "Compilance Summary",
    },
    {
        key: "hos-eld",
        icon: <RiBillLine />,
        label: "HOS & ELD",
    },
    {
        key: "cvsa-inspection",
        icon: <FaClipboardCheck />,
        label: "CVSA Inspection",
    },
    {
        key: "monthly-report",
        icon: <FaChartBar />,
        label: "Carrier Profile",
    },
    {
        key: "tickets",
        icon: <FaTicketAlt />,
        label: "Tickets (Fines & Penalties)",
    },
    {
        key: "accidents",
        icon: <FaExclamationTriangle />,
        label: "Accidents",
    },
    {
        key: "insurance-claims",
        icon: <FaShieldAlt />,
        label: "Insurance Claims",
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
