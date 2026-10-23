import { MdDashboard } from "react-icons/md";
import {
    FaFileInvoiceDollar,
    FaMoneyBillWave,
    FaUsers,
    FaIdBadge,
    FaHandshake,
    FaTools,
    FaReceipt,
    FaPercentage,
    FaGraduationCap
} from "react-icons/fa";
import { FaSatelliteDish } from "react-icons/fa";
import { RiOilLine } from "react-icons/ri";
import { BarChart3 } from "lucide-react";
import { Sparkles } from "lucide-react";


type AccountSidebarlinks = {
    key: string;
    icon: React.ReactNode;
    label: string;
    children?: AccountSidebarlinks[];
};

export const AccountSidebarlinks: AccountSidebarlinks[] = [
    {
        key: "/admin/accounts",
        icon: <MdDashboard />,
        label: "Dashboard",
    },
    {
        key: "/admin/accounts/finance-report",
        icon: <FaFileInvoiceDollar />,
        label: "Finance Report",
    },

    {
        key: "/admin/accounts/settlements",
        icon: <FaHandshake />,
        label: "Settlements",
    },

    {
        key: "/admin/accounts/expenses",
        icon: <FaMoneyBillWave />,
        label: "Expense Management",
    },

    {
        key: "/admin/accounts/invoice",
        icon: <FaFileInvoiceDollar />,
        label: "Invoicing",
    },

    {
        key: "/admin/accounts/payroll",
        icon: <FaUsers />,
        label: "Employees Payroll",
    },

    {
        key: "/admin/accounts/driverpayroll",
        icon: <FaIdBadge />,
        label: "Driver Payroll",
    },

    {
        key: "/admin/accounts/gross-pay",
        icon: <FaFileInvoiceDollar />,
        label: "Gross Payroll",
    },

    {
        key: "/admin/accounts/fleet-maintenance",
        icon: <FaTools />,
        label: "Fleet & Maint. Finance",
    },

    {
        key: "/admin/accounts/fuel-reports",
        icon: <RiOilLine />,
        label: "Fuel Reports",
    },

    {
        key: "/admin/accounts/receipts-notes",
        icon: <FaReceipt />,
        label: "Receipts & Notes",
    },

    {
        key: "/admin/accounts/config",
        icon: <BarChart3 className="w-5 h-5" />,
        label: "Accounting Config",
    },

    {
        key: "/admin/accounts/cash-flow-insights",
        icon: <Sparkles className="w-5 h-5" />,
        label: "Cash Flow Insights",
    },

    {
        key: "/admin/accounts/tax-setup",
        icon: <FaPercentage />,
        label: "Tax Setup & Rate Management",
    },
    {
        key: "/admin/accounts/training",
        icon: <FaGraduationCap />,
        label: "Training Content",
    },
    {
        key: "/gps-dashboard",
        icon: <FaSatelliteDish />,
        label: "GPS Dashboard",
    },
];


