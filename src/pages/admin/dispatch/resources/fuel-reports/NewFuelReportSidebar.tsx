import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { X, Plus, FileText, Upload, Sparkles } from 'lucide-react';
import type { CSSProperties, FC } from "react";
import { createFuelReport } from '../../../../../axios/api/dispatcher.places';
import { getFuelTypes, createFuelType, getUnits, createUnit, getFuelVendors, createFuelVendor, extractFuelReceipt } from '../../../../../axios/api/dispatcher.fuelreport';
import { FLEET_COLORS } from '../../../fleetMaintenance/colorUtils';
import AddressSearch from '../../../../../components/common/AddressSearch';

interface FleetUnitOption {
    id: string;
    unitNo: string;
    unitType?: string;
    makeModel?: string;
    licensePlate?: string;
}

interface NewFuelReportSidebarProps {
    isOpen: boolean;
    onClose: (shouldRefresh?: boolean) => void;
    units: FleetUnitOption[];
    unitsLoading: boolean;
    currentUser: any;
    initialData?: any; // For pre-filling form with OCR extracted data
}



const NewFuelReportSidebar: FC<NewFuelReportSidebarProps> = ({ isOpen, onClose, units, unitsLoading, currentUser, initialData }) => {
    const [formData, setFormData] = useState({
        state: '',
        address: '',
        city: '',
        postalCode: '',
        country: '',
        latitude: '',
        longitude: '',
        fullAddress: '',
        unit: '',
        type: '',
        product: '',
        transactionNumber: '',
        paymentNotes: '',
        transactionAmount: '',
        currentOdometer: '',
        measurementUnit: '',
        currency: 'USA',
        date: new Date().toISOString().split('T')[0],
        fuelVendor: '',
        fuelAmount: '',
        status: 'pending',
    });

    // Update form data when initialData is provided (from OCR extraction)
    useEffect(() => {
        if (initialData && isOpen) {
            setFormData(prev => ({
                ...prev,
                transactionAmount: initialData.transactionAmount ? initialData.transactionAmount.toString() : prev.transactionAmount,
                fuelAmount: initialData.fuelAmount ? initialData.fuelAmount.toString() : prev.fuelAmount,
                date: initialData.date || prev.date || new Date().toISOString().split('T')[0],
                fuelVendor: initialData.fuelVendor || prev.fuelVendor,
                transactionNumber: initialData.transactionNumber || prev.transactionNumber,
                product: initialData.product || prev.product || prev.type,
                type: initialData.product || prev.type,
                currentOdometer: initialData.odometer || prev.currentOdometer,
                currency: initialData.currency === 'CAD' ? 'CAD' : (initialData.currency === 'USD' ? 'USA' : prev.currency || 'USA'),
                city: initialData.location?.city || prev.city,
                state: initialData.location?.state || prev.state,
                address: initialData.location?.address || prev.address,
                fullAddress: initialData.location?.address || prev.fullAddress,
                postalCode: initialData.location?.postalCode || prev.postalCode,
                paymentNotes: initialData.notes || prev.paymentNotes || `Extracted from receipt${initialData.transactionNumber ? ` - Transaction #${initialData.transactionNumber}` : ''}`,
            }));
        }
    }, [initialData, isOpen]);

    const [openDetails, setOpenDetails] = useState(true);
    const [loadingSubmit, setLoadingSubmit] = useState(false);
    const [fuelTypes, setFuelTypes] = useState<Array<{ _id: string; name: string }>>([]);
    const [, setLoadingFuelTypes] = useState(false);
    const [showAddTypeModal, setShowAddTypeModal] = useState(false);
    const [newTypeName, setNewTypeName] = useState('');
    const [addingType, setAddingType] = useState(false);
    const [measurementUnits, setMeasurementUnits] = useState<Array<{ _id: string; name: string }>>([]);
    const [loadingMeasurementUnits, setLoadingMeasurementUnits] = useState(false);
    const [showAddUnitModal, setShowAddUnitModal] = useState(false);
    const [newUnitName, setNewUnitName] = useState('');
    const [addingUnit, setAddingUnit] = useState(false);
    const [fuelVendors, setFuelVendors] = useState<Array<{ _id: string; name: string }>>([]);
    const [loadingFuelVendors, setLoadingFuelVendors] = useState(false);
    const [showAddVendorModal, setShowAddVendorModal] = useState(false);
    const [newVendorName, setNewVendorName] = useState('');
    const [addingVendor, setAddingVendor] = useState(false);

    // Documents: attach files to the report (static - store names only)
    const [attachedDocuments, setAttachedDocuments] = useState<{ id: string; name: string }[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);
    // Extract from document: upload receipt → AI extracts data (static mock)
    const [extractFile, setExtractFile] = useState<File | null>(null);
    const [extracting, setExtracting] = useState(false);
    const [extractDone, setExtractDone] = useState(false);
    const extractInputRef = useRef<HTMLInputElement>(null);

    const focusRingStyle = useMemo(
        () =>
            ({
                '--tw-ring-color': FLEET_COLORS.primary
            }) as CSSProperties & { '--tw-ring-color': string },
        []
    );

    const reporterId = currentUser?._id || currentUser?.userData?._id || '';
        currentUser?.name ||
        currentUser?.userData?.name ||
        [currentUser?.userData?.firstName, currentUser?.userData?.lastName].filter(Boolean).join(' ').trim() ||
        'N/A';

    const formatUnitLabel = (unit: FleetUnitOption) => {
        const base = [unit.unitNo, unit.makeModel].filter(Boolean).join(' - ');
        return unit.unitType ? `${base} (${unit.unitType})` : base || 'Unit';
    };

    // Fetch fuel types
    const fetchFuelTypes = useCallback(async () => {
        setLoadingFuelTypes(true);
        try {
            const response = await getFuelTypes();
            if (response?.success) {
                setFuelTypes(response.data || []);
            }
        } catch (error) {
            console.error('Error fetching fuel types:', error);
        } finally {
            setLoadingFuelTypes(false);
        }
    }, []);

    // Fetch measurement units
    const fetchMeasurementUnits = useCallback(async () => {
        setLoadingMeasurementUnits(true);
        try {
            const response = await getUnits();
            if (response?.success) {
                setMeasurementUnits(response.data || []);
            }
        } catch (error) {
            console.error('Error fetching measurement units:', error);
        } finally {
            setLoadingMeasurementUnits(false);
        }
    }, []);

    // Fetch fuel vendors
    const fetchFuelVendors = useCallback(async () => {
        setLoadingFuelVendors(true);
        try {
            const response = await getFuelVendors();
            if (response?.success) {
                setFuelVendors(response.data || []);
            }
        } catch (error) {
            console.error('Error fetching fuel vendors:', error);
        } finally {
            setLoadingFuelVendors(false);
        }
    }, []);

    useEffect(() => {
        if (isOpen) {
            fetchFuelTypes();
            fetchMeasurementUnits();
            fetchFuelVendors();
            setFormData({
                state: '',
                address: '',
                city: '',
                postalCode: '',
                country: '',
                latitude: '',
                longitude: '',
                fullAddress: '',
                unit: '',
                type: '',
                product: '',
                transactionNumber: `FR-${Date.now().toString(36).toUpperCase()}`,
                paymentNotes: '',
                transactionAmount: '',
                currentOdometer: '',
                measurementUnit: '',
                currency: 'USA',
                date: new Date().toISOString().split('T')[0],
                fuelVendor: '',
                fuelAmount: '',
                status: 'pending',
            });
            setAttachedDocuments([]);
            setExtractFile(null);
            setExtracting(false);
            setExtractDone(false);
        }
    }, [isOpen, reporterId, fetchFuelTypes, fetchMeasurementUnits, fetchFuelVendors]);

    // Handle adding new fuel type
    const handleAddNewType = async () => {
        if (!newTypeName.trim()) {
            alert('Please enter a fuel type name');
            return;
        }

        setAddingType(true);
        try {
            const response = await createFuelType(newTypeName.trim());
            if (response?.success) {
                // Refresh fuel types list
                await fetchFuelTypes();
                // Close modal and reset
                setShowAddTypeModal(false);
                setNewTypeName('');
                // Select the newly created type
                if (response.data) {
                    setFormData(prev => ({
                        ...prev,
                        type: response.data.name
                    }));
                }
            } else {
                alert(response?.message || 'Failed to create fuel type');
            }
        } catch (error: any) {
            alert(error?.message || 'Failed to create fuel type');
        } finally {
            setAddingType(false);
        }
    };

    // Handle adding new measurement unit
    const handleAddNewUnit = async () => {
        if (!newUnitName.trim()) {
            alert('Please enter a unit name');
            return;
        }

        setAddingUnit(true);
        try {
            const response = await createUnit(newUnitName.trim());
            if (response?.success) {
                // Refresh measurement units list
                await fetchMeasurementUnits();
                // Close modal and reset
                setShowAddUnitModal(false);
                setNewUnitName('');
                // Select the newly created unit
                if (response.data) {
                    setFormData(prev => ({
                        ...prev,
                        measurementUnit: response.data.name
                    }));
                }
            } else {
                alert(response?.message || 'Failed to create unit');
            }
        } catch (error: any) {
            alert(error?.message || 'Failed to create unit');
        } finally {
            setAddingUnit(false);
        }
    };

    // Handle adding new fuel vendor
    const handleAddNewVendor = async () => {
        if (!newVendorName.trim()) {
            alert('Please enter a fuel vendor name');
            return;
        }

        setAddingVendor(true);
        try {
            const response = await createFuelVendor(newVendorName.trim());
            if (response?.success) {
                // Refresh fuel vendors list
                await fetchFuelVendors();
                // Close modal and reset
                setShowAddVendorModal(false);
                setNewVendorName('');
                // Select the newly created vendor
                if (response.data) {
                    setFormData(prev => ({
                        ...prev,
                        fuelVendor: response.data.name
                    }));
                }
            } else {
                alert(response?.message || 'Failed to create fuel vendor');
            }
        } catch (error: any) {
            alert(error?.message || 'Failed to create fuel vendor');
        } finally {
            setAddingVendor(false);
        }
    };

    const handleInputChange = (e: any) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    // Extract fuel receipt data using AI
    const handleExtractFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        
        // Validate file type
        const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];
        if (!validTypes.includes(file.type)) {
            alert('Please upload a valid image file (JPEG, PNG, WebP) or PDF');
            e.target.value = '';
            return;
        }
        
        setExtractFile(file);
        setExtracting(true);
        setExtractDone(false);
        
        try {
            const response = await extractFuelReceipt(file);
            
            if (response?.success && response?.data) {
                const data = response.data;
                
                // Map extracted data to form fields
                setFormData(prev => ({
                    ...prev,
                    transactionAmount: data.transactionAmount ? data.transactionAmount.toString() : prev.transactionAmount,
                    fuelAmount: data.fuelAmount ? data.fuelAmount.toString() : prev.fuelAmount,
                    date: data.date || prev.date || new Date().toISOString().split('T')[0],
                    fuelVendor: data.fuelVendor || prev.fuelVendor,
                    transactionNumber: data.transactionNumber || prev.transactionNumber,
                    product: data.product || prev.product || prev.type,
                    type: data.product || prev.type,
                    currentOdometer: data.odometer || prev.currentOdometer,
                    currency: data.currency === 'CAD' ? 'CAD' : (data.currency === 'USD' ? 'USA' : prev.currency || 'USA'),
                    city: data.location?.city || prev.city,
                    state: data.location?.state || prev.state,
                    address: data.location?.address || prev.address,
                    fullAddress: data.location?.address || prev.fullAddress,
                    postalCode: data.location?.postalCode || prev.postalCode,
                    paymentNotes: data.notes || prev.paymentNotes || `Extracted from receipt${data.transactionNumber ? ` - Transaction #${data.transactionNumber}` : ''}`,
                }));
                
                setExtractDone(true);
            } else {
                alert(response?.message || 'Failed to extract data from receipt. Please try again or enter data manually.');
                setExtractFile(null);
            }
        } catch (error: any) {
            console.error('Error extracting fuel receipt:', error);
            alert(error?.message || 'Failed to extract data from receipt. Please try again or enter data manually.');
            setExtractFile(null);
        } finally {
            setExtracting(false);
            e.target.value = '';
        }
    };

    const handleAttachDocument = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files?.length) return;
        const newDocs = Array.from(files).map((f, i) => ({
            id: `doc-${Date.now()}-${i}`,
            name: f.name,
        }));
        setAttachedDocuments(prev => [...prev, ...newDocs]);
        e.target.value = '';
    };

    const removeAttachedDocument = (id: string) => {
        setAttachedDocuments(prev => prev.filter(d => d.id !== id));
    };

    const handleSubmit = async () => {
        // Validation
        if (!formData.unit) {
            alert('Please select a unit');
            return;
        }

        if (!formData.fullAddress && !formData.state) {
            alert('Please select a location');
            return;
        }

        const fuelType = formData.product || formData.type;
        if (!fuelType || !fuelType.trim()) {
            alert('Please select a product (fuel type)');
            return;
        }

        try {
            setLoadingSubmit(true);
            const payload = {
                reporter: reporterId,
                state: formData.state,
                city: formData.city,
                address: formData.address || formData.fullAddress,
                location: {
                    address: formData.fullAddress || formData.address || '',
                    latitude: formData.latitude || '',
                    longitude: formData.longitude || ''
                },
                unit: formData.unit,
                type: fuelType,
                product: fuelType,
                transactionNumber: formData.transactionNumber || undefined,
                paymentNotes: formData.paymentNotes || undefined,
                transactionAmount: formData.transactionAmount ? parseFloat(formData.transactionAmount) : null,
                currentOdometer: formData.currentOdometer || null,
                measurementUnit: formData.measurementUnit,
                currency: formData.currency,
                date: formData.date || new Date().toISOString(),
                fuelVendor: formData.fuelVendor,
                fuelAmount: formData.fuelAmount ? parseFloat(formData.fuelAmount) : null,
                status: formData.status || 'pending',
            };
            const response = await createFuelReport(payload);
            if (!response?.success) {
                throw new Error(response?.message || 'Failed to create fuel report');
            }
            setLoadingSubmit(false);
            onClose(true);
        } catch (error: any) {
            console.error('Error creating fuel report:', error);
            alert(error?.message || 'Failed to create fuel report. Please try again.');
            setLoadingSubmit(false);
        }
    };

    if (!isOpen) return null;

    const handleClose = () => {
        onClose(false);
    };

    return (
        <>
            <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-[100]" onClick={handleClose}></div>

            <div className="fixed right-0 top-0 h-full w-full sm:w-[600px] bg-card border-l border-theme shadow-lg z-[101] flex flex-col">
                <div className="p-4 border-b border-theme flex-shrink-0 bg-[var(--accent-navyblue)]">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-semibold text-white">New Fuel Report</h2>
                        <button onClick={handleClose} className="text-white/80 hover:text-white">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-6 pb-20">
                    <div className="bg-card p-4 rounded-md shadow-sm">
                        <div
                            className="flex items-center justify-between cursor-pointer mb-4"
                            onClick={() => setOpenDetails(!openDetails)}
                        >
                            <h3 className="text-lg font-medium text-primary">Fuel Report Details</h3>
                            <svg
                                className={`w-5 h-5 text-secondary transform transition-transform ${openDetails ? "rotate-180" : ""}`}
                                fill="currentColor"
                                viewBox="0 0 20 20"
                            >
                                <path
                                    fillRule="evenodd"
                                    d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                                    clipRule="evenodd"
                                />
                            </svg>
                        </div>

                        {openDetails && (
                            <div className="space-y-4">
                                {/* Upload document – AI extracts data (static) */}
                                <div className="bg-card border border-dashed border-blue-200 rounded-lg p-4 space-y-2">
                                    <div className="flex items-center gap-2 text-sm font-medium text-primary">
                                        <Sparkles className="w-4 h-4 text-[#00D1FF]" />
                                        Upload receipt / document – AI will extract data
                                    </div>
                                    <p className="text-xs text-secondary">Upload a photo or PDF of your fuel receipt. AI will extract transaction amount, fuel amount, date, vendor, and other details.</p>
                                    <input
                                        ref={extractInputRef}
                                        type="file"
                                        accept=".pdf,image/*"
                                        onChange={handleExtractFileChange}
                                        className="hidden"
                                    />
                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => extractInputRef.current?.click()}
                                            disabled={extracting}
                                            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-theme text-sm hover:bg-[rgba(255,255,255,0.03)] disabled:opacity-60"
                                        >
                                            <Upload className="w-4 h-4" />
                                            {extracting ? 'Extracting...' : 'Choose file'}
                                        </button>
                                        {extractFile && (
                                            <span className="text-xs text-secondary truncate max-w-[140px]" title={extractFile.name}>
                                                {extractFile.name}
                                            </span>
                                        )}
                                        {extractDone && (
                                            <span className="text-xs text-green-600 font-medium">Data filled below</span>
                                        )}
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-primary mb-1">Location <span className="text-red-500">*</span></label>
                                    <AddressSearch
                                        placeholder="Search for an address..."
                                        value={formData.fullAddress}
                                        onAddressSelect={(addressData) => {
                                            setFormData(prev => ({
                                                ...prev,
                                                state: addressData.state || '',
                                                address: addressData.address || '',
                                                city: addressData.city || '',
                                                postalCode: addressData.postalCode || '',
                                                country: addressData.country || '',
                                                latitude: addressData.latitude || '',
                                                longitude: addressData.longitude || '',
                                                fullAddress: addressData.fullAddress || ''
                                            }));
                                        }}
                                        onChange={(value) => {
                                            setFormData(prev => ({
                                                ...prev,
                                                fullAddress: value
                                            }));
                                        }}
                                        className="w-full"
                                    />
                                    {formData.state && (
                                        <p className="text-xs text-secondary mt-1">
                                            Selected: {formData.state} {formData.city && `- ${formData.city}`}
                                        </p>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-primary mb-1">State</label>
                                    <input
                                        type="text"
                                        name="state"
                                        value={formData.state}
                                        onChange={handleInputChange}
                                        placeholder="e.g., Ontario, BC, Manitoba"
                                        className="w-full px-3 py-2 border border-theme rounded-md focus:ring-2 focus:border-transparent"
                                        style={focusRingStyle}
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-primary mb-1">City</label>
                                    <input
                                        type="text"
                                        name="city"
                                        value={formData.city}
                                        onChange={handleInputChange}
                                        placeholder="e.g., Mississauga, Hope"
                                        className="w-full px-3 py-2 border border-theme rounded-md focus:ring-2 focus:border-transparent"
                                        style={focusRingStyle}
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-primary mb-1">Transaction #</label>
                                    <input
                                        type="text"
                                        name="transactionNumber"
                                        value={formData.transactionNumber}
                                        onChange={handleInputChange}
                                        placeholder="Unique ID (auto-generated if empty)"
                                        className="w-full px-3 py-2 border border-theme rounded-md focus:ring-2 focus:border-transparent"
                                        style={focusRingStyle}
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-primary mb-1">Unit <span className="text-red-500">*</span></label>
                                    <select
                                        name="unit"
                                        value={formData.unit}
                                        onChange={handleInputChange}
                                        className="w-full px-3 py-2 border border-theme rounded-md focus:ring-2 focus:border-transparent"
                                        style={focusRingStyle}
                                    >
                                        <option className='form-option' value="">Select Unit</option>
                                        {unitsLoading ? (
                                            <option>Loading units...</option>
                                        ) : (
                                            units?.map(unit => (
                                                <option className='form-option' key={unit.id} value={unit.id}>
                                                    {formatUnitLabel(unit)}
                                                </option>
                                            ))
                                        )}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-primary mb-1">Product <span className="text-red-500">*</span></label>
                                    <div className="flex gap-2">
                                        <select
                                            name="product"
                                            value={formData.product || formData.type}
                                            onChange={(e) => {
                                                const v = e.target.value;
                                                setFormData(prev => ({ ...prev, product: v, type: v }));
                                            }}
                                            className="flex-1 px-3 py-2 border border-theme rounded-md focus:ring-2 focus:border-transparent"
                                            style={focusRingStyle}
                                        >
                                            <option className='form-option' value="">Select Product</option>
                                            <option className='form-option' value="Truck Diesel">Truck Diesel</option>
                                            <option className='form-option' value="Reefer Diesel">Reefer Diesel</option>
                                            <option className='form-option' value="DEF">DEF</option>
                                            {fuelTypes.filter(ft => !['Truck Diesel', 'Reefer Diesel', 'DEF'].includes(ft.name)).map((ft) => (
                                                <option className='form-option' key={ft._id} value={ft.name}>{ft.name}</option>
                                            ))}
                                        </select>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setShowAddTypeModal(true);
                                                setNewTypeName('');
                                            }}
                                            className="px-3 py-2 bg-[var(--accent-blue)]/10 text-[var(--accent-blue)] rounded-md hover:bg-[var(--accent-blue)]/20 transition-colors whitespace-nowrap"
                                            title="Add new fuel type"
                                        >
                                            <Plus className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-primary mb-1">Transaction Amount</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        name="transactionAmount"
                                        value={formData.transactionAmount}
                                        onChange={handleInputChange}
                                        placeholder="0.00"
                                        className="w-full px-3 py-2 border border-theme rounded-md focus:ring-2 focus:border-transparent"
                                        style={focusRingStyle}
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-primary mb-1">Current Odometer</label>
                                    <input
                                        type="text"
                                        name="currentOdometer"
                                        value={formData.currentOdometer}
                                        onChange={handleInputChange}
                                        placeholder="Enter odometer reading"
                                        className="w-full px-3 py-2 border border-theme rounded-md focus:ring-2 focus:border-transparent"
                                        style={focusRingStyle}
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-primary mb-1">Unit</label>
                                    <div className="flex gap-2">
                                        <select
                                            name="measurementUnit"
                                            value={formData.measurementUnit}
                                            onChange={handleInputChange}
                                            className="flex-1 px-3 py-2 border border-theme rounded-md focus:ring-2 focus:border-transparent"
                                            style={focusRingStyle}
                                        >
                                            <option className='form-option' value="">Select Unit</option>
                                            {loadingMeasurementUnits ? (
                                                <option className='form-option' disabled>Loading...</option>
                                            ) : (
                                                measurementUnits.map((u) => (
                                                    <option className='form-option' key={u._id} value={u.name}>
                                                        {u.name}
                                                    </option>
                                                ))
                                            )}
                                        </select>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setShowAddUnitModal(true);
                                                setNewUnitName('');
                                            }}
                                            className="px-3 py-2 bg-[var(--accent-blue)]/10 text-[var(--accent-blue)] rounded-md hover:bg-[var(--accent-blue)]/20 transition-colors whitespace-nowrap"
                                            title="Add new unit"
                                        >
                                            <Plus className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-primary mb-1">Currency</label>
                                    <select
                                        name="currency"
                                        value={formData.currency}
                                        onChange={handleInputChange}
                                        className="w-full px-3 py-2 border border-theme rounded-md focus:ring-2 focus:border-transparent"
                                        style={focusRingStyle}
                                    >
                                        <option className='form-option' value="USA">USA</option>
                                        <option className='form-option' value="CAD">CAD</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-primary mb-1">Date</label>
                                    <input
                                        type="date"
                                        name="date"
                                        value={formData.date}
                                        onChange={handleInputChange}
                                        className="w-full px-3 py-2 border border-theme rounded-md focus:ring-2 focus:border-transparent"
                                        style={focusRingStyle}
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-primary mb-1">Fuel Vendor</label>
                                    <div className="flex gap-2">
                                        <select
                                            name="fuelVendor"
                                            value={formData.fuelVendor}
                                            onChange={handleInputChange}
                                            className="flex-1 px-3 py-2 border border-theme rounded-md focus:ring-2 focus:border-transparent"
                                            style={focusRingStyle}
                                        >
                                            <option className='form-option' value="">Select Fuel Vendor</option>
                                            {loadingFuelVendors ? (
                                                <option className='form-option' disabled>Loading...</option>
                                            ) : (
                                                fuelVendors.map((v) => (
                                                    <option className='form-option' key={v._id} value={v.name}>
                                                        {v.name}
                                                    </option>
                                                ))
                                            )}
                                        </select>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setShowAddVendorModal(true);
                                                setNewVendorName('');
                                            }}
                                            className="px-3 py-2 bg-[var(--accent-blue)]/10 text-[var(--accent-blue)] rounded-md hover:bg-[var(--accent-blue)]/20 transition-colors whitespace-nowrap"
                                            title="Add new fuel vendor"
                                        >
                                            <Plus className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-primary mb-1">Fuel Amount</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        name="fuelAmount"
                                        value={formData.fuelAmount}
                                        onChange={handleInputChange}
                                        placeholder="0.00"
                                        className="w-full px-3 py-2 border border-theme rounded-md focus:ring-2 focus:border-transparent"
                                        style={focusRingStyle}
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-primary mb-1">Payment Notes</label>
                                    <textarea
                                        name="paymentNotes"
                                        value={formData.paymentNotes}
                                        onChange={handleInputChange}
                                        placeholder="Internal remarks or accounting references"
                                        rows={2}
                                        className="w-full px-3 py-2 border border-theme rounded-md focus:ring-2 focus:border-transparent"
                                        style={focusRingStyle}
                                    />
                                </div>

                                {/* Attach documents to this report (static) */}
                                <div className="bg-card border border-theme rounded-lg p-4 space-y-2">
                                    <div className="flex items-center gap-2 text-sm font-medium text-primary">
                                        <FileText className="w-4 h-4 text-secondary" />
                                        Attach documents
                                    </div>
                                    <p className="text-xs text-secondary">Add receipts, invoices, or other files to this fuel report.</p>
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept=".pdf,image/*,.csv"
                                        multiple
                                        onChange={handleAttachDocument}
                                        className="hidden"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => fileInputRef.current?.click()}
                                        className="flex items-center gap-2 px-3 py-2 rounded-lg border border-theme text-sm hover:bg-[rgba(255,255,255,0.03)]"
                                    >
                                        <Plus className="w-4 h-4" />
                                        Add document(s)
                                    </button>
                                    {attachedDocuments.length > 0 && (
                                        <ul className="mt-2 space-y-1">
                                            {attachedDocuments.map((doc) => (
                                                <li key={doc.id} className="flex items-center justify-between text-xs bg-card px-2 py-1.5 rounded border border-theme">
                                                    <span className="truncate max-w-[200px]" title={doc.name}>{doc.name}</span>
                                                    <button
                                                        type="button"
                                                        onClick={() => removeAttachedDocument(doc.id)}
                                                        className="text-red-500 hover:text-red-700 ml-2"
                                                    >
                                                        <X className="w-3.5 h-3.5" />
                                                    </button>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-secondary mb-1">Status</label>
                                    <select
                                        name="status"
                                        value={formData.status}
                                        onChange={handleInputChange}
                                        className="w-full px-3 py-2 border border-theme rounded-md focus:ring-2 focus:border-transparent"
                                        style={focusRingStyle}
                                    >
                                        <option className='form-option' value="pending">Pending</option>
                                        <option className='form-option' value="approved">Approved</option>
                                        <option className='form-option' value="rejected">Rejected</option>
                                    </select>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex-shrink-0 bg-card px-6 py-4 flex justify-end gap-3 border-t border-theme">
                    <button
                        onClick={handleClose}
                        disabled={loadingSubmit}
                        className="px-6 py-2 border border-theme rounded-lg text-primary hover:bg-[rgba(255,255,255,0.03)] transition-colors disabled:opacity-60"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={loadingSubmit}
                        className="px-6 py-2 rounded-lg !text-white font-semibold transition-colors disabled:opacity-60 bg-[var(--accent-navyblue)]"
                    >
                        {loadingSubmit ? 'Saving...' : 'Submit Fuel Report'}
                    </button>
                </div>
            </div>

            {/* Add Fuel Type Modal */}
            {showAddTypeModal && (
                <>
                    <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-[102]" onClick={() => setShowAddTypeModal(false)}></div>
                    <div className="fixed inset-0 flex items-center justify-center z-[103] px-4">
                        <div className="bg-card rounded-lg shadow-xl p-6 w-full max-w-md">
                            <h3 className="text-lg font-semibold text-primary mb-4">Add New Fuel Type</h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-primary mb-1">
                                        Fuel Type Name <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={newTypeName}
                                        onChange={(e) => setNewTypeName(e.target.value)}
                                        placeholder="e.g., Diesel, Gasoline, Electric"
                                        className="w-full px-3 py-2 border border-theme rounded-md focus:ring-2 focus:border-transparent"
                                        style={focusRingStyle}
                                        onKeyPress={(e) => {
                                            if (e.key === 'Enter') {
                                                handleAddNewType();
                                            }
                                        }}
                                        autoFocus
                                    />
                                </div>
                                <div className="flex justify-end gap-3 pt-2">
                                    <button
                                        onClick={() => {
                                            setShowAddTypeModal(false);
                                            setNewTypeName('');
                                        }}
                                        disabled={addingType}
                                        className="px-4 py-2 border border-theme rounded-lg text-primary hover:bg-[rgba(255,255,255,0.03)] transition-colors disabled:opacity-60"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleAddNewType}
                                        disabled={addingType || !newTypeName.trim()}
                                        className="px-4 py-2 rounded-lg !text-white transition-colors disabled:opacity-60 bg-[var(--accent-navyblue)]"
                                        
                                    >
                                        {addingType ? 'Adding...' : 'Add Type'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* Add Unit Modal */}
            {showAddUnitModal && (
                <>
                    <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-[102]" onClick={() => setShowAddUnitModal(false)}></div>
                    <div className="fixed inset-0 flex items-center justify-center z-[103] px-4">
                        <div className="bg-card rounded-lg shadow-xl p-6 w-full max-w-md">
                            <h3 className="text-lg font-semibold text-primary mb-4">Add New Unit</h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-primary mb-1">
                                        Unit Name <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={newUnitName}
                                        onChange={(e) => setNewUnitName(e.target.value)}
                                        placeholder="e.g., L, gal, ml"
                                        className="w-full px-3 py-2 border border-theme rounded-md focus:ring-2 focus:border-transparent"
                                        style={focusRingStyle}
                                        onKeyPress={(e) => {
                                            if (e.key === 'Enter') {
                                                handleAddNewUnit();
                                            }
                                        }}
                                        autoFocus
                                    />
                                </div>
                                <div className="flex justify-end gap-3 pt-2">
                                    <button
                                        onClick={() => {
                                            setShowAddUnitModal(false);
                                            setNewUnitName('');
                                        }}
                                        disabled={addingUnit}
                                        className="px-4 py-2 border border-theme rounded-lg text-primary hover:bg-[rgba(255,255,255,0.03)] transition-colors disabled:opacity-60"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleAddNewUnit}
                                        disabled={addingUnit || !newUnitName.trim()}
                                        className="px-4 py-2 rounded-lg !text-white transition-colors disabled:opacity-60 bg-[var(--accent-navyblue)]"
                                    
                                    >
                                        {addingUnit ? 'Adding...' : 'Add Unit'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* Add Fuel Vendor Modal */}
            {showAddVendorModal && (
                <>
                    <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-[102]" onClick={() => setShowAddVendorModal(false)}></div>
                    <div className="fixed inset-0 flex items-center justify-center z-[103] px-4">
                        <div className="bg-card rounded-lg shadow-xl p-6 w-full max-w-md">
                            <h3 className="text-lg font-semibold text-primary mb-4">Add New Fuel Vendor</h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-primary mb-1">
                                        Fuel Vendor Name <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={newVendorName}
                                        onChange={(e) => setNewVendorName(e.target.value)}
                                        placeholder="e.g., Shell, Chevron, Petro-Canada"
                                        className="w-full px-3 py-2 border border-theme rounded-md focus:ring-2 focus:border-transparent"
                                        style={focusRingStyle}
                                        onKeyPress={(e) => {
                                            if (e.key === 'Enter') {
                                                handleAddNewVendor();
                                            }
                                        }}
                                        autoFocus
                                    />
                                </div>
                                <div className="flex justify-end gap-3 pt-2">
                                    <button
                                        onClick={() => {
                                            setShowAddVendorModal(false);
                                            setNewVendorName('');
                                        }}
                                        disabled={addingVendor}
                                        className="px-4 py-2 border border-theme rounded-lg text-primary hover:bg-[rgba(255,255,255,0.03)] transition-colors disabled:opacity-60"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleAddNewVendor}
                                        disabled={addingVendor || !newVendorName.trim()}
                                        className="px-4 py-2 rounded-lg !text-white transition-colors disabled:opacity-60 bg-[var(--accent-navyblue)]"
                                    >
                                        {addingVendor ? 'Adding...' : 'Add Vendor'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </>
    );
};

export default NewFuelReportSidebar;
