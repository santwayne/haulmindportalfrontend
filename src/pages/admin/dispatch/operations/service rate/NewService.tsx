import React, { useState } from "react";
import { createServiceRate } from "../../../../../axios/api/distapcher";
import { message } from "antd";

interface NewServiceProps {
  onClose: () => void;
  onSuccess?: () => void;
}

const NewService: React.FC<NewServiceProps> = ({ onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    serviceName: "",
    orderType: "",
    baseFee: "",
    rateCalculationMethod: "",
    duration: "",
    cashOnDeliver: false,
    cashOnDeliverMethod: "",
    peakHours: false,
    peakHoursStart: "",
    peakHoursEnd: "",
    peakHoursMethod: "",
    serviceRestriction: "",
  });

  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = e.target instanceof HTMLInputElement && e.target.type === 'checkbox' ? e.target.checked : false;
    setFormData(prev => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const payload = {
        serviceName: formData.serviceName,
        orderType: formData.orderType,
        price: formData.baseFee,
        rateCalculationMethod: formData.rateCalculationMethod,
        duration: formData.duration,
        cashOnDeliver: formData.cashOnDeliver,
        cashOnDeliverMethod: formData.cashOnDeliverMethod,
        peekHoursPricing: formData.peakHours
          ? {
              peakHoursStart: formData.peakHoursStart,
              peakHoursEnd: formData.peakHoursEnd,
              peakHoursMethod: formData.peakHoursMethod,
            }
          : undefined,
        serviceRestriction: formData.serviceRestriction,
      };

      const res = await createServiceRate(payload);

      if (res.success) {
        message.success(res.message || "Service Rate created successfully");
        onSuccess?.();
        onClose();
      } else {
        message.error(res.message || "Failed to create service rate");
      }
    } catch (error: any) {
      message.error(error?.response?.data?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-card">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-5 border-b border-theme bg-card">
        <h2 className="text-2xl font-semibold text-primary">Add New Service</h2>
        <button
          onClick={onClose}
          className="w-8 h-8 flex items-center justify-center text-secondary hover:text-secondary hover:bg-gray-200 rounded-full transition-all duration-200"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-8">
        {/* Service Name + Order Type */}
        <div className="bg-card rounded-lg border border-theme p-6">
          <h3 className="text-lg font-medium text-primary mb-4 pb-2 border-b border-theme">
            Basic Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-primary mb-2">
                Service Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="serviceName"
                value={formData.serviceName}
                onChange={handleChange}
                placeholder="Enter service name"
                className="w-full border border-theme rounded-lg px-4 py-3 text-primary placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all duration-200"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-primary mb-2">
                Service Order Type <span className="text-red-500">*</span>
              </label>
              <select
                name="orderType"
                value={formData.orderType}
                onChange={handleChange}
                className="w-full border border-theme rounded-lg px-4 py-3 text-primary focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all duration-200 bg-card"
              >
                <option value="">Select order type</option>
                <option value="transport">Transport</option>
                <option value="storefront">Storefront</option>
              </select>
            </div>
          </div>
        </div>

        {/* Pricing Configuration */}
        <div className="bg-card rounded-lg border border-theme p-6">
          <h3 className="text-lg font-medium text-primary mb-4 pb-2 border-b border-theme">
            Pricing Configuration
          </h3>
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-primary mb-2">
                  Base Fee <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-secondary text-sm">S$</span>
                  <input
                    type="text"
                    name="baseFee"
                    value={formData.baseFee}
                    onChange={handleChange}
                    placeholder="0.00"
                    className="w-full border border-theme rounded-lg pl-10 pr-4 py-3 text-primary placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all duration-200"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-primary mb-2">
                  Rate Calculation Method <span className="text-red-500">*</span>
                </label>
                <select
                  name="rateCalculationMethod"
                  value={formData.rateCalculationMethod}
                  onChange={handleChange}
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
            <div>
              <label className="block text-sm font-medium text-primary mb-2">Duration Terms</label>
              <input
                type="text"
                name="duration"
                value={formData.duration}
                onChange={handleChange}
                placeholder="Enter duration terms if applicable"
                className="w-full border border-theme rounded-lg px-4 py-3 text-primary placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all duration-200"
              />
              <p className="text-xs text-secondary mt-1">Optional: Specify any time-based terms for this service</p>
            </div>
          </div>
        </div>

        {/* Cash on Delivery */}
        <div className="bg-card rounded-lg border border-theme p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-medium text-primary">Cash on Delivery</h3>
              <p className="text-sm text-secondary mt-1">Allow customers to pay upon delivery</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                name="cashOnDeliver"
                checked={formData.cashOnDeliver}
                onChange={handleChange}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-card after:border-theme after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
          {formData.cashOnDeliver && (
            <div className="mt-6 p-4 bg-card rounded-lg border border-blue-200">
              <label className="block text-sm font-medium text-primary mb-2">
                COD Fee Calculation Method <span className="text-red-500">*</span>
              </label>
              <select
                name="cashOnDeliverMethod"
                value={formData.cashOnDeliverMethod}
                onChange={handleChange}
                className="w-full border border-theme rounded-lg px-4 py-3 text-primary focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all duration-200 bg-card"
              >
                <option value="">Select COD calculation method</option>
                <option value="flat">Flat Fee</option>
                <option value="percentage">Percentage of Order Value</option>
              </select>
            </div>
          )}
        </div>

        {/* Peak Hours */}
        <div className="bg-card rounded-lg border border-theme p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-medium text-primary">Peak Hours Pricing</h3>
              <p className="text-sm text-secondary mt-1">Apply additional charges during peak hours</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                name="peakHours"
                checked={formData.peakHours}
                onChange={handleChange}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-card after:border-theme after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
          {formData.peakHours && (
            <div className="mt-6 p-4 bg-card rounded-lg border border-orange-200 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-primary mb-2">Peak Hours Start <span className="text-red-500">*</span></label>
                  <input
                    type="time"
                    name="peakHoursStart"
                    value={formData.peakHoursStart}
                    onChange={handleChange}
                    className="w-full border border-theme rounded-lg px-4 py-3 text-primary focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all duration-200"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-primary mb-2">Peak Hours End <span className="text-red-500">*</span></label>
                  <input
                    type="time"
                    name="peakHoursEnd"
                    value={formData.peakHoursEnd}
                    onChange={handleChange}
                    className="w-full border border-theme rounded-lg px-4 py-3 text-primary focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all duration-200"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-primary mb-2">Peak Hours Fee Calculation Method <span className="text-red-500">*</span></label>
                <select
                  name="peakHoursMethod"
                  value={formData.peakHoursMethod}
                  onChange={handleChange}
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

        {/* Service Restrictions */}
        <div className="bg-card rounded-lg border border-theme p-6">
          <h3 className="text-lg font-medium text-primary mb-4 pb-2 border-b border-theme">Service Restrictions</h3>
          <div>
            <label className="block text-sm font-medium text-primary mb-2">Restrict Service</label>
            <select
              name="serviceRestriction"
              value={formData.serviceRestriction}
              onChange={handleChange}
              className="w-full border border-theme rounded-lg px-4 py-3 text-primary focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all duration-200 bg-card"
            >
              <option value="">Select restriction</option>
              <option value="service-area">Restrict to service area</option>
              <option value="city">City Level</option>
              <option value="region">Regional Level</option>
            </select>
            <p className="text-xs text-secondary mt-1">Define geographical limitations for this service</p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-theme bg-card flex justify-end gap-3">
        <button
          onClick={onClose}
          className="px-6 py-2.5 text-primary bg-card border border-theme rounded-lg hover:bg-[rgba(255,255,255,0.03)] hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-200 transition-all duration-200 font-medium"
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="px-8 py-2.5 bg-blue-600 hover:bg-blue-700 focus:bg-blue-700 !text-white font-medium rounded-lg shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200"
        >
          {loading ? "Saving..." : "Save Service"}
        </button>
      </div>
    </div>
  );
};

export default NewService;
