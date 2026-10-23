import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Plus, Search } from "lucide-react";
import { FaCheckCircle, FaExclamationCircle, FaTimes } from 'react-icons/fa';
import NewPlacesSidebar from "./NewPlacesSidebar";
import {
  listPlace,
  deletePlace,
  updateStatusPlace,
  updatePlace,
} from "../../../../../axios/api/dispatcher.places";

interface Place {
  _id: string;
  name: string;
  street1?: string;
  street2?: string;
  neighbourHood?: string;
  building?: string;
  city?: string;
  state?: string;
  country?: string;
  phone?: string;
  status?: string;
  postalCode?: string;
  securityAccessCodepostalCode?: string;
  currentLocation?: {
    address?: string;
    longitude?: number | null;
    latitude?: number | null;
  };
  createdAt: string;
  updatedAt?: string;
  [key: string]: any;
}

interface ToastNotification {
  id: number;
  type: 'success' | 'error' | 'warning';
  message: string;
}

const ToastNotification = ({ notification, onClose }: { notification: ToastNotification; onClose: (id: number) => void }) => {
  const icons = {
    success: <FaCheckCircle className="text-green-500" size={24} />,
    error: <FaExclamationCircle className="text-red-500" size={24} />,
    warning: <FaExclamationCircle className="text-yellow-500" size={24} />,
  };

  const bgColors = {
    success: 'bg-green-50 border-green-200',
    error: 'bg-card border-red-200',
    warning: 'bg-card border-yellow-200',
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

const Index = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editData, setEditData] = useState<Place | null>(null);
  const [editLoading, setEditLoading] = useState(false);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Place | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [notifications, setNotifications] = useState<ToastNotification[]>([]);
  const notificationIdRef = useRef(0);

  const showToast = useCallback((type: 'success' | 'error' | 'warning', message: string) => {
    const id = notificationIdRef.current++;
    setNotifications((prev) => [...prev, { id, type, message }]);
  }, []);

  const removeNotification = useCallback((id: number) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const fetchPlaces = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listPlace();
      if (res?.success) {
        setPlaces(Array.isArray(res.data) ? res.data : []);
      } else {
        showToast('error', res?.message || "Failed to fetch places");
      }
    } catch (error: any) {
      console.error("Error fetching places:", error);
      showToast('error', error?.message || "Failed to fetch places");
      setPlaces([]);
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchPlaces();
  }, [fetchPlaces]);

  const openEditModal = useCallback((place: Place) => {
    setEditData({ ...place });
    setEditModalOpen(true);
  }, []);

  const closeEditModal = useCallback(() => {
    setEditModalOpen(false);
    setEditData(null);
    setEditLoading(false);
  }, []);

  const handleEditSave = useCallback(async () => {
    if (!editData) return;
    setEditLoading(true);
    try {
      const res = await updatePlace(editData._id, editData);
      if (res?.success) {
        showToast('success', res.message || "Place updated successfully");
        closeEditModal();
        fetchPlaces();
      } else {
        showToast('error', res?.message || "Update failed");
      }
    } catch (error: any) {
      console.error("Error updating place:", error);
      showToast('error', error?.message || "Update failed");
    } finally {
      setEditLoading(false);
    }
  }, [editData, closeEditModal, fetchPlaces, showToast]);

  const openDeleteModal = useCallback((place: Place) => {
    setDeleteTarget(place);
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
      const res = await deletePlace(deleteTarget._id);
      if (res?.success) {
        showToast('success', res.message || "Place deleted successfully");
        closeDeleteModal();
        fetchPlaces();
      } else {
        showToast('error', res?.message || "Delete failed");
      }
    } catch (error: any) {
      console.error("Error deleting place:", error);
      showToast('error', error?.message || "Delete failed");
    } finally {
      setDeleteLoading(false);
    }
  }, [deleteTarget, closeDeleteModal, fetchPlaces, showToast]);

  const handleStatusUpdate = useCallback(
    async (id: string) => {
      try {
        const res = await updateStatusPlace(id);
        if (res?.success) {
          showToast('success', res.message || "Status updated");
          fetchPlaces();
        } else {
          showToast('error', res?.message || "Status update failed");
        }
      } catch (error: any) {
        console.error("Error updating status:", error);
        showToast('error', error?.message || "Status update failed");
      }
    },
    [fetchPlaces, showToast]
  );

  const filteredPlaces = useMemo(
    () => {
      if (!search) return places;
      const searchLower = search.toLowerCase();
      return places.filter((place) => {
        const searchableFields = [
          place?.name,
          place?.street1,
          place?.street2,
          place?.neighbourHood,
          place?.building,
          place?.city,
          place?.state,
          place?.country,
          place?.phone,
          place?.postalCode,
          place?.securityAccessCodepostalCode,
          place?.currentLocation?.address,
        ].filter(Boolean).join(" ").toLowerCase();
        return searchableFields.includes(searchLower);
      });
    },
    [places, search]
  );

  return (
    <div className="min-h-screen bg-main">
      {/* Toast Notifications */}
      <div className="fixed top-4 right-4 z-[10000] space-y-2">
        {notifications.map((notification) => (
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
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-semibold text-primary">Places</h1>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-secondary" />
                <input
                  type="text"
                  placeholder="Search Places"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-theme rounded-md w-64 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="flex items-center space-x-3">

              <button
                onClick={() => setIsSidebarOpen(true)}
                style={{
                  background: 'var(--accent-navyblue)',
                }}
                className="!text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors flex items-center space-x-2"
              >
                <Plus className="w-4 h-4" />
                <span>Create Place</span>
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
                      <th className="px-6 py-3 text-xs font-medium text-secondary uppercase text-left">Name</th>
                      <th className="px-6 py-3 text-xs font-medium text-secondary uppercase text-left">Full Address</th>
                      <th className="px-6 py-3 text-xs font-medium text-secondary uppercase text-left">Phone</th>
                      <th className="px-6 py-3 text-xs font-medium text-secondary uppercase text-left">Country</th>
                      <th className="px-6 py-3 text-xs font-medium text-secondary uppercase text-left">Status</th>
                      <th className="px-6 py-3 text-xs font-medium text-secondary uppercase text-left">Created At</th>
                      <th className="px-6 py-3 text-xs font-medium text-secondary uppercase text-left">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-theme">
                    {filteredPlaces.length > 0 ? (
                      filteredPlaces.map((place) => {
                        // Build full address from all available fields
                        const addressParts = [
                          place.street1,
                          place.street2,
                          place.neighbourHood,
                          place.building,
                          place.city,
                          place.state,
                        ].filter(Boolean);

                        const hasManualAddress = addressParts.length > 0;
                        const fullAddress = hasManualAddress
                          ? addressParts.join(", ")
                          : place.currentLocation?.address || "N/A";

                        const postalCode = place.postalCode || place.securityAccessCodepostalCode || "N/A";

                        return (
                          <tr key={place._id} className="hover:bg-[rgba(255,255,255,0.03)]">
                            <td className="px-6 py-4 text-sm text-primary font-medium">{place.name || "N/A"}</td>
                            <td className="px-6 py-4 text-sm text-secondary">
                              <div className="max-w-xs">
                                <div className="font-medium text-primary mb-1">{fullAddress}</div>
                                {postalCode !== "N/A" && (
                                  <div className="text-xs text-secondary">Postal: {postalCode}</div>
                                )}
                                {!hasManualAddress && place.currentLocation?.address && (
                                  <div className="text-xs text-secondary mt-1">
                                    Coordinates: {place.currentLocation.address}
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4 text-sm text-secondary">{place.phone || "N/A"}</td>
                            <td className="px-6 py-4 text-sm text-secondary">{place.country || "N/A"}</td>
                            <td className="px-6 py-4 text-sm">
                              <span
                                onClick={() => handleStatusUpdate(place._id)}
                                className={`cursor-pointer px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${place.status === "active"
                                  ? "bg-green-100 text-green-800"
                                  : "bg-red-100 text-red-800"
                                  }`}
                              >
                                {place.status || "N/A"}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-sm text-secondary">
                              {place.createdAt ? new Date(place.createdAt).toLocaleDateString() : "N/A"}
                            </td>
                            <td className="px-6 py-4 text-sm text-secondary">
                              <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2">
                                <button
                                  className="inline-flex items-center justify-center rounded-md border border-blue-200 bg-card px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100 transition-colors"
                                  onClick={() => openEditModal(place)}
                                >
                                  Edit
                                </button>
                                <button
                                  className="inline-flex items-center justify-center rounded-md border border-red-200 bg-card px-3 py-1.5 text-xs font-medium text-[#A855F7] hover:bg-red-100 transition-colors"
                                  onClick={() => openDeleteModal(place)}
                                >
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={7} className="px-6 py-4 text-center text-secondary">
                          No places found
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

      {/* Sidebar Component */}
      <NewPlacesSidebar
        isOpen={isSidebarOpen}
        onClose={() => {
          setIsSidebarOpen(false);
          fetchPlaces();
        }}
      />

      {editModalOpen && editData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-lg rounded-xl border border-theme bg-card p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between border-b pb-3">
              <h2 className="text-lg font-semibold text-primary">Edit Place</h2>
              <button
                onClick={closeEditModal}
                disabled={editLoading}
                className="text-secondary transition-colors hover:text-secondary disabled:cursor-not-allowed disabled:opacity-60"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
              <div>
                <label className="block text-sm font-medium text-primary">Name *</label>
                <input
                  type="text"
                  value={editData.name || ""}
                  onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                  className="mt-1 w-full rounded-md border border-theme px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-primary">Street 1</label>
                <input
                  type="text"
                  value={editData.street1 || ""}
                  onChange={(e) => setEditData({ ...editData, street1: e.target.value })}
                  className="mt-1 w-full rounded-md border border-theme px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-primary">Street 2</label>
                <input
                  type="text"
                  value={editData.street2 || ""}
                  onChange={(e) => setEditData({ ...editData, street2: e.target.value })}
                  className="mt-1 w-full rounded-md border border-theme px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-primary">Neighbourhood</label>
                  <input
                    type="text"
                    value={editData.neighbourHood || ""}
                    onChange={(e) => setEditData({ ...editData, neighbourHood: e.target.value })}
                    className="mt-1 w-full rounded-md border border-theme px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-primary">Building</label>
                  <input
                    type="text"
                    value={editData.building || ""}
                    onChange={(e) => setEditData({ ...editData, building: e.target.value })}
                    className="mt-1 w-full rounded-md border border-theme px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-primary">City</label>
                  <input
                    type="text"
                    value={editData.city || ""}
                    onChange={(e) => setEditData({ ...editData, city: e.target.value })}
                    className="mt-1 w-full rounded-md border border-theme px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-primary">State</label>
                  <input
                    type="text"
                    value={editData.state || ""}
                    onChange={(e) => setEditData({ ...editData, state: e.target.value })}
                    className="mt-1 w-full rounded-md border border-theme px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-primary">Postal Code / Security Access Code</label>
                  <input
                    type="text"
                    value={editData.postalCode || editData.securityAccessCodepostalCode || ""}
                    onChange={(e) => setEditData({
                      ...editData,
                      postalCode: e.target.value,
                      securityAccessCodepostalCode: e.target.value
                    })}
                    className="mt-1 w-full rounded-md border border-theme px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-primary">Country</label>
                  <input
                    type="text"
                    value={editData.country || ""}
                    onChange={(e) => setEditData({ ...editData, country: e.target.value })}
                    className="mt-1 w-full rounded-md border border-theme px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-primary">Phone</label>
                <input
                  type="text"
                  value={editData.phone || ""}
                  onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                  className="mt-1 w-full rounded-md border border-theme px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={closeEditModal}
                disabled={editLoading}
                className="rounded-md border border-theme px-4 py-2 text-sm text-primary transition hover:bg-[rgba(255,255,255,0.03)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                onClick={handleEditSave}
                disabled={editLoading}
                style={{
                  background: 'var(--accent-navyblue)',
                }}
                className="rounded-md  px-4 py-2 text-sm font-medium !text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {editLoading ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteModalOpen && deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-xl border border-theme bg-card p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between border-b pb-3">
              <h2 className="text-lg font-semibold text-[#A855F7]">Delete Place</h2>
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
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium !text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
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
