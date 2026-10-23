import { useState, useEffect, useRef } from 'react';
import { Plus, Search, DollarSign, Users, Calendar, TrendingUp, X, AlertCircle, CheckCircle, Edit2, Trash2, Eye, MapPin, Package, Truck, FileText, Download } from 'lucide-react';
import { createPayroll, listPayrolls, updatePayroll, deletePayroll, getDriverCompletedOrders, generateAIDriverPayroll, bulkAnalyzeAIDriverPayrolls, bulkCreateDriverPayrolls, getPaystubByPayrollId } from '../../../../axios/api/account.payroll';
import { getDeductionAdditions } from '../../../../axios/api/account.settlement';
import * as driverApi from '../../../../axios/api/driver';
import jsPDF from 'jspdf';
import DocLogo from '../../../../assets/doclogo.png';

// Type definitions
interface Driver {
  _id: string;
  name: string;
  role: string;
  details?: {
    salaryPerMile?: number;
    salaryPerMileSnow?: number;
    salaryPerMileHighTemp?: number;
    highTempThreshold?: number;
    companyFlag?: boolean;
  };
  companyFlag?: boolean; // Direct property for easier access
}

interface Trip {
  rateTypeLabel: string;
  _id: string;
  tripNumber?: string;
  startLocation?: {
    place?: string;
    latitude?: string;
    longitude?: string;
    placeId?: {
      name?: string;
      currentLocation?: {
        address?: string;
        latitude?: string;
        longitude?: string;
      };
    };
  };
  pickupLocation?: {
    place?: string;
    latitude?: string;
    longitude?: string;
    placeId?: {
      name?: string;
      currentLocation?: {
        address?: string;
        latitude?: string;
        longitude?: string;
      };
    };
  };
  endLocation?: {
    place?: string;
    latitude?: string;
    longitude?: string;
    placeId?: {
      name?: string;
      currentLocation?: {
        address?: string;
        latitude?: string;
        longitude?: string;
      };
    };
  };
  deliveryLocation?: {
    place?: string;
    latitude?: string;
    longitude?: string;
    placeId?: {
      name?: string;
      currentLocation?: {
        address?: string;
        latitude?: string;
        longitude?: string;
      };
    };
  };
  actualEndDate?: string;
  distance?: number;
  distanceInMiles?: number | string;
  baseRate?: number;
  snowRate?: number;
  highTempRate?: number;
  rateType?: string;
  weatherConditions?: {
    snow?: boolean;
    highTemperature?: boolean;
  };
  earnings?: string | number;
  truck?: {
    plateNumber?: string;
    licensePlate?: string;
    internalId?: string;
  };
  status?: string;
  selected?: boolean;
  driverRole?: 'driver' | 'coDriver' | 'unknown';
  driverDetails?: {
    _id: string;
    name: string;
    phone?: string;
  } | null;
  coDriverDetails?: {
    _id: string;
    name: string;
    phone?: string;
  } | null;
  route?: {
    totalDistance?: number;
    waypoints?: Array<{
      place?: string;
      latitude?: string;
      longitude?: string;
    }>;
  };
  orders?: Array<{
    _id?: string;
    orderNumber?: string;
    pickupLocation?: {
      place?: string;
      latitude?: string;
      longitude?: string;
      placeId?: {
        name?: string;
        currentLocation?: {
          address?: string;
          latitude?: string;
          longitude?: string;
        };
      };
    };
    deliveryLocation?: {
      place?: string;
      latitude?: string;
      longitude?: string;
      placeId?: {
        name?: string;
        currentLocation?: {
          address?: string;
          latitude?: string;
          longitude?: string;
        };
      };
    };
  }>;
}

interface TripSummary {
  totalTrips: number;
  totalDistanceKm: number;
  totalDistanceMiles: number;
  totalEarnings: number;
  ratePerMile: number;
  baseRate?: number;
  snowRate?: number;
  highTempRate?: number;
}

interface DriverPayroll {
  _id: string;
  userId: {
    _id: string;
    name: string;
    role: string;
  };
  baseSalary: number;
  bonus: number;
  deductions: number;
  totalSalary: number;
  payDate: string;
  startDate: string;
  endDate: string;
  totalMiles?: number;
  ratePerMile?: number;
  trips?: Trip[];
  // Tax fields
  country?: string;
  // Canada taxes
  federalIncomeTaxCA?: number;
  provincialIncomeTaxCA?: number;
  cpp?: number;
  ei?: number;
  provincialHealthTaxCA?: number;
  // USA taxes
  federalIncomeTaxUS?: number;
  stateIncomeTaxUS?: number;
  socialSecurityTax?: number;
  medicareTax?: number;
  stateDisabilityInsurance?: number;
  localTax?: number;
}

interface Notification {
  type: 'success' | 'error';
  message: string;
}

interface Paystub {
  _id: string;
  payrollId: string;
  userId: {
    _id: string;
    name: string;
    email?: string;
    role?: string;
    internalId?: string;
  };
  employeeName: string;
  employeeId?: string;
  employeeEmail?: string;
  employeeRole?: string;
  employeeDepartment?: string;
  employeeAddress?: string;
  workType?: 'Employee' | 'Driver' | 'Owner-Operator';
  payPeriod: {
    startDate: string;
    endDate: string;
    payDate: string;
  };
  paystubId?: string;
  earnings: {
    baseSalary: number;
    bonus: number;
    overtime: number;
    overtimeHours?: number;
    overtimeRate?: number;
    mileageEarnings: number;
    tripPay?: number;
    allowance?: number;
    incentives?: number;
    regularHours?: number;
    hourlyRate?: number;
    totalEarnings: number;
    earningsBreakdown?: Array<{
      type: string;
      units: string;
      rate: number;
      amount: number;
    }>;
  };
  deductions: {
    totalDeductions: number;
    otherDeductions: number;
    advanceRecovery?: number;
    loanEMI?: number;
    insurance?: number;
    payrollPenalty?: number;
    deductionsBreakdown?: Array<{
      type: string;
      amount: number;
    }>;
  };
  taxesCA: {
    federalIncomeTax: number;
    provincialIncomeTax: number;
    cpp: number;
    ei: number;
    provincialHealthTax: number;
    totalTaxes: number;
  };
  taxesUS: {
    federalIncomeTax: number;
    stateIncomeTax: number;
    socialSecurityTax: number;
    medicareTax: number;
    stateDisabilityInsurance: number;
    localTax: number;
    totalTaxes: number;
  };
  summary: {
    grossPay: number;
    totalDeductions: number;
    totalTaxes: number;
    netPay: number;
  };
  country: 'USA' | 'Canada';
  driverInfo?: {
    totalMiles: number;
    ratePerMile: number;
    tripsCount: number;
    loadsCount: number;
  };
  companyDetails?: {
    companyName?: string;
    companyAddress?: string;
    companyPhone?: string;
    companyEmail?: string;
    companyLogo?: string;
    gstNumber?: string;
  };
  tripDetails?: Array<{
    truckNumber?: string;
    payType?: string;
    loadNumber?: string;
    tripType?: string;
    periodFrom?: string | Date;
    periodTo?: string | Date;
    origin?: string;
    destination?: string;
    payRate?: number;
    miles?: number;
    hours?: number;
    amountCAD?: number;
    amountUSD?: number;
  }>;
  additions?: Array<{
    loadDate?: string | Date;
    memo?: string;
    amount?: number;
    per?: string;
    gst?: number;
    totalCAD?: number;
  }>;
  employerContributions?: {
    companyInsurance?: number;
    pensionPF?: number;
    benefitContributions?: number;
    total?: number;
  };
  ytd?: {
    earnings: number;
    deductions: number;
    netPay: number;
  };
  payment?: {
    mode?: 'Bank Transfer' | 'Cheque' | 'Cash' | 'Other';
    bankLast4Digits?: string;
    bankName?: string;
    accountNumber?: string;
  };
  notes?: string;
  hrSignature?: string;
  hrName?: string;
  status: 'draft' | 'issued' | 'void';
  createdAt: string;
  updatedAt: string;
}

interface FormData {
  userId: string;
  bonus: string;
  deductions: string;
  payDate: string;
  startDate: string;
  endDate: string;
  // Tax fields
  country: string;
  // Canada taxes
  federalIncomeTaxCA?: string;
  provincialIncomeTaxCA?: string;
  cpp?: string;
  ei?: string;
  provincialHealthTaxCA?: string;
  // USA taxes
  federalIncomeTaxUS?: string;
  stateIncomeTaxUS?: string;
  socialSecurityTax?: string;
  medicareTax?: string;
  stateDisabilityInsurance?: string;
  localTax?: string;
}

