import React, { useState, useEffect, useRef } from 'react';
import {
  FaExclamationTriangle,
  FaPlus,
  FaEdit,
  FaTrash,
  FaEye,
  FaSearch,
  FaCalendarAlt,
  FaMapMarkerAlt,
  FaUser,
  FaCheckCircle,
  FaTimesCircle,
  FaExclamationCircle,
  FaInfoCircle,
  FaTimes,
  FaChevronLeft,
  FaChevronRight,
  FaFlag,
  FaFlagUsa,
  FaImage,
  FaVideo,
  FaFileAlt,
  FaUpload
} from 'react-icons/fa';
import {
  getIncidents,
  getIncidentStats,
  createIncident,
  updateIncident,
  deleteIncident
} from '../../../../axios/api/admin';
import { createIssue } from '../../../../axios/api/distapcher';
import { getAllVehicles } from '../../../../axios/api/vehicle';
import { getAllTrailers } from '../../../../axios/api/trailer';
import { listDriver } from '../../../../axios/api/distapcher';




// Types
interface ActionTakenLog {
  date: string;
  action: string;
  takenBy: string;
  notes?: string;
}

interface CostTracking {
  category: string;
  estimated: number;
  actual?: number;
  notes?: string;
}

interface Incident {
  _id: string;
  incidentNumber: string;
  incidentDateTime: string;
  location: {
    city: string;
    stateProvince: string;
    country: 'usa' | 'canada';
    streetAddress?: string;
  };
  incidentType: string;
  incidentStatus: 'open' | 'under-review' | 'closed';
  incidentId?: string;
  caseFileNumber?: string;
  supportingMedia?: string[];

  // Personnel Details
  driver: {
    _id: string;
    name?: string;
    email?: string;
  } | string;
  coDriver?: {
    _id: string;
    name?: string;
    email?: string;
  } | string;
  driversLicense?: string;
  reportingParty?: string;

  // Equipment Details
  unitNumber?: string;
  trailerNumber?: string;
  vinPlateNumber?: string;
  damageDescription?: string;

  // Investigation & Follow-up
  actionTakenLog?: ActionTakenLog[];
  preventativeMeasures?: string;
  costTracking?: CostTracking[];
  cvsaDotImpact?: boolean;
  fmcsaReportable?: boolean;
  fmcsaNotes?: string;

  // Additional fields
  description?: string;
  witnessInfo?: string;
  policeReportNumber?: string;
  notes?: string;
  // Accident-related fields
  accidentReport?: string | { fileName: string; signedUrl: string | null };
  accidentPictures?: string[] | Array<{ fileName: string; signedUrl: string | null }>;
  accidentVideo?: string | { fileName: string; signedUrl: string | null };
  createdAt: string;
}

interface Vehicle {
  _id: string;
  unitNo: string;
  internalId?: string;
  licensePlate: string;
  plateNumber?: string;
  makeModel: string;
  make?: string;
  model?: string;
  year?: number;
  vinNo?: string;
  vin?: string;
}

interface Driver {
  _id: string;
  name: string;
  email: string;
  licenseNumber?: string;
}

interface Trailer {
  _id: string;
  trailer: string;
  internalId?: string;
  plateNumber?: string;
}

interface IncidentForm {
  incidentDateTime: string;
  location: {
    city: string;
    stateProvince: string;
    country: 'usa' | 'canada';
    streetAddress?: string;
  };
  incidentType: string;
  incidentStatus: 'open' | 'under-review' | 'closed';
  incidentId?: string;
  caseFileNumber?: string;
  supportingMedia?: string[];
  driver: string;
  coDriver?: string;
  driversLicense?: string;
  reportingParty?: string;
  unitNumber?: string;
  alsoCreateAsAccident?: boolean;
  trailerNumber?: string;
  vinPlateNumber?: string;
  damageDescription?: string;
  description?: string;
  witnessInfo?: string;
  policeReportNumber?: string;
  actionTakenLog?: ActionTakenLog[];
  preventativeMeasures?: string;
  costTracking?: CostTracking[];
  cvsaDotImpact?: boolean;
  fmcsaReportable?: boolean;
  fmcsaNotes?: string;
  notes?: string;
  accidentReport?: File;
  accidentPictures?: File[];
  accidentVideo?: File;
}

// Toast Notification Component
type NotificationType = 'success' | 'error' | 'info';

interface ToastNotification {
  id: number;
  type: NotificationType;
  message: string;
}

const icons = {
  success: <FaCheckCircle className="text-green-600" size={20} />,
  error: <FaExclamationCircle className="text-[#A855F7]" size={20} />,
  info: <FaInfoCircle className="text-[var(--accent-color)]" size={20} />,
};

const ToastNotification: React.FC<ToastNotification & { onRemove: () => void }> = ({ type, message, onRemove }) => {
  return (
    <div className={`fixed top-4 right-4 z-[9999] flex items-center gap-3 bg-card px-6 py-4 rounded-lg shadow-lg border-l-4 ${type === 'success' ? 'border-green-500' : type === 'error' ? 'border-red-500' : 'border-blue-500'} animate-slide-in`}>
      {icons[type]}
      <p className="text-primary font-medium">{message}</p>
      <button onClick={onRemove} className="ml-4 text-secondary hover:text-secondary">
        <FaTimes size={16} />
      </button>
    </div>
  );
};

