import { useState, useEffect } from 'react';
import { Plus, Receipt, DollarSign, Calendar, User, FileText, Filter, Edit, Trash2, Eye, Building2, Users, Settings, X, Truck, Package } from 'lucide-react';
import { FaCheckCircle, FaExclamationCircle, FaInfoCircle, FaTimes } from 'react-icons/fa';
import { createExpense, listExpenses, updateExpense, deleteExpense, getExpenseReceiptSignedUrl, extractReceiptData, listExpenseCategories, createExpenseCategory, updateExpenseCategory, deleteExpenseCategory, listExpenseTypes, createExpenseType, updateExpenseType, deleteExpenseType } from "../../../../axios/api/account.expense";
import { getEmployees } from "../../../../axios/api/account.payroll";
import { listFleetUnits } from "../../../../axios/api/fleet.units";
import ConfirmationModal from "../../../../components/common/ConfirmationModal";

interface Employee {
  _id: string;
  name: string;
  role?: string;
  position?: string;
}

interface Expense {
  _id: string;
  userId?: Employee | string;
  type: string | ExpenseType; // Can be string (backward compatibility) or populated ExpenseType object
  typeId?: string | ExpenseType; // New field for dynamic types
  categoryId?: string;
  category?: ExpenseCategory;
  amount: number;
  description?: string;
  date?: string | Date;
  receiptUrl?: string;
  truckId?: string;
  trailerId?: string;
  vehicle?: any; // Vehicle object from API (for backward compatibility)
  trailer?: any; // Trailer object from API (for backward compatibility)
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

interface FleetUnit {
  _id: string;
  unitNo?: string;
  unitNumber?: string;
  internalId?: string;
  plateNumber?: string;
  unitType?: string;
  make?: string;
  model?: string;
}

interface ExpenseCategory {
  _id: string;
  name: string;
  status: 'active' | 'inactive';
  createdAt?: string;
  updatedAt?: string;
}

interface ExpenseType {
  _id: string;
  name: string;
  categoryId: string;
  category?: ExpenseCategory;
  status: 'active' | 'inactive';
  createdAt?: string;
  updatedAt?: string;
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
    info: <FaInfoCircle className="text-[#9793E4]" size={24} />
  };

