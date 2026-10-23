import { useState, useEffect, useMemo, useRef } from 'react';
import { Plus, Info, ChevronUp, ChevronDown, X, User, FileText, Upload, Edit, Trash2, Save, Calendar, Eye, EyeOff, FileDown, MessageSquare } from 'lucide-react';
import TimelineNotes from '../../../../components/common/TimelineNotes';
import { useAutoSaveDraft } from '../../../../customHooks/useAutoSaveDraft';
import DraftRestoreBanner from '../../../../components/common/DraftRestoreBanner';
import AutoSaveIndicator from '../../../../components/common/AutoSaveIndicator';
import ExcelJS from 'exceljs';
import { FaTimes, FaCheckCircle, FaExclamationTriangle } from 'react-icons/fa';
import * as employeeApi from '../../../../axios/api/employee';
import { importEmployeesFromFile } from '../../../../axios/api/employee';
import ImportButton from '../../../../components/common/ImportButton';
import { getDocumentsByEmployee, updateEmployeeDocument, deleteEmployeeDocument } from '../../../../axios/api/employeeDocument';
import { deleteDeductionAddition } from '../../../../axios/api/account.settlement';
import AddressSearch from '../../../../components/common/AddressSearch';

interface Employee {
  _id?: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  email: string;
  role?: string;
  status: 'active' | 'inactive' | 'ACTIVE' | 'INACTIVE';
  profileImageUrl?: string;
  phone?: string;
  profileImage?: string; // Alternative field name
  createdAt?: string;
  updatedAt?: string;
}

interface ToastNotification {
  id: number;
  type: 'success' | 'error' | 'warning';
  message: string;
}

