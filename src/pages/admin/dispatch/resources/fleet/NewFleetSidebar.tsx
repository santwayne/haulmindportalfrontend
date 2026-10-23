import React, { useState, useEffect } from "react";
import { X, Truck } from "lucide-react";
import type { FC } from "react";
import { createFleet, updateFleet } from "../../../../../axios/api/distapcher";
import { FaCheckCircle, FaExclamationCircle, FaTimes } from 'react-icons/fa';

interface FleetData {
  _id?: string;
  name?: string;
  serviceArea?: string;
  parentFleet?: string;
  vendor?: string;
  zone?: string;
  manPower?: string | number;
  activeManPower?: string | number;
  task?: string;
  status?: string;
}

interface NewFleetSidebarProps {
  isOpen: boolean;
  mode?: 'create' | 'edit';
  initialData?: FleetData | null;
  onClose: () => void;
  onSuccess?: () => void;
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

  React.useEffect(() => {
    const timer = setTimeout(() => {
      onClose(notification.id);
    }, 5000);
    return () => clearTimeout(timer);
  }, [notification.id, onClose]);

  return (
    <div className={`fixed top-4 right-4 flex items-start gap-3 p-4 rounded-lg border-2 shadow-lg z-[10000] ${bgColors[notification.type]} animate-slide-in`}>
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

const defaultFormData = {
  name: "",
  serviceArea: "",
  parentFleet: "",
  vendor: "",
  zone: "",
  manPower: "",
  activeManPower: "",
  task: "",
  status: "active",
};

const NewFleetSidebar: FC<NewFleetSidebarProps> = ({
  isOpen,
  mode = 'create',
  initialData = null,
  onClose,
  onSuccess
}) => {
  const [formData, setFormData] = useState(defaultFormData);
  const [loading, setLoading] = useState(false);
  const [notifications, setNotifications] = useState<ToastNotification[]>([]);

  // Reset form when sidebar opens/closes or mode changes
  useEffect(() => {
    if (!isOpen) {
      // Reset to default when closing
      setFormData(defaultFormData);
      return;
    }

    // Always reset first, then populate if editing
    if (mode === 'edit' && initialData) {
      // Populate form with existing data for edit mode
      setFormData({
        name: initialData.name || "",
        serviceArea: initialData.serviceArea || "",
        parentFleet: initialData.parentFleet || "",
        vendor: initialData.vendor || "",
        zone: initialData.zone || "",
        manPower: initialData.manPower?.toString() || "",
        activeManPower: initialData.activeManPower?.toString() || "",
        task: initialData.task || "",
        status: initialData.status || "active",
      });
    } else {
      // Reset to empty for create mode
      setFormData(defaultFormData);
    }
  }, [isOpen, mode, initialData]);

  const addNotification = (type: NotificationType, message: string) => {
    const id = Date.now();
    setNotifications(prev => [...prev, { id, type, message }]);
  };

  const removeNotification = (id: number) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);

      // Prepare payload
      const payload = {
        ...formData,
        manPower: formData.manPower ? Number(formData.manPower) : undefined,
        activeManPower: formData.activeManPower ? Number(formData.activeManPower) : undefined,
      };

      let res;
      if (mode === 'edit' && initialData?._id) {
        res = await updateFleet(initialData._id, payload);
      } else {
        res = await createFleet(payload);
      }

      if (res?.success) {
        addNotification('success', mode === 'edit' ? "Fleet updated successfully!" : "Fleet created successfully!");
        // Reset form
        setFormData(defaultFormData);
        // Call onSuccess callback and close after a short delay
        setTimeout(() => {
          onSuccess?.();
          onClose();
        }, 1000);
      } else {
        addNotification('error', res?.message || "Something went wrong");
      }
    } catch (error) {
      console.error(`Error ${mode === 'edit' ? 'updating' : 'creating'} fleet:`, error);
      addNotification('error', `Error ${mode === 'edit' ? 'updating' : 'creating'} fleet`);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Toast Notifications */}
      {notifications.map(notification => (
        <ToastNotification
          key={notification.id}
          notification={notification}
          onClose={removeNotification}
        />
      ))}

      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-[10001] "
        onClick={onClose}
      ></div>

      {/* Sidebar */}
      <div className="fixed right-0 top-0 h-full w-full max-w-2xl bg-card border-l border-theme shadow-xl z-[10002] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-theme flex-shrink-0 bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <Truck className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-primary">
                  {mode === 'edit' ? 'Edit Fleet' : 'New Fleet'}
                </h2>
                <p className="text-sm text-secondary mt-0.5">
                  {mode === 'edit' ? 'Update fleet information' : 'Create a new fleet'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-secondary hover:text-secondary p-2 hover:bg-[rgba(255,255,255,0.03)] rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Fleet Details Form */}
          <div className="space-y-6">
            {/* Fleet Name */}
            <div>
              <label className="block text-sm font-semibold text-primary mb-2">
                Fleet Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="Enter fleet name"
                className="w-full px-4 py-3 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                required
              />
            </div>

            {/* Service Area & Parent Fleet */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-primary mb-2">
                  Service Area
                </label>
                <input
                  type="text"
                  name="serviceArea"
                  value={formData.serviceArea}
                  onChange={handleInputChange}
                  placeholder="Enter service area"
                  className="w-full px-4 py-3 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-primary mb-2">
                  Parent Fleet
                </label>
                <input
                  type="text"
                  name="parentFleet"
                  value={formData.parentFleet}
                  onChange={handleInputChange}
                  placeholder="Enter parent fleet"
                  className="w-full px-4 py-3 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

            {/* Vendor & Zone */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-primary mb-2">
                  Vendor (ObjectId)
                </label>
                <input
                  type="text"
                  name="vendor"
                  value={formData.vendor}
                  onChange={handleInputChange}
                  placeholder="Enter vendor id"
                  className="w-full px-4 py-3 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-primary mb-2">
                  Zone
                </label>
                <input
                  type="text"
                  name="zone"
                  value={formData.zone}
                  onChange={handleInputChange}
                  placeholder="Enter zone"
                  className="w-full px-4 py-3 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

            {/* Manpower & Active Manpower */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-primary mb-2">
                  Man Power
                </label>
                <input
                  type="number"
                  name="manPower"
                  value={formData.manPower}
                  onChange={handleInputChange}
                  placeholder="Enter manpower"
                  className="w-full px-4 py-3 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-primary mb-2">
                  Active Man Power
                </label>
                <input
                  type="number"
                  name="activeManPower"
                  value={formData.activeManPower}
                  onChange={handleInputChange}
                  placeholder="Enter active manpower"
                  className="w-full px-4 py-3 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

            {/* Task */}
            <div>
              <label className="block text-sm font-semibold text-primary mb-2">
                Task / Mission
              </label>
              <input
                type="text"
                name="task"
                value={formData.task}
                onChange={handleInputChange}
                placeholder="Enter task or mission"
                className="w-full px-4 py-3 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm font-semibold text-primary mb-2">
                Status <span className="text-red-500">*</span>
              </label>
              <select
                name="status"
                value={formData.status}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                required
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-theme flex-shrink-0 bg-card shadow-lg">
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 border border-theme !mr-3 rounded-lg text-primary hover:bg-[rgba(255,255,255,0.03)] transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={handleSubmit}
              className="px-6 py-3 bg-blue-600 !text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading
                ? (mode === 'edit' ? "Updating..." : "Creating...")
                : (mode === 'edit' ? "Update Fleet" : "Create Fleet")
              }
            </button>
          </div>
        </div>
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
    </>
  );
};

export default NewFleetSidebar;
