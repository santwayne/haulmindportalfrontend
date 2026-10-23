import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { FaExclamationTriangle, FaTimes } from 'react-icons/fa';

interface TrialExpiredToastContextType {
  showTrialExpiredToast: (message?: string) => void;
  hideTrialExpiredToast: () => void;
}

const TrialExpiredToastContext = createContext<TrialExpiredToastContextType | undefined>(undefined);

export const useTrialExpiredToast = () => {
  const context = useContext(TrialExpiredToastContext);
  if (!context) {
    throw new Error('useTrialExpiredToast must be used within TrialExpiredToastProvider');
  }
  return context;
};

interface TrialExpiredToastProviderProps {
  children: React.ReactNode;
}

export const TrialExpiredToastProvider: React.FC<TrialExpiredToastProviderProps> = ({ children }) => {
  const [showToast, setShowToast] = useState(false);
  const [message, setMessage] = useState("Your subscription has ended. Purchase to continue use.");

  const showTrialExpiredToast = useCallback((customMessage?: string) => {
    if (customMessage) {
      setMessage(customMessage);
    }
    // Always show toast - don't check if already showing to ensure it stays visible
    setShowToast(true);
  }, []);

  const hideTrialExpiredToast = useCallback(() => {
    setShowToast(false);
  }, []);

  // Store the show function globally so API client can access it
  useEffect(() => {
    (window as any).showTrialExpiredToast = showTrialExpiredToast;
    return () => {
      delete (window as any).showTrialExpiredToast;
    };
  }, [showTrialExpiredToast]);

  return (
    <TrialExpiredToastContext.Provider value={{ showTrialExpiredToast, hideTrialExpiredToast }}>
      {children}
      {/* Global Toast Notification */}
      {showToast && (
        <div className="fixed top-4 right-4 z-[99999] w-[400px] max-w-[90vw]">
          <div
            className="rounded-xl shadow-2xl p-4 animate-slide-in border"
            style={{
              backgroundColor: 'var(--bg-card)',
              borderColor: 'rgba(17, 131, 224, 0.35)',
              boxShadow: '0 8px 32px rgba(17, 131, 224, 0.15)',
            }}
          >
            <div className="flex items-start gap-3">
              <div
                className="flex-shrink-0 mt-0.5 w-9 h-9 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: 'rgba(17, 131, 224, 0.12)' }}
              >
                <FaExclamationTriangle style={{ color: 'var(--accent-navyblue)' }} size={16} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold mb-1" style={{ color: 'var(--accent-navyblue)' }}>
                  Subscription Ended
                </p>
                <p className="text-sm mb-1.5" style={{ color: 'var(--text-primary)' }}>{message}</p>
                <p className="text-xs mb-3" style={{ color: 'var(--text-secondary)' }}>
                  You don't have access right now. Please purchase a plan to continue using all features.
                </p>
                <button
                  onClick={() => {
                    const isAdmin = window.location.pathname.includes('/admin/');
                    const subscriptionPath = isAdmin ? '/admin/subscription' : '/subscription';
                    window.location.href = subscriptionPath;
                  }}
                  className="mt-1 px-4 py-2.5 text-white text-sm font-semibold rounded-lg transition-all duration-200 w-full hover:-translate-y-0.5 hover:shadow-lg transform"
                  style={{ backgroundColor: 'var(--accent-navyblue)' }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#0d6fc7'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'var(--accent-navyblue)'; }}
                >
                  Purchase Now
                </button>
              </div>
              <button
                onClick={hideTrialExpiredToast}
                className="flex-shrink-0 transition-opacity hover:opacity-60"
                style={{ color: 'var(--text-secondary)' }}
              >
                <FaTimes size={14} />
              </button>
            </div>
          </div>
        </div>
      )}
    </TrialExpiredToastContext.Provider>
  );
};

