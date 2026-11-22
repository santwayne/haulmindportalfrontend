import React, { useState, useEffect, useRef } from 'react';
import type { CSSProperties } from 'react';
import {
  FaShieldAlt,
  FaPlus,
  FaEdit,
  FaTrash,
  FaEye,
  FaSearch,
  FaCheckCircle,
  FaTimesCircle,
  FaExclamationCircle,
  FaExclamationTriangle,
  FaInfoCircle,
  FaSort,
  FaSortUp,
  FaSortDown,
  FaTimes,
  FaChevronLeft,
  FaChevronRight,
  FaDollarSign,
  FaDownload
} from 'react-icons/fa';
import { FLEET_COLORS } from '../../fleetMaintenance/colorUtils';
import { downloadExcel, MONEY_FMT, type ExcelColumn } from '../../../../utils/excelExport';

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

// Types
interface InsuranceClaim {
  _id: string;
  claimNumber: string;
  accidentNumber?: string;
  incidentDate: string;
  claimDate: string;
  claimType: 'accident' | 'theft' | 'damage' | 'liability' | 'other';
  status: 'pending' | 'submitted' | 'under-review' | 'approved' | 'denied' | 'closed';
  amount: number;
  deductible: number;
  claimAmount: number;
  driver: {
    _id: string;
    name?: string;
    email?: string;
  } | string;
  vehicle: {
    _id: string;
    internalId?: string;
    plateNumber?: string;
    make?: string;
    model?: string;
  } | string;
  insuranceCompany: string;
  policyNumber: string;
  adjusterName?: string;
  adjusterContact?: string;
  description: string;
  location?: string;
  country?: 'canada' | 'usa';
  countryIsGuess?: boolean; // older claims: worked out from the linked accident / location
  notes?: string;
  documents?: string[];
  documentLinks?: Array<{ key: string; name: string; url: string }>;
  createdAt: string;
  updatedAt: string;
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

interface ClaimForm {
  claimNumber?: string;
  accidentNumber?: string;
  incidentDate: string;
  claimDate: string;
  claimType: 'accident' | 'theft' | 'damage' | 'liability' | 'other';
  status: 'pending' | 'submitted' | 'under-review' | 'approved' | 'denied' | 'closed';
  amount: string;
  deductible: string;
  driver: string;
  vehicle: string;
  insuranceCompany: string;
  policyNumber: string;
  adjusterName: string;
  adjusterContact: string;
  description: string;
  location: string;
  country: string;
  notes: string;
}

const ToastNotification: React.FC<{ notification: { id: number; type: 'success' | 'error' | 'info'; message: string }; onRemove: () => void }> = ({ notification, onRemove }) => {
  const icons = {
    success: <FaCheckCircle className="text-green-500" size={20} />,
    error: <FaTimesCircle className="text-red-500" size={20} />,
    info: <FaInfoCircle className="text-blue-500" size={20} />
  };

  const bgColors = {
    success: 'bg-green-50 border-green-200',
    error: 'bg-card border-red-200',
    info: 'bg-card border-blue-200'
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      onRemove();
    }, 5000);
    return () => clearTimeout(timer);
  }, [onRemove]);

  return (
    <div className={`flex items-start gap-3 p-4 rounded-lg border-2 shadow-lg ${bgColors[notification.type]} animate-slide-in`}>
      <div className="flex-shrink-0 mt-0.5">
        {icons[notification.type]}
      </div>
      <p className="flex-1 text-sm font-medium text-primary">{notification.message}</p>
      <button
        onClick={onRemove}
        className="flex-shrink-0 text-secondary hover:text-secondary transition-colors"
      >
        <FaTimes size={16} />
      </button>
    </div>
  );
};

