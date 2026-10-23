import { useState, useEffect } from "react";
import { Calendar, MapPin, Search, Truck, User, Loader2 } from "lucide-react";
import { getTodayDeliveries } from "../../../../../axios/api/distapcher";

interface Delivery {
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
  deliveryLocation: string;
  deliveryDate: string;
  deliveryTime: string;
  deliveryDateFull?: string | Date;
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
  pickupLocation?: string;
  pickupDate?: string | Date;
  pickupTime?: string;
  receiver?: {
    name?: string;
    address?: string;
    phone?: string;
    contact?: string;
  } | null;
  distance?: number;
  rate?: number;
  currency?: string;
}

const DeliveriesPage = () => {

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDeliveries();
  }, []);

  const fetchDeliveries = async () => {
    try {
      setLoading(true);
      const response = await getTodayDeliveries();
      if (response.success && response.data) {
        setDeliveries(response.data || []);
      }
    } catch (error) {
      console.error("Error fetching deliveries:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredDeliveries = deliveries.filter((delivery) => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch =
      (delivery.orderNumber || '').toLowerCase().includes(searchLower) ||
      (delivery.customerOrderNo || '').toLowerCase().includes(searchLower) ||
      (delivery.customerName || '').toLowerCase().includes(searchLower) ||
      (delivery.deliveryLocation || '').toLowerCase().includes(searchLower) ||
      (delivery.driverName || '').toLowerCase().includes(searchLower) ||
      (delivery.truckPlate || '').toLowerCase().includes(searchLower) ||
      (delivery.receiver?.name || '').toLowerCase().includes(searchLower);

    const matchesStatus = statusFilter === "all" || delivery.status === statusFilter;

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
    if (statusLower === "in transit") {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
          In Transit
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
                
                <h1 className="text-xl font-bold text-[var(--accent-navyblue)]">Deliveries</h1>
              </div>
              <div className="text-[var(--accent-navyblue)] text-sm">
                Total: {deliveries.length} deliveries
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
                  placeholder="Search deliveries..."
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
                  <option value="in transit">In Transit</option>
                  <option value="completed">Completed</option>
                </select>
                <div className="text-xs text-secondary mt-1">
                  Showing deliveries for today
                </div>
              </div>
            </div>
          </div>

          {/* Deliveries Table */}
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
                      Delivery Location
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-[var(--accent-navyblue)] uppercase tracking-wider">
                      Delivery Date & Time
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
                          <span className="ml-2 text-secondary">Loading deliveries...</span>
                        </div>
                      </td>
                    </tr>
                  ) : filteredDeliveries.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-8 text-center text-secondary">
                        No deliveries found for today
                      </td>
                    </tr>
                  ) : (
                    filteredDeliveries.map((delivery) => (
                      <tr key={delivery.id} className="hover:bg-[rgba(255,255,255,0.03)] transition-colors">
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-primary">{delivery.orderNumber || 'N/A'}</div>
                          {delivery.customerOrderNo && (
                            <div className="text-xs text-secondary">Cust: {delivery.customerOrderNo}</div>
                          )}
                          {delivery.tripNo && (
                            <div className="text-xs text-[var(--accent-navyblue)]">Trip: {delivery.tripNo}</div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-primary">{delivery.customerName || 'N/A'}</div>
                          {delivery.receiver?.name && delivery.receiver.name !== delivery.customerName && (
                            <div className="text-xs text-secondary">Receiver: {delivery.receiver.name}</div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center text-sm text-primary">
                            <MapPin className="w-4 h-4 mr-1 text-secondary" />
                            {delivery.deliveryLocation}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center text-sm text-primary">
                            <Calendar className="w-4 h-4 mr-1 text-secondary" />
                            <div>
                              <div>{formatDate(delivery.deliveryDate)}</div>
                              <div className="text-xs text-secondary">{delivery.deliveryTime}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center text-sm text-primary">
                            <User className="w-4 h-4 mr-1 text-secondary flex-shrink-0" />
                            <div>
                              <div>{delivery.driverName || 'Not assigned'}</div>
                              {delivery.coDriver?.name && (
                                <div className="text-xs text-secondary">Co: {delivery.coDriver.name}</div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center text-sm text-primary">
                            <Truck className="w-4 h-4 mr-1 text-secondary flex-shrink-0" />
                            <div>
                              <div>{delivery.truckPlate || 'Not assigned'}</div>
                              {delivery.trailer?.licensePlate && (
                                <div className="text-xs text-secondary">Trailer: {delivery.trailer.licensePlate}</div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-primary">{delivery.items}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getStatusBadge(delivery.status)}
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

export default DeliveriesPage;

