import React, { useState, useMemo, useEffect, useRef } from 'react';
import type { CSSProperties } from 'react';
import { Search, Calendar, Users, DollarSign, Clock, TrendingUp, MapPin, FileText, Eye, X, User as UserIcon, Mail, AlertCircle, Download, Truck, Package, CheckCircle2, Loader2, AlertCircle as AlertCircleIcon, Circle, Upload } from 'lucide-react';
import { FaCheckCircle, FaExclamationCircle, FaTimes } from 'react-icons/fa';
import ExcelJS from 'exceljs';
import { fetchUserProfiles, type UserProfileDto, type UserProfilesTimeRange } from '../../../../axios/api/hr.userProfiles';
import { listOrder } from '../../../../axios/api/distapcher';
import { getDriverById, uploadDriverDrugTest } from '../../../../axios/api/driver';
import { FLEET_COLORS } from '../../fleetMaintenance/colorUtils';
import TimelineNotes from '../../../../components/common/TimelineNotes';

type TimePeriod = UserProfilesTimeRange;
type ProfileTimePeriod = '1week' | '2weeks' | '1month' | '6months' | '1year' | '2years';

type DriverProfile = UserProfileDto & { role: 'driver' };

// Drug Test Upload Modal Component
const DrugTestUploadModal: React.FC<{
    driverId: string;
    driverName: string;
    onClose: () => void;
    onSuccess: () => void;
    editingTest?: any | null;
}> = ({ driverId, driverName, onClose, onSuccess, editingTest }) => {
    const [testDate, setTestDate] = useState('');
    const [expiryDate, setExpiryDate] = useState('');
    const [consentFormFile, setConsentFormFile] = useState<File | null>(null);
    const [resultDocumentFile, setResultDocumentFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (editingTest) {
            setTestDate(editingTest.test_date ? new Date(editingTest.test_date).toISOString().split('T')[0] : '');
            setExpiryDate(editingTest.expiry_date ? new Date(editingTest.expiry_date).toISOString().split('T')[0] : '');
        }
    }, [editingTest]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!testDate) {
            setError('Test date is required');
            return;
        }

        try {
            setLoading(true);
            const formData = new FormData();
            formData.append('test_date', testDate);
            if (expiryDate) {
                formData.append('expiry_date', expiryDate);
            }
            if (consentFormFile) {
                formData.append('consentForm', consentFormFile);
            }
            if (resultDocumentFile) {
                formData.append('resultDocument', resultDocumentFile);
            }

            const response = await uploadDriverDrugTest(driverId, formData);
            if (response?.success) {
                onSuccess();
            } else {
                setError(response?.message || 'Failed to upload drug test');
            }
        } catch (err: any) {
            setError(err?.message || 'Failed to upload drug test');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[10000] flex items-center justify-center p-4 ">
            <div className="bg-card rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div className="sticky top-0 bg-card border-b border-theme px-6 py-4 flex items-center justify-between">
                    <h2 className="text-xl font-bold text-primary">
                        {editingTest ? 'Edit Drug Test' : 'Upload Drug Test'}
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-[rgba(255,255,255,0.03)] rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-primary mb-2">
                            Driver Name
                        </label>
                        <input
                            type="text"
                            value={driverName}
                            disabled
                            className="w-full px-4 py-2 border border-theme rounded-lg bg-card text-secondary"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-primary mb-2">
                            Test Date <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="date"
                            value={testDate}
                            onChange={(e) => setTestDate(e.target.value)}
                            required
                            className="w-full px-4 py-2 border border-theme rounded-lg focus:ring-2 bg-card text-primary
focus:ring-[var(--accent-purple)]/30
focus:border-[var(--accent-purple)]"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-primary mb-2">
                            Expiry Date
                        </label>
                        <input
                            type="date"
                            value={expiryDate}
                            onChange={(e) => setExpiryDate(e.target.value)}
                            className="w-full px-4 py-2 border border-theme rounded-lg focus:ring-2 bg-card text-primary
focus:ring-[var(--accent-purple)]/30
focus:border-[var(--accent-purple)]"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-primary mb-2">
                            Consent Form
                        </label>
                        <input
                            type="file"
                            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                            onChange={(e) => setConsentFormFile(e.target.files?.[0] || null)}
                            className="w-full px-4 py-2 border border-theme rounded-lg focus:ring-2 bg-card text-primary
focus:ring-[var(--accent-purple)]/30
focus:border-[var(--accent-purple)]"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-primary mb-2">
                            Result Document
                        </label>
                        <input
                            type="file"
                            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                            onChange={(e) => setResultDocumentFile(e.target.files?.[0] || null)}
                            className="w-full px-4 py-2 border border-theme rounded-lg focus:ring-2 bg-card text-primary
focus:ring-[var(--accent-purple)]/30
focus:border-[var(--accent-purple)]"
                        />
                    </div>
                    {error && (
                        <div className="bg-card border bg-[var(--accent-red)]/10 border-[var(--accent-red)]/30 text-[var(--accent-red)] rounded-lg p-4">
                            <p className="text-sm text-[#A855F7]">{error}</p>
                        </div>
                    )}
                    <div className="flex items-center justify-end gap-3 pt-4 border-t border-theme">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-primary bg-card rounded-lg hover:hover:bg-[rgba(255,255,255,0.05)] transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-4 py-2 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            style={{
                                background: "linear-gradient(90deg, var(--accent-purple), var(--accent-indigo))",
                                boxShadow: "0 8px 20px var(--border-glow)"
                            }}
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Uploading...
                                </>
                            ) : (
                                <>
                                    <Upload className="w-4 h-4" />
                                    Upload
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const DriverPortfolio: React.FC = () => {
    const ACCENT_PRIMARY = FLEET_COLORS.primary;
    const ACCENT_DARK = FLEET_COLORS.dark;
    const ACCENT_GRADIENT = 'var(--accent-navyblue)';
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
    const [profiles, setProfiles] = useState<DriverProfile[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [requiresCompanySetup, setRequiresCompanySetup] = useState(false);
    const [lastFetchedRange, setLastFetchedRange] = useState<{ startDate?: string; endDate?: string } | null>(null);
    const [, setPagination] = useState<{ currentPage: number; totalItems: number; totalPages: number }>({
        currentPage: 1,
        totalItems: 0,
        totalPages: 0
    });
    const [selectedProfile, setSelectedProfile] = useState<DriverProfile | null>(null);
    const [showProfileSidebar, setShowProfileSidebar] = useState(false);
    const [profileTimePeriod] = useState<ProfileTimePeriod>('1month');
    const [currentOrder, setCurrentOrder] = useState<any | null>(null);
    const [loadingOrder, setLoadingOrder] = useState(false);
    const [driverOrdersMap, setDriverOrdersMap] = useState<Record<string, any>>({});
    const [loadingAllOrders, setLoadingAllOrders] = useState(false);
    const [, setDriverDetails] = useState<any | null>(null);
    const [, setLoadingDriverDetails] = useState(false);
    const [, setDrugTests] = useState<any[]>([]);
    const [showDrugTestModal, setShowDrugTestModal] = useState(false);
    const [editingDrugTest, setEditingDrugTest] = useState<any | null>(null);
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
                    role: 'driver',
                    timeRange: timePeriod,
                    page: 1,
                    limit: PAGE_SIZE
                });

                if (!isMounted) return;

                if (response.success) {
                    // Filter to only include drivers
                    const filteredData = ((response.data as UserProfileDto[]) || []).filter(
                        (profile) => profile.role === 'driver'
                    ) as DriverProfile[];
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
                    setError(response.message || 'Failed to fetch driver profiles');
                }
            } catch (err: any) {
                if (!isMounted) return;
                const message = err?.response?.data?.message || err?.message || 'Failed to fetch driver profiles';
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
    }, [debouncedSearchTerm, timePeriod]);

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

    // Fetch current order for selected driver
    useEffect(() => {
        const fetchCurrentOrder = async () => {
            if (!selectedProfile?._id) {
                setCurrentOrder(null);
                return;
            }

            setLoadingOrder(true);
            try {
                // Fetch orders (backend may not support driver filter, so we'll filter on frontend)
                const response = await listOrder({
                    limit: 1000
                } as any);

                if (response?.success && Array.isArray(response.data)) {
                    const driverId = selectedProfile._id.toString();
                    console.log('🔍 [Driver Portfolio] Fetching orders for driver:', driverId);
                    console.log('📦 [Driver Portfolio] Total orders fetched:', response.data.length);

                    // Filter orders by driver (check both driver and coDriver)
                    const driverOrders = response.data.filter((order: any) => {
                        const orderDriverId = order.driver?._id?.toString() || order.driver?.toString() || '';
                        const orderCoDriverId = order.coDriver?._id?.toString() || order.coDriver?.toString() || '';
                        const matches = orderDriverId === driverId || orderCoDriverId === driverId;
                        return matches;
                    });

                    console.log('👤 [Driver Portfolio] Orders for this driver:', driverOrders.length);
                    console.log('📊 [Driver Portfolio] Sample order statuses:', driverOrders.slice(0, 5).map((o: any) => ({
                        orderNumber: o.orderNumber,
                        status: o.status,
                        driver: o.driver?._id || o.driver,
                        coDriver: o.coDriver?._id || o.coDriver
                    })));

                    // Filter for active orders (exclude completed and canceled)
                    // Active statuses: 'planned', 'quoted', 'in-delivery', 'delivered', 'verification_pending', 'pending_review'
                    const inactiveStatuses = ['completed', 'canceled'];
                    const activeOrders = driverOrders.filter((order: any) => {
                        const status = (order.status || '').toLowerCase();
                        const isActive = status && !inactiveStatuses.includes(status);
                        return isActive;
                    });

                    console.log('✅ [Driver Portfolio] Active orders:', activeOrders.length);
                    if (activeOrders.length > 0) {
                        console.log('📋 [Driver Portfolio] Active order statuses:', activeOrders.map((o: any) => o.status));
                    }

                    // Get the most recent active order
                    if (activeOrders.length > 0) {
                        // Sort by order date or creation date, most recent first
                        const sortedOrders = activeOrders.sort((a: any, b: any) => {
                            const dateA = new Date(a.orderDate || a.createdAt || 0).getTime();
                            const dateB = new Date(b.orderDate || b.createdAt || 0).getTime();
                            return dateB - dateA;
                        });
                        setCurrentOrder(sortedOrders[0]);
                    } else {
                        setCurrentOrder(null);
                    }
                } else {
                    setCurrentOrder(null);
                }
            } catch (error) {
                console.error('Error fetching current order:', error);
                setCurrentOrder(null);
            } finally {
                setLoadingOrder(false);
            }
        };

        fetchCurrentOrder();
    }, [selectedProfile?._id]);

    // Fetch orders for all drivers when profiles are loaded
    useEffect(() => {
        const fetchAllDriverOrders = async () => {
            if (profiles.length === 0) {
                setDriverOrdersMap({});
                return;
            }

            setLoadingAllOrders(true);
            try {
                const response = await listOrder({
                    limit: 1000
                } as any);

                if (response?.success && Array.isArray(response.data)) {
                    const inactiveStatuses = ['completed', 'canceled'];
                    const ordersMap: Record<string, any> = {};

                    profiles.forEach((profile) => {
                        const driverId = profile._id.toString();
                        const driverOrders = response.data.filter((order: any) => {
                            const orderDriverId = order.driver?._id?.toString() || order.driver?.toString() || '';
                            const orderCoDriverId = order.coDriver?._id?.toString() || order.coDriver?.toString() || '';
                            return orderDriverId === driverId || orderCoDriverId === driverId;
                        });

                        const activeOrders = driverOrders.filter((order: any) => {
                            const status = (order.status || '').toLowerCase();
                            return status && !inactiveStatuses.includes(status);
                        });

                        if (activeOrders.length > 0) {
                            const sortedOrders = activeOrders.sort((a: any, b: any) => {
                                const dateA = new Date(a.orderDate || a.createdAt || 0).getTime();
                                const dateB = new Date(b.orderDate || b.createdAt || 0).getTime();
                                return dateB - dateA;
                            });
                            ordersMap[driverId] = sortedOrders[0];
                        }
                    });

                    setDriverOrdersMap(ordersMap);
                }
            } catch (error) {
                console.error('Error fetching driver orders:', error);
            } finally {
                setLoadingAllOrders(false);
            }
        };

        fetchAllDriverOrders();
    }, [profiles]);

    // Fetch driver details when profile is selected (for drug tests)
    useEffect(() => {
        const fetchDriverDetails = async () => {
            if (!selectedProfile?._id) {
                setDriverDetails(null);
                setDrugTests([]);
                return;
            }

            setLoadingDriverDetails(true);
            try {
                const response = await getDriverById(selectedProfile._id);
                if (response?.success && response.data) {
                    setDriverDetails(response.data);
                    const tests = response.data.details?.drug_tests || response.data.drug_tests || [];
                    setDrugTests(Array.isArray(tests) ? tests : []);
                }
            } catch (error) {
                console.error('Error fetching driver details:', error);
                setDriverDetails(null);
                setDrugTests([]);
            } finally {
                setLoadingDriverDetails(false);
            }
        };

        fetchDriverDetails();
    }, [selectedProfile?._id]);

    const filteredProfiles = profiles;
    const emptyStateMessage = requiresCompanySetup
        ? 'Complete your company setup to start seeing driver records.'
        : 'No drivers found matching your criteria';

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
    }, [filteredProfiles, profiles]);

    // Calculate summary statistics
    const summaryStats = useMemo(() => {
        const totalDrivers = filteredProfiles.length;
        const totalEarnings = filteredProfiles.reduce((sum, p) => sum + p.totalEarnings, 0);
        const totalHours = filteredProfiles.reduce((sum, p) => sum + p.totalHours, 0);
        const totalMiles = filteredProfiles.reduce((sum, p) => sum + (p.milesDriven || 0), 0);
        const totalTrips = filteredProfiles.reduce((sum, p) => sum + (p.tripsCompleted || 0), 0);
        const totalInvoices = filteredProfiles.reduce((sum, p) => sum + p.invoices, 0);

        return {
            totalDrivers,
            totalEarnings,
            totalHours,
            totalMiles,
            totalTrips,
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

    const handleExportToExcel = async () => {
        try {
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Driver Portfolio');

            // Define columns
            worksheet.columns = [
                { header: 'Name', key: 'name', width: 20 },
                { header: 'Email', key: 'email', width: 30 },
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
                { header: 'Miles Driven', key: 'milesDriven', width: 15 },
                { header: 'Trips Completed', key: 'tripsCompleted', width: 15 },
                { header: 'Invoices', key: 'invoices', width: 10 },
                { header: 'Days Worked', key: 'daysWorked', width: 12 },
                { header: 'Total Hours', key: 'totalHours', width: 12 },
                { header: 'Present Days', key: 'presentDays', width: 12 },
                { header: 'Absent Days', key: 'absentDays', width: 12 },
                { header: 'Late Days', key: 'lateDays', width: 12 },
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
                    milesDriven: profile.milesDriven ? formatNumber(profile.milesDriven) : 'N/A',
                    tripsCompleted: profile.tripsCompleted || 'N/A',
                    invoices: profile.invoices || 0,
                    daysWorked: profile.daysWorked,
                    totalHours: formatNumber(profile.totalHours),
                    presentDays: profile.presentDays,
                    absentDays: profile.absentDays,
                    lateDays: profile.lateDays,
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
            link.download = `Driver_Portfolio_${timePeriod}_${new Date().toISOString().split('T')[0]}.xlsx`;
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
                background: 'var(--bg-main)',
            }}
        >
            <div className="w-full mx-auto p-2">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-2xl shadow-lg" style={{ background: ACCENT_GRADIENT }}>
                                <Truck className="w-8 h-8 text-white" />
                            </div>
                            <div>
                                <h1
                                    className="text-4xl font-bold bg-clip-text text-[var(--accent-navyblue)]"
                                    style={{ backgroundImage: ACCENT_GRADIENT }}
                                >
                                    Driver Portfolio
                                </h1>
                                <p className="text-secondary mt-1 flex items-center gap-2">
                                    <TrendingUp className="w-4 h-4" />
                                    Comprehensive view of driver performance, earnings, miles, and trips
                                </p>
                                {fetchedRangeLabel && (
                                    <p className="text-xs text-[var(--accent-purple)] mt-1">
                                        Showing data from {fetchedRangeLabel}
                                    </p>
                                )}
                            </div>
                        </div>
                        <button
                            onClick={handleExportToExcel}
                            className="flex items-center gap-2 px-6 py-3 !text-white rounded-lg shadow-lg transition-all duration-200 font-medium"
                            style={{ background: "var(--accent-navyblue)" }}
                        >
                            <Download className="w-5 h-5" />
                            Export to Excel
                        </button>
                    </div>
                </div>

                {requiresCompanySetup && (
                    <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-800">
                        Please complete your company setup to view and manage driver profiles.
                    </div>
                )}

                {error && (
                    <div className="mb-6 rounded-lg border bg-[var(--accent-red)]/10 border-[var(--accent-red)]/30 text-[var(--accent-red)] text-[var(--accent-red)] p-4 text-[var(--accent-red)]">
                        {error}
                    </div>
                )}

                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">

                    {/* Total Drivers */}
                    <div className="rounded-lg p-4 bg-card border border-theme">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs text-[var(--accent-purple)] mb-0.5">
                                    Total Drivers
                                </p>
                                <p className="text-2xl font-semibold text-[var(--accent-purple)]">
                                    {summaryStats.totalDrivers}
                                </p>
                            </div>
                            <Users className="text-[var(--accent-purple)]" size={20} />
                        </div>
                    </div>

                    {/* Total Earnings */}
                    <div className="rounded-lg p-4 bg-[var(--accent-green)]/10 border border-theme">
                        <div className="flex items-center justify-between gap-2">
                            <div className="flex-1 min-w-0">
                                <p className="text-xs text-[var(--accent-green)] mb-0.5">
                                    Total Earnings
                                </p>
                                <p className="text-xl font-semibold text-[var(--accent-green)] break-words">
                                    {formatCurrency(summaryStats.totalEarnings)}
                                </p>
                            </div>
                            <DollarSign className="text-[var(--accent-green)] flex-shrink-0" size={20} />
                        </div>
                    </div>

                    {/* Total Hours */}
                    <div className="rounded-lg p-4 bg-[var(--accent-amber)]/10 border border-theme">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs text-[var(--accent-amber)] mb-0.5">
                                    Total Hours
                                </p>
                                <p className="text-2xl font-semibold text-[var(--accent-amber)]">
                                    {formatNumber(summaryStats.totalHours)}
                                </p>
                            </div>
                            <Clock className="text-[var(--accent-amber)]" size={20} />
                        </div>
                    </div>

                    {/* Total Miles */}
                    <div className="rounded-lg p-4 bg-[var(--accent-orange)]/10 border border-theme">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs text-[var(--accent-orange)] mb-0.5">
                                    Total Miles
                                </p>
                                <p className="text-2xl font-semibold text-[var(--accent-orange)]">
                                    {formatNumber(summaryStats.totalMiles)}
                                </p>
                            </div>
                            <MapPin className="text-[var(--accent-orange)]" size={20} />
                        </div>
                    </div>

                    {/* Total Trips */}
                    <div className="rounded-lg p-4 bg-[var(--accent-cyan)]/10 border border-theme">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs text-[var(--accent-cyan)] mb-0.5">
                                    Total Trips
                                </p>
                                <p className="text-2xl font-semibold text-[var(--accent-cyan)]">
                                    {formatNumber(summaryStats.totalTrips)}
                                </p>
                            </div>
                            <TrendingUp className="text-[var(--accent-cyan)]" size={20} />
                        </div>
                    </div>

                    {/* Total Invoices */}
                    <div className="rounded-lg p-4 bg-[var(--accent-indigo)]/10 border border-theme">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs text-[var(--accent-indigo)] mb-0.5">
                                    Total Invoices
                                </p>
                                <p className="text-2xl font-semibold text-[var(--accent-indigo)]">
                                    {summaryStats.totalInvoices}
                                </p>
                            </div>
                            <FileText className="text-[var(--accent-indigo)]" size={20} />
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
                                className="pl-10 pr-4 py-2 w-full border border-theme rounded-lg focus:ring-2 focus:ring-[var(--accent-color)] focus:border-transparent"
                                style={focusRingStyle}
                            />
                        </div>

                        {/* Time Period Filter */}
                        <div className="flex items-center gap-2">
                            <Calendar className="w-5 h-5 text-secondary" />
                            <span className="text-sm font-medium text-primary">Period:</span>
                            <div className="flex gap-2">
                                {(['1week', '2weeks', '1month'] as TimePeriod[]).map((period) => (
                                    <button
                                        key={period}
                                        onClick={() => setTimePeriod(period)}
                                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${timePeriod === period ? '!text-white shadow-md' : 'bg-card text-primary hover:hover:bg-[rgba(255,255,255,0.05)]'
                                            }`}
                                        style={timePeriod === period ? { background: "var(--accent-navyblue)" } : undefined}
                                    >
                                        {period === '1week' ? '1 Week' : period === '2weeks' ? '2 Weeks' : '1 Month'}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {loading && (
                    <div className="mb-4 rounded-lg border border-indigo-100 bg-indigo-50 p-3 text-indigo-700">
                        Loading driver profiles...
                    </div>
                )}

                {/* Driver Profiles Table */}
                <div className="bg-card rounded-xl shadow-lg border border-theme overflow-hidden">
                    {/* Top Scrollbar - Only visible horizontal scrollbar */}

                    <div
                        ref={topScrollRef}
                        className=" overflow-y-hidden top-scrollbar-container "
                        style={{
                            maxHeight: '20px',
                            marginBottom: '0px',
                            scrollbarWidth: 'thin',
                            scrollbarColor: 'var(--accent-navyblue) var(--bg-main)'
                        }}
                    >
                        <div className="top-scroll-content" style={{ height: '1px' }}></div>
                    </div>
                    {/* Main Table - Scrollbar hidden, controlled by top scrollbar */}
                    <div
                        ref={bottomScrollRef}
                        className="overflow-x-auto overflow-y-visible   "
                    >
                        <table className="w-full" style={{ minWidth: '1200px' }}>
                            <thead className="text-[var(--accent-navyblue)]" >
                                <tr>
                                    <th className="px-6 py-4 text-left text-sm font-semibold">Driver</th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold">Current Order</th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold">Earnings</th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold">Miles</th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold">Trips</th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold">Invoices</th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold">Days Worked</th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold">Hours</th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold">Attendance</th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold">Cross Border</th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-theme divide-white/5">
                                {loading ? (
                                    <tr>
                                        <td colSpan={11} className="px-6 py-12 text-center text-secondary">
                                            Loading driver profiles...
                                        </td>
                                    </tr>
                                ) : filteredProfiles.length === 0 ? (
                                    <tr>
                                        <td colSpan={11} className="px-6 py-12 text-center text-secondary">
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
                                                        className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold"
                                                        style={{ background: ACCENT_GRADIENT }}
                                                    >
                                                        {profile.name.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-primary">{profile.name}</p>
                                                        <p className="text-sm text-secondary">{profile.email}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                {(() => {
                                                    const order = driverOrdersMap[profile._id];
                                                    if (loadingAllOrders) {
                                                        return (
                                                            <div className="flex items-center gap-2">
                                                                <Loader2 className="w-4 h-4 animate-spin text-secondary" />
                                                                <span className="text-xs text-secondary">Loading...</span>
                                                            </div>
                                                        );
                                                    }
                                                    if (!order) {
                                                        return (
                                                            <span className="text-xs text-secondary italic">No active order</span>
                                                        );
                                                    }
                                                    const status = (order.status || '').toLowerCase();
                                                    const statusConfig: Record<string, { bg: string; text: string; icon: any; label: string }> = {
                                                        'planned': { bg: 'bg-blue-100', text: 'text-blue-800', icon: Circle, label: 'Planned' },
                                                        'quoted': { bg: 'bg-purple-100', text: 'text-purple-800', icon: FileText, label: 'Quoted' },
                                                        'in-delivery': { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: Truck, label: 'In Delivery' },
                                                        'delivered': { bg: 'bg-indigo-100', text: 'text-indigo-800', icon: CheckCircle2, label: 'Delivered' },
                                                        'completed': { bg: 'bg-green-100', text: 'text-green-800', icon: CheckCircle2, label: 'Completed' },
                                                        'verification_pending': { bg: 'bg-amber-100', text: 'text-amber-800', icon: AlertCircleIcon, label: 'Verification Pending' },
                                                        'pending_review': { bg: 'bg-amber-100', text: 'text-amber-800', icon: AlertCircleIcon, label: 'Pending Review' },
                                                        'canceled': { bg: 'bg-red-100', text: 'text-red-800', icon: X, label: 'Canceled' }
                                                    };
                                                    const config = statusConfig[status] || { bg: 'bg-card', text: 'text-primary', icon: Package, label: status.replace(/_/g, ' ').replace(/-/g, ' ') };
                                                    const StatusIcon = config.icon;
                                                    return (
                                                        <div className="flex flex-col gap-1.5">
                                                            <div className="flex items-center gap-2">
                                                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold ${config.bg} ${config.text} border border-current/20`}>
                                                                    <StatusIcon className="w-3 h-3" />
                                                                    {config.label}
                                                                </span>
                                                            </div>
                                                            {order.orderNumber && (
                                                                <span className="text-xs text-secondary font-mono">
                                                                    {order.orderNumber}
                                                                </span>
                                                            )}
                                                        </div>
                                                    );
                                                })()}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div>
                                                    <p className="font-semibold text-primary">{formatCurrency(profile.totalEarnings)}</p>
                                                    <div className="text-xs text-secondary mt-1">
                                                        <span>Base: {formatCurrency(profile.baseSalary)}</span>
                                                        {profile.bonus > 0 && <span className="ml-2 text-green-600">+{formatCurrency(profile.bonus)}</span>}
                                                        {profile.deductions > 0 && <span className="ml-2 text-[#A855F7]">-{formatCurrency(profile.deductions)}</span>}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                {profile.milesDriven != null ? (
                                                    <div className="flex items-center gap-2">
                                                        <MapPin className="w-4 h-4 text-orange-500" />
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
                                                        <FileText className="w-4 h-4 text-indigo-500" />
                                                        <span className="font-medium text-primary">{profile.invoices}</span>
                                                    </div>
                                                ) : (
                                                    <span className="text-secondary">—</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div>
                                                    <p className="font-medium text-primary">{profile.daysWorked} days</p>
                                                    <div className="text-xs text-secondary mt-1 flex gap-2">
                                                        <span className="text-green-600">✓ {profile.presentDays}</span>
                                                        {profile.absentDays > 0 && <span className="text-[#A855F7]">✗ {profile.absentDays}</span>}
                                                        {profile.lateDays > 0 && <span className="text-[#00FFA3]">⚠ {profile.lateDays}</span>}
                                                        {profile.leaveDays > 0 && <span className="text-[#00D1FF]">L {profile.leaveDays}</span>}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <Clock className="w-4 h-4 text-blue-500" />
                                                    <span className="font-medium text-primary">{formatNumber(profile.totalHours)} hrs</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-1">
                                                    {profile.presentDays > 0 && (
                                                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded">
                                                            <FaCheckCircle size={12} />
                                                            {profile.presentDays}
                                                        </span>
                                                    )}
                                                    {profile.absentDays > 0 && (
                                                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-800 text-xs font-medium rounded">
                                                            <FaTimes size={12} />
                                                            {profile.absentDays}
                                                        </span>
                                                    )}
                                                    {profile.lateDays > 0 && (
                                                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-medium rounded">
                                                            <FaExclamationCircle size={12} />
                                                            {profile.lateDays}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                {(() => {
                                                    const crossBorderEligible = profile.cross_border_eligible === true || String(profile.cross_border_eligible) === 'true';
                                                    return (
                                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold ${crossBorderEligible
                                                            ? 'bg-green-100 text-green-800 border border-green-200'
                                                            : 'bg-card text-secondary border border-theme'
                                                            }`}>
                                                            {crossBorderEligible ? (
                                                                <>
                                                                    <CheckCircle2 className="w-3 h-3" />
                                                                    Yes
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <Circle className="w-3 h-3" />
                                                                    No
                                                                </>
                                                            )}
                                                        </span>
                                                    );
                                                })()}
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
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Profile Detail Sidebar */}
            {showProfileSidebar && selectedProfile && (
                <>
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-[9998] transition-opacity"
                        onClick={() => setShowProfileSidebar(false)}
                    />

                    {/* Sidebar */}
                    <div className="fixed top-0 right-0 h-full w-full max-w-4xl bg-card shadow-2xl z-[9999] transform transition-transform duration-300 ease-out overflow-y-auto">
                        {/* Header */}
                        <div className="sticky top-0 p-6 z-20 bg-card border-b border-white/10 backdrop-blur-md">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-16 h-16 rounded-full bg-[var(--accent-navyblue)] flex items-center justify-center text-white text-2xl font-bold">
                                        {selectedProfile.name.charAt(0)}
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-bold">{selectedProfile.name}</h2>
                                        <p className="text-orange-100 flex items-center gap-2 mt-1">
                                            <Truck className="w-4 h-4" />
                                            Driver
                                        </p>
                                        {/* Current Order Status */}
                                        {loadingOrder ? (
                                            <div className="mt-3 bg-card/10 rounded-xl p-3 backdrop-blur-sm border border-white/20">
                                                <div className="flex items-center gap-2 text-white/90">
                                                    <Clock className="w-4 h-4 animate-spin" />
                                                    <span className="text-sm font-medium">Loading order status...</span>
                                                </div>
                                            </div>
                                        ) :
                                            currentOrder ? (
                                                (() => {


                                                    const statusConfig: Record<string, { bg: string; border: string; text: string; badge: string; icon: any; label: string }> = {
                                                        'planned': {
                                                            bg: 'bg-[var(--accent-blue)]/10',
                                                            border: 'border-[var(--accent-blue)]/30',
                                                            text: 'text-[var(--accent-blue)]',
                                                            badge: 'bg-[var(--accent-blue)]/20 text-[var(--accent-blue)] border-[var(--accent-blue)]/40',
                                                            icon: Circle,
                                                            label: 'Planned'
                                                        },
                                                        'quoted': {
                                                            bg: 'bg-[var(--accent-purple)]/10',
                                                            border: 'border-[var(--accent-purple)]/30',
                                                            text: 'text-[var(--accent-purple)]',
                                                            badge: 'bg-[var(--accent-purple)]/20 text-[var(--accent-purple)] border-[var(--accent-purple)]/40',
                                                            icon: FileText,
                                                            label: 'Quoted'
                                                        },
                                                        'in-delivery': {
                                                            bg: 'bg-[var(--accent-amber)]/10',
                                                            border: 'border-[var(--accent-amber)]/30',
                                                            text: 'text-[var(--accent-amber)]',
                                                            badge: 'bg-[var(--accent-amber)]/20 text-[var(--accent-amber)] border-[var(--accent-amber)]/40',
                                                            icon: Truck,
                                                            label: 'In Delivery'
                                                        },
                                                        'delivered': {
                                                            bg: 'bg-[var(--accent-indigo)]/10',
                                                            border: 'border-[var(--accent-indigo)]/30',
                                                            text: 'text-[var(--accent-indigo)]',
                                                            badge: 'bg-[var(--accent-indigo)]/20 text-[var(--accent-indigo)] border-[var(--accent-indigo)]/40',
                                                            icon: CheckCircle2,
                                                            label: 'Delivered'
                                                        },
                                                        'completed': {
                                                            bg: 'bg-[var(--accent-green)]/10',
                                                            border: 'border-[var(--accent-green)]/30',
                                                            text: 'text-[var(--accent-green)]',
                                                            badge: 'bg-[var(--accent-green)]/20 text-[var(--accent-green)] border-[var(--accent-green)]/40',
                                                            icon: CheckCircle2,
                                                            label: 'Completed'
                                                        },
                                                        'verification_pending': {
                                                            bg: 'bg-[var(--accent-amber)]/10',
                                                            border: 'border-[var(--accent-amber)]/30',
                                                            text: 'text-[var(--accent-amber)]',
                                                            badge: 'bg-[var(--accent-amber)]/20 text-[var(--accent-amber)] border-[var(--accent-amber)]/40',
                                                            icon: AlertCircleIcon,
                                                            label: 'Verification Pending'
                                                        },
                                                        'pending_review': {
                                                            bg: 'bg-[var(--accent-amber)]/10',
                                                            border: 'border-[var(--accent-amber)]/30',
                                                            text: 'text-[var(--accent-amber)]',
                                                            badge: 'bg-[var(--accent-amber)]/20 text-[var(--accent-amber)] border-[var(--accent-amber)]/40',
                                                            icon: AlertCircleIcon,
                                                            label: 'Pending Review'
                                                        },
                                                        'canceled': {
                                                            bg: 'bg-[var(--accent-red)]/10',
                                                            border: 'border-[var(--accent-red)]/30',
                                                            text: 'text-[var(--accent-red)]',
                                                            badge: 'bg-[var(--accent-red)]/20 text-[var(--accent-red)] border-[var(--accent-red)]/40',
                                                            icon: X,
                                                            label: 'Canceled'
                                                        }
                                                    };

                                                    const config = statusConfig[status] || {
                                                        bg: 'bg-card',
                                                        border: 'border-theme',
                                                        text: 'text-secondary',
                                                        badge: 'bg-card text-secondary border border-theme',
                                                        icon: Package,
                                                        label: status.replace(/_/g, ' ').replace(/-/g, ' ')
                                                    };
                                                    const StatusIcon = config.icon;
                                                    return (
                                                        <div className={`mt-3 ${config.bg} rounded-xl p-4 backdrop-blur-sm border ${config.border} shadow-lg`}>
                                                            <div className="flex items-start justify-between gap-3">
                                                                <div className="flex-1">
                                                                    <div className="flex items-center gap-2 mb-2">
                                                                        <StatusIcon className={`w-5 h-5 ${config.text}`} />
                                                                        <span className={`text-xs font-semibold uppercase tracking-wider ${config.text}`}>
                                                                            Current Order
                                                                        </span>
                                                                    </div>
                                                                    <div className="flex items-center gap-2 mb-3">
                                                                        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold border ${config.badge} backdrop-blur-sm`}>
                                                                            {config.label}
                                                                        </span>
                                                                    </div>
                                                                    {currentOrder.orderNumber && (
                                                                        <div className="flex items-center gap-2">
                                                                            <Package className="w-4 h-4 text-white/70" />
                                                                            <span className="text-white/90 text-sm font-mono font-semibold">
                                                                                {currentOrder.orderNumber}
                                                                            </span>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                <div className="flex-shrink-0">
                                                                    <div className={`w-12 h-12 rounded-full ${config.bg} border-2 ${config.border} flex items-center justify-center backdrop-blur-sm`}>
                                                                        <StatusIcon className={`w-6 h-6 ${config.text}`} />
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })()
                                            )
                                                : (
                                                    <div className="mt-3 bg-card/10 rounded-xl p-3 backdrop-blur-sm border border-white/20">
                                                        <div className="flex items-center gap-2 text-white/80">
                                                            <Package className="w-4 h-4" />
                                                            <span className="text-sm font-medium">No active order</span>
                                                        </div>
                                                    </div>
                                                )}
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
                                    <UserIcon className="w-5 h-5 text-purple-600" />
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
                                                    <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full mt-1 ${selectedProfile.citizenshipStatus === 'Citizen' ? 'bg-green-100 text-green-800' :
                                                        selectedProfile.citizenshipStatus === 'Permanent Resident' ? 'bg-blue-100 text-blue-800' :
                                                            'bg-yellow-100 text-yellow-800'
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

                            {/* Payment Breakdown by Period */}
                            <div className="bg-card border border-theme rounded-xl p-6">
                                <h3 className="text-lg font-semibold text-primary mb-4 flex items-center gap-2">
                                    <DollarSign className="w-5 h-5 text-green-600" />
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
                                            <div className="bg-[var(--accent-green)]/10 rounded-lg p-4  border-green-200">
                                                <p className="text-sm font-medium text-green-600 mb-2">Total Earnings</p>
                                                <p className="text-2xl font-bold text-green-700 mb-2">{formatCurrency(periodEarnings)}</p>
                                            </div>
                                            <div className="bg-[var(--accent-blue)]/10 rounded-lg p-4  border-blue-200">
                                                <p className="text-sm font-medium text-blue-700 mb-2">Base Salary</p>
                                                <p className="text-2xl font-bold text-blue-700 mb-2">{formatCurrency(periodBase)}</p>
                                            </div>
                                            <div className="bg-[var(--accent-purple)]/10 rounded-lg p-4  border-purple-200">
                                                <p className="text-sm font-medium text-purple-600 mb-2">Bonus</p>
                                                <p className="text-2xl font-bold text-purple-700 mb-2">{formatCurrency(periodBonus)}</p>
                                            </div>
                                            <div className="bg-[var(--accent-red)]/10 rounded-lg p-4 text-[var(--accent-red)]">
                                                <p className="text-sm font-medium text-white mb-2">Deductions</p>
                                                <p className="text-2xl font-bold text-[var(--accent-red)] mb-2">{formatCurrency(periodDeductions)}</p>
                                            </div>
                                        </div>
                                    );
                                })()}
                            </div>

                            {/* Driver Performance */}
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
                                            <div className="bg-[var(--accent-orange)]/10 rounded-lg p-4 border-orange-200">
                                                <p className="text-sm text-orange-700 mb-1">Miles Driven</p>
                                                <p className="text-2xl font-bold text-orange-700">{formatNumber(periodMiles)}</p>
                                            </div>
                                            <div className="bg-[var(--accent-blue)]/10 rounded-lg p-4 border-blue-200">
                                                <p className="text-sm text-blue-700 mb-1">Trips Completed</p>
                                                <p className="text-2xl font-bold text-blue-700">{periodTrips}</p>
                                            </div>
                                            <div className="bg-[var(--accent-amber)]/10 rounded-lg p-4 border-amber-200">
                                                <p className="text-sm text-amber-600 mb-1">Invoices</p>
                                                <p className="text-2xl font-bold text-amber-700">{periodInvoices}</p>
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
                                    const periodLateDays = Math.round(selectedProfile.lateDays * multiplier);
                                    const periodLeaveDays = Math.round(selectedProfile.leaveDays * multiplier);
                                    const periodTotalHours = selectedProfile.totalHours * multiplier;

                                    return (
                                        <>
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">

                                                {/* Working Days */}
                                                <div className="bg-[var(--accent-blue)]/10 rounded-lg p-4 border border-[var(--accent-blue)]/30">
                                                    <p className="text-sm text-[#00D1FF] mb-1">Working Days</p>
                                                    <p className="text-2xl font-bold text-[#00D1FF]">{periodDaysWorked}</p>
                                                </div>

                                                {/* Present Days */}
                                                <div className="bg-[var(--accent-green)]/10 rounded-lg p-4 border border-[var(--accent-green)]/30">
                                                    <p className="text-sm text-[var(--accent-green)] mb-1">Present Days</p>
                                                    <p className="text-2xl font-bold text-[var(--accent-green)]">{periodPresentDays}</p>
                                                </div>

                                                {/* Absent Days */}
                                                <div className="bg-[var(--accent-red)]/10 rounded-lg p-4 border border-[var(--accent-red)]/30">
                                                    <p className="text-sm text-[var(--accent-red)] mb-1">Absent Days</p>
                                                    <p className="text-2xl font-bold text-[var(--accent-red)]">{periodAbsentDays}</p>
                                                </div>

                                                {/* Late Days */}
                                                <div className="bg-[var(--accent-teal)]/10 rounded-lg p-4 border border-[var(--accent-teal)]/30">
                                                    <p className="text-sm text-[var(--accent-teal)] mb-1">Late Days</p>
                                                    <p className="text-2xl font-bold text-[var(--accent-teal)]">{periodLateDays}</p>
                                                </div>

                                            </div>

                                            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">

                                                {/* Total Hours */}
                                                <div className="bg-[var(--accent-purple)]/10 rounded-lg p-4 border border-[var(--accent-purple)]/30">
                                                    <p className="text-sm text-[var(--accent-purple)] mb-1">Total Hours</p>
                                                    <p className="text-2xl font-bold text-[var(--accent-purple)]">
                                                        {formatNumber(periodTotalHours)} hrs
                                                    </p>
                                                </div>

                                                {/* Leave Days */}
                                                <div className="bg-[var(--accent-amber)]/10 rounded-lg p-4 border border-[var(--accent-amber)]/30">
                                                    <p className="text-sm text-[var(--accent-amber)] mb-1">Leave Days</p>
                                                    <p className="text-2xl font-bold text-[var(--accent-amber)]">{periodLeaveDays}</p>
                                                </div>

                                            </div>
                                        </>
                                    );
                                })()}
                            </div>

                            {/* Notes */}
                            {selectedProfile.notes && (
                                <div className="rounded-xl p-6">
                                    <h3 className="text-lg font-semibold text-primary mb-4 flex items-center gap-2">
                                        <AlertCircle className="w-5 h-5 text-[var(--accent-orange)]" />
                                        Notes
                                    </h3>

                                    <div className="bg-[var(--accent-orange)]/10 border border-[var(--accent-orange)]/30 rounded-lg p-4">
                                        <p className="text-primary leading-relaxed">
                                            {selectedProfile.notes}
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Timeline & Notes */}
                            <TimelineNotes entityType="drivers" entityId={selectedProfile._id} />
                        </div>
                    </div>
                </>
            )}
            {showDrugTestModal && selectedProfile && (
                <DrugTestUploadModal
                    driverId={selectedProfile._id}
                    driverName={selectedProfile.name}
                    onClose={() => {
                        setShowDrugTestModal(false);
                        setEditingDrugTest(null);
                    }}
                    onSuccess={async () => {
                        try {
                            const response = await getDriverById(selectedProfile._id);
                            if (response?.success && response.data) {
                                setDriverDetails(response.data);
                                const tests = response.data.details?.drug_tests || response.data.drug_tests || [];
                                setDrugTests(Array.isArray(tests) ? tests : []);
                            }
                        } catch (error) {
                            console.error('Error refreshing driver details:', error);
                        }
                        setShowDrugTestModal(false);
                        setEditingDrugTest(null);
                    }}
                    editingTest={editingDrugTest}
                />
            )}
        </div>
    );
};

export default DriverPortfolio;