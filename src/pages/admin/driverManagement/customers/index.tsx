import { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, ChevronUp, ChevronDown, X, HelpCircle, Edit, FileDown } from 'lucide-react';
import ExcelJS from 'exceljs';
import { FaTimes, FaCheckCircle, FaExclamationTriangle } from 'react-icons/fa';
import * as customerApi from '../../../../axios/api/customer';
import ImportButton from '../../../../components/common/ImportButton';
import AddressSearch from '../../../../components/common/AddressSearch';

interface Customer {
  _id?: string;
  name: string;
  type: 'Customer' | 'Shipper-Receiver';
  address: string;
  city: string;
  lastLoadDate?: string;
  status?: string;
  customerDetails?: {
    customerType?: string;
    customerId?: string;
    address?: string;
    emailPrimary?: string;
    phonePrimary?: string;
  };
}

interface ToastNotification {
  id: number;
  type: 'success' | 'error' | 'warning';
  message: string;
}

const ToastNotificationComponent = ({ notification, onClose }: { notification: ToastNotification; onClose: (id: number) => void }) => {
  const icons = {
    success: <FaCheckCircle className="text-[var(--accent-green)]" size={24} />,
    error: <FaExclamationTriangle className="text-[var(--accent-red)]" size={24} />,
    warning: <FaExclamationTriangle className="text-[var(--accent-amber)]" size={24} />
  };

  const bgColors = {
    success: 'bg-[var(--accent-green)]/10 border-[var(--accent-green)]/30',
    error: 'bg-[var(--accent-red)]/10 border-[var(--accent-red)]/30',
    warning: 'bg-[var(--accent-amber)]/10 border-[var(--accent-amber)]/30'
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      onClose(notification.id);
    }, 6000);
    return () => clearTimeout(timer);
  }, [notification.id, onClose]);

  return (
    <div className={`fixed top-4 right-4 flex items-start gap-3 p-4 rounded-lg shadow-lg z-[10003] ${bgColors[notification.type]} min-w-[320px] max-w-[520px] animate-slide-in`}>
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

const CustomersPage = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [customerIdSearch, setCustomerIdSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [typeFilter, setTypeFilter] = useState('All');
  const [sortBy, setSortBy] = useState('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [sortConfig, setSortConfig] = useState<{ key: keyof Customer | null; direction: 'asc' | 'desc' }>({
    key: null,
    direction: 'asc'
  });

  // Modal state
  const [showNewCustomerModal, setShowNewCustomerModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [customerType, setCustomerType] = useState<'CUSTOMER' | 'SHIPPER AND RECEIVER'>('CUSTOMER');
  const [showBatchBilling, setShowBatchBilling] = useState(false);
  const [billingType, setBillingType] = useState<'DEFAULT / LOAD' | 'BATCH WEEKLY' | 'BATCH MONTHLY'>('DEFAULT / LOAD');

  // Country selector state for phones
  interface Country {
    name: string;
    code: string;
    flag: string;
    dialCode: string;
  }

  const [countries, setCountries] = useState<Country[]>([]);
  const [primaryPhoneCountry, setPrimaryPhoneCountry] = useState<string>('US');
  const [secondaryPhoneCountry, setSecondaryPhoneCountry] = useState<string>('US');
  const [primaryCountryDropdownOpen, setPrimaryCountryDropdownOpen] = useState(false);
  const [secondaryCountryDropdownOpen, setSecondaryCountryDropdownOpen] = useState(false);
  const [primaryCountrySearch, setPrimaryCountrySearch] = useState('');
  const [secondaryCountrySearch, setSecondaryCountrySearch] = useState('');
  const primaryCountryDropdownRef = useRef<HTMLDivElement>(null);
  const secondaryCountryDropdownRef = useRef<HTMLDivElement>(null);

  // Helper function to parse phone number and extract country code
  const parsePhoneNumber = (phone: string | undefined | null, countriesList: Country[] = countries): { countryCode: string; phoneNumber: string } => {
    if (!phone) return { countryCode: 'US', phoneNumber: '' };

    const cleanPhone = phone.trim();
    const sortedCountries = [...countriesList].sort((a, b) => b.dialCode.length - a.dialCode.length);

    for (const country of sortedCountries) {
      if (cleanPhone.startsWith(country.dialCode)) {
        return {
          countryCode: country.code,
          phoneNumber: cleanPhone.substring(country.dialCode.length).trim()
        };
      }
    }

    return { countryCode: 'US', phoneNumber: cleanPhone.replace(/^\+1/, '').trim() };
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
        if (defaultCountry) {
          setPrimaryPhoneCountry('US');
          setSecondaryPhoneCountry('US');
        }
      })
      .catch(() => {
        const fallback = [
          { name: 'United States', code: 'US', flag: '🇺🇸', dialCode: '+1' },
          { name: 'Canada', code: 'CA', flag: '🇨🇦', dialCode: '+1' },
          { name: 'India', code: 'IN', flag: '🇮🇳', dialCode: '+91' },
          { name: 'United Kingdom', code: 'GB', flag: '🇬🇧', dialCode: '+44' },
          { name: 'Australia', code: 'AU', flag: '🇦🇺', dialCode: '+61' },
        ];
        setCountries(fallback);
        setPrimaryPhoneCountry('US');
        setSecondaryPhoneCountry('US');
      });
  }, []);

  // Toast notifications state
  const [notifications, setNotifications] = useState<ToastNotification[]>([]);

  const showNotification = (type: 'success' | 'error' | 'warning', message: string) => {
    const id = Date.now();
    setNotifications(prev => [...prev, { id, type, message }]);
  };

  const closeNotification = (id: number) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  // Delete confirmation modal state
  const [deleteConfirmation, setDeleteConfirmation] = useState<{ show: boolean; customerId: string | null; customerName: string }>({
    show: false,
    customerId: null,
    customerName: ''
  });

  // Helper function to parse MongoDB duplicate key errors
  const parseDuplicateKeyError = (errorMessage: string): string => {
    // Check if it's a MongoDB duplicate key error
    if (errorMessage.includes('E11000') && errorMessage.includes('dup key')) {
      // Extract field name and value
      const match = errorMessage.match(/dup key: \{ ([^:]+): "([^"]+)" \}/);
      if (match) {
        const fieldName = match[1];
        const fieldValue = match[2];

        // Convert field names to user-friendly names
        const fieldDisplayNames: { [key: string]: string } = {
          'internalId': 'Customer ID',
          'email': 'Email',
          'phone': 'Phone Number',
          'customerId': 'Customer ID'
        };

        const displayName = fieldDisplayNames[fieldName] || fieldName;
        return `${displayName} "${fieldValue}" already exists. Please use a different value.`;
      }
      return 'This value already exists in the system. Please use a different value.';
    }
    return errorMessage;
  };

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (primaryCountryDropdownRef.current && !primaryCountryDropdownRef.current.contains(event.target as Node)) {
        setPrimaryCountryDropdownOpen(false);
      }
      if (secondaryCountryDropdownRef.current && !secondaryCountryDropdownRef.current.contains(event.target as Node)) {
        setSecondaryCountryDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Form state
  const [formData, setFormData] = useState({
    customer: '',
    customerId: '',
    emailAddress: '',
    secondaryEmail: '',
    trackingEmail: '',
    taxId: '',
    assignedSalesperson: '',
    primaryPhone: '',
    secondaryPhone: '',
    contact: '',
    searchAddress: '',
    address: '',
    city: '',
    unit: '',
    stateProvince: '',
    country: '',
    zipCode: '',
    creditLimit: '',
    invoiceNet: '30',
    defaultQuickPayDiscount: '',
    useFactoringCompany: false,
    csaFastApproved: false,
    softBlock: false,
    hardBlock: false,
    presetNotes: '',
    defaultDropType: ''
  });

  // Fetch customers from API
  useEffect(() => {
    fetchCustomers();
  }, [searchTerm, statusFilter, typeFilter, sortBy, sortOrder]);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const search = searchTerm || customerIdSearch || undefined;
      const status = statusFilter !== 'All' ? statusFilter : undefined;
      const type = typeFilter !== 'All' ? typeFilter : undefined;

      const response = await customerApi.getAllCustomers(1, 1000, search, status, type, sortBy || undefined, sortOrder);

      if (response?.success && response.data) {
        const mappedCustomers = response.data.map((cust: any) => ({
          _id: cust._id,
          name: cust.name || '',
          type: (cust.customerDetails?.customerType || 'Customer') as 'Customer' | 'Shipper-Receiver',
          address: cust.customerDetails?.address || cust.location?.address || '',
          city: cust.city || '',
          status: cust.status || 'active',
          lastLoadDate: cust.updatedAt ? new Date(cust.updatedAt).toLocaleDateString() : undefined,
          customerDetails: cust.customerDetails
        }));
        setCustomers(mappedCustomers);
      }
    } catch (error) {
      console.error('Error fetching customers:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredCustomers = customers;

  const handleExportCustomers = async () => {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Logistiq Innovation';
    workbook.created = new Date();
    const sheet = workbook.addWorksheet('Customers', { views: [{ state: 'frozen', ySplit: 1 }] });

    sheet.columns = [
      { header: 'Customer Name', key: 'name', width: 28 },
      { header: 'Type', key: 'type', width: 18 },
      { header: 'Address', key: 'address', width: 30 },
      { header: 'City', key: 'city', width: 16 },
      { header: 'Email', key: 'email', width: 28 },
      { header: 'Phone', key: 'phone', width: 18 },
      { header: 'Status', key: 'status', width: 14 },
      { header: 'Last Load Date', key: 'lastLoadDate', width: 18 },
    ];

    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF00D1FF' } };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
    headerRow.height = 22;

    filteredCustomers.forEach((c: any) => {
      const row = sheet.addRow({
        name: c.name || '',
        type: c.type || '',
        address: c.address || c.customerDetails?.address || '',
        city: c.city || '',
        email: c.customerDetails?.emailPrimary || '',
        phone: c.customerDetails?.phonePrimary || '',
        status: c.status || '',
        lastLoadDate: c.lastLoadDate ? new Date(c.lastLoadDate).toLocaleDateString() : '',
      });
      row.alignment = { vertical: 'middle' };
    });

    sheet.eachRow((row, i) => {
      if (i > 1) row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: i % 2 === 0 ? 'FFF0F9FF' : 'FFFFFFFF' } };
      row.eachCell(cell => { cell.border = { bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } } }; });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Customers-${new Date().toISOString().split('T')[0]}.xlsx`;
    document.body.appendChild(a);
    a.click();
    URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  const handleSort = (key: keyof Customer) => {
    const newDirection = sortConfig.key === key && sortConfig.direction === 'asc' ? 'desc' : 'asc';
    setSortConfig({ key, direction: newDirection });
    setSortOrder(newDirection);

    // Map frontend keys to backend sort keys
    let backendSortKey = '';
    if (key === 'name') backendSortKey = 'name';
    else if (key === 'type') backendSortKey = 'type';
    else if (key === 'address') backendSortKey = 'address';
    else if (key === 'city') backendSortKey = 'city';
    else if (key === 'lastLoadDate') backendSortKey = 'lastLoadDate';

    setSortBy(backendSortKey);
  };

  const getSortIcon = (key: keyof Customer) => {
    if (sortConfig.key !== key) {
      return (
        <div className="flex flex-col">
          <ChevronUp className="w-3 h-3 text-secondary" />
          <ChevronDown className="w-3 h-3 text-secondary -mt-1" />
        </div>
      );
    }
    return sortConfig.direction === 'asc' ? (
      <ChevronUp className="w-3 h-3 text-primary" />
    ) : (
      <ChevronDown className="w-3 h-3 text-primary" />
    );
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirmation.customerId) return;

    try {
      const response = await customerApi.deleteCustomer(deleteConfirmation.customerId);
      if (response?.success) {
        await fetchCustomers();
        showNotification('success', 'Customer deleted successfully!');
        setDeleteConfirmation({ show: false, customerId: null, customerName: '' });
      } else {
        showNotification('error', response?.message || 'Failed to delete customer');
      }
    } catch (error: any) {
      console.error('Error deleting customer:', error);
      showNotification('error', error.response?.data?.message || error.message || 'Failed to delete customer');
    }
  };

  const handleSaveCustomer = async () => {
    // Client-side validation for required fields
    if (!formData.customer || !formData.customer.trim()) {
      showNotification('error', 'Customer name is required');
      return;
    }

    if (!formData.customerId || !formData.customerId.trim()) {
      showNotification('error', 'Customer ID is required');
      return;
    }

    if (!formData.emailAddress || !formData.emailAddress.trim()) {
      showNotification('error', 'Email address is required');
      return;
    }

    if (!formData.primaryPhone || !formData.primaryPhone.trim()) {
      showNotification('error', 'Primary phone number is required');
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.emailAddress)) {
      showNotification('error', 'Please provide a valid email address');
      return;
    }

    // Validate phone number (minimum 10 digits)
    const phoneDigits = formData.primaryPhone.replace(/\D/g, '');
    if (phoneDigits.length < 10) {
      showNotification('error', 'Primary phone number must be at least 10 digits');
      return;
    }

    // Validate secondary email format if provided
    if (formData.secondaryEmail && formData.secondaryEmail.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.secondaryEmail)) {
        showNotification('error', 'Please provide a valid secondary email address');
        return;
      }
    }

    // Validate tracking email format if provided
    if (formData.trackingEmail && formData.trackingEmail.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.trackingEmail)) {
        showNotification('error', 'Please provide a valid tracking email address');
        return;
      }
    }

    try {
      // Prepare phone numbers with country code prefix
      let phonePrimary = formData.primaryPhone;
      if (formData.primaryPhone) {
        const primaryCountry = countries.find(c => c.code === primaryPhoneCountry);
        if (primaryCountry) {
          const dialCodeWithoutPlus = primaryCountry.dialCode.replace('+', '');
          let phoneNumber = formData.primaryPhone.trim();
          if (phoneNumber.startsWith(dialCodeWithoutPlus)) {
            phonePrimary = `+${phoneNumber}`;
          } else {
            phonePrimary = `${primaryCountry.dialCode}${phoneNumber}`;
          }
        } else {
          phonePrimary = formData.primaryPhone.startsWith('+') ? formData.primaryPhone : `+${formData.primaryPhone}`;
        }
      }

      let phoneSecondary = formData.secondaryPhone;
      if (formData.secondaryPhone) {
        const secondaryCountry = countries.find(c => c.code === secondaryPhoneCountry);
        if (secondaryCountry) {
          const dialCodeWithoutPlus = secondaryCountry.dialCode.replace('+', '');
          let phoneNumber = formData.secondaryPhone.trim();
          if (phoneNumber.startsWith(dialCodeWithoutPlus)) {
            phoneSecondary = `+${phoneNumber}`;
          } else {
            phoneSecondary = `${secondaryCountry.dialCode}${phoneNumber}`;
          }
        } else {
          phoneSecondary = formData.secondaryPhone.startsWith('+') ? formData.secondaryPhone : `+${formData.secondaryPhone}`;
        }
      }

      const customerData = {
        customer: formData.customer,
        customerId: formData.customerId,
        customerType: customerType === 'CUSTOMER' ? 'Customer' : 'Shipper-Receiver',
        emailPrimary: formData.emailAddress,
        emailSecondary: formData.secondaryEmail,
        trackingEmail: formData.trackingEmail,
        taxId: formData.taxId,
        assignedSalesperson: formData.assignedSalesperson,
        phonePrimary: phonePrimary,
        phoneSecondary: phoneSecondary,
        contact: formData.contact,
        address: formData.address,
        unit: formData.unit,
        city: formData.city,
        stateProvince: formData.stateProvince,
        country: formData.country,
        zipCode: formData.zipCode,
        creditLimit: formData.creditLimit,
        invoiceNet: formData.invoiceNet,
        defaultQuickPayDiscount: formData.defaultQuickPayDiscount,
        useFactoringCompany: formData.useFactoringCompany,
        csaFastApproved: formData.csaFastApproved,
        softBlock: formData.softBlock,
        hardBlock: formData.hardBlock,
        billingType: billingType,
        presetNotes: formData.presetNotes,
        defaultDropType: formData.defaultDropType
      };

      let response;
      if (editingId) {
        response = await customerApi.updateCustomer(editingId, customerData);
      } else {
        response = await customerApi.createCustomer(customerData);
      }

      if (response?.success) {
        await fetchCustomers();
        setShowNewCustomerModal(false);
        resetForm();
        showNotification('success', editingId ? 'Customer updated successfully!' : 'Customer created successfully!');
      } else {
        const errorMessage = parseDuplicateKeyError(response?.message || 'Failed to save customer');
        showNotification('error', errorMessage);
      }
    } catch (error: any) {
      console.error('Error saving customer:', error);
      const errorMessage = parseDuplicateKeyError(error.response?.data?.message || error.message || 'Failed to save customer');
      showNotification('error', errorMessage);
    }
  };

  const loadCustomerForEdit = async (customerId: string) => {
    try {
      const response = await customerApi.getAllCustomers(1, 1);
      if (response?.success && response.data) {
        const customer = response.data.find((c: any) => c._id === customerId);
        if (customer) {
          setEditingId(customerId);
          setCustomerType(customer.customerDetails?.customerType === 'Shipper-Receiver' ? 'SHIPPER AND RECEIVER' : 'CUSTOMER');
          setBillingType(customer.customerDetails?.billingType || 'DEFAULT / LOAD');
          setFormData({
            customer: customer.name || '',
            customerId: customer.customerDetails?.customerId || customer.internalId || '',
            emailAddress: customer.customerDetails?.emailPrimary || customer.email || '',
            secondaryEmail: customer.customerDetails?.emailSecondary || '',
            trackingEmail: customer.customerDetails?.trackingEmail || '',
            taxId: customer.customerDetails?.taxId || '',
            assignedSalesperson: customer.customerDetails?.assignedSalesperson || '',
            primaryPhone: (() => {
              const phone = customer.customerDetails?.phonePrimary || customer.phone;
              const parsed = parsePhoneNumber(phone, countries);
              setPrimaryPhoneCountry(parsed.countryCode);
              return parsed.phoneNumber;
            })(),
            secondaryPhone: (() => {
              const phone = customer.customerDetails?.phoneSecondary;
              const parsed = parsePhoneNumber(phone, countries);
              setSecondaryPhoneCountry(parsed.countryCode);
              return parsed.phoneNumber;
            })(),
            contact: customer.customerDetails?.contact || '',
            searchAddress: '',
            address: customer.customerDetails?.address || customer.location?.address || '',
            city: customer.city || '',
            unit: customer.customerDetails?.unit || '',
            stateProvince: customer.customerDetails?.stateProvince || customer.state || '',
            country: customer.country || '',
            zipCode: customer.customerDetails?.zipCode || '',
            creditLimit: customer.customerDetails?.creditLimit || '',
            invoiceNet: customer.customerDetails?.invoiceNet || '30',
            defaultQuickPayDiscount: customer.customerDetails?.defaultQuickPayDiscount || '',
            useFactoringCompany: customer.customerDetails?.useFactoringCompany || false,
            csaFastApproved: customer.customerDetails?.csaFastApproved || false,
            softBlock: customer.customerDetails?.softBlock || false,
            hardBlock: customer.customerDetails?.hardBlock || false,
            presetNotes: customer.customerDetails?.presetNotes || '',
            defaultDropType: customer.customerDetails?.defaultDropType || ''
          });
          setShowNewCustomerModal(true);
        }
      }
    } catch (error) {
      console.error('Error loading customer:', error);
    }
  };

  const resetForm = () => {
    setPrimaryPhoneCountry('US');
    setSecondaryPhoneCountry('US');
    setFormData({
      customer: '',
      customerId: '',
      emailAddress: '',
      secondaryEmail: '',
      trackingEmail: '',
      taxId: '',
      assignedSalesperson: '',
      primaryPhone: '',
      secondaryPhone: '',
      contact: '',
      searchAddress: '',
      address: '',
      city: '',
      unit: '',
      stateProvince: '',
      country: '',
      zipCode: '',
      creditLimit: '',
      invoiceNet: '30',
      defaultQuickPayDiscount: '',
      useFactoringCompany: false,
      csaFastApproved: false,
      softBlock: false,
      hardBlock: false,
      presetNotes: '',
      defaultDropType: ''
    });
    setEditingId(null);
    setCustomerType('CUSTOMER');
    setBillingType('DEFAULT / LOAD');
    setShowBatchBilling(false);
  };

  return (
    <div className="min-h-screen bg-main p-6">
      <style>{`
        @media print {
          body { background: #ffffff !important; }
          .print-hide { display: none !important; }
          table { border-collapse: collapse !important; width: 100% !important; font-size: 11px !important; }
          thead tr { background: #1183e0 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          thead th { color: #ffffff !important; padding: 8px 12px !important; border: 1px solid #0d6bc7 !important; font-weight: 600 !important; text-transform: uppercase !important; font-size: 10px !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          tbody tr:nth-child(even) { background: #f0f6ff !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          tbody td { padding: 7px 12px !important; border: 1px solid #dde6f0 !important; color: #1a1a2e !important; }
          .bg-main, .bg-card { background: #ffffff !important; }
          .border-theme { border-color: #dde6f0 !important; }
          h1 { color: #1183e0 !important; font-size: 20px !important; }
        }
      `}</style>
      {/* Toast Notifications */}
      {notifications.map(notification => (
        <ToastNotificationComponent
          key={notification.id}
          notification={notification}
          onClose={closeNotification}
        />
      ))}

      {/* Delete Confirmation Modal */}
      {deleteConfirmation.show && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-lg shadow-2xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-theme">
              <h3 className="text-xl font-bold text-primary">Delete Customer</h3>
            </div>
            <div className="p-6">
              <p className="text-primary mb-2">
                Are you sure you want to delete this customer?
              </p>
              <p className="text-primary font-semibold">
                {deleteConfirmation.customerName}
              </p>
              <p className="text-sm text-[var(--accent-purple)] mt-4">
                This action cannot be undone.
              </p>
            </div>
            <div className="p-6 border-t border-theme flex items-center justify-end gap-3">
              <button
                onClick={() => setDeleteConfirmation({ show: false, customerId: null, customerName: '' })}
                className="px-6 py-2 border border-theme rounded-lg hover:bg-[rgba(255,255,255,0.03)] transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-6 py-2 !text-white rounded-lg bg-[var(--accent-red)] hover:bg-[var(--accent-red)] transition-colors font-medium"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-full mx-auto ">
        {/* Header Section */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl font-bold text-primary">Customers</h1>
            <div className="flex items-center gap-3 print-hide">
              <span className="text-2xl font-bold text-primary">({filteredCustomers.length})</span>
              <button
                onClick={handleExportCustomers}
                title="Export to Excel"
                className="w-10 h-10 !text-white rounded-lg flex items-center justify-center bg-[var(--accent-navyblue)] hover:bg-[var(--accent-navyblue)]/80 transition-colors shadow-md"
              >
                <FileDown className="w-5 h-5" />
              </button>
              <ImportButton
                templateFileName="customers_template.csv"
                label="Import Customers"
                templateColumns={[
                  { header: 'name', example: 'Acme Logistics', required: true },
                  { header: 'email', example: 'billing@acme.com' },
                  { header: 'phone', example: '+1-555-123-4567' },
                  { header: 'customer_id', example: 'CUST-001' },
                  { header: 'customer_type', example: 'Customer' },
                  { header: 'address', example: '123 Main St' },
                  { header: 'city', example: 'Chicago' },
                  { header: 'state', example: 'IL' },
                  { header: 'country', example: 'USA' },
                  { header: 'postal_code', example: '60601' },
                  { header: 'email_secondary', example: 'ops@acme.com' },
                  { header: 'phone_secondary', example: '+1-555-987-6543' },
                  { header: 'contact', example: 'John Smith' },
                  { header: 'tax_id', example: '12-3456789' },
                  { header: 'credit_limit', example: '50000' },
                  { header: 'credit_term', example: 'NET 30' },
                  { header: 'billing_type', example: 'DEFAULT / LOAD' },
                ]}
                onImport={async (file, fieldMap) => {
                  const result = await customerApi.importCustomersFromFile(file, fieldMap);
                  if (result?.success || result?.imported > 0) {
                    await fetchCustomers();
                  }
                  return result;
                }}
              />
              <button
                onClick={() => {
                  resetForm();
                  setShowNewCustomerModal(true);
                }}
                className="w-10 h-10 bg-[var(--accent-navyblue)] !text-white rounded-lg flex items-center justify-center hover:bg-[var(--accent-navyblue)]/80 transition-colors shadow-md"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Search and Filter Section */}
        <div className="mb-6 space-y-4 print-hide">
          {/* First Row - General Search and Customer ID Search */}
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2 flex-1 min-w-[300px]">
              <label className="text-sm font-medium text-primary whitespace-nowrap">Search:</label>
              <input
                type="text"
                placeholder="Customer, Phone #, Email, Address"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1 px-4 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-green)]/30 focus:border-transparent"
              />

            </div>

            <div className="flex items-center gap-2 flex-1 min-w-[250px]">
              <label className="text-sm font-medium text-primary whitespace-nowrap">Search:</label>
              <input
                type="text"
                placeholder="Customer ID"
                value={customerIdSearch}
                onChange={(e) => setCustomerIdSearch(e.target.value)}
                className="flex-1 px-4 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)]/30 focus:border-transparent"
              />

            </div>
          </div>

          {/* Second Row - Filters */}
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-primary">Status:</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 bg-card text-primary border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-green)]/30 focus:border-transparent"
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
                <option value="All">All</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-primary">Type:</label>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="px-3 py-2 bg-card text-primary border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-green)]/30 focus:border-transparent"
              >
                <option value="All">All</option>
                <option value="Customer">Customer</option>
                <option value="Shipper-Receiver">Shipper-Receiver</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-primary">Sort By:</label>
              <select
                value={sortBy}
                onChange={(e) => {
                  setSortBy(e.target.value);
                  if (e.target.value) {
                    handleSort(e.target.value as keyof Customer);
                  }
                }}
                className="px-3 py-2 bg-card text-primary border border-theme rounded-lg 
  focus:outline-none focus:ring-2 focus:ring-[var(--accent-green)]/30 
  focus:border-transparent 
  hover:bg-[rgba(255,255,255,0.05)]"
              >
                <option value="" className="bg-card text-primary">Select</option>
                <option value="name" className="bg-card text-primary">Customer</option>
                <option value="type" className="bg-card text-primary">Type</option>
                <option value="address" className="bg-card text-primary">Address</option>
                <option value="city" className="bg-card text-primary">City</option>
                <option value="lastLoadDate" className="bg-card text-primary">Last Load Date</option>
              </select>
            </div>
          </div>
        </div>

        {/* Customers Table */}
        <div className="bg-card rounded-lg shadow-sm border border-theme overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-card border-b border-theme">
                <tr>
                  <th
                    className="px-4 py-3 text-left text-xs font-medium text-[var(--accent-navyblue)] uppercase cursor-pointer hover:bg-[rgba(255,255,255,0.03)]"
                    onClick={() => handleSort('name')}
                  >
                    <div className="flex items-center gap-2">
                      Customer
                      {getSortIcon('name')}
                    </div>
                  </th>
                  <th
                    className="px-4 py-3 text-left text-xs font-medium text-[var(--accent-navyblue)] uppercase cursor-pointer hover:bg-[rgba(255,255,255,0.03)]"
                    onClick={() => handleSort('type')}
                  >
                    <div className="flex items-center gap-2">
                      Type
                      {getSortIcon('type')}
                    </div>
                  </th>
                  <th
                    className="px-4 py-3 text-left text-xs font-medium text-[var(--accent-navyblue)] uppercase cursor-pointer hover:bg-[rgba(255,255,255,0.03)]"
                    onClick={() => handleSort('address')}
                  >
                    <div className="flex items-center gap-2">
                      Address
                      {getSortIcon('address')}
                    </div>
                  </th>
                  <th
                    className="px-4 py-3 text-left text-xs font-medium text-[var(--accent-navyblue)] uppercase cursor-pointer hover:bg-[rgba(255,255,255,0.03)]"
                    onClick={() => handleSort('city')}
                  >
                    <div className="flex items-center gap-2">
                      City
                      {getSortIcon('city')}
                    </div>
                  </th>
                  <th
                    className="px-4 py-3 text-left text-xs font-medium text-[var(--accent-navyblue)] uppercase cursor-pointer hover:bg-[rgba(255,255,255,0.03)]"
                    onClick={() => handleSort('lastLoadDate')}
                  >
                    <div className="flex items-center gap-2">
                      Last Load Date
                      {getSortIcon('lastLoadDate')}
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-[var(--accent-navyblue)] uppercase print-hide">Action</th>
                </tr>
              </thead>
              <tbody className="bg-card  divide-theme">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-secondary">
                      Loading...
                    </td>
                  </tr>
                ) : filteredCustomers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-secondary">
                      No customers found
                    </td>
                  </tr>
                ) : (
                  filteredCustomers.map((customer, index) => (
                    <tr
                      key={customer._id || index}
                      className="hover:bg-[rgba(255,255,255,0.03)] transition-colors"
                      onClick={() => {
                        if (customer._id) {
                          loadCustomerForEdit(customer._id);
                        }
                      }}
                    >
                      <td className="px-4 py-3 text-sm text-primary">{customer.name}</td>
                      <td className="px-4 py-3 text-sm text-primary">{customer.type}</td>
                      <td className="px-4 py-3 text-sm text-primary">{customer.address}</td>
                      <td className="px-4 py-3 text-sm text-primary">{customer.city}</td>
                      <td className="px-4 py-3 text-sm text-primary">{customer.lastLoadDate || '-'}</td>
                      <td className="px-4 py-3 print-hide">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              if (customer._id) {
                                loadCustomerForEdit(customer._id);
                              }
                            }}
                            className="p-2 !text-[var(--accent-navyblue)] hover:bg-[rgba(0,209,255,0.1)] rounded-lg transition-colors border border-theme"
                            title="Edit Customer"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              if (customer._id) {
                                setDeleteConfirmation({
                                  show: true,
                                  customerId: customer._id,
                                  customerName: customer.name || customer.customerDetails?.customerId || 'this customer'
                                });
                              }
                            }}
                            className="p-2 text-[var(--accent-red)] hover:bg-[var(--accent-red)]/10 rounded-lg transition-colors"
                            title="Delete Customer"
                          >
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
        </div>
      </div>

      {/* New Customer Modal */}
      {showNewCustomerModal && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowNewCustomerModal(false);
            }
          }}
        >
          <div
            className="bg-card rounded-lg shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Scrollable Container - Everything scrolls together */}
            <div className="flex-1 overflow-y-auto">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-theme bg-card">
                <h2 className="text-2xl font-bold text-primary">
                  {editingId
                    ? (customerType === 'CUSTOMER' ? 'Edit Customer' : 'Edit Shipper Receiver')
                    : (customerType === 'CUSTOMER' ? 'New Customer' : 'New Shipper Receiver')
                  }
                </h2>
                <button
                  onClick={() => {
                    setShowNewCustomerModal(false);
                    resetForm();
                  }}
                  className="text-secondary hover:text-secondary transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Basic Tab Bar */}
              <div className="px-6 py-3 border-b border-theme bg-[rgba(17,131,224,0.08)]">
                <span className="text-[var(--accent-navyblue)] font-medium text-sm">Basic</span>
              </div>

              {/* Form Content */}
              <div className="p-6 bg-card">
                <div className="grid grid-cols-2 gap-8">
                  {/* Left Column - Basic Information */}
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-semibold text-primary mb-4">Basic Information</h3>

                      {/* Customer Type Toggle */}
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-primary mb-2">Customer Type</label>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setCustomerType('CUSTOMER')}
                            className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${customerType === 'CUSTOMER'
                              ? 'bg-[var(--accent-navyblue)] !text-white shadow-sm'
                              : 'bg-card text-secondary hover:bg-[rgba(255,255,255,0.05)]'
                              }`}
                          >
                            CUSTOMER
                          </button>
                          <button
                            type="button"
                            onClick={() => setCustomerType('SHIPPER AND RECEIVER')}
                            className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${customerType === 'SHIPPER AND RECEIVER'
                              ? 'bg-[var(--accent-navyblue)] !text-white shadow-sm'
                              : 'bg-card text-secondary hover:bg-[rgba(255,255,255,0.05)]'
                              }`}
                          >
                            SHIPPER AND RECEIVER
                          </button>
                        </div>
                        <button
                          onClick={() => setShowBatchBilling(!showBatchBilling)}
                          className="mt-2 text-sm text-[var(--accent-green)] hover:underline"
                        >
                          {showBatchBilling ? 'Hide Batch Billing' : 'Show Batch Billing'}
                        </button>
                      </div>

                      {/* Billing Configuration - Shown when Show Batch Billing is clicked */}
                      {showBatchBilling && (
                        <div className="mb-4">
                          <label className="block text-sm font-medium text-primary mb-2">Billing Configuration</label>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => setBillingType('DEFAULT / LOAD')}
                              className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors text-sm ${billingType === 'DEFAULT / LOAD'
                                ? 'bg-[var(--accent-navyblue)] !text-white shadow-sm'
                                : 'bg-card text-secondary hover:bg-[rgba(255,255,255,0.05)]'
                                }`}
                            >
                              DEFAULT / LOAD
                            </button>
                            <button
                              type="button"
                              onClick={() => setBillingType('BATCH WEEKLY')}
                              className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors text-sm ${billingType === 'BATCH WEEKLY'
                                ? 'bg-[var(--accent-navyblue)] !text-white shadow-sm'
                                : 'bg-card text-secondary hover:bg-[rgba(255,255,255,0.05)]'
                                }`}
                            >
                              BATCH WEEKLY
                            </button>
                            <button
                              type="button"
                              onClick={() => setBillingType('BATCH MONTHLY')}
                              className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors text-sm ${billingType === 'BATCH MONTHLY'
                                ? 'bg-[var(--accent-navyblue)] !text-white shadow-sm'
                                : 'bg-card text-secondary hover:bg-[rgba(255,255,255,0.05)]'
                                }`}
                            >
                              BATCH MONTHLY
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Customer */}
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-primary mb-1">
                          Customer<span className="text-[var(--accent-red)]">*</span>
                        </label>
                        <input
                          type="text"
                          placeholder="Customer"
                          value={formData.customer}
                          onChange={(e) => setFormData({ ...formData, customer: e.target.value })}
                          className="w-full px-3 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)]/30 focus:border-transparent"
                        />
                      </div>

                      {/* Customer ID */}
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-primary mb-1">
                          Customer ID<span className="text-[var(--accent-red)]">*</span>
                        </label>
                        <input
                          type="text"
                          placeholder="E.G., CUST001, ABC123"
                          value={formData.customerId}
                          onChange={(e) => setFormData({ ...formData, customerId: e.target.value })}
                          className="w-full px-3 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)]/30 focus:border-transparent"
                        />
                      </div>

                      {/* Email Address */}
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-primary mb-1">
                          Email Address<span className="text-[var(--accent-red)]">*</span>
                        </label>
                        <input
                          type="email"
                          placeholder="Email Address"
                          value={formData.emailAddress}
                          onChange={(e) => setFormData({ ...formData, emailAddress: e.target.value })}
                          className="w-full px-3 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)]/30 focus:border-transparent"
                        />
                      </div>

                      {/* Secondary Email */}
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-primary mb-1">Secondary Email</label>
                        <input
                          type="email"
                          placeholder="Secondary Email"
                          value={formData.secondaryEmail}
                          onChange={(e) => setFormData({ ...formData, secondaryEmail: e.target.value })}
                          className="w-full px-3 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)]/30 focus:border-transparent"
                        />
                      </div>

                      {/* Tracking Email */}
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-primary mb-1">Tracking Email</label>
                        <input
                          type="email"
                          placeholder="Email For Tracking Up"
                          value={formData.trackingEmail}
                          onChange={(e) => setFormData({ ...formData, trackingEmail: e.target.value })}
                          className="w-full px-3 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)]/30 focus:border-transparent"
                        />
                      </div>

                      {/* Tax ID */}
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-primary mb-1">Tax ID</label>
                        <input
                          type="text"
                          placeholder="Tax ID Or Business Nu"
                          value={formData.taxId}
                          onChange={(e) => setFormData({ ...formData, taxId: e.target.value })}
                          className="w-full px-3 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)]/30 focus:border-transparent"
                        />
                      </div>

                      {/* Assigned Salesperson */}
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-primary mb-1">Assigned Salesperson</label>
                        <select
                          value={formData.assignedSalesperson}
                          onChange={(e) => setFormData({ ...formData, assignedSalesperson: e.target.value })}
                          className="w-full px-3 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)]/30 focus:border-transparent"
                        >
                          <option className="form-option" value="">Select Salesperson</option>
                          <option className="form-option" value="salesperson1">Salesperson 1</option>
                          <option className="form-option" value="salesperson2">Salesperson 2</option>
                        </select>
                      </div>

                      {/* Primary Phone # */}
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-primary mb-1">
                          Primary Phone #<span className="text-[var(--accent-red)]">*</span>
                        </label>
                        <div className="flex items-center border border-theme rounded-lg focus-within:ring-2 focus-within:ring-[var(--accent-blue)]/30 focus-within:border-transparent">
                          <div className="relative" ref={primaryCountryDropdownRef}>
                            <button
                              type="button"
                              onClick={() => {
                                setPrimaryCountryDropdownOpen(!primaryCountryDropdownOpen);
                                if (!primaryCountryDropdownOpen) {
                                  setPrimaryCountrySearch('');
                                }
                              }}
                              className="flex items-center gap-1.5 px-2 py-2 text-sm bg-card border-none outline-none cursor-pointer h-full"
                              style={{ minWidth: '85px' }}
                            >
                              {countries.find(c => c.code === primaryPhoneCountry) && (
                                <>
                                  <span className="text-sm" style={{ fontSize: '16px' }}>{countries.find(c => c.code === primaryPhoneCountry)?.flag}</span>
                                  <span className="text-xs text-secondary font-medium">{countries.find(c => c.code === primaryPhoneCountry)?.dialCode}</span>
                                </>
                              )}
                              <ChevronDown className="w-3 h-3 text-secondary ml-auto" />
                            </button>
                            {primaryCountryDropdownOpen && (
                              <div className="absolute top-full left-0 z-50 bg-card border border-theme rounded-lg shadow-lg mt-1" style={{ minWidth: '280px', maxWidth: '320px' }}>
                                {/* Search Input */}
                                <div className="p-2 border-b border-theme sticky top-0 bg-card">
                                  <input
                                    type="text"
                                    placeholder="Search country..."
                                    value={primaryCountrySearch}
                                    onChange={(e) => setPrimaryCountrySearch(e.target.value)}
                                    onClick={(e) => e.stopPropagation()}
                                    className="w-full px-3 py-1.5 text-xs border border-theme rounded focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)]/30 focus:border-transparent"
                                  />
                                </div>
                                {/* Countries List */}
                                <div className="max-h-60 overflow-y-auto">
                                  {countries
                                    .filter((country) => {
                                      const searchLower = primaryCountrySearch.toLowerCase();
                                      return (
                                        country.name.toLowerCase().includes(searchLower) ||
                                        country.code.toLowerCase().includes(searchLower) ||
                                        country.dialCode.includes(searchLower)
                                      );
                                    })
                                    .map((country) => (
                                      <button
                                        key={country.code}
                                        type="button"
                                        onClick={() => {
                                          setPrimaryPhoneCountry(country.code);
                                          setPrimaryCountryDropdownOpen(false);
                                          setPrimaryCountrySearch('');
                                          // Don't auto-fill dial code - let user type the number without country code
                                          // The dial code will be prepended when saving
                                        }}
                                        className={`w-full flex items-center gap-2 px-3 py-2 text-xs text-left hover:bg-card transition-colors ${primaryPhoneCountry === country.code ? 'bg-card' : ''
                                          }`}
                                      >
                                        <span className="text-base" style={{ fontSize: '18px' }}>{country.flag}</span>
                                        <span className="flex-1 truncate">{country.name}</span>
                                        <span className="text-secondary font-medium">{country.dialCode}</span>
                                      </button>
                                    ))}
                                  {countries.filter((country) => {
                                    const searchLower = primaryCountrySearch.toLowerCase();
                                    return (
                                      country.name.toLowerCase().includes(searchLower) ||
                                      country.code.toLowerCase().includes(searchLower) ||
                                      country.dialCode.includes(searchLower)
                                    );
                                  }).length === 0 && (
                                      <div className="px-3 py-4 text-xs text-secondary text-center">
                                        No countries found
                                      </div>
                                    )}
                                </div>
                              </div>
                            )}
                          </div>
                          <div className="h-6 w-px bg-[rgba(255,255,255,0.15)]"></div>
                          <input
                            type="tel"
                            placeholder=""
                            value={formData.primaryPhone}
                            onChange={(e) => {
                              const value = e.target.value.replace(/\D/g, '');
                              setFormData({ ...formData, primaryPhone: value });
                            }}
                            className="flex-1 px-3 py-2 text-sm border-none outline-none focus:outline-none"
                          />
                        </div>
                      </div>

                      {/* Secondary Phone # */}
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-primary mb-1">Secondary Phone #</label>
                        <div className="flex items-center border border-theme rounded-lg focus-within:ring-2 focus-within:ring-[var(--accent-blue)]/30 focus-within:border-transparent">
                          <div className="relative" ref={secondaryCountryDropdownRef}>
                            <button
                              type="button"
                              onClick={() => {
                                setSecondaryCountryDropdownOpen(!secondaryCountryDropdownOpen);
                                if (!secondaryCountryDropdownOpen) {
                                  setSecondaryCountrySearch('');
                                }
                              }}
                              className="flex items-center gap-1.5 px-2 py-2 text-sm bg-card border-none outline-none cursor-pointer h-full"
                              style={{ minWidth: '85px' }}
                            >
                              {countries.find(c => c.code === secondaryPhoneCountry) && (
                                <>
                                  <span className="text-sm" style={{ fontSize: '16px' }}>{countries.find(c => c.code === secondaryPhoneCountry)?.flag}</span>
                                  <span className="text-xs text-secondary font-medium">{countries.find(c => c.code === secondaryPhoneCountry)?.dialCode}</span>
                                </>
                              )}
                              <ChevronDown className="w-3 h-3 text-secondary ml-auto" />
                            </button>
                            {secondaryCountryDropdownOpen && (
                              <div className="absolute top-full left-0 z-50 bg-card border border-theme rounded-lg shadow-lg mt-1" style={{ minWidth: '280px', maxWidth: '320px' }}>
                                {/* Search Input */}
                                <div className="p-2 border-b border-theme sticky top-0 bg-card">
                                  <input
                                    type="text"
                                    placeholder="Search country..."
                                    value={secondaryCountrySearch}
                                    onChange={(e) => setSecondaryCountrySearch(e.target.value)}
                                    onClick={(e) => e.stopPropagation()}
                                    className="w-full px-3 py-1.5 text-xs border border-theme rounded focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)]/30 focus:border-transparent"
                                  />
                                </div>
                                {/* Countries List */}
                                <div className="max-h-60 overflow-y-auto">
                                  {countries
                                    .filter((country) => {
                                      const searchLower = secondaryCountrySearch.toLowerCase();
                                      return (
                                        country.name.toLowerCase().includes(searchLower) ||
                                        country.code.toLowerCase().includes(searchLower) ||
                                        country.dialCode.includes(searchLower)
                                      );
                                    })
                                    .map((country) => (
                                      <button
                                        key={country.code}
                                        type="button"
                                        onClick={() => {
                                          setSecondaryPhoneCountry(country.code);
                                          setSecondaryCountryDropdownOpen(false);
                                          setSecondaryCountrySearch('');
                                          // Don't auto-fill dial code - let user type the number without country code
                                          // The dial code will be prepended when saving
                                        }}
                                        className={`w-full flex items-center gap-2 px-3 py-2 text-xs text-left hover:bg-card transition-colors ${secondaryPhoneCountry === country.code ? 'bg-card' : ''
                                          }`}
                                      >
                                        <span className="text-base" style={{ fontSize: '18px' }}>{country.flag}</span>
                                        <span className="flex-1 truncate">{country.name}</span>
                                        <span className="text-secondary font-medium">{country.dialCode}</span>
                                      </button>
                                    ))}
                                  {countries.filter((country) => {
                                    const searchLower = secondaryCountrySearch.toLowerCase();
                                    return (
                                      country.name.toLowerCase().includes(searchLower) ||
                                      country.code.toLowerCase().includes(searchLower) ||
                                      country.dialCode.includes(searchLower)
                                    );
                                  }).length === 0 && (
                                      <div className="px-3 py-4 text-xs text-secondary text-center">
                                        No countries found
                                      </div>
                                    )}
                                </div>
                              </div>
                            )}
                          </div>
                          <div className="h-6 w-px bg-[rgba(255,255,255,0.15)]"></div>
                          <input
                            type="tel"
                            placeholder=""
                            value={formData.secondaryPhone}
                            onChange={(e) => {
                              const value = e.target.value.replace(/\D/g, '');
                              setFormData({ ...formData, secondaryPhone: value });
                            }}
                            className="flex-1 px-3 py-2 text-sm border-none outline-none focus:outline-none"
                          />
                        </div>
                      </div>

                      {/* Contact */}
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-primary mb-1">Contact</label>
                        <input
                          type="text"
                          placeholder="Contact"
                          value={formData.contact}
                          onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                          className="w-full px-3 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)]/30 focus:border-transparent"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Right Column - Address and Additional Sections */}
                  <div className="space-y-6">
                    {/* Address Section */}
                    <div>
                      <h3 className="text-lg font-semibold text-primary mb-4">Address</h3>

                      <div className="mb-4">
                        <AddressSearch
                          label="Search Address"
                          placeholder="Search For An Address..."
                          onAddressSelect={(addressData) => {
                            // Find matching country by name or code
                            let countryName = '';
                            if (addressData.country) {
                              const countryFromAddress = countries.find(
                                c => c.name.toLowerCase() === addressData.country.toLowerCase() ||
                                  c.code.toLowerCase() === addressData.country.toLowerCase()
                              );
                              countryName = countryFromAddress ? countryFromAddress.name : addressData.country;
                            }

                            // Populate all address fields
                            setFormData({
                              ...formData,
                              address: addressData.address || '',
                              city: addressData.city || '',
                              zipCode: addressData.postalCode || '',
                              stateProvince: addressData.state || '',
                              country: countryName,
                              searchAddress: addressData.fullAddress || ''
                            });
                          }}
                          className=""
                        />
                      </div>

                      <div className="mb-4">
                        <label className="block text-sm font-medium text-primary mb-1">
                          Address<span className="text-[var(--accent-red)]">*</span>
                        </label>
                        <input
                          type="text"
                          placeholder="Address"
                          value={formData.address}
                          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                          className="w-full px-3 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)]/30 focus:border-transparent"
                        />
                      </div>

                      <div className="mb-4">
                        <label className="block text-sm font-medium text-primary mb-1">
                          City<span className="text-[var(--accent-red)]">*</span>
                        </label>
                        <input
                          type="text"
                          placeholder="City"
                          value={formData.city}
                          onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                          className="w-full px-3 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)]/30 focus:border-transparent"
                        />
                      </div>

                      <div className="mb-4">
                        <label className="block text-sm font-medium text-primary mb-1">Unit</label>
                        <input
                          type="text"
                          placeholder="Unit"
                          value={formData.unit}
                          onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                          className="w-full px-3 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)]/30 focus:border-transparent"
                        />
                      </div>

                      <div className="mb-4">
                        <label className="block text-sm font-medium text-primary mb-1">
                          Country<span className="text-[var(--accent-red)]">*</span>
                        </label>
                        <select
                          value={(() => {
                            // Find country by name (formData.country stores the name)
                            const foundCountry = countries.find(c => c.name === formData.country);
                            return foundCountry ? foundCountry.code : '';
                          })()}
                          onChange={(e) => {
                            const selectedCountry = countries.find(c => c.code === e.target.value);
                            setFormData({
                              ...formData,
                              country: selectedCountry ? selectedCountry.name : '',
                              stateProvince: ''
                            });
                          }}
                          className="w-full px-3 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)]/30 focus:border-transparent"
                        >
                          <option className="form-option" value="">Select Country</option>
                          {countries.map((country) => (
                            <option className="form-option" key={country.code} value={country.code}>
                              {country.flag} {country.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="mb-4">
                        <label className="block text-sm font-medium text-primary mb-1">
                          Province/State<span className="text-[var(--accent-red)]">*</span>
                        </label>
                        <input
                          type="text"
                          value={formData.stateProvince}
                          onChange={(e) => setFormData({ ...formData, stateProvince: e.target.value })}
                          disabled={!formData.country}
                          placeholder={formData.country ? "Enter Province/State" : "Select country first"}
                          className="w-full px-3 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)]/30 focus:border-transparent disabled:bg-card disabled:cursor-not-allowed"
                        />
                      </div>

                      <div className="mb-4">
                        <label className="block text-sm font-medium text-primary mb-1">ZIP Code</label>
                        <input
                          type="text"
                          placeholder="ZIP Code"
                          value={formData.zipCode}
                          onChange={(e) => setFormData({ ...formData, zipCode: e.target.value })}
                          className="w-full px-3 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)]/30 focus:border-transparent"
                        />
                      </div>
                    </div>

                    {/* Finance Section - Only for CUSTOMER type */}
                    {customerType === 'CUSTOMER' && (
                      <div>
                        <h3 className="text-lg font-semibold text-primary mb-4">Finance</h3>

                        <div className="mb-4">
                          <label className="block text-sm font-medium text-primary mb-1">Credit Limit</label>
                          <input
                            type="text"
                            placeholder="Credit Limit"
                            value={formData.creditLimit}
                            onChange={(e) => setFormData({ ...formData, creditLimit: e.target.value })}
                            className="w-full px-3 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)]/30 focus:border-transparent"
                          />
                        </div>

                        <div className="mb-4">
                          <label className="block text-sm font-medium text-primary mb-1">Invoice Net</label>
                          <input
                            type="text"
                            value={formData.invoiceNet}
                            onChange={(e) => setFormData({ ...formData, invoiceNet: e.target.value })}
                            className="w-full px-3 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)]/30 focus:border-transparent"
                          />
                        </div>

                        <div className="mb-4">
                          <label className="block text-sm font-medium text-primary mb-1">Default Quick Pay Discount (%)</label>
                          <input
                            type="text"
                            placeholder="Default Quick Pay Discount (%)"
                            value={formData.defaultQuickPayDiscount}
                            onChange={(e) => setFormData({ ...formData, defaultQuickPayDiscount: e.target.value })}
                            className="w-full px-3 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)]/30 focus:border-transparent"
                          />
                        </div>
                      </div>
                    )}

                    {/* Additional Settings Section */}
                    <div>
                      <h3 className="text-lg font-semibold text-primary mb-4">
                        {customerType === 'CUSTOMER' ? 'Additional Settings' : 'Additional Settings'}
                      </h3>

                      {customerType === 'CUSTOMER' && (
                        <div className="mb-4">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={formData.useFactoringCompany}
                              onChange={(e) => setFormData({ ...formData, useFactoringCompany: e.target.checked })}
                              className="w-4 h-4 text-[var(--accent-green)] border-theme rounded focus:ring-[var(--accent-blue)]/30"
                            />
                            <span className="text-sm text-primary">Use Factoring Company</span>
                          </label>
                        </div>
                      )}

                      <div className="mb-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.csaFastApproved}
                            onChange={(e) => setFormData({ ...formData, csaFastApproved: e.target.checked })}
                            className="w-4 h-4 text-[var(--accent-green)] border-theme rounded focus:ring-[var(--accent-blue)]/30"
                          />
                          <span className="text-sm text-primary">CSA/FAST Approved</span>
                        </label>
                      </div>

                      {customerType === 'SHIPPER AND RECEIVER' && (
                        <>
                          <div className="mb-4">
                            <label className="block text-sm font-medium text-primary mb-1">
                              Preset Notes
                              <HelpCircle className="w-4 h-4 inline-block ml-1 text-secondary" />
                            </label>
                            <textarea
                              value={formData.presetNotes}
                              onChange={(e) => setFormData({ ...formData, presetNotes: e.target.value })}
                              placeholder="Enter preset notes..."
                              rows={4}
                              className="w-full px-3 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)]/30 focus:border-transparent resize-none"
                            />
                          </div>

                          <div className="mb-4">
                            <label className="block text-sm font-medium text-primary mb-1">
                              Default Drop Type
                              <HelpCircle className="w-4 h-4 inline-block ml-1 text-secondary" />
                            </label>
                            <select
                              value={formData.defaultDropType}
                              onChange={(e) => setFormData({ ...formData, defaultDropType: e.target.value })}
                              className="w-full px-3 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)]/30 focus:border-transparent"
                            >
                              <option value="">Select</option>
                              <option value="live">Live</option>
                              <option value="drop">Drop</option>
                              <option value="both">Both</option>
                            </select>
                          </div>
                        </>
                      )}

                      <div className="mb-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.softBlock}
                            onChange={(e) => setFormData({ ...formData, softBlock: e.target.checked })}
                            className="w-4 h-4 text-[var(--accent-green)] border-theme rounded focus:ring-[var(--accent-blue)]/30"
                          />
                          <span className="text-sm text-primary">
                            Soft Block
                            <HelpCircle className="w-4 h-4 inline-block ml-1 text-secondary" />
                          </span>
                        </label>
                      </div>

                      <div className="mb-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.hardBlock}
                            onChange={(e) => setFormData({ ...formData, hardBlock: e.target.checked })}
                            className="w-4 h-4 text-[var(--accent-green)] border-theme rounded focus:ring-[var(--accent-blue)]/30"
                          />
                          <span className="text-sm text-primary">
                            Hard Block
                            <HelpCircle className="w-4 h-4 inline-block ml-1 text-secondary" />
                          </span>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer with Save Button */}
            <div className="bg-[var(--accent-navyblue)]/10 px-6 py-4 flex justify-center">
              <button
                onClick={handleSaveCustomer}
                disabled={
                  !formData.customer || !formData.customer.trim() ||
                  !formData.customerId || !formData.customerId.trim() ||
                  !formData.emailAddress || !formData.emailAddress.trim() ||
                  !formData.primaryPhone || !formData.primaryPhone.trim()
                }
                className="px-8 py-2 bg-[var(--accent-navyblue)] !text-white rounded-lg hover:bg-[var(--accent-navyblue)]/80 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {editingId ? 'Update' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomersPage;