const Incidents: React.FC = () => {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [trailers, setTrailers] = useState<Trailer[]>([]);
  const [loading, setLoading] = useState(false);

  // Refs for scrollbar synchronization
  const topScrollRef = useRef<HTMLDivElement>(null);
  const bottomScrollRef = useRef<HTMLDivElement>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [locationFilter, setLocationFilter] = useState<string>('all');
  const [driverFilter, setDriverFilter] = useState<string>('all');
  const [countryFilter, setCountryFilter] = useState<'all' | 'canada' | 'usa'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [incidentToDelete, setIncidentToDelete] = useState<Incident | null>(null);

  // Form state
  const [incidentForm, setIncidentForm] = useState<IncidentForm>({
    incidentDateTime: '',
    location: {
      city: '',
      stateProvince: '',
      country: 'usa',
      streetAddress: ''
    },
    incidentType: '',
    incidentStatus: 'open',
    driver: '',
    alsoCreateAsAccident: false // New field for creating accident
  });

  // Notifications
  const [notifications, setNotifications] = useState<ToastNotification[]>([]);
  const notificationIdRef = useRef(0);

  // Stats
  const [stats, setStats] = useState({
    total: 0,
    open: 0,
    underReview: 0,
    closed: 0
  });

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1); // Reset to first page on search
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, typeFilter, locationFilter, driverFilter, countryFilter]);

  useEffect(() => {
    loadDrivers();
    loadVehicles();
    loadTrailers();
    loadStats();
  }, []);

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
  }, [incidents, currentPage]);

  useEffect(() => {
    refreshData();
  }, [statusFilter, typeFilter, locationFilter, driverFilter, countryFilter, debouncedSearch, currentPage, pageSize]);

  const refreshData = async () => {
    setLoading(true);
    try {
      const params: any = {
        page: currentPage,
        limit: pageSize,
        sortBy: 'incidentDateTime',
        sortOrder: 'desc'
      };

      if (statusFilter !== 'all') params.status = statusFilter;
      if (typeFilter !== 'all') params.type = typeFilter;
      if (locationFilter !== 'all') params.location = locationFilter;
      if (driverFilter !== 'all') params.driver = driverFilter;
      if (countryFilter !== 'all') params.country = countryFilter;
      if (debouncedSearch) params.search = debouncedSearch;

      const res = await getIncidents(params);
      if (res && res.success && res.data) {
        setIncidents(res.data);
        if (res.pagination) {
          setTotal(res.pagination.total);
          setTotalPages(res.pagination.totalPages);
          // If current page is beyond total pages, reset to last page
          if (currentPage > res.pagination.totalPages && res.pagination.totalPages > 0) {
            setCurrentPage(res.pagination.totalPages);
          }
        }
      } else {
        setIncidents([]);
        setTotal(0);
        setTotalPages(0);
      }
    } catch (error) {
      console.error('Error fetching incidents:', error);
      addNotification('error', 'Failed to load incidents');
      setIncidents([]);
      setTotal(0);
      setTotalPages(0);
    } finally {
      setLoading(false);
    }
  };

  const loadDrivers = async () => {
    try {
      const res = await listDriver();
      if (res && res.data) {
        setDrivers(res.data);
      }
    } catch (error) {
      console.error('Error loading drivers:', error);
    }
  };

  const loadVehicles = async () => {
    try {
      const res = await getAllVehicles(1, 1000);
      if (res && res.success && res.data) {
        // Map Vehicle to Vehicle format for compatibility
        const mappedVehicles: Vehicle[] = res.data.map((vehicle: any) => {
          const makeModel = [vehicle.make, vehicle.model].filter(Boolean).join(' ').trim();
          return {
            _id: vehicle._id,
            unitNo: vehicle.unitNumber || vehicle.internalId || vehicle.plateNumber || '',
            internalId: vehicle.internalId || vehicle.unitNumber,
            licensePlate: vehicle.plateNumber || '',
            plateNumber: vehicle.plateNumber || vehicle.unitNumber || '',
            makeModel: makeModel,
            make: vehicle.make || '',
            model: vehicle.model || '',
            year: vehicle.year,
            vinNo: vehicle.vinNumber || '',
            vin: vehicle.vinNumber || ''
          };
        });
        setVehicles(mappedVehicles);
      }
    } catch (error) {
      console.error('Error loading vehicles:', error);
    }
  };

  const loadTrailers = async () => {
    try {
      const res = await getAllTrailers(1, 1000);
      if (res && res.success && res.data) {
        // Map Trailer to Trailer format for compatibility
        const mappedTrailers: Trailer[] = res.data.map((trailer: any) => ({
          _id: trailer._id,
          trailer: trailer.unitNumber || trailer.trailer || trailer.internalId || 'Trailer',
          internalId: trailer.internalId || trailer.unitNumber || trailer.trailer,
          plateNumber: trailer.plateNumber || trailer.unitNumber || trailer.trailer || 'N/A'
        }));
        setTrailers(mappedTrailers);
      }
    } catch (error) {
      console.error('Error loading trailers:', error);
    }
  };

  const loadStats = async () => {
    try {
      const res = await getIncidentStats();
      if (res && res.data) {
        setStats(res.data);
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const getDriverName = (driver: Incident['driver']): string => {
    if (!driver) return 'N/A';
    if (typeof driver === 'string') {
      const found = drivers.find(d => d._id === driver);
      return found?.name || driver;
    }
    return driver?.name || 'N/A';
  };

  const getCoDriverName = (coDriver: Incident['coDriver']): string => {
    if (!coDriver) return 'N/A';
    if (typeof coDriver === 'string') {
      const found = drivers.find(d => d._id === coDriver);
      return found?.name || coDriver;
    }
    return coDriver?.name || 'N/A';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'open':
        return <FaExclamationCircle className="text-[#A855F7]" size={20} />;
      case 'under-review':
        return <FaInfoCircle className="text-[#F59E0B]" size={20} />;
      case 'closed':
        return <FaCheckCircle className="text-green-600" size={20} />;
      default:
        return <FaExclamationTriangle className="text-secondary" size={20} />;
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'open':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'under-review':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'closed':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-card text-primary border-theme';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };




  const resetForm = () => {
    setIncidentForm({
      incidentDateTime: '',
      location: {
        city: '',
        stateProvince: '',
        country: 'usa',
        streetAddress: ''
      },
      incidentType: '',
      incidentStatus: 'open',
      driver: '',
      alsoCreateAsAccident: false,
      incidentId: '',
      coDriver: '',
      accidentReport: undefined,
      accidentPictures: [],
      accidentVideo: undefined
    });
  };

  const handleAddIncident = () => {
    resetForm();
    setShowAddModal(true);
  };

  const handleEditIncident = (incident: Incident) => {
    setSelectedIncident(incident);
    setIncidentForm({
      incidentDateTime: incident.incidentDateTime ? new Date(incident.incidentDateTime).toISOString().slice(0, 16) : '',
      location: {
        city: incident.location?.city || '',
        stateProvince: incident.location?.stateProvince || '',
        country: incident.location?.country || 'usa',
        streetAddress: incident.location?.streetAddress || ''
      },
      incidentType: incident.incidentType || '',
      incidentStatus: incident.incidentStatus || 'open',
      incidentId: incident.incidentId || '',
      caseFileNumber: incident.caseFileNumber || '',
      driver: typeof incident.driver === 'string' ? incident.driver : incident.driver?._id || '',
      coDriver: typeof incident.coDriver === 'string' ? incident.coDriver : incident.coDriver?._id || '',
      driversLicense: incident.driversLicense || '',
      reportingParty: incident.reportingParty || '',
      unitNumber: incident.unitNumber || '',
      trailerNumber: incident.trailerNumber || '',
      vinPlateNumber: incident.vinPlateNumber || '',
      damageDescription: incident.damageDescription || '',
      description: incident.description || '',
      witnessInfo: incident.witnessInfo || '',
      policeReportNumber: incident.policeReportNumber || '',
      actionTakenLog: incident.actionTakenLog || [],
      preventativeMeasures: incident.preventativeMeasures || '',
      costTracking: incident.costTracking || [],
      cvsaDotImpact: incident.cvsaDotImpact || false,
      fmcsaReportable: incident.fmcsaReportable || false,
      fmcsaNotes: incident.fmcsaNotes || '',
      notes: incident.notes || '',
      accidentReport: undefined, // File objects are not preserved when editing, user needs to re-upload
      accidentPictures: [],
      accidentVideo: typeof incident.accidentVideo === 'string' ? (incident.accidentVideo ? { name: incident.accidentVideo } as File : undefined) : (incident.accidentVideo?.fileName ? { name: incident.accidentVideo.fileName } as File : undefined)
    });
    setShowEditModal(true);
  };

  const handleViewIncident = (incident: Incident) => {
    setSelectedIncident(incident);
    setShowViewModal(true);
  };

  const handleDeleteIncident = (incident: Incident) => {
    setIncidentToDelete(incident);
    setShowDeleteModal(true);
  };

  const addNotification = (type: NotificationType, message: string) => {
    const id = ++notificationIdRef.current;
    setNotifications((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      removeNotification(id);
    }, 5000);
  };

  const removeNotification = (id: number) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const validateForm = () => {
    return !!incidentForm.incidentDateTime &&
      !!incidentForm.location?.city &&
      !!incidentForm.location?.stateProvince &&
      !!incidentForm.incidentType &&
      !!incidentForm.driver;
  };

  const saveNewIncident = async () => {
    if (!validateForm()) {
      addNotification('error', 'Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      // Create FormData to handle file uploads
      const formData = new FormData();

      // Add all form fields
      formData.append('incidentDateTime', incidentForm.incidentDateTime);
      formData.append('location', JSON.stringify(incidentForm.location));
      formData.append('incidentType', incidentForm.incidentType);
      formData.append('incidentStatus', incidentForm.incidentStatus);
      if (incidentForm.incidentId) formData.append('incidentId', incidentForm.incidentId);
      formData.append('driver', incidentForm.driver);
      if (incidentForm.coDriver) formData.append('coDriver', incidentForm.coDriver);
      if (incidentForm.caseFileNumber) formData.append('caseFileNumber', incidentForm.caseFileNumber);
      if (incidentForm.driversLicense) formData.append('driversLicense', incidentForm.driversLicense);
      if (incidentForm.reportingParty) formData.append('reportingParty', incidentForm.reportingParty);
      if (incidentForm.unitNumber) formData.append('unitNumber', incidentForm.unitNumber);
      if (incidentForm.trailerNumber) formData.append('trailerNumber', incidentForm.trailerNumber);
      if (incidentForm.vinPlateNumber) formData.append('vinPlateNumber', incidentForm.vinPlateNumber);
      if (incidentForm.damageDescription) formData.append('damageDescription', incidentForm.damageDescription);
      if (incidentForm.description) formData.append('description', incidentForm.description);
      if (incidentForm.witnessInfo) formData.append('witnessInfo', incidentForm.witnessInfo);
      if (incidentForm.policeReportNumber) formData.append('policeReportNumber', incidentForm.policeReportNumber);
      if (incidentForm.actionTakenLog && incidentForm.actionTakenLog.length > 0) {
        formData.append('actionTakenLog', JSON.stringify(incidentForm.actionTakenLog));
      }
      if (incidentForm.preventativeMeasures) formData.append('preventativeMeasures', incidentForm.preventativeMeasures);
      if (incidentForm.costTracking && incidentForm.costTracking.length > 0) {
        formData.append('costTracking', JSON.stringify(incidentForm.costTracking));
      }
      formData.append('cvsaDotImpact', String(incidentForm.cvsaDotImpact || false));
      formData.append('fmcsaReportable', String(incidentForm.fmcsaReportable || false));
      if (incidentForm.fmcsaNotes) formData.append('fmcsaNotes', incidentForm.fmcsaNotes);
      if (incidentForm.notes) formData.append('notes', incidentForm.notes);

      // Add files if they exist
      if (incidentForm.accidentReport instanceof File) {
        formData.append('accidentReport', incidentForm.accidentReport);
      }
      if (incidentForm.accidentPictures && incidentForm.accidentPictures.length > 0) {
        incidentForm.accidentPictures.forEach((file) => {
          formData.append('accidentPictures', file);
        });
      }
      if (incidentForm.accidentVideo) {
        formData.append('accidentVideo', incidentForm.accidentVideo);
      }

      const res = await createIncident(formData);
      if (res && res.success && res.data) {
        // If "Also create as accident" is checked, create an Issue with issueType='accident'
        if (incidentForm.alsoCreateAsAccident) {
          try {
            // Find the vehicle (Vehicle) by unitNumber
            let vehicleId = null;
            if (incidentForm.unitNumber) {
              const vehiclesResponse = await getAllVehicles(1, 1000);
              if (vehiclesResponse?.success && vehiclesResponse?.data) {
                const matchingVehicle = vehiclesResponse.data.find(
                  (vehicle: any) =>
                    vehicle.unitNumber === incidentForm.unitNumber ||
                    vehicle.internalId === incidentForm.unitNumber ||
                    vehicle.plateNumber === incidentForm.unitNumber
                );
                if (matchingVehicle) {
                  vehicleId = matchingVehicle._id;
                }
              }
            }

            // Build address string from location
            const addressParts = [];
            if (incidentForm.location.streetAddress) addressParts.push(incidentForm.location.streetAddress);
            if (incidentForm.location.city) addressParts.push(incidentForm.location.city);
            if (incidentForm.location.stateProvince) addressParts.push(incidentForm.location.stateProvince);
            const address = addressParts.join(', ') || undefined;

            // Create issue payload
            const issuePayload: any = {
              issueType: 'accident',
              issueCategory: 'minor-damage', // Default, can be adjusted
              issueReport: incidentForm.description || incidentForm.incidentType || 'Accident reported',
              priority: 'high', // Accidents are typically high priority
              status: incidentForm.incidentStatus === 'open' ? 'open' : incidentForm.incidentStatus === 'closed' ? 'closed' : 'in-progress',
              driver: incidentForm.driver,
              address: address
            };

            if (vehicleId) {
              issuePayload.vehicle = vehicleId;
            }

            if (incidentForm.reportingParty) {
              issuePayload.reportedBy = incidentForm.reportingParty;
            }

            // Create the issue
            const issueRes = await createIssue(issuePayload);
            if (issueRes && issueRes.success) {
              addNotification('success', 'Incident and accident created successfully');
            } else {
              addNotification('error', 'Incident created, but failed to create accident: ' + (issueRes?.message || 'Unknown error'));
            }
          } catch (issueError: any) {
            console.error('Error creating accident issue:', issueError);
            addNotification('error', 'Incident created, but failed to create accident: ' + (issueError?.response?.data?.message || issueError?.message || 'Unknown error'));
          }
        } else {
          addNotification('success', 'Incident created successfully');
        }

        setShowAddModal(false);
        resetForm();
        setCurrentPage(1); // Reset to first page to see the new incident
        await refreshData();
        await loadStats();
      } else {
        addNotification('error', res?.message || 'Failed to create incident');
      }
    } catch (error: any) {
      console.error('Error creating incident:', error);
      addNotification('error', error?.response?.data?.message || 'Failed to create incident');
    } finally {
      setLoading(false);
    }
  };

  const saveEditedIncident = async () => {
    if (!validateForm() || !selectedIncident) {
      addNotification('error', 'Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      // Create FormData to handle file uploads
      const formData = new FormData();

      // Add all form fields
      formData.append('incidentDateTime', incidentForm.incidentDateTime);
      formData.append('location', JSON.stringify(incidentForm.location));
      formData.append('incidentType', incidentForm.incidentType);
      formData.append('incidentStatus', incidentForm.incidentStatus);
      if (incidentForm.incidentId) formData.append('incidentId', incidentForm.incidentId);
      formData.append('driver', incidentForm.driver);
      if (incidentForm.coDriver) formData.append('coDriver', incidentForm.coDriver);
      if (incidentForm.caseFileNumber) formData.append('caseFileNumber', incidentForm.caseFileNumber);
      if (incidentForm.driversLicense) formData.append('driversLicense', incidentForm.driversLicense);
      if (incidentForm.reportingParty) formData.append('reportingParty', incidentForm.reportingParty);
      if (incidentForm.unitNumber) formData.append('unitNumber', incidentForm.unitNumber);
      if (incidentForm.trailerNumber) formData.append('trailerNumber', incidentForm.trailerNumber);
      if (incidentForm.vinPlateNumber) formData.append('vinPlateNumber', incidentForm.vinPlateNumber);
      if (incidentForm.damageDescription) formData.append('damageDescription', incidentForm.damageDescription);
      if (incidentForm.description) formData.append('description', incidentForm.description);
      if (incidentForm.witnessInfo) formData.append('witnessInfo', incidentForm.witnessInfo);
      if (incidentForm.policeReportNumber) formData.append('policeReportNumber', incidentForm.policeReportNumber);
      if (incidentForm.actionTakenLog && incidentForm.actionTakenLog.length > 0) {
        formData.append('actionTakenLog', JSON.stringify(incidentForm.actionTakenLog));
      }
      if (incidentForm.preventativeMeasures) formData.append('preventativeMeasures', incidentForm.preventativeMeasures);
      if (incidentForm.costTracking && incidentForm.costTracking.length > 0) {
        formData.append('costTracking', JSON.stringify(incidentForm.costTracking));
      }
      formData.append('cvsaDotImpact', String(incidentForm.cvsaDotImpact || false));
      formData.append('fmcsaReportable', String(incidentForm.fmcsaReportable || false));
      if (incidentForm.fmcsaNotes) formData.append('fmcsaNotes', incidentForm.fmcsaNotes);
      if (incidentForm.notes) formData.append('notes', incidentForm.notes);

      // Add files if they exist (only new files, existing file names are preserved)
      if (incidentForm.accidentReport instanceof File) {
        formData.append('accidentReport', incidentForm.accidentReport);
      } else if (incidentForm.accidentReport) {
        // Keep existing file name
        formData.append('accidentReport', incidentForm.accidentReport);
      }
      if (incidentForm.accidentPictures && incidentForm.accidentPictures.length > 0) {
        incidentForm.accidentPictures.forEach((file) => {
          if (file instanceof File) {
            formData.append('accidentPictures', file);
          }
        });
        // Also append existing file names if any are strings
        const existingPictures = incidentForm.accidentPictures
          .filter(f => typeof f === 'string')
          .join(',');
        if (existingPictures) {
          formData.append('accidentPictures', existingPictures);
        }
      }
      if (incidentForm.accidentVideo instanceof File) {
        formData.append('accidentVideo', incidentForm.accidentVideo);
      } else if (incidentForm.accidentVideo) {
        // Keep existing file name
        formData.append('accidentVideo', incidentForm.accidentVideo);
      }

      const res = await updateIncident(selectedIncident._id, formData);
      if (res && res.success && res.data) {
        addNotification('success', 'Incident updated successfully');
        setShowEditModal(false);
        setSelectedIncident(null);
        resetForm();
        await refreshData();
        await loadStats();
      } else {
        addNotification('error', res?.message || 'Failed to update incident');
      }
    } catch (error: any) {
      console.error('Error updating incident:', error);
      addNotification('error', error?.response?.data?.message || 'Failed to update incident');
    } finally {
      setLoading(false);
    }
  };

  const confirmDelete = async () => {
    if (!incidentToDelete) return;

    setLoading(true);
    try {
      const res = await deleteIncident(incidentToDelete._id);
      if (res && res.success) {
        addNotification('success', 'Incident deleted successfully');
        setShowDeleteModal(false);
        setIncidentToDelete(null);
        // If we're on the last page and it becomes empty, go to previous page
        if (incidents.length === 1 && currentPage > 1) {
          setCurrentPage(currentPage - 1);
        }
        await refreshData();
        await loadStats();
      } else {
        addNotification('error', res?.message || 'Failed to delete incident');
      }
    } catch (error: any) {
      console.error('Error deleting incident:', error);
      addNotification('error', error?.response?.data?.message || 'Failed to delete incident');
    } finally {
      setLoading(false);
    }
  };

  // Get unique incident types for filter
  const incidentTypes = Array.from(new Set(incidents.map(i => i.incidentType).filter(Boolean)));

  // Get unique locations for filter
  const locations = Array.from(new Set(
    incidents
      .map(i => i.location?.stateProvince || i.location?.city)
      .filter(Boolean)
  ));

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
    background: string;
  }) => {
    return (
      <div
        onClick={onClick}
        className={`bg-[${background}]/20 rounded-lg p-3 shadow-sm hover:shadow-md transition-all cursor-pointer border border-transparent hover:border-[var(--accent-blue)]/20 hover:scale-[1.02] active:scale-[0.98]`}
      >
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1">
            <h3 className="text-sm font-bold text-primary mb-1">{title}</h3>
            <div className="flex items-baseline gap-2 mb-0.5">
              <span className="text-xl font-bold text-primary">{value}</span>
            </div>
            {subtitle && <p className="text-xs text-secondary">{subtitle}</p>}
          </div>
          <div className={`${bgColor} rounded-lg p-2 shadow-sm`}>
            {React.isValidElement(Icon) ? React.cloneElement(Icon as React.ReactElement<{ className?: string, size?: number }>, { className: iconColor, size: 21 }) : null}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen pb-10 bg-main">
      {/* Toast Notifications */}
      {notifications.map((notification) => (
        <ToastNotification
          key={notification.id}
          {...notification}
          onRemove={() => removeNotification(notification.id)}
        />
      ))}

      <div className="relative w-full mx-auto p-2">


        <div className="relative z-10 px-4 pt-3 pb-6">
          {/* Header */}
          <div className="mb-4 relative z-10">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold text-headings flex items-center gap-2">
                  Accidents
                </h1>
                <div className="flex items-center gap-2 text-secondary">
                  <span className="text-xs">Manage and track all accidents</span>
                </div>
              </div>
              <button
                onClick={handleAddIncident}
                className="flex items-center gap-2 px-4 py-2 text-[rgba(0,209,255,0.15)] rounded-lg hover:bg-card/90 shadow-sm transition-all font-bold text-sm bg-[var(--accent-navyblue)]"
              >
                <FaPlus /> Report Incident
              </button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 -mt-2 mb-6 relative z-10">
            <StatCard
              title="Total Incidents"
              value={stats.total}
              bgColor=""
              iconColor="text-[var(--accent-blue)]"
              icon={<FaExclamationTriangle />}
              background='var(--accent-blue)'
            />
            <StatCard
              title="Open"
              value={stats.open}
              bgColor=""
              iconColor="text-[var(--accent-purple)]"
              icon={<FaExclamationCircle />}
              background='var(--accent-purple)'
            />
            <StatCard
              title="Under Review"
              value={stats.underReview}
              bgColor=""
              iconColor="text-[var(--accent-orange)]"
              icon={<FaInfoCircle />}
              background='var(--accent-orange)'
            />
            <StatCard
              title="Closed"
              value={stats.closed}
              bgColor=""
              iconColor="text-[var(--accent-green)]"
              icon={<FaCheckCircle />}
              background='var(--accent-green)'
            />
          </div>
        </div>
      </div>

      <div className="w-full mx-auto px-4 -mt-4">
        {/* Country Tabs */}
        <div className="bg-card rounded-lg shadow-sm border border-theme p-4 mb-6">
          <div className="flex gap-2 border-b border-theme pb-4">
            <button
              onClick={() => setCountryFilter('all')}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${countryFilter === 'all'
                ? 'bg-[var(--accent-navyblue)] text-[#0284C7]'
                : 'text-secondary hover:bg-[rgba(255,255,255,0.03)]'
                }`}
            >
              All ({incidents.length})
            </button>
            <button
              onClick={() => setCountryFilter('canada')}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors flex items-center gap-2 ${countryFilter === 'canada'
                ? 'bg-[var(--accent-navyblue)] text-[#0284C7]'
                : 'text-secondary hover:bg-[rgba(255,255,255,0.03)]'
                }`}
            >
              <FaFlag className="text-[#A855F7]" size={14} />
              Canada ({incidents.filter(i => i.location?.country === 'canada').length})
            </button>
            <button
              onClick={() => setCountryFilter('usa')}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors flex items-center gap-2 ${countryFilter === 'usa'
                ? 'bg-[var(--accent-navyblue)] text-[#0284C7]'
                : 'text-secondary hover:bg-[rgba(255,255,255,0.03)]'
                }`}
            >
              <FaFlagUsa className="text-[#00D1FF]" size={14} />
              USA ({incidents.filter(i => i.location?.country === 'usa').length})
            </button>
          </div>
        </div>

        {/* Filters and Actions */}
        <div className="bg-card rounded-lg shadow-sm border border-theme p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-4">
            <div className="md:col-span-2">
              <div className="relative">
                <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-secondary" size={16} />
                <input
                  type="text"
                  placeholder="Search incidents..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-[var(--accent-color)] focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-3 py-2 text-sm border border-theme rounded-lg
  bg-[var(--bg-card)] text-[var(--text-primary)]
  focus:ring-2 focus:ring-[var(--accent-blue)]
  focus:border-[var(--accent-blue)]
  outline-none cursor-pointer transition-all"
              >
                <option value="all" className="bg-[var(--bg-card)] text-[var(--text-primary)]">
                  All Status
                </option>

                <option value="open" className="bg-[var(--bg-card)] text-[var(--text-primary)]">
                  Open
                </option>

                <option value="under-review" className="bg-[var(--bg-card)] text-[var(--text-primary)]">
                  Under Review
                </option>

                <option value="closed" className="bg-[var(--bg-card)] text-[var(--text-primary)]">
                  Closed
                </option>
              </select>
            </div>

            <div>
              <select
                value={typeFilter}
                onChange={(e) => {
                  setTypeFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-3 py-2 text-sm border border-theme rounded-lg
  bg-[var(--bg-card)] text-[var(--text-primary)]
  focus:ring-2 focus:ring-[var(--accent-blue)]
  focus:border-[var(--accent-blue)]
  outline-none cursor-pointer transition-all"
              >
                <option
                  value="all"
                  className="bg-[var(--bg-card)] text-[var(--text-primary)]"
                >
                  All Types
                </option>

                {incidentTypes.map((type) => (
                  <option
                    key={type}
                    value={type}
                    className="bg-[var(--bg-card)] text-[var(--text-primary)]"
                  >
                    {type}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <select
                value={locationFilter}
                onChange={(e) => {
                  setLocationFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-3 py-2 text-sm border border-theme rounded-lg
  bg-[var(--bg-card)] text-[var(--text-primary)]
  focus:ring-2 focus:ring-[var(--accent-blue)]
  focus:border-[var(--accent-blue)]
  outline-none cursor-pointer transition-all"
              >
                <option
                  value="all"
                  className="bg-[var(--bg-card)] text-[var(--text-primary)]"
                >
                  All Locations
                </option>

                {locations.map((location) => (
                  <option
                    key={location}
                    value={location}
                    className="bg-[var(--bg-card)] text-[var(--text-primary)]"
                  >
                    {location}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <select
                value={driverFilter}
                onChange={(e) => {
                  setDriverFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-3 py-2 text-sm border border-theme rounded-lg
  bg-[var(--bg-card)] text-[var(--text-primary)]
  focus:ring-2 focus:ring-[var(--accent-blue)]
  focus:border-[var(--accent-blue)]
  outline-none cursor-pointer transition-all"
              >
                <option
                  value="all"
                  className="bg-[var(--bg-card)] text-[var(--text-primary)]"
                >
                  All Drivers
                </option>

                {drivers.map((driver) => (
                  <option
                    key={driver._id}
                    value={driver._id}
                    className="bg-[var(--bg-card)] text-[var(--text-primary)]"
                  >
                    {driver.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-between items-center">
            <p className="text-sm text-secondary">
              Showing <span className="font-semibold">{(currentPage - 1) * pageSize + 1}</span> to{' '}
              <span className="font-semibold">{Math.min(currentPage * pageSize, total)}</span> of{' '}
              <span className="font-semibold">{total}</span> incidents
            </p>
            <button
              onClick={handleAddIncident}
              className="px-6 py-2.5 bg-[var(--accent-navyblue)] !text-white rounded-lg hover:bg-[var(--accent-dark)] font-medium transition-colors flex items-center gap-2"
            >
              <FaPlus size={16} />
              Add Incident
            </button>
          </div>
        </div>

        {/* Incidents Table */}
        <div className="bg-card rounded-lg shadow-sm border border-theme overflow-hidden">
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
              <table className="w-full">
                <thead className="bg-card border-b border-theme">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text- uppercase tracking-wider sticky left-0 bg-card z-10">
                      Incident #
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text- uppercase tracking-wider">
                      Date/Time
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text- uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text- uppercase tracking-wider">
                      Location
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text- uppercase tracking-wider">
                      Driver
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text- uppercase tracking-wider">
                      Unit/Trailer
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text- uppercase tracking-wider">
                      Case File #
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text- uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text- uppercase tracking-wider sticky right-0 bg-card z-10">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-card divide-y divide-theme">
                  {loading ? (
                    <tr>
                      <td colSpan={9} className="px-6 py-12 text-center text-secondary">
                        Loading incidents...
                      </td>
                    </tr>
                  ) : incidents.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-6 py-12 text-center text-secondary">
                        No incidents found
                      </td>
                    </tr>
                  ) : (
                    incidents.map((incident) => (
                      <tr
                        key={incident._id}
                        className="hover:bg-[rgba(255,255,255,0.03)] transition-colors cursor-pointer"
                        onClick={() => handleViewIncident(incident)}
                      >
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium sticky left-0 bg-card z-10">
                          <p className="text-sm font-semibold text-primary">{incident.incidentNumber || 'N/A'}</p>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-2 text-sm text-secondary">
                            <FaCalendarAlt size={14} />
                            {incident.incidentDateTime ? formatDate(incident.incidentDateTime) : 'N/A'}
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <p className="text-sm text-primary">{incident.incidentType || 'N/A'}</p>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-2 text-sm text-secondary">
                            <FaMapMarkerAlt size={14} />
                            <span>
                              {incident.location?.city || ''}{incident.location?.city && incident.location?.stateProvince ? ', ' : ''}
                              {incident.location?.stateProvince || ''}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-2 text-sm text-secondary">
                            <FaUser size={14} />
                            {getDriverName(incident.driver)}
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="text-sm text-secondary">
                            {incident.unitNumber ? `Unit: ${incident.unitNumber}` : 'N/A'}
                            {incident.trailerNumber && (
                              <div className="text-xs text-secondary">Trailer: {incident.trailerNumber}</div>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <p className="text-sm text-secondary">{incident.caseFileNumber || 'N/A'}</p>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            {getStatusIcon(incident.incidentStatus)}
                            <span className={`text-xs px-3 py-1 rounded-full font-semibold border ${getStatusBadgeColor(incident.incidentStatus)}`}>
                              {incident.incidentStatus?.toUpperCase().replace('-', ' ') || 'N/A'}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium sticky right-0 bg-card z-10" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleViewIncident(incident)}
                              className="text-[var(--accent-color)] hover:text-[var(--accent-dark)] p-2 hover:bg-[var(--accent-soft)] rounded-lg transition-colors"
                              title="View Details"
                            >
                              <FaEye size={16} className='text-headings' />
                            </button>
                            <button
                              onClick={() => handleEditIncident(incident)}
                              className="text-[var(--accent-color)] hover:text-[var(--accent-dark)] p-2 hover:bg-[var(--accent-soft)] rounded-lg transition-colors"
                              title="Edit Incident"
                            >
                              <FaEdit size={16} className='text-headings' />
                            </button>
                            <button
                              onClick={() => handleDeleteIncident(incident)}
                              className="text-[#A855F7] hover:text-red-800 p-2 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete Incident"
                            >
                              <FaTrash size={16} className='text-[var(--accent-red)]' />
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

          {/* Pagination Controls */}
          {total > 0 && (
            <div className="px-6 py-4 border-t border-theme flex items-center justify-between bg-card">
              <div className="text-sm text-primary">
                Showing <span className="font-medium">{(currentPage - 1) * pageSize + 1}</span> to{' '}
                <span className="font-medium">{Math.min(currentPage * pageSize, total)}</span> of{' '}
                <span className="font-medium">{total}</span> incidents
              </div>
              {totalPages > 1 && (
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
                  <div className="flex gap-1">
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
                          className={`px-3 py-2 rounded-lg border ${currentPage === pageNum
                            ? 'bg-[var(--accent-color)] text-white border-[var(--accent-color)]'
                            : 'bg-card text-primary hover:bg-[rgba(255,255,255,0.03)] border-theme'
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
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="ml-4 px-3 py-2 rounded-lg border border-theme bg-card text-primary"
                  >
                    <option value={25}>25 per page</option>
                    <option value={50}>50 per page</option>
                    <option value={100}>100 per page</option>
                  </select>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Add Incident Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="bg-card rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-card border-b px-6 py-4 rounded-t-2xl z-10">
                <div className="flex justify-between items-center">
                  <h3 className="text-xl font-bold text-primary">Add New Incident</h3>
                  <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-[rgba(255,255,255,0.03)] rounded-full transition-colors">
                    <FaTimesCircle className="text-secondary" size={20} />
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-6">
                {/* Essential Incident Details */}
                <div className="bg-card rounded-xl p-6">
                  <h4 className="text-lg font-bold text-headings mb-4">Essential Incident Details</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-headings mb-1">Incident Date/Time <span className="text-red-500">*</span></label>
                      <input
                        type="datetime-local"
                        value={incidentForm.incidentDateTime || ''}
                        onChange={(e) => setIncidentForm(prev => ({ ...prev, incidentDateTime: e.target.value }))}
                        className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-[var(--accent-color)] focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-primary mb-1">Incident ID</label>
                      <input
                        type="text"
                        placeholder="Incident ID (optional, auto-generated if left blank)"
                        value={incidentForm.incidentId || ''}
                        onChange={(e) => setIncidentForm(prev => ({ ...prev, incidentId: e.target.value }))}
                        className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-[var(--accent-color)] focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-primary mb-1">Case/File Number</label>
                      <input
                        type="text"
                        placeholder="Case or file number"
                        value={incidentForm.caseFileNumber || ''}
                        onChange={(e) => setIncidentForm(prev => ({ ...prev, caseFileNumber: e.target.value }))}
                        className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-[var(--accent-color)] focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-primary mb-1">Country <span className="text-red-500">*</span></label>
                      <select
                        value={incidentForm.location?.country || 'usa'}
                        onChange={(e) => setIncidentForm(prev => ({
                          ...prev,
                          location: { ...prev.location, country: e.target.value as 'usa' | 'canada' }
                        }))}
                        className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-[var(--accent-color)] focus:border-transparent"
                      >
                        <option className='form-option' value="usa">USA</option>
                        <option className='form-option' value="canada">Canada</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-primary mb-1">
                        {incidentForm.location?.country === 'canada' ? 'Province' : 'State'} <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder={incidentForm.location?.country === 'canada' ? 'Province' : 'State'}
                        value={incidentForm.location?.stateProvince || ''}
                        onChange={(e) => setIncidentForm(prev => ({
                          ...prev,
                          location: { ...prev.location, stateProvince: e.target.value }
                        }))}
                        className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-[var(--accent-color)] focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-primary mb-1">City <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        placeholder="City"
                        value={incidentForm.location?.city || ''}
                        onChange={(e) => setIncidentForm(prev => ({
                          ...prev,
                          location: { ...prev.location, city: e.target.value }
                        }))}
                        className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-[var(--accent-color)] focus:border-transparent"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-primary mb-1">Full Street Address</label>
                      <input
                        type="text"
                        placeholder="Complete street address (street number, street name, etc.)"
                        value={incidentForm.location?.streetAddress || ''}
                        onChange={(e) => setIncidentForm(prev => ({
                          ...prev,
                          location: { ...prev.location, streetAddress: e.target.value }
                        }))}
                        className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-[var(--accent-color)] focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-primary mb-1">Incident Type <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        placeholder="e.g., Deer accident, Driver error, Hit another vehicle"
                        value={incidentForm.incidentType || ''}
                        onChange={(e) => setIncidentForm(prev => ({ ...prev, incidentType: e.target.value }))}
                        className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-[var(--accent-color)] focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-primary mb-1">Incident Status <span className="text-red-500">*</span></label>
                      <select
                        value={incidentForm.incidentStatus || 'open'}
                        onChange={(e) => setIncidentForm(prev => ({ ...prev, incidentStatus: e.target.value as 'open' | 'under-review' | 'closed' }))}
                        className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-[var(--accent-color)] focus:border-transparent"
                      >
                        <option className='form-option' value="open">Open</option>
                        <option className='form-option' value="under-review">Under Review</option>
                        <option className='form-option' value="closed">Closed</option>
                      </select>
                    </div>
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-primary mb-1">Incident Description</label>
                      <textarea
                        placeholder="Detailed description of the incident"
                        value={incidentForm.description || ''}
                        onChange={(e) => setIncidentForm(prev => ({ ...prev, description: e.target.value }))}
                        className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-[var(--accent-color)] focus:border-transparent"
                        rows={3}
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-primary mb-1">Supporting Media URLs</label>
                      <input
                        type="text"
                        placeholder="Comma-separated URLs for photos, videos, or reports"
                        value={(incidentForm.supportingMedia || []).join(', ')}
                        onChange={(e) => setIncidentForm(prev => ({
                          ...prev,
                          supportingMedia: e.target.value ? e.target.value.split(',').map(url => url.trim()).filter(Boolean) : []
                        }))}
                        className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-[var(--accent-color)] focus:border-transparent"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-primary mb-1">
                        <FaImage className="inline mr-2" /> Upload Accident Pictures
                      </label>
                      <div className="mt-1">
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={(e) => {
                            const files = Array.from(e.target.files || []);
                            setIncidentForm(prev => ({
                              ...prev,
                              accidentPictures: [...(prev.accidentPictures || []), ...files]
                            }));
                          }}
                          className="hidden"
                          id="accident-pictures-upload"
                        />
                        <label
                          htmlFor="accident-pictures-upload"
                          className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-theme rounded-lg cursor-pointer hover:border-[var(--accent-color)] hover:bg-[var(--accent-soft)] transition-colors"
                        >
                          <FaUpload className="text-secondary" size={18} />
                          <span className="text-sm text-secondary">
                            {incidentForm.accidentPictures && incidentForm.accidentPictures.length > 0
                              ? `${incidentForm.accidentPictures.length} file(s) selected`
                              : 'Click to upload pictures'}
                          </span>
                        </label>
                        {incidentForm.accidentPictures && incidentForm.accidentPictures.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {incidentForm.accidentPictures.map((file, index) => (
                              <div key={index} className="flex items-center justify-between bg-card px-3 py-2 rounded text-sm">
                                <span className="text-primary flex items-center gap-2">
                                  <FaImage className="text-blue-500" size={14} />
                                  {file.name}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setIncidentForm(prev => ({
                                      ...prev,
                                      accidentPictures: prev.accidentPictures?.filter((_, i) => i !== index) || []
                                    }));
                                  }}
                                  className="text-red-500 hover:text-red-700"
                                >
                                  <FaTimes size={14} />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-primary mb-1">
                        <FaVideo className="inline mr-2" /> Upload Accident Video
                      </label>
                      <div className="mt-1">
                        <input
                          type="file"
                          accept="video/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              setIncidentForm(prev => ({ ...prev, accidentVideo: file }));
                            }
                          }}
                          className="hidden"
                          id="accident-video-upload"
                        />
                        <label
                          htmlFor="accident-video-upload"
                          className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-theme rounded-lg cursor-pointer hover:border-[var(--accent-color)] hover:bg-[var(--accent-soft)] transition-colors"
                        >
                          <FaUpload className="text-secondary" size={18} />
                          <span className="text-sm text-secondary">
                            {incidentForm.accidentVideo
                              ? incidentForm.accidentVideo.name
                              : 'Click to upload video'}
                          </span>
                        </label>
                        {incidentForm.accidentVideo && (
                          <div className="mt-2 flex items-center justify-between bg-card px-3 py-2 rounded text-sm">
                            <span className="text-primary flex items-center gap-2">
                              <FaVideo className="text-red-500" size={14} />
                              {incidentForm.accidentVideo.name}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setIncidentForm(prev => ({ ...prev, accidentVideo: undefined }));
                              }}
                              className="text-red-500 hover:text-red-700"
                            >
                              <FaTimes size={14} />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Personnel Details */}
                <div className="bg-card rounded-xl p-6">
                  <h4 className="text-lg font-bold text-primary mb-4">Personnel Details</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-primary mb-1">Driver <span className="text-red-500">*</span></label>
                      <select
                        value={incidentForm.driver || ''}
                        onChange={(e) => setIncidentForm(prev => ({ ...prev, driver: e.target.value }))}
                        className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-[var(--accent-color)] focus:border-transparent"
                      >
                        <option className='form-option' value="">Select Driver</option>
                        {drivers.map((driver) => (
                          <option className='form-option' key={driver._id} value={driver._id}>{driver.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-primary mb-1">Co-Driver</label>
                      <select
                        value={incidentForm.coDriver || ''}
                        onChange={(e) => setIncidentForm(prev => ({ ...prev, coDriver: e.target.value }))}
                        className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-[var(--accent-color)] focus:border-transparent"
                      >
                        <option className='form-option' value="">Select Co-Driver</option>
                        {drivers
                          .filter((driver) => driver._id !== incidentForm.driver) // Exclude the selected driver
                          .map((driver) => (
                            <option className='form-option' key={driver._id} value={driver._id}>{driver.name}</option>
                          ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-primary mb-1">Driver's License #</label>
                      <input
                        type="text"
                        placeholder="Driver's license number"
                        value={incidentForm.driversLicense || ''}
                        onChange={(e) => setIncidentForm(prev => ({ ...prev, driversLicense: e.target.value }))}
                        className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-[var(--accent-color)] focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-primary mb-1">Reporting Party</label>
                      <input
                        type="text"
                        placeholder="Who filed the report (if different from driver)"
                        value={incidentForm.reportingParty || ''}
                        onChange={(e) => setIncidentForm(prev => ({ ...prev, reportingParty: e.target.value }))}
                        className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-[var(--accent-color)] focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-primary mb-1">Witness Information</label>
                      <input
                        type="text"
                        placeholder="Witness names and contact info"
                        value={incidentForm.witnessInfo || ''}
                        onChange={(e) => setIncidentForm(prev => ({ ...prev, witnessInfo: e.target.value }))}
                        className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-[var(--accent-color)] focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-primary mb-1">Police Report Number</label>
                      <input
                        type="text"
                        placeholder="Police report number (if applicable)"
                        value={incidentForm.policeReportNumber || ''}
                        onChange={(e) => setIncidentForm(prev => ({ ...prev, policeReportNumber: e.target.value }))}
                        className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-[var(--accent-color)] focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>

                {/* Equipment Details */}
                <div className="bg-[var(--accent-soft)] rounded-xl p-6">
                  <h4 className="text-lg font-bold text-primary mb-4">Equipment Details</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-primary mb-1">Unit Number</label>
                      <select
                        value={incidentForm.unitNumber || ''}
                        onChange={(e) => setIncidentForm(prev => ({ ...prev, unitNumber: e.target.value }))}
                        className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-[var(--accent-color)] focus:border-transparent"
                      >
                        <option className='form-option' value="">Select Truck</option>
                        {vehicles.map((vehicle) => (
                          <option className='form-option' key={vehicle._id} value={vehicle.unitNo}>
                            {vehicle.unitNo} - {vehicle.makeModel} ({vehicle.licensePlate})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-primary mb-1">Trailer Number</label>
                      <select
                        value={incidentForm.trailerNumber || ''}
                        onChange={(e) => setIncidentForm(prev => ({ ...prev, trailerNumber: e.target.value }))}
                        className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-[var(--accent-color)] focus:border-transparent"
                      >
                        <option className='form-option' value="">Select Trailer</option>
                        {trailers.map((trailer) => {
                          const identifier = trailer.plateNumber || trailer.internalId || trailer.trailer || 'N/A';
                          const displayName = trailer.trailer || trailer.plateNumber || trailer.internalId || 'Trailer';
                          return (
                            <option className='form-option' key={trailer._id} value={trailer.trailer || trailer.internalId || trailer._id}>
                              {displayName} {identifier !== displayName ? `(${identifier})` : ''}
                            </option>
                          );
                        })}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-primary mb-1">VIN / Plate #</label>
                      <input
                        type="text"
                        placeholder="VIN or plate number"
                        value={incidentForm.vinPlateNumber || ''}
                        onChange={(e) => setIncidentForm(prev => ({ ...prev, vinPlateNumber: e.target.value }))}
                        className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-[var(--accent-color)] focus:border-transparent"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-primary mb-1">Damage Description</label>
                      <textarea
                        placeholder="Detailed description of damage sustained"
                        value={incidentForm.damageDescription || ''}
                        onChange={(e) => setIncidentForm(prev => ({ ...prev, damageDescription: e.target.value }))}
                        className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-[var(--accent-color)] focus:border-transparent"
                        rows={3}
                      />
                    </div>
                  </div>
                </div>

                {/* Investigation & Follow-up */}
                <div className="bg-card rounded-xl p-6">
                  <h4 className="text-lg font-bold text-primary mb-4">Investigation & Follow-up</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <label className="flex items-center gap-2 mb-2">
                        <input
                          type="checkbox"
                          checked={incidentForm.fmcsaReportable || false}
                          onChange={(e) => setIncidentForm(prev => ({ ...prev, fmcsaReportable: e.target.checked }))}
                          className="w-4 h-4 text-[var(--accent-color)] border-theme rounded focus:ring-[var(--accent-color)]"
                        />
                        <span className="text-sm font-medium text-primary">FMCSA Reportable Accident</span>
                      </label>
                    </div>
                    <div className="col-span-2">
                      <label className="flex items-center gap-2 mb-2">
                        <input
                          type="checkbox"
                          checked={incidentForm.cvsaDotImpact || false}
                          onChange={(e) => setIncidentForm(prev => ({ ...prev, cvsaDotImpact: e.target.checked }))}
                          className="w-4 h-4 text-[var(--accent-color)] border-theme rounded focus:ring-[var(--accent-color)]"
                        />
                        <span className="text-sm font-medium text-primary">CVSA & DOT Impact</span>
                      </label>
                    </div>
                    <div className="col-span-2">
                      <label className="flex items-center gap-2 mb-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={incidentForm.alsoCreateAsAccident || false}
                          onChange={(e) => setIncidentForm(prev => ({ ...prev, alsoCreateAsAccident: e.target.checked }))}
                          className="w-4 h-4 text-[var(--accent-color)] border-theme rounded focus:ring-[var(--accent-color)]"
                        />
                        <span className="text-sm font-medium text-primary">Also create as accident (Issue)</span>
                        <span className="text-xs text-secondary">(Creates an accident record in the Issues system)</span>
                      </label>
                    </div>
                    {incidentForm.fmcsaReportable && (
                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-primary mb-1">FMCSA Notes</label>
                        <textarea
                          placeholder="FMCSA reporting details"
                          value={incidentForm.fmcsaNotes || ''}
                          onChange={(e) => setIncidentForm(prev => ({ ...prev, fmcsaNotes: e.target.value }))}
                          className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-[var(--accent-color)] focus:border-transparent"
                          rows={2}
                        />
                      </div>
                    )}
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-primary mb-1">Preventative Measures</label>
                      <textarea
                        placeholder="Record any changes to policies or training implemented"
                        value={incidentForm.preventativeMeasures || ''}
                        onChange={(e) => setIncidentForm(prev => ({ ...prev, preventativeMeasures: e.target.value }))}
                        className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-[var(--accent-color)] focus:border-transparent"
                        rows={3}
                      />
                    </div>

                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-primary mb-1">Additional Notes</label>
                      <textarea
                        placeholder="Any additional notes or comments"
                        value={incidentForm.notes || ''}
                        onChange={(e) => setIncidentForm(prev => ({ ...prev, notes: e.target.value }))}
                        className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-[var(--accent-color)] focus:border-transparent"
                        rows={3}
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-primary mb-1">
                        <FaFileAlt className="inline mr-2" /> Accident Report
                      </label>
                      <div className="mt-1">
                        <input
                          type="file"
                          accept=".pdf,.doc,.docx,.txt"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              // Store the File object
                              setIncidentForm(prev => ({ ...prev, accidentReport: file }));
                            }
                          }}
                          className="hidden"
                          id="accident-report-upload"
                        />
                        <label
                          htmlFor="accident-report-upload"
                          className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-theme rounded-lg cursor-pointer hover:border-[var(--accent-color)] hover:bg-[var(--accent-soft)] transition-colors"
                        >
                          <FaUpload className="text-secondary" size={18} />
                          <span className="text-sm text-secondary">
                            {incidentForm.accidentReport
                              ? incidentForm.accidentReport.name
                              : 'Click to upload accident report (PDF, DOC, DOCX, TXT)'}
                          </span>
                        </label>
                        {incidentForm.accidentReport && (
                          <div className="mt-2 flex items-center justify-between bg-card px-3 py-2 rounded text-sm">
                            <span className="text-primary flex items-center gap-2">
                              <FaFileAlt className="text-green-500" size={14} />
                              {incidentForm.accidentReport.name}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setIncidentForm(prev => ({ ...prev, accidentReport: undefined }));
                              }}
                              className="text-red-500 hover:text-red-700"
                            >
                              <FaTimes size={14} />
                            </button>
                          </div>
                        )}
                      </div>
                      <p className="mt-1 text-xs text-secondary">Upload accident report document from safety system</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="sticky bottom-0 bg-card px-6 py-4 flex justify-end gap-3 border-t rounded-b-2xl">
                <button onClick={() => setShowAddModal(false)} className="px-6 py-2.5 bg-card border border-theme text-primary rounded-lg hover:bg-[rgba(255,255,255,0.03)] font-medium transition-colors" disabled={loading}>
                  Cancel
                </button>
                <button onClick={saveNewIncident} className="px-6 py-2.5 bg-[var(--accent-navyblue)] !text-white rounded-lg hover:bg-[var(--accent-navyblue)]/80 font-medium transition-colors disabled:opacity-60" disabled={!validateForm() || loading}>
                  {loading ? 'Saving...' : 'Save Incident'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Incident Modal - Similar structure to Add Modal */}
        {showEditModal && selectedIncident && (
          <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="bg-card rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-card border-b px-6 py-4 rounded-t-2xl z-10">
                <div className="flex justify-between items-center">
                  <h3 className="text-xl font-bold text-headings">Edit Incident: {selectedIncident.incidentNumber}</h3>
                  <button onClick={() => { setShowEditModal(false); setSelectedIncident(null); resetForm(); }} className="p-2 hover:bg-[rgba(255,255,255,0.03)] rounded-full transition-colors">
                    <FaTimesCircle className="text-secondary" size={20} />
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-6">
                {/* Similar form structure to Add Modal - using incidentForm state */}
                <div className="bg-card rounded-xl p-6">
                  <h4 className="text-lg font-bold text-headings mb-4">Essential Incident Details</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-headings mb-1">Incident Date/Time <span className="text-red-500">*</span></label>
                      <input
                        type="datetime-local"
                        value={incidentForm.incidentDateTime || ''}
                        onChange={(e) => setIncidentForm(prev => ({ ...prev, incidentDateTime: e.target.value }))}
                        className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-[var(--accent-color)] focus:border-transparent"
                        style={{ colorScheme: 'dark' }}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-headings mb-1">Incident Type <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        value={incidentForm.incidentType || ''}
                        onChange={(e) => setIncidentForm(prev => ({ ...prev, incidentType: e.target.value }))}
                        className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-[var(--accent-color)] focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-headings mb-1">Status <span className="text-red-500">*</span></label>
                      <select
                        value={incidentForm.incidentStatus || "open"}
                        onChange={(e) =>
                          setIncidentForm((prev) => ({
                            ...prev,
                            incidentStatus: e.target.value as
                              | "open"
                              | "under-review"
                              | "closed",
                          }))
                        }
                        className="w-full px-3 py-2 text-sm border border-theme rounded-lg
  bg-[var(--bg-card)] text-[var(--text-primary)]
  focus:ring-2 focus:ring-[var(--accent-blue)]
  focus:border-[var(--accent-blue)]
  outline-none cursor-pointer transition-all"
                      >
                        <option value="open" className="bg-[var(--bg-card)] text-[var(--text-primary)]">
                          Open
                        </option>

                        <option value="under-review" className="bg-[var(--bg-card)] text-[var(--text-primary)]">
                          Under Review
                        </option>

                        <option value="closed" className="bg-[var(--bg-card)] text-[var(--text-primary)]">
                          Closed
                        </option>
                      </select>
                    </div>
                  </div>
                </div>
                {/* Add other sections similar to Add Modal */}
              </div>

              <div className="sticky bottom-0 bg-card px-6 py-4 flex justify-end gap-3 border-t rounded-b-2xl">
                <button onClick={() => { setShowEditModal(false); setSelectedIncident(null); resetForm(); }} className="px-6 py-2.5 bg-card border border-theme text-primary rounded-lg hover:bg-[rgba(255,255,255,0.03)] font-medium transition-colors" disabled={loading}>
                  Cancel
                </button>
                <button onClick={saveEditedIncident} className="px-6 py-2.5 bg-[var(--accent-navyblue)] !text-white rounded-lg hover:bg-[var(--accent-navyblue)]/80 font-medium transition-colors disabled:opacity-60" disabled={!validateForm() || loading}>
                  {loading ? 'Updating...' : 'Update Incident'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* View Incident Sidebar */}
        {showViewModal && selectedIncident && (
          <>
            <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-[100] transition-all duration-300" onClick={() => setShowViewModal(false)} />
            <div className="fixed top-0 right-0 h-full w-full sm:w-[600px] lg:w-[700px] bg-card shadow-2xl transform transition-transform duration-300 ease-out z-[101] border-l border-theme overflow-y-auto">
              <div className="sticky top-0 bg-card border-b px-6 py-4 z-10 shadow-sm">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-lg font-bold text-primary">{selectedIncident.incidentNumber || 'N/A'}</h3>
                    <p className="text-xs text-secondary mt-1">{selectedIncident.incidentType || 'N/A'}</p>
                  </div>
                  <button onClick={() => setShowViewModal(false)} className="p-2 hover:bg-[rgba(255,255,255,0.03)] rounded-full transition-colors">
                    <FaTimesCircle className="text-secondary" size={20} />
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-4">
                {/* Essential Incident Details */}
                <div className="bg-card rounded-lg p-4 border border-theme">
                  <h4 className="text-sm font-bold text-headings mb-3 flex items-center gap-2">
                    <FaInfoCircle className="text-[var(--accent-navyblue)]" size={16} />
                    Essential Incident Details
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-secondary mb-1">Incident Number</label>
                      <p className="text-sm font-semibold text-primary">{selectedIncident.incidentNumber || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-secondary mb-1">Incident ID</label>
                      <p className="text-sm font-semibold text-primary">{selectedIncident.incidentId || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-secondary mb-1">Date/Time</label>
                      <p className="text-sm font-semibold text-primary">{selectedIncident.incidentDateTime ? formatDate(selectedIncident.incidentDateTime) : 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-secondary mb-1">Status</label>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(selectedIncident.incidentStatus)}
                        <span className={`text-xs px-2 py-1 rounded-full font-semibold border ${getStatusBadgeColor(selectedIncident.incidentStatus)}`}>
                          {selectedIncident.incidentStatus?.toUpperCase().replace('-', ' ') || 'N/A'}
                        </span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-secondary mb-1">Case/File Number</label>
                      <p className="text-sm font-semibold text-primary">{selectedIncident.caseFileNumber || 'N/A'}</p>
                    </div>
                  </div>
                </div>

                {/* Location Details */}
                <div className="bg-card rounded-lg p-4 border border-theme">
                  <h4 className="text-sm font-bold text-primary mb-3 flex items-center gap-2">
                    <FaMapMarkerAlt className="text-[var(--accent-color)]" size={16} />
                    Location Details
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-secondary mb-1">Street Address</label>
                      <p className="text-sm text-primary">{selectedIncident.location?.streetAddress || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-secondary mb-1">City</label>
                      <p className="text-sm text-primary">{selectedIncident.location?.city || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-secondary mb-1">
                        {selectedIncident.location?.country === 'canada' ? 'Province' : 'State'}
                      </label>
                      <p className="text-sm text-primary">{selectedIncident.location?.stateProvince || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-secondary mb-1">Country</label>
                      <p className="text-sm text-primary">{selectedIncident.location?.country?.toUpperCase() || 'N/A'}</p>
                    </div>
                  </div>
                </div>

                {/* Personnel Details */}
                <div className="bg-card rounded-lg p-4 border border-theme">
                  <h4 className="text-sm font-bold text-primary mb-3 flex items-center gap-2">
                    <FaUser className="text-[var(--accent-color)]" size={16} />
                    Personnel Details
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-secondary mb-1">Driver</label>
                      <p className="text-sm font-semibold text-primary">{getDriverName(selectedIncident.driver)}</p>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-secondary mb-1">Co-Driver</label>
                      <p className="text-sm font-semibold text-primary">{getCoDriverName(selectedIncident.coDriver)}</p>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-secondary mb-1">Driver's License</label>
                      <p className="text-sm text-primary">{selectedIncident.driversLicense || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-secondary mb-1">Reporting Party</label>
                      <p className="text-sm text-primary">{selectedIncident.reportingParty || 'N/A'}</p>
                    </div>
                  </div>
                </div>

                {/* Equipment Details */}
                <div className="bg-card rounded-lg p-4 border border-theme">
                  <h4 className="text-sm font-bold text-primary mb-3">Equipment Details</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-secondary mb-1">Unit Number</label>
                      <p className="text-sm text-primary">{selectedIncident.unitNumber || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-secondary mb-1">Trailer Number</label>
                      <p className="text-sm text-primary">{selectedIncident.trailerNumber || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-secondary mb-1">VIN/Plate Number</label>
                      <p className="text-sm text-primary">{selectedIncident.vinPlateNumber || 'N/A'}</p>
                    </div>
                    {selectedIncident.damageDescription && (
                      <div className="md:col-span-2">
                        <label className="block text-xs font-medium text-secondary mb-1">Damage Description</label>
                        <p className="text-sm text-primary whitespace-pre-wrap">{selectedIncident.damageDescription}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Description */}
                {selectedIncident.description && (
                  <div className="bg-card rounded-lg p-4 border border-theme">
                    <h4 className="text-sm font-bold text-primary mb-2">Description</h4>
                    <p className="text-sm text-primary whitespace-pre-wrap">{selectedIncident.description}</p>
                  </div>
                )}

                {/* Witness Information */}
                {selectedIncident.witnessInfo && (
                  <div className="bg-card rounded-lg p-4 border border-theme">
                    <h4 className="text-sm font-bold text-primary mb-2">Witness Information</h4>
                    <p className="text-sm text-primary whitespace-pre-wrap">{selectedIncident.witnessInfo}</p>
                  </div>
                )}

                {/* Police Report */}
                {selectedIncident.policeReportNumber && (
                  <div className="bg-card rounded-lg p-4 border border-theme">
                    <h4 className="text-sm font-bold text-primary mb-2">Police Report</h4>
                    <p className="text-sm text-primary">Report Number: {selectedIncident.policeReportNumber}</p>
                  </div>
                )}

                {/* Accident-Related Fields */}
                {(selectedIncident.accidentReport || selectedIncident.accidentPictures?.length || selectedIncident.accidentVideo) && (
                  <div className="bg-card rounded-lg p-4 border border-theme">
                    <h4 className="text-sm font-bold text-[var(--accent-red)] mb-3 flex items-center gap-2">
                      <FaExclamationTriangle className="text-[var(--accent-red)]" size={16} />
                      Accident Details
                    </h4>
                    {selectedIncident.accidentReport && (() => {
                      const report = typeof selectedIncident.accidentReport === 'string'
                        ? { fileName: selectedIncident.accidentReport, signedUrl: null }
                        : selectedIncident.accidentReport;
                      return (
                        <div className="mb-3">
                          <label className="block text-xs font-medium text-secondary mb-1">Accident Report</label>
                          {report.signedUrl ? (
                            <a
                              href={report.signedUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 text-blue-500 hover:text-blue-800 hover:underline"
                            >
                              <FaFileAlt className="text-blue-500" size={14} />
                              <span className="text-sm">{report.fileName}</span>
                            </a>
                          ) : (
                            <div className="flex items-center gap-2">
                              <FaFileAlt className="text-blue-500" size={14} />
                              <span className="text-sm text-primary">{report.fileName}</span>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                    {selectedIncident.accidentPictures && selectedIncident.accidentPictures.length > 0 && (
                      <div className="mb-3">
                        <label className="block text-xs font-medium text-secondary mb-2">Accident Pictures</label>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                          {selectedIncident.accidentPictures.map((picture, idx) => {
                            const pic = typeof picture === 'string'
                              ? { fileName: picture, signedUrl: null }
                              : picture;
                            return (
                              <div key={idx} className="relative group">
                                {pic.signedUrl ? (
                                  <a
                                    href={pic.signedUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="block aspect-square bg-gray-200 rounded-lg overflow-hidden hover:opacity-90 transition-opacity cursor-pointer"
                                  >
                                    <img
                                      src={pic.signedUrl}
                                      alt={pic.fileName}
                                      className="w-full h-full object-cover"
                                      onError={(e) => {
                                        e.currentTarget.style.display = 'none';
                                        const fallback = e.currentTarget.parentElement?.querySelector('.image-fallback');
                                        if (fallback) fallback.classList.remove('hidden');
                                      }}
                                    />
                                    <div className="hidden image-fallback aspect-square bg-gray-200 rounded-lg flex items-center justify-center">
                                      <FaImage className="text-secondary" size={24} />
                                    </div>
                                  </a>
                                ) : (
                                  <div className="aspect-square bg-gray-200 rounded-lg flex items-center justify-center overflow-hidden">
                                    <FaImage className="text-secondary" size={24} />
                                  </div>
                                )}
                                <p className="text-xs text-secondary mt-1 truncate">{pic.fileName}</p>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    {selectedIncident.accidentVideo && (() => {
                      const video = typeof selectedIncident.accidentVideo === 'string'
                        ? { fileName: selectedIncident.accidentVideo, signedUrl: null }
                        : selectedIncident.accidentVideo;
                      return (
                        <div>
                          <label className="block text-xs font-medium text-secondary mb-1">Accident Video</label>
                          {video.signedUrl ? (
                            <a
                              href={video.signedUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 text-[#00D1FF] hover:text-blue-800 hover:underline cursor-pointer"
                            >
                              <FaVideo className="text-red-500" size={14} />
                              <span className="text-sm">{video.fileName}</span>
                            </a>
                          ) : (
                            <div className="flex items-center gap-2">
                              <FaVideo className="text-red-500" size={14} />
                              <span className="text-sm text-primary">{video.fileName}</span>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                )}

                {/* Supporting Media */}
                {selectedIncident.supportingMedia && selectedIncident.supportingMedia.length > 0 && (
                  <div className="bg-card rounded-lg p-4 border border-theme">
                    <h4 className="text-sm font-bold text-primary mb-3 flex items-center gap-2">
                      <FaImage className="text-[var(--accent-color)]" size={16} />
                      Supporting Media
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {selectedIncident.supportingMedia.map((media, idx) => (
                        <div key={idx} className="relative group">
                          <div className="aspect-square bg-gray-200 rounded-lg flex items-center justify-center overflow-hidden">
                            <FaImage className="text-secondary" size={24} />
                          </div>
                          <p className="text-xs text-secondary mt-1 truncate">{media}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Investigation & Follow-up */}
                {(selectedIncident.actionTakenLog?.length || selectedIncident.preventativeMeasures || selectedIncident.costTracking?.length || selectedIncident.cvsaDotImpact || selectedIncident.fmcsaReportable) && (
                  <div className="bg-card rounded-lg p-4 border border-theme">
                    <h4 className="text-sm font-bold text-primary mb-3">Investigation & Follow-up</h4>
                    {selectedIncident.actionTakenLog && selectedIncident.actionTakenLog.length > 0 && (
                      <div className="mb-3">
                        <label className="block text-xs font-medium text-secondary mb-2">Action Taken Log</label>
                        <div className="space-y-2">
                          {selectedIncident.actionTakenLog.map((action, idx) => (
                            <div key={idx} className="bg-card p-2 rounded border border-theme">
                              <div className="flex justify-between items-start mb-1">
                                <span className="text-xs font-semibold text-primary">{new Date(action.date).toLocaleDateString()}</span>
                                <span className="text-xs text-secondary">By: {action.takenBy}</span>
                              </div>
                              <p className="text-xs text-primary">{action.action}</p>
                              {action.notes && <p className="text-xs text-secondary mt-1">{action.notes}</p>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {selectedIncident.preventativeMeasures && (
                      <div className="mb-3">
                        <label className="block text-xs font-medium text-secondary mb-1">Preventative Measures</label>
                        <p className="text-sm text-primary whitespace-pre-wrap">{selectedIncident.preventativeMeasures}</p>
                      </div>
                    )}
                    {selectedIncident.costTracking && selectedIncident.costTracking.length > 0 && (
                      <div className="mb-3">
                        <label className="block text-xs font-medium text-secondary mb-2">Cost Tracking</label>
                        <div className="space-y-2">
                          {selectedIncident.costTracking.map((cost, idx) => (
                            <div key={idx} className="bg-card p-2 rounded border border-theme">
                              <div className="flex justify-between items-center mb-1">
                                <span className="text-xs font-semibold text-primary">{cost.category}</span>
                                <span className="text-xs text-secondary">
                                  Est: ${cost.estimated?.toLocaleString() || '0'}
                                  {cost.actual !== undefined && ` | Actual: $${cost.actual.toLocaleString()}`}
                                </span>
                              </div>
                              {cost.notes && <p className="text-xs text-secondary">{cost.notes}</p>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-secondary mb-1">CVSA/DOT Impact</label>
                        <p className="text-sm text-primary">{selectedIncident.cvsaDotImpact ? 'Yes' : 'No'}</p>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-secondary mb-1">FMCSA Reportable</label>
                        <p className="text-sm text-primary">{selectedIncident.fmcsaReportable ? 'Yes' : 'No'}</p>
                      </div>
                    </div>
                    {selectedIncident.fmcsaNotes && (
                      <div className="mt-3">
                        <label className="block text-xs font-medium text-secondary mb-1">FMCSA Notes</label>
                        <p className="text-sm text-primary whitespace-pre-wrap">{selectedIncident.fmcsaNotes}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Notes */}
                {selectedIncident.notes && (
                  <div className="bg-card rounded-lg p-4 border border-theme">
                    <h4 className="text-sm font-bold text-primary mb-2">Additional Notes</h4>
                    <p className="text-sm text-primary whitespace-pre-wrap">{selectedIncident.notes}</p>
                  </div>
                )}

                {/* Created At */}
                <div className="bg-card rounded-lg p-4 border border-theme">
                  <div className="flex justify-between items-center text-xs text-secondary">
                    <span>Created: {selectedIncident.createdAt ? new Date(selectedIncident.createdAt).toLocaleString() : 'N/A'}</span>
                    {(selectedIncident as any).updatedAt && (
                      <span>Updated: {new Date((selectedIncident as any).updatedAt).toLocaleString()}</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="sticky bottom-0 bg-card px-6 py-4 flex justify-end gap-3 border-t shadow-lg">
                <button
                  onClick={() => {
                    setShowViewModal(false);
                    handleEditIncident(selectedIncident);
                  }}
                  className="px-4 py-2 bg-[var(--accent-color)] !text-white rounded-lg hover:bg-[var(--accent-dark)] font-medium transition-colors text-sm"
                >
                  Edit
                </button>
                <button onClick={() => setShowViewModal(false)} className="px-4 py-2 bg-card border border-theme text-primary rounded-lg hover:bg-[rgba(255,255,255,0.03)] font-medium transition-colors text-sm">
                  Close
                </button>
              </div>
            </div>
          </>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteModal && incidentToDelete && (
          <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="bg-card rounded-2xl shadow-2xl w-full max-w-md">
              <div className="p-6">
                <div className="flex items-center gap-4 mb-4">
                  <div className="bg-red-100 rounded-full p-3">
                    <FaExclamationTriangle className="text-[#A855F7]" size={24} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-primary">Delete Incident</h3>
                    <p className="text-sm text-secondary">This action cannot be undone</p>
                  </div>
                </div>
                <p className="text-primary mb-6">
                  Are you sure you want to delete incident <span className="font-semibold">{incidentToDelete.incidentNumber}</span>?
                </p>
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => { setShowDeleteModal(false); setIncidentToDelete(null); }}
                    className="px-4 py-2 bg-card border border-theme text-primary rounded-lg hover:bg-[rgba(255,255,255,0.03)] font-medium transition-colors"
                    disabled={loading}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmDelete}
                    className="px-4 py-2 bg-red-600 !text-white rounded-lg hover:bg-red-700 font-medium transition-colors disabled:opacity-60"
                    disabled={loading}
                  >
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

export default Incidents;
