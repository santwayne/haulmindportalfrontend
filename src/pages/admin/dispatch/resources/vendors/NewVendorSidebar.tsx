import { useState } from "react";
import { X } from "lucide-react";
import type { FC } from "react";
import { createVendor } from "../../../../../axios/api/distapcher";

interface NewVendorSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onNotification?: (type: 'success' | 'error', message: string) => void;
}

const NewVendorSidebar: FC<NewVendorSidebarProps> = ({ isOpen, onClose, onNotification }) => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    internalId: "",
    phone: "",
    website: "",
    type: "",
    status: "active",
    address: "",
    country: "",
  });

  const [openDetails, setOpenDetails] = useState(true);
  const [loading, setLoading] = useState(false);

  const handleInputChange = (e: any) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async () => {
    setLoading(true);

    try {
      const res = await createVendor(formData);

      if (res?.success) {
        onNotification?.('success', res.message || "Vendor created successfully!");
        setTimeout(() => {
          onClose();
        }, 1200);
      } else {
        onNotification?.('error', res?.message || "Something went wrong!");
      }
    } catch (err: any) {
      onNotification?.('error', err.message || "Failed to create vendor");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-[100]"
        onClick={onClose}
      ></div>

      {/* Sidebar */}
      <div className="fixed right-0 top-0 h-full w-126 bg-card border-l border-theme shadow-lg z-[101] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-theme flex-shrink-0">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-primary">New Vendor</h2>
            <button onClick={onClose} className="text-secondary hover:text-secondary">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6 pb-20">
          {/* Details Panel */}
          <div className="bg-card p-4 rounded-md">
            <div
              className="flex items-center justify-between cursor-pointer mb-4"
              onClick={() => setOpenDetails(!openDetails)}
            >
              <h3 className="text-lg font-medium text-primary">Vendor Details</h3>
              <svg
                className={`w-5 h-5 text-secondary transform transition-transform ${
                  openDetails ? "rotate-180" : ""
                }`}
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 
                  1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 
                  010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </div>

            {openDetails && (
              <div className="space-y-4">
                {/* Name & Email */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-primary mb-1">
                      Name
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      placeholder="Name"
                      className="w-full px-3 py-2 border border-theme rounded-md 
                      focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-primary mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder="Email"
                      className="w-full px-3 py-2 border border-theme rounded-md 
                      focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* Internal ID & Phone */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-primary mb-1">
                      Internal ID
                    </label>
                    <input
                      type="text"
                      name="internalId"
                      value={formData.internalId}
                      onChange={handleInputChange}
                      placeholder="Internal ID"
                      className="w-full px-3 py-2 border border-theme rounded-md 
                      focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-primary mb-1">
                      Phone
                    </label>
                    <input
                      type="text"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      placeholder="+65 8123 4567"
                      className="w-full px-3 py-2 border border-theme rounded-md 
                      focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* Website & Type */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-primary mb-1">
                      Website
                    </label>
                    <input
                      type="url"
                      name="website"
                      value={formData.website}
                      onChange={handleInputChange}
                      placeholder="Website"
                      className="w-full px-3 py-2 border border-theme rounded-md 
                      focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-primary mb-1">
                      Type
                    </label>
                    <select
                      name="type"
                      value={formData.type}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-theme rounded-md 
                      focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select vendor type</option>
                      <option value="logistics">Logistics</option>
                      <option value="maintenance">Maintenance</option>
                      <option value="transport">Transport</option>
                      <option value="cargo">Cargo</option>
                    </select>
                  </div>
                </div>

                {/* Status & Country */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-primary mb-1">
                      Status
                    </label>
                    <select
                      name="status"
                      value={formData.status}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-theme rounded-md 
                      focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-primary mb-1">
                      Country
                    </label>
                    <select
                      name="country"
                      value={formData.country}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-theme rounded-md 
                      focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select Country</option>
                      <option value="singapore">Singapore</option>
                      <option value="usa">USA</option>
                      <option value="uk">UK</option>
                      <option value="india">India</option>
                    </select>
                  </div>
                </div>

                {/* Address */}
                <div>
                  <label className="block text-sm font-medium text-primary mb-1">
                    Address
                  </label>
                  <input
                    type="text"
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    placeholder="Enter Address"
                    className="w-full px-3 py-2 border border-theme rounded-md 
                    focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Fixed Footer */}
        <div className="p-4 border-t border-theme flex-shrink-0 bg-card sticky bottom-0 z-[102] shadow-lg">
          <div className="flex justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-theme !mr-3 rounded-md text-primary hover:bg-[rgba(255,255,255,0.03)] transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 !text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {loading ? "Creating..." : "Create Vendor"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default NewVendorSidebar;
