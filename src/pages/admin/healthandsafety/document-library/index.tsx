import React, { useState, useEffect } from 'react';
const CUSTOM_COLORS = {
  background: '#EDF8FF',
  primary: '#016ab2',
  dark: '#063f6f',
  light: '#398bc3',
  gradient: 'linear-gradient(90deg, var(--accent-blue) 0%, var(--accent-blue) 40%, rgba(0,209,255,0.15) 100%)',
  gradientVertical: 'linear-gradient(to bottom right, #016ab2, #063f6f)',
};
import {
  FaFolder,
  FaFileAlt,
  FaFilePdf,
  FaFileWord,
  FaFileImage,
  FaDownload,
  FaTrash,
  FaSearch,
  FaFilter,
  FaPlus,
  FaCalendarAlt,
  FaExclamationTriangle,
  FaCheckCircle,
  FaClock,
  FaArchive,
  FaEye,
  FaEdit,
  FaTag,
  FaTimes,
  FaTimesCircle,
  FaInfoCircle,
} from 'react-icons/fa';
import {
  createDocument,
  getDocuments,
  updateDocument,
  deleteDocument,
  getDocumentSignedUrl,
} from '../../../../axios/api/healthSafety';

interface Document {
  _id: string;
  documentNumber: string;
  title: string;
  description?: string;
  category: 'Safety Meeting' | 'Toolbox Talk' | 'Safety Bulletin' | 'Investigation' | 'Policy' | 'Inspection' | 'Training' | 'First Aid' | 'Other';
  documentType: 'pdf' | 'word' | 'image' | 'excel' | 'other';
  fileUrl: string;
  fileName: string;
  fileSize: number; // bytes
  uploadedBy: string;
  uploadedDate: string;
  tags: string[];

  // Retention Management
  retentionPeriod: number; // months
  retentionStartDate: string; // date when retention period starts
  retentionEndDate: string; // calculated: retentionStartDate + retentionPeriod months
  retentionStatus: 'active' | 'expiring-soon' | 'expired' | 'archived';
  autoDelete: boolean; // if true, auto-delete after retention period
  retentionNotes?: string;

  // Compliance
  requiredForAudit: boolean;
  auditCategory?: string;
  relatedIncident?: string;
  relatedHazard?: string;
  relatedInspection?: string;

  // Access Control
  accessLevel: 'public' | 'restricted' | 'confidential';
  allowedRoles?: string[];
}

interface ToastNotification {
  id: number;
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
}