const ToastNotificationComponent = ({ notification, onClose }: { notification: ToastNotification; onClose: (id: number) => void }) => {
  const icons = {
    success: <FaCheckCircle className="text-[var(--accent-green)]" size={24} />,
    error: <FaExclamationTriangle className="text-[var(--accent-red)]" size={24} />,
    warning: <FaExclamationTriangle className="text-[var(--accent-amber)]" size={24} />
  };

  const bgColors = {
    success: 'bg-[var(--accent-green)]/10 border-theme',
    error: 'bg-[var(--accent-red)]/10 border-theme',
    warning: 'bg-[var(--accent-amber)]/10 border-theme'
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      onClose(notification.id);
    }, 6000); // 6 seconds for validation errors
    return () => clearTimeout(timer);
  }, [notification.id, onClose]);

  return (
    <div className={`fixed top-4 right-4 flex items-start gap-3 p-4 rounded-lg border-2 shadow-lg z-[10003] ${bgColors[notification.type]} min-w-[320px] max-w-[520px] animate-slide-in`}>
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

// Country selector data for the phone field, cached at module scope so navigating
// away from and back to this page doesn't re-hit the public restcountries.com API.
interface Country {
  name: string;
  code: string;
  flag: string;
  dialCode: string;
}
let cachedCountries: Country[] | null = null;

const EmployeesPage = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'users' | 'nonSignin' | 'advanced'>('users');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterBy, setFilterBy] = useState('All');
  const [sortBy, setSortBy] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: string | null; direction: 'asc' | 'desc' }>({
    key: null,
    direction: 'asc'
  });

  // Modal state
  const [showNewEmployeeModal, setShowNewEmployeeModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [originalEmployeeData, setOriginalEmployeeData] = useState<any>(null);
  const [activeFormTab, setActiveFormTab] = useState<'basic' | 'personal' | 'documents' | 'notes' | 'deductions' | 'additions' | 'timeline'>('basic');
  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [profileImagePreview, setProfileImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [passwordIsExisting, setPasswordIsExisting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [editingDocumentId, setEditingDocumentId] = useState<string | null>(null);
  const [editingDocument, setEditingDocument] = useState<{
    expiryDate: string;
    description: string;
    ignoreExpiration: boolean;
    file: File | null;
  } | null>(null);

  // Form state for Basic Information
  const [basicData, setBasicData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    status: '',
    role: ''
  });

  // Inline field errors shown under each input, in addition to the summary toast
  const [formErrors, setFormErrors] = useState<{
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    sinNo?: string;
  }>({});

  // Form state for Personal Information
  const [personalData, setPersonalData] = useState({
    title: '',
    payType: '',
    payRate: '',
    vacationPay: '',
    department: '',
    employmentType: 'FULL-TIME' as 'FULL-TIME' | 'PART-TIME' | 'CONTRACT BASIS',
    phone: '', // Store phone without country code prefix
    searchAddress: '',
    address: '',
    country: '',
    stateProvince: '',
    dateOfBirth: '',
    hireDate: '',
    terminationDate: '',
    sinNo: ''
  });

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

  // Country selector state for phone (Country type + fetch cache declared at module scope above)
  const [countries, setCountries] = useState<Country[]>(cachedCountries || []);
  const [phoneCountry, setPhoneCountry] = useState<string>('US');
  const [phoneCountryDropdownOpen, setPhoneCountryDropdownOpen] = useState(false);
  const [phoneCountrySearch, setPhoneCountrySearch] = useState('');
  const phoneCountryDropdownRef = useRef<HTMLDivElement>(null);

  // Helper function to parse phone number and extract country code
  const parsePhoneNumber = (phone: string | undefined | null, countriesList: Country[] = countries): { countryCode: string; phoneNumber: string } => {
    if (!phone) return { countryCode: 'US', phoneNumber: '' };

    const cleanPhone = phone.trim();
    const sortedCountries = [...countriesList].sort((a, b) => b.dialCode.length - a.dialCode.length);

    for (const country of sortedCountries) {
      if (cleanPhone.startsWith(country.dialCode)) {
        return {
          countryCode: country.code,
          phoneNumber: cleanPhone.substring(country.dialCode.length).trim()
        };
      }
    }

    return { countryCode: 'US', phoneNumber: cleanPhone.replace(/^\+1/, '').trim() };
  };

  // Fetch countries data (skip the network call entirely if we already cached it this session)
  useEffect(() => {
    if (cachedCountries) return;

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

        cachedCountries = sortedCountries;
        setCountries(sortedCountries);
        const defaultCountry = sortedCountries.find((c: Country) => c.code === 'US');
        if (defaultCountry) {
          setPhoneCountry('US');
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
        cachedCountries = fallback;
        setCountries(fallback);
        setPhoneCountry('US');
      });
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (phoneCountryDropdownRef.current && !phoneCountryDropdownRef.current.contains(event.target as Node)) {
        setPhoneCountryDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Form state for Documents
  const [documents, setDocuments] = useState<Array<{
    id: string;
    _id?: string; // For existing documents from API
    expiryDate: string;
    description: string;
    file: File | null;
    fileUrl?: string; // For existing documents
    fileName?: string; // For existing documents
    ignoreExpiration: boolean;
    documentType?: string; // For existing documents
    isExisting?: boolean; // Flag to identify existing documents
  }>>([]);
  const [newDocument, setNewDocument] = useState({
    expiryDate: '',
    description: '',
    file: null as File | null,
    ignoreExpiration: false
  });

  // Form state for Notes / Benefits
  const [notesBenefits, setNotesBenefits] = useState('');

  // Auto-save draft protection (crash/power-loss safety net for the create/edit form)
  const employeeDraftSnapshot = useMemo(
    () => ({ basicData, personalData, notesBenefits, deductions, additions }),
    [basicData, personalData, notesBenefits, deductions, additions]
  );
  const {
    status: draftStatus,
    lastSavedAt: draftLastSavedAt,
    pendingRestore: draftPendingRestore,
    restoreDraft: restoreEmployeeDraft,
    discardDraft: discardEmployeeDraft,
    clearDraft: clearEmployeeDraft,
  } = useAutoSaveDraft({
    entityType: 'employees',
    entityId: editingId || 'new',
    formData: employeeDraftSnapshot,
    enabled: showNewEmployeeModal,
  });

  const handleRestoreEmployeeDraft = () => {
    const draft = restoreEmployeeDraft() as Partial<typeof employeeDraftSnapshot> | null;
    if (!draft) return;
    if (draft.basicData) setBasicData((prev) => ({ ...prev, ...draft.basicData }));
    if (draft.personalData) setPersonalData((prev) => ({ ...prev, ...draft.personalData }));
    if (typeof draft.notesBenefits === 'string') setNotesBenefits(draft.notesBenefits);
    if (Array.isArray(draft.deductions)) setDeductions(draft.deductions);
    if (Array.isArray(draft.additions)) setAdditions(draft.additions);
  };

  // Toast notifications state
  const [notifications, setNotifications] = useState<ToastNotification[]>([]);

  const showNotification = (type: 'success' | 'error' | 'warning', message: string) => {
    const id = Date.now();
    setNotifications(prev => [...prev, { id, type, message }]);
  };

  const closeNotification = (id: number) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  // Delete confirmation modal state
  const [deleteConfirmation, setDeleteConfirmation] = useState<{ show: boolean; employeeId: string | null; employeeName: string }>({
    show: false,
    employeeId: null,
    employeeName: ''
  });

  // Departments list
  const departments = [
    'Driver Management / Human Resources',
    'Safety & Compliance Department',
    'Fleet Maintenance & Repair',
    'Logistics & Load Planning',
    'Accounting & Finance',
    'Customer Service / Client Relations',
    'Information Technology (IT)',
    'Business Development / Sales',
    'Legal & Risk Management',
    'Training & Development',
    'Operations',
    'Claims & Insurance',
    'Fuel & IFTA Management'
  ];

  // Roles list
  const roles = [
    'dispatcher',
    'hr',
    'reporter',
    'Fleet Maintenance Manager',
    'Compliance Manager',
    'Maintenance Crew (Mechanics)',
    'safety officer',
    'operator',
    'accountant',
    'salesperson'
  ];

  // Fetch employees from API
  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const hasRole = activeTab === 'advanced' ? 'true' : activeTab === 'nonSignin' ? 'false' : undefined;
      const status = filterBy === 'All' ? undefined : filterBy.toLowerCase();

      const response = await employeeApi.getAllEmployees(
        1,
        1000,
        searchTerm || undefined,
        undefined,
        status,
        sortBy || undefined,
        sortConfig.direction || undefined,
        hasRole
      );

      if (response?.success && response.data) {
        // Parse name into firstName and lastName
        const employeesWithNames = response.data.map((emp: any) => {
          const nameParts = (emp.name || '').split(' ');
          return {
            ...emp,
            firstName: nameParts[0] || '',
            lastName: nameParts.slice(1).join(' ') || '',
            status: emp.status?.toUpperCase() || 'ACTIVE',
            profileImageUrl: emp.profileImageUrl || emp.profileImage || null
          };
        });
        setEmployees(employeesWithNames);
      }
    } catch (error) {
      console.error('Error fetching employees:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, [activeTab, filterBy, searchTerm, sortBy, sortConfig]);

  // Filter employees based on search
  const getFilteredEmployees = () => {
    let filtered = [...employees];

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(emp =>
        (emp.firstName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (emp.lastName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (emp.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (emp.name || '').toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Sort
    if (sortConfig.key) {
      filtered = [...filtered].sort((a, b) => {
        const aValue = (a as any)[sortConfig.key!] || '';
        const bValue = (b as any)[sortConfig.key!] || '';

        if (aValue < bValue) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }

    return filtered;
  };

  const filteredEmployees = getFilteredEmployees();

  const handleSort = (key: string) => {
    setSortConfig(current => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
    }));
    setSortBy(key);
  };

  const getSortIcon = (key: string) => {
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

  const getRoleDisplayName = (role?: string) => {
    if (!role) return 'No Role';
    // Map current roles to display names (keys lowercased so lookup is case-insensitive)
    const roleMap: { [key: string]: string } = {
      'dispatcher': 'Dispatch',
      'hr': 'HR',
      'fleet maintenance manager': 'Fleet Maintenance Manager',
      'compliance manager': 'Compliance Manager',
      'safety officer': 'Safety Officer',
      'reporter': 'Reporter',
      'maintenance crew (mechanics)': 'Maintenance Crew (Mechanics)',
      'operator': 'Operator',
      'accountant': 'Accountant',
      'salesperson': 'Salesperson'
    };
    return roleMap[role.toLowerCase()] || role;
  };

  // Badges shown in the "User Roles & Permissions" info panel — derived from the
  // same `roles` list used by the role dropdown so the two can never drift apart.
  const roleBadges = roles.map(r => getRoleDisplayName(r).toUpperCase());

  // Handle save employee
  const handleSaveEmployee = async () => {
    // Client-side validation — collect every field error at once so the form can
    // show inline messages under each field instead of one toast per attempt.
    const errors: typeof formErrors = {};
    const nameRegex = /^[a-zA-Z\s]+$/;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!basicData.firstName.trim()) {
      errors.firstName = 'First name is required';
    } else if (!nameRegex.test(basicData.firstName)) {
      errors.firstName = 'Only letters and spaces are allowed';
    }

    if (!basicData.lastName.trim()) {
      errors.lastName = 'Last name is required';
    } else if (!nameRegex.test(basicData.lastName)) {
      errors.lastName = 'Only letters and spaces are allowed';
    }

    if (!basicData.email.trim()) {
      errors.email = 'Email is required';
    } else if (!emailRegex.test(basicData.email)) {
      errors.email = 'Please provide a valid email address';
    }

    if (personalData.phone && personalData.phone.trim()) {
      const phoneDigits = personalData.phone.replace(/\D/g, '');
      if (phoneDigits.length < 10) {
        errors.phone = 'Phone number must have at least 10 digits';
      }
    }

    if (!personalData.sinNo || !personalData.sinNo.trim()) {
      errors.sinNo = 'SIN number is required';
    }

    setFormErrors(errors);

    if (Object.keys(errors).length > 0) {
      showNotification('error', 'Please fix the highlighted fields before saving');
      if (errors.firstName || errors.lastName || errors.email) {
        setActiveFormTab('basic');
      } else {
        setActiveFormTab('personal');
      }
      return;
    }

    // Check if password is required for this role (mechanics need password to sign in)
    const nonSigninRoles = ['reporter', 'operator', 'salesperson'];
    const isNonSigninRole = nonSigninRoles.includes(basicData.role);

    setIsSubmitting(true);
    try {
      const formData = new FormData();

      // Helper function to compare values (handles null/undefined/empty strings)
      const hasChanged = (newValue: any, oldValue: any): boolean => {
        const normalizedNew = newValue === null || newValue === undefined || newValue === '' ? null : String(newValue).trim();
        const normalizedOld = oldValue === null || oldValue === undefined || oldValue === '' ? null : String(oldValue).trim();
        return normalizedNew !== normalizedOld;
      };

      // Helper function to format phone number with country code
      const formatPhoneWithCountryCode = (phone: string): string => {
        if (!phone) return '';
        const phoneCountryObj = countries.find(c => c.code === phoneCountry);
        if (phoneCountryObj) {
          const dialCodeWithoutPlus = phoneCountryObj.dialCode.replace('+', '');
          let phoneNumber = phone.trim();
          if (phoneNumber.startsWith('+')) {
            phoneNumber = phoneNumber.substring(1);
          }
          if (phoneNumber.startsWith(dialCodeWithoutPlus)) {
            return `+${phoneNumber}`;
          } else {
            return `${phoneCountryObj.dialCode}${phoneNumber}`;
          }
        } else {
          return phone.startsWith('+') ? phone : `+${phone}`;
        }
      };

      if (editingId && originalEmployeeData) {
        // UPDATE MODE - Only send changed values

        // Basic data - only if changed
        const currentName = `${basicData.firstName} ${basicData.lastName}`.trim();
        const originalName = originalEmployeeData.name || '';
        if (hasChanged(currentName, originalName)) {
          formData.append('name', currentName);
        }

        const currentEmail = basicData.email || '';
        const originalEmail = originalEmployeeData.email || '';
        if (hasChanged(currentEmail, originalEmail)) {
          formData.append('email', currentEmail);
        }

        // Password - only if provided (changed)
        if (basicData.password && basicData.password.trim()) {
          formData.append('password', basicData.password);
        }

        const currentStatus = basicData.status.toLowerCase();
        const originalStatus = (originalEmployeeData.status || '').toLowerCase();
        if (hasChanged(currentStatus, originalStatus)) {
          formData.append('status', currentStatus);
        }

        const currentRole = basicData.role || '';
        const originalRole = originalEmployeeData.role || '';
        if (hasChanged(currentRole, originalRole)) {
          formData.append('role', currentRole);
        }

        // Personal data - only if changed
        const currentPhone = formatPhoneWithCountryCode(personalData.phone || '');
        const originalPhone = originalEmployeeData.phone || '';
        if (hasChanged(currentPhone, originalPhone)) {
          formData.append('phone', currentPhone);
        }

        const currentAddress = personalData.address || '';
        const originalAddress = originalEmployeeData.location?.address || originalEmployeeData.address || '';
        if (hasChanged(currentAddress, originalAddress)) {
          formData.append('address', currentAddress);
        }

        const currentCountry = personalData.country || '';
        const originalCountry = originalEmployeeData.country || originalEmployeeData.location?.country || '';
        if (hasChanged(currentCountry, originalCountry)) {
          formData.append('country', currentCountry);
        }

        const currentState = personalData.stateProvince || '';
        const originalState = originalEmployeeData.state || originalEmployeeData.location?.state || '';
        if (hasChanged(currentState, originalState)) {
          formData.append('state', currentState);
        }

        const currentDateOfBirth = personalData.dateOfBirth || '';
        const originalDateOfBirth = originalEmployeeData.details?.dateOfBirth || originalEmployeeData.details?.dob || originalEmployeeData.dateOfBirth || originalEmployeeData.dob || '';
        const formattedOriginalDob = originalDateOfBirth ? new Date(originalDateOfBirth).toISOString().split('T')[0] : '';
        if (hasChanged(currentDateOfBirth, formattedOriginalDob)) {
          formData.append('dateOfBirth', currentDateOfBirth);
        }

        const currentHireDate = personalData.hireDate || '';
        const originalHireDate = originalEmployeeData.joinDate || originalEmployeeData.details?.hireDate || '';
        const formattedOriginalHireDate = originalHireDate ? new Date(originalHireDate).toISOString().split('T')[0] : '';
        if (hasChanged(currentHireDate, formattedOriginalHireDate)) {
          formData.append('hireDate', currentHireDate);
        }

        const currentTermDate = personalData.terminationDate || '';
        const originalTermDate = originalEmployeeData.details?.termDate || '';
        const formattedOriginalTermDate = originalTermDate ? new Date(originalTermDate).toISOString().split('T')[0] : '';
        if (hasChanged(currentTermDate, formattedOriginalTermDate)) {
          formData.append('termDate', currentTermDate);
        }

        // Additional personal data fields - only if changed
        const currentTitle = personalData.title || '';
        const originalTitle = originalEmployeeData.details?.title || originalEmployeeData.title || '';
        if (hasChanged(currentTitle, originalTitle)) {
          formData.append('title', currentTitle);
        }

        const currentPayType = personalData.payType || '';
        const originalPayType = originalEmployeeData.details?.payType || originalEmployeeData.payType || '';
        if (hasChanged(currentPayType, originalPayType)) {
          formData.append('payType', currentPayType);
        }

        const currentPayRate = personalData.payRate || '';
        const originalPayRate = originalEmployeeData.details?.payRate || originalEmployeeData.payRate || '';
        if (hasChanged(currentPayRate, originalPayRate)) {
          formData.append('payRate', currentPayRate);
        }
        // Payroll reads details.hourlyRate, not details.payRate — always send it in sync whenever
        // pay type is Hourly, regardless of whether payRate itself just changed.
        if (currentPayType === 'Hourly' && currentPayRate) {
          formData.append('hourlyRate', currentPayRate);
        }

        const currentVacationPay = personalData.vacationPay || '';
        const originalVacationPay = originalEmployeeData.details?.vacationPay || originalEmployeeData.vacationPay || '';
        if (hasChanged(currentVacationPay, originalVacationPay)) {
          formData.append('vacationPay', currentVacationPay);
        }

        const currentDepartment = personalData.department || '';
        const originalDepartment = originalEmployeeData.details?.department || originalEmployeeData.department || '';
        if (hasChanged(currentDepartment, originalDepartment)) {
          formData.append('department', currentDepartment);
        }

        const currentEmploymentType = personalData.employmentType || '';
        const originalEmploymentType = originalEmployeeData.details?.employmentType || originalEmployeeData.details?.jobTime || originalEmployeeData.employmentType || originalEmployeeData.jobTime || '';
        if (hasChanged(currentEmploymentType, originalEmploymentType)) {
          formData.append('employmentType', currentEmploymentType);
        }

        const currentSinNo = personalData.sinNo || '';
        const originalSinNo = originalEmployeeData.details?.sinNo || originalEmployeeData.sinNo || '';
        if (hasChanged(currentSinNo, originalSinNo)) {
          formData.append('sinNo', currentSinNo);
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
          formData.append('deductions', JSON.stringify(deductionsData));
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
          formData.append('additions', JSON.stringify(additionsData));
        }

        // Notes - only if changed
        const currentNotes = notesBenefits || '';
        const originalNotes = originalEmployeeData.notes || originalEmployeeData.details?.notes || '';
        if (hasChanged(currentNotes, originalNotes)) {
          formData.append('notes', currentNotes.trim());
        }

      } else {
        // CREATE MODE - Send all required fields
        formData.append('name', `${basicData.firstName} ${basicData.lastName}`.trim());
        formData.append('email', basicData.email);

        // Only include password if explicitly provided, or set dummy for non-signin roles.
        // For signin roles with no password, omit it so the backend generates an invite email.
        if (basicData.password) {
          formData.append('password', basicData.password);
        } else if (isNonSigninRole) {
          formData.append('password', 'NonSignin123!');
        }
        // else: no password → backend triggers invite email flow

        formData.append('status', basicData.status.toLowerCase());
        if (basicData.role) formData.append('role', basicData.role);

        // Personal data - include all fields
        if (personalData.phone) {
          formData.append('phone', formatPhoneWithCountryCode(personalData.phone));
        }
        if (personalData.address) {
          formData.append('address', personalData.address);
        }
        if (personalData.country) {
          formData.append('country', personalData.country);
        }
        if (personalData.stateProvince) {
          formData.append('state', personalData.stateProvince);
        }
        if (personalData.dateOfBirth) {
          formData.append('dateOfBirth', personalData.dateOfBirth);
        }
        if (personalData.hireDate) {
          formData.append('hireDate', personalData.hireDate);
        }
        if (personalData.terminationDate) {
          formData.append('termDate', personalData.terminationDate);
        }

        // Additional personal data fields
        if (personalData.title) {
          formData.append('title', personalData.title);
        }
        if (personalData.payType) {
          formData.append('payType', personalData.payType);
        }
        if (personalData.payRate) {
          formData.append('payRate', personalData.payRate);
        }
        // Payroll reads details.hourlyRate, not details.payRate — keep them in sync when Hourly.
        if (personalData.payType === 'Hourly' && personalData.payRate) {
          formData.append('hourlyRate', personalData.payRate);
        }
        if (personalData.vacationPay) {
          formData.append('vacationPay', personalData.vacationPay);
        }
        if (personalData.department) {
          formData.append('department', personalData.department);
        }
        if (personalData.employmentType) {
          formData.append('employmentType', personalData.employmentType);
        }
        if (personalData.sinNo) {
          formData.append('sinNo', personalData.sinNo);
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
          formData.append('deductions', JSON.stringify(deductionsData));
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
          formData.append('additions', JSON.stringify(additionsData));
        }

        // Notes
        if (notesBenefits && notesBenefits.trim()) {
          formData.append('notes', notesBenefits.trim());
        }
      }

      // Documents - send as JSON array and files
      if (documents && documents.length > 0) {
        const documentsData = documents.map(doc => ({
          id: doc.id,
          _id: doc._id || '',
          expiryDate: doc.expiryDate || '',
          description: doc.description || '',
          ignoreExpiration: doc.ignoreExpiration || false,
          documentType: doc.documentType || 'Other',
          hasFile: !!doc.file,
          isExisting: doc.isExisting || false
        }));
        formData.append('documents', JSON.stringify(documentsData));

        // Append document files (only new files, not existing ones)
        const newDocuments = documents.filter(doc => !doc.isExisting && doc.file);
        newDocuments.forEach((doc) => {
          if (doc.file) {
            formData.append('documentFiles', doc.file);
            console.log(`📎 Appending document file: ${doc.file.name} (${(doc.file.size / 1024).toFixed(2)} KB)`);
          }
        });
        console.log(`📄 Total documents: ${documents.length}, New files: ${newDocuments.length}`);
      }

      // Profile image
      if (profileImage) {
        formData.append('file', profileImage);
      }

      let response;
      let employeeId = editingId; // Use editingId for updates

      console.log('🔄 Saving employee:', editingId ? `Update (ID: ${editingId})` : 'Create new');
      if (editingId) {
        response = await employeeApi.updateEmployee(editingId, formData);
        employeeId = editingId; // Ensure employeeId is set for updates
      } else {
        response = await employeeApi.createEmployee(formData);
        employeeId = response?.data?._id || response?.data?.id;
        console.log('✅ Employee created with ID:', employeeId);
      }

      if (response?.success) {
        console.log('✅ Employee saved successfully, employeeId:', employeeId);
        console.log('✅ Documents were included in the employee creation/update request');

        showNotification('success', `Employee ${editingId ? 'updated' : 'created'} successfully!`);
        clearEmployeeDraft();
        setShowNewEmployeeModal(false);
        resetForm();
        fetchEmployees();
      } else {
        // Handle validation errors from backend
        if (response?.errors && Array.isArray(response.errors)) {
          // Show each validation error
          response.errors.forEach((error: any, index: number) => {
            setTimeout(() => {
              showNotification('error', error.msg || error.message || 'Validation error');
            }, index * 100); // Stagger notifications slightly
          });
        } else {
          showNotification('error', response?.message || `Failed to ${editingId ? 'update' : 'create'} employee`);
        }
      }
    } catch (error: any) {
      console.error(`Error ${editingId ? 'updating' : 'creating'} employee:`, error);

      // Handle validation errors from catch block
      const errorData = error.response?.data;
      if (errorData?.errors && Array.isArray(errorData.errors)) {
        // Show each validation error
        errorData.errors.forEach((err: any, index: number) => {
          setTimeout(() => {
            showNotification('error', err.msg || err.message || 'Validation error');
          }, index * 100); // Stagger notifications slightly
        });
      } else {
        showNotification('error', errorData?.message || error.message || `Failed to ${editingId ? 'update' : 'create'} employee`);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExportEmployees = async () => {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Logistiq Innovation';
    workbook.created = new Date();
    const sheet = workbook.addWorksheet('Employees', { views: [{ state: 'frozen', ySplit: 1 }] });

    sheet.columns = [
      { header: 'First Name', key: 'firstName', width: 18 },
      { header: 'Last Name', key: 'lastName', width: 18 },
      { header: 'Email', key: 'email', width: 30 },
      { header: 'Phone', key: 'phone', width: 18 },
      { header: 'Role', key: 'role', width: 22 },
      { header: 'Department', key: 'department', width: 20 },
      { header: 'Status', key: 'status', width: 12 },
      { header: 'Created At', key: 'createdAt', width: 18 },
    ];

    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF42AEEC' } };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
    headerRow.height = 22;

    filteredEmployees.forEach((emp: any) => {
      const nameParts = (emp.name || '').split(' ');
      const row = sheet.addRow({
        firstName: emp.firstName || nameParts[0] || '',
        lastName: emp.lastName || nameParts.slice(1).join(' ') || '',
        email: emp.email || '',
        phone: emp.phone || '',
        role: emp.role || '',
        department: emp.department || '',
        status: emp.status || '',
        createdAt: emp.createdAt ? new Date(emp.createdAt).toLocaleDateString() : '',
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
    a.download = `Employees-${new Date().toISOString().split('T')[0]}.xlsx`;
    document.body.appendChild(a);
    a.click();
    URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  const resetForm = () => {
    setPasswordIsExisting(false);
    setShowPassword(false);
    setFormErrors({});
    setBasicData({
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      status: '',
      role: ''
    });
    setPersonalData({
      title: '',
      payType: '',
      payRate: '',
      vacationPay: '',
      department: '',
      employmentType: 'FULL-TIME',
      phone: '',
      searchAddress: '',
      address: '',
      country: '',
      stateProvince: '',
      dateOfBirth: '',
      hireDate: '',
      terminationDate: '',
      sinNo: ''
    });
    setDeductions([]);
    setNewDeduction({
      startDate: '',
      description: '',
      amount: '0',
      interval: '',
      currency: 'CAD'
    });
    setAdditions([]);
    setNewAddition({
      startDate: '',
      description: '',
      amount: '0',
      interval: '',
      currency: 'CAD'
    });
    setDocuments([]);
    setNewDocument({
      expiryDate: '',
      description: '',
      file: null,
      ignoreExpiration: false
    });
    setNotesBenefits('');
    setProfileImage(null);
    setProfileImagePreview(null);
    setEditingId(null);
    setOriginalEmployeeData(null);
    setEditingDocumentId(null);
    setEditingDocument(null);
    setActiveFormTab('basic');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleCloseModal = () => {
    setShowNewEmployeeModal(false);
    resetForm();
  };

  const loadEmployeeForEdit = async (id: string) => {
    try {
      const response = await employeeApi.getEmployeeById(id);
      if (response?.success && response.data) {
        const emp = response.data;
        console.log('📋 Loading employee for edit:', emp);
        console.log('📋 Employee details:', emp.details);

        // Store original employee data for comparison
        setOriginalEmployeeData(emp);

        const nameParts = (emp.name || '').split(' ');
        setBasicData({
          firstName: nameParts[0] || '',
          lastName: nameParts.slice(1).join(' ') || '',
          email: emp.email || '',
          password: '',
          status: emp.status || 'active',
          role: emp.role || ''
        });
        setPasswordIsExisting(true);
        // Parse phone number to extract country code and phone number
        const parsedPhone = parsePhoneNumber(emp.phone || '', countries);
        setPhoneCountry(parsedPhone.countryCode);

        // Helper function to safely convert date to YYYY-MM-DD format
        const formatDateForInput = (dateValue: any): string => {
          if (!dateValue) return '';
          try {
            const date = new Date(dateValue);
            // Check if date is valid
            if (isNaN(date.getTime())) return '';
            return date.toISOString().split('T')[0];
          } catch (error) {
            console.error('Error formatting date:', error);
            return '';
          }
        };

        // Load personal data - check both top-level and details object
        const personalDataToSet = {
          title: emp.details?.title || emp.title || '',
          payType: emp.details?.payType || emp.payType || '',
          // Fall back to hourlyRate (set by the separate Driver-management form) so a rate set there
          // still displays correctly here instead of showing blank.
          payRate: emp.details?.payRate || emp.payRate || emp.details?.hourlyRate || emp.hourlyRate || '',
          vacationPay: emp.details?.vacationPay || emp.vacationPay || '',
          department: emp.details?.department || emp.department || '',
          employmentType: (emp.details?.employmentType || emp.details?.jobTime || emp.employmentType || emp.jobTime || 'FULL-TIME') as 'FULL-TIME' | 'PART-TIME' | 'CONTRACT BASIS',
          phone: parsedPhone.phoneNumber || '',
          searchAddress: '',
          address: emp.location?.address || emp.address || '',
          country: emp.country || emp.location?.country || '',
          stateProvince: emp.state || emp.location?.state || '',
          dateOfBirth: formatDateForInput(emp.details?.dateOfBirth || emp.details?.dob || emp.dateOfBirth || emp.dob || ''),
          hireDate: formatDateForInput(emp.joinDate || emp.details?.hireDate || ''),
          terminationDate: formatDateForInput(emp.details?.termDate || ''),
          sinNo: emp.details?.sinNo || emp.sinNo || ''
        };

        // Load deductions and additions if available
        if (emp.deductions && Array.isArray(emp.deductions) && emp.deductions.length > 0) {
          const existingDeductions = emp.deductions.map((ded: any) => ({
            id: `existing-${ded._id}`,
            startDate: ded.startDate ? new Date(ded.startDate).toISOString().split('T')[0] : '',
            description: ded.name || ded.description || '',
            amount: ded.amount?.toString() || '0',
            interval: ded.recurrence || ded.interval || '',
            currency: ded.currency || 'CAD'
          }));
          setDeductions(existingDeductions);
        } else {
          setDeductions([]);
        }

        if (emp.additions && Array.isArray(emp.additions) && emp.additions.length > 0) {
          const existingAdditions = emp.additions.map((add: any) => ({
            id: `existing-${add._id}`,
            startDate: add.startDate ? new Date(add.startDate).toISOString().split('T')[0] : '',
            description: add.name || add.description || '',
            amount: add.amount?.toString() || '0',
            interval: add.recurrence || add.interval || '',
            currency: add.currency || 'CAD'
          }));
          setAdditions(existingAdditions);
        } else {
          setAdditions([]);
        }

        console.log('📋 Personal data to set:', personalDataToSet);
        setPersonalData(personalDataToSet);
        if (emp.profileImageUrl) {
          setProfileImagePreview(emp.profileImageUrl);
        }

        // Load notes/benefits
        setNotesBenefits(emp.notes || emp.details?.notes || '');

        // Fetch existing documents - always fetch fresh data
        try {
          console.log('🔄 Fetching documents for employee:', id);
          const documentsResponse = await getDocumentsByEmployee(id);
          console.log('📄 Documents response:', documentsResponse);

          if (documentsResponse?.success && documentsResponse.data && Array.isArray(documentsResponse.data)) {
            const existingDocs = documentsResponse.data.map((doc: any) => ({
              id: doc._id || Date.now().toString(),
              _id: doc._id,
              expiryDate: doc.expiryDate ? new Date(doc.expiryDate).toISOString().split('T')[0] : '',
              description: doc.description || doc.documentType || '',
              file: null,
              fileUrl: doc.fileUrl,
              fileName: doc.fileName,
              ignoreExpiration: doc.ignoreExpiration || false,
              documentType: doc.documentType,
              isExisting: true
            }));
            setDocuments(existingDocs);
            console.log('✅ Loaded', existingDocs.length, 'existing documents for employee');
          } else {
            setDocuments([]);
            console.log('ℹ️ No documents found for employee');
          }
        } catch (docError) {
          console.error('❌ Error loading employee documents:', docError);
          setDocuments([]); // Set empty array if documents fail to load
        }

        setShowNewEmployeeModal(true);
      }
    } catch (error) {
      console.error('Error loading employee for edit:', error);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirmation.employeeId) return;

    try {
      const response = await employeeApi.deleteEmployee(deleteConfirmation.employeeId);
      if (response?.success) {
        showNotification('success', 'Employee deleted successfully!');
        setDeleteConfirmation({ show: false, employeeId: null, employeeName: '' });
        fetchEmployees();
      } else {
        showNotification('error', response?.message || 'Failed to delete employee');
      }
    } catch (error: any) {
      console.error('Error deleting employee:', error);
      showNotification('error', error.response?.data?.message || error.message || 'Failed to delete employee');
    }
  };

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
          .border-theme { border-color: #dde6f0 !important; }
          h1 { color: #1183e0 !important; font-size: 20px !important; }
        }
      `}</style>
      {/* Toast Notifications */}
      {notifications.map(notification => (
        <ToastNotificationComponent
          key={notification.id}
          notification={notification}
          onClose={closeNotification}
        />
      ))}

      <div className="max-w-full mx-auto">
        {/* Header Section */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl font-bold text-primary">Employees</h1>
            <div className="flex items-center gap-2 print-hide">
              <span className="text-2xl font-bold text-primary">({filteredEmployees.length})</span>
              <button
                onClick={handleExportEmployees}
                title="Export to Excel"
                className="w-10 h-10  !text-white rounded-lg flex items-center justify-center bg-[var(--accent-navyblue)] hover:bg-[var(--accent-navyblue)] transition-colors shadow-md"
              >
                <FileDown className="w-5 h-5" />
              </button>
              <ImportButton
                onImport={async (file, fieldMap) => { const res = await importEmployeesFromFile(file, fieldMap); fetchEmployees(); return res; }}
                templateFileName="employees_template.csv"
                templateColumns={[
                  { header: 'first_name', example: 'Jane', required: false },
                  { header: 'last_name', example: 'Doe', required: false },
                  { header: 'name', example: 'Jane Doe', required: false },
                  { header: 'email', example: 'jane@example.com', required: true },
                  { header: 'role', example: 'dispatcher', required: true },
                  { header: 'status', example: 'active', required: false },
                  { header: 'phone', example: '555-987-6543', required: false },
                  { header: 'department', example: 'Operations', required: false },
                  { header: 'job_title', example: 'Senior Dispatcher', required: false },
                  { header: 'city', example: 'Toronto', required: false },
                  { header: 'country', example: 'Canada', required: false },
                  { header: 'date_of_birth', example: '1990-05-15', required: false },
                  { header: 'hire_date', example: '2023-01-10', required: false },
                  { header: 'gender', example: 'Male', required: false },
                  { header: 'employee_id', example: 'EMP-0001', required: false },
                ]}
                label="Import Employees"
              />
              <button
                onClick={() => setShowNewEmployeeModal(true)}
                className="w-10 h-10 bg-[var(--accent-navyblue)] !text-white rounded-lg flex items-center justify-center hover:bg-[var(--accent-navyblue)]/80 transition-colors shadow-md"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex gap-6 border-b-2 border-theme print-hide">
            <button
              onClick={() => setActiveTab('users')}
              className={`pb-3 px-1 font-medium transition-colors ${activeTab === 'users'
                ? 'text-[var(--accent-navyblue)] border-b-2 border-[var(--accent-navyblue)] -mb-[2px]'
                : 'text-secondary hover:text-primary'
                }`}
            >
              Users
            </button>
            <button
              onClick={() => setActiveTab('nonSignin')}
              className={`pb-3 px-1 font-medium transition-colors ${activeTab === 'nonSignin'
                ? 'text-[var(--accent-navyblue)] border-b-2 border-[var(--accent-navyblue)] -mb-[2px]'
                : 'text-secondary hover:text-primary'
                }`}
            >
              Non Signin Employees
            </button>
            <button
              onClick={() => setActiveTab('advanced')}
              className={`pb-3 px-1 font-medium transition-colors ${activeTab === 'advanced'
                ? 'text-[var(--accent-navyblue)] border-b-2 border-[var(--accent-navyblue)] -mb-[2px]'
                : 'text-secondary hover:text-primary'
                }`}
            >
              Advanced Permissions
            </button>
          </div>
        </div>

        {/* User Roles & Permissions Section */}
        {activeTab === 'users' && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-4">
              <Info className="w-5 h-5 text-secondary" />
              <h2 className="text-lg font-semibold text-primary">User Roles & Permissions</h2>
            </div>

            <div className="flex flex-wrap gap-2 mb-4">
              {roleBadges.map((role, index) => (
                <span
                  key={index}
                  className="px-3 py-1 bg-[var(--accent-green)]/10 text-[var(--accent-blue)] text-sm font-medium rounded-full"
                >
                  {role}
                </span>
              ))}
            </div>

            <p className="text-sm text-secondary mb-4">
              Hover over role badges to see permissions. Salesperson users are automatically redirected to dispatch and see only their assigned loads.
            </p>
          </div>
        )}

        {/* Search and Filter Section */}
        <div className="mb-6 flex flex-wrap items-center gap-4 print-hide">
          <div className="flex items-center gap-2 flex-1 min-w-[300px]">
            <input
              type="text"
              placeholder="Employees Name or Email"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 px-4 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-navyblue)] focus:border-transparent"
            />

          </div>

          <div className="flex items-center gap-4">

            {/* Filter By */}
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-primary">
                Filter By:
              </label>
              <select
                value={filterBy}
                onChange={(e) => setFilterBy(e.target.value)}
                className="px-3 py-2 bg-[rgba(255,255,255,0.05)] text-primary border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)] focus:border-[var(--accent-blue)] hover:bg-[rgba(0,209,255,0.08)] transition-all duration-200"
              >
                <option className="bg-[#0f1b2d] text-white" value="All">
                  All
                </option>
                <option className="bg-[#0f1b2d] text-white" value="Active">
                  Active
                </option>
                <option className="bg-[#0f1b2d] text-white" value="Inactive">
                  Inactive
                </option>
              </select>
            </div>

            {/* Sort By */}
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-primary">
                Sort By:
              </label>
              <select
                value={sortBy}
                onChange={(e) => {
                  setSortBy(e.target.value);
                  if (e.target.value) {
                    handleSort(e.target.value as keyof Employee);
                  }
                }}
                className="px-3 py-2 bg-[rgba(255,255,255,0.05)] text-primary border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)] focus:border-[var(--accent-blue)] hover:bg-[rgba(0,209,255,0.08)] transition-all duration-200"
              >
                <option className="bg-[#0f1b2d] text-white" value="">
                  Select
                </option>
                <option className="bg-[#0f1b2d] text-white" value="firstName">
                  First Name
                </option>
                <option className="bg-[#0f1b2d] text-white" value="lastName">
                  Last Name
                </option>
                <option className="bg-[#0f1b2d] text-white" value="email">
                  Email
                </option>
                <option className="bg-[#0f1b2d] text-white" value="role">
                  Role
                </option>
                <option className="bg-[#0f1b2d] text-white" value="status">
                  Status
                </option>
              </select>
            </div>

          </div>
        </div>

        {/* Employees Table */}
        <div className="bg-card rounded-lg shadow-sm border border-theme overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-card border-b border-theme">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-[var(--accent-navyblue)] uppercase">
                    Image
                  </th>
                  <th
                    className="px-4 py-3 text-left text-xs font-medium text-[var(--accent-navyblue)] uppercase cursor-pointer hover:bg-[rgba(255,255,255,0.03)]"
                    onClick={() => handleSort('firstName')}
                  >
                    <div className="flex items-center gap-2">
                      First Name
                      {getSortIcon('firstName')}
                    </div>
                  </th>
                  <th
                    className="px-4 py-3 text-left text-xs font-medium text-[var(--accent-navyblue)] uppercase cursor-pointer hover:bg-[rgba(255,255,255,0.03)]"
                    onClick={() => handleSort('lastName')}
                  >
                    <div className="flex items-center gap-2">
                      Last Name
                      {getSortIcon('lastName')}
                    </div>
                  </th>
                  <th
                    className="px-4 py-3 text-left text-xs font-medium text-[var(--accent-navyblue)] uppercase cursor-pointer hover:bg-[rgba(255,255,255,0.03)]"
                    onClick={() => handleSort('email')}
                  >
                    <div className="flex items-center gap-2">
                      Email
                      {getSortIcon('email')}
                    </div>
                  </th>
                  <th
                    className="px-4 py-3 text-left text-xs font-medium text-[var(--accent-navyblue)] uppercase cursor-pointer hover:bg-[rgba(255,255,255,0.03)]"
                    onClick={() => handleSort('role')}
                  >
                    <div className="flex items-center gap-2">
                      Role
                      {getSortIcon('role')}
                    </div>
                  </th>
                  <th
                    className="px-4 py-3 text-left text-xs font-medium text-[var(--accent-navyblue)] uppercase cursor-pointer hover:bg-[rgba(255,255,255,0.03)]"
                    onClick={() => handleSort('status')}
                  >
                    <div className="flex items-center gap-2">
                      Status
                      {getSortIcon('status')}
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-[var(--accent-navyblue)] uppercase">
                    Created
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-[var(--accent-navyblue)] uppercase">
                    Updated
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-[var(--accent-navyblue)] uppercase print-hide">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-card divide-y divide-theme divide-white/5">
                {loading ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-secondary">
                      Loading...
                    </td>
                  </tr>
                ) : filteredEmployees.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-secondary">
                      No employees found
                    </td>
                  </tr>
                ) : (
                  filteredEmployees.map((employee, index) => (
                    <tr
                      key={employee._id || index}
                      className="hover:bg-[rgba(255,255,255,0.03)] transition-colors cursor-pointer"
                      onClick={() => {
                        if (employee._id) {
                          setEditingId(employee._id);
                          loadEmployeeForEdit(employee._id);
                          setShowNewEmployeeModal(true);
                        }
                      }}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center">
                          {employee.profileImageUrl || employee.profileImage ? (
                            <img
                              src={employee.profileImageUrl || employee.profileImage}
                              alt={`${employee.firstName || ''} ${employee.lastName || ''}`}
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
                            className={`w-10 h-10 rounded-full bg-card flex items-center justify-center border-2 border-theme ${employee.profileImageUrl || employee.profileImage ? 'hidden' : ''}`}
                          >
                            <User className="w-6 h-6 text-secondary" />
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-primary">{employee.firstName || '-'}</td>
                      <td className="px-4 py-3 text-sm text-primary">{employee.lastName || '-'}</td>
                      <td className="px-4 py-3 text-sm text-primary">{employee.email}</td>
                      <td className="px-4 py-3 text-sm text-primary">{getRoleDisplayName(employee.role)}</td>
                      <td className="px-4 py-3">
                        <span className={`px-3 py-1 rounded text-xs font-medium ${(employee.status === 'ACTIVE' || employee.status === 'active')
                          ? 'bg-[var(--accent-blue)]/10 text-[var(--accent-blue)]'
                          : 'bg-[var(--accent-red)]/10 text-[var(--accent-red)]'
                          }`}>
                          {employee.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-secondary">
                        {employee.createdAt ? new Date(employee.createdAt).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' }) : '—'}
                      </td>
                      <td className="px-4 py-3 text-sm text-secondary">
                        {employee.updatedAt ? new Date(employee.updatedAt).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' }) : '—'}
                      </td>
                      <td className="px-4 py-3 print-hide">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation(); // Prevent row click from triggering
                              if (employee._id) {
                                setEditingId(employee._id);
                                // Load employee data for editing
                                loadEmployeeForEdit(employee._id);
                                setShowNewEmployeeModal(true);
                              }
                            }}
                            className="p-2 text-accent hover:bg-[rgba(255,255,255,0.05)] rounded-lg transition-colors"
                            title="Edit Employee"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation(); // Prevent row click from triggering
                              if (employee._id) {
                                setDeleteConfirmation({
                                  show: true,
                                  employeeId: employee._id,
                                  employeeName: `${employee.firstName || ''} ${employee.lastName || ''}`.trim() || employee.email
                                });
                              }
                            }}
                            className="p-2 text-[var(--accent-purple)] hover:bg-[rgba(168,85,247,0.1)] rounded-lg transition-colors"
                            title="Delete Employee"
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

        {/* Non Signin Employees and Advanced Permissions use the same table */}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirmation.show && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-lg shadow-2xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-theme">
              <h3 className="text-xl font-bold text-primary">Delete Employee</h3>
            </div>
            <div className="p-6">
              <p className="text-primary mb-2">
                Are you sure you want to delete this employee?
              </p>
              <p className="text-primary font-semibold">
                {deleteConfirmation.employeeName}
              </p>
              <p className="text-sm text-[var(--accent-purple)] mt-4">
                This action cannot be undone.
              </p>
            </div>
            <div className="p-6 border-t border-theme flex items-center justify-end gap-3">
              <button
                onClick={() => setDeleteConfirmation({ show: false, employeeId: null, employeeName: '' })}
                className="px-6 py-2 border border-theme rounded-lg hover:bg-[rgba(255,255,255,0.03)] transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-6 py-2 bg-[var(--accent-red)] hover:bg-[var(--accent-red)] !text-white rounded-lg transition-colors font-medium"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Employee Modal */}
      {showNewEmployeeModal && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowNewEmployeeModal(false);
            }
          }}
        >
          <div
            className="bg-card rounded-lg shadow-2xl w-full max-w-6xl max-h-[90vh] flex overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Left Sidebar */}
            <div className="w-64 bg-card border-r border-theme flex flex-col">
              {/* Image Upload Area */}
              <div className="p-4 border-b border-theme">
                <div
                  className="border-2 border-dashed border-theme p-8 text-center mb-3 cursor-pointer hover:border-[var(--accent-navyblue)] transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {profileImagePreview ? (
                    <img src={profileImagePreview} alt="Profile preview" className="w-full h-32 object-cover rounded-lg" />
                  ) : (
                    <>
                      <Upload className="w-8 h-8 text-secondary mx-auto mb-2" />
                      <p className="text-sm text-secondary">Select Image</p>
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
                      // Validate file size (20MB max)
                      if (file.size > 20 * 1024 * 1024) {
                        alert('File size must be less than 20MB');
                        if (fileInputRef.current) {
                          fileInputRef.current.value = '';
                        }
                        return;
                      }
                      setProfileImage(file);
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
                  className="w-full bg-[var(--accent-navyblue)] !text-white py-2 font-medium hover:bg-[var(--accent-navyblue)]/80 transition-colors"
                >
                  {profileImage ? 'CHANGE IMAGE' : 'UPLOAD IMAGE'}
                </button>
              </div>

              {/* Navigation Tabs */}
              <div className="flex-1 overflow-y-auto p-4">
                <nav className="flex flex-col gap-2">
                  {[
                    { id: 'basic', label: 'Basic', icon: User },
                    { id: 'personal', label: 'Personal Information', icon: User },
                    { id: 'documents', label: 'Documents', icon: FileText },
                    { id: 'notes', label: 'Notes / Benefits', icon: FileText },
                    { id: 'deductions', label: 'Deductions', icon: FileText },
                    { id: 'additions', label: 'Additions', icon: FileText },
                    ...(editingId ? [{ id: 'timeline', label: 'Timeline', icon: MessageSquare }] : [])
                  ].map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeFormTab === tab.id;

                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveFormTab(tab.id as any)}
                        className={`w-full flex items-center gap-2 px-3 py-2 transition-colors text-left ${isActive
                          ? 'bg-[var(--accent-navyblue)]/10 text-[var(--accent-navyblue)] shadow-md'
                          : 'bg-card text-primary hover:bg-[rgba(255,255,255,0.05)]'
                          }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span className="font-medium text-center">{tab.label}</span>
                      </button>
                    );
                  })}
                </nav>
              </div>
            </div>

            {/* Right Content Area */}
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-theme bg-card">
                <h2 className="text-2xl font-bold text-primary">{editingId ? 'Edit Employee' : 'New Employee'}</h2>
                <div className="flex items-center gap-3">
                  <AutoSaveIndicator status={draftStatus} lastSavedAt={draftLastSavedAt} />
                  <button
                    onClick={handleSaveEmployee}
                    disabled={isSubmitting}
                    className="px-6 py-2 !text-white rounded-lg bg-[var(--accent-navyblue)] hover:bg-[var(--accent-navyblue)]/80 transition-colors font-medium disabled:opacity-50"
                  >
                    {isSubmitting ? 'SAVING...' : editingId ? 'UPDATE' : 'SAVE'}
                  </button>
                  <button
                    onClick={handleCloseModal}
                    className="text-secondary hover:text-secondary transition-colors"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>

              {/* Form Content */}
              <div className="flex-1 overflow-y-auto overflow-x-hidden p-6 bg-card">
                {draftPendingRestore && (
                  <DraftRestoreBanner
                    updatedAt={draftPendingRestore.updatedAt}
                    onRestore={handleRestoreEmployeeDraft}
                    onDiscard={discardEmployeeDraft}
                  />
                )}
                {activeFormTab === 'basic' && (
                  <div className="space-y-6 max-w-full">
                    <h3 className="text-lg font-bold text-primary mb-4">Basic Information</h3>

                    {/* First Row */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-primary mb-1">
                          First Name<span className="text-[var(--accent-red)]">*</span>
                        </label>
                        <input
                          type="text"
                          placeholder="First Name"
                          value={basicData.firstName}
                          onChange={(e) => { setBasicData({ ...basicData, firstName: e.target.value }); if (formErrors.firstName) setFormErrors({ ...formErrors, firstName: undefined }); }}
                          className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:border-transparent ${formErrors.firstName ? 'border-[var(--accent-red)] focus:ring-[var(--accent-red)]' : 'border-theme focus:ring-[var(--accent-navyblue)]'}`}
                        />
                        {formErrors.firstName && <p className="mt-1 text-xs text-[var(--accent-red)]">{formErrors.firstName}</p>}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-primary mb-1">
                          Last Name<span className="text-[var(--accent-red)]">*</span>
                        </label>
                        <input
                          type="text"
                          placeholder="Last Name"
                          value={basicData.lastName}
                          onChange={(e) => { setBasicData({ ...basicData, lastName: e.target.value }); if (formErrors.lastName) setFormErrors({ ...formErrors, lastName: undefined }); }}
                          className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:border-transparent ${formErrors.lastName ? 'border-[var(--accent-red)] focus:ring-[var(--accent-red)]' : 'border-theme focus:ring-[var(--accent-navyblue)]'}`}
                        />
                        {formErrors.lastName && <p className="mt-1 text-xs text-[var(--accent-red)]">{formErrors.lastName}</p>}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-primary mb-1">
                          Email<span className="text-[var(--accent-red)]">*</span>
                        </label>
                        <input
                          type="email"
                          placeholder="Email"
                          value={basicData.email}
                          onChange={(e) => { setBasicData({ ...basicData, email: e.target.value }); if (formErrors.email) setFormErrors({ ...formErrors, email: undefined }); }}
                          className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:border-transparent ${formErrors.email ? 'border-[var(--accent-red)] focus:ring-[var(--accent-red)]' : 'border-theme focus:ring-[var(--accent-navyblue)]'}`}
                        />
                        {formErrors.email && <p className="mt-1 text-xs text-[var(--accent-red)]">{formErrors.email}</p>}
                      </div>
                      {/* Only show password field for roles that require sign-in (mechanics need password) */}
                      {!['reporter', 'operator', 'salesperson'].includes(basicData.role) && (
                        <div>
                          <label className="block text-sm font-medium text-primary mb-1">
                            Password
                            {!editingId && <span className="text-xs text-secondary font-normal ml-1">(leave blank to send invite email)</span>}
                          </label>
                          {passwordIsExisting ? (
                            <div className="relative">
                              <input
                                type="password"
                                value="••••••••"
                                readOnly
                                onFocus={() => {
                                  setPasswordIsExisting(false);
                                  setBasicData({ ...basicData, password: '' });
                                }}
                                className="w-full px-3 py-2 pr-20 border border-theme rounded-lg bg-card cursor-text focus:outline-none focus:ring-2 focus:ring-[var(--accent-navyblue)] focus:border-transparent"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  setPasswordIsExisting(false);
                                  setBasicData({ ...basicData, password: '' });
                                }}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[var(--accent-navyblue)] hover:text-[var(--accent-navyblue)] font-medium"
                                tabIndex={-1}
                              >
                                Change
                              </button>
                            </div>
                          ) : (
                            <div className="relative">
                              <input
                                type={showPassword ? 'text' : 'password'}
                                placeholder="Enter new password"
                                value={basicData.password}
                                onChange={(e) => setBasicData({ ...basicData, password: e.target.value })}
                                className="w-full px-3 py-2 pr-10 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-navyblue)] focus:border-transparent"
                                autoFocus
                              />
                              <button
                                type="button"
                                onClick={() => setShowPassword(prev => !prev)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary hover:text-secondary"
                                tabIndex={-1}
                              >
                                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Second Row */}
                    <div className="grid grid-cols-4 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-primary mb-1">
                          Status<span className="text-[var(--accent-red)]">*</span>
                        </label>
                        <select
                          value={basicData.status}
                          onChange={(e) => setBasicData({ ...basicData, status: e.target.value })}
                          className="w-full px-3 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-navyblue)] focus:border-transparent"
                        >
                          <option className="form-option" value="">Select</option>
                          <option className="form-option" value="active">Active</option>
                          <option className="form-option" value="inactive">Inactive</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-primary mb-1">
                          Role<span className="text-[var(--accent-red)]">*</span>
                        </label>
                        <select
                          value={basicData.role}
                          onChange={(e) => setBasicData({ ...basicData, role: e.target.value })}
                          className="w-full px-3 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-navyblue)] focus:border-transparent"
                        >
                          <option className="form-option" value="">Select</option>
                          {roles.map((role) => (
                            <option className="form-option" key={role} value={role}>{role}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {activeFormTab === 'personal' && (
                  <div className="space-y-6 max-w-full">
                    <h3 className="text-lg font-bold text-primary mb-4">Personal Information</h3>

                    {/* First Row */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-primary mb-1">Title</label>
                        <input
                          type="text"
                          placeholder="Title"
                          value={personalData.title}
                          onChange={(e) => setPersonalData({ ...personalData, title: e.target.value })}
                          className="w-full px-3 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-navyblue)] focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-primary mb-1">Pay Type</label>
                        <select
                          value={personalData.payType}
                          onChange={(e) => setPersonalData({ ...personalData, payType: e.target.value })}
                          className="w-full px-3 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-navyblue)] focus:border-transparent"
                        >
                          <option className="form-option" value="">
                            Select
                          </option>
                          <option className="form-option" value="Hourly">
                            Hourly
                          </option>
                          <option className="form-option" value="Biweekly">
                            Biweekly
                          </option>
                          <option className="form-option" value="SemiMonthly">
                            Semi Monthly
                          </option>
                          <option className="form-option" value="Monthly">
                            Monthly
                          </option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-primary mb-1">
                          Pay Rate <span className="text-secondary text-xs font-normal">(per hour)</span>
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-secondary text-sm font-medium">$</span>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="0.00"
                            value={personalData.payRate}
                            onChange={(e) => {
                              const value = e.target.value;
                              // Allow empty, numbers, and one decimal point
                              if (value === '' || /^\d*\.?\d*$/.test(value)) {
                                setPersonalData({ ...personalData, payRate: value });
                              }
                            }}
                            className="w-full pl-7 pr-3 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-navyblue)] focus:border-transparent"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-primary mb-1">Vacation Pay %</label>
                        <input
                          type="text"
                          placeholder="Vacation Pay %"
                          value={personalData.vacationPay}
                          onChange={(e) => setPersonalData({ ...personalData, vacationPay: e.target.value })}
                          className="w-full px-3 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-navyblue)] focus:border-transparent"
                        />
                      </div>
                    </div>

                    {/* Second Row */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-primary mb-1">Department</label>
                        <select
                          value={personalData.department}
                          onChange={(e) => setPersonalData({ ...personalData, department: e.target.value })}
                          className="w-full px-3 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-navyblue)] focus:border-transparent"
                        >
                          <option className="form-option" value="">Select</option>
                          {departments.map((dept) => (
                            <option className="form-option" key={dept} value={dept}>{dept}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-primary mb-1">Employment Type</label>
                        <select
                          value={personalData.employmentType}
                          onChange={(e) => setPersonalData({ ...personalData, employmentType: e.target.value as 'FULL-TIME' | 'PART-TIME' | 'CONTRACT BASIS' })}
                          className="w-full px-3 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-navyblue)] focus:border-transparent"
                        >
                          <option className="form-option" value="FULL-TIME">Full-time</option>
                          <option className="form-option" value="PART-TIME">Part-time</option>
                          <option className="form-option" value="CONTRACT BASIS">Contract Basis</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-primary mb-1">Phone #</label>
                        <div className={`flex items-center border rounded-lg focus-within:ring-2 focus-within:border-transparent ${formErrors.phone ? 'border-[var(--accent-red)] focus-within:ring-[var(--accent-red)]' : 'border-theme focus-within:ring-[var(--accent-navyblue)]'}`}>
                          <div className="relative" ref={phoneCountryDropdownRef}>
                            <button
                              type="button"
                              onClick={() => {
                                setPhoneCountryDropdownOpen(!phoneCountryDropdownOpen);
                                if (!phoneCountryDropdownOpen) {
                                  setPhoneCountrySearch('');
                                }
                              }}
                              className="flex items-center gap-1.5 px-2 py-2 text-sm bg-card border-none outline-none cursor-pointer h-full"
                              style={{ minWidth: '85px' }}
                            >
                              {countries.find(c => c.code === phoneCountry) && (
                                <>
                                  <span className="text-sm" style={{ fontSize: '16px' }}>{countries.find(c => c.code === phoneCountry)?.flag}</span>
                                  <span className="text-xs text-secondary font-medium">{countries.find(c => c.code === phoneCountry)?.dialCode}</span>
                                </>
                              )}
                              <ChevronDown className="w-3 h-3 text-secondary ml-auto" />
                            </button>
                            {phoneCountryDropdownOpen && (
                              <div className="absolute top-full left-0 z-50 bg-card border border-theme rounded-lg shadow-lg mt-1" style={{ minWidth: '280px', maxWidth: '320px' }}>
                                {/* Search Input */}
                                <div className="p-2 border-b border-theme sticky top-0 bg-card">
                                  <input
                                    type="text"
                                    placeholder="Search country..."
                                    value={phoneCountrySearch}
                                    onChange={(e) => setPhoneCountrySearch(e.target.value)}
                                    onClick={(e) => e.stopPropagation()}
                                    className="w-full px-3 py-1.5 text-xs border border-theme rounded focus:outline-none focus:ring-2 focus:ring-[var(--accent-navyblue)] focus:border-transparent"
                                  />
                                </div>
                                {/* Countries List */}
                                <div className="max-h-60 overflow-y-auto">
                                  {countries
                                    .filter((country) => {
                                      const searchLower = phoneCountrySearch.toLowerCase();
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
                                          setPhoneCountry(country.code);
                                          setPhoneCountryDropdownOpen(false);
                                          setPhoneCountrySearch('');
                                          // Don't auto-fill dial code - let user type the number without country code
                                          // The dial code will be prepended when saving
                                        }}
                                        className={`w-full flex items-center gap-2 px-3 py-2 text-xs text-left hover:bg-[rgba(255,255,255,0.03)] transition-colors ${phoneCountry === country.code ? 'bg-card' : ''
                                          }`}
                                      >
                                        <span className="text-base" style={{ fontSize: '18px' }}>{country.flag}</span>
                                        <span className="flex-1 truncate">{country.name}</span>
                                        <span className="text-secondary font-medium">{country.dialCode}</span>
                                      </button>
                                    ))}
                                  {countries.filter((country) => {
                                    const searchLower = phoneCountrySearch.toLowerCase();
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
                          <div className="h-6 w-px bg-[rgba(255,255,255,0.15)]"></div>
                          <input
                            type="tel"
                            placeholder=""
                            value={personalData.phone}
                            onChange={(e) => {
                              const value = e.target.value.replace(/\D/g, '');
                              setPersonalData({ ...personalData, phone: value });
                              if (formErrors.phone) setFormErrors({ ...formErrors, phone: undefined });
                            }}
                            className="flex-1 px-3 py-2 text-sm border-none outline-none focus:outline-none"
                          />
                        </div>
                        {formErrors.phone && <p className="mt-1 text-xs text-[var(--accent-red)]">{formErrors.phone}</p>}
                      </div>
                    </div>

                    {/* Third Row - Address Fields */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      <div>
                        <AddressSearch
                          label="Search Address"
                          placeholder="Search For An Address..."
                          onAddressSelect={(addressData) => {
                            // Find matching country by name or code
                            let countryName = '';
                            if (addressData.country) {
                              const countryFromAddress = countries.find(
                                c => c.name.toLowerCase() === addressData.country.toLowerCase() ||
                                  c.code.toLowerCase() === addressData.country.toLowerCase()
                              );
                              countryName = countryFromAddress ? countryFromAddress.name : addressData.country;
                            }

                            // Populate address fields
                            setPersonalData({
                              ...personalData,
                              address: addressData.fullAddress || addressData.address || '',
                              searchAddress: addressData.fullAddress || '',
                              country: countryName,
                              stateProvince: addressData.state || ''
                            });
                          }}
                          className=""
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-primary mb-1">Address</label>
                        <input
                          type="text"
                          placeholder="Address"
                          value={personalData.address}
                          onChange={(e) => setPersonalData({ ...personalData, address: e.target.value })}
                          className="w-full px-3 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-navyblue)] focus:border-transparent"
                        />
                      </div>
                    </div>

                    {/* Country and Province Row */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-primary mb-1">
                          Country<span className="text-[var(--accent-red)]">*</span>
                        </label>
                        <select
                          value={(() => {
                            // Find country by name (personalData.country stores the name)
                            const foundCountry = countries.find(c => c.name === personalData.country);
                            return foundCountry ? foundCountry.code : '';
                          })()}
                          onChange={(e) => {
                            const selectedCountry = countries.find(c => c.code === e.target.value);
                            setPersonalData({
                              ...personalData,
                              country: selectedCountry ? selectedCountry.name : '',
                              stateProvince: ''
                            });
                          }}
                          className="w-full px-3 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-navyblue)] focus:border-transparent"
                        >
                          <option className="form-option" value="">Select Country</option>
                          {countries.map((country) => (
                            <option className="form-option" key={country.code} value={country.code}>
                              {country.flag} {country.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-primary mb-1">
                          Province/State<span className="text-[var(--accent-red)]">*</span>
                        </label>
                        <input
                          type="text"
                          value={personalData.stateProvince}
                          onChange={(e) => setPersonalData({ ...personalData, stateProvince: e.target.value })}
                          disabled={!personalData.country}
                          placeholder={personalData.country ? "Enter Province/State" : "Select country first"}
                          className="w-full px-3 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-navyblue)] focus:border-transparent disabled:bg-card disabled:cursor-not-allowed"
                        />
                      </div>
                    </div>

                    {/* Fourth Row - Date Fields */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-primary mb-1">Date of Birth</label>
                        <input
                          type="date"
                          value={personalData.dateOfBirth}
                          onChange={(e) => setPersonalData({ ...personalData, dateOfBirth: e.target.value })}
                          className="w-full px-3 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-navyblue)] focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-primary mb-1">Hire Date</label>
                        <input
                          type="date"
                          value={personalData.hireDate}
                          onChange={(e) => setPersonalData({ ...personalData, hireDate: e.target.value })}
                          className="w-full px-3 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-navyblue)] focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-primary mb-1">Employment Termination Date</label>
                        <input
                          type="date"
                          value={personalData.terminationDate}
                          onChange={(e) => setPersonalData({ ...personalData, terminationDate: e.target.value })}
                          className="w-full px-3 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-navyblue)] focus:border-transparent"
                        />
                      </div>
                    </div>

                    {/* Fifth Row - SIN Number */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-primary mb-1">
                          SIN Number<span className="text-[var(--accent-red)]">*</span>
                        </label>
                        <input
                          type="text"
                          placeholder="SIN Number"
                          value={personalData.sinNo}
                          onChange={(e) => { setPersonalData({ ...personalData, sinNo: e.target.value }); if (formErrors.sinNo) setFormErrors({ ...formErrors, sinNo: undefined }); }}
                          className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:border-transparent ${formErrors.sinNo ? 'border-[var(--accent-red)] focus:ring-[var(--accent-red)]' : 'border-theme focus:ring-[var(--accent-navyblue)]'}`}
                          required
                        />
                        {formErrors.sinNo && <p className="mt-1 text-xs text-[var(--accent-red)]">{formErrors.sinNo}</p>}
                      </div>
                    </div>

                  </div>
                )}

                {activeFormTab === 'documents' && (
                  <div className="space-y-6 max-w-full">
                    <h3 className="text-lg font-bold text-primary mb-4">Documents</h3>

                    {/* Document Input Row */}
                    <div className="border border-theme rounded-lg overflow-x-auto">
                      <table className="w-full table-fixed">
                        <thead className="bg-card border-b border-theme">
                          <tr>
                            <th className="w-[200px] px-4 py-3 text-left text-xs font-medium text-[var(--accent-navyblue)] uppercase">EXPIRY DATE</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-[var(--accent-navyblue)] uppercase">DESCRIPTION</th>
                            <th className="w-[200px] px-4 py-3 text-left text-xs font-medium text-[var(--accent-navyblue)] uppercase">SELECT FILE</th>
                            <th className="w-[180px] px-4 py-3 text-left text-xs font-medium text-[var(--accent-navyblue)] uppercase">IGNORE EXPIRATION</th>
                            <th className="w-[80px] px-4 py-3 text-left text-xs font-medium text-[var(--accent-navyblue)] uppercase"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {/* Input Row */}
                          <tr className="bg-card border-b border-theme">
                            <td className="px-4 py-3">
                              <input
                                type="date"
                                value={newDocument.expiryDate}
                                onChange={(e) => setNewDocument({ ...newDocument, expiryDate: e.target.value })}
                                className="w-full px-3 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-navyblue)] focus:border-transparent text-sm"
                              />
                            </td>
                            <td className="px-4 py-3">
                              <input
                                type="text"
                                placeholder="Description"
                                value={newDocument.description}
                                onChange={(e) => setNewDocument({ ...newDocument, description: e.target.value })}
                                className="w-full px-3 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-navyblue)] focus:border-transparent text-sm"
                              />
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex flex-col gap-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    const input = document.createElement('input');
                                    input.type = 'file';
                                    input.onchange = (e) => {
                                      const file = (e.target as HTMLInputElement).files?.[0];
                                      if (file) setNewDocument({ ...newDocument, file });
                                    };
                                    input.click();
                                  }}
                                  className="w-full px-3 py-2 border border-theme rounded-lg hover:bg-[rgba(255,255,255,0.03)] transition-colors flex items-center justify-center gap-2 text-sm"
                                >
                                  <Upload className="w-4 h-4" />
                                  Select File
                                </button>

                                {/* Show selected file name */}
                                {newDocument?.file && (
                                  <span className="text-xs text-secondary truncate" title={newDocument.file.name}>
                                    {newDocument.file.name}
                                  </span>
                                )}
                              </div>
                            </td>

                            <td className="px-4 py-3">
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={newDocument.ignoreExpiration}
                                  onChange={(e) => setNewDocument({ ...newDocument, ignoreExpiration: e.target.checked })}
                                  className="w-4 h-4 text-[var(--accent-navyblue)] border-theme rounded focus:ring-[var(--accent-navyblue)]"
                                />
                                <span className="text-sm text-primary">Ignore Expiration</span>
                              </label>
                            </td>
                            <td className="px-4 py-3">
                              <button
                                type="button"
                                onClick={() => {
                                  if (newDocument.expiryDate || newDocument.description || newDocument.file) {
                                    setDocuments([...documents, {
                                      id: Date.now().toString(),
                                      ...newDocument
                                    }]);
                                    setNewDocument({
                                      expiryDate: '',
                                      description: '',
                                      file: null,
                                      ignoreExpiration: false
                                    });
                                  }
                                }}
                                className="w-10 h-10 bg-card border border-theme text-primary rounded-lg flex items-center justify-center hover:bg-[rgba(255,255,255,0.05)] transition-colors"
                              >
                                <Plus className="w-5 h-5" />
                              </button>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    {/* Documents Table */}
                    {documents.length > 0 && (
                      <div className="border border-theme rounded-lg overflow-x-auto">
                        <table className="w-full table-fixed">
                          <thead className="bg-card border-b border-theme">
                            <tr>
                              <th className="w-[200px] px-4 py-3 text-left text-xs font-medium text-[var(--accent-navyblue)] uppercase">EXPIRY DATE</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-[var(--accent-navyblue)] uppercase">DESCRIPTION</th>
                              <th className="w-[200px] px-4 py-3 text-left text-xs font-medium text-[var(--accent-navyblue)] uppercase">FILE</th>
                              <th className="w-[180px] px-4 py-3 text-left text-xs font-medium text-[var(--accent-navyblue)] uppercase">IGNORE EXPIRATION</th>
                              <th className="w-[120px] px-4 py-3 text-left text-xs font-medium text-[var(--accent-navyblue)] uppercase">ACTIONS</th>
                            </tr>
                          </thead>
                          <tbody className="bg-card divide-y divide-theme">
                            {documents.map((doc) => (
                              <tr key={doc.id} className="hover:bg-[rgba(255,255,255,0.03)]">
                                <td className="px-4 py-3">
                                  {editingDocumentId === doc.id && editingDocument ? (
                                    <input
                                      type="date"
                                      value={editingDocument.expiryDate}
                                      onChange={(e) => setEditingDocument({ ...editingDocument, expiryDate: e.target.value })}
                                      className="w-full px-2 py-1 text-sm border border-theme rounded focus:outline-none focus:ring-1 focus:ring-[var(--accent-navyblue)]"
                                    />
                                  ) : (
                                    <span className="text-sm text-primary">{doc.expiryDate || '-'}</span>
                                  )}
                                </td>
                                <td className="px-4 py-3">
                                  {editingDocumentId === doc.id && editingDocument ? (
                                    <input
                                      type="text"
                                      value={editingDocument.description}
                                      onChange={(e) => setEditingDocument({ ...editingDocument, description: e.target.value })}
                                      placeholder="Description"
                                      className="w-full px-2 py-1 text-sm border border-theme rounded focus:outline-none focus:ring-1 focus:ring-[var(--accent-navyblue)]"
                                    />
                                  ) : (
                                    <span className="text-sm text-primary">{doc.description || doc.documentType || '-'}</span>
                                  )}
                                </td>
                                <td className="px-4 py-3">
                                  {editingDocumentId === doc.id && editingDocument ? (
                                    <div className="flex flex-col gap-2">
                                      {doc.isExisting && doc.fileUrl && (
                                        <a
                                          href={doc.fileUrl}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-accent hover:underline text-xs"
                                        >
                                          Current: {doc.fileName || 'View File'}
                                        </a>
                                      )}
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const input = document.createElement('input');
                                          input.type = 'file';
                                          input.onchange = (e) => {
                                            const file = (e.target as HTMLInputElement).files?.[0];
                                            if (file) setEditingDocument({ ...editingDocument, file });
                                          };
                                          input.click();
                                        }}
                                        className="px-2 py-1 text-xs border border-theme rounded hover:bg-[rgba(255,255,255,0.03)] transition-colors flex items-center gap-1 w-fit"
                                      >
                                        <Upload className="w-3 h-3" />
                                        {editingDocument.file ? editingDocument.file.name : 'Change File'}
                                      </button>
                                    </div>
                                  ) : (
                                    <>
                                      {doc.isExisting && doc.fileUrl ? (
                                        <a
                                          href={doc.fileUrl}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-accent hover:underline text-sm"
                                        >
                                          {doc.fileName || 'View File'}
                                        </a>
                                      ) : doc.file ? (
                                        <span className="text-sm text-secondary">{doc.file.name}</span>
                                      ) : (
                                        <span className="text-sm text-secondary">-</span>
                                      )}
                                    </>
                                  )}
                                </td>
                                <td className="px-4 py-3">
                                  {editingDocumentId === doc.id && editingDocument ? (
                                    <label className="flex items-center gap-2 cursor-pointer">
                                      <input
                                        type="checkbox"
                                        checked={editingDocument.ignoreExpiration}
                                        onChange={(e) => setEditingDocument({ ...editingDocument, ignoreExpiration: e.target.checked })}
                                        className="w-4 h-4 text-[var(--accent-navyblue)] border-theme rounded focus:ring-[var(--accent-navyblue)]"
                                      />
                                      <span className="text-xs text-primary">Ignore</span>
                                    </label>
                                  ) : (
                                    <span className="text-sm text-primary">{doc.ignoreExpiration ? 'Yes' : 'No'}</span>
                                  )}
                                </td>
                                <td className="px-4 py-3">
                                  {editingDocumentId === doc.id ? (
                                    <div className="flex items-center gap-2">
                                      <button
                                        type="button"
                                        onClick={async () => {
                                          if (!doc._id || !editingDocument) return;
                                          try {
                                            const docFormData = new FormData();
                                            if (editingDocument.expiryDate) docFormData.append('expiryDate', editingDocument.expiryDate);
                                            if (editingDocument.description) docFormData.append('description', editingDocument.description);
                                            docFormData.append('ignoreExpiration', editingDocument.ignoreExpiration ? 'true' : 'false');
                                            if (editingDocument.file) docFormData.append('documentFile', editingDocument.file);

                                            const response = await updateEmployeeDocument(doc._id, docFormData);
                                            if (response?.success) {
                                              // Reload documents
                                              if (editingId) {
                                                const documentsResponse = await getDocumentsByEmployee(editingId);
                                                if (documentsResponse?.success && documentsResponse.data) {
                                                  const existingDocs = documentsResponse.data.map((d: any) => ({
                                                    id: d._id || Date.now().toString(),
                                                    _id: d._id,
                                                    expiryDate: d.expiryDate ? new Date(d.expiryDate).toISOString().split('T')[0] : '',
                                                    description: d.description || d.documentType || '',
                                                    file: null,
                                                    fileUrl: d.fileUrl,
                                                    fileName: d.fileName,
                                                    ignoreExpiration: d.ignoreExpiration || false,
                                                    documentType: d.documentType,
                                                    isExisting: true
                                                  }));
                                                  setDocuments(existingDocs);
                                                }
                                              }
                                              setEditingDocumentId(null);
                                              setEditingDocument(null);
                                              alert('Document updated successfully!');
                                            }
                                          } catch (error: any) {
                                            console.error('Error updating document:', error);
                                            alert(error.response?.data?.message || 'Failed to update document');
                                          }
                                        }}
                                        className="p-1.5 text-[var(--accent-navyblue)] hover:bg-[var(--accent-navyblue)]/10 rounded transition-colors"
                                        title="Save"
                                      >
                                        <Save className="w-4 h-4" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setEditingDocumentId(null);
                                          setEditingDocument(null);
                                        }}
                                        className="p-1.5 text-secondary hover:bg-[rgba(255,255,255,0.03)] rounded transition-colors"
                                        title="Cancel"
                                      >
                                        <X className="w-4 h-4" />
                                      </button>
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-2">
                                      {doc.isExisting && (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setEditingDocumentId(doc.id);
                                            setEditingDocument({
                                              expiryDate: doc.expiryDate || '',
                                              description: doc.description || '',
                                              ignoreExpiration: doc.ignoreExpiration || false,
                                              file: null
                                            });
                                          }}
                                          className="p-1.5 text-accent hover:bg-[rgba(255,255,255,0.05)] rounded transition-colors"
                                          title="Edit Document"
                                        >
                                          <Edit className="w-4 h-4" />
                                        </button>
                                      )}
                                      <button
                                        type="button"
                                        onClick={async () => {
                                          if (!doc._id) {
                                            // New document, just remove from list
                                            setDocuments(documents.filter(d => d.id !== doc.id));
                                            return;
                                          }

                                          if (window.confirm('Are you sure you want to delete this document?')) {
                                            try {
                                              const response = await deleteEmployeeDocument(doc._id);
                                              if (response?.success) {
                                                // Remove from list
                                                setDocuments(documents.filter(d => d.id !== doc.id));
                                                alert('Document deleted successfully!');
                                              } else {
                                                alert(response?.message || 'Failed to delete document');
                                              }
                                            } catch (error: any) {
                                              console.error('Error deleting document:', error);
                                              alert(error.response?.data?.message || 'Failed to delete document');
                                            }
                                          }
                                        }}
                                        className="p-1.5 text-[var(--accent-purple)] hover:bg-[rgba(168,85,247,0.1)] rounded transition-colors"
                                        title="Delete Document"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    </div>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {documents.length === 0 && (
                      <div className="border border-theme rounded-lg p-12 text-center bg-card">
                        <FileText className="w-12 h-12 text-secondary mx-auto mb-3" />
                        <p className="text-secondary font-medium">No Documents Added</p>
                        <p className="text-sm text-secondary mt-1">Add documents using the form above</p>
                      </div>
                    )}

                  </div>
                )}

                {activeFormTab === 'notes' && (
                  <div className="space-y-6 max-w-full">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-bold text-primary">Notes / Benefits</h3>
                    </div>

                    <textarea
                      value={notesBenefits}
                      onChange={(e) => setNotesBenefits(e.target.value)}
                      placeholder="Enter notes and benefits information..."
                      rows={15}
                      className="w-full px-4 py-3 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-navyblue)] focus:border-transparent resize-none"
                    />

                  </div>
                )}

                {activeFormTab === 'deductions' && (
                  <div className="space-y-6">
                    <h3 className="text-lg font-bold text-primary mb-4">Payroll Deductions</h3>

                    {/* Deductions Input Row */}
                    <div className="flex items-center gap-3 p-4 bg-card rounded-lg">
                      <div className="flex-1">
                        <label className="block text-sm font-medium text-primary mb-1">Start Date</label>
                        <div className="relative">
                          <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-secondary" />
                          <input
                            type="date"
                            value={newDeduction.startDate}
                            onChange={(e) => setNewDeduction({ ...newDeduction, startDate: e.target.value })}
                            className="w-full pl-10 pr-3 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-navyblue)] focus:border-transparent"
                          />
                        </div>
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
                          className="w-10 h-10 bg-[var(--accent-navyblue)] !text-white rounded-lg flex items-center justify-center hover:bg-[var(--accent-navyblue)]/80 transition-colors"
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
                            <th className="px-4 py-3 text-left text-xs font-medium text-[var(--accent-navyblue)] uppercase">Start Date</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-[var(--accent-navyblue)] uppercase">Description</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-[var(--accent-navyblue)] uppercase">Amount</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-[var(--accent-navyblue)] uppercase">Interval</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-[var(--accent-navyblue)] uppercase">ACTIONS</th>
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
                                      className="p-1.5 text-accent hover:bg-[rgba(255,255,255,0.05)] rounded transition-colors"
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
                                                // Notification would be handled by parent component
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
                                          }
                                        }
                                      }}
                                      className="p-1.5 text-[var(--accent-purple)] hover:bg-[rgba(168,85,247,0.1)] rounded transition-colors"
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
                        <label className="block text-sm font-medium text-primary mb-1">Start Date</label>
                        <div className="relative">
                          <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-secondary" />
                          <input
                            type="date"
                            value={newAddition.startDate}
                            onChange={(e) => setNewAddition({ ...newAddition, startDate: e.target.value })}
                            className="w-full pl-10 pr-3 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-navyblue)] focus:border-transparent"
                          />
                        </div>
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
                          className="w-10 h-10 bg-[var(--accent-navyblue)] !text-white rounded-lg flex items-center justify-center hover:bg-[var(--accent-navyblue)]/80 transition-colors"
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
                            <th className="px-4 py-3 text-left text-xs font-medium text-[var(--accent-navyblue)] uppercase">Start Date</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-[var(--accent-navyblue)] uppercase">Description</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-[var(--accent-navyblue)] uppercase">Amount</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-[var(--accent-navyblue)] uppercase">Interval</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-[var(--accent-navyblue)] uppercase">ACTIONS</th>
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
                                      className="p-1.5 text-accent hover:bg-[rgba(255,255,255,0.05)] rounded transition-colors"
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
                                                // Notification would be handled by parent component
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
                                          }
                                        }
                                      }}
                                      className="p-1.5 text-[var(--accent-purple)] hover:bg-[rgba(168,85,247,0.1)] rounded transition-colors"
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

                {activeFormTab === 'timeline' && editingId && (
                  <TimelineNotes entityType="employees" entityId={editingId} />
                )}

              </div>

              {/* Tab Navigation Footer - fixed at bottom of modal */}
              {(() => {
                const FORM_TABS = [
                  { id: 'basic', label: 'Basic' },
                  { id: 'personal', label: 'Personal Information' },
                  { id: 'documents', label: 'Documents' },
                  { id: 'notes', label: 'Notes / Benefits' },
                  { id: 'deductions', label: 'Deductions' },
                  { id: 'additions', label: 'Additions' },
                  ...(editingId ? [{ id: 'timeline', label: 'Timeline' }] : []),
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
    </div>
  );
};

export default EmployeesPage;
