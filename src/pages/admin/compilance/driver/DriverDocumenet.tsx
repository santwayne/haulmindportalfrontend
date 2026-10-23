import { useState, useEffect } from "react";
import { FaUser, FaPlus, FaEdit, FaTrash, FaFileUpload, FaFileAlt, FaTimes, FaCheckCircle, FaExclamationCircle, FaInfoCircle, FaArrowLeft } from "react-icons/fa";
import {
  getDriverDocumentsById,
  createDriverDocument,
  updateDriverDocument,
  deleteDriverDocument
} from "../../../../axios/api/compilance.driverdoc";
import { useDrivers } from "../../../../customHooks/useDrivers";

// Types
interface Driver {
  _id: string;
  name: string;
  email: string;
  phone: string;
  status: string;
}

interface Document {
  _id: string;
  documentType: 'Driver License' | 'Medical Certificate' | 'Work Authorization' | 'Driver Abstract' | 'Background Check' | 'Drug & Alcohol Test' | 'Training Certificate' | 'Insurance Policy' | 'Company Policy';
  documentNumber: string;
  expiryDate: string;
  issuedAt: string;
  status?: string;
}

interface DriverDocument {
  _id: string;
  driver: Driver;
  documents: Document[];
}

interface FormData {
  documentType: 'Driver License' | 'Medical Certificate' | 'Work Authorization' | 'Driver Abstract' | 'Background Check' | 'Drug & Alcohol Test' | 'Training Certificate' | 'Insurance Policy' | 'Company Policy';
  documentNumber: string;
  expiryDate: string;
  issuedAt: string;
}

type NotificationType = 'success' | 'error' | 'info';

interface Notification {
  id: number;
  type: NotificationType;
  message: string;
}

interface DeleteConfirmation {
  show: boolean;
  docId: string | null;
}

