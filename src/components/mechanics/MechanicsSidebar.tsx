import React, { useMemo } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { FaClipboardList, FaTachometerAlt, FaUser, FaCheckCircle, FaWrench, FaSatelliteDish } from "react-icons/fa";
import Logo from "../../assets/images/LI.png";
import FullLogo from "../../assets/FleetGo.png";
import { getDashboardRoute } from "../../utils/auth";
import { useSelector, shallowEqual } from "react-redux";
import type { RootState } from "../../redux/store";

interface MechanicsSidebarProps {
  isCollapsed?: boolean;
  basePath?: string;
}

const getSidebarLinks = (basePath: string) => [
  {
    key: `${basePath}/dashboard`,
    label: "Dashboard",
    icon: <FaTachometerAlt />,
  },
  {
    key: `${basePath}/orders`,
    label: "Orders",
    icon: <FaClipboardList />,
  },
  {
    key: `${basePath}/completed-orders`,
    label: "Completed Orders",
    icon: <FaCheckCircle />,
  },
  {
    key: `${basePath}/services`,
    label: "Services",
    icon: <FaWrench />,
  },
  {
    key: `${basePath}/profile`,
    label: "Profile",
    icon: <FaUser />,
  },
  {
    key: "/gps-dashboard",
    label: "GPS Dashboard",
    icon: <FaSatelliteDish />,
  },
];

const MechanicsSidebar: React.FC<MechanicsSidebarProps> = ({
  isCollapsed = false,
  basePath = "/admin/mechanics",
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { userInfo } = useSelector((state: RootState) => state.userAuth, shallowEqual);

  const sidebarLinks = useMemo(() => getSidebarLinks(basePath), [basePath]);

  const isActiveLink = (linkKey: string, isActive: boolean, pathname: string) => {
    if (linkKey === `${basePath}/dashboard`) {
      return pathname === linkKey || pathname === basePath;
    }
    return isActive;
  };

  return (
    <>
      <style>{`
        .mech-sidebar-scroll::-webkit-scrollbar { width: 4px; }
        .mech-sidebar-scroll::-webkit-scrollbar-track { background: transparent; }
        .mech-sidebar-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 2px; }
        .mech-sidebar-scroll::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.15); }
        .mech-sidebar-item-active {
          background: linear-gradient(to right, #06377a 0%, #06377a 55%, #121A2B 100%);
          border-radius: 8px;
        }
        .mech-sidebar-item-hover:hover:not(.mech-sidebar-item-active) {
          background: rgba(13, 71, 200, 0.15);
          border-radius: 8px;
        }
        .mech-sidebar-icon-active {
          filter: drop-shadow(0 0 5px rgba(255,255,255,0.7)) brightness(1.3);
        }
      `}</style>

      <aside
        className={`h-screen flex flex-col bg-[var(--bg-card)] text-[var(--text-primary)] relative z-10 shadow-sm transition-all duration-300 ${
          isCollapsed ? "w-20" : "w-56"
        }`}
      >
        {/* Logo */}
        <div className="flex-shrink-0 flex justify-center items-center py-4 border-b border-theme">
          <div
            className="cursor-pointer flex items-center justify-center"
            onClick={() => navigate(getDashboardRoute())}
          >
            {isCollapsed ? (
              <img src={Logo} alt="FleetGo Logo" className="h-auto w-6 transition-all duration-300" />
            ) : (
              <img src={FullLogo} alt="FleetGo Logo" className="h-auto max-h-10 transition-all duration-300" />
            )}
          </div>
        </div>

        {/* Nav Links */}
        <div
          className="flex-1 flex flex-col relative overflow-y-auto overflow-x-hidden mech-sidebar-scroll min-h-0"
          style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(255,255,255,0.08) transparent" }}
        >
          <div className="flex-1">
            <ul className="py-2 space-y-0.5">
              {sidebarLinks.map((link) => (
                <li key={link.key} className="px-2">
                  <NavLink
                    to={link.key}
                    title={link.label}
                    className={({ isActive }) => {
                      const pathname = location.pathname;
                      const activeState = isActiveLink(link.key, isActive, pathname);
                      return `w-full transition-all duration-200 group rounded-lg mech-sidebar-item-hover ${
                        isCollapsed
                          ? "flex flex-col items-center justify-center px-2 py-2"
                          : "flex items-center px-3 py-2 gap-3"
                      } ${activeState ? "mech-sidebar-item-active" : ""}`;
                    }}
                  >
                    {({ isActive }) => {
                      const pathname = location.pathname;
                      const activeState = isActiveLink(link.key, isActive, pathname);
                      return (
                        <>
                          <span
                            className={`transition-all duration-200 flex-shrink-0 ${
                              isCollapsed ? "text-2xl mb-1" : "text-xl"
                            } ${
                              activeState
                                ? "text-white mech-sidebar-icon-active"
                                : "text-secondary group-hover:text-white"
                            }`}
                          >
                            {link.icon}
                          </span>
                          {!isCollapsed && (
                            <span
                              className={`flex-1 text-sm font-medium text-left ${
                                activeState ? "text-white" : "text-primary group-hover:text-white"
                              }`}
                            >
                              {link.label}
                            </span>
                          )}
                        </>
                      );
                    }}
                  </NavLink>
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
                title={userInfo?.userData?.name || "Profile"}
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
                  {userInfo?.userData?.name || "Mechanic"}
                </p>
                <p className="text-xs text-secondary truncate">Mechanic</p>
              </button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
};

export default MechanicsSidebar;