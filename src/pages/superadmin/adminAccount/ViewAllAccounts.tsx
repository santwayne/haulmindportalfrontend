import React, { useState, useEffect } from 'react';
import {
    Users, Search, Filter, Plus, Edit, Trash2, Eye, EyeOff,
    Building2, Mail, Phone, Lock, AlertCircle, Tag,
} from 'lucide-react';
import { message, Modal, Switch, Select } from 'antd';
import { getAllAdmins, createAdmin, updateAdmin, deleteAdmin, getAllPlans, assignPlanToAdmin } from '../../../axios/api/superadmin';

interface Admin {
    _id: string;
    name: string;
    email: string;
    phone?: string;
    internalId: string;
    status: 'active' | 'inactive';
    joinDate: string;
    createdAt: string;
    company?: {
        _id: string;
        companyName: string;
        companyCode: string;
        address?: string;
        contactEmail?: string;
        contactPhone?: string;
        logoUrl?: string;
    };
    location?: {
        address?: string;
    };
    country?: string;
    state?: string;
    city?: string;
    currentSubscription?: {
        _id: string;
        subscriptionType: string;
        status: 'pending' | 'active' | 'cancelled' | 'expired' | 'past_due';
        maxTrucks?: number;
        endDate?: string;
        plan?: {
            _id: string;
            planName: string;
            planType: 'lifetime' | 'monthly';
        };
    } | null;
}

interface PlanOption {
    _id: string;
    planName: string;
    planType: 'lifetime' | 'monthly';
    status: 'active' | 'inactive';
    allowedRoles?: string[];
    lifetime?: {
        installments?: {
            threeMonths?: { enabled?: boolean };
            sixMonths?: { enabled?: boolean };
        };
    };
    monthly?: {
        fullApp?: { enabled?: boolean };
        truckPricing?: { tiers?: unknown[] };
    };
}

// Mirrors Plan.allowedRoles enum in backend/models/planModel.js — the staff roles a
// customer's plan can permit them to create.
const ASSIGNABLE_PLAN_ROLES = [
    'driver', 'dispatcher', 'hr', 'contact', 'customer', 'reporter',
    'Maintenance Crew (Mechanics)', 'Fleet Maintenance Manager', 'Compliance Manager', 'safety officer'
];

