import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  Building2,
  Calendar,
  DollarSign,
  CreditCard,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Download,
  Eye,
  Copy,
  Search,
  MoreHorizontal,
  ExternalLink,
  Receipt,
} from 'lucide-react';
import { Modal, Button, message, Input, Select, Tag } from 'antd';
import { getSuperAdminInvoices, getSuperAdminSettings } from '../../../axios/api/superadmin';
import jsPDF from 'jspdf';
import DocLogo from '../../../assets/doclogo.png';

interface Invoice {
  _id: string;
  company?: {
    _id: string;
    companyName: string;
    address?: string;
    contactEmail?: string;
    contactPhone?: string;
  };
  admin?: {
    _id: string;
    name: string;
    email: string;
    internalId?: string;
  };
  subscriptionPlan?: {
    _id: string;
    planName: string;
  };
  planName: string;
  billingCycle: 'monthly' | 'yearly';
  invoiceNumber: string;
  currency: string;
  amount: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
  paymentMethod?: string;
  transactionId?: string;
  subscriptionStartDate: string;
  subscriptionEndDate: string;
  invoiceStatus: 'generated' | 'cancelled';
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

const InvoicesPage = () => {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string>('all');
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState<string>('all');
  const dropdownRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  useEffect(() => {
    fetchInvoices();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (activeDropdown && dropdownRefs.current[activeDropdown]) {
        const dropdownElement = dropdownRefs.current[activeDropdown];
        if (dropdownElement && !dropdownElement.contains(event.target as Node)) {
          setActiveDropdown(null);
        }
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && activeDropdown) {
        setActiveDropdown(null);
      }
    };

    if (activeDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        document.removeEventListener('keydown', handleEscape);
      };
    }
  }, [activeDropdown]);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getSuperAdminInvoices();

      console.log('Invoices API Response:', response);

      if (response?.success && response?.data) {
        setInvoices(response.data);
      } else {
        setError(response?.message || 'Failed to load invoices');
      }
    } catch (err: any) {
      console.error('Invoices fetch error:', err);
      setError(err?.message || 'An error occurred while fetching invoices');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number, currency: string = 'CAD') => {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'failed': return 'bg-red-100 text-red-800';
      case 'refunded': return 'bg-card text-primary';
      default: return 'bg-card text-primary';
    }
  };

  const getPaymentStatusIcon = (status: string) => {
    switch (status) {
      case 'paid': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'pending': return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'failed': return <XCircle className="w-4 h-4 text-red-500" />;
      case 'refunded': return <AlertCircle className="w-4 h-4 text-secondary" />;
      default: return <Clock className="w-4 h-4 text-secondary" />;
    }
  };

  const handleViewDetails = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setShowViewModal(true);
  };

  const handleCopyId = (id: string) => {
    navigator.clipboard.writeText(id);
    message.success('ID copied to clipboard');
  };

  const handleCopyInvoiceNumber = (invoiceNumber: string) => {
    navigator.clipboard.writeText(invoiceNumber);
    message.success('Invoice number copied to clipboard');
  };

  const handleExport = async (invoice: Invoice) => {
    try {
      // Fetch superadmin settings for company information
      let companyInfo: any = null;
      try {
        const settingsResponse = await getSuperAdminSettings();
        if (settingsResponse?.success && settingsResponse?.data) {
          companyInfo = settingsResponse.data;
        }
      } catch (err) {
        console.log('Could not fetch superadmin settings, using defaults');
      }

      const doc = new jsPDF('p', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 20;
      const contentWidth = pageWidth - (margin * 2);

      // Color scheme
      const textR = 31, textG = 41, textB = 55; // Gray-800
      const lightGrayR = 243, lightGrayG = 244, lightGrayB = 246; // Gray-100
      const grayR = 107, grayG = 114, grayB = 128; // Gray-500
      const greenR = 34, greenG = 197, greenB = 94; // Green-500

      let yPos = margin;

      // Add Logo (top left)
      try {
        const img = new Image();
        img.crossOrigin = 'anonymous';
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
                const logoWidth = 50;
                const logoHeight = (img.height / img.width) * logoWidth;
                doc.addImage(imgData, 'PNG', margin, yPos, logoWidth, logoHeight);
              }
            } catch (e) {
              console.log('Could not add logo to PDF');
            }
            resolve();
          };
          img.onerror = () => resolve();
          setTimeout(() => resolve(), 2000);
        });
      } catch (err) {
        console.log('Could not load logo');
      }

      // Invoice Title (top right)
      doc.setFontSize(24);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(textR, textG, textB);
      doc.text('SUBSCRIPTION INVOICE', pageWidth - margin, yPos + 15, { align: 'right' });

      yPos += 25; // Space after logo/title

      // Logistiq Company Information (Left side)
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text(companyInfo?.name || 'Logistiq', margin, yPos);
      yPos += 6;

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(grayR, grayG, grayB);
      if (companyInfo?.address) {
        const addressLines = doc.splitTextToSize(companyInfo.address, 70);
        doc.text(addressLines, margin, yPos);
        yPos += addressLines.length * 4;
      }
      if (companyInfo?.phone) {
        doc.text(`Phone: ${companyInfo.phone}`, margin, yPos);
        yPos += 4;
      }
      if (companyInfo?.email) {
        doc.text(`Email: ${companyInfo.email}`, margin, yPos);
        yPos += 4;
      }
      if (companyInfo?.taxNumber) {
        doc.text(`GST/HST: ${companyInfo.taxNumber}`, margin, yPos);
        yPos += 4;
      }
      doc.setTextColor(textR, textG, textB);

      // Invoice Details Box (Right side)
      const boxX = pageWidth - margin - 75;
      const boxY = margin + 25;
      const boxWidth = 75;
      const boxHeight = 45;

      doc.setFillColor(lightGrayR, lightGrayG, lightGrayB);
      doc.roundedRect(boxX, boxY, boxWidth, boxHeight, 2, 2, 'F');

      doc.setFontSize(8);
      doc.setTextColor(grayR, grayG, grayB);
      doc.text('Invoice Number', boxX + 4, boxY + 6);
      doc.text('Invoice Date', boxX + 4, boxY + 16);
      doc.text('Status', boxX + 4, boxY + 26);

      doc.setFontSize(9);
      doc.setTextColor(textR, textG, textB);
      doc.setFont('helvetica', 'bold');
      const invoiceNum = invoice.invoiceNumber.length > 18
        ? invoice.invoiceNumber.substring(0, 15) + '...'
        : invoice.invoiceNumber;
      doc.text(invoiceNum, boxX + 4, boxY + 13);
      doc.setFont('helvetica', 'normal');
      doc.text(new Date(invoice.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }), boxX + 4, boxY + 23);

      // Payment Status badge
      const statusR = invoice.paymentStatus === 'paid' ? greenR : 251;
      const statusG = invoice.paymentStatus === 'paid' ? greenG : 191;
      const statusB = invoice.paymentStatus === 'paid' ? greenB : 36;
      doc.setFillColor(statusR, statusG, statusB);
      doc.roundedRect(boxX + 4, boxY + 28, 30, 5, 1, 1, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(7);
      doc.setFont('helvetica', 'bold');
      doc.text(invoice.paymentStatus.toUpperCase(), boxX + 19, boxY + 31, { align: 'center' });
      doc.setTextColor(textR, textG, textB);

      yPos = Math.max(yPos, boxY + boxHeight + 15);

      // Bill To Section (Customer Details)
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('Bill To:', margin, yPos);
      yPos += 7;

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(invoice.admin?.name || 'N/A', margin, yPos);
      yPos += 6;

      if (invoice.admin?.email) {
        doc.setFontSize(9);
        doc.setTextColor(grayR, grayG, grayB);
        doc.text(invoice.admin.email, margin, yPos);
        doc.setTextColor(textR, textG, textB);
        yPos += 5;
      }

      if (invoice.company?.companyName) {
        doc.setFontSize(9);
        doc.setTextColor(grayR, grayG, grayB);
        doc.text(invoice.company.companyName, margin, yPos);
        doc.setTextColor(textR, textG, textB);
        yPos += 5;
      }

      yPos += 15; // Spacing before subscription info

      // Subscription Information Section
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('Subscription Information:', margin, yPos);
      yPos += 8;

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');

      // Plan Name
      doc.setTextColor(grayR, grayG, grayB);
      doc.text('Plan Name:', margin, yPos);
      doc.setTextColor(textR, textG, textB);
      doc.text(invoice.planName, margin + 45, yPos);
      yPos += 6;

      // Billing Cycle
      doc.setTextColor(grayR, grayG, grayB);
      doc.text('Billing Cycle:', margin, yPos);
      doc.setTextColor(textR, textG, textB);
      doc.text(invoice.billingCycle.charAt(0).toUpperCase() + invoice.billingCycle.slice(1), margin + 45, yPos);
      yPos += 6;

      // Subscription Period
      doc.setTextColor(grayR, grayG, grayB);
      doc.text('Subscription Period:', margin, yPos);
      doc.setTextColor(textR, textG, textB);
      const startDate = new Date(invoice.subscriptionStartDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      const endDate = new Date(invoice.subscriptionEndDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      doc.text(`${startDate} - ${endDate}`, margin + 45, yPos);
      yPos += 15; // Spacing before payment details

      // Payment Details Section
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('Payment Details:', margin, yPos);
      yPos += 8;

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');

      // Payment Method
      if (invoice.paymentMethod) {
        doc.setTextColor(grayR, grayG, grayB);
        doc.text('Payment Method:', margin, yPos);
        doc.setTextColor(textR, textG, textB);
        doc.text(invoice.paymentMethod, margin + 45, yPos);
        yPos += 6;
      }

      // Transaction ID
      if (invoice.transactionId) {
        doc.setTextColor(grayR, grayG, grayB);
        doc.text('Transaction ID:', margin, yPos);
        doc.setTextColor(textR, textG, textB);
        const transId = invoice.transactionId.length > 35
          ? invoice.transactionId.substring(0, 32) + '...'
          : invoice.transactionId;
        doc.text(transId, margin + 45, yPos);
        yPos += 6;
      }

      yPos += 15; // Spacing before summary table

      // Invoice Items/Summary Table
      // Table Header
      doc.setFillColor(lightGrayR, lightGrayG, lightGrayB);
      doc.rect(margin, yPos, contentWidth, 7, 'F');
      yPos += 5;

      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('Description', margin + 3, yPos);
      doc.text('Amount', pageWidth - margin - 3, yPos, { align: 'right' });
      yPos += 8;

      // Subscription Item
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text(`${invoice.planName} - ${invoice.billingCycle} subscription`, margin + 3, yPos);
      doc.text(formatCurrency(invoice.amount, invoice.currency), pageWidth - margin - 3, yPos, { align: 'right' });
      yPos += 8;

      // Calculate GST (5%) and PST (7%) from subtotal
      const subtotal = invoice.amount - (invoice.discountAmount || 0);
      const gstRate = 0.05; // 5% GST
      const pstRate = 0.07; // 7% PST
      const gstAmount = subtotal * gstRate;
      const pstAmount = subtotal * pstRate;

      // Use invoice taxAmount if available, otherwise calculate

      const gst = invoice.taxAmount > 0 ? (invoice.taxAmount * (gstRate / (gstRate + pstRate))) : gstAmount;
      const pst = invoice.taxAmount > 0 ? (invoice.taxAmount * (pstRate / (gstRate + pstRate))) : pstAmount;

      // GST
      doc.setTextColor(grayR, grayG, grayB);
      doc.text('GST (5%)', margin + 3, yPos);
      doc.setTextColor(textR, textG, textB);
      doc.text(formatCurrency(gst, invoice.currency), pageWidth - margin - 3, yPos, { align: 'right' });
      yPos += 8;

      // PST
      doc.setTextColor(grayR, grayG, grayB);
      doc.text('PST (7%)', margin + 3, yPos);
      doc.setTextColor(textR, textG, textB);
      doc.text(formatCurrency(pst, invoice.currency), pageWidth - margin - 3, yPos, { align: 'right' });
      yPos += 8;

      // Discount (if exists)
      if (invoice.discountAmount > 0) {
        doc.setTextColor(grayR, grayG, grayB);
        doc.text('Discount', margin + 3, yPos);
        doc.setTextColor(greenR, greenG, greenB);
        doc.text(`-${formatCurrency(invoice.discountAmount, invoice.currency)}`, pageWidth - margin - 3, yPos, { align: 'right' });
        doc.setTextColor(textR, textG, textB);
        yPos += 8;
      }

      yPos += 5;

      // Total
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.5);
      doc.line(margin, yPos, pageWidth - margin, yPos);
      yPos += 8;

      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Total Amount:', margin + 3, yPos);
      doc.text(formatCurrency(invoice.totalAmount, invoice.currency), pageWidth - margin - 3, yPos, { align: 'right' });

      // Notes Section (if exists)
      if (invoice.notes) {
        yPos += 20;
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text('Notes:', margin, yPos);
        yPos += 6;

        doc.setFont('helvetica', 'normal');
        doc.setTextColor(grayR, grayG, grayB);
        const notesLines = doc.splitTextToSize(invoice.notes, contentWidth);
        doc.text(notesLines, margin, yPos);
      }

      // Footer - Thank you message (bottom of page with proper spacing)
      const footerY = pageHeight - 25;
      doc.setFontSize(9);
      doc.setTextColor(grayR, grayG, grayB);
      doc.setFont('helvetica', 'italic');
      doc.text('Thank you for your business!', pageWidth / 2, footerY, { align: 'center' });

      // Save PDF
      const fileName = `Invoice_${invoice.invoiceNumber}_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);
      message.success('Invoice exported successfully');
    } catch (error: any) {
      console.error('Error exporting invoice:', error);
      message.error('Failed to export invoice. Please try again.');
    }
  };

  const handleMoreActions = (invoiceId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    setActiveDropdown(activeDropdown === invoiceId ? null : invoiceId);
  };

  // Filter invoices
  const filteredInvoices = invoices.filter((invoice) => {
    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch =
        invoice.invoiceNumber.toLowerCase().includes(searchLower) ||
        invoice.admin?.name?.toLowerCase().includes(searchLower) ||
        invoice.admin?.email?.toLowerCase().includes(searchLower) ||
        invoice.company?.companyName?.toLowerCase().includes(searchLower) ||
        invoice.planName.toLowerCase().includes(searchLower);

      if (!matchesSearch) return false;
    }

    // Payment status filter
    if (paymentStatusFilter !== 'all' && invoice.paymentStatus !== paymentStatusFilter) {
      return false;
    }

    // Invoice status filter
    if (invoiceStatusFilter !== 'all' && invoice.invoiceStatus !== invoiceStatusFilter) {
      return false;
    }

    return true;
  });

  // Calculate statistics
  const stats = {
    total: invoices.length,
    paid: invoices.filter(i => i.paymentStatus === 'paid').length,
    pending: invoices.filter(i => i.paymentStatus === 'pending').length,
    failed: invoices.filter(i => i.paymentStatus === 'failed').length,
    totalAmount: invoices.reduce((sum, i) => sum + (i.totalAmount || 0), 0),
    paidAmount: invoices.filter(i => i.paymentStatus === 'paid').reduce((sum, i) => sum + (i.totalAmount || 0), 0),
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-secondary">Loading invoices...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-[#A855F7] mb-4">{error}</p>
          <button
            onClick={fetchInvoices}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-card">
      {/* Header */}
      <div className="bg-card border-b border-theme px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-primary flex items-center">
              <Receipt className="w-8 h-8 text-purple-600 mr-3" />
              Subscription Invoices
            </h1>
            <p className="text-secondary mt-1">View and manage all subscription invoices</p>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <div className="bg-card rounded-xl shadow-sm border border-theme p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-secondary mb-1">Total Invoices</p>
                <p className="text-2xl font-bold text-primary">{stats.total}</p>
              </div>
              <div className="bg-purple-100 p-3 rounded-lg">
                <FileText className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>

          <div className="bg-card rounded-xl shadow-sm border border-theme p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-secondary mb-1">Paid Invoices</p>
                <p className="text-2xl font-bold text-green-600">{stats.paid}</p>
              </div>
              <div className="bg-green-100 p-3 rounded-lg">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-card rounded-xl shadow-sm border border-theme p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-secondary mb-1">Pending Invoices</p>
                <p className="text-2xl font-bold text-[#00FFA3]">{stats.pending}</p>
              </div>
              <div className="bg-yellow-100 p-3 rounded-lg">
                <Clock className="w-6 h-6 text-[#00FFA3]" />
              </div>
            </div>
          </div>

          <div className="bg-card rounded-xl shadow-sm border border-theme p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-secondary mb-1">Total Revenue</p>
                <p className="text-2xl font-bold text-primary">
                  {formatCurrency(stats.totalAmount)}
                </p>
                <p className="text-xs text-secondary mt-1">
                  Paid: {formatCurrency(stats.paidAmount)}
                </p>
              </div>
              <div className="bg-blue-100 p-3 rounded-lg">
                <DollarSign className="w-6 h-6 text-[#00D1FF]" />
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div style={{
          backgroundColor: 'rgba(255,255,255,0.04)',
          borderRadius: '12px',
          border: '1px solid rgba(255,255,255,0.12)',
          padding: '16px',
          marginBottom: '24px'
        }}>
          <div style={{ display: 'flex', flexDirection: 'row', gap: '16px', flexWrap: 'wrap' }}>

            <div style={{ flex: 1, position: 'relative', minWidth: '200px' }}>

              <Search
                style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'white',
                  width: '20px',
                  height: '20px',
                  zIndex: 2
                }}
              />

              {/* Fake Placeholder */}
              {!searchTerm && (
                <span
                  style={{
                    position: 'absolute',
                    left: '40px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'rgba(226, 232, 240, 0.6)',
                    pointerEvents: 'none',
                    fontSize: '14px',
                    zIndex: 1
                  }}
                >
                  Search invoices, customers, plans, or admins...
                </span>
              )}

              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                size="large"
                style={{
                  paddingLeft: '40px',
                  backgroundColor: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: '10px',
                  color: '#e2e8f0',
                  width: '100%',
                }}
              />
            </div>

            {/* Payment Status */}
            <div
              style={{
                backgroundColor: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: '10px',
                overflow: 'hidden',
                transition: 'border-color 0.2s ease',
              }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(139,92,246,0.6)')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)')}
            >
              <Select
                value={paymentStatusFilter}
                onChange={setPaymentStatusFilter}
                size="large"
                variant="borderless"
                style={{ width: '192px', color: '#e2e8f0' }}
                dropdownStyle={{
                  backgroundColor: '#1a1f2e',
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: '10px',
                  padding: '6px'
                }}
                optionLabelProp="label"
              >
                <Select.Option value="all" label={<span style={{ color: '#e2e8f0' }}>All Payments</span>}>
                  <span style={{ color: '#e2e8f0' }}>All Payments</span>
                </Select.Option>

                <Select.Option value="paid" label={<span style={{ color: '#22c55e' }}>Paid</span>}>
                  <span style={{ color: '#22c55e' }}>Paid</span>
                </Select.Option>

                <Select.Option value="pending" label={<span style={{ color: '#f59e0b' }}>Pending</span>}>
                  <span style={{ color: '#f59e0b' }}>Pending</span>
                </Select.Option>

                <Select.Option value="failed" label={<span style={{ color: '#ef4444' }}>Failed</span>}>
                  <span style={{ color: '#ef4444' }}>Failed</span>
                </Select.Option>

                <Select.Option value="refunded" label={<span style={{ color: '#38bdf8' }}>Refunded</span>}>
                  <span style={{ color: '#38bdf8' }}>Refunded</span>
                </Select.Option>
              </Select>
            </div>

            {/* Invoice Status */}
            <div
              style={{
                backgroundColor: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: '10px',
                overflow: 'hidden',
                transition: 'border-color 0.2s ease',
              }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(139,92,246,0.6)')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)')}
            >
              <Select
                value={invoiceStatusFilter}
                onChange={setInvoiceStatusFilter}
                size="large"
                variant="borderless"
                style={{ width: '192px', color: '#e2e8f0' }}
                dropdownStyle={{
                  backgroundColor: '#1a1f2e',
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: '10px',
                  padding: '6px'
                }}
                optionLabelProp="label"
              >
                <Select.Option value="all" label={<span style={{ color: '#e2e8f0' }}>All Invoices</span>}>
                  <span style={{ color: '#e2e8f0' }}>All Invoices</span>
                </Select.Option>

                <Select.Option value="generated" label={<span style={{ color: '#22c55e' }}>Generated</span>}>
                  <span style={{ color: '#22c55e' }}>Generated</span>
                </Select.Option>

                <Select.Option value="cancelled" label={<span style={{ color: '#ef4444' }}>Cancelled</span>}>
                  <span style={{ color: '#ef4444' }}>Cancelled</span>
                </Select.Option>
              </Select>
            </div>

          </div>
        </div>

        {/* Invoices Table */}
        <div className="bg-card rounded-xl shadow-sm border border-theme overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full table-auto">
              <thead className="bg-card border-b border-theme">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                    Invoice Number
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                    Plan
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                    Payment Status
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                    Subscription Period
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-card  divide-theme">
                {filteredInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center">
                      <FileText className="w-12 h-12 text-secondary mx-auto mb-4" />
                      <p className="text-secondary font-medium">No invoices found</p>
                      <p className="text-secondary text-sm mt-1">
                        {searchTerm || paymentStatusFilter !== 'all' || invoiceStatusFilter !== 'all'
                          ? 'Try adjusting your filters'
                          : 'No invoices have been generated yet'}
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredInvoices.map((invoice) => (
                    <tr key={invoice._id} className="hover:bg-[rgba(255,255,255,0.03)]">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="bg-purple-100 p-2 rounded-lg mr-3">
                            <Receipt className="w-5 h-5 text-purple-600" />
                          </div>
                          <div>
                            <div className="text-sm font-medium text-primary">
                              {invoice.invoiceNumber}
                            </div>
                            <div className="text-xs text-secondary">
                              {invoice.billingCycle === 'monthly' ? 'Monthly' : 'Yearly'}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div className="bg-blue-100 p-2 rounded-lg mr-3">
                            <Building2 className="w-5 h-5 text-[#00D1FF]" />
                          </div>
                          <div>
                            <div className="text-sm font-medium text-primary">
                              {invoice.admin?.name || 'N/A'}
                            </div>
                            {invoice.company?.companyName && (
                              <div className="text-xs text-secondary">
                                {invoice.company.companyName}
                              </div>
                            )}
                            {invoice.admin?.email && (
                              <div className="text-xs text-secondary">
                                {invoice.admin.email}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-primary">
                          {invoice.planName}
                        </div>
                        {invoice.subscriptionPlan && (
                          <div className="text-xs text-secondary">
                            Plan ID: {invoice.subscriptionPlan._id.slice(-8)}
                          </div>
                        )}
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-bold text-primary">
                          {formatCurrency(invoice.totalAmount, invoice.currency)}
                        </div>
                        {invoice.taxAmount > 0 && (
                          <div className="text-xs text-secondary">
                            Tax: {formatCurrency(invoice.taxAmount, invoice.currency)}
                          </div>
                        )}
                        {invoice.discountAmount > 0 && (
                          <div className="text-xs text-green-600">
                            Discount: -{formatCurrency(invoice.discountAmount, invoice.currency)}
                          </div>
                        )}
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {getPaymentStatusIcon(invoice.paymentStatus)}
                          <span className={`ml-2 px-3 py-1 rounded-full text-xs font-medium ${getPaymentStatusColor(invoice.paymentStatus)}`}>
                            {invoice.paymentStatus.charAt(0).toUpperCase() + invoice.paymentStatus.slice(1)}
                          </span>
                        </div>
                        {invoice.paymentMethod && (
                          <div className="text-xs text-secondary mt-1">
                            {invoice.paymentMethod}
                          </div>
                        )}
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-primary">
                          {new Date(invoice.subscriptionStartDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </div>
                        <div className="text-xs text-secondary">
                          to {new Date(invoice.subscriptionEndDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </div>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-primary">
                          {new Date(invoice.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </div>
                        <div className="text-xs text-secondary">
                          {new Date(invoice.createdAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                        </div>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleViewDetails(invoice)}
                            className="text-secondary hover:text-purple-600 p-1 rounded transition-colors"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <div className="relative" ref={(el) => { dropdownRefs.current[invoice._id] = el; }}>
                            <button
                              onClick={(e) => handleMoreActions(invoice._id, e)}
                              className="text-secondary hover:text-secondary p-1 rounded transition-colors"
                              title="More Actions"
                            >
                              <MoreHorizontal className="w-4 h-4" />
                            </button>
                            {activeDropdown === invoice._id && (
                              <>
                                <div
                                  className="fixed inset-0 z-[9998]"
                                  onClick={() => setActiveDropdown(null)}
                                />
                                <div className="absolute right-0 bottom-full mb-2 w-48 bg-card rounded-lg shadow-xl border border-theme z-[9999] py-1 overflow-hidden">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleCopyInvoiceNumber(invoice.invoiceNumber);
                                      setActiveDropdown(null);
                                    }}
                                    className="w-full text-left px-4 py-2 text-sm text-primary hover:bg-[rgba(255,255,255,0.03)] flex items-center space-x-2 transition-colors"
                                  >
                                    <Copy className="w-4 h-4" />
                                    <span>Copy Invoice #</span>
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleCopyId(invoice._id);
                                      setActiveDropdown(null);
                                    }}
                                    className="w-full text-left px-4 py-2 text-sm text-primary hover:bg-[rgba(255,255,255,0.03)] flex items-center space-x-2 transition-colors"
                                  >
                                    <Copy className="w-4 h-4" />
                                    <span>Copy Invoice ID</span>
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleExport(invoice);
                                      setActiveDropdown(null);
                                    }}
                                    className="w-full text-left px-4 py-2 text-sm text-primary hover:bg-[rgba(255,255,255,0.03)] flex items-center space-x-2 transition-colors"
                                  >
                                    <Download className="w-4 h-4" />
                                    <span>Export Invoice</span>
                                  </button>
                                  {invoice.admin?._id && (
                                    <>
                                      <div className="border-t border-theme my-1"></div>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setActiveDropdown(null);
                                          navigate('/superadmin/viewalladmins');
                                          setTimeout(() => {
                                            message.info({
                                              content: `Navigate to Admin Accounts page. Search for admin ID: ${invoice.admin?._id}`,
                                              duration: 5,
                                            });
                                          }, 300);
                                        }}
                                        className="w-full text-left px-4 py-2 text-sm text-primary hover:bg-[rgba(255,255,255,0.03)] flex items-center space-x-2 transition-colors"
                                      >
                                        <ExternalLink className="w-4 h-4" />
                                        <span>View Admin Profile</span>
                                      </button>
                                    </>
                                  )}
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Results Summary */}
        {filteredInvoices.length > 0 && (
          <div className="mt-4 text-sm text-secondary">
            Showing <span className="font-medium">{filteredInvoices.length}</span> of{' '}
            <span className="font-medium">{invoices.length}</span> invoices
          </div>
        )}
      </div>

      {/* View Invoice Details Modal */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Receipt style={{ width: '20px', height: '20px', color: '#8b5cf6' }} />
            <span style={{ color: '#e2e8f0', fontWeight: 600 }}>Invoice Details</span>
          </div>
        }
        open={showViewModal}
        onCancel={() => {
          setShowViewModal(false);
          setSelectedInvoice(null);
        }}
        footer={[
          <Button
            key="close"
            onClick={() => {
              setShowViewModal(false);
              setSelectedInvoice(null);
            }}
            style={{
              backgroundColor: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.12)',
              color: '#e2e8f0',
              borderRadius: '8px',
            }}
          >
            Close
          </Button>,
          <Button
            key="export"
            type="primary"
            icon={<Download style={{ width: '16px', height: '16px' }} />}
            onClick={() => {
              if (selectedInvoice) handleExport(selectedInvoice);
            }}
            style={{
              backgroundColor: '#7c3aed',
              border: '1px solid #6d28d9',
              color: '#fff',
              borderRadius: '8px',
            }}
          >
            Export
          </Button>
        ]}
        width={800}
        styles={{
          content: {
            backgroundColor: '#0f1623',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '14px',
            padding: '24px',
          },
          header: {
            backgroundColor: '#0f1623',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
            paddingBottom: '12px',
            marginBottom: '4px',
          },
          footer: {
            backgroundColor: '#0f1623',
            borderTop: '1px solid rgba(255,255,255,0.08)',
            paddingTop: '12px',
          },
          mask: {
            backgroundColor: 'rgba(0,0,0,0.6)',
          },
        }}
      >
        {selectedInvoice && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', paddingTop: '8px' }}>

            {/* Invoice Header */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(139,92,246,0.15), rgba(99,102,241,0.1))',
              borderRadius: '10px',
              padding: '16px',
              border: '1px solid rgba(139,92,246,0.25)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#e2e8f0', margin: 0 }}>
                    {selectedInvoice.invoiceNumber}
                  </h3>
                  <p style={{ fontSize: '12px', color: '#94a3b8', margin: '4px 0 0' }}>
                    Invoice ID: {selectedInvoice._id}
                  </p>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
                  <Tag color={selectedInvoice.paymentStatus === 'paid' ? 'success' : selectedInvoice.paymentStatus === 'pending' ? 'warning' : 'error'}>
                    {selectedInvoice.paymentStatus.charAt(0).toUpperCase() + selectedInvoice.paymentStatus.slice(1)}
                  </Tag>
                  <Tag color={selectedInvoice.invoiceStatus === 'generated' ? 'blue' : 'red'}>
                    {selectedInvoice.invoiceStatus.charAt(0).toUpperCase() + selectedInvoice.invoiceStatus.slice(1)}
                  </Tag>
                </div>
              </div>
            </div>

            {/* Customer Information */}
            <div style={{
              backgroundColor: 'rgba(255,255,255,0.03)',
              borderRadius: '10px',
              padding: '16px',
              border: '1px solid rgba(255,255,255,0.08)',
            }}>
              <h3 style={{ fontSize: '13px', fontWeight: 600, color: '#e2e8f0', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Building2 style={{ width: '16px', height: '16px', color: '#8b5cf6' }} />
                Customer Information
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <p style={{ fontSize: '11px', color: '#64748b', marginBottom: '4px' }}>Admin Name</p>
                  <p style={{ fontSize: '13px', fontWeight: 500, color: '#e2e8f0', margin: 0 }}>{selectedInvoice.admin?.name || 'N/A'}</p>
                </div>
                <div>
                  <p style={{ fontSize: '11px', color: '#64748b', marginBottom: '4px' }}>Admin Email</p>
                  <p style={{ fontSize: '13px', fontWeight: 500, color: '#e2e8f0', margin: 0 }}>{selectedInvoice.admin?.email || 'N/A'}</p>
                </div>
                {selectedInvoice.company?.companyName && (
                  <div style={{ gridColumn: 'span 2' }}>
                    <p style={{ fontSize: '11px', color: '#64748b', marginBottom: '4px' }}>Company Name</p>
                    <p style={{ fontSize: '13px', fontWeight: 500, color: '#e2e8f0', margin: 0 }}>{selectedInvoice.company.companyName}</p>
                  </div>
                )}
                {selectedInvoice.admin?.internalId && (
                  <div>
                    <p style={{ fontSize: '11px', color: '#64748b', marginBottom: '4px' }}>Admin ID</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <p style={{ fontSize: '13px', fontWeight: 500, color: '#e2e8f0', margin: 0 }}>{selectedInvoice.admin.internalId}</p>
                      <button
                        onClick={() => handleCopyId(selectedInvoice.admin!._id)}
                        title="Copy ID"
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: 0, display: 'flex' }}
                      >
                        <Copy style={{ width: '12px', height: '12px' }} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Plan Information */}
            <div style={{
              backgroundColor: 'rgba(255,255,255,0.03)',
              borderRadius: '10px',
              padding: '16px',
              border: '1px solid rgba(255,255,255,0.08)',
            }}>
              <h3 style={{ fontSize: '13px', fontWeight: 600, color: '#e2e8f0', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CreditCard style={{ width: '16px', height: '16px', color: '#8b5cf6' }} />
                Plan Information
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <p style={{ fontSize: '11px', color: '#64748b', marginBottom: '4px' }}>Plan Name</p>
                  <p style={{ fontSize: '13px', fontWeight: 500, color: '#e2e8f0', margin: 0 }}>{selectedInvoice.planName}</p>
                </div>
                <div>
                  <p style={{ fontSize: '11px', color: '#64748b', marginBottom: '4px' }}>Billing Cycle</p>
                  <p style={{ fontSize: '13px', fontWeight: 500, color: '#e2e8f0', margin: 0, textTransform: 'capitalize' }}>{selectedInvoice.billingCycle}</p>
                </div>
                <div>
                  <p style={{ fontSize: '11px', color: '#64748b', marginBottom: '4px' }}>Subscription Start</p>
                  <p style={{ fontSize: '13px', fontWeight: 500, color: '#e2e8f0', margin: 0 }}>
                    {new Date(selectedInvoice.subscriptionStartDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>
                <div>
                  <p style={{ fontSize: '11px', color: '#64748b', marginBottom: '4px' }}>Subscription End</p>
                  <p style={{ fontSize: '13px', fontWeight: 500, color: '#e2e8f0', margin: 0 }}>
                    {new Date(selectedInvoice.subscriptionEndDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>
              </div>
            </div>

            {/* Payment Information */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(16,185,129,0.1), rgba(5,150,105,0.07))',
              borderRadius: '10px',
              padding: '16px',
              border: '1px solid rgba(16,185,129,0.2)',
            }}>
              <h3 style={{ fontSize: '13px', fontWeight: 600, color: '#e2e8f0', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <DollarSign style={{ width: '16px', height: '16px', color: '#10b981' }} />
                Payment Information
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '13px', color: '#94a3b8' }}>Subtotal</span>
                  <span style={{ fontSize: '13px', fontWeight: 500, color: '#e2e8f0' }}>
                    {formatCurrency(selectedInvoice.amount, selectedInvoice.currency)}
                  </span>
                </div>
                {selectedInvoice.taxAmount > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '13px', color: '#94a3b8' }}>Tax</span>
                    <span style={{ fontSize: '13px', fontWeight: 500, color: '#e2e8f0' }}>
                      {formatCurrency(selectedInvoice.taxAmount, selectedInvoice.currency)}
                    </span>
                  </div>
                )}
                {selectedInvoice.discountAmount > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '13px', color: '#94a3b8' }}>Discount</span>
                    <span style={{ fontSize: '13px', fontWeight: 500, color: '#34d399' }}>
                      -{formatCurrency(selectedInvoice.discountAmount, selectedInvoice.currency)}
                    </span>
                  </div>
                )}
                <div style={{
                  borderTop: '1px solid rgba(16,185,129,0.2)',
                  paddingTop: '12px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <span style={{ fontSize: '14px', fontWeight: 600, color: '#e2e8f0' }}>Total Amount</span>
                  <span style={{ fontSize: '20px', fontWeight: 700, color: '#e2e8f0' }}>
                    {formatCurrency(selectedInvoice.totalAmount, selectedInvoice.currency)}
                  </span>
                </div>
                {selectedInvoice.paymentMethod && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '13px', color: '#94a3b8' }}>Payment Method</span>
                    <span style={{ fontSize: '13px', fontWeight: 500, color: '#e2e8f0' }}>{selectedInvoice.paymentMethod}</span>
                  </div>
                )}
                {selectedInvoice.transactionId && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '13px', color: '#94a3b8' }}>Transaction ID</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 500, color: '#e2e8f0', fontFamily: 'monospace' }}>
                        {selectedInvoice.transactionId}
                      </span>
                      <button
                        onClick={() => handleCopyId(selectedInvoice.transactionId!)}
                        title="Copy Transaction ID"
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: 0, display: 'flex' }}
                      >
                        <Copy style={{ width: '12px', height: '12px' }} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Additional Information */}
            <div style={{
              backgroundColor: 'rgba(255,255,255,0.03)',
              borderRadius: '10px',
              padding: '16px',
              border: '1px solid rgba(255,255,255,0.08)',
            }}>
              <h3 style={{ fontSize: '13px', fontWeight: 600, color: '#e2e8f0', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Calendar style={{ width: '16px', height: '16px', color: '#8b5cf6' }} />
                Additional Information
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <p style={{ fontSize: '11px', color: '#64748b', marginBottom: '4px' }}>Created At</p>
                  <p style={{ fontSize: '13px', fontWeight: 500, color: '#e2e8f0', margin: 0 }}>
                    {new Date(selectedInvoice.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}{' '}
                    {new Date(selectedInvoice.createdAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                  </p>
                </div>
                <div>
                  <p style={{ fontSize: '11px', color: '#64748b', marginBottom: '4px' }}>Last Updated</p>
                  <p style={{ fontSize: '13px', fontWeight: 500, color: '#e2e8f0', margin: 0 }}>
                    {new Date(selectedInvoice.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}{' '}
                    {new Date(selectedInvoice.updatedAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                  </p>
                </div>
                {selectedInvoice.notes && (
                  <div style={{ gridColumn: 'span 2' }}>
                    <p style={{ fontSize: '11px', color: '#64748b', marginBottom: '4px' }}>Notes</p>
                    <p style={{
                      fontSize: '13px',
                      color: '#e2e8f0',
                      backgroundColor: 'rgba(255,255,255,0.04)',
                      padding: '8px',
                      borderRadius: '6px',
                      border: '1px solid rgba(255,255,255,0.08)',
                      margin: 0,
                    }}>
                      {selectedInvoice.notes}
                    </p>
                  </div>
                )}
              </div>
            </div>

          </div>
        )}
      </Modal>
    </div>
  );
};

export default InvoicesPage;

