import { useState, useEffect } from 'react';
import { File, X } from 'lucide-react';
import { FaTruck } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';

interface DocumentUploadNotificationProps {
  notification: {
    type: string;
    title: string;
    message: string;
    orderId: string;
    orderNumber: string;
    driverName: string;
    timestamp: string;
    link: string;
  };
  onClose: () => void;
  userRole?: 'admin' | 'dispatcher';
}

const DocumentUploadNotification = ({ notification, onClose, userRole = 'admin' }: DocumentUploadNotificationProps) => {
  const [progress, setProgress] = useState(100);
  const navigate = useNavigate();
  const duration = 8000; // 8 seconds

  // Auto-dismiss timer and progress bar
  useEffect(() => {
    if (!notification || !notification.orderId) return;
    const timer = setTimeout(() => {
      onClose();
    }, duration);

    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        const decrement = (100 / duration) * 50;
        return Math.max(0, prev - decrement);
      });
    }, 50);

    return () => {
      clearTimeout(timer);
      clearInterval(progressInterval);
    };
  }, [notification, duration, onClose]);

  // Don't render if no notification
  if (!notification || !notification.orderId) {
    return null;
  }

  const handleClick = () => {
    // Navigate to the order page based on user role
    const basePath = userRole === 'dispatcher' ? '/dispatch/trips' : '/admin/dispatch/trips';
    const targetUrl = `${basePath}`;
    
    console.log(`📍 Navigating to: ${targetUrl} (role: ${userRole})`);
    console.log(`📍 User role: ${userRole}, basePath: ${basePath}`);
    navigate(targetUrl);
    onClose();
  };

  return (
    <div className="fixed top-4 right-4 z-[9999] max-w-md w-full">
      <div
        onClick={handleClick}
        className="bg-card rounded-xl shadow-2xl border border-green-200 overflow-hidden transform transition-all duration-500 ease-in-out animate-slide-in cursor-pointer hover:shadow-3xl"
      >
        {/* Progress bar */}
        <div 
          className="h-1 bg-gradient-to-r from-green-500 to-emerald-500 transition-all duration-100" 
          style={{ width: `${progress}%` }}
        ></div>
        
        {/* Header with gradient background */}
        <div className="bg-gradient-to-r from-green-500 to-emerald-500 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-card/20 rounded-lg backdrop-blur-sm">
                <File className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">📄 Documents Uploaded</h2>
                <p className="text-sm text-white/90">
                  {notification.driverName || 'Driver'} uploaded POD and Manifest
                </p>
              </div>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              className="p-2 hover:bg-card/20 rounded-lg transition-all duration-200 group"
            >
              <X className="w-5 h-5 text-white group-hover:scale-110 transition-transform" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 bg-card">
          <div className="flex items-center gap-2 mb-3">
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full">
              <FaTruck className="w-3 h-3" />
              Order #{notification.orderNumber}
            </span>
          </div>
          <p className="text-primary text-sm leading-relaxed">
            <strong>{notification.driverName || 'Driver'}</strong> has uploaded POD and Manifest documents for order <strong>{notification.orderNumber}</strong>
          </p>
        </div>

        {/* Footer */}
        <div className="bg-card px-4 py-3 border-t border-theme">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <File className="w-4 h-4 text-green-600" />
              <span className="text-xs text-secondary">Click to view documents</span>
            </div>
            <span className="text-secondary text-xs">Just now</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DocumentUploadNotification;