const ToastNotificationComponent = ({ notification, onClose }: { notification: ToastNotification; onClose: (id: number) => void }) => {
  const icons = {
    success: <FaCheckCircle className="text-green-500" size={24} />,
    error: <FaTimesCircle className="text-red-500" size={24} />,
    info: <FaInfoCircle className="text-blue-500" size={24} />,
    warning: <FaExclamationTriangle className="text-yellow-500" size={24} />
  };

  const bgColors = {
    success: 'bg-green-50 border-green-200',
    error: 'bg-card border-red-200',
    info: 'bg-card border-blue-200',
    warning: 'bg-card border-yellow-200'
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      onClose(notification.id);
    }, 5000);
    return () => clearTimeout(timer);
  }, [notification.id, onClose]);

  return (
    <div className={`fixed top-4 right-4 flex items-start gap-3 p-4 rounded-lg border-2 shadow-lg z-[10000] ${bgColors[notification.type]} min-w-[300px] max-w-[500px]`}>
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

const DocumentLibrary: React.FC = () => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterRetention, setFilterRetention] = useState<string>('all');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [notifications, setNotifications] = useState<ToastNotification[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [editingDocument, setEditingDocument] = useState<Document | null>(null);
  const [newDocument, setNewDocument] = useState({
    title: '',
    description: '',
    category: 'Other' as Document['category'],
    documentType: 'pdf' as Document['documentType'],
    retentionPeriod: '24',
    retentionStartDate: new Date().toISOString().split('T')[0],
    autoDelete: false,
    retentionNotes: '',
    requiredForAudit: false,
    auditCategory: '',
    relatedIncident: '',
    relatedHazard: '',
    relatedInspection: '',
    accessLevel: 'public' as Document['accessLevel'],
    tags: [] as string[],
    file: null as File | null,
  });

  // Delete Confirmation State
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<Document | null>(null);

  const addNotification = (type: 'success' | 'error' | 'info' | 'warning', message: string) => {
    const id = Date.now();
    setNotifications(prev => [...prev, { id, type, message }]);
  };

  const removeNotification = (id: number) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const result = await getDocuments({
        search: searchTerm || undefined,
        category: filterCategory !== 'all' ? filterCategory : undefined,
        retentionStatus: filterRetention !== 'all' ? filterRetention : undefined,
      });

      if (result.success) {
        setDocuments(result.data || []);
      } else {
        addNotification('error', result.message || 'Failed to load documents');
      }
    } catch (error: any) {
      addNotification('error', error.message || 'Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDocument = (doc: Document) => {
    setDocumentToDelete(doc);
    setShowDeleteModal(true);
  };

  const confirmDeleteDocument = async () => {
    if (!documentToDelete) return;

    try {
      const result = await deleteDocument(documentToDelete._id);
      if (result.success) {
        addNotification('success', result.message || 'Document deleted successfully');
        setShowDeleteModal(false);
        setDocumentToDelete(null);
        await fetchData();
      } else {
        addNotification('error', result.message || 'Failed to delete document');
      }
    } catch (error: any) {
      addNotification('error', error.message || 'An error occurred');
    }
  };

  useEffect(() => {
    fetchData();
  }, [searchTerm, filterCategory, filterRetention]);



  const getFileIcon = (type: Document['documentType']) => {
    switch (type) {
      case 'pdf':
        return <FaFilePdf className="text-[#A855F7]" size={24} />;
      case 'word':
        return <FaFileWord className="text-[#00D1FF]" size={24} />;
      case 'image':
        return <FaFileImage className="text-green-600" size={24} />;
      default:
        return <FaFileAlt className="text-secondary" size={24} />;
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch =
      doc.documentNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = filterCategory === 'all' || doc.category === filterCategory;
    const matchesRetention = filterRetention === 'all' || doc.retentionStatus === filterRetention;
    return matchesSearch && matchesCategory && matchesRetention;
  });

  const stats = {
    total: documents.length,
    expiringSoon: documents.filter(d => d.retentionStatus === 'expiring-soon').length,
    expired: documents.filter(d => d.retentionStatus === 'expired').length,
    archived: documents.filter(d => d.retentionStatus === 'archived').length,
    totalSize: documents.reduce((sum, d) => sum + d.fileSize, 0),
  };

  return (
    <div className="min-h-screen p-6" style={{ backgroundColor: CUSTOM_COLORS.background }}>
      <div className="w-full mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2" style={{ color: CUSTOM_COLORS.dark }}>
            <FaFolder className="inline mr-3" style={{ color: CUSTOM_COLORS.primary }} />
            Document Library
          </h1>
          <p className="text-lg text-secondary">
            Centralized document storage with retention management and compliance tracking.
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-6">
          <div className="bg-card rounded-xl p-6 shadow-md border-l-4" style={{ borderColor: CUSTOM_COLORS.primary }}>
            <div className="text-3xl font-bold text-primary">{stats.total}</div>
            <div className="text-sm text-secondary mt-1">Total Documents</div>
          </div>
          <div className="bg-card rounded-xl p-6 shadow-md border-l-4 border-yellow-500">
            <div className="text-3xl font-bold text-yellow-700">{stats.expiringSoon}</div>
            <div className="text-sm text-secondary mt-1">Expiring Soon</div>
          </div>
          <div className="bg-card rounded-xl p-6 shadow-md border-l-4 border-red-500">
            <div className="text-3xl font-bold text-red-700">{stats.expired}</div>
            <div className="text-sm text-secondary mt-1">Expired</div>
          </div>
          <div className="bg-card rounded-xl p-6 shadow-md border-l-4 border-gray-500">
            <div className="text-3xl font-bold text-primary">{stats.archived}</div>
            <div className="text-sm text-secondary mt-1">Archived</div>
          </div>
          <div className="bg-card rounded-xl p-6 shadow-md border-l-4 border-blue-500">
            <div className="text-3xl font-bold text-blue-700">{formatFileSize(stats.totalSize)}</div>
            <div className="text-sm text-secondary mt-1">Total Storage</div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-card rounded-xl p-4 shadow-lg mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-secondary" />
              <input
                type="text"
                placeholder="Search documents by title, number, tags..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <FaFilter className="text-secondary" />
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="px-4 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Categories</option>
                <option value="Safety Meeting">Safety Meeting</option>
                <option value="Toolbox Talk">Toolbox Talk</option>
                <option value="Safety Bulletin">Safety Bulletin</option>
                <option value="Investigation">Investigation</option>
                <option value="Policy">Policy</option>
                <option value="Inspection">Inspection</option>
                <option value="Training">Training</option>
                <option value="First Aid">First Aid</option>
                <option value="Other">Other</option>
              </select>
              <select
                value={filterRetention}
                onChange={(e) => setFilterRetention(e.target.value)}
                className="px-4 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Retention Status</option>
                <option value="active">Active</option>
                <option value="expiring-soon">Expiring Soon</option>
                <option value="expired">Expired</option>
                <option value="archived">Archived</option>
              </select>
            </div>
            <button
              onClick={() => setShowUploadModal(true)}
              className="px-6 py-2 !text-white rounded-lg transition flex items-center gap-2 font-semibold"
              style={{ background: CUSTOM_COLORS.gradient }}
            >
              <FaPlus /> Upload Document
            </button>
          </div>
        </div>

        {/* Documents Table */}
        <div className="bg-card rounded-xl shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-card">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-secondary uppercase">Document</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-secondary uppercase">Category</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-secondary uppercase">Uploaded</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-secondary uppercase">Retention</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-secondary uppercase">Status</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-secondary uppercase">Size</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-secondary uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-theme">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-secondary">Loading...</td>
                  </tr>
                ) : filteredDocuments.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-secondary">No documents found</td>
                  </tr>
                ) : (
                  filteredDocuments.map((doc) => (
                    <tr
                      key={doc._id}
                      onClick={() => {
                        setSelectedDocument(doc);
                        setShowDetailModal(true);
                      }}
                      className="hover:bg-[rgba(255,255,255,0.03)] transition cursor-pointer"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {getFileIcon(doc.documentType)}
                          <div>
                            <div className="font-semibold text-primary">{doc.title}</div>
                            <div className="text-xs text-secondary">{doc.documentNumber}</div>
                            {doc.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {doc.tags.slice(0, 2).map((tag, idx) => (
                                  <span key={idx} className="px-2 py-0.5 bg-card text-secondary rounded text-xs">
                                    <FaTag className="inline mr-1" size={8} />
                                    {tag}
                                  </span>
                                ))}
                                {doc.tags.length > 2 && (
                                  <span className="text-xs text-secondary">+{doc.tags.length - 2}</span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-semibold">
                          {doc.category}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-secondary">
                        <div>{new Date(doc.uploadedDate).toLocaleDateString()}</div>
                        <div className="text-xs text-secondary">by {doc.uploadedBy}</div>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <div className="flex items-center gap-2">
                          <FaCalendarAlt className="text-secondary" size={12} />
                          <div>
                            <div className="text-primary">
                              {new Date(doc.retentionEndDate).toLocaleDateString()}
                            </div>
                            <div className="text-xs text-secondary">
                              {doc.retentionPeriod} months
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {doc.retentionStatus === 'active' && (
                          <span className="flex items-center text-green-700">
                            <FaCheckCircle className="mr-1" /> Active
                          </span>
                        )}
                        {doc.retentionStatus === 'expiring-soon' && (
                          <span className="flex items-center text-yellow-700">
                            <FaClock className="mr-1" /> Expiring Soon
                          </span>
                        )}
                        {doc.retentionStatus === 'expired' && (
                          <span className="flex items-center text-red-700">
                            <FaExclamationTriangle className="mr-1" /> Expired
                          </span>
                        )}
                        {doc.retentionStatus === 'archived' && (
                          <span className="flex items-center text-primary">
                            <FaArchive className="mr-1" /> Archived
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-secondary">{formatFileSize(doc.fileSize)}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedDocument(doc);
                              setShowDetailModal(true);
                            }}
                            className="p-2 text-[#00D1FF] hover:bg-blue-50 rounded-lg transition"
                            title="View Details"
                          >
                            <FaEye />
                          </button>
                          <button
                            onClick={async (e) => {
                              e.stopPropagation();
                              try {
                                const result = await getDocumentSignedUrl(doc._id, 'attachment');
                                if (result.success && result.signedUrl) {
                                  window.open(result.signedUrl, '_blank');
                                } else {
                                  addNotification('error', result.message || 'Failed to get download link');
                                }
                              } catch (error: any) {
                                addNotification('error', error.message || 'Failed to download document');
                              }
                            }}
                            className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition" title="Download"
                          >
                            <FaDownload />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteDocument(doc);
                            }}
                            className="p-2 text-[#A855F7] hover:bg-red-50 rounded-lg transition" title="Delete"
                          >
                            <FaTrash />
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

        {/* Info Panel */}
        <div className="mt-6 bg-card border-2 border-blue-200 rounded-xl p-6">
          <h3 className="text-lg font-bold text-blue-900 mb-3 flex items-center gap-2">
            <FaCheckCircle /> Document Retention Management
          </h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>✅ Automatic retention period tracking (24-36 months for federal compliance)</li>
            <li>✅ Expiry warnings 30 days before retention period ends</li>
            <li>✅ Auto-delete option for expired documents (configurable per document)</li>
            <li>✅ Archive option to preserve documents beyond retention period</li>
            <li>✅ Audit-ready document categorization and tagging</li>
            <li>✅ Access control by role and confidentiality level</li>
          </ul>
        </div>
      </div>

      {/* Upload Document Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 flex justify-center items-center z-[10000] p-4 bg-black/40 bg-opacity-50" onClick={() => setShowUploadModal(false)}>
          <div className="bg-card rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-card border-b p-6 flex justify-between items-center">
              <h2 className="text-2xl font-bold">
                {editingDocument ? 'Edit Document' : 'Upload New Document'}
              </h2>
              <button
                onClick={() => {
                  setShowUploadModal(false);
                  setEditingDocument(null);
                  setNewDocument({
                    title: '',
                    description: '',
                    category: 'Other',
                    documentType: 'pdf',
                    retentionPeriod: '24',
                    retentionStartDate: new Date().toISOString().split('T')[0],
                    autoDelete: false,
                    retentionNotes: '',
                    requiredForAudit: false,
                    auditCategory: '',
                    relatedIncident: '',
                    relatedHazard: '',
                    relatedInspection: '',
                    accessLevel: 'public',
                    tags: [],
                    file: null,
                  });
                }}
                className="text-secondary hover:text-primary transition-colors"
              >
                <FaTimes size={24} />
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                try {
                  setSubmitting(true);
                  const formData = new FormData();

                  if (!editingDocument && !newDocument.file) {
                    addNotification('error', 'Please select a file to upload');
                    return;
                  }

                  if (newDocument.file) {
                    formData.append('file', newDocument.file);
                  }

                  formData.append('title', newDocument.title);
                  formData.append('description', newDocument.description || '');
                  formData.append('category', newDocument.category);
                  formData.append('documentType', newDocument.documentType);
                  formData.append('retentionPeriod', newDocument.retentionPeriod);
                  formData.append('retentionStartDate', newDocument.retentionStartDate);
                  formData.append('autoDelete', String(newDocument.autoDelete));
                  formData.append('retentionNotes', newDocument.retentionNotes || '');
                  formData.append('requiredForAudit', String(newDocument.requiredForAudit));
                  formData.append('auditCategory', newDocument.auditCategory || '');
                  formData.append('relatedIncident', newDocument.relatedIncident || '');
                  formData.append('relatedHazard', newDocument.relatedHazard || '');
                  formData.append('relatedInspection', newDocument.relatedInspection || '');
                  formData.append('accessLevel', newDocument.accessLevel);
                  formData.append('tags', JSON.stringify(newDocument.tags));

                  let result;
                  if (editingDocument) {
                    result = await updateDocument(editingDocument._id, formData);
                  } else {
                    result = await createDocument(formData);
                  }

                  if (result.success) {
                    addNotification('success', result.message || (editingDocument ? 'Document updated successfully' : 'Document uploaded successfully'));
                    setShowUploadModal(false);
                    setEditingDocument(null);
                    setNewDocument({
                      title: '',
                      description: '',
                      category: 'Other',
                      documentType: 'pdf',
                      retentionPeriod: '24',
                      retentionStartDate: new Date().toISOString().split('T')[0],
                      autoDelete: false,
                      retentionNotes: '',
                      requiredForAudit: false,
                      auditCategory: '',
                      relatedIncident: '',
                      relatedHazard: '',
                      relatedInspection: '',
                      accessLevel: 'public',
                      tags: [],
                      file: null,
                    });
                    await fetchData();
                  } else {
                    addNotification('error', result.message || 'Failed to save document');
                  }
                } catch (error: any) {
                  addNotification('error', error.message || 'An error occurred');
                } finally {
                  setSubmitting(false);
                }
              }}
              className="p-6 space-y-6"
            >
              <div>
                <label className="block text-sm font-semibold text-primary mb-2">Title *</label>
                <input
                  type="text"
                  required
                  value={newDocument.title}
                  onChange={(e) => setNewDocument({ ...newDocument, title: e.target.value })}
                  className="w-full border-2 border-theme p-3 rounded-xl focus:ring-2 focus:ring-blue-500"
                  placeholder="Document Title"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-primary mb-2">Description</label>
                <textarea
                  rows={3}
                  value={newDocument.description}
                  onChange={(e) => setNewDocument({ ...newDocument, description: e.target.value })}
                  className="w-full border-2 border-theme p-3 rounded-xl focus:ring-2 focus:ring-blue-500"
                  placeholder="Document description..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-primary mb-2">Category *</label>
                  <select
                    required
                    value={newDocument.category}
                    onChange={(e) => setNewDocument({ ...newDocument, category: e.target.value as any })}
                    className="w-full border-2 border-theme p-3 rounded-xl focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Safety Meeting">Safety Meeting</option>
                    <option value="Toolbox Talk">Toolbox Talk</option>
                    <option value="Safety Bulletin">Safety Bulletin</option>
                    <option value="Investigation">Investigation</option>
                    <option value="Policy">Policy</option>
                    <option value="Inspection">Inspection</option>
                    <option value="Training">Training</option>
                    <option value="First Aid">First Aid</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-primary mb-2">Document Type *</label>
                  <select
                    required
                    value={newDocument.documentType}
                    onChange={(e) => setNewDocument({ ...newDocument, documentType: e.target.value as any })}
                    className="w-full border-2 border-theme p-3 rounded-xl focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="pdf">PDF</option>
                    <option value="word">Word</option>
                    <option value="image">Image</option>
                    <option value="excel">Excel</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              {!editingDocument && (
                <div>
                  <label className="block text-sm font-semibold text-primary mb-2">File *</label>
                  <input
                    type="file"
                    required={!editingDocument}
                    onChange={(e) => setNewDocument({ ...newDocument, file: e.target.files?.[0] || null })}
                    className="w-full border-2 border-theme p-3 rounded-xl focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-primary mb-2">Retention Period (months) *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={newDocument.retentionPeriod}
                    onChange={(e) => setNewDocument({ ...newDocument, retentionPeriod: e.target.value })}
                    className="w-full border-2 border-theme p-3 rounded-xl focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-primary mb-2">Retention Start Date *</label>
                  <input
                    type="date"
                    required
                    value={newDocument.retentionStartDate}
                    onChange={(e) => setNewDocument({ ...newDocument, retentionStartDate: e.target.value })}
                    className="w-full border-2 border-theme p-3 rounded-xl focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-primary mb-2">Access Level</label>
                  <select
                    value={newDocument.accessLevel}
                    onChange={(e) => setNewDocument({ ...newDocument, accessLevel: e.target.value as any })}
                    className="w-full border-2 border-theme p-3 rounded-xl focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="public">Public</option>
                    <option value="restricted">Restricted</option>
                    <option value="confidential">Confidential</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-primary mb-2">Audit Category</label>
                  <input
                    type="text"
                    value={newDocument.auditCategory}
                    onChange={(e) => setNewDocument({ ...newDocument, auditCategory: e.target.value })}
                    className="w-full border-2 border-theme p-3 rounded-xl focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Safety Committee"
                  />
                </div>
              </div>

              <div className="flex gap-6">
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newDocument.autoDelete}
                    onChange={(e) => setNewDocument({ ...newDocument, autoDelete: e.target.checked })}
                    className="w-5 h-5 text-[#00D1FF] focus:ring-blue-500 rounded"
                  />
                  <span className="font-medium text-primary">Auto Delete After Retention</span>
                </label>
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newDocument.requiredForAudit}
                    onChange={(e) => setNewDocument({ ...newDocument, requiredForAudit: e.target.checked })}
                    className="w-5 h-5 text-[#00D1FF] focus:ring-blue-500 rounded"
                  />
                  <span className="font-medium text-primary">Required for Audit</span>
                </label>
              </div>

              <div>
                <label className="block text-sm font-semibold text-primary mb-2">Tags (comma-separated)</label>
                <input
                  type="text"
                  value={newDocument.tags.join(', ')}
                  onChange={(e) => {
                    const tags = e.target.value.split(',').map(t => t.trim()).filter(t => t);
                    setNewDocument({ ...newDocument, tags });
                  }}
                  className="w-full border-2 border-theme p-3 rounded-xl focus:ring-2 focus:ring-blue-500"
                  placeholder="tag1, tag2, tag3"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t-2 border-theme">
                <button
                  type="button"
                  onClick={() => {
                    setShowUploadModal(false);
                    setEditingDocument(null);
                  }}
                  className="px-4 py-2 bg-gray-200 text-primary rounded-xl font-semibold hover:bg-gray-300"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 !text-white rounded-xl font-semibold hover:opacity-90 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ background: CUSTOM_COLORS.gradient }}
                >
                  {submitting ? 'Saving...' : (editingDocument ? 'Update Document' : 'Upload Document')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Document Detail Modal */}
      {showDetailModal && selectedDocument && (
        <div className="fixed inset-0 flex justify-center items-center z-[10000] p-4 bg-black/40 bg-opacity-50" onClick={() => setShowDetailModal(false)}>
          <div className="bg-card rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-card border-b p-6 flex justify-between items-center">
              <h2 className="text-2xl font-bold">Document Details</h2>
              <button
                onClick={() => setShowDetailModal(false)}
                className="text-secondary hover:text-primary transition-colors"
              >
                <FaTimes size={24} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <h3 className="font-bold text-primary text-lg">{selectedDocument.title}</h3>
                <p className="text-sm text-secondary">{selectedDocument.documentNumber}</p>
              </div>

              {selectedDocument.description && (
                <div>
                  <h4 className="font-semibold text-primary mb-1">Description</h4>
                  <p className="text-secondary">{selectedDocument.description}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold text-primary mb-1">Category</h4>
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm">{selectedDocument.category}</span>
                </div>
                <div>
                  <h4 className="font-semibold text-primary mb-1">Type</h4>
                  <span className="text-secondary">{selectedDocument.documentType.toUpperCase()}</span>
                </div>
                <div>
                  <h4 className="font-semibold text-primary mb-1">Uploaded</h4>
                  <p className="text-secondary">{new Date(selectedDocument.uploadedDate).toLocaleDateString()}</p>
                  <p className="text-xs text-secondary">by {selectedDocument.uploadedBy}</p>
                </div>
                <div>
                  <h4 className="font-semibold text-primary mb-1">File Size</h4>
                  <p className="text-secondary">{formatFileSize(selectedDocument.fileSize)}</p>
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-primary mb-1">Retention</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-secondary">Period:</span> <span className="text-primary">{selectedDocument.retentionPeriod} months</span>
                  </div>
                  <div>
                    <span className="text-secondary">End Date:</span> <span className="text-primary">{new Date(selectedDocument.retentionEndDate).toLocaleDateString()}</span>
                  </div>
                  <div>
                    <span className="text-secondary">Status:</span>
                    <span className={`ml-2 ${selectedDocument.retentionStatus === 'active' ? 'text-green-700' :
                      selectedDocument.retentionStatus === 'expiring-soon' ? 'text-yellow-700' :
                        selectedDocument.retentionStatus === 'expired' ? 'text-red-700' : 'text-primary'
                      }`}>
                      {selectedDocument.retentionStatus}
                    </span>
                  </div>
                </div>
              </div>

              {selectedDocument.tags && selectedDocument.tags.length > 0 && (
                <div>
                  <h4 className="font-semibold text-primary mb-2">Tags</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedDocument.tags.map((tag, idx) => (
                      <span key={idx} className="px-2 py-1 bg-card text-secondary rounded text-sm">
                        <FaTag className="inline mr-1" size={10} />
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-4 border-t">
                <button
                  onClick={async () => {
                    try {
                      const result = await getDocumentSignedUrl(selectedDocument._id, 'attachment');
                      if (result.success && result.signedUrl) {
                        window.open(result.signedUrl, '_blank');
                      } else {
                        addNotification('error', result.message || 'Failed to get download link');
                      }
                    } catch (error: any) {
                      addNotification('error', error.message || 'Failed to download document');
                    }
                  }}
                  className="px-4 py-2 !text-white rounded-lg hover:opacity-90 flex items-center gap-2"
                  style={{ backgroundColor: CUSTOM_COLORS.light }}
                >
                  <FaDownload /> Download
                </button>
                <button
                  onClick={() => {
                    setEditingDocument(selectedDocument);
                    setNewDocument({
                      title: selectedDocument.title,
                      description: selectedDocument.description || '',
                      category: selectedDocument.category,
                      documentType: selectedDocument.documentType,
                      retentionPeriod: String(selectedDocument.retentionPeriod),
                      retentionStartDate: selectedDocument.retentionStartDate,
                      autoDelete: selectedDocument.autoDelete,
                      retentionNotes: selectedDocument.retentionNotes || '',
                      requiredForAudit: selectedDocument.requiredForAudit,
                      auditCategory: selectedDocument.auditCategory || '',
                      relatedIncident: selectedDocument.relatedIncident || '',
                      relatedHazard: selectedDocument.relatedHazard || '',
                      relatedInspection: selectedDocument.relatedInspection || '',
                      accessLevel: selectedDocument.accessLevel,
                      tags: selectedDocument.tags || [],
                      file: null,
                    });
                    setShowDetailModal(false);
                    setShowUploadModal(true);
                  }}
                  className="px-4 py-2 bg-gray-600 !text-white rounded-lg hover:bg-gray-700 flex items-center gap-2"
                >
                  <FaEdit /> Edit
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notifications */}
      <div className="fixed top-4 right-4 z-[10001] space-y-2">
        {notifications.map((notification) => (
          <ToastNotificationComponent
            key={notification.id}
            notification={notification}
            onClose={removeNotification}
          />
        ))}
      </div>
      {/* Delete Confirmation Modal */}
      {showDeleteModal && documentToDelete && (
        <div className="fixed inset-0 flex justify-center items-center z-[11000] p-4 bg-black/50 backdrop-blur-sm" onClick={() => setShowDeleteModal(false)}>
          <div className="bg-card rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FaExclamationTriangle className="text-red-500 text-3xl" />
              </div>
              <h2 className="text-2xl font-bold text-primary mb-2">Delete Document?</h2>
              <p className="text-secondary">
                Are you sure you want to delete <span className="font-semibold text-primary">"{documentToDelete.title}"</span>?
                This action cannot be undone.
              </p>
            </div>
            <div className="flex gap-4">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 px-4 py-3 bg-card text-primary rounded-xl font-semibold hover:bg-gray-200 transition"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteDocument}
                className="flex-1 px-4 py-3 bg-red-600 !text-white rounded-xl font-semibold hover:bg-red-700 transition shadow-lg shadow-red-200"
              >
                Delete Document
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentLibrary;