const ViewAllAccounts = () => {
    const [admins, setAdmins] = useState<Admin[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedFilter, setSelectedFilter] = useState('all');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalAdmins, setTotalAdmins] = useState(0);

    // Modal states
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showViewModal, setShowViewModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showAssignPlanModal, setShowAssignPlanModal] = useState(false);
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [statusUpdating, setStatusUpdating] = useState<string | null>(null); // Track which admin's status is being updated
    const [selectedAdmin, setSelectedAdmin] = useState<Admin | null>(null);

    // Assign Plan state
    const [plans, setPlans] = useState<PlanOption[]>([]);
    const [plansLoading, setPlansLoading] = useState(false);
    const [assignForm, setAssignForm] = useState<{ planId: string; subscriptionType: string; truckCount: string; customAmount: string }>({
        planId: '', subscriptionType: '', truckCount: '1', customAmount: ''
    });
    const [assignSelectedRoles, setAssignSelectedRoles] = useState<string[]>(ASSIGNABLE_PLAN_ROLES);
    const [assignLoading, setAssignLoading] = useState(false);

    const selectedAssignPlan = plans.find(p => p._id === assignForm.planId) || null;

    const subscriptionTypeOptions = (() => {
        if (!selectedAssignPlan) return [];
        if (selectedAssignPlan.planType === 'lifetime') {
            const opts = [{ value: 'one-time', label: 'One-Time Payment' }];
            if (selectedAssignPlan.lifetime?.installments?.threeMonths?.enabled) {
                opts.push({ value: '3-months', label: '3-Month Installments' });
            }
            if (selectedAssignPlan.lifetime?.installments?.sixMonths?.enabled) {
                opts.push({ value: '6-months', label: '6-Month Installments' });
            }
            return opts;
        }
        // monthly
        const opts: { value: string; label: string }[] = [];
        if (selectedAssignPlan.monthly?.fullApp?.enabled) {
            opts.push({ value: 'full-app', label: 'Full App (Monthly)' });
        }
        if (selectedAssignPlan.monthly?.truckPricing?.tiers?.length) {
            opts.push({ value: '1-month', label: '1 Month (Truck-based)' });
            opts.push({ value: '6-months', label: '6 Months (Truck-based)' });
            opts.push({ value: '1-year', label: '1 Year (Truck-based)' });
        }
        return opts;
    })();

    const needsTruckCount = ['1-month', '6-months', '1-year'].includes(assignForm.subscriptionType);

    const fetchPlansForAssign = async () => {
        setPlansLoading(true);
        try {
            const response = await getAllPlans();
            if (response?.success) {
                setPlans(response.data || []);
            }
        } catch (error) {
            console.error('Error fetching plans:', error);
        } finally {
            setPlansLoading(false);
        }
    };

    const handleOpenAssignPlan = (admin: Admin) => {
        setSelectedAdmin(admin);
        setAssignForm({ planId: '', subscriptionType: '', truckCount: '1', customAmount: '' });
        setAssignSelectedRoles(ASSIGNABLE_PLAN_ROLES);
        if (plans.length === 0) fetchPlansForAssign();
        setShowAssignPlanModal(true);
    };

    const handleSelectAssignPlan = (planId: string) => {
        setAssignForm({ planId, subscriptionType: '', truckCount: '1', customAmount: '' });
        const plan = plans.find(p => p._id === planId);
        // Pre-fill the module checklist from the template plan's own restrictions (undefined = all allowed)
        setAssignSelectedRoles(plan?.allowedRoles?.length ? plan.allowedRoles : ASSIGNABLE_PLAN_ROLES);
    };

    const toggleAssignRole = (role: string) => {
        setAssignSelectedRoles(prev =>
            prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role]
        );
    };

    const handleAssignPlan = async () => {
        if (!selectedAdmin) return;
        if (!assignForm.planId || !assignForm.subscriptionType) {
            message.error('Please select a plan and a billing option');
            return;
        }
        if (needsTruckCount && (!assignForm.truckCount || Number(assignForm.truckCount) < 1)) {
            message.error('Please enter a valid truck count');
            return;
        }
        if (assignForm.customAmount !== '' && (isNaN(Number(assignForm.customAmount)) || Number(assignForm.customAmount) < 0)) {
            message.error('Custom price must be a non-negative number');
            return;
        }

        setAssignLoading(true);
        try {
            const response = await assignPlanToAdmin(selectedAdmin._id, {
                planId: assignForm.planId,
                subscriptionType: assignForm.subscriptionType,
                truckCount: needsTruckCount ? Number(assignForm.truckCount) : undefined,
                customAmount: assignForm.customAmount !== '' ? Number(assignForm.customAmount) : undefined,
                // Only sent when it differs from "everything allowed" so plans with no restriction stay that way
                allowedRoles: assignSelectedRoles.length < ASSIGNABLE_PLAN_ROLES.length ? assignSelectedRoles : undefined
            });
            if (response?.success) {
                message.success(response.message || 'Plan assigned successfully');
                setShowAssignPlanModal(false);
                fetchAdmins();
            } else {
                message.error(response?.message || 'Failed to assign plan');
            }
        } catch (error: any) {
            console.error('Error assigning plan:', error);
            message.error(error?.message || 'Failed to assign plan');
        } finally {
            setAssignLoading(false);
        }
    };

    // Form data
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        phone: '',
        country: '',
        state: '',
        city: '',
        address: '',
        internalId: '',
        status: 'active' as 'active' | 'inactive',
        policies: '',
        company: '',
        trialDays: '' // Create-only: overrides the Super Admin's default trial length for this customer
    });

    // Fetch admins
    const fetchAdmins = async () => {
        setLoading(true);
        try {
            const response = await getAllAdmins(
                searchTerm || undefined,
                selectedFilter !== 'all' ? selectedFilter : undefined,
                currentPage,
                100
            );

            if (response?.success) {
                setAdmins(response.data || []);
                if (response.pagination) {
                    setTotalPages(response.pagination.totalPages || 1);
                    setTotalAdmins(response.pagination.totalAdmins || 0);
                }
            } else {
                message.error(response?.message || 'Failed to fetch admins');
            }
        } catch (error: any) {
            console.error('Error fetching admins:', error);
            message.error(error?.message || 'Failed to fetch admins');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAdmins();
    }, [currentPage]);

    // Debounce search
    useEffect(() => {
        const timeoutId = setTimeout(() => {
            if (currentPage === 1) {
                fetchAdmins();
            } else {
                setCurrentPage(1);
            }
        }, 500);
        return () => clearTimeout(timeoutId);
    }, [searchTerm, selectedFilter]);

    // Filter admins based on search and filters (client-side for instant feedback)
    const filteredAdmins = admins.filter(admin => {
        const matchesSearch = !searchTerm ||
            admin.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            admin.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            admin.internalId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            admin.company?.companyName?.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesStatus = selectedFilter === 'all' || admin.status === selectedFilter;

        return matchesSearch && matchesStatus;
    });

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const resetForm = () => {
        setFormData({
            name: '',
            email: '',
            password: '',
            phone: '',
            country: '',
            state: '',
            city: '',
            address: '',
            internalId: '',
            status: 'active',
            policies: '',
            company: '',
            trialDays: ''
        });
        setSelectedAdmin(null);
    };

    const handleCreate = async () => {
        try {
            if (!formData.name || !formData.email || !formData.password) {
                message.error('Name, email, and password are required');
                return;
            }

            const payload = {
                ...formData,
                trialDays: formData.trialDays ? Number(formData.trialDays) : undefined
            };
            const response = await createAdmin(payload);
            if (response?.success) {
                message.success(response.message || 'Admin created successfully');
                setShowCreateModal(false);
                resetForm();
                fetchAdmins();
            } else {
                message.error(response?.message || 'Failed to create admin');
            }
        } catch (error: any) {
            console.error('Error creating admin:', error);
            message.error(error?.message || 'Failed to create admin');
        }
    };

    const handleEdit = (admin: Admin) => {
        setSelectedAdmin(admin);
        setFormData({
            name: admin.name || '',
            email: admin.email || '',
            password: '', // Don't pre-fill password
            phone: admin.phone || '',
            country: admin.country || '',
            state: admin.state || '',
            city: admin.city || '',
            address: admin.location?.address || '',
            internalId: admin.internalId || '',
            status: admin.status || 'active',
            policies: '',
            company: admin.company?._id || '',
            trialDays: '' // not applicable when editing an existing account
        });
        setShowEditModal(true);
    };

    const handleUpdate = async () => {
        if (!selectedAdmin) return;

        try {
            if (!formData.name || !formData.email) {
                message.error('Name and email are required');
                return;
            }

            const updatePayload: any = { ...formData };
            // Remove password if not provided
            if (!updatePayload.password) {
                delete updatePayload.password;
            }

            const response = await updateAdmin(selectedAdmin._id, updatePayload);
            if (response?.success) {
                message.success(response.message || 'Admin updated successfully');
                setShowEditModal(false);
                resetForm();
                fetchAdmins();
            } else {
                message.error(response?.message || 'Failed to update admin');
            }
        } catch (error: any) {
            console.error('Error updating admin:', error);
            message.error(error?.message || 'Failed to update admin');
        }
    };

    const handleDelete = (admin: Admin) => {
        console.log('🗑️ Delete button clicked for admin:', admin);
        setSelectedAdmin(admin);
        setShowDeleteModal(true);
    };

    const confirmDelete = async () => {
        if (!selectedAdmin) return;

        try {
            console.log('🗑️ Confirmed deletion for admin:', selectedAdmin._id, selectedAdmin.name);
            setDeleteLoading(true);

            const response = await deleteAdmin(selectedAdmin._id);
            console.log('Delete API response:', response);

            if (response?.success) {
                message.success(response.message || 'Admin deleted successfully');
                setShowDeleteModal(false);
                setSelectedAdmin(null);
                // Refresh the list
                await fetchAdmins();
            } else {
                const errorMsg = response?.message || 'Failed to delete admin';
                console.error('❌ Delete failed:', errorMsg);
                message.error(errorMsg);
            }
        } catch (error: any) {
            console.error('❌ Error deleting admin:', error);
            const errorMsg = error?.response?.data?.message ||
                error?.message ||
                'Failed to delete admin. Please try again.';
            message.error(errorMsg);
        } finally {
            setDeleteLoading(false);
        }
    };

    const cancelDelete = () => {
        console.log('❌ Delete cancelled by user');
        setShowDeleteModal(false);
        setSelectedAdmin(null);
    };

    const handleStatusToggle = async (admin: Admin, checked: boolean) => {
        const newStatus = checked ? 'active' : 'inactive';
        const oldStatus = admin.status;

        // Optimistically update UI first
        setAdmins(prevAdmins =>
            prevAdmins.map(a =>
                a._id === admin._id ? { ...a, status: newStatus } : a
            )
        );
        setStatusUpdating(admin._id);

        try {
            console.log('🔄 Toggling admin status:', admin._id, 'from', oldStatus, 'to', newStatus);

            const response = await updateAdmin(admin._id, { status: newStatus });

            if (response?.success) {
                message.success(`Admin status updated to ${newStatus} successfully`);
                // Status already updated in UI above
            } else {
                // Revert on error
                setAdmins(prevAdmins =>
                    prevAdmins.map(a =>
                        a._id === admin._id ? { ...a, status: oldStatus } : a
                    )
                );
                message.error(response?.message || 'Failed to update admin status');
            }
        } catch (error: any) {
            console.error('❌ Error toggling admin status:', error);
            // Revert on error
            setAdmins(prevAdmins =>
                prevAdmins.map(a =>
                    a._id === admin._id ? { ...a, status: oldStatus } : a
                )
            );
            const errorMsg = error?.response?.data?.message ||
                error?.message ||
                'Failed to update admin status. Please try again.';
            message.error(errorMsg);
        } finally {
            setStatusUpdating(null);
        }
    };

    const [showCreatePwd, setShowCreatePwd] = useState(false);
    const [showEditPwd, setShowEditPwd] = useState(false);

    const handleView = (admin: Admin) => {
        setSelectedAdmin(admin);
        setShowViewModal(true);
    };

    const handleSort = (field: string) => {
        // Client-side sorting for now
        const sorted = [...admins].sort((a: any, b: any) => {
            if (field === 'company') {
                const aCompany = a.company?.companyName || '';
                const bCompany = b.company?.companyName || '';
                return aCompany.localeCompare(bCompany);
            } else if (field === 'joinDate') {
                return new Date(a.joinDate).getTime() - new Date(b.joinDate).getTime();
            }
            return 0;
        });
        setAdmins(sorted);
    };




    const iCls = "block w-full rounded-lg border px-3 py-2.5 text-sm text-primary bg-transparent focus:outline-none";
    const iStyle = { borderColor: 'rgba(17,131,224,0.2)' };
    const iFocus = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        e.target.style.borderColor = 'var(--accent-navyblue)';
        e.target.style.boxShadow = '0 0 0 2px rgba(17,131,224,0.15)';
    };
    const iBlur = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        e.target.style.borderColor = 'rgba(17,131,224,0.2)';
        e.target.style.boxShadow = '';
    };
    const mStyles = {
        content: { background: 'var(--bg-card)', padding: 0, borderRadius: '16px', overflow: 'hidden' as const, border: '1px solid rgba(17,131,224,0.2)' },
        body: { background: 'var(--bg-card)', padding: 0 },
    };
    const divider = { borderColor: 'rgba(17,131,224,0.12)' };

    return (
        <div className="min-h-screen bg-card">
            {/* Header */}
            <div className="bg-card border-b border-theme px-6 py-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold text-primary flex items-center">
                            <Users className="w-8 h-8 mr-3" style={{ color: 'var(--accent-navyblue)' }} />
                            Admin Accounts
                        </h1>
                        <p className="text-secondary mt-1">Manage all customer accounts and subscriptions</p>
                    </div>
                    <div className="flex items-center space-x-3">
                        <button
                            onClick={() => {
                                resetForm();
                                setShowCreateModal(true);
                            }}
                            className="!text-white px-4 py-2 rounded-lg font-medium transition-all flex items-center hover:-translate-y-0.5 transform"
                            style={{ backgroundColor: 'var(--accent-navyblue)' }}
                            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#0d6fc7'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'var(--accent-navyblue)'; }}
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            Add Admin
                        </button>
                    </div>
                </div>
            </div>

            <div className="p-6">
                {/* Filters and Search */}
                <div className="bg-card rounded-xl shadow-sm border border-theme p-6 mb-6">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0 lg:space-x-4">
                        {/* Search */}
                        <div className="relative flex-1 max-w-md">
                            <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-secondary" />
                            <input
                                type="text"
                                placeholder="Search admins by name, email, ID, or company..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10 pr-4 py-2 w-full border border-theme rounded-lg focus:ring-2 focus:ring-[var(--accent-navyblue)] focus:border-transparent"
                            />
                        </div>

                        {/* Status Filter */}
                        <div className="flex items-center space-x-2">
                            <label className="text-sm font-medium text-primary">Status:</label>
                            <select
                                value={selectedFilter}
                                onChange={(e) => setSelectedFilter(e.target.value)}
                                className="w-32 bg-slate-900 text-slate-200 border border-slate-700 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="all">All</option>
                                <option value="active">Active</option>
                                <option value="inactive">Inactive</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Results Summary */}
                <div className="mb-6">
                    <p className="text-secondary">
                        Showing <span className="font-medium">{filteredAdmins.length}</span> of <span className="font-medium">{totalAdmins}</span> admins
                    </p>
                </div>

                {/* Accounts Table */}
                <div className="bg-card rounded-xl shadow-sm border border-theme">
                    <div className="overflow-x-auto">
                        <table className="min-w-full w-full">
                            <thead className="bg-card border-b border-theme">
                                <tr>
                                    <th
                                        className="px-6 py-4 text-left text-xs font-medium text-secondary uppercase tracking-wider cursor-pointer hover:bg-[rgba(255,255,255,0.03)] min-w-[200px]"
                                        onClick={() => handleSort('company')}
                                    >
                                        <div className="flex items-center space-x-1">
                                            <span>Company</span>
                                            <Filter className="w-3 h-3" />
                                        </div>
                                    </th>
                                    <th className="px-6 py-4 text-left text-xs font-medium text-secondary uppercase tracking-wider min-w-[250px]">
                                        Contact Info
                                    </th>

                                    <th className="px-6 py-4 text-left text-xs font-medium text-secondary uppercase tracking-wider min-w-[160px]">
                                        Plan
                                    </th>

                                    <th
                                        className="px-6 py-4 text-left text-xs font-medium text-secondary uppercase tracking-wider cursor-pointer hover:bg-[rgba(255,255,255,0.03)] min-w-[120px]"
                                        onClick={() => handleSort('revenue')}
                                    >
                                        <div className="flex items-center space-x-1">
                                            <span>Revenue</span>
                                            <Filter className="w-3 h-3" />
                                        </div>
                                    </th>

                                    <th
                                        className="px-6 py-4 text-left text-xs font-medium text-secondary uppercase tracking-wider cursor-pointer hover:bg-[rgba(255,255,255,0.03)] min-w-[150px]"
                                        onClick={() => handleSort('joinDate')}
                                    >
                                        <div className="flex items-center space-x-1">
                                            <span>Join Date</span>
                                            <Filter className="w-3 h-3" />
                                        </div>
                                    </th>
                                    <th className="px-6 py-4 text-left text-xs font-medium text-secondary uppercase tracking-wider min-w-[120px]">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-card divide-theme">
                                {loading ? (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-12 text-center">
                                            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--accent-navyblue)]"></div>
                                            <p className="mt-2 text-secondary">Loading admins...</p>
                                        </td>
                                    </tr>
                                ) : filteredAdmins.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-12 text-center">
                                            <Users className="w-12 h-12 text-secondary mx-auto mb-4" />
                                            <h3 className="text-lg font-medium text-primary mb-2">No admins found</h3>
                                            <p className="text-secondary">
                                                {searchTerm || selectedFilter !== 'all'
                                                    ? "No admins match your current filters."
                                                    : "No admins have been created yet."}
                                            </p>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredAdmins.map((admin) => (
                                        <tr key={admin._id} className="hover:bg-[rgba(255,255,255,0.03)]">
                                            <td className="px-6 py-4 whitespace-nowrap min-w-[200px]">
                                                <div className="flex items-center">
                                                    <div className="p-2 rounded-lg mr-3" style={{ backgroundColor: 'rgba(17,131,224,0.12)' }}>
                                                        <Building2 className="w-5 h-5" style={{ color: 'var(--accent-navyblue)' }} />
                                                    </div>
                                                    <div>
                                                        <div className="text-sm font-medium text-primary">
                                                            {admin.company?.companyName || admin.name || 'N/A'}
                                                        </div>
                                                        <div className="text-sm text-secondary">{admin.internalId || admin._id.slice(-6)}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap min-w-[250px]">
                                                <div className="space-y-1">
                                                    <div className="flex items-center text-sm text-secondary">
                                                        <Mail className="w-4 h-4 mr-2 text-secondary" />
                                                        {admin.email || 'N/A'}
                                                    </div>
                                                    {admin.phone && (
                                                        <div className="flex items-center text-sm text-secondary">
                                                            <Phone className="w-4 h-4 mr-2 text-secondary" />
                                                            {admin.phone}
                                                        </div>
                                                    )}
                                                    {admin.company?.companyCode && (
                                                        <div className="text-xs text-secondary mt-1">
                                                            Code: {admin.company.companyCode}
                                                        </div>
                                                    )}
                                                </div>
                                            </td>

                                            <td className="px-6 py-4 whitespace-nowrap min-w-[160px]">
                                                {admin.currentSubscription?.plan ? (
                                                    <div className="space-y-1">
                                                        <div className="flex items-center gap-1.5 text-sm font-medium text-primary">
                                                            <Tag className="w-3.5 h-3.5" style={{ color: 'var(--accent-navyblue)' }} />
                                                            {admin.currentSubscription.plan.planName}
                                                        </div>
                                                        <span className="text-xs px-2 py-0.5 rounded-full font-medium inline-block"
                                                            style={{
                                                                backgroundColor: admin.currentSubscription.status === 'active' ? 'rgba(0,255,163,0.1)' : 'rgba(244,63,94,0.1)',
                                                                color: admin.currentSubscription.status === 'active' ? '#00FFA3' : 'var(--accent-red)',
                                                            }}>
                                                            {admin.currentSubscription.status}
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <span className="text-sm text-secondary">No plan</span>
                                                )}
                                                <button
                                                    onClick={() => handleOpenAssignPlan(admin)}
                                                    className="mt-2 text-xs font-medium hover:underline block"
                                                    style={{ color: 'var(--accent-navyblue)' }}
                                                >
                                                    Assign Plan
                                                </button>
                                            </td>

                                            <td className="px-6 py-4 whitespace-nowrap min-w-[120px]">
                                                <div className="text-sm text-primary mb-2">
                                                    {admin.location?.address ? (
                                                        <div className="truncate max-w-[150px]" title={admin.location.address}>
                                                            {admin.location.address}
                                                        </div>
                                                    ) : (
                                                        <div className="text-secondary">No address</div>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Switch
                                                        checked={admin.status === 'active'}
                                                        checkedChildren="Active"
                                                        unCheckedChildren="Inactive"
                                                        onChange={(checked) => handleStatusToggle(admin, checked)}
                                                        loading={statusUpdating === admin._id}
                                                        disabled={statusUpdating === admin._id}
                                                        className={admin.status === 'active' ? 'bg-green-500' : ''}
                                                        title={`Toggle ${admin.name}'s status`}
                                                    />
                                                    <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                                                        style={{
                                                            backgroundColor: admin.status === 'active' ? 'rgba(0,255,163,0.1)' : 'rgba(244,63,94,0.1)',
                                                            color: admin.status === 'active' ? '#00FFA3' : 'var(--accent-red)',
                                                        }}>
                                                        {admin.status}
                                                    </span>
                                                </div>
                                            </td>

                                            <td className="px-6 py-4 whitespace-nowrap min-w-[150px]">
                                                <div className="space-y-1">
                                                    <div className="text-sm text-primary">
                                                        {admin.joinDate ? new Date(admin.joinDate).toLocaleDateString() : 'N/A'}
                                                    </div>
                                                    <div className="text-xs text-secondary">
                                                        Created: {admin.createdAt ? new Date(admin.createdAt).toLocaleDateString() : 'N/A'}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap min-w-[120px]">
                                                <div className="flex items-center space-x-2">
                                                    <button
                                                        onClick={() => handleView(admin)}
                                                        className="text-secondary hover:text-[var(--accent-navyblue)] p-1 rounded transition-colors"
                                                        title="View Details"
                                                    >
                                                        <Eye className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleEdit(admin)}
                                                        className="text-secondary hover:text-[#00D1FF] p-1 rounded transition-colors"
                                                        title="Edit Admin"
                                                    >
                                                        <Edit className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            e.stopPropagation();
                                                            console.log('🔴 Delete button clicked!', admin);
                                                            if (!admin || !admin._id) {
                                                                console.error('❌ Invalid admin data:', admin);
                                                                message.error('Invalid admin data. Cannot delete.');
                                                                return;
                                                            }
                                                            handleDelete(admin);
                                                        }}
                                                        className="text-secondary hover:text-[var(--accent-red)] p-2 rounded transition-all duration-200 cursor-pointer active:scale-95"
                                                        title="Delete Admin"
                                                        aria-label="Delete Admin"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="mt-6 flex items-center justify-between">
                        <div className="text-sm text-secondary">
                            Showing page {currentPage} of {totalPages} ({totalAdmins} total admins)
                        </div>
                        <div className="flex space-x-2">
                            <button
                                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                disabled={currentPage === 1}
                                className="px-3 py-2 border border-theme rounded-lg text-sm hover:bg-[rgba(255,255,255,0.03)] disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Previous
                            </button>
                            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                const pageNum = currentPage <= 3 ? i + 1 : currentPage - 2 + i;
                                if (pageNum > totalPages) return null;
                                return (
                                    <button
                                        key={pageNum}
                                        onClick={() => setCurrentPage(pageNum)}
                                        className={`px-3 py-2 rounded-lg text-sm ${currentPage === pageNum
                                                ? 'text-white'
                                                : 'border border-theme hover:bg-[rgba(255,255,255,0.03)]'
                                            }`}
                                        style={currentPage === pageNum ? { backgroundColor: 'var(--accent-navyblue)' } : undefined}
                                    >
                                        {pageNum}
                                    </button>
                                );
                            })}
                            <button
                                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                disabled={currentPage === totalPages}
                                className="px-3 py-2 border border-theme rounded-lg text-sm hover:bg-[rgba(255,255,255,0.03)] disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Create Admin Modal */}
            {showCreateModal && (
                <Modal open={showCreateModal} onCancel={() => { setShowCreateModal(false); resetForm(); }}
                    footer={null} width={620} title={null} styles={mStyles}>
                    {/* Header */}
                    <div className="px-6 pt-5 pb-4 flex items-center gap-3 border-b" style={divider}>
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'rgba(17,131,224,0.12)' }}>
                            <Plus className="w-5 h-5" style={{ color: 'var(--accent-navyblue)' }} />
                        </div>
                        <div>
                            <h3 className="font-semibold text-primary">Create New Admin</h3>
                            <p className="text-xs text-secondary">Set up a new administrator account</p>
                        </div>
                    </div>
                    {/* Body */}
                    <div className="px-6 py-5 space-y-5 overflow-y-auto max-h-[62vh]">
                        {/* Personal Info */}
                        <div>
                            <p className="text-xs font-semibold text-secondary uppercase tracking-wider mb-3">Personal Information</p>
                            <div className="grid grid-cols-2 gap-4 mb-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-medium text-secondary">Name <span className="text-red-400">*</span></label>
                                    <input name="name" value={formData.name} onChange={handleInputChange} placeholder="Full name" className={iCls} style={iStyle} onFocus={iFocus} onBlur={iBlur} />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-medium text-secondary">Email <span className="text-red-400">*</span></label>
                                    <input type="email" name="email" value={formData.email} onChange={handleInputChange} placeholder="admin@company.com" className={iCls} style={iStyle} onFocus={iFocus} onBlur={iBlur} />
                                </div>
                            </div>
                            <div className="space-y-1.5 mb-4">
                                <label className="text-xs font-medium text-secondary">Password <span className="text-red-400">*</span></label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary" />
                                    <input type={showCreatePwd ? "text" : "password"} name="password" value={formData.password} onChange={handleInputChange} placeholder="Create a secure password" className={`${iCls} pl-9 pr-10`} style={iStyle} onFocus={iFocus} onBlur={iBlur} />
                                    <button type="button" onClick={() => setShowCreatePwd(!showCreatePwd)} className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary hover:text-primary transition-colors">
                                        {showCreatePwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-medium text-secondary">Phone</label>
                                    <input name="phone" value={formData.phone} onChange={handleInputChange} placeholder="+1 (555) 000-0000" className={iCls} style={iStyle} onFocus={iFocus} onBlur={iBlur} />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-medium text-secondary">Internal ID</label>
                                    <input name="internalId" value={formData.internalId} onChange={handleInputChange} placeholder="ADMIN-001" className={iCls} style={iStyle} onFocus={iFocus} onBlur={iBlur} />
                                </div>
                            </div>
                        </div>
                        {/* Location */}
                        <div>
                            <p className="text-xs font-semibold text-secondary uppercase tracking-wider mb-3">Location (Optional)</p>
                            <div className="grid grid-cols-3 gap-3 mb-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-medium text-secondary">Country</label>
                                    <input name="country" value={formData.country} onChange={handleInputChange} placeholder="Country" className={iCls} style={iStyle} onFocus={iFocus} onBlur={iBlur} />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-medium text-secondary">State</label>
                                    <input name="state" value={formData.state} onChange={handleInputChange} placeholder="State" className={iCls} style={iStyle} onFocus={iFocus} onBlur={iBlur} />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-medium text-secondary">City</label>
                                    <input name="city" value={formData.city} onChange={handleInputChange} placeholder="City" className={iCls} style={iStyle} onFocus={iFocus} onBlur={iBlur} />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-secondary">Street Address</label>
                                <textarea name="address" value={formData.address} onChange={handleInputChange} placeholder="123 Main Street" rows={2}
                                    className={`${iCls} resize-none`} style={iStyle} onFocus={iFocus} onBlur={iBlur} />
                            </div>
                        </div>
                        {/* Status */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-secondary">Status</label>
                            <select value={formData.status} onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as 'active' | 'inactive' }))}
                                className={iCls} style={{ ...iStyle, backgroundColor: 'var(--bg-card)' }} onFocus={iFocus} onBlur={iBlur}>
                                <option value="active" style={{ backgroundColor: 'var(--bg-card)' }}>Active</option>
                                <option value="inactive" style={{ backgroundColor: 'var(--bg-card)' }}>Inactive</option>
                            </select>
                        </div>
                        {/* Trial Length */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-secondary">Trial Length (days) <span className="text-secondary font-normal">(optional — defaults to the configured trial length)</span></label>
                            <input type="number" min={1} name="trialDays" value={formData.trialDays} onChange={handleInputChange}
                                placeholder="e.g. 30" className={iCls} style={iStyle} onFocus={iFocus} onBlur={iBlur} />
                        </div>
                    </div>
                    {/* Footer */}
                    <div className="px-6 pb-5 pt-4 flex justify-end gap-3 border-t" style={divider}>
                        <button onClick={() => { setShowCreateModal(false); resetForm(); }}
                            className="px-4 py-2 rounded-lg text-sm font-medium text-secondary border border-theme hover:text-primary transition-colors">
                            Cancel
                        </button>
                        <button onClick={handleCreate}
                            className="px-5 py-2 rounded-lg text-sm font-semibold text-white transition-all hover:-translate-y-0.5 transform"
                            style={{ backgroundColor: 'var(--accent-navyblue)' }}
                            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#0d6fc7'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'var(--accent-navyblue)'; }}>
                            Create Admin
                        </button>
                    </div>
                </Modal>
            )}

            {/* Edit Admin Modal */}
            {showEditModal && selectedAdmin && (
                <Modal open={showEditModal} onCancel={() => { setShowEditModal(false); resetForm(); }}
                    footer={null} width={620} title={null} styles={mStyles}>
                    {/* Header */}
                    <div className="px-6 pt-5 pb-4 flex items-center gap-3 border-b" style={divider}>
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'rgba(17,131,224,0.12)' }}>
                            <Edit className="w-4 h-4" style={{ color: 'var(--accent-navyblue)' }} />
                        </div>
                        <div>
                            <h3 className="font-semibold text-primary">Edit Admin</h3>
                            <p className="text-xs text-secondary truncate max-w-xs">{selectedAdmin.name} — {selectedAdmin.email}</p>
                        </div>
                    </div>
                    {/* Body */}
                    <div className="px-6 py-5 space-y-5 overflow-y-auto max-h-[62vh]">
                        <div>
                            <p className="text-xs font-semibold text-secondary uppercase tracking-wider mb-3">Personal Information</p>
                            <div className="grid grid-cols-2 gap-4 mb-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-medium text-secondary">Name <span className="text-red-400">*</span></label>
                                    <input name="name" value={formData.name} onChange={handleInputChange} placeholder="Full name" className={iCls} style={iStyle} onFocus={iFocus} onBlur={iBlur} />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-medium text-secondary">Email <span className="text-red-400">*</span></label>
                                    <input type="email" name="email" value={formData.email} onChange={handleInputChange} placeholder="admin@company.com" className={iCls} style={iStyle} onFocus={iFocus} onBlur={iBlur} />
                                </div>
                            </div>
                            <div className="space-y-1.5 mb-4">
                                <label className="text-xs font-medium text-secondary">New Password <span className="text-secondary font-normal">(leave blank to keep current)</span></label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary" />
                                    <input type={showEditPwd ? "text" : "password"} name="password" value={formData.password} onChange={handleInputChange} placeholder="Enter new password" className={`${iCls} pl-9 pr-10`} style={iStyle} onFocus={iFocus} onBlur={iBlur} />
                                    <button type="button" onClick={() => setShowEditPwd(!showEditPwd)} className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary hover:text-primary transition-colors">
                                        {showEditPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-medium text-secondary">Phone</label>
                                    <input name="phone" value={formData.phone} onChange={handleInputChange} placeholder="+1 (555) 000-0000" className={iCls} style={iStyle} onFocus={iFocus} onBlur={iBlur} />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-medium text-secondary">Internal ID</label>
                                    <input name="internalId" value={formData.internalId} onChange={handleInputChange} placeholder="ADMIN-001" className={iCls} style={iStyle} onFocus={iFocus} onBlur={iBlur} />
                                </div>
                            </div>
                        </div>
                        <div>
                            <p className="text-xs font-semibold text-secondary uppercase tracking-wider mb-3">Location</p>
                            <div className="grid grid-cols-3 gap-3 mb-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-medium text-secondary">Country</label>
                                    <input name="country" value={formData.country} onChange={handleInputChange} placeholder="Country" className={iCls} style={iStyle} onFocus={iFocus} onBlur={iBlur} />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-medium text-secondary">State</label>
                                    <input name="state" value={formData.state} onChange={handleInputChange} placeholder="State" className={iCls} style={iStyle} onFocus={iFocus} onBlur={iBlur} />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-medium text-secondary">City</label>
                                    <input name="city" value={formData.city} onChange={handleInputChange} placeholder="City" className={iCls} style={iStyle} onFocus={iFocus} onBlur={iBlur} />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-secondary">Address</label>
                                <textarea name="address" value={formData.address} onChange={handleInputChange} placeholder="123 Main Street" rows={2}
                                    className={`${iCls} resize-none`} style={iStyle} onFocus={iFocus} onBlur={iBlur} />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-secondary">Status</label>
                            <select value={formData.status} onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as 'active' | 'inactive' }))}
                                className={iCls} style={{ ...iStyle, backgroundColor: 'var(--bg-card)' }} onFocus={iFocus} onBlur={iBlur}>
                                <option value="active" style={{ backgroundColor: 'var(--bg-card)' }}>Active</option>
                                <option value="inactive" style={{ backgroundColor: 'var(--bg-card)' }}>Inactive</option>
                            </select>
                        </div>
                    </div>
                    {/* Footer */}
                    <div className="px-6 pb-5 pt-4 flex justify-end gap-3 border-t" style={divider}>
                        <button onClick={() => { setShowEditModal(false); resetForm(); }}
                            className="px-4 py-2 rounded-lg text-sm font-medium text-secondary border border-theme hover:text-primary transition-colors">
                            Cancel
                        </button>
                        <button onClick={handleUpdate}
                            className="px-5 py-2 rounded-lg text-sm font-semibold text-white transition-all hover:-translate-y-0.5 transform"
                            style={{ backgroundColor: 'var(--accent-navyblue)' }}
                            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#0d6fc7'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'var(--accent-navyblue)'; }}>
                            Save Changes
                        </button>
                    </div>
                </Modal>
            )}

            {/* View Admin Modal */}
            {showViewModal && selectedAdmin && (
                <Modal open={showViewModal} onCancel={() => setShowViewModal(false)}
                    footer={null} width={580} title={null} styles={mStyles}>
                    {/* Header */}
                    <div className="px-6 pt-5 pb-4 flex items-center gap-3 border-b" style={divider}>
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'rgba(17,131,224,0.12)' }}>
                            <Building2 className="w-5 h-5" style={{ color: 'var(--accent-navyblue)' }} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-primary truncate">{selectedAdmin.name || 'Admin Details'}</h3>
                            <p className="text-xs text-secondary truncate">{selectedAdmin.email}</p>
                        </div>
                        <span className="px-2.5 py-1 rounded-full text-xs font-semibold flex-shrink-0"
                            style={{
                                backgroundColor: selectedAdmin.status === 'active' ? 'rgba(0,255,163,0.1)' : 'rgba(244,63,94,0.1)',
                                color: selectedAdmin.status === 'active' ? '#00FFA3' : 'var(--accent-red)',
                            }}>
                            {selectedAdmin.status}
                        </span>
                    </div>
                    {/* Body */}
                    <div className="px-6 py-5 space-y-5 overflow-y-auto max-h-[60vh]">
                        {/* Core info */}
                        <div>
                            <p className="text-xs font-semibold text-secondary uppercase tracking-wider mb-3">Account Details</p>
                            <div className="grid grid-cols-2 gap-3">
                                {[
                                    { label: 'Full Name', value: selectedAdmin.name },
                                    { label: 'Email', value: selectedAdmin.email },
                                    { label: 'Phone', value: selectedAdmin.phone },
                                    { label: 'Internal ID', value: selectedAdmin.internalId },
                                    { label: 'Join Date', value: selectedAdmin.joinDate ? new Date(selectedAdmin.joinDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : null },
                                    { label: 'Created', value: selectedAdmin.createdAt ? new Date(selectedAdmin.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : null },
                                ].map(({ label, value }) => (
                                    <div key={label} className="rounded-lg p-3 border" style={{ backgroundColor: 'rgba(17,131,224,0.04)', borderColor: 'rgba(17,131,224,0.12)' }}>
                                        <p className="text-xs text-secondary mb-1">{label}</p>
                                        <p className="text-sm font-medium text-primary truncate">{value || '—'}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                        {/* Company */}
                        {selectedAdmin.company && (
                            <div>
                                <p className="text-xs font-semibold text-secondary uppercase tracking-wider mb-3">Company</p>
                                <div className="rounded-xl border p-4 space-y-3" style={{ borderColor: 'rgba(17,131,224,0.12)', backgroundColor: 'rgba(17,131,224,0.03)' }}>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <p className="text-xs text-secondary mb-0.5">Company Name</p>
                                            <p className="text-sm font-medium text-primary">{selectedAdmin.company.companyName || '—'}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-secondary mb-0.5">Company Code</p>
                                            <p className="text-sm font-medium text-primary">{selectedAdmin.company.companyCode || '—'}</p>
                                        </div>
                                    </div>
                                    {selectedAdmin.company.contactEmail && (
                                        <div className="flex items-center gap-2 text-sm text-secondary">
                                            <Mail className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--accent-navyblue)' }} />
                                            <span>{selectedAdmin.company.contactEmail}</span>
                                        </div>
                                    )}
                                    {selectedAdmin.company.contactPhone && (
                                        <div className="flex items-center gap-2 text-sm text-secondary">
                                            <Phone className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--accent-navyblue)' }} />
                                            <span>{selectedAdmin.company.contactPhone}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                        {/* Location */}
                        {(selectedAdmin.country || selectedAdmin.state || selectedAdmin.city || selectedAdmin.location?.address) && (
                            <div>
                                <p className="text-xs font-semibold text-secondary uppercase tracking-wider mb-3">Location</p>
                                <div className="rounded-xl border p-4" style={{ borderColor: 'rgba(17,131,224,0.12)', backgroundColor: 'rgba(17,131,224,0.03)' }}>
                                    {selectedAdmin.location?.address && <p className="text-sm text-primary mb-1">{selectedAdmin.location.address}</p>}
                                    <p className="text-sm text-secondary">
                                        {[selectedAdmin.city, selectedAdmin.state, selectedAdmin.country].filter(Boolean).join(', ') || '—'}
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                    {/* Footer */}
                    <div className="px-6 pb-5 pt-4 flex justify-end gap-3 border-t" style={divider}>
                        <button onClick={() => setShowViewModal(false)}
                            className="px-4 py-2 rounded-lg text-sm font-medium text-secondary border border-theme hover:text-primary transition-colors">
                            Close
                        </button>
                        <button onClick={() => { setShowViewModal(false); handleEdit(selectedAdmin); }}
                            className="px-5 py-2 rounded-lg text-sm font-semibold text-white transition-all hover:-translate-y-0.5 transform flex items-center gap-2"
                            style={{ backgroundColor: 'var(--accent-navyblue)' }}
                            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#0d6fc7'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'var(--accent-navyblue)'; }}>
                            <Edit className="w-3.5 h-3.5" /> Edit Admin
                        </button>
                    </div>
                </Modal>
            )}

            {/* Assign Plan Modal */}
            {showAssignPlanModal && selectedAdmin && (
                <Modal open={showAssignPlanModal} onCancel={() => setShowAssignPlanModal(false)}
                    footer={null} width={560} title={null} styles={mStyles}>
                    {/* Header */}
                    <div className="px-6 pt-5 pb-4 flex items-center gap-3 border-b" style={divider}>
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'rgba(17,131,224,0.12)' }}>
                            <Tag className="w-4 h-4" style={{ color: 'var(--accent-navyblue)' }} />
                        </div>
                        <div>
                            <h3 className="font-semibold text-primary">Assign Plan</h3>
                            <p className="text-xs text-secondary truncate max-w-xs">{selectedAdmin.company?.companyName || selectedAdmin.name}</p>
                        </div>
                    </div>
                    {/* Body */}
                    <div className="px-6 py-5 space-y-4">
                        <div className="rounded-lg p-3 border flex items-start gap-2.5" style={{ backgroundColor: 'rgba(17,131,224,0.06)', borderColor: 'rgba(17,131,224,0.15)' }}>
                            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: 'var(--accent-navyblue)' }} />
                            <p className="text-xs text-secondary">
                                This activates the plan immediately for this client without collecting payment through Stripe. Any existing active subscription will be superseded.
                            </p>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-secondary">Plan</label>
                            <Select
                                className="w-full"
                                size="large"
                                loading={plansLoading}
                                value={assignForm.planId || undefined}
                                placeholder="Select a plan"
                                onChange={handleSelectAssignPlan}
                                options={plans.map(p => ({ value: p._id, label: `${p.planName} (${p.planType === 'lifetime' ? 'Lifetime' : 'Monthly'})${p.status === 'inactive' ? ' — inactive' : ''}` }))}
                            />
                        </div>

                        {selectedAssignPlan && (
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-secondary">Billing Option</label>
                                <Select
                                    className="w-full"
                                    size="large"
                                    value={assignForm.subscriptionType || undefined}
                                    placeholder="Select a billing option"
                                    onChange={(value) => setAssignForm(prev => ({ ...prev, subscriptionType: value }))}
                                    options={subscriptionTypeOptions}
                                    notFoundContent="No billing options configured for this plan"
                                />
                            </div>
                        )}

                        {needsTruckCount && (
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-secondary">Truck Count</label>
                                <input
                                    type="number"
                                    min={1}
                                    value={assignForm.truckCount}
                                    onChange={(e) => setAssignForm(prev => ({ ...prev, truckCount: e.target.value }))}
                                    className={iCls} style={iStyle} onFocus={iFocus} onBlur={iBlur}
                                />
                            </div>
                        )}

                        {selectedAssignPlan && (
                            <div className="pt-2 border-t" style={divider}>
                                <p className="text-xs font-semibold text-secondary uppercase tracking-wider mb-3 mt-3">
                                    Customize for this customer
                                </p>

                                <div className="space-y-1.5 mb-4">
                                    <label className="text-xs font-medium text-secondary">
                                        Custom Price <span className="text-secondary font-normal">(optional — leave blank to use the plan's standard price)</span>
                                    </label>
                                    <input
                                        type="number"
                                        min={0}
                                        step="0.01"
                                        placeholder="Auto-calculated from plan"
                                        value={assignForm.customAmount}
                                        onChange={(e) => setAssignForm(prev => ({ ...prev, customAmount: e.target.value }))}
                                        className={iCls} style={iStyle} onFocus={iFocus} onBlur={iBlur}
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-medium text-secondary">Modules / Roles Included</label>
                                    <div className="grid grid-cols-2 gap-x-3 gap-y-2 p-3 rounded-lg border" style={{ borderColor: 'rgba(17,131,224,0.15)' }}>
                                        {ASSIGNABLE_PLAN_ROLES.map(role => (
                                            <label key={role} className="flex items-center gap-2 text-xs text-primary cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={assignSelectedRoles.includes(role)}
                                                    onChange={() => toggleAssignRole(role)}
                                                    className="w-3.5 h-3.5"
                                                />
                                                {role}
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                    {/* Footer */}
                    <div className="px-6 pb-5 pt-4 flex justify-end gap-3 border-t" style={divider}>
                        <button onClick={() => setShowAssignPlanModal(false)} disabled={assignLoading}
                            className="px-4 py-2 rounded-lg text-sm font-medium text-secondary border border-theme hover:text-primary transition-colors disabled:opacity-50">
                            Cancel
                        </button>
                        <button onClick={handleAssignPlan} disabled={assignLoading}
                            className="px-5 py-2 rounded-lg text-sm font-semibold text-white transition-all hover:-translate-y-0.5 transform disabled:opacity-60"
                            style={{ backgroundColor: 'var(--accent-navyblue)' }}>
                            {assignLoading ? 'Assigning...' : 'Assign Plan'}
                        </button>
                    </div>
                </Modal>
            )}

            {/* Delete Confirmation Modal */}
            <Modal open={showDeleteModal} onCancel={cancelDelete}
                footer={null} width={460} title={null} maskClosable={!deleteLoading} closable={!deleteLoading}
                styles={mStyles}>
                {/* Header */}
                <div className="px-6 pt-5 pb-4 flex items-center gap-3 border-b" style={{ borderColor: 'rgba(244,63,94,0.2)' }}>
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'rgba(244,63,94,0.1)' }}>
                        <Trash2 className="w-4 h-4" style={{ color: 'var(--accent-red)' }} />
                    </div>
                    <div>
                        <h3 className="font-semibold text-primary">Delete Admin Account</h3>
                        <p className="text-xs text-secondary">This action is permanent and cannot be undone</p>
                    </div>
                </div>
                {/* Body */}
                <div className="px-6 py-5 space-y-4">
                    {selectedAdmin && (
                        <div className="rounded-xl p-4 border space-y-2" style={{ backgroundColor: 'rgba(17,131,224,0.04)', borderColor: 'rgba(17,131,224,0.12)' }}>
                            <div className="flex items-center gap-2">
                                <Users className="w-4 h-4 text-secondary flex-shrink-0" />
                                <span className="text-sm font-medium text-primary">{selectedAdmin.name}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Mail className="w-4 h-4 text-secondary flex-shrink-0" />
                                <span className="text-sm text-secondary">{selectedAdmin.email}</span>
                            </div>
                            {selectedAdmin.company?.companyName && (
                                <div className="flex items-center gap-2">
                                    <Building2 className="w-4 h-4 text-secondary flex-shrink-0" />
                                    <span className="text-sm text-secondary">{selectedAdmin.company.companyName}</span>
                                </div>
                            )}
                        </div>
                    )}
                    <div className="rounded-lg p-3 border flex items-start gap-2.5"
                        style={{ backgroundColor: 'rgba(244,63,94,0.08)', borderColor: 'rgba(244,63,94,0.25)' }}>
                        <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: 'var(--accent-red)' }} />
                        <p className="text-sm" style={{ color: 'var(--accent-red)' }}>
                            All data associated with this admin account will be permanently removed.
                        </p>
                    </div>
                </div>
                {/* Footer */}
                <div className="px-6 pb-5 pt-4 flex justify-end gap-3 border-t" style={{ borderColor: 'rgba(244,63,94,0.15)' }}>
                    <button onClick={cancelDelete} disabled={deleteLoading}
                        className="px-4 py-2 rounded-lg text-sm font-medium text-secondary border border-theme hover:text-primary transition-colors disabled:opacity-50">
                        Cancel
                    </button>
                    <button onClick={confirmDelete} disabled={deleteLoading}
                        className="px-5 py-2 rounded-lg text-sm font-semibold text-white transition-all hover:-translate-y-0.5 transform flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                        style={{ backgroundColor: 'var(--accent-red)' }}>
                        {deleteLoading ? (
                            <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Deleting...</>
                        ) : (
                            <><Trash2 className="w-3.5 h-3.5" /> Delete Admin</>
                        )}
                    </button>
                </div>
            </Modal>
        </div>
    );
};

export default ViewAllAccounts;