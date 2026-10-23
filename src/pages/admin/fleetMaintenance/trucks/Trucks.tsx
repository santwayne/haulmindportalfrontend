import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Plus, Upload, ChevronUp, ChevronDown, Clock, X, Image as ImageIcon, Calendar, ChevronLeft, ChevronRight, Edit, Trash2, FileText, Check, FileDown } from 'lucide-react';
import ExcelJS from 'exceljs';
import { getAllVehicles, createVehicle, updateVehicle, deleteVehicle, getVehicleById } from '../../../../axios/api/vehicle';
import { getAllDrivers, type Driver } from '../../../../axios/api/driver';
import { createVehicleDocument, updateVehicleDocument, getVehicleDocument } from '../../../../axios/api/compilance.vehicledoc';
import { getAllTrailers } from '../../../../axios/api/trailer';
import { getAllEmployees } from '../../../../axios/api/employee';
import { getAllYards, type Yard } from '../../../../axios/api/fleet.yards';
import apiClient from '../../../../axios/apiClient';
import ConfirmationModal from '../../../../components/common/ConfirmationModal';



interface Truck {
    _id?: string;
    id?: string;
    unitNumber: string;
    plateNumber: string;
    ownership: string;
    notes: string;
    operatingStatus: 'IN SERVICE' | 'OUT OF SERVICE' | 'MAINTENANCE';
    dispatchStatus?: 'LOADED' | 'DELIVERED' | 'UNASSIGNED' | 'IN TRANSIT' | 'ASSIGNED';
    dispatchInfo?: string;
    compliance: 'COMPLIANT' | 'NON-COMPLIANT' | 'EXPIRING SOON';
    category?: 'MB' | 'AB' | 'TX' | 'External' | 'Unassigned';
    imageUrl?: string;
    make?: string;
    model?: string;
    year?: string;
    vinNumber?: string;
    status?: string;
    internalId?: string;
    type?: string;
    weight?: string;
    uom?: string;
    registrationCountry?: string;
    registrationProvince?: string;
    subType?: string;
    lastDispatch?: string;
    lastDispatchDate?: string | Date;
    lastDropLocation?: string;
    yard?: string | { _id: string; yardName: string; yardCode: string };
}

interface Country {
    name: string;
    code: string;
    flag: string;
    dialCode: string;
}

// Static truck data - removed, now using API

