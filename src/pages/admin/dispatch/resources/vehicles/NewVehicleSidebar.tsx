import { useState, useEffect } from 'react';
import { X, Image as ImageIcon } from 'lucide-react';
import type { FC, ChangeEvent } from 'react';
import { FaExclamationCircle, FaCheckCircle, FaTimes } from 'react-icons/fa';

interface VehicleInitialData {
  _id?: string;
  internalId?: string;
  plateNumber?: string;
  vinNumber?: string;
  make?: string;
  model?: string;
  year?: string;
  status?: string;
  address?: string;
}

interface NewVehicleSidebarProps {
  isOpen: boolean;
  mode: 'create' | 'edit';
  initialData?: VehicleInitialData | null;
  onClose: () => void;
  onSubmit: (payload: FormData, vehicleId?: string) => Promise<void> | void;
}

interface FormState {
  internalId: string;
  plateNumber: string;
  vinNumber: string;
  make: string;
  model: string;
  year: string;
  status: string;
  address: string;
  vehicleImages: File[];
}

const initialFormState: FormState = {
  internalId: '',
  plateNumber: '',
  vinNumber: '',
  make: '',
  model: '',
  year: '',
  status: 'stopped',
  address: '',
  vehicleImages: [],
};

type NotificationType = 'success' | 'error' | 'warning';

interface ToastNotification {
  id: number;
  type: NotificationType;
  message: string;
}

