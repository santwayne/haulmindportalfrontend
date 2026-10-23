import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import type { CSSProperties } from 'react';
import ExcelJS from 'exceljs';
import {
    FaEllipsisH,
    FaPlus,
    FaEdit,
    FaTrash,
    FaEye,
    FaTimes,
    FaCheckCircle,
    FaExclamationCircle,
    FaInfoCircle,
    FaSearch,
    FaBox,
    FaHistory,
    FaExclamationTriangle,
    FaFileInvoice,
    FaBuilding,
    FaShoppingCart
} from 'react-icons/fa';
import { Download } from 'lucide-react';
import {
    getAllSpareParts,
    createSparePart,
    updateSparePart,
    deleteSparePart,
    useSparePart,
    getSuppliers,
    createSupplier
} from '../../../../axios/api/fleet.spareparts';
import { useNavigate } from 'react-router-dom';
import { getAllVehicles } from '../../../../axios/api/vehicle';
import { getAllTrailers } from '../../../../axios/api/trailer';
import { FLEET_COLORS } from '../colorUtils';
import AddressSearch from '../../../../components/common/AddressSearch';

const ACCENT_PRIMARY = FLEET_COLORS.primary;
const ACCENT_GRADIENT = FLEET_COLORS.gradient;
const focusRingStyle = {
    '--tw-ring-color': ACCENT_PRIMARY
} as CSSProperties & { '--tw-ring-color': string };
const notificationInfoStyle: CSSProperties = {
    backgroundColor: 'rgba(1, 106, 178, 0.08)',
    borderColor: 'rgba(1, 106, 178, 0.3)'
};

// Enhanced Types for comprehensive spare parts management
interface VehicleId {
    _id: string;
    licensePlate?: string;
    plateNumber?: string;
    internalId?: string;
    make?: string;
    model?: string;
}

interface WorkOrderId {
    _id: string;
    issue: string;
    vehicleId?: VehicleId;
    unitNumber?: string;
    vehicle?: {
        _id: string;
        unitNumber?: string;
        internalId?: string;
        plateNumber?: string;
        make?: string;
        model?: string;
        vinNumber?: string;
    } | null;
    trailer?: {
        _id: string;
        unitNumber?: string;
        trailer?: string;
        internalId?: string;
        plateNumber?: string;
        make?: string;
        model?: string;
        vinNumber?: string;
    } | null;
}

interface Supplier {
    _id: string;
    name: string;
    contact: string;
    email: string;
    phone: string;
    address: string;
}

interface UsageHistory {
    workOrderId: WorkOrderId | string;
    usedOn: string;
    qtyUsed: number;
    _id?: string;
}

interface SparePart {
    _id: string;
    partNumber: string;
    partName: string;
    description?: string;
    category: string;
    stockQty: number;
    minStockLevel: number;
    maxStockLevel: number;
    buyingPrice: number;
    sellingPrice: number;
    purchaseDate: string;
    supplier: Supplier | string;
    location: string;
    condition: 'new' | 'refurbished' | 'used';
    warrantyPeriod: number;
    warrantyExpiry?: string;
    createdAt: string;
    updatedAt: string;
    usageHistory: UsageHistory[];
}


interface InvoiceItem {
    partId: string;
    partNumber: string;
    partName: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
}

interface Invoice {
    _id: string;
    invoiceNumber: string;
    customerName: string;
    customerEmail: string;
    customerPhone: string;
    customerAddress: string;
    items: InvoiceItem[];
    subtotal: number;
    taxRate: number;
    taxAmount: number;
    total: number;
    status: 'draft' | 'sent' | 'paid' | 'cancelled';
    createdAt: string;
    dueDate: string;
    notes?: string;
}

type NotificationType = 'success' | 'error' | 'info';

interface Notification {
    id: number;
    type: NotificationType;
    message: string;
}

