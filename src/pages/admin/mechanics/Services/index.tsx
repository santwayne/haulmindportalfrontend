import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  listVehicleServices,
  updateServiceStatus,
  updateVehicleService,
  type VehicleServiceResponse,
  type ServiceFilters,
} from "../../../../axios/api/vehicleService";
import { getAllSpareParts } from "../../../../axios/api/fleet.spareparts";
import { getUserId } from "../../../../utils/auth";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Wrench,
  FileText,
  CheckCircle,
  Clock,
  Play,
  Package,
  Trash2,
} from "lucide-react";

const formatDate = (value?: string) => {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "—";
  return parsed.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

const statusBadge = (status: string) => {
  const s = (status || "").toLowerCase();
  const styles: Record<string, string> = {
    completed: "bg-green-100 text-green-800",
    "in-progress": "bg-blue-100 text-blue-800",
    pending: "bg-amber-100 text-amber-800",
  };
  const style = styles[s] || "bg-card text-headings";
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${style}`}>
      {status || "—"}
    </span>
  );
};

const priorityBadge = (priority: string) => {
  const p = (priority || "").toLowerCase();
  const styles: Record<string, string> = {
    urgent: "bg-red-100 text-red-800",
    high: "bg-orange-100 text-orange-800",
    medium: "bg-yellow-100 text-yellow-800",
    low: "bg-card text-headings",
  };
  const style = styles[p] || "bg-card text-headings";
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${style}`}>
      {priority || "—"}
    </span>
  );
};

interface PartRow {
  id: string;
  partId?: string;
  partName: string;
  partNumber: string;
  quantity: number;
  cost: number;
}

interface SparePartOption {
  _id: string;
  partNumber: string;
  partName: string;
  sellingPrice?: number;
  buyingPrice?: number;
  stockQty?: number;
}