const Trucks: React.FC = () => {
    const { category: routeCategory } = useParams<{ category?: string }>();
    const navigate = useNavigate();


    // Initialize activeTab from route params, default to 'All'
    const getInitialTab = (cat?: string): 'All' | 'MB' | 'AB' | 'TX' | 'External' | 'Unassigned' => {
        if (cat && ['MB', 'AB', 'TX', 'External', 'Unassigned'].includes(cat)) {
            return cat as 'All' | 'MB' | 'AB' | 'TX' | 'External' | 'Unassigned';
        }
        return 'All';
    };

    const [activeTab, setActiveTab] = useState<string>(getInitialTab(routeCategory) || 'All');
    const [assignedTruckIds, setAssignedTruckIds] = useState<Set<string>>(new Set());
    const [searchTerm, setSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState('');
    const [complianceStatus, setComplianceStatus] = useState('All');
    const [category, setCategory] = useState('All');

    // API state
    const [trucks, setTrucks] = useState<Truck[]>([]);
    const [loading, setLoading] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
    const [, setDrivers] = useState<Driver[]>([]);
    const [operators, setOperators] = useState<Array<{ _id: string; name: string; email: string }>>([]);
    const [trailers, setTrailers] = useState<Array<{ _id: string; unitNumber: string; trailer?: string }>>([]);
    const [yards, setYards] = useState<Yard[]>([]);
    const [originalTruckData, setOriginalTruckData] = useState<any>(null);

    // Sidebar modal state
    const [showSidebar, setShowSidebar] = useState(false);
    const [activeStep, setActiveStep] = useState<'Details' | 'Inspections' | 'Documents' | 'Invoice' | 'Notes' | 'Payroll' | 'Deductions' | 'Additions'>('Details');
    const [inspectionType, setInspectionType] = useState<'One Time' | 'Recurring'>('One Time');
    const [selectedImage, setSelectedImage] = useState<string | null>(null);

    // Confirmation modal states
    const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
    const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
    const [truckLimitModal, setTruckLimitModal] = useState<{ show: boolean; maxTrucks: number; usedTrucks: number }>({ show: false, maxTrucks: 0, usedTrucks: 0 });
    const [validationErrors, setValidationErrors] = useState<string[]>([]);

    // Inspections data
    const [oneTimeInspections, setOneTimeInspections] = useState<Array<{
        id: string;
        expiryDate: string;
        description: string;
        ignoreExpiration: boolean;
        file?: File | null;
        fileUrl?: string | null;
        fileName?: string;
        isExisting?: boolean;
    }>>([]);

    const [recurringInspections, setRecurringInspections] = useState<Array<{
        id: string;
        scheduledOn: string;
        after: string;
        unit: string;
        description: string;
        ignoreExpiration: boolean;
        file?: File | null;
        fileUrl?: string | null;
        fileName?: string;
        isExisting?: boolean;
    }>>([]);

    const [inspectionForm, setInspectionForm] = useState({
        expiryDate: '',
        description: '',
        ignoreExpiration: false,
        scheduledOn: '',
        after: '',
        unit: '',
        file: null as File | null
    });

    // State to track which inspection is being edited
    const [editingInspectionId, setEditingInspectionId] = useState<string | null>(null);
    const [editingInspectionType, setEditingInspectionType] = useState<'oneTime' | 'recurring' | null>(null);

    // Function to handle clicking on an inspection row to edit it
    const handleEditInspection = (inspection: any, type: 'oneTime' | 'recurring') => {
        console.log('✏️ Editing inspection:', inspection, 'Type:', type);
        setEditingInspectionId(inspection.id);
        setEditingInspectionType(type);

        if (type === 'oneTime') {
            setInspectionForm({
                expiryDate: inspection.expiryDate || '',
                description: inspection.description || '',
                ignoreExpiration: inspection.ignoreExpiration || false,
                scheduledOn: '',
                after: '',
                unit: '',
                file: null // Don't set existing file, user can upload new one
            });
        } else {
            setInspectionForm({
                expiryDate: '',
                description: inspection.description || '',
                ignoreExpiration: inspection.ignoreExpiration || false,
                scheduledOn: inspection.scheduledOn || '',
                after: inspection.after || '',
                unit: inspection.unit || '',
                file: null
            });
        }
    };

    // Function to save/update inspection
    const handleSaveInspection = () => {
        if (editingInspectionId && editingInspectionType === 'oneTime') {
            // Update existing one-time inspection
            setOneTimeInspections(oneTimeInspections.map(insp =>
                insp.id === editingInspectionId
                    ? {
                        ...insp,
                        expiryDate: inspectionForm.expiryDate,
                        description: inspectionForm.description,
                        ignoreExpiration: inspectionForm.ignoreExpiration,
                        file: inspectionForm.file || insp.file,
                        fileName: inspectionForm.file?.name || insp.fileName,
                        fileUrl: inspectionForm.file ? undefined : insp.fileUrl // Clear fileUrl if new file
                    }
                    : insp
            ));
            console.log('✅ Updated one-time inspection');
        } else if (editingInspectionId && editingInspectionType === 'recurring') {
            // Update existing recurring inspection
            setRecurringInspections(recurringInspections.map(insp =>
                insp.id === editingInspectionId
                    ? {
                        ...insp,
                        scheduledOn: inspectionForm.scheduledOn,
                        after: inspectionForm.after,
                        unit: inspectionForm.unit,
                        description: inspectionForm.description,
                        ignoreExpiration: inspectionForm.ignoreExpiration,
                        file: inspectionForm.file || insp.file,
                        fileName: inspectionForm.file?.name || insp.fileName,
                        fileUrl: inspectionForm.file ? undefined : insp.fileUrl
                    }
                    : insp
            ));
            console.log('✅ Updated recurring inspection');
        } else {
            // Add new inspection
            if (inspectionType === 'One Time' && inspectionForm.expiryDate && inspectionForm.description) {
                setOneTimeInspections([...oneTimeInspections, {
                    id: Date.now().toString(),
                    expiryDate: inspectionForm.expiryDate,
                    description: inspectionForm.description,
                    ignoreExpiration: inspectionForm.ignoreExpiration,
                    file: inspectionForm.file,
                    fileName: inspectionForm.file?.name
                }]);
                console.log('✅ Added new one-time inspection');
            } else if (inspectionType === 'Recurring' && inspectionForm.scheduledOn && inspectionForm.description) {
                setRecurringInspections([...recurringInspections, {
                    id: Date.now().toString(),
                    scheduledOn: inspectionForm.scheduledOn,
                    after: inspectionForm.after,
                    unit: inspectionForm.unit,
                    description: inspectionForm.description,
                    ignoreExpiration: inspectionForm.ignoreExpiration,
                    file: inspectionForm.file,
                    fileName: inspectionForm.file?.name
                }]);
                console.log('✅ Added new recurring inspection');
            }
        }

        // Reset form and editing state
        setInspectionForm({ expiryDate: '', description: '', ignoreExpiration: false, scheduledOn: '', after: '', unit: '', file: null });
        setEditingInspectionId(null);
        setEditingInspectionType(null);
    };

    // Function to delete inspection
    const handleDeleteInspection = (id: string, type: 'oneTime' | 'recurring') => {
        if (type === 'oneTime') {
            setOneTimeInspections(oneTimeInspections.filter(insp => insp.id !== id));
        } else {
            setRecurringInspections(recurringInspections.filter(insp => insp.id !== id));
        }
        console.log('🗑️ Deleted inspection:', id);
    };

    // Documents data (single list, no tabs)
    const [documents, setDocuments] = useState<Array<{
        id: string;
        _id?: string;
        title: string;
        expiryDate: string;
        description: string;
        file: File | null;
        fileUrl?: string | null;
        fileName?: string;
        ignoreExpiration: boolean;
        isExisting?: boolean;
    }>>([]);
    const [documentForm, setDocumentForm] = useState({
        title: '',
        expiryDate: '',
        description: '',
        file: null as File | null,
        ignoreExpiration: false
    });
    const [editingDocumentId, setEditingDocumentId] = useState<string | null>(null);

    // Invoices data
    const [invoices, setInvoices] = useState<Array<{
        id: string;
        _id?: string;
        invoiceNumber: string;
        vendorWorkshop: string;
        amount: string;
        invoiceDate: string;
        file: File | null;
        fileUrl?: string | null;
        fileName?: string | null;
        notes: string;
        isExisting?: boolean;
    }>>([]);

    const [invoiceForm, setInvoiceForm] = useState({
        invoiceNumber: '',
        vendorWorkshop: '',
        amount: '',
        invoiceDate: '',
        file: null as File | null,
        notes: ''
    });

    const [editingInvoiceId, setEditingInvoiceId] = useState<string | null>(null);
    const invoiceFileInputRef = useRef<HTMLInputElement>(null);

    // Notes data
    const [notes, setNotes] = useState<Array<{
        id: string;
        note: string;
        category: string;
    }>>([]);
    const [noteForm, setNoteForm] = useState({
        note: '',
        category: 'Category'
    });
    const [editingNoteId, setEditingNoteId] = useState<string | null>(null);

    // Payroll data
    const [paymentMethod, setPaymentMethod] = useState<'PAID PER MILE' | 'PAID PERCENT' | 'PAID BY TRIP' | 'PAID PER HOUR'>('PAID PER MILE');
    const [payrollForm, setPayrollForm] = useState({
        corporationName: '',
        fullAddress: '',
        driverName: '',
        email: '',
        alone: '0',
        team: '0',
        empty: '0',
        emptyTeam: '0',
        percentRate: '0',
        perTripAmount: '0',
        perHour: '0',
        companyPaysFuel: false,
        gstNo: '',
        customHst: ''
    });

    // Deductions data
    const [deductions, setDeductions] = useState<Array<{
        id: string;
        startDate: string;
        description: string;
        fee: string;
        interval: string;
        currency: string;
    }>>([]);
    const [deductionForm, setDeductionForm] = useState({
        startDate: '',
        description: '',
        fee: '0',
        interval: 'Interval',
        currency: 'CAD'
    });

    // Additions data
    const [additions, setAdditions] = useState<Array<{
        id: string;
        startDate: string;
        description: string;
        amount: string;
        interval: string;
        currency: string;
    }>>([]);
    const [additionForm, setAdditionForm] = useState({
        startDate: '',
        description: '',
        amount: '0',
        interval: 'Interval',
        currency: 'CAD'
    });

    // Form data
    const [formData, setFormData] = useState({
        unitNumber: '',
        vinNumber: '',
        plateNumber: '',
        registrationCountry: '',
        registrationProvince: '',
        make: '',
        model: '',
        year: '',
        type: 'Truck',
        weight: '0',
        uom: 'Kg',
        assetValue: '0',
        status: 'In Service',
        odometer: '',
        trackingKey: '',
        trailer: '',
        ownership: 'COMPANY ASSET' as 'COMPANY ASSET' | 'OWNER OPERATOR',
        operator: '',
        coOperator: '',
        fleet: '',
        yard: '',
        subType: '' as '' | 'HIGHWAY USE' | 'CITY USE' | 'STORAGE USE' | 'RENTAL' | 'OTHER'
    });

    // Update activeTab when route changes
    useEffect(() => {
        const newTab = getInitialTab(routeCategory);
        setActiveTab(newTab);
    }, [routeCategory]);

    // Column filters
    const [filters, setFilters] = useState({
        unitNumber: '',
        plateNumber: '',
        ownership: 'All',
        operatingStatus: 'All',
        dispatchStatus: 'All',
        dispatchInfo: '',
        compliance: 'All'
    });

    // Sort configuration
    const [sortConfig, setSortConfig] = useState<{ key: keyof Truck | null; direction: 'asc' | 'desc' }>({
        key: null,
        direction: 'asc'
    });

    // Countries data
    const [countries, setCountries] = useState<Country[]>([]);

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
            });
    }, []);

    // Fetch yards from API
    useEffect(() => {
        const fetchYards = async () => {
            try {
                const response = await getAllYards();
                if (response.success) {
                    setYards(response.data || []);
                }
            } catch (error) {
                console.error('Error fetching yards:', error);
            }
        };
        fetchYards();
    }, []);

    // Fetch active orders to determine truck assignments (for Unassigned tab)
    useEffect(() => {
        const fetchActiveOrders = async () => {
            try {
                const response = await apiClient.get('dispatcher/order?status=IN_PROGRESS,dispatched,in-delivery,CONFIRMED&limit=1000');
                if (response?.data?.success && response?.data?.data) {
                    const assignedIds = new Set<string>();
                    response.data.data.forEach((order: any) => {
                        if (order.truck?._id) {
                            assignedIds.add(order.truck._id.toString());
                        } else if (order.truck && typeof order.truck === 'string') {
                            assignedIds.add(order.truck);
                        }
                    });
                    setAssignedTruckIds(assignedIds);
                }
            } catch (error) {
                console.error('Error fetching active orders:', error);
            }
        };
        fetchActiveOrders();
    }, []);

    // Fetch trucks from API
    // Fetch trucks based on activeTab
    useEffect(() => {
        const fetchTrucks = async () => {
            setLoading(true);
            try {
                // Determine filter parameters based on activeTab
                let yardFilter: string | undefined = undefined;
                let ownershipFilter: string | undefined = undefined;

                if (activeTab === 'All') {
                    // No filters - fetch all
                } else if (activeTab === 'External') {
                    ownershipFilter = 'OWNER OPERATOR';
                } else if (activeTab === 'Unassigned') {
                    // For unassigned, we'll fetch all and filter on frontend
                    // (or could create a backend endpoint for this)
                } else {
                    // Yard filter - activeTab is a yard ID
                    yardFilter = activeTab;
                }

                const response = await getAllVehicles(
                    1,
                    1000,
                    undefined, // search
                    undefined, // type
                    undefined, // status
                    undefined, // operationStatus
                    ownershipFilter, // ownership
                    yardFilter // yard
                );

                if (response?.success && response?.data) {
                    // Transform backend data to match frontend interface
                    const transformedTrucks = response.data.map((truck: any) => ({
                        _id: truck._id,
                        id: truck._id,
                        unitNumber: truck.unitNumber || truck.internalId || '',
                        plateNumber: truck.plateNumber || '',
                        ownership: truck.ownership || truck.ownerShip || 'COMPANY ASSET',
                        notes: truck.notes || truck.note || '',
                        operatingStatus: (truck.operationStatus || truck.operatingStatus || 'IN SERVICE') as 'IN SERVICE' | 'OUT OF SERVICE' | 'MAINTENANCE',
                        compliance: (truck.compliance || 'NON-COMPLIANT') as 'COMPLIANT' | 'NON-COMPLIANT' | 'EXPIRING SOON',
                        category: truck.category,
                        imageUrl: truck.imageUrl,
                        make: truck.make,
                        model: truck.model,
                        year: truck.year,
                        vinNumber: truck.vinNumber,
                        status: truck.status,
                        internalId: truck.internalId,
                        type: truck.type,
                        weight: truck.weight,
                        uom: truck.uom,
                        registrationCountry: truck.registrationCountry,
                        registrationProvince: truck.registrationProvince,
                        subType: truck.subType,
                        lastDispatch: truck.lastDispatch,
                        lastDispatchDate: truck.lastDispatchDate,
                        lastDropLocation: truck.lastDropLocation,
                        yard: truck.yard || null // Keep full yard object
                    }));
                    // For Unassigned tab, filter out trucks assigned to orders
                    if (activeTab === 'Unassigned') {
                        const unassignedTrucks = transformedTrucks.filter((truck: Truck) => {
                            const truckId = truck._id?.toString() || truck.id?.toString();
                            return !truckId || !assignedTruckIds.has(truckId);
                        });
                        setTrucks(unassignedTrucks);
                    } else {
                        setTrucks(transformedTrucks);
                    }
                }
            } catch (error) {
                console.error('Error fetching trucks:', error);
                alert('Failed to fetch trucks. Please try again.');
            } finally {
                setLoading(false);
            }
        };
        fetchTrucks();
    }, [activeTab, assignedTruckIds]);

    // Fetch operators (employees with role 'operator')
    useEffect(() => {
        const fetchOperators = async () => {
            try {
                console.log('🔄 Fetching operators...');
                const response = await getAllEmployees(1, 1000, undefined, 'operator', 'active');
                console.log('📥 Operators API response:', response);

                if (response?.success && response?.data && Array.isArray(response.data)) {
                    const operatorList = response.data.map((emp: any) => ({
                        _id: emp._id,
                        name: emp.name || `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || emp.email,
                        email: emp.email
                    }));
                    console.log('✅ Operators list:', operatorList);
                    console.log(`✅ Found ${operatorList.length} operators`);
                    setOperators(operatorList);
                } else {
                    console.warn('⚠️ No operators found or invalid response:', response);
                    setOperators([]);
                }
            } catch (error) {
                console.error('❌ Error fetching operators:', error);
                setOperators([]);
            }
        };
        fetchOperators();
    }, []);

    // Fetch trailers
    useEffect(() => {
        const fetchTrailers = async () => {
            try {
                const response = await getAllTrailers(1, 1000);
                if (response?.success && response?.data) {
                    const trailerList = response.data.map((trailer: any) => ({
                        _id: trailer._id,
                        unitNumber: trailer.unitNumber || trailer.trailer || '',
                        trailer: trailer.trailer || trailer.unitNumber || ''
                    }));
                    setTrailers(trailerList);
                }
            } catch (error) {
                console.error('Error fetching trailers:', error);
            }
        };
        fetchTrailers();
    }, []);

    // Fetch drivers from API
    useEffect(() => {
        const fetchDrivers = async () => {
            try {
                console.log('🔄 Fetching drivers for operator dropdown...');
                const response = await getAllDrivers(1, 1000, '', 'active');
                console.log('📥 Drivers API response:', response);
                if (response?.success && response?.data && Array.isArray(response.data)) {
                    console.log('✅ Drivers fetched:', response.data.length);
                    setDrivers(response.data);
                } else if (response?.data && Array.isArray(response.data)) {
                    console.log('✅ Drivers fetched (alternative format):', response.data.length);
                    setDrivers(response.data);
                } else {
                    console.warn('⚠️ No drivers found or invalid response:', response);
                    setDrivers([]);
                }
            } catch (error) {
                console.error('❌ Error fetching drivers:', error);
                setDrivers([]);
            }
        };
        fetchDrivers();
    }, []);

    // Load truck for edit
    useEffect(() => {
        const loadTruckForEdit = async () => {
            console.log('🔄 loadTruckForEdit useEffect triggered');
            console.log('🔍 editingId:', editingId);

            if (!editingId) {
                console.log('⚠️ No editingId, skipping load');
                return;
            }

            console.log('📡 Fetching truck data for ID:', editingId);
            setLoading(true);
            try {
                const response = await getVehicleById(editingId);
                console.log('📥 Truck data for edit:', response?.data);
                if (response?.success && response?.data) {
                    const truck = response.data;
                    const truckFormData = {
                        unitNumber: truck.unitNumber || truck.internalId || '',
                        vinNumber: truck.vinNumber || '',
                        plateNumber: truck.plateNumber || '',
                        make: truck.make || '',
                        model: truck.model || '',
                        year: truck.year || '',
                        weight: truck.weight || '0',
                        registrationCountry: truck.registrationCountry || '',
                        registrationProvince: truck.registrationProvince || '',
                        type: truck.type || 'Truck',
                        uom: truck.uom || 'Kg',
                        status: truck.status || 'In Service',
                        ownership: (truck.ownership || truck.ownerShip || 'COMPANY ASSET') as 'COMPANY ASSET' | 'OWNER OPERATOR',
                        subType: (truck.subType || '') as '' | 'HIGHWAY USE' | 'CITY USE' | 'STORAGE USE' | 'RENTAL' | 'OTHER',
                        assetValue: truck.assetValue?.toString() || '0',
                        odometer: truck.odometer?.toString() || '',
                        trackingKey: truck.trackingKey || '',
                        trailer: truck.trailer?._id?.toString() || truck.trailer?.toString() || '',
                        operator: truck.operator?._id?.toString() || truck.operator?.toString() || '',
                        coOperator: truck.coOperator?._id?.toString() || truck.coOperator?.toString() || '',
                        fleet: truck.fleet || '',
                        yard: truck.yard?._id?.toString() || truck.yard?.toString() || ''
                    };
                    console.log('📝 Form data populated:', truckFormData);

                    setFormData(truckFormData);
                    setOriginalTruckData(truckFormData);
                    setSelectedImage(truck.imageUrl || null);
                    setSelectedImageFile(null);

                    // Load documents from separate API endpoint
                    console.log('📄 Fetching documents for vehicle:', editingId);
                    try {
                        const documentsResponse = await getVehicleDocument();
                        console.log('📄 All documents response:', documentsResponse);
                        console.log('📄 Response structure:', {
                            success: documentsResponse?.success,
                            hasData: !!documentsResponse?.data,
                            hasDocumentsByVehicle: !!documentsResponse?.documentsByVehicle,
                            documentsByVehicleCount: documentsResponse?.documentsByVehicle?.length
                        });

                        if (documentsResponse?.success && documentsResponse?.documentsByVehicle) {
                            // Find the vehicle entry that matches our editingId
                            const vehicleEntry = documentsResponse.documentsByVehicle.find((entry: any) =>
                                entry._id?.toString() === editingId ||
                                entry._id === editingId ||
                                entry.vehicle?._id?.toString() === editingId ||
                                entry.vehicle?._id === editingId
                            );

                            console.log('📄 Found vehicle entry:', vehicleEntry);

                            // Flatten all document types into a single list (no tabs)
                            const vehicleDocuments = vehicleEntry?.documents || [];
                            console.log('📄 Vehicle documents:', vehicleDocuments);
                            const flatDocs = vehicleDocuments.map((doc: any) => {
                                console.log('📄 Processing document:', {
                                    documentNumber: doc.documentNumber,
                                    hasFiles: !!doc.files?.length,
                                    fileUrl: doc.documentLocation
                                });
                                return {
                                    id: doc._id,
                                    _id: doc._id,
                                    title: doc.title || doc.documentType || doc.documentNumber || '',
                                    expiryDate: doc.expiryDate ? new Date(doc.expiryDate).toISOString().split('T')[0] : '',
                                    description: doc.documentNumber || doc.description || '',
                                    file: null,
                                    fileUrl: doc.files?.[0]?.fileUrl || doc.documentLocation,
                                    fileName: doc.files?.[0]?.fileName || (doc.files?.[0] ? 'Document' : null),
                                    ignoreExpiration: doc.ignoreExpiration || false,
                                    isExisting: true
                                };
                            });
                            console.log('📄 Documents (flat list):', flatDocs);
                            setDocuments(flatDocs);
                        } else {
                            console.log('📄 No documents found or API error');
                            setDocuments([]);
                        }
                    } catch (error) {
                        console.error('❌ Error fetching documents:', error);
                        setDocuments([]);
                    }

                    // Load inspections
                    if (truck.oneTimeInspections && Array.isArray(truck.oneTimeInspections) && truck.oneTimeInspections.length > 0) {
                        setOneTimeInspections(truck.oneTimeInspections.map((insp: any, index: number) => ({
                            id: insp._id || `one-time-${index}`,
                            expiryDate: insp.expiryDate ? new Date(insp.expiryDate).toISOString().split('T')[0] : '',
                            description: insp.description || '',
                            ignoreExpiration: insp.ignoreExpiration || false,
                            fileUrl: insp.fileUrl || null,
                            fileName: insp.fileName || null,
                            isExisting: true
                        })));
                    } else {
                        setOneTimeInspections([]);
                    }
                    if (truck.recurringInspections && Array.isArray(truck.recurringInspections) && truck.recurringInspections.length > 0) {
                        setRecurringInspections(truck.recurringInspections.map((insp: any, index: number) => ({
                            id: insp._id || `recurring-${index}`,
                            scheduledOn: insp.scheduledOn || '',
                            after: insp.after || '',
                            unit: insp.unit || '',
                            description: insp.description || '',
                            ignoreExpiration: insp.ignoreExpiration || false,
                            fileUrl: insp.fileUrl || null,
                            fileName: insp.fileName || null,
                            isExisting: true
                        })));
                    } else {
                        setRecurringInspections([]);
                    }


                    // Load notes
                    if (truck.notesArray && Array.isArray(truck.notesArray) && truck.notesArray.length > 0) {
                        setNotes(truck.notesArray.map((note: any, index: number) => ({
                            id: note._id || `note-${index}`,
                            note: note.note || '',
                            category: note.category || ''
                        })));
                    } else {
                        setNotes([]);
                    }

                    // Load invoices
                    if (truck.invoices && Array.isArray(truck.invoices) && truck.invoices.length > 0) {
                        setInvoices(truck.invoices.map((invoice: any, index: number) => ({
                            id: invoice._id || `invoice-${index}`,
                            _id: invoice._id,
                            invoiceNumber: invoice.invoiceNumber || '',
                            vendorWorkshop: invoice.vendorWorkshop || '',
                            amount: invoice.amount || '',
                            invoiceDate: invoice.invoiceDate ? new Date(invoice.invoiceDate).toISOString().split('T')[0] : '',
                            file: null,
                            fileUrl: invoice.fileUrl || null,
                            fileName: invoice.fileName || null,
                            notes: invoice.notes || ''
                        })));
                    } else {
                        setInvoices([]);
                    }

                    console.log('✅ Opening sidebar with truck data');
                    setShowSidebar(true);
                    setActiveStep('Details');
                } else {
                    console.error('❌ Invalid response from getVehicleById:', response);
                }
            } catch (error) {
                console.error('❌ Error loading truck for edit:', error);
                alert('Failed to load truck data. Please try again.');
            } finally {
                console.log('🏁 Load complete, setting loading to false');
                setLoading(false);
            }
        };

        loadTruckForEdit();
    }, [editingId]);

    // Get filtered trucks (backend already filters by yard/ownership, only apply local filters)
    const getFilteredTrucks = () => {
        // Backend already filters by yard/ownership, so we just use the trucks from state
        let filtered = [...trucks];

        // Filter by search term (Unit #, Plate #, Make, VIN)
        if (searchTerm) {
            filtered = filtered.filter(truck =>
                truck.unitNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                truck.plateNumber.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        // Filter by compliance status
        if (complianceStatus !== 'All') {
            filtered = filtered.filter(truck => {
                if (complianceStatus === 'Compliant') return truck.compliance === 'COMPLIANT';
                if (complianceStatus === 'Non-Compliant') return truck.compliance === 'NON-COMPLIANT';
                if (complianceStatus === 'Expiring Soon') return truck.compliance === 'EXPIRING SOON';
                return true;
            });
        }

        // Filter by category
        if (category === 'In Service Only') {
            filtered = filtered.filter(truck => truck.operatingStatus === 'IN SERVICE');
        }

        // Apply column filters
        if (filters.unitNumber) {
            filtered = filtered.filter(t => t.unitNumber.toLowerCase().includes(filters.unitNumber.toLowerCase()));
        }
        if (filters.plateNumber) {
            filtered = filtered.filter(t => t.plateNumber.toLowerCase().includes(filters.plateNumber.toLowerCase()));
        }
        if (filters.ownership !== 'All') {
            filtered = filtered.filter(t => t.ownership === filters.ownership);
        }
        if (filters.operatingStatus !== 'All') {
            filtered = filtered.filter(t => t.operatingStatus === filters.operatingStatus);
        }
        if (filters.dispatchStatus !== 'All') {
            filtered = filtered.filter(t => t.dispatchStatus === filters.dispatchStatus);
        }
        if (filters.dispatchInfo) {
            filtered = filtered.filter(t => (t.dispatchInfo || '').toLowerCase().includes(filters.dispatchInfo.toLowerCase()));
        }
        if (filters.compliance !== 'All') {
            filtered = filtered.filter(t => t.compliance === filters.compliance);
        }

        // Sort
        if (sortConfig.key) {
            filtered = [...filtered].sort((a, b) => {
                const aValue = a[sortConfig.key!] ?? '';
                const bValue = b[sortConfig.key!] ?? '';

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

    const filteredTrucks = getFilteredTrucks();

    const handleExportTrucks = async () => {
        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'Logistiq Innovation';
        workbook.created = new Date();
        const sheet = workbook.addWorksheet('Trucks', { views: [{ state: 'frozen', ySplit: 1 }] });

        sheet.columns = [
            { header: 'Unit Number', key: 'unitNumber', width: 16 },
            { header: 'Plate Number', key: 'plateNumber', width: 16 },
            { header: 'VIN Number', key: 'vinNumber', width: 22 },
            { header: 'Make', key: 'make', width: 14 },
            { header: 'Model', key: 'model', width: 14 },
            { header: 'Year', key: 'year', width: 10 },
            { header: 'Ownership', key: 'ownership', width: 20 },
            { header: 'Operating Status', key: 'operatingStatus', width: 18 },
            { header: 'Dispatch Status', key: 'dispatchStatus', width: 18 },
            { header: 'Compliance', key: 'compliance', width: 18 },
            { header: 'Category', key: 'category', width: 14 },
            { header: 'Reg. Country', key: 'registrationCountry', width: 16 },
            { header: 'Reg. Province', key: 'registrationProvince', width: 16 },
            { header: 'Notes', key: 'notes', width: 30 },
        ];

        const headerRow = sheet.getRow(1);
        headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
        headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF42AEEC' } };
        headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
        headerRow.height = 22;

        filteredTrucks.forEach((t: any) => {
            const row = sheet.addRow({
                unitNumber: t.unitNumber || '',
                plateNumber: t.plateNumber || '',
                vinNumber: t.vinNumber || '',
                make: t.make || '',
                model: t.model || '',
                year: t.year || '',
                ownership: t.ownership || '',
                operatingStatus: t.operatingStatus || '',
                dispatchStatus: t.dispatchStatus || '',
                compliance: t.compliance || '',
                category: t.category || '',
                registrationCountry: t.registrationCountry || '',
                registrationProvince: t.registrationProvince || '',
                notes: t.notes || '',
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
        a.download = `Trucks-${new Date().toISOString().split('T')[0]}.xlsx`;
        document.body.appendChild(a);
        a.click();
        URL.revokeObjectURL(url);
        document.body.removeChild(a);
    };

    // Count trucks by category - fetch counts from backend
    const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({});

    // Fetch counts for all categories
    useEffect(() => {
        const fetchCategoryCounts = async () => {
            try {
                const counts: Record<string, number> = {};

                // Fetch All count
                const allResponse = await getAllVehicles(1, 1);
                counts['All'] = allResponse?.pagination?.total || 0;

                // Fetch External count
                const externalResponse = await getAllVehicles(1, 1, undefined, undefined, undefined, undefined, 'OWNER OPERATOR');
                counts['External'] = externalResponse?.pagination?.total || 0;

                // Fetch Unassigned count (fetch all and filter)
                const unassignedResponse = await getAllVehicles(1, 1000);
                if (unassignedResponse?.success && unassignedResponse?.data) {
                    const unassignedCount = unassignedResponse.data.filter((truck: any) => {
                        const truckId = truck._id?.toString();
                        return !truckId || !assignedTruckIds.has(truckId);
                    }).length;
                    counts['Unassigned'] = unassignedCount;
                } else {
                    counts['Unassigned'] = 0;
                }

                // Fetch counts for each yard
                for (const yard of yards) {
                    if (yard.status === 'active' && yard._id) {
                        const yardResponse = await getAllVehicles(1, 1, undefined, undefined, undefined, undefined, undefined, yard._id);
                        counts[yard._id] = yardResponse?.pagination?.total || 0;
                    }
                }

                setCategoryCounts(counts);
            } catch (error) {
                console.error('Error fetching category counts:', error);
            }
        };

        if (yards.length > 0 || assignedTruckIds.size > 0) {
            fetchCategoryCounts();
        }
    }, [yards, assignedTruckIds]);

    const getCountByCategory = (category: string) => {
        return categoryCounts[category] || 0;
    };

    // Validate required fields
    const validateTruckForm = (): boolean => {
        const errors: string[] = [];

        if (!formData.unitNumber.trim()) errors.push('Unit # is required');
        if (!formData.plateNumber.trim()) errors.push('Plate # is required');
        if (!formData.vinNumber.trim()) errors.push('VIN is required');
        if (!formData.make.trim()) errors.push('Make is required');
        if (!formData.model.trim()) errors.push('Model is required');
        if (!formData.year.trim()) errors.push('Year is required');
        if (!formData.type.trim()) errors.push('Type is required');
        if (!formData.registrationCountry.trim()) errors.push('Registration Country is required');
        if (!formData.ownership.trim()) errors.push('Ownership is required');
        if (!formData.weight || formData.weight === '0') errors.push('Weight is required');

        setValidationErrors(errors);
        return errors.length === 0;
    };

    // Handle create/update truck
    const handleSaveTruck = async () => {
        // Validate before saving
        if (!validateTruckForm()) {
            return;
        }

        setLoading(true);
        try {
            const formDataToSend = new FormData();

            if (editingId && originalTruckData) {
                // Partial update - only send changed fields
                if (formData.unitNumber !== originalTruckData.unitNumber) {
                    formDataToSend.append('unitNumber', formData.unitNumber);
                    formDataToSend.append('internalId', formData.unitNumber);
                }
                if (formData.vinNumber !== originalTruckData.vinNumber) {
                    formDataToSend.append('vinNumber', formData.vinNumber);
                }
                if (formData.plateNumber !== originalTruckData.plateNumber) {
                    formDataToSend.append('plateNumber', formData.plateNumber);
                }
                if (formData.make !== originalTruckData.make) {
                    formDataToSend.append('make', formData.make || '');
                }
                if (formData.model !== originalTruckData.model) {
                    formDataToSend.append('model', formData.model || '');
                }
                if (formData.year !== originalTruckData.year) {
                    formDataToSend.append('year', formData.year || '');
                }
                if (formData.weight !== originalTruckData.weight) {
                    formDataToSend.append('weight', formData.weight || '0');
                }
                if (formData.uom !== originalTruckData.uom) {
                    formDataToSend.append('uom', formData.uom || 'Kg');
                }
                if (formData.registrationCountry !== originalTruckData.registrationCountry) {
                    formDataToSend.append('registrationCountry', formData.registrationCountry || '');
                }
                if (formData.registrationProvince !== originalTruckData.registrationProvince) {
                    formDataToSend.append('registrationProvince', formData.registrationProvince || '');
                }
                if (formData.type !== originalTruckData.type) {
                    formDataToSend.append('type', formData.type || 'Truck');
                }
                if (formData.status !== originalTruckData.status) {
                    formDataToSend.append('status', formData.status || 'In Service');
                    formDataToSend.append('operationStatus', formData.status === 'In Service' ? 'IN SERVICE' : formData.status === 'Out of Service' ? 'OUT OF SERVICE' : 'MAINTENANCE');
                }
                if (formData.ownership !== originalTruckData.ownership) {
                    formDataToSend.append('ownership', formData.ownership || 'COMPANY ASSET');
                }
                if (formData.subType !== originalTruckData.subType) {
                    formDataToSend.append('subType', formData.subType || '');
                }

                if (selectedImageFile) {
                    formDataToSend.append('image', selectedImageFile);
                }

                // Add inspections and notes
                // Handle one-time inspections with files
                console.log('🔍 [UPDATE] Processing oneTimeInspections:', oneTimeInspections);
                oneTimeInspections.forEach((insp, index) => {
                    if (insp.file) {
                        console.log(`📎 [UPDATE] Appending file for oneTime inspection ${index}:`, insp.file.name);
                        formDataToSend.append(`oneTimeInspectionFiles`, insp.file);
                    } else if (insp.fileUrl) {
                        console.log(`✅ [UPDATE] Preserving existing file for oneTime inspection ${index}:`, insp.fileName);
                    }
                });
                formDataToSend.append('oneTimeInspections', JSON.stringify(oneTimeInspections.map((insp) => {
                    const hasNewFile = !!insp.file;
                    return {
                        expiryDate: insp.expiryDate ? new Date(insp.expiryDate).toISOString() : null,
                        description: insp.description,
                        ignoreExpiration: insp.ignoreExpiration,
                        fileName: insp.fileName,
                        fileUrl: insp.fileUrl,
                        hasFile: hasNewFile
                    };
                })));

                // Handle recurring inspections with files
                console.log('🔍 [UPDATE] Processing recurringInspections:', recurringInspections);
                recurringInspections.forEach((insp, index) => {
                    if (insp.file) {
                        console.log(`📎 [UPDATE] Appending file for recurring inspection ${index}:`, insp.file.name);
                        formDataToSend.append(`recurringInspectionFiles`, insp.file);
                    } else if (insp.fileUrl) {
                        console.log(`✅ [UPDATE] Preserving existing file for recurring inspection ${index}:`, insp.fileName);
                    }
                });
                formDataToSend.append('recurringInspections', JSON.stringify(recurringInspections.map((insp) => {
                    const hasNewFile = !!insp.file;
                    return {
                        scheduledOn: insp.scheduledOn,
                        after: insp.after,
                        unit: insp.unit,
                        description: insp.description,
                        ignoreExpiration: insp.ignoreExpiration,
                        fileName: insp.fileName,
                        fileUrl: insp.fileUrl,
                        hasFile: hasNewFile
                    };
                })));

                formDataToSend.append('notesArray', JSON.stringify(notes.map(note => ({
                    note: note.note,
                    category: note.category
                }))));

                // Handle invoices with files
                console.log('🔍 [UPDATE] Processing invoices:', invoices);
                invoices.forEach((invoice, index) => {
                    if (invoice.file) {
                        console.log(`📎 [UPDATE] Appending file for invoice ${index}:`, invoice.file.name);
                        formDataToSend.append(`invoiceFiles`, invoice.file);
                    }
                });
                formDataToSend.append('invoices', JSON.stringify(invoices.map((invoice) => {
                    const hasNewFile = !!invoice.file;
                    return {
                        invoiceNumber: invoice.invoiceNumber,
                        vendorWorkshop: invoice.vendorWorkshop,
                        amount: invoice.amount,
                        invoiceDate: invoice.invoiceDate,
                        notes: invoice.notes,
                        fileName: invoice.fileName,
                        fileUrl: invoice.fileUrl,
                        hasFile: hasNewFile
                    };
                })));

                const response = await updateVehicle(editingId, formDataToSend);
                if (response?.success) {
                    // Refresh trucks list
                    const refreshResponse = await getAllVehicles(1, 1000);
                    if (refreshResponse?.success && refreshResponse?.data) {
                        const transformedTrucks = refreshResponse.data.map((truck: any) => ({
                            _id: truck._id,
                            id: truck._id,
                            unitNumber: truck.unitNumber || truck.internalId || '',
                            plateNumber: truck.plateNumber || '',
                            ownership: truck.ownership || truck.ownerShip || 'COMPANY ASSET',
                            notes: truck.notes || truck.note || '',
                            operatingStatus: (truck.operationStatus || truck.operatingStatus || 'IN SERVICE') as 'IN SERVICE' | 'OUT OF SERVICE' | 'MAINTENANCE',
                            compliance: (truck.compliance || 'NON-COMPLIANT') as 'COMPLIANT' | 'NON-COMPLIANT' | 'EXPIRING SOON',
                            category: truck.category,
                            imageUrl: truck.imageUrl,
                            make: truck.make,
                            model: truck.model,
                            year: truck.year,
                            vinNumber: truck.vinNumber,
                            status: truck.status,
                            internalId: truck.internalId,
                            type: truck.type,
                            weight: truck.weight,
                            uom: truck.uom,
                            registrationCountry: truck.registrationCountry,
                            registrationProvince: truck.registrationProvince,
                            subType: truck.subType,
                            lastDispatch: truck.lastDispatch,
                            lastDispatchDate: truck.lastDispatchDate,
                            lastDropLocation: truck.lastDropLocation,
                            yard: truck.yard || null // Include yard field
                        }));
                        setTrucks(transformedTrucks);
                    }
                } else {
                    alert(response?.message || 'Failed to update truck. Please try again.');
                }
            } else {
                // Create new truck - send all fields
                formDataToSend.append('unitNumber', formData.unitNumber);
                formDataToSend.append('internalId', formData.unitNumber);
                formDataToSend.append('vinNumber', formData.vinNumber);
                formDataToSend.append('plateNumber', formData.plateNumber);
                formDataToSend.append('make', formData.make || '');
                formDataToSend.append('model', formData.model || '');
                formDataToSend.append('year', formData.year || '');
                formDataToSend.append('weight', formData.weight || '0');
                formDataToSend.append('uom', formData.uom || 'Kg');
                formDataToSend.append('registrationCountry', formData.registrationCountry || '');
                formDataToSend.append('registrationProvince', formData.registrationProvince || '');
                formDataToSend.append('type', formData.type || 'Truck');
                formDataToSend.append('status', formData.status || 'In Service');
                formDataToSend.append('ownership', formData.ownership || 'COMPANY ASSET');
                formDataToSend.append('subType', formData.subType || '');
                formDataToSend.append('operationStatus', formData.status === 'In Service' ? 'IN SERVICE' : formData.status === 'Out of Service' ? 'OUT OF SERVICE' : 'MAINTENANCE');

                // Add optional fields
                if (formData.trailer) {
                    formDataToSend.append('trailer', formData.trailer);
                }
                if (formData.operator) {
                    formDataToSend.append('operator', formData.operator);
                }
                if (formData.coOperator) {
                    formDataToSend.append('coOperator', formData.coOperator);
                }
                if (formData.yard) {
                    formDataToSend.append('yard', formData.yard);
                }
                if (formData.fleet) {
                    formDataToSend.append('fleet', formData.fleet);
                }
                if (formData.odometer) {
                    formDataToSend.append('odometer', formData.odometer);
                }
                if (formData.trackingKey) {
                    formDataToSend.append('trackingKey', formData.trackingKey);
                }
                if (formData.assetValue) {
                    formDataToSend.append('assetValue', formData.assetValue);
                }

                if (selectedImageFile) {
                    formDataToSend.append('image', selectedImageFile);
                }

                // Add inspections and notes
                // Handle one-time inspections with files
                console.log('🔍 [CREATE] Processing oneTimeInspections:', oneTimeInspections);
                oneTimeInspections.forEach((insp, index) => {
                    if (insp.file) {
                        console.log(`📎 [CREATE] Appending file for oneTime inspection ${index}:`, insp.file.name);
                        formDataToSend.append(`oneTimeInspectionFiles`, insp.file);
                    }
                });
                formDataToSend.append('oneTimeInspections', JSON.stringify(oneTimeInspections.map((insp) => {
                    const hasNewFile = !!insp.file;
                    return {
                        expiryDate: insp.expiryDate ? new Date(insp.expiryDate).toISOString() : null,
                        description: insp.description,
                        ignoreExpiration: insp.ignoreExpiration,
                        fileName: insp.fileName,
                        fileUrl: insp.fileUrl,
                        hasFile: hasNewFile
                    };
                })));

                // Handle recurring inspections with files
                console.log('🔍 [CREATE] Processing recurringInspections:', recurringInspections);
                recurringInspections.forEach((insp, index) => {
                    if (insp.file) {
                        console.log(`📎 [CREATE] Appending file for recurring inspection ${index}:`, insp.file.name);
                        formDataToSend.append(`recurringInspectionFiles`, insp.file);
                    }
                });
                formDataToSend.append('recurringInspections', JSON.stringify(recurringInspections.map((insp) => {
                    const hasNewFile = !!insp.file;
                    return {
                        scheduledOn: insp.scheduledOn,
                        after: insp.after,
                        unit: insp.unit,
                        description: insp.description,
                        ignoreExpiration: insp.ignoreExpiration,
                        fileName: insp.fileName,
                        fileUrl: insp.fileUrl,
                        hasFile: hasNewFile
                    };
                })));

                formDataToSend.append('notesArray', JSON.stringify(notes.map(note => ({
                    note: note.note,
                    category: note.category
                }))));

                // Handle invoices with files
                console.log('🔍 [CREATE] Processing invoices:', invoices);
                invoices.forEach((invoice, index) => {
                    if (invoice.file) {
                        console.log(`📎 [CREATE] Appending file for invoice ${index}:`, invoice.file.name);
                        formDataToSend.append(`invoiceFiles`, invoice.file);
                    }
                });
                formDataToSend.append('invoices', JSON.stringify(invoices.map((invoice) => {
                    const hasNewFile = !!invoice.file;
                    return {
                        invoiceNumber: invoice.invoiceNumber,
                        vendorWorkshop: invoice.vendorWorkshop,
                        amount: invoice.amount,
                        invoiceDate: invoice.invoiceDate,
                        notes: invoice.notes,
                        fileName: invoice.fileName,
                        fileUrl: invoice.fileUrl,
                        hasFile: hasNewFile
                    };
                })));

                const response = await createVehicle(formDataToSend);
                if (response?.success) {
                    const newTruckId = response?.data?._id || response?.data?.id;

                    // Handle documents for newly created truck (single list, no tabs)
                    if (newTruckId) {
                        const docsToCreate = documents.filter(
                            (doc) => !doc.isExisting && (doc.file || doc.description || doc.title)
                        );
                        if (docsToCreate.length > 0) {
                            try {
                                await Promise.all(docsToCreate.map(async (doc) => {
                                    const docFormData = new FormData();
                                    docFormData.append('vehicleId', newTruckId);
                                    docFormData.append('assetType', 'vehicle');
                                    docFormData.append('documentType', 'General');
                                    docFormData.append('documentNumber', doc.description || '');
                                    if (doc.title) docFormData.append('title', doc.title);
                                    if (doc.expiryDate) docFormData.append('expiryDate', doc.expiryDate);
                                    if (doc.file) docFormData.append('file', doc.file);
                                    await createVehicleDocument(docFormData);
                                }));
                            } catch (docError) {
                                console.error('❌ Error creating documents:', docError);
                            }
                        }
                    }

                    // Refresh trucks list
                    const refreshResponse = await getAllVehicles(1, 1000);
                    if (refreshResponse?.success && refreshResponse?.data) {
                        const transformedTrucks = refreshResponse.data.map((truck: any) => ({
                            _id: truck._id,
                            id: truck._id,
                            unitNumber: truck.unitNumber || truck.internalId || '',
                            plateNumber: truck.plateNumber || '',
                            ownership: truck.ownership || truck.ownerShip || 'COMPANY ASSET',
                            notes: truck.notes || truck.note || '',
                            operatingStatus: (truck.operationStatus || truck.operatingStatus || 'IN SERVICE') as 'IN SERVICE' | 'OUT OF SERVICE' | 'MAINTENANCE',
                            compliance: (truck.compliance || 'NON-COMPLIANT') as 'COMPLIANT' | 'NON-COMPLIANT' | 'EXPIRING SOON',
                            category: truck.category,
                            imageUrl: truck.imageUrl,
                            make: truck.make,
                            model: truck.model,
                            year: truck.year,
                            vinNumber: truck.vinNumber,
                            status: truck.status,
                            internalId: truck.internalId,
                            type: truck.type,
                            weight: truck.weight,
                            uom: truck.uom,
                            registrationCountry: truck.registrationCountry,
                            registrationProvince: truck.registrationProvince,
                            subType: truck.subType,
                            lastDispatch: truck.lastDispatch,
                            lastDispatchDate: truck.lastDispatchDate,
                            lastDropLocation: truck.lastDropLocation,
                            yard: truck.yard || null // Include yard field
                        }));
                        setTrucks(transformedTrucks);
                    }
                } else if (response?.code === 'TRUCK_LIMIT_REACHED') {
                    setTruckLimitModal({
                        show: true,
                        maxTrucks: response.maxTrucks ?? 0,
                        usedTrucks: response.usedTrucks ?? 0,
                    });
                } else {
                    alert(response?.message || 'Failed to create truck. Please try again.');
                }
            }

            // Handle documents for updates (single list, no tabs)
            if (editingId) {
                const vehicleId = editingId;
                const newDocs = documents.filter((doc) => !doc.isExisting && (doc.file || doc.description || doc.title));
                const existingDocs = documents.filter((doc) => doc.isExisting && doc._id);

                if (newDocs.length > 0) {
                    try {
                        await Promise.all(newDocs.map(async (doc) => {
                            const docFormData = new FormData();
                            docFormData.append('vehicleId', vehicleId);
                            docFormData.append('assetType', 'vehicle');
                            docFormData.append('documentType', 'General');
                            docFormData.append('documentNumber', doc.description || '');
                            if (doc.title) docFormData.append('title', doc.title);
                            if (doc.expiryDate) docFormData.append('expiryDate', doc.expiryDate);
                            if (doc.file) docFormData.append('file', doc.file);
                            await createVehicleDocument(docFormData);
                        }));
                    } catch (docError) {
                        console.error('❌ Error creating documents:', docError);
                    }
                }

                if (existingDocs.length > 0) {
                    try {
                        await Promise.all(existingDocs.map(async (doc) => {
                            const docFormData = new FormData();
                            docFormData.append('vehicleId', vehicleId);
                            docFormData.append('assetType', 'vehicle');
                            docFormData.append('documentType', 'General');
                            docFormData.append('documentNumber', doc.description || '');
                            if (doc.title) docFormData.append('title', doc.title);
                            if (doc.expiryDate) docFormData.append('expiryDate', doc.expiryDate);
                            else docFormData.append('expiryDate', '');
                            if (doc.file && doc.file instanceof File) docFormData.append('file', doc.file);
                            await updateVehicleDocument(doc._id!, docFormData);
                        }));
                    } catch (docError) {
                        console.error('❌ Error updating documents:', docError);
                    }
                }
            }

            // Reset form
            setFormData({
                unitNumber: '',
                vinNumber: '',
                plateNumber: '',
                registrationCountry: '',
                registrationProvince: '',
                make: '',
                model: '',
                year: '',
                type: 'Truck',
                weight: '0',
                uom: 'Kg',
                assetValue: '0',
                status: 'In Service',
                odometer: '',
                trackingKey: '',
                trailer: '',
                ownership: 'COMPANY ASSET',
                operator: '',
                coOperator: '',
                fleet: '',
                yard: '',
                subType: ''
            });
            setSelectedImage(null);
            setSelectedImageFile(null);
            setEditingId(null);
            setOriginalTruckData(null);
            setDocuments([]);
            setOneTimeInspections([]);
            setRecurringInspections([]);
            setNotes([]);
            setEditingDocumentId(null);
            setEditingNoteId(null);
            setShowSidebar(false);
        } catch (error) {
            console.error('Error saving truck:', error);
            alert('Failed to save truck. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // Handle delete click - show confirmation modal
    const handleDeleteClick = (id: string) => {
        setDeleteTargetId(id);
        setShowDeleteConfirmation(true);
    };

    // Handle delete truck after confirmation
    const handleDeleteTruck = async () => {
        if (!deleteTargetId) return;

        setShowDeleteConfirmation(false);
        setLoading(true);
        try {
            const response = await deleteVehicle(deleteTargetId);
            if (response?.success) {
                setTrucks(trucks.filter(t => (t._id || t.id) !== deleteTargetId));
            } else {
                alert(response?.message || 'Failed to delete truck. Please try again.');
            }
        } catch (error) {
            console.error('Error deleting truck:', error);
            alert('Failed to delete truck. Please try again.');
        } finally {
            setLoading(false);
            setDeleteTargetId(null);
        }
    };

    // Handle edit truck
    const handleEditTruck = (id: string) => {
        console.log('🔍 handleEditTruck called with ID:', id);
        console.log('🔍 Current editingId:', editingId);
        console.log('🔍 Current showSidebar:', showSidebar);

        // If clicking the same truck and sidebar is already open, just return (don't reload)
        if (editingId === id && showSidebar) {
            console.log('⚠️ Already editing this truck with sidebar open, skipping...');
            return;
        }

        // Always set the new editingId - this will trigger the useEffect to load the truck
        // If sidebar is closed, it will be opened by the useEffect
        // If sidebar is open for a different truck, it will reload with the new truck
        console.log('✅ Setting editingId to:', id);
        setEditingId(id);
    };

    const handleSort = (key: keyof Truck) => {
        setSortConfig(current => ({
            key,
            direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
        }));
    };

    const getSortIcon = (key: keyof Truck) => {
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

    const getStatusBadgeColor = (status: string, type: 'operating' | 'dispatch' | 'compliance') => {
        if (type === 'operating') {
            if (status === 'IN SERVICE') return 'bg-green-500 text-white';
            if (status === 'OUT OF SERVICE') return 'bg-red-500 text-white';
            if (status === 'MAINTENANCE') return 'bg-yellow-500 text-white';
        }
        if (type === 'dispatch') {
            if (status === 'LOADED') return 'bg-green-500 text-white';
            if (status === 'DELIVERED') return 'bg-green-500 text-white';
            if (status === 'UNASSIGNED') return 'bg-gray-500 text-white';
            if (status === 'IN TRANSIT') return 'bg-gray-500 text-white';
            if (status === 'ASSIGNED') return 'bg-orange-500 text-white';
        }
        if (type === 'compliance') {
            if (status === 'COMPLIANT') return 'bg-green-500 text-white';
            if (status === 'NON-COMPLIANT') return 'bg-red-500 text-white';
            if (status === 'EXPIRING SOON') return 'bg-orange-500 text-white';
        }
        return 'bg-gray-500 text-white';
    };

    const formatStatusText = (status: string, type: 'operating' | 'compliance') => {
        if (type === 'operating' && status === 'IN SERVICE') {
            return (
                <span className="block leading-tight">
                    <span className="block">IN</span>
                    <span className="block">SERVICE</span>
                </span>
            );
        }
        if (type === 'compliance' && status === 'EXPIRING SOON') {
            return (
                <span className="block leading-tight">
                    <span className="block">EXPIRING</span>
                    <span className="block">SOON</span>
                </span>
            );
        }
        return status;
    };

    // Navigation helper functions for sidebar steps
    const steps = [
        'Details',
        'Inspections',
        'Documents',
        'Invoice',
        'Notes',
        ...(formData.ownership === 'OWNER OPERATOR'
            ? ['Payroll', 'Deductions', 'Additions']
            : [])
    ];

    const getNextStep = () => {
        const currentIndex = steps.indexOf(activeStep);
        if (currentIndex < steps.length - 1) {
            return steps[currentIndex + 1];
        }
        return null;
    };

    const getPreviousStep = () => {
        const currentIndex = steps.indexOf(activeStep);
        if (currentIndex > 0) {
            return steps[currentIndex - 1];
        }
        return null;
    };

    const handleNext = () => {
        const next = getNextStep();
        if (next) {
            setActiveStep(next as typeof activeStep);
        }
    };

    const handlePrevious = () => {
        const previous = getPreviousStep();
        if (previous) {
            setActiveStep(previous as typeof activeStep);
        }
    };

    return (
        <div className="min-h-screen bg-main p-6">
            <div className="max-w-full mx-auto">
                {/* Header Section */}
                <div className="mb-6">
                    <div className="flex items-center justify-between mb-4">
                        <h1 className="text-3xl font-bold text-[var(--accent-navyblue)]">Trucks</h1>
                        <div className="flex items-center gap-3">
                            <span className="text-2xl font-bold text-[var(--accent-navyblue)]">({filteredTrucks.length})</span>
                            <button
                                onClick={handleExportTrucks}
                                title="Export to Excel"
                                className="w-10 h-10 bg-[var(--accent-teal)] !text-white rounded-lg flex items-center justify-center hover:bg-green-700 transition-colors shadow-md"
                            >
                                <FileDown className="w-5 h-5" />
                            </button>
                            <button
                                onClick={() => {
                                    setEditingId(null);
                                    setOriginalTruckData(null);
                                    setFormData({
                                        unitNumber: '',
                                        vinNumber: '',
                                        plateNumber: '',
                                        registrationCountry: '',
                                        registrationProvince: '',
                                        make: '',
                                        model: '',
                                        year: '',
                                        type: 'Truck',
                                        weight: '0',
                                        uom: 'Kg',
                                        assetValue: '0',
                                        status: 'In Service',
                                        odometer: '',
                                        trackingKey: '',
                                        trailer: '',
                                        ownership: 'COMPANY ASSET',
                                        operator: '',
                                        coOperator: '',
                                        fleet: '',
                                        yard: '',
                                        subType: ''
                                    });
                                    setSelectedImage(null);
                                    setSelectedImageFile(null);
                                    setDocuments([]);
                                    setOneTimeInspections([]);
                                    setRecurringInspections([]);
                                    setNotes([]);
                                    setInvoices([]);
                                    setInspectionForm({ expiryDate: '', description: '', ignoreExpiration: false, scheduledOn: '', after: '', unit: '', file: null });
                                    setEditingInspectionId(null);
                                    setEditingInspectionType(null);
                                    setDocumentForm({ title: '', expiryDate: '', description: '', file: null, ignoreExpiration: false });
                                    setEditingDocumentId(null);
                                    setInvoiceForm({ invoiceNumber: '', vendorWorkshop: '', amount: '', invoiceDate: '', file: null, notes: '' });
                                    setEditingInvoiceId(null);
                                    setNoteForm({ note: '', category: 'Category' });
                                    setEditingNoteId(null);
                                    setShowSidebar(true);
                                    setActiveStep('Details');
                                }}
                                className="w-10 h-10 bg-[var(--accent-navyblue)] !text-white rounded-lg flex items-center justify-center hover:bg-[var(--accent-navyblue)] transition-colors shadow-md"
                            >
                                <Plus className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Navigation Tabs */}
                <div className="mb-6 bg-card rounded-lg shadow-sm border border-theme overflow-hidden">
                    <div className="flex border-b border-theme overflow-x-auto">
                        {/* All Tab */}
                        <button
                            type="button"
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setActiveTab('All');
                            }}
                            className={`flex-shrink-0 px-6 py-4 text-center font-medium transition-colors relative ${activeTab === 'All'
                                ? 'text-[var(--accent-blue)] border-b-2 border-[var(--accent-blue)]'
                                : 'text-secondary hover:bg-[rgba(255,255,255,0.03)]'
                                }`}
                        >
                            <div>
                                <div className="font-semibold text-[var(--accent-navyblue)]">
                                    All ({getCountByCategory('All')})
                                </div>
                            </div>
                        </button>

                        {/* Yard Tabs - Use state only, no navigation */}
                        {yards.filter(yard => yard.status === 'active').map((yard) => (
                            <button
                                key={yard._id}
                                type="button"
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setActiveTab(yard._id!.toString());
                                }}
                                className={`flex-shrink-0 px-6 py-4 text-center font-medium transition-colors relative ${activeTab === yard._id?.toString()
                                    ? 'text-[var(--accent-blue)] border-b-2 border-[var(--accent-blue)]'
                                    : 'text-secondary hover:bg-[rgba(255,255,255,0.03)]'
                                    }`}
                            >
                                <div>
                                    <div className="font-semibold">
                                        {yard.yardName} ({getCountByCategory(yard._id!)})
                                    </div>
                                    <div className="text-xs text-secondary mt-1">Home to {yard.yardName}</div>
                                </div>
                            </button>
                        ))}

                        {/* External Tab */}
                        <button
                            type="button"
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setActiveTab('External');
                            }}
                            className={`flex-shrink-0 px-6 py-4 text-center font-medium transition-colors relative ${activeTab === 'External'
                                ? 'text-[var(--accent-blue)] border-b-2 border-[var(--accent-blue)]'
                                : 'text-secondary hover:bg-[rgba(255,255,255,0.03)]'
                                }`}
                        >
                            <div>
                                <div className="font-semibold text-[var(--accent-navyblue)]">
                                    External ({getCountByCategory('External')})
                                </div>
                            </div>
                        </button>

                        {/* Unassigned Tab */}
                        <button
                            type="button"
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setActiveTab('Unassigned');
                            }}
                            className={`flex-shrink-0 px-6 py-4 text-center font-medium transition-colors relative ${activeTab === 'Unassigned'
                                ? 'text-[var(--accent-blue)] border-b-2 border-[var(--accent-blue)]'
                                : 'text-secondary hover:bg-[rgba(255,255,255,0.03)]'
                                }`}
                        >
                            <div>
                                <div className="font-semibold text-[var(--accent-navyblue)]">
                                    Unassigned ({getCountByCategory('Unassigned')})
                                </div>
                            </div>
                        </button>
                    </div>
                </div>

                {/* Search and Filter Bar */}
                <div className="mb-6 bg-card rounded-lg shadow-sm border border-theme p-4">
                    <div className="flex flex-wrap items-center gap-4">
                        {/* Search Input */}
                        <div className="flex items-center gap-2 flex-1 min-w-[300px]">
                            <label className="text-sm font-medium text-[var(--accent-navyblue)] whitespace-nowrap">Unit #, Plate #, Make, VIN:</label>
                            <input
                                type="text"
                                placeholder="Search..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="flex-1 px-4 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)] focus:border-transparent bg-card"
                            />

                        </div>

                        {/* Global Filters */}
                        <div className="flex items-center gap-2">
                            <label className="text-sm font-medium text-[var(--accent-navyblue)]">Category:</label>
                            <select
                                value={category}
                                onChange={(e) => setCategory(e.target.value)}
                                className="px-3 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)] focus:border-transparent bg-card"
                            >
                                <option value="In Service Only">In Service Only</option>
                                <option value="All">All</option>
                            </select>
                        </div>

                        <div className="flex items-center gap-2">
                            <label className="text-sm font-medium text-[var(--accent-navyblue)]">Compliance Status:</label>
                            <select
                                value={complianceStatus}
                                onChange={(e) => setComplianceStatus(e.target.value)}
                                className="px-3 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)] focus:border-transparent bg-card"
                            >
                                <option value="All">All</option>
                                <option value="Compliant">Compliant</option>
                                <option value="Non-Compliant">Non-Compliant</option>
                                <option value="Expiring Soon">Expiring Soon</option>
                            </select>
                        </div>

                        <div className="flex items-center gap-2">
                            <label className="text-sm font-medium text-[var(--accent-navyblue)]">Sort By:</label>
                            <select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value)}
                                className="px-3 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)] focus:border-transparent bg-card"
                            >
                                <option value="">Select</option>
                                <option value="unitNumber">Unit #</option>
                                <option value="plateNumber">Plate #</option>
                                <option value="dispatchInfo">Dispatch Info</option>
                            </select>
                        </div>

                    </div>
                </div>

                {/* Data Table */}
                <div className="bg-card rounded-lg shadow-sm border border-theme overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-card border-b border-theme">
                                <tr>
                                    {/* Unit # */}
                                    <th className="px-4 py-3 text-left text-xs font-medium text-[var(--accent-navyblue)] uppercase">
                                        <div className="flex items-center gap-2">
                                            <span>Unit #</span>
                                            <button onClick={() => handleSort('unitNumber')} className="flex flex-col">
                                                {getSortIcon('unitNumber')}
                                            </button>
                                        </div>
                                        <input
                                            type="text"
                                            placeholder="Filter..."
                                            value={filters.unitNumber}
                                            onChange={(e) => setFilters({ ...filters, unitNumber: e.target.value })}
                                            className="mt-2 w-full px-2 py-1 text-xs border border-theme rounded focus:outline-none focus:ring-1 focus:ring-[var(--accent-blue)] bg-card"
                                        />
                                    </th>

                                    {/* Plate # */}
                                    <th className="px-4 py-3 text-left text-xs font-medium text-[var(--accent-navyblue)] uppercase">
                                        <div className="flex items-center gap-2">
                                            <span>Plate #</span>
                                            <button onClick={() => handleSort('plateNumber')} className="flex flex-col">
                                                {getSortIcon('plateNumber')}
                                            </button>
                                        </div>
                                        <input
                                            type="text"
                                            placeholder="Filter..."
                                            value={filters.plateNumber}
                                            onChange={(e) => setFilters({ ...filters, plateNumber: e.target.value })}
                                            className="mt-2 w-full px-2 py-1 text-xs border border-theme rounded focus:outline-none focus:ring-1 focus:ring-[var(--accent-blue)] bg-card"
                                        />
                                    </th>

                                    {/* Ownership */}
                                    <th className="px-4 py-3 text-left text-xs font-medium text-[var(--accent-navyblue)] uppercase">
                                        <div className="flex items-center gap-2">
                                            <span>Ownership</span>
                                            <button onClick={() => handleSort('ownership')} className="flex flex-col">
                                                {getSortIcon('ownership')}
                                            </button>
                                        </div>
                                        <select
                                            value={filters.ownership}
                                            onChange={(e) => setFilters({ ...filters, ownership: e.target.value })}
                                            className="mt-2 w-full px-2 py-1 text-xs border border-theme rounded focus:outline-none focus:ring-1 focus:ring-[var(--accent-blue)] bg-card"
                                        >
                                            <option value="All">All</option>
                                            <option value="COMPANY ASSET">Company Asset</option>
                                            <option value="OWNER OPERATOR">Owner Operator</option>
                                        </select>
                                    </th>

                                    {/* Operating Status */}
                                    <th className="px-4 py-3 text-left text-xs font-medium text-[var(--accent-navyblue)] uppercase">
                                        <div className="flex items-center gap-2">
                                            <span>Operating Status</span>
                                        </div>
                                        <select
                                            value={filters.operatingStatus}
                                            onChange={(e) => setFilters({ ...filters, operatingStatus: e.target.value })}
                                            className="mt-2 w-full px-2 py-1 text-xs border border-theme rounded focus:outline-none focus:ring-1 focus:ring-[var(--accent-blue)] bg-card"
                                        >
                                            <option value="All">All</option>
                                            <option value="IN SERVICE">In Service</option>
                                            <option value="OUT OF SERVICE">Out of Service</option>
                                            <option value="MAINTENANCE">Maintenance</option>
                                        </select>
                                    </th>

                                    {/* Dispatch Status */}
                                    <th className="px-4 py-3 text-left text-xs font-medium text-[var(--accent-navyblue)] uppercase">
                                        <div className="flex items-center gap-2">
                                            <span>Dispatch Status</span>
                                        </div>
                                        <select
                                            value={filters.dispatchStatus}
                                            onChange={(e) => setFilters({ ...filters, dispatchStatus: e.target.value })}
                                            className="mt-2 w-full px-2 py-1 text-xs border border-theme rounded focus:outline-none focus:ring-1 focus:ring-[var(--accent-blue)] bg-card"
                                        >
                                            <option value="All">All</option>
                                            <option value="LOADED">Loaded</option>
                                            <option value="DELIVERED">Delivered</option>
                                            <option value="UNASSIGNED">Unassigned</option>
                                            <option value="IN TRANSIT">In Transit</option>
                                            <option value="ASSIGNED">Assigned</option>
                                        </select>
                                    </th>

                                    {/* Dispatch Info */}
                                    <th className="px-4 py-3 text-left text-xs font-medium text-[var(--accent-navyblue)] uppercase">
                                        <div className="flex items-center gap-2">
                                            <span>Dispatch Info</span>
                                        </div>
                                        <input
                                            type="text"
                                            placeholder="Filter..."
                                            value={filters.dispatchInfo}
                                            onChange={(e) => setFilters({ ...filters, dispatchInfo: e.target.value })}
                                            className="mt-2 w-full px-2 py-1 text-xs border border-theme rounded focus:outline-none focus:ring-1 focus:ring-[var(--accent-blue)] bg-card"
                                        />
                                    </th>

                                    {/* Compliance */}
                                    <th className="px-4 py-3 text-left text-xs font-medium text-[var(--accent-navyblue)] uppercase">
                                        <div className="flex items-center gap-2">
                                            <span>Compliance</span>
                                        </div>
                                        <select
                                            value={filters.compliance}
                                            onChange={(e) => setFilters({ ...filters, compliance: e.target.value })}
                                            className="mt-2 w-full px-2 py-1 text-xs border border-theme rounded focus:outline-none focus:ring-1 focus:ring-[var(--accent-blue)] bg-card"
                                        >
                                            <option value="All">All</option>
                                            <option value="COMPLIANT">Compliant</option>
                                            <option value="NON-COMPLIANT">Non-Compliant</option>
                                            <option value="EXPIRING SOON">Expiring Soon</option>
                                        </select>
                                    </th>

                                    {/* Actions */}
                                    <th className="px-4 py-3 text-left text-xs font-medium text-[var(--accent-navyblue)] uppercase">
                                        <span>Actions</span>
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-card divide-y divide-theme divide-white/5">
                                {filteredTrucks.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} className="px-4 py-8 text-center text-secondary">
                                            No trucks found
                                        </td>
                                    </tr>
                                ) : (
                                    filteredTrucks.map((truck) => (
                                        <tr
                                            onClick={() => handleEditTruck((truck._id || truck.id) ?? '')}
                                            key={truck.id} className="hover:bg-[rgba(255,255,255,0.03)] transition-colors cursor-pointer">
                                            <td className="px-4 py-3 text-sm text-primary">{truck.unitNumber}</td>
                                            <td className="px-4 py-3 text-sm text-primary">{truck.plateNumber}</td>
                                            <td className="px-4 py-3 text-sm text-primary">{truck.ownership}</td>
                                            <td className="px-4 py-3">
                                                <span className={`inline-block px-2.5 py-1.5 text-xs font-semibold rounded text-center min-w-[60px] ${getStatusBadgeColor(truck.operatingStatus, 'operating')}`}>
                                                    {formatStatusText(truck.operatingStatus, 'operating')}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`px-3 py-1 text-xs font-semibold rounded-full flex items-center gap-1 ${getStatusBadgeColor(truck.dispatchStatus || 'UNASSIGNED', 'dispatch')}`}>
                                                    {truck.dispatchStatus === 'LOADED' && <Clock className="w-3 h-3" />}
                                                    {truck.dispatchStatus}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-primary">{truck.dispatchInfo || ''}</td>
                                            <td className="px-4 py-3">
                                                <span className={`inline-block px-2.5 py-1.5 text-xs font-semibold rounded text-center min-w-[70px] ${getStatusBadgeColor(truck.compliance, 'compliance')}`}>
                                                    {formatStatusText(truck.compliance, 'compliance')}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleEditTruck((truck._id || truck.id) ?? '');
                                                        }}
                                                        className="p-1.5 text-[#00D1FF] hover:bg-[var(--accent-navyblue)] rounded transition-colors"
                                                        title="Edit"
                                                    >
                                                        <Edit className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleDeleteClick((truck._id || truck.id) ?? '');
                                                        }}
                                                        className="p-1.5 text-[#A855F7] hover:bg-[var(--accent-red)] rounded transition-colors"
                                                        title="Delete"
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
            </div>

            {/* New Truck Sidebar Modal */}
            {showSidebar && (
                <>
                    <div
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] transition-all duration-300"
                        onClick={() => {
                            setShowSidebar(false);
                            // Reset editingId after a short delay to allow sidebar to close
                            setTimeout(() => {
                                setEditingId(null);
                            }, 300);
                        }}
                    />
                    <div className="fixed top-0 right-0 h-full w-full sm:w-[75vw] lg:w-[70vw] xl:w-[65vw] bg-card shadow-2xl z-[101] flex overflow-hidden">
                        {/* Left Sidebar - Image Upload & Navigation */}
                        <div className="w-48 bg-card border-r border-theme flex flex-col">
                            {/* Image Upload Section */}
                            <div className="p-3 border-b border-theme bg-card">
                                <div className="border-2 border-dashed border-theme rounded-lg p-4 flex flex-col items-center justify-center cursor-pointer hover:border-gray-400 transition-colors bg-card"
                                    onClick={() => {
                                        const input = document.createElement('input');
                                        input.type = 'file';
                                        input.accept = 'image/*';
                                        input.onchange = (e: any) => {
                                            const file = e.target.files[0];
                                            if (file) {
                                                setSelectedImageFile(file); // Store the file for upload
                                                const reader = new FileReader();
                                                reader.onload = (event) => {
                                                    setSelectedImage(event.target?.result as string);
                                                };
                                                reader.readAsDataURL(file);
                                            }
                                        };
                                        input.click();
                                    }}
                                >
                                    {selectedImage ? (
                                        <img src={selectedImage} alt="Truck" className="w-full h-20 object-cover rounded" />
                                    ) : (
                                        <>
                                            <ImageIcon className="w-8 h-8 text-secondary mb-1" />
                                            <span className="text-xs text-secondary">Select Image</span>
                                        </>
                                    )}
                                </div>
                                <button className="w-full !mt-2 px-3 py-1.5 bg-gray-700 !text-white rounded-lg hover:bg-gray-800 transition-colors text-xs font-medium">
                                    UPLOAD
                                </button>
                            </div>

                            {/* Navigation Tabs */}
                            <div className="flex-1 overflow-y-auto p-2">
                                <nav className="flex flex-col gap-1.5">
                                    {(['Details', 'Inspections', 'Documents', 'Invoice', 'Notes'] as const).map((step) => (
                                        <button
                                            key={step}
                                            onClick={() => setActiveStep(step)}
                                            className={`w-full px-3 py-2 text-left text-xs font-medium rounded-lg transition-colors ${activeStep === step
                                                ? 'bg-[var(--accent-navyblue)] !text-white shadow-sm'
                                                : 'bg-card text-primary hover:bg-[rgba(255,255,255,0.03)] border border-theme'
                                                }`}
                                        >
                                            {step}
                                        </button>
                                    ))}
                                    {/* Conditional tabs - only show when Owner Operator is selected */}
                                    {formData.ownership === 'OWNER OPERATOR' && (
                                        <>
                                            {(['Payroll', 'Deductions', 'Additions'] as const).map((step) => (
                                                <button
                                                    key={step}
                                                    onClick={() => setActiveStep(step)}
                                                    className={`w-full px-3 py-2 text-left text-xs font-medium rounded-lg transition-colors ${activeStep === step
                                                        ? 'bg-[var(--accent-navyblue)] !text-white shadow-sm'
                                                        : 'bg-card text-primary hover:bg-[rgba(255,255,255,0.03)] border border-theme'
                                                        }`}
                                                >
                                                    {step}
                                                </button>
                                            ))}
                                        </>
                                    )}
                                </nav>
                            </div>
                        </div>

                        {/* Main Content Area */}
                        <div className="flex-1 flex flex-col overflow-hidden">
                            {/* Header */}
                            <div className="flex items-center justify-between p-4 border-b border-theme bg-card">
                                <h2 className="text-xl font-bold text-[var(--accent-navyblue)]">{editingId ? 'Edit Truck' : 'New Truck'}</h2>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={handleSaveTruck}
                                        disabled={loading}
                                        className="px-4 py-1.5 bg-gray-700 !text-white rounded-lg hover:bg-gray-800 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {loading ? 'SAVING...' : 'SAVE'}
                                    </button>
                                    <button
                                        onClick={() => {
                                            setShowSidebar(false);
                                            // Reset editingId after a short delay to allow sidebar to close
                                            setTimeout(() => {
                                                setEditingId(null);
                                            }, 300);
                                        }}
                                        className="p-1.5 text-secondary hover:text-secondary transition-colors"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>

                            {/* Content Area - scrollable; footer stays at bottom */}
                            <div className="flex-1 min-h-0 overflow-y-auto p-4 bg-card">
                                {/* Details Step */}
                                {activeStep === 'Details' && (
                                    <div className="space-y-4">
                                        <h3 className="text-base font-semibold text-[var(--accent-navyblue)]">Basic Information</h3>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="block text-sm font-medium text-[var(--accent-navyblue)] mb-1">
                                                    Unit #<span className="text-red-500">*</span>
                                                </label>
                                                <input
                                                    type="text"
                                                    placeholder="Unit #"
                                                    value={formData.unitNumber}
                                                    onChange={(e) => setFormData({ ...formData, unitNumber: e.target.value })}
                                                    className="w-full px-3 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)]"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-[var(--accent-navyblue)] mb-1">
                                                    VIN<span className="text-red-500">*</span>
                                                </label>
                                                <input
                                                    type="text"
                                                    placeholder="VIN"
                                                    value={formData.vinNumber}
                                                    onChange={(e) => setFormData({ ...formData, vinNumber: e.target.value })}
                                                    className="w-full px-3 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)]"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-[var(--accent-navyblue)] mb-1">
                                                    Plate #<span className="text-red-500">*</span>
                                                </label>
                                                <input
                                                    type="text"
                                                    placeholder="Plate #"
                                                    value={formData.plateNumber}
                                                    onChange={(e) => setFormData({ ...formData, plateNumber: e.target.value })}
                                                    className="w-full px-3 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)]"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-[var(--accent-navyblue)] mb-1">
                                                    Registration Country<span className="text-red-500">*</span>
                                                </label>
                                                <select
                                                    value={formData.registrationCountry}
                                                    onChange={(e) => setFormData({ ...formData, registrationCountry: e.target.value, registrationProvince: '' })}
                                                    className="w-full px-3 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)]"
                                                >
                                                    <option className="form-option" value="">Select Registration Country</option>
                                                    {countries.map((country) => (
                                                        <option className="form-option" key={country.code} value={country.name}>
                                                            {country.flag} {country.name}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-[var(--accent-navyblue)] mb-1">
                                                    Registration Province/State
                                                </label>
                                                <input
                                                    type="text"
                                                    value={formData.registrationProvince}
                                                    onChange={(e) => setFormData({ ...formData, registrationProvince: e.target.value })}
                                                    disabled={!formData.registrationCountry}
                                                    placeholder={formData.registrationCountry ? "Enter Province/State" : "Select country first"}
                                                    className="w-full px-3 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)] focus:border-transparent disabled:bg-card disabled:cursor-not-allowed"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-[var(--accent-navyblue)] mb-1">
                                                    Make<span className="text-red-500">*</span>
                                                </label>
                                                <input
                                                    type="text"
                                                    placeholder="Make"
                                                    value={formData.make}
                                                    onChange={(e) => setFormData({ ...formData, make: e.target.value })}
                                                    className="w-full px-3 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)]"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-[var(--accent-navyblue)] mb-1">
                                                    Model<span className="text-red-500">*</span>
                                                </label>
                                                <input
                                                    type="text"
                                                    placeholder="Model"
                                                    value={formData.model}
                                                    onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                                                    className="w-full px-3 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)]"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-[var(--accent-navyblue)] mb-1">
                                                    Year<span className="text-red-500">*</span>
                                                </label>
                                                <input
                                                    type="text"
                                                    placeholder="Year"
                                                    value={formData.year}
                                                    onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                                                    className="w-full px-3 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)]"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-[var(--accent-navyblue)] mb-1">
                                                    Type<span className="text-red-500">*</span>
                                                </label>
                                                <input
                                                    type="text"
                                                    value={formData.type}
                                                    readOnly
                                                    className="w-full px-3 py-2 border border-theme rounded-lg bg-card"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-[var(--accent-navyblue)] mb-1">
                                                    Weight<span className="text-red-500">*</span>
                                                </label>
                                                <input
                                                    type="text"
                                                    value={formData.weight}
                                                    onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                                                    className="w-full px-3 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)]"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-[var(--accent-navyblue)] mb-1">
                                                    UoM
                                                </label>
                                                <select
                                                    value={formData.uom}
                                                    onChange={(e) => setFormData({ ...formData, uom: e.target.value })}
                                                    className="w-full px-3 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)]"
                                                >
                                                    <option className="form-option" value="Kg">Kg</option>
                                                    <option className="form-option" value="Lbs">Lbs</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-[var(--accent-navyblue)] mb-1">
                                                    Asset Value
                                                </label>
                                                <input
                                                    type="text"
                                                    value={formData.assetValue}
                                                    onChange={(e) => setFormData({ ...formData, assetValue: e.target.value })}
                                                    className="w-full px-3 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)]"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-[var(--accent-navyblue)] mb-1">
                                                    Status<span className="text-red-500">*</span>
                                                </label>
                                                <select
                                                    value={formData.status}
                                                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                                    className="w-full px-3 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)]"
                                                >
                                                    <option className="form-option" value="In Service">In Service</option>
                                                    <option className="form-option" value="Out of Service">Out of Service</option>
                                                    <option className="form-option" value="Maintenance">Maintenance</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-[var(--accent-navyblue)] mb-1">
                                                    Odometer
                                                </label>
                                                <input
                                                    type="text"
                                                    placeholder="Odometer"
                                                    value={formData.odometer}
                                                    onChange={(e) => setFormData({ ...formData, odometer: e.target.value })}
                                                    className="w-full px-3 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)]"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-primary mb-1">
                                                    Tracking Key
                                                </label>
                                                <input
                                                    type="text"
                                                    placeholder="Tracking Key"
                                                    value={formData.trackingKey}
                                                    onChange={(e) => setFormData({ ...formData, trackingKey: e.target.value })}
                                                    className="w-full px-3 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)]"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-primary mb-1">
                                                    Trailer
                                                </label>
                                                <select
                                                    value={formData.trailer}
                                                    onChange={(e) => setFormData({ ...formData, trailer: e.target.value })}
                                                    className="w-full px-3 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)]"
                                                >
                                                    <option value="">Select Trailer</option>
                                                    {trailers.map((trailer) => (
                                                        <option className="form-option" key={trailer._id} value={trailer._id}>
                                                            {trailer.unitNumber || trailer.trailer || `Trailer ${trailer._id}`}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>

                                        <h3 className="text-base font-semibold text-primary mt-6">Ownership Information</h3>
                                        <div className="space-y-3">
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => {
                                                        setFormData({ ...formData, ownership: "COMPANY ASSET" });

                                                        if (["Payroll", "Deductions", "Additions"].includes(activeStep)) {
                                                            setActiveStep("Details");
                                                        }
                                                    }}
                                                    className={`px-6 py-2 rounded-sm font-medium transition-colors duration-200
    ${formData.ownership === "COMPANY ASSET"
                                                            ? "bg-[var(--accent-navyblue)] text-white"
                                                            : "bg-gray-700 text-white hover:bg-[var(--accent-navyblue)]"
                                                        }`}
                                                >
                                                    COMPANY ASSET
                                                </button>

                                                <button
                                                    onClick={() =>
                                                        setFormData({ ...formData, ownership: "OWNER OPERATOR" })
                                                    }
                                                    className={`px-6 py-2 rounded-sm font-medium transition-colors duration-200
    ${formData.ownership === "OWNER OPERATOR"
                                                            ? "bg-[var(--accent-navyblue)] text-white"
                                                            : "bg-gray-700 text-white hover:bg-[var(--accent-navyblue)]"
                                                        }`}
                                                >
                                                    OWNER OPERATOR
                                                </button>
                                            </div>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div>
                                                    <label className="block text-sm font-medium text-primary mb-1">
                                                        Operator
                                                    </label>
                                                    <select
                                                        value={formData.operator}
                                                        onChange={(e) => setFormData({ ...formData, operator: e.target.value })}
                                                        className="w-full px-3 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)]"
                                                    >
                                                        <option className="form-option" value="">Select Operator</option>
                                                        {operators.length > 0 ? operators.map((operator) => (
                                                            <option className="form-option" key={operator._id} value={operator._id}>
                                                                {operator.name} {operator.email ? `(${operator.email})` : ''}
                                                            </option>
                                                        )) : (
                                                            <option className="form-option" value="" disabled>No operators available</option>
                                                        )}
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-primary mb-1">
                                                        Co-Operator
                                                    </label>
                                                    <select
                                                        value={formData.coOperator}
                                                        onChange={(e) => setFormData({ ...formData, coOperator: e.target.value })}
                                                        className="w-full px-3 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)]"
                                                    >
                                                        <option className="form-option" value="">Select Co-Operator</option>
                                                        {operators.length > 0 ? operators.map((operator) => (
                                                            <option className="form-option" key={operator._id} value={operator._id}>
                                                                {operator.name} {operator.email ? `(${operator.email})` : ''}
                                                            </option>
                                                        )) : (
                                                            <option className="form-option" value="" disabled>No operators available</option>
                                                        )}
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-primary mb-1">
                                                        Yard
                                                    </label>
                                                    <select
                                                        value={formData.yard}
                                                        onChange={(e) => setFormData({ ...formData, yard: e.target.value })}
                                                        className="w-full px-3 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)]"
                                                    >
                                                        <option className="form-option" value="">Select</option>
                                                        {yards.filter(yard => yard.status === 'active').map((yard) => (
                                                            <option className="form-option" key={yard._id} value={yard._id}>
                                                                {yard.yardName} ({yard.yardCode})
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Inspections Step */}
                                {activeStep === 'Inspections' && (
                                    <div className="space-y-4">
                                        <h3 className="text-base font-semibold text-primary">Truck Inspections</h3>

                                        {/* Inspection Type Tabs */}
                                        <div className="flex gap-2">
                                            <button
                                                type="button"
                                                onClick={() => setInspectionType('One Time')}
                                                className={`px-6 py-2 rounded-lg font-medium transition-colors border-2 ${inspectionType === 'One Time'
                                                    ? 'bg-card border-gray-700 text-primary'
                                                    : 'bg-card border-theme text-primary hover:border-gray-400'
                                                    }`}
                                            >
                                                One Time
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setInspectionType('Recurring')}
                                                className={`px-6 py-2 rounded-lg font-medium transition-colors border-2 ${inspectionType === 'Recurring'
                                                    ? 'bg-card border-gray-700 text-primary'
                                                    : 'bg-card border-theme text-primary hover:border-gray-400'
                                                    }`}
                                            >
                                                Recurring
                                            </button>
                                        </div>

                                        {/* One Time Inspections */}
                                        {inspectionType === 'One Time' && (
                                            <div className="space-y-4">
                                                <div className="flex gap-2 items-end bg-card p-4 rounded-lg">
                                                    <div className="flex-1">
                                                        <label className="block text-sm font-medium text-primary mb-1">Expiry Date</label>
                                                        <div className="relative">
                                                            <Calendar className="absolute left-2 top-2.5 w-4 h-4 text-secondary" />
                                                            <input
                                                                type="date"
                                                                value={inspectionForm.expiryDate}
                                                                onChange={(e) => setInspectionForm({ ...inspectionForm, expiryDate: e.target.value })}
                                                                className="w-full pl-8 pr-3 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)]"
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className="flex-1">
                                                        <label className="block text-sm font-medium text-primary mb-1">Description</label>
                                                        <input
                                                            type="text"
                                                            placeholder="Description"
                                                            value={inspectionForm.description}
                                                            onChange={(e) => setInspectionForm({ ...inspectionForm, description: e.target.value })}
                                                            className="w-full px-3 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)]"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-sm font-medium text-primary mb-1">File</label>
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                const input = document.createElement('input');
                                                                input.type = 'file';
                                                                input.onchange = (e: any) => {
                                                                    setInspectionForm({ ...inspectionForm, file: e.target.files[0] });
                                                                };
                                                                input.click();
                                                            }}
                                                            className="px-4 py-2 border border-theme rounded-lg hover:bg-[rgba(255,255,255,0.03)] text-sm font-medium bg-card"
                                                        >
                                                            {inspectionForm.file ? (
                                                                <span className="flex items-center gap-1">
                                                                    <FileText className="w-4 h-4" />
                                                                    {inspectionForm.file.name.length > 15
                                                                        ? inspectionForm.file.name.substring(0, 15) + '...'
                                                                        : inspectionForm.file.name}
                                                                </span>
                                                            ) : (
                                                                <span className="flex items-center gap-1">
                                                                    Select File <Upload className="w-4 h-4" />
                                                                </span>
                                                            )}
                                                        </button>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <input
                                                            type="checkbox"
                                                            checked={inspectionForm.ignoreExpiration}
                                                            onChange={(e) => setInspectionForm({ ...inspectionForm, ignoreExpiration: e.target.checked })}
                                                            className="w-4 h-4"
                                                        />
                                                        <label className="text-sm text-primary">Ignore Expiration</label>
                                                    </div>
                                                    <button
                                                        onClick={handleSaveInspection}
                                                        className="w-10 h-10 bg-gray-700 !text-white rounded-lg flex items-center justify-center hover:bg-gray-800"
                                                        title={editingInspectionId ? "Update Inspection" : "Add Inspection"}
                                                    >
                                                        {editingInspectionId ? <Check className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                                                    </button>
                                                    {editingInspectionId && (
                                                        <button
                                                            onClick={() => {
                                                                setInspectionForm({ expiryDate: '', description: '', ignoreExpiration: false, scheduledOn: '', after: '', unit: '', file: null });
                                                                setEditingInspectionId(null);
                                                                setEditingInspectionType(null);
                                                            }}
                                                            className="w-10 h-10 bg-gray-400 !text-white rounded-lg flex items-center justify-center hover:bg-gray-500"
                                                            title="Cancel Edit"
                                                        >
                                                            <X className="w-5 h-5" />
                                                        </button>
                                                    )}
                                                </div>
                                                <p className="text-sm text-secondary">Click row to edit • Drag to reorder</p>
                                                <div className="bg-card rounded-lg border border-theme overflow-x-auto">
                                                    <table className="w-full min-w-[800px]">
                                                        <thead className="bg-card">
                                                            <tr>
                                                                <th className="px-4 py-2 text-left text-xs font-medium text-primary">Expiry Date</th>
                                                                <th className="px-4 py-2 text-left text-xs font-medium text-primary">Description</th>
                                                                <th className="px-4 py-2 text-left text-xs font-medium text-primary">File</th>
                                                                <th className="px-4 py-2 text-left text-xs font-medium text-primary">Ignore Expiration</th>
                                                                <th className="px-4 py-2 text-left text-xs font-medium text-primary">Actions</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {oneTimeInspections.length === 0 ? (
                                                                <tr>
                                                                    <td colSpan={5} className="px-4 py-8 text-center text-secondary">No Data</td>
                                                                </tr>
                                                            ) : (
                                                                oneTimeInspections.map((inspection) => (
                                                                    <tr
                                                                        key={inspection.id}
                                                                        className={`border-t border-theme hover:bg-[rgba(255,255,255,0.03)] cursor-pointer ${editingInspectionId === inspection.id ? 'bg-card' : ''}`}
                                                                        onClick={() => handleEditInspection(inspection, 'oneTime')}
                                                                    >
                                                                        <td className="px-4 py-2 text-sm text-primary">{inspection.expiryDate}</td>
                                                                        <td className="px-4 py-2 text-sm text-primary">{inspection.description}</td>
                                                                        <td className="px-4 py-2 text-sm text-primary">
                                                                            {inspection.fileName || inspection.fileUrl ? (
                                                                                inspection.fileUrl ? (
                                                                                    <a
                                                                                        href={inspection.fileUrl}
                                                                                        target="_blank"
                                                                                        rel="noopener noreferrer"
                                                                                        className="flex items-center gap-2 text-[#00D1FF] hover:text-blue-800 hover:underline"
                                                                                        onClick={(e) => e.stopPropagation()}
                                                                                    >
                                                                                        <FileText className="w-4 h-4" />
                                                                                        <span>{inspection.fileName || 'View File'}</span>
                                                                                    </a>
                                                                                ) : (
                                                                                    <div className="flex items-center gap-2 text-[#00D1FF]">
                                                                                        <FileText className="w-4 h-4" />
                                                                                        <span>{inspection.fileName || 'File attached'}</span>
                                                                                    </div>
                                                                                )
                                                                            ) : (
                                                                                <span className="text-secondary">No file</span>
                                                                            )}
                                                                        </td>
                                                                        <td className="px-4 py-2 text-sm text-primary">{inspection.ignoreExpiration ? 'Yes' : 'No'}</td>
                                                                        <td className="px-4 py-2 text-sm text-primary">
                                                                            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                                                                <button
                                                                                    onClick={() => handleEditInspection(inspection, 'oneTime')}
                                                                                    className="p-1 text-[#00D1FF] hover:bg-blue-50 rounded"
                                                                                    title="Edit"
                                                                                >
                                                                                    <Edit className="w-4 h-4" />
                                                                                </button>
                                                                                <button
                                                                                    onClick={() => handleDeleteInspection(inspection.id, 'oneTime')}
                                                                                    className="p-1 text-[#A855F7] hover:bg-red-50 rounded"
                                                                                    title="Delete"
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

                                        {/* Recurring Inspections */}
                                        {inspectionType === 'Recurring' && (
                                            <div className="space-y-4">
                                                <div className="bg-card p-4 rounded-lg space-y-4">
                                                    {/* Row 1: Scheduled On, After, Unit */}
                                                    <div className="grid grid-cols-3 gap-4">
                                                        <div>
                                                            <label className="block text-sm font-medium text-primary mb-1">Scheduled On</label>
                                                            <div className="relative">
                                                                <Calendar className="absolute left-2 top-2.5 w-4 h-4 text-secondary" />
                                                                <input
                                                                    type="date"
                                                                    value={inspectionForm.scheduledOn}
                                                                    onChange={(e) => setInspectionForm({ ...inspectionForm, scheduledOn: e.target.value })}
                                                                    className="w-full pl-8 pr-3 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)]"
                                                                />
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <label className="block text-sm font-medium text-primary mb-1">After</label>
                                                            <input
                                                                type="text"
                                                                placeholder="After"
                                                                value={inspectionForm.after}
                                                                onChange={(e) => setInspectionForm({ ...inspectionForm, after: e.target.value })}
                                                                className="w-full px-3 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)]"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="block text-sm font-medium text-primary mb-1">Unit</label>
                                                            <select
                                                                value={inspectionForm.unit}
                                                                onChange={(e) => setInspectionForm({ ...inspectionForm, unit: e.target.value })}
                                                                className="w-full px-3 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)]"
                                                            >
                                                                <option className="form-option" value="">Select Unit</option>
                                                                <option className="form-option" value="Days">Days</option>
                                                                <option className="form-option" value="Weeks">Weeks</option>
                                                                <option className="form-option" value="Months">Months</option>
                                                            </select>
                                                        </div>
                                                    </div>

                                                    {/* Row 2: Description and File */}
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div>
                                                            <label className="block text-sm font-medium text-primary mb-1">Description</label>
                                                            <input
                                                                type="text"
                                                                placeholder="Description"
                                                                value={inspectionForm.description}
                                                                onChange={(e) => setInspectionForm({ ...inspectionForm, description: e.target.value })}
                                                                className="w-full px-3 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)]"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="block text-sm font-medium text-primary mb-1">File</label>
                                                            {inspectionForm.file ? (
                                                                <div className="flex items-center gap-2 px-3 py-2 border border-theme rounded-lg bg-card">
                                                                    <FileText className="w-4 h-4 text-secondary flex-shrink-0" />
                                                                    <span className="text-sm text-primary truncate flex-1">
                                                                        {inspectionForm.file.name.length > 20
                                                                            ? inspectionForm.file.name.substring(0, 20) + '...'
                                                                            : inspectionForm.file.name}
                                                                    </span>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => setInspectionForm({ ...inspectionForm, file: null })}
                                                                        className="text-secondary hover:text-[#A855F7] transition-colors flex-shrink-0"
                                                                        title="Remove file"
                                                                    >
                                                                        <X className="w-4 h-4" />
                                                                    </button>
                                                                </div>
                                                            ) : (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        const input = document.createElement('input');
                                                                        input.type = 'file';
                                                                        input.onchange = (e: any) => {
                                                                            setInspectionForm({ ...inspectionForm, file: e.target.files[0] });
                                                                        };
                                                                        input.click();
                                                                    }}
                                                                    className="w-full px-4 py-2 border border-theme rounded-lg hover:bg-[rgba(255,255,255,0.03)] text-sm font-medium bg-card flex items-center justify-center gap-2"
                                                                >
                                                                    <Upload className="w-4 h-4" />
                                                                    <span>Select File</span>
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Row 3: Checkbox and Action Buttons */}
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-2">
                                                            <input
                                                                type="checkbox"
                                                                checked={inspectionForm.ignoreExpiration}
                                                                onChange={(e) => setInspectionForm({ ...inspectionForm, ignoreExpiration: e.target.checked })}
                                                                className="w-4 h-4"
                                                            />
                                                            <label className="text-sm text-primary">Ignore Expiration</label>
                                                        </div>
                                                        <div className="flex gap-2">
                                                            <button
                                                                onClick={handleSaveInspection}
                                                                className="px-4 py-2 bg-gray-700 !text-white rounded-lg flex items-center gap-2 hover:bg-gray-800"
                                                                title={editingInspectionId ? "Update Inspection" : "Add Inspection"}
                                                            >
                                                                {editingInspectionId ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                                                                <span>{editingInspectionId ? 'Save' : 'Add'}</span>
                                                            </button>
                                                            {editingInspectionId && (
                                                                <button
                                                                    onClick={() => {
                                                                        setInspectionForm({ expiryDate: '', description: '', ignoreExpiration: false, scheduledOn: '', after: '', unit: '', file: null });
                                                                        setEditingInspectionId(null);
                                                                        setEditingInspectionType(null);
                                                                    }}
                                                                    className="px-4 py-2 bg-gray-400 !text-white rounded-lg flex items-center gap-2 hover:bg-gray-500"
                                                                    title="Cancel Edit"
                                                                >
                                                                    <X className="w-4 h-4" />
                                                                    <span>Cancel</span>
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                                <p className="text-sm text-secondary">Click row to edit • Drag to reorder</p>
                                                <div className="bg-card rounded-lg border border-theme overflow-x-auto">
                                                    <table className="w-full min-w-[900px]">
                                                        <thead className="bg-card">
                                                            <tr>
                                                                <th className="px-4 py-2 text-left text-xs font-medium text-primary">Scheduled On</th>
                                                                <th className="px-4 py-2 text-left text-xs font-medium text-primary">After</th>
                                                                <th className="px-4 py-2 text-left text-xs font-medium text-primary">Unit</th>
                                                                <th className="px-4 py-2 text-left text-xs font-medium text-primary">Description</th>
                                                                <th className="px-4 py-2 text-left text-xs font-medium text-primary">File</th>
                                                                <th className="px-4 py-2 text-left text-xs font-medium text-primary">Ignore Expiration</th>
                                                                <th className="px-4 py-2 text-left text-xs font-medium text-primary">Actions</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {recurringInspections.length === 0 ? (
                                                                <tr>
                                                                    <td colSpan={7} className="px-4 py-8 text-center text-secondary">No Data</td>
                                                                </tr>
                                                            ) : (
                                                                recurringInspections.map((inspection) => (
                                                                    <tr
                                                                        key={inspection.id}
                                                                        className={`border-t border-theme hover:bg-[rgba(255,255,255,0.03)] cursor-pointer ${editingInspectionId === inspection.id ? 'bg-card' : ''}`}
                                                                        onClick={() => handleEditInspection(inspection, 'recurring')}
                                                                    >
                                                                        <td className="px-4 py-2 text-sm text-primary">{inspection.scheduledOn}</td>
                                                                        <td className="px-4 py-2 text-sm text-primary">{inspection.after}</td>
                                                                        <td className="px-4 py-2 text-sm text-primary">{inspection.unit}</td>
                                                                        <td className="px-4 py-2 text-sm text-primary">{inspection.description}</td>
                                                                        <td className="px-4 py-2 text-sm text-primary">
                                                                            {inspection.fileName || inspection.fileUrl ? (
                                                                                inspection.fileUrl ? (
                                                                                    <a
                                                                                        href={inspection.fileUrl}
                                                                                        target="_blank"
                                                                                        rel="noopener noreferrer"
                                                                                        className="flex items-center gap-2 text-[#00D1FF] hover:text-blue-800 hover:underline"
                                                                                        onClick={(e) => e.stopPropagation()}
                                                                                    >
                                                                                        <FileText className="w-4 h-4" />
                                                                                        <span>{inspection.fileName || 'View File'}</span>
                                                                                    </a>
                                                                                ) : (
                                                                                    <div className="flex items-center gap-2 text-[#00D1FF]">
                                                                                        <FileText className="w-4 h-4" />
                                                                                        <span>{inspection.fileName || 'File attached'}</span>
                                                                                    </div>
                                                                                )
                                                                            ) : (
                                                                                <span className="text-secondary">No file</span>
                                                                            )}
                                                                        </td>
                                                                        <td className="px-4 py-2 text-sm text-primary">{inspection.ignoreExpiration ? 'Yes' : 'No'}</td>
                                                                        <td className="px-4 py-2 text-sm text-primary">
                                                                            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                                                                <button
                                                                                    onClick={() => handleEditInspection(inspection, 'recurring')}
                                                                                    className="p-1 text-[#00D1FF] hover:bg-blue-50 rounded"
                                                                                    title="Edit"
                                                                                >
                                                                                    <Edit className="w-4 h-4" />
                                                                                </button>
                                                                                <button
                                                                                    onClick={() => handleDeleteInspection(inspection.id, 'recurring')}
                                                                                    className="p-1 text-[#A855F7] hover:bg-red-50 rounded"
                                                                                    title="Delete"
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
                                )}

                                {/* Documents Step (no tabs; single list with Title) */}
                                {activeStep === 'Documents' && (
                                    <div className="space-y-4">
                                        <h3 className="text-base font-semibold text-primary">Documents</h3>

                                        {/* Document Form */}
                                        <div className="bg-card p-4 rounded-lg space-y-4">
                                            {/* Row 1: Title, Expiry Date, Description */}
                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                                <div>
                                                    <label className="block text-sm font-medium text-primary mb-1">Title</label>
                                                    <input
                                                        type="text"
                                                        placeholder="Title"
                                                        value={documentForm.title}
                                                        onChange={(e) => setDocumentForm({ ...documentForm, title: e.target.value })}
                                                        className="w-full px-3 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)]"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-primary mb-1">Expiry Date</label>
                                                    <div className="relative">
                                                        <Calendar className="absolute left-2 top-2.5 w-4 h-4 text-secondary" />
                                                        <input
                                                            type="date"
                                                            value={documentForm.expiryDate}
                                                            onChange={(e) => setDocumentForm({ ...documentForm, expiryDate: e.target.value })}
                                                            className="w-full pl-8 pr-3 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)]"
                                                        />
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-primary mb-1">Description</label>
                                                    <input
                                                        type="text"
                                                        placeholder="Description"
                                                        value={documentForm.description}
                                                        onChange={(e) => setDocumentForm({ ...documentForm, description: e.target.value })}
                                                        className="w-full px-3 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)]"
                                                    />
                                                </div>
                                            </div>

                                            {/* Row 2: File Upload */}
                                            <div>
                                                <label className="block text-sm font-medium text-primary mb-1">File</label>
                                                {documentForm.file ? (
                                                    <div className="flex items-center gap-2 px-3 py-2 border border-theme rounded-lg bg-card">
                                                        <FileText className="w-4 h-4 text-secondary flex-shrink-0" />
                                                        <span className="text-sm text-primary truncate flex-1">
                                                            {documentForm.file.name}
                                                        </span>
                                                        <button
                                                            type="button"
                                                            onClick={() => setDocumentForm({ ...documentForm, file: null })}
                                                            className="text-secondary hover:text-[#A855F7] transition-colors flex-shrink-0"
                                                            title="Remove file"
                                                        >
                                                            <X className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            const input = document.createElement('input');
                                                            input.type = 'file';
                                                            input.onchange = (e: any) => {
                                                                setDocumentForm({ ...documentForm, file: e.target.files[0] });
                                                            };
                                                            input.click();
                                                        }}
                                                        className="w-full px-4 py-2 border border-theme rounded-lg hover:bg-[rgba(255,255,255,0.03)] text-sm font-medium bg-card flex items-center justify-center gap-2"
                                                    >
                                                        <Upload className="w-4 h-4" />
                                                        <span>Select File</span>
                                                    </button>
                                                )}
                                            </div>

                                            {/* Row 3: Checkbox and Action Buttons */}
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        type="checkbox"
                                                        checked={documentForm.ignoreExpiration}
                                                        onChange={(e) => setDocumentForm({ ...documentForm, ignoreExpiration: e.target.checked })}
                                                        className="w-4 h-4"
                                                    />
                                                    <label className="text-sm text-primary">Ignore Expiration</label>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {editingDocumentId && (
                                                        <button
                                                            onClick={() => {
                                                                setEditingDocumentId(null);
                                                                setDocumentForm({ title: '', expiryDate: '', description: '', file: null, ignoreExpiration: false });
                                                            }}
                                                            className="px-4 py-2 bg-gray-400 !text-white rounded-lg hover:bg-gray-500"
                                                        >
                                                            Cancel
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => {
                                                            if (documentForm.description || documentForm.title || documentForm.file) {
                                                                if (editingDocumentId) {
                                                                    setDocuments(documents.map(d =>
                                                                        d.id === editingDocumentId
                                                                            ? {
                                                                                ...d,
                                                                                title: documentForm.title,
                                                                                expiryDate: documentForm.expiryDate,
                                                                                description: documentForm.description,
                                                                                file: documentForm.file ?? d.file,
                                                                                fileName: documentForm.file?.name ?? d.fileName,
                                                                                ignoreExpiration: documentForm.ignoreExpiration
                                                                            }
                                                                            : d
                                                                    ));
                                                                    setEditingDocumentId(null);
                                                                } else {
                                                                    setDocuments([...documents, {
                                                                        id: Date.now().toString(),
                                                                        title: documentForm.title || '',
                                                                        expiryDate: documentForm.expiryDate,
                                                                        description: documentForm.description,
                                                                        file: documentForm.file,
                                                                        fileName: documentForm.file?.name || '',
                                                                        ignoreExpiration: documentForm.ignoreExpiration
                                                                    }]);
                                                                }
                                                                setDocumentForm({ title: '', expiryDate: '', description: '', file: null, ignoreExpiration: false });
                                                            }
                                                        }}
                                                        className="px-4 py-2 bg-gray-700 !text-white rounded-lg flex items-center gap-2 hover:bg-gray-800"
                                                    >
                                                        {editingDocumentId ? <Edit className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                                                        <span>{editingDocumentId ? 'Update' : 'Add'}</span>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Documents Table */}
                                        <div className="bg-card rounded-lg border border-theme overflow-x-auto">
                                            <table className="w-full min-w-[800px]">
                                                <thead className="bg-card">
                                                    <tr>
                                                        <th className="px-4 py-2 text-left text-xs font-medium text-primary">Title</th>
                                                        <th className="px-4 py-2 text-left text-xs font-medium text-primary">Expiry Date</th>
                                                        <th className="px-4 py-2 text-left text-xs font-medium text-primary">Description</th>
                                                        <th className="px-4 py-2 text-left text-xs font-medium text-primary">File</th>
                                                        <th className="px-4 py-2 text-left text-xs font-medium text-primary">Ignore Expiration</th>
                                                        <th className="px-4 py-2 text-left text-xs font-medium text-primary">Actions</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {documents.length === 0 ? (
                                                        <tr>
                                                            <td colSpan={6} className="px-4 py-8 text-center text-secondary">No Data</td>
                                                        </tr>
                                                    ) : (
                                                        documents.map((doc) => (
                                                            <tr key={doc.id} className={`border-t border-theme hover:bg-[rgba(255,255,255,0.03)] ${editingDocumentId === doc.id ? 'bg-card' : ''}`}>
                                                                <td className="px-4 py-2 text-sm text-primary">{doc.title || '-'}</td>
                                                                <td className="px-4 py-2 text-sm text-primary">{doc.expiryDate || '-'}</td>
                                                                <td className="px-4 py-2 text-sm text-primary">{doc.description || '-'}</td>
                                                                <td className="px-4 py-2 text-sm text-primary">
                                                                    {doc.fileName || doc.fileUrl || doc.file ? (
                                                                        doc.fileUrl ? (
                                                                            <a
                                                                                href={doc.fileUrl}
                                                                                target="_blank"
                                                                                rel="noopener noreferrer"
                                                                                className="flex items-center gap-2 text-[#00D1FF] hover:text-blue-800 hover:underline"
                                                                                onClick={(e) => e.stopPropagation()}
                                                                            >
                                                                                <FileText className="w-4 h-4" />
                                                                                <span>{doc.fileName || 'View File'}</span>
                                                                            </a>
                                                                        ) : (
                                                                            <div className="flex items-center gap-2 text-[#00D1FF]">
                                                                                <FileText className="w-4 h-4" />
                                                                                <span className="truncate max-w-[200px]">
                                                                                    {doc.fileName || (doc.file instanceof File ? doc.file.name : 'File attached')}
                                                                                </span>
                                                                            </div>
                                                                        )
                                                                    ) : (
                                                                        <span className="text-secondary">No file</span>
                                                                    )}
                                                                </td>
                                                                <td className="px-4 py-2 text-sm text-primary">{doc.ignoreExpiration ? 'Yes' : 'No'}</td>
                                                                <td className="px-4 py-2 text-sm text-primary">
                                                                    <div className="flex items-center gap-2">
                                                                        <button
                                                                            onClick={() => {
                                                                                setEditingDocumentId(doc.id);
                                                                                setDocumentForm({
                                                                                    title: doc.title || '',
                                                                                    expiryDate: doc.expiryDate || '',
                                                                                    description: doc.description || '',
                                                                                    file: doc.file || null,
                                                                                    ignoreExpiration: doc.ignoreExpiration
                                                                                });
                                                                            }}
                                                                            className="p-1 text-[#00D1FF] hover:bg-blue-50 rounded"
                                                                            title="Edit"
                                                                        >
                                                                            <Edit className="w-4 h-4" />
                                                                        </button>
                                                                        <button
                                                                            onClick={() => {
                                                                                setDocuments(documents.filter((d) => d.id !== doc.id));
                                                                                if (editingDocumentId === doc.id) {
                                                                                    setEditingDocumentId(null);
                                                                                    setDocumentForm({ title: '', expiryDate: '', description: '', file: null, ignoreExpiration: false });
                                                                                }
                                                                            }}
                                                                            className="p-1 text-[#A855F7] hover:bg-red-50 rounded"
                                                                            title="Delete"
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

                                {/* Invoice Step */}
                                {activeStep === 'Invoice' && (
                                    <div className="space-y-4">

                                        {/* Invoice Form */}
                                        <div className="bg-card p-4 rounded-lg">
                                            <div className="grid grid-cols-2 gap-4 mb-4">
                                                <div>
                                                    <label className="block text-sm font-medium text-primary mb-1">Invoice Number<span className="text-red-500">*</span></label>
                                                    <input
                                                        type="text"
                                                        placeholder="Invoice Number"
                                                        value={invoiceForm.invoiceNumber}
                                                        onChange={(e) => setInvoiceForm({ ...invoiceForm, invoiceNumber: e.target.value })}
                                                        className="w-full px-3 py-2 bg-card border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)] text-sm"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-primary mb-1">Vendor / Workshop<span className="text-red-500">*</span></label>
                                                    <input
                                                        type="text"
                                                        placeholder="Vendor / Workshop"
                                                        value={invoiceForm.vendorWorkshop}
                                                        onChange={(e) => setInvoiceForm({ ...invoiceForm, vendorWorkshop: e.target.value })}
                                                        className="w-full px-3 py-2 bg-card border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)] text-sm"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-primary mb-1">Amount<span className="text-red-500">*</span></label>
                                                    <div className="relative">
                                                        <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-secondary">$</span>
                                                        <input
                                                            type="number"
                                                            placeholder="0.00"
                                                            value={invoiceForm.amount}
                                                            onChange={(e) => {
                                                                const value = e.target.value;
                                                                if (value === '' || /^\d*\.?\d{0,2}$/.test(value)) {
                                                                    setInvoiceForm({ ...invoiceForm, amount: value });
                                                                }
                                                            }}
                                                            min="0"
                                                            step="0.01"
                                                            className="w-full pl-7 pr-3 py-2 bg-card border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)] text-sm"
                                                        />
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-primary mb-1">Invoice Date<span className="text-red-500">*</span></label>
                                                    <div className="relative">
                                                        <Calendar className="absolute left-2 top-2.5 w-4 h-4 text-secondary pointer-events-none" />
                                                        <input
                                                            type="date"
                                                            value={invoiceForm.invoiceDate}
                                                            onChange={(e) => setInvoiceForm({ ...invoiceForm, invoiceDate: e.target.value })}
                                                            className="w-full pl-8 pr-3 py-2 bg-card border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)] text-sm"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="mb-4">
                                                <label className="block text-sm font-medium text-primary mb-1">Upload Invoice (PDF / Image)</label>
                                                {invoiceForm.file ? (
                                                    <div className="flex items-center gap-2 px-3 py-2 border border-theme rounded-lg bg-card">
                                                        <FileText className="w-4 h-4 text-secondary flex-shrink-0" />
                                                        <span className="text-sm text-primary truncate flex-1">
                                                            {invoiceForm.file.name}
                                                        </span>
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setInvoiceForm({ ...invoiceForm, file: null });
                                                                if (invoiceFileInputRef.current) {
                                                                    invoiceFileInputRef.current.value = '';
                                                                }
                                                            }}
                                                            className="text-secondary hover:text-[#A855F7] transition-colors flex-shrink-0"
                                                            title="Remove file"
                                                        >
                                                            <X className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <>
                                                        <input
                                                            ref={invoiceFileInputRef}
                                                            type="file"
                                                            accept=".pdf,.jpg,.jpeg,.png,.gif"
                                                            onChange={(e) => {
                                                                if (e.target.files && e.target.files[0]) {
                                                                    setInvoiceForm({ ...invoiceForm, file: e.target.files[0] });
                                                                }
                                                            }}
                                                            className="hidden"
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => invoiceFileInputRef.current?.click()}
                                                            className="w-full px-4 py-2 border border-theme rounded-lg hover:bg-[rgba(255,255,255,0.03)] text-sm font-medium bg-card flex items-center justify-center gap-2"
                                                        >
                                                            <Upload className="w-4 h-4" />
                                                            <span>Select File</span>
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                            <div className="mb-4">
                                                <label className="block text-sm font-medium text-primary mb-1">Notes</label>
                                                <textarea
                                                    placeholder="Notes"
                                                    value={invoiceForm.notes}
                                                    onChange={(e) => setInvoiceForm({ ...invoiceForm, notes: e.target.value })}
                                                    className="w-full px-3 py-2 bg-card border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)] min-h-[80px] text-sm resize-none"
                                                />
                                            </div>
                                            <div className="flex justify-end gap-2">
                                                {editingInvoiceId && (
                                                    <button
                                                        onClick={() => {
                                                            setEditingInvoiceId(null);
                                                            setInvoiceForm({
                                                                invoiceNumber: '',
                                                                vendorWorkshop: '',
                                                                amount: '',
                                                                invoiceDate: '',
                                                                file: null,
                                                                notes: ''
                                                            });
                                                            if (invoiceFileInputRef.current) {
                                                                invoiceFileInputRef.current.value = '';
                                                            }
                                                        }}
                                                        className="px-4 py-2 bg-gray-500 !text-white rounded-lg flex items-center gap-2 hover:bg-gray-600 transition-colors"
                                                    >
                                                        <X className="w-4 h-4" />
                                                        <span>Cancel</span>
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => {
                                                        if (invoiceForm.invoiceNumber && invoiceForm.vendorWorkshop && invoiceForm.amount && invoiceForm.invoiceDate) {
                                                            if (editingInvoiceId) {
                                                                setInvoices(invoices.map(inv =>
                                                                    inv.id === editingInvoiceId
                                                                        ? {
                                                                            ...inv,
                                                                            invoiceNumber: invoiceForm.invoiceNumber,
                                                                            vendorWorkshop: invoiceForm.vendorWorkshop,
                                                                            amount: invoiceForm.amount,
                                                                            invoiceDate: invoiceForm.invoiceDate,
                                                                            file: invoiceForm.file || inv.file,
                                                                            fileName: invoiceForm.file?.name || inv.fileName,
                                                                            notes: invoiceForm.notes
                                                                        }
                                                                        : inv
                                                                ));
                                                                setEditingInvoiceId(null);
                                                            } else {
                                                                setInvoices([...invoices, {
                                                                    id: Date.now().toString(),
                                                                    invoiceNumber: invoiceForm.invoiceNumber,
                                                                    vendorWorkshop: invoiceForm.vendorWorkshop,
                                                                    amount: invoiceForm.amount,
                                                                    invoiceDate: invoiceForm.invoiceDate,
                                                                    file: invoiceForm.file,
                                                                    fileName: invoiceForm.file?.name || '',
                                                                    notes: invoiceForm.notes
                                                                }]);
                                                            }
                                                            setInvoiceForm({
                                                                invoiceNumber: '',
                                                                vendorWorkshop: '',
                                                                amount: '',
                                                                invoiceDate: '',
                                                                file: null,
                                                                notes: ''
                                                            });
                                                            if (invoiceFileInputRef.current) {
                                                                invoiceFileInputRef.current.value = '';
                                                            }
                                                        }
                                                    }}
                                                    className="px-4 py-2 bg-gray-700 !text-white rounded-lg flex items-center gap-2 hover:bg-gray-800 transition-colors"
                                                >
                                                    <Plus className="w-4 h-4" />
                                                    <span>{editingInvoiceId ? 'Update' : 'Add'} Invoice</span>
                                                </button>
                                            </div>
                                        </div>

                                        {/* Invoices Table */}
                                        <div className="bg-card rounded-lg border border-theme overflow-x-auto">
                                            <table className="w-full min-w-[1000px]">
                                                <thead className="bg-card border-b border-theme">
                                                    <tr>
                                                        <th className="px-4 py-3 text-left text-xs font-medium text-primary uppercase">Invoice Number</th>
                                                        <th className="px-4 py-3 text-left text-xs font-medium text-primary uppercase">Vendor / Workshop</th>
                                                        <th className="px-4 py-3 text-left text-xs font-medium text-primary uppercase">Amount</th>
                                                        <th className="px-4 py-3 text-left text-xs font-medium text-primary uppercase">Invoice Date</th>
                                                        <th className="px-4 py-3 text-left text-xs font-medium text-primary uppercase">File</th>
                                                        <th className="px-4 py-3 text-left text-xs font-medium text-primary uppercase">Notes</th>
                                                        <th className="px-4 py-3 text-left text-xs font-medium text-primary uppercase">Actions</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-theme">
                                                    {invoices.length === 0 ? (
                                                        <tr>
                                                            <td colSpan={7} className="px-4 py-12 text-center text-secondary text-sm">No Invoices</td>
                                                        </tr>
                                                    ) : (
                                                        invoices.map((invoice) => (
                                                            <tr key={invoice.id} className="hover:bg-[rgba(255,255,255,0.03)] transition-colors">
                                                                <td className="px-4 py-3 text-sm text-primary">{invoice.invoiceNumber}</td>
                                                                <td className="px-4 py-3 text-sm text-primary">{invoice.vendorWorkshop}</td>
                                                                <td className="px-4 py-3 text-sm text-primary">${parseFloat(invoice.amount || '0').toFixed(2)}</td>
                                                                <td className="px-4 py-3 text-sm text-primary">{invoice.invoiceDate || '-'}</td>
                                                                <td className="px-4 py-3 text-sm text-primary">
                                                                    {invoice.fileUrl ? (
                                                                        <a
                                                                            href={invoice.fileUrl}
                                                                            target="_blank"
                                                                            rel="noopener noreferrer"
                                                                            className="flex items-center gap-2 text-[#00D1FF] hover:text-blue-800 hover:underline"
                                                                            onClick={(e) => e.stopPropagation()}
                                                                        >
                                                                            <FileText className="w-4 h-4" />
                                                                            <span>{invoice.fileName || 'View File'}</span>
                                                                        </a>
                                                                    ) : invoice.fileName || invoice.file ? (
                                                                        <div className="flex items-center gap-2 text-[#00D1FF]">
                                                                            <FileText className="w-4 h-4" />
                                                                            <span className="truncate max-w-[150px]">
                                                                                {invoice.fileName || (invoice.file instanceof File ? invoice.file.name : 'File attached')}
                                                                            </span>
                                                                        </div>
                                                                    ) : (
                                                                        <span className="text-secondary">No file</span>
                                                                    )}
                                                                </td>
                                                                <td className="px-4 py-3 text-sm text-primary">
                                                                    <span className="truncate max-w-[200px] block" title={invoice.notes}>
                                                                        {invoice.notes || '-'}
                                                                    </span>
                                                                </td>
                                                                <td className="px-4 py-3 text-sm text-primary">
                                                                    <div className="flex items-center gap-2">
                                                                        <button
                                                                            onClick={() => {
                                                                                setEditingInvoiceId(invoice.id);
                                                                                setInvoiceForm({
                                                                                    invoiceNumber: invoice.invoiceNumber,
                                                                                    vendorWorkshop: invoice.vendorWorkshop,
                                                                                    amount: invoice.amount,
                                                                                    invoiceDate: invoice.invoiceDate,
                                                                                    file: invoice.file,
                                                                                    notes: invoice.notes
                                                                                });
                                                                            }}
                                                                            className="p-1 text-[#00D1FF] hover:bg-blue-50 rounded"
                                                                            title="Edit"
                                                                        >
                                                                            <Edit className="w-4 h-4" />
                                                                        </button>
                                                                        <button
                                                                            onClick={() => {
                                                                                setInvoices(invoices.filter(i => i.id !== invoice.id));
                                                                                if (editingInvoiceId === invoice.id) {
                                                                                    setEditingInvoiceId(null);
                                                                                    setInvoiceForm({
                                                                                        invoiceNumber: '',
                                                                                        vendorWorkshop: '',
                                                                                        amount: '',
                                                                                        invoiceDate: '',
                                                                                        file: null,
                                                                                        notes: ''
                                                                                    });
                                                                                }
                                                                            }}
                                                                            className="p-1 text-[#A855F7] hover:bg-red-50 rounded"
                                                                            title="Delete"
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

                                {/* Notes Step */}
                                {activeStep === 'Notes' && (
                                    <div className="space-y-4">
                                        <h3 className="text-base font-semibold text-primary">Notes</h3>

                                        {/* Note Form */}
                                        <div className="flex gap-4 items-end bg-card p-4 rounded-lg">
                                            <div className="flex-1">
                                                <label className="block text-sm font-medium text-primary mb-1">Note</label>
                                                <input
                                                    type="text"
                                                    placeholder="Note"
                                                    value={noteForm.note}
                                                    onChange={(e) => setNoteForm({ ...noteForm, note: e.target.value })}
                                                    className="w-full px-3 py-2 bg-card border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)] text-sm"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-primary mb-1">Category</label>
                                                <div className="relative">
                                                    <select
                                                        value={noteForm.category}
                                                        onChange={(e) => setNoteForm({ ...noteForm, category: e.target.value })}
                                                        className="px-3 py-2 pr-8 bg-card border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)] text-sm appearance-none min-w-[150px]"
                                                    >
                                                        <option value="Category">Category</option>
                                                        <option value="Safety">Safety</option>
                                                        <option value="Attitude">Attitude</option>
                                                        <option value="Ops">Ops</option>
                                                        <option value="General">General</option>
                                                        <option value="Maintenance">Maintenance</option>
                                                    </select>
                                                    <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-secondary pointer-events-none" />
                                                </div>
                                            </div>
                                            {editingNoteId && (
                                                <button
                                                    onClick={() => {
                                                        setEditingNoteId(null);
                                                        setNoteForm({ note: '', category: 'Category' });
                                                    }}
                                                    className="w-10 h-10 bg-gray-400 !text-white rounded-lg flex items-center justify-center hover:bg-gray-500 transition-colors flex-shrink-0"
                                                    title="Cancel"
                                                >
                                                    <X className="w-5 h-5" />
                                                </button>
                                            )}
                                            <button
                                                onClick={() => {
                                                    if (noteForm.note && noteForm.category !== 'Category') {
                                                        if (editingNoteId) {
                                                            setNotes(notes.map(n =>
                                                                n.id === editingNoteId
                                                                    ? { ...n, note: noteForm.note, category: noteForm.category }
                                                                    : n
                                                            ));
                                                            setEditingNoteId(null);
                                                        } else {
                                                            setNotes([...notes, {
                                                                id: Date.now().toString(),
                                                                note: noteForm.note,
                                                                category: noteForm.category
                                                            }]);
                                                        }
                                                        setNoteForm({ note: '', category: 'Category' });
                                                    }
                                                }}
                                                className="w-10 h-10 bg-gray-700 !text-white rounded-lg flex items-center justify-center hover:bg-gray-800 transition-colors flex-shrink-0"
                                                title={editingNoteId ? 'Update Note' : 'Add Note'}
                                            >
                                                {editingNoteId ? <Edit className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                                            </button>
                                        </div>

                                        {/* Notes Table */}
                                        <div className="bg-card rounded-lg border border-theme overflow-hidden">
                                            <table className="w-full">
                                                <thead className="bg-card border-b border-theme">
                                                    <tr>
                                                        <th className="px-4 py-3 text-left text-xs font-medium text-primary uppercase">Note</th>
                                                        <th className="px-4 py-3 text-left text-xs font-medium text-primary uppercase">Category</th>
                                                        <th className="px-4 py-3 text-left text-xs font-medium text-primary uppercase">Actions</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-theme">
                                                    {notes.length === 0 ? (
                                                        <tr>
                                                            <td colSpan={3} className="px-4 py-12 text-center text-secondary text-sm">No Data</td>
                                                        </tr>
                                                    ) : (
                                                        notes.map((note) => (
                                                            <tr key={note.id} className={`hover:bg-[rgba(255,255,255,0.03)] transition-colors ${editingNoteId === note.id ? 'bg-card' : ''}`}>
                                                                <td className="px-4 py-3 text-sm text-primary">{note.note}</td>
                                                                <td className="px-4 py-3 text-sm text-primary">{note.category}</td>
                                                                <td className="px-4 py-3 text-sm text-primary">
                                                                    <div className="flex items-center gap-2">
                                                                        <button
                                                                            onClick={() => {
                                                                                setEditingNoteId(note.id);
                                                                                setNoteForm({ note: note.note, category: note.category });
                                                                            }}
                                                                            className="p-1 text-[#00D1FF] hover:bg-blue-50 rounded"
                                                                            title="Edit"
                                                                        >
                                                                            <Edit className="w-4 h-4" />
                                                                        </button>
                                                                        <button
                                                                            onClick={() => {
                                                                                setNotes(notes.filter(n => n.id !== note.id));
                                                                                if (editingNoteId === note.id) {
                                                                                    setEditingNoteId(null);
                                                                                    setNoteForm({ note: '', category: 'Category' });
                                                                                }
                                                                            }}
                                                                            className="p-1 text-[#A855F7] hover:bg-red-50 rounded"
                                                                            title="Delete"
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

                                {/* Conditional steps - only show when Owner Operator is selected */}
                                {formData.ownership === 'OWNER OPERATOR' && (
                                    <>
                                        {/* Payroll Step */}
                                        {activeStep === 'Payroll' && (
                                            <div className="space-y-4">
                                                <div className="mb-2">
                                                    <span className="text-sm text-secondary">Ownership: Owner Operator</span>
                                                </div>
                                                <h3 className="text-base font-semibold text-primary">Truck Ownership Information</h3>

                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="block text-sm font-medium text-primary mb-1">
                                                            Corportation Name<span className="text-red-500">*</span>
                                                        </label>
                                                        <input
                                                            type="text"
                                                            placeholder="Corportation Name"
                                                            value={payrollForm.corporationName}
                                                            onChange={(e) => setPayrollForm({ ...payrollForm, corporationName: e.target.value })}
                                                            className="w-full px-3 py-2 bg-card border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)] text-sm"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-sm font-medium text-primary mb-1">Full Address</label>
                                                        <input
                                                            type="text"
                                                            placeholder="Full Address"
                                                            value={payrollForm.fullAddress}
                                                            onChange={(e) => setPayrollForm({ ...payrollForm, fullAddress: e.target.value })}
                                                            className="w-full px-3 py-2 bg-card border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)] text-sm"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-sm font-medium text-primary mb-1">Driver Name</label>
                                                        <input
                                                            type="text"
                                                            placeholder="Driver Name"
                                                            value={payrollForm.driverName}
                                                            onChange={(e) => setPayrollForm({ ...payrollForm, driverName: e.target.value })}
                                                            className="w-full px-3 py-2 bg-card border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)] text-sm"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-sm font-medium text-primary mb-1">Email</label>
                                                        <input
                                                            type="email"
                                                            placeholder="Email"
                                                            value={payrollForm.email}
                                                            onChange={(e) => setPayrollForm({ ...payrollForm, email: e.target.value })}
                                                            className="w-full px-3 py-2 bg-card border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)] text-sm"
                                                        />
                                                    </div>
                                                </div>

                                                {/* Payment Method Tabs */}
                                                <div className="flex gap-2 mt-6">
                                                    {(['PAID PER MILE', 'PAID PERCENT', 'PAID BY TRIP', 'PAID PER HOUR'] as const).map((method) => (
                                                        <button
                                                            key={method}
                                                            onClick={() => setPaymentMethod(method)}
                                                            className={`px-4 py-2 rounded-sm font-medium transition-colors text-sm ${paymentMethod === method
                                                                ? 'bg-gray-700 !text-white'
                                                                : 'bg-card border border-theme text-primary hover:bg-[rgba(255,255,255,0.03)]'
                                                                }`}
                                                        >
                                                            {method}
                                                        </button>
                                                    ))}
                                                </div>

                                                {/* Conditional Fields based on Payment Method */}
                                                {paymentMethod === 'PAID PER MILE' && (
                                                    <div className="space-y-4 mt-4">
                                                        <h4 className="text-sm font-semibold text-primary">$/Mile</h4>
                                                        <div className="grid grid-cols-2 gap-4">
                                                            <div>
                                                                <label className="block text-sm font-medium text-primary mb-1">
                                                                    ALONE<span className="text-red-500">*</span>
                                                                </label>
                                                                <input
                                                                    type="text"
                                                                    value={payrollForm.alone}
                                                                    onChange={(e) => setPayrollForm({ ...payrollForm, alone: e.target.value })}
                                                                    className="w-full px-3 py-2 bg-card border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)] text-sm"
                                                                />
                                                            </div>
                                                            <div>
                                                                <label className="block text-sm font-medium text-primary mb-1">
                                                                    TEAM<span className="text-red-500">*</span>
                                                                </label>
                                                                <input
                                                                    type="text"
                                                                    value={payrollForm.team}
                                                                    onChange={(e) => setPayrollForm({ ...payrollForm, team: e.target.value })}
                                                                    className="w-full px-3 py-2 bg-card border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)] text-sm"
                                                                />
                                                            </div>
                                                            <div>
                                                                <label className="block text-sm font-medium text-primary mb-1">
                                                                    EMPTY<span className="text-red-500">*</span>
                                                                </label>
                                                                <input
                                                                    type="text"
                                                                    value={payrollForm.empty}
                                                                    onChange={(e) => setPayrollForm({ ...payrollForm, empty: e.target.value })}
                                                                    className="w-full px-3 py-2 bg-card border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)] text-sm"
                                                                />
                                                            </div>
                                                            <div>
                                                                <label className="block text-sm font-medium text-primary mb-1">
                                                                    EMPTY-TEAM<span className="text-red-500">*</span>
                                                                </label>
                                                                <input
                                                                    type="text"
                                                                    value={payrollForm.emptyTeam}
                                                                    onChange={(e) => setPayrollForm({ ...payrollForm, emptyTeam: e.target.value })}
                                                                    className="w-full px-3 py-2 bg-card border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)] text-sm"
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}

                                                {paymentMethod === 'PAID PERCENT' && (
                                                    <div className="space-y-4 mt-4">
                                                        <div>
                                                            <label className="block text-sm font-medium text-primary mb-1">
                                                                Percent Rate<span className="text-red-500">*</span>
                                                            </label>
                                                            <div className="flex items-center gap-2">
                                                                <input
                                                                    type="text"
                                                                    value={payrollForm.percentRate}
                                                                    onChange={(e) => setPayrollForm({ ...payrollForm, percentRate: e.target.value })}
                                                                    className="w-full px-3 py-2 bg-card border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)] text-sm"
                                                                />
                                                                <span className="text-sm font-medium text-primary">%</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}

                                                {paymentMethod === 'PAID BY TRIP' && (
                                                    <div className="space-y-4 mt-4">
                                                        <div>
                                                            <label className="block text-sm font-medium text-primary mb-1">
                                                                Per Trip Amount<span className="text-red-500">*</span>
                                                            </label>
                                                            <input
                                                                type="text"
                                                                value={payrollForm.perTripAmount}
                                                                onChange={(e) => setPayrollForm({ ...payrollForm, perTripAmount: e.target.value })}
                                                                className="w-full px-3 py-2 bg-card border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)] text-sm"
                                                            />
                                                        </div>
                                                    </div>
                                                )}

                                                {paymentMethod === 'PAID PER HOUR' && (
                                                    <div className="space-y-4 mt-4">
                                                        <div>
                                                            <label className="block text-sm font-medium text-primary mb-1">
                                                                PER HOUR<span className="text-red-500">*</span>
                                                            </label>
                                                            <input
                                                                type="text"
                                                                value={payrollForm.perHour}
                                                                onChange={(e) => setPayrollForm({ ...payrollForm, perHour: e.target.value })}
                                                                className="w-full px-3 py-2 bg-card border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)] text-sm"
                                                            />
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Common Fields */}
                                                <div className="grid grid-cols-2 gap-4 mt-4">
                                                    <div className="flex items-center gap-2">
                                                        <input
                                                            type="checkbox"
                                                            checked={payrollForm.companyPaysFuel}
                                                            onChange={(e) => setPayrollForm({ ...payrollForm, companyPaysFuel: e.target.checked })}
                                                            className="w-4 h-4"
                                                        />
                                                        <label className="text-sm text-primary">Company Pays Fuel</label>
                                                    </div>
                                                    <div>
                                                        <label className="block text-sm font-medium text-primary mb-1">GST No.</label>
                                                        <input
                                                            type="text"
                                                            placeholder="GST No."
                                                            value={payrollForm.gstNo}
                                                            onChange={(e) => setPayrollForm({ ...payrollForm, gstNo: e.target.value })}
                                                            className="w-full px-3 py-2 bg-card border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)] text-sm"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-sm font-medium text-primary mb-1">Custom HST %</label>
                                                        <input
                                                            type="text"
                                                            placeholder="Leave Empty To Use Company"
                                                            value={payrollForm.customHst}
                                                            onChange={(e) => setPayrollForm({ ...payrollForm, customHst: e.target.value })}
                                                            className="w-full px-3 py-2 bg-card border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)] text-sm"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Deductions Step */}
                                        {activeStep === 'Deductions' && (
                                            <div className="space-y-4">
                                                <h3 className="text-base font-semibold text-primary">Payroll Deductions</h3>

                                                {/* Deduction Form */}
                                                <div className="flex gap-2 items-end bg-card p-4 rounded-lg">
                                                    <div className="flex-1">
                                                        <label className="block text-sm font-medium text-primary mb-1">Start Date</label>
                                                        <div className="relative">
                                                            <Calendar className="absolute left-2 top-2.5 w-4 h-4 text-secondary" />
                                                            <input
                                                                type="date"
                                                                value={deductionForm.startDate}
                                                                onChange={(e) => setDeductionForm({ ...deductionForm, startDate: e.target.value })}
                                                                className="w-full pl-8 pr-3 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)] text-sm"
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className="flex-1">
                                                        <label className="block text-sm font-medium text-primary mb-1">Description</label>
                                                        <input
                                                            type="text"
                                                            placeholder="Description"
                                                            value={deductionForm.description}
                                                            onChange={(e) => setDeductionForm({ ...deductionForm, description: e.target.value })}
                                                            className="w-full px-3 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)] text-sm"
                                                        />
                                                    </div>
                                                    <div className="flex-1">
                                                        <label className="block text-sm font-medium text-primary mb-1">Fee</label>
                                                        <input
                                                            type="text"
                                                            value={deductionForm.fee}
                                                            onChange={(e) => setDeductionForm({ ...deductionForm, fee: e.target.value })}
                                                            className="w-full px-3 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)] text-sm"
                                                        />
                                                    </div>
                                                    <div className="flex-1">
                                                        <label className="block text-sm font-medium text-primary mb-1">Interval</label>
                                                        <div className="relative">
                                                            <select
                                                                value={deductionForm.interval}
                                                                onChange={(e) => setDeductionForm({ ...deductionForm, interval: e.target.value })}
                                                                className="w-full px-3 py-2 pr-8 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)] text-sm appearance-none"
                                                            >
                                                                <option className="form-option" value="Interval">Interval</option>
                                                                <option className="form-option" value="Annual">Annual</option>
                                                                <option className="form-option" value="Monthly">Monthly</option>
                                                                <option className="form-option" value="Per Mile">Per Mile</option>
                                                                <option className="form-option" value="One Time">One Time</option>
                                                                <option className="form-option" value="Weekly">Weekly</option>
                                                                <option className="form-option" value="Biweekly">Biweekly</option>
                                                            </select>
                                                            <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-secondary pointer-events-none" />
                                                        </div>
                                                    </div>
                                                    <div className="flex-1">
                                                        <label className="block text-sm font-medium text-primary mb-1">Currency</label>
                                                        <div className="relative">
                                                            <select
                                                                value={deductionForm.currency}
                                                                onChange={(e) => setDeductionForm({ ...deductionForm, currency: e.target.value })}
                                                                className="w-full px-3 py-2 pr-8 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)] text-sm appearance-none"
                                                            >
                                                                <option className="form-option" value="CAD">CAD</option>
                                                                <option className="form-option" value="USD">USD</option>
                                                            </select>
                                                            <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-secondary pointer-events-none" />
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={() => {
                                                            if (deductionForm.startDate && deductionForm.description && deductionForm.interval !== 'Interval') {
                                                                setDeductions([...deductions, {
                                                                    id: Date.now().toString(),
                                                                    ...deductionForm
                                                                }]);
                                                                setDeductionForm({ startDate: '', description: '', fee: '0', interval: 'Interval', currency: 'CAD' });
                                                            }
                                                        }}
                                                        className="w-10 h-10 bg-gray-700 !text-white rounded-lg flex items-center justify-center hover:bg-gray-800 transition-colors flex-shrink-0"
                                                    >
                                                        <Plus className="w-5 h-5" />
                                                    </button>
                                                </div>

                                                {/* Deductions Table */}
                                                <div className="bg-card rounded-lg border border-theme overflow-hidden">
                                                    <table className="w-full">
                                                        <thead className="bg-card border-b border-theme">
                                                            <tr>
                                                                <th className="px-4 py-3 text-left text-xs font-medium text-primary uppercase">Start Date</th>
                                                                <th className="px-4 py-3 text-left text-xs font-medium text-primary uppercase">Description</th>
                                                                <th className="px-4 py-3 text-left text-xs font-medium text-primary uppercase">Fee</th>
                                                                <th className="px-4 py-3 text-left text-xs font-medium text-primary uppercase">Interval</th>
                                                                <th className="px-4 py-3 text-left text-xs font-medium text-primary uppercase">Currency</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-theme">
                                                            {deductions.length === 0 ? (
                                                                <tr>
                                                                    <td colSpan={5} className="px-4 py-12 text-center text-secondary text-sm">No Data</td>
                                                                </tr>
                                                            ) : (
                                                                deductions.map((deduction) => (
                                                                    <tr key={deduction.id} className="hover:bg-[rgba(255,255,255,0.03)] transition-colors">
                                                                        <td className="px-4 py-3 text-sm text-primary">{deduction.startDate}</td>
                                                                        <td className="px-4 py-3 text-sm text-primary">{deduction.description}</td>
                                                                        <td className="px-4 py-3 text-sm text-primary">{deduction.fee}</td>
                                                                        <td className="px-4 py-3 text-sm text-primary">{deduction.interval}</td>
                                                                        <td className="px-4 py-3 text-sm text-primary">{deduction.currency}</td>
                                                                    </tr>
                                                                ))
                                                            )}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        )}

                                        {/* Additions Step */}
                                        {activeStep === 'Additions' && (
                                            <div className="space-y-4">
                                                <h3 className="text-base font-semibold text-primary">Payroll Additions</h3>

                                                {/* Addition Form */}
                                                <div className="flex gap-2 items-end bg-card p-4 rounded-lg">
                                                    <div className="flex-1">
                                                        <label className="block text-sm font-medium text-primary mb-1">Start Date</label>
                                                        <div className="relative">
                                                            <Calendar className="absolute left-2 top-2.5 w-4 h-4 text-secondary" />
                                                            <input
                                                                type="date"
                                                                value={additionForm.startDate}
                                                                onChange={(e) => setAdditionForm({ ...additionForm, startDate: e.target.value })}
                                                                className="w-full pl-8 pr-3 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)] text-sm"
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className="flex-1">
                                                        <label className="block text-sm font-medium text-primary mb-1">Description</label>
                                                        <input
                                                            type="text"
                                                            placeholder="Description"
                                                            value={additionForm.description}
                                                            onChange={(e) => setAdditionForm({ ...additionForm, description: e.target.value })}
                                                            className="w-full px-3 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)] text-sm"
                                                        />
                                                    </div>
                                                    <div className="flex-1">
                                                        <label className="block text-sm font-medium text-primary mb-1">Amount</label>
                                                        <input
                                                            type="text"
                                                            value={additionForm.amount}
                                                            onChange={(e) => setAdditionForm({ ...additionForm, amount: e.target.value })}
                                                            className="w-full px-3 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)] text-sm"
                                                        />
                                                    </div>
                                                    <div className="flex-1">
                                                        <label className="block text-sm font-medium text-primary mb-1">Interval</label>
                                                        <div className="relative">
                                                            <select
                                                                value={additionForm.interval}
                                                                onChange={(e) => setAdditionForm({ ...additionForm, interval: e.target.value })}
                                                                className="w-full px-3 py-2 pr-8 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)] text-sm appearance-none"
                                                            >
                                                                <option className="form-option" value="Interval">Interval</option>
                                                                <option className="form-option" value="Annual">Annual</option>
                                                                <option className="form-option" value="Monthly">Monthly</option>
                                                                <option className="form-option" value="Per Mile">Per Mile</option>
                                                                <option className="form-option" value="One Time">One Time</option>
                                                                <option className="form-option" value="Weekly">Weekly</option>
                                                                <option className="form-option" value="Biweekly">Biweekly</option>
                                                            </select>
                                                            <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-secondary pointer-events-none" />
                                                        </div>
                                                    </div>
                                                    <div className="flex-1">
                                                        <label className="block text-sm font-medium text-primary mb-1">Currency</label>
                                                        <div className="relative">
                                                            <select
                                                                value={additionForm.currency}
                                                                onChange={(e) => setAdditionForm({ ...additionForm, currency: e.target.value })}
                                                                className="w-full px-3 py-2 pr-8 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)] text-sm appearance-none"
                                                            >
                                                                <option className="form-option" value="CAD">CAD</option>
                                                                <option className="form-option" value="USD">USD</option>
                                                            </select>
                                                            <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-secondary pointer-events-none" />
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={() => {
                                                            if (additionForm.startDate && additionForm.description && additionForm.interval !== 'Interval') {
                                                                setAdditions([...additions, {
                                                                    id: Date.now().toString(),
                                                                    ...additionForm
                                                                }]);
                                                                setAdditionForm({ startDate: '', description: '', amount: '0', interval: 'Interval', currency: 'CAD' });
                                                            }
                                                        }}
                                                        className="w-10 h-10 bg-gray-700 !text-white rounded-lg flex items-center justify-center hover:bg-gray-800 transition-colors flex-shrink-0"
                                                    >
                                                        <Plus className="w-5 h-5" />
                                                    </button>
                                                </div>

                                                {/* Additions Table */}
                                                <div className="bg-card rounded-lg border border-theme overflow-hidden">
                                                    <table className="w-full">
                                                        <thead className="bg-card border-b border-theme">
                                                            <tr>
                                                                <th className="px-4 py-3 text-left text-xs font-medium text-primary uppercase">Start Date</th>
                                                                <th className="px-4 py-3 text-left text-xs font-medium text-primary uppercase">Description</th>
                                                                <th className="px-4 py-3 text-left text-xs font-medium text-primary uppercase">Amount</th>
                                                                <th className="px-4 py-3 text-left text-xs font-medium text-primary uppercase">Interval</th>
                                                                <th className="px-4 py-3 text-left text-xs font-medium text-primary uppercase">Currency</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-theme">
                                                            {additions.length === 0 ? (
                                                                <tr>
                                                                    <td colSpan={5} className="px-4 py-12 text-center text-secondary text-sm">No Data</td>
                                                                </tr>
                                                            ) : (
                                                                additions.map((addition) => (
                                                                    <tr key={addition.id} className="hover:bg-[rgba(255,255,255,0.03)] transition-colors">
                                                                        <td className="px-4 py-3 text-sm text-primary">{addition.startDate}</td>
                                                                        <td className="px-4 py-3 text-sm text-primary">{addition.description}</td>
                                                                        <td className="px-4 py-3 text-sm text-primary">{addition.amount}</td>
                                                                        <td className="px-4 py-3 text-sm text-primary">{addition.interval}</td>
                                                                        <td className="px-4 py-3 text-sm text-primary">{addition.currency}</td>
                                                                    </tr>
                                                                ))
                                                            )}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        )}
                                    </>
                                )}

                            </div>
                            {/* Footer: Previous/Next fixed at bottom */}
                            <div className="flex-shrink-0 border-t border-theme bg-card px-4 py-3">
                                <div className="flex justify-between gap-3">
                                    <button
                                        onClick={handlePrevious}
                                        disabled={!getPreviousStep()}
                                        className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${getPreviousStep()
                                            ? 'bg-gray-700 !text-white hover:bg-[var(--accent-navyblue)]'
                                            : 'bg-gray-700 text-secondary cursor-not-allowed'
                                            }`}
                                    >
                                        <ChevronLeft className="w-3.5 h-3.5" />
                                        Previous
                                    </button>
                                    <button
                                        onClick={handleNext}
                                        disabled={!getNextStep()}
                                        className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${getNextStep()
                                            ? 'bg-gray-700 !text-white hover:bg-gray-800'
                                            : 'bg-gray-200 text-secondary cursor-not-allowed'
                                            }`}
                                    >
                                        Next
                                        <ChevronRight className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* Delete Confirmation Modal */}
            <ConfirmationModal
                isOpen={showDeleteConfirmation}
                onClose={() => {
                    setShowDeleteConfirmation(false);
                    setDeleteTargetId(null);
                }}
                onConfirm={handleDeleteTruck}
                title="Confirm Deletion"
                message="Are you sure you want to delete this truck? This action cannot be undone and will permanently remove all truck data including documents, inspections, and history."
                confirmText="Delete"
                type="danger"
                isLoading={loading}
            />

            {/* Truck Limit Reached Modal */}
            {truckLimitModal.show && (
                <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-[10000] flex items-center justify-center p-4">
                    <div className="bg-card rounded-xl shadow-2xl max-w-md w-full">
                        <div className="p-6 border-b border-theme">
                            <div className="flex items-start gap-4">
                                <div className="flex-shrink-0 w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                                    <svg className="w-6 h-6 text-[#F59E0B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                                    </svg>
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-xl font-semibold text-primary">Truck Limit Reached</h3>
                                    <p className="text-sm text-secondary mt-1">
                                        Your plan allows <span className="font-bold text-primary">{truckLimitModal.maxTrucks}</span> truck{truckLimitModal.maxTrucks !== 1 ? 's' : ''}.
                                        You currently have <span className="font-bold text-[#A855F7]">{truckLimitModal.usedTrucks}</span> truck{truckLimitModal.usedTrucks !== 1 ? 's' : ''} in use.
                                    </p>
                                    <p className="text-sm text-secondary mt-2">
                                        To add more trucks, upgrade your plan or purchase additional truck slots from the Subscription page.
                                    </p>
                                    <div className="mt-3 bg-card border border-orange-200 rounded-lg p-3 flex items-center justify-between">
                                        <span className="text-xs font-medium text-orange-700">Trucks used</span>
                                        <span className="text-sm font-bold text-orange-800">{truckLimitModal.usedTrucks} / {truckLimitModal.maxTrucks}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="p-6 flex items-center justify-end gap-3">
                            <button
                                onClick={() => setTruckLimitModal({ show: false, maxTrucks: 0, usedTrucks: 0 })}
                                className="px-5 py-2.5 border border-theme text-primary rounded-lg hover:bg-[rgba(255,255,255,0.03)] font-medium transition-colors"
                            >
                                Close
                            </button>
                            <button
                                onClick={() => { setTruckLimitModal({ show: false, maxTrucks: 0, usedTrucks: 0 }); navigate('/admin/subscription'); }}
                                className="px-5 py-2.5 bg-blue-600 !text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
                            >
                                Upgrade / Add Trucks
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Validation Errors Display */}
            {validationErrors.length > 0 && (
                <div className="fixed bottom-4 right-4 bg-card border-l-4 border-red-500 p-4 rounded-lg shadow-lg max-w-md z-[10001]">
                    <div className="flex items-start">
                        <div className="flex-shrink-0">
                            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <div className="ml-3 flex-1">
                            <h3 className="text-sm font-medium text-red-800">Please fix the following errors:</h3>
                            <ul className="mt-2 text-sm text-red-700 list-disc list-inside">
                                {validationErrors.map((error, index) => (
                                    <li key={index}>{error}</li>
                                ))}
                            </ul>
                        </div>
                        <button
                            onClick={() => setValidationErrors([])}
                            className="ml-3 flex-shrink-0 text-red-400 hover:text-[#A855F7]"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Trucks;
