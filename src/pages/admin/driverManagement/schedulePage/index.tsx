import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Clock,
  Truck,
  User,
  Filter,
  X,
  Phone,
  MapPin,
} from 'lucide-react';
import { listOrder, updateOrder } from '../../../../axios/api/distapcher';

// Type definitions
interface Order {
  _id?: string;
  id?: string;
  orderNumber?: string;
  customerOrderNo?: string;
  tripNo?: string;
  driver?: {
    _id: string;
    name: string;
    email?: string;
    phone?: string;
  };
  driverId?: string;
  driverName?: string;
  truck?: {
    _id: string;
    licensePlate?: string;
    plateNumber?: string;
    unitNo?: string;
    make?: string;
    model?: string;
    makeModel?: string;
    internalId?: string;
  };
  trailer?: {
    _id: string;
    licensePlate?: string;
    trailerNumber?: string;
    plateNumber?: string;
    unitNo?: string;
    makeModel?: string;
    internalId?: string;
  };
  pickupDate: string | Date | null;
  deliveryDate: string | Date | null;
  pickupTime?: string;
  deliveryTime?: string;
  pickupLocation?: {
    place?: string;
    placeId?: any;
    latitude?: string;
    longitude?: string;
  };
  deliveryLocation?: {
    place?: string;
    placeId?: any;
    latitude?: string;
    longitude?: string;
  };
  status: 'QUOTED' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | string;
  notes?: string;
  internalNotes?: string;
  customerNotes?: string;
  driverPhone?: string;
  driverEmail?: string;
  customer?: {
    _id?: string;
    name?: string;
    email?: string;
    phone?: string;
  };
  scheduledDate?: Date | null;
}

const DEFAULT_SCHEDULE_TIME = "09:00";

