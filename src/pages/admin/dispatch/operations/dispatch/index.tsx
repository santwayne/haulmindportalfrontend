import { useState, useEffect } from "react";
import {
  FaTruck, FaUpload, FaCalendarAlt, FaMapMarkerAlt, FaEye
} from 'react-icons/fa';
import NewLoad from "../../NewLoad";
import StepTracker from "../../../../../components/dispatch/StepTracker";
import { listLoad } from "../../../../../axios/api/distapcher";

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
  deliveryDate?: string;
  documents?: {
    bol?: boolean;
    billOfSale?: boolean;
    pod?: boolean;
  };
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
  shipDate?: string;
  shipTime?: string;
  receiveDate?: string;
  receiveTime?: string;
  shipperCity?: string;
  shipperState?: string;
  receiverCity?: string;
  receiverState?: string;
  details?: {
    amount?: number;
    rate?: number;
    receiver?: {
      name?: string;
      email?: string;
      phone?: string;
      address?: string;
      contactPerson?: string;
      notes?: string;
    };
  };
  receiver?: {
    name?: string;
    email?: string;
    phone?: string;
    address?: string;
    contactPerson?: string;
    notes?: string;
  };
  customerEmail?: string;
}

const Index = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loads, setLoads] = useState<Load[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLoad, setSelectedLoad] = useState<Load | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [emptyStateMessage, setEmptyStateMessage] = useState<string | null>(null);
  const [userInfo, setUserInfo] = useState<any>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('userInfo');
      if (stored) {
        setUserInfo(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Error parsing userInfo from localStorage:', error);
    }
    fetchLoads();

    // Listen for storage updates (e.g. company assignment in another tab)
    const handleStorage = (event: StorageEvent) => {
      if (event.key === 'userInfo' && event.newValue) {
        try {
          setUserInfo(JSON.parse(event.newValue));
        } catch (err) {
          console.error('Error parsing updated userInfo from localStorage:', err);
        }
        fetchLoads();
      }
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchLoads = async () => {
    setLoading(true);
    try {
      const response = await listLoad();
      const message = response?.message || null;
      const data = response?.data;

      if (response?.success && Array.isArray(data)) {
        if (data.length === 0) {
          setLoads([]);
          setEmptyStateMessage(message || 'No loads available.');
          return;
        }

        const plannedLoads = data
          .filter((load: any) => {
            // Status is planned OR no driver/truck assigned
            const hasDriver = load.details?.driver || load.driverId;
            const hasVehicle = load.details?.vehicle || load.vehicleId;
            return load.status === 'planned' || (!hasDriver || !hasVehicle);
          })
          .map((load: any) => {
            // Extract shipper city/state - from pickup location
            let shipperCity = '';
            let shipperState = '';
            if (load.route?.multipleDropOffs && load.route?.wayPoints) {
              // Find first pickup waypoint
              const pickupWaypoint = load.route.wayPoints.find((wp: any) => wp.pickup);
              if (pickupWaypoint) {
                const address = typeof pickupWaypoint.address === 'string'
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
                const address = typeof lastDropoff.address === 'string'
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
              status: (load.status === 'planned' || (!load.details?.driver && !load.details?.vehicle)) ? 'planned' : load.status,
              assignedDriver: load.details?.driver?.name || load.driverName || null,
              assignedTruck: load.details?.vehicle?.plateNumber || load.vehiclePlate || null,
              route: load.route || {},
              receiver: load.details?.receiver || load.receiver || null,
              customerEmail: load.details?.customer?.email || load.customerEmail || null,
              documents: load.documents || { bol: false, billOfSale: false, pod: false },
              shipperCity,
              shipperState,
              receiverCity,
              receiverState,
              shipDate: load.assignedAt || load.startedAt || null,
              shipTime: load.assignedAt || load.startedAt || null,
              receiveDate: load.completedAt || null,
              receiveTime: load.completedAt || null,
            };
          });
        setLoads(plannedLoads);
        setEmptyStateMessage(null);
      } else {
        setLoads([]);
        setEmptyStateMessage(message || 'Failed to fetch loads.');
      }
    } catch (error) {
      console.error('Error fetching loads:', error);
      setEmptyStateMessage('Failed to fetch loads: ' + (error as any)?.message);
      setLoads([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLoads();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userInfo?.company]);

  const handleLoadAdded = () => {
    setSidebarOpen(false);
    fetchLoads(); // Refresh the list after adding a new load
  };

  const handleLoadClick = (load: Load) => {
    setSelectedLoad(load);
    setShowDetailsModal(true);
  };

  const getStatusBadge = (status: Load['status']) => {
    const statusConfig = {
      available: { bg: 'bg-card', text: 'text-primary', label: 'Available' },
      planned: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Planned' },
      dispatched: { bg: 'bg-purple-100', text: 'text-purple-800', label: 'Dispatched' },
      'in-delivery': { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'In Delivery' },
      delivered: { bg: 'bg-orange-100', text: 'text-orange-800', label: 'Delivered' },
      completed: { bg: 'bg-green-100', text: 'text-green-800', label: 'Completed' },
      paid: { bg: 'bg-green-100', text: 'text-green-800', label: 'Paid' }
    };

    const config = statusConfig[status] || statusConfig.available;
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

  const formatDate = (date: string) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const canCreateLoad = userInfo?.role === 'superadmin' || Boolean(userInfo?.company);

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
          <h1 className="text-3xl font-bold text-primary">Available Dispatch</h1>
          <p className="text-secondary mt-1">Manage planned loads - All new loads appear here with status "Planned"</p>
        </div>
        {canCreateLoad && (
          <button
            onClick={() => setSidebarOpen(true)}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 !text-white rounded-lg hover:bg-blue-700 shadow-lg font-medium"
          >
            <FaUpload /> + New Load
          </button>
        )}
      </div>

      {emptyStateMessage && loads.length === 0 && (
        <div className="mb-4 bg-card border border-blue-100 text-blue-700 px-4 py-3 rounded-lg shadow-sm flex items-center gap-3">
          <FaTruck className="text-blue-500" />
          <span className="text-sm">{emptyStateMessage}</span>
        </div>
      )}

      {/* Step Tracker */}
      <div className="bg-card rounded-xl shadow-lg p-6 mb-6">
        <h3 className="text-lg font-semibold text-primary mb-4">Dispatch Workflow</h3>
        <StepTracker currentStep="planned" />
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
                  Shipper City / State
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-primary uppercase tracking-wider">
                  Ship Date & Time
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-primary uppercase tracking-wider">
                  Receiver City / State
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-primary uppercase tracking-wider">
                  Receive Date & Time
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
              {loads.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-6 py-12 text-center text-secondary">
                    <FaTruck className="mx-auto mb-3 text-gray-300" size={48} />
                    <p className="text-lg font-medium">No loads available</p>
                    <p className="text-sm">{emptyStateMessage || 'Create a new load to get started'}</p>
                  </td>
                </tr>
              ) : (
                loads.map((load) => (
                  <tr
                    key={load._id}
                    className="hover:bg-blue-50 cursor-pointer transition-colors"
                    onClick={() => handleLoadClick(load)}
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
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-primary">{load.customer || load.customerName || 'N/A'}</span>
                        {load.receiver?.name && (
                          <span className="text-xs text-secondary">To: {load.receiver.name}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className="text-green-600 font-bold">
                          {formatCurrency(load.amount || load.rate || 0)}
                        </span>
                        {load.rate && load.rate !== load.amount && (
                          <span className="text-xs text-secondary">Rate: {formatCurrency(load.rate)}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(load.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-1 text-sm text-primary">
                        <FaMapMarkerAlt className="text-red-500" size={12} />
                        <span>
                          {load.shipperCity ? (
                            <>
                              {load.shipperCity}{load.shipperState ? `, ${load.shipperState}` : ''}
                            </>
                          ) : (
                            'N/A'
                          )}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2 text-sm text-primary">
                        <FaCalendarAlt className="text-blue-500" size={12} />
                        <div>
                          <div>{load.shipDate ? formatDate(load.shipDate) : 'N/A'}</div>
                          <div className="text-xs text-secondary">
                            {load.shipTime ? new Date(load.shipTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : 'N/A'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-1 text-sm text-primary">
                        <FaMapMarkerAlt className="text-green-500" size={12} />
                        <span>
                          {load.receiverCity ? (
                            <>
                              {load.receiverCity}{load.receiverState ? `, ${load.receiverState}` : ''}
                            </>
                          ) : (
                            'N/A'
                          )}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2 text-sm text-primary">
                        <FaCalendarAlt className="text-purple-500" size={12} />
                        <div>
                          <div>{load.receiveDate ? formatDate(load.receiveDate) : 'N/A'}</div>
                          <div className="text-xs text-secondary">
                            {load.receiveTime ? new Date(load.receiveTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : 'N/A'}
                          </div>
                        </div>
                      </div>
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
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleLoadClick(load);
                        }}
                        className="px-3 py-1.5 bg-blue-600 !text-white text-sm rounded-lg hover:bg-blue-700 flex items-center gap-1"
                      >
                        <FaEye size={12} /> View Details
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Load Details Modal */}
      {showDetailsModal && selectedLoad && (
        <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-card border-b px-6 py-4 flex items-center justify-between rounded-t-xl">
              <div>
                <h3 className="text-xl font-bold text-primary">Load Details</h3>
                <p className="text-sm text-secondary mt-1">
                  {selectedLoad.loadNumber || selectedLoad._id}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowDetailsModal(false);
                  setSelectedLoad(null);
                }}
                className="p-2 hover:bg-[rgba(255,255,255,0.03)] rounded-lg"
              >
                <span className="text-secondary">✕</span>
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-card rounded-lg p-4">
                  <p className="text-sm text-secondary">Load Number</p>
                  <p className="font-semibold text-primary">{selectedLoad.loadNumber || selectedLoad._id}</p>
                </div>
                <div className="bg-card rounded-lg p-4">
                  <p className="text-sm text-secondary">Order Number</p>
                  <p className="font-semibold text-primary">{selectedLoad.orderNumber || 'N/A'}</p>
                </div>
                <div className="bg-card rounded-lg p-4">
                  <p className="text-sm text-secondary">Customer</p>
                  <p className="font-semibold text-primary">{selectedLoad.customer || selectedLoad.customerName || 'N/A'}</p>
                </div>
                <div className="bg-card rounded-lg p-4">
                  <p className="text-sm text-secondary">Amount</p>
                  <p className="font-semibold text-green-600 text-lg">
                    {formatCurrency(selectedLoad.amount || selectedLoad.details?.amount || selectedLoad.rate || selectedLoad.details?.rate || 0)}
                  </p>
                  {(selectedLoad.rate || selectedLoad.details?.rate) &&
                    (selectedLoad.rate !== selectedLoad.amount || selectedLoad.details?.rate !== selectedLoad.details?.amount) && (
                      <p className="text-xs text-secondary mt-1">
                        Rate: {formatCurrency(selectedLoad.rate || selectedLoad.details?.rate || 0)}
                      </p>
                    )}
                </div>
              </div>

              {/* Shipping Details */}
              <div className="border-t pt-6">
                <h4 className="text-lg font-semibold text-primary mb-4">Shipping Details</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-secondary mb-1">Shipper Location</p>
                    <p className="font-medium text-primary">
                      {selectedLoad.shipperCity || selectedLoad.route?.selectPickup?.place || 'N/A'}, {selectedLoad.shipperState || ''}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-secondary mb-1">Ship Date</p>
                    <p className="font-medium text-primary">{formatDate(selectedLoad.shipDate || '')}</p>
                  </div>
                  <div>
                    <p className="text-sm text-secondary mb-1">Ship Time</p>
                    <p className="font-medium text-primary">{selectedLoad.shipTime || 'N/A'}</p>
                  </div>
                </div>
              </div>

              {/* Receive Details */}
              <div className="border-t pt-6">
                <h4 className="text-lg font-semibold text-primary mb-4">Receive Details</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-secondary mb-1">Receiver Location</p>
                    <p className="font-medium text-primary">
                      {selectedLoad.receiverCity || selectedLoad.route?.selectDropOff?.place || 'N/A'}, {selectedLoad.receiverState || ''}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-secondary mb-1">Receive Date</p>
                    <p className="font-medium text-primary">{formatDate(selectedLoad.receiveDate || '')}</p>
                  </div>
                  <div>
                    <p className="text-sm text-secondary mb-1">Receive Time</p>
                    <p className="font-medium text-primary">{selectedLoad.receiveTime || 'N/A'}</p>
                  </div>
                </div>

                {/* Receiver Information */}
                {(selectedLoad.receiver || selectedLoad.details?.receiver) && (
                  <div className="mt-4 bg-card rounded-lg p-4 border border-blue-200">
                    <h5 className="text-md font-semibold text-primary mb-3">Receiver Contact Information</h5>
                    <div className="grid grid-cols-2 gap-4">
                      {(selectedLoad.receiver?.name || selectedLoad.details?.receiver?.name) && (
                        <div>
                          <p className="text-sm text-secondary mb-1">Name</p>
                          <p className="font-medium text-primary">
                            {selectedLoad.receiver?.name || selectedLoad.details?.receiver?.name}
                          </p>
                        </div>
                      )}
                      {(selectedLoad.receiver?.contactPerson || selectedLoad.details?.receiver?.contactPerson) && (
                        <div>
                          <p className="text-sm text-secondary mb-1">Contact Person</p>
                          <p className="font-medium text-primary">
                            {selectedLoad.receiver?.contactPerson || selectedLoad.details?.receiver?.contactPerson}
                          </p>
                        </div>
                      )}
                      {(selectedLoad.receiver?.phone || selectedLoad.details?.receiver?.phone) && (
                        <div>
                          <p className="text-sm text-secondary mb-1">Phone</p>
                          <p className="font-medium text-primary">
                            {selectedLoad.receiver?.phone || selectedLoad.details?.receiver?.phone}
                          </p>
                        </div>
                      )}
                      {(selectedLoad.receiver?.email || selectedLoad.details?.receiver?.email) && (
                        <div>
                          <p className="text-sm text-secondary mb-1">Email</p>
                          <p className="font-medium text-primary">
                            {selectedLoad.receiver?.email || selectedLoad.details?.receiver?.email}
                          </p>
                        </div>
                      )}
                      {(selectedLoad.receiver?.address || selectedLoad.details?.receiver?.address) && (
                        <div className="col-span-2">
                          <p className="text-sm text-secondary mb-1">Address</p>
                          <p className="font-medium text-primary">
                            {selectedLoad.receiver?.address || selectedLoad.details?.receiver?.address}
                          </p>
                        </div>
                      )}
                      {(selectedLoad.receiver?.notes || selectedLoad.details?.receiver?.notes) && (
                        <div className="col-span-2">
                          <p className="text-sm text-secondary mb-1">Notes</p>
                          <p className="font-medium text-primary">
                            {selectedLoad.receiver?.notes || selectedLoad.details?.receiver?.notes}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Route */}
              <div className="border-t pt-6">
                <h4 className="text-lg font-semibold text-primary mb-4">Route</h4>
                {selectedLoad.route?.multipleDropOffs ? (
                  // Multiple Dropoffs - Show Waypoints
                  <div className="space-y-3">
                    <div className="text-sm text-secondary mb-3 font-medium">Multiple Dropoffs Route:</div>
                    {selectedLoad.route?.wayPoints && selectedLoad.route.wayPoints.length > 0 ? (
                      <div className="space-y-2">
                        {selectedLoad.route.wayPoints.map((waypoint: any, index: number) => (
                          <div key={index} className="flex items-start gap-3 p-3 bg-card rounded-lg border border-theme">
                            <div className="flex-shrink-0 mt-1">
                              {waypoint.pickup ? (
                                <FaMapMarkerAlt className="text-blue-500" size={16} />
                              ) : waypoint.dropOff ? (
                                <FaMapMarkerAlt className="text-green-500" size={16} />
                              ) : (
                                <FaMapMarkerAlt className="text-secondary" size={16} />
                              )}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs font-medium text-secondary">
                                  {waypoint.pickup ? 'PICKUP' : waypoint.dropOff ? 'DROPOFF' : 'WAYPOINT'} {index + 1}
                                </span>
                              </div>
                              <p className="text-sm font-medium text-primary">
                                {waypoint.address?.place || waypoint.address || 'N/A'}
                              </p>
                              {waypoint.customer && (
                                <p className="text-xs text-secondary mt-1">
                                  Customer: {typeof waypoint.customer === 'object'
                                    ? waypoint.customer.name || waypoint.customer._id || 'N/A'
                                    : waypoint.customer}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-secondary">No waypoints defined</p>
                    )}
                    {selectedLoad.route?.selectReturn && (
                      <div className="flex items-center gap-3 p-3 bg-card rounded-lg border border-yellow-200 mt-2">
                        <FaMapMarkerAlt className="text-[#00FFA3]" size={16} />
                        <div>
                          <span className="text-xs font-medium text-yellow-700">RETURN</span>
                          <p className="text-sm font-medium text-primary">{selectedLoad.route.selectReturn}</p>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  // Single Dropoff - Show Direct Route
                  <div className="space-y-3">
                    {selectedLoad.route?.selectPickup && (
                      <div className="flex items-center gap-3 p-3 bg-card rounded-lg border border-blue-200">
                        <FaMapMarkerAlt className="text-blue-500" size={16} />
                        <div>
                          <span className="text-xs font-medium text-blue-700">PICKUP</span>
                          <p className="text-sm font-medium text-primary">{selectedLoad.route.selectPickup.place || 'N/A'}</p>
                        </div>
                      </div>
                    )}
                    {selectedLoad.route?.selectDropOff && (
                      <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
                        <FaMapMarkerAlt className="text-green-500" size={16} />
                        <div>
                          <span className="text-xs font-medium text-green-700">DROPOFF</span>
                          <p className="text-sm font-medium text-primary">{selectedLoad.route.selectDropOff.place || 'N/A'}</p>
                        </div>
                      </div>
                    )}
                    {selectedLoad.route?.selectReturn && (
                      <div className="flex items-center gap-3 p-3 bg-card rounded-lg border border-yellow-200">
                        <FaMapMarkerAlt className="text-[#00FFA3]" size={16} />
                        <div>
                          <span className="text-xs font-medium text-yellow-700">RETURN</span>
                          <p className="text-sm font-medium text-primary">{selectedLoad.route.selectReturn}</p>
                        </div>
                      </div>
                    )}
                    {!selectedLoad.route?.selectPickup && !selectedLoad.route?.selectDropOff && (
                      <p className="text-sm text-secondary">No route information available</p>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="sticky bottom-0 bg-card px-6 py-4 flex justify-end gap-3 border-t rounded-b-xl">
              <button
                onClick={() => {
                  setShowDetailsModal(false);
                  setSelectedLoad(null);
                }}
                className="px-6 py-2 bg-gray-600 !text-white rounded-lg hover:bg-gray-700 font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Load Sidebar */}
      <div
        className={`fixed top-0 right-0 h-full max-w-5xl w-full  bg-card shadow-2xl transform transition-transform duration-500 ease-out z-[9999] border-l border-theme ${sidebarOpen ? "translate-x-0" : "translate-x-full"
          }`}
      >
        <NewLoad onClose={handleLoadAdded} />
      </div>

      {/* Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-[9998] bg-gray-900/50 backdrop-blur-sm transition-all duration-500"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
};

export default Index;
