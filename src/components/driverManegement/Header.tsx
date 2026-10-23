import { useState, useRef, useEffect, useCallback } from 'react'
import { FaSignOutAlt, FaBars } from "react-icons/fa";
import { LogOut, Search, X, ArrowRight, ArrowLeft } from "lucide-react";
import { useLogout } from "../../hooks/useLogout";
import { useNavigate } from "react-router-dom";
import { getUserRole } from "../../utils/auth";
import { useQuickActions } from "../common/QuickAction";
import { usePageTitle } from "../../hooks/usePageTitle";
import { useNotifications } from "../../hooks/useNotifications";
import { NotificationBell } from "../common/NotificationPanel";

function Header({ onToggleSidebar }: { onToggleSidebar: () => void }) {
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);

  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const notificationRef = useRef<HTMLDivElement>(null);

  const { logout } = useLogout();
  const navigate = useNavigate();
  const userRole = getUserRole();
  const isHR = userRole === 'hr';
  const { filterActions } = useQuickActions();
  const filteredActions = filterActions(searchQuery, isHR ? 'hr' : 'admin');
  const pageTitle = usePageTitle();

  const basePath = isHR ? '/Management' : '/admin/Management';

  const { notifications, loading: notifLoading, totalCount } = useNotifications({
    categories: ['employee_doc', 'driver_doc', 'vehicle_doc', 'test_approval'],
    basePath,
  });

  // Close search on click outside
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setIsSearchOpen(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(e.target as Node)) {
        setIsNotificationOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Escape closes search, Ctrl+K opens search
  useEffect(() => {
    const keyHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsSearchOpen(false);
        setSearchQuery('');
        setSelectedIndex(0);
        setIsNotificationOpen(false);
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen(prev => !prev);
      }
    };
    document.addEventListener('keydown', keyHandler);
    return () => document.removeEventListener('keydown', keyHandler);
  }, []);

  useEffect(() => { setSelectedIndex(0); }, [searchQuery]);
  useEffect(() => { if (isSearchOpen) setTimeout(() => inputRef.current?.focus(), 100); }, [isSearchOpen]);

  const handleLogoutClick = useCallback(() => { setShowLogoutModal(true); }, []);
  const confirmLogout = useCallback(() => { setShowLogoutModal(false); logout(); }, [logout]);
  const cancelLogout = useCallback(() => { setShowLogoutModal(false); }, []);

  const handleActionSelect = useCallback((action: any) => {
    if (action.path) {
      navigate(action.path);
      setSearchQuery('');
      setIsSearchOpen(false);
      setSelectedIndex(0);
    }
  }, [navigate]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (filteredActions.length === 0) return;
    switch (e.key) {
      case 'ArrowDown': e.preventDefault(); setSelectedIndex(prev => prev < filteredActions.length - 1 ? prev + 1 : 0); break;
      case 'ArrowUp': e.preventDefault(); setSelectedIndex(prev => prev > 0 ? prev - 1 : filteredActions.length - 1); break;
      case 'Enter': e.preventDefault(); if (filteredActions.length > 0) handleActionSelect(filteredActions[selectedIndex]); break;
    }
  }, [filteredActions, selectedIndex, handleActionSelect]);

  const handleSearchSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (filteredActions.length > 0) handleActionSelect(filteredActions[selectedIndex]);
  }, [filteredActions, selectedIndex, handleActionSelect]);

  return (
    <>
      <header className="flex items-center justify-between px-6 py-4 shadow-sm relative z-20 bg-main">

        {/* LEFT: Sidebar toggle + navigation */}
        <div className="flex items-center gap-4">
          <button onClick={onToggleSidebar} className="header-btn" title="Toggle Sidebar">
            <FaBars size={20} />
          </button>
          <button onClick={() => navigate(-1)} className="header-btn" title="Previous">
            <ArrowLeft size={22} />
          </button>
          <button onClick={() => navigate(1)} className="header-btn" title="Next">
            <ArrowRight size={22} />
          </button>
        </div>

        {/* CENTER: Page Title */}
        <div className="absolute left-1/2 -translate-x-1/2">
          <span className="text-primary font-semibold text-lg tracking-wide">
            {pageTitle || 'HR Management'}
          </span>
        </div>

        {/* RIGHT: Notification + Search + Logout */}
        <div className="flex items-center gap-4">
          {/* Notification Bell */}
          <NotificationBell
            notifications={notifications}
            loading={notifLoading}
            totalCount={totalCount}
            isOpen={isNotificationOpen}
            onToggle={() => setIsNotificationOpen(o => !o)}
            onClose={() => setIsNotificationOpen(false)}
            containerRef={notificationRef}
          />

          {/* Search Button */}
          <button
            onClick={() => setIsSearchOpen(true)}
            className="flex items-center gap-3 px-4 py-2 rounded-lg bg-[var(--bg-card)] border border-[rgba(255,255,255,0.08)] hover:border-[#42aeec]/40 text-secondary hover:text-primary transition-all"
            title="Search (Ctrl+K)"
          >
            <Search size={16} className="flex-shrink-0" />
            <span className="text-sm hidden sm:block">Search...</span>
            <kbd className="text-xs bg-[rgba(255,255,255,0.06)] px-2 py-0.5 rounded text-secondary font-mono hidden sm:block">Ctrl K</kbd>
          </button>

          {/* Logout */}
          <button onClick={handleLogoutClick} className="header-btn" title="Logout">
            <FaSignOutAlt size={18} />
          </button>
        </div>
      </header>

      {/* SEARCH OVERLAY */}
      {isSearchOpen && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-20 bg-black/50 backdrop-blur-md">
          <div ref={searchRef} className="bg-card text-primary border border-theme rounded-xl shadow-2xl w-full max-w-2xl mx-4">
            <form onSubmit={handleSearchSubmit} className="p-4 border-b border-theme">
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2">
                  <Search className="text-secondary" size={20} />
                </div>
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Quick Action - Type to search..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="w-full pl-12 pr-12 py-3 text-lg border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)] focus:border-transparent"
                />
                <button
                  type="button"
                  onClick={() => { setIsSearchOpen(false); setSearchQuery(''); setSelectedIndex(0); }}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 p-1 hover:bg-[rgba(255,255,255,0.03)] rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </form>

            {searchQuery.trim() !== '' && filteredActions.length > 0 && (
              <div className="max-h-[400px] overflow-y-auto">
                <div className="py-2">
                  {filteredActions.map((action, index) => (
                    <button
                      key={action.id}
                      onClick={() => handleActionSelect(action)}
                      className={`w-full flex items-center gap-3 px-4 py-3 transition-all duration-150 border-l-2 ${
                        index === selectedIndex
                          ? 'active-accent border-[var(--accent-blue)]'
                          : 'border-transparent hover-accent'
                      }`}
                    >
                      <div className={`flex-shrink-0 ${index === selectedIndex ? 'scale-110' : ''}`}>
                        <div className={`p-2 rounded-lg ${
                          action.type === 'create'
                            ? 'bg-[rgba(0,255,163,0.1)] text-[var(--accent-green)]'
                            : action.type === 'navigation'
                            ? 'bg-[rgba(0,209,255,0.1)] text-[var(--accent-blue)]'
                            : 'bg-[rgba(255,255,255,0.05)] text-secondary'
                        }`}>
                          {action.icon}
                        </div>
                      </div>
                      <div className="flex-1 text-left min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-primary truncate">{action.title}</span>
                          {action.type === 'create' && (
                            <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-[rgba(0,255,163,0.1)] text-[var(--accent-green)]">New</span>
                          )}
                          {action.type === 'navigation' && (
                            <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-[rgba(0,209,255,0.1)] text-[var(--accent-blue)]">Navigate</span>
                          )}
                        </div>
                        <p className="text-sm text-secondary mt-0.5 truncate">{action.description}</p>
                      </div>
                      <ArrowRight
                        className={`flex-shrink-0 transition-all ${
                          index === selectedIndex ? 'text-[var(--accent-blue)] opacity-100' : 'text-secondary opacity-0'
                        }`}
                        size={18}
                      />
                    </button>
                  ))}
                </div>
                <div className="border-t border-theme px-4 py-2 bg-card">
                  <p className="text-xs text-secondary text-center">
                    {filteredActions.length} result{filteredActions.length !== 1 ? 's' : ''} • Use ↑↓ to navigate
                  </p>
                </div>
              </div>
            )}

            {searchQuery.trim() !== '' && filteredActions.length === 0 && (
              <div className="p-8">
                <p className="text-sm text-secondary text-center">No actions found for "{searchQuery}"</p>
              </div>
            )}

            {searchQuery.trim() === '' && (
              <div className="p-8">
                <p className="text-sm text-secondary text-center">Type to search for actions, pages, or create new items</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* LOGOUT CONFIRMATION MODAL */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-[var(--bg-card)] border border-[rgba(255,255,255,0.08)] rounded-xl shadow-2xl w-full max-w-sm mx-4 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-red-500/10">
                <LogOut size={20} className="text-red-400" />
              </div>
              <h3 className="text-base font-semibold text-primary">Confirm Logout</h3>
            </div>
            <p className="text-sm text-secondary mb-6">Are you sure you want to log out?</p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={cancelLogout}
                className="px-4 py-2 text-sm rounded-lg border border-[rgba(255,255,255,0.08)] text-secondary hover:text-primary hover:border-[rgba(255,255,255,0.2)] transition-all"
              >
                Cancel
              </button>
              <button
                onClick={confirmLogout}
                className="px-4 py-2 text-sm rounded-lg bg-red-500 hover:bg-red-600 text-white font-medium transition-all"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default Header;
