import React, { useState, useEffect, useRef } from 'react';
import { Plus, Upload, ChevronUp, ChevronDown, HelpCircle, Clock, X, Image as ImageIcon, Edit, Trash2, Calendar, ChevronLeft, ChevronRight, FileText, FileDown } from 'lucide-react';
import ExcelJS from 'exceljs';
import { getAllTrailers, createTrailer, updateTrailer, deleteTrailer, getTrailerById } from '../../../../axios/api/trailer';
import { getAllDrivers, type Driver } from '../../../../axios/api/driver';
import { createVehicleDocument, updateVehicleDocument } from '../../../../axios/api/compilance.vehicledoc';
import { getAllYards, type Yard } from '../../../../axios/api/fleet.yards';
import apiClient from '../../../../axios/apiClient';
import ConfirmationModal from '../../../../components/common/ConfirmationModal';

interface Trailer {
    _id?: string;
    id?: string;
    trailerNumber?: string;
    trailer?: string;
    unitNumber?: string;
    plateNumber: string;
    type: string;
    ownership: string;
    lastDispatch?: string;
    lastDispatchDate?: string | Date;
    lastDropLocation?: string;
    notes?: string;
    note?: string;
    operatingStatus?: 'IN SERVICE' | 'OUT OF SERVICE' | 'MAINTENANCE';
    loadedStatus?: 'LOADED' | 'IDLE' | 'SCHEDULED';
    compliance?: 'COMPLIANT' | 'NON-COMPLIANT' | 'EXPIRING SOON';
    category?: 'MB' | 'AB' | 'TX' | 'External' | 'Unassigned';
    imageUrl?: string;
    trailerImageUrl?: string;
    make?: string;
    model?: string;
    year?: string;
    vinNumber?: string;
    status?: string;
    yard?: any;
}

interface Country {
    name: string;
    code: string;
    flag: string;
    dialCode: string;
}

// Trailer data will be fetched from API

