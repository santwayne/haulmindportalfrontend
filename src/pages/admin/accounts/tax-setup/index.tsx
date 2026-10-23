import React, { useState, useEffect } from 'react';
import { Settings, RefreshCw, MapPin, Calculator, DollarSign, FileText, Plus, Edit2, Trash2, Save, X } from 'lucide-react';
import { FaCheckCircle, FaExclamationCircle, FaInfoCircle, FaTimes } from 'react-icons/fa';
import {
  getIftaRates,
  createIftaRate,
  updateIftaRate,
  deleteIftaRate,
  getSalesTaxRules,
  createSalesTaxRule,
  updateSalesTaxRule,
  deleteSalesTaxRule,
  getPayrollTaxFormulas,
  createPayrollTaxFormula,
  updatePayrollTaxFormula,
  deletePayrollTaxFormula,
  getVendorTaxes,
  createVendorTax,
  updateVendorTax,
  deleteVendorTax,
  type IftaRate,
  type SalesTaxRule,
  type PayrollTaxFormula,
  type VendorTax
} from '../../../../axios/api/account.taxSetup';

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
      <p className="flex-1 text-sm font-medium text-headings">{notification.message}</p>
      <button
        onClick={() => onClose(notification.id)}
        className="flex-shrink-0 text-headings hover:text-secondary transition-colors"
      >
        <FaTimes size={16} />
      </button>
    </div>
  );
};

type TabType = 'ifta' | 'sales' | 'payroll' | 'vendor';

