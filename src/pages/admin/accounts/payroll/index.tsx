import React, { useState, useEffect, useRef } from 'react';
import { Plus, Search, DollarSign, Users, Calendar, TrendingUp, X, AlertCircle, CheckCircle, Edit2, Trash2, Eye, Building2, Sparkles, Clock, CalendarCheck, FileText, Download } from 'lucide-react';
import { getEmployees, createPayroll, listPayrolls, updatePayroll, deletePayroll, deleteAllPayrolls, generateAutomatedPayroll, bulkAIGenerateAllPayrolls, getPaystubByPayrollId } from "../../../../axios/api/account.payroll";
import { listAttendance } from "../../../../axios/api/attendance";
import { getDeductionAdditions } from "../../../../axios/api/account.settlement";
import jsPDF from 'jspdf';
import DocLogo from '../../../../assets/doclogo.png';

interface Employee {
    _id: string;
    name: string;
    role: string;
    details?: {
        mileRate?: number;
        hourlyRate?: number;
        baseSalary?: number;
        [key: string]: any;
    };
}






interface Payroll {
    _id: string;
    userId: {
        _id: string;
        name: string;
        role: string;
        internalId?: string;
    };
    baseSalary: number;
    bonus: number;
    deductions: number;
    totalSalary: number;
    payDate: string;
    startDate: string;
    endDate: string;
    createdAt: string;
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
    // Driver-specific fields
    trips?: Array<{
        _id: string;
        tripNumber?: string;
        startLocation?: {
            place?: string;
            latitude?: string;
            longitude?: string;
        };
        endLocation?: {
            place?: string;
            latitude?: string;
            longitude?: string;
        };
        actualEndDate?: string;
        distance?: number;
        distanceInMiles?: number;
        earnings?: string;
    }>;
    loads?: Array<{
        _id: string;
        details?: {
            internalId?: string;
        };
        route?: {
            multipleDropOffs?: boolean;
            selectPickup?: {
                place?: string;
                latitude?: string;
                longitude?: string;
            };
            selectDropOff?: {
                place?: string;
                latitude?: string;
                longitude?: string;
            };
            wayPoints?: Array<{
                address: {
                    place: string;
                    latitude: string;
                    longitude: string;
                };
            }>;
        };
        assignedAt?: string;
        startedAt?: string;
        completedAt?: string;
    }>;
    totalMiles?: number;
    ratePerMile?: number;
    // Employee attendance fields (optional)
    totalHours?: number;
    regularHours?: number;
    overtimeHours?: number;
    hourlyRate?: number;
    presentDays?: number;
    absentDays?: number;
}

interface PayrollFormData {
    userId: string;
    baseSalary: string;
    bonus: string;
    deductions: string;
    payDate: string;
    startDate: string;
    endDate: string;
    // Driver-specific fields
    ratePerMile?: string;
    totalMiles?: string;
    tripEarnings?: string;
    // Tax fields - Canada
    country: string;
    // Canada taxes
    federalIncomeTaxCA?: string;
    provincialIncomeTaxCA?: string;
    cpp?: string; // Canada Pension Plan
    ei?: string; // Employment Insurance
    provincialHealthTaxCA?: string;
    // USA taxes
    federalIncomeTaxUS?: string;
    stateIncomeTaxUS?: string;
    socialSecurityTax?: string; // FICA
    medicareTax?: string;
    stateDisabilityInsurance?: string; // SDI
    localTax?: string;
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
    };
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

interface Notification {
    type: 'success' | 'error';
    message: string;
}

