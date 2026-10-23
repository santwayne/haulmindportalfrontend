import React, { useState, useEffect, useMemo } from 'react';
import { listCompanyDocuments, uploadCompanyDocument, deleteCompanyDocument, getSignedDocumentUrl, listCompanyDocumentCategories, createCompanyDocumentCategory, updateCompanyDocumentCategory, deleteCompanyDocumentCategory, type CompanyDocumentCategoryDto } from '../../../../axios/api/companyDocuments';
import { message, notification } from 'antd';
import {
  FolderOpen,
  FileText,
  Upload,
  Search,
  Filter,
  Download,
  Eye,
  Edit,
  Trash2,
  File,
  Image,
  Calendar,
  User,
  AlertCircle,
  CheckCircle,
  XCircle,
  Plus,
  Folder,
  Sheet,
  X
} from 'lucide-react';
import { FaTimes, FaCheckCircle, FaExclamationTriangle } from 'react-icons/fa';
import {  getFocusStyles } from '../../fleetMaintenance/colorUtils';

interface Document {
  _id: string;
  name: string;
  category: string;
  type: string;
  size: number;
  uploadedBy: string;
  uploadDate: string;
  url: string;
  description?: string;
}

interface ToastNotification {
  id: number;
  type: 'success' | 'error' | 'warning';
  message: string;
}

