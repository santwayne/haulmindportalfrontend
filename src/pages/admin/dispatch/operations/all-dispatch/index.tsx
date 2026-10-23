import { useState, useEffect, useCallback } from "react";
import { 
  FaTruck, FaUser, FaFilter, FaEye, FaCheck
} from 'react-icons/fa';
import AssignDriverTruckModal from "../../../../../components/dispatch/AssignDriverTruckModal";
import StepTracker from "../../../../../components/dispatch/StepTracker";
import { listLoad, assignDriverTruck } from "../../../../../axios/api/distapcher";

interface Load {
  _id: string;
  loadNumber?: string;
  orderNumber?: string;
  customer?: string;
  customerName?: string;
  rate?: number;
  amount?: number;
  status: 'planned' | 'dispatched' | 'in-delivery' | 'delivered' | 'completed';
  assignedDriver?: string;
  assignedTruck?: string;
  assignedTrailer?: string;
  plannedDate?: string;
  route?: {
    multipleDropOffs?: boolean;
    selectPickup?: { place?: string; latitude?: string; longitude?: string };
    selectDropOff?: { place?: string; latitude?: string; longitude?: string };
    selectReturn?: string | null;
    wayPoints?: Array<{
      address?: { place?: string; latitude?: string; longitude?: string } | string;
      customer?: string;
      dropOff?: boolean;
      pickup?: boolean;
    }>;
  };
  shipperCity?: string;
  shipperState?: string;
  receiverCity?: string;
  receiverState?: string;
}

