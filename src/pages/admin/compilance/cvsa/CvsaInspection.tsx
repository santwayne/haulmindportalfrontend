import React, { useState, useEffect, useRef } from 'react';
import {
  FaClipboardCheck,
  FaMapMarkerAlt,
  FaCalendarAlt,
  FaCheckCircle,
  FaTimesCircle,
  FaExclamationTriangle,
  FaExclamationCircle,
  FaInfoCircle,
  FaBan,
  FaEdit,
  FaTrash,
  FaEye,
  FaFilter,
  FaSearch,
  FaFlag,
  FaFlagUsa,
  FaTimes,
  FaChevronLeft,
  FaChevronRight
} from 'react-icons/fa';
import {
  getCvsaInspections,
  getCvsaInspectionStats,
  createCvsaInspection,
  updateCvsaInspection,
  deleteCvsaInspection
} from '../../../../axios/api/admin';
import { getAllVehicles } from '../../../../axios/api/vehicle';
import { listDriver } from '../../../../axios/api/distapcher';
import { FLEET_COLORS } from '../../fleetMaintenance/colorUtils';
import AddressSearch from '../../../../components/common/AddressSearch';

const ACCENT_PRIMARY = FLEET_COLORS.primary;

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


// Types
interface Inspection {
  _id: string;
  inspectionId: string;
  country: 'canada' | 'usa';
  date: string;
  location: string;
  status: 'pass' | 'fail' | 'warning' | 'out-of-service';
  vehicle: {
    _id: string;
    internalId?: string;
    plateNumber?: string;
    make?: string;
    model?: string;
    year?: number;
  } | string;
  driver: {
    _id: string;
    name?: string;
    email?: string;
  } | string;
  inspectorName: string;
  violations?: Violation[];
  notes?: string;
  createdAt: string;
  // OFFICIAL DOCUMENT NUMBERS
  reportNumber?: string; // The unique identifier of the physical inspection document
  inspectionLevel?: 'I' | 'II' | 'III' | 'IV' | 'V'; // The official CVSA inspection level
  jurisdiction?: string; // The state or province (e.g., 'ON', 'TX') that conducted the inspection
  // DRIVER & CARRIER SPECIFIC IDs
  driverLicenseNumber?: string; // The driver's license number
  carrierUSDOTNumber?: string; // The Carrier's USDOT Number (Crucial for USA FMCSA records)
  carrierMotorCarrierNumber?: string; // The Carrier's MC Number (if applicable)
  // TIME & DOCUMENTATION
  timeOfInspection?: string; // To capture the exact time on the report
  documentLink?: string; // URL link to the scanned PDF/image of the physical report (deprecated, use documents)
  documents?: Array<{
    documentUrl: string;
    documentType?: string;
    signedUrl?: string; // Signed URL for accessing the document
  }>; // Array of documents/photos related to inspection
  // OUT-OF-SERVICE SPECIFICS (Critical for tracking repairs)
  outOfServiceIssued?: boolean; // Whether an OOS order was explicitly issued (Yes/No)
  outOfServiceReleaseDate?: string; // Date and time the OOS order was lifted (if applicable)
  defectRepairNeeded?: boolean; // Indicates if mechanical defects must be repaired
}

interface Vehicle {
  _id: string;
  internalId?: string;
  plateNumber: string;
  licensePlate?: string;
  make: string;
  model: string;
  makeModel?: string;
  year?: number;
}

interface Driver {
  _id: string;
  name: string;
  email: string;
}

interface Violation {
  _id: string;
  code: string;
  description: string;
  severity: 'minor' | 'major' | 'critical';
}

interface InspectionStats {
  total: number;
  pass: number;
  fail: number;
  warning: number;
  outOfService: number;
}

// Toast Notification Types
type NotificationType = 'success' | 'error' | 'info' | 'warning';

interface ToastNotification {
  id: number;
  type: NotificationType;
  message: string;
}

