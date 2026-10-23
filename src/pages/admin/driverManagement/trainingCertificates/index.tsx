import React, { useState, useEffect } from 'react';
import { FileText, Search, Eye, Trash2, Plus, Edit, Clock } from 'lucide-react';
import { FaCheckCircle, FaExclamationCircle, FaTimes } from 'react-icons/fa';
import { getAllDrivers, getTrainingCertificates, createTrainingCertificate, updateTrainingCertificate, deleteTrainingCertificate, getTrainingCertificateSignedUrl, type TrainingCertificate } from '../../../../axios/api/driver';

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

const TrainingCertificates = ({ hideHeader = false }: { hideHeader?: boolean }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedDriver, setSelectedDriver] = useState<string>('');
    const [selectedType, setSelectedType] = useState<string>('');
    const [selectedStatus, setSelectedStatus] = useState<string>('');
    const [certificates, setCertificates] = useState<TrainingCertificate[]>([]);
    const [drivers, setDrivers] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [selectedCertificate, setSelectedCertificate] = useState<TrainingCertificate | null>(null);
    const [editingCertificate, setEditingCertificate] = useState<TrainingCertificate | null>(null);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [saving, setSaving] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState<{ open: boolean; id: string | null; name: string | null }>({ open: false, id: null, name: null });

    const certificateForm = {
        driverId: '',
        certificateName: '',
        certificateType: '',
        verificationType: '', // TDG | VEHICLE | HOS | WINTER
        issuedDate: new Date().toISOString().split('T')[0],
        expiryDate: '',
        issuingAuthority: '',
        certificateNumber: '',
        notes: ''
    };

    const [formData, setFormData] = useState(certificateForm);

    const certificateTypes = [
        'CDL License',
        'Hazmat Endorsement',
        'DOT Medical Certificate',
        'First Aid/CPR',
        'Defensive Driving',
        'Hazmat Training',
        'Forklift Certification',
        'Safety Training',
        'Other'
    ];

    useEffect(() => {
        fetchDrivers();
        fetchCertificates();
    }, []);

    const fetchDrivers = async () => {
        try {
            const response = await getAllDrivers(1, 1000);
            if (response?.success && response?.data) {
                const driverList = Array.isArray(response.data) ? response.data : [];
                setDrivers(driverList.map((d: any) => ({
                    _id: d._id,
                    name: d.name || `${d.firstName || ''} ${d.lastName || ''}`.trim() || 'Unknown Driver'
                })));
            } else {
                // If no drivers returned (likely no company), set empty array
                setDrivers([]);
            }
        } catch (error) {
            console.error('Error fetching drivers:', error);
            // On error, set empty array to prevent issues
            setDrivers([]);
        }
    };

    const fetchCertificates = async () => {
        setLoading(true);
        try {
            const params: any = {};
            if (searchQuery) params.search = searchQuery;
            if (selectedDriver) params.driverId = selectedDriver;
            if (selectedType) params.certificateType = selectedType;
            if (selectedStatus) params.status = selectedStatus;

            const response = await getTrainingCertificates(params);
            if (response?.success && Array.isArray(response.data)) {
                setCertificates(response.data);

                // If no certificates and message indicates no company, show info notification
                if (response.data.length === 0 && response.message && response.message.includes('company')) {
                    // Don't show error, just set empty array - the empty state will show the message
                }
            } else {
                // Only show error if it's not a "no company" message
                if (response?.message && !response.message.includes('company')) {
                    showNotification('error', response.message || 'Failed to load training certificates');
                }
                setCertificates([]);
            }
        } catch (error: any) {
            console.error('Error fetching certificates:', error);
            // Only show error if it's not a "no company" related error
            if (error?.message && !error.message.includes('company')) {
                showNotification('error', error.message || 'Failed to load training certificates');
            }
            setCertificates([]);
        } finally {
            setLoading(false);
        }
    };

    // Refetch certificates when filters change
    useEffect(() => {
        fetchCertificates();
    }, [selectedDriver, selectedType, selectedStatus]);

    const showNotification = (type: NotificationType, message: string) => {
        const id = Date.now();
        setNotifications(prev => [...prev, { id, type, message }]);
    };

    const removeNotification = (id: number) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
    };

    const handleAddClick = () => {
        setEditingCertificate(null);
        setFormData(certificateForm);
        setSelectedFile(null);
        setShowAddModal(true);
    };

    const handleEditClick = (certificate: TrainingCertificate) => {
        setEditingCertificate(certificate);
        setFormData({
            driverId: certificate.driverId,
            certificateName: certificate.certificateName,
            certificateType: certificate.certificateType,
            verificationType: (certificate as any).verificationType || '',
            issuedDate: certificate.issuedDate,
            expiryDate: certificate.expiryDate || '',
            issuingAuthority: certificate.issuingAuthority,
            certificateNumber: certificate.certificateNumber || '',
            notes: certificate.notes || ''
        });
        setSelectedFile(null);
        setShowAddModal(true);
    };

    const handleViewDetails = async (certificate: TrainingCertificate) => {
        setSelectedCertificate(certificate);
        setShowDetailsModal(true);
    };

    const handleViewFile = async (certificate: TrainingCertificate) => {
        if (!certificate._id || !certificate.fileUrl) {
            showNotification('error', 'No file available for this certificate');
            return;
        }

        try {
            const response = await getTrainingCertificateSignedUrl(certificate._id, 'inline');
            if (response?.success && response.url) {
                window.open(response.url, '_blank');
            } else {
                // Fallback to direct URL
                if (certificate.fileUrl) {
                    window.open(certificate.fileUrl, '_blank');
                } else {
                    showNotification('error', 'Unable to open certificate file');
                }
            }
        } catch (error: any) {
            console.error('Error opening certificate file:', error);
            // Fallback to direct URL
            if (certificate.fileUrl) {
                window.open(certificate.fileUrl, '_blank');
            } else {
                showNotification('error', 'Unable to open certificate file');
            }
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.driverId || !formData.certificateName || !formData.certificateType || !formData.issuedDate || !formData.issuingAuthority) {
            showNotification('error', 'Please fill in all required fields');
            return;
        }

        setSaving(true);
        try {
            const formDataToSend = new FormData();
            formDataToSend.append('driverId', formData.driverId);
            formDataToSend.append('certificateName', formData.certificateName);
            formDataToSend.append('certificateType', formData.certificateType);
            formDataToSend.append('issuedDate', formData.issuedDate);
            if (formData.expiryDate) {
                formDataToSend.append('expiryDate', formData.expiryDate);
            }
            formDataToSend.append('issuingAuthority', formData.issuingAuthority);
            if (formData.certificateNumber) {
                formDataToSend.append('certificateNumber', formData.certificateNumber);
            }
            if (formData.notes) {
                formDataToSend.append('notes', formData.notes);
            }
            if (selectedFile) {
                formDataToSend.append('file', selectedFile);
            }

            let response;
            if (editingCertificate?._id) {
                response = await updateTrainingCertificate(editingCertificate._id, formDataToSend);
            } else {
                response = await createTrainingCertificate(formDataToSend);
            }

            if (response?.success) {
                showNotification('success', editingCertificate ? 'Certificate updated successfully' : 'Certificate added successfully');
                setShowAddModal(false);
                setFormData(certificateForm);
                setSelectedFile(null);
                setEditingCertificate(null);
                fetchCertificates();
            } else {
                showNotification('error', response?.message || 'Failed to save certificate');
            }
        } catch (error: any) {
            console.error('Error saving certificate:', error);
            showNotification('error', error?.message || 'Failed to save certificate');
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
            const response = await deleteTrainingCertificate(confirmDelete.id);
            if (response?.success) {
                showNotification('success', 'Certificate deleted successfully');
                fetchCertificates();
            } else {
                showNotification('error', response?.message || 'Failed to delete certificate');
            }
        } catch (error: any) {
            console.error('Error deleting certificate:', error);
            showNotification('error', error?.message || 'Failed to delete certificate');
        } finally {
            setConfirmDelete({ open: false, id: null, name: null });
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'active':
                return 'bg-green-100 text-green-700';
            case 'expired':
                return 'bg-red-100 text-red-700';
            case 'expiring_soon':
                return 'bg-yellow-100 text-yellow-700';
            default:
                return 'bg-card text-primary';
        }
    };

    const filteredCertificates = certificates.filter(cert => {
        if (searchQuery) {
            const searchLower = searchQuery.toLowerCase();
            const matchesSearch =
                cert.certificateName.toLowerCase().includes(searchLower) ||
                cert.driverName?.toLowerCase().includes(searchLower) ||
                cert.certificateNumber?.toLowerCase().includes(searchLower) ||
                cert.issuingAuthority.toLowerCase().includes(searchLower);

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
        <div className=''>
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

            {/* Header - Hide when used as child component */}
            {!hideHeader && (
                <div className="mb-6">
                    <div className="flex justify-between items-center ">
                        <div>
                            <h1 className="text-3xl font-bold text-primary flex items-center gap-3">
                                <FileText className="text-[#00D1FF]" size={32} />
                                Training Certificates
                            </h1>
                            <p className="text-secondary mt-2">Manage driver training certificates and certifications</p>
                        </div>
                        <button
                            onClick={handleAddClick}
                            style={{
                                background: 'linear-gradient(90deg, var(--accent-navyblue) 0%, var(--accent-navyblue) 40%, rgba(0,209,255,0.15) 100%)',
                            }}
                            className="flex items-center gap-2 px-6 py-3 !text-white font-semibold rounded-lg hover:opacity-90 transition-opacity"
                        >
                            <Plus size={20} />
                            Add Certificate
                        </button>
                    </div>
                </div>
            )}

            {/* Add Certificate Button - Show when header is hidden */}
            {hideHeader && (
                <div className="mb-6 flex justify-end ">
                    <button
                        onClick={handleAddClick}
                        style={{
                            background: 'var(--accent-navyblue)',
                        }}
                        className="flex items-center gap-2 px-6 py-3 !text-white font-semibold rounded-lg hover:opacity-90 transition-opacity"
                    >
                        <Plus size={20} />
                        Add Certificate
                    </button>
                </div>
            )}

            {/* Filters */}
            <div className="bg-card rounded-lg shadow-sm p-4 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-primary mb-2">Search</label>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-secondary" size={20} />
                            <input
                                type="text"
                                placeholder="Search certificates..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        fetchCertificates();
                                    }
                                }}
                                className="w-full pl-10 pr-4 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-primary mb-2">
                            Driver
                        </label>
                        <select
                            value={selectedDriver}
                            onChange={(e) => setSelectedDriver(e.target.value)}
                            className="w-full px-4 py-2 bg-[rgba(255,255,255,0.05)] text-primary border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)] focus:border-[var(--accent-blue)] hover:bg-[rgba(0,209,255,0.08)] transition-all duration-200"
                        >
                            <option  className="bg-[#0f1b2d] text-white" value="">
                                All Drivers
                            </option>
                            {drivers.map((driver) => (
                                <option
                                    key={driver._id}
                                    value={driver._id}
                                    className="bg-[#0f1b2d] text-white"
                                >
                                    {driver.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-primary mb-2">
                            Certificate Type
                        </label>
                        <select
                            value={selectedType}
                            onChange={(e) => setSelectedType(e.target.value)}
                            className="w-full px-4 py-2 bg-[rgba(255,255,255,0.05)] text-primary border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)] focus:border-[var(--accent-blue)] hover:bg-[rgba(0,209,255,0.08)] transition-all duration-200"
                        >
                            <option className="bg-[#0f1b2d] text-white" value="">
                                All Types
                            </option>
                            {certificateTypes.map((type) => (
                                <option
                                    key={type}
                                    value={type}
                                    className="bg-[#0f1b2d] text-white"
                                >
                                    {type}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-primary mb-2">
                            Status
                        </label>
                        <select
                            value={selectedStatus}
                            onChange={(e) => setSelectedStatus(e.target.value)}
                            className="w-full px-4 py-2 bg-[rgba(255,255,255,0.05)] text-primary border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)] focus:border-[var(--accent-blue)] hover:bg-[rgba(0,209,255,0.08)] transition-all duration-200"
                        >
                            <option className="bg-[#0f1b2d] text-white" value="">
                                All Status
                            </option>
                            <option className="bg-[#0f1b2d] text-white" value="active">
                                Active
                            </option>
                            <option className="bg-[#0f1b2d] text-white" value="expiring_soon">
                                Expiring Soon
                            </option>
                            <option className="bg-[#0f1b2d] text-white" value="expired">
                                Expired
                            </option>
                        </select>
                    </div>
                </div>
                <div className="mt-4 flex items-center justify-between">
                    <div className="text-sm text-secondary">
                        Showing {filteredCertificates.length} certificate(s)
                    </div>
                    <button
                        onClick={fetchCertificates}
                        className="px-4 py-2 text-sm bg-card hover:bg-gray-200 rounded-lg transition-colors"
                    >
                        Refresh
                    </button>
                </div>
            </div>

            {/* Certificates Table */}
            <div className="bg-card rounded-lg shadow-sm overflow-hidden">
                {loading ? (
                    <div className="p-8 text-center">
                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        <p className="mt-4 text-secondary">Loading certificates...</p>
                    </div>
                ) : filteredCertificates.length === 0 ? (
                    <div className="p-12 text-center">
                        <FileText className="mx-auto text-secondary mb-4" size={48} />
                        <p className="text-secondary text-lg mb-2">No certificates found</p>
                        <p className="text-secondary text-sm mb-4">
                            {certificates.length === 0
                                ? "No training certificates are available. This may be because no company is assigned to your account."
                                : "No certificates match your current filters."}
                        </p>
                        {certificates.length === 0 && (
                            <p className="text-secondary text-xs">
                                Please contact your administrator to assign a company.
                            </p>
                        )}
                        {certificates.length > 0 && (
                            <p className="text-secondary text-sm">Click "Add Certificate" to get started</p>
                        )}
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-card border-b border-theme ">
                                <tr className='text-[var(--accent-navyblue)]'>
                                    <th className="px-6 py-4 text-left text-xs font-semibold  uppercase tracking-wider">Driver</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold  uppercase tracking-wider">Certificate</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold  uppercase tracking-wider">Type</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold  uppercase tracking-wider">Issued Date</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold  uppercase tracking-wider">Expiry Date</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold  uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold  uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-card divide-y divide-theme divide-white/5">
                                {filteredCertificates.map((cert) => (
                                    <tr key={cert._id} className="hover:bg-[rgba(255,255,255,0.03)]">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-medium text-primary">{cert.driverName || 'Unknown'}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm font-medium text-primary">{cert.certificateName}</div>
                                            {cert.certificateNumber && (
                                                <div className="text-xs text-secondary">#{cert.certificateNumber}</div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-primary">{cert.certificateType}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-primary">
                                                {new Date(cert.issuedDate).toLocaleDateString()}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-primary">
                                                {cert.expiryDate ? new Date(cert.expiryDate).toLocaleDateString() : 'N/A'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(cert.status)}`}>
                                                {cert.status.replace('_', ' ').toUpperCase()}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                            <div className="flex items-center gap-3">
                                                <button
                                                    onClick={() => handleViewDetails(cert)}
                                                    className="text-[#00D1FF] hover:text-blue-800"
                                                    title="View Details"
                                                >
                                                    <Eye size={18} />
                                                </button>
                                                {cert.fileUrl && (
                                                    <button
                                                        onClick={() => handleViewFile(cert)}
                                                        className="text-purple-600 hover:text-purple-800"
                                                        title="View File"
                                                    >
                                                        <FileText size={18} />
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => handleEditClick(cert)}
                                                    className="text-indigo-600 hover:text-indigo-800"
                                                    title="Edit"
                                                >
                                                    <Edit size={18} />
                                                </button>
                                                <button
                                                    onClick={() => cert._id && handleDelete(cert._id, cert.certificateName || 'this certificate')}
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

            {/* Add/Edit Modal */}
            {showAddModal && (
                <div
                    className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                    onClick={(e) => {
                        if (e.target === e.currentTarget) {
                            setShowAddModal(false);
                        }
                    }}
                >
                    <div
                        className="bg-card rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="sticky top-0 bg-card border-b border-theme px-6 py-4 flex justify-between items-center z-10">
                            <h2 className="text-2xl font-bold text-primary">
                                {editingCertificate ? 'Edit Certificate' : 'Add Certificate'}
                            </h2>
                            <button
                                onClick={() => setShowAddModal(false)}
                                className="text-secondary hover:text-secondary transition-colors"
                            >
                                <FaTimes size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-6">
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
                                    <option className="form-option" value="">Select a driver</option>
                                    {drivers.map(driver => (
                                        <option className="form-option" key={driver._id} value={driver._id}>
                                            {driver.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-primary mb-2">
                                    Certificate Name <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={formData.certificateName}
                                    onChange={(e) => setFormData({ ...formData, certificateName: e.target.value })}
                                    className="w-full px-4 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="e.g., Commercial Driver License"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-primary mb-2">
                                    Certificate Type <span className="text-red-500">*</span>
                                </label>
                                <select
                                    value={formData.certificateType}
                                    onChange={(e) => setFormData({ ...formData, certificateType: e.target.value })}
                                    className="w-full px-4 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    required
                                >
                                    <option className="form-option" value="">Select type</option>
                                    {certificateTypes.map(type => (
                                        <option className="form-option" key={type} value={type}>{type}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-primary mb-2">
                                    Verification Type <span className="text-red-500">*</span>
                                </label>
                                <select
                                    value={formData.verificationType}
                                    onChange={(e) => setFormData({ ...formData, verificationType: e.target.value })}
                                    className="w-full px-4 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    required
                                >
                                    <option className="form-option" value="">Select verification type</option>
                                    <option className="form-option" value="TDG">TDG</option>
                                    <option className="form-option" value="VEHICLE">Vehicle Inspection</option>
                                    <option className="form-option" value="HOS">Hours of Service</option>
                                    <option className="form-option" value="WINTER">Winter Driving</option>
                                </select>
                                <p className="text-xs text-secondary mt-1">
                                    Links certificate to test type for compliance verification
                                </p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-primary mb-2">
                                        Issued Date <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="date"
                                        value={formData.issuedDate}
                                        onChange={(e) => setFormData({ ...formData, issuedDate: e.target.value })}
                                        className="w-full px-4 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-primary mb-2">
                                        Expiry Date
                                    </label>
                                    <input
                                        type="date"
                                        value={formData.expiryDate}
                                        onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                                        className="w-full px-4 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-primary mb-2">
                                    Issuing Authority <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={formData.issuingAuthority}
                                    onChange={(e) => setFormData({ ...formData, issuingAuthority: e.target.value })}
                                    className="w-full px-4 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="e.g., Department of Motor Vehicles"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-primary mb-2">
                                    Certificate Number
                                </label>
                                <input
                                    type="text"
                                    value={formData.certificateNumber}
                                    onChange={(e) => setFormData({ ...formData, certificateNumber: e.target.value })}
                                    className="w-full px-4 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="Certificate number or license number"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-primary mb-2">
                                    Certificate File
                                </label>
                                <div className="flex items-center gap-4">
                                    <label className="flex-1 cursor-pointer">
                                        <input
                                            type="file"
                                            accept=".pdf,.jpg,.jpeg,.png"
                                            onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                                            className="hidden"
                                        />
                                        <div className="px-4 py-2 border border-theme rounded-lg border-dashed hover:bg-[rgba(255,255,255,0.03)] text-center">
                                            {selectedFile ? (
                                                <span className="text-[#00D1FF]">{selectedFile.name}</span>
                                            ) : editingCertificate?.fileName ? (
                                                <span className="text-secondary">Current: {editingCertificate.fileName} (select new file to replace)</span>
                                            ) : (
                                                <span className="text-secondary">Click to upload certificate file</span>
                                            )}
                                        </div>
                                    </label>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-primary mb-2">
                                    Notes
                                </label>
                                <textarea
                                    value={formData.notes}
                                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                    rows={3}
                                    className="w-full px-4 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="Additional notes or comments..."
                                />
                            </div>

                            <div className="flex justify-end gap-4 pt-4 border-t border-theme">
                                <button
                                    type="button"
                                    onClick={() => setShowAddModal(false)}
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
                                    {saving ? 'Saving...' : editingCertificate ? 'Update' : 'Save'} Certificate
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Details Modal */}
            {showDetailsModal && selectedCertificate && (
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
                            <h2 className="text-2xl font-bold text-primary">Certificate Details</h2>
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
                                    <p className="text-base font-semibold text-primary">{selectedCertificate.driverName || 'Unknown'}</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-secondary mb-1">Certificate Name</label>
                                    <p className="text-base font-semibold text-primary">{selectedCertificate.certificateName}</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-secondary mb-1">Certificate Type</label>
                                    <p className="text-base text-primary">{selectedCertificate.certificateType}</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-secondary mb-1">Status</label>
                                    <span className={`px-3 py-1 inline-flex text-sm font-semibold rounded-full ${getStatusColor(selectedCertificate.status)}`}>
                                        {selectedCertificate.status.replace('_', ' ').toUpperCase()}
                                    </span>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-secondary mb-1">Issued Date</label>
                                    <p className="text-base text-primary">
                                        {new Date(selectedCertificate.issuedDate).toLocaleDateString('en-US', {
                                            year: 'numeric',
                                            month: 'long',
                                            day: 'numeric'
                                        })}
                                    </p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-secondary mb-1">Expiry Date</label>
                                    <p className="text-base text-primary">
                                        {selectedCertificate.expiryDate
                                            ? new Date(selectedCertificate.expiryDate).toLocaleDateString('en-US', {
                                                year: 'numeric',
                                                month: 'long',
                                                day: 'numeric'
                                            })
                                            : 'N/A'}
                                    </p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-secondary mb-1">Issuing Authority</label>
                                    <p className="text-base text-primary">{selectedCertificate.issuingAuthority}</p>
                                </div>
                                {selectedCertificate.certificateNumber && (
                                    <div>
                                        <label className="block text-sm font-medium text-secondary mb-1">Certificate Number</label>
                                        <p className="text-base text-primary">{selectedCertificate.certificateNumber}</p>
                                    </div>
                                )}
                            </div>

                            {selectedCertificate.notes && (
                                <div>
                                    <label className="block text-sm font-medium text-secondary mb-1">Notes</label>
                                    <p className="text-base text-primary whitespace-pre-wrap">{selectedCertificate.notes}</p>
                                </div>
                            )}

                            {selectedCertificate.fileUrl && (
                                <div>
                                    <label className="block text-sm font-medium text-secondary mb-1">Certificate File</label>
                                    <button
                                        onClick={() => handleViewFile(selectedCertificate)}
                                        className="flex items-center gap-2 px-4 py-2 bg-card text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
                                    >
                                        <FileText size={18} />
                                        {selectedCertificate.fileName || 'View Certificate File'}
                                    </button>
                                </div>
                            )}

                            <div className="pt-4 border-t border-theme">
                                <div className="grid grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-secondary mb-1 flex items-center gap-2">
                                            <Clock size={16} />
                                            Created At
                                        </label>
                                        <p className="text-sm text-secondary">{formatDateTime(selectedCertificate.createdAt)}</p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-secondary mb-1 flex items-center gap-2">
                                            <Clock size={16} />
                                            Last Updated
                                        </label>
                                        <p className="text-sm text-secondary">{formatDateTime(selectedCertificate.updatedAt)}</p>
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
                                        handleEditClick(selectedCertificate);
                                    }}
                                    style={{
                                        background: 'var(--accent-navyblue)',
                                    }}
                                    className="px-6 py-2 !text-white font-semibold rounded-lg hover:opacity-90"
                                >
                                    Edit Certificate
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
                                    <h3 className="text-lg font-semibold text-primary">Delete Certificate</h3>
                                    <p className="text-sm text-secondary">This action cannot be undone</p>
                                </div>
                            </div>
                            <p className="text-primary mb-6">
                                Are you sure you want to delete <span className="font-medium text-primary">{confirmDelete.name}</span>? This will permanently remove the certificate and all associated data.
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

export default TrainingCertificates;