const Notification = ({ notification, onClose }: { notification: Notification; onClose: (id: number) => void }) => {
    const icons = {
        success: <FaCheckCircle className="text-green-500" size={24} />,
        error: <FaExclamationCircle className="text-red-500" size={24} />,
        info: <FaInfoCircle size={24} style={{ color: ACCENT_PRIMARY }} />
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

    return (
        <div
            className={`flex items-start gap-3 p-4 rounded-lg border-2 shadow-lg ${bgColors[notification.type]} animate-slide-in`}
            style={notification.type === 'info' ? notificationInfoStyle : undefined}
        >
            <div className="flex-shrink-0 mt-0.5">
                {icons[notification.type]}
            </div>
            <p className="flex-1 text-sm font-medium text-headings">{notification.message}</p>
            <button
                onClick={() => onClose(notification.id)}
                className="flex-shrink-0 text-secondary hover:text-secondary transition-colors"
            >
                <FaTimes size={16} />
            </button>
        </div>
    );
};

const SparePartsInventory = () => {
    // const [activeTab, setActiveTab] = useState('inventory');
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState<string>('');
    const [showAddModal, setShowAddModal] = useState<boolean>(false);
    const [showEditModal, setShowEditModal] = useState<boolean>(false);
    const [showUsageModal, setShowUsageModal] = useState<boolean>(false);
    const [showDetailsModal, setShowDetailsModal] = useState<boolean>(false);
    const [showInvoiceModal, setShowInvoiceModal] = useState<boolean>(false);
    const [showSupplierModal, setShowSupplierModal] = useState<boolean>(false);
    const [showInvoiceDetailsModal, setShowInvoiceDetailsModal] = useState<boolean>(false);
    const [deleteModalOpen, setDeleteModalOpen] = useState<boolean>(false);
    const [deleteTarget, setDeleteTarget] = useState<SparePart | null>(null);
    const [deleteLoading, setDeleteLoading] = useState<boolean>(false);
    const [selectedPart, setSelectedPart] = useState<SparePart | null>(null);
    const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
    const [qtyUsedInput, setQtyUsedInput] = useState<string>('');
    const [spareParts, setSpareParts] = useState<SparePart[]>([]);
    const [units, setUnits] = useState<Array<{
        _id: string;
        unitNo: string;
        unitType: 'Truck' | 'Trailer';
        plateNumber?: string;
        makeModel?: string;
        make?: string;
        model?: string;
        vinNumber?: string;
    }>>([]);
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [loadingUnits, setLoadingUnits] = useState<boolean>(false);
    const [submitting, setSubmitting] = useState<boolean>(false);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [emptyStateMessage, setEmptyStateMessage] = useState<string | null>(null);
    const [userInfo, setUserInfo] = useState<any>(null);
    const [userInfoReady, setUserInfoReady] = useState<boolean>(false);
    const [exporting, setExporting] = useState(false);
    const filteredParts = useMemo(
        () =>
            spareParts.filter(
                (part) =>
                    part.partName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    part.partNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    part.category?.toLowerCase().includes(searchTerm.toLowerCase())
            ),
        [spareParts, searchTerm]
    );

    // Form refs
    const newPartRef = useRef({
        partNumber: '',
        partName: '',
        description: '',
        category: '',
        stockQty: '',
        minStockLevel: '',
        maxStockLevel: '',
        buyingPrice: '',
        sellingPrice: '',
        purchaseDate: '',
        supplier: '',
        location: '',
        condition: 'new',
        warrantyPeriod: ''
    });

    const newSupplierRef = useRef({
        name: '',
        contact: '',
        email: '',
        phone: '',
        address: ''
    });

    const invoiceRef = useRef({
        customerName: '',
        customerEmail: '',
        customerPhone: '',
        customerAddress: '',
        items: [] as InvoiceItem[],
        taxRate: 13,
        notes: ''
    });

    const usageDataRef = useRef({ unitNumber: '', qtyUsed: '' });

    const [locationSearchValue, setLocationSearchValue] = useState('');

    useEffect(() => {
        if (showAddModal) setLocationSearchValue('');
        if (showEditModal && selectedPart) setLocationSearchValue(selectedPart.location || '');
    }, [showAddModal, showEditModal, selectedPart]);

    useEffect(() => {
        try {
            const stored = localStorage.getItem('userInfo');
            if (stored) {
                setUserInfo(JSON.parse(stored));
            }
        } catch (err) {
            console.error('Error parsing userInfo from localStorage:', err);
        } finally {
            setUserInfoReady(true);
        }
    }, []);

    // Fetch suppliers and spare parts once company context is ready
    useEffect(() => {
        if (!userInfoReady) {
            return;
        }

        const userRole = userInfo?.role || userInfo?.userData?.role;
        const userCompany = userInfo?.company || userInfo?.userData?.company;
        const isSuperadmin = userRole === 'superadmin';
        const isFleetManager = userRole === 'Fleet Maintenance Manager';
        const hasCompany = Boolean(userCompany);

        if (!isSuperadmin && !hasCompany && !isFleetManager) {
            setSpareParts([]);
            setSuppliers([]);
            setUnits([]);
            setEmptyStateMessage(null);
            setLoading(false);
            return;
        }

        fetchSuppliers();
        fetchSpareParts();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userInfoReady, userInfo]);

    // Fetch suppliers when add or edit modal opens
    useEffect(() => {
        if (showAddModal || showEditModal) {
            fetchSuppliers();
        }
    }, [showAddModal, showEditModal]);

    // Fetch units when usage modal opens
    useEffect(() => {
        if (showUsageModal) {
            fetchTrucks();
        }
    }, [showUsageModal]);

    const fetchSuppliers = async () => {
        try {
            const res = await getSuppliers();
            if (res?.success) {
                const data = res.data || [];
                setSuppliers(data);
                if (data.length > 0) {
                    setEmptyStateMessage(null);
                } else {
                    pushBannerMessage(res.message);
                }
            } else {
                addNotification('error', res?.message || 'Failed to fetch suppliers');
                setSuppliers([]);
                pushBannerMessage(res?.message || 'Failed to fetch suppliers');
            }
        } catch (err: any) {
            console.error("Error fetching suppliers:", err);
            addNotification('error', err?.message || 'Failed to fetch suppliers');
            setSuppliers([]);
            pushBannerMessage(err?.message || 'Failed to fetch suppliers');
        }
    };

    const fetchTrucks = async () => {
        setLoadingUnits(true);
        try {
            // Fetch vehicles (trucks)
            const vehiclesResponse = await getAllVehicles(1, 1000);
            const vehicles = vehiclesResponse?.success && vehiclesResponse?.data ? vehiclesResponse.data : [];

            // Fetch trailers
            const trailersResponse = await getAllTrailers(1, 1000);
            const trailers = trailersResponse?.success && trailersResponse?.data ? trailersResponse.data : [];

            // Combine vehicles and trailers
            const allUnits: Array<{
                _id: string;
                unitNo: string;
                unitType: 'Truck' | 'Trailer';
                plateNumber?: string;
                makeModel?: string;
                make?: string;
                model?: string;
                vinNumber?: string;
            }> = [];

            // Map vehicles
            vehicles.forEach((vehicle: any) => {
                allUnits.push({
                    _id: vehicle._id,
                    unitNo: vehicle.unitNumber || vehicle.internalId || vehicle.plateNumber || '',
                    unitType: 'Truck' as const,
                    plateNumber: vehicle.plateNumber,
                    makeModel: [vehicle.make, vehicle.model].filter(Boolean).join(' ').trim() || undefined,
                    make: vehicle.make,
                    model: vehicle.model,
                    vinNumber: vehicle.vinNumber
                });
            });

            // Map trailers
            trailers.forEach((trailer: any) => {
                allUnits.push({
                    _id: trailer._id,
                    unitNo: trailer.unitNumber || trailer.trailer || trailer.internalId || '',
                    unitType: 'Trailer' as const,
                    plateNumber: trailer.plateNumber,
                    makeModel: [trailer.make, trailer.model].filter(Boolean).join(' ').trim() || undefined,
                    make: trailer.make,
                    model: trailer.model,
                    vinNumber: trailer.vinNumber
                });
            });

            setUnits(allUnits);
            if (allUnits.length === 0) {
                pushBannerMessage('No vehicles or trailers available');
            }
        } catch (err: any) {
            console.error("Error fetching units:", err);
            addNotification('error', err?.message || 'Failed to fetch units');
            setUnits([]);
            pushBannerMessage(err?.message || 'Failed to fetch units');
        }
        setLoadingUnits(false);
    };

    const addNotification = (type: NotificationType, message: string) => {
        const id = Date.now();
        setNotifications(prev => [...prev, { id, type, message }]);
    };

    const removeNotification = (id: number) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
    };

    const fetchSpareParts = async () => {
        setLoading(true);
        try {
            const res = await getAllSpareParts();
            if (res?.success) {
                const data = res.data || [];
                setSpareParts(data);
                if (data.length === 0) {
                    pushBannerMessage(res.message);
                } else {
                    setEmptyStateMessage(null);
                }
            } else {
                addNotification('error', res?.message || 'Failed to fetch spare parts');
                setSpareParts([]);
                pushBannerMessage(res?.message || 'Failed to fetch spare parts');
            }
        } catch (err: any) {
            console.error("Error fetching spare parts:", err);
            addNotification('error', err?.message || 'Failed to fetch spare parts');
            setSpareParts([]);
            pushBannerMessage(err?.message || 'Failed to fetch spare parts');
        }
        setLoading(false);
    };

    const sanitizeMessage = useCallback((message?: string | null) => {
        if (!message) return null;
        return message.toLowerCase().includes('no company assigned') ? null : message;
    }, []);

    const pushBannerMessage = useCallback((message?: string | null) => {
        const sanitized = sanitizeMessage(message);
        if (!sanitized) return;
        setEmptyStateMessage(prev => prev || sanitized);
    }, [sanitizeMessage]);

    if (loading) {
        return (
            <div className="p-6 min-h-screen bg-card flex items-center justify-center">
                <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                    <p className="mt-4 text-secondary">Loading spare parts...</p>
                </div>
            </div>
        );
    }

    const handleAddPart = async (e: React.FormEvent) => {
        e.preventDefault();
        const formData = newPartRef.current;

        if (!formData.partNumber || !formData.partName || !formData.stockQty) {
            addNotification('error', 'Please fill all required fields');
            return;
        }

        setSubmitting(true);

        const data = {
            partNumber: formData.partNumber,
            partName: formData.partName,
            description: formData.description,
            category: formData.category,
            stockQty: parseInt(formData.stockQty),
            minStockLevel: parseInt(formData.minStockLevel) || 0,
            maxStockLevel: parseInt(formData.maxStockLevel) || 100,
            buyingPrice: parseFloat(formData.buyingPrice) || 0,
            sellingPrice: parseFloat(formData.sellingPrice) || 0,
            purchaseDate: formData.purchaseDate,
            supplier: formData.supplier,
            location: formData.location,
            condition: formData.condition,
            warrantyPeriod: parseInt(formData.warrantyPeriod) || 0
        };

        try {
            const res = await createSparePart(data);
            if (res?.success) {
                addNotification('success', res.message || 'Spare part added successfully');
                setShowAddModal(false);
                newPartRef.current = {
                    partNumber: '',
                    partName: '',
                    description: '',
                    category: '',
                    stockQty: '',
                    minStockLevel: '',
                    maxStockLevel: '',
                    buyingPrice: '',
                    sellingPrice: '',
                    purchaseDate: '',
                    supplier: '',
                    location: '',
                    condition: 'new',
                    warrantyPeriod: ''
                };
                fetchSpareParts();
            } else {
                addNotification('error', res?.message || 'Failed to add spare part');
            }
        } catch (err: any) {
            addNotification('error', err?.message || 'Error adding spare part');
        }

        setSubmitting(false);
    };

    const handleEditPart = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!selectedPart) {
            addNotification('error', 'No spare part selected for update');
            return;
        }

        const formData = newPartRef.current;
        if (!formData.partNumber || !formData.partName || !formData.stockQty) {
            addNotification('error', 'Please fill all required fields');
            return;
        }

        const payload = {
            partNumber: formData.partNumber,
            partName: formData.partName,
            description: formData.description,
            category: formData.category,
            stockQty: Number(formData.stockQty) || 0,
            minStockLevel: Number(formData.minStockLevel) || 0,
            maxStockLevel: Number(formData.maxStockLevel) || 0,
            buyingPrice: Number(formData.buyingPrice) || 0,
            sellingPrice: Number(formData.sellingPrice) || 0,
            purchaseDate: formData.purchaseDate || '',
            supplier: formData.supplier || '',
            location: formData.location || '',
            condition: formData.condition as SparePart['condition'],
            warrantyPeriod: Number(formData.warrantyPeriod) || 0,
        };

        setSubmitting(true);
        try {
            const res = await updateSparePart(selectedPart._id, payload);
            if (res?.success) {
                addNotification('success', res.message || 'Spare part updated successfully');
                setShowEditModal(false);
                setSelectedPart(null);
                await fetchSpareParts();
            } else {
                addNotification('error', res?.message || 'Failed to update spare part');
            }
        } catch (err: any) {
            console.error('Error updating spare part:', err);
            addNotification('error', err?.message || 'Error updating spare part');
        }
        setSubmitting(false);
    };

    const handleCreateInvoice = () => {
        setShowInvoiceModal(false);
        navigate('/admin/fleetmaintenance/invoices');
    };

    const handleUsePart = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!selectedPart) {
            addNotification('error', 'No spare part selected');
            return;
        }

        const { unitNumber, qtyUsed } = usageDataRef.current;
        const quantity = Number(qtyUsed);

        if (!unitNumber) {
            addNotification('error', 'Please select a truck');
            return;
        }

        if (!quantity || quantity <= 0) {
            addNotification('error', 'Enter a valid quantity to use');
            return;
        }

        if (quantity > selectedPart.stockQty) {
            addNotification('error', 'Quantity exceeds available stock');
            return;
        }

        setSubmitting(true);
        try {
            const res = await useSparePart(selectedPart._id, {
                unitNumber,
                qtyUsed: quantity,
            });

            if (res?.success) {
                addNotification('success', res.message || 'Spare part usage recorded');
                setShowUsageModal(false);
                setSelectedPart(null);
                usageDataRef.current = { unitNumber: '', qtyUsed: '' };
                setQtyUsedInput('');
                await fetchSpareParts();
            } else {
                addNotification('error', res?.message || 'Failed to record part usage');
            }
        } catch (err: any) {
            console.error('Error using spare part:', err);
            addNotification('error', err?.message || 'Error recording part usage');
        }
        setSubmitting(false);
    };

    const handleAddSupplier = async (e: React.FormEvent) => {
        e.preventDefault();

        const formData = newSupplierRef.current;

        if (!formData.name || !formData.contact || !formData.email) {
            addNotification('error', 'Please fill all required fields');
            return;
        }

        setSubmitting(true);
        try {
            const res = await createSupplier(formData);
            if (res?.success) {
                addNotification('success', res.message || 'Supplier added successfully');
                setShowSupplierModal(false);

                // Refresh suppliers list
                await fetchSuppliers();

                // Auto-select the newly created supplier in the form
                if (res.data && res.data._id) {
                    newPartRef.current.supplier = res.data._id;
                }

                // Reset supplier form
                newSupplierRef.current = {
                    name: '',
                    contact: '',
                    email: '',
                    phone: '',
                    address: ''
                };
            } else {
                addNotification('error', res?.message || 'Failed to add supplier');
            }
        } catch (err: any) {
            addNotification('error', err?.message || 'Error adding supplier');
        }
        setSubmitting(false);
    };

    const handleDeletePart = (part: SparePart) => {
        setDeleteTarget(part);
        setDeleteModalOpen(true);
    };

    const closeDeleteModal = () => {
        if (deleteLoading) return;
        setDeleteModalOpen(false);
        setDeleteTarget(null);
        setDeleteLoading(false);
    };

    const confirmDeletePart = async () => {
        if (!deleteTarget) return;
        setDeleteLoading(true);
        try {
            const res = await deleteSparePart(deleteTarget._id);
            if (res?.success) {
                addNotification('success', res.message || 'Part deleted successfully');
                closeDeleteModal();
                await fetchSpareParts();
            } else {
                addNotification('error', res?.message || 'Failed to delete part');
            }
        } catch (err: any) {
            console.error('Error deleting part:', err);
            addNotification('error', err?.message || 'Error deleting part');
        }
        setDeleteLoading(false);
    };

    const formatDate = (dateString: string): string => {
        if (!dateString) return "N/A";
        try {
            return new Date(dateString).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch {
            return "Invalid Date";
        }
    };

    const handleExportParts = async () => {
        if (!filteredParts.length) {
            alert('No spare parts available to export.');
            return;
        }

        try {
            setExporting(true);
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Fleet Spare Parts');

            worksheet.columns = [
                { header: 'Part Number', key: 'partNumber', width: 16 },
                { header: 'Part Name', key: 'partName', width: 24 },
                { header: 'Category', key: 'category', width: 18 },
                { header: 'Condition', key: 'condition', width: 16 },
                { header: 'Stock Qty', key: 'stockQty', width: 12 },
                { header: 'Min Level', key: 'minStockLevel', width: 12 },
                { header: 'Location', key: 'location', width: 18 },
                { header: 'Buying Price', key: 'buyingPrice', width: 14 },
                { header: 'Selling Price', key: 'sellingPrice', width: 14 },
                { header: 'Purchase Date', key: 'purchaseDate', width: 16 },
                { header: 'Supplier', key: 'supplier', width: 24 },
                { header: 'Warranty Expiry', key: 'warrantyExpiry', width: 18 },
                { header: 'Notes', key: 'notes', width: 32 }
            ];

            worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
            worksheet.getRow(1).fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FF0EA5E9' }
            };

            filteredParts.forEach((part) => {
                const supplierName = typeof part.supplier === 'string' ? part.supplier : part.supplier?.name || 'N/A';
                worksheet.addRow({
                    partNumber: part.partNumber,
                    partName: part.partName,
                    category: part.category || 'N/A',
                    condition: part.condition,
                    stockQty: part.stockQty,
                    minStockLevel: part.minStockLevel,
                    location: part.location || 'N/A',
                    buyingPrice: part.buyingPrice,
                    sellingPrice: part.sellingPrice,
                    purchaseDate: part.purchaseDate ? new Date(part.purchaseDate).toLocaleDateString() : 'N/A',
                    supplier: supplierName,
                    warrantyExpiry: part.warrantyExpiry ? new Date(part.warrantyExpiry).toLocaleDateString() : 'N/A',
                    notes: part.description || ''
                });
            });

            const buffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buffer], {
                type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `Fleet_Spare_Parts_${new Date().toISOString().split('T')[0]}.xlsx`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Failed to export spare parts', error);
            alert('Unable to export spare parts. Please try again.');
        } finally {
            setExporting(false);
        }
    };

    const getStockStatus = (stockQty: number, minStockLevel: number) => {
        if (stockQty <= minStockLevel) return { status: 'Low Stock', color: 'text-[#A855F7] bg-card' };
        if (stockQty <= minStockLevel * 2) return { status: 'Medium Stock', color: 'text-[#00FFA3] bg-card' };
        return { status: 'Good Stock', color: 'text-green-600 bg-green-50' };
    };



    // addItemToInvoice removed; invoices handled in dedicated page

    const removeItemFromInvoice = (partId: string) => {
        invoiceRef.current.items = invoiceRef.current.items.filter(item => item.partId !== partId);
    };

    const updateInvoiceItemQuantity = (partId: string, quantity: number) => {
        const item = invoiceRef.current.items.find(item => item.partId === partId);
        if (item) {
            item.quantity = quantity;
            item.totalPrice = item.quantity * item.unitPrice;
        }
    };

    const ActionDropdown = ({ part }: { part: SparePart }) => {
        const [showDropdown, setShowDropdown] = useState(false);
        const dropdownRef = useRef<HTMLDivElement>(null);
        const buttonRef = useRef<HTMLButtonElement>(null);

        useEffect(() => {
            const handleClickOutside = (event: MouseEvent) => {
                if (
                    dropdownRef.current &&
                    !dropdownRef.current.contains(event.target as Node) &&
                    buttonRef.current &&
                    !buttonRef.current.contains(event.target as Node)
                ) {
                    setShowDropdown(false);
                }
            };

            if (showDropdown) {
                document.addEventListener('mousedown', handleClickOutside);
            }

            return () => {
                document.removeEventListener('mousedown', handleClickOutside);
            };
        }, [showDropdown]);

        const getDropdownPosition = () => {
            if (!buttonRef.current) return { top: 0, right: 0 };

            const rect = buttonRef.current.getBoundingClientRect();
            return {
                top: rect.bottom + 4,
                right: window.innerWidth - rect.right
            };
        };

        const position = showDropdown ? getDropdownPosition() : { top: 0, right: 0 };

        return (
            <div className="relative">
                <button
                    ref={buttonRef}
                    onClick={() => setShowDropdown(!showDropdown)}
                    className="p-2 text-secondary hover:text-headings hover:bg-[rgba(255,255,255,0.03)] rounded-full transition-colors"
                    title="More actions"
                >
                    <FaEllipsisH size={16} />
                </button>

                {showDropdown && (
                    <div
                        ref={dropdownRef}
                        className="fixed w-48 bg-card rounded-lg shadow-xl border border-theme py-1 z-[101]"
                        style={{
                            top: `${position.top}px`,
                            right: `${position.right}px`
                        }}
                    >
                        <button
                            onClick={() => {
                                setSelectedPart(part);
                                newPartRef.current = {
                                    partNumber: part.partNumber || '',
                                    partName: part.partName || '',
                                    description: part.description || '',
                                    category: part.category || '',
                                    stockQty: part.stockQty.toString(),
                                    minStockLevel: part.minStockLevel?.toString() || '',
                                    maxStockLevel: part.maxStockLevel?.toString() || '',
                                    buyingPrice: part.buyingPrice?.toString() || '',
                                    sellingPrice: part.sellingPrice?.toString() || '',
                                    purchaseDate: part.purchaseDate ? new Date(part.purchaseDate).toISOString().split('T')[0] : '',
                                    supplier: typeof part.supplier === 'object' ? part.supplier._id : part.supplier || '',
                                    location: part.location || '',
                                    condition: part.condition || 'new',
                                    warrantyPeriod: part.warrantyPeriod?.toString() || ''
                                };
                                setShowEditModal(true);
                                setShowDropdown(false);
                            }}
                            className="flex items-center gap-3 w-full px-4 py-2 text-sm !text-headings hover:bg-[rgba(255,255,255,0.03)] transition-colors"
                        >
                            <FaEdit size={14} className="text-[#00D1FF]" />
                            Edit Part
                        </button>
                        <button
                            onClick={() => {
                                setSelectedPart(part);
                                usageDataRef.current = { unitNumber: '', qtyUsed: '' };
                                setQtyUsedInput('');
                                setShowUsageModal(true);
                                setShowDropdown(false);
                            }}
                            className="flex items-center gap-3 w-full px-4 py-2 text-sm !text-headings hover:bg-[rgba(255,255,255,0.03)] transition-colors"
                        >
                            <FaHistory size={14} className="text-[#F59E0B]" />
                            Use Part
                        </button>

                        <button
                            onClick={() => {
                                setSelectedPart(part);
                                setShowDetailsModal(true);
                                setShowDropdown(false);
                            }}
                            className="flex items-center gap-3 w-full px-4 py-2 text-sm text-headings hover:bg-[rgba(255,255,255,0.03)] transition-colors"
                        >
                            <FaEye size={14} className="text-green-600" />
                            View Details
                        </button>
                        <div className="border-t border-theme my-1"></div>
                        <button
                            onClick={() => {
                                handleDeletePart(part);
                                setShowDropdown(false);
                            }}
                            className="flex items-center gap-3 w-full px-4 py-2 text-sm !text-red !hover:bg-red-50 transition-colors"
                        >
                            <FaTrash size={14} />
                            Delete Part
                        </button>
                    </div>
                )}
            </div>
        );
    };

    const renderInventoryTab = () => (
        <div className="space-y-6">
            {/* Search and Stats */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                <div className="lg:col-span-1">
                    <div className="relative">
                        <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-secondary" size={18} />
                        <input
                            type="text"
                            placeholder="Search parts..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 pr-4 py-2.5 w-full border border-theme rounded-lg focus:ring-2 focus:border-transparent transition-all"
                            style={focusRingStyle}
                        />
                    </div>
                </div>

                <div className="lg:col-span-3 grid grid-cols-4 gap-4">
                    <div className="bg-card p-4 rounded-lg shadow-sm border border-theme">
                        <div className="text-2xl font-bold text-headings">{spareParts.length}</div>
                        <div className="text-secondary text-sm">Total Parts</div>
                    </div>
                    <div className="bg-card p-4 rounded-lg shadow-sm border border-theme">
                        <div className="text-2xl font-bold text-[#A855F7]">
                            {spareParts.filter(part => part.stockQty <= part.minStockLevel).length}
                        </div>
                        <div className="text-secondary text-sm">Low Stock</div>
                    </div>
                    <div className="bg-card p-4 rounded-lg shadow-sm border border-theme">
                        <div className="text-2xl font-bold" >
                            {spareParts.reduce((total, part) => total + part.stockQty, 0)}
                        </div>
                        <div className="text-secondary text-sm">Total Stock</div>
                    </div>
                    <div className="bg-card p-4 rounded-lg shadow-sm border border-theme">
                        <div className="text-2xl font-bold text-green-600">
                            ${spareParts.reduce((total, part) => total + (part.stockQty * part.buyingPrice), 0).toFixed(2)}
                        </div>
                        <div className="text-secondary text-sm">Inventory Value</div>
                    </div>
                </div>
            </div>

            {/* Parts Table */}
            {loading ? (
                <div className="bg-card rounded-lg shadow-sm p-12 text-center border border-theme">
                    <div
                        className="animate-spin rounded-full h-16 w-16 border-b-4 mx-auto mb-4"
                        style={{ borderColor: 'rgba(1, 106, 178, 0.2)', borderBottomColor: ACCENT_PRIMARY }}
                    ></div>
                    <p className="text-secondary text-lg">Loading spare parts...</p>
                </div>
            ) : filteredParts.length === 0 ? (
                <div className="bg-card rounded-lg shadow-sm border border-theme p-12 text-center">
                    <FaBox className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-headings mb-2">No Spare Parts Found</h3>
                    <p className="text-secondary mb-4">
                        {searchTerm
                            ? 'No parts match your search.'
                            : 'Get started by adding your first spare part.'}
                    </p>
                    {!searchTerm && (
                        <button
                            onClick={() => setShowAddModal(true)}
                            className="inline-flex items-center gap-2 px-5 py-3 !text-white rounded-lg transition-all font-medium shadow-md hover:opacity-90"
                            style={{ background: ACCENT_GRADIENT }}
                        >
                            <FaPlus />
                            Add First Spare Part
                        </button>
                    )}
                </div>
            ) : (
                <div className="bg-card rounded-lg shadow-sm border border-theme">
                    <div className="overflow-x-auto overflow-y-visible">
                        <table className="w-full">
                            <thead className="bg-card">
                                <tr>
                                    <th className="px-4 py-2 text-left text-xs font-semibold text-headings uppercase tracking-wider">
                                        Part Number
                                    </th>
                                    <th className="px-4 py-2 text-left text-xs font-semibold text-headings uppercase tracking-wider">
                                        Part Name
                                    </th>
                                    <th className="px-4 py-2 text-left text-xs font-semibold text-headings uppercase tracking-wider">
                                        Category
                                    </th>
                                    <th className="px-4 py-2 text-left text-xs font-semibold text-headings uppercase tracking-wider">
                                        Description
                                    </th>
                                    <th className="px-4 py-2 text-left text-xs font-semibold text-headings uppercase tracking-wider">
                                        Stock Qty
                                    </th>
                                    <th className="px-4 py-2 text-left text-xs font-semibold text-headings uppercase tracking-wider">
                                        Min/Max Stock
                                    </th>
                                    <th className="px-4 py-2 text-left text-xs font-semibold text-headings uppercase tracking-wider">
                                        Buying Price
                                    </th>
                                    <th className="px-4 py-2 text-left text-xs font-semibold text-headings uppercase tracking-wider">
                                        Selling Price
                                    </th>
                                    <th className="px-4 py-2 text-left text-xs font-semibold text-headings uppercase tracking-wider">
                                        Purchase Date
                                    </th>
                                    <th className="px-4 py-2 text-left text-xs font-semibold text-headings uppercase tracking-wider">
                                        Supplier
                                    </th>
                                    <th className="px-4 py-2 text-left text-xs font-semibold text-headings uppercase tracking-wider">
                                        Location
                                    </th>
                                    <th className="px-4 py-2 text-left text-xs font-semibold text-headings uppercase tracking-wider">
                                        Condition
                                    </th>
                                    <th className="px-4 py-2 text-left text-xs font-semibold text-headings uppercase tracking-wider">
                                        Warranty
                                    </th>
                                    <th className="px-4 py-2 text-left text-xs font-semibold text-headings uppercase tracking-wider">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-theme divide-white/5">
                                {filteredParts.map((part) => {
                                    const stockStatus = getStockStatus(part.stockQty, part.minStockLevel);
                                    const supplier = typeof part.supplier === 'object' ? part.supplier : suppliers.find(s => s._id === part.supplier);
                                    return (
                                        <tr
                                            key={part._id}
                                            className="hover:bg-[rgba(255,255,255,0.03)] transition-colors cursor-pointer"
                                            onClick={() => {
                                                setSelectedPart(part);
                                                setShowDetailsModal(true);
                                            }}
                                        >
                                            <td className="px-4 py-2 whitespace-nowrap">
                                                <div className="text-xs font-semibold text-secondary">{part.partNumber || 'N/A'}</div>
                                            </td>
                                            <td className="px-4 py-2 whitespace-nowrap">
                                                <div className="text-xs font-medium text-secondary">{part.partName || 'N/A'}</div>
                                            </td>
                                            <td className="px-4 py-2 whitespace-nowrap">
                                                <div className="text-xs text-secondary">{part.category || 'N/A'}</div>
                                            </td>
                                            <td className="px-4 py-2">
                                                <div className="text-xs text-secondary max-w-xs truncate" title={part.description || 'N/A'}>
                                                    {part.description || 'N/A'}
                                                </div>
                                            </td>
                                            <td className="px-4 py-2 whitespace-nowrap">
                                                <div className="flex items-center gap-2">
                                                    <div className="text-xs font-medium text-secondary">{part.stockQty || 0}</div>
                                                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${stockStatus.color}`}>
                                                        {stockStatus.status}
                                                    </span>
                                                    {part.stockQty <= part.minStockLevel && (
                                                        <FaExclamationTriangle className="text-red-500" size={12} />
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-4 py-2 whitespace-nowrap">
                                                <div className="text-xs text-secondary">
                                                    <div>Min: {part.minStockLevel || 0}</div>
                                                    <div>Max: {part.maxStockLevel || 0}</div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-2 whitespace-nowrap">
                                                <div className="text-xs text-secondary">
                                                    ${part.buyingPrice ? part.buyingPrice.toFixed(2) : '0.00'}
                                                </div>
                                            </td>
                                            <td className="px-4 py-2 whitespace-nowrap">
                                                <div className="text-xs text-secondary">
                                                    ${part.sellingPrice ? part.sellingPrice.toFixed(2) : '0.00'}
                                                </div>
                                            </td>
                                            <td className="px-4 py-2 whitespace-nowrap">
                                                <div className="text-xs text-secondary">
                                                    {part.purchaseDate ? formatDate(part.purchaseDate) : 'N/A'}
                                                </div>
                                            </td>
                                            <td className="px-4 py-2 whitespace-nowrap">
                                                <div className="text-xs text-secondary">{supplier?.name || 'N/A'}</div>
                                            </td>
                                            <td className="px-4 py-2 whitespace-nowrap">
                                                <div className="text-xs text-secondary">{part.location || 'N/A'}</div>
                                            </td>
                                            <td className="px-4 py-2 whitespace-nowrap">
                                                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${part.condition === 'new' ? 'bg-green-100 text-green-800' :
                                                    part.condition === 'refurbished' ? 'bg-yellow-100 text-yellow-800' :
                                                        'bg-card text-secondary'
                                                    }`}>
                                                    {part.condition ? part.condition.charAt(0).toUpperCase() + part.condition.slice(1) : 'N/A'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-2 whitespace-nowrap">
                                                <div className="text-xs text-secondary">
                                                    {part.warrantyPeriod ? `${part.warrantyPeriod} months` : 'N/A'}
                                                </div>
                                                {part.warrantyExpiry && (
                                                    <div className="text-xs text-secondary">
                                                        Exp: {formatDate(part.warrantyExpiry)}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-4 py-4 whitespace-nowrap text-sm font-medium" onClick={(e) => e.stopPropagation()}>
                                                <ActionDropdown part={part} />
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
    );

    // invoices tab removed; single invoices page is the source of truth

    const StatCard = ({
        title,
        value,
        subtitle,
        icon: Icon,
        bgColor,
        iconColor,
        textColor
    }: {
        title: string;
        value: number | string;
        subtitle: string;
        icon: any;
        bgColor: string;
        iconColor: string;
        textColor: string;
    }) => (
        <div className="bg-card rounded-lg p-3 shadow-sm border border-transparent  transition-all">
            <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                    <h3 className={`text-sm font-bold  mb-1 ${textColor}`}>{title}</h3>
                    <div className="flex items-baseline gap-2 mb-0.5">
                        <span className={`text-xl font-bold ${textColor}`}>{value}</span>
                    </div>
                    <p className="text-xs text-secondary">{subtitle}</p>
                </div>
                <div className={`${bgColor} rounded-lg p-2 shadow-sm`}>
                    <Icon className={iconColor} size={20} />
                </div>
            </div>
        </div>
    );

    const totalParts = spareParts.length;
    const lowStockParts = spareParts.filter(p => p.stockQty <= p.minStockLevel).length;
    const totalValue = spareParts.reduce((acc, p) => acc + (p.stockQty * p.buyingPrice), 0);

    return (
        <div className="min-h-screen pb-10 bg-main" >
            <div className="relative w-full mx-auto p-2">


                <div className="relative z-10 px-4 pt-3 pb-6">
                    <div className="fixed top-4 right-4 z-[999] flex flex-col gap-3 max-w-md">
                        {notifications.map(notification => (
                            <Notification key={notification.id} notification={notification} onClose={removeNotification} />
                        ))}
                    </div>

                    <div className="mb-4 relative z-10 ">
                        <div className="flex items-center justify-between">
                            <div>
                                <h1 className="text-2xl font-bold text-headings">Fleet Spare Parts</h1>
                                <div className="flex items-center gap-2 text-secondary">
                                    <span className="text-xs">Manage inventory and suppliers</span>
                                </div>
                            </div>
                            <div className="flex gap-3">
                                <button
                                    onClick={handleExportParts}
                                    disabled={exporting}
                                    className="inline-flex items-center gap-2 rounded-lg bg-card text-green-600 px-4 py-2 font-bold text-sm shadow-sm hover:bg-card/90 transition disabled:opacity-60"
                                >
                                    <Download className="w-4 h-4" />
                                    {exporting ? 'Exporting...' : 'Export'}
                                </button>
                                <button
                                    onClick={() => setShowSupplierModal(true)}
                                    className="flex items-center gap-2 px-4 py-2 bg-card text-white border border-white/20 rounded-lg  backdrop-blur-sm transition-colors text-sm font-semibold"
                                >
                                    <FaBuilding />
                                    Add Supplier
                                </button>
                                <button
                                    onClick={() => setShowAddModal(true)}
                                    className="flex items-center gap-2 px-4 py-2 bg-card text-[rgba(0,209,255,0.15)] rounded-lg hover:bg-card/90 shadow-sm transition-all font-bold text-sm"
                                >
                                    <FaPlus /> Add New Part
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 -mt-2 mb-4 ">
                        <StatCard
                            title="Total Parts"
                            value={totalParts}
                            subtitle="In Inventory"
                            icon={FaBox}
                            bgColor="bg-card"
                            iconColor="text-[var(--accent-blue)]"
                            textColor="text-[var(--accent-blue)]"
                        />
                        <StatCard
                            title="Low Stock"
                            value={lowStockParts}
                            subtitle="Needs Reorder"
                            icon={FaExclamationTriangle}
                            bgColor="bg-card"
                            iconColor="text-[var(--accent-purple)]"
                            textColor="text-[var(--accent-purple)]"
                        />
                        <StatCard
                            title="Total Value"
                            value={`$${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                            subtitle="Inventory Asset"
                            icon={FaFileInvoice}
                            bgColor="bg-card"
                            iconColor="text-[var(--accent-green)]"
                            textColor="text-[var(--accent-green)]"
                        />
                    </div>

                    {emptyStateMessage && (
                        <div className="mb-6 flex items-center gap-3 bg-amber-50 border border-amber-200 text-amber-700 px-4 py-3 rounded-lg">
                            <FaInfoCircle className="w-5 h-5" />
                            <span className="text-sm">{emptyStateMessage}</span>
                        </div>
                    )}

                    {renderInventoryTab()}
                </div>
            </div>

            {/* Add Part Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-card rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                        <h3 className="text-lg font-bold text-headings mb-4">Add New Spare Part</h3>
                        <form onSubmit={handleAddPart} className="space-y-4" key="add-form">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-headings mb-1">
                                        Part Number <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        defaultValue={newPartRef.current.partNumber}
                                        onChange={(e) => newPartRef.current.partNumber = e.target.value}
                                        className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        placeholder="e.g., ENG-001"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-headings mb-1">
                                        Part Name <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        defaultValue={newPartRef.current.partName}
                                        onChange={(e) => newPartRef.current.partName = e.target.value}
                                        className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        placeholder="Enter part name"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-headings mb-1">
                                        Category
                                    </label>
                                    <select
                                        defaultValue={newPartRef.current.category}
                                        onChange={(e) => newPartRef.current.category = e.target.value}
                                        className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    >
                                        <option className='form-option' value="">Select Category</option>
                                        <option className='form-option' value="Engine Parts">Engine Parts</option>
                                        <option className='form-option' value="Brake System">Brake System</option>
                                        <option className='form-option' value="Transmission">Transmission</option>
                                        <option className='form-option' value="Electrical">Electrical</option>
                                        <option className='form-option' value="Suspension">Suspension</option>
                                        <option className='form-option' value="Body Parts">Body Parts</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-headings mb-1">
                                        Condition
                                    </label>
                                    <select
                                        defaultValue={newPartRef.current.condition}
                                        onChange={(e) => newPartRef.current.condition = e.target.value}
                                        className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    >
                                        <option className='form-option' value="new">New</option>
                                        <option className='form-option' value="refurbished">Refurbished</option>
                                        <option className='form-option' value="used">Used</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-headings mb-1">
                                    Description
                                </label>
                                <textarea
                                    defaultValue={newPartRef.current.description}
                                    onChange={(e) => newPartRef.current.description = e.target.value}
                                    className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    rows={2}
                                    placeholder="Part description..."
                                />
                            </div>

                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-headings mb-1">
                                        Stock Quantity <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="number"
                                        defaultValue={newPartRef.current.stockQty}
                                        onChange={(e) => newPartRef.current.stockQty = e.target.value}
                                        className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        placeholder="0"
                                        min="0"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-headings mb-1">
                                        Min Stock Level
                                    </label>
                                    <input
                                        type="number"
                                        defaultValue={newPartRef.current.minStockLevel}
                                        onChange={(e) => newPartRef.current.minStockLevel = e.target.value}
                                        className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        placeholder="0"
                                        min="0"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-headings mb-1">
                                        Max Stock Level
                                    </label>
                                    <input
                                        type="number"
                                        defaultValue={newPartRef.current.maxStockLevel}
                                        onChange={(e) => newPartRef.current.maxStockLevel = e.target.value}
                                        className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        placeholder="100"
                                        min="0"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-headings mb-1">
                                        Buying Price
                                    </label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        defaultValue={newPartRef.current.buyingPrice}
                                        onChange={(e) => newPartRef.current.buyingPrice = e.target.value}
                                        className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        placeholder="0.00"
                                        min="0"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-headings mb-1">
                                        Selling Price
                                    </label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        defaultValue={newPartRef.current.sellingPrice}
                                        onChange={(e) => newPartRef.current.sellingPrice = e.target.value}
                                        className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        placeholder="0.00"
                                        min="0"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-headings mb-1">
                                        Purchase Date
                                    </label>
                                    <input
                                        type="date"
                                        defaultValue={newPartRef.current.purchaseDate}
                                        onChange={(e) => newPartRef.current.purchaseDate = e.target.value}
                                        className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-headings mb-1">
                                        Supplier
                                    </label>
                                    <select
                                        value={newPartRef.current.supplier}
                                        onChange={(e) => {
                                            if (e.target.value === '__create_new__') {
                                                setShowSupplierModal(true);
                                                // Reset to empty to show placeholder
                                                newPartRef.current.supplier = '';
                                            } else {
                                                newPartRef.current.supplier = e.target.value;
                                            }
                                        }}
                                        className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    >
                                        <option className='form-option' value="">Select Supplier</option>
                                        {suppliers.map(supplier => (
                                            <option className='form-option' key={supplier._id} value={supplier._id}>
                                                {supplier.name}
                                            </option>
                                        ))}
                                        <option className='form-option' value="__create_new__">
                                            + Create New Supplier
                                        </option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-headings mb-1">
                                        Location
                                    </label>
                                    <AddressSearch
                                        label=""
                                        placeholder="Search for address..."
                                        value={locationSearchValue}
                                        onAddressSelect={(addr) => {
                                            newPartRef.current.location = addr.fullAddress;
                                            setLocationSearchValue(addr.fullAddress);
                                        }}
                                        onChange={(val) => {
                                            newPartRef.current.location = val;
                                            setLocationSearchValue(val);
                                        }}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-headings mb-1">
                                        Warranty Period (months)
                                    </label>
                                    <input
                                        type="number"
                                        defaultValue={newPartRef.current.warrantyPeriod}
                                        onChange={(e) => newPartRef.current.warrantyPeriod = e.target.value}
                                        className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        placeholder="12"
                                        min="0"
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end space-x-3 mt-6">
                                <button
                                    type="button"
                                    onClick={() => setShowAddModal(false)}
                                    className="px-4 py-2 text-secondary border border-theme rounded-lg hover:bg-[rgba(255,255,255,0.03)] transition-colors"
                                    disabled={submitting}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className=" bg-main px-4 py-2 !text-white !ml-3 rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed hover:opacity-90"

                                    disabled={submitting}
                                >
                                    {submitting ? 'Adding...' : 'Add Part'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Part Modal */}
            {showEditModal && selectedPart && (
                <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-card rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                        <h3 className="text-lg font-bold text-headings mb-4">Edit Spare Part</h3>
                        <form onSubmit={handleEditPart} className="space-y-4" key="edit-form">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-headings mb-1">
                                        Part Number <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        defaultValue={newPartRef.current.partNumber}
                                        onChange={(e) => newPartRef.current.partNumber = e.target.value}
                                        className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        placeholder="e.g., ENG-001"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-headings mb-1">
                                        Part Name <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        defaultValue={newPartRef.current.partName}
                                        onChange={(e) => newPartRef.current.partName = e.target.value}
                                        className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        placeholder="Enter part name"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-headings mb-1">
                                        Category
                                    </label>
                                    <select
                                        defaultValue={newPartRef.current.category}
                                        onChange={(e) => newPartRef.current.category = e.target.value}
                                        className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    >
                                        <option value="">Select Category</option>
                                        <option value="Engine Parts">Engine Parts</option>
                                        <option value="Brake System">Brake System</option>
                                        <option value="Transmission">Transmission</option>
                                        <option value="Electrical">Electrical</option>
                                        <option value="Suspension">Suspension</option>
                                        <option value="Body Parts">Body Parts</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-headings mb-1">
                                        Condition
                                    </label>
                                    <select
                                        defaultValue={newPartRef.current.condition}
                                        onChange={(e) => newPartRef.current.condition = e.target.value}
                                        className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    >
                                        <option value="new">New</option>
                                        <option value="refurbished">Refurbished</option>
                                        <option value="used">Used</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-headings mb-1">
                                    Description
                                </label>
                                <textarea
                                    defaultValue={newPartRef.current.description}
                                    onChange={(e) => newPartRef.current.description = e.target.value}
                                    className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    rows={2}
                                    placeholder="Part description..."
                                />
                            </div>

                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-headings mb-1">
                                        Stock Quantity <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="number"
                                        defaultValue={newPartRef.current.stockQty}
                                        onChange={(e) => newPartRef.current.stockQty = e.target.value}
                                        className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        placeholder="0"
                                        min="0"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-headings mb-1">
                                        Min Stock Level
                                    </label>
                                    <input
                                        type="number"
                                        defaultValue={newPartRef.current.minStockLevel}
                                        onChange={(e) => newPartRef.current.minStockLevel = e.target.value}
                                        className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        placeholder="0"
                                        min="0"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-headings mb-1">
                                        Max Stock Level
                                    </label>
                                    <input
                                        type="number"
                                        defaultValue={newPartRef.current.maxStockLevel}
                                        onChange={(e) => newPartRef.current.maxStockLevel = e.target.value}
                                        className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        placeholder="100"
                                        min="0"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-headings mb-1">
                                        Buying Price
                                    </label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        defaultValue={newPartRef.current.buyingPrice}
                                        onChange={(e) => newPartRef.current.buyingPrice = e.target.value}
                                        className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        placeholder="0.00"
                                        min="0"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-headings mb-1">
                                        Selling Price
                                    </label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        defaultValue={newPartRef.current.sellingPrice}
                                        onChange={(e) => newPartRef.current.sellingPrice = e.target.value}
                                        className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        placeholder="0.00"
                                        min="0"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-headings mb-1">
                                        Purchase Date
                                    </label>
                                    <input
                                        type="date"
                                        defaultValue={newPartRef.current.purchaseDate}
                                        onChange={(e) => newPartRef.current.purchaseDate = e.target.value}
                                        className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-headings mb-1">
                                        Supplier
                                    </label>
                                    <select
                                        value={newPartRef.current.supplier}
                                        onChange={(e) => {
                                            if (e.target.value === '__create_new__') {
                                                setShowSupplierModal(true);
                                                // Reset to empty to show placeholder
                                                newPartRef.current.supplier = '';
                                            } else {
                                                newPartRef.current.supplier = e.target.value;
                                            }
                                        }}
                                        className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    >
                                        <option value="">Select Supplier</option>
                                        {suppliers.map(supplier => (
                                            <option key={supplier._id} value={supplier._id}>
                                                {supplier.name}
                                            </option>
                                        ))}
                                        <option value="__create_new__" className="text-[#00D1FF] font-semibold">
                                            + Create New Supplier
                                        </option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-headings mb-1">
                                        Location
                                    </label>
                                    <AddressSearch
                                        label=""
                                        placeholder="Search for address..."
                                        value={locationSearchValue}
                                        onAddressSelect={(addr) => {
                                            newPartRef.current.location = addr.fullAddress;
                                            setLocationSearchValue(addr.fullAddress);
                                        }}
                                        onChange={(val) => {
                                            newPartRef.current.location = val;
                                            setLocationSearchValue(val);
                                        }}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-headings mb-1">
                                        Warranty Period (months)
                                    </label>
                                    <input
                                        type="number"
                                        defaultValue={newPartRef.current.warrantyPeriod}
                                        onChange={(e) => newPartRef.current.warrantyPeriod = e.target.value}
                                        className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        placeholder="12"
                                        min="0"
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end space-x-3 mt-6">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowEditModal(false);
                                        setSelectedPart(null);
                                    }}
                                    className="px-4 py-2 text-secondary border border-theme rounded-lg hover:bg-[rgba(255,255,255,0.03)] transition-colors"
                                    disabled={submitting}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 !text-white !ml-3 rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed hover:opacity-90 bg-[var(--accent-navyblue)]"

                                    disabled={submitting}
                                >
                                    {submitting ? 'Updating...' : 'Update Part'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Add Supplier Modal */}
            {showSupplierModal && (
                <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-card rounded-lg p-6 w-full max-w-md">
                        <h3 className="text-lg font-bold text-headings mb-4">Add New Supplier</h3>
                        <form onSubmit={handleAddSupplier} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-headings mb-1">
                                    Supplier Name <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    defaultValue={newSupplierRef.current.name}
                                    onChange={(e) => newSupplierRef.current.name = e.target.value}
                                    className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="Enter supplier name"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-headings mb-1">
                                    Contact Person <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    defaultValue={newSupplierRef.current.contact}
                                    onChange={(e) => newSupplierRef.current.contact = e.target.value}
                                    className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="Enter contact person"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-headings mb-1">
                                    Email <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="email"
                                    defaultValue={newSupplierRef.current.email}
                                    onChange={(e) => newSupplierRef.current.email = e.target.value}
                                    className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="Enter email"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-headings mb-1">
                                    Phone
                                </label>
                                <input
                                    type="tel"
                                    defaultValue={newSupplierRef.current.phone}
                                    onChange={(e) => newSupplierRef.current.phone = e.target.value}
                                    className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="Enter phone number"
                                />
                            </div>
                            <div>
                                <AddressSearch
                                    label="Address"
                                    placeholder="Search for an address..."
                                    value={newSupplierRef.current.address}
                                    onAddressSelect={(selected) => {
                                        newSupplierRef.current.address = selected.fullAddress;
                                    }}
                                    onChange={(value) => {
                                        newSupplierRef.current.address = value;
                                    }}
                                />
                            </div>
                            <div className="flex justify-end space-x-3 mt-6">
                                <button
                                    type="button"
                                    onClick={() => setShowSupplierModal(false)}
                                    className="px-4 py-2 text-secondary border border-theme rounded-lg hover:bg-[rgba(255,255,255,0.03)] transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-[var(--accent-navyblue)] !text-white !ml-3 rounded-lg hover:bg-blue-700 transition-colors"
                                >
                                    Add Supplier
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {deleteModalOpen && deleteTarget && (
                <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-card rounded-lg p-6 w-full max-w-md">
                        <h3 className="text-lg font-bold text-headings mb-3">Delete Spare Part</h3>
                        <p className="text-sm text-secondary mb-6">
                            Are you sure you want to delete{' '}
                            <span className="font-semibold text-headings">{deleteTarget.partName}</span>? This action cannot be undone.
                        </p>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={closeDeleteModal}
                                disabled={deleteLoading}
                                className="px-4 py-2 text-secondary border border-theme rounded-lg hover:bg-[rgba(255,255,255,0.03)] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmDeletePart}
                                disabled={deleteLoading}
                                className="px-4 py-2 bg-red-600 !text-white rounded-lg !hover:bg-red-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                                {deleteLoading ? 'Deleting...' : 'Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Invoice Modal */}
            {showInvoiceModal && (
                <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-card rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                        <h3 className="text-lg font-bold text-headings mb-4">Create Invoice</h3>

                        {/* Customer Information */}
                        <div className="mb-6">
                            <h4 className="text-md font-semibold text-headings mb-3">Customer Information</h4>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-headings mb-1">
                                        Customer Name <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        defaultValue={invoiceRef.current.customerName}
                                        onChange={(e) => invoiceRef.current.customerName = e.target.value}
                                        className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        placeholder="Enter customer name"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-headings mb-1">
                                        Email
                                    </label>
                                    <input
                                        type="email"
                                        defaultValue={invoiceRef.current.customerEmail}
                                        onChange={(e) => invoiceRef.current.customerEmail = e.target.value}
                                        className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        placeholder="Enter email"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-headings mb-1">
                                        Phone
                                    </label>
                                    <input
                                        type="tel"
                                        defaultValue={invoiceRef.current.customerPhone}
                                        onChange={(e) => invoiceRef.current.customerPhone = e.target.value}
                                        className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        placeholder="Enter phone"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-headings mb-1">
                                        Tax Rate (%)
                                    </label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        defaultValue={invoiceRef.current.taxRate}
                                        onChange={(e) => invoiceRef.current.taxRate = parseFloat(e.target.value)}
                                        className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        placeholder="13"
                                    />
                                </div>
                            </div>
                            <div className="mt-4">
                                <label className="block text-sm font-medium text-headings mb-1">
                                    Address
                                </label>
                                <textarea
                                    defaultValue={invoiceRef.current.customerAddress}
                                    onChange={(e) => invoiceRef.current.customerAddress = e.target.value}
                                    className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    rows={2}
                                    placeholder="Enter customer address"
                                />
                            </div>
                        </div>

                        {/* Invoice Items */}
                        <div className="mb-6">
                            <h4 className="text-md font-semibold text-headings mb-3">Invoice Items</h4>
                            {invoiceRef.current.items.length === 0 ? (
                                <div className="text-center py-8 text-secondary bg-card rounded-lg">
                                    <FaShoppingCart className="h-12 w-12 text-gray-300 mx-auto mb-2" />
                                    <p>No items added yet. Add parts from the inventory.</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {invoiceRef.current.items.map((item) => (
                                        <div key={item.partId} className="flex items-center gap-4 p-3 bg-card rounded-lg">
                                            <div className="flex-1">
                                                <div className="font-medium text-headings">{item.partName}</div>
                                                <div className="text-sm text-secondary">{item.partNumber}</div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="number"
                                                    min="1"
                                                    value={item.quantity}
                                                    onChange={(e) => updateInvoiceItemQuantity(item.partId, parseInt(e.target.value))}
                                                    className="w-16 px-2 py-1 border border-theme rounded text-center"
                                                />
                                                <span className="text-sm text-secondary">× ${item.unitPrice.toFixed(2)}</span>
                                                <span className="font-medium text-headings">${item.totalPrice.toFixed(2)}</span>
                                                <button
                                                    onClick={() => removeItemFromInvoice(item.partId)}
                                                    className="p-1 text-[#A855F7] hover:bg-red-50 rounded"
                                                >
                                                    <FaTrash size={12} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Invoice Totals */}
                        {invoiceRef.current.items.length > 0 && (
                            <div className="mb-6">
                                <div className="bg-card p-4 rounded-lg">
                                    <div className="flex justify-between text-sm mb-2">
                                        <span>Subtotal:</span>
                                        <span>${invoiceRef.current.items.reduce((sum, item) => sum + item.totalPrice, 0).toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between text-sm mb-2">
                                        <span>Tax ({invoiceRef.current.taxRate}%):</span>
                                        <span>${(invoiceRef.current.items.reduce((sum, item) => sum + item.totalPrice, 0) * (invoiceRef.current.taxRate / 100)).toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between font-semibold text-lg border-t pt-2">
                                        <span>Total:</span>
                                        <span>${(invoiceRef.current.items.reduce((sum, item) => sum + item.totalPrice, 0) * (1 + invoiceRef.current.taxRate / 100)).toFixed(2)}</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="flex justify-end space-x-3">
                            <button
                                onClick={() => setShowInvoiceModal(false)}
                                className="px-4 py-2 text-secondary border border-theme rounded-lg hover:bg-[rgba(255,255,255,0.03)] transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleCreateInvoice}
                                className="px-4 py-2 bg-blue-600 !text-white !ml-3 rounded-lg hover:bg-blue-700 transition-colors"
                            >
                                Create Invoice
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Use Part Modal */}
            {showUsageModal && selectedPart && (
                <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-card rounded-lg p-6 w-full max-w-2xl">
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h3 className="text-xl font-bold text-headings mb-2">
                                    Use Spare Part
                                </h3>
                                <p className="text-sm text-secondary">Record usage of this part for a truck</p>
                            </div>
                            <button
                                onClick={() => {
                                    setShowUsageModal(false);
                                    setSelectedPart(null);
                                    usageDataRef.current = { unitNumber: '', qtyUsed: '' };
                                    setQtyUsedInput('');
                                }}
                                className="p-2 hover:bg-[rgba(255,255,255,0.03)] rounded-full transition-colors"
                            >
                                <FaTimes className="text-secondary" size={18} />
                            </button>
                        </div>

                        {/* Spare Part Details */}
                        <div className="mb-6 p-4 rounded-lg text-white">
                            <div className="flex items-center justify-between mb-3">
                                <div>
                                    <h4 className="text-lg font-bold">{selectedPart.partName}</h4>
                                    <p className="text-sm opacity-90">{selectedPart.partNumber}</p>
                                    {selectedPart.category && (
                                        <p className="text-xs opacity-75 mt-1">{selectedPart.category}</p>
                                    )}
                                </div>
                                <div className="text-right">
                                    <div className="text-sm opacity-90">Current Stock</div>
                                    <div className="text-2xl font-bold">{selectedPart.stockQty} units</div>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-white/20">
                                <div>
                                    <div className="text-xs opacity-75">Min Stock Level</div>
                                    <div className="font-semibold">{selectedPart.minStockLevel || 0} units</div>
                                </div>
                                <div>
                                    <div className="text-xs opacity-75">Location</div>
                                    <div className="font-semibold">{selectedPart.location || 'N/A'}</div>
                                </div>
                            </div>
                        </div>

                        <form onSubmit={handleUsePart} className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-headings mb-2">
                                    Unit (Truck/Trailer) <span className="text-red-500">*</span>
                                </label>
                                {loadingUnits ? (
                                    <div className="flex items-center justify-center py-8 bg-card rounded-lg">
                                        <div
                                            className="animate-spin rounded-full h-8 w-8 border-b-2"
                                            style={{ borderColor: 'rgba(1, 106, 178, 0.2)', borderBottomColor: ACCENT_PRIMARY }}
                                        ></div>
                                        <span className="ml-3 text-sm text-secondary">Loading units...</span>
                                    </div>
                                ) : units.length === 0 ? (
                                    <div className="py-8 bg-card border border-yellow-200 rounded-lg text-center">
                                        <FaExclamationCircle className="text-[#00FFA3] mx-auto mb-2" size={24} />
                                        <p className="text-sm text-yellow-800">No vehicles or trailers available</p>
                                        <p className="text-xs text-[#00FFA3] mt-1">Add vehicles or trailers to your fleet first</p>
                                    </div>
                                ) : (
                                    <select
                                        defaultValue={usageDataRef.current.unitNumber}
                                        onChange={(e) => usageDataRef.current.unitNumber = e.target.value}
                                        className="w-full border border-theme rounded-lg p-3 focus:ring-2 focus:border-transparent transition-all bg-card"
                                        style={focusRingStyle}
                                        required
                                    >
                                        <option value="">Select Unit</option>
                                        {units.map(unit => (
                                            <option key={unit._id} value={unit.unitNo}>
                                                {unit.unitNo} - {unit.makeModel || 'N/A'} ({unit.plateNumber || 'N/A'}) [{unit.unitType}]
                                            </option>
                                        ))}
                                    </select>
                                )}
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-headings mb-2">
                                    Quantity Used <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="number"
                                    value={qtyUsedInput}
                                    onChange={(e) => {
                                        const value = e.target.value;
                                        setQtyUsedInput(value);
                                        usageDataRef.current.qtyUsed = value;
                                    }}
                                    className="w-full border border-theme rounded-lg p-3 focus:ring-2 focus:border-transparent transition-all"
                                    style={focusRingStyle}
                                    placeholder={`Enter quantity (max: ${selectedPart.stockQty})`}
                                    min="1"
                                    max={selectedPart.stockQty}
                                    required
                                />
                                <p className="text-xs text-secondary mt-1">
                                    Available: {selectedPart.stockQty} units | After use: {selectedPart.stockQty - (parseInt(qtyUsedInput) || 0)} units
                                </p>
                            </div>
                            <div className="flex justify-end space-x-3 mt-6 pt-4 border-t">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowUsageModal(false);
                                        setSelectedPart(null);
                                        usageDataRef.current = { unitNumber: '', qtyUsed: '' };
                                    }}
                                    className="px-5 py-2.5 bg-card border border-theme text-headings rounded-lg hover:bg-[rgba(255,255,255,0.03)] font-medium transition-colors"
                                    disabled={submitting}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-5 py-2.5 bg-[var(--accent-navyblue)]  !text-white !ml-3 rounded-lg font-medium transition-colors shadow-md hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                                    
                                    disabled={submitting || loadingUnits || units.length === 0}
                                >
                                    {submitting ? 'Processing...' : 'Use Part'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Part Details Modal */}
            {showDetailsModal && selectedPart && (
                <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-card rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <div className="sticky top-0 bg-card border-b px-6 py-4 rounded-t-2xl z-10">
                            <div className="flex justify-between items-center">
                                <h3 className="text-xl font-bold text-headings">
                                    Part Details: {selectedPart.partName}
                                </h3>
                                <button
                                    onClick={() => {
                                        setShowDetailsModal(false);
                                        setSelectedPart(null);
                                    }}
                                    className="p-2 hover:bg-[rgba(255,255,255,0.03)] rounded-full transition-colors"
                                >
                                    <FaTimes className="text-secondary" size={20} />
                                </button>
                            </div>
                        </div>

                        <div className="p-6 space-y-6">
                            <div className="rounded-xl p-6 text-primary border-4 border-theme" >
                                <div>
                                    <label className="text-sm opacity-80">Current Stock</label>
                                    <p className="text-2xl font-bold">{selectedPart.stockQty} units</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="border border-theme rounded-xl p-4">
                                    <div className="text-sm text-secondary">Part Number</div>
                                    <div className="text-lg font-bold text-headings">{selectedPart.partNumber}</div>
                                </div>
                                <div className="border border-theme rounded-xl p-4">
                                    <div className="text-sm text-secondary">Category</div>
                                    <div className="text-lg font-bold text-headings">{selectedPart.category}</div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="border border-theme rounded-xl p-4">
                                    <div className="text-sm text-secondary">Buying Price</div>
                                    <div className="text-lg font-bold text-headings">${selectedPart.buyingPrice.toFixed(2)}</div>
                                </div>
                                <div className="border border-theme rounded-xl p-4">
                                    <div className="text-sm text-secondary">Selling Price</div>
                                    <div className="text-lg font-bold text-headings">${selectedPart.sellingPrice.toFixed(2)}</div>
                                </div>
                            </div>

                            <div className="border-t pt-4">
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <span className="text-secondary font-medium">Created:</span>
                                        <span className="ml-2 text-headings">{formatDate(selectedPart.createdAt)}</span>
                                    </div>
                                    <div>
                                        <span className="text-secondary font-medium">Last Updated:</span>
                                        <span className="ml-2 text-headings">{formatDate(selectedPart.updatedAt)}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-2">
                                <button
                                    onClick={() => {
                                        setShowDetailsModal(false);
                                        setSelectedPart(null);
                                    }}
                                    className="px-6 py-2.5 bg-card border border-theme text-primary rounded-lg hover:bg-[rgba(255,255,255,0.03)] font-medium transition-colors"
                                >
                                    Close
                                </button>
                                <button
                                    onClick={() => {
                                        if (!selectedPart) return;
                                        newPartRef.current = {
                                            partNumber: selectedPart.partNumber || '',
                                            partName: selectedPart.partName || '',
                                            description: selectedPart.description || '',
                                            category: selectedPart.category || '',
                                            stockQty: selectedPart.stockQty.toString(),
                                            minStockLevel: selectedPart.minStockLevel?.toString() || '',
                                            maxStockLevel: selectedPart.maxStockLevel?.toString() || '',
                                            buyingPrice: selectedPart.buyingPrice?.toString() || '',
                                            sellingPrice: selectedPart.sellingPrice?.toString() || '',
                                            purchaseDate: selectedPart.purchaseDate ? new Date(selectedPart.purchaseDate).toISOString().split('T')[0] : '',
                                            supplier: typeof selectedPart.supplier === 'object' ? selectedPart.supplier._id : selectedPart.supplier || '',
                                            location: selectedPart.location || '',
                                            condition: selectedPart.condition || 'new',
                                            warrantyPeriod: selectedPart.warrantyPeriod?.toString() || ''
                                        };
                                        setShowDetailsModal(false);
                                        setShowEditModal(true);
                                    }}
                                    className="flex items-center gap-2 px-6 py-2.5 !text-white rounded-lg font-medium transition-all hover:opacity-90 bg-[var(--accent-navyblue)]"

                                >
                                    <FaEdit size={14} />
                                    Edit Part
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Invoice Details Modal */}
            {showInvoiceDetailsModal && selectedInvoice && (
                <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-card rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <div className="sticky top-0 bg-card border-b px-6 py-4 rounded-t-2xl z-10">
                            <div className="flex justify-between items-center">
                                <h3 className="text-xl font-bold text-headings">
                                    Invoice Details: {selectedInvoice.invoiceNumber}
                                </h3>
                                <button
                                    onClick={() => {
                                        setShowInvoiceDetailsModal(false);
                                        setSelectedInvoice(null);
                                    }}
                                    className="p-2 hover:bg-[rgba(255,255,255,0.03)] rounded-full transition-colors"
                                >
                                    <FaTimes className="text-secondary" size={20} />
                                </button>
                            </div>
                        </div>

                        <div className="p-6 space-y-6">
                            {/* Invoice Header */}
                            <div className="rounded-xl p-6 text-white" style={{ background: ACCENT_GRADIENT }}>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-sm opacity-80">Invoice Number</label>
                                        <p className="text-2xl font-bold">{selectedInvoice.invoiceNumber}</p>
                                    </div>
                                    <div>
                                        <label className="text-sm opacity-80">Total Amount</label>
                                        <p className="text-2xl font-bold">${selectedInvoice.total.toFixed(2)}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Customer Information */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="border border-theme rounded-xl p-4">
                                    <div className="text-sm text-secondary">Customer</div>
                                    <div className="text-lg font-bold text-headings">{selectedInvoice.customerName}</div>
                                    <div className="text-sm text-secondary">{selectedInvoice.customerEmail}</div>
                                    <div className="text-sm text-secondary">{selectedInvoice.customerPhone}</div>
                                </div>
                                <div className="border border-theme rounded-xl p-4">
                                    <div className="text-sm text-secondary">Status</div>
                                    <div className={`text-lg font-bold ${selectedInvoice.status === 'paid' ? 'text-green-600' :
                                        selectedInvoice.status === 'sent' ? 'text-[#00D1FF]' :
                                            selectedInvoice.status === 'draft' ? 'text-[#00FFA3]' :
                                                'text-[#A855F7]'
                                        }`}>
                                        {selectedInvoice.status.charAt(0).toUpperCase() + selectedInvoice.status.slice(1)}
                                    </div>
                                    <div className="text-sm text-secondary">Due: {new Date(selectedInvoice.dueDate).toLocaleDateString()}</div>
                                </div>
                            </div>

                            {/* Invoice Items */}
                            <div className="border border-theme rounded-xl p-5">
                                <h4 className="text-lg font-bold text-headings mb-4 flex items-center gap-2">
                                    <FaFileInvoice size={20} style={{ color: ACCENT_PRIMARY }} />
                                    Invoice Items
                                </h4>
                                <div className="space-y-3">
                                    {selectedInvoice.items.map((item, index) => (
                                        <div key={index} className="bg-card rounded-lg p-4 border border-theme">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <div className="font-medium text-headings">{item.partName}</div>
                                                    <div className="text-sm text-secondary">{item.partNumber}</div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="font-medium text-headings">
                                                        {item.quantity} × ${item.unitPrice.toFixed(2)}
                                                    </div>
                                                    <div className="text-sm text-secondary">
                                                        Total: ${item.totalPrice.toFixed(2)}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Invoice Totals */}
                            <div className="bg-card p-4 rounded-lg">
                                <div className="flex justify-between text-sm mb-2">
                                    <span>Subtotal:</span>
                                    <span>${selectedInvoice.subtotal.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-sm mb-2">
                                    <span>Tax ({selectedInvoice.taxRate}%):</span>
                                    <span>${selectedInvoice.taxAmount.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between font-semibold text-lg border-t pt-2">
                                    <span>Total:</span>
                                    <span>${selectedInvoice.total.toFixed(2)}</span>
                                </div>
                            </div>

                            {/* Notes */}
                            {selectedInvoice.notes && (
                                <div className="border border-theme rounded-xl p-4">
                                    <h4 className="text-sm font-semibold text-headings mb-2">Notes</h4>
                                    <p className="text-sm text-secondary">{selectedInvoice.notes}</p>
                                </div>
                            )}

                            {/* Invoice Dates */}
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <span className="text-secondary font-medium">Created:</span>
                                    <span className="ml-2 text-headings">{new Date(selectedInvoice.createdAt).toLocaleDateString()}</span>
                                </div>
                                <div>
                                    <span className="text-secondary font-medium">Due Date:</span>
                                    <span className="ml-2 text-headings">{new Date(selectedInvoice.dueDate).toLocaleDateString()}</span>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex justify-end pt-2">
                                <button
                                    onClick={() => {
                                        setShowInvoiceDetailsModal(false);
                                        setSelectedInvoice(null);
                                    }}
                                    className="px-6 py-2.5 bg-card border border-theme text-headings rounded-lg hover:bg-[rgba(255,255,255,0.03)] font-medium transition-colors"
                                >
                                    Close
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

export default SparePartsInventory;