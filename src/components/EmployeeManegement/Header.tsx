import { useState, useRef, useEffect } from 'react'
import { FaUser, FaSignOutAlt, FaBars, FaChevronDown } from "react-icons/fa";
import { Search, X, LogOut, AlertCircle, ArrowRight, ArrowLeft } from "lucide-react";
import { useLogout } from "../../hooks/useLogout";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import type { RootState } from "../../redux/store";
import { useQuickActions } from "../common/QuickAction";
import { usePageTitle } from "../../hooks/usePageTitle";

function Header({ onToggleSidebar }: { onToggleSidebar: () => void }) {
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { logout } = useLogout();
  const { userInfo } = useSelector((state: RootState) => state.userAuth);
  const navigate = useNavigate();
  const { filterActions } = useQuickActions();

  const filteredActions = filterActions(searchQuery, 'hr');
  const pageTitle = usePageTitle();

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isSearchOpen, isDropdownOpen]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (isSearchOpen) {
          setIsSearchOpen(false);
          setSearchQuery("");
          setSelectedIndex(0);
        }
        if (isDropdownOpen) {
          setIsDropdownOpen(false);
        }
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isSearchOpen, isDropdownOpen]);

  // Focus input when search opens
  useEffect(() => {
    if (isSearchOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isSearchOpen]);

  // Reset index on query change
  useEffect(() => {
    setSelectedIndex(0);
  }, [searchQuery]);

  const handleLogoutClick = () => {
    setIsDropdownOpen(false);
    setShowLogoutModal(true);
  };

  const confirmLogout = () => {
    setShowLogoutModal(false);
    logout();
  };

  const cancelLogout = () => {
    setShowLogoutModal(false);
  };

  const handleProfileClick = () => {
    setIsDropdownOpen(false);
    navigate('/admin/profile');
  };

  const handleActionSelect = (action: any) => {
    if (action.path) {
      navigate(action.path);
      setSearchQuery('');
      setIsSearchOpen(false);
      setSelectedIndex(0);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (filteredActions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev =>
          prev < filteredActions.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev =>
          prev > 0 ? prev - 1 : filteredActions.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (filteredActions.length > 0) {
          handleActionSelect(filteredActions[selectedIndex]);
        }
        break;
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (filteredActions.length > 0) {
      handleActionSelect(filteredActions[selectedIndex]);
    }
  };

  return (
    <>
      <header
        className="flex items-center justify-between px-6 py-4 shadow-sm relative z-20"
        style={{
          background: "linear-gradient(135deg, var(--accent-blue) 0%, #31a2d4 100%)"
        }}
      >
        {/* LEFT: Sidebar toggle */}
        <div className="flex items-center gap-4">
          <button
            onClick={onToggleSidebar}
            className="p-2 rounded-lg hover:bg-card/20 transition-colors !text-white"
          >
            <FaBars size={20} />
          </button>
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-lg hover:bg-card/20 transition-colors !text-white"
            title="Previous"
          >
            <ArrowLeft size={22} />
          </button>
          <button
            onClick={() => navigate(1)}
            className="p-2 rounded-lg hover:bg-card/20 transition-colors !text-white"
            title="Next"
          >
            <ArrowRight size={22} />
          </button>
        </div>

        {/* MIDDLE: Page Title */}
        <div className="flex items-center flex-1 justify-center gap-10 max-w-3xl">
          <span className="text-white font-semibold text-lg tracking-wide">
            {pageTitle || 'Employee Management'}
          </span>
        </div>


        {/* RIGHT: Search + Profile Dropdown */}
        <div className="flex items-center gap-4">
          {/* Search Button */}
          <button
            onClick={() => setIsSearchOpen(true)}
            className="p-2 rounded-lg hover:bg-card/20 transition-colors !text-white"
          >
            <Search size={20} />
          </button>

          {/* Profile Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-card/20 transition-colors !text-white"
            >
              <div className="w-8 h-8 rounded-full bg-card/20 flex items-center justify-center">
                <FaUser size={14} />
              </div>
              <span className="hidden sm:block text-sm font-medium">
                {userInfo?.userData?.name?.split(" ")[0] || "User"}
              </span>
              <FaChevronDown size={12} className={`transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {isDropdownOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-card rounded-lg shadow-xl border border-theme overflow-hidden z-50">
                <div className="px-4 py-3 border-b border-theme bg-card">
                  <p className="text-sm font-medium text-primary truncate">{userInfo?.userData?.name || "User"}</p>
                  <p className="text-xs text-secondary truncate">{userInfo?.userData?.email || "user@example.com"}</p>
                </div>
                <div className="py-1">
                  <button
                    onClick={handleProfileClick}
                    className="flex items-center gap-3 w-full px-4 py-2 text-sm text-primary hover:bg-[rgba(255,255,255,0.03)] transition-colors"
                  >
                    <FaUser size={14} className="text-secondary" />
                    Profile
                  </button>
                  <div className="border-t border-theme my-1"></div>
                  <button
                    onClick={handleLogoutClick}
                    className="flex items-center gap-3 w-full px-4 py-2 text-sm text-[#A855F7] hover:bg-red-50 transition-colors"
                  >
                    <FaSignOutAlt size={14} />
                    Logout
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* SEARCH OVERLAY */}
      {isSearchOpen && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-20 bg-black/30 backdrop-blur-sm">
          <div
            ref={searchRef}
            className="bg-card rounded-lg shadow-2xl w-full max-w-2xl mx-4"
          >
            <form onSubmit={handleSearchSubmit} className="p-4 border-b border-theme">
              <div className="relative">
                <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
                  <Search className="text-secondary" size={20} />
                </div>
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Quick Action - Type to search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="w-full pl-12 pr-12 py-3 text-lg border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)] focus:border-transparent"
                />
                <button
                  type="button"
                  onClick={() => {
                    setIsSearchOpen(false);
                    setSearchQuery("");
                    setSelectedIndex(0);
                  }}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 p-1 hover:bg-[rgba(255,255,255,0.03)] rounded-full transition-colors"
                >
                  <X className="text-secondary" size={20} />
                </button>
              </div>
            </form>

            {searchQuery.trim() !== "" && filteredActions.length > 0 && (
              <div className="max-h-[400px] overflow-y-auto">
                <div className="py-2">
                  {filteredActions.map((action, index) => (
                    <button
                      key={action.id}
                      onClick={() => handleActionSelect(action)}
                      className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-blue-50 transition-all duration-150 border-l-2 ${index === selectedIndex
                        ? 'bg-card border-blue-500'
                        : 'border-transparent hover:border-blue-300'
                        }`}
                    >
                      <div className={`flex-shrink-0 ${index === selectedIndex ? 'scale-110' : ''} transition-transform`}>
                        <div className={`p-2 rounded-lg ${action.type === 'create' ? 'bg-green-100 text-green-700' :
                          action.type === 'navigation' ? 'bg-blue-100 text-blue-700' :
                            'bg-card text-primary'
                          }`}>
                          {action.icon}
                        </div>
                      </div>
                      <div className="flex-1 text-left min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-primary truncate">{action.title}</span>
                          {action.type === 'create' && (
                            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium flex-shrink-0">
                              New
                            </span>
                          )}
                          {action.type === 'navigation' && (
                            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium flex-shrink-0">
                              Navigate
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-secondary mt-0.5 truncate">
                          {action.description}
                        </p>
                      </div>
                      <ArrowRight
                        className={`flex-shrink-0 transition-all ${index === selectedIndex
                          ? 'text-[#00D1FF] opacity-100 translate-x-0'
                          : 'text-secondary opacity-0 -translate-x-1'
                          }`}
                        size={18}
                      />
                    </button>
                  ))}
                </div>
                <div className="border-t border-theme px-4 py-2 bg-card">
                  <p className="text-xs text-secondary text-center">
                    {filteredActions.length} result{filteredActions.length !== 1 ? 's' : ''} • Use ↑↓ to navigate, Enter to select
                  </p>
                </div>
              </div>
            )}

            {searchQuery.trim() !== "" && filteredActions.length === 0 && (
              <div className="p-8">
                <p className="text-sm text-secondary text-center">
                  No actions found for "{searchQuery}"
                </p>
              </div>
            )}

            {searchQuery.trim() === "" && (
              <div className="p-8">
                <p className="text-sm text-secondary text-center">
                  Type to search for actions, pages, or create new items
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* LOGOUT CONFIRMATION MODAL */}
      {showLogoutModal && (
        <div
          className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={cancelLogout}
        >
          <div
            className="bg-card rounded-2xl shadow-2xl max-w-md w-full mx-4 transform transition-all"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-6 border-b border-theme">
              <div className="flex items-center gap-4">
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                  <LogOut className="text-[#A855F7]" size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-primary">Confirm Logout</h3>
                  <p className="text-sm text-secondary mt-1">Are you sure you want to logout?</p>
                </div>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6">
              <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <AlertCircle className="text-amber-600 flex-shrink-0 mt-0.5" size={20} />
                <p className="text-sm text-amber-800">
                  You'll need to sign in again to access your account after logging out.
                </p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-theme flex justify-end gap-3">
              <button
                onClick={cancelLogout}
                className="px-6 py-2.5 text-primary bg-card hover:bg-gray-200 rounded-lg transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={confirmLogout}
                className="px-6 py-2.5 text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors font-medium flex items-center gap-2 shadow-lg shadow-red-500/30"
              >
                <LogOut size={18} />
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default Header
