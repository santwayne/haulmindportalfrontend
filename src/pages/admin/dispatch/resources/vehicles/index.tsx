import { useState, useEffect, useMemo, useCallback } from 'react';
import { Plus, Trash2, Search, Pencil } from 'lucide-react';
import { ChevronLeft, ChevronRight } from "lucide-react";
import { FaCheckCircle, FaExclamationCircle, FaInfoCircle, FaTimes, } from 'react-icons/fa';
import NewVehicleSidebar from './NewVehicleSidebar';
import { listVehicle, deleteVehicle, updateVehicle, createVehicle } from '../../../../../axios/api/distapcher';

export interface Vehicle {
  _id: string;
  internalId?: string;
  plateNumber?: string;
  vinNumber?: string;
  make?: string;
  model?: string;
  year?: string;
  status?: string;
  currentLocation?: { address?: string };
  vehicleImage?: Array<{ imageUrl: string }>;
}

type NotificationType = 'success' | 'error' | 'warning';

interface ToastNotification {
  id: number;
  type: NotificationType;
  message: string;
}

const ToastNotification = ({ notification, onClose }: { notification: ToastNotification; onClose: (id: number) => void }) => {
  const icons = {
    success: <FaCheckCircle className="text-green-500" size={24} />,
    error: <FaExclamationCircle className="text-red-500" size={24} />,
    warning: <FaInfoCircle className="text-yellow-500" size={24} />,
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

const VehiclesTable = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [sidebarMode, setSidebarMode] = useState<'create' | 'edit'>('create');
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Vehicle | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [userInfo, setUserInfo] = useState<any>(() => {
    try {
      const stored = localStorage.getItem('userInfo');
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.error('Error parsing userInfo from localStorage:', error);
      return null;
    }
  });
  const [notifications, setNotifications] = useState<ToastNotification[]>([]);

  const addNotification = useCallback((type: NotificationType, message: string) => {
    const id = Date.now();
    setNotifications(prev => [...prev, { id, type, message }]);
  }, []);

  const removeNotification = useCallback((id: number) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const fetchVehicles = useCallback(async (page: number, limit: number, search: string) => {
    setLoading(true);
    try {
      const res = await listVehicle({
        page,
        limit,
        search: search.trim() || undefined,
        sortBy: 'createdAt',
        sortOrder: 'desc'
      });

      if (res?.success) {
        const data = Array.isArray(res?.data?.vehicles)
          ? res.data.vehicles
          : Array.isArray(res?.data)
            ? res.data
            : [];

        setVehicles(data);

        // Update pagination info
        if (res?.pagination) {
          setTotal(res.pagination.total || 0);
          setTotalPages(res.pagination.pages || 0);
          setCurrentPage(res.pagination.current || 1);
        }
      } else {
        setVehicles([]);
        setTotal(0);
        setTotalPages(0);
      }
    } catch (error: any) {
      console.error('Error fetching vehicles:', error);
      setVehicles([]);
      setTotal(0);
      setTotalPages(0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key === 'userInfo' && event.newValue) {
        try {
          setUserInfo(JSON.parse(event.newValue));
        } catch (error) {
          console.error('Error parsing userInfo from storage event:', error);
        }
      }
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  useEffect(() => {
    fetchVehicles(currentPage, pageSize, searchQuery);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, pageSize, userInfo]);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      if (currentPage === 1) {
        fetchVehicles(1, pageSize, searchQuery);
      } else {
        setCurrentPage(1); // Reset to first page on search
      }
    }, 500); // 500ms debounce

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  const getStatusColor = (status: string) => {
    if (!status) {
      return 'bg-card text-primary';
    }

    switch (status.toLowerCase()) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'inactive':
        return 'bg-red-100 text-red-800';
      case 'stopped':
        return 'bg-card text-primary';
      case 'maintenance':
        return 'bg-yellow-100 text-yellow-800';
      case 'moving':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-card text-primary';
    }
  };

  // Server-side search is now handled, so we just use vehicles directly
  const displayedVehicles = vehicles;

  // Handle different userInfo structures (userData.company or direct company)
  const userRole = userInfo?.role || userInfo?.userData?.role;
  const userCompany = userInfo?.company || userInfo?.userData?.company;
  const isSuperadmin = userRole === 'superadmin';
  const isDispatcher = userRole === 'dispatcher';
  const hasCompany = Boolean(userCompany);
  // Allow dispatchers to create vehicles - backend will use their company from database
  const canCreateVehicle = isSuperadmin || hasCompany || isDispatcher;

  const handleOpenCreateSidebar = useCallback(() => {
    if (!canCreateVehicle) {
      addNotification('warning', 'Assign a company to this account or use a superadmin role to create vehicles.');
      return;
    }
    setSidebarMode('create');
    setEditingVehicle(null);
    setIsSidebarOpen(true);
  }, [canCreateVehicle, addNotification]);

  const handleEditVehicle = useCallback((vehicle: Vehicle) => {
    setSidebarMode('edit');
    setEditingVehicle(vehicle);
    setIsSidebarOpen(true);
  }, []);

  const handleSidebarSubmit = useCallback(
    async (vehiclePayload: FormData, vehicleId?: string) => {
      try {
        const response =
          sidebarMode === 'edit' && vehicleId
            ? await updateVehicle(vehicleId, vehiclePayload)
            : await createVehicle(vehiclePayload);

        if (response?.success) {
          addNotification('success',
            response?.message ||
            (sidebarMode === 'edit'
              ? 'Vehicle updated successfully'
              : 'Vehicle created successfully')
          );
          setIsSidebarOpen(false);
          setEditingVehicle(null);
          setSidebarMode('create');
          fetchVehicles(currentPage, pageSize, searchQuery);
        } else {
          addNotification('error', response?.message || 'Failed to save vehicle');
        }
      } catch (error: any) {
        const rawMessage = error?.response?.data?.message || error?.message;
        if (rawMessage?.toLowerCase()?.includes('permission')) {
          addNotification('error', 'You do not have permission to update this vehicle. Please contact an administrator.');
        } else {
          addNotification('error', rawMessage || 'Failed to save vehicle');
        }
      }
    },
    [fetchVehicles, sidebarMode, addNotification]
  );

  const openDeleteModal = useCallback((vehicle: Vehicle) => {
    setDeleteTarget(vehicle);
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
      const res = await deleteVehicle(deleteTarget._id);
      if (res?.success) {
        addNotification('success', res?.message || 'Vehicle deleted successfully');
        setVehicles(prev => prev.filter(vehicle => vehicle._id !== deleteTarget._id));
        closeDeleteModal();
      } else {
        addNotification('error', res?.message || 'Failed to delete vehicle');
      }
    } catch (error: any) {
      addNotification('error', error?.message || 'Failed to delete vehicle');
    } finally {
      setDeleteLoading(false);
    }
  }, [deleteTarget, closeDeleteModal, addNotification]);

  const handleSidebarClose = useCallback(() => {
    setIsSidebarOpen(false);
    setEditingVehicle(null);
    setSidebarMode('create');
  }, []);

  const sidebarInitialData = useMemo(() => {
    if (!editingVehicle) return undefined;
    return {
      _id: editingVehicle._id,
      internalId: editingVehicle.internalId || '',
      plateNumber: editingVehicle.plateNumber || '',
      vinNumber: editingVehicle.vinNumber || '',
      make: editingVehicle.make || '',
      model: editingVehicle.model || '',
      year: editingVehicle.year || '',
      status: editingVehicle.status || 'stopped',
      address: (editingVehicle as any)?.address || editingVehicle.currentLocation?.address || '',
    };
  }, [editingVehicle]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-card">
      {/* Toast Notifications Container - High z-index */}
      <div className="fixed top-4 right-4 z-[10000] flex flex-col gap-3 max-w-md">
        {notifications.map(notification => (
          <ToastNotification
            key={notification.id}
            notification={notification}
            onClose={removeNotification}
          />
        ))}
      </div>

      <div className="bg-card border-b border-theme px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h1 className="text-2xl font-semibold text-primary">Vehicles</h1>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-secondary" />
            <input
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search vehicles..."
              className="pl-10 pr-4 py-2 border border-theme rounded-md w-64 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        <div className="flex items-center space-x-3">

          <button
            onClick={handleOpenCreateSidebar}
            className={`px-4 py-2 rounded-md flex items-center space-x-2 transition-colors ${canCreateVehicle ? 'bg-blue-600 !text-white hover:bg-blue-700' : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
              }`}
          >
            <Plus className="w-4 h-4" />
            <span>Create Vehicle</span>
          </button>
        </div>
      </div>

      <div className="p-6">
        <div className="bg-card rounded-lg shadow-sm border border-theme overflow-auto">
          <table className="w-full min-w-[1200px]">
            <thead className="bg-card border-b border-theme">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">Internal ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">Plate Number</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">VIN</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">Make</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">Model</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">Year</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">Location</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">Images</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-theme">
              {displayedVehicles.length > 0 && (
                displayedVehicles.map((vehicle) => (
                  <tr key={vehicle._id} className="hover:bg-[rgba(255,255,255,0.03)]">
                    <td className="px-6 py-4 text-sm text-secondary font-mono">{vehicle.internalId}</td>
                    <td className="px-6 py-4 text-sm text-secondary font-mono">{vehicle.plateNumber}</td>
                    <td className="px-6 py-4 text-sm text-secondary">{vehicle.vinNumber}</td>
                    <td className="px-6 py-4 text-sm text-secondary">{vehicle.make}</td>
                    <td className="px-6 py-4 text-sm text-secondary">{vehicle.model}</td>
                    <td className="px-6 py-4 text-sm text-secondary">{vehicle.year}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(vehicle.status || '')}`}>
                        {vehicle.status || 'unknown'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-secondary">{vehicle.currentLocation?.address || '-'}</td>
                    <td className="px-6 py-4">
                      {vehicle.vehicleImage && vehicle.vehicleImage.length > 0 ? (
                        <div className="flex space-x-2">
                          {vehicle.vehicleImage.map((img: any, idx: number) => (
                            <img
                              key={idx}
                              src={(img.imageUrl || '').replace(/\\/g, '/')}
                              alt="Vehicle"
                              className="h-20 w-20 object-cover rounded border"
                            />
                          ))}
                        </div>
                      ) : '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-secondary">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEditVehicle(vehicle)}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-md border border-blue-200 text-[#00D1FF] hover:bg-blue-50 transition-colors"
                        >
                          <Pencil className="w-4 h-4" /> Update
                        </button>
                        <button
                          onClick={() => openDeleteModal(vehicle)}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-md border border-red-200 text-[#A855F7] hover:bg-red-50 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" /> Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 0 && (
          <div className="mt-6 flex items-center justify-between px-6 py-4 bg-card border-t border-theme">
            <div className="flex items-center gap-2 text-sm text-primary">
              <span>Showing</span>
              <span className="font-medium">
                {((currentPage - 1) * pageSize) + 1}
              </span>
              <span>to</span>
              <span className="font-medium">
                {Math.min(currentPage * pageSize, total)}
              </span>
              <span>of</span>
              <span className="font-medium">{total}</span>
              <span>vehicles</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  if (currentPage > 1) {
                    setCurrentPage(currentPage - 1);
                  }
                }}
                disabled={currentPage === 1 || loading}
                className="px-3 py-2 text-sm font-medium text-primary bg-card border border-theme rounded-md hover:bg-[rgba(255,255,255,0.03)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
              >
                <ChevronLeft className="w-4 h-4" />
                Previous
              </button>

              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 7) {
                    pageNum = i + 1;
                  } else if (currentPage <= 4) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 3) {
                    pageNum = totalPages - 6 + i;
                  } else {
                    pageNum = currentPage - 3 + i;
                  }

                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      disabled={loading}
                      className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${currentPage === pageNum
                          ? 'bg-blue-600 text-white'
                          : 'text-primary bg-card border border-theme hover:bg-[rgba(255,255,255,0.03)]'
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => {
                  if (currentPage < totalPages) {
                    setCurrentPage(currentPage + 1);
                  }
                }}
                disabled={currentPage === totalPages || loading}
                className="px-3 py-2 text-sm font-medium text-primary bg-card border border-theme rounded-md hover:bg-[rgba(255,255,255,0.03)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </button>

              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                disabled={loading}
                className="ml-4 px-3 py-2 text-sm font-medium text-primary bg-card border border-theme rounded-md hover:bg-[rgba(255,255,255,0.03)] focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value={10}>10 per page</option>
                <option value={25}>25 per page</option>
                <option value={50}>50 per page</option>
                <option value={100}>100 per page</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Sidebar */}
      <NewVehicleSidebar
        isOpen={isSidebarOpen}
        mode={sidebarMode}
        initialData={sidebarInitialData}
        onClose={handleSidebarClose}
        onSubmit={handleSidebarSubmit}
      />

      {/* Delete Confirmation Modal */}
      {deleteModalOpen && (
        <div className="fixed inset-0 z-[10001] flex items-center justify-center bg-black/40 px-4">
          <div className="bg-card rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="flex items-center gap-3 px-6 py-4 bg-card border-b border-red-100">
              <div className="p-2 bg-red-100 rounded-full">
                <Trash2 className="w-6 h-6 text-[#A855F7]" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-red-800">Delete Vehicle</h3>
                <p className="text-sm text-[#A855F7]">
                  This action cannot be undone. Please confirm to delete this vehicle.
                </p>
              </div>
            </div>
            <div className="px-6 py-5 space-y-3">
              <p className="text-primary">
                Are you sure you want to delete{' '}
                <span className="font-semibold text-primary">{deleteTarget?.internalId || deleteTarget?.plateNumber || 'this vehicle'}</span>
                ?
              </p>
              <p className="text-sm text-secondary">
                The vehicle record will be permanently removed and cannot be recovered.
              </p>
            </div>
            <div className="px-6 py-4 bg-card border-t border-theme flex justify-end gap-3">
              <button
                onClick={closeDeleteModal}
                disabled={deleteLoading}
                className="px-5 py-2.5 text-primary bg-card border border-theme rounded-md hover:bg-[rgba(255,255,255,0.03)] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={deleteLoading}
                className="px-5 py-2.5 bg-red-600 !text-white font-semibold rounded-md hover:bg-red-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {deleteLoading ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VehiclesTable;

