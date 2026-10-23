import { useState, useEffect, useRef, useMemo } from 'react';
import { Edit, Trash2, Plus, X, RefreshCw, User, Search, FileText, MapPin, DollarSign, Upload, Save, ChevronUp, ChevronDown, Calendar, Award, AlertTriangle, FileText as FileTextIcon, PlusCircle, Check, ClipboardCheck, Ticket, FlaskConical, Lock, Eye, EyeOff, FileDown } from 'lucide-react';
import ExcelJS from 'exceljs';
import { FaCheckCircle, FaExclamationCircle, FaTimes } from 'react-icons/fa';
import * as driverApi from '../../../../axios/api/driver';
import { getTestResults, approveTestResult, rejectTestResult, getDriverTicketSignedUrl, verifyDrugTestPassword } from '../../../../axios/api/driver';
import { listDriver, importDriversFromFile } from '../../../../axios/api/distapcher';
import ImportButton from '../../../../components/common/ImportButton';
import { getSignedEmployeeDocumentUrl, deleteEmployeeDocument } from '../../../../axios/api/employeeDocument';
import type { EmployeeDocument } from '../../../../axios/api/employeeDocument';
import { deleteViolation } from '../../../../axios/api/violations';
import { deleteDeductionAddition } from '../../../../axios/api/account.settlement';
import AddressSearch from '../../../../components/common/AddressSearch';
import { useAutoSaveDraft } from '../../../../customHooks/useAutoSaveDraft';
import DraftRestoreBanner from '../../../../components/common/DraftRestoreBanner';
import AutoSaveIndicator from '../../../../components/common/AutoSaveIndicator';

import DateField from "../../../../components/common/DateField"

// US States
const US_STATES = [
  { value: 'AL', label: 'Alabama' },
  { value: 'AK', label: 'Alaska' },
  { value: 'AZ', label: 'Arizona' },
  { value: 'AR', label: 'Arkansas' },
  { value: 'CA', label: 'California' },
  { value: 'CO', label: 'Colorado' },
  { value: 'CT', label: 'Connecticut' },
  { value: 'DE', label: 'Delaware' },
  { value: 'FL', label: 'Florida' },
  { value: 'GA', label: 'Georgia' },
  { value: 'HI', label: 'Hawaii' },
  { value: 'ID', label: 'Idaho' },
  { value: 'IL', label: 'Illinois' },
  { value: 'IN', label: 'Indiana' },
  { value: 'IA', label: 'Iowa' },
  { value: 'KS', label: 'Kansas' },
  { value: 'KY', label: 'Kentucky' },
  { value: 'LA', label: 'Louisiana' },
  { value: 'ME', label: 'Maine' },
  { value: 'MD', label: 'Maryland' },
  { value: 'MA', label: 'Massachusetts' },
  { value: 'MI', label: 'Michigan' },
  { value: 'MN', label: 'Minnesota' },
  { value: 'MS', label: 'Mississippi' },
  { value: 'MO', label: 'Missouri' },
  { value: 'MT', label: 'Montana' },
  { value: 'NE', label: 'Nebraska' },
  { value: 'NV', label: 'Nevada' },
  { value: 'NH', label: 'New Hampshire' },
  { value: 'NJ', label: 'New Jersey' },
  { value: 'NM', label: 'New Mexico' },
  { value: 'NY', label: 'New York' },
  { value: 'NC', label: 'North Carolina' },
  { value: 'ND', label: 'North Dakota' },
  { value: 'OH', label: 'Ohio' },
  { value: 'OK', label: 'Oklahoma' },
  { value: 'OR', label: 'Oregon' },
  { value: 'PA', label: 'Pennsylvania' },
  { value: 'RI', label: 'Rhode Island' },
  { value: 'SC', label: 'South Carolina' },
  { value: 'SD', label: 'South Dakota' },
  { value: 'TN', label: 'Tennessee' },
  { value: 'TX', label: 'Texas' },
  { value: 'UT', label: 'Utah' },
  { value: 'VT', label: 'Vermont' },
  { value: 'VA', label: 'Virginia' },
  { value: 'WA', label: 'Washington' },
  { value: 'WV', label: 'West Virginia' },
  { value: 'WI', label: 'Wisconsin' },
  { value: 'WY', label: 'Wyoming' }
];

// Canadian Provinces
const CANADIAN_PROVINCES = [
  { value: 'AB', label: 'Alberta' },
  { value: 'BC', label: 'British Columbia' },
  { value: 'MB', label: 'Manitoba' },
  { value: 'NB', label: 'New Brunswick' },
  { value: 'NL', label: 'Newfoundland and Labrador' },
  { value: 'NS', label: 'Nova Scotia' },
  { value: 'NT', label: 'Northwest Territories' },
  { value: 'NU', label: 'Nunavut' },
  { value: 'ON', label: 'Ontario' },
  { value: 'PE', label: 'Prince Edward Island' },
  { value: 'QC', label: 'Quebec' },
  { value: 'SK', label: 'Saskatchewan' },
  { value: 'YT', label: 'Yukon' }
];

// Notification types and component
type NotificationType = 'success' | 'error' | 'info';

interface ToastNotification {
  id: number;
  type: NotificationType;
  message: string;
}

const ToastNotification = ({ notification, onClose }: { notification: ToastNotification; onClose: (id: number) => void }) => {
  const icons = {
    success: <FaCheckCircle className="text-[var(--accent-green)]" size={24} />,
    error: <FaExclamationCircle className="text-[var(--accent-red)]" size={24} />,
    info: <FaCheckCircle className="text-[var(--accent-navyblue)]" size={24} />
  };

  const bgColors = {
    success: 'bg-[var(--accent-green)]/10 border-[var(--accent-green)]/30',
    error: 'bg-[var(--accent-red)]/10 border-[var(--accent-red)]/30',
    info: 'bg-[var(--accent-navyblue)]/10 border-[var(--accent-navyblue)]/30'
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      onClose(notification.id);
    }, 5000);
    return () => clearTimeout(timer);
  }, [notification.id, onClose]);

  return (
    <div className={`flex items-start gap-3 p-4 rounded-lg border-2 shadow-lg ${bgColors[notification.type]} animate-slide-in min-w-[300px] max-w-[500px]`}>
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

// Driver interface matching backend response
interface Driver {
  _id?: string;
  driverId: string;
  firstName: string;
  lastName: string;
  driversLicence: string;
  passport: string;
  dateOfBirth: string;
  notes: string;
  ticketYTD: number;
  status: string;
  compliance: 'COMPLIANT' | 'EXPIRING SOON' | 'NON-COMPLIANT';
  complianceDetails?: any;
  email?: string;
  phone?: string;
  mobile?: string;
  company?: string;
  profileImageUrl?: string | null;
  [key: string]: any; // Allow additional fields from backend
}


const DriverManagement = () => {
  const [activeTab, setActiveTab] = useState<'all' | 'external' | 'unassigned'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ show: boolean; driverId: string | null }>({ show: false, driverId: null });
  const [notifications, setNotifications] = useState<ToastNotification[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [driverCounts, setDriverCounts] = useState<{ total: number; assigned: number; unassigned: number }>({ total: 0, assigned: 0, unassigned: 0 });
  const [profileImagePreview, setProfileImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPin, setShowPin] = useState(false);
  const [pinIsExisting, setPinIsExisting] = useState(false);
  const passportExpiryRef = useRef<HTMLInputElement>(null);
  const expiryRef = useRef<HTMLInputElement>(null);
  const hireDateRef = useRef<HTMLInputElement>(null);
  const terminationDateRef = useRef<HTMLInputElement>(null);
  const dateRef = useRef<HTMLInputElement>(null);
  const [filterBy, setFilterBy] = useState('Active');
  const [category, setCategory] = useState('');
  const [complianceStatus, setComplianceStatus] = useState('All');
  const [sortBy, setSortBy] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: keyof Driver | null; direction: 'asc' | 'desc' }>({
    key: null,
    direction: 'asc'
  });
  const [showNewDriverModal, setShowNewDriverModal] = useState(false);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
  const [activeFormTab, setActiveFormTab] = useState<'basic' | 'personal' | 'travel' | 'documents' | 'certifications' | 'tickets' | 'violations' | 'notes' | 'deductions' | 'additions' | 'onboarding' | 'drugtest'>('basic');
  const tableScrollRef = useRef<HTMLDivElement>(null);
  const topScrollRef = useRef<HTMLDivElement>(null);
  const topScrollContentRef = useRef<HTMLDivElement>(null);

  // Validation errors state
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Store original driver data for comparison (to detect changes)
  const [originalDriverData, setOriginalDriverData] = useState<{
    formData: typeof formData;
    personalData: typeof personalData;
    travelData: typeof travelData;
    notes?: typeof notes;
    documents?: typeof documents;
    certifications?: typeof certifications;
    violations?: typeof violations;
    deductions?: typeof deductions;
    additions?: typeof additions;
    drugTests?: typeof drugTests;
  } | null>(null);

  // Country data for phone inputs
  interface Country {
    name: string;
    code: string;
    flag: string;
    dialCode: string;
  }

  const [countries, setCountries] = useState<Country[]>([]);
  const [primaryPhoneCountry, setPrimaryPhoneCountry] = useState<string>('US');
  const [secondaryPhoneCountry, setSecondaryPhoneCountry] = useState<string>('US');
  const [primaryCountryDropdownOpen, setPrimaryCountryDropdownOpen] = useState(false);
  const [secondaryCountryDropdownOpen, setSecondaryCountryDropdownOpen] = useState(false);
  const [primaryCountrySearch, setPrimaryCountrySearch] = useState('');
  const [secondaryCountrySearch, setSecondaryCountrySearch] = useState('');
  const primaryCountryDropdownRef = useRef<HTMLDivElement>(null);
  const secondaryCountryDropdownRef = useRef<HTMLDivElement>(null);

  // Helper function to parse phone number and extract country code
  const parsePhoneNumber = (phone: string | undefined | null, countriesList: Country[] = countries): { countryCode: string; phoneNumber: string } => {
    if (!phone) return { countryCode: 'US', phoneNumber: '' };

    // Remove any whitespace
    const cleanPhone = phone.trim();

    // Try to match country code (try longer codes first to avoid partial matches)
    const sortedCountries = [...countriesList].sort((a, b) => b.dialCode.length - a.dialCode.length);
    for (const country of sortedCountries) {
      if (cleanPhone.startsWith(country.dialCode)) {
        return {
          countryCode: country.code,
          phoneNumber: cleanPhone.substring(country.dialCode.length).trim()
        };
      }
    }

    // Default to US if no match found
    return { countryCode: 'US', phoneNumber: cleanPhone.replace(/^\+1/, '').trim() };
  };

  // Fetch countries data
  useEffect(() => {
    fetch('https://restcountries.com/v3.1/all?fields=name,flag,idd,cca2')
      .then(res => res.json())
      .then(data => {
        const sortedCountries = data
          .filter((c: any) => c.idd && c.idd.root)
          .map((c: any) => ({
            name: c.name.common,
            code: c.cca2,
            flag: c.flag,
            dialCode: c.idd.root + (c.idd.suffixes ? c.idd.suffixes[0] : ''),
          }))
          .sort((a: Country, b: Country) => a.name.localeCompare(b.name));

        setCountries(sortedCountries);
        const defaultCountry = sortedCountries.find((c: Country) => c.code === 'US');
        if (defaultCountry) {
          setPrimaryPhoneCountry('US');
          setSecondaryPhoneCountry('US');
        }
      })
      .catch(() => {
        const fallback = [
          { name: 'United States', code: 'US', flag: '🇺🇸', dialCode: '+1' },
          { name: 'Canada', code: 'CA', flag: '🇨🇦', dialCode: '+1' },
          { name: 'India', code: 'IN', flag: '🇮🇳', dialCode: '+91' },
          { name: 'United Kingdom', code: 'GB', flag: '🇬🇧', dialCode: '+44' },
          { name: 'Australia', code: 'AU', flag: '🇦🇺', dialCode: '+61' },
        ];
        setCountries(fallback);
        setPrimaryPhoneCountry('US');
        setSecondaryPhoneCountry('US');
      });
  }, []);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (primaryCountryDropdownRef.current && !primaryCountryDropdownRef.current.contains(event.target as Node)) {
        setPrimaryCountryDropdownOpen(false);
      }
      if (secondaryCountryDropdownRef.current && !secondaryCountryDropdownRef.current.contains(event.target as Node)) {
        setSecondaryCountryDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Form state for Basic Information
  const [formData, setFormData] = useState({
    driverId: '',
    firstName: '',
    middle: '',
    lastName: '',
    emailAddress: '',
    dateOfBirth: '',
    mobileApp: false,
    pin: '',
    primaryPhone: '',
    secondaryPhone: '',
    searchAddress: '',
    address: '',
    unit: '',
    city: '',
    postalCode: '',
    country: '',
    stateProvince: '',
    profileImage: null as File | null
  });

  // Auto-save draft protection (crash/power-loss safety net for the create/edit form)
  const {
    status: draftStatus,
    lastSavedAt: draftLastSavedAt,
    pendingRestore: draftPendingRestore,
    restoreDraft: restoreDriverDraft,
    discardDraft: discardDriverDraft,
    clearDraft: clearDriverDraft,
  } = useAutoSaveDraft({
    entityType: 'drivers',
    entityId: editingId || 'new',
    formData,
    enabled: showNewDriverModal,
  });

  const handleRestoreDriverDraft = () => {
    const draft = restoreDriverDraft();
    if (!draft) return;
    setFormData((prev) => ({ ...prev, ...draft }));
  };

  // Form state for Personal Information
  const [personalData, setPersonalData] = useState({
    socialInsuranceNumber: '',
    hireDate: '',
    terminationDate: '',
    status: 'Active',
    vacationPercent: '',
    // Pay Information
    corporationName: '',
    driverName: '',
    paymentAddress: '',
    paymentSearchAddress: '',
    paymentCity: '',
    paymentPostalCode: '',
    paymentCountry: '',
    paymentStateProvince: '',
    gstNo: '',
    // Pay Type
    driverType: 'COMPANY DRIVER' as 'COMPANY DRIVER' | 'OWNER OPERATOR',
    paymentMethod: 'PAID PER MILE' as 'PAID PER MILE' | 'PAID PERCENT' | 'PAID BY TRIP' | 'PAID PER HOUR' | 'PAID PER DAY',
    // $/Mile Details
    alone: '0',
    empty: '0',
    bonusDrop: '0',
    team: '0',
    emptyTeam: '0',
    bonusPick: '0',
    bonusLayover: '0',
    // Percent Rate (for PAID PERCENT)
    percentRate: '0',
    // Per Trip Amount (for PAID BY TRIP)
    perTripAmount: '0',
    // Hourly Rate (for PAID PER HOUR)
    hourlyRate: '0',
    // Daily Rate (for PAID PER DAY)
    dailyRate: '0',
    // Driver Type
    driverTypeSolo: true, // true = SOLO, false = TEAM
    // Cross-border eligibility
    cross_border_eligible: false,
    // Exemptions
    cppExempt: false,
    payrollTaxExempt: false,
    // Custom HST
    customHst: '',
    // Additional fields
    gender: '',
    citizenship: ''
  });

  // Sync country name when countries array loads (ensures dropdown shows correct selection)
  useEffect(() => {
    if (countries.length > 0 && formData.country && formData.country.trim() !== '') {
      // Try to find exact match first
      const exactMatch = countries.find(c => c.name === formData.country);
      if (!exactMatch) {
        // Try to find by code or partial match
        const countryMatch = countries.find(
          c => c.code.toLowerCase() === formData.country.toLowerCase() ||
            c.name.toLowerCase() === formData.country.toLowerCase() ||
            c.name.toLowerCase().includes(formData.country.toLowerCase()) ||
            formData.country.toLowerCase().includes(c.name.toLowerCase())
        );
        if (countryMatch && countryMatch.name !== formData.country) {
          // Update to exact country name from array (only if different)
          setFormData(prev => {
            if (prev.country !== countryMatch.name) {
              return { ...prev, country: countryMatch.name };
            }
            return prev;
          });
        }
      }
    }
  }, [countries.length, formData.country]); // Sync when countries load or country changes

  // Form state for Travel Information
  const [travelData, setTravelData] = useState({
    // Travel Information
    driversLicenseNumber: '',
    driversLicenseExpiry: '',
    licenseStateProvince: '',
    passportNumber: '',
    passportCountry: '',
    passportExpiry: '',
    fastCardNumber: '',
    fastCardExpiry: '',
    fastCardValid: false,
    // SIN Number (mandatory)
    sinNumber: '',
    // Canadian Worker Status
    canadianWorkerStatus: 'PERMANENT RESIDENT' as 'CANADIAN CITIZEN' | 'PERMANENT RESIDENT' | 'WORK PERMIT',
    // Permanent Residence Expiry
    permanentResidenceExpiry: '',
    // Work Permit Expiry
    workPermitExpiry: '',
    // WCB Number
    wcbNumber: '',
    // Document files
    workPermitDocument: null as File | null,
    prCardDocument: null as File | null,
    existingWorkPermitUrl: null as string | null,
    existingPrCardUrl: null as string | null
  });

  // Form state for Documents
  const [documents, setDocuments] = useState<Array<{
    id: string;
    expiryDate: string;
    description: string;
    ignoreExpiration: boolean;
    file?: File | null;
    isExisting?: boolean;
    documentId?: string;
    fileUrl?: string;
    fileName?: string;
    documentType?: string;
  }>>([]);
  const [newDocument, setNewDocument] = useState({
    expiryDate: '',
    description: '',
    ignoreExpiration: false,
    file: null as File | null,
    documentType: 'Other' // Default document type
  });

  // Form state for Safety Certifications
  const [certifications, setCertifications] = useState<Array<{
    id: string;
    expiryDate: string;
    description: string;
    ignoreExpiration: boolean;
    file?: File | null;
    fileUrl?: string | null;
    fileName?: string | null;
  }>>([]);
  const [newCertification, setNewCertification] = useState({
    expiryDate: '',
    description: '',
    ignoreExpiration: false,
    file: null as File | null
  });
  const [certificationFile, setCertificationFile] = useState<File | null>(null);
  const [confirmDeleteCertification, setConfirmDeleteCertification] = useState<{ open: boolean; cert: any | null }>({ open: false, cert: null });
  const [selectedCertificate, setSelectedCertificate] = useState<{
    id: string;
    expiryDate: string;
    title: string;
    description: string;
    result: string;
    ignoreExpiration: boolean;
  } | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<Record<string, { name: string; size: number }>>({});
  const [documentFile, setDocumentFile] = useState<{ name: string; size: number } | null>(null);
  const [editingDocumentId, setEditingDocumentId] = useState<string | null>(null);
  const [editingCertificationId, setEditingCertificationId] = useState<string | null>(null);

  // Form state for Violations (Internal HR/safety/compliance issues)
  const [violations, setViolations] = useState<Array<{
    id: string;
    violationType: string;
    title: string;
    description: string;
    dateOfIncident: string;
    reportedBy: string;
    severity: string;
    actionTaken: string;
    status: string;
    file?: File | null;
    fileUrl?: string | null;
    fileName?: string | null;
  }>>([]);
  const [newViolation, setNewViolation] = useState({
    violationType: '',
    title: '',
    description: '',
    dateOfIncident: '',
    reportedBy: '',
    severity: '',
    actionTaken: '',
    status: '',
    file: null as File | null
  });
  const [violationFile, setViolationFile] = useState<File | null>(null);
  const [editingViolationId, setEditingViolationId] = useState<string | null>(null);

  // Form state for Tickets (fines, citations - static only)
  const [tickets, setTickets] = useState<Array<{
    id: string;
    date: string;
    title: string;
    description: string;
    amount: string;
    currency: string;
    status: string;
    file?: File | null;
    fileUrl?: string | null;
    fileName?: string | null;
    ticketId?: string; // MongoDB _id for existing tickets
  }>>([]);
  const [newTicket, setNewTicket] = useState({
    date: '',
    title: '',
    description: '',
    amount: '',
    currency: 'CAD',
    status: 'Unpaid',
    file: null as File | null
  });
  const [ticketFile, setTicketFile] = useState<File | null>(null);
  const [editingTicketId, setEditingTicketId] = useState<string | null>(null);
  const [selectedTicket, setSelectedTicket] = useState<{
    id: string;
    date: string;
    title: string;
    description: string;
    amount: string;
    currency: string;
    status: string;
  } | null>(null);
  const [confirmDeleteTicket, setConfirmDeleteTicket] = useState<{ open: boolean; ticket: any | null }>({ open: false, ticket: null });

  // Form state for Drug Test
  const [drugTests, setDrugTests] = useState<Array<{
    id: string;
    date: string;
    result: string;
    labName: string;
    file?: File | null;
    fileUrl?: string | null;
    fileName?: string | null;
    isExisting?: boolean;
    drugTestId?: string;
  }>>([]);
  const [newDrugTest, setNewDrugTest] = useState({
    date: '',
    result: '',
    labName: '',
    file: null as File | null
  });
  const [drugTestFile, setDrugTestFile] = useState<{ name: string; size: number } | null>(null);
  const [editingDrugTestId, setEditingDrugTestId] = useState<string | null>(null);
  const [drugTestPasswordVerified, setDrugTestPasswordVerified] = useState(false);
  const [showDrugTestPasswordModal, setShowDrugTestPasswordModal] = useState(false);
  const [drugTestPassword, setDrugTestPassword] = useState('');
  const [drugTestPasswordError, setDrugTestPasswordError] = useState('');
  const [verifyingPassword, setVerifyingPassword] = useState(false);

  // Form state for Notes
  const [notes, setNotes] = useState<Array<{
    id: string;
    note: string;
    category: string;
  }>>([]);
  const [newNote, setNewNote] = useState({
    note: '',
    category: ''
  });
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);

  // Form state for Deductions
  const [deductions, setDeductions] = useState<Array<{
    id: string;
    startDate: string;
    description: string;
    amount: string;
    interval: string;
    currency: string;
  }>>([]);
  const [newDeduction, setNewDeduction] = useState({
    startDate: '',
    description: '',
    amount: '0',
    interval: '',
    currency: 'CAD'
  });
  const [editingDeductionId, setEditingDeductionId] = useState<string | null>(null);

  // Form state for Additions
  const [additions, setAdditions] = useState<Array<{
    id: string;
    startDate: string;
    description: string;
    amount: string;
    interval: string;
    currency: string;
  }>>([]);
  const [newAddition, setNewAddition] = useState({
    startDate: '',
    description: '',
    amount: '0',
    interval: '',
    currency: 'CAD'
  });
  const [editingAdditionId, setEditingAdditionId] = useState<string | null>(null);

  // Form state for Onboarding & Tests
  const [, setOnboardingStatus] = useState<'PENDING_TESTS' | 'IN_PROGRESS' | 'WAITING_FOR_HR_APPROVAL' | 'APPROVED' | 'REJECTED'>('PENDING_TESTS');
  const [handlesHazardousLoads, setHandlesHazardousLoads] = useState<boolean>(false);
  const [winterTestRequired, setWinterTestRequired] = useState<boolean>(false);
  const [approvedByHR, setApprovedByHR] = useState<boolean>(false);
  const [approvedAt, setApprovedAt] = useState<string>('');
  const [driverTests, setDriverTests] = useState<Array<{
    id: string;
    testType: 'TDG' | 'VEHICLE' | 'HOS' | 'WINTER';
    score: number;
    passed: boolean;
    attempts: number;
    completedAt: string;
    hrApproved?: boolean;
    hrRejected?: boolean;
    hrApprovedBy?: string;
    hrApprovedAt?: string;
    hrRejectionReason?: string;
  }>>([]);
  const [loadingTests, setLoadingTests] = useState(false);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [selectedTest, setSelectedTest] = useState<{
    id: string;
    testType: string;
    action: 'approve' | 'reject';
  } | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  // Flag update modal state
  const [showFlagModal, setShowFlagModal] = useState(false);
  const [selectedFlag, setSelectedFlag] = useState<{
    flagName: 'handlesHazardousLoads' | 'winterTestRequired';
    newValue: boolean;
    currentValue: boolean;
  } | null>(null);

  // Fetch test results for a driver
  const fetchDriverTestResults = async (driverId: string) => {
    try {
      setLoadingTests(true);
      console.log('📊 Fetching test results for driver:', driverId);

      const response = await getTestResults({ driverId });

      console.log('📊 Test results response:', response);

      if (response?.success && response.data) {
        const tests = Array.isArray(response.data) ? response.data : [];

        // Group by test type and get only the latest (most recent) result for each type
        const testsByType = new Map<string, any>();

        tests.forEach((test: any) => {
          const testType = test.testType || 'TDG';
          const existing = testsByType.get(testType);

          // If no existing test for this type, or this one is more recent, use this one
          const testDate = new Date(test.createdAt || test.updatedAt || test.completedAt || 0);
          const existingDate = existing ? new Date(existing.createdAt || existing.updatedAt || existing.completedAt || 0) : new Date(0);

          if (!existing || testDate > existingDate) {
            testsByType.set(testType, test);
          }
        });

        // Convert map to array and format
        const formattedTests = Array.from(testsByType.values()).map((test: any) => {
          // Handle hrApprovedBy - could be populated object or just ID string
          let hrApprovedByName = '';
          if (test.hrApprovedBy) {
            if (typeof test.hrApprovedBy === 'object' && test.hrApprovedBy.name) {
              hrApprovedByName = test.hrApprovedBy.name;
            } else if (typeof test.hrApprovedBy === 'string') {
              // If it's just an ID string, we'll need to fetch the user name separately
              // For now, leave it empty - the backend should populate it
              hrApprovedByName = '';
            }
          }

          return {
            id: test._id || test.id,
            testType: test.testType || 'TDG',
            score: test.score || 0,
            passed: test.passed || false,
            attempts: test.attempts || 1,
            completedAt: test.createdAt || test.completedAt || '',
            hrApproved: test.hrApproved || false,
            hrRejected: test.hrRejected || false,
            hrApprovedBy: hrApprovedByName,
            hrApprovedAt: test.hrApprovedAt || '',
            hrRejectionReason: test.hrRejectionReason || ''
          };
        });

        // Sort by test type for consistent display
        formattedTests.sort((a, b) => {
          const order = ['VEHICLE', 'HOS', 'TDG', 'WINTER'];
          return order.indexOf(a.testType) - order.indexOf(b.testType);
        });

        setDriverTests(formattedTests);
        console.log(`✅ Test results loaded (${formattedTests.length} unique tests - latest per type)`);
      } else {
        setDriverTests([]);
        console.log('⚠️ No test results found');
      }
    } catch (error: any) {
      console.error('❌ Error fetching test results:', error);
      setDriverTests([]);
      addNotification('error', 'Failed to load test results');
    } finally {
      setLoadingTests(false);
    }
  };

  // Open approval modal
  const openApprovalModal = (test: any, action: 'approve' | 'reject') => {
    setSelectedTest({
      id: test.id,
      testType: test.testType,
      action
    });
    setRejectionReason('');
    setShowApprovalModal(true);
  };

  // Close approval modal
  const closeApprovalModal = () => {
    setShowApprovalModal(false);
    setSelectedTest(null);
    setRejectionReason('');
  };

  // Handle drug test password verification
  const handleDrugTestPasswordVerify = async () => {
    if (!drugTestPassword.trim()) {
      setDrugTestPasswordError('Please enter a password');
      return;
    }

    if (verifyingPassword) return;

    try {
      setVerifyingPassword(true);
      setDrugTestPasswordError('');

      console.log('🔐 Calling verifyDrugTestPassword API with password:', drugTestPassword ? '***' : 'empty');
      const response = await verifyDrugTestPassword(drugTestPassword);
      console.log('📥 API Response received:', response);

      if (response && response.success === true) {
        console.log('✅ Password verified successfully');
        setDrugTestPasswordVerified(true);
        setShowDrugTestPasswordModal(false);
        setActiveFormTab('drugtest');
        setDrugTestPassword('');
        setDrugTestPasswordError('');
        addNotification('success', 'Password verified. Access granted.');
      } else {
        const errorMessage = response?.message || 'Incorrect password. Please enter your account password.';
        console.log('❌ Password verification failed:', errorMessage);
        setDrugTestPasswordError(errorMessage);
        setDrugTestPassword('');
      }
    } catch (error: any) {
      console.error('❌ Exception in handleDrugTestPasswordVerify:', error);
      console.error('❌ Error details:', {
        message: error?.message,
        response: error?.response?.data,
        status: error?.response?.status
      });
      const errorMessage = error?.response?.data?.message || error?.message || 'Failed to verify password. Please enter your account password and try again.';
      setDrugTestPasswordError(errorMessage);
      setDrugTestPassword('');
    } finally {
      setVerifyingPassword(false);
    }
  };

  // Handle test approval
  const handleTestApproval = async () => {
    if (!selectedTest) return;

    try {
      console.log('📝 Approving test:', selectedTest.id);

      const response = await approveTestResult(selectedTest.id);

      if (response?.success) {
        addNotification('success', 'Test approved successfully');
        closeApprovalModal();
        window.dispatchEvent(new Event('notification:refetch'));

        // Refresh driver details and test results
        if (editingId) {
          // Reload driver data - this will trigger useEffect and refresh all data
          await fetchDriverTestResults(editingId);
          // Also reload the full driver data to update onboarding status
          await loadDriverForEdit(editingId);
        } else if (editingDriver?._id) {
          await fetchDriverTestResults(editingDriver._id);
          await loadDriverForEdit(editingDriver._id);
        }
      } else {
        addNotification('error', response?.message || 'Failed to approve test');
      }
    } catch (error: any) {
      console.error('❌ Error approving test:', error);
      addNotification('error', error.response?.data?.message || 'Failed to approve test');
    }
  };

  // Handle test rejection
  const handleTestRejection = async () => {
    if (!selectedTest) return;

    try {
      console.log('📝 Rejecting test:', selectedTest.id, 'Reason:', rejectionReason);

      const response = await rejectTestResult(selectedTest.id, rejectionReason || undefined);

      if (response?.success) {
        addNotification('success', 'Test rejected successfully');
        closeApprovalModal();
        window.dispatchEvent(new Event('notification:refetch'));

        // Refresh driver details and test results
        if (editingId) {
          // Reload driver data - this will trigger useEffect and refresh all data
          await fetchDriverTestResults(editingId);
          // Also reload the full driver data to update onboarding status
          await loadDriverForEdit(editingId);
        } else if (editingDriver?._id) {
          await fetchDriverTestResults(editingDriver._id);
          await loadDriverForEdit(editingDriver._id);
        }
      } else {
        addNotification('error', response?.message || 'Failed to reject test');
      }
    } catch (error: any) {
      console.error('❌ Error rejecting test:', error);
      addNotification('error', error.response?.data?.message || 'Failed to reject test');
    }
  };

  // Fetch drivers from API
  const fetchDrivers = async () => {
    try {
      setLoading(true);
      // Determine assignment parameter based on activeTab
      let assignmentParam: 'all' | 'assigned' | 'unassigned' = 'all';
      if (activeTab === 'unassigned') {
        assignmentParam = 'unassigned';
      } else if (activeTab === 'external') {
        // External drivers are those assigned to orders (we'll use 'assigned' for now)
        assignmentParam = 'assigned';
      }

      // Use dispatcher endpoint which supports assignment filtering and returns counts
      const response = await listDriver({
        page: 1,
        limit: 1000,
        assignment: assignmentParam
      });

      if (response?.success && response.data) {
        // Store counts from API response
        if (response.count !== undefined && response.assignedDrivers !== undefined && response.unassignedDrivers !== undefined) {
          setDriverCounts({
            total: response.count || 0,
            assigned: response.assignedDrivers || 0,
            unassigned: response.unassignedDrivers || 0
          });
        }

        // Transform backend data to match Driver interface
        const transformedDrivers: Driver[] = response.data.map((driver: any) => {
          // Handle name field (could be name string or firstName/lastName)
          const nameParts = driver.name ? driver.name.split(' ') : [];
          const firstName = driver.firstName || nameParts[0] || '';
          const lastName = driver.lastName || nameParts.slice(1).join(' ') || '';

          return {
            _id: driver._id,
            driverId: driver.driverId || driver.internalId?.toString() || driver._id?.slice(-6).toUpperCase() || 'N/A',
            firstName: firstName,
            lastName: lastName,
            driversLicence: driver.driversLicence || driver.details?.licenceNumber || driver.details?.driversLicence || '',
            passport: driver.passport || driver.details?.passport || driver.details?.passportNumber || '',
            dateOfBirth: driver.dateOfBirth || (driver.details?.dateOfBirth ? new Date(driver.details.dateOfBirth).toISOString().split('T')[0] : '') || (driver.dob ? new Date(driver.dob).toISOString().split('T')[0] : ''),
            notes: driver.notes || driver.details?.notes || '',
            ticketYTD: driver.ticketYTD || driver.details?.ticketYTD || 0,
            status: driver.status || 'ACTIVE',
            compliance: driver.compliance || 'NON-COMPLIANT',
            complianceDetails: driver.complianceDetails,
            email: driver.email,
            phone: driver.phone,
            mobile: driver.mobile || driver.details?.cell1,
            company: driver.company,
            profileImageUrl: driver.profileImageUrl || null
          };
        });

        setDrivers(transformedDrivers);
      } else {
        console.error('Failed to fetch drivers:', response);
        setDrivers([]);
      }
    } catch (error) {
      console.error('Error fetching drivers:', error);
      setDrivers([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch drivers on component mount and when activeTab changes
  useEffect(() => {
    fetchDrivers();

  }, [activeTab]);

  // Load driver data when editing - extracted as reusable function
  const loadDriverForEdit = async (driverId?: string) => {
    const idToLoad = driverId || editingId;
    if (idToLoad) {
      try {
        console.log('🔄 Loading driver for edit, ID:', idToLoad);
        const response = await driverApi.getDriverById(idToLoad);
        console.log('📥 Driver API response:', response);
        console.log('📥 Response success:', response?.success);
        console.log('📥 Response data:', response?.data);
        console.log('📥 Full response keys:', Object.keys(response || {}));

        // Handle different response structures
        // The API might return { success: true, data: {...} } or just the driver object directly
        let driver = null;

        // Check if response has success: false
        if (response?.success === false) {
          console.error('❌ API returned success: false', response);
          throw new Error(response?.message || 'Failed to load driver data');
        }

        // Try to extract driver data from different possible structures
        if (response?.success === true && response?.data) {
          // Standard structure: { success: true, data: {...} }
          driver = response.data;
          console.log('📦 Driver documents from API:', driver.documents?.length || 0, driver.documents);
        } else if (response?.data) {
          // Has data property but success might be undefined
          driver = response.data;
          console.log('📦 Driver documents from API (alt):', driver.documents?.length || 0, driver.documents);
        } else if (response && typeof response === 'object' && (response._id || response.name || response.email || response.internalId)) {
          // Response is the driver object directly (no wrapper)
          driver = response;
        }

        console.log('🔍 Extracted driver:', driver);
        console.log('🔍 Driver has _id:', driver?._id);
        console.log('🔍 Driver has name:', driver?.name);
        console.log('🔍 Driver has email:', driver?.email);

        if (driver && (driver._id || driver.name || driver.email || driver.internalId)) {
          console.log('✅ Driver data loaded:', driver);
          // Parse name into parts
          const nameParts = (driver.name || '').split(' ');
          const firstName = nameParts[0] || '';
          const middle = nameParts.length > 2 ? nameParts.slice(1, -1).join(' ') : '';
          const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : '';

          // Format date of birth
          let dateOfBirthFormatted = '';
          if (driver.details?.dateOfBirth) {
            try {
              const dob = new Date(driver.details.dateOfBirth);
              if (!isNaN(dob.getTime())) {
                dateOfBirthFormatted = dob.toISOString().split('T')[0];
              }
            } catch (e) {
              console.error('Error parsing dateOfBirth:', e);
            }
          } else if (driver.dob) {
            try {
              const dob = new Date(driver.dob);
              if (!isNaN(dob.getTime())) {
                dateOfBirthFormatted = dob.toISOString().split('T')[0];
              }
            } catch (e) {
              console.error('Error parsing dob:', e);
            }
          }

          console.log('📝 Setting form data with:', {
            driverId: driver.internalId,
            firstName,
            lastName,
            email: driver.email,
            phone: driver.phone,
            address: driver.location?.address || driver.address
          });

          setFormData({
            driverId: driver.internalId || '',
            firstName: firstName,
            middle: middle,
            lastName: lastName,
            emailAddress: driver.email || '',
            dateOfBirth: dateOfBirthFormatted,
            mobileApp: driver.mobileApp || false,
            pin: '',
            primaryPhone: (() => {
              setPinIsExisting(true);
              const parsed = parsePhoneNumber(driver.phone, countries);
              setPrimaryPhoneCountry(parsed.countryCode);
              return parsed.phoneNumber;
            })(),
            secondaryPhone: (() => {
              const secondary = driver.details?.cell1 || driver.details?.cell2 || driver.mobile;
              const parsed = parsePhoneNumber(secondary, countries);
              setSecondaryPhoneCountry(parsed.countryCode);
              return parsed.phoneNumber;
            })(),
            searchAddress: '',
            address: driver.location?.address || driver.address || '',
            unit: driver.location?.unit || driver.unit || '',
            city: driver.city || driver.location?.city || '',
            postalCode: driver.postalCode || driver.location?.postalCode || driver.details?.postalCode || '',
            country: driver.country || '',
            stateProvince: driver.state || driver.location?.state || '',
            profileImage: null
          });

          // Set profile image preview if exists
          if (driver.profileImageUrl) {
            setProfileImagePreview(driver.profileImageUrl);
          } else {
            setProfileImagePreview(null);
          }

          // Set personal data
          setPersonalData({
            socialInsuranceNumber: driver.details?.sinNo || driver.sinNo || '',
            hireDate: (() => {
              // Prefer details.hireDate, fallback to joinDate, then hireDate
              const hireDateValue = driver.details?.hireDate || driver.hireDate || driver.joinDate;
              return hireDateValue ? new Date(hireDateValue).toISOString().split('T')[0] : '';
            })(),
            terminationDate: (() => {
              const termDateValue = driver.details?.termDate || driver.termDate;
              return termDateValue ? new Date(termDateValue).toISOString().split('T')[0] : '';
            })(),
            status: driver.status === 'active' || driver.status === 'ACTIVE' ? 'Active' : 'Inactive',
            vacationPercent: driver.details?.vacationPay || driver.vacationPay || '',
            corporationName: driver.details?.incorporation || driver.incorporation || '',
            driverName: driver.details?.driverName || driver.driverName || '',
            paymentAddress: driver.details?.paymentAddress || driver.paymentAddress || '',
            paymentSearchAddress: driver.details?.paymentSearchAddress || '',
            paymentCity: driver.details?.paymentCity || '',
            paymentPostalCode: driver.details?.paymentPostalCode || '',
            paymentCountry: driver.details?.paymentCountry || '',
            paymentStateProvince: driver.details?.paymentStateProvince || '',
            gstNo: driver.details?.gstNo || driver.gstNo || '',
            driverType: (driver.details?.companyFlag || driver.companyFlag) ? 'OWNER OPERATOR' : 'COMPANY DRIVER',
            paymentMethod: driver.details?.paymentMethod || driver.paymentMethod || 'PAID PER MILE',
            alone: String(driver.alone || driver.details?.mileRate || 0),
            empty: String(driver.empty || driver.details?.emptyMileRate || 0),
            bonusDrop: String(driver.bonusDrop || driver.details?.bonusDrop || 0),
            team: String(driver.team || driver.details?.mileRateTeam || 0),
            emptyTeam: String(driver.emptyTeam || driver.details?.emptyMileRateTeam || 0),
            bonusPick: String(driver.bonusPick || driver.details?.bonusPick || 0),
            bonusLayover: String(driver.bonusLayover || driver.details?.bonusLayover || 0),
            percentRate: String(driver.percentageRate || driver.details?.percentageRate || 0),
            perTripAmount: '0',
            hourlyRate: String(driver.hourlyRate || driver.details?.hourlyRate || 0),
            dailyRate: '0',
            driverTypeSolo: driver.details?.driverTypeSolo !== undefined ? driver.details.driverTypeSolo : (driver.driverTypeSolo !== undefined ? driver.driverTypeSolo : (driver.solo !== undefined ? driver.solo : true)),
            cross_border_eligible: driver.details?.cross_border_eligible !== undefined ? driver.details.cross_border_eligible : (driver.cross_border_eligible !== undefined ? driver.cross_border_eligible : false),
            cppExempt: driver.details?.cppQppExempt || driver.cppQppExempt || false,
            payrollTaxExempt: driver.details?.provTaxExempt || driver.provTaxExempt || false,
            customHst: driver.details?.customHst || driver.customHst || '',
            gender: driver.details?.gender || driver.gender || '',
            citizenship: driver.details?.citizenship || driver.citizenship || ''
          });

          // Set travel data with all fields (check top-level first, then details for backward compatibility)
          setTravelData({
            driversLicenseNumber: driver.licenceNumber || driver.details?.licenceNumber || driver.details?.driversLicence || '',
            driversLicenseExpiry: (() => {
              const expiryValue = driver.licenceExpiry || driver.details?.licenceExpiry;
              return expiryValue ? new Date(expiryValue).toISOString().split('T')[0] : '';
            })(),
            licenseStateProvince: driver.licenceState || driver.details?.licenceState || '',
            passportNumber: driver.passport || driver.details?.passport || driver.details?.passportNumber || '',
            passportCountry: driver.passportCountry || driver.details?.passportCountry || '',
            passportExpiry: (() => {
              const expiryValue = driver.passportExpiry || driver.details?.passportExpiry;
              return expiryValue ? new Date(expiryValue).toISOString().split('T')[0] : '';
            })(),
            fastCardNumber: driver.fastCard || driver.details?.fastCardNo || '',
            fastCardExpiry: (() => {
              const expiryValue = driver.fastCardExpiry || driver.details?.fastCardExpiry;
              return expiryValue ? new Date(expiryValue).toISOString().split('T')[0] : '';
            })(),
            fastCardValid: driver.fastCardValid !== undefined ? driver.fastCardValid : (driver.details?.fastCardValid || false),
            sinNumber: driver.sinNo || driver.details?.sinNo || driver.socialInsuranceNumber || '',
            canadianWorkerStatus: (driver.canadianWorkerStatus || driver.details?.canadianWorkerStatus || 'PERMANENT RESIDENT') as 'CANADIAN CITIZEN' | 'PERMANENT RESIDENT' | 'WORK PERMIT',
            permanentResidenceExpiry: (() => {
              const expiryValue = driver.permanentResidenceExpiry || driver.details?.permanentResidenceExpiry;
              return expiryValue ? new Date(expiryValue).toISOString().split('T')[0] : '';
            })(),
            workPermitExpiry: (() => {
              const expiryValue = driver.workPermitExpiry || driver.details?.workPermitExpiry;
              return expiryValue ? new Date(expiryValue).toISOString().split('T')[0] : '';
            })(),
            wcbNumber: driver.wsibAccountNo || driver.details?.wsibAccountNo || '',
            workPermitDocument: null,
            prCardDocument: null,
            existingWorkPermitUrl: driver.workPermitDocumentUrl || driver.details?.workPermitDocumentUrl || null,
            existingPrCardUrl: driver.prCardDocumentUrl || driver.details?.prCardDocumentUrl || null
          });



          try {
            let documentsToUse: EmployeeDocument[] = [];
            if (driver.documents && Array.isArray(driver.documents) && driver.documents.length > 0) {
              documentsToUse = driver.documents;
              console.log(`✅ Using ${documentsToUse.length} documents from getDriverById response`);
            } else {
              console.log('⚠️ No documents found in getDriverById response');
              documentsToUse = [];
            }

            if (documentsToUse.length > 0) {
              // Show all documents without filtering by tab
              const existingDocuments = documentsToUse.map((doc: EmployeeDocument) => ({
                id: `existing-${doc._id}`,
                expiryDate: doc.expiryDate ? new Date(doc.expiryDate).toISOString().split('T')[0] : '',
                description: doc.description || doc.documentType || '',
                ignoreExpiration: doc.ignoreExpiration || false,
                file: null,
                isExisting: true,
                documentId: doc._id,
                fileUrl: doc.fileUrl || '',
                fileName: doc.fileName || '',
                documentType: doc.documentType || 'Other'
              }));
              setDocuments(existingDocuments);
              console.log(`✅ Documents loaded (${existingDocuments.length} documents)`);
            } else {
              console.log('⚠️ No documents found for this driver');
              setDocuments([]);
            }
          } catch (docError) {
            console.error('Error loading documents:', docError);
            setDocuments([]);
          }

          // Load certifications (Safety Certifications) from getDriverById response
          try {
            if (driver.certifications && Array.isArray(driver.certifications) && driver.certifications.length > 0) {
              const existingCertifications = driver.certifications.map((cert: any) => ({
                id: `existing-${cert._id}`,
                expiryDate: cert.expiryDate ? new Date(cert.expiryDate).toISOString().split('T')[0] : '',
                description: cert.description || '',
                ignoreExpiration: cert.ignoreExpiration || false,
                file: cert.fileName ? { name: cert.fileName, size: cert.fileSize || 0 } : null,
                fileUrl: cert.fileUrl || null,
                fileName: cert.fileName || null
              }));
              setCertifications(existingCertifications);
              console.log(`✅ Certifications loaded (${existingCertifications.length} certifications)`);
            } else {
              console.log('⚠️ No certifications found for this driver');
              setCertifications([]);
            }
          } catch (certError) {
            console.error('Error loading certifications:', certError);
            setCertifications([]);
          }

          // Load tickets (Tickets & Fines) from getDriverById response
          try {
            if (driver.tickets && Array.isArray(driver.tickets) && driver.tickets.length > 0) {
              const existingTickets = driver.tickets.map((ticket: any) => ({
                id: `existing-${ticket._id}`,
                ticketId: ticket._id, // Store MongoDB ID for signed URL
                date: ticket.date ? new Date(ticket.date).toISOString().split('T')[0] : '',
                title: ticket.title || '',
                description: ticket.description || '',
                amount: ticket.amount?.toString() || '0',
                currency: ticket.currency || 'CAD',
                status: ticket.status || 'Unpaid',
                file: null, // Don't set file for existing tickets (it's a File object, not needed for display)
                fileUrl: ticket.fileUrl || null, // Include fileUrl for displaying existing files
                fileName: ticket.fileName || null // Include fileName for displaying existing files
              }));
              setTickets(existingTickets);
              console.log(`✅ Tickets loaded (${existingTickets.length} tickets)`, existingTickets.map((t: any) => ({ id: t.id, ticketId: t.ticketId, hasFile: !!t.fileUrl, fileName: t.fileName })));
            } else {
              console.log('⚠️ No tickets found for this driver');
              setTickets([]);
            }
          } catch (ticketError) {
            console.error('Error loading tickets:', ticketError);
            setTickets([]);
          }

          // Load violations (Violations) from getDriverById response
          try {
            if (driver.violations && Array.isArray(driver.violations) && driver.violations.length > 0) {
              const existingViolations = driver.violations.map((vio: any) => ({
                id: `existing-${vio._id}`,
                violationType: vio.violationType || vio.type || '',
                title: vio.title || vio.ticketInfo?.ticketNumber || vio.ticket || '',
                description: vio.description || '',
                dateOfIncident: vio.dateOfIncident || (vio.date ? new Date(vio.date).toISOString().split('T')[0] : ''),
                reportedBy: vio.reportedBy || '',
                severity: vio.severity || '',
                actionTaken: vio.actionTaken || '',
                status: vio.status || '',
                file: null, // Don't set file for existing violations (it's a File object, not needed for display)
                fileUrl: vio.fileUrl || null, // Include fileUrl for displaying existing files
                fileName: vio.fileName || null // Include fileName for displaying existing files
              }));
              setViolations(existingViolations);
              console.log(`✅ Violations loaded (${existingViolations.length} violations)`, existingViolations.map((v: any) => ({ id: v.id, hasFile: !!v.fileUrl, fileName: v.fileName })));
            } else {
              console.log('⚠️ No violations found for this driver');
              setViolations([]);
            }
          } catch (vioError) {
            console.error('Error loading violations:', vioError);
            setViolations([]);
          }

          // Load drug tests from getDriverById response
          try {
            if (driver.drugTests && Array.isArray(driver.drugTests) && driver.drugTests.length > 0) {
              const existingDrugTests = driver.drugTests.map((dt: any, index: number) => {
                // Handle date formatting - ensure we get a valid date string
                let dateValue = '';
                if (dt.date) {
                  try {
                    if (typeof dt.date === 'string') {
                      dateValue = dt.date.split('T')[0];
                    } else if (dt.date instanceof Date) {
                      dateValue = dt.date.toISOString().split('T')[0];
                    } else {
                      dateValue = new Date(dt.date).toISOString().split('T')[0];
                    }
                  } catch (e) {
                    console.error('Error parsing date:', e, dt.date);
                    dateValue = '';
                  }
                }

                return {
                  id: dt._id ? `existing-${dt._id}` : `drug-test-${index}`,
                  drugTestId: dt._id || null, // Store MongoDB ID if available
                  date: dateValue,
                  result: dt.result || '',
                  labName: dt.labName || dt.lab || '',
                  file: null, // Don't set file for existing drug tests
                  fileUrl: dt.fileUrl || null, // This should already be a signed URL from backend
                  fileName: dt.fileName || null,
                  fileSize: dt.fileSize || null,
                  mimeType: dt.mimeType || null,
                  isExisting: true
                };
              });
              setDrugTests(existingDrugTests);
              console.log(`✅ Drug tests loaded (${existingDrugTests.length} drug tests)`, existingDrugTests.map((dt: any) => ({ id: dt.id, drugTestId: dt.drugTestId, hasFile: !!dt.fileUrl, fileName: dt.fileName })));
            } else {
              console.log('⚠️ No drug tests found for this driver');
              setDrugTests([]);
            }
          } catch (dtError) {
            console.error('Error loading drug tests:', dtError);
            setDrugTests([]);
          }

          // Load deductions (Payroll Deductions) from getDriverById response
          try {
            if (driver.deductions && Array.isArray(driver.deductions) && driver.deductions.length > 0) {
              const existingDeductions = driver.deductions.map((ded: any) => ({
                id: `existing-${ded._id}`,
                startDate: ded.startDate ? new Date(ded.startDate).toISOString().split('T')[0] : '',
                description: ded.name || ded.description || '',
                amount: ded.amount?.toString() || '0',
                interval: ded.recurrence || ded.interval || '',
                currency: ded.currency || 'CAD' // Use currency from API response
              }));
              setDeductions(existingDeductions);
              console.log(`✅ Deductions loaded (${existingDeductions.length} deductions)`);
            } else {
              console.log('⚠️ No deductions found for this driver');
              setDeductions([]);
            }
          } catch (dedError) {
            console.error('Error loading deductions:', dedError);
            setDeductions([]);
          }

          // Load additions (Payroll Additions) from getDriverById response
          try {
            if (driver.additions && Array.isArray(driver.additions) && driver.additions.length > 0) {
              const existingAdditions = driver.additions.map((add: any) => ({
                id: `existing-${add._id}`,
                startDate: add.startDate ? new Date(add.startDate).toISOString().split('T')[0] : '',
                description: add.name || add.description || '',
                amount: add.amount?.toString() || '0',
                interval: add.recurrence || add.interval || '',
                currency: add.currency || 'CAD' // Use currency from API response
              }));
              setAdditions(existingAdditions);
              console.log(`✅ Additions loaded (${existingAdditions.length} additions)`);
            } else {
              console.log('⚠️ No additions found for this driver');
              setAdditions([]);
            }
          } catch (addError) {
            console.error('Error loading additions:', addError);
            setAdditions([]);
          }

          // Load notes
          let notesArray: Array<{ id: string; note: string; category: string }> = [];
          if (driver.details?.notes || driver.notes) {
            if (Array.isArray(driver.details?.notes)) {
              notesArray = driver.details.notes.map((note: any, index: number) => ({
                id: note.id || `note-${index}`,
                note: typeof note === 'string' ? note : (note.note || note.text || ''),
                category: note.category || ''
              }));
            } else if (driver.details?.notes || driver.notes) {
              const noteText = driver.details?.notes || driver.notes || '';
              notesArray = [{ id: '1', note: noteText, category: '' }];
            }
            setNotes(notesArray);
          } else {
            setNotes([]);
          }

          // Load onboarding data
          try {
            // Load onboarding status
            if (driver.onboardingStatus) {
              setOnboardingStatus(driver.onboardingStatus);
            } else {
              setOnboardingStatus('PENDING_TESTS');
            }

            // Load hazardous loads flag
            console.log('📋 Loading driver flags from backend:', {
              handlesHazardousLoads: driver.handlesHazardousLoads,
              winterTestRequired: driver.winterTestRequired,
              driverId: driver._id || driver.id,
              hasHandlesHazardousLoads: driver.handlesHazardousLoads !== undefined,
              hasWinterTestRequired: driver.winterTestRequired !== undefined
            });

            if (driver.handlesHazardousLoads !== undefined) {
              const value = Boolean(driver.handlesHazardousLoads);
              console.log('✅ Setting handlesHazardousLoads to:', value, 'type:', typeof value);
              setHandlesHazardousLoads(value);
            } else {
              console.log('⚠️ handlesHazardousLoads not found, defaulting to false');
              setHandlesHazardousLoads(false);
            }

            // Load winter test flag
            if (driver.winterTestRequired !== undefined) {
              const value = Boolean(driver.winterTestRequired);
              console.log('✅ Setting winterTestRequired to:', value, 'type:', typeof value);
              setWinterTestRequired(value);
            } else {
              console.log('⚠️ winterTestRequired not found, defaulting to false');
              setWinterTestRequired(false);
            }

            console.log('📊 Flags loaded. Final state will be:', {
              handlesHazardousLoads: Boolean(driver.handlesHazardousLoads || false),
              winterTestRequired: Boolean(driver.winterTestRequired || false)
            });

            // Store driver object for flag update timestamp display
            setEditingDriver(driver);

            // Load HR approval data
            if (driver.approvedByHR !== undefined) {
              setApprovedByHR(driver.approvedByHR);
            } else {
              setApprovedByHR(false);
            }

            if (driver.approvedAt) {
              setApprovedAt(new Date(driver.approvedAt).toISOString().split('T')[0]);
            } else {
              setApprovedAt('');
            }

            // Fetch test results from API
            await fetchDriverTestResults(driver._id);
          } catch (onboardingError) {
            console.error('Error loading onboarding data:', onboardingError);
            // Set defaults
            setOnboardingStatus('PENDING_TESTS');
            setHandlesHazardousLoads(false);
            setWinterTestRequired(false);
            setApprovedByHR(false);
            setApprovedAt('');
            setDriverTests([]);
          }

          // Store original data for comparison (after state updates)
          // Capture current state values for original data snapshot
          const currentNotes = notesArray;
          const currentDocuments = documents;
          const currentCertifications = certifications;
          const currentViolations = violations;
          const currentDeductions = deductions;
          const currentAdditions = additions;

          setTimeout(() => {
            // Parse phone numbers for original data (same as formData)
            const originalPrimaryParsed = parsePhoneNumber(driver.phone, countries);
            const originalSecondary = driver.details?.cell1 || driver.details?.cell2 || driver.mobile;
            const originalSecondaryParsed = parsePhoneNumber(originalSecondary, countries);

            // Store original data snapshot
            setOriginalDriverData({
              formData: {
                driverId: driver.internalId || '',
                firstName: firstName,
                middle: middle,
                lastName: lastName,
                emailAddress: driver.email || '',
                dateOfBirth: dateOfBirthFormatted,
                mobileApp: driver.mobileApp || false,
                pin: '',
                primaryPhone: originalPrimaryParsed.phoneNumber,
                secondaryPhone: originalSecondaryParsed.phoneNumber,
                searchAddress: '',
                address: driver.location?.address || driver.address || '',
                unit: driver.location?.unit || driver.unit || '',
                city: driver.city || driver.location?.city || '',
                postalCode: driver.postalCode || driver.location?.postalCode || driver.details?.postalCode || '',
                country: driver.country || '',
                stateProvince: driver.state || driver.location?.state || '',
                profileImage: null
              },
              personalData: {
                socialInsuranceNumber: driver.details?.sinNo || driver.sinNo || '',
                hireDate: (() => {
                  const hireDateValue = driver.details?.hireDate || driver.hireDate || driver.joinDate;
                  return hireDateValue ? new Date(hireDateValue).toISOString().split('T')[0] : '';
                })(),
                terminationDate: (() => {
                  const termDateValue = driver.details?.termDate || driver.termDate;
                  return termDateValue ? new Date(termDateValue).toISOString().split('T')[0] : '';
                })(),
                status: driver.status === 'active' || driver.status === 'ACTIVE' ? 'Active' : 'Inactive',
                vacationPercent: driver.details?.vacationPay || driver.vacationPay || '',
                corporationName: driver.details?.incorporation || driver.incorporation || '',
                driverName: driver.details?.driverName || driver.driverName || '',
                paymentAddress: driver.details?.paymentAddress || driver.paymentAddress || '',
                paymentSearchAddress: driver.details?.paymentSearchAddress || '',
                paymentCity: driver.details?.paymentCity || '',
                paymentPostalCode: driver.details?.paymentPostalCode || '',
                paymentCountry: driver.details?.paymentCountry || '',
                paymentStateProvince: driver.details?.paymentStateProvince || '',
                gstNo: driver.details?.gstNo || driver.gstNo || '',
                driverType: (driver.details?.companyFlag || driver.companyFlag) ? 'OWNER OPERATOR' : 'COMPANY DRIVER',
                paymentMethod: driver.details?.paymentMethod || driver.paymentMethod || 'PAID PER MILE',
                alone: String(driver.alone || driver.details?.mileRate || 0),
                empty: String(driver.empty || driver.details?.emptyMileRate || 0),
                bonusDrop: String(driver.bonusDrop || driver.details?.bonusDrop || 0),
                team: String(driver.team || driver.details?.mileRateTeam || 0),
                emptyTeam: String(driver.emptyTeam || driver.details?.emptyMileRateTeam || 0),
                bonusPick: String(driver.bonusPick || driver.details?.bonusPick || 0),
                bonusLayover: String(driver.bonusLayover || driver.details?.bonusLayover || 0),
                percentRate: String(driver.percentageRate || driver.details?.percentageRate || 0),
                perTripAmount: '0',
                hourlyRate: String(driver.hourlyRate || driver.details?.hourlyRate || 0),
                dailyRate: '0',
                driverTypeSolo: driver.details?.driverTypeSolo !== undefined ? driver.details.driverTypeSolo : (driver.driverTypeSolo !== undefined ? driver.driverTypeSolo : (driver.solo !== undefined ? driver.solo : true)),
                cross_border_eligible: driver.details?.cross_border_eligible !== undefined ? driver.details.cross_border_eligible : (driver.cross_border_eligible !== undefined ? driver.cross_border_eligible : false),
                cppExempt: driver.details?.cppQppExempt || driver.cppQppExempt || false,
                payrollTaxExempt: driver.details?.provTaxExempt || driver.provTaxExempt || false,
                customHst: driver.details?.customHst || driver.customHst || '',
                gender: driver.details?.gender || driver.gender || '',
                citizenship: driver.details?.citizenship || driver.citizenship || ''
              },
              travelData: {
                driversLicenseNumber: driver.licenceNumber || driver.details?.licenceNumber || driver.details?.driversLicence || '',
                driversLicenseExpiry: (() => {
                  const expiryValue = driver.licenceExpiry || driver.details?.licenceExpiry;
                  return expiryValue ? new Date(expiryValue).toISOString().split('T')[0] : '';
                })(),
                licenseStateProvince: driver.licenceState || driver.details?.licenceState || '',
                passportNumber: driver.passport || driver.details?.passport || driver.details?.passportNumber || '',
                passportCountry: driver.passportCountry || driver.details?.passportCountry || '',
                passportExpiry: (() => {
                  const expiryValue = driver.passportExpiry || driver.details?.passportExpiry;
                  return expiryValue ? new Date(expiryValue).toISOString().split('T')[0] : '';
                })(),
                fastCardNumber: driver.fastCard || driver.details?.fastCardNo || '',
                fastCardExpiry: (() => {
                  const expiryValue = driver.fastCardExpiry || driver.details?.fastCardExpiry;
                  return expiryValue ? new Date(expiryValue).toISOString().split('T')[0] : '';
                })(),
                fastCardValid: driver.fastCardValid !== undefined ? driver.fastCardValid : (driver.details?.fastCardValid || false),
                sinNumber: driver.sinNo || driver.details?.sinNo || driver.socialInsuranceNumber || '',
                canadianWorkerStatus: (driver.canadianWorkerStatus || driver.details?.canadianWorkerStatus || 'PERMANENT RESIDENT') as 'CANADIAN CITIZEN' | 'PERMANENT RESIDENT' | 'WORK PERMIT',
                permanentResidenceExpiry: (() => {
                  const expiryValue = driver.permanentResidenceExpiry || driver.details?.permanentResidenceExpiry;
                  return expiryValue ? new Date(expiryValue).toISOString().split('T')[0] : '';
                })(),
                workPermitExpiry: (() => {
                  const expiryValue = driver.workPermitExpiry || driver.details?.workPermitExpiry;
                  return expiryValue ? new Date(expiryValue).toISOString().split('T')[0] : '';
                })(),
                wcbNumber: driver.wsibAccountNo || driver.details?.wsibAccountNo || '',
                workPermitDocument: null,
                prCardDocument: null,
                existingWorkPermitUrl: driver.workPermitDocumentUrl || driver.details?.workPermitDocumentUrl || null,
                existingPrCardUrl: driver.prCardDocumentUrl || driver.details?.prCardDocumentUrl || null
              },
              notes: currentNotes || [],
              documents: currentDocuments || [],
              certifications: currentCertifications || [],
              violations: currentViolations || [],
              deductions: currentDeductions || [],
              additions: currentAdditions || [],
              drugTests: drugTests || []
            });
            console.log('✅ Form data populated, opening modal');
            setShowNewDriverModal(true);
            setActiveFormTab('basic');
          }, 100);
        } else {
          console.error('❌ Failed to load driver - invalid driver data');
          console.error('Response:', JSON.stringify(response, null, 2));
          console.error('Driver object:', driver);
          console.error('Response type:', typeof response);
          console.error('Has success:', 'success' in (response || {}));
          console.error('Has data:', 'data' in (response || {}));
          alert('Failed to load driver data. The response structure may be incorrect. Please check console for details.');
          setEditingId(null);
        }
      } catch (error: any) {
        console.error('❌ Error loading driver for edit:', error);
        console.error('Error details:', {
          message: error?.message,
          response: error?.response,
          data: error?.response?.data
        });
        alert('Error loading driver data: ' + (error?.message || error?.response?.data?.message || 'Unknown error'));
        setEditingId(null);
      }
    } else {
      // Reset form when not editing
      setFormData({
        driverId: '',
        firstName: '',
        middle: '',
        lastName: '',
        emailAddress: '',
        dateOfBirth: '',
        mobileApp: false,
        pin: '',
        primaryPhone: '',
        secondaryPhone: '',
        searchAddress: '',
        address: '',
        unit: '',
        city: '',
        postalCode: '',
        country: '',
        stateProvince: '',
        profileImage: null
      });
      setPersonalData({
        socialInsuranceNumber: '',
        hireDate: '',
        terminationDate: '',
        status: 'Active',
        vacationPercent: '',
        corporationName: '',
        driverName: '',
        paymentAddress: '',
        paymentSearchAddress: '',
        paymentCity: '',
        paymentPostalCode: '',
        paymentCountry: '',
        paymentStateProvince: '',
        gstNo: '',
        driverType: 'COMPANY DRIVER',
        paymentMethod: 'PAID PER MILE',
        alone: '0',
        empty: '0',
        bonusDrop: '0',
        team: '0',
        emptyTeam: '0',
        bonusPick: '0',
        bonusLayover: '0',
        percentRate: '0',
        perTripAmount: '0',
        hourlyRate: '0',
        dailyRate: '0',
        driverTypeSolo: true,
        cross_border_eligible: false,
        cppExempt: false,
        payrollTaxExempt: false,
        customHst: '',
        gender: '',
        citizenship: ''
      });
      setTravelData({
        driversLicenseNumber: '',
        driversLicenseExpiry: '',
        licenseStateProvince: '',
        passportNumber: '',
        passportCountry: '',
        passportExpiry: '',
        fastCardNumber: '',
        fastCardExpiry: '',
        fastCardValid: false,
        sinNumber: '',
        canadianWorkerStatus: 'PERMANENT RESIDENT',
        permanentResidenceExpiry: '',
        workPermitExpiry: '',
        wcbNumber: '',
        workPermitDocument: null,
        prCardDocument: null,
        existingWorkPermitUrl: null,
        existingPrCardUrl: null
      });
      setDocuments([]);
      setNotes([]);
      setProfileImagePreview(null);
    }
  };

  // Load driver data when editingId changes
  useEffect(() => {
    loadDriverForEdit();
  }, [editingId]);

  // Note: Removed documentsTab reload effect since we're showing all documents together

  // Filter drivers based on active tab — memoized to avoid recomputing on unrelated state changes
  const filteredDrivers = useMemo(() => {
    let filtered = drivers;

    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        driver =>
          driver.driverId.toLowerCase().includes(term) ||
          driver.firstName.toLowerCase().includes(term) ||
          driver.lastName.toLowerCase().includes(term) ||
          driver.driversLicence.toLowerCase().includes(term) ||
          driver.passport.toLowerCase().includes(term)
      );
    }

    // Apply compliance status filter
    if (complianceStatus !== 'All') {
      const complianceMap: Record<string, Driver['compliance']> = {
        'Compliant': 'COMPLIANT',
        'Expiring Soon': 'EXPIRING SOON',
        'Non-Compliant': 'NON-COMPLIANT'
      };
      const mappedStatus = complianceMap[complianceStatus];
      if (mappedStatus) {
        filtered = filtered.filter(driver => driver.compliance === mappedStatus);
      }
    }

    // Apply sorting
    if (sortConfig.key) {
      filtered = [...filtered].sort((a, b) => {
        const aValue = a[sortConfig.key!];
        const bValue = b[sortConfig.key!];

        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return filtered;
  }, [drivers, searchTerm, complianceStatus, sortConfig]);

  // Sync scrollbar widths
  useEffect(() => {
    const syncScrollbarWidth = () => {
      if (tableScrollRef.current && topScrollContentRef.current) {
        const scrollWidth = tableScrollRef.current.scrollWidth;
        topScrollContentRef.current.style.width = `${scrollWidth}px`;
      }
    };

    // Use setTimeout to ensure table is rendered
    const timeoutId = setTimeout(syncScrollbarWidth, 0);
    window.addEventListener('resize', syncScrollbarWidth);
    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', syncScrollbarWidth);
    };
  }, [filteredDrivers]);

  const handleSort = (key: keyof Driver) => {
    setSortConfig(current => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const getSortIcon = (key: keyof Driver) => {
    if (sortConfig.key !== key) {
      return (
        <div className="flex flex-col">
          <ChevronUp className="w-3 h-3 text-secondary" />
          <ChevronDown className="w-3 h-3 text-secondary -mt-1" />
        </div>
      );
    }
    return sortConfig.direction === 'asc' ? (
      <ChevronUp className="w-3 h-3 text-primary" />
    ) : (
      <ChevronDown className="w-3 h-3 text-primary" />
    );
  };

  const getComplianceButtonClass = (compliance: Driver['compliance']) => {
    switch (compliance) {
      case 'COMPLIANT':
        return 'bg-[#10b981] text-white';
      case 'EXPIRING SOON':
        return 'bg-[#f59e0b] text-white';
      case 'NON-COMPLIANT':
        return 'bg-[#ef4444] text-white';
      default:
        return 'bg-[rgba(255,255,255,0.1)] text-secondary';
    }
  };

  const getTabCount = (tab: 'all' | 'external' | 'unassigned') => {
    // Use counts from backend API response
    switch (tab) {
      case 'all':
        return driverCounts.total || drivers.length || 0;
      case 'external':
        // External drivers are those assigned to orders
        return driverCounts.assigned || 0;
      case 'unassigned':
        // Unassigned drivers are those not assigned to any active order (as driver or coDriver)
        return driverCounts.unassigned || 0;
      default:
        return 0;
    }
  };

  const handleDelete = async (id: string) => {
    setDeleteConfirm({ show: true, driverId: id });
  };

  const addNotification = (type: NotificationType, message: string) => {
    const id = Date.now();
    setNotifications(prev => [...prev, { id, type, message }]);
  };

  const removeNotification = (id: number) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const confirmDeleteDriver = async () => {
    if (!deleteConfirm.driverId) return;

    try {
      const response = await driverApi.deleteDriver(deleteConfirm.driverId);
      if (response.success) {
        await fetchDrivers();
        addNotification('success', 'Driver deleted successfully!');
      } else {
        addNotification('error', response.message || 'Failed to delete driver');
      }
    } catch (error: any) {
      console.error('Error deleting driver:', error);
      addNotification('error', error.response?.data?.message || error.message || 'Failed to delete driver');
    } finally {
      setDeleteConfirm({ show: false, driverId: null });
    }
  };



  // Note: Removed getDocumentTypeFromTab function since we're not using tabs anymore




  // Validation function
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    // Basic Information Tab Validation
    if (!formData.firstName || !formData.firstName.trim()) {
      errors.firstName = 'First Name is required';
    }

    if (!formData.lastName || !formData.lastName.trim()) {
      errors.lastName = 'Last Name is required';
    }

    if (!formData.emailAddress || !formData.emailAddress.trim()) {
      errors.emailAddress = 'Email Address is required';
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.emailAddress)) {
        errors.emailAddress = 'Please provide a valid email address';
      }
    }

    if (!formData.dateOfBirth) {
      errors.dateOfBirth = 'Date of Birth is required';
    }

    if (!formData.primaryPhone || !formData.primaryPhone.trim()) {
      errors.primaryPhone = 'Primary Phone Number is required';
    } else {
      const phoneDigits = formData.primaryPhone.replace(/\D/g, '');
      if (phoneDigits.length < 10) {
        errors.primaryPhone = 'Primary phone number must be at least 10 digits';
      }
    }

    if (!formData.country) {
      errors.country = 'Country is required';
    }

    if (!formData.stateProvince) {
      errors.stateProvince = 'Province/State is required';
    }

    // Personal Information Tab Validation
    if (!personalData.status) {
      errors.status = 'Status is required';
    }

    // Travel Information Tab Validation
    if (!travelData.driversLicenseNumber || !travelData.driversLicenseNumber.trim()) {
      errors.driversLicenseNumber = 'Drivers License Number is required';
    }

    if (!travelData.driversLicenseExpiry) {
      errors.driversLicenseExpiry = 'Drivers License Expiry Date is required';
    }

    if (!travelData.passportNumber || !travelData.passportNumber.trim()) {
      errors.passportNumber = 'Passport Number is required';
    }

    if (!travelData.passportExpiry) {
      errors.passportExpiry = 'Passport Expiry Date is required';
    }

    // SIN Number Validation (mandatory)
    if (!travelData.sinNumber || !travelData.sinNumber.trim()) {
      errors.sinNumber = 'SIN Number is required';
    }

    // Document Validation based on Canadian Worker Status
    if (travelData.canadianWorkerStatus === 'WORK PERMIT') {
      if (!travelData.workPermitDocument && !travelData.existingWorkPermitUrl) {
        errors.workPermitDocument = 'Work Permit Document is required';
      }
    }
    if (travelData.canadianWorkerStatus === 'PERMANENT RESIDENT') {
      if (!travelData.prCardDocument && !travelData.existingPrCardUrl) {
        errors.prCardDocument = 'PR Card Document is required';
      }
    }

    // Violations Tab Validation
    violations.forEach((violation, index) => {
      if (!violation.violationType || !violation.violationType.trim()) {
        errors[`violationType_${index}`] = 'Type of Violation is required';
      }
    });

    // Set validation errors
    setValidationErrors(errors);

    // If there are errors, show detailed notification and switch to the first tab with errors
    if (Object.keys(errors).length > 0) {
      const errorCount = Object.keys(errors).length;

      // Create a detailed error message listing all missing fields
      const errorFields: string[] = [];

      if (errors.firstName) errorFields.push('First Name');
      if (errors.lastName) errorFields.push('Last Name');
      if (errors.emailAddress) errorFields.push('Email Address');
      if (errors.dateOfBirth) errorFields.push('Date of Birth');
      if (errors.primaryPhone) errorFields.push('Primary Phone');
      if (errors.country) errorFields.push('Country');
      if (errors.stateProvince) errorFields.push('Province/State');
      if (errors.status) errorFields.push('Status');
      if (errors.driversLicenseNumber) errorFields.push('Drivers License Number');
      if (errors.driversLicenseExpiry) errorFields.push('Drivers License Expiry Date');
      if (errors.passportNumber) errorFields.push('Passport Number');
      if (errors.passportExpiry) errorFields.push('Passport Expiry Date');

      // Create detailed error message
      let errorMessage = `Please complete the following required field${errorCount > 1 ? 's' : ''}: ${errorFields.join(', ')}`;

      // If message is too long, show summary
      if (errorMessage.length > 100) {
        errorMessage = `Please fix ${errorCount} required field${errorCount > 1 ? 's' : ''} before submitting. Missing: ${errorFields.slice(0, 3).join(', ')}${errorFields.length > 3 ? ` and ${errorFields.length - 3} more` : ''}`;
      }

      addNotification('error', errorMessage);

      // Switch to the tab with the first error
      if (errors.firstName || errors.lastName || errors.emailAddress || errors.dateOfBirth || errors.primaryPhone || errors.country || errors.stateProvince) {
        setActiveFormTab('basic');
      } else if (errors.status) {
        setActiveFormTab('personal');
      } else if (errors.driversLicenseNumber || errors.driversLicenseExpiry || errors.passportNumber || errors.passportExpiry) {
        setActiveFormTab('travel');
      }

      return false;
    }

    return true;
  };

  const handleSaveDriver = async () => {
    try {
      setIsSubmitting(true);

      // Clear previous validation errors
      setValidationErrors({});

      // Validate form
      if (!validateForm()) {
        setIsSubmitting(false);
        return;
      }

      // Create FormData
      const driverFormData = new FormData();

      // Basic Information - always include these fields
      driverFormData.append('name', `${formData.firstName} ${formData.middle ? formData.middle + ' ' : ''}${formData.lastName}`.trim());
      if (formData.emailAddress) driverFormData.append('email', formData.emailAddress);

      // Primary Phone - include country code prefix
      if (formData.primaryPhone) {
        const primaryCountry = countries.find(c => c.code === primaryPhoneCountry);
        if (primaryCountry) {
          // Remove + from dial code for comparison
          const dialCodeWithoutPlus = primaryCountry.dialCode.replace('+', '');
          // Check if phone already starts with the dial code
          let phoneNumber = formData.primaryPhone;
          if (phoneNumber.startsWith(dialCodeWithoutPlus)) {
            // Phone already includes dial code, just add + prefix
            driverFormData.append('phone', `+${phoneNumber}`);
          } else {
            // Phone doesn't include dial code, add it
            driverFormData.append('phone', `${primaryCountry.dialCode}${phoneNumber}`);
          }
        } else {
          // Fallback if country not found
          driverFormData.append('phone', formData.primaryPhone.startsWith('+') ? formData.primaryPhone : `+${formData.primaryPhone}`);
        }
      }

      if (formData.country) driverFormData.append('country', formData.country);
      if (formData.driverId) driverFormData.append('internalId', formData.driverId);
      driverFormData.append('password', formData.pin || 'TempPassword123!'); // Default password if not provided
      driverFormData.append('role', 'driver');
      // Use status from personalData if available, otherwise default to 'active'
      const statusValue = personalData.status ? personalData.status.toLowerCase() : 'active';
      driverFormData.append('status', statusValue);

      // Mobile App Access - always send (true/false)
      driverFormData.append('mobileApp', String(formData.mobileApp));

      // Date of Birth
      if (formData.dateOfBirth) {
        driverFormData.append('dob', formData.dateOfBirth);
      }

      // Address Information
      if (formData.address) driverFormData.append('address', formData.address);
      if (formData.unit) driverFormData.append('unit', formData.unit);
      if (formData.city) driverFormData.append('city', formData.city);
      if (formData.stateProvince) driverFormData.append('state', formData.stateProvince);
      if (formData.postalCode) driverFormData.append('postalCode', formData.postalCode);

      // Personal Information
      if (personalData.socialInsuranceNumber) driverFormData.append('sinNo', personalData.socialInsuranceNumber);
      if (personalData.hireDate) driverFormData.append('joinDate', personalData.hireDate);
      if (personalData.gender) driverFormData.append('gender', personalData.gender);
      if (personalData.citizenship) driverFormData.append('citizenship', personalData.citizenship);

      // Employment Details - combine multiple fields into remark/employmentDetails
      // The backend stores this in details.remark field
      const employmentDetailsParts = [];
      if (personalData.corporationName) employmentDetailsParts.push(`Corporation: ${personalData.corporationName}`);
      if (personalData.driverName) employmentDetailsParts.push(`Driver Name: ${personalData.driverName}`);
      if (personalData.paymentAddress) employmentDetailsParts.push(`Payment Address: ${personalData.paymentAddress}`);
      if (personalData.gstNo) employmentDetailsParts.push(`GST No: ${personalData.gstNo}`);
      if (personalData.vacationPercent) employmentDetailsParts.push(`Vacation Percent: ${personalData.vacationPercent}`);
      if (employmentDetailsParts.length > 0) {
        driverFormData.append('employmentDetails', employmentDetailsParts.join('; '));
      }

      // Payment/Salary Information - Payment Rate Fields
      // Send payment method
      if (personalData.paymentMethod) {
        driverFormData.append('paymentMethod', personalData.paymentMethod);
      }

      // Payment rate fields (ALONE, EMPTY, TEAM, etc.)
      if (personalData.alone && personalData.alone !== '0') {
        driverFormData.append('mileRate', personalData.alone); // ALONE* = mileRate
      }
      if (personalData.empty && personalData.empty !== '0') {
        driverFormData.append('emptyMileRate', personalData.empty); // EMPTY* = emptyMileRate
      }
      if (personalData.team && personalData.team !== '0') {
        driverFormData.append('mileRateTeam', personalData.team); // TEAM* = mileRateTeam
      }
      if (personalData.emptyTeam && personalData.emptyTeam !== '0') {
        driverFormData.append('emptyMileRateTeam', personalData.emptyTeam); // EMPTY-TEAM* = emptyMileRateTeam
      }
      if (personalData.bonusDrop && personalData.bonusDrop !== '0') {
        driverFormData.append('bonusDrop', personalData.bonusDrop); // BONUS/DROP = bonusDrop
      }
      if (personalData.bonusPick && personalData.bonusPick !== '0') {
        driverFormData.append('bonusPick', personalData.bonusPick); // BONUS/PICK = bonusPick
      }
      if (personalData.bonusLayover && personalData.bonusLayover !== '0') {
        driverFormData.append('bonusLayover', personalData.bonusLayover); // BONUS/LAYOVER = bonusLayover
      }

      // Other payment fields
      if (personalData.percentRate && personalData.percentRate !== '0') {
        driverFormData.append('percentageRate', personalData.percentRate);
      }
      if (personalData.perTripAmount && personalData.perTripAmount !== '0') {
        driverFormData.append('perTripAmount', personalData.perTripAmount);
      }
      if (personalData.hourlyRate && personalData.hourlyRate !== '0') {
        driverFormData.append('hourlyRate', personalData.hourlyRate);
      }
      if (personalData.dailyRate && personalData.dailyRate !== '0') {
        driverFormData.append('dailyRate', personalData.dailyRate);
      }

      // For backward compatibility, also send salaryPerMile if alone is set
      if (personalData.paymentMethod === 'PAID PER MILE' && personalData.alone && personalData.alone !== '0') {
        driverFormData.append('salaryPerMile', personalData.alone);
      }

      // Personal Information - Additional fields
      // Removed incorporation: property does not exist on type
      if (personalData.driverName) driverFormData.append('driverName', personalData.driverName);
      // Payment Address - save full address for backward compatibility and separate fields
      if (personalData.paymentAddress) {
        // Build full address string for backward compatibility
        const paymentAddressParts = [
          personalData.paymentAddress,
          personalData.paymentCity,
          personalData.paymentStateProvince,
          personalData.paymentPostalCode,
          personalData.paymentCountry
        ].filter(Boolean);
        const fullPaymentAddress = paymentAddressParts.length > 0
          ? paymentAddressParts.join(', ')
          : personalData.paymentAddress;
        driverFormData.append('paymentAddress', fullPaymentAddress);
      }
      // Save separate payment address fields
      if (personalData.paymentCity) driverFormData.append('paymentCity', personalData.paymentCity);
      if (personalData.paymentPostalCode) driverFormData.append('paymentPostalCode', personalData.paymentPostalCode);
      if (personalData.paymentCountry) driverFormData.append('paymentCountry', personalData.paymentCountry);
      if (personalData.paymentStateProvince) driverFormData.append('paymentStateProvince', personalData.paymentStateProvince);
      if (personalData.paymentSearchAddress) driverFormData.append('paymentSearchAddress', personalData.paymentSearchAddress);
      if (personalData.gstNo) driverFormData.append('gstNo', personalData.gstNo);
      if (personalData.vacationPercent) driverFormData.append('vacationPay', personalData.vacationPercent);


      // Driver Type - Send companyFlag: true for OWNER OPERATOR, false for COMPANY DRIVER
      if (personalData.driverType) {
        const companyFlagValue = personalData.driverType === 'OWNER OPERATOR';
        driverFormData.append('companyFlag', String(companyFlagValue));
      }

      // Driver Type (SOLO/TEAM) - driverTypeSolo: true = SOLO, false = TEAM
      driverFormData.append('driverTypeSolo', String(personalData.driverTypeSolo !== undefined ? personalData.driverTypeSolo : true));
      // Also send as solo for backward compatibility
      driverFormData.append('solo', String(personalData.driverTypeSolo !== undefined ? personalData.driverTypeSolo : true));
      // Cross-border eligibility
      driverFormData.append('cross_border_eligible', String(personalData.cross_border_eligible !== undefined ? personalData.cross_border_eligible : false));

      // Exemption and additional fields
      driverFormData.append('cppExempt', String(personalData.cppExempt || false));
      driverFormData.append('payrollTaxExempt', String(personalData.payrollTaxExempt || false));
      if (personalData.customHst) driverFormData.append('customHst', personalData.customHst);

      // Mobile/Secondary Phone - include country code prefix
      if (formData.secondaryPhone) {
        const secondaryCountry = countries.find(c => c.code === secondaryPhoneCountry);
        if (secondaryCountry) {
          // Remove + from dial code for comparison
          const dialCodeWithoutPlus = secondaryCountry.dialCode.replace('+', '');
          let phoneNumber = formData.secondaryPhone;

          // If phone starts with the dial code, use it as is (just add + prefix)
          // Otherwise, prepend the dial code
          if (phoneNumber.startsWith(dialCodeWithoutPlus)) {
            driverFormData.append('mobile', `+${phoneNumber}`);
          } else {
            // Phone doesn't start with dial code, prepend it
            driverFormData.append('mobile', `${secondaryCountry.dialCode}${phoneNumber}`);
          }
        } else {
          // Fallback if country not found - add + if not present
          const phoneValue = formData.secondaryPhone.startsWith('+') ? formData.secondaryPhone : `+${formData.secondaryPhone}`;
          driverFormData.append('mobile', phoneValue);
        }
      }

      // Travel Information - Drivers License
      if (travelData.driversLicenseNumber) driverFormData.append('licenceNumber', travelData.driversLicenseNumber);
      // Note: createDriver doesn't accept licenceExpiry, licenceState, but we'll send them for consistency
      if (travelData.driversLicenseExpiry) driverFormData.append('licenceExpiry', travelData.driversLicenseExpiry);
      if (travelData.licenseStateProvince) driverFormData.append('licenceState', travelData.licenseStateProvince);

      // Travel Information - Passport
      if (travelData.passportNumber) driverFormData.append('passport', travelData.passportNumber);
      if (travelData.passportCountry) driverFormData.append('passportCountry', travelData.passportCountry);
      // Note: createDriver doesn't accept passportExpiry, but we'll send it for consistency
      if (travelData.passportExpiry) driverFormData.append('passportExpiry', travelData.passportExpiry);

      // Travel Information - Fast Card
      if (travelData.fastCardNumber) driverFormData.append('fastCard', travelData.fastCardNumber);
      // Note: createDriver doesn't accept fastCardExpiry, fastCardValid, but we'll send them for consistency
      if (travelData.fastCardExpiry) driverFormData.append('fastCardExpiry', travelData.fastCardExpiry);
      if (travelData.fastCardValid !== undefined && travelData.fastCardValid !== null) {
        driverFormData.append('fastCardValid', String(travelData.fastCardValid));
      }

      // Travel Information - SIN Number (mandatory, send from travel section)
      if (travelData.sinNumber) driverFormData.append('sinNo', travelData.sinNumber);

      // Travel Information - Canadian Worker Status
      // Note: createDriver doesn't accept these fields, but we'll send them for consistency
      if (travelData.canadianWorkerStatus) driverFormData.append('canadianWorkerStatus', travelData.canadianWorkerStatus);
      if (travelData.permanentResidenceExpiry) driverFormData.append('permanentResidenceExpiry', travelData.permanentResidenceExpiry);
      if (travelData.workPermitExpiry) driverFormData.append('workPermitExpiry', travelData.workPermitExpiry);
      if (travelData.wcbNumber) driverFormData.append('wsibAccountNo', travelData.wcbNumber);

      // Travel Information - Document Uploads
      if (travelData.workPermitDocument) {
        driverFormData.append('workPermitDocument', travelData.workPermitDocument);
      }
      if (travelData.prCardDocument) {
        driverFormData.append('prCardDocument', travelData.prCardDocument);
      }

      // Notes - send as JSON array for table data
      if (notes && notes.length > 0) {
        const notesData = notes.map(n => ({
          id: n.id,
          note: n.note,
          category: n.category
        }));
        driverFormData.append('notes', JSON.stringify(notesData));
        // Also keep the combined text version for backward compatibility
        const notesText = notes.map(n => `[${n.category}] ${n.note}`).join('\n');
        driverFormData.append('notesText', notesText);
      }

      // Documents - send as JSON array and append files
      if (documents && documents.length > 0) {
        const documentsData = documents.map((doc, index) => ({
          id: doc.id,
          expiryDate: doc.expiryDate || '',
          description: doc.description || '',
          ignoreExpiration: doc.ignoreExpiration || false,
          documentType: doc.documentType || 'Other',
          hasFile: !!doc.file,
          documentId: doc.documentId || '',
          index: index // Track index for file matching
        }));
        driverFormData.append('documents', JSON.stringify(documentsData));

        // Append document files directly (multer expects array, not indexed)
        documents.forEach((doc) => {
          if (doc.file) {
            driverFormData.append('documentFiles', doc.file);
            driverFormData.append('documentTypes', doc.documentType || 'Other');
          }
        });
      }

      // Certifications - send as JSON array
      if (certifications && certifications.length > 0) {
        const certificationsData = certifications.map(cert => ({
          id: cert.id,
          expiryDate: cert.expiryDate || '',
          description: cert.description || '',
          ignoreExpiration: cert.ignoreExpiration || false,
          fileUrl: cert.fileUrl || null,
          fileName: cert.fileName || null,
          hasFile: !!(cert.file instanceof File) // Only true if it's a new File object
        }));
        driverFormData.append('certifications', JSON.stringify(certificationsData));

        // Append certification files directly (only new File objects)
        certifications.forEach((cert) => {
          if (cert.file instanceof File) {
            driverFormData.append('certificationFiles', cert.file);
            console.log('📎 Appending certification file:', cert.file.name, cert.file.size, 'bytes');
          }
        });
      }

      // Tickets - send as JSON array
      if (tickets && tickets.length > 0) {
        const ticketsData = tickets.map(ticket => ({
          id: ticket.id,
          date: ticket.date || '',
          title: ticket.title || '',
          description: ticket.description || '',
          amount: ticket.amount || '0',
          currency: ticket.currency || 'CAD',
          status: ticket.status || 'Unpaid',
          fileUrl: ticket.fileUrl || null,
          fileName: ticket.fileName || null,
          hasFile: !!(ticket.file instanceof File) // Only true if it's a new File object
        }));
        driverFormData.append('tickets', JSON.stringify(ticketsData));
        console.log('🎫 Sending tickets:', ticketsData.length, 'tickets');

        // Append ticket files directly (multer expects array, not indexed)
        // Only append actual File objects (new files), not metadata from existing tickets
        tickets.forEach((ticket) => {
          if (ticket.file instanceof File) {
            driverFormData.append('ticketFiles', ticket.file);
            console.log('📎 Appending ticket file:', ticket.file.name, ticket.file.size, 'bytes');
          }
        });
      }

      // Violations - send as JSON array
      if (violations && violations.length > 0) {
        const violationsData = violations.map(viol => ({
          id: viol.id,
          violationType: viol.violationType || '',
          title: viol.title || '',
          description: viol.description || '',
          dateOfIncident: viol.dateOfIncident || '',
          reportedBy: viol.reportedBy || '',
          severity: viol.severity || '',
          actionTaken: viol.actionTaken || '',
          status: viol.status || '',
          fileUrl: viol.fileUrl || null,
          fileName: viol.fileName || null,
          hasFile: !!(viol.file instanceof File) // Only true if it's a new File object
        }));
        driverFormData.append('violations', JSON.stringify(violationsData));

        // Append violation files directly (multer expects array, not indexed)
        // Only append actual File objects (new files), not metadata from existing violations
        violations.forEach((vio) => {
          if (vio.file instanceof File) {
            driverFormData.append('violationFiles', vio.file);
            console.log('📎 Appending violation file:', vio.file.name, vio.file.size, 'bytes');
          }
        });
      }

      // Drug Tests - send as JSON array (always send, even if empty, so backend can clear deleted ones)
      const drugTestsData = (drugTests || []).map(dt => ({
        id: dt.id,
        date: dt.date || '',
        result: dt.result || '',
        labName: dt.labName || '',
        fileUrl: dt.fileUrl || null,
        fileName: dt.fileName || null,
        hasFile: !!(dt.file instanceof File), // Only true if it's a new File object
        drugTestId: dt.drugTestId || ''
      }));
      driverFormData.append('drugTests', JSON.stringify(drugTestsData));
      console.log('💊 Sending drug tests:', drugTestsData.length, 'drug tests');

      // Append drug test files directly (multer expects array, not indexed)
      // Only append actual File objects (new files), not metadata from existing drug tests
      if (drugTests && drugTests.length > 0) {
        drugTests.forEach((dt) => {
          if (dt.file instanceof File) {
            driverFormData.append('drugTestFiles', dt.file);
            console.log('📎 Appending drug test file:', dt.file.name, dt.file.size, 'bytes');
          }
        });
      }

      // Deductions - send as JSON array
      if (deductions && deductions.length > 0) {
        const deductionsData = deductions.map(ded => ({
          id: ded.id,
          startDate: ded.startDate || '',
          description: ded.description || '',
          amount: ded.amount || '0',
          interval: ded.interval || '',
          currency: ded.currency || 'CAD'
        }));
        driverFormData.append('deductions', JSON.stringify(deductionsData));
      }

      // Additions - send as JSON array
      if (additions && additions.length > 0) {
        const additionsData = additions.map(add => ({
          id: add.id,
          startDate: add.startDate || '',
          description: add.description || '',
          amount: add.amount || '0',
          interval: add.interval || '',
          currency: add.currency || 'CAD'
        }));
        driverFormData.append('additions', JSON.stringify(additionsData));
      }

      // Profile Image - backend expects 'file' field name
      if (formData.profileImage) {
        driverFormData.append('file', formData.profileImage);
      }

      // Debug: Log all FormData entries
      console.log('📤 Creating driver with data...');
      console.log('📋 FormData entries:');
      for (const [key, value] of driverFormData.entries()) {
        if (value instanceof File) {
          console.log(`  ${key}: [File] ${value.name} (${value.size} bytes)`);
        } else {
          console.log(`  ${key}: ${value}`);
        }
      }

      const response = await driverApi.createDriver(driverFormData);

      if (response?.success && response?.data?._id) {
        const driverId = response.data._id;
        console.log('✅ Driver created successfully with ID:', driverId);

        // All documents, deductions, and additions are now handled by the backend in a single API call
        // No need for separate API calls

        addNotification('success', 'Driver created successfully!');
        clearDriverDraft();

        // Reset form
        setFormData({
          driverId: '',
          firstName: '',
          middle: '',
          lastName: '',
          emailAddress: '',
          dateOfBirth: '',
          mobileApp: false,
          pin: '',
          primaryPhone: '',
          secondaryPhone: '',
          searchAddress: '',
          address: '',
          unit: '',
          city: '',
          postalCode: '',
          country: '',
          stateProvince: '',
          profileImage: null
        });
        setPersonalData({
          socialInsuranceNumber: '',
          hireDate: '',
          terminationDate: '',
          status: 'Active',
          vacationPercent: '',
          corporationName: '',
          driverName: '',
          paymentAddress: '',
          paymentSearchAddress: '',
          paymentCity: '',
          paymentPostalCode: '',
          paymentCountry: '',
          paymentStateProvince: '',
          gstNo: '',
          driverType: 'COMPANY DRIVER',
          paymentMethod: 'PAID PER MILE',
          alone: '0',
          empty: '0',
          bonusDrop: '0',
          team: '0',
          emptyTeam: '0',
          bonusPick: '0',
          bonusLayover: '0',
          percentRate: '0',
          perTripAmount: '0',
          hourlyRate: '0',
          dailyRate: '0',
          driverTypeSolo: true,
          cross_border_eligible: false,
          cppExempt: false,
          payrollTaxExempt: false,
          customHst: '',
          gender: '',
          citizenship: ''
        });
        setTravelData({
          driversLicenseNumber: '',
          driversLicenseExpiry: '',
          licenseStateProvince: '',
          passportNumber: '',
          passportCountry: '',
          passportExpiry: '',
          fastCardNumber: '',
          fastCardExpiry: '',
          fastCardValid: false,
          sinNumber: '',
          canadianWorkerStatus: 'PERMANENT RESIDENT',
          permanentResidenceExpiry: '',
          workPermitExpiry: '',
          wcbNumber: '',
          workPermitDocument: null,
          prCardDocument: null,
          existingWorkPermitUrl: null,
          existingPrCardUrl: null
        });
        // Reset all form state after successful creation
        setEditingId(null);
        setEditingDriver(null);
        setOriginalDriverData(null);
        resetAllFormState();
        setShowNewDriverModal(false);

        // Refresh drivers list
        await fetchDrivers();
      } else {
        addNotification('error', response?.message || 'Failed to create driver');
      }
    } catch (error: any) {
      console.error('Error creating driver:', error);
      addNotification('error', error.response?.data?.message || error.message || 'Failed to create driver');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExportDrivers = async () => {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Logistiq Innovation';
    workbook.created = new Date();
    const sheet = workbook.addWorksheet('Drivers', { views: [{ state: 'frozen', ySplit: 1 }] });

    sheet.columns = [
      { header: 'Driver ID', key: 'driverId', width: 18 },
      { header: 'First Name', key: 'firstName', width: 16 },
      { header: 'Last Name', key: 'lastName', width: 16 },
      { header: 'Email', key: 'email', width: 28 },
      { header: 'Phone', key: 'phone', width: 18 },
      { header: 'Date of Birth', key: 'dateOfBirth', width: 16 },
      { header: "Driver's Licence", key: 'driversLicence', width: 22 },
      { header: 'Passport', key: 'passport', width: 18 },
      { header: 'Status', key: 'status', width: 12 },
      { header: 'Compliance', key: 'compliance', width: 18 },
      { header: 'Notes', key: 'notes', width: 30 },
    ];

    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF42AEEC' } };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
    headerRow.height = 22;

    drivers.forEach((d: any) => {
      const row = sheet.addRow({
        driverId: d.driverId || '',
        firstName: d.firstName || '',
        lastName: d.lastName || '',
        email: d.email || '',
        phone: d.phone || '',
        dateOfBirth: d.dateOfBirth || '',
        driversLicence: d.driversLicence || '',
        passport: d.passport || '',
        status: d.status || '',
        compliance: d.compliance || '',
        notes: d.notes || '',
      });
      row.alignment = { vertical: 'middle' };
    });

    sheet.eachRow((row, i) => {
      if (i > 1) row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: i % 2 === 0 ? 'FFF0F9FF' : 'FFFFFFFF' } };
      row.eachCell(cell => { cell.border = { bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } } }; });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Drivers-${new Date().toISOString().split('T')[0]}.xlsx`;
    document.body.appendChild(a);
    a.click();
    URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  // Helper function to reset all form state
  const resetAllFormState = () => {
    // Clear validation errors
    setValidationErrors({});
    setPinIsExisting(false);
    setShowPin(false);

    // Reset all form data
    setFormData({
      driverId: '',
      firstName: '',
      middle: '',
      lastName: '',
      emailAddress: '',
      dateOfBirth: '',
      mobileApp: false,
      pin: '',
      primaryPhone: '',
      secondaryPhone: '',
      searchAddress: '',
      address: '',
      unit: '',
      city: '',
      postalCode: '',
      country: '',
      stateProvince: '',
      profileImage: null
    });

    // Reset personal data
    setPersonalData({
      socialInsuranceNumber: '',
      hireDate: '',
      terminationDate: '',
      status: 'Active',
      vacationPercent: '',
      corporationName: '',
      driverName: '',
      paymentAddress: '',
      paymentSearchAddress: '',
      paymentCity: '',
      paymentPostalCode: '',
      paymentCountry: '',
      paymentStateProvince: '',
      gstNo: '',
      driverType: 'COMPANY DRIVER',
      paymentMethod: 'PAID PER MILE',
      alone: '0',
      empty: '0',
      bonusDrop: '0',
      team: '0',
      emptyTeam: '0',
      bonusPick: '0',
      bonusLayover: '0',
      percentRate: '0',
      perTripAmount: '0',
      hourlyRate: '0',
      dailyRate: '0',
      driverTypeSolo: true,
      cross_border_eligible: false,
      cppExempt: false,
      payrollTaxExempt: false,
      customHst: '',
      gender: '',
      citizenship: ''
    });

    // Reset travel data
    setTravelData({
      driversLicenseNumber: '',
      driversLicenseExpiry: '',
      licenseStateProvince: '',
      passportNumber: '',
      passportCountry: '',
      passportExpiry: '',
      fastCardNumber: '',
      fastCardExpiry: '',
      fastCardValid: false,
      sinNumber: '',
      canadianWorkerStatus: 'PERMANENT RESIDENT',
      permanentResidenceExpiry: '',
      workPermitExpiry: '',
      wcbNumber: '',
      workPermitDocument: null,
      prCardDocument: null,
      existingWorkPermitUrl: null,
      existingPrCardUrl: null
    });

    // Reset documents
    setDocuments([]);

    // Reset certifications
    setCertifications([]);
    setNewCertification({
      expiryDate: '',
      description: '',
      ignoreExpiration: false,
      file: null
    });
    setCertificationFile(null);
    setSelectedCertificate(null);
    setEditingCertificationId(null);
    setUploadedFiles({});
    setDocumentFile(null);

    // Reset violations
    setViolations([]);
    setNewViolation({
      violationType: '',
      title: '',
      description: '',
      dateOfIncident: '',
      reportedBy: '',
      severity: '',
      actionTaken: '',
      status: '',
      file: null
    });
    setViolationFile(null);
    setEditingViolationId(null);

    // Reset drug tests
    setDrugTests([]);
    setNewDrugTest({
      date: '',
      result: '',
      labName: '',
      file: null
    });
    setDrugTestFile(null);
    setEditingDrugTestId(null);
    setDrugTestPasswordVerified(false);

    // Reset notes
    setNotes([]);
    setNewNote({
      note: '',
      category: ''
    });
    setEditingNoteId(null);
    setNewNote({
      note: '',
      category: ''
    });

    // Reset deductions
    setDeductions([]);
    setNewDeduction({
      startDate: '',
      description: '',
      amount: '0',
      interval: '',
      currency: 'CAD'
    });
    setEditingDeductionId(null);

    // Reset additions
    setAdditions([]);
    setNewAddition({
      startDate: '',
      description: '',
      amount: '0',
      interval: '',
      currency: 'CAD'
    });
    setEditingAdditionId(null);

    // Reset onboarding data
    setOnboardingStatus('PENDING_TESTS');
    setHandlesHazardousLoads(false);
    setWinterTestRequired(false);
    setApprovedByHR(false);
    setApprovedAt('');
    setDriverTests([]);

    // Reset other states
    setProfileImagePreview(null);
    setActiveFormTab('basic');
    setPrimaryPhoneCountry('US');
    setSecondaryPhoneCountry('US');
    setPrimaryCountryDropdownOpen(false);
    setSecondaryCountryDropdownOpen(false);
    setPrimaryCountrySearch('');
    setSecondaryCountrySearch('');
  };

  const handleCloseModal = () => {
    setShowNewDriverModal(false);
    setValidationErrors({});
    setEditingId(null);
    setEditingDriver(null);
    setOriginalDriverData(null); // Clear original data when closing
    resetAllFormState();
  };

  // Handle certification deletion confirmation
  const handleConfirmDeleteCertification = async () => {
    if (!confirmDeleteCertification.cert) return;

    const cert = confirmDeleteCertification.cert;
    try {
      // Check if it's an existing certification (ID starts with "existing-")
      if (cert.id && cert.id.toString().startsWith('existing-')) {
        const actualId = cert.id.toString().replace('existing-', '');
        const response = await driverApi.deleteTrainingCertificate(actualId);
        if (response?.success) {
          addNotification('success', 'Certification deleted successfully!');
        } else {
          addNotification('error', response?.message || 'Failed to delete certification');
        }
      }
      // Remove from local state
      setCertifications(certifications.filter(c => c.id !== cert.id));
      // Clear editing state if this was the certification being edited
      if (editingCertificationId === cert.id) {
        setEditingCertificationId(null);
        setNewCertification({
          expiryDate: '',
          description: '',
          ignoreExpiration: false,
          file: null
        });
        setCertificationFile(null);
      }
      // Clear selected certificate if it was this one
      if (selectedCertificate?.id === cert.id) {
        setSelectedCertificate(null);
      }
    } catch (error: any) {
      console.error('Error deleting certification:', error);
      addNotification('error', error.response?.data?.message || error.message || 'Failed to delete certification');
    } finally {
      setConfirmDeleteCertification({ open: false, cert: null });
    }
  };

  // Helper function to check if a value has changed
  const hasValueChanged = (current: any, original: any): boolean => {
    // Handle null/undefined
    if (current === null || current === undefined) {
      return original !== null && original !== undefined && original !== '';
    }
    if (original === null || original === undefined) {
      return current !== null && current !== undefined && current !== '';
    }

    // Convert to string for comparison (handles dates, numbers, etc.)
    const currentStr = String(current).trim();
    const originalStr = String(original).trim();

    return currentStr !== originalStr;
  };

  const handleUpdateDriver = async () => {
    if (!editingId || !originalDriverData) return;

    try {
      setIsSubmitting(true);

      // Clear previous validation errors
      setValidationErrors({});

      // Validate form
      if (!validateForm()) {
        setIsSubmitting(false);
        return;
      }

      // Create FormData - only include changed fields
      const driverFormData = new FormData();

      const original = originalDriverData;

      // Basic Information - only append if changed
      const fullName = `${formData.firstName} ${formData.middle ? formData.middle + ' ' : ''}${formData.lastName}`.trim();
      const originalName = `${original.formData.firstName} ${original.formData.middle ? original.formData.middle + ' ' : ''}${original.formData.lastName}`.trim();
      if (hasValueChanged(fullName, originalName)) {
        driverFormData.append('name', fullName);
      }

      if (hasValueChanged(formData.emailAddress, original.formData.emailAddress)) {
        driverFormData.append('email', formData.emailAddress);
      }

      if (hasValueChanged(formData.primaryPhone, original.formData.primaryPhone)) {
        const primaryCountry = countries.find(c => c.code === primaryPhoneCountry);
        if (primaryCountry) {
          // Remove + from dial code for comparison
          const dialCodeWithoutPlus = primaryCountry.dialCode.replace('+', '');
          let phoneNumber = formData.primaryPhone;

          // If phone starts with the dial code, use it as is (just add + prefix)
          // Otherwise, prepend the dial code
          if (phoneNumber.startsWith(dialCodeWithoutPlus)) {
            driverFormData.append('phone', `+${phoneNumber}`);
          } else {
            // Phone doesn't start with dial code, prepend it
            driverFormData.append('phone', `${primaryCountry.dialCode}${phoneNumber}`);
          }
        } else {
          // Fallback if country not found - add + if not present
          const phoneValue = formData.primaryPhone.startsWith('+') ? formData.primaryPhone : `+${formData.primaryPhone}`;
          driverFormData.append('phone', phoneValue);
        }
      }

      if (hasValueChanged(formData.country, original.formData.country)) {
        driverFormData.append('country', formData.country);
      }

      if (hasValueChanged(formData.driverId, original.formData.driverId)) {
        driverFormData.append('internalId', formData.driverId);
      }

      // PIN - only send if changed and not empty
      if (formData.pin && hasValueChanged(formData.pin, original.formData.pin)) {
        driverFormData.append('password', formData.pin);
      }

      // Mobile App Access
      if (hasValueChanged(formData.mobileApp, original.formData.mobileApp)) {
        driverFormData.append('mobileApp', String(formData.mobileApp));
      }

      // Date of Birth
      if (hasValueChanged(formData.dateOfBirth, original.formData.dateOfBirth)) {
        driverFormData.append('dob', formData.dateOfBirth);
      }

      // Address Information
      if (hasValueChanged(formData.address, original.formData.address)) {
        driverFormData.append('address', formData.address);
      }
      if (hasValueChanged(formData.unit, original.formData.unit)) {
        driverFormData.append('unit', formData.unit);
      }
      if (hasValueChanged(formData.city, original.formData.city)) {
        driverFormData.append('city', formData.city);
      }
      if (hasValueChanged(formData.stateProvince, original.formData.stateProvince)) {
        driverFormData.append('state', formData.stateProvince);
      }
      if (hasValueChanged(formData.postalCode, original.formData.postalCode)) {
        driverFormData.append('postalCode', formData.postalCode);
      }

      // Personal Information
      if (hasValueChanged(personalData.socialInsuranceNumber, original.personalData.socialInsuranceNumber)) {
        driverFormData.append('sinNo', personalData.socialInsuranceNumber);
      }
      if (hasValueChanged(personalData.hireDate, original.personalData.hireDate)) {
        driverFormData.append('hireDate', personalData.hireDate);
        // Also send as joinDate for backward compatibility
        driverFormData.append('joinDate', personalData.hireDate);
      }
      if (hasValueChanged(personalData.terminationDate, original.personalData.terminationDate)) {
        driverFormData.append('termDate', personalData.terminationDate);
      }
      if (hasValueChanged(personalData.vacationPercent, original.personalData.vacationPercent)) {
        driverFormData.append('vacationPay', personalData.vacationPercent);
      }
      if (hasValueChanged(personalData.corporationName, original.personalData.corporationName)) {
        driverFormData.append('incorporation', personalData.corporationName);
      }
      if (hasValueChanged(personalData.gstNo, original.personalData.gstNo)) {
        driverFormData.append('gstNo', personalData.gstNo);
      }
      if (hasValueChanged(personalData.driverType, original.personalData.driverType)) {
        // Send companyFlag: true for OWNER OPERATOR, false for COMPANY DRIVER
        const companyFlagValue = personalData.driverType === 'OWNER OPERATOR';
        driverFormData.append('companyFlag', String(companyFlagValue));
      }
      // Driver Type (SOLO/TEAM) - driverTypeSolo: true = SOLO, false = TEAM
      if (hasValueChanged(personalData.driverTypeSolo, original.personalData.driverTypeSolo)) {
        driverFormData.append('driverTypeSolo', String(personalData.driverTypeSolo));
        // Also send as solo for backward compatibility
        driverFormData.append('solo', String(personalData.driverTypeSolo));
      }
      // Cross-border eligibility
      if (hasValueChanged(personalData.cross_border_eligible, original.personalData.cross_border_eligible)) {
        driverFormData.append('cross_border_eligible', String(personalData.cross_border_eligible));
      }
      if (hasValueChanged(personalData.paymentMethod, original.personalData.paymentMethod)) {
        driverFormData.append('paymentMethod', personalData.paymentMethod);
      }
      // Exemption and additional fields
      if (hasValueChanged(personalData.cppExempt, original.personalData.cppExempt)) {
        driverFormData.append('cppExempt', String(personalData.cppExempt));
      }
      if (hasValueChanged(personalData.payrollTaxExempt, original.personalData.payrollTaxExempt)) {
        driverFormData.append('payrollTaxExempt', String(personalData.payrollTaxExempt));
      }
      if (hasValueChanged(personalData.customHst, original.personalData.customHst)) {
        driverFormData.append('customHst', personalData.customHst);
      }
      if (hasValueChanged(personalData.driverName, original.personalData.driverName)) {
        driverFormData.append('driverName', personalData.driverName);
      }
      // Payment Address - save full address for backward compatibility and separate fields
      if (hasValueChanged(personalData.paymentAddress, original.personalData.paymentAddress) ||
        hasValueChanged(personalData.paymentCity, original.personalData.paymentCity) ||
        hasValueChanged(personalData.paymentStateProvince, original.personalData.paymentStateProvince) ||
        hasValueChanged(personalData.paymentPostalCode, original.personalData.paymentPostalCode) ||
        hasValueChanged(personalData.paymentCountry, original.personalData.paymentCountry)) {
        // Build full address string for backward compatibility
        const paymentAddressParts = [
          personalData.paymentAddress,
          personalData.paymentCity,
          personalData.paymentStateProvince,
          personalData.paymentPostalCode,
          personalData.paymentCountry
        ].filter(Boolean);
        const fullPaymentAddress = paymentAddressParts.length > 0
          ? paymentAddressParts.join(', ')
          : personalData.paymentAddress;
        driverFormData.append('paymentAddress', fullPaymentAddress);
      }
      // Save separate payment address fields if changed
      if (hasValueChanged(personalData.paymentCity, original.personalData.paymentCity)) {
        driverFormData.append('paymentCity', personalData.paymentCity);
      }
      if (hasValueChanged(personalData.paymentPostalCode, original.personalData.paymentPostalCode)) {
        driverFormData.append('paymentPostalCode', personalData.paymentPostalCode);
      }
      if (hasValueChanged(personalData.paymentCountry, original.personalData.paymentCountry)) {
        driverFormData.append('paymentCountry', personalData.paymentCountry);
      }
      if (hasValueChanged(personalData.paymentStateProvince, original.personalData.paymentStateProvince)) {
        driverFormData.append('paymentStateProvince', personalData.paymentStateProvince);
      }
      if (hasValueChanged(personalData.paymentSearchAddress, original.personalData.paymentSearchAddress)) {
        driverFormData.append('paymentSearchAddress', personalData.paymentSearchAddress);
      }
      if (hasValueChanged(personalData.gender, original.personalData.gender)) {
        driverFormData.append('gender', personalData.gender);
      }
      if (hasValueChanged(personalData.citizenship, original.personalData.citizenship)) {
        driverFormData.append('citizenship', personalData.citizenship);
      }

      // Mobile/Secondary Phone
      if (hasValueChanged(formData.secondaryPhone, original.formData.secondaryPhone)) {
        const secondaryCountry = countries.find(c => c.code === secondaryPhoneCountry);
        if (secondaryCountry) {
          // Remove + from dial code for comparison
          const dialCodeWithoutPlus = secondaryCountry.dialCode.replace('+', '');
          let phoneNumber = formData.secondaryPhone;

          // If phone starts with the dial code, use it as is (just add + prefix)
          // Otherwise, prepend the dial code
          if (phoneNumber.startsWith(dialCodeWithoutPlus)) {
            driverFormData.append('mobile', `+${phoneNumber}`);
          } else {
            // Phone doesn't start with dial code, prepend it
            driverFormData.append('mobile', `${secondaryCountry.dialCode}${phoneNumber}`);
          }
        } else {
          // Fallback if country not found - add + if not present
          const phoneValue = formData.secondaryPhone.startsWith('+') ? formData.secondaryPhone : `+${formData.secondaryPhone}`;
          driverFormData.append('mobile', phoneValue);
        }
      }

      // Travel Information - Drivers License (always send if changed)
      if (hasValueChanged(travelData.driversLicenseNumber, original.travelData.driversLicenseNumber)) {
        driverFormData.append('licenceNumber', travelData.driversLicenseNumber || '');
        console.log('📤 Sending licenceNumber:', travelData.driversLicenseNumber, '(original:', original.travelData.driversLicenseNumber, ')');
      }
      if (hasValueChanged(travelData.driversLicenseExpiry, original.travelData.driversLicenseExpiry)) {
        driverFormData.append('licenceExpiry', travelData.driversLicenseExpiry || '');
        console.log('📤 Sending licenceExpiry:', travelData.driversLicenseExpiry, '(original:', original.travelData.driversLicenseExpiry, ')');
      }
      if (hasValueChanged(travelData.licenseStateProvince, original.travelData.licenseStateProvince)) {
        driverFormData.append('licenceState', travelData.licenseStateProvince || '');
        console.log('📤 Sending licenceState:', travelData.licenseStateProvince, '(original:', original.travelData.licenseStateProvince, ')');
      }

      // Travel Information - Passport
      if (hasValueChanged(travelData.passportNumber, original.travelData.passportNumber)) {
        driverFormData.append('passport', travelData.passportNumber);
      }
      if (hasValueChanged(travelData.passportCountry, original.travelData.passportCountry)) {
        driverFormData.append('passportCountry', travelData.passportCountry);
      }
      if (hasValueChanged(travelData.passportExpiry, original.travelData.passportExpiry)) {
        driverFormData.append('passportExpiry', travelData.passportExpiry);
      }

      // Travel Information - Fast Card
      if (hasValueChanged(travelData.fastCardNumber, original.travelData.fastCardNumber)) {
        driverFormData.append('fastCard', travelData.fastCardNumber);
      }
      if (hasValueChanged(travelData.fastCardExpiry, original.travelData.fastCardExpiry)) {
        driverFormData.append('fastCardExpiry', travelData.fastCardExpiry);
      }
      if (hasValueChanged(travelData.fastCardValid, original.travelData.fastCardValid)) {
        driverFormData.append('fastCardValid', String(travelData.fastCardValid));
      }

      // Travel Information - SIN Number (mandatory, send from travel section)
      if (hasValueChanged(travelData.sinNumber, original.travelData.sinNumber)) {
        driverFormData.append('sinNo', travelData.sinNumber || '');
      }

      // Travel Information - Canadian Worker Status (always send if changed)
      if (hasValueChanged(travelData.canadianWorkerStatus, original.travelData.canadianWorkerStatus)) {
        driverFormData.append('canadianWorkerStatus', travelData.canadianWorkerStatus || '');
        console.log('📤 Sending canadianWorkerStatus:', travelData.canadianWorkerStatus, '(original:', original.travelData.canadianWorkerStatus, ')');
      }
      if (hasValueChanged(travelData.permanentResidenceExpiry, original.travelData.permanentResidenceExpiry)) {
        driverFormData.append('permanentResidenceExpiry', travelData.permanentResidenceExpiry);
      }
      if (hasValueChanged(travelData.workPermitExpiry, original.travelData.workPermitExpiry)) {
        driverFormData.append('workPermitExpiry', travelData.workPermitExpiry);
      }
      if (hasValueChanged(travelData.wcbNumber, original.travelData.wcbNumber)) {
        driverFormData.append('wsibAccountNo', travelData.wcbNumber);
      }

      // Travel Information - Document Uploads (send if new files are selected)
      if (travelData.workPermitDocument) {
        driverFormData.append('workPermitDocument', travelData.workPermitDocument);
      }
      if (travelData.prCardDocument) {
        driverFormData.append('prCardDocument', travelData.prCardDocument);
      }

      // Profile Image - always send if a new file is selected
      if (formData.profileImage) {
        driverFormData.append('file', formData.profileImage);
      }

      // Certifications - send as JSON array if changed
      const originalCertifications = original.certifications || [];

      // Normalize certifications for comparison (only compare relevant fields)
      const normalizeCert = (cert: any) => ({
        id: cert.id || '',
        expiryDate: cert.expiryDate || '',
        description: cert.description || '',
        ignoreExpiration: cert.ignoreExpiration || false
      });

      const normalizedCurrent = certifications.map(normalizeCert).sort((a, b) => (a.id || '').localeCompare(b.id || ''));
      const normalizedOriginal = originalCertifications.map(normalizeCert).sort((a, b) => (a.id || '').localeCompare(b.id || ''));

      const certificationsChanged = JSON.stringify(normalizedCurrent) !== JSON.stringify(normalizedOriginal);

      console.log('📜 Certifications comparison:', {
        currentCount: certifications.length,
        originalCount: originalCertifications.length,
        changed: certificationsChanged,
        current: normalizedCurrent,
        original: normalizedOriginal
      });

      // Always send certifications if they exist (even if unchanged, to ensure backend has latest data)
      if (certifications && certifications.length > 0) {
        const certificationsData = certifications.map(cert => ({
          id: cert.id,
          expiryDate: cert.expiryDate || '',
          description: cert.description || '',
          ignoreExpiration: cert.ignoreExpiration || false,
          fileUrl: cert.fileUrl || null,
          fileName: cert.fileName || null,
          hasFile: !!(cert.file instanceof File) // Only true if it's a new File object
        }));
        driverFormData.append('certifications', JSON.stringify(certificationsData));
        console.log('📜 Sending certifications:', certificationsData.length, 'certifications');

        // Append certification files directly (only new File objects)
        certifications.forEach((cert) => {
          if (cert.file instanceof File) {
            driverFormData.append('certificationFiles', cert.file);
            console.log('📎 Appending certification file:', cert.file.name, cert.file.size, 'bytes');
          }
        });
      }

      // Documents - send as JSON array and append files
      if (documents && documents.length > 0) {
        const documentsData = documents.map((doc, index) => ({
          id: doc.id,
          expiryDate: doc.expiryDate || '',
          description: doc.description || '',
          ignoreExpiration: doc.ignoreExpiration || false,
          documentType: doc.documentType || 'Other',
          hasFile: !!doc.file,
          documentId: doc.documentId || '',
          index: index // Track index for file matching
        }));
        driverFormData.append('documents', JSON.stringify(documentsData));

        // Append document files directly (multer expects array, not indexed)
        documents.forEach((doc) => {
          if (doc.file) {
            driverFormData.append('documentFiles', doc.file);
            driverFormData.append('documentTypes', doc.documentType || 'Other');
          }
        });
        console.log('📄 Sending documents:', documentsData.length, 'documents');
      }

      // Tickets - send as JSON array (always send if exists, backend handles updates)
      if (tickets && tickets.length > 0) {
        const ticketsData = tickets.map(ticket => ({
          id: ticket.id,
          date: ticket.date || '',
          title: ticket.title || '',
          description: ticket.description || '',
          amount: ticket.amount || '0',
          currency: ticket.currency || 'CAD',
          status: ticket.status || 'Unpaid',
          fileUrl: ticket.fileUrl || null,
          fileName: ticket.fileName || null,
          hasFile: !!(ticket.file instanceof File) // Only true if it's a new File object
        }));
        driverFormData.append('tickets', JSON.stringify(ticketsData));
        console.log('🎫 Sending tickets:', ticketsData.length, 'tickets');

        // Append ticket files directly (multer expects array, not indexed)
        // Only append actual File objects (new files), not metadata from existing tickets
        tickets.forEach((ticket) => {
          if (ticket.file instanceof File) {
            driverFormData.append('ticketFiles', ticket.file);
            console.log('📎 Appending ticket file:', ticket.file.name, ticket.file.size, 'bytes');
          }
        });
      }

      // Violations - send as JSON array (always send if exists, backend handles updates)
      if (violations && violations.length > 0) {
        const violationsData = violations.map(vio => ({
          id: vio.id,
          violationType: vio.violationType || '',
          title: vio.title || '',
          description: vio.description || '',
          dateOfIncident: vio.dateOfIncident || '',
          reportedBy: vio.reportedBy || '',
          severity: vio.severity || '',
          actionTaken: vio.actionTaken || '',
          status: vio.status || '',
          fileUrl: vio.fileUrl || null,
          fileName: vio.fileName || null,
          hasFile: !!(vio.file instanceof File) // Only true if it's a new File object
        }));
        driverFormData.append('violations', JSON.stringify(violationsData));
        console.log('🚨 Sending violations:', violationsData.length, 'violations');

        // Append violation files directly (multer expects array, not indexed)
        // Only append actual File objects (new files), not metadata from existing violations
        violations.forEach((vio) => {
          if (vio.file instanceof File) {
            driverFormData.append('violationFiles', vio.file);
            console.log('📎 Appending violation file:', vio.file.name, vio.file.size, 'bytes');
          }
        });
      }

      // Drug Tests - send as JSON array (always send, even if empty, so backend can clear deleted ones)
      // Always send drugTests array to backend, even if empty, so backend knows to clear all drug tests
      const drugTestsData = (drugTests || []).map(dt => ({
        id: dt.id,
        date: dt.date || '',
        result: dt.result || '',
        labName: dt.labName || '',
        fileUrl: dt.fileUrl || null,
        fileName: dt.fileName || null,
        hasFile: !!(dt.file instanceof File), // Only true if it's a new File object
        drugTestId: dt.drugTestId || ''
      }));
      driverFormData.append('drugTests', JSON.stringify(drugTestsData));
      console.log('💊 Sending drug tests:', drugTestsData.length, 'drug tests');

      // Append drug test files directly (multer expects array, not indexed)
      // Only append actual File objects (new files), not metadata from existing drug tests
      if (drugTests && drugTests.length > 0) {
        drugTests.forEach((dt) => {
          if (dt.file instanceof File) {
            driverFormData.append('drugTestFiles', dt.file);
            console.log('📎 Appending drug test file:', dt.file.name, dt.file.size, 'bytes');
          }
        });
      }

      // Deductions - send as JSON array (always send if exists, backend handles updates)
      if (deductions && deductions.length > 0) {
        const deductionsData = deductions.map(ded => ({
          id: ded.id,
          startDate: ded.startDate || '',
          description: ded.description || '',
          amount: ded.amount || '0',
          interval: ded.interval || '',
          currency: ded.currency || 'CAD'
        }));
        driverFormData.append('deductions', JSON.stringify(deductionsData));
        console.log('💰 Sending deductions:', deductionsData.length, 'deductions');
      }

      // Additions - send as JSON array (always send if exists, backend handles updates)
      if (additions && additions.length > 0) {
        const additionsData = additions.map(add => ({
          id: add.id,
          startDate: add.startDate || '',
          description: add.description || '',
          amount: add.amount || '0',
          interval: add.interval || '',
          currency: add.currency || 'CAD'
        }));
        driverFormData.append('additions', JSON.stringify(additionsData));
        console.log('➕ Sending additions:', additionsData.length, 'additions');
      }

      // Log what's being sent
      console.log('📤 Updating driver with ID:', editingId);
      const changedFields = Array.from(driverFormData.keys());
      console.log('📋 Changed fields:', changedFields);

      // Check if there are documents, certifications, violations, tickets, deductions, or additions to send
      const hasDocuments = documents && documents.length > 0;
      const hasCertifications = certifications && certifications.length > 0;
      const hasTickets = tickets && tickets.length > 0;
      const hasViolations = violations && violations.length > 0;
      const hasDeductions = deductions && deductions.length > 0;
      const hasAdditions = additions && additions.length > 0;

      console.log('🔍 Update summary:', {
        changedFieldsCount: changedFields.length,
        hasProfileImage: !!formData.profileImage,
        hasDocuments,
        hasCertifications,
        hasTickets,
        hasViolations,
        hasDeductions,
        hasAdditions
      });

      // Only proceed if there are changes or related data to update
      if (changedFields.length === 0 && !formData.profileImage && !hasDocuments && !hasCertifications && !hasTickets && !hasViolations && !hasDeductions && !hasAdditions) {
        addNotification('info', 'No changes detected. Please modify at least one field before updating.');
        setIsSubmitting(false);
        return;
      }

      const response = await driverApi.updateDriver(editingId, driverFormData);

      if (response?.success) {
        console.log('✅ Driver updated successfully');

        // All documents, violations, deductions, and additions are now handled by the backend in a single API call
        // No need for separate API calls

        // Reload driver data to refresh the form with updated data
        if (editingId) {
          try {
            const driverResponse = await driverApi.getDriverById(editingId);
            if (driverResponse?.success && driverResponse.data) {
              const driver = driverResponse.data;

              // Update documents from response
              if (driver.documents && Array.isArray(driver.documents)) {
                // Show all documents without filtering
                const filteredDocuments = driver.documents;
                const existingDocuments = filteredDocuments.map((doc: EmployeeDocument) => ({
                  id: `existing-${doc._id}`,
                  expiryDate: doc.expiryDate ? new Date(doc.expiryDate).toISOString().split('T')[0] : '',
                  description: doc.description || doc.documentType || '',
                  ignoreExpiration: doc.ignoreExpiration || false,
                  file: null,
                  isExisting: true,
                  documentId: doc._id,
                  fileUrl: doc.fileUrl || '',
                  fileName: doc.fileName || '',
                  documentType: doc.documentType || 'Other'
                }));
                setDocuments(existingDocuments);
              }

              // Update certifications from response
              if (driver.certifications && Array.isArray(driver.certifications)) {
                const existingCertifications = driver.certifications.map((cert: any) => ({
                  id: `existing-${cert._id}`,
                  expiryDate: cert.expiryDate ? new Date(cert.expiryDate).toISOString().split('T')[0] : '',
                  title: cert.certificateName || cert.title || '',
                  description: cert.description || '',
                  result: cert.status || cert.result || 'pass',
                  ignoreExpiration: false
                }));
                setCertifications(existingCertifications);
              }

              // Update tickets from response
              if (driver.tickets && Array.isArray(driver.tickets)) {
                const existingTickets = driver.tickets.map((ticket: any) => ({
                  id: `existing-${ticket._id}`,
                  ticketId: ticket._id, // Store MongoDB ID for signed URL
                  date: ticket.date ? new Date(ticket.date).toISOString().split('T')[0] : '',
                  title: ticket.title || '',
                  description: ticket.description || '',
                  amount: ticket.amount?.toString() || '0',
                  currency: ticket.currency || 'CAD',
                  status: ticket.status || 'Unpaid',
                  file: null, // Don't set file for existing tickets (it's a File object, not needed for display)
                  fileUrl: ticket.fileUrl || null, // Include fileUrl for displaying existing files
                  fileName: ticket.fileName || null // Include fileName for displaying existing files
                }));
                setTickets(existingTickets);
                console.log('✅ Tickets reloaded after update:', existingTickets.map((t: any) => ({ id: t.id, ticketId: t.ticketId, hasFile: !!t.fileUrl, fileName: t.fileName })));
              }

              // Update violations from response
              if (driver.violations && Array.isArray(driver.violations)) {
                const existingViolations = driver.violations.map((vio: any) => ({
                  id: `existing-${vio._id}`,
                  violationType: vio.violationType || vio.type || '',
                  title: vio.title || vio.ticketInfo?.ticketNumber || vio.ticket || '',
                  description: vio.description || '',
                  dateOfIncident: vio.dateOfIncident || (vio.date ? new Date(vio.date).toISOString().split('T')[0] : ''),
                  reportedBy: vio.reportedBy || '',
                  severity: vio.severity || '',
                  actionTaken: vio.actionTaken || '',
                  status: vio.status || '',
                  file: null, // Don't set file for existing violations (it's a File object, not needed for display)
                  fileUrl: vio.fileUrl || null, // Include fileUrl for displaying existing files
                  fileName: vio.fileName || null // Include fileName for displaying existing files
                }));
                setViolations(existingViolations);
                console.log('✅ Violations reloaded after update:', existingViolations.map((v: any) => ({ id: v.id, hasFile: !!v.fileUrl, fileName: v.fileName })));
              }

              // Update deductions from response
              if (driver.deductions && Array.isArray(driver.deductions)) {
                const existingDeductions = driver.deductions.map((ded: any) => ({
                  id: `existing-${ded._id}`,
                  startDate: ded.startDate ? new Date(ded.startDate).toISOString().split('T')[0] : '',
                  description: ded.name || ded.description || '',
                  amount: ded.amount?.toString() || '0',
                  interval: ded.recurrence || ded.interval || '',
                  currency: ded.currency || 'CAD' // Use currency from API response
                }));
                setDeductions(existingDeductions);
              }

              // Update additions from response
              if (driver.additions && Array.isArray(driver.additions)) {
                const existingAdditions = driver.additions.map((add: any) => ({
                  id: `existing-${add._id}`,
                  startDate: add.startDate ? new Date(add.startDate).toISOString().split('T')[0] : '',
                  description: add.name || add.description || '',
                  amount: add.amount?.toString() || '0',
                  interval: add.recurrence || add.interval || '',
                  currency: add.currency || 'CAD' // Use currency from API response
                }));
                setAdditions(existingAdditions);
              }

              // Update travel data with fresh data from server
              setTravelData({
                driversLicenseNumber: driver.licenceNumber || driver.details?.licenceNumber || driver.details?.driversLicence || '',
                driversLicenseExpiry: (() => {
                  const expiryValue = driver.licenceExpiry || driver.details?.licenceExpiry;
                  return expiryValue ? new Date(expiryValue).toISOString().split('T')[0] : '';
                })(),
                licenseStateProvince: driver.licenceState || driver.details?.licenceState || '',
                passportNumber: driver.passport || driver.details?.passport || driver.details?.passportNumber || '',
                passportCountry: driver.passportCountry || driver.details?.passportCountry || '',
                passportExpiry: (() => {
                  const expiryValue = driver.passportExpiry || driver.details?.passportExpiry;
                  return expiryValue ? new Date(expiryValue).toISOString().split('T')[0] : '';
                })(),
                fastCardNumber: driver.fastCard || driver.details?.fastCardNo || '',
                fastCardExpiry: (() => {
                  const expiryValue = driver.fastCardExpiry || driver.details?.fastCardExpiry;
                  return expiryValue ? new Date(expiryValue).toISOString().split('T')[0] : '';
                })(),
                fastCardValid: driver.fastCardValid !== undefined ? driver.fastCardValid : (driver.details?.fastCardValid || false),
                sinNumber: driver.details?.sinNumber || travelData.sinNumber || '',
                canadianWorkerStatus: (driver.canadianWorkerStatus || driver.details?.canadianWorkerStatus || 'PERMANENT RESIDENT') as 'CANADIAN CITIZEN' | 'PERMANENT RESIDENT' | 'WORK PERMIT',
                permanentResidenceExpiry: (() => {
                  const expiryValue = driver.permanentResidenceExpiry || driver.details?.permanentResidenceExpiry;
                  return expiryValue ? new Date(expiryValue).toISOString().split('T')[0] : '';
                })(),
                workPermitExpiry: (() => {
                  const expiryValue = driver.workPermitExpiry || driver.details?.workPermitExpiry;
                  return expiryValue ? new Date(expiryValue).toISOString().split('T')[0] : '';
                })(),
                wcbNumber: driver.wsibAccountNo || driver.details?.wsibAccountNo || '',
                workPermitDocument: null,
                prCardDocument: null,
                existingWorkPermitUrl: travelData.existingWorkPermitUrl,
                existingPrCardUrl: travelData.existingPrCardUrl
              });
              console.log('✅ All data refreshed after update');
            }
          } catch (error) {
            console.error('Error reloading driver data:', error);
          }
        }

        addNotification('success', 'Driver updated successfully!');
        clearDriverDraft();
        handleCloseModal();
        // Refresh drivers list
        await fetchDrivers();
      } else {
        addNotification('error', response?.message || 'Failed to update driver');
      }
    } catch (error: any) {
      console.error('Error updating driver:', error);
      addNotification('error', error.response?.data?.message || error.message || 'Failed to update driver');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Check if base required tests (VEHICLE and HOS) are completed and HR approved
  const areBaseTestsCompleted = () => {
    const vehicleTest = driverTests.find(t => t.testType === 'VEHICLE');
    const hosTest = driverTests.find(t => t.testType === 'HOS');

    const vehicleCompleted = vehicleTest && vehicleTest.hrApproved === true;
    const hosCompleted = hosTest && hosTest.hrApproved === true;

    return vehicleCompleted && hosCompleted;
  };

  // Handle flag checkbox change - show modal for confirmation
  const handleFlagChange = (flagName: 'handlesHazardousLoads' | 'winterTestRequired', value: boolean) => {
    console.log('🔄 handleFlagChange called:', { flagName, value, editingId });

    if (!editingId) {
      console.log('❌ No editingId, returning');
      return;
    }

    // Check if base tests are completed before allowing flag changes
    if (value === true && !areBaseTestsCompleted()) {
      addNotification('error', 'Please complete and approve VEHICLE and HOS tests first before enabling driver flags.');
      return;
    }

    const currentValue = flagName === 'handlesHazardousLoads' ? handlesHazardousLoads : winterTestRequired;
    console.log('📊 Current flag values:', {
      flagName,
      currentValue,
      newValue: value,
      handlesHazardousLoads,
      winterTestRequired
    });

    // If value is same, do nothing
    if (currentValue === value) {
      console.log('⚠️ Value is same, returning');
      return;
    }

    // Show confirmation modal
    console.log('✅ Showing flag update modal');
    setSelectedFlag({
      flagName,
      newValue: value,
      currentValue
    });
    setShowFlagModal(true);
  };

  // Confirm and update flag
  const handleConfirmFlagUpdate = async () => {
    console.log('🚀 handleConfirmFlagUpdate called:', { selectedFlag, editingId });

    if (!selectedFlag || !editingId) {
      console.log('❌ Missing selectedFlag or editingId');
      return;
    }

    try {
      const { flagName, newValue } = selectedFlag;
      console.log(`🔄 Starting flag update: ${flagName} = ${newValue} for driver ${editingId}`);

      // Create FormData to update only the flag
      const flagFormData = new FormData();
      flagFormData.append(flagName, String(newValue));
      console.log('📦 FormData created:', { flagName, value: String(newValue) });

      // Call update API
      console.log('📡 Calling updateDriver API...');
      const response = await driverApi.updateDriver(editingId, flagFormData);
      console.log('📡 API Response:', response);

      if (response?.success) {
        const flagLabel = flagName === 'handlesHazardousLoads' ? 'Hazardous loads' : 'Winter test';
        const action = newValue ? 'enabled' : 'disabled';
        addNotification('success', `${flagLabel} flag ${action} successfully`);

        // Update state IMMEDIATELY before refreshing
        console.log('💾 Updating state immediately...');
        if (flagName === 'handlesHazardousLoads') {
          setHandlesHazardousLoads(newValue);
          console.log('✅ State updated: handlesHazardousLoads =', newValue);
        } else {
          setWinterTestRequired(newValue);
          console.log('✅ State updated: winterTestRequired =', newValue);
        }

        // Close modal
        setShowFlagModal(false);
        setSelectedFlag(null);

        // Refresh driver data and test results to get updated flags from backend
        console.log('🔄 Refreshing driver data from backend...');
        await loadDriverForEdit(editingId);
        console.log('✅ Driver data refreshed');

        await fetchDriverTestResults(editingId);
        console.log('✅ Test results refreshed');

        // Log final state after refresh
        setTimeout(() => {
          console.log('📊 Final flag state after update:', {
            handlesHazardousLoads,
            winterTestRequired,
            flagName,
            newValue
          });
        }, 100);
      } else {
        console.error('❌ API response not successful:', response);
        addNotification('error', response?.message || 'Failed to update flag');
      }
    } catch (error: any) {
      console.error('❌ Error updating flag:', error);
      console.error('❌ Error details:', {
        message: error.message,
        response: error.response?.data,
        stack: error.stack
      });
      addNotification('error', error.response?.data?.message || error.message || 'Failed to update flag');
    }
  };

  // Cancel flag update
  const handleCancelFlagUpdate = () => {
    setShowFlagModal(false);
    setSelectedFlag(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-main p-6 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin text-[var(--accent-navyblue)] mx-auto mb-4" />
          <p className="text-secondary">Loading drivers...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-main p-6">
      <style>{`
  @media print {
    body { background: #ffffff !important; }
    .print-hide { display: none !important; }
    table { border-collapse: collapse !important; width: 100% !important; font-size: 11px !important; }
    thead tr { background: #1183e0 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    thead th { color: #ffffff !important; padding: 8px 12px !important; border: 1px solid #0d6bc7 !important; font-weight: 600 !important; text-transform: uppercase !important; font-size: 10px !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    tbody tr:nth-child(even) { background: #f0f6ff !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    tbody td { padding: 7px 12px !important; border: 1px solid #dde6f0 !important; color: #1a1a2e !important; }
    .bg-main, .bg-card { background: #ffffff !important; }
  }
`}</style>
      <div className="max-w-full mx-auto">
        {/* Header Section */}
        <div className="mb-6">

          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl font-bold text-primary">Drivers</h1>
            <div className="flex items-center gap-2 print-hide">
              <span className="text-2xl font-bold text-primary">({getTabCount(activeTab)})</span>
              <button
                onClick={handleExportDrivers}
                title="Export to Excel"
                className="w-10 h-10 bg-[var(--accent-navyblue)] !text-white rounded-lg flex items-center justify-center hover:bg-[var(--accent-navyblue)]/80 transition-colors shadow-md"
              >
                <FileDown className="w-5 h-5" />
              </button>
              <ImportButton
                onImport={async (file, fieldMap) => { const res = await importDriversFromFile(file, fieldMap); await fetchDrivers(); return res; }}
                templateFileName="drivers_template.csv"
                templateColumns={[
                  { header: 'first_name', example: 'John', required: false },
                  { header: 'last_name', example: 'Smith', required: false },
                  { header: 'name', example: 'John Smith', required: false },
                  { header: 'email', example: 'john.smith@company.com', required: false },
                  { header: 'phone', example: '555-123-4567', required: false },
                  { header: 'secondary_phone', example: '555-987-0000', required: false },
                  { header: 'country', example: 'Canada', required: false },
                  { header: 'city', example: 'Toronto', required: false },
                  { header: 'province_state', example: 'Ontario', required: false },
                  { header: 'postal_code', example: 'M5V 3A8', required: false },
                  { header: 'date_of_birth', example: '1985-06-20', required: false },
                  { header: 'hire_date', example: '2022-03-01', required: false },
                  { header: 'gender', example: 'Male', required: false },
                  { header: 'notes', example: 'Experienced long-haul driver', required: false },
                  { header: 'driver_id', example: 'DRV-0001', required: false },
                  { header: 'status', example: 'active', required: false },
                ]}
                label="Import Drivers"
              />
              <button
                onClick={() => {
                  setEditingId(null);
                  setEditingDriver(null);
                  setOriginalDriverData(null);
                  resetAllFormState();
                  setShowNewDriverModal(true);
                }}
                className="w-10 h-10 bg-[var(--accent-navyblue)] !text-white rounded-lg flex items-center justify-center hover:bg-[var(--accent-navyblue)] transition-colors shadow-md"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>

          </div>

          {/* Navigation Tabs */}
          <div className="flex gap-6 border-b-2 border-theme print-hide">
            <button
              onClick={() => setActiveTab('all')}
              className={`pb-3 px-1 font-medium transition-colors ${activeTab === 'all'
                ? 'text-[var(--accent-navyblue)] border-b-2 border-[var(--accent-navyblue)] -mb-[2px]'
                : 'text-secondary hover:text-primary'
                }`}
            >
              All ({getTabCount('all')})
            </button>
            <button
              onClick={() => setActiveTab('external')}
              className={`pb-3 px-1 font-medium transition-colors ${activeTab === 'external'
                ? 'text-[var(--accent-navyblue)] border-b-2 border-[var(--accent-navyblue)] -mb-[2px]'
                : 'text-secondary hover:text-primary'
                }`}
            >
              External ({getTabCount('external')})
            </button>
            <button
              onClick={() => setActiveTab('unassigned')}
              className={`pb-3 px-1 font-medium transition-colors ${activeTab === 'unassigned'
                ? 'text-[var(--accent-navyblue)] border-b-2 border-[var(--accent-navyblue)] -mb-[2px]'
                : 'text-secondary hover:text-primary'
                }`}
            >
              Unassigned ({getTabCount('unassigned')})
            </button>
          </div>
        </div>

        {/* Search and Filter Bar */}
        <div className="bg-card rounded-lg shadow-sm p-4 mb-4 print-hide">
          <div className="flex flex-wrap items-center gap-4">
            {/* Search Input */}
            <div className="flex-1 min-w-[250px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-secondary w-4 h-4" />
                <input
                  type="text"
                  placeholder="Drivers Licence #, Passport #, Or Name"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-navyblue)] focus:border-transparent"
                />
              </div>
            </div>



            {/* Filter By */}
            <div className="flex flex-col">
              <label className="text-xs text-secondary mb-1">Filter By</label>
              <select
                value={filterBy}
                onChange={(e) => setFilterBy(e.target.value)}
                className="px-3 py-2 bg-[rgba(255,255,255,0.05)] text-primary border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)] focus:border-[var(--accent-blue)] hover:bg-[rgba(0,209,255,0.08)] transition-all duration-200 text-sm"
              >
                <option className="bg-[#0f1b2d] text-white">Active</option>
                <option className="bg-[#0f1b2d] text-white">Inactive</option>
                <option className="bg-[#0f1b2d] text-white">All</option>
              </select>
            </div>

            {/* Category */}
            <div className="flex flex-col">
              <label className="text-xs text-secondary mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="px-3 py-2 bg-[rgba(255,255,255,0.05)] text-primary border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)] focus:border-[var(--accent-blue)] hover:bg-[rgba(0,209,255,0.08)] transition-all duration-200 text-sm min-w-[120px]"
              >
                <option className="bg-[#0f1b2d] text-white" value="">
                  Select...
                </option>
                <option className="bg-[#0f1b2d] text-white">StandBy</option>
              </select>
            </div>

            {/* Compliance Status */}
            <div className="flex flex-col">
              <label className="text-xs text-secondary mb-1">Compliance Status</label>
              <select
                value={complianceStatus}
                onChange={(e) => setComplianceStatus(e.target.value)}
                className="px-3 py-2 bg-[rgba(255,255,255,0.05)] text-primary border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)] focus:border-[var(--accent-blue)] hover:bg-[rgba(0,209,255,0.08)] transition-all duration-200 text-sm min-w-[120px]"
              >
                <option className="bg-[#0f1b2d] text-white">All</option>
                <option className="bg-[#0f1b2d] text-white">Compliant</option>
                <option className="bg-[#0f1b2d] text-white">Expiring Soon</option>
                <option className="bg-[#0f1b2d] text-white">Non-Compliant</option>
              </select>
            </div>

            {/* Sort By */}
            <div className="flex flex-col">
              <label className="text-xs text-secondary mb-1">Sort By</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-3 py-2 bg-[rgba(255,255,255,0.05)] text-primary border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)] focus:border-[var(--accent-blue)] hover:bg-[rgba(0,209,255,0.08)] transition-all duration-200 text-sm min-w-[120px]"
              >
                <option className="bg-[#0f1b2d] text-white" value="">
                  Select...
                </option>
                <option className="bg-[#0f1b2d] text-white">Driver ID</option>
                <option className="bg-[#0f1b2d] text-white">First Name</option>
                <option className="bg-[#0f1b2d] text-white">Last Name</option>
                <option className="bg-[#0f1b2d] text-white">Status</option>
              </select>
            </div>


          </div>
        </div>

        {/* Table */}
        <div className="bg-card rounded-lg shadow-sm overflow-hidden">
          {/* Top Horizontal Scrollbar */}
          <div
            ref={topScrollRef}
            className="overflow-x-auto overflow-y-hidden border-b border-theme print-hide"
            style={{
              height: '17px'
            }}
            onScroll={(e) => {
              if (tableScrollRef.current) {
                const target = e.target as HTMLDivElement;
                tableScrollRef.current.scrollLeft = target.scrollLeft;
              }
            }}
          >
            <div ref={topScrollContentRef} style={{ height: '1px' }}></div>
          </div>
          <div
            ref={tableScrollRef}
            className="overflow-x-auto"
            onScroll={(e) => {
              if (topScrollRef.current) {
                const target = e.target as HTMLDivElement;
                topScrollRef.current.scrollLeft = target.scrollLeft;
              }
            }}
          >
            <table className="w-full min-w-[1200px]">
              <thead className="bg-card  border-theme">
                <tr>
                  {/* Photo */}
                  <th className="px-4 py-3 text-left">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-xs text-[var(--accent-navyblue)] uppercase">Photo</span>
                    </div>
                  </th>

                  {/* Driver ID */}
                  <th className="px-4 py-3 text-left">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleSort('driverId')}
                        className="flex items-center gap-2 hover:text-primary font-medium text-xs !text-[var(--accent-navyblue)] uppercase"
                      >
                        Driver ID
                        {getSortIcon('driverId')}
                      </button>
                    </div>

                  </th>

                  {/* First Name */}
                  <th className="px-4 py-3 text-left">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleSort('firstName')}
                        className="flex items-center gap-2 hover:!text-[var(--accent-navyblue)] font-medium text-xs !text-[var(--accent-navyblue)] uppercase"
                      >
                        First Name
                        {getSortIcon('firstName')}
                      </button>
                    </div>

                  </th>

                  {/* Last Name */}
                  <th className="px-4 py-3 text-left">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleSort('lastName')}
                        className="flex items-center gap-2 hover:!text-[var(--accent-navyblue)] font-medium text-xs !text-[var(--accent-navyblue)] uppercase"
                      >
                        Last Name
                        {getSortIcon('lastName')}
                      </button>
                    </div>

                  </th>

                  {/* Drivers Licence */}
                  <th className="px-4 py-3 text-left">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleSort('driversLicence')}
                        className="flex items-center gap-2 hover:!text-[var(--accent-navyblue)] font-medium text-xs !text-[var(--accent-navyblue)] uppercase"
                      >
                        Drivers Licence
                        {getSortIcon('driversLicence')}
                      </button>
                    </div>

                  </th>

                  {/* Passport */}
                  <th className="px-4 py-3 text-left">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleSort('passport')}
                        className="flex items-center gap-2 hover:!text-[var(--accent-navyblue)] font-medium text-xs !text-[var(--accent-navyblue)] uppercase"
                      >
                        Passport
                        {getSortIcon('passport')}
                      </button>
                    </div>

                  </th>

                  {/* Date Of Birth */}
                  <th className="px-4 py-3 text-left">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleSort('dateOfBirth')}
                        className="flex items-center gap-2 hover:!text-[var(--accent-navyblue)] font-medium text-xs !text-[var(--accent-navyblue)] uppercase"
                      >
                        Date Of Birth
                        {getSortIcon('dateOfBirth')}
                      </button>
                    </div>

                  </th>

                  {/* Notes */}
                  <th className="px-4 py-3 text-left">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-xs !text-[var(--accent-navyblue)] uppercase">Notes</span>
                    </div>

                  </th>



                  {/* Status */}
                  <th className="px-4 py-3 text-left">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleSort('status')}
                        className="flex items-center gap-2 hover:!text-[var(--accent-navyblue)] font-medium text-xs !text-[var(--accent-navyblue)] uppercase"
                      >
                        Status
                        {getSortIcon('status')}
                      </button>
                    </div>

                  </th>

                  {/* Compliance */}
                  <th className="px-4 py-3 text-left">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-xs !text-[var(--accent-navyblue)] uppercase">
                        Compliance
                      </span>
                    </div>

                    <select
                      value={complianceStatus}
                      onChange={(e) => setComplianceStatus(e.target.value)}
                      className="
      mt-2 w-full px-3 py-2 text-xs rounded-md
      bg-[#0f172a] text-white
      border border-[var(--accent-navyblue)]
      focus:outline-none focus:ring-1 focus:ring-[var(--accent-navyblue)]
      appearance-none cursor-pointer
    "
                    >
                      <option className="bg-[#0f172a] text-white">All</option>
                      <option className="bg-[#0f172a] text-green-400">Compliant</option>
                      <option className="bg-[#0f172a] text-yellow-400">Expiring Soon</option>
                      <option className="bg-[#0f172a] text-red-400">Non-Compliant</option>
                    </select>
                  </th>
                  {/* Actions */}
                  <th className="px-4 py-3 text-left">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-xs !text-[var(--accent-navyblue)] uppercase">Actions</span>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-card  divide-theme">
                {filteredDrivers.map((driver) => (
                  <tr
                    key={driver._id || driver.driverId}
                    className="hover:bg-[rgba(255,255,255,0.03)] transition-colors cursor-pointer"
                    onClick={(e) => {
                      // Prevent triggering if clicking on interactive elements (buttons, links, inputs, selects)
                      const target = e.target as HTMLElement;
                      if (target.tagName === 'BUTTON' || target.tagName === 'A' ||
                        target.tagName === 'INPUT' || target.tagName === 'SELECT' ||
                        target.closest('button') || target.closest('a') ||
                        target.closest('input') || target.closest('select')) {
                        return;
                      }

                      // Set editingId to trigger API call (same as edit button)
                      if (driver._id) {
                        console.log('🔄 Row clicked for driver:', driver._id);
                        setEditingId(driver._id);
                        setShowNewDriverModal(true);
                      } else {
                        // Fallback for drivers without _id
                        setEditingDriver(driver);
                        setEditingId(null);
                        setOriginalDriverData(null);
                        resetAllFormState();

                        // Parse phone number to extract country code and number
                        const parsedPhone = parsePhoneNumber(driver.phone || driver.mobile);
                        setPrimaryPhoneCountry(parsedPhone.countryCode);

                        // Populate form data with driver data
                        setFormData({
                          driverId: driver.driverId,
                          firstName: driver.firstName,
                          middle: '',
                          lastName: driver.lastName,
                          emailAddress: driver.email || '',
                          dateOfBirth: driver.dateOfBirth,
                          mobileApp: false,
                          pin: '',
                          primaryPhone: parsedPhone.phoneNumber,
                          secondaryPhone: '',
                          searchAddress: '',
                          address: '',
                          unit: '',
                          city: '',
                          postalCode: '',
                          country: driver.country || '',
                          stateProvince: '',
                          profileImage: null
                        });
                        setActiveFormTab('basic');
                        setShowNewDriverModal(true);
                      }
                    }}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center">
                        {driver.profileImageUrl ? (
                          <img
                            src={driver.profileImageUrl}
                            alt={`${driver.firstName || ''} ${driver.lastName || ''}`}
                            className="w-10 h-10 rounded-full object-cover border-2 border-theme"
                            onError={(e) => {
                              // If image fails to load, show placeholder
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                              const placeholder = target.nextElementSibling as HTMLElement;
                              if (placeholder) placeholder.style.display = 'flex';
                            }}
                          />
                        ) : null}
                        <div
                          className={`w-10 h-10 rounded-full bg-[rgba(255,255,255,0.08)] flex items-center justify-center border-2 border-theme ${driver.profileImageUrl ? 'hidden' : ''}`}
                        >
                          <User className="w-6 h-6 text-secondary" />
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-primary">{driver.driverId}</td>
                    <td className="px-4 py-3 text-sm text-primary">
                      <div className="flex items-center gap-1.5">
                        {driver.firstName}
                        {driver.email?.endsWith('@logistiq.import') && (
                          <span title="No email set — imported without email. Click to edit and add one." className="text-[10px] bg-amber-100 text-amber-700 border border-amber-200 rounded px-1 py-0.5 font-medium leading-none cursor-help">
                            No email
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-primary">{driver.lastName}</td>
                    <td className="px-4 py-3 text-sm text-primary">{driver.driversLicence}</td>
                    <td className="px-4 py-3 text-sm text-primary">{driver.passport}</td>
                    <td className="px-4 py-3 text-sm text-primary">
                      {driver.dateOfBirth ? (() => {
                        try {
                          // Handle ISO string format (e.g., "2026-02-02T00:00:00.000Z")
                          if (driver.dateOfBirth.includes('T')) {
                            const date = new Date(driver.dateOfBirth);
                            return date.toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' });
                          }
                          // Handle date string format (e.g., "2026-02-02")
                          if (driver.dateOfBirth.match(/^\d{4}-\d{2}-\d{2}$/)) {
                            const [year, month, day] = driver.dateOfBirth.split('-');
                            return `${month}/${day}/${year}`;
                          }
                          // Return as is if already formatted
                          return driver.dateOfBirth;
                        } catch (e) {
                          return driver.dateOfBirth;
                        }
                      })() : '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-secondary">{driver.notes || '-'}</td>

                    <td className="px-4 py-3 text-sm text-primary">{driver.status}</td>
                    <td className="px-4 py-3">
                      <button
                        className={`px-3 py-1 rounded text-xs !text-white font-medium ${getComplianceButtonClass(driver.compliance)}`}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {driver.compliance}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (driver._id) {
                              console.log('✏️ Edit button clicked for driver:', driver._id);
                              setEditingId(driver._id);
                            } else {
                              // Reset all state first, then populate with driver data
                              setEditingId(null);
                              setEditingDriver(driver);
                              setOriginalDriverData(null);
                              resetAllFormState();

                              // Parse phone number to extract country code and number
                              const parsedPhone = parsePhoneNumber(driver.phone || driver.mobile);
                              setPrimaryPhoneCountry(parsedPhone.countryCode);

                              setFormData({
                                driverId: driver.driverId,
                                firstName: driver.firstName,
                                middle: '',
                                lastName: driver.lastName,
                                emailAddress: driver.email || '',
                                dateOfBirth: driver.dateOfBirth,
                                mobileApp: false,
                                pin: '',
                                primaryPhone: parsedPhone.phoneNumber,
                                secondaryPhone: '',
                                searchAddress: '',
                                address: '',
                                unit: '',
                                city: '',
                                postalCode: '',
                                country: driver.country || '',
                                stateProvince: '',
                                profileImage: null
                              });
                              setActiveFormTab('basic');
                              setShowNewDriverModal(true);
                            }
                          }}
                          className="p-2 text-[var(--accent-navyblue)] hover:bg-[var(--accent-navyblue)]/15 rounded transition-colors"
                          title="Edit Driver"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (driver._id) {
                              handleDelete(driver._id);
                            } else {
                              handleDelete(driver.driverId);
                            }
                          }}
                          className="p-2 text-[#A855F7] hover:bg-[var(--accent-red)]/10 rounded transition-colors"
                          title="Delete Driver"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* New Driver Modal */}
      {showNewDriverModal && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              handleCloseModal();
            }
          }}
        >
          <div
            className="bg-card rounded-lg shadow-2xl w-full max-w-5xl max-h-[90vh] flex overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Left Sidebar */}
            <div className="w-48 bg-card border-r border-theme flex flex-col">
              {/* Image Upload Area */}
              <div className="p-3 border-b border-theme">
                <div
                  className="border-2 border-dashed border-theme p-4 text-center mb-2 cursor-pointer hover:border-[var(--accent-navyblue)] transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {profileImagePreview ? (
                    <img
                      src={profileImagePreview}
                      alt="Profile preview"
                      className="w-full h-24 object-cover rounded-lg"
                    />
                  ) : (
                    <>
                      <Upload className="w-6 h-6 text-secondary mx-auto mb-1" />
                      <p className="text-xs text-secondary">Select Image</p>
                    </>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      if (file.size > 20 * 1024 * 1024) {
                        addNotification('error', 'File size must be less than 20MB');
                        if (fileInputRef.current) {
                          fileInputRef.current.value = '';
                        }
                        return;
                      }
                      if (!file.type.startsWith('image/')) {
                        addNotification('error', 'Please select an image file');
                        if (fileInputRef.current) {
                          fileInputRef.current.value = '';
                        }
                        return;
                      }
                      setFormData({ ...formData, profileImage: file });
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        setProfileImagePreview(reader.result as string);
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full bg-[rgba(255,255,255,0.08)] !text-white py-1.5 text-xs font-medium hover:bg-[rgba(255,255,255,0.12)] transition-colors"
                >
                  {formData.profileImage ? 'CHANGE IMAGE' : 'UPLOAD'}
                </button>
              </div>

              {/* Navigation Tabs */}
              <div className="flex-1 overflow-y-auto p-3">
                <nav className="flex flex-col gap-2">
                  {[
                    { id: 'basic', label: 'Basic', icon: User },
                    { id: 'personal', label: 'Personal', icon: User },
                    { id: 'travel', label: 'Travel', icon: MapPin },
                    { id: 'documents', label: 'Documents', icon: FileTextIcon },
                    { id: 'certifications', label: 'Certifications', icon: Award },
                    { id: 'tickets', label: 'Tickets', icon: Ticket },
                    { id: 'violations', label: 'Violations', icon: AlertTriangle },
                    { id: 'notes', label: 'Notes', icon: FileTextIcon },
                    { id: 'deductions', label: 'Deductions', icon: DollarSign },
                    { id: 'additions', label: 'Additions', icon: PlusCircle },
                    { id: 'onboarding', label: 'Onboarding & Tests', icon: ClipboardCheck },
                    { id: 'drugtest', label: 'Drug Test', icon: FlaskConical }
                  ].map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeFormTab === tab.id;

                    return (
                      <button
                        key={tab.id}
                        onClick={() => {
                          if (tab.id === 'drugtest' && !drugTestPasswordVerified) {
                            setShowDrugTestPasswordModal(true);
                          } else {
                            setActiveFormTab(tab.id as any);
                          }
                        }}
                        className={`w-full flex items-center gap-1.5 px-2 py-1.5 transition-colors text-left ${isActive
                          ? 'bg-[var(--accent-navyblue)]/15 !text-white shadow-md'
                          : 'bg-[rgba(255,255,255,0.08)] text-secondary hover:bg-[rgba(255,255,255,0.12)]'
                          }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        <span className="text-xs font-medium text-center">{tab.label}</span>
                      </button>
                    );
                  })}
                </nav>
              </div>

            </div>

            {/* Right Content Area */}
            <div className={`flex-1 flex flex-col overflow-hidden transition-all ${selectedCertificate || selectedTicket ? 'mr-96' : ''}`}>
              {/* Header */}
              <div className="flex items-center justify-between p-3 border-b border-theme bg-card">
                <h2 className="text-lg font-bold text-primary">{(editingId || editingDriver) ? 'Edit Driver' : 'New Driver'}</h2>
                <div className="flex items-center gap-2">
                  <AutoSaveIndicator status={draftStatus} lastSavedAt={draftLastSavedAt} />
                  <button
                    onClick={editingId ? handleUpdateDriver : handleSaveDriver}
                    disabled={isSubmitting}
                    className="px-3 py-1 text-xs bg-[rgba(255,255,255,0.08)] !text-white border border-theme rounded-lg hover:bg-[rgba(255,255,255,0.12)] transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                  >
                    {isSubmitting && (
                      <RefreshCw className="w-3 h-3 animate-spin" />
                    )}
                    {editingId ? 'UPDATE' : 'SAVE'}
                  </button>
                  <button
                    onClick={handleCloseModal}
                    disabled={isSubmitting}
                    className="text-secondary hover:text-secondary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Form Content */}
              <div className="flex-1 overflow-y-auto p-3 bg-card">
                {draftPendingRestore && (
                  <DraftRestoreBanner
                    updatedAt={draftPendingRestore.updatedAt}
                    onRestore={handleRestoreDriverDraft}
                    onDiscard={discardDriverDraft}
                  />
                )}
                {activeFormTab === 'basic' && (
                  <div className="space-y-3">
                    <h3 className="text-sm font-bold text-primary mb-2">Basic Information</h3>

                    {/* First Row */}
                    <div className="grid grid-cols-4 gap-2">
                      <div>
                        <label className="block text-xs font-medium text-primary mb-0.5">Driver ID</label>
                        <input
                          type="text"
                          placeholder="Driver ID"
                          value={formData.driverId}
                          onChange={(e) => setFormData({ ...formData, driverId: e.target.value })}
                          className="w-full px-2 py-1 text-xs border border-theme rounded focus:outline-none focus:ring-2 focus:ring-[var(--accent-navyblue)] focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-primary mb-0.5">
                          First Name<span className="text-[var(--accent-red)]">*</span>
                        </label>
                        <input
                          type="text"
                          placeholder="First Name"
                          value={formData.firstName}
                          onChange={(e) => {
                            setFormData({ ...formData, firstName: e.target.value });
                            if (validationErrors.firstName) {
                              setValidationErrors({ ...validationErrors, firstName: '' });
                            }
                          }}
                          className={`w-full px-2 py-1 text-xs border rounded focus:outline-none focus:ring-2 focus:ring-[var(--accent-navyblue)] focus:border-transparent ${validationErrors.firstName ? 'border-[var(--accent-red)]' : 'border-theme'
                            }`}
                        />
                        {validationErrors.firstName && (
                          <p className="text-xs text-[var(--accent-red)] mt-0.5">{validationErrors.firstName}</p>
                        )}
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-primary mb-0.5">Middle</label>
                        <input
                          type="text"
                          placeholder="Middle"
                          value={formData.middle}
                          onChange={(e) => setFormData({ ...formData, middle: e.target.value })}
                          className="w-full px-2 py-1 text-xs border border-theme rounded focus:outline-none focus:ring-2 focus:ring-[var(--accent-navyblue)] focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-primary mb-0.5">
                          Last Name<span className="text-[var(--accent-red)]">*</span>
                        </label>
                        <input
                          type="text"
                          placeholder="Last Name"
                          value={formData.lastName}
                          onChange={(e) => {
                            setFormData({ ...formData, lastName: e.target.value });
                            if (validationErrors.lastName) {
                              setValidationErrors({ ...validationErrors, lastName: '' });
                            }
                          }}
                          className={`w-full px-2 py-1 text-xs border rounded focus:outline-none focus:ring-2 focus:ring-[var(--accent-navyblue)] focus:border-transparent ${validationErrors.lastName ? 'border-[var(--accent-red)]' : 'border-theme'
                            }`}
                        />
                        {validationErrors.lastName && (
                          <p className="text-xs text-[var(--accent-red)] mt-0.5">{validationErrors.lastName}</p>
                        )}
                      </div>
                    </div>

                    {/* Second Row */}
                    <div className="grid grid-cols-4 gap-2">
                      <div>
                        <label className="block text-xs font-medium text-primary mb-0.5">
                          Email Address<span className="text-[var(--accent-red)]">*</span>
                        </label>
                        <input
                          type="email"
                          placeholder="Email Address"
                          value={formData.emailAddress}
                          onChange={(e) => {
                            setFormData({ ...formData, emailAddress: e.target.value });
                            if (validationErrors.emailAddress) {
                              setValidationErrors({ ...validationErrors, emailAddress: '' });
                            }
                          }}
                          className={`w-full px-2 py-1 text-xs border rounded focus:outline-none focus:ring-2 focus:ring-[var(--accent-navyblue)] focus:border-transparent ${validationErrors.emailAddress ? 'border-[var(--accent-red)]' : 'border-theme'
                            }`}
                        />
                        {validationErrors.emailAddress && (
                          <p className="text-xs text-[var(--accent-red)] mt-0.5">{validationErrors.emailAddress}</p>
                        )}
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-primary mb-0.5">
                          Date Of Birth <span className="text-[var(--accent-red)]">*</span>
                        </label>

                        <div
                          className="relative cursor-pointer"
                          onMouseDown={(e) => {
                            e.preventDefault(); // IMPORTANT
                            if (dateRef.current) {
                              dateRef.current.showPicker?.(); // open calendar
                              dateRef.current.focus();
                            }
                          }}
                        >
                          {/* Icon */}
                          <Calendar className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-secondary pointer-events-none z-10" />

                          {/* Input */}
                          <input
                            ref={dateRef}
                            type="date"
                            value={formData.dateOfBirth}
                            onChange={(e) => {
                              setFormData({ ...formData, dateOfBirth: e.target.value });
                              if (validationErrors.dateOfBirth) {
                                setValidationErrors({
                                  ...validationErrors,
                                  dateOfBirth: "",
                                });
                              }
                            }}
                            className={`w-full pl-7 pr-2 py-2 text-sm bg-[rgba(255,255,255,0.05)] text-primary border rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)] focus:border-[var(--accent-blue)] hover:bg-[rgba(0,209,255,0.08)] transition-all duration-200 cursor-pointer ${validationErrors.dateOfBirth
                              ? "border-[var(--accent-red)]"
                              : "border-theme"
                              }`}
                            max={new Date().toISOString().split("T")[0]}
                          />
                        </div>

                        {validationErrors.dateOfBirth && (
                          <p className="text-xs text-[var(--accent-red)] mt-0.5">
                            {validationErrors.dateOfBirth}
                          </p>
                        )}
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-primary mb-0.5">Mobile App</label>
                        <div className="flex items-center gap-2 mt-1">
                          <button
                            type="button"
                            onClick={() => setFormData({ ...formData, mobileApp: !formData.mobileApp })}
                            className={`relative w-9 h-5 rounded-full transition-colors ${formData.mobileApp ? 'bg-[var(--accent-navyblue)]' : 'bg-[rgba(255,255,255,0.15)]'
                              }`}
                          >
                            <span
                              className={`absolute top-0.5 left-0.5 w-3.5 h-3.5 bg-card rounded-full transition-transform ${formData.mobileApp ? 'translate-x-4' : 'translate-x-0'
                                }`}
                            />
                          </button>
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-primary mb-0.5">PIN</label>
                        {pinIsExisting ? (
                          <div className="relative">
                            <input
                              type="password"
                              value="••••••••"
                              readOnly
                              onFocus={() => {
                                setPinIsExisting(false);
                                setFormData({ ...formData, pin: '' });
                              }}
                              className="w-full px-2 py-1 pr-20 text-xs border border-theme rounded bg-card cursor-text focus:outline-none focus:ring-2 focus:ring-[var(--accent-navyblue)] focus:border-transparent"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                setPinIsExisting(false);
                                setFormData({ ...formData, pin: '' });
                              }}
                              className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[10px] text-[var(--accent-navyblue)] hover:text-[var(--accent-navyblue)]/70 font-medium whitespace-nowrap"
                              tabIndex={-1}
                            >
                              Change
                            </button>
                          </div>
                        ) : (
                          <div className="relative">
                            <input
                              type={showPin ? 'text' : 'password'}
                              placeholder="Enter new PIN"
                              value={formData.pin}
                              onChange={(e) => setFormData({ ...formData, pin: e.target.value })}
                              className="w-full px-2 py-1 pr-7 text-xs border border-theme rounded focus:outline-none focus:ring-2 focus:ring-[var(--accent-navyblue)] focus:border-transparent"
                              autoFocus
                            />
                            <button
                              type="button"
                              onClick={() => setShowPin(prev => !prev)}
                              className="absolute right-2 top-1/2 -translate-y-1/2 text-secondary hover:text-secondary"
                              tabIndex={-1}
                            >
                              {showPin ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Third Row */}
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs font-medium text-primary mb-0.5">
                          Primary Phone #<span className="text-[var(--accent-red)]">*</span>
                        </label>
                        <div className={`flex items-center border rounded focus-within:ring-2 focus-within:ring-[var(--accent-navyblue)] focus-within:border-transparent ${validationErrors.primaryPhone ? 'border-[var(--accent-red)]' : 'border-theme'
                          }`}>
                          <div className="relative" ref={primaryCountryDropdownRef}>
                            <button
                              type="button"
                              onClick={() => {
                                setPrimaryCountryDropdownOpen(!primaryCountryDropdownOpen);
                                if (!primaryCountryDropdownOpen) {
                                  setPrimaryCountrySearch('');
                                }
                              }}
                              className="flex items-center gap-1.5 px-2 py-1 text-xs bg-card border-none outline-none cursor-pointer h-full"
                              style={{ minWidth: '85px' }}
                            >
                              {countries.find(c => c.code === primaryPhoneCountry) && (
                                <>
                                  <span className="text-sm" style={{ fontSize: '16px' }}>{countries.find(c => c.code === primaryPhoneCountry)?.flag}</span>
                                  <span className="text-xs text-secondary font-medium">{countries.find(c => c.code === primaryPhoneCountry)?.dialCode}</span>
                                </>
                              )}
                              <ChevronDown className="w-3 h-3 text-secondary ml-auto" />
                            </button>
                            {primaryCountryDropdownOpen && (
                              <div className="absolute top-full left-0 z-50 bg-card border border-theme rounded-lg shadow-lg mt-1" style={{ minWidth: '280px', maxWidth: '320px' }}>
                                {/* Search Input */}
                                <div className="p-2 border-b border-theme sticky top-0 bg-card">
                                  <input
                                    type="text"
                                    placeholder="Search country..."
                                    value={primaryCountrySearch}
                                    onChange={(e) => setPrimaryCountrySearch(e.target.value)}
                                    onClick={(e) => e.stopPropagation()}
                                    className="w-full px-3 py-1.5 text-xs border border-theme rounded focus:outline-none focus:ring-2 focus:ring-[var(--accent-navyblue)] focus:border-transparent"
                                  />
                                </div>
                                {/* Countries List */}
                                <div className="max-h-60 overflow-y-auto">
                                  {countries
                                    .filter((country) => {
                                      const searchLower = primaryCountrySearch.toLowerCase();
                                      return (
                                        country.name.toLowerCase().includes(searchLower) ||
                                        country.code.toLowerCase().includes(searchLower) ||
                                        country.dialCode.includes(searchLower)
                                      );
                                    })
                                    .map((country) => (
                                      <button
                                        key={country.code}
                                        type="button"
                                        onClick={() => {
                                          setPrimaryPhoneCountry(country.code);
                                          setPrimaryCountryDropdownOpen(false);
                                          setPrimaryCountrySearch('');
                                          // Don't auto-fill dial code - keep the input field clean
                                          // User will enter only their phone number
                                        }}
                                        className={`w-full flex items-center gap-2 px-3 py-2 text-xs text-left hover:bg-[rgba(255,255,255,0.03)] transition-colors ${primaryPhoneCountry === country.code ? 'bg-card' : ''
                                          }`}
                                      >
                                        <span className="text-base" style={{ fontSize: '18px' }}>{country.flag}</span>
                                        <span className="flex-1 truncate">{country.name}</span>
                                        <span className="text-secondary font-medium">{country.dialCode}</span>
                                      </button>
                                    ))}
                                  {countries.filter((country) => {
                                    const searchLower = primaryCountrySearch.toLowerCase();
                                    return (
                                      country.name.toLowerCase().includes(searchLower) ||
                                      country.code.toLowerCase().includes(searchLower) ||
                                      country.dialCode.includes(searchLower)
                                    );
                                  }).length === 0 && (
                                      <div className="px-3 py-4 text-xs text-secondary text-center">
                                        No countries found
                                      </div>
                                    )}
                                </div>
                              </div>
                            )}
                          </div>
                          <div className="h-5 w-px bg-[rgba(255,255,255,0.15)]"></div>
                          <input
                            type="tel"
                            placeholder=""
                            value={formData.primaryPhone}
                            onChange={(e) => {
                              const value = e.target.value.replace(/\D/g, '');
                              setFormData({ ...formData, primaryPhone: value });
                            }}
                            className="flex-1 px-2 py-1 text-xs border-none outline-none focus:outline-none"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-primary mb-0.5">Secondary Phone #</label>
                        <div className="flex items-center border border-theme rounded focus-within:ring-2 focus-within:ring-[var(--accent-navyblue)] focus-within:border-transparent">
                          <div className="relative" ref={secondaryCountryDropdownRef}>
                            <button
                              type="button"
                              onClick={() => {
                                setSecondaryCountryDropdownOpen(!secondaryCountryDropdownOpen);
                                if (!secondaryCountryDropdownOpen) {
                                  setSecondaryCountrySearch('');
                                }
                              }}
                              className="flex items-center gap-1.5 px-2 py-1 text-xs bg-card border-none outline-none cursor-pointer h-full"
                              style={{ minWidth: '85px' }}
                            >
                              {countries.find(c => c.code === secondaryPhoneCountry) && (
                                <>
                                  <span className="text-sm" style={{ fontSize: '16px' }}>{countries.find(c => c.code === secondaryPhoneCountry)?.flag}</span>
                                  <span className="text-xs text-secondary font-medium">{countries.find(c => c.code === secondaryPhoneCountry)?.dialCode}</span>
                                </>
                              )}
                              <ChevronDown className="w-3 h-3 text-secondary ml-auto" />
                            </button>
                            {secondaryCountryDropdownOpen && (
                              <div className="absolute top-full left-0 z-50 bg-card border border-theme rounded-lg shadow-lg mt-1" style={{ minWidth: '280px', maxWidth: '320px' }}>
                                {/* Search Input */}
                                <div className="p-2 border-b border-theme sticky top-0 bg-card">
                                  <input
                                    type="text"
                                    placeholder="Search country..."
                                    value={secondaryCountrySearch}
                                    onChange={(e) => setSecondaryCountrySearch(e.target.value)}
                                    onClick={(e) => e.stopPropagation()}
                                    className="w-full px-3 py-1.5 text-xs border border-theme rounded focus:outline-none focus:ring-2 focus:ring-[var(--accent-navyblue)] focus:border-transparent"
                                  />
                                </div>
                                {/* Countries List */}
                                <div className="max-h-60 overflow-y-auto">
                                  {countries
                                    .filter((country) => {
                                      const searchLower = secondaryCountrySearch.toLowerCase();
                                      return (
                                        country.name.toLowerCase().includes(searchLower) ||
                                        country.code.toLowerCase().includes(searchLower) ||
                                        country.dialCode.includes(searchLower)
                                      );
                                    })
                                    .map((country) => (
                                      <button
                                        key={country.code}
                                        type="button"
                                        onClick={() => {
                                          setSecondaryPhoneCountry(country.code);
                                          setSecondaryCountryDropdownOpen(false);
                                          setSecondaryCountrySearch('');
                                          // Don't auto-fill dial code - keep the input field clean
                                          // User will enter only their phone number
                                        }}
                                        className={`w-full flex items-center gap-2 px-3 py-2 text-xs text-left hover:bg-[rgba(255,255,255,0.03)] transition-colors ${secondaryPhoneCountry === country.code ? 'bg-card' : ''
                                          }`}
                                      >
                                        <span className="text-base" style={{ fontSize: '18px' }}>{country.flag}</span>
                                        <span className="flex-1 truncate">{country.name}</span>
                                        <span className="text-secondary font-medium">{country.dialCode}</span>
                                      </button>
                                    ))}
                                  {countries.filter((country) => {
                                    const searchLower = secondaryCountrySearch.toLowerCase();
                                    return (
                                      country.name.toLowerCase().includes(searchLower) ||
                                      country.code.toLowerCase().includes(searchLower) ||
                                      country.dialCode.includes(searchLower)
                                    );
                                  }).length === 0 && (
                                      <div className="px-3 py-4 text-xs text-secondary text-center">
                                        No countries found
                                      </div>
                                    )}
                                </div>
                              </div>
                            )}
                          </div>
                          <div className="h-5 w-px bg-[rgba(255,255,255,0.15)]"></div>
                          <input
                            type="tel"
                            placeholder=""
                            value={formData.secondaryPhone}
                            onChange={(e) => {
                              const value = e.target.value.replace(/\D/g, '');
                              setFormData({ ...formData, secondaryPhone: value });
                            }}
                            className="flex-1 px-2 py-1 text-xs border-none outline-none focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Fourth Row */}
                    <div>
                      <AddressSearch
                        label="Search Address"
                        placeholder="Search For An Address..."
                        onAddressSelect={(addressData) => {
                          // Find matching country from countries array by name or code
                          let countryName = '';
                          if (addressData.country) {
                            const countryInput = addressData.country.trim();
                            const countryInputLower = countryInput.toLowerCase();

                            // Try to find country by code first (most reliable)
                            let countryFromAddress = countries.length > 0 ? countries.find(
                              c => c.code.toLowerCase() === countryInputLower
                            ) : null;

                            // If not found by code, try by name (exact match)
                            if (!countryFromAddress && countries.length > 0) {
                              countryFromAddress = countries.find(
                                c => c.name.toLowerCase() === countryInputLower
                              );
                            }

                            // If still not found, try partial/fuzzy name match
                            if (!countryFromAddress && countries.length > 0) {
                              countryFromAddress = countries.find(
                                c => {
                                  const nameLower = c.name.toLowerCase();
                                  // Check if either string contains the other (fuzzy match)
                                  return nameLower.includes(countryInputLower) ||
                                    countryInputLower.includes(nameLower) ||
                                    // Handle common variations
                                    (countryInputLower.includes('united states') && (nameLower.includes('united states') || c.code === 'US')) ||
                                    (countryInputLower.includes('usa') && c.code === 'US') ||
                                    (countryInputLower.includes('canada') && c.code === 'CA') ||
                                    (countryInputLower.includes('russia') && (nameLower.includes('russia') || c.code === 'RU')) ||
                                    (countryInputLower.includes('russian') && (nameLower.includes('russia') || c.code === 'RU'));
                                }
                              );
                            }

                            // Set country name if found
                            if (countryFromAddress) {
                              countryName = countryFromAddress.name;
                            } else {
                              // Fallback: try to map common country codes/names
                              const countryCodeMap: { [key: string]: string } = {
                                'us': 'US', 'usa': 'US', 'united states': 'US', 'united states of america': 'US',
                                'ca': 'CA', 'canada': 'CA',
                                'uk': 'GB', 'united kingdom': 'GB', 'gb': 'GB', 'great britain': 'GB',
                                'in': 'IN', 'india': 'IN',
                                'au': 'AU', 'australia': 'AU',
                                'ru': 'RU', 'russia': 'RU', 'russian federation': 'RU', 'russian': 'RU'
                              };

                              const mappedCode = countryCodeMap[countryInputLower];
                              if (mappedCode && countries.length > 0) {
                                // Find the country by code in the countries array
                                const countryByCode = countries.find(c => c.code === mappedCode);
                                if (countryByCode) {
                                  countryName = countryByCode.name;
                                } else {
                                  // If countries array not loaded yet, use common name
                                  const countryNameMap: { [key: string]: string } = {
                                    'US': 'United States', 'CA': 'Canada', 'GB': 'United Kingdom',
                                    'IN': 'India', 'AU': 'Australia', 'RU': 'Russia'
                                  };
                                  countryName = countryNameMap[mappedCode] || countryInput;
                                }
                              } else if (countries.length > 0) {
                                // Try to find by partial match in countries array as last resort
                                const partialMatch = countries.find(c => {
                                  const nameLower = c.name.toLowerCase();
                                  return nameLower.includes(countryInputLower) || countryInputLower.includes(nameLower);
                                });
                                countryName = partialMatch ? partialMatch.name : countryInput;
                              } else {
                                // Countries array not loaded - use input as-is (will be matched when array loads)
                                countryName = countryInput;
                              }
                            }
                          }

                          // Map state/province name to code for US and Canada
                          let stateProvinceValue = addressData.state || '';
                          if (countryName && addressData.state) {
                            // Check if it's US
                            const foundCountry = countries.find(c => c.name === countryName);
                            const isUS = countryName.toLowerCase().includes('united states') ||
                              countryName.toLowerCase() === 'usa' ||
                              foundCountry?.code === 'US';

                            // Check if it's Canada
                            const isCA = countryName.toLowerCase().includes('canada') ||
                              foundCountry?.code === 'CA';

                            if (isUS && addressData.state) {
                              // Try to find matching US state code
                              const matchedState = US_STATES.find(
                                s => s.label.toLowerCase() === addressData.state.toLowerCase() ||
                                  s.value.toLowerCase() === addressData.state.toLowerCase()
                              );
                              if (matchedState) {
                                stateProvinceValue = matchedState.value;
                              }
                            } else if (isCA && addressData.state) {
                              // Try to find matching Canadian province code
                              const matchedProvince = CANADIAN_PROVINCES.find(
                                p => p.label.toLowerCase() === addressData.state.toLowerCase() ||
                                  p.value.toLowerCase() === addressData.state.toLowerCase()
                              );
                              if (matchedProvince) {
                                stateProvinceValue = matchedProvince.value;
                              }
                            }
                            // For other countries, use the state name as-is
                          }

                          // Populate all address fields
                          setFormData({
                            ...formData,
                            address: addressData.address || '',
                            city: addressData.city || '',
                            postalCode: addressData.postalCode || '',
                            stateProvince: stateProvinceValue,
                            country: countryName,
                            searchAddress: addressData.fullAddress || ''
                          });

                          // Also populate payment address fields with the same values
                          setPersonalData({
                            ...personalData,
                            paymentAddress: addressData.address || '',
                            paymentCity: addressData.city || '',
                            paymentPostalCode: addressData.postalCode || '',
                            paymentStateProvince: stateProvinceValue,
                            paymentCountry: countryName,
                            paymentSearchAddress: addressData.fullAddress || ''
                          });

                          // Clear validation errors for address fields
                          const updatedErrors = { ...validationErrors };
                          if (updatedErrors.address) delete updatedErrors.address;
                          if (updatedErrors.city) delete updatedErrors.city;
                          if (updatedErrors.postalCode) delete updatedErrors.postalCode;
                          if (updatedErrors.country) delete updatedErrors.country;
                          if (updatedErrors.stateProvince) delete updatedErrors.stateProvince;
                          setValidationErrors(updatedErrors);
                        }}
                        className=""
                      />
                    </div>

                    {/* Fifth Row */}
                    <div className="grid grid-cols-4 gap-2">
                      <div>
                        <label className="block text-xs font-medium text-primary mb-0.5">Address</label>
                        <input
                          type="text"
                          placeholder="Address"
                          value={formData.address}
                          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                          className="w-full px-2 py-1 text-xs border border-theme rounded focus:outline-none focus:ring-2 focus:ring-[var(--accent-navyblue)] focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-primary mb-0.5">Unit</label>
                        <input
                          type="text"
                          placeholder="Unit"
                          value={formData.unit}
                          onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                          className="w-full px-2 py-1 text-xs border border-theme rounded focus:outline-none focus:ring-2 focus:ring-[var(--accent-navyblue)] focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-primary mb-0.5">City</label>
                        <input
                          type="text"
                          placeholder="City"
                          value={formData.city}
                          onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                          className="w-full px-2 py-1 text-xs border border-theme rounded focus:outline-none focus:ring-2 focus:ring-[var(--accent-navyblue)] focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-primary mb-0.5">Postal Code</label>
                        <input
                          type="text"
                          placeholder="Postal Code"
                          value={formData.postalCode}
                          onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                          className="w-full px-2 py-1 text-xs border border-theme rounded focus:outline-none focus:ring-2 focus:ring-[var(--accent-navyblue)] focus:border-transparent"
                        />
                      </div>
                    </div>

                    {/* Profile Image Row */}
                    <div>
                      <label className="block text-sm font-medium text-primary mb-1">Profile Image</label>
                      <div className="flex items-center gap-4">
                        <div className="flex-shrink-0">
                          {profileImagePreview ? (
                            <img
                              src={profileImagePreview}
                              alt="Profile preview"
                              className="w-24 h-24 rounded-lg object-cover border-2 border-theme"
                              onError={() => {
                                // If image fails to load, show placeholder
                                setProfileImagePreview(null);
                              }}
                            />
                          ) : (
                            <div className="w-24 h-24 rounded-lg border-2 border-dashed border-theme flex items-center justify-center bg-card">
                              <User className="w-8 h-8 text-secondary" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1">
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                // Validate file size (20MB max)
                                if (file.size > 20 * 1024 * 1024) {
                                  alert('File size must be less than 20MB');
                                  if (fileInputRef.current) {
                                    fileInputRef.current.value = '';
                                  }
                                  return;
                                }
                                // Validate file type
                                if (!file.type.startsWith('image/')) {
                                  alert('Please select an image file');
                                  if (fileInputRef.current) {
                                    fileInputRef.current.value = '';
                                  }
                                  return;
                                }
                                setFormData({ ...formData, profileImage: file });
                                // Create preview
                                const reader = new FileReader();
                                reader.onloadend = () => {
                                  setProfileImagePreview(reader.result as string);
                                };
                                reader.readAsDataURL(file);
                              }
                            }}
                            className="hidden"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              fileInputRef.current?.click();
                            }}
                            className="inline-block !mr-3 px-4 py-2 bg-[var(--accent-navyblue)] !text-white rounded-lg cursor-pointer hover:bg-[var(--accent-navyblue)]/80 transition-colors"
                          >
                            {formData.profileImage ? 'Change Image' : 'Select Image'}
                          </button>
                          {formData.profileImage && (
                            <button
                              type="button"
                              onClick={() => {
                                setFormData({ ...formData, profileImage: null });
                                setProfileImagePreview(null);
                                if (fileInputRef.current) {
                                  fileInputRef.current.value = '';
                                }
                              }}
                              className="ml-2 px-4 py-2 bg-[var(--accent-red)] !text-white rounded-lg hover:bg-[var(--accent-red)]/80 transition-colors"
                            >
                              Remove
                            </button>
                          )}
                          <p className="text-xs text-secondary mt-2">JPG, PNG or GIF (Max 20MB)</p>
                        </div>
                      </div>
                    </div>

                    {/* Sixth Row */}
                    <div className="grid grid-cols-2 gap-2">
                      {/* Country */}
                      <div>
                        <label className="block text-xs font-medium text-primary mb-0.5">
                          Country <span className="text-[var(--accent-red)]">*</span>
                        </label>

                        <select
                          value={(() => {
                            const foundCountry = countries.find(c => c.name === formData.country);
                            return foundCountry ? foundCountry.code : '';
                          })()}
                          onChange={(e) => {
                            const selectedCountry = countries.find(c => c.code === e.target.value);
                            setFormData({
                              ...formData,
                              country: selectedCountry ? selectedCountry.name : '',
                              stateProvince: ''
                            });
                            if (validationErrors.country) {
                              setValidationErrors({ ...validationErrors, country: '' });
                            }
                            if (validationErrors.stateProvince) {
                              setValidationErrors({ ...validationErrors, stateProvince: '' });
                            }
                          }}
                          className={`w-full px-2 py-1 text-xs bg-[rgba(255,255,255,0.05)] text-primary border rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)] focus:border-[var(--accent-blue)] hover:bg-[rgba(0,209,255,0.08)] transition-all duration-200 ${validationErrors.country
                            ? 'border-[var(--accent-red)]'
                            : 'border-theme'
                            }`}
                        >
                          <option className="bg-[#0f1b2d] text-white" value="">
                            Select Country
                          </option>
                          {countries.map((country) => (
                            <option
                              key={country.code}
                              value={country.code}
                              className="bg-[#0f1b2d] text-white"
                            >
                              {country.flag} {country.name}
                            </option>
                          ))}
                        </select>

                        {validationErrors.country && (
                          <p className="text-xs text-[var(--accent-red)] mt-0.5">
                            {validationErrors.country}
                          </p>
                        )}
                      </div>

                      {/* Province / State */}
                      <div>
                        <label className="block text-xs font-medium text-primary mb-0.5">
                          Province/State <span className="text-[var(--accent-red)]">*</span>
                        </label>

                        <input
                          type="text"
                          value={formData.stateProvince}
                          onChange={(e) => {
                            setFormData({ ...formData, stateProvince: e.target.value });
                            if (validationErrors.stateProvince) {
                              setValidationErrors({
                                ...validationErrors,
                                stateProvince: ''
                              });
                            }
                          }}
                          disabled={!formData.country}
                          placeholder={formData.country ? "Enter Province/State" : "Select country first"}
                          className={`w-full px-2 py-1 text-xs bg-[rgba(255,255,255,0.05)] text-primary placeholder:text-secondary border rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)] focus:border-[var(--accent-blue)] hover:bg-[rgba(0,209,255,0.08)] transition-all duration-200 disabled:bg-[rgba(255,255,255,0.02)] disabled:text-secondary disabled:cursor-not-allowed ${validationErrors.stateProvince
                            ? 'border-[var(--accent-red)]'
                            : 'border-theme'
                            }`}
                        />

                        {validationErrors.stateProvince && (
                          <p className="text-xs text-[var(--accent-red)] mt-0.5">
                            {validationErrors.stateProvince}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {activeFormTab === 'personal' && (
                  <div className="space-y-6">
                    <h3 className="text-lg font-bold text-primary mb-4">Personal Information</h3>

                    {/* Personal Information Section */}
                    <div className="grid grid-cols-5 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-primary mb-1">Social Insurance Number</label>
                        <input
                          type="text"
                          placeholder="Social Insurance Nu"
                          value={personalData.socialInsuranceNumber}
                          onChange={(e) => setPersonalData({ ...personalData, socialInsuranceNumber: e.target.value })}
                          className="w-full px-3 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-navyblue)] focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-primary mb-1">
                          Hire Date
                        </label>

                        <div
                          className="relative cursor-pointer"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            hireDateRef.current?.showPicker?.();
                            hireDateRef.current?.focus();
                          }}
                        >
                          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary pointer-events-none z-10" />

                          <input
                            ref={hireDateRef}
                            type="date"
                            value={personalData.hireDate}
                            onChange={(e) =>
                              setPersonalData({ ...personalData, hireDate: e.target.value })
                            }
                            className="w-full pl-10 pr-3 py-2 bg-[rgba(255,255,255,0.05)] text-primary border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)] focus:border-[var(--accent-blue)] hover:bg-[rgba(0,209,255,0.08)] transition-all duration-200 cursor-pointer"
                            placeholder="Select"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-primary mb-1">
                          Termination Date
                        </label>

                        <div
                          className="relative cursor-pointer"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            terminationDateRef.current?.showPicker?.();
                            terminationDateRef.current?.focus();
                          }}
                        >
                          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary pointer-events-none z-10" />

                          <input
                            ref={terminationDateRef}
                            type="date"
                            value={personalData.terminationDate}
                            onChange={(e) =>
                              setPersonalData({
                                ...personalData,
                                terminationDate: e.target.value,
                              })
                            }
                            className="w-full pl-10 pr-3 py-2 bg-[rgba(255,255,255,0.05)] text-primary border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)] focus:border-[var(--accent-blue)] hover:bg-[rgba(0,209,255,0.08)] transition-all duration-200 cursor-pointer"
                            placeholder="Select"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-primary mb-1">
                          Status <span className="text-[var(--accent-red)]">*</span>
                        </label>

                        <select
                          value={personalData.status}
                          onChange={(e) => {
                            setPersonalData({ ...personalData, status: e.target.value });
                            if (validationErrors.status) {
                              setValidationErrors({ ...validationErrors, status: '' });
                            }
                          }}
                          className={`w-full px-3 py-2 bg-[rgba(255,255,255,0.05)] text-primary border rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)] focus:border-[var(--accent-blue)] hover:bg-[rgba(0,209,255,0.08)] transition-all duration-200 ${validationErrors.status
                            ? 'border-[var(--accent-red)]'
                            : 'border-theme'
                            }`}
                        >
                          <option className="bg-[#0f1b2d] text-white" value="">
                            Select Status
                          </option>
                          <option className="bg-[#0f1b2d] text-white" value="Active">
                            Active
                          </option>
                          <option className="bg-[#0f1b2d] text-white" value="Inactive">
                            Inactive
                          </option>
                          <option className="bg-[#0f1b2d] text-white" value="Terminated">
                            Terminated
                          </option>
                        </select>

                        {validationErrors.status && (
                          <p className="text-xs text-[var(--accent-red)] mt-0.5">
                            {validationErrors.status}
                          </p>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-primary mb-1">Vacation %</label>
                        <input
                          type="text"
                          placeholder="0"
                          value={personalData.vacationPercent}
                          onChange={(e) => setPersonalData({ ...personalData, vacationPercent: e.target.value })}
                          className="w-full px-3 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-navyblue)] focus:border-transparent"
                        />
                      </div>
                    </div>

                    {/* Pay Information Section */}
                    <div className="mt-6">
                      <h4 className="text-md font-bold text-primary mb-4">Pay Information</h4>
                      <div className="grid grid-cols-3 gap-4 mb-4">
                        <div>
                          <label className="block text-sm font-medium text-primary mb-1">Corporation Name</label>
                          <input
                            type="text"
                            placeholder="Corporation Name"
                            value={personalData.corporationName}
                            onChange={(e) => setPersonalData({ ...personalData, corporationName: e.target.value })}
                            className="w-full px-3 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-navyblue)] focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-primary mb-1">Driver Name</label>
                          <input
                            type="text"
                            placeholder="Driver Name"
                            value={personalData.driverName}
                            onChange={(e) => setPersonalData({ ...personalData, driverName: e.target.value })}
                            className="w-full px-3 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-navyblue)] focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-primary mb-1">GST No.</label>
                          <input
                            type="text"
                            placeholder="GST No."
                            value={personalData.gstNo}
                            onChange={(e) => setPersonalData({ ...personalData, gstNo: e.target.value })}
                            className="w-full px-3 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-navyblue)] focus:border-transparent"
                          />
                        </div>
                      </div>
                      <div className="w-full">
                        <AddressSearch
                          label="Payment Address"
                          placeholder="Search For An Address..."
                          onAddressSelect={(addressData) => {
                            // Find matching country from countries array by name or code
                            let countryName = '';
                            if (addressData.country) {
                              const countryInput = addressData.country.trim();
                              const countryInputLower = countryInput.toLowerCase();

                              // Try to find country by code first (most reliable)
                              let countryFromAddress = countries.length > 0 ? countries.find(
                                c => c.code.toLowerCase() === countryInputLower
                              ) : null;

                              // If not found by code, try by name (exact match)
                              if (!countryFromAddress && countries.length > 0) {
                                countryFromAddress = countries.find(
                                  c => c.name.toLowerCase() === countryInputLower
                                );
                              }

                              // If still not found, try partial/fuzzy name match
                              if (!countryFromAddress && countries.length > 0) {
                                countryFromAddress = countries.find(
                                  c => {
                                    const nameLower = c.name.toLowerCase();
                                    // Check if either string contains the other (fuzzy match)
                                    return nameLower.includes(countryInputLower) ||
                                      countryInputLower.includes(nameLower) ||
                                      // Handle common variations
                                      (countryInputLower.includes('united states') && (nameLower.includes('united states') || c.code === 'US')) ||
                                      (countryInputLower.includes('usa') && c.code === 'US') ||
                                      (countryInputLower.includes('canada') && c.code === 'CA') ||
                                      (countryInputLower.includes('russia') && (nameLower.includes('russia') || c.code === 'RU')) ||
                                      (countryInputLower.includes('russian') && (nameLower.includes('russia') || c.code === 'RU'));
                                  }
                                );
                              }

                              // Set country name if found
                              if (countryFromAddress) {
                                countryName = countryFromAddress.name;
                              } else {
                                // Fallback: try to map common country codes/names
                                const countryCodeMap: { [key: string]: string } = {
                                  'us': 'US', 'usa': 'US', 'united states': 'US', 'united states of america': 'US',
                                  'ca': 'CA', 'canada': 'CA',
                                  'uk': 'GB', 'united kingdom': 'GB', 'gb': 'GB', 'great britain': 'GB',
                                  'in': 'IN', 'india': 'IN',
                                  'au': 'AU', 'australia': 'AU',
                                  'ru': 'RU', 'russia': 'RU', 'russian federation': 'RU', 'russian': 'RU'
                                };

                                const mappedCode = countryCodeMap[countryInputLower];
                                if (mappedCode && countries.length > 0) {
                                  // Find the country by code in the countries array
                                  const countryByCode = countries.find(c => c.code === mappedCode);
                                  if (countryByCode) {
                                    countryName = countryByCode.name;
                                  } else {
                                    // If countries array not loaded yet, use common name
                                    const countryNameMap: { [key: string]: string } = {
                                      'US': 'United States', 'CA': 'Canada', 'GB': 'United Kingdom',
                                      'IN': 'India', 'AU': 'Australia', 'RU': 'Russia'
                                    };
                                    countryName = countryNameMap[mappedCode] || countryInput;
                                  }
                                } else if (countries.length > 0) {
                                  // Try to find by partial match in countries array as last resort
                                  const partialMatch = countries.find(c => {
                                    const nameLower = c.name.toLowerCase();
                                    return nameLower.includes(countryInputLower) || countryInputLower.includes(nameLower);
                                  });
                                  countryName = partialMatch ? partialMatch.name : countryInput;
                                } else {
                                  // Countries array not loaded - use input as-is (will be matched when array loads)
                                  countryName = countryInput;
                                }
                              }
                            }

                            // Map state/province name to code for US and Canada
                            let stateProvinceValue = addressData.state || '';
                            if (countryName && addressData.state) {
                              // Check if it's US
                              const foundCountry = countries.find(c => c.name === countryName);
                              const isUS = countryName.toLowerCase().includes('united states') ||
                                countryName.toLowerCase() === 'usa' ||
                                foundCountry?.code === 'US';

                              // Check if it's Canada
                              const isCA = countryName.toLowerCase().includes('canada') ||
                                foundCountry?.code === 'CA';

                              if (isUS && addressData.state) {
                                // Try to find matching US state code
                                const matchedState = US_STATES.find(
                                  s => s.label.toLowerCase() === addressData.state.toLowerCase() ||
                                    s.value.toLowerCase() === addressData.state.toLowerCase()
                                );
                                if (matchedState) {
                                  stateProvinceValue = matchedState.value;
                                }
                              } else if (isCA && addressData.state) {
                                // Try to find matching Canadian province code
                                const matchedProvince = CANADIAN_PROVINCES.find(
                                  p => p.label.toLowerCase() === addressData.state.toLowerCase() ||
                                    p.value.toLowerCase() === addressData.state.toLowerCase()
                                );
                                if (matchedProvince) {
                                  stateProvinceValue = matchedProvince.value;
                                }
                              }
                              // For other countries, use the state name as-is
                            }

                            // Update payment address fields
                            setPersonalData({
                              ...personalData,
                              paymentAddress: addressData.address || '',
                              paymentCity: addressData.city || '',
                              paymentPostalCode: addressData.postalCode || '',
                              paymentStateProvince: stateProvinceValue,
                              paymentCountry: countryName,
                              paymentSearchAddress: addressData.fullAddress || ''
                            });
                          }}
                          className=""
                        />
                      </div>

                      {/* Payment Address Fields */}
                      <div className="grid grid-cols-3 gap-4 mt-4">
                        <div>
                          <label className="block text-sm font-medium text-primary mb-1">Payment Address</label>
                          <input
                            type="text"
                            placeholder="Payment Address"
                            value={personalData.paymentAddress}
                            onChange={(e) => setPersonalData({ ...personalData, paymentAddress: e.target.value })}
                            className="w-full px-3 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-navyblue)] focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-primary mb-1">Payment City</label>
                          <input
                            type="text"
                            placeholder="Payment City"
                            value={personalData.paymentCity}
                            onChange={(e) => setPersonalData({ ...personalData, paymentCity: e.target.value })}
                            className="w-full px-3 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-navyblue)] focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-primary mb-1">Payment Postal Code</label>
                          <input
                            type="text"
                            placeholder="Payment Postal Code"
                            value={personalData.paymentPostalCode}
                            onChange={(e) => setPersonalData({ ...personalData, paymentPostalCode: e.target.value })}
                            className="w-full px-3 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-navyblue)] focus:border-transparent"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 mt-4">
                        {/* Payment Country */}
                        <div>
                          <label className="block text-sm font-medium text-primary mb-1">
                            Payment Country
                          </label>

                          <select
                            value={(() => {
                              const foundCountry = countries.find(
                                (c) => c.name === personalData.paymentCountry
                              );
                              return foundCountry ? foundCountry.code : "";
                            })()}
                            onChange={(e) => {
                              const selectedCountry = countries.find(
                                (c) => c.code === e.target.value
                              );
                              setPersonalData({
                                ...personalData,
                                paymentCountry: selectedCountry
                                  ? selectedCountry.name
                                  : "",
                                paymentStateProvince: "",
                              });
                            }}
                            className="w-full px-3 py-2 bg-[rgba(255,255,255,0.05)] text-primary border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)] focus:border-[var(--accent-blue)] hover:bg-[rgba(0,209,255,0.08)] transition-all duration-200"
                          >
                            <option className="bg-[#0f1b2d] text-white" value="">
                              Select Country
                            </option>
                            {countries.map((country) => (
                              <option
                                key={country.code}
                                value={country.code}
                                className="bg-[#0f1b2d] text-white"
                              >
                                {country.flag} {country.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Payment Province / State */}
                        <div>
                          <label className="block text-sm font-medium text-primary mb-1">
                            Payment Province/State
                          </label>

                          <input
                            type="text"
                            value={personalData.paymentStateProvince}
                            onChange={(e) =>
                              setPersonalData({
                                ...personalData,
                                paymentStateProvince: e.target.value,
                              })
                            }
                            disabled={!personalData.paymentCountry}
                            placeholder={
                              personalData.paymentCountry
                                ? "Enter Province/State"
                                : "Select country first"
                            }
                            className="w-full px-3 py-2 bg-[rgba(255,255,255,0.05)] text-primary placeholder:text-secondary border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)] focus:border-[var(--accent-blue)] hover:bg-[rgba(0,209,255,0.08)] transition-all duration-200 disabled:bg-[rgba(255,255,255,0.02)] disabled:text-secondary disabled:cursor-not-allowed"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Pay Type Section */}
                    <div className="mt-4">
                      <label className="block text-xs font-medium text-primary mb-1.5">Pay Type</label>

                      {/* Driver Type Toggle */}
                      <div className="mb-1.5">
                        <div className="flex gap-0">
                          <button
                            type="button"
                            onClick={() => setPersonalData({ ...personalData, driverType: 'COMPANY DRIVER' })}
                            className={`px-4 py-1.5 text-xs font-medium transition-colors rounded-l ${personalData.driverType === 'COMPANY DRIVER'
                              ? 'bg-[var(--accent-navyblue)] !text-white'
                              : 'bg-[rgba(255,255,255,0.08)] text-secondary hover:bg-[rgba(255,255,255,0.12)]'
                              }`}
                          >
                            COMPANY DRIVER
                          </button>
                          <button
                            type="button"
                            onClick={() => setPersonalData({ ...personalData, driverType: 'OWNER OPERATOR' })}
                            className={`px-4 py-1.5 text-xs font-medium transition-colors rounded-r ${personalData.driverType === 'OWNER OPERATOR'
                              ? 'bg-[var(--accent-navyblue)] !text-white'
                              : 'bg-[rgba(255,255,255,0.08)] text-secondary hover:bg-[rgba(255,255,255,0.12)]'
                              }`}
                          >
                            OWNER OPERATOR
                          </button>
                        </div>
                      </div>


                      {/* Configure Payroll Text - shown when OWNER OPERATOR is selected */}
                      {personalData.driverType === 'OWNER OPERATOR' && (
                        <p className="text-xs font-medium text-primary mt-1.5 mb-3">
                          CONFIGURE PAYROLL IN TRUCK
                        </p>
                      )}

                      {/* Payment Method Tabs - Show for both COMPANY DRIVER and OWNER OPERATOR */}
                      <div className="mb-3">
                        <div className="flex gap-1.5 flex-wrap">
                          {[
                            'PAID PER MILE',
                            'PAID PERCENT',
                            'PAID BY TRIP',
                            'PAID PER HOUR',
                            'PAID PER DAY'
                          ].map((method) => (
                            <button
                              key={method}
                              type="button"
                              onClick={() => setPersonalData({ ...personalData, paymentMethod: method as any })}
                              className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${personalData.paymentMethod === method
                                ? 'bg-[var(--accent-navyblue)] !text-white'
                                : 'bg-[rgba(255,255,255,0.08)] text-secondary hover:bg-[rgba(255,255,255,0.12)]'
                                }`}
                            >
                              {method}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* $/Mile Details (shown when PAID PER MILE is selected) */}
                      {personalData.paymentMethod === 'PAID PER MILE' && (
                        <div className="grid grid-cols-4 gap-4 mt-4">
                          <div>
                            <label className="block text-sm font-medium text-primary mb-1">
                              ALONE<span className="text-[var(--accent-red)]">*</span>
                            </label>
                            <input
                              type="text"
                              value={personalData.alone}
                              onChange={(e) => setPersonalData({ ...personalData, alone: e.target.value })}
                              className="w-full px-3 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-navyblue)] focus:border-transparent"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-primary mb-1">
                              EMPTY<span className="text-[var(--accent-red)]">*</span>
                            </label>
                            <input
                              type="text"
                              value={personalData.empty}
                              onChange={(e) => setPersonalData({ ...personalData, empty: e.target.value })}
                              className="w-full px-3 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-navyblue)] focus:border-transparent"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-primary mb-1">DROP</label>
                            <input
                              type="text"
                              value={personalData.bonusDrop}
                              onChange={(e) => setPersonalData({ ...personalData, bonusDrop: e.target.value })}
                              className="w-full px-3 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-navyblue)] focus:border-transparent"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-primary mb-1">
                              TEAM<span className="text-[var(--accent-red)]">*</span>
                            </label>
                            <input
                              type="text"
                              value={personalData.team}
                              onChange={(e) => setPersonalData({ ...personalData, team: e.target.value })}
                              className="w-full px-3 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-navyblue)] focus:border-transparent"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-primary mb-1">
                              EMPTY-TEAM<span className="text-[var(--accent-red)]">*</span>
                            </label>
                            <input
                              type="text"
                              value={personalData.emptyTeam}
                              onChange={(e) => setPersonalData({ ...personalData, emptyTeam: e.target.value })}
                              className="w-full px-3 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-navyblue)] focus:border-transparent"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-primary mb-1">PICK</label>
                            <input
                              type="text"
                              value={personalData.bonusPick}
                              onChange={(e) => setPersonalData({ ...personalData, bonusPick: e.target.value })}
                              className="w-full px-3 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-navyblue)] focus:border-transparent"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-primary mb-1">BONUS/LAYOVER</label>
                            <input
                              type="text"
                              value={personalData.bonusLayover}
                              onChange={(e) => setPersonalData({ ...personalData, bonusLayover: e.target.value })}
                              className="w-full px-3 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-navyblue)] focus:border-transparent"
                            />
                          </div>
                        </div>
                      )}

                      {/* Percent Rate (shown when PAID PERCENT is selected) */}
                      {personalData.paymentMethod === 'PAID PERCENT' && (
                        <div className="mt-4">
                          <h4 className="text-md font-bold text-primary mb-4">Percent Rate</h4>
                          <div>
                            <label className="block text-sm font-medium text-primary mb-1">
                              %<span className="text-[var(--accent-red)]">*</span>
                            </label>
                            <input
                              type="text"
                              value={personalData.percentRate}
                              onChange={(e) => setPersonalData({ ...personalData, percentRate: e.target.value })}
                              className="w-full px-3 py-2 border border-theme rounded-lg bg-card focus:outline-none focus:ring-2 focus:ring-[var(--accent-navyblue)] focus:border-transparent"
                            />
                          </div>
                        </div>
                      )}

                      {/* Per Trip Amount (shown when PAID BY TRIP is selected) */}
                      {personalData.paymentMethod === 'PAID BY TRIP' && (
                        <div className="mt-4">
                          <div>
                            <label className="block text-xs font-medium text-primary mb-0.5">
                              Per Trip Amount<span className="text-[var(--accent-red)]">*</span>
                            </label>
                            <input
                              type="text"
                              value={personalData.perTripAmount}
                              onChange={(e) => setPersonalData({ ...personalData, perTripAmount: e.target.value })}
                              className="w-full px-2 py-1 text-xs border border-theme rounded focus:outline-none focus:ring-2 focus:ring-[var(--accent-navyblue)] focus:border-transparent"
                              placeholder="0"
                            />
                          </div>
                        </div>
                      )}

                      {/* Hourly Rate (shown when PAID PER HOUR is selected) */}
                      {personalData.paymentMethod === 'PAID PER HOUR' && (
                        <div className="mt-4">
                          <div>
                            <label className="block text-xs font-medium text-primary mb-0.5">
                              PER HOUR<span className="text-[var(--accent-red)]">*</span>
                            </label>
                            <input
                              type="text"
                              value={personalData.hourlyRate}
                              onChange={(e) => setPersonalData({ ...personalData, hourlyRate: e.target.value })}
                              className="w-full px-2 py-1 text-xs border border-theme rounded focus:outline-none focus:ring-2 focus:ring-[var(--accent-navyblue)] focus:border-transparent"
                              placeholder="0"
                            />
                          </div>
                        </div>
                      )}

                      {/* Daily Rate (shown when PAID PER DAY is selected) */}
                      {personalData.paymentMethod === 'PAID PER DAY' && (
                        <div className="mt-4">
                          <div>
                            <label className="block text-xs font-medium text-primary mb-0.5">
                              PER DAY<span className="text-[var(--accent-red)]">*</span>
                            </label>
                            <input
                              type="text"
                              value={personalData.dailyRate}
                              onChange={(e) => setPersonalData({ ...personalData, dailyRate: e.target.value })}
                              className="w-full px-2 py-1 text-xs border border-theme rounded focus:outline-none focus:ring-2 focus:ring-[var(--accent-navyblue)] focus:border-transparent"
                              placeholder="0"
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Driver Type Section */}
                    <div className="mt-6">
                      <h4 className="text-md font-bold text-primary mb-4">Driver Type</h4>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setPersonalData({ ...personalData, driverTypeSolo: true })}
                          className={`px-6 py-2 rounded-sm font-medium transition-colors ${personalData.driverTypeSolo
                            ? 'bg-[var(--accent-navyblue)] !text-white'
                            : 'bg-[rgba(255,255,255,0.08)] text-secondary hover:bg-[rgba(255,255,255,0.12)]'
                            }`}
                        >
                          SOLO
                        </button>
                        <button
                          type="button"
                          onClick={() => setPersonalData({ ...personalData, driverTypeSolo: false })}
                          className={`px-6 py-2 rounded-sm font-medium transition-colors ${!personalData.driverTypeSolo
                            ? 'bg-[var(--accent-navyblue)] !text-white'
                            : 'bg-[rgba(255,255,255,0.08)] text-secondary hover:bg-[rgba(255,255,255,0.12)]'
                            }`}
                        >
                          TEAM
                        </button>
                      </div>
                    </div>

                    {/* Exemption Checkboxes */}
                    <div className="mt-6">
                      <h4 className="text-md font-bold text-primary mb-4">Exemptions</h4>
                      <div className="flex gap-6">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={personalData.cppExempt}
                            onChange={(e) => setPersonalData({ ...personalData, cppExempt: e.target.checked })}
                            className="w-4 h-4 text-[var(--accent-navyblue)] border-theme rounded focus:ring-[var(--accent-navyblue)]"
                          />
                          <span className="text-sm font-medium text-primary">CPP Exempt</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={personalData.payrollTaxExempt}
                            onChange={(e) => setPersonalData({ ...personalData, payrollTaxExempt: e.target.checked })}
                            className="w-4 h-4 text-[var(--accent-navyblue)] border-theme rounded focus:ring-[var(--accent-navyblue)]"
                          />
                          <span className="text-sm font-medium text-primary">Payroll Tax Exempt</span>
                        </label>
                      </div>
                    </div>

                    {/* Cross-Border Eligibility */}
                    <div className="mt-6">
                      <h4 className="text-md font-bold text-primary mb-4">Cross-Border Eligibility</h4>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={personalData.cross_border_eligible}
                          onChange={(e) => setPersonalData({ ...personalData, cross_border_eligible: e.target.checked })}
                          className="w-4 h-4 text-[var(--accent-navyblue)] border-theme rounded focus:ring-[var(--accent-navyblue)]"
                        />
                        <span className="text-sm font-medium text-primary">Cross-Border Eligible</span>
                      </label>
                    </div>

                    {/* Custom HST % */}
                    <div className="mt-6">
                      <label className="block text-sm font-medium text-primary mb-1">Custom HST %</label>
                      <input
                        type="text"
                        placeholder="Leave Empty To Use Compar"
                        value={personalData.customHst}
                        onChange={(e) => setPersonalData({ ...personalData, customHst: e.target.value })}
                        className="w-full px-3 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-navyblue)] focus:border-transparent"
                      />
                    </div>

                    {/* Gender and Citizenship */}
                    <div className="mt-6 grid grid-cols-2 gap-4">
                      {/* Gender */}
                      <div>
                        <label className="block text-sm font-medium text-primary mb-1">
                          Gender
                        </label>

                        <select
                          value={personalData.gender}
                          onChange={(e) =>
                            setPersonalData({ ...personalData, gender: e.target.value })
                          }
                          className="w-full px-3 py-2 bg-[rgba(255,255,255,0.05)] text-primary border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)] focus:border-[var(--accent-blue)] hover:bg-[rgba(0,209,255,0.08)] transition-all duration-200"
                        >
                          <option className="bg-[#0f1b2d] text-white" value="">
                            Select Gender
                          </option>
                          <option className="bg-[#0f1b2d] text-white" value="Male">
                            Male
                          </option>
                          <option className="bg-[#0f1b2d] text-white" value="Female">
                            Female
                          </option>
                          <option className="bg-[#0f1b2d] text-white" value="Other">
                            Other
                          </option>
                          <option className="bg-[#0f1b2d] text-white" value="Prefer not to say">
                            Prefer not to say
                          </option>
                        </select>
                      </div>

                      {/* Citizenship */}
                      <div>
                        <label className="block text-sm font-medium text-primary mb-1">
                          Citizenship
                        </label>

                        <select
                          value={personalData.citizenship}
                          onChange={(e) =>
                            setPersonalData({
                              ...personalData,
                              citizenship: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 bg-[rgba(255,255,255,0.05)] text-primary border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)] focus:border-[var(--accent-blue)] hover:bg-[rgba(0,209,255,0.08)] transition-all duration-200"
                        >
                          <option className="bg-[#0f1b2d] text-white" value="">
                            Select Citizenship
                          </option>
                          {countries.map((country) => (
                            <option
                              key={country.code}
                              value={country.name}
                              className="bg-[#0f1b2d] text-white"
                            >
                              {country.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                  </div>
                )}

                {activeFormTab === 'travel' && (
                  <div className="space-y-6">
                    <h3 className="text-lg font-bold text-primary mb-4">Travel Information</h3>

                    {/* Driver's License Row */}
                    <div className="bg-card p-4 rounded-lg border border-theme">
                      <h4 className="text-sm font-semibold text-primary mb-4">Driver's License</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-primary mb-1">
                            Drivers License #<span className="text-[var(--accent-red)]">*</span>
                          </label>
                          <input
                            type="text"
                            placeholder="Drivers License #"
                            value={travelData.driversLicenseNumber}
                            onChange={(e) => {
                              setTravelData({ ...travelData, driversLicenseNumber: e.target.value });
                              if (validationErrors.driversLicenseNumber) {
                                setValidationErrors({ ...validationErrors, driversLicenseNumber: '' });
                              }
                            }}
                            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-navyblue)] focus:border-transparent ${validationErrors.driversLicenseNumber ? 'border-[var(--accent-red)]' : 'border-theme'
                              }`}
                          />
                          {validationErrors.driversLicenseNumber && (
                            <p className="text-xs text-[var(--accent-red)] mt-0.5">{validationErrors.driversLicenseNumber}</p>
                          )}
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-primary mb-1">
                            Date Of Expiry <span className="text-[var(--accent-red)]">*</span>
                          </label>

                          <div
                            className="relative cursor-pointer"
                            onMouseDown={(e) => {
                              e.preventDefault(); // IMPORTANT
                              expiryRef.current?.showPicker?.();
                              expiryRef.current?.focus();
                            }}
                          >
                            {/* Icon */}
                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary pointer-events-none z-10" />

                            {/* Input */}
                            <input
                              ref={expiryRef}
                              type="date"
                              value={travelData.driversLicenseExpiry}
                              onChange={(e) => {
                                setTravelData({
                                  ...travelData,
                                  driversLicenseExpiry: e.target.value,
                                });
                                if (validationErrors.driversLicenseExpiry) {
                                  setValidationErrors({
                                    ...validationErrors,
                                    driversLicenseExpiry: "",
                                  });
                                }
                              }}
                              className={`w-full pl-10 pr-3 py-2 bg-[rgba(255,255,255,0.05)] text-primary border rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)] focus:border-[var(--accent-blue)] hover:bg-[rgba(0,209,255,0.08)] transition-all duration-200 cursor-pointer ${validationErrors.driversLicenseExpiry
                                ? "border-[var(--accent-red)]"
                                : "border-theme"
                                }`}
                              placeholder="Select"
                            />
                          </div>

                          {validationErrors.driversLicenseExpiry && (
                            <p className="text-xs text-[var(--accent-red)] mt-0.5">
                              {validationErrors.driversLicenseExpiry}
                            </p>
                          )}
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-primary mb-1">License State/Province</label>
                          <input
                            type="text"
                            value={travelData.licenseStateProvince}
                            onChange={(e) => setTravelData({ ...travelData, licenseStateProvince: e.target.value })}
                            placeholder="Enter State/Province"
                            className="w-full px-3 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-navyblue)] focus:border-transparent"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Passport Row */}
                    <div className="bg-card p-4 rounded-lg border border-theme">
                      <h4 className="text-sm font-semibold text-primary mb-4">Passport</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-primary mb-1">
                            Passport #<span className="text-[var(--accent-red)]">*</span>
                          </label>
                          <input
                            type="text"
                            placeholder="Passport #"
                            value={travelData.passportNumber}
                            onChange={(e) => {
                              setTravelData({ ...travelData, passportNumber: e.target.value });
                              if (validationErrors.passportNumber) {
                                setValidationErrors({ ...validationErrors, passportNumber: '' });
                              }
                            }}
                            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-navyblue)] focus:border-transparent ${validationErrors.passportNumber ? 'border-[var(--accent-red)]' : 'border-theme'
                              }`}
                          />
                          {validationErrors.passportNumber && (
                            <p className="text-xs text-[var(--accent-red)] mt-0.5">{validationErrors.passportNumber}</p>
                          )}
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-primary mb-1">
                            Passport Country
                          </label>

                          <select
                            value={travelData.passportCountry}
                            onChange={(e) =>
                              setTravelData({
                                ...travelData,
                                passportCountry: e.target.value,
                              })
                            }
                            className="w-full px-3 py-2 bg-[rgba(255,255,255,0.05)] text-primary border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)] focus:border-[var(--accent-blue)] hover:bg-[rgba(0,209,255,0.08)] transition-all duration-200"
                          >
                            <option className="bg-[#0f1b2d] text-white" value="">
                              Select Passport Country
                            </option>

                            {countries.map((country) => (
                              <option
                                key={country.code}
                                value={country.name}
                                className="bg-[#0f1b2d] text-white"
                              >
                                {country.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-primary mb-1">
                            Date Of Expiry <span className="text-[var(--accent-red)]">*</span>
                          </label>

                          <div
                            className="relative cursor-pointer"
                            onMouseDown={(e) => {
                              e.preventDefault(); // IMPORTANT
                              passportExpiryRef.current?.showPicker?.();
                              passportExpiryRef.current?.focus();
                            }}
                          >
                            {/* Icon */}
                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary pointer-events-none z-10" />

                            {/* Input */}
                            <input
                              ref={passportExpiryRef}
                              type="date"
                              value={travelData.passportExpiry}
                              onChange={(e) => {
                                setTravelData({
                                  ...travelData,
                                  passportExpiry: e.target.value,
                                });
                                if (validationErrors.passportExpiry) {
                                  setValidationErrors({
                                    ...validationErrors,
                                    passportExpiry: "",
                                  });
                                }
                              }}
                              className={`w-full pl-10 pr-3 py-2 bg-[rgba(255,255,255,0.05)] text-primary border rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)] focus:border-[var(--accent-blue)] hover:bg-[rgba(0,209,255,0.08)] transition-all duration-200 cursor-pointer ${validationErrors.passportExpiry
                                ? "border-[var(--accent-red)]"
                                : "border-theme"
                                }`}
                              placeholder="Select"
                            />
                          </div>

                          {validationErrors.passportExpiry && (
                            <p className="text-xs text-[var(--accent-red)] mt-0.5">
                              {validationErrors.passportExpiry}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Fast Card Row */}
                    <div className="bg-card p-4 rounded-lg border border-theme">
                      <h4 className="text-sm font-semibold text-primary mb-4">Fast Card</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-primary mb-1">Fast Card #</label>
                          <input
                            type="text"
                            placeholder="Fast Card #"
                            value={travelData.fastCardNumber}
                            onChange={(e) => setTravelData({ ...travelData, fastCardNumber: e.target.value })}
                            className="w-full px-3 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-navyblue)] focus:border-transparent"
                          />
                        </div>
                        <div>
                          <DateField
                            label="Date Of Expiry"
                            value={travelData.fastCardExpiry}
                            onChange={(e) =>
                              setTravelData({
                                ...travelData,
                                fastCardExpiry: e.target.value,
                              })
                            }
                          />
                        </div>
                        <div className="flex items-end">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={travelData.fastCardValid}
                              onChange={(e) => setTravelData({ ...travelData, fastCardValid: e.target.checked })}
                              className="w-4 h-4 text-[var(--accent-navyblue)] border-theme rounded focus:ring-[var(--accent-navyblue)]"
                            />
                            <span className="text-sm font-medium text-primary">Fast Card Valid</span>
                          </label>
                        </div>
                      </div>
                    </div>

                    {/* Canadian Worker Status Section */}
                    <div className="mt-6">
                      <h4 className="text-md font-bold text-primary mb-4">Canadian Worker Status</h4>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setTravelData({ ...travelData, canadianWorkerStatus: 'CANADIAN CITIZEN' })}
                          className={`px-6 py-2 rounded-sm font-medium transition-colors ${travelData.canadianWorkerStatus === 'CANADIAN CITIZEN'
                            ? 'bg-[var(--accent-navyblue)] !text-white'
                            : 'bg-[rgba(255,255,255,0.08)] text-secondary hover:bg-[rgba(255,255,255,0.12)]'
                            }`}
                        >
                          CANADIAN CITIZEN
                        </button>
                        <button
                          type="button"
                          onClick={() => setTravelData({ ...travelData, canadianWorkerStatus: 'PERMANENT RESIDENT' })}
                          className={`px-6 py-2 rounded-sm font-medium transition-colors ${travelData.canadianWorkerStatus === 'PERMANENT RESIDENT'
                            ? 'bg-[var(--accent-navyblue)] !text-white'
                            : 'bg-[rgba(255,255,255,0.08)] text-secondary hover:bg-[rgba(255,255,255,0.12)]'
                            }`}
                        >
                          PERMANENT RESIDENT
                        </button>
                        <button
                          type="button"
                          onClick={() => setTravelData({ ...travelData, canadianWorkerStatus: 'WORK PERMIT' })}
                          className={`px-6 py-2 rounded-sm font-medium transition-colors ${travelData.canadianWorkerStatus === 'WORK PERMIT'
                            ? 'bg-[var(--accent-navyblue)] !text-white'
                            : 'bg-[rgba(255,255,255,0.08)] text-secondary hover:bg-[rgba(255,255,255,0.12)]'
                            }`}
                        >
                          WORK PERMIT
                        </button>
                      </div>
                    </div>

                    {/* Permanent Residence Expiry */}
                    {travelData.canadianWorkerStatus === 'PERMANENT RESIDENT' && (
                      <div className="mt-6 max-w-md">
                        <DateField
                          label="Permanent Residence Expiry"
                          value={travelData.permanentResidenceExpiry}
                          onChange={(e) =>
                            setTravelData({
                              ...travelData,
                              permanentResidenceExpiry: e.target.value,
                            })
                          }
                        />
                      </div>
                    )}

                    {/* Work Permit Expiry */}
                    {travelData.canadianWorkerStatus === 'WORK PERMIT' && (
                      <div className="mt-6 max-w-md">
                        <DateField
                          label="Work Permit Expiry"
                          value={travelData.workPermitExpiry}
                          onChange={(e) =>
                            setTravelData({
                              ...travelData,
                              workPermitExpiry: e.target.value,
                            })
                          }
                        />
                      </div>
                    )}

                    {/* WCB Number */}
                    <div className="mt-6">
                      <label className="block text-sm font-medium text-primary mb-1">WCB (Workers' Compensation Board) Number</label>
                      <input
                        type="text"
                        placeholder="WCB (Workers' Compensation Board) Number"
                        value={travelData.wcbNumber}
                        onChange={(e) => setTravelData({ ...travelData, wcbNumber: e.target.value })}
                        className="w-full px-3 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-navyblue)] focus:border-transparent max-w-md"
                      />
                    </div>

                    {/* SIN Number - Mandatory */}
                    <div className="mt-6">
                      <label className="block text-sm font-medium text-primary mb-1">
                        SIN Number <span className="text-[var(--accent-red)]">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="SIN Number"
                        value={travelData.sinNumber}
                        onChange={(e) => {
                          setTravelData({ ...travelData, sinNumber: e.target.value });
                          if (validationErrors.sinNumber) {
                            setValidationErrors({ ...validationErrors, sinNumber: '' });
                          }
                        }}
                        className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-navyblue)] focus:border-transparent max-w-md ${validationErrors.sinNumber ? 'border-[var(--accent-red)]' : 'border-theme'
                          }`}
                        required
                      />
                      {validationErrors.sinNumber && (
                        <p className="text-xs text-[var(--accent-red)] mt-0.5">{validationErrors.sinNumber}</p>
                      )}
                    </div>

                    {/* Work Permit Document Upload */}
                    {travelData.canadianWorkerStatus === 'WORK PERMIT' && (
                      <div className="mt-6">
                        <label className="block text-sm font-medium text-primary mb-1">
                          Work Permit Document <span className="text-[var(--accent-red)]">*</span>
                        </label>
                        {travelData.existingWorkPermitUrl && !travelData.workPermitDocument && (
                          <div className="mb-2 p-2 bg-[var(--accent-green)]/10 border border-[var(--accent-green)]/30 rounded-lg">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <FileText size={16} className="text-[var(--accent-green)]" />
                                <span className="text-sm text-[var(--accent-green)]">Existing document uploaded</span>
                              </div>
                              <a
                                href={travelData.existingWorkPermitUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-[var(--accent-navyblue)] hover:text-[var(--accent-navyblue)]/70 underline"
                              >
                                View Document
                              </a>
                            </div>
                          </div>
                        )}
                        <input
                          type="file"
                          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                          onChange={(e) => setTravelData({ ...travelData, workPermitDocument: e.target.files?.[0] || null })}
                          className="w-full px-3 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-navyblue)] focus:border-transparent max-w-md"
                          required={!travelData.existingWorkPermitUrl}
                        />
                        {travelData.workPermitDocument && (
                          <p className="text-xs text-secondary mt-1">Selected: {travelData.workPermitDocument.name}</p>
                        )}
                        {travelData.existingWorkPermitUrl && travelData.workPermitDocument && (
                          <p className="text-xs text-[var(--accent-orange)] mt-1">⚠️ New file will replace existing document</p>
                        )}
                      </div>
                    )}

                    {/* PR Card Document Upload */}
                    {travelData.canadianWorkerStatus === 'PERMANENT RESIDENT' && (
                      <div className="mt-6">
                        <label className="block text-sm font-medium text-primary mb-1">
                          PR Card Document <span className="text-[var(--accent-red)]">*</span>
                        </label>
                        {travelData.existingPrCardUrl && !travelData.prCardDocument && (
                          <div className="mb-2 p-2 bg-[var(--accent-green)]/10 border border-[var(--accent-green)]/30 rounded-lg">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <FileText size={16} className="text-[var(--accent-green)]" />
                                <span className="text-sm text-[var(--accent-green)]">Existing document uploaded</span>
                              </div>
                              <a
                                href={travelData.existingPrCardUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-[var(--accent-navyblue)] hover:text-[var(--accent-navyblue)]/70 underline"
                              >
                                View Document
                              </a>
                            </div>
                          </div>
                        )}
                        <input
                          type="file"
                          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                          onChange={(e) => setTravelData({ ...travelData, prCardDocument: e.target.files?.[0] || null })}
                          className="w-full px-3 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-navyblue)] focus:border-transparent max-w-md"
                          required={!travelData.existingPrCardUrl}
                        />
                        {travelData.prCardDocument && (
                          <p className="text-xs text-secondary mt-1">Selected: {travelData.prCardDocument.name}</p>
                        )}
                        {travelData.existingPrCardUrl && travelData.prCardDocument && (
                          <p className="text-xs text-[var(--accent-orange)] mt-1">⚠️ New file will replace existing document</p>
                        )}
                      </div>
                    )}

                  </div>
                )}

                {activeFormTab === 'documents' && (
                  <div className="space-y-6">
                    <h3 className="text-lg font-bold text-primary mb-4">Documents</h3>

                    {/* Documents Table with Headers */}
                    <div className="border border-theme rounded-lg overflow-hidden">
                      <table className="w-full">
                        <thead className="bg-card">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-primary uppercase">EXPIRY DATE</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-primary uppercase">DESCRIPTION</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-primary uppercase">IGNORE EXPIRATION</th>
                          </tr>
                        </thead>
                        <tbody className="bg-card">
                          {/* Input Row */}
                          <tr className="bg-card">
                            <td className="px-4 py-3">
                              <input
                                type="date"
                                value={newDocument.expiryDate}
                                onChange={(e) => setNewDocument({ ...newDocument, expiryDate: e.target.value })}
                                className="w-full px-3 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-navyblue)] focus:border-transparent"
                              />
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <input
                                  type="text"
                                  placeholder="Description"
                                  value={newDocument.description}
                                  onChange={(e) => setNewDocument({ ...newDocument, description: e.target.value })}
                                  className="flex-1 px-3 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-navyblue)] focus:border-transparent"
                                />
                                {documentFile ? (
                                  <div className="flex items-center gap-2 px-3 py-2 border border-theme rounded-lg bg-card">
                                    <FileText className="w-4 h-4 text-secondary" />
                                    <span className="text-sm text-primary truncate max-w-[100px]">{documentFile.name}</span>
                                    <button
                                      onClick={() => {
                                        setDocumentFile(null);
                                        setNewDocument({ ...newDocument, file: null });
                                      }}
                                      className="text-secondary hover:text-secondary"
                                    >
                                      <X className="w-4 h-4" />
                                    </button>
                                  </div>
                                ) : (
                                  <label className="flex items-center gap-2 px-3 py-2 border border-theme rounded-lg bg-card hover:bg-[rgba(255,255,255,0.03)] cursor-pointer">
                                    <Upload className="w-4 h-4 text-secondary" />
                                    <span className="text-sm text-primary">Select File</span>
                                    <input
                                      type="file"
                                      className="hidden"
                                      onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                          setDocumentFile({ name: file.name, size: file.size });
                                          setNewDocument({ ...newDocument, file });
                                        }
                                      }}
                                    />
                                  </label>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-3">
                                <label className="flex items-center gap-2 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={newDocument.ignoreExpiration}
                                    onChange={(e) => setNewDocument({ ...newDocument, ignoreExpiration: e.target.checked })}
                                    className="w-4 h-4 text-[var(--accent-navyblue)] border-theme rounded focus:ring-[var(--accent-navyblue)]"
                                  />
                                  <span className="text-sm text-primary">Ignore Expiration</span>
                                </label>
                                <button
                                  onClick={() => {
                                    if (newDocument.expiryDate || newDocument.description) {
                                      if (editingDocumentId) {
                                        // Update existing document in the list - preserve all existing fields
                                        setDocuments(documents.map(d =>
                                          d.id === editingDocumentId
                                            ? {
                                              ...d,
                                              expiryDate: newDocument.expiryDate,
                                              description: newDocument.description,
                                              ignoreExpiration: newDocument.ignoreExpiration,
                                              documentType: newDocument.documentType || d.documentType || 'Other',
                                              file: newDocument.file || null, // Only set if new file is uploaded
                                              // Preserve existing file info if no new file
                                              fileUrl: newDocument.file ? undefined : (d.fileUrl || undefined),
                                              fileName: newDocument.file ? undefined : (d.fileName || undefined)
                                            }
                                            : d
                                        ));
                                        if (newDocument.file && documentFile) {
                                          setUploadedFiles({ ...uploadedFiles, [editingDocumentId]: documentFile });
                                        }
                                        setEditingDocumentId(null);
                                        console.log('✅ Document updated in list:', editingDocumentId);
                                      } else {
                                        // Add new document
                                        const docId = Date.now().toString();
                                        setDocuments([...documents, {
                                          id: docId,
                                          expiryDate: newDocument.expiryDate,
                                          description: newDocument.description,
                                          ignoreExpiration: newDocument.ignoreExpiration,
                                          documentType: newDocument.documentType || 'Other',
                                          file: newDocument.file || null,
                                          isExisting: false
                                        }]);
                                        if (newDocument.file && documentFile) {
                                          setUploadedFiles({ ...uploadedFiles, [docId]: documentFile });
                                        }
                                      }
                                      setNewDocument({
                                        expiryDate: '',
                                        description: '',
                                        ignoreExpiration: false,
                                        file: null,
                                        documentType: 'Other'
                                      });
                                      setDocumentFile(null);
                                    }
                                  }}
                                  className="w-10 h-10 bg-[rgba(255,255,255,0.08)] border border-theme !text-white rounded-lg flex items-center justify-center hover:bg-[rgba(255,255,255,0.12)] transition-colors"
                                >
                                  {editingDocumentId ? <Save className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                                </button>
                              </div>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    {/* Documents Data Table */}
                    <div className="border border-theme rounded-lg overflow-hidden mt-4">
                      <table className="w-full">
                        <thead className="bg-card">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-primary uppercase">EXPIRY DATE</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-primary uppercase">DESCRIPTION</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-primary uppercase">FILE</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-primary uppercase">IGNORE EXPIRATION</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-primary uppercase">ACTIONS</th>
                          </tr>
                        </thead>
                        <tbody className="bg-card divide-y divide-theme">
                          {documents.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="px-4 py-8 text-center text-secondary">
                                No Data
                              </td>
                            </tr>
                          ) : (
                            documents.map((doc) => (
                              <tr key={doc.id} className="hover:bg-[rgba(255,255,255,0.03)]">
                                <td className="px-4 py-3 text-sm text-primary">
                                  {doc.expiryDate ? (() => {
                                    try {
                                      // Format date for display (YYYY-MM-DD to readable format)
                                      const date = new Date(doc.expiryDate);
                                      if (!isNaN(date.getTime())) {
                                        return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
                                      }
                                      return doc.expiryDate;
                                    } catch (e) {
                                      return doc.expiryDate;
                                    }
                                  })() : '-'}
                                </td>
                                <td className="px-4 py-3 text-sm text-primary">
                                  {doc.description || '-'}
                                </td>
                                <td className="px-4 py-3 text-sm text-primary">
                                  <div className="flex items-center gap-2">
                                    {doc.isExisting && doc.documentId && (doc.fileUrl || doc.fileName) ? (
                                      <button
                                        onClick={async (e) => {
                                          e.stopPropagation();
                                          try {
                                            if (doc.documentId) {
                                              const signedUrlResponse = await getSignedEmployeeDocumentUrl(doc.documentId, 'inline');
                                              if (signedUrlResponse?.success && signedUrlResponse.url) {
                                                window.open(signedUrlResponse.url, '_blank');
                                              } else {
                                                // Fallback to direct fileUrl if signed URL fails
                                                if (doc.fileUrl) {
                                                  window.open(doc.fileUrl, '_blank');
                                                }
                                              }
                                            }
                                          } catch (error) {
                                            console.error('Error opening document:', error);
                                            // Fallback to direct fileUrl
                                            if (doc.fileUrl) {
                                              window.open(doc.fileUrl, '_blank');
                                            }
                                          }
                                        }}
                                        className="flex items-center gap-1 text-[var(--accent-navyblue)] hover:text-[var(--accent-navyblue)]/70 hover:underline"
                                        title={doc.fileName || 'View document'}
                                      >
                                        <FileText className="w-4 h-4" />
                                        <span className="text-xs">{doc.fileName || 'View'}</span>
                                      </button>
                                    ) : uploadedFiles[doc.id] ? (
                                      <span title={uploadedFiles[doc.id].name} className="flex items-center gap-1 text-secondary">
                                        <FileText className="w-4 h-4 text-[var(--accent-navyblue)]" />
                                        <span className="text-xs">{uploadedFiles[doc.id].name}</span>
                                      </span>
                                    ) : (
                                      <span className="text-secondary">-</span>
                                    )}
                                  </div>
                                </td>
                                <td className="px-4 py-3 text-sm text-primary">
                                  {doc.ignoreExpiration ? (
                                    <Check className="w-5 h-5 text-[var(--accent-green)]" />
                                  ) : (
                                    <span className="text-secondary">-</span>
                                  )}
                                </td>
                                <td className="px-4 py-3 text-sm text-primary">
                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        // Load document data into form for editing
                                        console.log('✏️ Editing document:', doc);
                                        setNewDocument({
                                          expiryDate: doc.expiryDate || '',
                                          description: doc.description || '',
                                          ignoreExpiration: doc.ignoreExpiration || false,
                                          file: null, // Don't set file for existing documents (it's a File object, not needed for display)
                                          documentType: doc.documentType || 'Other'
                                        });
                                        setEditingDocumentId(doc.id);
                                        // Show existing file info if available
                                        if (doc.fileName) {
                                          setDocumentFile({ name: doc.fileName, size: 0 });
                                        } else {
                                          setDocumentFile(null);
                                        }
                                      }}
                                      className="p-1.5 text-[var(--accent-navyblue)] hover:bg-[var(--accent-navyblue)]/15 rounded transition-colors"
                                      title="Edit document"
                                    >
                                      <Edit className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={async (e) => {
                                        e.stopPropagation();
                                        if (window.confirm('Are you sure you want to delete this document?')) {
                                          try {
                                            // If it's an existing document, delete it from backend
                                            if (doc.isExisting && doc.documentId) {
                                              const response = await deleteEmployeeDocument(doc.documentId);
                                              if (response?.success) {
                                                addNotification('success', 'Document deleted successfully!');
                                              } else {
                                                addNotification('error', response?.message || 'Failed to delete document');
                                              }
                                            }
                                            // Remove from local state
                                            setDocuments(documents.filter(d => d.id !== doc.id));
                                            // Clear editing state if this was the document being edited
                                            if (editingDocumentId === doc.id) {
                                              setEditingDocumentId(null);
                                              setNewDocument({
                                                expiryDate: '',
                                                description: '',
                                                ignoreExpiration: false,
                                                file: null,
                                                documentType: 'Other'
                                              });
                                              setDocumentFile(null);
                                            }
                                            // Remove from uploadedFiles if it exists
                                            if (uploadedFiles[doc.id]) {
                                              const newUploadedFiles = { ...uploadedFiles };
                                              delete newUploadedFiles[doc.id];
                                              setUploadedFiles(newUploadedFiles);
                                            }
                                          } catch (error: any) {
                                            console.error('Error deleting document:', error);
                                            addNotification('error', error.response?.data?.message || error.message || 'Failed to delete document');
                                          }
                                        }
                                      }}
                                      className="p-1.5 text-[#A855F7] hover:bg-[var(--accent-red)]/10 rounded transition-colors"
                                      title="Delete document"
                                    >
                                      <Trash2 className="w-4 h-4" />
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
                )}

                {activeFormTab === 'certifications' && (
                  <div className="space-y-6">
                    <h3 className="text-lg font-bold text-primary mb-4">Safety Certifications</h3>

                    {/* Certifications Table with Input Row */}
                    <div className="border border-theme rounded-lg overflow-hidden">
                      <table className="w-full">
                        <thead className="bg-card">
                          <tr>
                            <th className="px-3 py-2 text-left text-xs font-medium text-primary uppercase">EXPIRY DATE</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-primary uppercase">DESCRIPTION</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-primary uppercase">IGNORE EXPIRATION</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-primary uppercase">DOCUMENT</th>
                          </tr>
                        </thead>
                        <tbody className="bg-card">
                          {/* Input Row */}
                          <tr className="bg-card">
                            <td className="px-3 py-2">
                              <div className="relative">
                                <input
                                  type="date"
                                  value={newCertification.expiryDate}
                                  onChange={(e) => setNewCertification({ ...newCertification, expiryDate: e.target.value })}
                                  className="w-full px-3 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-navyblue)] focus:border-transparent"
                                  placeholder="mm/dd/yyyy"
                                />
                                <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-secondary pointer-events-none" />
                              </div>
                            </td>
                            <td className="px-3 py-2">
                              <input
                                type="text"
                                placeholder="Description"
                                value={newCertification.description}
                                onChange={(e) => setNewCertification({ ...newCertification, description: e.target.value })}
                                className="w-full px-3 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-navyblue)] focus:border-transparent"
                              />
                            </td>
                            <td className="px-3 py-2">
                              <div className="flex items-center gap-3">
                                <label className="flex items-center gap-2 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={newCertification.ignoreExpiration}
                                    onChange={(e) => setNewCertification({ ...newCertification, ignoreExpiration: e.target.checked })}
                                    className="w-4 h-4 text-[var(--accent-navyblue)] border-theme rounded focus:ring-[var(--accent-navyblue)]"
                                  />
                                  <span className="text-sm text-primary">Ignore Expiration</span>
                                </label>
                              </div>
                            </td>
                            <td className="px-3 py-2">
                              <div className="flex items-center gap-2">
                                {certificationFile ? (
                                  <div className="flex items-center gap-2 px-3 py-2 border border-theme rounded-lg bg-card">
                                    <FileText className="w-4 h-4 text-secondary" />
                                    <span className="text-sm text-primary truncate max-w-[120px]">{certificationFile.name}</span>
                                    <button
                                      onClick={() => {
                                        setCertificationFile(null);
                                        setNewCertification({ ...newCertification, file: null });
                                      }}
                                      className="text-secondary hover:text-[#A855F7] transition-colors"
                                      title="Remove file"
                                    >
                                      <X className="w-4 h-4" />
                                    </button>
                                  </div>
                                ) : (
                                  <label className="flex items-center gap-2 px-3 py-2 border border-theme rounded-lg bg-card hover:bg-[rgba(255,255,255,0.03)] cursor-pointer transition-colors">
                                    <Upload className="w-4 h-4 text-secondary" />
                                    <span className="text-sm text-primary">Select File</span>
                                    <input
                                      type="file"
                                      className="hidden"
                                      onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                          setCertificationFile(file);
                                          setNewCertification({ ...newCertification, file: file });
                                        }
                                      }}
                                    />
                                  </label>
                                )}
                                <button
                                  onClick={() => {
                                    if (newCertification.expiryDate || newCertification.description) {
                                      if (editingCertificationId) {
                                        // Update existing certification in the list
                                        setCertifications(certifications.map(c =>
                                          c.id === editingCertificationId
                                            ? {
                                              ...c,
                                              expiryDate: newCertification.expiryDate,
                                              description: newCertification.description,
                                              ignoreExpiration: newCertification.ignoreExpiration,
                                              file: newCertification.file
                                            }
                                            : c
                                        ));
                                        setEditingCertificationId(null);
                                      } else {
                                        // Add new certification
                                        setCertifications([...certifications, {
                                          id: Date.now().toString(),
                                          expiryDate: newCertification.expiryDate,
                                          description: newCertification.description,
                                          ignoreExpiration: newCertification.ignoreExpiration,
                                          file: newCertification.file
                                        }]);
                                      }
                                      setNewCertification({
                                        expiryDate: '',
                                        description: '',
                                        ignoreExpiration: false,
                                        file: null
                                      });
                                      setCertificationFile(null);
                                    }
                                  }}
                                  className="w-10 h-10 bg-[rgba(255,255,255,0.08)] border border-theme !text-white rounded-lg flex items-center justify-center hover:bg-[rgba(255,255,255,0.12)] transition-colors"
                                >
                                  {editingCertificationId ? <Save className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                                </button>
                              </div>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    {/* Certifications Data Table */}
                    <div className="border border-theme rounded-lg overflow-hidden mt-4">
                      <table className="w-full">
                        <thead className="bg-card">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-primary uppercase">EXPIRY DATE</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-primary uppercase">DESCRIPTION</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-primary uppercase">IGNORE EXPIRATION</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-primary uppercase">DOCUMENT</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-primary uppercase">ACTIONS</th>
                          </tr>
                        </thead>
                        <tbody className="bg-card divide-y divide-theme">
                          {certifications.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="px-4 py-8 text-center text-secondary">
                                No Data
                              </td>
                            </tr>
                          ) : (
                            certifications.map((cert) => (
                              <tr
                                key={cert.id}
                                className={`hover:bg-[rgba(255,255,255,0.03)] ${selectedCertificate?.id === cert.id ? 'bg-card' : ''}`}
                              >
                                <td className="px-4 py-3 text-sm text-primary">{cert.expiryDate || '-'}</td>
                                <td className="px-4 py-3 text-sm text-primary">{cert.description || '-'}</td>
                                <td className="px-4 py-3 text-sm text-primary">
                                  {cert.ignoreExpiration ? (
                                    <Check className="w-5 h-5 text-[var(--accent-green)]" />
                                  ) : (
                                    <span className="text-secondary">-</span>
                                  )}
                                </td>
                                <td className="px-4 py-3 text-sm text-primary">
                                  {(cert.file instanceof File || cert.fileUrl || cert.fileName) ? (
                                    <div className="flex items-center gap-2">
                                      <FileText className="w-4 h-4 text-[var(--accent-navyblue)]" />
                                      <span className="text-sm text-primary truncate max-w-[150px]" title={cert.file instanceof File ? cert.file.name : (cert.fileName || 'File attached')}>
                                        {cert.file instanceof File ? cert.file.name : (cert.fileName || 'File attached')}
                                      </span>
                                    </div>
                                  ) : (
                                    <span className="text-secondary">-</span>
                                  )}
                                </td>
                                <td className="px-4 py-3 text-sm text-primary">
                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        // Load certification data into form for editing
                                        setNewCertification({
                                          expiryDate: cert.expiryDate || '',
                                          description: cert.description || '',
                                          ignoreExpiration: cert.ignoreExpiration || false,
                                          file: cert.file || null
                                        });
                                        setEditingCertificationId(cert.id);
                                        setSelectedCertificate(null); // Close side panel if open
                                        if (cert.file instanceof File) {
                                          setCertificationFile(cert.file);
                                        } else {
                                          setCertificationFile(null);
                                        }
                                      }}
                                      className="p-1.5 text-[var(--accent-navyblue)] hover:bg-[var(--accent-navyblue)]/15 rounded transition-colors"
                                      title="Edit certification"
                                    >
                                      <Edit className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setConfirmDeleteCertification({ open: true, cert });
                                      }}
                                      className="p-1.5 text-[#A855F7] hover:bg-[var(--accent-red)]/10 rounded transition-colors"
                                      title="Delete certification"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* Safety Certificate Details Side Panel */}
                    {selectedCertificate && (
                      <div className="absolute right-0 top-0 h-full w-96 bg-card shadow-2xl z-50 border-l border-theme overflow-y-auto" style={{ top: 0, right: 0 }}>
                        <div className="p-6">
                          <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-bold text-primary">Safety Certificate Details</h3>
                            <button
                              onClick={() => setSelectedCertificate(null)}
                              className="text-secondary hover:text-secondary transition-colors"
                            >
                              <X className="w-6 h-6" />
                            </button>
                          </div>

                          <div className="space-y-4">
                            <div>
                              <label className="block text-sm font-medium text-primary mb-1">Title</label>
                              <div className="px-3 py-2 bg-card border border-theme rounded-lg text-primary">
                                {selectedCertificate.title || '-'}
                              </div>
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-primary mb-1">Expiry Date</label>
                              <div className="px-3 py-2 bg-card border border-theme rounded-lg text-primary">
                                {selectedCertificate.expiryDate || '-'}
                              </div>
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-primary mb-1">Description</label>
                              <div className="px-3 py-2 bg-card border border-theme rounded-lg text-primary">
                                {selectedCertificate.description || '-'}
                              </div>
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-primary mb-1">Result</label>
                              <div className="px-3 py-2 bg-card border border-theme rounded-lg text-primary">
                                {selectedCertificate.result || '-'}
                              </div>
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-primary mb-1">Ignore Expiration</label>
                              <div className="px-3 py-2 bg-card border border-theme rounded-lg">
                                {selectedCertificate.ignoreExpiration ? (
                                  <div className="flex items-center gap-2">
                                    <Check className="w-5 h-5 text-[var(--accent-green)]" />
                                    <span className="text-primary">Yes</span>
                                  </div>
                                ) : (
                                  <span className="text-secondary">No</span>
                                )}
                              </div>
                            </div>

                            <div className="pt-4 border-t border-theme">
                              <button
                                onClick={() => {
                                  setCertifications(certifications.filter(c => c.id !== selectedCertificate.id));
                                  setSelectedCertificate(null);
                                }}
                                className="w-full px-4 py-2 bg-[var(--accent-red)] !text-white rounded-lg hover:bg-[var(--accent-red)]/80 transition-colors font-medium"
                              >
                                Delete Certificate
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                  </div>
                )}

                {activeFormTab === 'tickets' && (
                  <div className="space-y-6 relative">
                    <h3 className="text-lg font-bold text-primary mb-4">Tickets & Fines</h3>
                    <p className="text-sm text-secondary mb-4">Record driver tickets, fines, and citations. Static only — not sent to backend.</p>

                    {/* Tickets Table with Input Row */}
                    <div className="border border-theme rounded-lg overflow-hidden overflow-x-auto">
                      <table className="w-full min-w-[800px]">
                        <thead className="bg-card">
                          <tr>
                            <th className="px-3 py-2 text-left text-xs font-medium text-primary uppercase">DATE</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-primary uppercase">TITLE</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-primary uppercase">DESCRIPTION</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-primary uppercase">AMOUNT</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-primary uppercase">STATUS</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-primary uppercase">DOCUMENT</th>
                          </tr>
                        </thead>
                        <tbody className="bg-card">
                          <tr className="bg-card hover:bg-[rgba(0,209,255,0.05)] transition-all">
                            <td colSpan={7} className="p-3">

                              {/* Row 1 */}
                              <div className="grid grid-cols-5 gap-3 mb-2">

                                {/* Date */}
                                <input
                                  type="date"
                                  value={newTicket.date}
                                  onChange={(e) => setNewTicket({ ...newTicket, date: e.target.value })}
                                  className="form-select text-sm"
                                />

                                {/* Title */}
                                <input
                                  type="text"
                                  placeholder="Title"
                                  value={newTicket.title}
                                  onChange={(e) => setNewTicket({ ...newTicket, title: e.target.value })}
                                  className="form-select text-sm"
                                />

                                {/* Amount + Currency */}
                                <div className="flex items-center gap-2 w-full">

                                  <input
                                    type="text"
                                    placeholder="Amount"
                                    value={newTicket.amount || ''}
                                    onChange={(e) =>
                                      setNewTicket((prev) => ({
                                        ...prev,
                                        amount: e.target.value,
                                      }))
                                    }
                                    className="flex-1 min-w-[60px] px-3 py-2 bg-[rgba(255,255,255,0.05)] text-primary border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)]"
                                  />

                                  <select
                                    value={newTicket.currency}
                                    onChange={(e) =>
                                      setNewTicket((prev) => ({
                                        ...prev,
                                        currency: e.target.value,
                                      }))
                                    }
                                    className="w-14 px-2 py-2 bg-[rgba(255,255,255,0.05)] text-primary border border-theme rounded-lg"
                                  >
                                    <option className="form-option">CAD</option>
                                    <option className="form-option">USD</option>
                                  </select>

                                </div>

                                {/* Status */}
                                <select
                                  value={newTicket.status}
                                  onChange={(e) => setNewTicket({ ...newTicket, status: e.target.value })}
                                  className="form-select text-sm"
                                >
                                  <option className="form-option">Unpaid</option>
                                  <option className="form-option">Paid</option>
                                  <option className="form-option">Contested</option>
                                  <option className="form-option">Waived</option>
                                </select>

                                {/* Action */}
                                <button className="bg-[var(--accent-navyblue)] text-white rounded-lg px-2 hover:opacity-90">
                                  {editingTicketId ? "Save" : "Add"}
                                </button>
                              </div>

                              {/* Row 2 */}
                              <div className="grid grid-cols-2 gap-3">

                                {/* Description */}
                                <input
                                  type="text"
                                  placeholder="Description"
                                  value={newTicket.description}
                                  onChange={(e) => setNewTicket({ ...newTicket, description: e.target.value })}
                                  className="form-select text-sm"
                                />

                                {/* File Upload */}
                                <label className="form-select flex items-center gap-2 cursor-pointer">
                                  <Upload className="w-4 h-4 text-secondary" />
                                  <span className="text-sm text-secondary truncate">
                                    {ticketFile ? ticketFile.name : "Upload File"}
                                  </span>
                                  <input
                                    type="file"
                                    className="hidden"
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (file) {
                                        setTicketFile(file);
                                        setNewTicket({ ...newTicket, file });
                                      }
                                    }}
                                  />
                                </label>
                              </div>

                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    {/* Tickets Data Table */}
                    <div className="border border-theme rounded-lg overflow-hidden overflow-x-auto mt-4">
                      <table className="w-full min-w-[800px]">
                        <thead className="bg-card">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-primary uppercase">DATE</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-primary uppercase">TITLE</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-primary uppercase">DESCRIPTION</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-primary uppercase">AMOUNT</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-primary uppercase">CURRENCY</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-primary uppercase">STATUS</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-primary uppercase">DOCUMENT</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-primary uppercase">ACTIONS</th>
                          </tr>
                        </thead>
                        <tbody className="bg-card divide-y divide-theme">
                          {tickets.length === 0 ? (
                            <tr>
                              <td colSpan={7} className="px-4 py-8 text-center text-secondary">
                                No Data
                              </td>
                            </tr>
                          ) : (
                            tickets.map((ticket) => (
                              <tr
                                key={ticket.id}
                                className={`hover:bg-[rgba(255,255,255,0.03)] cursor-pointer ${selectedTicket?.id === ticket.id ? 'bg-card' : ''}`}
                                onClick={() => setSelectedTicket(selectedTicket?.id === ticket.id ? null : {
                                  id: ticket.id,
                                  date: ticket.date,
                                  title: ticket.title,
                                  description: ticket.description,
                                  amount: ticket.amount,
                                  currency: ticket.currency,
                                  status: ticket.status
                                })}
                              >
                                <td className="px-4 py-3 text-sm text-primary">{ticket.date || '-'}</td>
                                <td className="px-4 py-3 text-sm text-primary">{ticket.title || '-'}</td>
                                <td className="px-4 py-3 text-sm text-primary">{ticket.description || '-'}</td>
                                <td className="px-4 py-3 text-sm text-primary">
                                  {ticket.amount ? (
                                    <div className="flex items-center gap-2">
                                      <span>{ticket.currency === 'USD' ? '$' : 'C$'}{ticket.amount}</span>
                                      <span className="text-xs text-secondary">({ticket.currency || 'CAD'})</span>
                                    </div>
                                  ) : '-'}
                                </td>
                                <td className="px-4 py-3 text-sm text-primary">
                                  <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${ticket.status === 'Paid' ? 'bg-[var(--accent-green)]/15 text-[var(--accent-green)]' :
                                    ticket.status === 'Unpaid' ? 'bg-[var(--accent-orange)]/15 text-[var(--accent-orange)]' :
                                      ticket.status === 'Contested' ? 'bg-[var(--accent-navyblue)]/15 text-[var(--accent-navyblue)]' :
                                        'bg-card text-primary'
                                    }`}>
                                    {ticket.status}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-sm text-primary">
                                  {(ticket.file instanceof File || ticket.fileUrl || ticket.fileName) ? (
                                    <div className="flex items-center gap-2">
                                      <FileText className="w-4 h-4 text-[var(--accent-navyblue)]" />
                                      {(ticket.fileUrl || ticket.file instanceof File) ? (
                                        <button
                                          onClick={async (e) => {
                                            e.stopPropagation();
                                            try {
                                              // For existing tickets saved to backend, use signed URL
                                              if (ticket.ticketId || (ticket.id && ticket.id.toString().startsWith('existing-'))) {
                                                const ticketId = ticket.ticketId || (ticket.id.toString().startsWith('existing-') ? ticket.id.toString().replace('existing-', '') : null);
                                                if (ticketId) {
                                                  const signedUrlResponse = await getDriverTicketSignedUrl(ticketId, 'inline');
                                                  if (signedUrlResponse?.success && signedUrlResponse.url) {
                                                    window.open(signedUrlResponse.url, '_blank');
                                                    return;
                                                  }
                                                }
                                              }

                                              // For newly uploaded files (not yet saved), create a local object URL
                                              if (ticket.file instanceof File) {
                                                const objectUrl = URL.createObjectURL(ticket.file);
                                                window.open(objectUrl, '_blank');
                                                // Clean up the object URL after a delay
                                                setTimeout(() => URL.revokeObjectURL(objectUrl), 100);
                                                return;
                                              }

                                              // Fallback to direct fileUrl
                                              if (ticket.fileUrl) {
                                                window.open(ticket.fileUrl, '_blank');
                                              } else {
                                                alert('Unable to open file');
                                              }
                                            } catch (error) {
                                              console.error('Error opening ticket file:', error);
                                              // Fallback to direct fileUrl
                                              if (ticket.fileUrl) {
                                                window.open(ticket.fileUrl, '_blank');
                                              } else if (ticket.file instanceof File) {
                                                const objectUrl = URL.createObjectURL(ticket.file);
                                                window.open(objectUrl, '_blank');
                                                setTimeout(() => URL.revokeObjectURL(objectUrl), 100);
                                              } else {
                                                alert('Unable to open file');
                                              }
                                            }
                                          }}
                                          className="text-sm text-[var(--accent-navyblue)] hover:underline truncate max-w-[150px] cursor-pointer"
                                          title={ticket.fileName || (ticket.file instanceof File ? ticket.file.name : 'View Document')}
                                        >
                                          {ticket.fileName || (ticket.file instanceof File ? ticket.file.name : 'View Document')}
                                        </button>
                                      ) : (
                                        <span className="text-sm text-primary truncate max-w-[150px]" title={ticket.fileName || 'File attached'}>
                                          {ticket.fileName || 'File attached'}
                                        </span>
                                      )}
                                    </div>
                                  ) : (
                                    <span className="text-secondary">-</span>
                                  )}
                                </td>
                                <td className="px-4 py-3 text-sm text-primary" onClick={(e) => e.stopPropagation()}>
                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setNewTicket({
                                          date: ticket.date || '',
                                          title: ticket.title || '',
                                          description: ticket.description || '',
                                          amount: ticket.amount || '',
                                          currency: ticket.currency || 'CAD',
                                          status: ticket.status || 'Unpaid',
                                          file: ticket.file || null
                                        });
                                        setEditingTicketId(ticket.id);
                                        setSelectedTicket(null);
                                        if (ticket.file instanceof File) {
                                          setTicketFile(ticket.file);
                                        } else {
                                          setTicketFile(null);
                                        }
                                      }}
                                      className="p-1.5 text-[var(--accent-navyblue)] hover:bg-[var(--accent-navyblue)]/15 rounded transition-colors"
                                      title="Edit ticket"
                                    >
                                      <Edit className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setConfirmDeleteTicket({ open: true, ticket });
                                      }}
                                      className="p-1.5 text-[#A855F7] hover:bg-[var(--accent-red)]/10 rounded transition-colors"
                                      title="Delete ticket"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* Ticket Details Side Panel */}
                    {selectedTicket && (
                      <div className="absolute right-0 top-0 h-full w-96 bg-card shadow-2xl z-50 border-l border-theme overflow-y-auto" style={{ top: 0, right: 0 }}>
                        <div className="p-6">
                          <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-bold text-primary">Ticket Details</h3>
                            <button
                              onClick={() => setSelectedTicket(null)}
                              className="text-secondary hover:text-secondary transition-colors"
                            >
                              <X className="w-6 h-6" />
                            </button>
                          </div>
                          <div className="space-y-4">
                            <div>
                              <label className="block text-sm font-medium text-primary mb-1">Date</label>
                              <div className="px-3 py-2 bg-card border border-theme rounded-lg text-primary">
                                {selectedTicket.date || '-'}
                              </div>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-primary mb-1">Title</label>
                              <div className="px-3 py-2 bg-card border border-theme rounded-lg text-primary">
                                {selectedTicket.title || '-'}
                              </div>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-primary mb-1">Description</label>
                              <div className="px-3 py-2 bg-card border border-theme rounded-lg text-primary">
                                {selectedTicket.description || '-'}
                              </div>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-primary mb-1">Amount</label>
                              <div className="px-3 py-2 bg-card border border-theme rounded-lg text-primary">
                                {selectedTicket.amount ? `$${selectedTicket.amount}` : '-'}
                              </div>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-primary mb-1">Status</label>
                              <div className="px-3 py-2 bg-card border border-theme rounded-lg text-primary">
                                {selectedTicket.status}
                              </div>
                            </div>
                            <div className="pt-4 border-t border-theme">
                              <button
                                onClick={() => {
                                  setTickets(tickets.filter(t => t.id !== selectedTicket.id));
                                  setSelectedTicket(null);
                                }}
                                className="w-full px-4 py-2 bg-[var(--accent-red)] !text-white rounded-lg hover:bg-[var(--accent-red)]/80 transition-colors font-medium"
                              >
                                Delete Ticket
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Delete Ticket Confirmation Modal */}
                    {confirmDeleteTicket.open && confirmDeleteTicket.ticket && (
                      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
                        <div className="bg-card rounded-xl shadow-2xl w-full max-w-md">
                          <div className="p-6">
                            <div className="flex items-center gap-4 mb-4">
                              <div className="flex-shrink-0 w-12 h-12 bg-[var(--accent-red)]/15 rounded-full flex items-center justify-center">
                                <Trash2 className="w-6 h-6 text-[#A855F7]" />
                              </div>
                              <div>
                                <h3 className="text-lg font-semibold text-primary">Delete Ticket</h3>
                                <p className="text-sm text-secondary">This action cannot be undone</p>
                              </div>
                            </div>
                            <p className="text-primary mb-6">
                              Are you sure you want to delete this ticket ({confirmDeleteTicket.ticket.title || 'Ticket'} — {confirmDeleteTicket.ticket.date || 'N/A'})?
                            </p>
                            <div className="flex items-center justify-end gap-3">
                              <button
                                onClick={() => setConfirmDeleteTicket({ open: false, ticket: null })}
                                className="px-4 py-2 border border-theme rounded-lg hover:bg-[rgba(255,255,255,0.03)] transition-colors font-medium"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={() => {
                                  setTickets(tickets.filter(t => t.id !== confirmDeleteTicket.ticket!.id));
                                  setConfirmDeleteTicket({ open: false, ticket: null });
                                  setSelectedTicket(null);
                                }}
                                className="px-4 py-2 bg-[var(--accent-red)] !text-white rounded-lg hover:bg-[var(--accent-red)]/80 transition-colors font-medium"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                  </div>
                )}

                {activeFormTab === 'violations' && (
                  <div className="space-y-6">
                    <h3 className="text-lg font-bold text-primary mb-4">Violations</h3>

                    {/* Violations Input Form */}
                    <div className="space-y-4 p-4 bg-card rounded-lg">
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-primary mb-1">Violation Type <span className="text-[var(--accent-red)]">*</span></label>
                          <select
                            value={newViolation.violationType}
                            onChange={(e) => {
                              setNewViolation({ ...newViolation, violationType: e.target.value });
                              if (validationErrors.violationType) {
                                setValidationErrors({ ...validationErrors, violationType: '' });
                              }
                            }}
                            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-navyblue)] focus:border-transparent ${validationErrors.violationType ? 'border-[var(--accent-red)]' : 'border-theme'
                              }`}
                          >
                            <option className="form-option" value="">Select Type</option>
                            <option className="form-option" value="HOS">HOS</option>
                            <option className="form-option" value="Behaviour Issue">Behaviour Issue</option>
                            <option className="form-option" value="Safety Violation">Safety Violation</option>
                            <option className="form-option" value="Warning Letter">Warning Letter</option>
                            <option className="form-option" value="General">General</option>
                            <option className="form-option" value="Other">Other</option>
                          </select>
                          {validationErrors.violationType && (
                            <p className="text-xs text-[var(--accent-red)] mt-0.5">{validationErrors.violationType}</p>
                          )}
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-primary mb-1">Title</label>
                          <input
                            type="text"
                            placeholder="Short one-line summary"
                            value={newViolation.title}
                            onChange={(e) => setNewViolation({ ...newViolation, title: e.target.value })}
                            className="w-full px-3 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-navyblue)] focus:border-transparent"
                          />
                        </div>
                        <div>
                          <DateField
                            label={
                              <>
                                Date of Incident{" "}
                                <span className="text-[var(--accent-red)]">*</span>
                              </>
                            }
                            value={newViolation.dateOfIncident}
                            onChange={(e) =>
                              setNewViolation((prev) => ({
                                ...prev,
                                dateOfIncident: e.target.value,
                              }))
                            }
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-primary mb-1">Reported By</label>
                          <input
                            type="text"
                            placeholder="Manager/Admin name"
                            value={newViolation.reportedBy}
                            onChange={(e) => setNewViolation({ ...newViolation, reportedBy: e.target.value })}
                            className="w-full px-3 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-navyblue)] focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-primary mb-1">Severity</label>
                          <select
                            value={newViolation.severity}
                            onChange={(e) => setNewViolation({ ...newViolation, severity: e.target.value })}
                            className="w-full px-3 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-navyblue)] focus:border-transparent"
                          >
                            <option className="form-option" value="">Select Severity</option>
                            <option className="form-option" value="Low">Low</option>
                            <option className="form-option" value="Medium">Medium</option>
                            <option className="form-option" value="High">High</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-primary mb-1">Action Taken</label>
                          <select
                            value={newViolation.actionTaken}
                            onChange={(e) => setNewViolation({ ...newViolation, actionTaken: e.target.value })}
                            className="w-full px-3 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-navyblue)] focus:border-transparent"
                          >
                            <option className="form-option" value="">Select Action</option>
                            <option className="form-option" value="None">None</option>
                            <option className="form-option" value="Warning">Warning</option>
                            <option className="form-option" value="Training">Training</option>
                            <option className="form-option" value="Suspension">Suspension</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-primary mb-1">Status</label>
                          <select
                            value={newViolation.status}
                            onChange={(e) => setNewViolation({ ...newViolation, status: e.target.value })}
                            className="w-full px-3 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-navyblue)] focus:border-transparent"
                          >
                            <option className="form-option" value="">Select Status</option>
                            <option className="form-option" value="Open">Open</option>
                            <option className="form-option" value="Under Review">Under Review</option>
                            <option className="form-option" value="Closed">Closed</option>
                          </select>
                        </div>
                        <div className="sm:col-span-2 lg:col-span-3">
                          <label className="block text-sm font-medium text-primary mb-1">Description</label>
                          <textarea
                            placeholder="Detailed explanation"
                            value={newViolation.description}
                            onChange={(e) => setNewViolation({ ...newViolation, description: e.target.value })}
                            rows={3}
                            className="w-full px-3 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-navyblue)] focus:border-transparent"
                          />
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex items-end">
                          {violationFile ? (
                            <div className="flex items-center gap-2 px-3 py-2 border border-theme rounded-lg bg-card">
                              <FileText className="w-4 h-4 text-secondary" />
                              <span className="text-sm text-primary truncate max-w-[100px]">{violationFile.name}</span>
                              <button
                                onClick={() => {
                                  setViolationFile(null);
                                  setNewViolation({ ...newViolation, file: null });
                                }}
                                className="text-secondary hover:text-secondary"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <label className="flex items-center gap-2 px-3 py-2 border border-theme rounded-lg bg-card hover:bg-[rgba(255,255,255,0.03)] cursor-pointer">
                              <Upload className="w-4 h-4 text-secondary" />
                              <span className="text-sm text-primary">Select File</span>
                              <input
                                type="file"
                                className="hidden"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    setViolationFile(file);
                                    setNewViolation({ ...newViolation, file: file });
                                  }
                                }}
                              />
                            </label>
                          )}
                        </div>
                        <div className="flex items-end">
                          <button
                            onClick={() => {
                              if (editingViolationId) {
                                // Update existing violation
                                if (!newViolation.violationType || !newViolation.violationType.trim()) {
                                  setValidationErrors({ ...validationErrors, violationType: 'Violation Type is required' });
                                  addNotification('error', 'Please select a Violation Type');
                                  return;
                                }
                                if (!newViolation.dateOfIncident || !newViolation.dateOfIncident.trim()) {
                                  addNotification('error', 'Date of Incident is required');
                                  return;
                                }
                                setViolations(violations.map(v =>
                                  v.id === editingViolationId
                                    ? {
                                      ...v,
                                      violationType: newViolation.violationType,
                                      title: newViolation.title,
                                      description: newViolation.description,
                                      dateOfIncident: newViolation.dateOfIncident,
                                      reportedBy: newViolation.reportedBy,
                                      severity: newViolation.severity,
                                      actionTaken: newViolation.actionTaken,
                                      status: newViolation.status,
                                      file: newViolation.file
                                    }
                                    : v
                                ));
                                setEditingViolationId(null);
                                if (validationErrors.violationType) {
                                  setValidationErrors({ ...validationErrors, violationType: '' });
                                }
                              } else {
                                // Add new violation - validate required fields
                                if (!newViolation.violationType || !newViolation.violationType.trim()) {
                                  setValidationErrors({ ...validationErrors, violationType: 'Violation Type is required' });
                                  addNotification('error', 'Please select a Violation Type');
                                  return;
                                }
                                if (!newViolation.dateOfIncident || !newViolation.dateOfIncident.trim()) {
                                  addNotification('error', 'Date of Incident is required');
                                  return;
                                }

                                // Add new violation
                                const violationId = Date.now().toString();
                                setViolations([...violations, {
                                  id: violationId,
                                  violationType: newViolation.violationType,
                                  title: newViolation.title,
                                  description: newViolation.description,
                                  dateOfIncident: newViolation.dateOfIncident,
                                  reportedBy: newViolation.reportedBy,
                                  severity: newViolation.severity,
                                  actionTaken: newViolation.actionTaken,
                                  status: newViolation.status,
                                  file: newViolation.file
                                }]);

                                // Clear validation error if it exists
                                if (validationErrors.violationType) {
                                  setValidationErrors({ ...validationErrors, violationType: '' });
                                }
                              }
                              setNewViolation({
                                violationType: '',
                                title: '',
                                description: '',
                                dateOfIncident: '',
                                reportedBy: '',
                                severity: '',
                                actionTaken: '',
                                status: '',
                                file: null
                              });
                              setViolationFile(null);
                            }}
                            className="px-4 py-2 bg-[rgba(255,255,255,0.08)] border border-theme !text-white rounded-lg flex items-center justify-center gap-2 hover:bg-[rgba(255,255,255,0.12)] transition-colors font-medium"
                          >
                            <Plus className="w-4 h-4" />
                            {editingViolationId ? 'Update' : 'Add'} Violation
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Violations Table */}
                    <div className="border border-theme rounded-lg overflow-hidden">
                      <table className="w-full">
                        <thead className="bg-card">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-primary uppercase">Date</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-primary uppercase">Type</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-primary uppercase">Title</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-primary uppercase">Severity</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-primary uppercase">Status</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-primary uppercase">File</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-primary uppercase">ACTIONS</th>
                          </tr>
                        </thead>
                        <tbody className="bg-card divide-y divide-theme">
                          {violations.length === 0 ? (
                            <tr>
                              <td colSpan={7} className="px-4 py-8 text-center text-secondary">
                                No Data
                              </td>
                            </tr>
                          ) : (
                            violations.map((violation) => (
                              <tr key={violation.id} className="hover:bg-[rgba(255,255,255,0.03)]">
                                <td className="px-4 py-3 text-sm text-primary">
                                  {violation.dateOfIncident ? new Date(violation.dateOfIncident).toLocaleDateString() : '-'}
                                </td>
                                <td className="px-4 py-3 text-sm text-primary">
                                  <span className="px-2 py-1 bg-card text-[var(--accent-navyblue)] rounded-md text-xs font-medium">
                                    {violation.violationType || '-'}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-sm text-primary">
                                  {violation.title || '-'}
                                </td>
                                <td className="px-4 py-3 text-sm text-primary">
                                  {violation.severity ? (
                                    <span className={`px-2 py-1 rounded-md text-xs font-medium ${violation.severity === 'High' ? 'bg-[var(--accent-red)]/15 text-[var(--accent-red)]' :
                                      violation.severity === 'Medium' ? 'bg-[var(--accent-orange)]/15 text-[var(--accent-orange)]' :
                                        'bg-[var(--accent-green)]/15 text-[var(--accent-green)]'
                                      }`}>
                                      {violation.severity}
                                    </span>
                                  ) : '-'}
                                </td>
                                <td className="px-4 py-3 text-sm text-primary">
                                  {violation.status ? (
                                    <span className={`px-2 py-1 rounded-md text-xs font-medium ${violation.status === 'Closed' ? 'bg-card text-primary' :
                                      violation.status === 'Under Review' ? 'bg-[var(--accent-navyblue)]/15 text-[var(--accent-navyblue)]' :
                                        'bg-[var(--accent-orange)]/15 text-[var(--accent-orange)]'
                                      }`}>
                                      {violation.status}
                                    </span>
                                  ) : '-'}
                                </td>
                                <td className="px-4 py-3 text-sm text-primary">
                                  {(violation.file instanceof File || violation.fileUrl || violation.fileName) ? (
                                    violation.fileUrl ? (
                                      <a
                                        href={violation.fileUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-1 text-[var(--accent-navyblue)] hover:text-[var(--accent-navyblue)]/70 hover:underline"
                                        title={violation.file instanceof File ? violation.file.name : (violation.fileName || 'View File')}
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        <FileText className="w-4 h-4" />
                                        <span className="text-xs">{violation.fileName || 'View File'}</span>
                                      </a>
                                    ) : (
                                      <span className="flex items-center gap-1 text-secondary" title={violation.file instanceof File ? violation.file.name : (violation.fileName || 'File attached')}>
                                        <FileText className="w-4 h-4 text-[var(--accent-navyblue)]" />
                                        <span className="text-xs">{violation.file instanceof File ? violation.file.name : (violation.fileName || 'File attached')}</span>
                                      </span>
                                    )
                                  ) : (
                                    <span className="text-secondary">-</span>
                                  )}
                                </td>
                                <td className="px-4 py-3 text-sm text-primary">
                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        // Load violation data into form for editing
                                        setNewViolation({
                                          violationType: violation.violationType || '',
                                          title: violation.title || '',
                                          description: violation.description || '',
                                          dateOfIncident: violation.dateOfIncident || '',
                                          reportedBy: violation.reportedBy || '',
                                          severity: violation.severity || '',
                                          actionTaken: violation.actionTaken || '',
                                          status: violation.status || '',
                                          file: violation.file || null
                                        });
                                        setEditingViolationId(violation.id);
                                        if (violation.file instanceof File) {
                                          setViolationFile(violation.file);
                                        } else {
                                          setViolationFile(null);
                                        }
                                      }}
                                      className="p-1.5 text-[var(--accent-navyblue)] hover:bg-[var(--accent-navyblue)]/15 rounded transition-colors"
                                      title="Edit violation"
                                    >
                                      <Edit className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={async (e) => {
                                        e.stopPropagation();
                                        if (window.confirm('Are you sure you want to delete this violation?')) {
                                          try {
                                            // Check if it's an existing violation (ID starts with "existing-")
                                            if (violation.id && violation.id.toString().startsWith('existing-')) {
                                              const actualId = violation.id.toString().replace('existing-', '');
                                              const response = await deleteViolation(actualId);
                                              if (response?.success) {
                                                addNotification('success', 'Violation deleted successfully!');
                                              } else {
                                                addNotification('error', response?.message || 'Failed to delete violation');
                                              }
                                            }
                                            // Remove from local state
                                            setViolations(violations.filter(v => v.id !== violation.id));
                                            // Clear editing state if this was the violation being edited
                                            if (editingViolationId === violation.id) {
                                              setEditingViolationId(null);
                                              setNewViolation({
                                                violationType: '',
                                                title: '',
                                                description: '',
                                                dateOfIncident: '',
                                                reportedBy: '',
                                                severity: '',
                                                actionTaken: '',
                                                status: '',
                                                file: null
                                              });
                                              setViolationFile(null);
                                            }
                                          } catch (error: any) {
                                            console.error('Error deleting violation:', error);
                                            addNotification('error', error.response?.data?.message || error.message || 'Failed to delete violation');
                                          }
                                        }
                                      }}
                                      className="p-1.5 text-[#A855F7] hover:bg-[var(--accent-red)]/10 rounded transition-colors"
                                      title="Delete violation"
                                    >
                                      <Trash2 className="w-4 h-4" />
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
                )}

                {activeFormTab === 'notes' && (
                  <div className="space-y-6">
                    <h3 className="text-lg font-bold text-primary mb-4">Notes</h3>

                    {/* Notes Input Row */}
                    <div className="flex items-center gap-3 p-4 bg-card rounded-lg">
                      <div className="flex-1">
                        <input
                          type="text"
                          placeholder="Note"
                          value={newNote.note}
                          onChange={(e) => setNewNote({ ...newNote, note: e.target.value })}
                          className="w-full px-3 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-navyblue)] focus:border-transparent"
                        />
                      </div>
                      <div className="flex-1">
                        <select
                          value={newNote.category}
                          onChange={(e) => setNewNote({ ...newNote, category: e.target.value })}
                          className="w-full px-3 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-navyblue)] focus:border-transparent"
                        >
                          <option className="form-option" value="">Category</option>
                          <option className="form-option" value="Safety">Safety</option>
                          <option className="form-option" value="Attitude">Attitude</option>
                          <option className="form-option" value="Ops">Ops</option>
                          <option className="form-option" value="General">General</option>
                          <option className="form-option" value="Maintenance">Maintenance</option>
                        </select>
                      </div>
                      <div>
                        <button
                          onClick={() => {
                            if (newNote.note) {
                              if (editingNoteId) {
                                // Update existing note in the list
                                setNotes(notes.map(n =>
                                  n.id === editingNoteId
                                    ? {
                                      ...n,
                                      note: newNote.note,
                                      category: newNote.category
                                    }
                                    : n
                                ));
                                setEditingNoteId(null);
                              } else {
                                // Add new note
                                setNotes([...notes, {
                                  id: Date.now().toString(),
                                  note: newNote.note,
                                  category: newNote.category
                                }]);
                              }
                              setNewNote({
                                note: '',
                                category: ''
                              });
                            }
                          }}
                          className="w-10 h-10 bg-[rgba(255,255,255,0.08)] border border-theme !text-white rounded-lg flex items-center justify-center hover:bg-[rgba(255,255,255,0.12)] transition-colors"
                        >
                          {editingNoteId ? <Save className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>

                    {/* Notes Display */}
                    <div className="border border-theme rounded-lg overflow-hidden">
                      {notes.length === 0 ? (
                        <div className="px-4 py-8 text-center text-secondary">
                          No Data
                        </div>
                      ) : (
                        <div className="divide-y divide-theme">
                          {notes.map((note) => (
                            <div key={note.id} className="px-4 py-3 hover:bg-[rgba(255,255,255,0.03)]">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-sm text-primary">{note.note}</p>
                                  {note.category && (
                                    <p className="text-xs text-secondary mt-1">Category: {note.category}</p>
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => {
                                      setNewNote({
                                        note: note.note,
                                        category: note.category
                                      });
                                      setEditingNoteId(note.id);
                                    }}
                                    className="p-1.5 text-[var(--accent-navyblue)] hover:bg-[var(--accent-navyblue)]/15 rounded transition-colors"
                                    title="Edit note"
                                  >
                                    <Edit className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => {
                                      if (window.confirm('Are you sure you want to delete this note?')) {
                                        setNotes(notes.filter(n => n.id !== note.id));
                                        if (editingNoteId === note.id) {
                                          setEditingNoteId(null);
                                          setNewNote({
                                            note: '',
                                            category: ''
                                          });
                                        }
                                      }
                                    }}
                                    className="p-1.5 text-[#A855F7] hover:bg-[var(--accent-red)]/10 rounded transition-colors"
                                    title="Delete note"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                  </div>
                )}

                {activeFormTab === 'deductions' && (
                  <div className="space-y-6">
                    <h3 className="text-lg font-bold text-primary mb-4">Payroll Deductions</h3>

                    {/* Deductions Input Row */}
                    <div className="flex items-center gap-3 p-4 bg-card rounded-lg">
                      <div className="flex-1">
                        <DateField
                          label="Start Date"
                          value={newDeduction.startDate}
                          onChange={(e) =>
                            setNewDeduction((prev) => ({
                              ...prev,
                              startDate: e.target.value,
                            }))
                          }
                        />
                      </div>
                      <div className="flex-1">
                        <label className="block text-sm font-medium text-primary mb-1">Description</label>
                        <input
                          type="text"
                          placeholder="Description"
                          value={newDeduction.description}
                          onChange={(e) => setNewDeduction({ ...newDeduction, description: e.target.value })}
                          className="w-full px-3 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-navyblue)] focus:border-transparent"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="block text-sm font-medium text-primary mb-1">Amount</label>
                        <input
                          type="text"
                          placeholder="0"
                          value={newDeduction.amount}
                          onChange={(e) => setNewDeduction({ ...newDeduction, amount: e.target.value })}
                          className="w-full px-3 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-navyblue)] focus:border-transparent"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="block text-sm font-medium text-primary mb-1">Interval</label>
                        <select
                          value={newDeduction.interval}
                          onChange={(e) => setNewDeduction({ ...newDeduction, interval: e.target.value })}
                          className="w-full px-3 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-navyblue)] focus:border-transparent"
                        >
                          <option className="form-option" value="">Interval</option>
                          <option className="form-option" value="Weekly">Weekly</option>
                          <option className="form-option" value="Bi-Weekly">Bi-Weekly</option>
                          <option className="form-option" value="Monthly">Monthly</option>
                          <option className="form-option" value="Yearly">Yearly</option>
                          <option className="form-option" value="One Time Payment">One Time Payment</option>
                        </select>
                      </div>
                      <div className="flex-1">
                        <label className="block text-sm font-medium text-primary mb-1">Currency</label>
                        <select
                          value={newDeduction.currency}
                          onChange={(e) => setNewDeduction({ ...newDeduction, currency: e.target.value })}
                          className="w-full px-3 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-navyblue)] focus:border-transparent"
                        >
                          <option className="form-option" value="CAD">CAD</option>
                          <option className="form-option" value="USD">USD</option>
                        </select>
                      </div>
                      <div className="flex items-end">
                        <button
                          onClick={() => {
                            if (newDeduction.startDate || newDeduction.description) {
                              if (editingDeductionId) {
                                // Update existing deduction in the list
                                setDeductions(deductions.map(d =>
                                  d.id === editingDeductionId
                                    ? {
                                      ...d,
                                      startDate: newDeduction.startDate,
                                      description: newDeduction.description,
                                      amount: newDeduction.amount,
                                      interval: newDeduction.interval,
                                      currency: newDeduction.currency
                                    }
                                    : d
                                ));
                                setEditingDeductionId(null);
                              } else {
                                // Add new deduction
                                setDeductions([...deductions, {
                                  id: Date.now().toString(),
                                  startDate: newDeduction.startDate,
                                  description: newDeduction.description,
                                  amount: newDeduction.amount,
                                  interval: newDeduction.interval,
                                  currency: newDeduction.currency
                                }]);
                              }
                              setNewDeduction({
                                startDate: '',
                                description: '',
                                amount: '0',
                                interval: '',
                                currency: 'CAD'
                              });
                            }
                          }}
                          className="w-10 h-10 bg-[rgba(255,255,255,0.08)] border border-theme !text-white rounded-lg flex items-center justify-center hover:bg-[rgba(255,255,255,0.12)] transition-colors"
                        >
                          {editingDeductionId ? <Save className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>

                    {/* Deductions Table */}
                    <div className="border border-theme rounded-lg overflow-hidden">
                      <table className="w-full">
                        <thead className="bg-card">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-primary uppercase">Start Date</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-primary uppercase">Description</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-primary uppercase">Amount</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-primary uppercase">Interval</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-primary uppercase">ACTIONS</th>
                          </tr>
                        </thead>
                        <tbody className="bg-card divide-y divide-theme">
                          {deductions.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="px-4 py-8 text-center text-secondary">
                                No Data
                              </td>
                            </tr>
                          ) : (
                            deductions.map((deduction) => (
                              <tr key={deduction.id} className="hover:bg-[rgba(255,255,255,0.03)]">
                                <td className="px-4 py-3 text-sm text-primary">{deduction.startDate || '-'}</td>
                                <td className="px-4 py-3 text-sm text-primary">{deduction.description || '-'}</td>
                                <td className="px-4 py-3 text-sm text-primary">{deduction.amount || '0'} {deduction.currency}</td>
                                <td className="px-4 py-3 text-sm text-primary">{deduction.interval || '-'}</td>
                                <td className="px-4 py-3 text-sm text-primary">
                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setNewDeduction({
                                          startDate: deduction.startDate || '',
                                          description: deduction.description || '',
                                          amount: deduction.amount || '0',
                                          interval: deduction.interval || '',
                                          currency: deduction.currency || 'CAD'
                                        });
                                        setEditingDeductionId(deduction.id);
                                      }}
                                      className="p-1.5 text-[var(--accent-navyblue)] hover:bg-[var(--accent-navyblue)]/15 rounded transition-colors"
                                      title="Edit deduction"
                                    >
                                      <Edit className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={async (e) => {
                                        e.stopPropagation();
                                        if (window.confirm('Are you sure you want to delete this deduction?')) {
                                          try {
                                            // Check if it's an existing deduction (ID starts with "existing-")
                                            if (deduction.id && deduction.id.toString().startsWith('existing-')) {
                                              const actualId = deduction.id.toString().replace('existing-', '');
                                              const response = await deleteDeductionAddition(actualId);
                                              if (response?.success) {
                                                addNotification('success', 'Deduction deleted successfully!');
                                              } else {
                                                addNotification('error', response?.message || 'Failed to delete deduction');
                                              }
                                            }
                                            // Remove from local state
                                            setDeductions(deductions.filter(d => d.id !== deduction.id));
                                            // Clear editing state if this was the deduction being edited
                                            if (editingDeductionId === deduction.id) {
                                              setEditingDeductionId(null);
                                              setNewDeduction({
                                                startDate: '',
                                                description: '',
                                                amount: '0',
                                                interval: '',
                                                currency: 'CAD'
                                              });
                                            }
                                          } catch (error: any) {
                                            console.error('Error deleting deduction:', error);
                                            addNotification('error', error.response?.data?.message || error.message || 'Failed to delete deduction');
                                          }
                                        }
                                      }}
                                      className="p-1.5 text-[#A855F7] hover:bg-[var(--accent-red)]/10 rounded transition-colors"
                                      title="Delete deduction"
                                    >
                                      <Trash2 className="w-4 h-4" />
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
                )}

                {activeFormTab === 'additions' && (
                  <div className="space-y-6">
                    <h3 className="text-lg font-bold text-primary mb-4">Payroll Additions</h3>

                    {/* Additions Input Row */}
                    <div className="flex items-center gap-3 p-4 bg-card rounded-lg">
                      <div className="flex-1">
                        <DateField
                          label="Start Date"
                          value={newAddition.startDate}
                          onChange={(e) =>
                            setNewAddition((prev) => ({
                              ...prev,
                              startDate: e.target.value,
                            }))
                          }
                        />
                      </div>
                      <div className="flex-1">
                        <label className="block text-sm font-medium text-primary mb-1">Description</label>
                        <input
                          type="text"
                          placeholder="Description"
                          value={newAddition.description}
                          onChange={(e) => setNewAddition({ ...newAddition, description: e.target.value })}
                          className="w-full px-3 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-navyblue)] focus:border-transparent"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="block text-sm font-medium text-primary mb-1">Amount</label>
                        <input
                          type="text"
                          placeholder="0"
                          value={newAddition.amount}
                          onChange={(e) => setNewAddition({ ...newAddition, amount: e.target.value })}
                          className="w-full px-3 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-navyblue)] focus:border-transparent"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="block text-sm font-medium text-primary mb-1">Interval</label>
                        <select
                          value={newAddition.interval}
                          onChange={(e) => setNewAddition({ ...newAddition, interval: e.target.value })}
                          className="w-full px-3 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-navyblue)] focus:border-transparent"
                        >
                          <option className="form-option" value="">Interval</option>
                          <option className="form-option" value="Weekly">Weekly</option>
                          <option className="form-option" value="Bi-Weekly">Bi-Weekly</option>
                          <option className="form-option" value="Monthly">Monthly</option>
                          <option className="form-option" value="Yearly">Yearly</option>
                          <option className="form-option" value="One Time Payment">One Time Payment</option>
                        </select>
                      </div>
                      <div className="flex-1">
                        <label className="block text-sm font-medium text-primary mb-1">Currency</label>
                        <select
                          value={newAddition.currency}
                          onChange={(e) => setNewAddition({ ...newAddition, currency: e.target.value })}
                          className="w-full px-3 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-navyblue)] focus:border-transparent"
                        >
                          <option className="form-option" value="CAD">CAD</option>
                          <option className="form-option" value="USD">USD</option>
                        </select>
                      </div>
                      <div className="flex items-end">
                        <button
                          onClick={() => {
                            if (newAddition.startDate || newAddition.description) {
                              if (editingAdditionId) {
                                // Update existing addition in the list
                                setAdditions(additions.map(a =>
                                  a.id === editingAdditionId
                                    ? {
                                      ...a,
                                      startDate: newAddition.startDate,
                                      description: newAddition.description,
                                      amount: newAddition.amount,
                                      interval: newAddition.interval,
                                      currency: newAddition.currency
                                    }
                                    : a
                                ));
                                setEditingAdditionId(null);
                              } else {
                                // Add new addition
                                setAdditions([...additions, {
                                  id: Date.now().toString(),
                                  startDate: newAddition.startDate,
                                  description: newAddition.description,
                                  amount: newAddition.amount,
                                  interval: newAddition.interval,
                                  currency: newAddition.currency
                                }]);
                              }
                              setNewAddition({
                                startDate: '',
                                description: '',
                                amount: '0',
                                interval: '',
                                currency: 'CAD'
                              });
                            }
                          }}
                          className="w-10 h-10 bg-[rgba(255,255,255,0.08)] border border-theme !text-white rounded-lg flex items-center justify-center hover:bg-[rgba(255,255,255,0.12)] transition-colors"
                        >
                          {editingAdditionId ? <Save className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>

                    {/* Additions Table */}
                    <div className="border border-theme rounded-lg overflow-hidden">
                      <table className="w-full">
                        <thead className="bg-card">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-primary uppercase">Start Date</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-primary uppercase">Description</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-primary uppercase">Amount</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-primary uppercase">Interval</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-primary uppercase">ACTIONS</th>
                          </tr>
                        </thead>
                        <tbody className="bg-card divide-y divide-theme">
                          {additions.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="px-4 py-8 text-center text-secondary">
                                No Data
                              </td>
                            </tr>
                          ) : (
                            additions.map((addition) => (
                              <tr key={addition.id} className="hover:bg-[rgba(255,255,255,0.03)]">
                                <td className="px-4 py-3 text-sm text-primary">{addition.startDate || '-'}</td>
                                <td className="px-4 py-3 text-sm text-primary">{addition.description || '-'}</td>
                                <td className="px-4 py-3 text-sm text-primary">{addition.amount || '0'} {addition.currency}</td>
                                <td className="px-4 py-3 text-sm text-primary">{addition.interval || '-'}</td>
                                <td className="px-4 py-3 text-sm text-primary">
                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setNewAddition({
                                          startDate: addition.startDate || '',
                                          description: addition.description || '',
                                          amount: addition.amount || '0',
                                          interval: addition.interval || '',
                                          currency: addition.currency || 'CAD'
                                        });
                                        setEditingAdditionId(addition.id);
                                      }}
                                      className="p-1.5 text-[var(--accent-navyblue)] hover:bg-[var(--accent-navyblue)]/15 rounded transition-colors"
                                      title="Edit addition"
                                    >
                                      <Edit className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={async (e) => {
                                        e.stopPropagation();
                                        if (window.confirm('Are you sure you want to delete this addition?')) {
                                          try {
                                            // Check if it's an existing addition (ID starts with "existing-")
                                            if (addition.id && addition.id.toString().startsWith('existing-')) {
                                              const actualId = addition.id.toString().replace('existing-', '');
                                              const response = await deleteDeductionAddition(actualId);
                                              if (response?.success) {
                                                addNotification('success', 'Addition deleted successfully!');
                                              } else {
                                                addNotification('error', response?.message || 'Failed to delete addition');
                                              }
                                            }
                                            // Remove from local state
                                            setAdditions(additions.filter(a => a.id !== addition.id));
                                            // Clear editing state if this was the addition being edited
                                            if (editingAdditionId === addition.id) {
                                              setEditingAdditionId(null);
                                              setNewAddition({
                                                startDate: '',
                                                description: '',
                                                amount: '0',
                                                interval: '',
                                                currency: 'CAD'
                                              });
                                            }
                                          } catch (error: any) {
                                            console.error('Error deleting addition:', error);
                                            addNotification('error', error.response?.data?.message || error.message || 'Failed to delete addition');
                                          }
                                        }
                                      }}
                                      className="p-1.5 text-[#A855F7] hover:bg-[var(--accent-red)]/10 rounded transition-colors"
                                      title="Delete addition"
                                    >
                                      <Trash2 className="w-4 h-4" />
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
                )}

                {activeFormTab === 'onboarding' && (
                  <div className="space-y-6">
                    <h3 className="text-lg font-bold text-primary mb-4">Onboarding & Tests</h3>

                    {/* Section 1: Onboarding Status */}
                    <div className="bg-card rounded-lg p-4 space-y-4">
                      <h4 className="text-sm font-bold text-primary mb-3">Onboarding Status</h4>

                      {/* Test Approval Summary - Show at top */}
                      {driverTests.length > 0 && (
                        <div className="bg-card rounded-lg p-3 border border-theme mb-4">
                          <label className="block text-xs font-medium text-primary mb-2">Test Approval Status</label>
                          <div className="space-y-2">
                            {driverTests.map((test) => (
                              <div key={test.id} className="flex items-center justify-between">
                                <span className="text-xs font-medium text-primary">{test.testType}</span>
                                {test.hrApproved ? (
                                  <div className="flex items-center gap-2">
                                    <span className="px-2 py-1 rounded bg-[var(--accent-green)]/15 text-[var(--accent-green)] text-xs font-medium flex items-center gap-1">
                                      <Check className="w-3 h-3" />
                                      Approved
                                    </span>
                                    {test.hrApprovedBy && (
                                      <span className="text-xs text-secondary">by {test.hrApprovedBy}</span>
                                    )}
                                    {test.hrApprovedAt && (
                                      <span className="text-xs text-secondary">
                                        {new Date(test.hrApprovedAt).toLocaleDateString()}
                                      </span>
                                    )}
                                  </div>
                                ) : test.hrRejected ? (
                                  <div className="flex items-center gap-2">
                                    <span className="px-2 py-1 rounded bg-[var(--accent-red)]/15 text-[var(--accent-red)] text-xs font-medium flex items-center gap-1">
                                      <X className="w-3 h-3" />
                                      Rejected
                                    </span>
                                    {test.hrRejectionReason && (
                                      <span className="text-xs text-[#A855F7]">({test.hrRejectionReason})</span>
                                    )}
                                  </div>
                                ) : (
                                  <span className="px-2 py-1 rounded bg-[var(--accent-orange)]/15 text-[var(--accent-orange)] text-xs font-medium">
                                    Pending Review
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {approvedByHR && approvedAt && (
                        <div className="mt-3 text-xs text-secondary">
                          <span className="font-medium">Approved by HR:</span> {new Date(approvedAt).toLocaleDateString()}
                        </div>
                      )}
                    </div>

                    {/* Section 2: Flags */}
                    <div className="bg-card rounded-lg p-4 space-y-3 border border-theme">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-bold text-primary">Driver Test Requirements (Flags)</h4>
                        <span className="text-xs text-secondary">Default: Disabled</span>
                      </div>

                      {/* Warning message if base tests not completed */}
                      {!areBaseTestsCompleted() && (
                        <div className="bg-card border border-[var(--accent-orange)]/30 rounded-lg p-3 mb-3">
                          <div className="flex items-start gap-2">
                            <AlertTriangle className="w-4 h-4 text-[#00FFA3] mt-0.5 flex-shrink-0" />
                            <div className="flex-1">
                              <p className="text-xs font-medium text-[var(--accent-orange)] mb-1">
                                Complete Required Tests First
                              </p>
                              <p className="text-xs text-[var(--accent-orange)]">
                                Driver must complete and have HR approval for VEHICLE and HOS tests before enabling driver flags.
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="space-y-3">
                        <div className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${!areBaseTestsCompleted() && !handlesHazardousLoads
                          ? 'bg-card border-theme opacity-60'
                          : 'bg-card border-theme hover:bg-[rgba(255,255,255,0.03)]'
                          }`}>
                          <input
                            type="checkbox"
                            id="handlesHazardousLoads"
                            checked={handlesHazardousLoads}
                            disabled={!areBaseTestsCompleted() && !handlesHazardousLoads}
                            onChange={(e) => {
                              e.preventDefault();
                              handleFlagChange('handlesHazardousLoads', !handlesHazardousLoads);
                            }}
                            className={`w-4 h-4 mt-0.5 text-[var(--accent-navyblue)]/15 border-theme rounded focus:ring-[var(--accent-navyblue)]/15 ${!areBaseTestsCompleted() && !handlesHazardousLoads
                              ? 'cursor-not-allowed opacity-50'
                              : 'cursor-pointer'
                              }`}
                          />
                          <div className="flex-1">
                            <label
                              htmlFor="handlesHazardousLoads"
                              className={`text-xs font-medium block ${!areBaseTestsCompleted() && !handlesHazardousLoads
                                ? 'text-secondary cursor-not-allowed'
                                : 'text-primary cursor-pointer'
                                }`}
                            >
                              Handles hazardous loads
                            </label>
                            <p className="text-xs text-secondary mt-0.5">
                              When enabled, driver must complete TDG (Transportation of Dangerous Goods) test
                            </p>
                            {handlesHazardousLoads && (
                              <span className="inline-block mt-1 px-2 py-0.5 bg-[var(--accent-orange)]/15 text-[var(--accent-orange)] text-xs rounded font-medium">
                                TDG Test Required
                              </span>
                            )}
                          </div>
                        </div>

                        <div className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${!areBaseTestsCompleted() && !winterTestRequired
                          ? 'bg-card border-theme opacity-60'
                          : 'bg-card border-theme hover:bg-[rgba(255,255,255,0.03)]'
                          }`}>
                          <input
                            type="checkbox"
                            id="winterTestRequired"
                            checked={winterTestRequired}
                            disabled={!areBaseTestsCompleted() && !winterTestRequired}
                            onChange={(e) => {
                              e.preventDefault();
                              handleFlagChange('winterTestRequired', !winterTestRequired);
                            }}
                            className={`w-4 h-4 mt-0.5 text-[var(--accent-navyblue)]/15 border-theme rounded focus:ring-[var(--accent-navyblue)]/15 ${!areBaseTestsCompleted() && !winterTestRequired
                              ? 'cursor-not-allowed opacity-50'
                              : 'cursor-pointer'
                              }`}
                          />
                          <div className="flex-1">
                            <label
                              htmlFor="winterTestRequired"
                              className={`text-xs font-medium block ${!areBaseTestsCompleted() && !winterTestRequired
                                ? 'text-secondary cursor-not-allowed'
                                : 'text-primary cursor-pointer'
                                }`}
                            >
                              Winter test required (optional override)
                            </label>
                            <p className="text-xs text-secondary mt-0.5">
                              When enabled, driver must complete Winter Driving test
                            </p>
                            {winterTestRequired && (
                              <span className="inline-block mt-1 px-2 py-0.5 bg-[var(--accent-navyblue)]/15 text-[var(--accent-navyblue)] text-xs rounded font-medium">
                                Winter Test Required
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Show update timestamp if flags were updated */}
                      {editingDriver && (editingDriver as any).flagsUpdatedAt && (
                        <div className="mt-3 pt-3 border-t border-theme">
                          <div className="flex items-center gap-2 text-xs text-secondary">
                            <span className="font-medium">Last updated:</span>
                            <span>{new Date((editingDriver as any).flagsUpdatedAt).toLocaleString()}</span>
                            {(editingDriver as any).flagsUpdatedBy && (
                              <>
                                <span className="text-secondary">•</span>
                                <span>by {(editingDriver as any).flagsUpdatedBy?.name || 'HR'}</span>
                                {(editingDriver as any).flagsUpdatedBy?.email && (
                                  <span className="text-secondary">({(editingDriver as any).flagsUpdatedBy.email})</span>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      )}

                      {(!editingDriver || !(editingDriver as any).flagsUpdatedAt) && (
                        <div className="mt-3 pt-3 border-t border-theme">
                          <div className="text-xs text-secondary italic">
                            Flags have not been updated yet. Default state: Both disabled.
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Section 4: Required Tests */}
                    <div className="bg-card rounded-lg p-4 space-y-3 border border-[var(--accent-navyblue)]/30">
                      <h4 className="text-sm font-bold text-primary mb-3">Required Tests</h4>
                      <p className="text-xs text-secondary mb-3">Based on the flags above, the following tests are required for this driver:</p>

                      {(() => {
                        console.log('🎯 Required Tests Section - Current flag states:', {
                          handlesHazardousLoads,
                          winterTestRequired,
                          handlesHazardousLoadsType: typeof handlesHazardousLoads,
                          winterTestRequiredType: typeof winterTestRequired,
                          handlesHazardousLoadsStrict: handlesHazardousLoads === true,
                          winterTestRequiredStrict: winterTestRequired === true
                        });
                        return null;
                      })()}

                      <div className="space-y-2">
                        {/* Base tests - always required */}
                        <div className="flex items-center gap-2 bg-card rounded-lg p-2 border border-[var(--accent-navyblue)]/20">
                          <div className="w-2 h-2 rounded-full bg-[var(--accent-navyblue)]"></div>
                          <span className="text-xs font-medium text-primary">VEHICLE</span>
                          <span className="text-xs text-secondary">- Vehicle Inspection</span>
                        </div>

                        <div className="flex items-center gap-2 bg-card rounded-lg p-2 border border-[var(--accent-navyblue)]/20">
                          <div className="w-2 h-2 rounded-full bg-[var(--accent-navyblue)]"></div>
                          <span className="text-xs font-medium text-primary">HOS</span>
                          <span className="text-xs text-secondary">- Hours of Service</span>
                        </div>

                        {/* TDG test - only if handles hazardous loads */}
                        {(() => {
                          console.log('🔍 Rendering Required Tests - handlesHazardousLoads:', handlesHazardousLoads, 'type:', typeof handlesHazardousLoads);
                          return handlesHazardousLoads === true ? (
                            <div className="flex items-center gap-2 bg-card rounded-lg p-2 border border-[var(--accent-orange)]/30">
                              <div className="w-2 h-2 rounded-full bg-[var(--accent-orange)]"></div>
                              <span className="text-xs font-medium text-primary">TDG</span>
                              <span className="text-xs text-secondary">- Transportation of Dangerous Goods</span>
                              <span className="ml-auto px-2 py-0.5 bg-[var(--accent-orange)]/15 text-[var(--accent-orange)] text-xs rounded">Hazardous Loads</span>
                            </div>
                          ) : null;
                        })()}

                        {/* Winter test - only if winter test required */}
                        {(() => {
                          console.log('🔍 Rendering Required Tests - winterTestRequired:', winterTestRequired, 'type:', typeof winterTestRequired);
                          return winterTestRequired === true ? (
                            <div className="flex items-center gap-2 bg-[var(--accent-navyblue)]/10 rounded-lg p-2 border border-[var(--accent-navyblue)]/20">
                              <div className="w-2 h-2 rounded-full bg-[var(--accent-navyblue)]"></div>
                              <span className="text-xs font-medium text-primary">WINTER</span>
                              <span className="text-xs text-secondary">- Winter Driving</span>
                              <span className="ml-auto px-2 py-0.5 bg-[var(--accent-navyblue)]/15 text-[var(--accent-navyblue)] text-xs rounded">Winter Season</span>
                            </div>
                          ) : null;
                        })()}
                      </div>

                      <div className="mt-3 pt-3 border-t border-[var(--accent-navyblue)]/30">
                        <p className="text-xs text-secondary">
                          <span className="font-medium">Total Required Tests:</span> {2 + (handlesHazardousLoads ? 1 : 0) + (winterTestRequired ? 1 : 0)}
                        </p>
                      </div>
                    </div>

                    {/* Section 4: Test Results Table */}
                    <div className="bg-card rounded-lg border border-theme">
                      <div className="p-4 border-b border-theme flex items-center justify-between">
                        <h4 className="text-sm font-bold text-primary">Test Results</h4>
                        {loadingTests && (
                          <div className="flex items-center gap-2 text-xs text-secondary">
                            <RefreshCw className="w-3 h-3 animate-spin" />
                            Loading...
                          </div>
                        )}
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-card">
                            <tr>
                              <th className="px-4 py-2 text-left text-xs font-medium text-primary">Test Type</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-primary">Score</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-primary">Status</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-primary">HR Approval</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-primary">Attempts</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-primary">Date</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-primary">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-theme">
                            {driverTests.length > 0 ? (
                              driverTests.map((test) => (
                                <tr key={test.id} className="hover:bg-[rgba(255,255,255,0.03)]">
                                  <td className="px-4 py-2 text-xs text-primary font-medium">{test.testType}</td>
                                  <td className="px-4 py-2 text-xs text-primary">{test.score}%</td>
                                  <td className="px-4 py-2">
                                    <span className={`px-2 py-1 rounded text-xs font-medium ${test.passed ? 'bg-[var(--accent-green)]/15 text-[var(--accent-green)]' : 'bg-[var(--accent-red)]/15 text-[var(--accent-red)]'
                                      }`}>
                                      {test.passed ? 'Passed' : 'Failed'}
                                    </span>
                                  </td>
                                  <td className="px-4 py-2">
                                    {test.hrApproved ? (
                                      <span className="px-2 py-1 rounded text-xs font-medium bg-[var(--accent-green)]/15 !text-[var(--accent-green)] flex items-center gap-1">
                                        <Check className="w-3 h-3" />
                                        Approved
                                      </span>
                                    ) : test.hrRejected ? (
                                      <span className="px-2 py-1 rounded text-xs font-medium bg-[var(--accent-red)]/15 !text-[var(--accent-red)] flex items-center gap-1">
                                        <X className="w-3 h-3" />
                                        Rejected
                                      </span>
                                    ) : (
                                      <span className="px-2 py-1 rounded text-xs font-medium bg-[var(--accent-orange)]/15 text-[var(--accent-orange)]">
                                        Pending
                                      </span>
                                    )}
                                  </td>
                                  <td className="px-4 py-2 text-xs text-primary">{test.attempts}</td>
                                  <td className="px-4 py-2 text-xs text-primary">
                                    {test.completedAt ? new Date(test.completedAt).toLocaleDateString() : '-'}
                                  </td>
                                  <td className="px-4 py-2">
                                    {!test.hrApproved && !test.hrRejected && (
                                      <div className="flex items-center gap-1">
                                        <button
                                          onClick={() => openApprovalModal(test, 'approve')}
                                          className="px-2 py-1 bg-[var(--accent-green)] !text-white text-xs rounded hover:bg-[var(--accent-green)]/80 transition-colors flex items-center gap-1"
                                          title="Approve Test"
                                        >
                                          <Check className="w-3 h-3" />
                                          Approve
                                        </button>
                                        <button
                                          onClick={() => openApprovalModal(test, 'reject')}
                                          className="px-2 py-1 bg-[var(--accent-red)] !text-white text-xs rounded hover:bg-[var(--accent-red)]/80 transition-colors flex items-center gap-1"
                                          title="Reject Test"
                                        >
                                          <X className="w-3 h-3" />
                                          Reject
                                        </button>
                                      </div>
                                    )}
                                    {test.hrApproved && (
                                      <div className="text-xs">
                                        <div className="text-[var(--accent-green)] font-medium">Approved</div>
                                        {test.hrApprovedBy && (
                                          <div className="text-secondary">By: {test.hrApprovedBy}</div>
                                        )}
                                        {test.hrApprovedAt && (
                                          <div className="text-secondary">{new Date(test.hrApprovedAt).toLocaleDateString()}</div>
                                        )}
                                      </div>
                                    )}
                                    {test.hrRejected && (
                                      <div className="text-xs">
                                        <div className="text-[var(--accent-red)] font-medium">Rejected</div>
                                        {test.hrRejectionReason && (
                                          <div className="text-[#A855F7] mt-1">Reason: {test.hrRejectionReason}</div>
                                        )}
                                        {test.hrApprovedBy && (
                                          <div className="text-secondary mt-1">By: {test.hrApprovedBy}</div>
                                        )}
                                        {test.hrApprovedAt && (
                                          <div className="text-secondary">{new Date(test.hrApprovedAt).toLocaleDateString()}</div>
                                        )}
                                      </div>
                                    )}
                                  </td>
                                </tr>
                              ))
                            ) : (
                              <tr>
                                <td colSpan={7} className="px-4 py-8 text-center text-xs text-secondary">
                                  {loadingTests ? 'Loading test results...' : 'No test results available'}
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                  </div>
                )}

                {activeFormTab === 'drugtest' && drugTestPasswordVerified && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-bold text-primary">Drug Test</h3>
                      <div className="flex items-center gap-2 text-sm text-secondary">
                        <Lock className="w-4 h-4 text-[var(--accent-green)]" />
                        <span>Protected Section</span>
                      </div>
                    </div>

                    {/* Drug Test Table with Headers */}
                    <div className="border border-theme rounded-lg overflow-hidden">
                      <table className="w-full">
                        <thead className="bg-card">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-primary uppercase">DATE</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-primary uppercase">RESULT</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-primary uppercase">DOCUMENT NAME</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-primary uppercase">FILE</th>
                          </tr>
                        </thead>
                        <tbody className="bg-card">
                          {/* Input Row */}
                          <tr className="bg-card">
                            <td className="px-4 py-3">
                              <DateField
                                label="Date"
                                value={newDrugTest.date}
                                onChange={(e) =>
                                  setNewDrugTest((prev) => ({
                                    ...prev,
                                    date: e.target.value,
                                  }))
                                }
                              />
                            </td>
                            <td className="px-4 py-3">
                              <select
                                value={newDrugTest.result}
                                onChange={(e) => setNewDrugTest({ ...newDrugTest, result: e.target.value })}
                                className="w-full px-3 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-navyblue)] focus:border-transparent"
                              >
                                <option className="form-option" value="">Select Result</option>
                                <option className="form-option" value="Negative">Negative</option>
                                <option className="form-option" value="Positive">Positive</option>
                                <option className="form-option" value="Pending">Pending</option>
                              </select>
                            </td>
                            <td className="px-4 py-3">
                              <input
                                type="text"
                                placeholder="Document Name"
                                value={newDrugTest.labName}
                                onChange={(e) => setNewDrugTest({ ...newDrugTest, labName: e.target.value })}
                                className="w-full px-3 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-navyblue)] focus:border-transparent"
                              />
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                {drugTestFile ? (
                                  <div className="flex items-center gap-2 px-3 py-2 border border-theme rounded-lg bg-card">
                                    <FileText className="w-4 h-4 text-secondary" />
                                    <span className="text-sm text-primary truncate max-w-[100px]">{drugTestFile.name}</span>
                                    <button
                                      onClick={() => {
                                        setDrugTestFile(null);
                                        setNewDrugTest({ ...newDrugTest, file: null });
                                      }}
                                      className="text-secondary hover:text-secondary"
                                    >
                                      <X className="w-4 h-4" />
                                    </button>
                                  </div>
                                ) : (
                                  <label className="flex items-center gap-2 px-3 py-2 border border-theme rounded-lg bg-card hover:bg-[rgba(255,255,255,0.03)] cursor-pointer">
                                    <Upload className="w-4 h-4 text-secondary" />
                                    <span className="text-sm text-primary">Select File</span>
                                    <input
                                      type="file"
                                      className="hidden"
                                      onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                          setDrugTestFile({ name: file.name, size: file.size });
                                          setNewDrugTest({ ...newDrugTest, file });
                                        }
                                      }}
                                    />
                                  </label>
                                )}
                                <button
                                  onClick={() => {
                                    if (newDrugTest.date || newDrugTest.result || newDrugTest.labName) {
                                      if (editingDrugTestId) {
                                        // Update existing drug test
                                        setDrugTests(drugTests.map(dt =>
                                          dt.id === editingDrugTestId
                                            ? {
                                              ...dt,
                                              date: newDrugTest.date,
                                              result: newDrugTest.result,
                                              labName: newDrugTest.labName,
                                              file: newDrugTest.file || null,
                                              fileUrl: newDrugTest.file ? undefined : (dt.fileUrl || undefined),
                                              fileName: newDrugTest.file ? undefined : (dt.fileName || undefined)
                                            }
                                            : dt
                                        ));
                                        if (newDrugTest.file && drugTestFile) {
                                          setUploadedFiles({ ...uploadedFiles, [editingDrugTestId]: drugTestFile });
                                        }
                                        setEditingDrugTestId(null);
                                      } else {
                                        // Add new drug test
                                        const drugTestId = Date.now().toString();
                                        setDrugTests([...drugTests, {
                                          id: drugTestId,
                                          date: newDrugTest.date,
                                          result: newDrugTest.result,
                                          labName: newDrugTest.labName,
                                          file: newDrugTest.file || null,
                                          isExisting: false
                                        }]);
                                        if (newDrugTest.file && drugTestFile) {
                                          setUploadedFiles({ ...uploadedFiles, [drugTestId]: drugTestFile });
                                        }
                                      }
                                      setNewDrugTest({
                                        date: '',
                                        result: '',
                                        labName: '',
                                        file: null
                                      });
                                      setDrugTestFile(null);
                                    }
                                  }}
                                  className="w-10 h-10 bg-[rgba(255,255,255,0.08)] border border-theme !text-white rounded-lg flex items-center justify-center hover:bg-[rgba(255,255,255,0.12)] transition-colors"
                                >
                                  {editingDrugTestId ? <Save className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                                </button>
                              </div>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    {/* Drug Test Data Table */}
                    <div className="border border-theme rounded-lg overflow-hidden mt-4">
                      <table className="w-full">
                        <thead className="bg-card">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-primary uppercase">DATE</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-primary uppercase">RESULT</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-primary uppercase">DOCUMENT NAME</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-primary uppercase">FILE</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-primary uppercase">ACTIONS</th>
                          </tr>
                        </thead>
                        <tbody className="bg-card divide-y divide-theme">
                          {drugTests.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="px-4 py-8 text-center text-secondary">
                                No Data
                              </td>
                            </tr>
                          ) : (
                            drugTests.map((dt) => (
                              <tr key={dt.id} className="hover:bg-[rgba(255,255,255,0.03)]">
                                <td className="px-4 py-3 text-sm text-primary">
                                  {dt.date ? (() => {
                                    try {
                                      const date = new Date(dt.date);
                                      if (!isNaN(date.getTime())) {
                                        return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
                                      }
                                      return dt.date;
                                    } catch (e) {
                                      return dt.date;
                                    }
                                  })() : '-'}
                                </td>
                                <td className="px-4 py-3 text-sm text-primary">
                                  <span className={`px-2 py-1 rounded text-xs font-medium ${dt.result === 'Negative' ? 'bg-[var(--accent-green)]/15 text-[var(--accent-green)]' :
                                    dt.result === 'Positive' ? 'bg-[var(--accent-red)]/15 text-[var(--accent-red)]' :
                                      'bg-[var(--accent-orange)]/15 text-[var(--accent-orange)]'
                                    }`}>
                                    {dt.result || '-'}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-sm text-primary">
                                  {dt.labName || '-'}
                                </td>
                                <td className="px-4 py-3 text-sm text-primary">
                                  <div className="flex items-center gap-2">
                                    {dt.isExisting && (dt.fileUrl || dt.fileName) ? (
                                      <button
                                        onClick={async (e) => {
                                          e.stopPropagation();
                                          if (!drugTestPasswordVerified) {
                                            setShowDrugTestPasswordModal(true);
                                            return;
                                          }
                                          try {
                                            // Use signed URL from API response (already signed)
                                            if (dt.fileUrl) {
                                              window.open(dt.fileUrl, '_blank');
                                            } else {
                                              addNotification('error', 'File URL not available');
                                            }
                                          } catch (error) {
                                            console.error('Error opening file:', error);
                                            addNotification('error', 'Failed to open file');
                                          }
                                        }}
                                        className="flex items-center gap-1 text-[var(--accent-navyblue)] hover:text-[var(--accent-navyblue)]/70 hover:underline"
                                        title={dt.fileName || 'View file'}
                                      >
                                        <FileText className="w-4 h-4" />
                                        <span className="text-xs">{dt.fileName || 'View'}</span>
                                      </button>
                                    ) : uploadedFiles[dt.id] ? (
                                      <button
                                        onClick={() => {
                                          if (!drugTestPasswordVerified) {
                                            setShowDrugTestPasswordModal(true);
                                            return;
                                          }
                                          // For new uploads, create object URL
                                          if (dt.file) {
                                            const url = URL.createObjectURL(dt.file);
                                            window.open(url, '_blank');
                                          }
                                        }}
                                        className="flex items-center gap-1 text-[var(--accent-navyblue)] hover:text-[var(--accent-navyblue)]/70 hover:underline"
                                        title={uploadedFiles[dt.id].name}
                                      >
                                        <FileText className="w-4 h-4" />
                                        <span className="text-xs">{uploadedFiles[dt.id].name}</span>
                                      </button>
                                    ) : (
                                      <span className="text-secondary">-</span>
                                    )}
                                  </div>
                                </td>
                                <td className="px-4 py-3 text-sm text-primary">
                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setNewDrugTest({
                                          date: dt.date || '',
                                          result: dt.result || '',
                                          labName: dt.labName || '',
                                          file: null
                                        });
                                        if (dt.fileName) {
                                          setDrugTestFile({ name: dt.fileName, size: 0 });
                                        } else {
                                          setDrugTestFile(null);
                                        }
                                        setEditingDrugTestId(dt.id);
                                      }}
                                      className="p-1.5 text-[var(--accent-navyblue)] hover:bg-[var(--accent-navyblue)]/15 rounded transition-colors"
                                      title="Edit drug test"
                                    >
                                      <Edit className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={async (e) => {
                                        e.stopPropagation();
                                        if (window.confirm('Are you sure you want to delete this drug test record?')) {
                                          try {
                                            // Remove from local state immediately
                                            const updatedDrugTests = drugTests.filter(d => d.id !== dt.id);
                                            setDrugTests(updatedDrugTests);
                                            console.log(`🗑️ Deleted drug test ${dt.id}. Remaining: ${updatedDrugTests.length}`);

                                            // Clear editing state if this was the record being edited
                                            if (editingDrugTestId === dt.id) {
                                              setEditingDrugTestId(null);
                                              setNewDrugTest({
                                                date: '',
                                                result: '',
                                                labName: '',
                                                file: null
                                              });
                                              setDrugTestFile(null);
                                            }

                                            // Remove from uploadedFiles if it exists
                                            if (uploadedFiles[dt.id]) {
                                              const newUploadedFiles = { ...uploadedFiles };
                                              delete newUploadedFiles[dt.id];
                                              setUploadedFiles(newUploadedFiles);
                                            }

                                            addNotification('success', 'Drug test record deleted successfully!');
                                          } catch (error: any) {
                                            console.error('Error deleting drug test:', error);
                                            addNotification('error', error.response?.data?.message || error.message || 'Failed to delete drug test record');
                                          }
                                        }
                                      }}
                                      className="p-1.5 text-[#A855F7] hover:bg-[var(--accent-red)]/10 rounded transition-colors"
                                      title="Delete drug test"
                                    >
                                      <Trash2 className="w-4 h-4" />
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
                )}

              </div>

              {/* Tab Navigation Footer - fixed at bottom of modal */}
              {(() => {
                const FORM_TABS = [
                  { id: 'basic', label: 'Basic' },
                  { id: 'personal', label: 'Personal' },
                  { id: 'travel', label: 'Travel' },
                  { id: 'documents', label: 'Documents' },
                  { id: 'certifications', label: 'Certifications' },
                  { id: 'tickets', label: 'Tickets' },
                  { id: 'violations', label: 'Violations' },
                  { id: 'notes', label: 'Notes' },
                  { id: 'deductions', label: 'Deductions' },
                  { id: 'additions', label: 'Additions' },
                  { id: 'onboarding', label: 'Onboarding & Tests' },
                  { id: 'drugtest', label: 'Drug Test' },
                ];
                const tabIndex = FORM_TABS.findIndex(t => t.id === activeFormTab);
                const prevTab = tabIndex > 0 ? FORM_TABS[tabIndex - 1] : null;
                const nextTab = tabIndex >= 0 && tabIndex < FORM_TABS.length - 1 ? FORM_TABS[tabIndex + 1] : null;
                return (
                  <div className="flex-shrink-0 border-t border-theme bg-card px-4 py-3 flex justify-between items-center">
                    {prevTab ? (
                      <button
                        type="button"
                        onClick={() => setActiveFormTab(prevTab.id as any)}
                        className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-primary bg-card border border-theme rounded-lg shadow-sm hover:bg-[rgba(255,255,255,0.03)] transition-colors"
                      >
                        <span aria-hidden>←</span> {prevTab.label}
                      </button>
                    ) : <div />}
                    {nextTab ? (
                      <button
                        type="button"
                        onClick={() => setActiveFormTab(nextTab.id as any)}
                        className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-primary bg-card border border-theme rounded-lg shadow-sm hover:bg-[rgba(255,255,255,0.03)] transition-colors"
                      >
                        {nextTab.label} <span aria-hidden>→</span>
                      </button>
                    ) : <div />}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Flag Update Modal */}
      {showFlagModal && selectedFlag && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div className="bg-card rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-primary">
                  {selectedFlag.newValue ? 'Enable Flag' : 'Disable Flag'}
                </h3>
                <button
                  onClick={handleCancelFlagUpdate}
                  className="text-secondary hover:text-secondary transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="mb-4">
                <p className="text-sm text-primary mb-2">
                  <span className="font-medium">Flag:</span> {selectedFlag.flagName === 'handlesHazardousLoads' ? 'Handles hazardous loads' : 'Winter test required'}
                </p>
                <p className="text-sm text-secondary mb-4">
                  Current status: <span className="font-medium">{selectedFlag.currentValue ? 'Enabled' : 'Disabled'}</span>
                </p>
                <p className="text-sm text-secondary mb-4">
                  New status: <span className="font-medium">{selectedFlag.newValue ? 'Enabled' : 'Disabled'}</span>
                </p>
                {selectedFlag.flagName === 'handlesHazardousLoads' && selectedFlag.newValue && (
                  <div className="bg-card border border-[var(--accent-orange)]/30 rounded-lg p-3 mb-4">
                    <p className="text-xs text-[var(--accent-orange)]">
                      <span className="font-medium">Note:</span> Enabling this flag will require the driver to complete the TDG (Transportation of Dangerous Goods) test.
                    </p>
                  </div>
                )}
                {selectedFlag.flagName === 'winterTestRequired' && selectedFlag.newValue && (
                  <div className="bg-[var(--accent-navyblue)]/10 border border-[var(--accent-navyblue)]/30 rounded-lg p-3 mb-4">
                    <p className="text-xs text-[var(--accent-navyblue)]">
                      <span className="font-medium">Note:</span> Enabling this flag will require the driver to complete the Winter Driving test.
                    </p>
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleCancelFlagUpdate}
                  className="flex-1 px-4 py-2 bg-[rgba(255,255,255,0.08)] text-primary rounded-lg hover:bg-[rgba(255,255,255,0.12)] transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmFlagUpdate}
                  className="flex-1 px-4 py-2 bg-[var(--accent-navyblue)]/15 !text-white rounded-lg hover:bg-[#0d8fc7] transition-colors font-medium"
                >
                  {selectedFlag.newValue ? 'Enable' : 'Disable'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Drug Test Password Verification Modal */}
      {showDrugTestPasswordModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div className="bg-card rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Lock className="w-5 h-5 text-secondary" />
                  <h3 className="text-lg font-bold text-primary">Password Required</h3>
                </div>
                <button
                  onClick={() => {
                    setShowDrugTestPasswordModal(false);
                    setDrugTestPassword('');
                    setDrugTestPasswordError('');
                  }}
                  className="text-secondary hover:text-secondary transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="mb-4">
                <p className="text-sm text-primary mb-4">
                  This section contains sensitive drug test information. Please enter your account password to access it.
                </p>
                <label className="block text-sm font-medium text-primary mb-2">
                  Your Account Password
                </label>
                <input
                  type="password"
                  value={drugTestPassword}
                  onChange={(e) => {
                    setDrugTestPassword(e.target.value);
                    setDrugTestPasswordError('');
                  }}
                  onKeyPress={async (e) => {
                    if (e.key === 'Enter' && !verifyingPassword) {
                      await handleDrugTestPasswordVerify();
                    }
                  }}
                  placeholder="Enter your account password"
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-navyblue)]/15 focus:border-transparent ${drugTestPasswordError ? 'border-[var(--accent-red)]' : 'border-theme'
                    }`}
                  autoFocus
                />
                {drugTestPasswordError && (
                  <p className="mt-2 text-sm text-[#A855F7]">{drugTestPasswordError}</p>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    if (!verifyingPassword) {
                      setShowDrugTestPasswordModal(false);
                      setDrugTestPassword('');
                      setDrugTestPasswordError('');
                    }
                  }}
                  disabled={verifyingPassword}
                  className="flex-1 px-4 py-2 bg-[rgba(255,255,255,0.08)] text-primary rounded-lg hover:bg-[rgba(255,255,255,0.12)] transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDrugTestPasswordVerify}
                  disabled={verifyingPassword || !drugTestPassword.trim()}
                  className="flex-1 px-4 py-2 bg-[var(--accent-navyblue)]/15 !text-white rounded-lg hover:bg-[#0d8fc7] transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {verifyingPassword ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    'Verify'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Test Approval/Rejection Modal */}
      {showApprovalModal && selectedTest && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div className="bg-card rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-primary">
                  {selectedTest.action === 'approve' ? 'Approve Test' : 'Reject Test'}
                </h3>
                <button
                  onClick={closeApprovalModal}
                  className="text-secondary hover:text-secondary transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="mb-4">
                <p className="text-sm text-primary mb-2">
                  <span className="font-medium">Test Type:</span> {selectedTest.testType}
                </p>
                {selectedTest.action === 'reject' && (
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-primary mb-2">
                      Rejection Reason <span className="text-secondary">(optional)</span>
                    </label>
                    <textarea
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      placeholder="Enter reason for rejection..."
                      className="w-full px-3 py-2 border border-theme rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-navyblue)]/15 focus:border-transparent resize-none"
                      rows={4}
                    />
                  </div>
                )}
                {selectedTest.action === 'approve' && (
                  <p className="text-sm text-secondary mt-2">
                    Are you sure you want to approve this test result?
                  </p>
                )}
              </div>

              <div className="flex items-center gap-3 justify-end">
                <button
                  onClick={closeApprovalModal}
                  className="px-4 py-2 text-sm font-medium text-primary bg-card rounded-lg hover:bg-[rgba(255,255,255,0.08)] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={selectedTest.action === 'approve' ? handleTestApproval : handleTestRejection}
                  className={`px-4 py-2 text-sm font-medium !text-white rounded-lg transition-colors ${selectedTest.action === 'approve'
                    ? 'bg-[var(--accent-green)] hover:bg-[var(--accent-green)]/80'
                    : 'bg-[var(--accent-red)] hover:bg-[var(--accent-red)]/80'
                    }`}
                >
                  {selectedTest.action === 'approve' ? 'Approve' : 'Reject'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm.show && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-xl shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="flex-shrink-0 w-12 h-12 bg-[var(--accent-red)]/15 rounded-full flex items-center justify-center">
                  <Trash2 className="w-6 h-6 text-[#A855F7]" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-primary">Delete Driver</h3>
                  <p className="text-sm text-secondary">This action cannot be undone</p>
                </div>
              </div>
              <p className="text-primary mb-6">
                Are you sure you want to delete this driver? This will permanently remove the driver and all associated data.
              </p>
              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={() => setDeleteConfirm({ show: false, driverId: null })}
                  className="px-4 py-2 border border-theme rounded-lg hover:bg-[rgba(255,255,255,0.03)] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDeleteDriver}
                  className="px-4 py-2 bg-[var(--accent-red)] !text-white rounded-lg hover:bg-[var(--accent-red)]/80 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Certification Confirmation Modal */}
      {confirmDeleteCertification.open && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[10001] p-4">
          <div className="bg-card rounded-xl shadow-2xl w-full max-w-md">
            <div className="p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="flex-shrink-0 w-12 h-12 bg-[var(--accent-red)]/15 rounded-full flex items-center justify-center">
                  <Trash2 className="w-6 h-6 text-[#A855F7]" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-primary">Delete Certification</h3>
                  <p className="text-sm text-secondary">This action cannot be undone</p>
                </div>
              </div>
              <p className="text-primary mb-6">
                Are you sure you want to delete the certification <span className="font-medium text-primary">{confirmDeleteCertification.cert?.title || 'this item'}</span>? This will permanently remove the certification and all associated data.
              </p>
              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={() => setConfirmDeleteCertification({ open: false, cert: null })}
                  className="px-4 py-2 border border-theme rounded-lg hover:bg-[rgba(255,255,255,0.03)] transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmDeleteCertification}
                  className="px-4 py-2 bg-[var(--accent-red)] !text-white rounded-lg hover:bg-[var(--accent-red)]/80 transition-colors font-medium"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notifications */}
      <div className="fixed top-4 right-4 z-[10002] flex flex-col gap-2">
        {notifications.map((notification) => (
          <ToastNotification
            key={notification.id}
            notification={notification}
            onClose={removeNotification}
          />
        ))}
      </div>
    </div>
  );
};

export default DriverManagement;