export default function TaxConfigurationPage() {
  const [activeTab, setActiveTab] = useState<TabType>('ifta');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ id: string; type: TabType } | null>(null);
  const [notifications, setNotifications] = useState<ToastNotification[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  // Detail modal states
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<IftaRate | SalesTaxRule | PayrollTaxFormula | VendorTax | null>(null);
  const [selectedItemType, setSelectedItemType] = useState<TabType | null>(null);

  // Data states
  const [iftaRates, setIftaRates] = useState<IftaRate[]>([]);
  const [salesTaxRules, setSalesTaxRules] = useState<SalesTaxRule[]>([]);
  const [payrollFormulas, setPayrollFormulas] = useState<PayrollTaxFormula[]>([]);
  const [vendorTaxes, setVendorTaxes] = useState<VendorTax[]>([]);

  // Form states
  const [iftaFormData, setIftaFormData] = useState({
    jurisdiction: '',
    rate: '',
    effectiveDate: ''
  });

  const [salesFormData, setSalesFormData] = useState({
    name: '',
    type: 'Destination' as 'Origin' | 'Destination',
    qbSync: false
  });

  const [payrollFormData, setPayrollFormData] = useState({
    bracket: '',
    rate: '',
    classification: 'Employee' as 'Employee' | 'Owner-Operator'
  });

  const [vendorFormData, setVendorFormData] = useState({
    taxName: '',
    rate: '',
    payableAccount: '',
    expenseAccount: ''
  });

  // Toast notification helpers
  const showNotification = (type: 'success' | 'error' | 'info' | 'warning', message: string) => {
    const id = Date.now();
    setNotifications((prev: ToastNotification[]) => [...prev, { id, type, message }]);
  };

  const removeNotification = (id: number) => {
    setNotifications((prev: ToastNotification[]) => prev.filter((n: ToastNotification) => n.id !== id));
  };



  // Fetch data functions
  const fetchIftaRates = async () => {
    setLoading(true);
    try {
      const response = await getIftaRates({ search: searchTerm || undefined });
      if (response?.success && Array.isArray(response.data)) {
        setIftaRates(response.data.map((item: any) => ({
          ...item,
          effectiveDate: item.effectiveDate ? new Date(item.effectiveDate).toISOString().split('T')[0] : ''
        })));
      } else {
        showNotification('error', response?.message || 'Failed to fetch IFTA rates');
      }
    } catch (error: any) {
      console.error('Error fetching IFTA rates:', error);
      showNotification('error', error?.response?.data?.message || 'An error occurred while fetching IFTA rates');
    } finally {
      setLoading(false);
    }
  };

  const fetchSalesTaxRules = async () => {
    setLoading(true);
    try {
      const response = await getSalesTaxRules({ search: searchTerm || undefined });
      if (response?.success && Array.isArray(response.data)) {
        setSalesTaxRules(response.data);
      } else {
        showNotification('error', response?.message || 'Failed to fetch sales tax rules');
      }
    } catch (error: any) {
      console.error('Error fetching sales tax rules:', error);
      showNotification('error', error?.response?.data?.message || 'An error occurred while fetching sales tax rules');
    } finally {
      setLoading(false);
    }
  };

  const fetchPayrollFormulas = async () => {
    setLoading(true);
    try {
      const response = await getPayrollTaxFormulas({ search: searchTerm || undefined });
      if (response?.success && Array.isArray(response.data)) {
        setPayrollFormulas(response.data);
      } else {
        showNotification('error', response?.message || 'Failed to fetch payroll tax formulas');
      }
    } catch (error: any) {
      console.error('Error fetching payroll tax formulas:', error);
      showNotification('error', error?.response?.data?.message || 'An error occurred while fetching payroll tax formulas');
    } finally {
      setLoading(false);
    }
  };

  const fetchVendorTaxes = async () => {
    setLoading(true);
    try {
      const response = await getVendorTaxes({ search: searchTerm || undefined });
      if (response?.success && Array.isArray(response.data)) {
        setVendorTaxes(response.data);
      } else {
        showNotification('error', response?.message || 'Failed to fetch vendor taxes');
      }
    } catch (error: any) {
      console.error('Error fetching vendor taxes:', error);
      showNotification('error', error?.response?.data?.message || 'An error occurred while fetching vendor taxes');
    } finally {
      setLoading(false);
    }
  };

  // Load data on mount and tab change
  useEffect(() => {
    if (activeTab === 'ifta') {
      fetchIftaRates();
    } else if (activeTab === 'sales') {
      fetchSalesTaxRules();
    } else if (activeTab === 'payroll') {
      fetchPayrollFormulas();
    } else if (activeTab === 'vendor') {
      fetchVendorTaxes();
    }
  }, [activeTab, searchTerm]);

  // Handle form submissions
  const handleIftaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data = {
        jurisdiction: iftaFormData.jurisdiction,
        rate: iftaFormData.rate,
        effectiveDate: iftaFormData.effectiveDate
      };

      const response = editingItem?._id
        ? await updateIftaRate(editingItem._id, data)
        : await createIftaRate(data);

      if (response?.success) {
        setShowAddModal(false);
        resetIftaForm();
        await fetchIftaRates();
        showNotification('success', editingItem?._id ? 'IFTA rate updated successfully' : 'IFTA rate created successfully');
      } else {
        showNotification('error', response?.message || 'Failed to save IFTA rate');
      }
    } catch (error: any) {
      console.error('Error saving IFTA rate:', error);
      showNotification('error', error?.response?.data?.message || 'An error occurred while saving IFTA rate');
    }
  };

  const handleSalesSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data = {
        name: salesFormData.name,
        type: salesFormData.type,
        qbSync: salesFormData.qbSync
      };

      const response = editingItem?._id
        ? await updateSalesTaxRule(editingItem._id, data)
        : await createSalesTaxRule(data);

      if (response?.success) {
        setShowAddModal(false);
        resetSalesForm();
        await fetchSalesTaxRules();
        showNotification('success', editingItem?._id ? 'Sales tax rule updated successfully' : 'Sales tax rule created successfully');
      } else {
        showNotification('error', response?.message || 'Failed to save sales tax rule');
      }
    } catch (error: any) {
      console.error('Error saving sales tax rule:', error);
      showNotification('error', error?.response?.data?.message || 'An error occurred while saving sales tax rule');
    }
  };

  const handlePayrollSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data = {
        bracket: payrollFormData.bracket,
        rate: payrollFormData.rate,
        classification: payrollFormData.classification
      };

      const response = editingItem?._id
        ? await updatePayrollTaxFormula(editingItem._id, data)
        : await createPayrollTaxFormula(data);

      if (response?.success) {
        setShowAddModal(false);
        resetPayrollForm();
        await fetchPayrollFormulas();
        showNotification('success', editingItem?._id ? 'Payroll tax formula updated successfully' : 'Payroll tax formula created successfully');
      } else {
        showNotification('error', response?.message || 'Failed to save payroll tax formula');
      }
    } catch (error: any) {
      console.error('Error saving payroll tax formula:', error);
      showNotification('error', error?.response?.data?.message || 'An error occurred while saving payroll tax formula');
    }
  };

  const handleVendorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data = {
        taxName: vendorFormData.taxName,
        rate: vendorFormData.rate,
        payableAccount: vendorFormData.payableAccount,
        expenseAccount: vendorFormData.expenseAccount
      };

      const response = editingItem?._id
        ? await updateVendorTax(editingItem._id, data)
        : await createVendorTax(data);

      if (response?.success) {
        setShowAddModal(false);
        resetVendorForm();
        await fetchVendorTaxes();
        showNotification('success', editingItem?._id ? 'Vendor tax updated successfully' : 'Vendor tax created successfully');
      } else {
        showNotification('error', response?.message || 'Failed to save vendor tax');
      }
    } catch (error: any) {
      console.error('Error saving vendor tax:', error);
      showNotification('error', error?.response?.data?.message || 'An error occurred while saving vendor tax');
    }
  };

  // Reset form functions
  const resetIftaForm = () => {
    setIftaFormData({ jurisdiction: '', rate: '', effectiveDate: '' });
    setEditingItem(null);
  };

  const resetSalesForm = () => {
    setSalesFormData({ name: '', type: 'Destination', qbSync: false });
    setEditingItem(null);
  };

  const resetPayrollForm = () => {
    setPayrollFormData({ bracket: '', rate: '', classification: 'Employee' });
    setEditingItem(null);
  };

  const resetVendorForm = () => {
    setVendorFormData({ taxName: '', rate: '', payableAccount: '', expenseAccount: '' });
    setEditingItem(null);
  };

  // Handlers
  const handleAddNew = () => {
    resetIftaForm();
    resetSalesForm();
    resetPayrollForm();
    resetVendorForm();
    setShowAddModal(true);
    setEditingItem(null);
  };

  const handleEdit = (item: any) => {
    setEditingItem(item);
    if (activeTab === 'ifta') {
      setIftaFormData({
        jurisdiction: item.jurisdiction || '',
        rate: item.rate || '',
        effectiveDate: item.effectiveDate ? new Date(item.effectiveDate).toISOString().split('T')[0] : ''
      });
    } else if (activeTab === 'sales') {
      setSalesFormData({
        name: item.name || '',
        type: item.type || 'Destination',
        qbSync: item.qbSync || false
      });
    } else if (activeTab === 'payroll') {
      setPayrollFormData({
        bracket: item.bracket || '',
        rate: item.rate || '',
        classification: item.classification || 'Employee'
      });
    } else if (activeTab === 'vendor') {
      setVendorFormData({
        taxName: item.taxName || '',
        rate: item.rate || '',
        payableAccount: item.payableAccount || '',
        expenseAccount: item.expenseAccount || ''
      });
    }
    setShowAddModal(true);
  };

  const handleDelete = (id: string) => {
    setItemToDelete({ id, type: activeTab });
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;

    try {
      let response;
      if (itemToDelete.type === 'ifta') {
        response = await deleteIftaRate(itemToDelete.id);
        if (response?.success) {
          await fetchIftaRates();
          showNotification('success', 'IFTA rate deleted successfully');
        }
      } else if (itemToDelete.type === 'sales') {
        response = await deleteSalesTaxRule(itemToDelete.id);
        if (response?.success) {
          await fetchSalesTaxRules();
          showNotification('success', 'Sales tax rule deleted successfully');
        }
      } else if (itemToDelete.type === 'payroll') {
        response = await deletePayrollTaxFormula(itemToDelete.id);
        if (response?.success) {
          await fetchPayrollFormulas();
          showNotification('success', 'Payroll tax formula deleted successfully');
        }
      } else if (itemToDelete.type === 'vendor') {
        response = await deleteVendorTax(itemToDelete.id);
        if (response?.success) {
          await fetchVendorTaxes();
          showNotification('success', 'Vendor tax deleted successfully');
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

  const handleAutoUpdate = () => {
    showNotification('info', 'Fetching latest tax rates from external source...');
    // TODO: Implement auto-update functionality
  };

  const renderTable = () => {
    switch (activeTab) {
      case 'ifta':
        return (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className=" border-b-2 border-theme">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-headings">Jurisdiction (State/Province)</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-headings">Fuel Tax Rate (per gallon/liter)</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-headings">Effective Date</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-headings">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-slate-500">Loading...</td>
                  </tr>
                ) : iftaRates.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-slate-500">No IFTA rates found</td>
                  </tr>
                ) : (
                  iftaRates.map((item) => (
                    <tr
                      key={item._id || item.id}
                      className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors"
                      onClick={() => {
                        setSelectedItem(item);
                        setSelectedItemType('ifta');
                        setShowDetailModal(true);
                      }}
                    >
                      <td className="px-4 py-3 text-sm text-headings">{item.jurisdiction}</td>
                      <td className="px-4 py-3 text-sm text-headings">${item.rate}</td>
                      <td className="px-4 py-3 text-sm text-headings">{item.effectiveDate}</td>
                      <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => handleEdit(item)} className="text-[#00D1FF] !mr-3 hover:text-blue-800 mr-3">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(item._id || item.id?.toString() || '')} className="text-[#A855F7] hover:text-red-800">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        );

      case 'sales':
        return (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-card border border-theme">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-headings">Rule Name</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-headings">Tax Type (Origin vs. Destination)</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-headings">QuickBooks Sync</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-headings">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-slate-500">Loading...</td>
                  </tr>
                ) : salesTaxRules.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-slate-500">No sales tax rules found</td>
                  </tr>
                ) : (
                  salesTaxRules.map((item) => (
                    <tr
                      key={item._id || item.id}
                      className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors"
                      onClick={() => {
                        setSelectedItem(item);
                        setSelectedItemType('sales');
                        setShowDetailModal(true);
                      }}
                    >
                      <td className="px-4 py-3 text-sm text-headings">{item.name}</td>
                      <td className="px-4 py-3 text-sm text-headings">{item.type}</td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`px-2 py-1 rounded-full text-xs ${item.qbSync ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {item.qbSync ? 'Enabled' : 'Disabled'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => handleEdit(item)} className="text-[#00D1FF] !mr-3 hover:text-blue-800 mr-3">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(item._id || item.id?.toString() || '')} className="text-[#A855F7] hover:text-red-800">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        );

      case 'payroll':
        return (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-card border border-theme">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-headings">Income Tax Bracket</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-headings">Tax Rate</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-headings">Classification</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-headings">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-slate-500">Loading...</td>
                  </tr>
                ) : payrollFormulas.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-slate-500">No payroll tax formulas found</td>
                  </tr>
                ) : (
                  payrollFormulas.map((item) => (
                    <tr
                      key={item._id || item.id}
                      className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors"
                      onClick={() => {
                        setSelectedItem(item);
                        setSelectedItemType('payroll');
                        setShowDetailModal(true);
                      }}
                    >
                      <td className="px-4 py-3 text-sm text-headings">{item.bracket}</td>
                      <td className="px-4 py-3 text-sm text-headings">{item.rate}</td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`px-2 py-1 rounded-full text-xs ${item.classification === 'Employee' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                          {item.classification}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => handleEdit(item)} className="text-[#00D1FF] !mr-3 hover:text-blue-800 mr-3">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(item._id || item.id?.toString() || '')} className="text-[#A855F7] hover:text-red-800">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        );

      case 'vendor':
        return (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-card border border-theme">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-headings">Tax Rate Name</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-headings">Rate</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-headings">Tax Payable Account</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-headings">Tax Expense Account</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-headings">Actions</th>
                </tr>
              </thead>
              <tbody className='divide-y divide-theme divide-white/5'>
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-500">Loading...</td>
                  </tr>
                ) : vendorTaxes.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-500">No vendor taxes found</td>
                  </tr>
                ) : (
                  vendorTaxes.map((item) => (
                    <tr
                      key={item._id || item.id}
                      className="hover:bg-[var(--accent-navyblue)]/20 cursor-pointer transition-colors"
                      onClick={() => {
                        setSelectedItem(item);
                        setSelectedItemType('vendor');
                        setShowDetailModal(true);
                      }}
                    >
                      <td className="px-4 py-3 text-sm text-secondary">{item.taxName}</td>
                      <td className="px-4 py-3 text-sm text-secondary">{item.rate}</td>
                      <td className="px-4 py-3 text-sm text-secondary">{item.payableAccount}</td>
                      <td className="px-4 py-3 text-sm text-secondary">{item.expenseAccount}</td>
                      <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => handleEdit(item)} className="text-[var(--accent-blue)] !mr-3  mr-3 hover:bg-[var(--accent-blue)]/20">
                          <Edit2 className="w-4 h-4 text-[var(--accent-blue)] " />
                        </button>
                        <button onClick={() => handleDelete(item._id || item.id?.toString() || '')} className="text-[#A855F7] hover:text-red-800">
                          <Trash2 className="w-4 h-4 text-[var(--accent-red)]" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        );
    }
  };

  const getTabInfo = () => {
    const info: Record<TabType, { title: string; description: string; icon: React.ReactElement }> = {
      ifta: {
        title: 'IFTA Rate Tables',
        description: 'Manages state/province-specific fuel tax rates',
        icon: <FileText className="w-5 h-5" />
      },
      sales: {
        title: 'Sales Tax Jurisdiction Setup',
        description: 'Defines interprovincial/interstate tax handling',
        icon: <MapPin className="w-5 h-5" />
      },
      payroll: {
        title: 'Payroll Tax Formulas',
        description: 'Manages formulas for employee tax deductions',
        icon: <Calculator className="w-5 h-5" />
      },
      vendor: {
        title: 'Vendor Tax Categories',
        description: 'Maps vendor taxes to expense accounts',
        icon: <DollarSign className="w-5 h-5" />
      }
    };
    return info[activeTab];
  };

  const tabInfo = getTabInfo();

  return (
    <div className="min-h-screen bg-main p-4 text-headings">
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

      <div className="w-full mx-auto p-2">
        {/* Header */}
        <div className="bg-card rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg" style={{ background: 'var(--accent-navyblue)' }}>
                < Settings className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold" style={{ background: 'var(--accent-navyblue)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Tax Configuration Management</h1>
                <p className="text-slate-600 text-sm mt-1">Add, edit, and manage tax settings across all components</p>
              </div>
            </div>
            {activeTab === 'ifta' && (
              <button onClick={handleAutoUpdate} className="flex items-center gap-2 bg-green-600 !text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors">
                <RefreshCw className="w-4 h-4" />
                Auto-Update from Source
              </button>
            )}
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-card rounded-lg shadow-sm mb-6 overflow-hidden">
          <div className="flex border-b border-slate-200 ">
            <button onClick={() => setActiveTab('ifta')} className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors flex-1 ${activeTab === 'ifta' ? 'text-[#016ab2] border-b-2 border-[var(--accent-blue)] bg-card' : 'text-slate-600 hover:bg-[var(--accent-navyblue)]/20'}`}>
              <FileText className="w-5 h-5" />
              <span className="hidden sm:inline">IFTA Rates</span>
            </button>
            <button onClick={() => setActiveTab('sales')} className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors flex-1 ${activeTab === 'sales' ? 'text-[#016ab2] border-b-2 border-[var(--accent-blue)] bg-card' : 'text-slate-600 hover:bg-[var(--accent-navyblue)]/20'}`}>
              <MapPin className="w-5 h-5" />
              <span className="hidden sm:inline">Sales Tax</span>
            </button>
            <button onClick={() => setActiveTab('payroll')} className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors flex-1 ${activeTab === 'payroll' ? 'text-[#016ab2] border-b-2 border-[var(--accent-blue)] bg-card' : 'text-slate-600 hover:bg-[var(--accent-navyblue)]/20'}`}>
              <Calculator className="w-5 h-5" />
              <span className="hidden sm:inline">Payroll</span>
            </button>
            <button onClick={() => setActiveTab('vendor')} className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors flex-1 ${activeTab === 'vendor' ? 'text-[#016ab2] border-b-2 border-[var(--accent-blue)] bg-card' : 'text-slate-600 hover:bg-[var(--accent-navyblue)]/20'}`}>
              <DollarSign className="w-5 h-5" />
              <span className="hidden sm:inline">Vendor Tax</span>
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="bg-card rounded-lg shadow-sm p-6 ">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3 text-secondary">
              {tabInfo.icon}
              <div>
                <h2 className="text-xl font-bold text-headings">{tabInfo.title}</h2>
                <p className="text-slate-600 text-sm">{tabInfo.description}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="text"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button onClick={handleAddNew} className="flex items-center gap-2 !text-white px-4 py-2 rounded-lg hover:shadow-lg hover:scale-105 transform duration-200 transition-all" style={{
                background: 'var(--accent-navyblue)'
              }}>
                < Plus className="w-4 h-4" />
                Add New
              </button>
            </div>
          </div>

          {renderTable()}
        </div>

        {/* Add/Edit Modal */}
        {
          showAddModal && (
            <div className="fixed inset-0 flex items-center justify-center z-50">
              <div className="bg-card rounded-lg shadow-xl p-6 w-full max-w-md">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-headings">
                    {editingItem ? 'Edit Entry' : 'Add New Entry'}
                  </h3>
                  <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <form onSubmit={activeTab === 'ifta' ? handleIftaSubmit : activeTab === 'sales' ? handleSalesSubmit : activeTab === 'payroll' ? handlePayrollSubmit : handleVendorSubmit} className="space-y-4">
                  {activeTab === 'ifta' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-headings mb-1">Jurisdiction (State/Province)</label>
                        <input
                          type="text"
                          value={iftaFormData.jurisdiction}
                          onChange={(e) => setIftaFormData({ ...iftaFormData, jurisdiction: e.target.value })}
                          className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Jurisdiction"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-headings mb-1">Fuel Tax Rate (per gallon/liter)</label>
                        <input
                          type="text"
                          value={iftaFormData.rate}
                          onChange={(e) => setIftaFormData({ ...iftaFormData, rate: e.target.value })}
                          className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Tax Rate"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-headings mb-1">Effective Date</label>
                        <input
                          type="date"
                          value={iftaFormData.effectiveDate}
                          onChange={(e) => setIftaFormData({ ...iftaFormData, effectiveDate: e.target.value })}
                          className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          required
                          style={{ colorScheme: 'dark' }}
                        />
                      </div>
                    </>
                  )}

                  {activeTab === 'sales' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-headings mb-1">Rule Name</label>
                        <input
                          type="text"
                          value={salesFormData.name}
                          onChange={(e) => setSalesFormData({ ...salesFormData, name: e.target.value })}
                          className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Rule Name"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-headings mb-1">Tax Type (Origin vs. Destination)</label>
                        <select
                          value={salesFormData.type}
                          onChange={(e) => setSalesFormData({ ...salesFormData, type: e.target.value as 'Origin' | 'Destination' })}
                          className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          required
                        >
                          <option className='form-option' value="Destination">Destination</option>
                          <option className='form-option' value="Origin">Origin</option>
                        </select>
                      </div>
                      <div>
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={salesFormData.qbSync}
                            onChange={(e) => setSalesFormData({ ...salesFormData, qbSync: e.target.checked })}
                            className="w-4 h-4 text-[#00D1FF] border-slate-300 rounded focus:ring-blue-500"
                          />
                          <span className="text-sm font-medium text-headings">QuickBooks Sync</span>
                        </label>
                      </div>
                    </>
                  )}

                  {activeTab === 'payroll' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-headings mb-1">Income Tax Bracket</label>
                        <input
                          type="text"
                          value={payrollFormData.bracket}
                          onChange={(e) => setPayrollFormData({ ...payrollFormData, bracket: e.target.value })}
                          className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Income Tax Bracket"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-headings mb-1">Tax Rate</label>
                        <input
                          type="text"
                          value={payrollFormData.rate}
                          onChange={(e) => setPayrollFormData({ ...payrollFormData, rate: e.target.value })}
                          className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Tax Rate"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-headings mb-1">Classification</label>
                        <select
                          value={payrollFormData.classification}
                          onChange={(e) => setPayrollFormData({ ...payrollFormData, classification: e.target.value as 'Employee' | 'Owner-Operator' })}
                          className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          required
                        >
                          <option className='form-option' value="Employee">Employee</option>
                          <option className='form-option' value="Owner-Operator">Owner-Operator</option>
                        </select>
                      </div>
                    </>
                  )}

                  {activeTab === 'vendor' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-headings mb-1">Tax Rate Name</label>
                        <input
                          type="text"
                          value={vendorFormData.taxName}
                          onChange={(e) => setVendorFormData({ ...vendorFormData, taxName: e.target.value })}
                          className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-secondary"
                          placeholder="Tax Rate Name"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-headings mb-1">Rate</label>
                        <input
                          type="text"
                          value={vendorFormData.rate}
                          onChange={(e) => setVendorFormData({ ...vendorFormData, rate: e.target.value })}
                          className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-secondary"
                          placeholder="Rate"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-headings mb-1">Tax Payable Account</label>
                        <input
                          type="text"
                          value={vendorFormData.payableAccount}
                          onChange={(e) => setVendorFormData({ ...vendorFormData, payableAccount: e.target.value })}
                          className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-secondary"
                          placeholder="Tax Payable Account"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-headings mb-1">Tax Expense Account</label>
                        <input
                          type="text"
                          value={vendorFormData.expenseAccount}
                          onChange={(e) => setVendorFormData({ ...vendorFormData, expenseAccount: e.target.value })}
                          className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-secondary"
                          placeholder="Tax Expense Account"
                          required
                        />
                      </div>
                    </>
                  )}

                  <div className="flex gap-3 mt-6">
                    <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 px-4 py-2 border border-theme rounded-lg hover:bg-[var(--accent-navyblue)]/20 ">
                      Cancel
                    </button>
                    <button type="submit"
                      style={{
                        background: 'var(--accent-navyblue)'
                      }}
                      className="flex-1  !text-white px-4 py-2 rounded-lg ">
                      <Save className="w-4 h-4 inline mr-2" />
                      Save
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )
        }

      </div >

      {/* Delete Confirmation Modal */}
      {
        showDeleteModal && (
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
                  style={{
                    boxShadow: '0 4px 6px -1px rgba(220, 38, 38, 0.3)'
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )
      }

      {/* Detail View Modal */}
      {
        showDetailModal && selectedItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-card rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-card border-b border-theme px-6 py-4 flex items-center justify-between">
                <h2 className="text-2xl font-bold text-primary">
                  {selectedItemType === 'ifta' && 'IFTA Rate Details'}
                  {selectedItemType === 'sales' && 'Sales Tax Rule Details'}
                  {selectedItemType === 'payroll' && 'Payroll Tax Formula Details'}
                  {selectedItemType === 'vendor' && 'Vendor Tax Details'}
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

              <div className="p-6 ">
                {/* IFTA Rate Details */}
                {selectedItemType === 'ifta' && (
                  <div className="space-y-6">
                    <div className="bg-card p-4 rounded-lg  ">
                      <label className="text-sm font-medium text-blue-900 mb-1 block">Jurisdiction (State/Province)</label>
                      <p className="text-2xl font-semibold text-blue-700">{(selectedItem as IftaRate).jurisdiction}</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className=" p-4 rounded-lg border border-green-200">
                        <label className="text-sm font-medium text-green-900 mb-1 block">Fuel Tax Rate</label>
                        <p className="text-3xl font-bold text-green-700">${(selectedItem as IftaRate).rate}/gal</p>
                      </div>
                      <div className="bg-card p-4 rounded-lg  ">
                        <label className="text-sm font-medium text-purple-900 mb-1 block">Effective Date</label>
                        <p className="text-xl font-semibold text-purple-700">{(selectedItem as IftaRate).effectiveDate}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Sales Tax Rule Details */}
                {selectedItemType === 'sales' && (
                  <div className="space-y-6">
                    <div className="bg-card p-4 rounded-lg border border-blue-200">
                      <label className="text-sm font-medium text-blue-900 mb-1 block">Rule Name</label>
                      <p className="text-2xl font-semibold text-blue-700">{(selectedItem as SalesTaxRule).name}</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="bg-card p-4 rounded-lg border border-purple-200">
                        <label className="text-sm font-medium text-purple-900 mb-2 block">Tax Type</label>
                        <span className="inline-block px-4 py-2 bg-purple-100 text-purple-800 rounded-full text-sm font-semibold border-2 border-purple-300">
                          {(selectedItem as SalesTaxRule).type}
                        </span>
                      </div>
                      <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                        <label className="text-sm font-medium text-green-900 mb-2 block">QuickBooks Sync</label>
                        <span className={`inline-block px-4 py-2 rounded-full text-sm font-semibold border-2 ${(selectedItem as SalesTaxRule).qbSync
                          ? 'bg-green-100 text-green-800 border-green-300'
                          : 'bg-red-100 text-red-800 border-red-300'
                          }`}>
                          {(selectedItem as SalesTaxRule).qbSync ? 'Enabled' : 'Disabled'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Payroll Tax Formula Details */}
                {selectedItemType === 'payroll' && (
                  <div className="space-y-6">
                    <div className="bg-card p-4 rounded-lg border border-blue-200">
                      <label className="text-sm font-medium text-blue-900 mb-1 block">Income Tax Bracket</label>
                      <p className="text-2xl font-semibold text-blue-700">{(selectedItem as PayrollTaxFormula).bracket}</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                        <label className="text-sm font-medium text-green-900 mb-1 block">Tax Rate</label>
                        <p className="text-3xl font-bold text-green-700">{(selectedItem as PayrollTaxFormula).rate}%</p>
                      </div>
                      <div className="bg-card p-4 rounded-lg border border-purple-200">
                        <label className="text-sm font-medium text-purple-900 mb-2 block">Classification</label>
                        <span className={`inline-block px-4 py-2 rounded-full text-sm font-semibold border-2 ${(selectedItem as PayrollTaxFormula).classification === 'Employee'
                          ? 'bg-blue-100 text-blue-800 border-blue-300'
                          : 'bg-purple-100 text-purple-800 border-purple-300'
                          }`}>
                          {(selectedItem as PayrollTaxFormula).classification}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Vendor Tax Details */}
                {selectedItemType === 'vendor' && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="bg-card p-4 rounded-lg border border-blue-200">
                        <label className="text-sm font-medium text-blue-900 mb-1 block">Tax Rate Name</label>
                        <p className="text-xl font-semibold text-blue-700">{(selectedItem as VendorTax).taxName}</p>
                      </div>
                      <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                        <label className="text-sm font-medium text-green-900 mb-1 block">Rate</label>
                        <p className="text-2xl font-bold text-green-700">{(selectedItem as VendorTax).rate}%</p>
                      </div>
                    </div>

                    <div className="bg-card p-4 rounded-lg border border-purple-200">
                      <label className="text-sm font-medium text-purple-900 mb-1 block">Tax Payable Account</label>
                      <p className="text-lg font-semibold text-purple-700">{(selectedItem as VendorTax).payableAccount}</p>
                    </div>

                    <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-200">
                      <label className="text-sm font-medium text-indigo-900 mb-1 block">Tax Expense Account</label>
                      <p className="text-lg font-semibold text-indigo-700">{(selectedItem as VendorTax).expenseAccount}</p>
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
