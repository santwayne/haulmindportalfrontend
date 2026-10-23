import React, { useState, useEffect } from 'react';
import { AlertTriangle, X, Calendar, User, Clock, CheckCircle, ExternalLink } from 'lucide-react';
import { getExpiringDriverDocuments } from '../../axios/api/compilance.driverdoc';

interface ExpiringDriverDocumentsPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onViewDocuments?: () => void;
  daysThreshold?: number;
  showOnlyOnce?: boolean;
  autoCloseDelay?: number;
}

interface ExpiringDriverDocumentWithDriver {
  _id: string;
  driver?: {
    _id: string;
    name: string;
    email: string;
    phone: string;
    internalId: string;
  };
  documentType: string;
  documentNumber?: string;
  issueDate?: string;
  expiryDate?: string;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  status: string;
  description?: string;
  uploadedBy?: any;
  company?: string;
  createdAt: string;
  updatedAt: string;
  __v: number;
}

const ExpiringDriverDocumentsPopup: React.FC<ExpiringDriverDocumentsPopupProps> = ({
  isOpen,
  onClose,
  onViewDocuments,
  daysThreshold = 30,
  autoCloseDelay = 0
}) => {
  const [expiringDocuments, setExpiringDocuments] = useState<ExpiringDriverDocumentWithDriver[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch expiring documents when popup opens
  useEffect(() => {
    if (isOpen) {
      fetchExpiringDocuments();
    }
  }, [isOpen, daysThreshold]);

  // Auto-close after delay
  useEffect(() => {
    if (isOpen && autoCloseDelay > 0) {
      const timer = setTimeout(() => {
        handleClose();
      }, autoCloseDelay);
      return () => clearTimeout(timer);
    }
  }, [isOpen, autoCloseDelay]);

  const fetchExpiringDocuments = async () => {
    try {
      setLoading(true);
      console.log('🔍 Fetching expiring driver documents...');
      const response = await getExpiringDriverDocuments(daysThreshold);

      if (response.success) {
        console.log('✅ Expiring driver documents fetched:', response.data.length);
        setExpiringDocuments(response.data as unknown as ExpiringDriverDocumentWithDriver[]);
      } else {
        console.error('❌ Failed to fetch expiring driver documents');
        setExpiringDocuments([]);
      }
    } catch (error) {
      console.error('❌ Error fetching expiring driver documents:', error);
      setExpiringDocuments([]);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    onClose();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getDaysUntilExpiry = (expiryDate: string) => {
    const today = new Date();
    const expiry = new Date(expiryDate);
    const diffTime = expiry.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getUrgencyIcon = (daysUntilExpiry: number) => {
    if (daysUntilExpiry <= 7) return <AlertTriangle className="w-4 h-4 text-[#A855F7]" />;
    if (daysUntilExpiry <= 14) return <Clock className="w-4 h-4 text-[#F59E0B]" />;
    return <Calendar className="w-4 h-4 text-[#00FFA3]" />;
  };

  // Don't show popup if it's not open
  if (!isOpen) {
    return null;
  }

  // Don't show popup if no expiring documents
  if (!loading && expiringDocuments.length === 0) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-[9999] max-w-md w-full">
      <div className="bg-card rounded-xl shadow-2xl border border-blue-200 overflow-hidden transform transition-all duration-500 ease-in-out animate-slide-in">
        {/* Header with gradient background */}
        <div className="bg-gradient-to-r from-blue-500 to-indigo-500 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-card/20 rounded-lg backdrop-blur-sm">
                <AlertTriangle className="w-6 h-6 text-white animate-pulse" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">🚛 Driver Document Alert</h2>
                <p className="text-sm text-white/90">
                  {expiringDocuments.length} document{expiringDocuments.length !== 1 ? 's' : ''} expiring soon
                </p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="p-2 hover:bg-card/20 rounded-lg transition-all duration-200 group"
            >
              <X className="w-5 h-5 text-white group-hover:scale-110 transition-transform" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 bg-card">
          {loading ? (
            <div className="flex items-center justify-center py-6">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
              <span className="ml-3 text-secondary text-sm">Loading...</span>
            </div>
          ) : (
            <div className="space-y-3">
              {expiringDocuments.slice(0, 3).map((doc) => {
                const daysUntilExpiry = getDaysUntilExpiry(doc.expiryDate!);
                const urgencyColor = daysUntilExpiry <= 7 ? 'border-red-300 bg-card' :
                  daysUntilExpiry <= 14 ? 'border-orange-300 bg-card' :
                    'border-yellow-300 bg-card';

                return (
                  <div
                    key={doc._id}
                    className={`p-3 rounded-lg border ${urgencyColor} hover:shadow-md transition-all duration-200 hover:scale-[1.02]`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          {getUrgencyIcon(daysUntilExpiry)}
                          <h3 className="font-semibold text-primary text-sm">{doc.documentType}</h3>
                          <span className={`text-xs px-2 py-1 rounded-full font-medium ${daysUntilExpiry <= 7 ? 'bg-red-100 text-red-700' :
                            daysUntilExpiry <= 14 ? 'bg-orange-100 text-orange-700' :
                              'bg-yellow-100 text-yellow-700'
                            }`}>
                            {daysUntilExpiry} day{daysUntilExpiry !== 1 ? 's' : ''} left
                          </span>
                        </div>

                        {doc.driver && (
                          <div className="flex items-center gap-1 mb-1">
                            <User className="w-3 h-3 text-secondary" />
                            <span className="text-xs text-primary font-medium">
                              {doc.driver.name}
                            </span>
                          </div>
                        )}

                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-secondary" />
                          <span className="text-xs text-secondary">
                            Expires: {formatDate(doc.expiryDate!)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              {expiringDocuments.length > 3 && (
                <div className="text-center pt-2">
                  <span className="text-xs text-secondary">
                    +{expiringDocuments.length - 3} more documents expiring
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-card px-4 py-3 border-t border-theme">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span className="text-xs text-secondary">Review driver documents urgently</span>
            </div>

            {onViewDocuments && (
              <button
                onClick={() => {
                  onViewDocuments();
                  handleClose();
                }}
                style={{ background: 'var(--accent-navyblue)' }}
                className="flex items-center gap-1 px-3 py-1  text-white rounded-lg  transition-colors text-xs font-medium"
              >
                <ExternalLink className="w-3 h-3" />
                View All
              </button>
            )}
          </div>
        </div>
      </div>
    </div >
  );
};

export default ExpiringDriverDocumentsPopup;

// Add CSS animation styles
const styles = `
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
    animation: slide-in 0.5s ease-out;
  }
`;

// Inject styles into the document
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = styles;
  document.head.appendChild(styleSheet);
}
