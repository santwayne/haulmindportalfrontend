import { useState, useEffect, useCallback, useMemo, useRef, type ChangeEvent } from "react";
import { Search, Edit2, Trash2, X, UserPlus, Users, MapPin, Briefcase } from "lucide-react";
import { FaCheckCircle, FaExclamationCircle, FaTimes } from 'react-icons/fa';
import NewContactSidebar from "./NewContactSidebar";
import NewCustomerSidebar from "./NewCustomerSidebar";
import NewPlacesSidebar from "../places/NewPlacesSidebar";
import {
  listContact,
  deleteContact,
  updateContact,
  listCustomer,
  updateCustomer,
  deleteCustomer,
} from "../../../../../axios/api/distapcher";
import {
  listPlace,
  deletePlace,
  updatePlace,
  updateStatusPlace,
} from "../../../../../axios/api/dispatcher.places";

interface Contact {
  _id: string;
  internalId: string;
  name: string;
  email: string;
  phone: string;
  country: string;
  role: string;
  createdAt: string;
}

interface Customer {
  _id: string;
  internalId: string;
  name: string;
  email: string;
  phone: string;
  country: string;
  role: string;
  createdAt: string;
  state?: string;
  city?: string;
  customerDetails?: {
    customerId?: string;
    emailPrimary?: string;
    emailSecondary?: string;
    trackingEmail?: string;
    taxId?: string;
    assignedSalesperson?: string;
    phonePrimary?: string;
    phoneSecondary?: string;
    contact?: string;
    address?: string;
    unit?: string;
    zipCode?: string;
    creditLimit?: string;
    creditTerm?: string;
    invoiceNet?: string;
    defaultQuickPayDiscount?: string;
    useFactoringCompany?: boolean;
    csaFastApproved?: boolean;
    softBlock?: boolean;
    hardBlock?: boolean;
  };
}

interface Place {
  _id: string;
  name: string;
  street1?: string;
  street2?: string;
  neighbourHood?: string;
  building?: string;
  city?: string;
  state?: string;
  country?: string;
  phone?: string;
  status?: string;
  postalCode?: string;
  securityAccessCodepostalCode?: string;
  currentLocation?: {
    address?: string;
    longitude?: number | null;
    latitude?: number | null;
  };
  createdAt: string;
  updatedAt?: string;
}

interface ToastNotification {
  id: number;
  type: 'success' | 'error' | 'warning';
  message: string;
}

