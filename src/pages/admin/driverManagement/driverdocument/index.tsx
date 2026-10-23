import React, { useState, useEffect } from 'react';
import { FileText, Search, Upload, Eye, Download, Trash2, CheckCircle, XCircle, AlertTriangle, Plus, Edit } from 'lucide-react';
import { FaCheckCircle, FaExclamationCircle, FaInfoCircle, FaTimes } from 'react-icons/fa';

// Import your actual API functions here
import {
  createDriverDocument,
  updateDriverDocument,
  deleteDriverDocument
} from '../../../../axios/api/compilance.driverdoc';
import { getAllDrivers } from '../../../../axios/api/driver';
import {
  getAllEmployeeDocuments,
  getDocumentsByEmployee,
  getEmployeeDocumentStats
} from '../../../../axios/api/employeeDocument';

type NotificationType = 'success' | 'error' | 'info';

interface Notification {
  id: number;
  type: NotificationType;
  message: string;
}

interface DriverDocument {
  _id: string;
  driver: string | { _id: string; name: string };
  documentType: string;
  documentNumber?: string;
  issueDate?: string;
  expiryDate?: string;
  description?: string;
  status: string;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  createdAt: string;
}

interface DriverWithDocuments {
  driver: {
    _id: string;
    name: string;
    internalId: string;
  };
  documents: DriverDocument[];
}

interface DocumentStats {
  totalDocuments: number;
  validDocuments: number;
  pendingDocuments: number;
  expiredDocuments: number;
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
    const timer = setTimeout(() => onClose(notification.id), 5000);
    return () => clearTimeout(timer);
  }, [notification.id, onClose]);

  return (
    <div className={`flex items-start gap-3 p-4 rounded-lg border-2 shadow-lg ${bgColors[notification.type]}`}>
      <div className="flex-shrink-0 mt-0.5">{icons[notification.type]}</div>
      <p className="flex-1 text-sm font-medium text-primary">{notification.message}</p>
      <button onClick={() => onClose(notification.id)} className="flex-shrink-0 text-secondary hover:text-secondary">
        <FaTimes size={16} />
      </button>
    </div>
  );
};

