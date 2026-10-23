// components/Header.jsx
import { useState, useRef, useEffect } from "react";
import { FaUserCircle, FaSignOutAlt, FaUser, FaCog } from "react-icons/fa";
import { Search, X, ArrowRight, ArrowLeft } from "lucide-react";
import { useLogout } from "../../hooks/useLogout";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import type { RootState } from "../../redux/store";
import { useQuickActions } from "../common/QuickAction";
import { usePageTitle } from "../../hooks/usePageTitle";

const Header = () => {
    const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedIndex, setSelectedIndex] = useState(0);

    const dropdownRef = useRef<HTMLDivElement>(null);
    const searchRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const { logout } = useLogout();
    const { superAdminInfo } = useSelector((state: RootState) => state.superAdminAuth);
    const navigate = useNavigate();
    const { filterActions } = useQuickActions();
    const pageTitle = usePageTitle();

    const filteredActions = filterActions(searchQuery, 'superadmin');

    // Close dropdowns when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsUserDropdownOpen(false);
            }
            if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
                setIsSearchOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isSearchOpen]);

    // Handle escape key
    useEffect(() => {
        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape' && isSearchOpen) {
                setIsSearchOpen(false);
                setSearchQuery("");
                setSelectedIndex(0);
            }
        };
        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [isSearchOpen]);

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


    const handleLogout = () => {
        logout();
        setIsUserDropdownOpen(false);
    };

    const handleProfileClick = () => {
        navigate('/superadmin/systemsetting');
        setIsUserDropdownOpen(false);
    };

    const handleSettingsClick = () => {
        navigate('/superadmin/systemsetting');
        setIsUserDropdownOpen(false);
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
        <header className="flex items-center justify-between px-6 py-4 bg-card shadow-sm border-b border-theme relative">
            {/* Left side */}
            <div className="flex items-center gap-2">
                <button
                    onClick={() => navigate(-1)}
                    className="p-2 rounded-full hover:bg-[rgba(255,255,255,0.03)] transition-colors"
                    title="Previous"
                >
                    <ArrowLeft className="w-4 h-4 text-secondary" />
                </button>
                <button
                    onClick={() => navigate(1)}
                    className="p-2 rounded-full hover:bg-[rgba(255,255,255,0.03)] transition-colors"
                    title="Next"
                >
                    <ArrowRight className="w-4 h-4 text-secondary" />
                </button>
            </div>

            {pageTitle && (
                <div className="absolute left-1/2 -translate-x-1/2 pointer-events-none">
                    <span className="text-primary font-semibold text-lg tracking-wide">{pageTitle}</span>
                </div>
            )}

            {/* Right side - Icons */}
            <div className="flex items-center gap-4 relative">

                {/* Search Button */}
                <button
                    onClick={() => setIsSearchOpen(true)}
                    className="p-2 rounded-full hover:bg-[rgba(255,255,255,0.03)] transition-colors"
                >
                    <Search className="w-5 h-5 text-secondary" />
                </button>

                <div className="relative" ref={dropdownRef}>
                    <button
                        onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
                        className="p-2 rounded-full hover:bg-[rgba(255,255,255,0.03)] transition-colors"
                        aria-label="User menu"
                    >
                        <FaUserCircle className="w-6 h-6 text-secondary cursor-pointer" />
                    </button>

                    {/* User Dropdown */}
                    {isUserDropdownOpen && (
                        <>
                            {/* Backdrop */}
                            <div
                                className="fixed inset-0 z-[9998]"
                                onClick={() => setIsUserDropdownOpen(false)}
                            />
                            <div
                                className="absolute right-0 mt-2 w-56 bg-card rounded-lg shadow-xl border border-theme z-[9999]"
                                onClick={(e) => e.stopPropagation()}
                            >
                                {/* User Info */}
                                <div className="px-4 py-3 border-b border-theme" style={{ backgroundColor: 'rgba(17,131,224,0.06)' }}>
                                    <p className="text-sm font-semibold text-primary capitalize">
                                        {superAdminInfo?.userData?.name || 'SuperAdmin'}
                                    </p>
                                    <p className="text-xs text-secondary truncate mt-0.5">
                                        {superAdminInfo?.userData?.email || 'superadmin@test.com'}
                                    </p>
                                </div>

                                {/* Menu Items */}
                                <div className="py-1">
                                    <button
                                        onClick={handleProfileClick}
                                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-primary hover:bg-[rgba(255,255,255,0.03)] transition-colors text-left"
                                    >
                                        <FaUser className="w-4 h-4" />
                                        Profile
                                    </button>
                                    <button
                                        onClick={handleSettingsClick}
                                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-primary hover:bg-[rgba(255,255,255,0.03)] transition-colors text-left"
                                    >
                                        <FaCog className="w-4 h-4" />
                                        Settings
                                    </button>
                                    <div className="border-t border-theme my-1"></div>
                                    <button
                                        onClick={handleLogout}
                                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-[var(--accent-red)] hover:opacity-80 transition-colors text-left"
                                    >
                                        <FaSignOutAlt className="w-4 h-4" />
                                        Logout
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>

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
                                            className={`w-full flex items-center gap-3 px-4 py-3 transition-all duration-150 border-l-2 ${index === selectedIndex
                                                ? 'border-[var(--accent-navyblue)]'
                                                : 'border-transparent'
                                                }`}
                                        style={index === selectedIndex
                                            ? { backgroundColor: 'rgba(17,131,224,0.08)' }
                                            : undefined
                                        }
                                        >
                                            <div className={`flex-shrink-0 ${index === selectedIndex ? 'scale-110' : ''} transition-transform`}>
                                                <div className={`p-2 rounded-lg ${action.type === 'create' ? 'text-[#00FFA3]' :
                                                    action.type === 'navigation' ? 'text-[var(--accent-navyblue)]' :
                                                        'text-primary'
                                                    }`} style={{ backgroundColor: action.type === 'create' ? 'rgba(0,255,163,0.1)' : action.type === 'navigation' ? 'rgba(17,131,224,0.1)' : 'rgba(255,255,255,0.05)' }}>
                                                    {action.icon}
                                                </div>
                                            </div>
                                            <div className="flex-1 text-left min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-semibold text-primary truncate">{action.title}</span>
                                                    {action.type === 'create' && (
                                                        <span className="text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 text-[#00FFA3]" style={{ backgroundColor: 'rgba(0,255,163,0.1)' }}>
                                                            New
                                                        </span>
                                                    )}
                                                    {action.type === 'navigation' && (
                                                        <span className="text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 text-[var(--accent-navyblue)]" style={{ backgroundColor: 'rgba(17,131,224,0.1)' }}>
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
        </header>
    );
};

export default Header;
