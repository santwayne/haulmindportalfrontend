import React, { useState, useEffect } from 'react';
import ExcelJS from 'exceljs';

import {
  FaSnowflake,
  FaBox,
  FaGasPump,
  FaBiohazard,
  FaPlus,
  FaCheckCircle,
  FaTimesCircle,
  FaThermometerHalf,
  FaExclamationTriangle,
  FaTimes,
  FaInfoCircle,
  FaDownload,
} from '../../../../theme/icons';

const CUSTOM_COLORS = {
  background: '#EDF8FF',
  primary: '#016ab2',
  dark: '#063f6f',
  light: '#398bc3',
  gradient: 'linear-gradient(90deg, var(--accent-blue) 0%, var(--accent-blue) 40%, rgba(0,209,255,0.15) 100%)',
  gradientVertical: 'linear-gradient(to bottom right, #016ab2, #063f6f)',
};
import type { LoadSecurementLog, ReeferFoodSafetyLog, WinterSafetyChecklist, FuelingSpillPreventionLog, DangerousGoodsLog } from '../../../../types';
import {
  getLoadSecurementLogs,
  getReeferFoodSafetyLogs,
  getWinterSafetyChecklists,
  getFuelingSpillLogs,
  getDangerousGoodsLogs,
  createLoadSecurement,
  createReeferFoodSafety,
  createWinterSafety,
  createFuelingSpill,
  createDangerousGoods,
} from '../../../../axios/api/healthSafety';
import { getAllDrivers } from '../../../../axios/api/driver';
import { listFleetUnits } from '../../../../axios/api/fleet.units';

interface ToastNotification {
  id: number;
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
}

