import { useState, useEffect, useCallback, useRef } from "react";
import { ChevronLeft, ChevronRight, Calendar, Clock, User, Truck, Trash2 } from "lucide-react";
import { listTrip, updateTrip } from "../../../../../axios/api/distapcher";

interface SchedulerTrip {
    _id: string;
    tripNumber?: string;
    status: string;
    plannedStartDate?: string | null;
    driver?: {
        _id: string;
        name?: string;
    };
    truck?: {
        _id: string;
        plateNumber?: string;
    internalId?: string;
    };
    trailer?: {
        _id: string;
        trailerNumber?: string;
        plateNumber?: string;
    } | null;
    orders?: Array<{
        _id: string;
        orderNumber?: string;
        customer?: {
            name?: string;
        };
    }>;
    notes?: string | null;
    scheduledDate: Date | null;
}

const DEFAULT_SCHEDULE_TIME = "09:00";

const SchedulerPage = () => {
    const [activeTab, setActiveTab] = useState<"unscheduled" | "scheduled">("unscheduled");
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
    const [trips, setTrips] = useState<SchedulerTrip[]>([]);
    const [loading, setLoading] = useState(true);
    const [showScheduleModal, setShowScheduleModal] = useState(false);
    const [selectedTrip, setSelectedTrip] = useState<SchedulerTrip | null>(null);
    const [selectedTime, setSelectedTime] = useState(DEFAULT_SCHEDULE_TIME);
    const [draggedTrip, setDraggedTrip] = useState<SchedulerTrip | null>(null);
    const [emptyStateMessage, setEmptyStateMessage] = useState<string | null>(null);
    const userInfoRef = useRef<any>(null);

    const formatTimeFromDate = (date: Date | null) => {
        if (!date) {
            return DEFAULT_SCHEDULE_TIME;
        }
        const hours = String(date.getHours()).padStart(2, "0");
        const minutes = String(date.getMinutes()).padStart(2, "0");
        return `${hours}:${minutes}`;
    };

    const combineDateAndTime = (date: Date, time: string) => {
        const [hours = "09", minutes = "00"] = time?.split(":") ?? [];
        const combined = new Date(date);
        combined.setHours(Number(hours) || 0, Number(minutes) || 0, 0, 0);
        return combined;
    };

    const fetchTrips = useCallback(
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
                    setTrips([]);
                    setEmptyStateMessage("No company assigned. Please complete company settings to view trips.");
                    return;
                }

                const response = await listTrip({ limit: 500 });
                const message = response?.message || null;
                const data = response?.data;

                if (response?.success && Array.isArray(data)) {
                    if (data.length === 0) {
                        setTrips([]);
                        setEmptyStateMessage(message || "No trips available.");
                        return;
                    }

                    const tripsWithDates: SchedulerTrip[] = data.map((trip: any) => ({
                        ...trip,
                        scheduledDate: trip.plannedStartDate ? new Date(trip.plannedStartDate) : null
                    }));

                    setTrips(tripsWithDates);
                    setEmptyStateMessage(null);
                } else {
                    setTrips([]);
                    setEmptyStateMessage(message || "Failed to fetch trips.");
                }
            } catch (error: any) {
                console.error("Error fetching trips:", error);
                const fallbackMessage = error?.message || error?.data?.message || "Error fetching trips.";
                setTrips([]);
                setEmptyStateMessage(fallbackMessage);
            } finally {
                if (!options?.suppressLoading) {
                    setLoading(false);
                }
            }
        },
        []
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
        fetchTrips();

        const handleStorage = (event: StorageEvent) => {
            if (event.key === "userInfo") {
                syncUser();
                fetchTrips();
            }
        };

        window.addEventListener("storage", handleStorage);
        return () => window.removeEventListener("storage", handleStorage);
    }, [fetchTrips]);

    const scheduledTrips = trips.filter((trip) => trip.scheduledDate);
    const unscheduledTrips = trips.filter((trip) => !trip.scheduledDate);

    const getDaysInMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();

    const getFirstDayOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay();

    const getPreviousMonthDays = (date: Date) => {
        const prevMonth = new Date(date.getFullYear(), date.getMonth(), 0);
        return prevMonth.getDate();
    };

    const navigateMonth = (direction: "prev" | "next") => {
        setCurrentMonth((prev) => {
            const newMonth = new Date(prev);
            if (direction === "prev") {
                newMonth.setMonth(prev.getMonth() - 1);
            } else {
                newMonth.setMonth(prev.getMonth() + 1);
            }
            return newMonth;
        });
    };

    const goToToday = () => {
        const today = new Date();
        setCurrentMonth(new Date(today.getFullYear(), today.getMonth(), 1));
        setSelectedDate(today);
    };

    const hasTripOnDate = (date: Date) =>
        scheduledTrips.some((trip) => trip.scheduledDate?.toDateString() === date.toDateString());

    const getTripsForDate = (date: Date) =>
        scheduledTrips.filter((trip) => trip.scheduledDate?.toDateString() === date.toDateString());

    const scheduleTrip = async (trip: SchedulerTrip, date: Date, time: string = DEFAULT_SCHEDULE_TIME) => {
        if (!date) return;

        try {
            const scheduledDate = combineDateAndTime(date, time);
            await updateTrip(trip._id, { plannedStartDate: scheduledDate.toISOString() });
            await fetchTrips({ suppressLoading: true });
        } catch (error) {
            console.error("Error scheduling trip:", error);
        }
    };

    const unscheduleTrip = async (trip: SchedulerTrip) => {
        try {
            await updateTrip(trip._id, { plannedStartDate: null });
            await fetchTrips({ suppressLoading: true });
        } catch (error) {
            console.error("Error unscheduling trip:", error);
        }
    };

    const handleDragStart = (trip: SchedulerTrip) => setDraggedTrip(trip);
    const handleDragEnd = () => setDraggedTrip(null);

    const handleDrop = (date: Date) => {
        if (draggedTrip) {
            scheduleTrip(draggedTrip, date, DEFAULT_SCHEDULE_TIME);
            setDraggedTrip(null);
        }
    };

    const renderCalendar = () => {
        const daysInMonth = getDaysInMonth(currentMonth);
        const firstDay = getFirstDayOfMonth(currentMonth);
        const prevMonthDays = getPreviousMonthDays(currentMonth);
        
        const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        const cells = dayNames.map((day) => (
                <div key={day} className="text-center text-sm font-medium text-secondary p-2">
                    {day}
                </div>
        ));

        for (let i = firstDay - 1; i >= 0; i--) {
            const day = prevMonthDays - i;
            cells.push(
                <div key={`prev-${day}`} className="text-center p-2 text-secondary text-sm">
                    {day}
                </div>
            );
        }

        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
            const isToday = date.toDateString() === new Date().toDateString();
            const isSelected = date.toDateString() === selectedDate.toDateString();
            const hasTrip = hasTripOnDate(date);
            const tripsForDate = getTripsForDate(date);

            cells.push(
                <div
                    key={day}
                    onClick={() => setSelectedDate(date)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => handleDrop(date)}
                    className={`text-center p-2 text-sm cursor-pointer rounded-lg transition-colors relative
                        ${isSelected ? "bg-blue-200 text-blue-800" : ""}
                        ${hasTrip && !isSelected ? "bg-green-100" : ""}
                        ${isToday && !isSelected ? "bg-yellow-100 text-yellow-800" : ""}
                        ${draggedTrip ? "bg-card border-2 border-dashed border-blue-300" : ""}
                        hover:bg-[rgba(255,255,255,0.03)]
                    `}
                >
                    <div className="flex flex-col items-center">
                        <span>{day}</span>
                        {hasTrip && (
                            <div className="flex space-x-1 mt-1">
                                {tripsForDate.slice(0, 3).map((trip, index) => (
                                    <div key={`${trip._id}-${index}`} className="w-1 h-1 bg-green-600 rounded-full" />
                                ))}
                                {tripsForDate.length > 3 && (
                                    <span className="text-xs text-green-600">+{tripsForDate.length - 3}</span>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            );
        }

        const totalCells = cells.length - 7;
        const remainingCells = 42 - totalCells;
        for (let day = 1; day <= remainingCells; day++) {
            cells.push(
                <div key={`next-${day}`} className="text-center p-2 text-secondary text-sm">
                    {day}
                </div>
            );
        }

        return <div className="grid grid-cols-7 gap-1">{cells}</div>;
    };

    const currentTrips = activeTab === "scheduled" ? scheduledTrips : unscheduledTrips;
    const selectedDateTrips = getTripsForDate(selectedDate);

    const getTripIdentifier = (trip: SchedulerTrip) =>
        trip.tripNumber || `Trip ${trip._id.slice(-6)}`;

    const getCustomerName = (trip: SchedulerTrip) =>
        trip.orders?.[0]?.customer?.name || "No customer";

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-main">
            <div className="border-b border-theme p-4">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-semibold text-primary">Trip Scheduler</h1>
                    <div className="flex items-center space-x-4">
                        <div className="text-sm text-secondary">
                            <span className="font-medium">{scheduledTrips.length}</span> scheduled
                        </div>
                        <div className="text-sm text-secondary">
                            <span className="font-medium">{unscheduledTrips.length}</span> unscheduled
                        </div>
                        <div className="text-sm text-secondary">
                            <span className="font-medium">{trips.length}</span> total trips
                        </div>
                    </div>
                </div>
            </div>

            {emptyStateMessage && currentTrips.length === 0 && (
                <div className="bg-card border border-blue-100 text-blue-700 px-4 py-3 rounded-lg flex items-center gap-3 m-4">
                    <Calendar className="text-xl" />
                    <span className="text-sm">{emptyStateMessage}</span>
                </div>
            )}

            <div className="flex">
                <div className="w-80 border-r border-theme bg-card">
                    <div className="p-4 border-b border-theme bg-card">
                        <h3 className="text-sm font-medium text-primary mb-3">Quick Stats</h3>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-card p-3 rounded-lg border">
                                <div className="text-lg font-semibold text-green-600">{scheduledTrips.length}</div>
                                <div className="text-xs text-secondary">Scheduled Trips</div>
                            </div>
                            <div className="bg-card p-3 rounded-lg border">
                                <div className="text-lg font-semibold text-[#F59E0B]">{unscheduledTrips.length}</div>
                                <div className="text-xs text-secondary">Pending Trips</div>
                            </div>
                        </div>
                        <div className="mt-3 bg-card p-3 rounded-lg border">
                            <div className="text-lg font-semibold text-[#00D1FF]">{trips.length}</div>
                            <div className="text-xs text-secondary">Total Trips</div>
                        </div>
                    </div>

                    <div className="border-b border-theme">
                        <div className="flex">
                            <button
                                onClick={() => setActiveTab("unscheduled")}
                                className={`flex-1 px-4 py-3 text-sm font-medium border-b-2 transition-colors
                                    ${activeTab === "unscheduled" 
                                        ? "border-blue-500 text-[#00D1FF] bg-card" 
                                        : "border-transparent text-secondary hover:text-primary hover:bg-[rgba(255,255,255,0.03)]"
                                    }`}
                            >
                                Unscheduled Trips
                            </button>
                            <button
                                onClick={() => setActiveTab("scheduled")}
                                className={`flex-1 px-4 py-3 text-sm font-medium border-b-2 transition-colors
                                    ${activeTab === "scheduled" 
                                        ? "border-blue-500 text-[#00D1FF] bg-card" 
                                        : "border-transparent text-secondary hover:text-primary hover:bg-[rgba(255,255,255,0.03)]"
                                    }`}
                            >
                                Scheduled Trips
                            </button>
                        </div>
                    </div>

                    <div className="p-4">
                        <div className="space-y-3">
                            {currentTrips.length > 0 ? (
                                currentTrips.map((trip) => (
                                    <div
                                        key={trip._id}
                                        draggable={activeTab === "unscheduled"}
                                        onDragStart={() => handleDragStart(trip)}
                                        onDragEnd={handleDragEnd}
                                        className={`p-3 rounded-lg border cursor-pointer transition-all hover:shadow-md
                                            ${activeTab === "scheduled" 
                                                ? "bg-green-50 border-green-200" 
                                                : "bg-card border-theme"
                                            }
                                            ${draggedTrip?._id === trip._id ? "opacity-50" : ""}
                                        `}
                                        onClick={() => {
                                            if (activeTab === "unscheduled") {
                                                setSelectedTrip(trip);
                                                const baseDate = trip.scheduledDate
                                                    ? new Date(trip.scheduledDate)
                                                    : new Date(selectedDate);
                                                setSelectedDate(baseDate);
                                                setSelectedTime(formatTimeFromDate(trip.scheduledDate));
                                                setShowScheduleModal(true);
                                            }
                                        }}
                                    >
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <div className="font-medium text-primary">
                                                    {getTripIdentifier(trip)}
                                                </div>
                                                <div className="text-sm text-secondary flex items-center mt-1">
                                                    <User className="w-3 h-3 mr-1" />
                                                    {getCustomerName(trip)}
                                                </div>
                                                {trip.driver?.name && (
                                                    <div className="text-sm text-secondary flex items-center mt-1">
                                                        <Truck className="w-3 h-3 mr-1" />
                                                        {trip.driver.name}
                                                    </div>
                                                )}
                                                <div className="text-xs text-secondary mt-2 flex items-center">
                                                    <Clock className="w-3 h-3 mr-1" />
                                                    Status: {trip.status}
                                                </div>
                                                {trip.scheduledDate && (
                                                    <div className="text-xs text-secondary mt-1">
                                                        {trip.scheduledDate.toLocaleDateString("en-GB")}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex flex-col space-y-1">
                                                {activeTab === "scheduled" && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            unscheduleTrip(trip);
                                                        }}
                                                        className="p-1 text-[#A855F7] hover:bg-red-100 rounded"
                                                        title="Unschedule"
                                                    >
                                                        <Trash2 className="w-3 h-3" />
                                                    </button>
                                                )}
                                                {activeTab === "unscheduled" && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setSelectedTrip(trip);
                                                            const baseDate = trip.scheduledDate
                                                                ? new Date(trip.scheduledDate)
                                                                : new Date(selectedDate);
                                                            setSelectedDate(baseDate);
                                                            setSelectedTime(formatTimeFromDate(trip.scheduledDate));
                                                            setShowScheduleModal(true);
                                                        }}
                                                        className="p-1 text-[#00D1FF] hover:bg-blue-100 rounded"
                                                        title="Schedule"
                                                    >
                                                        <Calendar className="w-3 h-3" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-8">
                                    <Truck className="mx-auto mb-3 text-gray-300" size={32} />
                                    <p className="text-secondary">No trips found</p>
                                    {emptyStateMessage && (
                                        <p className="text-xs text-secondary mt-1">{emptyStateMessage}</p>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex-1 p-6">
                    <div className="flex items-center justify-between mb-6">
                        <button
                            onClick={() => navigateMonth("prev")}
                            className="p-2 rounded-lg hover:bg-[rgba(255,255,255,0.03)] transition-colors"
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                        
                        <div className="flex items-center space-x-4">
                            <button
                                onClick={goToToday}
                                className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors"
                            >
                                Today
                            </button>
                            <h2 className="text-xl font-semibold text-primary">
                                {currentMonth.toLocaleDateString("en-US", { 
                                    month: "long", 
                                    year: "numeric" 
                                })}
                            </h2>
                        </div>

                        <button
                            onClick={() => navigateMonth("next")}
                            className="p-2 rounded-lg hover:bg-[rgba(255,255,255,0.03)] transition-colors"
                        >
                            <ChevronRight className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="bg-card border border-theme rounded-lg p-4 shadow-sm">
                        {renderCalendar()}
                    </div>

                    <div className="mt-4 bg-card rounded-lg p-4">
                        <h4 className="text-sm font-medium text-primary mb-2">Calendar Legend</h4>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="flex items-center">
                                <div className="w-3 h-3 bg-yellow-100 border border-yellow-300 rounded mr-2"></div>
                                <span>Today</span>
                            </div>
                            <div className="flex items-center">
                                <div className="w-3 h-3 bg-blue-200 rounded mr-2"></div>
                                <span>Selected</span>
                            </div>
                            <div className="flex items-center">
                                <div className="w-3 h-3 bg-green-100 rounded mr-2"></div>
                                <span>Has Trips</span>
                            </div>
                            <div className="flex items-center">
                                <div className="w-3 h-3 bg-card border-2 border-dashed border-blue-300 rounded mr-2"></div>
                                <span>Drop Zone</span>
                            </div>
                        </div>
                        <div className="mt-2 text-xs text-secondary">
                            💡 Drag unscheduled trips to calendar dates to schedule them
                        </div>
                    </div>

                    {activeTab === "scheduled" && selectedDateTrips.length > 0 && (
                        <div className="mt-6 bg-card border border-blue-200 rounded-lg p-4">
                            <h3 className="font-medium text-blue-800 mb-3 flex items-center">
                                <Calendar className="w-4 h-4 mr-2" />
                                Trips for {selectedDate.toLocaleDateString("en-GB")}
                            </h3>
                            <div className="space-y-3">
                                {selectedDateTrips.map((trip) => (
                                    <div key={trip._id} className="bg-card p-3 rounded border">
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <div className="font-medium text-primary">
                                                    {getTripIdentifier(trip)}
                                                </div>
                                                <div className="text-sm text-secondary flex items-center mt-1">
                                                    <User className="w-3 h-3 mr-1" />
                                                    {getCustomerName(trip)}
                                                </div>
                                                {trip.driver?.name && (
                                                    <div className="text-sm text-secondary flex items-center mt-1">
                                                        <Truck className="w-3 h-3 mr-1" />
                                                        {trip.driver.name}
                                                    </div>
                                                )}
                                                <div className="text-xs text-secondary mt-2 flex items-center">
                                                    <Clock className="w-3 h-3 mr-1" />
                                                    Status: {trip.status}
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => unscheduleTrip(trip)}
                                                className="p-1 text-[#A855F7] hover:bg-red-100 rounded"
                                                title="Unschedule"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {showScheduleModal && selectedTrip && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-card rounded-lg p-6 w-96 max-w-full mx-4">
                        <h3 className="text-lg font-semibold text-primary mb-4">
                            Schedule Trip
                        </h3>
                        
                        <div className="mb-4">
                            <div className="font-medium text-primary">
                                {getTripIdentifier(selectedTrip)}
                            </div>
                            <div className="text-sm text-secondary">
                                Customer: {getCustomerName(selectedTrip)}
                            </div>
                            {selectedTrip.driver?.name && (
                                <div className="text-sm text-secondary">
                                    Driver: {selectedTrip.driver.name}
                            </div>
                            )}
                            {selectedTrip.truck?.internalId && (
                                <div className="text-sm text-secondary">
                                    Truck: {selectedTrip.truck.internalId}
                                </div>
                            )}
                        </div>

                        <div className="mb-4">
                            <label className="block text-sm font-medium text-primary mb-2">
                                Select Date
                            </label>
                            <input
                                type="date"
                                value={selectedDate.toISOString().split("T")[0]}
                                onChange={(e) => {
                                    if (e.target.value) {
                                        setSelectedDate(new Date(e.target.value));
                                    }
                                }}
                                className="w-full px-3 py-2 border border-theme rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                                className="w-full px-3 py-2 border border-theme rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <div className="flex justify-end space-x-3">
                            <button
                                onClick={() => {
                                    setShowScheduleModal(false);
                                    setSelectedTrip(null);
                                    setSelectedTime(DEFAULT_SCHEDULE_TIME);
                                }}
                                className="px-4 py-2 text-sm font-medium text-primary bg-card border border-theme rounded-md hover:bg-[rgba(255,255,255,0.03)] focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => {
                                    scheduleTrip(selectedTrip, selectedDate, selectedTime);
                                    setShowScheduleModal(false);
                                    setSelectedTrip(null);
                                    setSelectedTime(DEFAULT_SCHEDULE_TIME);
                                }}
                                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                Schedule Trip
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SchedulerPage;