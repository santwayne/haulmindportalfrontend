import { useState, useEffect } from 'react';
import { Search, Plus, Edit, Trash2, Download, Filter, X, Save } from 'lucide-react';
import { FaCheckCircle, FaExclamationCircle, FaInfoCircle, FaTimes } from 'react-icons/fa';
import {
  getChartOfAccounts,
  createChartOfAccount,
  updateChartOfAccount,
  deleteChartOfAccount,
  getTaxCodes,
  createTaxCode,
  updateTaxCode,
  deleteTaxCode,
  getPaymentMethods,
  createPaymentMethod,
  updatePaymentMethod,
  deletePaymentMethod,
  getSmsBilling,
  getSmsBillingStats,
  type ChartOfAccount,
  type AccountTaxCode,
  type PaymentMethod,
  type SmsBilling
} from '../../../../axios/api/account.config';

interface ToastNotification {
  id: number;
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
}

const ToastNotificationComponent = ({ notification, onClose }: { notification: ToastNotification; onClose: (id: number) => void }) => {
  const icons = {
    success: <FaCheckCircle className="text-green-500" size={24} />,
    error: <FaExclamationCircle className="text-red-500" size={24} />,
    info: <FaInfoCircle className="text-blue-500" size={24} />,
    warning: <FaExclamationCircle className="text-yellow-500" size={24} />
  };

  const bgColors = {
    success: 'bg-green-50 border-green-200',
    error: 'bg-card border-red-200',
    info: 'bg-card border-blue-200',
    warning: 'bg-card border-yellow-200'
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      onClose(notification.id);
    }, 5000);
    return () => clearTimeout(timer);
  }, [notification.id, onClose]);

  return (
    <div className={`fixed top-4 right-4 flex items-start gap-3 p-4 rounded-lg border-2 shadow-lg z-[10000] ${bgColors[notification.type]} min-w-[300px] max-w-[500px]`}>
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

type TabType = 'chart-of-accounts' | 'tax-codes' | 'payment-methods' | 'sms-billing';

type DataItem = ChartOfAccount | AccountTaxCode | PaymentMethod | SmsBilling;

type FormData = Partial<ChartOfAccount & AccountTaxCode & PaymentMethod>;

export default function AccountsSetup() {
  const [activeTab, setActiveTab] = useState<TabType>('chart-of-accounts');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [showModal, setShowModal] = useState<boolean>(false);
  const [editingItem, setEditingItem] = useState<DataItem | null>(null);
  const [modalType, setModalType] = useState<TabType>('chart-of-accounts');
  const [loading, setLoading] = useState(false);
  const [notifications, setNotifications] = useState<ToastNotification[]>([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ id: string; type: TabType } | null>(null);

  // Detail modal states
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<DataItem | null>(null);
  const [selectedItemType, setSelectedItemType] = useState<TabType | null>(null);

  // Data states
  const [accounts, setAccounts] = useState<ChartOfAccount[]>([]);
  const [taxCodes, setTaxCodes] = useState<AccountTaxCode[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [smsBilling, setSmsBilling] = useState<SmsBilling[]>([]);
  const [, setSmsStats] = useState({
    totalCost: 0,
    totalMessages: 0,
    avgCostPerSms: 0
  });

  const [formData, setFormData] = useState<FormData>({});

  const tabs: { id: TabType; label: string }[] = [
    { id: 'chart-of-accounts', label: 'Chart of Accounts' },
    { id: 'tax-codes', label: 'Tax Code Setup' },
    { id: 'payment-methods', label: 'Payment Methods' },
  ];

  // Toast notification helpers
  const showNotification = (type: 'success' | 'error' | 'info' | 'warning', message: string) => {
    const id = Date.now();
    setNotifications((prev: ToastNotification[]) => [...prev, { id, type, message }]);
  };

  const removeNotification = (id: number) => {
    setNotifications((prev: ToastNotification[]) => prev.filter((n: ToastNotification) => n.id !== id));
  };



  // Fetch data functions
  const fetchChartOfAccounts = async () => {
    setLoading(true);
    try {
      const response = await getChartOfAccounts({ search: searchTerm || undefined });
      if (response?.success && Array.isArray(response.data)) {
        setAccounts(response.data);
      } else {
        showNotification('error', response?.message || 'Failed to fetch chart of accounts');
      }
    } catch (error: any) {
      console.error('Error fetching chart of accounts:', error);
      showNotification('error', error?.response?.data?.message || 'An error occurred while fetching chart of accounts');
    } finally {
      setLoading(false);
    }
  };

  const fetchTaxCodes = async () => {
    setLoading(true);
    try {
      const response = await getTaxCodes({ search: searchTerm || undefined });
      if (response?.success && Array.isArray(response.data)) {
        setTaxCodes(response.data);
      } else {
        showNotification('error', response?.message || 'Failed to fetch tax codes');
      }
    } catch (error: any) {
      console.error('Error fetching tax codes:', error);
      showNotification('error', error?.response?.data?.message || 'An error occurred while fetching tax codes');
    } finally {
      setLoading(false);
    }
  };

  const fetchPaymentMethods = async () => {
    setLoading(true);
    try {
      const response = await getPaymentMethods({ search: searchTerm || undefined });
      if (response?.success && Array.isArray(response.data)) {
        setPaymentMethods(response.data);
      } else {
        showNotification('error', response?.message || 'Failed to fetch payment methods');
      }
    } catch (error: any) {
      console.error('Error fetching payment methods:', error);
      showNotification('error', error?.response?.data?.message || 'An error occurred while fetching payment methods');
    } finally {
      setLoading(false);
    }
  };

  const fetchSmsBilling = async () => {
    setLoading(true);
    try {
      const response = await getSmsBilling({ search: searchTerm || undefined });
      if (response?.success && Array.isArray(response.data)) {
        const formatted = response.data.map((item: any) => ({
          ...item,
          timestamp: item.timestamp ? new Date(item.timestamp).toLocaleString('en-US', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
          }).replace(',', '') : ''
        }));
        setSmsBilling(formatted);
      } else {
        showNotification('error', response?.message || 'Failed to fetch SMS billing');
      }
    } catch (error: any) {
      console.error('Error fetching SMS billing:', error);
      showNotification('error', error?.response?.data?.message || 'An error occurred while fetching SMS billing');
    } finally {
      setLoading(false);
    }
  };

  const fetchSmsStats = async () => {
    try {
      const response = await getSmsBillingStats();
      if (response?.success && response.data) {
        setSmsStats({
          totalCost: response.data.totalCost || 0,
          totalMessages: response.data.totalMessages || 0,
          avgCostPerSms: response.data.avgCostPerSms || 0
        });
      }
    } catch (error: any) {
      console.error('Error fetching SMS stats:', error);
    }
  };

  // Load data on mount and tab/search change
  useEffect(() => {
    if (activeTab === 'chart-of-accounts') {
      fetchChartOfAccounts();
    } else if (activeTab === 'tax-codes') {
      fetchTaxCodes();
    } else if (activeTab === 'payment-methods') {
      fetchPaymentMethods();
    } else if (activeTab === 'sms-billing') {
      fetchSmsBilling();
      fetchSmsStats();
    }
  }, [activeTab, searchTerm]);

  const handleAdd = () => {
    setEditingItem(null);
    setFormData({});
    setModalType(activeTab);
    setShowModal(true);
  };

  const handleEdit = (item: DataItem) => {
    setEditingItem(item);
    setFormData(item as FormData);
    setModalType(activeTab);
    setShowModal(true);
  };

  const handleDelete = (id: string) => {
    setItemToDelete({ id, type: activeTab });
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;

    try {
      let response;
      if (itemToDelete.type === 'chart-of-accounts') {
        response = await deleteChartOfAccount(itemToDelete.id);
        if (response?.success) {
          await fetchChartOfAccounts();
          showNotification('success', 'Chart of account deleted successfully');
        }
      } else if (itemToDelete.type === 'tax-codes') {
        response = await deleteTaxCode(itemToDelete.id);
        if (response?.success) {
          await fetchTaxCodes();
          showNotification('success', 'Tax code deleted successfully');
        }
      } else if (itemToDelete.type === 'payment-methods') {
        response = await deletePaymentMethod(itemToDelete.id);
        if (response?.success) {
          await fetchPaymentMethods();
          showNotification('success', 'Payment method deleted successfully');
        }
      }

      if (!response?.success) {
        showNotification('error', response?.message || 'Failed to delete item');
      }
    } catch (error: any) {
      console.error('Error deleting item:', error);
      showNotification('error', error?.response?.data?.message || 'An error occurred while deleting item');
    } finally {
      setShowDeleteModal(false);
      setItemToDelete(null);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      let response;

      if (activeTab === 'chart-of-accounts') {
        const data = {
          number: formData.number || '',
          name: formData.name || '',
          type: formData.type as 'Asset' | 'Liability' | 'Equity' | 'Revenue' | 'Expense',
          balance: formData.balance || 0
        };

        response = editingItem?._id
          ? await updateChartOfAccount(editingItem._id, data)
          : await createChartOfAccount(data);

        if (response?.success) {
          setShowModal(false);
          await fetchChartOfAccounts();
          showNotification('success', editingItem?._id ? 'Chart of account updated successfully' : 'Chart of account created successfully');
        } else {
          showNotification('error', response?.message || 'Failed to save chart of account');
        }
      } else if (activeTab === 'tax-codes') {
        const data = {
          code: formData.code || '',
          description: formData.description || '',
          rate: formData.rate || 0,
          category: formData.category as 'Sales Tax' | 'IFTA' | 'Payroll'
        };

        response = editingItem?._id
          ? await updateTaxCode(editingItem._id, data)
          : await createTaxCode(data);

        if (response?.success) {
          setShowModal(false);
          await fetchTaxCodes();
          showNotification('success', editingItem?._id ? 'Tax code updated successfully' : 'Tax code created successfully');
        } else {
          showNotification('error', response?.message || 'Failed to save tax code');
        }
      } else if (activeTab === 'payment-methods') {
        const data = {
          method: formData.method || '',
          description: formData.description || '',
          preferred: formData.preferred as 'Driver' | 'Vendor' | 'Carrier'
        };

        response = editingItem?._id
          ? await updatePaymentMethod(editingItem._id, data)
          : await createPaymentMethod(data);

        if (response?.success) {
          setShowModal(false);
          await fetchPaymentMethods();
          showNotification('success', editingItem?._id ? 'Payment method updated successfully' : 'Payment method created successfully');
        } else {
          showNotification('error', response?.message || 'Failed to save payment method');
        }
      }
    } catch (error: any) {
      console.error('Error saving item:', error);
      showNotification('error', error?.response?.data?.message || 'An error occurred while saving item');
    }
  };

  const handleExport = () => {
    let data: DataItem[];
    switch (activeTab) {
      case 'chart-of-accounts': data = accounts; break;
      case 'tax-codes': data = taxCodes; break;
      case 'payment-methods': data = paymentMethods; break;
      case 'sms-billing': data = smsBilling; break;
      default: data = [];
    }

    if (data.length === 0) {
      showNotification('error', 'No data to export');
      return;
    }

    const csv = [
      Object.keys(data[0]).filter(key => key !== '_id' && key !== '__v').join(','),
      ...data.map(row => {
        const obj = row as any;
        return Object.keys(obj)
          .filter(key => key !== '_id' && key !== '__v')
          .map(key => {
            const value = obj[key];
            return typeof value === 'string' && value.includes(',') ? `"${value}"` : value;
          })
          .join(',');
      })
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeTab}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    showNotification('success', 'Data exported successfully');
  };

  const filteredData = (): DataItem[] => {
    const term = searchTerm.toLowerCase();
    switch (activeTab) {
      case 'chart-of-accounts':
        return accounts.filter(a =>
          a.name.toLowerCase().includes(term) ||
          a.number.includes(term) ||
          a.type.toLowerCase().includes(term)
        );
      case 'tax-codes':
        return taxCodes.filter(t =>
          t.code.toLowerCase().includes(term) ||
          t.description.toLowerCase().includes(term)
        );
      case 'payment-methods':
        return paymentMethods.filter(p =>
          p.method.toLowerCase().includes(term) ||
          p.description.toLowerCase().includes(term)
        );
      case 'sms-billing':
        return smsBilling.filter(s =>
          s.recipient.includes(term) ||
          s.content.toLowerCase().includes(term) ||
          s.account.toLowerCase().includes(term)
        );
      default:
        return [];
    }
  };

  const renderModal = () => {
    if (!showModal) return null;

    return (
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
        <div className="bg-card rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-headings">
                {editingItem ? 'Edit' : 'Add New'} {activeTab.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-secondary hover:text-secondary">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              {modalType === 'chart-of-accounts' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-primary mb-1">Account Number</label>
                    <input
                      type="text"
                      value={formData.number || ''}
                      onChange={(e) => setFormData({ ...formData, number: e.target.value })}
                      className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-primary mb-1">Account Name</label>
                    <input
                      type="text"
                      value={formData.name || ''}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-primary mb-1">Account Type</label>
                    <select
                      value={formData.type || ''}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value as 'Asset' | 'Liability' | 'Equity' | 'Revenue' | 'Expense' })}
                      className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    >
                      <option className='form-option' value="">Select Type</option>
                      <option className='form-option' value="Asset">Asset</option>
                      <option className='form-option' value="Liability">Liability</option>
                      <option className='form-option' value="Equity">Equity</option>
                      <option className='form-option' value="Revenue">Revenue</option>
                      <option className='form-option' value="Expense">Expense</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-primary mb-1">Balance</label>
                    <input
                      type="number"
                      value={formData.balance || ''}
                      onChange={(e) => setFormData({ ...formData, balance: parseFloat(e.target.value) })}
                      className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
                </>
              )}

              {modalType === 'tax-codes' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-headings mb-1">Tax Code</label>
                    <input
                      type="text"
                      value={formData.code || ''}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                      className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-headings mb-1">Description</label>
                    <input
                      type="text"
                      value={formData.description || ''}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-headings mb-1">Rate (%)</label>
                    <input
                      type="number"
                      step="0.001"
                      value={formData.rate || ''}
                      onChange={(e) => setFormData({ ...formData, rate: parseFloat(e.target.value) })}
                      className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-headings mb-1">Category</label>
                    <select
                      value={formData.category || ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          category: e.target.value as 'Sales Tax' | 'IFTA' | 'Payroll',
                        })
                      }
                      required
                      className="w-full px-3 py-2 text-sm border border-theme rounded-lg
  bg-[var(--bg-card)] text-[var(--text-primary)]
  focus:ring-2 focus:ring-[var(--accent-blue)]
  focus:border-[var(--accent-blue)]
  outline-none cursor-pointer transition-all"
                    >
                      <option
                        value=""
                        className="bg-[var(--bg-card)] text-[var(--text-primary)]"
                      >
                        Select Category
                      </option>

                      <option value="Sales Tax" className="bg-[var(--bg-card)] text-[var(--text-primary)]">
                        Sales Tax
                      </option>

                      <option value="IFTA" className="bg-[var(--bg-card)] text-[var(--text-primary)]">
                        IFTA
                      </option>

                      <option value="Payroll" className="bg-[var(--bg-card)] text-[var(--text-primary)]">
                        Payroll
                      </option>
                    </select>
                  </div>
                </>
              )}

              {modalType === 'payment-methods' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-primary mb-1">Payment Method</label>
                    <input
                      type="text"
                      value={formData.method || ''}
                      onChange={(e) => setFormData({ ...formData, method: e.target.value })}
                      className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-primary mb-1">Description</label>
                    <textarea
                      value={formData.description || ''}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      rows={3}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-primary mb-1">Preferred For</label>
                    <select
                      value={formData.preferred || ''}
                      onChange={(e) => setFormData({ ...formData, preferred: e.target.value as 'Driver' | 'Vendor' | 'Carrier' })}
                      className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    >
                      <option className='form-option' value="">Select Type</option>
                      <option  className='form-option' value="Driver">Driver</option>
                      <option className='form-option' value="Vendor">Vendor</option>
                      <option className='form-option' value="Carrier">Carrier</option>
                    </select>
                  </div>
                </>
              )}

              <div className="flex gap-3 mt-6 pt-4 border-t border-theme">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 border border-theme rounded-lg hover:bg-[rgba(255,255,255,0.03)] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 !text-white px-4 py-2 rounded-lg transition-all flex items-center justify-center gap-2 hover:shadow-lg hover:scale-105 transform duration-200"
                  style={{
                    background: 'var(--accent-navyblue)'
                  }}
                >
                  <Save className="w-4 h-4" />
                  Save
                </button>
              </div>
            </form>
          </div>
        </div >
      </div >
    );
  };

  const renderDeleteModal = () => {
    if (!showDeleteModal) return null;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
        <div className="bg-card rounded-lg shadow-xl w-full max-w-md p-6">
          <div className="flex items-center gap-3 mb-4 text-[#A855F7]">
            <Trash2 className="w-6 h-6" />
            <h3 className="text-lg font-bold">Confirm Deletion</h3>
          </div>
          <p className="text-secondary mb-6">
            Are you sure you want to delete this item? This action cannot be undone.
          </p>
          <div className="flex justify-end gap-3">
            <button
              onClick={() => setShowDeleteModal(false)}
              className="px-4 py-2 text-primary bg-card rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={confirmDelete}
              className="px-4 py-2 !text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-main">
      {/* Toast Notifications */}
      <div className="fixed top-4 right-4 z-[10000] space-y-2">
        {notifications.map(notification => (
          <ToastNotificationComponent
            key={notification.id}
            notification={notification}
            onClose={removeNotification}
          />
        ))}
      </div>

      {/* Header */}
      <div className='p-5'>
        <div className="bg-card border-b border-theme">
          <div className="px-6 py-4">
            <h1 className="text-3xl font-bold" style={{ background: 'var(--accent-navyblue)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Accounts & Setup</h1>
            <p className="text-sm text-secondary mt-1">Backend control panel for the entire accounting system</p>
          </div>

          {/* Tabs */}
          <div className="px-6">
            <div className="flex gap-1 border-b border-theme overflow-x-auto">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === tab.id
                    ? 'border-[var(--accent-blue)] text-[#016ab2]'
                    : 'border-transparent text-secondary hover:text-primary hover:border-theme'
                    }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
      {/* Content */}
      <div className="p-6">
        <div className="bg-card rounded-lg shadow">
          {/* Toolbar */}
          <div className="p-4 border-b border-theme flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="relative flex-1 sm:flex-none">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-secondary w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-theme rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full sm:w-64"
                />
              </div>
              <button className="p-2 border border-theme rounded-lg hover:bg-[rgba(255,255,255,0.03)] transition-colors">
                <Filter className="w-4 h-4 text-secondary" />
              </button>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button onClick={handleExport} className="flex-1 sm:flex-none px-4 py-2 text-sm border border-theme rounded-lg hover:bg-[rgba(255,255,255,0.03)] transition-colors flex items-center justify-center gap-2">
                <Download className="w-4 h-4" />
                Export
              </button>
              {activeTab !== 'sms-billing' && (
                <button onClick={handleAdd} className="flex-1 sm:flex-none px-4 py-2 text-sm !text-white rounded-lg transition-all flex items-center justify-center gap-2 hover:shadow-lg hover:scale-105 transform duration-200" style={{ background: 'var(--accent-navyblue)' }}>
                  < Plus className="w-4 h-4" />
                  Add New
                </button>
              )}
            </div>
          </div>

          {/* Chart of Accounts */}
          {activeTab === 'chart-of-accounts' && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-card border-b border-theme">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-headings uppercase tracking-wider">Account Number</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-headings uppercase tracking-wider">Account Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-headings uppercase tracking-wider">Account Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-headings uppercase tracking-wider">Balance</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-headings uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-card divide-theme">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-secondary">Loading...</td>
                    </tr>
                  ) : filteredData().length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-secondary">No accounts found</td>
                    </tr>
                  ) : (
                    (filteredData() as ChartOfAccount[]).map(account => (
                      <tr
                        key={account._id || account.id}
                        className="hover:bg-[rgba(255,255,255,0.03)] cursor-pointer transition-colors"
                        onClick={() => {
                          setSelectedItem(account);
                          setSelectedItemType('chart-of-accounts');
                          setShowDetailModal(true);
                        }}
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-primary">{account.number}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-primary">{account.name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${account.type === 'Asset' ? 'bg-green-100 text-green-800' :
                            account.type === 'Liability' ? 'bg-red-100 text-red-800' :
                              account.type === 'Equity' ? 'bg-blue-100 text-blue-800' :
                                account.type === 'Revenue' ? 'bg-purple-100 text-purple-800' :
                                  'bg-orange-100 text-orange-800'
                            }`}>
                            {account.type}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-primary">${account.balance.toLocaleString()}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center gap-2">
                            <button onClick={() => handleEdit(account)} className="p-1 text-[#00D1FF] hover:bg-blue-50 rounded">
                              <Edit className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleDelete(account._id || account.id?.toString() || '')} className="p-1 text-[#A855F7] hover:bg-red-50 rounded">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Tax Code Setup */}
          {activeTab === 'tax-codes' && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-card border-b border-theme">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-headings uppercase tracking-wider">Tax Code</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-headings uppercase tracking-wider">Description</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-headings uppercase tracking-wider">Rate (%)</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-headings uppercase tracking-wider">Category</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-headings uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-card  divide-theme">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-secondary">Loading...</td>
                    </tr>
                  ) : filteredData().length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-secondary">No tax codes found</td>
                    </tr>
                  ) : (
                    (filteredData() as AccountTaxCode[]).map(tax => (
                      <tr
                        key={tax._id || tax.id}
                        className="hover:bg-[rgba(255,255,255,0.03)] cursor-pointer transition-colors"
                        onClick={() => {
                          setSelectedItem(tax);
                          setSelectedItemType('tax-codes');
                          setShowDetailModal(true);
                        }}
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-primary">{tax.code}</td>
                        <td className="px-6 py-4 text-sm text-primary">{tax.description}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-primary">{tax.rate}%</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${tax.category === 'IFTA' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                            }`}>
                            {tax.category}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center gap-2">
                            <button onClick={() => handleEdit(tax)} className="p-1 text-[#00D1FF] hover:bg-blue-50 rounded">
                              <Edit className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleDelete(tax._id || tax.id?.toString() || '')} className="p-1 text-[#A855F7] hover:bg-red-50 rounded">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Payment Methods */}
          {activeTab === 'payment-methods' && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-card border-b border-theme">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">Payment Method</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">Description</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">Preferred For</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-card  divide-theme">
                  {loading ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-center text-secondary">Loading...</td>
                    </tr>
                  ) : filteredData().length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-center text-secondary">No payment methods found</td>
                    </tr>
                  ) : (
                    (filteredData() as PaymentMethod[]).map(method => (
                      <tr
                        key={method._id || method.id}
                        className="hover:bg-[rgba(255,255,255,0.03)] cursor-pointer transition-colors"
                        onClick={() => {
                          setSelectedItem(method);
                          setSelectedItemType('payment-methods');
                          setShowDetailModal(true);
                        }}
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-primary">{method.method}</td>
                        <td className="px-6 py-4 text-sm text-primary">{method.description}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-medium">
                            {method.preferred}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center gap-2">
                            <button onClick={() => handleEdit(method)} className="p-1 text-[#00D1FF] hover:bg-blue-50 rounded">
                              <Edit className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleDelete(method._id || method.id?.toString() || '')} className="p-1 text-[#A855F7] hover:bg-red-50 rounded">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}


        </div>
      </div>

      {renderModal()}
      {renderDeleteModal()}

      {/* Detail View Modal */}
      {
        showDetailModal && selectedItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-card rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-card border-b border-theme px-6 py-4 flex items-center justify-between">
                <h2 className="text-2xl font-bold text-primary">
                  {selectedItemType === 'chart-of-accounts' && 'Account Details'}
                  {selectedItemType === 'tax-codes' && 'Tax Code Details'}
                  {selectedItemType === 'payment-methods' && 'Payment Method Details'}
                </h2>
                <button
                  onClick={() => {
                    setShowDetailModal(false);
                    setSelectedItem(null);
                    setSelectedItemType(null);
                  }}
                  className="text-secondary hover:text-secondary transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="p-6">
                {/* Chart of Accounts Details */}
                {selectedItemType === 'chart-of-accounts' && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="bg-card p-4 rounded-lg border border-blue-200">
                        <label className="text-sm font-medium text-blue-900 mb-1 block">Account Number</label>
                        <p className="text-xl font-semibold text-blue-700">{(selectedItem as ChartOfAccount).number}</p>
                      </div>
                      <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                        <label className="text-sm font-medium text-green-900 mb-1 block">Account Name</label>
                        <p className="text-xl font-semibold text-green-700">{(selectedItem as ChartOfAccount).name}</p>
                      </div>
                    </div>

                    <div className="bg-card p-4 rounded-lg border border-purple-200">
                      <label className="text-sm font-medium text-purple-900 mb-2 block">Account Type</label>
                      <span className={`inline-block px-4 py-2 rounded-full text-sm font-semibold border-2 ${(selectedItem as ChartOfAccount).type === 'Asset' ? 'bg-green-100 text-green-800 border-green-300' :
                        (selectedItem as ChartOfAccount).type === 'Liability' ? 'bg-red-100 text-red-800 border-red-300' :
                          (selectedItem as ChartOfAccount).type === 'Equity' ? 'bg-blue-100 text-blue-800 border-blue-300' :
                            (selectedItem as ChartOfAccount).type === 'Revenue' ? 'bg-purple-100 text-purple-800 border-purple-300' :
                              'bg-orange-100 text-orange-800 border-orange-300'
                        }`}>
                        {(selectedItem as ChartOfAccount).type}
                      </span>
                    </div>

                    <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-200">
                      <label className="text-sm font-medium text-indigo-900 mb-1 block">Current Balance</label>
                      <p className="text-3xl font-bold text-indigo-700">
                        ${(selectedItem as ChartOfAccount).balance.toLocaleString()}
                      </p>
                    </div>
                  </div>
                )}

                {/* Tax Code Details */}
                {selectedItemType === 'tax-codes' && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="bg-card p-4 rounded-lg border border-blue-200">
                        <label className="text-sm font-medium text-blue-900 mb-1 block">Tax Code</label>
                        <p className="text-xl font-semibold text-blue-700">{(selectedItem as AccountTaxCode).code}</p>
                      </div>
                      <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                        <label className="text-sm font-medium text-green-900 mb-1 block">Tax Rate</label>
                        <p className="text-3xl font-bold text-green-700">{(selectedItem as AccountTaxCode).rate}%</p>
                      </div>
                    </div>

                    <div className="bg-card p-4 rounded-lg border border-theme">
                      <label className="text-sm font-medium text-primary mb-1 block">Description</label>
                      <p className="text-primary">{(selectedItem as AccountTaxCode).description}</p>
                    </div>

                    <div className="bg-card p-4 rounded-lg border border-purple-200">
                      <label className="text-sm font-medium text-purple-900 mb-2 block">Category</label>
                      <span className={`inline-block px-4 py-2 rounded-full text-sm font-semibold border-2 ${(selectedItem as AccountTaxCode).category === 'IFTA'
                        ? 'bg-blue-100 text-blue-800 border-blue-300'
                        : (selectedItem as AccountTaxCode).category === 'Sales Tax'
                          ? 'bg-green-100 text-green-800 border-green-300'
                          : 'bg-yellow-100 text-yellow-800 border-yellow-300'
                        }`}>
                        {(selectedItem as AccountTaxCode).category}
                      </span>
                    </div>
                  </div>
                )}

                {/* Payment Method Details */}
                {selectedItemType === 'payment-methods' && (
                  <div className="space-y-6">
                    <div className="bg-card p-4 rounded-lg border border-blue-200">
                      <label className="text-sm font-medium text-blue-900 mb-1 block">Payment Method</label>
                      <p className="text-2xl font-semibold text-blue-700">{(selectedItem as PaymentMethod).method}</p>
                    </div>

                    <div className="bg-card p-4 rounded-lg border border-theme">
                      <label className="text-sm font-medium text-primary mb-1 block">Description</label>
                      <p className="text-primary whitespace-pre-wrap">{(selectedItem as PaymentMethod).description}</p>
                    </div>

                    <div className="bg-card p-4 rounded-lg border border-purple-200">
                      <label className="text-sm font-medium text-purple-900 mb-2 block">Preferred For</label>
                      <span className="inline-block px-4 py-2 bg-purple-100 text-purple-800 rounded-full text-sm font-semibold border-2 border-purple-300">
                        {(selectedItem as PaymentMethod).preferred}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <div className="sticky bottom-0 bg-card border-t border-theme px-6 py-4">
                <button
                  onClick={() => {
                    setShowDetailModal(false);
                    setSelectedItem(null);
                    setSelectedItemType(null);
                  }}
                  className="w-full px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 !text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )
      }
    </div >
  );
}