const ToastNotificationComponent = ({ notification, onClose }: { notification: ToastNotification; onClose: (id: number) => void }) => {
  const icons = {
    success: <FaCheckCircle className="text-green-500" size={24} />,
    error: <FaTimesCircle className="text-red-500" size={24} />,
    info: <FaInfoCircle className="text-blue-500" size={24} />,
    warning: <FaExclamationTriangle className="text-yellow-500" size={24} />
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

const TABS = {
  LOAD_SECUREMENT: 'load-securement',
  REEFER_SAFETY: 'reefer',
  WINTER_SAFETY: 'winter',
  FUELING_SPILL: 'fueling',
  TDG_LOGS: 'tdg',
};

const formatDateTime = (date: string | Date, time?: string) => {
  if (!date) return '—';
  const d = typeof date === 'string' ? new Date(date) : date;
  const dateStr = d.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' });
  if (time) {
    if (/am|pm/i.test(time)) return `${dateStr} ${time}`;
    const parts = time.split(':');
    const h = parseInt(parts[0] || '0', 10);
    const m = parseInt(parts[1] || '0', 10);
    const period = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 || 12;
    return `${dateStr} ${hour12}:${String(m).padStart(2, '0')} ${period}`;
  }
  return dateStr;
};

const TruckingOperations: React.FC = () => {
  const [activeTab, setActiveTab] = useState(TABS.LOAD_SECUREMENT);
  const [loading, setLoading] = useState(true);
  const [searchTerm] = useState('');
  const [filterStatus] = useState('all');
  const [notifications, setNotifications] = useState<ToastNotification[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Drivers, vehicles (trucks), trailers from APIs
  const [drivers, setDrivers] = useState<{ _id: string; name: string }[]>([]);
  const [vehicles, setVehicles] = useState<{ _id: string; unitNo: string }[]>([]);
  const [trailers, setTrailers] = useState<{ _id: string; unitNo: string }[]>([]);

  // Data
  const [loadSecurementLogs, setLoadSecurementLogs] = useState<LoadSecurementLog[]>([]);
  const [reeferLogs, setReeferLogs] = useState<ReeferFoodSafetyLog[]>([]);
  const [winterChecklists, setWinterChecklists] = useState<WinterSafetyChecklist[]>([]);
  const [fuelingLogs, setFuelingLogs] = useState<FuelingSpillPreventionLog[]>([]);
  const [tdgLogs, setTdgLogs] = useState<DangerousGoodsLog[]>([]);

  // Form states for each type
  const [loadSecurementForm, setLoadSecurementForm] = useState({
    date: new Date().toISOString().split('T')[0],
    time: new Date().toTimeString().slice(0, 5),
    driverId: '',
    driverName: '',
    vehicleNumber: '',
    trailerNumber: '',
    loadType: '',
    loadWeight: '',
    loadDescription: '',
    destination: '',
    securedBy: 'straps' as 'straps' | 'chains' | 'tarps' | 'combination' | 'bulkhead' | 'other',
    numberOfStraps: '',
    numberOfChains: '',
    tarpUsed: false,
    checklistComplete: false,
    meetsStandards: false,
    standardsReference: '',
    deficienciesNoted: '',
  });

  const [reeferForm, setReeferForm] = useState({
    date: new Date().toISOString().split('T')[0],
    time: new Date().toTimeString().slice(0, 5),
    driverId: '',
    driverName: '',
    vehicleNumber: '',
    trailerNumber: '',
    temperatureRecorded: '',
    temperatureUnit: 'celsius' as 'celsius' | 'fahrenheit',
    targetTemperature: '',
    withinRange: false,
    interiorCleanliness: 'excellent' as 'excellent' | 'good' | 'fair' | 'poor',
    odorDetected: false,
    odorDescription: '',
    visibleContamination: false,
    contaminationDetails: '',
    lastSanitized: '',
    sanitationMethod: '',
    sanitationVerified: false,
    deficienciesFound: false,
    deficiencyList: [] as string[],
    correctiveActionTaken: '',
  });

  const [winterForm, setWinterForm] = useState({
    date: new Date().toISOString().split('T')[0],
    time: new Date().toTimeString().slice(0, 5),
    location: '',
    performedBy: '',
    performedById: '',
    vehicleNumber: '',
    areaInspected: '',
    snowIceRemoved: false,
    walkwaysCleared: false,
    saltApplied: false,
    tiresInspected: false,
    tireChainCondition: 'good' as 'good' | 'fair' | 'replacement-needed' | 'n/a',
    heatingSystemFunctional: false,
    defrostFunctional: false,
    wipersCondition: 'good' as 'good' | 'fair' | 'replacement-needed',
    antifreezeLevels: 'adequate' as 'adequate' | 'low' | 'empty',
    emergencyKitPresent: false,
    hazardsIdentified: false,
    hazardDetails: '',
    correctiveAction: '',
    temperature: '',
    weatherConditions: '',
  });

  const [fuelingForm, setFuelingForm] = useState({
    date: new Date().toISOString().split('T')[0],
    time: new Date().toTimeString().slice(0, 5),
    location: '',
    performedBy: '',
    performedById: '',
    vehicleNumber: '',
    vehicleParked: false,
    engineOff: false,
    parkingBrakeSet: false,
    spillKitPresent: false,
    areaInspected: false,
    fuelType: 'diesel' as 'diesel' | 'gasoline' | 'DEF' | 'propane' | 'natural-gas',
    quantityDispensed: '',
    nozzleSecured: false,
    overflowPrevented: false,
    spillOccurred: false,
    spillDetails: {
      quantity: '',
      causeOfSpill: '',
      responseActions: '',
      cleanupMethod: '',
      disposalMethod: '',
      reportFiled: false,
      incidentNumber: '',
    },
    capsSecured: false,
    noLeaksDetected: false,
    areaClean: false,
  });

  const [shippingDocumentFile, setShippingDocumentFile] = useState<File | null>(null);
  const [tdgForm, setTdgForm] = useState({
    date: new Date().toISOString().split('T')[0],
    time: new Date().toTimeString().slice(0, 5),
    driverId: '',
    driverName: '',
    vehicleNumber: '',
    trailerNumber: '',
    shippingDocument: '',
    unNumber: '',
    properShippingName: '',
    class: '',
    packingGroup: '',
    quantity: '',
    placardingRequired: false,
    placardingComplete: false,
    placardsInspected: false,
    emergencyResponseInfo: false,
    tdgCertificateCurrent: false,
    securityPlan: false,
    incidentOccurred: false,
    incidentDetails: '',
    segregationCorrect: false,
    packagingIntact: false,
    labelsLegible: false,
  });

  const addNotification = (type: 'success' | 'error' | 'info' | 'warning', message: string) => {
    const id = Date.now();
    setNotifications(prev => [...prev, { id, type, message }]);
  };

  const removeNotification = (id: number) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch all data in parallel
      const [loadSecurementRes, reeferRes, winterRes, fuelingRes, tdgRes] = await Promise.all([
        getLoadSecurementLogs({ search: searchTerm || undefined, status: filterStatus !== 'all' ? filterStatus : undefined }),
        getReeferFoodSafetyLogs({ search: searchTerm || undefined, status: filterStatus !== 'all' ? filterStatus : undefined }),
        getWinterSafetyChecklists({ search: searchTerm || undefined, status: filterStatus !== 'all' ? filterStatus : undefined }),
        getFuelingSpillLogs({ search: searchTerm || undefined, status: filterStatus !== 'all' ? filterStatus : undefined }),
        getDangerousGoodsLogs({ search: searchTerm || undefined, status: filterStatus !== 'all' ? filterStatus : undefined }),
      ]);

      if (loadSecurementRes.success) {
        setLoadSecurementLogs(loadSecurementRes.data || []);
      } else {
        addNotification('error', loadSecurementRes.message || 'Failed to load load securement logs');
      }

      if (reeferRes.success) {
        setReeferLogs(reeferRes.data || []);
      } else {
        addNotification('error', reeferRes.message || 'Failed to load reefer food safety logs');
      }

      if (winterRes.success) {
        setWinterChecklists(winterRes.data || []);
      } else {
        addNotification('error', winterRes.message || 'Failed to load winter safety checklists');
      }

      if (fuelingRes.success) {
        setFuelingLogs(fuelingRes.data || []);
      } else {
        addNotification('error', fuelingRes.message || 'Failed to load fueling spill logs');
      }

      if (tdgRes.success) {
        setTdgLogs(tdgRes.data || []);
      } else {
        addNotification('error', tdgRes.message || 'Failed to load dangerous goods logs');
      }

    } catch (error: any) {
      console.error('Error fetching trucking operations data:', error);
      addNotification('error', error?.response?.data?.message || 'Failed to load trucking operations data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [searchTerm, filterStatus]);

  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const [driversRes, trucksRes, trailersRes] = await Promise.all([
          getAllDrivers(1, 1000),
          listFleetUnits({ category: 'trucks', status: 'active' }),
          listFleetUnits({ category: 'trailers', status: 'active' }),
        ]);
        if (driversRes?.success && Array.isArray(driversRes.data)) {
          const filtered = driversRes.data.filter((d: any) => {
            const r = (d.role || '').toLowerCase();
            return r !== 'admin' && r !== 'superadmin';
          });
          setDrivers(filtered.map((d: any) => ({ _id: d._id, name: d.name || `${d.firstName || ''} ${d.lastName || ''}`.trim() || 'Unknown' })));
        }
        if (trucksRes?.success && Array.isArray(trucksRes.data)) {
          setVehicles(trucksRes.data.map((u: any) => ({ _id: u._id, unitNo: u.unitNo || u.internalId || u._id })));
        }
        if (trailersRes?.success && Array.isArray(trailersRes.data)) {
          setTrailers(trailersRes.data.map((u: any) => ({ _id: u._id, unitNo: u.unitNo || u.internalId || u._id })));
        }
      } catch (e) {
        console.error('Error fetching drivers/vehicles/trailers:', e);
      }
    };
    fetchOptions();
  }, []);

  const handleCreateEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      let result;
      const formData = new FormData();

      switch (activeTab) {
        case TABS.LOAD_SECUREMENT:
          // Convert form data to proper format
          const loadSecurementData: any = {
            ...loadSecurementForm,
            loadWeight: loadSecurementForm.loadWeight ? parseFloat(loadSecurementForm.loadWeight) : undefined,
            numberOfStraps: loadSecurementForm.numberOfStraps ? parseInt(loadSecurementForm.numberOfStraps) : undefined,
            numberOfChains: loadSecurementForm.numberOfChains ? parseInt(loadSecurementForm.numberOfChains) : undefined,
          };
          // Required fields that should always be included
          const requiredLoadSecurementFields = ['date', 'time', 'driverName', 'vehicleNumber', 'loadType', 'securedBy'];
          Object.keys(loadSecurementData).forEach(key => {
            const value = loadSecurementData[key];
            // Include required fields even if empty, or include non-empty optional fields
            if (requiredLoadSecurementFields.includes(key) || (value !== null && value !== undefined && value !== '')) {
              if (value !== null && value !== undefined) {
                formData.append(key, String(value));
              }
            }
          });
          result = await createLoadSecurement(formData);
          break;

        case TABS.REEFER_SAFETY:
          const reeferData: any = {
            ...reeferForm,
            temperatureRecorded: reeferForm.temperatureRecorded ? parseFloat(reeferForm.temperatureRecorded) : undefined,
            targetTemperature: reeferForm.targetTemperature ? parseFloat(reeferForm.targetTemperature) : undefined,
            lastSanitized: reeferForm.lastSanitized || undefined,
            deficiencyList: reeferForm.deficiencyList.length > 0 ? reeferForm.deficiencyList : undefined,
          };
          // Required fields that should always be included
          const requiredReeferFields = ['date', 'time', 'driverName', 'vehicleNumber', 'trailerNumber', 'temperatureRecorded', 'targetTemperature', 'interiorCleanliness'];
          const reeferFormData = new FormData();
          Object.keys(reeferData).forEach(key => {
            const value = reeferData[key];
            // Include required fields even if empty, or include non-empty optional fields
            if (requiredReeferFields.includes(key) || (value !== null && value !== undefined && value !== '')) {
              if (Array.isArray(value)) {
                reeferFormData.append(key, JSON.stringify(value));
              } else if (value !== null && value !== undefined) {
                reeferFormData.append(key, String(value));
              }
            }
          });
          result = await createReeferFoodSafety(reeferFormData);
          break;

        case TABS.WINTER_SAFETY:
          const winterData: any = {
            ...winterForm,
            temperature: winterForm.temperature ? parseFloat(winterForm.temperature) : undefined,
            time: winterForm.time || undefined,
            performedById: winterForm.performedById || undefined,
            areaInspected: winterForm.areaInspected || undefined,
            hazardDetails: winterForm.hazardsIdentified ? winterForm.hazardDetails : undefined,
            correctiveAction: winterForm.hazardsIdentified ? winterForm.correctiveAction : undefined,
          };
          // Required fields that should always be included
          const requiredWinterFields = ['date', 'location', 'performedBy'];
          // Remove undefined and empty values, but keep required fields
          Object.keys(winterData).forEach(key => {
            if (!requiredWinterFields.includes(key) && (winterData[key] === undefined || winterData[key] === '')) {
              delete winterData[key];
            }
          });
          result = await createWinterSafety(winterData);
          break;

        case TABS.FUELING_SPILL:
          const fuelingData: any = {
            ...fuelingForm,
            quantityDispensed: fuelingForm.quantityDispensed ? parseFloat(fuelingForm.quantityDispensed) : undefined,
            spillDetails: fuelingForm.spillOccurred ? fuelingForm.spillDetails : undefined,
            performedById: fuelingForm.performedById || undefined,
            vehicleNumber: fuelingForm.vehicleNumber || undefined,
          };
          // Required fields that should always be included
          const requiredFuelingFields = ['date', 'time', 'location', 'performedBy', 'fuelType'];
          // Remove undefined and empty values, but keep required fields
          Object.keys(fuelingData).forEach(key => {
            if (!requiredFuelingFields.includes(key) && (fuelingData[key] === undefined || (typeof fuelingData[key] === 'object' && fuelingData[key] !== null && Object.keys(fuelingData[key]).length === 0))) {
              delete fuelingData[key];
            }
          });
          result = await createFuelingSpill(fuelingData);
          break;

        case TABS.TDG_LOGS:
          const tdgData: any = { ...tdgForm };
          const requiredTdgFields = ['date', 'time', 'driverName', 'vehicleNumber', 'unNumber', 'properShippingName', 'class', 'quantity'];
          Object.keys(tdgData).forEach(key => {
            const value = tdgData[key];
            const isRequired = requiredTdgFields.includes(key);
            const hasValue = value !== null && value !== undefined && (value !== '' || typeof value === 'boolean');
            if ((isRequired || hasValue) && key !== 'shippingDocument') {
              if (value !== null && value !== undefined) {
                formData.append(key, String(value));
              } else if (isRequired) {
                formData.append(key, '');
              }
            }
          });
          if (shippingDocumentFile) {
            formData.append('shippingDocument', shippingDocumentFile);
          }
          result = await createDangerousGoods(formData);
          break;

        default:
          throw new Error('Invalid tab');
      }

      if (result.success) {
        addNotification('success', result.message || 'Log entry created successfully');
        setShowModal(false);
        fetchData(); // Refresh data
        if (activeTab === TABS.TDG_LOGS) setShippingDocumentFile(null);
        // Reset forms
        setLoadSecurementForm({
          date: new Date().toISOString().split('T')[0],
          time: new Date().toTimeString().slice(0, 5),
          driverId: '',
          driverName: '',
          vehicleNumber: '',
          trailerNumber: '',
          loadType: '',
          loadWeight: '',
          loadDescription: '',
          destination: '',
          securedBy: 'straps',
          numberOfStraps: '',
          numberOfChains: '',
          tarpUsed: false,
          checklistComplete: false,
          meetsStandards: false,
          standardsReference: '',
          deficienciesNoted: '',
        });
      } else {
        addNotification('error', result.message || 'Failed to create log entry');
      }
    } catch (error: any) {
      console.error('Error creating log entry:', error);
      addNotification('error', error?.response?.data?.message || 'Failed to create log entry');
    } finally {
      setSubmitting(false);
    }
  };

  const handleExportReport = async () => {
    try {
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'Trucking Operations';
      const today = new Date().toISOString().split('T')[0];

      if (activeTab === TABS.LOAD_SECUREMENT) {
        const sheet = workbook.addWorksheet('Load Securement Logs', { views: [{ state: 'frozen', ySplit: 1 }] });
        sheet.addRow(['Log #', 'Date/Time', 'Driver', 'Vehicle', 'Trailer', 'Load Type', 'Secured By', 'Compliance']);
        loadSecurementLogs.forEach((log: any) => {
          sheet.addRow([
            log.logNumber,
            formatDateTime(log.date, log.time),
            log.driverName,
            log.vehicleNumber,
            log.trailerNumber || '',
            log.loadType,
            log.securedBy || '',
            log.meetsStandards ? 'Compliant' : 'Deficiency'
          ]);
        });
      } else if (activeTab === TABS.REEFER_SAFETY) {
        const sheet = workbook.addWorksheet('Reefer Food Safety Logs', { views: [{ state: 'frozen', ySplit: 1 }] });
        sheet.addRow(['Log #', 'Date/Time', 'Driver', 'Vehicle', 'Trailer', 'Temp (°C)', 'Target (°C)', 'Cleanliness', 'Status']);
        reeferLogs.forEach((log: any) => {
          sheet.addRow([
            log.logNumber,
            formatDateTime(log.date, log.time),
            log.driverName,
            log.vehicleNumber,
            log.trailerNumber || '',
            log.temperatureRecorded ?? '',
            log.targetTemperature ?? '',
            log.interiorCleanliness || '',
            log.deficienciesFound ? 'Action Required' : 'Pass'
          ]);
        });
      } else if (activeTab === TABS.WINTER_SAFETY) {
        const sheet = workbook.addWorksheet('Winter Safety Checklists', { views: [{ state: 'frozen', ySplit: 1 }] });
        sheet.addRow(['Checklist #', 'Date/Time', 'Location', 'Performed By', 'Vehicle', 'Status']);
        winterChecklists.forEach((c: any) => {
          sheet.addRow([
            c.checklistNumber || '',
            formatDateTime(c.date, c.time),
            c.location || '',
            c.performedBy || '',
            c.vehicleNumber || 'N/A',
            c.hazardsIdentified ? 'Hazards Found' : 'All Clear'
          ]);
        });
      } else if (activeTab === TABS.FUELING_SPILL) {
        const sheet = workbook.addWorksheet('Fueling & Spill Logs', { views: [{ state: 'frozen', ySplit: 1 }] });
        sheet.addRow(['Log #', 'Date/Time', 'Location', 'Performed By', 'Vehicle', 'Fuel Type', 'Spill Status']);
        fuelingLogs.forEach((log: any) => {
          sheet.addRow([
            log.logNumber,
            formatDateTime(log.date, log.time),
            log.location || '',
            log.performedBy || '',
            log.vehicleNumber || 'N/A',
            log.fuelType || '',
            log.spillOccurred ? 'Spill Occurred' : 'No Spill'
          ]);
        });
      } else if (activeTab === TABS.TDG_LOGS) {
        const sheet = workbook.addWorksheet('Dangerous Goods (TDG) Logs', { views: [{ state: 'frozen', ySplit: 1 }] });
        sheet.addRow(['Log #', 'Date/Time', 'Driver', 'Vehicle', 'Trailer', 'UN Number', 'Proper Shipping Name', 'Class', 'Placarding', 'Status']);
        tdgLogs.forEach((log: any) => {
          const status = log.incidentOccurred ? 'Incident' : (log.tdgCertificateCurrent && log.placardingComplete) ? 'Compliant' : 'Review';
          sheet.addRow([
            log.logNumber,
            formatDateTime(log.date, log.time),
            log.driverName,
            log.vehicleNumber,
            log.trailerNumber || '',
            log.unNumber || '',
            log.properShippingName || '',
            log.class || '',
            log.placardingComplete ? 'Complete' : 'Incomplete',
            status
          ]);
        });
      }

      const sheet = workbook.worksheets[0];
      if (sheet) {
        const headerRow = sheet.getRow(1);
        headerRow.font = { bold: true };
        headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE5E7EB' } };
        sheet.columns.forEach((col) => {
          let maxLen = 12;
          col.eachCell?.({ includeEmpty: true }, cell => {
            const val = cell.value?.toString() ?? '';
            maxLen = Math.min(Math.max(maxLen, val.length), 50);
          });
          col.width = maxLen;
        });
      }

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const sheetNames: Record<string, string> = {
        [TABS.LOAD_SECUREMENT]: 'Load-Securement',
        [TABS.REEFER_SAFETY]: 'Reefer-Food-Safety',
        [TABS.WINTER_SAFETY]: 'Winter-Safety',
        [TABS.FUELING_SPILL]: 'Fueling-Spills',
        [TABS.TDG_LOGS]: 'Dangerous-Goods-TDG'
      };
      a.download = `Trucking-Operations-${sheetNames[activeTab] || 'Report'}-${today}.xlsx`;
      document.body.appendChild(a);
      a.click();
      URL.revokeObjectURL(url);
      document.body.removeChild(a);
      addNotification('success', 'Report exported successfully');
    } catch (err: any) {
      console.error('Export error:', err);
      addNotification('error', err?.message || 'Failed to export report');
    }
  };

  // === RENDER FUNCTIONS FOR EACH TAB ===

  const renderLoadSecurement = () => (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-card rounded-xl p-6 shadow-md border-l-4" style={{ borderColor: CUSTOM_COLORS.primary }}>
          <div className="text-3xl font-bold text-primary">{loadSecurementLogs.length}</div>
          <div className="text-sm text-secondary mt-1">Total Logs (This Month)</div>
        </div>
        <div className="bg-card rounded-xl p-6 shadow-md border-l-4 border-green-500">
          <div className="text-3xl font-bold text-green-700">{loadSecurementLogs.filter(l => l.meetsStandards).length}</div>
          <div className="text-sm text-secondary mt-1">Compliant Loads</div>
        </div>
        <div className="bg-card rounded-xl p-6 shadow-md border-l-4 border-red-500">
          <div className="text-3xl font-bold text-red-700">{loadSecurementLogs.filter(l => !l.meetsStandards).length}</div>
          <div className="text-sm text-secondary mt-1">Deficiencies Found</div>
        </div>
        <div className="bg-card rounded-xl p-6 shadow-md border-l-4 border-blue-500">
          <div className="text-3xl font-bold text-blue-700">{loadSecurementLogs.filter(l => l.photoEvidence && l.photoEvidence.length > 0).length}</div>
          <div className="text-sm text-secondary mt-1">With Photo Evidence</div>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-card rounded-xl shadow-lg overflow-hidden">
        <div className="p-6 border-b">
          <h3 className="text-xl font-bold text-headings">Load Securement Logs</h3>
          <p className="text-sm text-secondary mt-1">Pre-departure checks per FMCSA/CVSA standards</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-card">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-medium text-headings uppercase">Log #</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-headings uppercase">Date/Time</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-headings uppercase">Driver</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-headings uppercase">Vehicle</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-headings uppercase">Load Type</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-headings uppercase">Securement</th>
                <th className="px-6 py-4 text-left text-xs font-medium text- uppercase">Compliance</th>

              </tr>
            </thead>
            <tbody className="divide-y divide-theme divide-white/5">
              {loadSecurementLogs.map((log) => (
                <tr key={log._id} className="hover:bg-[rgba(255,255,255,0.03)]">
                  <td className="px-6 py-4 text-sm font-medium text-secondary">{log.logNumber}</td>
                  <td className="px-6 py-4 text-sm text-secondary">
                    {formatDateTime(log.date, log.time)}
                  </td>
                  <td className="px-6 py-4 text-sm text-secondary">{log.driverName}</td>
                  <td className="px-6 py-4 text-sm text-secondary">
                    <div>{log.vehicleNumber}</div>
                    <div className="text-xs text-secondary">{log.trailerNumber}</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-secondary">{log.loadType}</td>
                  <td className="px-6 py-4 text-sm">
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-semibold uppercase">
                      {log.securedBy}
                    </span>
                    {log.numberOfStraps && (
                      <div className="text-xs text-secondary mt-1">{log.numberOfStraps} straps</div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {log.meetsStandards ? (
                      <span className="flex items-center text-green-700">
                        <FaCheckCircle className="mr-1" /> Compliant
                      </span>
                    ) : (
                      <span className="flex items-center text-red-700">
                        <FaTimesCircle className="mr-1" /> Deficiency
                      </span>
                    )}
                  </td>

                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderReeferSafety = () => (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-card rounded-xl p-6 shadow-md border-l-4" style={{ borderColor: CUSTOM_COLORS.primary }}>
          <div className="text-3xl font-bold text-primary">{reeferLogs.length}</div>
          <div className="text-sm text-secondary mt-1">Reefer Inspections (This Month)</div>
        </div>
        <div className="bg-card rounded-xl p-6 shadow-md border-l-4 border-green-500">
          <div className="text-3xl font-bold text-green-700">{reeferLogs.filter(l => l.withinRange).length}</div>
          <div className="text-sm text-secondary mt-1">Temperature Compliant</div>
        </div>
        <div className="bg-card rounded-xl p-6 shadow-md border-l-4 border-blue-500">
          <div className="text-3xl font-bold text-blue-700">{reeferLogs.filter(l => l.interiorCleanliness === 'excellent').length}</div>
          <div className="text-sm text-secondary mt-1">Excellent Cleanliness</div>
        </div>
        <div className="bg-card rounded-xl p-6 shadow-md border-l-4 border-red-500">
          <div className="text-3xl font-bold text-red-700">{reeferLogs.filter(l => l.deficienciesFound).length}</div>
          <div className="text-sm text-secondary mt-1">Deficiencies Reported</div>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-card rounded-xl shadow-lg overflow-hidden">
        <div className="p-6 border-b">
          <h3 className="text-xl font-bold text-primary">Reefer Food Safety & Sanitation Logs</h3>
          <p className="text-sm text-secondary mt-1">Temperature monitoring and cleanliness inspections</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-card">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-medium text-headings uppercase">Log #</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-headings uppercase">Date/Time</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-headings uppercase">Driver</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-headings uppercase">Unit</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-headings uppercase">Temp (°C)</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-headings uppercase">Cleanliness</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-headings uppercase">Status</th>

              </tr>
            </thead>
            <tbody className="divide-y divide-theme divide-white/5 ">
              {reeferLogs.map((log) => (
                <tr key={log._id} className="hover:bg-[rgba(255,255,255,0.03)]">
                  <td className="px-6 py-4 text-sm font-medium text-secondary">{log.logNumber}</td>
                  <td className="px-6 py-4 text-sm text-secondary">
                    {formatDateTime(log.date, log.time)}
                  </td>
                  <td className="px-6 py-4 text-sm text-secondary">{log.driverName}</td>
                  <td className="px-6 py-4 text-sm text-secondary">{log.trailerNumber}</td>
                  <td className="px-6 py-4 text-sm">
                    <div className="flex items-center">
                      <FaThermometerHalf className={`mr-2 ${log.withinRange ? 'text-green-600' : 'text-[#A855F7]'}`} />
                      <span className={`font-semibold ${log.withinRange ? 'text-green-700' : 'text-red-700'}`}>
                        {log.temperatureRecorded}°C
                      </span>
                    </div>
                    <div className="text-xs text-secondary">Target: {log.targetTemperature}°C</div>
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-semibold ${log.interiorCleanliness === 'excellent'
                        ? 'bg-green-100 text-green-800'
                        : log.interiorCleanliness === 'good'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-yellow-100 text-yellow-800'
                        }`}
                    >
                      {log.interiorCleanliness.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {!log.deficienciesFound ? (
                      <span className="flex items-center text-green-700">
                        <FaCheckCircle className="mr-1" /> Pass
                      </span>
                    ) : (
                      <span className="flex items-center text-red-700">
                        <FaTimesCircle className="mr-1" /> Action Required
                      </span>
                    )}
                  </td>

                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderWinterSafety = () => (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-card rounded-xl p-6 shadow-md border-l-4" style={{ borderColor: CUSTOM_COLORS.primary }}>
          <div className="text-3xl font-bold text-primary">{winterChecklists.length}</div>
          <div className="text-sm text-secondary mt-1">Total Checklists (This Month)</div>
        </div>
        <div className="bg-card rounded-xl p-6 shadow-md border-l-4 border-green-500">
          <div className="text-3xl font-bold text-green-700">{winterChecklists.filter(c => !c.hazardsIdentified).length}</div>
          <div className="text-sm text-secondary mt-1">No Hazards Found</div>
        </div>
        <div className="bg-card rounded-xl p-6 shadow-md border-l-4 border-yellow-500">
          <div className="text-3xl font-bold text-yellow-700">{winterChecklists.filter(c => c.hazardsIdentified).length}</div>
          <div className="text-sm text-secondary mt-1">Hazards Identified</div>
        </div>
        <div className="bg-card rounded-xl p-6 shadow-md border-l-4 border-blue-500">
          <div className="text-3xl font-bold text-blue-700">{winterChecklists.filter(c => c.tireChainCondition === 'good').length}</div>
          <div className="text-sm text-secondary mt-1">Good Chain Condition</div>
        </div>
      </div>

      {/* Checklists Table */}
      <div className="bg-card rounded-xl shadow-lg overflow-hidden">
        <div className="p-6 border-b">
          <h3 className="text-xl font-bold text-primary">Winter Safety Checklists</h3>
          <p className="text-sm text-secondary mt-1">Snow/ice removal, tire chains, and winter readiness inspections</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-card">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-medium text-headings uppercase">Checklist #</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-headings uppercase">Date/Time</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-headings uppercase">Location</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-headings uppercase">Performed By</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-headings uppercase">Vehicle</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-headings uppercase">Status</th>

              </tr>
            </thead>
            <tbody className="divide-y divide-theme">
              {winterChecklists.map((checklist) => (
                <tr key={checklist._id} className="hover:bg-[rgba(255,255,255,0.03)]">
                  <td className="px-6 py-4 text-sm font-medium text-secondary">{checklist.checklistNumber}</td>
                  <td className="px-6 py-4 text-sm text-secondary">
                    {formatDateTime(checklist.date, checklist.time)}
                  </td>
                  <td className="px-6 py-4 text-sm text-secondary">{checklist.location}</td>
                  <td className="px-6 py-4 text-sm text-secondary">{checklist.performedBy}</td>
                  <td className="px-6 py-4 text-sm text-secondary">{checklist.vehicleNumber || 'N/A'}</td>
                  <td className="px-6 py-4">
                    {checklist.hazardsIdentified ? (
                      <span className="flex items-center text-yellow-700">
                        <FaExclamationTriangle className="mr-1" /> Hazards Found
                      </span>
                    ) : (
                      <span className="flex items-center text-green-700">
                        <FaCheckCircle className="mr-1" /> All Clear
                      </span>
                    )}
                  </td>

                </tr>
              ))}
              {winterChecklists.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-secondary">
                    No winter safety checklists recorded yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderFuelingSpill = () => (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-card rounded-xl p-6 shadow-md border-l-4" style={{ borderColor: CUSTOM_COLORS.primary }}>
          <div className="text-3xl font-bold text-primary">{fuelingLogs.length}</div>
          <div className="text-sm text-secondary mt-1">Total Logs (This Month)</div>
        </div>
        <div className="bg-card rounded-xl p-6 shadow-md border-l-4 border-green-500">
          <div className="text-3xl font-bold text-green-700">{fuelingLogs.filter(l => !l.spillOccurred).length}</div>
          <div className="text-sm text-secondary mt-1">No Spills</div>
        </div>
        <div className="bg-card rounded-xl p-6 shadow-md border-l-4 border-red-500">
          <div className="text-3xl font-bold text-red-700">{fuelingLogs.filter(l => l.spillOccurred).length}</div>
          <div className="text-sm text-secondary mt-1">Spill Incidents</div>
        </div>
        <div className="bg-card rounded-xl p-6 shadow-md border-l-4 border-blue-500">
          <div className="text-3xl font-bold text-blue-700">{fuelingLogs.filter(l => l.spillKitPresent).length}</div>
          <div className="text-sm text-secondary mt-1">Spill Kit Present</div>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-card rounded-xl shadow-lg overflow-hidden">
        <div className="p-6 border-b">
          <h3 className="text-xl font-bold text-primary">Fueling & Spill Prevention Logs</h3>
          <p className="text-sm text-secondary mt-1">Pre-fueling checklists and spill incident tracking</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-card">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-medium text-headings uppercase">Log #</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-headings uppercase">Date/Time</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-headings uppercase">Location</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-headings uppercase">Performed By</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-headings uppercase">Vehicle</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-headings uppercase">Fuel Type</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-headings uppercase">Spill Status</th>

              </tr>
            </thead>
            <tbody className="divide-y divide-theme">
              {fuelingLogs.map((log) => (
                <tr key={log._id} className="hover:bg-[rgba(255,255,255,0.03)]">
                  <td className="px-6 py-4 text-sm font-medium text-secondary">{log.logNumber}</td>
                  <td className="px-6 py-4 text-sm text-secondary">
                    {formatDateTime(log.date, log.time)}
                  </td>
                  <td className="px-6 py-4 text-sm text-secondary">{log.location}</td>
                  <td className="px-6 py-4 text-sm text-secondary">{log.performedBy}</td>
                  <td className="px-6 py-4 text-sm text-secondary">{log.vehicleNumber || 'N/A'}</td>
                  <td className="px-6 py-4 text-sm">
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-semibold uppercase">
                      {log.fuelType}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {log.spillOccurred ? (
                      <span className="flex items-center text-red-700">
                        <FaExclamationTriangle className="mr-1" /> Spill Occurred
                      </span>
                    ) : (
                      <span className="flex items-center text-green-700">
                        <FaCheckCircle className="mr-1" /> No Spill
                      </span>
                    )}
                  </td>

                </tr>
              ))}
              {fuelingLogs.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-secondary">
                    No fueling logs recorded yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderTDGLogs = () => (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-card rounded-xl p-6 shadow-md border-l-4" style={{ borderColor: CUSTOM_COLORS.primary }}>
          <div className="text-3xl font-bold text-primary">{tdgLogs.length}</div>
          <div className="text-sm text-secondary mt-1">Total TDG Shipments</div>
        </div>
        <div className="bg-card rounded-xl p-6 shadow-md border-l-4 border-green-500">
          <div className="text-3xl font-bold text-green-700">{tdgLogs.filter(l => l.placardingComplete && l.tdgCertificateCurrent).length}</div>
          <div className="text-sm text-secondary mt-1">Fully Compliant</div>
        </div>
        <div className="bg-card rounded-xl p-6 shadow-md border-l-4 border-red-500">
          <div className="text-3xl font-bold text-red-700">{tdgLogs.filter(l => l.incidentOccurred).length}</div>
          <div className="text-sm text-secondary mt-1">Incidents Reported</div>
        </div>
        <div className="bg-card rounded-xl p-6 shadow-md border-l-4 border-yellow-500">
          <div className="text-3xl font-bold text-yellow-700">{tdgLogs.filter(l => !l.tdgCertificateCurrent).length}</div>
          <div className="text-sm text-secondary mt-1">Certificate Issues</div>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-card rounded-xl shadow-lg overflow-hidden">
        <div className="p-6 border-b">
          <h3 className="text-xl font-bold text-primary">Dangerous Goods (TDG) Logs</h3>
          <p className="text-sm text-secondary mt-1">Shipment documentation and incident reporting</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-card">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-medium text-headings uppercase">Log #</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-headings uppercase">Date/Time</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-headings uppercase">Driver</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-headings uppercase">Vehicle</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-headings uppercase">UN Number</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-headings uppercase">Class</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-headings uppercase">Placarding</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-headings uppercase">Status</th>

              </tr>
            </thead>
            <tbody className="divide-y divide-theme divide-white/5">
              {tdgLogs.map((log) => (
                <tr key={log._id} className="hover:bg-[rgba(255,255,255,0.03)]">
                  <td className="px-6 py-4 text-sm font-medium text-secondary">{log.logNumber}</td>
                  <td className="px-6 py-4 text-sm text-secondary">
                    {formatDateTime(log.date, log.time)}
                  </td>
                  <td className="px-6 py-4 text-sm text-secondary">{log.driverName}</td>
                  <td className="px-6 py-4 text-sm text-secondary">
                    <div>{log.vehicleNumber}</div>
                    {log.trailerNumber && <div className="text-xs text-secondary">{log.trailerNumber}</div>}
                  </td>
                  <td className="px-6 py-4 text-sm font-mono text-primary">{log.unNumber}</td>
                  <td className="px-6 py-4 text-sm">
                    <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-semibold">
                      Class {log.class}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {log.placardingComplete ? (
                      <span className="flex items-center text-green-700">
                        <FaCheckCircle className="mr-1" /> Complete
                      </span>
                    ) : (
                      <span className="flex items-center text-red-700">
                        <FaTimesCircle className="mr-1" /> Incomplete
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {log.incidentOccurred ? (
                      <span className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs font-semibold">
                        INCIDENT
                      </span>
                    ) : log.tdgCertificateCurrent && log.placardingComplete ? (
                      <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-semibold">
                        COMPLIANT
                      </span>
                    ) : (
                      <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs font-semibold">
                        REVIEW
                      </span>
                    )}
                  </td>

                </tr>
              ))}
              {tdgLogs.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-6 py-8 text-center text-secondary">
                    No TDG logs recorded yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (activeTab) {
      case TABS.LOAD_SECUREMENT:
        return renderLoadSecurement();
      case TABS.REEFER_SAFETY:
        return renderReeferSafety();
      case TABS.WINTER_SAFETY:
        return renderWinterSafety();
      case TABS.FUELING_SPILL:
        return renderFuelingSpill();
      case TABS.TDG_LOGS:
        return renderTDGLogs();
      default:
        return renderLoadSecurement();
    }
  };

  return (
    <div className="min-h-screen p-6 bg-main" >
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

      <div className="w-full mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-2 text-headings" >
              Trucking Operations
            </h1>
            <p className="text-lg text-secondary">
              Industry-specific safety logs for load securement, reefer safety, winter operations, and more.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleExportReport}
              className="px-6 py-3 rounded-xl bg-green-600 !text-white font-semibold shadow-lg hover:bg-green-700 transition-all flex items-center space-x-2"
            >
              <FaDownload />
              <span>Export Report</span>
            </button>
            <button
              onClick={() => setShowModal(true)}
              className="px-6 py-3 rounded-xl !text-white font-semibold shadow-lg hover:shadow-xl transition-all flex items-center space-x-2 bg-[var(--accent-navyblue)]"

            >
              <FaPlus />
              <span>New Log Entry</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-card rounded-xl shadow-lg mb-6 overflow-hidden">
          <div className="flex overflow-x-auto">
            <button
              onClick={() => setActiveTab(TABS.LOAD_SECUREMENT)}
              className={`flex-1 px-6 py-4 font-semibold transition-all flex items-center justify-center space-x-2 ${activeTab === TABS.LOAD_SECUREMENT
                ? 'border-b-4 text-primary bg-card'
                : 'text-secondary hover:bg-[rgba(255,255,255,0.03)]'
                }`}
              style={activeTab === TABS.LOAD_SECUREMENT ? { borderColor: CUSTOM_COLORS.primary } : {}}
            >
              <FaBox />
              <span>Load Securement</span>
            </button>
            <button
              onClick={() => setActiveTab(TABS.REEFER_SAFETY)}
              className={`flex-1 px-6 py-4 font-semibold transition-all flex items-center justify-center space-x-2 ${activeTab === TABS.REEFER_SAFETY
                ? 'border-b-4 text-primary bg-card'
                : 'text-secondary hover:bg-[rgba(255,255,255,0.03)]'
                }`}
              style={activeTab === TABS.REEFER_SAFETY ? { borderColor: CUSTOM_COLORS.primary } : {}}
            >
              <FaThermometerHalf />
              <span>Reefer Food Safety</span>
            </button>
            <button
              onClick={() => setActiveTab(TABS.WINTER_SAFETY)}
              className={`flex-1 px-6 py-4 font-semibold transition-all flex items-center justify-center space-x-2 ${activeTab === TABS.WINTER_SAFETY
                ? 'border-b-4 text-primary bg-card'
                : 'text-secondary hover:bg-[rgba(255,255,255,0.03)]'
                }`}
              style={activeTab === TABS.WINTER_SAFETY ? { borderColor: CUSTOM_COLORS.primary } : {}}
            >
              <FaSnowflake />
              <span>Winter Safety</span>
            </button>
            <button
              onClick={() => setActiveTab(TABS.FUELING_SPILL)}
              className={`flex-1 px-6 py-4 font-semibold transition-all flex items-center justify-center space-x-2 ${activeTab === TABS.FUELING_SPILL
                ? 'border-b-4 text-primary bg-card'
                : 'text-secondary hover:bg-[rgba(255,255,255,0.03)]'
                }`}
              style={activeTab === TABS.FUELING_SPILL ? { borderColor: CUSTOM_COLORS.primary } : {}}
            >
              <FaGasPump />
              <span>Fueling & Spills</span>
            </button>
            <button
              onClick={() => setActiveTab(TABS.TDG_LOGS)}
              className={`flex-1 px-6 py-4 font-semibold transition-all flex items-center justify-center space-x-2 ${activeTab === TABS.TDG_LOGS
                ? 'border-b-4 text-primary bg-card'
                : 'text-secondary hover:bg-[rgba(255,255,255,0.03)]'
                }`}
              style={activeTab === TABS.TDG_LOGS ? { borderColor: CUSTOM_COLORS.primary } : {}}
            >
              <FaBiohazard />
              <span>Dangerous Goods (TDG)</span>
            </button>
          </div>
        </div>

        {/* Content Area */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-secondary text-lg">Loading trucking operations data...</div>
          </div>
        ) : (
          renderContent()
        )}
      </div>

      {/* Create Log Entry Modal */}
      {showModal && (
        <div
          className="fixed inset-0 flex justify-center items-center z-[10001] p-4  bg-black/40  bg-opacity-50"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowModal(false);
              setShippingDocumentFile(null);
            }
          }}
        >
          <div
            className="bg-card rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-card border-b p-6 flex justify-between items-center">
              <h2 className="text-2xl font-bold">
                New {activeTab === TABS.LOAD_SECUREMENT ? 'Load Securement' :
                  activeTab === TABS.REEFER_SAFETY ? 'Reefer Food Safety' :
                    activeTab === TABS.WINTER_SAFETY ? 'Winter Safety' :
                      activeTab === TABS.FUELING_SPILL ? 'Fueling & Spill' :
                        'Dangerous Goods'} Log Entry
              </h2>
              <button
                onClick={() => { setShowModal(false); setShippingDocumentFile(null); }}
                className="text-secondary hover:text-primary transition-colors"
              >
                <FaTimes size={24} />
              </button>
            </div>

            <form onSubmit={handleCreateEntry} className="p-6 space-y-6">
              {activeTab === TABS.LOAD_SECUREMENT && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-headings mb-1">Date *</label>
                    <input
                      type="date"
                      required
                      value={loadSecurementForm.date}
                      onChange={(e) => setLoadSecurementForm({ ...loadSecurementForm, date: e.target.value })}
                      className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-blue-500"
                      style={{ colorScheme: 'dark' }}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-headings mb-1">Time *</label>
                    <input
                      type="time"
                      required
                      value={loadSecurementForm.time}
                      onChange={(e) => setLoadSecurementForm({ ...loadSecurementForm, time: e.target.value })}
                      className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-blue-500"
                      style={{ colorScheme: 'dark' }}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-headings mb-1">Driver Name *</label>
                    <select
                      required
                      value={loadSecurementForm.driverName}
                      onChange={(e) =>
                        setLoadSecurementForm({
                          ...loadSecurementForm,
                          driverName: e.target.value,
                        })
                      }
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
                        Select driver
                      </option>

                      {drivers.map((d) => (
                        <option
                          key={d._id}
                          value={d.name}
                          className="bg-[var(--bg-card)] text-[var(--text-primary)]"
                        >
                          {d.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-headings mb-1">Vehicle Number *</label>
                    <select
                      required
                      value={loadSecurementForm.vehicleNumber}
                      onChange={(e) =>
                        setLoadSecurementForm({
                          ...loadSecurementForm,
                          vehicleNumber: e.target.value,
                        })
                      }
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
                        Select vehicle
                      </option>

                      {vehicles.map((v) => (
                        <option
                          key={v._id}
                          value={v.unitNo}
                          className="bg-[var(--bg-card)] text-[var(--text-primary)]"
                        >
                          {v.unitNo}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-headings mb-1">Load Type *</label>
                    <input
                      type="text"
                      required
                      value={loadSecurementForm.loadType}
                      onChange={(e) => setLoadSecurementForm({ ...loadSecurementForm, loadType: e.target.value })}
                      className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-headings mb-1">Secured By *</label>
                    <select
                      required
                      value={loadSecurementForm.securedBy}
                      onChange={(e) =>
                        setLoadSecurementForm({
                          ...loadSecurementForm,
                          securedBy: e.target.value as any,
                        })
                      }
                      className="w-full px-3 py-2 text-sm border border-theme rounded-lg
  bg-[var(--bg-card)] text-[var(--text-primary)]
  focus:ring-2 focus:ring-[var(--accent-blue)]
  focus:border-[var(--accent-blue)]
  outline-none cursor-pointer transition-all"
                    >
                      <option value="straps" className="bg-[var(--bg-card)] text-[var(--text-primary)]">
                        Straps
                      </option>

                      <option value="chains" className="bg-[var(--bg-card)] text-[var(--text-primary)]">
                        Chains
                      </option>

                      <option value="tarps" className="bg-[var(--bg-card)] text-[var(--text-primary)]">
                        Tarps
                      </option>

                      <option value="combination" className="bg-[var(--bg-card)] text-[var(--text-primary)]">
                        Combination
                      </option>

                      <option value="bulkhead" className="bg-[var(--bg-card)] text-[var(--text-primary)]">
                        Bulkhead
                      </option>

                      <option value="other" className="bg-[var(--bg-card)] text-[var(--text-primary)]">
                        Other
                      </option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-headings mb-1">Meets Standards</label>
                    <input
                      type="checkbox"
                      checked={loadSecurementForm.meetsStandards}
                      onChange={(e) => setLoadSecurementForm({ ...loadSecurementForm, meetsStandards: e.target.checked })}
                      className="w-5 h-5"
                    />
                  </div>
                </div>
              )}

              {activeTab === TABS.REEFER_SAFETY && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-primary mb-1">Date *</label>
                    <input
                      type="date"
                      required
                      value={reeferForm.date}
                      onChange={(e) => setReeferForm({ ...reeferForm, date: e.target.value })}
                      className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-primary mb-1">Time *</label>
                    <input
                      type="time"
                      required
                      value={reeferForm.time}
                      onChange={(e) => setReeferForm({ ...reeferForm, time: e.target.value })}
                      className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-primary mb-1">Driver Name *</label>
                    <select
                      required
                      value={reeferForm.driverName}
                      onChange={(e) => setReeferForm({ ...reeferForm, driverName: e.target.value })}
                      className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option className='form-option' value="">Select driver</option>
                      {drivers.map((d) => (
                        <option className='form-option' key={d._id} value={d.name}>{d.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-primary mb-1">Vehicle Number *</label>
                    <select
                      required
                      value={reeferForm.vehicleNumber}
                      onChange={(e) => setReeferForm({ ...reeferForm, vehicleNumber: e.target.value })}
                      className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option className='form-option' value="">Select vehicle</option>
                      {vehicles.map((v) => (
                        <option className='form-option' key={v._id} value={v.unitNo}>{v.unitNo}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-primary mb-1">Trailer Number *</label>
                    <select
                      required
                      value={reeferForm.trailerNumber}
                      onChange={(e) => setReeferForm({ ...reeferForm, trailerNumber: e.target.value })}
                      className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option className='form-option' value="">Select trailer</option>
                      {trailers.map((t) => (
                        <option className='form-option' key={t._id} value={t.unitNo}>{t.unitNo}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-primary mb-1">Temperature Recorded *</label>
                    <input
                      type="number"
                      required
                      value={reeferForm.temperatureRecorded}
                      onChange={(e) => setReeferForm({ ...reeferForm, temperatureRecorded: e.target.value })}
                      className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-primary mb-1">Target Temperature *</label>
                    <input
                      type="number"
                      required
                      value={reeferForm.targetTemperature}
                      onChange={(e) => setReeferForm({ ...reeferForm, targetTemperature: e.target.value })}
                      className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-primary mb-1">Interior Cleanliness *</label>
                    <select
                      required
                      value={reeferForm.interiorCleanliness}
                      onChange={(e) => setReeferForm({ ...reeferForm, interiorCleanliness: e.target.value as any })}
                      className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option className='form-option' value="excellent">Excellent</option>
                      <option className='form-option' value="good">Good</option>
                      <option className='form-option' value="fair">Fair</option>
                      <option className='form-option' value="poor">Poor</option>
                    </select>
                  </div>
                </div>
              )}

              {activeTab === TABS.WINTER_SAFETY && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-primary mb-1">Date *</label>
                    <input
                      type="date"
                      required
                      value={winterForm.date}
                      onChange={(e) => setWinterForm({ ...winterForm, date: e.target.value })}
                      className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-primary mb-1">Location *</label>
                    <input
                      type="text"
                      required
                      value={winterForm.location}
                      onChange={(e) => setWinterForm({ ...winterForm, location: e.target.value })}
                      className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-primary mb-1">Performed By *</label>
                    <select
                      required
                      value={winterForm.performedBy}
                      onChange={(e) => setWinterForm({ ...winterForm, performedBy: e.target.value })}
                      className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option className='form-option' value="">Select driver</option>
                      {drivers.map((d) => (
                        <option className='form-option' key={d._id} value={d.name}>{d.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-primary mb-1">Vehicle Number</label>
                    <select
                      value={winterForm.vehicleNumber}
                      onChange={(e) => setWinterForm({ ...winterForm, vehicleNumber: e.target.value })}
                      className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option className='form-option' value="">Select vehicle</option>
                      {vehicles.map((v) => (
                        <option className='form-option' key={v._id} value={v.unitNo}>{v.unitNo}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <div className="space-y-2">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={winterForm.snowIceRemoved}
                          onChange={(e) => setWinterForm({ ...winterForm, snowIceRemoved: e.target.checked })}
                          className="mr-2"
                        />
                        Snow/Ice Removed
                      </label>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={winterForm.walkwaysCleared}
                          onChange={(e) => setWinterForm({ ...winterForm, walkwaysCleared: e.target.checked })}
                          className="mr-2"
                        />
                        Walkways Cleared
                      </label>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={winterForm.heatingSystemFunctional}
                          onChange={(e) => setWinterForm({ ...winterForm, heatingSystemFunctional: e.target.checked })}
                          className="mr-2"
                        />
                        Heating System Functional
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === TABS.FUELING_SPILL && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-primary mb-1">Date *</label>
                    <input
                      type="date"
                      required
                      value={fuelingForm.date}
                      onChange={(e) => setFuelingForm({ ...fuelingForm, date: e.target.value })}
                      className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-primary mb-1">Location *</label>
                    <input
                      type="text"
                      required
                      value={fuelingForm.location}
                      onChange={(e) => setFuelingForm({ ...fuelingForm, location: e.target.value })}
                      className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-primary mb-1">Performed By *</label>
                    <select
                      required
                      value={fuelingForm.performedBy}
                      onChange={(e) => setFuelingForm({ ...fuelingForm, performedBy: e.target.value })}
                      className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option className='form-option' value="">Select driver</option>
                      {drivers.map((d) => (
                        <option className='form-option' key={d._id} value={d.name}>{d.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-primary mb-1">Vehicle Number</label>
                    <select
                      value={fuelingForm.vehicleNumber}
                      onChange={(e) => setFuelingForm({ ...fuelingForm, vehicleNumber: e.target.value })}
                      className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option className='form-option' value="">Select vehicle</option>
                      {vehicles.map((v) => (
                        <option className='form-option' key={v._id} value={v.unitNo}>{v.unitNo}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-primary mb-1">Fuel Type *</label>
                    <select
                      required
                      value={fuelingForm.fuelType}
                      onChange={(e) => setFuelingForm({ ...fuelingForm, fuelType: e.target.value as any })}
                      className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option className='form-option' value="diesel">Diesel</option>
                      <option className='form-option' value="gasoline">Gasoline</option>
                      <option className='form-option' value="DEF">DEF</option>
                      <option className='form-option' value="propane">Propane</option>
                      <option className='form-option' value="natural-gas">Natural Gas</option>
                    </select>
                  </div>
                  <div className="col-span-2">
                    <div className="space-y-2">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={fuelingForm.vehicleParked}
                          onChange={(e) => setFuelingForm({ ...fuelingForm, vehicleParked: e.target.checked })}
                          className="mr-2"
                        />
                        Vehicle Parked
                      </label>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={fuelingForm.engineOff}
                          onChange={(e) => setFuelingForm({ ...fuelingForm, engineOff: e.target.checked })}
                          className="mr-2"
                        />
                        Engine Off
                      </label>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={fuelingForm.spillOccurred}
                          onChange={(e) => setFuelingForm({ ...fuelingForm, spillOccurred: e.target.checked })}
                          className="mr-2"
                        />
                        Spill Occurred
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === TABS.TDG_LOGS && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-primary mb-1">Date *</label>
                    <input
                      type="date"
                      required
                      value={tdgForm.date}
                      onChange={(e) => setTdgForm({ ...tdgForm, date: e.target.value })}
                      className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-primary mb-1">Time *</label>
                    <input
                      type="time"
                      required
                      value={tdgForm.time}
                      onChange={(e) => setTdgForm({ ...tdgForm, time: e.target.value })}
                      className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-primary mb-1">Driver Name *</label>
                    <select
                      required
                      value={tdgForm.driverName}
                      onChange={(e) => setTdgForm({ ...tdgForm, driverName: e.target.value })}
                      className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option className='form-option' value="">Select driver</option>
                      {drivers.map((d) => (
                        <option className='form-option' key={d._id} value={d.name}>{d.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-primary mb-1">Vehicle Number</label>
                    <select
                      value={tdgForm.vehicleNumber}
                      onChange={(e) => setTdgForm({ ...tdgForm, vehicleNumber: e.target.value })}
                      className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option className='form-option' value="">Select vehicle</option>
                      {vehicles.map((v) => (
                        <option className='form-option' key={v._id} value={v.unitNo}>{v.unitNo}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-primary mb-1">Trailer Number</label>
                    <select
                      value={tdgForm.trailerNumber}
                      onChange={(e) => setTdgForm({ ...tdgForm, trailerNumber: e.target.value })}
                      className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option className='form-option' value="">Select trailer</option>
                      {trailers.map((t) => (
                        <option className='form-option' key={t._id} value={t.unitNo}>{t.unitNo}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-primary mb-1">Shipping Document</label>
                    <div className="space-y-2">
                      <input
                        type="file"
                        accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.zip,image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          setShippingDocumentFile(file || null);
                          if (file) setTdgForm({ ...tdgForm, shippingDocument: file.name });
                        }}
                        className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-blue-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:cursor-pointer"
                      />
                      {shippingDocumentFile && (
                        <span className="text-sm text-secondary">{shippingDocumentFile.name}</span>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-primary mb-1">UN Number *</label>
                    <input
                      type="text"
                      required
                      value={tdgForm.unNumber}
                      onChange={(e) => setTdgForm({ ...tdgForm, unNumber: e.target.value })}
                      className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-primary mb-1">Proper Shipping Name *</label>
                    <input
                      type="text"
                      required
                      value={tdgForm.properShippingName}
                      onChange={(e) => setTdgForm({ ...tdgForm, properShippingName: e.target.value })}
                      className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-primary mb-1">Class *</label>
                    <input
                      type="text"
                      required
                      value={tdgForm.class}
                      onChange={(e) => setTdgForm({ ...tdgForm, class: e.target.value })}
                      className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-primary mb-1">Quantity *</label>
                    <input
                      type="text"
                      required
                      value={tdgForm.quantity}
                      onChange={(e) => setTdgForm({ ...tdgForm, quantity: e.target.value })}
                      className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="col-span-2">
                    <div className="text-sm font-medium text-primary mb-2">Placarding & Compliance</div>
                    <div className="grid grid-cols-2 gap-2">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={tdgForm.placardingRequired}
                          onChange={(e) => setTdgForm({ ...tdgForm, placardingRequired: e.target.checked })}
                          className="mr-2"
                        />
                        Placarding Required
                      </label>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={tdgForm.placardingComplete}
                          onChange={(e) => setTdgForm({ ...tdgForm, placardingComplete: e.target.checked })}
                          className="mr-2"
                        />
                        Placarding Complete
                      </label>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={tdgForm.placardsInspected}
                          onChange={(e) => setTdgForm({ ...tdgForm, placardsInspected: e.target.checked })}
                          className="mr-2"
                        />
                        Placards Inspected
                      </label>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={tdgForm.emergencyResponseInfo}
                          onChange={(e) => setTdgForm({ ...tdgForm, emergencyResponseInfo: e.target.checked })}
                          className="mr-2"
                        />
                        Emergency Response Info
                      </label>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={tdgForm.tdgCertificateCurrent}
                          onChange={(e) => setTdgForm({ ...tdgForm, tdgCertificateCurrent: e.target.checked })}
                          className="mr-2"
                        />
                        TDG Certificate Current
                      </label>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={tdgForm.securityPlan}
                          onChange={(e) => setTdgForm({ ...tdgForm, securityPlan: e.target.checked })}
                          className="mr-2"
                        />
                        Security Plan
                      </label>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={tdgForm.incidentOccurred}
                          onChange={(e) => setTdgForm({ ...tdgForm, incidentOccurred: e.target.checked })}
                          className="mr-2"
                        />
                        Incident Occurred
                      </label>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={tdgForm.segregationCorrect}
                          onChange={(e) => setTdgForm({ ...tdgForm, segregationCorrect: e.target.checked })}
                          className="mr-2"
                        />
                        Segregation Correct
                      </label>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={tdgForm.packagingIntact}
                          onChange={(e) => setTdgForm({ ...tdgForm, packagingIntact: e.target.checked })}
                          className="mr-2"
                        />
                        Packaging Intact
                      </label>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={tdgForm.labelsLegible}
                          onChange={(e) => setTdgForm({ ...tdgForm, labelsLegible: e.target.checked })}
                          className="mr-2"
                        />
                        Labels Legible
                      </label>
                    </div>
                    {tdgForm.incidentOccurred && (
                      <div className="mt-3">
                        <label className="block text-sm font-medium text-primary mb-1">Incident Details</label>
                        <textarea
                          value={tdgForm.incidentDetails}
                          onChange={(e) => setTdgForm({ ...tdgForm, incidentDetails: e.target.value })}
                          rows={3}
                          placeholder="Describe the incident..."
                          className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="flex justify-end space-x-4 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => { setShowModal(false); setShippingDocumentFile(null); }}
                  className="px-6 py-2 !mr-3 border border-theme rounded-lg text-primary hover:bg-[rgba(255,255,255,0.03)] transition-colors"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2 bg-[var(--accent-navyblue)] !text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? 'Creating...' : 'Create Log Entry'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TruckingOperations;