import React, { useState, useMemo, useEffect, useRef } from 'react';
import type { CSSProperties } from 'react';
import { Search, Filter, Calendar, Users, DollarSign, Clock, TrendingUp, MapPin, FileText, Eye, X, User as UserIcon, Mail, Briefcase, AlertCircle, Download } from 'lucide-react';
import { FaCheckCircle, FaTimes } from 'react-icons/fa';
import ExcelJS from 'exceljs';
import { fetchUserProfiles, type UserProfileDto, type UserProfilesTimeRange } from '../../../../axios/api/hr.userProfiles';
import { FLEET_COLORS } from '../../fleetMaintenance/colorUtils';

type TimePeriod = UserProfilesTimeRange;
type UserRole =
    | 'driver'
    | 'dispatcher'
    | 'hr'
    | 'reporter'
    | 'Maintenance Crew (Mechanics)'
    | 'Fleet Maintenance Manager'
    | 'Compliance Manager'
    | 'all';

type UserProfile = UserProfileDto & { role: UserRole | string };

type ProfileTimePeriod = '1week' | '2weeks' | '1month' | '6months' | '1year' | '2years';

const UserProfilesPortfolio: React.FC = () => {
    const ACCENT_PRIMARY = FLEET_COLORS.primary;
    const ACCENT_DARK = FLEET_COLORS.dark;
    const ACCENT_GRADIENT = FLEET_COLORS.gradient;
    const ACCENT_VARS = {
        '--accent-color': ACCENT_PRIMARY,
        '--accent-dark': ACCENT_DARK
    } as CSSProperties & { '--accent-color': string; '--accent-dark': string };
    const focusRingStyle = {
        '--tw-ring-color': ACCENT_PRIMARY
    } as CSSProperties & { '--tw-ring-color': string };

    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(searchTerm);
    const [timePeriod, setTimePeriod] = useState<TimePeriod>('1month');
    const [selectedRole, setSelectedRole] = useState<UserRole>('all');
    const [profiles, setProfiles] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [requiresCompanySetup, setRequiresCompanySetup] = useState(false);
    const [lastFetchedRange, setLastFetchedRange] = useState<{ startDate?: string; endDate?: string } | null>(null);
    const [, setPagination] = useState<{ currentPage: number; totalItems: number; totalPages: number }>({
        currentPage: 1,
        totalItems: 0,
        totalPages: 0
    });
    const [selectedProfile, setSelectedProfile] = useState<UserProfile | null>(null);
    const [showProfileSidebar, setShowProfileSidebar] = useState(false);
    const [profileTimePeriod, setProfileTimePeriod] = useState<ProfileTimePeriod>('1month');
    const PAGE_SIZE = 100;

    // Refs for scrollbar synchronization
    const topScrollRef = useRef<HTMLDivElement>(null);
    const bottomScrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedSearchTerm(searchTerm.trim());
        }, 400);
        return () => clearTimeout(handler);
    }, [searchTerm]);

    useEffect(() => {
        let isMounted = true;

        const loadProfiles = async () => {
            setLoading(true);
            setError(null);
            try {
                const response = await fetchUserProfiles({
                    search: debouncedSearchTerm || undefined,
                    role: selectedRole !== 'all' ? selectedRole : undefined,
                    timeRange: timePeriod,
                    page: 1,
                    limit: PAGE_SIZE
                });

                if (!isMounted) return;

                if (response.success) {
                    // Filter out drivers, customers, operators, and salespersons for Employee Portfolio
                    const restrictedRoles = ['driver', 'customer', 'operator', 'salesperson'];
                    const filteredData = ((response.data as UserProfileDto[]) || []).filter(
                        (profile) => !restrictedRoles.includes(profile.role?.toLowerCase() || '')
                    ) as UserProfile[];
                    setProfiles(filteredData);
                    setRequiresCompanySetup(!!response.requiresCompanySetup);
                    setPagination({
                        currentPage: response.pagination?.currentPage || 1,
                        totalItems: filteredData.length,
                        totalPages: response.pagination?.totalPages || 1
                    });
                    setLastFetchedRange(response.filters || null);
                } else {
                    setProfiles([]);
                    setRequiresCompanySetup(!!response.requiresCompanySetup);
                    setError(response.message || 'Failed to fetch employee profiles');
                }
            } catch (err: any) {
                if (!isMounted) return;
                const message = err?.response?.data?.message || err?.message || 'Failed to fetch employee profiles';
                setError(message);
                setProfiles([]);
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        };

        loadProfiles();

        return () => {
            isMounted = false;
        };
    }, [debouncedSearchTerm, selectedRole, timePeriod]);

    useEffect(() => {
        if (!selectedProfile) return;
        const updated = profiles.find((profile) => profile._id === selectedProfile._id);
        if (!updated) {
            setShowProfileSidebar(false);
            setSelectedProfile(null);
        } else if (updated !== selectedProfile) {
            setSelectedProfile(updated);
        }
    }, [profiles, selectedProfile]);

    const filteredProfiles = profiles;
    const showDriverColumns = selectedRole === 'driver';
    const summaryGridCols = showDriverColumns ? 'lg:grid-cols-5' : 'lg:grid-cols-4';
    const emptyStateMessage = requiresCompanySetup
        ? 'Complete your company setup to start seeing employee records.'
        : 'No employees found matching your criteria';

    // Sync scroll between top and bottom scrollbars
    useEffect(() => {
        const topScroll = topScrollRef.current;
        const bottomScroll = bottomScrollRef.current;

        if (!topScroll || !bottomScroll) return;

        let isScrolling = false;

        const handleTopScroll = () => {
            if (isScrolling) return;
            isScrolling = true;
            bottomScroll.scrollLeft = topScroll.scrollLeft;
            requestAnimationFrame(() => {
                isScrolling = false;
            });
        };

        const handleBottomScroll = () => {
            if (isScrolling) return;
            isScrolling = true;
            topScroll.scrollLeft = bottomScroll.scrollLeft;
            requestAnimationFrame(() => {
                isScrolling = false;
            });
        };

        // Sync scroll widths
        const syncScrollWidths = () => {
            const bottomScrollWidth = bottomScroll.scrollWidth;
            const topInner = topScroll.querySelector('.top-scroll-content') as HTMLElement;
            if (topInner && bottomScrollWidth > 0) {
                topInner.style.width = `${bottomScrollWidth}px`;
                topScroll.scrollLeft = bottomScroll.scrollLeft;
            }
        };

        // Initial sync - wait for table to render
        const timeoutId = setTimeout(syncScrollWidths, 100);
        const timeoutId2 = setTimeout(syncScrollWidths, 300);
        const timeoutId3 = setTimeout(syncScrollWidths, 500);

        // Observe table changes
        const tableObserver = new MutationObserver(() => {
            syncScrollWidths();
        });

        const bottomTable = bottomScroll.querySelector('table');
        if (bottomTable) {
            tableObserver.observe(bottomTable, {
                childList: true,
                subtree: true,
                attributes: true,
                attributeFilter: ['style', 'class']
            });
        }

        topScroll.addEventListener('scroll', handleTopScroll, { passive: true });
        bottomScroll.addEventListener('scroll', handleBottomScroll, { passive: true });
        window.addEventListener('resize', syncScrollWidths);

        return () => {
            clearTimeout(timeoutId);
            clearTimeout(timeoutId2);
            clearTimeout(timeoutId3);
            tableObserver.disconnect();
            topScroll.removeEventListener('scroll', handleTopScroll);
            bottomScroll.removeEventListener('scroll', handleBottomScroll);
            window.removeEventListener('resize', syncScrollWidths);
        };
    }, [filteredProfiles, profiles, selectedRole]);

    // Calculate summary statistics
    const summaryStats = useMemo(() => {
        const totalUsers = filteredProfiles.length;
        const totalEarnings = filteredProfiles.reduce((sum, p) => sum + p.totalEarnings, 0);
        const totalHours = filteredProfiles.reduce((sum, p) => sum + p.totalHours, 0);
        const totalMiles = filteredProfiles.reduce((sum, p) => {
            if (p.role !== 'driver') return sum;
            return sum + (p.milesDriven || 0);
        }, 0);
        const totalInvoices = filteredProfiles.reduce((sum, p) => sum + p.invoices, 0);

        return {
            totalUsers,
            totalEarnings,
            totalHours,
            totalMiles,
            totalInvoices
        };
    }, [filteredProfiles]);

    const formatCurrency = (amount: number) => {
        return `CA$${new Intl.NumberFormat('en-US', {
            minimumFractionDigits: 1,
            maximumFractionDigits: 1
        }).format(amount)}`;
    };

    const formatNumber = (num?: number) => {
        return new Intl.NumberFormat('en-US').format(Math.round(num || 0));
    };

    const formatDateLabel = (date?: string) => {
        if (!date) return null;
        const parsed = new Date(date);
        if (Number.isNaN(parsed.getTime())) return null;
        return parsed.toLocaleDateString();
    };

    const fetchedRangeLabel = lastFetchedRange
        ? `${formatDateLabel(lastFetchedRange.startDate) || '—'} to ${formatDateLabel(lastFetchedRange.endDate) || '—'}`
        : null;

    const getRoleBadgeColor = (role: string) => {
        const colors: Record<string, string> = {
            driver: 'bg-[var(--accent-blue)]/10 text-[var(--accent-blue)]',
            dispatcher: 'bg-[var(--accent-purple)]/10 text-[var(--accent-purple)]',
            hr: 'bg-[var(--accent-green)]/10 text-[var(--accent-green)]',
            reporter: 'bg-[var(--accent-amber)]/10 text-[var(--accent-amber)]',
            'Maintenance Crew (Mechanics)': 'bg-[var(--accent-orange)]/10 text-[var(--accent-orange)]',
            'Fleet Maintenance Manager': 'bg-[var(--accent-cyan)]/10 text-[var(--accent-cyan)]',
            'Compliance Manager': 'bg-[var(--accent-teal)]/10 text-[var(--accent-teal)]'
        };
        return colors[role] || 'text-[var(--accent-orange)]text-primary';
    };

    const handleExportToExcel = async () => {
        try {
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Employee Profiles Portfolio');

            // Define columns
            worksheet.columns = [
                { header: 'Name', key: 'name', width: 20 },
                { header: 'Email', key: 'email', width: 30 },
                { header: 'Role', key: 'role', width: 25 },
                { header: 'Phone', key: 'phone', width: 18 },
                { header: 'Join Date', key: 'joinDate', width: 15 },
                { header: 'Date of Birth', key: 'dateOfBirth', width: 15 },
                { header: 'Address', key: 'address', width: 25 },
                { header: 'City', key: 'city', width: 15 },
                { header: 'Province', key: 'province', width: 15 },
                { header: 'Postal Code', key: 'postalCode', width: 12 },
                { header: 'Country', key: 'country', width: 12 },
                { header: 'Citizenship Status', key: 'citizenshipStatus', width: 20 },
                { header: 'SIN Number', key: 'sinNumber', width: 15 },
                { header: 'Total Earnings', key: 'totalEarnings', width: 15 },
                { header: 'Base Salary', key: 'baseSalary', width: 15 },
                { header: 'Bonus', key: 'bonus', width: 12 },
                { header: 'Deductions', key: 'deductions', width: 12 },
                { header: 'Invoices', key: 'invoices', width: 10 },
                { header: 'Miles Driven', key: 'milesDriven', width: 15 },
                { header: 'Trips Completed', key: 'tripsCompleted', width: 15 },
                { header: 'Days Worked', key: 'daysWorked', width: 12 },
                { header: 'Total Hours', key: 'totalHours', width: 12 },
                { header: 'Present Days', key: 'presentDays', width: 12 },
                { header: 'Absent Days', key: 'absentDays', width: 12 },
                { header: 'Leave Days', key: 'leaveDays', width: 12 },
                { header: 'Notes', key: 'notes', width: 50 }
            ];

            // Style header row
            worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
            worksheet.getRow(1).fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FF6366F1' }
            };
            worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

            // Add data rows
            filteredProfiles.forEach((profile) => {
                worksheet.addRow({
                    name: profile.name,
                    email: profile.email,
                    role: profile.role,
                    phone: profile.phone || 'N/A',
                    joinDate: profile.joinDate ? new Date(profile.joinDate).toLocaleDateString() : 'N/A',
                    dateOfBirth: profile.dateOfBirth ? new Date(profile.dateOfBirth).toLocaleDateString() : 'N/A',
                    address: profile.address || 'N/A',
                    city: profile.city || 'N/A',
                    province: profile.province || 'N/A',
                    postalCode: profile.postalCode || 'N/A',
                    country: profile.country || 'N/A',
                    citizenshipStatus: profile.citizenshipStatus || 'N/A',
                    sinNumber: profile.sinNumber || 'N/A',
                    totalEarnings: formatCurrency(profile.totalEarnings),
                    baseSalary: formatCurrency(profile.baseSalary),
                    bonus: formatCurrency(profile.bonus),
                    deductions: formatCurrency(profile.deductions),
                    invoices: profile.invoices || 0,
                    milesDriven: profile.milesDriven ? formatNumber(profile.milesDriven) : 'N/A',
                    tripsCompleted: profile.tripsCompleted || 'N/A',
                    daysWorked: profile.daysWorked,
                    totalHours: formatNumber(profile.totalHours),
                    presentDays: profile.presentDays,
                    absentDays: profile.absentDays,
                    leaveDays: profile.leaveDays,
                    notes: profile.notes || 'N/A'
                });
            });

            // Auto-fit columns
            worksheet.columns.forEach((column) => {
                if (column.header) {
                    column.width = Math.max(column.width || 10, column.header.length + 2);
                }
            });

            // Generate Excel file
            const buffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `Employee_Portfolio_${timePeriod}_${selectedRole === 'all' ? 'AllRoles' : selectedRole}_${new Date().toISOString().split('T')[0]}.xlsx`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Error exporting to Excel:', error);
            alert('Failed to export data to Excel. Please try again.');
        }
    };

    return (
        <div
            className="min-h-screen p-6"
            style={{
                ...ACCENT_VARS,
                background: "var(--bg-main)"
            }}
        >
            <div className="w-full mx-auto p-2">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-2xl shadow-lg bg-[var(--accent-navyblue)]/20">
                                <Users className="w-8 h-8 text-[var(--accent-navyblue)]" />
                            </div>
                            <div>
                                <h1
                                    className="text-4xl font-bold bg-clip-text text-[var(--accent-navyblue)]"
                                    style={{ backgroundImage: ACCENT_GRADIENT }}
                                >
                                    Employee Portfolio
                                </h1>
                                <p className="text-secondary mt-1 flex items-center gap-2">
                                    <TrendingUp className="w-4 h-4" />
                                    Comprehensive view of employee performance, payroll, and attendance
                                </p>
                                {fetchedRangeLabel && (
                                    <p className="text-xs text-secondary mt-1">
                                        Showing payroll & attendance data from {fetchedRangeLabel}
                                    </p>
                                )}
                            </div>
                        </div>
                        <button
                            onClick={handleExportToExcel}
                            className="flex items-center gap-2 px-6 py-3 !text-white bg-[var(--accent-navyblue)] hover:bg-[var(--accent-navyblue)]/80 rounded-lg shadow-lg transition-all duration-200 font-medium"

                        >
                            <Download className="w-5 h-5" />
                            Export to Excel
                        </button>
                    </div>
                </div>

                {requiresCompanySetup && (
                    <div className="mb-6 rounded-lg bg-[var(--accent-amber)]/10 border-[var(--accent-amber)]/30 text-[var(--accent-amber)] p-4 text-amber-800">
                        Please complete your company setup to view and manage employee profiles.
                    </div>
                )}

                {error && (
                    <div className="mb-6 rounded-lg border bg-card p-4 bg-[var(--accent-red)]/10 border-[var(--accent-red)]/30 text-[var(--accent-red)]">
                        {error}
                    </div>
                )}

                {/* Summary Cards */}
                <div
                    className={`grid grid-cols-1 md:grid-cols-2 ${summaryGridCols} gap-4 mb-6`}
                >
                    {/* Total Employees */}
                    <div className="rounded-lg p-4 bg-card border border-theme card-premium">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs text-[var(--accent-purple)] mb-0.5">
                                    Total Employees
                                </p>
                                <p className="text-2xl font-semibold text-[var(--accent-purple)]">
                                    {summaryStats.totalUsers}
                                </p>
                            </div>
                            <Users className="text-[var(--accent-purple)]" size={20} />
                        </div>
                    </div>

                    {/* Total Earnings */}
                    <div className="rounded-lg p-4 bg-[var(--accent-green)]/10 border border-theme card-premium">
                        <div className="flex items-center justify-between gap-2">
                            <div className="flex-1 min-w-0">
                                <p className="text-xs text-[var(--accent-green)] mb-0.5">
                                    Total Earnings
                                </p>
                                <p className="text-xl font-semibold text-[var(--accent-green)] break-words">
                                    {formatCurrency(summaryStats.totalEarnings)}
                                </p>
                            </div>
                            <DollarSign className="text-[var(--accent-green)] ]flex-shrink-0" size={20} />
                        </div>
                    </div>

                    {/* Total Hours */}
                    <div className="rounded-lg p-4 bg-[var(--accent-amber)]/10 border-themeamber-200 card-premium">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs text-[var(--accent-amber)] mb-0.5">
                                    Total Hours
                                </p>
                                <p className="text-2xl font-semibold text-amber-700">
                                    {formatNumber(summaryStats.totalHours)}
                                </p>
                            </div>
                            <Clock className="text-[var(--accent-amber)]" size={20} />
                        </div>
                    </div>

                    {/* Driver Miles */}
                    {showDriverColumns && (
                        <div className="rounded-lg p-4 bg-card border border-theme">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs text-[#F59E0B] mb-0.5">
                                        Driver Miles
                                    </p>
                                    <p className="text-2xl font-semibold text-[var(--accent-orange)]">
                                        {formatNumber(summaryStats.totalMiles)}
                                    </p>
                                </div>
                                <MapPin className="text-[#F59E0B]" size={20} />
                            </div>
                        </div>
                    )}

                    {/* Total Invoices */}
                    <div className="rounded-lg p-4 bg-[var(--accent-indigo)]/10border border-indigo-200 card-premium">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs text-indigo-600 mb-0.5">
                                    Total Invoices
                                </p>
                                <p className="text-2xl font-semibold text-[var(--accent-indigo)]">
                                    {summaryStats.totalInvoices}
                                </p>
                            </div>
                            <FileText className="text-indigo-600" size={20} />
                        </div>
                    </div>
                </div>


                {/* Filters */}
                <div className="bg-card rounded-xl shadow-lg border border-theme p-6 mb-6">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                        {/* Search */}
                        <div className="relative flex-1 max-w-md">
                            <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-secondary" />
                            <input
                                type="text"
                                placeholder="Search by name or email..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10 pr-4 py-2 w-full border bg-card text-primary border border-theme rounded-lg
focus:ring-2 focus:ring-[var(--accent-blue)]/30
focus:border-[var(--accent-blue)] focus:border-transparent"
                                style={focusRingStyle}
                            />
                        </div>

                        {/* Time Period Filter */}
                        <div className="flex items-center gap-2">
                            <Calendar className="w-5 h-5 text-secondary" />
                            <span className="text-sm font-medium text-primary">Period:</span>

                            <div className="flex gap-3">
                                {(['1week', '2weeks', '1month'] as TimePeriod[]).map((period) => {
                                    const isActive = timePeriod === period;

                                    return (
                                        <button
                                            key={period}
                                            onClick={() => setTimePeriod(period)}
                                            className={`
          px-5 py-2 rounded-l text-sm font-medium transition-all duration-200
          ${isActive
                                                    ? 'bg-[var(--accent-navyblue)] text-white shadow-lg'
                                                    : 'bg-[#0f2a3a] text-white/70 border border-white/10 hover:bg-[#14394d]'
                                                }
        `}
                                        >
                                            {period === '1week'
                                                ? '1 Week'
                                                : period === '2weeks'
                                                    ? '2 Weeks'
                                                    : '1 Month'}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Role Filter */}
                        <div className="flex items-center gap-2">
                            <Filter className="w-5 h-5 text-secondary" />
                            <span className="text-sm font-medium text-primary">Role:</span>
                            <select
                                value={selectedRole}
                                onChange={(e) => setSelectedRole(e.target.value as UserRole)}
                                className="px-4 py-2 border border-theme rounded-lg text-sm focus:ring-2 bg-card text-primary
focus:ring-[var(--accent-blue)]/30 focus:border-transparent"
                                style={focusRingStyle}
                            >
                                <option value="all">All Roles</option>
                                <option value="dispatcher">Dispatcher</option>
                                <option value="hr">HR</option>
                                <option value="reporter">Reporter</option>
                                <option value="Maintenance Crew (Mechanics)">Maintenance Crew</option>
                                <option value="Fleet Maintenance Manager">Fleet Maintenance Manager</option>
                                <option value="Compliance Manager">Compliance Manager</option>
                            </select>
                        </div>
                    </div>
                </div>

                {loading && (
                    <div className="mb-4 rounded-lg border bg-[var(--accent-indigo)] p-3 text-[var(--accent-indigo)]">
                        Loading employee profiles...
                    </div>
                )}

                {/* User Profiles Table */}
                <div className="bg-card rounded-xl shadow-lg border border-theme overflow-hidden">
                    {/* Top Scrollbar - Only visible horizontal scrollbar */}

                    <div
                        ref={topScrollRef}
                        className="overflow-x-scroll overflow-y-hidden scrollbar-theme"
                        style={{
                            maxHeight: '20px',
                            marginBottom: '2px',

                        }}
                    >
                        <div className="top-scroll-content" style={{ height: '1px', width: "1200px" }}></div>
                    </div>
                    {/* Main Table - Scrollbar hidden, controlled by top scrollbar */}
                    <div
                        ref={bottomScrollRef}
                        className="overflow-x-scroll overflow-y-visible table-container-hidden-scrollbar"
                    >
                        <table className="w-full" style={{ minWidth: '1200px' }}>
                            <thead className="text-[var(--accent-navyblue)]">
                                <tr>
                                    <th className="px-6 py-4 text-left text-sm font-semibold">Employee</th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold">Role</th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold">Earnings</th>
                                    {showDriverColumns ? (
                                        <>
                                            <th className="px-6 py-4 text-left text-sm font-semibold">Miles</th>
                                            <th className="px-6 py-4 text-left text-sm font-semibold">Trips</th>
                                            <th className="px-6 py-4 text-left text-sm font-semibold">Invoices</th>
                                        </>
                                    ) : null}
                                    <th className="px-6 py-4 text-left text-sm font-semibold">Days Worked</th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold">Hours</th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold">Attendance</th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold">Actions</th>
                                </tr>
                            </thead>

                            {loading ? (
                                <tr>
                                    <td colSpan={showDriverColumns ? 10 : 7} className="px-6 py-12 text-center text-secondary">
                                        Loading employee profiles...
                                    </td>
                                </tr>
                            ) : filteredProfiles.length === 0 ? (
                                <tr>
                                    <td colSpan={showDriverColumns ? 10 : 7} className="px-6 py-12 text-center text-secondary">
                                        {emptyStateMessage}
                                    </td>
                                </tr>
                            ) : (
                                filteredProfiles.map((profile) => (
                                    <tr
                                        key={profile._id}
                                        className="hover:bg-[rgba(255,255,255,0.03)] transition-colors cursor-pointer"
                                        onClick={() => {
                                            setSelectedProfile(profile);
                                            setShowProfileSidebar(true);
                                        }}
                                    >
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div
                                                    className="w-10 h-10 bg-[var(--accent-navyblue)]  rounded-full flex items-center justify-center text-white font-semibold"
                                                >
                                                    {profile.name.charAt(0)}
                                                </div>
                                                <div>
                                                    <p className="font-medium text-primary">{profile.name}</p>
                                                    <p className="text-sm text-secondary">{profile.email}</p>
                                                </div>
                                            </div>
                                            {!showDriverColumns && profile.role === 'driver' && (
                                                <div className="mt-2 flex flex-wrap gap-3 text-xs text-secondary">
                                                    {profile.milesDriven != null && (
                                                        <span className="inline-flex items-center gap-1">
                                                            <MapPin className="w-3 h-3 text-[var(--accent-purple)]" />
                                                            {formatNumber(profile.milesDriven)} mi
                                                        </span>
                                                    )}
                                                    {profile.tripsCompleted != null && (
                                                        <span className="inline-flex items-center gap-1 text-[var(--accent-color)]">
                                                            <TrendingUp className="w-3 h-3" />
                                                            {formatNumber(profile.tripsCompleted)} trips
                                                        </span>
                                                    )}
                                                    {profile.invoices != null && (
                                                        <span className="inline-flex items-center gap-1">
                                                            <FileText className="w-3 h-3 text-[var(--accent-indigo)]" />
                                                            {profile.invoices} invoices
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${getRoleBadgeColor(profile.role)}`}>
                                                {profile.role}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div>
                                                <p className="font-semibold text-primary">{formatCurrency(profile.totalEarnings)}</p>
                                                <div className="text-xs text-secondary mt-1">
                                                    <span>Base: {formatCurrency(profile.baseSalary)}</span>
                                                    {profile.bonus > 0 && <span className="ml-2 text-[var(--accent-green)]">+{formatCurrency(profile.bonus)}</span>}
                                                    {profile.deductions > 0 && <span className="ml-2 text-[#A855F7]">-{formatCurrency(profile.deductions)}</span>}
                                                </div>
                                            </div>
                                        </td>
                                        {showDriverColumns && (
                                            <>
                                                <td className="px-6 py-4">
                                                    {profile.milesDriven != null ? (
                                                        <div className="flex items-center gap-2">
                                                            <MapPin className="w-4 h-4 text-[var(--accent-purple)]" />
                                                            <span className="font-medium text-primary">{formatNumber(profile.milesDriven)}</span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-secondary">—</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4">
                                                    {profile.tripsCompleted != null ? (
                                                        <span className="font-medium text-primary">{formatNumber(profile.tripsCompleted)}</span>
                                                    ) : (
                                                        <span className="text-secondary">—</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4">
                                                    {profile.invoices != null ? (
                                                        <div className="flex items-center gap-2">
                                                            <FileText className="w-4 h-4 text-[var(--accent-indigo)]" />
                                                            <span className="font-medium text-primary">{profile.invoices}</span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-secondary">—</span>
                                                    )}
                                                </td>
                                            </>
                                        )}
                                        <td className="px-6 py-4">
                                            <div>
                                                <p className="font-medium text-primary">{profile.daysWorked} days</p>
                                                <div className="text-xs text-secondary mt-1 flex gap-2">
                                                    <span className="text-[var(--accent-green)]">✓ {profile.presentDays}</span>
                                                    {profile.absentDays > 0 && <span className="text-[#A855F7]">✗ {profile.absentDays}</span>}
                                                    {profile.leaveDays > 0 && <span className="text-[#00D1FF]">L {profile.leaveDays}</span>}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <Clock className="w-4 h-4 text-[var(--accent-blue)]" />
                                                <span className="font-medium text-primary">{formatNumber(profile.totalHours)} hrs</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-1">
                                                {profile.presentDays > 0 && (
                                                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-[var(--accent-green)]/10 text-[var(--accent-green)] text-xs font-medium rounded">
                                                        <FaCheckCircle size={12} />
                                                        {profile.presentDays}
                                                    </span>
                                                )}
                                                {profile.absentDays > 0 && (
                                                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-[var(--accent-red)]/10 text-[var(--accent-red)] text-xs font-medium rounded">
                                                        <FaTimes size={12} />
                                                        {profile.absentDays}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                                            <button
                                                onClick={() => {
                                                    setSelectedProfile(profile);
                                                    setShowProfileSidebar(true);
                                                }}
                                                className="p-2 rounded-lg transition-colors text-[var(--accent-color)] hover:text-[var(--accent-dark)]"
                                                style={{ backgroundColor: 'rgba(1, 106, 178, 0.08)' }}
                                                title="View Profile"
                                            >
                                                <Eye className="w-5 h-5" />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}

                        </table>
                    </div>
                </div>
            </div>

            {/* Profile Detail Sidebar */}
            {showProfileSidebar && selectedProfile && (
                <>
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9998] transition-opacity"
                        onClick={() => setShowProfileSidebar(false)}
                    />

                    {/* Sidebar */}
                    <div className="fixed top-0 right-0 h-full w-full max-w-4xl bg-card shadow-2xl z-[9999] transform transition-transform duration-300 ease-out overflow-y-auto">
                        {/* Header */}
                        <div className="sticky top-0  text-white bg-[var(--accent-navyblue)] p-6 z-10"
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-16 h-16 rounded-full bg-card/20 flex items-center justify-center text-white text-2xl font-bold">
                                        {selectedProfile.name.charAt(0)}
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-bold">{selectedProfile.name}</h2>
                                        <p className="text-purple-100 flex items-center gap-2 mt-1">
                                            <Briefcase className="w-4 h-4" />
                                            {selectedProfile.role}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setShowProfileSidebar(false)}
                                    className="p-2 hover:bg-card/20 rounded-lg transition-colors"
                                >
                                    <X className="w-6 h-6" />
                                </button>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="p-6 space-y-6">


                            {/* Basic Information */}
                            <div className="bg-card border border-theme rounded-xl p-6">
                                <h3 className="text-lg font-semibold text-primary mb-4 flex items-center gap-2">
                                    <UserIcon className="w-5 h-5 text-[var(--accent-purple)]" />
                                    Basic Information
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="flex items-center gap-3">
                                        <Mail className="w-5 h-5 text-secondary" />
                                        <div>
                                            <p className="text-sm text-secondary">Email</p>
                                            <p className="text-primary font-medium">{selectedProfile.email}</p>
                                        </div>
                                    </div>
                                    {selectedProfile.phone && (
                                        <div className="flex items-center gap-3">
                                            <Clock className="w-5 h-5 text-secondary" />
                                            <div>
                                                <p className="text-sm text-secondary">Phone</p>
                                                <p className="text-primary font-medium">{selectedProfile.phone}</p>
                                            </div>
                                        </div>
                                    )}
                                    {selectedProfile.joinDate && (
                                        <div className="flex items-center gap-3">
                                            <Calendar className="w-5 h-5 text-secondary" />
                                            <div>
                                                <p className="text-sm text-secondary">Join Date</p>
                                                <p className="text-primary font-medium">{new Date(selectedProfile.joinDate).toLocaleDateString()}</p>
                                            </div>
                                        </div>
                                    )}
                                    {selectedProfile.dateOfBirth && (
                                        <div className="flex items-center gap-3">
                                            <Calendar className="w-5 h-5 text-secondary" />
                                            <div>
                                                <p className="text-sm text-secondary">Date of Birth</p>
                                                <p className="text-primary font-medium">{new Date(selectedProfile.dateOfBirth).toLocaleDateString()}</p>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Address Information */}
                                {(selectedProfile.address || selectedProfile.city || selectedProfile.province || selectedProfile.postalCode) && (
                                    <div className="mt-4 pt-4 border-t border-theme">
                                        <h4 className="text-sm font-semibold text-primary mb-3 flex items-center gap-2">
                                            <MapPin className="w-4 h-4" />
                                            Address
                                        </h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            {selectedProfile.address && (
                                                <div>
                                                    <p className="text-xs text-secondary">Street Address</p>
                                                    <p className="text-primary font-medium">{selectedProfile.address}</p>
                                                </div>
                                            )}
                                            {selectedProfile.city && (
                                                <div>
                                                    <p className="text-xs text-secondary">City</p>
                                                    <p className="text-primary font-medium">{selectedProfile.city}</p>
                                                </div>
                                            )}
                                            {selectedProfile.province && (
                                                <div>
                                                    <p className="text-xs text-secondary">Province</p>
                                                    <p className="text-primary font-medium">{selectedProfile.province}</p>
                                                </div>
                                            )}
                                            {selectedProfile.postalCode && (
                                                <div>
                                                    <p className="text-xs text-secondary">Postal Code</p>
                                                    <p className="text-primary font-medium">{selectedProfile.postalCode}</p>
                                                </div>
                                            )}
                                            {selectedProfile.country && (
                                                <div>
                                                    <p className="text-xs text-secondary">Country</p>
                                                    <p className="text-primary font-medium">{selectedProfile.country}</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Citizenship & Legal Information */}
                                {(selectedProfile.citizenshipStatus || selectedProfile.sinNumber) && (
                                    <div className="mt-4 pt-4 border-t border-theme">
                                        <h4 className="text-sm font-semibold text-primary mb-3 flex items-center gap-2">
                                            <FileText className="w-4 h-4" />
                                            Citizenship & Legal Information
                                        </h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            {selectedProfile.citizenshipStatus && (
                                                <div>
                                                    <p className="text-xs text-secondary">Citizenship Status</p>
                                                    <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full mt-1 ${selectedProfile.citizenshipStatus === 'Citizen' ? 'bg-[var(--accent-green)]/10 text-[var(--accent-green)]' :
                                                        selectedProfile.citizenshipStatus === 'Permanent Resident' ? 'bg-[var(--accent-blue)]/10 text-[var(--accent-blue)]' :
                                                            'bg-[var(--accent-yellow)]/10 text-[var(--accent-yellow)]'
                                                        }`}>
                                                        {selectedProfile.citizenshipStatus}
                                                    </span>
                                                </div>
                                            )}
                                            {selectedProfile.sinNumber && (
                                                <div>
                                                    <p className="text-xs text-secondary">SIN Number</p>
                                                    <p className="text-primary font-medium">{selectedProfile.sinNumber}</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                            {/* Time Period Filter */}
                            <div
                                className="rounded-xl p-4"
                                style={{ backgroundColor: 'rgba(1, 106, 178, 0.05)', border: '1px solid rgba(1, 106, 178, 0.2)' }}
                            >
                                <div className="flex items-center justify-between flex-wrap gap-4">
                                    <div className="flex items-center gap-2">
                                        <Calendar className="w-5 h-5 text-[var(--accent-color)]" />
                                        <span className="text-sm font-semibold text-primary">Filter Period:</span>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {(['1week', '2weeks', '1month', '6months', '1year', '2years'] as ProfileTimePeriod[]).map((period) => (
                                            <button
                                                key={period}
                                                onClick={() => setProfileTimePeriod(period)}
                                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${profileTimePeriod === period
                                                    ? '!text-white shadow-md'
                                                    : 'bg-card text-primary hover:bg-[rgba(255,255,255,0.03)] border border-theme'
                                                    }`}
                                                style={profileTimePeriod === period ? { background: 'var(--accent-navyblue)', borderColor: 'transparent' } : undefined}
                                            >
                                                {period === '1week' ? '1 Week' :
                                                    period === '2weeks' ? '2 Weeks' :
                                                        period === '1month' ? '1 Month' :
                                                            period === '6months' ? '6 Months' :
                                                                period === '1year' ? '1 Year' : '2 Years'}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            {/* Payment Breakdown by Period */}
                            <div className="bg-card border border-theme rounded-xl p-6">
                                <h3 className="text-lg font-semibold text-primary mb-4 flex items-center gap-2">
                                    <DollarSign className="w-5 h-5 text-[var(--accent-green)]" />
                                    Payment Breakdown - {profileTimePeriod === '1week' ? '1 Week' : profileTimePeriod === '2weeks' ? '2 Weeks' : profileTimePeriod === '1month' ? '1 Month' : profileTimePeriod === '6months' ? '6 Months' : profileTimePeriod === '1year' ? '1 Year' : '2 Years'}
                                </h3>
                                {(() => {
                                    const multipliers: Record<ProfileTimePeriod, number> = {
                                        '1week': 0.25,
                                        '2weeks': 0.5,
                                        '1month': 1.0,
                                        '6months': 6.0,
                                        '1year': 12.0,
                                        '2years': 24.0
                                    };
                                    const multiplier = multipliers[profileTimePeriod];
                                    const periodEarnings = selectedProfile.totalEarnings * multiplier;
                                    const periodBase = selectedProfile.baseSalary * multiplier;
                                    const periodBonus = selectedProfile.bonus * multiplier;
                                    const periodDeductions = selectedProfile.deductions * multiplier;

                                    return (
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                            <div className="bg-[var(--accent-green)]/10 border border-theme to-green-100 rounded-lg p-4 border border-theme">
                                                <p className="text-sm font-medium text-[var(--accent-green)] mb-2">Total Earnings</p>
                                                <p className="text-2xl font-bold text-[var(--accent-green)] mb-2">{formatCurrency(periodEarnings)}</p>
                                            </div>
                                            <div className="bg-[var(--accent-blue)]/10 border border-theme to-blue-100 rounded-lg p-4 border border-blue-200">
                                                <p className="text-sm font-medium text-[#00D1FF] mb-2">Base Salary</p>
                                                <p className="text-2xl font-bold text-[var(--accent-blue)] mb-2">{formatCurrency(periodBase)}</p>
                                            </div>
                                            <div className=" bg-[var(--accent-purple)]/10 border border-theme to-purple-100 rounded-lg p-4 border border-theme">
                                                <p className="text-sm font-medium text-[var(--accent-purple)] mb-2">Bonus</p>
                                                <p className="text-2xl font-bold text-[var(--accent-purple)] mb-2">{formatCurrency(periodBonus)}</p>
                                            </div>
                                            <div className=" bg-[var(--accent-red)]/10 border border-theme to-red-100 rounded-lg p-4 border border-red-200">
                                                <p className="text-sm font-medium text-[var(--accent-red)] mb-2">Deductions</p>
                                                <p className="text-2xl font-bold text-red-700 mb-2">{formatCurrency(periodDeductions)}</p>
                                            </div>
                                        </div>
                                    );
                                })()}
                            </div>

                            {/* Attendance Details */}
                            <div className="bg-card border border-theme rounded-xl p-6">
                                <h3 className="text-lg font-semibold text-primary mb-4 flex items-center gap-2">
                                    <Clock className="w-5 h-5 text-[#00D1FF]" />
                                    Attendance & Working Hours - {profileTimePeriod === '1week' ? '1 Week' : profileTimePeriod === '2weeks' ? '2 Weeks' : profileTimePeriod === '1month' ? '1 Month' : profileTimePeriod === '6months' ? '6 Months' : profileTimePeriod === '1year' ? '1 Year' : '2 Years'}
                                </h3>
                                {(() => {
                                    const multipliers: Record<ProfileTimePeriod, number> = {
                                        '1week': 0.25,
                                        '2weeks': 0.5,
                                        '1month': 1.0,
                                        '6months': 6.0,
                                        '1year': 12.0,
                                        '2years': 24.0
                                    };
                                    const multiplier = multipliers[profileTimePeriod];
                                    const periodDaysWorked = Math.round(selectedProfile.daysWorked * multiplier);
                                    const periodPresentDays = Math.round(selectedProfile.presentDays * multiplier);
                                    const periodAbsentDays = Math.round(selectedProfile.absentDays * multiplier);
                                    const periodLeaveDays = Math.round(selectedProfile.leaveDays * multiplier);
                                    const periodTotalHours = selectedProfile.totalHours * multiplier;

                                    return (
                                        <>
                                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                                <div className="bg-[var(--accent-blue)]/10 rounded-lg p-4  border-blue-200">
                                                    <p className="text-sm text-[#00D1FF] mb-1">Working Days</p>
                                                    <p className="text-2xl font-bold text-[var(--accent-blue)]">{periodDaysWorked}</p>
                                                </div>
                                                <div className="bg-[var(--accent-green)]/10 rounded-lg p-4 border border-theme">
                                                    <p className="text-sm text-[var(--accent-green)] mb-1">Present Days</p>
                                                    <p className="text-2xl font-bold text-[var(--accent-green)]">{periodPresentDays}</p>
                                                </div>
                                                <div className="bg-[var(--accent-red)]/10 rounded-lg p-4 border-red-200">
                                                    <p className="text-sm text-[#A855F7] mb-1">Absent Days</p>
                                                    <p className="text-2xl font-bold text-red-700">{periodAbsentDays}</p>
                                                </div>
                                            </div>
                                            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div className="bg-[var(--accent-purple)]/10 rounded-lg p-4 border-theme">
                                                    <p className="text-sm text-[var(--accent-purple)] mb-1">Total Hours</p>
                                                    <p className="text-2xl font-bold text-[var(--accent-purple)]">{formatNumber(periodTotalHours)} hrs</p>
                                                </div>
                                                <div className="bg-[var(--accent-indigo)]/10 rounded-lg p-4 border-indigo-200">
                                                    <p className="text-sm text-indigo-600 mb-1">Leave Days</p>
                                                    <p className="text-2xl font-bold text-[var(--accent-indigo)]">{periodLeaveDays}</p>
                                                </div>
                                            </div>
                                        </>
                                    );
                                })()}
                            </div>

                            {/* Driver-Specific Information */}
                            {(selectedProfile.role === 'driver' || selectedProfile.milesDriven) && (
                                <div className="bg-card border border-theme rounded-xl p-6">
                                    <h3 className="text-lg font-semibold text-primary mb-4 flex items-center gap-2">
                                        <MapPin className="w-5 h-5 text-[#F59E0B]" />
                                        Driver Performance - {profileTimePeriod === '1week' ? '1 Week' : profileTimePeriod === '2weeks' ? '2 Weeks' : profileTimePeriod === '1month' ? '1 Month' : profileTimePeriod === '6months' ? '6 Months' : profileTimePeriod === '1year' ? '1 Year' : '2 Years'}
                                    </h3>
                                    {(() => {
                                        const multipliers: Record<ProfileTimePeriod, number> = {
                                            '1week': 0.25,
                                            '2weeks': 0.5,
                                            '1month': 1.0,
                                            '6months': 6.0,
                                            '1year': 12.0,
                                            '2years': 24.0
                                        };
                                        const multiplier = multipliers[profileTimePeriod];
                                        const periodMiles = selectedProfile.milesDriven ? selectedProfile.milesDriven * multiplier : 0;
                                        const periodTrips = selectedProfile.tripsCompleted ? Math.round(selectedProfile.tripsCompleted * multiplier) : 0;
                                        const periodInvoices = Math.round(selectedProfile.invoices * multiplier);

                                        return (
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                {selectedProfile.milesDriven && (
                                                    <div className="bg-card rounded-lg p-4 border border-theme">
                                                        <p className="text-sm text-[#F59E0B] mb-1">Miles Driven</p>
                                                        <p className="text-2xl font-bold text-[var(--accent-orange)]">{formatNumber(periodMiles)}</p>
                                                    </div>
                                                )}
                                                {selectedProfile.tripsCompleted && (
                                                    <div className="bg-card rounded-lg p-4 border border-blue-200">
                                                        <p className="text-sm text-[#00D1FF] mb-1">Trips Completed</p>
                                                        <p className="text-2xl font-bold text-[var(--accent-blue)]">{periodTrips}</p>
                                                    </div>
                                                )}
                                                {selectedProfile.invoices > 0 && (
                                                    <div className="bg-[var(--accent-blue)]/10rounded-lg p-4 border border-indigo-200">
                                                        <p className="text-sm text-indigo-600 mb-1">Invoices</p>
                                                        <p className="text-2xl font-bold text-[var(--accent-indigo)]">{periodInvoices}</p>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })()}
                                </div>
                            )}

                            {/* Notes */}
                            {selectedProfile.notes && (
                                <div className="bg-card border border-theme rounded-xl p-6">
                                    <h3 className="text-lg font-semibold text-primary mb-4 flex items-center gap-2">
                                        <AlertCircle className="w-5 h-5 text-[var(--accent-amber)]" />
                                        Notes
                                    </h3>
                                    <div className="bg-[var(--accent-amber)]/10 border-themeamber-200 rounded-lg p-4">
                                        <p className="text-primary leading-relaxed">{selectedProfile.notes}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>

    );
};

export default UserProfilesPortfolio;



