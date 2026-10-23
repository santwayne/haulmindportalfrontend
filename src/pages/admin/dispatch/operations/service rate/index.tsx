import React, { useState, useEffect, useCallback, useRef } from "react";
import NewService from "./NewService";
import {
  listServiceRate,
  deleteServiceRate,
  updateServiceRate,
} from "../../../../../axios/api/distapcher";
import { message } from "antd";

interface PeekHoursPricing {
  peakHoursStart?: string;
  peakHoursEnd?: string;
  peakHoursMethod?: string;
}

interface ServiceRateItem {
  _id: string;
  serviceName: string;
  price: number | string;
  duration?: string;
  orderType?: string;
  rateCalculationMethod?: string;
  cashOnDeliver?: boolean;
  cashOnDeliverMethod?: string;
  peekHoursPricing?: PeekHoursPricing;
  serviceRestriction?: string;
  tags?: string[] | string;
}

interface UpdateFormState {
  serviceName: string;
  orderType: string;
  price: string;
  rateCalculationMethod: string;
  duration: string;
  cashOnDeliver: boolean;
  cashOnDeliverMethod: string;
  peakHours: boolean;
  peakHoursStart: string;
  peakHoursEnd: string;
  peakHoursMethod: string;
  serviceRestriction: string;
  tags: string;
}