const DriverPayrollManagement = () => {
  const topScrollRef = useRef<HTMLDivElement>(null);
  const bottomScrollRef = useRef<HTMLDivElement>(null);

  const [searchTerm, setSearchTerm] = useState<string>('');
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [showEditModal, setShowEditModal] = useState<boolean>(false);
  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);
  const [showViewModal, setShowViewModal] = useState<boolean>(false);
  const [showPaystubModal, setShowPaystubModal] = useState<boolean>(false);
  const [selectedPayroll, setSelectedPayroll] = useState<DriverPayroll | null>(null);
  const [selectedPaystub, setSelectedPaystub] = useState<Paystub | null>(null);
  const [loadingPaystub, setLoadingPaystub] = useState<boolean>(false);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [payrollData, setPayrollData] = useState<DriverPayroll[]>([]);
  const [driverTrips, setDriverTrips] = useState<Trip[]>([]);
  const [driverPayrollSummary, setDriverPayrollSummary] = useState<TripSummary | null>(null);
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [loadingTrips, setLoadingTrips] = useState<boolean>(false);
  const [loadingAI, setLoadingAI] = useState<boolean>(false);
  const [loadingBulkAI, setLoadingBulkAI] = useState<boolean>(false);
  const [notification, setNotification] = useState<Notification | null>(null);
  const [showBulkGenerateModal, setShowBulkGenerateModal] = useState<boolean>(false);
  const [driverTypeTab, setDriverTypeTab] = useState<'ownerOperator' | 'companyDriver'>('ownerOperator');
  const [showBulkSuggestionsModal, setShowBulkSuggestionsModal] = useState<boolean>(false);
  const [bulkGenerateResult, setBulkGenerateResult] = useState<any>(null);
  const [bulkPayrollSuggestions, setBulkPayrollSuggestions] = useState<any[]>([]);
  const [bulkDateRange, setBulkDateRange] = useState<{
    startDate: string;
    endDate: string;
    payDate: string;
  }>({
    startDate: '',
    endDate: '',
    payDate: new Date().toISOString().split('T')[0]
  });
  const [aiAnalysis, setAiAnalysis] = useState<{
    recommendedBonus: number;
    recommendedDeductions: number;
    performanceScore: number;
    recommendations: string[];
    performanceNotes: string;
    reasoning: string;
    trips?: Trip[];
  } | null>(null);
  const [driverAdditions, setDriverAdditions] = useState<any[]>([]);
  const [driverDeductions, setDriverDeductions] = useState<any[]>([]);
  const [, setLoadingAdditionsDeductions] = useState<boolean>(false);
  // Track edited amounts for additions and deductions
  const [editedAdditionAmounts, setEditedAdditionAmounts] = useState<Record<string, number>>({});
  const [editedDeductionAmounts, setEditedDeductionAmounts] = useState<Record<string, number>>({});

  const [formData, setFormData] = useState<FormData>({
    userId: '',
    bonus: '0',
    deductions: '0',
    payDate: '',
    startDate: '',
    endDate: '',
    country: 'USA',
    // Canada taxes
    federalIncomeTaxCA: '0',
    provincialIncomeTaxCA: '0',
    cpp: '0',
    ei: '0',
    provincialHealthTaxCA: '0',
    // USA taxes
    federalIncomeTaxUS: '0',
    stateIncomeTaxUS: '0',
    socialSecurityTax: '0',
    medicareTax: '0',
    stateDisabilityInsurance: '0',
    localTax: '0'
  });

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  const getLocalUserInfo = () => {
    const userInfoString = localStorage.getItem('userInfo');
    if (!userInfoString) return null;
    try {
      return JSON.parse(userInfoString);
    } catch (error) {
      console.error('Error parsing userInfo from localStorage:', error);
      return null;
    }
  };

  const fetchDrivers = async () => {
    try {
      const userInfo: any = getLocalUserInfo();
      const userRole = userInfo?.role || userInfo?.userData?.role;
      const userCompany = userInfo?.company || userInfo?.userData?.company;
      const isSuperadmin = userRole === 'superadmin';
      const isHR = userRole === 'hr';
      const hasCompany = Boolean(userCompany);

      if (!isSuperadmin && !isHR && !hasCompany) {
        setDrivers([]);
        return;
      }

      // Use driver API to get drivers with full details including salaryPerMile
      const response = await driverApi.getAllDrivers(1, 100);
      if (response?.success) {
        // Map driver data to include details - backend returns details object with salaryPerMile
        const driverList = (response.data || []).map((driver: any) => {
          // Backend returns driver with details object containing salaryPerMile fields
          // Check both nested details and direct properties (in case backend flattens it)
          const salaryPerMile = driver.details?.salaryPerMile ?? driver.salaryPerMile ?? 0;
          const salaryPerMileSnow = driver.details?.salaryPerMileSnow ?? driver.salaryPerMileSnow ?? 0;
          const salaryPerMileHighTemp = driver.details?.salaryPerMileHighTemp ?? driver.salaryPerMileHighTemp ?? 0;
          const highTempThreshold = driver.details?.highTempThreshold ?? driver.highTempThreshold ?? 35;

          console.log('Driver data:', {
            name: driver.name,
            details: driver.details,
            salaryPerMile: salaryPerMile
          });

          const companyFlag = driver.details?.companyFlag ?? driver.companyFlag ?? false;

          return {
            _id: driver._id,
            name: driver.name,
            role: driver.role || 'driver',
            companyFlag: companyFlag,
            details: {
              salaryPerMile: Number(salaryPerMile) || 0,
              salaryPerMileSnow: Number(salaryPerMileSnow) || 0,
              salaryPerMileHighTemp: Number(salaryPerMileHighTemp) || 0,
              highTempThreshold: Number(highTempThreshold) || 35,
              companyFlag: companyFlag
            }
          };
        });
        setDrivers(driverList);
      } else if (response?.message) {
        showNotification('error', response.message);
      }
    } catch (error) {
      console.error('Error fetching drivers:', error);
      showNotification('error', 'Error fetching drivers');
    }
  };

  const fetchPayrolls = async (searchQuery?: string) => {
    setLoading(true);
    try {
      const userInfo: any = getLocalUserInfo();
      const userRole = userInfo?.role || userInfo?.userData?.role;
      const userCompany = userInfo?.company || userInfo?.userData?.company;
      const isSuperadmin = userRole === 'superadmin';
      const isHR = userRole === 'hr';
      const hasCompany = Boolean(userCompany);

      if (!isSuperadmin && !isHR && !hasCompany) {
        setPayrollData([]);
        return;
      }

      const searchValue = searchQuery !== undefined ? searchQuery : searchTerm;
      const searchParam = searchValue ? `?search=${encodeURIComponent(searchValue)}` : '';
      const response = await listPayrolls(searchParam);

      if (response?.success) {
        // Filter to show only driver payrolls
        const driverPayrolls = (response.data || []).filter((payroll: DriverPayroll) => {
          // Check if userId exists and has role
          if (!payroll.userId) return false;

          // Handle both populated object and ObjectId string cases
          const userId = typeof payroll.userId === 'object' ? payroll.userId : null;
          if (!userId) return false;

          // Check role (case-insensitive)
          const role = userId.role || (userId as any).role;
          return role && role.toLowerCase() === 'driver';
        });

        console.log('📊 Driver Payrolls Filtered:', {
          total: response.data?.length || 0,
          driverPayrolls: driverPayrolls.length,
          sample: driverPayrolls[0] ? {
            id: driverPayrolls[0]._id,
            userId: driverPayrolls[0].userId,
            role: typeof driverPayrolls[0].userId === 'object' ? driverPayrolls[0].userId.role : 'N/A'
          } : null
        });

        setPayrollData(driverPayrolls);
      } else {
        const message = response?.message || 'Failed to fetch driver payrolls';
        setPayrollData([]);
        showNotification('error', message);
      }
    } catch (error) {
      console.error('Error fetching payrolls:', error);
      setPayrollData([]);
      showNotification('error', 'Error fetching driver payrolls');
    } finally {
      setLoading(false);
    }
  };

  const fetchDriverAdditionsDeductions = async (driverId: string) => {
    setLoadingAdditionsDeductions(true);
    try {
      const [additionsRes, deductionsRes] = await Promise.all([
        getDeductionAdditions({ assignedTo: driverId, type: 'Addition', isActive: true }),
        getDeductionAdditions({ assignedTo: driverId, type: 'Deduction', isActive: true })
      ]);

      if (additionsRes?.success && Array.isArray(additionsRes.data)) {
        setDriverAdditions(additionsRes.data);
      } else {
        setDriverAdditions([]);
      }

      if (deductionsRes?.success && Array.isArray(deductionsRes.data)) {
        setDriverDeductions(deductionsRes.data);
      } else {
        setDriverDeductions([]);
      }

      // Reset edited amounts when fetching new driver data
      setEditedAdditionAmounts({});
      setEditedDeductionAmounts({});
    } catch (error: any) {
      console.error('Error fetching driver additions/deductions:', error);
      setDriverAdditions([]);
      setDriverDeductions([]);
    } finally {
      setLoadingAdditionsDeductions(false);
    }
  };

  const fetchDriverTrips = async (driverId: string, startDate: string, endDate: string) => {
    setLoadingTrips(true);
    try {
      const userInfo: any = getLocalUserInfo();
      const userRole = userInfo?.role || userInfo?.userData?.role;
      const userCompany = userInfo?.company || userInfo?.userData?.company;
      const isSuperadmin = userRole === 'superadmin';
      const isHR = userRole === 'hr';
      const isDispatcher = userRole === 'dispatcher';
      const hasCompany = Boolean(userCompany);

      if (!isSuperadmin && !isHR && !isDispatcher && !hasCompany) {
        setDriverTrips([]);
        setDriverPayrollSummary(null);
        setLoadingTrips(false);
        return;
      }

      const response = await getDriverCompletedOrders(driverId, startDate, endDate);

      if (response?.success) {
        const trips: Trip[] = (response.data || []).map((trip: any) => ({
          ...trip,
          selected: true // Auto-select all trips
        }));

        setDriverTrips(trips);

        if (response.summary) {
          setDriverPayrollSummary(response.summary);
        } else {
          // Fallback calculation if no summary provided
          const totalMiles = trips.reduce((sum, trip) => {
            const miles = typeof trip.distanceInMiles === 'string' ? parseFloat(trip.distanceInMiles) : (trip.distanceInMiles || 0);
            return sum + miles;
          }, 0);
          const totalEarnings = trips.reduce((sum, trip) => {
            const earnings = typeof trip.earnings === 'string' ? parseFloat(trip.earnings) : (typeof trip.earnings === 'number' ? trip.earnings : 0);
            return sum + earnings;
          }, 0);

          const fallbackSummary: TripSummary = {
            totalTrips: trips.length,
            totalDistanceKm: trips.reduce((sum, trip) => sum + (trip.distance || 0), 0),
            totalDistanceMiles: totalMiles,
            totalEarnings: totalEarnings,
            ratePerMile: trips[0]?.baseRate || 0,
            baseRate: trips[0]?.baseRate || 0,
            snowRate: trips[0]?.snowRate || 0,
            highTempRate: trips[0]?.highTempRate || 0
          };

          setDriverPayrollSummary(fallbackSummary);
        }
      } else {
        const errorMsg = response?.message || 'Failed to fetch driver trips';
        showNotification('error', errorMsg);
        setDriverTrips([]);
        setDriverPayrollSummary(null);
      }
    } catch (error: any) {
      console.error('Error fetching driver trips:', error);
      const errorMsg = error?.response?.data?.message || error?.message || 'Error fetching driver trips';
      showNotification('error', errorMsg);
      setDriverTrips([]);
      setDriverPayrollSummary(null);
    } finally {
      setLoadingTrips(false);
    }
  };

  useEffect(() => {
    fetchDrivers();
    fetchPayrolls();
  }, []);

  // Debounced search effect
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchPayrolls(searchTerm);
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  // Synchronize scrollbars for driver payroll table
  useEffect(() => {
    const topScroll = topScrollRef.current;
    const bottomScroll = bottomScrollRef.current;

    if (!topScroll || !bottomScroll) return;

    const handleTopScroll = () => {
      if (bottomScroll) {
        bottomScroll.scrollLeft = topScroll.scrollLeft;
      }
    };

    const handleBottomScroll = () => {
      if (topScroll) {
        topScroll.scrollLeft = bottomScroll.scrollLeft;
      }
    };

    topScroll.addEventListener('scroll', handleTopScroll);
    bottomScroll.addEventListener('scroll', handleBottomScroll);

    // Set the width of top scrollbar content to match table width
    const updateScrollWidth = () => {
      const table = bottomScroll.querySelector('table');
      const scrollContent = topScroll.querySelector('.top-scroll-content');
      if (table && scrollContent) {
        (scrollContent as HTMLElement).style.width = `${table.scrollWidth}px`;
      }
    };

    updateScrollWidth();

    // Update scroll width when window resizes or data changes
    const resizeObserver = new ResizeObserver(updateScrollWidth);
    if (bottomScroll) resizeObserver.observe(bottomScroll);

    return () => {
      topScroll.removeEventListener('scroll', handleTopScroll);
      bottomScroll.removeEventListener('scroll', handleBottomScroll);
      resizeObserver.disconnect();
    };
  }, [payrollData]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;

    if (name === 'userId') {
      const selectedDrv = drivers.find(drv => drv._id === value);
      setSelectedDriver(selectedDrv || null);

      // Auto-fetch trips for current month
      const today = new Date();
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);

      const startDate = firstDay.toISOString().split('T')[0];
      const endDate = lastDay.toISOString().split('T')[0];

      setFormData(prev => ({
        ...prev,
        [name]: value,
        startDate,
        endDate
      }));

      if (value) {
        fetchDriverTrips(value, startDate, endDate);
        fetchDriverAdditionsDeductions(value);
      } else {
        setDriverAdditions([]);
        setDriverDeductions([]);
      }
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleDateRangeChange = (startDate: string, endDate: string) => {
    setFormData(prev => ({
      ...prev,
      startDate,
      endDate
    }));

    if (selectedDriver && startDate && endDate) {
      fetchDriverTrips(selectedDriver._id, startDate, endDate);
      if (selectedDriver._id) {
        fetchDriverAdditionsDeductions(selectedDriver._id);
      }
    }
  };

  const toggleTripSelection = (tripId: string) => {
    setDriverTrips(prev => prev.map(trip =>
      trip._id === tripId ? { ...trip, selected: !trip.selected } : trip
    ));
  };

  const selectAllTrips = () => {
    setDriverTrips(prev => prev.map(trip => ({ ...trip, selected: true })));
  };

  const deselectAllTrips = () => {
    setDriverTrips(prev => prev.map(trip => ({ ...trip, selected: false })));
  };

  const getSelectedTripsTotals = () => {
    const selectedTrips = driverTrips.filter(trip => trip.selected);
    const totalMiles = selectedTrips.reduce((sum, trip) => {
      const miles = typeof trip.distanceInMiles === 'string' ? parseFloat(trip.distanceInMiles) : (trip.distanceInMiles || 0);
      return sum + miles;
    }, 0);
    const totalEarnings = selectedTrips.reduce((sum, trip) => {
      // Parse earnings - handle both string and number types
      let earnings = 0;
      if (trip.earnings !== undefined && trip.earnings !== null) {
        if (typeof trip.earnings === 'string') {
          earnings = parseFloat(trip.earnings) || 0;
        } else if (typeof trip.earnings === 'number') {
          earnings = trip.earnings;
        }
      }

      // If earnings is still 0, try to calculate from miles and rate
      if (earnings === 0 && trip.distanceInMiles) {
        const miles = typeof trip.distanceInMiles === 'string' ? parseFloat(trip.distanceInMiles) : (trip.distanceInMiles || 0);
        const rate = trip.baseRate || driverPayrollSummary?.baseRate || driverPayrollSummary?.ratePerMile || selectedDriver?.details?.salaryPerMile || 0;
        if (miles > 0 && rate > 0) {
          let calculatedEarnings = miles * rate;

          // Add snow premium if applicable
          if (trip.weatherConditions?.snow && trip.snowRate) {
            calculatedEarnings += miles * trip.snowRate;
          }

          // Add high temp premium if applicable
          if (trip.weatherConditions?.highTemperature && trip.highTempRate) {
            calculatedEarnings += miles * trip.highTempRate;
          }

          earnings = calculatedEarnings;
        }
      }

      return sum + earnings;
    }, 0);

    return {
      count: selectedTrips.length,
      totalMiles,
      totalEarnings
    };
  };

  const calculateAdditionsDeductions = () => {
    if (!formData.startDate || !formData.endDate) {
      return { totalAdditions: 0, totalDeductions: 0 };
    }

    const startDateObj = new Date(formData.startDate);
    const endDateObj = new Date(formData.endDate);
    endDateObj.setHours(23, 59, 59, 999);

    console.log('📊 Calculating additions/deductions for period:', {
      startDate: startDateObj.toISOString(),
      endDate: endDateObj.toISOString(),
      additionsCount: driverAdditions.length,
      deductionsCount: driverDeductions.length
    });

    // Calculate applicable additions
    let totalAdditions = 0;
    for (const addition of driverAdditions) {
      if (!addition.isActive) continue;

      const addStartDate = addition.startDate ? new Date(addition.startDate) : null;
      const addEndDate = addition.endDate ? new Date(addition.endDate) : null;

      // Check if addition period overlaps with payroll period
      // Addition is applicable if:
      // 1. No start date (always active) OR start date is before/on payroll end date
      // 2. No end date (ongoing) OR end date is after/on payroll start date
      const additionStartsBeforePayrollEnds = !addStartDate || addStartDate <= endDateObj;
      const additionEndsAfterPayrollStarts = !addEndDate || addEndDate >= startDateObj;

      if (!additionStartsBeforePayrollEnds || !additionEndsAfterPayrollStarts) {
        continue; // Addition period doesn't overlap with payroll period
      }

      // For recurring additions, calculate based on the overlap period
      const effectiveStartDate = addStartDate && addStartDate > startDateObj ? addStartDate : startDateObj;
      const effectiveEndDate = addEndDate && addEndDate < endDateObj ? addEndDate : endDateObj;

      // Calculate amount based on recurrence (use edited amount if available)
      let calculatedAmount = editedAdditionAmounts[addition._id];
      if (calculatedAmount === undefined) {
        // Calculate from base amount and recurrence
        let amount = addition.amount || 0;
        if (addition.recurrence === 'Weekly') {
          const weeks = Math.ceil((effectiveEndDate.getTime() - effectiveStartDate.getTime()) / (7 * 24 * 60 * 60 * 1000));
          amount = amount * Math.max(1, weeks);
        } else if (addition.recurrence === 'Bi-weekly') {
          const biWeeks = Math.ceil((effectiveEndDate.getTime() - effectiveStartDate.getTime()) / (14 * 24 * 60 * 60 * 1000));
          amount = amount * Math.max(1, biWeeks);
        } else if (addition.recurrence === 'Monthly') {
          // For monthly, if the addition period overlaps with payroll period, include it
          // Calculate based on the number of months in the overlap
          const months = Math.ceil((effectiveEndDate.getTime() - effectiveStartDate.getTime()) / (30 * 24 * 60 * 60 * 1000));
          amount = amount * Math.max(1, months);
        }
        // One-time, Quarterly, Yearly: if period overlaps, use the full amount
        calculatedAmount = amount;
      }

      totalAdditions += calculatedAmount;
    }

    // Calculate applicable deductions
    let totalDeductions = 0;
    for (const deduction of driverDeductions) {
      if (!deduction.isActive) continue;

      const dedStartDate = deduction.startDate ? new Date(deduction.startDate) : null;
      const dedEndDate = deduction.endDate ? new Date(deduction.endDate) : null;

      // Check if deduction period overlaps with payroll period
      // For monthly deductions, we need special handling
      let shouldInclude = false;

      if (deduction.recurrence === 'Monthly') {
        // For monthly deductions, if the deduction is active and has no end date (or end date is in future),
        // it should apply to any payroll period in the same year or later years
        // If it has an end date, check if payroll period overlaps

        if (!dedStartDate) {
          // No start date = always active for monthly deductions
          shouldInclude = true;
        } else {
          const payrollStartMonth = startDateObj.getMonth();
          const payrollStartYear = startDateObj.getFullYear();
          const payrollEndMonth = endDateObj.getMonth();
          const payrollEndYear = endDateObj.getFullYear();
          const dedStartMonth = dedStartDate.getMonth();
          const dedStartYear = dedStartDate.getFullYear();

          // Check if deduction end date excludes this period
          if (dedEndDate) {
            const dedEndMonth = dedEndDate.getMonth();
            const dedEndYear = dedEndDate.getFullYear();
            // If deduction ends before payroll starts, exclude
            if (dedEndYear < payrollStartYear || (dedEndYear === payrollStartYear && dedEndMonth < payrollStartMonth)) {
              shouldInclude = false;
            } else {
              // Deduction is active during some part of the payroll period
              // Check if any month in payroll period is >= deduction start month
              for (let year = payrollStartYear; year <= payrollEndYear; year++) {
                const startMonth = year === payrollStartYear ? payrollStartMonth : 0;
                const endMonth = year === payrollEndYear ? payrollEndMonth : 11;

                for (let month = startMonth; month <= endMonth; month++) {
                  // Check if this month is within deduction period
                  const monthInRange =
                    (year > dedStartYear || (year === dedStartYear && month >= dedStartMonth)) &&
                    (year < dedEndYear || (year === dedEndYear && month <= dedEndMonth));

                  if (monthInRange) {
                    shouldInclude = true;
                    break;
                  }
                }
                if (shouldInclude) break;
              }
            }
          } else {
            // No end date = deduction is active from start date onwards
            // For monthly deductions without end date, if they're active, they apply to any payroll period
            // in the same year or later years, regardless of the exact start date
            // This allows monthly deductions to apply retroactively or prospectively
            if (payrollStartYear >= dedStartYear) {
              // Payroll is in the same year or later - deduction applies
              shouldInclude = true;
            }
            // If payroll is in an earlier year, deduction doesn't apply
          }
        }
      } else {
        // For non-monthly deductions, use standard overlap check
        const deductionStartsBeforePayrollEnds = !dedStartDate || dedStartDate <= endDateObj;
        const deductionEndsAfterPayrollStarts = !dedEndDate || dedEndDate >= startDateObj;
        shouldInclude = deductionStartsBeforePayrollEnds && deductionEndsAfterPayrollStarts;
      }

      if (!shouldInclude) {
        console.log('⏭️ Skipping deduction (no overlap):', {
          name: deduction.name,
          recurrence: deduction.recurrence,
          startDate: dedStartDate?.toISOString(),
          endDate: dedEndDate?.toISOString(),
          payrollStart: startDateObj.toISOString(),
          payrollEnd: endDateObj.toISOString()
        });
        continue; // Deduction period doesn't overlap with payroll period
      }

      // For recurring deductions, calculate based on the overlap period
      const effectiveStartDate = dedStartDate && dedStartDate > startDateObj ? dedStartDate : startDateObj;
      const effectiveEndDate = dedEndDate && dedEndDate < endDateObj ? dedEndDate : endDateObj;

      // Calculate amount based on recurrence (use edited amount if available)
      let calculatedAmount = editedDeductionAmounts[deduction._id];
      if (calculatedAmount === undefined) {
        // Calculate from base amount and recurrence
        let amount = deduction.amount || 0;
        if (deduction.recurrence === 'Weekly') {
          const weeks = Math.ceil((effectiveEndDate.getTime() - effectiveStartDate.getTime()) / (7 * 24 * 60 * 60 * 1000));
          amount = amount * Math.max(1, weeks);
        } else if (deduction.recurrence === 'Bi-weekly') {
          const biWeeks = Math.ceil((effectiveEndDate.getTime() - effectiveStartDate.getTime()) / (14 * 24 * 60 * 60 * 1000));
          amount = amount * Math.max(1, biWeeks);
        } else if (deduction.recurrence === 'Monthly') {
          // For monthly deductions, count how many months in the payroll period the deduction applies to
          const payrollStartMonth = startDateObj.getMonth();
          const payrollStartYear = startDateObj.getFullYear();
          const payrollEndMonth = endDateObj.getMonth();
          const payrollEndYear = endDateObj.getFullYear();
          const dedStartMonth = dedStartDate ? dedStartDate.getMonth() : 0;
          const dedStartYear = dedStartDate ? dedStartDate.getFullYear() : payrollStartYear;
          const dedEndMonth = dedEndDate ? dedEndDate.getMonth() : 11;
          const dedEndYear = dedEndDate ? dedEndDate.getFullYear() : 9999;

          let monthsCount = 0;
          for (let year = payrollStartYear; year <= payrollEndYear; year++) {
            const startMonth = year === payrollStartYear ? payrollStartMonth : 0;
            const endMonth = year === payrollEndYear ? payrollEndMonth : 11;

            for (let month = startMonth; month <= endMonth; month++) {
              // Check if this month is within deduction period
              const monthInRange =
                (year > dedStartYear || (year === dedStartYear && month >= dedStartMonth)) &&
                (year < dedEndYear || (year === dedEndYear && month <= dedEndMonth));

              if (monthInRange) {
                monthsCount++;
              }
            }
          }

          amount = amount * Math.max(1, monthsCount);
          console.log('💰 Monthly deduction calculated:', {
            name: deduction.name,
            baseAmount: deduction.amount,
            recurrence: deduction.recurrence,
            startDate: dedStartDate?.toISOString(),
            endDate: dedEndDate?.toISOString(),
            payrollStart: startDateObj.toISOString(),
            payrollEnd: endDateObj.toISOString(),
            monthsCount,
            calculatedAmount: amount
          });
        }
        // One-time, Quarterly, Yearly: if period overlaps, use the full amount
        calculatedAmount = amount;
      }

      console.log('✅ Deduction included:', {
        name: deduction.name,
        amount: deduction.amount,
        recurrence: deduction.recurrence,
        calculatedAmount: calculatedAmount,
        startDate: dedStartDate?.toISOString(),
        endDate: dedEndDate?.toISOString(),
        isEdited: editedDeductionAmounts[deduction._id] !== undefined
      });

      totalDeductions += calculatedAmount;
    }

    console.log('📊 Final totals:', {
      totalAdditions,
      totalDeductions,
      additionsCount: driverAdditions.length,
      deductionsCount: driverDeductions.length
    });

    return { totalAdditions, totalDeductions };
  };

  const handleBulkAIGeneration = async () => {
    if (!bulkDateRange.startDate || !bulkDateRange.endDate) {
      showNotification('error', 'Please select start date and end date');
      return;
    }

    setLoadingBulkAI(true);
    setBulkPayrollSuggestions([]);

    try {
      // Determine companyFlag based on active tab
      // companyDriver tab = companyFlag true, ownerOperator tab = companyFlag false
      const companyFlag = driverTypeTab === 'companyDriver';

      const response = await bulkAnalyzeAIDriverPayrolls({
        startDate: bulkDateRange.startDate,
        endDate: bulkDateRange.endDate,
        payDate: bulkDateRange.payDate || new Date().toISOString().split('T')[0],
        companyFlag: companyFlag
      });

      if (response?.success && response?.data?.suggestions) {
        // Filter suggestions to match the active driver type tab
        const filteredSuggestions = response.data.suggestions.filter((suggestion: any) => {
          // Find the driver in our drivers list to check companyFlag
          const driver = drivers.find(d => d._id === suggestion.driverId || d._id === suggestion.userId?._id || d._id === suggestion.userId);
          if (driver) {
            const isCompanyDriver = driver.companyFlag ?? driver.details?.companyFlag ?? false;
            // companyDriver tab expects companyFlag === true, ownerOperator tab expects companyFlag === false
            return driverTypeTab === 'companyDriver' ? isCompanyDriver : !isCompanyDriver;
          }
          return true; // Keep if driver not found (backend should have filtered, but keep for safety)
        });

        setBulkPayrollSuggestions(filteredSuggestions);
        setBulkGenerateResult(response.data);
        setShowBulkGenerateModal(false);
        setShowBulkSuggestionsModal(true);
        showNotification('success', response.message || 'AI analysis completed! Review and edit the suggestions before creating.');
      } else {
        showNotification('error', response?.message || 'Failed to analyze payrolls');
        setBulkGenerateResult(response?.data || null);
      }
    } catch (error: any) {
      console.error('Error bulk analyzing payrolls:', error);
      showNotification('error', error?.response?.data?.message || error?.message || 'Error bulk analyzing payrolls');
    } finally {
      setLoadingBulkAI(false);
    }
  };

  const handleBulkCreatePayrolls = async () => {
    if (!bulkPayrollSuggestions || bulkPayrollSuggestions.length === 0) {
      showNotification('error', 'No payroll suggestions to create');
      return;
    }

    setLoadingBulkAI(true);

    try {
      const response = await bulkCreateDriverPayrolls({
        payrolls: bulkPayrollSuggestions,
        startDate: bulkDateRange.startDate,
        endDate: bulkDateRange.endDate,
        payDate: bulkDateRange.payDate || new Date().toISOString().split('T')[0]
      });

      if (response?.success) {
        showNotification('success', response.message || 'All payrolls created successfully!');
        setShowBulkSuggestionsModal(false);
        setBulkPayrollSuggestions([]);
        setBulkGenerateResult(null);
        fetchPayrolls();
      } else {
        showNotification('error', response?.message || 'Failed to create payrolls');
        if (response?.data) {
          setBulkGenerateResult(response.data);
        }
      }
    } catch (error: any) {
      console.error('Error bulk creating payrolls:', error);
      showNotification('error', error?.response?.data?.message || error?.message || 'Error bulk creating payrolls');
    } finally {
      setLoadingBulkAI(false);
    }
  };

  const updateBulkSuggestion = (index: number, field: string, value: any) => {
    setBulkPayrollSuggestions(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      // Recalculate totalSalary when relevant fields change
      if (['baseSalary', 'bonus', 'deductions', 'country', 'federalIncomeTaxCA', 'provincialIncomeTaxCA', 'cpp', 'ei', 'provincialHealthTaxCA', 'federalIncomeTaxUS', 'stateIncomeTaxUS', 'socialSecurityTax', 'medicareTax', 'stateDisabilityInsurance', 'localTax'].includes(field)) {
        // Gross Earnings = Trip Earnings + Bonus + Additions (bonus and additions are separate)
        const baseSalary = parseFloat(updated[index].baseSalary || 0);
        const bonus = parseFloat(updated[index].bonus || 0);
        const totalAdditions = parseFloat(updated[index].totalAdditions || 0);
        const grossSalary = baseSalary + bonus + totalAdditions;
        // Deductions come from driver profile (updated[index].deductions or updated[index].totalDeductions)
        const deductions = parseFloat(updated[index].deductions || updated[index].totalDeductions || 0);
        let totalTaxes = 0;
        if (updated[index].country === 'Canada') {
          totalTaxes = parseFloat(updated[index].federalIncomeTaxCA || 0) +
            parseFloat(updated[index].provincialIncomeTaxCA || 0) +
            parseFloat(updated[index].cpp || 0) +
            parseFloat(updated[index].ei || 0) +
            parseFloat(updated[index].provincialHealthTaxCA || 0);
        } else {
          totalTaxes = parseFloat(updated[index].federalIncomeTaxUS || 0) +
            parseFloat(updated[index].stateIncomeTaxUS || 0) +
            parseFloat(updated[index].socialSecurityTax || 0) +
            parseFloat(updated[index].medicareTax || 0) +
            parseFloat(updated[index].stateDisabilityInsurance || 0) +
            parseFloat(updated[index].localTax || 0);
        }
        // Net Pay = Gross Earnings - Deductions - Taxes
        updated[index].totalSalary = Math.round((grossSalary - deductions - totalTaxes) * 100) / 100;
      }
      return updated;
    });
  };

  const updateBulkSuggestionAddition = (index: number, additionId: string, newAmount: number | string) => {
    setBulkPayrollSuggestions(prev => {
      const updated = [...prev];
      const suggestion = updated[index];

      // Update the addition's calculatedAmount
      if (suggestion.additions && Array.isArray(suggestion.additions)) {
        const additionIndex = suggestion.additions.findIndex((a: any) => a._id === additionId);
        if (additionIndex !== -1) {
          suggestion.additions[additionIndex].calculatedAmount = parseFloat(newAmount.toString()) || 0;

          // Recalculate totalAdditions
          const totalAdditions = suggestion.additions.reduce((sum: number, a: any) => {
            return sum + (parseFloat(a.calculatedAmount || a.amount || 0));
          }, 0);

          suggestion.totalAdditions = totalAdditions;

          // Recalculate totalSalary
          const baseSalary = parseFloat(suggestion.baseSalary || 0);
          const bonus = parseFloat(suggestion.bonus || 0);
          const grossSalary = baseSalary + bonus + totalAdditions;
          const deductions = parseFloat(suggestion.deductions || suggestion.totalDeductions || 0);

          let totalTaxes = 0;
          if (suggestion.country === 'Canada') {
            totalTaxes = parseFloat(suggestion.federalIncomeTaxCA || 0) +
              parseFloat(suggestion.provincialIncomeTaxCA || 0) +
              parseFloat(suggestion.cpp || 0) +
              parseFloat(suggestion.ei || 0) +
              parseFloat(suggestion.provincialHealthTaxCA || 0);
          } else {
            totalTaxes = parseFloat(suggestion.federalIncomeTaxUS || 0) +
              parseFloat(suggestion.stateIncomeTaxUS || 0) +
              parseFloat(suggestion.socialSecurityTax || 0) +
              parseFloat(suggestion.medicareTax || 0) +
              parseFloat(suggestion.stateDisabilityInsurance || 0) +
              parseFloat(suggestion.localTax || 0);
          }

          suggestion.totalSalary = Math.round((grossSalary - deductions - totalTaxes) * 100) / 100;
        }
      }

      return updated;
    });
  };

  const updateBulkSuggestionDeduction = (index: number, deductionId: string, newAmount: number | string) => {
    setBulkPayrollSuggestions(prev => {
      const updated = [...prev];
      const suggestion = updated[index];

      // Update the deduction's calculatedAmount
      if (suggestion.deductionsDetails && Array.isArray(suggestion.deductionsDetails)) {
        const deductionIndex = suggestion.deductionsDetails.findIndex((d: any) => d._id === deductionId);
        if (deductionIndex !== -1) {
          suggestion.deductionsDetails[deductionIndex].calculatedAmount = parseFloat(newAmount.toString()) || 0;

          // Recalculate totalDeductions
          const totalDeductions = suggestion.deductionsDetails.reduce((sum: number, d: any) => {
            return sum + (parseFloat(d.calculatedAmount || d.amount || 0));
          }, 0);

          suggestion.totalDeductions = totalDeductions;
          suggestion.deductions = totalDeductions; // Also update deductions field for compatibility

          // Recalculate totalSalary
          const baseSalary = parseFloat(suggestion.baseSalary || 0);
          const bonus = parseFloat(suggestion.bonus || 0);
          const totalAdditions = parseFloat(suggestion.totalAdditions || 0);
          const grossSalary = baseSalary + bonus + totalAdditions;

          let totalTaxes = 0;
          if (suggestion.country === 'Canada') {
            totalTaxes = parseFloat(suggestion.federalIncomeTaxCA || 0) +
              parseFloat(suggestion.provincialIncomeTaxCA || 0) +
              parseFloat(suggestion.cpp || 0) +
              parseFloat(suggestion.ei || 0) +
              parseFloat(suggestion.provincialHealthTaxCA || 0);
          } else {
            totalTaxes = parseFloat(suggestion.federalIncomeTaxUS || 0) +
              parseFloat(suggestion.stateIncomeTaxUS || 0) +
              parseFloat(suggestion.socialSecurityTax || 0) +
              parseFloat(suggestion.medicareTax || 0) +
              parseFloat(suggestion.stateDisabilityInsurance || 0) +
              parseFloat(suggestion.localTax || 0);
          }

          suggestion.totalSalary = Math.round((grossSalary - totalDeductions - totalTaxes) * 100) / 100;
        }
      }

      return updated;
    });
  };

  const handleAICalculation = async () => {
    if (!formData.userId || !formData.startDate || !formData.endDate) {
      showNotification('error', 'Please select a driver and date range first');
      return;
    }

    setLoadingAI(true);
    setAiAnalysis(null);

    try {
      const response = await generateAIDriverPayroll({
        driverId: formData.userId,
        startDate: formData.startDate,
        endDate: formData.endDate
      });

      if (response?.success && response?.data) {
        const analysis = response.data;
        // Transform trips from backend to match Trip interface
        const trips: Trip[] = (analysis.trips || []).map((trip: any) => ({
          _id: trip._id || trip.orderNumber || '',
          tripNumber: trip.tripNumber || trip.orderNumber || 'N/A',
          startLocation: trip.startLocation || trip.pickupLocation,
          endLocation: trip.endLocation || trip.deliveryLocation,
          pickupLocation: trip.pickupLocation || trip.startLocation,
          deliveryLocation: trip.deliveryLocation || trip.endLocation,
          actualEndDate: trip.actualEndDate || trip.deliveryDate || trip.completedDate,
          distance: trip.distance,
          distanceInMiles: trip.distanceInMiles,
          baseRate: trip.baseRate,
          rateType: trip.rateType,
          rateTypeLabel: trip.rateTypeLabel,
          earnings: trip.earnings,
          truck: trip.truck,
          driverRole: trip.driverRole || 'driver',
          driverDetails: trip.driver ? {
            _id: trip.driver._id || '',
            name: trip.driver.name || '',
            phone: trip.driver.phone || ''
          } : undefined,
          coDriverDetails: trip.coDriver ? {
            _id: trip.coDriver._id || '',
            name: trip.coDriver.name || '',
            phone: trip.coDriver.phone || ''
          } : undefined,
          selected: true // Auto-select all AI analysis trips
        }));

        setAiAnalysis({
          recommendedBonus: analysis.recommendedBonus || 0,
          recommendedDeductions: analysis.recommendedDeductions || 0,
          performanceScore: analysis.performanceScore || 0,
          recommendations: analysis.recommendations || [],
          performanceNotes: analysis.performanceNotes || '',
          reasoning: analysis.reasoning || '',
          trips: trips
        });

        // Update form fields with AI recommendations (bonus and deductions only, NOT taxes)
        // User will manually enter tax information
        setFormData(prev => ({
          ...prev,
          bonus: (analysis.recommendedBonus || 0).toString(),
          deductions: (analysis.recommendedDeductions || 0).toString()
          // Note: Taxes are NOT auto-populated - user must enter them manually
        }));

        showNotification('success', 'AI payroll analysis completed successfully! You can now review and enter tax information.');
      } else {
        showNotification('error', response?.message || 'Failed to generate AI analysis');
      }
    } catch (error: any) {
      console.error('Error generating AI analysis:', error);
      showNotification('error', error?.response?.data?.message || error?.message || 'Error generating AI analysis');
    } finally {
      setLoadingAI(false);
    }
  };

  const handleCreate = async () => {
    if (!formData.userId || !formData.payDate || !formData.startDate || !formData.endDate) {
      showNotification('error', 'Please fill in all required fields');
      return;
    }

    const selectedTrips = driverTrips.filter(t => t.selected);
    if (selectedTrips.length === 0) {
      showNotification('error', 'Please select at least one trip');
      return;
    }

    setLoading(true);

    try {
      const selectedTotals = getSelectedTripsTotals();

      console.log('📊 Creating payroll with:', {
        selectedTripsCount: selectedTrips.length,
        totalMiles: selectedTotals.totalMiles,
        totalEarnings: selectedTotals.totalEarnings,
        summaryTotalEarnings: driverPayrollSummary?.totalEarnings,
        summaryTotalTrips: driverPayrollSummary?.totalTrips,
        ratePerMile: driverPayrollSummary?.ratePerMile || driverPayrollSummary?.baseRate,
        tripsWithEarnings: selectedTrips.filter(t => {
          const earnings = typeof t.earnings === 'string' ? parseFloat(t.earnings) : (typeof t.earnings === 'number' ? t.earnings : 0);
          return earnings > 0;
        }).length
      });

      // Ensure we have earnings - use summary if trips don't have earnings
      let baseSalary = selectedTotals.totalEarnings;
      if (baseSalary === 0 && driverPayrollSummary?.totalEarnings) {
        // If selected trips don't have earnings, use the summary total (for all trips in date range)
        // But only if the selected trips count matches the summary count
        if (selectedTotals.count === driverPayrollSummary.totalTrips) {
          baseSalary = driverPayrollSummary.totalEarnings;
          console.log('✅ Using summary totalEarnings:', baseSalary);
        } else {
          // Recalculate based on selected trips using summary rate
          const rate = driverPayrollSummary.baseRate || driverPayrollSummary.ratePerMile || selectedDriver?.details?.salaryPerMile || 0;
          if (rate > 0 && selectedTotals.totalMiles > 0) {
            baseSalary = selectedTotals.totalMiles * rate;
            console.log('✅ Calculated baseSalary from miles and rate:', baseSalary);
          }
        }
      }

      // Final fallback: if still 0, calculate from miles and rate
      if (baseSalary === 0 && selectedTotals.totalMiles > 0) {
        const rate = driverPayrollSummary?.baseRate || driverPayrollSummary?.ratePerMile || selectedDriver?.details?.salaryPerMile || 0;
        if (rate > 0) {
          baseSalary = selectedTotals.totalMiles * rate;
          console.log('✅ Final fallback: Calculated baseSalary from miles and rate:', baseSalary);
        }
      }

      if (baseSalary === 0) {
        console.warn('⚠️ Warning: baseSalary is still 0!', {
          selectedTrips: selectedTrips.map(t => ({
            id: t._id,
            earnings: t.earnings,
            distanceInMiles: t.distanceInMiles,
            baseRate: t.baseRate
          }))
        });
      }

      // Calculate additions and deductions using the helper function (respects edited amounts)
      const { totalAdditions, totalDeductions } = calculateAdditionsDeductions();

      // Add calculated additions to bonus (or baseSalary)
      const calculatedBonus = parseFloat(formData.bonus) || 0;
      const finalBonus = calculatedBonus + totalAdditions;

      // Use only calculated deductions from backend (driver deductions)
      // No manual deductions field - all deductions come from driver deductions
      const finalDeductions = totalDeductions;

      // Create payload for driver payroll
      const payload: any = {
        userId: formData.userId,
        baseSalary: baseSalary,
        bonus: finalBonus,
        deductions: finalDeductions,
        payDate: formData.payDate,
        startDate: formData.startDate,
        endDate: formData.endDate,
        tripIds: selectedTrips.map(trip => trip._id).filter(id => id),
        totalMiles: selectedTotals.totalMiles,
        ratePerMile: parseFloat(((driverPayrollSummary?.ratePerMile || driverPayrollSummary?.baseRate || selectedDriver?.details?.salaryPerMile || 0).toFixed(2))),
        country: formData.country || 'USA',
        // Canada taxes
        federalIncomeTaxCA: parseFloat(formData.federalIncomeTaxCA || '0'),
        provincialIncomeTaxCA: parseFloat(formData.provincialIncomeTaxCA || '0'),
        cpp: parseFloat(formData.cpp || '0'),
        ei: parseFloat(formData.ei || '0'),
        provincialHealthTaxCA: parseFloat(formData.provincialHealthTaxCA || '0'),
        // USA taxes
        federalIncomeTaxUS: parseFloat(formData.federalIncomeTaxUS || '0'),
        stateIncomeTaxUS: parseFloat(formData.stateIncomeTaxUS || '0'),
        socialSecurityTax: parseFloat(formData.socialSecurityTax || '0'),
        medicareTax: parseFloat(formData.medicareTax || '0'),
        stateDisabilityInsurance: parseFloat(formData.stateDisabilityInsurance || '0'),
        localTax: parseFloat(formData.localTax || '0')
      };

      const response = await createPayroll(payload);

      if (response?.success) {
        showNotification('success', response.message || 'Driver payroll created successfully!');
        setShowCreateModal(false);
        setAiAnalysis(null); // Clear AI analysis after successful creation
        resetForm();
        fetchPayrolls();
      } else {
        const errorMsg = response?.message || response?.error || 'Failed to create driver payroll';
        showNotification('error', errorMsg);
      }
    } catch (error: any) {
      const errorMsg = error?.response?.data?.message || error?.message || 'Error creating driver payroll';
      showNotification('error', errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    if (!selectedPayroll) return;

    if (!formData.userId || !formData.payDate || !formData.startDate || !formData.endDate) {
      showNotification('error', 'Please fill in all required fields');
      return;
    }

    setLoading(true);

    try {
      // Calculate additions and deductions from driver profile (same as create, respects edited amounts)
      const { totalAdditions, totalDeductions: calculatedDeductions } = calculateAdditionsDeductions();

      // Add calculated additions to bonus (same as create)
      const calculatedBonus = parseFloat(formData.bonus) || 0;
      const finalBonus = calculatedBonus + totalAdditions;

      const payload: any = {
        userId: formData.userId,
        baseSalary: selectedPayroll.baseSalary, // Keep existing baseSalary
        bonus: finalBonus, // Bonus + edited additions
        deductions: calculatedDeductions, // Use calculated deductions from backend (respects edited amounts)
        payDate: formData.payDate,
        startDate: formData.startDate,
        endDate: formData.endDate,
        country: formData.country || 'USA',
        // Canada taxes
        federalIncomeTaxCA: parseFloat(formData.federalIncomeTaxCA || '0'),
        provincialIncomeTaxCA: parseFloat(formData.provincialIncomeTaxCA || '0'),
        cpp: parseFloat(formData.cpp || '0'),
        ei: parseFloat(formData.ei || '0'),
        provincialHealthTaxCA: parseFloat(formData.provincialHealthTaxCA || '0'),
        // USA taxes
        federalIncomeTaxUS: parseFloat(formData.federalIncomeTaxUS || '0'),
        stateIncomeTaxUS: parseFloat(formData.stateIncomeTaxUS || '0'),
        socialSecurityTax: parseFloat(formData.socialSecurityTax || '0'),
        medicareTax: parseFloat(formData.medicareTax || '0'),
        stateDisabilityInsurance: parseFloat(formData.stateDisabilityInsurance || '0'),
        localTax: parseFloat(formData.localTax || '0')
      };

      const response = await updatePayroll(selectedPayroll._id, payload);

      if (response?.success) {
        showNotification('success', response.message || 'Driver payroll updated successfully!');
        setShowEditModal(false);
        resetForm();
        setSelectedPayroll(null);
        fetchPayrolls();
      } else {
        const errorMsg = response?.message || response?.error || 'Failed to update driver payroll';
        showNotification('error', errorMsg);
      }
    } catch (error: any) {
      const errorMsg = error?.response?.data?.message || error?.message || 'Error updating driver payroll';
      showNotification('error', errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedPayroll) return;

    setLoading(true);

    try {
      const response = await deletePayroll(selectedPayroll._id);

      if (response?.success) {
        showNotification('success', response.message || 'Driver payroll deleted successfully!');
        setShowDeleteModal(false);
        setSelectedPayroll(null);
        fetchPayrolls();
      } else {
        const errorMsg = response?.message || response?.error || 'Failed to delete driver payroll';
        showNotification('error', errorMsg);
      }
    } catch (error: any) {
      const errorMsg = error?.response?.data?.message || error?.message || 'Error deleting driver payroll';
      showNotification('error', errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const openViewModal = (payroll: DriverPayroll) => {
    setSelectedPayroll(payroll);
    setShowViewModal(true);
  };

  const openEditModal = (payroll: DriverPayroll) => {
    setSelectedPayroll(payroll);
    const payDateFormatted = payroll.payDate ? payroll.payDate.split('T')[0] : '';

    setFormData({
      userId: payroll.userId._id,
      bonus: payroll.bonus.toString(),
      deductions: payroll.deductions.toString(),
      payDate: payDateFormatted,
      startDate: payroll.startDate.split('T')[0],
      endDate: payroll.endDate.split('T')[0],
      country: payroll.country || 'USA',
      // Canada taxes
      federalIncomeTaxCA: (payroll.federalIncomeTaxCA || 0).toString(),
      provincialIncomeTaxCA: (payroll.provincialIncomeTaxCA || 0).toString(),
      cpp: (payroll.cpp || 0).toString(),
      ei: (payroll.ei || 0).toString(),
      provincialHealthTaxCA: (payroll.provincialHealthTaxCA || 0).toString(),
      // USA taxes
      federalIncomeTaxUS: (payroll.federalIncomeTaxUS || 0).toString(),
      stateIncomeTaxUS: (payroll.stateIncomeTaxUS || 0).toString(),
      socialSecurityTax: (payroll.socialSecurityTax || 0).toString(),
      medicareTax: (payroll.medicareTax || 0).toString(),
      stateDisabilityInsurance: (payroll.stateDisabilityInsurance || 0).toString(),
      localTax: (payroll.localTax || 0).toString()
    });
    setShowEditModal(true);
  };

  const openDeleteModal = (payroll: DriverPayroll) => {
    setSelectedPayroll(payroll);
    setShowDeleteModal(true);
  };

  const openPaystubModal = async (payroll: DriverPayroll) => {
    setLoadingPaystub(true);
    setSelectedPayroll(payroll);
    try {
      const response = await getPaystubByPayrollId(payroll._id);
      if (response?.success && response.data) {
        setSelectedPaystub(response.data);
        setShowPaystubModal(true);
      } else {
        showNotification('error', response?.message || 'Paystub not found for this payroll. It will be created automatically when payroll is generated.');
      }
    } catch (error: any) {
      console.error('Error fetching paystub:', error);
      showNotification('error', error?.response?.data?.message || 'Error fetching paystub');
    } finally {
      setLoadingPaystub(false);
    }
  };

  const handleDownloadPaystubPDF = async (paystub: Paystub) => {
    try {
      const doc = new jsPDF('p', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 15;
      const contentWidth = pageWidth - (margin * 2);

      // Helper function to check if we need a new page
      const checkPageBreak = (requiredSpace: number) => {
        if (yPos + requiredSpace > pageHeight - margin) {
          doc.addPage();
          yPos = margin;
          return true;
        }
        return false;
      };

      // Color scheme
      const primaryR = 37, primaryG = 99, primaryB = 235; // Blue-600
      const textR = 31, textG = 41, textB = 55; // Gray-800
      const lightGrayR = 243, lightGrayG = 244, lightGrayB = 246; // Gray-100
      const greenR = 34, greenG = 197, greenB = 94; // Green-500
      const redR = 239, redG = 68, redB = 68; // Red-500

      let yPos = margin;

      // Pre-load doclogo for header
      let docLogoBase64 = '';
      let docLogoW = 22, docLogoH = 11;
      try {
        const logoImg = new Image();
        logoImg.src = DocLogo;
        await new Promise<void>((resolve) => {
          logoImg.onload = () => {
            try {
              const cv = document.createElement('canvas');
              cv.width = logoImg.width; cv.height = logoImg.height;
              const ctx = cv.getContext('2d');
              if (ctx) {
                ctx.drawImage(logoImg, 0, 0);
                docLogoBase64 = cv.toDataURL('image/png');
                docLogoW = 22;
                docLogoH = (logoImg.height / logoImg.width) * docLogoW;
              }
            } catch { }
            resolve();
          };
          logoImg.onerror = () => resolve();
        });
      } catch { }

      // Header with colored background
      doc.setFillColor(primaryR, primaryG, primaryB);
      doc.rect(0, 0, pageWidth, 45, 'F');

      // Platform logo in bottom-right of header
      if (docLogoBase64) {
        doc.addImage(docLogoBase64, 'PNG', pageWidth - margin - docLogoW, 44 - docLogoH, docLogoW, docLogoH);
      }

      // Company Details (Left side) - White text on blue background
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      const companyName = paystub.companyDetails?.companyName || 'Company Name';
      doc.text(companyName, margin, 12);

      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      let companyY = 19;
      if (paystub.companyDetails?.companyAddress) {
        const addressLines = doc.splitTextToSize(paystub.companyDetails.companyAddress, 70);
        doc.text(addressLines, margin, companyY);
        companyY += addressLines.length * 4;
      }
      if (paystub.companyDetails?.companyPhone) {
        doc.text(paystub.companyDetails.companyPhone, margin, companyY);
        companyY += 4;
      }

      // Employee info on right side of header (for owner operator format)
      if (paystub.workType === 'Owner-Operator' || paystub.workType === 'Driver') {
        const employeeInfoX = pageWidth - margin - 70;
        doc.setFontSize(8);
        if (paystub.employeeId) {
          doc.text(paystub.employeeId, employeeInfoX, 12);
        }
        if (paystub.employeeName) {
          const nameLines = doc.splitTextToSize(paystub.employeeName, 65);
          doc.text(nameLines, employeeInfoX, 16);
          companyY = Math.max(companyY, 16 + nameLines.length * 4);
        }
        if (paystub.employeeAddress) {
          const addrLines = doc.splitTextToSize(paystub.employeeAddress, 65);
          doc.text(addrLines, employeeInfoX, companyY + 2);
        }
      }

      // Pay Stub Title (Right side) - White text on blue background
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      if (paystub.workType === 'Owner-Operator') {
        doc.text('OWNER OPERATOR PAY STATEMENT', pageWidth - margin, 12, { align: 'right' });
      } else {
        doc.text('PAY STUB', pageWidth - margin, 12, { align: 'right' });
      }

      // Additional info below title
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      let rightY = 16;
      if (paystub.companyDetails?.gstNumber) {
        doc.text(`GST No. ${paystub.companyDetails.gstNumber}`, pageWidth - margin, rightY, { align: 'right' });
        rightY += 4;
      }

      // Pay Period
      const periodStart = new Date(paystub.payPeriod.startDate).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
      const periodEnd = new Date(paystub.payPeriod.endDate).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
      doc.text(`PAY PERIOD ${periodStart} - ${periodEnd}`, pageWidth - margin, rightY, { align: 'right' });
      rightY += 4;

      const payDate = new Date(paystub.payPeriod.payDate).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
      doc.text(`PAYROLL DUE: ${payDate}`, pageWidth - margin, rightY, { align: 'right' });
      rightY += 4;

      if (paystub.payment?.mode === 'Cheque' && paystub.payment?.accountNumber) {
        doc.text(`CHEQUE #: ${paystub.payment.accountNumber}`, pageWidth - margin, rightY, { align: 'right' });
      }

      // Reset text color and move to content area
      doc.setTextColor(textR, textG, textB);
      yPos = 55;

      // Pay Period Box
      const boxWidth = 75;
      const boxHeight = 25;
      doc.setFillColor(lightGrayR, lightGrayG, lightGrayB);
      doc.roundedRect(pageWidth - margin - boxWidth, yPos, boxWidth, boxHeight, 2, 2, 'F');

      doc.setFontSize(7);
      doc.setTextColor(107, 114, 128);
      doc.text('Pay Period Start', pageWidth - margin - boxWidth + 3, yPos + 6);
      doc.text('Pay Period End', pageWidth - margin - boxWidth + 3, yPos + 12);
      doc.text('Pay Date', pageWidth - margin - boxWidth + 3, yPos + 18);

      doc.setFontSize(8);
      doc.setTextColor(textR, textG, textB);
      doc.setFont('helvetica', 'bold');
      const startDate = new Date(paystub.payPeriod.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      const endDate = new Date(paystub.payPeriod.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      const payDateFormatted = new Date(paystub.payPeriod.payDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      doc.text(startDate, pageWidth - margin - 3, yPos + 6, { align: 'right' });
      doc.text(endDate, pageWidth - margin - 3, yPos + 12, { align: 'right' });
      doc.text(payDateFormatted, pageWidth - margin - 3, yPos + 18, { align: 'right' });

      yPos += boxHeight + 8;

      // Employee Information Section
      checkPageBreak(25);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('Employee Information', margin, yPos);
      yPos += 7;
      doc.setDrawColor(200, 200, 200);
      doc.line(margin, yPos, pageWidth - margin, yPos);
      yPos += 6;

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(`Name: ${paystub.employeeName}`, margin, yPos);
      yPos += 6;
      if (paystub.employeeId) {
        doc.text(`Employee ID: ${paystub.employeeId}`, margin, yPos);
        yPos += 6;
      }
      doc.text(`Role: ${paystub.employeeRole || 'N/A'}`, margin, yPos);
      yPos += 6;
      doc.text(`Work Type: ${paystub.workType || 'Employee'}`, margin, yPos);
      yPos += 6;
      if (paystub.employeeAddress) {
        const addrLines = doc.splitTextToSize(`Address: ${paystub.employeeAddress}`, contentWidth);
        doc.text(addrLines, margin, yPos);
        yPos += addrLines.length * 5;
      }
      yPos += 8;

      // Trip Details Section (for drivers/owner-operators)
      if (paystub.tripDetails && paystub.tripDetails.length > 0) {
        checkPageBreak(30);

        // Trip Details Table Header
        doc.setFillColor(lightGrayR, lightGrayG, lightGrayB);
        doc.rect(margin, yPos, contentWidth, 6, 'F');
        doc.setFontSize(6);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(textR, textG, textB);

        // Column positions (adjusted for smaller font to fit all columns)
        const col1 = margin + 1; // Truck #
        const col2 = margin + 15; // Pay Type
        const col3 = margin + 30; // Load #
        const col4 = margin + 42; // Type
        const col5 = margin + 50; // Period From
        const col6 = margin + 65; // To
        const col7 = margin + 80; // Pay Rate
        const col8 = margin + 92; // Miles/Hours
        const col9 = margin + 108; // CAD
        const col10 = margin + 125; // USD

        doc.text('Truck #', col1, yPos + 4);
        doc.text('Pay Type', col2, yPos + 4);
        doc.text('Load #', col3, yPos + 4);
        doc.text('Type', col4, yPos + 4);
        doc.text('Period', col5, yPos + 4);
        doc.text('From', col5, yPos + 5.5);
        doc.text('To', col6, yPos + 4);
        doc.text('Pay Rate', col7, yPos + 4);
        doc.text('Miles/', col8, yPos + 4);
        doc.text('Hours', col8, yPos + 5.5);
        doc.text('CAD', col9, yPos + 4);
        doc.text('USD', col10, yPos + 4);

        yPos += 7;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6);

        let totalMiles = 0;
        let totalCAD = 0;
        let totalUSD = 0;

        // Trip Details Rows
        for (const trip of paystub.tripDetails) {
          checkPageBreak(8);

          const truckNum = trip.truckNumber || 'N/A';
          const payType = trip.payType || 'Paid Per Mile';
          const loadNum = trip.loadNumber || 'N/A';
          const tripType = trip.tripType || 'N/A';

          // Format dates
          const fromDate = trip.periodFrom ? new Date(trip.periodFrom).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }) : 'N/A';
          const toDate = trip.periodTo ? new Date(trip.periodTo).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }) : 'N/A';

          const origin = trip.origin || 'N/A';
          const destination = trip.destination || 'N/A';

          // Split long locations for display
          const originLines = doc.splitTextToSize(origin, 12);
          const destLines = doc.splitTextToSize(destination, 12);

          const payRate = trip.payRate || 0;
          const miles = trip.miles || 0;
          const hours = trip.hours || 0;
          const amountCAD = trip.amountCAD || 0;
          const amountUSD = trip.amountUSD || 0;

          totalMiles += miles;
          totalCAD += amountCAD;
          totalUSD += amountUSD;

          // Calculate row height based on location text
          const maxLines = Math.max(originLines.length, destLines.length);
          const rowHeight = Math.max(6, maxLines * 3.5);

          // Truck #
          doc.text(truckNum, col1, yPos + 3);

          // Pay Type
          doc.text(payType, col2, yPos + 3);

          // Load #
          doc.text(loadNum, col3, yPos + 3);

          // Type
          doc.text(tripType, col4, yPos + 3);

          // Period From - show date on first line, origin below
          doc.text(fromDate, col5, yPos + 3);
          if (origin !== 'N/A' && originLines.length > 0) {
            doc.setFontSize(5);
            doc.setTextColor(107, 114, 128);
            doc.text(originLines[0] || origin.substring(0, 15), col5, yPos + 5.5);
            doc.setFontSize(6);
            doc.setTextColor(textR, textG, textB);
          }

          // To - show date on first line, destination below
          doc.text(toDate, col6, yPos + 3);
          if (destination !== 'N/A' && destLines.length > 0) {
            doc.setFontSize(5);
            doc.setTextColor(107, 114, 128);
            doc.text(destLines[0] || destination.substring(0, 15), col6, yPos + 5.5);
            doc.setFontSize(6);
            doc.setTextColor(textR, textG, textB);
          }

          // Pay Rate
          doc.text(`$${payRate.toFixed(2)}`, col7, yPos + 3);

          // Miles/Hours
          if (miles > 0) {
            doc.text(miles.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), col8, yPos + 3);
          } else if (hours > 0) {
            doc.text(hours.toFixed(2), col8, yPos + 3);
          } else {
            doc.text('-', col8, yPos + 3);
          }

          // CAD
          doc.text(`$${amountCAD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, col9, yPos + 3);

          // USD
          doc.text(`$${amountUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, col10, yPos + 3);

          yPos += rowHeight;
        }

        // Total Miles row
        yPos += 2;
        doc.setDrawColor(200, 200, 200);
        doc.line(margin, yPos, pageWidth - margin, yPos);
        yPos += 5;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7);
        doc.text(`Total Miles: ${totalMiles.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, margin, yPos);
        yPos += 8;
      } else {
        // Fallback to regular earnings section if no trip details
        checkPageBreak(40);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text('Earnings', margin, yPos);
        yPos += 7;
        doc.setDrawColor(200, 200, 200);
        doc.line(margin, yPos, pageWidth - margin, yPos);
        yPos += 5;

        // Earnings Table Header
        doc.setFillColor(lightGrayR, lightGrayG, lightGrayB);
        doc.rect(margin, yPos - 2, contentWidth, 7, 'F');
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.text('Earning Type', margin + 2, yPos + 4);
        doc.text('Units', margin + 70, yPos + 4);
        doc.text('Rate', margin + 100, yPos + 4);
        doc.text('Amount', pageWidth - margin - 2, yPos + 4, { align: 'right' });
        yPos += 9;

        // Earnings Rows
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        if (paystub.earnings.earningsBreakdown && paystub.earnings.earningsBreakdown.length > 0) {
          paystub.earnings.earningsBreakdown.forEach((earning: any) => {
            checkPageBreak(6);
            const typeText = doc.splitTextToSize(earning.type || 'N/A', 60);
            doc.text(typeText, margin + 2, yPos + 4);
            doc.text(earning.units || '-', margin + 70, yPos + 4);
            doc.text(earning.rate > 0 ? `$${earning.rate.toFixed(2)}` : '-', margin + 100, yPos + 4);
            doc.text(`$${earning.amount.toFixed(2)}`, pageWidth - margin - 2, yPos + 4, { align: 'right' });
            yPos += Math.max(6, typeText.length * 5);
          });
        } else {
          // Fallback if no breakdown
          checkPageBreak(6);
          doc.text('Basic Pay', margin + 2, yPos + 4);
          doc.text(`$${paystub.earnings.baseSalary.toFixed(2)}`, pageWidth - margin - 2, yPos + 4, { align: 'right' });
          yPos += 6;
          if (paystub.earnings.bonus > 0) {
            checkPageBreak(6);
            doc.text('Bonus', margin + 2, yPos + 4);
            doc.text(`$${paystub.earnings.bonus.toFixed(2)}`, pageWidth - margin - 2, yPos + 4, { align: 'right' });
            yPos += 6;
          }
          if (paystub.earnings.mileageEarnings > 0) {
            checkPageBreak(6);
            doc.text('Trip Pay / Mileage', margin + 2, yPos + 4);
            doc.text(`$${paystub.earnings.mileageEarnings.toFixed(2)}`, pageWidth - margin - 2, yPos + 4, { align: 'right' });
            yPos += 6;
          }
        }

        // Total Earnings
        yPos += 3;
        doc.setDrawColor(200, 200, 200);
        doc.line(margin, yPos, pageWidth - margin, yPos);
        yPos += 6;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.text('Total Earnings', margin + 2, yPos + 4);
        doc.setTextColor(greenR, greenG, greenB);
        doc.text(`$${paystub.earnings.totalEarnings.toFixed(2)}`, pageWidth - margin - 2, yPos + 4, { align: 'right' });
        doc.setTextColor(textR, textG, textB);
        yPos += 10;
      }

      // Deductions Section
      checkPageBreak(40);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('Deductions', margin, yPos);
      yPos += 7;
      doc.setDrawColor(200, 200, 200);
      doc.line(margin, yPos, pageWidth - margin, yPos);
      yPos += 5;

      // Deductions Table Header
      doc.setFillColor(lightGrayR, lightGrayG, lightGrayB);
      doc.rect(margin, yPos - 2, contentWidth, 7, 'F');
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text('Deduction Type', margin + 2, yPos + 4);
      doc.text('Amount', pageWidth - margin - 2, yPos + 4, { align: 'right' });
      yPos += 9;

      // Deductions Rows
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      if (paystub.deductions.deductionsBreakdown && paystub.deductions.deductionsBreakdown.length > 0) {
        paystub.deductions.deductionsBreakdown.forEach((deduction: any) => {
          checkPageBreak(6);
          const typeText = doc.splitTextToSize(deduction.type || 'N/A', 120);
          doc.text(typeText, margin + 2, yPos + 4);
          doc.setTextColor(redR, redG, redB);
          doc.text(`$${deduction.amount.toFixed(2)}`, pageWidth - margin - 2, yPos + 4, { align: 'right' });
          doc.setTextColor(textR, textG, textB);
          yPos += Math.max(6, typeText.length * 5);
        });
      } else {
        // Fallback
        if (paystub.deductions.otherDeductions > 0) {
          checkPageBreak(6);
          doc.text('Other Deductions', margin + 2, yPos + 4);
          doc.setTextColor(redR, redG, redB);
          doc.text(`$${paystub.deductions.otherDeductions.toFixed(2)}`, pageWidth - margin - 2, yPos + 4, { align: 'right' });
          doc.setTextColor(textR, textG, textB);
          yPos += 6;
        }
        checkPageBreak(6);
        doc.text('Taxes', margin + 2, yPos + 4);
        doc.setTextColor(redR, redG, redB);
        doc.text(`$${paystub.summary.totalTaxes.toFixed(2)}`, pageWidth - margin - 2, yPos + 4, { align: 'right' });
        doc.setTextColor(textR, textG, textB);
        yPos += 6;
      }

      // Total Deductions
      yPos += 3;
      doc.setDrawColor(200, 200, 200);
      doc.line(margin, yPos, pageWidth - margin, yPos);
      yPos += 6;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text('Total Deductions', margin + 2, yPos + 4);
      doc.setTextColor(redR, redG, redB);
      doc.text(`$${paystub.deductions.totalDeductions.toFixed(2)}`, pageWidth - margin - 2, yPos + 4, { align: 'right' });
      doc.setTextColor(textR, textG, textB);
      yPos += 12;

      // Summary Section (Highlighted)
      checkPageBreak(40);
      doc.setFillColor(primaryR, primaryG, primaryB);
      doc.roundedRect(margin, yPos, contentWidth, 32, 2, 2, 'F');
      yPos += 8;
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('Pay Summary', margin + 3, yPos);
      yPos += 9;

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text('Gross Pay', margin + 3, yPos);
      doc.setFont('helvetica', 'bold');
      doc.text(`$${paystub.summary.grossPay.toFixed(2)}`, pageWidth - margin - 3, yPos, { align: 'right' });
      yPos += 7;

      // Additions in summary if exists
      if (paystub.additions && paystub.additions.length > 0) {
        const totalAdditions = paystub.additions.reduce((sum: number, add: any) => sum + (add.totalCAD || add.amount || 0), 0);
        doc.setFont('helvetica', 'normal');
        doc.text('Additions (+)', margin + 3, yPos);
        doc.setFont('helvetica', 'bold');
        doc.text(`$${totalAdditions.toFixed(2)}`, pageWidth - margin - 3, yPos, { align: 'right' });
        yPos += 7;
      }

      doc.setFont('helvetica', 'normal');
      doc.text('Total Deductions:', margin + 3, yPos);
      doc.setFont('helvetica', 'bold');
      doc.text(`$${paystub.summary.totalDeductions.toFixed(2)}`, pageWidth - margin - 3, yPos, { align: 'right' });
      yPos += 6;

      doc.setDrawColor(255, 255, 255);
      doc.line(margin + 3, yPos, pageWidth - margin - 3, yPos);
      yPos += 6;
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('Net Pay', margin + 3, yPos);
      doc.setFontSize(13);
      doc.text(`$${paystub.summary.netPay.toFixed(2)}`, pageWidth - margin - 3, yPos, { align: 'right' });
      doc.setTextColor(textR, textG, textB);
      yPos += 15;

      // YTD Summary (if available)
      if (paystub.ytd) {
        checkPageBreak(25);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text('Year-to-Date (YTD) Summary', margin, yPos);
        yPos += 7;
        doc.setDrawColor(200, 200, 200);
        doc.line(margin, yPos, pageWidth - margin, yPos);
        yPos += 7;

        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.text('YTD Earnings:', margin, yPos);
        doc.text(`$${paystub.ytd.earnings.toFixed(2)}`, margin + 70, yPos);
        yPos += 6;
        doc.text('YTD Deductions:', margin, yPos);
        doc.text(`$${paystub.ytd.deductions.toFixed(2)}`, margin + 70, yPos);
        yPos += 6;
        doc.text('YTD Net Pay:', margin, yPos);
        doc.setFont('helvetica', 'bold');
        doc.text(`$${paystub.ytd.netPay.toFixed(2)}`, margin + 70, yPos);
        yPos += 10;
      }

      // Footer
      const footerY = pageHeight - 20;
      doc.setDrawColor(200, 200, 200);
      doc.line(margin, footerY, pageWidth - margin, footerY);

      doc.setFontSize(7);
      doc.setTextColor(107, 114, 128);
      let footerTextY = footerY + 5;

      if (paystub.notes) {
        const notesLines = doc.splitTextToSize(`Notes: ${paystub.notes}`, contentWidth);
        doc.text(notesLines, margin, footerTextY);
        footerTextY += notesLines.length * 4;
      }
      if (paystub.hrName) {
        doc.text(`HR Signature: ${paystub.hrName}`, margin, footerTextY);
        footerTextY += 4;
      }
      doc.text(`Status: ${paystub.status.charAt(0).toUpperCase() + paystub.status.slice(1)}`, margin, footerTextY);
      doc.text(`Generated: ${new Date(paystub.createdAt).toLocaleString()}`, pageWidth - margin, footerTextY, { align: 'right' });

      // Generate filename
      const fileName = `Paystub_${paystub.employeeName.replace(/\s+/g, '_')}_${paystub.paystubId || paystub._id.slice(-8)}.pdf`;

      // Save PDF
      doc.save(fileName);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Error generating PDF. Please try again.');
    }
  };

  const resetForm = () => {
    setFormData({
      userId: '',
      bonus: '0',
      deductions: '0',
      payDate: '',
      startDate: '',
      endDate: '',
      country: 'USA',
      // Canada taxes
      federalIncomeTaxCA: '0',
      provincialIncomeTaxCA: '0',
      cpp: '0',
      ei: '0',
      provincialHealthTaxCA: '0',
      // USA taxes
      federalIncomeTaxUS: '0',
      stateIncomeTaxUS: '0',
      socialSecurityTax: '0',
      medicareTax: '0',
      stateDisabilityInsurance: '0',
      localTax: '0'
    });
    setSelectedDriver(null);
    setDriverTrips([]);
    setDriverPayrollSummary(null);
  };

  // Count payroll records per driver type (for tab badges)
  const companyDriverPayrollCount = payrollData.filter(payroll => {
    const payrollDriver = typeof payroll.userId === 'object' ? payroll.userId : null;
    if (!payrollDriver) return false;
    const driver = drivers.find(d => d._id === payrollDriver._id?.toString() || d._id === payrollDriver.toString());
    if (!driver) return false;
    return driver.companyFlag ?? driver.details?.companyFlag ?? false;
  }).length;

  const ownerOperatorPayrollCount = payrollData.filter(payroll => {
    const payrollDriver = typeof payroll.userId === 'object' ? payroll.userId : null;
    if (!payrollDriver) return false;
    const driver = drivers.find(d => d._id === payrollDriver._id?.toString() || d._id === payrollDriver.toString());
    if (!driver) return false;
    return !(driver.companyFlag ?? driver.details?.companyFlag ?? false);
  }).length;

  // Filter drivers based on type (owner operator vs company driver)
  const filteredDriversByType = drivers.filter(driver => {
    const isCompanyDriver = driver.companyFlag ?? driver.details?.companyFlag ?? false;
    if (driverTypeTab === 'companyDriver') {
      return isCompanyDriver;
    } else {
      return !isCompanyDriver; // owner operator
    }
  });

  // Filter payrolls based on driver type and search term
  const filteredPayrolls = payrollData.filter(payroll => {
    // First check if payroll's driver matches the selected driver type
    const payrollDriver = typeof payroll.userId === 'object' ? payroll.userId : null;
    if (payrollDriver) {
      // Try to find the driver in our drivers list to check companyFlag
      const driver = drivers.find(d => d._id === payrollDriver._id?.toString() || d._id === payrollDriver.toString());
      if (driver) {
        const isCompanyDriver = driver.companyFlag ?? driver.details?.companyFlag ?? false;
        if (driverTypeTab === 'companyDriver' && !isCompanyDriver) {
          return false; // Skip owner operators when company driver tab is selected
        }
        if (driverTypeTab === 'ownerOperator' && isCompanyDriver) {
          return false; // Skip company drivers when owner operator tab is selected
        }
      }
    }

    // Then apply search filter
    const searchLower = searchTerm.toLowerCase();
    return searchTerm === '' ||
      (payrollDriver?.name?.toLowerCase().includes(searchLower) ?? false);
  });

  // Calculate stats based on filtered payrolls (matching selected driver type tab)
  const totalPayroll = filteredPayrolls.reduce((sum, payroll) => sum + payroll.totalSalary, 0);
  const totalMiles = filteredPayrolls.reduce((sum, payroll) => sum + (payroll.totalMiles || 0), 0);
  const avgPerMile = totalMiles > 0 ? totalPayroll / totalMiles : 0;

  return (
    <div className="min-h-screen bg-main px-6">
      <div className="py-8 w-full mx-auto">
        {notification && (
          <div className={`fixed top-4 right-4 z-[10000] flex items-center gap-3 px-6 py-4 rounded-lg shadow-lg ${notification.type === 'success' ? 'bg-green-500' : 'bg-red-500'
            } text-primary`}>
            {notification.type === 'success' ? (
              <CheckCircle size={20} />
            ) : (
              <AlertCircle size={20} />
            )}
            <span>{notification.message}</span>
            <button onClick={() => setNotification(null)}>
              <X size={20} />
            </button>
          </div>
        )}

        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3" style={{ background: 'var(--accent-navyblue)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              <Truck className="text-[var(--accent-blue)]" size={36} />
              Driver Payroll
            </h1>
            <p className="text-secondary mt-2">Manage driver earnings based on trips and miles</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowBulkGenerateModal(true)}
              className="px-4 py-2 !text-primary rounded-lg transition-all font-medium flex items-center gap-2 hover:shadow-lg hover:scale-105 transform duration-200"
              style={{ background: 'var(--accent-navyblue)' }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              AI Generate All Drivers Payroll
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 !text-primary rounded-lg transition-all font-medium flex items-center gap-2 hover:shadow-lg hover:scale-105 transform duration-200"
              style={{ background: 'var(--accent-navyblue)' }}
            >
              <Plus size={16} />
              Create Driver Payroll
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8 ">
          <div className="bg-[var(--accent-blue)]/20 p-6 rounded-xl border-blue-100 shadow-sm border border-theme">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-[var(--accent-blue)]">Total Payroll</p>
                <p className="text-2xl font-bold text-[var(--accent-blue)] mt-1">${totalPayroll.toLocaleString()}</p>
              </div>
              <div className="p-3 rounded-full bg-card">
                <DollarSign className="text-[var(--accent-blue)]" size={24} />
              </div>
            </div>
          </div>

          <div className="bg-[var(--accent-navyblue)]/20 p-6 rounded-xl border-cyan-100 shadow-sm border border-theme">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-[var(--accent-navyblue)]">Active Drivers</p>
                <p className="text-2xl font-bold text-[var(--accent-navyblue)] mt-1">{filteredPayrolls.length}</p>
              </div>
              <div className="p-3 rounded-full bg-card">
                <Users className="text-[var(--accent-navyblue)]" size={24} />
              </div>
            </div>
          </div>

          <div className="bg-[var(--accent-green)]/20 p-6 rounded-xl border border-theme shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-[var(--accent-green)]">Total Miles</p>
                <p className="text-2xl font-bold text-[var(--accent-green)] mt-1">{totalMiles.toLocaleString()}</p>
              </div>
              <div className="p-3 rounded-full bg-card">
                <TrendingUp className="text-[var(--accent-green)]" size={24} />
              </div>
            </div>
          </div>

          <div className="bg-[var(--accent-purple)]/20 p-6 rounded-xl border border-theme shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-[var(--accent-purple)]">Avg per Mile</p>
                <p className="text-2xl font-bold text-[var(--accent-purple)] mt-1">${avgPerMile.toFixed(2)}</p>
              </div>
              <div className="p-3 rounded-full bg-card">
                <Package className="text-[var(--accent-purple)]" size={24} />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-xl border-theme shadow-sm border mb-6">
          <div className="p-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-secondary" size={20} />
              <input
                type="text"
                placeholder="Search drivers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
          </div>
        </div>

        {/* Driver Type Tabs */}
        <div className="bg-card rounded-xl border-theme shadow-sm border mb-6">
          <div className="flex border-b border-theme">
            <button
              onClick={() => setDriverTypeTab('companyDriver')}
              className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${driverTypeTab === 'companyDriver'
                ? 'text-[var(--accent-blue)] border-b-2 border-[var(--accent-blue)] bg-card'
                : 'text-secondary hover:text-primary hover:bg-[rgba(255,255,255,0.03)]'
                }`}
            >
              Company Drivers
              <span className="ml-2 text-xs text-secondary">
                ({companyDriverPayrollCount})
              </span>
            </button>
            <button
              onClick={() => setDriverTypeTab('ownerOperator')}
              className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${driverTypeTab === 'ownerOperator'
                ? 'text-[var(--accent-blue)] border-b-2 border-[var(--accent-blue)] bg-card'
                : 'text-secondary hover:text-primary hover:bg-[rgba(255,255,255,0.03)]'
                }`}
            >
              Owner Operators
              <span className="ml-2 text-xs text-secondary">
                ({ownerOperatorPayrollCount})
              </span>
            </button>
          </div>
        </div>

        <div className="bg-card border-theme rounded-xl shadow-sm border">
          <div className="p-6 border-b border-theme">
            <h2 className="text-xl font-bold text-headings">
              {driverTypeTab === 'companyDriver' ? 'Company Driver' : 'Owner Operator'} Payroll Records
            </h2>
          </div>

          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
            </div>
          ) : filteredPayrolls.length === 0 ? (
            <div className="text-center py-12 text-secondary">
              No driver payroll records found
            </div>
          ) : (
            <div className="bg-card rounded-lg overflow-hidden">
              {/* Top Scrollbar - Only visible horizontal scrollbar */}
              <style>{`
                .top-scrollbar-container {
                  overflow-x: auto;
                  overflow-y: hidden;
                }
                .top-scrollbar-container::-webkit-scrollbar {
                  height: 10px;
                }
                .top-scrollbar-container::-webkit-scrollbar-track {
                  background: #f7fafc;
                  border-radius: 5px;
                }
                .top-scrollbar-container::-webkit-scrollbar-thumb {
                  background: #10b981;
                  border-radius: 5px;
                }
                .top-scrollbar-container::-webkit-scrollbar-thumb:hover {
                  background: #059669;
                }
                .table-container-with-scrollbar {
                  overflow-x: auto;
                  overflow-y: visible;
                }
                .table-container-with-scrollbar::-webkit-scrollbar {
                  height: 10px;
                }
                .table-container-with-scrollbar::-webkit-scrollbar-track {
                  background: #f7fafc;
                  border-radius: 5px;
                }
                .table-container-with-scrollbar::-webkit-scrollbar-thumb {
                  background: #10b981;
                  border-radius: 5px;
                }
                .table-container-with-scrollbar::-webkit-scrollbar-thumb:hover {
                  background: #059669;
                }
              `}</style>
              <div
                ref={topScrollRef}
                className="top-scrollbar-container"
                style={{
                  height: '20px',
                  marginBottom: '8px',
                  paddingTop: '8px',
                  scrollbarWidth: 'thin',
                  // scrollbarColor: '#10b981 #f7fafc'
                }}
              >
                <div className="top-scroll-content" style={{ height: '1px', minWidth: '100%' }}></div>
              </div>
              {/* Main Table with visible scrollbar */}
              <div
                ref={bottomScrollRef}
                className="table-container-with-scrollbar"
              >
                <table className="w-full">
                  <thead className="bg-card">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-headings uppercase">Driver</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-headings uppercase">Trips</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-headings uppercase">Total Miles</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-headings uppercase">Rate/Mile</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-headings uppercase">Trip Earnings</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-headings uppercase">Bonus</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-headings uppercase">Deductions</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-headings uppercase">Total Pay</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-headings uppercase">Pay Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-headings uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-card  divide-theme divide-white/5">
                    {filteredPayrolls.map((payroll) => (
                      <tr
                        key={payroll._id}
                        className="hover:bg-[rgba(255,255,255,0.03)] cursor-pointer transition-colors"
                        onClick={() => openViewModal(payroll)}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-10 h-10 rounded-full flex items-center justify-center text-primary font-medium bg-green-500">
                              {payroll.userId.name.charAt(0)}
                            </div>
                            <div className="ml-3">
                              <div className="text-sm font-medium text-secondary">{payroll.userId.name}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-secondary">
                          {payroll.trips?.length || 0}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-secondary">
                          {payroll.totalMiles?.toLocaleString() || 0} mi
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary">
                          ${(payroll.ratePerMile || 0).toFixed(2)}/mi
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                          ${payroll.baseSalary.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">
                          +${payroll.bonus.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-[#A855F7]">
                          -${payroll.deductions.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-secondary">
                          ${payroll.totalSalary.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary">
                          {new Date(payroll.payDate).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => openViewModal(payroll)}
                              className="text-green-600 hover:text-green-900 p-2 hover:bg-[var(--accent-green)]/20 rounded-lg"
                              title="View Details"
                            >
                              <Eye size={18} />
                            </button>
                            <button
                              onClick={() => openPaystubModal(payroll)}
                              className="text-purple-600 hover:text-purple-900 p-2 hover:bg-[var(--accent-purple)]/20 rounded-lg disabled:opacity-50"
                              title="View Paystub"
                              disabled={loadingPaystub}
                            >
                              {loadingPaystub && payroll._id === selectedPayroll?._id ? (
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600"></div>
                              ) : (
                                <FileText size={18} />
                              )}
                            </button>
                            <button
                              onClick={() => openEditModal(payroll)}
                              className="text-blue-600 hover:text-blue-900 p-2 hover:bg-[var(--accent-blue)]/20 rounded-lg"
                              title="Edit"
                            >
                              <Edit2 size={18} />
                            </button>
                            <button
                              onClick={() => openDeleteModal(payroll)}
                              className="text-red-600 hover:text-red-900 p-2 hover:bg-[var(--accent-red)]/20 rounded-lg"
                              title="Delete"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Create/Edit Modal */}
        {
          (showCreateModal || showEditModal) && (
            <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-[100] flex items-center justify-center overflow-auto p-4">
              <div className="bg-card rounded-xl shadow-xl max-w-5xl w-full max-h-[90vh] overflow-y-auto">
                <div className="p-6 border-b border-theme sticky top-0 bg-card z-10 flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-[var(--accent-green)]/20">
                      <Truck className="text-[var(--accent-green)]" size={20} />
                    </div>
                    <div>
                      <h4 className="text-xl font-bold text-primary">
                        {showCreateModal ? 'Create Driver Payroll' : 'Edit Driver Payroll'}
                      </h4>
                      <p className="text-sm text-secondary">Based on completed trips and mileage</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setShowCreateModal(false);
                      setShowEditModal(false);
                      setAiAnalysis(null); // Clear AI analysis when modal is closed
                      resetForm();
                    }}
                    className="text-secondary hover:text-secondary p-2 hover:bg-[rgba(255,255,255,0.03)] rounded-lg"
                  >
                    <X size={24} />
                  </button>
                </div>

                <div className="p-6 space-y-5">
                  {showCreateModal && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-primary mb-2">
                          Select Driver <span className="text-red-500">*</span>
                        </label>
                        <select
                          name="userId"
                          value={formData.userId}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-green)] bg-[var(--bg-card)] text-primary"
                        >
                          <option value="">Choose a driver...</option>
                          {filteredDriversByType.map((driver) => (
                            <option key={driver._id} value={driver._id}>
                              {driver.name} - Base: ${driver.details?.salaryPerMile || 0}/mi
                              {driver.details?.salaryPerMileSnow ? ` | Snow: +$${driver.details.salaryPerMileSnow}/mi` : ''}
                              {driver.details?.salaryPerMileHighTemp ? ` | High Temp: +$${driver.details.salaryPerMileHighTemp}/mi` : ''}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="bg-[var(--accent-green)]/10 p-4 rounded-lg border border-[var(--accent-green)]/30">
                        <h5 className="text-sm font-medium text-primary mb-3 flex items-center gap-2">
                          <Calendar size={16} />
                          Trip Period
                        </h5>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-primary mb-2">
                              Start Date <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="date"
                              name="startDate"
                              value={formData.startDate}
                              onChange={(e) => handleDateRangeChange(e.target.value, formData.endDate)}
                              onClick={(e) => (e.currentTarget as HTMLInputElement).showPicker?.()}
                              className="w-full px-4 py-3 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-green)] cursor-pointer"
                              style={{ colorScheme: 'light', color: 'var(--text-primary)', backgroundColor: 'var(--bg-input, var(--bg-card))' }}
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-primary mb-2">
                              End Date <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="date"
                              name="endDate"
                              value={formData.endDate}
                              onChange={(e) => handleDateRangeChange(formData.startDate, e.target.value)}
                              onClick={(e) => (e.currentTarget as HTMLInputElement).showPicker?.()}
                              className="w-full px-4 py-3 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-green)] cursor-pointer"
                              style={{ colorScheme: 'light', color: 'var(--text-primary)', backgroundColor: 'var(--bg-input, var(--bg-card))' }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Trip Summary */}
                      {driverPayrollSummary && (
                        <div className="bg-[var(--accent-navyblue)] text-white p-6 rounded-lg">
                          <div className="flex justify-between items-start mb-4">
                            <div>
                              <h5 className="text-lg font-bold flex items-center gap-2">
                                <TrendingUp size={20} />
                                Trip Summary for {selectedDriver?.name}
                              </h5>
                            </div>
                            <button
                              onClick={handleAICalculation}
                              disabled={loadingAI || !formData.userId || !formData.startDate || !formData.endDate}
                              className="px-4 py-2 bg-card !text-[var(--accent-green)] rounded-lg font-medium hover:bg-[var(--accent-green)]/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-sm"
                              title="Calculate bonus and deductions using AI"
                            >
                              {loadingAI ? (
                                <>
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[var(--accent-green)]"></div>
                                  Analyzing...
                                </>
                              ) : (
                                <>
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                                  </svg>
                                  AI Calculate Salary
                                </>
                              )}
                            </button>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                            <div className="text-center">
                              <div className="text-3xl font-bold">{driverPayrollSummary.totalTrips}</div>
                              <div className="text-sm text-white/70">Total Trips</div>
                            </div>
                            <div className="text-center">
                              <div className="text-3xl font-bold">{driverPayrollSummary.totalDistanceMiles.toLocaleString()}</div>
                              <div className="text-sm text-white/70">Total Miles</div>
                            </div>
                            <div className="text-center">
                              <div className="text-3xl font-bold">${(driverPayrollSummary.baseRate || driverPayrollSummary.ratePerMile || 0).toFixed(2)}</div>
                              <div className="text-sm text-white/70">Base Rate/mi</div>
                            </div>
                            {(driverPayrollSummary.snowRate && driverPayrollSummary.snowRate > 0) && (
                              <div className="text-center">
                                <div className="text-2xl font-bold">+${driverPayrollSummary.snowRate}</div>
                                <div className="text-xs text-white/70">Snow Premium/mi</div>
                              </div>
                            )}
                            {(driverPayrollSummary.highTempRate && driverPayrollSummary.highTempRate > 0) && (
                              <div className="text-center">
                                <div className="text-2xl font-bold">+${driverPayrollSummary.highTempRate}</div>
                                <div className="text-xs text-white/70">High Temp Premium/mi</div>
                              </div>
                            )}
                            <div className="text-center">
                              <div className="text-3xl font-bold">${driverPayrollSummary.totalEarnings.toFixed(2)}</div>
                              <div className="text-sm text-white/70">Total Earnings</div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Additions and Deductions */}
                      {(driverAdditions.length > 0 || driverDeductions.length > 0) && (
                        <div className="bg-card border border-theme rounded-lg overflow-hidden">
                          <div className="bg-card px-4 py-3 border-b border-theme">
                            <h5 className="text-sm font-medium text-primary">Driver Additions & Deductions</h5>
                            <p className="text-xs text-secondary mt-1">These will be automatically included in the payroll calculation</p>
                          </div>
                          <div className="p-4 space-y-4">
                            {driverAdditions.length > 0 && (
                              <div>
                                <h6 className="text-sm font-semibold text-[var(--accent-green)] mb-2 flex items-center gap-2">
                                  <TrendingUp size={16} />
                                  Additions ({driverAdditions.length})
                                </h6>
                                <div className="space-y-2">
                                  {driverAdditions.map((addition) => {
                                    // Calculate the amount to display (edited or calculated)
                                    const calculatedAmount = editedAdditionAmounts[addition._id] !== undefined
                                      ? editedAdditionAmounts[addition._id]
                                      : (() => {
                                        // Calculate from base amount and recurrence (same logic as calculateAdditionsDeductions)
                                        if (!formData.startDate || !formData.endDate) return addition.amount || 0;
                                        const startDateObj = new Date(formData.startDate);
                                        const endDateObj = new Date(formData.endDate);
                                        endDateObj.setHours(23, 59, 59, 999);
                                        const addStartDate = addition.startDate ? new Date(addition.startDate) : null;
                                        const addEndDate = addition.endDate ? new Date(addition.endDate) : null;
                                        const effectiveStartDate = addStartDate && addStartDate > startDateObj ? addStartDate : startDateObj;
                                        const effectiveEndDate = addEndDate && addEndDate < endDateObj ? addEndDate : endDateObj;
                                        let amount = addition.amount || 0;
                                        if (addition.recurrence === 'Weekly') {
                                          const weeks = Math.ceil((effectiveEndDate.getTime() - effectiveStartDate.getTime()) / (7 * 24 * 60 * 60 * 1000));
                                          amount = amount * Math.max(1, weeks);
                                        } else if (addition.recurrence === 'Bi-weekly') {
                                          const biWeeks = Math.ceil((effectiveEndDate.getTime() - effectiveStartDate.getTime()) / (14 * 24 * 60 * 60 * 1000));
                                          amount = amount * Math.max(1, biWeeks);
                                        } else if (addition.recurrence === 'Monthly') {
                                          const months = Math.ceil((effectiveEndDate.getTime() - effectiveStartDate.getTime()) / (30 * 24 * 60 * 60 * 1000));
                                          amount = amount * Math.max(1, months);
                                        }
                                        return amount;
                                      })();

                                    return (
                                      <div key={addition._id} className="bg-[var(--accent-green)]/10 p-3 rounded-lg border border-[var(--accent-green)]/30">
                                        <div className="flex justify-between items-start gap-4">
                                          <div className="flex-1">
                                            <p className="text-sm font-medium text-primary">{addition.name || addition.description || 'Addition'}</p>
                                            <p className="text-xs text-secondary mt-1">
                                              {addition.recurrence} • Base: ${addition.amount?.toFixed(2) || '0.00'}
                                              {addition.startDate && (
                                                <span> • From {new Date(addition.startDate).toLocaleDateString()}</span>
                                              )}
                                              {addition.endDate && (
                                                <span> • Until {new Date(addition.endDate).toLocaleDateString()}</span>
                                              )}
                                            </p>
                                          </div>
                                          <div className="flex items-center gap-2">
                                            <span className="text-xs text-secondary">Amount:</span>
                                            <input
                                              type="number"
                                              value={calculatedAmount}
                                              onChange={(e) => {
                                                const newAmount = parseFloat(e.target.value) || 0;
                                                setEditedAdditionAmounts(prev => ({
                                                  ...prev,
                                                  [addition._id]: newAmount
                                                }));
                                              }}
                                              step="0.01"
                                              min="0"
                                              className="w-24 px-2 py-1 text-sm border border-[var(--accent-green)]/40 rounded focus:outline-none focus:ring-1 focus:ring-[var(--accent-green)] bg-card"
                                            />
                                            <span className="text-sm font-semibold text-[var(--accent-green)]">+${calculatedAmount.toFixed(2)}</span>
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                            {driverDeductions.length > 0 && (
                              <div>
                                <h6 className="text-sm font-semibold text-red-500 mb-2 flex items-center gap-2">
                                  <TrendingUp size={16} className="rotate-180" />
                                  Deductions ({driverDeductions.length})
                                </h6>
                                <div className="space-y-2">
                                  {driverDeductions.map((deduction) => {
                                    // Calculate the amount to display (edited or calculated)
                                    const calculatedAmount = editedDeductionAmounts[deduction._id] !== undefined
                                      ? editedDeductionAmounts[deduction._id]
                                      : (() => {
                                        // Calculate from base amount and recurrence (same logic as calculateAdditionsDeductions)
                                        if (!formData.startDate || !formData.endDate) return deduction.amount || 0;
                                        const startDateObj = new Date(formData.startDate);
                                        const endDateObj = new Date(formData.endDate);
                                        endDateObj.setHours(23, 59, 59, 999);
                                        const dedStartDate = deduction.startDate ? new Date(deduction.startDate) : null;
                                        const dedEndDate = deduction.endDate ? new Date(deduction.endDate) : null;
                                        const effectiveStartDate = dedStartDate && dedStartDate > startDateObj ? dedStartDate : startDateObj;
                                        const effectiveEndDate = dedEndDate && dedEndDate < endDateObj ? dedEndDate : endDateObj;
                                        let amount = deduction.amount || 0;
                                        if (deduction.recurrence === 'Weekly') {
                                          const weeks = Math.ceil((effectiveEndDate.getTime() - effectiveStartDate.getTime()) / (7 * 24 * 60 * 60 * 1000));
                                          amount = amount * Math.max(1, weeks);
                                        } else if (deduction.recurrence === 'Bi-weekly') {
                                          const biWeeks = Math.ceil((effectiveEndDate.getTime() - effectiveStartDate.getTime()) / (14 * 24 * 60 * 60 * 1000));
                                          amount = amount * Math.max(1, biWeeks);
                                        } else if (deduction.recurrence === 'Monthly') {
                                          // Simplified monthly calculation for display
                                          const months = Math.ceil((effectiveEndDate.getTime() - effectiveStartDate.getTime()) / (30 * 24 * 60 * 60 * 1000));
                                          amount = amount * Math.max(1, months);
                                        }
                                        return amount;
                                      })();

                                    return (
                                      <div key={deduction._id} className="bg-card p-3 rounded-lg border border-red-500/30">
                                        <div className="flex justify-between items-start gap-4">
                                          <div className="flex-1">
                                            <p className="text-sm font-medium text-primary">{deduction.name || deduction.description || 'Deduction'}</p>
                                            <p className="text-xs text-secondary mt-1">
                                              {deduction.recurrence} • Base: ${deduction.amount?.toFixed(2) || '0.00'}
                                              {deduction.startDate && (
                                                <span> • From {new Date(deduction.startDate).toLocaleDateString()}</span>
                                              )}
                                              {deduction.endDate && (
                                                <span> • Until {new Date(deduction.endDate).toLocaleDateString()}</span>
                                              )}
                                            </p>
                                          </div>
                                          <div className="flex items-center gap-2">
                                            <span className="text-xs text-secondary">Amount:</span>
                                            <input
                                              type="number"
                                              value={calculatedAmount}
                                              onChange={(e) => {
                                                const newAmount = parseFloat(e.target.value) || 0;
                                                setEditedDeductionAmounts(prev => ({
                                                  ...prev,
                                                  [deduction._id]: newAmount
                                                }));
                                              }}
                                              step="0.01"
                                              min="0"
                                              className="w-24 px-2 py-1 text-sm border border-red-500/40 rounded focus:outline-none focus:ring-1 focus:ring-red-500 bg-card"
                                            />
                                            <span className="text-sm font-semibold text-red-500">-${calculatedAmount.toFixed(2)}</span>
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Trip List */}
                      {driverTrips.length > 0 && (
                        <div className="bg-card border border-theme rounded-lg overflow-hidden">
                          <div className="bg-card px-4 py-3 border-b border-theme flex justify-between items-center">
                            <h5 className="text-sm font-medium text-primary">Completed Trips ({driverTrips.length})</h5>
                            <div className="flex gap-2">
                              <button
                                onClick={selectAllTrips}
                                className="px-3 py-1 text-xs bg-[var(--accent-green)]/20 text-[var(--accent-green)] rounded hover:bg-[var(--accent-green)]/30"
                              >
                                Select All
                              </button>
                              <button
                                onClick={deselectAllTrips}
                                className="px-3 py-1 text-xs bg-card text-primary rounded hover:bg-gray-200"
                              >
                                Deselect All
                              </button>
                            </div>
                          </div>
                          <div className="overflow-x-auto max-h-96">
                            <table className="w-full">
                              <thead className="bg-card sticky top-0">
                                <tr>
                                  <th className="px-3 py-2 text-left text-xs font-medium text-secondary uppercase">Select</th>
                                  <th className="px-3 py-2 text-left text-xs font-medium text-secondary uppercase">Trip #</th>
                                  <th className="px-3 py-2 text-left text-xs font-medium text-secondary uppercase">Route</th>
                                  <th className="px-3 py-2 text-left text-xs font-medium text-secondary uppercase">Role</th>
                                  <th className="px-3 py-2 text-left text-xs font-medium text-secondary uppercase">Completed</th>
                                  <th className="px-3 py-2 text-left text-xs font-medium text-secondary uppercase">Truck</th>
                                  <th className="px-3 py-2 text-left text-xs font-medium text-secondary uppercase">Miles</th>
                                  <th className="px-3 py-2 text-left text-xs font-medium text-secondary uppercase">Rate</th>
                                  <th className="px-3 py-2 text-left text-xs font-medium text-secondary uppercase">Earnings</th>
                                </tr>
                              </thead>
                              <tbody className=" divide-theme">
                                {driverTrips.map((trip) => (
                                  <tr key={trip._id} className={`hover:bg-[rgba(255,255,255,0.03)] ${trip.selected ? 'bg-[var(--accent-green)]/10' : ''}`}>
                                    <td className="px-3 py-2">
                                      <input
                                        type="checkbox"
                                        checked={trip.selected || false}
                                        onChange={() => toggleTripSelection(trip._id)}
                                        className="w-4 h-4 text-[var(--accent-green)] bg-card border-theme rounded focus:ring-[var(--accent-green)]"
                                      />
                                    </td>
                                    <td className="px-3 py-2 text-sm font-medium text-primary">
                                      {trip.tripNumber || trip._id?.slice(-6).toUpperCase()}
                                    </td>
                                    <td className="px-3 py-2 text-sm text-secondary">
                                      <div className="flex items-center gap-1">
                                        <MapPin size={14} className="text-secondary" />
                                        <span>
                                          {(() => {
                                            // Try to get location from trip, orders, or use Unknown
                                            if (trip.startLocation?.place && trip.startLocation.place !== 'Unknown') {
                                              return trip.startLocation.place;
                                            }
                                            if (trip.orders && trip.orders.length > 0) {
                                              const firstOrder = Array.isArray(trip.orders) ? trip.orders[0] : trip.orders;
                                              if (firstOrder?.pickupLocation?.place) {
                                                return firstOrder.pickupLocation.place;
                                              }
                                              if (firstOrder?.pickupLocation?.placeId?.name) {
                                                return firstOrder.pickupLocation.placeId.name;
                                              }
                                            }
                                            return 'Unknown';
                                          })()}
                                        </span>
                                        <span className="text-secondary">→</span>
                                        <span>
                                          {(() => {
                                            // Try to get location from trip, orders, or use Unknown
                                            if (trip.endLocation?.place && trip.endLocation.place !== 'Unknown') {
                                              return trip.endLocation.place;
                                            }
                                            if (trip.orders && trip.orders.length > 0) {
                                              const orderArray = Array.isArray(trip.orders) ? trip.orders : [trip.orders];
                                              const lastOrder = orderArray[orderArray.length - 1];
                                              if (lastOrder?.deliveryLocation?.place) {
                                                return lastOrder.deliveryLocation.place;
                                              }
                                              if (lastOrder?.deliveryLocation?.placeId?.name) {
                                                return lastOrder.deliveryLocation.placeId.name;
                                              }
                                            }
                                            return 'Unknown';
                                          })()}
                                        </span>
                                      </div>
                                    </td>
                                    <td className="px-3 py-2 text-sm">
                                      {trip.driverRole === 'coDriver' ? (
                                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-[var(--accent-blue)]/20 text-[var(--accent-blue)]">
                                          Co-Driver
                                        </span>
                                      ) : (
                                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-[var(--accent-green)]/20 text-[var(--accent-green)]">
                                          Driver
                                        </span>
                                      )}
                                      {trip.coDriverDetails && trip.driverRole === 'driver' && (
                                        <div className="text-xs text-secondary mt-1">
                                          Co: {trip.coDriverDetails.name}
                                        </div>
                                      )}
                                      {trip.driverDetails && trip.driverRole === 'coDriver' && (
                                        <div className="text-xs text-secondary mt-1">
                                          Driver: {trip.driverDetails.name}
                                        </div>
                                      )}
                                    </td>
                                    <td className="px-3 py-2 text-sm text-secondary">
                                      {trip.actualEndDate ? new Date(trip.actualEndDate).toLocaleDateString() : '-'}
                                    </td>
                                    <td className="px-3 py-2 text-sm text-secondary">
                                      {trip.truck?.plateNumber || trip.truck?.licensePlate || trip.truck?.internalId || 'N/A'}
                                    </td>
                                    <td className="px-3 py-2 text-sm font-medium text-primary">
                                      {(() => {
                                        const miles = typeof trip.distanceInMiles === 'string' ? parseFloat(trip.distanceInMiles) : (trip.distanceInMiles || 0);
                                        return miles || 0;
                                      })()}
                                    </td>
                                    <td className="px-3 py-2 text-sm text-secondary">
                                      <div className="flex items-center gap-2">
                                        <span>${trip.baseRate || 0}/mi</span>
                                        {trip.rateType && (
                                          <span className={`px-2 py-0.5 text-xs font-medium rounded ${trip.rateType === 'TEAM'
                                            ? 'bg-blue-100 text-blue-800'
                                            : 'bg-card text-primary'
                                            }`}>
                                            {trip.rateType}
                                          </span>
                                        )}
                                      </div>
                                      {trip.weatherConditions?.snow && trip.snowRate ? (
                                        <div className="text-xs text-secondary mt-1">+ ${trip.snowRate} (snow)</div>
                                      ) : null}
                                      {trip.weatherConditions?.highTemperature && trip.highTempRate ? (
                                        <div className="text-xs text-secondary mt-1">+ ${trip.highTempRate} (high temp)</div>
                                      ) : null}
                                    </td>
                                    <td className="px-3 py-2 text-sm font-bold text-[var(--accent-green)]">
                                      ${(() => {
                                        const earnings = typeof trip.earnings === 'string' ? parseFloat(trip.earnings) : (typeof trip.earnings === 'number' ? trip.earnings : 0);
                                        return earnings.toFixed(2);
                                      })()}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                              <tfoot className="bg-[var(--accent-green)]/10 sticky bottom-0">
                                <tr>
                                  <td colSpan={6} className="px-3 py-3 text-sm font-medium text-primary text-right">
                                    Selected Totals:
                                  </td>
                                  <td className="px-3 py-3 text-sm font-bold text-primary">
                                    {getSelectedTripsTotals().totalMiles.toLocaleString()} mi
                                  </td>
                                  <td className="px-3 py-3 text-sm text-secondary">-</td>
                                  <td className="px-3 py-3 text-sm font-bold text-[var(--accent-green)]">
                                    ${getSelectedTripsTotals().totalEarnings.toFixed(2)}
                                  </td>
                                </tr>
                              </tfoot>
                            </table>
                          </div>
                        </div>
                      )}

                      {loadingTrips && (
                        <div className="bg-[var(--accent-green)]/10 p-4 rounded-lg border border-[var(--accent-green)]/30 text-center">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--accent-green)] mx-auto"></div>
                          <p className="text-sm text-[var(--accent-green)] font-medium mt-2">Loading trips...</p>
                        </div>
                      )}

                      {!loadingTrips && driverTrips.length === 0 && selectedDriver && formData.startDate && formData.endDate && (
                        <div className="bg-card p-4 rounded-lg border border-yellow-200">
                          <div className="flex items-center gap-2 mb-2">
                            <AlertCircle className="text-[#00FFA3]" size={18} />
                            <div className="text-sm font-medium text-yellow-800">No completed trips found</div>
                          </div>
                          <p className="text-xs text-yellow-700">
                            No trips found for {selectedDriver.name} between {formData.startDate} and {formData.endDate}.
                          </p>
                        </div>
                      )}
                    </>
                  )}

                  {/* AI Analysis Results */}
                  {aiAnalysis && (
                    <div className="bg-[var(--accent-blue)]/10 border border-[var(--accent-blue)]/30 rounded-lg p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <div className="w-10 h-10 bg-[var(--accent-blue)] rounded-lg flex items-center justify-center">
                            <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                            </svg>
                          </div>
                          <div>
                            <h5 className="text-lg font-bold text-primary">AI Payroll Analysis</h5>
                            <p className="text-sm text-secondary">Performance Score: {aiAnalysis.performanceScore}/100</p>
                          </div>
                        </div>
                        <button
                          onClick={() => setAiAnalysis(null)}
                          className="text-secondary hover:text-secondary"
                        >
                          <X size={20} />
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div className="bg-card rounded-lg p-4 border border-[var(--accent-green)]/30">
                          <div className="text-sm text-secondary mb-1">Recommended Bonus</div>
                          <div className="text-2xl font-bold text-[var(--accent-green)]">${aiAnalysis.recommendedBonus.toFixed(2)}</div>
                        </div>
                        <div className="bg-card rounded-lg p-4 border border-red-500/30">
                          <div className="text-sm text-secondary mb-1">Recommended Deductions</div>
                          <div className="text-2xl font-bold text-[var(--accent-purple)]">${aiAnalysis.recommendedDeductions.toFixed(2)}</div>
                        </div>
                      </div>

                      {aiAnalysis.reasoning && (
                        <div className="bg-card rounded-lg p-4 border border-theme mb-4">
                          <div className="text-sm font-medium text-primary mb-2">AI Reasoning:</div>
                          <p className="text-sm text-secondary">{aiAnalysis.reasoning}</p>
                        </div>
                      )}

                      {aiAnalysis.recommendations && aiAnalysis.recommendations.length > 0 && (
                        <div className="bg-card rounded-lg p-4 border border-theme">
                          <div className="text-sm font-medium text-primary mb-2">Recommendations:</div>
                          <ul className="space-y-1">
                            {aiAnalysis.recommendations.map((rec, idx) => (
                              <li key={idx} className="text-sm text-secondary flex items-start gap-2">
                                <span className="text-blue-500 mt-1">•</span>
                                <span>{rec}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {aiAnalysis.performanceNotes && (
                        <div className="mt-4 bg-card rounded-lg p-4 border border-theme">
                          <div className="text-sm font-medium text-primary mb-2">Performance Notes:</div>
                          <p className="text-sm text-secondary">{aiAnalysis.performanceNotes}</p>
                        </div>
                      )}

                      {/* AI Analysis Trips */}
                      {aiAnalysis.trips && aiAnalysis.trips.length > 0 && (
                        <div className="mt-4 bg-card border border-theme rounded-lg overflow-hidden">
                          <div className="bg-card px-4 py-3 border-b border-theme">
                            <h5 className="text-sm font-medium text-primary">Completed Trips ({aiAnalysis.trips.length})</h5>
                          </div>
                          <div className="overflow-x-auto max-h-96">
                            <table className="w-full">
                              <thead className="bg-card sticky top-0">
                                <tr>
                                  <th className="px-3 py-2 text-left text-xs font-medium text-secondary uppercase">Trip #</th>
                                  <th className="px-3 py-2 text-left text-xs font-medium text-secondary uppercase">Route</th>
                                  <th className="px-3 py-2 text-left text-xs font-medium text-secondary uppercase">Role</th>
                                  <th className="px-3 py-2 text-left text-xs font-medium text-secondary uppercase">Completed</th>
                                  <th className="px-3 py-2 text-left text-xs font-medium text-secondary uppercase">Truck</th>
                                  <th className="px-3 py-2 text-left text-xs font-medium text-secondary uppercase">Miles</th>
                                  <th className="px-3 py-2 text-left text-xs font-medium text-secondary uppercase">Rate</th>
                                  <th className="px-3 py-2 text-left text-xs font-medium text-secondary uppercase">Earnings</th>
                                </tr>
                              </thead>
                              <tbody className=" divide-theme">
                                {aiAnalysis.trips.map((trip) => (
                                  <tr key={trip._id} className="hover:bg-[rgba(255,255,255,0.03)]">
                                    <td className="px-3 py-2 text-sm font-medium text-primary">
                                      {trip.tripNumber || trip._id?.slice(-6).toUpperCase()}
                                    </td>
                                    <td className="px-3 py-2 text-sm text-secondary">
                                      <div className="flex items-center gap-1">
                                        <MapPin size={14} className="text-secondary" />
                                        <span>
                                          {(() => {
                                            if (trip.startLocation?.place && trip.startLocation.place !== 'Unknown') {
                                              return trip.startLocation.place;
                                            }
                                            if (trip.pickupLocation?.place) {
                                              return trip.pickupLocation.place;
                                            }
                                            return 'Unknown';
                                          })()}
                                        </span>
                                        <span className="text-secondary">→</span>
                                        <span>
                                          {(() => {
                                            if (trip.endLocation?.place && trip.endLocation.place !== 'Unknown') {
                                              return trip.endLocation.place;
                                            }
                                            if (trip.deliveryLocation?.place) {
                                              return trip.deliveryLocation.place;
                                            }
                                            return 'Unknown';
                                          })()}
                                        </span>
                                      </div>
                                    </td>
                                    <td className="px-3 py-2 text-sm">
                                      {trip.driverRole === 'coDriver' ? (
                                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-[var(--accent-blue)]/20 text-[var(--accent-blue)]">
                                          Co-Driver
                                        </span>
                                      ) : (
                                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-[var(--accent-green)]/20 text-[var(--accent-green)]">
                                          Driver
                                        </span>
                                      )}
                                      {trip.coDriverDetails && trip.driverRole === 'driver' && (
                                        <div className="text-xs text-secondary mt-1">
                                          Co: {trip.coDriverDetails.name}
                                        </div>
                                      )}
                                      {trip.driverDetails && trip.driverRole === 'coDriver' && (
                                        <div className="text-xs text-secondary mt-1">
                                          Driver: {trip.driverDetails.name}
                                        </div>
                                      )}
                                    </td>
                                    <td className="px-3 py-2 text-sm text-secondary">
                                      {trip.actualEndDate ? new Date(trip.actualEndDate).toLocaleDateString() : '-'}
                                    </td>
                                    <td className="px-3 py-2 text-sm text-secondary">
                                      {trip.truck?.plateNumber || trip.truck?.licensePlate || trip.truck?.internalId || 'N/A'}
                                    </td>
                                    <td className="px-3 py-2 text-sm font-medium text-primary">
                                      {(() => {
                                        const miles = typeof trip.distanceInMiles === 'string' ? parseFloat(trip.distanceInMiles) : (trip.distanceInMiles || 0);
                                        return miles || 0;
                                      })()}
                                    </td>
                                    <td className="px-3 py-2 text-sm text-secondary">
                                      <div className="flex items-center gap-2">
                                        <span>${trip.baseRate || 0}/mi</span>
                                        {trip.rateType && (
                                          <span className={`px-2 py-0.5 text-xs font-medium rounded ${trip.rateType === 'TEAM'
                                            ? 'bg-blue-100 text-blue-800'
                                            : trip.rateType === 'EMPTY'
                                              ? 'bg-yellow-100 text-yellow-800'
                                              : trip.rateType === 'EMPTY-TEAM'
                                                ? 'bg-orange-100 text-orange-800'
                                                : 'bg-card text-primary'
                                            }`}>
                                            {trip.rateTypeLabel || trip.rateType}
                                          </span>
                                        )}
                                      </div>
                                    </td>
                                    <td className="px-3 py-2 text-sm font-bold text-[var(--accent-green)]">
                                      ${(() => {
                                        const earnings = typeof trip.earnings === 'string' ? parseFloat(trip.earnings) : (typeof trip.earnings === 'number' ? trip.earnings : 0);
                                        return earnings.toFixed(2);
                                      })()}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                              <tfoot className="bg-[var(--accent-green)]/10 sticky bottom-0">
                                <tr>
                                  <td colSpan={5} className="px-3 py-3 text-sm font-medium text-primary text-right">
                                    Selected Totals:
                                  </td>
                                  <td className="px-3 py-3 text-sm font-bold text-primary">
                                    {(() => {
                                      const totalMiles = aiAnalysis.trips?.reduce((sum, trip) => {
                                        const miles = typeof trip.distanceInMiles === 'string' ? parseFloat(trip.distanceInMiles) : (trip.distanceInMiles || 0);
                                        return sum + miles;
                                      }, 0) || 0;
                                      return totalMiles.toLocaleString();
                                    })()} mi
                                  </td>
                                  <td className="px-3 py-3 text-sm text-secondary">-</td>
                                  <td className="px-3 py-3 text-sm font-bold text-[var(--accent-green)]">
                                    ${(() => {
                                      const totalEarnings = aiAnalysis.trips?.reduce((sum, trip) => {
                                        const earnings = typeof trip.earnings === 'string' ? parseFloat(trip.earnings) : (typeof trip.earnings === 'number' ? trip.earnings : 0);
                                        return sum + earnings;
                                      }, 0) || 0;
                                      return totalEarnings.toFixed(2);
                                    })()}
                                  </td>
                                </tr>
                              </tfoot>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-primary mb-2">
                      Bonus ($)
                    </label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-secondary" size={18} />
                      <input
                        type="number"
                        name="bonus"
                        value={formData.bonus}
                        onChange={handleInputChange}
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        className="w-full pl-10 pr-4 py-3 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      />
                    </div>
                    <p className="text-xs text-secondary mt-1">
                      Note: Deductions are automatically calculated from driver deductions and will be shown in the summary below.
                    </p>
                  </div>

                  {/* Tax Section */}
                  <div className="bg-card  p-6 rounded-lg border border-theme">
                    <h5 className="text-lg font-semibold text-[var(--accent-navyblue)] mb-4 flex items-center gap-2">
                      <DollarSign size={20} className="text-[var(--accent-navyblue)]" />
                      Tax Information
                    </h5>

                    <div className="mb-4">
                      <label className="block text-sm font-medium text-primary mb-2">
                        Country <span className="text-red-500">*</span>
                      </label>
                      <select
                        name="country"
                        value={formData.country}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all bg-card"
                      >
                        <option value="USA">United States</option>
                        <option value="Canada">Canada</option>
                      </select>
                    </div>

                    {formData.country === 'Canada' && (
                      <div className="space-y-4">
                        <h6 className="text-sm font-semibold text-primary mb-3">Canada Taxes</h6>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-primary mb-2">
                              Federal Income Tax ($)
                            </label>
                            <div className="relative text-secondary">
                              <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-secondary" size={16} />
                              <input
                                type="number"
                                name="federalIncomeTaxCA"
                                value={formData.federalIncomeTaxCA}
                                onChange={handleInputChange}
                                min="0"
                                step="0.01"
                                placeholder="0.00"
                                className="w-full pl-10 pr-4 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-card "
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-primary mb-2">
                              Provincial Income Tax ($)
                            </label>
                            <div className="relative">
                              <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-secondary" size={16} />
                              <input
                                type="number"
                                name="provincialIncomeTaxCA"
                                value={formData.provincialIncomeTaxCA}
                                onChange={handleInputChange}
                                min="0"
                                step="0.01"
                                placeholder="0.00"
                                className="w-full pl-10 pr-4 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-card"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-primary mb-2">
                              Canada Pension Plan (CPP) ($)
                            </label>
                            <div className="relative">
                              <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-secondary" size={16} />
                              <input
                                type="number"
                                name="cpp"
                                value={formData.cpp}
                                onChange={handleInputChange}
                                min="0"
                                step="0.01"
                                placeholder="0.00"
                                className="w-full pl-10 pr-4 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-card"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-primary mb-2">
                              Employment Insurance (EI) ($)
                            </label>
                            <div className="relative">
                              <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-secondary" size={16} />
                              <input
                                type="number"
                                name="ei"
                                value={formData.ei}
                                onChange={handleInputChange}
                                min="0"
                                step="0.01"
                                placeholder="0.00"
                                className="w-full pl-10 pr-4 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-card"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-primary mb-2">
                              Provincial Health Tax ($)
                            </label>
                            <div className="relative">
                              <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-secondary" size={16} />
                              <input
                                type="number"
                                name="provincialHealthTaxCA"
                                value={formData.provincialHealthTaxCA}
                                onChange={handleInputChange}
                                min="0"
                                step="0.01"
                                placeholder="0.00"
                                className="w-full pl-10 pr-4 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-card"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {formData.country === 'USA' && (
                      <div className="space-y-4">
                        <h6 className="text-sm font-semibold text-primary mb-3">United States Taxes</h6>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-primary mb-2">
                              Federal Income Tax ($)
                            </label>
                            <div className="relative">
                              <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-secondary" size={16} />
                              <input
                                type="number"
                                name="federalIncomeTaxUS"
                                value={formData.federalIncomeTaxUS}
                                onChange={handleInputChange}
                                min="0"
                                step="0.01"
                                placeholder="0.00"
                                className="w-full pl-10 pr-4 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-card"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-primary mb-2">
                              State Income Tax ($)
                            </label>
                            <div className="relative">
                              <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-secondary" size={16} />
                              <input
                                type="number"
                                name="stateIncomeTaxUS"
                                value={formData.stateIncomeTaxUS}
                                onChange={handleInputChange}
                                min="0"
                                step="0.01"
                                placeholder="0.00"
                                className="w-full pl-10 pr-4 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-card"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-primary mb-2">
                              Social Security Tax (FICA) ($)
                            </label>
                            <div className="relative">
                              <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-secondary" size={16} />
                              <input
                                type="number"
                                name="socialSecurityTax"
                                value={formData.socialSecurityTax}
                                onChange={handleInputChange}
                                min="0"
                                step="0.01"
                                placeholder="0.00"
                                className="w-full pl-10 pr-4 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-card"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-primary mb-2">
                              Medicare Tax ($)
                            </label>
                            <div className="relative">
                              <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-secondary" size={16} />
                              <input
                                type="number"
                                name="medicareTax"
                                value={formData.medicareTax}
                                onChange={handleInputChange}
                                min="0"
                                step="0.01"
                                placeholder="0.00"
                                className="w-full pl-10 pr-4 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-card"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-primary mb-2">
                              State Disability Insurance (SDI) ($)
                            </label>
                            <div className="relative">
                              <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-secondary" size={16} />
                              <input
                                type="number"
                                name="stateDisabilityInsurance"
                                value={formData.stateDisabilityInsurance}
                                onChange={handleInputChange}
                                min="0"
                                step="0.01"
                                placeholder="0.00"
                                className="w-full pl-10 pr-4 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-card"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-primary mb-2">
                              Local Tax ($)
                            </label>
                            <div className="relative">
                              <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-secondary" size={16} />
                              <input
                                type="number"
                                name="localTax"
                                value={formData.localTax}
                                onChange={handleInputChange}
                                min="0"
                                step="0.01"
                                placeholder="0.00"
                                className="w-full pl-10 pr-4 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-card"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Tax Summary */}
                    {getSelectedTripsTotals().count > 0 && (
                      <div className="mt-4 p-4 bg-card rounded-lg border border-purple-300">
                        <h6 className="text-sm font-semibold text-primary mb-2">Total Taxes</h6>
                        <div className="text-2xl font-bold text-purple-600">
                          ${(() => {
                            let totalTax = 0;
                            if (formData.country === 'Canada') {
                              totalTax =
                                parseFloat(formData.federalIncomeTaxCA || '0') +
                                parseFloat(formData.provincialIncomeTaxCA || '0') +
                                parseFloat(formData.cpp || '0') +
                                parseFloat(formData.ei || '0') +
                                parseFloat(formData.provincialHealthTaxCA || '0');
                            } else {
                              totalTax =
                                parseFloat(formData.federalIncomeTaxUS || '0') +
                                parseFloat(formData.stateIncomeTaxUS || '0') +
                                parseFloat(formData.socialSecurityTax || '0') +
                                parseFloat(formData.medicareTax || '0') +
                                parseFloat(formData.stateDisabilityInsurance || '0') +
                                parseFloat(formData.localTax || '0');
                            }
                            return totalTax.toFixed(2);
                          })()}
                        </div>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-primary mb-2">
                      Payment Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      name="payDate"
                      value={formData.payDate}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>

                  {getSelectedTripsTotals().count > 0 && (() => {
                    const { totalAdditions, totalDeductions: calculatedDeductions } = calculateAdditionsDeductions();
                    const tripsTotals = getSelectedTripsTotals();
                    const manualBonus = parseFloat(formData.bonus || '0');

                    // Gross Earnings = Trip Earnings + Manual Bonus + Calculated Additions
                    const grossEarnings = tripsTotals.totalEarnings + manualBonus + totalAdditions;

                    // Total Deductions = Only Calculated Deductions (from backend/driver deductions)
                    // No manual deductions - all deductions come from driver deductions
                    const totalDeductions = calculatedDeductions;

                    // Calculate taxes
                    let totalTax = 0;
                    if (formData.country === 'Canada') {
                      totalTax =
                        parseFloat(formData.federalIncomeTaxCA || '0') +
                        parseFloat(formData.provincialIncomeTaxCA || '0') +
                        parseFloat(formData.cpp || '0') +
                        parseFloat(formData.ei || '0') +
                        parseFloat(formData.provincialHealthTaxCA || '0');
                    } else {
                      totalTax =
                        parseFloat(formData.federalIncomeTaxUS || '0') +
                        parseFloat(formData.stateIncomeTaxUS || '0') +
                        parseFloat(formData.socialSecurityTax || '0') +
                        parseFloat(formData.medicareTax || '0') +
                        parseFloat(formData.stateDisabilityInsurance || '0') +
                        parseFloat(formData.localTax || '0');
                    }

                    // Net Pay = Gross Earnings - Total Deductions - Taxes
                    const netPay = grossEarnings - totalDeductions - totalTax;

                    return (
                      <div className="bg-[var(--accent-navyblue)] text-white p-6 rounded-lg">
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <p className="text-sm text-white/70">Gross Earnings</p>
                            <p className="text-lg font-semibold">
                              ${grossEarnings.toFixed(2)}
                            </p>
                          </div>
                          {(totalAdditions > 0 || manualBonus > 0) && (
                            <div className="pl-4 text-xs text-white/60">
                              {tripsTotals.totalEarnings > 0 && (
                                <div className="flex justify-between">
                                  <span>Trips Earnings:</span>
                                  <span>${tripsTotals.totalEarnings.toFixed(2)}</span>
                                </div>
                              )}
                              {manualBonus > 0 && (
                                <div className="flex justify-between">
                                  <span>Manual Bonus:</span>
                                  <span>+${manualBonus.toFixed(2)}</span>
                                </div>
                              )}
                              {totalAdditions > 0 && (
                                <div className="flex justify-between">
                                  <span>Additions ({driverAdditions.length}):</span>
                                  <span>+${totalAdditions.toFixed(2)}</span>
                                </div>
                              )}
                            </div>
                          )}
                          <div className="flex justify-between items-center text-sm">
                            <p className="text-white/70">Deductions</p>
                            <p className="text-red-300">-${totalDeductions.toFixed(2)}</p>
                          </div>
                          {calculatedDeductions > 0 && (
                            <div className="pl-4 text-xs text-red-300">
                              <div className="flex justify-between">
                                <span>Deductions ({driverDeductions.length}):</span>
                                <span>-${calculatedDeductions.toFixed(2)}</span>
                              </div>
                            </div>
                          )}
                          <div className="flex justify-between items-center text-sm">
                            <p className="text-white/70">Taxes</p>
                            <p className="text-red-300">-${totalTax.toFixed(2)}</p>
                          </div>
                          <div className="pt-2 border-t border-white/20 flex justify-between items-center">
                            <p className="text-sm font-bold text-white/70">Net Pay</p>
                            <p className="text-4xl font-bold mt-1">
                              ${netPay.toFixed(2)}
                            </p>
                          </div>
                          <div className="text-right mt-2">
                            <p className="text-xs text-white/70">Based on</p>
                            <p className="text-sm font-bold">{tripsTotals.count} trips</p>
                            <p className="text-xs text-white/70">{tripsTotals.totalMiles.toLocaleString()} miles</p>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  <div className="flex justify-end gap-3 pt-4 border-t border-theme">
                    <button
                      onClick={() => {
                        setShowCreateModal(false);
                        setShowEditModal(false);
                        setAiAnalysis(null); // Clear AI analysis when modal is closed
                        resetForm();
                      }}
                      className="px-4 py-2 text-primary bg-card hover:bg-gray-200 rounded-lg font-medium flex items-center gap-2"
                      disabled={loading}
                    >
                      <X size={16} />
                      Cancel
                    </button>
                    <button
                      onClick={showCreateModal ? handleCreate : handleUpdate}
                      style={{
                        background: 'var(--accent-navyblue)'
                      }}
                      className="px-4 py-2   !text-primary rounded-lg font-medium flex items-center gap-2 disabled:opacity-50"
                      disabled={loading}
                    >
                      {loading ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          Processing...
                        </>
                      ) : (
                        <>
                          {showCreateModal ? <Plus size={16} /> : <CheckCircle size={16} />}
                          {showCreateModal ? 'Create Payroll' : 'Update Payroll'}
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )
        }

        {/* View Modal */}
        {
          showViewModal && selectedPayroll && (
            <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-[100] flex items-center justify-center overflow-auto p-4">
              <div className="bg-card rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                <div className="p-6 border-b border-theme sticky top-0 bg-card z-10 flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[var(--accent-navyblue)] rounded-lg flex items-center justify-center">
                      <Eye className="text-primary" size={20} />
                    </div>
                    <div>
                      <h4 className="text-xl font-bold text-headings">Driver Payroll Details</h4>
                      <p className="text-sm text-secondary">{selectedPayroll.userId.name}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowViewModal(false)}
                    className="text-secondary hover:text-secondary p-2 hover:bg-[rgba(255,255,255,0.03)] rounded-lg"
                  >
                    <X size={24} />
                  </button>
                </div>

                <div className="p-6 space-y-6">
                  {/* Driver Info */}
                  <div className="bg-[var(--accent-navyblue)] text-white p-6 rounded-xl">
                    <h5 className="text-lg font-bold mb-4 flex items-center gap-2">
                      <Truck size={20} />
                      Driver Information
                    </h5>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="text-sm text-white/70">Driver Name</label>
                        <div className="text-xl font-bold mt-1">{selectedPayroll.userId.name}</div>
                      </div>
                      <div>
                        <label className="text-sm text-white/70">Total Trips</label>
                        <div className="text-xl font-bold mt-1">{selectedPayroll.trips?.length || 0}</div>
                      </div>
                      <div>
                        <label className="text-sm text-white/70">Pay Period</label>
                        <div className="text-sm font-medium mt-1">
                          {new Date(selectedPayroll.startDate).toLocaleDateString()} - {new Date(selectedPayroll.endDate).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Trip Details */}
                  {selectedPayroll.trips && selectedPayroll.trips.length > 0 && (
                    <div className="bg-card border border-theme rounded-lg overflow-hidden">
                      <div className="bg-card px-4 py-3 border-b border-theme">
                        <h5 className="text-sm font-medium text-primary">Trip Details ({selectedPayroll.trips.length})</h5>
                      </div>
                      <div className="overflow-x-auto max-h-80">
                        <table className="w-full">
                          <thead className="bg-card sticky top-0">
                            <tr>
                              <th className="px-3 py-2 text-left text-xs font-medium text-headings uppercase">Trip #</th>
                              <th className="px-3 py-2 text-left text-xs font-medium text-headings uppercase">Route</th>
                              <th className="px-3 py-2 text-left text-xs font-medium text-headings uppercase">Role</th>
                              <th className="px-3 py-2 text-left text-xs font-medium text-headings uppercase">Completed</th>
                              <th className="px-3 py-2 text-left text-xs font-medium text-headings uppercase">Miles</th>
                              <th className="px-3 py-2 text-left text-xs font-medium text-headings uppercase">Earnings</th>
                            </tr>
                          </thead>
                          <tbody className=" divide-theme divide-white/5">
                            {selectedPayroll.trips.map((trip) => (
                              <tr key={trip._id} className="hover:bg-[rgba(255,255,255,0.03)]">
                                <td className="px-3 py-2 text-sm font-medium text-secondary">
                                  {trip.tripNumber || trip._id?.slice(-6).toUpperCase()}
                                </td>
                                <td className="px-3 py-2 text-sm text-secondary">
                                  <div className="flex items-center gap-1">
                                    <MapPin size={14} className="text-secondary" />
                                    <span>
                                      {(() => {
                                        // Try to get location from trip, orders, or use Unknown
                                        if (trip.startLocation?.place && trip.startLocation.place !== 'Unknown') {
                                          return trip.startLocation.place;
                                        }
                                        if (trip.orders && trip.orders.length > 0) {
                                          const firstOrder = Array.isArray(trip.orders) ? trip.orders[0] : trip.orders;
                                          if (firstOrder?.pickupLocation?.place) {
                                            return firstOrder.pickupLocation.place;
                                          }
                                          if (firstOrder?.pickupLocation?.placeId?.name) {
                                            return firstOrder.pickupLocation.placeId.name;
                                          }
                                        }
                                        return 'Unknown';
                                      })()}
                                    </span>
                                    <span className="text-secondary">→</span>
                                    <span>
                                      {(() => {
                                        // Try to get location from trip, orders, or use Unknown
                                        if (trip.endLocation?.place && trip.endLocation.place !== 'Unknown') {
                                          return trip.endLocation.place;
                                        }
                                        if (trip.orders && trip.orders.length > 0) {
                                          const orderArray = Array.isArray(trip.orders) ? trip.orders : [trip.orders];
                                          const lastOrder = orderArray[orderArray.length - 1];
                                          if (lastOrder?.deliveryLocation?.place) {
                                            return lastOrder.deliveryLocation.place;
                                          }
                                          if (lastOrder?.deliveryLocation?.placeId?.name) {
                                            return lastOrder.deliveryLocation.placeId.name;
                                          }
                                        }
                                        return 'Unknown';
                                      })()}
                                    </span>
                                  </div>
                                </td>
                                <td className="px-3 py-2 text-sm">
                                  {trip.driverRole === 'coDriver' ? (
                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-[var(--accent-blue)]/20 text-[var(--accent-blue)]">
                                      Co-Driver
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-[var(--accent-green)]/20 text-[var(--accent-green)]">
                                      Driver
                                    </span>
                                  )}
                                </td>
                                <td className="px-3 py-2 text-sm text-secondary">
                                  {trip.actualEndDate ? new Date(trip.actualEndDate).toLocaleDateString() : '-'}
                                </td>
                                <td className="px-3 py-2 text-sm font-medium text-secondary">
                                  {(() => {
                                    // Calculate miles from route or use stored value
                                    let miles: number = 0;
                                    if (trip.distanceInMiles) {
                                      miles = typeof trip.distanceInMiles === 'string' ? parseFloat(trip.distanceInMiles) : trip.distanceInMiles;
                                    } else if (trip.route && trip.route.totalDistance) {
                                      miles = parseFloat((trip.route.totalDistance * 0.621371).toFixed(2));
                                    }
                                    return miles || 0;
                                  })()} mi
                                </td>
                                <td className="px-3 py-2 text-sm font-bold text-[var(--accent-green)]">
                                  {(() => {
                                    // Calculate earnings from miles and rate, or use stored value
                                    let earnings: number = 0;
                                    if (trip.earnings) {
                                      earnings = typeof trip.earnings === 'string' ? parseFloat(trip.earnings) : trip.earnings;
                                    }
                                    if (!earnings || earnings === 0) {
                                      let miles: number = 0;
                                      if (trip.distanceInMiles) {
                                        miles = typeof trip.distanceInMiles === 'string' ? parseFloat(trip.distanceInMiles) : trip.distanceInMiles;
                                      } else if (trip.route?.totalDistance) {
                                        miles = parseFloat((trip.route.totalDistance * 0.621371).toFixed(2));
                                      }
                                      const rate = selectedPayroll.ratePerMile || 0; // This comes from payroll record
                                      if (miles && rate) {
                                        earnings = parseFloat((miles * rate).toFixed(2));
                                      }
                                    }
                                    return `$${earnings.toFixed(2)}`;
                                  })()}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Earnings Breakdown */}
                  <div className="bg-card p-6 rounded-xl border border-theme ">
                    <h5 className="text-lg font-bold text-headings mb-4 flex items-center gap-2">
                      <DollarSign size={20} className="text-[var(--accent-navyblue)]" />
                      Earnings Breakdown
                    </h5>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center p-3 bg-card rounded-lg border border-theme">
                        <span className="text-sm font-medium text-primary">Trip Earnings ({selectedPayroll.totalMiles?.toLocaleString()} miles @ ${(selectedPayroll.ratePerMile || 0).toFixed(2)}/mi)</span>
                        <span className="text-lg font-bold text-primary">${selectedPayroll.baseSalary.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-card rounded-lg border border-theme">
                        <span className="text-sm font-medium text-primary">Bonus</span>
                        <span className="text-lg font-bold text-[var(--accent-green)]">+${selectedPayroll.bonus.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-card rounded-lg border border-theme">
                        <span className="text-sm font-medium text-primary">Deductions</span>
                        <span className="text-lg font-bold text-red-500">-${selectedPayroll.deductions.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-card rounded-lg border border-theme">
                        <span className="text-sm font-medium text-primary">Taxes</span>
                        <span className="text-lg font-bold text-red-500">
                          -${(() => {
                            let totalTax = 0;
                            const country = selectedPayroll.country || 'USA';
                            if (country === 'Canada') {
                              totalTax =
                                (selectedPayroll.federalIncomeTaxCA || 0) +
                                (selectedPayroll.provincialIncomeTaxCA || 0) +
                                (selectedPayroll.cpp || 0) +
                                (selectedPayroll.ei || 0) +
                                (selectedPayroll.provincialHealthTaxCA || 0);
                            } else {
                              totalTax =
                                (selectedPayroll.federalIncomeTaxUS || 0) +
                                (selectedPayroll.stateIncomeTaxUS || 0) +
                                (selectedPayroll.socialSecurityTax || 0) +
                                (selectedPayroll.medicareTax || 0) +
                                (selectedPayroll.stateDisabilityInsurance || 0) +
                                (selectedPayroll.localTax || 0);
                            }
                            return totalTax.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                          })()}
                        </span>
                      </div>
                      <div className="flex justify-between items-center p-4 bg-[var(--accent-navyblue)] rounded-lg">
                        <span className="text-sm font-medium text-white/80">Net Pay</span>
                        <span className="text-2xl font-bold text-white">${selectedPayroll.totalSalary.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                    </div>
                  </div>

                  {/* Tax Information */}
                  {(() => {
                    const country = selectedPayroll.country || 'USA';
                    const totalTaxes = country === 'Canada'
                      ? ((selectedPayroll.federalIncomeTaxCA || 0) +
                        (selectedPayroll.provincialIncomeTaxCA || 0) +
                        (selectedPayroll.cpp || 0) +
                        (selectedPayroll.ei || 0) +
                        (selectedPayroll.provincialHealthTaxCA || 0))
                      : ((selectedPayroll.federalIncomeTaxUS || 0) +
                        (selectedPayroll.stateIncomeTaxUS || 0) +
                        (selectedPayroll.socialSecurityTax || 0) +
                        (selectedPayroll.medicareTax || 0) +
                        (selectedPayroll.stateDisabilityInsurance || 0) +
                        (selectedPayroll.localTax || 0));

                    if (totalTaxes > 0) {
                      return (
                        <div className="bg-card p-6 rounded-xl border border-[var(--accent-purple)]/30">
                          <h5 className="text-lg font-bold text-[var(--accent-purple)] mb-4 flex items-center gap-2">
                            <DollarSign size={20} className="text-[var(--accent-purple)]" />
                            Tax Information ({country})
                          </h5>
                          {country === 'Canada' ? (
                            <div className="grid grid-cols-2 gap-3">
                              <div className="flex justify-between p-2 bg-card rounded">
                                <span className="text-sm text-secondary">Federal Income Tax:</span>
                                <span className="text-sm font-medium">${(selectedPayroll.federalIncomeTaxCA || 0).toFixed(2)}</span>
                              </div>
                              <div className="flex justify-between p-2 bg-card rounded">
                                <span className="text-sm text-secondary">Provincial Income Tax:</span>
                                <span className="text-sm font-medium">${(selectedPayroll.provincialIncomeTaxCA || 0).toFixed(2)}</span>
                              </div>
                              <div className="flex justify-between p-2 bg-card rounded">
                                <span className="text-sm text-secondary">CPP:</span>
                                <span className="text-sm font-medium">${(selectedPayroll.cpp || 0).toFixed(2)}</span>
                              </div>
                              <div className="flex justify-between p-2 bg-card rounded">
                                <span className="text-sm text-secondary">EI:</span>
                                <span className="text-sm font-medium">${(selectedPayroll.ei || 0).toFixed(2)}</span>
                              </div>
                              <div className="flex justify-between p-2 bg-card rounded">
                                <span className="text-sm text-secondary">Provincial Health Tax:</span>
                                <span className="text-sm font-medium">${(selectedPayroll.provincialHealthTaxCA || 0).toFixed(2)}</span>
                              </div>
                            </div>
                          ) : (
                            <div className="grid grid-cols-2 gap-3">
                              <div className="flex justify-between p-2 bg-card rounded">
                                <span className="text-sm text-secondary">Federal Income Tax:</span>
                                <span className="text-sm font-medium">${(selectedPayroll.federalIncomeTaxUS || 0).toFixed(2)}</span>
                              </div>
                              <div className="flex justify-between p-2 bg-card rounded">
                                <span className="text-sm text-secondary">State Income Tax:</span>
                                <span className="text-sm font-medium">${(selectedPayroll.stateIncomeTaxUS || 0).toFixed(2)}</span>
                              </div>
                              <div className="flex justify-between p-2 bg-card rounded">
                                <span className="text-sm text-secondary">Social Security:</span>
                                <span className="text-sm font-medium">${(selectedPayroll.socialSecurityTax || 0).toFixed(2)}</span>
                              </div>
                              <div className="flex justify-between p-2 bg-card rounded">
                                <span className="text-sm text-secondary">Medicare:</span>
                                <span className="text-sm font-medium">${(selectedPayroll.medicareTax || 0).toFixed(2)}</span>
                              </div>
                              <div className="flex justify-between p-2 bg-card rounded">
                                <span className="text-sm text-secondary">SDI:</span>
                                <span className="text-sm font-medium">${(selectedPayroll.stateDisabilityInsurance || 0).toFixed(2)}</span>
                              </div>
                              <div className="flex justify-between p-2 bg-card rounded">
                                <span className="text-sm text-secondary">Local Tax:</span>
                                <span className="text-sm font-medium">${(selectedPayroll.localTax || 0).toFixed(2)}</span>
                              </div>
                            </div>
                          )}
                          <div className="mt-3 pt-3 border-t border-[var(--accent-purple)]/30 flex justify-between items-center">
                            <span className="text-sm font-semibold text-primary">Total Taxes:</span>
                            <span className="text-lg font-bold text-[var(--accent-purple)]">${totalTaxes.toFixed(2)}</span>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  })()}

                  {/* Payment Info */}
                  <div className="bg-card p-6 rounded-xl border border-theme">
                    <h5 className="text-lg font-bold text-[var(--accent-amber)] mb-4 flex items-center gap-2">
                      <Calendar size={20} className="text-[var(--accent-amber)]" />
                      Payment Information
                    </h5>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-semibold text-secondary">Payment Date</label>
                        <div className="mt-1 px-4 py-3 bg-card rounded-lg text-primary font-medium">
                          {new Date(selectedPayroll.payDate).toLocaleDateString()}
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-semibold text-secondary">Pay Period</label>
                        <div className="mt-1 px-4 py-3 bg-card rounded-lg text-primary font-medium">
                          {new Date(selectedPayroll.startDate).toLocaleDateString()} - {new Date(selectedPayroll.endDate).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-6 border-t border-theme">
                  <button
                    onClick={() => setShowViewModal(false)}
                    className="w-full px-6 py-3 bg-card hover:bg-[rgba(255,255,255,0.05)] border border-theme text-primary rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
                  >
                    <X size={18} />
                    Close
                  </button>
                </div>
              </div>
            </div>
          )
        }

        {/* Delete Modal */}
        {
          showDeleteModal && selectedPayroll && (
            <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
              <div className="bg-card rounded-xl shadow-xl max-w-md w-full p-6">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                    <AlertCircle className="text-[#A855F7]" size={24} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-primary">Delete Driver Payroll</h3>
                    <p className="text-sm text-secondary">This action cannot be undone</p>
                  </div>
                </div>

                <p className="text-primary mb-6">
                  Are you sure you want to delete the payroll record for driver <strong>{selectedPayroll.userId.name}</strong>?
                </p>

                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => {
                      setShowDeleteModal(false);
                      setSelectedPayroll(null);
                    }}
                    className="px-4 py-2 text-primary !mr-3 bg-card hover:bg-gray-200 rounded-lg font-medium"
                    disabled={loading}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDelete}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 !text-primary rounded-lg font-medium disabled:opacity-50"
                    disabled={loading}
                  >
                    {loading ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </div>
            </div>
          )
        }

        {/* Professional Paystub Modal */}
        {
          showPaystubModal && selectedPaystub && (
            <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-[100] flex items-center justify-center overflow-auto p-4">
              <div className="bg-card rounded-xl shadow-xl max-w-5xl w-full max-h-[95vh] overflow-y-auto">
                {/* Header */}
                <div className="p-6 border-b-2 border-theme sticky top-0 bg-card z-10">
                  <div className="flex justify-between items-start mb-4">
                    <button
                      onClick={() => {
                        setShowPaystubModal(false);
                        setSelectedPaystub(null);
                      }}
                      className="text-secondary hover:text-secondary p-2 hover:bg-[rgba(255,255,255,0.03)] rounded-lg transition-colors"
                    >
                      <X size={24} />
                    </button>
                  </div>

                  {/* Company Header Section */}
                  <div className="border-b-2 border-theme pb-4 mb-4 ">
                    <div className="flex justify-between items-start ">
                      <div className="flex-1">
                        {selectedPaystub.companyDetails?.companyLogo && (
                          <img
                            src={selectedPaystub.companyDetails.companyLogo}
                            alt="Company Logo"
                            className="h-12 mb-3"
                          />
                        )}
                        <h2 className="text-2xl font-bold text-headings mb-1 ">
                          {selectedPaystub.companyDetails?.companyName || 'Company Name'}
                        </h2>
                        {selectedPaystub.companyDetails?.companyAddress && (
                          <p className="text-sm text-secondary mb-1">
                            {selectedPaystub.companyDetails.companyAddress}
                          </p>
                        )}
                        <div className="flex gap-4 text-sm text-secondary">
                          {selectedPaystub.companyDetails?.companyPhone && (
                            <span>Phone: {selectedPaystub.companyDetails.companyPhone}</span>
                          )}
                          {selectedPaystub.companyDetails?.companyEmail && (
                            <span>Email: {selectedPaystub.companyDetails.companyEmail}</span>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <h1 className="text-3xl font-bold text-headings mb-2">PAY STUB</h1>
                        <p className="text-sm text-secondary">EARNINGS STATEMENT</p>
                        {selectedPaystub.paystubId && (
                          <p className="text-xs text-secondary mt-2">ID: {selectedPaystub.paystubId}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Pay Period Header */}
                  <div className="grid grid-cols-3 gap-4 bg-card p-4 rounded-lg border border-theme">
                    <div>
                      <label className="text-xs font-semibold text-secondary uppercase">Pay Period Start</label>
                      <div className="text-sm font-bold text-primary mt-1">
                        {new Date(selectedPaystub.payPeriod.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-secondary uppercase">Pay Period End</label>
                      <div className="text-sm font-bold text-primary mt-1">
                        {new Date(selectedPaystub.payPeriod.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-secondary uppercase">Pay Date</label>
                      <div className="text-sm font-bold text-primary mt-1">
                        {new Date(selectedPaystub.payPeriod.payDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-6 space-y-6">
                  {/* Employee Information Section */}
                  <div className="bg-card p-5 rounded-lg border border-theme">
                    <h3 className="text-lg font-bold text-headings mb-4 border-b border-theme pb-2">Employee Information</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-semibold text-secondary uppercase">Employee / Driver Name</label>
                        <div className="mt-1 text-base font-semibold text-primary">
                          {selectedPaystub.employeeName || 'Unknown'}
                        </div>
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-secondary uppercase">Employee ID / Driver ID</label>
                        <div className="mt-1 text-base font-semibold text-primary">
                          {selectedPaystub.employeeId || 'N/A'}
                        </div>
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-secondary uppercase">Role / Position</label>
                        <div className="mt-1">
                          <span className="px-3 py-1 text-sm font-medium rounded-full bg-blue-100 text-blue-800">
                            {selectedPaystub.employeeRole || 'N/A'}
                          </span>
                        </div>
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-secondary uppercase">Work Type</label>
                        <div className="mt-1 text-base font-semibold text-primary">
                          {selectedPaystub.workType || 'Employee'}
                        </div>
                      </div>
                      {selectedPaystub.employeeDepartment && (
                        <div>
                          <label className="text-xs font-semibold text-secondary uppercase">Department</label>
                          <div className="mt-1 text-base text-primary">
                            {selectedPaystub.employeeDepartment}
                          </div>
                        </div>
                      )}
                      {selectedPaystub.employeeAddress && (
                        <div>
                          <label className="text-xs font-semibold text-secondary uppercase">Address</label>
                          <div className="mt-1 text-sm text-primary">
                            {selectedPaystub.employeeAddress}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Earnings Section */}
                  <div className="bg-card p-5 rounded-lg border border-theme">
                    <h3 className="text-lg font-bold text-headings mb-4 border-b border-theme pb-2">Earnings</h3>
                    {selectedPaystub.earnings.earningsBreakdown && selectedPaystub.earnings.earningsBreakdown.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b border-green-300">
                              <th className="text-left py-2 px-3 text-xs font-semibold text-headings uppercase">Earning Type</th>
                              <th className="text-center py-2 px-3 text-xs font-semibold text-headings uppercase">Units</th>
                              <th className="text-right py-2 px-3 text-xs font-semibold text-headings uppercase">Rate</th>
                              <th className="text-right py-2 px-3 text-xs font-semibold text-headings uppercase">Amount</th>
                            </tr>
                          </thead>
                          <tbody className=''>
                            {selectedPaystub.earnings.earningsBreakdown.map((earning: any, index: number) => (
                              <tr key={index} className="border-b border-green-200">
                                <td className="py-2 px-3 text-sm text-primary">{earning.type}</td>
                                <td className="py-2 px-3 text-sm text-center text-secondary">{earning.units || '-'}</td>
                                <td className="py-2 px-3 text-sm text-right text-secondary">
                                  {earning.rate > 0 ? `$${earning.rate.toFixed(2)}` : '-'}
                                </td>
                                <td className="py-2 px-3 text-sm text-right font-semibold text-primary">
                                  ${earning.amount.toFixed(2)}
                                </td>
                              </tr>
                            ))}
                            <tr className=" font-bold">
                              <td colSpan={3} className="py-3 px-3 text-sm text-primary">Total Earnings</td>
                              <td className="py-3 px-3 text-sm text-right text-green-700">
                                ${selectedPaystub.earnings.totalEarnings.toFixed(2)}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex justify-between items-center py-2 border-b border-green-200">
                          <span className="text-sm text-primary">Basic Pay</span>
                          <span className="text-sm font-semibold text-primary">
                            ${selectedPaystub.earnings.baseSalary.toFixed(2)}
                          </span>
                        </div>
                        {selectedPaystub.earnings.bonus > 0 && (
                          <div className="flex justify-between items-center py-2 border-b border-green-200">
                            <span className="text-sm text-primary">Bonus</span>
                            <span className="text-sm font-semibold text-green-600">
                              ${selectedPaystub.earnings.bonus.toFixed(2)}
                            </span>
                          </div>
                        )}
                        {selectedPaystub.earnings.mileageEarnings > 0 && (
                          <div className="flex justify-between items-center py-2 border-b border-green-200">
                            <span className="text-sm text-primary">Trip Pay / Mileage</span>
                            <span className="text-sm font-semibold text-green-600">
                              ${selectedPaystub.earnings.mileageEarnings.toFixed(2)}
                            </span>
                          </div>
                        )}
                        <div className="flex justify-between items-center py-3 bg-green-100 rounded mt-2 px-3 font-bold">
                          <span className="text-base text-primary">Total Earnings</span>
                          <span className="text-base text-green-700">
                            ${selectedPaystub.earnings.totalEarnings.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Deductions Section */}
                  <div className="bg-card p-5 rounded-lg border border-red-200">
                    <h3 className="text-lg font-bold text-headings mb-4 border-b border-red-300 pb-2">Deductions</h3>
                    {selectedPaystub.deductions.deductionsBreakdown && selectedPaystub.deductions.deductionsBreakdown.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b border-red-300">
                              <th className="text-left py-2 px-3 text-xs font-semibold text-primary uppercase">Deduction Type</th>
                              <th className="text-right py-2 px-3 text-xs font-semibold text-primary uppercase">Amount</th>
                            </tr>
                          </thead>
                          <tbody className=''>
                            {selectedPaystub.deductions.deductionsBreakdown.map((deduction: any, index: number) => (
                              <tr key={index} className="border-b border-red-200">
                                <td className="py-2 px-3 text-sm text-primary">{deduction.type}</td>
                                <td className="py-2 px-3 text-sm text-right font-semibold text-[#A855F7]">
                                  ${deduction.amount.toFixed(2)}
                                </td>
                              </tr>
                            ))}
                            <tr className=" font-bold">
                              <td className="py-3 px-3 text-sm text-primary">Total Deductions</td>
                              <td className="py-3 px-3 text-sm text-right text-red-700">
                                ${selectedPaystub.deductions.totalDeductions.toFixed(2)}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {selectedPaystub.deductions.otherDeductions > 0 && (
                          <div className="flex justify-between items-center py-2 border-b border-red-200">
                            <span className="text-sm text-primary">Other Deductions</span>
                            <span className="text-sm font-semibold text-[#A855F7]">
                              ${selectedPaystub.deductions.otherDeductions.toFixed(2)}
                            </span>
                          </div>
                        )}
                        <div className="flex justify-between items-center py-2 border-b border-red-200">
                          <span className="text-sm text-primary">Taxes</span>
                          <span className="text-sm font-semibold text-[#A855F7]">
                            ${selectedPaystub.summary.totalTaxes.toFixed(2)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center py-3 bg-red-100 rounded mt-2 px-3 font-bold">
                          <span className="text-base text-primary">Total Deductions</span>
                          <span className="text-base text-red-700">
                            ${selectedPaystub.deductions.totalDeductions.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Employer Contributions (if applicable) */}
                  {selectedPaystub.employerContributions && selectedPaystub?.employerContributions?.total && selectedPaystub?.employerContributions?.total > 0 && (
                    <div className="bg-card p-5 rounded-lg border border-purple-200">
                      <h3 className="text-lg font-bold text-primary mb-4 border-b border-purple-300 pb-2">Employer Contributions</h3>
                      <div className="space-y-2">
                        {selectedPaystub?.employerContributions?.companyInsurance && selectedPaystub?.employerContributions?.companyInsurance > 0 && (
                          <div className="flex justify-between items-center py-2 border-b border-purple-200">
                            <span className="text-sm text-primary">Company Insurance</span>
                            <span className="text-sm font-semibold text-purple-600">
                              ${selectedPaystub?.employerContributions?.companyInsurance?.toFixed(2)}
                            </span>
                          </div>
                        )}
                        {selectedPaystub?.employerContributions?.pensionPF && selectedPaystub?.employerContributions?.pensionPF > 0 && (
                          <div className="flex justify-between items-center py-2 border-b border-purple-200">
                            <span className="text-sm text-primary">Pension / PF</span>
                            <span className="text-sm font-semibold text-purple-600">
                              ${selectedPaystub?.employerContributions?.pensionPF?.toFixed(2)}
                            </span>
                          </div>
                        )}
                        {selectedPaystub?.employerContributions?.benefitContributions && selectedPaystub?.employerContributions?.benefitContributions > 0 && (
                          <div className="flex justify-between items-center py-2 border-b border-purple-200">
                            <span className="text-sm text-primary">Benefit Contributions</span>
                            <span className="text-sm font-semibold text-purple-600">
                              ${selectedPaystub?.employerContributions?.benefitContributions?.toFixed(2)}
                            </span>
                          </div>
                        )}
                        <div className="flex justify-between items-center py-3 bg-purple-100 rounded mt-2 px-3 font-bold">
                          <span className="text-base text-primary">Total Employer Contributions</span>
                          <span className="text-base text-purple-700">
                            ${selectedPaystub.employerContributions.total.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Summary Section */}
                  <div className="bg-[var(--accent-navyblue)]/20 p-6 rounded-lg text-primary shadow-lg">
                    <h3 className="text-xl font-bold mb-4 border-b border-blue-400 pb-2">Pay Summary</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-semibold opacity-90 uppercase">Gross Earnings</label>
                        <div className="mt-1 text-2xl font-bold">
                          ${selectedPaystub.summary.grossPay.toFixed(2)}
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-semibold opacity-90 uppercase">Total Deductions</label>
                        <div className="mt-1 text-2xl font-bold">
                          ${selectedPaystub.summary.totalDeductions.toFixed(2)}
                        </div>
                      </div>
                      <div className="col-span-2 border-t border-blue-400 pt-4 mt-2">
                        <div className="flex justify-between items-center">
                          <div className="text-3xl font-bold">
                            ${selectedPaystub.summary.netPay.toFixed(2)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* YTD Summary */}
                  {selectedPaystub.ytd && (
                    <div className="bg-[var(--accent-navyblue)]/20 p-5 rounded-lg border border-theme">
                      <h3 className="text-lg font-bold text-primary mb-4 border-b border-theme pb-2">Year-to-Date (YTD) Summary</h3>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <label className="text-xs font-semibold text-primary uppercase">YTD Earnings</label>
                          <div className="mt-1 text-base font-bold text-indigo-700">
                            ${selectedPaystub.ytd.earnings.toFixed(2)}
                          </div>
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-primary uppercase">YTD Deductions</label>
                          <div className="mt-1 text-base font-bold text-[#A855F7]">
                            ${selectedPaystub.ytd.deductions.toFixed(2)}
                          </div>
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-primary uppercase">YTD Net Pay</label>
                          <div className="mt-1 text-base font-bold text-green-700">
                            ${selectedPaystub.ytd.netPay.toFixed(2)}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Footer Section */}
                  <div className="bg-card p-5 rounded-lg border border-theme">
                    {selectedPaystub.notes && (
                      <div className="mb-4">
                        <label className="text-xs font-semibold text-secondary uppercase">Notes / Remarks</label>
                        <div className="mt-1 text-sm text-primary">
                          {selectedPaystub.notes}
                        </div>
                      </div>
                    )}

                    <div className="pt-4 border-t border-theme flex justify-between items-end">
                      <div>
                        {selectedPaystub.hrName && (
                          <div>
                            <label className="text-xs font-semibold text-headings uppercase">HR Signature</label>
                            <div className="mt-1 text-sm font-semibold text-primary">
                              {selectedPaystub.hrName}
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-secondary">
                          Status: <span className={`font-semibold ${selectedPaystub.status === 'issued'
                            ? 'text-green-600'
                            : selectedPaystub.status === 'void'
                              ? 'text-[#A855F7]'
                              : 'text-secondary'
                            }`}>
                            {selectedPaystub.status.charAt(0).toUpperCase() + selectedPaystub.status.slice(1)}
                          </span>
                        </div>
                        <div className="text-xs text-secondary mt-1">
                          Generated: {new Date(selectedPaystub.createdAt).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer with Download PDF and Close Button */}
                <div className="p-6 border-t-2 border-theme bg-card">
                  <div className="flex justify-between items-center">
                    <button
                      onClick={() => handleDownloadPaystubPDF(selectedPaystub)}
                      className="px-6 py-3 bg-[var(--accent-navyblue)] text-primary rounded-lg font-medium transition-colors flex items-center gap-2"
                    >
                      <Download size={18} />
                      Download PDF
                    </button>
                    <button
                      onClick={() => {
                        setShowPaystubModal(false);
                        setSelectedPaystub(null);
                      }}
                      className="px-6 py-3 border border-theme text-primary rounded-lg font-medium transition-colors flex items-center gap-2"
                    >
                      <X size={18} />
                      Close
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )
        }

        {/* Bulk Generate AI Payroll Modal */}
        {
          showBulkGenerateModal && (
            <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-[100] flex items-center justify-center overflow-auto p-4">
              <div className="bg-card rounded-xl shadow-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-primary flex items-center gap-2">
                    <svg className="w-6 h-6 text-[#00D1FF]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                    AI Generate Payroll for All Drivers
                  </h2>
                  <button
                    onClick={() => {
                      setShowBulkGenerateModal(false);
                      setBulkGenerateResult(null);
                    }}
                    className="text-secondary hover:text-secondary"
                  >
                    <X size={24} />
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="bg-card border border-blue-200 rounded-lg p-4 mb-4">
                    <p className="text-sm text-blue-800">
                      This will automatically calculate and create payroll for <strong>all drivers</strong> who have completed trips in the selected date range using AI analysis.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-primary mb-2">
                        Start Date <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="date"
                        value={bulkDateRange.startDate}
                        onChange={(e) => setBulkDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                        className="w-full px-4 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-primary mb-2">
                        End Date <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="date"
                        value={bulkDateRange.endDate}
                        onChange={(e) => setBulkDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                        className="w-full px-4 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-primary mb-2">
                      Pay Date
                    </label>
                    <input
                      type="date"
                      value={bulkDateRange.payDate}
                      onChange={(e) => setBulkDateRange(prev => ({ ...prev, payDate: e.target.value }))}
                      className="w-full px-4 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {loadingBulkAI && (
                    <div className="bg-card border border-blue-200 rounded-lg p-4 text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                      <p className="text-sm text-blue-800 font-medium">Processing all drivers...</p>
                      <p className="text-xs text-[#00D1FF] mt-1">This may take a few minutes</p>
                    </div>
                  )}

                  {bulkGenerateResult && (
                    <div className="bg-card border border-theme rounded-lg p-4">
                      <h3 className="text-lg font-bold text-primary mb-3">Generation Results</h3>
                      <div className="grid grid-cols-4 gap-4 mb-4">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-primary">{bulkGenerateResult.summary?.total || 0}</div>
                          <div className="text-xs text-secondary">Total Drivers</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-green-600">{bulkGenerateResult.summary?.successful || 0}</div>
                          <div className="text-xs text-secondary">Successful</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-[#A855F7]">{bulkGenerateResult.summary?.failed || 0}</div>
                          <div className="text-xs text-secondary">Failed</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-[#00FFA3]">{bulkGenerateResult.summary?.skipped || 0}</div>
                          <div className="text-xs text-secondary">Skipped</div>
                        </div>
                      </div>

                      {bulkGenerateResult.successful && bulkGenerateResult.successful.length > 0 && (
                        <div className="mb-4">
                          <h4 className="text-sm font-medium text-primary mb-2">Successfully Created ({bulkGenerateResult.successful.length})</h4>
                          <div className="max-h-32 overflow-y-auto">
                            {bulkGenerateResult.successful.map((item: any, idx: number) => (
                              <div key={idx} className="text-xs text-secondary py-1 border-b border-theme">
                                {item.driverName}: ${item.totalSalary.toFixed(2)} ({item.totalTrips} trips, {item.totalMiles.toFixed(0)} mi)
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {bulkGenerateResult.failed && bulkGenerateResult.failed.length > 0 && (
                        <div className="mb-4">
                          <h4 className="text-sm font-medium text-red-700 mb-2">Failed ({bulkGenerateResult.failed.length})</h4>
                          <div className="max-h-32 overflow-y-auto">
                            {bulkGenerateResult.failed.map((item: any, idx: number) => (
                              <div key={idx} className="text-xs text-[#A855F7] py-1 border-b border-red-200">
                                {item.driverName || item.driverId}: {item.reason}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {bulkGenerateResult.skipped && bulkGenerateResult.skipped.length > 0 && (
                        <div>
                          <h4 className="text-sm font-medium text-yellow-700 mb-2">Skipped ({bulkGenerateResult.skipped.length})</h4>
                          <div className="max-h-32 overflow-y-auto">
                            {bulkGenerateResult.skipped.map((item: any, idx: number) => (
                              <div key={idx} className="text-xs text-[#00FFA3] py-1 border-b border-yellow-200">
                                {item.driverName || item.driverId}: {item.reason}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex justify-end gap-2 pt-4">
                    <button
                      onClick={() => {
                        setShowBulkGenerateModal(false);
                        setBulkGenerateResult(null);
                      }}
                      className="px-4 py-2 border border-theme rounded-lg text-primary hover:bg-[rgba(255,255,255,0.03)]"
                      disabled={loadingBulkAI}
                    >
                      {bulkGenerateResult ? 'Close' : 'Cancel'}
                    </button>
                    <button
                      onClick={handleBulkAIGeneration}
                      disabled={loadingBulkAI || !bulkDateRange.startDate || !bulkDateRange.endDate}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-primary rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {loadingBulkAI ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          Processing...
                        </>
                      ) : (
                        <>
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                          Analyze All Drivers
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )
        }

        {/* Bulk AI Payroll Suggestions Modal */}
        {
          showBulkSuggestionsModal && bulkPayrollSuggestions.length > 0 && (
            <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-[100] flex items-center justify-center overflow-auto p-4">
              <div className="bg-card rounded-xl shadow-xl p-6 w-full max-w-6xl max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-primary flex items-center gap-2">
                      <svg className="w-6 h-6 text-[#00D1FF]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Review AI Payroll Suggestions
                    </h2>
                    <p className="text-sm text-secondary mt-1">
                      {bulkPayrollSuggestions.length} drivers found. Review and edit before creating payrolls.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setShowBulkSuggestionsModal(false);
                      setBulkPayrollSuggestions([]);
                      setBulkGenerateResult(null);
                    }}
                    className="text-secondary hover:text-secondary"
                  >
                    <X size={24} />
                  </button>
                </div>

                <div className="space-y-4 max-h-[calc(90vh-200px)] overflow-y-auto">
                  {bulkPayrollSuggestions.map((suggestion: any, index: number) => (
                    <div key={index} className="border border-theme rounded-lg p-4 bg-card">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="text-lg font-semibold text-primary">{suggestion.driverName}</h3>
                          <p className="text-sm text-secondary">{suggestion.driverEmail || ''} • {suggestion.totalTrips} trips • {suggestion.totalMiles?.toFixed(0) || 0} miles</p>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-secondary">Total Salary</div>
                          <div className="text-xl font-bold text-green-600">${(suggestion.totalSalary || 0).toFixed(2)}</div>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-4 mb-4">
                        <div>
                          <label className="block text-xs font-medium text-primary mb-1">Base Salary ($)</label>
                          <input
                            type="number"
                            value={suggestion.baseSalary || 0}
                            onChange={(e) => updateBulkSuggestion(index, 'baseSalary', e.target.value)}
                            step="0.01"
                            className="w-full px-2 py-1 text-sm border border-theme rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-primary mb-1">Bonus ($)</label>
                          <input
                            type="number"
                            value={suggestion.bonus || 0}
                            onChange={(e) => updateBulkSuggestion(index, 'bonus', e.target.value)}
                            step="0.01"
                            className="w-full px-2 py-1 text-sm border border-theme rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-primary mb-1">Deductions ($)</label>
                          <input
                            type="number"
                            value={suggestion.deductions || 0}
                            onChange={(e) => updateBulkSuggestion(index, 'deductions', e.target.value)}
                            step="0.01"
                            className="w-full px-2 py-1 text-sm border border-theme rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </div>
                      </div>

                      <div className="mb-4">
                        <label className="block text-xs font-medium text-primary mb-1">Country</label>
                        <select
                          value={suggestion.country || 'USA'}
                          onChange={(e) => updateBulkSuggestion(index, 'country', e.target.value)}
                          className="w-full px-2 py-1 text-sm border border-theme rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                          <option value="USA">United States</option>
                          <option value="Canada">Canada</option>
                        </select>
                      </div>

                      {suggestion.country === 'Canada' ? (
                        <div className="grid grid-cols-5 gap-2">
                          <div>
                            <label className="block text-xs font-medium text-primary mb-1">Federal Tax ($)</label>
                            <input
                              type="number"
                              value={suggestion.federalIncomeTaxCA || 0}
                              onChange={(e) => updateBulkSuggestion(index, 'federalIncomeTaxCA', e.target.value)}
                              step="0.01"
                              className="w-full px-2 py-1 text-xs border border-theme rounded"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-primary mb-1">Provincial Tax ($)</label>
                            <input
                              type="number"
                              value={suggestion.provincialIncomeTaxCA || 0}
                              onChange={(e) => updateBulkSuggestion(index, 'provincialIncomeTaxCA', e.target.value)}
                              step="0.01"
                              className="w-full px-2 py-1 text-xs border border-theme rounded"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-primary mb-1">CPP ($)</label>
                            <input
                              type="number"
                              value={suggestion.cpp || 0}
                              onChange={(e) => updateBulkSuggestion(index, 'cpp', e.target.value)}
                              step="0.01"
                              className="w-full px-2 py-1 text-xs border border-theme rounded"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-primary mb-1">EI ($)</label>
                            <input
                              type="number"
                              value={suggestion.ei || 0}
                              onChange={(e) => updateBulkSuggestion(index, 'ei', e.target.value)}
                              step="0.01"
                              className="w-full px-2 py-1 text-xs border border-theme rounded"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-primary mb-1">Health Tax ($)</label>
                            <input
                              type="number"
                              value={suggestion.provincialHealthTaxCA || 0}
                              onChange={(e) => updateBulkSuggestion(index, 'provincialHealthTaxCA', e.target.value)}
                              step="0.01"
                              className="w-full px-2 py-1 text-xs border border-theme rounded"
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-6 gap-2">
                          <div>
                            <label className="block text-xs font-medium text-primary mb-1">Federal Tax ($)</label>
                            <input
                              type="number"
                              value={suggestion.federalIncomeTaxUS || 0}
                              onChange={(e) => updateBulkSuggestion(index, 'federalIncomeTaxUS', e.target.value)}
                              step="0.01"
                              className="w-full px-2 py-1 text-xs border border-theme rounded"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-primary mb-1">State Tax ($)</label>
                            <input
                              type="number"
                              value={suggestion.stateIncomeTaxUS || 0}
                              onChange={(e) => updateBulkSuggestion(index, 'stateIncomeTaxUS', e.target.value)}
                              step="0.01"
                              className="w-full px-2 py-1 text-xs border border-theme rounded"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-primary mb-1">Social Security ($)</label>
                            <input
                              type="number"
                              value={suggestion.socialSecurityTax || 0}
                              onChange={(e) => updateBulkSuggestion(index, 'socialSecurityTax', e.target.value)}
                              step="0.01"
                              className="w-full px-2 py-1 text-xs border border-theme rounded"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-primary mb-1">Medicare ($)</label>
                            <input
                              type="number"
                              value={suggestion.medicareTax || 0}
                              onChange={(e) => updateBulkSuggestion(index, 'medicareTax', e.target.value)}
                              step="0.01"
                              className="w-full px-2 py-1 text-xs border border-theme rounded"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-primary mb-1">SDI ($)</label>
                            <input
                              type="number"
                              value={suggestion.stateDisabilityInsurance || 0}
                              onChange={(e) => updateBulkSuggestion(index, 'stateDisabilityInsurance', e.target.value)}
                              step="0.01"
                              className="w-full px-2 py-1 text-xs border border-theme rounded"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-primary mb-1">Local Tax ($)</label>
                            <input
                              type="number"
                              value={suggestion.localTax || 0}
                              onChange={(e) => updateBulkSuggestion(index, 'localTax', e.target.value)}
                              step="0.01"
                              className="w-full px-2 py-1 text-xs border border-theme rounded"
                            />
                          </div>
                        </div>
                      )}

                      {/* Display Additions and Deductions (same as manual payroll) */}
                      {(suggestion.additions && suggestion.additions.length > 0) || (suggestion.deductionsDetails && suggestion.deductionsDetails.length > 0) ? (
                        <div className="bg-card border border-theme rounded-lg overflow-hidden mt-4">
                          <div className="bg-card px-4 py-3 border-b border-theme">
                            <h5 className="text-sm font-medium text-primary">Driver Additions & Deductions</h5>
                            <p className="text-xs text-secondary mt-1">These are automatically included in the payroll calculation</p>
                          </div>
                          <div className="p-4 space-y-4">
                            {suggestion.additions && suggestion.additions.length > 0 && (
                              <div>
                                <h6 className="text-sm font-semibold text-green-700 mb-2 flex items-center gap-2">
                                  <TrendingUp size={16} />
                                  Additions ({suggestion.additions.length})
                                </h6>
                                <div className="space-y-2">
                                  {suggestion.additions.map((addition: any) => (
                                    <div key={addition._id} className="bg-green-50 p-3 rounded-lg border border-green-200">
                                      <div className="flex justify-between items-start gap-4">
                                        <div className="flex-1">
                                          <p className="text-sm font-medium text-primary">{addition.name || addition.description || 'Addition'}</p>
                                          <p className="text-xs text-secondary mt-1">
                                            {addition.recurrence} • Base: ${addition.amount?.toFixed(2) || '0.00'}
                                            {addition.startDate && (
                                              <span> • From {new Date(addition.startDate).toLocaleDateString()}</span>
                                            )}
                                            {addition.endDate && (
                                              <span> • Until {new Date(addition.endDate).toLocaleDateString()}</span>
                                            )}
                                          </p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <span className="text-xs text-secondary">Amount:</span>
                                          <input
                                            type="number"
                                            value={addition.calculatedAmount || addition.amount || 0}
                                            onChange={(e) => updateBulkSuggestionAddition(index, addition._id, e.target.value)}
                                            step="0.01"
                                            min="0"
                                            className="w-24 px-2 py-1 text-sm border border-green-300 rounded focus:outline-none focus:ring-1 focus:ring-green-500 bg-card"
                                          />
                                          <span className="text-sm font-semibold text-green-700">+${(addition.calculatedAmount || addition.amount || 0).toFixed(2)}</span>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                            {suggestion.deductionsDetails && suggestion.deductionsDetails.length > 0 && (
                              <div>
                                <h6 className="text-sm font-semibold text-red-700 mb-2 flex items-center gap-2">
                                  <TrendingUp size={16} className="rotate-180" />
                                  Deductions ({suggestion.deductionsDetails.length})
                                </h6>
                                <div className="space-y-2">
                                  {suggestion.deductionsDetails.map((deduction: any) => (
                                    <div key={deduction._id} className="bg-card p-3 rounded-lg border border-red-200">
                                      <div className="flex justify-between items-start gap-4">
                                        <div className="flex-1">
                                          <p className="text-sm font-medium text-primary">{deduction.name || deduction.description || 'Deduction'}</p>
                                          <p className="text-xs text-secondary mt-1">
                                            {deduction.recurrence} • Base: ${deduction.amount?.toFixed(2) || '0.00'}
                                            {deduction.startDate && (
                                              <span> • From {new Date(deduction.startDate).toLocaleDateString()}</span>
                                            )}
                                            {deduction.endDate && (
                                              <span> • Until {new Date(deduction.endDate).toLocaleDateString()}</span>
                                            )}
                                          </p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <span className="text-xs text-secondary">Amount:</span>
                                          <input
                                            type="number"
                                            value={deduction.calculatedAmount || deduction.amount || 0}
                                            onChange={(e) => updateBulkSuggestionDeduction(index, deduction._id, e.target.value)}
                                            step="0.01"
                                            min="0"
                                            className="w-24 px-2 py-1 text-sm border border-red-300 rounded focus:outline-none focus:ring-1 focus:ring-red-500 bg-card"
                                          />
                                          <span className="text-sm font-semibold text-red-700">-${(deduction.calculatedAmount || deduction.amount || 0).toFixed(2)}</span>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      ) : null}

                      {/* Display Trips */}
                      {suggestion.trips && suggestion.trips.length > 0 && (
                        <div className="bg-card border border-theme rounded-lg overflow-hidden mt-4">
                          <div className="bg-card px-4 py-3 border-b border-theme">
                            <h5 className="text-sm font-medium text-primary">Completed Trips ({suggestion.trips.length})</h5>
                          </div>
                          <div className="overflow-x-auto max-h-96">
                            <table className="w-full">
                              <thead className="bg-card sticky top-0">
                                <tr>
                                  <th className="px-3 py-2 text-left text-xs font-medium text-secondary uppercase">Trip #</th>
                                  <th className="px-3 py-2 text-left text-xs font-medium text-secondary uppercase">Route</th>
                                  <th className="px-3 py-2 text-left text-xs font-medium text-secondary uppercase">Role</th>
                                  <th className="px-3 py-2 text-left text-xs font-medium text-secondary uppercase">Completed</th>
                                  <th className="px-3 py-2 text-left text-xs font-medium text-secondary uppercase">Truck</th>
                                  <th className="px-3 py-2 text-left text-xs font-medium text-secondary uppercase">Miles</th>
                                  <th className="px-3 py-2 text-left text-xs font-medium text-secondary uppercase">Rate</th>
                                  <th className="px-3 py-2 text-left text-xs font-medium text-secondary uppercase">Earnings</th>
                                </tr>
                              </thead>
                              <tbody className="divide-theme  divide-white/5">
                                {suggestion.trips.map((trip: any) => (
                                  <tr key={trip._id} className="hover:bg-[rgba(255,255,255,0.03)]">
                                    <td className="px-3 py-2 text-sm font-medium text-primary">
                                      {trip.tripNumber || trip.orderNumber || trip._id?.slice(-6).toUpperCase()}
                                    </td>
                                    <td className="px-3 py-2 text-sm text-secondary">
                                      <div className="flex items-center gap-1">
                                        <MapPin size={14} className="text-secondary" />
                                        <span>
                                          {(() => {
                                            if (trip.startLocation?.place && trip.startLocation.place !== 'Unknown') {
                                              return trip.startLocation.place;
                                            }
                                            if (trip.pickupLocation?.place) {
                                              return trip.pickupLocation.place;
                                            }
                                            return 'Unknown';
                                          })()}
                                        </span>
                                        <span className="text-secondary">→</span>
                                        <span>
                                          {(() => {
                                            if (trip.endLocation?.place && trip.endLocation.place !== 'Unknown') {
                                              return trip.endLocation.place;
                                            }
                                            if (trip.deliveryLocation?.place) {
                                              return trip.deliveryLocation.place;
                                            }
                                            return 'Unknown';
                                          })()}
                                        </span>
                                      </div>
                                    </td>
                                    <td className="px-3 py-2 text-sm">
                                      {trip.driverRole === 'coDriver' ? (
                                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-[var(--accent-blue)]/20 text-[var(--accent-blue)]">
                                          Co-Driver
                                        </span>
                                      ) : (
                                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-[var(--accent-green)]/20 text-[var(--accent-green)]">
                                          Driver
                                        </span>
                                      )}
                                      {trip.coDriver && trip.driverRole === 'driver' && (
                                        <div className="text-xs text-secondary mt-1">
                                          Co: {trip.coDriver.name}
                                        </div>
                                      )}
                                      {trip.driver && trip.driverRole === 'coDriver' && (
                                        <div className="text-xs text-secondary mt-1">
                                          Driver: {trip.driver.name}
                                        </div>
                                      )}
                                    </td>
                                    <td className="px-3 py-2 text-sm text-secondary">
                                      {trip.actualEndDate ? new Date(trip.actualEndDate).toLocaleDateString() : (trip.deliveryDate ? new Date(trip.deliveryDate).toLocaleDateString() : (trip.completedDate ? new Date(trip.completedDate).toLocaleDateString() : '-'))}
                                    </td>
                                    <td className="px-3 py-2 text-sm text-secondary">
                                      {trip.truck?.plateNumber || trip.truck?.licensePlate || trip.truck?.internalId || 'N/A'}
                                    </td>
                                    <td className="px-3 py-2 text-sm font-medium text-primary">
                                      {(() => {
                                        const miles = typeof trip.distanceInMiles === 'string' ? parseFloat(trip.distanceInMiles) : (trip.distanceInMiles || 0);
                                        return miles || 0;
                                      })()}
                                    </td>
                                    <td className="px-3 py-2 text-sm text-secondary">
                                      <div className="flex items-center gap-2">
                                        <span>${trip.baseRate || 0}/mi</span>
                                        {trip.rateType && (
                                          <span className={`px-2 py-0.5 text-xs font-medium rounded ${trip.rateType === 'TEAM'
                                            ? 'bg-blue-100 text-blue-800'
                                            : trip.rateType === 'EMPTY'
                                              ? 'bg-yellow-100 text-yellow-800'
                                              : trip.rateType === 'EMPTY-TEAM'
                                                ? 'bg-orange-100 text-orange-800'
                                                : 'bg-card text-primary'
                                            }`}>
                                            {trip.rateTypeLabel || trip.rateType}
                                          </span>
                                        )}
                                      </div>
                                    </td>
                                    <td className="px-3 py-2 text-sm font-bold text-green-600">
                                      ${(() => {
                                        const earnings = typeof trip.earnings === 'string' ? parseFloat(trip.earnings) : (typeof trip.earnings === 'number' ? trip.earnings : 0);
                                        return earnings.toFixed(2);
                                      })()}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                              <tfoot className="bg-green-50 sticky bottom-0">
                                <tr>
                                  <td colSpan={5} className="px-3 py-3 text-sm font-medium text-primary text-right">
                                    Selected Totals:
                                  </td>
                                  <td className="px-3 py-3 text-sm font-bold text-primary">
                                    {(() => {
                                      const totalMiles = suggestion.trips?.reduce((sum: number, trip: any) => {
                                        const miles = typeof trip.distanceInMiles === 'string' ? parseFloat(trip.distanceInMiles) : (trip.distanceInMiles || 0);
                                        return sum + miles;
                                      }, 0) || 0;
                                      return totalMiles.toLocaleString();
                                    })()} mi
                                  </td>
                                  <td className="px-3 py-3 text-sm text-secondary">-</td>
                                  <td className="px-3 py-3 text-sm font-bold text-green-600">
                                    ${(() => {
                                      const totalEarnings = suggestion.trips?.reduce((sum: number, trip: any) => {
                                        const earnings = typeof trip.earnings === 'string' ? parseFloat(trip.earnings) : (typeof trip.earnings === 'number' ? trip.earnings : 0);
                                        return sum + earnings;
                                      }, 0) || 0;
                                      return totalEarnings.toFixed(2);
                                    })()}
                                  </td>
                                </tr>
                              </tfoot>
                            </table>
                          </div>
                        </div>
                      )}

                      {/* Payroll Summary (same as manual payroll) */}
                      {suggestion.totalTrips > 0 && (() => {
                        const tripsEarnings = suggestion.baseSalary || 0;
                        const manualBonus = parseFloat(suggestion.bonus || '0'); // Bonus is separate from additions
                        // Recalculate totals from edited additions/deductions
                        const totalAdditions = suggestion.additions && Array.isArray(suggestion.additions)
                          ? suggestion.additions.reduce((sum: number, a: any) => sum + (parseFloat(a.calculatedAmount || a.amount || 0)), 0)
                          : (suggestion.totalAdditions || 0);
                        const totalDeductions = suggestion.deductionsDetails && Array.isArray(suggestion.deductionsDetails)
                          ? suggestion.deductionsDetails.reduce((sum: number, d: any) => sum + (parseFloat(d.calculatedAmount || d.amount || 0)), 0)
                          : (suggestion.totalDeductions || suggestion.deductions || 0);

                        // Gross Earnings = Trip Earnings + Manual Bonus + Calculated Additions
                        const grossEarnings = tripsEarnings + manualBonus + totalAdditions;

                        // Calculate taxes
                        let totalTax = 0;
                        if (suggestion.country === 'Canada') {
                          totalTax =
                            parseFloat(suggestion.federalIncomeTaxCA || '0') +
                            parseFloat(suggestion.provincialIncomeTaxCA || '0') +
                            parseFloat(suggestion.cpp || '0') +
                            parseFloat(suggestion.ei || '0') +
                            parseFloat(suggestion.provincialHealthTaxCA || '0');
                        } else {
                          totalTax =
                            parseFloat(suggestion.federalIncomeTaxUS || '0') +
                            parseFloat(suggestion.stateIncomeTaxUS || '0') +
                            parseFloat(suggestion.socialSecurityTax || '0') +
                            parseFloat(suggestion.medicareTax || '0') +
                            parseFloat(suggestion.stateDisabilityInsurance || '0') +
                            parseFloat(suggestion.localTax || '0');
                        }

                        // Net Pay = Gross Earnings - Total Deductions - Taxes
                        const netPay = grossEarnings - totalDeductions - totalTax;

                        return (
                          <div className="bg-gradient-to-r from-green-600 to-green-700 text-primary p-6 rounded-lg mt-4">
                            <div className="space-y-2">
                              <div className="flex justify-between items-center">
                                <p className="text-sm text-green-100">Gross Earnings</p>
                                <p className="text-lg font-semibold">
                                  ${grossEarnings.toFixed(2)}
                                </p>
                              </div>
                              {(totalAdditions > 0 || manualBonus > 0) && (
                                <div className="pl-4 text-xs text-green-200">
                                  {tripsEarnings > 0 && (
                                    <div className="flex justify-between">
                                      <span>Trips Earnings:</span>
                                      <span>${tripsEarnings.toFixed(2)}</span>
                                    </div>
                                  )}
                                  {manualBonus > 0 && (
                                    <div className="flex justify-between">
                                      <span>Manual Bonus:</span>
                                      <span>+${manualBonus.toFixed(2)}</span>
                                    </div>
                                  )}
                                  {totalAdditions > 0 && (
                                    <div className="flex justify-between">
                                      <span>Additions ({suggestion.additions?.length || 0}):</span>
                                      <span>+${totalAdditions.toFixed(2)}</span>
                                    </div>
                                  )}
                                </div>
                              )}
                              <div className="flex justify-between items-center text-sm">
                                <p className="text-green-100">Deductions</p>
                                <p className="text-red-200">-${totalDeductions.toFixed(2)}</p>
                              </div>
                              {totalDeductions > 0 && (
                                <div className="pl-4 text-xs text-red-200">
                                  <div className="flex justify-between">
                                    <span>Deductions ({suggestion.deductionsDetails?.length || 0}):</span>
                                    <span>-${totalDeductions.toFixed(2)}</span>
                                  </div>
                                </div>
                              )}
                              <div className="flex justify-between items-center text-sm">
                                <p className="text-green-100">Taxes</p>
                                <p className="text-red-200">-${totalTax.toFixed(2)}</p>
                              </div>
                              <div className="flex justify-between items-center pt-2 border-t border-green-500">
                                <p className="text-sm font-medium text-green-100">Net Pay</p>
                                <p className="text-xl font-bold">${netPay.toFixed(2)}</p>
                              </div>
                              <div className="text-xs text-green-200 mt-2">
                                Based on {suggestion.totalTrips || 0} trips {suggestion.totalMiles ? `${suggestion.totalMiles.toFixed(2)} miles` : ''}
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  ))}
                </div>

                <div className="flex justify-end gap-3 pt-4 mt-6 border-t border-theme">
                  <button
                    onClick={() => {
                      setShowBulkSuggestionsModal(false);
                      setBulkPayrollSuggestions([]);
                      setBulkGenerateResult(null);
                    }}
                    className="px-4 py-2 border border-theme rounded-lg text-primary hover:bg-[rgba(255,255,255,0.03)]"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleBulkCreatePayrolls}
                    disabled={loadingBulkAI}
                    className="px-6 py-2 bg-green-600 hover:bg-green-700 text-primary rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {loadingBulkAI ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Creating...
                      </>
                    ) : (
                      <>
                        <CheckCircle size={18} />
                        Create All Payrolls ({bulkPayrollSuggestions.length})
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )
        }
      </div >
    </div >
  );
};

export default DriverPayrollManagement;