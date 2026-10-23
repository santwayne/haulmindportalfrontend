import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import ExcelJS from 'exceljs';
import { Plus, Edit, Trash2, Search, Download, AlertCircle, Clock, X, Mail, FileText, ExternalLink } from 'lucide-react';
import { FaExclamationCircle, FaTimes } from 'react-icons/fa';
import {
  listGeneralRepairs,
  createGeneralRepair,
  updateGeneralRepair,
  deleteGeneralRepair,
  sendMaintenanceOrderEmail,
  verifyMaintenanceOrder,
  type GeneralRepairDto,
  type GeneralRepairPayload
} from '../../../../axios/api/generalRepairs';
import { getAllVehicles } from '../../../../axios/api/vehicle';
import { getAllEmployees } from '../../../../axios/api/employee';


interface UnitOption {
  _id?: string;
  unitNo: string;
  makeModel?: string;
  vin?: string;
  referenceType?: string;
  referenceId?: string;
}

interface ServiceProviderOption {
  id: string;
  name: string;
  role: string;
  email?: string;
  internalId?: string;
}

interface NotificationState {
  type: 'success' | 'error';
  message: string;
}

interface FormState {
  serviceDate: string;
  unitNumber: string;
  description: string;
  odometer: string;
  notes: string;
  serviceProvider: string;
  serviceProviderId?: string;
  status?: string;
  shared?: boolean;
  mechanicType: 'internal' | 'external';
  externalMechanicCompany: string;
  externalMechanicPhone: string;
  externalMechanicEmail: string;
}

const formatDate = (value?: string) => {
  if (!value) return 'N/A';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'N/A';
  return parsed.toLocaleDateString();
};

/** Normalize a date value to YYYY-MM-DD for use in <input type="date"> */
const toDateInputValue = (value?: string | null): string => {
  if (value == null || value === '') return '';
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10);
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '';
  return parsed.toISOString().slice(0, 10);
};

const Toast: React.FC<{ notification: NotificationState; onClose: () => void }> = ({ notification, onClose }) => {
  const colors =
    notification.type === 'success'
      ? 'border-green-200 bg-green-50 text-green-800'
      : 'border-red-200 bg-card text-red-800';

  return (
    <div className="fixed top-6 right-6 z-[1200] w-full max-w-sm animate-slide-in">
      <div className={`rounded-lg border px-4 py-3 shadow-lg flex items-start gap-3 ${colors}`}>
        <div className="flex-1 text-sm">{notification.message}</div>
        <button
          onClick={onClose}
          className="text-xs font-semibold uppercase tracking-wide opacity-70 hover:opacity-100"
        >
          Close
        </button>
      </div>
    </div>
  );
};

