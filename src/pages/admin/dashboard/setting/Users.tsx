import React, { useState, useEffect, useRef } from 'react';
import type { CSSProperties } from 'react';
import { FaCheckCircle, FaExclamationCircle, FaInfoCircle, FaTimes } from 'react-icons/fa';
import {
  Search,
  Filter,
  Edit,
  Trash2,
  Plus,
  X,
  User,
  Mail,
  AlertCircle,
  Eye,
  EyeOff,
  FileText,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Save,
  Download,
  RefreshCw
} from 'lucide-react';
import {
  getAllEmployees,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  updateEmployeeStatus
} from '../../../../axios/api/employee';
import {
  getAllCustomers,
  createCustomer,
  updateCustomer,
  deleteCustomer
} from '../../../../axios/api/customer';
import {
  getAllContacts,
  createContact,
  updateContact,
  deleteContact
} from '../../../../axios/api/contact';
import {
  createEmployeeDocument,
  updateEmployeeDocument,
  getDocumentsByEmployee,
  getSignedEmployeeDocumentUrl,
  type EmployeeDocument
} from '../../../../axios/api/employeeDocument';
import { FLEET_COLORS } from '../../fleetMaintenance/colorUtils';

const ACCENT_PRIMARY = FLEET_COLORS.primary;
const ACCENT_DARK = FLEET_COLORS.dark;
const ACCENT_GRADIENT = 'linear-gradient(90deg, var(--accent-blue) 0%, var(--accent-blue) 40%, rgba(0,209,255,0.15) 100%)';
const ACCENT_VARS = {
  '--accent-color': ACCENT_PRIMARY,
  '--accent-dark': ACCENT_DARK
} as CSSProperties & { '--accent-color': string; '--accent-dark': string };
const focusRingStyle = {
  '--tw-ring-color': ACCENT_PRIMARY
} as CSSProperties & { '--tw-ring-color': string };

interface Employee {
  _id: string;
  name: string;
  email: string;
  phone: string;
  country: string;
  role: string;
  status: 'active' | 'inactive';
  joinDate: string;
  internalId: string;
  location: {
    address: string;
    latitude: string;
    longitude: string;
  };
  state: string;
  city: string;
  policies: string;
  createdAt: string;
  updatedAt: string;
  documents?: EmployeeDocument[];
  details?: {
    incorporation?: string;
    employeeCode?: string;
    postalCode?: string;
    fleet?: string;
    citizenship?: string;
    paymentMethod?: string;
    account?: string;
    wsib?: boolean;
    wsibAccountNo?: string;
    expiryDate?: string | Date;
    remark?: string;
    gstNo?: string;
    profileImage?: string;
    companyFlag?: boolean;
    cell1?: string;
    cell2?: string;
    extension?: string;
    fax?: string;
    gender?: string;
    dateOfBirth?: string | Date;
    hireDate?: string | Date;
    termDate?: string | Date;
    csa?: boolean;
    fastCardNo?: string;
    fastCardExpiry?: string | Date;
    medicalRequired?: boolean;
    defaultChargeName?: string;
    defaultCurrency?: string;
    chargesAppliedOn?: string;
    defaultMode?: string;
    defaultAmount?: number;
    defaultRemarks?: string;
    defaultPayrollType?: string;
    paymentCurrency?: string;
    mileRate?: number;
    mileRateTeam?: number;
    emptyMileRate?: number;
    emptyMileRateTeam?: number;
    hourlyRate?: number;
    weightRate?: number;
    percentageRate?: number;
    localTaxNo?: string;
    federalTaxNo?: string;
    sinNo?: string;
    craAccountNo?: string;
    fedTaxExempt?: boolean;
    provTaxExempt?: boolean;
    cppQppExempt?: boolean;
    eiExempt?: boolean;
    qpipExempt?: boolean;
    payPeriod?: string;
    vacationPay?: string;
    ltl?: boolean;
    onSettlements?: boolean;
    settlementCurrencyByOrder?: boolean;
    isDefault?: boolean;
  };
}

interface EmployeeDocumentForm {
  documentType: string;
  documentNumber: string;
  issueDate: string;
  expiryDate: string;
  description: string;
  status: string;
  file: File | null;
  _id?: string; // For existing documents
}

type NotificationType = 'success' | 'error' | 'info';

interface Notification {
  id: number;
  type: NotificationType;
  message: string;
}

