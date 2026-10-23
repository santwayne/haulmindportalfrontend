import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {  X, Calendar, Truck, Clock, ExternalLink } from 'lucide-react';
import { getExpiringVehicleDocuments } from '../../axios/api/compilance.vehicledoc';

interface ExpiringVehicleDocumentsPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onViewDocuments?: () => void;
  daysThreshold?: number;
  autoCloseDelay?: number;
}

interface ExpiringVehicleDocumentWithVehicle {
  _id: string;
  documentType: string;
  documentNumber: string;
  expiryDate: string;
  issuedAt: string;
  status: string;
  vehicleId?: {
    _id: string;
    plateNumber: string;
    internalId?: string;
    make?: string;
    model?: string;
  };
  trailerId?: {
    _id: string;
    plateNumber: string;
    internalId?: string;
    type?: string;
  };
  assetType?: 'vehicle' | 'trailer';
  createdAt: string;
  updatedAt: string;
  __v: number;
}

const ExpiringVehicleDocumentsPopup: React.FC<ExpiringVehicleDocumentsPopupProps> = ({
  isOpen,
  onClose,
  onViewDocuments,
  daysThreshold = 30,
  autoCloseDelay = 0
}) => {
  const navigate = useNavigate();
  const [expiringDocuments, setExpiringDocuments] = useState<ExpiringVehicleDocumentWithVehicle[]>([]);
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
      console.log('🔍 Fetching expiring vehicle documents...');
      const response = await getExpiringVehicleDocuments(daysThreshold);

      console.log("📊 API Response:", response);
      
      if (response.success) {
        console.log('✅ Expiring vehicle documents fetched:', response.data.length);
        setExpiringDocuments(response.data as unknown as ExpiringVehicleDocumentWithVehicle[]);
      } else {
        console.error('❌ Failed to fetch expiring vehicle documents');
        setExpiringDocuments([]);
      }
    } catch (error) {
      console.error('❌ Error fetching expiring vehicle documents:', error);
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

  const getUrgencyColor = (daysUntilExpiry: number) => {
    if (daysUntilExpiry <= 7) return 'text-[#A855F7] bg-card border-red-200';
    if (daysUntilExpiry <= 14) return 'text-[#F59E0B] bg-card border-orange-200';
    return 'text-[#00FFA3] bg-card border-yellow-200';
  };

  const getUrgencyBadge = (daysUntilExpiry: number) => {
    if (daysUntilExpiry < 0) return { text: 'Expired', color: 'bg-red-500' };
    if (daysUntilExpiry <= 7) return { text: 'Critical', color: 'bg-red-500' };
    if (daysUntilExpiry <= 14) return { text: 'Urgent', color: 'bg-orange-500' };
    return { text: 'Warning', color: 'bg-yellow-500' };
  };

  const handleViewDocuments = () => {
    if (onViewDocuments) {
      onViewDocuments();
    } else {
      navigate('/admin/Management/vehicle-documents');
    }
    handleClose();
  };

  // Don't show popup if no expiring documents
  if (!loading && expiringDocuments.length === 0) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-[9999] max-w-md w-full">
      <div className="bg-card rounded-xl shadow-2xl border border-red-200 overflow-hidden transform transition-all duration-500 ease-in-out animate-slide-in">
        {/* Header with gradient background */}
        <div className="bg-gradient-to-r from-red-500 to-orange-500 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-card/20 rounded-lg backdrop-blur-sm">
                <Truck className="w-6 h-6 text-white animate-pulse" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">⚠️ Vehicle Document Alert</h2>
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
        <div className="max-h-96 overflow-y-auto">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500 mx-auto"></div>
              <p className="mt-4 text-sm text-secondary">Loading expiring documents...</p>
            </div>
          ) : (
            <div className="p-4 space-y-3">
              {expiringDocuments.map((doc) => {
                const daysUntilExpiry = getDaysUntilExpiry(doc.expiryDate);
                const urgencyBadge = getUrgencyBadge(daysUntilExpiry);
                const assetName = doc.assetType === 'trailer' 
                  ? `${doc.trailerId?.type || 'Trailer'} (${doc.trailerId?.plateNumber || 'N/A'})`
                  : `${doc.vehicleId?.make || ''} ${doc.vehicleId?.model || ''} (${doc.vehicleId?.plateNumber || 'N/A'})`.trim();

                return (
                  <div
                    key={doc._id}
                    className={`p-4 rounded-lg border-2 ${getUrgencyColor(daysUntilExpiry)} transition-all hover:shadow-md`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Truck className="w-4 h-4" />
                          <span className="font-semibold text-sm">{assetName}</span>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-bold text-white ${urgencyBadge.color}`}>
                            {urgencyBadge.text}
                          </span>
                        </div>
                        <p className="text-sm font-medium mb-1">{doc.documentType.replace(/_/g, ' ').toUpperCase()}</p>
                        <p className="text-xs opacity-75">Doc #: {doc.documentNumber}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4 mt-3 text-xs">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        <span>Expires: {formatDate(doc.expiryDate)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span className={daysUntilExpiry < 0 ? 'font-bold' : ''}>
                          {daysUntilExpiry < 0 
                            ? `${Math.abs(daysUntilExpiry)} day${Math.abs(daysUntilExpiry) !== 1 ? 's' : ''} overdue`
                            : `${daysUntilExpiry} day${daysUntilExpiry !== 1 ? 's' : ''} remaining`
                          }
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        {!loading && expiringDocuments.length > 0 && (
          <div className="border-t border-theme p-4 bg-card">
            <button
              onClick={handleViewDocuments}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-semibold transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              View All Vehicle Documents
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ExpiringVehicleDocumentsPopup;