// Notification Component
const Notification = ({ notification, onClose }: { notification: Notification; onClose: (id: number) => void }) => {
  const icons = {
    success: <FaCheckCircle className="text-green-500" size={24} />,
    error: <FaExclamationCircle className="text-red-500" size={24} />,
    info: <FaInfoCircle className="text-[#9793E4]" size={24} />
  };

  const bgColors = {
    success: 'bg-green-50 border-green-200',
    error: 'bg-card border-red-200',
    info: 'bg-[#9793E4]/10 border-[#9793E4]/30'
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

function DriverDocument() {
  const { drivers, loading: driversLoading } = useDrivers();

  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const [driverDocuments, setDriverDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [showDocModal, setShowDocModal] = useState<boolean>(false);
  const [editingDoc, setEditingDoc] = useState<Document | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [deleteConfirmation, setDeleteConfirmation] = useState<DeleteConfirmation>({
    show: false,
    docId: null
  });
  const [formData, setFormData] = useState<FormData>({
    documentType: "Driver License",
    documentNumber: "",
    expiryDate: "",
    issuedAt: ""
  });

  const addNotification = (type: NotificationType, message: string) => {
    const id = Date.now();
    setNotifications(prev => [...prev, { id, type, message }]);
  };

  const removeNotification = (id: number) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const fetchDriverDocuments = async (driverId: string) => {
    setLoading(true);
    try {
      const res = await getDriverDocumentsById(driverId);
      if (res?.success) {
        setDriverDocuments(res.documents || []);
      } else {
        addNotification('error', res?.message || 'Failed to fetch documents');
        setDriverDocuments([]);
      }
    } catch (err: any) {
      console.error("Error fetching driver documents:", err);
      addNotification('error', err?.message || 'Failed to fetch documents');
      setDriverDocuments([]);
    }
    setLoading(false);
  };

  const handleSelectDriver = (driver: Driver) => {
    setSelectedDriver(driver);
    fetchDriverDocuments(driver._id);
  };

  const handleBackToDrivers = () => {
    setSelectedDriver(null);
    setDriverDocuments([]);
  };

  const handleAddDocument = () => {
    setEditingDoc(null);
    setSelectedFile(null);
    setFormData({
      documentType: "Driver License",
      documentNumber: "",
      expiryDate: "",
      issuedAt: ""
    });
    setShowDocModal(true);
  };

  const handleEditDocument = (doc: Document) => {
    setEditingDoc(doc);
    setSelectedFile(null);
    setFormData({
      documentType: doc.documentType || "Driver License",
      documentNumber: doc.documentNumber || "",
      expiryDate: doc.expiryDate ? doc.expiryDate.split('T')[0] : "",
      issuedAt: doc.issuedAt ? doc.issuedAt.split('T')[0] : ""
    });
    setShowDocModal(true);
  };

  const handleDeleteDocument = async (docId: string) => {
    setDeleteConfirmation({ show: true, docId });
  };

  const confirmDelete = async () => {
    if (!deleteConfirmation.docId) return;

    try {
      const res = await deleteDriverDocument(deleteConfirmation.docId);
      if (res?.success) {
        addNotification('success', res.message || "Document deleted successfully");
        if (selectedDriver) {
          fetchDriverDocuments(selectedDriver._id);
        }
      } else {
        addNotification('error', res?.message || "Failed to delete document");
      }
    } catch (err: any) {
      addNotification('error', err?.message || "Error deleting document");
    }

    setDeleteConfirmation({ show: false, docId: null });
  };

  const cancelDelete = () => {
    setDeleteConfirmation({ show: false, docId: null });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmitDocument = async () => {
    if (!selectedDriver) {
      addNotification('error', "No driver selected");
      return;
    }

    if (!formData.documentNumber || !formData.expiryDate || !formData.issuedAt) {
      addNotification('error', "Please fill all required fields");
      return;
    }

    setSubmitting(true);

    const data = new FormData();
    data.append("documentType", formData.documentType);
    data.append("documentNumber", formData.documentNumber);
    data.append("expiryDate", formData.expiryDate);
    data.append("issuedAt", formData.issuedAt);

    // Add employee/driver ID to FormData (required by backend)
    data.append("employee", selectedDriver._id);

    if (selectedFile) {
      data.append("document", selectedFile);
    }

    try {
      let res;
      if (editingDoc) {
        res = await updateDriverDocument(editingDoc._id, data);
      } else {
        res = await createDriverDocument(data);
      }

      if (res?.success) {
        addNotification('success', res.message || `Document ${editingDoc ? "updated" : "created"} successfully`);
        setShowDocModal(false);
        fetchDriverDocuments(selectedDriver._id);
      } else {
        addNotification('error', res?.message || `Failed to ${editingDoc ? "update" : "create"} document`);
      }
    } catch (err: any) {
      addNotification('error', err?.message || "Error submitting document");
    }

    setSubmitting(false);
  };

  const getStatusBadgeColor = (status?: string) => {
    switch (status?.toLowerCase()) {
      case "completed":
        return "bg-green-100 text-green-700 border border-green-200";
      case "expired":
        return "bg-red-100 text-red-700 border border-red-200";
      case "expiring-soon":
        return "bg-yellow-100 text-yellow-700 border border-yellow-200";
      default:
        return "bg-card text-primary border border-theme";
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const DocumentModal = () => (
    <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <div className="bg-card rounded-2xl shadow-2xl w-full max-w-lg relative max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="sticky top-0 bg-card border-b px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <h3 className="text-xl font-bold !text-primary">
            {editingDoc ? "Update Document" : "Add New Document"}
          </h3>
          <button
            onClick={() => setShowDocModal(false)}
            className="p-2 hover:bg-[rgba(255,255,255,0.03)] rounded-full transition-colors"
            disabled={submitting}
          >
            <FaTimes className="text-secondary" size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-semibold text-primary mb-2">
              Document Type <span className="text-red-500">*</span>
            </label>
            <select
              name="documentType"
              className="w-full border border-theme rounded-lg p-3 focus:ring-2 focus:ring-[#9793E4] focus:border-transparent transition-all"
              value={formData.documentType}
              onChange={handleInputChange}
            >
              <option value="Driver License">Driver License</option>
              <option value="Medical Certificate">Medical Certificate</option>
              <option value="Work Authorization">Work Authorization</option>
              <option value="Driver Abstract">Driver Abstract</option>
              <option value="Background Check">Background Check</option>
              <option value="Drug & Alcohol Test">Drug & Alcohol Test</option>
              <option value="Training Certificate">Training Certificate</option>
              <option value="Insurance Policy">Insurance Policy</option>
              <option value="Company Policy">Company Policy</option>

            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-primary mb-2">
              Document Number <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="documentNumber"
              className="w-full border border-theme rounded-lg p-3 focus:ring-2 focus:ring-[#9793E4] focus:border-transparent transition-all"
              value={formData.documentNumber}
              onChange={handleInputChange}
              placeholder="Enter document number"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-primary mb-2">
                Issued Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                name="issuedAt"
                className="w-full border border-theme rounded-lg p-3 focus:ring-2 focus:ring-[#9793E4] focus:border-transparent transition-all"
                value={formData.issuedAt}
                onChange={handleInputChange}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-primary mb-2">
                Expiry Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                name="expiryDate"
                className="w-full border border-theme rounded-lg p-3 focus:ring-2 focus:ring-[#9793E4] focus:border-transparent transition-all"
                value={formData.expiryDate}
                onChange={handleInputChange}
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-primary mb-2">
              Upload Document
            </label>
            <div className="relative">
              <input
                type="file"
                className="w-full border border-theme rounded-lg p-3 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-[#9793E4]/10 file:text-[#9793E4] hover:file:bg-[#9793E4]/20 transition-all"
                onChange={handleFileChange}
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
              />
            </div>
            {selectedFile && (
              <p className="text-sm text-green-600 mt-2 flex items-center gap-2">
                <FaFileUpload /> Selected: {selectedFile.name}
              </p>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="sticky bottom-0 bg-card px-6 py-4 flex justify-end gap-3 border-t rounded-b-2xl">
          <button
            type="button"
            className="px-6 py-2.5 bg-card border border-theme text-primary rounded-lg hover:bg-[rgba(255,255,255,0.03)] font-medium transition-colors"
            onClick={() => setShowDocModal(false)}
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            type="button"
            className="px-6 py-2.5 bg-[#9793E4] !text-white rounded-lg hover:bg-[#8783D4] disabled:bg-[#9793E4]/50 disabled:cursor-not-allowed font-medium transition-colors shadow-md"
            onClick={handleSubmitDocument}
            disabled={submitting}
          >
            {submitting ? "Saving..." : editingDoc ? "Update Document" : "Add Document"}
          </button>
        </div>
      </div>
    </div>
  );

  const DeleteConfirmationModal = () => (
    <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <div className="bg-card rounded-2xl shadow-2xl w-full max-w-md relative">
        {/* Modal Header */}
        <div className="bg-card border-b border-red-100 px-6 py-4 flex items-center gap-3 rounded-t-2xl">
          <div className="p-2 bg-red-100 rounded-full">
            <FaTrash className="text-[#A855F7]" size={20} />
          </div>
          <h3 className="text-xl font-bold text-red-900">Delete Document</h3>
        </div>

        {/* Modal Body */}
        <div className="p-6">
          <p className="text-primary text-base">
            Are you sure you want to delete this document? This action cannot be undone.
          </p>
        </div>

        {/* Modal Footer */}
        <div className="bg-card px-6 py-4 flex justify-end gap-3 border-t rounded-b-2xl">
          <button
            type="button"
            className="px-6 py-2.5 bg-card border border-theme text-primary rounded-lg hover:bg-[rgba(255,255,255,0.03)] font-medium transition-colors"
            onClick={cancelDelete}
          >
            Cancel
          </button>
          <button
            type="button"
            className="px-6 py-2.5 bg-red-600 !text-white rounded-lg hover:bg-red-700 font-medium transition-colors shadow-md"
            onClick={confirmDelete}
          >
            Delete Document
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-6 min-h-screen bg-card">
      {/* Notifications Container */}
      <div className="fixed top-4 right-4 z-[200] space-y-3 max-w-md">
        {notifications.map(notification => (
          <Notification
            key={notification.id}
            notification={notification}
            onClose={removeNotification}
          />
        ))}
      </div>

      {/* Driver List View */}
      {!selectedDriver && (
        <>
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-primary">Driver Documents</h1>
          </div>

          {driversLoading ? (
            <div className="text-center py-16">
              <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-[#9793E4] mx-auto mb-4"></div>
              <p className="text-secondary text-lg">Loading drivers...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {drivers.length === 0 ? (
                <div className="bg-card rounded-2xl shadow-lg border border-dashed border-theme p-10 flex flex-col items-center justify-center text-secondary">
                  <FaUser size={48} className="mb-3" />
                  <p className="text-sm">No drivers available yet.</p>
                </div>
              ) : (
                drivers.map((driver: Driver) => (
                  <div
                    key={driver._id}
                    className="bg-card rounded-2xl shadow-lg hover:shadow-xl transition-all cursor-pointer overflow-hidden border border-theme"
                    onClick={() => handleSelectDriver(driver)}
                  >
                    <div className="bg-gradient-to-r from-[#9793E4] via-[#8783D4] to-[#7773C4] p-6">
                      <div className="flex items-center gap-4">
                        <div className="p-4 bg-card bg-opacity-20 rounded-xl backdrop-blur-sm">
                          <FaUser size={24} className="text-black" />
                        </div>
                        <div className="flex-1">
                          <h2 className="text-xl font-bold text-white">{driver.name}</h2>
                          <p className="text-sm text-white/80">{driver.email}</p>
                        </div>
                      </div>
                    </div>
                    <div className="p-6">
                      <p className="text-sm text-secondary mb-3 flex items-center gap-2">
                        <span className="font-semibold">📞</span> {driver.phone}
                      </p>
                      <span className={`inline-block px-4 py-1.5 rounded-full text-xs font-semibold capitalize ${driver.status?.toLowerCase() === 'active'
                        ? 'bg-green-100 text-green-700 border border-green-200'
                        : 'bg-red-100 text-red-700 border border-red-200'
                        }`}>
                        {driver.status}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </>
      )}

      {/* Driver Detail View */}
      {selectedDriver && (
        <div className="space-y-6">
          <button
            onClick={handleBackToDrivers}
            className="flex items-center gap-2 !mb-3 px-5 py-3 bg-card border border-theme text-primary rounded-lg hover:bg-[rgba(255,255,255,0.03)] font-medium transition-all shadow-md"
          >
            <FaArrowLeft /> Back to Drivers
          </button>

          {/* Driver Info Card */}
          <div className="bg-card rounded-2xl shadow-lg overflow-hidden border border-theme">
            <div className="bg-gradient-to-r from-[#9793E4] via-[#8783D4] to-[#7773C4] p-6 text-white">
              <div className="flex items-center gap-4">
                <div className="p-4 bg-card text-black bg-opacity-20 rounded-xl backdrop-blur-sm">
                  <FaUser size={32} />
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl font-bold">{selectedDriver.name}</h2>
                  <p className="text-sm opacity-90 mt-1">{selectedDriver.email}</p>
                  <p className="text-sm opacity-90">{selectedDriver.phone}</p>
                </div>
                <span className="px-4 py-1.5 bg-card text-black bg-opacity-20 rounded-full text-sm font-semibold capitalize backdrop-blur-sm">
                  {selectedDriver.status}
                </span>
              </div>
            </div>
          </div>

          {/* Documents Section */}
          <div className="bg-card shadow-lg rounded-2xl overflow-hidden border border-theme">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-bold text-primary flex items-center gap-2 text-xl">
                  <FaFileAlt className="text-[#9793E4]" />
                  Documents ({driverDocuments.length})
                </h3>
                <button
                  onClick={handleAddDocument}
                  className="flex items-center gap-2 px-5 py-3 bg-[#9793E4] !text-white rounded-lg hover:bg-[#8783D4] shadow-lg hover:shadow-xl transition-all font-medium"
                >
                  <FaPlus /> Add Document
                </button>
              </div>

              {loading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-[#9793E4] mx-auto mb-4"></div>
                  <p className="text-secondary">Loading documents...</p>
                </div>
              ) : driverDocuments.length === 0 ? (
                <div className="text-center py-12 text-secondary bg-card rounded-xl">
                  <FaFileAlt size={48} className="mx-auto mb-3 opacity-30" />
                  <p className="text-base font-medium">No documents uploaded yet</p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-lg border border-theme">
                  <table className="w-full">
                    <thead className="bg-card">
                      <tr>
                        <th className="p-4 text-left text-sm font-semibold text-primary">Type</th>
                        <th className="p-4 text-left text-sm font-semibold text-primary">Number</th>
                        <th className="p-4 text-left text-sm font-semibold text-primary">Issued</th>
                        <th className="p-4 text-left text-sm font-semibold text-primary">Expiry</th>
                        <th className="p-4 text-left text-sm font-semibold text-primary">Status</th>
                        <th className="p-4 text-left text-sm font-semibold text-primary">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {driverDocuments.map((doc, index) => (
                        <tr
                          key={doc._id}
                          className={`${index % 2 === 0 ? "bg-card" : "bg-card"
                            } border-t hover:bg-[rgba(255,255,255,0.03)] transition-colors`}
                        >
                          <td className="p-4">
                            <span className="font-semibold text-primary capitalize">{doc.documentType}</span>
                          </td>
                          <td className="p-4">
                            <span className="font-mono bg-card px-2 py-1 rounded text-sm">{doc.documentNumber}</span>
                          </td>
                          <td className="p-4 text-sm text-secondary">{formatDate(doc.issuedAt)}</td>
                          <td className="p-4 text-sm text-secondary">{formatDate(doc.expiryDate)}</td>
                          <td className="p-4">
                            {doc.status && (
                              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadgeColor(doc.status)}`}>
                                {doc.status}
                              </span>
                            )}
                          </td>
                          <td className="p-4">
                            <div className="flex gap-2">
                              <button
                                className="p-2.5 text-[#9793E4] hover:bg-[#9793E4]/10 rounded-lg transition-all border border-[#9793E4]/30"
                                onClick={() => handleEditDocument(doc)}
                                title="Edit Document"
                              >
                                <FaEdit size={16} />
                              </button>
                              <button
                                className="p-2.5 text-[#A855F7] hover:bg-red-50 rounded-lg transition-all border border-red-200"
                                onClick={() => handleDeleteDocument(doc._id)}
                                title="Delete Document"
                              >
                                <FaTrash size={16} />
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
          </div>
        </div>
      )}

      {showDocModal && <DocumentModal />}
      {deleteConfirmation.show && <DeleteConfirmationModal />}

      <style>{`
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
      `}</style>
    </div>
  );
}

export default DriverDocument;