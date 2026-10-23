import React, { useState, useMemo, useCallback } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { HealthSafetySidebarLinks } from "../../utils/HealthSafetySidebarLinks";
import { FaChevronDown, FaChevronRight, FaUser } from "react-icons/fa";
import Logo from "../../assets/images/LI.png";
import FullLogo from "../../assets/FleetGo.png";
import { getUserRole, getDashboardRoute } from "../../utils/auth";
import { useSelector, shallowEqual } from "react-redux";
import type { RootState } from "../../redux/store";

interface SidebarProps {
  isCollapsed?: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ isCollapsed = false }) => {
  const [openMenus, setOpenMenus] = useState<string[]>([]);
  const navigate = useNavigate();
  const location = useLocation();
  const userRole = getUserRole();
  const isSafetyOfficer = userRole === "safety officer";
  const { userInfo } = useSelector((state: RootState) => state.userAuth, shallowEqual);

  const basePath = isSafetyOfficer ? "/healthandsafety" : "/admin/healthandsafety";

  // Build transformed sidebar links with full paths
  const sidebarLinks = useMemo(() => {
    const mapLink = (link: any): any => {
      const fullPath = link.key.startsWith('/')
        ? link.key
        : `${basePath}/${link.key}`;
      const updated = { ...link, key: fullPath };
      if (link.children) updated.children = link.children.map(mapLink);
      return updated;
    };
    return HealthSafetySidebarLinks.map(mapLink);
  }, [isSafetyOfficer]);

  // Parent menu toggle
  const toggleMenu = useCallback((key: string) => {
    setOpenMenus((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  }, []);

  // Active route logic
  const isActiveLink = (linkKey: string, isActive: boolean, pathname: string) => {
    if (linkKey === `${basePath}/health-safety-summary`) {
      return pathname === basePath || pathname === linkKey;
    }
    return isActive;
  };

  return (
    <>
      <style>{`
        .health-sidebar-scroll::-webkit-scrollbar { width: 4px; }
        .health-sidebar-scroll::-webkit-scrollbar-track { background: transparent; }
        .health-sidebar-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 2px; }
        .health-sidebar-scroll::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.15); }
        .health-sidebar-item-active {
          background: linear-gradient(to right, #06377a 0%, #06377a 55%, #121A2B 100%);
          border-radius: 8px;
        }
        .health-sidebar-item-hover:hover:not(.health-sidebar-item-active) {
          background: rgba(13, 71, 200, 0.15);
          border-radius: 8px;
        }
        .health-sidebar-icon-active {
          filter: drop-shadow(0 0 5px rgba(255,255,255,0.7)) brightness(1.3);
        }
      `}</style>

      <aside className={`h-screen flex flex-col bg-[var(--bg-card)] text-[var(--text-primary)] relative z-10 shadow-sm transition-all duration-300 ${isCollapsed ? 'w-20' : 'w-56'}`}>

        {/* Logo */}
        <div className="flex-shrink-0 flex justify-center items-center py-4 border-b border-theme">
          <div className="cursor-pointer flex items-center justify-center" onClick={() => navigate(getDashboardRoute())}>
            {isCollapsed ? (
              <img src={Logo} alt="FleetGo Logo" className="h-auto w-6 transition-all duration-300" />
            ) : (
              <img src={FullLogo} alt="FleetGo Logo" className="h-auto max-h-10 transition-all duration-300" />
            )}
          </div>
        </div>

        {/* Menu with scroll */}
        <div
          className="flex-1 flex flex-col relative overflow-y-auto overflow-x-hidden health-sidebar-scroll min-h-0"
          style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.08) transparent' }}
        >
          <div className="flex-1">
            <ul className="py-2 space-y-0.5">
              {sidebarLinks.map((link: any) => (
                <li key={link.key || link.label} className="px-2">
                  {link.children ? (
                    <>
                      {/* PARENT ITEM */}
                      <button
                        onClick={() => toggleMenu(link.key)}
                        className={`w-full transition-all duration-200 group rounded-lg health-sidebar-item-hover ${
                          isCollapsed
                            ? 'flex flex-col items-center justify-center px-2 py-2'
                            : 'flex items-center px-3 py-2 gap-3'
                        } ${openMenus.includes(link.key) ? 'health-sidebar-item-active' : ''}`}
                        title={link.label}
                      >
                        <span className={`transition-all duration-200 flex-shrink-0 ${isCollapsed ? 'text-2xl mb-1' : 'text-xl'} ${
                          openMenus.includes(link.key) ? 'text-white health-sidebar-icon-active' : 'text-secondary group-hover:text-white'
                        }`}>
                          {link.icon}
                        </span>
                        {!isCollapsed && (
                          <>
                            <span className={`flex-1 text-sm font-medium text-left transition-colors ${
                              openMenus.includes(link.key) ? 'text-white' : 'text-primary group-hover:text-white'
                            }`}>
                              {link.label}
                            </span>
                            <span className={`flex-shrink-0 text-xs ${openMenus.includes(link.key) ? 'text-white/70' : 'text-secondary'}`}>
                              {openMenus.includes(link.key) ? <FaChevronDown /> : <FaChevronRight />}
                            </span>
                          </>
                        )}
                      </button>

                      {/* CHILD LINKS */}
                      {!isCollapsed && openMenus.includes(link.key) && (
                        <ul className="mt-0.5 space-y-0.5">
                          {link.children.map((child: any) => {
                            const pathname = location.pathname;
                            const activeState = pathname === child.key || pathname.startsWith(child.key + '/');
                            return (
                              <li key={child.key} className="px-1">
                                <NavLink
                                  to={child.key}
                                  className={`flex items-center w-full px-3 py-1.5 pl-9 gap-3 text-sm font-medium rounded-lg transition-all duration-200 health-sidebar-item-hover ${
                                    activeState ? 'health-sidebar-item-active text-white' : 'text-secondary'
                                  }`}
                                >
                                  <span className="w-1.5 h-1.5 rounded-full bg-current opacity-60 flex-shrink-0" />
                                  <span className="flex-1 text-left">{child.label}</span>
                                </NavLink>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </>
                  ) : (
                    /* NORMAL LINK */
                    <NavLink
                      to={link.key}
                      title={link.label}
                      className={({ isActive }) => {
                        const pathname = location.pathname;
                        const activeState = isActiveLink(link.key, isActive, pathname);
                        return `w-full transition-all duration-200 group rounded-lg health-sidebar-item-hover ${
                          isCollapsed
                            ? 'flex flex-col items-center justify-center px-2 py-2'
                            : 'flex items-center px-3 py-2 gap-3'
                        } ${activeState ? 'health-sidebar-item-active' : ''}`;
                      }}
                    >
                      {({ isActive }) => {
                        const pathname = location.pathname;
                        const activeState = isActiveLink(link.key, isActive, pathname);
                        return (
                          <>
                            <span className={`transition-all duration-200 flex-shrink-0 ${isCollapsed ? 'text-2xl mb-1' : 'text-xl'} ${
                              activeState ? 'text-white health-sidebar-icon-active' : 'text-secondary group-hover:text-white'
                            }`}>
                              {link.icon}
                            </span>
                            {!isCollapsed && (
                              <span className={`flex-1 text-sm font-medium text-left ${
                                activeState ? 'text-white' : 'text-primary group-hover:text-white'
                              }`}>
                                {link.label}
                              </span>
                            )}
                          </>
                        );
                      }}
                    </NavLink>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Profile section — fixed at bottom */}
        <div className="flex-shrink-0 border-t border-[rgba(255,255,255,0.08)]">
          {isCollapsed ? (
            <div className="flex flex-col items-center gap-2 py-3 px-2">
              <button
                onClick={() => navigate(`${basePath}/profile`)}
                className="w-9 h-9 rounded-full bg-[#42aeec]/20 flex items-center justify-center text-[#42aeec] hover:bg-[#42aeec]/30 transition-all"
                title={userInfo?.userData?.name || 'Profile'}
              >
                <FaUser size={14} />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3 px-4 py-3">
              <div className="w-9 h-9 rounded-full bg-[#42aeec]/20 flex-shrink-0 flex items-center justify-center text-[#42aeec]">
                <FaUser size={14} />
              </div>
              <button
                onClick={() => navigate(`${basePath}/profile`)}
                className="flex-1 text-left min-w-0 hover:opacity-80 transition-opacity"
              >
                <p className="text-sm font-semibold text-primary truncate">
                  {userInfo?.userData?.name || 'User'}
                </p>
                <p className="text-xs text-secondary truncate">
                  {isSafetyOfficer ? 'Safety Officer' : 'Admin'}
                </p>
              </button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
};

export default Sidebar;