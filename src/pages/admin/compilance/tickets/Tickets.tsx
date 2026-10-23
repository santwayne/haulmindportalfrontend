import React, { useState, useEffect, useRef } from 'react';
import type { CSSProperties } from 'react';
import {
  FaTicketAlt,
  FaPlus,
  FaEdit,
  FaTrash,
  FaEye,
  FaSearch,
  FaFilter,
  FaCalendarAlt,
  FaMapMarkerAlt,
  FaGavel,
  FaCheckCircle,
  FaTimesCircle,
  FaExclamationCircle,
  FaInfoCircle,
  FaExclamationTriangle,
  FaSort,
  FaSortUp,
  FaSortDown,
  FaTimes,
  FaChevronLeft,
  FaChevronRight,
  FaFlag,
  FaFlagUsa
} from 'react-icons/fa';
import {
  getTickets,
  getTicketStats,
  createTicket,
  updateTicket,
  deleteTicket
} from '../../../../axios/api/admin';
import { getAllVehicles } from '../../../../axios/api/vehicle';
import { getAllTrailers } from '../../../../axios/api/trailer';
import { listDriver } from '../../../../axios/api/distapcher';
import { FLEET_COLORS } from '../../fleetMaintenance/colorUtils';

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
interface Ticket {
  _id: string;
  ticketNumber: string;
  country: 'usa' | 'canada';
  violationType: string;
  violationDescription: string;
  dateIssued: string;
  location: string; // Province (Canada) or State (USA)
  amount: number; // Fine Amount
  finalAmount?: number; // Final amount after reduction
  status: 'paid' | 'unpaid' | 'fight' | 'dismissed' | 'reduced';
  outcome?: 'paid' | 'reduced' | 'dismissed' | 'on fight' | 'unpaid';
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
    year?: number;
  } | string;
  unitNumber?: string; // Unit number (separate from vehicle)
  trailerNumber?: string; // Trailer number
  officerName: string;
  dueDate: string;
  courtDate?: string;
  fightingBy?: 'company' | 'lawyer'; // Who is fighting the ticket
  lawyerDetails?: LawyerDetails;
  notes?: string;
  paidDate?: string;
  paymentMethod?: string;
  paymentReference?: string;
  createdAt: string;
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

interface Trailer {
  _id: string;
  unitNo?: string;
  trailer?: string;
  internalId?: string;
  plateNumber?: string;
  licensePlate?: string;
}

interface LawyerDetails {
  name: string;
  firm: string;
  phone: string;
  email: string;
  address: string;
  caseNumber?: string;
  courtDate?: string;
  status: 'active' | 'closed' | 'pending';
}

interface TicketStats {
  total: number;
  paid: number;
  unpaid: number;
  fight: number;
  dismissed: number;
  reduced: number;
  totalAmount: number;
  paidAmount: number;
  unpaidAmount: number;
  fightAmount: number;
  dismissedAmount: number;
  reducedAmount: number;
  usaTotal?: number;
  canadaTotal?: number;
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
  const toneStyles: Record<NotificationType, { className: string; style?: CSSProperties; icon: React.ReactNode }> = {
    success: { className: 'bg-green-50 border-green-200', icon: <FaCheckCircle className="text-green-600" size={20} /> },
    error: { className: 'bg-card border-red-200', icon: <FaExclamationCircle className="text-[#A855F7]" size={20} /> },
    info: {
      className: '',
      style: { backgroundColor: ACCENT_SOFT, borderColor: ACCENT_SOFT_BORDER },
      icon: <FaInfoCircle className="text-[var(--accent-color)]" size={20} />
    },
    warning: { className: 'bg-card border-yellow-200', icon: <FaExclamationTriangle className="text-[#00FFA3]" size={20} /> }
  };

  const tone = toneStyles[notification.type];