  const bgColors = {
    success: 'bg-green-50 border-green-200',
    error: 'bg-card border-red-200',
    info: 'bg-[#9793E4]/10 border-[#9793E4]/30'
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      onClose(notification.id);
    }, 5000);
    return () => clearTimeout(timer);
  }, [notification.id, onClose]);

  return (
    <div className={`flex items-start gap-3 p-4 rounded-lg border-2 shadow-lg ${bgColors[notification.type]} animate-slide-in`}>
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

const ExpensesPage = () => {
  const [activeTab, setActiveTab] = useState('list');
  const [filterType, setFilterType] = useState('all');
  const [selectedCategoryTab, setSelectedCategoryTab] = useState<string>('all');
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [expenseTypes, setExpenseTypes] = useState<ExpenseType[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingTypes, setLoadingTypes] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [viewingExpense, setViewingExpense] = useState<Expense | null>(null);
  const [receiptSignedUrl, setReceiptSignedUrl] = useState<string | null>(null);
  const [loadingReceiptUrl, setLoadingReceiptUrl] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [emptyStateMessage, setEmptyStateMessage] = useState<string | null>(null);
  const [extractingReceipt, setExtractingReceipt] = useState(false);
  const [totalPayroll, setTotalPayroll] = useState<number>(0);

  // Category Management States
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showTypeModal, setShowTypeModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ExpenseCategory | null>(null);
  const [editingType, setEditingType] = useState<ExpenseType | null>(null);
  const [categoryFormData, setCategoryFormData] = useState({ name: '', status: 'active' as 'active' | 'inactive' });
  const [typeFormData, setTypeFormData] = useState({ name: '', categoryId: '', status: 'active' as 'active' | 'inactive' });
  const [savingCategory, setSavingCategory] = useState(false);
  const [savingType, setSavingType] = useState(false);
  const [deleteCategoryConfirm, setDeleteCategoryConfirm] = useState<{ show: boolean; category: ExpenseCategory | null }>({ show: false, category: null });
  const [deleteTypeConfirm, setDeleteTypeConfirm] = useState<{ show: boolean; type: ExpenseType | null }>({ show: false, type: null });

  const [formData, setFormData] = useState<{
    userId: string;
    categoryId: string;
    type: string; // Keep for backward compatibility
    typeId: string; // New field for dynamic types
    amount: string;
    description: string;
    date: string;
    receiptFile: File | null;
    truckId: string;
    trailerId: string;
  }>({
    userId: '',
    categoryId: '',
    type: '',
    typeId: '',
    amount: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    receiptFile: null,
    truckId: '',
    trailerId: ''
  });

  const [trucks, setTrucks] = useState<FleetUnit[]>([]);
  const [trailers, setTrailers] = useState<FleetUnit[]>([]);
  const [loadingFleet, setLoadingFleet] = useState(false);

  // Fetch expenses on component mount
  useEffect(() => {
    fetchExpenses();
    fetchEmployees();
    fetchDashboardData();
    fetchCategories();
    fetchFleetUnits();
  }, []);

  const fetchFleetUnits = async () => {
    setLoadingFleet(true);
    try {
      const [trucksRes, trailersRes] = await Promise.all([
        listFleetUnits({ category: 'trucks' }),
        listFleetUnits({ category: 'trailers' })
      ]);

      if (trucksRes?.success && Array.isArray(trucksRes.data)) {
        setTrucks(trucksRes.data);
      }

      if (trailersRes?.success && Array.isArray(trailersRes.data)) {
        setTrailers(trailersRes.data);
      }
    } catch (error: any) {
      console.error('Error fetching fleet units:', error);
    } finally {
      setLoadingFleet(false);
    }
  };

  // Fetch expense types when category is selected
  useEffect(() => {
    if (formData.categoryId) {
      // Ensure categoryId is a string
      const categoryIdStr = typeof formData.categoryId === 'string'
        ? formData.categoryId
        : (formData.categoryId as any)?._id || String(formData.categoryId);
      if (categoryIdStr) {
        fetchExpenseTypes(categoryIdStr);
      }
    } else {
      setExpenseTypes([]);
      setFormData(prev => ({ ...prev, type: '', typeId: '' }));
    }
  }, [formData.categoryId]);

  const fetchDashboardData = async () => {
    try {
      const { getAccountsDashboard } = await import('../../../../axios/api/account.dashboard');
      const dashboardRes = await getAccountsDashboard();
      if (dashboardRes?.success && dashboardRes.data) {
        setTotalPayroll(dashboardRes.data.totalPayroll ?? 0);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await listExpenseCategories();
      if (response?.success && Array.isArray(response.data)) {
        setCategories(response.data.filter((cat: ExpenseCategory) => cat.status === 'active'));
      } else {
        // If API doesn't exist yet, use default categories
        setCategories([
          { _id: 'vehicle', name: 'Vehicle Expenses', status: 'active' },
          { _id: 'office', name: 'Office Expenses', status: 'active' },
          { _id: 'rental', name: 'Rental Expenses', status: 'active' },
          { _id: 'misc', name: 'Miscellaneous Expenses', status: 'active' }
        ]);
      }
    } catch (error: any) {
      console.error('Error fetching categories:', error);
      // Use default categories on error
      setCategories([
        { _id: 'vehicle', name: 'Vehicle Expenses', status: 'active' },
        { _id: 'office', name: 'Office Expenses', status: 'active' },
        { _id: 'rental', name: 'Rental Expenses', status: 'active' },
        { _id: 'misc', name: 'Miscellaneous Expenses', status: 'active' }
      ]);
    }
  };

  const fetchExpenseTypes = async (categoryId: string | object) => {
    setLoadingTypes(true);
    try {
      // Ensure categoryId is a string (extract _id if it's an object)
      let categoryIdStr = '';
      if (typeof categoryId === 'string') {
        categoryIdStr = categoryId;
      } else if (categoryId && typeof categoryId === 'object' && categoryId !== null) {
        categoryIdStr = (categoryId as any)._id || String(categoryId);
      }

      if (!categoryIdStr || categoryIdStr.trim() === '') {
        setExpenseTypes([]);
        setLoadingTypes(false);
        return;
      }

      const response = await listExpenseTypes(categoryIdStr);
      if (response?.success && Array.isArray(response.data)) {
        // Normalize categoryId to string for all types
        const normalizedTypes = response.data.map((type: any) => ({
          ...type,
          categoryId: type.categoryId?._id || type.categoryId?.toString() || type.categoryId || ''
        }));
        // Show all types (both active and inactive) for management, but filter active ones for selection
        setExpenseTypes(normalizedTypes);
      } else {
        // If API doesn't exist yet, use default types based on category
        const defaultTypes: Record<string, ExpenseType[]> = {
          'office': [
            { _id: 'office-rent', name: 'Office Rent', categoryId: 'office', status: 'active' },
            { _id: 'electricity', name: 'Electricity', categoryId: 'office', status: 'active' },
            { _id: 'internet', name: 'Internet', categoryId: 'office', status: 'active' },
            { _id: 'stationery', name: 'Stationery', categoryId: 'office', status: 'active' }
          ],
          'rental': [
            { _id: 'warehouse-rent', name: 'Warehouse Rent', categoryId: 'rental', status: 'active' },
            { _id: 'equipment-rent', name: 'Equipment Rent', categoryId: 'rental', status: 'active' }
          ],
          'misc': [
            { _id: 'misc-expense', name: 'Misc Expense', categoryId: 'misc', status: 'active' },
            { _id: 'one-time-cost', name: 'One-time Cost', categoryId: 'misc', status: 'active' }
          ],
          'vehicle': [
            { _id: 'fuel', name: 'Fuel', categoryId: 'vehicle', status: 'active' },
            { _id: 'maintenance', name: 'Maintenance', categoryId: 'vehicle', status: 'active' },
            { _id: 'repair', name: 'Repair', categoryId: 'vehicle', status: 'active' }
          ]
        };
        const categoryIdStr = typeof categoryId === 'string' ? categoryId : (categoryId as any)?._id || String(categoryId);
        setExpenseTypes(defaultTypes[categoryIdStr] || []);
      }
    } catch (error: any) {
      console.error('Error fetching expense types:', error);
      setExpenseTypes([]);
    } finally {
      setLoadingTypes(false);
    }
  };

  // Category Management Functions
  const handleOpenCategoryModal = (category?: ExpenseCategory) => {
    if (category) {
      setEditingCategory(category);
      setCategoryFormData({ name: category.name, status: category.status });
    } else {
      setEditingCategory(null);
      setCategoryFormData({ name: '', status: 'active' });
    }
    setShowCategoryModal(true);
  };

  const handleSaveCategory = async () => {
    const name = categoryFormData.name.trim();
    if (!name) {
      addNotification('error', 'Category name is required');
      return;
    }

    setSavingCategory(true);
    try {
      let response;
      if (editingCategory) {
        response = await updateExpenseCategory(editingCategory._id, { name, status: categoryFormData.status });
      } else {
        response = await createExpenseCategory({ name, status: categoryFormData.status });
      }

      if (response?.success) {
        addNotification('success', editingCategory ? 'Category updated successfully' : 'Category created successfully');
        setShowCategoryModal(false);
        setEditingCategory(null);
        setCategoryFormData({ name: '', status: 'active' });
        await fetchCategories();
      } else {
        addNotification('error', response?.message || 'Failed to save category');
      }
    } catch (error: any) {
      console.error('Error saving category:', error);
      addNotification('error', error?.message || 'Failed to save category');
    } finally {
      setSavingCategory(false);
    }
  };

  const handleDeleteCategory = async () => {
    if (!deleteCategoryConfirm.category) return;

    setLoading(true);
    try {
      const response = await deleteExpenseCategory(deleteCategoryConfirm.category._id);
      if (response?.success) {
        addNotification('success', 'Category deleted successfully');
        setDeleteCategoryConfirm({ show: false, category: null });
        await fetchCategories();
      } else {
        addNotification('error', response?.message || 'Failed to delete category');
      }
    } catch (error: any) {
      console.error('Error deleting category:', error);
      addNotification('error', error?.message || 'Failed to delete category');
    } finally {
      setLoading(false);
    }
  };

  // Expense Type Management Functions
  const handleOpenTypeModal = async (type?: ExpenseType) => {
    if (type) {
      // Normalize categoryId to string
      const categoryId = type.categoryId?.toString() || type.categoryId || '';
      setEditingType(type);
      setTypeFormData({ name: type.name, categoryId: categoryId, status: type.status });
      // Fetch types for the category
      if (categoryId) {
        await fetchExpenseTypes(categoryId);
      }
    } else {
      setEditingType(null);
      setTypeFormData({ name: '', categoryId: '', status: 'active' });
      setExpenseTypes([]);
    }
    setShowTypeModal(true);
  };

  const handleSaveType = async () => {
    const name = typeFormData.name.trim();
    if (!name) {
      addNotification('error', 'Expense type name is required');
      return;
    }
    if (!typeFormData.categoryId) {
      addNotification('error', 'Please select a category');
      return;
    }

    setSavingType(true);
    try {
      let response;
      if (editingType) {
        response = await updateExpenseType(editingType._id, {
          name,
          categoryId: typeFormData.categoryId,
          status: typeFormData.status
        });
      } else {
        response = await createExpenseType({
          name,
          categoryId: typeFormData.categoryId,
          status: typeFormData.status
        });
      }

      if (response?.success) {
        addNotification('success', editingType ? 'Expense type updated successfully' : 'Expense type created successfully');
        // Refresh types for the category that was just modified
        if (typeFormData.categoryId) {
          await fetchExpenseTypes(typeFormData.categoryId);
        }
        // Also refresh types if we're viewing a category in the expense form
        if (formData.categoryId) {
          await fetchExpenseTypes(formData.categoryId);
        }
        await fetchCategories();
        // Keep modal open if editing, close if creating new
        if (!editingType) {
          setShowTypeModal(false);
          setEditingType(null);
          setTypeFormData({ name: '', categoryId: '', status: 'active' });
        }
      } else {
        addNotification('error', response?.message || 'Failed to save expense type');
      }
    } catch (error: any) {
      console.error('Error saving expense type:', error);
      addNotification('error', error?.message || 'Failed to save expense type');
    } finally {
      setSavingType(false);
    }
  };

  const handleDeleteType = async () => {
    if (!deleteTypeConfirm.type) return;

    setLoading(true);
    try {
      const deletedType = deleteTypeConfirm.type;
      const categoryId = deletedType.categoryId?.toString() || deletedType.categoryId || '';

      const response = await deleteExpenseType(deletedType._id);
      if (response?.success) {
        addNotification('success', 'Expense type deleted successfully');
        setDeleteTypeConfirm({ show: false, type: null });

        // Refresh types for the category that had the deleted type
        if (categoryId) {
          await fetchExpenseTypes(categoryId);
        }
        // Also refresh types if we're viewing a category in the expense form
        if (formData.categoryId) {
          await fetchExpenseTypes(formData.categoryId);
        }
      } else {
        addNotification('error', response?.message || 'Failed to delete expense type');
      }
    } catch (error: any) {
      console.error('Error deleting expense type:', error);
      addNotification('error', error?.message || 'Failed to delete expense type');
    } finally {
      setLoading(false);
    }
  };

  const getLocalUserInfo = () => {
    const userInfoString = localStorage.getItem('userInfo');
    if (!userInfoString) return null;
    try {
      return JSON.parse(userInfoString);
    } catch (err) {
      console.error('Error parsing userInfo from localStorage:', err);
      return null;
    }
  };

  const fetchExpenses = async () => {
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
        setEmptyStateMessage(null);
        setExpenses([]);
        return;
      }

      const response = await listExpenses();
      if (response?.success && Array.isArray(response.data)) {
        setExpenses(response.data);
        if (response.message && response.data.length === 0) {
          setEmptyStateMessage(response.message);
        } else {
          setEmptyStateMessage(null);
        }
      } else {
        setExpenses([]);
        const message = response?.message || 'Failed to fetch expenses';
        setEmptyStateMessage(message);
        addNotification('error', message);
      }
    } catch (error: any) {
      console.error('Error fetching expenses:', error);
      setExpenses([]);
      const message = error?.message || 'Failed to fetch expenses';
      setEmptyStateMessage(message);
      addNotification('error', message);
    } finally {
      setLoading(false);
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
      if (response && response.data) {
        setEmployees(response.data);
      } else if (response?.message) {
        addNotification('error', response.message);
      }
    } catch (error: any) {
      console.error('Error fetching employees:', error);
      addNotification('error', error?.message || 'Failed to fetch employees');
    }
  };

  const addNotification = (type: NotificationType, message: string) => {
    const id = Date.now();
    setNotifications(prev => [...prev, { id, type, message }]);
  };

  const removeNotification = (id: number) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    const files = (e.target as HTMLInputElement).files;
    if (name === 'receiptFile' && files) {
      setFormData(prev => ({ ...prev, [name]: files[0] }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleExtractReceipt = async (file: File) => {
    setExtractingReceipt(true);
    try {
      const response = await extractReceiptData(file);
      if (response && response.success && response.data) {
        const extracted = response.data;

        // Populate form fields with extracted data
        setFormData(prev => ({
          ...prev,
          amount: extracted.amount ? extracted.amount.toString() : prev.amount,
          description: extracted.description || extracted.notes || prev.description,
          type: extracted.type || prev.type,
          date: extracted.date || prev.date,
          receiptFile: file // Keep the file
        }));

        addNotification('success', 'Receipt data extracted successfully! Please review and adjust the fields as needed.');
      } else {
        addNotification('error', response?.message || 'Failed to extract data from receipt. Please enter the information manually.');
      }
    } catch (error: any) {
      console.error('Error extracting receipt:', error);
      addNotification('error', error?.message || 'Failed to extract receipt data. Please try again or enter information manually.');
    } finally {
      setExtractingReceipt(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const formDataToSend = new FormData();
      formDataToSend.append('userId', formData.userId);
      formDataToSend.append('categoryId', formData.categoryId);
      // Use typeId if available (dynamic type), otherwise use type (backward compatibility)
      if (formData.typeId) {
        formDataToSend.append('typeId', formData.typeId);
      } else if (formData.type) {
        formDataToSend.append('type', formData.type);
      }
      formDataToSend.append('amount', formData.amount);
      formDataToSend.append('description', formData.description);
      formDataToSend.append('date', formData.date);

      if (formData.truckId) {
        formDataToSend.append('truckId', formData.truckId);
      }
      if (formData.trailerId) {
        formDataToSend.append('trailerId', formData.trailerId);
      }

      if (formData.receiptFile) {
        formDataToSend.append('receipt', formData.receiptFile);
      }

      if (editingExpense) {
        const response = await updateExpense(editingExpense._id, formDataToSend);
        if (response && response.success) {
          addNotification('success', response.message || 'Expense updated successfully!');
          setEditingExpense(null);
          // Reset form and refresh list
          setFormData({
            userId: '',
            categoryId: '',
            type: '',
            typeId: '',
            amount: '',
            description: '',
            date: new Date().toISOString().split('T')[0],
            receiptFile: null,
            truckId: '',
            trailerId: ''
          });
          setActiveTab('list');
          fetchExpenses();
        } else {
          addNotification('error', response?.message || 'Failed to update expense. Please try again.');
        }
      } else {
        const response = await createExpense(formDataToSend);
        if (response && response.success) {
          addNotification('success', response.message || 'Expense created successfully!');
          // Reset form and refresh list
          setFormData({
            userId: '',
            categoryId: '',
            type: '',
            typeId: '',
            amount: '',
            description: '',
            date: new Date().toISOString().split('T')[0],
            receiptFile: null,
            truckId: '',
            trailerId: ''
          });
          setActiveTab('list');
          fetchExpenses();
        } else {
          addNotification('error', response?.message || 'Failed to create expense. Please try again.');
        }
      }
    } catch (error: any) {
      console.error('Error submitting expense:', error);
      addNotification('error', error?.message || 'Failed to save expense. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (expense: Expense) => {
    setEditingExpense(expense);
    const userIdValue = typeof expense.userId === 'object' && expense.userId !== null
      ? expense.userId._id
      : expense.userId || '';
    const categoryId = expense.categoryId || (expense.category?._id) || '';
    // Ensure categoryId is a string
    const categoryIdStr = typeof categoryId === 'string'
      ? categoryId
      : (categoryId as any)?._id || String(categoryId);
    // Get typeId if available (from typeId field or from type object)
    const typeId = (expense as any).typeId || (typeof (expense as any).type === 'object' && (expense as any).type?._id) || '';
    setFormData({
      userId: userIdValue,
      categoryId: categoryIdStr,
      type: typeof expense.type === 'string' ? expense.type : (expense.type as any)?.name || '',
      typeId: typeId,
      amount: expense.amount.toString(),
      description: expense.description || '',
      date: expense.date ? new Date(expense.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      receiptFile: null,
      truckId: (() => {
        // Try truckId first
        if ((expense as any).truckId) return (expense as any).truckId;
        // Try vehicle object
        if (expense.vehicle && typeof expense.vehicle === 'object' && expense.vehicle !== null) {
          return (expense.vehicle as any)._id || '';
        }
        // Try vehicle as string/ID
        if ((expense as any).vehicle) return String((expense as any).vehicle);
        return '';
      })(),
      trailerId: (() => {
        // Try trailerId first
        if ((expense as any).trailerId) return (expense as any).trailerId;
        // Try trailer object
        if (expense.trailer && typeof expense.trailer === 'object' && expense.trailer !== null) {
          return (expense.trailer as any)._id || '';
        }
        // Try trailer as string/ID
        if ((expense as any).trailer) return String((expense as any).trailer);
        return '';
      })()
    });
    // Fetch types for the category
    if (categoryIdStr) {
      fetchExpenseTypes(categoryIdStr);
    }
    setActiveTab('create');
  };

  const [deleteConfirm, setDeleteConfirm] = useState<{ show: boolean; expenseId: string | null }>({ show: false, expenseId: null });

  const handleDelete = async (id: string) => {
    setDeleteConfirm({ show: true, expenseId: id });
  };

  const confirmDeleteExpense = async () => {
    if (!deleteConfirm.expenseId) return;

    setLoading(true);
    try {
      const response = await deleteExpense(deleteConfirm.expenseId);
      if (response && response.success) {
        addNotification('success', response.message || 'Expense deleted successfully!');
        fetchExpenses();
      } else {
        addNotification('error', response?.message || 'Failed to delete expense. Please try again.');
      }
    } catch (error: any) {
      console.error('Error deleting expense:', error);
      addNotification('error', error?.message || 'Failed to delete expense. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleView = async (expense: Expense) => {
    setViewingExpense(expense);
    setShowViewModal(true);
    setReceiptSignedUrl(null);

    // Fetch signed URL for receipt if available
    if (expense.receiptUrl) {
      setLoadingReceiptUrl(true);
      try {
        const response = await getExpenseReceiptSignedUrl(expense._id, 'inline');
        if (response?.success && response?.url) {
          setReceiptSignedUrl(response.url);
        } else {
          // Fallback to original URL if signed URL generation fails
          setReceiptSignedUrl(expense.receiptUrl);
        }
      } catch (error) {
        console.error('Error fetching signed URL:', error);
        // Fallback to original URL on error
        setReceiptSignedUrl(expense.receiptUrl);
      } finally {
        setLoadingReceiptUrl(false);
      }
    }
  };

  const handleCancel = () => {
    setEditingExpense(null);
    setFormData({
      userId: '',
      categoryId: '',
      type: '',
      typeId: '',
      amount: '',
      description: '',
      date: new Date().toISOString().split('T')[0],
      receiptFile: null,
      truckId: '',
      trailerId: ''
    });
    setExpenseTypes([]);
    setActiveTab('list');
  };

  const getTypeName = (expense: Expense): string => {
    // Check if type is populated object (from typeId)
    if (typeof expense.type === 'object' && expense.type !== null) {
      return (expense.type as any).name || 'Unknown Type';
    }
    // Check if typeId is populated
    if ((expense as any).typeId && typeof (expense as any).typeId === 'object') {
      return (expense as any).typeId.name || 'Unknown Type';
    }
    // Fallback to type string
    return expense.type || 'Unknown Type';
  };

  const getCategoryName = (expense: Expense): string => {
    // Check if category is populated object
    if (expense.category && typeof expense.category === 'object') {
      return expense.category.name || 'Unknown Category';
    }
    // Check if categoryId is populated
    if ((expense as any).categoryId && typeof (expense as any).categoryId === 'object') {
      return (expense as any).categoryId.name || 'Unknown Category';
    }
    // Try to find category from categories list
    if (expense.categoryId) {
      const category = categories.find(cat => cat._id === expense.categoryId);
      return category?.name || 'Unknown Category';
    }
    return 'Unknown Category';
  };

  const getTypeColor = (typeName: string) => {
    const typeMap: Record<string, string> = {
      'Fuel Expense (Fuel)': 'bg-blue-100 text-blue-800',
      'Tractor Fuel (Fuel)': 'bg-blue-100 text-blue-800',
      'Trailer Fuel (Fuel)': 'bg-blue-100 text-blue-800',
      'Reefer Fuel (Fuel)': 'bg-blue-100 text-blue-800',
      'DEF Pump (Fuel)': 'bg-blue-100 text-blue-800',
      'Maintenance': 'bg-green-100 text-green-800',
      'Truck Repair': 'bg-green-100 text-green-800',
      'Trailer Repair': 'bg-green-100 text-green-800',
      'Cash': 'bg-purple-100 text-purple-800',
      'Cash Advance': 'bg-purple-100 text-purple-800',
    };
    return typeMap[typeName] || 'bg-card text-primary';
  };

  const getTypeIcon = (typeName: string) => {
    if (typeName && typeName.includes('Fuel')) return '⛽';
    if (typeName && typeName.includes('Repair')) return '🔧';
    if (typeName && typeName.includes('Cash')) return '💰';
    return '📄';
  };

  const getEmployeeName = (userId: Expense['userId']): string => {
    if (typeof userId === 'object' && userId !== null) {
      return userId.name || 'Unknown User';
    }
    const employee = employees.find(emp => emp._id === userId);
    return employee?.name || 'Unknown User';
  };

  const getEmployeeRole = (userId: Expense['userId']): string | undefined => {
    if (typeof userId === 'object' && userId !== null) {
      return userId.role;
    }
    const employee = employees.find(emp => emp._id === userId);
    return employee?.role || employee?.position;
  };

  const filteredExpenses = expenses.filter(expense => {
    // Category matching - handle both string and object categoryId
    if (selectedCategoryTab !== 'all') {
      const selectedCategoryIdStr = String(selectedCategoryTab);

      // Get expense category ID - handle both string and populated object
      let expenseCategoryId: string | null = null;
      if (expense.categoryId) {
        if (typeof expense.categoryId === 'string') {
          expenseCategoryId = expense.categoryId;
        } else if (typeof expense.categoryId === 'object' && expense.categoryId !== null) {
          expenseCategoryId = String((expense.categoryId as any)._id || expense.categoryId);
        }
      }

      // Get populated category object ID
      let expenseCategoryObjId: string | null = null;
      if (expense.category) {
        if (typeof expense.category === 'object' && expense.category !== null) {
          expenseCategoryObjId = String(expense.category._id || (expense.category as any)._id);
        }
      }

      // Compare normalized strings
      const categoryMatch = (expenseCategoryId && String(expenseCategoryId) === selectedCategoryIdStr) ||
        (expenseCategoryObjId && String(expenseCategoryObjId) === selectedCategoryIdStr);

      if (!categoryMatch) {
        return false;
      }
    }

    // Type matching - handle both string and object type (legacy filter)
    if (filterType !== 'all') {
      const expenseTypeName = typeof expense.type === 'string'
        ? expense.type
        : (expense.type as any)?.name;
      const expenseTypeIdName = typeof expense.typeId === 'object' && expense.typeId !== null
        ? (expense.typeId as any)?.name
        : null;

      const typeMatch = expenseTypeName === filterType || expenseTypeIdName === filterType;
      if (!typeMatch) {
        return false;
      }
    }

    return true;
  });

  const totalAmount = filteredExpenses.reduce((sum, expense) => sum + (expense.amount || 0), 0);

  // Legacy expense types for filtering (will be replaced by dynamic types)
  const legacyExpenseTypes = [
    'Additives',
    'Cash',
    'Cash Advance',
    'DEF Pump (Fuel)',
    'DEF',
    'Fuel Expense (Fuel)',
    'Maintenance',
    'Misc',
    'Reefer Fuel (Fuel)',
    'Scales',
    'Tire Change & Rotation',
    'Tractor Fuel (Fuel)',
    'Trailer Fuel (Fuel)',
    'Trailer Repair',
    'Trailer Service',
    'Truck and Trailer Parts',
    'Truck Repair',
    'Truck Service'
  ];

  if (loading && !emptyStateMessage) {
    return (
      <div className="min-h-screen bg-main flex flex-col items-center justify-center text-center space-y-4">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--accent-blue)]"></div>
        <p className="text-[#063f6f]">Loading expenses...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 bg-main">
      <style>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
      <div className="w-full mx-auto p-2">
        {emptyStateMessage && (
          <div className="mb-6">
            <div className="flex items-start gap-3 rounded-xl border border-blue-200 bg-card px-4 py-3 text-sm text-blue-700 shadow-sm">
              <Building2 className="h-5 w-5 mt-0.5 text-blue-500" />
              <div className="flex-1">
                <p className="font-semibold text-blue-900">No expense data available</p>
                <p className="mt-1">{emptyStateMessage}</p>
                <button
                  onClick={fetchExpenses}
                  className="mt-3 inline-flex items-center rounded-lg border border-blue-400 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100 transition"
                >
                  Refresh Data
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-[var(--accent-navyblue)]" >Expense Management</h1>
              <p className="text-secondary mt-2">Track and manage all expenses</p>
            </div>
            <button
              onClick={() => {
                setEditingExpense(null);
                setFormData({
                  userId: '',
                  categoryId: selectedCategoryTab !== 'all' ? selectedCategoryTab : '',
                  type: '',
                  typeId: '',
                  amount: '',
                  description: '',
                  date: new Date().toISOString().split('T')[0],
                  receiptFile: null,
                  truckId: '',
                  trailerId: ''
                });
                if (selectedCategoryTab !== 'all') {
                  fetchExpenseTypes(selectedCategoryTab);
                }
                setActiveTab('create');
              }}
              className="!text-white px-4 py-2 rounded-lg hover:shadow-lg flex items-center gap-2 transition-all transform hover:scale-105"
              style={{ background: 'var(--accent-navyblue)' }}
            >
              <Plus size={20} />
              Add Expense
            </button>
          </div>
        </div>

        {/* Stats Cards - Dynamic based on categories */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">

          {/* 🔷 TOTAL EXPENSES */}
          <div className="bg-[var(--bg-card)] p-6 rounded-xl border border-[rgba(255,255,255,0.08)] shadow-sm hover:shadow-lg hover:shadow-[#42aeec]/10 transition-all duration-300">
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0 pr-2">
                <p className="text-secondary text-sm">Total Expenses</p>
                <p className="text-2xl font-bold text-primary">
                  ${totalAmount.toLocaleString()}
                </p>
              </div>
              <div className="bg-[rgba(66,174,236,0.1)] p-2.5 rounded-full">
                <DollarSign className="text-[var(--accent-blue)]" size={20} />
              </div>
            </div>
          </div>


          {/* 🔷 CATEGORY CARDS */}
          {categories.slice(0, 3).map((category, index) => {

            const categoryExpenses = expenses.filter(e => {
              const categoryIdStr = String(category._id);

              let expenseCategoryId: string | null = null;
              if (e.categoryId) {
                if (typeof e.categoryId === 'string') {
                  expenseCategoryId = e.categoryId;
                } else if (typeof e.categoryId === 'object' && e.categoryId !== null) {
                  expenseCategoryId = String((e.categoryId as any)._id || e.categoryId);
                }
              }

              let expenseCategoryObjId: string | null = null;
              if (e.category && typeof e.category === 'object') {
                expenseCategoryObjId = String(e.category._id);
              }

              return (
                (expenseCategoryId && expenseCategoryId === categoryIdStr) ||
                (expenseCategoryObjId && expenseCategoryObjId === categoryIdStr)
              );
            });

            const categoryTotal = categoryExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);

            // 🎨 HR STYLE COLORS
            const cardColors = [
              { accent: 'text-cyan-400', iconBg: 'bg-cyan-400/10', icon: '⛽' },
              { accent: 'text-green-400', iconBg: 'bg-green-400/10', icon: '🔧' },
              { accent: 'text-purple-400', iconBg: 'bg-purple-400/10', icon: '💰' }
            ];

            const colors = cardColors[index] || {
              accent: 'text-blue-400',
              iconBg: 'bg-blue-400/10',
              icon: '📊'
            };

            return (
              <div
                key={category._id}
                className="bg-[var(--bg-card)] p-6 rounded-xl border border-[rgba(255,255,255,0.08)] shadow-sm hover:shadow-lg hover:shadow-[#42aeec]/10 transition-all duration-300"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0 pr-2">
                    <p className="text-secondary text-sm">{category.name}</p>
                    <p className={`text-2xl font-bold ${colors.accent}`}>
                      ${categoryTotal.toLocaleString()}
                    </p>
                  </div>

                  <div className={`${colors.iconBg} p-2.5 rounded-full`}>
                    <span className="text-xl">{colors.icon}</span>
                  </div>
                </div>
              </div>
            );
          })}


          {/* 🔷 TOTAL PAYROLL */}
          <div className="bg-[var(--bg-card)] p-6 rounded-xl border border-[rgba(255,255,255,0.08)] shadow-sm hover:shadow-lg hover:shadow-[#42aeec]/10 transition-all duration-300">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-secondary text-sm mb-1">Total Payroll</p>
                <p className="text-2xl font-bold text-primary">
                  ${totalPayroll.toLocaleString()}
                </p>
              </div>

              <div className="bg-[rgba(66,174,236,0.1)] p-2.5 rounded-full">
                <Users className="text-[var(--accent-blue)]" size={20} />
              </div>
            </div>
          </div>

        </div>

        {/* Category Tabs */}
        <div className="bg-card rounded-xl border border-theme shadow-sm mb-6 overflow-hidden">
          <div className="px-6 py-4 flex items-center justify-between gap-4">
            {/* Scrollable Category Tabs */}
            <div className="flex-1 overflow-x-auto scrollbar-hide">
              <div className="flex gap-2 min-w-max pb-1">
                <button
                  onClick={() => setSelectedCategoryTab('all')}
                  className={`px-4 py-2.5 rounded-lg text-sm font-semibold whitespace-nowrap transition-all duration-200 ${selectedCategoryTab === 'all'
                    ? 'bg-card text-blue-700 border-2 border-blue-400 shadow-sm'
                    : 'bg-card text-secondary hover:bg-[rgba(255,255,255,0.03)] border-2 border-transparent hover:border-theme'
                    }`}
                >
                  All Expenses <span className="font-normal">({expenses.length})</span>
                </button>
                {categories.map((category) => {
                  const categoryExpenseCount = expenses.filter(e => {
                    // Check if expense belongs to this category
                    // Normalize all IDs to strings for comparison
                    const categoryIdStr = String(category._id);

                    // Get expense category ID - handle both string and populated object
                    let expenseCategoryId: string | null = null;
                    if (e.categoryId) {
                      if (typeof e.categoryId === 'string') {
                        expenseCategoryId = e.categoryId;
                      } else if (typeof e.categoryId === 'object' && e.categoryId !== null) {
                        expenseCategoryId = String((e.categoryId as any)._id || e.categoryId);
                      }
                    }

                    // Get populated category object ID
                    let expenseCategoryObjId: string | null = null;
                    if (e.category) {
                      if (typeof e.category === 'object' && e.category !== null) {
                        expenseCategoryObjId = String(e.category._id || (e.category as any)._id);
                      }
                    }

                    // Compare normalized strings
                    return (expenseCategoryId && String(expenseCategoryId) === categoryIdStr) ||
                      (expenseCategoryObjId && String(expenseCategoryObjId) === categoryIdStr);
                  }).length;
                  return (
                    <button
                      key={category._id}
                      onClick={() => setSelectedCategoryTab(category._id)}
                      className={`px-4 py-2.5 rounded-lg text-sm font-semibold whitespace-nowrap transition-all duration-200 ${selectedCategoryTab === category._id
                        ? 'bg-card text-blue-700 border-2 border-blue-400 shadow-sm'
                        : 'bg-card text-secondary hover:bg-[rgba(255,255,255,0.03)] border-2 border-transparent hover:border-theme'
                        }`}
                    >
                      {category.name} <span className="font-normal">({categoryExpenseCount})</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => handleOpenTypeModal()}
                className="px-4 py-2.5 text-sm font-medium text-primary bg-card border border-theme hover:bg-[rgba(255,255,255,0.03)] hover:border-gray-400 rounded-lg transition-all duration-200 flex items-center gap-2 shadow-sm"
                title="Add Expense Type"
              >
                <Plus size={16} />
                Add Type
              </button>
              <button
                onClick={() => handleOpenCategoryModal()}
                className="px-4 py-2.5 text-sm font-medium !text-white rounded-lg transition-all duration-200 flex items-center gap-2 shadow-md hover:shadow-lg"
                style={{ background: 'var(--accent-navyblue)' }}
                title="Manage Categories"
              >
                <Settings size={16} />
                Manage Categories
              </button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-card rounded-xl border border-theme shadow-sm">
          <div className="border-b border-theme">
            <div className="flex">
              <button
                onClick={() => setActiveTab('list')}
                className={`px-6 py-4 text-sm font-semibold transition-all duration-200 relative ${activeTab === 'list'
                  ? 'text-[#00D1FF]'
                  : 'text-secondary hover:text-primary'
                  }`}
              >
                Expense List
                {activeTab === 'list' && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-t-full"></span>
                )}
              </button>
              <button
                onClick={() => setActiveTab('create')}
                className={`px-6 py-4 text-sm font-semibold transition-all duration-200 relative ${activeTab === 'create'
                  ? 'text-[#00D1FF]'
                  : 'text-secondary hover:text-primary'
                  }`}
              >
                {editingExpense ? 'Edit Expense' : 'Add Expense'}
                {activeTab === 'create' && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-t-full"></span>
                )}
              </button>
            </div>
          </div>

          <div className="p-6">
            {activeTab === 'list' && (
              <div>
                {/* Filters */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Filter size={20} className="text-secondary" />
                      <select
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value)}
                        className="border border-theme rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="all">All Types</option>
                        {legacyExpenseTypes.map(type => (
                          <option key={type} value={type}>{type}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Expense List */}
                {loading ? (
                  <div className="text-center py-8">
                    <p className="text-secondary">Loading expenses...</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredExpenses.map((expense) => (
                      <div
                        key={expense._id}
                        className="border border-theme rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                        onClick={() => handleView(expense)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="text-2xl">{getTypeIcon(getTypeName(expense))}</div>
                            <div>
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <span className="px-2 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                                  {getCategoryName(expense)}
                                </span>
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(getTypeName(expense))}`}>
                                  {getTypeName(expense)}
                                </span>
                                <span className="text-lg font-semibold text-primary">
                                  ${(expense.amount || 0).toLocaleString()}
                                </span>
                              </div>
                              <p className="text-secondary text-sm mb-1">{expense.description || 'No description'}</p>
                              <div className="flex items-center gap-4 text-xs text-secondary flex-wrap">
                                <span className="flex items-center gap-1">
                                  <User size={12} />
                                  {getEmployeeName(expense.userId)}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Calendar size={12} />
                                  {expense.date ? new Date(expense.date).toLocaleDateString() : 'No date'}
                                </span>
                                {expense.receiptUrl && (
                                  <span className="flex items-center gap-1">
                                    <Receipt size={12} />
                                    Receipt Available
                                  </span>
                                )}
                                {expense.vehicle && typeof expense.vehicle === 'object' && (
                                  <span className="flex items-center gap-1">
                                    <Truck size={12} />
                                    {expense.vehicle.unitNo || expense.vehicle.unitNumber || expense.vehicle.internalId || expense.vehicle.licensePlate || 'Vehicle'}
                                  </span>
                                )}
                                {expense.trailer && typeof expense.trailer === 'object' && (
                                  <span className="flex items-center gap-1">
                                    <Package size={12} />
                                    {expense.trailer.unitNo || expense.trailer.unitNumber || expense.trailer.internalId || expense.trailer.licensePlate || 'Trailer'}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => handleView(expense)}
                              className="p-2 text-secondary hover:text-[#00D1FF] hover:bg-blue-50 rounded-lg transition-colors"
                              title="View Details"
                            >
                              <Eye size={16} />
                            </button>
                            <button
                              onClick={() => handleEdit(expense)}
                              className="p-2 text-secondary hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                              title="Edit Expense"
                            >
                              <Edit size={16} />
                            </button>
                            <button
                              onClick={() => handleDelete(expense._id)}
                              className="p-2 text-secondary hover:text-[#A855F7] hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete Expense"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}

                    {filteredExpenses.length === 0 && (
                      <div className="text-center py-8 text-secondary">
                        <FileText size={48} className="mx-auto mb-4 text-gray-300" />
                        <p>No expenses found for the selected filter.</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'create' && (
              <div className="max-w-2xl">
                <h2 className="text-xl font-semibold mb-6" style={{ background: 'var(--accent-navyblue)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                  {editingExpense ? 'Edit Expense' : 'Add New Expense'}
                </h2>

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-primary mb-2">
                        Employee
                      </label>
                      <select
                        name="userId"
                        value={formData.userId}
                        onChange={handleInputChange}
                        className="w-full border border-theme rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option className='form-option' value="">Select Employee</option>
                        {employees.map(emp => (
                          <option className='form-option' key={emp._id} value={emp._id}>
                            {emp.name} - {emp.role || emp.position || 'Employee'}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-primary mb-2">
                        Expense Category *
                      </label>
                      <select
                        name="categoryId"
                        value={formData.categoryId}
                        onChange={handleInputChange}
                        required
                        className="w-full border border-theme rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option className='form-option' value="">Select Category</option>
                        {categories.map(category => (
                          <option className='form-option' key={category._id} value={category._id}>
                            {category.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-primary mb-2">
                      Expense Type *
                    </label>
                    <select
                      name="typeId"
                      value={formData.typeId}
                      onChange={(e) => {
                        const selectedTypeId = e.target.value;
                        const selectedType = expenseTypes.find(t => t._id === selectedTypeId);
                        setFormData(prev => ({
                          ...prev,
                          typeId: selectedTypeId,
                          type: selectedType?.name || '' // Keep type for backward compatibility
                        }));
                      }}
                      required
                      disabled={!formData.categoryId || loadingTypes}
                      className="w-full border border-theme rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-card disabled:cursor-not-allowed"
                    >
                      <option className='form-option' value="">
                        {loadingTypes
                          ? 'Loading types...'
                          : !formData.categoryId
                            ? 'Select a category first'
                            : 'Select Type'}
                      </option>
                      {expenseTypes.map((type: ExpenseType) => (
                        <option className='form-option' key={type._id} value={type._id}>
                          {type.name}
                        </option>
                      ))}
                    </select>
                    {!formData.categoryId && (
                      <p className="mt-1 text-xs text-secondary">
                        Please select an expense category first to see available types
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-primary mb-2">
                        Amount ($) *
                      </label>
                      <input
                        type="number"
                        name="amount"
                        value={formData.amount}
                        onChange={handleInputChange}
                        required
                        min="0"
                        step="0.01"
                        className="w-full border border-theme rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Enter amount"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-primary mb-2">
                        Date *
                      </label>
                      <input
                        type="date"
                        name="date"
                        value={formData.date}
                        onChange={handleInputChange}
                        required
                        className="w-full border border-theme rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-primary mb-2">
                      Description
                    </label>
                    <textarea
                      name="description"
                      value={formData.description}
                      onChange={handleInputChange}
                      rows={3}
                      className="w-full border border-theme rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter expense description..."
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-primary mb-2">
                        Select Truck
                      </label>
                      <select
                        name="truckId"
                        value={formData.truckId}
                        onChange={handleInputChange}
                        disabled={loadingFleet}
                        className="w-full border border-theme rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-card disabled:cursor-not-allowed"
                      >
                        <option className='form-option' value="">Select Truck (Optional)</option>
                        {trucks.map(truck => (
                          <option className='form-option' key={truck._id} value={truck._id}>
                            {truck.unitNo || truck.unitNumber || truck.internalId || truck.plateNumber || truck._id}
                            {truck.make && truck.model ? ` - ${truck.make} ${truck.model}` : ''}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-primary mb-2">
                        Select Trailer
                      </label>
                      <select
                        name="trailerId"
                        value={formData.trailerId}
                        onChange={handleInputChange}
                        disabled={loadingFleet}
                        className="w-full border border-theme rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-card disabled:cursor-not-allowed"
                      >
                        <option className='form-option' value="">Select Trailer (Optional)</option>
                        {trailers.map(trailer => (
                          <option className='form-option' key={trailer._id} value={trailer._id}>
                            {trailer.unitNo || trailer.unitNumber || trailer.internalId || trailer.plateNumber || trailer._id}
                            {trailer.make && trailer.model ? ` - ${trailer.make} ${trailer.model}` : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-primary mb-2">
                      Receipt Upload
                    </label>
                    <div className="border-2 border-dashed border-theme rounded-lg p-4 text-center hover:border-blue-400 transition-colors">
                      <Receipt className="mx-auto mb-2 text-secondary" size={32} />
                      <input
                        type="file"
                        name="receiptFile"
                        onChange={handleInputChange}
                        accept="image/*"
                        className="hidden"
                        id="receipt-upload"
                      />
                      <label htmlFor="receipt-upload" className="cursor-pointer">
                        <span className="text-[#00D1FF] hover:text-blue-700">Click to upload</span>
                        <span className="text-secondary"> or drag and drop</span>
                      </label>
                      <p className="text-xs text-secondary mt-1">PNG, JPG up to 10MB</p>
                      {formData.receiptFile && (
                        <div className="mt-3 space-y-2">
                          <p className="text-sm text-green-600">
                            Selected: {formData.receiptFile.name}
                          </p>
                          <button
                            type="button"
                            onClick={() => handleExtractReceipt(formData.receiptFile!)}
                            disabled={extractingReceipt || !formData.receiptFile}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed text-sm"
                          >
                            {extractingReceipt ? (
                              <>
                                <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                Extracting...
                              </>
                            ) : (
                              <>
                                <FileText size={16} />
                                Extract Data with AI
                              </>
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-4 pt-4">
                    <button
                      type="submit"
                      disabled={loading}
                      className="!text-white px-6 py-2 rounded-lg hover:shadow-lg flex items-center gap-2 transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{ background: 'var(--accent-navyblue)' }}
                    >
                      <Plus size={16} />
                      {loading ? 'Saving...' : editingExpense ? 'Update Expense' : 'Add Expense'}
                    </button>
                    <button
                      type="button"
                      onClick={handleCancel}
                      disabled={loading}
                      className="text-secondary hover:text-primary px-6 py-2 border border-theme rounded-lg hover:bg-[rgba(255,255,255,0.03)] transition-colors disabled:cursor-not-allowed"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div >
        </div >
      </div >

      {/* View Expense Modal */}
      {
        showViewModal && viewingExpense && (
          <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-card rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-card border-b border-theme px-6 py-4 flex items-center justify-between">
                <h2 className="text-2xl font-bold text-primary">Expense Details</h2>
                <button
                  onClick={() => {
                    setShowViewModal(false);
                    setViewingExpense(null);
                    setReceiptSignedUrl(null);
                  }}
                  className="text-secondary hover:text-primary transition-colors"
                >
                  <span className="text-2xl">&times;</span>
                </button>
              </div>

              <div className="p-6 space-y-6">
                {/* Expense Type and Amount */}
                <div className="flex items-center justify-between pb-4 border-b border-theme">
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="text-4xl">{getTypeIcon(getTypeName(viewingExpense))}</div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-3 py-1 rounded-full text-sm font-medium bg-indigo-100 text-indigo-800">
                        {getCategoryName(viewingExpense)}
                      </span>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${getTypeColor(getTypeName(viewingExpense))}`}>
                        {getTypeName(viewingExpense)}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-secondary">Amount</p>
                    <p className="text-3xl font-bold text-primary">
                      ${(viewingExpense.amount || 0).toLocaleString()}
                    </p>
                  </div>
                </div>

                {/* Employee Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-card p-4 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <User size={18} className="text-secondary" />
                      <p className="text-sm font-medium text-secondary">Employee</p>
                    </div>
                    <p className="text-lg font-semibold text-primary">
                      {getEmployeeName(viewingExpense.userId)}
                    </p>
                    {getEmployeeRole(viewingExpense.userId) && (
                      <p className="text-sm text-secondary mt-1">{getEmployeeRole(viewingExpense.userId)}</p>
                    )}
                  </div>

                  <div className="bg-card p-4 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar size={18} className="text-secondary" />
                      <p className="text-sm font-medium text-secondary">Date</p>
                    </div>
                    <p className="text-lg font-semibold text-primary">
                      {viewingExpense.date
                        ? new Date(viewingExpense.date).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })
                        : 'No date'}
                    </p>
                  </div>
                </div>

                {/* Vehicle and Trailer Information */}
                {(viewingExpense.vehicle || viewingExpense.trailer || (viewingExpense as any).truckId || (viewingExpense as any).trailerId) && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {viewingExpense.vehicle && (
                      <div className="bg-card p-4 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <Truck size={18} className="text-secondary" />
                          <p className="text-sm font-medium text-secondary">Vehicle</p>
                        </div>
                        <p className="text-lg font-semibold text-primary">
                          {typeof viewingExpense.vehicle === 'object' && viewingExpense.vehicle !== null
                            ? (viewingExpense.vehicle as any).unitNo || (viewingExpense.vehicle as any).unitNumber || (viewingExpense.vehicle as any).internalId || (viewingExpense.vehicle as any).licensePlate || (viewingExpense.vehicle as any).plateNumber || 'Vehicle'
                            : 'Vehicle'}
                        </p>
                        {typeof viewingExpense.vehicle === 'object' && viewingExpense.vehicle !== null && (
                          <p className="text-sm text-secondary mt-1">
                            {[(viewingExpense.vehicle as any).make, (viewingExpense.vehicle as any).model].filter(Boolean).join(' ') || 'No details'}
                          </p>
                        )}
                      </div>
                    )}
                    {viewingExpense.trailer && (
                      <div className="bg-card p-4 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <Package size={18} className="text-secondary" />
                          <p className="text-sm font-medium text-secondary">Trailer</p>
                        </div>
                        <p className="text-lg font-semibold text-primary">
                          {typeof viewingExpense.trailer === 'object' && viewingExpense.trailer !== null
                            ? (viewingExpense.trailer as any).unitNo || (viewingExpense.trailer as any).unitNumber || (viewingExpense.trailer as any).internalId || (viewingExpense.trailer as any).licensePlate || (viewingExpense.trailer as any).plateNumber || 'Trailer'
                            : 'Trailer'}
                        </p>
                        {typeof viewingExpense.trailer === 'object' && viewingExpense.trailer !== null && (
                          <p className="text-sm text-secondary mt-1">
                            {[(viewingExpense.trailer as any).make, (viewingExpense.trailer as any).model].filter(Boolean).join(' ') || 'No details'}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Description */}
                {viewingExpense.description && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <FileText size={18} className="text-secondary" />
                      <p className="text-sm font-medium text-secondary">Description</p>
                    </div>
                    <p className="text-primary bg-card p-4 rounded-lg">
                      {viewingExpense.description}
                    </p>
                  </div>
                )}

                {/* Receipt */}
                {viewingExpense.receiptUrl && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Receipt size={18} className="text-secondary" />
                      <p className="text-sm font-medium text-secondary">Receipt</p>
                    </div>
                    <div className="bg-card p-4 rounded-lg">
                      {loadingReceiptUrl ? (
                        <div className="text-center py-4">
                          <p className="text-secondary">Loading receipt...</p>
                        </div>
                      ) : receiptSignedUrl ? (
                        <>
                          <div className="flex items-center gap-4">
                            <div className="flex-1">
                              <p className="text-sm text-secondary mb-1">Receipt Available</p>
                              <a
                                href={receiptSignedUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[#00D1FF] hover:text-blue-800 underline text-sm"
                              >
                                View Receipt
                              </a>
                            </div>
                            <button
                              onClick={() => window.open(receiptSignedUrl, '_blank')}
                              style={{
                                background: 'var(--accent-navyblue)'
                              }}
                              className=" !text-white px-4 py-2 rounded-lg  flex items-center gap-2 transition-colors"
                            >
                              <Eye size={16} />
                              Open Receipt
                            </button>
                          </div>
                          {receiptSignedUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i) && (
                            <div className="mt-4">
                              <img
                                src={receiptSignedUrl}
                                alt="Receipt"
                                className="max-w-full h-auto rounded-lg border border-theme"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                }}
                              />
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="text-center py-4">
                          <p className="text-secondary">Failed to load receipt URL</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Timestamps */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-theme">
                  <div>
                    <p className="text-xs text-secondary mb-1">Created At</p>
                    <p className="text-sm text-primary">
                      {(() => {
                        const createdAt = viewingExpense.createdAt || (viewingExpense as any).createdAt;
                        if (!createdAt) return 'N/A';
                        try {
                          return new Date(createdAt).toLocaleString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          });
                        } catch (e) {
                          return 'Invalid Date';
                        }
                      })()}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-secondary mb-1">Last Updated</p>
                    <p className="text-sm text-primary">
                      {(() => {
                        const updatedAt = viewingExpense.updatedAt || (viewingExpense as any).updatedAt;
                        const createdAt = viewingExpense.createdAt || (viewingExpense as any).createdAt;
                        // If no updatedAt, show createdAt as fallback
                        const dateToShow = updatedAt || createdAt;
                        if (!dateToShow) return 'N/A';
                        try {
                          return new Date(dateToShow).toLocaleString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          });
                        } catch (e) {
                          return 'Invalid Date';
                        }
                      })()}
                    </p>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="sticky bottom-0 bg-card border-t border-theme px-6 py-4 flex items-center justify-end gap-3">
                <button
                  onClick={() => {
                    handleEdit(viewingExpense);
                    setShowViewModal(false);
                    setViewingExpense(null);
                    setReceiptSignedUrl(null);
                  }}
                  style={{
                    background: 'var(--accent-navyblue)'
                  }}
                  className=" !text-white px-4 py-2 rounded-lg  flex items-center gap-2 transition-colors"
                >
                  <Edit size={16} />
                  Edit Expense
                </button>
                <button
                  onClick={() => {
                    setShowViewModal(false);
                    setViewingExpense(null);
                    setReceiptSignedUrl(null);
                  }}
                  className="text-secondary hover:text-primary px-6 py-2 border border-theme rounded-lg hover:bg-[rgba(255,255,255,0.03)] transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )
      }

      {/* Notifications Container */}
      <div className="fixed top-4 right-4 z-[200] space-y-3 max-w-md">
        {notifications.map(notification => (
          <Notification
            key={notification.id}
            notification={notification}
            onClose={removeNotification}
          />
        ))}
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={deleteConfirm.show}
        onClose={() => setDeleteConfirm({ show: false, expenseId: null })}
        onConfirm={confirmDeleteExpense}
        title="Delete Expense"
        message="Are you sure you want to delete this expense? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
      />

      {/* Category Management Modal */}
      {
        showCategoryModal && (
          <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-card rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col">
              {/* Header */}
              <div className="sticky top-0 bg-card border-b border-theme px-6 py-5 rounded-t-2xl flex items-center justify-between z-10">
                <div>
                  <h2 className="text-2xl font-bold text-primary">
                    {editingCategory ? 'Edit Category' : 'Add New Category'}
                  </h2>
                  <p className="text-sm text-secondary mt-1">
                    {editingCategory ? 'Update category details' : 'Create a new expense category'}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowCategoryModal(false);
                    setEditingCategory(null);
                    setCategoryFormData({ name: '', status: 'active' });
                  }}
                  className="p-2 text-secondary hover:text-secondary hover:bg-[rgba(255,255,255,0.03)] rounded-lg transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6">
                <div className="space-y-6">
                  {/* Form Section */}
                  <div className="bg-card rounded-xl p-5 space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-primary mb-2">
                        Category Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={categoryFormData.name}
                        onChange={(e) => setCategoryFormData(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="e.g., Office Expenses, Vehicle Expenses, Rental Expenses"
                        className="w-full border border-theme rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                        autoFocus
                      />
                    </div>


                  </div>

                  {/* Categories List */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-primary">Existing Categories</h3>
                      <span className="text-sm text-secondary">{categories.length} {categories.length === 1 ? 'category' : 'categories'}</span>
                    </div>
                    <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
                      {categories.map((category) => (
                        <div
                          key={category._id}
                          className="flex items-center justify-between p-4 bg-card border border-theme rounded-lg hover:border-theme hover:shadow-sm transition-all"
                        >
                          <div className="flex-1">
                            <p className="text-sm font-semibold text-primary">{category.name}</p>
                            <div className="flex items-center gap-2 mt-1">

                              <span className="text-xs text-secondary">
                                {expenses.filter(e => e.categoryId === category._id || e.category?._id === category._id).length} expenses
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleOpenCategoryModal(category)}
                              className="p-2 text-[#00D1FF] hover:bg-blue-50 rounded-lg transition-colors"
                              title="Edit Category"
                            >
                              <Edit size={18} />
                            </button>
                            <button
                              onClick={() => setDeleteCategoryConfirm({ show: true, category })}
                              className="p-2 text-[#A855F7] hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete Category"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </div>
                      ))}
                      {categories.length === 0 && (
                        <div className="text-center py-8 bg-card rounded-lg border-2 border-dashed border-theme">
                          <FileText className="mx-auto mb-2 text-secondary" size={32} />
                          <p className="text-sm text-secondary">No categories yet</p>
                          <p className="text-xs text-secondary mt-1">Create your first category above</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="sticky bottom-0 bg-card border-t border-theme px-6 py-4 rounded-b-2xl flex items-center justify-end gap-3">
                <button
                  onClick={() => {
                    setShowCategoryModal(false);
                    setEditingCategory(null);
                    setCategoryFormData({ name: '', status: 'active' });
                  }}
                  className="px-5 py-2.5 text-primary bg-card border border-theme rounded-lg hover:bg-[rgba(255,255,255,0.03)] transition-colors font-medium"
                  disabled={savingCategory}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveCategory}
                  disabled={savingCategory || !categoryFormData.name.trim()}
                  className="px-5 py-2.5 !text-white rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-md hover:shadow-lg"
                  style={{
                    background: 'var(--accent-navyblue)'
                  }}
                >
                  {savingCategory ? 'Saving...' : editingCategory ? 'Update Category' : 'Create Category'}
                </button>
              </div>
            </div>
          </div >
        )
      }

      {/* Expense Type Management Modal */}
      {
        showTypeModal && (
          <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-card rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col">
              {/* Header */}
              <div className="sticky top-0 bg-card border-b border-theme px-6 py-5 rounded-t-2xl flex items-center justify-between z-10">
                <div>
                  <h2 className="text-2xl font-bold text-primary">
                    {editingType ? 'Edit Expense Type' : 'Add New Expense Type'}
                  </h2>
                  <p className="text-sm text-secondary mt-1">
                    {editingType ? 'Update expense type details' : 'Create a new expense type under a category'}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowTypeModal(false);
                    setEditingType(null);
                    setTypeFormData({ name: '', categoryId: '', status: 'active' });
                  }}
                  className="p-2 text-secondary hover:text-secondary hover:bg-[rgba(255,255,255,0.03)] rounded-lg transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6">
                <div className="space-y-6">
                  {/* Form Section */}
                  <div className="bg-card rounded-xl p-5 space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-primary mb-2">
                        Category <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={typeFormData.categoryId}
                        onChange={async (e) => {
                          const categoryId = e.target.value;
                          setTypeFormData(prev => ({ ...prev, categoryId }));
                          // Fetch types when category is selected
                          if (categoryId) {
                            await fetchExpenseTypes(categoryId);
                          } else {
                            setExpenseTypes([]);
                          }
                        }}
                        className="w-full border border-theme rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                        required
                      >
                        <option className='form-option' value="">Select Category</option>
                        {categories.map(category => (
                          <option className='form-option' key={category._id} value={category._id}>
                            {category.name}
                          </option>
                        ))}
                      </select>
                      {!typeFormData.categoryId && (
                        <p className="text-xs text-secondary mt-1.5">Please select a category first to see existing types</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-primary mb-2">
                        Expense Type Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={typeFormData.name}
                        onChange={(e) => setTypeFormData(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="e.g., Office Rent, Electricity, Fuel, Maintenance"
                        className="w-full border border-theme rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                        autoFocus
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-primary mb-2">
                        Status
                      </label>
                      <select
                        value={typeFormData.status}
                        onChange={(e) => setTypeFormData(prev => ({ ...prev, status: e.target.value as 'active' | 'inactive' }))}
                        className="w-full border border-theme rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                      >
                        <option className='form-option' value="active">Active</option>
                        <option className='form-option' value="inactive">Inactive</option>
                      </select>
                    </div>
                  </div>

                  {/* Types List for Selected Category */}
                  {typeFormData.categoryId && (
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-primary">
                          Types in {categories.find(c => {
                            const catId = c._id?.toString() || c._id || '';
                            const formCatId = typeFormData.categoryId?.toString() || typeFormData.categoryId || '';
                            return catId === formCatId;
                          })?.name || 'Selected Category'}
                        </h3>
                        <span className="text-sm text-secondary">
                          {expenseTypes.filter(type => {
                            const typeCategoryId = type.categoryId?.toString() || type.categoryId || '';
                            const formCategoryId = typeFormData.categoryId?.toString() || typeFormData.categoryId || '';
                            return typeCategoryId === formCategoryId;
                          }).length} {expenseTypes.filter(type => {
                            const typeCategoryId = type.categoryId?.toString() || type.categoryId || '';
                            const formCategoryId = typeFormData.categoryId?.toString() || typeFormData.categoryId || '';
                            return typeCategoryId === formCategoryId;
                          }).length === 1 ? 'type' : 'types'}
                        </span>
                      </div>
                      <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
                        {expenseTypes
                          .filter(type => {
                            const typeCategoryId = type.categoryId?.toString() || type.categoryId || '';
                            const formCategoryId = typeFormData.categoryId?.toString() || typeFormData.categoryId || '';
                            return typeCategoryId === formCategoryId;
                          })
                          .map((type) => (
                            <div
                              key={type._id}
                              className="flex items-center justify-between p-4 bg-card border border-theme rounded-lg hover:border-theme hover:shadow-sm transition-all"
                            >
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <p className="text-sm font-semibold text-primary">{type.name}</p>
                                  <span className={`px-2 py-0.5 text-xs rounded-full ${type.status === 'active'
                                    ? 'bg-green-100 text-green-700'
                                    : 'bg-card text-secondary'
                                    }`}>
                                    {type.status === 'active' ? 'Active' : 'Inactive'}
                                  </span>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => handleOpenTypeModal(type)}
                                  className="p-2 text-[#00D1FF] hover:bg-blue-50 rounded-lg transition-colors"
                                  title="Edit Type"
                                >
                                  <Edit size={18} />
                                </button>
                                <button
                                  onClick={() => setDeleteTypeConfirm({ show: true, type })}
                                  className="p-2 text-[#A855F7] hover:bg-red-50 rounded-lg transition-colors"
                                  title="Delete Type"
                                >
                                  <Trash2 size={18} />
                                </button>
                              </div>
                            </div>
                          ))}
                        {expenseTypes.filter(type => {
                          const typeCategoryId = type.categoryId?.toString() || type.categoryId || '';
                          const formCategoryId = typeFormData.categoryId?.toString() || typeFormData.categoryId || '';
                          return typeCategoryId === formCategoryId;
                        }).length === 0 && (
                            <div className="text-center py-8 bg-card rounded-lg border-2 border-dashed border-theme">
                              <FileText className="mx-auto mb-2 text-secondary" size={32} />
                              <p className="text-sm text-secondary">No types in this category yet</p>
                              <p className="text-xs text-secondary mt-1">Create your first type above</p>
                            </div>
                          )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="sticky bottom-0 bg-card border-t border-theme px-6 py-4 rounded-b-2xl flex items-center justify-end gap-3">
                <button
                  onClick={() => {
                    setShowTypeModal(false);
                    setEditingType(null);
                    setTypeFormData({ name: '', categoryId: '', status: 'active' });
                  }}
                  className="px-5 py-2.5 text-primary bg-card border border-theme rounded-lg hover:bg-[rgba(255,255,255,0.03)] transition-colors font-medium"
                  disabled={savingType}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveType}
                  disabled={savingType || !typeFormData.name.trim() || !typeFormData.categoryId}
                  className="px-5 py-2.5 !text-white rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-md hover:shadow-lg"
                  style={{
                    background: 'var(--accent-navyblue)'
                  }}
                >
                  {savingType ? 'Saving...' : editingType ? 'Update Type' : 'Create Type'}
                </button>
              </div>
            </div>
          </div >
        )
      }

      {/* Delete Category Confirmation */}
      <ConfirmationModal
        isOpen={deleteCategoryConfirm.show}
        onClose={() => setDeleteCategoryConfirm({ show: false, category: null })}
        onConfirm={handleDeleteCategory}
        title="Delete Category"
        message={`Are you sure you want to delete "${deleteCategoryConfirm.category?.name}"? This will also delete all expense types under this category. This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
      />

      {/* Delete Type Confirmation */}
      <ConfirmationModal
        isOpen={deleteTypeConfirm.show}
        onClose={() => setDeleteTypeConfirm({ show: false, type: null })}
        onConfirm={handleDeleteType}
        title="Delete Expense Type"
        message={`Are you sure you want to delete "${deleteTypeConfirm.type?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
      />
    </div >
  );
};

export default ExpensesPage;