const ServicePage = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [services, setServices] = useState<ServiceRateItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedService, setSelectedService] = useState<ServiceRateItem | null>(null);
  const [updateModalOpen, setUpdateModalOpen] = useState(false);
  const [updateForm, setUpdateForm] = useState<UpdateFormState>({
    serviceName: "",
    orderType: "",
    price: "",
    rateCalculationMethod: "",
    duration: "",
    cashOnDeliver: false,
    cashOnDeliverMethod: "",
    peakHours: false,
    peakHoursStart: "",
    peakHoursEnd: "",
    peakHoursMethod: "",
    serviceRestriction: "",
    tags: "",
  });
  const [updateSubmitting, setUpdateSubmitting] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [serviceToDelete, setServiceToDelete] = useState<ServiceRateItem | null>(null);
  const [emptyStateMessage, setEmptyStateMessage] = useState<string | null>(null);
  const isCancelledRef = useRef(false);
  const closeSidebar = useCallback(() => setSidebarOpen(false), [setSidebarOpen]);

  const resetUpdateForm = useCallback(() => {
    setUpdateForm({
      serviceName: "",
      orderType: "",
      price: "",
      rateCalculationMethod: "",
      duration: "",
      cashOnDeliver: false,
      cashOnDeliverMethod: "",
      peakHours: false,
      peakHoursStart: "",
      peakHoursEnd: "",
      peakHoursMethod: "",
      serviceRestriction: "",
      tags: "",
    });
  }, [setUpdateForm]);

  // Fetch services from API
  const fetchServices = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listServiceRate();
      if (isCancelledRef.current) {
        return;
      }

      if (res?.success) {
        if (res.message && (!res.data || res.data.length === 0)) {
          setServices([]);
          setEmptyStateMessage(res.message);
        } else {
          setServices(res.data || []);
          setEmptyStateMessage(null);
        }
      } else {
        message.error(res?.message || "Failed to fetch services");
      }
    } catch (err: any) {
      if (!isCancelledRef.current) {
        message.error(err?.message || "Something went wrong while fetching services");
      }
    } finally {
      if (!isCancelledRef.current) {
        setLoading(false);
      }
    }
  }, []);

  const handleServiceCreated = useCallback(async () => {
    closeSidebar();
    await fetchServices();
  }, [closeSidebar, fetchServices]);

  const closeUpdateModal = useCallback(() => {
    setUpdateModalOpen(false);
    setSelectedService(null);
    resetUpdateForm();
    setUpdateSubmitting(false);
  }, [resetUpdateForm, setSelectedService, setUpdateModalOpen, setUpdateSubmitting]);

  useEffect(() => {
    isCancelledRef.current = false;
    fetchServices();
    return () => {
      isCancelledRef.current = true;
    };
  }, [fetchServices]);

  const openDeleteModal = (service: ServiceRateItem) => {
    setServiceToDelete(service);
    setDeleteModalOpen(true);
  };

  const closeDeleteModal = () => {
    setDeleteModalOpen(false);
    setServiceToDelete(null);
    setDeleteSubmitting(false);
  };

  // Handle delete
  const handleDelete = async () => {
    if (!serviceToDelete?._id) return;
    setDeleteSubmitting(true);
    try {
      const res = await deleteServiceRate(serviceToDelete._id);
      if (res?.success) {
        message.success(res.message || "Deleted successfully");
        closeDeleteModal();
        await fetchServices();
      } else {
        message.error(res?.message || "Delete failed");
      }
    } catch (error: any) {
      message.error(error?.response?.data?.message || "Delete failed");
    } finally {
      setDeleteSubmitting(false);
    }
  };

  const handleUpdateChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const target = e.target;
    const fieldName = target.name as keyof UpdateFormState;
    const isCheckbox = target instanceof HTMLInputElement && target.type === "checkbox";
    const nextValue = (isCheckbox ? target.checked : target.value) as UpdateFormState[keyof UpdateFormState];

    setUpdateForm((prev) => {
      const updated: UpdateFormState = {
        ...prev,
        [fieldName]: nextValue,
      };

      if (fieldName === "cashOnDeliver" && !updated.cashOnDeliver) {
        updated.cashOnDeliverMethod = "";
      }

      if (fieldName === "peakHours" && !updated.peakHours) {
        updated.peakHoursStart = "";
        updated.peakHoursEnd = "";
        updated.peakHoursMethod = "";
      }

      return updated;
    });
  };

  // Handle update
  const handleUpdate = async () => {
    if (!selectedService?._id) return;
    setUpdateSubmitting(true);

    const payload: any = {
      serviceName: updateForm.serviceName,
      orderType: updateForm.orderType,
      price: updateForm.price,
      rateCalculationMethod: updateForm.rateCalculationMethod,
      duration: updateForm.duration,
      cashOnDeliver: updateForm.cashOnDeliver,
      cashOnDeliverMethod: updateForm.cashOnDeliver ? updateForm.cashOnDeliverMethod : "",
      serviceRestriction: updateForm.serviceRestriction,
      tags: updateForm.tags
        ? updateForm.tags
            .split(",")
            .map((tag) => tag.trim())
            .filter(Boolean)
        : [],
    };

    if (updateForm.peakHours) {
      payload.peekHoursPricing = {
        peakHoursStart: updateForm.peakHoursStart,
        peakHoursEnd: updateForm.peakHoursEnd,
        peakHoursMethod: updateForm.peakHoursMethod,
      };
    } else {
      payload.peekHoursPricing = undefined;
    }

    try {
      const res = await updateServiceRate(selectedService._id, payload);
      if (res?.success) {
        message.success(res.message || "Updated successfully");
        closeUpdateModal();
        await fetchServices();
      } else {
        message.error(res?.message || "Update failed");
      }
    } catch (error: any) {
      message.error(error?.response?.data?.message || "Update failed");
    } finally {
      setUpdateSubmitting(false);
    }
  };

  const openUpdateModal = (service: ServiceRateItem) => {
    if (!service) return;
    setSelectedService(service);
    setUpdateForm({
      serviceName: service.serviceName || "",
      orderType: service.orderType || "",
      price: service.price ? String(service.price) : "",
      rateCalculationMethod: service.rateCalculationMethod || "",
      duration: service.duration || "",
      cashOnDeliver: Boolean(service.cashOnDeliver),
      cashOnDeliverMethod: service.cashOnDeliverMethod || "",
      peakHours: Boolean(service.peekHoursPricing),
      peakHoursStart: service.peekHoursPricing?.peakHoursStart || "",
      peakHoursEnd: service.peekHoursPricing?.peakHoursEnd || "",
      peakHoursMethod: service.peekHoursPricing?.peakHoursMethod || "",
      serviceRestriction: service.serviceRestriction || "",
      tags: Array.isArray(service.tags)
        ? service.tags.join(", ")
        : typeof service.tags === "string"
        ? service.tags
        : "",
    });
    setUpdateModalOpen(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-card">
        <div className="text-secondary">Loading...</div>
      </div>
    );
  }

  if (emptyStateMessage) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-card text-center space-y-4 px-4">
        <h2 className="text-xl font-semibold text-primary">No service rates available</h2>
        <p className="text-secondary max-w-md">{emptyStateMessage}</p>
        <button
          onClick={() => setSidebarOpen(true)}
          className="bg-blue-500 hover:bg-blue-600 !text-white font-semibold px-6 py-3 rounded-lg shadow-lg"
        >
          + New Service
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col relative bg-card px-4">
      {/* Background */}
      <div className="absolute inset-0 bg-opacity-40 backdrop-blur-sm pointer-events-none"></div>
      <div
        className="absolute inset-0 opacity-10 pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='0.15'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />

      {/* Main content */}
      <div className="relative z-10 flex-1 p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-primary bg-card bg-opacity-70 backdrop-blur-sm px-4 py-2 rounded-lg shadow-sm">
            Service Rate
          </h2>
          <div className="flex items-center gap-3">
        
            <button
              onClick={() => setSidebarOpen(true)}
              className="bg-blue-500 hover:bg-blue-600 !text-white font-semibold px-6 py-3 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 backdrop-blur-sm border border-blue-400"
            >
              + New Service
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="bg-card bg-opacity-95 backdrop-blur-lg rounded-xl border border-white border-opacity-50 shadow-xl overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-card bg-opacity-80 backdrop-blur-sm text-left font-semibold text-primary">
                <th className="px-6 py-4 border-r border-theme border-opacity-50">Service Name</th>
                <th className="px-6 py-4 border-r border-theme border-opacity-50">Price</th>
                <th className="px-6 py-4 border-r border-theme border-opacity-50">Duration</th>
                <th className="px-6 py-4 border-r border-theme border-opacity-50">Order Type</th>
                <th className="px-6 py-4 border-r border-theme border-opacity-50">Rate Method</th>
                <th className="px-6 py-4 border-r border-theme border-opacity-50">COD</th>
                <th className="px-6 py-4 border-r border-theme border-opacity-50">Peak Hours</th>
                <th className="px-6 py-4 border-r border-theme border-opacity-50">Restriction</th>
                <th className="px-6 py-4 border-r border-theme border-opacity-50">Tags</th>
                <th className="px-6 py-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={10} className="text-center py-6">
                    Loading...
                  </td>
                </tr>
              ) : services.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-6">
                    No services found
                  </td>
                </tr>
              ) : (
                services.map((service) => (
                  <tr
                    key={service._id}
                    className="hover:bg-blue-50 hover:bg-opacity-50 transition-colors duration-200"
                  >
                    <td className="px-6 py-4 border-r border-theme">{service.serviceName}</td>
                    <td className="px-6 py-4 border-r border-theme font-mono text-green-600 font-semibold">{service.price}</td>
                    <td className="px-6 py-4 border-r border-theme">{service.duration}</td>
                    <td className="px-6 py-4 border-r border-theme">{service.orderType}</td>
                    <td className="px-6 py-4 border-r border-theme">{service.rateCalculationMethod}</td>
                    <td className="px-6 py-4 border-r border-theme">{service.cashOnDeliver ? "Yes" : "No"}</td>
                    <td className="px-6 py-4 border-r border-theme">
                      {service.peekHoursPricing?.peakHoursStart} - {service.peekHoursPricing?.peakHoursEnd} ({service.peekHoursPricing?.peakHoursMethod})
                    </td>
                    <td className="px-6 py-4 border-r border-theme">{service.serviceRestriction}</td>
                    <td className="px-6 py-4 border-r border-theme italic">
                      {Array.isArray(service.tags) ? service.tags.join(", ") : service.tags || "No tags"}
                    </td>
                    <td className="px-6 py-4 flex gap-2">
                      <button
                        className=" !text-white px-3 py-1 rounded bg-blue-500 hover:bg-blue-600"
                        onClick={() => openUpdateModal(service)}
                      >
                        Update
                      </button>
                      <button
                        className="bg-red-500 !text-white px-3 py-1 rounded hover:bg-red-600"
                        onClick={() => openDeleteModal(service)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Service Sidebar */}
      <div
        className={`fixed top-0 right-0 h-full max-w-lg w-full sm:w-[42rem] bg-card bg-opacity-95 backdrop-blur-xl shadow-2xl transform transition-transform duration-500 ease-out z-[9999] border-l border-theme border-opacity-50 ${
          sidebarOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <NewService onClose={closeSidebar} onSuccess={handleServiceCreated} />
      </div>

      {sidebarOpen && (
        <div
          className="fixed inset-0 z-[9998] bg-gray-900/50 backdrop-blur-sm transition-all duration-500"
          onClick={closeSidebar}
        />
      )}


      {/* Update Modal */}
      {updateModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 px-4">
          <div className="bg-card rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-theme bg-card">
              <h2 className="text-xl font-bold text-primary">Update Service</h2>
              <button
                onClick={closeUpdateModal}
                className="w-8 h-8 flex items-center justify-center text-secondary hover:text-secondary hover:bg-gray-200 rounded-full transition-all duration-200"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="max-h-[75vh] overflow-y-auto p-6 space-y-6">
              <div className="bg-card border border-theme rounded-xl p-5 space-y-4">
                <h3 className="text-lg font-semibold text-primary border-b border-theme pb-3">
                  Basic Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-primary mb-2">
                      Service Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="serviceName"
                      value={updateForm.serviceName}
                      onChange={handleUpdateChange}
                      className="w-full border border-theme rounded-lg px-4 py-3 text-primary focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all duration-200"
                      placeholder="Enter service name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-primary mb-2">
                      Service Order Type <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="orderType"
                      value={updateForm.orderType}
                      onChange={handleUpdateChange}
                      className="w-full border border-theme rounded-lg px-4 py-3 text-primary focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all duration-200 bg-card"
                    >
                      <option value="">Select order type</option>
                      <option value="transport">Transport</option>
                      <option value="storefront">Storefront</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-primary mb-2">
                    Tags <span className="text-secondary text-xs">(comma separated)</span>
                  </label>
                  <input
                    type="text"
                    name="tags"
                    value={updateForm.tags}
                    onChange={handleUpdateChange}
                    className="w-full border border-theme rounded-lg px-4 py-3 text-primary focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all duration-200"
                    placeholder="e.g. priority, fragile"
                  />
                </div>
              </div>

              <div className="bg-card border border-theme rounded-xl p-5 space-y-4">
                <h3 className="text-lg font-semibold text-primary border-b border-theme pb-3">
                  Pricing Configuration
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-primary mb-2">
                      Base Fee / Price <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-secondary text-sm">
                        S$
                      </span>
                      <input
                        type="text"
                        name="price"
                        value={updateForm.price}
                        onChange={handleUpdateChange}
                        className="w-full border border-theme rounded-lg pl-10 pr-4 py-3 text-primary focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all duration-200"
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-primary mb-2">
                      Rate Calculation Method <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="rateCalculationMethod"
                      value={updateForm.rateCalculationMethod}
                      onChange={handleUpdateChange}
                      className="w-full border border-theme rounded-lg px-4 py-3 text-primary focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all duration-200 bg-card"
                    >
                      <option value="">Select calculation method</option>
                      <option value="fixed-meter">Fixed Meter</option>
                      <option value="per-meter">Per Meter</option>
                      <option value="per-dropoff">Per DropOff</option>
                      <option value="algorithm">Algorithm</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-primary mb-2">Duration Terms</label>
                    <input
                      type="text"
                      name="duration"
                      value={updateForm.duration}
                      onChange={handleUpdateChange}
                      className="w-full border border-theme rounded-lg px-4 py-3 text-primary focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all duration-200"
                      placeholder="Enter duration terms if applicable"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-primary mb-2">
                      Service Restriction
                    </label>
                    <select
                      name="serviceRestriction"
                      value={updateForm.serviceRestriction}
                      onChange={handleUpdateChange}
                      className="w-full border border-theme rounded-lg px-4 py-3 text-primary focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all duration-200 bg-card"
                    >
                      <option value="">Select restriction</option>
                      <option value="service-area">Restrict to service area</option>
                      <option value="city">City Level</option>
                      <option value="region">Regional Level</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="bg-card border border-theme rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-primary">Cash on Delivery</h3>
                    <p className="text-sm text-secondary mt-1">
                      Allow customers to pay upon delivery and define the fee.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      name="cashOnDeliver"
                      checked={updateForm.cashOnDeliver}
                      onChange={handleUpdateChange}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-card after:border-theme after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
                {updateForm.cashOnDeliver && (
                  <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-primary mb-2">
                        COD Fee Calculation Method <span className="text-red-500">*</span>
                      </label>
                      <select
                        name="cashOnDeliverMethod"
                        value={updateForm.cashOnDeliverMethod}
                        onChange={handleUpdateChange}
                        className="w-full border border-theme rounded-lg px-4 py-3 text-primary focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all duration-200 bg-card"
                      >
                        <option value="">Select COD calculation method</option>
                        <option value="flat">Flat Fee</option>
                        <option value="percentage">Percentage of Order Value</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-card border border-theme rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-primary">Peak Hours Pricing</h3>
                    <p className="text-sm text-secondary mt-1">
                      Apply additional charges during peak hours for this service.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      name="peakHours"
                      checked={updateForm.peakHours}
                      onChange={handleUpdateChange}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-card after:border-theme after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
                {updateForm.peakHours && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-primary mb-2">
                          Peak Hours Start <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="time"
                          name="peakHoursStart"
                          value={updateForm.peakHoursStart}
                          onChange={handleUpdateChange}
                          className="w-full border border-theme rounded-lg px-4 py-3 text-primary focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all duration-200"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-primary mb-2">
                          Peak Hours End <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="time"
                          name="peakHoursEnd"
                          value={updateForm.peakHoursEnd}
                          onChange={handleUpdateChange}
                          className="w-full border border-theme rounded-lg px-4 py-3 text-primary focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all duration-200"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-primary mb-2">
                        Peak Hours Fee Calculation Method <span className="text-red-500">*</span>
                      </label>
                      <select
                        name="peakHoursMethod"
                        value={updateForm.peakHoursMethod}
                        onChange={handleUpdateChange}
                        className="w-full border border-theme rounded-lg px-4 py-3 text-primary focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all duration-200 bg-card"
                      >
                        <option value="">Select peak hours method</option>
                        <option value="flat">Flat Additional Fee</option>
                        <option value="multiplier">Rate Multiplier</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="px-6 py-4 border-t border-theme bg-card flex justify-end gap-3">
              <button
                onClick={closeUpdateModal}
                className="px-6 py-2.5 text-primary bg-card border border-theme rounded-lg hover:bg-[rgba(255,255,255,0.03)] hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-200 transition-all duration-200 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdate}
                disabled={updateSubmitting}
                className="px-8 py-2.5 bg-blue-600 hover:bg-blue-700 focus:bg-blue-700 !text-white font-medium rounded-lg shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {updateSubmitting ? "Updating..." : "Update Service"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModalOpen && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50 px-4">
          <div className="bg-card rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="flex items-center gap-3 px-6 py-4 bg-card border-b border-red-100">
              <div className="p-2 bg-red-100 rounded-full">
                <svg className="w-6 h-6 text-[#A855F7]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v4m0 4h.01M9.38 4.59l-6.6 11.41A1 1 0 003.62 18h16.76a1 1 0 00.86-1.5l-6.6-11.41a1 1 0 00-1.72 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-red-800">Delete Service</h3>
                <p className="text-sm text-[#A855F7]">
                  This action cannot be undone. Please confirm to proceed.
                </p>
              </div>
            </div>
            <div className="px-6 py-5 space-y-3">
              <p className="text-primary">
                Are you sure you want to delete{" "}
                <span className="font-semibold text-primary">
                  {serviceToDelete?.serviceName || "this service"}
                </span>
                ?
              </p>
              <p className="text-sm text-secondary">
                The service rate will be permanently removed and will no longer be available for selection.
              </p>
            </div>
            <div className="px-6 py-4 bg-card border-t border-theme flex justify-end gap-3">
              <button
                onClick={closeDeleteModal}
                disabled={deleteSubmitting}
                className="px-5 py-2.5 text-primary bg-card border border-theme rounded-lg hover:bg-[rgba(255,255,255,0.03)] focus:outline-none focus:ring-2 focus:ring-gray-200 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleteSubmitting}
                className="px-5 py-2.5 bg-red-600 hover:bg-red-700 !text-white font-semibold rounded-lg shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {deleteSubmitting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ServicePage;