const PayrollManagement = () => {
    const topScrollRef = useRef<HTMLDivElement>(null);
    const bottomScrollRef = useRef<HTMLDivElement>(null);

    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showDeleteAllModal, setShowDeleteAllModal] = useState(false);
    const [showViewModal, setShowViewModal] = useState(false);
    const [showPaystubModal, setShowPaystubModal] = useState(false);
    const [selectedPaystub, setSelectedPaystub] = useState<Paystub | null>(null);
    const [loadingPaystub, setLoadingPaystub] = useState(false);
    const [showAutoGenerateModal, setShowAutoGenerateModal] = useState(false);
    const [autoGenerateData, setAutoGenerateData] = useState<any>(null);
    const [generatingAutoPayroll, setGeneratingAutoPayroll] = useState(false);

    // Bulk AI generation state
    const [showBulkAIModal, setShowBulkAIModal] = useState(false);
    const [bulkAIPayrolls, setBulkAIPayrolls] = useState<any[]>([]);
    const [generatingBulkAI, setGeneratingBulkAI] = useState(false);
    const [bulkAIDateRange, setBulkAIDateRange] = useState({
        startDate: '',
        endDate: '',
        payDate: new Date().toISOString().split('T')[0]
    });
    const [selectedPayroll, setSelectedPayroll] = useState<Payroll | null>(null);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [payrollData, setPayrollData] = useState<Payroll[]>([]);
    const [loading, setLoading] = useState(false);
    const [notification, setNotification] = useState<Notification | null>(null);
    const [emptyStateMessage, setEmptyStateMessage] = useState<string | null>(null);

    const [formData, setFormData] = useState<PayrollFormData>({
        userId: '',
        baseSalary: '',
        bonus: '0',
        deductions: '0',
        payDate: '',
        startDate: '',
        endDate: '',
        ratePerMile: '0.50',
        totalMiles: '0',
        tripEarnings: '0',
        country: 'USA', // Default to USA
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

    // Attendance state
    const [attendanceSummary, setAttendanceSummary] = useState<{
        presentDays: number;
        absentDays: number;
        leaveDays: number;
        totalHours: number;
        regularHours: number;
    } | null>(null);
    const [loadingAttendance, setLoadingAttendance] = useState(false);

    // Employee additions and deductions state
    const [employeeAdditions, setEmployeeAdditions] = useState<any[]>([]);
    const [employeeDeductions, setEmployeeDeductions] = useState<any[]>([]);
    const [loadingAdditionsDeductions, setLoadingAdditionsDeductions] = useState<boolean>(false);
    // Track edited amounts for additions and deductions
    const [editedAdditionAmounts, setEditedAdditionAmounts] = useState<Record<string, number>>({});
    const [editedDeductionAmounts, setEditedDeductionAmounts] = useState<Record<string, number>>({});

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

    const fetchEmployees = async () => {
        try {
            const userInfo: any = getLocalUserInfo();

            // Handle different userInfo structures (userData.company or direct company)
            const userRole = userInfo?.role || userInfo?.userData?.role;
            const userCompany = userInfo?.company || userInfo?.userData?.company;
            const isSuperadmin = userRole === 'superadmin';
            const isHR = userRole === 'hr';
            const hasCompany = Boolean(userCompany);

            // Allow HR and dispatchers to call API even if company is not visible in localStorage
            // The backend will handle company filtering based on the authenticated user
            if (!isSuperadmin && !isHR && !hasCompany) {
                setEmployees([]);
                return;
            }

            const response = await getEmployees();
            if (response?.success) {
                // Filter out superadmin, admin, driver, reporter, customer, contact, salesperson, and operator roles
                const restrictedRoles = ['superadmin', 'admin', 'driver', 'reporter', 'customer', 'contact', 'salesperson', 'operator'];
                const filteredEmployees = (response.data || []).filter((emp: Employee) =>
                    !restrictedRoles.includes(emp.role?.toLowerCase())
                );
                setEmployees(filteredEmployees);
            } else if (response?.message) {
                showNotification('error', response.message);
            }
        } catch (error) {
            console.error('Error fetching employees:', error);
        }
    };

    const fetchPayrolls = async (searchQuery?: string) => {
        setLoading(true);
        try {
            const userInfo: any = getLocalUserInfo();

            // Handle different userInfo structures (userData.company or direct company)
            const userRole = userInfo?.role || userInfo?.userData?.role;
            const userCompany = userInfo?.company || userInfo?.userData?.company;
            const isSuperadmin = userRole === 'superadmin';
            const isHR = userRole === 'hr';
            const hasCompany = Boolean(userCompany);

            // Allow HR and dispatchers to call API even if company is not visible in localStorage
            // The backend will handle company filtering based on the authenticated user
            if (!isSuperadmin && !isHR && !hasCompany) {
                setPayrollData([]);
                setEmptyStateMessage(null);
                return;
            }

            // Use provided search query or current searchTerm
            const searchValue = searchQuery !== undefined ? searchQuery : searchTerm;
            const searchParam = searchValue ? `?search=${encodeURIComponent(searchValue)}` : '';
            const response = await listPayrolls(searchParam);
            if (response?.success) {
                const data = response.data || [];
                // Filter out any payrolls for restricted roles (double check)
                const restrictedRoles = ['superadmin', 'admin', 'driver', 'reporter', 'customer', 'contact'];
                const filteredData = data.filter((payroll: Payroll) =>
                    payroll.userId && !restrictedRoles.includes(payroll.userId.role?.toLowerCase())
                );
                setPayrollData(filteredData);
                if (response.message && data.length === 0) {
                    setEmptyStateMessage(response.message);
                } else {
                    setEmptyStateMessage(null);
                }
            } else {
                const message = response?.message || 'Failed to fetch payrolls';
                setPayrollData([]);
                setEmptyStateMessage(message);
                showNotification('error', message);
            }
        } catch (error) {
            console.error('Error fetching payrolls:', error);
            setPayrollData([]);
            const message = 'Error fetching payrolls';
            setEmptyStateMessage(message);
            showNotification('error', message);
        } finally {
            setLoading(false);
        }
    };


    useEffect(() => {
        fetchEmployees();
        fetchPayrolls();
    }, []);

    // Debounced search effect
    useEffect(() => {
        const timeoutId = setTimeout(() => {
            fetchPayrolls(searchTerm);
        }, 500);

        return () => clearTimeout(timeoutId);
    }, [searchTerm]);

    // Fetch additions and deductions when employee or date range changes
    useEffect(() => {
        if (formData.userId && formData.startDate && formData.endDate) {
            fetchEmployeeAdditionsDeductions(formData.userId);
        } else if (!formData.userId) {
            setEmployeeAdditions([]);
            setEmployeeDeductions([]);
        }
    }, [formData.userId, formData.startDate, formData.endDate]);

    // Synchronize scrollbars for payroll table
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

    // Fetch employee additions and deductions
    const fetchEmployeeAdditionsDeductions = async (employeeId: string) => {
        if (!employeeId) {
            setEmployeeAdditions([]);
            setEmployeeDeductions([]);
            return;
        }

        setLoadingAdditionsDeductions(true);
        try {
            const [additionsRes, deductionsRes] = await Promise.all([
                getDeductionAdditions({ assignedTo: employeeId, type: 'Addition', isActive: true }),
                getDeductionAdditions({ assignedTo: employeeId, type: 'Deduction', isActive: true })
            ]);

            if (additionsRes?.success && Array.isArray(additionsRes.data)) {
                setEmployeeAdditions(additionsRes.data);
            } else {
                setEmployeeAdditions([]);
            }

            if (deductionsRes?.success && Array.isArray(deductionsRes.data)) {
                setEmployeeDeductions(deductionsRes.data);
            } else {
                setEmployeeDeductions([]);
            }

            // Reset edited amounts when fetching new employee data
            setEditedAdditionAmounts({});
            setEditedDeductionAmounts({});
        } catch (error: any) {
            console.error('Error fetching employee additions/deductions:', error);
            setEmployeeAdditions([]);
            setEmployeeDeductions([]);
        } finally {
            setLoadingAdditionsDeductions(false);
        }
    };

    // Calculate additions and deductions for the payroll period
    const calculateAdditionsDeductions = () => {
        if (!formData.startDate || !formData.endDate) {
            return { totalAdditions: 0, totalDeductions: 0 };
        }

        const startDateObj = new Date(formData.startDate);
        const endDateObj = new Date(formData.endDate);
        endDateObj.setHours(23, 59, 59, 999);

        // Calculate applicable additions
        let totalAdditions = 0;
        for (const addition of employeeAdditions) {
            if (!addition.isActive) continue;

            const addStartDate = addition.startDate ? new Date(addition.startDate) : null;
            const addEndDate = addition.endDate ? new Date(addition.endDate) : null;

            // Check if addition period overlaps with payroll period
            const additionStartsBeforePayrollEnds = !addStartDate || addStartDate <= endDateObj;
            const additionEndsAfterPayrollStarts = !addEndDate || addEndDate >= startDateObj;

            if (!additionStartsBeforePayrollEnds || !additionEndsAfterPayrollStarts) {
                continue;
            }

            // Calculate amount based on recurrence (use edited amount if available)
            let calculatedAmount = editedAdditionAmounts[addition._id];
            if (calculatedAmount === undefined) {
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
                calculatedAmount = amount;
            }

            totalAdditions += calculatedAmount;
        }

        // Calculate applicable deductions
        let totalDeductions = 0;
        for (const deduction of employeeDeductions) {
            if (!deduction.isActive) continue;

            const dedStartDate = deduction.startDate ? new Date(deduction.startDate) : null;
            const dedEndDate = deduction.endDate ? new Date(deduction.endDate) : null;

            // Check if deduction period overlaps with payroll period
            let shouldInclude = false;

            if (deduction.recurrence === 'Monthly') {
                if (!dedStartDate) {
                    shouldInclude = true;
                } else {
                    const payrollStartYear = startDateObj.getFullYear();
                    const dedStartYear = dedStartDate.getFullYear();
                    if (payrollStartYear >= dedStartYear) {
                        shouldInclude = true;
                    }
                }
            } else {
                const deductionStartsBeforePayrollEnds = !dedStartDate || dedStartDate <= endDateObj;
                const deductionEndsAfterPayrollStarts = !dedEndDate || dedEndDate >= startDateObj;
                shouldInclude = deductionStartsBeforePayrollEnds && deductionEndsAfterPayrollStarts;
            }

            if (!shouldInclude) {
                continue;
            }

            // Calculate amount based on recurrence (use edited amount if available)
            let calculatedAmount = editedDeductionAmounts[deduction._id];
            if (calculatedAmount === undefined) {
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
                    const months = Math.ceil((effectiveEndDate.getTime() - effectiveStartDate.getTime()) / (30 * 24 * 60 * 60 * 1000));
                    amount = amount * Math.max(1, months);
                }
                calculatedAmount = amount;
            }

            totalDeductions += calculatedAmount;
        }

        return { totalAdditions, totalDeductions };
    };

    // Fetch attendance data for selected employee and date range
    const fetchAttendance = async (employeeId: string, startDate: string, endDate: string) => {
        if (!employeeId || !startDate || !endDate) {
            setAttendanceSummary(null);
            return;
        }

        setLoadingAttendance(true);
        try {
            const start = new Date(startDate);
            const end = new Date(endDate);
            const month = start.getMonth() + 1;
            const year = start.getFullYear();

            const response = await listAttendance({
                employee: employeeId,
                month,
                year
            });

            if (response?.success && response.data) {
                // Filter attendance records within the date range
                const filteredData = response.data.filter((record: any) => {
                    const recordDate = new Date(record.date);
                    return recordDate >= start && recordDate <= end;
                });

                // Calculate summary - treat late as present, no overtime calculation
                const summary = {
                    presentDays: 0,
                    absentDays: 0,
                    leaveDays: 0,
                    totalHours: 0,
                    regularHours: 0
                };

                filteredData.forEach((record: any) => {
                    if (record.status === 'present' || record.status === 'late') {
                        // Treat late as present
                        summary.presentDays++;
                        const hours = record.totalHours || 0;
                        summary.totalHours += hours;
                        summary.regularHours += hours; // All hours are regular, no overtime
                    } else if (record.status === 'absent') {
                        summary.absentDays++;
                    } else if (record.status === 'leave') {
                        summary.leaveDays++;
                    }
                });

                setAttendanceSummary(summary);
            } else {
                setAttendanceSummary(null);
            }
        } catch (error) {
            console.error('Error fetching attendance:', error);
            setAttendanceSummary(null);
        } finally {
            setLoadingAttendance(false);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;

        if (name === 'userId') {
            // Reset form data for employee selection
            setFormData(prev => {
                const newFormData = {
                    ...prev,
                    [name]: value,
                    baseSalary: ''
                };
                // Fetch attendance if date range is also set
                if (value && prev.startDate && prev.endDate) {
                    fetchAttendance(value, prev.startDate, prev.endDate);
                }
                // Fetch additions and deductions for the selected employee
                if (value) {
                    fetchEmployeeAdditionsDeductions(value);
                } else {
                    setEmployeeAdditions([]);
                    setEmployeeDeductions([]);
                }
                return newFormData;
            });
        } else {
            setFormData(prev => {
                const newFormData = {
                    ...prev,
                    [name]: value
                };
                // Fetch attendance when date range changes and employee is selected
                if ((name === 'startDate' || name === 'endDate') && prev.userId && newFormData.startDate && newFormData.endDate) {
                    fetchAttendance(prev.userId, newFormData.startDate, newFormData.endDate);
                }
                return newFormData;
            });
        }
    };

    // Handle date range changes
    const handleDateRangeChange = (startDate: string, endDate: string) => {
        setFormData(prev => {
            const newFormData = {
                ...prev,
                startDate,
                endDate
            };
            // Fetch attendance when date range changes and employee is selected
            if (prev.userId && startDate && endDate) {
                fetchAttendance(prev.userId, startDate, endDate);
            }
            return newFormData;
        });
    };


    const handleCreate = async () => {
        if (emptyStateMessage) {
            showNotification('error', emptyStateMessage);
            return;
        }

        if (!formData.userId || formData.baseSalary === '' || formData.baseSalary === null || !formData.payDate || !formData.startDate || !formData.endDate) {
            showNotification('error', 'Please fill in all required fields');
            return;
        }

        // Validate baseSalary is a valid number
        const baseSalaryNum = parseFloat(formData.baseSalary);
        if (isNaN(baseSalaryNum) || baseSalaryNum < 0) {
            showNotification('error', 'Base salary must be a valid positive number');
            return;
        }

        setLoading(true);

        try {
            // Calculate additions and deductions using the helper function (respects edited amounts)
            const { totalAdditions, totalDeductions } = calculateAdditionsDeductions();

            // Add calculated additions to bonus (same as driver payroll)
            const calculatedBonus = parseFloat(formData.bonus) || 0;
            const finalBonus = calculatedBonus + totalAdditions;

            // Use calculated deductions from employee profile (respects edited amounts)
            const finalDeductions = totalDeductions;

            const payload: any = {
                userId: formData.userId,
                baseSalary: parseFloat(formData.baseSalary),
                bonus: finalBonus, // Bonus + edited additions
                deductions: finalDeductions, // Calculated deductions from employee profile
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

            console.log('📤 Sending payroll payload:', payload);

            const response = await createPayroll(payload);

            console.log('📥 Payroll response:', response);

            if (response?.success) {
                showNotification('success', response.message || 'Payroll created successfully!');
                setShowCreateModal(false);
                resetForm();
                fetchPayrolls();
            } else {
                const errorMsg = response?.message || response?.error || 'Failed to create payroll';
                console.error('❌ Payroll creation error:', response);
                showNotification('error', errorMsg);
            }
        } catch (error: any) {
            console.error('❌ Payroll creation exception:', error);
            const errorMsg = error?.response?.data?.message || error?.message || 'Error creating payroll';
            showNotification('error', errorMsg);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdate = async () => {
        if (!selectedPayroll) return;

        if (!formData.userId || !formData.baseSalary || !formData.payDate || !formData.startDate || !formData.endDate) {
            showNotification('error', 'Please fill in all required fields');
            return;
        }

        setLoading(true);

        try {
            // Calculate additions and deductions using the helper function (respects edited amounts)
            const { totalAdditions, totalDeductions } = calculateAdditionsDeductions();

            // Add calculated additions to bonus (same as driver payroll)
            const calculatedBonus = parseFloat(formData.bonus) || 0;
            const finalBonus = calculatedBonus + totalAdditions;

            // Use calculated deductions from employee profile (respects edited amounts)
            const finalDeductions = totalDeductions;

            const payload: any = {
                userId: formData.userId,
                baseSalary: parseFloat(formData.baseSalary),
                bonus: finalBonus, // Bonus + edited additions
                deductions: finalDeductions, // Calculated deductions from employee profile
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

            // Check if editing from bulk AI modal (has _bulkIndex property)
            const isBulkEdit = selectedPayroll && (selectedPayroll as any)._bulkIndex !== undefined;

            if (isBulkEdit) {
                // Update bulk AI payroll list directly (no API call)
                const bulkIndex = (selectedPayroll as any)._bulkIndex;
                setBulkAIPayrolls(prev => {
                    const updated = [...prev];
                    updated[bulkIndex] = {
                        ...updated[bulkIndex],
                        baseSalary: parseFloat(formData.baseSalary),
                        bonus: parseFloat(formData.bonus || '0'),
                        deductions: parseFloat(formData.deductions || '0'),
                        country: formData.country || 'USA',
                        federalIncomeTaxCA: parseFloat(formData.federalIncomeTaxCA || '0'),
                        provincialIncomeTaxCA: parseFloat(formData.provincialIncomeTaxCA || '0'),
                        cpp: parseFloat(formData.cpp || '0'),
                        ei: parseFloat(formData.ei || '0'),
                        provincialHealthTaxCA: parseFloat(formData.provincialHealthTaxCA || '0'),
                        federalIncomeTaxUS: parseFloat(formData.federalIncomeTaxUS || '0'),
                        stateIncomeTaxUS: parseFloat(formData.stateIncomeTaxUS || '0'),
                        socialSecurityTax: parseFloat(formData.socialSecurityTax || '0'),
                        medicareTax: parseFloat(formData.medicareTax || '0'),
                        stateDisabilityInsurance: parseFloat(formData.stateDisabilityInsurance || '0'),
                        localTax: parseFloat(formData.localTax || '0')
                    };

                    // Recalculate total
                    const base = updated[bulkIndex].baseSalary || 0;
                    const bonus = updated[bulkIndex].bonus || 0;
                    const deductions = updated[bulkIndex].deductions || 0;
                    const country = updated[bulkIndex].country || 'USA';
                    let totalTaxes = 0;
                    if (country === 'Canada') {
                        totalTaxes = (updated[bulkIndex].federalIncomeTaxCA || 0) +
                            (updated[bulkIndex].provincialIncomeTaxCA || 0) +
                            (updated[bulkIndex].cpp || 0) +
                            (updated[bulkIndex].ei || 0) +
                            (updated[bulkIndex].provincialHealthTaxCA || 0);
                    } else {
                        totalTaxes = (updated[bulkIndex].federalIncomeTaxUS || 0) +
                            (updated[bulkIndex].stateIncomeTaxUS || 0) +
                            (updated[bulkIndex].socialSecurityTax || 0) +
                            (updated[bulkIndex].medicareTax || 0) +
                            (updated[bulkIndex].stateDisabilityInsurance || 0) +
                            (updated[bulkIndex].localTax || 0);
                    }
                    updated[bulkIndex].totalSalary = Math.round((base + bonus - deductions - totalTaxes) * 100) / 100;

                    return updated;
                });

                showNotification('success', 'Taxes updated successfully!');
                setShowEditModal(false);
                resetForm();
                setSelectedPayroll(null);
            } else if (response?.success) {
                // Regular update for existing payroll
                showNotification('success', response.message || 'Payroll updated successfully!');
                setShowEditModal(false);
                resetForm();
                setSelectedPayroll(null);
                fetchPayrolls();
            } else {
                showNotification('error', response?.message || 'Failed to update payroll');
            }
        } catch (error) {
            showNotification('error', 'Error updating payroll');
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
                showNotification('success', response.message || 'Payroll deleted successfully!');
                setShowDeleteModal(false);
                setSelectedPayroll(null);
                fetchPayrolls();
            } else {
                showNotification('error', response?.message || 'Failed to delete payroll');
            }
        } catch (error) {
            showNotification('error', 'Error deleting payroll');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteAll = async () => {
        setLoading(true);

        try {
            const response = await deleteAllPayrolls();

            if (response?.success) {
                showNotification('success', response.message || 'All payrolls deleted successfully!');
                setShowDeleteAllModal(false);
                fetchPayrolls();
            } else {
                showNotification('error', response?.message || 'Failed to delete all payrolls');
            }
        } catch (error) {
            showNotification('error', 'Error deleting all payrolls');
        } finally {
            setLoading(false);
        }
    };

    const openViewModal = (payroll: Payroll) => {
        setSelectedPayroll(payroll);
        setShowViewModal(true);
    };

    const openPaystubModal = async (payroll: Payroll) => {
        try {
            setLoadingPaystub(true);
            setSelectedPayroll(payroll);
            const response = await getPaystubByPayrollId(payroll._id);

            if (response.success && response.data) {
                setSelectedPaystub(response.data);
                setShowPaystubModal(true);
            } else {
                showNotification('error', response?.message || 'Paystub not found for this payroll');
            }
        } catch (error) {
            console.error('Error fetching paystub:', error);
            showNotification('error', 'Failed to load paystub');
        } finally {
            setLoadingPaystub(false);
        }
    };

    const openEditModal = (payroll: Payroll) => {
        // Add null check for userId
        if (!payroll.userId || !payroll.userId._id) {
            showNotification('error', 'Invalid payroll record: missing user information');
            return;
        }

        setSelectedPayroll(payroll);
        const payDateFormatted = payroll.payDate ? payroll.payDate.split('T')[0] : '';
        const startDateFormatted = payroll.startDate ? payroll.startDate.split('T')[0] : '';
        const endDateFormatted = payroll.endDate ? payroll.endDate.split('T')[0] : '';

        setFormData({
            userId: payroll.userId._id,
            baseSalary: payroll.baseSalary.toString(),
            bonus: payroll.bonus.toString(),
            deductions: payroll.deductions.toString(),
            payDate: payDateFormatted,
            startDate: startDateFormatted,
            endDate: endDateFormatted,
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

    const openDeleteModal = (payroll: Payroll) => {
        setSelectedPayroll(payroll);
        setShowDeleteModal(true);
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
            doc.text(companyName, margin, 18);

            doc.setFontSize(9);
            doc.setFont('helvetica', 'normal');
            let companyY = 25;
            if (paystub.companyDetails?.companyAddress) {
                const addressLines = doc.splitTextToSize(paystub.companyDetails.companyAddress, 70);
                doc.text(addressLines, margin, companyY);
                companyY += addressLines.length * 4.5;
            }
            if (paystub.companyDetails?.companyPhone) {
                doc.text(`Phone: ${paystub.companyDetails.companyPhone}`, margin, companyY);
                companyY += 4.5;
            }
            if (paystub.companyDetails?.companyEmail) {
                doc.text(`Email: ${paystub.companyDetails.companyEmail}`, margin, companyY);
            }

            // Pay Stub Title (Right side) - White text on blue background
            doc.setFontSize(22);
            doc.setFont('helvetica', 'bold');
            doc.text('PAY STUB', pageWidth - margin, 18, { align: 'right' });
            doc.setFontSize(9);
            doc.setFont('helvetica', 'normal');
            doc.text('EARNINGS STATEMENT', pageWidth - margin, 25, { align: 'right' });
            if (paystub.paystubId) {
                doc.setFontSize(7);
                doc.text(`ID: ${paystub.paystubId}`, pageWidth - margin, 32, { align: 'right' });
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
            const payDate = new Date(paystub.payPeriod.payDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
            doc.text(startDate, pageWidth - margin - 3, yPos + 6, { align: 'right' });
            doc.text(endDate, pageWidth - margin - 3, yPos + 12, { align: 'right' });
            doc.text(payDate, pageWidth - margin - 3, yPos + 18, { align: 'right' });

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

            // Earnings Section
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
            doc.text('Gross Earnings:', margin + 3, yPos);
            doc.setFont('helvetica', 'bold');
            doc.text(`$${paystub.summary.grossPay.toFixed(2)}`, pageWidth - margin - 3, yPos, { align: 'right' });
            yPos += 7;

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
            baseSalary: '',
            bonus: '0',
            deductions: '0',
            payDate: '',
            startDate: '',
            endDate: '',
            ratePerMile: '0.50',
            totalMiles: '0',
            tripEarnings: '0',
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
        // Clear attendance data when form is reset
        setAttendanceSummary(null);
    };

    const handleAutoGenerate = async () => {
        if (!formData.userId || !formData.startDate || !formData.endDate) {
            showNotification('error', 'Please select employee and date range');
            return;
        }

        const startDate = new Date(formData.startDate);
        const month = startDate.getMonth() + 1;
        const year = startDate.getFullYear();

        setGeneratingAutoPayroll(true);
        try {
            const response = await generateAutomatedPayroll({
                userId: formData.userId,
                month,
                year,
                baseSalary: formData.baseSalary ? parseFloat(formData.baseSalary) : undefined
            });

            if (response?.success) {
                setAutoGenerateData(response.data);
                // Pre-fill form with AI recommendations
                setFormData(prev => ({
                    ...prev,
                    baseSalary: response.data.payroll.baseSalary.toString(),
                    bonus: response.data.payroll.bonus.toString(),
                    payDate: new Date().toISOString().split('T')[0]
                }));
                showNotification('success', 'AI-generated payroll recommendations ready! Review and create.');
            } else {
                showNotification('error', response?.message || 'Failed to generate automated payroll');
            }
        } catch (error: any) {
            showNotification('error', error?.message || 'Error generating automated payroll');
        } finally {
            setGeneratingAutoPayroll(false);
        }
    };

    const handleCreateFromAutoGenerate = async () => {
        if (!autoGenerateData) return;

        setLoading(true);
        try {
            // Calculate additions and deductions using the helper function (respects edited amounts)
            const { totalAdditions, totalDeductions } = calculateAdditionsDeductions();

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

            // Build payroll payload with calculated additions and deductions
            const baseSalary = autoGenerateData.payroll.baseSalary || 0;
            const bonus = autoGenerateData.payroll.bonus || 0;
            const grossEarnings = baseSalary + bonus + totalAdditions;
            const netPay = grossEarnings - totalDeductions - totalTax;

            const payload = {
                ...autoGenerateData.payroll,
                baseSalary,
                bonus: bonus + totalAdditions, // Include additions in bonus for backend compatibility
                deductions: totalDeductions, // Use calculated deductions from employee profile
                totalSalary: netPay,
                // Include tax fields if they exist in formData
                country: formData.country || autoGenerateData.payroll.country || 'USA',
                federalIncomeTaxCA: formData.federalIncomeTaxCA || autoGenerateData.payroll.federalIncomeTaxCA || '0',
                provincialIncomeTaxCA: formData.provincialIncomeTaxCA || autoGenerateData.payroll.provincialIncomeTaxCA || '0',
                cpp: formData.cpp || autoGenerateData.payroll.cpp || '0',
                ei: formData.ei || autoGenerateData.payroll.ei || '0',
                provincialHealthTaxCA: formData.provincialHealthTaxCA || autoGenerateData.payroll.provincialHealthTaxCA || '0',
                federalIncomeTaxUS: formData.federalIncomeTaxUS || autoGenerateData.payroll.federalIncomeTaxUS || '0',
                stateIncomeTaxUS: formData.stateIncomeTaxUS || autoGenerateData.payroll.stateIncomeTaxUS || '0',
                socialSecurityTax: formData.socialSecurityTax || autoGenerateData.payroll.socialSecurityTax || '0',
                medicareTax: formData.medicareTax || autoGenerateData.payroll.medicareTax || '0',
                stateDisabilityInsurance: formData.stateDisabilityInsurance || autoGenerateData.payroll.stateDisabilityInsurance || '0',
                localTax: formData.localTax || autoGenerateData.payroll.localTax || '0'
            };

            const response = await createPayroll(payload);
            if (response?.success) {
                showNotification('success', 'Payroll created successfully from AI recommendations!');
                setShowAutoGenerateModal(false);
                setAutoGenerateData(null);
                resetForm();
                fetchPayrolls();
            } else {
                showNotification('error', response?.message || 'Failed to create payroll');
            }
        } catch (error: any) {
            showNotification('error', error?.message || 'Error creating payroll');
        } finally {
            setLoading(false);
        }
    };

    // Bulk AI generation for all employees
    const handleBulkAIGenerate = async () => {
        if (!bulkAIDateRange.startDate || !bulkAIDateRange.endDate) {
            showNotification('error', 'Please select start date and end date');
            return;
        }

        setGeneratingBulkAI(true);
        try {
            // Ensure dates are in ISO format
            const startDate = new Date(bulkAIDateRange.startDate).toISOString();
            const endDate = new Date(bulkAIDateRange.endDate);
            endDate.setHours(23, 59, 59, 999);

            const response = await bulkAIGenerateAllPayrolls({
                startDate: startDate,
                endDate: endDate.toISOString(),
                payDate: bulkAIDateRange.payDate || new Date().toISOString().split('T')[0]
            });

            if (response?.success) {
                // Filter out salesperson and operator roles from bulk AI payrolls
                const restrictedRoles = ['salesperson', 'operator'];
                const filteredPayrolls = (response.data.payrolls || []).filter((payroll: any) => {
                    const employeeRole = payroll.userId?.role?.toLowerCase() || payroll.employee?.role?.toLowerCase() || '';
                    return !restrictedRoles.includes(employeeRole);
                });
                setBulkAIPayrolls(filteredPayrolls);
                showNotification('success', `Generated payroll suggestions for ${filteredPayrolls.length} employees`);
            } else {
                showNotification('error', response?.message || 'Failed to generate bulk payrolls');
            }
        } catch (error: any) {
            showNotification('error', error?.response?.data?.message || error?.message || 'Error generating bulk payrolls');
        } finally {
            setGeneratingBulkAI(false);
        }
    };

    // Update a payroll in the bulk list
    const updateBulkPayroll = (index: number, field: string, value: any) => {
        setBulkAIPayrolls(prev => {
            const updated = [...prev];
            const numValue = (field === 'baseSalary' || field === 'bonus' || field === 'deductions' ||
                field === 'federalIncomeTaxCA' || field === 'provincialIncomeTaxCA' ||
                field === 'cpp' || field === 'ei' || field === 'provincialHealthTaxCA' ||
                field === 'federalIncomeTaxUS' || field === 'stateIncomeTaxUS' ||
                field === 'socialSecurityTax' || field === 'medicareTax' ||
                field === 'stateDisabilityInsurance' || field === 'localTax')
                ? (value === '' ? '0' : value)
                : value;

            updated[index] = {
                ...updated[index],
                [field]: numValue
            };

            // Recalculate total salary including taxes
            const base = parseFloat(updated[index].baseSalary || 0);
            const bonus = parseFloat(updated[index].bonus || 0);
            const deductions = parseFloat(updated[index].deductions || 0);

            // Calculate total taxes
            let totalTaxes = 0;
            const country = updated[index].country || 'USA';
            if (country === 'Canada') {
                totalTaxes =
                    parseFloat(updated[index].federalIncomeTaxCA || '0') +
                    parseFloat(updated[index].provincialIncomeTaxCA || '0') +
                    parseFloat(updated[index].cpp || '0') +
                    parseFloat(updated[index].ei || '0') +
                    parseFloat(updated[index].provincialHealthTaxCA || '0');
            } else {
                totalTaxes =
                    parseFloat(updated[index].federalIncomeTaxUS || '0') +
                    parseFloat(updated[index].stateIncomeTaxUS || '0') +
                    parseFloat(updated[index].socialSecurityTax || '0') +
                    parseFloat(updated[index].medicareTax || '0') +
                    parseFloat(updated[index].stateDisabilityInsurance || '0') +
                    parseFloat(updated[index].localTax || '0');
            }

            updated[index].totalSalary = Math.round((base + bonus - deductions - totalTaxes) * 100) / 100;

            return updated;
        });
    };

    // Create all bulk payrolls
    const handleCreateAllBulkPayrolls = async () => {
        if (bulkAIPayrolls.length === 0) {
            showNotification('error', 'No payrolls to create');
            return;
        }

        setLoading(true);
        const results = { success: 0, failed: 0 };

        try {
            // Create payrolls one by one
            for (const payroll of bulkAIPayrolls) {
                try {
                    const payload: any = {
                        userId: payroll.userId,
                        baseSalary: parseFloat(payroll.baseSalary || 0),
                        bonus: parseFloat(payroll.bonus || 0),
                        deductions: parseFloat(payroll.deductions || 0),
                        payDate: typeof payroll.payDate === 'string' ? payroll.payDate : new Date(payroll.payDate).toISOString().split('T')[0],
                        startDate: typeof payroll.startDate === 'string' ? payroll.startDate : new Date(payroll.startDate).toISOString().split('T')[0],
                        endDate: typeof payroll.endDate === 'string' ? payroll.endDate : new Date(payroll.endDate).toISOString().split('T')[0],
                        country: payroll.country || 'USA',
                        // Canada taxes
                        federalIncomeTaxCA: parseFloat(payroll.federalIncomeTaxCA || '0'),
                        provincialIncomeTaxCA: parseFloat(payroll.provincialIncomeTaxCA || '0'),
                        cpp: parseFloat(payroll.cpp || '0'),
                        ei: parseFloat(payroll.ei || '0'),
                        provincialHealthTaxCA: parseFloat(payroll.provincialHealthTaxCA || '0'),
                        // USA taxes
                        federalIncomeTaxUS: parseFloat(payroll.federalIncomeTaxUS || '0'),
                        stateIncomeTaxUS: parseFloat(payroll.stateIncomeTaxUS || '0'),
                        socialSecurityTax: parseFloat(payroll.socialSecurityTax || '0'),
                        medicareTax: parseFloat(payroll.medicareTax || '0'),
                        stateDisabilityInsurance: parseFloat(payroll.stateDisabilityInsurance || '0'),
                        localTax: parseFloat(payroll.localTax || '0')
                    };

                    const response = await createPayroll(payload);
                    if (response?.success) {
                        results.success++;
                    } else {
                        results.failed++;
                    }
                } catch (error) {
                    results.failed++;
                }
            }

            showNotification(
                'success',
                `Created ${results.success} payroll(s)${results.failed > 0 ? `, ${results.failed} failed` : ''}`
            );

            setShowBulkAIModal(false);
            setBulkAIPayrolls([]);
            setBulkAIDateRange({
                startDate: '',
                endDate: '',
                payDate: new Date().toISOString().split('T')[0]
            });
            fetchPayrolls();
        } catch (error: any) {
            showNotification('error', error?.message || 'Error creating payrolls');
        } finally {
            setLoading(false);
        }
    };

    const filteredPayrolls = payrollData.filter(payroll => {
        // Add null checks for userId
        if (!payroll.userId || !payroll.userId.name || !payroll.userId.role) {
            return false; // Skip payrolls with null userId
        }

        // Exclude restricted roles (including drivers)
        const restrictedRoles = ['contact', 'customer', 'reporter', 'admin', 'driver'];
        if (restrictedRoles.includes(payroll.userId.role?.toLowerCase())) {
            return false;
        }

        // Search by name or internal ID
        const searchLower = searchTerm.toLowerCase();
        const matchesSearch = searchTerm === '' ||
            payroll.userId.name?.toLowerCase().includes(searchLower) ||
            payroll.userId.internalId?.toLowerCase().includes(searchLower);

        const matchesFilter = filterStatus === 'all' ||
            payroll.userId.role.toLowerCase() === filterStatus.toLowerCase();

        return matchesSearch && matchesFilter;
    });

    const totalPayroll = payrollData.reduce((sum, payroll) => sum + payroll.totalSalary, 0);
    const avgSalary = payrollData.length > 0 ? totalPayroll / payrollData.length : 0;

    if (loading && !emptyStateMessage) {
        return (
            <div className="min-h-screen bg-card flex flex-col items-center justify-center text-center space-y-4">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                <p className="text-secondary">Loading payroll data...</p>
            </div>
        );
    }

    if (emptyStateMessage) {
        return (
            <div className="min-h-screen bg-card p-6 flex flex-col items-center justify-center text-center space-y-5">
                {notification && (
                    <div className={`fixed top-4 right-4 z-[10000] flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg ${notification.type === 'success' ? 'bg-green-50 border border-green-200' : 'bg-card border border-red-200'}`}>
                        {notification.type === 'success' ? (
                            <CheckCircle className="h-5 w-5 text-green-600" />
                        ) : (
                            <AlertCircle className="h-5 w-5 text-[#A855F7]" />
                        )}
                        <span className={`text-sm font-medium ${notification.type === 'success' ? 'text-green-800' : 'text-red-800'}`}>
                            {notification.message}
                        </span>
                        <button onClick={() => setNotification(null)}>
                            <X className={`h-4 w-4 ${notification.type === 'success' ? 'text-green-600' : 'text-[#A855F7]'}`} />
                        </button>
                    </div>
                )}
                <Building2 className="h-16 w-16 text-secondary" />
                <div className="space-y-3 max-w-md">
                    <h2 className="text-2xl font-semibold text-headings">No payroll data available</h2>
                    <p className="text-secondary">{emptyStateMessage}</p>
                </div>
                <button
                    onClick={() => fetchPayrolls()}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow"
                >
                    Refresh
                </button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-main px-6">
            <div className="py-8 w-full mx-auto">
                {notification && (
                    <div className={`fixed top-4 right-4 z-[10000] flex items-center gap-3 px-6 py-4 rounded-lg shadow-lg ${notification.type === 'success' ? 'bg-green-500' : 'bg-red-500'
                        } text-white`}>
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
                        <h1 className="text-3xl font-bold" style={{ background: 'var(--accent-navyblue)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Payroll Management</h1>
                        <p className="text-secondary mt-2">Manage employee salaries and payroll records</p>
                    </div>
                    <div className="flex gap-3">
                     
                        <button
                            onClick={() => setShowBulkAIModal(true)}
                            className="px-4 py-2 hover:shadow-lg hover:scale-105 transform duration-200 !text-white rounded-lg transition-all font-medium flex items-center gap-2"
                            style={{ background: 'var(--accent-navyblue)' }}
                        >
                            <Sparkles size={16} />
                            Generate All Payrolls (AI)
                        </button>
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="px-4 py-2 hover:shadow-lg hover:scale-105 transform duration-200 !text-white rounded-lg transition-all font-medium flex items-center gap-2"
                            style={{ background: 'var(--accent-navyblue)' }}
                        >
                            <Plus size={16} />
                            Create Payroll
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    <div className=" p-6 rounded-xl border border-theme shadow-sm bg-[var(--accent-navyblue)]/20 ">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-[var(--accent-blue)]">Total Payroll</p>
                                <p className="text-2xl font-bold text-headings mt-1">${totalPayroll.toLocaleString()}</p>
                            </div>
                            <div className="p-3 rounded-full bg-card flex-shrink-0">
                                <DollarSign className="text-[var(--accent-blue)]" size={24} />
                            </div>
                        </div>
                    </div>
                    <div className="bg-[var(--accent-green)]/20 p-6 rounded-xl border border-theme shadow-sm">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-[var(--accent-green)]">Employees</p>
                                <p className="text-2xl font-bold text-headings mt-1">{payrollData.length}</p>
                            </div>
                            <div className="p-3 rounded-full bg-card flex-shrink-0">
                                <Users className="text-[var(--accent-green)]" size={24} />
                            </div>
                        </div>
                    </div>
                    <div className="bg-[var(--accent-purple)]/20 p-6 border border-theme shadow-sm rounded-xl">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-[var(--accent-purple)]">Average Salary</p>
                                <p className="text-2xl font-bold text-headings mt-1">${Math.round(avgSalary).toLocaleString()}</p>
                            </div>
                            <div className="p-3 rounded-full bg-card flex-shrink-0">
                                <TrendingUp className="text-[var(--accent-purple)]" size={24} />
                            </div>
                        </div>
                    </div>
                    <div className="bg-[var(--accent-amber)]/20 p-6 border border-theme shadow-sm rounded-xl">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-[var(--accent-amber)]">Pay Period</p>
                                <p className="text-2xl font-bold text-headings mt-1">
                                    {new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                                </p>
                            </div>
                            <div className="p-3 rounded-full bg-card flex-shrink-0">
                                <Calendar className="text-[var(--accent-amber)]" size={24} />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-card rounded-xl border-theme shadow-sm border mb-6">
                    <div className="p-6">
                        <div className="flex flex-col md:flex-row gap-4">
                            <div className="flex-1 relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-secondary" size={20} />
                                <input
                                    type="text"
                                    placeholder="Search by employee name or internal ID..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                />
                            </div>
                            <div className="flex gap-2">
                                <select
                                    value={filterStatus}
                                    onChange={(e) => setFilterStatus(e.target.value)}
                                    className="px-4 py-3 text-sm border border-theme rounded-lg
  bg-[var(--bg-card)] text-[var(--text-headings)]
  focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)]
  focus:border-[var(--accent-blue)]
  cursor-pointer transition-all"
                                >
                                    <option
                                        value="all"
                                        className="bg-[var(--bg-card)] text-[var(--text-headings)]"
                                    >
                                        All Roles
                                    </option>

                                    <option value="driver" className="bg-[var(--bg-card)] text-[var(--text-headings)]">
                                        Driver
                                    </option>

                                    <option value="dispatcher" className="bg-[var(--bg-card)] text-[var(--text-headings)]">
                                        Dispatcher
                                    </option>

                                    <option value="hr" className="bg-[var(--bg-card)] text-[var(--text-headings)]">
                                        HR
                                    </option>

                                    <option value="admin" className="bg-[var(--bg-card)] text-[var(--text-headings)]">
                                        Admin
                                    </option>

                                    <option value="employee" className="bg-[var(--bg-card)] text-[var(--text-headings)]">
                                        Employee
                                    </option>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-card border-theme rounded-xl shadow-sm border">
                    <div className="p-6 border-b border-theme">
                        <h2 className="text-xl font-bold text-headings">Payroll Records</h2>
                    </div>

                    {loading ? (
                        <div className="flex justify-center items-center py-12">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                        </div>
                    ) : filteredPayrolls.length === 0 ? (
                        <div className="text-center py-12 text-secondary">
                            No payroll records found
                        </div>
                    ) : (
                        <div className="bg-card rounded-lg overflow-hidden">
                            {/* Top Scrollbar - Only visible horizontal scrollbar */}
                            <style>
                                {`
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
                                    background: var(--accent-blue);
                                    border-radius: 5px;
                                }
                                .top-scrollbar-container::-webkit-scrollbar-thumb:hover {
                                    background: rgba(0,209,255,0.15);
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
                                    background: var(--accent-blue);
                                    border-radius: 5px;
                                }
                                .table-container-with-scrollbar::-webkit-scrollbar-thumb:hover {
                                    background: rgba(0,209,255,0.15);
                                }
                            `}
                            </style>
                            <div
                                ref={topScrollRef}
                                className="top-scrollbar-container"
                                style={{
                                    height: '20px',
                                    marginBottom: '8px',
                                    paddingTop: '8px',

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
                                            <th className="px-6 py-3 text-left text-xs font-medium text-headings uppercase tracking-wider">
                                                Employee
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-headings uppercase tracking-wider">
                                                Role
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-headings uppercase tracking-wider">
                                                Base Salary
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-headings uppercase tracking-wider">
                                                Bonus
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-headings uppercase tracking-wider">
                                                Deductions
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-headings uppercase tracking-wider">
                                                Total Pay
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-headings uppercase tracking-wider">
                                                Pay Date
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-headings uppercase tracking-wider">
                                                Actions
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-card divide-y divide-theme divide-white/5 ">
                                        {filteredPayrolls.map((payroll) => {
                                            return (
                                                <tr
                                                    key={payroll._id}
                                                    className="hover:bg-[rgba(255,255,255,0.03)] cursor-pointer transition-colors"
                                                    onClick={() => openViewModal(payroll)}
                                                >
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="flex items-center">
                                                            <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-medium bg-blue-500">
                                                                {payroll.userId?.name?.charAt(0) || '?'}
                                                            </div>
                                                            <div className="ml-3">
                                                                <div className="text-sm font-medium text-secondary">
                                                                    {payroll.userId?.name || 'Unknown'}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <span className="px-3 py-1 text-xs font-medium rounded-full bg-card text-secondary">
                                                            {payroll.userId?.role || 'Unknown'}
                                                        </span>
                                                    </td>
                                                    {/* Base Salary */}
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary">
                                                        <span>${payroll.baseSalary.toLocaleString()}</span>
                                                    </td>

                                                    {/* Bonus */}
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary">
                                                        <span className="text-green-600">+${payroll.bonus.toLocaleString()}</span>
                                                    </td>

                                                    {/* Deductions */}
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary">
                                                        <span className="text-[#A855F7]">-${payroll.deductions.toLocaleString()}</span>
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
                                                                className="text-green-600 hover:text-green-900 p-2 hover:bg-[var(--accent-blue)]/10 rounded-lg transition-colors"
                                                                title="View Details"
                                                            >
                                                                <Eye size={18} className='text-[var(--accent-blue)]' />
                                                            </button>
                                                            <button
                                                                onClick={() => openPaystubModal(payroll)}
                                                                disabled={loadingPaystub}
                                                                className="text-purple-600 hover:text-purple-900 p-2 hover:bg-[var(--accent-blue)]/10 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                                title="View Paystub"
                                                            >
                                                                <FileText size={18} className='text-[var(--accent-blue)]' />
                                                            </button>
                                                            <button
                                                                onClick={() => openEditModal(payroll)}
                                                                className="text-[#00D1FF] hover:text-blue-900 p-2 hover:bg-[var(--accent-blue)]/10 rounded-lg transition-colors"
                                                                title="Edit Payroll"
                                                            >
                                                                <Edit2 size={18} className='text-[var(--accent-navyblue)]' />
                                                            </button>
                                                            <button
                                                                onClick={() => openDeleteModal(payroll)}
                                                                className="text-[#A855F7] hover:text-red-900 p-2 hover:bg-[var(--accent-red)]/10 rounded-lg transition-colors"
                                                                title="Delete Payroll"
                                                            >
                                                                <Trash2 size={18} className='text-[var(--accent-red)]' />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>

                {
                    (showCreateModal || showEditModal) && (
                        <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-[10001] flex items-center justify-center overflow-auto p-4">
                            <div className="bg-card rounded-xl shadow-xl max-w-5xl w-full max-h-[90vh] overflow-y-auto">
                                <div className="p-6 border-b border-theme sticky top-0 bg-card z-10 flex justify-between items-center">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${showCreateModal ? '' : ''}`}>
                                            {showCreateModal ? <Plus className="text-[#00D1FF]" size={20} /> : <Edit2 className="text-[var(--accent-navyblue)]" size={20} />}
                                        </div>
                                        <div>
                                            <h4 className="text-xl font-bold text-headings">
                                                {showCreateModal ? 'Create New Payroll' : 'Edit Payroll'}
                                            </h4>
                                            <p className="text-sm text-secondary">
                                                {showCreateModal ? 'Add a new payroll record' : 'Update payroll information'}
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => {
                                            setShowCreateModal(false);
                                            setShowEditModal(false);
                                            resetForm();
                                            setSelectedPayroll(null);
                                        }}
                                        className="text-secondary hover:text-secondary p-2 hover:bg-[rgba(255,255,255,0.03)] rounded-lg transition-colors"
                                    >
                                        <X size={24} />
                                    </button>
                                </div>

                                <div className="p-6 space-y-5">
                                    <div>
                                        <label className="block text-sm font-medium text-headings mb-2">
                                            Employee <span className="text-red-500">*</span>
                                        </label>
                                        <select
                                            name="userId"
                                            value={formData.userId}
                                            onChange={handleInputChange}
                                            className="w-full px-4 py-3 text-sm border border-theme rounded-lg
  bg-[var(--bg-card)] text-[var(--text-primary)]
  focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)]
  focus:border-[var(--accent-blue)]
  cursor-pointer transition-all"
                                        >
                                            <option
                                                value=""
                                                className="bg-[var(--bg-card)] text-[var(--text-primary)]"
                                            >
                                                Select Employee
                                            </option>

                                            {employees.map((emp) => (
                                                <option
                                                    key={emp._id}
                                                    value={emp._id}
                                                    className="bg-[var(--bg-card)] text-[var(--text-primary)]"
                                                >
                                                    {emp.name} - {emp.role}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="bg-card p-4 rounded-lg border border-theme">
                                        <h5 className="text-sm font-medium text-headings mb-3 flex items-center gap-2">
                                            <Calendar size={16} />
                                            Pay Period
                                        </h5>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-headings mb-2">
                                                    Start Date <span className="text-red-500">*</span>
                                                </label>
                                                <input
                                                    type="date"
                                                    name="startDate"
                                                    value={formData.startDate}
                                                    onChange={(e) => handleDateRangeChange(e.target.value, formData.endDate)}
                                                    className="w-full px-4 py-3 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-headings mb-2">
                                                    End Date <span className="text-red-500">*</span>
                                                </label>
                                                <input
                                                    type="date"
                                                    name="endDate"
                                                    value={formData.endDate}
                                                    onChange={(e) => handleDateRangeChange(formData.startDate, e.target.value)}
                                                    className="w-full px-4 py-3 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Attendance Summary - Show when employee and date range are selected */}
                                    {formData.userId && formData.startDate && formData.endDate && (
                                        <div className=" rounded-xl p-6 border border-blue-200">
                                            <div className="flex items-center gap-2 mb-4">
                                                <CalendarCheck className="text-[var(--accent-navyblue)]" size={20} />
                                                <h5 className="font-semibold text-headings">Attendance Summary</h5>
                                                {loadingAttendance && (
                                                    <div className="ml-auto animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                                                )}
                                            </div>

                                            {attendanceSummary ? (
                                                <div className="space-y-4">
                                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                                        <div className="bg-card p-3 rounded-lg border border-green-200">
                                                            <p className="text-xs text-secondary mb-1">Present Days</p>
                                                            <p className="text-xl font-bold text-green-600">{attendanceSummary.presentDays}</p>
                                                        </div>
                                                        <div className="bg-card p-3 rounded-lg border border-red-200">
                                                            <p className="text-xs text-secondary mb-1">Absent Days</p>
                                                            <p className="text-xl font-bold text-[#A855F7]">{attendanceSummary.absentDays}</p>
                                                        </div>
                                                        <div className="bg-card p-3 rounded-lg border border-purple-200">
                                                            <p className="text-xs text-secondary mb-1">Leave Days</p>
                                                            <p className="text-xl font-bold text-purple-600">{attendanceSummary.leaveDays}</p>
                                                        </div>
                                                    </div>

                                                    <div className="bg-card p-4 rounded-lg border border-theme">
                                                        <div className="flex items-center gap-2 mb-3">
                                                            <Clock className="text-[#00D1FF]" size={18} />
                                                            <h6 className="font-semibold text-headings">Hours Breakdown</h6>
                                                        </div>
                                                        <div className="grid grid-cols-2 gap-4">
                                                            <div>
                                                                <p className="text-xs text-secondary mb-1">Total Hours</p>
                                                                <p className="text-lg font-bold text-headings">{attendanceSummary.totalHours.toFixed(2)}</p>
                                                            </div>
                                                            <div>
                                                                <p className="text-xs text-secondary mb-1">Regular Hours</p>
                                                                <p className="text-lg font-bold text-[#00D1FF]">{attendanceSummary.regularHours.toFixed(2)}</p>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Auto-calculate salary suggestion if employee has hourly rate */}
                                                    {(() => {
                                                        const selectedEmployee = employees.find(emp => emp._id === formData.userId);
                                                        const hourlyRate = selectedEmployee?.details?.hourlyRate;

                                                        if (hourlyRate && attendanceSummary.totalHours > 0) {
                                                            const suggestedSalary = attendanceSummary.regularHours * hourlyRate;

                                                            return (
                                                                <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-lg border border-green-300">
                                                                    <p className="text-sm font-medium text-headings mb-2">
                                                                        💡 Suggested Salary (based on attendance):
                                                                    </p>
                                                                    <div className="space-y-1 text-sm">
                                                                        <div className="flex justify-between">
                                                                            <span className="text-secondary">Total Hours ({attendanceSummary.regularHours.toFixed(2)}h × ${hourlyRate.toFixed(2)}):</span>
                                                                            <span className="font-medium">${suggestedSalary.toFixed(2)}</span>
                                                                        </div>
                                                                        <div className="flex justify-between pt-2 border-t border-green-200">
                                                                            <span className="font-bold text-headings">Total Suggested:</span>
                                                                            <span className="font-bold text-lg text-green-700">${suggestedSalary.toFixed(2)}</span>
                                                                        </div>
                                                                    </div>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => {
                                                                            setFormData(prev => ({
                                                                                ...prev,
                                                                                baseSalary: suggestedSalary.toFixed(2)
                                                                            }));
                                                                        }}
                                                                        className="mt-3 w-full px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors text-sm font-medium"
                                                                    >
                                                                        Use Suggested Salary
                                                                    </button>
                                                                </div>
                                                            );
                                                        }

                                                        // For salary-based employees, suggest based on present days (late included in present)
                                                        const baseSalary = selectedEmployee?.details?.baseSalary;
                                                        if (baseSalary && !hourlyRate) {
                                                            const totalDays = attendanceSummary.presentDays + attendanceSummary.absentDays + attendanceSummary.leaveDays;
                                                            const workingDaysInMonth = totalDays || 22; // Default to 22 working days
                                                            const dailyRate = baseSalary / workingDaysInMonth;
                                                            const suggestedSalary = attendanceSummary.presentDays * dailyRate;

                                                            return (
                                                                <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-lg border border-green-300">
                                                                    <p className="text-sm font-medium text-headings mb-2">
                                                                        💡 Suggested Salary (based on present days):
                                                                    </p>
                                                                    <div className="space-y-1 text-sm">
                                                                        <div className="flex justify-between">
                                                                            <span className="text-secondary">Present Days:</span>
                                                                            <span className="font-medium">{attendanceSummary.presentDays}</span>
                                                                        </div>
                                                                        <div className="flex justify-between">
                                                                            <span className="text-secondary">Daily Rate (${baseSalary.toFixed(2)} ÷ {workingDaysInMonth} days):</span>
                                                                            <span className="font-medium">${dailyRate.toFixed(2)}/day</span>
                                                                        </div>
                                                                        <div className="flex justify-between pt-2 border-t border-green-200">
                                                                            <span className="font-bold text-headings">Suggested Salary:</span>
                                                                            <span className="font-bold text-lg text-green-700">${suggestedSalary.toFixed(2)}</span>
                                                                        </div>
                                                                    </div>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => {
                                                                            setFormData(prev => ({
                                                                                ...prev,
                                                                                baseSalary: suggestedSalary.toFixed(2)
                                                                            }));
                                                                        }}
                                                                        className="mt-3 w-full px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors text-sm font-medium"
                                                                    >
                                                                        Use Suggested Salary
                                                                    </button>
                                                                </div>
                                                            );
                                                        }

                                                        return null;
                                                    })()}
                                                </div>
                                            ) : !loadingAttendance ? (
                                                <p className="text-sm text-secondary">No attendance records found for the selected date range.</p>
                                            ) : null}
                                        </div>
                                    )}

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-headings mb-2">
                                                Base Salary ($) <span className="text-red-500">*</span>
                                            </label>
                                            <div className="relative">
                                                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-secondary" size={18} />
                                                <input
                                                    type="number"
                                                    name="baseSalary"
                                                    value={formData.baseSalary}
                                                    onChange={handleInputChange}
                                                    min="0"
                                                    step="0.01"
                                                    placeholder="5000.00"
                                                    className="w-full pl-10 pr-4 py-3 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-headings mb-2">
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
                                                    className="w-full pl-10 pr-4 py-3 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                                />
                                            </div>
                                        </div>

                                    </div>

                                    {/* Employee Additions and Deductions */}
                                    {formData.userId && (
                                        <div className="bg-card border border-theme rounded-lg overflow-hidden">
                                            <div className="bg-card px-4 py-3 border-b border-theme">
                                                <h5 className="text-sm font-medium text-headings">Employee Additions & Deductions</h5>
                                                <p className="text-xs text-secondary mt-1">These will be automatically included in the payroll calculation</p>
                                            </div>
                                            <div className="p-4 space-y-4">
                                                {loadingAdditionsDeductions ? (
                                                    <div className="text-center py-4">
                                                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                                                        <p className="text-xs text-secondary mt-2">Loading additions and deductions...</p>
                                                    </div>
                                                ) : (
                                                    <>
                                                        {employeeAdditions.length > 0 && (
                                                            <div>
                                                                <h6 className="text-sm font-semibold text-green-700 mb-2 flex items-center gap-2">
                                                                    <TrendingUp size={16} />
                                                                    Additions ({employeeAdditions.length})
                                                                </h6>
                                                                <div className="space-y-2">
                                                                    {employeeAdditions.map((addition) => {
                                                                        // Calculate the amount to display (edited or calculated)
                                                                        const calculatedAmount = editedAdditionAmounts[addition._id] !== undefined
                                                                            ? editedAdditionAmounts[addition._id]
                                                                            : (() => {
                                                                                // Calculate from base amount and recurrence
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
                                                                            <div key={addition._id} className="bg-green-50 p-3 rounded-lg border border-green-200">
                                                                                <div className="flex justify-between items-start gap-4">
                                                                                    <div className="flex-1">
                                                                                        <p className="text-sm font-medium text-headings">{addition.name || addition.description || 'Addition'}</p>
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
                                                                                            className="w-24 px-2 py-1 text-sm border border-green-300 rounded focus:outline-none focus:ring-1 focus:ring-green-500 bg-card"
                                                                                        />
                                                                                        <span className="text-sm font-semibold text-green-700">+${calculatedAmount.toFixed(2)}</span>
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>
                                                            </div>
                                                        )}
                                                        {employeeDeductions.length > 0 && (
                                                            <div>
                                                                <h6 className="text-sm font-semibold text-red-700 mb-2 flex items-center gap-2">
                                                                    <TrendingUp size={16} className="rotate-180" />
                                                                    Deductions ({employeeDeductions.length})
                                                                </h6>
                                                                <div className="space-y-2">
                                                                    {employeeDeductions.map((deduction) => {
                                                                        // Calculate the amount to display (edited or calculated)
                                                                        const calculatedAmount = editedDeductionAmounts[deduction._id] !== undefined
                                                                            ? editedDeductionAmounts[deduction._id]
                                                                            : (() => {
                                                                                // Calculate from base amount and recurrence
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
                                                                                    const months = Math.ceil((effectiveEndDate.getTime() - effectiveStartDate.getTime()) / (30 * 24 * 60 * 60 * 1000));
                                                                                    amount = amount * Math.max(1, months);
                                                                                }
                                                                                return amount;
                                                                            })();

                                                                        return (
                                                                            <div key={deduction._id} className="bg-card p-3 rounded-lg border border-red-200">
                                                                                <div className="flex justify-between items-start gap-4">
                                                                                    <div className="flex-1">
                                                                                        <p className="text-sm font-medium text-headings">{deduction.name || deduction.description || 'Deduction'}</p>
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
                                                                                            className="w-24 px-2 py-1 text-sm border border-red-300 rounded focus:outline-none focus:ring-1 focus:ring-red-500 bg-card"
                                                                                        />
                                                                                        <span className="text-sm font-semibold text-red-700">-${calculatedAmount.toFixed(2)}</span>
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>
                                                            </div>
                                                        )}
                                                        {employeeAdditions.length === 0 && employeeDeductions.length === 0 && !loadingAdditionsDeductions && (
                                                            <div className="text-center py-4 text-sm text-secondary">
                                                                No additions or deductions found for this employee.
                                                            </div>
                                                        )}
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* Tax Section */}
                                    <div className="bg-card p-6 rounded-lg border border-theme">
                                        <h5 className="text-lg font-semibold text-headings mb-4 flex items-center gap-2">
                                            <DollarSign size={20} className="text-[var(--accent-navyblue)]" />
                                            Tax Information
                                        </h5>

                                        <div className="mb-4">
                                            <label className="block text-sm font-medium text-headings mb-2">
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
                                                <h6 className="text-sm font-semibold text-headings mb-3">Canada Taxes</h6>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="block text-sm font-medium text-headings mb-2">
                                                            Federal Income Tax ($)
                                                        </label>
                                                        <div className="relative">
                                                            <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-secondary" size={16} />
                                                            <input
                                                                type="number"
                                                                name="federalIncomeTaxCA"
                                                                value={formData.federalIncomeTaxCA}
                                                                onChange={handleInputChange}
                                                                min="0"
                                                                step="0.01"
                                                                placeholder="0.00"
                                                                className="w-full pl-10 pr-4 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-card"
                                                            />
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <label className="block text-sm font-medium text-headings mb-2">
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
                                                        <label className="block text-sm font-medium text-headings mb-2">
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
                                                        <label className="block text-sm font-medium text-headings mb-2">
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
                                                        <label className="block text-sm font-medium text-headings mb-2">
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
                                                <h6 className="text-sm font-semibold text-headings mb-3">United States Taxes</h6>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="block text-sm font-medium text-headings mb-2">
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
                                                        <label className="block text-sm font-medium text-headings mb-2">
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
                                                        <label className="block text-sm font-medium text-headings mb-2">
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
                                                        <label className="block text-sm font-medium text-headings mb-2">
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
                                                        <label className="block text-sm font-medium text-headings mb-2">
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
                                                        <label className="block text-sm font-medium text-headings mb-2">
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
                                        {formData.baseSalary && (
                                            <div className="mt-4 p-4 bg-card rounded-lg border border-purple-300">
                                                <h6 className="text-sm font-semibold text-headings mb-2">Total Taxes</h6>
                                                <div className="text-2xl font-bold text-primary">
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
                                        <label className="block text-sm font-medium text-headings mb-2">
                                            Payment Date <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="date"
                                            name="payDate"
                                            value={formData.payDate}
                                            onChange={handleInputChange}
                                            className="w-full px-4 py-3 border border-theme rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-card"
                                        />
                                    </div>

                                    {formData.baseSalary && (() => {
                                        const { totalAdditions, totalDeductions } = calculateAdditionsDeductions();
                                        const baseSalary = parseFloat(formData.baseSalary || '0');
                                        const manualBonus = parseFloat(formData.bonus || '0');
                                        const grossEarnings = baseSalary + manualBonus + totalAdditions;

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

                                        const netPay = grossEarnings - totalDeductions - totalTax;

                                        // Format dates for "Based on" section
                                        const startDate = formData.startDate ? new Date(formData.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '';
                                        const endDate = formData.endDate ? new Date(formData.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '';
                                        const periodText = startDate && endDate ? `${startDate} - ${endDate}` : (startDate || endDate || 'Pay Period');

                                        return (
                                            <div className="bg-[var(--accent-navyblue)]/20 text-white p-6 rounded-lg">
                                                <div className="space-y-2">
                                                    <div className="flex justify-between items-center">
                                                        <p className="text-sm text-green-100">Gross Earnings</p>
                                                        <p className="text-lg font-semibold">
                                                            ${grossEarnings.toFixed(2)}
                                                        </p>
                                                    </div>
                                                    {(baseSalary > 0 || totalAdditions > 0 || manualBonus > 0) && (
                                                        <div className="pl-4 text-xs text-green-200">
                                                            {baseSalary > 0 && (
                                                                <div className="flex justify-between">
                                                                    <span>Base Salary:</span>
                                                                    <span>${baseSalary.toFixed(2)}</span>
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
                                                                    <span>Additions ({employeeAdditions.length}):</span>
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
                                                                <span>Deductions ({employeeDeductions.length}):</span>
                                                                <span>-${totalDeductions.toFixed(2)}</span>
                                                            </div>
                                                        </div>
                                                    )}
                                                    <div className="flex justify-between items-center text-sm">
                                                        <p className="text-green-100">Taxes</p>
                                                        <p className="text-red-200">-${totalTax.toFixed(2)}</p>
                                                    </div>
                                                    <div className="pt-2 border-t border-green-500 flex justify-between items-center">
                                                        <div>
                                                            <p className="text-sm font-medium text-green-100">Net Pay</p>
                                                            <p className="text-4xl font-bold mt-1">
                                                                ${netPay.toFixed(2)}
                                                            </p>
                                                        </div>
                                                        <div className="text-right mt-2">
                                                            <p className="text-xs text-green-100">Based on</p>
                                                            <p className="text-sm font-bold">{periodText}</p>
                                                        </div>
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
                                                resetForm();
                                                setSelectedPayroll(null);
                                            }}
                                            className="px-4 py-2 text-headings bg-card hover:bg-gray-200 rounded-lg transition-colors font-medium flex items-center gap-2 disabled:opacity-50"
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
                                            className="px-4 py-2 !text-white rounded-lg transition-all font-medium flex items-center gap-2 disabled:opacity-50"
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

                {
                    showViewModal && selectedPayroll && (
                        <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-[100] flex items-center justify-center overflow-auto p-4">
                            <div className="bg-card rounded-xl shadow-xl max-w-5xl w-full max-h-[90vh] overflow-y-auto">
                                <div className="p-6 border-b border-theme sticky top-0 bg-card z-10 flex justify-between items-center">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                                            <Eye className="text-green-600" size={20} />
                                        </div>
                                        <div>
                                            <h4 className="text-xl font-bold text-headings">Payroll Details</h4>
                                            <p className="text-sm text-secondary">{selectedPayroll.userId?.name || 'Unknown'}</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setShowViewModal(false)}
                                        className="text-secondary hover:text-secondary p-2 hover:bg-[rgba(255,255,255,0.03)] rounded-lg transition-colors"
                                    >
                                        <X size={24} />
                                    </button>
                                </div>

                                <div className="p-6 space-y-6">
                                    {/* Employee Info */}
                                    <div className="bg-card p-6 rounded-xl border border-theme">
                                        <h5 className="text-lg font-bold text-headings mb-4 flex items-center gap-2">
                                            <Users size={20} className="text-[#00D1FF]" />
                                            Employee Information
                                        </h5>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-sm font-semibold text-secondary">Name</label>
                                                <div className="mt-1 px-4 py-3 bg-card rounded-lg text-headings">
                                                    {selectedPayroll.userId?.name || 'Unknown'}
                                                </div>
                                            </div>
                                            <div>
                                                <label className="text-sm font-semibold text-secondary">Role</label>
                                                <div className="mt-1 px-4 py-3 bg-card rounded-lg">
                                                    <span className={`px-3 py-1 text-sm font-medium rounded-full ${selectedPayroll.userId.role.toLowerCase() === 'driver'
                                                        ? 'bg-green-100 text-green-800'
                                                        : 'bg-blue-100 text-blue-800'
                                                        }`}>
                                                        {selectedPayroll.userId.role}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>


                                    {/* Payroll Summary */}
                                    <div className="bg-card p-6 rounded-xl border border-blue-200">
                                        <h5 className="text-lg font-bold text-headings mb-4 flex items-center gap-2">
                                            <DollarSign size={20} className="text-[#00D1FF]" />
                                            Payroll Summary
                                        </h5>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-sm font-semibold text-secondary">Base Salary / Earnings</label>
                                                <div className="mt-1 px-4 py-3 bg-card rounded-lg text-headings font-bold">
                                                    ${selectedPayroll.baseSalary.toLocaleString()}
                                                </div>
                                            </div>
                                            <div>
                                                <label className="text-sm font-semibold text-secondary">Bonus</label>
                                                <div className="mt-1 px-4 py-3 bg-card rounded-lg text-green-600 font-bold">
                                                    +${selectedPayroll.bonus.toLocaleString()}
                                                </div>
                                            </div>
                                            <div>
                                                <label className="text-sm font-semibold text-secondary">Deductions</label>
                                                <div className="mt-1 px-4 py-3 bg-card rounded-lg text-[#A855F7] font-bold">
                                                    -${selectedPayroll.deductions.toLocaleString()}
                                                </div>
                                            </div>
                                            <div>
                                                <label className="text-sm font-semibold text-secondary">Total Pay</label>
                                                <div style={{
                                                    background: 'var(--accent-navyblue)'

                                                }}
                                                    className="mt-1 px-4 py-3  rounded-lg text-white font-bold text-xl">
                                                    ${selectedPayroll.totalSalary.toLocaleString()}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Pay Period */}
                                    <div className="bg-card p-6 rounded-xl border border-theme">
                                        <h5 className="text-lg font-bold text-headings mb-4 flex items-center gap-2">
                                            <Calendar size={20} className="text-[#F59E0B]" />
                                            Pay Period
                                        </h5>
                                        <div className="grid grid-cols-3 gap-4">
                                            <div>
                                                <label className="text-sm font-semibold text-secondary">Start Date</label>
                                                <div className="mt-1 px-4 py-3 bg-card rounded-lg text-headings">
                                                    {new Date(selectedPayroll.startDate).toLocaleDateString()}
                                                </div>
                                            </div>
                                            <div>
                                                <label className="text-sm font-semibold text-secondary">End Date</label>
                                                <div className="mt-1 px-4 py-3 bg-card rounded-lg text-headings">
                                                    {new Date(selectedPayroll.endDate).toLocaleDateString()}
                                                </div>
                                            </div>
                                            <div>
                                                <label className="text-sm font-semibold text-secondary">Pay Date</label>
                                                <div className="mt-1 px-4 py-3 bg-card rounded-lg text-headings">
                                                    {new Date(selectedPayroll.payDate).toLocaleDateString()}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="p-6 border-t border-theme">
                                    <div className="flex justify-end">
                                        <button
                                            onClick={() => setShowViewModal(false)}
                                            className="px-6 py-3 bg-card hover:bg-gray-200 text-headings rounded-lg font-medium transition-colors flex items-center gap-2"
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
                                    <div className="border-b-2 border-theme pb-4 mb-4">
                                        <div className="flex justify-between items-start">
                                            <div className="flex-1">
                                                {selectedPaystub.companyDetails?.companyLogo && (
                                                    <img
                                                        src={selectedPaystub.companyDetails.companyLogo}
                                                        alt="Company Logo"
                                                        className="h-12 mb-3"
                                                    />
                                                )}
                                                <h2 className="text-2xl font-bold text-headings mb-1">
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
                                    <div className="grid grid-cols-3 gap-4 bg-card p-4 rounded-lg border border-blue-200">
                                        <div>
                                            <label className="text-xs font-semibold text-secondary uppercase">Pay Period Start</label>
                                            <div className="text-sm font-bold text-headings mt-1">
                                                {new Date(selectedPaystub.payPeriod.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-xs font-semibold text-secondary uppercase">Pay Period End</label>
                                            <div className="text-sm font-bold text-headings mt-1">
                                                {new Date(selectedPaystub.payPeriod.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-xs font-semibold text-secondary uppercase">Pay Date</label>
                                            <div className="text-sm font-bold text-headings mt-1">
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
                                                <div className="mt-1 text-base font-semibold text-headings">
                                                    {selectedPaystub.employeeName || 'Unknown'}
                                                </div>
                                            </div>
                                            <div>
                                                <label className="text-xs font-semibold text-secondary uppercase">Employee ID / Driver ID</label>
                                                <div className="mt-1 text-base font-semibold text-headings">
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
                                                <div className="mt-1 text-base font-semibold text-headings">
                                                    {selectedPaystub.workType || 'Employee'}
                                                </div>
                                            </div>
                                            {selectedPaystub.employeeDepartment && (
                                                <div>
                                                    <label className="text-xs font-semibold text-secondary uppercase">Department</label>
                                                    <div className="mt-1 text-base text-headings">
                                                        {selectedPaystub.employeeDepartment}
                                                    </div>
                                                </div>
                                            )}
                                            {selectedPaystub.employeeAddress && (
                                                <div>
                                                    <label className="text-xs font-semibold text-secondary uppercase">Address</label>
                                                    <div className="mt-1 text-sm text-headings">
                                                        {selectedPaystub.employeeAddress}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Earnings Section */}
                                    <div className=" p-5 rounded-lg border border-green-200">
                                        <h3 className="text-lg font-bold text-headings mb-4 border-b border-green-300 pb-2">Earnings</h3>
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
                                                    <tbody>
                                                        {selectedPaystub.earnings.earningsBreakdown.map((earning: any, index: number) => (
                                                            <tr key={index} className="border-b border-green-200">
                                                                <td className="py-2 px-3 text-sm text-headings">{earning.type}</td>
                                                                <td className="py-2 px-3 text-sm text-center text-secondary">{earning.units || '-'}</td>
                                                                <td className="py-2 px-3 text-sm text-right text-secondary">
                                                                    {earning.rate > 0 ? `$${earning.rate.toFixed(2)}` : '-'}
                                                                </td>
                                                                <td className="py-2 px-3 text-sm text-right font-semibold text-headings">
                                                                    ${earning.amount.toFixed(2)}
                                                                </td>
                                                            </tr>
                                                        ))}
                                                        <tr className="bg-green-100 font-bold">
                                                            <td colSpan={3} className="py-3 px-3 text-sm text-headings">Total Earnings</td>
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
                                                    <span className="text-sm text-headings">Basic Pay</span>
                                                    <span className="text-sm font-semibold text-headings">
                                                        ${selectedPaystub.earnings.baseSalary.toFixed(2)}
                                                    </span>
                                                </div>
                                                {selectedPaystub.earnings.bonus > 0 && (
                                                    <div className="flex justify-between items-center py-2 border-b border-green-200">
                                                        <span className="text-sm text-headings">Bonus</span>
                                                        <span className="text-sm font-semibold text-green-600">
                                                            ${selectedPaystub.earnings.bonus.toFixed(2)}
                                                        </span>
                                                    </div>
                                                )}
                                                {selectedPaystub.earnings.mileageEarnings > 0 && (
                                                    <div className="flex justify-between items-center py-2 border-b border-green-200">
                                                        <span className="text-sm text-headings">Trip Pay / Mileage</span>
                                                        <span className="text-sm font-semibold text-green-600">
                                                            ${selectedPaystub.earnings.mileageEarnings.toFixed(2)}
                                                        </span>
                                                    </div>
                                                )}
                                                <div className="flex justify-between items-center py-3 bg-green-100 rounded mt-2 px-3 font-bold">
                                                    <span className="text-base text-headings">Total Earnings</span>
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
                                                            <th className="text-left py-2 px-3 text-xs font-semibold text-headings uppercase">Deduction Type</th>
                                                            <th className="text-right py-2 px-3 text-xs font-semibold text-headings uppercase">Amount</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {selectedPaystub.deductions.deductionsBreakdown.map((deduction: any, index: number) => (
                                                            <tr key={index} className="border-b border-red-200">
                                                                <td className="py-2 px-3 text-sm text-headings">{deduction.type}</td>
                                                                <td className="py-2 px-3 text-sm text-right font-semibold text-[#A855F7]">
                                                                    ${deduction.amount.toFixed(2)}
                                                                </td>
                                                            </tr>
                                                        ))}
                                                        <tr className="bg-red-100 font-bold">
                                                            <td className="py-3 px-3 text-sm text-headings">Total Deductions</td>
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
                                                        <span className="text-sm text-headings">Other Deductions</span>
                                                        <span className="text-sm font-semibold text-[#A855F7]">
                                                            ${selectedPaystub.deductions.otherDeductions.toFixed(2)}
                                                        </span>
                                                    </div>
                                                )}
                                                <div className="flex justify-between items-center py-2 border-b border-red-200">
                                                    <span className="text-sm text-headings">Taxes</span>
                                                    <span className="text-sm font-semibold text-[#A855F7]">
                                                        ${selectedPaystub.summary.totalTaxes.toFixed(2)}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between items-center py-3 bg-red-100 rounded mt-2 px-3 font-bold">
                                                    <span className="text-base text-headings">Total Deductions</span>
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
                                            <h3 className="text-lg font-bold text-headings mb-4 border-b border-purple-300 pb-2">Employer Contributions</h3>
                                            <div className="space-y-2">
                                                {selectedPaystub?.employerContributions?.companyInsurance && selectedPaystub?.employerContributions?.companyInsurance > 0 && (
                                                    <div className="flex justify-between items-center py-2 border-b border-purple-200">
                                                        <span className="text-sm text-headings">Company Insurance</span>
                                                        <span className="text-sm font-semibold text-purple-600">
                                                            ${selectedPaystub?.employerContributions?.companyInsurance?.toFixed(2)}
                                                        </span>
                                                    </div>
                                                )}
                                                {selectedPaystub?.employerContributions?.pensionPF && selectedPaystub?.employerContributions?.pensionPF > 0 && (
                                                    <div className="flex justify-between items-center py-2 border-b border-purple-200">
                                                        <span className="text-sm text-headings">Pension / PF</span>
                                                        <span className="text-sm font-semibold text-purple-600">
                                                            ${selectedPaystub?.employerContributions?.pensionPF?.toFixed(2)}
                                                        </span>
                                                    </div>
                                                )}
                                                {selectedPaystub?.employerContributions?.benefitContributions && selectedPaystub?.employerContributions?.benefitContributions > 0 && (
                                                    <div className="flex justify-between items-center py-2 border-b border-purple-200">
                                                        <span className="text-sm text-headings">Benefit Contributions</span>
                                                        <span className="text-sm font-semibold text-purple-600">
                                                            ${selectedPaystub?.employerContributions?.benefitContributions?.toFixed(2)}
                                                        </span>
                                                    </div>
                                                )}
                                                <div className="flex justify-between items-center py-3 bg-purple-100 rounded mt-2 px-3 font-bold">
                                                    <span className="text-base text-headings">Total Employer Contributions</span>
                                                    <span className="text-base text-purple-700">
                                                        ${selectedPaystub?.employerContributions?.total?.toFixed(2)}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Summary Section */}
                                    <div className="bg-card border border-theme p-6 rounded-lg text-white shadow-lg">
                                        <h3 className="text-xl font-bold mb-4 border-b border-blue-400 pb-2 text-headings">Pay Summary</h3>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-sm font-semibold opacity-90 uppercase text-headings">Gross Earnings</label>
                                                <div className="mt-1 text-2xl font-bold">
                                                    ${selectedPaystub?.summary?.grossPay?.toFixed(2)}
                                                </div>
                                            </div>
                                            <div>
                                                <label className="text-sm font-semibold opacity-90 uppercase text-headings">Total Deductions</label>
                                                <div className="mt-1 text-2xl font-bold">
                                                    ${selectedPaystub?.summary?.totalDeductions?.toFixed(2)}
                                                </div>
                                            </div>
                                            <div className="col-span-2 border-t border-blue-400 pt-4 mt-2">
                                                <div className="flex justify-between items-center">
                                                    <div className="text-3xl font-bold">
                                                        ${selectedPaystub?.summary?.netPay?.toFixed(2)}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* YTD Summary */}
                                    {selectedPaystub.ytd && (
                                        <div className="bg-card border border-theme p-5 rounded-lg">
                                            <h3 className="text-lg font-bold text-headings mb-4 border-b border-indigo-300 pb-2">Year-to-Date (YTD) Summary</h3>
                                            <div className="grid grid-cols-3 gap-4">
                                                <div>
                                                    <label className="text-xs font-semibold text-secondary uppercase">YTD Earnings</label>
                                                    <div className="mt-1 text-base font-bold text-indigo-700">
                                                        ${selectedPaystub?.ytd?.earnings?.toFixed(2)}
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="text-xs font-semibold text-secondary uppercase">YTD Deductions</label>
                                                    <div className="mt-1 text-base font-bold text-[#A855F7]">
                                                        ${selectedPaystub?.ytd?.deductions?.toFixed(2)}
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="text-xs font-semibold text-secondary uppercase">YTD Net Pay</label>
                                                    <div className="mt-1 text-base font-bold text-green-700">
                                                        ${selectedPaystub?.ytd?.netPay?.toFixed(2)}
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
                                                <div className="mt-1 text-sm text-headings">
                                                    {selectedPaystub.notes}
                                                </div>
                                            </div>
                                        )}

                                        <div className="pt-4 border-t border-theme flex justify-between items-end">
                                            <div>
                                                {selectedPaystub.hrName && (
                                                    <div>
                                                        <label className="text-xs font-semibold text-secondary uppercase">HR Signature</label>
                                                        <div className="mt-1 text-sm font-semibold text-headings">
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
                                            className="px-6 py-3 bg-[var(--accent-navyblue)] hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                                        >
                                            <Download size={18} />
                                            Download PDF
                                        </button>
                                        <button
                                            onClick={() => {
                                                setShowPaystubModal(false);
                                                setSelectedPaystub(null);
                                            }}
                                            className="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-headings rounded-lg font-medium transition-colors flex items-center gap-2"
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

                {
                    showDeleteModal && selectedPayroll && (
                        <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                            <div className="bg-card rounded-xl shadow-xl max-w-md w-full p-6">
                                <div className="flex items-center gap-4 mb-4">
                                    <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                                        <AlertCircle className="text-[#A855F7]" size={24} />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-headings">Delete Payroll</h3>
                                        <p className="text-sm text-secondary">This action cannot be undone</p>
                                    </div>
                                </div>

                                <p className="text-headings mb-6">
                                    Are you sure you want to delete the payroll record for <strong>{selectedPayroll.userId?.name || 'Unknown'}</strong>?
                                </p>

                                <div className="flex justify-end space-x-3">
                                    <button
                                        onClick={() => {
                                            setShowDeleteModal(false);
                                            setSelectedPayroll(null);
                                        }}
                                        className="px-4 py-2 !mr-3 text-headings bg-card hover:bg-gray-200 rounded-lg transition-colors font-medium flex items-center gap-2"
                                        disabled={loading}
                                    >
                                        <X size={16} />
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleDelete}
                                        className="px-4 py-2 bg-red-600 hover:bg-red-700 !text-white rounded-lg transition-colors disabled:opacity-50 font-medium"
                                        disabled={loading}
                                    >
                                        {loading ? 'Deleting...' : 'Delete'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )
                }

                {/* Auto Generate Modal */}
                {
                    showAutoGenerateModal && (
                        <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                            <div className="bg-card rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
                                <div className="p-6 border-b border-theme">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                                                <Sparkles className="text-purple-600" size={20} />
                                            </div>
                                            <div>
                                                <h3 className="text-xl font-bold text-headings">AI-Powered Payroll Generation</h3>
                                                <p className="text-sm text-secondary">Automatically calculate payroll based on attendance</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => {
                                                setShowAutoGenerateModal(false);
                                                setAutoGenerateData(null);
                                            }}
                                            className="text-secondary hover:text-secondary"
                                        >
                                            <X size={24} />
                                        </button>
                                    </div>
                                </div>

                                <div className="p-6 space-y-6">
                                    {/* Employee Selection */}
                                    <div>
                                        <label className="block text-sm font-semibold text-headings mb-2">Employee</label>
                                        <select
                                            value={formData.userId}
                                            onChange={(e) => {
                                                setFormData({ ...formData, userId: e.target.value });
                                            }}
                                            className="w-full px-4 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        >
                                            <option value="">Select Employee</option>
                                            {employees.map((emp) => (
                                                <option key={emp._id} value={emp._id}>{emp.name} ({emp.role})</option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Date Range */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-semibold text-headings mb-2">Start Date</label>
                                            <input
                                                type="date"
                                                value={formData.startDate}
                                                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                                                className="w-full px-4 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-headings mb-2">End Date</label>
                                            <input
                                                type="date"
                                                value={formData.endDate}
                                                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                                                className="w-full px-4 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            />
                                        </div>
                                    </div>

                                    {/* Base Salary (Optional) */}
                                    <div>
                                        <label className="block text-sm font-semibold text-headings mb-2">Base Salary (Optional - will use employee default if not provided)</label>
                                        <input
                                            type="number"
                                            value={formData.baseSalary}
                                            onChange={(e) => setFormData({ ...formData, baseSalary: e.target.value })}
                                            placeholder="Leave empty to use employee default"
                                            className="w-full px-4 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>

                                    {/* Generate Button */}
                                    {!autoGenerateData && (
                                        <button
                                            onClick={handleAutoGenerate}
                                            disabled={generatingAutoPayroll || !formData.userId || !formData.startDate || !formData.endDate}
                                            className="w-full px-4 py-3 hover:shadow-lg hover:scale-105 transform duration-200 !text-white rounded-lg transition-all font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                            style={{
                                                background: 'var(--accent-navyblue)'
                                            }}>
                                            {
                                                generatingAutoPayroll ? (
                                                    <>
                                                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                                        Generating...
                                                    </>
                                                ) : (
                                                    <>
                                                        <Sparkles size={20} />
                                                        Generate Payroll with AI
                                                    </>
                                                )}
                                        </button>
                                    )}

                                    {/* AI Recommendations Display */}
                                    {autoGenerateData && (
                                        <div className="space-y-4">
                                            <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl p-6 border border-purple-200">
                                                <h4 className="text-lg font-bold text-headings mb-4 flex items-center gap-2">
                                                    <Sparkles className="text-purple-600" size={20} />
                                                    AI Recommendations
                                                </h4>

                                                {/* Attendance Summary */}
                                                <div className="mb-4">
                                                    <h5 className="font-semibold text-headings mb-2">Attendance Summary</h5>
                                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                                        <div className="bg-card p-3 rounded-lg">
                                                            <p className="text-xs text-secondary">Present</p>
                                                            <p className="text-lg font-bold text-green-600">{autoGenerateData.attendance.presentDays}</p>
                                                        </div>
                                                        <div className="bg-card p-3 rounded-lg">
                                                            <p className="text-xs text-secondary">Absent</p>
                                                            <p className="text-lg font-bold text-[#A855F7]">{autoGenerateData.attendance.absentDays}</p>
                                                        </div>
                                                        <div className="bg-card p-3 rounded-lg">
                                                            <p className="text-xs text-secondary">Leave</p>
                                                            <p className="text-lg font-bold text-purple-600">{autoGenerateData.attendance.leaveDays}</p>
                                                        </div>
                                                    </div>
                                                    <p className="text-sm text-secondary mt-2">
                                                        Total Hours: <strong>{autoGenerateData.attendance.totalHours.toFixed(2)}</strong>
                                                    </p>
                                                </div>

                                                {/* Employee Additions and Deductions */}
                                                {formData.userId && (employeeAdditions.length > 0 || employeeDeductions.length > 0) && (
                                                    <div className="bg-card border border-theme rounded-lg overflow-hidden mb-4">
                                                        <div className="bg-card px-4 py-3 border-b border-theme">
                                                            <h5 className="text-sm font-medium text-headings">Employee Additions & Deductions</h5>
                                                            <p className="text-xs text-secondary mt-1">These will be automatically included in the payroll calculation</p>
                                                        </div>
                                                        <div className="p-4 space-y-4">
                                                            {employeeAdditions.length > 0 && (
                                                                <div>
                                                                    <h6 className="text-sm font-semibold text-green-700 mb-2 flex items-center gap-2">
                                                                        <TrendingUp size={16} />
                                                                        Additions ({employeeAdditions.length})
                                                                    </h6>
                                                                    <div className="space-y-2">
                                                                        {employeeAdditions.map((addition) => {
                                                                            const calculatedAmount = editedAdditionAmounts[addition._id] !== undefined
                                                                                ? editedAdditionAmounts[addition._id]
                                                                                : (() => {
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
                                                                                <div key={addition._id} className="bg-green-50 p-3 rounded-lg border border-green-200">
                                                                                    <div className="flex justify-between items-start gap-4">
                                                                                        <div className="flex-1">
                                                                                            <p className="text-sm font-medium text-headings">{addition.name || addition.description || 'Addition'}</p>
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
                                                                                                className="w-24 px-2 py-1 text-sm border border-green-300 rounded focus:outline-none focus:ring-1 focus:ring-green-500 bg-card"
                                                                                            />
                                                                                            <span className="text-sm font-semibold text-green-700">+${calculatedAmount.toFixed(2)}</span>
                                                                                        </div>
                                                                                    </div>
                                                                                </div>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                </div>
                                                            )}
                                                            {employeeDeductions.length > 0 && (
                                                                <div>
                                                                    <h6 className="text-sm font-semibold text-red-700 mb-2 flex items-center gap-2">
                                                                        <TrendingUp size={16} className="rotate-180" />
                                                                        Deductions ({employeeDeductions.length})
                                                                    </h6>
                                                                    <div className="space-y-2">
                                                                        {employeeDeductions.map((deduction) => {
                                                                            const calculatedAmount = editedDeductionAmounts[deduction._id] !== undefined
                                                                                ? editedDeductionAmounts[deduction._id]
                                                                                : (() => {
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
                                                                                        const months = Math.ceil((effectiveEndDate.getTime() - effectiveStartDate.getTime()) / (30 * 24 * 60 * 60 * 1000));
                                                                                        amount = amount * Math.max(1, months);
                                                                                    }
                                                                                    return amount;
                                                                                })();

                                                                            return (
                                                                                <div key={deduction._id} className="bg-card p-3 rounded-lg border border-red-200">
                                                                                    <div className="flex justify-between items-start gap-4">
                                                                                        <div className="flex-1">
                                                                                            <p className="text-sm font-medium text-headings">{deduction.name || deduction.description || 'Deduction'}</p>
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
                                                                                                className="w-24 px-2 py-1 text-sm border border-red-300 rounded focus:outline-none focus:ring-1 focus:ring-red-500 bg-card"
                                                                                            />
                                                                                            <span className="text-sm font-semibold text-red-700">-${calculatedAmount.toFixed(2)}</span>
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

                                                {/* Salary Breakdown */}
                                                <div className="bg-card rounded-lg p-4 mb-4">
                                                    <h5 className="font-semibold text-headings mb-3">Calculated Salary</h5>
                                                    <div className="space-y-2">
                                                        <div className="flex justify-between">
                                                            <span className="text-secondary">Base Salary:</span>
                                                            <span className="font-medium">${autoGenerateData.payroll.baseSalary.toFixed(2)}</span>
                                                        </div>
                                                        <div className="flex justify-between">
                                                            <span className="text-secondary">Bonus:</span>
                                                            <span className="font-medium text-green-600">+${autoGenerateData.payroll.bonus.toFixed(2)}</span>
                                                        </div>
                                                        {(() => {
                                                            const { totalAdditions, totalDeductions } = calculateAdditionsDeductions();
                                                            return (
                                                                <>
                                                                    {totalAdditions > 0 && (
                                                                        <div className="flex justify-between">
                                                                            <span className="text-secondary">Additions ({employeeAdditions.length}):</span>
                                                                            <span className="font-medium text-green-600">+${totalAdditions.toFixed(2)}</span>
                                                                        </div>
                                                                    )}
                                                                    {totalDeductions > 0 && (
                                                                        <div className="flex justify-between">
                                                                            <span className="text-secondary">Deductions ({employeeDeductions.length}):</span>
                                                                            <span className="font-medium text-[#A855F7]">-${totalDeductions.toFixed(2)}</span>
                                                                        </div>
                                                                    )}
                                                                </>
                                                            );
                                                        })()}
                                                        <div className="flex justify-between pt-2 border-t border-theme">
                                                            <span className="font-bold text-headings">Total Salary:</span>
                                                            <span className="font-bold text-lg text-headings">
                                                                ${(() => {
                                                                    const { totalAdditions, totalDeductions } = calculateAdditionsDeductions();
                                                                    const baseSalary = autoGenerateData.payroll.baseSalary || 0;
                                                                    const bonus = autoGenerateData.payroll.bonus || 0;
                                                                    return (baseSalary + bonus + totalAdditions - totalDeductions).toFixed(2);
                                                                })()}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* AI Recommendations */}
                                                {autoGenerateData.aiRecommendations?.recommendations && (
                                                    <div className="bg-card rounded-lg p-4">
                                                        <h5 className="font-semibold text-headings mb-2">AI Insights</h5>
                                                        <ul className="space-y-1">
                                                            {autoGenerateData.aiRecommendations.recommendations.map((rec: string, idx: number) => (
                                                                <li key={idx} className="text-sm text-headings flex items-start gap-2">
                                                                    <CheckCircle className="text-purple-600 mt-0.5 flex-shrink-0" size={16} />
                                                                    {rec}
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Action Buttons */}
                                            <div className="flex gap-3">
                                                <button
                                                    onClick={() => {
                                                        setShowAutoGenerateModal(false);
                                                        setShowCreateModal(true);
                                                    }}
                                                    className="flex-1 px-4 py-2 bg-card hover:bg-gray-200 text-headings rounded-lg transition-colors font-medium"
                                                >
                                                    Edit Before Creating
                                                </button>
                                                <button
                                                    onClick={handleCreateFromAutoGenerate}
                                                    disabled={loading}
                                                    className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 !text-white rounded-lg transition-all font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                                                >
                                                    {loading ? (
                                                        <>
                                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                                            Creating...
                                                        </>
                                                    ) : (
                                                        <>
                                                            <CheckCircle size={18} />
                                                            Create Payroll
                                                        </>
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div >
                        </div >
                    )
                }

                {/* Bulk AI Generate All Payrolls Modal */}
                {
                    showBulkAIModal && (
                        <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-[100] flex items-center justify-center overflow-auto p-4">
                            <div className="bg-card rounded-xl shadow-xl max-w-4xl w-auto max-h-[90vh] overflow-y-auto">
                                <div className="p-6 border-b border-theme sticky top-0 bg-card z-10 flex justify-between items-center">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-indigo-100">
                                            <Sparkles className="text-indigo-600" size={20} />
                                        </div>
                                        <div>
                                            <h4 className="text-xl font-bold text-headings">
                                                Generate All Payrolls with AI
                                            </h4>
                                            <p className="text-sm text-secondary">
                                                AI will analyze attendance for all employees and generate payroll suggestions
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => {
                                            setShowBulkAIModal(false);
                                            setBulkAIPayrolls([]);
                                            setBulkAIDateRange({
                                                startDate: '',
                                                endDate: '',
                                                payDate: new Date().toISOString().split('T')[0]
                                            });
                                        }}
                                        className="text-secondary hover:text-secondary p-2 hover:bg-[rgba(255,255,255,0.03)] rounded-lg transition-colors"
                                    >
                                        <X size={24} />
                                    </button>
                                </div>

                                <div className="p-6 space-y-6">
                                    {/* Date Range Selection */}
                                    {bulkAIPayrolls.length === 0 && (
                                        <div className="space-y-4">
                                            <div className="bg-card border-l-4 border-blue-500 p-4 rounded-lg">
                                                <p className="text-sm text-blue-800">
                                                    <strong>Note:</strong> This will generate payroll suggestions for all employees in your company based on their attendance records for the selected date range.
                                                </p>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                <div>
                                                    <label className="block text-sm font-medium text-headings mb-2">
                                                        Start Date <span className="text-red-500">*</span>
                                                    </label>
                                                    <input
                                                        type="date"
                                                        value={bulkAIDateRange.startDate}
                                                        onChange={(e) => setBulkAIDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                                                        className="w-full px-4 py-3 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-headings mb-2">
                                                        End Date <span className="text-red-500">*</span>
                                                    </label>
                                                    <input
                                                        type="date"
                                                        value={bulkAIDateRange.endDate}
                                                        onChange={(e) => setBulkAIDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                                                        className="w-full px-4 py-3 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-headings mb-2">
                                                        Pay Date
                                                    </label>
                                                    <input
                                                        type="date"
                                                        value={bulkAIDateRange.payDate}
                                                        onChange={(e) => setBulkAIDateRange(prev => ({ ...prev, payDate: e.target.value }))}
                                                        className="w-full px-4 py-3 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                                    />
                                                </div>
                                            </div>

                                            <button
                                                onClick={handleBulkAIGenerate}
                                                disabled={generatingBulkAI || !bulkAIDateRange.startDate || !bulkAIDateRange.endDate}
                                                className="w-full px-4 py-3 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 !text-white rounded-lg transition-all font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                {generatingBulkAI ? (
                                                    <>
                                                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                                        Generating Payrolls for All Employees...
                                                    </>
                                                ) : (
                                                    <>
                                                        <Sparkles size={20} />
                                                        Generate All Payrolls with AI
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    )}

                                    {/* Review and Edit Generated Payrolls */}
                                    {bulkAIPayrolls.length > 0 && (
                                        <div className="space-y-4">
                                            <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4 border border-green-200">
                                                <div className="flex items-center justify-between mb-2">
                                                    <h5 className="font-bold text-headings flex items-center gap-2">
                                                        <CheckCircle className="text-green-600" size={20} />
                                                        Generated {bulkAIPayrolls.length} Payroll Suggestions
                                                    </h5>
                                                    <div className="text-sm text-secondary">
                                                        Total: <span className="font-bold text-green-700">
                                                            ${bulkAIPayrolls.reduce((sum, p) => sum + (parseFloat(p.totalSalary) || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                        </span>
                                                    </div>
                                                </div>
                                                <p className="text-sm text-headings">
                                                    Review and adjust amounts as needed. You can edit individual payrolls before creating them.
                                                </p>
                                            </div>

                                            <div className="bg-card rounded-lg border border-theme overflow-hidden">
                                                <div className="overflow-x-auto">
                                                    <table className="w-full">
                                                        <thead className="bg-card">
                                                            <tr>
                                                                <th className="px-4 py-3 text-left text-xs font-medium text-secondary uppercase">Employee</th>
                                                                <th className="px-4 py-3 text-left text-xs font-medium text-secondary uppercase">Role</th>
                                                                <th className="px-4 py-3 text-left text-xs font-medium text-secondary uppercase">Attendance</th>
                                                                <th className="px-4 py-3 text-left text-xs font-medium text-secondary uppercase">Base Salary</th>
                                                                <th className="px-4 py-3 text-left text-xs font-medium text-secondary uppercase">Bonus</th>
                                                                <th className="px-4 py-3 text-left text-xs font-medium text-secondary uppercase">Deductions</th>
                                                                <th className="px-4 py-3 text-left text-xs font-medium text-secondary uppercase">Taxes</th>
                                                                <th className="px-4 py-3 text-left text-xs font-medium text-secondary uppercase">Total</th>
                                                                <th className="px-4 py-3 text-left text-xs font-medium text-secondary uppercase">Actions</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-theme">
                                                            {bulkAIPayrolls.map((payroll, index) => (
                                                                <tr key={index} className="hover:bg-[rgba(255,255,255,0.03)]">
                                                                    <td className="px-4 py-3">
                                                                        <div className="font-medium text-headings">
                                                                            {payroll.employee?.name || 'Unknown'}
                                                                        </div>
                                                                    </td>
                                                                    <td className="px-4 py-3">
                                                                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-card text-headings">
                                                                            {payroll.employee?.role || 'Unknown'}
                                                                        </span>
                                                                    </td>
                                                                    <td className="px-4 py-3">
                                                                        <div className="text-xs space-y-1">
                                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                                <span className="text-green-600 font-medium">
                                                                                    W: {(payroll.attendance?.workedDays || payroll.attendance?.presentDays || 0)}
                                                                                </span>
                                                                                <span className="text-[#A855F7]">A: {payroll.attendance?.absentDays || 0}</span>
                                                                            </div>
                                                                            {payroll.attendance?.totalHours > 0 && (
                                                                                <div className="text-secondary">
                                                                                    Hours: {payroll.attendance.totalHours.toFixed(2)}
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    </td>
                                                                    <td className="px-4 py-3">
                                                                        <input
                                                                            type="number"
                                                                            value={typeof payroll.baseSalary === 'number' ? payroll.baseSalary : parseFloat(payroll.baseSalary || 0)}
                                                                            onChange={(e) => updateBulkPayroll(index, 'baseSalary', e.target.value)}
                                                                            className="w-28 px-2 py-1 border border-theme rounded text-sm"
                                                                            step="0.01"
                                                                            min="0"
                                                                        />
                                                                    </td>
                                                                    <td className="px-4 py-3">
                                                                        <input
                                                                            type="number"
                                                                            value={typeof payroll.bonus === 'number' ? payroll.bonus : parseFloat(payroll.bonus || 0)}
                                                                            onChange={(e) => updateBulkPayroll(index, 'bonus', e.target.value)}
                                                                            className="w-28 px-2 py-1 border border-theme rounded text-sm"
                                                                            step="0.01"
                                                                            min="0"
                                                                        />
                                                                    </td>
                                                                    <td className="px-4 py-3">
                                                                        <input
                                                                            type="number"
                                                                            value={typeof payroll.deductions === 'number' ? payroll.deductions : parseFloat(payroll.deductions || 0)}
                                                                            onChange={(e) => updateBulkPayroll(index, 'deductions', e.target.value)}
                                                                            className="w-28 px-2 py-1 border border-theme rounded text-sm"
                                                                            step="0.01"
                                                                            min="0"
                                                                        />
                                                                    </td>
                                                                    <td className="px-4 py-3">
                                                                        {(() => {
                                                                            const country = payroll.country || 'USA';
                                                                            const totalTaxes = country === 'Canada'
                                                                                ? (parseFloat(payroll.federalIncomeTaxCA || '0') +
                                                                                    parseFloat(payroll.provincialIncomeTaxCA || '0') +
                                                                                    parseFloat(payroll.cpp || '0') +
                                                                                    parseFloat(payroll.ei || '0') +
                                                                                    parseFloat(payroll.provincialHealthTaxCA || '0'))
                                                                                : (parseFloat(payroll.federalIncomeTaxUS || '0') +
                                                                                    parseFloat(payroll.stateIncomeTaxUS || '0') +
                                                                                    parseFloat(payroll.socialSecurityTax || '0') +
                                                                                    parseFloat(payroll.medicareTax || '0') +
                                                                                    parseFloat(payroll.stateDisabilityInsurance || '0') +
                                                                                    parseFloat(payroll.localTax || '0'));
                                                                            return (
                                                                                <div className="space-y-1">
                                                                                    <div className="text-xs font-semibold text-[#A855F7]">
                                                                                        ${totalTaxes.toFixed(2)}
                                                                                    </div>
                                                                                    <button
                                                                                        onClick={(e) => {
                                                                                            e.stopPropagation();
                                                                                            const currentPayroll = bulkAIPayrolls[index];
                                                                                            // Store the bulk index for later update
                                                                                            (currentPayroll as any)._bulkIndex = index;

                                                                                            // Create a payroll-like object for the edit modal
                                                                                            const payrollForEdit = {
                                                                                                ...currentPayroll,
                                                                                                userId: {
                                                                                                    _id: currentPayroll.userId,
                                                                                                    name: currentPayroll.employee?.name || 'Unknown',
                                                                                                    role: currentPayroll.employee?.role || 'Unknown'
                                                                                                },
                                                                                                baseSalary: typeof currentPayroll.baseSalary === 'number' ? currentPayroll.baseSalary : parseFloat(currentPayroll.baseSalary || '0'),
                                                                                                bonus: typeof currentPayroll.bonus === 'number' ? currentPayroll.bonus : parseFloat(currentPayroll.bonus || '0'),
                                                                                                deductions: typeof currentPayroll.deductions === 'number' ? currentPayroll.deductions : parseFloat(currentPayroll.deductions || '0'),
                                                                                                payDate: typeof currentPayroll.payDate === 'string'
                                                                                                    ? currentPayroll.payDate
                                                                                                    : new Date(currentPayroll.payDate).toISOString(),
                                                                                                startDate: typeof currentPayroll.startDate === 'string'
                                                                                                    ? currentPayroll.startDate
                                                                                                    : new Date(currentPayroll.startDate).toISOString(),
                                                                                                endDate: typeof currentPayroll.endDate === 'string'
                                                                                                    ? currentPayroll.endDate
                                                                                                    : new Date(currentPayroll.endDate).toISOString(),
                                                                                                country: currentPayroll.country || 'USA',
                                                                                                federalIncomeTaxCA: typeof currentPayroll.federalIncomeTaxCA === 'number' ? currentPayroll.federalIncomeTaxCA : parseFloat(currentPayroll.federalIncomeTaxCA || '0'),
                                                                                                provincialIncomeTaxCA: typeof currentPayroll.provincialIncomeTaxCA === 'number' ? currentPayroll.provincialIncomeTaxCA : parseFloat(currentPayroll.provincialIncomeTaxCA || '0'),
                                                                                                cpp: typeof currentPayroll.cpp === 'number' ? currentPayroll.cpp : parseFloat(currentPayroll.cpp || '0'),
                                                                                                ei: typeof currentPayroll.ei === 'number' ? currentPayroll.ei : parseFloat(currentPayroll.ei || '0'),
                                                                                                provincialHealthTaxCA: typeof currentPayroll.provincialHealthTaxCA === 'number' ? currentPayroll.provincialHealthTaxCA : parseFloat(currentPayroll.provincialHealthTaxCA || '0'),
                                                                                                federalIncomeTaxUS: typeof currentPayroll.federalIncomeTaxUS === 'number' ? currentPayroll.federalIncomeTaxUS : parseFloat(currentPayroll.federalIncomeTaxUS || '0'),
                                                                                                stateIncomeTaxUS: typeof currentPayroll.stateIncomeTaxUS === 'number' ? currentPayroll.stateIncomeTaxUS : parseFloat(currentPayroll.stateIncomeTaxUS || '0'),
                                                                                                socialSecurityTax: typeof currentPayroll.socialSecurityTax === 'number' ? currentPayroll.socialSecurityTax : parseFloat(currentPayroll.socialSecurityTax || '0'),
                                                                                                medicareTax: typeof currentPayroll.medicareTax === 'number' ? currentPayroll.medicareTax : parseFloat(currentPayroll.medicareTax || '0'),
                                                                                                stateDisabilityInsurance: typeof currentPayroll.stateDisabilityInsurance === 'number' ? currentPayroll.stateDisabilityInsurance : parseFloat(currentPayroll.stateDisabilityInsurance || '0'),
                                                                                                localTax: typeof currentPayroll.localTax === 'number' ? currentPayroll.localTax : parseFloat(currentPayroll.localTax || '0')
                                                                                            };

                                                                                            // Use openEditModal to properly set up the form
                                                                                            openEditModal(payrollForEdit as any);
                                                                                        }}
                                                                                        className="text-[#00D1FF] hover:text-blue-800 text-xs underline cursor-pointer"
                                                                                    >
                                                                                        Edit
                                                                                    </button>
                                                                                </div>
                                                                            );
                                                                        })()}
                                                                    </td>
                                                                    <td className="px-4 py-3">
                                                                        <span className="font-semibold text-headings">
                                                                            ${parseFloat(payroll.totalSalary || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                                        </span>
                                                                    </td>
                                                                    <td className="px-4 py-3">
                                                                        <button
                                                                            onClick={async () => {
                                                                                try {
                                                                                    setLoading(true);
                                                                                    const payload: any = {
                                                                                        userId: payroll.userId,
                                                                                        baseSalary: parseFloat(payroll.baseSalary || 0),
                                                                                        bonus: parseFloat(payroll.bonus || 0),
                                                                                        deductions: parseFloat(payroll.deductions || 0),
                                                                                        payDate: typeof payroll.payDate === 'string' ? payroll.payDate : new Date(payroll.payDate).toISOString().split('T')[0],
                                                                                        startDate: typeof payroll.startDate === 'string' ? payroll.startDate : new Date(payroll.startDate).toISOString().split('T')[0],
                                                                                        endDate: typeof payroll.endDate === 'string' ? payroll.endDate : new Date(payroll.endDate).toISOString().split('T')[0],
                                                                                        country: payroll.country || 'USA',
                                                                                        // Canada taxes
                                                                                        federalIncomeTaxCA: parseFloat(payroll.federalIncomeTaxCA || '0'),
                                                                                        provincialIncomeTaxCA: parseFloat(payroll.provincialIncomeTaxCA || '0'),
                                                                                        cpp: parseFloat(payroll.cpp || '0'),
                                                                                        ei: parseFloat(payroll.ei || '0'),
                                                                                        provincialHealthTaxCA: parseFloat(payroll.provincialHealthTaxCA || '0'),
                                                                                        // USA taxes
                                                                                        federalIncomeTaxUS: parseFloat(payroll.federalIncomeTaxUS || '0'),
                                                                                        stateIncomeTaxUS: parseFloat(payroll.stateIncomeTaxUS || '0'),
                                                                                        socialSecurityTax: parseFloat(payroll.socialSecurityTax || '0'),
                                                                                        medicareTax: parseFloat(payroll.medicareTax || '0'),
                                                                                        stateDisabilityInsurance: parseFloat(payroll.stateDisabilityInsurance || '0'),
                                                                                        localTax: parseFloat(payroll.localTax || '0')
                                                                                    };
                                                                                    const response = await createPayroll(payload);
                                                                                    if (response?.success) {
                                                                                        showNotification('success', `Payroll created for ${payroll.employee?.name}`);
                                                                                        setBulkAIPayrolls(prev => prev.filter((_, i) => i !== index));
                                                                                        fetchPayrolls();
                                                                                    } else {
                                                                                        showNotification('error', response?.message || 'Failed to create payroll');
                                                                                    }
                                                                                } catch (error: any) {
                                                                                    showNotification('error', error?.message || 'Error creating payroll');
                                                                                } finally {
                                                                                    setLoading(false);
                                                                                }
                                                                            }}
                                                                            style={{
                                                                                background: 'var(--accent-navyblue)'
                                                                            }}
                                                                            className="px-3 py-1 bg-green-600 hover:bg-green-700 !text-white rounded text-sm font-medium transition-colors"
                                                                        >
                                                                            Create
                                                                        </button>
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>

                                            {/* Action Buttons */}
                                            <div className="flex gap-3 pt-4 border-t border-theme">
                                               <button
  onClick={() => {
    setShowBulkAIModal(false);
    setBulkAIPayrolls([]);
    setBulkAIDateRange({
      startDate: '',
      endDate: '',
      payDate: new Date().toISOString().split('T')[0]
    });
  }}
className="flex-1 px-4 py-2 bg-card hover:bg-gray-200 text-headings border border-gray-300 dark:border-gray-600 rounded-lg transition-colors font-medium"
>
  Cancel
</button>
                                                <button
                                                    onClick={handleCreateAllBulkPayrolls}
                                                    disabled={loading || bulkAIPayrolls.length === 0}
                                                    className="flex-1 px-4 py-2 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 !text-white rounded-lg transition-all font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                                                >
                                                    {loading ? (
                                                        <>
                                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                                            Creating...
                                                        </>
                                                    ) : (
                                                        <>
                                                            <CheckCircle size={18} />
                                                            Create All Payrolls ({bulkAIPayrolls.length})
                                                        </>
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {/* Delete All Confirmation Modal */}
                                    {showDeleteAllModal && (
                                        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10001]">
                                            <div className="bg-card rounded-lg p-6 max-w-md w-full mx-4">
                                                <div className="flex items-center gap-3 mb-4">
                                                    <div className="p-3 bg-red-100 rounded-full">
                                                        <AlertCircle className="text-[#A855F7]" size={24} />
                                                    </div>
                                                    <h2 className="text-xl font-bold text-headings">Delete All Payrolls</h2>
                                                </div>
                                                <p className="text-secondary mb-2">
                                                    Are you sure you want to delete <strong>ALL {payrollData.length} payroll records</strong>?
                                                </p>
                                                <p className="text-sm text-[#A855F7] font-medium mb-6">
                                                    ⚠️ This action cannot be undone!
                                                </p>
                                                <div className="flex gap-3">
                                                    <button
                                                        onClick={() => setShowDeleteAllModal(false)}
                                                        disabled={loading}
                                                        className="flex-1 px-4 py-2 bg-card hover:bg-gray-200 text-headings rounded-lg transition-colors font-medium disabled:opacity-50"
                                                    >
                                                        Cancel
                                                    </button>
                                                    <button
                                                        onClick={handleDeleteAll}
                                                        disabled={loading}
                                                        className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                                                    >
                                                        {loading ? (
                                                            <>
                                                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                                                Deleting...
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Trash2 size={16} />
                                                                Delete All
                                                            </>
                                                        )}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )
                }
            </div >
        </div >
    );
};

export default PayrollManagement;
