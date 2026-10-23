import React, { useState, useEffect } from 'react';
import { FlaskConical, Search, Plus, Edit, Trash2, Calendar, FileText, Eye, Clock } from 'lucide-react';
import { FaCheckCircle, FaExclamationCircle, FaTimes } from 'react-icons/fa';
import { getAllDrivers, getAllUsersForDrugTest, getDrugTests, createDrugTest, updateDrugTest, deleteDrugTest, getDrugTestById, type DrugTestRequest } from '../../../../axios/api/driver';
import AddressSearch from '../../../../components/common/AddressSearch';

type NotificationType = 'success' | 'error' | 'info';

interface Notification {
    id: number;
    type: NotificationType;
    message: string;
}

const Notification = ({ notification, onClose }: { notification: Notification; onClose: (id: number) => void }) => {
    const icons = {
        success: <FaCheckCircle className="text-green-500" size={24} />,
        error: <FaExclamationCircle className="text-red-500" size={24} />,
        info: <FaCheckCircle className="text-blue-500" size={24} />
    };

    const bgColors = {
        success: 'bg-green-50 border-green-200',
        error: 'bg-card border-red-200',
        info: 'bg-card border-blue-200'
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            onClose(notification.id);
        }, 5000);
        return () => clearTimeout(timer);
    }, [notification.id, onClose]);

    return (
        <div className={`flex items-start gap-3 p-4 rounded-lg border-2 shadow-lg ${bgColors[notification.type]} animate-slide-in`}>
            <div className="flex-shrink-0 mt-0.5">
                {icons[notification.type]}
            </div>
            <p className="flex-1 text-sm font-medium text-primary">{notification.message}</p>
            <button
                onClick={() => onClose(notification.id)}
                className="flex-shrink-0 text-secondary hover:text-secondary transition-colors"
            >
                <FaTimes size={16} />
            </button>
        </div>
    );
};

