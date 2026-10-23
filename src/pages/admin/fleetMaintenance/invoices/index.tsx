import { useState, useMemo, useEffect, useRef } from 'react';
import jsPDF from 'jspdf';
import DocLogo from '../../../../assets/doclogo.png';
import {
  FaFileInvoice,
  FaPlus,
  FaTimes,
  FaCheckCircle,
  FaEdit,
  FaPrint,
  FaTrash,
  FaEnvelope,
  FaClock,
  FaMoneyBillWave,
  FaUpload,
  FaSpinner,
  FaFilePdf,
} from 'react-icons/fa';

import { getFleetCustomers, createFleetCustomer, type FleetCustomer } from '../../../../axios/api/fleet.customers';
import { listVehicleServices, type VehicleServiceResponse } from '../../../../axios/api/vehicleService';
import { listGeneralRepairs, type GeneralRepairDto } from '../../../../axios/api/generalRepairs';
import { getCompany } from '../../../../axios/api/admin';
import {
  getFleetInvoices,
  getFleetInvoiceSummary,
  createFleetInvoice,
  updateFleetInvoice,
  deleteFleetInvoice,
  getFleetInvoiceById,
  emailFleetInvoice,
  updateFleetInvoiceStatus,
  uploadExtractFleetInvoice,
} from '../../../../axios/api/fleet.invoices';

const TERMS_OPTIONS = [
  { value: 'Net 15', days: 15 },
  { value: 'Net 30', days: 30 },
  { value: 'Net 45', days: 45 },
  { value: 'Net 60', days: 60 },
];

