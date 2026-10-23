import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import type { CSSProperties } from 'react';
import { Plus, Edit, Trash2, Search, Truck, CheckCircle, XCircle, Filter, MapPin, FileText, X, Download } from 'lucide-react';
import { FaCheckCircle, FaExclamationCircle, FaTimes } from 'react-icons/fa';
import {
  listFleetUnits,
  createFleetUnit as apiCreateFleetUnit,
  updateFleetUnit as apiUpdateFleetUnit,
  deleteFleetUnit as apiDeleteFleetUnit,
  getFleetUnitById,
  type FleetUnitDto,
  type FleetUnitSummary
} from '../../../../axios/api/fleet.units';
import {
  createVehicleDocument,
  updateVehicleDocument,
  getVehicleDocument,
  deleteVehicleDocument
} from '../../../../axios/api/compilance.vehicledoc';
import { FLEET_COLORS } from '../colorUtils';

const ACCENT_PRIMARY = FLEET_COLORS.primary;
const ACCENT_DARK = FLEET_COLORS.dark;
const hexToRgba = (hex: string, alpha = 1) => {
  const parsed = hex.replace('#', '');
  const bigint = parseInt(parsed, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};
const ACCENT_SOFT = hexToRgba(ACCENT_PRIMARY, 0.1);
const ACCENT_SOFT_BORDER = hexToRgba(ACCENT_PRIMARY, 0.25);
const ACCENT_VARS = {
  '--accent-color': ACCENT_PRIMARY,
  '--accent-dark': ACCENT_DARK,
  '--accent-soft': ACCENT_SOFT,
  '--accent-soft-border': ACCENT_SOFT_BORDER
} as CSSProperties;

type UnitType = 'Truck' | 'Trailer';
type UnitStatus = 'Active' | 'Inactive';
type TruckType = 'Semi-Truck' | 'Straight Truck' | 'Box Truck' | 'Flatbed' | 'Refrigerated Truck' | 'Dump Truck' | 'Tow Truck';
type TrailerType = 'Reefer Trailer' | 'Tri-Axle Trailer' | 'Dry Van' | 'Flatbed' | 'Step Deck' | 'Lowboy' | 'Tank Trailer' | 'Dump Trailer';

type FleetUnit = FleetUnitDto & {
  source?: 'vehicle' | 'trailer' | 'custom';
  documents?: Array<{
    _id: string;
    documentType: string;
    documentNumber?: string;
    expiryDate?: string;
    issuedAt?: string;
    status?: string;
  }>;
};

interface FleetUnitFormData {
  unitNo: string;
  internalId: string;
  unitType: UnitType;
  makeModel: string;
  vinNo: string;
  licensePlate: string;
  year: string;
  truckType: TruckType;
  trailerType: TrailerType;
  capacity: string;
  initialOdometer: string;
  currentOdometer: string;
  status: UnitStatus;
  operationStatus: string;
  address: string;
  lastDate: string;
  reason: string;
  serviceIntervalDays: string;
  serviceIntervalMileage: string;
  safetyExpiryDate: string;
  safetyDecalNumber: string;
  safetyPaperNumber: string;
  lastInspectionShop: string;
  lastInspectionInvoice: string;
}

interface FleetDocumentForm {
  documentType: 'insurance' | 'permit' | 'fitness' | 'pollution' | 'driver_license' | 'logbook' | 'maintenance' | 'trailer_registration' | 'safety_inspection' | 'brake_certificate' | 'coupling_certificate' | 'other';
  documentNumber: string;
  expiryDate: string;
  issuedAt: string;
  files: File[]; // Support multiple files
  _id?: string; // For existing documents
}

const defaultSummary: FleetUnitSummary = {
  totalUnits: 0,
  activeUnits: 0,
  inactiveUnits: 0,
  trucks: 0,
  trailers: 0,
  expiringSoon: 0,
  expired: 0
};

const FleetUnits: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'all' | 'trucks' | 'trailers'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [truckLimitModal, setTruckLimitModal] = useState<{ show: boolean; maxTrucks: number; usedTrucks: number }>({ show: false, maxTrucks: 0, usedTrucks: 0 });
  const [selectedUnit, setSelectedUnit] = useState<FleetUnit | null>(null);
  const [units, setUnits] = useState<FleetUnit[]>([]);
  const [summary, setSummary] = useState<FleetUnitSummary>(defaultSummary);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [requiresCompanySetup, setRequiresCompanySetup] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  // Two-step flow state
  const [currentStep, setCurrentStep] = useState<1 | 2>(1);
  const [fleetDocuments, setFleetDocuments] = useState<FleetDocumentForm[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Unit details view
  const [showUnitDetails, setShowUnitDetails] = useState(false);
  const [selectedUnitDetails, setSelectedUnitDetails] = useState<FleetUnit | null>(null);
  // Document edit/delete
  const [editingDocument, setEditingDocument] = useState<any | null>(null);
  const [showEditDocumentModal, setShowEditDocumentModal] = useState(false);
  const [editDocumentForm, setEditDocumentForm] = useState<FleetDocumentForm | null>(null);
  // Refs for scrollbar synchronization
  const topScrollRef = useRef<HTMLDivElement>(null);
  const bottomScrollRef = useRef<HTMLDivElement>(null);
  const [formData, setFormData] = useState<FleetUnitFormData>({
    unitNo: '',
    internalId: '',
    unitType: 'Truck',
    makeModel: '',
    vinNo: '',
    licensePlate: '',
    year: new Date().getFullYear().toString(),
    truckType: 'Semi-Truck',
    trailerType: 'Dry Van',
    capacity: '',
    initialOdometer: '',
    currentOdometer: '',
    status: 'Active',
    operationStatus: 'available',
    address: '',
    lastDate: '',
    reason: '',
    serviceIntervalDays: '',
    serviceIntervalMileage: '',
    safetyExpiryDate: '',
    safetyDecalNumber: '',
    safetyPaperNumber: '',
    lastInspectionShop: '',
    lastInspectionInvoice: ''
  });

  const resetForm = () => {
    setFormData({
      unitNo: '',
      internalId: '',
      unitType: 'Truck',
      makeModel: '',
      vinNo: '',
      licensePlate: '',
      year: new Date().getFullYear().toString(),
      truckType: 'Semi-Truck',
      trailerType: 'Dry Van',
      capacity: '',
      initialOdometer: '',
      currentOdometer: '',
      status: 'Active',
      operationStatus: 'available',
      address: '',
      lastDate: '',
      reason: '',
      serviceIntervalDays: '',
      serviceIntervalMileage: '',
      safetyExpiryDate: '',
      safetyDecalNumber: '',
      safetyPaperNumber: '',
      lastInspectionShop: '',
      lastInspectionInvoice: ''
    });
    setFleetDocuments([]);
    setCurrentStep(1);
    setFormError(null);
    setIsSubmitting(false);
  };

  // Vehicle document types
  const VEHICLE_DOCUMENT_TYPES: Array<'insurance' | 'permit' | 'fitness' | 'pollution' | 'driver_license' | 'logbook' | 'maintenance' | 'trailer_registration' | 'safety_inspection' | 'brake_certificate' | 'coupling_certificate' | 'other'> = [
    'insurance',
    'permit',
    'fitness',
    'pollution',
    'driver_license',
    'logbook',
    'maintenance',
    'trailer_registration',
    'safety_inspection',
    'brake_certificate',
    'coupling_certificate',
    'other'
  ];

  const addDocument = () => {
    setFleetDocuments([...fleetDocuments, {
      documentType: 'insurance',
      documentNumber: '',
      expiryDate: '',
      issuedAt: '',
      files: []
    }]);
  };

  const removeDocument = (index: number) => {
    setFleetDocuments(fleetDocuments.filter((_, i) => i !== index));
  };

  const updateDocument = (index: number, field: keyof FleetDocumentForm, value: any) => {
    const updated = [...fleetDocuments];
    updated[index] = { ...updated[index], [field]: value };
    setFleetDocuments(updated);
  };

  const handleDocumentFileChange = (index: number, files: FileList | null) => {
    if (files && files.length > 0) {
      // Convert FileList to Array
      const filesArray = Array.from(files);
      updateDocument(index, 'files', filesArray);
    } else {
      updateDocument(index, 'files', []);
    }
  };

  // Handle edit document
  const handleEditDocument = (doc: any) => {
    setEditingDocument(doc);
    setEditDocumentForm({
      documentType: doc.documentType || 'insurance',
      documentNumber: doc.documentNumber || '',
      expiryDate: doc.expiryDate ? doc.expiryDate.split('T')[0] : '',
      issuedAt: doc.issuedAt ? doc.issuedAt.split('T')[0] : '',
      files: [],
      _id: doc._id
    });
    setShowEditDocumentModal(true);
  };

  // Handle delete document
  const handleDeleteDocument = async (docId: string) => {
    if (!window.confirm('Are you sure you want to delete this document? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await deleteVehicleDocument(docId);
      if (response?.success) {
        setNotification({ type: 'success', message: 'Document deleted successfully' });
        // Refresh the unit details
        if (selectedUnitDetails?._id) {
          const unitId = selectedUnitDetails._id.startsWith('custom-')
            ? selectedUnitDetails._id.replace('custom-', '')
            : selectedUnitDetails._id;
          const updatedUnitResponse = await getFleetUnitById(unitId);
          if (updatedUnitResponse?.success && updatedUnitResponse?.data) {
            setSelectedUnitDetails(updatedUnitResponse.data);
            // Also refresh the main units list
            loadFleetUnits();
          }
        }
      } else {
        setNotification({ type: 'error', message: response?.message || 'Failed to delete document' });
      }
    } catch (error) {
      console.error('Delete document error:', error);
      setNotification({ type: 'error', message: 'Failed to delete document' });
    }
  };

  // Handle save edited document
  const handleSaveEditedDocument = async () => {
    if (!editingDocument || !editDocumentForm) return;

    try {
      setIsSubmitting(true);
      const formData = new FormData();

      // Only append fields that have values (allow partial updates)
      // Document type is required
      if (editDocumentForm.documentType) {
        formData.append('documentType', editDocumentForm.documentType);
      }

      // Only append document number if it has a value
      if (editDocumentForm.documentNumber && editDocumentForm.documentNumber.trim() !== '') {
        formData.append('documentNumber', editDocumentForm.documentNumber.trim());
      }

      // Only append dates if they have values
      if (editDocumentForm.expiryDate && editDocumentForm.expiryDate.trim() !== '') {
        formData.append('expiryDate', editDocumentForm.expiryDate);
      }

      if (editDocumentForm.issuedAt && editDocumentForm.issuedAt.trim() !== '') {
        formData.append('issuedAt', editDocumentForm.issuedAt);
      }

      // Add files if any (optional - only if user wants to update files)
      if (editDocumentForm.files && editDocumentForm.files.length > 0) {
        editDocumentForm.files.forEach((file) => {
          formData.append('file', file);
        });
      }

      const response = await updateVehicleDocument(editingDocument._id, formData);
      if (response?.success) {
        setNotification({ type: 'success', message: 'Document updated successfully' });
        setShowEditDocumentModal(false);
        setEditingDocument(null);
        setEditDocumentForm(null);

        // Refresh the unit details
        if (selectedUnitDetails?._id) {
          const unitId = selectedUnitDetails._id.startsWith('custom-')
            ? selectedUnitDetails._id.replace('custom-', '')
            : selectedUnitDetails._id;
          const updatedUnitResponse = await getFleetUnitById(unitId);
          if (updatedUnitResponse?.success && updatedUnitResponse?.data) {
            setSelectedUnitDetails(updatedUnitResponse.data);
            // Also refresh the main units list
            loadFleetUnits();
          }
        }
      } else {
        setNotification({ type: 'error', message: response?.message || 'Failed to update document' });
      }
    } catch (error) {
      console.error('Update document error:', error);
      setNotification({ type: 'error', message: 'Failed to update document' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Fetch documents for a fleet unit
  const fetchFleetUnitDocuments = useCallback(async (fleetUnitId: string) => {
    try {
      const response = await getVehicleDocument();
      if (response?.success && Array.isArray(response?.documentsByVehicle)) {
        // Find documents for this fleet unit
        const unitDocuments = response.documentsByVehicle
          .flatMap((item: any) => {
            const docs = item.documents || [];
            return docs
              .filter((doc: any) => doc.fleetUnitId === fleetUnitId)
              .map((doc: any) => ({
                documentType: doc.documentType,
                documentNumber: doc.documentNumber || '',
                expiryDate: doc.expiryDate ? doc.expiryDate.split('T')[0] : '',
                issuedAt: doc.issuedAt ? doc.issuedAt.split('T')[0] : '',
                files: [],
                _id: doc._id
              }));
          });
        setFleetDocuments(unitDocuments);
      }
    } catch (error) {
      console.error('Error fetching fleet unit documents:', error);
      setFleetDocuments([]);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm.trim());
    }, 400);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Sync scroll between top and bottom scrollbars for documents table
  useEffect(() => {
    if (!showUnitDetails) return;

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
      tableObserver.observe(bottomTable, { childList: true, subtree: true });
    }

    topScroll.addEventListener('scroll', handleTopScroll);
    bottomScroll.addEventListener('scroll', handleBottomScroll);

    // Sync on window resize
    window.addEventListener('resize', syncScrollWidths);

    return () => {
      clearTimeout(timeoutId);
      clearTimeout(timeoutId2);
      clearTimeout(timeoutId3);
      topScroll.removeEventListener('scroll', handleTopScroll);
      bottomScroll.removeEventListener('scroll', handleBottomScroll);
      window.removeEventListener('resize', syncScrollWidths);
      tableObserver.disconnect();
    };
  }, [showUnitDetails, selectedUnitDetails]);

  const loadFleetUnits = useCallback(async (refreshUnitId?: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await listFleetUnits({
        search: debouncedSearchTerm || undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        category: activeTab
      });

      if (response?.success) {
        const unitsData = response.data || [];

        // Fetch documents once for all units (more efficient)
        let allDocuments: any[] = [];
        try {
          const docsResponse = await getVehicleDocument();
          console.log('📄 Documents API response:', docsResponse);
          if (docsResponse?.success && Array.isArray(docsResponse?.documentsByVehicle)) {
            // Flatten all documents from all vehicles
            allDocuments = docsResponse.documentsByVehicle.flatMap((item: any) => {
              const docs = item.documents || [];
              return docs.map((doc: any) => {
                // Normalize fleetUnitId to string for comparison
                let fleetUnitIdStr = '';
                if (doc.fleetUnitId) {
                  if (typeof doc.fleetUnitId === 'string') {
                    fleetUnitIdStr = doc.fleetUnitId;
                  } else if (doc.fleetUnitId._id) {
                    // Handle populated ObjectId
                    fleetUnitIdStr = typeof doc.fleetUnitId._id === 'string'
                      ? doc.fleetUnitId._id
                      : String(doc.fleetUnitId._id);
                  } else if (typeof doc.fleetUnitId === 'object' && doc.fleetUnitId.toString) {
                    // Handle Mongoose ObjectId
                    fleetUnitIdStr = doc.fleetUnitId.toString();
                  } else {
                    fleetUnitIdStr = String(doc.fleetUnitId);
                  }
                }
                return {
                  ...doc,
                  fleetUnitIdStr: fleetUnitIdStr.trim()
                };
              });
            });
            console.log(`📄 Total documents fetched: ${allDocuments.length}`);
            if (allDocuments.length > 0) {
              console.log('📄 Sample documents:', allDocuments.slice(0, 3).map(d => ({
                _id: d._id,
                fleetUnitId: d.fleetUnitId,
                fleetUnitIdStr: d.fleetUnitIdStr,
                documentType: d.documentType
              })));
            }
          }
        } catch (err) {
          console.error('Error fetching documents:', err);
        }

        // Helper function to extract real ID from prefixed IDs (e.g., "custom-123" -> "123")
        const extractRealId = (prefixedId: string | any): string => {
          if (!prefixedId) return '';

          let idStr = '';
          if (typeof prefixedId === 'string') {
            idStr = prefixedId;
          } else if (prefixedId && typeof prefixedId === 'object' && (prefixedId as any).toString) {
            idStr = (prefixedId as any).toString();
          } else {
            idStr = String(prefixedId);
          }

          // Remove prefixes if present
          if (idStr.startsWith('custom-')) {
            return idStr.replace('custom-', '');
          }
          if (idStr.startsWith('vehicle-')) {
            return idStr.replace('vehicle-', '');
          }
          if (idStr.startsWith('trailer-')) {
            return idStr.replace('trailer-', '');
          }

          return idStr.trim();
        };

        // Match documents to units
        const unitsWithDocuments = unitsData.map((unit: FleetUnit) => {
          // Extract real ID from unit (handle prefixed IDs like "custom-123")
          const unitIdStr = extractRealId(unit._id);

          console.log(`🔍 Unit ${unit.unitNo}: Original ID = ${unit._id}, Extracted ID = ${unitIdStr}`);

          // Find documents for this unit
          const unitDocuments = allDocuments.filter((doc: any) => {
            const matches = doc.fleetUnitIdStr === unitIdStr;
            if (matches) {
              console.log(`✅ Matched document ${doc._id} (type: ${doc.documentType}) to unit ${unit.unitNo} (${unitIdStr})`);
            }
            return matches;
          });

          if (unitDocuments.length > 0) {
            console.log(`📄 Unit ${unit.unitNo} (${unitIdStr}): Found ${unitDocuments.length} documents`);
          } else {
            console.log(`⚠️ Unit ${unit.unitNo} (${unitIdStr}): No documents found. Available fleetUnitIds in docs:`,
              [...new Set(allDocuments.map(d => d.fleetUnitIdStr))].slice(0, 5));
          }

          return { ...unit, documents: unitDocuments };
        });

        setUnits(unitsWithDocuments);
        setSummary(response.summary || defaultSummary);
        setRequiresCompanySetup(!!response.requiresCompanySetup);

        // If a specific unit was refreshed, update the selected unit details if modal is open
        if (refreshUnitId) {
          setSelectedUnitDetails(prev => {
            if (prev && prev._id === refreshUnitId) {
              const updatedUnit = unitsWithDocuments.find(u => u._id === refreshUnitId);
              return updatedUnit || prev;
            }
            return prev;
          });
        }
      } else {
        setUnits([]);
        setSummary(defaultSummary);
        setError(response?.message || 'Failed to fetch fleet units');
      }
    } catch (err: any) {
      setUnits([]);
      setSummary(defaultSummary);
      setError(err?.response?.data?.message || err?.message || 'Failed to fetch fleet units');
    } finally {
      setLoading(false);
    }
  }, [activeTab, statusFilter, debouncedSearchTerm]);

  useEffect(() => {
    loadFleetUnits();
  }, [loadFleetUnits]);

  const handleAddUnit = () => {
    resetForm();
    setSelectedUnit(null);
    setCurrentStep(1); // Ensure we start at step 1
    setShowAddModal(true);
  };

  const handleEditUnit = async (unit: FleetUnit) => {
    setSelectedUnit(unit);
    setFormData({
      unitNo: unit.unitNo,
      internalId: unit.internalId || '',
      unitType: unit.unitType as UnitType,
      makeModel: unit.makeModel,
      vinNo: unit.vinNo,
      licensePlate: unit.licensePlate,
      year: unit.year?.toString() || '',
      truckType: (unit.truckType as TruckType) || 'Semi-Truck',
      trailerType: (unit.trailerType as TrailerType) || 'Dry Van',
      capacity: unit.capacity || '',
      initialOdometer: unit.initialOdometer?.toString() || '',
      currentOdometer: (unit.currentOdometer ?? unit.initialOdometer ?? 0).toString(),
      status: unit.status as UnitStatus,
      operationStatus: unit.operationStatus || 'available',
      address: unit.currentLocation?.address || '',
      lastDate: unit.lastDate ? unit.lastDate.slice(0, 10) : '',
      reason: unit.reason || '',
      serviceIntervalDays: (unit as any).serviceIntervalDays?.toString() || '',
      serviceIntervalMileage: (unit as any).serviceIntervalMileage?.toString() || '',
      safetyExpiryDate: unit.safetyExpiryDate ? unit.safetyExpiryDate.slice(0, 10) : '',
      safetyDecalNumber: unit.safetyDecalNumber || '',
      safetyPaperNumber: unit.safetyPaperNumber || '',
      lastInspectionShop: unit.lastInspectionShop || '',
      lastInspectionInvoice: unit.lastInspectionInvoice || ''
    });
    setFormError(null);
    setCurrentStep(1);
    setShowEditModal(true);
    // Fetch existing documents for this unit
    await fetchFleetUnitDocuments(unit._id);
  };


  const handleDeleteUnit = (unit: FleetUnit) => {
    setSelectedUnit(unit);
    setShowDeleteModal(true);
  };

  const handleSaveUnit = async () => {
    // Step 1: Validate and move to step 2 for new units or when editing
    if (currentStep === 1 && (showAddModal || showEditModal)) {
      setFormError(null);
      if (!formData.unitNo || !formData.makeModel || !formData.vinNo || !formData.licensePlate || !formData.initialOdometer) {
        setFormError('Please fill in all required fields highlighted with *');
        return;
      }
      // Move to step 2
      setCurrentStep(2);
      return;
    }

    // Step 2: Save fleet unit and documents
    setFormError(null);
    if (!formData.unitNo || !formData.makeModel || !formData.vinNo || !formData.licensePlate || !formData.initialOdometer) {
      setFormError('Please fill in all required fields highlighted with *');
      return;
    }

    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setSaving(true);

    try {
      // Map UnitType to FleetUnitType
      const mappedUnitType: import('../../../../axios/api/fleet.units').FleetUnitType = formData.unitType;

      const payload: import('../../../../axios/api/fleet.units').FleetUnitPayload = {
        unitNo: formData.unitNo.trim(),
        internalId: formData.internalId.trim() || undefined,
        unitType: mappedUnitType,
        makeModel: formData.makeModel.trim(),
        vinNo: formData.vinNo.trim(),
        licensePlate: formData.licensePlate.trim(),
        year: formData.year ? Number(formData.year) : undefined,
        truckType: formData.unitType === 'Truck' ? formData.truckType : undefined,
        trailerType: formData.unitType !== 'Truck' ? formData.trailerType : undefined,
        capacity: formData.unitType !== 'Truck' ? formData.capacity : undefined,
        initialOdometer: formData.initialOdometer ? Number(formData.initialOdometer) : 0,
        currentOdometer: formData.currentOdometer
          ? Number(formData.currentOdometer)
          : formData.initialOdometer
            ? Number(formData.initialOdometer)
            : 0,
        status: formData.status,
        operationStatus: formData.unitType !== 'Truck' ? formData.operationStatus : undefined,
        address: formData.address.trim() || undefined,
        lastDate: formData.status === 'Inactive' ? formData.lastDate || undefined : undefined,
        reason: formData.status === 'Inactive' ? formData.reason || undefined : undefined,
        serviceIntervalDays: formData.serviceIntervalDays ? Number(formData.serviceIntervalDays) : undefined,
        serviceIntervalMileage: formData.serviceIntervalMileage ? Number(formData.serviceIntervalMileage) : undefined,
        safetyExpiryDate: formData.safetyExpiryDate || undefined,
        safetyDecalNumber: formData.safetyDecalNumber.trim() || undefined,
        safetyPaperNumber: formData.safetyPaperNumber.trim() || undefined,
        lastInspectionShop: formData.lastInspectionShop.trim() || undefined,
        lastInspectionInvoice: formData.lastInspectionInvoice.trim() || undefined
      };

      let fleetUnitId: string | null = null;

      if (showAddModal) {
        const response = await apiCreateFleetUnit(payload);
        if (!response?.success) {
          if (response?.code === 'TRUCK_LIMIT_REACHED') {
            setTruckLimitModal({
              show: true,
              maxTrucks: response.maxTrucks ?? 0,
              usedTrucks: response.usedTrucks ?? 0,
            });
            return;
          }
          throw new Error(response?.message || 'Failed to create fleet unit');
        }
        fleetUnitId = response.data?._id || (response.data as any)?.id;
        setNotification({ type: 'success', message: 'Fleet unit added successfully.' });
      } else if (showEditModal && selectedUnit) {
        const response = await apiUpdateFleetUnit(selectedUnit._id, payload);
        if (!response?.success) {
          throw new Error(response?.message || 'Failed to update fleet unit');
        }
        fleetUnitId = selectedUnit._id;
        setNotification({ type: 'success', message: 'Fleet unit updated successfully.' });
      }

      // Upload documents if any
      if (fleetUnitId && fleetDocuments.length > 0) {
        try {
          const assetType = formData.unitType === 'Truck' ? 'vehicle' : 'trailer';
          const uploadPromises: Promise<any>[] = [];

          for (const doc of fleetDocuments) {
            // Handle multiple files for new documents
            if (doc.files && doc.files.length > 0 && doc.documentType) {
              // Create a separate document entry for each file
              for (const file of doc.files) {
                const docFormData = new FormData();
                docFormData.append('assetType', assetType);
                docFormData.append('fleetUnitId', fleetUnitId);
                docFormData.append('vehicleId', ''); // Empty string when using fleetUnitId
                docFormData.append('trailerId', ''); // Empty string when using fleetUnitId
                docFormData.append('documentType', doc.documentType);
                if (doc.documentNumber) docFormData.append('documentNumber', doc.documentNumber);
                if (doc.issuedAt) docFormData.append('issuedAt', doc.issuedAt);
                if (doc.expiryDate) docFormData.append('expiryDate', doc.expiryDate);
                docFormData.append('file', file); // Use 'file' as the field name

                // Debug logging
                console.log('📤 Uploading document:', {
                  fleetUnitId,
                  documentType: doc.documentType,
                  documentNumber: doc.documentNumber,
                  fileName: file.name,
                  fileSize: file.size,
                  fileType: file.type
                });

                uploadPromises.push(createVehicleDocument(docFormData));
              }
            } else if (doc._id && doc.documentType) {
              // Update existing document - check if new files are added
              if (doc.files && doc.files.length > 0) {
                // If new files are added to existing document, create new document entries for each file
                for (const file of doc.files) {
                  const docFormData = new FormData();
                  docFormData.append('assetType', assetType);
                  docFormData.append('fleetUnitId', fleetUnitId);
                  docFormData.append('vehicleId', '');
                  docFormData.append('trailerId', '');
                  docFormData.append('documentType', doc.documentType);
                  if (doc.documentNumber) docFormData.append('documentNumber', doc.documentNumber);
                  if (doc.issuedAt) docFormData.append('issuedAt', doc.issuedAt);
                  if (doc.expiryDate) docFormData.append('expiryDate', doc.expiryDate);
                  docFormData.append('file', file);

                  uploadPromises.push(createVehicleDocument(docFormData));
                }
              }

              // Update existing document metadata (even if no new files)
              const docFormData = new FormData();
              docFormData.append('documentType', doc.documentType);
              if (doc.documentNumber) docFormData.append('documentNumber', doc.documentNumber);
              if (doc.issuedAt) docFormData.append('issuedAt', doc.issuedAt);
              if (doc.expiryDate) docFormData.append('expiryDate', doc.expiryDate);

              uploadPromises.push(updateVehicleDocument(doc._id, docFormData));
            }
          }

          // Wait for all document uploads to complete
          const uploadResults = await Promise.all(uploadPromises);
          console.log('✅ All documents uploaded:', uploadResults);

          // Check for any failed uploads
          const failedUploads = uploadResults.filter(result => !result?.success);
          if (failedUploads.length > 0) {
            console.error('❌ Some document uploads failed:', failedUploads);
            setNotification({
              type: 'error',
              message: `${failedUploads.length} document(s) failed to upload. Please check the console for details.`
            });
          }

          // After documents are uploaded, fetch the updated fleet unit with documents
          if (fleetUnitId && uploadResults.length > 0 && uploadResults.some(r => r?.success)) {
            try {
              const updatedUnitResponse = await getFleetUnitById(fleetUnitId);
              if (updatedUnitResponse?.success && updatedUnitResponse?.data) {
                console.log('✅ Fetched updated fleet unit with documents:', updatedUnitResponse.data);
                // Update the units list with the updated unit
                setUnits(prevUnits => {
                  const updatedUnits = prevUnits.map(unit =>
                    unit._id === fleetUnitId ? { ...updatedUnitResponse.data, documents: updatedUnitResponse.data.documents || [] } : unit
                  );
                  // If unit not found in list (newly created), add it
                  if (!updatedUnits.find(u => u._id === fleetUnitId)) {
                    updatedUnits.unshift({ ...updatedUnitResponse.data, documents: updatedUnitResponse.data.documents || [] });
                  }
                  return updatedUnits;
                });

                // Also update selectedUnitDetails if the details modal is open
                if (showUnitDetails && selectedUnitDetails && selectedUnitDetails._id === fleetUnitId) {
                  setSelectedUnitDetails({ ...updatedUnitResponse.data, documents: updatedUnitResponse.data.documents || [] });
                }
              }
            } catch (fetchError) {
              console.error('Error fetching updated fleet unit:', fetchError);
              // Continue with normal refresh
            }
          }
        } catch (docError) {
          console.error('Error uploading documents:', docError);
          setNotification({ type: 'error', message: 'Fleet unit saved but some documents failed to upload. Please add them manually.' });
        }
      }

      setShowAddModal(false);
      setShowEditModal(false);
      setSelectedUnit(null);
      resetForm();

      // Refresh the fleet units list to show updated documents
      // Pass fleetUnitId to refresh the unit details modal if it's open
      await loadFleetUnits(fleetUnitId || undefined);
    } catch (error: any) {
      const message = error?.response?.data?.message || error?.message || 'Failed to save fleet unit';
      setFormError(message);
      setNotification({ type: 'error', message });
    } finally {
      setSaving(false);
      setIsSubmitting(false);
    }
  };


  const handleConfirmDelete = async () => {
    if (!selectedUnit) return;
    setDeleting(true);
    try {
      const response = await apiDeleteFleetUnit(selectedUnit._id);
      if (!response?.success) {
        throw new Error(response?.message || 'Failed to delete fleet unit');
      }
      setNotification({ type: 'success', message: 'Fleet unit deleted successfully.' });
      setShowDeleteModal(false);
      setSelectedUnit(null);
      await loadFleetUnits();
    } catch (error: any) {
      const message = error?.response?.data?.message || error?.message || 'Failed to delete fleet unit';
      setNotification({ type: 'error', message });
    } finally {
      setDeleting(false);
    }
  };

  const truckTypes: TruckType[] = [
    'Semi-Truck',
    'Straight Truck',
    'Box Truck',
    'Flatbed',
    'Refrigerated Truck',
    'Dump Truck',
    'Tow Truck'
  ];

  const trailerTypes: TrailerType[] = [
    'Reefer Trailer',
    'Tri-Axle Trailer',
    'Dry Van',
    'Flatbed',
    'Step Deck',
    'Lowboy',
    'Tank Trailer',
    'Dump Trailer'
  ];
  const operationStatuses = ['available', 'in-transit', 'maintenance', 'idle'];

  // Helper function to format days display
  const formatDaysDisplay = (days: number): string => {
    if (!days || days <= 0) return '';
    if (days < 30) {
      return `${days} ${days === 1 ? 'day' : 'days'}`;
    } else if (days < 365) {
      const months = Math.floor(days / 30);
      const remainingDays = days % 30;
      if (remainingDays === 0) {
        return `${months} ${months === 1 ? 'month' : 'months'}`;
      }
      return `${months} ${months === 1 ? 'month' : 'months'} ${remainingDays} ${remainingDays === 1 ? 'day' : 'days'}`;
    } else {
      const years = Math.floor(days / 365);
      const remainingDays = days % 365;
      const months = Math.floor(remainingDays / 30);
      if (months === 0 && remainingDays === 0) {
        return `${years} ${years === 1 ? 'year' : 'years'}`;
      } else if (remainingDays === 0) {
        return `${years} ${years === 1 ? 'year' : 'years'} ${months} ${months === 1 ? 'month' : 'months'}`;
      }
      return `${years} ${years === 1 ? 'year' : 'years'} ${months} ${months === 1 ? 'month' : 'months'} ${remainingDays} ${remainingDays === 1 ? 'day' : 'days'}`;
    }
  };

  const activeCount = summary.activeUnits;
  const trucksCount = summary.trucks;
  const trailersCount = summary.trailers;
  const totalUnitsCount = summary.totalUnits;

  const StatCard = ({
    title,
    value,
    subtitle,
    icon: Icon,
    bgColor,
    iconColor
  }: {
    title: string;
    value: number | string;
    subtitle?: string;
    icon: React.ReactNode;
    bgColor: string;
    iconColor: string;
  }) => {
    return (
      <div className="bg-card rounded-lg p-3 shadow-sm hover:shadow-md transition-all border border-transparent hover:border-[var(--accent-blue)]/20">
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1">
            <h3 className="text-sm font-bold text-primary mb-1">{title}</h3>
            <div className="flex items-baseline gap-2 mb-0.5">
              <span className="text-xl font-bold text-primary">{value}</span>
            </div>
            {subtitle && <p className="text-xs text-secondary">{subtitle}</p>}
          </div>
          <div className={`${bgColor} rounded-lg p-2 shadow-sm`}>
            {React.isValidElement(Icon) ? React.cloneElement(Icon as React.ReactElement<any>, { className: iconColor, size: 21 }) : null}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen pb-10" style={{ backgroundColor: '#EDF8FF', ...ACCENT_VARS }}>
      <div className="relative w-full mx-auto p-2">


        <div className="relative z-10 px-4 pt-3 pb-6">
          {/* Header */}
          <div className="mb-4 relative z-10">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-black">Fleet Units</h1>
                <div className="flex items-center gap-2 text-black/90">
                  <span className="text-xs">Comprehensive management of all trucks and trailers</span>
                </div>
              </div>
              <button
                onClick={handleAddUnit}
                style={{ background: 'linear-gradient(to right, #016ab2, #063f6f)' }}
                className="flex items-center gap-2 px-4 py-2 !text-white rounded-lg shadow-sm transition-all font-bold text-sm"
              >
                <Plus className="w-5 h-5" />
                Add Fleet
              </button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 -mt-2 mb-4">
            <StatCard
              title="Total Units"
              value={totalUnitsCount}
              subtitle="All fleet units"
              icon={<Truck />}
              bgColor="bg-card"
              iconColor="text-[#00D1FF]"
            />
            <StatCard
              title="Active Units"
              value={activeCount}
              subtitle="Currently active"
              icon={<CheckCircle />}
              bgColor="bg-green-50"
              iconColor="text-green-600"
            />
            <StatCard
              title="Trucks"
              value={trucksCount}
              subtitle="Total trucks"
              icon={<Truck />}
              bgColor="bg-card"
              iconColor="text-[#00D1FF]"
            />
            <StatCard
              title="Trailers"
              value={trailersCount}
              subtitle="Total trailers"
              icon={<Truck />}
              bgColor="bg-card"
              iconColor="text-purple-600"
            />
          </div>
        </div>

        {/* Main Content */}
        <div className="w-full mx-auto px-4 -mt-4">
          {requiresCompanySetup && (
            <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-amber-800">
              Please complete your company settings to view and manage fleet units.
            </div>
          )}

          {notification && (
            <div
              className={`mb-4 rounded-lg border px-4 py-3 ${notification.type === 'success'
                ? 'border-green-200 bg-green-50 text-green-800'
                : 'border-red-200 bg-card text-red-800'
                }`}
            >
              {notification.message}
            </div>
          )}

          {error && !requiresCompanySetup && (
            <div className="mb-4 rounded-lg border border-red-200 bg-card px-4 py-3 text-red-700">
              {error}
            </div>
          )}

          {/* Tabs and Filters */}
          <div className="bg-card rounded-lg shadow-sm border border-theme">
            <div className="flex border-b border-theme">
              <button
                onClick={() => setActiveTab('all')}
                className={`flex-1 px-6 py-4 text-center font-medium transition-colors ${activeTab === 'all'
                  ? '!text-white border-b-2'
                  : 'text-secondary hover:bg-[rgba(255,255,255,0.03)]'
                  }`}
                style={activeTab === 'all' ? { background: 'linear-gradient(to right, #016ab2, #063f6f)', borderColor: '#016ab2' } : {}}
              >
                All Units ({totalUnitsCount})
              </button>
              <button
                onClick={() => setActiveTab('trucks')}
                className={`flex-1 px-6 py-4 text-center font-medium transition-colors ${activeTab === 'trucks'
                  ? '!text-white border-b-2'
                  : 'text-secondary hover:bg-[rgba(255,255,255,0.03)]'
                  }`}
                style={activeTab === 'trucks' ? { background: 'linear-gradient(to right, #016ab2, #063f6f)', borderColor: '#016ab2' } : {}}
              >
                Trucks ({trucksCount})
              </button>
              <button
                onClick={() => setActiveTab('trailers')}
                className={`flex-1 px-6 py-4 text-center font-medium transition-colors ${activeTab === 'trailers'
                  ? '!text-white border-b-2'
                  : 'text-secondary hover:bg-[rgba(255,255,255,0.03)]'
                  }`}
                style={activeTab === 'trailers' ? { background: 'linear-gradient(to right, #016ab2, #063f6f)', borderColor: '#016ab2' } : {}}
              >
                Trailers ({trailersCount})
              </button>
            </div>

            <div className="p-4 border-b border-theme">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div className="relative flex-1 max-w-md">
                  <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-secondary" />
                  <input
                    type="text"
                    placeholder="Search by unit number, make/model, plate, or VIN..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 w-full border border-theme rounded-lg focus:ring-2 focus:border-transparent"
                    style={{ '--tw-ring-color': '#016ab2' } as React.CSSProperties & { '--tw-ring-color': string }}
                    onFocus={(e) => { e.target.style.borderColor = '#016ab2'; e.target.style.boxShadow = '0 0 0 2px rgba(1, 106, 178, 0.2)'; }}
                    onBlur={(e) => { e.target.style.borderColor = ''; e.target.style.boxShadow = ''; }}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Filter className="w-5 h-5 text-secondary" />
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
                    className="px-4 py-2 border border-theme rounded-lg text-sm focus:ring-2 focus:border-transparent"
                    style={{ '--tw-ring-color': '#016ab2' } as React.CSSProperties & { '--tw-ring-color': string }}
                    onFocus={(e) => { e.target.style.borderColor = '#016ab2'; e.target.style.boxShadow = '0 0 0 2px rgba(1, 106, 178, 0.2)'; }}
                    onBlur={(e) => { e.target.style.borderColor = ''; e.target.style.boxShadow = ''; }}
                  >
                    <option value="all">All Status</option>
                    <option value="active">Active Only</option>
                    <option value="inactive">Inactive Only</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="text-white" style={{ background: 'linear-gradient(to right, #016ab2, #063f6f)' }}>
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold">Unit No.</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold">Type</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold">Make/Model</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold">VIN No.</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold">License Plate</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold">Year</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold">Odometer</th>
                    {activeTab === 'trailers' && (
                      <th className="px-6 py-4 text-left text-sm font-semibold">Capacity</th>
                    )}
                    <th className="px-6 py-4 text-left text-sm font-semibold">Status</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold">Comment</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold">Documents</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-theme">
                  {loading ? (
                    <tr>
                      <td colSpan={activeTab === 'trailers' ? 12 : 11} className="px-6 py-12 text-center text-secondary">
                        Loading fleet units...
                      </td>
                    </tr>
                  ) : units.length === 0 ? (
                    <tr>
                      <td colSpan={activeTab === 'trailers' ? 12 : 11} className="px-6 py-12 text-center text-secondary">
                        {requiresCompanySetup
                          ? 'Please complete your company settings to manage fleet units.'
                          : error || 'No units found'}
                      </td>
                    </tr>
                  ) : (
                    units.map((unit) => {
                      return (
                        <tr
                          key={unit._id}
                          className="hover:bg-[rgba(255,255,255,0.03)] transition-colors cursor-pointer"
                          onClick={async () => {
                            // Fetch the unit with documents to ensure we have the latest data
                            try {
                              console.log('📋 Fetching unit details for:', unit._id);
                              const unitResponse = await getFleetUnitById(unit._id);
                              console.log('📋 Unit response:', unitResponse);
                              if (unitResponse?.success && unitResponse?.data) {
                                const unitWithDocs = {
                                  ...unitResponse.data,
                                  documents: unitResponse.data.documents || []
                                };
                                console.log('📋 Unit with documents:', unitWithDocs);
                                console.log('📋 Documents count:', unitWithDocs.documents?.length || 0);
                                setSelectedUnitDetails(unitWithDocs);
                              } else {
                                // Fallback to unit from list if fetch fails
                                console.log('⚠️ Using unit from list (fetch failed)');
                                setSelectedUnitDetails(unit);
                              }
                            } catch (error) {
                              console.error('❌ Error fetching unit details:', error);
                              // Fallback to unit from list if fetch fails
                              setSelectedUnitDetails(unit);
                            }
                            setShowUnitDetails(true);
                          }}
                        >
                          <td className="px-6 py-4 font-medium text-primary">{unit.unitNo}</td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col gap-1">
                              <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${unit.unitType === 'Truck' ? 'bg-blue-100 text-blue-800' :
                                unit.unitType === 'Reefer Trailer' ? 'bg-green-100 text-green-800' :
                                  unit.unitType === 'Tri-Axle Trailer' ? 'bg-orange-100 text-orange-800' :
                                    unit.unitType === 'Dry Van' || unit.unitType === 'Trailer' ? 'bg-purple-100 text-purple-800' :
                                      unit.unitType === 'Flatbed' ? 'bg-indigo-100 text-indigo-800' :
                                        'bg-card text-primary'
                                }`}>
                                {unit.unitType}
                              </span>
                              {unit.truckType && unit.truckType !== unit.unitType && (
                                <span className="text-xs text-secondary">{unit.truckType}</span>
                              )}
                              {unit.trailerType && unit.trailerType !== unit.unitType && (
                                <span className="text-xs text-secondary">{unit.trailerType}</span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-primary">{unit.makeModel}</td>
                          <td className="px-6 py-4 text-secondary font-mono text-sm">{unit.vinNo}</td>
                          <td className="px-6 py-4 text-primary font-medium">
                            {unit.licensePlate}
                            {unit.source && (
                              <span className="ml-2 inline-flex items-center rounded-full bg-card px-2 py-0.5 text-xs text-secondary">
                                {unit.source === 'vehicle'
                                  ? 'Vehicle'
                                  : unit.source === 'trailer'
                                    ? 'Trailer'
                                    : 'Custom'}
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-primary">{unit.year || 'N/A'}</td>
                          <td className="px-6 py-4 text-primary">
                            {unit.currentOdometer !== undefined ? unit.currentOdometer.toLocaleString() : unit.initialOdometer.toLocaleString()} km
                          </td>
                          {activeTab === 'trailers' && (
                            <td className="px-6 py-4 text-primary">{unit.capacity || 'N/A'}</td>
                          )}
                          <td className="px-6 py-4">
                            <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${unit.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                              }`}>
                              {unit.status === 'Active' ? (
                                <><FaCheckCircle className="mr-1" size={12} /> Active</>
                              ) : (
                                <><XCircle className="mr-1" size={12} /> Inactive</>
                              )}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-secondary text-sm">
                            {unit.status === 'Inactive' && unit.reason ? (
                              <span className="text-primary">{unit.reason}</span>
                            ) : (
                              <span className="text-secondary">-</span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <FileText className="w-4 h-4 text-secondary" />
                              <span className="text-sm font-medium text-primary">
                                {unit.documents?.length || 0}
                              </span>
                              {unit.documents && unit.documents.length > 0 && (
                                <span className="text-xs text-secondary">
                                  ({unit.documents.filter((d: any) => d.status === 'completed' || !d.status).length} valid)
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                              <button
                                onClick={() => handleEditUnit(unit)}
                                className="p-2 text-[#00D1FF] hover:bg-blue-50 rounded-lg transition-colors"
                                title="Edit"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteUnit(unit)}
                                className="p-2 text-[#A855F7] hover:bg-red-50 rounded-lg transition-colors"
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Add/Edit Sidebar */}
      {(showAddModal || showEditModal) && (
        <>
          <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-[100] transition-all duration-500" onClick={() => {
            setShowAddModal(false);
            setShowEditModal(false);
            setSelectedUnit(null);
            resetForm();
          }} />
          <div className="fixed top-0 right-0 h-full w-full sm:w-[90vw] lg:w-[80vw] xl:w-[70vw] bg-card shadow-2xl transform transition-transform duration-500 ease-out z-[101] border-l border-theme">
            <div className="h-full flex flex-col">
              {/* Header - Fixed to top */}
              <div className="flex-shrink-0 px-6 py-4 flex items-center justify-between text-white" style={{ background: 'linear-gradient(to right, #016ab2, #063f6f)' }}>
                <h2 className="text-2xl font-bold">
                  {showAddModal ? 'Add New Unit' : showEditModal ? 'Edit Unit' : ''}
                </h2>
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    setShowEditModal(false);
                    setSelectedUnit(null);
                    resetForm();
                  }}
                  className="p-2 hover:bg-card/20 rounded-lg transition-colors"
                >
                  <FaTimes className="w-5 h-5" />
                </button>
              </div>

              {/* Step Indicator - Always show when modal is open */}
              {showAddModal && (
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
                        <span className="text-sm font-medium">Fleet Information</span>
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
                        <span className="text-sm font-medium">Fleet Documents</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              {showEditModal && (
                <div className="px-6 py-4 bg-card border-b border-theme">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentStep(1)}
                      style={
                        currentStep === 1
                          ? {
                            background: 'linear-gradient(to right, #016ab2, #063f6f)',
                          }
                          : undefined
                      }
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${currentStep === 1
                        ? '!text-white shadow-sm'
                        : 'bg-card text-primary border border-theme hover:bg-[rgba(255,255,255,0.03)]'
                        }`}
                    >
                      Fleet Information
                    </button>

                    <button
                      onClick={() => setCurrentStep(2)}
                      style={
                        currentStep === 2
                          ? {
                            background: 'linear-gradient(to right, #016ab2, #063f6f)',
                          }
                          : undefined
                      }
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${currentStep === 2
                        ? '!text-white shadow-sm'
                        : 'bg-card text-primary border border-theme hover:bg-[rgba(255,255,255,0.03)]'
                        }`}
                    >
                      Fleet Documents ({fleetDocuments.length})
                    </button>
                  </div>
                </div>
              )}

              {/* Content - Scrollable */}
              <div className="flex-1 overflow-y-auto p-6">
                {formError && (
                  <div className="mb-4 rounded-lg border border-red-200 bg-card px-4 py-2 text-sm text-red-700">
                    {formError}
                  </div>
                )}
                {currentStep === 2 ? (
                  /* Step 2: Fleet Documents */
                  <div className="space-y-4 min-h-[400px]">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-2 font-semibold text-xl" style={{ color: ACCENT_PRIMARY }}>
                        <FileText size={24} />
                        <span>Fleet Documents</span>
                      </div>
                      <button
                        onClick={addDocument}
                        className="px-3 py-1.5 text-sm bg-card text-[#00D1FF] rounded-lg hover:bg-blue-100 transition-colors flex items-center gap-2"
                      >
                        <Plus size={16} />
                        Add Document
                      </button>
                    </div>

                    {fleetDocuments.length === 0 ? (
                      <div className="text-center py-8 border-2 border-dashed border-theme rounded-lg">
                        <FileText className="w-12 h-12 text-secondary mx-auto mb-3" />
                        <p className="text-secondary mb-2">No documents added yet</p>
                        <p className="text-sm text-secondary mb-4">Click "Add Document" to upload fleet documents</p>
                        <button
                          onClick={addDocument}
                          className="px-4 py-2 !text-white rounded-lg hover:opacity-90 transition-colors"
                          style={{ background: 'linear-gradient(to right, #016ab2, #063f6f)' }}
                        >
                          Add First Document
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {fleetDocuments.map((doc, index) => (
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
                                  {VEHICLE_DOCUMENT_TYPES.map((type) => (
                                    <option key={type} value={type}>{type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</option>
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

                              </div>

                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <label className="block text-sm font-medium text-primary mb-1">Issue Date</label>
                                  <input
                                    type="date"
                                    value={doc.issuedAt}
                                    onChange={(e) => updateDocument(index, 'issuedAt', e.target.value)}
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
                                <label className="block text-sm font-medium text-primary mb-1">
                                  Document File(s) {!doc._id && <span className="text-red-500">*</span>}
                                </label>
                                <input
                                  type="file"
                                  multiple
                                  onChange={(e) => handleDocumentFileChange(index, e.target.files)}
                                  className="w-full px-3 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.txt"
                                />
                                {doc.files && doc.files.length > 0 && (
                                  <div className="mt-2 space-y-1">
                                    {doc.files.map((file, fileIndex) => (
                                      <p key={fileIndex} className="text-xs text-green-600 flex items-center gap-1">
                                        <CheckCircle size={12} />
                                        Selected: {file.name} ({(file.size / 1024).toFixed(2)} KB)
                                      </p>
                                    ))}
                                  </div>
                                )}
                                {doc._id && (!doc.files || doc.files.length === 0) && (
                                  <p className="text-xs mt-1 text-secondary">
                                    Leave empty to keep existing file(s), or select new file(s) to add
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
                  /* Step 1: Fleet Information */
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-primary mb-2">Unit No. *</label>
                      <input
                        type="text"
                        value={formData.unitNo}
                        onChange={(e) => setFormData({ ...formData, unitNo: e.target.value })}
                        className="w-full px-4 py-2 border border-theme rounded-lg focus:ring-2 focus:border-transparent"
                        style={{ '--tw-ring-color': '#016ab2' } as React.CSSProperties & { '--tw-ring-color': string }}
                        onFocus={(e) => { e.target.style.borderColor = '#016ab2'; e.target.style.boxShadow = '0 0 0 2px rgba(1, 106, 178, 0.2)'; }}
                        onBlur={(e) => { e.target.style.borderColor = ''; e.target.style.boxShadow = ''; }}
                        placeholder="e.g., 1001, BRV001"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-primary mb-2">Internal ID</label>
                      <input
                        type="text"
                        value={formData.internalId}
                        onChange={(e) => setFormData({ ...formData, internalId: e.target.value })}
                        className="w-full px-4 py-2 border border-theme rounded-lg focus:ring-2 focus:border-transparent"
                        style={{ '--tw-ring-color': '#016ab2' } as React.CSSProperties & { '--tw-ring-color': string }}
                        onFocus={(e) => { e.target.style.borderColor = '#016ab2'; e.target.style.boxShadow = '0 0 0 2px rgba(1, 106, 178, 0.2)'; }}
                        onBlur={(e) => { e.target.style.borderColor = ''; e.target.style.boxShadow = ''; }}
                        placeholder="e.g., INT-001, GEO-123"
                      />
                      <p className="text-xs text-secondary mt-1">Optional: For Termoking (trailers), Geotab/Samsara (trucks) or other tracking system integration</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-primary mb-2">Unit Type *</label>
                      <select
                        value={formData.unitType}
                        onChange={(e) => setFormData({ ...formData, unitType: e.target.value as UnitType })}
                        className="w-full px-4 py-2 border border-theme rounded-lg focus:ring-2 focus:border-transparent"
                        style={{ '--tw-ring-color': '#016ab2' } as React.CSSProperties & { '--tw-ring-color': string }}
                        onFocus={(e) => { e.target.style.borderColor = '#016ab2'; e.target.style.boxShadow = '0 0 0 2px rgba(1, 106, 178, 0.2)'; }}
                        onBlur={(e) => { e.target.style.borderColor = ''; e.target.style.boxShadow = ''; }}
                      >
                        <option value="Truck">Truck</option>
                        <option value="Trailer">Trailer</option>

                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-primary mb-2">Make/Model *</label>
                      <input
                        type="text"
                        value={formData.makeModel}
                        onChange={(e) => setFormData({ ...formData, makeModel: e.target.value })}
                        className="w-full px-4 py-2 border border-theme rounded-lg focus:ring-2 focus:border-transparent"
                        style={{ '--tw-ring-color': '#016ab2' } as React.CSSProperties & { '--tw-ring-color': string }}
                        onFocus={(e) => { e.target.style.borderColor = '#016ab2'; e.target.style.boxShadow = '0 0 0 2px rgba(1, 106, 178, 0.2)'; }}
                        onBlur={(e) => { e.target.style.borderColor = ''; e.target.style.boxShadow = ''; }}
                        placeholder="e.g., Kenworth T680"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-primary mb-2">VIN No. *</label>
                      <input
                        type="text"
                        value={formData.vinNo}
                        onChange={(e) => setFormData({ ...formData, vinNo: e.target.value })}
                        className="w-full px-4 py-2 border border-theme rounded-lg focus:ring-2 focus:border-transparent font-mono"
                        style={{ '--tw-ring-color': '#016ab2' } as React.CSSProperties & { '--tw-ring-color': string }}
                        onFocus={(e) => { e.target.style.borderColor = '#016ab2'; e.target.style.boxShadow = '0 0 0 2px rgba(1, 106, 178, 0.2)'; }}
                        onBlur={(e) => { e.target.style.borderColor = ''; e.target.style.boxShadow = ''; }}
                        placeholder="17-character VIN"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-primary mb-2">License Plate *</label>
                      <input
                        type="text"
                        value={formData.licensePlate}
                        onChange={(e) => setFormData({ ...formData, licensePlate: e.target.value })}
                        className="w-full px-4 py-2 border border-theme rounded-lg focus:ring-2 focus:border-transparent"
                        style={{ '--tw-ring-color': '#016ab2' } as React.CSSProperties & { '--tw-ring-color': string }}
                        onFocus={(e) => { e.target.style.borderColor = '#016ab2'; e.target.style.boxShadow = '0 0 0 2px rgba(1, 106, 178, 0.2)'; }}
                        onBlur={(e) => { e.target.style.borderColor = ''; e.target.style.boxShadow = ''; }}
                        placeholder="e.g., BRV-1001"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-primary mb-2">Year</label>
                      <input
                        type="number"
                        value={formData.year}
                        onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                        className="w-full px-4 py-2 border border-theme rounded-lg focus:ring-2 focus:border-transparent"
                        style={{ '--tw-ring-color': '#016ab2' } as React.CSSProperties & { '--tw-ring-color': string }}
                        onFocus={(e) => { e.target.style.borderColor = '#016ab2'; e.target.style.boxShadow = '0 0 0 2px rgba(1, 106, 178, 0.2)'; }}
                        onBlur={(e) => { e.target.style.borderColor = ''; e.target.style.boxShadow = ''; }}
                        min="1900"
                        max={new Date().getFullYear() + 1}
                      />
                    </div>
                    {formData.unitType === 'Truck' && (
                      <div>
                        <label className="block text-sm font-medium text-primary mb-2">Truck Type</label>
                        <select
                          value={formData.truckType}
                          onChange={(e) => setFormData({ ...formData, truckType: e.target.value as TruckType })}
                          className="w-full px-4 py-2 border border-theme rounded-lg focus:ring-2 focus:border-transparent"
                          style={{ '--tw-ring-color': '#016ab2' } as React.CSSProperties & { '--tw-ring-color': string }}
                          onFocus={(e) => { e.target.style.borderColor = '#016ab2'; e.target.style.boxShadow = '0 0 0 2px rgba(1, 106, 178, 0.2)'; }}
                          onBlur={(e) => { e.target.style.borderColor = ''; e.target.style.boxShadow = ''; }}
                        >
                          {truckTypes.map(type => (
                            <option key={type} value={type}>{type}</option>
                          ))}
                        </select>
                      </div>
                    )}
                    {formData.unitType !== 'Truck' && (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-primary mb-2">Trailer Type</label>
                          <select
                            value={formData.trailerType}
                            onChange={(e) => setFormData({ ...formData, trailerType: e.target.value as TrailerType })}
                            className="w-full px-4 py-2 border border-theme rounded-lg focus:ring-2 focus:border-transparent"
                            style={{ '--tw-ring-color': '#016ab2' } as React.CSSProperties & { '--tw-ring-color': string }}
                            onFocus={(e) => { e.target.style.borderColor = '#016ab2'; e.target.style.boxShadow = '0 0 0 2px rgba(1, 106, 178, 0.2)'; }}
                            onBlur={(e) => { e.target.style.borderColor = ''; e.target.style.boxShadow = ''; }}
                          >
                            {trailerTypes.map(type => (
                              <option key={type} value={type}>{type}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-primary mb-2">Capacity</label>
                          <input
                            type="text"
                            value={formData.capacity}
                            onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                            className="w-full px-4 py-2 border border-theme rounded-lg focus:ring-2 focus:border-transparent"
                            style={{ '--tw-ring-color': '#016ab2' } as React.CSSProperties & { '--tw-ring-color': string }}
                            onFocus={(e) => { e.target.style.borderColor = '#016ab2'; e.target.style.boxShadow = '0 0 0 2px rgba(1, 106, 178, 0.2)'; }}
                            onBlur={(e) => { e.target.style.borderColor = ''; e.target.style.boxShadow = ''; }}
                            placeholder="e.g., 53 ft"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-primary mb-2">Operation Status</label>
                          <select
                            value={formData.operationStatus}
                            onChange={(e) => setFormData({ ...formData, operationStatus: e.target.value })}
                            className="w-full px-4 py-2 border border-theme rounded-lg focus:ring-2 focus:border-transparent"
                            style={{ '--tw-ring-color': '#016ab2' } as React.CSSProperties & { '--tw-ring-color': string }}
                            onFocus={(e) => { e.target.style.borderColor = '#016ab2'; e.target.style.boxShadow = '0 0 0 2px rgba(1, 106, 178, 0.2)'; }}
                            onBlur={(e) => { e.target.style.borderColor = ''; e.target.style.boxShadow = ''; }}
                          >
                            {operationStatuses.map((status) => (
                              <option key={status} value={status}>
                                {status.replace('-', ' ')}
                              </option>
                            ))}
                          </select>
                        </div>
                      </>
                    )}
                    <div>
                      <label className="block text-sm font-medium text-primary mb-2">Initial Odometer/Hour *</label>
                      <input
                        type="number"
                        value={formData.initialOdometer}
                        onChange={(e) => setFormData({ ...formData, initialOdometer: e.target.value })}
                        className="w-full px-4 py-2 border border-theme rounded-lg focus:ring-2 focus:border-transparent"
                        style={{ '--tw-ring-color': '#016ab2' } as React.CSSProperties & { '--tw-ring-color': string }}
                        onFocus={(e) => { e.target.style.borderColor = '#016ab2'; e.target.style.boxShadow = '0 0 0 2px rgba(1, 106, 178, 0.2)'; }}
                        onBlur={(e) => { e.target.style.borderColor = ''; e.target.style.boxShadow = ''; }}
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-primary mb-2">Current Odometer/Hour</label>
                      <input
                        type="number"
                        value={formData.currentOdometer}
                        onChange={(e) => setFormData({ ...formData, currentOdometer: e.target.value })}
                        className="w-full px-4 py-2 border border-theme rounded-lg focus:ring-2 focus:border-transparent"
                        style={{ '--tw-ring-color': '#016ab2' } as React.CSSProperties & { '--tw-ring-color': string }}
                        onFocus={(e) => { e.target.style.borderColor = '#016ab2'; e.target.style.boxShadow = '0 0 0 2px rgba(1, 106, 178, 0.2)'; }}
                        onBlur={(e) => { e.target.style.borderColor = ''; e.target.style.boxShadow = ''; }}
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-primary mb-2">
                        Service Interval (Days)
                        {formData.serviceIntervalDays && (
                          <span className="ml-2 text-xs font-normal text-secondary">
                            ({formatDaysDisplay(Number(formData.serviceIntervalDays))})
                          </span>
                        )}
                      </label>
                      <input
                        type="number"
                        value={formData.serviceIntervalDays}
                        onChange={(e) => setFormData({ ...formData, serviceIntervalDays: e.target.value })}
                        className="w-full px-4 py-2 border border-theme rounded-lg focus:ring-2 focus:border-transparent"
                        style={{ '--tw-ring-color': '#016ab2' } as React.CSSProperties & { '--tw-ring-color': string }}
                        onFocus={(e) => { e.target.style.borderColor = '#016ab2'; e.target.style.boxShadow = '0 0 0 2px rgba(1, 106, 178, 0.2)'; }}
                        onBlur={(e) => { e.target.style.borderColor = ''; e.target.style.boxShadow = ''; }}
                        placeholder="e.g., 90"
                        min="0"
                      />
                      <p className="text-xs text-secondary mt-1">Service due after X days</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-primary mb-2">Service Interval (Mileage)</label>
                      <input
                        type="number"
                        value={formData.serviceIntervalMileage}
                        onChange={(e) => setFormData({ ...formData, serviceIntervalMileage: e.target.value })}
                        className="w-full px-4 py-2 border border-theme rounded-lg focus:ring-2 focus:border-transparent"
                        style={{ '--tw-ring-color': '#016ab2' } as React.CSSProperties & { '--tw-ring-color': string }}
                        onFocus={(e) => { e.target.style.borderColor = '#016ab2'; e.target.style.boxShadow = '0 0 0 2px rgba(1, 106, 178, 0.2)'; }}
                        onBlur={(e) => { e.target.style.borderColor = ''; e.target.style.boxShadow = ''; }}
                        placeholder="e.g., 2000"
                        min="0"
                      />
                      <p className="text-xs text-secondary mt-1">Service due after X kilometers</p>
                    </div>
                    <div className="md:col-span-2">
                      <h3 className="text-sm font-medium text-primary mb-3">Safety Information</h3>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-primary mb-2">Safety Expiry Date</label>
                      <input
                        type="date"
                        value={formData.safetyExpiryDate}
                        onChange={(e) => setFormData({ ...formData, safetyExpiryDate: e.target.value })}
                        className="w-full px-4 py-2 border border-theme rounded-lg focus:ring-2 focus:border-transparent"
                        style={{ '--tw-ring-color': '#016ab2' } as React.CSSProperties & { '--tw-ring-color': string }}
                        onFocus={(e) => { e.target.style.borderColor = '#016ab2'; e.target.style.boxShadow = '0 0 0 2px rgba(1, 106, 178, 0.2)'; }}
                        onBlur={(e) => { e.target.style.borderColor = ''; e.target.style.boxShadow = ''; }}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-primary mb-2">Safety Decal Number</label>
                      <input
                        type="text"
                        value={formData.safetyDecalNumber}
                        onChange={(e) => setFormData({ ...formData, safetyDecalNumber: e.target.value })}
                        className="w-full px-4 py-2 border border-theme rounded-lg focus:ring-2 focus:border-transparent"
                        style={{ '--tw-ring-color': '#016ab2' } as React.CSSProperties & { '--tw-ring-color': string }}
                        onFocus={(e) => { e.target.style.borderColor = '#016ab2'; e.target.style.boxShadow = '0 0 0 2px rgba(1, 106, 178, 0.2)'; }}
                        onBlur={(e) => { e.target.style.borderColor = ''; e.target.style.boxShadow = ''; }}
                        placeholder="e.g., DEC-123456"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-primary mb-2">Safety Paper Number</label>
                      <input
                        type="text"
                        value={formData.safetyPaperNumber}
                        onChange={(e) => setFormData({ ...formData, safetyPaperNumber: e.target.value })}
                        className="w-full px-4 py-2 border border-theme rounded-lg focus:ring-2 focus:border-transparent"
                        style={{ '--tw-ring-color': '#016ab2' } as React.CSSProperties & { '--tw-ring-color': string }}
                        onFocus={(e) => { e.target.style.borderColor = '#016ab2'; e.target.style.boxShadow = '0 0 0 2px rgba(1, 106, 178, 0.2)'; }}
                        onBlur={(e) => { e.target.style.borderColor = ''; e.target.style.boxShadow = ''; }}
                        placeholder="e.g., PAP-789012"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-primary mb-2">Last Inspection Shop</label>
                      <input
                        type="text"
                        value={formData.lastInspectionShop}
                        onChange={(e) => setFormData({ ...formData, lastInspectionShop: e.target.value })}
                        className="w-full px-4 py-2 border border-theme rounded-lg focus:ring-2 focus:border-transparent"
                        style={{ '--tw-ring-color': '#016ab2' } as React.CSSProperties & { '--tw-ring-color': string }}
                        onFocus={(e) => { e.target.style.borderColor = '#016ab2'; e.target.style.boxShadow = '0 0 0 2px rgba(1, 106, 178, 0.2)'; }}
                        onBlur={(e) => { e.target.style.borderColor = ''; e.target.style.boxShadow = ''; }}
                        placeholder="e.g., ABC Auto Shop"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-primary mb-2">Last Inspection Invoice</label>
                      <input
                        type="text"
                        value={formData.lastInspectionInvoice}
                        onChange={(e) => setFormData({ ...formData, lastInspectionInvoice: e.target.value })}
                        className="w-full px-4 py-2 border border-theme rounded-lg focus:ring-2 focus:border-transparent"
                        style={{ '--tw-ring-color': '#016ab2' } as React.CSSProperties & { '--tw-ring-color': string }}
                        onFocus={(e) => { e.target.style.borderColor = '#016ab2'; e.target.style.boxShadow = '0 0 0 2px rgba(1, 106, 178, 0.2)'; }}
                        onBlur={(e) => { e.target.style.borderColor = ''; e.target.style.boxShadow = ''; }}
                        placeholder="e.g., INV-456789"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-primary mb-2">Status</label>
                      <select
                        value={formData.status}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value as UnitStatus })}
                        className="w-full px-4 py-2 border border-theme rounded-lg focus:ring-2 focus:border-transparent"
                        style={{ '--tw-ring-color': '#016ab2' } as React.CSSProperties & { '--tw-ring-color': string }}
                        onFocus={(e) => { e.target.style.borderColor = '#016ab2'; e.target.style.boxShadow = '0 0 0 2px rgba(1, 106, 178, 0.2)'; }}
                        onBlur={(e) => { e.target.style.borderColor = ''; e.target.style.boxShadow = ''; }}
                      >
                        <option value="Active">Active</option>
                        <option value="Inactive">Inactive</option>
                      </select>
                    </div>
                    <div className="md:col-span-2">
                      <h3 className="text-sm font-medium text-primary mb-3">Current Location</h3>
                      <div>
                        <label className="block text-sm font-medium text-primary mb-2">
                          Address
                        </label>
                        <div className="relative">
                          <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-secondary" />
                          <input
                            type="text"
                            value={formData.address}
                            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                            className="pl-10 w-full px-4 py-2 border border-theme rounded-lg focus:ring-2 focus:border-transparent"
                            style={{ '--tw-ring-color': '#016ab2' } as React.CSSProperties & { '--tw-ring-color': string }}
                            onFocus={(e) => { e.target.style.borderColor = '#016ab2'; e.target.style.boxShadow = '0 0 0 2px rgba(1, 106, 178, 0.2)'; }}
                            onBlur={(e) => { e.target.style.borderColor = ''; e.target.style.boxShadow = ''; }}
                            placeholder="123 Main St, City, State, Country"
                          />
                        </div>
                        <p className="text-xs text-secondary mt-1">
                          Coordinates will be automatically fetched from this address using Google Maps
                        </p>
                      </div>
                    </div>
                    {formData.status === 'Inactive' && (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-primary mb-2">Last Date *</label>
                          <input
                            type="date"
                            value={formData.lastDate}
                            onChange={(e) => setFormData({ ...formData, lastDate: e.target.value })}
                            className="w-full px-4 py-2 border border-theme rounded-lg focus:ring-2 focus:border-transparent"
                            style={{ '--tw-ring-color': '#016ab2' } as React.CSSProperties & { '--tw-ring-color': string }}
                            onFocus={(e) => { e.target.style.borderColor = '#016ab2'; e.target.style.boxShadow = '0 0 0 2px rgba(1, 106, 178, 0.2)'; }}
                            onBlur={(e) => { e.target.style.borderColor = ''; e.target.style.boxShadow = ''; }}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-primary mb-2">Reason/Comment *</label>
                          <input
                            type="text"
                            value={formData.reason}
                            onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                            className="w-full px-4 py-2 border border-theme rounded-lg focus:ring-2 focus:border-transparent"
                            style={{ '--tw-ring-color': '#016ab2' } as React.CSSProperties & { '--tw-ring-color': string }}
                            onFocus={(e) => { e.target.style.borderColor = '#016ab2'; e.target.style.boxShadow = '0 0 0 2px rgba(1, 106, 178, 0.2)'; }}
                            onBlur={(e) => { e.target.style.borderColor = ''; e.target.style.boxShadow = ''; }}
                            placeholder="SOLD, Rental returned, Scrapped, etc."
                          />
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Footer - Fixed to bottom */}
              <div className="flex-shrink-0 bg-card px-6 py-4 flex justify-between gap-3 border-t border-theme">
                <div className="flex gap-3">
                  {currentStep === 2 && (
                    <button
                      onClick={() => setCurrentStep(1)}
                      className="px-6 py-2 border border-theme rounded-lg text-primary hover:bg-[rgba(255,255,255,0.03)] transition-colors"
                    >
                      Back
                    </button>
                  )}
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowAddModal(false);
                      setShowEditModal(false);
                      setSelectedUnit(null);
                      resetForm();
                    }}
                    className="px-6 py-2 border border-theme rounded-lg text-primary hover:bg-[rgba(255,255,255,0.03)] transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveUnit}
                    disabled={saving || isSubmitting}
                    className={`px-6 py-2 !text-white rounded-lg transition-colors ${saving || isSubmitting ? 'opacity-60 cursor-not-allowed' : 'hover:opacity-90'
                      }`}
                    style={{ background: 'linear-gradient(to right, #016ab2, #063f6f)' }}
                  >
                    {(() => {
                      if (saving || isSubmitting) return 'Saving...';
                      if (showAddModal) {
                        if (currentStep === 1) return 'Continue to Documents';
                        if (currentStep === 2) return 'Add Fleet';
                      }
                      if (showEditModal) {
                        if (currentStep === 1) return 'Continue to Documents';
                        if (currentStep === 2) return 'Save Changes';
                      }
                      return 'Save Changes';
                    })()}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Unit Details Modal with Horizontal Scrollbar */}
      {showUnitDetails && selectedUnitDetails && (
        <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-[10001] flex items-center justify-center p-4">
          <div className="bg-card rounded-xl max-w-6xl w-full max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
            <div className="sticky top-0 bg-card border-b border-theme px-6 py-4 flex items-center justify-between z-10">
              <div className="flex items-center space-x-3">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg"
                  style={{ background: 'linear-gradient(to right, #016ab2, #063f6f)' }}
                >
                  <Truck className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-primary">{selectedUnitDetails.unitNo}</h2>
                  <p className="text-sm text-secondary">{selectedUnitDetails.makeModel}</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowUnitDetails(false);
                  setSelectedUnitDetails(null);
                }}
                className="text-secondary hover:text-secondary transition-colors"
              >
                <FaTimes className="w-6 h-6" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-6">
                {/* Fleet Unit Information */}
                <div>
                  <h3 className="text-lg font-semibold text-primary mb-4 flex items-center gap-2">
                    <Truck className="w-5 h-5" style={{ color: ACCENT_PRIMARY }} />
                    <span>Fleet Unit Information</span>
                  </h3>
                  <div className="overflow-x-auto">
                    <div className="min-w-[800px] grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-secondary mb-1">Unit Number</p>
                        <p className="text-sm font-medium text-primary">{selectedUnitDetails.unitNo}</p>
                      </div>
                      <div>
                        <p className="text-sm text-secondary mb-1">Internal ID</p>
                        <p className="text-sm font-medium text-primary">{selectedUnitDetails.internalId || '-'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-secondary mb-1">Unit Type</p>
                        <p className="text-sm font-medium text-primary">{selectedUnitDetails.unitType}</p>
                      </div>
                      <div>
                        <p className="text-sm text-secondary mb-1">Make/Model</p>
                        <p className="text-sm font-medium text-primary">{selectedUnitDetails.makeModel}</p>
                      </div>
                      <div>
                        <p className="text-sm text-secondary mb-1">VIN Number</p>
                        <p className="text-sm font-medium text-primary font-mono">{selectedUnitDetails.vinNo}</p>
                      </div>
                      <div>
                        <p className="text-sm text-secondary mb-1">License Plate</p>
                        <p className="text-sm font-medium text-primary">{selectedUnitDetails.licensePlate}</p>
                      </div>
                      <div>
                        <p className="text-sm text-secondary mb-1">Year</p>
                        <p className="text-sm font-medium text-primary">{selectedUnitDetails.year || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-secondary mb-1">Status</p>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${selectedUnitDetails.status === 'Active'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                          }`}>
                          {selectedUnitDetails.status}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm text-secondary mb-1">Initial Odometer</p>
                        <p className="text-sm font-medium text-primary">{selectedUnitDetails.initialOdometer?.toLocaleString() || '0'} km</p>
                      </div>
                      <div>
                        <p className="text-sm text-secondary mb-1">Current Odometer</p>
                        <p className="text-sm font-medium text-primary">
                          {(selectedUnitDetails.currentOdometer ?? selectedUnitDetails.initialOdometer ?? 0).toLocaleString()} km
                        </p>
                      </div>
                      {selectedUnitDetails.unitType !== 'Truck' && (
                        <>
                          <div>
                            <p className="text-sm text-secondary mb-1">Capacity</p>
                            <p className="text-sm font-medium text-primary">{selectedUnitDetails.capacity || 'N/A'}</p>
                          </div>
                          <div>
                            <p className="text-sm text-secondary mb-1">Operation Status</p>
                            <p className="text-sm font-medium text-primary">{selectedUnitDetails.operationStatus || 'N/A'}</p>
                          </div>
                        </>
                      )}
                      {selectedUnitDetails.currentLocation?.address && (
                        <div className="col-span-2">
                          <p className="text-sm text-secondary mb-1">Current Location</p>
                          <p className="text-sm font-medium text-primary">{selectedUnitDetails.currentLocation.address}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Documents Section */}
                <div>
                  <h3 className="text-lg font-semibold text-primary mb-4 flex items-center gap-2">
                    <FileText className="w-5 h-5" style={{ color: ACCENT_PRIMARY }} />
                    <span>Documents ({selectedUnitDetails.documents?.length || 0})</span>
                  </h3>
                  {!selectedUnitDetails.documents || selectedUnitDetails.documents.length === 0 ? (
                    <div className="text-center py-8 border-2 border-dashed border-theme rounded-lg">
                      <FileText className="w-12 h-12 text-secondary mx-auto mb-3" />
                      <p className="text-secondary">No documents uploaded for this fleet unit</p>
                    </div>
                  ) : (
                    <>
                      <style>{`
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
                        <table className="w-full" style={{ minWidth: '1200px' }}>
                          <thead className="bg-card border-b border-theme">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-semibold text-secondary uppercase">Document Type</th>
                              <th className="px-6 py-3 text-left text-xs font-semibold text-secondary uppercase">Document Number</th>
                              <th className="px-6 py-3 text-left text-xs font-semibold text-secondary uppercase">Issue Date</th>
                              <th className="px-6 py-3 text-left text-xs font-semibold text-secondary uppercase">Expiry Date</th>
                              <th className="px-6 py-3 text-left text-xs font-semibold text-secondary uppercase">Status</th>
                              <th className="px-6 py-3 text-left text-xs font-semibold text-secondary uppercase">File Name</th>
                              <th className="px-6 py-3 text-left text-xs font-semibold text-secondary uppercase">File Size</th>
                              <th className="px-6 py-3 text-left text-xs font-semibold text-secondary uppercase">Uploaded Date</th>
                              <th className="px-6 py-3 text-left text-xs font-semibold text-secondary uppercase">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-theme">
                            {selectedUnitDetails.documents.map((doc: any, index: number) => {
                              const file = doc.files && doc.files.length > 0 ? doc.files[0] : null;
                              const formatFileSize = (bytes: number) => {
                                if (bytes === 0) return '0 Bytes';
                                const k = 1024;
                                const sizes = ['Bytes', 'KB', 'MB', 'GB'];
                                const i = Math.floor(Math.log(bytes) / Math.log(k));
                                return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
                              };
                              return (
                                <tr key={doc._id || index} className="hover:bg-[rgba(255,255,255,0.03)]">
                                  <td className="px-6 py-4">
                                    <div className="flex items-center space-x-2">
                                      <FileText className="w-4 h-4 text-secondary" />
                                      <span className="text-sm font-medium text-primary">
                                        {doc.documentType?.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                                      </span>
                                    </div>
                                  </td>
                                  <td className="px-6 py-4">
                                    <span className="text-sm text-secondary">{doc.documentNumber || '-'}</span>
                                  </td>
                                  <td className="px-6 py-4">
                                    <span className="text-sm text-secondary">
                                      {doc.issuedAt ? new Date(doc.issuedAt).toLocaleDateString() : '-'}
                                    </span>
                                  </td>
                                  <td className="px-6 py-4">
                                    <span className={`text-sm ${!doc.expiryDate ? 'text-secondary' : 'text-secondary'}`}>
                                      {doc.expiryDate ? new Date(doc.expiryDate).toLocaleDateString() : '-'}
                                    </span>
                                  </td>
                                  <td className="px-6 py-4">
                                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${doc.status === 'completed' || !doc.status
                                        ? 'bg-green-100 text-green-800'
                                        : doc.status === 'pending'
                                          ? 'bg-yellow-100 text-yellow-800'
                                          : doc.status === 'expired'
                                            ? 'bg-red-100 text-red-800'
                                            : 'bg-card text-primary'
                                      }`}>
                                      {doc.status || 'completed'}
                                    </span>
                                  </td>
                                  <td className="px-6 py-4">
                                    <span className="text-sm text-secondary" title={file?.fileName || '-'}>
                                      {file?.fileName ? (file.fileName.length > 30 ? file.fileName.substring(0, 30) + '...' : file.fileName) : '-'}
                                    </span>
                                  </td>
                                  <td className="px-6 py-4">
                                    <span className="text-sm text-secondary">
                                      {file?.fileSize ? formatFileSize(file.fileSize) : '-'}
                                    </span>
                                  </td>
                                  <td className="px-6 py-4">
                                    <span className="text-sm text-secondary">
                                      {file?.uploadedAt ? new Date(file.uploadedAt).toLocaleDateString() : '-'}
                                    </span>
                                  </td>
                                  <td className="px-6 py-4">
                                    <div className="flex items-center space-x-2">
                                      {file && (
                                        <>
                                          <button
                                            onClick={async (e) => {
                                              e.stopPropagation();
                                              try {
                                                const { getSignedVehicleDocumentUrl } = await import('../../../../axios/api/compilance.vehicledoc');
                                                const signedRes = await getSignedVehicleDocumentUrl(doc._id, 0, 'attachment');
                                                const url = signedRes?.success && signedRes?.url ? signedRes.url : file.fileUrl;
                                                if (url) {
                                                  const link = window.document.createElement('a');
                                                  link.href = url;
                                                  link.download = file.fileName || 'document';
                                                  link.target = '_blank';
                                                  window.document.body.appendChild(link);
                                                  link.click();
                                                  window.document.body.removeChild(link);
                                                }
                                              } catch (error) {
                                                console.error('Download error:', error);
                                              }
                                            }}
                                            className="p-1.5 hover:bg-green-50 rounded text-green-600"
                                            title="Download"
                                          >
                                            <Download className="w-4 h-4" />
                                          </button>
                                          <button
                                            onClick={async (e) => {
                                              e.stopPropagation();
                                              try {
                                                const { getSignedVehicleDocumentUrl } = await import('../../../../axios/api/compilance.vehicledoc');
                                                const signedRes = await getSignedVehicleDocumentUrl(doc._id, 0, 'inline');
                                                const url = signedRes?.success && signedRes?.url ? signedRes.url : file.fileUrl;
                                                if (url) {
                                                  window.open(url, '_blank', 'noopener,noreferrer');
                                                }
                                              } catch (error) {
                                                console.error('View error:', error);
                                              }
                                            }}
                                            className="p-1.5 hover:bg-blue-50 rounded text-[#00D1FF]"
                                            title="View"
                                          >
                                            <FileText className="w-4 h-4" />
                                          </button>
                                        </>
                                      )}
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleEditDocument(doc);
                                        }}
                                        className="p-1.5 hover:bg-yellow-50 rounded text-[#00FFA3]"
                                        title="Edit Document"
                                      >
                                        <Edit className="w-4 h-4" />
                                      </button>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleDeleteDocument(doc._id);
                                        }}
                                        className="p-1.5 hover:bg-red-50 rounded text-[#A855F7]"
                                        title="Delete Document"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 bg-card border-t border-theme px-6 py-4 flex items-center justify-end gap-3">
              <button
                onClick={() => {
                  setShowUnitDetails(false);
                  setSelectedUnitDetails(null);
                }}
                className="px-6 py-2 border border-theme rounded-lg hover:bg-[rgba(255,255,255,0.03)] transition-colors font-medium"
              >
                Close
              </button>
              <button
                onClick={() => {
                  setShowUnitDetails(false);
                  setSelectedUnitDetails(null);
                  handleEditUnit(selectedUnitDetails);
                }}
                className="px-6 py-2 !text-white rounded-lg hover:opacity-90 transition-colors font-medium"
                style={{ background: 'linear-gradient(to right, #016ab2, #063f6f)' }}
              >
                Edit Unit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedUnit && (
        <>
          <div
            className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-[9998]"
            onClick={() => {
              setShowDeleteModal(false);
              setSelectedUnit(null);
            }}
          />
          <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-card rounded-xl shadow-2xl z-[9999] w-full max-w-md">
            <div className="p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                  <FaExclamationCircle className="text-[#A855F7]" size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-primary">Delete Unit</h3>
                  <p className="text-sm text-secondary">This action cannot be undone</p>
                </div>
              </div>
              <p className="text-primary mb-6">
                Are you sure you want to delete unit <strong>{selectedUnit.unitNo}</strong> ({selectedUnit.makeModel})?
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setSelectedUnit(null);
                  }}
                  className="px-6 py-2 border border-theme rounded-lg text-primary hover:bg-[rgba(255,255,255,0.03)] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmDelete}
                  disabled={deleting}
                  className={`px-6 py-2 rounded-lg !text-white transition-colors ${deleting ? 'bg-red-300 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700'
                    }`}
                >
                  {deleting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Edit Document Modal */}
      {showEditDocumentModal && editDocumentForm && (
        <div className="fixed inset-0 bg-transparent flex items-center justify-center z-[10002]">
          <div className="bg-card rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-theme flex items-center justify-between">
              <h2 className="text-xl font-semibold text-primary">Edit Document</h2>
              <button
                onClick={() => {
                  setShowEditDocumentModal(false);
                  setEditingDocument(null);
                  setEditDocumentForm(null);
                }}
                className="text-secondary hover:text-secondary transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {/* Selected Document Information */}
              {editingDocument && (
                <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-3">
                    <FileText className="w-5 h-5 text-[#00D1FF]" />
                    <h3 className="text-sm font-bold text-blue-900">Selected Document</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-secondary font-medium">Type:</span>
                      <span className="ml-2 text-primary font-semibold">
                        {editingDocument.documentType?.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()) || '-'}
                      </span>
                    </div>
                    <div>
                      <span className="text-secondary font-medium">Number:</span>
                      <span className="ml-2 text-primary font-semibold">
                        {editingDocument.documentNumber || 'N/A'}
                      </span>
                    </div>
                    <div>
                      <span className="text-secondary font-medium">Issue Date:</span>
                      <span className="ml-2 text-primary">
                        {editingDocument.issuedAt ? new Date(editingDocument.issuedAt).toLocaleDateString() : 'N/A'}
                      </span>
                    </div>
                    <div>
                      <span className="text-secondary font-medium">Expiry Date:</span>
                      <span className="ml-2 text-primary">
                        {editingDocument.expiryDate ? new Date(editingDocument.expiryDate).toLocaleDateString() : 'N/A'}
                      </span>
                    </div>
                    <div>
                      <span className="text-secondary font-medium">Status:</span>
                      <span className={`ml-2 inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${editingDocument.status === 'completed' || !editingDocument.status
                          ? 'bg-green-100 text-green-800'
                          : editingDocument.status === 'pending'
                            ? 'bg-yellow-100 text-yellow-800'
                            : editingDocument.status === 'expired'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-card text-primary'
                        }`}>
                        {editingDocument.status || 'completed'}
                      </span>
                    </div>
                    {editingDocument.files && editingDocument.files.length > 0 && (
                      <div>
                        <span className="text-secondary font-medium">File(s):</span>
                        <div className="mt-1">
                          {editingDocument.files.map((file: any, idx: number) => (
                            <div key={idx} className="text-xs text-primary flex items-center gap-1">
                              <FileText className="w-3 h-3" />
                              {file.fileName || `File ${idx + 1}`}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-primary mb-1">
                    Document Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={editDocumentForm.documentType}
                    onChange={(e) => setEditDocumentForm({
                      ...editDocumentForm,
                      documentType: e.target.value as any
                    })}
                    className="w-full px-3 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {VEHICLE_DOCUMENT_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-primary mb-1">
                    Document Number <span className="text-secondary text-xs">(Optional - leave empty to keep current)</span>
                  </label>
                  <input
                    type="text"
                    value={editDocumentForm.documentNumber}
                    onChange={(e) => setEditDocumentForm({
                      ...editDocumentForm,
                      documentNumber: e.target.value
                    })}
                    placeholder="e.g., DOC-123456 (optional)"
                    className="w-full px-3 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {editingDocument?.documentNumber && (
                    <p className="text-xs text-secondary mt-1">
                      Current: <span className="font-medium">{editingDocument.documentNumber}</span>
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-primary mb-1">
                      Issue Date <span className="text-secondary text-xs">(Optional)</span>
                    </label>
                    <input
                      type="date"
                      value={editDocumentForm.issuedAt}
                      onChange={(e) => setEditDocumentForm({
                        ...editDocumentForm,
                        issuedAt: e.target.value
                      })}
                      className="w-full px-3 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {editingDocument?.issuedAt && (
                      <p className="text-xs text-secondary mt-1">
                        Current: <span className="font-medium">{new Date(editingDocument.issuedAt).toLocaleDateString()}</span>
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-primary mb-1">
                      Expiry Date <span className="text-secondary text-xs">(Optional)</span>
                    </label>
                    <input
                      type="date"
                      value={editDocumentForm.expiryDate}
                      onChange={(e) => setEditDocumentForm({
                        ...editDocumentForm,
                        expiryDate: e.target.value
                      })}
                      className="w-full px-3 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {editingDocument?.expiryDate && (
                      <p className="text-xs text-secondary mt-1">
                        Current: <span className="font-medium">{new Date(editingDocument.expiryDate).toLocaleDateString()}</span>
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-primary mb-1">
                    Update Document File(s) (Optional)
                  </label>
                  <input
                    type="file"
                    multiple
                    onChange={(e) => {
                      if (e.target.files && e.target.files.length > 0) {
                        const filesArray = Array.from(e.target.files);
                        setEditDocumentForm({
                          ...editDocumentForm,
                          files: filesArray
                        });
                      }
                    }}
                    className="w-full px-3 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.txt"
                  />
                  {editDocumentForm.files && editDocumentForm.files.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {editDocumentForm.files.map((file, fileIndex) => (
                        <p key={fileIndex} className="text-xs text-green-600 flex items-center gap-1">
                          <CheckCircle size={12} />
                          Selected: {file.name} ({(file.size / 1024).toFixed(2)} KB)
                        </p>
                      ))}
                    </div>
                  )}
                  <p className="text-xs text-secondary mt-1">
                    Leave empty to keep existing file(s)
                  </p>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-theme flex items-center justify-end gap-3">
              <button
                onClick={() => {
                  setShowEditDocumentModal(false);
                  setEditingDocument(null);
                  setEditDocumentForm(null);
                }}
                className="px-6 py-2 border border-theme rounded-lg text-primary hover:bg-[rgba(255,255,255,0.03)] transition-colors"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEditedDocument}
                disabled={isSubmitting}
                className={`px-6 py-2 !text-white rounded-lg hover:opacity-90 transition-colors ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                style={{ background: 'linear-gradient(to right, #016ab2, #063f6f)' }}
              >
                {isSubmitting ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

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
    </div>
  );
};

export default FleetUnits;