const UnifiedSchedulingPage = () => {
  // View mode: 'scheduling' (for scheduling orders) or 'calendar' (for viewing calendar)
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day'>('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [driverFilter, setDriverFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);

  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [selectedTime, setSelectedTime] = useState(DEFAULT_SCHEDULE_TIME);
  const [draggedOrder, setDraggedOrder] = useState<Order | null>(null);
  const [emptyStateMessage, setEmptyStateMessage] = useState<string | null>(null);
  const userInfoRef = useRef<any>(null);

  // Fetch orders from backend
  const fetchOrders = useCallback(
    async (options?: { suppressLoading?: boolean }) => {
      if (!options?.suppressLoading) {
        setLoading(true);
      }

      try {
        let currentUser = userInfoRef.current;
        if (!currentUser) {
          const stored = localStorage.getItem("userInfo");
          if (stored) {
            try {
              currentUser = JSON.parse(stored);
              userInfoRef.current = currentUser;
            } catch (error) {
              console.error("Error parsing userInfo during fetch:", error);
            }
          }
        }

        const userRole = currentUser?.role || currentUser?.userData?.role;
        const userCompany = currentUser?.company || currentUser?.userData?.company;
        const isSuperadmin = userRole === "superadmin";
        const isDispatcher = userRole === "dispatcher";
        const hasCompany = Boolean(userCompany);

        if (!isSuperadmin && !isDispatcher && !hasCompany) {
          setOrders([]);
          setEmptyStateMessage("No company assigned. Please complete company settings to view orders.");
          return;
        }

        const params: any = { limit: 500 };

        if (driverFilter !== 'all') {
          params.driver = driverFilter;
        }

        if (statusFilter !== 'all') {
          params.status = statusFilter;
        }

        const response = await listOrder(params);
        const message = response?.message || null;
        const data = response?.data;

        if (response?.success && Array.isArray(data)) {
          if (data.length === 0) {
            setOrders([]);
            setEmptyStateMessage(message || "No orders available.");
            return;
          }

          const mappedOrders: Order[] = data.map((order: any) => ({
            _id: order._id,
            id: order._id,
            orderNumber: order.orderNumber,
            customerOrderNo: order.customerOrderNo,
            tripNo: order.tripNo,
            driverId: order.driver?._id || order.driver,
            driverName: order.driver?.name || 'Unknown Driver',
            driverPhone: order.driver?.phone,
            driverEmail: order.driver?.email,
            driver: order.driver,
            truck: order.truck,
            trailer: order.trailer,
            pickupDate: order.pickupDate || null,
            deliveryDate: order.deliveryDate || null,
            pickupTime: order.pickupTime,
            deliveryTime: order.deliveryTime,
            pickupLocation: order.pickupLocation,
            deliveryLocation: order.deliveryLocation,
            status: order.status || 'QUOTED',
            notes: order.internalNotes || order.customerNotes || '',
            internalNotes: order.internalNotes,
            customerNotes: order.customerNotes,
            customer: order.customer,
            scheduledDate: order.pickupDate ? new Date(order.pickupDate) : null
          }));

          setOrders(mappedOrders);
          setEmptyStateMessage(null);
        } else {
          setOrders([]);
          setEmptyStateMessage(message || "Failed to fetch orders.");
        }
      } catch (error: any) {
        console.error("Error fetching orders:", error);
        const fallbackMessage = error?.message || error?.data?.message || "Error fetching orders.";
        setOrders([]);
        setEmptyStateMessage(fallbackMessage);
      } finally {
        if (!options?.suppressLoading) {
          setLoading(false);
        }
      }
    },
    [driverFilter]
  );

  useEffect(() => {
    const syncUser = () => {
      try {
        const stored = localStorage.getItem("userInfo");
        if (stored) {
          userInfoRef.current = JSON.parse(stored);
        }
      } catch (error) {
        console.error("Error parsing userInfo from localStorage:", error);
      }
    };

    syncUser();
    fetchOrders();

    const handleStorage = (event: StorageEvent) => {
      if (event.key === "userInfo") {
        syncUser();
        fetchOrders();
      }
    };

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [fetchOrders]);

  const scheduledOrders = orders.filter((order) => order.scheduledDate || order.pickupDate);

  // Filter orders based on selected filters
  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      const driverMatch = driverFilter === 'all' || order.driverId === driverFilter || order.driver?._id === driverFilter;
      const statusMatch = statusFilter === 'all' || order.status === statusFilter;
      return driverMatch && statusMatch;
    });
  }, [orders, driverFilter, statusFilter]);

  // Get unique drivers from orders
  const uniqueDrivers = useMemo(() => {
    const driverMap = new Map();
    orders.forEach(order => {
      if (order.driver) {
        driverMap.set(order.driver._id, {
          id: order.driver._id,
          name: order.driver.name
        });
      }
    });
    return Array.from(driverMap.values());
  }, [orders]);


  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();

  // Calendar navigation
  const navigateMonth = (direction: number) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(currentMonth + direction);
    setCurrentDate(newDate);
  };

  const navigateWeek = (direction: number) => {
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() + (direction * 7));
    setCurrentDate(newDate);
  };

  const navigateDay = (direction: number) => {
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() + direction);
    setCurrentDate(newDate);
  };

  const goToToday = () => {
    const today = new Date();
    setCurrentDate(new Date(today.getFullYear(), today.getMonth(), 1));
  };



  const combineDateAndTime = (date: Date, time: string) => {
    const [hours = "09", minutes = "00"] = time?.split(":") ?? [];
    const combined = new Date(date);
    combined.setHours(Number(hours) || 0, Number(minutes) || 0, 0, 0);
    return combined;
  };

  const scheduleOrder = async (order: Order, date: Date, time: string = DEFAULT_SCHEDULE_TIME) => {
    if (!date || !order._id) return;

    try {
      const scheduledDate = combineDateAndTime(date, time);
      await updateOrder(order._id, { pickupDate: scheduledDate.toISOString() });
      await fetchOrders({ suppressLoading: true });
    } catch (error) {
      console.error("Error scheduling order:", error);
    }
  };



  const handleDrop = (date: Date) => {
    if (draggedOrder) {
      scheduleOrder(draggedOrder, date, DEFAULT_SCHEDULE_TIME);
      setDraggedOrder(null);
    }
  };

  // Calendar utility functions
  const getOrdersForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return filteredOrders.filter(order => {
      const orderDate = order.pickupDate
        ? new Date(order.pickupDate).toISOString().split('T')[0]
        : null;
      return orderDate === dateStr;
    });
  };

  const hasOrderOnDate = (date: Date) => getOrdersForDate(date).length > 0;

  const generateCalendarDays = () => {
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    const firstDayOfWeek = firstDay.getDay();
    const daysInMonth = lastDay.getDate();

    const days = [];

    // Previous month days
    for (let i = 0; i < firstDayOfWeek; i++) {
      const prevDate = new Date(currentYear, currentMonth, -firstDayOfWeek + i + 1);
      days.push({ date: prevDate, isCurrentMonth: false });
    }

    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentYear, currentMonth, day);
      days.push({ date, isCurrentMonth: true });
    }

    // Next month days
    const remainingCells = 42 - days.length;
    for (let day = 1; day <= remainingCells; day++) {
      const nextDate = new Date(currentYear, currentMonth + 1, day);
      days.push({ date: nextDate, isCurrentMonth: false });
    }

    return days;
  };

  const generateWeekDays = () => {
    const startOfWeek = new Date(currentDate);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day;
    startOfWeek.setDate(diff);

    const days = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      days.push(date);
    }
    return days;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-[var(--accent-green)]/10 text-[var(--accent-green)] border-theme';
      case 'IN_PROGRESS':
        return 'bg-[var(--accent-blue)]/10 text-[var(--accent-blue)] border-theme';
      case 'CONFIRMED':
        return 'bg-[var(--accent-purple)]/10 text-[var(--accent-purple)] border-theme';
      case 'QUOTED':
        return 'bg-[var(--accent-orange)]/10 text-[var(--accent-orange)] border-theme';
      default:
        return 'bg-card text-primary border-theme';
    }
  };

  const formatTime = (dateString: string | Date) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

  const getMonthName = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const getOrderIdentifier = (order: Order) => order.customerOrderNo || order.orderNumber || `Order ${order._id?.slice(-6) || ''}`;
  const getCustomerName = (order: Order) => order.customer?.name || "No customer";

  const monthName = getMonthName(currentDate);
  const calendarDays = generateCalendarDays();
  const weekDays = generateWeekDays();

  if (loading && orders.length === 0) {
    return (
      <div className="min-h-screen bg-card flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--accent-blue)] mx-auto mb-4"></div>
          <p className="text-secondary">Loading orders...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-main">
      {/* Header */}
      <div className=" p-5">
        <div className="w-full mx-auto">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-2xl font-bold text-primary">Order Scheduling</h1>
              <p className="text-secondary mt-0.5 text-sm">Schedule orders, view calendar, and manage driver assignments</p>
            </div>
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-3 text-sm text-secondary">
                <div className="flex items-center space-x-1">
                  <Calendar className="w-3.5 h-3.5" />
                  <span><strong>{scheduledOrders.length}</strong> Scheduled</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Truck className="w-3.5 h-3.5" />
                  <span><strong>{orders.length}</strong> Total</span>
                </div>
              </div>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center px-3.5 py-1.5 border border-theme rounded-md hover:bg-[rgba(255,255,255,0.03)] transition-colors"
              >
                <Filter className="w-3.5 h-3.5 mr-1.5" />
                Filters
              </button>
            </div>
          </div>

          {/* Quick Info Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
            <div className="bg-gradient-to-br from-[var(--accent-blue)]/10 to-[var(--accent-blue)]/5 rounded-md p-3 border border-blue-200">
              <div className="text-xl font-bold text-[var(--accent-blue)]">{scheduledOrders.length}</div>
              <div className="text-xs text-accent">Scheduled Orders</div>
            </div>
            <div className="bg-gradient-to-br from-[var(--accent-green)]/10 to-[var(--accent-green)]/5 rounded-md p-3 border border-green-200">
              <div className="text-xl font-bold text-[var(--accent-green)]">{orders.filter(o => o.status === 'COMPLETED').length}</div>
              <div className="text-xs text-[var(--accent-green)]">Completed</div>
            </div>
            <div className="bg-gradient-to-br from-[var(--accent-purple)]/10 to-[var(--accent-purple)]/5 rounded-md p-3 border border-purple-200">
              <div className="text-xl font-bold text-[var(--accent-purple)]">{orders.filter(o => o.status === 'IN_PROGRESS').length}</div>
              <div className="text-xs text-[var(--accent-purple)]">In Progress</div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className=" p-5">
          <div className="w-full mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-sm font-medium text-primary mb-1.5">Driver</label>
                <select
                  value={driverFilter}
                  onChange={(e) => setDriverFilter(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-theme rounded-md focus:ring-2 focus:ring-[var(--accent-blue)]"
                >
                  <option value="all">All Drivers</option>
                  {uniqueDrivers.map((driver) => (
                    <option key={driver.id} value={driver.id}>
                      {driver.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-primary mb-1.5">Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-theme rounded-md focus:ring-2 focus:ring-[var(--accent-blue)]"
                >
                  <option value="all">All Status</option>
                  <option value="QUOTED">Quoted</option>
                  <option value="CONFIRMED">Confirmed</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="COMPLETED">Completed</option>
                </select>
              </div>
              <div className="flex items-end">
                <button
                  onClick={() => {
                    setDriverFilter('all');
                    setStatusFilter('all');
                  }}
                  className="w-[50%] px-2 py-1.5 text-sm text-primary bg-card hover:bg-[rgba(255,255,255,0.05)] rounded-md transition-colors"
                >
                  Clear Filters
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {emptyStateMessage && orders.length === 0 && (
        <div className="w-full mx-auto p-5">
          <div className="bg-card border border-blue-100 text-[var(--accent-blue)] px-3.5 py-2.5 rounded-md flex items-center gap-2.5">
            <Calendar className="text-lg" />
            <span className="text-sm">{emptyStateMessage}</span>
          </div>
        </div>
      )}

      <div className="w-full mx-auto p-5">
        <div className="flex flex-col gap-5">
          {/* Scheduled Orders List - Collapsible Sidebar */}
          <div className="bg-card rounded-lg shadow-sm border border-theme">
            <div className="p-3.5 border-b border-theme bg-card">
              <h3 className="text-sm font-semibold text-primary">Scheduled Orders ({scheduledOrders.length})</h3>
            </div>

            <div className="p-3.5 max-h-[200px] overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5">
                {scheduledOrders.length > 0 ? (
                  scheduledOrders.map((order) => (
                    <div
                      key={order._id || order.id}
                      className="p-2.5 rounded-md border bg-[var(--accent-green)]/10 border-theme cursor-pointer transition-all hover:shadow-md"
                      onClick={() => {
                        setSelectedOrder(order);
                      }}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-primary truncate">
                          {getOrderIdentifier(order)}
                        </div>
                        <div className="text-sm text-secondary flex items-center mt-1">
                          <User className="w-3 h-3 mr-1 flex-shrink-0" />
                          <span className="truncate">{order.driverName || order.driver?.name || 'No driver'}</span>
                        </div>
                        {getCustomerName(order) !== "No customer" && (
                          <div className="text-xs text-secondary mt-1 truncate">
                            {getCustomerName(order)}
                          </div>
                        )}
                        <div className="text-xs text-secondary mt-2 flex items-center">
                          <Clock className="w-3 h-3 mr-1 flex-shrink-0" />
                          <span className="capitalize">{order.status.replace('_', ' ')}</span>
                        </div>
                        {order.scheduledDate && (
                          <div className="text-xs text-secondary mt-1">
                            {typeof order.scheduledDate === 'string'
                              ? new Date(order.scheduledDate).toLocaleDateString("en-GB")
                              : order.scheduledDate.toLocaleDateString("en-GB")
                            }
                          </div>
                        )}
                        {order.pickupDate && (
                          <div className="text-xs text-secondary mt-1">
                            {formatTime(order.pickupDate)}
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="col-span-full text-center py-7">
                    <Truck className="mx-auto mb-2.5 text-secondary" size={30} />
                    <p className="text-secondary text-sm">No scheduled orders found</p>
                    {emptyStateMessage && (
                      <p className="text-xs text-secondary mt-1">{emptyStateMessage}</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Calendar Section */}
          <div className="bg-card rounded-lg shadow-sm border border-theme p-5">
            {/* Calendar Navigation */}
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center space-x-3.5">
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => viewMode === 'month' ? navigateMonth(-1) : viewMode === 'week' ? navigateWeek(-1) : navigateDay(-1)}
                    className="p-1.5 rounded-md hover:bg-[rgba(255,255,255,0.03)] transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <h2 className="text-lg font-semibold text-primary min-w-[180px] text-center">
                    {viewMode === 'month' && monthName}
                    {viewMode === 'week' && `Week of ${weekDays[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}
                    {viewMode === 'day' && currentDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                  </h2>
                  <button
                    onClick={() => viewMode === 'month' ? navigateMonth(1) : viewMode === 'week' ? navigateWeek(1) : navigateDay(1)}
                    className="p-1.5 rounded-md hover:bg-[rgba(255,255,255,0.03)] transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
                <button
                  onClick={goToToday}
                  className="px-2.5 py-1 text-sm bg-[var(--accent-blue)]/20 text-[var(--accent-blue)] rounded-md hover:bg-[var(--accent-blue)]/20 transition-colors"
                >
                  Today
                </button>
              </div>

              <div className="flex items-center space-x-1.5 bg-card border border-theme rounded-md p-0.5">
                {['month', 'week', 'day'].map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setViewMode(mode as 'month' | 'week' | 'day')}
                    className={`px-2.5 py-0.5 rounded-md text-sm font-medium transition-colors ${viewMode === mode
                      ? 'bg-card text-primary shadow-sm'
                      : 'text-secondary hover:text-primary'
                      }`}
                  >
                    {mode.charAt(0).toUpperCase() + mode.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Calendar View */}
            {viewMode === 'month' && (
              <>
                <div className="grid grid-cols-7 bg-card border-b border-theme rounded-t-md">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                    <div key={day} className="p-2.5 text-center text-sm font-medium text-secondary border-r last:border-r-0">
                      {day}
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-7 border border-theme border-t-0 rounded-b-md overflow-hidden">
                  {calendarDays.map((day, index) => {
                    const dayOrders = getOrdersForDate(day.date);
                    const isToday = day.date.toDateString() === new Date().toDateString();
                    const hasOrder = hasOrderOnDate(day.date);

                    return (
                      <div
                        key={index}
                        onClick={() => setCurrentDate(day.date)}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={() => handleDrop(day.date)}
                        className={`min-h-[115px] p-1.5 border-r border-b last:border-r-0 cursor-pointer transition-colors
                          ${!day.isCurrentMonth ? 'bg-card' : 'bg-card'}
                          ${isToday ? 'bg-card' : ''}
                          ${hasOrder && !isToday ? 'bg-[var(--accent-green)]/10' : ''}
                          ${draggedOrder ? 'bg-[var(--accent-blue)]/10 border-2 border-dashed border-[var(--accent-blue)]' : ''}
                          hover:bg-[rgba(255,255,255,0.03)]
                        `}
                      >
                        <div className={`text-sm font-medium mb-1.5 ${!day.isCurrentMonth ? 'text-secondary' : isToday ? 'text-accent font-bold' : 'text-primary'
                          }`}>
                          {day.date.getDate()}
                        </div>

                        <div className="space-y-1">
                          {dayOrders.slice(0, 3).map((order) => (
                            <div
                              key={order.id || order._id}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedOrder(order);
                              }}
                              className={`p-1 rounded text-xs cursor-pointer hover:shadow-sm transition-all ${getStatusColor(order.status)}`}
                            >
                              <div className="font-medium truncate">{order.driverName || order.driver?.name || 'Unknown Driver'}</div>
                              {(order.customerOrderNo || order.orderNumber) && (
                                <div className="text-xs opacity-75 truncate">{order.customerOrderNo || order.orderNumber}</div>
                              )}
                              {order.pickupDate && (
                                <div className="text-xs opacity-75">{formatTime(order.pickupDate)}</div>
                              )}
                            </div>
                          ))}
                          {dayOrders.length > 3 && (
                            <div className="text-xs text-secondary text-center py-0.5">
                              +{dayOrders.length - 3} more
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Legend */}
                <div className="mt-3 bg-card rounded-md p-3">
                  <h4 className="text-sm font-medium text-primary mb-2.5">Calendar Legend</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 text-xs">
                    <div className="flex items-center">
                      <div className="w-3.5 h-3.5 bg-card border-2 border-[var(--accent-blue)] rounded mr-1.5"></div>
                      <span>Today</span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-3.5 h-3.5 bg-[var(--accent-green)]/10 rounded mr-1.5"></div>
                      <span>Has Orders</span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-3.5 h-3.5 bg-[var(--accent-blue)]/10 border-2 border-dashed border-[var(--accent-blue)] rounded mr-1.5"></div>
                      <span>Drop Zone</span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-3.5 h-3.5 bg-secondary rounded mr-1.5"></div>
                      <span>Other Month</span>
                    </div>
                  </div>
                  <div className="mt-1.5 text-xs text-secondary">
                    💡 Click on calendar dates to view scheduled orders
                  </div>
                </div>
              </>
            )}

            {viewMode === 'week' && (
              <>
                <div className="grid grid-cols-8 bg-card border-b border-theme rounded-t-md">
                  <div className="p-2.5 border-r"></div>
                  {weekDays.map((day) => {
                    const isToday = day.toDateString() === new Date().toDateString();
                    const dayOrders = getOrdersForDate(day);

                    return (
                      <div key={day.toISOString()} className={`p-2.5 text-center border-r last:border-r-0 ${isToday ? 'bg-card' : ''}`}>
                        <div className="text-sm font-medium text-secondary">
                          {day.toLocaleDateString('en-US', { weekday: 'short' })}
                        </div>
                        <div className={`text-base font-semibold ${isToday ? 'text-accent' : 'text-primary'}`}>
                          {day.getDate()}
                        </div>
                        {dayOrders.length > 0 && (
                          <div className="text-xs text-secondary mt-1">
                            {dayOrders.length} orders
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="p-3 border border-theme border-t-0 rounded-b-md">
                  <div className="grid grid-cols-7 gap-3">
                    {weekDays.map((day) => {
                      const dayOrders = getOrdersForDate(day);

                      return (
                        <div key={day.toISOString()} className="space-y-1.5">
                          {dayOrders.map((order) => (
                            <div
                              key={order.id || order._id}
                              onClick={() => setSelectedOrder(order)}
                              className={`p-2.5 rounded-md cursor-pointer hover:shadow-md transition-all ${getStatusColor(order.status)}`}
                            >
                              <div className="font-medium text-sm truncate">{order.driverName || order.driver?.name || 'Unknown Driver'}</div>
                              {(order.customerOrderNo || order.orderNumber) && (
                                <div className="text-xs text-secondary mt-1 truncate">{order.customerOrderNo || order.orderNumber}</div>
                              )}
                              {order.pickupDate && (
                                <div className="text-xs text-secondary mt-1">
                                  {formatTime(order.pickupDate)}
                                  {order.deliveryDate && ` - ${formatTime(order.deliveryDate)}`}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}

            {viewMode === 'day' && (
              <div className="border border-theme rounded-md p-5">
                <div className="space-y-3">
                  {getOrdersForDate(currentDate).length === 0 ? (
                    <div className="text-center py-10 text-secondary">
                      <Calendar className="w-11 h-11 mx-auto mb-3 opacity-50" />
                      <p>No orders scheduled for this day</p>
                    </div>
                  ) : (
                    getOrdersForDate(currentDate).map((order) => (
                      <div
                        key={order.id || order._id}
                        onClick={() => setSelectedOrder(order)}
                        className={`p-5 rounded-md cursor-pointer hover:shadow-md transition-all ${getStatusColor(order.status)}`}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-2.5">
                            <User className="w-7 h-7 text-secondary" />
                            <div>
                              <span className="font-medium text-base">{order.driverName || order.driver?.name || 'Unknown Driver'}</span>
                              {(order.customerOrderNo || order.orderNumber) && (
                                <p className="text-sm text-secondary">Order: {order.customerOrderNo || order.orderNumber}</p>
                              )}
                              {order.truck && (
                                <p className="text-sm text-secondary">
                                  Truck: {order.truck.licensePlate || order.truck.plateNumber || order.truck.unitNo || order.truck.internalId || 'N/A'}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className={`px-2.5 py-0.5 rounded-full text-sm font-medium ${getStatusColor(order.status)}`}>
                            {order.status.replace('_', ' ')}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                          {order.pickupDate && (
                            <div className="text-sm text-secondary">
                              <strong>Pickup:</strong> {new Date(order.pickupDate).toLocaleString()}
                            </div>
                          )}
                          {order.deliveryDate && (
                            <div className="text-sm text-secondary">
                              <strong>Delivery:</strong> {new Date(order.deliveryDate).toLocaleString()}
                            </div>
                          )}
                          {order.truck && (
                            <div className="text-sm text-secondary">
                              <strong>Truck:</strong> {order.truck.licensePlate || order.truck.plateNumber || order.truck.unitNo || order.truck.internalId || 'N/A'}
                            </div>
                          )}
                        </div>

                        {(() => {
                          let pickupPlace = '';
                          if (typeof order.pickupLocation === 'string') {
                            pickupPlace = order.pickupLocation;
                          } else if (order.pickupLocation?.place) {
                            pickupPlace = order.pickupLocation.place;
                          } else if (order.pickupLocation?.placeId?.currentLocation?.address) {
                            pickupPlace = order.pickupLocation.placeId.currentLocation.address;
                          } else if (order.pickupLocation?.placeId?.name) {
                            pickupPlace = order.pickupLocation.placeId.name;
                          }
                          return pickupPlace ? (
                            <div className="text-sm text-secondary mb-1.5">
                              <strong>From:</strong> {pickupPlace}
                            </div>
                          ) : null;
                        })()}
                        {(() => {
                          let deliveryPlace = '';
                          if (typeof order.deliveryLocation === 'string') {
                            deliveryPlace = order.deliveryLocation;
                          } else if (order.deliveryLocation?.place) {
                            deliveryPlace = order.deliveryLocation.place;
                          } else if (order.deliveryLocation?.placeId?.currentLocation?.address) {
                            deliveryPlace = order.deliveryLocation.placeId.currentLocation.address;
                          } else if (order.deliveryLocation?.placeId?.name) {
                            deliveryPlace = order.deliveryLocation.placeId.name;
                          }
                          return deliveryPlace ? (
                            <div className="text-sm text-secondary mb-1.5">
                              <strong>To:</strong> {deliveryPlace}
                            </div>
                          ) : null;
                        })()}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Schedule Modal */}
      {showScheduleModal && selectedOrder && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-lg p-6 w-96 max-w-full">
            <h3 className="text-lg font-semibold text-primary mb-4">
              Schedule Order
            </h3>

            <div className="mb-4">
              <div className="font-medium text-primary">
                {getOrderIdentifier(selectedOrder)}
              </div>
              <div className="text-sm text-secondary">
                Customer: {getCustomerName(selectedOrder)}
              </div>
              {selectedOrder.driver?.name && (
                <div className="text-sm text-secondary">
                  Driver: {selectedOrder.driver.name}
                </div>
              )}
              {selectedOrder.truck?.internalId && (
                <div className="text-sm text-secondary">
                  Truck: {selectedOrder.truck.internalId}
                </div>
              )}
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-primary mb-2">
                Select Date
              </label>
              <input
                type="date"
                value={currentDate.toISOString().split("T")[0]}
                onChange={(e) => {
                  if (e.target.value) {
                    setCurrentDate(new Date(e.target.value));
                  }
                }}
                className="w-full px-3 py-2 border border-theme rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)]"
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-primary mb-2">
                Select Time
              </label>
              <input
                type="time"
                value={selectedTime}
                onChange={(e) => setSelectedTime(e.target.value || DEFAULT_SCHEDULE_TIME)}
                className="w-full px-3 py-2 border border-theme rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)]"
              />
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowScheduleModal(false);
                  setSelectedOrder(null);
                  setSelectedTime(DEFAULT_SCHEDULE_TIME);
                }}
                className="px-4 py-2 text-sm !mr-3 font-medium text-primary bg-card border border-theme rounded-md hover:bg-[rgba(255,255,255,0.03)]"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  scheduleOrder(selectedOrder, currentDate, selectedTime);
                  setShowScheduleModal(false);
                  setSelectedOrder(null);
                  setSelectedTime(DEFAULT_SCHEDULE_TIME);
                }}
                className="px-4 py-2 text-sm font-medium !text-white bg-[var(--accent-blue)] rounded-md hover:bg-[var(--accent-blue)]"
                style={{
                  background: "linear-gradient(90deg, var(--accent-blue) 0%, var(--accent-blue) 40%, rgba(0,209,255,0.15) 100%)",
                }}
              >
                Schedule Order
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Order Details Modal */}
      {selectedOrder && !showScheduleModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-card rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <User className="w-8 h-8 text-secondary" />
                  <div>
                    <h2 className="text-2xl font-bold text-primary">{selectedOrder.driverName || selectedOrder.driver?.name || 'Unknown Driver'}</h2>
                    {(selectedOrder.customerOrderNo || selectedOrder.orderNumber) && (
                      <p className="text-secondary">Order: {selectedOrder.customerOrderNo || selectedOrder.orderNumber}</p>
                    )}
                    {selectedOrder.truck && (
                      <p className="text-secondary">
                        Truck: {selectedOrder.truck.licensePlate || selectedOrder.truck.plateNumber || selectedOrder.truck.unitNo || selectedOrder.truck.internalId || 'N/A'}
                      </p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="text-secondary hover:text-secondary transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <h3 className="font-medium text-primary">Order Details</h3>
                    <div className="text-sm text-secondary space-y-1">
                      {selectedOrder.pickupDate && (
                        <div><strong>Pickup Date:</strong> {new Date(selectedOrder.pickupDate).toLocaleString()}</div>
                      )}
                      {selectedOrder.deliveryDate && (
                        <div><strong>Delivery Date:</strong> {new Date(selectedOrder.deliveryDate).toLocaleString()}</div>
                      )}
                      {(selectedOrder.customerOrderNo || selectedOrder.orderNumber) && (
                        <div><strong>Order Number:</strong> {selectedOrder.customerOrderNo || selectedOrder.orderNumber}</div>
                      )}
                      {selectedOrder.truck && (
                        <div><strong>Truck:</strong> {selectedOrder.truck.licensePlate || selectedOrder.truck.plateNumber || selectedOrder.truck.unitNo || selectedOrder.truck.internalId || 'N/A'}</div>
                      )}
                      {selectedOrder.trailer && (
                        <div><strong>Trailer:</strong> {selectedOrder.trailer.licensePlate || selectedOrder.trailer.plateNumber || selectedOrder.trailer.trailerNumber || selectedOrder.trailer.unitNo || selectedOrder.trailer.internalId || 'N/A'}</div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h3 className="font-medium text-primary">Status & Location</h3>
                    <div className="text-sm text-secondary space-y-1">
                      {selectedOrder.pickupDate && selectedOrder.deliveryDate && (
                        <div><strong>Duration:</strong> {Math.round((new Date(selectedOrder.deliveryDate).getTime() - new Date(selectedOrder.pickupDate).getTime()) / (1000 * 60 * 60) * 10) / 10} hours</div>
                      )}
                      <div><strong>Status:</strong>
                        <span className={`ml-2 px-2 py-1 rounded text-xs font-medium ${getStatusColor(selectedOrder.status)}`}>
                          {selectedOrder.status.replace('_', ' ')}
                        </span>
                      </div>
                      {(() => {
                        let pickupPlace = '';
                        if (typeof selectedOrder.pickupLocation === 'string') {
                          pickupPlace = selectedOrder.pickupLocation;
                        } else if (selectedOrder.pickupLocation?.place) {
                          pickupPlace = selectedOrder.pickupLocation.place;
                        } else if (selectedOrder.pickupLocation?.placeId?.currentLocation?.address) {
                          pickupPlace = selectedOrder.pickupLocation.placeId.currentLocation.address;
                        } else if (selectedOrder.pickupLocation?.placeId?.name) {
                          pickupPlace = selectedOrder.pickupLocation.placeId.name;
                        }
                        return pickupPlace ? <div><strong>From:</strong> {pickupPlace}</div> : null;
                      })()}
                      {(() => {
                        let deliveryPlace = '';
                        if (typeof selectedOrder.deliveryLocation === 'string') {
                          deliveryPlace = selectedOrder.deliveryLocation;
                        } else if (selectedOrder.deliveryLocation?.place) {
                          deliveryPlace = selectedOrder.deliveryLocation.place;
                        } else if (selectedOrder.deliveryLocation?.placeId?.currentLocation?.address) {
                          deliveryPlace = selectedOrder.deliveryLocation.placeId.currentLocation.address;
                        } else if (selectedOrder.deliveryLocation?.placeId?.name) {
                          deliveryPlace = selectedOrder.deliveryLocation.placeId.name;
                        }
                        return deliveryPlace ? <div><strong>To:</strong> {deliveryPlace}</div> : null;
                      })()}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="font-medium text-primary">Driver Contact</h3>
                  <div className="text-sm text-secondary space-y-1">
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4" />
                      <span>{selectedOrder.driverPhone || selectedOrder.driver?.phone || 'N/A'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      <span>{selectedOrder.driverEmail || selectedOrder.driver?.email || 'N/A'}</span>
                    </div>
                  </div>
                </div>

                {(selectedOrder.notes || selectedOrder.internalNotes || selectedOrder.customerNotes) && (
                  <div className="space-y-2">
                    <h3 className="font-medium text-primary">Notes</h3>
                    <div className="p-3 bg-card rounded-lg text-sm text-primary">
                      {selectedOrder.notes || selectedOrder.internalNotes || selectedOrder.customerNotes}
                    </div>
                  </div>
                )}

                <div className="flex justify-end space-x-3 pt-4 border-t">
                  <button
                    onClick={() => setSelectedOrder(null)}
                    className="px-4 py-2 text-sm font-medium text-primary bg-card border border-theme rounded-md hover:bg-[rgba(255,255,255,0.05)]"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UnifiedSchedulingPage;
