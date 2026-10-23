import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type { CSSProperties } from 'react';
import ExcelJS from 'exceljs';
import { Plus, Edit, Trash2, Search, AlertTriangle, Calendar, Download, X } from 'lucide-react';
import { FaCheckCircle, FaExclamationCircle, FaTimes } from 'react-icons/fa';
import {
  listRegulatorySafety,
  createRegulatorySafety,
  updateRegulatorySafety,
  deleteRegulatorySafety,
  type RegulatorySafetyDto,
  type RegulatorySafetyPayload
} from '../../../../axios/api/regulatorySafety';
import { getAllVehicles } from '../../../../axios/api/vehicle';
import { getAllTrailers } from '../../../../axios/api/trailer';
import { FLEET_COLORS } from '../colorUtils';

const ACCENT_PRIMARY = FLEET_COLORS.primary;
const ACCENT_DARK = FLEET_COLORS.dark;
const hexToRgba = (hex: string, alpha = 1) => {
  const parsed = hex.replace('#', '');
  const bigint = parseInt(parsed, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};
const ACCENT_SOFT = hexToRgba(ACCENT_PRIMARY, 0.1);
const ACCENT_SOFT_BORDER = hexToRgba(ACCENT_PRIMARY, 0.25);
const ACCENT_VARS = {
  '--accent-color': ACCENT_PRIMARY,
  '--accent-dark': ACCENT_DARK,
  '--accent-soft': ACCENT_SOFT,
  '--accent-soft-border': ACCENT_SOFT_BORDER
} as CSSProperties;

type UnitStatus = 'Active' | 'Inactive';
type TruckType = 'Semi-Truck' | 'Straight Truck' | 'Box Truck' | 'Flatbed' | 'Refrigerated Truck' | 'Dump Truck' | 'Tow Truck';
type TrailerType = 'Reefer Trailer' | 'Tri-Axle Trailer' | 'Dry Van' | 'Flatbed' | 'Step Deck' | 'Lowboy' | 'Tank Trailer' | 'Dump Trailer';

interface UnitOption {
  unitNo: string;
  unitType?: string;
  truckType?: TruckType | string;
  trailerType?: TrailerType | string;
  status?: UnitStatus | string;
  makeModel?: string;
  referenceType?: string;
  referenceId?: string;
}

interface NotificationState {
  type: 'success' | 'error';
  message: string;
}

interface FormState {
  unitNo: string;
  safetyExpiryDate: string;
  safetyDecalNumber: string;
  safetyPaperNumber: string;
  shopName: string;
  invoiceNo: string;
  notes: string;
}

const formatDate = (value?: string) => {
  if (!value) return 'N/A';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'N/A';
  return parsed.toLocaleDateString();
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

const getExpiryStatus = (expiry?: string) => {
  if (!expiry) {
    return { status: 'unknown', color: 'bg-card text-secondary', text: 'Not Set' };
  }
  const today = new Date();
  const expiryDate = new Date(expiry);
  const diffDays = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) {
    return { status: 'expired', color: 'bg-red-100 text-red-800', text: 'EXPIRED' };
  }
  if (diffDays <= 30) {
    return { status: 'warning', color: 'bg-yellow-100 text-yellow-800', text: `${diffDays} days left` };
  }
  return { status: 'ok', color: 'bg-green-100 text-green-800', text: 'OK' };
};

const RegulatorySafety: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [records, setRecords] = useState<RegulatorySafetyDto[]>([]);
  const [units, setUnits] = useState<UnitOption[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<RegulatorySafetyDto | null>(null);
  const [showRecordDetails, setShowRecordDetails] = useState(false);
  const [formData, setFormData] = useState<FormState>({
    unitNo: '',
    safetyExpiryDate: '',
    safetyDecalNumber: '',
    safetyPaperNumber: '',
    shopName: '',
    invoiceNo: '',
    notes: ''
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [notification, setNotification] = useState<NotificationState | null>(null);
  const [requiresCompanySetup, setRequiresCompanySetup] = useState(false);
  const [exporting, setExporting] = useState(false);

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
      // Fetch vehicles (trucks)
      const vehiclesResponse = await getAllVehicles(1, 1000);
      const vehicles = vehiclesResponse?.success && vehiclesResponse?.data ? vehiclesResponse.data : [];

      // Fetch trailers
      const trailersResponse = await getAllTrailers(1, 1000);
      const trailers = trailersResponse?.success && trailersResponse?.data ? trailersResponse.data : [];

      // Combine vehicles and trailers
      const allUnits: UnitOption[] = [];

      // Map vehicles
      vehicles.forEach((vehicle: any) => {
        allUnits.push({
          unitNo: vehicle.unitNumber || vehicle.internalId || vehicle.plateNumber || '',
          unitType: 'Truck',
          truckType: vehicle.type || 'Truck',
          status: vehicle.status || 'Active',
          makeModel: [vehicle.make, vehicle.model].filter(Boolean).join(' ').trim() || undefined,
          referenceType: 'vehicle',
          referenceId: vehicle._id
        });
      });

      // Map trailers
      trailers.forEach((trailer: any) => {
        allUnits.push({
          unitNo: trailer.unitNumber || trailer.trailer || trailer.internalId || '',
          unitType: 'Trailer',
          trailerType: trailer.type || 'Trailer',
          status: trailer.status || 'Active',
          makeModel: [trailer.make, trailer.model].filter(Boolean).join(' ').trim() || undefined,
          referenceType: 'trailer',
          referenceId: trailer._id
        });
      });

      setUnits(allUnits);
    } catch (err) {
      console.error('Failed to load units', err);
    }
  }, []);

  const loadRecords = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await listRegulatorySafety(debouncedSearch || undefined);
      if (response?.success) {
        setRecords(response.data || []);
        setRequiresCompanySetup(!!response.requiresCompanySetup);
      } else {
        setRecords([]);
        setRequiresCompanySetup(!!response.requiresCompanySetup);
        setError(response?.message || 'Failed to fetch safety records');
      }
    } catch (err: any) {
      setRecords([]);
      setError(err?.response?.data?.message || err?.message || 'Failed to fetch safety records');
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch]);

  useEffect(() => {
    loadUnits();
  }, [loadUnits]);

  useEffect(() => {
    loadRecords();
  }, [loadRecords]);

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
  }, [records, searchTerm]);


  const filteredRecords = useMemo(() => {
    return records;
  }, [records]);

  const filteredUnitOptions = useMemo(() => units, [units]);

  const unitSelectOptions = useMemo(() => {
    if (!formData.unitNo) return filteredUnitOptions;
    const exists = filteredUnitOptions.some((unit) => unit.unitNo === formData.unitNo);
    return exists ? filteredUnitOptions : [...filteredUnitOptions, ...units.filter((unit) => unit.unitNo === formData.unitNo)];
  }, [filteredUnitOptions, formData.unitNo, units]);

  const handleExportSafety = async () => {
    if (!filteredRecords.length) {
      alert('No safety records available to export.');
      return;
    }

    try {
      setExporting(true);
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Regulatory Safety');

      worksheet.columns = [
        { header: 'Unit Number', key: 'unitNo', width: 16 },
        { header: 'Unit Type', key: 'unitType', width: 16 },
        { header: 'Make / Model', key: 'makeModel', width: 26 },
        { header: 'Safety Expiry', key: 'safetyExpiryDate', width: 18 },
        { header: 'Status', key: 'status', width: 18 },
        { header: 'Decal Number', key: 'safetyDecalNumber', width: 18 },
        { header: 'Paper Number', key: 'safetyPaperNumber', width: 18 },
        { header: 'Shop Name', key: 'shopName', width: 24 },
        { header: 'Invoice #', key: 'invoiceNo', width: 18 },
        { header: 'Notes', key: 'notes', width: 32 }
      ];

      worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
      worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF0EA5E9' }
      };

      filteredRecords.forEach((record) => {
        const status = getExpiryStatus(record.safetyExpiryDate);
        worksheet.addRow({
          unitNo: record.unitNo,
          unitType: record.unitType || 'N/A',
          makeModel: record.makeModel || 'N/A',
          safetyExpiryDate: formatDate(record.safetyExpiryDate),
          status: status.text,
          safetyDecalNumber: record.safetyDecalNumber || 'N/A',
          safetyPaperNumber: record.safetyPaperNumber || 'N/A',
          shopName: record.shopName || 'N/A',
          invoiceNo: record.invoiceNo || 'N/A',
          notes: record.notes || ''
        });
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Regulatory_Safety_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export regulatory safety records', error);
      alert('Unable to export safety records. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  const handleAddRecord = () => {
    const defaultUnitNo = (filteredUnitOptions[0] || units[0])?.unitNo || '';
    setFormData({
      unitNo: defaultUnitNo,
      safetyExpiryDate: '',
      safetyDecalNumber: '',
      safetyPaperNumber: '',
      shopName: '',
      invoiceNo: '',
      notes: ''
    });
    setFormError(null);
    setShowAddModal(true);
  };

  const handleEditRecord = (record: RegulatorySafetyDto) => {
    setSelectedRecord(record);
    setFormError(null);
    setFormData({
      unitNo: record.unitNo,
      safetyExpiryDate: record.safetyExpiryDate ? record.safetyExpiryDate.split('T')[0] : '',
      safetyDecalNumber: record.safetyDecalNumber || '',
      safetyPaperNumber: record.safetyPaperNumber || '',
      shopName: record.shopName || '',
      invoiceNo: record.invoiceNo || '',
      notes: record.notes || ''
    });
    setShowEditModal(true);
  };

  const handleDeleteRecord = (record: RegulatorySafetyDto) => {
    setSelectedRecord(record);
    setShowDeleteModal(true);
  };

  const closeModals = () => {
    setShowAddModal(false);
    setShowEditModal(false);
    setSelectedRecord(null);
    setFormError(null);
  };

  const buildPayload = (): RegulatorySafetyPayload | null => {
    if (!formData.unitNo || !formData.safetyExpiryDate || !formData.safetyDecalNumber || !formData.shopName) {
      setFormError('Please fill in all required fields.');
      return null;
    }
    const selectedUnit = units.find((unit) => unit.unitNo === formData.unitNo);
    return {
      unitNo: formData.unitNo,
      unitType: selectedUnit?.unitType,
      makeModel: selectedUnit?.makeModel,
      unitSource: selectedUnit?.referenceType,
      unitReference: selectedUnit?.referenceId,
      safetyExpiryDate: formData.safetyExpiryDate,
      safetyDecalNumber: formData.safetyDecalNumber,
      safetyPaperNumber: formData.safetyPaperNumber || undefined,
      shopName: formData.shopName,
      invoiceNo: formData.invoiceNo || undefined,
      notes: formData.notes || undefined
    };
  };

  const handleSaveRecord = async () => {
    const payload = buildPayload();
    if (!payload) return;

    setSaving(true);
    try {
      const response = showAddModal
        ? await createRegulatorySafety(payload)
        : selectedRecord
          ? await updateRegulatorySafety(selectedRecord._id, payload)
          : null;

      if (response?.success) {
        setNotification({ type: 'success', message: response.message || 'Safety record saved.' });
        closeModals();
        await loadRecords();
      } else {
        setFormError(response?.message || 'Failed to save safety record.');
      }
    } catch (err: any) {
      setFormError(err?.response?.data?.message || err?.message || 'Failed to save safety record.');
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!selectedRecord) return;
    setDeleting(true);
    try {
      const response = await deleteRegulatorySafety(selectedRecord._id);
      if (response?.success) {
        setNotification({ type: 'success', message: response.message || 'Safety record deleted.' });
        setShowDeleteModal(false);
        setSelectedRecord(null);
        await loadRecords();
      } else {
        setNotification({ type: 'error', message: response?.message || 'Failed to delete safety record.' });
      }
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err?.response?.data?.message || err?.message || 'Failed to delete safety record.'
      });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="min-h-screen pb-10" style={{ backgroundColor: '#EDF8FF', ...ACCENT_VARS }}>
      <div className="relative w-full mx-auto p-2">


        <div className="relative z-10 px-4 pt-3 pb-6">
          {/* Header */}
          <div className="mb-4 relative z-10">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-black">Regulatory & Safety</h1>
                <div className="flex items-center gap-2 text-black/90">
                  <span className="text-xs">Track inspections and safety expiry dates</span>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleExportSafety}
                  disabled={exporting}
                  className="inline-flex items-center gap-2 rounded-lg bg-card text-green-600 px-4 py-2 font-bold text-sm shadow-sm hover:bg-card/90 transition disabled:opacity-60"
                >
                  <Download className="w-4 h-4" />
                  {exporting ? 'Exporting...' : 'Export'}
                </button>
                <button
                  onClick={handleAddRecord}
                  className="flex items-center gap-2 px-4 py-2 !text-white rounded-lg shadow-sm transition-all font-bold text-sm hover:opacity-90"
                  style={{ background: 'linear-gradient(to right, #016ab2, #063f6f)' }}
                >
                  <Plus className="w-5 h-5" />
                  Add Record
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="w-full mx-auto px-4 -mt-4">
          {requiresCompanySetup && (
            <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-amber-800">
              Please complete your company settings to view safety records.
            </div>
          )}

          {notification && <Toast notification={notification} onClose={() => setNotification(null)} />}

          {error && !requiresCompanySetup && (
            <div className="mb-4 rounded-lg border border-red-200 bg-card px-4 py-3 text-red-700">{error}</div>
          )}

          {/* Search */}
          <div className="bg-card rounded-lg shadow-sm border border-theme p-4 mb-4">
            <div className="relative">
              <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-secondary" />
              <input
                type="text"
                placeholder="Search by unit number, make/model, invoice, or decal number..."
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
          </div>

          {/* Record Count */}
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <span className="text-sm text-secondary">
              Showing {filteredRecords.length} safety record{filteredRecords.length === 1 ? '' : 's'}
            </span>
          </div>

          {/* Table */}
          <div className="bg-card rounded-lg shadow-sm border border-theme overflow-hidden">
            {/* Top Scrollbar - Only visible horizontal scrollbar */}
            <style>{`
              .top-scrollbar-container::-webkit-scrollbar {
                height: 8px;
              }
              .top-scrollbar-container::-webkit-scrollbar-track {
                background: #f7fafc;
              }
              .top-scrollbar-container::-webkit-scrollbar-thumb {
                background: #cbd5e0;
                border-radius: 4px;
              }
              .top-scrollbar-container::-webkit-scrollbar-thumb:hover {
                background: #a0aec0;
              }
              .table-container-hidden-scrollbar {
                scrollbar-width: none; /* Firefox */
                -ms-overflow-style: none; /* IE and Edge */
              }
              .table-container-hidden-scrollbar::-webkit-scrollbar {
                display: none; /* Chrome, Safari, Opera */
              }
            `}</style>
            <div
              ref={topScrollRef}
              className="overflow-x-auto overflow-y-hidden top-scrollbar-container"
              style={{
                maxHeight: '20px',
                marginBottom: '2px',
                scrollbarWidth: 'thin',
                scrollbarColor: '#cbd5e0 #f7fafc' /* Firefox */
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
                <thead className="text-white" style={{ background: 'linear-gradient(to right, #016ab2, #063f6f)' }}>
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold">Unit No.</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold">Unit Type</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold">Make/Model</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold">Safety Expiry</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold">Status</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold">Safety Decal Number</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold">Safety Paper Number</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold">Shop Name</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold">Invoice No.</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-theme">
                  {loading ? (
                    <tr>
                      <td colSpan={10} className="px-6 py-12 text-center text-secondary">
                        Loading safety records...
                      </td>
                    </tr>
                  ) : filteredRecords.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="px-6 py-12 text-center text-secondary">
                        No safety records found
                      </td>
                    </tr>
                  ) : (
                    filteredRecords.map((record) => {
                      const status = getExpiryStatus(record.safetyExpiryDate);
                      const rowAccent =
                        status.status === 'expired'
                          ? 'border-l-4 border-red-400'
                          : status.status === 'warning'
                            ? 'border-l-4 border-amber-400'
                            : 'border-l-4 border-transparent';
                      return (
                        <tr
                          key={record._id}
                          className={`hover:bg-[rgba(255,255,255,0.03)] transition-colors cursor-pointer ${rowAccent}`}
                          onClick={() => {
                            setSelectedRecord(record);
                            setShowRecordDetails(true);
                          }}
                        >
                          <td className="px-6 py-4 font-medium text-primary">{record.unitNo}</td>
                          <td className="px-6 py-4">
                            <span className="inline-flex px-3 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                              {record.unitType || 'Unit'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-primary">{record.makeModel || '—'}</td>
                          <td className="px-6 py-4 text-primary">
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4 text-secondary" />
                              {formatDate(record.safetyExpiryDate)}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex px-4 py-2 text-xs font-semibold rounded-full ${status.color}`}>
                              {status.status === 'expired' && <FaExclamationCircle className="mr-1" size={12} />}
                              {status.status === 'warning' && <AlertTriangle className="mr-1" size={12} />}
                              {status.status === 'ok' && <FaCheckCircle className="mr-1" size={12} />}
                              {status.text}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-secondary font-mono text-sm">{record.safetyDecalNumber || '—'}</td>
                          <td className="px-6 py-4 text-secondary font-mono text-sm">{record.safetyPaperNumber || '—'}</td>
                          <td className="px-6 py-4 text-primary">{record.shopName || '—'}</td>
                          <td className="px-6 py-4 text-secondary font-mono text-sm">{record.invoiceNo || '—'}</td>
                          <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleEditRecord(record)}
                                className="p-2 text-[#00D1FF] hover:bg-blue-50 rounded-lg transition-colors"
                                title="Edit"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteRecord(record)}
                                className="p-2 text-[#A855F7] hover:bg-red-50 rounded-lg transition-colors"
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

          {/* Record Details Sidebar */}
          {showRecordDetails && selectedRecord && (
            <>
              {/* Overlay */}
              <div
                className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-40 transition-opacity"
                onClick={() => {
                  setShowRecordDetails(false);
                  setTimeout(() => setSelectedRecord(null), 300);
                }}
              ></div>

              {/* Sidebar Panel */}
              <div
                className="fixed right-0 top-0 h-full w-full md:w-2/3 lg:w-1/2 bg-card shadow-2xl z-50 overflow-y-auto transform transition-transform duration-300 translate-x-0"
              >
                <div className="p-6">
                  {/* Header */}
                  <div className="flex justify-between items-center mb-6 pb-4 border-b-2 border-theme">
                    <h2 className="text-2xl font-bold text-primary">Safety Record Details</h2>
                    <button
                      onClick={() => {
                        setShowRecordDetails(false);
                        setTimeout(() => setSelectedRecord(null), 300);
                      }}
                      className="p-2 rounded-lg text-secondary hover:text-secondary hover:bg-[rgba(255,255,255,0.03)] transition-all"
                    >
                      <X size={24} />
                    </button>
                  </div>

                  <div className="space-y-6">
                    {/* Record Header */}
                    <div className="bg-gradient-to-r from-[#4A90E2] to-[#357ABD] text-white p-6 rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className="flex-1">
                          <h3 className="text-2xl font-bold mb-1">{selectedRecord.unitNo || 'N/A'}</h3>
                          <p className="text-blue-100 text-sm mb-2">
                            {selectedRecord.makeModel || '—'}
                          </p>
                          {(() => {
                            const status = getExpiryStatus(selectedRecord.safetyExpiryDate);
                            return (
                              <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold mt-2 ${status.status === 'expired' ? 'bg-red-500 text-white' : status.status === 'warning' ? 'bg-yellow-500 text-white' : 'bg-green-500 text-white'}`}>
                                {status.status === 'expired' && <FaExclamationCircle size={16} />}
                                {status.status === 'warning' && <AlertTriangle size={16} />}
                                {status.status === 'ok' && <FaCheckCircle size={16} />}
                                {status.text}
                              </span>
                            );
                          })()}
                        </div>
                      </div>
                    </div>

                    {/* Record Information */}
                    <div className="bg-card p-6 rounded-lg border border-theme">
                      <h4 className="font-semibold text-primary mb-4 text-lg">Safety Information</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-secondary mb-1">Unit Number</p>
                          <p className="font-medium text-primary">{selectedRecord.unitNo || "—"}</p>
                        </div>
                        <div>
                          <p className="text-sm text-secondary mb-1">Unit Type</p>
                          <p className="font-medium text-primary">{selectedRecord.unitType || "—"}</p>
                        </div>
                        <div>
                          <p className="text-sm text-secondary mb-1">Make / Model</p>
                          <p className="font-medium text-primary">{selectedRecord.makeModel || "—"}</p>
                        </div>
                        <div>
                          <p className="text-sm text-secondary mb-1">Safety Expiry Date</p>
                          <p className="font-medium text-primary">{formatDate(selectedRecord.safetyExpiryDate)}</p>
                        </div>
                        <div>
                          <p className="text-sm text-secondary mb-1">Status</p>
                          {(() => {
                            const status = getExpiryStatus(selectedRecord.safetyExpiryDate);
                            return (
                              <span className={`inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold rounded-full ${status.color}`}>
                                {status.status === 'expired' && <FaExclamationCircle size={12} />}
                                {status.status === 'warning' && <AlertTriangle size={12} />}
                                {status.status === 'ok' && <FaCheckCircle size={12} />}
                                {status.text}
                              </span>
                            );
                          })()}
                        </div>
                        <div>
                          <p className="text-sm text-secondary mb-1">Safety Decal Number</p>
                          <p className="font-medium text-primary font-mono">{selectedRecord.safetyDecalNumber || "—"}</p>
                        </div>
                        <div>
                          <p className="text-sm text-secondary mb-1">Safety Paper Number</p>
                          <p className="font-medium text-primary font-mono">{selectedRecord.safetyPaperNumber || "—"}</p>
                        </div>
                        <div>
                          <p className="text-sm text-secondary mb-1">Shop Name</p>
                          <p className="font-medium text-primary">{selectedRecord.shopName || "—"}</p>
                        </div>
                        <div>
                          <p className="text-sm text-secondary mb-1">Invoice Number</p>
                          <p className="font-medium text-primary font-mono">{selectedRecord.invoiceNo || "—"}</p>
                        </div>
                      </div>
                      {selectedRecord.notes && (
                        <div className="mt-4">
                          <p className="text-sm text-secondary mb-1">Notes</p>
                          <p className="font-medium text-primary">{selectedRecord.notes}</p>
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex justify-end gap-3 pt-4 border-t-2 border-theme">
                      <button
                        onClick={() => {
                          setShowRecordDetails(false);
                          setTimeout(() => setSelectedRecord(null), 300);
                        }}
                        className="px-6 py-2.5 bg-gray-200 text-primary font-medium rounded-lg hover:bg-gray-300 transition-all"
                      >
                        Close
                      </button>
                      <button
                        onClick={() => {
                          setShowRecordDetails(false);
                          handleEditRecord(selectedRecord);
                        }}
                        className="px-6 py-2.5 bg-blue-600 !text-white font-medium rounded-lg hover:bg-blue-700 transition-all"
                      >
                        Edit Record
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {
        (showAddModal || showEditModal) && (
          <>
            <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-[100]" onClick={closeModals} />
            <div className="fixed top-0 right-0 h-full w-full sm:w-[90vw] lg:w-[80vw] xl:w-[70vw] bg-card shadow-2xl z-[101] border-l border-theme">
              <div className="h-full flex flex-col">
                <div className="flex-shrink-0 px-6 py-4 flex items-center justify-between text-white" style={{ background: 'linear-gradient(to right, #016ab2, #063f6f)' }}>
                  <h2 className="text-2xl font-bold">{showAddModal ? 'Add Safety Record' : 'Edit Safety Record'}</h2>
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
                      <label className="block text-sm font-medium text-primary mb-2">Unit No. *</label>
                      <select
                        value={formData.unitNo}
                        onChange={(e) => setFormData({ ...formData, unitNo: e.target.value })}
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
                        <option value="">Select Unit</option>
                        {unitSelectOptions.map((unit) => (
                          <option key={unit.unitNo} value={unit.unitNo}>
                            {unit.unitNo} - {unit.makeModel} ({unit.unitType || unit.trailerType || 'Unit'})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-primary mb-2">Safety Expiry Date *</label>
                      <input
                        type="date"
                        value={formData.safetyExpiryDate}
                        onChange={(e) => setFormData({ ...formData, safetyExpiryDate: e.target.value })}
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
                      <label className="block text-sm font-medium text-primary mb-2">Safety Decal Number *</label>
                      <input
                        type="text"
                        value={formData.safetyDecalNumber}
                        onChange={(e) => setFormData({ ...formData, safetyDecalNumber: e.target.value })}
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
                        placeholder="SD-2024-1001"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-primary mb-2">Safety Paper Number</label>
                      <input
                        type="text"
                        value={formData.safetyPaperNumber}
                        onChange={(e) => setFormData({ ...formData, safetyPaperNumber: e.target.value })}
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
                        placeholder="SP-2024-1001"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-primary mb-2">Shop Name *</label>
                      <input
                        type="text"
                        value={formData.shopName}
                        onChange={(e) => setFormData({ ...formData, shopName: e.target.value })}
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
                        placeholder="Inspection shop name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-primary mb-2">Invoice No.</label>
                      <input
                        type="text"
                        value={formData.invoiceNo}
                        onChange={(e) => setFormData({ ...formData, invoiceNo: e.target.value })}
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
                        placeholder="INV-SAF-2024-001"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-primary mb-2">Notes</label>
                      <textarea
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
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
                        placeholder="Additional notes about this inspection"
                      />
                    </div>
                  </div>
                </div>
                <div className="flex-shrink-0 bg-card px-6 py-4 flex justify-end gap-3 border-t border-theme">
                  <button
                    onClick={closeModals}
                    className="px-6 py-2 border border-theme rounded-lg text-primary hover:bg-[rgba(255,255,255,0.03)] transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveRecord}
                    disabled={saving}
                    className={`px-6 py-2 !text-white rounded-lg transition-colors ${saving ? 'opacity-60 cursor-not-allowed' : 'hover:opacity-90'}`}
                    style={{ background: 'linear-gradient(to right, #016ab2, #063f6f)' }}
                  >
                    {saving ? 'Saving...' : showAddModal ? 'Add Record' : 'Save Changes'}
                  </button>
                </div>
              </div>
            </div >
          </>
        )
      }

      {
        showDeleteModal && selectedRecord && (
          <>
            <div
              className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-[9998]"
              onClick={() => {
                setShowDeleteModal(false);
                setSelectedRecord(null);
              }}
            />
            <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-card rounded-xl shadow-2xl z-[9999] w-full max-w-md">
              <div className="p-6">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                    <FaExclamationCircle className="text-[#A855F7]" size={24} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-primary">Delete Safety Record</h3>
                    <p className="text-sm text-secondary">This action cannot be undone</p>
                  </div>
                </div>
                <p className="text-primary mb-6">
                  Are you sure you want to delete this safety record for unit <strong>{selectedRecord.unitNo}</strong>?
                </p>
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => {
                      setShowDeleteModal(false);
                      setSelectedRecord(null);
                    }}
                    className="px-6 py-2 border border-theme rounded-lg text-primary hover:bg-[rgba(255,255,255,0.03)] transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirmDelete}
                    disabled={deleting}
                    className={`px-6 py-2 rounded-lg text-white transition-colors ${deleting ? 'bg-red-300 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700'}`}
                  >
                    {deleting ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </div>
            </div>
          </>
        )
      }
    </div >
  );
};

export default RegulatorySafety;
