import {
  MdDashboard,         
  MdAccessTime,           // Attendance
  MdPerson,               // Profile / Portfolio
} from "react-icons/md";

import { FaUserTie } from "react-icons/fa";      // Employees
import { FaTruck } from "react-icons/fa";        // Drivers
import { FaIdCard } from "react-icons/fa";       // Driver Portfolio
import { FaFolderOpen } from "react-icons/fa";   // Company Documents
import { FaUsers } from "react-icons/fa";        // Customers

import { FaGraduationCap } from "react-icons/fa"; // Training & Test Management
import { FileText } from "lucide-react";         // ELD Documents
import { Truck, Package } from "lucide-react"; // Trucks and Trailers


type DriverSidebarLink = {
  key: string;
  icon: React.ReactNode;
  label: string;
  children?: DriverSidebarLink[];
};

export const DriverSidebarLinks: DriverSidebarLink[] = [
  {
    key: "/admin/Management",
    icon: <MdDashboard />,
    label: "Home",
  },
  {
    key: "/admin/Management/drivers",
    icon: <FaTruck />,
    label: "Drivers",
  },
  {
    key: "/admin/Management/employeelist",
    icon: <FaUserTie />,
    label: "Employees",
  },
  {
    key: "/admin/Management/customers",
    icon: <FaUsers />,
    label: "Customers",
  },
  {
    key: "/admin/Management/company-documents",
    icon: <FaFolderOpen />,
    label: "Company Documents",
  },
  {
    key: "/admin/Management/attendence",
    icon: <MdAccessTime />,
    label: "Attendance Tracking",
  },
  {
    key: "/admin/Management/employee-profiles",
    icon: <MdPerson />,
    label: "Employee Portfolio",
  },
  {
    key: "/admin/Management/driver-profiles",
    icon: <FaIdCard />,
    label: "Driver Portfolio",
  },
  {
    key: "/admin/Management/driver-training-center",
    icon: <FaGraduationCap />,
    label: "Driver Training Center",
  },
  // {
  //   key: "/admin/Management/drug-test",
  //   icon: <FaFlask />,
  //   label: "Drug Test",
  // },
  {
    key: "/admin/Management/eld-documents",
    icon: <FileText className="w-5 h-5" />,
    label: "ELD Documents",
  },
  {
    key: "/admin/Management/trucks",
    icon: <Truck className="w-5 h-5" />,
    label: "Trucks",
  },
  {
    key: "/admin/Management/trailers",
    icon: <Package className="w-5 h-5" />,
    label: "Trailers",
  },
  {
    key: "/admin/Management/role-based-training",
    icon: <FaGraduationCap />,
    label: "Role-Based Training",
  },
  {
    key: "/admin/Management/training",
    icon: <FaGraduationCap />,
    label: "Training Content",
  },
];

