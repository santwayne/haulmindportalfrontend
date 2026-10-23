import React, { useState, useEffect } from 'react';
import { FileText, Search, Upload, Eye, Download, Trash2, CheckCircle, XCircle, AlertTriangle, Plus, Edit } from 'lucide-react';
import { FaCheckCircle, FaExclamationCircle, FaInfoCircle, FaTimes } from 'react-icons/fa';
import {
    getAllEmployeeDocuments,
    getEmployeeDocumentStats,
    deleteEmployeeDocument,
    getAllEmployees,
    createEmployeeDocument,
    updateEmployeeDocument,
    getSignedEmployeeDocumentUrl,
    type EmployeeWithDocuments,
    type EmployeeDocument,
    type DocumentStats
} from '../../../../axios/api/employeeDocument';

type NotificationType = 'success' | 'error' | 'info';

interface Notification {
    id: number;
    type: NotificationType;
    message: string;
}

// Notification Component
const Notification = ({ notification, onClose }: { notification: Notification; onClose: (id: number) => void }) => {
    const icons = {
        success: <FaCheckCircle className="text-green-500" size={24} />,
        error: <FaExclamationCircle className="text-red-500" size={24} />,
        info: <FaInfoCircle className="text-blue-500" size={24} />
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

const EmployeeDocumentsPage = () => {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
    const [selectedRole, setSelectedRole] = useState<string>('');
    const [employeeDocuments, setEmployeeDocuments] = useState<EmployeeWithDocuments[]>([]);
    const [documentStats, setDocumentStats] = useState<DocumentStats | null>(null);
    const [employees, setEmployees] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [editingDocument, setEditingDocument] = useState<EmployeeDocument | null>(null);
    const [viewingDocument, setViewingDocument] = useState<EmployeeDocument | null>(null);
    const [showViewModal, setShowViewModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [documentToDelete, setDocumentToDelete] = useState<string | null>(null);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    // Available roles (excluding driver - drivers should use Driver Documents)
    const roles = [
        'dispatcher', 'hr', 'contact', 'customer', 'reporter',
        'Maintenance Crew (Mechanics)', 'Fleet Maintenance Manager', 'Compliance Manager'
    ];


    // Fetch data on component mount and when filters change
    useEffect(() => {
        fetchData();
    }, [currentPage, selectedEmployee, selectedRole]);


    const fetchData = async () => {
        try {
            setLoading(true);
            const [documentsResponse, statsResponse, employeesResponse] = await Promise.all([
                getAllEmployeeDocuments(
                    currentPage,
                    10,
                    selectedEmployee?._id,
                    undefined,
                    undefined,
                    selectedRole || undefined,
                    'createdAt',
                    'desc'
                ),
                getEmployeeDocumentStats(),
                getAllEmployees()
            ]);

            const documents = Array.isArray(documentsResponse?.data) ? documentsResponse.data : [];
            // Filter out drivers for Employee Documents (drivers should use Driver Documents)
            const filteredDocuments = documents.filter(
                (doc) => doc.employee?.role !== 'driver'
            );
            setEmployeeDocuments(filteredDocuments);
            setDocumentStats(statsResponse?.data || null);
            // Filter employees to exclude drivers
            const filteredEmployees = Array.isArray(employeesResponse?.data)
                ? employeesResponse.data.filter((emp: any) => emp.role !== 'driver')
                : [];
            setEmployees(filteredEmployees);
            setTotalPages(documentsResponse?.pagination?.pages || 1);
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = async () => {
        try {
            setLoading(true);
            const response = await getAllEmployeeDocuments(
                1,
                10,
                selectedEmployee?._id,
                undefined,
                undefined,
                selectedRole || undefined,
                'createdAt',
                'desc'
            );
            // Filter out drivers for Employee Documents (drivers should use Driver Documents)
            const filteredDocuments = (response.data || []).filter(
                (doc) => doc.employee?.role !== 'driver'
            );
            setEmployeeDocuments(filteredDocuments);
            setCurrentPage(1);
        } catch (error) {
            console.error('Error searching documents:', error);
        } finally {
            setLoading(false);
        }
    };

    const addNotification = (type: NotificationType, message: string) => {
        const id = Date.now();
        setNotifications(prev => [...prev, { id, type, message }]);
    };

    const removeNotification = (id: number) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
    };

    const handleViewDocument = (doc: EmployeeDocument) => {
        setViewingDocument(doc);
        setShowViewModal(true);
    };

    const handleEditDocument = (doc: EmployeeDocument) => {
        setEditingDocument(doc);
        setShowUploadModal(true);
    };

    const handleDeleteClick = (documentId: string) => {
        setDocumentToDelete(documentId);
        setShowDeleteModal(true);
    };

    const handleDeleteDocument = async () => {
        if (!documentToDelete) return;

        try {
            const response = await deleteEmployeeDocument(documentToDelete);
            if (response && response.success) {
                addNotification('success', response.message || 'Document deleted successfully');
                fetchData();
            } else {
                addNotification('error', response?.message || 'Failed to delete document');
            }
        } catch (error: any) {
            console.error('Error deleting document:', error);
            addNotification('error', error?.message || 'Failed to delete document');
        } finally {
            setShowDeleteModal(false);
            setDocumentToDelete(null);
        }
    };


    const formatFileSize = (bytes: number) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'valid':
                return 'bg-green-100 text-green-700';
            case 'pending':
                return 'bg-yellow-100 text-yellow-700';
            case 'expired':
                return 'bg-red-100 text-red-700';
            case 'rejected':
                return 'bg-red-100 text-red-700';
            default:
                return 'bg-card text-primary';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'valid':
                return <CheckCircle className="w-3 h-3" />;
            case 'pending':
                return <AlertTriangle className="w-3 h-3" />;
            case 'expired':
            case 'rejected':
                return <XCircle className="w-3 h-3" />;
            default:
                return null;
        }
    };

    // Find employee name for viewing document
    const getEmployeeName = (employeeId: string | { _id: string; name: string }) => {
        if (typeof employeeId === 'string') {
            const emp = employees.find(e => e._id === employeeId);
            return emp ? emp.name : 'Unknown Employee';
        }
        return employeeId.name || 'Unknown Employee';
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-card p-8">
                <div className="bg-card rounded-xl shadow-sm p-8 border border-theme">
                    <div className="animate-pulse space-y-4">
                        <div className="h-6 bg-gray-200 rounded w-1/4"></div>
                        <div className="h-32 bg-gray-200 rounded"></div>
                        <div className="h-6 bg-gray-200 rounded w-1/3"></div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div
            className="min-h-screen bg-main p-8"
        >
            {/* Notifications Container */}
            <div className="fixed top-4 right-4 z-[10000] flex flex-col gap-2 max-w-md">
                {notifications.map(notification => (
                    <Notification
                        key={notification.id}
                        notification={notification}
                        onClose={removeNotification}
                    />
                ))}
            </div>

            {/* Header */}
            <div className="bg-card rounded-xl shadow-sm p-6 mb-6 border border-theme">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h2 className="text-2xl font-bold text-primary">Employee Documents</h2>
                        {selectedEmployee && (
                            <p className="text-secondary mt-1">Viewing documents for: <span className="font-semibold text-[#00D1FF]">{selectedEmployee.name}</span></p>
                        )}
                    </div>
                    <div className="flex items-center space-x-3">
                        <button
                            onClick={() => setShowUploadModal(true)}
                            style={{
                                background: "linear-gradient(90deg, var(--accent-blue) 0%, var(--accent-blue) 40%, rgba(0,209,255,0.15) 100%)"
                            }}
                            className="px-4 py-2  !mr-4 !text-white rounded-lg transition-colors flex items-center space-x-2"
                        >
                            <Upload className="w-4 h-4" />
                            <span>Upload Document</span>
                        </button>
                    </div>
                </div>

                <div className="flex items-center space-x-4">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-secondary w-5 h-5" />
                        <input
                            type="text"
                            placeholder="Search documents by employee name, document type..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                            className="w-full pl-10 pr-4 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <select
                        value={selectedRole}
                        onChange={(e) => setSelectedRole(e.target.value)}
                        className="px-4 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="">All Roles</option>
                        {roles.map((role) => (
                            <option key={role} value={role}>
                                {role.charAt(0).toUpperCase() + role.slice(1).replace(/([A-Z])/g, ' $1').trim()}
                            </option>
                        ))}
                    </select>
                    <select
                        value={selectedEmployee?._id || ''}
                        onChange={(e) => {
                            const employee = employees.find(emp => emp._id === e.target.value);
                            setSelectedEmployee(employee || null);
                        }}
                        className="px-4 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="">All Employees</option>
                        {employees.map((employee) => (
                            <option key={employee._id} value={employee._id}>
                                {employee.name} ({employee.internalId})
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Document Types Overview */}
            {!selectedEmployee && documentStats && (
                <div className="bg-card rounded-xl shadow-sm p-6 mb-6 border border-theme">
                    <h3 className="text-lg font-semibold text-primary mb-4">Document Statistics</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                        <div className="bg-card rounded-lg p-4 border border-blue-200">
                            <div className="flex items-center justify-between mb-2">
                                <FileText className="w-5 h-5 text-blue-500" />
                                <span className="text-xs bg-blue-100 text-[#00D1FF] px-2 py-0.5 rounded">Total</span>
                            </div>
                            <p className="text-sm font-medium text-primary mb-1">Total Documents</p>
                            <p className="text-2xl font-bold text-blue-900">{documentStats.totalDocuments}</p>
                        </div>
                        <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                            <div className="flex items-center justify-between mb-2">
                                <CheckCircle className="w-5 h-5 text-green-500" />
                                <span className="text-xs bg-green-100 text-green-600 px-2 py-0.5 rounded">Valid</span>
                            </div>
                            <p className="text-sm font-medium text-primary mb-1">Valid Documents</p>
                            <p className="text-2xl font-bold text-green-900">{documentStats.validDocuments}</p>
                        </div>
                        <div className="bg-card rounded-lg p-4 border border-yellow-200">
                            <div className="flex items-center justify-between mb-2">
                                <AlertTriangle className="w-5 h-5 text-yellow-500" />
                                <span className="text-xs bg-yellow-100 text-[#00FFA3] px-2 py-0.5 rounded">Pending</span>
                            </div>
                            <p className="text-sm font-medium text-primary mb-1">Pending Documents</p>
                            <p className="text-2xl font-bold text-yellow-900">{documentStats.pendingDocuments}</p>
                        </div>
                        <div className="bg-card rounded-lg p-4 border border-red-200">
                            <div className="flex items-center justify-between mb-2">
                                <XCircle className="w-5 h-5 text-red-500" />
                                <span className="text-xs bg-red-100 text-[#A855F7] px-2 py-0.5 rounded">Expired</span>
                            </div>
                            <p className="text-sm font-medium text-primary mb-1">Expired Documents</p>
                            <p className="text-2xl font-bold text-red-900">{documentStats.expiredDocuments}</p>
                        </div>
                    </div>

                    {/* <div className="grid grid-cols-5 gap-4">
            {documentTypes.map((docType, index) => {
              const count = documentStats.documentTypes[docType.name] || 0;
              return (
                <div key={index} className="bg-card rounded-lg p-4 border border-theme">
                  <div className="flex items-center justify-between mb-2">
                    <FileText className="w-5 h-5 text-blue-500" />
                    {docType.required && (
                      <span className="text-xs bg-red-100 text-[#A855F7] px-2 py-0.5 rounded">Required</span>
                    )}
                  </div>
                  <p className="text-sm font-medium text-primary mb-1">{docType.name}</p>
                  <p className="text-2xl font-bold text-primary">{count}</p>
                  <p className="text-xs text-secondary mt-1">documents</p>
                </div>
              );
            })}
          </div> */}
                </div>
            )}

            {/* Employee Documents */}
            <div className="space-y-6">
                {employeeDocuments.length === 0 ? (
                    <div className="bg-card rounded-xl shadow-sm p-8 border border-theme text-center">
                        <FileText className="w-12 h-12 text-secondary mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-primary mb-2">No documents found</h3>
                        <p className="text-secondary mb-4">
                            {selectedEmployee
                                ? `${selectedEmployee.name} has no documents uploaded yet.`
                                : 'No employee documents found. Upload some documents to get started.'
                            }
                        </p>
                        <button
                            onClick={() => setShowUploadModal(true)}
                            style={{
                                background: "linear-gradient(90deg, var(--accent-blue) 0%, var(--accent-blue) 40%, rgba(0,209,255,0.15) 100%)"
                            }}
                            className="px-4 py-2  !text-white rounded-lg  transition-colors"
                        >
                            Upload Document
                        </button>
                    </div>
                ) : (
                    employeeDocuments.map((empDoc) => (
                        <div key={empDoc.employee._id} className="bg-card rounded-xl shadow-sm border border-theme overflow-hidden">
                            {/* Employee Header */}
                            <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-b border-theme">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-3">
                                        <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold">
                                            {empDoc.employee.name.split(' ').map((n: string) => n[0]).join('')}
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-primary">{empDoc.employee.name}</h3>
                                            <p className="text-sm text-secondary">{empDoc.employee.internalId}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <span className="text-sm text-secondary">{empDoc.documents.length} documents</span>
                                        <button
                                            onClick={() => {
                                                setSelectedEmployee(empDoc.employee);
                                                setShowUploadModal(true);
                                            }}
                                            className="p-2 hover:bg-gray-200 rounded-lg"
                                            title="Upload Document"
                                        >
                                            <Plus className="w-4 h-4 text-secondary" />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Documents Table */}
                            {empDoc.documents.length > 0 ? (
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead className="bg-card border-b border-theme">
                                            <tr>
                                                <th className="px-6 py-3 text-left text-xs font-semibold text-secondary uppercase">Document Type</th>
                                                <th className="px-6 py-3 text-left text-xs font-semibold text-secondary uppercase">Status</th>
                                                <th className="px-6 py-3 text-left text-xs font-semibold text-secondary uppercase">Upload Date</th>
                                                <th className="px-6 py-3 text-left text-xs font-semibold text-secondary uppercase">Expiry Date</th>
                                                <th className="px-6 py-3 text-left text-xs font-semibold text-secondary uppercase">File Size</th>
                                                <th className="px-6 py-3 text-left text-xs font-semibold text-secondary uppercase">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-theme">
                                            {empDoc.documents.map((doc: EmployeeDocument, index: number) => (
                                                <tr key={index} className="hover:bg-[rgba(255,255,255,0.03)]">
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center space-x-2">
                                                            <FileText className="w-4 h-4 text-secondary" />
                                                            <span className="text-sm font-medium text-primary">{doc.documentType}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(doc.status)}`}>
                                                            {getStatusIcon(doc.status)}
                                                            <span className="capitalize">{doc.status}</span>
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className="text-sm text-secondary">
                                                            {new Date(doc.createdAt).toLocaleDateString()}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className={`text-sm ${!doc.expiryDate ? 'text-secondary' : 'text-secondary'}`}>
                                                            {doc.expiryDate ? new Date(doc.expiryDate).toLocaleDateString() : '-'}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className="text-sm text-secondary">
                                                            {doc.fileSize ? formatFileSize(doc.fileSize) : '-'}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center space-x-2">
                                                            {doc.fileUrl && (
                                                                <button
                                                                    onClick={() => window.open(doc.fileUrl, '_blank')}
                                                                    className="p-1.5 hover:bg-green-50 rounded text-green-600"
                                                                    title="Download"
                                                                >
                                                                    <Download className="w-4 h-4" />
                                                                </button>
                                                            )}
                                                            <button
                                                                onClick={() => handleViewDocument(doc)}
                                                                className="p-1.5 hover:bg-blue-50 rounded text-[#00D1FF]"
                                                                title="View Details"
                                                            >
                                                                <Eye className="w-4 h-4" />
                                                            </button>
                                                            <button
                                                                onClick={() => handleEditDocument(doc)}
                                                                className="p-1.5 hover:bg-yellow-50 rounded text-[#00FFA3]"
                                                                title="Edit"
                                                            >
                                                                <Edit className="w-4 h-4" />
                                                            </button>
                                                            <button
                                                                onClick={() => handleDeleteClick(doc._id)}
                                                                className="p-1.5 hover:bg-red-50 rounded text-[#A855F7]"
                                                                title="Delete"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="p-8 text-center text-secondary">
                                    <FileText className="w-8 h-8 mx-auto mb-2 text-secondary" />
                                    <p>No documents uploaded for this employee</p>
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="bg-card rounded-xl shadow-sm p-4 border border-theme mt-6">
                    <div className="flex items-center justify-between">
                        <div className="text-sm text-primary">
                            Page {currentPage} of {totalPages}
                        </div>
                        <div className="flex items-center space-x-2">
                            <button
                                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                                disabled={currentPage === 1}
                                className="px-3 py-1 border border-theme rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[rgba(255,255,255,0.03)]"
                            >
                                Previous
                            </button>
                            <button
                                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                                disabled={currentPage === totalPages}
                                className="px-3 py-1 border border-theme rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[rgba(255,255,255,0.03)]"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Upload/Edit Document Modal */}
            {showUploadModal && (
                <UploadDocumentModal
                    employee={selectedEmployee}
                    employees={employees}
                    onClose={() => {
                        setShowUploadModal(false);
                        setEditingDocument(null);
                        setSelectedEmployee(null);
                    }}
                    onSuccess={() => {
                        setShowUploadModal(false);
                        setEditingDocument(null);
                        setSelectedEmployee(null);
                        addNotification('success', editingDocument ? 'Document updated successfully' : 'Document uploaded successfully');
                        fetchData();
                    }}
                    editingDocument={editingDocument}
                    onError={(message: string) => {
                        addNotification('error', message);
                    }}
                />
            )}

            {/* View Document Modal */}
            {showViewModal && viewingDocument && (
                <ViewDocumentModal
                    document={viewingDocument}
                    employeeName={getEmployeeName(viewingDocument.employee)}
                    onClose={() => {
                        setShowViewModal(false);
                        setViewingDocument(null);
                    }}
                    onEdit={(doc) => {
                        setViewingDocument(null);
                        setShowViewModal(false);
                        handleEditDocument(doc);
                    }}
                    addNotification={addNotification}
                />
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteModal && (
                <DeleteConfirmationModal
                    onConfirm={handleDeleteDocument}
                    onCancel={() => {
                        setShowDeleteModal(false);
                        setDocumentToDelete(null);
                    }}
                />
            )}

        </div>
    );
};

// View Document Modal Component
const ViewDocumentModal = ({
    document,
    employeeName,
    onClose,
    onEdit,
    addNotification
}: {
    document: EmployeeDocument;
    employeeName: string;
    onClose: () => void;
    onEdit: (doc: EmployeeDocument) => void;
    addNotification: (type: NotificationType, message: string) => void;
}) => {
    const [signedFileUrl, setSignedFileUrl] = useState<string | null>(null);
    const [loadingFileUrl, setLoadingFileUrl] = useState<boolean>(false);
    const [viewerError, setViewerError] = useState<boolean>(false);

    useEffect(() => {
        // Fetch signed URL when modal opens
        if (document.fileUrl) {
            const isS3Url = document.fileUrl.includes('s3.amazonaws.com') || document.fileUrl.includes('.s3.');
            if (isS3Url) {
                setLoadingFileUrl(true);
                getSignedEmployeeDocumentUrl(document._id, 'inline')
                    .then((res) => {
                        if (res?.success && res?.url) {
                            setSignedFileUrl(res.url);
                        } else {
                            setSignedFileUrl(document.fileUrl || null);
                        }
                    })
                    .catch((error) => {
                        console.error('Error fetching signed URL:', error);
                        setSignedFileUrl(document.fileUrl || null);
                        addNotification('error', 'Failed to load document preview. Please try again.');
                    })
                    .finally(() => {
                        setLoadingFileUrl(false);
                    });
            } else {
                setSignedFileUrl(document.fileUrl);
            }
        }
    }, [document._id, document.fileUrl, addNotification]);

    const formatFileSize = (bytes: number) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'valid':
                return 'bg-green-100 text-green-700';
            case 'pending':
                return 'bg-yellow-100 text-yellow-700';
            case 'expired':
                return 'bg-red-100 text-red-700';
            case 'rejected':
                return 'bg-red-100 text-red-700';
            default:
                return 'bg-card text-primary';
        }
    };

    const getFileExtension = () => {
        if (document.fileName) {
            return document.fileName.split('.').pop()?.toLowerCase() || '';
        }
        if (document.fileUrl) {
            const match = document.fileUrl.match(/\.([^.?#]+)(\?|#|$)/);
            return match ? match[1].toLowerCase() : '';
        }
        return '';
    };

    const isPdf = () => {
        const ext = getFileExtension();
        return ext === 'pdf' || document.mimeType?.toLowerCase().includes('pdf');
    };

    const isImage = () => {
        const ext = getFileExtension();
        return ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext) ||
            document.mimeType?.toLowerCase().startsWith('image/');
    };

    return (
        <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center z-100 p-4">
            <div className="bg-card rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
                <div className="sticky top-0 bg-card border-b border-theme px-6 py-4 flex items-center justify-between">
                    <h2 className="text-2xl font-bold text-primary">Document Details</h2>
                    <button
                        onClick={onClose}
                        className="text-secondary hover:text-primary transition-colors"
                    >
                        <XCircle className="w-6 h-6" />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {/* Document Type and Status */}
                    <div className="flex items-center justify-between pb-4 border-b border-theme">
                        <div className="flex items-center gap-3">
                            <FileText className="w-10 h-10 text-blue-500" />
                            <div>
                                <p className="text-lg font-semibold text-primary">{document.documentType}</p>
                                <p className="text-sm text-secondary">Employee: {employeeName}</p>
                            </div>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(document.status)}`}>
                            {document.status.charAt(0).toUpperCase() + document.status.slice(1)}
                        </span>
                    </div>

                    {/* Document Information Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {document.documentNumber && (
                            <div className="bg-card p-4 rounded-lg">
                                <p className="text-sm font-medium text-secondary mb-1">Document Number</p>
                                <p className="text-lg font-semibold text-primary">{document.documentNumber}</p>
                            </div>
                        )}

                        {document.issueDate && (
                            <div className="bg-card p-4 rounded-lg">
                                <p className="text-sm font-medium text-secondary mb-1">Issue Date</p>
                                <p className="text-lg font-semibold text-primary">
                                    {new Date(document.issueDate).toLocaleDateString('en-US', {
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric'
                                    })}
                                </p>
                            </div>
                        )}

                        {document.expiryDate && (
                            <div className="bg-card p-4 rounded-lg">
                                <p className="text-sm font-medium text-secondary mb-1">Expiry Date</p>
                                <p className="text-lg font-semibold text-primary">
                                    {new Date(document.expiryDate).toLocaleDateString('en-US', {
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric'
                                    })}
                                </p>
                            </div>
                        )}

                        {document.fileSize && (
                            <div className="bg-card p-4 rounded-lg">
                                <p className="text-sm font-medium text-secondary mb-1">File Size</p>
                                <p className="text-lg font-semibold text-primary">{formatFileSize(document.fileSize)}</p>
                            </div>
                        )}

                        {document.mimeType && (
                            <div className="bg-card p-4 rounded-lg">
                                <p className="text-sm font-medium text-secondary mb-1">File Type</p>
                                <p className="text-lg font-semibold text-primary">{document.mimeType}</p>
                            </div>
                        )}

                        {document.createdAt && (
                            <div className="bg-card p-4 rounded-lg">
                                <p className="text-sm font-medium text-secondary mb-1">Upload Date</p>
                                <p className="text-lg font-semibold text-primary">
                                    {new Date(document.createdAt).toLocaleDateString('en-US', {
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric'
                                    })}
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Description */}
                    {document.description && (
                        <div>
                            <p className="text-sm font-medium text-secondary mb-2">Description</p>
                            <p className="text-primary bg-card p-4 rounded-lg">{document.description}</p>
                        </div>
                    )}

                    {/* File Preview/Link */}
                    {document.fileUrl && (
                        <div>
                            <p className="text-sm font-medium text-secondary mb-3">Document File</p>
                            <div className="bg-card p-4 rounded-lg">
                                {loadingFileUrl ? (
                                    <div className="flex flex-col items-center justify-center h-[60vh] bg-card rounded-lg">
                                        <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-blue-600 mb-4"></div>
                                        <p className="text-secondary">Loading document...</p>
                                    </div>
                                ) : signedFileUrl ? (
                                    <>
                                        {isPdf() ? (
                                            <div className="relative w-full">
                                                <iframe
                                                    title="PDF Preview"
                                                    src={`${signedFileUrl}#toolbar=0`}
                                                    className="w-full h-[60vh] border rounded-lg bg-card"
                                                    style={{ minHeight: '60vh' }}
                                                    onError={(e) => {
                                                        console.error('❌ PDF iframe load error:', e);
                                                        setViewerError(true);
                                                    }}
                                                    onLoad={() => {
                                                        console.log('✅ PDF iframe loaded');
                                                        setViewerError(false);
                                                    }}
                                                />
                                                <div className="absolute bottom-4 right-4 flex gap-2">
                                                    <button
                                                        onClick={() => {
                                                            window.open(signedFileUrl, '_blank', 'noopener,noreferrer');
                                                        }}
                                                        className="px-3 py-2 bg-green-600 !text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium flex items-center gap-2 shadow-lg"
                                                    >
                                                        <Eye size={14} className="text-white" />
                                                        <span className="text-white">Open in New Tab</span>
                                                    </button>
                                                    <button
                                                        onClick={async () => {
                                                            try {
                                                                const signedRes = await getSignedEmployeeDocumentUrl(document._id, 'attachment');
                                                                const url = signedRes?.success && signedRes?.url ? signedRes.url : signedFileUrl;
                                                                const link = window.document.createElement('a');
                                                                link.href = url || '';
                                                                link.download = document.fileName || 'document';
                                                                link.target = '_blank';
                                                                window.document.body.appendChild(link);
                                                                link.click();
                                                                window.document.body.removeChild(link);
                                                            } catch (error) {
                                                                console.error('Download error:', error);
                                                                addNotification('error', 'Download failed. Please try again.');
                                                            }
                                                        }}
                                                        className="px-3 py-2 bg-blue-600 !text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium flex items-center gap-2 shadow-lg"
                                                    >
                                                        <Download size={14} className="text-white" />
                                                        <span className="text-white">Download</span>
                                                    </button>
                                                </div>
                                                {viewerError && (
                                                    <div className="absolute inset-0 flex items-center justify-center bg-card bg-opacity-90 rounded-lg">
                                                        <div className="text-center p-4">
                                                            <FileText className="text-yellow-500 mb-2 mx-auto" size={32} />
                                                            <p className="text-sm text-secondary mb-3">PDF could not be displayed in viewer.</p>
                                                            <button
                                                                onClick={() => {
                                                                    window.open(signedFileUrl, '_blank', 'noopener,noreferrer');
                                                                }}
                                                                className="px-4 py-2 bg-blue-600 !text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                                                            >
                                                                <span className="text-white">Open in New Tab</span>
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        ) : isImage() ? (
                                            <div className="flex flex-col items-center justify-center bg-card rounded-lg border p-4">
                                                <img
                                                    src={signedFileUrl}
                                                    alt={document.fileName || 'Document Preview'}
                                                    className="max-h-[60vh] w-auto mx-auto rounded-lg shadow-lg"
                                                    onError={(e) => {
                                                        console.error('Image load error:', e);
                                                        const target = e.currentTarget;
                                                        target.style.display = 'none';
                                                        addNotification('error', 'Failed to load image preview.');
                                                    }}
                                                />
                                                <div className="mt-4 flex gap-2">
                                                    <button
                                                        onClick={() => {
                                                            window.open(signedFileUrl, '_blank', 'noopener,noreferrer');
                                                        }}
                                                        className="px-3 py-2 bg-green-600 !text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium flex items-center gap-2"
                                                    >
                                                        <Eye size={14} className="text-white" />
                                                        <span className="text-white">Open in New Tab</span>
                                                    </button>
                                                    <button
                                                        onClick={async () => {
                                                            try {
                                                                const signedRes = await getSignedEmployeeDocumentUrl(document._id, 'attachment');
                                                                const url = signedRes?.success && signedRes?.url ? signedRes.url : signedFileUrl;
                                                                const link = window.document.createElement('a');
                                                                link.href = url || '';
                                                                link.download = document.fileName || 'document';
                                                                link.target = '_blank';
                                                                window.document.body.appendChild(link);
                                                                link.click();
                                                                window.document.body.removeChild(link);
                                                            } catch (error) {
                                                                console.error('Download error:', error);
                                                                addNotification('error', 'Download failed. Please try again.');
                                                            }
                                                        }}
                                                        className="px-3 py-2 bg-blue-600 !text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium flex items-center gap-2"
                                                    >
                                                        <Download size={14} className="text-white" />
                                                        <span className="text-white">Download</span>
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center justify-center h-[40vh] bg-card rounded-lg border-2 border-dashed border-theme">
                                                <FileText className="text-secondary mb-4" size={48} />
                                                <p className="text-sm text-secondary mb-4">This file type cannot be previewed in the browser.</p>
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => {
                                                            window.open(signedFileUrl, '_blank', 'noopener,noreferrer');
                                                        }}
                                                        className="px-4 py-2 bg-green-600 !text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium flex items-center gap-2"
                                                    >
                                                        <Eye size={14} className="text-white" />
                                                        <span className="text-white">Open in New Tab</span>
                                                    </button>
                                                    <button
                                                        onClick={async () => {
                                                            try {
                                                                const signedRes = await getSignedEmployeeDocumentUrl(document._id, 'attachment');
                                                                const url = signedRes?.success && signedRes?.url ? signedRes.url : signedFileUrl;
                                                                const link = window.document.createElement('a');
                                                                link.href = url || '';
                                                                link.download = document.fileName || 'document';
                                                                link.target = '_blank';
                                                                window.document.body.appendChild(link);
                                                                link.click();
                                                                window.document.body.removeChild(link);
                                                            } catch (error) {
                                                                console.error('Download error:', error);
                                                                addNotification('error', 'Download failed. Please try again.');
                                                            }
                                                        }}
                                                        className="px-4 py-2 bg-blue-600 !text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium flex items-center gap-2"
                                                    >
                                                        <Download size={14} className="text-white" />
                                                        <span className="text-white">Download</span>
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-[40vh] bg-card rounded-lg border-2 border-dashed border-theme">
                                        <FileText className="text-secondary mb-4" size={48} />
                                        <p className="text-sm text-secondary mb-4">No file URL available.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Modal Footer */}
                <div className="sticky bottom-0 bg-card border-t border-theme px-6 py-4 flex items-center justify-end gap-3">
                    <button
                        onClick={() => onEdit(document)}
                        style={{
                            background: "linear-gradient(90deg, var(--accent-blue) 0%, var(--accent-blue) 40%, rgba(0,209,255,0.15) 100%)"
                        }}
                        className="!text-white px-4 py-2 rounded-lg  flex items-center gap-2 transition-colors"
                    >
                        <Edit className="w-4 h-4" />
                        Edit Document
                    </button>
                    <button
                        onClick={onClose}
                        className="text-secondary hover:text-primary px-6 py-2 border border-theme rounded-lg hover:bg-[rgba(255,255,255,0.03)] transition-colors"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

// Delete Confirmation Modal
const DeleteConfirmationModal = ({
    onConfirm,
    onCancel
}: {
    onConfirm: () => void;
    onCancel: () => void;
}) => {
    return (
        <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center z-100 p-4">
            <div className="bg-card rounded-xl shadow-xl max-w-md w-full">
                <div className="p-6">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="flex-shrink-0 w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                            <Trash2 className="w-6 h-6 text-[#A855F7]" />
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-primary">Delete Document</h3>
                            <p className="text-sm text-secondary">This action cannot be undone</p>
                        </div>
                    </div>
                    <p className="text-primary mb-6">
                        Are you sure you want to delete this document? This will permanently remove the document and all associated data.
                    </p>
                    <div className="flex items-center justify-end gap-3">
                        <button
                            onClick={onCancel}
                            className="px-4 py-2 border border-theme rounded-lg hover:bg-[rgba(255,255,255,0.03)] transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={onConfirm}
                            className="px-4 py-2 bg-red-600 !text-white rounded-lg hover:bg-red-700 transition-colors"
                        >
                            Delete
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Upload Document Modal Component
const UploadDocumentModal = ({
    employee,
    employees,
    onClose,
    onSuccess,
    editingDocument,
    onError
}: {
    employee: any;
    employees: any[];
    onClose: () => void;
    onSuccess: () => void;
    editingDocument: EmployeeDocument | null;
    onError?: (message: string) => void;
}) => {
    const [formData, setFormData] = useState({
        employee: employee?._id || '',
        documentType: '',
        documentNumber: '',
        issueDate: '',
        expiryDate: '',
        description: '',
        status: 'valid'
    });
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);

    const documentTypes = [
        'Employment Contract',
        'ID Document',
        'Passport',
        'Work Permit',
        'Background Check',
        'Drug Test',
        'Training Certificate',
        'Insurance Policy',
        'Company Policy',
        'Performance Review',
        'Payroll Document',
        'Tax Document',
        'Emergency Contact',
        'Medical Certificate',
        'Driving Licence',
        'Travel Document',
        'Commercial Driver\'s License (CDL)',
        'Medical Certificate (DOT Physical)',
        'Drug Test Results',
        'Alcohol Test Results',
        'Driving Record (MVR)',
        'DOT Physical Card',
        'CDL Training Certificate',
        'Defensive Driving Certificate',
        'Hazmat Endorsement',
        'Tanker Endorsement',
        'Doubles/Triples Endorsement',
        'Passenger Endorsement',
        'School Bus Endorsement',
        'Vehicle Inspection Certification',
        'Safety Training Certificate',
        'Hours of Service (HOS) Records',
        'Emergency Contact Form',
        'Road Test Certificate',
        'TSA Security Clearance',
        'Other'
    ];

    useEffect(() => {
        if (editingDocument) {
            setFormData({
                employee: editingDocument.employee,
                documentType: editingDocument.documentType,
                documentNumber: editingDocument.documentNumber || '',
                issueDate: editingDocument.issueDate ? editingDocument.issueDate.split('T')[0] : '',
                expiryDate: editingDocument.expiryDate ? editingDocument.expiryDate.split('T')[0] : '',
                description: editingDocument.description || '',
                status: editingDocument.status
            });
        } else if (employee) {
            setFormData(prev => ({ ...prev, employee: employee._id }));
        }
    }, [editingDocument, employee]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.employee || !formData.documentType) {
            if (onError) {
                onError('Please select an employee and document type');
            } else {
                alert('Please select an employee and document type');
            }
            return;
        }

        if (!editingDocument && !selectedFile) {
            if (onError) {
                onError('Please select a file to upload');
            } else {
                alert('Please select a file to upload');
            }
            return;
        }

        try {
            setLoading(true);
            const submitData = new FormData();
            submitData.append('employee', formData.employee);
            submitData.append('documentType', formData.documentType);
            submitData.append('status', formData.status);

            if (formData.documentNumber) submitData.append('documentNumber', formData.documentNumber);
            if (formData.issueDate) submitData.append('issueDate', formData.issueDate);
            if (formData.expiryDate) submitData.append('expiryDate', formData.expiryDate);
            if (formData.description) submitData.append('description', formData.description);
            if (selectedFile) submitData.append('documentFile', selectedFile);

            // Debug: Log the form data being sent
            console.log('Form data being sent:');
            for (let [key, value] of submitData.entries()) {
                console.log(key, value);
            }

            const response = editingDocument
                ? await updateEmployeeDocument(editingDocument._id, submitData)
                : await createEmployeeDocument(submitData);

            if (response && response.success) {
                onSuccess();
            } else {
                const errorMessage = response?.message || 'Failed to save document';
                if (onError) {
                    onError(errorMessage);
                } else {
                    alert(`Error saving document: ${errorMessage}`);
                }
            }
        } catch (error: any) {
            console.error('Error saving document:', error);
            console.error('Error response:', error.response?.data);
            const errorMessage = error?.response?.data?.message || error?.message || 'Failed to save document';
            if (onError) {
                onError(errorMessage);
            } else {
                alert(`Error saving document: ${errorMessage}`);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center z-100 p-4">
            <div className="bg-card rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div className="p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-bold !text-primary">
                            {editingDocument ? 'Edit Document' : 'Upload Document'}
                        </h2>
                        <button
                            onClick={onClose}
                            className="text-secondary hover:text-secondary"
                        >
                            <XCircle className="w-6 h-6" />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-primary mb-2">
                                Employee <span className="text-red-500">*</span>
                            </label>
                            <select
                                value={formData.employee}
                                onChange={(e) => setFormData({ ...formData, employee: e.target.value })}
                                className="w-full px-3 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                required
                            >
                                <option value="">Select Employee</option>
                                {employees.map((emp) => (
                                    <option key={emp._id} value={emp._id}>
                                        {emp.name} ({emp.internalId})
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-primary mb-2">
                                Document Type <span className="text-red-500">*</span>
                            </label>
                            <select
                                value={formData.documentType}
                                onChange={(e) => setFormData({ ...formData, documentType: e.target.value })}
                                className="w-full px-3 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                required
                            >
                                <option value="">Select Document Type</option>
                                {documentTypes.map((type) => (
                                    <option key={type} value={type}>{type}</option>
                                ))}
                            </select>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-primary mb-2">
                                    Document Number
                                </label>
                                <input
                                    type="text"
                                    value={formData.documentNumber}
                                    onChange={(e) => setFormData({ ...formData, documentNumber: e.target.value })}
                                    className="w-full px-3 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-primary mb-2">
                                    Status
                                </label>
                                <select
                                    value={formData.status}
                                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                    className="w-full px-3 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="valid">Valid</option>
                                    <option value="pending">Pending</option>
                                    <option value="expired">Expired</option>
                                    <option value="rejected">Rejected</option>
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-primary mb-2">
                                    Issue Date
                                </label>
                                <input
                                    type="date"
                                    value={formData.issueDate}
                                    onChange={(e) => setFormData({ ...formData, issueDate: e.target.value })}
                                    className="w-full px-3 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                                    className="w-full px-3 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-primary mb-2">
                                Description
                            </label>
                            <textarea
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                rows={3}
                                className="w-full px-3 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Enter document description..."
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-primary mb-2">
                                Document File {!editingDocument && <span className="text-red-500">*</span>}
                            </label>
                            <input
                                type="file"
                                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                                className="w-full px-3 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.txt,.zip"
                            />
                            {editingDocument && (
                                <p className="text-sm text-secondary mt-1">
                                    Leave empty to keep current file
                                </p>
                            )}
                        </div>

                        <div className="flex items-center justify-end space-x-3 pt-4">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2 !mr-4 border border-theme rounded-lg hover:bg-[rgba(255,255,255,0.03)]"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                style={{
                                    background: "linear-gradient(90deg, var(--accent-blue) 0%, var(--accent-blue) 40%, rgba(0,209,255,0.15) 100%)"
                                }}
                                className="px-4 py-2  !text-white rounded-lg  disabled:opacity-50"
                            >
                                {loading ? 'Saving...' : editingDocument ? 'Update Document' : 'Upload Document'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default EmployeeDocumentsPage;

// Add CSS for notification animation
const style = document.createElement('style');
style.textContent = `
  @keyframes slide-in {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
  .animate-slide-in {
    animation: slide-in 0.3s ease-out;
  }
`;
if (!document.getElementById('employee-documents-notification-styles')) {
    style.id = 'employee-documents-notification-styles';
    document.head.appendChild(style);
}