const DrugTest = () => {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedDriver, setSelectedDriver] = useState<string>('');
    const [selectedStatus, setSelectedStatus] = useState<string>('');
    const [selectedTestType, setSelectedTestType] = useState<string>('');
    const [drugTestRequests, setDrugTestRequests] = useState<DrugTestRequest[]>([]);
    const [drivers, setDrivers] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [showRequestModal, setShowRequestModal] = useState(false);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState<DrugTestRequest | null>(null);
    const [editingRequest, setEditingRequest] = useState<DrugTestRequest | null>(null);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [confirmDelete, setConfirmDelete] = useState<{ open: boolean; id: string | null; name: string | null }>({ open: false, id: null, name: null });

    const testTypes = [
        'Pre-Employment',
        'Random',
        'Post-Accident',
        'Reasonable Suspicion',
        'Return-to-Duty',
        'Follow-Up',
        'Annual Physical'
    ];

    const reasons = [
        'Routine Testing',
        'New Hire',
        'Accident Investigation',
        'Suspicious Behavior',
        'Return to Work',
        'Follow-Up Testing',
        'Annual Requirement',
        'Other'
    ];

    const requestForm = {
        driverId: '',
        testType: '',
        reason: '',
        scheduledDate: '',
        scheduledTime: '',
        labName: '',
        collectionSiteAddress: ''
    };

    const [formData, setFormData] = useState(requestForm);
    const [consentForm, setConsentForm] = useState<File | null>(null);
    const [drugTestDocument, setDrugTestDocument] = useState<File | null>(null);
    const [existingConsentFormUrl, setExistingConsentFormUrl] = useState<string | null>(null);
    const [existingDrugTestDocumentUrl, setExistingDrugTestDocumentUrl] = useState<string | null>(null);

    useEffect(() => {
        fetchDrivers();
        fetchDrugTestRequests();
    }, []);

    // Refetch when filters change
    useEffect(() => {
        fetchDrugTestRequests();
    }, [selectedDriver, selectedStatus, selectedTestType]);

    const fetchDrivers = async () => {
        try {
            // Fetch all users for drug test (excluding admin and superadmin)
            const response = await getAllUsersForDrugTest();
            console.log('🔍 getAllUsersForDrugTest response:', response);

            if (response?.success) {
                const userList = Array.isArray(response.data) ? response.data : [];
                console.log('📋 User list from getAllUsersForDrugTest:', userList);

                // Filter: Only show drivers (role === 'driver') AND cross-border eligible (true)
                const filteredUsers = userList.filter((user: any) => {
                    const role = user.role?.toLowerCase() || '';
                    const isDriver = role === 'driver';

                    // Check cross-border eligible from both possible locations
                    const crossBorderEligible = user.details?.cross_border_eligible !== undefined
                        ? user.details.cross_border_eligible
                        : (user.cross_border_eligible !== undefined ? user.cross_border_eligible : false);

                    return isDriver && crossBorderEligible === true;
                });

                console.log('📋 Filtered to cross-border eligible drivers:', filteredUsers.length);

                const mappedDrivers = filteredUsers.map((user: any) => {
                    // Handle different name formats
                    const userName = user.name ||
                        `${user.firstName || ''} ${user.lastName || ''}`.trim() ||
                        user.email?.split('@')[0] ||
                        'Unknown User';
                    return {
                        _id: user._id,
                        name: userName
                    };
                });
                setDrivers(mappedDrivers);
                console.log('✅ Set cross-border eligible drivers from getAllUsersForDrugTest:', mappedDrivers);
            } else {
                // Fallback to getAllDrivers if the new endpoint fails
                console.log('⚠️ getAllUsersForDrugTest failed, trying getAllDrivers fallback...');
                const fallbackResponse = await getAllDrivers(1, 1000);
                console.log('🔍 getAllDrivers fallback response:', fallbackResponse);

                if (fallbackResponse?.success && Array.isArray(fallbackResponse.data)) {
                    const driverList = fallbackResponse.data;
                    // Filter: Only drivers (role === 'driver') AND cross-border eligible (true)
                    const filteredDrivers = driverList.filter((d: any) => {
                        const role = d.role?.toLowerCase() || '';
                        const isDriver = role === 'driver';

                        // Check cross-border eligible from both possible locations
                        const crossBorderEligible = d.details?.cross_border_eligible !== undefined
                            ? d.details.cross_border_eligible
                            : (d.cross_border_eligible !== undefined ? d.cross_border_eligible : false);

                        return isDriver && crossBorderEligible === true;
                    });

                    console.log('📋 Filtered to cross-border eligible drivers (fallback):', filteredDrivers.length);

                    const mappedDrivers = filteredDrivers.map((d: any) => ({
                        _id: d._id,
                        name: d.name || `${d.firstName || ''} ${d.lastName || ''}`.trim() || 'Unknown Driver'
                    }));
                    setDrivers(mappedDrivers);
                    console.log('✅ Set cross-border eligible drivers from getAllDrivers fallback:', mappedDrivers);
                } else {
                    console.warn('⚠️ No drivers found in fallback response');
                    setDrivers([]);
                }
            }
        } catch (error) {
            console.error('❌ Error fetching users for drug test:', error);
            // On error, set empty array to prevent issues
            setDrivers([]);
        }
    };

    const fetchDrugTestRequests = async () => {
        setLoading(true);
        try {
            const params: any = {};
            if (searchQuery) params.search = searchQuery;
            if (selectedDriver) params.driverId = selectedDriver;
            if (selectedStatus) params.status = selectedStatus;
            if (selectedTestType) params.testType = selectedTestType;

            const response = await getDrugTests(params);
            if (response?.success && Array.isArray(response.data)) {
                setDrugTestRequests(response.data);

                // If no drug tests and message indicates no company, show info notification
                if (response.data.length === 0 && response.message && response.message.includes('company')) {
                    // Don't show error, just set empty array - the empty state will show the message
                }
            } else {
                // Only show error if it's not a "no company" message
                if (response?.message && !response.message.includes('company')) {
                    showNotification('error', response.message || 'Failed to load drug test requests');
                }
                setDrugTestRequests([]);
            }
        } catch (error: any) {
            console.error('Error fetching drug test requests:', error);
            // Only show error if it's not a "no company" related error
            if (error?.message && !error.message.includes('company')) {
                showNotification('error', error.message || 'Failed to load drug test requests');
            }
            setDrugTestRequests([]);
        } finally {
            setLoading(false);
        }
    };

    const showNotification = (type: NotificationType, message: string) => {
        const id = Date.now();
        setNotifications(prev => [...prev, { id, type, message }]);
    };

    const removeNotification = (id: number) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
    };

    const handleCreateRequestClick = () => {
        setEditingRequest(null);
        setFormData(requestForm);
        setConsentForm(null);
        setDrugTestDocument(null);
        setExistingConsentFormUrl(null);
        setExistingDrugTestDocumentUrl(null);
        setShowRequestModal(true);
    };

    const handleEditClick = (request: DrugTestRequest) => {
        setEditingRequest(request);
        setFormData({
            driverId: request.driverId,
            testType: request.testType,
            reason: request.reason,
            scheduledDate: request.scheduledDate,
            scheduledTime: request.scheduledTime || '',
            labName: request.labName,
            collectionSiteAddress: request.collectionSiteAddress || ''
        });
        setConsentForm(null);
        setDrugTestDocument(null);
        setExistingConsentFormUrl(request.consentFormUrl || null);
        setExistingDrugTestDocumentUrl(request.drugTestDocumentUrl || null);
        setShowRequestModal(true);
    };

    const handleViewDetails = async (request: DrugTestRequest) => {
        if (request._id) {
            try {
                const response = await getDrugTestById(request._id);
                if (response?.success && response.data) {
                    setSelectedRequest(response.data);
                    setShowDetailsModal(true);
                } else {
                    // Fallback to using the request directly if API fails
                    setSelectedRequest(request);
                    setShowDetailsModal(true);
                }
            } catch (error: any) {
                console.error('Error fetching drug test details:', error);
                // Fallback to using the request directly
                setSelectedRequest(request);
                setShowDetailsModal(true);
            }
        } else {
            setSelectedRequest(request);
            setShowDetailsModal(true);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.driverId || !formData.testType || !formData.reason || !formData.scheduledDate || !formData.labName) {
            showNotification('error', 'Please fill in all required fields');
            return;
        }

        setSaving(true);
        try {
            let response;

            // Check if we have files to upload
            const hasFiles = consentForm || drugTestDocument;

            if (editingRequest?._id) {
                // UPDATE: Only send changed fields
                const changedFields: Partial<typeof formData> = {};

                // Compare each field with original value
                if (formData.driverId !== editingRequest.driverId) {
                    changedFields.driverId = formData.driverId;
                }
                if (formData.testType !== editingRequest.testType) {
                    changedFields.testType = formData.testType;
                }
                if (formData.reason !== editingRequest.reason) {
                    changedFields.reason = formData.reason;
                }
                if (formData.scheduledDate !== editingRequest.scheduledDate) {
                    changedFields.scheduledDate = formData.scheduledDate;
                }
                if (formData.scheduledTime !== (editingRequest.scheduledTime || '')) {
                    changedFields.scheduledTime = formData.scheduledTime;
                }
                if (formData.labName !== editingRequest.labName) {
                    changedFields.labName = formData.labName;
                }
                if (formData.collectionSiteAddress !== (editingRequest.collectionSiteAddress || '')) {
                    changedFields.collectionSiteAddress = formData.collectionSiteAddress;
                }

                if (hasFiles) {
                    // Use FormData for file uploads
                    const formDataToSend = new FormData();

                    // Add only changed fields
                    Object.keys(changedFields).forEach(key => {
                        const value = changedFields[key as keyof typeof changedFields];
                        if (value !== null && value !== undefined) {
                            formDataToSend.append(key, value);
                        }
                    });

                    // Add files if they exist (new files are always considered updates)
                    if (consentForm) {
                        formDataToSend.append('consentForm', consentForm);
                    }
                    if (drugTestDocument) {
                        formDataToSend.append('drugTestDocument', drugTestDocument);
                    }

                    response = await updateDrugTest(editingRequest._id, formDataToSend as any);
                } else {
                    // No files, use regular JSON - only send changed fields
                    response = await updateDrugTest(editingRequest._id, changedFields);
                }
            } else {
                // CREATE: Send all form fields
                if (hasFiles) {
                    // Use FormData for file uploads
                    const formDataToSend = new FormData();

                    // Add all form fields
                    Object.keys(formData).forEach(key => {
                        const value = formData[key as keyof typeof formData];
                        if (value !== null && value !== undefined && value !== '') {
                            formDataToSend.append(key, value);
                        }
                    });

                    // Add files if they exist
                    if (consentForm) {
                        formDataToSend.append('consentForm', consentForm);
                    }
                    if (drugTestDocument) {
                        formDataToSend.append('drugTestDocument', drugTestDocument);
                    }

                    response = await createDrugTest(formDataToSend as any);
                } else {
                    // No files, use regular JSON
                    response = await createDrugTest(formData as DrugTestRequest);
                }
            }

            if (response?.success) {
                showNotification('success', editingRequest ? 'Drug test request updated successfully' : 'Drug test request created successfully');
                setShowRequestModal(false);
                setFormData(requestForm);
                setConsentForm(null);
                setDrugTestDocument(null);
                setExistingConsentFormUrl(null);
                setExistingDrugTestDocumentUrl(null);
                setEditingRequest(null);
                fetchDrugTestRequests();
            } else {
                showNotification('error', response?.message || 'Failed to save drug test request');
            }
        } catch (error: any) {
            console.error('Error saving drug test request:', error);
            showNotification('error', error?.message || 'Failed to save drug test request');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string, name: string) => {
        setConfirmDelete({ open: true, id, name });
    };

    const handleConfirmDelete = async () => {
        if (!confirmDelete.id) return;

        try {
            const response = await deleteDrugTest(confirmDelete.id);
            if (response?.success) {
                showNotification('success', 'Drug test request deleted successfully');
                fetchDrugTestRequests();
            } else {
                showNotification('error', response?.message || 'Failed to delete drug test request');
            }
        } catch (error: any) {
            console.error('Error deleting drug test request:', error);
            showNotification('error', error?.message || 'Failed to delete drug test request');
        } finally {
            setConfirmDelete({ open: false, id: null, name: null });
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'pending':
                return 'bg-yellow-100 text-yellow-700';
            case 'scheduled':
                return 'bg-blue-100 text-blue-700';
            case 'completed':
                return 'bg-green-100 text-green-700';
            case 'cancelled':
                return 'bg-red-100 text-red-700';
            default:
                return 'bg-card text-primary';
        }
    };

    // Show "completed" when both documents are uploaded, otherwise use actual status
    const getDisplayStatus = (request: DrugTestRequest) => {
        if (request.consentFormUrl && request.drugTestDocumentUrl) return 'completed';
        return request.status;
    };

    const filteredRequests = drugTestRequests.filter(request => {
        if (searchQuery) {
            const searchLower = searchQuery.toLowerCase();
            const matchesSearch =
                request.driverName?.toLowerCase().includes(searchLower) ||
                request.testType.toLowerCase().includes(searchLower) ||
                request.reason.toLowerCase().includes(searchLower) ||
                request.labName.toLowerCase().includes(searchLower) ||
                request.collectionSiteAddress?.toLowerCase().includes(searchLower);

            if (!matchesSearch) return false;
        }
        return true;
    });

    const formatDateTime = (dateString?: string) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className="min-h-screen bg-main p-6">
            {/* Notifications */}
            <div className="fixed top-4 right-4 z-50 space-y-2">
                {notifications.map(notification => (
                    <Notification
                        key={notification.id}
                        notification={notification}
                        onClose={removeNotification}
                    />
                ))}
            </div>

            {/* Header */}
            <div className="mb-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold text-[var(--accent-navyblue)] flex items-center gap-3">
                            <FlaskConical className="text-[var(--accent-navyblue)]" size={32} />
                            Drug Test Management
                        </h1>
                        <p className="text-secondary mt-2">Manage driver drug test requests and tracking</p>
                    </div>
                    <button
                        onClick={handleCreateRequestClick}
                        style={{
                            background: 'linear-gradient(90deg, var(--accent-navyblue) 0%, var(--accent-navyblue) 40%, rgba(0,209,255,0.15) 100%)',
                        }}
                        className="flex items-center gap-2 px-6 py-3 !text-white font-semibold rounded-lg hover:opacity-90 transition-opacity"
                    >
                        <Plus size={20} />
                        Create Drug Test Request
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-card rounded-lg shadow-sm p-4 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-primary mb-2">Search</label>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-secondary" size={20} />
                            <input
                                type="text"
                                placeholder="Search requests..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        fetchDrugTestRequests();
                                    }
                                }}
                                className="w-full pl-10 pr-4 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-primary mb-2">Drivers</label>
                        <select
                            value={selectedDriver}
                            onChange={(e) => setSelectedDriver(e.target.value)}
                            className="w-full px-4 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="">All Drivers</option>
                            {drivers.map(driver => (
                                <option key={driver._id} value={driver._id}>
                                    {driver.name}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-primary mb-2">Test Type</label>
                        <select
                            value={selectedTestType}
                            onChange={(e) => setSelectedTestType(e.target.value)}
                            className="w-full px-4 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="">All Types</option>
                            {testTypes.map(type => (
                                <option key={type} value={type}>{type}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-primary mb-2">Status</label>
                        <select
                            value={selectedStatus}
                            onChange={(e) => setSelectedStatus(e.target.value)}
                            className="w-full px-4 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="">All Statuses</option>
                            <option value="pending">Pending</option>
                            <option value="scheduled">Scheduled</option>
                            <option value="completed">Completed</option>
                            <option value="cancelled">Cancelled</option>
                        </select>
                    </div>
                    <div className="flex items-end justify-between">
                        <div className="text-sm text-secondary">
                            Showing {filteredRequests.length} request(s)
                        </div>
                        <button
                            onClick={fetchDrugTestRequests}
                            className="px-4 py-2 text-sm bg-card hover:bg-gray-200 rounded-lg transition-colors"
                        >
                            Refresh
                        </button>
                    </div>
                </div>
            </div>

            {/* Requests Table */}
            <div className="bg-card rounded-lg shadow-sm overflow-hidden">
                {loading ? (
                    <div className="p-8 text-center">
                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        <p className="mt-4 text-secondary">Loading drug test requests...</p>
                    </div>
                ) : filteredRequests.length === 0 ? (
                    <div className="p-12 text-center">
                        <FlaskConical className="mx-auto text-secondary mb-4" size={48} />
                        <p className="text-secondary text-lg mb-2">No drug test requests found</p>
                        <p className="text-secondary text-sm mb-4">
                            {drugTestRequests.length === 0
                                ? "No drug test requests are available. This may be because no company is assigned to your account."
                                : "No drug test requests match your current filters."}
                        </p>
                        {drugTestRequests.length === 0 && (
                            <p className="text-secondary text-xs">
                                Please contact your administrator to assign a company.
                            </p>
                        )}
                        {drugTestRequests.length > 0 && (
                            <p className="text-secondary text-sm">Click "Create Drug Test Request" to get started</p>
                        )}
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-card border-b border-theme">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-primary uppercase tracking-wider">Driver</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-primary uppercase tracking-wider">Test Type</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-primary uppercase tracking-wider">Reason</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-primary uppercase tracking-wider">Scheduled Date</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-primary uppercase tracking-wider">Lab/Collection Site</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-primary uppercase tracking-wider">Documents</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-primary uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-primary uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-card divide-y divide-theme divide-white/5">
                                {filteredRequests.map((request) => (
                                    <tr
                                        key={request._id}
                                        onClick={() => handleViewDetails(request)}
                                        className="hover:bg-[rgba(255,255,255,0.03)] cursor-pointer transition-colors"
                                    >
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-medium text-primary">{request.driverName || 'Unknown'}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-primary">{request.testType}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm text-primary">{request.reason}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-primary">
                                                {new Date(request.scheduledDate).toLocaleDateString()}
                                                {request.scheduledTime && (
                                                    <div className="text-xs text-secondary">{request.scheduledTime}</div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm text-primary">{request.labName}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col gap-1">
                                                <div className="flex items-center gap-2">
                                                    <FileText size={14} className={request.consentFormUrl ? "text-green-600" : "text-secondary"} />
                                                    <span className={`text-xs ${request.consentFormUrl ? "text-green-600" : "text-secondary"}`}>
                                                        {request.consentFormUrl ? "Consent Form" : "No Consent Form"}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <FileText size={14} className={request.drugTestDocumentUrl ? "text-green-600" : "text-secondary"} />
                                                    <span className={`text-xs ${request.drugTestDocumentUrl ? "text-green-600" : "text-secondary"}`}>
                                                        {request.drugTestDocumentUrl ? "Test Result" : "No Test Result"}
                                                    </span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(getDisplayStatus(request))}`}>
                                                {getDisplayStatus(request).toUpperCase()}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium" onClick={(e) => e.stopPropagation()}>
                                            <div className="flex items-center gap-3">
                                                <button
                                                    onClick={() => handleViewDetails(request)}
                                                    className="text-[#00D1FF] hover:text-blue-800"
                                                    title="View Details"
                                                >
                                                    <Eye size={18} />
                                                </button>
                                                <button
                                                    onClick={() => handleEditClick(request)}
                                                    className="text-indigo-600 hover:text-indigo-800"
                                                    title="Edit"
                                                >
                                                    <Edit size={18} />
                                                </button>
                                                <button
                                                    onClick={() => request._id && handleDelete(request._id, `${request.driverName}'s ${request.testType} test`)}
                                                    className="text-[#A855F7] hover:text-red-800"
                                                    title="Delete"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Create/Edit Request Modal */}
            {showRequestModal && (
                <div
                    className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                    onClick={(e) => {
                        if (e.target === e.currentTarget) {
                            setShowRequestModal(false);
                        }
                    }}
                >
                    <div
                        className="bg-card rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="sticky top-0 bg-card border-b border-theme px-6 py-4 flex justify-between items-center z-10">
                            <h2 className="text-2xl font-bold text-primary">
                                {editingRequest ? 'Edit Drug Test Request' : 'Create Drug Test Request'}
                            </h2>
                            <button
                                onClick={() => setShowRequestModal(false)}
                                className="text-secondary hover:text-secondary transition-colors"
                            >
                                <FaTimes size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-6">
                            {/* Driver Selection */}
                            <div>
                                <label className="block text-sm font-medium text-primary mb-2">
                                    Driver <span className="text-red-500">*</span>
                                </label>
                                <select
                                    value={formData.driverId}
                                    onChange={(e) => setFormData({ ...formData, driverId: e.target.value })}
                                    className="w-full px-4 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    required
                                >
                                    <option value="">Select a driver</option>
                                    {drivers.map(driver => (
                                        <option key={driver._id} value={driver._id}>
                                            {driver.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Test Type and Reason */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-primary mb-2">
                                        Test Type <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        value={formData.testType}
                                        onChange={(e) => setFormData({ ...formData, testType: e.target.value })}
                                        className="w-full px-4 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        required
                                    >
                                        <option value="">Select test type</option>
                                        {testTypes.map(type => (
                                            <option key={type} value={type}>{type}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-primary mb-2">
                                        Reason <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        value={formData.reason}
                                        onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                                        className="w-full px-4 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        required
                                    >
                                        <option value="">Select reason</option>
                                        {reasons.map(reason => (
                                            <option key={reason} value={reason}>{reason}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Scheduled Date and Time */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-primary mb-2">
                                        Scheduled Date <span className="text-red-500">*</span>
                                    </label>
                                    <div className="relative">
                                        <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-secondary" size={20} />
                                        <input
                                            type="date"
                                            value={formData.scheduledDate}
                                            onChange={(e) => setFormData({ ...formData, scheduledDate: e.target.value })}
                                            className="w-full pl-10 pr-4 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            required
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-primary mb-2">
                                        Scheduled Time
                                    </label>
                                    <input
                                        type="time"
                                        value={formData.scheduledTime}
                                        onChange={(e) => setFormData({ ...formData, scheduledTime: e.target.value })}
                                        className="w-full px-4 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                            </div>

                            {/* Lab Name */}
                            <div>
                                <label className="block text-sm font-medium text-primary mb-2">
                                    Lab Name <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={formData.labName}
                                    onChange={(e) => setFormData({ ...formData, labName: e.target.value })}
                                    className="w-full px-4 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="e.g., Quest Diagnostics, LabCorp"
                                    required
                                />
                            </div>

                            {/* Collection Site Address */}
                            <div>
                                <label className="block text-sm font-medium text-primary mb-2">
                                    Collection Site Address
                                </label>
                                <AddressSearch
                                    label="Search Address"
                                    placeholder="Search For An Address..."
                                    value={formData.collectionSiteAddress}
                                    onAddressSelect={(addressData) => {
                                        setFormData({
                                            ...formData,
                                            collectionSiteAddress: addressData.fullAddress || addressData.address || ''
                                        });
                                    }}
                                    onChange={(value) => {
                                        setFormData({
                                            ...formData,
                                            collectionSiteAddress: value
                                        });
                                    }}
                                    className=""
                                />
                            </div>

                            {/* Document Uploads */}
                            <div className="border-t border-theme pt-4">
                                <h3 className="text-lg font-semibold text-primary mb-4 flex items-center gap-2">
                                    <FileText className="text-[#00D1FF]" size={20} />
                                    Document Uploads
                                </h3>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-primary mb-2">
                                            Drug Test Consent Form
                                        </label>
                                        {existingConsentFormUrl && !consentForm && (
                                            <div className="mb-2 p-2 bg-green-50 border border-green-200 rounded-lg">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <FileText size={16} className="text-green-600" />
                                                        <span className="text-sm text-green-700">Existing document uploaded</span>
                                                    </div>
                                                    <a
                                                        href={existingConsentFormUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-xs text-[#00D1FF] hover:text-blue-800 underline"
                                                    >
                                                        View Document
                                                    </a>
                                                </div>
                                            </div>
                                        )}
                                        <input
                                            type="file"
                                            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                                            onChange={(e) => setConsentForm(e.target.files?.[0] || null)}
                                            className="w-full px-4 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                        {consentForm && (
                                            <p className="text-xs text-secondary mt-1">New file selected: {consentForm.name}</p>
                                        )}
                                        {existingConsentFormUrl && consentForm && (
                                            <p className="text-xs text-amber-600 mt-1">⚠️ New file will replace existing document</p>
                                        )}
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-primary mb-2">
                                            Drug Test Result Document
                                        </label>
                                        {existingDrugTestDocumentUrl && !drugTestDocument && (
                                            <div className="mb-2 p-2 bg-green-50 border border-green-200 rounded-lg">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <FileText size={16} className="text-green-600" />
                                                        <span className="text-sm text-green-700">Existing document uploaded</span>
                                                    </div>
                                                    <a
                                                        href={existingDrugTestDocumentUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-xs text-[#00D1FF] hover:text-blue-800 underline"
                                                    >
                                                        View Document
                                                    </a>
                                                </div>
                                            </div>
                                        )}
                                        <input
                                            type="file"
                                            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                                            onChange={(e) => setDrugTestDocument(e.target.files?.[0] || null)}
                                            className="w-full px-4 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                        {drugTestDocument && (
                                            <p className="text-xs text-secondary mt-1">New file selected: {drugTestDocument.name}</p>
                                        )}
                                        {existingDrugTestDocumentUrl && drugTestDocument && (
                                            <p className="text-xs text-amber-600 mt-1">⚠️ New file will replace existing document</p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex justify-end gap-4 pt-4 border-t border-theme">
                                <button
                                    type="button"
                                    onClick={() => setShowRequestModal(false)}
                                    className="px-6 py-2 border border-theme rounded-lg text-primary hover:bg-[rgba(255,255,255,0.03)]"
                                    disabled={saving}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    style={{
                                        background: 'var(--accent-navyblue)',
                                    }}
                                    className="px-6 py-2 !text-white font-semibold rounded-lg hover:opacity-90 disabled:opacity-50"
                                    disabled={saving}
                                >
                                    {saving ? 'Saving...' : editingRequest ? 'Update' : 'Create'} Request
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Details Modal */}
            {showDetailsModal && selectedRequest && (
                <div
                    className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                    onClick={(e) => {
                        if (e.target === e.currentTarget) {
                            setShowDetailsModal(false);
                        }
                    }}
                >
                    <div
                        className="bg-card rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="sticky top-0 bg-card border-b border-theme px-6 py-4 flex justify-between items-center z-10">
                            <h2 className="text-2xl font-bold text-primary">Drug Test Request Details</h2>
                            <button
                                onClick={() => setShowDetailsModal(false)}
                                className="text-secondary hover:text-secondary transition-colors"
                            >
                                <FaTimes size={24} />
                            </button>
                        </div>

                        <div className="p-6 space-y-6">
                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-secondary mb-1">Driver</label>
                                    <p className="text-base font-semibold text-primary">{selectedRequest.driverName || 'Unknown'}</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-secondary mb-1">Test Type</label>
                                    <p className="text-base text-primary">{selectedRequest.testType}</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-secondary mb-1">Reason</label>
                                    <p className="text-base text-primary">{selectedRequest.reason}</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-secondary mb-1">Status</label>
                                    <span className={`px-3 py-1 inline-flex text-sm font-semibold rounded-full ${getStatusColor(getDisplayStatus(selectedRequest))}`}>
                                        {getDisplayStatus(selectedRequest).toUpperCase()}
                                    </span>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-secondary mb-1">Scheduled Date</label>
                                    <p className="text-base text-primary">
                                        {new Date(selectedRequest.scheduledDate).toLocaleDateString('en-US', {
                                            year: 'numeric',
                                            month: 'long',
                                            day: 'numeric'
                                        })}
                                    </p>
                                </div>
                                {selectedRequest.scheduledTime && (
                                    <div>
                                        <label className="block text-sm font-medium text-secondary mb-1">Scheduled Time</label>
                                        <p className="text-base text-primary">{selectedRequest.scheduledTime}</p>
                                    </div>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-secondary mb-1">Lab Name</label>
                                <p className="text-base text-primary">{selectedRequest.labName}</p>
                            </div>

                            {selectedRequest.collectionSiteAddress && (
                                <div>
                                    <label className="block text-sm font-medium text-secondary mb-1">Collection Site Address</label>
                                    <p className="text-base text-primary">{selectedRequest.collectionSiteAddress}</p>
                                </div>
                            )}

                            {/* Documents Section */}
                            {(selectedRequest.consentFormUrl || selectedRequest.drugTestDocumentUrl) && (
                                <div className="border-t border-theme pt-4">
                                    <h3 className="text-lg font-semibold text-primary mb-4 flex items-center gap-2">
                                        <FileText className="text-[#00D1FF]" size={20} />
                                        Documents
                                    </h3>
                                    <div className="space-y-3">
                                        {selectedRequest.consentFormUrl && (
                                            <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                                                <div className="flex items-center gap-2">
                                                    <FileText size={18} className="text-green-600" />
                                                    <span className="text-sm font-medium text-primary">Drug Test Consent Form</span>
                                                </div>
                                                <a
                                                    href={selectedRequest.consentFormUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-sm text-[#00D1FF] hover:text-blue-800 underline"
                                                >
                                                    View Document
                                                </a>
                                            </div>
                                        )}
                                        {selectedRequest.drugTestDocumentUrl && (
                                            <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                                                <div className="flex items-center gap-2">
                                                    <FileText size={18} className="text-green-600" />
                                                    <span className="text-sm font-medium text-primary">Drug Test Result Document</span>
                                                </div>
                                                <a
                                                    href={selectedRequest.drugTestDocumentUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-sm text-[#00D1FF] hover:text-blue-800 underline"
                                                >
                                                    View Document
                                                </a>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            <div className="pt-4 border-t border-theme">
                                <div className="grid grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-secondary mb-1 flex items-center gap-2">
                                            <Clock size={16} />
                                            Created At
                                        </label>
                                        <p className="text-sm text-secondary">{formatDateTime(selectedRequest.createdAt)}</p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-secondary mb-1 flex items-center gap-2">
                                            <Clock size={16} />
                                            Last Updated
                                        </label>
                                        <p className="text-sm text-secondary">{formatDateTime(selectedRequest.updatedAt)}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end gap-4 pt-4 border-t border-theme">
                                <button
                                    onClick={() => setShowDetailsModal(false)}
                                    className="px-6 py-2 border border-theme rounded-lg text-primary hover:bg-[rgba(255,255,255,0.03)]"
                                >
                                    Close
                                </button>
                                <button
                                    onClick={() => {
                                        setShowDetailsModal(false);
                                        handleEditClick(selectedRequest);
                                    }}
                                    style={{
                                        background: 'var(--accent-navyblue)',
                                    }}
                                    className="px-6 py-2 !text-white font-semibold rounded-lg hover:opacity-90"
                                >
                                    Edit Request
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {confirmDelete.open && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-card rounded-xl shadow-2xl w-full max-w-md">
                        <div className="p-6">
                            <div className="flex items-center gap-4 mb-4">
                                <div className="flex-shrink-0 w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                                    <Trash2 className="w-6 h-6 text-[#A855F7]" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold text-primary">Delete Drug Test</h3>
                                    <p className="text-sm text-secondary">This action cannot be undone</p>
                                </div>
                            </div>
                            <p className="text-primary mb-6">
                                Are you sure you want to delete <span className="font-medium text-primary">{confirmDelete.name}</span>? This will permanently remove the drug test request and all associated data.
                            </p>
                            <div className="flex items-center justify-end gap-3">
                                <button
                                    onClick={() => setConfirmDelete({ open: false, id: null, name: null })}
                                    className="px-4 py-2 border border-theme rounded-lg hover:bg-[rgba(255,255,255,0.03)] transition-colors font-medium"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleConfirmDelete}
                                    className="px-4 py-2 bg-red-600 !text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DrugTest;
