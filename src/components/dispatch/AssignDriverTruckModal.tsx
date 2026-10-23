import { useState, useEffect } from 'react';
import { FaUser, FaTruck, FaTrailer, FaCalendarAlt, FaTimes, FaCheck } from 'react-icons/fa';
import StepTracker from './StepTracker';
import { listDriver, listVehicle, listTrailers } from '../../axios/api/distapcher';

interface Load {
  _id: string;
  loadNumber?: string;
  orderNumber?: string;
  customer?: string;
  customerName?: string;
  amount?: number;
  rate?: number;
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
}

interface AssignDriverTruckModalProps {
  load: Load;
  isReadOnly?: boolean;
  onClose: () => void;
  onAssign: (loadId: string, driver: string, truck: string, trailer?: string, planDate?: string) => void;
}

const AssignDriverTruckModal: React.FC<AssignDriverTruckModalProps> = ({
  load,
  isReadOnly = false,
  onClose,
  onAssign
}) => {
  const [selectedDriver, setSelectedDriver] = useState("");
  const [selectedTruck, setSelectedTruck] = useState("");
  const [selectedTrailer, setSelectedTrailer] = useState("");
  const [planDate, setPlanDate] = useState(new Date().toISOString().split('T')[0]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [trucks, setTrucks] = useState<any[]>([]);
  const [trailers, setTrailers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [driversRes, vehiclesRes, trailersRes] = await Promise.all([
        listDriver(),
        listVehicle({ page: 1, limit: 1000 }), // Fetch all vehicles
        listTrailers({ page: 1, limit: 1000 }) // Fetch all trailers
      ]);

      console.log('🔍 Drivers response:', driversRes);
      console.log('🔍 Vehicles response:', vehiclesRes);
      console.log('🔍 Trailers response:', trailersRes);

      // Handle drivers - check for both response structures
      if (driversRes) {
        const driverData = driversRes.data || (driversRes.success ? driversRes.data : driversRes) || [];
        if (Array.isArray(driverData)) {
          setDrivers(driverData.map((d: any) => ({
            id: d._id,
            name: d.name || `${d.firstName || ''} ${d.lastName || ''}`.trim() || d._id
          })));
        }
      }

      // Handle vehicles - check for both response structures
      if (vehiclesRes) {
        let vehicleData: any[] = [];

        // Check if vehicles are nested in data.vehicles (like the API response shows)
        if (vehiclesRes.data?.vehicles && Array.isArray(vehiclesRes.data.vehicles)) {
          vehicleData = vehiclesRes.data.vehicles;
        }
        // Check if data is directly an array
        else if (Array.isArray(vehiclesRes.data)) {
          vehicleData = vehiclesRes.data;
        }
        // Fallback: check if vehiclesRes itself is an array
        else if (Array.isArray(vehiclesRes)) {
          vehicleData = vehiclesRes;
        }
        // Check success wrapper
        else if (vehiclesRes.success && vehiclesRes.data) {
          if (Array.isArray(vehiclesRes.data.vehicles)) {
            vehicleData = vehiclesRes.data.vehicles;
          } else if (Array.isArray(vehiclesRes.data)) {
            vehicleData = vehiclesRes.data;
          }
        }

        console.log('🔍 Vehicle data extracted:', vehicleData);

        if (Array.isArray(vehicleData) && vehicleData.length > 0) {
          setTrucks(vehicleData.map((v: any) => ({
            id: v._id,
            name: v.plateNumber || v.internalId || `${v.make || ''} ${v.model || ''}`.trim() || v._id,
            type: v.type || v.vehicleType || 'Truck',
            displayName: `${v.plateNumber || v.internalId || 'Unknown'} - ${v.make || ''} ${v.model || ''}`.trim() || v._id
          })));
        } else {
          console.warn('⚠️ No vehicles found in response:', vehiclesRes);
          setTrucks([]);
        }
      }

      // Handle trailers - check for both response structures
      if (trailersRes) {
        let trailerData: any[] = [];

        // Check if trailers are directly in data (paginated response)
        if (trailersRes.data && Array.isArray(trailersRes.data)) {
          trailerData = trailersRes.data;
        }
        // Check success wrapper
        else if (trailersRes.success && trailersRes.data) {
          if (Array.isArray(trailersRes.data)) {
            trailerData = trailersRes.data;
          }
        }
        // Fallback: check if trailersRes itself is an array
        else if (Array.isArray(trailersRes)) {
          trailerData = trailersRes;
        }

        console.log('🔍 Trailer data extracted:', trailerData);

        if (Array.isArray(trailerData) && trailerData.length > 0) {
          setTrailers(trailerData.map((t: any) => ({
            id: t._id,
            name: t.plateNumber || t.trailerNumber || t.trailer || t._id
          })));
        } else {
          console.warn('⚠️ No trailers found in response:', trailersRes);
          setTrailers([]);
        }
      }
    } catch (error) {
      console.error('❌ Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = () => {
    // Prevent assignment if in read-only mode
    if (isReadOnly) {
      alert('This load cannot be reassigned. Only loads with "Planned" status can be assigned.');
      return;
    }

    if (!selectedDriver || !selectedTruck) {
      alert('Please select both driver and truck');
      return;
    }

    onAssign(load._id, selectedDriver, selectedTruck, selectedTrailer || undefined, planDate);
    onClose();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getStatusLabel = (status: string) => {
    const statusMap: Record<string, string> = {
      planned: 'Planned',
      dispatched: 'Dispatched',
      'in-delivery': 'In Delivery',
      delivered: 'Delivered',
      completed: 'Completed',
    };
    return statusMap[status] || status;
  };

  return (
    <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-card border-b px-6 py-4 flex items-center justify-between rounded-t-xl z-10">
          <div>
            <h3 className="text-xl font-bold text-primary">
              {isReadOnly ? 'Load Details (View Only)' : 'Assign Driver & Truck'}
            </h3>
            <p className="text-sm text-secondary mt-1">
              Load: {load.loadNumber || load._id} | Order: {load.orderNumber || 'N/A'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[rgba(255,255,255,0.03)] rounded-lg transition-colors"
          >
            <FaTimes className="text-secondary" size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6">

          {/* Step Tracker */}
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4 border border-blue-200">
            <label className="block text-sm font-semibold text-primary mb-3">
              Workflow Progress
            </label>
            <StepTracker currentStep={load.status === 'planned' ? 'planned' : load.status || 'planned'} />
          </div>

          {/* Load Details Summary */}
          <div className="bg-card rounded-lg p-4">
            <h4 className="font-semibold text-primary mb-3">Load Details</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-secondary">Customer:</span>
                <span className="ml-2 font-medium">{load.customer || load.customerName || 'N/A'}</span>
              </div>
              <div>
                <span className="text-secondary">Status:</span>
                <span className="ml-2 font-medium text-primary">
                  {getStatusLabel(load.status)}
                </span>
              </div>
              <div>
                <span className="text-secondary">Load Amount:</span>
                <span className="ml-2 font-bold text-green-600">
                  {formatCurrency(load.amount || load.rate || load.details?.amount || 0)}
                </span>
              </div>
              {load.details?.rate && load.details.rate > 0 && (
                <div>
                  <span className="text-secondary">Rate:</span>
                  <span className="ml-2 font-medium text-[#00D1FF]">
                    {formatCurrency(load.details.rate)}
                  </span>
                </div>
              )}
              <div className="col-span-2">
                <span className="text-secondary">Route:</span>
                <div className="mt-2">
                  {load.route?.multipleDropOffs ? (
                    // Multiple Dropoffs - Show Waypoints
                    <div className="space-y-2">
                      {load.route.wayPoints && load.route.wayPoints.length > 0 ? (
                        load.route.wayPoints.map((waypoint: any, index: number) => (
                          <div key={index} className="text-xs bg-card p-2 rounded">
                            <span className="font-medium">
                              {waypoint.pickup ? '📦 Pickup' : waypoint.dropOff ? '📬 Dropoff' : '📍 Waypoint'} {index + 1}:
                            </span>
                            <span className="ml-2">
                              {typeof waypoint.address === 'string'
                                ? waypoint.address
                                : waypoint.address?.place || 'N/A'}
                            </span>
                          </div>
                        ))
                      ) : (
                        <span className="text-xs text-secondary">Multiple waypoints configured</span>
                      )}
                      {load.route.selectReturn && (
                        <div className="text-xs bg-yellow-100 p-2 rounded mt-1">
                          <span className="font-medium">🔄 Return:</span>
                          <span className="ml-2">{load.route.selectReturn}</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    // Single Dropoff - Show Direct Route
                    <div className="text-sm space-y-1">
                      {load.route?.selectPickup && (
                        <div>
                          <span className="font-medium text-[#00D1FF]">📦 Pickup:</span>
                          <span className="ml-2">{load.route.selectPickup.place || 'N/A'}</span>
                        </div>
                      )}
                      {load.route?.selectDropOff && (
                        <div>
                          <span className="font-medium text-green-600">📬 Dropoff:</span>
                          <span className="ml-2">{load.route.selectDropOff.place || 'N/A'}</span>
                        </div>
                      )}
                      {load.route?.selectReturn && (
                        <div>
                          <span className="font-medium text-[#00FFA3]">🔄 Return:</span>
                          <span className="ml-2">{load.route.selectReturn}</span>
                        </div>
                      )}
                      {!load.route?.selectPickup && !load.route?.selectDropOff && (
                        <span className="text-secondary">No route information</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
              {/* Receiver Details */}
              {(load.details?.receiver || load.receiver) && (
                <div className="col-span-2 mt-3 pt-3 border-t border-theme">
                  <h5 className="font-semibold text-primary mb-2">Receiver Information</h5>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    {(load.details?.receiver?.name || load.receiver?.name) && (
                      <div>
                        <span className="text-secondary">Name:</span>
                        <span className="ml-2 font-medium">{load.details?.receiver?.name || load.receiver?.name}</span>
                      </div>
                    )}
                    {(load.details?.receiver?.contactPerson || load.receiver?.contactPerson) && (
                      <div>
                        <span className="text-secondary">Contact Person:</span>
                        <span className="ml-2 font-medium">{load.details?.receiver?.contactPerson || load.receiver?.contactPerson}</span>
                      </div>
                    )}
                    {(load.details?.receiver?.phone || load.receiver?.phone) && (
                      <div>
                        <span className="text-secondary">Phone:</span>
                        <span className="ml-2 font-medium">{load.details?.receiver?.phone || load.receiver?.phone}</span>
                      </div>
                    )}
                    {(load.details?.receiver?.email || load.receiver?.email) && (
                      <div>
                        <span className="text-secondary">Email:</span>
                        <span className="ml-2 font-medium">{load.details?.receiver?.email || load.receiver?.email}</span>
                      </div>
                    )}
                    {(load.details?.receiver?.address || load.receiver?.address) && (
                      <div className="col-span-2">
                        <span className="text-secondary">Address:</span>
                        <span className="ml-2 font-medium">{load.details?.receiver?.address || load.receiver?.address}</span>
                      </div>
                    )}
                    {(load.details?.receiver?.notes || load.receiver?.notes) && (
                      <div className="col-span-2">
                        <span className="text-secondary">Notes:</span>
                        <span className="ml-2 text-primary">{load.details?.receiver?.notes || load.receiver?.notes}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Current Assignment (shown in read-only mode) */}
          {isReadOnly && (load.assignedDriver || load.assignedTruck) && (
            <div className="bg-card border border-blue-200 rounded-lg p-4">
              <h5 className="font-semibold text-blue-800 mb-3">Current Assignment</h5>
              <div className="space-y-2 text-sm">
                {load.assignedDriver && (
                  <div className="flex items-center gap-2">
                    <FaUser className="text-[#00D1FF]" />
                    <span>Driver: <strong>{load.assignedDriver}</strong></span>
                  </div>
                )}
                {load.assignedTruck && (
                  <div className="flex items-center gap-2">
                    <FaTruck className="text-[#00D1FF]" />
                    <span>Truck: <strong>{load.assignedTruck}</strong></span>
                  </div>
                )}
                {load.assignedTrailer && (
                  <div className="flex items-center gap-2">
                    <FaTrailer className="text-[#00D1FF]" />
                    <span>Trailer: <strong>{load.assignedTrailer}</strong></span>
                  </div>
                )}
                {load.plannedDate && (
                  <div className="flex items-center gap-2">
                    <FaCalendarAlt className="text-[#00D1FF]" />
                    <span>Planned Date: <strong>{load.plannedDate}</strong></span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Assignment Form - Only show if NOT read-only */}
          {!isReadOnly && (
            <>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-blue-600"></div>
                </div>
              ) : (
                <div className="space-y-5">
                  <div>
                    <label className="block text-sm font-semibold text-primary mb-2">
                      <FaUser className="inline mr-2 text-[#00D1FF]" />
                      Select Driver <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={selectedDriver}
                      onChange={(e) => setSelectedDriver(e.target.value)}
                      className="w-full p-3 border border-theme rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                      disabled={drivers.length === 0}
                    >
                      <option value="">{drivers.length === 0 ? 'No drivers available' : 'Choose Driver'}</option>
                      {drivers.map(driver => (
                        <option key={driver.id} value={driver.id}>{driver.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-primary mb-2">
                      <FaTruck className="inline mr-2 text-purple-600" />
                      Select Truck <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={selectedTruck}
                      onChange={(e) => setSelectedTruck(e.target.value)}
                      className="w-full p-3 border border-theme rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                      disabled={trucks.length === 0 || loading}
                    >
                      <option value="">
                        {loading ? 'Loading trucks...' : trucks.length === 0 ? 'No trucks available' : 'Choose Truck'}
                      </option>
                      {trucks.map(truck => (
                        <option key={truck.id} value={truck.id}>
                          {truck.displayName || truck.name} {truck.type ? `(${truck.type})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-primary mb-2">
                      <FaTrailer className="inline mr-2 text-green-600" />
                      Select Trailer (Optional)
                    </label>
                    <select
                      value={selectedTrailer}
                      onChange={(e) => setSelectedTrailer(e.target.value)}
                      className="w-full p-3 border border-theme rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      disabled={trailers.length === 0}
                    >
                      <option value="">{trailers.length === 0 ? 'No trailers available' : 'No Trailer'}</option>
                      {trailers.map(trailer => (
                        <option key={trailer.id} value={trailer.id}>{trailer.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-primary mb-2">
                      <FaCalendarAlt className="inline mr-2 text-[#F59E0B]" />
                      Plan Date
                    </label>
                    <input
                      type="date"
                      value={planDate}
                      onChange={(e) => setPlanDate(e.target.value)}
                      className="w-full p-3 border border-theme rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              )}

              {/* Selected Assignment Preview */}
              {(selectedDriver || selectedTruck) && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h5 className="font-semibold text-green-800 mb-2">Assignment Preview:</h5>
                  <div className="space-y-2 text-sm">
                    {selectedDriver && (
                      <div className="flex items-center gap-2">
                        <FaUser className="text-green-600" />
                        <span>Driver: <strong>{drivers.find(d => d.id === selectedDriver)?.name}</strong></span>
                      </div>
                    )}
                    {selectedTruck && (
                      <div className="flex items-center gap-2">
                        <FaTruck className="text-green-600" />
                        <span>Truck: <strong>{trucks.find(t => t.id === selectedTruck)?.name}</strong></span>
                      </div>
                    )}
                    {selectedTrailer && (
                      <div className="flex items-center gap-2">
                        <FaTrailer className="text-green-600" />
                        <span>Trailer: <strong>{trailers.find(tr => tr.id === selectedTrailer)?.name}</strong></span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-card px-6 py-4 flex justify-end gap-3 border-t rounded-b-xl">
          {isReadOnly ? (
            <button
              onClick={onClose}
              className="px-6 py-2 bg-gray-600 !text-white rounded-lg hover:bg-gray-700 font-medium transition-colors"
            >
              Close
            </button>
          ) : (
            <>
              <button
                onClick={onClose}
                className="px-6 py-2 border border-theme rounded-lg hover:bg-[rgba(255,255,255,0.03)] font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAssign}
                disabled={!selectedDriver || !selectedTruck || loading}
                className="px-6 py-2 bg-blue-600 !text-white rounded-lg hover:bg-blue-700 font-medium disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
              >
                <FaCheck /> {loading ? 'Loading...' : 'Confirm Assignment'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AssignDriverTruckModal;