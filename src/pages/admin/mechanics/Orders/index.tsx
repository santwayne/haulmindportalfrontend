import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  listMechanicOrders,
  completeRepair,
  type MechanicOrder,
} from "../../../../axios/api/mechanicOrders";
import { getAllSpareParts } from "../../../../axios/api/fleet.spareparts";
import { Play, CheckCircle, X, Trash2, FileText, Wrench, Package, Eye, Calendar, Search, ChevronLeft, ChevronRight, LayoutGrid, ChevronDown, ChevronUp, Car, PackageOpen } from "lucide-react";

const formatDate = (value?: string) => {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "—";
  return parsed.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

const formatDateTime = (value?: string) => {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "—";
  return parsed.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const canCompleteOrder = (status?: string) =>
  ["Created", "Assigned", "Shared", "in-progress"].includes(status || "");

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

interface OrdersProps {
  defaultStatus?: string; // e.g. "completed" for Completed Orders page
}

const Orders: React.FC<OrdersProps> = ({ defaultStatus }) => {
  const [orders, setOrders] = useState<MechanicOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [completeModal, setCompleteModal] = useState<MechanicOrder | null>(null);
  const [completeForm, setCompleteForm] = useState({
    repairDetails: "",
    totalAmount: "",
    parts: [] as PartRow[],
  });
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null);
  const [submittingComplete, setSubmittingComplete] = useState(false);
  const [spareParts, setSpareParts] = useState<SparePartOption[]>([]);
  const [sparePartsLoading, setSparePartsLoading] = useState(false);
  const [selectedPartId, setSelectedPartId] = useState<string>("");
  const [detailsOrder, setDetailsOrder] = useState<MechanicOrder | null>(null);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>(defaultStatus || "all");
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [limit] = useState(10);
  const [pagination, setPagination] = useState({
    totalCount: 0,
    allCount: 0,
    completedCount: 0,
    pendingCount: 0,
    page: 1,
    totalPages: 1,
  });

  const partsSubtotal = useMemo(
    () =>
      completeForm.parts.reduce((sum, p) => sum + (p.quantity || 0) * (p.cost || 0), 0),
    [completeForm.parts]
  );

  const calculatedTotal = useMemo(() => {
    const manual = parseFloat(completeForm.totalAmount);
    if (!Number.isNaN(manual) && manual > 0) return manual;
    return partsSubtotal;
  }, [completeForm.totalAmount, partsSubtotal]);

  const loadOrders = useCallback(async (pageNum = page) => {
    setLoading(true);
    setError(null);
    try {
      const response = await listMechanicOrders({
        search: search.trim() || undefined,
        status: statusFilter !== "all" ? statusFilter : undefined,
        page: pageNum,
        limit,
      });
      if (response?.success && response?.data) {
        setOrders(Array.isArray(response.data) ? response.data : []);
        setPagination({
          totalCount: response.totalCount ?? 0,
          allCount: response.allCount ?? 0,
          completedCount: response.completedCount ?? 0,
          pendingCount: response.pendingCount ?? 0,
          page: response.page ?? 1,
          totalPages: response.totalPages ?? 1,
        });
      } else {
        setError(response?.message || "Failed to load orders");
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || "Failed to load orders");
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, page, limit]);

  useEffect(() => {
    loadOrders(page);
  }, [search, statusFilter, page]);

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

  const openCompleteModal = (order: MechanicOrder) => {
    setCompleteModal(order);
    setCompleteForm({
      repairDetails: (order.repairDetails as string) || (order.description as string) || "",
      totalAmount: order.amount ? String(order.amount) : "",
      parts: [],
    });
    setInvoiceFile(null);
  };

  const closeCompleteModal = () => {
    setCompleteModal(null);
    setCompleteForm({ repairDetails: "", totalAmount: "", parts: [] });
    setInvoiceFile(null);
  };

  const addPart = () => {
    setCompleteForm((f) => ({
      ...f,
      parts: [
        ...f.parts,
        { id: crypto.randomUUID(), partName: "", partNumber: "", quantity: 1, cost: 0 },
      ],
    }));
  };

  const addPartFromDropdown = () => {
    if (!selectedPartId) return;
    const part = spareParts.find((p) => p._id === selectedPartId);
    if (!part) return;
    const cost = part.sellingPrice ?? part.buyingPrice ?? 0;
    setCompleteForm((f) => ({
      ...f,
      parts: [
        ...f.parts,
        {
          id: crypto.randomUUID(),
          partId: part._id,
          partName: part.partName || "",
          partNumber: part.partNumber || "",
          quantity: 1,
          cost,
        },
      ],
    }));
    setSelectedPartId("");
  };

  const updatePart = (id: string, field: keyof PartRow, value: string | number) => {
    setCompleteForm((f) => ({
      ...f,
      parts: f.parts.map((p) =>
        p.id === id ? { ...p, [field]: value } : p
      ),
    }));
  };

  const removePart = (id: string) => {
    setCompleteForm((f) => ({
      ...f,
      parts: f.parts.filter((p) => p.id !== id),
    }));
  };

  const handleCompleteOrder = async () => {
    if (!completeModal) return;
    const repairDetails = completeForm.repairDetails.trim();
    const totalAmount = calculatedTotal;
    if (!repairDetails) {
      setNotification({ type: "error", message: "Repair details are required" });
      return;
    }
    if (totalAmount < 0 || Number.isNaN(totalAmount)) {
      setNotification({ type: "error", message: "Valid total amount is required" });
      return;
    }
    if (!invoiceFile) {
      setNotification({ type: "error", message: "Invoice file is required" });
      return;
    }

    const partsPayload = completeForm.parts
      .filter((p) => (p.partName || p.partNumber).trim())
      .map(({ partId, partName, partNumber, quantity, cost }) => ({
        partId: partId || undefined,
        partName: partName.trim() || "Part",
        partNumber: partNumber.trim(),
        quantity: Number(quantity) || 1,
        cost: Number(cost) || 0,
      }));

    setSubmittingComplete(true);
    try {
      const response = await completeRepair(
        completeModal._id,
        { repairDetails, totalAmount, parts: partsPayload.length > 0 ? partsPayload : undefined },
        invoiceFile
      );
      if (response?.success) {
        setNotification({ type: "success", message: "Order completed successfully" });
        closeCompleteModal();
        await loadOrders(page);
      } else {
        setNotification({ type: "error", message: response?.message || "Failed to complete repair" });
      }
    } catch (err: any) {
      setNotification({
        type: "error",
        message: err?.response?.data?.message || err?.message || "Failed to complete repair",
      });
    } finally {
      setSubmittingComplete(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 min-h-screen bg-main ">
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[var(--accent-blue)]" />
        </div>
      </div>
    );
  }

  const isCompletedOnly = defaultStatus === "completed";

  return (
    <div className="p-6 bg-main min-h-screen ">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-headings">{isCompletedOnly ? "Completed Orders" : "Mechanics Portal"}</h1>
        <p className="text-sm text-secondary mt-1">
          {isCompletedOnly ? "All completed maintenance orders" : "Maintenance orders assigned to mechanics"}
        </p>
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

      {/* Count cards - hidden on Completed Orders page */}
      {!isCompletedOnly && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6  ">
          <div
            onClick={() => { setStatusFilter("all"); setPage(1); }}
            className={`p-4 rounded-lg border-2 cursor-pointer transition ${statusFilter === "all"
              ? "border-[var(--accent-blue)] bg-[var(--accent-blue)]/5"
              : "border-theme bg-card hover:border-theme"
              }`}
          >
            <div className="flex items-center gap-2">
              <LayoutGrid className="text-[var(--accent-blue)]" size={20} />
              <span className="text-sm font-medium text-[var(--accent-blue)]">All Orders</span>
            </div>
            <p className="text-2xl font-bold text-primary mt-1">{pagination.allCount}</p>
          </div>
          <div
            onClick={() => { setStatusFilter("pending"); setPage(1); }}
            className={`p-4 rounded-lg border-2 cursor-pointer transition ${statusFilter === "pending"
              ? "border-[var(--accent-amber)] bg-[var(--accent-amber)]/5"
              : "border-theme bg-card hover:border-theme"
              }`}
          >
            <div className="flex items-center gap-2">
              <Play className="text-[var(--accent-amber)]" size={20} />
              <span className="text-sm font-medium text-[var(--accent-amber)]">Pending</span>
            </div>
            <p className="text-2xl font-bold text-primary mt-1">{pagination.pendingCount}</p>
          </div>
          <div
            onClick={() => { setStatusFilter("completed"); setPage(1); }}
            className={`p-4 rounded-lg border-2 cursor-pointer transition ${statusFilter === "completed"
              ? "border-[var(--accent-green)] bg-[var(--accent-green)]/5"
              : "border-theme bg-card hover:border-theme"
              }`}
          >
            <div className="flex items-center gap-2">
              <CheckCircle className="text-[var(--accent-green)]" size={20} />
              <span className="text-sm font-medium text-[var(--accent-green)]">Completed</span>
            </div>
            <p className="text-2xl font-bold text-primary mt-1">{pagination.completedCount}</p>
          </div>
        </div>
      )}

      {/* Completed count badge - shown only on Completed Orders page */}
      {isCompletedOnly && (
        <div className="mb-6 p-4 rounded-lg border-2 border-green-500 bg-card">
          <div className="flex items-center gap-2">
            <CheckCircle className="text-green-600" size={20} />
            <span className="text-sm font-medium text-[var(--accent-green)]">Completed Orders</span>
          </div>
          <p className="text-2xl font-bold text-headings mt-1">{pagination.completedCount}</p>
        </div>
      )}

      <div className="bg-card rounded-lg shadow-sm border border-theme overflow-hidden">
        <div className="px-4 py-3 border-b border-theme bg-gradient-to-r from-[var(--accent-blue)]/5 to-transparent flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-sm font-bold text-headings">{isCompletedOnly ? "Completed Orders" : "Orders"}</h2>
            <p className="text-xs text-secondary mt-0.5">
              {pagination.totalCount} order{pagination.totalCount !== 1 ? "s" : ""} found
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
            {!isCompletedOnly && (
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                className="px-3 py-2 text-sm border border-theme rounded-lg 
    bg-[var(--bg-primary)] text-[var(--text-primary)]
    focus:border-[var(--accent-blue)] 
    focus:ring-2 focus:ring-[var(--accent-blue)]/20
    outline-none cursor-pointer"
              >
                <option className='form-option' value="all">All Status</option>
                <option className='form-option' value="pending">Pending</option>
                <option className='form-option' value="completed">Completed</option>
                <option className='form-option' value="Created">Created</option>
                <option className='form-option' value="Assigned">Assigned</option>
                <option className='form-option' value="Shared">Shared</option>
                <option className='form-option' value="in-progress">In Progress</option>
              </select>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full ">
            <thead className="bg-card">
              <tr>
                <th className="w-8 px-2 py-3" />
                <th className="px-6 py-3 text-left text-xs font-medium text-headings uppercase tracking-wider">
                  Service Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-headings uppercase tracking-wider">
                  Unit
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-headings uppercase tracking-wider">
                  Description
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-headings uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-headings uppercase tracking-wider">
                  Completed
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-headings uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-card">
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-secondary">
                    No maintenance orders found
                  </td>
                </tr>
              ) : (
                orders.map((order) => (
                  <React.Fragment key={order._id}>
                    <tr
                      onClick={() => setDetailsOrder(order)}
                      className="hover:bg-[rgba(255,255,255,0.03)] cursor-pointer"
                    >
                      <td className="px-2 py-4" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => setExpandedId((id) => (id === order._id ? null : order._id))}
                          className="p-1 rounded hover:bg-gray-200 text-secondary"
                          title={expandedId === order._id ? "Collapse" : "Expand details"}
                        >
                          {expandedId === order._id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary">
                        {formatDate(order.serviceDate)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary">
                        {order.unitNumber || "—"}
                      </td>
                      <td className="px-6 py-4 text-sm text-secondary max-w-xs truncate">
                        {order.description || order.repairDetails || "—"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${order.status === "completed" || order.status === "Completed"
                            ? "bg-green-100 text-green-800"
                            : order.status === "in-progress"
                              ? "bg-blue-100 text-blue-800"
                              : order.status === "Assigned" || order.status === "Shared"
                                ? "bg-amber-100 text-amber-800"
                                : "bg-card text-secondary"
                            }`}
                        >
                          {order.status || "—"}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary">
                        {(order.status === "completed" || order.status === "Completed") && order.completionDate
                          ? formatDateTime(order.completionDate)
                          : "—"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        {canCompleteOrder(order.status) ? (
                          <button
                            type="button"
                            onClick={() => openCompleteModal(order)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-[var(--accent-navyblue)] !text-white hover:bg-[#359dd9]"
                          >
                            Update
                          </button>
                        ) : (order.status === "completed" || order.status === "Completed") ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-green-100 text-green-800">
                            <CheckCircle size={12} />
                            Updated
                          </span>
                        ) : null}
                      </td>
                    </tr>
                    {expandedId === order._id && (
                      <tr className="bg-gradient-to-r from-[rgba(15,27,45,0.95)] to-[rgba(15,27,45,0.75)] border-t border-[rgba(0,209,255,0.12)]">
                        <td colSpan={7} className="px-6 py-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                            {/* Vehicle details */}
                            <div className="p-4 rounded-lg bg-card border border-theme">
                              <div className="flex items-center gap-2 mb-2 font-semibold text-headings">
                                <Car size={16} className="text-[var(--accent-blue)]" />
                                Vehicle Details
                              </div>
                              <dl className="space-y-1 text-secondary">
                                <div><span className="text-secondary">Make/Model:</span> {order.makeModel || "—"}</div>
                                <div><span className="text-secondary">VIN/Plate:</span> {order.vinLicensePlate || "—"}</div>
                                <div><span className="text-secondary">Odometer:</span> {order.odometer != null ? order.odometer.toLocaleString() : "—"}</div>
                              </dl>
                            </div>
                            {/* Repair details */}
                            <div className="p-4 rounded-lg bg-card border border-theme md:col-span-2">
                              <div className="flex items-center gap-2 mb-2 font-semibold text-headings">
                                <FileText size={16} className="text-[var(--accent-blue)]" />
                                Repair Details
                              </div>
                              <p className="text-secondary whitespace-pre-wrap">{order.repairDetails || order.description || "—"}</p>
                            </div>
                            {/* Parts used */}
                            <div className="p-4 rounded-lg bg-card border border-theme lg:col-span-2">
                              <div className="flex items-center gap-2 mb-2 font-semibold text-headings">
                                <PackageOpen size={16} className="text-[var(--accent-blue)]" />
                                Parts Used ({order.completedParts?.length ?? 0})
                              </div>
                              {order.completedParts && order.completedParts.length > 0 ? (
                                <div className="overflow-x-auto">
                                  <table className="min-w-full text-xs">
                                    <thead>
                                      <tr className="text-secondary border-b">
                                        <th className="text-left py-1.5 pr-4">Part</th>
                                        <th className="text-left py-1.5 pr-4">Part #</th>
                                        <th className="text-right py-1.5 pr-4">Qty</th>
                                        <th className="text-right py-1.5">Cost</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {order.completedParts.map((p, idx) => (
                                        <tr key={idx} className="border-b border-gray-50 last:border-0">
                                          <td className="py-1.5 pr-4">{p.partName || "—"}</td>
                                          <td className="py-1.5 pr-4">{p.partNumber || "—"}</td>
                                          <td className="text-right py-1.5 pr-4">{p.quantity ?? "—"}</td>
                                          <td className="text-right py-1.5">${Number(p.cost || 0).toFixed(2)}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              ) : (
                                <p className="text-secondary">No parts recorded</p>
                              )}
                            </div>
                            {/* Dates & total */}
                            <div className="p-4 rounded-lg bg-card border border-theme">
                              <div className="flex items-center gap-2 mb-2 font-semibold text-headings">
                                <Calendar size={16} className="text-[var(--accent-blue)]" />
                                Dates & Total
                              </div>
                              <dl className="space-y-1 text-secondary">
                                <div><span className="text-secondary">Completed:</span> {order.completionDate ? formatDateTime(order.completionDate) : "—"}</div>
                                <div><span className="text-secondary">Updated:</span> {order.updatedAt ? formatDateTime(order.updatedAt) : "—"}</div>
                                {(order.status === "completed" || order.status === "Completed") && order.completionTotalAmount != null && (
                                  <div className="mt-2 pt-2 border-t font-medium">
                                    <span className="text-secondary">Total:</span> ${Number(order.completionTotalAmount).toFixed(2)}
                                  </div>
                                )}
                              </dl>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
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

      {/* Complete Repair Modal - Advanced */}
      {completeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
          <div className="bg-card rounded-xl shadow-2xl w-full max-w-2xl my-8">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-theme bg-gradient-to-r from-[var(--accent-blue)]/5 to-transparent">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-[var(--accent-blue)]/10">
                  <Wrench className="text-[var(--accent-blue)]" size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-headings">Complete Order</h3>
                  <p className="text-xs text-secondary mt-0.5">Unit {completeModal.unitNumber || "—"}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeCompleteModal}
                className="p-2 text-secondary hover:text-secondary hover:bg-[rgba(255,255,255,0.03)] rounded-lg transition"
              >
                <X size={22} />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6 max-h-[calc(100vh-220px)] overflow-y-auto">
              {/* Order Info */}
              <div className="grid grid-cols-2 gap-4 p-4 rounded-lg bg-card border border-theme">
                <div>
                  <p className="text-xs font-medium text-secondary uppercase tracking-wide">Unit</p>
                  <p className="text-sm font-semibold text-headings mt-0.5">{completeModal.unitNumber || "—"}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-secondary uppercase tracking-wide">Service Date</p>
                  <p className="text-sm font-semibold text-headings mt-0.5">{formatDate(completeModal.serviceDate)}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs font-medium text-secondary uppercase tracking-wide">Description</p>
                  <p className="text-sm font-semibold text-headings mt-0.5">{completeModal.description || "—"}</p>
                </div>
              </div>

              {/* Repair Details */}
              <div>
                <label className="flex items-center gap-2 text-sm font-semibold text-headings mb-2">
                  <FileText size={16} className="text-[var(--accent-blue)]" />
                  Repair Details <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={completeForm.repairDetails}
                  onChange={(e) => setCompleteForm((f) => ({ ...f, repairDetails: e.target.value }))}
                  rows={4}
                  className="w-full rounded-lg border border-theme px-4 py-3 text-sm focus:border-[var(--accent-blue)] focus:ring-2 focus:ring-[var(--accent-blue)]/20 transition"
                  placeholder="Describe the repair work performed, issues found, and resolution..."
                />
              </div>

              {/* Parts Used */}
              <div>
                <label className="flex items-center gap-2 text-sm font-semibold text-headings mb-3">
                  <Package size={16} className="text-[var(--accent-blue)]" />
                  Parts Used
                </label>
                <div className="flex gap-2 mb-3">
                  <select
                    value={selectedPartId}
                    onChange={(e) => setSelectedPartId(e.target.value)}
                    disabled={sparePartsLoading}
                    className="flex-1 rounded-lg border border-theme px-3 py-2 text-sm focus:border-[var(--accent-blue)] focus:ring-2 focus:ring-[var(--accent-blue)]/20"
                  >
                    <option className="form-option" value="">Select part from inventory...</option>
                    {spareParts.map((p) => (
                      <option className="form-option" key={p._id} value={p._id}>
                        {p.partName} ({p.partNumber}) — ${(p.sellingPrice ?? p.buyingPrice ?? 0).toFixed(2)}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={addPartFromDropdown}
                    disabled={!selectedPartId || sparePartsLoading}
                    className="px-4 py-2 text-sm font-medium !text-white bg-[var(--accent-navyblue)] hover:bg-[#359dd9] rounded-lg disabled:opacity-50 transition"
                  >
                    Add
                  </button>
                  <button
                    type="button"
                    onClick={addPart}
                    className="px-4 py-2 text-sm font-medium text-headings border border-theme hover:bg-[rgba(255,255,255,0.03)] rounded-lg transition"
                  >
                    Custom Part
                  </button>
                </div>
                {completeForm.parts.length === 0 ? (
                  <div className="rounded-lg border-2 border-dashed border-theme p-6 text-center">
                    <Package className="mx-auto text-gray-300 mb-2" size={32} />
                    <p className="text-sm text-secondary">No parts added</p>
                    <p className="text-xs text-secondary mt-1">Select from dropdown above or add a custom part</p>
                  </div>
                ) : (
                  <div className="rounded-lg  overflow-hidden">
                    <table className="min-w-full text-sm">
                      <thead className="bg-card">
                        <tr>
                          <th className="px-4 py-2.5 text-left text-xs font-semibold text-secondary">Part Name</th>
                          <th className="px-4 py-2.5 text-left text-xs font-semibold text-secondary">Part #</th>
                          <th className="px-4 py-2.5 text-right text-xs font-semibold text-secondary w-20">Qty</th>
                          <th className="px-4 py-2.5 text-right text-xs font-semibold text-secondary w-24">Cost ($)</th>
                          <th className="w-10" />
                        </tr>
                      </thead>
                      <tbody>
                        {completeForm.parts.map((part) => (
                          <tr key={part.id} className="hover:bg-card">
                            <td className="px-4 py-2">
                              <input
                                type="text"
                                value={part.partName}
                                onChange={(e) => updatePart(part.id, "partName", e.target.value)}
                                placeholder="e.g. Oil Filter"
                                className="w-full rounded border border-theme px-2 py-1.5 text-sm focus:border-[var(--accent-blue)] focus:ring-1 focus:ring-[var(--accent-blue)]/30"
                              />
                            </td>
                            <td className="px-4 py-2">
                              <input
                                type="text"
                                value={part.partNumber}
                                onChange={(e) => updatePart(part.id, "partNumber", e.target.value)}
                                placeholder="e.g. OF-123"
                                className="w-full rounded border border-theme px-2 py-1.5 text-sm focus:border-[var(--accent-blue)] focus:ring-1 focus:ring-[var(--accent-blue)]/30"
                              />
                            </td>
                            <td className="px-4 py-2 text-right">
                              <input
                                type="number"
                                min="1"
                                value={part.quantity}
                                onChange={(e) => updatePart(part.id, "quantity", parseInt(e.target.value) || 1)}
                                className="w-16 rounded border border-theme px-2 py-1.5 text-sm text-right focus:border-[var(--accent-blue)] focus:ring-1 focus:ring-[var(--accent-blue)]/30"
                              />
                            </td>
                            <td className="px-4 py-2 text-right">
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={part.cost || ""}
                                onChange={(e) => updatePart(part.id, "cost", parseFloat(e.target.value) || 0)}
                                placeholder="0.00"
                                className="w-20 rounded border border-theme px-2 py-1.5 text-sm text-right focus:border-[var(--accent-blue)] focus:ring-1 focus:ring-[var(--accent-blue)]/30"
                              />
                            </td>
                            <td className="px-2 py-2">
                              <button
                                type="button"
                                onClick={() => removePart(part.id)}
                                className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition"
                                title="Remove part"
                              >
                                <Trash2 size={14} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Totals */}
              <div className="rounded-lg border border-theme bg-card p-4 space-y-2">
                {completeForm.parts.length > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-secondary">Parts Subtotal</span>
                    <span className="font-medium">${partsSubtotal.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center pt-2 border-t border-theme">
                  <label className="text-sm font-semibold text-headings">Total Amount ($) <span className="text-red-500">*</span></label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={completeForm.totalAmount !== "" ? completeForm.totalAmount : (partsSubtotal > 0 ? partsSubtotal.toFixed(2) : "")}
                    onChange={(e) => setCompleteForm((f) => ({ ...f, totalAmount: e.target.value }))}
                    placeholder="0.00"
                    className="w-28 rounded-lg border border-theme px-3 py-2 text-sm font-semibold text-right focus:border-[var(--accent-blue)] focus:ring-2 focus:ring-[var(--accent-blue)]/20"
                  />
                </div>
              </div>

              {/* Invoice Upload */}
              <div>
                <label className="flex items-center gap-2 text-sm font-semibold text-headings mb-2">
                  <FileText size={16} className="text-[var(--accent-blue)]" />
                  Invoice File <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="file"
                    id="invoice-upload"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => setInvoiceFile(e.target.files?.[0] || null)}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div className="flex items-center gap-3 rounded-lg border-2 border-dashed border-theme p-4 hover:border-[var(--accent-blue)]/50 hover:bg-[var(--accent-blue)]/5 transition">
                    <div className="p-2 rounded-lg bg-card">
                      <FileText className="text-secondary" size={24} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-headings">
                        {invoiceFile ? invoiceFile.name : "Choose file (PDF, JPG, PNG)"}
                      </p>
                      <p className="text-xs text-secondary mt-0.5">
                        {invoiceFile ? `${(invoiceFile.size / 1024).toFixed(1)} KB` : "Click to browse"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-theme">
              <button
                type="button"
                onClick={closeCompleteModal}
                className="px-5 py-2.5 text-sm font-medium text-white bg-card border border-theme hover:bg-[rgba(255,255,255,0.03)] rounded-lg transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCompleteOrder}
                disabled={submittingComplete}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold !text-white bg-[var(--accent-navyblue)] hover:bg-[#359dd9] rounded-lg disabled:opacity-50 transition"
              >
                <CheckCircle size={18} />
                {submittingComplete ? "Submitting…" : "Complete Order"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Order Details Modal */}
      {detailsOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
          <div className="bg-card rounded-xl shadow-2xl w-full max-w-2xl my-8 max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-theme bg-gradient-to-r from-[var(--accent-blue)]/5 to-transparent flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-[var(--accent-blue)]/10">
                  <Eye className="text-[var(--accent-blue)]" size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-headings">Order Details</h3>
                  <p className="text-xs text-secondary mt-0.5">
                    Unit {detailsOrder.unitNumber || "—"} • {formatDate(detailsOrder.serviceDate)}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDetailsOrder(null)}
                className="p-2 text-secondary hover:text-secondary hover:bg-[rgba(255,255,255,0.03)] rounded-lg transition"
              >
                <X size={22} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-5">
              {/* Status & Completion */}
              <div className="flex flex-wrap items-center gap-3">
                <span
                  className={`inline-flex px-3 py-1.5 text-sm font-medium rounded-full ${detailsOrder.status === "completed" || detailsOrder.status === "Completed"
                    ? "bg-green-100 text-green-800"
                    : detailsOrder.status === "in-progress"
                      ? "bg-blue-100 text-blue-800"
                      : detailsOrder.status === "Assigned" || detailsOrder.status === "Shared"
                        ? "bg-amber-100 text-amber-800"
                        : "bg-card text-headings"
                    }`}
                >
                  {detailsOrder.status || "—"}
                </span>
                {(detailsOrder.status === "completed" || detailsOrder.status === "Completed") && detailsOrder.completionDate && (
                  <div className="flex items-center gap-2 text-sm text-secondary">
                    <Calendar size={16} className="text-secondary" />
                    <span className="font-medium">Completed:</span>
                    <span>{formatDateTime(detailsOrder.completionDate)}</span>
                  </div>
                )}
              </div>

              {/* Order Info */}
              <div className="grid grid-cols-2 gap-4 p-4 rounded-lg bg-card border border-theme">
                <div>
                  <p className="text-xs font-medium text-secondary uppercase tracking-wide">Unit</p>
                  <p className="text-sm font-semibold text-headings mt-0.5">{detailsOrder.unitNumber || "—"}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-secondary uppercase tracking-wide">Service Date</p>
                  <p className="text-sm font-semibold text-headings mt-0.5">{formatDate(detailsOrder.serviceDate)}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-secondary uppercase tracking-wide">Make/Model</p>
                  <p className="text-sm font-semibold text-headings mt-0.5">{detailsOrder.makeModel || "—"}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-secondary uppercase tracking-wide">Odometer</p>
                  <p className="text-sm font-semibold text-headings mt-0.5">{detailsOrder.odometer != null ? detailsOrder.odometer.toLocaleString() : "—"}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs font-medium text-secondary uppercase tracking-wide">Description</p>
                  <p className="text-sm font-semibold text-headings mt-0.5">{detailsOrder.description || "—"}</p>
                </div>
                {detailsOrder.notes && (
                  <div className="col-span-2">
                    <p className="text-xs font-medium text-secondary uppercase tracking-wide">Notes</p>
                    <p className="text-sm text-headings mt-0.5">{detailsOrder.notes}</p>
                  </div>
                )}
              </div>

              {/* Repair Details (when completed) */}
              {(detailsOrder.status === "completed" || detailsOrder.status === "Completed") && detailsOrder.repairDetails && (
                <div>
                  <p className="text-xs font-medium text-secondary uppercase tracking-wide mb-2">Repair Details</p>
                  <p className="text-sm text-headings p-4 rounded-lg bg-card border border-theme whitespace-pre-wrap">
                    {detailsOrder.repairDetails}
                  </p>
                </div>
              )}

              {/* Completed Parts */}
              {(detailsOrder.status === "completed" || detailsOrder.status === "Completed") &&
                detailsOrder.completedParts &&
                detailsOrder.completedParts.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-secondary uppercase tracking-wide mb-2">Parts Used</p>
                    <div className="rounded-lg border border-theme overflow-hidden">
                      <table className="min-w-full text-sm">
                        <thead className="bg-card">
                          <tr>
                            <th className="px-4 py-2.5 text-left text-xs font-semibold text-headings">Part Name</th>
                            <th className="px-4 py-2.5 text-left text-xs font-semibold text-headings">Part #</th>
                            <th className="px-4 py-2.5 text-right text-xs font-semibold text-headings">Qty</th>
                            <th className="px-4 py-2.5 text-right text-xs font-semibold text-headings">Cost</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {detailsOrder.completedParts.map((p, idx) => (
                            <tr key={idx}>
                              <td className="px-4 py-2.5">{p.partName || "—"}</td>
                              <td className="px-4 py-2.5">{p.partNumber || "—"}</td>
                              <td className="px-4 py-2.5 text-right">{p.quantity ?? "—"}</td>
                              <td className="px-4 py-2.5 text-right">${Number(p.cost || 0).toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

              {/* Completion Total */}
              {(detailsOrder.status === "completed" || detailsOrder.status === "Completed") &&
                detailsOrder.completionTotalAmount != null && (
                  <div className="flex justify-between items-center p-4 rounded-lg bg-[var(--accent-blue)]/5 border border-[var(--accent-blue)]/20">
                    <span className="text-sm font-semibold text-headings">Total Amount</span>
                    <span className="text-lg font-bold text-[var(--accent-blue)]">${Number(detailsOrder.completionTotalAmount).toFixed(2)}</span>
                  </div>
                )}

              {/* Invoice - signed URL */}
              {(detailsOrder.status === "completed" || detailsOrder.status === "Completed") &&
                (detailsOrder.invoiceSignedUrl || detailsOrder.invoiceUploadUrl) && (
                  <div>
                    <p className="text-xs font-medium text-secondary uppercase tracking-wide mb-2">Invoice</p>
                    <a
                      href={(detailsOrder.invoiceSignedUrl as string) || (detailsOrder.invoiceUploadUrl as string)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-sm font-medium text-[var(--accent-blue)] hover:underline"
                    >
                      <FileText size={16} />
                      View Invoice
                    </a>
                  </div>
                )}
            </div>

            <div className="px-6 py-4 border-t border-theme flex-shrink-0 ">
              <div className="flex justify-end gap-2">
                {canCompleteOrder(detailsOrder.status) && (
                  <button
                    type="button"
                    onClick={() => {
                      setDetailsOrder(null);
                      openCompleteModal(detailsOrder);
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium !text-white bg-[var(--accent-navyblue)] hover:bg-[#359dd9] rounded-lg"
                  >
                    <CheckCircle size={16} />
                    Complete Order
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setDetailsOrder(null)}
                  className="px-4 py-2 text-sm font-medium text-primary bg-card border border-theme hover:bg-[rgba(255,255,255,0.03)] rounded-lg"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Orders;

