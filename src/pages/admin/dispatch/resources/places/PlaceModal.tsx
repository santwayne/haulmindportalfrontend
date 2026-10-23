import React, { useState, useEffect, useRef } from "react";
import { FaCheckCircle, FaExclamationCircle, FaTimes } from 'react-icons/fa';
import { updatePlace } from "../../../../../axios/api/dispatcher.places";

interface Props {
  place: any;
  onClose: () => void;
  onSave: (place: any) => void;
}

interface ToastNotification {
  id: number;
  type: 'success' | 'error';
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

  useEffect(() => {
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

const PlaceModal: React.FC<Props> = ({ place, onClose, onSave }) => {
  const [formData, setFormData] = useState<any>({
    name: "",
    street1: "",
    street2: "",
    neighbourHood: "",
    building: "",
    city: "",
    state: "",
    country: "",
    phone: "",
    securityAccessCodepostalCode: "",
  });
  const [loading, setLoading] = useState(false);
  const [notifications, setNotifications] = useState<ToastNotification[]>([]);
  const notificationIdRef = useRef(0);

  const showToast = (type: 'success' | 'error', message: string) => {
    const id = notificationIdRef.current++;
    setNotifications((prev) => [...prev, { id, type, message }]);
  };

  const removeNotification = (id: number) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  useEffect(() => {
    if (place) setFormData(place);
  }, [place]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const res = await updatePlace(formData._id, formData);
      setLoading(false);
      if (res.success) {
        showToast('success', res.message || "Place updated successfully");
        onSave(res.data);
        setTimeout(() => {
          onClose();
        }, 500);
      } else {
        showToast('error', res.message || "Failed to update place");
      }
    } catch (err: any) {
      setLoading(false);
      showToast('error', err?.message || "Error updating place");
    }
  };

  return (
    <>
      {/* Toast Notifications */}
      <div className="fixed top-4 right-4 z-[10000] space-y-2">
        {notifications.map((notification) => (
          <ToastNotification
            key={notification.id}
            notification={notification}
            onClose={removeNotification}
          />
        ))}
      </div>

      <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
      <div className="bg-card rounded-lg shadow-lg w-[600px] max-w-full p-6 relative">
        <h2 className="text-xl font-semibold mb-4">
          {place ? "Edit Place" : "Create Place"}
        </h2>
        <div className="grid grid-cols-2 gap-4">
          {[
            { label: "Name", name: "name" },
            { label: "Street 1", name: "street1" },
            { label: "Street 2", name: "street2" },
            { label: "Neighbourhood", name: "neighbourHood" },
            { label: "Building", name: "building" },
            { label: "City", name: "city" },
            { label: "State", name: "state" },
            { label: "Country", name: "country" },
            { label: "Phone", name: "phone" },
            { label: "Postal Code", name: "securityAccessCodepostalCode" },
          ].map((field) => (
            <div key={field.name}>
              <label className="block text-primary text-sm mb-1">{field.label}</label>
              <input
                type="text"
                name={field.name}
                value={formData[field.name] || ""}
                onChange={handleChange}
                className="w-full border border-theme rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          ))}
        </div>
        <div className="flex justify-end mt-6 space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded bg-gray-300 hover:bg-gray-400"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
          >
            {loading ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
      </div>
    </>
  );
};

export default PlaceModal;
