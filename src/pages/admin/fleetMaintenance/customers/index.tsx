import { useState, useCallback, useEffect } from 'react';
import { FaMapMarkerAlt, FaStickyNote, FaPlus, FaCreditCard, FaInfoCircle, FaTimes, FaEdit, FaEye, FaTrash, FaCheckCircle, FaExclamationCircle } from 'react-icons/fa';
import { FileDown } from 'lucide-react';
import ExcelJS from 'exceljs';
import {
  getFleetCustomers,
  createFleetCustomer,
  updateFleetCustomer,
  getFleetCustomerById,
  deleteFleetCustomer,
  type FleetCustomer as ApiFleetCustomer,
} from '../../../../axios/api/fleet.customers';
import AddressSearch from '../../../../components/common/AddressSearch';
import ConfirmationModal from '../../../../components/common/ConfirmationModal';

const MAX_FILE_SIZE_MB = 20;
const MAX_FILE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

interface AddressFields {
  streetAddress1: string;
  streetAddress2: string;
  city: string;
  provinceState: string;
  postalZip: string;
  country: string;
}

/** Table row shape (from API or for display) */
interface CustomerRow {
  id: string;
  name: string;
  email: string;
  phone: string;
  billingCity: string;
  billingProvinceState: string;
  country: string;
  customerType: string;
  terms: string;
  paymentMethod: string;
}

const mapApiToRow = (c: ApiFleetCustomer): CustomerRow => ({
  id: c._id,
  name: c.name ?? '',
  email: c.email ?? '',
  phone: c.phone ?? '',
  billingCity: c.billing?.city ?? '',
  billingProvinceState: c.billing?.provinceState ?? '',
  country: c.billing?.country ?? '',
  customerType: c.customerType ?? '',
  terms: c.terms ?? '',
  paymentMethod: c.primaryPaymentMethod ?? '',
});

type NotificationType = 'success' | 'error' | 'info';
interface NotificationItem {
  id: number;
  type: NotificationType;
  message: string;
}

const NotificationToast = ({ notification, onClose }: { notification: NotificationItem; onClose: (id: number) => void }) => {
  const icons = {
    success: <FaCheckCircle className="text-green-500" size={20} />,
    error: <FaExclamationCircle className="text-red-500" size={20} />,
    info: <FaInfoCircle className="text-blue-500" size={20} />,
  };
  const bgColors = {
    success: 'bg-green-50 border-green-200',
    error: 'bg-card border-red-200',
    info: 'bg-card border-blue-200',
  };
  useEffect(() => {
    const t = setTimeout(() => onClose(notification.id), 5000);
    return () => clearTimeout(t);
  }, [notification.id, onClose]);
  return (
    <div className={`flex items-start gap-3 p-4 rounded-lg border-2 shadow-lg ${bgColors[notification.type]}`}>
      <div className="flex-shrink-0 mt-0.5">{icons[notification.type]}</div>
      <p className="flex-1 text-sm font-medium text-headings">{notification.message}</p>
      <button type="button" onClick={() => onClose(notification.id)} className="flex-shrink-0 text-secondary hover:text-secondary">
        <FaTimes size={16} />
      </button>
    </div>
  );
};