const Services: React.FC = () => {
  const currentUserId = getUserId();

  const [allServicesData, setAllServicesData] = useState<VehicleServiceResponse[]>([]);
  const [services, setServices] = useState<VehicleServiceResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [pagination, setPagination] = useState({
    totalCount: 0,
    page: 1,
    totalPages: 1,
  });
  const [selectedService, setSelectedService] = useState<VehicleServiceResponse | null>(null);
  const [completeModal, setCompleteModal] = useState<VehicleServiceResponse | null>(null);
  const [completeForm, setCompleteForm] = useState({
    parts: [] as PartRow[],
  });
  const [spareParts, setSpareParts] = useState<SparePartOption[]>([]);
  const [sparePartsLoading, setSparePartsLoading] = useState(false);
  const [selectedPartId, setSelectedPartId] = useState<string>("");
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);

  // Calculate stats from all services
  const stats = useMemo(() => {
    const total = allServicesData.length;
    const completed = allServicesData.filter((s) => s.status === "completed").length;
    const pending = allServicesData.filter((s) => s.status === "pending").length;
    const inProgress = allServicesData.filter((s) => s.status === "in-progress").length;
    return { total, completed, pending, inProgress };
  }, [allServicesData]);

  const loadServices = useCallback(async (pageNum = page) => {
    if (!currentUserId) {
      setError("User ID not found. Please log in again.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      console.log("🔍 Loading services for mechanic:", currentUserId);

      const filters: ServiceFilters = {
        // Note: Backend automatically filters by mechanic ID for 'Maintenance Crew (Mechanics)' role
      };

      // Load ALL services for stats (no filters)
      const allResponse = await listVehicleServices({});
      if (allResponse?.success && allResponse?.data) {
        const allServices = Array.isArray(allResponse.data) ? allResponse.data : [];
        setAllServicesData(allServices);
      }

      // Apply filters for table display
      if (statusFilter !== "all") {
        filters.status = statusFilter as "pending" | "in-progress" | "completed";
      }

      if (priorityFilter !== "all") {
        filters.priority = priorityFilter as "low" | "medium" | "high" | "urgent";
      }

      console.log("📤 API Filters:", filters);
      const response = await listVehicleServices(filters);
      console.log("📥 API Response:", response);

      if (response?.success && response?.data) {
        let filteredServices = Array.isArray(response.data) ? response.data : [];

        console.log(`✅ Received ${filteredServices.length} services from API`);

        // Client-side filtering for search
        if (search.trim()) {
          const searchLower = search.toLowerCase();
          filteredServices = filteredServices.filter((service: { unitNumber: any; description: any; serviceType: any; makeModel: any; invoiceNumber: any; }) => {
            const unitNumber = (service.unitNumber || "").toLowerCase();
            const description = (service.description || "").toLowerCase();
            const serviceType = (service.serviceType || "").toLowerCase();
            const makeModel = (service.makeModel || "").toLowerCase();
            const invoiceNumber = (service.invoiceNumber || "").toLowerCase();
            return (
              unitNumber.includes(searchLower) ||
              description.includes(searchLower) ||
              serviceType.includes(searchLower) ||
              makeModel.includes(searchLower) ||
              invoiceNumber.includes(searchLower)
            );
          });
        }

        // Pagination
        const startIndex = (pageNum - 1) * limit;
        const endIndex = startIndex + limit;
        const paginatedServices = filteredServices.slice(startIndex, endIndex);

        setServices(paginatedServices);
        setPagination({
          totalCount: filteredServices.length,
          page: pageNum,
          totalPages: Math.ceil(filteredServices.length / limit),
        });
      } else {
        const errorMsg = response?.message || "Failed to load services";
        console.error("❌ API Error:", errorMsg);
        setError(errorMsg);
        setServices([]);
        setPagination({
          totalCount: 0,
          page: 1,
          totalPages: 1,
        });
      }
    } catch (err: any) {
      const errorMsg = err?.response?.data?.message || err?.message || "Failed to load services";
      console.error("❌ Error loading services:", err);
      setError(errorMsg);
      setServices([]);
      setPagination({
        totalCount: 0,
        page: 1,
        totalPages: 1,
      });
    } finally {
      setLoading(false);
    }
  }, [currentUserId, statusFilter, priorityFilter, search, page, limit]);

  useEffect(() => {
    loadServices(page);
  }, [loadServices, page]);

  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    if (!notification) return;
    const t = setTimeout(() => setNotification(null), 4000);
    return () => clearTimeout(t);
  }, [notification]);

  const loadSpareParts = async () => {
    setSparePartsLoading(true);
    try {
      const res = await getAllSpareParts();
      if (res?.success && res?.data) {
        setSpareParts(Array.isArray(res.data) ? res.data : []);
      } else {
        setSpareParts([]);
      }
    } catch {
      setSpareParts([]);
    } finally {
      setSparePartsLoading(false);
    }
  };

  useEffect(() => {
    if (completeModal) loadSpareParts();
  }, [completeModal]);

  const handleUpdateStatus = async (serviceId: string, status: "pending" | "in-progress" | "completed") => {
    if (status === "completed") {
      // Open parts modal
      const service = allServicesData.find((s) => s._id === serviceId);
      if (service) {
        setCompleteModal(service);
        setCompleteForm({ parts: [] });
      }
    } else {
      // Update status directly
      setUpdatingStatus(serviceId);
      try {
        const response = await updateServiceStatus(serviceId, status);
        if (response?.success) {
          setNotification({ type: "success", message: `Service status updated to ${status}` });
          await loadServices(page);
        } else {
          setNotification({ type: "error", message: response?.message || "Failed to update status" });
        }
      } catch (err: any) {
        setNotification({ type: "error", message: err?.response?.data?.message || "Failed to update status" });
      } finally {
        setUpdatingStatus(null);
      }
    }
  };

  const handleCompleteService = async () => {
    if (!completeModal) return;

    setUpdatingStatus(completeModal._id);
    try {
      // Prepare parts data
      const partsData = completeForm.parts.map((p) => ({
        partId: p.partId || p.id,
        partName: p.partName,
        partNumber: p.partNumber,
        quantity: p.quantity,
        cost: p.cost,
      }));

      // Update service with status and parts
      const updateData: any = {
        status: "completed",
      };

      if (partsData.length > 0) {
        updateData.parts = partsData;
      }

      const response = await updateVehicleService(completeModal._id, updateData);
      if (response?.success) {
        setNotification({ type: "success", message: "Service marked as completed" });
        setCompleteModal(null);
        setCompleteForm({ parts: [] });
        await loadServices(page);
      } else {
        setNotification({ type: "error", message: response?.message || "Failed to complete service" });
      }
    } catch (err: any) {
      setNotification({ type: "error", message: err?.response?.data?.message || "Failed to complete service" });
    } finally {
      setUpdatingStatus(null);
    }
  };

  const addPart = () => {
    if (!selectedPartId) return;
    const part = spareParts.find((p) => p._id === selectedPartId);
    if (!part) return;

    const newPart: PartRow = {
      id: `part-${Date.now()}`,
      partId: part._id,
      partName: part.partName || "",
      partNumber: part.partNumber || "",
      quantity: 1,
      cost: part.sellingPrice || part.buyingPrice || 0,
    };

    setCompleteForm({
      ...completeForm,
      parts: [...completeForm.parts, newPart],
    });
    setSelectedPartId("");
  };

  const removePart = (id: string) => {
    setCompleteForm({
      ...completeForm,
      parts: completeForm.parts.filter((p) => p.id !== id),
    });
  };

  const updatePart = (id: string, field: keyof PartRow, value: any) => {
    setCompleteForm({
      ...completeForm,
      parts: completeForm.parts.map((p) => (p.id === id ? { ...p, [field]: value } : p)),
    });
  };

  const partsTotal = useMemo(
    () => completeForm.parts.reduce((sum, p) => sum + (p.quantity || 0) * (p.cost || 0), 0),
    [completeForm.parts]
  );

  if (loading && services.length === 0) {
    return (
      <div className="p-6 min-h-screen bg-main">
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[var(--accent-blue)]" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-main min-h-screen">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-headings">Assigned Services</h1>
        <p className="text-sm text-secondary mt-1">Services assigned to you</p>
      </div>

      {notification && (
        <div
          className={`mb-4 rounded-lg border px-4 py-3 ${notification.type === "success"
            ? "border-green-200 bg-green-50 text-green-800"
            : "border-red-200 bg-card text-red-800"
            }`}
        >
          {notification.message}
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-card px-4 py-3 text-red-800">
          {error}
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-card rounded-lg shadow-sm border border-theme p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-secondary uppercase tracking-wide">Total</p>
              <p className="text-2xl font-bold text-headings mt-1">{stats.total}</p>
            </div>
            <div className="p-3 rounded-lg ">
              <FileText className="text-[var(--accent-navyblue)]" size={24} />
            </div>
          </div>
        </div>
        <div className="bg-card rounded-lg shadow-sm border border-theme p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-secondary uppercase tracking-wide">Pending</p>
              <p className="text-2xl font-bold text-amber-600 mt-1">{stats.pending}</p>
            </div>
            <div className="p-3 rounded-lg ">
              <Clock className="text-[var(--accent-amber)]" size={24} />
            </div>
          </div>
        </div>
        <div className="bg-card rounded-lg shadow-sm border border-theme p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-secondary uppercase tracking-wide">In Progress</p>
              <p className="text-2xl font-bold text-[#00D1FF] mt-1">{stats.inProgress}</p>
            </div>
            <div className="p-3 rounded-lg ">
              <Play className="text-[var(--accent-blue)]" size={24} />
            </div>
          </div>
        </div>
        <div className="bg-card rounded-lg shadow-sm border border-theme p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-secondary uppercase tracking-wide">Completed</p>
              <p className="text-2xl font-bold text-green-600 mt-1">{stats.completed}</p>
            </div>
            <div className="p-3 rounded-lg ">
              <CheckCircle className="text-[var(--accent-green)]" size={24} />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-card rounded-lg shadow-sm border border-theme overflow-hidden mb-6">
        <div className="px-4 py-3 border-b border-theme bg-gradient-to-r from-[var(--accent-blue)]/5 to-transparent flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-sm font-bold text-headings">Services</h2>
            <p className="text-xs text-secondary mt-0.5">
              {pagination.totalCount} service{pagination.totalCount !== 1 ? "s" : ""} found
              {pagination.totalPages > 1 && ` • Page ${pagination.page} of ${pagination.totalPages}`}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary" size={16} />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search unit, description..."
                className="pl-9 pr-3 py-2 text-sm border border-theme rounded-lg w-48 focus:border-[var(--accent-blue)] focus:ring-2 focus:ring-[var(--accent-blue)]/20"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 text-sm border border-theme rounded-lg focus:border-[var(--accent-blue)] focus:ring-2 focus:ring-[var(--accent-blue)]/20"
            >
              <option className='form-option' value="all">All Status</option>
              <option className='form-option' value="pending">Pending</option>
              <option className='form-option' value="in-progress">In Progress</option>
              <option className='form-option' value="completed">Completed</option>
            </select>
            <select
              value={priorityFilter}
              onChange={(e) => {
                setPriorityFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 text-sm border border-theme rounded-lg focus:border-[var(--accent-blue)] focus:ring-2 focus:ring-[var(--accent-blue)]/20"
            >
              <option className='form-option' value="all">All Priorities</option>
              <option className='form-option' value="urgent">Urgent</option>
              <option className='form-option' value="high">High</option>
              <option className='form-option' value="medium">Medium</option>
              <option className='form-option' value="low">Low</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-card">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-headings uppercase tracking-wider">
                  Service Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-headings uppercase tracking-wider">
                  Unit Number
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-headings uppercase tracking-wider">
                  Unit Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-headings uppercase tracking-wider">
                  Make/Model
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-headings uppercase tracking-wider">
                  Service Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-headings uppercase tracking-wider">
                  Description
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-headings uppercase tracking-wider">
                  Priority
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-headings uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-headings uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-card  divide-white/5">
              {services.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-secondary">
                    No services assigned to you
                  </td>
                </tr>
              ) : (
                services.map((service) => (
                  <tr key={service._id} className="hover:bg-[rgba(255,255,255,0.03)]">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary">
                      {formatDate(service.serviceDate)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-secondary">
                      {service.unitNumber || "—"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary">
                      {service.unitType || "—"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary">
                      {service.makeModel || "—"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary">
                      {service.serviceType || "—"}
                    </td>
                    <td className="px-6 py-4 text-sm text-secondary max-w-xs truncate" title={service.description || undefined}>
                      {service.description || "—"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {priorityBadge(service.priority)}
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      {statusBadge(service.status)}
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">

                        {/* Start */}
                        {service.status !== "in-progress" && service.status !== "completed" && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleUpdateStatus(service._id, "in-progress");
                            }}
                            disabled={updatingStatus === service._id}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-200 
        bg-[rgba(59,130,246,0.12)] text-[#60A5FA] border border-[rgba(59,130,246,0.3)] 
        hover:bg-[rgba(59,130,246,0.2)] disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <Play size={14} />
                            Start
                          </button>
                        )}

                        {/* Complete */}
                        {service.status !== "completed" && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleUpdateStatus(service._id, "completed");
                            }}
                            disabled={updatingStatus === service._id}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-200 
        bg-[rgba(16,185,129,0.12)] text-[#34D399] border border-[rgba(16,185,129,0.3)] 
        hover:bg-[rgba(16,185,129,0.2)] disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <CheckCircle size={14} />
                            Complete
                          </button>
                        )}

                        {/* View */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedService(service);
                          }}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-200 
      bg-[rgba(255,255,255,0.05)] text-secondary border border-theme 
      hover:bg-[rgba(255,255,255,0.08)] hover:text-white"
                        >
                          <FileText size={14} />
                          View
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
        {pagination.totalPages > 1 && (
          <div className="px-4 py-3 border-t border-theme flex items-center justify-between">
            <p className="text-sm text-secondary">
              Showing {(pagination.page - 1) * limit + 1}–{Math.min(pagination.page * limit, pagination.totalCount)} of {pagination.totalCount}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={pagination.page <= 1 || loading}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-headings bg-card border border-theme rounded-lg hover:bg-[rgba(255,255,255,0.03)] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={16} />
                Previous
              </button>
              <span className="text-sm text-secondary px-2">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                disabled={pagination.page >= pagination.totalPages || loading}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-headings bg-card border border-theme rounded-lg hover:bg-[rgba(255,255,255,0.03)] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Service Details Modal */}
      {selectedService && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
          <div className="bg-card rounded-xl shadow-2xl w-full max-w-2xl my-8 max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-theme bg-gradient-to-r from-[var(--accent-blue)]/5 to-transparent flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-[var(--accent-blue)]/10">
                  <Wrench className="text-[var(--accent-blue)]" size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-headings">Service Details</h3>
                  <p className="text-xs text-secondary mt-0.5">
                    Unit {selectedService.unitNumber || "—"} • {formatDate(selectedService.serviceDate)}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedService(null)}
                className="p-2 text-secondary hover:text-secondary hover:bg-[rgba(255,255,255,0.03)] rounded-lg transition"
              >
                ×
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-5">
              {/* Status & Priority */}
              <div className="flex flex-wrap items-center gap-3">
                {statusBadge(selectedService.status)}
                {priorityBadge(selectedService.priority)}
              </div>

              {/* Service Info */}
              <div className="grid grid-cols-2 gap-4 p-4 rounded-lg bg-card border border-theme">
                <div>
                  <p className="text-xs font-medium text-secondary uppercase tracking-wide">Unit Number</p>
                  <p className="text-sm font-semibold text-headings mt-0.5">{selectedService.unitNumber || "—"}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-secondary uppercase tracking-wide">Unit Type</p>
                  <p className="text-sm font-semibold text-headings mt-0.5">{selectedService.unitType || "—"}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-secondary uppercase tracking-wide">Make/Model</p>
                  <p className="text-sm font-semibold text-headings mt-0.5">{selectedService.makeModel || "—"}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-secondary uppercase tracking-wide">Service Type</p>
                  <p className="text-sm font-semibold text-headings mt-0.5">{selectedService.serviceType || "—"}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-secondary uppercase tracking-wide">Service Date</p>
                  <p className="text-sm font-semibold text-headings mt-0.5">{formatDate(selectedService.serviceDate)}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-secondary uppercase tracking-wide">Due Date</p>
                  <p className="text-sm font-semibold text-headings mt-0.5">{formatDate(selectedService.dueDate)}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-secondary uppercase tracking-wide">Odometer</p>
                  <p className="text-sm font-semibold text-headings mt-0.5">
                    {selectedService.odometer != null ? selectedService.odometer.toLocaleString() : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-secondary uppercase tracking-wide">Due Mileage</p>
                  <p className="text-sm font-semibold text-headings mt-0.5">
                    {selectedService.dueMileage != null ? selectedService.dueMileage.toLocaleString() : "—"}
                  </p>
                </div>
                {selectedService.description && (
                  <div className="col-span-2">
                    <p className="text-xs font-medium text-secondary uppercase tracking-wide">Description</p>
                    <p className="text-sm text-headings mt-0.5">{selectedService.description}</p>
                  </div>
                )}
                {selectedService.notes && (
                  <div className="col-span-2">
                    <p className="text-xs font-medium text-secondary uppercase tracking-wide">Notes</p>
                    <p className="text-sm text-headings mt-0.5">{selectedService.notes}</p>
                  </div>
                )}
                {selectedService.invoiceNumber && (
                  <div>
                    <p className="text-xs font-medium text-secondary uppercase tracking-wide">Invoice Number</p>
                    <p className="text-sm font-semibold text-headings mt-0.5">{selectedService.invoiceNumber}</p>
                  </div>
                )}
                {selectedService.amount != null && (
                  <div>
                    <p className="text-xs font-medium text-secondary uppercase tracking-wide">Amount</p>
                    <p className="text-sm font-semibold text-headings mt-0.5">
                      ${selectedService.amount.toFixed(2)}
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="px-6 py-4 border-t border-theme bg-gray-50/30 flex-shrink-0">
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedService(null)}
                  className="px-4 py-2 text-sm font-medium text-headings bg-card border border-theme hover:bg-[rgba(255,255,255,0.03)] rounded-lg"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Complete Service Modal with Parts */}
      {completeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
          <div className="bg-card rounded-xl shadow-2xl w-full max-w-3xl my-8 max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-theme bg-gradient-to-r from-[var(--accent-blue)]/5 to-transparent flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg ">
                  <CheckCircle className="text-[var(--accent-navyblue)]" size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-headings">Complete Service</h3>
                  <p className="text-xs text-secondary mt-0.5">
                    Unit {completeModal.unitNumber || "—"} • {completeModal.serviceType || "—"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setCompleteModal(null);
                  setCompleteForm({ parts: [] });
                }}
                className="p-2 text-secondary hover:text-secondary hover:bg-[rgba(255,255,255,0.03)] rounded-lg transition"
              >
                ×
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-5">
              {/* Add Parts Section */}
              <div className="border border-theme rounded-lg p-4">
                <h4 className="text-sm font-semibold text-headings mb-3 flex items-center gap-2">
                  <Package size={18} />
                  Add Parts Used
                </h4>
                <div className="flex gap-2 mb-4">
                  <select
                    value={selectedPartId}
                    onChange={(e) => setSelectedPartId(e.target.value)}
                    disabled={sparePartsLoading}
                    className="flex-1 px-3 py-2 text-sm border border-theme rounded-lg 
  bg-[var(--bg-primary)] text-[var(--text-primary)]
  focus:border-[var(--accent-blue)] 
  focus:ring-2 focus:ring-[var(--accent-blue)]/20
  outline-none"
                  >
                    <option className='form-option' value="">
                      Select a part...
                    </option>

                    {spareParts.map((part) => (
                      <option
                        key={part._id}
                        value={part._id}
                        className='form-option'
                      >
                        {part.partNumber} - {part.partName}{" "}
                        {part.stockQty !== undefined ? `(Stock: ${part.stockQty})` : ""}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={addPart}
                    disabled={!selectedPartId || sparePartsLoading}
                    className="px-4 py-2 text-sm font-medium text-white bg-[var(--accent-navyblue)] rounded-lg hover:bg-[var(--accent-navyblue)]/90 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Add
                  </button>
                </div>

                {/* Parts List */}
                {completeForm.parts.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <div className="grid grid-cols-12 gap-2 text-xs font-medium text-secondary uppercase tracking-wide pb-2 border-b">
                      <div className="col-span-4">Part</div>
                      <div className="col-span-2">Part Number</div>
                      <div className="col-span-2">Quantity</div>
                      <div className="col-span-2">Cost</div>
                      <div className="col-span-2">Total</div>
                    </div>
                    {completeForm.parts.map((part) => (
                      <div key={part.id} className="grid grid-cols-12 gap-2 items-center py-2 border-b border-theme">
                        <div className="col-span-4 text-sm text-headings">{part.partName}</div>
                        <div className="col-span-2 text-sm text-secondary">{part.partNumber}</div>
                        <div className="col-span-2">
                          <input
                            type="number"
                            min="1"
                            value={part.quantity}
                            onChange={(e) => updatePart(part.id, "quantity", parseInt(e.target.value) || 1)}
                            className="w-full px-2 py-1 text-sm border border-theme rounded focus:border-[var(--accent-blue)] focus:ring-1 focus:ring-[var(--accent-blue)]/20"
                          />
                        </div>
                        <div className="col-span-2">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={part.cost}
                            onChange={(e) => updatePart(part.id, "cost", parseFloat(e.target.value) || 0)}
                            className="w-full px-2 py-1 text-sm border border-theme rounded focus:border-[var(--accent-blue)] focus:ring-1 focus:ring-[var(--accent-blue)]/20"
                          />
                        </div>
                        <div className="col-span-1 text-sm font-semibold text-headings">
                          ${((part.quantity || 0) * (part.cost || 0)).toFixed(2)}
                        </div>
                        <div className="col-span-1">
                          <button
                            type="button"
                            onClick={() => removePart(part.id)}
                            className="p-1 text-[#A855F7] hover:bg-red-50 rounded"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                    <div className="pt-2 flex justify-end">
                      <div className="text-sm font-semibold text-headings">
                        Parts Total: <span className="text-lg">${partsTotal.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="px-6 py-4 border-t border-theme flex-shrink-0">
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setCompleteModal(null);
                    setCompleteForm({ parts: [] });
                  }}
                  className="px-4 py-2 text-sm font-medium text-primary bg-card border border-theme hover:bg-[rgba(255,255,255,0.03)] rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCompleteService}
                  disabled={updatingStatus === completeModal._id}
                  className="px-4 py-2 text-sm font-medium text-primary bg-[var(--accent-navyblue)] rounded-lg hover:bg-[var(--accent-navyblue)]/90 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {updatingStatus === completeModal._id ? "Completing..." : "Complete Service"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Services;
