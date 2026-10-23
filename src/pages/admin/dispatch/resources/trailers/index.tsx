import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Plus, Search, Truck, Trash2, Pencil } from 'lucide-react';
import NewTrailerSidebar from './NewTrailerSidebar';
import {
  listTrailers,
  deleteTrailer,
  searchTrailers,
  getTrailerStats,
  createTrailer,
  updateTrailer,
} from '../../../../../axios/api/distapcher';
import { FaCheckCircle, FaExclamationCircle, FaTimes } from 'react-icons/fa';

interface Trailer {
  _id: string;
  trailer: string;
  internalId: string;
  make?: string;
  model?: string;
  year?: number | string;
  plateNumber: string;
  vinNumber?: string;
  type: string;
  operationStatus: string;
  status: string;
  capacity: string;
  isAttached: boolean;
  currentLocation?: {
    address: string;
    latitude: string;
    longitude: string;
    updatedAt: string;
  };
  cargoDetails?: {
    weight: number;
    isRefrigerated: boolean;
  };
  sensors?: {
    doorStatus: string;
    shockDetection: boolean;
    tilting: boolean;
  };
  maintenance?: {
    tyreCondition: string;
    brakeCondition: string;
    issues: string[];
  };
  company: string;
  route: any[];
  createdAt: string;
  updatedAt: string;
}

interface TrailerStats {
  total: number;
  available: number;
  inTransit: number;
  maintenance: number;
  loading: number;
  idle: number;
}

type NotificationType = 'success' | 'error';

interface ToastNotification {
  id: number;
  type: NotificationType;
  message: string;
}