const AllDispatch = () => {
  const [loads, setLoads] = useState<Load[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedLoad, setSelectedLoad] = useState<Load | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [emptyStateMessage, setEmptyStateMessage] = useState<string | null>(null);
  const [userInfo, setUserInfo] = useState<any>(null);

  useEffect(() => {
    const syncUserInfo = () => {
      try {
        const stored = localStorage.getItem('userInfo');
        if (stored) {
          setUserInfo(JSON.parse(stored));
        }
      } catch (error) {
        console.error('Error parsing userInfo from localStorage:', error);
      }
    };

    syncUserInfo();

    const handleStorage = (event: StorageEvent) => {
      if (event.key === 'userInfo') {
        syncUserInfo();
        fetchLoads();
      }
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchLoads = useCallback(
    async (options?: { suppressLoading?: boolean; search?: string }) => {
      if (!options?.suppressLoading) {
        setLoading(true);
      }
      try {
        let currentUser = userInfo;
        if (!currentUser) {
          const stored = localStorage.getItem('userInfo');
          if (stored) {
            try {
              currentUser = JSON.parse(stored);
            } catch (err) {
              console.error('Error parsing userInfo from localStorage during fetch:', err);
            }
          }
        }

        // Handle different userInfo structures (userData.company or direct company)
        const userRole = currentUser?.role || currentUser?.userData?.role;
        const userCompany = currentUser?.company || currentUser?.userData?.company;
        const isSuperadmin = userRole === 'superadmin';
        const isDispatcher = userRole === 'dispatcher';
        const hasCompany = Boolean(userCompany);

        // Allow dispatchers to call API even if company is not visible in localStorage
        // The backend will handle company filtering based on the authenticated user
        if (!isSuperadmin && !isDispatcher && !hasCompany) {
          setLoads([]);
          setEmptyStateMessage('No company assigned. Please complete company settings to view loads.');
          return;
        }

        const response = await listLoad();
        const message = response?.message || null;
        const data = response?.data;

        if (response?.success && Array.isArray(data)) {
          if (data.length === 0) {
            setLoads([]);
            setEmptyStateMessage(message || 'No loads available.');
            return;
          }

          const formattedLoads = data.map((load: any) => {
            // Extract shipper city/state - from pickup location
            let shipperCity = '';
            let shipperState = '';
            if (load.route?.multipleDropOffs && load.route?.wayPoints) {
              // Find first pickup waypoint
              const pickupWaypoint = load.route.wayPoints.find((wp: any) => wp.pickup);
              if (pickupWaypoint) {
                const address =
                  typeof pickupWaypoint.address === 'string'
                    ? pickupWaypoint.address
                    : pickupWaypoint.address?.place || '';
                const parts = address.split(',').map((p: string) => p.trim());
                shipperCity = parts[0] || '';
                shipperState = parts[1] || '';
              }
            } else if (load.route?.selectPickup?.place) {
              const parts = load.route.selectPickup.place.split(',').map((p: string) => p.trim());
              shipperCity = parts[0] || '';
              shipperState = parts[1] || '';
            }

            // Extract receiver city/state - from dropoff location
            let receiverCity = '';
            let receiverState = '';
            if (load.route?.multipleDropOffs && load.route?.wayPoints) {
              // Find last dropoff waypoint
              const dropoffWaypoints = load.route.wayPoints.filter((wp: any) => wp.dropOff);
              if (dropoffWaypoints.length > 0) {
                const lastDropoff = dropoffWaypoints[dropoffWaypoints.length - 1];
                const address =
                  typeof lastDropoff.address === 'string'
                    ? lastDropoff.address
                    : lastDropoff.address?.place || '';
                const parts = address.split(',').map((p: string) => p.trim());
                receiverCity = parts[0] || '';
                receiverState = parts[1] || '';
              }
            } else if (load.route?.selectDropOff?.place) {
              const parts = load.route.selectDropOff.place.split(',').map((p: string) => p.trim());
              receiverCity = parts[0] || '';
              receiverState = parts[1] || '';
            }

            return {
              _id: load._id,
              loadNumber: load.loadNumber || load.details?.internalId || load._id,
              orderNumber: load.orderNumber || load.details?.internalId || load._id,
              customer: load.customerName || load.details?.customer?.name || 'N/A',
              customerName: load.customerName || load.details?.customer?.name || 'N/A',
              amount: load.amount || load.details?.amount || load.rate || load.details?.rate || 0,
              rate: load.rate || load.details?.rate || load.amount || load.details?.amount || 0,
              status: load.status || 'planned',
              assignedDriver: load.details?.driver?.name || load.driverName || null,
              assignedTruck: load.details?.vehicle?.plateNumber || load.vehiclePlate || null,
              assignedTrailer: load.details?.trailer?.plateNumber || load.trailerPlate || null,
              route: load.route || {},
              receiver: load.details?.receiver || load.receiver || null,
              customerEmail: load.details?.customer?.email || load.customerEmail || null,
              shipperCity,
              shipperState,
              receiverCity,
              receiverState,
              plannedDate: load.assignedAt ? new Date(load.assignedAt).toISOString().split('T')[0] : undefined,
            };
          });
          setLoads(formattedLoads);
          setEmptyStateMessage(null);
        } else {
          setLoads([]);
          setEmptyStateMessage(message || 'Failed to fetch loads.');
        }
      } catch (error) {
        console.error('Error fetching loads:', error);
        setLoads([]);
        setEmptyStateMessage('Failed to fetch loads: ' + (error as any)?.message);
      } finally {
        if (!options?.suppressLoading) {
          setLoading(false);
        }
      }
    },
    [userInfo]
  );

  useEffect(() => {
    fetchLoads();
  }, [fetchLoads, userInfo?.company]);

  const handleAssign = async (loadId: string, driverId: string, truckId: string, trailerId?: string, planDate?: string) => {
    try {
      // Check if the selected load is in 'planned' status
      if (selectedLoad?.status !== 'planned') {
        alert('Only loads with "Planned" status can be assigned a driver and truck.');
        return;
      }
  
      const response = await assignDriverTruck(loadId, driverId, truckId, trailerId, planDate);
      if (response && response.success) {
        // Refresh the loads list after successful assignment
        await fetchLoads({ suppressLoading: true });
        setShowAssignModal(false);
        setSelectedLoad(null);
      } else {
        alert(response?.message || 'Failed to assign driver and truck');
      }
    } catch (error: any) {
      console.error('Error assigning driver and truck:', error);
      alert(error?.message || 'Failed to assign driver and truck');
    }
  };

  const handleLoadClick = (load: Load) => {
    // Open modal for all statuses to view details
    setSelectedLoad(load);
    setShowAssignModal(true);
  };

  const getStatusBadge = (status: Load['status']) => {
    const statusConfig = {
      planned: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Planned' },
      dispatched: { bg: 'bg-purple-100', text: 'text-purple-800', label: 'Dispatched' },
      'in-delivery': { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'In Delivery' },
      delivered: { bg: 'bg-orange-100', text: 'text-orange-800', label: 'Delivered' },
      completed: { bg: 'bg-green-100', text: 'text-green-800', label: 'Completed' },
    };

    const config = statusConfig[status] || statusConfig.planned;
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    );
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const filteredLoads = statusFilter === 'all' 
    ? loads 
    : loads.filter(load => load.status === statusFilter);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-card p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-primary">All Dispatch</h1>
          <p className="text-secondary mt-1">Assign drivers and trucks to loads</p>
        </div>
        <div className="flex items-center gap-3">
          <FaFilter className="text-secondary" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Status</option>
            <option value="planned">Planned</option>
            <option value="dispatched">Dispatched</option>
            <option value="in-delivery">In Delivery</option>
            <option value="delivered">Delivered</option>
            <option value="completed">Completed</option>
          </select>
        </div>
      </div>

      {emptyStateMessage && filteredLoads.length === 0 && (
        <div className="mb-4 bg-card border border-blue-100 text-blue-700 px-4 py-3 rounded-lg shadow-sm flex items-center gap-3">
          <FaTruck className="text-blue-500" />
          <span className="text-sm">{emptyStateMessage}</span>
        </div>
      )}

      {/* Step Tracker */}
      <div className="bg-card rounded-xl shadow-lg p-6 mb-6">
        <h3 className="text-lg font-semibold text-primary mb-4">Dispatch Workflow</h3>
        <StepTracker currentStep="assigned" />
      </div>

      {/* Loads Table */}
      <div className="bg-card rounded-xl shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-card border-b border-theme">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-primary uppercase tracking-wider">
                  Load #
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-primary uppercase tracking-wider">
                  Order #
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-primary uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-primary uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-primary uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-primary uppercase tracking-wider">
                  Workflow Progress
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-primary uppercase tracking-wider">
                  Driver / Truck / Trailer
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-primary uppercase tracking-wider">
                  Route
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-primary uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-card divide-y divide-theme">
              {filteredLoads.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-secondary">
                    <FaTruck className="mx-auto mb-3 text-gray-300" size={48} />
                    <p className="text-lg font-medium">No loads available</p>
                    <p className="text-sm">{emptyStateMessage || 'Create or import loads to see them listed here.'}</p>
                  </td>
                </tr>
              ) : (
                filteredLoads.map((load) => (
                  <tr
                    key={load._id}
                    className="hover:bg-blue-50 transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <FaTruck className="text-[#00D1FF]" size={16} />
                        <span className="font-semibold text-[#00D1FF]">{load.loadNumber || load._id}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-primary">
                      {load.orderNumber || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-primary">
                      {load.customer || load.customerName || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-green-600 font-bold">
                        {formatCurrency(load.amount || load.rate || 0)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(load.status)}
                    </td>
                    <td className="px-6 py-4">
                      <StepTracker 
                        currentStep={load.status === 'planned' ? 'planned' : load.status === 'dispatched' ? 'dispatched' : load.status || 'planned'} 
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {load.assignedDriver ? (
                        <div className="flex flex-col gap-1 text-sm">
                          <div className="flex items-center gap-1 text-primary">
                            <FaUser size={12} />
                            <span>{load.assignedDriver}</span>
                          </div>
                          {load.assignedTruck && (
                            <div className="flex items-center gap-1 text-primary">
                              <FaTruck size={12} />
                              <span>{load.assignedTruck}</span>
                              {load.assignedTrailer && <span className="text-secondary">/ {load.assignedTrailer}</span>}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-secondary italic text-sm">Not assigned</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-primary">
                        {load.route?.multipleDropOffs ? (
                          <div className="text-xs space-y-0.5">
                            {load.route.wayPoints && load.route.wayPoints.length > 0 ? (
                              load.route.wayPoints.map((wp: any, idx: number) => {
                                const address = typeof wp.address === 'string' 
                                  ? wp.address 
                                  : wp.address?.place || 'N/A';
                                const addressParts = address.split(',');
                                const cityName = addressParts[0]?.trim() || address;
                                return (
                                  <div key={idx} className="text-secondary flex items-center gap-1">
                                    {wp.pickup ? '📦' : wp.dropOff ? '📬' : '📍'} {cityName}
                                  </div>
                                );
                              })
                            ) : (
                              <span className="text-secondary italic text-xs">No waypoints</span>
                            )}
                          </div>
                        ) : (
                          <div>
                            {load.route?.selectPickup?.place || 'N/A'} → {load.route?.selectDropOff?.place || 'N/A'}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {load.status === 'planned' ? (
                        <button
                          onClick={() => handleLoadClick(load)}
                          className="px-3 py-1.5 bg-blue-600 !text-white text-sm rounded-lg hover:bg-blue-700 flex items-center gap-1 transition-colors"
                        >
                          <FaCheck size={12} /> Assign Driver & Truck
                        </button>
                      ) : (
                        <button
                          onClick={() => handleLoadClick(load)}
                          className="px-3 py-1.5 bg-gray-600 !text-white text-sm rounded-lg hover:bg-gray-700 flex items-center gap-1 transition-colors"
                        >
                          <FaEye size={12} /> View Details
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Assign Modal - Shows for all statuses but assignment only allowed for 'planned' */}
      {showAssignModal && selectedLoad && (
        <AssignDriverTruckModal
          load={selectedLoad}
          isReadOnly={selectedLoad.status !== 'planned'}
          onClose={() => {
            setShowAssignModal(false);
            setSelectedLoad(null);
          }}
          onAssign={handleAssign}
        />
      )}
    </div>
  );
};

export default AllDispatch;