// Helper: convert service name to kebab-case key (same logic as Scheduled Services Log)
const nameToServiceType = (name: string): string => {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

interface CustomServiceDef {
  name: string;
}

// Map serviceType key (e.g. "oil-change") to human label using company custom services if available
const getServiceTypeLabel = (value: string, customServices?: CustomServiceDef[]) => {
  if (customServices && customServices.length) {
    const customMatch = customServices.find((service) => nameToServiceType(service.name) === value);
    if (customMatch) return customMatch.name;
  }

  const formatted = value.replace(/-/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
  return formatted;
};

/** Tax: name + percentage. id used for selection (predefined or custom-xxx). */
interface TaxOption {
  id: string;
  name: string;
  percent: number;
}

const DEFAULT_TAXES: TaxOption[] = [
  { id: 'gst', name: 'GST', percent: 5 },
  { id: 'pst', name: 'PST', percent: 7 },
  { id: 'hst', name: 'HST', percent: 13 },
  { id: 'none', name: 'No Tax', percent: 0 },
];

/** One line item in the invoice form */
interface LineItem {
  id: string;
  serviceDate: string;
  productService: string; // stores option id (e.g. "service:<id>" or "repair:<id>")
  description: string;
  qty: number;
  rate: number;
  amount: number;
  salesTax: string;
}

interface ProductOption {
  id: string; // unique key used in <select> value
  label: string; // display label
  defaultDescription?: string;
  defaultRate?: number;
  defaultQty?: number;
  defaultServiceDate?: string; // YYYY-MM-DD
}

/** Invoice row for the table */
interface InvoiceRow {
  _id: string;
  invoiceDate: string;
  invoiceNumber: string;
  customerName: string;
  total: number;
  status: 'draft' | 'sent' | 'paid' | 'cancelled' | 'overdue';
  dueDate?: string;
  customerEmail?: string;
  items?: Array<{
    productService?: string;
    description?: string;
    [key: string]: any;
  }>;
  vehicleInfo?: Array<{
    unitNumber: string;
    unitType?: string;
    makeModel?: string;
    vinNumber?: string;
    plateNumber?: string;
  }>;
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T12:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

/** Format YYYY-MM-DD to DD/MM/YY for display */
function formatDisplayDate(isoDate: string): string {
  if (!isoDate) return '—';
  try {
    const [y, m, d] = isoDate.split('-');
    if (!y || !m || !d) return isoDate;
    const yy = y.length === 4 ? y.slice(-2) : y;
    return `${d}/${m}/${yy}`;
  } catch {
    return isoDate;
  }
}

const FleetInvoicesPage = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [editingInvoiceId, setEditingInvoiceId] = useState<string | null>(null);
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [invoicesLoading, setInvoicesLoading] = useState(false);
  const [invoicesError, setInvoicesError] = useState<string | null>(null);
  const [summary, setSummary] = useState<{
    paidAmount: number;
    paidCount: number;
    unpaidAmount: number;
    unpaidCount: number;
    overdueAmount: number;
    overdueCount: number;
    totalAmount: number;
    totalCount: number;
  } | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [emailingId, setEmailingId] = useState<string | null>(null);
  const [emailToast, setEmailToast] = useState<{
    invoiceNumber: string;
    customerName: string;
    customerEmail: string;
  } | null>(null);
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);
  const [printingPdfId, setPrintingPdfId] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Upload & Extract state
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadDragging, setUploadDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Extracted vendor name — used when no existing customer matches
  const [extractedVendorName, setExtractedVendorName] = useState('');

  const INVOICE_STATUS_OPTIONS = [
    { value: 'draft', label: 'Draft' },
    { value: 'sent', label: 'Sent' },
    { value: 'paid', label: 'Paid' },
    { value: 'cancelled', label: 'Cancelled' },
  ];

  const [customers, setCustomers] = useState<FleetCustomer[]>([]);
  const [customersLoading, setCustomersLoading] = useState(false);
  const [customersError, setCustomersError] = useState<string | null>(null);
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerEmail, setNewCustomerEmail] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');
  const [addingCustomer, setAddingCustomer] = useState(false);
  const [addCustomerError, setAddCustomerError] = useState<string | null>(null);

  const [productOptions, setProductOptions] = useState<ProductOption[]>([]);
  const [productOptionsLoading, setProductOptionsLoading] = useState(false);

  const [, setCustomServices] = useState<CustomServiceDef[]>([]);

  // Vehicle information from invoice items
  const [vehicleInfo, setVehicleInfo] = useState<Array<{
    unitNumber: string;
    unitType?: string;
    makeModel?: string;
    vinNumber?: string;
    plateNumber?: string;
  }>>([]);

  // Step 1: Header
  const [customerId, setCustomerId] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [billingAddress, setBillingAddress] = useState('');
  const [terms, setTerms] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState('');
  const [invoiceNo, setInvoiceNo] = useState('');

  // Step 2: Line items
  const [lineItems, setLineItems] = useState<LineItem[]>([
    { id: '1', serviceDate: '', productService: '', description: '', qty: 1, rate: 0, amount: 0, salesTax: 'gst' },
  ]);

  const [customTaxes, setCustomTaxes] = useState<TaxOption[]>([]);
  const [addingTaxForLineId, setAddingTaxForLineId] = useState<string | null>(null);
  const [newTaxName, setNewTaxName] = useState('');
  const [newTaxPercent, setNewTaxPercent] = useState<number>(5);

  const allTaxes = useMemo(() => [...DEFAULT_TAXES, ...customTaxes], [customTaxes]);

  const addCustomTax = (lineId: string) => {
    const name = newTaxName.trim();
    if (!name || newTaxPercent < 0 || newTaxPercent > 100) return;
    const id = `custom-${Date.now()}`;
    setCustomTaxes((prev) => [...prev, { id, name, percent: newTaxPercent }]);
    updateLineItem(lineId, { salesTax: id });
    setAddingTaxForLineId(null);
    setNewTaxName('');
    setNewTaxPercent(5);
  };

  const removeCustomTax = (taxId: string) => {
    setCustomTaxes((prev) => prev.filter((t) => t.id !== taxId));
    setLineItems((prev) =>
      prev.map((item) => (item.salesTax === taxId ? { ...item, salesTax: 'gst' as const } : item))
    );
  };

  const [messageOnInvoice, setMessageOnInvoice] = useState('');

  // Labour charges (outside line items)
  const [labourHours, setLabourHours] = useState<number>(0);
  const [labourRate, setLabourRate] = useState<number>(0);
  const [labourTax, setLabourTax] = useState<string>('gst');

  const selectedCustomer = customers.find((c) => c._id === customerId);

  const formatBillingAddress = (cust?: FleetCustomer | null) => {
    if (!cust || !cust.billing) return '';
    const parts = [
      cust.billing.streetAddress1,
      cust.billing.streetAddress2,
      cust.billing.city,
      cust.billing.provinceState,
      cust.billing.postalZip,
      cust.billing.country,
    ]
      .map((x) => x?.trim())
      .filter(Boolean);
    return parts.join(', ');
  };

  useEffect(() => {
    const loadCustomers = async () => {
      setCustomersLoading(true);
      setCustomersError(null);
      try {
        const res = await getFleetCustomers();
        if (res?.success && Array.isArray(res.data)) {
          setCustomers(res.data);
        } else {
          setCustomers([]);
          setCustomersError((res as { message?: string })?.message || 'Unable to load customers.');
        }
      } catch (err: any) {
        console.error('Failed to load fleet customers', err);
        setCustomers([]);
        setCustomersError(err?.response?.data?.message || err?.message || 'Unable to load customers.');
      } finally {
        setCustomersLoading(false);
      }
    };

    const loadProductOptions = async () => {
      setProductOptionsLoading(true);
      try {
        const [companyRes, servicesRes, repairsRes] = await Promise.all([
          getCompany(),
          listVehicleServices({ status: 'completed' }),
          listGeneralRepairs(),
        ]);

        const companyCustomServices: CustomServiceDef[] =
          companyRes?.success && companyRes?.data?.maintenancePolicies?.customServices
            ? companyRes.data.maintenancePolicies.customServices
            : [];
        setCustomServices(companyCustomServices);

        const completedServices: VehicleServiceResponse[] =
          servicesRes?.success && Array.isArray(servicesRes.data)
            ? (servicesRes.data as VehicleServiceResponse[]).filter((s) => s.status === 'completed')
            : [];

        const allRepairs: GeneralRepairDto[] =
          repairsRes?.success && Array.isArray(repairsRes.data)
            ? repairsRes.data
            : [];

        const verifiedRepairs = allRepairs.filter(
          (r: any) => r.status === 'completed' && r.verificationStatus === 'verified',
        );

        const serviceOptions: ProductOption[] = completedServices.map((s) => {
          const labelBase = getServiceTypeLabel(String(s.serviceType), companyCustomServices);
          const unit = s.unitNumber || s.vehicleId?.internalId || s.vehicleId?.plateNumber || '';
          const dateStr = (s.serviceDate || s.dueDate || '').split('T')[0] || '';
          const labelParts = ['Service:', labelBase];
          if (unit) {
            labelParts.push(`(Unit ${unit}${dateStr ? `, ${dateStr}` : ''})`);
          }
          const label = labelParts.join(' ');

          const defaultDescriptionParts: string[] = [];
          if (unit) defaultDescriptionParts.push(`Unit ${unit}`);
          defaultDescriptionParts.push(labelBase);
          if (s.notes) defaultDescriptionParts.push(String(s.notes));

          return {
            id: `service:${s._id}`,
            label,
            defaultDescription: defaultDescriptionParts.join(' - '),
            defaultRate: s.amount ?? undefined,
            defaultQty: 1,
            defaultServiceDate: dateStr,
          };
        });

        const repairOptions: ProductOption[] = verifiedRepairs.map((r: any) => {
          const details: string =
            r.repairDetails || r.description || 'Verified maintenance order';
          const shortDetails =
            details.length > 80 ? `${details.slice(0, 77)}...` : details;
          const unit = r.unitNumber || '';
          const dateStr = (r.completionDate || r.serviceDate || '').split('T')[0] || '';
          const label = `Maintenance: ${shortDetails}`;

          const defaultDescriptionParts: string[] = [];
          if (unit) defaultDescriptionParts.push(`Unit ${unit}`);
          defaultDescriptionParts.push(details);

          return {
            id: `repair:${r._id}`,
            label,
            defaultDescription: defaultDescriptionParts.join(' - '),
            defaultRate: (r as any).completionTotalAmount ?? undefined,
            defaultQty: 1,
            defaultServiceDate: dateStr,
          };
        });

        setProductOptions([...serviceOptions, ...repairOptions]);
      } catch (err) {
        console.error('Failed to load invoice product/service options', err);
      } finally {
        setProductOptionsLoading(false);
      }
    };

    loadCustomers();
    loadProductOptions();
    loadInvoices();
    loadSummary();
  }, []);

  // Extract vehicle information from invoice items (fetches full vehicle details)
  const extractVehicleInfo = async (invoice: any): Promise<Array<{
    unitNumber: string;
    unitType?: string;
    makeModel?: string;
    vinNumber?: string;
    plateNumber?: string;
  }>> => {
    if (!invoice.items || !Array.isArray(invoice.items) || invoice.items.length === 0) {
      return [];
    }

    return await fetchVehicleInfoFromItems(invoice.items);
  };

  // Load invoices from API
  const loadInvoices = async () => {
    setInvoicesLoading(true);
    setInvoicesError(null);
    try {
      const response = await getFleetInvoices();
      if (response?.success && Array.isArray(response.data)) {
        // Extract vehicle information for each invoice (async - fetches from services/repairs)
        const invoicesWithVehicles = await Promise.all(
          response.data.map(async (invoice: any) => {
            const vehicleInfo = await extractVehicleInfo(invoice);
            return { ...invoice, vehicleInfo };
          })
        );
        setInvoices(invoicesWithVehicles);
      } else {
        setInvoices([]);
        setInvoicesError(response?.message || 'Failed to load invoices');
      }
    } catch (err: any) {
      setInvoices([]);
      setInvoicesError(err?.response?.data?.message || err?.message || 'Failed to load invoices');
    } finally {
      setInvoicesLoading(false);
    }
  };

  // Load invoice summary
  const loadSummary = async () => {
    setSummaryLoading(true);
    try {
      const response = await getFleetInvoiceSummary();
      if (response?.success && response.data) {
        setSummary(response.data);
      } else {
        setSummary(null);
      }
    } catch {
      setSummary(null);
    } finally {
      setSummaryLoading(false);
    }
  };

  // Auto-hide notification after 4 seconds
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // When customer changes, auto-fill email and billing address
  const handleCustomerChange = (id: string) => {
    setCustomerId(id);
    setExtractedVendorName(''); // clear extracted name when user picks from dropdown
    const c = customers.find((x) => x._id === id);
    if (c) {
      setCustomerEmail(c.email || '');
      setBillingAddress(formatBillingAddress(c));
      if (!terms && c.terms) {
        setTerms(c.terms);
      }
    } else {
      setCustomerEmail('');
      setBillingAddress('');
    }
  };

  const handleAddNewCustomer = async () => {
    if (!newCustomerName.trim()) {
      setAddCustomerError('Customer name is required.');
      return;
    }
    setAddingCustomer(true);
    setAddCustomerError(null);
    try {
      const res = await createFleetCustomer({
        name: newCustomerName.trim(),
        email: newCustomerEmail.trim(),
        phone: newCustomerPhone.trim() || undefined,
      });
      if (res?.success && res.data) {
        setCustomers((prev) => [...prev, res.data as FleetCustomer]);
        handleCustomerChange(res.data._id);
        setShowAddCustomer(false);
        setNewCustomerName('');
        setNewCustomerEmail('');
        setNewCustomerPhone('');
      } else {
        setAddCustomerError(res?.message || 'Failed to create customer.');
      }
    } catch (err: any) {
      setAddCustomerError(err?.response?.data?.message || err?.message || 'Failed to create customer.');
    } finally {
      setAddingCustomer(false);
    }
  };

  // When terms or invoice date changes, recalc due date
  const handleTermsChange = (value: string) => {
    setTerms(value);
    const opt = TERMS_OPTIONS.find((o) => o.value === value);
    if (opt && invoiceDate) setDueDate(addDays(invoiceDate, opt.days));
  };

  const handleInvoiceDateChange = (value: string) => {
    setInvoiceDate(value);
    const opt = TERMS_OPTIONS.find((o) => o.value === terms);
    if (opt && value) setDueDate(addDays(value, opt.days));
  };

  const updateLineItem = (id: string, updates: Partial<LineItem>) => {
    setLineItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const next = { ...item, ...updates };

        // If product/service changed, always update description, rate, qty, and service date
        if (updates.productService !== undefined) {
          if (updates.productService === '') {
            // If cleared, reset to defaults
            next.description = '';
            next.rate = 0;
            next.qty = 1;
            next.serviceDate = '';
          } else {
            const selectedOption = productOptions.find((opt) => opt.id === updates.productService);
            if (selectedOption) {
              // Always update all fields when a product/service is selected
              if (selectedOption.defaultDescription) {
                next.description = selectedOption.defaultDescription;
              }
              if (selectedOption.defaultRate !== undefined) {
                next.rate = selectedOption.defaultRate;
              }
              if (selectedOption.defaultQty !== undefined) {
                next.qty = selectedOption.defaultQty;
              }
              if (selectedOption.defaultServiceDate) {
                next.serviceDate = selectedOption.defaultServiceDate;
              }
            }
          }
        }

        // Always recalculate amount when qty or rate changes (including auto-filled values)
        if ('qty' in updates || 'rate' in updates || updates.productService !== undefined) {
          next.amount = (next.qty ?? 1) * (next.rate ?? 0);
        }
        return next;
      })
    );
  };

  const addLineItem = () => {
    setLineItems((prev) => [
      ...prev,
      { id: String(Date.now()), serviceDate: '', productService: '', description: '', qty: 1, rate: 0, amount: 0, salesTax: 'gst' },
    ]);
  };

  const removeLineItem = (id: string) => {
    if (lineItems.length <= 1) return;
    setLineItems((prev) => prev.filter((i) => i.id !== id));
  };

  // Calculate items subtotal and tax
  const itemsSubtotal = useMemo(() => lineItems.reduce((sum, i) => sum + i.amount, 0), [lineItems]);
  const itemsTax = useMemo(() => {
    return lineItems.reduce((sum, item) => {
      const tax = allTaxes.find((t) => t.id === item.salesTax);
      const rate = tax ? tax.percent / 100 : 0;
      return sum + item.amount * rate;
    }, 0);
  }, [lineItems, allTaxes]);

  // Calculate labour amount and tax
  const labourAmount = useMemo(() => labourHours * labourRate, [labourHours, labourRate]);
  const labourTaxAmount = useMemo(() => {
    const tax = allTaxes.find((t) => t.id === labourTax);
    const rate = tax ? tax.percent / 100 : 0;
    return labourAmount * rate;
  }, [labourAmount, labourTax, allTaxes]);

  // Final totals
  const subtotal = itemsSubtotal + labourAmount; // Items + Labour
  const totalTax = itemsTax + labourTaxAmount; // Items tax + Labour tax
  const totalBalance = subtotal + totalTax;

  const handleSaveAndClose = async () => {
    // Validation
    if (!customerId && !extractedVendorName.trim()) {
      setNotification({ type: 'error', message: 'Please select a customer or upload an invoice to extract vendor details' });
      return;
    }
    if (lineItems.length === 0 || lineItems.some(item => !item.description || item.rate === 0)) {
      setNotification({ type: 'error', message: 'Please add at least one valid line item with description and rate' });
      return;
    }

    setSaving(true);
    try {
      // Build invoice items from line items
      const invoiceItems = lineItems.map((item) => {
        const tax = allTaxes.find((t) => t.id === item.salesTax);
        return {
          serviceDate: item.serviceDate || null,
          productService: item.productService || null,
          description: item.description,
          quantity: item.qty,
          unitPrice: item.rate,
          totalPrice: item.amount,
          taxId: tax?.id || null,
          taxName: tax?.name || null,
          taxPercent: tax?.percent || 0,
        };
      });

      // Build billing address from customer (if selected) or use extracted/manual address
      const billingAddrParts: string[] = [];
      if (selectedCustomer?.billing) {
        const b = selectedCustomer.billing;
        if (b.streetAddress1) billingAddrParts.push(b.streetAddress1);
        if (b.streetAddress2) billingAddrParts.push(b.streetAddress2);
        const cityParts: string[] = [];
        if (b.city) cityParts.push(b.city);
        if (b.provinceState) cityParts.push(b.provinceState);
        if (b.postalZip) cityParts.push(b.postalZip);
        if (cityParts.length > 0) billingAddrParts.push(cityParts.join(', '));
        if (b.country) billingAddrParts.push(b.country);
      }
      const billingAddressStr = billingAddrParts.length > 0 ? billingAddrParts.join('\n') : billingAddress;

      // Resolve customer name — prefer matched customer, fall back to extracted vendor name
      const resolvedCustomerName = selectedCustomer?.name || extractedVendorName.trim();

      // Get labour tax details
      const labourTaxOption = allTaxes.find((t) => t.id === labourTax);

      const invoiceData = {
        invoiceNumber: invoiceNo || undefined, // Let backend generate if empty
        invoiceDate: invoiceDate,
        customerName: resolvedCustomerName,
        customerEmail: customerEmail || selectedCustomer?.email || null,
        customerPhone: selectedCustomer?.phone || null,
        customerAddress: billingAddressStr || null,
        customerId: customerId || undefined,
        terms: terms || null,
        items: invoiceItems,
        labourHours: labourHours || 0,
        labourRate: labourRate || 0,
        labourTaxId: labourTaxOption?.id || null,
        labourTaxName: labourTaxOption?.name || null,
        labourTaxPercent: labourTaxOption?.percent || 0,
        dueDate: dueDate || invoiceDate, // Use dueDate if set, otherwise invoiceDate
        messageOnInvoice: messageOnInvoice || null,
        notes: null,
        status: 'draft',
      };

      let response;
      if (editingInvoiceId) {
        response = await updateFleetInvoice(editingInvoiceId, invoiceData);
      } else {
        response = await createFleetInvoice(invoiceData);
      }

      if (response?.success) {
        setNotification({
          type: 'success',
          message: editingInvoiceId ? 'Invoice updated successfully' : 'Invoice created successfully'
        });
        setSidebarOpen(false);
        resetForm();
        await Promise.all([loadInvoices(), loadSummary()]);
      } else {
        setNotification({ type: 'error', message: response?.message || 'Failed to save invoice' });
      }
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err?.response?.data?.message || err?.message || 'Failed to save invoice'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteInvoice = async (invoiceId: string) => {
    if (!confirm('Are you sure you want to delete this invoice? This action cannot be undone.')) {
      return;
    }

    setDeleting(invoiceId);
    try {
      const response = await deleteFleetInvoice(invoiceId);
      if (response?.success) {
        setNotification({ type: 'success', message: 'Invoice deleted successfully' });
        await Promise.all([loadInvoices(), loadSummary()]);
      } else {
        setNotification({ type: 'error', message: response?.message || 'Failed to delete invoice' });
      }
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err?.response?.data?.message || err?.message || 'Failed to delete invoice'
      });
    } finally {
      setDeleting(null);
    }
  };

  // Fetch vehicle information from invoice items
  const fetchVehicleInfoFromItems = async (items: any[]) => {
    const vehicleMap = new Map<string, {
      unitNumber: string;
      unitType?: string;
      makeModel?: string;
      vinNumber?: string;
      plateNumber?: string;
    }>();

    for (const item of items) {
      if (item.productService) {
        const [type, id] = item.productService.split(':');

        if (type === 'service' && id) {
          try {
            const serviceRes = await listVehicleServices({});
            if (serviceRes?.success && Array.isArray(serviceRes.data)) {
              const service = (serviceRes.data as any[]).find((s: any) => s._id === id);
              if (service) {
                const unitNo = service.unitNumber ||
                  service.vehicleId?.internalId ||
                  service.vehicleId?.plateNumber ||
                  '';
                if (unitNo && !vehicleMap.has(unitNo)) {
                  vehicleMap.set(unitNo, {
                    unitNumber: unitNo,
                    unitType: service.unitType || service.vehicleId?.type || 'Truck',
                    makeModel: service.makeModel ||
                      (service.vehicleId ? `${service.vehicleId.make || ''} ${service.vehicleId.model || ''}`.trim() : '') ||
                      '',
                    vinNumber: service.vehicleId?.vinNumber || '',
                    plateNumber: service.vehicleId?.plateNumber || ''
                  });
                }
              }
            }
          } catch (err) {
            console.error('Error fetching service for vehicle info:', err);
          }
        } else if (type === 'repair' && id) {
          try {
            const repairRes = await listGeneralRepairs();
            if (repairRes?.success && Array.isArray(repairRes.data)) {
              const repair = (repairRes.data as any[]).find((r: any) => r._id === id);
              if (repair && repair.unitNumber) {
                if (!vehicleMap.has(repair.unitNumber)) {
                  vehicleMap.set(repair.unitNumber, {
                    unitNumber: repair.unitNumber,
                    unitType: repair.unitType || 'Truck',
                    makeModel: repair.makeModel ||
                      (repair.vehicleId ? `${repair.vehicleId.make || ''} ${repair.vehicleId.model || ''}`.trim() : '') ||
                      '',
                    vinNumber: repair.vehicleId?.vinNumber || repair.vinNumber || '',
                    plateNumber: repair.vehicleId?.plateNumber || repair.plateNumber || ''
                  });
                }
              }
            }
          } catch (err) {
            console.error('Error fetching repair for vehicle info:', err);
          }
        }
      }
    }

    return Array.from(vehicleMap.values());
  };

  const handleEditInvoice = async (invoiceId: string) => {
    try {
      const response = await getFleetInvoiceById(invoiceId);
      if (response?.success && response.data) {
        const invoice = response.data;
        setEditingInvoiceId(invoice._id);

        // Fetch vehicle information from invoice items
        if (Array.isArray(invoice.items) && invoice.items.length > 0) {
          const vehicles = await fetchVehicleInfoFromItems(invoice.items);
          setVehicleInfo(vehicles);
        } else {
          setVehicleInfo([]);
        }

        // Set customer
        const customerIdValue = invoice.customerId
          ? (typeof invoice.customerId === 'object' && invoice.customerId._id
            ? invoice.customerId._id
            : invoice.customerId)
          : null;

        if (customerIdValue) {
          setCustomerId(customerIdValue);
          const customer = customers.find(c => c._id === customerIdValue);
          if (customer) {
            setCustomerEmail(customer.email || '');
            // Build billing address
            if (customer.billing) {
              const b = customer.billing;
              const parts: string[] = [];
              if (b.streetAddress1) parts.push(b.streetAddress1);
              if (b.streetAddress2) parts.push(b.streetAddress2);
              const cityParts: string[] = [];
              if (b.city) cityParts.push(b.city);
              if (b.provinceState) cityParts.push(b.provinceState);
              if (b.postalZip) cityParts.push(b.postalZip);
              if (cityParts.length > 0) parts.push(cityParts.join(', '));
              if (b.country) parts.push(b.country);
              setBillingAddress(parts.join('\n'));
            } else {
              setBillingAddress(invoice.customerAddress || '');
            }
          } else {
            // Customer not found in list, use invoice data
            setCustomerEmail(invoice.customerEmail || '');
            setBillingAddress(invoice.customerAddress || '');
          }
        } else {
          setCustomerId('');
          setCustomerEmail(invoice.customerEmail || '');
          setBillingAddress(invoice.customerAddress || '');
        }

        // Set dates and terms
        const invoiceDateStr = invoice.invoiceDate
          ? (typeof invoice.invoiceDate === 'string'
            ? invoice.invoiceDate.split('T')[0]
            : new Date(invoice.invoiceDate).toISOString().split('T')[0])
          : new Date().toISOString().split('T')[0];
        const dueDateStr = invoice.dueDate
          ? (typeof invoice.dueDate === 'string'
            ? invoice.dueDate.split('T')[0]
            : new Date(invoice.dueDate).toISOString().split('T')[0])
          : '';
        setInvoiceDate(invoiceDateStr);
        setDueDate(dueDateStr);
        setTerms(invoice.terms || '');
        setInvoiceNo(invoice.invoiceNumber || '');
        setMessageOnInvoice(invoice.messageOnInvoice || '');

        // Set line items
        if (Array.isArray(invoice.items) && invoice.items.length > 0) {
          const items: LineItem[] = invoice.items.map((item: any, idx: number) => {
            const taxId = item.taxId || 'gst';
            return {
              id: String(idx + 1),
              serviceDate: item.serviceDate || '',
              productService: item.productService || '',
              description: item.description || '',
              qty: item.quantity || 1,
              rate: item.unitPrice || 0,
              amount: item.totalPrice || 0,
              salesTax: taxId,
            };
          });
          setLineItems(items);

          // Fetch vehicle info when items are loaded
          fetchVehicleInfoFromItems(invoice.items).then(vehicles => {
            setVehicleInfo(vehicles);
          });
        } else {
          setLineItems([{ id: '1', serviceDate: '', productService: '', description: '', qty: 1, rate: 0, amount: 0, salesTax: 'gst' }]);
          setVehicleInfo([]);
        }

        // Load labour charges
        setLabourHours(Number(invoice.labourHours) || 0);
        setLabourRate(Number(invoice.labourRate) || 0);
        if (invoice.labourTaxId) {
          setLabourTax(invoice.labourTaxId);
        } else {
          setLabourTax('gst');
        }

        setSidebarOpen(true);
      } else {
        setNotification({ type: 'error', message: 'Failed to load invoice details' });
      }
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err?.response?.data?.message || err?.message || 'Failed to load invoice details'
      });
    }
  };

  const handleSendInvoiceEmail = async (row: InvoiceRow) => {
    try {
      setEmailingId(row._id);
      // Generate PDF as base64 to attach to email
      let pdfBase64: string | null = null;
      let pdfFileName: string | null = null;
      try {
        const { doc, fileName } = await buildInvoicePdfDoc(row._id);
        // output('datauristring') → "data:application/pdf;base64,<base64>"
        pdfBase64 = doc.output('datauristring').split(',')[1];
        pdfFileName = fileName;
      } catch {
        // If PDF generation fails, still send email without attachment
      }
      const response = await emailFleetInvoice(row._id, pdfBase64, pdfFileName);
      if (response?.success) {
        setEmailToast({
          invoiceNumber: row.invoiceNumber || '—',
          customerName: row.customerName || '—',
          customerEmail: row.customerEmail || '—',
        });
        setTimeout(() => setEmailToast(null), 6000);
      } else {
        setNotification({
          type: 'error',
          message: response?.message || 'Failed to send invoice email',
        });
      }
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err?.response?.data?.message || err?.message || 'Failed to send invoice email',
      });
    } finally {
      setEmailingId(null);
    }
  };

  const handleStatusChange = async (invoiceId: string, newStatus: string) => {
    setUpdatingStatusId(invoiceId);
    try {
      const response = await updateFleetInvoiceStatus(invoiceId, newStatus);
      if (response?.success) {
        setNotification({ type: 'success', message: 'Invoice status updated successfully' });
        await Promise.all([loadInvoices(), loadSummary()]);
      } else {
        setNotification({
          type: 'error',
          message: response?.message || 'Failed to update invoice status',
        });
      }
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err?.response?.data?.message || err?.message || 'Failed to update invoice status',
      });
    } finally {
      setUpdatingStatusId(null);
    }
  };

  // Shared: build a jsPDF document for an invoice and return it + metadata
  const buildInvoicePdfDoc = async (invoiceId: string) => {
    const response = await getFleetInvoiceById(invoiceId);
    if (!response?.success || !response.data) throw new Error('Failed to load invoice for PDF');
    const invoice = response.data;

    // Fetch vehicle information for PDF
    let vehicleInfoForPDF: Array<{
      unitNumber: string;
      unitType?: string;
      makeModel?: string;
      vinNumber?: string;
      plateNumber?: string;
    }> = [];
    if (Array.isArray(invoice.items) && invoice.items.length > 0) {
      vehicleInfoForPDF = await fetchVehicleInfoFromItems(invoice.items);
    }

    let companyData: { companyName?: string; address?: string; contactPhone?: string; contactEmail?: string; taxNumber?: string; logoUrl?: string } | null = null;
    try {
      const companyRes = await getCompany();
      if (companyRes?.success && companyRes?.data) companyData = companyRes.data;
    } catch { /* use defaults */ }

    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;
    const contentWidth = pageWidth - margin * 2;

    // Palette
    const blue: [number, number, number] = [1, 106, 178];
    const dark: [number, number, number] = [31, 41, 55];
    const gray: [number, number, number] = [107, 114, 128];
    const lightBlue: [number, number, number] = [235, 246, 255];
    const rowAlt: [number, number, number] = [249, 250, 251];
    const white: [number, number, number] = [255, 255, 255];
    const lineGray: [number, number, number] = [209, 213, 219];

    let yPos = 0;

    const checkPageBreak = (h: number) => {
      if (yPos + h > pageHeight - 18) { doc.addPage(); yPos = margin; }
    };

    const hRule = (y: number, color: [number, number, number] = lineGray, lw = 0.25) => {
      doc.setDrawColor(...color);
      doc.setLineWidth(lw);
      doc.line(margin, y, pageWidth - margin, y);
    };

    const sectionHeader = (label: string, y: number) => {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(...blue);
      doc.text(label, margin, y);
      doc.setDrawColor(...blue);
      doc.setLineWidth(0.4);
      doc.line(margin, y + 1.5, pageWidth - margin, y + 1.5);
      doc.setDrawColor(...lineGray);
      doc.setLineWidth(0.25);
    };

    // ── HEADER BAR ──────────────────────────────────────────────
    doc.setFillColor(...blue);
    doc.rect(0, 0, pageWidth, 36, 'F');

    // Logo
    let logoEndX = margin;
    if (companyData?.logoUrl) {
      try {
        const res = await fetch(companyData.logoUrl);
        const blob = await res.blob();
        const base64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(blob);
        });
        doc.addImage(base64, 'PNG', margin, 5, 24, 14);
        logoEndX = margin + 28;
      } catch { /* skip */ }
    } else {
      try {
        const img = new Image();
        img.src = DocLogo;
        await new Promise<void>((resolve) => {
          img.onload = () => {
            try {
              const canvas = document.createElement('canvas');
              canvas.width = img.width;
              canvas.height = img.height;
              const ctx = canvas.getContext('2d');
              if (ctx) {
                ctx.drawImage(img, 0, 0);
                const imgData = canvas.toDataURL('image/png');
                const logoWidth = 24;
                const logoHeight = (img.height / img.width) * logoWidth;
                doc.addImage(imgData, 'PNG', margin, 5, logoWidth, logoHeight);
                logoEndX = margin + logoWidth + 4;
              }
            } catch { /* skip */ }
            resolve();
          };
          img.onerror = () => resolve();
        });
      } catch { /* skip */ }
    }

    // Company name + contact in header
    doc.setTextColor(...white);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text(companyData?.companyName || 'Mechanic Shop', logoEndX, 14);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    const contactParts: string[] = [];
    if (companyData?.address) contactParts.push(companyData.address);
    if (companyData?.contactPhone) contactParts.push(companyData.contactPhone);
    if (companyData?.contactEmail) contactParts.push(companyData.contactEmail);
    if (contactParts.length) doc.text(contactParts.join('  |  '), logoEndX, 21);
    if (companyData?.taxNumber) doc.text(`GST/Tax No: ${companyData.taxNumber}`, logoEndX, 27);

    // "INVOICE" label right-aligned
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.text('INVOICE', pageWidth - margin, 22, { align: 'right' });

    yPos = 44;

    // ── INVOICE META (# / Date / Due / Terms) ───────────────────
    const invDate = invoice.invoiceDate
      ? new Date(invoice.invoiceDate).toLocaleDateString('en-CA')
      : '—';
    const dueDateStr = invoice.dueDate
      ? new Date(invoice.dueDate).toLocaleDateString('en-CA')
      : '—';

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...dark);

    // Row 1: Invoice # | Date
    doc.setFont('helvetica', 'bold');
    doc.text('Invoice #:', margin, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(invoice.invoiceNumber || '—', margin + 21, yPos);
    doc.setFont('helvetica', 'bold');
    doc.text('Date:', margin + 90, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(invDate, margin + 103, yPos);
    yPos += 6;

    // Row 2: Due Date | Terms
    doc.setFont('helvetica', 'bold');
    doc.text('Due Date:', margin, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(dueDateStr, margin + 21, yPos);
    if (invoice.terms) {
      doc.setFont('helvetica', 'bold');
      doc.text('Terms:', margin + 90, yPos);
      doc.setFont('helvetica', 'normal');
      doc.text(invoice.terms, margin + 103, yPos);
    }
    yPos += 8;
    hRule(yPos);
    yPos += 7;

    // ── CUSTOMER INFO  |  VEHICLE INFO ──────────────────────────
    const midX = pageWidth / 2 + 2;
    const halfW = midX - margin - 6;

    // Left header
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...blue);
    doc.text('CUSTOMER INFO', margin, yPos);
    doc.text('VEHICLE INFO', midX, yPos);
    yPos += 2;
    doc.setDrawColor(...blue);
    doc.setLineWidth(0.4);
    doc.line(margin, yPos, midX - 6, yPos);
    doc.line(midX, yPos, pageWidth - margin, yPos);
    yPos += 5;

    doc.setTextColor(...dark);
    doc.setFontSize(9);

    // Build customer rows
    type InfoRow = [string, string];
    const custRows: InfoRow[] = [];
    custRows.push(['Name', invoice.customerName || '—']);
    custRows.push(['Phone', invoice.customerPhone || '—']);
    custRows.push(['Email', invoice.customerEmail || '—']);
    if (invoice.customerAddress) {
      const addrLines: string[] = doc.splitTextToSize(invoice.customerAddress, halfW - 16);
      addrLines.forEach((l: string, i: number) => custRows.push([i === 0 ? 'Address' : '', l]));
    }

    // Build vehicle rows
    const vehRows: InfoRow[] = [];
    if (vehicleInfoForPDF.length > 0) {
      const v = vehicleInfoForPDF[0];
      if (v.makeModel) {
        const parts = v.makeModel.split(' ');
        vehRows.push(['Make', parts[0] || '—']);
        if (parts.length > 1) vehRows.push(['Model', parts.slice(1).join(' ')]);
      }
      if (v.unitNumber) vehRows.push(['Unit', v.unitNumber]);
      if (v.unitType) vehRows.push(['Type', v.unitType]);
      if (v.plateNumber) vehRows.push(['Plate', v.plateNumber]);
      if (v.vinNumber) vehRows.push(['VIN', v.vinNumber]);
    } else {
      vehRows.push(['', 'N/A']);
    }

    const maxRows = Math.max(custRows.length, vehRows.length);
    const rowH = 6;
    const infoStartY = yPos;
    for (let i = 0; i < maxRows; i++) {
      checkPageBreak(rowH);
      const ry = infoStartY + i * rowH;
      if (i < custRows.length) {
        const [lbl, val] = custRows[i];
        if (lbl) {
          doc.setFont('helvetica', 'bold');
          doc.text(`${lbl}:`, margin, ry);
        }
        doc.setFont('helvetica', 'normal');
        doc.text(val, margin + 17, ry);
      }
      if (i < vehRows.length) {
        const [lbl, val] = vehRows[i];
        if (lbl) {
          doc.setFont('helvetica', 'bold');
          doc.text(`${lbl}:`, midX, ry);
        }
        doc.setFont('helvetica', 'normal');
        doc.text(val, midX + 15, ry);
      }
    }
    yPos = infoStartY + maxRows * rowH + 6;
    hRule(yPos - 3);
    yPos += 4;

    // ── JOB DETAILS ─────────────────────────────────────────────
    checkPageBreak(22);
    sectionHeader('JOB DETAILS', yPos);
    yPos += 6;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...dark);
    doc.text('Job ID:', margin, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(invoice.invoiceNumber || '—', margin + 17, yPos);
    yPos += 6;

    // First item description as the main job description
    const items = Array.isArray(invoice.items) ? invoice.items : [];
    const allDescriptions = items.map((it: any) => it.description).filter(Boolean);
    if (allDescriptions.length > 0) {
      doc.setFont('helvetica', 'bold');
      doc.text('Description:', margin, yPos);
      doc.setFont('helvetica', 'normal');
      const dLines: string[] = doc.splitTextToSize(allDescriptions.join('; '), contentWidth - 26);
      doc.text(dLines, margin + 26, yPos);
      yPos += dLines.length * 5 + 3;
    }
    yPos += 2;
    hRule(yPos - 2);
    yPos += 5;

    // ── ITEMS TABLE ─────────────────────────────────────────────
    checkPageBreak(22);
    sectionHeader('ITEMS', yPos);
    yPos += 5;

    // Column layout: Type | Description | Qty/Hrs | Rate | Amount
    const tRight = pageWidth - margin;
    const typeW = 20;
    const qtyW = 18;
    const rateW = 24;
    const amtW = 24;
    const descW = contentWidth - typeW - qtyW - rateW - amtW;

    const xType = margin;
    const xDesc = margin + typeW;
    const xQty = xDesc + descW + qtyW / 2;
    const xRate = xDesc + descW + qtyW + rateW;
    const xAmt = tRight;

    // Table header row
    doc.setFillColor(...lightBlue);
    doc.rect(margin, yPos - 4, contentWidth, 9, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(...blue);
    doc.text('Type', xType + 1, yPos);
    doc.text('Description', xDesc + 1, yPos);
    doc.text('Qty/Hrs', xQty, yPos, { align: 'center' });
    doc.text('Rate', xRate, yPos, { align: 'right' });
    doc.text('Amount', xAmt, yPos, { align: 'right' });
    yPos += 2;
    hRule(yPos, blue, 0.4);
    yPos += 4;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...dark);

    let rowIdx = 0;
    for (const item of items) {
      const desc = (item.description || '—').toString().trim();
      const dLines: string[] = doc.splitTextToSize(desc, descW - 3);
      const rh = Math.max(dLines.length * 5.5, 7);
      checkPageBreak(rh + 3);

      // Alternating row background
      if (rowIdx % 2 === 0) {
        doc.setFillColor(...rowAlt);
        doc.rect(margin, yPos - 3.5, contentWidth, rh + 2, 'F');
      }

      const qty = Number(item.quantity) || 1;
      const rate = Number(item.unitPrice) || 0;
      const amt = Number(item.totalPrice) || rate * qty;
      const ps = item.productService || '';
      const itemType = ps.startsWith('service:') ? 'Labor' : ps.startsWith('repair:') ? 'Part' : 'Item';

      doc.setTextColor(...gray);
      doc.setFont('helvetica', 'normal');
      doc.text(itemType, xType + 1, yPos);
      doc.setTextColor(...dark);
      doc.text(dLines, xDesc + 1, yPos);
      doc.text(String(qty), xQty, yPos, { align: 'center' });
      doc.text(`$${rate.toFixed(2)}`, xRate, yPos, { align: 'right' });
      doc.text(`$${amt.toFixed(2)}`, xAmt, yPos, { align: 'right' });

      // Tax badge on second line if applicable
      if (item.taxName && Number(item.taxPercent) > 0) {
        doc.setFontSize(7);
        doc.setTextColor(...gray);
        doc.text(`${item.taxName} ${item.taxPercent}%`, xDesc + 1, yPos + dLines.length * 5.5 - 1);
        doc.setFontSize(9);
        yPos += 4;
      }

      yPos += rh + 1;
      rowIdx++;
    }

    // Labour row if applicable
    const labourHrs = Number(invoice.labourHours) || 0;
    const labourRate = Number(invoice.labourRate) || 0;
    const labourAmount = Number(invoice.labourAmount) || labourHrs * labourRate;
    const labourTaxPct = Number(invoice.labourTaxPercent) || 0;
    const labourTaxAmt = labourAmount * (labourTaxPct / 100);

    if (labourAmount > 0) {
      checkPageBreak(9);
      if (rowIdx % 2 === 0) {
        doc.setFillColor(...rowAlt);
        doc.rect(margin, yPos - 3.5, contentWidth, 9, 'F');
      }
      doc.setTextColor(...gray);
      doc.text('Labor', xType + 1, yPos);
      doc.setTextColor(...dark);
      doc.text('Labour Charges', xDesc + 1, yPos);
      doc.text(`${labourHrs.toFixed(1)} hrs`, xQty, yPos, { align: 'center' });
      doc.text(`$${labourRate.toFixed(2)}/hr`, xRate, yPos, { align: 'right' });
      doc.text(`$${labourAmount.toFixed(2)}`, xAmt, yPos, { align: 'right' });
      yPos += 8;
    }

    yPos += 2;
    hRule(yPos);
    yPos += 6;

    // ── SUMMARY ─────────────────────────────────────────────────
    checkPageBreak(32);
    const itemsSubtotal = items.reduce((sum: number, it: any) =>
      sum + (Number(it.quantity) || 1) * (Number(it.unitPrice) || 0), 0);
    const itemsTax = items.reduce((sum: number, it: any) => {
      const base = (Number(it.quantity) || 1) * (Number(it.unitPrice) || 0);
      return sum + base * (Number(it.taxPercent) || 0) / 100;
    }, 0);
    const subtotal = Number(invoice.subtotal) || (itemsSubtotal + labourAmount);
    const taxAmount = Number(invoice.taxAmount) || (itemsTax + labourTaxAmt);
    const total = Number(invoice.total) || subtotal + taxAmount;

    const sumLabelX = pageWidth - margin - 55;
    const sumValX = tRight;
    const sumRowH = 6.5;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...gray);
    doc.text('Subtotal:', sumLabelX, yPos);
    doc.setTextColor(...dark);
    doc.text(`$${subtotal.toFixed(2)}`, sumValX, yPos, { align: 'right' });
    yPos += sumRowH;

    doc.setTextColor(...gray);
    doc.text('Tax:', sumLabelX, yPos);
    doc.setTextColor(...dark);
    doc.text(`$${taxAmount.toFixed(2)}`, sumValX, yPos, { align: 'right' });
    yPos += sumRowH + 2;

    // Total highlighted box
    doc.setFillColor(...blue);
    doc.roundedRect(sumLabelX - 4, yPos - 5, pageWidth - margin - sumLabelX + 4 + 2, 13, 2, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...white);
    doc.text('TOTAL:', sumLabelX, yPos + 3.5);
    doc.text(`$${total.toFixed(2)}`, sumValX, yPos + 3.5, { align: 'right' });
    yPos += 18;

    // ── NOTES / TERMS ────────────────────────────────────────────
    const hasNotes = invoice.messageOnInvoice || invoice.terms;
    if (hasNotes) {
      checkPageBreak(22);
      hRule(yPos - 2);
      yPos += 5;
      sectionHeader('NOTES / TERMS', yPos);
      yPos += 6;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(...dark);
      if (invoice.terms) {
        doc.setFont('helvetica', 'bold');
        doc.text('Payment Terms:', margin, yPos);
        doc.setFont('helvetica', 'normal');
        doc.text(invoice.terms, margin + 29, yPos);
        yPos += 6;
      }
      if (invoice.messageOnInvoice) {
        const msgLines: string[] = doc.splitTextToSize(invoice.messageOnInvoice, contentWidth);
        doc.text(msgLines, margin, yPos);
        yPos += msgLines.length * 5 + 4;
      }
    }

    // ── FOOTER BAR ───────────────────────────────────────────────
    const footerY = pageHeight - 14;
    doc.setFillColor(...blue);
    doc.rect(0, footerY - 2, pageWidth, 16, 'F');
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(...white);
    doc.text('Thank you for your business!', pageWidth / 2, footerY + 6, { align: 'center' });
    if (companyData?.contactEmail) {
      doc.setFont('helvetica', 'normal');
      doc.text(companyData.contactEmail, pageWidth - margin, footerY + 6, { align: 'right' });
    }

    const fileName = `Fleet_Invoice_${(invoice.invoiceNumber || invoiceId.slice(-8)).replace(/\s+/g, '_')}.pdf`;
    return { doc, fileName };
  };

  const handleDownloadInvoicePDF = async (invoiceId: string) => {
    setPrintingPdfId(invoiceId);
    try {
      const { doc, fileName } = await buildInvoicePdfDoc(invoiceId);
      doc.save(fileName);
      setNotification({ type: 'success', message: 'Invoice PDF downloaded successfully' });
    } catch (err: any) {
      console.error('Error generating invoice PDF:', err);
      setNotification({ type: 'error', message: err?.message || 'Failed to download invoice PDF' });
    } finally {
      setPrintingPdfId(null);
    }
  };

  const handleUploadExtract = async () => {
    if (!uploadFile) return;
    setUploading(true);
    setUploadError(null);
    try {
      const res = await uploadExtractFleetInvoice(uploadFile);
      if (!res?.success) {
        setUploadError(res?.message || 'Failed to extract invoice data');
        return;
      }
      const d = res.data;
      // Pre-fill form with extracted data
      resetForm();
      if (d.invoiceNumber) setInvoiceNo(d.invoiceNumber);
      if (d.invoiceDate) setInvoiceDate(d.invoiceDate);
      if (d.dueDate) setDueDate(d.dueDate);
      if (d.terms) setTerms(d.terms);
      // Use vendor name as the customer name for the invoice record
      const vendorName = (d.vendorName || '').trim();
      if (vendorName) {
        // Try case-insensitive match against existing customers
        const match = customers.find(
          (c) => c.name?.toLowerCase() === vendorName.toLowerCase()
        );
        if (match) {
          setCustomerId(match._id);
          setCustomerEmail(match.email || '');
          setBillingAddress(formatBillingAddress(match));
          setExtractedVendorName('');
        } else {
          // No match — store extracted name so it shows as hint & is used on save
          setCustomerId('');
          setExtractedVendorName(vendorName);
          setCustomerEmail(d.vendorEmail || '');
          setBillingAddress(d.vendorAddress || '');
        }
      }
      // Map line items
      if (Array.isArray(d.items) && d.items.length > 0) {
        const mapped: LineItem[] = d.items.map((item: any, i: number) => ({
          id: String(i + 1),
          serviceDate: item.serviceDate || '',
          productService: '',
          description: item.description || '',
          qty: Number(item.quantity) || 1,
          rate: Number(item.unitPrice) || 0,
          amount: Number(item.totalPrice) || (Number(item.quantity) || 1) * (Number(item.unitPrice) || 0),
          salesTax: d.taxName?.toLowerCase().includes('gst') ? 'gst'
            : d.taxName?.toLowerCase().includes('hst') ? 'hst'
              : d.taxName?.toLowerCase().includes('pst') ? 'pst'
                : 'none',
        }));
        setLineItems(mapped);
      }
      // Append unit info to notes
      const unitParts: string[] = [];
      if (d.unitInfo?.unitNumber) unitParts.push(`Unit: ${d.unitInfo.unitNumber}`);
      if (d.unitInfo?.makeModel) unitParts.push(`Make/Model: ${d.unitInfo.makeModel}`);
      if (d.unitInfo?.vinNumber) unitParts.push(`VIN: ${d.unitInfo.vinNumber}`);
      if (d.unitInfo?.currentKm) unitParts.push(`KM: ${d.unitInfo.currentKm}`);
      if (d.notes) unitParts.push(d.notes);
      if (unitParts.length > 0) setMessageOnInvoice(unitParts.join(' | '));

      setUploadModalOpen(false);
      setUploadFile(null);
      setSidebarOpen(true);
      setNotification({ type: 'success', message: 'Invoice data extracted — please review and save.' });
    } catch (err: any) {
      setUploadError(err?.message || 'Extraction failed');
    } finally {
      setUploading(false);
    }
  };

  const resetForm = () => {
    setEditingInvoiceId(null);
    setCustomerId('');
    setCustomerEmail('');
    setBillingAddress('');
    setTerms('');
    setInvoiceDate(new Date().toISOString().split('T')[0]);
    setDueDate('');
    setInvoiceNo('');
    setLineItems([{ id: '1', serviceDate: '', productService: '', description: '', qty: 1, rate: 0, amount: 0, salesTax: 'gst' }]);
    setMessageOnInvoice('');
    setCustomTaxes([]);
    setAddingTaxForLineId(null);
    setLabourHours(0);
    setLabourRate(0);
    setLabourTax('gst');
    setVehicleInfo([]);
    setExtractedVendorName('');
    setShowAddCustomer(false);
    setNewCustomerName('');
    setNewCustomerEmail('');
    setNewCustomerPhone('');
    setAddCustomerError(null);
  };

  return (
    <div className="p-6 min-h-screen bg-main" >

      {/* Professional Email Sent Toast */}
      {emailToast && (
        <div
          className="fixed top-6 right-6 z-[9999] w-[360px] bg-card rounded-2xl shadow-2xl border border-theme overflow-hidden"
          style={{ animation: 'slideInToast .3s cubic-bezier(.21,1.02,.73,1) forwards' }}
        >
          <style>{`@keyframes slideInToast{from{opacity:0;transform:translateX(110%)}to{opacity:1;transform:translateX(0)}}`}</style>
          {/* Green accent bar */}
          <div className="h-1 w-full bg-gradient-to-r from-emerald-400 to-green-500" />
          <div className="p-4">
            <div className="flex items-start gap-3">
              {/* Icon */}
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                <FaEnvelope className="text-emerald-600" size={16} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-headings">Email Sent Successfully</p>
                  <button
                    onClick={() => setEmailToast(null)}
                    className="flex-shrink-0 p-1 rounded-full hover:bg-[rgba(255,255,255,0.03)] text-secondary transition-colors"
                  >
                    <FaTimes size={11} />
                  </button>
                </div>
                <p className="text-xs text-secondary mt-0.5">Invoice emailed to the customer</p>
                <div className="mt-2.5 space-y-1.5 bg-card rounded-lg p-2.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-semibold text-secondary uppercase tracking-wider w-20 flex-shrink-0">Invoice</span>
                    <span className="text-xs font-semibold text-headings truncate">{emailToast.invoiceNumber}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-semibold text-secondary uppercase tracking-wider w-20 flex-shrink-0">Client</span>
                    <span className="text-xs text-headings truncate">{emailToast.customerName}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-semibold text-secondary uppercase tracking-wider w-20 flex-shrink-0">Sent To</span>
                    <span className="text-xs text-emerald-700 font-medium truncate">{emailToast.customerEmail}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          {/* Auto-dismiss progress bar */}
          <div className="h-0.5 bg-card">
            <div
              className="h-full bg-emerald-400"
              style={{ animation: 'shrink 6s linear forwards' }}
            />
            <style>{`@keyframes shrink{from{width:100%}to{width:0%}}`}</style>
          </div>
        </div>
      )}
      <div className="mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-headings flex items-center gap-2">
              <FaFileInvoice className="text-[var(--accent-navyblue)]" size={28} />
              Fleet Invoices
            </h1>
            <p className="text-secondary mt-1">Create and manage fleet invoices</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => { setUploadFile(null); setUploadError(null); setUploadModalOpen(true); }}
              className="flex items-center gap-2 px-4 py-2.5 bg-card border border-theme text-headings rounded-lg hover:border-blue-400 hover:text-[#00D1FF] font-medium shadow-sm transition-colors"
            >
              <FaUpload size={13} /> Upload Invoice
            </button>
            <button
              type="button"
              onClick={() => {
                resetForm();
                setSidebarOpen(true);
              }}
              className="flex items-center gap-2 px-5 py-2.5 bg-[var(--accent-navyblue)] !text-headings rounded-lg hover:bg-blue-700 font-medium shadow-sm transition-colors"
            >
              <FaPlus size={14} /> New Invoice
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-card rounded-xl shadow-sm border border-theme p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium  uppercase tracking-wide text-[var(--accent-green)]">Paid</p>
                {summaryLoading ? (
                  <p className="mt-1 text-xl font-bold text-secondary">—</p>
                ) : (
                  <p className="mt-1 text-2xl font-bold text-[var(--accent-green)]">
                    ${(summary?.paidAmount ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </p>
                )}
                {!summaryLoading && summary && (
                  <p className="mt-0.5 text-xs text-secondary">{summary.paidCount} invoice{summary.paidCount !== 1 ? 's' : ''}</p>
                )}
              </div>
              <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center">
                <FaCheckCircle className="text-green-600" size={24} />
              </div>
            </div>
          </div>

          <div className="bg-card rounded-xl shadow-sm border border-theme p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-[var(--accent-orange)] uppercase tracking-wide">Unpaid</p>
                {summaryLoading ? (
                  <p className="mt-1 text-xl font-bold text-secondary">—</p>
                ) : (
                  <p className="mt-1 text-2xl font-bold text-[var(--accent-orange)]">
                    ${(summary?.unpaidAmount ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </p>
                )}
                {!summaryLoading && summary && (
                  <p className="mt-0.5 text-xs text-secondary">{summary.unpaidCount} invoice{summary.unpaidCount !== 1 ? 's' : ''}</p>
                )}
              </div>
              <div className="w-12 h-12 rounded-lg bg-amber-100 flex items-center justify-center">
                <FaMoneyBillWave className="text-amber-600" size={24} />
              </div>
            </div>
          </div>

          <div className="bg-card rounded-xl shadow-sm border border-theme p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-[var(--accent-orange)] uppercase tracking-wide">Overdue</p>
                {summaryLoading ? (
                  <p className="mt-1 text-xl font-bold text-secondary">—</p>
                ) : (
                  <p className="mt-1 text-2xl font-bold text-[var(--accent-orange)]">
                    ${(summary?.overdueAmount ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </p>
                )}
                {!summaryLoading && summary && (
                  <p className="mt-0.5 text-xs text-secondary">{summary.overdueCount} invoice{summary.overdueCount !== 1 ? 's' : ''}</p>
                )}
              </div>
              <div className="w-12 h-12 rounded-lg bg-orange-100 flex items-center justify-center">
                <FaClock className="text-[#F59E0B]" size={24} />
              </div>
            </div>
          </div>

          <div className="bg-card rounded-xl shadow-sm border border-theme p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-[var(--accent-blue)] uppercase tracking-wide">Total</p>
                {summaryLoading ? (
                  <p className="mt-1 text-xl font-bold text-secondary">—</p>
                ) : (
                  <p className="mt-1 text-2xl font-bold text-[var(--accent-blue)]">
                    ${(summary?.totalAmount ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </p>
                )}
                {!summaryLoading && summary && (
                  <p className="mt-0.5 text-xs text-secondary">{summary.totalCount} invoice{summary.totalCount !== 1 ? 's' : ''}</p>
                )}
              </div>
              <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
                <FaFileInvoice className="text-[#00D1FF]" size={24} />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-xl shadow-sm border border-theme overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className=" text-headings uppercase text-xs font-semibold tracking-wide">
                <tr>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4">No.</th>
                  <th className="px-6 py-4">Customer</th>
                  <th className="px-6 py-4">Unit Information</th>
                  <th className="px-6 py-4">Amount</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-theme divide-white/5 ">
                {invoicesLoading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-secondary">
                      Loading invoices...
                    </td>
                  </tr>
                ) : invoicesError ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-secondary">
                      {invoicesError}
                    </td>
                  </tr>
                ) : invoices.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-secondary">
                      No invoices yet. Create one using &quot;New Invoice&quot;.
                    </td>
                  </tr>
                ) : (
                  invoices.map((row) => {
                    const isOverdue = row.status === 'overdue' ||
                      (row.status !== 'paid' && row.dueDate && new Date(row.dueDate) < new Date());
                    const displayStatus = isOverdue ? 'overdue' : row.status;

                    return (
                      <tr
                        key={row._id}
                        className={`  ${displayStatus === 'overdue' ? 'border border-theme ' : ''}`}
                      >
                        <td className="px-6 py-4 text-secondary">
                          {row.invoiceDate
                            ? formatDisplayDate(typeof row.invoiceDate === 'string' ? row.invoiceDate.split('T')[0] : new Date(row.invoiceDate).toISOString().split('T')[0])
                            : '—'}
                        </td>
                        <td className="px-6 py-4 font-medium text-secondary">{row.invoiceNumber || '—'}</td>
                        <td className="px-6 py-4 text-secondary">{row.customerName || '—'}</td>
                        <td className="px-6 py-4 text-secondary">
                          {row.vehicleInfo && row.vehicleInfo.length > 0 ? (
                            <div className="space-y-1">
                              {row.vehicleInfo.map((vehicle, idx) => (
                                <div key={idx} className="text-xs">
                                  <div className="font-semibold text-secondary">
                                    {vehicle.unitNumber || '—'}
                                    {vehicle.unitType && <span className="text-secondary ml-1">({vehicle.unitType})</span>}
                                  </div>
                                  {vehicle.makeModel && (
                                    <div className="text-secondary">{vehicle.makeModel}</div>
                                  )}
                                  {(vehicle.plateNumber || vehicle.vinNumber) && (
                                    <div className="text-secondary">
                                      {vehicle.plateNumber && <span>Plate: {vehicle.plateNumber}</span>}
                                      {vehicle.plateNumber && vehicle.vinNumber && <span> • </span>}
                                      {vehicle.vinNumber && <span>VIN: {vehicle.vinNumber}</span>}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span className="text-secondary">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-secondary font-medium">${(row.total || 0).toFixed(2)}</td>
                        <td className="px-6 py-4">
                          <select
                            value={INVOICE_STATUS_OPTIONS.some((o) => o.value === row.status) ? row.status : 'draft'}
                            onChange={(e) => handleStatusChange(row._id, e.target.value)}
                            disabled={updatingStatusId === row._id}
                            className={`min-w-[110px] px-3 py-1.5 text-sm font-medium rounded-lg border transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)] disabled:opacity-60 disabled:cursor-not-allowed ${row.status === 'paid'
                                ? 'bg-[rgba(16,185,129,0.15)] text-[#34D399] border-[rgba(16,185,129,0.3)]'
                                : row.status === 'sent'
                                  ? 'bg-[rgba(59,130,246,0.15)] text-[#60A5FA] border-[rgba(59,130,246,0.3)]'
                                  : row.status === 'cancelled'
                                    ? 'bg-[rgba(239,68,68,0.12)] text-[#F87171] border-[rgba(239,68,68,0.3)]'
                                    : displayStatus === 'overdue'
                                      ? 'bg-[rgba(245,158,11,0.15)] text-[#FBBF24] border-[rgba(245,158,11,0.3)]'
                                      : 'bg-[rgba(255,255,255,0.05)] text-secondary border border-theme hover:bg-[rgba(255,255,255,0.08)]'
                              }`}
                          >
                            {INVOICE_STATUS_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value} className="form-option">
                                {opt.label}
                              </option>
                            ))}
                          </select>

                          {updatingStatusId === row._id && (
                            <span className="ml-2 text-xs text-secondary">Updating…</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">

                            {/* Edit */}
                            <button
                              type="button"
                              onClick={() => handleEditInvoice(row._id)}
                              className="p-2 text-[var(--accent-blue)] hover:bg-[rgba(0,209,255,0.08)] rounded-lg transition-all"
                              title="View/Edit"
                            >
                              <FaEdit size={14} />
                            </button>

                            {/* Email */}
                            <button
                              type="button"
                              onClick={() => handleSendInvoiceEmail(row)}
                              disabled={emailingId === row._id}
                              className="p-2 text-emerald-400 hover:bg-[rgba(16,185,129,0.1)] rounded-lg transition-all disabled:opacity-50"
                              title={emailingId === row._id ? 'Sending…' : 'Send Invoice Email'}
                            >
                              {emailingId === row._id
                                ? <FaSpinner size={14} className="animate-spin" />
                                : <FaEnvelope size={14} />}
                            </button>

                            {/* Delete */}
                            <button
                              type="button"
                              onClick={() => handleDeleteInvoice(row._id)}
                              disabled={deleting === row._id}
                              className="p-2 text-red-400 hover:bg-[rgba(239,68,68,0.1)] rounded-lg transition-all disabled:opacity-50"
                              title="Delete"
                            >
                              <FaTrash size={14} />
                            </button>

                            {/* PDF */}
                            <button
                              type="button"
                              onClick={() => handleDownloadInvoicePDF(row._id)}
                              disabled={printingPdfId === row._id}
                              className="p-2 text-secondary hover:text-white hover:bg-[rgba(255,255,255,0.08)] rounded-lg transition-all disabled:opacity-50"
                              title={printingPdfId === row._id ? 'Generating PDF…' : 'Download PDF'}
                            >
                              <FaPrint size={14} />
                            </button>

                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Sidebar form modal */}
      {sidebarOpen && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setSidebarOpen(false)} aria-hidden="true" />
          <div className="fixed top-0 right-0 h-full w-full max-w-4xl bg-card shadow-xl z-50 flex flex-col">
            <div className="flex-shrink-0 px-8 py-5 border-b border-theme flex items-center justify-between bg-card">
              <h2 className="text-xl font-semibold text-headings">{editingInvoiceId ? 'Edit Invoice' : 'New Invoice'}</h2>
              <button type="button" onClick={() => setSidebarOpen(false)} className="p-2 text-secondary hover:bg-[rgba(255,255,255,0.03)] rounded-lg transition-colors" aria-label="Close">
                <FaTimes size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-8 py-6 space-y-8">
              {notification && (
                <div className={`rounded-lg border px-4 py-3 ${notification.type === 'success'
                  ? 'border-green-200 bg-green-50 text-green-800'
                  : 'border-red-200 bg-card text-red-800'
                  }`}>
                  {notification.message}
                </div>
              )}
              {/* Vehicle Information */}
              {vehicleInfo.length > 0 && (
                <section>
                  <h3 className="text-sm font-semibold text-secondary uppercase tracking-wide mb-4">Vehicle Information</h3>
                  <div className="space-y-3">
                    {vehicleInfo.map((vehicle, idx) => (
                      <div key={idx} className="rounded-lg  p-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                          <div>
                            <p className="text-xs text-secondary mb-1">Unit Number</p>
                            <p className="text-sm font-semibold text-headings">{vehicle.unitNumber || '—'}</p>
                          </div>
                          <div>
                            <p className="text-xs text-secondary mb-1">Unit Type</p>
                            <p className="text-sm font-semibold text-headings">{vehicle.unitType || '—'}</p>
                          </div>
                          <div>
                            <p className="text-xs text-secondary mb-1">Make / Model</p>
                            <p className="text-sm font-semibold text-headings">{vehicle.makeModel || '—'}</p>
                          </div>
                          <div>
                            <p className="text-xs text-secondary mb-1">Plate Number</p>
                            <p className="text-sm font-semibold text-headings">{vehicle.plateNumber || '—'}</p>
                          </div>
                          {vehicle.vinNumber && (
                            <div>
                              <p className="text-xs text-secondary mb-1">VIN Number</p>
                              <p className="text-sm font-semibold text-headings">{vehicle.vinNumber}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Header Information */}
              <section>
                <h3 className="text-sm font-semibold text-secondary uppercase tracking-wide mb-4">Bill To &amp; Dates</h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-headings mb-1">Customer</label>
                      <select
                        value={customerId}
                        onChange={(e) => handleCustomerChange(e.target.value)}
                        className={`w-full px-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-headings ${extractedVendorName && !customerId ? 'border-amber-400 bg-amber-50' : 'border-theme'}`}
                      >
                        <option className='form-option' value="">{extractedVendorName ? `— Using: ${extractedVendorName} —` : 'Select client...'}</option>
                        {customers.map((c) => (
                          <option className='form-option' key={c._id} value={c._id}>{c.name}</option>
                        ))}
                      </select>
                      {extractedVendorName && !customerId && (
                        <p className="mt-1 text-xs text-amber-700 flex items-center gap-1">
                          <span>📄</span>
                          <span>Extracted from invoice: <strong>{extractedVendorName}</strong> — select a customer above to link, or save as-is.</span>
                        </p>
                      )}
                      {customersLoading && (
                        <p className="mt-1 text-xs text-secondary">Loading customers...</p>
                      )}
                      {customersError && !customersLoading && (
                        <p className="mt-1 text-xs text-[#A855F7]">{customersError}</p>
                      )}
                      {!showAddCustomer ? (
                        <button
                          type="button"
                          onClick={() => { setShowAddCustomer(true); setAddCustomerError(null); }}
                          className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-[#00D1FF] hover:text-blue-700 transition-colors"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" strokeWidth="2" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v8M8 12h8" /></svg>
                          Add New Customer
                        </button>
                      ) : (
                        <div className="mt-2 rounded-xl border border-theme bg-card shadow-sm overflow-hidden">
                          <div className="flex items-center justify-between px-4 py-2.5 bg-card border-b border-theme">
                            <span className="text-xs font-semibold text-headings tracking-wide uppercase">New Customer</span>
                            <button
                              type="button"
                              onClick={() => { setShowAddCustomer(false); setAddCustomerError(null); setNewCustomerName(''); setNewCustomerEmail(''); setNewCustomerPhone(''); }}
                              className="text-secondary hover:text-secondary transition-colors"
                              aria-label="Close"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                          </div>
                          <div className="px-4 py-3 space-y-2.5">
                            <div>
                              <label className="block text-xs font-medium text-secondary mb-1">Name <span className="text-red-500">*</span></label>
                              <input
                                type="text"
                                placeholder="e.g. Acme Corp"
                                value={newCustomerName}
                                onChange={(e) => setNewCustomerName(e.target.value)}
                                className="w-full px-3 py-2 text-sm border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-400"
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="block text-xs font-medium text-secondary mb-1">Email</label>
                                <input
                                  type="email"
                                  placeholder="email@example.com"
                                  value={newCustomerEmail}
                                  onChange={(e) => setNewCustomerEmail(e.target.value)}
                                  className="w-full px-3 py-2 text-sm border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-400"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-secondary mb-1">Phone</label>
                                <input
                                  type="text"
                                  placeholder="+1 (555) 000-0000"
                                  value={newCustomerPhone}
                                  onChange={(e) => setNewCustomerPhone(e.target.value)}
                                  className="w-full px-3 py-2 text-sm border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-400"
                                />
                              </div>
                            </div>
                            {addCustomerError && (
                              <p className="text-xs text-[#A855F7] flex items-center gap-1">
                                <svg className="w-3.5 h-3.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                                {addCustomerError}
                              </p>
                            )}
                          </div>
                          <div className="px-4 py-3 bg-card border-t border-theme flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => { setShowAddCustomer(false); setAddCustomerError(null); setNewCustomerName(''); setNewCustomerEmail(''); setNewCustomerPhone(''); }}
                              className="px-3 py-1.5 text-xs font-medium text-secondary bg-card border border-theme rounded-lg hover:bg-[rgba(255,255,255,0.03)] transition-colors"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={handleAddNewCustomer}
                              disabled={addingCustomer}
                              className="px-4 py-1.5 text-xs font-semibold bg-blue-600 !text-headings rounded-lg hover:bg-blue-700 disabled:opacity-60 transition-colors flex items-center gap-1.5"
                            >
                              {addingCustomer ? (
                                <>
                                  <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" /></svg>
                                  Saving...
                                </>
                              ) : 'Save Customer'}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-headings mb-1">Customer Email</label>
                      <input
                        type="email"
                        value={customerEmail}
                        onChange={(e) => setCustomerEmail(e.target.value)}
                        className="w-full px-3 py-2.5 border border-theme rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="e.g. Accounting@blackriverlogistics.com"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-headings mb-1">Billing Address</label>
                    <textarea
                      value={billingAddress}
                      onChange={(e) => setBillingAddress(e.target.value)}
                      rows={2}
                      className="w-full px-3 py-2.5 border border-theme rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                      placeholder="From customer profile"
                    />
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-headings mb-1">Terms</label>
                      <select
                        value={terms}
                        onChange={(e) => handleTermsChange(e.target.value)}
                        className="w-full px-3 py-2.5 border border-theme rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option className='form-option' value="">Payment window...</option>
                        {TERMS_OPTIONS.map((o) => (
                          <option className='form-option' key={o.value} value={o.value}>{o.value}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-headings mb-1">Invoice Date</label>
                      <input
                        type="date"
                        value={invoiceDate}
                        onChange={(e) => handleInvoiceDateChange(e.target.value)}
                        className="w-full px-3 py-2.5 border border-theme rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-headings mb-1">Due Date</label>
                      <input
                        type="text"
                        readOnly
                        value={dueDate ? formatDisplayDate(dueDate) : '—'}
                        className="w-full px-3 py-2.5 border border-theme rounded-lg bg-card text-headings"
                      />
                      <p className="text-xs text-secondary mt-0.5">Calculated from Terms</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-headings mb-1">Invoice No.</label>
                      <input
                        type="text"
                        value={invoiceNo}
                        onChange={(e) => setInvoiceNo(e.target.value)}
                        className="w-full px-3 py-2.5 border border-theme rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="e.g. RTTR777"
                      />
                    </div>
                  </div>
                </div>
              </section>

              {/* Line Item Details */}
              <section>
                <h3 className="text-sm font-semibold text-secondary uppercase tracking-wide mb-4">Line Items</h3>
                <div className="space-y-4">
                  {lineItems.map((item) => (
                    <div key={item.id} className="rounded-lg border border-theme bg-card p-4 space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-headings mb-1">Service Date</label>
                          <input
                            type="date"
                            value={item.serviceDate}
                            onChange={(e) => updateLineItem(item.id, { serviceDate: e.target.value })}
                            className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-headings mb-1">Product / Service</label>
                          <select
                            value={item.productService}
                            onChange={async (e) => {
                              updateLineItem(item.id, { productService: e.target.value });
                              // Update vehicle info when a service/repair is selected
                              if (e.target.value) {
                                const [type, id] = e.target.value.split(':');
                                if (type === 'service' && id) {
                                  try {
                                    const serviceRes = await listVehicleServices({});
                                    if (serviceRes?.success && Array.isArray(serviceRes.data)) {
                                      const service = (serviceRes.data as any[]).find((s: any) => s._id === id);
                                      if (service) {
                                        const unitNo = service.unitNumber ||
                                          service.vehicleId?.internalId ||
                                          service.vehicleId?.plateNumber ||
                                          '';
                                        if (unitNo) {
                                          const existingVehicle = vehicleInfo.find(v => v.unitNumber === unitNo);
                                          if (!existingVehicle) {
                                            setVehicleInfo(prev => [...prev, {
                                              unitNumber: unitNo,
                                              unitType: service.unitType || service.vehicleId?.type || 'Truck',
                                              makeModel: service.makeModel ||
                                                (service.vehicleId ? `${service.vehicleId.make || ''} ${service.vehicleId.model || ''}`.trim() : '') ||
                                                '',
                                              vinNumber: service.vehicleId?.vinNumber || '',
                                              plateNumber: service.vehicleId?.plateNumber || ''
                                            }]);
                                          }
                                        }
                                      }
                                    }
                                  } catch (err) {
                                    console.error('Error fetching service for vehicle info:', err);
                                  }
                                } else if (type === 'repair' && id) {
                                  try {
                                    const repairRes = await listGeneralRepairs();
                                    if (repairRes?.success && Array.isArray(repairRes.data)) {
                                      const repair = (repairRes.data as any[]).find((r: any) => r._id === id);
                                      if (repair && repair.unitNumber) {
                                        const existingVehicle = vehicleInfo.find(v => v.unitNumber === repair.unitNumber);
                                        if (!existingVehicle) {
                                          setVehicleInfo(prev => [...prev, {
                                            unitNumber: repair.unitNumber,
                                            unitType: repair.unitType || 'Truck',
                                            makeModel: repair.makeModel ||
                                              (repair.vehicleId ? `${repair.vehicleId.make || ''} ${repair.vehicleId.model || ''}`.trim() : '') ||
                                              '',
                                            vinNumber: repair.vehicleId?.vinNumber || repair.vinNumber || '',
                                            plateNumber: repair.vehicleId?.plateNumber || repair.plateNumber || ''
                                          }]);
                                        }
                                      }
                                    }
                                  } catch (err) {
                                    console.error('Error fetching repair for vehicle info:', err);
                                  }
                                }
                              }
                            }}
                            className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                          >
                            <option className='form-option' value="">Select...</option>
                            {productOptions.map((opt) => (
                              <option className='form-option' key={opt.id} value={opt.id}>{opt.label}</option>
                            ))}
                          </select>
                          {productOptionsLoading && (
                            <p className="mt-1 text-xs text-secondary">Loading services and maintenance orders...</p>
                          )}
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-headings mb-1">Description</label>
                        <textarea
                          value={item.description}
                          onChange={(e) => updateLineItem(item.id, { description: e.target.value })}
                          rows={2}
                          className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-blue-500 text-sm resize-none"
                          placeholder="e.g. Checked lights, brakes, steering..."
                        />
                      </div>
                      <div className="grid grid-cols-4 gap-4 items-end">
                        <div>
                          <label className="block text-sm font-medium text-headings mb-1">QTY</label>
                          <input
                            type="number"
                            min={1}
                            value={item.qty}
                            onChange={(e) => updateLineItem(item.id, { qty: Number(e.target.value) || 1 })}
                            className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-headings mb-1">Rate</label>
                          <input
                            type="number"
                            min={0}
                            step={0.01}
                            value={item.rate || ''}
                            onChange={(e) => updateLineItem(item.id, { rate: Number(e.target.value) || 0 })}
                            className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                            placeholder="0"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-headings mb-1">Amount</label>
                          <div className="px-3 py-2 bg-card border border-theme rounded-lg text-sm font-medium text-headings">${item.amount.toFixed(2)}</div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-headings mb-1">Tax</label>
                          <select
                            value={item.salesTax}
                            onChange={(e) => {
                              const v = e.target.value;
                              if (v === '__add__') setAddingTaxForLineId(item.id);
                              else updateLineItem(item.id, { salesTax: v });
                            }}
                            className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                          >
                            {allTaxes.map((t) => (
                              <option className='form-option' key={t.id} value={t.id}>{t.name} ({t.percent}%)</option>
                            ))}
                            <option className='form-option' value="__add__">+ Add custom tax...</option>
                          </select>
                        </div>
                      </div>
                      {lineItems.length > 1 && (
                        <button type="button" onClick={() => removeLineItem(item.id)} className="text-sm text-[#A855F7] hover:text-red-700 font-medium">
                          Remove line
                        </button>
                      )}
                    </div>
                  ))}
                  <button type="button" onClick={addLineItem} className="text-sm font-medium text-[#00D1FF] hover:text-blue-700">
                    + Add line item
                  </button>
                </div>
              </section>

              {/* Custom taxes: add form + list with delete */}
              <section>
                <h3 className="text-sm font-semibold text-secondary uppercase tracking-wide mb-3">Custom taxes</h3>
                {addingTaxForLineId && (
                  <div className="mb-4 p-4 rounded-lg border border-blue-200 bg-blue-50/50">
                    <p className="text-xs font-medium text-headings mb-3">Add custom tax (percentage) — will apply to current line</p>
                    <div className="flex flex-wrap gap-3 items-end">
                      <div className="w-40">
                        <label className="block text-xs text-secondary mb-1">Tax name</label>
                        <input
                          type="text"
                          value={newTaxName}
                          onChange={(e) => setNewTaxName(e.target.value)}
                          placeholder="e.g. VAT"
                          className="w-full px-3 py-2 border border-theme rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div className="w-24">
                        <label className="block text-xs text-secondary mb-1">%</label>
                        <input
                          type="number"
                          min={0}
                          max={100}
                          step={0.01}
                          value={newTaxPercent}
                          onChange={(e) => setNewTaxPercent(Number(e.target.value) || 0)}
                          className="w-full px-3 py-2 border border-theme rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => addCustomTax(addingTaxForLineId)}
                        className="px-4 py-2 bg-blue-600 text-headings text-sm font-medium rounded-lg hover:bg-blue-700"
                      >
                        Add
                      </button>
                      <button
                        type="button"
                        onClick={() => { setAddingTaxForLineId(null); setNewTaxName(''); setNewTaxPercent(5); }}
                        className="px-4 py-2 border border-theme text-sm font-medium rounded-lg hover:bg-[rgba(255,255,255,0.03)]"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
                {customTaxes.length > 0 && (
                  <ul className="space-y-2">
                    {customTaxes.map((t) => (
                      <li key={t.id} className="flex items-center justify-between py-2 px-3 rounded-lg border border-theme bg-card">
                        <span className="text-sm font-medium text-headings">{t.name} ({t.percent}%)</span>
                        <button
                          type="button"
                          onClick={() => removeCustomTax(t.id)}
                          className="p-1.5 text-[#A855F7] hover:bg-red-50 rounded"
                          title="Delete this tax"
                        >
                          <FaTrash size={14} />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                {customTaxes.length === 0 && !addingTaxForLineId && (
                  <p className="text-sm text-secondary">No custom taxes. Use “+ Add custom tax...” in a line item above.</p>
                )}
              </section>

              {/* Labour Charges */}
              <section>
                <h3 className="text-sm font-semibold text-secondary uppercase tracking-wide mb-4">Labour Charges</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-headings mb-1">
                      Hours <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.5"
                      value={labourHours || ''}
                      onChange={(e) => setLabourHours(Number(e.target.value) || 0)}
                      className="w-full px-3 py-2.5 border border-theme rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="0.0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-headings mb-1">
                      Hourly Rate ($) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={labourRate || ''}
                      onChange={(e) => setLabourRate(Number(e.target.value) || 0)}
                      className="w-full px-3 py-2.5 border border-theme rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-headings mb-1">Tax</label>
                    <select
                      value={labourTax}
                      onChange={(e) => setLabourTax(e.target.value)}
                      className="w-full px-3 py-2.5 border border-theme rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      {allTaxes.map((tax) => (
                        <option className='form-option' key={tax.id} value={tax.id}>
                          {tax.name} {tax.percent > 0 ? `(${tax.percent}%)` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                {labourAmount > 0 && (
                  <div className="mt-3 p-3 bg-card rounded-lg border border-blue-200">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-headings">Labour Amount:</span>
                      <span className="text-lg font-semibold text-[#00D1FF]">
                        ${labourAmount.toFixed(2)}
                      </span>
                    </div>
                    {labourTaxAmount > 0 && (
                      <div className="flex justify-between items-center mt-1">
                        <span className="text-sm text-secondary">Labour Tax:</span>
                        <span className="text-sm font-medium text-headings">
                          ${labourTaxAmount.toFixed(2)}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </section>

              {/* Message & Totals */}
              <section>
                <h3 className="text-sm font-semibold text-secondary uppercase tracking-wide mb-4">Message &amp; Totals</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-headings mb-1">Message on Invoice</label>
                    <textarea
                      value={messageOnInvoice}
                      onChange={(e) => setMessageOnInvoice(e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2.5 border border-theme rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                      placeholder="e.g. UNIT, VIN NO, CURRENT KM/HOURS"
                    />
                  </div>
                  <div className="max-w-xs ml-auto rounded-lg border border-theme bg-card p-4 space-y-2">
                    {itemsSubtotal > 0 && (
                      <div className="flex justify-between text-sm text-secondary">
                        <span>Items Subtotal</span>
                        <span className="font-medium text-headings">${itemsSubtotal.toFixed(2)}</span>
                      </div>
                    )}
                    {labourAmount > 0 && (
                      <div className="flex justify-between text-sm text-secondary">
                        <span>Labour Charges</span>
                        <span className="font-medium text-headings">${labourAmount.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm text-secondary">
                      <span>Subtotal</span>
                      <span className="font-medium text-headings">${subtotal.toFixed(2)}</span>
                    </div>
                    {itemsTax > 0 && labourTaxAmount > 0 && (
                      <>
                        <div className="flex justify-between text-xs text-secondary pl-2">
                          <span>Items Tax</span>
                          <span>${itemsTax.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-xs text-secondary pl-2">
                          <span>Labour Tax</span>
                          <span>${labourTaxAmount.toFixed(2)}</span>
                        </div>
                      </>
                    )}
                    <div className="flex justify-between text-sm text-secondary">
                      <span>Tax</span>
                      <span className="font-medium text-headings">${totalTax.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-base font-semibold text-headings border-t border-theme pt-2 mt-2">
                      <span>Total Balance Due</span>
                      <span>${totalBalance.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </section>
            </div>
            <div className="flex-shrink-0 px-8 py-4 border-t border-theme bg-card flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setSidebarOpen(false);
                  resetForm();
                }}
                className="px-5 py-2.5 text-sm font-medium text-primary bg-card border border-theme rounded-lg hover:bg-[rgba(255,255,255,0.03)] transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveAndClose}
                disabled={saving}
                className={`px-5 py-2.5 text-sm font-medium !text-headings bg-[var(--accent-navyblue)] rounded-lg hover:bg-blue-700 transition-colors ${saving ? 'opacity-60 cursor-not-allowed' : ''}`}
              >
                {saving ? 'Saving...' : editingInvoiceId ? 'Update Invoice' : 'Save and close'}
              </button>
            </div>
          </div>
        </>
      )}

      {/* Upload & Extract Invoice Modal */}
      {uploadModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-card rounded-2xl shadow-2xl w-full max-w-md">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-theme">
              <div className="flex items-center gap-2">
                <FaUpload className="text-[#00D1FF]" size={18} />
                <h3 className="text-base font-semibold text-headings">Upload Invoice</h3>
              </div>
              <button
                onClick={() => { setUploadModalOpen(false); setUploadFile(null); setUploadError(null); }}
                className="p-1.5 hover:bg-[rgba(255,255,255,0.03)] rounded-lg text-secondary"
              >
                <FaTimes size={16} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-sm text-secondary">
                Upload a PDF or image of an invoice. The system will automatically extract the data and pre-fill the invoice form.
              </p>

              {/* Drop zone */}
              <div
                onDragOver={(e) => { e.preventDefault(); setUploadDragging(true); }}
                onDragLeave={() => setUploadDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setUploadDragging(false);
                  const f = e.dataTransfer.files?.[0];
                  if (f) { setUploadFile(f); setUploadError(null); }
                }}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${uploadDragging ? 'border-blue-400 bg-card' : 'border-theme hover:border-blue-300 hover:bg-[rgba(255,255,255,0.03)]'
                  }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept=".pdf,.jpg,.jpeg,.png,.webp"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) { setUploadFile(f); setUploadError(null); }
                    e.target.value = '';
                  }}
                />
                {uploadFile ? (
                  <div className="flex flex-col items-center gap-2">
                    <FaFilePdf className="text-red-500" size={32} />
                    <p className="text-sm font-medium text-headings">{uploadFile.name}</p>
                    <p className="text-xs text-secondary">{(uploadFile.size / 1024).toFixed(1)} KB</p>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setUploadFile(null); }}
                      className="text-xs text-red-500 hover:underline mt-1"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2 text-secondary">
                    <FaUpload size={28} />
                    <p className="text-sm font-medium text-secondary">Drag & drop or click to select</p>
                    <p className="text-xs">PDF, JPEG, PNG, WebP · Max 10 MB</p>
                  </div>
                )}
              </div>

              {uploadError && (
                <div className="p-3 bg-card border border-red-200 rounded-lg text-sm text-red-700">
                  {uploadError}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 px-6 py-4 border-t border-theme">
              <button
                type="button"
                onClick={() => { setUploadModalOpen(false); setUploadFile(null); setUploadError(null); }}
                className="px-4 py-2 text-sm text-secondary bg-card rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleUploadExtract}
                disabled={!uploadFile || uploading}
                className="flex items-center gap-2 px-5 py-2 text-sm font-medium !text-headings bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {uploading ? (
                  <><FaSpinner className="animate-spin" size={13} /> Extracting...</>
                ) : (
                  <><FaUpload size={13} /> Extract & Fill</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FleetInvoicesPage;