const ToastNotificationComponent = ({ notification, onClose }: { notification: ToastNotification; onClose: (id: number) => void }) => {
  const icons = {
    success: <FaCheckCircle className="text-[var(--accent-green)]" size={24} />,
    error: <FaExclamationTriangle className="text-[var(--accent-red)]" size={24} />,
    warning: <FaExclamationTriangle className="text-[var(--accent-amber)]" size={24} />
  };

  const bgColors = {
    success: 'bg-[var(--accent-green)]/10 border-[var(--accent-green)]/30',
    error: 'bg-[var(--accent-red)]/10 border-[var(--accent-red)]/30',
    warning: 'bg-[var(--accent-amber)]/10 border-[var(--accent-amber)]/30'
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      onClose(notification.id);
    }, 5000);
    return () => clearTimeout(timer);
  }, [notification.id, onClose]);

  return (
    <div className={`fixed top-4 right-4 flex items-start gap-3 p-4 rounded-lg border-2 shadow-lg z-[10003] ${bgColors[notification.type]} min-w-[300px] max-w-[500px] animate-slide-in`}>
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

const DocumentManagement: React.FC = () => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [uploadDialog, setUploadDialog] = useState(false);
  const [categories, setCategories] = useState<CompanyDocumentCategoryDto[]>([]);
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [showCreateCategory, setShowCreateCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editCategory, setEditCategory] = useState<{ id: string; name: string } | null>(null);
  const [editCategoryName, setEditCategoryName] = useState('');
  const [savingCategory, setSavingCategory] = useState(false);
  const [confirmDeleteCategory, setConfirmDeleteCategory] = useState<{ id: string; name: string } | null>(null);
  const [deletingCategory, setDeletingCategory] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadForm, setUploadForm] = useState({
    name: '',
    category: '',
    description: ''
  });
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewDoc, setViewDoc] = useState<Document | null>(null);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loadingSignedUrl, setLoadingSignedUrl] = useState(false);
  const [forceDirectView, setForceDirectView] = useState(false);
  const [viewMode, setViewMode] = useState<'iframe' | 'newtab' | null>(null);
  const [viewerError, setViewerError] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<{ open: boolean; id: string | null; name?: string }>({ open: false, id: null });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [requiresCompanySetup, setRequiresCompanySetup] = useState(false);
  const [uploadModalError, setUploadModalError] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<ToastNotification[]>([]);
  const focusHandlers = getFocusStyles();
  const primaryButtonStyle: React.CSSProperties = {
    background: `linear-gradient(
      90deg,
      var(--accent-blue) 0%,
      var(--accent-blue) 40%,
      rgba(0,209,255,0.15) 100%
    )`,
    color: "#fff",
    boxShadow: `0 12px 24px rgba(17, 131, 224, 0.25)`,
  };

  const getExtension = (doc: Document) => {
    if (doc.type) return doc.type.toLowerCase();
    try {
      const url = new URL(doc.url);
      const ext = url.pathname.split('.').pop() || '';
      return ext.toLowerCase();
    } catch {
      return '';
    }
  };

  const isPubliclyAccessible = (url: string): boolean => {
    try {
      const urlObj = new URL(url);
      // Check if it's a public URL (not localhost, 127.0.0.1, or private IP)
      const hostname = urlObj.hostname.toLowerCase();
      return !hostname.includes('localhost') &&
        !hostname.includes('127.0.0.1') &&
        !hostname.startsWith('192.168.') &&
        !hostname.startsWith('10.') &&
        !hostname.startsWith('172.');
    } catch {
      return false;
    }
  };

  const getViewerUrl = (doc: Document) => {
    const ext = getExtension(doc);
    const encoded = encodeURIComponent(doc.url);
    const isPublic = isPubliclyAccessible(doc.url);

    // Office formats via Microsoft viewer - try even for private URLs (might work)
    const officeExts = ['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'];
    if (officeExts.includes(ext)) {
      // Microsoft Office Online viewer - works best with public URLs but we'll try anyway
      return `https://view.officeapps.live.com/op/embed.aspx?src=${encoded}`;
    }

    // For other file types, only use external viewers if URL is publicly accessible
    if (!isPublic) {
      return null; // Will trigger download/open instead
    }

    // Fallback to Google viewer for other common docs (txt, csv, etc.)
    return `https://docs.google.com/gview?url=${encoded}&embedded=true`;
  };

  const categoryIconMap = useMemo(() => ({
    all: FolderOpen,
    hr: FileText,
    offer: File,
    safety: AlertCircle,
    hiring: User,
    legal: FileText,
    other: Folder,
  }), []);

  const showNotification = (type: 'success' | 'error' | 'warning', message: string) => {
    const id = Date.now();
    setNotifications(prev => [...prev, { id, type, message }]);
  };

  const closeNotification = (id: number) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const fetchCategories = async () => {
    try {
      const res = await listCompanyDocumentCategories();
      if (res?.success && Array.isArray(res.data)) {
        setCategories(res.data);
      }
    } catch {
      // ignore
    }
  };

  const fetchDocuments = async () => {
    setLoading(true);
    setErrorMessage(null);
    setRequiresCompanySetup(false);
    try {
      const res = await listCompanyDocuments({
        category: selectedCategory,
        search: searchQuery,
      });
      if (res?.success) {
        setDocuments(res.data || []);
        setRequiresCompanySetup(res?.requiresCompanySetup || false);
        if (res?.requiresCompanySetup && res?.message) {
          setErrorMessage(res.message);
        }
      } else {
        setDocuments([]);
        // Handle error response
        if (res?.message) {
          setErrorMessage(res.message);
          if (res.message.includes('company settings') || res.message.includes('Company Settings')) {
            setRequiresCompanySetup(true);
          }
        }
      }
    } catch (e: any) {
      setDocuments([]);
      const errorMsg = e?.response?.data?.message || e?.message || 'Failed to fetch documents';
      setErrorMessage(errorMsg);
      if (errorMsg.includes('company settings') || errorMsg.includes('Company Settings')) {
        setRequiresCompanySetup(true);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
    fetchDocuments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCategory]);

  // Ensure upload form category is valid if categories change
  useEffect(() => {
    if (categories.length === 0) return;
    const selectable = categories.filter(c => c.key !== 'all');
    if (selectable.length === 0) return;
    const valid = selectable.some(c => c.key === uploadForm.category);
    if (!valid) {
      const first = selectable[0].key;
      setUploadForm(prev => ({ ...prev, category: first }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categories]);

  const handleCreateCategory = async () => {
    const name = newCategoryName.trim();
    if (!name) {
      showNotification('error', 'Category name is required');
      return;
    }
    setCreatingCategory(true);
    try {
      const res = await createCompanyDocumentCategory(name);
      if (res?.success) {
        showNotification('success', 'Category created successfully');
        const createdKey = res?.data?.key;
        setNewCategoryName('');
        setShowCreateCategory(false);
        await fetchCategories();
        if (createdKey) {
          setSelectedCategory(createdKey);
          setUploadForm(prev => ({ ...prev, category: createdKey }));
        }
      } else {
        // Show toast notification for errors like "Category already exists"
        showNotification('error', res?.message || 'Failed to create category');
      }
    } finally {
      setCreatingCategory(false);
    }
  };

  const openEditCategory = (c: CompanyDocumentCategoryDto) => {
    if (!c.id || c.key === 'all') return;
    setEditCategory({ id: c.id, name: c.name });
    setEditCategoryName(c.name);
  };

  const handleSaveCategory = async () => {
    if (!editCategory) return;
    const name = editCategoryName.trim();
    if (!name) {
      message.error('Category name is required');
      return;
    }
    setSavingCategory(true);
    try {
      const res = await updateCompanyDocumentCategory(editCategory.id, name);
      if (res?.success) {
        message.success('Category updated');
        setEditCategory(null);
        setEditCategoryName('');
        await fetchCategories();
      } else {
        message.error(res?.message || 'Failed to update category');
      }
    } finally {
      setSavingCategory(false);
    }
  };

  const handleDeleteCategory = async () => {
    if (!confirmDeleteCategory) return;
    setDeletingCategory(true);
    try {
      const res = await deleteCompanyDocumentCategory(confirmDeleteCategory.id);
      if (res?.success) {
        message.success('Category deleted');
        // If current filter is deleted category, reset to all
        if (selectedCategory === confirmDeleteCategory.id) {
          setSelectedCategory('all');
        }
        setConfirmDeleteCategory(null);
        await fetchCategories();
        await fetchDocuments();
      } else {
        message.error(res?.message || 'Failed to delete category');
      }
    } finally {
      setDeletingCategory(false);
    }
  };

  const handleView = async (doc: Document) => {
    const isS3Url = doc.url && (doc.url.includes('s3.amazonaws.com') || doc.url.includes('.s3.'));

    // Show modal for all file types
    setViewDoc(doc);
    setForceDirectView(false); // Reset force direct view when opening new document
    setViewMode(null); // Reset view mode
    setViewerError(false); // Reset viewer error
    setSignedUrl(null); // Reset signed URL
    setShowViewModal(true);

    // Check if URL is S3 and fetch signed URL
    if (isS3Url) {
      setLoadingSignedUrl(true);
      try {
        const res = await getSignedDocumentUrl(doc._id);
        if (res?.success && res?.url) {
          setSignedUrl(res.url);
        } else {
          // If signed URL fails, use original URL (will show error but user can try)
          setSignedUrl(doc.url);
        }
      } catch (error) {
        console.error('Error fetching signed URL:', error);
        setSignedUrl(doc.url); // Fallback to original URL
      } finally {
        setLoadingSignedUrl(false);
      }
    } else {
      // Not S3, use original URL
      setSignedUrl(doc.url);
    }
  };

  const handleDownload = async (doc: Document) => {
    try {
      let downloadUrl = doc.url;

      // Check if URL is S3 and fetch signed URL for download with 'attachment' disposition
      const isS3Url = doc.url && (doc.url.includes('s3.amazonaws.com') || doc.url.includes('.s3.'));
      if (isS3Url) {
        try {
          const res = await getSignedDocumentUrl(doc._id, 'attachment');
          if (res?.success && res?.url) {
            downloadUrl = res.url;
          } else {
            message.error('Failed to generate download link. Please try again.');
            return;
          }
        } catch (error) {
          console.error('Error fetching signed URL for download:', error);
          message.error('Failed to generate download link. Please try again.');
          return;
        }
      }

      // Create download link with signed URL
      if (downloadUrl) {
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = doc.name || 'document';
        a.target = '_blank';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
    } catch (e) {
      console.error('Download failed', e);
      message.error('Download failed. Please try again.');
    }
  };

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || doc.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const getFileIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'pdf': return <FileText className="text-[var(--accent-purple)]" size={24} />;
      case 'doc':
      case 'docx': return <FileText className="text-[#1183e0]" size={24} />;
      case 'xls':
      case 'xlsx': return <Sheet className="text-[var(--accent-green)]" size={24} />;
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif': return <Image className="text-[var(--accent-purple)]" size={24} />;
      default: return <File className="text-secondary" size={24} />;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  const handleFileUpload = async () => {
    if (!selectedFile) {
      setUploadModalError('Please select a file to upload');
      message.warning('Please select a file to upload');
      return;
    }

    if (!uploadForm.category) {
      setUploadModalError('Please select or create a category first');
      message.warning('Please select or create a category first');
      return;
    }

    // Clear any previous errors
    setUploadModalError(null);
    setUploading(true);

    try {
      const res = await uploadCompanyDocument({
        name: uploadForm.name || selectedFile.name,
        category: uploadForm.category,
        description: uploadForm.description,
        file: selectedFile,
      });

      if (res?.success) {
        setUploadModalError(null); // Clear error on success
        message.success(res?.message || 'Document uploaded successfully');
        await fetchDocuments();
        await fetchCategories();
        setUploadDialog(false);
        setSelectedFile(null);
        setUploadForm({ name: '', category: '', description: '' });
      } else {
        // Handle error response
        const errorMsg = res?.message || 'Failed to upload document';
        setUploadModalError(errorMsg);
        notification.error({
          message: 'Upload Failed',
          description: errorMsg,
          duration: 6,
          placement: 'topRight',
        });
        // If it's a company settings error, also show in main area
        if (errorMsg.includes('company settings') || errorMsg.includes('Company Settings')) {
          setErrorMessage(errorMsg);
          setRequiresCompanySetup(true);
        }
      }
    } catch (error: any) {
      console.error('Error uploading file:', error);
      const errorMsg = error?.response?.data?.message || error?.message || 'Failed to upload file. Please try again.';
      setUploadModalError(errorMsg);
      notification.error({
        message: 'Upload Error',
        description: errorMsg,
        duration: 6,
        placement: 'topRight',
      });
      // If it's a company settings error, also show in main area
      if (errorMsg.includes('company settings') || errorMsg.includes('Company Settings')) {
        setErrorMessage(errorMsg);
        setRequiresCompanySetup(true);
      }
    } finally {
      setUploading(false);
    }
  };

  const handleAskDelete = (doc: Document) => {
    setConfirmDelete({ open: true, id: doc._id, name: doc.name });
  };

  const handleConfirmDelete = async () => {
    if (!confirmDelete.id) return;
    try {
      const res = await deleteCompanyDocument(confirmDelete.id);
      if (res?.success) {
        message.success(res?.message || 'Document deleted successfully');
        setConfirmDelete({ open: false, id: null });
        await fetchDocuments();
        await fetchCategories();
      } else {
        const errorMsg = res?.message || 'Failed to delete document';
        notification.error({
          message: 'Delete Failed',
          description: errorMsg,
          duration: 6,
          placement: 'topRight',
        });
      }
    } catch (e: any) {
      const errorMsg = e?.response?.data?.message || e?.message || 'Failed to delete document';
      notification.error({
        message: 'Delete Error',
        description: errorMsg,
        duration: 6,
        placement: 'topRight',
      });
    }
  };

  return (
    <div
      className="min-h-screen bg-main  p-5 space-y-5 overflow-hidden"
    >
      {/* Toast Notifications */}
      {notifications.map(notification => (
        <ToastNotificationComponent
          key={notification.id}
          notification={notification}
          onClose={closeNotification}
        />
      ))}

      {/* Create Category Modal */}
      {showCreateCategory && (
        <div className="fixed inset-0 z-[10002] bg-card/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-md rounded-xl shadow-2xl border border-theme overflow-hidden">
            <div className="px-5 py-4 border-b border-theme flex items-center justify-between">
              <h3 className="text-base font-bold text-primary">Create Category</h3>
              <button
                type="button"
                onClick={() => {
                  setShowCreateCategory(false);
                  setNewCategoryName('');
                }}
                className="p-2 hover:bg-[rgba(255,255,255,0.05)] rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-secondary" />
              </button>
            </div>
            <div className="p-5 space-y-3">
              <label className="block text-sm font-semibold text-primary">Category name</label>
              <input
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="e.g. Insurance, Maintenance, Training"
                className="w-full px-4 py-2 bg-[#0B1220] border border-[rgba(17,131,224,0.2)] text-[#E6EDF3] placeholder-[#8B9BB4] rounded-lg focus:outline-none focus:border-[#1183e0] focus:ring-1 focus:ring-[rgba(17,131,224,0.3)] transition-colors"
              />
              <div className="flex gap-3 !pt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateCategory(false);
                    setNewCategoryName('');
                  }}
                  className="flex-1 px-4 py-2 border border-[rgba(255,255,255,0.08)] text-[#8B9BB4] rounded-lg hover:bg-[rgba(255,255,255,0.05)] transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCreateCategory}
                  disabled={creatingCategory}
                  className="flex-1 px-4 py-2 rounded-lg bg-[var(--accent-navyblue)] hover:bg-[var(--accent-navyblue)]/80 transition-all font-medium flex items-center justify-center gap-2 disabled:opacity-50"
                  
                >
                  {creatingCategory ? 'Creating...' : 'Create'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Category Modal */}
      {editCategory && (
        <div className="fixed inset-0 z-[10002] bg-card/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-md rounded-xl shadow-2xl border border-theme overflow-hidden">
            <div className="px-5 py-4 border-b border-theme flex items-center justify-between">
              <h3 className="text-base font-bold text-primary">Edit Category</h3>
              <button
                type="button"
                onClick={() => {
                  setEditCategory(null);
                  setEditCategoryName('');
                }}
                className="p-2 hover:bg-[rgba(255,255,255,0.05)] rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-secondary" />
              </button>
            </div>
            <div className="p-5 space-y-3">
              <label className="block text-sm font-semibold text-primary">Category name</label>
              <input
                value={editCategoryName}
                onChange={(e) => setEditCategoryName(e.target.value)}
                className="w-full px-4 py-2 bg-[#0B1220] border border-[rgba(17,131,224,0.2)] text-[#E6EDF3] rounded-lg focus:outline-none focus:border-[#1183e0] focus:ring-1 focus:ring-[rgba(17,131,224,0.3)] transition-colors"
              />
              <div className="flex gap-3 !pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setEditCategory(null);
                    setEditCategoryName('');
                  }}
                  className="flex-1 px-4 py-2 border border-[rgba(255,255,255,0.08)] text-[#8B9BB4] rounded-lg hover:bg-[rgba(255,255,255,0.05)] transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveCategory}
                  disabled={savingCategory}
                  className="flex-1 px-4 py-2 bg-[var(--accent-navyblue)] hover:bg-[var(--accent-navyblue)]/80 rounded-lg transition-all font-medium flex items-center justify-center gap-2 disabled:opacity-50"
                 
                >
                  {savingCategory ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Category Modal */}
      {confirmDeleteCategory && (
        <div className="fixed inset-0 z-[10002] bg-card/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-md rounded-xl shadow-2xl border border-theme overflow-hidden">
            <div className="px-5 py-4 border-b border-theme flex items-center justify-between">
              <h3 className="text-base font-bold text-primary">Delete Category</h3>
              <button
                type="button"
                onClick={() => setConfirmDeleteCategory(null)}
                className="p-2 hover:bg-[rgba(255,255,255,0.05)] rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-secondary" />
              </button>
            </div>
            <div className="p-5 space-y-3">
              <p className="text-sm text-primary">
                Are you sure you want to delete <span className="font-semibold">{confirmDeleteCategory.name}</span>?
              </p>
              <p className="text-xs text-secondary">
                Note: You can only delete a category if it has no documents.
              </p>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setConfirmDeleteCategory(null)}
                  className="flex-1 px-4 py-2 border border-[rgba(255,255,255,0.08)] text-[#8B9BB4] rounded-lg hover:bg-[rgba(255,255,255,0.05)] transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteCategory}
                  disabled={deletingCategory}
                  className="flex-1 px-4 py-2 rounded-lg transition-all font-medium flex items-center justify-center gap-2 disabled:opacity-50 bg-rose-500/80 border border-rose-500/30 hover:bg-rose-500 !text-white"
                >
                  {deletingCategory ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="w-full mx-auto">
        {/* Header */}
        <div
          className="bg-card rounded-2xl shadow-md border p-5 mb-6"
          style={{
            borderColor: 'rgba(17, 131, 224, 0.2)',
            boxShadow: `0 4px 20px rgba(17, 131, 224, 0.1)`
          }}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold mb-1.5" style={{ color: '#1183e0' }}>Company Documents</h1>
              <p className="text-xs text-secondary">Manage and organize your company documents in one place</p>
            </div>
            <button
              onClick={() => {
                setErrorMessage(null);
                setUploadModalError(null); // Clear modal error when opening
                setUploadDialog(true);
              }}
              className="px-4 py-2 rounded-lg bg-[var(--accent-navyblue)] hover:bg-[var(--accent-navyblue)]/80 transition-all duration-200 font-medium flex items-center gap-2 hover:shadow-md hover:scale-105"
              
            >
              <Plus size={17} />
              Upload Document
            </button>
          </div>
        </div>

        {/* Error Message Display */}
        {errorMessage && (
          <div className="mb-5 p-3.5 bg-card border-l-4 border-red-500 rounded-r-lg">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <AlertCircle className="h-5 w-5 text-red-400" />
              </div>
              <div className="ml-3 flex-1">
                <h3 className="text-xs font-medium text-red-800">Error</h3>
                <p className="mt-1 text-xs text-red-700">{errorMessage}</p>
                {requiresCompanySetup && (
                  <p className="mt-2 text-xs text-[var(--accent-purple)]">
                    Please go to <strong>Company Settings</strong> to complete your company setup.
                  </p>
                )}
              </div>
              <div className="ml-auto pl-3">
                <button
                  type="button"
                  onClick={() => setErrorMessage(null)}
                  className="inline-flex text-red-400 hover:text-[#1183e0] focus:outline-none transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
          {/* Sidebar - Categories */}
          <div className="lg:col-span-1">
            <div
              className="bg-card rounded-2xl shadow-sm border sticky top-6"
              style={{ borderColor: 'rgba(17, 131, 224, 0.2)' }}
            >
              <div className="p-4 border-b border-theme">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-semibold text-sm" style={{ color: '#1183e0' }}>Categories</h3>
                  <button
                    type="button"
                    onClick={() => setShowCreateCategory(true)}
                    className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-semibold border hover:bg-[rgba(255,255,255,0.03)]"
                    style={{ borderColor: 'rgba(17, 131, 224, 0.25)', color: '#1183e0' }}
                    title="Create category"
                  >
                    <Plus size={14} />
                    Create
                  </button>
                </div>
              </div>
              <div className="p-3 space-y-1.5">
                {categories.map((category) => {
                  const Icon = (categoryIconMap as any)[category.key] || Folder;
                  const isActive = selectedCategory === category.key;
                  return (
                    <button
                      key={category.key}
                      onClick={() => setSelectedCategory(category.key)}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 text-xs font-medium ${isActive
                        ? 'bg-[#182235] border border-[rgba(17,131,224,0.3)] text-[#1183e0]'
                        : 'text-[#8B9BB4] hover:bg-[rgba(255,255,255,0.04)] hover:text-[#E6EDF3]'
                        }`}
                    >
                      <Icon size={17} />
                      <span className="flex-1 text-left">{category.name}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${isActive ? 'bg-[#1183e0]/20 text-[#1183e0]' : 'bg-[rgba(255,255,255,0.08)] text-[#8B9BB4]'}`}>
                        {category.count}
                      </span>
                      {category.key !== "all" && category.id && (
                        <span className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); openEditCategory(category); }}
                            className="p-1 rounded hover:bg-[rgba(17,131,224,0.12)] hover:text-[#1183e0] transition-colors"
                            title="Edit category"
                          >
                            <Edit size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setConfirmDeleteCategory({ id: category.id!, name: category.name }); }}
                            className="p-1 rounded hover:bg-rose-500/10 hover:text-rose-400 transition-colors"
                            title="Delete category"
                          >
                            <Trash2 size={14} />
                          </button>
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {/* Search and Filter */}
            <div
              className="bg-card rounded-2xl shadow-sm border p-4 mb-5"
              style={{ borderColor: 'rgba(17, 131, 224, 0.2)' }}
            >
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary" size={18} />
                  <input
                    type="text"
                    placeholder="Search documents by name or description..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 rounded-lg focus:outline-none bg-[#0B1220] border border-[rgba(17,131,224,0.2)] text-[#E6EDF3] placeholder-[#8B9BB4] focus:border-[#1183e0] focus:ring-1 focus:ring-[rgba(17,131,224,0.3)] text-sm transition-all"
                    {...focusHandlers}
                  />
                </div>
                <button
                  className="px-4 py-2 border rounded-lg transition-all duration-200 font-medium flex items-center gap-2 text-sm hover:shadow-sm"
                  style={{ borderColor: 'rgba(17, 131, 224, 0.25)', color: '#1183e0' }}
                >
                  <Filter size={17} />
                  Filter
                </button>
              </div>
            </div>

            {/* Documents Grid */}
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1183e0]"></div>
              </div>
            ) : errorMessage && requiresCompanySetup ? (
              <div className="bg-card rounded-xl shadow-sm border border-theme p-12 text-center">
                <AlertCircle size={60} className="mx-auto text-red-300 mb-4" />
                <h3 className="text-base font-semibold text-primary mb-2">Company Settings Required</h3>
                <p className="text-sm text-secondary mb-4">{errorMessage}</p>
                <button
                  onClick={() => window.location.href = '/admin/company'}
                  className="px-4 py-2 rounded-lg transition-all duration-200 font-medium text-sm hover:shadow-lg"
                  style={primaryButtonStyle}
                >
                  Go to Company Settings
                </button>
              </div>
            ) : filteredDocuments.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {filteredDocuments.map((doc) => (
                  <div
                    key={doc._id}
                    className="bg-card rounded-xl shadow-sm border border-theme hover:shadow-md hover:border-[#1183e0]/40 transition-all duration-200 p-4 cursor-pointer group"
                    onClick={(e) => {
                      // Only open modal if clicking on the card itself, not on buttons
                      if ((e.target as HTMLElement).closest('button')) {
                        return;
                      }
                      handleView(doc);
                    }}
                  >
                    <div className="flex items-start gap-3 mb-3">
                      <div className="p-2 bg-card rounded-lg flex-shrink-0 group-hover:bg-[#1183e0]/10 transition-colors">
                        {getFileIcon(doc.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-sm text-primary truncate group-hover:text-[#1183e0] transition-colors">{doc.name}</h4>
                        <p className="text-xs text-secondary mt-1">
                          {formatFileSize(doc.size)} • {doc.type.toUpperCase()}
                        </p>
                      </div>
                    </div>

                    {doc.description && (
                      <p className="text-xs text-secondary mb-3 line-clamp-2">{doc.description}</p>
                    )}

                    <div className="flex items-center gap-2 text-xs text-secondary mb-3">
                      <User size={14} />
                      <span>{doc.uploadedBy}</span>
                      <span>•</span>
                      <Calendar size={14} />
                      <span>{new Date(doc.uploadDate).toLocaleDateString()}</span>
                    </div>

                    <div
                      className="flex items-center justify-between pt-3 border-t border-theme"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {/* LEFT — Open Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleView(doc);
                        }}
                        className="px-6 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1 
               transition-all duration-200 hover:shadow-md bg-[var(--accent-navyblue)] hover:bg-[var(--accent-navyblue)]/80"
                      
                      >
                        <Eye size={15} />
                        Open
                      </button>

                      {/* RIGHT — Download + Delete */}
                      <div className="flex items-center gap-2">
                        {/* Download Button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDownload(doc);
                          }}
                          className="px-3 py-1.5 rounded-lg transition-all duration-200 flex items-center justify-center 
                 hover:bg-[rgba(255,255,255,0.03)]"
                          style={{
                            border: `1px solid rgba(17, 131, 224, 0.25)`,
                            color: '#1183e0',
                            background: "rgba(17, 131, 224, 0.08)",
                          }}
                          title="Download"
                        >
                          <Download size={15} />
                        </button>

                        {/* Delete Button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAskDelete(doc);
                          }}
                          className="px-3 py-1.5 rounded-lg transition-all duration-200 flex items-center justify-center 
                 hover:bg-[rgba(255,77,77,0.1)]"
                          style={{
                            background: "rgba(239,68,68,0.12)",
                            color: "var(--accent-red)"
                          }}
                          title="Delete"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>


                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-card rounded-xl shadow-sm border border-theme p-12 text-center">
                <FolderOpen size={60} className="mx-auto text-secondary mb-4" />
                <h3 className="text-base font-semibold text-primary mb-2">No documents found</h3>
                <p className="text-sm text-secondary mb-4">Try adjusting your search or filters</p>
                <button
                  onClick={() => setUploadDialog(true)}
                  style={primaryButtonStyle}
                  className="px-4 py-2 !text-white rounded-lg transition-all duration-200 font-medium text-sm hover:shadow-lg"
                >
                  Upload First Document
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Upload Dialog */}
      {uploadDialog && (
        <div className="fixed inset-0 bg-card/20 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-card rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-theme">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-primary">Upload Document</h2>
                <button
                  onClick={() => {
                    setUploadModalError(null); // Clear error when closing
                    setUploadDialog(false);
                  }}
                  className="text-secondary hover:text-secondary"
                >
                  <XCircle size={24} />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Error Message Display in Modal */}
              {uploadModalError && (
                <div className="p-4 bg-card border-l-4 border-red-500 rounded-r-lg">
                  <div className="flex items-start">
                    <div className="flex-shrink-0">
                      <AlertCircle className="h-5 w-5 text-red-400" />
                    </div>
                    <div className="ml-3 flex-1">
                      <h3 className="text-sm font-medium text-red-800">Error</h3>
                      <p className="mt-1 text-sm text-red-700">{uploadModalError}</p>
                      {uploadModalError.includes('company settings') || uploadModalError.includes('Company Settings') ? (
                        <p className="mt-2 text-xs text-[var(--accent-purple)]">
                          Please go to <strong>Company Settings</strong> to complete your company setup.
                        </p>
                      ) : null}
                    </div>
                    <div className="ml-auto pl-3">
                      <button
                        type="button"
                        onClick={() => setUploadModalError(null)}
                        className="inline-flex text-red-400 hover:text-[#1183e0] focus:outline-none"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              )}
              {/* File Select */}
              <div>
                <label className="block text-sm font-semibold text-primary mb-2">Select File</label>
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-theme rounded-lg cursor-pointer hover:bg-[rgba(255,255,255,0.03)] transition-colors">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <Upload size={32} className="text-secondary mb-2" />
                    <p className="text-sm text-secondary mb-1">
                      {selectedFile ? selectedFile.name : 'Click to upload or drag and drop'}
                    </p>
                    <p className="text-xs text-secondary">PDF, DOC, XLS, JPG up to 10MB</p>
                  </div>
                  <input
                    type="file"
                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                    className="hidden"
                  />
                </label>
                {selectedFile && (
                  <div className="mt-2 p-3 bg-[var(--accent-green)]/10 border-[var(--accent-green)]/30 text-[var(--accent-green)] rounded-lg flex items-center gap-2">
                    <CheckCircle className="text-[var(--accent-green)]" size={16} />
                    <span className="text-sm text-[var(--accent-green)]">{selectedFile.name}</span>
                  </div>
                )}
              </div>

              {/* Document Name */}
              <div>
                <label className="block text-sm font-semibold text-primary mb-2">Document Name</label>
                <input
                  type="text"
                  value={uploadForm.name}
                  onChange={(e) => setUploadForm({ ...uploadForm, name: e.target.value })}
                  placeholder="Enter document name"
                  className="w-full px-4 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)]/30focus:ring-[var(--accent-blue)]/30"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-semibold text-primary mb-2">Category</label>
                <select
                  value={uploadForm.category}
                  onChange={(e) => setUploadForm({ ...uploadForm, category: e.target.value })}
                  className="w-full px-4 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)]/30focus:ring-[var(--accent-blue)]/30"
                >
                  {categories.filter((c) => c.key !== "all").length === 0 ? (
                    <option className="form-option" value="" disabled>
                      Create a category first
                    </option>
                  ) : (
                    <>
                      <option  className="form-option" value="" disabled>
                        Select category
                      </option>
                      {categories
                        .filter((c) => c.key !== "all")
                        .map((c) => (
                          <option className="form-option" key={c.key} value={c.key}>
                            {c.name}
                          </option>
                        ))}
                    </>
                  )}
                </select>
                {categories.filter((c) => c.key !== "all").length === 0 && (
                  <p className="mt-2 text-xs text-secondary">
                    No categories yet. Click <span className="font-semibold">Create</span> in the sidebar to add one.
                  </p>
                )}
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-semibold text-primary mb-2">Description (Optional)</label>
                <textarea
                  value={uploadForm.description}
                  onChange={(e) => setUploadForm({ ...uploadForm, description: e.target.value })}
                  placeholder="Enter a brief description"
                  rows={3}
                  className="w-full px-4 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)]/30focus:ring-[var(--accent-blue)]/30 resize-none"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t border-theme">
                <button
                  onClick={() => setUploadDialog(false)}
                  className="flex-1 px-4 py-2 border border-theme rounded-lg hover:bg-[rgba(255,255,255,0.03)] transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleFileUpload}
                  disabled={uploading || !selectedFile}
                  className="flex-1 px-4 py-2 rounded-lg transition-all bg-[var(--accent-navyblue)] hover:bg-[var(--accent-navyblue)]/80 font-medium flex items-center justify-center gap-2 disabled:opacity-50"
                 
                >
                  {uploading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload size={18} />
                      Upload Document
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View Modal */}
      {showViewModal && viewDoc && (
        <div className="fixed inset-0 bg-card/40 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className="bg-card rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden">
            <div className="p-4 border-b border-theme flex items-center justify-between">
              <div>
                <h3 className="text-xl font-semibold text-primary">{viewDoc.name}</h3>
                <p className="text-xs text-secondary mt-1 uppercase">{viewDoc.type}</p>
              </div>
              <button onClick={() => setShowViewModal(false)} className="text-secondary hover:text-secondary">
                <XCircle size={22} />
              </button>
            </div>
            <div className="p-4 overflow-auto bg-card modal-content-iframe-container">
              {loadingSignedUrl ? (
                <div className="flex flex-col items-center justify-center h-[70vh]">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-[#1183e0] mb-4"></div>
                  <p className="text-secondary">Loading document...</p>
                </div>
              ) : (() => {
                const ext = getExtension(viewDoc);
                // Use signed URL if available, otherwise use original URL
                const docUrl = signedUrl || viewDoc.url;

                // PDFs - use iframe to display in modal
                if (ext === 'pdf') {
                  return (
                    <div className="relative w-full">
                      <iframe
                        title="preview"
                        src={`${docUrl}#toolbar=0`}
                        className="w-full h-[70vh] border rounded-lg bg-card"
                        onError={(e) => {
                          console.error('PDF load error:', e);
                          setViewerError(true);
                        }}
                        onLoad={() => {
                          setViewerError(false);
                        }}
                      />
                      <div className="absolute bottom-4 right-4 flex gap-2">
                        <button
                          onClick={() => {
                            window.open(docUrl, '_blank', 'noopener,noreferrer');
                          }}
                          className="px-3 py-2  !text-white rounded-lg bg-[var(--accent-teal )] hover:bg-[var(--accent-teal)] transition-colors text-sm font-medium flex items-center gap-2 shadow-lg"
                        >
                          <Eye size={16} className="text-white" />
                          <span className="text-white">Open in New Tab</span>
                        </button>
                        <button
                          onClick={async () => {
                            // For download, fetch signed URL with 'attachment' disposition
                            try {
                              const downloadRes = await getSignedDocumentUrl(viewDoc._id, 'attachment');
                              const downloadUrl = downloadRes?.success && downloadRes?.url ? downloadRes.url : docUrl;
                              const a = document.createElement('a');
                              a.href = downloadUrl;
                              a.download = viewDoc.name || 'document';
                              a.target = '_blank';
                              document.body.appendChild(a);
                              a.click();
                              document.body.removeChild(a);
                            } catch (error) {
                              console.error('Download error:', error);
                              message.error('Download failed. Please try again.');
                            }
                          }}
                          className="px-3 py-2 bg-[#1183e0] !text-white rounded-lg hover:bg-[#0d6bc7] transition-colors text-sm font-medium flex items-center gap-2 shadow-lg"
                        >
                          <Download size={16} className="text-white" />
                          <span className="text-white">Download</span>
                        </button>
                      </div>
                      {viewerError && (
                        <div className="absolute inset-0 flex items-center justify-center bg-card bg-opacity-90 rounded-lg">
                          <div className="text-center p-4">
                            <AlertCircle className="text-[var(--accent-amber)] mb-2 mx-auto" size={32} />
                            <p className="text-sm text-secondary mb-3">PDF could not be displayed in viewer.</p>
                            <button
                              onClick={() => window.open(docUrl, '_blank', 'noopener,noreferrer')}
                              className="px-4 py-2 bg-[#1183e0] !text-white rounded-lg hover:bg-[#0d6bc7] transition-colors text-sm font-medium"
                            >
                              <span className="text-white">Open in New Tab</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                }

                // Images - use img tag to display in UI
                if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) {
                  return (
                    <div className="flex flex-col items-center justify-center">
                      <img
                        src={docUrl}
                        alt={viewDoc.name}
                        className="max-h-[70vh] w-auto mx-auto rounded-lg border shadow-lg"
                        onError={(e) => {
                          console.error('Image load error:', e);
                          const target = e.currentTarget;
                          target.style.display = 'none';
                        }}
                      />
                      <div className="mt-4 flex gap-3">
                        <button
                          onClick={() => {
                            const a = document.createElement('a');
                            a.href = docUrl;
                            a.download = viewDoc.name || 'document';
                            a.target = '_blank';
                            document.body.appendChild(a);
                            a.click();
                            document.body.removeChild(a);
                          }}
                          className="px-4 py-2 bg-[#1183e0] text-white rounded-lg hover:bg-[#0d6bc7] transition-colors font-medium flex items-center gap-2"
                        >
                          <Download size={18} />
                          Download
                        </button>
                      </div>
                    </div>
                  );
                }

                // For Office documents and other file types
                const viewerSrc = getViewerUrl(viewDoc);
                const isPublic = isPubliclyAccessible(docUrl);
                // Check if this is an S3 URL (signed URLs will have query params, but even base S3 URLs aren't publicly accessible for Office viewer)
                const isS3Url = docUrl && (docUrl.includes('s3.amazonaws.com') || docUrl.includes('.s3.'));


                // For Office documents (DOCX, XLSX, PPTX, etc.) - browsers can't display these natively
                const officeExts = ['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'];
                if (officeExts.includes(ext)) {
                  // S3 URLs (signed or not) and non-public URLs cannot be viewed with Microsoft Office Online viewer
                  // The viewer requires publicly accessible URLs without authentication
                  // Since we're using S3, we should always show download option for Office documents
                  if (isS3Url || !isPublic) {
                    return (
                      <div className="flex flex-col items-center justify-center h-[70vh] bg-card rounded-lg border-2 border-dashed border-theme">
                        <div className="text-center mb-6">
                          <FileText className="text-secondary mb-4 mx-auto" size={64} />
                          <h3 className="text-lg font-semibold text-primary mb-2">Office Document Preview Unavailable</h3>
                          <p className="text-sm text-secondary mb-4 max-w-md">
                            This Office document cannot be previewed in the browser because it requires authentication.
                            The Microsoft Office Online viewer can only access publicly available files without authentication.
                            Please download the file to view it in Microsoft Office or another compatible application.
                          </p>
                        </div>
                        <div className="flex gap-3">
                          <button
                            onClick={async () => {
                              // Open in new tab - will trigger download
                              window.open(docUrl, '_blank', 'noopener,noreferrer');
                            }}
                            className="px-4 py-2  !text-white rounded-lg bg-[var(--accent-green)] hover:bg-[var(--accent-green)] transition-colors font-medium flex items-center gap-2"
                          >
                            <Eye size={18} className="text-white" />
                            <span className="text-white">Open File</span>
                          </button>
                          <button
                            onClick={async () => {
                              // For download, fetch signed URL with 'attachment' disposition
                              try {
                                const downloadRes = await getSignedDocumentUrl(viewDoc._id, 'attachment');
                                const downloadUrl = downloadRes?.success && downloadRes?.url ? downloadRes.url : docUrl;
                                const a = document.createElement('a');
                                a.href = downloadUrl;
                                a.download = viewDoc.name || 'document';
                                a.target = '_blank';
                                document.body.appendChild(a);
                                a.click();
                                document.body.removeChild(a);
                              } catch (error) {
                                console.error('Download error:', error);
                                message.error('Download failed. Please try again.');
                              }
                            }}
                            className="px-4 py-2 bg-[#1183e0] !text-white rounded-lg hover:bg-[#0d6bc7] transition-colors font-medium flex items-center gap-2"
                          >
                            <Download size={18} className="text-white" />
                            <span className="text-white">Download</span>
                          </button>
                        </div>
                      </div>
                    );
                  }

                  // If viewer error occurred, show message with options
                  if (viewerError) {
                    return (
                      <div className="flex flex-col items-center justify-center h-[70vh] bg-card rounded-lg border-2 border-dashed border-theme">
                        <div className="text-center mb-6">
                          <AlertCircle className="text-[var(--accent-amber)] mb-4 mx-auto" size={64} />
                          <h3 className="text-lg font-semibold text-primary mb-2">Viewer Error</h3>
                          <p className="text-sm text-secondary mb-4 max-w-md">
                            The Microsoft Office Online viewer could not load this document.
                            This may be due to CORS restrictions or authentication requirements.
                          </p>
                        </div>
                        <div className="flex gap-3">
                          <button
                            onClick={() => {
                              window.open(docUrl, '_blank', 'noopener,noreferrer');
                            }}
                            className="px-4 py-2  !text-white rounded-lg bg-[var(--accent-green)] hover:bg-[var(--accent-green)] transition-colors font-medium flex items-center gap-2"
                          >
                            <Eye size={18} className="text-white" />
                            <span className="text-white">Open in New Tab</span>
                          </button>
                          <button
                            onClick={() => {
                              const a = document.createElement('a');
                              a.href = docUrl;
                              a.download = viewDoc.name || 'document';
                              document.body.appendChild(a);
                              a.click();
                              document.body.removeChild(a);
                            }}
                            className="px-4 py-2 bg-[#1183e0] !text-white rounded-lg hover:bg-[#0d6bc7] transition-colors font-medium flex items-center gap-2"
                          >
                            <Download size={18} className="text-white" />
                            <span className="text-white">Download</span>
                          </button>
                        </div>
                      </div>
                    );
                  }

                  // Try viewer (Microsoft Office Online viewer)
                  // Use signed URL for viewer if available
                  const viewerUrl = viewerSrc || `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(docUrl)}`;
                  return (
                    <div className="relative w-full">
                      <iframe
                        key={`office-viewer-${docUrl}`}
                        title="preview"
                        src={viewerUrl}
                        className="w-full h-[70vh] border rounded-lg bg-card"
                        onError={(e) => {
                          console.error('Office viewer load error:', e);
                          setViewerError(true);
                        }}
                      />
                      <div className="absolute bottom-4 right-4 flex gap-2">
                        <button
                          onClick={() => {
                            setViewerError(true); // Show error message with options
                          }}
                          className="px-3 py-2 bg-yellow-600 !text-white rounded-lg hover:bg-yellow-700 transition-colors text-sm font-medium flex items-center gap-2 shadow-lg"
                        >
                          <AlertCircle size={16} className="text-white" />
                          <span className="text-white">Viewer Not Working?</span>
                        </button>
                        <button
                          onClick={() => {
                            window.open(docUrl, '_blank', 'noopener,noreferrer');
                          }}
                          className="px-3 py-2  !text-white rounded-lg bg-[var(--accent-green)] hover:bg-[var(--accent-green)] transition-colors text-sm font-medium flex items-center gap-2 shadow-lg"
                        >
                          <Eye size={16} className="text-white" />
                          <span className="text-white">Open in New Tab</span>
                        </button>
                        <button
                          onClick={() => {
                            const a = document.createElement('a');
                            a.href = docUrl;
                            a.download = viewDoc.name || 'document';
                            a.target = '_blank';
                            document.body.appendChild(a);
                            a.click();
                            document.body.removeChild(a);
                          }}
                          className="px-3 py-2 bg-[#1183e0] !text-white rounded-lg hover:bg-[#0d6bc7] transition-colors text-sm font-medium flex items-center gap-2 shadow-lg"
                        >
                          <Download size={16} className="text-white" />
                          <span className="text-white">Download</span>
                        </button>
                      </div>
                    </div>
                  );
                }

                // For other file types - try direct iframe if publicly accessible
                if (isPublic) {
                  return (
                    <div className="relative w-full">
                      <iframe
                        title="preview"
                        src={docUrl}
                        className="w-full h-[70vh] border rounded-lg bg-card"
                        onError={(e) => {
                          console.error('Direct iframe load error:', e);
                        }}
                      />
                      <div className="absolute bottom-4 right-4 flex gap-2">
                        {viewerSrc && (
                          <button
                            onClick={() => {
                              const iframe = document.querySelector('iframe[title="preview"]') as HTMLIFrameElement;
                              if (iframe) {
                                iframe.src = viewerSrc;
                              }
                            }}
                            className="px-3 py-2 bg-purple-600 !text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium flex items-center gap-2 shadow-lg"
                          >
                            <Eye size={16} className="text-white" />
                            <span className="text-white">Use Viewer</span>
                          </button>
                        )}
                        <button
                          onClick={() => {
                            window.open(docUrl, '_blank', 'noopener,noreferrer');
                          }}
                          className="px-3 py-2  !text-white rounded-lg bg-[var(--accent-green)] hover:bg-[var(--accent-green)] transition-colors text-sm font-medium flex items-center gap-2 shadow-lg"
                        >
                          <Eye size={16} className="text-white" />
                          <span className="text-white">Open in New Tab</span>
                        </button>
                        <button
                          onClick={() => {
                            const a = document.createElement('a');
                            a.href = docUrl;
                            a.download = viewDoc.name || 'document';
                            a.target = '_blank';
                            document.body.appendChild(a);
                            a.click();
                            document.body.removeChild(a);
                          }}
                          className="px-3 py-2 bg-[#1183e0] !text-white rounded-lg hover:bg-[#0d6bc7] transition-colors text-sm font-medium flex items-center gap-2 shadow-lg"
                        >
                          <Download size={16} className="text-white" />
                          <span className="text-white">Download</span>
                        </button>
                      </div>
                    </div>
                  );
                }

                // If viewer URL is available, use it
                if (viewerSrc) {
                  return (
                    <div className="relative w-full">
                      <iframe
                        title="preview"
                        src={viewerSrc}
                        className="w-full h-[70vh] border rounded-lg bg-card"
                        onError={(e) => {
                          console.error('Viewer load error:', e);
                        }}
                      />
                      <div className="absolute bottom-4 right-4 flex gap-2">
                        <button
                          onClick={() => {
                            window.open(docUrl, '_blank', 'noopener,noreferrer');
                          }}
                          className="px-3 py-2  !text-white rounded-lg bg-[var(--accent-green)] hover:bg-[var(--accent-green)] transition-colors text-sm font-medium flex items-center gap-2 shadow-lg"
                        >
                          <Eye size={16} className="text-white" />
                          <span className="text-white">Open in New Tab</span>
                        </button>
                        <button
                          onClick={() => {
                            const a = document.createElement('a');
                            a.href = docUrl;
                            a.download = viewDoc.name || 'document';
                            a.target = '_blank';
                            document.body.appendChild(a);
                            a.click();
                            document.body.removeChild(a);
                          }}
                          className="px-3 py-2 bg-[#1183e0] !text-white rounded-lg hover:bg-[#0d6bc7] transition-colors text-sm font-medium flex items-center gap-2 shadow-lg"
                        >
                          <Download size={16} className="text-white" />
                          <span className="text-white">Download</span>
                        </button>
                      </div>
                    </div>
                  );
                }

                // If no preview is available, show download option or try direct view
                if (forceDirectView) {
                  // If viewMode is set to 'newtab', show message that it opened
                  if (viewMode === 'newtab') {
                    return (
                      <div className="flex flex-col items-center justify-center h-[70vh] bg-card rounded-lg border-2 border-dashed border-theme">
                        <div className="text-center mb-6">
                          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Eye className="text-[var(--accent-green)]" size={32} />
                          </div>
                          <h3 className="text-lg font-semibold text-primary mb-2">Document Opened</h3>
                          <p className="text-sm text-secondary mb-4">
                            The document should have opened in a new tab. If it didn't, click the button below.
                          </p>
                        </div>
                        <div className="flex gap-3">
                          <button
                            onClick={() => window.open(docUrl, '_blank', 'noopener,noreferrer')}
                            className="px-4 py-2  !text-white rounded-lg bg-[var(--accent-green)] hover:bg-[var(--accent-green)] transition-colors font-medium flex items-center gap-2"
                          >
                            <Eye size={18} className="text-white" />
                            <span className="text-white">Open in New Tab</span>
                          </button>
                          <button
                            onClick={() => {
                              const a = document.createElement('a');
                              a.href = docUrl;
                              a.download = viewDoc.name || 'document';
                              document.body.appendChild(a);
                              a.click();
                              document.body.removeChild(a);
                            }}
                            className="px-4 py-2 bg-[#1183e0] !text-white rounded-lg hover:bg-[#0d6bc7] transition-colors font-medium flex items-center gap-2"
                          >
                            <Download size={18} className="text-white" />
                            <span className="text-white">Download</span>
                          </button>
                        </div>
                      </div>
                    );
                  }

                  // Try to display in iframe
                  return (
                    <div className="relative w-full">
                      <iframe
                        key={`iframe-${docUrl}`}
                        title="preview"
                        src={docUrl}
                        className="w-full h-[70vh] border rounded-lg bg-card"
                        style={{ border: 'none' }}
                        onError={(e) => {
                          console.error('Iframe load error:', e);
                        }}
                      />
                      <div className="absolute bottom-4 right-4 flex gap-2">
                        <button
                          onClick={() => {
                            window.open(docUrl, '_blank', 'noopener,noreferrer');
                            setViewMode('newtab');
                          }}
                          className="px-3 py-2  !text-white rounded-lg bg-[var(--accent-green)] hover:bg-[var(--accent-green)] transition-colors text-sm font-medium flex items-center gap-2 shadow-lg"
                        >
                          <Eye size={16} className="text-white" />
                          <span className="text-white">Open in New Tab</span>
                        </button>
                        <button
                          onClick={() => {
                            const a = document.createElement('a');
                            a.href = docUrl;
                            a.download = viewDoc.name || 'document';
                            a.target = '_blank';
                            document.body.appendChild(a);
                            a.click();
                            document.body.removeChild(a);
                          }}
                          className="px-3 py-2 bg-[#1183e0] !text-white rounded-lg hover:bg-[#0d6bc7] transition-colors text-sm font-medium flex items-center gap-2 shadow-lg"
                        >
                          <Download size={16} className="text-white" />
                          <span className="text-white">Download</span>
                        </button>
                      </div>
                    </div>
                  );
                }

                // Show message with option to try viewing
                return (
                  <div className="flex flex-col items-center justify-center h-[70vh] bg-card rounded-lg border-2 border-dashed border-theme">
                    <FileText className="text-secondary mb-4" size={64} />
                    <h3 className="text-lg font-semibold text-primary mb-2">Document Preview Not Available</h3>
                    <p className="text-sm text-secondary mb-6 text-center max-w-md">
                      This document cannot be previewed in the browser. Click "Try to View" to attempt displaying it, or download it to view.
                    </p>
                    <div className="flex gap-3">
                      <button
                        onClick={() => {
                          // First try iframe, but also provide option to open in new tab
                          setForceDirectView(true);
                          setViewMode('iframe'); // Start with iframe view
                        }}
                        className="px-4 py-2 bg-[#1183e0] !text-white rounded-lg hover:bg-[#0d6bc7] transition-colors font-medium flex items-center gap-2"
                      >
                        <Eye size={18} className="text-white" />
                        <span className="text-white">Try to View</span>
                      </button>
                      <button
                        onClick={() => {
                          // Directly open in new tab - this is more reliable
                          window.open(docUrl, '_blank', 'noopener,noreferrer');
                        }}
                        className="px-4 py-2  !text-white rounded-lg bg-[var(--accent-green)] hover:bg-[var(--accent-green)] transition-colors font-medium flex items-center gap-2"
                      >
                        <Eye size={18} className="text-white" />
                        <span className="text-white">Open in New Tab</span>
                      </button>
                      <button
                        onClick={() => {
                          const a = document.createElement('a');
                          a.href = docUrl;
                          a.download = viewDoc.name || 'document';
                          document.body.appendChild(a);
                          a.click();
                          document.body.removeChild(a);
                        }}
                        className="px-4 py-2 bg-card text-primary rounded-lg hover:bg-card transition-colors font-medium flex items-center gap-2"
                      >
                        <Download size={18} />
                        Download
                      </button>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {confirmDelete.open && (
        <div className="fixed inset-0 bg-card/30 backdrop-blur-sm z-[120] flex items-center justify-center p-4">
          <div className="bg-card rounded-xl shadow-2xl w-full max-w-md">
            <div className="p-6 border-b border-theme">
              <h3 className="text-lg font-semibold text-primary">Delete document?</h3>
              <p className="text-sm text-secondary mt-2">This action cannot be undone. You are about to delete <span className="font-medium text-primary">{confirmDelete.name}</span>.</p>
            </div>
            <div className="p-4 flex items-center justify-end gap-3">
              <button onClick={() => setConfirmDelete({ open: false, id: null })} className="px-4 py-2 border border-theme rounded-lg hover:bg-[rgba(255,255,255,0.03)] transition-colors font-medium">Cancel</button>
              <button onClick={handleConfirmDelete} className="px-4 py-2  !text-white rounded-lg bg-[var(--hover:accent-red)] hover:bg-[var(--accent-red)] transition-colors font-medium">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentManagement;