const ToastNotification = ({ notification, onClose }: { notification: ToastNotification; onClose: (id: number) => void }) => {
  const icons = {
    success: <FaCheckCircle className="text-green-500" size={24} />,
    error: <FaExclamationCircle className="text-red-500" size={24} />,
    warning: <FaExclamationCircle className="text-yellow-500" size={24} />,
  };

  const bgColors = {
    success: 'bg-green-50 border-green-200',
    error: 'bg-card border-red-200',
    warning: 'bg-card border-yellow-200',
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

const Index = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("customers");
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [places, setPlaces] = useState<Place[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [emptyStateMessage, setEmptyStateMessage] = useState<string | null>(null);
  const [userInfo, setUserInfo] = useState<any>(() => {
    try {
      const stored = localStorage.getItem('userInfo');
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.error('Error parsing userInfo from localStorage:', error);
      return null;
    }
  });

  // Edit modal state
  const [editItem, setEditItem] = useState<Contact | Customer | Place | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    internalId: "",
    name: "",
    email: "",
    phone: "",
    country: "",
    street1: "",
    street2: "",
    neighbourHood: "",
    building: "",
    city: "",
    state: "",
    postalCode: "",
    securityAccessCodepostalCode: "",
  });
  const [editLoading, setEditLoading] = useState(false);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ item: Contact | Customer | Place; type: "contact" | "customer" | "place" } | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [notifications, setNotifications] = useState<ToastNotification[]>([]);
  const notificationIdRef = useRef(0);

  // Edit customer sidebar state
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [isEditCustomerSidebarOpen, setIsEditCustomerSidebarOpen] = useState(false);

  // Details sidebar state
  const [selectedItem, setSelectedItem] = useState<Contact | Customer | Place | null>(null);
  const [showDetailsSidebar, setShowDetailsSidebar] = useState(false);

  // Refs for scrollbar synchronization
  const topScrollRef = useRef<HTMLDivElement>(null);
  const bottomScrollRef = useRef<HTMLDivElement>(null);

  // Handle different userInfo structures (userData.company or direct company)
  const userRole = userInfo?.role || userInfo?.userData?.role;
  const userCompany = userInfo?.company || userInfo?.userData?.company;
  const canCreate = userRole === 'superadmin' || Boolean(userCompany);

  const showToast = useCallback((type: 'success' | 'error' | 'warning', message: string) => {
    const id = notificationIdRef.current++;
    setNotifications((prev) => [...prev, { id, type, message }]);
  }, []);

  const removeNotification = useCallback((id: number) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const normalizeEmptyMessage = useCallback((message?: string | null) => {
    if (!message) return null;
    return message.toLowerCase().includes('no company assigned') ? null : message;
  }, []);

  const updateEmptyState = useCallback((message?: string, hasData?: boolean) => {
    const sanitized = normalizeEmptyMessage(message);
    if (sanitized && !hasData) {
      setEmptyStateMessage(sanitized);
    } else if (hasData) {
      setEmptyStateMessage(null);
    } else if (!sanitized) {
      setEmptyStateMessage(null);
    }
  }, [normalizeEmptyMessage]);

  const fetchContacts = useCallback(async () => {
    try {
      const res = await listContact();
      if (res?.success) {
        const data = Array.isArray(res.data) ? res.data : [];
        setContacts(data);
        updateEmptyState(res?.message, data.length > 0 || customers.length > 0);
      } else if (res?.message) {
        setContacts([]);
        updateEmptyState(res.message, customers.length > 0);
        showToast('warning', res.message);
      } else {
        setContacts([]);
      }
    } catch (error: any) {
      console.error('Error fetching contacts:', error);
      setContacts([]);
      updateEmptyState(error?.message, customers.length > 0);
      showToast('error', error?.message || "Failed to fetch contacts");
    }
  }, [customers.length, updateEmptyState, showToast]);

  const fetchCustomers = useCallback(async () => {
    try {
      const res = await listCustomer();
      if (res?.success) {
        const data = Array.isArray(res.data) ? res.data : [];
        setCustomers(data);
        updateEmptyState(res?.message, data.length > 0 || contacts.length > 0 || places.length > 0);
      } else if (res?.message) {
        setCustomers([]);
        updateEmptyState(res.message, contacts.length > 0 || places.length > 0);
        showToast('warning', res.message);
      } else {
        setCustomers([]);
      }
    } catch (error: any) {
      console.error('Error fetching customers:', error);
      setCustomers([]);
      updateEmptyState(error?.message, contacts.length > 0 || places.length > 0);
      showToast('error', error?.message || "Failed to fetch customers");
    }
  }, [contacts.length, places.length, updateEmptyState, showToast]);

  const fetchPlaces = useCallback(async () => {
    try {
      const res = await listPlace();
      if (res?.success) {
        const data = Array.isArray(res.data) ? res.data : [];
        setPlaces(data);
        updateEmptyState(res?.message, data.length > 0 || contacts.length > 0 || customers.length > 0);
      } else if (res?.message) {
        setPlaces([]);
        updateEmptyState(res.message, contacts.length > 0 || customers.length > 0);
        showToast('warning', res.message);
      } else {
        setPlaces([]);
      }
    } catch (error: any) {
      console.error('Error fetching places:', error);
      setPlaces([]);
      updateEmptyState(error?.message, contacts.length > 0 || customers.length > 0);
      showToast('error', error?.message || "Failed to fetch places");
    }
  }, [contacts.length, customers.length, updateEmptyState, showToast]);

  const fetchAllData = useCallback(async () => {
    setLoading(true);

    if (!userInfo) {
      setContacts([]);
      setCustomers([]);
      setEmptyStateMessage(null);
      setLoading(false);
      return;
    }

    // Handle different userInfo structures (userData.company or direct company)
    const userRole = userInfo?.role || userInfo?.userData?.role;
    const userCompany = userInfo?.company || userInfo?.userData?.company;
    const isSuperadmin = userRole === 'superadmin';
    const isDispatcher = userRole === 'dispatcher';
    const hasCompany = Boolean(userCompany);

    // Allow dispatchers to call API even if company is not visible in localStorage
    // The backend will handle company filtering based on the authenticated user
    if (!isSuperadmin && !isDispatcher && !hasCompany) {
      setContacts([]);
      setCustomers([]);
      setEmptyStateMessage('No company assigned. Please complete company settings to view contacts.');
      setLoading(false);
      return;
    }

    await Promise.all([fetchContacts(), fetchCustomers(), fetchPlaces()]);
    setLoading(false);
  }, [userInfo, fetchContacts, fetchCustomers, fetchPlaces]);

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key === 'userInfo' && event.newValue) {
        try {
          setUserInfo(JSON.parse(event.newValue));
        } catch (error) {
          console.error('Error parsing userInfo from storage event:', error);
        }
      }
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // Delete item
  const openDeleteModal = useCallback((item: Contact | Customer | Place, type: "contact" | "customer" | "place") => {
    setDeleteTarget({ item, type });
    setDeleteModalOpen(true);
  }, []);

  const closeDeleteModal = useCallback(() => {
    setDeleteModalOpen(false);
    setDeleteTarget(null);
    setDeleteLoading(false);
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      let res;
      if (deleteTarget.type === "contact") {
        res = await deleteContact(deleteTarget.item._id);
      } else if (deleteTarget.type === "customer") {
        res = await deleteCustomer(deleteTarget.item._id);
      } else {
        res = await deletePlace(deleteTarget.item._id);
      }

      if (res?.success) {
        const itemType = deleteTarget.type === "contact" ? "Contact" : deleteTarget.type === "customer" ? "Customer" : "Place";
        showToast('success', res.message || `${itemType} deleted successfully`);
        if (deleteTarget.type === "contact") {
          fetchContacts();
        } else if (deleteTarget.type === "customer") {
          fetchCustomers();
        } else {
          fetchPlaces();
        }
        closeDeleteModal();
      } else {
        showToast('error', res?.message || "Delete failed");
      }
    } catch (error: any) {
      console.error("Error deleting item:", error);
      showToast('error', error?.message || "Delete failed");
    } finally {
      setDeleteLoading(false);
    }
  }, [deleteTarget, fetchContacts, fetchCustomers, fetchPlaces, closeDeleteModal, showToast]);

  // Open edit modal
  const handleEdit = useCallback((item: Contact | Customer | Place) => {
    // For customers, open the full customer sidebar UI (same as create)
    if (activeTab === "customers" && 'internalId' in item) {
      setEditingCustomer(item as Customer);
      setIsEditCustomerSidebarOpen(true);
      return;
    }

    // For contacts and places, use the simple modal
    setEditItem(item);
    if ('internalId' in item) {
      // Contact
      setEditForm({
        internalId: item.internalId || "",
        name: item.name,
        email: 'email' in item ? item.email : "",
        phone: item.phone || "",
        country: item.country || "",
        street1: "",
        street2: "",
        neighbourHood: "",
        building: "",
        city: "",
        state: "",
        postalCode: "",
        securityAccessCodepostalCode: "",
      });
    } else {
      // Place
      const place = item as Place;
      setEditForm({
        internalId: "",
        name: place.name || "",
        email: "",
        phone: place.phone || "",
        country: place.country || "",
        street1: place.street1 || "",
        street2: place.street2 || "",
        neighbourHood: place.neighbourHood || "",
        building: place.building || "",
        city: place.city || "",
        state: place.state || "",
        postalCode: place.postalCode || "",
        securityAccessCodepostalCode: place.securityAccessCodepostalCode || "",
      });
    }
    setIsEditModalOpen(true);
  }, [activeTab]);

  // Input change in edit modal
  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setEditForm((prev) => ({ ...prev, [name]: value }));
  };

  // Update item
  const handleUpdate = useCallback(async () => {
    if (!editItem) return;
    let type: "contact" | "customer" | "place";
    if (activeTab === "contacts") {
      type = "contact";
    } else if (activeTab === "customers") {
      type = "customer";
    } else {
      type = "place";
    }

    setEditLoading(true);
    try {
      let res;
      if (type === "contact") {
        res = await updateContact(editItem._id, editForm);
      } else if (type === "customer") {
        res = await updateCustomer(editItem._id, editForm);
      } else {
        res = await updatePlace(editItem._id, editForm);
      }

      if (res?.success) {
        const itemType = type === "contact" ? "Contact" : type === "customer" ? "Customer" : "Place";
        showToast('success', res.message || `${itemType} updated successfully`);
        if (type === "contact") {
          fetchContacts();
        } else if (type === "customer") {
          fetchCustomers();
        } else {
          fetchPlaces();
        }
        setIsEditModalOpen(false);
        setEditItem(null);
      } else {
        showToast('error', res?.message || "Update failed");
      }
    } catch (error: any) {
      console.error("Error updating item:", error);
      showToast('error', error?.message || "Update failed");
    } finally {
      setEditLoading(false);
    }
  }, [activeTab, editItem, editForm, fetchContacts, fetchCustomers, fetchPlaces, showToast]);

  // Search
  const handleSearch = (e: ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const filteredContacts = useMemo(
    () =>
      contacts.filter((c) => {
        const term = searchQuery.toLowerCase();
        return (
          c.name.toLowerCase().includes(term) ||
          c.email.toLowerCase().includes(term) ||
          c.internalId.toLowerCase().includes(term)
        );
      }),
    [contacts, searchQuery]
  );

  const filteredCustomers = useMemo(
    () =>
      customers.filter((c) => {
        const term = searchQuery.toLowerCase();
        return (
          c.name.toLowerCase().includes(term) ||
          c.email.toLowerCase().includes(term) ||
          c.internalId.toLowerCase().includes(term)
        );
      }),
    [customers, searchQuery]
  );

  const filteredPlaces = useMemo(
    () => {
      if (!searchQuery) return places;
      const searchLower = searchQuery.toLowerCase();
      return places.filter((place) => {
        const searchableFields = [
          place?.name,
          place?.street1,
          place?.street2,
          place?.neighbourHood,
          place?.building,
          place?.city,
          place?.state,
          place?.country,
          place?.phone,
          place?.postalCode,
          place?.securityAccessCodepostalCode,
          place?.currentLocation?.address,
        ].filter(Boolean).join(" ").toLowerCase();
        return searchableFields.includes(searchLower);
      });
    },
    [places, searchQuery]
  );

  const handleSidebarClose = () => {
    setIsSidebarOpen(false);
    fetchAllData();
  };

  const handleEditCustomerClose = () => {
    setIsEditCustomerSidebarOpen(false);
    setEditingCustomer(null);
    fetchAllData();
  };

  const tableData =
    activeTab === "contacts" ? filteredContacts : activeTab === "customers" ? filteredCustomers : filteredPlaces;

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
  }, [tableData, activeTab]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-main">
      <div className="fixed top-4 right-4 z-[10000] space-y-2">
        {notifications.map((notification) => (
          <ToastNotification
            key={notification.id}
            notification={notification}
            onClose={removeNotification}
          />
        ))}
      </div>

      <div className="px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-6">
          <div className="flex space-x-4">
            <button
              onClick={() => setActiveTab("customers")}
              className={`pb-2 px-2 text-sm font-medium flex items-center gap-2 transition-colors ${activeTab === "customers"
                ? "text-[#00D1FF] border-b-2 border-blue-600"
                : "text-secondary hover:text-primary"
                }`}
            >
              <Users className="w-4 h-4" />
              Customers
            </button>

            <button
              onClick={() => setActiveTab("contacts")}
              className={`pb-2 px-2 text-sm font-medium flex items-center gap-2 transition-colors ${activeTab === "contacts"
                ? "text-[#00D1FF] border-b-2 border-blue-600"
                : "text-secondary hover:text-primary"
                }`}
            >
              <Users className="w-4 h-4" />
              Contacts
            </button>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-secondary" />
            <input
              type="text"
              placeholder={`Search ${activeTab}`}
              className="pl-10 pr-4 py-2 border border-theme rounded-md w-64 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              value={searchQuery}
              onChange={handleSearch}
            />
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {canCreate && (
            <button
              onClick={() => setIsSidebarOpen(true)}
              style={{
                background: 'var(--accent-navyblue)',
              }}
              className="!text-white px-4 py-2 rounded-md hover:opacity-90 transition-opacity flex items-center space-x-2 text-sm font-medium"
            >
              <UserPlus className="w-4 h-4" />
              <span>
                {activeTab === "contacts" ? "Create Contact" : activeTab === "customers" ? "Create Customer" : "Create Place"}
              </span>
            </button>
          )}
        </div>
      </div>

      {emptyStateMessage && tableData.length === 0 && (
        <div className="mx-6 mt-4 bg-card border border-blue-100 text-blue-700 px-4 py-3 rounded-lg flex items-center gap-3 text-sm">
          <Users className="w-5 h-5" />
          <span>{emptyStateMessage}</span>
        </div>
      )}

      <div className="p-6">
        <div className="bg-card rounded-lg shadow-sm border border-theme overflow-hidden">
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
          `}</style>
          <div
            ref={topScrollRef}
            className="overflow-x-auto overflow-y-hidden top-scrollbar-container"
            style={{
              maxHeight: '20px',
              marginBottom: '2px',
              scrollbarWidth: 'thin',
              scrollbarColor: '#cbd5e0 #f7fafc' /* Firefox */
            }}
          >
            <div className="top-scroll-content" style={{ height: '1px' }}></div>
          </div>
          {/* Main Table - Scrollbar hidden, controlled by top scrollbar */}
          <div
            ref={bottomScrollRef}
            className="overflow-x-auto overflow-y-visible table-container-hidden-scrollbar"
          >
            <table className="w-full" style={{ minWidth: '1000px' }}>
              <thead className="bg-card border-b border-theme">
                <tr>

                  <>
                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                      Internal ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                      Phone
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                      Country
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                      Created At
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                      Actions
                    </th>
                  </>

                </tr>
              </thead>
              <tbody className="divide-y divide-theme">
                {tableData.length > 0 ? (
                  tableData.map((item) => {
                    if (activeTab === "places") {
                      const place = item as Place;
                      const addressParts = [
                        place.street1,
                        place.street2,
                        place.neighbourHood,
                        place.building,
                        place.city,
                        place.state,
                      ].filter(Boolean);
                      const hasManualAddress = addressParts.length > 0;
                      const fullAddress = hasManualAddress
                        ? addressParts.join(", ")
                        : place.currentLocation?.address || "N/A";
                      const postalCode = place.postalCode || place.securityAccessCodepostalCode || "N/A";

                      return (
                        <tr
                          key={place._id}
                          className="hover:bg-[rgba(255,255,255,0.03)] transition-colors cursor-pointer"
                          onClick={() => {
                            setSelectedItem(place);
                            setShowDetailsSidebar(true);
                          }}
                        >
                          <td className="px-6 py-4 text-sm text-primary font-medium">{place.name || "N/A"}</td>
                          <td className="px-6 py-4 text-sm text-secondary">
                            <div className="max-w-xs">
                              <div className="font-medium text-primary mb-1">{fullAddress}</div>
                              {postalCode !== "N/A" && (
                                <div className="text-xs text-secondary">Postal: {postalCode}</div>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-secondary">{place.phone || "N/A"}</td>
                          <td className="px-6 py-4 text-sm text-secondary">{place.country || "N/A"}</td>
                          <td className="px-6 py-4 text-sm">
                            <span
                              onClick={() => updateStatusPlace(place._id).then(() => fetchPlaces())}
                              className={`cursor-pointer px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${place.status === "active"
                                  ? "bg-green-100 text-green-800"
                                  : "bg-red-100 text-red-800"
                                }`}
                            >
                              {place.status || "N/A"}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-secondary">
                            {place.createdAt ? new Date(place.createdAt).toLocaleDateString() : "N/A"}
                          </td>
                          <td className="px-6 py-4 text-sm text-secondary" onClick={(e) => e.stopPropagation()}>
                            <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2">
                              <button
                                onClick={() => handleEdit(place)}
                                style={{
                                  background: 'var(--accent-navyblue)',
                                }}
                                className="inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-medium !text-white hover:opacity-90 transition-opacity"
                              >
                                <Edit2 className="h-3 w-3" />
                                Edit
                              </button>
                              <button
                                onClick={() => openDeleteModal(place, "place")}
                                className="inline-flex items-center gap-1 rounded-md border border-red-200 bg-card px-3 py-1.5 text-xs font-medium text-[#A855F7] hover:bg-red-100 transition-colors"
                              >
                                <Trash2 className="h-3 w-3" />
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    } else {
                      const contactOrCustomer = item as Contact | Customer;
                      return (
                        <tr
                          key={contactOrCustomer._id}
                          className="hover:bg-[rgba(255,255,255,0.03)] transition-colors cursor-pointer"
                          onClick={() => {
                            setSelectedItem(contactOrCustomer);
                            setShowDetailsSidebar(true);
                          }}
                        >
                          <td className="px-6 py-4 text-sm">{contactOrCustomer.internalId}</td>
                          <td className="px-6 py-4 text-sm">{contactOrCustomer.name}</td>
                          <td className="px-6 py-4 text-sm">{contactOrCustomer.email}</td>
                          <td className="px-6 py-4 text-sm">{contactOrCustomer.phone}</td>
                          <td className="px-6 py-4 text-sm">{contactOrCustomer.country}</td>
                          <td className="px-6 py-4 text-sm">{contactOrCustomer.role}</td>
                          <td className="px-6 py-4 text-sm">{new Date(contactOrCustomer.createdAt).toLocaleDateString()}</td>
                          <td className="px-6 py-4 text-sm text-secondary" onClick={(e) => e.stopPropagation()}>
                            <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2">
                              <button
                                onClick={() => handleEdit(contactOrCustomer)}
                                style={{
                                  background: 'var(--accent-navyblue)',
                                }}
                                className="inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-medium !text-white hover:opacity-90 transition-opacity"
                              >
                                <Edit2 className="h-3 w-3" />
                                Edit
                              </button>
                              <button
                                onClick={() =>
                                  openDeleteModal(contactOrCustomer, activeTab === "contacts" ? "contact" : "customer")
                                }
                                className="inline-flex items-center gap-1 rounded-md border border-red-200 bg-card px-3 py-1.5 text-xs font-medium text-[#A855F7] hover:bg-red-100 transition-colors"
                              >
                                <Trash2 className="h-3 w-3" />
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    }
                  })
                ) : (
                  <tr>
                    <td colSpan={activeTab === "places" ? 7 : 8} className="px-6 py-12 text-center text-secondary">
                      <div className="flex flex-col items-center space-y-2">
                        {activeTab === "places" ? (
                          <MapPin className="w-12 h-12 text-gray-300" />
                        ) : (
                          <Users className="w-12 h-12 text-gray-300" />
                        )}
                        <p className="text-sm">No {activeTab} found.</p>
                        {emptyStateMessage && (
                          <p className="text-xs text-secondary">{emptyStateMessage}</p>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Sidebars */}
      {activeTab === "contacts" ? (
        <NewContactSidebar isOpen={isSidebarOpen && canCreate} onClose={handleSidebarClose} />
      ) : activeTab === "customers" ? (
        <>
          {/* Create Customer Sidebar */}
          <NewCustomerSidebar
            isOpen={isSidebarOpen && canCreate}
            onClose={handleSidebarClose}
            mode="create"
            onSaved={fetchAllData}
          />
          {/* Edit Customer Sidebar */}
          {editingCustomer && (
            <NewCustomerSidebar
              isOpen={isEditCustomerSidebarOpen}
              onClose={handleEditCustomerClose}
              mode="edit"
              customer={editingCustomer}
              onSaved={fetchAllData}
            />
          )}
        </>
      ) : (
        <NewPlacesSidebar isOpen={isSidebarOpen && canCreate} onClose={handleSidebarClose} />
      )}

      {/* Details Sidebar */}
      {showDetailsSidebar && selectedItem && (
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-40 transition-opacity"
            onClick={() => {
              setShowDetailsSidebar(false);
              setTimeout(() => setSelectedItem(null), 300);
            }}
          ></div>

          {/* Sidebar Panel */}
          <div
            className="fixed right-0 top-0 h-full w-full md:w-2/3 lg:w-1/2 bg-card shadow-2xl z-50 overflow-y-auto transform transition-transform duration-300 translate-x-0"
          >
            <div className="p-6">
              {/* Header */}
              <div className="flex justify-between items-center mb-6 pb-4 border-b-2 border-theme">
                <h2 className="text-2xl font-bold text-primary">
                  {activeTab === "places" ? "Place" : activeTab === "customers" ? "Customer" : "Contact"} Details
                </h2>
                <button
                  onClick={() => {
                    setShowDetailsSidebar(false);
                    setTimeout(() => setSelectedItem(null), 300);
                  }}
                  className="p-2 rounded-lg text-secondary hover:text-secondary hover:bg-[rgba(255,255,255,0.03)] transition-all"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-6">
                {/* Header Section */}
                <div className="bg-gradient-to-r from-[#4A90E2] to-[#357ABD] text-white p-6 rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className="h-20 w-20 flex-shrink-0">
                      <div className="h-20 w-20 rounded-full flex items-center justify-center text-white font-bold text-2xl border-4 border-white bg-gradient-to-br from-blue-500 to-purple-600">
                        {activeTab === "places" ? (
                          <MapPin size={32} />
                        ) : (
                          (selectedItem as Contact | Customer).name?.charAt(0) || '?'
                        )}
                      </div>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-2xl font-bold mb-1">
                        {activeTab === "places" ? (selectedItem as Place).name : (selectedItem as Contact | Customer).name}
                      </h3>
                      {activeTab !== "places" && (
                        <p className="text-blue-100 text-sm flex items-center gap-2">
                          <Users size={16} />
                          {activeTab === "customers" ? "Customer" : "Contact"} ID: <span className="font-semibold">{(selectedItem as Contact | Customer).internalId}</span>
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Information Section */}
                <div className="bg-card p-6 rounded-lg border border-theme">
                  <h4 className="font-semibold text-primary mb-4 text-lg flex items-center gap-2">
                    <Briefcase size={20} className="text-[#00D1FF]" />
                    {activeTab === "places" ? "Location" : "Contact"} Information
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {activeTab === "places" ? (
                      <>
                        {(selectedItem as Place).name && (
                          <div>
                            <p className="text-sm text-secondary mb-1">Name</p>
                            <p className="font-medium text-primary">{(selectedItem as Place).name}</p>
                          </div>
                        )}
                        {(selectedItem as Place).phone && (
                          <div>
                            <p className="text-sm text-secondary mb-1">Phone</p>
                            <p className="font-medium text-primary">{(selectedItem as Place).phone}</p>
                          </div>
                        )}
                        {(selectedItem as Place).country && (
                          <div>
                            <p className="text-sm text-secondary mb-1">Country</p>
                            <p className="font-medium text-primary">{(selectedItem as Place).country}</p>
                          </div>
                        )}
                        {(selectedItem as Place).status && (
                          <div>
                            <p className="text-sm text-secondary mb-1">Status</p>
                            <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${(selectedItem as Place).status === "active"
                                ? "bg-green-100 text-green-800"
                                : "bg-red-100 text-red-800"
                              }`}>
                              {(selectedItem as Place).status}
                            </span>
                          </div>
                        )}
                        {((selectedItem as Place).street1 || (selectedItem as Place).currentLocation?.address) && (
                          <div className="md:col-span-2">
                            <p className="text-sm text-secondary mb-1 flex items-center gap-1">
                              <MapPin size={14} className="text-[#00D1FF]" />
                              Address
                            </p>
                            <p className="font-medium text-primary">
                              {[
                                (selectedItem as Place).street1,
                                (selectedItem as Place).street2,
                                (selectedItem as Place).neighbourHood,
                                (selectedItem as Place).building,
                                (selectedItem as Place).city,
                                (selectedItem as Place).state,
                              ].filter(Boolean).join(", ") || (selectedItem as Place).currentLocation?.address || "—"}
                            </p>
                            {((selectedItem as Place).postalCode || (selectedItem as Place).securityAccessCodepostalCode) && (
                              <p className="text-xs text-secondary mt-1">
                                Postal: {(selectedItem as Place).postalCode || (selectedItem as Place).securityAccessCodepostalCode}
                              </p>
                            )}
                          </div>
                        )}
                        {(selectedItem as Place).createdAt && (
                          <div>
                            <p className="text-sm text-secondary mb-1">Created At</p>
                            <p className="font-medium text-primary">
                              {new Date((selectedItem as Place).createdAt).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                              })}
                            </p>
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        <div>
                          <p className="text-sm text-secondary mb-1">Internal ID</p>
                          <p className="font-medium text-primary">{(selectedItem as Contact | Customer).internalId}</p>
                        </div>
                        <div>
                          <p className="text-sm text-secondary mb-1">Name</p>
                          <p className="font-medium text-primary">{(selectedItem as Contact | Customer).name}</p>
                        </div>
                        <div>
                          <p className="text-sm text-secondary mb-1">Email</p>
                          <p className="font-medium text-primary">{(selectedItem as Contact | Customer).email || "—"}</p>
                        </div>
                        <div>
                          <p className="text-sm text-secondary mb-1">Phone</p>
                          <p className="font-medium text-primary">{(selectedItem as Contact | Customer).phone || "—"}</p>
                        </div>
                        <div>
                          <p className="text-sm text-secondary mb-1">Country</p>
                          <p className="font-medium text-primary">{(selectedItem as Contact | Customer).country || "—"}</p>
                        </div>
                        <div>
                          <p className="text-sm text-secondary mb-1">Role</p>
                          <p className="font-medium text-primary">{(selectedItem as Contact | Customer).role || "—"}</p>
                        </div>
                        <div>
                          <p className="text-sm text-secondary mb-1">Created At</p>
                          <p className="font-medium text-primary">
                            {new Date((selectedItem as Contact | Customer).createdAt).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })}
                          </p>
                        </div>
                        {activeTab === "customers" && (selectedItem as Customer).customerDetails && (
                          <div className="md:col-span-2">
                            <p className="text-sm text-secondary mb-2">Customer Details</p>
                            <div className="bg-card p-4 rounded border border-theme space-y-2">
                              {(selectedItem as Customer).customerDetails?.address && (
                                <p className="text-sm"><span className="font-medium">Address:</span> {(selectedItem as Customer).customerDetails?.address}</p>
                              )}
                              {(selectedItem as Customer).customerDetails?.taxId && (
                                <p className="text-sm"><span className="font-medium">Tax ID:</span> {(selectedItem as Customer).customerDetails?.taxId}</p>
                              )}
                              {(selectedItem as Customer).customerDetails?.creditLimit && (
                                <p className="text-sm"><span className="font-medium">Credit Limit:</span> {(selectedItem as Customer).customerDetails?.creditLimit}</p>
                              )}
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end gap-3 pt-4 border-t-2 border-theme">
                  <button
                    onClick={() => {
                      setShowDetailsSidebar(false);
                      setTimeout(() => setSelectedItem(null), 300);
                    }}
                    className="px-6 py-2.5 bg-gray-200 text-primary font-medium rounded-lg hover:bg-gray-300 transition-all"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {isEditModalOpen && editItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className={`bg-card rounded-xl shadow-xl w-full ${activeTab === "places" ? "max-w-2xl" : "max-w-md"} p-6 relative animate-fadeIn`}>
            <button
              className="absolute top-4 right-4 text-secondary hover:text-secondary"
              onClick={() => setIsEditModalOpen(false)}
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-xl font-semibold text-primary mb-6">
              Edit {activeTab === "contacts" ? "Contact" : activeTab === "customers" ? "Customer" : "Place"}
            </h2>

            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
              {activeTab !== "places" && (
                <div>
                  <label className="block text-secondary text-sm mb-1">Internal ID</label>
                  <input
                    type="text"
                    name="internalId"
                    value={editForm.internalId}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
                  />
                </div>
              )}

              <div>
                <label className="block text-secondary text-sm mb-1">Name</label>
                <input
                  type="text"
                  name="name"
                  value={editForm.name}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
                />
              </div>

              {activeTab !== "places" && (
                <div>
                  <label className="block text-secondary text-sm mb-1">Email</label>
                  <input
                    type="email"
                    name="email"
                    value={editForm.email}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
                  />
                </div>
              )}

              <div>
                <label className="block text-secondary text-sm mb-1">Phone</label>
                <input
                  type="text"
                  name="phone"
                  value={editForm.phone}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
                />
              </div>

              {activeTab === "places" && (
                <>
                  <div>
                    <label className="block text-secondary text-sm mb-1">Street 1</label>
                    <input
                      type="text"
                      name="street1"
                      value={editForm.street1}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-secondary text-sm mb-1">Street 2</label>
                    <input
                      type="text"
                      name="street2"
                      value={editForm.street2}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-secondary text-sm mb-1">Neighbourhood</label>
                      <input
                        type="text"
                        name="neighbourHood"
                        value={editForm.neighbourHood}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-secondary text-sm mb-1">Building</label>
                      <input
                        type="text"
                        name="building"
                        value={editForm.building}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-secondary text-sm mb-1">City</label>
                      <input
                        type="text"
                        name="city"
                        value={editForm.city}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-secondary text-sm mb-1">State</label>
                      <input
                        type="text"
                        name="state"
                        value={editForm.state}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-secondary text-sm mb-1">Postal Code / Security Access Code</label>
                    <input
                      type="text"
                      name="postalCode"
                      value={editForm.postalCode || editForm.securityAccessCodepostalCode}
                      onChange={(e) => {
                        setEditForm({
                          ...editForm,
                          postalCode: e.target.value,
                          securityAccessCodepostalCode: e.target.value
                        });
                      }}
                      className="w-full px-4 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="block text-secondary text-sm mb-1">Country</label>
                <input
                  type="text"
                  name="country"
                  value={editForm.country}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end space-x-3">
              <button
                className="px-4 py-2 bg-gray-200 !mr-3 text-primary rounded-lg hover:bg-gray-300 transition disabled:opacity-60 disabled:cursor-not-allowed text-sm"
                onClick={() => setIsEditModalOpen(false)}
                disabled={editLoading}
              >
                Cancel
              </button>
              <button
                style={{
                  background: 'var(--accent-navyblue)',
                }}
                className="px-4 py-2 !text-white rounded-lg hover:opacity-90 transition disabled:opacity-60 disabled:cursor-not-allowed text-sm"
                onClick={handleUpdate}
                disabled={editLoading}
              >
                {editLoading ? "Updating..." : "Update"}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteModalOpen && deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-xl border border-theme bg-card p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between border-b pb-3">
              <h2 className="text-lg font-semibold text-[#A855F7]">
                Delete {deleteTarget.type === "contact" ? "Contact" : deleteTarget.type === "customer" ? "Customer" : "Place"}
              </h2>
              <button
                onClick={closeDeleteModal}
                disabled={deleteLoading}
                className="text-secondary transition-colors hover:text-secondary disabled:cursor-not-allowed disabled:opacity-60"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-secondary">
              Are you sure you want to delete{" "}
              <span className="font-semibold text-primary">{deleteTarget.item.name}</span>? This action cannot be undone.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={closeDeleteModal}
                disabled={deleteLoading}
                className="rounded-md border border-theme px-4 py-2 text-sm text-primary transition hover:bg-[rgba(255,255,255,0.03)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={deleteLoading}
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium !text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {deleteLoading ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Index;