// Notification Component
const Notification = ({ notification, onClose }: { notification: Notification; onClose: (id: number) => void }) => {
  const icons = {
    success: <FaCheckCircle className="text-green-500" size={24} />,
    error: <FaExclamationCircle className="text-red-500" size={24} />,
    info: <FaInfoCircle style={{ color: ACCENT_PRIMARY }} size={24} />
  };

  const bgColors = {
    success: 'bg-green-50 border-green-200',
    error: 'bg-card border-red-200',
    info: ''
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      onClose(notification.id);
    }, 5000);
    return () => clearTimeout(timer);
  }, [notification.id, onClose]);

  const infoStyle =
    notification.type === 'info'
      ? {
        backgroundColor: 'rgba(1, 106, 178, 0.08)',
        borderColor: 'rgba(1, 106, 178, 0.3)'
      }
      : undefined;

  return (
    <div
      className={`flex items-start gap-3 p-4 rounded-lg border-2 shadow-lg ${bgColors[notification.type]} animate-slide-in`}
      style={infoStyle}
    >
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

const EmployeesPage = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [showFilterPanel, setShowFilterPanel] = useState(false);

  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showPassword, setShowPassword] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ show: boolean; employeeId: string | null }>({
    show: false,
    employeeId: null
  });

  // Tab state - Employees, Contacts, Customers
  const [activeTab, setActiveTab] = useState<'employees' | 'contacts' | 'customers'>('employees');
  const [contacts, setContacts] = useState<Employee[]>([]);
  const [customers, setCustomers] = useState<Employee[]>([]);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalEmployees, setTotalEmployees] = useState(0);
  const [totalContacts, setTotalContacts] = useState(0);
  const [totalCustomers, setTotalCustomers] = useState(0);
  const [itemsPerPage,] = useState(10); // Show 10 users per page

  // Two-step flow state
  const [currentStep, setCurrentStep] = useState<1 | 2>(1);
  const [employeeDocuments, setEmployeeDocuments] = useState<EmployeeDocumentForm[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Table and document display state
  const [selectedEmployeeDetails, setSelectedEmployeeDetails] = useState<Employee | null>(null);
  const [showEmployeeDetails, setShowEmployeeDetails] = useState(false);
  const topScrollRef = useRef<HTMLDivElement>(null);
  const bottomScrollRef = useRef<HTMLDivElement>(null);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    country: '',
    role: '',
    state: '',
    city: '',
    address: '',
    joinDate: '',
    internalId: '',
    policies: '',
    password: ''
  });

  // Available roles - includes employee roles, contact, and customer
  const roles = [
    'dispatcher', 'hr', 'reporter',
    'Fleet Maintenance Manager', 'Compliance Manager', 'Maintenance Crew (Mechanics)', 'safety officer',
    'accountant',
    'contact', 'customer'
  ];

  // Roles that require login access (ID, username, password)
  const rolesWithLoginAccess = ['dispatcher', 'hr', 'Fleet Maintenance Manager', 'Compliance Manager', 'safety officer', 'accountant'];

  // Role display mapping
  const getRoleDisplayName = (role: string) => {
    if (!role) return 'N/A';
    if (role === 'Compliance Manager') {
      return 'Compliance Manager/Safety Manager';
    }
    if (role === 'safety officer') {
      return 'Safety Officer';
    }
    if (role === 'accountant') {
      return 'Accountant';
    }
    if (role === 'contact') {
      return 'Contact';
    }
    if (role === 'customer') {
      return 'Customer';
    }
    return role.charAt(0).toUpperCase() + role.slice(1);
  };

  // Roles without login access (only basic information)
  const rolesWithoutLoginAccess = ['reporter', 'Maintenance Crew (Mechanics)'];

  // Employee document types
  const EMPLOYEE_DOCUMENT_TYPES = [
    'Employment Contract',
    'ID Document',
    'Passport',
    'Work Permit',
    'Background Check',
    'Drug Test',
    'Training Certificate',
    'Insurance Policy',
    'Company Policy',
    'Performance Review',
    'Payroll Document',
    'Tax Document',
    'Emergency Contact',
    'Medical Certificate',
    'Driving Licence',
    'Travel Document',
    'Other'
  ];

  // Reset to page 1 when search or filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedStatus, activeTab]);

  // Fetch data based on active tab
  useEffect(() => {
    if (activeTab === 'employees') {
      fetchEmployees();
    } else if (activeTab === 'contacts') {
      fetchContacts();
    } else if (activeTab === 'customers') {
      fetchCustomers();
    }
    if (editingEmployee) {
      fetchEmployeeDocuments();
    }
  }, [currentPage, searchQuery, selectedStatus, activeTab]); // Removed selectedRole from dependencies

  useEffect(() => {
    if (editingEmployee) {
      fetchEmployeeDocuments();
    }
  }, [editingEmployee]);

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
  }, [employees, loading]);

  const addNotification = (type: NotificationType, message: string) => {
    const id = Date.now();
    setNotifications(prev => [...prev, { id, type, message }]);
  };

  const removeNotification = (id: number) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      // No role filtering - show all users
      // Don't pass role filter to backend - we want all users
      const response = await getAllEmployees(currentPage, itemsPerPage, searchQuery, undefined, selectedStatus || undefined);
      if (response.success) {
        // Backend already filters out admin, superadmin, driver, contact, and customer
        const employeeData = response.data || [];

        // Update pagination state using backend's pagination data
        if (response.pagination) {
          setTotalPages(response.pagination.totalPages || 1);
          setTotalEmployees(response.pagination.totalEmployees || 0);
        } else {
          // Fallback if backend doesn't provide pagination
          setTotalPages(Math.ceil(employeeData.length / itemsPerPage) || 1);
          setTotalEmployees(employeeData.length);
        }

        console.log('📊 Pagination:', {
          currentPage,
          totalPages: response.pagination?.totalPages,
          totalEmployees: response.pagination?.totalEmployees,
          employeesOnPage: employeeData.length
        });

        // Fetch documents for each employee
        const employeesWithDocs = await Promise.all(
          employeeData.map(async (employee: Employee) => {
            try {
              const docsResponse = await getDocumentsByEmployee(employee._id);
              if (docsResponse.success && Array.isArray(docsResponse.data)) {
                return { ...employee, documents: docsResponse.data };
              }
            } catch (err) {
              console.error(`Error fetching documents for employee ${employee._id}:`, err);
            }
            return { ...employee, documents: [] };
          })
        );

        setEmployees(employeesWithDocs);
      } else {
        addNotification('error', response?.message || 'Failed to fetch employees');
      }
    } catch (error: any) {
      console.error('Error fetching employees:', error);
      addNotification('error', error?.message || 'Failed to fetch employees');
    } finally {
      setLoading(false);
    }
  };

  const fetchContacts = async () => {
    try {
      setLoading(true);
      const response = await getAllContacts(currentPage, itemsPerPage, searchQuery, selectedStatus || undefined);
      if (response.success) {
        // Update pagination state
        if (response.pagination) {
          setTotalPages(response.pagination.totalPages || 1);
          setTotalContacts(response.pagination.totalEmployees || 0);
        }

        // Fetch documents for each contact
        const contactsWithDocs = await Promise.all(
          (response.data || []).map(async (contact: Employee) => {
            try {
              const docsResponse = await getDocumentsByEmployee(contact._id);
              if (docsResponse.success && Array.isArray(docsResponse.data)) {
                return { ...contact, documents: docsResponse.data };
              }
            } catch (err) {
              console.error(`Error fetching documents for contact ${contact._id}:`, err);
            }
            return { ...contact, documents: [] };
          })
        );

        setContacts(contactsWithDocs);
      } else {
        addNotification('error', response?.message || 'Failed to fetch contacts');
      }
    } catch (error: any) {
      console.error('Error fetching contacts:', error);
      addNotification('error', error?.message || 'Failed to fetch contacts');
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const response = await getAllCustomers(currentPage, itemsPerPage, searchQuery, selectedStatus || undefined);
      if (response.success) {
        // Update pagination state
        if (response.pagination) {
          setTotalPages(response.pagination.totalPages || 1);
          setTotalCustomers(response.pagination.totalEmployees || 0);
        }

        // Fetch documents for each customer
        const customersWithDocs = await Promise.all(
          (response.data || []).map(async (customer: Employee) => {
            try {
              const docsResponse = await getDocumentsByEmployee(customer._id);
              if (docsResponse.success && Array.isArray(docsResponse.data)) {
                return { ...customer, documents: docsResponse.data };
              }
            } catch (err) {
              console.error(`Error fetching documents for customer ${customer._id}:`, err);
            }
            return { ...customer, documents: [] };
          })
        );

        setCustomers(customersWithDocs);
      } else {
        addNotification('error', response?.message || 'Failed to fetch customers');
      }
    } catch (error: any) {
      console.error('Error fetching customers:', error);
      addNotification('error', error?.message || 'Failed to fetch customers');
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployeeDocuments = async () => {
    if (!editingEmployee) {
      console.log('⚠️ No editingEmployee, cannot fetch documents');
      return;
    }
    try {
      console.log('🔄 Fetching documents for employee:', editingEmployee._id);
      const docsResponse = await getDocumentsByEmployee(editingEmployee._id);
      console.log('📄 Documents response:', docsResponse);
      if (docsResponse.success && Array.isArray(docsResponse.data)) {
        const docs = docsResponse.data.map((doc: EmployeeDocument) => ({
          documentType: doc.documentType,
          documentNumber: doc.documentNumber || '',
          issueDate: doc.issueDate ? doc.issueDate.split('T')[0] : '',
          expiryDate: doc.expiryDate ? doc.expiryDate.split('T')[0] : '',
          description: doc.description || '',
          status: doc.status,
          file: null,
          _id: doc._id
        }));
        console.log('✅ Setting employee documents:', docs);
        setEmployeeDocuments(docs);
      } else {
        console.warn('⚠️ No documents found or invalid response:', docsResponse);
        setEmployeeDocuments([]);
      }
    } catch (error) {
      console.error('❌ Error fetching employee documents:', error);
      setEmployeeDocuments([]);
    }
  };


  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'internalId' ? value.toUpperCase() : value
    }));
  };

  const resetForm = () => {
    // Set role based on active tab, but allow changing it in the form
    let defaultRole = '';
    if (activeTab === 'contacts') {
      defaultRole = 'contact';
    } else if (activeTab === 'customers') {
      defaultRole = 'customer';
    }

    setFormData({
      name: '',
      email: '',
      phone: '',
      country: '',
      role: defaultRole,
      state: '',
      city: '',
      address: '',
      joinDate: '',
      internalId: '',
      policies: '',
      password: ''
    });
    setEmployeeDocuments([]);
    setCurrentStep(1);
    setEditingEmployee(null);
    setShowPassword(false);
    setIsSubmitting(false);
  };

  const addDocument = () => {
    setEmployeeDocuments([...employeeDocuments, {
      documentType: '',
      documentNumber: '',
      issueDate: '',
      expiryDate: '',
      description: '',
      status: 'valid',
      file: null
    }]);
  };

  const removeDocument = (index: number) => {
    setEmployeeDocuments(employeeDocuments.filter((_, i) => i !== index));
  };

  const updateDocument = (index: number, field: keyof EmployeeDocumentForm, value: any) => {
    const updated = [...employeeDocuments];
    updated[index] = { ...updated[index], [field]: value };
    setEmployeeDocuments(updated);
  };

  const handleDocumentFileChange = (index: number, files: FileList | null) => {
    if (!files || files.length === 0) {
      updateDocument(index, 'file', null);
      return;
    }

    // Support multiple files - if multiple files selected, create multiple document entries
    if (files.length > 1) {
      const newDocs: EmployeeDocumentForm[] = [];
      Array.from(files).forEach((file, fileIndex) => {
        if (fileIndex === 0) {
          // Update the current document with first file
          updateDocument(index, 'file', file);
        } else {
          // Create new document entries for additional files
          newDocs.push({
            documentType: employeeDocuments[index]?.documentType || 'Other',
            documentNumber: '',
            issueDate: '',
            expiryDate: '',
            description: '',
            status: 'valid',
            file: file
          });
        }
      });
      // Add new documents to the list
      if (newDocs.length > 0) {
        setEmployeeDocuments([...employeeDocuments, ...newDocs]);
      }
    } else {
      // Single file
      updateDocument(index, 'file', files[0]);
    }
  };

  const handleCreate = async () => {
    if (currentStep === 1) {
      // Validate step 1
      if (!formData.name || !formData.email || !formData.phone) {
        addNotification('error', 'Please fill in all required fields (Name, Email, Phone)');
        return;
      }
      // Move to step 2
      setCurrentStep(2);
      return;
    }

    // Prevent double submission
    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    try {
      const submitData: any = { ...formData };

      // Remove empty password for updates
      if (editingEmployee && !submitData.password) {
        delete submitData.password;
      }

      let response;
      // Check role to determine which API to call (allows creating contact/customer from employees tab)
      if (formData.role === 'contact') {
        response = await createContact(submitData);
      } else if (formData.role === 'customer') {
        response = await createCustomer(submitData);
      } else {
        response = await createEmployee(submitData);
      }

      if (response && response.success === true) {
        const employeeId = response.data?._id || response.data?.id;

        // Upload documents if any
        if (employeeId && employeeDocuments.length > 0) {
          try {
            for (const doc of employeeDocuments) {
              if (doc.file && doc.documentType) {
                const docFormData = new FormData();
                docFormData.append('employee', employeeId);
                docFormData.append('documentType', doc.documentType);
                docFormData.append('status', doc.status || 'valid');
                if (doc.documentNumber) docFormData.append('documentNumber', doc.documentNumber);
                if (doc.issueDate) docFormData.append('issueDate', doc.issueDate);
                if (doc.expiryDate) docFormData.append('expiryDate', doc.expiryDate);
                if (doc.description) docFormData.append('description', doc.description);
                docFormData.append('documentFile', doc.file);

                await createEmployeeDocument(docFormData);
              }
            }
          } catch (docError) {
            console.error('Error uploading documents:', docError);
            addNotification('error', 'Employee created but some documents failed to upload. Please add them manually.');
          }
        }

        // Determine the type based on role
        const entityType = formData.role === 'contact' ? 'Contact' : formData.role === 'customer' ? 'Customer' : 'Employee';
        const inviteSuffix = !formData.password && rolesWithLoginAccess.includes(formData.role) ? ` An invite email has been sent to ${formData.email}.` : '';
        addNotification('success', response.message || `${entityType} created successfully.${inviteSuffix}`);

        // Refresh the appropriate tab based on role
        if (formData.role === 'contact') {
          await fetchContacts();
          // If we're on employees tab, also refresh employees to show updated count
          if (activeTab === 'employees') {
            await fetchEmployees();
          }
        } else if (formData.role === 'customer') {
          await fetchCustomers();
          // If we're on employees tab, also refresh employees to show updated count
          if (activeTab === 'employees') {
            await fetchEmployees();
          }
        } else {
          await fetchEmployees();
        }
        setShowAddModal(false);
        resetForm();
      } else {
        let errorMessage = 'Failed to create employee';
        if (Array.isArray(response?.errors) && response.errors.length > 0) {
          const errorDetails = response.errors.map((e: any) => {
            const field = e.path || e.field || '';
            const msg = e.msg || e.message || '';
            return field ? `${field}: ${msg}` : msg;
          }).join('; ');
          errorMessage = errorDetails || response?.message || 'Validation failed';
        } else if (response?.message) {
          errorMessage = response.message;
        }
        addNotification('error', errorMessage);
      }
    } catch (error: any) {
      console.error('Error creating employee:', error);
      let errorMessage = 'An unexpected error occurred';
      const errorData = error?.response?.data;
      if (Array.isArray(errorData?.errors) && errorData.errors.length > 0) {
        const errorDetails = errorData.errors.map((e: any) => {
          const field = e.path || e.field || '';
          const msg = e.msg || e.message || '';
          return field ? `${field}: ${msg}` : msg;
        }).join('; ');
        errorMessage = errorDetails || errorData?.message || 'Validation failed';
      } else if (errorData?.message) {
        errorMessage = errorData.message;
      } else if (error?.message) {
        errorMessage = error.message;
      }
      addNotification('error', errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async () => {
    if (!editingEmployee) return;

    if (currentStep === 1) {
      // Validate step 1
      if (!formData.name || !formData.email || !formData.phone) {
        addNotification('error', 'Please fill in all required fields (Name, Email, Phone)');
        return;
      }
      // Move to step 2
      setCurrentStep(2);
      return;
    }

    // Step 2 - Update employee and documents
    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    try {
      const submitData: any = { ...formData };

      // Remove empty password for updates
      if (!submitData.password) {
        delete submitData.password;
      }

      let response;
      if (activeTab === 'contacts') {
        response = await updateContact(editingEmployee._id, submitData);
      } else if (activeTab === 'customers') {
        response = await updateCustomer(editingEmployee._id, submitData);
      } else {
        response = await updateEmployee(editingEmployee._id, submitData);
      }

      if (response && response.success === true) {
        // Update documents
        if (employeeDocuments.length > 0) {
          console.log('📄 Processing documents:', employeeDocuments.length, 'documents');
          try {
            for (const doc of employeeDocuments) {
              if (doc._id) {
                // Update existing document
                console.log('🔄 Updating existing document:', doc._id);
                if (doc.file || doc.documentType) {
                  const docFormData = new FormData();
                  docFormData.append('documentType', doc.documentType);
                  docFormData.append('status', doc.status || 'valid');
                  if (doc.documentNumber) docFormData.append('documentNumber', doc.documentNumber);
                  if (doc.issueDate) docFormData.append('issueDate', doc.issueDate);
                  if (doc.expiryDate) docFormData.append('expiryDate', doc.expiryDate);
                  if (doc.description) docFormData.append('description', doc.description);
                  if (doc.file) docFormData.append('documentFile', doc.file);

                  const updateResponse = await updateEmployeeDocument(doc._id, docFormData);
                  console.log('✅ Document updated:', updateResponse);
                }
              } else if (doc.file && doc.documentType) {
                // Create new document
                console.log('➕ Creating new document:', doc.documentType, 'for employee:', editingEmployee._id);
                const docFormData = new FormData();
                docFormData.append('employee', editingEmployee._id);
                docFormData.append('documentType', doc.documentType);
                docFormData.append('status', doc.status || 'valid');
                if (doc.documentNumber) docFormData.append('documentNumber', doc.documentNumber);
                if (doc.issueDate) docFormData.append('issueDate', doc.issueDate);
                if (doc.expiryDate) docFormData.append('expiryDate', doc.expiryDate);
                if (doc.description) docFormData.append('description', doc.description);
                docFormData.append('documentFile', doc.file);

                const createResponse = await createEmployeeDocument(docFormData);
                console.log('✅ Document created:', createResponse);
              } else {
                console.warn('⚠️ Skipping document - missing file or documentType:', doc);
              }
            }
            console.log('✅ All documents processed successfully');
          } catch (docError) {
            console.error('❌ Error updating documents:', docError);
            addNotification('error', 'Employee updated but some documents failed to update. Please try again.');
          }
        } else {
          console.log('ℹ️ No documents to process');
        }

        addNotification('success', response.message || `${activeTab === 'contacts' ? 'Contact' : activeTab === 'customers' ? 'Customer' : 'Employee'} updated successfully`);

        // Refetch the employee list to get updated data
        if (activeTab === 'employees') {
          await fetchEmployees();
        } else if (activeTab === 'contacts') {
          await fetchContacts();
        } else if (activeTab === 'customers') {
          await fetchCustomers();
        }

        // Refetch documents for the edited employee to show updated documents
        // Add a small delay to ensure database has saved the documents
        if (editingEmployee?._id) {
          try {
            // Wait a bit for database to save documents
            await new Promise(resolve => setTimeout(resolve, 500));
            console.log('🔄 Refetching documents for employee:', editingEmployee._id);
            const docsResponse = await getDocumentsByEmployee(editingEmployee._id);
            console.log('📄 Documents response:', docsResponse);
            if (docsResponse.success && Array.isArray(docsResponse.data)) {
              const docs = docsResponse.data.map((doc: EmployeeDocument) => ({
                documentType: doc.documentType,
                documentNumber: doc.documentNumber || '',
                issueDate: doc.issueDate ? doc.issueDate.split('T')[0] : '',
                expiryDate: doc.expiryDate ? doc.expiryDate.split('T')[0] : '',
                description: doc.description || '',
                status: doc.status,
                file: null,
                _id: doc._id
              }));
              console.log('✅ Setting employee documents:', docs);
              setEmployeeDocuments(docs);
            } else {
              console.warn('⚠️ No documents found or invalid response:', docsResponse);
              setEmployeeDocuments([]);
            }
          } catch (error) {
            console.error('❌ Error refetching employee documents after update:', error);
            setEmployeeDocuments([]);
          }
        }

        setShowAddModal(false);
        resetForm();
      } else {
        let errorMessage = 'Failed to update employee';
        if (Array.isArray(response?.errors) && response.errors.length > 0) {
          const errorDetails = response.errors.map((e: any) => {
            const field = e.path || e.field || '';
            const msg = e.msg || e.message || '';
            return field ? `${field}: ${msg}` : msg;
          }).join('; ');
          errorMessage = errorDetails || response?.message || 'Validation failed';
        } else if (response?.message) {
          errorMessage = response.message;
        }
        addNotification('error', errorMessage);
      }
    } catch (error: any) {
      console.error('Error updating employee:', error);
      let errorMessage = 'An unexpected error occurred';
      const errorData = error?.response?.data;
      if (Array.isArray(errorData?.errors) && errorData.errors.length > 0) {
        const errorDetails = errorData.errors.map((e: any) => {
          const field = e.path || e.field || '';
          const msg = e.msg || e.message || '';
          return field ? `${field}: ${msg}` : msg;
        }).join('; ');
        errorMessage = errorDetails || errorData?.message || 'Validation failed';
      } else if (errorData?.message) {
        errorMessage = errorData.message;
      } else if (error?.message) {
        errorMessage = error.message;
      }
      addNotification('error', errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (employee: Employee) => {
    setEditingEmployee(employee);
    setFormData({
      name: employee.name,
      email: employee.email,
      phone: employee.phone,
      country: employee.country,
      role: employee.role,
      state: employee.state,
      city: employee.city,
      address: employee.location?.address || '',
      joinDate: employee.joinDate,
      internalId: employee.internalId,
      policies: employee.policies,
      password: ''
    });
    setCurrentStep(1);
    setShowAddModal(true);
    fetchEmployeeDocuments();
  };

  const handleDelete = async (id: string) => {
    setDeleteConfirm({ show: true, employeeId: id });
  };

  const confirmDelete = async () => {
    if (!deleteConfirm.employeeId) return;

    try {
      let response;
      if (activeTab === 'contacts') {
        response = await deleteContact(deleteConfirm.employeeId);
      } else if (activeTab === 'customers') {
        response = await deleteCustomer(deleteConfirm.employeeId);
      } else {
        response = await deleteEmployee(deleteConfirm.employeeId);
      }

      if (response.success) {
        addNotification('success', response.message || `${activeTab === 'contacts' ? 'Contact' : activeTab === 'customers' ? 'Customer' : 'Employee'} deleted successfully`);
        if (activeTab === 'employees') {
          fetchEmployees();
        } else if (activeTab === 'contacts') {
          fetchContacts();
        } else if (activeTab === 'customers') {
          fetchCustomers();
        }
      } else {
        const errorMessage = response?.message || response?.error?.message || 'Failed to delete employee';
        addNotification('error', errorMessage);
      }
    } catch (error: any) {
      console.error('Error deleting employee:', error);
      addNotification('error', error?.message || 'An unexpected error occurred while deleting employee');
    } finally {
      setDeleteConfirm({ show: false, employeeId: null });
    }
  };

  const handleStatusToggle = async (employee: Employee) => {
    try {
      const newStatus = employee.status === 'active' ? 'inactive' : 'active';
      const response = await updateEmployeeStatus(employee._id, newStatus);
      if (response.success) {
        addNotification('success', response.message || `Employee ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully`);
        fetchEmployees();
      } else {
        const errorMessage = response?.message || response?.error?.message || 'Failed to update employee status';
        addNotification('error', errorMessage);
      }
    } catch (error: any) {
      console.error('Error updating employee status:', error);
      addNotification('error', error?.message || 'An unexpected error occurred while updating employee status');
    }
  };

  const handleRoleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const role = e.target.value;
    setFormData(prev => ({ ...prev, role }));
  };

  const handleRowClick = async (employee: Employee) => {
    try {
      // Fetch latest documents for the employee
      const docsResponse = await getDocumentsByEmployee(employee._id);
      if (docsResponse.success && Array.isArray(docsResponse.data)) {
        setSelectedEmployeeDetails({ ...employee, documents: docsResponse.data });
      } else {
        setSelectedEmployeeDetails({ ...employee, documents: [] });
      }
      setShowEmployeeDetails(true);
    } catch (error) {
      console.error('Error fetching employee documents:', error);
      setSelectedEmployeeDetails({ ...employee, documents: [] });
      setShowEmployeeDetails(true);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'valid':
        return 'bg-green-100 text-green-700';
      case 'pending':
        return 'bg-yellow-100 text-yellow-700';
      case 'expired':
        return 'bg-red-100 text-red-700';
      case 'rejected':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-card text-primary';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'valid':
        return <CheckCircle className="w-3 h-3" />;
      case 'pending':
        return <AlertCircle className="w-3 h-3" />;
      case 'expired':
      case 'rejected':
        return <X className="w-3 h-3" />;
      default:
        return null;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="flex min-h-screen bg-main">
      <div className={`flex-1 flex flex-col transition-all duration-300 ${showAddModal ? 'mr-[800px]' : ''}`}>
        <div className="flex-1 flex flex-col p-4" style={ACCENT_VARS}>
          {/* Notifications Container */}
          <div className="fixed top-4 right-4 z-[10002] flex flex-col gap-3 max-w-md">
            {notifications.map(notification => (
              <Notification
                key={notification.id}
                notification={notification}
                onClose={removeNotification}
              />
            ))}
          </div>

          <div className="bg-card rounded-xl shadow-lg p-4 mb-4 border border-theme flex-shrink-0">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-2xl font-bold text-primary mb-1">Employee Management</h2>
                <div className="flex items-center gap-3">
                  <p className="text-sm text-secondary">
                    {activeTab === 'employees' && (totalEmployees > 0
                      ? `Showing ${employees.length} of ${totalEmployees} employees`
                      : 'No employees found')
                    }
                    {activeTab === 'contacts' && (totalContacts > 0
                      ? `Showing ${contacts.length} of ${totalContacts} contacts`
                      : 'No contacts found')
                    }
                    {activeTab === 'customers' && (totalCustomers > 0
                      ? `Showing ${customers.length} of ${totalCustomers} customers`
                      : 'No customers found')
                    }
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  resetForm();
                  setShowAddModal(true);
                }}
                className="px-5 py-2.5 !text-white rounded-xl transition-all flex items-center space-x-2 shadow-md hover:shadow-lg hover:scale-105"
                style={{ backgroundImage: ACCENT_GRADIENT }}
              >
                <Plus className="w-5 h-5" />
                <span className="font-semibold">
                  {activeTab === 'employees' && 'Add Employee'}
                  {activeTab === 'contacts' && 'Add Contact'}
                  {activeTab === 'customers' && 'Add Customer'}
                </span>
              </button>
            </div>

            {/* Tabs */}
            <div className="flex space-x-1 mb-4 border-b border-theme flex-shrink-0">
              <button
                onClick={() => setActiveTab('employees')}
                className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${activeTab === 'employees'
                    ? 'border-blue-600 text-[#00D1FF]'
                    : 'border-transparent text-secondary hover:text-primary'
                  }`}
                style={
                  activeTab === 'employees'
                    ? { borderColor: ACCENT_PRIMARY, color: ACCENT_PRIMARY }
                    : undefined
                }
              >
                Employees
                {totalEmployees > 0 && (
                  <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-card text-secondary">
                    {totalEmployees}
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveTab('contacts')}
                className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${activeTab === 'contacts'
                    ? 'border-blue-600 text-[#00D1FF]'
                    : 'border-transparent text-secondary hover:text-primary'
                  }`}
                style={
                  activeTab === 'contacts'
                    ? { borderColor: ACCENT_PRIMARY, color: ACCENT_PRIMARY }
                    : undefined
                }
              >
                Contacts
                {totalContacts > 0 && (
                  <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-card text-secondary">
                    {totalContacts}
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveTab('customers')}
                className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${activeTab === 'customers'
                    ? 'border-blue-600 text-[#00D1FF]'
                    : 'border-transparent text-secondary hover:text-primary'
                  }`}
                style={
                  activeTab === 'customers'
                    ? { borderColor: ACCENT_PRIMARY, color: ACCENT_PRIMARY }
                    : undefined
                }
              >
                Customers
                {totalCustomers > 0 && (
                  <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-card text-secondary">
                    {totalCustomers}
                  </span>
                )}
              </button>
            </div>

            <div className="flex items-center space-x-4">
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-secondary w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search by name, ID, role, or department..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 border border-theme rounded-xl focus:outline-none focus:ring-2 focus:border-transparent bg-card focus:bg-card transition-colors"
                  style={focusRingStyle}
                />
              </div>
              <div className="relative">
                <button
                  onClick={() => setShowFilterPanel(!showFilterPanel)}
                  className="px-5 py-3 border border-theme rounded-xl hover:bg-[rgba(255,255,255,0.03)] flex items-center space-x-2 bg-card transition-all"
                  style={
                    showFilterPanel
                      ? { backgroundColor: "rgba(66, 174, 236, 0.1)", borderColor: ACCENT_PRIMARY, boxShadow: `0 0 0 3px rgba(66, 174, 236, 0.1)` }
                      : undefined
                  }
                >
                  <Filter className="w-5 h-5" />
                  <span className="font-medium">Filter</span>
                  {selectedStatus && (
                    <span
                      className="ml-1 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center font-semibold"
                      style={{ backgroundColor: ACCENT_PRIMARY }}
                    >
                      1
                    </span>
                  )}
                </button>

                {showFilterPanel && (
                  <>
                    <div
                      className="fixed inset-0 z-40 bg-gray-900/20 backdrop-blur-sm"
                      onClick={() => setShowFilterPanel(false)}
                    ></div>
                    <div className="absolute right-0 mt-2 w-64 bg-card rounded-lg shadow-xl border border-theme z-50 p-4">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-semibold text-primary">
                          {activeTab === 'employees' && 'Filter Employees'}
                          {activeTab === 'contacts' && 'Filter Contacts'}
                          {activeTab === 'customers' && 'Filter Customers'}
                        </h3>
                        <button
                          onClick={() => setShowFilterPanel(false)}
                          className="text-secondary hover:text-secondary"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="space-y-4">
                        {/* Role filter removed - showing all users in employees tab */}

                        <div>
                          <label className="block text-sm font-medium text-primary mb-2">
                            Status
                          </label>
                          <select
                            value={selectedStatus}
                            onChange={(e) => setSelectedStatus(e.target.value)}
                            className="w-full px-3 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:border-transparent text-sm"
                            style={focusRingStyle}
                          >
                            <option value="">All Status</option>
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                          </select>
                        </div>

                        <div className="flex items-center space-x-2 pt-2 border-t border-theme">
                          <button
                            onClick={() => {
                              setSelectedStatus('');
                              setShowFilterPanel(false);
                              setCurrentPage(1); // Reset to first page when clearing filters
                            }}
                            className="flex-1 px-3 py-2 text-sm border border-theme rounded-lg hover:bg-[rgba(255,255,255,0.03)] text-primary"
                          >
                            Clear Status Filter
                          </button>
                          <button
                            onClick={() => setShowFilterPanel(false)}
                            className="flex-1 px-3 py-2 text-sm text-white rounded-lg hover:opacity-90"
                            style={{ backgroundImage: ACCENT_GRADIENT }}
                          >
                            Apply
                          </button>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="bg-card rounded-xl shadow-lg border border-theme flex flex-col">
            {/* Top Scrollbar - Only visible horizontal scrollbar */}
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
              .table-wrapper {
                overflow-x: auto;
                overflow-y: auto;
                flex: 1;
                min-height: 0;
              }
              .table-wrapper::-webkit-scrollbar {
                width: 8px;
              }
              .table-wrapper::-webkit-scrollbar-track {
                background: #f7fafc;
              }
              .table-wrapper::-webkit-scrollbar-thumb {
                background: #cbd5e0;
                border-radius: 4px;
              }
              .table-wrapper::-webkit-scrollbar-thumb:hover {
                background: #a0aec0;
              }
            `}</style>
            <div
              ref={topScrollRef}
              className="overflow-x-auto overflow-y-hidden top-scrollbar-container flex-shrink-0"
              style={{
                maxHeight: '20px',
                marginBottom: '2px',
                scrollbarWidth: 'thin',
                scrollbarColor: '#cbd5e0 #f7fafc' /* Firefox */
              }}
            >
              <div className="top-scroll-content" style={{ height: '1px' }}></div>
            </div>
            {/* Main Table */}
            <div
              ref={bottomScrollRef}
              className="table-wrapper"
              style={{
                overflowX: 'auto'
              }}
            >
              <table className="min-w-full divide-y divide-theme">
                <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-theme">
                  <tr>
                    <th className="px-4 py-2.5 text-left text-xs font-bold text-primary uppercase tracking-wider">User</th>
                    <th className="px-4 py-2.5 text-left text-xs font-bold text-primary uppercase tracking-wider">Role</th>
                    <th className="px-4 py-2.5 text-left text-xs font-bold text-primary uppercase tracking-wider">Contact</th>
                    <th className="px-4 py-2.5 text-left text-xs font-bold text-primary uppercase tracking-wider">Location</th>
                    <th className="px-4 py-2.5 text-left text-xs font-bold text-primary uppercase tracking-wider">Status</th>
                    <th className="px-4 py-2.5 text-left text-xs font-bold text-primary uppercase tracking-wider">Created</th>
                    <th className="px-4 py-2.5 text-left text-xs font-bold text-primary uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-card divide-y divide-gray-100">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center">
                        <div className="flex flex-col items-center justify-center text-secondary">
                          <RefreshCw className="animate-spin h-6 w-6 mb-2" style={{ color: ACCENT_PRIMARY }} />
                          <p className="text-sm font-medium">Loading employees...</p>
                        </div>
                      </td>
                    </tr>
                  ) : (() => {
                    // Backend already sends paginated data (10 items per page)
                    const currentData = activeTab === 'employees' ? employees : activeTab === 'contacts' ? contacts : customers;

                    if (currentData.length === 0) {
                      return (
                        <tr key="no-data">
                          <td colSpan={7} className="px-4 py-8 text-center">
                            <div className="flex flex-col items-center justify-center">
                              <User className="w-12 h-12 text-gray-300 mb-3" />
                              <p className="text-base font-semibold text-secondary mb-1">
                                {activeTab === 'employees' && 'No employees found'}
                                {activeTab === 'contacts' && 'No contacts found'}
                                {activeTab === 'customers' && 'No customers found'}
                              </p>
                              <p className="text-sm text-secondary">Try adjusting your search or filters</p>
                            </div>
                          </td>
                        </tr>
                      );
                    }

                    // Display all data from current page (backend handles pagination)
                    return currentData.map((employee, index) => {
                      // Use a unique key combining _id and index to prevent React key conflicts
                      const uniqueKey = `${employee._id}-${index}-${employee.role}`;
                      return (
                        <tr
                          key={uniqueKey}
                          className="hover:bg-blue-50/50 transition-all cursor-pointer border-b border-theme"
                          onClick={() => handleRowClick(employee)}
                          data-employee-role={employee.role}
                          data-employee-name={employee.name}
                        >
                          {/* User */}
                          <td className="px-4 py-2.5">
                            <div className="flex items-center">
                              <div
                                className="h-10 w-10 rounded-full flex items-center justify-center text-white font-bold text-base flex-shrink-0 shadow-md"
                                style={{ background: ACCENT_GRADIENT }}
                              >
                                {employee.name?.charAt(0) || '?'}
                              </div>
                              <div className="ml-3">
                                <div className="text-sm font-semibold text-primary" title={employee.name}>
                                  {employee.name || 'N/A'}
                                </div>
                                <div className="text-xs text-secondary font-mono">
                                  {employee.internalId || 'N/A'}
                                </div>
                              </div>
                            </div>
                          </td>
                          {/* Role */}
                          <td className="px-4 py-2.5 whitespace-nowrap">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-purple-100 text-purple-700">
                              {getRoleDisplayName(employee.role || 'N/A')}
                            </span>
                          </td>
                          {/* Contact */}
                          <td className="px-4 py-2.5">
                            <div className="space-y-1">
                              <div className="flex items-center text-sm text-primary">
                                <Mail className="w-3.5 h-3.5 mr-1.5 text-secondary flex-shrink-0" />
                                <span className="truncate text-xs" title={employee.email}>{employee.email || 'N/A'}</span>
                              </div>
                              <div className="text-xs text-secondary pl-5">
                                {employee.phone || 'N/A'}
                              </div>
                            </div>
                          </td>
                          {/* Location */}
                          <td className="px-4 py-2.5 text-sm text-secondary">
                            <div>
                              <div className="font-medium text-primary">
                                {employee.country || 'N/A'}
                              </div>
                              <div className="text-xs text-secondary truncate" title={employee.city && employee.state ? `${employee.city}, ${employee.state}` : employee.location?.address || '-'}>
                                {employee.city && employee.state ? `${employee.city}, ${employee.state}` : employee.location?.address || '-'}
                              </div>
                            </div>
                          </td>
                          {/* Status */}
                          <td className="px-4 py-2.5 whitespace-nowrap">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleStatusToggle(employee);
                              }}
                              className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-md transition-all shadow-sm hover:shadow-md ${(employee.status || 'active') === 'active'
                                ? 'bg-green-100 text-green-700 hover:bg-green-200 border border-green-300'
                                : 'bg-red-100 text-red-700 hover:bg-red-200 border border-red-300'
                                }`}
                            >
                              <div className={`w-1.5 h-1.5 rounded-full mr-1.5 ${(employee.status || 'active') === 'active' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                              {(employee.status || 'active').charAt(0).toUpperCase() + (employee.status || 'active').slice(1)}
                            </button>
                          </td>
                          {/* Created */}
                          <td className="px-4 py-2.5 whitespace-nowrap text-sm text-secondary font-medium">
                            {employee.joinDate ? new Date(employee.joinDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' }) : 'N/A'}
                          </td>
                          {/* Actions */}
                          <td className="px-4 py-2.5 whitespace-nowrap">
                            <div className="flex items-center gap-1">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEdit(employee);
                                }}
                                className="p-1.5 rounded-lg hover:bg-blue-50 transition-colors"
                                style={{ color: ACCENT_PRIMARY }}
                                title={`Edit ${activeTab === 'contacts' ? 'Contact' : activeTab === 'customers' ? 'Customer' : 'Employee'}`}
                              >
                                <Edit size={16} />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDelete(employee._id);
                                }}
                                className="p-1.5 rounded-lg hover:bg-red-50 text-[#A855F7] hover:text-red-700 transition-colors"
                                title={`Delete ${activeTab === 'contacts' ? 'Contact' : activeTab === 'customers' ? 'Customer' : 'Employee'}`}
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    });
                  })()}
                </tbody>
              </table>
            </div>

            {/* Pagination - Always show if there's data */}
            {(() => {
              const currentData = activeTab === 'employees' ? employees : activeTab === 'contacts' ? contacts : customers;
              const totalCount = currentData.length;

              if (totalCount === 0) return null;

              const startItem = (currentPage - 1) * itemsPerPage + 1;
              const endItem = Math.min(currentPage * itemsPerPage, totalCount);

              return (
                <div className="px-4 py-3 border-t border-theme bg-card flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-primary">
                      Showing <span className="font-semibold">{startItem}</span> to{' '}
                      <span className="font-semibold">{endItem}</span> of{' '}
                      <span className="font-semibold">{totalCount}</span>{' '}
                      {activeTab === 'employees' && 'employees'}
                      {activeTab === 'contacts' && 'contacts'}
                      {activeTab === 'customers' && 'customers'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1 || loading}
                      className="px-4 py-2 text-sm font-medium text-primary bg-card border border-theme rounded-lg hover:bg-[rgba(255,255,255,0.03)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      Previous
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
                            disabled={loading}
                            className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${currentPage === pageNum
                                ? 'bg-blue-600 text-white'
                                : 'bg-card text-primary border border-theme hover:bg-[rgba(255,255,255,0.03)]'
                              } disabled:opacity-50 disabled:cursor-not-allowed`}
                            style={
                              currentPage === pageNum
                                ? { backgroundImage: ACCENT_GRADIENT }
                                : undefined
                            }
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                    </div>
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages || loading}
                      className="px-4 py-2 text-sm font-medium text-primary bg-card border border-theme rounded-lg hover:bg-[rgba(255,255,255,0.03)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
                    >
                      Next
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      </div>

      {/* Sidebar Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[10001] flex justify-end">
          <div className="bg-card w-[800px] h-full shadow-2xl flex flex-col border-l border-theme">
            {/* Sidebar Header */}
            <div
              className="px-6 py-4 flex items-center justify-between shrink-0"
              style={{ backgroundImage: ACCENT_GRADIENT }}
            >
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-card rounded-full flex items-center justify-center">
                  <User className="w-5 h-5" style={{ color: ACCENT_PRIMARY }} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">
                    {editingEmployee
                      ? `Edit ${formData.role === 'contact' ? 'Contact' : formData.role === 'customer' ? 'Customer' : activeTab === 'contacts' ? 'Contact' : activeTab === 'customers' ? 'Customer' : 'Employee'}`
                      : `Add New ${formData.role === 'contact' ? 'Contact' : formData.role === 'customer' ? 'Customer' : activeTab === 'contacts' ? 'Contact' : activeTab === 'customers' ? 'Customer' : 'Employee'}`
                    }
                  </h2>
                  <p className="text-sm !text-white">
                    Fill in the details below
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  resetForm();
                }}
                className="text-white hover:bg-card hover:bg-opacity-20 rounded-lg p-2 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Step Indicator */}
            {!editingEmployee ? (
              <div className="px-6 py-4 bg-card border-b border-theme">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 flex-1">
                    <div className={`flex items-center gap-2 ${currentStep >= 1 ? 'text-[#00D1FF]' : 'text-secondary'}`}>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${currentStep >= 1
                        ? 'border-blue-600 bg-card'
                        : 'border-theme bg-card'
                        }`}>
                        {currentStep > 1 ? <CheckCircle size={16} className="text-[#00D1FF]" /> : '1'}
                      </div>
                      <span className="text-sm font-medium">Information</span>
                    </div>
                    <div className="flex-1 h-0.5 bg-gray-200 mx-2">
                      <div
                        className={`h-full transition-all ${currentStep >= 2 ? 'bg-blue-600' : 'bg-gray-200'}`}
                        style={{ width: currentStep >= 2 ? '100%' : '0%' }}
                      />
                    </div>
                    <div className={`flex items-center gap-2 ${currentStep >= 2 ? 'text-[#00D1FF]' : 'text-secondary'}`}>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${currentStep >= 2
                        ? 'border-blue-600 bg-card'
                        : 'border-theme bg-card'
                        }`}>
                        2
                      </div>
                      <span className="text-sm font-medium">Documents</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="px-6 py-4 bg-card border-b border-theme">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentStep(1)}
                    style={
                      currentStep === 1
                        ? {
                          background: ACCENT_GRADIENT,
                        }
                        : undefined
                    }
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${currentStep === 1
                      ? '!text-white shadow-sm'
                      : 'bg-card text-primary border border-theme hover:bg-[rgba(255,255,255,0.03)]'
                      }`}
                  >
                    Information
                  </button>

                  <button
                    onClick={() => setCurrentStep(2)}
                    style={
                      currentStep === 2
                        ? {
                          background: ACCENT_GRADIENT,
                        }
                        : undefined
                    }
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${currentStep === 2
                      ? '!text-white shadow-sm'
                      : 'bg-card text-primary border border-theme hover:bg-[rgba(255,255,255,0.03)]'
                      }`}
                  >
                    Documents ({employeeDocuments.length})
                  </button>
                </div>
              </div>
            )}

            {/* Sidebar Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {currentStep === 2 ? (
                /* Step 2: Employee Documents */
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2 font-semibold" style={{ color: ACCENT_PRIMARY }}>
                      <FileText size={18} />
                      <span>Employee Documents</span>
                    </div>
                    <button
                      onClick={addDocument}
                      className="px-3 py-1.5 text-sm bg-card text-[#00D1FF] rounded-lg hover:bg-blue-100 transition-colors flex items-center gap-2"
                    >
                      <Plus size={16} />
                      Add Document
                    </button>
                  </div>

                  {employeeDocuments.length === 0 ? (
                    <div className="text-center py-8 border-2 border-dashed border-theme rounded-lg">
                      <FileText className="w-12 h-12 text-secondary mx-auto mb-3" />
                      <p className="text-secondary mb-2">No documents added yet</p>
                      <p className="text-sm text-secondary mb-4">Click "Add Document" to upload employee documents</p>
                      <button
                        onClick={addDocument}
                        className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                        style={{ backgroundImage: ACCENT_GRADIENT }}
                      >
                        Add First Document
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {employeeDocuments.map((doc, index) => (
                        <div key={doc._id || index} className="border border-theme rounded-lg p-4 bg-card">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <h4 className="font-semibold text-primary">Document {index + 1}</h4>
                              {doc._id && (
                                <span className="text-xs bg-blue-100 text-[#00D1FF] px-2 py-0.5 rounded">Existing</span>
                              )}
                            </div>
                            <button
                              onClick={() => removeDocument(index)}
                              className="text-[#A855F7] hover:text-red-800 transition-colors"
                            >
                              <X size={18} />
                            </button>
                          </div>

                          <div className="space-y-3">
                            <div>
                              <label className="block text-sm font-medium text-primary mb-1">
                                Document Type <span className="text-red-500">*</span>
                              </label>
                              <select
                                value={doc.documentType}
                                onChange={(e) => updateDocument(index, 'documentType', e.target.value)}
                                className="w-full px-3 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                              >
                                <option value="">Select Document Type</option>
                                {EMPLOYEE_DOCUMENT_TYPES.map((type) => (
                                  <option key={type} value={type}>{type}</option>
                                ))}
                              </select>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="block text-sm font-medium text-primary mb-1">Document Number</label>
                                <input
                                  type="text"
                                  value={doc.documentNumber}
                                  onChange={(e) => updateDocument(index, 'documentNumber', e.target.value)}
                                  placeholder="e.g., DOC-123456"
                                  className="w-full px-3 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-primary mb-1">Status</label>
                                <select
                                  value={doc.status}
                                  onChange={(e) => updateDocument(index, 'status', e.target.value)}
                                  className="w-full px-3 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                  <option value="valid">Valid</option>
                                  <option value="pending">Pending</option>
                                  <option value="expired">Expired</option>
                                  <option value="rejected">Rejected</option>
                                </select>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="block text-sm font-medium text-primary mb-1">Issue Date</label>
                                <input
                                  type="date"
                                  value={doc.issueDate}
                                  onChange={(e) => updateDocument(index, 'issueDate', e.target.value)}
                                  className="w-full px-3 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-primary mb-1">Expiry Date</label>
                                <input
                                  type="date"
                                  value={doc.expiryDate}
                                  onChange={(e) => updateDocument(index, 'expiryDate', e.target.value)}
                                  className="w-full px-3 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                              </div>
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-primary mb-1">Description</label>
                              <textarea
                                value={doc.description}
                                onChange={(e) => updateDocument(index, 'description', e.target.value)}
                                rows={2}
                                placeholder="Enter document description or notes..."
                                className="w-full px-3 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                              />
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-primary mb-1">
                                Document File {!doc._id && <span className="text-red-500">*</span>}
                              </label>
                              <input
                                type="file"
                                multiple
                                onChange={(e) => handleDocumentFileChange(index, e.target.files)}
                                className="w-full px-3 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.txt"
                              />
                              {doc.file && (
                                <p className="text-xs mt-1 text-green-600 flex items-center gap-1">
                                  <CheckCircle size={12} />
                                  Selected: {doc.file.name}
                                </p>
                              )}
                              {doc._id && !doc.file && (
                                <p className="text-xs mt-1 text-secondary">
                                  Leave empty to keep existing file
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                /* Step 1: Employee Information */
                <>
                  {/* Basic Employee Information */}
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-primary mb-4 flex items-center space-x-2">
                      <User className="w-5 h-5" style={{ color: ACCENT_PRIMARY }} />
                      <span>Basic Information</span>
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-primary mb-2">
                          Full Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          name="name"
                          value={formData.name}
                          onChange={handleInputChange}
                          placeholder="Enter full name"
                          className="w-full px-4 py-2.5 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-primary mb-2">
                          Role <span className="text-red-500">*</span>
                        </label>
                        <select
                          name="role"
                          value={formData.role}
                          onChange={handleRoleChange}
                          className="w-full px-4 py-2.5 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="">Select role</option>
                          <optgroup label="Employee Roles">
                            {roles.filter(r => r !== 'contact' && r !== 'customer').map(role => (
                              <option key={role} value={role}>{getRoleDisplayName(role)}</option>
                            ))}
                          </optgroup>
                          <optgroup label="Other">
                            <option value="contact">Contact</option>
                            <option value="customer">Customer</option>
                          </optgroup>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-primary mb-2">
                          Internal ID {rolesWithLoginAccess.includes(formData.role) && <span className="text-red-500">*</span>}
                        </label>
                        <input
                          type="text"
                          name="internalId"
                          value={formData.internalId}
                          onChange={handleInputChange}
                          required={rolesWithLoginAccess.includes(formData.role)}
                          placeholder="EMP-001"
                          className="w-full px-4 py-2.5 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        {!rolesWithLoginAccess.includes(formData.role) && (
                          <p className="text-xs text-secondary mt-1">Not required for this role</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-primary mb-2">
                          Country <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          name="country"
                          value={formData.country}
                          onChange={handleInputChange}
                          placeholder="United States"
                          className="w-full px-4 py-2.5 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-primary mb-2">
                          Join Date <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="date"
                          name="joinDate"
                          value={formData.joinDate}
                          onChange={handleInputChange}
                          className="w-full px-4 py-2.5 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>

                      {!rolesWithoutLoginAccess.includes(formData.role) && (
                        <div>
                          <label className="block text-sm font-medium text-primary mb-2">
                            Password
                          </label>
                          <div className="relative">
                            <input
                              type={showPassword ? "text" : "password"}
                              name="password"
                              value={formData.password}
                              onChange={handleInputChange}
                              placeholder={editingEmployee ? "Leave empty to keep current password" : rolesWithLoginAccess.includes(formData.role) ? "Leave empty to send an invite email" : "Not required for this role"}
                              className="w-full px-4 py-2.5 pr-12 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-secondary hover:text-secondary transition-colors"
                              tabIndex={-1}
                            >
                              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                          </div>
                          {editingEmployee && (
                            <p className="text-xs text-secondary mt-1">Leave empty to keep the current password unchanged</p>
                          )}
                          {!rolesWithLoginAccess.includes(formData.role) && (
                            <p className="text-xs text-secondary mt-1">Password not required for this role</p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Contact Information */}
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-primary mb-4 flex items-center space-x-2">
                      <Mail className="w-5 h-5 text-blue-500" />
                      <span>Contact Information</span>
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-primary mb-2">
                          Email Address <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="email"
                          name="email"
                          value={formData.email}
                          onChange={handleInputChange}
                          placeholder="employee@company.com"
                          className="w-full px-4 py-2.5 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-primary mb-2">
                          Phone Number <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="tel"
                          name="phone"
                          value={formData.phone}
                          onChange={handleInputChange}
                          placeholder="+1 234-567-8900"
                          className="w-full px-4 py-2.5 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-primary mb-2">
                          State <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          name="state"
                          value={formData.state}
                          onChange={handleInputChange}
                          placeholder="California"
                          className="w-full px-4 py-2.5 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-primary mb-2">
                          City <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          name="city"
                          value={formData.city}
                          onChange={handleInputChange}
                          placeholder="Los Angeles"
                          className="w-full px-4 py-2.5 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>

                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-primary mb-2">
                          Address <span className="text-red-500">*</span>
                        </label>
                        <textarea
                          name="address"
                          value={formData.address}
                          onChange={handleInputChange}
                          placeholder="Enter complete address"
                          rows={2}
                          className="w-full px-4 py-2.5 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-primary mb-4 flex items-center space-x-2">
                      <AlertCircle className="w-5 h-5 text-blue-500" />
                      <span>Additional Information</span>
                    </h3>
                    <div className="grid grid-cols-1 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-primary mb-2">
                          Policies
                        </label>
                        <textarea
                          name="policies"
                          value={formData.policies}
                          onChange={handleInputChange}
                          placeholder="Enter company policies or additional notes"
                          rows={3}
                          className="w-full px-4 py-2.5 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                        />
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Sidebar Footer */}
            <div className="bg-card px-6 py-4 flex items-center justify-end space-x-3 border-t border-theme shrink-0">
              {!editingEmployee && currentStep === 2 ? (
                <>
                  <button
                    onClick={() => setCurrentStep(1)}
                    className="flex-1 bg-card border border-theme hover:bg-[rgba(255,255,255,0.03)] text-primary px-4 py-2 rounded-lg transition-colors font-medium flex items-center justify-center gap-2"
                  >
                    <ChevronLeft size={18} />
                    Back
                  </button>
                  <button
                    onClick={handleCreate}
                    disabled={isSubmitting}
                    style={{ backgroundColor: isSubmitting ? '#9CA3AF' : ACCENT_PRIMARY }}
                    className="flex-1 !text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition-colors font-medium shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <Save size={18} />
                    {isSubmitting ? 'Creating...' : 'Create Employee'}
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => {
                      setShowAddModal(false);
                      resetForm();
                    }}
                    className="px-6 py-2.5 border border-theme !mr-2 text-primary rounded-lg hover:bg-[rgba(255,255,255,0.03)] transition-colors font-medium"
                  >
                    Cancel
                  </button>
                  {!editingEmployee ? (
                    <button
                      onClick={handleCreate}
                      disabled={isSubmitting}
                      className="px-6 py-2.5 !text-white rounded-lg hover:opacity-90 transition-all font-medium shadow-md hover:shadow-lg"
                      style={{ backgroundImage: ACCENT_GRADIENT }}
                    >
                      Next
                      <ChevronRight size={18} className="inline ml-2" />
                    </button>
                  ) : (
                    <>
                      {currentStep === 1 ? (
                        <button
                          onClick={() => setCurrentStep(2)}
                          className="px-6 py-2.5 !text-white rounded-lg hover:opacity-90 transition-all font-medium shadow-md hover:shadow-lg flex items-center gap-2"
                          style={{ backgroundImage: ACCENT_GRADIENT }}
                        >
                          Next
                          <ChevronRight size={18} />
                        </button>
                      ) : (
                        <>
                          <button
                            onClick={() => setCurrentStep(1)}
                            className="px-6 py-2.5 border border-theme !mr-2 text-primary rounded-lg hover:bg-[rgba(255,255,255,0.03)] transition-colors font-medium flex items-center gap-2"
                          >
                            <ChevronLeft size={18} />
                            Back
                          </button>
                          <button
                            onClick={handleUpdate}
                            disabled={isSubmitting}
                            className="px-6 py-2.5 !text-white rounded-lg hover:opacity-90 transition-all font-medium shadow-md hover:shadow-lg flex items-center gap-2"
                            style={{ backgroundImage: ACCENT_GRADIENT }}
                          >
                            <Save size={18} />
                            {isSubmitting ? 'Updating...' : 'Update Employee'}
                          </button>
                        </>
                      )}
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Employee Details Modal */}
      {showEmployeeDetails && selectedEmployeeDetails && (
        <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-[10001] flex items-center justify-center p-4">
          <div className="bg-card rounded-xl max-w-5xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="sticky top-0 bg-card border-b border-theme px-6 py-4 flex items-center justify-between z-10">
              <div className="flex items-center space-x-3">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg"
                  style={{ background: ACCENT_GRADIENT }}
                >
                  {selectedEmployeeDetails.name?.charAt(0) || '?'}
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-primary">{selectedEmployeeDetails.name}</h2>
                  <p className="text-sm text-secondary">{selectedEmployeeDetails.internalId}</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowEmployeeDetails(false);
                  setSelectedEmployeeDetails(null);
                }}
                className="text-secondary hover:text-secondary transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Employee Information */}
              <div>
                <h3 className="text-lg font-semibold text-primary mb-4 flex items-center gap-2">
                  <User className="w-5 h-5" style={{ color: ACCENT_PRIMARY }} />
                  <span>Employee Information</span>
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-secondary mb-1">Role</p>
                    <p className="text-sm font-medium text-primary">{getRoleDisplayName(selectedEmployeeDetails.role)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-secondary mb-1">Status</p>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${selectedEmployeeDetails.status === 'active'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                      }`}>
                      {selectedEmployeeDetails.status}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm text-secondary mb-1">Email</p>
                    <p className="text-sm font-medium text-primary">{selectedEmployeeDetails.email}</p>
                  </div>
                  <div>
                    <p className="text-sm text-secondary mb-1">Phone</p>
                    <p className="text-sm font-medium text-primary">{selectedEmployeeDetails.phone}</p>
                  </div>
                  <div>
                    <p className="text-sm text-secondary mb-1">Country</p>
                    <p className="text-sm font-medium text-primary">{selectedEmployeeDetails.country}</p>
                  </div>
                  <div>
                    <p className="text-sm text-secondary mb-1">Location</p>
                    <p className="text-sm font-medium text-primary">
                      {selectedEmployeeDetails.city && selectedEmployeeDetails.state
                        ? `${selectedEmployeeDetails.city}, ${selectedEmployeeDetails.state}`
                        : selectedEmployeeDetails.location?.address || '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-secondary mb-1">Join Date</p>
                    <p className="text-sm font-medium text-primary">
                      {new Date(selectedEmployeeDetails.joinDate).toLocaleDateString()}
                    </p>
                  </div>
                  {selectedEmployeeDetails.location?.address && (
                    <div className="col-span-2">
                      <p className="text-sm text-secondary mb-1">Address</p>
                      <p className="text-sm font-medium text-primary">{selectedEmployeeDetails.location.address}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Documents Section */}
              <div>
                <h3 className="text-lg font-semibold text-primary mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5" style={{ color: ACCENT_PRIMARY }} />
                  <span>Documents ({selectedEmployeeDetails.documents?.length || 0})</span>
                </h3>
                {!selectedEmployeeDetails.documents || selectedEmployeeDetails.documents.length === 0 ? (
                  <div className="text-center py-8 border-2 border-dashed border-theme rounded-lg">
                    <FileText className="w-12 h-12 text-secondary mx-auto mb-3" />
                    <p className="text-secondary">No documents uploaded for this employee</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-card border-b border-theme">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-secondary uppercase">Document Type</th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-secondary uppercase">Status</th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-secondary uppercase">Document Number</th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-secondary uppercase">Issue Date</th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-secondary uppercase">Expiry Date</th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-secondary uppercase">File Size</th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-secondary uppercase">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-theme">
                        {selectedEmployeeDetails.documents.map((doc: EmployeeDocument, index: number) => (
                          <tr key={doc._id || index} className="hover:bg-[rgba(255,255,255,0.03)]">
                            <td className="px-4 py-2.5">
                              <div className="flex items-center space-x-2">
                                <FileText className="w-4 h-4 text-secondary" />
                                <span className="text-sm font-medium text-primary">{doc.documentType}</span>
                              </div>
                            </td>
                            <td className="px-4 py-2.5">
                              <span className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(doc.status)}`}>
                                {getStatusIcon(doc.status)}
                                <span className="capitalize">{doc.status}</span>
                              </span>
                            </td>
                            <td className="px-4 py-2.5">
                              <span className="text-sm text-secondary">{doc.documentNumber || '-'}</span>
                            </td>
                            <td className="px-4 py-2.5">
                              <span className="text-sm text-secondary">
                                {doc.issueDate ? new Date(doc.issueDate).toLocaleDateString() : '-'}
                              </span>
                            </td>
                            <td className="px-4 py-2.5">
                              <span className={`text-sm ${!doc.expiryDate ? 'text-secondary' : 'text-secondary'}`}>
                                {doc.expiryDate ? new Date(doc.expiryDate).toLocaleDateString() : '-'}
                              </span>
                            </td>
                            <td className="px-4 py-2.5">
                              <span className="text-sm text-secondary">
                                {doc.fileSize ? formatFileSize(doc.fileSize) : '-'}
                              </span>
                            </td>
                            <td className="px-4 py-2.5">
                              <div className="flex items-center space-x-2">
                                {doc.fileUrl && (
                                  <button
                                    onClick={async (e) => {
                                      e.stopPropagation();
                                      try {
                                        const signedRes = await getSignedEmployeeDocumentUrl(doc._id, 'attachment');
                                        const url = signedRes?.success && signedRes?.url ? signedRes.url : doc.fileUrl;
                                        if (url) {
                                          const link = window.document.createElement('a');
                                          link.href = url;
                                          link.download = doc.fileName || 'document';
                                          link.target = '_blank';
                                          window.document.body.appendChild(link);
                                          link.click();
                                          window.document.body.removeChild(link);
                                        } else {
                                          addNotification('error', 'Document URL not available');
                                        }
                                      } catch (error: any) {
                                        console.error('Download error:', error);
                                        // Fallback to original URL if signed URL fails
                                        if (doc.fileUrl) {
                                          try {
                                            const link = window.document.createElement('a');
                                            link.href = doc.fileUrl;
                                            link.download = doc.fileName || 'document';
                                            link.target = '_blank';
                                            window.document.body.appendChild(link);
                                            link.click();
                                            window.document.body.removeChild(link);
                                          } catch (fallbackError) {
                                            addNotification('error', 'Download failed. Please try again.');
                                          }
                                        } else {
                                          addNotification('error', 'Download failed. Please try again.');
                                        }
                                      }
                                    }}
                                    className="p-2 hover:bg-green-50 rounded-lg text-green-600 transition-colors"
                                    title="Download Document"
                                  >
                                    <Download className="w-4 h-4" />
                                  </button>
                                )}
                                <button
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    try {
                                      const signedRes = await getSignedEmployeeDocumentUrl(doc._id, 'inline');
                                      const url = signedRes?.success && signedRes?.url ? signedRes.url : doc.fileUrl;
                                      if (url) {
                                        window.open(url, '_blank', 'noopener,noreferrer');
                                      } else {
                                        addNotification('error', 'Document URL not available');
                                      }
                                    } catch (error: any) {
                                      console.error('View error:', error);
                                      // Fallback to original URL if signed URL fails
                                      if (doc.fileUrl) {
                                        try {
                                          window.open(doc.fileUrl, '_blank', 'noopener,noreferrer');
                                        } catch (fallbackError) {
                                          addNotification('error', 'Failed to open document. Please try again.');
                                        }
                                      } else {
                                        addNotification('error', 'Failed to open document. Please try again.');
                                      }
                                    }
                                  }}
                                  className="p-2 hover:bg-blue-50 rounded-lg text-[#00D1FF] transition-colors"
                                  title="View Document"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            <div className="sticky bottom-0 bg-card border-t border-theme px-6 py-4 flex items-center justify-end gap-3">
              <button
                onClick={() => {
                  setShowEmployeeDetails(false);
                  setSelectedEmployeeDetails(null);
                }}
                className="px-6 py-2 border border-theme rounded-lg hover:bg-[rgba(255,255,255,0.03)] transition-colors font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm.show && (
        <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-[10001] flex items-center justify-center p-4">
          <div className="bg-card rounded-xl max-w-md w-full shadow-2xl">
            <div className="p-6">
              <h2 className="text-2xl font-bold text-primary mb-4">Confirm Delete</h2>
              <p className="text-secondary mb-6">Are you sure you want to delete this employee? This action cannot be undone.</p>
              <div className="flex justify-end space-x-4">
                <button
                  onClick={() => setDeleteConfirm({ show: false, employeeId: null })}
                  className="px-6 py-3 !mr-3 text-primary bg-card hover:bg-gray-200 rounded-lg transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  className="px-6 py-3 bg-red-600 hover:bg-red-700 !text-white rounded-lg transition-colors font-medium"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slide-in {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        .animate-slide-in {
          animation: slide-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

export default EmployeesPage;