const GeneralRepairsLog: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [repairs, setRepairs] = useState<GeneralRepairDto[]>([]);
  const [units, setUnits] = useState<UnitOption[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedRepair, setSelectedRepair] = useState<GeneralRepairDto | null>(null);
  const [showRepairDetails, setShowRepairDetails] = useState(false);
  const [formData, setFormData] = useState<FormState>({
    serviceDate: new Date().toISOString().split('T')[0],
    unitNumber: '',
    description: '',
    odometer: '',
    notes: '',
    serviceProvider: '',
    serviceProviderId: undefined,
    status: 'Created',
    shared: false,
    mechanicType: 'internal',
    externalMechanicCompany: '',
    externalMechanicPhone: '',
    externalMechanicEmail: '',
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [notification, setNotification] = useState<NotificationState | null>(null);
  const [requiresCompanySetup, setRequiresCompanySetup] = useState(false);
  const [serviceProviders, setServiceProviders] = useState<ServiceProviderOption[]>([]);
  const [serviceProvidersLoading, setServiceProvidersLoading] = useState(false);
  const [serviceProvidersError, setServiceProvidersError] = useState<string | null>(null);
  // useCustomProvider replaced by formData.mechanicType toggle
  const [filterMechanicType, setFilterMechanicType] = useState<'all' | 'internal' | 'external'>('all');
  const [exporting, setExporting] = useState(false);
  const [sending, setSending] = useState(false);

  // Refs for scrollbar synchronization
  const topScrollRef = useRef<HTMLDivElement>(null);
  const bottomScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm.trim()), 400);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    if (!notification) return;
    const timer = setTimeout(() => setNotification(null), 4000);
    return () => clearTimeout(timer);
  }, [notification]);

  const loadUnits = useCallback(async () => {
    try {
      const response = await getAllVehicles(1, 1000);
      if (response?.success && response?.data) {
        setUnits(
          response.data.map((vehicle: any) => ({
            _id: vehicle._id,
            unitNo: vehicle.unitNumber || vehicle.internalId || vehicle.plateNumber || '',
            makeModel: [vehicle.make, vehicle.model].filter(Boolean).join(' ').trim() || undefined,
            vin: vehicle.vinNumber || vehicle.plateNumber || undefined,
            referenceType: 'vehicle',
            referenceId: vehicle._id
          })) || []
        );
      }
    } catch (err) {
      console.error('Failed to load vehicles', err);
    }
  }, []);

  const loadServiceProviders = useCallback(async () => {
    setServiceProvidersLoading(true);
    setServiceProvidersError(null);
    try {
      const response = await getAllEmployees();
      if (response?.success) {
        const mechanics =
          response.data
            ?.filter((employee: any) =>
              (employee?.role || '').toLowerCase().includes('mechanic')
            )
            .map((employee: any) => ({
              id: employee._id,
              name: employee.name || employee.internalId || employee.email || 'Mechanic',
              role: employee.role || 'Mechanic',
              email: employee.email,
              internalId: employee.internalId
            })) || [];
        setServiceProviders(mechanics);
      } else {
        setServiceProviders([]);
        setServiceProvidersError(response?.message || 'Unable to load mechanics.');
      }
    } catch (err: any) {
      console.error('Failed to load mechanics', err);
      setServiceProviders([]);
      setServiceProvidersError(err?.response?.data?.message || err?.message || 'Unable to load mechanics.');
    } finally {
      setServiceProvidersLoading(false);
    }
  }, [showEditModal]);

  // Update status when service provider changes
  useEffect(() => {
    if (formData.serviceProviderId) {
      setFormData(prev => ({ ...prev, status: 'Assigned' }));
    } else if (formData.serviceProvider) {
      setFormData(prev => ({ ...prev, status: 'Created' }));
    } else {
      setFormData(prev => ({ ...prev, status: 'Created' }));
    }
  }, [formData.serviceProviderId, formData.serviceProvider]);



  const loadRepairs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await listGeneralRepairs(debouncedSearch || undefined);
      if (response?.success) {
        setRepairs(response.data || []);
        setRequiresCompanySetup(!!response.requiresCompanySetup);
      } else {
        setRepairs([]);
        setRequiresCompanySetup(!!response.requiresCompanySetup);
        setError(response?.message || 'Failed to fetch repairs');
      }
    } catch (err: any) {
      setRepairs([]);
      setError(err?.response?.data?.message || err?.message || 'Failed to fetch repairs');
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch]);

  useEffect(() => {
    loadUnits();
  }, [loadUnits]);

  useEffect(() => {
    loadServiceProviders();
  }, [loadServiceProviders]);

  useEffect(() => {
    loadRepairs();
  }, [loadRepairs]);

  // Sync scroll between top and bottom scrollbars
  useEffect(() => {
    const topScroll = topScrollRef.current;
    const bottomScroll = bottomScrollRef.current;

    if (!topScroll || !bottomScroll) return;

    let isScrolling = false;

    const handleTopScroll = () => {
      if (isScrolling) return;
      isScrolling = true;
      bottomScroll.scrollLeft = topScroll.scrollLeft;
      requestAnimationFrame(() => {
        isScrolling = false;
      });
    };

    const handleBottomScroll = () => {
      if (isScrolling) return;
      isScrolling = true;
      topScroll.scrollLeft = bottomScroll.scrollLeft;
      requestAnimationFrame(() => {
        isScrolling = false;
      });
    };

    // Sync scroll widths
    const syncScrollWidths = () => {
      const bottomScrollWidth = bottomScroll.scrollWidth;
      const topInner = topScroll.querySelector('.top-scroll-content') as HTMLElement;
      if (topInner && bottomScrollWidth > 0) {
        topInner.style.width = `${bottomScrollWidth}px`;
        topScroll.scrollLeft = bottomScroll.scrollLeft;
      }
    };

    // Initial sync - wait for table to render
    const timeoutId = setTimeout(syncScrollWidths, 100);
    const timeoutId2 = setTimeout(syncScrollWidths, 300);
    const timeoutId3 = setTimeout(syncScrollWidths, 500);

    // Observe table changes
    const tableObserver = new MutationObserver(() => {
      syncScrollWidths();
    });

    const bottomTable = bottomScroll.querySelector('table');
    if (bottomTable) {
      tableObserver.observe(bottomTable, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['style', 'class']
      });
    }

    topScroll.addEventListener('scroll', handleTopScroll, { passive: true });
    bottomScroll.addEventListener('scroll', handleBottomScroll, { passive: true });
    window.addEventListener('resize', syncScrollWidths);

    return () => {
      clearTimeout(timeoutId);
      clearTimeout(timeoutId2);
      clearTimeout(timeoutId3);
      tableObserver.disconnect();
      topScroll.removeEventListener('scroll', handleTopScroll);
      bottomScroll.removeEventListener('scroll', handleBottomScroll);
      window.removeEventListener('resize', syncScrollWidths);
    };
  }, [repairs, searchTerm]);

  // serviceProviderId sync is now handled in handleEditRepair

  const formatTaxesDisplay = useCallback((taxes: { name: string; percentage: number }[] | undefined) => {
    if (!taxes?.length) return '—';
    return taxes.map((t) => `${t.name || 'Tax'}${t.percentage != null ? ` ${t.percentage}%` : ''}`).filter(Boolean).join(', ') || '—';
  }, []);


  const filteredRepairs = useMemo(() => {
    let result = repairs;
    if (filterMechanicType !== 'all') {
      result = result.filter((repair) => (repair.mechanicType || 'internal') === filterMechanicType);
    }
    if (!searchTerm) return result;
    const term = searchTerm.toLowerCase();
    return result.filter((repair) => {
      return (
        repair.unitNumber.toLowerCase().includes(term) ||
        (repair.makeModel || '').toLowerCase().includes(term) ||
        (repair.invoiceNumber || '').toLowerCase().includes(term) ||
        repair.description.toLowerCase().includes(term)
      );
    });
  }, [repairs, searchTerm, filterMechanicType]);

  // Calculate summary statistics
  const summaryStats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    thirtyDaysAgo.setHours(0, 0, 0, 0);
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    // Count recent repairs (within last 30 days) as potential incoming maintenance indicators
    const recentRepairs = repairs.filter((repair) => {
      if (!repair.serviceDate) return false;
      const serviceDate = new Date(repair.serviceDate);
      serviceDate.setHours(0, 0, 0, 0);
      return serviceDate >= thirtyDaysAgo;
    });

    const incomingMaintenance = recentRepairs.length;

    // Get repairs from last 7 days (more urgent)
    const urgentRepairs = recentRepairs.filter((repair) => {
      if (!repair.serviceDate) return false;
      const serviceDate = new Date(repair.serviceDate);
      serviceDate.setHours(0, 0, 0, 0);
      return serviceDate >= sevenDaysAgo;
    }).length;

    // Get unique units with recent repairs
    const unitsWithRecentRepairs = new Set(recentRepairs.map(r => r.unitNumber)).size;

    // Get most recent repair date
    const mostRecentRepairDate = recentRepairs.length > 0
      ? recentRepairs
        .map(r => r.serviceDate ? new Date(r.serviceDate) : null)
        .filter(Boolean)
        .sort((a, b) => (b as Date).getTime() - (a as Date).getTime())[0]
      : null;

    // Recent Activity - all repairs in last 30 days
    const recentActivity = recentRepairs.length;

    // Get repair type breakdown (based on description keywords)
    const repairTypeBreakdown = recentRepairs.reduce((acc, repair) => {
      const desc = (repair.description || '').toLowerCase();
      let type = 'Other';
      if (desc.includes('tire') || desc.includes('tyre')) type = 'Tires';
      else if (desc.includes('brake')) type = 'Brakes';
      else if (desc.includes('accident') || desc.includes('collision')) type = 'Accident';
      else if (desc.includes('engine')) type = 'Engine';
      else if (desc.includes('transmission')) type = 'Transmission';
      else if (desc.includes('electrical')) type = 'Electrical';

      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const topRepairType = Object.entries(repairTypeBreakdown)
      .sort(([, a], [, b]) => b - a)[0];

    return {
      incomingMaintenance,
      urgentRepairs,
      unitsWithRecentRepairs,
      recentActivity,
      mostRecentRepairDate,
      topRepairType: topRepairType ? `${topRepairType[0]} (${topRepairType[1]})` : null
    };
  }, [repairs]);

  const handleExportRepairs = async () => {
    if (!filteredRepairs.length) {
      alert('No maintenance order records available to export.');
      return;
    }

    try {
      setExporting(true);
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Maintenance Orders');

      worksheet.columns = [
        { header: 'Service Date', key: 'serviceDate', width: 16 },
        { header: 'Unit Number', key: 'unitNumber', width: 16 },
        { header: 'Make / Model', key: 'makeModel', width: 24 },
        { header: 'Description', key: 'description', width: 32 },
        { header: 'Odometer', key: 'odometer', width: 14 },
        { header: 'Parts', key: 'parts', width: 28 },
        { header: 'Notes', key: 'notes', width: 32 },
        { header: 'Service Provider', key: 'serviceProvider', width: 24 },
        { header: 'Taxes', key: 'taxes', width: 24 },
        { header: 'Invoice #', key: 'invoiceNumber', width: 18 },
        { header: 'Amount', key: 'amount', width: 16 }
      ];

      worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
      worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF0EA5E9' }
      };

      filteredRepairs.forEach((repair) => {
        worksheet.addRow({
          serviceDate: formatDate(repair.serviceDate),
          unitNumber: repair.unitNumber,
          makeModel: repair.makeModel || 'N/A',
          description: repair.description,
          odometer: repair.odometer ?? 'N/A',
          parts: Array.isArray(repair.parts)
            ? repair.parts.map((p: any) => `${p.partName || p.partNumber || 'Part'} (Qty: ${p.quantity || 1})`).join(', ')
            : (repair.parts || 'N/A'),
          notes: repair.notes || '',
          serviceProvider: repair.serviceProvider,
          taxes: formatTaxesDisplay(repair.taxes),
          invoiceNumber: repair.invoiceNumber || 'N/A',
          amount: repair.amount ? new Intl.NumberFormat('en-CA', {
            style: 'currency',
            currency: 'CAD',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }).format(repair.amount) : 'N/A'
        });
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Maintenance_Orders_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export maintenance orders', error);
      alert('Unable to export maintenance order records. Please try again.');
    } finally {
      setExporting(false);
    }
  };


  const handleAddRepair = () => {
    setFormData({
      serviceDate: new Date().toISOString().split('T')[0],
      unitNumber: '',
      description: '',
      odometer: '',
      notes: '',
      serviceProvider: '',
      serviceProviderId: undefined,
      status: 'Created',
      shared: false,
      mechanicType: 'internal',
      externalMechanicCompany: '',
      externalMechanicPhone: '',
      externalMechanicEmail: '',
    });
    setFormError(null);
    setShowAddModal(true);
  };

  const handleEditRepair = (repair: GeneralRepairDto) => {
    setSelectedRepair(repair);
    setFormError(null);
    const mType = repair.mechanicType || 'internal';
    const providerMatch = mType === 'internal' ? serviceProviders.find((p) => p.name === repair.serviceProvider) : undefined;
    const status = providerMatch ? 'Assigned' : (repair.status || 'Created');
    setFormData({
      serviceDate: toDateInputValue(repair.serviceDate),
      unitNumber: repair.unitNumber,
      description: repair.description,
      odometer: repair.odometer?.toString() || '',
      notes: repair.notes || '',
      serviceProvider: repair.serviceProvider,
      serviceProviderId: providerMatch?.id,
      status: status,
      shared: (repair as any).shared || false,
      mechanicType: mType,
      externalMechanicCompany: repair.externalMechanicCompany || '',
      externalMechanicPhone: repair.externalMechanicPhone || '',
      externalMechanicEmail: repair.externalMechanicEmail || '',
    });
    setShowEditModal(true);
  };

  const handleDeleteRepair = (repair: GeneralRepairDto) => {
    setSelectedRepair(repair);
    setShowDeleteModal(true);
  };

  const closeModals = () => {
    setShowAddModal(false);
    setShowEditModal(false);
    setSelectedRepair(null);
    setFormError(null);
  };


  const buildPayload = (): GeneralRepairPayload | null => {
    if (!formData.serviceDate || !formData.unitNumber || !formData.description) {
      setFormError('Please fill in all required fields.');
      return null;
    }
    if (formData.mechanicType === 'internal' && !formData.serviceProvider) {
      setFormError('Please select an internal mechanic.');
      return null;
    }
    if (formData.mechanicType === 'external' && !formData.serviceProvider.trim()) {
      setFormError('Please enter the external mechanic name.');
      return null;
    }
    const selectedUnit = units.find((unit) => unit.unitNo === formData.unitNumber);
    return {
      serviceDate: formData.serviceDate,
      unitNumber: formData.unitNumber,
      makeModel: selectedUnit?.makeModel,
      vinLicensePlate: selectedUnit?.vin,
      description: formData.description,
      odometer: formData.odometer ? Number(formData.odometer) : undefined,
      notes: formData.notes || undefined,
      serviceProvider: formData.serviceProvider,
      invoiceNumber: undefined,
      unitSource: selectedUnit?.referenceType,
      unitReference: selectedUnit?._id || selectedUnit?.referenceId,
      mechanicType: formData.mechanicType,
      externalMechanicCompany: formData.mechanicType === 'external' ? formData.externalMechanicCompany || undefined : undefined,
      externalMechanicPhone: formData.mechanicType === 'external' ? formData.externalMechanicPhone || undefined : undefined,
      externalMechanicEmail: formData.mechanicType === 'external' ? formData.externalMechanicEmail || undefined : undefined,
    };
  };

  const handleSaveRepair = async () => {
    const payload = buildPayload();
    if (!payload) return;

    setSaving(true);
    try {
      const response = showAddModal
        ? await createGeneralRepair(payload)
        : selectedRepair
          ? await updateGeneralRepair(selectedRepair._id, payload)
          : null;

      if (response?.success) {
        setNotification({ type: 'success', message: response.message || 'Maintenance order saved successfully.' });
        closeModals();
        await loadRepairs();
      } else {
        setFormError(response?.message || 'Failed to save maintenance order.');
      }
    } catch (err: any) {
      setFormError(err?.response?.data?.message || err?.message || 'Failed to save maintenance order.');
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!selectedRepair) return;
    setDeleting(true);
    try {
      const response = await deleteGeneralRepair(selectedRepair._id);
      if (response?.success) {
        setNotification({ type: 'success', message: response.message || 'Maintenance order deleted successfully.' });
        setShowDeleteModal(false);
        setSelectedRepair(null);
        await loadRepairs();
      } else {
        setNotification({ type: 'error', message: response?.message || 'Failed to delete maintenance order.' });
      }
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err?.response?.data?.message || err?.message || 'Failed to delete maintenance order.'
      });
    } finally {
      setDeleting(false);
    }
  };

  const handleSendEmail = async () => {
    if (!selectedRepair) return;

    // Check if mechanic is assigned
    const currentServiceProviderId = formData.serviceProviderId || (selectedRepair as any).serviceProviderId;
    const currentServiceProvider = formData.serviceProvider || selectedRepair.serviceProvider;

    if (!currentServiceProviderId && !currentServiceProvider) {
      setNotification({ type: 'error', message: 'Please assign a mechanic before sending email.' });
      return;
    }

    // Get mechanic email
    const mechanic = serviceProviders.find(p => p.id === currentServiceProviderId || p.name === currentServiceProvider);
    if (!mechanic?.email) {
      setNotification({ type: 'error', message: 'Mechanic email not found. Please ensure the mechanic has an email address.' });
      return;
    }

    setSending(true);
    try {
      const response = await sendMaintenanceOrderEmail(selectedRepair._id);
      if (response?.success) {
        setNotification({ type: 'success', message: response.message || 'Email sent successfully to mechanic.' });
        setFormData(prev => ({ ...prev, shared: true }));
        await loadRepairs();
        // Refresh selected repair
        const updatedRepairs = await listGeneralRepairs();
        if (updatedRepairs?.success && updatedRepairs.data) {
          const updated = updatedRepairs.data.find(r => r._id === selectedRepair._id);
          if (updated) {
            setSelectedRepair(updated as any);
          }
        }
      } else {
        setNotification({ type: 'error', message: response?.message || 'Failed to send email.' });
      }
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err?.response?.data?.message || err?.message || 'Failed to send email.'
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen pb-10 bg-main" >
      <div className="relative w-full mx-auto p-2">
        {/* Gradient band */}


        <div className="relative z-10 px-4 pt-3 pb-6">
          {/* Header */}
          <div className="mb-4 relative z-10">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-headings">Maintenance Orders Log</h1>
                <div className="flex items-center gap-2 text-secondary">
                  <span className="text-xs">Log non-routine maintenance orders (Tires, Brakes, Accident Repairs)</span>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleExportRepairs}
                  disabled={exporting}
                  className="inline-flex items-center gap-2 rounded-lg bg-[var(--accent-navyblue)] text-green-600 px-4 py-2 font-bold text-sm shadow-sm hover:bg-card/90 transition disabled:opacity-60"
                >
                  <Download className="w-4 h-4" />
                  {exporting ? 'Exporting...' : 'Export'}
                </button>
                <button
                  onClick={handleAddRepair}
                  className="flex items-center gap-2 px-4 py-2 !text-white rounded-lg shadow-sm transition-all font-bold text-sm hover:opacity-90 bg-[var(--accent-navyblue)]"

                >
                  <Plus className="w-5 h-5" />
                  Add Maintenance Order
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="w-full mx-auto px-4 -mt-4">
          {requiresCompanySetup && (
            <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-amber-800">
              Please complete your company settings to view maintenance orders.
            </div>
          )}

          {notification && <Toast notification={notification} onClose={() => setNotification(null)} />}

          {error && !requiresCompanySetup && (
            <div className="mb-4 rounded-lg border border-red-200 bg-card px-4 py-3 text-red-700">{error}</div>
          )}

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            {/* Incoming Maintenance Card */}
            <div className="bg-card rounded-lg shadow-sm border border-theme p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <p className="text-sm font-medium text-secondary mb-1">Incoming Maintenance</p>
                  <p className="text-2xl font-bold text-[#F59E0B] mb-1">{summaryStats.incomingMaintenance}</p>
                  <p className="text-xs text-secondary">Recent maintenance orders requiring attention</p>
                </div>
                <div className="bg-card p-3 rounded-lg">
                  <AlertCircle className="h-6 w-6 text-[#F59E0B]" />
                </div>
              </div>
              <div className="border-t border-theme pt-3 space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-secondary">Last 7 Days</span>
                  <span className="font-semibold text-[#F59E0B]">{summaryStats.urgentRepairs}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-secondary">Last 30 Days</span>
                  <span className="font-semibold text-headings">{summaryStats.incomingMaintenance}</span>
                </div>
                {summaryStats.mostRecentRepairDate && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-secondary">Most Recent</span>
                    <span className="font-semibold text-headings">
                      {formatDate(summaryStats.mostRecentRepairDate.toISOString())}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between text-sm pt-1.5 border-t border-theme">
                  <span className="text-secondary">Units Affected</span>
                  <span className="font-semibold text-headings">{summaryStats.unitsWithRecentRepairs}</span>
                </div>
              </div>
            </div>

            {/* Recent Repairs Activity Card */}
            <div className="bg-card rounded-lg shadow-sm border border-theme p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <p className="text-sm font-medium text-secondary mb-1">Recent Maintenance Orders / Activity</p>
                  <p className="text-2xl font-bold text-[#00D1FF] mb-1">{summaryStats.recentActivity}</p>
                  <p className="text-xs text-secondary">Maintenance orders logged in last 30 days</p>
                </div>
                <div className="bg-card p-3 rounded-lg">
                  <Clock className="h-6 w-6 text-[#00D1FF]" />
                </div>
              </div>
              <div className="border-t border-theme pt-3 space-y-1.5">
                {summaryStats.mostRecentRepairDate && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-secondary">Most Recent</span>
                    <span className="font-semibold text-headings">
                      {formatDate(summaryStats.mostRecentRepairDate.toISOString())}
                    </span>
                  </div>
                )}
                {summaryStats.topRepairType && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-secondary">Top Maintenance Order Type</span>
                    <span className="font-semibold text-[#00D1FF] text-right max-w-[60%] truncate" title={summaryStats.topRepairType}>
                      {summaryStats.topRepairType}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between text-sm pt-1.5 border-t border-theme">
                  <span className="text-secondary">Total Maintenance Orders</span>
                  <span className="font-semibold text-headings">{summaryStats.recentActivity}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-card rounded-lg shadow-sm border border-theme p-4 mb-4">
            <div className="relative mb-3">
              <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-secondary" />
              <input
                type="text"
                placeholder="Search by unit number, make/model, invoice, or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 w-full border border-theme rounded-lg focus:ring-2 focus:border-transparent"
                style={{ '--tw-ring-color': '#016ab2' } as React.CSSProperties & { '--tw-ring-color': string }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#016ab2';
                  e.target.style.boxShadow = '0 0 0 2px rgba(1, 106, 178, 0.2)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '';
                  e.target.style.boxShadow = '';
                }}
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-secondary font-medium mr-1">Mechanic:</span>
              <button
                onClick={() => setFilterMechanicType('all')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-colors ${filterMechanicType === 'all'
                  ? 'bg-gray-800 !text-white border-gray-800'
                  : 'bg-card text-secondary border-theme hover:border-gray-400'
                  }`}
              >
                All Mechanics
              </button>
              <button
                onClick={() => setFilterMechanicType('internal')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-colors ${filterMechanicType === 'internal'
                  ? 'bg-blue-600 !text-white border-blue-600'
                  : 'bg-card text-secondary border-theme hover:border-blue-300'
                  }`}
              >
                Internal
              </button>
              <button
                onClick={() => setFilterMechanicType('external')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-colors flex items-center gap-1.5 ${filterMechanicType === 'external'
                  ? 'bg-orange-500 !text-white border-orange-500'
                  : 'bg-card text-secondary border-theme hover:border-orange-300'
                  }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${filterMechanicType === 'external' ? 'bg-card' : 'bg-orange-400'}`} />
                External
              </button>
            </div>
          </div>

          <div className="bg-card rounded-lg shadow-sm border border-theme overflow-hidden">
            {/* Top Scrollbar - Only visible horizontal scrollbar */}

            <div
              ref={topScrollRef}
              className="overflow-x-auto overflow-y-hidden top-scrollbar-container"
              style={{
                maxHeight: '20px',
                marginBottom: '2px',

              }}
            >
              <div className="top-scroll-content" style={{ height: '1px' }}></div>
            </div>
            {/* Main Table - Scrollbar hidden, controlled by top scrollbar */}
            <div
              ref={bottomScrollRef}
              className="overflow-x-auto overflow-y-visible table-container-hidden-scrollbar"
            >
              <table className="w-full" style={{ minWidth: '1200px' }}>
                <thead className="text-headings" >
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold">Service Date</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold">Unit Number</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold">Make/Model</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold">VIN/License Plate</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold">Description</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold">Odometer</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold">Service Provider</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold">Invoice Number</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold">Status</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold">Verification</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-theme divide-white/5">
                  {loading ? (
                    <tr>
                      <td colSpan={12} className="px-6 py-12 text-center text-secondary">
                        Loading maintenance orders...
                      </td>
                    </tr>
                  ) : filteredRepairs.length === 0 ? (
                    <tr>
                      <td colSpan={12} className="px-6 py-12 text-center text-secondary">
                        No maintenance orders found
                      </td>
                    </tr>
                  ) : (
                    filteredRepairs.map((repair) => {
                      // Use status from database if available, otherwise calculate based on service provider and shared status
                      const dbStatus = (repair as any).status;
                      const hasServiceProvider = repair.serviceProvider && repair.serviceProvider.trim() !== '';
                      const isShared = (repair as any).shared === true;

                      // Valid statuses from database: 'Created', 'Assigned', 'Shared', 'in-progress', 'completed'
                      let status = dbStatus;
                      if (!status || !['Created', 'Assigned', 'Shared', 'in-progress', 'completed'].includes(status)) {
                        // Fallback calculation if status not set or invalid
                        status = isShared ? 'Shared' : (hasServiceProvider ? 'Assigned' : 'Created');
                      }

                      return (
                        <tr
                          key={repair._id}
                          className="hover:bg-[rgba(255,255,255,0.03)] transition-colors cursor-pointer"
                          onClick={() => {
                            setSelectedRepair(repair);
                            setShowRepairDetails(true);
                          }}
                        >
                          <td className="px-6 py-4 text-secondary">{formatDate(repair.serviceDate)}</td>
                          <td className="px-6 py-4 font-medium text-secondary">{repair.unitNumber}</td>
                          <td className="px-6 py-4 text-secondary">{repair.makeModel || '—'}</td>
                          <td className="px-6 py-4 text-secondary font-mono text-sm">{repair.vinLicensePlate || '—'}</td>
                          <td className="px-6 py-4 text-secondary max-w-xs">
                            <div className="truncate" title={repair.description}>
                              {repair.description}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-secondary">
                            {typeof repair.odometer === 'number' ? `${repair.odometer.toLocaleString()} km` : '—'}
                          </td>
                          <td className="px-6 py-4 text-secondary">
                            {repair.mechanicType === 'external' ? (
                              <div className="flex items-center gap-1">
                                <span className="inline-flex items-center text-xs font-semibold px-1.5 py-0.5 rounded bg-orange-100 text-orange-700">Ext</span>
                                <span>{repair.serviceProvider || '—'}</span>
                              </div>
                            ) : (
                              repair.serviceProvider || '—'
                            )}
                          </td>
                          <td className="px-6 py-4 text-secondary font-mono text-sm">{repair.invoiceNumber || '—'}</td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${status === 'completed'
                              ? 'bg-blue-100 text-blue-700'
                              : status === 'in-progress'
                                ? 'bg-yellow-100 text-yellow-700'
                                : status === 'Shared'
                                  ? 'bg-purple-100 text-purple-700'
                                  : status === 'Assigned'
                                    ? 'bg-green-100 text-green-700'
                                    : 'bg-card text-headings'
                              }`}>
                              {status === 'in-progress' ? 'In Progress' : status}
                            </span>
                          </td>
                          <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                            {status === 'completed' ? (
                              <select
                                value={(repair as any).verificationStatus || 'not-verified'}
                                onChange={async (e) => {
                                  const newStatus = e.target.value;
                                  if (newStatus === 'verified' && (repair as any).verificationStatus !== 'verified') {
                                    try {
                                      const response = await verifyMaintenanceOrder(repair._id);
                                      if (response?.success) {
                                        setNotification({ type: 'success', message: 'Maintenance order verified successfully' });
                                        await loadRepairs();
                                      } else {
                                        setNotification({ type: 'error', message: response?.message || 'Failed to verify order' });
                                      }
                                    } catch (err: any) {
                                      setNotification({ type: 'error', message: err?.response?.data?.message || err?.message || 'Failed to verify order' });
                                    }
                                  }
                                }}
                                disabled={(repair as any).verificationStatus === 'verified'}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${(repair as any).verificationStatus === 'verified'
                                  ? '!bg-green-100 !text-green-700 border-green-300 cursor-not-allowed'
                                  : '!bg-yellow-100 !text-yellow-700 border-yellow-300 cursor-pointer hover:bg-yellow-200'
                                  }`}
                              >
                                <option className='form-option' value="not-verified">Not Verified</option>
                                <option className='form-option' value="verified">Verified</option>
                              </select>
                            ) : (
                              <span className="text-secondary text-sm">—</span>
                            )}
                          </td>
                          <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleEditRepair(repair)}
                                className="p-2 text-[#00D1FF] hover:bg-[#00D1FF]/10 rounded-lg transition-colors"
                                title="Edit"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteRepair(repair)}
                                className="p-2 text-[#A855F7] hover:bg-[#A855F7]/10 rounded-lg transition-colors"
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4" />
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

          {/* Repair Details Sidebar */}
          {showRepairDetails && selectedRepair && (
            <>
              {/* Overlay */}
              <div
                className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-40 transition-opacity"
                onClick={() => {
                  setShowRepairDetails(false);
                  setTimeout(() => setSelectedRepair(null), 300);
                }}
              ></div>

              {/* Sidebar Panel */}
              <div
                className="fixed right-0 top-0 h-full w-full md:w-2/3 lg:w-1/2 bg-card shadow-2xl z-50 overflow-y-auto transform transition-transform duration-300 translate-x-0"
              >
                <div className="p-6">
                  {/* Header */}
                  <div className="flex justify-between items-center mb-6 pb-4 border-b-2 border-theme">
                    <h2 className="text-2xl font-bold text-headings">Maintenance Order Details</h2>
                    <button
                      onClick={() => {
                        setShowRepairDetails(false);
                        setTimeout(() => setSelectedRepair(null), 300);
                      }}
                      className="p-2 rounded-lg text-secondary hover:text-secondary hover:bg-[rgba(255,255,255,0.03)] transition-all"
                    >
                      <X size={24} />
                    </button>
                  </div>

                  <div className="space-y-6">
                    {/* Repair Header */}
                    <div className="border-4 border-theme  text-white p-6 rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className="flex-1">
                          <h3 className="text-2xl font-bold mb-1">{selectedRepair.unitNumber || 'N/A'}</h3>
                          <p className="text-blue-100 text-sm mb-2">
                            {selectedRepair.makeModel || '—'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Repair Information */}
                    <div className="bg-card p-6 rounded-lg border border-theme">
                      <h4 className="font-semibold text-headings mb-4 text-lg">Maintenance Order Information</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-secondary mb-1">Unit Number</p>
                          <p className="font-medium text-headings">{selectedRepair.unitNumber || "—"}</p>
                        </div>
                        <div>
                          <p className="text-sm text-secondary mb-1">Make / Model</p>
                          <p className="font-medium text-headings">{selectedRepair.makeModel || "—"}</p>
                        </div>
                        <div>
                          <p className="text-sm text-secondary mb-1">VIN / License Plate</p>
                          <p className="font-medium text-headings">{selectedRepair.vinLicensePlate || "—"}</p>
                        </div>
                        <div>
                          <p className="text-sm text-secondary mb-1">Service Date</p>
                          <p className="font-medium text-headings">{formatDate(selectedRepair.serviceDate)}</p>
                        </div>
                        <div>
                          <p className="text-sm text-secondary mb-1">Odometer</p>
                          <p className="font-medium text-headings">
                            {typeof selectedRepair.odometer === 'number' ? `${selectedRepair.odometer.toLocaleString()} km` : '—'}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-secondary mb-1">Service Provider</p>
                          {selectedRepair.mechanicType === 'external' ? (
                            <div className="space-y-0.5">
                              <span className="inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 mb-1">External Mechanic</span>
                              <p className="font-medium text-headings">{selectedRepair.serviceProvider || '—'}</p>
                              {selectedRepair.externalMechanicCompany && <p className="text-sm text-secondary">{selectedRepair.externalMechanicCompany}</p>}
                              {selectedRepair.externalMechanicPhone && <p className="text-sm text-secondary">{selectedRepair.externalMechanicPhone}</p>}
                              {selectedRepair.externalMechanicEmail && <p className="text-sm text-secondary">{selectedRepair.externalMechanicEmail}</p>}
                            </div>
                          ) : (
                            <p className="font-medium text-headings">{selectedRepair.serviceProvider || "—"}</p>
                          )}
                        </div>
                        <div>
                          <p className="text-sm text-secondary mb-1">Invoice Number</p>
                          <p className="font-medium text-headings">{selectedRepair.invoiceNumber || "—"}</p>
                        </div>
                      </div>
                      <div className="mt-4">
                        <p className="text-sm text-secondary mb-1">Description</p>
                        <p className="font-medium text-headings">{selectedRepair.description || "—"}</p>
                      </div>
                      {selectedRepair.parts && (
                        <div className="mt-4">
                          <p className="text-sm text-secondary mb-1">Parts</p>
                          {Array.isArray(selectedRepair.parts) && selectedRepair.parts.length > 0 ? (
                            <div className="space-y-1">
                              {selectedRepair.parts.map((p: any, idx: number) => (
                                <p key={idx} className="font-medium text-headings">
                                  {p.partName || p.partNumber || 'Part'} - Quantity: {p.quantity || 1}
                                </p>
                              ))}
                            </div>
                          ) : (
                            <p className="font-medium text-headings">{typeof selectedRepair.parts === 'string' ? selectedRepair.parts : 'N/A'}</p>
                          )}
                        </div>
                      )}
                      {selectedRepair.notes && (
                        <div className="mt-4">
                          <p className="text-sm text-secondary mb-1">Notes</p>
                          <p className="font-medium text-headings">{selectedRepair.notes}</p>
                        </div>
                      )}
                    </div>

                    {/* Completion Details - Show if order is completed */}
                    {((selectedRepair as any).status === 'completed') && (
                      <div className=" p-6 rounded-lg border border-green-200">
                        <h4 className="font-semibold text-headings mb-4 text-lg flex items-center gap-2">
                          <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                          Completion Details
                        </h4>
                        {(selectedRepair as any).repairDetails && (
                          <div className="mb-4">
                            <p className="text-sm text-secondary mb-1">Repair Details</p>
                            <p className="font-medium text-headings">{(selectedRepair as any).repairDetails}</p>
                          </div>
                        )}
                        {(selectedRepair as any).completedParts && Array.isArray((selectedRepair as any).completedParts) && (selectedRepair as any).completedParts.length > 0 && (
                          <div className="mb-4">
                            <p className="text-sm text-secondary mb-2">Parts Used</p>
                            <div className="space-y-2">
                              {(selectedRepair as any).completedParts.map((part: any, idx: number) => (
                                <div key={idx} className="bg-card p-3 rounded border border-theme">
                                  <p className="font-medium text-headings">
                                    {part.partName || part.partNumber || 'Part'}
                                    {part.quantity > 1 && ` (Qty: ${part.quantity})`}
                                    {part.cost > 0 && ` - $${part.cost.toFixed(2)}`}
                                  </p>
                                  {part.partNumber && (
                                    <p className="text-xs text-secondary mt-1">Part #: {part.partNumber}</p>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {(selectedRepair as any).completionTotalAmount && (
                          <div className="mb-4">
                            <p className="text-sm text-secondary mb-1">Total Amount</p>
                            <p className="font-semibold text-lg text-headings">
                              {new Intl.NumberFormat('en-CA', {
                                style: 'currency',
                                currency: 'CAD',
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              }).format((selectedRepair as any).completionTotalAmount)}
                            </p>
                          </div>
                        )}
                        {(selectedRepair as any).completionDate && (
                          <div className="mb-4">
                            <p className="text-sm text-secondary mb-1">Completion Date</p>
                            <p className="font-medium text-headings">
                              {formatDate((selectedRepair as any).completionDate)}
                            </p>
                          </div>
                        )}
                        {/* Invoice File - signed URL */}
                        {((selectedRepair as any).invoiceUploadUrl || (selectedRepair as any).invoiceSignedUrl) && (
                          <div className="mt-4 pt-4 border-t border-green-200">
                            <p className="text-sm text-secondary mb-2">Mechanic's Invoice</p>
                            <div className="space-y-2">
                              <a
                                href={(selectedRepair as any).invoiceSignedUrl || (selectedRepair as any).invoiceUploadUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                              >
                                <FileText size={18} />
                                <span>View Invoice</span>
                                <ExternalLink size={14} />
                              </a>
                              <p className="text-xs text-secondary">
                                {(selectedRepair as any).invoiceUploadUrl?.split('/').pop() || 'Invoice file'}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex justify-end gap-3 pt-4 border-t-2 border-theme">
                      <button
                        onClick={() => {
                          setShowRepairDetails(false);
                          setTimeout(() => setSelectedRepair(null), 300);
                        }}
                        className="px-6 py-2.5 bg-gray-700 text-primary font-medium rounded-lg hover:bg-gray-300 transition-all"
                      >
                        Close
                      </button>
                      <button
                        onClick={() => {
                          setShowRepairDetails(false);
                          handleEditRepair(selectedRepair);
                        }}
                        className="px-6 py-2.5 bg-[var(--accent-navyblue)] !text-white font-medium rounded-lg hover:bg-blue-700 transition-all"
                      >
                        Edit Maintenance Order
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {(showAddModal || showEditModal) && (
            <>
              <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-[100]" onClick={closeModals} />
              <div className="fixed top-0 right-0 h-full w-full sm:w-[90vw] lg:w-[80vw] xl:w-[70vw] bg-card shadow-2xl z-[101] border-l border-theme">
                <div className="h-full flex flex-col">
                  <div className="flex-shrink-0 px-6 py-4 flex items-center justify-between text-primary bg-[var(--accent-navyblue)]" >
                    <h2 className="text-2xl font-bold">{showAddModal ? 'Add Maintenance Order' : 'Edit Maintenance Order'}</h2>
                    <button onClick={closeModals} className="p-2 hover:bg-card/20 rounded-lg transition-colors">
                      <FaTimes className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    {formError && (
                      <div className="rounded-lg border border-red-200 bg-card px-4 py-2 text-sm text-red-700">{formError}</div>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-headings mb-2">Service Date *</label>
                        <input
                          type="date"
                          value={formData.serviceDate}
                          onChange={(e) => setFormData({ ...formData, serviceDate: e.target.value })}
                          className="w-full px-4 py-2 border border-theme rounded-lg focus:ring-2 focus:border-transparent"
                          style={{ '--tw-ring-color': '#016ab2' } as React.CSSProperties & { '--tw-ring-color': string }}
                          onFocus={(e) => {
                            e.target.style.borderColor = '#016ab2';
                            e.target.style.boxShadow = '0 0 0 2px rgba(1, 106, 178, 0.2)';
                          }}
                          onBlur={(e) => {
                            e.target.style.borderColor = '';
                            e.target.style.boxShadow = '';
                          }}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-headings mb-2">Status</label>
                        <div className="w-full px-4 py-2 border border-theme rounded-lg bg-card">
                          <span className={`font-medium ${formData.status === 'Assigned' ? 'text-green-600' : 'text-secondary'
                            }`}>
                            {formData.status || 'Created'}
                          </span>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-headings mb-2">Unit Number *</label>
                        <select

                          value={formData.unitNumber}
                          onChange={(e) => setFormData({ ...formData, unitNumber: e.target.value })}
                          className="w-full px-4 py-2 border border-theme rounded-lg focus:ring-2 focus:border-transparent"
                          style={{ '--tw-ring-color': '#016ab2' } as React.CSSProperties & { '--tw-ring-color': string }}
                          onFocus={(e) => {
                            e.target.style.borderColor = '#016ab2';
                            e.target.style.boxShadow = '0 0 0 2px rgba(1, 106, 178, 0.2)';
                          }}
                          onBlur={(e) => {
                            e.target.style.borderColor = '';
                            e.target.style.boxShadow = '';
                          }}
                        >
                          <option className='form-option' value="">Select Unit</option>
                          {units.map((unit) => (
                            <option className='form-option' key={unit.unitNo} value={unit.unitNo}>
                              {unit.unitNo} - {unit.makeModel}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-headings mb-2">Odometer</label>
                        <input
                          type="number"
                          value={formData.odometer}
                          onChange={(e) => setFormData({ ...formData, odometer: e.target.value })}
                          className="w-full px-4 py-2 border border-theme rounded-lg focus:ring-2 focus:border-transparent"
                          style={{ '--tw-ring-color': '#016ab2' } as React.CSSProperties & { '--tw-ring-color': string }}
                          onFocus={(e) => {
                            e.target.style.borderColor = '#016ab2';
                            e.target.style.boxShadow = '0 0 0 2px rgba(1, 106, 178, 0.2)';
                          }}
                          onBlur={(e) => {
                            e.target.style.borderColor = '';
                            e.target.style.boxShadow = '';
                          }}
                          placeholder="0"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-headings mb-2">Service Provider *</label>
                        {/* Toggle */}
                        <div className="flex rounded-lg border border-theme overflow-hidden mb-3 w-fit">
                          <button
                            type="button"
                            onClick={() => setFormData((prev) => ({ ...prev, mechanicType: 'internal', serviceProvider: '', serviceProviderId: undefined }))}
                            className={`px-5 py-2 text-sm font-medium transition-colors ${formData.mechanicType === 'internal' ? 'bg-[#016ab2] !text-white' : 'bg-card text-secondary hover:bg-[rgba(255,255,255,0.03)]'}`}
                          >
                            Internal Mechanic
                          </button>
                          <button
                            type="button"
                            onClick={() => setFormData((prev) => ({ ...prev, mechanicType: 'external', serviceProviderId: undefined }))}
                            className={`px-5 py-2 text-sm font-medium border-l border-theme transition-colors ${formData.mechanicType === 'external' ? 'bg-[#016ab2] !text-white' : 'bg-card text-secondary hover:bg-[rgba(255,255,255,0.03)]'}`}
                          >
                            External Mechanic
                          </button>
                        </div>

                        {formData.mechanicType === 'internal' ? (
                          serviceProvidersLoading ? (
                            <div className="flex items-center gap-2 text-sm text-secondary">
                              <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500 inline-block" />
                              Loading mechanics...
                            </div>
                          ) : serviceProviders.length > 0 ? (
                            <select
                              value={formData.serviceProviderId || ''}
                              onChange={(e) => {
                                const provider = serviceProviders.find((p) => p.id === e.target.value);
                                setFormData((prev) => ({
                                  ...prev,
                                  serviceProviderId: provider?.id,
                                  serviceProvider: provider?.name || ''
                                }));
                              }}
                              className="w-full px-4 py-2 border border-theme rounded-lg focus:ring-2 focus:border-transparent"
                              style={{ '--tw-ring-color': '#016ab2' } as React.CSSProperties & { '--tw-ring-color': string }}
                              onFocus={(e) => { e.target.style.borderColor = '#016ab2'; e.target.style.boxShadow = '0 0 0 2px rgba(1, 106, 178, 0.2)'; }}
                              onBlur={(e) => { e.target.style.borderColor = ''; e.target.style.boxShadow = ''; }}
                            >
                              <option className='form-option' value="">Select mechanic</option>
                              {serviceProviders.map((provider) => (
                                <option className='form-option' key={provider.id} value={provider.id}>
                                  {provider.name} {provider.role ? `(${provider.role})` : ''}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <p className="text-xs text-secondary">
                              No internal mechanics found. Add an employee with a mechanic role, or switch to External Mechanic.
                            </p>
                          )
                        ) : (
                          <div className="grid grid-cols-2 gap-3 p-4 bg-card border border-orange-200 rounded-lg">
                            <div>
                              <label className="block text-xs font-medium text-secondary mb-1">Name *</label>
                              <input
                                type="text"
                                value={formData.serviceProvider}
                                onChange={(e) => setFormData({ ...formData, serviceProvider: e.target.value })}
                                className="w-full px-3 py-2 border border-theme rounded-lg text-sm focus:ring-2 focus:border-transparent"
                                style={{ '--tw-ring-color': '#016ab2' } as React.CSSProperties & { '--tw-ring-color': string }}
                                placeholder="Mechanic / Shop name"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-secondary mb-1">Company</label>
                              <input
                                type="text"
                                value={formData.externalMechanicCompany}
                                onChange={(e) => setFormData({ ...formData, externalMechanicCompany: e.target.value })}
                                className="w-full px-3 py-2 border border-theme rounded-lg text-sm focus:ring-2 focus:border-transparent"
                                style={{ '--tw-ring-color': '#016ab2' } as React.CSSProperties & { '--tw-ring-color': string }}
                                placeholder="Company / Shop"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-secondary mb-1">Phone</label>
                              <input
                                type="tel"
                                value={formData.externalMechanicPhone}
                                onChange={(e) => setFormData({ ...formData, externalMechanicPhone: e.target.value })}
                                className="w-full px-3 py-2 border border-theme rounded-lg text-sm focus:ring-2 focus:border-transparent"
                                style={{ '--tw-ring-color': '#016ab2' } as React.CSSProperties & { '--tw-ring-color': string }}
                                placeholder="+1 (555) 000-0000"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-secondary mb-1">Email</label>
                              <input
                                type="email"
                                value={formData.externalMechanicEmail}
                                onChange={(e) => setFormData({ ...formData, externalMechanicEmail: e.target.value })}
                                className="w-full px-3 py-2 border border-theme rounded-lg text-sm focus:ring-2 focus:border-transparent"
                                style={{ '--tw-ring-color': '#016ab2' } as React.CSSProperties & { '--tw-ring-color': string }}
                                placeholder="email@shop.com"
                              />
                            </div>
                          </div>
                        )}
                        {serviceProvidersError && formData.mechanicType === 'internal' && (
                          <p className="text-sm text-[#A855F7] mt-2">{serviceProvidersError}</p>
                        )}
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-headings mb-2">Description *</label>
                        <textarea
                          value={formData.description}
                          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                          rows={3}
                          className="w-full px-4 py-2 border border-theme rounded-lg focus:ring-2 focus:border-transparent"
                          style={{ '--tw-ring-color': '#016ab2' } as React.CSSProperties & { '--tw-ring-color': string }}
                          onFocus={(e) => {
                            e.target.style.borderColor = '#016ab2';
                            e.target.style.boxShadow = '0 0 0 2px rgba(1, 106, 178, 0.2)';
                          }}
                          onBlur={(e) => {
                            e.target.style.borderColor = '';
                            e.target.style.boxShadow = '';
                          }}
                          placeholder="Be specific, e.g., 'Front right tire blow out - replaced'"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-headings mb-2">Notes</label>
                        <textarea
                          value={formData.notes}
                          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                          rows={2}
                          className="w-full px-4 py-2 border border-theme rounded-lg focus:ring-2 focus:border-transparent"
                          style={{ '--tw-ring-color': '#016ab2' } as React.CSSProperties & { '--tw-ring-color': string }}
                          onFocus={(e) => {
                            e.target.style.borderColor = '#016ab2';
                            e.target.style.boxShadow = '0 0 0 2px rgba(1, 106, 178, 0.2)';
                          }}
                          onBlur={(e) => {
                            e.target.style.borderColor = '';
                            e.target.style.boxShadow = '';
                          }}
                          placeholder="e.g., 'Passed post-repair inspection'"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Footer - Fixed to bottom */}
                  <div className="flex-shrink-0 bg-card px-6 py-4 flex justify-between items-center border-t border-theme">
                    {showEditModal && selectedRepair && (formData.serviceProviderId || formData.serviceProvider) && (
                      <button
                        onClick={handleSendEmail}
                        disabled={sending || formData.shared || (selectedRepair as any).shared}
                        className={`px-6 py-2 rounded-lg transition-colors flex items-center gap-2 ${sending || formData.shared || (selectedRepair as any).shared
                          ? 'opacity-60 cursor-not-allowed bg-gray-300 text-secondary'
                          : 'bg-green-600 hover:bg-green-700 !text-white'
                          }`}
                      >
                        <Mail className="w-4 h-4" />
                        {sending ? 'Sending...' : formData.shared || (selectedRepair as any).shared ? 'Email Sent' : 'Send to Mechanic'}
                      </button>
                    )}
                    <div className="flex gap-3 ml-auto">
                      <button
                        onClick={closeModals}
                        className="px-6 py-2 border border-theme rounded-lg text-primary hover:bg-[rgba(255,255,255,0.03)] transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveRepair}
                        disabled={saving}
                        className={`px-6 py-2 !text-white rounded-lg transition-colors bg-[var(--accent-navyblue)] ${saving ? 'opacity-60 cursor-not-allowed' : 'hover:opacity-90'
                          }`}

                      >
                        {saving ? 'Saving...' : showAddModal ? 'Add Maintenance Order' : 'Save Changes'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {showDeleteModal && selectedRepair && (
            <>
              <div
                className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-[9998]"
                onClick={() => {
                  setShowDeleteModal(false);
                  setSelectedRepair(null);
                }}
              />
              <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-card rounded-xl shadow-2xl z-[9999] w-full max-w-md">
                <div className="p-6">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                      <FaExclamationCircle className="text-[#A855F7]" size={24} />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-headings">Delete Maintenance Order</h3>
                      <p className="text-sm text-secondary">This action cannot be undone</p>
                    </div>
                  </div>
                  <p className="text-headings mb-6">
                    Are you sure you want to delete this maintenance order record for unit <strong>{selectedRepair.unitNumber}</strong>?
                  </p>
                  <div className="flex justify-end gap-3">
                    <button
                      onClick={() => {
                        setShowDeleteModal(false);
                        setSelectedRepair(null);
                      }}
                      className="px-6 py-2 border border-theme rounded-lg text-headings hover:bg-[rgba(255,255,255,0.03)] transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleConfirmDelete}
                      disabled={deleting}
                      className={`px-6 py-2 rounded-lg !text-white transition-colors ${deleting ? 'bg-red-300 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700'
                        }`}
                    >
                      {deleting ? 'Deleting...' : 'Delete'}
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div >
  );
};

export default GeneralRepairsLog;