const ToastNotification = ({ notification, onClose }: { notification: ToastNotification; onClose: (id: number) => void }) => {
  const icons = {
    success: <FaCheckCircle className="text-green-500" size={24} />,
    error: <FaExclamationCircle className="text-red-500" size={24} />,
    warning: <FaExclamationCircle className="text-yellow-500" size={24} />,
  };

  const bgColors = {
    success: 'bg-green-50 border-green-200',
    error: 'bg-card border-red-200',
    warning: 'bg-card border-yellow-200',
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      onClose(notification.id);
    }, 5000);
    return () => clearTimeout(timer);
  }, [notification.id, onClose]);

  return (
    <div className={`flex items-start gap-3 p-4 rounded-lg border-2 shadow-lg ${bgColors[notification.type]} animate-slide-in`}>
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

const NewVehicleSidebar: FC<NewVehicleSidebarProps> = ({
  isOpen,
  mode,
  initialData,
  onClose,
  onSubmit,
}) => {
  const [formData, setFormData] = useState<FormState>(initialFormState);
  const [submitting, setSubmitting] = useState(false);
  const [editingVehicleId, setEditingVehicleId] = useState<string | undefined>(undefined);
  const [notifications, setNotifications] = useState<ToastNotification[]>([]);

  const addNotification = (type: NotificationType, message: string) => {
    const id = Date.now();
    setNotifications(prev => [...prev, { id, type, message }]);
  };

  const removeNotification = (id: number) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  useEffect(() => {
    if (!isOpen) {
      setFormData(initialFormState);
      setSubmitting(false);
      setEditingVehicleId(undefined);
      return;
    }

    if (mode === 'edit' && initialData) {
      setFormData({
        internalId: initialData.internalId || '',
        plateNumber: initialData.plateNumber || '',
        vinNumber: initialData.vinNumber || '',
        make: initialData.make || '',
        model: initialData.model || '',
        year: initialData.year ? String(initialData.year) : '',
        status: initialData.status || 'stopped',
        address: initialData.address || '',
        vehicleImages: [],
      });
      setEditingVehicleId(initialData._id);
    } else {
      setFormData(initialFormState);
      setEditingVehicleId(undefined);
    }
  }, [isOpen, mode, initialData]);

  const handleInputChange = (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleImageUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const { files } = event.target;
    if (files) {
      const fileArray = Array.from(files);
      setFormData((prev) => ({
        ...prev,
        vehicleImages: [...prev.vehicleImages, ...fileArray],
      }));
    }
  };

  const removeImage = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      vehicleImages: prev.vehicleImages.filter((_, idx) => idx !== index),
    }));
  };

  const handleSubmit = async () => {
    if (submitting) return;

    if (!formData.internalId.trim() || !formData.plateNumber.trim()) {
      addNotification('warning', 'Please provide both Internal ID and Plate Number.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = new FormData();
      payload.append('internalId', formData.internalId.trim());
      payload.append('plateNumber', formData.plateNumber.trim());
      payload.append('vinNumber', formData.vinNumber.trim());
      payload.append('make', formData.make.trim());
      payload.append('model', formData.model.trim());
      payload.append('year', formData.year ? String(formData.year).trim() : '');
      payload.append('status', formData.status);
      payload.append('address', formData.address.trim());

      formData.vehicleImages.forEach((file) => {
        payload.append('vehicleImages', file);
      });

      await onSubmit(payload, mode === 'edit' ? editingVehicleId : undefined);
      setFormData(initialFormState);
      setEditingVehicleId(undefined);
    } catch (error) {
      console.error('Error submitting vehicle form:', error);
      addNotification('error', 'Something went wrong while saving vehicle');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <>
      {/* Toast Notifications */}
      <div className="fixed top-4 right-4 z-[10000] flex flex-col gap-3 max-w-md">
        {notifications.map(notification => (
          <ToastNotification
            key={notification.id}
            notification={notification}
            onClose={removeNotification}
          />
        ))}
      </div>

      <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-[100]" onClick={onClose}></div>

      <div className="fixed right-0 top-0 h-full w-126 bg-card border-l border-theme shadow-lg z-[101] flex flex-col">
        <div className="p-4 border-b border-theme flex-shrink-0">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-primary">
              {mode === 'edit' ? 'Update Vehicle' : 'New Vehicle'}
            </h2>
            <button
              onClick={() => {
                onClose();
                setFormData(initialFormState);
                setEditingVehicleId(undefined);
              }}
              className="text-secondary hover:text-secondary"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6 pb-20">
          <div className="bg-card p-4 rounded-md space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-primary mb-1">Internal ID</label>
                <input
                  type="text"
                  name="internalId"
                  value={formData.internalId}
                  onChange={handleInputChange}
                  placeholder="Internal ID"
                  className="w-full px-3 py-2 border border-theme rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-primary mb-1">Plate Number</label>
                <input
                  type="text"
                  name="plateNumber"
                  value={formData.plateNumber}
                  onChange={handleInputChange}
                  placeholder="Plate Number"
                  className="w-full px-3 py-2 border border-theme rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-primary mb-1">VIN Number</label>
                <input
                  type="text"
                  name="vinNumber"
                  value={formData.vinNumber}
                  onChange={handleInputChange}
                  placeholder="VIN Number"
                  className="w-full px-3 py-2 border border-theme rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-primary mb-1">Make</label>
                <input
                  type="text"
                  name="make"
                  value={formData.make}
                  onChange={handleInputChange}
                  placeholder="Vehicle make"
                  className="w-full px-3 py-2 border border-theme rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-primary mb-1">Model</label>
                <input
                  type="text"
                  name="model"
                  value={formData.model}
                  onChange={handleInputChange}
                  placeholder="Vehicle model"
                  className="w-full px-3 py-2 border border-theme rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-primary mb-1">Year</label>
                <input
                  type="number"
                  name="year"
                  value={formData.year}
                  onChange={handleInputChange}
                  placeholder="Vehicle year"
                  className="w-full px-3 py-2 border border-theme rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-primary mb-1">Status</label>
              <select
                name="status"
                value={formData.status}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-theme rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="stopped">Stopped</option>
                <option value="moving">Moving</option>
                <option value="idle">Idle</option>
                <option value="maintenance">Maintenance</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-primary mb-1">Address</label>
              <input
                type="text"
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                placeholder="Enter vehicle address"
                className="w-full px-3 py-2 border border-theme rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-primary mb-1">Vehicle Images</label>
              <div className="border-2 border-dashed border-theme rounded-lg p-4">
                <div className="text-center">
                  <ImageIcon className="mx-auto h-12 w-12 text-secondary" />
                  <label htmlFor="vehicle-images" className="cursor-pointer mt-2 block text-sm text-primary">
                    Upload vehicle images (PNG, JPG, GIF up to 10MB each)
                  </label>
                  <input
                    id="vehicle-images"
                    name="vehicleImages"
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="sr-only"
                  />
                </div>

                {formData.vehicleImages.length > 0 && (
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    {formData.vehicleImages.map((image, idx) => (
                      <div key={idx} className="relative">
                        <img
                          src={URL.createObjectURL(image)}
                          alt={`Vehicle ${idx + 1}`}
                          className="h-20 w-full object-cover rounded border"
                        />
                        <button
                          type="button"
                          onClick={() => removeImage(idx)}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-theme flex-shrink-0 bg-card sticky bottom-0 z-[102] shadow-lg">
          <div className="flex justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 !mr-3 border border-theme rounded-md text-primary hover:bg-[rgba(255,255,255,0.03)] transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="px-4 py-2 bg-blue-600 !text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {submitting
                ? mode === 'edit'
                  ? 'Updating…'
                  : 'Saving…'
                : mode === 'edit'
                ? 'Update Vehicle'
                : 'Create Vehicle'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default NewVehicleSidebar;