const TrailersPage: React.FC = () => {
    const [activeTab, setActiveTab] = useState<string>('All');
    const [searchTerm, setSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState('');
    const [complianceStatus, setComplianceStatus] = useState('All');
    const [operatingStatus, setOperatingStatus] = useState('All');

    // API state
    const [trailers, setTrailers] = useState<Trailer[]>([]);
    const [loading, setLoading] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
    const [, setDrivers] = useState<Driver[]>([]);
    const [yards, setYards] = useState<Yard[]>([]);
    const [yardCounts, setYardCounts] = useState<{ [key: string]: number }>({});
    const [assignedTrailerIds, setAssignedTrailerIds] = useState<Set<string>>(new Set());

    // Sidebar modal state
    const [showSidebar, setShowSidebar] = useState(false);
    const [activeStep, setActiveStep] = useState<'Details' | 'Inspections' | 'Documents' | 'Notes'>('Details');
    const [inspectionType, setInspectionType] = useState<'One Time' | 'Recurring'>('One Time');
    const [selectedImage, setSelectedImage] = useState<string | null>(null);

    // Confirmation modal states
    const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
    const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
    const [validationErrors, setValidationErrors] = useState<string[]>([]);

    // Form data
    const [formData, setFormData] = useState({
        unitNumber: '',
        vinNumber: '',
        plateNumber: '',
        make: '',
        model: '',
        year: '',
        weight: '0',
        registrationCountry: '',
        registrationProvince: '',
        type: '',
        uom: 'Kg',
        status: 'In Service',
        ownership: 'COMPANY ASSET' as 'COMPANY ASSET' | 'THIRD PARTY ASSET',
        subType: '' as '' | 'HIGHWAY USE' | 'CITY USE' | 'STORAGE USE' | 'RENTAL' | 'OTHER',
        yard: ''
    });

    // Store original trailer data for partial updates
    const [originalTrailerData, setOriginalTrailerData] = useState<any>(null);

    // Inspections data
    const [oneTimeInspections, setOneTimeInspections] = useState<Array<{
        id: string;
        expiryDate: string;
        description: string;
        ignoreExpiration: boolean;
        file?: File | null;
        fileUrl?: string | null;
        fileName?: string | null;
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
        fileName?: string | null;
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

    const [editingInspectionId, setEditingInspectionId] = useState<string | null>(null);
    const [editingInspectionType, setEditingInspectionType] = useState<'oneTime' | 'recurring' | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

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
    const documentFileInputRef = useRef<HTMLInputElement>(null);


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

    // Column filters
    const [filters, setFilters] = useState({
        trailerNumber: '',
        plateNumber: '',
        type: '',
        ownership: 'All',
        lastDispatch: '',
        lastDispatchDate: '',
        lastDropLocation: '',
        notes: '',
        operatingStatus: 'All',
        loadedStatus: 'All',
        compliance: 'All'
    });

    // Sort configuration
    const [sortConfig, setSortConfig] = useState<{ key: keyof Trailer | null; direction: 'asc' | 'desc' }>({
        key: null,
        direction: 'asc'
    });

    // Countries data
    const [countries, setCountries] = useState<Country[]>([]);

    // Fetch active orders to determine trailer assignments (for Unassigned tab)
    useEffect(() => {
        const fetchActiveOrders = async () => {
            try {
                const response = await apiClient.get('dispatcher/order?status=IN_PROGRESS,dispatched,in-delivery,CONFIRMED&limit=1000');
                if (response.data?.success && response.data?.data) {
                    const trailerIds = new Set<string>();
                    response.data.data.forEach((order: any) => {
                        if (order.trailer?._id) {
                            trailerIds.add(order.trailer._id);
                        }
                    });
                    setAssignedTrailerIds(trailerIds);
                }
            } catch (error) {
                console.error('Error fetching active orders:', error);
            }
        };
        fetchActiveOrders();
    }, []);

    // Fetch trailers from API
    useEffect(() => {
        const fetchTrailers = async () => {
            setLoading(true);
            try {
                // Determine filter parameters based on activeTab (same logic as Trucks)
                let yardFilter: string | undefined = undefined;
                let ownershipFilter: string | undefined = undefined;

                if (activeTab === 'All') {
                    // No filters - fetch all
                } else if (activeTab === 'External') {
                    ownershipFilter = 'THIRD PARTY ASSET';
                } else if (activeTab === 'Unassigned') {
                    // For unassigned, fetch all and filter on frontend
                } else {
                    // Yard filter - activeTab is a yard ID
                    yardFilter = activeTab;
                }

                console.log('🔍 Fetching trailers with filters:', { activeTab, yardFilter, ownershipFilter });

                const response = await getAllTrailers(
                    1,
                    1000,
                    undefined, // search
                    undefined, // type
                    undefined, // status
                    undefined, // operationStatus
                    yardFilter, // yard
                    ownershipFilter // ownership
                );

                console.log('📥 Trailers API response:', response);

                if (response?.success && response?.data) {
                    // Transform backend data to match frontend interface
                    const transformedTrailers = response.data.map((trailer: any) => ({
                        _id: trailer._id,
                        id: trailer._id,
                        trailerNumber: trailer.trailer || trailer.unitNumber || trailer.trailerNumber || '',
                        trailer: trailer.trailer || trailer.unitNumber || '',
                        unitNumber: trailer.unitNumber || trailer.trailer || '',
                        plateNumber: trailer.plateNumber || '',
                        type: trailer.type || '',
                        ownership: trailer.ownership || trailer.ownerShip || 'COMPANY ASSET',
                        lastDispatch: trailer.lastDispatch || '',
                        lastDispatchDate: trailer.lastDispatchDate ? new Date(trailer.lastDispatchDate).toLocaleDateString() : '',
                        lastDropLocation: trailer.lastDropLocation || '',
                        notes: trailer.notes || trailer.note || '',
                        note: trailer.note || trailer.notes || '',
                        operatingStatus: (trailer.operationStatus || trailer.operatingStatus || 'IN SERVICE') as 'IN SERVICE' | 'OUT OF SERVICE' | 'MAINTENANCE',
                        loadedStatus: (trailer.loadedStatus || 'IDLE') as 'LOADED' | 'IDLE' | 'SCHEDULED',
                        compliance: (trailer.compliance || 'NON-COMPLIANT') as 'COMPLIANT' | 'NON-COMPLIANT' | 'EXPIRING SOON',
                        category: trailer.category,
                        imageUrl: trailer.imageUrl || trailer.trailerImageUrl,
                        make: trailer.make,
                        model: trailer.model,
                        year: trailer.year,
                        vinNumber: trailer.vinNumber,
                        status: trailer.status,
                        yard: trailer.yard || null
                    }));
                    setTrailers(transformedTrailers);
                }
            } catch (error) {
                console.error('Error fetching trailers:', error);
                alert('Failed to fetch trailers. Please try again.');
            } finally {
                setLoading(false);
            }
        };
        fetchTrailers();
    }, [activeTab, assignedTrailerIds]);

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

    // Fetch drivers from API
    useEffect(() => {
        const fetchDrivers = async () => {
            try {
                const response = await getAllDrivers(1, 1000, '', 'active');
                if (response?.success && response?.data) {
                    setDrivers(response.data);
                } else if (response?.data && Array.isArray(response.data)) {
                    setDrivers(response.data);
                }
            } catch (error) {
                console.error('Error fetching drivers:', error);
            }
        };
        fetchDrivers();

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

    // Track which counts have been fetched to avoid redundant API calls
    const [fetchedCounts, setFetchedCounts] = useState<Set<string>>(new Set(['All']));

    // Function to fetch count for a specific tab
    const fetchTabCount = async (tabId: string) => {
        // Skip if already fetched
        if (fetchedCounts.has(tabId)) {
            return;
        }

        try {
            let count = 0;

            if (tabId === 'All') {
                const response = await getAllTrailers(1, 1);
                count = response?.pagination?.total || 0;
            } else if (tabId === 'External') {
                const response = await getAllTrailers(1, 1, undefined, undefined, undefined, undefined, undefined, 'THIRD PARTY ASSET');
                count = response?.pagination?.total || 0;
            } else if (tabId === 'Unassigned') {
                // For unassigned, we need to fetch all and filter
                const response = await getAllTrailers(1, 1000);
                if (response?.success && response?.data) {
                    count = response.data.filter((trailer: any) =>
                        !assignedTrailerIds.has(trailer._id)
                    ).length;
                }
            } else {
                // Yard-specific count
                const response = await getAllTrailers(1, 1, undefined, undefined, undefined, undefined, tabId);
                count = response?.pagination?.total || 0;
            }

            setYardCounts(prev => ({ ...prev, [tabId]: count }));
            setFetchedCounts(prev => new Set([...prev, tabId]));

            console.log(`✅ Fetched count for tab "${tabId}":`, count);
        } catch (error) {
            console.error(`Error fetching count for tab "${tabId}":`, error);
        }
    };

    // Fetch only "All" count on initial load
    useEffect(() => {
        const fetchInitialCount = async () => {
            try {
                const allResponse = await getAllTrailers(1, 1);
                const allCount = allResponse?.pagination?.total || 0;
                setYardCounts({ 'All': allCount });
                console.log('✅ Initial "All" count fetched:', allCount);
            } catch (error) {
                console.error('Error fetching initial count:', error);
            }
        };

        if (yards.length > 0) {
            fetchInitialCount();
        }
    }, [yards]);

    // Load trailer data when editing
    useEffect(() => {
        const loadTrailerForEdit = async () => {
            if (!editingId) return;

            try {
                console.log('📥 Loading trailer for edit:', editingId);
                const response = await getTrailerById(editingId);

                if (response?.success && response?.data) {
                    const trailer = response.data;
                    console.log('📋 Loaded trailer data:', trailer);

                    // Load basic form data
                    setFormData({
                        unitNumber: trailer.unitNumber || '',
                        vinNumber: trailer.vinNumber || '',
                        plateNumber: trailer.plateNumber || '',
                        make: trailer.make || '',
                        model: trailer.model || '',
                        year: trailer.year || '',
                        weight: trailer.weight || '',
                        uom: trailer.uom || 'Kg',
                        registrationCountry: trailer.registrationCountry || '',
                        registrationProvince: trailer.registrationProvince || '',
                        type: trailer.type || '',
                        status: trailer.status || 'In Service',
                        ownership: trailer.ownership || 'COMPANY ASSET',
                        subType: trailer.subType || '',
                        yard: trailer.yard?._id || trailer.yard || ''
                    });

                    // Load image
                    if (trailer.imageUrl || trailer.trailerImageUrl) {
                        setSelectedImage(trailer.imageUrl || trailer.trailerImageUrl);
                    }

                    // Load inspections
                    if (trailer.oneTimeInspections && Array.isArray(trailer.oneTimeInspections)) {
                        const loadedInspections = trailer.oneTimeInspections.map((insp: any) => ({
                            id: insp._id || Date.now().toString(),
                            expiryDate: insp.expiryDate ? new Date(insp.expiryDate).toISOString().split('T')[0] : '',
                            description: insp.description || '',
                            ignoreExpiration: insp.ignoreExpiration || false,
                            file: null,
                            fileUrl: insp.fileUrl || null,
                            fileName: insp.fileName || null,
                            isExisting: true
                        }));
                        setOneTimeInspections(loadedInspections);
                        console.log('✅ Loaded one-time inspections:', loadedInspections.length);
                    }

                    if (trailer.recurringInspections && Array.isArray(trailer.recurringInspections)) {
                        const loadedInspections = trailer.recurringInspections.map((insp: any) => ({
                            id: insp._id || Date.now().toString(),
                            scheduledOn: insp.scheduledOn ? new Date(insp.scheduledOn).toISOString().split('T')[0] : '',
                            after: insp.after || '',
                            unit: insp.unit || '',
                            description: insp.description || '',
                            ignoreExpiration: insp.ignoreExpiration || false,
                            file: null,
                            fileUrl: insp.fileUrl || null,
                            fileName: insp.fileName || null,
                            isExisting: true
                        }));
                        setRecurringInspections(loadedInspections);
                        console.log('✅ Loaded recurring inspections:', loadedInspections.length);
                    }


                    // Load notes
                    if (trailer.notesArray && Array.isArray(trailer.notesArray)) {
                        const loadedNotes = trailer.notesArray.map((note: any) => ({
                            id: note._id || Date.now().toString(),
                            note: note.note || '',
                            category: note.category || ''
                        }));
                        setNotes(loadedNotes);
                        console.log('✅ Loaded notes:', loadedNotes.length);
                    }

                }
            } catch (error) {
                console.error('❌ Error loading trailer for edit:', error);
            }
        };

        loadTrailerForEdit();
    }, [editingId]);

    // Inspection handlers
    const handleEditInspection = (inspection: any, type: 'oneTime' | 'recurring') => {
        setEditingInspectionId(inspection.id);
        setEditingInspectionType(type);

        if (type === 'oneTime') {
            setInspectionType('One Time');
            setInspectionForm({
                expiryDate: inspection.expiryDate,
                description: inspection.description,
                ignoreExpiration: inspection.ignoreExpiration,
                scheduledOn: '',
                after: '',
                unit: '',
                file: inspection.file || null
            });
        } else {
            setInspectionType('Recurring');
            setInspectionForm({
                expiryDate: '',
                description: inspection.description,
                ignoreExpiration: inspection.ignoreExpiration,
                scheduledOn: inspection.scheduledOn,
                after: inspection.after,
                unit: inspection.unit,
                file: inspection.file || null
            });
        }
    };

    const handleDeleteInspection = (id: string, type: 'oneTime' | 'recurring') => {
        if (type === 'oneTime') {
            setOneTimeInspections(oneTimeInspections.filter(insp => insp.id !== id));
        } else {
            setRecurringInspections(recurringInspections.filter(insp => insp.id !== id));
        }
        if (editingInspectionId === id) {
            setEditingInspectionId(null);
            setEditingInspectionType(null);
            setInspectionForm({
                expiryDate: '',
                description: '',
                ignoreExpiration: false,
                scheduledOn: '',
                after: '',
                unit: '',
                file: null
            });
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const handleCancelEditInspection = () => {
        setEditingInspectionId(null);
        setEditingInspectionType(null);
        setInspectionForm({
            expiryDate: '',
            description: '',
            ignoreExpiration: false,
            scheduledOn: '',
            after: '',
            unit: '',
            file: null
        });
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    // Document handlers
    const handleEditDocument = (doc: any) => {
        setEditingDocumentId(doc.id);
        setDocumentForm({
            title: doc.title || '',
            expiryDate: doc.expiryDate || '',
            description: doc.description || '',
            file: doc.file || null,
            ignoreExpiration: doc.ignoreExpiration || false
        });
    };

    const handleSaveDocument = () => {
        if (!documentForm.description && !documentForm.title && !documentForm.file) {
            alert('Please enter a title, description, or attach a file');
            return;
        }

        if (editingDocumentId) {
            setDocuments(prev =>
                prev.map(doc =>
                    doc.id === editingDocumentId
                        ? {
                            ...doc,
                            title: documentForm.title,
                            expiryDate: documentForm.expiryDate,
                            description: documentForm.description,
                            ignoreExpiration: documentForm.ignoreExpiration,
                            file: documentForm.file || doc.file,
                            fileName: documentForm.file?.name || doc.fileName
                        }
                        : doc
                )
            );
            setEditingDocumentId(null);
        } else {
            const newDoc = {
                id: Date.now().toString(),
                title: documentForm.title,
                expiryDate: documentForm.expiryDate,
                description: documentForm.description,
                file: documentForm.file,
                fileName: documentForm.file?.name,
                ignoreExpiration: documentForm.ignoreExpiration,
                isExisting: false
            };
            setDocuments(prev => [...prev, newDoc]);
        }

        setDocumentForm({ title: '', expiryDate: '', description: '', file: null, ignoreExpiration: false });
        if (documentFileInputRef.current) {
            documentFileInputRef.current.value = '';
        }
    };

    const handleDeleteDocument = (docId: string) => {
        setDocuments(prev => prev.filter(doc => doc.id !== docId));
        if (editingDocumentId === docId) {
            setEditingDocumentId(null);
            setDocumentForm({ title: '', expiryDate: '', description: '', file: null, ignoreExpiration: false });
            if (documentFileInputRef.current) {
                documentFileInputRef.current.value = '';
            }
        }
    };

    const handleCancelEditDocument = () => {
        setEditingDocumentId(null);
        setDocumentForm({ title: '', expiryDate: '', description: '', file: null, ignoreExpiration: false });
        if (documentFileInputRef.current) {
            documentFileInputRef.current.value = '';
        }
    };



    // Handle create/update trailer
    // Validate required fields
    const validateTrailerForm = (): boolean => {
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

    const handleSaveTrailer = async () => {
        // Validate before saving
        if (!validateTrailerForm()) {
            return;
        }

        setLoading(true);
        try {
            const formDataToSend = new FormData();

            if (editingId && originalTrailerData) {
                // Partial update - only send changed fields
                if (formData.unitNumber !== originalTrailerData.unitNumber) {
                    formDataToSend.append('unitNumber', formData.unitNumber);
                    formDataToSend.append('trailer', formData.unitNumber);
                }
                if (formData.vinNumber !== originalTrailerData.vinNumber) {
                    formDataToSend.append('vinNumber', formData.vinNumber);
                }
                if (formData.plateNumber !== originalTrailerData.plateNumber) {
                    formDataToSend.append('plateNumber', formData.plateNumber);
                }
                if (formData.make !== originalTrailerData.make) {
                    formDataToSend.append('make', formData.make || '');
                }
                if (formData.model !== originalTrailerData.model) {
                    formDataToSend.append('model', formData.model || '');
                }
                if (formData.year !== originalTrailerData.year) {
                    formDataToSend.append('year', formData.year || '');
                }
                if (formData.weight !== originalTrailerData.weight) {
                    formDataToSend.append('weight', formData.weight || '0');
                }
                if (formData.uom !== originalTrailerData.uom) {
                    formDataToSend.append('uom', formData.uom || 'Kg');
                }
                if (formData.registrationCountry !== originalTrailerData.registrationCountry) {
                    formDataToSend.append('registrationCountry', formData.registrationCountry || '');
                }
                if (formData.registrationProvince !== originalTrailerData.registrationProvince) {
                    formDataToSend.append('registrationProvince', formData.registrationProvince || '');
                }
                if (formData.type !== originalTrailerData.type) {
                    formDataToSend.append('type', formData.type || '');
                }
                if (formData.status !== originalTrailerData.status) {
                    formDataToSend.append('status', formData.status || 'In Service');
                    formDataToSend.append('operationStatus', formData.status === 'In Service' ? 'IN SERVICE' : formData.status === 'Out of Service' ? 'OUT OF SERVICE' : 'MAINTENANCE');
                }
                if (formData.ownership !== originalTrailerData.ownership) {
                    formDataToSend.append('ownership', formData.ownership || 'COMPANY ASSET');
                }
                if (formData.subType !== originalTrailerData.subType) {
                    formDataToSend.append('subType', formData.subType || '');
                }
                if (formData.yard !== originalTrailerData.yard) {
                    formDataToSend.append('yard', formData.yard || '');
                }

                if (selectedImageFile) {
                    formDataToSend.append('image', selectedImageFile);
                }
            } else {
                // Create new trailer - send all fields
                formDataToSend.append('unitNumber', formData.unitNumber);
                formDataToSend.append('trailer', formData.unitNumber);
                formDataToSend.append('vinNumber', formData.vinNumber);
                formDataToSend.append('plateNumber', formData.plateNumber);
                formDataToSend.append('make', formData.make || '');
                formDataToSend.append('model', formData.model || '');
                formDataToSend.append('year', formData.year || '');
                formDataToSend.append('weight', formData.weight || '0');
                formDataToSend.append('uom', formData.uom || 'Kg');
                formDataToSend.append('registrationCountry', formData.registrationCountry || '');
                formDataToSend.append('registrationProvince', formData.registrationProvince || '');
                formDataToSend.append('type', formData.type || '');
                formDataToSend.append('status', formData.status || 'In Service');
                formDataToSend.append('ownership', formData.ownership || 'COMPANY ASSET');
                formDataToSend.append('subType', formData.subType || '');
                formDataToSend.append('yard', formData.yard || '');
                formDataToSend.append('operationStatus', formData.status === 'In Service' ? 'IN SERVICE' : formData.status === 'Out of Service' ? 'OUT OF SERVICE' : 'MAINTENANCE');

                if (selectedImageFile) {
                    formDataToSend.append('image', selectedImageFile);
                }
            }

            // Append inspection files and data
            console.log('📋 [FRONTEND] Preparing inspections for save:', {
                oneTimeInspections: oneTimeInspections.length,
                recurringInspections: recurringInspections.length
            });

            // Process one-time inspections
            oneTimeInspections.forEach((inspection, index) => {
                if (inspection.file && inspection.file instanceof File) {
                    console.log(`📎 [FRONTEND] Appending oneTimeInspectionFile ${index}:`, inspection.file.name);
                    formDataToSend.append('oneTimeInspectionFiles', inspection.file);
                }
            });

            // Process recurring inspections
            recurringInspections.forEach((inspection, index) => {
                if (inspection.file && inspection.file instanceof File) {
                    console.log(`📎 [FRONTEND] Appending recurringInspectionFile ${index}:`, inspection.file.name);
                    formDataToSend.append('recurringInspectionFiles', inspection.file);
                }
            });

            // Append inspection metadata (without File objects)
            const oneTimeInspectionsData = oneTimeInspections.map((insp) => ({
                expiryDate: insp.expiryDate,
                description: insp.description,
                ignoreExpiration: insp.ignoreExpiration,
                fileName: insp.fileName,
                fileUrl: insp.fileUrl,
                hasFile: insp.file instanceof File ? true : false
            }));

            const recurringInspectionsData = recurringInspections.map((insp) => ({
                scheduledOn: insp.scheduledOn,
                after: insp.after,
                unit: insp.unit,
                description: insp.description,
                ignoreExpiration: insp.ignoreExpiration,
                fileName: insp.fileName,
                fileUrl: insp.fileUrl,
                hasFile: insp.file instanceof File ? true : false
            }));

            formDataToSend.append('oneTimeInspections', JSON.stringify(oneTimeInspectionsData));
            formDataToSend.append('recurringInspections', JSON.stringify(recurringInspectionsData));

            // Append notes
            const notesData = notes.map((note) => ({
                note: note.note,
                category: note.category
            }));
            formDataToSend.append('notesArray', JSON.stringify(notesData));

            console.log('📦 [FRONTEND] Sending to backend:', {
                oneTimeInspections: oneTimeInspectionsData,
                recurringInspections: recurringInspectionsData,
                notes: notesData
            });

            let response;
            if (editingId) {
                response = await updateTrailer(editingId, formDataToSend);
            } else {
                response = await createTrailer(formDataToSend);
            }

            if (response?.success) {
                // Get trailer ID - handle both create and update scenarios
                let trailerId = editingId;
                if (!trailerId) {
                    // For new trailers, get ID from response
                    trailerId = response.data?._id || response.data?._id || response.data?.id;
                }

                console.log('💾 Saving trailer, ID:', trailerId);

                // Save documents if trailer was created/updated successfully (single list, no tabs)
                if (trailerId) {
                    const newDocs = documents.filter((doc) => !doc.isExisting && (doc.file || doc.description || doc.title));
                    const existingDocs = documents.filter((doc) => doc.isExisting && doc._id);

                    if (newDocs.length > 0) {
                        try {
                            await Promise.all(newDocs.map(async (doc) => {
                                const docFormData = new FormData();
                                docFormData.append('trailerId', trailerId.toString());
                                docFormData.append('assetType', 'trailer');
                                docFormData.append('documentType', 'General');
                                docFormData.append('documentNumber', doc.description || '');
                                if (doc.title) docFormData.append('title', doc.title);
                                if (doc.expiryDate) docFormData.append('expiryDate', doc.expiryDate);
                                if (doc.file) docFormData.append('file', doc.file);
                                const docResponse = await createVehicleDocument(docFormData);
                                if (!docResponse?.success) console.error('❌ Error creating document:', docResponse);
                            }));
                        } catch (docError) {
                            console.error('❌ Error creating documents:', docError);
                        }
                    }

                    if (existingDocs.length > 0) {
                        try {
                            await Promise.all(existingDocs.map(async (doc) => {
                                const docFormData = new FormData();
                                docFormData.append('trailerId', trailerId.toString());
                                docFormData.append('assetType', 'trailer');
                                docFormData.append('documentType', 'General');
                                docFormData.append('documentNumber', doc.description || '');
                                if (doc.title) docFormData.append('title', doc.title);
                                if (doc.expiryDate) docFormData.append('expiryDate', doc.expiryDate);
                                else docFormData.append('expiryDate', '');
                                if (doc.file && doc.file instanceof File) docFormData.append('file', doc.file);
                                const docResponse = await updateVehicleDocument(doc._id!, docFormData);
                                if (!docResponse?.success) console.error('❌ Error updating document:', docResponse);
                            }));
                        } catch (docError) {
                            console.error('❌ Error updating documents:', docError);
                        }
                    }
                }

                setShowSidebar(false);
                setEditingId(null);
                setFormData({
                    unitNumber: '',
                    vinNumber: '',
                    plateNumber: '',
                    make: '',
                    model: '',
                    year: '',
                    weight: '0',
                    registrationCountry: '',
                    registrationProvince: '',
                    type: '',
                    uom: 'Kg',
                    status: 'In Service',
                    ownership: 'COMPANY ASSET',
                    subType: '',
                    yard: ''
                });
                setSelectedImage(null);
                setSelectedImageFile(null);
                setOriginalTrailerData(null);
                setDocuments([]);
                // Clear inspection state
                setOneTimeInspections([]);
                setRecurringInspections([]);
                setInspectionForm({
                    expiryDate: '',
                    description: '',
                    ignoreExpiration: false,
                    scheduledOn: '',
                    after: '',
                    unit: '',
                    file: null
                });
                setEditingInspectionId(null);
                setEditingInspectionType(null);
                setEditingDocumentId(null);
                setEditingNoteId(null);
                // Refresh trailers list with current filter (same logic as fetchTrailers)
                let yardFilter: string | undefined = undefined;
                let ownershipFilter: string | undefined = undefined;
                if (activeTab === 'All') {
                    // No filters
                } else if (activeTab === 'External') {
                    ownershipFilter = 'THIRD PARTY ASSET';
                } else if (activeTab === 'Unassigned') {
                    // No filters, will filter on frontend
                } else {
                    // Yard filter - activeTab is a yard ID
                    yardFilter = activeTab;
                }
                const trailersResponse = await getAllTrailers(1, 1000, undefined, undefined, undefined, undefined, yardFilter, ownershipFilter);
                if (trailersResponse?.success && trailersResponse?.data) {
                    const transformedTrailers = trailersResponse.data.map((trailer: any) => ({
                        _id: trailer._id,
                        id: trailer._id,
                        trailerNumber: trailer.trailer || trailer.unitNumber || '',
                        trailer: trailer.trailer || trailer.unitNumber || '',
                        unitNumber: trailer.unitNumber || trailer.trailer || '',
                        plateNumber: trailer.plateNumber || '',
                        type: trailer.type || '',
                        ownership: trailer.ownership || trailer.ownerShip || 'COMPANY ASSET',
                        lastDispatch: trailer.lastDispatch || '',
                        lastDispatchDate: trailer.lastDispatchDate ? new Date(trailer.lastDispatchDate).toLocaleDateString() : '',
                        lastDropLocation: trailer.lastDropLocation || '',
                        notes: trailer.notes || trailer.note || '',
                        operatingStatus: trailer.operationStatus || 'IN SERVICE',
                        loadedStatus: trailer.loadedStatus || 'IDLE',
                        compliance: trailer.compliance || 'NON-COMPLIANT',
                        category: trailer.category,
                        imageUrl: trailer.imageUrl || trailer.trailerImageUrl,
                        yard: trailer.yard || null
                    }));
                    setTrailers(transformedTrailers);
                    // Refresh count for current tab and All tab
                    setFetchedCounts(prev => {
                        const updated = new Set(prev);
                        updated.delete(activeTab);
                        updated.delete('All');
                        return updated;
                    });
                    fetchTabCount('All');
                    if (activeTab !== 'All') {
                        fetchTabCount(activeTab);
                    }
                }
            } else {
                alert(response?.message || 'Failed to save trailer. Please try again.');
            }
        } catch (error) {
            console.error('Error saving trailer:', error);
            alert('Failed to save trailer. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // Handle delete click - show confirmation modal
    const handleDeleteClick = (id: string) => {
        setDeleteTargetId(id);
        setShowDeleteConfirmation(true);
    };

    // Handle delete trailer after confirmation
    const handleDeleteTrailer = async () => {
        if (!deleteTargetId) return;

        setShowDeleteConfirmation(false);
        setLoading(true);
        try {
            const response = await deleteTrailer(deleteTargetId);
            if (response?.success) {
                setTrailers(trailers.filter(t => (t._id || t.id) !== deleteTargetId));
                // Refresh count for current tab and All tab
                setFetchedCounts(prev => {
                    const updated = new Set(prev);
                    updated.delete(activeTab);
                    updated.delete('All');
                    return updated;
                });
                fetchTabCount('All');
                if (activeTab !== 'All') {
                    fetchTabCount(activeTab);
                }
            } else {
                alert(response?.message || 'Failed to delete trailer. Please try again.');
            }
        } catch (error) {
            console.error('Error deleting trailer:', error);
            alert('Failed to delete trailer. Please try again.');
        } finally {
            setLoading(false);
            setDeleteTargetId(null);
        }
    };

    // Handle edit trailer
    const handleEditTrailer = async (id: string) => {
        setLoading(true);
        try {
            const response = await getTrailerById(id);
            if (response?.success && response?.data) {
                const trailer = response.data;
                const trailerFormData = {
                    unitNumber: trailer.unitNumber || trailer.trailer || '',
                    vinNumber: trailer.vinNumber || '',
                    plateNumber: trailer.plateNumber || '',
                    make: trailer.make || '',
                    model: trailer.model || '',
                    year: trailer.year || '',
                    weight: trailer.weight || '0',
                    registrationCountry: trailer.registrationCountry || '',
                    registrationProvince: trailer.registrationProvince || '',
                    type: trailer.type || '',
                    uom: trailer.uom || 'Kg',
                    status: trailer.status || 'In Service',
                    ownership: trailer.ownership || trailer.ownerShip || 'COMPANY ASSET',
                    subType: trailer.subType || '',
                    yard: trailer.yard || ''
                };

                setFormData(trailerFormData);
                // Store original data for partial updates
                setOriginalTrailerData(trailerFormData);
                // Use signed URL from backend
                setSelectedImage(trailer.imageUrl || trailer.trailerImageUrl || null);
                // Reset selectedImageFile when loading existing trailer (so we only upload if user selects new image)
                setSelectedImageFile(null);
                setEditingId(id);

                // Load documents from trailer response (documents are now included in getTrailerById)
                try {
                    const trailerDocuments = trailer.documents || [];
                    console.log('📥 Documents from trailer response:', trailerDocuments.length);

                    if (Array.isArray(trailerDocuments) && trailerDocuments.length > 0) {
                        const flatDocs = trailerDocuments.map((doc: any) => {
                            const fileUrl = doc.files?.[0]?.fileUrl || doc.documentLocation || null;
                            const fileName = doc.files?.[0]?.fileName || 'Document';
                            return {
                                id: doc._id || `existing-${doc._id}`,
                                _id: doc._id,
                                title: doc.title || doc.documentType || doc.documentNumber || '',
                                expiryDate: doc.expiryDate ? new Date(doc.expiryDate).toISOString().split('T')[0] : '',
                                description: doc.documentNumber || doc.documentType || doc.description || '',
                                file: null,
                                fileUrl,
                                fileName,
                                ignoreExpiration: doc.ignoreExpiration || false,
                                isExisting: true
                            };
                        });
                        console.log('📋 Loaded documents (flat list):', flatDocs.length);
                        setDocuments(flatDocs);
                    } else {
                        console.log('⚠️ No documents found in trailer response');
                        setDocuments([]);
                    }
                } catch (docError) {
                    console.error('❌ Error loading documents:', docError);
                    setDocuments([]);
                }

                // Load inspections from trailer response
                console.log('📋 [FRONTEND] Loading inspections from trailer:', {
                    oneTimeInspections: trailer.oneTimeInspections?.length || 0,
                    recurringInspections: trailer.recurringInspections?.length || 0
                });

                if (trailer.oneTimeInspections && Array.isArray(trailer.oneTimeInspections)) {
                    const loadedOneTimeInspections = trailer.oneTimeInspections.map((insp: any) => ({
                        id: insp._id || Date.now().toString(),
                        expiryDate: insp.expiryDate ? new Date(insp.expiryDate).toISOString().split('T')[0] : '',
                        description: insp.description || '',
                        ignoreExpiration: insp.ignoreExpiration || false,
                        file: null,
                        fileUrl: insp.fileUrl || null,
                        fileName: insp.fileName || null,
                        isExisting: true
                    }));
                    setOneTimeInspections(loadedOneTimeInspections);
                    console.log('✅ Loaded one-time inspections:', loadedOneTimeInspections);
                } else {
                    setOneTimeInspections([]);
                }

                if (trailer.recurringInspections && Array.isArray(trailer.recurringInspections)) {
                    const loadedRecurringInspections = trailer.recurringInspections.map((insp: any) => ({
                        id: insp._id || Date.now().toString(),
                        scheduledOn: insp.scheduledOn ? new Date(insp.scheduledOn).toISOString().split('T')[0] : '',
                        after: insp.after || '',
                        unit: insp.unit || '',
                        description: insp.description || '',
                        ignoreExpiration: insp.ignoreExpiration || false,
                        file: null,
                        fileUrl: insp.fileUrl || null,
                        fileName: insp.fileName || null,
                        isExisting: true
                    }));
                    setRecurringInspections(loadedRecurringInspections);
                    console.log('✅ Loaded recurring inspections:', loadedRecurringInspections);
                } else {
                    setRecurringInspections([]);
                }

                setShowSidebar(true);
                setActiveStep('Details');
            } else {
                alert('Failed to load trailer data. Please try again.');
            }
        } catch (error) {
            console.error('Error loading trailer:', error);
            alert('Failed to load trailer data. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // Get filtered trailers
    const getFilteredTrailers = () => {
        let filtered = [...trailers];

        // Backend already handles yard and ownership filtering
        // Only apply client-side filtering for Unassigned
        if (activeTab === 'Unassigned') {
            // Filter trailers that are not assigned to any active order
            filtered = filtered.filter(trailer => !assignedTrailerIds.has(trailer._id || trailer.id || ''));
        }

        // Filter by search term (Unit #, Plate #, Make, VIN)
        if (searchTerm) {
            filtered = filtered.filter(trailer =>
                (trailer.trailerNumber || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (trailer.plateNumber || '').toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        // Filter by compliance status
        if (complianceStatus !== 'All') {
            filtered = filtered.filter(trailer => {
                if (complianceStatus === 'Compliant') return trailer.compliance === 'COMPLIANT';
                if (complianceStatus === 'Non-Compliant') return trailer.compliance === 'NON-COMPLIANT';
                if (complianceStatus === 'Expiring Soon') return trailer.compliance === 'EXPIRING SOON';
                return true;
            });
        }

        // Filter by operating status
        if (operatingStatus !== 'Active' && operatingStatus !== 'All') {
            filtered = filtered.filter(trailer => {
                if (operatingStatus === 'In Service') return trailer.operatingStatus === 'IN SERVICE';
                if (operatingStatus === 'Out of Service') return trailer.operatingStatus === 'OUT OF SERVICE';
                if (operatingStatus === 'Maintenance') return trailer.operatingStatus === 'MAINTENANCE';
                return true;
            });
        } else if (operatingStatus === 'Active') {
            filtered = filtered.filter(trailer => trailer.operatingStatus === 'IN SERVICE');
        }

        // Apply column filters
        if (filters.trailerNumber) {
            filtered = filtered.filter(t => (t.trailerNumber || '').toLowerCase().includes(filters.trailerNumber.toLowerCase()));
        }
        if (filters.plateNumber) {
            filtered = filtered.filter(t => (t.plateNumber || '').toLowerCase().includes(filters.plateNumber.toLowerCase()));
        }
        if (filters.type) {
            filtered = filtered.filter(t => (t.type || '').toLowerCase().includes(filters.type.toLowerCase()));
        }
        if (filters.ownership !== 'All') {
            filtered = filtered.filter(t => t.ownership === filters.ownership);
        }
        if (filters.lastDispatch) {
            filtered = filtered.filter(t => (t.lastDispatch || '').toLowerCase().includes(filters.lastDispatch.toLowerCase()));
        }
        if (filters.lastDispatchDate) {
            filtered = filtered.filter(t => {
                const dateStr = typeof t.lastDispatchDate === 'string' ? t.lastDispatchDate : (t.lastDispatchDate ? t.lastDispatchDate.toString() : '');
                return dateStr.toLowerCase().includes(filters.lastDispatchDate.toLowerCase());
            });
        }
        if (filters.lastDropLocation) {
            filtered = filtered.filter(t => (t.lastDropLocation || '').toLowerCase().includes(filters.lastDropLocation.toLowerCase()));
        }
        if (filters.notes) {
            filtered = filtered.filter(t => (t.notes || '').toLowerCase().includes(filters.notes.toLowerCase()));
        }
        if (filters.operatingStatus !== 'All') {
            filtered = filtered.filter(t => t.operatingStatus === filters.operatingStatus);
        }
        if (filters.loadedStatus !== 'All') {
            filtered = filtered.filter(t => t.loadedStatus === filters.loadedStatus);
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

    const filteredTrailers = getFilteredTrailers();

    const handleExportTrailers = async () => {
        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'Logistiq Innovation';
        workbook.created = new Date();
        const sheet = workbook.addWorksheet('Trailers', { views: [{ state: 'frozen', ySplit: 1 }] });

        sheet.columns = [
            { header: 'Unit Number', key: 'unitNumber', width: 16 },
            { header: 'Plate Number', key: 'plateNumber', width: 16 },
            { header: 'VIN Number', key: 'vinNumber', width: 22 },
            { header: 'Type', key: 'type', width: 16 },
            { header: 'Make', key: 'make', width: 14 },
            { header: 'Model', key: 'model', width: 14 },
            { header: 'Year', key: 'year', width: 10 },
            { header: 'Ownership', key: 'ownership', width: 20 },
            { header: 'Operating Status', key: 'operatingStatus', width: 18 },
            { header: 'Loaded Status', key: 'loadedStatus', width: 16 },
            { header: 'Compliance', key: 'compliance', width: 18 },
            { header: 'Category', key: 'category', width: 14 },
            { header: 'Reg. Country', key: 'registrationCountry', width: 16 },
            { header: 'Reg. Province', key: 'registrationProvince', width: 16 },
            { header: 'Last Drop Location', key: 'lastDropLocation', width: 24 },
            { header: 'Notes', key: 'notes', width: 30 },
        ];

        const headerRow = sheet.getRow(1);
        headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
        headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF42AEEC' } };
        headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
        headerRow.height = 22;

        filteredTrailers.forEach((t: any) => {
            const row = sheet.addRow({
                unitNumber: t.unitNumber || t.trailerNumber || t.trailer || '',
                plateNumber: t.plateNumber || '',
                vinNumber: t.vinNumber || '',
                type: t.type || '',
                make: t.make || '',
                model: t.model || '',
                year: t.year || '',
                ownership: t.ownership || '',
                operatingStatus: t.operatingStatus || '',
                loadedStatus: t.loadedStatus || '',
                compliance: t.compliance || '',
                category: t.category || '',
                registrationCountry: t.registrationCountry || '',
                registrationProvince: t.registrationProvince || '',
                lastDropLocation: t.lastDropLocation || '',
                notes: t.notes || t.note || '',
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
        a.download = `Trailers-${new Date().toISOString().split('T')[0]}.xlsx`;
        document.body.appendChild(a);
        a.click();
        URL.revokeObjectURL(url);
        document.body.removeChild(a);
    };

    // Count trailers by category
    const getCountByCategory = (category: string) => {
        // For yard tabs, use the yardCounts
        if (yardCounts[category] !== undefined) {
            return yardCounts[category];
        }
        // For legacy category tabs (MB, AB, TX, etc.)
        if (category === 'All') return trailers.length;
        return trailers.filter(t => t.category === category).length;
    };

    const handleSort = (key: keyof Trailer) => {
        setSortConfig(current => ({
            key,
            direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
        }));
    };

    const getSortIcon = (key: keyof Trailer) => {
        if (sortConfig.key !== key) {
            return (
                <div className="flex flex-col">
                    <ChevronUp className="w-3 h-3 text-secondary" />
                    <ChevronDown className="w-3 h-3 text-secondary -mt-1" />
                </div>
            );
        }
        return sortConfig.direction === 'asc' ? (
            <ChevronUp className="w-3 h-3 text-headings" />
        ) : (
            <ChevronDown className="w-3 h-3 text-headings" />
        );
    };

    const getStatusBadgeColor = (status: string, type: 'operating' | 'loaded' | 'compliance') => {
        if (type === 'operating') {
            if (status === 'IN SERVICE') return 'bg-green-500 text-white';
            if (status === 'OUT OF SERVICE') return 'bg-red-500 text-white';
            if (status === 'MAINTENANCE') return 'bg-yellow-500 text-white';
        }
        if (type === 'loaded') {
            if (status === 'LOADED') return 'bg-green-500 text-white';
            if (status === 'IDLE') return 'bg-gray-500 text-white';
            if (status === 'SCHEDULED') return 'bg-orange-500 text-white';
        }
        if (type === 'compliance') {
            if (status === 'COMPLIANT') return 'bg-green-500 text-white';
            if (status === 'NON-COMPLIANT') return 'bg-red-500 text-white';
            if (status === 'EXPIRING SOON') return 'bg-yellow-500 text-white';
        }
        return 'bg-gray-500 text-white';
    };

    // Navigation helper functions for sidebar steps
    const steps: Array<'Details' | 'Inspections' | 'Documents' | 'Notes'> = ['Details', 'Inspections', 'Documents', 'Notes'];

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
            setActiveStep(next);
        }
    };

    const handlePrevious = () => {
        const previous = getPreviousStep();
        if (previous) {
            setActiveStep(previous);
        }
    };

    return (
        <div className="min-h-screen bg-main p-6  ">
            <div className="max-w-full mx-auto">
                {/* Header Section */}
                <div className="mb-6">
                    <div className="flex items-center justify-between mb-4">
                        <h1 className="text-3xl font-bold text-headings">Trailers</h1>
                        <div className="flex items-center gap-3">
                            <span className="text-2xl font-bold text-headings">({filteredTrailers.length})</span>
                            <button
                                onClick={handleExportTrailers}
                                title="Export to Excel"
                                className="w-10 h-10 bg-green-600 !text-white rounded-lg flex items-center justify-center hover:bg-green-700 transition-colors shadow-md"
                            >
                                <FileDown className="w-5 h-5" />
                            </button>
                            <button
                                onClick={() => {
                                    setEditingId(null);
                                    setOriginalTrailerData(null);
                                    setFormData({
                                        unitNumber: '',
                                        vinNumber: '',
                                        plateNumber: '',
                                        make: '',
                                        model: '',
                                        year: '',
                                        weight: '0',
                                        registrationCountry: '',
                                        registrationProvince: '',
                                        type: '',
                                        uom: 'Kg',
                                        status: 'In Service',
                                        ownership: 'COMPANY ASSET',
                                        subType: '',
                                        yard: ''
                                    });
                                    setSelectedImage(null);
                                    setSelectedImageFile(null);
                                    setDocuments([]);
                                    setOneTimeInspections([]);
                                    setRecurringInspections([]);
                                    setNotes([]);
                                    setInspectionForm({ expiryDate: '', description: '', ignoreExpiration: false, scheduledOn: '', after: '', unit: '', file: null });
                                    setEditingInspectionId(null);
                                    setEditingInspectionType(null);
                                    setDocumentForm({ title: '', expiryDate: '', description: '', file: null, ignoreExpiration: false });
                                    setEditingDocumentId(null);
                                    setNoteForm({ note: '', category: 'Category' });
                                    setEditingNoteId(null);
                                    setShowSidebar(true);
                                    setActiveStep('Details');
                                }}
                                className="w-10 h-10 bg-[var(--accent-navyblue)] !text-white rounded-lg flex items-center justify-center hover:bg-[var(--accent-blue)] transition-colors shadow-md"
                            >
                                <Plus className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Navigation Tabs */}
                <div className="mb-6 bg-card rounded-lg shadow-sm border border-theme overflow-hidden b">
                    <div className="flex border-b border-theme overflow-x-auto">
                        {/* All Tab */}
                        <button
                            onClick={() => {
                                setActiveTab('All');
                                fetchTabCount('All');
                            }}
                            className={`flex-shrink-0 px-6 py-4 text-center font-medium transition-colors relative ${activeTab === 'All'
                                ? 'text-[var(--accent-blue)] border-b-2 border-[var(--accent-blue)]'
                                : 'text-secondary hover:bg-[rgba(255,255,255,0.03)]'
                                }`}
                        >
                            <div className="font-semibold">
                                All ({getCountByCategory('All')})
                            </div>
                        </button>

                        {/* Dynamic Yard Tabs */}
                        {yards
                            .filter(yard => yard.status === 'active')
                            .map((yard) => (
                                <button
                                    key={yard._id}
                                    onClick={() => {
                                        setActiveTab(yard._id!);
                                        fetchTabCount(yard._id!);
                                    }}
                                    className={`flex-shrink-0 px-6 py-4 text-center font-medium transition-colors relative ${activeTab === yard._id
                                        ? 'text-headings border-b-2 border-[var(--accent-blue)]'
                                        : 'text-secondary hover:bg-[rgba(255,255,255,0.03)]'
                                        }`}
                                >
                                    <div>
                                        <div className="font-semibold">
                                            {yard.yardName} ({getCountByCategory(yard._id!)})
                                        </div>
                                        <div className="text-xs text-secondary mt-1">
                                            {yard.yardCode}
                                        </div>
                                    </div>
                                </button>
                            ))}

                        {/* External Tab */}
                        <button
                            onClick={() => {
                                setActiveTab('External');
                                fetchTabCount('External');
                            }}
                            className={`flex-shrink-0 px-6 py-4 text-center font-medium transition-colors relative ${activeTab === 'External'
                                ? 'text-[var(--accent-blue)] border-b-2 border-[var(--accent-blue)]'
                                : 'text-secondary hover:bg-[rgba(255,255,255,0.03)]'
                                }`}
                        >
                            <div className="font-semibold">
                                External ({getCountByCategory('External')})
                            </div>
                        </button>

                        {/* Unassigned Tab */}
                        <button
                            onClick={() => {
                                setActiveTab('Unassigned');
                                fetchTabCount('Unassigned');
                            }}
                            className={`flex-shrink-0 px-6 py-4 text-center font-medium transition-colors relative ${activeTab === 'Unassigned'
                                ? 'text-[var(--accent-blue)] border-b-2 border-[var(--accent-blue)]'
                                : 'text-secondary hover:bg-[rgba(255,255,255,0.03)]'
                                }`}
                        >
                            <div className="font-semibold">
                                Unassigned ({getCountByCategory('Unassigned')})
                            </div>
                        </button>
                    </div>
                </div>

                {/* Search and Filter Bar */}
                <div className="mb-6 bg-card rounded-lg shadow-sm border border-theme p-4">
                    <div className="flex flex-wrap items-center gap-4">
                        {/* Search Input */}
                        <div className="flex items-center gap-2 flex-1 min-w-[300px]">
                            <label className="text-sm font-medium text-headings whitespace-nowrap">Unit #, Plate #, Make, VIN:</label>
                            <input
                                type="text"
                                placeholder="Search..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="flex-1 px-4 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)] focus:border-transparent"
                            />

                        </div>

                        {/* Global Filters */}
                        <div className="flex items-center gap-2">
                            <label className="text-sm font-medium text-headings">Sort By:</label>
                            <select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value)}
                                                               className="px-3 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)] focus:border-transparent bg-card"
                            >
                                <option value="">Select</option>
                                <option value="trailerNumber">Trailer #</option>
                                <option value="plateNumber">Plate #</option>
                                <option value="lastDispatchDate">Last Dispatch Date</option>
                            </select>
                        </div>

                        <div className="flex items-center gap-2">
                            <label className="text-sm font-medium text-headings">Compliance Status:</label>
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
                            <label className="text-sm font-medium text-headings">Operating Status:</label>
                            <select
                                value={operatingStatus}
                                onChange={(e) => setOperatingStatus(e.target.value)}
                                className="px-3 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)] focus:border-transparent"
                            >
                                <option value="Active">Active</option>
                                <option value="All">All</option>
                                <option value="In Service">In Service</option>
                                <option value="Out of Service">Out of Service</option>
                                <option value="Maintenance">Maintenance</option>
                            </select>
                        </div>


                    </div>
                </div>

                {/* Data Table */}
                <div className="bg-card rounded-lg shadow-sm border border-theme overflow-hidden border-2">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-card border-b border-theme">
                                <tr>
                                    {/* Trailer # */}
                                    <th className="px-4 py-3 text-left text-xs font-medium text-headings uppercase">
                                        <div className="flex items-center gap-2">
                                            <span>Trailer #</span>
                                            <button onClick={() => handleSort('trailerNumber')} className="flex flex-col">
                                                {getSortIcon('trailerNumber')}
                                            </button>
                                        </div>
                                        <input
                                            type="text"
                                            placeholder="Filter..."
                                            value={filters.trailerNumber}
                                            onChange={(e) => setFilters({ ...filters, trailerNumber: e.target.value })}
                                            className="mt-2 w-full px-2 py-1 text-xs border border-theme rounded focus:outline-none focus:ring-1 focus:ring-[var(--accent-blue)]"
                                        />
                                    </th>

                                    {/* Plate # */}
                                    <th className="px-4 py-3 text-left text-xs font-medium text-headings uppercase">
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
                                            className="mt-2 w-full px-2 py-1 text-xs border border-theme rounded focus:outline-none focus:ring-1 focus:ring-[var(--accent-blue)]"
                                        />
                                    </th>

                                    {/* Type */}
                                    <th className="px-4 py-3 text-left text-xs font-medium text-headings uppercase">
                                        <div className="flex items-center gap-2">
                                            <span>Type</span>
                                            <button onClick={() => handleSort('type')} className="flex flex-col">
                                                {getSortIcon('type')}
                                            </button>
                                        </div>
                                        <input
                                            type="text"
                                            placeholder="Filter..."
                                            value={filters.type}
                                            onChange={(e) => setFilters({ ...filters, type: e.target.value })}
                                            className="mt-2 w-full px-2 py-1 text-xs border border-theme rounded focus:outline-none focus:ring-1 focus:ring-[var(--accent-blue)]"
                                        />
                                    </th>

                                    {/* Ownership */}
                                    <th className="px-4 py-3 text-left text-xs font-medium text-headings uppercase">
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
                                            <option value="LEASED">Leased</option>
                                        </select>
                                    </th>

                                    {/* Last Dispatch */}
                                    <th className="px-4 py-3 text-left text-xs font-medium text-headings uppercase">
                                        <div className="flex items-center gap-2">
                                            <span>Last Dispatch</span>
                                            <button onClick={() => handleSort('lastDispatch')} className="flex flex-col">
                                                {getSortIcon('lastDispatch')}
                                            </button>
                                        </div>
                                        <input
                                            type="text"
                                            placeholder="Filter..."
                                            value={filters.lastDispatch}
                                            onChange={(e) => setFilters({ ...filters, lastDispatch: e.target.value })}
                                            className="mt-2 w-full px-2 py-1 text-xs border border-theme rounded focus:outline-none focus:ring-1 focus:ring-[var(--accent-blue)]"
                                        />
                                    </th>

                                    {/* Last Dispatch Date */}
                                    <th className="px-4 py-3 text-left text-xs font-medium text-headings uppercase">
                                        <div className="flex items-center gap-2">
                                            <span>Last Dispatch Date</span>
                                            <button onClick={() => handleSort('lastDispatchDate')} className="flex flex-col">
                                                {getSortIcon('lastDispatchDate')}
                                            </button>
                                        </div>
                                        <input
                                            type="text"
                                            placeholder="Filter..."
                                            value={filters.lastDispatchDate}
                                            onChange={(e) => setFilters({ ...filters, lastDispatchDate: e.target.value })}
                                            className="mt-2 w-full px-2 py-1 text-xs border border-theme rounded focus:outline-none focus:ring-1 focus:ring-[var(--accent-blue)]"
                                        />
                                    </th>

                                    {/* Last Drop Location */}
                                    <th className="px-4 py-3 text-left text-xs font-medium text-headings uppercase">
                                        <div className="flex items-center gap-2">
                                            <span>Last Drop Location</span>
                                            <button onClick={() => handleSort('lastDropLocation')} className="flex flex-col">
                                                {getSortIcon('lastDropLocation')}
                                            </button>
                                        </div>
                                        <input
                                            type="text"
                                            placeholder="Filter..."
                                            value={filters.lastDropLocation}
                                            onChange={(e) => setFilters({ ...filters, lastDropLocation: e.target.value })}
                                            className="mt-2 w-full px-2 py-1 text-xs border border-theme rounded focus:outline-none focus:ring-1 focus:ring-[var(--accent-blue)]"
                                        />
                                    </th>

                                    {/* Notes */}
                                    <th className="px-4 py-3 text-left text-xs font-medium text-headings uppercase">
                                        <div className="flex items-center gap-2">
                                            <span>Notes</span>
                                        </div>
                                        <input
                                            type="text"
                                            placeholder="Filter..."
                                            value={filters.notes}
                                            onChange={(e) => setFilters({ ...filters, notes: e.target.value })}
                                            className="mt-2 w-full px-2 py-1 text-xs border border-theme rounded focus:outline-none focus:ring-1 focus:ring-[var(--accent-blue)]"
                                        />
                                    </th>

                                    {/* Operating Status */}
                                    <th className="px-4 py-3 text-left text-xs font-medium text-headings uppercase">
                                        <div className="flex items-center gap-2">
                                            <span>Operating Status</span>
                                            <button onClick={() => handleSort('operatingStatus')} className="flex flex-col">
                                                {getSortIcon('operatingStatus')}
                                            </button>
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

                                    {/* Loaded Status */}
                                    <th className="px-4 py-3 text-left text-xs font-medium text-headings uppercase">
                                        <div className="flex items-center gap-2">
                                            <span>Loaded Status</span>
                                            <HelpCircle className="w-4 h-4 text-secondary" />
                                        </div>
                                        <select
                                            value={filters.loadedStatus}
                                            onChange={(e) => setFilters({ ...filters, loadedStatus: e.target.value })}
                                            className="mt-2 w-full px-2 py-1 text-xs border border-theme rounded focus:outline-none focus:ring-1 focus:ring-[var(--accent-blue)] bg-card"
                                        >
                                            <option value="All">All</option>
                                            <option value="LOADED">Loaded</option>
                                            <option value="IDLE">Idle</option>
                                            <option value="SCHEDULED">Scheduled</option>
                                        </select>
                                    </th>

                                    {/* Compliance */}
                                    <th className="px-4 py-3 text-left text-xs font-medium text-headings uppercase">
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
                                    <th className="px-4 py-3 text-left text-xs font-medium text-headings uppercase">
                                        <span>Actions</span>
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-card divide-y divide-theme divide-white/5 ">
                                {filteredTrailers.length === 0 ? (
                                    <tr>
                                        <td colSpan={12} className="px-4 py-8 text-center text-secondary">
                                            No trailers found
                                        </td>
                                    </tr>
                                ) : (
                                    filteredTrailers.map((trailer) => (
                                        <tr
                                            onClick={() => handleEditTrailer(trailer._id || trailer.id || '')}
                                            key={trailer._id || trailer.id} className="hover:bg-[rgba(255,255,255,0.03)] transition-colors">
                                            <td className="px-4 py-3 text-sm text-secondary">{trailer.trailerNumber || trailer.trailer || trailer.unitNumber}</td>
                                            <td className="px-4 py-3 text-sm text-secondary">{trailer.plateNumber}</td>
                                            <td className="px-4 py-3 text-sm text-secondary">{trailer.type}</td>
                                            <td className="px-4 py-3 text-sm text-secondary">{trailer.ownership}</td>
                                            <td className="px-4 py-3 text-sm text-secondary">{trailer.lastDispatch || ''}</td>
                                            <td className="px-4 py-3 text-sm text-secondary">{typeof trailer.lastDispatchDate === 'string' ? trailer.lastDispatchDate : (trailer.lastDispatchDate ? trailer.lastDispatchDate.toString() : '')}</td>
                                            <td className="px-4 py-3 text-sm text-secondary">{trailer.lastDropLocation || ''}</td>
                                            <td className="px-4 py-3 text-sm text-secondary">
                                                {trailer.notes ? (
                                                    <div className="w-6 h-6 rounded-full bg-gray-300 flex items-center justify-center">
                                                        <span className="text-xs">!</span>
                                                    </div>
                                                ) : (
                                                    ''
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                {trailer.operatingStatus === 'IN SERVICE' ? (
                                                    <div className="inline-flex flex-col items-center px-2 py-1 bg-green-500 rounded-full">
                                                        <span className="text-[10px] font-bold text-white leading-tight">IN</span>
                                                        <span className="text-xs font-semibold text-white leading-tight">SERVICE</span>
                                                    </div>
                                                ) : (
                                                    <span className={`px-3 py-1 text-xs font-semibold rounded-full ${getStatusBadgeColor(trailer.operatingStatus || '', 'operating')}`}>
                                                        {trailer.operatingStatus}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`px-3 py-1 text-xs font-semibold rounded-full flex items-center gap-1 ${getStatusBadgeColor(trailer.loadedStatus || '', 'loaded')}`}>
                                                    {trailer.loadedStatus === 'SCHEDULED' && <Clock className="w-3 h-3" />}
                                                    {trailer.loadedStatus}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`px-3 py-1 text-xs font-semibold rounded-full ${getStatusBadgeColor(trailer.compliance || '', 'compliance')}`}>
                                                    {trailer.compliance}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleEditTrailer(trailer._id || trailer.id || ''); }}
                                                        className="p-1.5 text-[#00D1FF] hover:bg-[#00D1FF]/10 rounded-lg transition-colors"
                                                        title="Edit"
                                                    >
                                                        <Edit className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleDeleteClick(trailer._id || trailer.id || ''); }}
                                                        className="p-1.5 text-[#A855F7] hover:bg-[#A855F7]/10 rounded-lg transition-colors"
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

            {/* New Trailer Sidebar Modal */}
            {showSidebar && (
                <>
                    <div
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] transition-all duration-300"
                        onClick={() => setShowSidebar(false)}
                    />
                    <div className="fixed top-0 right-0 h-full w-full sm:w-[90vw] lg:w-[85vw] xl:w-[80vw] bg-card shadow-2xl z-[101] flex overflow-hidden">
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
                                        <img src={selectedImage} alt="Trailer" className="w-full h-20 object-cover rounded" />
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
                                    {(['Details', 'Inspections', 'Documents', 'Notes'] as const).map((step) => (
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
                                </nav>
                            </div>

                        </div>

                        {/* Main Content Area */}
                        <div className="flex-1 flex flex-col overflow-hidden">
                            {/* Header */}
                            <div className="flex items-center justify-between p-4 border-b border-theme bg-card">
                                <h2 className="text-xl font-bold text-headings">New Trailer</h2>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={handleSaveTrailer}
                                        disabled={loading}
                                        className="px-4 py-1.5 bg-gray-700 !text-white rounded-lg hover:bg-gray-800 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {loading ? 'SAVING...' : 'SAVE'}
                                    </button>
                                    <button
                                        onClick={() => setShowSidebar(false)}
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
                                        <h3 className="text-base font-semibold text-headings">Basic Information</h3>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="block text-sm font-medium text-headings mb-1">
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
                                                <label className="block text-sm font-medium text-headings mb-1">
                                                    VIN #<span className="text-red-500">*</span>
                                                </label>
                                                <input
                                                    type="text"
                                                    placeholder="VIN #"
                                                    value={formData.vinNumber}
                                                    onChange={(e) => setFormData({ ...formData, vinNumber: e.target.value })}
                                                    className="w-full px-3 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)]"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-headings mb-1">
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
                                                <label className="block text-sm font-medium text-headings mb-1">
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
                                                <label className="block text-sm font-medium text-headings mb-1">Registration Province/State</label>
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
                                                <label className="block text-sm font-medium text-headings mb-1">
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
                                                <label className="block text-sm font-medium text-headings mb-1">Model<span className="text-red-500">*</span></label>
                                                <input
                                                    type="text"
                                                    placeholder="Model"
                                                    value={formData.model}
                                                    onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                                                    className="w-full px-3 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)]"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-headings mb-1">
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
                                                <label className="block text-sm font-medium text-headings mb-1">
                                                    Type<span className="text-red-500">*</span>
                                                </label>
                                                <select
                                                    value={formData.type}
                                                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                                    className="w-full px-3 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)]"
                                                >
                                                    <option className="form-option" value="">Select Type</option>
                                                    <option className="form-option" value="RF">Reefer</option>
                                                    <option className="form-option" value="DV">Dry Van</option>
                                                    <option className="form-option" value="FB">Flatbed</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-headings mb-1">
                                                    Weight<span className="text-red-500">*</span>
                                                </label>
                                                <input
                                                    type="text"
                                                    placeholder="0"
                                                    value={formData.weight}
                                                    onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                                                    className="w-full px-3 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)]"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-headings mb-1">
                                                    UoM<span className="text-red-500">*</span>
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
                                                <label className="block text-sm font-medium text-headings mb-1">
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
                                        </div>

                                        <div className="mt-4">
                                            <h3 className="text-base font-semibold text-headings mb-2">
                                                Ownership Information
                                            </h3>

                                            <div className="flex gap-2">

                                                {/* Company Asset */}
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setFormData({
                                                            ...formData,
                                                            ownership: "COMPANY ASSET",
                                                            subType: "",
                                                        })
                                                    }
                                                    className={`px-6 py-2 rounded-lg font-medium transition-all duration-200 ${formData.ownership === "COMPANY ASSET"
                                                            ? "bg-[var(--accent-navyblue)] text-white shadow-md"
                                                            : "bg-[rgba(255,255,255,0.05)] text-primary border border-theme hover:bg-[rgba(0,209,255,0.08)]"
                                                        }`}
                                                >
                                                    COMPANY ASSET
                                                </button>

                                                {/* Third Party */}
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setFormData({
                                                            ...formData,
                                                            ownership: "THIRD PARTY ASSET",
                                                            subType: "",
                                                        })
                                                    }
                                                    className={`px-6 py-2 rounded-lg font-medium transition-all duration-200 ${formData.ownership === "THIRD PARTY ASSET"
                                                            ? "bg-[var(--accent-navyblue)] text-white shadow-md"
                                                            : "bg-[rgba(255,255,255,0.05)] text-primary border border-theme hover:bg-[rgba(0,209,255,0.08)]"
                                                        }`}
                                                >
                                                    THIRD PARTY ASSET
                                                </button>

                                            </div>
                                        </div>

                                        <div className="mt-4">
                                            <h3 className="text-base font-semibold text-headings mb-2">Yard</h3>
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

                                        {(formData.ownership === 'COMPANY ASSET' || formData.ownership === 'THIRD PARTY ASSET') && (
                                            <div className="mt-4">
                                                <h3 className="text-base font-semibold text-headings mb-2">Sub-Type</h3>

                                                <div className="flex gap-2 flex-wrap">

                                                    {formData.ownership === 'COMPANY ASSET' ? (
                                                        <>
                                                            {/* HIGHWAY USE */}
                                                            <button
                                                                type="button"
                                                                onClick={() => setFormData({ ...formData, subType: 'HIGHWAY USE' })}
                                                                className={`px-6 py-2 rounded-lg font-medium transition-all duration-200 ${formData.subType === 'HIGHWAY USE'
                                                                        ? 'bg-[var(--accent-navyblue)] text-white shadow-md'
                                                                        : 'bg-[rgba(255,255,255,0.05)] text-primary border border-theme hover:bg-[rgba(0,209,255,0.08)]'
                                                                    }`}
                                                            >
                                                                HIGHWAY USE
                                                            </button>

                                                            {/* CITY USE */}
                                                            <button
                                                                type="button"
                                                                onClick={() => setFormData({ ...formData, subType: 'CITY USE' })}
                                                                className={`px-6 py-2 rounded-lg font-medium transition-all duration-200 ${formData.subType === 'CITY USE'
                                                                        ? 'bg-[var(--accent-navyblue)] text-white shadow-md'
                                                                        : 'bg-[rgba(255,255,255,0.05)] text-primary border border-theme hover:bg-[rgba(0,209,255,0.08)]'
                                                                    }`}
                                                            >
                                                                CITY USE
                                                            </button>

                                                            {/* STORAGE USE */}
                                                            <button
                                                                type="button"
                                                                onClick={() => setFormData({ ...formData, subType: 'STORAGE USE' })}
                                                                className={`px-6 py-2 rounded-lg font-medium transition-all duration-200 ${formData.subType === 'STORAGE USE'
                                                                        ? 'bg-[var(--accent-navyblue)] text-white shadow-md'
                                                                        : 'bg-[rgba(255,255,255,0.05)] text-primary border border-theme hover:bg-[rgba(0,209,255,0.08)]'
                                                                    }`}
                                                            >
                                                                STORAGE USE
                                                            </button>
                                                        </>
                                                    ) : (
                                                        <>
                                                            {/* RENTAL */}
                                                            <button
                                                                type="button"
                                                                onClick={() => setFormData({ ...formData, subType: 'RENTAL' })}
                                                                className={`px-6 py-2 rounded-lg font-medium transition-all duration-200 ${formData.subType === 'RENTAL'
                                                                        ? 'bg-[var(--accent-navyblue)] text-white shadow-md'
                                                                        : 'bg-[rgba(255,255,255,0.05)] text-primary border border-theme hover:bg-[rgba(0,209,255,0.08)]'
                                                                    }`}
                                                            >
                                                                RENTAL
                                                            </button>

                                                            {/* OTHER */}
                                                            <button
                                                                type="button"
                                                                onClick={() => setFormData({ ...formData, subType: 'OTHER' })}
                                                                className={`px-6 py-2 rounded-lg font-medium transition-all duration-200 ${formData.subType === 'OTHER'
                                                                        ? 'bg-[var(--accent-navyblue)] text-white shadow-md'
                                                                        : 'bg-[rgba(255,255,255,0.05)] text-primary border border-theme hover:bg-[rgba(0,209,255,0.08)]'
                                                                    }`}
                                                            >
                                                                OTHER
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Inspections Step */}
                                {activeStep === 'Inspections' && (
                                    <div className="space-y-4">
                                        <h3 className="text-base font-semibold text-headings">Trailer Inspections</h3>

                                        {/* Inspection Type Tabs */}
                                        <div className="flex gap-2">
                                            <button
                                                type="button"
                                                onClick={() => setInspectionType('One Time')}
                                                className={`px-6 py-2 rounded-lg font-medium transition-colors border-2 ${inspectionType === 'One Time'
                                                    ? 'bg-card border-gray-700 text-headings'
                                                    : 'bg-card border-theme text-headings hover:border-gray-400'
                                                    }`}
                                            >
                                                One Time
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setInspectionType('Recurring')}
                                                className={`px-6 py-2 rounded-lg font-medium transition-colors border-2 ${inspectionType === 'Recurring'
                                                    ? 'bg-card border-gray-700 text-headings'
                                                    : 'bg-card border-theme text-headings hover:border-gray-400'
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
                                                        <label className="block text-sm font-medium text-headings mb-1">Expiry Date</label>
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
                                                        <label className="block text-sm font-medium text-headings mb-1">Description</label>
                                                        <input
                                                            type="text"
                                                            placeholder="Description"
                                                            value={inspectionForm.description}
                                                            onChange={(e) => setInspectionForm({ ...inspectionForm, description: e.target.value })}
                                                            className="w-full px-3 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)]"
                                                        />
                                                    </div>
                                                    <div className="flex-1">
                                                        <label className="block text-sm font-medium text-headings mb-1">File</label>
                                                        {inspectionForm.file ? (
                                                            <div className="flex items-center gap-2 px-3 py-2 border border-theme rounded-lg bg-card">
                                                                <FileText className="w-4 h-4 text-secondary flex-shrink-0" />
                                                                <span className="text-sm text-headings truncate flex-1">
                                                                    {inspectionForm.file.name}
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
                                                            <input
                                                                type="file"
                                                                onChange={(e) => {
                                                                    if (e.target.files && e.target.files[0]) {
                                                                        setInspectionForm({ ...inspectionForm, file: e.target.files[0] });
                                                                    }
                                                                }}
                                                                className="w-full px-3 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)] text-sm"
                                                                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                                                            />
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <input
                                                            type="checkbox"
                                                            checked={inspectionForm.ignoreExpiration}
                                                            onChange={(e) => setInspectionForm({ ...inspectionForm, ignoreExpiration: e.target.checked })}
                                                            className="w-4 h-4"
                                                        />
                                                        <label className="text-sm text-headings">Ignore Expiration</label>
                                                    </div>
                                                    {editingInspectionId && editingInspectionType === 'oneTime' ? (
                                                        <>
                                                            <button
                                                                onClick={() => {
                                                                    if (inspectionForm.expiryDate && inspectionForm.description) {
                                                                        setOneTimeInspections(oneTimeInspections.map(insp =>
                                                                            insp.id === editingInspectionId
                                                                                ? {
                                                                                    ...insp,
                                                                                    expiryDate: inspectionForm.expiryDate,
                                                                                    description: inspectionForm.description,
                                                                                    ignoreExpiration: inspectionForm.ignoreExpiration,
                                                                                    file: inspectionForm.file || insp.file,
                                                                                    fileName: inspectionForm.file?.name || insp.fileName
                                                                                }
                                                                                : insp
                                                                        ));
                                                                        handleCancelEditInspection();
                                                                    }
                                                                }}
                                                                className="w-10 h-10 bg-green-600 !text-white rounded-lg flex items-center justify-center hover:bg-green-700"
                                                                title="Save"
                                                            >
                                                                <Plus className="w-5 h-5" />
                                                            </button>
                                                            <button
                                                                onClick={handleCancelEditInspection}
                                                                className="w-10 h-10 bg-gray-500 !text-white rounded-lg flex items-center justify-center hover:bg-gray-600"
                                                                title="Cancel"
                                                            >
                                                                <X className="w-5 h-5" />
                                                            </button>
                                                        </>
                                                    ) : (
                                                        <button
                                                            onClick={() => {
                                                                if (inspectionForm.expiryDate && inspectionForm.description) {
                                                                    setOneTimeInspections([...oneTimeInspections, {
                                                                        id: Date.now().toString(),
                                                                        ...inspectionForm,
                                                                        fileName: inspectionForm.file?.name || null
                                                                    }]);
                                                                    setInspectionForm({ expiryDate: '', description: '', ignoreExpiration: false, scheduledOn: '', after: '', unit: '', file: null });
                                                                    if (fileInputRef.current) {
                                                                        fileInputRef.current.value = '';
                                                                    }
                                                                }
                                                            }}
                                                            className="w-10 h-10 bg-gray-700 !text-white rounded-lg flex items-center justify-center hover:bg-gray-800"
                                                            title="Add"
                                                        >
                                                            <Plus className="w-5 h-5" />
                                                        </button>
                                                    )}
                                                </div>
                                                <p className="text-sm text-secondary">Click row to edit • Drag to reorder</p>
                                                <div className="bg-card rounded-lg border border-theme overflow-hidden">
                                                    <table className="w-full">
                                                        <thead className="bg-card">
                                                            <tr>
                                                                <th className="px-4 py-2 text-left text-xs font-medium text-headings">Expiry Date</th>
                                                                <th className="px-4 py-2 text-left text-xs font-medium text-headings">Description</th>
                                                                <th className="px-4 py-2 text-left text-xs font-medium text-headings">File</th>
                                                                <th className="px-4 py-2 text-left text-xs font-medium text-headings">Ignore Expiration</th>
                                                                <th className="px-4 py-2 text-left text-xs font-medium text-headings">Actions</th>
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
                                                                        onClick={() => handleEditInspection(inspection, 'oneTime')}
                                                                        className={`border-t border-theme hover:bg-[rgba(255,255,255,0.03)] cursor-pointer ${editingInspectionId === inspection.id ? 'bg-card' : ''}`}
                                                                    >
                                                                        <td className="px-4 py-2 text-sm text-headings">{inspection.expiryDate}</td>
                                                                        <td className="px-4 py-2 text-sm text-headings">{inspection.description}</td>
                                                                        <td className="px-4 py-2 text-sm">
                                                                            {inspection.fileName ? (
                                                                                inspection.fileUrl ? (
                                                                                    <a
                                                                                        href={inspection.fileUrl}
                                                                                        target="_blank"
                                                                                        rel="noopener noreferrer"
                                                                                        onClick={(e) => e.stopPropagation()}
                                                                                        className="text-[#00D1FF] hover:underline flex items-center gap-1"
                                                                                    >
                                                                                        <FileText className="w-4 h-4" />
                                                                                        {inspection.fileName.length > 20
                                                                                            ? inspection.fileName.substring(0, 20) + '...'
                                                                                            : inspection.fileName}
                                                                                    </a>
                                                                                ) : (
                                                                                    <span className="text-secondary flex items-center gap-1">
                                                                                        <FileText className="w-4 h-4" />
                                                                                        {inspection.fileName.length > 20
                                                                                            ? inspection.fileName.substring(0, 20) + '...'
                                                                                            : inspection.fileName}
                                                                                    </span>
                                                                                )
                                                                            ) : (
                                                                                <span className="text-secondary">No file</span>
                                                                            )}
                                                                        </td>
                                                                        <td className="px-4 py-2 text-sm text-headings">{inspection.ignoreExpiration ? 'Yes' : 'No'}</td>
                                                                        <td className="px-4 py-2 text-sm">
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
                                                <div className="flex gap-2 items-end bg-card p-4 rounded-lg">
                                                    <div className="flex-1">
                                                        <label className="block text-sm font-medium text-headings mb-1">Scheduled On</label>
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
                                                    <div className="flex-1">
                                                        <label className="block text-sm font-medium text-headings mb-1">After</label>
                                                        <input
                                                            type="text"
                                                            placeholder="After"
                                                            value={inspectionForm.after}
                                                            onChange={(e) => setInspectionForm({ ...inspectionForm, after: e.target.value })}
                                                            className="w-full px-3 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)]"
                                                        />
                                                    </div>
                                                    <div className="flex-1">
                                                        <label className="block text-sm font-medium text-headings mb-1">Unit</label>
                                                        <select
                                                            value={inspectionForm.unit}
                                                            onChange={(e) => setInspectionForm({ ...inspectionForm, unit: e.target.value })}
                                                            className="w-full px-3 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)]"
                                                        >
                                                            <option className='form-option' value="">Select Unit</option>
                                                            <option className='form-option' value="Days">Days</option>
                                                            <option className='form-option' value="Weeks">Weeks</option>
                                                            <option className='form-option' value="Months">Months</option>
                                                        </select>
                                                    </div>
                                                    <div className="flex-1">
                                                        <label className="block text-sm font-medium text-headings mb-1">Description</label>
                                                        <input
                                                            type="text"
                                                            placeholder="Description"
                                                            value={inspectionForm.description}
                                                            onChange={(e) => setInspectionForm({ ...inspectionForm, description: e.target.value })}
                                                            className="w-full px-3 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)]"
                                                        />
                                                    </div>
                                                    <div className="flex-1">
                                                        <label className="block text-sm font-medium text-headings mb-1">File</label>
                                                        {inspectionForm.file ? (
                                                            <div className="flex items-center gap-2 px-3 py-2 border border-theme rounded-lg bg-card">
                                                                <FileText className="w-4 h-4 text-secondary flex-shrink-0" />
                                                                <span className="text-sm text-headings truncate flex-1">
                                                                    {inspectionForm.file.name}
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
                                                            <input
                                                                type="file"
                                                                onChange={(e) => {
                                                                    if (e.target.files && e.target.files[0]) {
                                                                        setInspectionForm({ ...inspectionForm, file: e.target.files[0] });
                                                                    }
                                                                }}
                                                                className="w-full px-3 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)] text-sm"
                                                                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                                                            />
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <input
                                                            type="checkbox"
                                                            checked={inspectionForm.ignoreExpiration}
                                                            onChange={(e) => setInspectionForm({ ...inspectionForm, ignoreExpiration: e.target.checked })}
                                                            className="w-4 h-4"
                                                        />
                                                        <label className="text-sm text-headings">Ignore Expiration</label>
                                                    </div>
                                                    {editingInspectionId && editingInspectionType === 'recurring' ? (
                                                        <>
                                                            <button
                                                                onClick={() => {
                                                                    if (inspectionForm.scheduledOn && inspectionForm.description) {
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
                                                                                    fileName: inspectionForm.file?.name || insp.fileName
                                                                                }
                                                                                : insp
                                                                        ));
                                                                        handleCancelEditInspection();
                                                                    }
                                                                }}
                                                                className="w-10 h-10 bg-green-600 !text-white rounded-lg flex items-center justify-center hover:bg-green-700"
                                                                title="Save"
                                                            >
                                                                <Plus className="w-5 h-5" />
                                                            </button>
                                                            <button
                                                                onClick={handleCancelEditInspection}
                                                                className="w-10 h-10 bg-gray-500 !text-white rounded-lg flex items-center justify-center hover:bg-gray-600"
                                                                title="Cancel"
                                                            >
                                                                <X className="w-5 h-5" />
                                                            </button>
                                                        </>
                                                    ) : (
                                                        <button
                                                            onClick={() => {
                                                                if (inspectionForm.scheduledOn && inspectionForm.description) {
                                                                    setRecurringInspections([...recurringInspections, {
                                                                        id: Date.now().toString(),
                                                                        scheduledOn: inspectionForm.scheduledOn,
                                                                        after: inspectionForm.after,
                                                                        unit: inspectionForm.unit,
                                                                        description: inspectionForm.description,
                                                                        ignoreExpiration: inspectionForm.ignoreExpiration,
                                                                        file: inspectionForm.file,
                                                                        fileName: inspectionForm.file?.name || null
                                                                    }]);
                                                                    setInspectionForm({ expiryDate: '', description: '', ignoreExpiration: false, scheduledOn: '', after: '', unit: '', file: null });
                                                                    if (fileInputRef.current) {
                                                                        fileInputRef.current.value = '';
                                                                    }
                                                                }
                                                            }}
                                                            className="w-10 h-10 bg-gray-700 !text-white rounded-lg flex items-center justify-center hover:bg-gray-800"
                                                            title="Add"
                                                        >
                                                            <Plus className="w-5 h-5" />
                                                        </button>
                                                    )}
                                                </div>
                                                <div className="bg-card rounded-lg border border-theme overflow-hidden">
                                                    <table className="w-full">
                                                        <thead className="bg-card">
                                                            <tr>
                                                                <th className="px-4 py-2 text-left text-xs font-medium text-headings">Scheduled On</th>
                                                                <th className="px-4 py-2 text-left text-xs font-medium text-headings">After</th>
                                                                <th className="px-4 py-2 text-left text-xs font-medium text-headings">Unit</th>
                                                                <th className="px-4 py-2 text-left text-xs font-medium text-headings">Description</th>
                                                                <th className="px-4 py-2 text-left text-xs font-medium text-headings">File</th>
                                                                <th className="px-4 py-2 text-left text-xs font-medium text-headings">Ignore Expiration</th>
                                                                <th className="px-4 py-2 text-left text-xs font-medium text-headings">Actions</th>
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
                                                                        onClick={() => handleEditInspection(inspection, 'recurring')}
                                                                        className={`border-t border-theme hover:bg-[rgba(255,255,255,0.03)] cursor-pointer ${editingInspectionId === inspection.id ? 'bg-card' : ''}`}
                                                                    >
                                                                        <td className="px-4 py-2 text-sm text-headings">{inspection.scheduledOn}</td>
                                                                        <td className="px-4 py-2 text-sm text-headings">{inspection.after}</td>
                                                                        <td className="px-4 py-2 text-sm text-headings">{inspection.unit}</td>
                                                                        <td className="px-4 py-2 text-sm text-headings">{inspection.description}</td>
                                                                        <td className="px-4 py-2 text-sm">
                                                                            {inspection.fileName ? (
                                                                                inspection.fileUrl ? (
                                                                                    <a
                                                                                        href={inspection.fileUrl}
                                                                                        target="_blank"
                                                                                        rel="noopener noreferrer"
                                                                                        onClick={(e) => e.stopPropagation()}
                                                                                        className="text-[#00D1FF] hover:underline flex items-center gap-1"
                                                                                    >
                                                                                        <FileText className="w-4 h-4" />
                                                                                        {inspection.fileName.length > 20
                                                                                            ? inspection.fileName.substring(0, 20) + '...'
                                                                                            : inspection.fileName}
                                                                                    </a>
                                                                                ) : (
                                                                                    <span className="text-secondary flex items-center gap-1">
                                                                                        <FileText className="w-4 h-4" />
                                                                                        {inspection.fileName.length > 20
                                                                                            ? inspection.fileName.substring(0, 20) + '...'
                                                                                            : inspection.fileName}
                                                                                    </span>
                                                                                )
                                                                            ) : (
                                                                                <span className="text-secondary">No file</span>
                                                                            )}
                                                                        </td>
                                                                        <td className="px-4 py-2 text-sm text-headings">{inspection.ignoreExpiration ? 'Yes' : 'No'}</td>
                                                                        <td className="px-4 py-2 text-sm">
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
                                        <h3 className="text-base font-semibold text-headings">Documents</h3>

                                        {/* Document Form */}
                                        <div className="bg-card p-4 rounded-lg space-y-4">
                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                                <div>
                                                    <label className="block text-sm font-medium text-headings mb-1">Title</label>
                                                    <input
                                                        type="text"
                                                        placeholder="Title"
                                                        value={documentForm.title}
                                                        onChange={(e) => setDocumentForm({ ...documentForm, title: e.target.value })}
                                                        className="w-full px-3 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)]"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-headings mb-1">Expiry Date</label>
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
                                                    <label className="block text-sm font-medium text-headings mb-1">Description</label>
                                                    <input
                                                        type="text"
                                                        placeholder="Description"
                                                        value={documentForm.description}
                                                        onChange={(e) => setDocumentForm({ ...documentForm, description: e.target.value })}
                                                        className="w-full px-3 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)]"
                                                    />
                                                </div>
                                            </div>
                                            <div className="flex flex-wrap gap-4 items-end">
                                                <div className="min-w-[200px]">
                                                    <label className="block text-sm font-medium text-headings mb-1">File</label>
                                                    {documentForm.file ? (
                                                        <div className="flex items-center gap-2 px-3 py-2 border border-theme rounded-lg bg-card">
                                                            <FileText className="w-4 h-4 text-secondary flex-shrink-0" />
                                                            <span className="text-sm text-headings truncate flex-1">{documentForm.file.name}</span>
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setDocumentForm({ ...documentForm, file: null });
                                                                    if (documentFileInputRef.current) documentFileInputRef.current.value = '';
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
                                                                ref={documentFileInputRef}
                                                                type="file"
                                                                onChange={(e) => {
                                                                    if (e.target.files?.[0]) setDocumentForm({ ...documentForm, file: e.target.files[0] });
                                                                }}
                                                                className="hidden"
                                                            />
                                                            <button
                                                                type="button"
                                                                onClick={() => documentFileInputRef.current?.click()}
                                                                className="w-full px-4 py-2 border border-theme rounded-lg hover:bg-[rgba(255,255,255,0.03)] text-sm font-medium flex items-center justify-center gap-2"
                                                            >
                                                                <Upload className="w-4 h-4" />
                                                                <span>Select File</span>
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        type="checkbox"
                                                        checked={documentForm.ignoreExpiration}
                                                        onChange={(e) => setDocumentForm({ ...documentForm, ignoreExpiration: e.target.checked })}
                                                        className="w-4 h-4"
                                                    />
                                                    <label className="text-sm text-headings">Ignore Expiration</label>
                                                </div>
                                                {editingDocumentId ? (
                                                    <>
                                                        <button
                                                            type="button"
                                                            onClick={handleSaveDocument}
                                                            className="w-10 h-10 bg-green-600 !text-white rounded-lg flex items-center justify-center hover:bg-green-700"
                                                            title="Save"
                                                        >
                                                            <Plus className="w-5 h-5" />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={handleCancelEditDocument}
                                                            className="w-10 h-10 bg-gray-500 !text-white rounded-lg flex items-center justify-center hover:bg-gray-600"
                                                            title="Cancel"
                                                        >
                                                            <X className="w-5 h-5" />
                                                        </button>
                                                    </>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        onClick={handleSaveDocument}
                                                        className="w-10 h-10 bg-gray-700 !text-white rounded-lg flex items-center justify-center hover:bg-gray-800"
                                                        title="Add"
                                                    >
                                                        <Plus className="w-5 h-5" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        <p className="text-sm text-secondary">Click row to edit</p>

                                        {/* Documents Table */}
                                        <div className="bg-card rounded-lg border border-theme overflow-x-auto">
                                            <table className="w-full min-w-[800px]">
                                                <thead className="bg-card">
                                                    <tr>
                                                        <th className="px-4 py-2 text-left text-xs font-medium text-headings">Title</th>
                                                        <th className="px-4 py-2 text-left text-xs font-medium text-headings">Expiry Date</th>
                                                        <th className="px-4 py-2 text-left text-xs font-medium text-headings">Description</th>
                                                        <th className="px-4 py-2 text-left text-xs font-medium text-headings">File</th>
                                                        <th className="px-4 py-2 text-left text-xs font-medium text-headings">Ignore Expiration</th>
                                                        <th className="px-4 py-2 text-left text-xs font-medium text-headings">Actions</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {documents.length === 0 ? (
                                                        <tr>
                                                            <td colSpan={6} className="px-4 py-8 text-center text-secondary">No Data</td>
                                                        </tr>
                                                    ) : (
                                                        documents.map((doc) => (
                                                            <tr
                                                                key={doc.id}
                                                                onClick={() => handleEditDocument(doc)}
                                                                className={`border-t border-theme hover:bg-[rgba(255,255,255,0.03)] cursor-pointer ${editingDocumentId === doc.id ? 'bg-card' : ''}`}
                                                            >
                                                                <td className="px-4 py-2 text-sm text-headings">{doc.title || '-'}</td>
                                                                <td className="px-4 py-2 text-sm text-headings">{doc.expiryDate || '-'}</td>
                                                                <td className="px-4 py-2 text-sm text-headings">{doc.description || '-'}</td>
                                                                <td className="px-4 py-2 text-sm text-headings">
                                                                    {doc.fileUrl ? (
                                                                        <a
                                                                            href={doc.fileUrl}
                                                                            target="_blank"
                                                                            rel="noopener noreferrer"
                                                                            onClick={(e) => e.stopPropagation()}
                                                                            className="flex items-center gap-2 text-[#00D1FF] hover:text-blue-800"
                                                                        >
                                                                            <FileText className="w-4 h-4" />
                                                                            <span>{doc.fileName || 'View File'}</span>
                                                                        </a>
                                                                    ) : doc.file ? (
                                                                        <span className="flex items-center gap-2 text-headings">
                                                                            <FileText className="w-4 h-4" />
                                                                            <span>{doc.file.name}</span>
                                                                        </span>
                                                                    ) : (
                                                                        <span className="text-secondary">No file</span>
                                                                    )}
                                                                </td>
                                                                <td className="px-4 py-2 text-sm text-headings">{doc.ignoreExpiration ? 'Yes' : 'No'}</td>
                                                                <td className="px-4 py-2 text-sm" onClick={(e) => e.stopPropagation()}>
                                                                    <div className="flex items-center gap-2">
                                                                        <button
                                                                            onClick={() => handleEditDocument(doc)}
                                                                            className="p-1 text-[#00D1FF] hover:bg-blue-50 rounded"
                                                                            title="Edit"
                                                                        >
                                                                            <Edit className="w-4 h-4" />
                                                                        </button>
                                                                        <button
                                                                            onClick={() => handleDeleteDocument(doc.id)}
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
                                        <h3 className="text-base font-semibold text-headings">Notes</h3>

                                        {/* Note Form */}
                                        <div className="flex gap-4 items-end bg-card p-4 rounded-lg">
                                            <div className="flex-1">
                                                <label className="block text-sm font-medium text-headings mb-1">Note</label>
                                                <input
                                                    type="text"
                                                    placeholder="Note"
                                                    value={noteForm.note}
                                                    onChange={(e) => setNoteForm({ ...noteForm, note: e.target.value })}
                                                    className="w-full px-3 py-2 bg-card border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)] text-sm"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-headings mb-1">Category</label>
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
                                                        <th className="px-4 py-3 text-left text-xs font-medium text-headings uppercase">Note</th>
                                                        <th className="px-4 py-3 text-left text-xs font-medium text-headings uppercase">Category</th>
                                                        <th className="px-4 py-3 text-left text-xs font-medium text-headings uppercase">Actions</th>
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
                                                                <td className="px-4 py-3 text-sm text-headings">{note.note}</td>
                                                                <td className="px-4 py-3 text-sm text-headings">{note.category}</td>
                                                                <td className="px-4 py-3 text-sm text-headings">
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

                            </div>
                            {/* Footer: Previous/Next fixed at bottom */}
                            <div className="flex-shrink-0 border-t border-theme bg-card px-4 py-3">
                                <div className="flex justify-between gap-3">
                                    <button
                                        onClick={handlePrevious}
                                        disabled={!getPreviousStep()}
                                        className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${getPreviousStep()
                                            ? 'bg-gray-700 !text-white hover:bg-gray-800'
                                            : 'bg-gray-200 text-secondary cursor-not-allowed'
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
                onConfirm={handleDeleteTrailer}
                title="Confirm Deletion"
                message="Are you sure you want to delete this trailer? This action cannot be undone and will permanently remove all trailer data including documents, inspections, and history."
                confirmText="Delete"
                type="danger"
                isLoading={loading}
            />

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

export default TrailersPage;

