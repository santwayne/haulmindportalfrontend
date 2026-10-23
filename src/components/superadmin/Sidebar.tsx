// components/superadmin/Sidebar.tsx
import React from "react";
import { NavLink, useLocation } from "react-router-dom";
import { SuperAdminSidebarLink } from "../../utils/SuperAdminSidebarLinks";
import { FaBars, FaTimes } from "react-icons/fa";
import Logo from "../../assets/FleetGo.png";

interface SidebarProps {
    isCollapsed: boolean;
    onToggle: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isCollapsed, onToggle }) => {
    const location = useLocation();

    // Helper function to check if route is active
    const isActiveLink = (linkKey: string, pathname: string) => {
        if (linkKey === "/superadmin/dashboard") {
            return pathname === "/superadmin/" || pathname === "/superadmin/dashboard";
        }
        return pathname.startsWith(linkKey);
    };

    return (
        <aside 
            className={`${
                isCollapsed ? 'w-20' : 'w-64'
            } h-screen flex flex-col transition-all duration-300 ease-in-out relative z-10 bg-transparent`}
        >
            {/* Logo & Toggle - fixed at top */}
            <div className="flex-shrink-0 flex justify-between items-center bg-card shadow-lg rounded-lg px-4 py-3 m-3 mb-4 z-10 relative">
                <div className="flex items-center flex-1">
                    {!isCollapsed && (
                        <div className="flex items-center space-x-2 flex-1">
                            <img src={Logo} alt="FleetGo Logo" className="w-20 h-auto" />
                        </div>
                    )}
                    {isCollapsed && (
                        <div className="flex items-center justify-center w-full">
                            <img src={Logo} alt="FleetGo Logo" className="w-10 h-auto" />
                        </div>
                    )}
                </div>
                
                {/* Toggle button */}
                <button
                    onClick={onToggle}
                    className="ml-2 p-1.5 rounded-md hover:bg-[rgba(255,255,255,0.03)] transition-colors"
                    aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                >
                    {isCollapsed ? (
                        <FaBars className="w-4 h-4 text-secondary" />
                    ) : (
                        <FaTimes className="w-4 h-4 text-secondary" />
                    )}
                </button>
            </div>

            {/* Menu - scrollable */}
            <nav className="flex-1 overflow-y-auto px-3 pb-4">
                <ul className="bg-card shadow-lg rounded-lg space-y-2 p-2">
                    {SuperAdminSidebarLink.map((link) => {
                        const isActive = isActiveLink(link.key, location.pathname);
                        return (
                            <li key={link.key}>
                                <NavLink
                                    to={link.key}
                                    className={({ isActive: navIsActive }) =>
                                        `flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium
                                         transition-all duration-200 ease-in-out
                                         ${navIsActive || isActive
                                            ? "border-l-4"
                                            : "text-secondary hover:text-primary"}`
                                    }
                                    style={({ isActive: navIsActive }) => navIsActive || isActive ? {
                                        backgroundColor: 'rgba(17,131,224,0.12)',
                                        color: 'var(--accent-navyblue)',
                                        borderLeftColor: 'var(--accent-navyblue)',
                                    } : {
                                        borderLeftColor: 'transparent',
                                    }}
                                    title={isCollapsed ? link.label : undefined}
                                >
                                    <span className={`text-xl flex-shrink-0 ${isCollapsed ? 'mx-auto' : ''}`}>
                                        {link.icon}
                                    </span>
                                    {!isCollapsed && (
                                        <span className="truncate">{link.label}</span>
                                    )}
                                </NavLink>
                            </li>
                        );
                    })}
                </ul>
            </nav>
        </aside>
    );
};

export default Sidebar;
