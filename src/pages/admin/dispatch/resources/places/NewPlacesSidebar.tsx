import React, { useState, useEffect, useRef } from 'react';
import { X, ChevronDown, ChevronUp } from 'lucide-react';
import { FaCheckCircle, FaExclamationCircle, FaTimes } from 'react-icons/fa';
import { createPlace } from '../../../../../axios/api/dispatcher.places';

interface NewPlaceSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Country {
  name: string;
  code: string;
  flag: string;
  dialCode: string;
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

const NewPlacesSidebar: React.FC<NewPlaceSidebarProps> = ({ isOpen, onClose }) => {
  const [openDetails, setOpenDetails] = useState(true);
  const [countries, setCountries] = useState<Country[]>([]);
  const [selectedCountry, setSelectedCountry] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    street1: '',
    street2: '',
    neighbourHood: '',
    building: '',
    securityAccessCodepostalCode: '',
    city: '',
    state: '',
    country: '',
    phone: '',
  });

  const [notifications, setNotifications] = useState<ToastNotification[]>([]);
  const notificationIdRef = useRef(0);

  const showToast = (type: 'success' | 'error', message: string) => {
    const id = notificationIdRef.current++;
    setNotifications((prev) => [...prev, { id, type, message }]);
  };

  const removeNotification = (id: number) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  // Fetch countries data
  useEffect(() => {
    fetch('https://restcountries.com/v3.1/all?fields=name,flag,idd,cca2')
      .then(res => res.json())
      .then(data => {
        const sortedCountries = data
          .filter((c: any) => c.idd && c.idd.root)
          .map((c: any) => ({
            name: c.name.common,
            code: c.cca2,
            flag: c.flag,
            dialCode: c.idd.root + (c.idd.suffixes ? c.idd.suffixes[0] : ''),
          }))
          .sort((a: Country, b: Country) => a.name.localeCompare(b.name));

        setCountries(sortedCountries);
        const defaultCountry = sortedCountries.find((c: Country) => c.code === 'US');
        if (defaultCountry) setSelectedCountry(defaultCountry.code);
      })
      .catch(() => {
        const fallback = [
          { name: 'United States', code: 'US', flag: '🇺🇸', dialCode: '+1' },
          { name: 'India', code: 'IN', flag: '🇮🇳', dialCode: '+91' },
        ];
        setCountries(fallback);
        setSelectedCountry('US');
      });
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCountryChange = (code: string) => {
    const country = countries.find(c => c.code === code);
    setSelectedCountry(code);
    setFormData(prev => ({ ...prev, country: country ? country.name : '' }));
  };

  const handleSubmit = async () => {
    try {
      const res = await createPlace(formData);
      if (res.success) {
        showToast('success', res.message || 'Place created successfully');
        setTimeout(() => {
          onClose();
        }, 500);
      } else {
        showToast('error', res.message || 'Error creating place');
      }
    } catch (err: any) {
      showToast('error', err?.message || 'Something went wrong!');
    }
  };

  if (!isOpen) return null;

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

      {/* Backdrop */}
      <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-[100]" onClick={onClose}></div>

      {/* Sidebar */}
      <div className="fixed right-0 top-0 h-full w-96 bg-card border-l border-theme shadow-lg z-[101] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-theme flex items-center justify-between">
          <h2 className="text-lg font-semibold text-primary">New Place</h2>
          <button onClick={onClose} className="text-secondary hover:text-secondary">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Place Details */}
          <div className="bg-card border border-theme rounded-lg">
            <div
              className="flex items-center justify-between cursor-pointer p-4 border-b border-theme"
              onClick={() => setOpenDetails(!openDetails)}
            >
              <h3 className="text-lg font-semibold text-primary">▼ Place Details</h3>
              {openDetails ? <ChevronUp className="w-5 h-5 text-secondary" /> : <ChevronDown className="w-5 h-5 text-secondary" />}
            </div>

            {openDetails && (
              <div className="p-4 space-y-3">
                {[
                  { label: 'Name', name: 'name' },
                  { label: 'Street 1', name: 'street1' },
                  { label: 'Street 2', name: 'street2' },
                  { label: 'Neighbourhood', name: 'neighbourHood' },
                  { label: 'Building', name: 'building' },
                  { label: 'Security Access Code / Postal Code', name: 'securityAccessCodepostalCode' },
                  { label: 'City', name: 'city' },
                  { label: 'State', name: 'state' },
                  { label: 'Phone', name: 'phone' },
                ].map(field => (
                  <div key={field.name}>
                    <label className="block text-sm font-medium text-primary mb-1">{field.label}</label>
                    <input
                      type="text"
                      name={field.name}
                      value={formData[field.name as keyof typeof formData]}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 bg-card border border-theme rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                ))}

                {/* Country Dropdown */}
                <div className="relative">
                  <label className="block text-sm font-medium text-primary mb-1">Country</label>
                  <select
                    value={selectedCountry}
                    onChange={e => handleCountryChange(e.target.value)}
                    className="w-full px-3 py-2 bg-card border border-theme rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {countries.map(c => (
                      <option key={c.code} value={c.code}>
                        {c.flag} {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-theme flex justify-end bg-card sticky bottom-0">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-theme !mr-3 rounded-md text-primary hover:bg-[rgba(255,255,255,0.03)] mr-2"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            style={{
              background: 'var(--accent-navyblue)',
            }}
            className="px-4 py-2  !text-white rounded-md hover:bg-blue-700"
          >
            Create Place
          </button>
        </div>
      </div>
    </>
  );
};

export default NewPlacesSidebar;
