import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import {
  Plus,
  Search,
  Building2,
  Filter,
  Edit,
  Trash2,
} from "lucide-react";
import { FaCheckCircle, FaExclamationCircle, FaTimes } from 'react-icons/fa';
import NewVendorSidebar from "./NewVendorSidebar";
import {
  listVendor,
  updateVendor,
  updateStatusVendor,
  deleteVendor,
} from "../../../../../axios/api/distapcher";

interface Vendor {
  _id: string;
  internalId: string;
  name: string;
  email: string;
  phone: string;
  website: string;
  type: string;
  status: string;
  address: string;
  country: string;
  createdAt: string;
}

// Toast Notification Types
type NotificationType = 'success' | 'error' | 'info' | 'warning';

interface ToastNotification {
  id: number;
  type: NotificationType;
  message: string;
}

// Toast Notification Component
const ToastNotification = ({ notification, onClose }: { notification: ToastNotification; onClose: (id: number) => void }) => {
  const bgColors = {
    success: 'bg-green-50 border-green-200',
    error: 'bg-card border-red-200',
    info: 'bg-card border-blue-200',
    warning: 'bg-card border-yellow-200'
  };

  const icons = {
    success: <FaCheckCircle className="text-green-600" size={20} />,
    error: <FaExclamationCircle className="text-[#A855F7]" size={20} />,
    info: <FaExclamationCircle className="text-[#00D1FF]" size={20} />,
    warning: <FaExclamationCircle className="text-[#00FFA3]" size={20} />
  };

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

const Index = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  // Edit modal state
  const [editVendor, setEditVendor] = useState<Vendor | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Vendor>>({});
  const [editLoading, setEditLoading] = useState(false);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Vendor | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [notifications, setNotifications] = useState<ToastNotification[]>([]);
  const notificationIdRef = useRef(0);

  const addNotification = useCallback((type: NotificationType, message: string) => {
    const id = ++notificationIdRef.current;
    setNotifications((prev) => [...prev, { id, type, message }]);
    // Auto-remove after 5 seconds
    setTimeout(() => {
      removeNotification(id);
    }, 5000);
  }, []);

  const removeNotification = useCallback((id: number) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  // Fetch vendors
  const fetchVendors = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listVendor();
      if (res?.success) {
        setVendors(Array.isArray(res.data) ? res.data : []);
      } else {
        addNotification('error', res?.message || "Failed to fetch vendors");
      }
    } catch (error: any) {
      console.error("Error fetching vendors:", error);
      addNotification('error', error?.message || "Error fetching vendors");
    } finally {
      setLoading(false);
    }
  }, [addNotification]);

  useEffect(() => {
    fetchVendors();
  }, [fetchVendors]);

  const getStatusColor = (status?: string) => {
    switch (status?.toLowerCase()) {
      case "active":
        return "bg-green-100 text-green-800";
      case "inactive":
        return "bg-red-100 text-red-800";
      default:
        return "bg-card text-primary";
    }
  };

  // Delete
  const openDeleteModal = useCallback((vendor: Vendor) => {
    setDeleteTarget(vendor);
    setDeleteModalOpen(true);
  }, []);

  const closeDeleteModal = useCallback(() => {
    setDeleteModalOpen(false);
    setDeleteTarget(null);
    setDeleteLoading(false);
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      const res = await deleteVendor(deleteTarget._id);
      if (res?.success) {
        addNotification('success', res.message || "Vendor deleted successfully");
        closeDeleteModal();
        fetchVendors();
      } else {
        addNotification('error', res?.message || "Failed to delete vendor");
      }
    } catch (error: any) {
      console.error("Error deleting vendor:", error);
      addNotification('error', error?.message || "Failed to delete vendor");
    } finally {
      setDeleteLoading(false);
    }
  }, [deleteTarget, closeDeleteModal, fetchVendors, addNotification]);

  // Status Toggle
  const handleStatusToggle = useCallback(
    async (vendor: Vendor) => {
      const newStatus =
        vendor.status.toLowerCase() === "active" ? "inactive" : "active";
      try {
        const res = await updateStatusVendor(vendor._id, { status: newStatus });
        if (res?.success) {
          addNotification('success', res.message || "Status updated");
          fetchVendors();
        } else {
          addNotification('error', res?.message || "Failed to update status");
        }
      } catch (error: any) {
        console.error("Error updating status:", error);
        addNotification('error', error?.message || "Failed to update status");
      }
    },
    [fetchVendors, addNotification]
  );

  // Open Edit Modal
  const handleEdit = useCallback((vendor: Vendor) => {
    setEditVendor(vendor);
    setEditForm(vendor); // pre-fill
    setIsEditModalOpen(true);
  }, []);

  // Save Edit
  const handleUpdateVendor = useCallback(async () => {
    if (!editVendor) return;
    setEditLoading(true);
    try {
      const res = await updateVendor(editVendor._id, editForm);
      if (res?.success) {
        addNotification('success', res.message || "Vendor updated successfully");
        setIsEditModalOpen(false);
        setEditVendor(null);
        fetchVendors();
      } else {
        addNotification('error', res?.message || "Failed to update vendor");
      }
    } catch (error: any) {
      console.error("Error updating vendor:", error);
      addNotification('error', error?.message || "Failed to update vendor");
    } finally {
      setEditLoading(false);
    }
  }, [editVendor, editForm, fetchVendors, addNotification]);

  const filteredVendors = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return vendors;
    return vendors.filter((vendor) => {
      const nameMatch = vendor.name?.toLowerCase().includes(query);
      const emailMatch = vendor.email?.toLowerCase().includes(query);
      const typeMatch = vendor.type?.toLowerCase().includes(query);
      return nameMatch || emailMatch || typeMatch;
    });
  }, [vendors, search]);

  return (
    <div className="min-h-screen bg-card">
      {/* Toast Notifications Container - High z-index to be above modal */}
      <div className="fixed top-4 right-4 z-[10002] flex flex-col gap-3 max-w-md">
        {notifications.map(notification => (
          <ToastNotification
            key={notification.id}
            notification={notification}
            onClose={removeNotification}
          />
        ))}
      </div>
      {/* Main Content */}
      <div className="flex-1">
        {/* Header */}
        <div className="bg-card border-b border-theme px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-semibold text-primary">Vendors</h1>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-secondary" />
                <input
                  type="text"
                  placeholder="Search Vendors"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-theme rounded-md w-64 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button className="p-2 text-secondary hover:text-secondary">
                <Filter className="w-5 h-5" />
              </button>
              <button
                onClick={() => {
                  setIsSidebarOpen(true);
                }}
                className="bg-blue-600 !text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors flex items-center space-x-2"
              >
                <Plus className="w-4 h-4" />
                <span>Create Vendor</span>
              </button>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="p-6">
          <div className="bg-card rounded-lg shadow-sm border border-theme overflow-hidden">
            {loading ? (
              <div className="p-6 text-center text-secondary">Loading...</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-card border-b border-theme">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                        Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                        Internal ID
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                        Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                        Created At
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-theme">
                    {filteredVendors.length > 0 ? (
                      filteredVendors.map((vendor) => (
                        <tr key={vendor._id} className="hover:bg-[rgba(255,255,255,0.03)]">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                <Building2 className="w-4 h-4 text-[#00D1FF]" />
                              </div>
                              <div className="ml-3">
                                <div className="text-sm font-medium text-primary">
                                  {vendor.name}
                                </div>
                                <div className="text-xs text-secondary">
                                  {vendor.email}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm font-mono text-secondary">
                            {vendor.internalId}
                          </td>
                          <td className="px-6 py-4 text-sm text-secondary capitalize">
                            {vendor.type}
                          </td>
                          <td className="px-6 py-4">
                            <button
                              onClick={() => handleStatusToggle(vendor)}
                              className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(
                                vendor.status
                              )}`}
                            >
                              {vendor.status}
                            </button>
                          </td>
                          <td className="px-6 py-4 text-sm text-secondary">
                            {new Date(vendor.createdAt).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 text-sm text-secondary">
                            <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2">
                              <button
                                onClick={() => handleEdit(vendor)}
                                className="inline-flex items-center gap-1 rounded-md border border-blue-200 bg-card px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100 transition-colors"
                              >
                                <Edit className="h-3.5 w-3.5" />
                                Edit
                              </button>
                              <button
                                onClick={() => openDeleteModal(vendor)}
                                className="inline-flex items-center gap-1 rounded-md border border-red-200 bg-card px-3 py-1.5 text-xs font-medium text-[#A855F7] hover:bg-red-100 transition-colors"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan={6}
                          className="px-6 py-4 text-center text-secondary"
                        >
                          No vendors found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sidebar for Create */}
      <NewVendorSidebar
        isOpen={isSidebarOpen}
        onClose={() => {
          setIsSidebarOpen(false);
          fetchVendors();
        }}
        onNotification={(type, message) => addNotification(type, message)}
      />

      {/* Edit Modal */}
      {isEditModalOpen && editVendor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-lg rounded-xl border border-theme bg-card p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between border-b pb-3">
              <h2 className="text-lg font-semibold text-primary">Edit Vendor</h2>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-secondary transition-colors hover:text-secondary"
                disabled={editLoading}
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <input
                type="text"
                placeholder="Name"
                value={editForm.name || ""}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                className="w-full rounded-md border border-theme px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="email"
                placeholder="Email"
                value={editForm.email || ""}
                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                className="w-full rounded-md border border-theme px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="text"
                placeholder="Phone"
                value={editForm.phone || ""}
                onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                className="w-full rounded-md border border-theme px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="text"
                placeholder="Website"
                value={editForm.website || ""}
                onChange={(e) => setEditForm({ ...editForm, website: e.target.value })}
                className="w-full rounded-md border border-theme px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="text"
                placeholder="Type"
                value={editForm.type || ""}
                onChange={(e) => setEditForm({ ...editForm, type: e.target.value })}
                className="w-full rounded-md border border-theme px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <textarea
                placeholder="Address"
                value={editForm.address || ""}
                onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                className="w-full rounded-md border border-theme px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
              />
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setIsEditModalOpen(false)}
                disabled={editLoading}
                className="rounded-md border border-theme px-5 py-2 text-sm text-primary transition hover:bg-[rgba(255,255,255,0.03)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateVendor}
                disabled={editLoading}
                className="rounded-md bg-blue-600 px-5 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {editLoading ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {deleteModalOpen && deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md rounded-xl border border-theme bg-card p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between border-b pb-3">
              <h2 className="text-lg font-semibold text-[#A855F7]">Delete Vendor</h2>
              <button
                onClick={closeDeleteModal}
                disabled={deleteLoading}
                className="text-secondary transition-colors hover:text-secondary disabled:cursor-not-allowed disabled:opacity-60"
              >
                ✕
              </button>
            </div>
            <p className="text-sm text-secondary">
              Are you sure you want to delete{" "}
              <span className="font-semibold text-primary">{deleteTarget.name}</span>? This action cannot be undone.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={closeDeleteModal}
                disabled={deleteLoading}
                className="rounded-md border border-theme px-4 py-2 text-sm text-primary transition hover:bg-[rgba(255,255,255,0.03)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={deleteLoading}
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {deleteLoading ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Index;