const InsuranceClaims: React.FC = () => {
  const [claims, setClaims] = useState<InsuranceClaim[]>([]);
  const [filteredClaims, setFilteredClaims] = useState<InsuranceClaim[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [downloading, setDownloading] = useState<boolean>(false);
  // Every claim matching the filters, in table order; filteredClaims holds only the visible page
  const allMatchingClaims = useRef<InsuranceClaim[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);

  // Refs for scrollbar synchronization
  const topScrollRef = useRef<HTMLDivElement>(null);
  const bottomScrollRef = useRef<HTMLDivElement>(null);

  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  // Canada / USA tabs (client: all claims showed in one place)
  const [countryFilter, setCountryFilter] = useState<'all' | 'canada' | 'usa'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortField, setSortField] = useState<string>('claimDate');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Pagination state
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize] = useState<number>(10);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [total, setTotal] = useState<number>(0);

  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [showEditModal, setShowEditModal] = useState<boolean>(false);
  const [showViewModal, setShowViewModal] = useState<boolean>(false);
  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);
  const [selectedClaim, setSelectedClaim] = useState<InsuranceClaim | null>(null);
  const [claimToDelete, setClaimToDelete] = useState<InsuranceClaim | null>(null);

  const [notifications, setNotifications] = useState<Array<{ id: number; type: 'success' | 'error' | 'info'; message: string }>>([]);
  const [notificationId, setNotificationId] = useState(0);

  const [newDocuments, setNewDocuments] = useState<File[]>([]);
  const [removedDocuments, setRemovedDocuments] = useState<string[]>([]);

  const [claimForm, setClaimForm] = useState<ClaimForm>({
    claimNumber: '',
    accidentNumber: '',
    incidentDate: '',
    claimDate: new Date().toISOString().split('T')[0],
    claimType: 'accident',
    status: 'pending',
    amount: '',
    deductible: '',
    driver: '',
    vehicle: '',
    insuranceCompany: '',
    policyNumber: '',
    adjusterName: '',
    adjusterContact: '',
    description: '',
    location: '',
    country: '',
    notes: ''
  });

  // Fetch data on component mount
  useEffect(() => {
    fetchClaims();
    fetchVehicles();
    fetchDrivers();
  }, []);

  // Apply filters and search
  useEffect(() => {
    applyFilters();
  }, [claims, statusFilter, typeFilter, searchQuery, sortField, sortDirection, countryFilter]);

  const addNotification = (type: 'success' | 'error' | 'info', message: string) => {
    const id = notificationId + 1;
    setNotificationId(id);
    setNotifications([...notifications, { id, type, message }]);
  };

  const removeNotification = (id: number) => {
    setNotifications(notifications.filter(n => n.id !== id));
  };

  const fetchClaims = async () => {
    setLoading(true);
    try {
      const { getInsuranceClaims } = await import('../../../../axios/api/insuranceClaim');
      // The API returns 10 claims by default, but this page filters and pages on the client
      const filters = {
        status: statusFilter !== 'all' ? statusFilter : undefined,
        claimType: typeFilter !== 'all' ? typeFilter : undefined,
        search: searchQuery || undefined,
        limit: 200
      };
      let response = await getInsuranceClaims({ ...filters, page: 1 });
      if (response?.success) {
        const all: InsuranceClaim[] = [...(response.data || [])];
        for (let page = 2; page <= (response.pagination?.pages || 1); page++) {
          response = await getInsuranceClaims({ ...filters, page });
          all.push(...(response?.data || []));
        }
        setClaims(all);
      }
    } catch (error) {
      console.error('Error fetching insurance claims:', error);
      addNotification('error', 'Failed to fetch insurance claims');
    } finally {
      setLoading(false);
    }
  };

  const fetchVehicles = async () => {
    try {
      const { getAllVehicles } = await import('../../../../axios/api/vehicle');
      const response = await getAllVehicles();
      if (response?.success && Array.isArray(response.data)) {
        setVehicles(response.data);
      }
    } catch (error) {
      console.error('Error fetching vehicles:', error);
    }
  };

  const fetchDrivers = async () => {
    try {
      const { listDriver } = await import('../../../../axios/api/distapcher');
      const response = await listDriver();
      if (response?.success && Array.isArray(response.data)) {
        setDrivers(response.data);
      }
    } catch (error) {
      console.error('Error fetching drivers:', error);
    }
  };

  const applyFilters = () => {
    let filtered = [...claims];

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(claim => claim.status === statusFilter);
    }

    // Type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter(claim => claim.claimType === typeFilter);
    }

    // Country tab
    if (countryFilter !== 'all') {
      filtered = filtered.filter(claim => claim.country === countryFilter);
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(claim =>
        claim.claimNumber?.toLowerCase().includes(query) ||
        claim.accidentNumber?.toLowerCase().includes(query) ||
        (typeof claim.driver === 'object' ? claim.driver?.name?.toLowerCase().includes(query) : '') ||
        (typeof claim.vehicle === 'object' ? claim.vehicle?.internalId?.toLowerCase().includes(query) : '') ||
        claim.insuranceCompany?.toLowerCase().includes(query) ||
        claim.policyNumber?.toLowerCase().includes(query) ||
        claim.description?.toLowerCase().includes(query)
      );
    }

    // Sorting
    filtered.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortField) {
        case 'claimDate':
          aValue = new Date(a.claimDate).getTime();
          bValue = new Date(b.claimDate).getTime();
          break;
        case 'incidentDate':
          aValue = new Date(a.incidentDate).getTime();
          bValue = new Date(b.incidentDate).getTime();
          break;
        case 'amount':
          aValue = a.amount || 0;
          bValue = b.amount || 0;
          break;
        case 'claimNumber':
          aValue = a.claimNumber || '';
          bValue = b.claimNumber || '';
          break;
        default:
          aValue = a.claimDate;
          bValue = b.claimDate;
      }

      if (sortDirection === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    // Pagination
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    setTotal(filtered.length);
    setTotalPages(Math.ceil(filtered.length / pageSize));
    allMatchingClaims.current = filtered;
    setFilteredClaims(filtered.slice(startIndex, endIndex));
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const handleDownloadReport = async () => {
    const rows = allMatchingClaims.current;
    if (rows.length === 0) {
      addNotification('info', 'No insurance claims match these filters');
      return;
    }
    setDownloading(true);
    try {
      // Claim dates are saved as a calendar day at midnight UTC, so read the day directly
      const day = (value?: string) => (value ? value.slice(0, 10) : '');
      const label = (value: string) => value.charAt(0).toUpperCase() + value.slice(1).replace('-', ' ');
      const columns: ExcelColumn<InsuranceClaim>[] = [
        { header: 'Claim #', width: 18, value: (c) => c.claimNumber },
        { header: 'Accident #', width: 18, value: (c) => c.accidentNumber },
        { header: 'Incident Date', width: 13, value: (c) => day(c.incidentDate) },
        { header: 'Claim Date', width: 13, value: (c) => day(c.claimDate) },
        { header: 'Type', width: 12, value: (c) => label(c.claimType) },
        { header: 'Status', width: 13, value: (c) => label(c.status) },
        { header: 'Driver', width: 20, value: (c) => (typeof c.driver === 'object' ? c.driver?.name : '') },
        { header: 'Vehicle', width: 16, value: (c) => (typeof c.vehicle === 'object' ? c.vehicle?.internalId || c.vehicle?.plateNumber : '') },
        { header: 'Country', width: 10, value: (c) => (c.country === 'canada' ? 'Canada' : c.country === 'usa' ? 'USA' : '') },
        { header: 'Insurance Company', width: 24, value: (c) => c.insuranceCompany },
        { header: 'Policy #', width: 18, value: (c) => c.policyNumber },
        { header: 'Adjuster', width: 18, value: (c) => c.adjusterName },
        { header: 'Adjuster Contact', width: 20, value: (c) => c.adjusterContact },
        { header: 'Amount', width: 13, numFmt: MONEY_FMT, value: (c) => c.amount },
        { header: 'Deductible', width: 13, numFmt: MONEY_FMT, value: (c) => c.deductible },
        { header: 'Claim Amount', width: 14, numFmt: MONEY_FMT, value: (c) => c.claimAmount },
        { header: 'Location', width: 24, value: (c) => c.location },
        { header: 'Description', width: 40, value: (c) => c.description },
        { header: 'Notes', width: 30, value: (c) => c.notes },
      ];
      await downloadExcel('Insurance_Claims_Report', [{ name: 'Insurance Claims', columns, rows }]);
      addNotification('success', `Downloaded ${rows.length} insurance claim${rows.length === 1 ? '' : 's'}`);
    } catch (error) {
      console.error('Error downloading insurance claims report:', error);
      addNotification('error', 'Failed to download the report. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  const handleAdd = () => {
    setSelectedClaim(null);
    setNewDocuments([]);
    setRemovedDocuments([]);
    setClaimForm({
      claimNumber: '',
      accidentNumber: '',
      incidentDate: '',
      claimDate: new Date().toISOString().split('T')[0],
      claimType: 'accident',
      status: 'pending',
      amount: '',
      deductible: '',
      driver: '',
      vehicle: '',
      insuranceCompany: '',
      policyNumber: '',
      adjusterName: '',
      adjusterContact: '',
      description: '',
      location: '',
      country: countryFilter !== 'all' ? countryFilter : '',
      notes: ''
    });
    setShowAddModal(true);
  };

  const handleEdit = (claim: InsuranceClaim) => {
    setSelectedClaim(claim);
    setNewDocuments([]);
    setRemovedDocuments([]);
    setClaimForm({
      claimNumber: claim.claimNumber || '',
      accidentNumber: claim.accidentNumber || '',
      incidentDate: claim.incidentDate ? new Date(claim.incidentDate).toISOString().split('T')[0] : '',
      claimDate: claim.claimDate ? new Date(claim.claimDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      claimType: claim.claimType,
      status: claim.status,
      amount: claim.amount?.toString() || '',
      deductible: claim.deductible?.toString() || '',
      driver: typeof claim.driver === 'object' ? claim.driver._id : claim.driver || '',
      vehicle: typeof claim.vehicle === 'object' ? claim.vehicle._id : claim.vehicle || '',
      insuranceCompany: claim.insuranceCompany || '',
      policyNumber: claim.policyNumber || '',
      adjusterName: claim.adjusterName || '',
      adjusterContact: claim.adjusterContact || '',
      description: claim.description || '',
      location: claim.location || '',
      country: claim.country || '',
      notes: claim.notes || ''
    });
    setShowEditModal(true);
  };

  const handleView = (claim: InsuranceClaim) => {
    setSelectedClaim(claim);
    setShowViewModal(true);
  };

  const handleDelete = (claim: InsuranceClaim) => {
    setClaimToDelete(claim);
    setShowDeleteModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!claimForm.country) {
      addNotification('error', 'Please choose the country (Canada or USA)');
      return;
    }
    setLoading(true);
    try {
      const { createInsuranceClaim, updateInsuranceClaim } = await import('../../../../axios/api/insuranceClaim');
      // Sent as multipart so document files can go with the claim
      const claimData = new FormData();
      Object.entries({
        ...claimForm,
        amount: String(parseFloat(claimForm.amount) || 0),
        deductible: String(parseFloat(claimForm.deductible) || 0),
      }).forEach(([key, value]) => {
        if (value !== undefined && value !== null) claimData.append(key, String(value));
      });
      newDocuments.forEach((file) => claimData.append('documents', file));
      if (removedDocuments.length > 0) claimData.append('removeDocuments', JSON.stringify(removedDocuments));

      if (selectedClaim) {
        const response = await updateInsuranceClaim(selectedClaim._id, claimData);
        if (response?.success) {
          addNotification('success', 'Insurance claim updated successfully');
          fetchClaims();
          setShowEditModal(false);
          setSelectedClaim(null);
        } else {
          addNotification('error', response?.message || 'Failed to update insurance claim');
        }
      } else {
        const response = await createInsuranceClaim(claimData);
        if (response?.success) {
          addNotification('success', 'Insurance claim created successfully');
          fetchClaims();
          setShowAddModal(false);
        } else {
          addNotification('error', response?.message || 'Failed to create insurance claim');
        }
      }
    } catch (error: any) {
      console.error('Error saving insurance claim:', error);
      addNotification('error', error?.message || 'Failed to save insurance claim');
    } finally {
      setLoading(false);
    }
  };

  const confirmDelete = async () => {
    if (!claimToDelete) return;
    setLoading(true);
    try {
      const { deleteInsuranceClaim } = await import('../../../../axios/api/insuranceClaim');
      const response = await deleteInsuranceClaim(claimToDelete._id);
      if (response?.success) {
        addNotification('success', 'Insurance claim deleted successfully');
        fetchClaims();
        setShowDeleteModal(false);
        setClaimToDelete(null);
      } else {
        addNotification('error', response?.message || 'Failed to delete insurance claim');
      }
    } catch (error: any) {
      console.error('Error deleting insurance claim:', error);
      addNotification('error', error?.message || 'Failed to delete insurance claim');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'denied':
        return 'bg-red-100 text-red-800';
      case 'under-review':
        return 'bg-yellow-100 text-yellow-800';
      case 'submitted':
        return 'bg-blue-100 text-blue-800';
      case 'closed':
        return 'bg-card text-primary';
      default:
        return 'bg-card text-primary';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'accident':
        return 'bg-red-100 text-red-800';
      case 'theft':
        return 'bg-purple-100 text-purple-800';
      case 'damage':
        return 'bg-orange-100 text-orange-800';
      case 'liability':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-card text-primary';
    }
  };

  const getSortIcon = (field: string) => {
    if (sortField !== field) return <FaSort className="text-secondary" size={12} />;
    return sortDirection === 'asc' ? <FaSortUp className="text-[var(--accent-blue)]" size={12} /> : <FaSortDown className="text-[var(--accent-blue)]" size={12} />;
  };

  // Sync scrollbars
  useEffect(() => {
    const topScroll = topScrollRef.current;
    const bottomScroll = bottomScrollRef.current;

    if (!topScroll || !bottomScroll) return;

    const handleTopScroll = () => {
      bottomScroll.scrollLeft = topScroll.scrollLeft;
    };

    const handleBottomScroll = () => {
      topScroll.scrollLeft = bottomScroll.scrollLeft;
    };

    topScroll.addEventListener('scroll', handleTopScroll);
    bottomScroll.addEventListener('scroll', handleBottomScroll);

    return () => {
      topScroll.removeEventListener('scroll', handleTopScroll);
      bottomScroll.removeEventListener('scroll', handleBottomScroll);
    };
  }, [filteredClaims]);

  return (
    <div className="min-h-screen bg-card" style={ACCENT_VARS}>
      {/* Notifications */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {notifications.map(notification => (
          <ToastNotification
            key={notification.id}
            notification={notification}
            onRemove={() => removeNotification(notification.id)}
          />
        ))}
      </div>

      <div className="p-6">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-[var(--accent-navyblue)] flex items-center gap-3">
              <FaShieldAlt className="text-[var(--accent-navyblue)]" size={32} />
              Insurance Claims
            </h1>
            <p className="text-secondary mt-2">Manage and track all insurance claims</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleDownloadReport}
              disabled={downloading || loading}
              className="flex items-center gap-2 px-4 py-2 border border-theme text-primary rounded-lg hover:bg-[var(--accent-navyblue)]/10 transition-colors font-medium disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <FaDownload size={14} />
              {downloading ? 'Downloading...' : 'Download Report'}
            </button>
            <button
              onClick={handleAdd}
              className="flex items-center gap-2 px-4 py-2 bg-[var(--accent-navyblue)] !text-white rounded-lg hover:bg-[var(--accent-navyblue)]/80 transition-colors font-medium"
            >
              <FaPlus size={16} />
              Add Claim
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-[var(--accent-blue)]/20 rounded-lg shadow-sm border border-theme p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-secondary">Total Claims</p>
                <p className="text-2xl font-bold text-primary">{claims.length}</p>
              </div>
              <FaShieldAlt className="text-[var(--accent-blue)]" size={24} />
            </div>
          </div>
          <div className="bg-[var(--accent-amber)]/20 rounded-lg shadow-sm border border-theme p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-secondary">Pending</p>
                <p className="text-2xl font-bold text-primary">
                  {claims.filter(c => c.status === 'pending').length}
                </p>
              </div>
              <FaExclamationCircle className="text-[var(--accent-amber)]" size={24} />
            </div>
          </div>
          <div className="bg-[var(--accent-green)]/20 rounded-lg shadow-sm border border-theme p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-secondary">Approved</p>
                <p className="text-2xl font-bold text-primary">
                  {claims.filter(c => c.status === 'approved').length}
                </p>
              </div>
              <FaCheckCircle className="text-[var(--accent-green)]" size={24} />
            </div>
          </div>
          <div className="bg-[var(--accent-purple)]/20 rounded-lg shadow-sm border border-theme p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-secondary">Total Amount</p>
                <p className="text-2xl font-bold text-primary">
                  ${claims.reduce((sum, c) => sum + (c.amount || 0), 0).toLocaleString()}
                </p>
              </div>
              <FaDollarSign className="text-[var(--accent-purple)]" size={24} />
            </div>
          </div>
        </div>

        {/* Country tabs */}
        <div className="bg-card rounded-lg shadow-sm border border-theme p-4 mb-4 flex flex-wrap gap-2">
          {([
            { key: 'all', label: 'All', count: claims.length },
            { key: 'canada', label: 'Canada', count: claims.filter(c => c.country === 'canada').length },
            { key: 'usa', label: 'USA', count: claims.filter(c => c.country === 'usa').length },
          ] as const).map(t => (
            <button
              key={t.key}
              onClick={() => setCountryFilter(t.key)}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${countryFilter === t.key
                ? 'bg-[var(--accent-navyblue)] text-white'
                : 'text-secondary hover:bg-[rgba(15,31,23,0.03)]'}`}
            >
              {t.label} ({t.count})
            </button>
          ))}
          {claims.some(c => !c.country) && (
            <span className="text-xs text-secondary self-center ml-2">
              {claims.filter(c => !c.country).length} claim(s) have no country yet. They show under All; edit them to choose Canada or USA.
            </span>
          )}
        </div>

        {/* Filters */}
        <div className="bg-card rounded-lg shadow-sm border border-theme p-4 mb-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-[250px]">
              <div className="relative">
                <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-secondary" size={16} />
                <input
                  type="text"
                  placeholder="Search by claim number, driver, vehicle, policy..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)]"
                />
              </div>
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 text-sm border border-theme rounded-lg
  bg-[var(--bg-card)] text-[var(--text-primary)]
  focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)]
  focus:border-[var(--accent-blue)]
  cursor-pointer transition-all"
            >
              <option value="all" className="bg-[var(--bg-card)] text-[var(--text-primary)]">
                All Status
              </option>

              <option value="pending" className="bg-[var(--bg-card)] text-[var(--text-primary)]">
                Pending
              </option>

              <option value="submitted" className="bg-[var(--bg-card)] text-[var(--text-primary)]">
                Submitted
              </option>

              <option value="under-review" className="bg-[var(--bg-card)] text-[var(--text-primary)]">
                Under Review
              </option>

              <option value="approved" className="bg-[var(--bg-card)] text-[var(--text-primary)]">
                Approved
              </option>

              <option value="denied" className="bg-[var(--bg-card)] text-[var(--text-primary)]">
                Denied
              </option>

              <option value="closed" className="bg-[var(--bg-card)] text-[var(--text-primary)]">
                Closed
              </option>
            </select>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-4 py-2 text-sm border border-theme rounded-lg
  bg-[var(--bg-card)] text-[var(--text-primary)]
  focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)]
  focus:border-[var(--accent-blue)]
  cursor-pointer transition-all"
            >
              <option value="all" className="bg-[var(--bg-card)] text-[var(--text-primary)]">
                All Types
              </option>

              <option value="accident" className="bg-[var(--bg-card)] text-[var(--text-primary)]">
                Accident
              </option>

              <option value="theft" className="bg-[var(--bg-card)] text-[var(--text-primary)]">
                Theft
              </option>

              <option value="damage" className="bg-[var(--bg-card)] text-[var(--text-primary)]">
                Damage
              </option>

              <option value="liability" className="bg-[var(--bg-card)] text-[var(--text-primary)]">
                Liability
              </option>

              <option value="other" className="bg-[var(--bg-card)] text-[var(--text-primary)]">
                Other
              </option>
            </select>
          </div>
        </div>

        {/* Claims Table */}
        <div className="bg-card rounded-lg shadow-sm border border-theme overflow-hidden">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--accent-blue)]"></div>
            </div>
          ) : filteredClaims.length === 0 ? (
            <div className="text-center py-12 text-secondary">
              <FaShieldAlt className="mx-auto mb-4 text-secondary" size={48} />
              <p className="text-lg font-medium">No insurance claims found</p>
              <p className="text-sm">Click "Add Claim" to create a new insurance claim</p>
            </div>
          ) : (
            <>
              {/* Scrollable Header */}
              <div ref={topScrollRef} className="overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300">
                <table className="w-full min-w-[1200px]">
                  <thead className="bg-card border-b border-theme">
                    <tr>
                      <th
                        className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider cursor-pointer hover:bg-[rgba(15,31,23,0.03)]"
                        onClick={() => handleSort('claimNumber')}
                      >
                        <div className="flex items-center gap-2">
                          Claim Number
                          {getSortIcon('claimNumber')}
                        </div>
                      </th>
                      <th className="px-6 py-3 pl-8 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                        Accident Number
                      </th>
                      <th
                        className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider cursor-pointer hover:bg-[rgba(15,31,23,0.03)]"
                        onClick={() => handleSort('incidentDate')}
                      >
                        <div className="flex items-center gap-2">
                          Incident Date
                          {getSortIcon('incidentDate')}
                        </div>
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                        Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                        Driver
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                        Vehicle
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                        Insurance Company
                      </th>
                      <th
                        className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider cursor-pointer hover:bg-[rgba(15,31,23,0.03)]"
                        onClick={() => handleSort('amount')}
                      >
                        <div className="flex items-center gap-2">
                          Amount
                          {getSortIcon('amount')}
                        </div>
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-secondary uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                </table>
              </div>

              {/* Scrollable Body */}
              <div ref={bottomScrollRef} className="overflow-x-auto max-h-[600px] scrollbar-thin scrollbar-thumb-gray-300">
                <table className="w-full min-w-[1200px]">
                  <tbody className="bg-card divide-y divide-theme">
                    {filteredClaims.map((claim) => (
                      <tr key={claim._id} className="hover:bg-[rgba(15,31,23,0.03)] transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex flex-col h-[3.5rem] justify-center">
                            <div className="text-sm font-medium text-primary leading-5">{claim.claimNumber || 'N/A'}</div>
                            <div className="text-xs text-secondary leading-4">{claim.policyNumber || 'No Policy #'}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 pl-8">
                          <div className="flex flex-col h-[3.5rem] justify-center">
                            <div className="text-sm text-primary leading-5">{claim.accidentNumber || '—'}</div>
                            <div className="text-xs text-secondary leading-4">&nbsp;</div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col h-[3.5rem] justify-center">
                            <div className="text-sm text-primary leading-5">
                              {claim.incidentDate ? new Date(claim.incidentDate).toLocaleDateString(undefined, { timeZone: 'UTC' }) : 'N/A'}
                            </div>
                            <div className="text-xs text-secondary leading-4">
                              Claim: {claim.claimDate ? new Date(claim.claimDate).toLocaleDateString(undefined, { timeZone: 'UTC' }) : 'N/A'}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col h-[3.5rem] justify-center">
                            <div className="flex items-center leading-5">
                              <span className={`px-2 py-1 text-xs font-medium rounded-full ${getTypeColor(claim.claimType)}`}>
                                {claim.claimType.charAt(0).toUpperCase() + claim.claimType.slice(1)}
                              </span>
                            </div>
                            <div className="text-xs text-secondary leading-4">&nbsp;</div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col h-[3.5rem] justify-center">
                            <div className="text-sm text-primary leading-5">
                              {typeof claim.driver === 'object' ? claim.driver?.name || 'N/A' : 'N/A'}
                            </div>
                            <div className="text-xs text-secondary leading-4">&nbsp;</div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col h-[3.5rem] justify-center">
                            <div className="text-sm text-primary leading-5">
                              {typeof claim.vehicle === 'object'
                                ? claim.vehicle?.internalId || claim.vehicle?.plateNumber || 'N/A'
                                : 'N/A'}
                            </div>
                            <div className="text-xs text-secondary leading-4">&nbsp;</div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col h-[3.5rem] justify-center">
                            <div className="text-sm text-primary leading-5">{claim.insuranceCompany || 'N/A'}</div>
                            <div className="text-xs text-secondary">{claim.country === 'canada' ? 'Canada' : claim.country === 'usa' ? 'USA' : 'Country not set'}{claim.countryIsGuess ? ' (check)' : ''}</div>
                            <div className="text-xs text-secondary leading-4">
                              {claim.adjusterName ? `Adjuster: ${claim.adjusterName}` : '\u00A0'}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col h-[3.5rem] justify-center">
                            <div className="text-sm font-semibold text-primary leading-5">
                              ${(claim.amount || 0).toLocaleString()}
                            </div>
                            <div className="text-xs text-secondary leading-4">
                              {claim.deductible ? `Deductible: $${claim.deductible.toLocaleString()}` : '\u00A0'}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col h-[3.5rem] justify-center">
                            <div className="flex items-center leading-5">
                              <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(claim.status)}`}>
                                {claim.status.charAt(0).toUpperCase() + claim.status.slice(1).replace('-', ' ')}
                              </span>
                            </div>
                            <div className="text-xs text-secondary leading-4">&nbsp;</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <div className="flex flex-col h-[3.5rem] justify-center items-end">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleView(claim)}
                                className="text-[#059669] hover:text-[var(--accent-blue)] p-2 hover:bg-[var(--accent-blue)]/15 rounded transition-colors"
                                title="View Details"
                              >
                                <FaEye size={16} />
                              </button>
                              <button
                                onClick={() => handleEdit(claim)}
                                className="text-[#059669] hover:text-[var(--accent-blue)] p-2 hover:bg-[var(--accent-blue)]/15 rounded transition-colors"
                                title="Edit"
                              >
                                <FaEdit size={16} />
                              </button>
                              <button
                                onClick={() => handleDelete(claim)}
                                className="text-red-400 hover:text-red-500 p-2 hover:bg-red-500/15 rounded transition-colors"
                                title="Delete"
                              >
                                <FaTrash size={16} />
                              </button>
                            </div>
                            <div className="text-xs text-secondary leading-4">&nbsp;</div>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="bg-card px-6 py-4 border-t border-theme flex items-center justify-between">
                  <div className="text-sm text-primary">
                    Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, total)} of {total} claims
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className="p-2 border border-theme rounded-lg hover:bg-[rgba(15,31,23,0.03)] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <FaChevronLeft size={16} />
                    </button>
                    <span className="px-4 py-2 text-sm text-primary">
                      Page {currentPage} of {totalPages}
                    </span>
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                      className="p-2 border border-theme rounded-lg hover:bg-[rgba(15,31,23,0.03)] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <FaChevronRight size={16} />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Add/Edit Modal */}
      {(showAddModal || showEditModal) && (
        <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-card border-b border-theme px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-headings">
                {showEditModal ? 'Edit Insurance Claim' : 'Add New Insurance Claim'}
              </h2>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setShowEditModal(false);
                  setSelectedClaim(null);
                }}
                className="text-secondary hover:text-secondary"
              >
                <FaTimes size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-headings mb-2">
                    Claim Number *
                  </label>
                  <input
                    type="text"
                    value={claimForm.claimNumber || ''}
                    onChange={(e) => setClaimForm({ ...claimForm, claimNumber: e.target.value })}
                    className="w-full px-4 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)]"
                    placeholder="Auto-generated or enter manually"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-headings mb-2">
                    Accident Number
                  </label>
                  <input
                    type="text"
                    value={claimForm.accidentNumber || ''}
                    onChange={(e) => setClaimForm({ ...claimForm, accidentNumber: e.target.value })}
                    className="w-full px-4 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)]"
                    placeholder="Enter accident number"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-headings mb-2">
                    Claim Type *
                  </label>
                  <select
                    value={claimForm.claimType}
                    onChange={(e) =>
                      setClaimForm({
                        ...claimForm,
                        claimType: e.target.value as any,
                      })
                    }
                    className="w-full px-4 py-2 text-sm border border-theme rounded-lg
  bg-[var(--bg-card)] text-[var(--text-primary)]
  focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)]
  focus:border-[var(--accent-blue)]
  cursor-pointer transition-all"
                  >
                    <option value="accident" className="bg-[var(--bg-card)] text-[var(--text-primary)]">
                      Accident
                    </option>

                    <option value="theft" className="bg-[var(--bg-card)] text-[var(--text-primary)]">
                      Theft
                    </option>

                    <option value="damage" className="bg-[var(--bg-card)] text-[var(--text-primary)]">
                      Damage
                    </option>

                    <option value="liability" className="bg-[var(--bg-card)] text-[var(--text-primary)]">
                      Liability
                    </option>

                    <option value="other" className="bg-[var(--bg-card)] text-[var(--text-primary)]">
                      Other
                    </option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-headings mb-2">
                    Incident Date *
                  </label>
                  <input
                    type="date"
                    value={claimForm.incidentDate}
                    onChange={(e) => setClaimForm({ ...claimForm, incidentDate: e.target.value })}
                    className="w-full px-4 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)]"
                    style={{ colorScheme: 'dark' }}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-headings mb-2">
                    Claim Date *
                  </label>
                  <input
                    type="date"
                    value={claimForm.claimDate}
                    onChange={(e) => setClaimForm({ ...claimForm, claimDate: e.target.value })}
                    className="w-full px-4 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)]"
                    required
                    style={{ colorScheme: 'dark' }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-headings mb-2">
                    Status *
                  </label>
                  <select
                    value={claimForm.status}
                    onChange={(e) =>
                      setClaimForm((prev) => ({
                        ...prev,
                        status: e.target.value as any,
                      }))
                    }
                    className="w-full px-4 py-2 text-sm border border-theme rounded-lg
  bg-[var(--bg-card)] text-[var(--text-primary)]
  focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)]
  focus:border-[var(--accent-blue)]
  cursor-pointer transition-all"
                  >
                    {[
                      { value: "pending", label: "Pending" },
                      { value: "submitted", label: "Submitted" },
                      { value: "under-review", label: "Under Review" },
                      { value: "approved", label: "Approved" },
                      { value: "denied", label: "Denied" },
                      { value: "closed", label: "Closed" },
                    ].map((opt) => (
                      <option
                        key={opt.value}
                        value={opt.value}
                        className="bg-[var(--bg-card)] text-[var(--text-primary)]"
                      >
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-headings mb-2">
                    Driver *
                  </label>
                  <select
                    value={claimForm.driver}
                    onChange={(e) =>
                      setClaimForm((prev) => ({
                        ...prev,
                        driver: e.target.value,
                      }))
                    }
                    required
                    className="w-full px-4 py-2 text-sm border border-theme rounded-lg
  bg-[var(--bg-card)] text-[var(--text-primary)]
  focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)]
  focus:border-[var(--accent-blue)]
  cursor-pointer transition-all"
                  >
                    <option
                      value=""
                      className="bg-[var(--bg-card)] text-[var(--text-primary)]"
                    >
                      Select Driver
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
                <div>
                  <label className="block text-sm font-medium text-headings mb-2">
                    Vehicle *
                  </label>
                  <select
                    value={claimForm.vehicle}
                    onChange={(e) =>
                      setClaimForm((prev) => ({
                        ...prev,
                        vehicle: e.target.value,
                      }))
                    }
                    required
                    className="w-full px-4 py-2 text-sm border border-theme rounded-lg
  bg-[var(--bg-card)] text-[var(--text-primary)]
  focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)]
  focus:border-[var(--accent-blue)]
  cursor-pointer transition-all"
                  >
                    <option
                      value=""
                      className="bg-[var(--bg-card)] text-[var(--text-primary)]"
                    >
                      Select Vehicle
                    </option>

                    {vehicles.map((vehicle) => {
                      const identifier =
                        vehicle.internalId || vehicle.plateNumber || "N/A";

                      const name = `${vehicle.make || ""} ${vehicle.model || ""}`.trim();

                      return (
                        <option
                          key={vehicle._id}
                          value={vehicle._id}
                          className="bg-[var(--bg-card)] text-[var(--text-primary)]"
                        >
                          {identifier} • {name || "Vehicle"}
                        </option>
                      );
                    })}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-headings mb-2">
                    Insurance Company *
                  </label>
                  <input
                    type="text"
                    value={claimForm.insuranceCompany}
                    onChange={(e) => setClaimForm({ ...claimForm, insuranceCompany: e.target.value })}
                    className="w-full px-4 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)]"
                    placeholder="Insurance company name"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-headings mb-2">
                    Policy Number *
                  </label>
                  <input
                    type="text"
                    value={claimForm.policyNumber}
                    onChange={(e) => setClaimForm({ ...claimForm, policyNumber: e.target.value })}
                    className="w-full px-4 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)]"
                    placeholder="Policy number"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-headings mb-2">
                    Claim Amount ($) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={claimForm.amount}
                    onChange={(e) => setClaimForm({ ...claimForm, amount: e.target.value })}
                    className="w-full px-4 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)]"
                    placeholder="0.00"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-headings mb-2">
                    Deductible ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={claimForm.deductible}
                    onChange={(e) => setClaimForm({ ...claimForm, deductible: e.target.value })}
                    className="w-full px-4 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)]"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-headings mb-2">
                    Adjuster Name
                  </label>
                  <input
                    type="text"
                    value={claimForm.adjusterName}
                    onChange={(e) => setClaimForm({ ...claimForm, adjusterName: e.target.value })}
                    className="w-full px-4 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)]"
                    placeholder="Adjuster name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-headings mb-2">
                    Adjuster Contact
                  </label>
                  <input
                    type="text"
                    value={claimForm.adjusterContact}
                    onChange={(e) => setClaimForm({ ...claimForm, adjusterContact: e.target.value })}
                    className="w-full px-4 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)]"
                    placeholder="Phone or email"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-headings mb-2">
                    Country *
                  </label>
                  <select
                    value={claimForm.country}
                    onChange={(e) => setClaimForm({ ...claimForm, country: e.target.value })}
                    className="w-full px-4 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)]"
                    required
                  >
                    <option className="form-option" value="">Select country</option>
                    <option className="form-option" value="canada">Canada</option>
                    <option className="form-option" value="usa">USA</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-headings mb-2">
                    Location
                  </label>
                  <input
                    type="text"
                    value={claimForm.location}
                    onChange={(e) => setClaimForm({ ...claimForm, location: e.target.value })}
                    className="w-full px-4 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)]"
                    placeholder="Incident location"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-headings mb-2">
                    Description *
                  </label>
                  <textarea
                    value={claimForm.description}
                    onChange={(e) => setClaimForm({ ...claimForm, description: e.target.value })}
                    className="w-full px-4 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)]"
                    rows={4}
                    placeholder="Describe the incident and claim details..."
                    required
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-headings mb-2">
                    Notes
                  </label>
                  <textarea
                    value={claimForm.notes}
                    onChange={(e) => setClaimForm({ ...claimForm, notes: e.target.value })}
                    className="w-full px-4 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)]"
                    rows={3}
                    placeholder="Additional notes..."
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-headings mb-2">
                    Documents (PDF / images)
                  </label>
                  {showEditModal && selectedClaim?.documentLinks && selectedClaim.documentLinks.filter((d) => !removedDocuments.includes(d.key)).length > 0 && (
                    <div className="mb-2 space-y-1">
                      {selectedClaim.documentLinks
                        .filter((d) => !removedDocuments.includes(d.key))
                        .map((d) => (
                          <div key={d.key} className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-lg border border-theme">
                            <a href={d.url} target="_blank" rel="noopener noreferrer" className="text-sm text-[var(--accent-blue)] underline truncate">
                              {d.name}
                            </a>
                            <button
                              type="button"
                              onClick={() => setRemovedDocuments((prev) => [...prev, d.key])}
                              className="text-xs text-[var(--accent-red)] hover:underline"
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                    </div>
                  )}
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                    multiple
                    onChange={(e) => {
                      const files = Array.from(e.target.files || []);
                      if (files.length) setNewDocuments((prev) => [...prev, ...files]);
                      e.target.value = '';
                    }}
                    className="w-full px-4 py-2 border border-theme rounded-lg text-sm file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:bg-[var(--accent-navyblue)] file:text-white"
                  />
                  {newDocuments.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {newDocuments.map((file, i) => (
                        <div key={`${file.name}-${i}`} className="flex items-center justify-between text-sm px-3 py-1 rounded border border-theme">
                          <span className="truncate text-primary">{file.name}</span>
                          <button
                            type="button"
                            onClick={() => setNewDocuments((prev) => prev.filter((_, idx) => idx !== i))}
                            className="text-xs text-[var(--accent-red)] hover:underline"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-end gap-4 pt-4 border-t border-theme">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setShowEditModal(false);
                    setSelectedClaim(null);
                  }}
                  className="px-6 py-2 border border-theme rounded-lg hover:bg-[rgba(15,31,23,0.03)] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2 bg-[var(--accent-navyblue)] !text-white rounded-lg hover:bg-[var(--accent-navyblue)]/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Saving...' : (showEditModal ? 'Update' : 'Create')} Claim
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Modal */}
      {showViewModal && selectedClaim && (
        <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-card border-b border-theme px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-primary">Insurance Claim Details</h2>
              <button
                onClick={() => {
                  setShowViewModal(false);
                  setSelectedClaim(null);
                }}
                className="text-secondary hover:text-secondary"
              >
                <FaTimes size={20} />
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-secondary mb-1">Claim Number</label>
                  <p className="text-lg font-semibold text-primary">{selectedClaim.claimNumber || 'N/A'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-secondary mb-1">Accident Number</label>
                  <p className="text-primary">{selectedClaim.accidentNumber || '—'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-secondary mb-1">Status</label>
                  <span className={`inline-block px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(selectedClaim.status)}`}>
                    {selectedClaim.status.charAt(0).toUpperCase() + selectedClaim.status.slice(1).replace('-', ' ')}
                  </span>
                </div>
                <div>
                  <label className="block text-sm font-medium text-secondary mb-1">Claim Type</label>
                  <span className={`inline-block px-3 py-1 text-sm font-medium rounded-full ${getTypeColor(selectedClaim.claimType)}`}>
                    {selectedClaim.claimType.charAt(0).toUpperCase() + selectedClaim.claimType.slice(1)}
                  </span>
                </div>
                <div>
                  <label className="block text-sm font-medium text-secondary mb-1">Incident Date</label>
                  <p className="text-primary">
                    {selectedClaim.incidentDate ? new Date(selectedClaim.incidentDate).toLocaleDateString(undefined, { timeZone: 'UTC' }) : 'N/A'}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-secondary mb-1">Claim Date</label>
                  <p className="text-primary">
                    {selectedClaim.claimDate ? new Date(selectedClaim.claimDate).toLocaleDateString(undefined, { timeZone: 'UTC' }) : 'N/A'}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-secondary mb-1">Driver</label>
                  <p className="text-primary">
                    {typeof selectedClaim.driver === 'object' ? selectedClaim.driver?.name : 'N/A'}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-secondary mb-1">Vehicle</label>
                  <p className="text-primary">
                    {typeof selectedClaim.vehicle === 'object'
                      ? `${selectedClaim.vehicle?.internalId || selectedClaim.vehicle?.plateNumber || 'N/A'} - ${selectedClaim.vehicle?.make || ''} ${selectedClaim.vehicle?.model || ''}`
                      : 'N/A'}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-secondary mb-1">Insurance Company</label>
                  <p className="text-primary">{selectedClaim.insuranceCompany || 'N/A'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-secondary mb-1">Policy Number</label>
                  <p className="text-primary">{selectedClaim.policyNumber || 'N/A'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-secondary mb-1">Claim Amount</label>
                  <p className="text-lg font-semibold text-primary">
                    ${(selectedClaim.amount || 0).toLocaleString()}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-secondary mb-1">Deductible</label>
                  <p className="text-primary">
                    ${(selectedClaim.deductible || 0).toLocaleString()}
                  </p>
                </div>
                {selectedClaim.adjusterName && (
                  <div>
                    <label className="block text-sm font-medium text-secondary mb-1">Adjuster</label>
                    <p className="text-primary">{selectedClaim.adjusterName}</p>
                    {selectedClaim.adjusterContact && (
                      <p className="text-sm text-secondary">{selectedClaim.adjusterContact}</p>
                    )}
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-secondary mb-1">Country</label>
                  <p className="text-primary">{selectedClaim.country === 'canada' ? 'Canada' : selectedClaim.country === 'usa' ? 'USA' : 'Not set'}</p>
                </div>
                {selectedClaim.location && (
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-secondary mb-1">Location</label>
                    <p className="text-primary">{selectedClaim.location}</p>
                  </div>
                )}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-secondary mb-1">Description</label>
                  <p className="text-primary whitespace-pre-wrap">{selectedClaim.description || 'N/A'}</p>
                </div>
                {selectedClaim.notes && (
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-secondary mb-1">Notes</label>
                    <p className="text-primary whitespace-pre-wrap">{selectedClaim.notes}</p>
                  </div>
                )}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-secondary mb-1">Documents</label>
                  {selectedClaim.documentLinks && selectedClaim.documentLinks.length > 0 ? (
                    <div className="space-y-1">
                      {selectedClaim.documentLinks.map((d) => (
                        <a key={d.key} href={d.url} target="_blank" rel="noopener noreferrer" className="block text-sm text-[var(--accent-blue)] underline truncate">
                          {d.name}
                        </a>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-secondary">No documents attached.</p>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-end gap-4 pt-4 border-t border-theme">
                <button
                  onClick={() => {
                    setShowViewModal(false);
                    setSelectedClaim(null);
                  }}
                  className="px-6 py-2 border border-theme rounded-lg hover:bg-[rgba(15,31,23,0.03)] transition-colors"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    setShowViewModal(false);
                    handleEdit(selectedClaim);
                  }}
                  className="px-6 py-2 bg-[var(--accent-navyblue)] text-white rounded-lg hover:bg-[var(--accent-navyblue)]/80 transition-colors"
                >
                  Edit Claim
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && claimToDelete && (
        <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="flex-shrink-0 w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                  <FaExclamationTriangle className="text-[#A855F7]" size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-primary">Delete Insurance Claim</h3>
                  <p className="text-sm text-secondary">This action cannot be undone</p>
                </div>
              </div>
              <p className="text-primary mb-6">
                Are you sure you want to delete the insurance claim <strong>{claimToDelete.claimNumber || 'N/A'}</strong>?
              </p>
              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setClaimToDelete(null);
                  }}
                  className="px-4 py-2 border border-theme rounded-lg hover:bg-[rgba(15,31,23,0.03)] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  disabled={loading}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  {loading ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InsuranceClaims;

