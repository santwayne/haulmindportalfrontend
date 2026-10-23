import React, { useEffect, useState } from 'react';
import { AlertTriangle, X, ExternalLink } from 'lucide-react';

interface ExpiringDocumentsToastProps {
  isOpen: boolean;
  onClose: () => void;
  onViewDocuments?: () => void;
  count: number;
}

// 3600000 ms
const AUTO_CLOSE_TIME = 5000;   // 5 seconds

const ExpiringDocumentsToast: React.FC<ExpiringDocumentsToastProps> = ({
  isOpen,
  onClose,
  onViewDocuments,
  count
}) => {
  const [visible, setVisible] = useState(false);
 
  // 🔁 Show toast every 1 hour
  useEffect(() => {
    if (count === 0) return;
    
 const initialDelayTimer = setTimeout(() => {
    console.log("🚀 Showing toast after 10 seconds");
    setVisible(true);
  }, 10000);

    // Show first time after 1 hour
    // const initialTimer = setTimeout(() => {
    //   setVisible(true);
    // }, ONE_HOUR);

    // Show again every 1 hour
    const interval = setInterval(() => {
      setVisible(true);
    }, 15000);

    return () => {
      // clearTimeout(initialTimer);
      clearInterval(interval);
      clearTimeout(initialDelayTimer);
    };
  }, [count]);

  // ⏱ Auto-close after 5 seconds
  useEffect(() => {
    if (visible) {
      const closeTimer = setTimeout(() => {
        setVisible(false);
        onClose();
      }, AUTO_CLOSE_TIME);

      return () => clearTimeout(closeTimer);
    }
  }, [visible, onClose]);

  console.log("isOpen............",isOpen)

  if (!visible || !isOpen || count === 0) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-[9999] max-w-md w-full animate-slide-in">
      <div className="bg-card rounded-lg shadow-xl border-l-4 border-orange-500 overflow-hidden">
        <div className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3 flex-1">
              <div className="p-2 bg-orange-100 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-[#F59E0B]" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-primary mb-1">
                  Documents Expiring Soon
                </h3>
                <p className="text-sm text-secondary">
                  {count} document{count !== 1 ? 's' : ''}{' '}
                  {count === 1 ? 'is' : 'are'} expiring within 30 days
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                setVisible(false);
                onClose();
              }}
              className="p-1 hover:bg-[rgba(255,255,255,0.03)] rounded transition-colors ml-2"
            >
              <X className="w-4 h-4 text-secondary" />
            </button>
          </div>

          {onViewDocuments && (
            <div className="mt-3 flex justify-end">
              <button
                onClick={() => {
                  onViewDocuments();
                  setVisible(false);
                  onClose();
                }}
                className="flex items-center gap-1 px-3 py-1.5 text-white text-xs font-medium rounded transition-colors"
                style={{
                  background:
                    'linear-gradient(90deg, var(--accent-blue) 0%, var(--accent-blue) 40%, rgba(0,209,255,0.15) 100%)'
                }}
              >
                <ExternalLink className="w-3 h-3 text-white" />
                <span className="text-white">View Documents</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExpiringDocumentsToast;