const FleetMaintenanceCustomers = () => {
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [customersLoading, setCustomersLoading] = useState(true);
  const [customersError, setCustomersError] = useState<string | null>(null);
  const [addCustomerSidebarOpen, setAddCustomerSidebarOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [detailCustomerId, setDetailCustomerId] = useState<string | null>(null);
  const [detailCustomer, setDetailCustomer] = useState<ApiFleetCustomer | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [deleteTargetName, setDeleteTargetName] = useState<string>('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [sameAsBilling, setSameAsBilling] = useState(true);
  const [billing, setBilling] = useState<AddressFields>({
    streetAddress1: '',
    streetAddress2: '',
    city: '',
    provinceState: '',
    postalZip: '',
    country: '',
  });
  const [shipping, setShipping] = useState<AddressFields>({
    streetAddress1: '',
    streetAddress2: '',
    city: '',
    provinceState: '',
    postalZip: '',
    country: '',
  });
  const [notes, setNotes] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [primaryPaymentMethod, setPrimaryPaymentMethod] = useState('');
  const [terms, setTerms] = useState('');
  const [customerType, setCustomerType] = useState('');
  const [businessNumber, setBusinessNumber] = useState('');
  const [assignDefaultTaxCode, setAssignDefaultTaxCode] = useState(false);
  const [openingBalanceAmount, setOpeningBalanceAmount] = useState('');
  const [openingBalanceAsOf, setOpeningBalanceAsOf] = useState('');

  const paymentMethods = ['Credit Card', 'Cash', 'Check', 'Bank Transfer', 'Other'];
  const termsOptions = ['Due on Receipt', 'Net 15', 'Net 30', 'Net 45', 'Net 60'];
  const customerTypes = ['Wholesale', 'Retail', 'Reseller', 'Government', 'Other'];

  const isValidEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

  const handleBillingChange = (field: keyof AddressFields, value: string) => {
    setBilling((prev) => ({ ...prev, [field]: value }));
    if (sameAsBilling) setShipping((prev) => ({ ...prev, [field]: value }));
  };

  const handleShippingChange = (field: keyof AddressFields, value: string) => {
    setShipping((prev) => ({ ...prev, [field]: value }));
  };

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(e.type === 'dragenter' || e.type === 'dragover');
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const files = Array.from(e.dataTransfer.files);
    const valid = files.filter((f) => f.size <= MAX_FILE_BYTES);
    setAttachments((prev) => [...prev, ...valid]);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    const valid = files.filter((f) => f.size <= MAX_FILE_BYTES);
    setAttachments((prev) => [...prev, ...valid]);
    e.target.value = '';
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const addNotification = (type: NotificationType, message: string) => {
    const id = Date.now();
    setNotifications((prev) => [...prev, { id, type, message }]);
  };

  const removeNotification = (id: number) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const handleExportCustomers = async () => {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Logistiq Innovation';
    workbook.created = new Date();
    const sheet = workbook.addWorksheet('Customers', { views: [{ state: 'frozen', ySplit: 1 }] });

    sheet.columns = [
      { header: 'Customer Name', key: 'name', width: 28 },
      { header: 'Type', key: 'customerType', width: 18 },
      { header: 'Email', key: 'email', width: 28 },
      { header: 'Phone', key: 'phone', width: 18 },
      { header: 'City', key: 'billingCity', width: 16 },
      { header: 'Province / State', key: 'billingProvinceState', width: 18 },
      { header: 'Country', key: 'country', width: 14 },
      { header: 'Terms', key: 'terms', width: 14 },
      { header: 'Payment Method', key: 'paymentMethod', width: 18 },
    ];

    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF42AEEC' } };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
    headerRow.height = 22;

    customers.forEach((c: CustomerRow) => {
      const row = sheet.addRow({
        name: c.name || '',
        customerType: c.customerType || '',
        email: c.email || '',
        phone: c.phone || '',
        billingCity: c.billingCity || '',
        billingProvinceState: c.billingProvinceState || '',
        country: c.country || '',
        terms: c.terms || '',
        paymentMethod: c.paymentMethod || '',
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

  const fetchCustomers = useCallback(async () => {
    setCustomersLoading(true);
    setCustomersError(null);
    try {
      const res = await getFleetCustomers();
      if (res?.success && Array.isArray(res.data)) {
        setCustomers(res.data.map(mapApiToRow));
      } else {
        setCustomers([]);
        setCustomersError((res as { message?: string })?.message ?? 'Failed to load customers');
      }
    } catch {
      setCustomers([]);
      setCustomersError('Failed to load customers');
    } finally {
      setCustomersLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const openDetail = async (id: string) => {
    setDetailCustomerId(id);
    setDetailCustomer(null);
    setDetailLoading(true);
    try {
      const res = await getFleetCustomerById(id);
      if (res?.success && res.data) setDetailCustomer(res.data);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleDeleteClick = (id: string, name: string) => {
    setDeleteTargetId(id);
    setDeleteTargetName(name);
    setShowDeleteConfirmation(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTargetId) return;
    const idToDelete = deleteTargetId;
    setShowDeleteConfirmation(false);
    setDeleteTargetId(null);
    setDeleteTargetName('');
    setDeletingId(idToDelete);
    try {
      const res = await deleteFleetCustomer(idToDelete);
      if (res?.success) {
        addNotification('success', res?.message ?? 'Customer deleted successfully.');
        await fetchCustomers();
      } else {
        addNotification('error', res?.message ?? 'Failed to delete customer.');
      }
    } catch {
      addNotification('error', 'Failed to delete customer.');
    } finally {
      setDeletingId(null);
    }
  };

  const openEdit = async (id: string) => {
    setEditingId(id);
    setAddCustomerSidebarOpen(true);
    setDetailCustomerId(null);
    setDetailCustomer(null);
    try {
      const res = await getFleetCustomerById(id);
      if (res?.success && res.data) {
        const c = res.data;
        setCustomerName(c.name ?? '');
        setEmail(c.email ?? '');
        setPhone(c.phone ?? '');
        setContactPerson(c.contactPerson ?? '');
        setBilling({
          streetAddress1: c.billing?.streetAddress1 ?? '',
          streetAddress2: c.billing?.streetAddress2 ?? '',
          city: c.billing?.city ?? '',
          provinceState: c.billing?.provinceState ?? '',
          postalZip: c.billing?.postalZip ?? '',
          country: c.billing?.country ?? '',
        });
        setSameAsBilling(!!c.sameAsBilling);
        setShipping({
          streetAddress1: c.shipping?.streetAddress1 ?? '',
          streetAddress2: c.shipping?.streetAddress2 ?? '',
          city: c.shipping?.city ?? '',
          provinceState: c.shipping?.provinceState ?? '',
          postalZip: c.shipping?.postalZip ?? '',
          country: c.shipping?.country ?? '',
        });
        setNotes(c.notes ?? '');
        setPrimaryPaymentMethod(c.primaryPaymentMethod ?? '');
        setTerms(c.terms ?? '');
        setCustomerType(c.customerType ?? '');
        setBusinessNumber(c.businessNumber ?? '');
        setAssignDefaultTaxCode(!!c.assignDefaultTaxCode);
        setOpeningBalanceAmount(c.openingBalanceAmount != null ? String(c.openingBalanceAmount) : '');
        setOpeningBalanceAsOf(c.openingBalanceAsOf ? c.openingBalanceAsOf.split('T')[0] : '');
        setAttachments([]);
        setErrors({});
      } else {
        addNotification('error', 'Failed to load customer for editing.');
        setAddCustomerSidebarOpen(false);
        setEditingId(null);
      }
    } catch {
      addNotification('error', 'Failed to load customer for editing.');
      setAddCustomerSidebarOpen(false);
      setEditingId(null);
    }
  };

  const resetForm = () => {
    setCustomerName('');
    setEmail('');
    setPhone('');
    setContactPerson('');
    setErrors({});
    setBilling({ streetAddress1: '', streetAddress2: '', city: '', provinceState: '', postalZip: '', country: '' });
    setShipping({ streetAddress1: '', streetAddress2: '', city: '', provinceState: '', postalZip: '', country: '' });
    setSameAsBilling(true);
    setNotes('');
    setAttachments([]);
    setPrimaryPaymentMethod('');
    setTerms('');
    setCustomerType('');
    setBusinessNumber('');
    setAssignDefaultTaxCode(false);
    setOpeningBalanceAmount('');
    setOpeningBalanceAsOf('');
  };

  const validate = (): boolean => {
    const next: Record<string, string> = {};
    const name = customerName.trim();
    if (!name) next.customerName = 'Customer name is required';
    const emailTrim = email.trim();
    if (!emailTrim) next.email = 'Email is required';
    else if (!isValidEmail(emailTrim)) next.email = 'Enter a valid email address';
    if (!billing.streetAddress1.trim()) next.streetAddress1 = 'Street address is required';
    if (!billing.city.trim()) next.city = 'City is required';
    if (!billing.provinceState.trim()) next.provinceState = 'Province / State is required';
    if (!billing.postalZip.trim()) next.postalZip = 'Postal / ZIP code is required';
    if (!billing.country.trim()) next.country = 'Country is required';
    if (!terms) next.terms = 'Payment terms are required';
    if (!primaryPaymentMethod) next.primaryPaymentMethod = 'Primary payment method is required';
    if (!customerType) next.customerType = 'Customer type is required';
    if (openingBalanceAmount.trim()) {
      const n = parseFloat(openingBalanceAmount.trim());
      if (Number.isNaN(n)) next.openingBalanceAmount = 'Enter a valid number';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const payload = {
        name: customerName.trim(),
        email: email.trim(),
        phone: phone.trim() || undefined,
        contactPerson: contactPerson.trim() || undefined,
        billing: {
          streetAddress1: billing.streetAddress1.trim(),
          streetAddress2: billing.streetAddress2.trim(),
          city: billing.city.trim(),
          provinceState: billing.provinceState.trim(),
          postalZip: billing.postalZip.trim(),
          country: billing.country.trim(),
        },
        sameAsBilling: sameAsBilling,
        shipping: sameAsBilling
          ? undefined
          : {
            streetAddress1: shipping.streetAddress1.trim(),
            streetAddress2: shipping.streetAddress2.trim(),
            city: shipping.city.trim(),
            provinceState: shipping.provinceState.trim(),
            postalZip: shipping.postalZip.trim(),
            country: shipping.country.trim(),
          },
        notes: notes.trim() || undefined,
        primaryPaymentMethod: primaryPaymentMethod || undefined,
        terms: terms || undefined,
        customerType: customerType || undefined,
        businessNumber: businessNumber.trim() || undefined,
        assignDefaultTaxCode: assignDefaultTaxCode,
        openingBalanceAmount:
          openingBalanceAmount.trim() && !Number.isNaN(parseFloat(openingBalanceAmount.trim()))
            ? parseFloat(openingBalanceAmount.trim())
            : undefined,
        openingBalanceAsOf: openingBalanceAsOf || undefined,
        documents:
          attachments.length > 0
            ? attachments.map((f) => ({ name: f.name, size: f.size }))
            : undefined,
      };
      if (editingId) {
        const res = await updateFleetCustomer(editingId, payload);
        if (res?.success) {
          addNotification('success', res?.message ?? 'Customer updated successfully.');
          resetForm();
          setAddCustomerSidebarOpen(false);
          setEditingId(null);
          await fetchCustomers();
        } else {
          addNotification('error', res?.message ?? 'Failed to update customer.');
        }
      } else {
        const res = await createFleetCustomer(payload);
        if (res?.success) {
          addNotification('success', res?.message ?? 'Customer saved successfully.');
          resetForm();
          setAddCustomerSidebarOpen(false);
          await fetchCustomers();
        } else {
          addNotification('error', res?.message ?? 'Failed to save customer.');
        }
      }
    } catch {
      addNotification('error', editingId ? 'Failed to update customer.' : 'Failed to save customer.');
    } finally {
      setSaving(false);
    }
  };

  const handleCloseSidebar = () => {
    setAddCustomerSidebarOpen(false);
    setEditingId(null);
    setErrors({});
  };

  const renderAddressFields = (
    fields: AddressFields,
    onChange: (field: keyof AddressFields, value: string) => void,
    options?: { errors?: Record<string, string> }
  ) => {
    const err = options?.errors ?? {};
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-headings mb-1">Street Address 1</label>
          <input
            type="text"
            value={fields.streetAddress1}
            onChange={(e) => onChange('streetAddress1', e.target.value)}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${err.streetAddress1 ? 'border-red-500' : 'border-theme'}`}
            placeholder="Street address"
          />
          {err.streetAddress1 && <p className="text-red-500 text-xs mt-1">{err.streetAddress1}</p>}
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-headings mb-1">Street Address 2</label>
          <input
            type="text"
            value={fields.streetAddress2}
            onChange={(e) => onChange('streetAddress2', e.target.value)}
            className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Apt, suite, unit, etc. (optional)"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-headings mb-1">City</label>
          <input
            type="text"
            value={fields.city}
            onChange={(e) => onChange('city', e.target.value)}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${err.city ? 'border-red-500' : 'border-theme'}`}
            placeholder="City"
          />
          {err.city && <p className="text-red-500 text-xs mt-1">{err.city}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-headings mb-1">Province / State</label>
          <input
            type="text"
            value={fields.provinceState}
            onChange={(e) => onChange('provinceState', e.target.value)}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${err.provinceState ? 'border-red-500' : 'border-theme'}`}
            placeholder="Province or State"
          />
          {err.provinceState && <p className="text-red-500 text-xs mt-1">{err.provinceState}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-headings mb-1">Postal / ZIP Code</label>
          <input
            type="text"
            value={fields.postalZip}
            onChange={(e) => onChange('postalZip', e.target.value)}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${err.postalZip ? 'border-red-500' : 'border-theme'}`}
            placeholder="Postal or ZIP code"
          />
          {err.postalZip && <p className="text-red-500 text-xs mt-1">{err.postalZip}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-headings mb-1">Country</label>
          <input
            type="text"
            value={fields.country}
            onChange={(e) => onChange('country', e.target.value)}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${err.country ? 'border-red-500' : 'border-theme'}`}
            placeholder="Country"
          />
          {err.country && <p className="text-red-500 text-xs mt-1">{err.country}</p>}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen pb-10 bg-main " >
      <div className="relative w-full mx-auto p-6">
        {/* Notifications */}
        <div className="fixed top-4 right-4 z-[200] space-y-3 max-w-md">
          {notifications.map((n) => (
            <NotificationToast key={n.id} notification={n} onClose={removeNotification} />
          ))}
        </div>

        <h1 className="text-2xl font-bold text-headings mb-6">Customers</h1>
        <p className="text-secondary mb-8">Manage customer addresses, notes, payments, and additional info.</p>

        {/* All Customers Table (static) */}
        <div className="bg-card rounded-xl shadow-sm border border-theme overflow-hidden mb-8">
          <div className="px-6 py-4 border-b border-theme bg-card flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-headings">All Customers</h2>
              <p className="text-sm text-secondary mt-0.5">Add new customers via the sidebar.</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleExportCustomers}
                title="Export to Excel"
                className="w-9 h-9 bg-[var(--accent-navyblue)] !text-white rounded-lg flex items-center justify-center transition-colors shadow-md"
              >
                <FileDown className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => { setEditingId(null); resetForm(); setAddCustomerSidebarOpen(true); }}
                className="flex items-center gap-2 px-4 py-2 bg-[var(--accent-navyblue)] !text-white text-sm font-medium rounded-lg hover:bg-blue-700"
              >
                <FaPlus size={14} /> Add Customer
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-card text-headings uppercase text-xs font-semibold">
                <tr>
                  <th className="px-6 py-4">Name</th>
                  <th className="px-6 py-4">Email</th>
                  <th className="px-6 py-4">Phone</th>
                  <th className="px-6 py-4">Billing City</th>
                  <th className="px-6 py-4">Province / State</th>
                  <th className="px-6 py-4">Country</th>
                  <th className="px-6 py-4">Customer Type</th>
                  <th className="px-6 py-4">Terms</th>
                  <th className="px-6 py-4">Payment Method</th>
                  <th className="px-6 py-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 divide-white/5">
                {customersLoading ? (
                  <tr>
                    <td colSpan={10} className="px-6 py-8 text-center text-secondary">
                      Loading customers...
                    </td>
                  </tr>
                ) : customersError ? (
                  <tr>
                    <td colSpan={10} className="px-6 py-8 text-center text-[#A855F7]">
                      {customersError}
                    </td>
                  </tr>
                ) : customers.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-6 py-8 text-center text-secondary">
                      No customers yet. Add one using the button above.
                    </td>
                  </tr>
                ) : (
                  customers.map((row) => (
                    <tr
                      key={row.id}
                      className="hover:bg-[rgba(255,255,255,0.03)] cursor-pointer"
                      onClick={() => openEdit(row.id)}
                    >
                      <td className="px-6 py-4 font-medium text-secondary">{row.name}</td>
                      <td className="px-6 py-4 text-secondary">{row.email || '—'}</td>
                      <td className="px-6 py-4 text-secondary">{row.phone || '—'}</td>
                      <td className="px-6 py-4 text-secondary">{row.billingCity || '—'}</td>
                      <td className="px-6 py-4 text-secondary">{row.billingProvinceState || '—'}</td>
                      <td className="px-6 py-4 text-secondary">{row.country || '—'}</td>
                      <td className="px-6 py-4 text-secondary">{row.customerType || '—'}</td>
                      <td className="px-6 py-4 text-secondary">{row.terms || '—'}</td>
                      <td className="px-6 py-4 text-secondary">{row.paymentMethod || '—'}</td>
                      <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => openDetail(row.id)}
                            className="text-[#00D1FF] hover:text-blue-800 p-1"
                            title="View"
                          >
                            <FaEye size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => openEdit(row.id)}
                            className="text-secondary hover:text-headings p-1"
                            title="Edit"
                          >
                            <FaEdit size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteClick(row.id, row.name)}
                            disabled={deletingId === row.id}
                            className="text-[#A855F7] hover:text-red-800 p-1 disabled:opacity-50"
                            title="Delete"
                          >
                            <FaTrash size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Sidebar modal: Add new customer */}
        {addCustomerSidebarOpen && (
          <>
            <div
              className="fixed inset-0 bg-black/40 z-40"
              onClick={handleCloseSidebar}
              aria-hidden="true"
            />
            <div className="fixed top-0 right-0 h-full w-full max-w-xl bg-card shadow-xl z-50 flex flex-col">
              <div className="flex-shrink-0 px-6 py-4 border-b border-theme flex items-center justify-between">
                <h2 className="text-lg font-semibold text-headings">{editingId ? 'Edit customer' : 'Add new customer'}</h2>
                <button
                  type="button"
                  onClick={handleCloseSidebar}
                  className="p-2 text-secondary hover:text-headings hover:bg-[rgba(255,255,255,0.03)] rounded"
                  aria-label="Close"
                >
                  <FaTimes size={20} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
                {/* Customer Name (required) */}
                <div className="bg-card rounded-lg border border-theme p-4">
                  <label className="block text-sm font-medium text-headings mb-1">
                    Customer Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${errors.customerName ? 'border-red-500' : 'border-theme'}`}
                    placeholder="Company or contact name"
                  />
                  {errors.customerName && <p className="text-red-500 text-xs mt-1">{errors.customerName}</p>}
                </div>
                {/* Contact info: Email, Phone, Contact Person */}
                <div className="bg-card rounded-lg border border-theme p-4">
                  <h3 className="text-base font-semibold text-headings mb-3">Contact & main info</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-headings mb-1">Email <span className="text-red-500">*</span></label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${errors.email ? 'border-red-500' : 'border-theme'}`}
                        placeholder="billing@company.com"
                      />
                      {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-headings mb-1">Phone</label>
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="+1 234 567 8900"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-headings mb-1">Contact Person</label>
                      <input
                        type="text"
                        value={contactPerson}
                        onChange={(e) => setContactPerson(e.target.value)}
                        className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Name of main contact (optional)"
                      />
                    </div>
                  </div>
                </div>
                {/* 1. Addresses */}
                <div className="bg-card rounded-lg border border-theme p-4">
                  <h3 className="text-base font-semibold text-headings mb-3 flex items-center gap-2">
                    <FaMapMarkerAlt className="text-[#00D1FF]" />
                    Addresses
                  </h3>
                  <p className="text-sm text-secondary mb-4">
                    Billing and shipping addresses for where the customer lives or works and where they receive goods.
                  </p>
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-sm font-medium text-headings mb-3">Billing Address</h3>
                      <div className="mb-4">
                        <AddressSearch
                          label="Search billing address"
                          placeholder="Search for a billing address..."
                          onAddressSelect={(addr) => {
                            setBilling((prev) => ({
                              ...prev,
                              streetAddress1: addr.address || prev.streetAddress1,
                              streetAddress2: prev.streetAddress2,
                              city: addr.city || prev.city,
                              provinceState: addr.state || prev.provinceState,
                              postalZip: addr.postalCode || prev.postalZip,
                              country: addr.country || prev.country,
                            }));
                            if (sameAsBilling) {
                              setShipping((prev) => ({
                                ...prev,
                                streetAddress1: addr.address || prev.streetAddress1,
                                streetAddress2: prev.streetAddress2,
                                city: addr.city || prev.city,
                                provinceState: addr.state || prev.provinceState,
                                postalZip: addr.postalCode || prev.postalZip,
                                country: addr.country || prev.country,
                              }));
                            }
                          }}
                        />
                      </div>
                      {renderAddressFields(billing, handleBillingChange, { errors })}
                    </div>
                    <div>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={sameAsBilling}
                          onChange={(e) => setSameAsBilling(e.target.checked)}
                          className="rounded border-theme text-[#00D1FF] focus:ring-blue-500"
                        />
                        <span className="text-sm font-medium text-headings">Same as billing address</span>
                      </label>
                    </div>
                    {!sameAsBilling && (
                      <div>
                        <h3 className="text-sm font-medium text-headings mb-3">Shipping Address</h3>
                        <div className="mb-4">
                          <AddressSearch
                            label="Search shipping address"
                            placeholder="Search for a shipping address..."
                            onAddressSelect={(addr) => {
                              setShipping((prev) => ({
                                ...prev,
                                streetAddress1: addr.address || prev.streetAddress1,
                                streetAddress2: prev.streetAddress2,
                                city: addr.city || prev.city,
                                provinceState: addr.state || prev.provinceState,
                                postalZip: addr.postalCode || prev.postalZip,
                                country: addr.country || prev.country,
                              }));
                            }}
                          />
                        </div>
                        {renderAddressFields(shipping, handleShippingChange)}
                      </div>
                    )}
                  </div>
                </div>

                {/* 2. Notes and Attachments */}
                <div className="bg-card rounded-lg border border-theme p-4">
                  <h3 className="text-base font-semibold text-headings mb-3 flex items-center gap-2">
                    <FaStickyNote className="text-[#00D1FF]" />
                    Notes and Attachments
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-headings mb-2">Notes</label>
                      <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        rows={4}
                        className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Internal comments (e.g., Customer prefers afternoon deliveries)"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-headings mb-2">Attachments</label>
                      <p className="text-xs text-secondary mb-2">Contracts, tax-exempt certificates, or photos. Max {MAX_FILE_SIZE_MB} MB per file.</p>
                      <div
                        onDragEnter={handleDrag}
                        onDragLeave={handleDrag}
                        onDragOver={handleDrag}
                        onDrop={handleDrop}
                        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${dragActive ? 'border-blue-500 bg-card' : 'border-theme bg-card hover:border-gray-400'
                          }`}
                      >
                        <input
                          type="file"
                          id="attachments"
                          multiple
                          onChange={handleFileSelect}
                          className="hidden"
                        />
                        <label htmlFor="attachments" className="cursor-pointer">
                          <p className="text-secondary mb-1">Click to select files or drag and drop</p>
                          <p className="text-sm text-secondary">PDF, images, documents (max {MAX_FILE_SIZE_MB} MB)</p>
                        </label>
                      </div>
                      {attachments.length > 0 && (
                        <ul className="mt-3 space-y-1">
                          {attachments.map((file, i) => (
                            <li key={i} className="flex items-center justify-between text-sm text-headings bg-card px-3 py-2 rounded">
                              <span className="truncate">{file.name}</span>
                              <button
                                type="button"
                                onClick={() => removeAttachment(i)}
                                className="text-[#A855F7] hover:text-red-800 ml-2"
                              >
                                <FaTimes size={14} />
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                </div>

                {/* 3. Payments */}
                <div className="bg-card rounded-lg border border-theme p-4">
                  <h3 className="text-base font-semibold text-headings mb-3 flex items-center gap-2">
                    <FaCreditCard className="text-[#00D1FF]" />
                    Payments
                  </h3>
                  <p className="text-sm text-secondary mb-3">
                    How you get paid and how the customer receives invoices.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-headings mb-1">Primary Payment Method <span className="text-red-500">*</span></label>
                      <p className="text-xs text-secondary mb-1">How this customer usually pays (e.g. Credit Card, Check).</p>
                      <select
                        value={primaryPaymentMethod}
                        onChange={(e) => setPrimaryPaymentMethod(e.target.value)}
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${errors.primaryPaymentMethod ? 'border-red-500' : 'border-theme'}`}
                      >
                        <option className='form-option' value="">Select...</option>
                        {paymentMethods.map((opt) => (
                          <option className='form-option' key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                      {errors.primaryPaymentMethod && <p className="text-red-500 text-xs mt-1">{errors.primaryPaymentMethod}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-headings mb-1">Terms <span className="text-red-500">*</span></label>
                      <p className="text-xs text-secondary mb-1">When payment is due (e.g. Net 30 = due in 30 days).</p>
                      <select
                        value={terms}
                        onChange={(e) => setTerms(e.target.value)}
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${errors.terms ? 'border-red-500' : 'border-theme'}`}
                      >
                        <option className='form-option' value="">Select...</option>
                        {termsOptions.map((opt) => (
                          <option className='form-option' key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                      {errors.terms && <p className="text-red-500 text-xs mt-1">{errors.terms}</p>}
                    </div>
                  </div>
                </div>

                {/* 4. Additional Info */}
                <div className="bg-card rounded-lg border border-theme p-4">
                  <h3 className="text-base font-semibold text-headings mb-3 flex items-center gap-2">
                    <FaInfoCircle className="text-[#00D1FF]" />
                    Additional Info
                  </h3>
                  <p className="text-sm text-secondary mb-3">Tax and accounting data.</p>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-headings mb-1">Customer Type <span className="text-red-500">*</span></label>
                      <select
                        value={customerType}
                        onChange={(e) => setCustomerType(e.target.value)}
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${errors.customerType ? 'border-red-500' : 'border-theme'}`}
                      >
                        <option className='form-option' value="">Select...</option>
                        {customerTypes.map((opt) => (
                          <option className='form-option' key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                      {errors.customerType && <p className="text-red-500 text-xs mt-1">{errors.customerType}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-headings mb-1">Taxes – Business Number</label>
                      <input
                        type="text"
                        value={businessNumber}
                        onChange={(e) => setBusinessNumber(e.target.value)}
                        className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Business number"
                      />
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={assignDefaultTaxCode}
                        onChange={(e) => setAssignDefaultTaxCode(e.target.checked)}
                        className="rounded border-theme text-[#00D1FF] focus:ring-blue-500"
                      />
                      <span className="text-sm font-medium text-headings">Assign default tax code</span>
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-headings mb-1">Opening Balance – Amount</label>
                        <p className="text-xs text-secondary mb-1">Optional – use when customer has an existing balance at onboarding.</p>
                        <input
                          type="text"
                          value={openingBalanceAmount}
                          onChange={(e) => setOpeningBalanceAmount(e.target.value)}
                          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${errors.openingBalanceAmount ? 'border-red-500' : 'border-theme'}`}
                          placeholder="0.00"
                        />
                        {errors.openingBalanceAmount && <p className="text-red-500 text-xs mt-1">{errors.openingBalanceAmount}</p>}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-headings mb-1">Opening Balance – As of Date</label>
                        <p className="text-xs text-secondary mb-1">Date of the opening balance (if used).</p>
                        <input
                          type="date"
                          value={openingBalanceAsOf}
                          onChange={(e) => setOpeningBalanceAsOf(e.target.value)}
                          className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>

              </div>
              <div className="flex-shrink-0 px-6 py-4 border-t border-theme bg-card flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={handleCloseSidebar}
                  className="px-4 py-2 text-sm font-medium text-primary bg-card border border-theme rounded-lg hover:bg-[rgba(255,255,255,0.03)]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="px-4 py-2 text-sm font-medium !text-white bg-[var(--accent-navyblue)] rounded-lg hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {saving ? 'Saving...' : editingId ? 'Update Customer' : 'Save Customer'}
                </button>
              </div>
            </div>
          </>
        )}

        {/* Detail sidebar: View customer */}
        {detailCustomerId && (
          <>
            <div
              className="fixed inset-0 bg-black/40 z-40"
              onClick={() => { setDetailCustomerId(null); setDetailCustomer(null); }}
              aria-hidden="true"
            />
            <div className="fixed top-0 right-0 h-full w-full max-w-xl bg-card shadow-xl z-50 flex flex-col">
              <div className="flex-shrink-0 px-6 py-4 border-b border-theme flex items-center justify-between">
                <h2 className="text-lg font-semibold text-headings">Customer details</h2>
                <button
                  type="button"
                  onClick={() => { setDetailCustomerId(null); setDetailCustomer(null); }}
                  className="p-2 text-secondary hover:text-headings hover:bg-[rgba(255,255,255,0.03)] rounded"
                  aria-label="Close"
                >
                  <FaTimes size={20} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto px-6 py-4">
                {detailLoading ? (
                  <p className="text-secondary">Loading...</p>
                ) : detailCustomer ? (
                  <div className="space-y-4">
                    <div className="bg-card rounded-lg border border-theme p-4">
                      <h3 className="text-sm font-semibold text-headings mb-2">Contact</h3>
                      <p><span className="text-secondary">Name:</span> {detailCustomer.name ?? '—'}</p>
                      <p><span className="text-secondary">Email:</span> {detailCustomer.email ?? '—'}</p>
                      <p><span className="text-secondary">Phone:</span> {detailCustomer.phone ?? '—'}</p>
                      <p><span className="text-secondary">Contact person:</span> {detailCustomer.contactPerson ?? '—'}</p>
                    </div>
                    {detailCustomer.billing && (
                      <div className="bg-card rounded-lg border border-theme p-4">
                        <h3 className="text-sm font-semibold text-headings mb-2">Billing address</h3>
                        <p>{[detailCustomer.billing.streetAddress1, detailCustomer.billing.streetAddress2, detailCustomer.billing.city, detailCustomer.billing.provinceState, detailCustomer.billing.postalZip, detailCustomer.billing.country].filter(Boolean).join(', ') || '—'}</p>
                      </div>
                    )}
                    {detailCustomer.shipping && !detailCustomer.sameAsBilling && (
                      <div className="bg-card rounded-lg border border-theme p-4">
                        <h3 className="text-sm font-semibold text-headings mb-2">Shipping address</h3>
                        <p>{[detailCustomer.shipping.streetAddress1, detailCustomer.shipping.streetAddress2, detailCustomer.shipping.city, detailCustomer.shipping.provinceState, detailCustomer.shipping.postalZip, detailCustomer.shipping.country].filter(Boolean).join(', ') || '—'}</p>
                      </div>
                    )}
                    <div className="bg-card rounded-lg border border-theme p-4">
                      <h3 className="text-sm font-semibold text-headings mb-2">Payment & terms</h3>
                      <p><span className="text-secondary">Payment method:</span> {detailCustomer.primaryPaymentMethod ?? '—'}</p>
                      <p><span className="text-secondary">Terms:</span> {detailCustomer.terms ?? '—'}</p>
                      <p><span className="text-secondary">Customer type:</span> {detailCustomer.customerType ?? '—'}</p>
                      {detailCustomer.businessNumber && <p><span className="text-secondary">Business number:</span> {detailCustomer.businessNumber}</p>}
                    </div>
                    {detailCustomer.notes && (
                      <div className="bg-card rounded-lg border border-theme p-4">
                        <h3 className="text-sm font-semibold text-headings mb-2">Notes</h3>
                        <p className="text-headings whitespace-pre-wrap">{detailCustomer.notes}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-secondary">Could not load customer.</p>
                )}
              </div>
            </div>
          </>
        )}

        {/* Delete confirmation modal */}
        <ConfirmationModal
          isOpen={showDeleteConfirmation}
          onClose={() => {
            setShowDeleteConfirmation(false);
            setDeleteTargetId(null);
            setDeleteTargetName('');
          }}
          onConfirm={handleDeleteConfirm}
          title="Delete customer"
          message={`Are you sure you want to delete "${deleteTargetName}"? This action cannot be undone.`}
          confirmText="Delete"
          type="danger"
          isLoading={!!deletingId}
        />
      </div>
    </div>
  );
};

export default FleetMaintenanceCustomers;