const DriverDocumentsPage = () => {
  const [selectedDriver, setSelectedDriver] = useState<any>(null);
  const [driverDocuments, setDriverDocuments] = useState<DriverWithDocuments[]>([]);
  const [documentStats, setDocumentStats] = useState<DocumentStats | null>(null);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [editingDocument, setEditingDocument] = useState<DriverDocument | null>(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewingDocument, setViewingDocument] = useState<DriverDocument | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<string | null>(null);

  // Driver-specific document types (STATIC - key difference from employee documents)
  const DRIVER_DOCUMENT_TYPES = [
    'Commercial Driver\'s License (CDL)',
    'Medical Certificate (DOT Physical)',
    'Drug Test Results',
    'Alcohol Test Results',
    'Background Check',
    'Driving Record (MVR)',
    'Insurance Certificate',
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
    'Employment Contract',
    'Emergency Contact Form',
    'Road Test Certificate',
    'TSA Security Clearance',
    'Other'
  ];

  useEffect(() => {
    fetchData();
  }, [selectedDriver]);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch drivers
      const driversResponse = await getAllDrivers(1, 100);
      if (driversResponse.success && Array.isArray(driversResponse.data)) {
        setDrivers(driversResponse.data);
      }

      // Fetch documents and stats
      if (selectedDriver?._id) {
        // Fetch documents for selected driver
        const documentsResponse = await getDocumentsByEmployee(selectedDriver._id);
        if (documentsResponse.success && Array.isArray(documentsResponse.data)) {
          // Transform EmployeeDocument[] to DriverDocument[]
          const driverDocs = documentsResponse.data.map((doc: any) => ({
            ...doc,
            driver: doc.employee || selectedDriver._id
          }));
          setDriverDocuments([{
            driver: {
              _id: selectedDriver._id,
              name: selectedDriver.name || '',
              internalId: selectedDriver.internalId || ''
            },
            documents: driverDocs
          }]);
        }
      } else {
        // Fetch all documents with driver role filter
        const allDocumentsResponse = await getAllEmployeeDocuments(1, 100, undefined, undefined, undefined, 'driver');
        if (allDocumentsResponse.success && Array.isArray(allDocumentsResponse.data)) {
          // Transform EmployeeWithDocuments[] to DriverWithDocuments[]
          const transformedDocs = allDocumentsResponse.data.map((item: any) => ({
            driver: item.employee ? {
              _id: item.employee._id || item.employee,
              name: item.employee.name || '',
              internalId: item.employee.internalId || ''
            } : {
              _id: '',
              name: '',
              internalId: ''
            },
            documents: item.documents ? item.documents.map((doc: any) => ({
              ...doc,
              driver: doc.employee || item.employee?._id || item.employee
            })) : []
          }));
          setDriverDocuments(transformedDocs);
        }
      }

      // Fetch document stats
      const statsResponse = await getEmployeeDocumentStats();
      if (statsResponse.success && statsResponse.data) {
        setDocumentStats({
          totalDocuments: statsResponse.data.totalDocuments || 0,
          validDocuments: statsResponse.data.validDocuments || 0,
          pendingDocuments: statsResponse.data.pendingDocuments || 0,
          expiredDocuments: statsResponse.data.expiredDocuments || 0
        });
      } else {
        setDocumentStats({ totalDocuments: 0, validDocuments: 0, pendingDocuments: 0, expiredDocuments: 0 });
      }
    } catch (error) {
      console.error('Error fetching data:', error);
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

  const getDriverName = (doc: DriverDocument): string => {
    // If driver is an object with name, use it
    if (typeof doc.driver === 'object' && doc.driver !== null && 'name' in doc.driver) {
      return doc.driver.name;
    }

    // If driver is a string ID, look it up in driverDocuments or drivers array
    const driverId = typeof doc.driver === 'string' ? doc.driver : (doc.driver as any)._id;

    if (driverId) {
      // First, try to find in driverDocuments (which has the driver info)
      const driverDoc = driverDocuments.find(drvDoc => drvDoc.driver._id === driverId);
      if (driverDoc) {
        return driverDoc.driver.name;
      }

      // If not found, look in drivers array
      const driver = drivers.find(d => d._id === driverId);
      if (driver) {
        return driver.name;
      }
    }

    return 'Unknown Driver';
  };

  const handleViewDocument = (doc: DriverDocument) => {
    setViewingDocument(doc);
    setShowViewModal(true);
  };

  const handleEditDocument = (doc: DriverDocument) => {
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
      const response = await deleteDriverDocument(documentToDelete);
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
      case 'valid': return 'bg-green-100 text-green-700';
      case 'pending': return 'bg-yellow-100 text-yellow-700';
      case 'expired':
      case 'rejected': return 'bg-red-100 text-red-700';
      default: return 'bg-card text-primary';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'valid': return <CheckCircle className="w-3 h-3" />;
      case 'pending': return <AlertTriangle className="w-3 h-3" />;
      case 'expired':
      case 'rejected': return <XCircle className="w-3 h-3" />;
      default: return null;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-card p-8">
        <div className="bg-card rounded-xl shadow-sm p-8 border border-theme">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-gray-200 rounded w-1/4"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-card p-8 ">
      {/* Notifications */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-md">
        {notifications.map(notification => (
          <Notification key={notification.id} notification={notification} onClose={removeNotification} />
        ))}
      </div>

      {/* Header */}
      <div className="bg-card rounded-xl shadow-sm p-6 mb-6 border border-theme">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-primary">Driver Documents</h2>
            <p className="text-sm text-secondary mt-1">Manage CDL, medical certificates, and compliance documents for drivers</p>
            {selectedDriver && (
              <p className="text-secondary mt-1">Viewing documents for: <span className="font-semibold text-[#00D1FF]">{selectedDriver.name}</span></p>
            )}
          </div>
          <button
            onClick={() => setShowUploadModal(true)}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center space-x-2"
          >
            <Upload className="w-4 h-4" />
            <span>Upload Document</span>
          </button>
        </div>

        <div className="flex items-center space-x-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-secondary w-5 h-5" />
            <input
              type="text"
              placeholder="Search by driver name, document type, or document number..."
              className="w-full pl-10 pr-4 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={selectedDriver?._id || ''}
            onChange={(e) => {
              const driver = drivers.find(d => d._id === e.target.value);
              setSelectedDriver(driver || null);
            }}
            className="px-4 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[200px]"
          >
            <option value="">All Drivers</option>
            {drivers.map((driver) => (
              <option key={driver._id} value={driver._id}>
                {driver.name} ({driver.internalId})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Document Statistics */}
      {!selectedDriver && documentStats && (
        <div className="bg-card rounded-xl shadow-sm p-6 mb-6 border border-theme">
          <h3 className="text-lg font-semibold text-primary mb-4">Document Statistics</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
              <p className="text-sm font-medium text-primary mb-1">Pending Review</p>
              <p className="text-2xl font-bold text-yellow-900">{documentStats.pendingDocuments}</p>
            </div>
            <div className="bg-card rounded-lg p-4 border border-red-200">
              <div className="flex items-center justify-between mb-2">
                <XCircle className="w-5 h-5 text-red-500" />
                <span className="text-xs bg-red-100 text-[#A855F7] px-2 py-0.5 rounded">Expired</span>
              </div>
              <p className="text-sm font-medium text-primary mb-1">Expired/Rejected</p>
              <p className="text-2xl font-bold text-red-900">{documentStats.expiredDocuments}</p>
            </div>
          </div>
        </div>
      )}

      {/* Driver Documents List */}
      <div className="space-y-6">
        {driverDocuments.length === 0 ? (
          <div className="bg-card rounded-xl shadow-sm p-8 border border-theme text-center">
            <FileText className="w-12 h-12 text-secondary mx-auto mb-4" />
            <h3 className="text-lg font-medium text-primary mb-2">No documents found</h3>
            <p className="text-secondary mb-4">
              {selectedDriver
                ? `${selectedDriver.name} has no documents uploaded yet.`
                : 'No driver documents found. Upload driver compliance documents to get started.'
              }
            </p>
            <button
              onClick={() => setShowUploadModal(true)}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              Upload Document
            </button>
          </div>
        ) : (
          driverDocuments.map((drvDoc) => (
            <div key={drvDoc.driver._id} className="bg-card rounded-xl shadow-sm border border-theme overflow-hidden">
              {/* Driver Header */}
              <div className="bg-gradient-to-r from-blue-50 to-blue-100 px-6 py-4 border-b border-theme">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold">
                      {drvDoc.driver.name.split(' ').map((n: string) => n[0]).join('')}
                    </div>
                    <div>
                      <h3 className="font-semibold text-primary">{drvDoc.driver.name}</h3>
                      <p className="text-sm text-secondary">Driver ID: {drvDoc.driver.internalId}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-secondary">{drvDoc.documents.length} documents</span>
                    <button
                      onClick={() => {
                        setSelectedDriver(drvDoc.driver);
                        setShowUploadModal(true);
                      }}
                      className="p-2 hover:bg-blue-200 rounded-lg"
                      title="Upload Document"
                    >
                      <Plus className="w-4 h-4 text-secondary" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Documents Table */}
              {drvDoc.documents.length > 0 ? (
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
                      {drvDoc.documents.map((doc: DriverDocument, index: number) => (
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
                                title="View"
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
                  <p>No documents uploaded for this driver</p>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Document Types Reference (Static for Drivers) */}
      <div className="bg-card rounded-xl shadow-sm p-6 mt-6 border border-theme">
        <h3 className="text-lg font-semibold text-primary mb-4">Required Driver Document Types</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {DRIVER_DOCUMENT_TYPES.map((docType, index) => (
            <div key={index} className="flex items-center space-x-2 text-sm text-primary bg-card px-3 py-2 rounded-lg">
              <FileText className="w-4 h-4 text-blue-500 flex-shrink-0" />
              <span>{docType}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Upload/Edit Document Modal */}
      {showUploadModal && (
        <UploadDocumentModal
          driver={selectedDriver}
          drivers={drivers}
          documentTypes={DRIVER_DOCUMENT_TYPES}
          onClose={() => {
            setShowUploadModal(false);
            setEditingDocument(null);
            setSelectedDriver(null);
          }}
          onSuccess={() => {
            setShowUploadModal(false);
            setEditingDocument(null);
            setSelectedDriver(null);
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
          driverName={getDriverName(viewingDocument)}
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

// Upload Document Modal Component
const UploadDocumentModal = ({
  driver,
  drivers,
  documentTypes,
  onClose,
  onSuccess,
  editingDocument,
  onError
}: {
  driver: any;
  drivers: any[];
  documentTypes: string[];
  onClose: () => void;
  onSuccess: () => void;
  editingDocument: DriverDocument | null;
  onError?: (message: string) => void;
}) => {
  const [formData, setFormData] = useState({
    driver: driver?._id || '',
    documentType: '',
    documentNumber: '',
    issueDate: '',
    expiryDate: '',
    description: '',
    status: 'valid'
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (editingDocument) {
      setFormData({
        driver: typeof editingDocument.driver === 'string' ? editingDocument.driver : editingDocument.driver._id,
        documentType: editingDocument.documentType,
        documentNumber: editingDocument.documentNumber || '',
        issueDate: editingDocument.issueDate ? editingDocument.issueDate.split('T')[0] : '',
        expiryDate: editingDocument.expiryDate ? editingDocument.expiryDate.split('T')[0] : '',
        description: editingDocument.description || '',
        status: editingDocument.status
      });
    } else if (driver) {
      setFormData(prev => ({ ...prev, driver: driver._id }));
    }
  }, [editingDocument, driver]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.driver || !formData.documentType) {
      if (onError) {
        onError('Please select a driver and document type');
      } else {
        alert('Please select a driver and document type');
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
      // Use 'employee' field since drivers are stored as employees in the backend
      submitData.append('employee', formData.driver);
      submitData.append('documentType', formData.documentType);
      submitData.append('status', formData.status);

      if (formData.documentNumber) submitData.append('documentNumber', formData.documentNumber);
      if (formData.issueDate) submitData.append('issueDate', formData.issueDate);
      if (formData.expiryDate) submitData.append('expiryDate', formData.expiryDate);
      if (formData.description) submitData.append('description', formData.description);
      if (selectedFile) submitData.append('documentFile', selectedFile);

      const response = editingDocument
        ? await updateDriverDocument(editingDocument._id, submitData)
        : await createDriverDocument(submitData);

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
    <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-primary">
              {editingDocument ? 'Edit Driver Document' : 'Upload Driver Document'}
            </h2>
            <button onClick={onClose} className="text-secondary hover:text-secondary">
              <XCircle className="w-6 h-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-primary mb-2">
                Driver <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.driver}
                onChange={(e) => setFormData({ ...formData, driver: e.target.value })}
                className="w-full px-3 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
                disabled={!!editingDocument}
              >
                <option value="">Select Driver</option>
                {drivers.map((drv) => (
                  <option key={drv._id} value={drv._id}>
                    {drv.name} ({drv.internalId})
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
                  placeholder="e.g., CDL-123456"
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
                placeholder="Enter document description or notes..."
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
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.txt"
                required={!editingDocument}
              />
              {selectedFile && (
                <p className="text-sm text-secondary mt-1">
                  Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(2)} KB)
                </p>
              )}
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
                className="px-4 py-2 border border-theme rounded-lg hover:bg-[rgba(255,255,255,0.03)] transition-colors"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 transition-colors"
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

// View Document Modal Component
const ViewDocumentModal = ({
  document,
  driverName,
  onClose,
  onEdit
}: {
  document: DriverDocument;
  driverName: string;
  onClose: () => void;
  onEdit: (doc: DriverDocument) => void;
  addNotification: (type: NotificationType, message: string) => void;
}) => {
  return (
    <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-card border-b border-theme px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-primary">Document Details</h2>
          <button onClick={onClose} className="text-secondary hover:text-primary transition-colors">
            <XCircle className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-theme">
            <div className="flex items-center gap-3">
              <FileText className="w-10 h-10 text-blue-500" />
              <div>
                <p className="text-lg font-semibold text-primary">{document.documentType}</p>
                <p className="text-sm text-secondary">Driver: {driverName}</p>
              </div>
            </div>
          </div>

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
                  {new Date(document.issueDate).toLocaleDateString()}
                </p>
              </div>
            )}

            {document.expiryDate && (
              <div className="bg-card p-4 rounded-lg">
                <p className="text-sm font-medium text-secondary mb-1">Expiry Date</p>
                <p className="text-lg font-semibold text-primary">
                  {new Date(document.expiryDate).toLocaleDateString()}
                </p>
              </div>
            )}

            {document.fileSize && (
              <div className="bg-card p-4 rounded-lg">
                <p className="text-sm font-medium text-secondary mb-1">File Size</p>
                <p className="text-lg font-semibold text-primary">
                  {(document.fileSize / 1024).toFixed(2)} KB
                </p>
              </div>
            )}
          </div>

          {document.description && (
            <div>
              <p className="text-sm font-medium text-secondary mb-2">Description</p>
              <p className="text-primary bg-card p-4 rounded-lg">{document.description}</p>
            </div>
          )}
        </div>

        <div className="sticky bottom-0 bg-card border-t border-theme px-6 py-4 flex items-center justify-end gap-3">
          <button
            onClick={() => onEdit(document)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2 transition-colors"
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
    <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
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
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DriverDocumentsPage;