const ToastNotification = ({ notification, onClose }: { notification: ToastNotification; onClose: (id: number) => void }) => {
  const icons = {
    success: <FaCheckCircle className="text-green-500" size={24} />,
    error: <FaExclamationCircle className="text-red-500" size={24} />,
  };

  const bgColors = {
    success: 'bg-green-50 border-green-200',
    error: 'bg-card border-red-200',
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

const TrailersTable = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [sidebarMode, setSidebarMode] = useState<'create' | 'edit'>('create');
  const [trailers, setTrailers] = useState<Trailer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [stats, setStats] = useState<TrailerStats | null>(null);
  const [editingTrailer, setEditingTrailer] = useState<Trailer | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Trailer | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const trailersRef = useRef<Trailer[]>([]);
  const [notifications, setNotifications] = useState<ToastNotification[]>([]);

  const computeStats = useCallback((data: Trailer[]): TrailerStats => ({
    total: data.length,
    available: data.filter((t: Trailer) => t.operationStatus === 'available').length,
    inTransit: data.filter((t: Trailer) => t.operationStatus === 'in_transit').length,
    maintenance: data.filter((t: Trailer) => t.operationStatus === 'maintenance').length,
    loading: data.filter((t: Trailer) => t.operationStatus === 'loading').length,
    idle: data.filter((t: Trailer) => t.operationStatus === 'idle').length,
  }), []);

  // Fetch trailers data
  const fetchTrailers = useCallback(async () => {
    try {
      setLoading(true);
      const response = await listTrailers();
      if (response.success) {
        const trailersData = response.data || [];
        trailersRef.current = trailersData;
        setTrailers(trailersData);
        setStats((prev: TrailerStats | null) => prev ?? computeStats(trailersData));
      }
    } catch (error) {
      console.error('Error fetching trailers:', error);
    } finally {
      setLoading(false);
    }
  }, [computeStats]);

  // Fetch trailer stats
  const fetchStats = useCallback(async () => {
    try {
      const response = await getTrailerStats();
      if (response.success) {
        setStats(response.data as TrailerStats);
      } else {
        setStats(computeStats(trailersRef.current));
      }
    } catch (error) {
      console.error('Error fetching trailer stats:', error);
      setStats(computeStats(trailersRef.current));
    }
  }, [computeStats]);

  // Search trailers
  const handleSearch = useCallback(async (query: string) => {
    if (query.trim()) {
      try {
        const response = await searchTrailers(query);
        if (response.success) {
          // API returns data as array directly, not nested under trailers
          setTrailers(response.data || []);
        }
      } catch (error) {
        console.error('Error searching trailers:', error);
      }
    } else {
      fetchTrailers();
    }
  }, [fetchTrailers]);

  // Delete trailer
  const openDeleteModal = useCallback((trailer: Trailer) => {
    setDeleteTarget(trailer);
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
      const response = await deleteTrailer(deleteTarget._id);
      if (response.success) {
        setTrailers(prev => prev.filter(trailer => trailer._id !== deleteTarget._id));
        closeDeleteModal();
        fetchStats();
        setNotifications(prev => [...prev, { id: Date.now(), type: 'success', message: response?.message || 'Trailer deleted successfully' }]);
      } else {
        setNotifications(prev => [...prev, { id: Date.now(), type: 'error', message: response?.message || 'Failed to delete trailer' }]);
      }
    } catch (error: any) {
      console.error('Error deleting trailer:', error);
      setNotifications(prev => [...prev, { id: Date.now(), type: 'error', message: error?.message || 'Error deleting trailer' }]);
    } finally {
      setDeleteLoading(false);
    }
  }, [deleteTarget, closeDeleteModal, fetchStats, setNotifications]);


  // Handle sidebar close
  const handleOpenCreateSidebar = useCallback(() => {
    setSidebarMode('create');
    setEditingTrailer(null);
    setIsSidebarOpen(true);
  }, []);

  const handleEditTrailer = useCallback((trailer: Trailer) => {
    setSidebarMode('edit');
    setEditingTrailer(trailer);
    setIsSidebarOpen(true);
  }, []);

  const handleSidebarClose = useCallback(() => {
    setIsSidebarOpen(false);
    setEditingTrailer(null);
    setSidebarMode('create');
  }, []);

  const handleSidebarSubmit = useCallback(
    async (payload: any, trailerId?: string) => {
      try {
        const response =
          sidebarMode === 'edit' && trailerId
            ? await updateTrailer(trailerId, payload)
            : await createTrailer(payload);

        if (response?.success) {
          setNotifications(prev => [...prev, {
            id: Date.now(), type: 'success', message:
              response?.message ||
              (sidebarMode === 'edit' ? 'Trailer updated successfully' : 'Trailer created successfully')
          }]);

          if (sidebarMode === 'edit' && trailerId) {
            setTrailers(prev => prev.map(trailer => (trailer._id === trailerId ? { ...trailer, ...response.data } : trailer)));
          } else if (response?.data) {
            const createdTrailer = response.data;
            setTrailers(prev => {
              if (prev.some(trailer => trailer._id === createdTrailer._id)) {
                return prev;
              }
              return [createdTrailer, ...prev];
            });
          }

          setIsSidebarOpen(false);
          setEditingTrailer(null);
          setSidebarMode('create');
          fetchTrailers();
          fetchStats();
          return true;
        }

        setNotifications(prev => [...prev, { id: Date.now(), type: 'error', message: response?.message || 'Failed to save trailer' }]);
        return false;
      } catch (error: any) {
        setNotifications(prev => [...prev, { id: Date.now(), type: 'error', message: error?.message || 'Failed to save trailer' }]);
        return false;
      }
    },
    [sidebarMode, fetchTrailers, fetchStats, setNotifications]
  );

  const sidebarInitialData = useMemo(() => {
    if (!editingTrailer) return undefined;
    return {
      _id: editingTrailer._id,
      internalId: editingTrailer.internalId || '',
      trailer: editingTrailer.trailer || '',
      make: editingTrailer.make || '',
      model: editingTrailer.model || '',
      year: editingTrailer.year ? String(editingTrailer.year) : '',
      plateNumber: editingTrailer.plateNumber || '',
      vinNumber: editingTrailer.vinNumber || '',
      capacity: editingTrailer.capacity || '',
      type: editingTrailer.type || 'dry_van',
      status: editingTrailer.status || 'stopped',
      operationStatus: editingTrailer.operationStatus || 'available',
      address: editingTrailer.currentLocation?.address || '',
    };
  }, [editingTrailer]);

  useEffect(() => {
    const loadData = async () => {
      await fetchTrailers();
      await fetchStats();
    };
    loadData();
  }, [fetchTrailers, fetchStats]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      handleSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [searchQuery, handleSearch]);

  useEffect(() => {
    if (trailers.length > 0) {
      setStats((prev: TrailerStats | null) => prev ?? computeStats(trailers));
    }
  }, [trailers, computeStats]);

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'moving':
        return 'bg-green-100 text-green-800';
      case 'idle':
        return 'bg-yellow-100 text-yellow-800';
      case 'stopped':
        return 'bg-card text-primary';
      case 'maintenance':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-card text-primary';
    }
  };

  const getOperationStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'available':
        return 'bg-green-100 text-green-800';
      case 'in_transit':
        return 'bg-blue-100 text-blue-800';
      case 'loading':
        return 'bg-yellow-100 text-yellow-800';
      case 'idle':
        return 'bg-card text-primary';
      case 'maintenance':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-card text-primary';
    }
  };

  return (
    <div className="min-h-screen bg-card">
      {/* Main Content */}
      <div className="flex-1">
        {/* Header */}
        <div className="bg-card border-b border-theme px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-semibold text-primary">Trailers</h1>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-secondary" />
                <input
                  type="text"
                  placeholder="Search trailers..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-theme rounded-md w-64 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="flex items-center space-x-3">

              <button
                onClick={handleOpenCreateSidebar}
                className="bg-blue-600 !text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors flex items-center space-x-2"
              >
                <Plus className="w-4 h-4" />
                <span>Add Trailer</span>
              </button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="px-6 py-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-card rounded-lg shadow p-4">
                <div className="flex items-center">
                  <Truck className="w-8 h-8 text-[#00D1FF]" />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-secondary">Total Trailers</p>
                    <p className="text-2xl font-semibold text-primary">{stats.total || 0}</p>
                  </div>
                </div>
              </div>
              <div className="bg-card rounded-lg shadow p-4">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <div className="w-3 h-3 bg-green-600 rounded-full"></div>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-secondary">Available</p>
                    <p className="text-2xl font-semibold text-primary">{stats.available || 0}</p>
                  </div>
                </div>
              </div>
              <div className="bg-card rounded-lg shadow p-4">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-secondary">In Use</p>
                    <p className="text-2xl font-semibold text-primary">{stats.inTransit || 0}</p>
                  </div>
                </div>
              </div>
              <div className="bg-card rounded-lg shadow p-4">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                    <div className="w-3 h-3 bg-yellow-600 rounded-full"></div>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-secondary">Maintenance</p>
                    <p className="text-2xl font-semibold text-primary">{stats.maintenance || 0}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Table */}
        <div className="px-6">
          <div className="bg-card rounded-lg shadow overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-theme">
                  <thead className="bg-card">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                        Trailer
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                        Details
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                        Operation
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                        Location
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-card divide-y divide-theme">
                    {trailers.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-secondary">
                          <div className="flex flex-col items-center space-y-2">
                            <div className="text-5xl text-gray-300">🚛</div>
                            <p>No trailers found.</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      trailers.map((trailer) => (
                        <tr key={trailer._id} className="hover:bg-[rgba(255,255,255,0.03)]">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-10 w-10">
                                <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                                  <Truck className="h-5 w-5 text-[#00D1FF]" />
                                </div>
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-primary">
                                  {trailer.trailer}
                                </div>
                                <div className="text-sm text-secondary">
                                  {trailer.internalId}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-primary">
                              {trailer.type} • {trailer.plateNumber}
                            </div>
                            <div className="text-sm text-secondary">
                              {trailer.capacity}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(trailer.status)}`}>
                              {trailer.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getOperationStatusColor(trailer.operationStatus)}`}>
                              {trailer.operationStatus}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary">
                            {trailer.currentLocation?.address || 'No location'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleEditTrailer(trailer)}
                                className="flex items-center gap-1 px-3 py-1.5 rounded-md border border-blue-200 text-[#00D1FF] hover:bg-blue-50 transition-colors"
                              >
                                <Pencil className="w-4 h-4" /> Update
                              </button>
                              <button
                                onClick={() => openDeleteModal(trailer)}
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
            )}
          </div>
        </div>
      </div>

      {/* Sidebar */}
      <NewTrailerSidebar
        isOpen={isSidebarOpen}
        mode={sidebarMode}
        initialData={sidebarInitialData}
        onClose={handleSidebarClose}
        onSubmit={handleSidebarSubmit}
      />

      {deleteModalOpen && (
        <div className="fixed inset-0 z-[10001] flex items-center justify-center bg-black/40 px-4">
          <div className="bg-card rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="flex items-center gap-3 px-6 py-4 bg-card border-b border-red-100">
              <div className="p-2 bg-red-100 rounded-full">
                <Trash2 className="w-6 h-6 text-[#A855F7]" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-red-800">Delete Trailer</h3>
                <p className="text-sm text-[#A855F7]">
                  This action cannot be undone. Please confirm to delete this trailer.
                </p>
              </div>
            </div>
            <div className="px-6 py-5 space-y-3">
              <p className="text-primary">
                Are you sure you want to delete{' '}
                <span className="font-semibold text-primary">
                  {deleteTarget?.trailer || deleteTarget?.internalId || 'this trailer'}
                </span>
                ?
              </p>
              <p className="text-sm text-secondary">
                The trailer record will be permanently removed and cannot be recovered.
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

      {/* Toast Notifications Container - High z-index */}
      <div className="fixed top-4 right-4 z-[10000] flex flex-col gap-3 max-w-md">
        {notifications.map(notification => (
          <ToastNotification
            key={notification.id}
            notification={notification}
            onClose={() => setNotifications(prev => prev.filter(n => n.id !== notification.id))}
          />
        ))}
      </div>

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
};

export default TrailersTable;
