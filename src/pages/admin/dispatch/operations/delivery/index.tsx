import { useState, useEffect, useCallback } from "react";
import {
  FaTruck, FaFilter, FaDollarSign, FaFileAlt, FaUpload, FaCheck, FaTimes,
  FaCheckCircle, FaExclamationCircle, FaInfoCircle
} from 'react-icons/fa';
import PaymentStatusBadge from "../../../../../components/dispatch/PaymentStatusBadge";
import { getDeliveryLoads, uploadDeliveryDocument, updatePaymentStatus } from "../../../../../axios/api/distapcher";

type NotificationType = 'success' | 'error' | 'info';

interface Notification {
  id: number;
  type: NotificationType;
  message: string;
}

const Notification = ({ notification, onClose }: { notification: Notification; onClose: (id: number) => void }) => {
  const icons = {
    success: <FaCheckCircle className="text-green-500" size={24} />,
    error: <FaExclamationCircle className="text-red-500" size={24} />,
    info: <FaInfoCircle className="text-blue-500" size={24} />
  };

  const bgColors = {
    success: 'bg-green-50 border-green-200',
    error: 'bg-card border-red-200',
    info: 'bg-card border-blue-200'
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      onClose(notification.id);
    }, 5000);
    return () => clearTimeout(timer);
  }, [notification.id, onClose]);

  return (
    <div className={`fixed top-4 right-4 flex items-start gap-3 p-4 rounded-lg border-2 shadow-lg z-[10002] ${bgColors[notification.type]} animate-slide-in`}>
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

interface Load {
  _id: string;
  loadNumber?: string;
  orderNumber?: string;
  customer?: string;
  customerName?: string;
  amount?: number;
  rate?: number;
  status: 'delivered' | 'paid' | 'completed';
  paymentStatus?: 'pending' | 'due' | 'paid';
  deliveryDate?: string;
  completedAt?: string;
  documents?: {
    bol?: boolean;
    billOfSale?: boolean;
    pod?: boolean;
  };
  deliveryDocuments?: {
    bol?: { url?: string };
    billOfSale?: { url?: string };
    pod?: { url?: string };
  };
  route?: {
    selectPickup?: { place?: string };
    selectDropOff?: { place?: string };
  };
}

const Delivery = () => {
  const [loads, setLoads] = useState<Load[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLoad, setSelectedLoad] = useState<Load | null>(null);
  const [showDocumentModal, setShowDocumentModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentFilter, setPaymentFilter] = useState<string>('all');
  const [uploadingDoc, setUploadingDoc] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState('');
  const [paymentReference, setPaymentReference] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentNotes, setPaymentNotes] = useState('');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [emptyStateMessage, setEmptyStateMessage] = useState<string | null>(null);
  const [userInfo, setUserInfo] = useState<any>(null);

  const addNotification = useCallback((type: NotificationType, message: string) => {
    const id = Date.now();
    setNotifications((prev) => [...prev, { id, type, message }]);
  }, []);

  const removeNotification = useCallback((id: number) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  useEffect(() => {
    const syncUser = () => {
      try {
        const stored = localStorage.getItem('userInfo');
        if (stored) {
          setUserInfo(JSON.parse(stored));
        }
      } catch (error) {
        console.error('Error parsing userInfo from localStorage:', error);
      }
    };

    syncUser();

    const handleStorage = (event: StorageEvent) => {
      if (event.key === 'userInfo') {
        syncUser();
        fetchLoads();
      }
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchLoads = useCallback(
    async (options?: { suppressLoading?: boolean }) => {
      if (!options?.suppressLoading) {
        setLoading(true);
      }
      try {
        let currentUser = userInfo;
        if (!currentUser) {
          const stored = localStorage.getItem('userInfo');
          if (stored) {
            try {
              currentUser = JSON.parse(stored);
            } catch (error) {
              console.error('Error parsing userInfo during fetch:', error);
            }
          }
        }

        // Handle different userInfo structures (userData.company or direct company)
        const userRole = currentUser?.role || currentUser?.userData?.role;
        const userCompany = currentUser?.company || currentUser?.userData?.company;
        const isSuperadmin = userRole === 'superadmin';
        const isDispatcher = userRole === 'dispatcher';
        const hasCompany = Boolean(userCompany);

        // Allow dispatchers to call API even if company is not visible in localStorage
        // The backend will handle company filtering based on the authenticated user
        if (!isSuperadmin && !isDispatcher && !hasCompany) {
          setLoads([]);
          setEmptyStateMessage('No company assigned. Please complete company settings to view delivery loads.');
          return;
        }

        const response = await getDeliveryLoads();
        const message = response?.message || null;
        const data = response?.data;

        if (response?.success && Array.isArray(data)) {
          if (data.length === 0) {
            setLoads([]);
            setEmptyStateMessage(message || 'No delivery loads available.');
            return;
          }
          // Transform data to match frontend interface
          const transformedLoads = data.map((load: any) => ({
            _id: load._id,
            loadNumber: load.loadNumber || load._id,
            orderNumber: load.orderNumber || load._id,
            customer: load.customerName || load.customer,
            customerName: load.customerName || load.customer,
            amount: load.amount || load.rate || 0,
            rate: load.rate || 0,
            status: load.status,
            paymentStatus: load.paymentStatus || 'pending',
            deliveryDate: load.deliveryDate || load.completedAt,
            completedAt: load.completedAt,
            documents: {
              bol: !!load.deliveryDocuments?.bol?.url,
              billOfSale: !!load.deliveryDocuments?.billOfSale?.url,
              pod: !!load.deliveryDocuments?.pod?.url
            },
            deliveryDocuments: load.deliveryDocuments || {},
            route: load.route || {}
          }));
          setLoads(transformedLoads);
          setEmptyStateMessage(null);
        } else {
          const fallbackMessage = message || 'Failed to fetch delivery loads';
          addNotification('error', fallbackMessage);
          setLoads([]);
          setEmptyStateMessage(fallbackMessage);
        }
      } catch (error) {
        console.error('Error fetching delivery loads:', error);
        addNotification('error', 'Error fetching delivery loads');
        setLoads([]);
        setEmptyStateMessage('Error fetching delivery loads');
      } finally {
        if (!options?.suppressLoading) {
          setLoading(false);
        }
      }
    },
    [addNotification, userInfo]
  );

  useEffect(() => {
    fetchLoads();
  }, [fetchLoads, userInfo?.company]);

  const handleDocumentUpload = async (e: React.ChangeEvent<HTMLInputElement>, loadId: string, docType: 'bol' | 'billOfSale' | 'pod') => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingDoc(docType);
    try {
      const response = await uploadDeliveryDocument(loadId, docType, file);
      if (response && response.success) {
        addNotification('success', `${docType.toUpperCase()} uploaded successfully`);

        // Optimistically update the selected load immediately for instant feedback
        if (selectedLoad && selectedLoad._id === loadId) {
          setSelectedLoad(prev => {
            if (!prev) return null;
            return {
              ...prev,
              documents: {
                ...prev.documents,
                [docType]: true
              },
              deliveryDocuments: {
                ...prev.deliveryDocuments,
                [docType]: { url: 'uploaded' }
              }
            };
          });
        }

        // Update the loads list in background
        await fetchLoads({ suppressLoading: true });
      } else {
        addNotification('error', response?.message || 'Failed to upload document');
      }
    } catch (error) {
      console.error('Error uploading document:', error);
      addNotification('error', 'Error uploading document');
    } finally {
      setUploadingDoc(null);
      e.target.value = ''; // Reset file input
    }
  };

  const handleMarkPaid = async () => {
    if (!selectedLoad) return;

    if (!paymentMethod || !paymentReference) {
      addNotification('error', 'Please fill in payment method and reference');
      return;
    }

    try {
      const response = await updatePaymentStatus(
        selectedLoad._id,
        paymentMethod,
        paymentReference,
        paymentDate,
        paymentNotes
      );

      if (response && response.success) {
        addNotification('success', 'Payment marked as paid successfully');
        setShowPaymentModal(false);
        setSelectedLoad(null);
        setPaymentMethod('');
        setPaymentReference('');
        setPaymentNotes('');
        await fetchLoads({ suppressLoading: true }); // Refresh data
      } else {
        addNotification('error', response?.message || 'Failed to mark payment');
      }
    } catch (error) {
      console.error('Error marking payment:', error);
      addNotification('error', 'Error marking payment');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (date: string) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const filteredLoads = paymentFilter === 'all'
    ? loads
    : loads.filter(load => load.paymentStatus === paymentFilter);

  const totalAmount = filteredLoads.reduce((sum, load) => sum + (load.amount || load.rate || 0), 0);
  const dueAmount = filteredLoads
    .filter(load => load.paymentStatus === 'due')
    .reduce((sum, load) => sum + (load.amount || load.rate || 0), 0);
  const paidAmount = filteredLoads
    .filter(load => load.paymentStatus === 'paid')
    .reduce((sum, load) => sum + (load.amount || load.rate || 0), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-card p-6">
      {/* Notifications */}
      {notifications.map((notification) => (
        <Notification key={notification.id} notification={notification} onClose={removeNotification} />
      ))}

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-primary">Delivery</h1>
        <p className="text-secondary mt-1">Completed loads with document uploads and payment tracking</p>
      </div>

      {emptyStateMessage && filteredLoads.length === 0 && (
        <div className="mb-4 bg-card border border-blue-100 text-blue-700 px-4 py-3 rounded-lg shadow-sm flex items-center gap-3">
          <FaTruck className="text-blue-500" />
          <span className="text-sm">{emptyStateMessage}</span>
        </div>
      )}

      {/* Total Load Amount Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-gradient-to-br from-green-50 to-blue-50 rounded-xl shadow-lg p-6 border border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-secondary text-sm mb-1">Total Load Amount</p>
              <p className="text-3xl font-bold text-green-600">{formatCurrency(totalAmount)}</p>
              <p className="text-xs text-secondary mt-1">{filteredLoads.length} loads</p>
            </div>
            <FaDollarSign className="text-green-600" size={32} />
          </div>
        </div>

        <div className="bg-gradient-to-br from-red-50 to-orange-50 rounded-xl shadow-lg p-6 border border-red-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-secondary text-sm mb-1">Due Amount</p>
              <p className="text-3xl font-bold text-[#A855F7]">{formatCurrency(dueAmount)}</p>
              <p className="text-xs text-secondary mt-1">
                {filteredLoads.filter(l => l.paymentStatus === 'due').length} loads
              </p>
            </div>
            <PaymentStatusBadge status="due" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl shadow-lg p-6 border border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-secondary text-sm mb-1">Paid Amount</p>
              <p className="text-3xl font-bold text-green-600">{formatCurrency(paidAmount)}</p>
              <p className="text-xs text-secondary mt-1">
                {filteredLoads.filter(l => l.paymentStatus === 'paid').length} loads
              </p>
            </div>
            <PaymentStatusBadge status="paid" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-card rounded-xl shadow-lg p-4 mb-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-primary">Delivered Loads</h3>
          <div className="flex items-center gap-3">
            <FaFilter className="text-secondary" />
            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
              className="px-4 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Payments</option>
              <option value="due">Due</option>
              <option value="paid">Paid</option>
            </select>
          </div>
        </div>
      </div>

      {/* Loads Table */}
      <div className="bg-card rounded-xl shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-card border-b border-theme">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-primary uppercase tracking-wider">
                  Load #
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-primary uppercase tracking-wider">
                  Order #
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-primary uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-primary uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-primary uppercase tracking-wider">
                  Delivery Date
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-primary uppercase tracking-wider">
                  Payment Status
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-primary uppercase tracking-wider">
                  Documents
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-primary uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-card divide-y divide-theme">
              {filteredLoads.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-secondary">
                    <FaTruck className="mx-auto mb-3 text-gray-300" size={48} />
                    <p className="text-lg font-medium">No delivered loads found</p>
                    <p className="text-sm">{emptyStateMessage || 'Completed loads will appear here once deliveries are recorded.'}</p>
                  </td>
                </tr>
              ) : (
                filteredLoads.map((load) => (
                  <tr key={load._id} className="hover:bg-blue-50">
                    <td className="px-6 py-4 whitespace-nowrap font-semibold text-[#00D1FF]">
                      {load.loadNumber || load._id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-primary">
                      {load.orderNumber || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-primary">
                      {load.customer || load.customerName || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-green-600 font-bold">
                        {formatCurrency(load.amount || load.rate || 0)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-primary">
                      {formatDate(load.deliveryDate || '')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <PaymentStatusBadge status={load.paymentStatus || 'due'} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex gap-1">
                        <span className={`text-xs px-2 py-1 rounded ${load.documents?.bol ? 'bg-green-100 text-green-700' : 'bg-card text-secondary'
                          }`}>BOL</span>
                        <span className={`text-xs px-2 py-1 rounded ${load.documents?.billOfSale ? 'bg-green-100 text-green-700' : 'bg-card text-secondary'
                          }`}>B/S</span>
                        <span className={`text-xs px-2 py-1 rounded ${load.documents?.pod ? 'bg-green-100 text-green-700' : 'bg-card text-secondary'
                          }`}>POD</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setSelectedLoad(load);
                            setShowDocumentModal(true);
                          }}
                          className="px-3 py-1.5 bg-blue-600 !text-white text-sm rounded-lg hover:bg-blue-700 flex items-center gap-1"
                        >
                          <FaUpload size={12} /> Documents
                        </button>
                        {load.paymentStatus === 'due' && (
                          <button
                            onClick={() => {
                              setSelectedLoad(load);
                              setShowPaymentModal(true);
                            }}
                            className="px-3 py-1.5 bg-green-600 !text-white text-sm rounded-lg hover:bg-green-700 flex items-center gap-1"
                          >
                            <FaCheck size={12} /> Mark Paid
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Document Upload Modal */}
      {showDocumentModal && selectedLoad && (
        <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center z-[10001] p-4">
          <div className="bg-card rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-card border-b px-6 py-4 flex items-center justify-between rounded-t-xl">
              <div>
                <h3 className="text-xl font-bold text-primary">Delivery Documents</h3>
                <p className="text-sm text-secondary mt-1">
                  Load: {selectedLoad.loadNumber || selectedLoad._id} | Customer: {selectedLoad.customer || selectedLoad.customerName || 'N/A'}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowDocumentModal(false);
                  setSelectedLoad(null);
                }}
                className="p-2 hover:bg-[rgba(255,255,255,0.03)] rounded-lg"
              >
                <FaTimes className="text-secondary" size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Load Amount */}
              <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-4 border border-green-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FaDollarSign className="text-green-600" size={24} />
                    <div>
                      <p className="text-sm text-secondary">Total Load Amount</p>
                      <p className="text-2xl font-bold text-green-600">
                        {formatCurrency(selectedLoad.amount || selectedLoad.rate || 0)}
                      </p>
                    </div>
                  </div>
                  <PaymentStatusBadge status={selectedLoad.paymentStatus || 'due'} />
                </div>
              </div>

              {/* Document Upload Section */}
              <div>
                <h4 className="text-lg font-semibold text-primary mb-4">Upload Required Documents</h4>

                {/* BOL */}
                <div className="border-2 border-theme rounded-lg p-4 mb-4 hover:border-blue-300 transition-colors">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${selectedLoad.documents?.bol ? 'bg-green-100' : 'bg-blue-100'
                        }`}>
                        <FaFileAlt className={`${selectedLoad.documents?.bol ? 'text-green-600' : 'text-[#00D1FF]'}`} size={24} />
                      </div>
                      <div>
                        <h5 className="font-semibold text-primary">Bill of Lading (BOL) *</h5>
                        <p className="text-sm text-secondary">Required document for shipment</p>
                      </div>
                    </div>
                    {selectedLoad.documents?.bol ? (
                      <span className="flex items-center gap-2 text-green-600 font-medium">
                        <FaCheck /> Uploaded
                      </span>
                    ) : (
                      <span className="text-[#A855F7] text-sm font-medium">Required</span>
                    )}
                  </div>
                  <label className="block">
                    <div className="flex items-center gap-2 px-4 py-2 bg-card hover:bg-blue-100 rounded-lg cursor-pointer transition-colors">
                      <FaUpload className="text-[#00D1FF]" />
                      <span className="text-[#00D1FF] font-medium">Choose File</span>
                    </div>
                    <input
                      type="file"
                      className="hidden"
                      accept=".pdf,.doc,.docx,.jpg,.png"
                      onChange={(e) => handleDocumentUpload(e, selectedLoad._id, 'bol')}
                      disabled={uploadingDoc === 'bol'}
                    />
                  </label>
                </div>

                {/* Bill of Sale */}
                <div className="border-2 border-theme rounded-lg p-4 mb-4 hover:border-green-300 transition-colors">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${selectedLoad.documents?.billOfSale ? 'bg-green-100' : 'bg-green-100'
                        }`}>
                        <FaFileAlt className={`${selectedLoad.documents?.billOfSale ? 'text-green-600' : 'text-green-600'}`} size={24} />
                      </div>
                      <div>
                        <h5 className="font-semibold text-primary">Bill of Sale *</h5>
                        <p className="text-sm text-secondary">Sale documentation</p>
                      </div>
                    </div>
                    {selectedLoad.documents?.billOfSale ? (
                      <span className="flex items-center gap-2 text-green-600 font-medium">
                        <FaCheck /> Uploaded
                      </span>
                    ) : (
                      <span className="text-[#A855F7] text-sm font-medium">Required</span>
                    )}
                  </div>
                  <label className="block">
                    <div className="flex items-center gap-2 px-4 py-2 bg-green-50 hover:bg-green-100 rounded-lg cursor-pointer transition-colors">
                      <FaUpload className="text-green-600" />
                      <span className="text-green-600 font-medium">Choose File</span>
                    </div>
                    <input
                      type="file"
                      className="hidden"
                      accept=".pdf,.doc,.docx,.jpg,.png"
                      onChange={(e) => handleDocumentUpload(e, selectedLoad._id, 'billOfSale')}
                      disabled={uploadingDoc === 'billOfSale'}
                    />
                  </label>
                </div>

                {/* POD */}
                <div className="border-2 border-theme rounded-lg p-4 mb-4 hover:border-purple-300 transition-colors">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${selectedLoad.documents?.pod ? 'bg-green-100' : 'bg-purple-100'
                        }`}>
                        <FaFileAlt className={`${selectedLoad.documents?.pod ? 'text-green-600' : 'text-purple-600'}`} size={24} />
                      </div>
                      <div>
                        <h5 className="font-semibold text-primary">Proof of Delivery (POD) *</h5>
                        <p className="text-sm text-secondary">Delivery confirmation document</p>
                      </div>
                    </div>
                    {selectedLoad.documents?.pod ? (
                      <span className="flex items-center gap-2 text-green-600 font-medium">
                        <FaCheck /> Uploaded
                      </span>
                    ) : (
                      <span className="text-[#A855F7] text-sm font-medium">Required</span>
                    )}
                  </div>
                  <label className="block">
                    <div className="flex items-center gap-2 px-4 py-2 bg-card hover:bg-purple-100 rounded-lg cursor-pointer transition-colors">
                      <FaUpload className="text-purple-600" />
                      <span className="text-purple-600 font-medium">Choose File</span>
                    </div>
                    <input
                      type="file"
                      className="hidden"
                      accept=".pdf,.doc,.docx,.jpg,.png"
                      onChange={(e) => handleDocumentUpload(e, selectedLoad._id, 'pod')}
                      disabled={uploadingDoc === 'pod'}
                    />
                  </label>
                </div>

                {/* Document Status Summary */}
                <div className="bg-card rounded-lg p-4 mt-4">
                  <h5 className="font-semibold text-blue-900 mb-2">Document Status:</h5>
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div className={`p-2 rounded ${selectedLoad.documents?.bol ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                      BOL: {selectedLoad.documents?.bol ? '✓ Uploaded' : '✗ Required'}
                    </div>
                    <div className={`p-2 rounded ${selectedLoad.documents?.billOfSale ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                      Bill of Sale: {selectedLoad.documents?.billOfSale ? '✓ Uploaded' : '✗ Required'}
                    </div>
                    <div className={`p-2 rounded ${selectedLoad.documents?.pod ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                      POD: {selectedLoad.documents?.pod ? '✓ Uploaded' : '✗ Required'}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 bg-card px-6 py-4 flex justify-end border-t rounded-b-xl">
              <button
                onClick={() => {
                  setShowDocumentModal(false);
                  setSelectedLoad(null);
                }}
                className="px-6 py-2 bg-gray-600 !text-white rounded-lg hover:bg-gray-700 font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && selectedLoad && (
        <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center z-[10001] p-4">
          <div className="bg-card rounded-xl shadow-2xl w-full max-w-md">
            <div className="p-6 border-b">
              <h3 className="text-xl font-bold text-primary">Mark as Paid</h3>
              <p className="text-sm text-secondary mt-1">Load: {selectedLoad.loadNumber || selectedLoad._id}</p>
            </div>
            <div className="p-6">
              <div className="bg-card rounded-lg p-4 mb-4">
                <div className="flex justify-between items-center">
                  <span className="text-secondary">Load Amount:</span>
                  <span className="text-2xl font-bold text-green-600">
                    {formatCurrency(selectedLoad.amount || selectedLoad.rate || 0)}
                  </span>
                </div>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-semibold text-primary mb-2">
                    Payment Method
                  </label>
                  <select
                    className="w-full p-3 border border-theme rounded-lg"
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                  >
                    <option value="">Select Payment Method</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Check">Check</option>
                    <option value="Cash">Cash</option>
                    <option value="Credit Card">Credit Card</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-primary mb-2">
                    Payment Reference
                  </label>
                  <input
                    type="text"
                    placeholder="Transaction ID or reference number"
                    className="w-full p-3 border border-theme rounded-lg"
                    value={paymentReference}
                    onChange={(e) => setPaymentReference(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-primary mb-2">
                    Payment Date
                  </label>
                  <input
                    type="date"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="w-full p-3 border border-theme rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-primary mb-2">
                    Notes (Optional)
                  </label>
                  <textarea
                    placeholder="Additional notes about the payment"
                    className="w-full p-3 border border-theme rounded-lg"
                    rows={3}
                    value={paymentNotes}
                    onChange={(e) => setPaymentNotes(e.target.value)}
                  />
                </div>
              </div>
            </div>
            <div className="p-6 border-t flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowPaymentModal(false);
                  setSelectedLoad(null);
                  setPaymentMethod('');
                  setPaymentReference('');
                  setPaymentDate(new Date().toISOString().split('T')[0]);
                  setPaymentNotes('');
                }}
                className="px-6 py-2 border border-theme rounded-lg hover:bg-[rgba(255,255,255,0.03)]"
              >
                Cancel
              </button>
              <button
                onClick={handleMarkPaid}
                className="px-6 py-2 bg-green-600 !text-white rounded-lg hover:bg-green-700"
              >
                Confirm Payment
              </button>
            </div>
          </div>
        </div>
      )}

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
    </div>
  );
};

export default Delivery;

