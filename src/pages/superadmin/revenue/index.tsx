import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    DollarSign,
    TrendingUp,
    Users,
    Calendar,
    Eye,
    MoreHorizontal,
    Building2,
    CreditCard,
    AlertCircle,
    CheckCircle,
    Clock,
    FileText,
    Copy,
    ExternalLink,
} from 'lucide-react';
import { Modal, Button, message } from 'antd';
import { getSuperAdminRevenue } from '../../../axios/api/superadmin';

const RevenueDashboard = () => {
    const navigate = useNavigate();

    const [revenueFilter, setRevenueFilter] = useState('all');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [revenueData, setRevenueData] = useState<any>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [limit] = useState(50);
    const [showViewModal, setShowViewModal] = useState(false);
    const [selectedRevenue, setSelectedRevenue] = useState<any>(null);
    const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
    const dropdownRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

    useEffect(() => {
        fetchRevenueData();
    }, [revenueFilter, currentPage]);

    // Close dropdown when clicking outside or pressing Escape
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (activeDropdown && dropdownRefs.current[activeDropdown]) {
                const dropdownElement = dropdownRefs.current[activeDropdown];
                if (dropdownElement && !dropdownElement.contains(event.target as Node)) {
                    setActiveDropdown(null);
                }
            }
        };

        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape' && activeDropdown) {
                setActiveDropdown(null);
            }
        };

        if (activeDropdown) {
            document.addEventListener('mousedown', handleClickOutside);
            document.addEventListener('keydown', handleEscape);
            return () => {
                document.removeEventListener('mousedown', handleClickOutside);
                document.removeEventListener('keydown', handleEscape);
            };
        }
    }, [activeDropdown]);

    const fetchRevenueData = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await getSuperAdminRevenue(revenueFilter, currentPage, limit);

            console.log('Full API Response:', response);

            if (response?.success && response?.data) {
                console.log('Setting revenue data:', response.data);
                setRevenueData(response.data);
            } else {
                setError(response?.message || 'Failed to load revenue data');
            }
        } catch (err: any) {
            console.error('Revenue fetch error:', err);
            setError(err?.message || 'An error occurred while fetching revenue data');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
                    <p className="mt-4 text-secondary">Loading revenue data...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <p className="text-[#A855F7] mb-4">{error}</p>
                    <button
                        onClick={fetchRevenueData}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                    >
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    if (!revenueData) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <p className="text-secondary">No data available</p>
            </div>
        );
    }

    // Use real data from API
    const revenueEntries = revenueData.revenueEntries || [];
    const metrics = revenueData.metrics || {};
    const pagination = revenueData.pagination || { total: 0, page: 1, limit: 50, totalPages: 1 };

    // Debug logging
    console.log('Revenue Data:', revenueData);
    console.log('Metrics:', metrics);
    console.log('Revenue Entries:', revenueEntries);

    // Revenue metrics from API - ensure proper number handling
    const totalRevenue = typeof metrics.totalRevenue === 'number'
        ? metrics.totalRevenue
        : (metrics.totalRevenue != null ? parseFloat(String(metrics.totalRevenue)) : 0);
    const monthlyRecurring = typeof metrics.monthlyRecurring === 'number'
        ? metrics.monthlyRecurring
        : (metrics.monthlyRecurring != null ? parseFloat(String(metrics.monthlyRecurring)) : 0);
    const overdueAmount = typeof metrics.overdueAmount === 'number'
        ? metrics.overdueAmount
        : (metrics.overdueAmount != null ? parseFloat(String(metrics.overdueAmount)) : 0);
    const trialRevenuePotential = typeof metrics.trialRevenuePotential === 'number'
        ? metrics.trialRevenuePotential
        : (metrics.trialRevenuePotential != null ? parseFloat(String(metrics.trialRevenuePotential)) : 0);
    const revenueGrowth = typeof metrics.revenueGrowth === 'number'
        ? metrics.revenueGrowth
        : (metrics.revenueGrowth != null ? parseFloat(String(metrics.revenueGrowth)) : 0);
    const monthlyRecurringGrowth = typeof metrics.monthlyRecurringGrowth === 'number'
        ? metrics.monthlyRecurringGrowth
        : (metrics.monthlyRecurringGrowth != null ? parseFloat(String(metrics.monthlyRecurringGrowth)) : 0);

    console.log('Metrics object:', metrics);
    console.log('Total Revenue:', totalRevenue, typeof totalRevenue, 'Raw:', metrics.totalRevenue);
    console.log('Monthly Recurring:', monthlyRecurring, typeof monthlyRecurring, 'Raw:', metrics.monthlyRecurring);

    const getStatusColor = (status: any) => {
        switch (status) {
            case 'Paid': return 'bg-green-100 text-green-800';
            case 'Overdue': return 'bg-red-100 text-red-800';
            case 'Trial': return 'bg-blue-100 text-blue-800';
            case 'Pending': return 'bg-yellow-100 text-yellow-800';
            default: return 'bg-card text-primary';
        }
    };


    const getStatusIcon = (status: any) => {
        switch (status) {
            case 'Paid': return <CheckCircle className="w-4 h-4 text-green-500" />;
            case 'Overdue': return <AlertCircle className="w-4 h-4 text-red-500" />;
            case 'Trial': return <Clock className="w-4 h-4 text-blue-500" />;
            default: return <Clock className="w-4 h-4 text-secondary" />;
        }
    };


    // Filtering is handled by the API, but we can add client-side filter if needed
    const filteredRevenue = revenueEntries;

    const handleViewDetails = (revenue: any) => {
        setSelectedRevenue(revenue);
        setShowViewModal(true);
    };



    const handleCopyId = (id: string) => {
        navigator.clipboard.writeText(id);
        message.success('ID copied to clipboard');
    };

    const handleMoreActions = (revenueId: string, event: React.MouseEvent) => {
        event.stopPropagation();
        setActiveDropdown(activeDropdown === revenueId ? null : revenueId);
    };

    return (
        <div className="min-h-screen bg-card">
            {/* Header */}
            <div className="bg-card border-b border-theme px-6 py-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold text-primary flex items-center">
                            <DollarSign className="w-8 h-8 text-green-600 mr-3" />
                            Revenue Dashboard
                        </h1>
                        <p className="text-secondary mt-1">Track revenue, payments, and financial metrics</p>
                    </div>

                </div>
            </div>

            <div className="p-6">
                {/* Revenue Metrics Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                    {/* Total Revenue */}
                    <div className="bg-card rounded-xl shadow-sm border border-theme p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-secondary mb-1">Total Revenue</p>
                                <p className="text-2xl font-bold text-primary">
                                    ${typeof totalRevenue === 'number' && !isNaN(totalRevenue) ? totalRevenue.toLocaleString('en-CA', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) : '0'}
                                </p>
                                <div className="flex items-center mt-2">
                                    <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
                                    <span className="text-sm text-green-600">
                                        {revenueGrowth >= 0 ? '+' : ''}{revenueGrowth}% from last month
                                    </span>
                                </div>
                            </div>
                            <div className="bg-green-100 p-3 rounded-lg">
                                <DollarSign className="w-6 h-6 text-green-600" />
                            </div>
                        </div>
                    </div>

                    {/* Monthly Recurring Revenue */}
                    <div className="bg-card rounded-xl shadow-sm border border-theme p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-secondary mb-1">Monthly Recurring</p>
                                <p className="text-2xl font-bold text-primary">
                                    ${typeof monthlyRecurring === 'number' && !isNaN(monthlyRecurring) ? monthlyRecurring.toLocaleString('en-CA', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) : '0'}
                                </p>
                                <div className="flex items-center mt-2">
                                    <TrendingUp className="w-4 h-4 text-blue-500 mr-1" />
                                    <span className="text-sm text-[#00D1FF]">
                                        {monthlyRecurringGrowth >= 0 ? '+' : ''}{monthlyRecurringGrowth}% growth
                                    </span>
                                </div>
                            </div>
                            <div className="bg-blue-100 p-3 rounded-lg">
                                <Calendar className="w-6 h-6 text-[#00D1FF]" />
                            </div>
                        </div>
                    </div>

                    {/* Overdue Payments */}
                    <div className="bg-card rounded-xl shadow-sm border border-theme p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-secondary mb-1">Overdue Amount</p>
                                <p className="text-2xl font-bold text-primary">
                                    ${typeof overdueAmount === 'number' && !isNaN(overdueAmount) ? overdueAmount.toLocaleString('en-CA', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) : '0'}
                                </p>
                                <div className="flex items-center mt-2">
                                    <AlertCircle className="w-4 h-4 text-red-500 mr-1" />
                                    <span className="text-sm text-[#A855F7]">Needs attention</span>
                                </div>
                            </div>
                            <div className="bg-red-100 p-3 rounded-lg">
                                <AlertCircle className="w-6 h-6 text-[#A855F7]" />
                            </div>
                        </div>
                    </div>

                    {/* Trial Potential */}
                    <div className="bg-card rounded-xl shadow-sm border border-theme p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-secondary mb-1">Trial Potential</p>
                                <p className="text-2xl font-bold text-primary">
                                    ${typeof trialRevenuePotential === 'number' && !isNaN(trialRevenuePotential) ? trialRevenuePotential.toLocaleString('en-CA', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) : '0'}
                                </p>
                                <div className="flex items-center mt-2">
                                    <Clock className="w-4 h-4 text-purple-500 mr-1" />
                                    <span className="text-sm text-purple-600">Conversion pending</span>
                                </div>
                            </div>
                            <div className="bg-purple-100 p-3 rounded-lg">
                                <Users className="w-6 h-6 text-purple-600" />
                            </div>
                        </div>
                    </div>
                </div>



                {/* Filter and Results Summary */}
                <div className="mb-6 flex items-center justify-between">
                    <div className="flex space-x-2">
                        <button
                            onClick={() => setRevenueFilter('all')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${revenueFilter === 'all'
                                ? 'bg-green-600 text-white'
                                : 'bg-card text-primary hover:bg-gray-200'
                                }`}
                        >
                            All
                        </button>
                        <button
                            onClick={() => setRevenueFilter('paid')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${revenueFilter === 'paid'
                                ? 'bg-green-600 text-white'
                                : 'bg-card text-primary hover:bg-gray-200'
                                }`}
                        >
                            Paid
                        </button>
                        <button
                            onClick={() => setRevenueFilter('overdue')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${revenueFilter === 'overdue'
                                ? 'bg-green-600 text-white'
                                : 'bg-card text-primary hover:bg-gray-200'
                                }`}
                        >
                            Overdue
                        </button>
                        <button
                            onClick={() => setRevenueFilter('trial')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${revenueFilter === 'trial'
                                ? 'bg-green-600 text-white'
                                : 'bg-card text-primary hover:bg-gray-200'
                                }`}
                        >
                            Trial
                        </button>
                    </div>
                    <p className="text-secondary">
                        Showing <span className="font-medium">{filteredRevenue.length}</span> revenue entries
                    </p>
                </div>

                {/* Revenue Table */}
                <div className="bg-card rounded-xl shadow-sm border border-theme overflow-hidden">
                    <div className="overflow-x-auto max-w-full">
                        <table className="w-full table-auto">
                            <thead className="bg-card border-b border-theme">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-medium text-secondary uppercase tracking-wider w-64">
                                        Customer
                                    </th>

                                    <th className="px-6 py-4 text-left text-xs font-medium text-secondary uppercase tracking-wider w-32">
                                        Amount
                                    </th>

                                    <th className="px-6 py-4 text-left text-xs font-medium text-secondary uppercase tracking-wider w-40">
                                        Payment Date
                                    </th>

                                    <th className="px-6 py-4 text-left text-xs font-medium text-secondary uppercase tracking-wider w-32">
                                        Status
                                    </th>

                                    <th className="px-6 py-4 text-left text-xs font-medium text-secondary uppercase tracking-wider w-32">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-card  divide-theme">
                                {filteredRevenue.map((revenue: any) => (
                                    <tr key={revenue.id} className="hover:bg-[rgba(255,255,255,0.03)]">
                                        <td className="px-6 py-4 whitespace-nowrap w-64">
                                            <div className="flex items-center">
                                                <div className="bg-green-100 p-2 rounded-lg mr-3">
                                                    <Building2 className="w-5 h-5 text-green-600" />
                                                </div>
                                                <div>
                                                    <div className="text-sm font-medium text-primary">{revenue.customer || revenue.adminName || 'N/A'}</div>
                                                    <div className="text-sm text-secondary">{revenue.customerId}</div>
                                                    {revenue.companyName && (
                                                        <div className="text-xs text-secondary mt-0.5">Company: {revenue.companyName}</div>
                                                    )}
                                                </div>
                                            </div>
                                        </td>

                                        <td className="px-6 py-4 whitespace-nowrap w-32">
                                            <div className="text-sm font-medium text-primary">
                                                ${typeof revenue.amount === 'number' && !isNaN(revenue.amount) ? revenue.amount.toLocaleString('en-CA', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) : '0'}
                                            </div>
                                            <div className="text-xs text-secondary">
                                                {revenue.recurring ? 'Monthly' : 'One-time'}
                                            </div>
                                        </td>

                                        <td className="px-6 py-4 whitespace-nowrap w-40">
                                            <div className="text-sm text-primary">{revenue.paymentDate}</div>
                                        </td>

                                        <td className="px-6 py-4 whitespace-nowrap w-32">
                                            <div className="flex items-center">
                                                {getStatusIcon(revenue.status)}
                                                <span className={`ml-2 px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(revenue.status)}`}>
                                                    {revenue.status}
                                                </span>
                                            </div>
                                        </td>

                                        <td className="px-6 py-4 whitespace-nowrap w-32">
                                            <div className="flex items-center space-x-2">
                                                <button
                                                    onClick={() => handleViewDetails(revenue)}
                                                    className="text-secondary hover:text-green-600 p-1 rounded transition-colors"
                                                    title="View Details"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </button>
                                                <div className="relative" ref={(el) => { dropdownRefs.current[revenue.id] = el; }}>
                                                    <button
                                                        onClick={(e) => handleMoreActions(revenue.id, e)}
                                                        className="text-secondary hover:text-secondary p-1 rounded transition-colors"
                                                        title="More Actions"
                                                    >
                                                        <MoreHorizontal className="w-4 h-4" />
                                                    </button>
                                                    {activeDropdown === revenue.id && (
                                                        <>
                                                            {/* Backdrop to close on click outside */}
                                                            <div
                                                                className="fixed inset-0 z-[9998]"
                                                                onClick={() => setActiveDropdown(null)}
                                                            />
                                                            {/* Dropdown menu */}
                                                            <div className="absolute right-0 bottom-full mb-2 w-48 bg-card rounded-lg shadow-xl border border-theme z-[9999] py-1 overflow-hidden">
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleCopyId(revenue.id);
                                                                        setActiveDropdown(null);
                                                                    }}
                                                                    className="w-full text-left px-4 py-2 text-sm text-primary hover:bg-[rgba(255,255,255,0.03)] flex items-center space-x-2 transition-colors"
                                                                >
                                                                    <Copy className="w-4 h-4" />
                                                                    <span>Copy Revenue ID</span>
                                                                </button>
                                                               
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleCopyId(revenue.customerId);
                                                                        setActiveDropdown(null);
                                                                    }}
                                                                    className="w-full text-left px-4 py-2 text-sm text-primary hover:bg-[rgba(255,255,255,0.03)] flex items-center space-x-2 transition-colors"
                                                                >
                                                                    <Copy className="w-4 h-4" />
                                                                    <span>Copy Customer ID</span>
                                                                </button>
                                                                <div className="border-t border-theme my-1"></div>
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setActiveDropdown(null);
                                                                        // Navigate to viewalladmins page
                                                                        navigate('/superadmin/viewalladmins');
                                                                        // Show message with customer ID for easy searching
                                                                        setTimeout(() => {
                                                                            message.info({
                                                                                content: `Navigate to Admin Accounts page. Search for customer ID: ${revenue.customerId}`,
                                                                                duration: 5,
                                                                            });
                                                                        }, 300);
                                                                    }}
                                                                    className="w-full text-left px-4 py-2 text-sm text-primary hover:bg-[rgba(255,255,255,0.03)] flex items-center space-x-2 transition-colors"
                                                                >
                                                                    <ExternalLink className="w-4 h-4" />
                                                                    <span>View Customer Profile</span>
                                                                </button>
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Pagination */}
                <div className="mt-6 flex items-center justify-between">
                    <div className="text-sm text-secondary">
                        Showing {((currentPage - 1) * limit) + 1} to {Math.min(currentPage * limit, pagination.total)} of {pagination.total} revenue entries
                    </div>
                    <div className="flex space-x-2">
                        <button
                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                            disabled={currentPage === 1}
                            className="px-3 py-2 border border-theme rounded-lg text-sm hover:bg-[rgba(255,255,255,0.03)] disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Previous
                        </button>
                        {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                            const pageNum = i + 1;
                            return (
                                <button
                                    key={pageNum}
                                    onClick={() => setCurrentPage(pageNum)}
                                    className={`px-3 py-2 rounded-lg text-sm ${currentPage === pageNum
                                        ? 'bg-green-600 text-white hover:bg-green-700'
                                        : 'border border-theme hover:bg-[rgba(255,255,255,0.03)]'
                                        }`}
                                >
                                    {pageNum}
                                </button>
                            );
                        })}
                        <button
                            onClick={() => setCurrentPage(prev => Math.min(pagination.totalPages, prev + 1))}
                            disabled={currentPage >= pagination.totalPages}
                            className="px-3 py-2 border border-theme rounded-lg text-sm hover:bg-[rgba(255,255,255,0.03)] disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Next
                        </button>
                    </div>
                </div>
            </div>

            {/* View Revenue Details Modal */}
            <Modal
                title={
                    <div className="flex items-center gap-2 text-slate-200">
                        <DollarSign className="w-5 h-5 text-blue-500" />
                        <span>Revenue Details</span>
                    </div>
                }
                open={showViewModal}
                onCancel={() => {
                    setShowViewModal(false);
                    setSelectedRevenue(null);
                }}
                footer={[
                    <Button
                        key="close"
                        onClick={() => {
                            setShowViewModal(false);
                            setSelectedRevenue(null);
                        }}
                        className="bg-slate-800 text-slate-200 border border-slate-700 hover:bg-slate-700"
                    >
                        Close
                    </Button>
                ]}
                width={700}
                styles={{
                    content: {
                        backgroundColor: "#0f172a",
                        border: "1px solid #1e293b",
                    },
                    header: {
                        backgroundColor: "#0f172a",
                        borderBottom: "1px solid #1e293b",
                    },
                    body: {
                        backgroundColor: "#0f172a",
                    },
                    footer: {
                        backgroundColor: "#0f172a",
                        borderTop: "1px solid #1e293b",
                    }
                }}
            >
                {selectedRevenue && (
                    <div className="space-y-6 py-4">

                        {/* Customer Information */}
                        <div className="bg-slate-900 rounded-lg p-4 border border-slate-700">
                            <h3 className="text-sm font-semibold text-slate-200 mb-3 flex items-center gap-2">
                                <Building2 className="w-4 h-4 text-slate-400" />
                                Customer Information
                            </h3>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-xs text-slate-400 mb-1">Customer Name</p>
                                    <p className="text-sm font-medium text-slate-200">
                                        {selectedRevenue.customer || selectedRevenue.adminName || 'N/A'}
                                    </p>
                                </div>

                                <div>
                                    <p className="text-xs text-slate-400 mb-1">Customer ID</p>
                                    <div className="flex items-center gap-2">
                                        <p className="text-sm font-medium text-slate-200">
                                            {selectedRevenue.customerId}
                                        </p>
                                        <button
                                            onClick={() => handleCopyId(selectedRevenue.customerId)}
                                            className="text-slate-400 hover:text-slate-200"
                                        >
                                            <Copy className="w-3 h-3" />
                                        </button>
                                    </div>
                                </div>

                                {selectedRevenue.companyName && (
                                    <div className="col-span-2">
                                        <p className="text-xs text-slate-400 mb-1">Company Name</p>
                                        <p className="text-sm font-medium text-slate-200">
                                            {selectedRevenue.companyName}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Payment Information */}
                        <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-lg p-4 border border-slate-700">
                            <h3 className="text-sm font-semibold text-slate-200 mb-3 flex items-center gap-2">
                                <CreditCard className="w-4 h-4 text-slate-400" />
                                Payment Information
                            </h3>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-xs text-slate-400 mb-1">Amount</p>
                                    <p className="text-lg font-bold text-slate-100">
                                        ${typeof selectedRevenue.amount === 'number' && !isNaN(selectedRevenue.amount)
                                            ? selectedRevenue.amount.toLocaleString('en-CA', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
                                            : '0'}
                                    </p>
                                </div>

                                <div>
                                    <p className="text-xs text-slate-400 mb-1">Payment Type</p>
                                    <p className="text-sm font-medium text-slate-200">
                                        {selectedRevenue.recurring ? 'Monthly Recurring' : 'One-time'}
                                    </p>
                                </div>

                                <div>
                                    <p className="text-xs text-slate-400 mb-1">Payment Date</p>
                                    <p className="text-sm font-medium text-slate-200">
                                        {selectedRevenue.paymentDate}
                                    </p>
                                </div>

                                <div>
                                    <p className="text-xs text-slate-400 mb-1">Next Payment</p>
                                    <p className="text-sm font-medium text-slate-200">
                                        {selectedRevenue.nextPayment || 'N/A'}
                                    </p>
                                </div>

                                <div>
                                    <p className="text-xs text-slate-400 mb-1">Payment Method</p>
                                    <p className="text-sm font-medium text-slate-200">
                                        {selectedRevenue.method || 'N/A'}
                                    </p>
                                </div>

                                <div>
                                    <p className="text-xs text-slate-400 mb-1">Status</p>
                                    <div className="flex items-center gap-2">
                                        {getStatusIcon(selectedRevenue.status)}
                                        <span
                                            className={`px-2 py-1 rounded text-xs font-medium ${selectedRevenue.status === "active"
                                                    ? "bg-green-900 text-green-400"
                                                    : "bg-slate-700 text-slate-300"
                                                }`}
                                        >
                                            {selectedRevenue.status}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Plan Information */}
                        <div className="bg-slate-900 rounded-lg p-4 border border-slate-700">
                            <h3 className="text-sm font-semibold text-slate-200 mb-3 flex items-center gap-2">
                                <FileText className="w-4 h-4 text-slate-400" />
                                Plan Information
                            </h3>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-xs text-slate-400 mb-1">Plan Name</p>
                                    <p className="text-sm font-medium text-slate-200">
                                        {selectedRevenue.plan || 'N/A'}
                                    </p>
                                </div>

                                <div>
                                    <p className="text-xs text-slate-400 mb-1">Plan Type</p>
                                    <p className="text-sm font-medium text-slate-200">
                                        {selectedRevenue.recurring ? 'Monthly' : 'Lifetime'}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Revenue ID */}
                        <div className="bg-slate-900 rounded-lg p-3 border border-slate-700">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs text-slate-400 mb-1">Revenue Entry ID</p>
                                    <p className="text-sm font-mono text-slate-200">
                                        {selectedRevenue.id}
                                    </p>
                                </div>

                                <button
                                    onClick={() => handleCopyId(selectedRevenue.id)}
                                    className="text-slate-400 hover:text-slate-200 p-1 rounded"
                                >
                                    <Copy className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                    </div>
                )}
            </Modal>
        </div>
    );
};

export default RevenueDashboard;