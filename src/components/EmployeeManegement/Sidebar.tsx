import React, { useState, useMemo } from 'react'
import { DriverSidebarLinks } from '../../utils/DriverManagementSidebarLinks'
import { NavLink } from "react-router-dom";
import { FaChevronDown, FaChevronRight, FaBars, FaTimes } from "react-icons/fa";
import Logo from "../../assets/FleetGo.png";
import { getUserRole } from "../../utils/auth";

interface SidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isCollapsed, onToggle }) => {
  const [openMenus, setOpenMenus] = useState<string[]>([]);
  const [, setHoveredMenu] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const userRole = getUserRole();
  const isHR = userRole === 'hr';

  // Transform paths based on user role
  const transformPath = (path: string): string => {
    if (isHR) {
      // Remove /admin prefix for HR
      return path.replace(/^\/admin\//, '/');
    }
    return path;
  };

  // Transform sidebar links based on role
  const transformedLinks = useMemo(() => {
    const transformLink = (link: any): any => {
      const transformed = {
        ...link,
        key: link.action ? link.key : transformPath(link.key),
      };
      if (link.children) {
        transformed.children = link.children.map(transformLink);
      }
      return transformed;
    };

    return DriverSidebarLinks.map(transformLink);
  }, [isHR]);

  // Toggle expand/collapse for parent menus
  const toggleMenu = (key: string) => {
    setOpenMenus((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  // Helper function to check if route is active
  const isActiveLink = (linkKey: string, isActive: boolean, pathname: string) => {
    const basePath = isHR ? "/Management" : "/admin/Management";
    if (linkKey === basePath) {
      return (
        pathname === basePath ||
        pathname === `${basePath}/dashboard`
      );
    }
    return isActive;
  };

  // Handle link click: either navigate or open drawer
  const handleClick = (link: any) => {
    if (link.action === "open-new-load") {
      setSidebarOpen(true);
    }
  };

  return (
    <>
      <aside className={`${isCollapsed ? 'w-20' : 'w-64'} h-screen flex flex-col transition-all duration-300 ease-in-out relative z-10`}>
        {/* Logo & status - fixed at top */}
        <div className="flex-shrink-0 flex justify-between items-center bg-card shadow-lg rounded-lg px-4 py-3 m-3 mb-4 z-10 relative">
          <div className="flex items-center">
            {!isCollapsed && (
              <div className="flex items-center space-x-2">
                <img src={Logo} alt="FleetGo Logo" className="w-20 h-auto" />
              </div>
            )}
            {isCollapsed && (
              <div className="text-lg font-bold text-primary">L</div>
            )}
          </div>
          <button
            onClick={onToggle}
            className="text-secondary hover:text-primary cursor-pointer transition-colors p-1 rounded-md hover:bg-[rgba(255,255,255,0.03)]"
          >
            {isCollapsed ? <FaBars size={16} /> : <FaTimes size={16} />}
          </button>
        </div>

        {/* Menu with independent scroll */}
        <div className="flex-1 mx-3 mb-3 bg-card shadow-lg rounded-lg flex flex-col relative overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
          <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
            <ul className="space-y-1 p-3 relative">
              {transformedLinks.map((link) => (
                <li key={link.key || link.label} className="relative">
                  {link.children ? (
                    <>
                      <button
                        onClick={() => !isCollapsed && toggleMenu(link.key)}
                        onMouseEnter={() => isCollapsed && setHoveredMenu(link.key)}
                        onMouseLeave={() => isCollapsed && setHoveredMenu(null)}
                        data-menu-key={link.key}
                        className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} w-full px-3 py-3 text-sm font-medium rounded-lg text-primary hover:bg-[#F2F1FF] hover:text-purple-700 transition-all duration-200 group`}
                        title={isCollapsed ? link.label : ''}
                      >
                        <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'}`}>
                          <span className={`${isCollapsed ? 'text-2xl' : 'text-xl'} transition-all duration-200 group-hover:scale-110`}>
                            {link.icon}
                          </span>
                          {!isCollapsed && <span className="font-medium">{link.label}</span>}
                        </div>
                        {!isCollapsed && (
                          <span className="transition-transform duration-200">
                            {openMenus.includes(link.key) ? (
                              <FaChevronDown className="text-secondary text-xs" />
                            ) : (
                              <FaChevronRight className="text-secondary text-xs" />
                            )}
                          </span>
                        )}
                      </button>

                      {!isCollapsed && openMenus.includes(link.key) && (
                        <ul className="ml-6 mt-2 space-y-1 border-l-2 border-purple-100 pl-4">
                          {link.children.map((child: any) => (
                            <li key={child.key}>
                              <NavLink
                                to={child.key}
                                className={({ isActive }) => {
                                  const pathname = window.location.pathname;
                                  const activeState = isActiveLink(
                                    child.key,
                                    isActive,
                                    pathname
                                  );
                                  return `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium
                                  transition-all duration-200 ease-in-out group
                                  ${activeState
                                      ? "bg-gradient-to-r from-purple-50 to-purple-100 text-purple-700 border-l-4 border-purple-500"
                                      : "text-secondary hover:bg-[rgba(255,255,255,0.03)] hover:text-primary"
                                    }`;
                                }}
                              >
                                <span className="text-base group-hover:scale-110 transition-transform duration-200">
                                  {child.icon}
                                </span>
                                <span>{child.label}</span>
                              </NavLink>
                            </li>
                          ))}
                        </ul>
                      )}
                    </>
                  ) : link.action ? (
                    <button
                      onClick={() => handleClick(link)}
                      className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} px-3 py-3 rounded-lg text-sm font-medium
                      transition-all duration-200 ease-in-out group text-primary hover:bg-[#F2F1FF] hover:text-purple-700`}
                      title={isCollapsed ? link.label : ''}
                    >
                      <span className={`${isCollapsed ? 'text-2xl' : 'text-xl'} transition-all duration-200 group-hover:scale-110`}>
                        {link.icon}
                      </span>
                      {!isCollapsed && <span className="font-medium">{link.label}</span>}
                    </button>
                  ) : (
                    <NavLink
                      to={link.key}
                      className={({ isActive }) => {
                        const pathname = window.location.pathname;
                        const activeState = isActiveLink(
                          link.key,
                          isActive,
                          pathname
                        );
                        return `flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} px-3 py-3 rounded-lg text-sm font-medium
                        transition-all duration-200 ease-in-out group
                        ${activeState
                            ? "bg-gradient-to-r from-purple-50 to-purple-100 text-purple-700 shadow-md"
                            : "text-primary hover:bg-[#F2F1FF] hover:text-purple-700"
                          }`;
                      }}
                      title={isCollapsed ? link.label : ''}
                    >
                      <span className={`${isCollapsed ? 'text-2xl' : 'text-xl'} transition-all duration-200 group-hover:scale-110`}>
                        {link.icon}
                      </span>
                      {!isCollapsed && <span className="font-medium">{link.label}</span>}
                    </NavLink>
                  )}
                </li>
              ))}
            </ul>
            <div className="h-4"></div>
          </div>
        </div>
      </aside>

      <div
        className={`fixed top-0 right-0 h-full max-w-lg w-full sm:w-[42rem] bg-card bg-opacity-95 backdrop-blur-xl shadow-2xl transform transition-transform duration-500 ease-out z-[9999] border-l border-theme border-opacity-50 ${sidebarOpen ? "translate-x-0" : "translate-x-full"
          }`}
      >
      </div>
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-[9998] bg-gray-900/50 backdrop-blur-sm transition-all duration-500"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </>
  );
};

export default Sidebar;

