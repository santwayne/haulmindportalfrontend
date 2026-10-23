import { useState, useEffect } from "react";
import { Calendar, MapPin, Search, Truck, User, Loader2 } from "lucide-react";
import { getTodayPickups } from "../../../../../axios/api/distapcher";

interface Pickup {
  id: string;
  _id?: string;
  orderNumber: string;
  customerOrderNo?: string;
  tripNo?: string;
  customerName: string;
  customer?: {
    _id: string;
    name?: string;
    email?: string;
    phone?: string;
  } | null;
  pickupLocation: string;
  deliveryLocation?: string;
  pickupDate: string;
  pickupTime: string;
  pickupDateFull?: string | Date;
  status: string;
  orderStatus?: string;
  driverName: string;
  driver?: {
    _id: string;
    name?: string;
    email?: string;
    phone?: string;
  } | null;
  coDriver?: {
    _id: string;
    name?: string;
    email?: string;
    phone?: string;
  } | null;
  truckPlate: string;
  truck?: {
    _id: string;
    licensePlate?: string;
    internalId?: string;
    unitNumber?: string;
    make?: string;
    model?: string;
  } | null;
  trailer?: {
    _id: string;
    licensePlate?: string;
    trailerNumber?: string;
    unitNumber?: string;
  } | null;
  items: number;
  shipper?: {
    name?: string;
    address?: string;
    phone?: string;
    contact?: string;
    city?: string;
    province?: string;
  } | null;
  distance?: number;
  rate?: number;
  currency?: string;
  pickupSkids?: string;
  pickupCases?: string;
  commodity?: string;
}