// Toast Notification Component
const ToastNotification = ({ notification, onClose }: { notification: ToastNotification; onClose: (id: number) => void }) => {
  const toneStyles: Record<NotificationType, { bg: string; border: string; icon: React.ReactNode }> = {
    success: { bg: 'bg-green-50 border-green-200', border: '', icon: <FaCheckCircle className="text-green-600" size={20} /> },
    error: { bg: 'bg-card border-red-200', border: '', icon: <FaExclamationCircle className="text-[#A855F7]" size={20} /> },
    info: { bg: '', border: '', icon: <FaInfoCircle className="text-[var(--accent-color)]" size={20} /> },
    warning: { bg: 'bg-card border-yellow-200', border: '', icon: <FaExclamationTriangle className="text-[#00FFA3]" size={20} /> }
  };

  const infoStyle =
    notification.type === 'info'
      ? { backgroundColor: ACCENT_SOFT, borderColor: ACCENT_SOFT_BORDER }
      : undefined;

  return (
    <div
      className={`flex items-start gap-3 p-4 rounded-lg border-2 shadow-lg ${toneStyles[notification.type].bg || ''} animate-slide-in`}
      style={infoStyle}
    >
      <div className="flex-shrink-0 mt-0.5">
        {toneStyles[notification.type].icon}
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

const CvsaInspection: React.FC = () => {
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [filteredInspections, setFilteredInspections] = useState<Inspection[]>([]);
  const [activeTab, setActiveTab] = useState<'canada' | 'usa'>('canada');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showViewModal, setShowViewModal] = useState<boolean>(false);
  const [selectedInspection, setSelectedInspection] = useState<Inspection | null>(null);
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [showEditModal, setShowEditModal] = useState<boolean>(false);
  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);
  const [inspectionToDelete, setInspectionToDelete] = useState<Inspection | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);

  // Refs for scrollbar synchronization
  const topScrollRef = useRef<HTMLDivElement>(null);
  const bottomScrollRef = useRef<HTMLDivElement>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [total, setTotal] = useState<number>(0);
  const [inspectionForm, setInspectionForm] = useState<Omit<Partial<Inspection>, 'documents'> & { documents?: File[] }>({
    country: 'canada',
    date: '',
    location: '',
    status: 'pass',
    vehicle: '',
    driver: '',
    inspectorName: '',
    violations: [],
    notes: '',
    // New required fields
    reportNumber: '',
    inspectionLevel: 'I',
    jurisdiction: '',
    driverLicenseNumber: '',
    carrierUSDOTNumber: '',
    carrierMotorCarrierNumber: '',
    timeOfInspection: '',
    documentLink: '',
    documents: [],
    outOfServiceIssued: false,
    outOfServiceReleaseDate: '',
    defectRepairNeeded: false
  });
  const [stats, setStats] = useState<InspectionStats>({
    total: 0,
    pass: 0,
    fail: 0,
    warning: 0,
    outOfService: 0
  });
  const [notifications, setNotifications] = useState<ToastNotification[]>([]);
  const notificationIdRef = useRef(0);

  // Fetch vehicles and drivers (using Vehicle model)
  useEffect(() => {
    const fetchVehicles = async () => {
      try {
        const res = await getAllVehicles(1, 1000);
        if (res?.success && res?.data) {
          // Map Vehicle to Vehicle interface format
          const mappedVehicles: Vehicle[] = res.data.map((vehicle: any) => {
            // Extract make and model
            const make = vehicle.make || '';
            const model = vehicle.model || '';
            const makeModel = [make, model].filter(Boolean).join(' ').trim();

            // Use unitNumber, internalId, or plateNumber as identifier
            const identifier = vehicle.plateNumber || vehicle.unitNumber || vehicle.internalId || vehicle._id;

            // Ensure we don't show empty values
            const displayMake = make || identifier;
            const displayModel = model || '';

            return {
              _id: vehicle._id,
              internalId: vehicle.internalId || vehicle.unitNumber,
              plateNumber: vehicle.plateNumber || vehicle.unitNumber || vehicle.internalId || 'N/A',
              licensePlate: vehicle.plateNumber,
              make: displayMake,
              model: displayModel,
              makeModel: makeModel,
              year: vehicle.year
            };
          });
          setVehicles(mappedVehicles);
        }
      } catch (error) {
        console.error('Error fetching vehicles:', error);
      }
    };

    const fetchDrivers = async () => {
      try {
        const res = await listDriver();
        if (res?.success && res?.data) {
          // Filter for drivers only
          const driverList = Array.isArray(res.data)
            ? res.data.filter((d: any) => d.role === 'driver')
            : (res.data?.drivers || []).filter((d: any) => d.role === 'driver');
          setDrivers(driverList);
        }
      } catch (error) {
        console.error('Error fetching drivers:', error);
      }
    };

    fetchVehicles();
    fetchDrivers();
  }, []);

  // Function to refresh inspections and stats
  const refreshData = async (useFilters = true, page = currentPage, limit = pageSize) => {
    try {
      const [inspectionsRes, statsRes] = await Promise.all([
        getCvsaInspections({
          country: activeTab,
          status: useFilters && statusFilter !== 'all' ? statusFilter : undefined,
          search: useFilters && searchQuery ? searchQuery : undefined,
          page: page,
          limit: limit
        }),
        getCvsaInspectionStats(activeTab)
      ]);

      if (inspectionsRes?.success) {
        setInspections(inspectionsRes.data || []);

        // Update pagination info
        if (inspectionsRes?.pagination) {
          setTotal(inspectionsRes.pagination.total || 0);
          setTotalPages(inspectionsRes.pagination.totalPages || 0);
          setCurrentPage(inspectionsRes.pagination.page || 1);
        }
      }

      if (statsRes?.success) {
        setStats(statsRes.data || {
          total: 0,
          pass: 0,
          fail: 0,
          warning: 0,
          outOfService: 0
        });
      }
    } catch (error) {
      console.error('Error refreshing data:', error);
    }
  };

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
  }, [filteredInspections, currentPage]);

  // Fetch inspections and stats when filters change
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Reset to page 1 when filters change
        setCurrentPage(1);
        await refreshData(true, 1, pageSize);
      } catch (error) {
        console.error('Error fetching inspections:', error);
        addNotification('error', 'Failed to load inspections');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, statusFilter]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentPage(1);
      refreshData(true, 1, pageSize);
    }, 500);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  // Fetch when page or pageSize changes
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        await refreshData(true, currentPage, pageSize);
      } catch (error) {
        console.error('Error fetching inspections:', error);
        addNotification('error', 'Failed to load inspections');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, pageSize]);

  // Filter inspections (already filtered by API, but keep for client-side if needed)
  useEffect(() => {
    setFilteredInspections(inspections);
  }, [inspections]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pass':
        return <FaCheckCircle className="text-green-600" size={20} />;
      case 'fail':
        return <FaTimesCircle className="text-[#A855F7]" size={20} />;
      case 'warning':
        return <FaExclamationTriangle className="text-[#00FFA3]" size={20} />;
      case 'out-of-service':
        return <FaBan className="text-red-800" size={20} />;
      default:
        return <FaClipboardCheck className="text-secondary" size={20} />;
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'pass':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'fail':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'out-of-service':
        return 'bg-red-200 text-red-900 border-red-300';
      default:
        return 'bg-card text-primary border-theme';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'minor':
        return 'text-[#00FFA3]';
      case 'major':
        return 'text-[#F59E0B]';
      case 'critical':
        return 'text-[#A855F7]';
      default:
        return 'text-secondary';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const handleViewInspection = (inspection: Inspection) => {
    setSelectedInspection(inspection);
    setShowViewModal(true);
  };

  const resetForm = () => {
    setInspectionForm({
      country: 'canada',
      date: '',
      location: '',
      status: 'pass',
      vehicle: '',
      driver: '',
      inspectorName: '',
      violations: [],
      notes: '',
      // New required fields
      reportNumber: '',
      inspectionLevel: 'I',
      jurisdiction: '',
      driverLicenseNumber: '',
      carrierUSDOTNumber: '',
      carrierMotorCarrierNumber: '',
      timeOfInspection: '',
      documentLink: '',
      documents: [] as File[],
      outOfServiceIssued: false,
      outOfServiceReleaseDate: '',
      defectRepairNeeded: false
    });
  };

  const handleAddInspection = () => {
    resetForm();
    setShowAddModal(true);
  };

  const handleEditInspection = (inspection: Inspection) => {
    setSelectedInspection(inspection);
    setInspectionForm({
      country: inspection.country,
      date: inspection.date ? new Date(inspection.date).toISOString().split('T')[0] : '',
      location: inspection.location,
      status: inspection.status,
      vehicle: typeof inspection.vehicle === 'string' ? inspection.vehicle : inspection.vehicle?._id || '',
      driver: typeof inspection.driver === 'string' ? inspection.driver : inspection.driver?._id || '',
      inspectorName: inspection.inspectorName,
      violations: inspection.violations || [],
      notes: inspection.notes || '',
      // New required fields
      reportNumber: inspection.reportNumber || '',
      inspectionLevel: inspection.inspectionLevel || 'I',
      jurisdiction: inspection.jurisdiction || '',
      driverLicenseNumber: inspection.driverLicenseNumber || '',
      carrierUSDOTNumber: inspection.carrierUSDOTNumber || '',
      carrierMotorCarrierNumber: inspection.carrierMotorCarrierNumber || '',
      timeOfInspection: inspection.timeOfInspection || '',
      documentLink: inspection.documentLink || '',
      documents: [], // Start with empty array for new file uploads; existing documents are preserved on backend
      outOfServiceIssued: inspection.outOfServiceIssued || false,
      outOfServiceReleaseDate: inspection.outOfServiceReleaseDate ? new Date(inspection.outOfServiceReleaseDate).toISOString().split('T')[0] : '',
      defectRepairNeeded: inspection.defectRepairNeeded || false
    });
    setShowEditModal(true);
  };

  const handleDeleteInspection = (inspection: Inspection) => {
    setInspectionToDelete(inspection);
    setShowDeleteModal(true);
  };

  const getVehicleInfo = (vehicle: Inspection['vehicle']): string => {
    if (typeof vehicle === 'string') {
      const v = vehicles.find(v => v._id === vehicle);
      if (v) {
        const plate = v.plateNumber || v.licensePlate || v.internalId || 'N/A';
        const vehicleName = [v.make, v.model].filter(Boolean).join(' ').trim() || v.makeModel || v.internalId || 'Vehicle';
        return `${vehicleName} (${plate})`;
      }
      return '';
    }
    if (vehicle) {
      const make = vehicle.make || '';
      const model = vehicle.model || '';
      const plate = vehicle.plateNumber || vehicle.internalId || 'N/A';
      const vehicleName = [make, model].filter(Boolean).join(' ').trim() || 'Vehicle';
      return `${vehicleName} (${plate})`;
    }
    return '';
  };

  const getDriverName = (driver: Inspection['driver']): string => {
    if (typeof driver === 'string') {
      const d = drivers.find(d => d._id === driver);
      return d ? d.name : '';
    }
    return driver?.name || '';
  };

  const addNotification = (type: NotificationType, message: string) => {
    const id = ++notificationIdRef.current;
    setNotifications((prev) => [...prev, { id, type, message }]);
    // Auto-remove after 5 seconds
    setTimeout(() => {
      removeNotification(id);
    }, 5000);
  };

  const removeNotification = (id: number) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const validateForm = () => {
    return (
      !!inspectionForm.country &&
      !!inspectionForm.location &&
      !!inspectionForm.status &&
      !!inspectionForm.vehicle &&
      !!inspectionForm.driver
    );
  };

  const saveNewInspection = async () => {
    console.log('saveNewInspection called');
    console.log('Form validation:', validateForm());
    console.log('Form data:', inspectionForm);

    if (!validateForm()) {
      addNotification('error', 'Please fill all required fields');
      return;
    }

    setLoading(true);
    try {
      // Create FormData for file uploads
      const formData = new FormData();

      // Add text fields
      formData.append('country', inspectionForm.country || '');
      if (inspectionForm.date) formData.append('date', inspectionForm.date);
      formData.append('location', inspectionForm.location || '');
      formData.append('status', inspectionForm.status || 'pass');
      formData.append('vehicle', typeof inspectionForm.vehicle === 'string' ? inspectionForm.vehicle : (typeof inspectionForm.vehicle === 'object' && inspectionForm.vehicle?._id ? inspectionForm.vehicle._id : ''));
      formData.append('driver', typeof inspectionForm.driver === 'string' ? inspectionForm.driver : (typeof inspectionForm.driver === 'object' && inspectionForm.driver?._id ? inspectionForm.driver._id : ''));
      if (inspectionForm.inspectorName) formData.append('inspectorName', inspectionForm.inspectorName);
      if (inspectionForm.violations && inspectionForm.violations.length > 0) {
        inspectionForm.violations.forEach((v, i) => {
          formData.append(`violations[${i}][code]`, v.code);
          formData.append(`violations[${i}][description]`, v.description);
          formData.append(`violations[${i}][severity]`, v.severity);
        });
      }
      if (inspectionForm.notes) formData.append('notes', inspectionForm.notes);
      if (inspectionForm.reportNumber) formData.append('reportNumber', inspectionForm.reportNumber);
      formData.append('inspectionLevel', inspectionForm.inspectionLevel || 'I');
      if (inspectionForm.jurisdiction) formData.append('jurisdiction', inspectionForm.jurisdiction);
      if (inspectionForm.driverLicenseNumber) formData.append('driverLicenseNumber', inspectionForm.driverLicenseNumber);
      if (inspectionForm.carrierUSDOTNumber) formData.append('carrierUSDOTNumber', inspectionForm.carrierUSDOTNumber);
      if (inspectionForm.carrierMotorCarrierNumber) formData.append('carrierMotorCarrierNumber', inspectionForm.carrierMotorCarrierNumber);
      if (inspectionForm.timeOfInspection) formData.append('timeOfInspection', inspectionForm.timeOfInspection);
      if (inspectionForm.documentLink) formData.append('documentLink', inspectionForm.documentLink);
      formData.append('outOfServiceIssued', String(inspectionForm.outOfServiceIssued || false));
      if (inspectionForm.outOfServiceReleaseDate) formData.append('outOfServiceReleaseDate', inspectionForm.outOfServiceReleaseDate);
      formData.append('defectRepairNeeded', String(inspectionForm.defectRepairNeeded || false));

      // Add multiple files
      if (inspectionForm.documents && Array.isArray(inspectionForm.documents) && inspectionForm.documents.length > 0) {
        inspectionForm.documents.forEach((file) => {
          if (file instanceof File) {
            formData.append('documents', file);
          }
        });
      }

      console.log('Sending FormData with', inspectionForm.documents?.length || 0, 'files');
      const res = await createCvsaInspection(formData);
      console.log('API Response:', res);

      if (res?.success) {
        addNotification('success', res.message || 'Inspection created successfully');
        // Refresh both inspections and stats
        await refreshData(true);
        setShowAddModal(false);
        resetForm();
      } else {
        addNotification('error', res?.message || 'Failed to create inspection');
      }
    } catch (error: any) {
      console.error('Error creating inspection:', error);
      console.error('Error details:', error?.response?.data || error);
      addNotification('error', error?.response?.data?.message || error?.message || 'Failed to create inspection');
    } finally {
      setLoading(false);
    }
  };

  const updateInspection = async () => {
    if (!selectedInspection) return;
    if (!validateForm()) {
      addNotification('error', 'Please fill all required fields');
      return;
    }

    setLoading(true);
    try {
      // Create FormData for file uploads
      const formData = new FormData();

      // Add text fields
      formData.append('country', inspectionForm.country || '');
      if (inspectionForm.date) formData.append('date', inspectionForm.date);
      formData.append('location', inspectionForm.location || '');
      formData.append('status', inspectionForm.status || 'pass');
      formData.append('vehicle', typeof inspectionForm.vehicle === 'string' ? inspectionForm.vehicle : (typeof inspectionForm.vehicle === 'object' && inspectionForm.vehicle?._id ? inspectionForm.vehicle._id : ''));
      formData.append('driver', typeof inspectionForm.driver === 'string' ? inspectionForm.driver : (typeof inspectionForm.driver === 'object' && inspectionForm.driver?._id ? inspectionForm.driver._id : ''));
      if (inspectionForm.inspectorName) formData.append('inspectorName', inspectionForm.inspectorName);
      if (inspectionForm.violations && inspectionForm.violations.length > 0) {
        inspectionForm.violations.forEach((v, i) => {
          formData.append(`violations[${i}][code]`, v.code);
          formData.append(`violations[${i}][description]`, v.description);
          formData.append(`violations[${i}][severity]`, v.severity);
        });
      }
      if (inspectionForm.notes) formData.append('notes', inspectionForm.notes);
      if (inspectionForm.reportNumber) formData.append('reportNumber', inspectionForm.reportNumber);
      formData.append('inspectionLevel', inspectionForm.inspectionLevel || 'I');
      if (inspectionForm.jurisdiction) formData.append('jurisdiction', inspectionForm.jurisdiction);
      if (inspectionForm.driverLicenseNumber) formData.append('driverLicenseNumber', inspectionForm.driverLicenseNumber);
      if (inspectionForm.carrierUSDOTNumber) formData.append('carrierUSDOTNumber', inspectionForm.carrierUSDOTNumber);
      if (inspectionForm.carrierMotorCarrierNumber) formData.append('carrierMotorCarrierNumber', inspectionForm.carrierMotorCarrierNumber);
      if (inspectionForm.timeOfInspection) formData.append('timeOfInspection', inspectionForm.timeOfInspection);
      if (inspectionForm.documentLink) formData.append('documentLink', inspectionForm.documentLink);
      formData.append('outOfServiceIssued', String(inspectionForm.outOfServiceIssued || false));
      if (inspectionForm.outOfServiceReleaseDate) formData.append('outOfServiceReleaseDate', inspectionForm.outOfServiceReleaseDate);
      formData.append('defectRepairNeeded', String(inspectionForm.defectRepairNeeded || false));

      // Add multiple files
      if (inspectionForm.documents && Array.isArray(inspectionForm.documents) && inspectionForm.documents.length > 0) {
        inspectionForm.documents.forEach((file) => {
          if (file instanceof File) {
            formData.append('documents', file);
          }
        });
      }

      const res = await updateCvsaInspection(selectedInspection._id, formData);
      if (res?.success) {
        addNotification('success', res.message || 'Inspection updated successfully');
        // Refresh both inspections and stats
        await refreshData(true);
        setShowEditModal(false);
        setSelectedInspection(null);
        resetForm();
      } else {
        addNotification('error', res?.message || 'Failed to update inspection');
      }
    } catch (error: any) {
      console.error('Error updating inspection:', error);
      addNotification('error', error?.message || 'Failed to update inspection');
    } finally {
      setLoading(false);
    }
  };

  const confirmDelete = async () => {
    if (!inspectionToDelete) return;

    setLoading(true);
    try {
      const res = await deleteCvsaInspection(inspectionToDelete._id);
      if (res?.success) {
        addNotification('success', res.message || 'Inspection deleted successfully');
        // Refresh both inspections and stats
        await refreshData(true);
        setShowDeleteModal(false);
        setInspectionToDelete(null);
      } else {
        addNotification('error', res?.message || 'Failed to delete inspection');
      }
    } catch (error: any) {
      console.error('Error deleting inspection:', error);
      addNotification('error', error?.message || 'Failed to delete inspection');
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({
    title,
    value,
    subtitle,
    icon: Icon,
    onClick,
    bgColor,
    iconColor,
    background
  }: {
    title: string;
    value: number | string;
    subtitle?: string;
    icon: React.ReactNode;
    onClick?: () => void;
    bgColor: string;
    iconColor: string;
    background?: string;
  }) => {
    return (
      <div
        onClick={onClick}
        className={`bg-[${background}]/20 rounded-lg p-3 shadow-sm hover:shadow-md transition-all cursor-pointer border border-transparent hover:border-[var(--accent-blue)]/20 hover:scale-[1.02] active:scale-[0.98]`}
      >
        <div className="flex items-start justify-between mb-2">
          {/* Left side content */}
          <div className="flex-1">
            <h3 className="text-sm font-bold text-primary mb-1">{title}</h3>
            <div className="flex items-baseline gap-2 mb-0.5">
              <span className="text-xl font-bold text-primary">{value}</span>
            </div>
            {subtitle && <p className="text-xs text-secondary">{subtitle}</p>}
          </div>

          {/* Right side icon */}
          <div className={`${bgColor} rounded-lg p-2 shadow-sm`}>
            {/* Render the icon directly if it's an element, or as component if passed as ref */}
            {React.isValidElement(Icon) ? React.cloneElement(Icon as React.ReactElement<any>, { className: iconColor, size: 21 }) : null}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen pb-10 bg-main" >
      {/* Toast Notifications Container - High z-index to be above modal */}
      <div className="fixed top-4 right-4 z-[10002] flex flex-col gap-3 max-w-md">
        {notifications.map(notification => (
          <ToastNotification
            key={notification.id}
            notification={notification}
            onClose={removeNotification}
          />
        ))}
      </div>

      <div className="relative w-full mx-auto p-2">


        {/* Main content */}
        <div className="relative z-10 px-4 pt-3 pb-6">
          {/* Header Section */}
          <div className="mb-4 relative z-10">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-headings">CVSA Inspection Management</h1>
                <div className="flex items-center gap-2 text-secondary">
                  <span className="text-xs">Compliance / CVSA Inspections</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {/* Country Toggle */}
                <div className="bg-card rounded-lg p-1 flex border border-white/20">
                  <button
                    onClick={() => setActiveTab('canada')}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all
      ${activeTab === 'canada'
                        ? 'bg-card shadow-sm'
                        : 'hover:bg-black/5'
                      }`}
                  >
                    <FaFlag
                      size={12}
                      className={activeTab === 'canada' ? 'text-red-500' : 'text-secondary'}
                    />

                    <span
                      className={
                        activeTab === 'canada'
                          ? 'bg-clip-text text-transparent'
                          : 'text-secondary'
                      }
                      style={
                        activeTab === 'canada'
                          ? {
                            color: 'var(--accent-navyblue)',
                          }
                          : {}
                      }
                    >
                      Canada
                    </span>
                  </button>

                  <button
                    onClick={() => setActiveTab('usa')}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all
      ${activeTab === 'usa'
                        ? 'bg-card shadow-sm'
                        : 'hover:bg-black/5'
                      }`}
                  >
                    <FaFlagUsa
                      size={12}
                      className={activeTab === 'usa' ? 'text-blue-500' : 'text-secondary'}
                    />

                    <span
                      className={
                        activeTab === 'usa'
                          ? 'bg-clip-text text-transparent'
                          : 'text-secondary'
                      }
                      style={
                        activeTab === 'usa'
                          ? {
                            color: 'var(--accent-navyblue)',
                          }
                          : {}
                      }
                    >
                      USA
                    </span>
                  </button>
                </div>



                <button
                  onClick={handleAddInspection}

                  className="flex items-center gap-2 px-4 py-2  !text-white rounded-lg shadow-sm  transition-colors font-medium text-sm bg-[var(--accent-navyblue)] hover:bg-[var(--accent-navyblue)]/80"
                >
                  + Add Inspection
                </button>
              </div>
            </div>
          </div>

          {/* Stats Cards - Matching Dispatch Grid */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3 -mt-2 mb-6">
            <StatCard
              title="Total"
              value={stats.total}
              icon={<FaClipboardCheck />}
              bgColor="b"
              iconColor="text-[var(--accent-blue)]"
              background="var(--accent-blue)"
            />
            <StatCard
              title="Passed"
              value={stats.pass}
              icon={<FaCheckCircle />}
              bgColor=""
              iconColor="text-[var(--accent-green)]"
              background="var(--accent-green)"
            />
            <StatCard
              title="Failed"
              value={stats.fail}
              icon={<FaTimesCircle />}
              bgColor="b"
              iconColor="text-[var(--accent-purple)]"
              background="var(--accent-purple)"
            />
            <StatCard
              title="Warning"
              value={stats.warning}
              icon={<FaExclamationTriangle />}
              bgColor="b"
              iconColor="text-[var(--accent-green)]"
              background="var(--accent-green)"
            />
            <StatCard
              title="Out of Svc"
              value={stats.outOfService}
              icon={<FaBan />}
              bgColor="b"
              iconColor="text-[var(--accent-red)]"
              background="var(--accent-red)"
            />
          </div>
        </div>
      </div>

      {/* Main Content Area (Filters + Table) moved inside the container for spacing */}
      <div className="w-full mx-auto px-4 -mt-4">


        {/* Filters and Search */}
        <div className="bg-card rounded-lg shadow-sm border border-theme p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            <div className="flex flex-col md:flex-row gap-4 flex-1">
              <div className="flex-1">
                <div className="relative">
                  <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-secondary" size={16} />
                  <input
                    type="text"
                    placeholder="Search inspections..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-[var(--accent-color)] focus:border-transparent"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <FaFilter className="text-secondary" size={16} />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 text-sm border border-theme rounded-lg
  bg-[var(--bg-card)] text-[var(--text-primary)]
  focus:ring-2 focus:ring-[var(--accent-blue)]
  focus:border-[var(--accent-blue)]
  outline-none cursor-pointer transition-all"
                >
                  <option value="all" className="bg-[var(--bg-card)] text-[var(--text-primary)]">
                    All Status
                  </option>

                  <option value="pass" className="bg-[var(--bg-card)] text-[var(--text-primary)]">
                    Pass
                  </option>

                  <option value="fail" className="bg-[var(--bg-card)] text-[var(--text-primary)]">
                    Fail
                  </option>

                  <option value="warning" className="bg-[var(--bg-card)] text-[var(--text-primary)]">
                    Warning
                  </option>

                  <option value="out-of-service" className="bg-[var(--bg-card)] text-[var(--text-primary)]">
                    Out of Service
                  </option>
                </select>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-secondary">Items per page:</label>
              <select
                value={pageSize}
                onChange={(e) => {
                  const newSize = parseInt(e.target.value);
                  setPageSize(newSize);
                  setCurrentPage(1);
                }}
                className="px-3 py-2 text-sm border border-theme rounded-lg
  bg-[var(--bg-card)] text-[var(--text-primary)]
  focus:ring-2 focus:ring-[var(--accent-blue)]
  focus:border-[var(--accent-blue)]
  outline-none cursor-pointer transition-all"
              >
                <option value={10} className="bg-[var(--bg-card)] text-[var(--text-primary)]">
                  10
                </option>

                <option value={20} className="bg-[var(--bg-card)] text-[var(--text-primary)]">
                  20
                </option>

                <option value={50} className="bg-[var(--bg-card)] text-[var(--text-primary)]">
                  50
                </option>

                <option value={100} className="bg-[var(--bg-card)] text-[var(--text-primary)]">
                  100
                </option>
              </select>
            </div>
          </div>
        </div>

        {/* Inspections Table */}
        <div className="bg-card rounded-lg shadow-sm border border-theme overflow-hidden">
          <div className="px-6 py-4 border-b border-theme">
            <h3 className="text-lg font-bold text-headings">
              {activeTab.toUpperCase()} Inspections ({total > 0 ? total : filteredInspections.length})
            </h3>
          </div>

          {loading ? (
            <div className="text-center py-16">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--accent-color)] mx-auto mb-4"></div>
              <p className="text-xl font-semibold text-secondary">Loading inspections...</p>
            </div>
          ) : filteredInspections.length === 0 ? (
            <div className="text-center py-16">
              <FaClipboardCheck size={64} className="mx-auto mb-4 text-gray-300" />
              <p className="text-xl font-semibold text-secondary">No inspections found</p>
              <p className="text-secondary mt-2">Try adjusting your filters or search criteria</p>
            </div>
          ) : (
            <>
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
              <div className="relative">
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
                  <table className="w-full min-w-[1200px]">
                    <thead className="bg-card">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-headings uppercase tracking-wider sticky left-0 bg-card z-10">
                          Inspection ID
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-headings uppercase tracking-wider">
                          Date
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-headings uppercase tracking-wider">
                          Location
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-headings uppercase tracking-wider">
                          Country
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-headings uppercase tracking-wider">
                          Vehicle
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-headings uppercase tracking-wider">
                          Driver
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-headings uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-headings uppercase tracking-wider">
                          Inspector
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-headings uppercase tracking-wider">
                          Report #
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-headings uppercase tracking-wider">
                          Level
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-headings uppercase tracking-wider">
                          Jurisdiction
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-headings uppercase tracking-wider">
                          USDOT #
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-headings uppercase tracking-wider">
                          OOS Issued
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-headings uppercase tracking-wider">
                          Violations
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-headings uppercase tracking-wider sticky right-0 bg-card z-10">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-card divide-y divide-theme divide-white/5">
                      {filteredInspections.map((inspection) => (
                        <tr
                          key={inspection._id}
                          className="hover:bg-[rgba(255,255,255,0.03)] cursor-pointer"
                          onClick={() => handleViewInspection(inspection)}
                        >
                          <td className="px-4 py-3 whitespace-nowrap sticky left-0 bg-card z-10">
                            <div className="text-sm font-medium text-secondary">
                              {inspection.inspectionId || 'N/A'}
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="text-sm text-secondary">
                              <div className="flex items-center gap-1">
                                <FaCalendarAlt className="text-secondary" size={12} />
                                {inspection.date ? formatDate(inspection.date) : 'N/A'}
                              </div>
                              {inspection.timeOfInspection && (
                                <div className="text-xs text-secondary mt-1">
                                  {inspection.timeOfInspection}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-sm text-secondary max-w-[200px] truncate" title={inspection.location || 'N/A'}>
                              <div className="flex items-center gap-1">
                                <FaMapMarkerAlt className="text-secondary flex-shrink-0" size={12} />
                                {inspection.location || 'N/A'}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="text-sm text-secondary uppercase">
                              {inspection.country === 'canada' ? (
                                <span className="flex items-center gap-1">
                                  <FaFlag className="text-[#A855F7]" size={14} />
                                  CA
                                </span>
                              ) : (
                                <span className="flex items-center gap-1">
                                  <FaFlagUsa className="text-[#00D1FF]" size={14} />
                                  USA
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-sm text-secondary max-w-[180px]">
                              <div className="font-medium truncate" title={getVehicleInfo(inspection.vehicle)}>
                                {getVehicleInfo(inspection.vehicle) || 'N/A'}
                              </div>
                              {typeof inspection.vehicle === 'object' && inspection.vehicle?.internalId && (
                                <div className="text-xs text-secondary">
                                  ID: {inspection.vehicle.internalId}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-sm text-secondary max-w-[150px]">
                              <div className="truncate" title={getDriverName(inspection.driver)}>
                                {getDriverName(inspection.driver) || 'N/A'}
                              </div>
                              {inspection.driverLicenseNumber && (
                                <div className="text-xs text-secondary">
                                  DL: {inspection.driverLicenseNumber}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              {getStatusIcon(inspection.status)}
                              <span className={`text-xs px-2 py-1 rounded-full font-medium border ${getStatusBadgeColor(inspection.status)}`}>
                                {inspection.status.replace('-', ' ').toUpperCase()}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-sm text-secondary max-w-[150px] truncate" title={inspection.inspectorName || 'N/A'}>
                              {inspection.inspectorName || 'N/A'}
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="text-sm text-secondary">
                              {inspection.reportNumber || 'N/A'}
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="text-sm font-medium text-secondary">
                              {inspection.inspectionLevel ? `Level ${inspection.inspectionLevel}` : 'N/A'}
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="text-sm text-secondary">
                              {inspection.jurisdiction || 'N/A'}
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="text-sm text-secondary">
                              {inspection.carrierUSDOTNumber || 'N/A'}
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="text-sm">
                              {inspection.outOfServiceIssued ? (
                                <span className="text-[#A855F7] font-medium">Yes</span>
                              ) : (
                                <span className="text-secondary">No</span>
                              )}
                              {inspection.outOfServiceReleaseDate && (
                                <div className="text-xs text-secondary mt-1">
                                  Released: {formatDate(inspection.outOfServiceReleaseDate)}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-sm text-primary">
                              {inspection.violations && inspection.violations.length > 0 ? (
                                <div className="flex flex-col gap-1">
                                  <span className="text-[#A855F7] font-medium">{inspection.violations.length} violation(s)</span>
                                  {inspection.violations.slice(0, 2).map((v, idx) => (
                                    <span key={idx} className="text-xs text-secondary truncate max-w-[150px]" title={v.description}>
                                      {v.code}: {v.description}
                                    </span>
                                  ))}
                                  {inspection.violations.length > 2 && (
                                    <span className="text-xs text-secondary">+{inspection.violations.length - 2} more</span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-secondary">None</span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm font-medium sticky right-0 bg-card z-10" onClick={(e) => e.stopPropagation()}>
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleViewInspection(inspection)}
                                className="text-[var(--accent-color)] hover:text-[var(--accent-dark)] p-2 hover:bg-[var(--accent-soft)] rounded-lg transition-colors"
                                title="View Details"
                              >
                                <FaEye size={16} className="text-headings hover:text-secondary" />
                              </button>
                              <button
                                onClick={() => handleEditInspection(inspection)}
                                className="text-[var(--accent-color)] hover:text-[var(--accent-dark)] p-2 hover:bg-[var(--accent-soft)] rounded-lg transition-colors"
                                title="Edit Inspection"
                              >
                                <FaEdit size={16} className="text-headings hover:text-secondary" />
                              </button>
                              <button
                                onClick={() => handleDeleteInspection(inspection)}
                                className="text-[#A855F7] hover:text-red-800 p-2 hover:bg-red-50 rounded-lg transition-colors"
                                title="Delete Inspection"
                              >
                                <FaTrash size={16} className="text-[var(--accent-red)] hover:text-secondary" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="px-6 py-4 border-t border-theme flex items-center justify-between bg-card">
                  <div className="text-sm text-primary">
                    Showing <span className="font-medium">{(currentPage - 1) * pageSize + 1}</span> to{' '}
                    <span className="font-medium">{Math.min(currentPage * pageSize, total)}</span> of{' '}
                    <span className="font-medium">{total}</span> inspections
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className={`px-3 py-2 rounded-lg border ${currentPage === 1
                        ? 'bg-card text-secondary cursor-not-allowed border-theme'
                        : 'bg-card text-primary hover:bg-[rgba(255,255,255,0.03)] border-theme'
                        }`}
                    >
                      <FaChevronLeft size={14} />
                    </button>

                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum;
                        if (totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (currentPage <= 3) {
                          pageNum = i + 1;
                        } else if (currentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i;
                        } else {
                          pageNum = currentPage - 2 + i;
                        }

                        return (
                          <button
                            key={pageNum}
                            onClick={() => setCurrentPage(pageNum)}
                            className={`px-3 py-2 rounded-lg text-sm font-medium ${currentPage === pageNum
                              ? 'bg-[var(--accent-color)] text-white'
                              : 'bg-card text-primary hover:bg-[rgba(255,255,255,0.03)] border border-theme'
                              }`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                    </div>

                    <button
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                      className={`px-3 py-2 rounded-lg border ${currentPage === totalPages
                        ? 'bg-card text-secondary cursor-not-allowed border-theme'
                        : 'bg-card text-primary hover:bg-[rgba(255,255,255,0.03)] border-theme'
                        }`}
                    >
                      <FaChevronRight size={14} />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* View Inspection Sidebar */}
        {showViewModal && selectedInspection && (
          <>
            <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-[100] transition-all duration-300" onClick={() => setShowViewModal(false)} />
            <div className="fixed top-0 right-0 h-full w-full sm:w-[500px] bg-card shadow-2xl transform transition-transform duration-300 ease-out z-[101] border-l border-theme overflow-y-auto">
              <div className="sticky top-0 bg-card border-b px-4 py-3 z-10">
                <div className="flex justify-between items-center">
                  <h3 className="text-base font-bold text-primary">
                    {selectedInspection.inspectionId}
                  </h3>
                  <button
                    onClick={() => setShowViewModal(false)}
                    className="p-1.5 hover:bg-[rgba(255,255,255,0.03)] rounded transition-colors"
                  >
                    <FaTimesCircle className="text-secondary" size={18} />
                  </button>
                </div>
              </div>

              <div className="p-3 space-y-2">
                {/* Inspection Overview */}
                <div className="bg-card rounded-lg p-3">
                  <h4 className="text-sm font-bold text-primary mb-2">Overview</h4>
                  <div className="grid grid-cols-1 gap-2">
                    <div>
                      <label className="block text-xs font-medium text-secondary mb-0.5">Inspection ID</label>
                      <p className="text-sm font-semibold text-primary">{selectedInspection.inspectionId}</p>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-secondary mb-0.5">Country</label>
                      <p className="text-sm font-semibold text-primary uppercase">{selectedInspection.country}</p>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-secondary mb-0.5">Date</label>
                      <p className="text-sm font-semibold text-primary">{formatDate(selectedInspection.date)}</p>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-secondary mb-0.5">Location</label>
                      <p className="text-sm font-semibold text-primary">{selectedInspection.location}</p>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-secondary mb-0.5">Status</label>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(selectedInspection.status)}
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold border ${getStatusBadgeColor(selectedInspection.status)}`}>
                          {selectedInspection.status.replace('-', ' ').toUpperCase()}
                        </span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-secondary mb-0.5">Inspector</label>
                      <p className="text-sm font-semibold text-primary">{selectedInspection.inspectorName}</p>
                    </div>
                    {selectedInspection.reportNumber && (
                      <div>
                        <label className="block text-xs font-medium text-secondary mb-0.5">Report Number</label>
                        <p className="text-sm font-semibold text-primary">{selectedInspection.reportNumber}</p>
                      </div>
                    )}
                    {selectedInspection.inspectionLevel && (
                      <div>
                        <label className="block text-xs font-medium text-secondary mb-0.5">Inspection Level</label>
                        <p className="text-sm font-semibold text-primary">Level {selectedInspection.inspectionLevel}</p>
                      </div>
                    )}
                    {selectedInspection.jurisdiction && (
                      <div>
                        <label className="block text-xs font-medium text-secondary mb-0.5">Jurisdiction</label>
                        <p className="text-sm font-semibold text-primary">{selectedInspection.jurisdiction}</p>
                      </div>
                    )}
                    {selectedInspection.timeOfInspection && (
                      <div>
                        <label className="block text-xs font-medium text-secondary mb-0.5">Time</label>
                        <p className="text-sm font-semibold text-primary">{selectedInspection.timeOfInspection}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Official Document Information */}
                {(selectedInspection.reportNumber || selectedInspection.inspectionLevel || selectedInspection.jurisdiction || selectedInspection.timeOfInspection) && (
                  <div className="rounded-lg p-3" style={{ backgroundColor: ACCENT_SOFT }}>
                    <h4 className="text-xs font-bold text-primary mb-2">Document Info</h4>
                    <div className="grid grid-cols-1 gap-2">
                      {selectedInspection.reportNumber && (
                        <div>
                          <label className="block text-xs font-medium text-secondary mb-0.5">Report Number</label>
                          <p className="text-sm font-semibold text-primary">{selectedInspection.reportNumber}</p>
                        </div>
                      )}
                      {selectedInspection.inspectionLevel && (
                        <div>
                          <label className="block text-xs font-medium text-secondary mb-0.5">Level</label>
                          <p className="text-sm font-semibold text-primary">Level {selectedInspection.inspectionLevel}</p>
                        </div>
                      )}
                      {selectedInspection.jurisdiction && (
                        <div>
                          <label className="block text-xs font-medium text-secondary mb-0.5">Jurisdiction</label>
                          <p className="text-sm font-semibold text-primary">{selectedInspection.jurisdiction}</p>
                        </div>
                      )}
                      {selectedInspection.timeOfInspection && (
                        <div>
                          <label className="block text-xs font-medium text-secondary mb-0.5">Time</label>
                          <p className="text-sm font-semibold text-primary">{selectedInspection.timeOfInspection}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Driver & Carrier Information */}
                {(selectedInspection.driverLicenseNumber || selectedInspection.carrierUSDOTNumber || selectedInspection.carrierMotorCarrierNumber) && (
                  <div className="rounded-lg p-3">
                    <h4 className="text-xs font-bold text-primary mb-2">Driver & Carrier</h4>
                    <div className="grid grid-cols-1 gap-2">
                      {selectedInspection.driverLicenseNumber && (
                        <div>
                          <label className="block text-xs font-medium text-secondary mb-0.5">DL Number</label>
                          <p className="text-sm font-semibold text-primary">{selectedInspection.driverLicenseNumber}</p>
                        </div>
                      )}
                      {selectedInspection.carrierUSDOTNumber && (
                        <div>
                          <label className="block text-xs font-medium text-secondary mb-0.5">USDOT Number</label>
                          <p className="text-sm font-semibold text-primary">{selectedInspection.carrierUSDOTNumber}</p>
                        </div>
                      )}
                      {selectedInspection.carrierMotorCarrierNumber && (
                        <div>
                          <label className="block text-xs font-medium text-secondary mb-0.5">MC Number</label>
                          <p className="text-sm font-semibold text-primary">{selectedInspection.carrierMotorCarrierNumber}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Out-of-Service Information */}
                {(selectedInspection.outOfServiceIssued || selectedInspection.defectRepairNeeded || selectedInspection.outOfServiceReleaseDate) && (
                  <div className="bg-card rounded-lg p-3">
                    <h4 className="text-xs font-bold text-primary mb-2">OOS Info</h4>
                    <div className="grid grid-cols-1 gap-2">
                      <div>
                        <label className="block text-xs font-medium text-secondary mb-0.5">OOS Issued</label>
                        <p className="text-sm font-semibold text-primary">
                          {selectedInspection.outOfServiceIssued ? (
                            <span className="text-[#A855F7]">Yes</span>
                          ) : (
                            <span className="text-green-600">No</span>
                          )}
                        </p>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-secondary mb-0.5">Repair Needed</label>
                        <p className="text-sm font-semibold text-primary">
                          {selectedInspection.defectRepairNeeded ? (
                            <span className="text-[#A855F7]">Yes</span>
                          ) : (
                            <span className="text-green-600">No</span>
                          )}
                        </p>
                      </div>
                      {selectedInspection.outOfServiceReleaseDate && (
                        <div>
                          <label className="block text-xs font-medium text-secondary mb-0.5">Release Date</label>
                          <p className="text-sm font-semibold text-primary">{formatDate(selectedInspection.outOfServiceReleaseDate)}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Documentation */}
                {(selectedInspection.documentLink || (selectedInspection.documents && selectedInspection.documents.length > 0)) && (
                  <div className="bg-[var(--accent-soft)] rounded-lg p-3">
                    <h4 className="text-xs font-bold text-primary mb-2">Documentation</h4>
                    {selectedInspection.documents && selectedInspection.documents.length > 0 ? (
                      <div className="space-y-2">
                        {selectedInspection.documents.map((doc: any, index: number) => {
                          const documentUrl = doc.signedUrl || doc.documentUrl;
                          const fileName = doc.documentUrl?.split('/').pop() || `Document ${index + 1}`;
                          return (
                            <div key={index}>
                              <label className="block text-xs font-medium text-secondary mb-0.5">Document {index + 1}</label>
                              <a
                                href={documentUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm font-semibold text-[var(--accent-color)] hover:text-[var(--accent-dark)] underline break-all cursor-pointer"
                              >
                                {fileName}
                              </a>
                            </div>
                          );
                        })}
                      </div>
                    ) : selectedInspection.documentLink ? (
                      <div>
                        <label className="block text-xs font-medium text-secondary mb-0.5">Link</label>
                        <a
                          href={selectedInspection.documentLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-semibold text-[var(--accent-color)] hover:text-[var(--accent-dark)] underline break-all cursor-pointer"
                        >
                          {selectedInspection.documentLink}
                        </a>
                      </div>
                    ) : null}
                  </div>
                )}

                {/* Vehicle & Driver Info */}
                <div className="rounded-lg p-3" style={{ backgroundColor: ACCENT_SOFT }}>
                  <h4 className="text-xs font-bold text-primary mb-2">Vehicle & Driver</h4>
                  <div className="grid grid-cols-1 gap-2">
                    <div>
                      <label className="block text-xs font-medium text-secondary mb-0.5">Vehicle</label>
                      <p className="text-sm font-semibold text-primary">{getVehicleInfo(selectedInspection.vehicle)}</p>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-secondary mb-0.5">Driver</label>
                      <p className="text-sm font-semibold text-primary">{getDriverName(selectedInspection.driver)}</p>
                    </div>
                  </div>
                </div>

                {/* Violations */}
                {selectedInspection.violations && selectedInspection.violations.length > 0 && (
                  <div className="bg-card rounded-lg p-3">
                    <h4 className="text-xs font-bold text-primary mb-2">Violations ({selectedInspection.violations.length})</h4>
                    <div className="space-y-2">
                      {selectedInspection.violations.map((violation) => (
                        <div key={violation._id} className="bg-card rounded p-2 border border-red-200">
                          <div className="flex items-start gap-2">
                            <span className="font-mono text-xs bg-card px-1.5 py-0.5 rounded">
                              {violation.code}
                            </span>
                            <span className={`text-xs font-semibold ${getSeverityColor(violation.severity)}`}>
                              {violation.severity.toUpperCase()}
                            </span>
                          </div>
                          <p className="text-xs text-primary mt-1">{violation.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Notes */}
                {selectedInspection.notes && (
                  <div className="bg-card rounded-lg p-3">
                    <h4 className="text-xs font-bold text-primary mb-2">Notes</h4>
                    <p className="text-xs text-primary">{selectedInspection.notes}</p>
                  </div>
                )}
              </div>

              <div className="sticky bottom-0 bg-card px-3 py-2 flex justify-end gap-2 border-t">
                <button
                  onClick={() => setShowViewModal(false)}
                  className="px-4 py-1.5 text-xs bg-card border border-theme text-primary rounded hover:bg-[rgba(255,255,255,0.03)] font-medium transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </>
        )}

        {/* Add Inspection Sidebar Panel */}
        {showAddModal && (
          <>
            <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-[100] transition-all duration-500" onClick={() => setShowAddModal(false)} />
            <div className="fixed top-0 right-0 h-full w-full sm:w-[90vw] lg:w-[80vw] xl:w-[70vw] bg-card shadow-2xl transform transition-transform duration-500 ease-out z-[101] border-l border-theme">
              <div className="h-full flex flex-col">
                <div className="flex-shrink-0 px-6 py-4 flex items-center justify-between bg-[var(--accent-navyblue)]">
                  <h3 className="text-xl font-bold text-white">Add Inspection</h3>
                  <button onClick={() => setShowAddModal(false)} className="text-white hover:bg-card/20 p-2 rounded-lg transition-colors">
                    <FaTimes size={20} />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto p-6">
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-primary mb-1">Country <span className="text-red-500">*</span></label>
                        <select
                          value={inspectionForm.country || activeTab}
                          onChange={(e) => setInspectionForm(prev => ({ ...prev, country: e.target.value as 'canada' | 'usa' }))}
                          className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-[var(--accent-color)] focus:border-transparent"
                        >
                          {activeTab === 'canada' ? (
                            <option className='form-option' value="canada">Canada</option>
                          ) : (
                            <option className='form-option' value="usa">USA</option>
                          )}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-primary mb-1">Date</label>
                        <input
                          type="date"
                          value={inspectionForm.date || ''}
                          onChange={(e) => setInspectionForm(prev => ({ ...prev, date: e.target.value }))}
                          className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-[var(--accent-color)] focus:border-transparent"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-primary mb-1">Location <span className="text-red-500">*</span></label>
                        <AddressSearch
                          placeholder="Enter inspection location"
                          value={inspectionForm.location}
                          onAddressSelect={(address) => {
                            setInspectionForm(prev => ({
                              ...prev,
                              location: address.fullAddress
                            }));
                          }}
                          onChange={(value) => {
                            setInspectionForm(prev => ({
                              ...prev,
                              location: value
                            }));
                          }}
                          className="w-full"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-primary mb-1">Status <span className="text-red-500">*</span></label>
                        <select
                          value={inspectionForm.status}
                          onChange={(e) => setInspectionForm(prev => ({ ...prev, status: e.target.value as Inspection['status'] }))}
                          className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-[var(--accent-color)] focus:border-transparent"
                        >
                          <option className='form-option' value="pass">Pass</option>
                          <option className='form-option' value="fail">Fail</option>
                          <option className='form-option' value="warning">Warning</option>
                          <option className='form-option' value="out-of-service">Out of Service</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-primary mb-1">Inspector</label>
                        <input
                          type="text"
                          placeholder="Inspector name"
                          value={inspectionForm.inspectorName || ''}
                          onChange={(e) => setInspectionForm(prev => ({ ...prev, inspectorName: e.target.value }))}
                          className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-[var(--accent-color)] focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-primary mb-1">Driver <span className="text-red-500">*</span></label>
                        <select
                          value={typeof inspectionForm.driver === 'string' ? inspectionForm.driver : inspectionForm.driver?._id || ''}
                          onChange={(e) => setInspectionForm(prev => ({ ...prev, driver: e.target.value }))}
                          className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-[var(--accent-color)] focus:border-transparent"
                        >
                          <option className='form-option' value="">Select Driver</option>
                          {drivers.map((driver) => (
                            <option className='form-option' key={driver._id} value={driver._id}>{driver.name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-primary mb-1">Vehicle <span className="text-red-500">*</span></label>
                        <select
                          value={typeof inspectionForm.vehicle === 'string' ? inspectionForm.vehicle : inspectionForm.vehicle?._id || ''}
                          onChange={(e) => setInspectionForm(prev => ({ ...prev, vehicle: e.target.value }))}
                          className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-[var(--accent-color)] focus:border-transparent"
                        >
                          <option className='form-option' value="">Select Vehicle</option>
                          {vehicles.map((vehicle) => (
                            <option className='form-option' key={vehicle._id} value={vehicle._id}>
                              {(() => {
                                const vehicleName = [vehicle.make, vehicle.model].filter(Boolean).join(' ').trim() || vehicle.makeModel || 'Vehicle';
                                const identifier = vehicle.plateNumber || vehicle.licensePlate || vehicle.internalId || 'N/A';
                                return `${vehicleName} (${identifier})`;
                              })()}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-primary mb-1">Notes</label>
                        <textarea
                          placeholder="Additional notes"
                          value={inspectionForm.notes || ''}
                          onChange={(e) => setInspectionForm(prev => ({ ...prev, notes: e.target.value }))}
                          className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-[var(--accent-color)] focus:border-transparent"
                          rows={3}
                        />
                      </div>
                    </div>

                    {/* Official Document Numbers Section */}
                    <div className="border-t pt-6 mt-6">
                      <h4 className="text-lg font-bold text-primary mb-4">Official Document Information</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-primary mb-1">Report Number <span className="text-red-500">*</span></label>
                          <input
                            type="text"
                            placeholder="Inspection Report Number"
                            value={inspectionForm.reportNumber || ''}
                            onChange={(e) => setInspectionForm(prev => ({ ...prev, reportNumber: e.target.value }))}
                            className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-[var(--accent-color)] focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-primary mb-1">Inspection Level</label>
                          <select
                            value={inspectionForm.inspectionLevel || 'I'}
                            onChange={(e) => setInspectionForm(prev => ({ ...prev, inspectionLevel: e.target.value as 'I' | 'II' | 'III' | 'IV' | 'V' }))}
                            className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-[var(--accent-color)] focus:border-transparent"
                          >
                            <option className='form-option' value="I">Level I</option>
                            <option className='form-option' value="II">Level II</option>
                            <option className='form-option' value="III">Level III</option>
                            <option className='form-option' value="IV">Level IV</option>
                            <option className='form-option' value="V">Level V</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-primary mb-1">Jurisdiction (State/Province)</label>
                          <input
                            type="text"
                            placeholder="e.g., ON, TX, CA"
                            value={inspectionForm.jurisdiction || ''}
                            onChange={(e) => setInspectionForm(prev => ({ ...prev, jurisdiction: e.target.value }))}
                            className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-[var(--accent-color)] focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-primary mb-1">Time of Inspection</label>
                          <input
                            type="time"
                            value={inspectionForm.timeOfInspection || ''}
                            onChange={(e) => setInspectionForm(prev => ({ ...prev, timeOfInspection: e.target.value }))}
                            className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-[var(--accent-color)] focus:border-transparent"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Driver & Carrier Information Section */}
                    <div className="border-t pt-6 mt-6">
                      <h4 className="text-lg font-bold text-primary mb-4">Driver & Carrier Information</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-primary mb-1">Driver License Number</label>
                          <input
                            type="text"
                            placeholder="Driver's License Number"
                            value={inspectionForm.driverLicenseNumber || ''}
                            onChange={(e) => setInspectionForm(prev => ({ ...prev, driverLicenseNumber: e.target.value }))}
                            className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-[var(--accent-color)] focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-primary mb-1">Carrier USDOT Number</label>
                          <input
                            type="text"
                            placeholder="USDOT Number (USA only)"
                            value={inspectionForm.carrierUSDOTNumber || ''}
                            onChange={(e) => setInspectionForm(prev => ({ ...prev, carrierUSDOTNumber: e.target.value }))}
                            className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-[var(--accent-color)] focus:border-transparent"
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="block text-sm font-medium text-primary mb-1">Carrier MC Number</label>
                          <input
                            type="text"
                            placeholder="Motor Carrier Number (if applicable)"
                            value={inspectionForm.carrierMotorCarrierNumber || ''}
                            onChange={(e) => setInspectionForm(prev => ({ ...prev, carrierMotorCarrierNumber: e.target.value }))}
                            className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-[var(--accent-color)] focus:border-transparent"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Out-of-Service Information Section */}
                    <div className="border-t pt-6 mt-6">
                      <h4 className="text-lg font-bold text-primary mb-4">Out-of-Service Information</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="flex items-center gap-2 text-sm font-medium text-primary mb-1">
                            <input
                              type="checkbox"
                              checked={inspectionForm.outOfServiceIssued || false}
                              onChange={(e) => setInspectionForm(prev => ({ ...prev, outOfServiceIssued: e.target.checked }))}
                              className="rounded border-theme text-[var(--accent-color)] focus:ring-[var(--accent-color)]"
                            />
                            Out-of-Service Order Issued
                          </label>
                        </div>
                        <div>
                          <label className="flex items-center gap-2 text-sm font-medium text-primary mb-1">
                            <input
                              type="checkbox"
                              checked={inspectionForm.defectRepairNeeded || false}
                              onChange={(e) => setInspectionForm(prev => ({ ...prev, defectRepairNeeded: e.target.checked }))}
                              className="rounded border-theme text-[var(--accent-color)] focus:ring-[var(--accent-color)]"
                            />
                            Defect Repair Needed
                          </label>
                        </div>
                        {inspectionForm.outOfServiceIssued && (
                          <div className="col-span-2">
                            <label className="block text-sm font-medium text-primary mb-1">Out-of-Service Release Date</label>
                            <input
                              type="date"
                              value={inspectionForm.outOfServiceReleaseDate || ''}
                              onChange={(e) => setInspectionForm(prev => ({ ...prev, outOfServiceReleaseDate: e.target.value }))}
                              className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-[var(--accent-color)] focus:border-transparent"
                            />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Document Link Section */}
                    <div className="border-t pt-6 mt-6">
                      <h4 className="text-lg font-bold text-primary mb-4">Documentation</h4>
                      <div>
                        <label className="block text-sm font-medium text-primary mb-1">Upload Documents (PDF/Image) - Multiple files allowed</label>
                        <input
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png,.gif"
                          multiple
                          onChange={(e) => {
                            const files = Array.from(e.target.files || []);
                            if (files.length > 0) {
                              setInspectionForm(prev => ({
                                ...prev,
                                documents: [...(prev.documents || []), ...files] as File[]
                              }));
                            }
                          }}
                          className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-[var(--accent-color)] focus:border-transparent file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-[var(--accent-soft)] file:text-[var(--accent-color)] hover:file:bg-purple-100 cursor-pointer"
                        />
                        {inspectionForm.documents && inspectionForm.documents.length > 0 && (
                          <div className="mt-3 space-y-2">
                            <p className="text-sm font-medium text-primary">Selected files ({inspectionForm.documents.length}):</p>
                            <div className="space-y-1">
                              {inspectionForm.documents.map((file, index) => (
                                <div key={index} className="flex items-center justify-between p-2 bg-card rounded-lg">
                                  <span className="text-sm text-primary">{file instanceof File ? file.name : 'Unknown file'}</span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setInspectionForm(prev => ({
                                        ...prev,
                                        documents: (prev.documents || []).filter((_, i) => i !== index) as File[]
                                      }));
                                    }}
                                    className="text-[#A855F7] hover:text-red-800 text-sm font-medium"
                                  >
                                    Remove
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {inspectionForm.documentLink && !inspectionForm.documentLink.startsWith('blob:') && (
                          <p className="mt-2 text-sm text-secondary">
                            Current document: <a href={inspectionForm.documentLink} target="_blank" rel="noopener noreferrer" className="text-purple-600 hover:underline">{inspectionForm.documentLink}</a>
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex-shrink-0 bg-card px-6 py-4 flex justify-end gap-3 border-t">
                  <button type="button" onClick={() => setShowAddModal(false)} className="px-6 py-2.5 bg-card border border-theme text-primary rounded-lg hover:bg-[rgba(255,255,255,0.03)] font-medium transition-colors">Cancel</button>
                  <button type="button" onClick={saveNewInspection} className="px-6 py-2.5 bg-[var(--accent-navyblue)] !text-white rounded-lg hover:bg-[var(--accent-navyblue)]/80 font-medium transition-colors disabled:opacity-60" disabled={!validateForm() || loading}>
                    {loading ? 'Saving...' : 'Save Inspection'}
                  </button>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Edit Inspection Sidebar Panel */}
        {showEditModal && selectedInspection && (
          <>
            <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-[100] transition-all duration-500" onClick={() => setShowEditModal(false)} />
            <div className="fixed top-0 right-0 h-full w-full sm:w-[90vw] lg:w-[80vw] xl:w-[70vw] bg-card shadow-2xl transform transition-transform duration-500 ease-out z-[101] border-l border-theme">
              <div className="h-full flex flex-col">
                <div className="flex-shrink-0  px-6 py-4 flex items-center justify-between bg-[var(--accent-navyblue)]">
                  <h3 className="text-xl font-bold text-white">Edit Inspection: {selectedInspection.inspectionId}</h3>
                  <button onClick={() => setShowEditModal(false)} className="text-white hover:bg-card/20 p-2 rounded-lg transition-colors">
                    <FaTimes size={20} />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto p-6">
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-primary mb-1">Country <span className="text-red-500">*</span></label>
                        <select
                          value={inspectionForm.country || (selectedInspection?.country || activeTab)}
                          onChange={(e) => setInspectionForm(prev => ({ ...prev, country: e.target.value as 'canada' | 'usa' }))}
                          className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-[var(--accent-color)] focus:border-transparent"
                        >
                          {(inspectionForm.country || selectedInspection?.country || activeTab) === 'canada' ? (
                            <option value="canada">Canada</option>
                          ) : (
                            <option value="usa">USA</option>
                          )}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-primary mb-1">Date</label>
                        <input type="date" value={inspectionForm.date || ''} onChange={(e) => setInspectionForm(prev => ({ ...prev, date: e.target.value }))} className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-[var(--accent-color)] focus:border-transparent" />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-primary mb-1">Location <span className="text-red-500">*</span></label>
                        <input type="text" value={inspectionForm.location || ''} onChange={(e) => setInspectionForm(prev => ({ ...prev, location: e.target.value }))} className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-[var(--accent-color)] focus:border-transparent" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-primary mb-1">Status <span className="text-red-500">*</span></label>
                        <select value={inspectionForm.status} onChange={(e) => setInspectionForm(prev => ({ ...prev, status: e.target.value as Inspection['status'] }))} className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-[var(--accent-color)] focus:border-transparent">
                          <option value="pass">Pass</option>
                          <option value="fail">Fail</option>
                          <option value="warning">Warning</option>
                          <option value="out-of-service">Out of Service</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-primary mb-1">Inspector</label>
                        <input type="text" value={inspectionForm.inspectorName || ''} onChange={(e) => setInspectionForm(prev => ({ ...prev, inspectorName: e.target.value }))} className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-[var(--accent-color)] focus:border-transparent" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-primary mb-1">Driver <span className="text-red-500">*</span></label>
                        <select
                          value={typeof inspectionForm.driver === 'string' ? inspectionForm.driver : inspectionForm.driver?._id || ''}
                          onChange={(e) => setInspectionForm(prev => ({ ...prev, driver: e.target.value }))}
                          className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-[var(--accent-color)] focus:border-transparent"
                        >
                          <option value="">Select Driver</option>
                          {drivers.map((driver) => (
                            <option key={driver._id} value={driver._id}>{driver.name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-primary mb-1">Vehicle <span className="text-red-500">*</span></label>
                        <select
                          value={typeof inspectionForm.vehicle === 'string' ? inspectionForm.vehicle : inspectionForm.vehicle?._id || ''}
                          onChange={(e) => setInspectionForm(prev => ({ ...prev, vehicle: e.target.value }))}
                          className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-[var(--accent-color)] focus:border-transparent"
                        >
                          <option value="">Select Vehicle</option>
                          {vehicles.map((vehicle) => (
                            <option key={vehicle._id} value={vehicle._id}>
                              {(() => {
                                const vehicleName = [vehicle.make, vehicle.model].filter(Boolean).join(' ').trim() || vehicle.makeModel || 'Vehicle';
                                const identifier = vehicle.plateNumber || vehicle.licensePlate || vehicle.internalId || 'N/A';
                                return `${vehicleName} (${identifier})`;
                              })()}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-primary mb-1">Notes</label>
                        <textarea value={inspectionForm.notes || ''} onChange={(e) => setInspectionForm(prev => ({ ...prev, notes: e.target.value }))} className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-[var(--accent-color)] focus:border-transparent" rows={3} />
                      </div>
                    </div>

                    {/* Official Document Numbers Section */}
                    <div className="border-t pt-6 mt-6">
                      <h4 className="text-lg font-bold text-primary mb-4">Official Document Information</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-primary mb-1">Report Number <span className="text-red-500">*</span></label>
                          <input
                            type="text"
                            placeholder="Inspection Report Number"
                            value={inspectionForm.reportNumber || ''}
                            onChange={(e) => setInspectionForm(prev => ({ ...prev, reportNumber: e.target.value }))}
                            className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-[var(--accent-color)] focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-primary mb-1">Inspection Level</label>
                          <select
                            value={inspectionForm.inspectionLevel || 'I'}
                            onChange={(e) => setInspectionForm(prev => ({ ...prev, inspectionLevel: e.target.value as 'I' | 'II' | 'III' | 'IV' | 'V' }))}
                            className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-[var(--accent-color)] focus:border-transparent"
                          >
                            <option value="I">Level I</option>
                            <option value="II">Level II</option>
                            <option value="III">Level III</option>
                            <option value="IV">Level IV</option>
                            <option value="V">Level V</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-primary mb-1">Jurisdiction (State/Province)</label>
                          <input
                            type="text"
                            placeholder="e.g., ON, TX, CA"
                            value={inspectionForm.jurisdiction || ''}
                            onChange={(e) => setInspectionForm(prev => ({ ...prev, jurisdiction: e.target.value }))}
                            className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-[var(--accent-color)] focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-primary mb-1">Time of Inspection</label>
                          <input
                            type="time"
                            value={inspectionForm.timeOfInspection || ''}
                            onChange={(e) => setInspectionForm(prev => ({ ...prev, timeOfInspection: e.target.value }))}
                            className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-[var(--accent-color)] focus:border-transparent"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Driver & Carrier Information Section */}
                    <div className="border-t pt-6 mt-6">
                      <h4 className="text-lg font-bold text-primary mb-4">Driver & Carrier Information</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-primary mb-1">Driver License Number</label>
                          <input
                            type="text"
                            placeholder="Driver's License Number"
                            value={inspectionForm.driverLicenseNumber || ''}
                            onChange={(e) => setInspectionForm(prev => ({ ...prev, driverLicenseNumber: e.target.value }))}
                            className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-[var(--accent-color)] focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-primary mb-1">Carrier USDOT Number</label>
                          <input
                            type="text"
                            placeholder="USDOT Number (USA only)"
                            value={inspectionForm.carrierUSDOTNumber || ''}
                            onChange={(e) => setInspectionForm(prev => ({ ...prev, carrierUSDOTNumber: e.target.value }))}
                            className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-[var(--accent-color)] focus:border-transparent"
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="block text-sm font-medium text-primary mb-1">Carrier MC Number</label>
                          <input
                            type="text"
                            placeholder="Motor Carrier Number (if applicable)"
                            value={inspectionForm.carrierMotorCarrierNumber || ''}
                            onChange={(e) => setInspectionForm(prev => ({ ...prev, carrierMotorCarrierNumber: e.target.value }))}
                            className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-[var(--accent-color)] focus:border-transparent"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Out-of-Service Information Section */}
                    <div className="border-t pt-6 mt-6">
                      <h4 className="text-lg font-bold text-primary mb-4">Out-of-Service Information</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="flex items-center gap-2 text-sm font-medium text-primary mb-1">
                            <input
                              type="checkbox"
                              checked={inspectionForm.outOfServiceIssued || false}
                              onChange={(e) => setInspectionForm(prev => ({ ...prev, outOfServiceIssued: e.target.checked }))}
                              className="rounded border-theme text-[var(--accent-color)] focus:ring-[var(--accent-color)]"
                            />
                            Out-of-Service Order Issued
                          </label>
                        </div>
                        <div>
                          <label className="flex items-center gap-2 text-sm font-medium text-primary mb-1">
                            <input
                              type="checkbox"
                              checked={inspectionForm.defectRepairNeeded || false}
                              onChange={(e) => setInspectionForm(prev => ({ ...prev, defectRepairNeeded: e.target.checked }))}
                              className="rounded border-theme text-[var(--accent-color)] focus:ring-[var(--accent-color)]"
                            />
                            Defect Repair Needed
                          </label>
                        </div>
                        {inspectionForm.outOfServiceIssued && (
                          <div className="col-span-2">
                            <label className="block text-sm font-medium text-primary mb-1">Out-of-Service Release Date</label>
                            <input
                              type="date"
                              value={inspectionForm.outOfServiceReleaseDate || ''}
                              onChange={(e) => setInspectionForm(prev => ({ ...prev, outOfServiceReleaseDate: e.target.value }))}
                              className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-[var(--accent-color)] focus:border-transparent"
                            />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Document Link Section */}
                    <div className="border-t pt-6 mt-6">
                      <h4 className="text-lg font-bold text-primary mb-4">Documentation</h4>
                      <div>
                        <label className="block text-sm font-medium text-primary mb-1">Upload Documents (PDF/Image) - Multiple files allowed</label>
                        <input
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png,.gif"
                          multiple
                          onChange={(e) => {
                            const files = Array.from(e.target.files || []);
                            if (files.length > 0) {
                              setInspectionForm(prev => ({
                                ...prev,
                                documents: [...(prev.documents || []), ...files] as File[]
                              }));
                            }
                          }}
                          className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-[var(--accent-color)] focus:border-transparent file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-[var(--accent-soft)] file:text-[var(--accent-color)] hover:file:bg-purple-100 cursor-pointer"
                        />
                        {inspectionForm.documents && inspectionForm.documents.length > 0 && (
                          <div className="mt-3 space-y-2">
                            <p className="text-sm font-medium text-primary">Selected files ({inspectionForm.documents.length}):</p>
                            <div className="space-y-1">
                              {inspectionForm.documents.map((file, index) => (
                                <div key={index} className="flex items-center justify-between p-2 bg-card rounded-lg">
                                  <span className="text-sm text-primary">{file instanceof File ? file.name : 'Unknown file'}</span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setInspectionForm(prev => ({
                                        ...prev,
                                        documents: (prev.documents || []).filter((_, i) => i !== index) as File[]
                                      }));
                                    }}
                                    className="text-[#A855F7] hover:text-red-800 text-sm font-medium"
                                  >
                                    Remove
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {inspectionForm.documentLink && !inspectionForm.documentLink.startsWith('blob:') && (
                          <p className="mt-2 text-sm text-secondary">
                            Current document: <a href={inspectionForm.documentLink} target="_blank" rel="noopener noreferrer" className="text-purple-600 hover:underline">{inspectionForm.documentLink}</a>
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex-shrink-0 bg-card px-6 py-4 flex justify-end gap-3 border-t">
                  <button onClick={() => setShowEditModal(false)} className="px-6 py-2.5 bg-card border border-theme text-primary rounded-lg hover:bg-[rgba(255,255,255,0.03)] font-medium transition-colors">Cancel</button>
                  <button onClick={updateInspection} className="px-6 py-2.5 bg-[var(--accent-navyblue)] !text-white rounded-lg hover:bg-[var(--accent-navyblue)]/80 font-medium transition-colors disabled:opacity-60" disabled={!validateForm() || loading}>
                    {loading ? 'Updating...' : 'Update Inspection'}
                  </button>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteModal && inspectionToDelete && (
          <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="bg-card rounded-2xl shadow-2xl w-full max-w-md">
              <div className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-red-100 rounded-full">
                    <FaTimesCircle className="text-[#A855F7]" size={24} />
                  </div>
                  <h3 className="text-lg font-bold text-primary">Delete Inspection</h3>
                </div>
                <p className="text-secondary mb-6">Are you sure you want to delete inspection <span className="font-semibold">{inspectionToDelete.inspectionId}</span>? This action cannot be undone.</p>
                <div className="flex justify-end gap-3">
                  <button onClick={() => { setShowDeleteModal(false); setInspectionToDelete(null); }} className="px-4 py-2 bg-card text-primary rounded-lg hover:bg-gray-200 font-medium transition-colors" disabled={loading}>Cancel</button>
                  <button onClick={confirmDelete} className="px-4 py-2 bg-red-600 !text-white rounded-lg hover:bg-red-700 font-medium transition-colors disabled:opacity-60" disabled={loading}>
                    {loading ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CvsaInspection;