  return (
    <div
      className={`flex items-start gap-3 p-4 rounded-lg border-2 shadow-lg ${tone.className} animate-slide-in`}
      style={tone.style}
    >
      <div className="flex-shrink-0 mt-0.5">
        {tone.icon}
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

const Tickets: React.FC = () => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [filteredTickets, setFilteredTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [trailers, setTrailers] = useState<Trailer[]>([]);

  // Refs for scrollbar synchronization
  const topScrollRef = useRef<HTMLDivElement>(null);
  const bottomScrollRef = useRef<HTMLDivElement>(null);

  const [activeTab, setActiveTab] = useState<'usa' | 'canada' | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortField, setSortField] = useState<string>('dateIssued');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Pagination state
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [total, setTotal] = useState<number>(0);
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [showEditModal, setShowEditModal] = useState<boolean>(false);
  const [showViewModal, setShowViewModal] = useState<boolean>(false);
  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [ticketToDelete, setTicketToDelete] = useState<Ticket | null>(null);
  const [stats, setStats] = useState<TicketStats>({
    total: 0,
    paid: 0,
    unpaid: 0,
    fight: 0,
    dismissed: 0,
    reduced: 0,
    totalAmount: 0,
    paidAmount: 0,
    unpaidAmount: 0,
    fightAmount: 0,
    dismissedAmount: 0,
    reducedAmount: 0,
    usaTotal: 0,
    canadaTotal: 0
  });

  const [ticketForm, setTicketForm] = useState<Partial<Ticket>>({
    country: 'usa',
    violationType: '',
    violationDescription: '',
    dateIssued: '',
    location: '',
    amount: 0,
    finalAmount: undefined,
    status: 'unpaid',
    outcome: 'unpaid',
    driver: '',
    vehicle: '',
    unitNumber: '',
    trailerNumber: '',
    officerName: '',
    dueDate: '',
    courtDate: '',
    fightingBy: undefined,
    notes: '',
    lawyerDetails: undefined,
    paidDate: '',
    paymentMethod: '',
    paymentReference: ''
  });
  const [notifications, setNotifications] = useState<ToastNotification[]>([]);
  const notificationIdRef = useRef(0);

  // Fetch vehicles, drivers, and trailers (using Vehicle and Trailer models)
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
          const driverList = Array.isArray(res.data)
            ? res.data.filter((d: any) => d.role === 'driver')
            : (res.data?.drivers || []).filter((d: any) => d.role === 'driver');
          setDrivers(driverList);
        }
      } catch (error) {
        console.error('Error fetching drivers:', error);
      }
    };

    const fetchTrailers = async () => {
      try {
        const res = await getAllTrailers(1, 1000);
        if (res?.success && res?.data) {
          // Map Trailer to Trailer interface format
          const mappedTrailers: Trailer[] = res.data.map((trailer: any) => ({
            _id: trailer._id,
            unitNo: trailer.unitNumber || trailer.trailer || trailer.internalId,
            trailer: trailer.unitNumber || trailer.trailer || trailer.internalId || 'N/A',
            internalId: trailer.internalId || trailer.unitNumber || trailer.trailer,
            plateNumber: trailer.plateNumber || 'N/A',
            licensePlate: trailer.plateNumber
          }));
          setTrailers(mappedTrailers);
        }
      } catch (error) {
        console.error('Error fetching trailers:', error);
      }
    };

    fetchVehicles();
    fetchDrivers();
    fetchTrailers();
  }, []);

  // Function to refresh tickets and stats
  const refreshData = async (page = currentPage, limit = pageSize) => {
    try {
      const status = statusFilter !== 'all' ? statusFilter : undefined;

      const [ticketsRes, statsRes] = await Promise.all([
        getTickets({
          status,
          search: searchQuery || undefined,
          page,
          limit
        }),
        getTicketStats()
      ]);

      if (ticketsRes?.success) {
        setTickets(ticketsRes.data || []);

        // Update pagination info
        if (ticketsRes?.pagination) {
          setTotal(ticketsRes.pagination.total || 0);
          setTotalPages(ticketsRes.pagination.totalPages || 0);
          setCurrentPage(ticketsRes.pagination.page || 1);
        }
      }

      if (statsRes?.success) {
        setStats(statsRes.data || {
          total: 0,
          paid: 0,
          unpaid: 0,
          fight: 0,
          dismissed: 0,
          reduced: 0,
          totalAmount: 0,
          paidAmount: 0,
          unpaidAmount: 0,
          fightAmount: 0,
          dismissedAmount: 0,
          reducedAmount: 0
        });
      }
    } catch (error) {
      console.error('Error refreshing data:', error);
      addNotification('error', 'Failed to load tickets');
    }
  };

  // Fetch tickets and stats when filters change
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        setCurrentPage(1);
        await refreshData(1, pageSize);
      } catch (error) {
        console.error('Error fetching tickets:', error);
        addNotification('error', 'Failed to load tickets');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, statusFilter]);

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
  }, [filteredTickets, currentPage]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentPage(1);
      refreshData(1, pageSize);
    }, 500);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  // Fetch when page or pageSize changes
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {

        await refreshData(currentPage, pageSize);
      } catch (error) {
        console.error('Error fetching tickets:', error);
        addNotification('error', 'Failed to load tickets');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, pageSize]);

  // Filter tickets (client-side for country filter since backend doesn't support it)
  useEffect(() => {
    let filtered = [...tickets];

    // Apply country filter (tab-based) - client-side since backend doesn't filter by country
    if (activeTab !== 'all') {
      filtered = filtered.filter(ticket => ticket.country === activeTab);
    }

    // Apply search filter (client-side)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(ticket => {
        const ticketNumber = ticket.ticketNumber?.toLowerCase() || '';
        const violationType = ticket.violationType?.toLowerCase() || '';
        const violationDescription = ticket.violationDescription?.toLowerCase() || '';
        const location = ticket.location?.toLowerCase() || '';
        const officerName = ticket.officerName?.toLowerCase() || '';
        const driverName = getDriverName(ticket.driver).toLowerCase();
        const vehicleInfo = getVehicleInfo(ticket.vehicle).toLowerCase();
        const amount = ticket.amount?.toString() || '';
        const unitNumber = ticket.unitNumber?.toLowerCase() || '';
        const trailerNumber = ticket.trailerNumber?.toLowerCase() || '';

        return (
          ticketNumber.includes(query) ||
          violationType.includes(query) ||
          violationDescription.includes(query) ||
          location.includes(query) ||
          officerName.includes(query) ||
          driverName.includes(query) ||
          vehicleInfo.includes(query) ||
          amount.includes(query) ||
          unitNumber.includes(query) ||
          trailerNumber.includes(query)
        );
      });
    }

    // Sort tickets
    filtered.sort((a, b) => {
      let aValue: any = a[sortField as keyof Ticket];
      let bValue: any = b[sortField as keyof Ticket];

      if (sortField === 'dateIssued' || sortField === 'dueDate' || sortField === 'paidDate' || sortField === 'courtDate') {
        aValue = new Date(aValue).getTime();
        bValue = new Date(bValue).getTime();
      }

      if (sortDirection === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    setFilteredTickets(filtered);
  }, [tickets, sortField, sortDirection, statusFilter, searchQuery, activeTab, vehicles, drivers]);

  const getVehicleInfo = (vehicle: Ticket['vehicle']): string => {
    if (typeof vehicle === 'string') {
      const v = vehicles.find(v => v._id === vehicle);
      if (v) {
        const plate = v.plateNumber || v.licensePlate || v.internalId || 'N/A';
        const vehicleName = [v.make, v.model].filter(Boolean).join(' ').trim() || v.makeModel || 'Vehicle';
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

  const getDriverName = (driver: Ticket['driver']): string => {
    if (typeof driver === 'string') {
      const d = drivers.find(d => d._id === driver);
      return d ? d.name : '';
    }
    return driver?.name || '';
  };

  const formatPaymentMethod = (method?: string): string => {
    if (!method) return '';
    const methodMap: Record<string, string> = {
      'cash': 'Cash',
      'check': 'Check',
      'credit_card': 'Credit Card',
      'online': 'Online Payment',
      'other': 'Other'
    };
    return methodMap[method] || method;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid':
        return <FaCheckCircle className="text-green-600" size={20} />;
      case 'unpaid':
        return <FaTimesCircle className="text-[#A855F7]" size={20} />;
      case 'fight':
        return <FaGavel className="text-[#F59E0B]" size={20} />;
      case 'dismissed':
        return <FaCheckCircle className="text-[#00D1FF]" size={20} />;
      case 'reduced':
        return <FaExclamationTriangle className="text-[#00FFA3]" size={20} />;
      default:
        return <FaTicketAlt className="text-secondary" size={20} />;
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'unpaid':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'fight':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'dismissed':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'reduced':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-card text-primary border-theme';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatCurrency = (amount: number | undefined | null) => {
    // Handle undefined, null, NaN, or invalid numbers
    if (amount === undefined || amount === null || isNaN(amount) || typeof amount !== 'number') {
      return '$0.00';
    }
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (field: string) => {
    if (sortField !== field) return <FaSort className="text-secondary" size={14} />;
    return sortDirection === 'asc' ? <FaSortUp className="text-secondary" size={14} /> : <FaSortDown className="text-secondary" size={14} />;
  };

  const resetForm = () => {
    setTicketForm({
      country: 'usa',
      violationType: '',
      violationDescription: '',
      dateIssued: '',
      location: '',
      amount: 0,
      finalAmount: undefined,
      status: 'unpaid',
      outcome: 'unpaid',
      driver: '',
      vehicle: '',
      unitNumber: '',
      trailerNumber: '',
      officerName: '',
      dueDate: '',
      courtDate: '',
      fightingBy: undefined,
      notes: '',
      lawyerDetails: undefined,
      paidDate: '',
      paymentMethod: '',
      paymentReference: ''
    });
  };

  const handleAddTicket = () => {
    resetForm();
    setShowAddModal(true);
  };

  const handleEditTicket = (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setTicketForm({
      country: ticket.country || 'usa',
      violationType: ticket.violationType,
      violationDescription: ticket.violationDescription,
      dateIssued: ticket.dateIssued ? new Date(ticket.dateIssued).toISOString().split('T')[0] : '',
      location: ticket.location,
      amount: ticket.amount,
      finalAmount: ticket.finalAmount,
      status: ticket.status,
      outcome: ticket.outcome || ticket.status === 'fight' ? 'on fight' : ticket.status,
      driver: typeof ticket.driver === 'string' ? ticket.driver : ticket.driver?._id || '',
      vehicle: typeof ticket.vehicle === 'string' ? ticket.vehicle : ticket.vehicle?._id || '',
      unitNumber: ticket.unitNumber || '',
      trailerNumber: ticket.trailerNumber || '',
      officerName: ticket.officerName,
      dueDate: ticket.dueDate ? new Date(ticket.dueDate).toISOString().split('T')[0] : '',
      courtDate: ticket.courtDate ? new Date(ticket.courtDate).toISOString().split('T')[0] : '',
      fightingBy: ticket.fightingBy,
      notes: ticket.notes || '',
      lawyerDetails: ticket.lawyerDetails ? { ...ticket.lawyerDetails } : undefined,
      paidDate: ticket.paidDate ? new Date(ticket.paidDate).toISOString().split('T')[0] : '',
      paymentMethod: ticket.paymentMethod || '',
      paymentReference: ticket.paymentReference || ''
    });
    setShowEditModal(true);
  };

  const handleViewTicket = (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setShowViewModal(true);
  };

  const handleDeleteTicket = (ticket: Ticket) => {
    setTicketToDelete(ticket);
    setShowDeleteModal(true);
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
    const basicValid = !!ticketForm.violationType &&
      !!ticketForm.violationDescription &&
      !!ticketForm.dateIssued &&
      !!ticketForm.location &&
      !!ticketForm.amount &&
      !!ticketForm.driver &&
      !!ticketForm.vehicle &&
      !!ticketForm.officerName &&
      !!ticketForm.dueDate;

    // If status is 'fight', lawyer details must be provided
    if (ticketForm.status === 'fight') {
      return basicValid && !!ticketForm.lawyerDetails?.name &&
        !!ticketForm.lawyerDetails?.firm &&
        !!ticketForm.lawyerDetails?.phone &&
        !!ticketForm.lawyerDetails?.email &&
        !!ticketForm.lawyerDetails?.address;
    }

    // If status is 'paid', payment information should be provided (optional but recommended)
    // Note: We're not making it required, but it's best practice

    return basicValid;
  };

  const saveNewTicket = async () => {
    if (!validateForm()) {
      addNotification('error', 'Please fill all required fields');
      return;
    }

    setLoading(true);
    try {
      const payload: any = {
        country: ticketForm.country || 'usa',
        violationType: ticketForm.violationType,
        violationDescription: ticketForm.violationDescription,
        dateIssued: ticketForm.dateIssued,
        location: ticketForm.location,
        amount: ticketForm.amount,
        status: ticketForm.status,
        outcome: ticketForm.outcome,
        driver: ticketForm.driver,
        vehicle: ticketForm.vehicle,
        unitNumber: ticketForm.unitNumber || '',
        trailerNumber: ticketForm.trailerNumber || '',
        officerName: ticketForm.officerName,
        dueDate: ticketForm.dueDate,
        courtDate: ticketForm.courtDate || '',
        fightingBy: ticketForm.fightingBy,
        notes: ticketForm.notes || ''
      };

      // Add final amount if status is reduced
      if (ticketForm.status === 'reduced' && ticketForm.finalAmount) {
        payload.finalAmount = ticketForm.finalAmount;
      }

      if (ticketForm.status === 'fight' && ticketForm.lawyerDetails) {
        payload.lawyerDetails = ticketForm.lawyerDetails;
      }

      // Add payment information if status is paid
      if (ticketForm.status === 'paid') {
        if (ticketForm.paidDate) payload.paidDate = ticketForm.paidDate;
        if (ticketForm.paymentMethod) payload.paymentMethod = ticketForm.paymentMethod;
        if (ticketForm.paymentReference) payload.paymentReference = ticketForm.paymentReference;
      }

      const res = await createTicket(payload);
      if (res?.success) {
        addNotification('success', res.message || 'Ticket created successfully');
        await refreshData();
        setShowAddModal(false);
        resetForm();
      } else {
        addNotification('error', res?.message || 'Failed to create ticket');
      }
    } catch (error: any) {
      console.error('Error creating ticket:', error);
      addNotification('error', error?.message || 'Failed to create ticket');
    } finally {
      setLoading(false);
    }
  };

  const updateTicketData = async () => {
    if (!selectedTicket) return;
    if (!validateForm()) {
      addNotification('error', 'Please fill all required fields');
      return;
    }

    setLoading(true);
    try {
      const payload: any = {
        country: ticketForm.country || 'usa',
        violationType: ticketForm.violationType,
        violationDescription: ticketForm.violationDescription,
        dateIssued: ticketForm.dateIssued,
        location: ticketForm.location,
        amount: ticketForm.amount,
        status: ticketForm.status,
        outcome: ticketForm.outcome,
        driver: ticketForm.driver,
        vehicle: ticketForm.vehicle,
        unitNumber: ticketForm.unitNumber || '',
        trailerNumber: ticketForm.trailerNumber || '',
        officerName: ticketForm.officerName,
        dueDate: ticketForm.dueDate,
        courtDate: ticketForm.courtDate || '',
        fightingBy: ticketForm.fightingBy,
        notes: ticketForm.notes || ''
      };

      // Add final amount if status is reduced
      if (ticketForm.status === 'reduced' && ticketForm.finalAmount) {
        payload.finalAmount = ticketForm.finalAmount;
      } else {
        payload.finalAmount = undefined;
      }

      if (ticketForm.status === 'fight' && ticketForm.lawyerDetails) {
        payload.lawyerDetails = ticketForm.lawyerDetails;
      }

      // Add payment information if status is paid
      if (ticketForm.status === 'paid') {
        if (ticketForm.paidDate) payload.paidDate = ticketForm.paidDate;
        if (ticketForm.paymentMethod) payload.paymentMethod = ticketForm.paymentMethod;
        if (ticketForm.paymentReference) payload.paymentReference = ticketForm.paymentReference;
      } else {
        // Clear payment info if status is not paid
        payload.paidDate = undefined;
        payload.paymentMethod = undefined;
        payload.paymentReference = undefined;
      }

      const res = await updateTicket(selectedTicket._id, payload);
      if (res?.success) {
        addNotification('success', res.message || 'Ticket updated successfully');
        await refreshData();
        setShowEditModal(false);
        setSelectedTicket(null);
        resetForm();
      } else {
        addNotification('error', res?.message || 'Failed to update ticket');
      }
    } catch (error: any) {
      console.error('Error updating ticket:', error);
      addNotification('error', error?.message || 'Failed to update ticket');
    } finally {
      setLoading(false);
    }
  };

  const confirmDelete = async () => {
    if (!ticketToDelete) return;

    setLoading(true);
    try {
      const res = await deleteTicket(ticketToDelete._id);
      if (res?.success) {
        addNotification('success', res.message || 'Ticket deleted successfully');
        await refreshData();
        setShowDeleteModal(false);
        setTicketToDelete(null);
      } else {
        addNotification('error', res?.message || 'Failed to delete ticket');
      }
    } catch (error: any) {
      console.error('Error deleting ticket:', error);
      addNotification('error', error?.message || 'Failed to delete ticket');
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
    iconColor
  }: {
    title: string;
    value: number | string;
    subtitle?: string;
    icon: React.ReactNode;
    onClick?: () => void;
    bgColor: string;
    iconColor: string;
  }) => {
    return (
      <div
        onClick={onClick}
        className="bg-card rounded-lg p-3 shadow-sm hover:shadow-md transition-all cursor-pointer border border-transparent hover:border-[var(--accent-blue)]/20 hover:scale-[1.02] active:scale-[0.98]"
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
            {React.isValidElement(Icon) ? React.cloneElement(Icon as React.ReactElement<any>, { className: iconColor, size: 21 }) : null}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen pb-10 bg-main" >
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


        <div className="relative z-10 px-4 pt-3 pb-6">
          {/* Header */}
          <div className="mb-4 relative z-10">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold text-headings">Tickets (Fines & Penalties)</h1>
                <div className="flex items-center gap-2 text-secondary">
                  <span className="text-xs">Manage traffic violations and legal disputes for USA & Canada</span>
                </div>
              </div>
              <button
                onClick={handleAddTicket}
                className="flex items-center gap-2 px-4 py-2 bg-[var(--accent-navyblue)] text-[rgba(0,209,255,0.15)] rounded-lg hover:bg-card/90 shadow-sm transition-all font-bold text-sm"
              >
                <FaPlus /> Add Ticket
              </button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 -mt-2 mb-6 relative z-10">
            <StatCard
              title="Total"
              value={stats.total}
              bgColor="bg-card"
              iconColor="text-[#00D1FF]"
              icon={<FaTicketAlt />}
            />
            <StatCard
              title="Paid"
              value={stats.paid}
              bgColor="bg-green-50"
              iconColor="text-green-600"
              icon={<FaCheckCircle />}
              subtitle={formatCurrency(stats.paidAmount)}
            />
            <StatCard
              title="Unpaid"
              value={stats.unpaid}
              bgColor="bg-card"
              iconColor="text-[#A855F7]"
              icon={<FaTimesCircle />}
              subtitle={formatCurrency(stats.unpaidAmount)}
            />
            <StatCard
              title="On Fight"
              value={stats.fight}
              bgColor="bg-card"
              iconColor="text-[#F59E0B]"
              icon={<FaGavel />}
              subtitle={formatCurrency(stats.fightAmount)}
            />
            <StatCard
              title="Dismissed"
              value={stats.dismissed}
              bgColor="bg-card"
              iconColor="text-[#00D1FF]"
              icon={<FaCheckCircle />}
              subtitle={formatCurrency(stats.dismissedAmount)}
            />
            <StatCard
              title="Reduced"
              value={stats.reduced}
              bgColor="bg-card"
              iconColor="text-[#00FFA3]"
              icon={<FaExclamationTriangle />}
              subtitle={formatCurrency(stats.reducedAmount)}
            />
          </div>
        </div>
      </div>

      <div className="w-full mx-auto px-4 -mt-4">
        {/* Filters and Search */}
        <div className="bg-card rounded-lg shadow-sm border border-theme p-6 mb-6">
          {/* Country Tabs */}
          <div className="flex gap-2 mb-4 border-b border-theme pb-4">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${activeTab === 'all'
                ? 'bg-[var(--accent-navyblue)] text-[#0284C7]'
                : 'text-secondary hover:bg-[rgba(255,255,255,0.03)]'
                }`}
            >
              All Tickets ({tickets.length})
            </button>
            <button
              onClick={() => setActiveTab('usa')}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${activeTab === 'usa'
                ? 'bg-[var(--accent-navyblue)] text-[#0284C7]'
                : 'text-secondary hover:bg-[rgba(255,255,255,0.03)]'
                }`}
            >
              USA ({tickets.filter(t => t.country === 'usa').length})
            </button>
            <button
              onClick={() => setActiveTab('canada')}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${activeTab === 'canada'
                ? 'bg-[var(--accent-navyblue)] text-[#0284C7]'
                : 'text-secondary hover:bg-[rgba(255,255,255,0.03)]'
                }`}
            >
              Canada ({tickets.filter(t => t.country === 'canada').length})
            </button>
          </div>
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            <div className="flex flex-col md:flex-row gap-4 flex-1">
              <div className="flex-1">
                <div className="relative">
                  <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-secondary" size={16} />
                  <input
                    type="text"
                    placeholder="Search tickets..."
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

                  <option value="paid" className="bg-[var(--bg-card)] text-[var(--text-primary)]">
                    Paid
                  </option>

                  <option value="unpaid" className="bg-[var(--bg-card)] text-[var(--text-primary)]">
                    Unpaid
                  </option>

                  <option value="fight" className="bg-[var(--bg-card)] text-[var(--text-primary)]">
                    On Fight
                  </option>

                  <option value="dismissed" className="bg-[var(--bg-card)] text-[var(--text-primary)]">
                    Dismissed
                  </option>

                  <option value="reduced" className="bg-[var(--bg-card)] text-[var(--text-primary)]">
                    Reduced
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

        {/* Tickets Table */}
        <div className="bg-card rounded-lg shadow-sm border border-theme overflow-hidden">
          <div className="px-6 py-4 border-b border-theme">
            <h3 className="text-lg font-bold text-primary">
              Tickets ({total > 0 ? total : filteredTickets.length})
            </h3>
          </div>

          {loading ? (
            <div className="text-center py-16">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--accent-color)] mx-auto mb-4"></div>
              <p className="text-xl font-semibold text-secondary">Loading tickets...</p>
            </div>
          ) : filteredTickets.length === 0 ? (
            <div className="text-center py-16">
              <FaTicketAlt size={64} className="mx-auto mb-4 text-gray-300" />
              <p className="text-xl font-semibold text-secondary">No tickets found</p>
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
                  <table className="w-full min-w-[1400px]">
                    <thead className="bg-card">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-headings uppercase tracking-wider sticky left-0 bg-card z-10">
                          <button
                            onClick={() => handleSort('ticketNumber')}
                            className="flex items-center gap-2 hover:text-primary"
                          >
                            Ticket #
                            {getSortIcon('ticketNumber')}
                          </button>
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-headings uppercase tracking-wider">
                          Country
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-headings uppercase tracking-wider">
                          <button
                            onClick={() => handleSort('violationType')}
                            className="flex items-center gap-2 hover:text-primary"
                          >
                            Violation
                            {getSortIcon('violationType')}
                          </button>
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-headings uppercase tracking-wider">
                          <button
                            onClick={() => handleSort('dateIssued')}
                            className="flex items-center gap-2 hover:text-primary"
                          >
                            Date Issued
                            {getSortIcon('dateIssued')}
                          </button>
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-headings uppercase tracking-wider">
                          Location
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-headings uppercase tracking-wider">
                          Officer
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-headings uppercase tracking-wider">
                          Driver
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-headings uppercase tracking-wider">
                          Vehicle
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-headings uppercase tracking-wider">
                          Unit/Trailer
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-headings uppercase tracking-wider">
                          <button
                            onClick={() => handleSort('amount')}
                            className="flex items-center gap-2 hover:text-primary"
                          >
                            Amount
                            {getSortIcon('amount')}
                          </button>
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-headings uppercase tracking-wider">
                          <button
                            onClick={() => handleSort('status')}
                            className="flex items-center gap-2 hover:text-primary"
                          >
                            Status
                            {getSortIcon('status')}
                          </button>
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-headings uppercase tracking-wider">
                          Outcome
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-headings uppercase tracking-wider">
                          Court Date
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-headings uppercase tracking-wider">
                          Due Date
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-headings uppercase tracking-wider sticky right-0 bg-card z-10">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-card divide-y divide-theme">
                      {filteredTickets.map((ticket) => (
                        <tr
                          key={ticket._id}
                          className="hover:bg-[rgba(255,255,255,0.03)] cursor-pointer"
                          onClick={() => handleViewTicket(ticket)}
                        >
                          <td className="px-4 py-3 whitespace-nowrap sticky left-0 bg-card z-10">
                            <div className="text-sm font-medium text-primary">
                              {ticket.ticketNumber || 'N/A'}
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="text-sm text-primary">
                              {ticket.country === 'usa' ? (
                                <span className="flex items-center gap-1">
                                  <FaFlagUsa className="text-[#00D1FF]" size={14} />
                                  USA
                                </span>
                              ) : (
                                <span className="flex items-center gap-1">
                                  <FaFlag className="text-[#A855F7]" size={14} />
                                  CA
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-sm text-primary max-w-[200px]">
                              <div className="font-medium truncate" title={ticket.violationType || 'N/A'}>
                                {ticket.violationType || 'N/A'}
                              </div>
                              <div className="text-secondary text-xs truncate" title={ticket.violationDescription || ''}>
                                {ticket.violationDescription || ''}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="text-sm text-primary">
                              <div className="flex items-center gap-1">
                                <FaCalendarAlt className="text-secondary" size={12} />
                                {ticket.dateIssued ? formatDate(ticket.dateIssued) : 'N/A'}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-sm text-primary max-w-[150px] truncate" title={ticket.location || 'N/A'}>
                              <div className="flex items-center gap-1">
                                <FaMapMarkerAlt className="text-secondary flex-shrink-0" size={12} />
                                {ticket.location || 'N/A'}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-sm text-secondary max-w-[150px] truncate" title={ticket.officerName || 'N/A'}>
                              {ticket.officerName || 'N/A'}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-sm text-secondary max-w-[150px]">
                              <div className="truncate" title={getDriverName(ticket.driver)}>
                                {getDriverName(ticket.driver) || 'N/A'}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-sm text-secondary max-w-[180px]">
                              <div className="truncate" title={getVehicleInfo(ticket.vehicle)}>
                                {getVehicleInfo(ticket.vehicle) || 'N/A'}
                              </div>
                              {typeof ticket.vehicle === 'object' && ticket.vehicle?.internalId && (
                                <div className="text-xs text-secondary">
                                  ID: {ticket.vehicle.internalId}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="text-sm text-secondary">
                              {ticket.unitNumber && (
                                <div>Unit: {ticket.unitNumber}</div>
                              )}
                              {ticket.trailerNumber && (
                                <div>Trailer: {ticket.trailerNumber}</div>
                              )}
                              {!ticket.unitNumber && !ticket.trailerNumber && (
                                <span className="text-secondary">N/A</span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="text-sm text-secondary">
                              <div className="font-bold">{formatCurrency(ticket.amount || 0)}</div>
                              {ticket.finalAmount && ticket.finalAmount !== ticket.amount && (
                                <div className="text-green-600 text-xs">Final: {formatCurrency(ticket.finalAmount)}</div>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              {getStatusIcon(ticket.status)}
                              <span className={`text-xs px-2 py-1 rounded-full font-medium border ${getStatusBadgeColor(ticket.status)}`}>
                                {ticket.status === 'fight' ? 'ON FIGHT' : ticket.status.toUpperCase()}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="text-sm text-secondary">
                              {ticket.outcome ? (
                                <span className="text-xs px-2 py-1 rounded bg-card">
                                  {ticket.outcome.replace('on fight', 'On Fight').toUpperCase()}
                                </span>
                              ) : (
                                <span className="text-secondary">N/A</span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="text-sm text-secondary">
                              {ticket.courtDate ? formatDate(ticket.courtDate) : 'N/A'}
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="text-sm text-secondary">
                              {ticket.dueDate ? formatDate(ticket.dueDate) : 'N/A'}
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm font-medium sticky right-0 bg-card z-10" onClick={(e) => e.stopPropagation()}>
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleViewTicket(ticket)}
                                className="text-[#00D1FF] hover:text-blue-800 p-2 hover:bg-blue-50 rounded-lg transition-colors"
                                title="View Details"
                              >
                                <FaEye size={16} className="text-headings" />
                              </button>
                              <button
                                onClick={() => handleEditTicket(ticket)}
                                className="text-[var(--accent-color)] hover:text-[var(--accent-dark)] p-2 hover:bg-[var(--accent-soft)] rounded-lg transition-colors"
                                title="Edit Ticket"
                              >
                                <FaEdit size={16} className="text-headings" />
                              </button>
                              <button
                                onClick={() => handleDeleteTicket(ticket)}
                                className="text-[#A855F7] hover:text-red-800 p-2 hover:bg-red-50 rounded-lg transition-colors"
                                title="Delete Ticket"
                              >
                                <FaTrash size={16} className="text-[var(--accent-red)]" />
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
                    <span className="font-medium">{total}</span> tickets
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

        {/* Add Ticket Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="bg-card rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-card border-b px-6 py-4 rounded-t-2xl z-10">
                <div className="flex justify-between items-center">
                  <h3 className="text-xl font-bold text-headings">Add New Ticket</h3>
                  <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-[rgba(255,255,255,0.03)] rounded-full transition-colors">
                    <FaTimesCircle className="text-secondary" size={20} />
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-headings mb-1">Country <span className="text-red-500">*</span></label>
                    <select
                      value={ticketForm.country || 'usa'}
                      onChange={(e) => setTicketForm(prev => ({ ...prev, country: e.target.value as 'usa' | 'canada' }))}
                      className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-[var(--accent-color)] focus:border-transparent"
                    >
                      <option className='form-option' value="usa">USA</option>
                      <option className='form-option' value="canada">Canada</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-headings mb-1">Violation Type <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      placeholder="e.g., Speeding, Improper Lane Change"
                      value={ticketForm.violationType || ''}
                      onChange={(e) => setTicketForm(prev => ({ ...prev, violationType: e.target.value }))}
                      className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-[var(--accent-color)] focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-headings mb-1">Amount <span className="text-red-500">*</span></label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={ticketForm.amount || ''}
                      onChange={(e) => setTicketForm(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                      className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-[var(--accent-color)] focus:border-transparent"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-headings mb-1">Violation Description <span className="text-red-500">*</span></label>
                    <textarea
                      placeholder="Detailed description of the violation"
                      value={ticketForm.violationDescription || ''}
                      onChange={(e) => setTicketForm(prev => ({ ...prev, violationDescription: e.target.value }))}
                      className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-[var(--accent-color)] focus:border-transparent"
                      rows={3}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-headings mb-1">Date Issued <span className="text-red-500">*</span></label>
                    <input
                      type="date"
                      value={ticketForm.dateIssued || ''}
                      onChange={(e) => setTicketForm(prev => ({ ...prev, dateIssued: e.target.value }))}
                      className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-[var(--accent-color)] focus:border-transparent"
                      style={{ colorScheme: 'dark' }}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-headings mb-1">Due Date <span className="text-red-500">*</span></label>
                    <input
                      type="date"
                      value={ticketForm.dueDate || ''}
                      onChange={(e) => setTicketForm(prev => ({ ...prev, dueDate: e.target.value }))}
                      className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-[var(--accent-color)] focus:border-transparent"
                      style={{ colorScheme: 'dark' }}
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-headings mb-1">
                      {ticketForm.country === 'canada' ? 'Province' : 'State'} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder={ticketForm.country === 'canada' ? 'Province (e.g., MB, AB, ON, BC, QC)' : 'State (e.g., California, Texas, New York)'}
                      value={ticketForm.location || ''}
                      onChange={(e) => setTicketForm(prev => ({ ...prev, location: e.target.value }))}
                      className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-[var(--accent-color)] focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-headings mb-1">Driver <span className="text-red-500">*</span></label>
                    <select
                      value={typeof ticketForm.driver === 'string' ? ticketForm.driver : ticketForm.driver?._id || ''}
                      onChange={(e) => setTicketForm(prev => ({ ...prev, driver: e.target.value }))}
                      className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-[var(--accent-color)] focus:border-transparent"
                    >
                      <option className='form-option' value="">Select Driver</option>
                      {drivers.map((driver) => (
                        <option className='form-option' key={driver._id} value={driver._id}>{driver.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-headings mb-1">Vehicle <span className="text-red-500">*</span></label>
                    <select
                      value={typeof ticketForm.vehicle === 'string' ? ticketForm.vehicle : ticketForm.vehicle?._id || ''}
                      onChange={(e) => setTicketForm(prev => ({ ...prev, vehicle: e.target.value }))}
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
                  <div>
                    <label className="block text-sm font-medium text-headings mb-1">Unit Number</label>
                    <input
                      type="text"
                      placeholder="Unit number (e.g., 1001, 1002)"
                      value={ticketForm.unitNumber || ''}
                      onChange={(e) => setTicketForm(prev => ({ ...prev, unitNumber: e.target.value }))}
                      className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-[var(--accent-color)] focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-headings mb-1">Trailer Number</label>
                    <select
                      value={ticketForm.trailerNumber || ''}
                      onChange={(e) => setTicketForm(prev => ({ ...prev, trailerNumber: e.target.value }))}
                      className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-[var(--accent-color)] focus:border-transparent"
                    >
                      <option className='form-option' value="">Select Trailer</option>
                      {trailers.map((trailer) => (
                        <option className='form-option' key={trailer._id} value={trailer.unitNo || trailer.trailer || trailer._id}>
                          {trailer.unitNo || trailer.trailer || trailer.plateNumber || trailer.licensePlate || trailer.internalId || 'N/A'}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-headings mb-1">Officer Name <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      placeholder="Issuing officer name"
                      value={ticketForm.officerName || ''}
                      onChange={(e) => setTicketForm(prev => ({ ...prev, officerName: e.target.value }))}
                      className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-[var(--accent-color)] focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-headings mb-1">Status <span className="text-red-500">*</span></label>
                    <select
                      value={ticketForm.status}
                      onChange={(e) => setTicketForm(prev => ({ ...prev, status: e.target.value as 'paid' | 'unpaid' | 'fight' | 'dismissed' | 'reduced' }))}
                      className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-[var(--accent-color)] focus:border-transparent"
                    >
                      <option className='form-option' value="unpaid">Unpaid</option>
                      <option className='form-option' value="paid">Paid</option>
                      <option className='form-option' value="fight">On Fight</option>
                      <option className='form-option' value="dismissed">Dismissed</option>
                      <option className='form-option' value="reduced">Reduced</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-headings mb-1">Outcome</label>
                    <select
                      value={ticketForm.outcome || 'unpaid'}
                      onChange={(e) => setTicketForm(prev => ({ ...prev, outcome: e.target.value as 'paid' | 'reduced' | 'dismissed' | 'on fight' | 'unpaid' }))}
                      className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-[var(--accent-color)] focus:border-transparent"
                    >
                      <option className='form-option' value="unpaid">Unpaid</option>
                      <option className='form-option' value="paid">Paid</option>
                      <option className='form-option' value="reduced">Reduced</option>
                      <option className='form-option' value="dismissed">Dismissed</option>
                      <option className='form-option' value="on fight">On Fight</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-headings mb-1">Court Date</label>
                    <input
                      type="date"
                      value={ticketForm.courtDate || ''}
                      onChange={(e) => setTicketForm(prev => ({ ...prev, courtDate: e.target.value }))}
                      className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-[var(--accent-color)] focus:border-transparent"
                      style={{ colorScheme: 'dark' }}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-headings mb-1">Fighting By</label>
                    <select
                      value={ticketForm.fightingBy || ''}
                      onChange={(e) => setTicketForm(prev => ({ ...prev, fightingBy: e.target.value as 'company' | 'lawyer' | undefined }))}
                      className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-[var(--accent-color)] focus:border-transparent"
                    >
                      <option className='form-option' value="">Select Option</option>
                      <option className='form-option' value="company">Company</option>
                      <option className='form-option' value="lawyer">Lawyer</option>
                    </select>
                  </div>
                  {ticketForm.status === 'reduced' && (
                    <div>
                      <label className="block text-sm font-medium text-headings mb-1">Final Amount</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="Final amount after reduction"
                        value={ticketForm.finalAmount || ''}
                        onChange={(e) => setTicketForm(prev => ({ ...prev, finalAmount: parseFloat(e.target.value) || undefined }))}
                        className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-[var(--accent-color)] focus:border-transparent"

                      />
                    </div>
                  )}
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-headings mb-1">Notes</label>
                    <textarea
                      placeholder="Additional notes"
                      value={ticketForm.notes || ''}
                      onChange={(e) => setTicketForm(prev => ({ ...prev, notes: e.target.value }))}
                      className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-[var(--accent-color)] focus:border-transparent"
                      rows={3}
                    />
                  </div>
                </div>

                {/* Payment Information Section - Only show if status is 'paid' */}
                {ticketForm.status === 'paid' && (
                  <div className="bg-green-50 rounded-xl p-6 border border-green-200">
                    <h4 className="text-lg font-bold text-primary mb-4 flex items-center gap-2">
                      <FaCheckCircle className="text-green-600" size={20} />
                      Payment Information
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-primary mb-1">Paid Date</label>
                        <input
                          type="date"
                          value={ticketForm.paidDate || ''}
                          onChange={(e) => setTicketForm(prev => ({ ...prev, paidDate: e.target.value }))}
                          className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-[var(--accent-color)] focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-primary mb-1">Payment Method</label>
                        <select
                          value={ticketForm.paymentMethod || ''}
                          onChange={(e) => setTicketForm(prev => ({ ...prev, paymentMethod: e.target.value }))}
                          className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-[var(--accent-color)] focus:border-transparent"
                        >
                          <option value="">Select Payment Method</option>
                          <option value="cash">Cash</option>
                          <option value="credit_card">Credit Card</option>
                          <option value="check">Check</option>
                          <option value="online">Online Payment</option>
                          <option value="other">Other</option>
                        </select>
                      </div>
                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-primary mb-1">Payment Reference</label>
                        <input
                          type="text"
                          placeholder="Transaction ID, check number, or reference number"
                          value={ticketForm.paymentReference || ''}
                          onChange={(e) => setTicketForm(prev => ({ ...prev, paymentReference: e.target.value }))}
                          className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-[var(--accent-color)] focus:border-transparent"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Lawyer Details Section - Only show if status is 'fight' */}
                {ticketForm.status === 'fight' && (
                  <div className="bg-card rounded-xl p-6 border border-orange-200">
                    <h4 className="text-lg font-bold text-primary mb-4 flex items-center gap-2">
                      <FaGavel className="text-[#F59E0B]" size={20} />
                      Lawyer Details
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-primary mb-1">Lawyer Name <span className="text-red-500">*</span></label>
                        <input
                          type="text"
                          placeholder="Lawyer name"
                          value={ticketForm.lawyerDetails?.name || ''}
                          onChange={(e) => setTicketForm(prev => ({
                            ...prev,
                            lawyerDetails: {
                              ...prev.lawyerDetails,
                              name: e.target.value,
                              firm: prev.lawyerDetails?.firm || '',
                              phone: prev.lawyerDetails?.phone || '',
                              email: prev.lawyerDetails?.email || '',
                              address: prev.lawyerDetails?.address || '',
                              status: prev.lawyerDetails?.status || 'active'
                            }
                          }))}
                          className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-[var(--accent-color)] focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-primary mb-1">Firm <span className="text-red-500">*</span></label>
                        <input
                          type="text"
                          placeholder="Law firm name"
                          value={ticketForm.lawyerDetails?.firm || ''}
                          onChange={(e) => setTicketForm(prev => ({
                            ...prev,
                            lawyerDetails: {
                              ...prev.lawyerDetails,
                              firm: e.target.value,
                              name: prev.lawyerDetails?.name || '',
                              phone: prev.lawyerDetails?.phone || '',
                              email: prev.lawyerDetails?.email || '',
                              address: prev.lawyerDetails?.address || '',
                              status: prev.lawyerDetails?.status || 'active'
                            }
                          }))}
                          className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-[var(--accent-color)] focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-primary mb-1">Phone <span className="text-red-500">*</span></label>
                        <input
                          type="tel"
                          placeholder="Phone number"
                          value={ticketForm.lawyerDetails?.phone || ''}
                          onChange={(e) => setTicketForm(prev => ({
                            ...prev,
                            lawyerDetails: {
                              ...prev.lawyerDetails,
                              phone: e.target.value,
                              name: prev.lawyerDetails?.name || '',
                              firm: prev.lawyerDetails?.firm || '',
                              email: prev.lawyerDetails?.email || '',
                              address: prev.lawyerDetails?.address || '',
                              status: prev.lawyerDetails?.status || 'active'
                            }
                          }))}
                          className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-[var(--accent-color)] focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-primary mb-1">Email <span className="text-red-500">*</span></label>
                        <input
                          type="email"
                          placeholder="Email address"
                          value={ticketForm.lawyerDetails?.email || ''}
                          onChange={(e) => setTicketForm(prev => ({
                            ...prev,
                            lawyerDetails: {
                              ...prev.lawyerDetails,
                              email: e.target.value,
                              name: prev.lawyerDetails?.name || '',
                              firm: prev.lawyerDetails?.firm || '',
                              phone: prev.lawyerDetails?.phone || '',
                              address: prev.lawyerDetails?.address || '',
                              status: prev.lawyerDetails?.status || 'active'
                            }
                          }))}
                          className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-[var(--accent-color)] focus:border-transparent"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-primary mb-1">Address <span className="text-red-500">*</span></label>
                        <textarea
                          placeholder="Law firm address"
                          value={ticketForm.lawyerDetails?.address || ''}
                          onChange={(e) => setTicketForm(prev => ({
                            ...prev,
                            lawyerDetails: {
                              ...prev.lawyerDetails,
                              address: e.target.value,
                              name: prev.lawyerDetails?.name || '',
                              firm: prev.lawyerDetails?.firm || '',
                              phone: prev.lawyerDetails?.phone || '',
                              email: prev.lawyerDetails?.email || '',
                              status: prev.lawyerDetails?.status || 'active'
                            }
                          }))}
                          className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-[var(--accent-color)] focus:border-transparent"
                          rows={2}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-primary mb-1">Case Number</label>
                        <input
                          type="text"
                          placeholder="Case number"
                          value={ticketForm.lawyerDetails?.caseNumber || ''}
                          onChange={(e) => setTicketForm(prev => ({
                            ...prev,
                            lawyerDetails: {
                              ...prev.lawyerDetails,
                              caseNumber: e.target.value,
                              name: prev.lawyerDetails?.name || '',
                              firm: prev.lawyerDetails?.firm || '',
                              phone: prev.lawyerDetails?.phone || '',
                              email: prev.lawyerDetails?.email || '',
                              address: prev.lawyerDetails?.address || '',
                              status: prev.lawyerDetails?.status || 'active'
                            }
                          }))}
                          className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-[var(--accent-color)] focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-primary mb-1">Court Date</label>
                        <input
                          type="date"
                          value={ticketForm.lawyerDetails?.courtDate || ''}
                          onChange={(e) => setTicketForm(prev => ({
                            ...prev,
                            lawyerDetails: {
                              ...prev.lawyerDetails,
                              courtDate: e.target.value,
                              name: prev.lawyerDetails?.name || '',
                              firm: prev.lawyerDetails?.firm || '',
                              phone: prev.lawyerDetails?.phone || '',
                              email: prev.lawyerDetails?.email || '',
                              address: prev.lawyerDetails?.address || '',
                              status: prev.lawyerDetails?.status || 'active'
                            }
                          }))}
                          className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-[var(--accent-color)] focus:border-transparent"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="sticky bottom-0 bg-card px-6 py-4 flex justify-end gap-3 border-t rounded-b-2xl">
                <button onClick={() => setShowAddModal(false)} className="px-6 py-2.5 bg-card border border-theme text-primary rounded-lg hover:bg-[rgba(255,255,255,0.03)] font-medium transition-colors" disabled={loading}>Cancel</button>
                <button onClick={saveNewTicket} className="px-6 py-2.5 bg-[var(--accent-navyblue)] !text-white rounded-lg hover:bg-[var(--accent-navyblue)]/80 font-medium transition-colors disabled:opacity-60" disabled={!validateForm() || loading}>
                  {loading ? 'Saving...' : 'Save Ticket'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Ticket Modal */}
        {showEditModal && selectedTicket && (
          <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="bg-card rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-card border-b px-6 py-4 rounded-t-2xl z-10">
                <div className="flex justify-between items-center">
                  <h3 className="text-xl font-bold text-headings">Edit Ticket: {selectedTicket.ticketNumber}</h3>
                  <button onClick={() => { setShowEditModal(false); setSelectedTicket(null); resetForm(); }} className="p-2 hover:bg-[rgba(255,255,255,0.03)] rounded-full transition-colors">
                    <FaTimesCircle className="text-secondary" size={20} />
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-headings mb-1">Country <span className="text-red-500">*</span></label>
                    <select
                      value={ticketForm.country || 'usa'}
                      onChange={(e) =>
                        setTicketForm((prev) => ({
                          ...prev,
                          country: e.target.value as 'usa' | 'canada',
                        }))
                      }
                      className="w-full px-3 py-2 text-sm border border-theme rounded-lg
  bg-[var(--bg-card)] text-[var(--text-primary)]
  focus:ring-2 focus:ring-[var(--accent-blue)]
  focus:border-[var(--accent-blue)]
  outline-none cursor-pointer transition-all"
                    >
                      <option
                        value="usa"
                        className="bg-[var(--bg-card)] text-[var(--text-primary)]"
                      >
                        USA
                      </option>

                      <option
                        value="canada"
                        className="bg-[var(--bg-card)] text-[var(--text-primary)]"
                      >
                        Canada
                      </option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-headings mb-1">Violation Type <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      placeholder="e.g., Speeding, Improper Lane Change"
                      value={ticketForm.violationType || ''}
                      onChange={(e) => setTicketForm(prev => ({ ...prev, violationType: e.target.value }))}
                      className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-[var(--accent-color)] focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-headings mb-1">Amount <span className="text-red-500">*</span></label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={ticketForm.amount || ''}
                      onChange={(e) => setTicketForm(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                      className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-[var(--accent-color)] focus:border-transparent"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-headings mb-1">Violation Description <span className="text-red-500">*</span></label>
                    <textarea
                      placeholder="Detailed description of the violation"
                      value={ticketForm.violationDescription || ''}
                      onChange={(e) => setTicketForm(prev => ({ ...prev, violationDescription: e.target.value }))}
                      className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-[var(--accent-color)] focus:border-transparent"
                      rows={3}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-headings mb-1">Date Issued <span className="text-red-500">*</span></label>
                    <input
                      type="date"
                      value={ticketForm.dateIssued || ''}
                      onChange={(e) => setTicketForm(prev => ({ ...prev, dateIssued: e.target.value }))}
                      className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-[var(--accent-color)] focus:border-transparent"
                      style={{ colorScheme: 'dark' }}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-headings mb-1">Due Date <span className="text-red-500">*</span></label>
                    <input
                      type="date"
                      value={ticketForm.dueDate || ''}
                      onChange={(e) => setTicketForm(prev => ({ ...prev, dueDate: e.target.value }))}
                      className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-[var(--accent-color)] focus:border-transparent"
                      style={{ colorScheme: 'dark' }}
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-headings mb-1">
                      {ticketForm.country === 'canada' ? 'Province' : 'State'} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder={ticketForm.country === 'canada' ? 'Province (e.g., MB, AB, ON, BC, QC)' : 'State (e.g., California, Texas, New York)'}
                      value={ticketForm.location || ''}
                      onChange={(e) => setTicketForm(prev => ({ ...prev, location: e.target.value }))}
                      className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-[var(--accent-color)] focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-headings mb-1">Driver <span className="text-red-500">*</span></label>
                    <select
                      value={
                        typeof ticketForm.driver === "string"
                          ? ticketForm.driver
                          : ticketForm.driver?._id || ""
                      }
                      onChange={(e) =>
                        setTicketForm((prev) => ({
                          ...prev,
                          driver: e.target.value,
                        }))
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
                    <label className="block text-sm font-medium text-headings mb-1">Vehicle <span className="text-red-500">*</span></label>
                    <select
                      value={
                        typeof ticketForm.vehicle === "string"
                          ? ticketForm.vehicle
                          : ticketForm.vehicle?._id || ""
                      }
                      onChange={(e) =>
                        setTicketForm((prev) => ({
                          ...prev,
                          vehicle: e.target.value,
                        }))
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
                        Select Vehicle
                      </option>

                      {vehicles.map((vehicle) => {
                        const vehicleName =
                          [vehicle.make, vehicle.model].filter(Boolean).join(" ").trim() ||
                          vehicle.makeModel ||
                          "Vehicle";

                        const identifier =
                          vehicle.plateNumber ||
                          vehicle.licensePlate ||
                          vehicle.internalId ||
                          "N/A";

                        return (
                          <option
                            key={vehicle._id}
                            value={vehicle._id}
                            className="bg-[var(--bg-card)] text-[var(--text-primary)]"
                          >
                            {`${vehicleName} (${identifier})`}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-headings mb-1">Unit Number</label>
                    <input
                      type="text"
                      placeholder="Unit number (e.g., 1001, 1002)"
                      value={ticketForm.unitNumber || ''}
                      onChange={(e) => setTicketForm(prev => ({ ...prev, unitNumber: e.target.value }))}
                      className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-[var(--accent-color)] focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-headings mb-1">Trailer Number</label>
                    <select
                      value={ticketForm.trailerNumber || ''}
                      onChange={(e) => setTicketForm(prev => ({ ...prev, trailerNumber: e.target.value }))}
                      className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-[var(--accent-color)] focus:border-transparent"
                    >
                      <option className='form-option' value="">Select Trailer</option>
                      {trailers.map((trailer) => (
                        <option className='form-option' key={trailer._id} value={trailer.unitNo || trailer.trailer || trailer._id}>
                          {trailer.unitNo || trailer.trailer || trailer.plateNumber || trailer.licensePlate || trailer.internalId || 'N/A'}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-headings mb-1">Officer Name <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      placeholder="Issuing officer name"
                      value={ticketForm.officerName || ''}
                      onChange={(e) => setTicketForm(prev => ({ ...prev, officerName: e.target.value }))}
                      className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-[var(--accent-color)] focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-headings mb-1">Status <span className="text-red-500">*</span></label>
                    <select
                      value={ticketForm.status}
                      onChange={(e) =>
                        setTicketForm((prev) => ({
                          ...prev,
                          status: e.target.value as
                            | "paid"
                            | "unpaid"
                            | "fight"
                            | "dismissed"
                            | "reduced",
                        }))
                      }
                      className="w-full px-3 py-2 text-sm border border-theme rounded-lg
  bg-[var(--bg-card)] text-[var(--text-primary)]
  focus:ring-2 focus:ring-[var(--accent-blue)]
  focus:border-[var(--accent-blue)]
  outline-none cursor-pointer transition-all"
                    >
                      <option value="unpaid" className="bg-[var(--bg-card)] text-[var(--text-primary)]">
                        Unpaid
                      </option>

                      <option value="paid" className="bg-[var(--bg-card)] text-[var(--text-primary)]">
                        Paid
                      </option>

                      <option value="on-fight" className="bg-[var(--bg-card)] text-[var(--text-primary)]">
                        On Fight
                      </option>

                      <option value="dismissed" className="bg-[var(--bg-card)] text-[var(--text-primary)]">
                        Dismissed
                      </option>

                      <option value="reduced" className="bg-[var(--bg-card)] text-[var(--text-primary)]">
                        Reduced
                      </option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-headings mb-1">Outcome</label>
                    <select
                      value={ticketForm.outcome || "unpaid"}
                      onChange={(e) =>
                        setTicketForm((prev) => ({
                          ...prev,
                          outcome: e.target.value as
                            | "paid"
                            | "reduced"
                            | "dismissed"
                            | "on fight"
                            | "unpaid",
                        }))
                      }
                      className="w-full px-3 py-2 text-sm border border-theme rounded-lg
  bg-[var(--bg-card)] text-[var(--text-primary)]
  focus:ring-2 focus:ring-[var(--accent-blue)]
  focus:border-[var(--accent-blue)]
  outline-none cursor-pointer transition-all"
                    >
                      <option value="unpaid" className="bg-[var(--bg-card)] text-[var(--text-primary)]">
                        Unpaid
                      </option>

                      <option value="paid" className="bg-[var(--bg-card)] text-[var(--text-primary)]">
                        Paid
                      </option>

                      <option value="reduced" className="bg-[var(--bg-card)] text-[var(--text-primary)]">
                        Reduced
                      </option>

                      <option value="dismissed" className="bg-[var(--bg-card)] text-[var(--text-primary)]">
                        Dismissed
                      </option>

                      <option value="on-fight" className="bg-[var(--bg-card)] text-[var(--text-primary)]">
                        On Fight
                      </option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-headings mb-1">Court Date</label>
                    <input
                      type="date"
                      value={ticketForm.courtDate || ''}
                      onChange={(e) => setTicketForm(prev => ({ ...prev, courtDate: e.target.value }))}
                      className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-[var(--accent-color)] focus:border-transparent"
                      style={{ colorScheme: 'dark' }}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-headings mb-1">Fighting By</label>
                    <select
                      value={ticketForm.fightingBy || ''}
                      onChange={(e) =>
                        setTicketForm((prev) => ({
                          ...prev,
                          fightingBy: e.target.value as 'company' | 'lawyer' | undefined,
                        }))
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
                        Select Option
                      </option>

                      <option
                        value="company"
                        className="bg-[var(--bg-card)] text-[var(--text-primary)]"
                      >
                        Company
                      </option>

                      <option
                        value="lawyer"
                        className="bg-[var(--bg-card)] text-[var(--text-primary)]"
                      >
                        Lawyer
                      </option>
                    </select>
                  </div>
                  {ticketForm.status === 'reduced' && (
                    <div>
                      <label className="block text-sm font-medium text-primary mb-1">Final Amount</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="Final amount after reduction"
                        value={ticketForm.finalAmount || ''}
                        onChange={(e) => setTicketForm(prev => ({ ...prev, finalAmount: parseFloat(e.target.value) || undefined }))}
                        className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-[var(--accent-color)] focus:border-transparent"
                      />
                    </div>
                  )}
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-headings mb-1">Notes</label>
                    <textarea
                      placeholder="Additional notes"
                      value={ticketForm.notes || ''}
                      onChange={(e) => setTicketForm(prev => ({ ...prev, notes: e.target.value }))}
                      className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-[var(--accent-color)] focus:border-transparent"
                      rows={3}
                    />
                  </div>
                </div>

                {/* Payment Information Section - Only show if status is 'paid' */}
                {ticketForm.status === 'paid' && (
                  <div className="bg-green-50 rounded-xl p-6 border border-green-200">
                    <h4 className="text-lg font-bold text-primary mb-4 flex items-center gap-2">
                      <FaCheckCircle className="text-green-600" size={20} />
                      Payment Information
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-primary mb-1">Paid Date</label>
                        <input
                          type="date"
                          value={ticketForm.paidDate || ''}
                          onChange={(e) => setTicketForm(prev => ({ ...prev, paidDate: e.target.value }))}
                          className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-[var(--accent-color)] focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-primary mb-1">Payment Method</label>
                        <select
                          value={ticketForm.paymentMethod || ''}
                          onChange={(e) => setTicketForm(prev => ({ ...prev, paymentMethod: e.target.value }))}
                          className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-[var(--accent-color)] focus:border-transparent"
                        >
                          <option className='form-option' value="">Select Payment Method</option>
                          <option className='form-option' value="cash">Cash</option>
                          <option className='form-option' value="credit_card">Credit Card</option>
                          <option className='form-option' value="check">Check</option>
                          <option className='form-option' value="online">Online Payment</option>
                          <option className='form-option' value="other">Other</option>
                        </select>
                      </div>
                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-primary mb-1">Payment Reference</label>
                        <input
                          type="text"
                          placeholder="Transaction ID, check number, or reference number"
                          value={ticketForm.paymentReference || ''}
                          onChange={(e) => setTicketForm(prev => ({ ...prev, paymentReference: e.target.value }))}
                          className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-[var(--accent-color)] focus:border-transparent"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Lawyer Details Section - Only show if status is 'fight' */}
                {ticketForm.status === 'fight' && (
                  <div className="bg-card rounded-xl p-6 border border-orange-200">
                    <h4 className="text-lg font-bold text-[var(--accent-amber)] mb-4 flex items-center gap-2">
                      <FaGavel className="text-[var(--accent-amber)]" size={20} />
                      Lawyer Details
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-primary mb-1">Lawyer Name <span className="text-red-500">*</span></label>
                        <input
                          type="text"
                          placeholder="Lawyer name"
                          value={ticketForm.lawyerDetails?.name || ''}
                          onChange={(e) => setTicketForm(prev => ({
                            ...prev,
                            lawyerDetails: {
                              ...prev.lawyerDetails,
                              name: e.target.value,
                              firm: prev.lawyerDetails?.firm || '',
                              phone: prev.lawyerDetails?.phone || '',
                              email: prev.lawyerDetails?.email || '',
                              address: prev.lawyerDetails?.address || '',
                              caseNumber: prev.lawyerDetails?.caseNumber || '',
                              courtDate: prev.lawyerDetails?.courtDate || '',
                              status: prev.lawyerDetails?.status || 'active'
                            }
                          }))}
                          className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-[var(--accent-color)] focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-primary mb-1">Firm <span className="text-red-500">*</span></label>
                        <input
                          type="text"
                          placeholder="Law firm name"
                          value={ticketForm.lawyerDetails?.firm || ''}
                          onChange={(e) => setTicketForm(prev => ({
                            ...prev,
                            lawyerDetails: {
                              ...prev.lawyerDetails,
                              firm: e.target.value,
                              name: prev.lawyerDetails?.name || '',
                              phone: prev.lawyerDetails?.phone || '',
                              email: prev.lawyerDetails?.email || '',
                              address: prev.lawyerDetails?.address || '',
                              caseNumber: prev.lawyerDetails?.caseNumber || '',
                              courtDate: prev.lawyerDetails?.courtDate || '',
                              status: prev.lawyerDetails?.status || 'active'
                            }
                          }))}
                          className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-[var(--accent-color)] focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-primary mb-1">Phone <span className="text-red-500">*</span></label>
                        <input
                          type="tel"
                          placeholder="Phone number"
                          value={ticketForm.lawyerDetails?.phone || ''}
                          onChange={(e) => setTicketForm(prev => ({
                            ...prev,
                            lawyerDetails: {
                              ...prev.lawyerDetails,
                              phone: e.target.value,
                              name: prev.lawyerDetails?.name || '',
                              firm: prev.lawyerDetails?.firm || '',
                              email: prev.lawyerDetails?.email || '',
                              address: prev.lawyerDetails?.address || '',
                              caseNumber: prev.lawyerDetails?.caseNumber || '',
                              courtDate: prev.lawyerDetails?.courtDate || '',
                              status: prev.lawyerDetails?.status || 'active'
                            }
                          }))}
                          className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-[var(--accent-color)] focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-primary mb-1">Email <span className="text-red-500">*</span></label>
                        <input
                          type="email"
                          placeholder="Email address"
                          value={ticketForm.lawyerDetails?.email || ''}
                          onChange={(e) => setTicketForm(prev => ({
                            ...prev,
                            lawyerDetails: {
                              ...prev.lawyerDetails,
                              email: e.target.value,
                              name: prev.lawyerDetails?.name || '',
                              firm: prev.lawyerDetails?.firm || '',
                              phone: prev.lawyerDetails?.phone || '',
                              address: prev.lawyerDetails?.address || '',
                              caseNumber: prev.lawyerDetails?.caseNumber || '',
                              courtDate: prev.lawyerDetails?.courtDate || '',
                              status: prev.lawyerDetails?.status || 'active'
                            }
                          }))}
                          className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-[var(--accent-color)] focus:border-transparent"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-primary mb-1">Address <span className="text-red-500">*</span></label>
                        <textarea
                          placeholder="Law firm address"
                          value={ticketForm.lawyerDetails?.address || ''}
                          onChange={(e) => setTicketForm(prev => ({
                            ...prev,
                            lawyerDetails: {
                              ...prev.lawyerDetails,
                              address: e.target.value,
                              name: prev.lawyerDetails?.name || '',
                              firm: prev.lawyerDetails?.firm || '',
                              phone: prev.lawyerDetails?.phone || '',
                              email: prev.lawyerDetails?.email || '',
                              caseNumber: prev.lawyerDetails?.caseNumber || '',
                              courtDate: prev.lawyerDetails?.courtDate || '',
                              status: prev.lawyerDetails?.status || 'active'
                            }
                          }))}
                          className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-[var(--accent-color)] focus:border-transparent"
                          rows={2}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-primary mb-1">Case Number</label>
                        <input
                          type="text"
                          placeholder="Case number"
                          value={ticketForm.lawyerDetails?.caseNumber || ''}
                          onChange={(e) => setTicketForm(prev => ({
                            ...prev,
                            lawyerDetails: {
                              ...prev.lawyerDetails,
                              caseNumber: e.target.value,
                              name: prev.lawyerDetails?.name || '',
                              firm: prev.lawyerDetails?.firm || '',
                              phone: prev.lawyerDetails?.phone || '',
                              email: prev.lawyerDetails?.email || '',
                              address: prev.lawyerDetails?.address || '',
                              courtDate: prev.lawyerDetails?.courtDate || '',
                              status: prev.lawyerDetails?.status || 'active'
                            }
                          }))}
                          className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-[var(--accent-color)] focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-primary mb-1">Court Date</label>
                        <input
                          style={{ colorScheme: 'dark' }}
                          type="date"
                          value={ticketForm.lawyerDetails?.courtDate ? new Date(ticketForm.lawyerDetails.courtDate).toISOString().split('T')[0] : ''}
                          onChange={(e) => setTicketForm(prev => ({
                            ...prev,
                            lawyerDetails: {
                              ...prev.lawyerDetails,
                              courtDate: e.target.value,
                              name: prev.lawyerDetails?.name || '',
                              firm: prev.lawyerDetails?.firm || '',
                              phone: prev.lawyerDetails?.phone || '',
                              email: prev.lawyerDetails?.email || '',
                              address: prev.lawyerDetails?.address || '',
                              caseNumber: prev.lawyerDetails?.caseNumber || '',
                              status: prev.lawyerDetails?.status || 'active'
                            }
                          }))}
                          className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-[var(--accent-color)] focus:border-transparent"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="sticky bottom-0 bg-card px-6 py-4 flex justify-end gap-3 border-t rounded-b-2xl">
                <button onClick={() => { setShowEditModal(false); setSelectedTicket(null); resetForm(); }} className="px-6 py-2.5 bg-card border border-theme text-primary rounded-lg hover:bg-[rgba(255,255,255,0.03)] font-medium transition-colors" disabled={loading}>Cancel</button>
                <button onClick={updateTicketData} className="px-6 py-2.5 bg-[var(--accent-navyblue)] !text-white rounded-lg hover:bg-[var(--accent-navyblue)]/80 font-medium transition-colors disabled:opacity-60" disabled={!validateForm() || loading}>
                  {loading ? 'Updating...' : 'Update Ticket'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* View Ticket Sidebar */}
        {showViewModal && selectedTicket && (
          <>
            <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-[100] transition-all duration-300" onClick={() => setShowViewModal(false)} />
            <div className="fixed top-0 right-0 h-full w-full sm:w-[500px] bg-card shadow-2xl transform transition-transform duration-300 ease-out z-[101] border-l border-theme overflow-y-auto">
              <div className="sticky top-0 bg-card border-b px-4 py-3 z-10">
                <div className="flex justify-between items-center">
                  <h3 className="text-base font-bold text-primary">
                    {selectedTicket.ticketNumber}
                  </h3>
                  <button onClick={() => setShowViewModal(false)} className="p-1.5 hover:bg-[rgba(255,255,255,0.03)] rounded transition-colors">
                    <FaTimesCircle className="text-secondary" size={18} />
                  </button>
                </div>
              </div>

              <div className="p-3 space-y-2">
                {/* Ticket Overview */}
                <div className="bg-card rounded-lg p-3">
                  <h4 className="text-sm font-bold text-primary mb-2">Ticket Info</h4>
                  <div className="grid grid-cols-1 gap-2">
                    <div>
                      <label className="block text-xs font-medium text-secondary mb-0.5">Ticket Number</label>
                      <p className="text-sm font-semibold text-primary">{selectedTicket.ticketNumber}</p>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-secondary mb-0.5">Country</label>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${selectedTicket.country === 'usa'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-red-100 text-red-800'
                        }`}>
                        {selectedTicket.country === 'usa' ? 'USA' : 'Canada'}
                      </span>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-secondary mb-0.5">Violation Type</label>
                      <p className="text-sm font-semibold text-primary">{selectedTicket.violationType}</p>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-secondary mb-0.5">Amount</label>
                      <p className="text-sm font-semibold text-primary">
                        {formatCurrency(selectedTicket.amount)}
                        {selectedTicket.finalAmount && selectedTicket.finalAmount !== selectedTicket.amount && (
                          <span className="text-green-600 text-xs ml-2">(Final: {formatCurrency(selectedTicket.finalAmount)})</span>
                        )}
                      </p>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-secondary mb-0.5">Status</label>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(selectedTicket.status)}
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold border ${getStatusBadgeColor(selectedTicket.status)}`}>
                          {selectedTicket.status === 'fight' ? 'ON FIGHT' : selectedTicket.status.toUpperCase()}
                        </span>
                      </div>
                    </div>
                    {selectedTicket.outcome && (
                      <div>
                        <label className="block text-xs font-medium text-secondary mb-0.5">Outcome</label>
                        <p className="text-sm font-semibold text-primary capitalize">{selectedTicket.outcome}</p>
                      </div>
                    )}
                    <div>
                      <label className="block text-xs font-medium text-secondary mb-0.5">Date Issued</label>
                      <p className="text-sm font-semibold text-primary">{formatDate(selectedTicket.dateIssued)}</p>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-secondary mb-0.5">Due Date</label>
                      <p className="text-sm font-semibold text-primary">{formatDate(selectedTicket.dueDate)}</p>
                    </div>
                    {selectedTicket.courtDate && (
                      <div>
                        <label className="block text-xs font-medium text-secondary mb-0.5">Court Date</label>
                        <p className="text-sm font-semibold text-primary">{formatDate(selectedTicket.courtDate)}</p>
                      </div>
                    )}
                    {selectedTicket.fightingBy && (
                      <div>
                        <label className="block text-xs font-medium text-secondary mb-0.5">Fighting By</label>
                        <p className="text-sm font-semibold text-primary capitalize">{selectedTicket.fightingBy}</p>
                      </div>
                    )}
                    <div>
                      <label className="block text-xs font-medium text-secondary mb-0.5">
                        {selectedTicket.country === 'canada' ? 'Province' : 'State'}
                      </label>
                      <p className="text-sm font-semibold text-primary">{selectedTicket.location}</p>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-secondary mb-0.5">Description</label>
                      <p className="text-xs text-primary">{selectedTicket.violationDescription}</p>
                    </div>
                  </div>
                </div>

                {/* Driver & Vehicle Info */}
                <div className="bg-card rounded-lg p-3">
                  <h4 className="text-xs font-bold text-primary mb-2">Driver & Vehicle</h4>
                  <div className="grid grid-cols-1 gap-2">
                    <div>
                      <label className="block text-xs font-medium text-secondary mb-0.5">Driver</label>
                      <p className="text-sm font-semibold text-primary">{getDriverName(selectedTicket.driver)}</p>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-secondary mb-0.5">Vehicle</label>
                      <p className="text-sm font-semibold text-primary">{getVehicleInfo(selectedTicket.vehicle)}</p>
                    </div>
                    {selectedTicket.unitNumber && (
                      <div>
                        <label className="block text-xs font-medium text-secondary mb-0.5">Unit Number</label>
                        <p className="text-sm font-semibold text-primary">{selectedTicket.unitNumber}</p>
                      </div>
                    )}
                    {selectedTicket.trailerNumber && (
                      <div>
                        <label className="block text-xs font-medium text-secondary mb-0.5">Trailer Number</label>
                        <p className="text-sm font-semibold text-primary">{selectedTicket.trailerNumber}</p>
                      </div>
                    )}
                    <div>
                      <label className="block text-xs font-medium text-secondary mb-0.5">Officer</label>
                      <p className="text-sm font-semibold text-primary">{selectedTicket.officerName}</p>
                    </div>
                  </div>
                </div>

                {/* Payment Information - Only show if status is 'paid' */}
                {selectedTicket.status === 'paid' && (
                  <div className="bg-green-50 rounded-lg p-3 border border-green-200">
                    <h4 className="text-xs font-bold text-primary mb-2 flex items-center gap-1">
                      <FaCheckCircle className="text-green-600" size={14} />
                      Payment Info
                    </h4>
                    <div className="grid grid-cols-1 gap-2">
                      {selectedTicket.paidDate && (
                        <div>
                          <label className="block text-xs font-medium text-secondary mb-0.5">Paid Date</label>
                          <p className="text-sm font-semibold text-primary">{formatDate(selectedTicket.paidDate)}</p>
                        </div>
                      )}
                      {selectedTicket.paymentMethod && (
                        <div>
                          <label className="block text-xs font-medium text-secondary mb-0.5">Payment Method</label>
                          <p className="text-sm font-semibold text-primary">{formatPaymentMethod(selectedTicket.paymentMethod)}</p>
                        </div>
                      )}
                      {selectedTicket.paymentReference && (
                        <div>
                          <label className="block text-xs font-medium text-secondary mb-0.5">Payment Reference</label>
                          <p className="text-sm font-semibold text-primary">{selectedTicket.paymentReference}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Lawyer Details - Only show if status is 'fight' */}
                {selectedTicket.status === 'fight' && selectedTicket.lawyerDetails && (
                  <div className="bg-card rounded-lg p-3 border border-orange-200">
                    <h4 className="text-xs font-bold text-primary mb-2 flex items-center gap-1">
                      <FaGavel className="text-[#F59E0B]" size={14} />
                      Lawyer Info
                    </h4>
                    <div className="grid grid-cols-1 gap-2">
                      <div>
                        <label className="block text-xs font-medium text-secondary mb-0.5">Lawyer Name</label>
                        <p className="text-sm font-semibold text-primary">{selectedTicket.lawyerDetails.name}</p>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-secondary mb-0.5">Firm</label>
                        <p className="text-sm font-semibold text-primary">{selectedTicket.lawyerDetails.firm}</p>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-secondary mb-0.5">Phone</label>
                        <p className="text-sm font-semibold text-primary">{selectedTicket.lawyerDetails.phone}</p>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-secondary mb-0.5">Email</label>
                        <p className="text-sm font-semibold text-primary">{selectedTicket.lawyerDetails.email}</p>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-secondary mb-0.5">Address</label>
                        <p className="text-sm font-semibold text-primary">{selectedTicket.lawyerDetails.address}</p>
                      </div>
                      {selectedTicket.lawyerDetails.caseNumber && (
                        <div>
                          <label className="block text-xs font-medium text-secondary mb-0.5">Case Number</label>
                          <p className="text-sm font-semibold text-primary">{selectedTicket.lawyerDetails.caseNumber}</p>
                        </div>
                      )}
                      {selectedTicket.lawyerDetails.courtDate && (
                        <div>
                          <label className="block text-xs font-medium text-secondary mb-0.5">Court Date</label>
                          <p className="text-sm font-semibold text-primary">{formatDate(selectedTicket.lawyerDetails.courtDate)}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Notes */}
                {selectedTicket.notes && (
                  <div className="bg-card rounded-lg p-3">
                    <h4 className="text-xs font-bold text-primary mb-2">Notes</h4>
                    <p className="text-xs text-primary">{selectedTicket.notes}</p>
                  </div>
                )}
              </div>

              <div className="sticky bottom-0 bg-card px-3 py-2 flex justify-end gap-2 border-t">
                <button onClick={() => setShowViewModal(false)} className="px-4 py-1.5 text-xs bg-card border border-theme text-primary rounded hover:bg-[rgba(255,255,255,0.03)] font-medium transition-colors">Close</button>
              </div>
            </div>
          </>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteModal && ticketToDelete && (
          <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="bg-card rounded-2xl shadow-2xl w-full max-w-md">
              <div className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-red-100 rounded-full">
                    <FaTimesCircle className="text-[#A855F7]" size={24} />
                  </div>
                  <h3 className="text-lg font-bold text-primary">Delete Ticket</h3>
                </div>
                <p className="text-secondary mb-6">Are you sure you want to delete ticket <span className="font-semibold">{ticketToDelete.ticketNumber}</span>? This action cannot be undone.</p>
                <div className="flex justify-end gap-3">
                  <button onClick={() => { setShowDeleteModal(false); setTicketToDelete(null); }} className="px-4 py-2 bg-card text-primary rounded-lg hover:bg-gray-200 font-medium transition-colors" disabled={loading}>Cancel</button>
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

export default Tickets;