const PickupsPage = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [pickups, setPickups] = useState<Pickup[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPickups();
  }, []);

  const fetchPickups = async () => {
    try {
      setLoading(true);
      const response = await getTodayPickups();
      if (response.success && response.data) {
        setPickups(response.data || []);
      }
    } catch (error) {
      console.error("Error fetching pickups:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredPickups = pickups.filter((pickup) => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch =
      (pickup.orderNumber || '').toLowerCase().includes(searchLower) ||
      (pickup.customerOrderNo || '').toLowerCase().includes(searchLower) ||
      (pickup.customerName || '').toLowerCase().includes(searchLower) ||
      (pickup.pickupLocation || '').toLowerCase().includes(searchLower) ||
      (pickup.driverName || '').toLowerCase().includes(searchLower) ||
      (pickup.truckPlate || '').toLowerCase().includes(searchLower) ||
      (pickup.shipper?.name || '').toLowerCase().includes(searchLower);

    const matchesStatus = statusFilter === "all" || pickup.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    const statusLower = status.toLowerCase();
    if (statusLower === "completed") {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
          Completed
        </span>
      );
    }
    if (statusLower === "in progress") {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
          In Progress
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
        Scheduled
      </span>
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="min-h-screen" >
      <div className="relative w-full mx-auto">
       

        {/* Main content */}
        <div className="relative z-10 px-4 pt-3 pb-6">
          {/* Header Section */}
          <div className="mb-4 relative z-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
             
                <h1 className="text-xl font-bold text-[var(--accent-navyblue)]">Pickups</h1>
              </div>
              <div className="text-[var(--accent-navyblue)] text-sm">
                Total: {pickups.length} pickups
              </div>
            </div>
          </div>

          {/* Filters and Search */}
          <div className="bg-card rounded-lg shadow-sm border border-theme mb-4 p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-secondary w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search pickups..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-[var(--accent-blue)] focus:border-transparent"
                />
              </div>
              <div className="md:w-48">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-4 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-[var(--accent-blue)] focus:border-transparent"
                >
                  <option value="all">All Status</option>
                  <option value="scheduled">Scheduled</option>
                  <option value="in progress">In Progress</option>
                  <option value="completed">Completed</option>
                </select>
                <div className="text-xs text-secondary mt-1">
                  Showing pickups for today
                </div>
              </div>
            </div>
          </div>

          {/* Pickups Table */}
          <div className="bg-card rounded-lg shadow-sm border border-theme">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-card border-b border-theme">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-[var(--accent-navyblue)] uppercase tracking-wider">
                      Order Number
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-[var(--accent-navyblue)] uppercase tracking-wider">
                      Customer
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-[var(--accent-navyblue)] uppercase tracking-wider">
                      Pickup Location
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-[var(--accent-navyblue)] uppercase tracking-wider">
                      Pickup Date & Time
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-[var(--accent-navyblue)] uppercase tracking-wider">
                      Driver
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-[var(--accent-navyblue)] uppercase tracking-wider">
                      Truck
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-[var(--accent-navyblue)] uppercase tracking-wider">
                      Items
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-[var(--accent-navyblue)] uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-card divide-y divide-theme">
                  {loading ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-8 text-center">
                        <div className="flex items-center justify-center">
                          <Loader2 className="w-6 h-6 animate-spin text-[var(--accent-navyblue)]" />
                          <span className="ml-2 text-secondary">Loading pickups...</span>
                        </div>
                      </td>
                    </tr>
                  ) : filteredPickups.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-8 text-center text-secondary">
                        No pickups found for today
                      </td>
                    </tr>
                  ) : (
                    filteredPickups.map((pickup) => (
                      <tr key={pickup.id} className="hover:bg-[rgba(255,255,255,0.03)] transition-colors">
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-primary">{pickup.orderNumber || 'N/A'}</div>
                          {pickup.customerOrderNo && (
                            <div className="text-xs text-secondary">Cust: {pickup.customerOrderNo}</div>
                          )}
                          {pickup.tripNo && (
                            <div className="text-xs text-[var(--accent-navyblue)]">Trip: {pickup.tripNo}</div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-primary">{pickup.customerName || 'N/A'}</div>
                          {pickup.shipper?.name && pickup.shipper.name !== pickup.customerName && (
                            <div className="text-xs text-secondary">Shipper: {pickup.shipper.name}</div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center text-sm text-primary">
                            <MapPin className="w-4 h-4 mr-1 text-secondary flex-shrink-0" />
                            <span className="truncate max-w-xs">{pickup.pickupLocation || 'Location not specified'}</span>
                          </div>
                          {pickup.deliveryLocation && (
                            <div className="text-xs text-secondary mt-1">
                              To: {pickup.deliveryLocation.length > 30 ? `${pickup.deliveryLocation.substring(0, 30)}...` : pickup.deliveryLocation}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center text-sm text-primary">
                            <Calendar className="w-4 h-4 mr-1 text-secondary" />
                            <div>
                              <div>{formatDate(pickup.pickupDate)}</div>
                              <div className="text-xs text-secondary">{pickup.pickupTime || 'Not specified'}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center text-sm text-primary">
                            <User className="w-4 h-4 mr-1 text-secondary flex-shrink-0" />
                            <div>
                              <div>{pickup.driverName || 'Not assigned'}</div>
                              {pickup.coDriver?.name && (
                                <div className="text-xs text-secondary">Co: {pickup.coDriver.name}</div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center text-sm text-primary">
                            <Truck className="w-4 h-4 mr-1 text-secondary flex-shrink-0" />
                            <div>
                              <div>{pickup.truckPlate || 'Not assigned'}</div>
                              {pickup.trailer?.licensePlate && (
                                <div className="text-xs text-secondary">Trailer: {pickup.trailer.licensePlate}</div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-primary">{pickup.items || 0}</div>
                          {(pickup.pickupSkids || pickup.pickupCases) && (
                            <div className="text-xs text-secondary">
                              {pickup.pickupSkids && `Skids: ${pickup.pickupSkids}`}
                              {pickup.pickupSkids && pickup.pickupCases && ' • '}
                              {pickup.pickupCases && `Cases: ${pickup.pickupCases}`}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getStatusBadge(pickup.status)}
                          {pickup.commodity && (
                            <div className="text-xs text-secondary mt-1 truncate max-w-xs" title={pickup.commodity}>
                              {pickup.commodity.length > 20 ? `${pickup.commodity.substring(0, 20)}...` : pickup.commodity}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PickupsPage;

