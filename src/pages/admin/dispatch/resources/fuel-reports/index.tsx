import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { Plus, Search, Edit, Trash2, ChevronLeft, ChevronRight, X, Upload, FileText, Sparkles } from "lucide-react";
import { FaFileInvoiceDollar, FaGasPump, FaClipboardList } from "react-icons/fa";
import { message } from "antd";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import NewFuelReportSidebar from "./NewFuelReportSidebar";
import {
  listFuelReport,
  deleteFuelReport,
  updateFuelReport,
  getFuelTypes,
  createFuelType,
  getUnits,
  createUnit,
  getFuelVendors,
  createFuelVendor,
  parseCsvHeaders,
  importFuelReportsFromCsv,
  extractFuelReceipt,
} from "../../../../../axios/api/dispatcher.fuelreport";
import { listFleetUnits } from "../../../../../axios/api/fleet.units";
import { FLEET_COLORS } from "../../../fleetMaintenance/colorUtils";
import AddressSearch from "../../../../../components/common/AddressSearch";

interface FuelReportType {
  _id: string;
  reporter?: { _id: string; name?: string; email?: string };
  reporterName?: string;
  reporterEmail?: string;
  driver?: { _id: string; name: string }; // Keep for backward compatibility
  vehicle: { _id: string; plateNumber?: string; vinNumber?: string; unitNo?: string; unitType?: string; makeModel?: string };
  trip?: any; // Keep for backward compatibility
  // New fields
  state?: string;
  city?: string;
  cityLocation?: string; // Alias for city
  paymentNotes?: string;
  product?: string; // Truck Diesel, Reefer Diesel, DEF
  unit?: { _id: string; unitNo?: string; unitType?: string; makeModel?: string };
  types?: string[];
  fuelAmounts?: number[];
  transactionAmount?: number;
  currentOdometer?: string;
  units?: string[];
  measurementUnit?: string;
  currency?: string;
  date?: string | Date;
  fuelVendors?: string[];
  fuelVendor?: string;
  fuelAmount?: number;
  transactionNumber?: string;
  // Legacy fields
  volume?: string;
  type?: string;
  odometer?: string;
  cost?: number;
  status: string;
  createdAt: string;
  location?: { address?: string; latitude?: string; longitude?: string };
}

interface FuelReportEditForm {
  unit: string;
  state: string;
  address: string;
  city: string;
  postalCode: string;
  country: string;
  latitude: string;
  longitude: string;
  fullAddress: string;
  type: string;
  product: string;
  transactionNumber: string;
  paymentNotes: string;
  transactionAmount: string;
  currentOdometer: string;
  measurementUnit: string;
  currency: string;
  date: string;
  fuelVendor: string;
  fuelAmount: string;
  status: string;
}

interface FleetUnitOption {
  id: string;
  unitNo: string;
  unitType?: string;
  makeModel?: string;
  licensePlate?: string;
}

const FuelReports = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [fuelReports, setFuelReports] = useState<FuelReportType[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [editingReport, setEditingReport] = useState<FuelReportType | null>(null);
  const [editForm, setEditForm] = useState<FuelReportEditForm>({
    unit: "",
    state: "",
    address: "",
    city: "",
    postalCode: "",
    country: "",
    latitude: "",
    longitude: "",
    fullAddress: "",
    type: "",
    product: "",
    transactionNumber: "",
    paymentNotes: "",
    transactionAmount: "",
    currentOdometer: "",
    measurementUnit: "",
    currency: "USA",
    date: new Date().toISOString().split('T')[0],
    fuelVendor: "",
    fuelAmount: "",
    status: "pending",
  });
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editFuelTypes, setEditFuelTypes] = useState<Array<{ _id: string; name: string }>>([]);
  const [, setLoadingEditFuelTypes] = useState(false);
  const [showEditAddTypeModal, setShowEditAddTypeModal] = useState(false);
  const [newEditTypeName, setNewEditTypeName] = useState('');
  const [addingEditType, setAddingEditType] = useState(false);
  const [editMeasurementUnits, setEditMeasurementUnits] = useState<Array<{ _id: string; name: string }>>([]);
  const [loadingEditMeasurementUnits, setLoadingEditMeasurementUnits] = useState(false);
  const [showEditAddUnitModal, setShowEditAddUnitModal] = useState(false);
  const [newEditUnitName, setNewEditUnitName] = useState('');
  const [addingEditUnit, setAddingEditUnit] = useState(false);
  const [editFuelVendors, setEditFuelVendors] = useState<Array<{ _id: string; name: string }>>([]);
  const [loadingEditFuelVendors, setLoadingEditFuelVendors] = useState(false);
  const [showEditAddVendorModal, setShowEditAddVendorModal] = useState(false);
  const [newEditVendorName, setNewEditVendorName] = useState('');
  const [addingEditVendor, setAddingEditVendor] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<FuelReportType | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [emptyStateMessage, setEmptyStateMessage] = useState<string | null>(null);
  const [userInfo, setUserInfo] = useState<any>(null);
  const [userInfoReady, setUserInfoReady] = useState(false);
  const [units, setUnits] = useState<FleetUnitOption[]>([]);
  const [unitsLoading, setUnitsLoading] = useState(false);
  const hasFetchedRef = useRef(false);
  const [startDateFilter, setStartDateFilter] = useState<string>("");
  const [endDateFilter, setEndDateFilter] = useState<string>("");
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [ocrModalOpen, setOcrModalOpen] = useState(false);
  const [ocrFile, setOcrFile] = useState<File | null>(null);
  const [ocrExtracting, setOcrExtracting] = useState(false);
  const [ocrExtractedData, setOcrExtractedData] = useState<any>(null);
  const ocrFileInputRef = useRef<HTMLInputElement>(null);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvSampleRows, setCsvSampleRows] = useState<any[]>([]);
  const [csvMapping, setCsvMapping] = useState<Record<string, string>>({});
  const [csvParsing, setCsvParsing] = useState(false);
  const [csvImporting, setCsvImporting] = useState(false);
  const [csvImportResult, setCsvImportResult] = useState<{ success: number; failed: number; errors: string[] } | null>(null);
  const [defaultUnitForImport, setDefaultUnitForImport] = useState<string>("");
  const [defaultCurrencyForImport, setDefaultCurrencyForImport] = useState<string>("USA");
  const [defaultProductForImport, setDefaultProductForImport] = useState<string>("");
  const csvFileInputRef = useRef<HTMLInputElement>(null);


  const unitsMap = useMemo(() => new Map(units.map((unit) => [unit.id, unit])), [units]);
  const focusRingStyle = useMemo(
    () =>
      ({
        "--tw-ring-color": FLEET_COLORS.primary
      }) as React.CSSProperties & { "--tw-ring-color": string },
    []
  );

  const formatUnitLabel = useCallback((unit?: FleetUnitOption | null) => {
    if (!unit) return "N/A";
    const base = [unit.unitNo, unit.makeModel].filter(Boolean).join(" - ");
    return unit.unitType ? `${base} (${unit.unitType})` : base || "Unit";
  }, []);

  const getVehicleDetails = useCallback(
    (report: FuelReportType | null) => {
      if (!report) {
        return { primary: "N/A", secondary: "", badge: "" };
      }
      const vehicleId = report.vehicle?._id || "";
      const matched = vehicleId ? unitsMap.get(vehicleId) : undefined;
      if (matched) {
        return {
          primary: matched.unitNo || matched.licensePlate || "Unit",
          secondary: matched.makeModel || matched.licensePlate || "",
          badge: matched.unitType || ""
        };
      }
      const primary =
        (report.vehicle?.unitNo && report.vehicle.unitNo !== 'N/A' ? report.vehicle.unitNo : null) ||
        report.vehicle?.plateNumber ||
        report.vehicle?.vinNumber ||
        (report.unit?.unitNo && report.unit.unitNo !== 'N/A' ? report.unit.unitNo : null) ||
        report.unit?.makeModel ||
        "N/A";
      const secondary = [
        report.vehicle?.makeModel,
        report.unit?.makeModel,
        report.vehicle?.plateNumber,
        report.vehicle?.vinNumber
      ]
        .filter(Boolean)
        .join(" · ");
      return {
        primary,
        secondary,
        badge: (report.vehicle?.unitType && report.vehicle.unitType !== 'N/A' ? report.vehicle.unitType : null) ||
          (report.unit?.unitType && report.unit.unitType !== 'N/A' ? report.unit.unitType : null) ||
          ""
      };
    },
    [unitsMap]
  );

  const renderVehicleLabel = useCallback(
    (report: FuelReportType | null) => {
      const details = getVehicleDetails(report);
      return [details.primary, details.secondary].filter(Boolean).join(" - ") || "N/A";
    },
    [getVehicleDetails]
  );

  useEffect(() => {
    try {
      const stored = localStorage.getItem("userInfo");
      if (stored) {
        const parsedInfo = JSON.parse(stored);
        setUserInfo(parsedInfo);
        setUserInfoReady(true);
      } else {
        // No stored userInfo, but still mark as ready to prevent infinite waiting
        setUserInfoReady(true);
      }
    } catch (error) {
      console.error("Error parsing userInfo from localStorage:", error);
      setUserInfoReady(true);
    }
  }, []);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setCurrentPage(1); // Reset to first page on search
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Reset to page 1 when status filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter]);

  const fetchFuelReports = useCallback(async () => {
    try {
      setLoading(true);
      setEmptyStateMessage(null);
      hasFetchedRef.current = true;

      console.log('Fetching fuel reports with params:', { currentPage, pageSize, debouncedSearch, statusFilter });

      const params: any = {
        page: currentPage,
        limit: pageSize,
        sortBy: 'createdAt',
        sortOrder: 'desc'
      };

      if (debouncedSearch) params.search = debouncedSearch;
      if (statusFilter !== 'all') params.status = statusFilter;

      const res = await listFuelReport(params);
      console.log('Fuel reports API response:', res);
      if (res.success) {
        const data = Array.isArray(res.data) ? res.data : [];
        // Clear existing data and set new data to avoid duplicates
        setFuelReports(data);
        if (res.pagination) {
          setTotal(res.pagination.total);
          setTotalPages(res.pagination.totalPages);
          // If current page is beyond total pages, reset to last page
          if (currentPage > res.pagination.totalPages && res.pagination.totalPages > 0) {
            setCurrentPage(res.pagination.totalPages);
          }
        }
        if (res.message && data.length === 0) {
          setEmptyStateMessage(res.message);
        } else {
          setEmptyStateMessage(null);
        }
      } else {
        message.error(res.message || "Failed to fetch fuel reports");
        setFuelReports([]);
        setTotal(0);
        setTotalPages(0);
        setEmptyStateMessage(res?.message || "Failed to fetch fuel reports");
      }
    } catch (error: any) {
      console.error("Error fetching fuel reports:", error);
      setFuelReports([]);
      setTotal(0);
      setTotalPages(0);
      setEmptyStateMessage(error?.message || "Failed to fetch fuel reports");
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, debouncedSearch, statusFilter]);


  const loadUnits = useCallback(async () => {
    setUnitsLoading(true);
    try {
      const res = await listFleetUnits({ category: "all" });
      if (res?.success) {
        const data = Array.isArray(res.data) ? res.data : [];
        const normalized = data.map((unit: any) => ({
          id: unit._id,
          unitNo: unit.unitNo || unit.internalId || unit.licensePlate || "Unit",
          unitType: unit.unitType || (unit.source === "trailer" ? "Trailer" : unit.truckType ? "Truck" : unit.source),
          makeModel:
            unit.makeModel ||
            [unit.make, unit.model]
              .filter(Boolean)
              .join(" ")
              .trim(),
          licensePlate: unit.licensePlate || unit.vinNo || ""
        }));
        setUnits(normalized);
      } else {
        setUnits([]);
      }
    } catch (error) {
      console.error("Failed to load fleet units", error);
      setUnits([]);
    } finally {
      setUnitsLoading(false);
    }
  }, []);

  // Fetch fuel reports when user info is ready and when filters/pagination change
  useEffect(() => {
    console.log('Fetch effect triggered:', { userInfoReady, hasUserInfo: !!userInfo, currentPage, pageSize, debouncedSearch, statusFilter });

    // Wait for userInfo to be loaded from localStorage
    if (!userInfoReady) {
      console.log('Waiting for userInfoReady...');
      return;
    }

    // If no userInfo is available, try to get it from localStorage directly
    let effectiveUserInfo = userInfo;
    if (!effectiveUserInfo) {
      try {
        const stored = localStorage.getItem("userInfo");
        if (stored) {
          effectiveUserInfo = JSON.parse(stored);
          console.log('Loaded userInfo from localStorage:', effectiveUserInfo);
        }
      } catch (error) {
        console.error("Error getting userInfo from localStorage:", error);
      }
    }

    // If still no userInfo, don't fetch (user might not be logged in)
    if (!effectiveUserInfo) {
      console.log('No userInfo available, skipping fetch');
      setFuelReports([]);
      setEmptyStateMessage("No user information available");
      return;
    }

    const userRole = effectiveUserInfo?.role || effectiveUserInfo?.userData?.role;
    const userCompany = effectiveUserInfo?.company || effectiveUserInfo?.userData?.company;
    const isSuperadmin = userRole === "superadmin";
    const isComplianceManager = userRole === "Compliance Manager";
    const isFleetMaintenanceManager = userRole === "Fleet Maintenance Manager";
    const hasCompany = Boolean(userCompany);

    console.log('User permission check:', { userRole, userCompany, isSuperadmin, isComplianceManager, isFleetMaintenanceManager, hasCompany });

    // Allow superadmin, Fleet Maintenance Manager, Compliance Manager, or users with company
    if (!isSuperadmin && !isFleetMaintenanceManager && !isComplianceManager && !hasCompany) {
      console.log('User does not have permission to view fuel reports');
      setFuelReports([]);
      setEmptyStateMessage(null);
      return;
    }

    // Always fetch when dependencies change - this ensures data is fresh on page refresh
    console.log('Calling fetchFuelReports...');
    fetchFuelReports();
  }, [userInfoReady, userInfo, currentPage, pageSize, debouncedSearch, statusFilter, fetchFuelReports]);

  useEffect(() => {
    loadUnits();
  }, [loadUnits]);

  const openDeleteModal = (report: FuelReportType) => {
    setDeleteTarget(report);
    setDeleteModalOpen(true);
  };

  const closeDeleteModal = () => {
    if (deleteLoading) return;
    setDeleteModalOpen(false);
    setDeleteTarget(null);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      setDeleteLoading(true);
      const res = await deleteFuelReport(deleteTarget._id);
      if (res.success) {
        message.success(res.message || "Fuel report deleted successfully");
        // If we're on the last page and it becomes empty, go to previous page
        if (fuelReports.length === 1 && currentPage > 1) {
          setCurrentPage(currentPage - 1);
        } else {
          await fetchFuelReports();
        }
        closeDeleteModal();
      } else {
        message.error(res.message || "Failed to delete fuel report");
      }
    } catch (error: any) {
      console.error(error);
      message.error(error?.message || "Failed to delete fuel report");
    } finally {
      setDeleteLoading(false);
    }
  };



  // Fetch fuel types, units, and vendors for edit modal
  const fetchEditFuelTypes = useCallback(async () => {
    setLoadingEditFuelTypes(true);
    try {
      const response = await getFuelTypes();
      if (response?.success) {
        setEditFuelTypes(response.data || []);
      }
    } catch (error) {
      console.error('Error fetching fuel types:', error);
    } finally {
      setLoadingEditFuelTypes(false);
    }
  }, []);

  const fetchEditMeasurementUnits = useCallback(async () => {
    setLoadingEditMeasurementUnits(true);
    try {
      const response = await getUnits();
      if (response?.success) {
        setEditMeasurementUnits(response.data || []);
      }
    } catch (error) {
      console.error('Error fetching measurement units:', error);
    } finally {
      setLoadingEditMeasurementUnits(false);
    }
  }, []);

  const fetchEditFuelVendors = useCallback(async () => {
    setLoadingEditFuelVendors(true);
    try {
      const response = await getFuelVendors();
      if (response?.success) {
        setEditFuelVendors(response.data || []);
      }
    } catch (error) {
      console.error('Error fetching fuel vendors:', error);
    } finally {
      setLoadingEditFuelVendors(false);
    }
  }, []);

  const handleEditAddNewType = async () => {
    if (!newEditTypeName.trim()) {
      message.warning('Please enter a fuel type name');
      return;
    }
    setAddingEditType(true);
    try {
      const response = await createFuelType(newEditTypeName.trim());
      if (response?.success) {
        await fetchEditFuelTypes();
        setShowEditAddTypeModal(false);
        setNewEditTypeName('');
        if (response.data) {
          setEditForm(prev => ({
            ...prev,
            type: response.data.name
          }));
        }
        message.success('Fuel type added successfully');
      } else {
        message.error(response?.message || 'Failed to create fuel type');
      }
    } catch (error: any) {
      message.error(error?.message || 'Failed to create fuel type');
    } finally {
      setAddingEditType(false);
    }
  };

  const handleEditAddNewUnit = async () => {
    if (!newEditUnitName.trim()) {
      message.warning('Please enter a unit name');
      return;
    }
    setAddingEditUnit(true);
    try {
      const response = await createUnit(newEditUnitName.trim());
      if (response?.success) {
        await fetchEditMeasurementUnits();
        setShowEditAddUnitModal(false);
        setNewEditUnitName('');
        if (response.data) {
          setEditForm(prev => ({
            ...prev,
            measurementUnit: response.data.name
          }));
        }
        message.success('Unit added successfully');
      } else {
        message.error(response?.message || 'Failed to create unit');
      }
    } catch (error: any) {
      message.error(error?.message || 'Failed to create unit');
    } finally {
      setAddingEditUnit(false);
    }
  };

  const handleEditAddNewVendor = async () => {
    if (!newEditVendorName.trim()) {
      message.warning('Please enter a fuel vendor name');
      return;
    }
    setAddingEditVendor(true);
    try {
      const response = await createFuelVendor(newEditVendorName.trim());
      if (response?.success) {
        await fetchEditFuelVendors();
        setShowEditAddVendorModal(false);
        setNewEditVendorName('');
        if (response.data) {
          setEditForm(prev => ({
            ...prev,
            fuelVendor: response.data.name
          }));
        }
        message.success('Fuel vendor added successfully');
      } else {
        message.error(response?.message || 'Failed to create fuel vendor');
      }
    } catch (error: any) {
      message.error(error?.message || 'Failed to create fuel vendor');
    } finally {
      setAddingEditVendor(false);
    }
  };

  const openEditModal = (report: FuelReportType) => {
    setEditingReport(report);
    // Fetch fuel types, units, and vendors when opening modal
    fetchEditFuelTypes();
    fetchEditMeasurementUnits();
    fetchEditFuelVendors();

    // Get location data
    const location = report.location || {};
    const fullAddress = location.address || report.state || '';

    // Format date
    const reportDate = report.date
      ? (typeof report.date === 'string' ? report.date.split('T')[0] : new Date(report.date).toISOString().split('T')[0])
      : new Date().toISOString().split('T')[0];

    setEditForm({
      unit: report.unit?._id || report.vehicle?._id || "",
      state: report.state || "",
      address: location.address || "",
      city: report.city || report.cityLocation || "",
      postalCode: "",
      country: "",
      latitude: location.latitude || "",
      longitude: location.longitude || "",
      fullAddress: fullAddress,
      type: report.type || (report.types && report.types.length > 0 ? report.types[0] : ""),
      product: report.product || report.type || (report.types && report.types.length > 0 ? report.types[0] : ""),
      transactionNumber: report.transactionNumber || "",
      paymentNotes: report.paymentNotes || "",
      transactionAmount: report.transactionAmount?.toString() || "",
      currentOdometer: report.currentOdometer || report.odometer || "",
      measurementUnit: report.measurementUnit || (report.units && report.units.length > 0 ? report.units[0] : ""),
      currency: report.currency || "USA",
      date: reportDate,
      fuelVendor: report.fuelVendor || (report.fuelVendors && report.fuelVendors.length > 0 ? report.fuelVendors[0] : ""),
      fuelAmount: report.fuelAmount?.toString() || "",
      status: report.status || "pending",
    });
    setEditModalOpen(true);
  };

  const closeEditModal = () => {
    if (editSubmitting) return;
    setEditModalOpen(false);
    setEditingReport(null);
    setEditForm({
      unit: "",
      state: "",
      address: "",
      city: "",
      postalCode: "",
      country: "",
      latitude: "",
      longitude: "",
      fullAddress: "",
      type: "",
      product: "",
      transactionNumber: "",
      paymentNotes: "",
      transactionAmount: "",
      currentOdometer: "",
      measurementUnit: "",
      currency: "USA",
      date: new Date().toISOString().split('T')[0],
      fuelVendor: "",
      fuelAmount: "",
      status: "pending",
    });
  };

  const handleEditFieldChange = (
    field: keyof FuelReportEditForm,
    value: string
  ) => {
    setEditForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleUpdateSubmit = async () => {
    if (!editingReport) return;
    if (!editForm.unit) {
      message.warning("Please select a unit");
      return;
    }
    if (!editForm.fullAddress && !editForm.state) {
      message.warning("Please select a location");
      return;
    }
    const fuelType = editForm.product || editForm.type;
    if (!fuelType || !fuelType.trim()) {
      message.warning("Please select a product (fuel type)");
      return;
    }
    try {
      setEditSubmitting(true);
      const payload = {
        unit: editForm.unit,
        state: editForm.state,
        city: editForm.city,
        address: editForm.address || editForm.fullAddress,
        location: {
          address: editForm.fullAddress || editForm.address || '',
          latitude: editForm.latitude || '',
          longitude: editForm.longitude || ''
        },
        type: editForm.product || editForm.type,
        product: editForm.product || editForm.type,
        transactionNumber: editForm.transactionNumber || undefined,
        paymentNotes: editForm.paymentNotes || undefined,
        transactionAmount: editForm.transactionAmount ? parseFloat(editForm.transactionAmount) : null,
        currentOdometer: editForm.currentOdometer || null,
        measurementUnit: editForm.measurementUnit,
        currency: editForm.currency,
        date: editForm.date || new Date().toISOString(),
        fuelVendor: editForm.fuelVendor,
        fuelAmount: editForm.fuelAmount ? parseFloat(editForm.fuelAmount) : null,
        status: editForm.status || 'pending',
      };
      const res = await updateFuelReport(editingReport._id, payload);
      if (res.success) {
        message.success(res.message || "Fuel report updated successfully");
        await fetchFuelReports();
        closeEditModal();
      } else {
        message.error(res.message || "Failed to update fuel report");
      }
    } catch (error: any) {
      console.error(error);
      message.error(error?.message || "Failed to update fuel report");
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  // CSV Import Handlers
  const handleCsvFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.csv')) {
      message.error('Please upload a CSV file');
      e.target.value = '';
      return;
    }

    setCsvFile(file);
    setCsvParsing(true);
    setCsvHeaders([]);
    setCsvSampleRows([]);
    setCsvMapping({});
    setCsvImportResult(null);

    try {
      const response = await parseCsvHeaders(file);
      if (response?.success && response?.data) {
        setCsvHeaders(response.data.headers);
        setCsvSampleRows(response.data.sampleRows);
        // Auto-map common column names
        const autoMapping: Record<string, string> = {};
        response.data.headers.forEach((header: string) => {
          const lowerHeader = header.toLowerCase();
          if (lowerHeader.includes('date')) autoMapping.date = header;
          else if (lowerHeader.includes('amount') || lowerHeader.includes('price') || lowerHeader.includes('total') || lowerHeader.includes('cost')) autoMapping.transactionAmount = header;
          else if (lowerHeader.includes('gallon') || lowerHeader.includes('liter') || lowerHeader.includes('volume') || lowerHeader.includes('quantity')) autoMapping.fuelAmount = header;
          else if (lowerHeader.includes('transaction') || lowerHeader.includes('receipt') || lowerHeader.includes('invoice') || lowerHeader.includes('number')) autoMapping.transactionNumber = header;
          else if (lowerHeader.includes('vendor') || lowerHeader.includes('station') || lowerHeader.includes('merchant')) autoMapping.fuelVendor = header;
          else if (lowerHeader.includes('unit') || lowerHeader.includes('vehicle') || lowerHeader.includes('truck')) autoMapping.unit = header;
          else if (lowerHeader.includes('city')) autoMapping.city = header;
          else if (lowerHeader.includes('state') || lowerHeader.includes('province')) autoMapping.state = header;
          else if (lowerHeader.includes('address') || lowerHeader.includes('location')) autoMapping.address = header;
          else if (lowerHeader.includes('odometer') || lowerHeader.includes('mileage')) autoMapping.odometer = header;
          else if (lowerHeader.includes('product') || lowerHeader.includes('type') || lowerHeader.includes('fuel')) autoMapping.product = header;
        });
        setCsvMapping(autoMapping);
      } else {
        message.error(response?.message || 'Failed to parse CSV file');
        setCsvFile(null);
      }
    } catch (error: any) {
      console.error('Error parsing CSV:', error);
      message.error(error?.message || 'Failed to parse CSV file');
      setCsvFile(null);
    } finally {
      setCsvParsing(false);
      e.target.value = '';
    }
  };

  const handleCsvImport = async () => {
    if (!csvFile) {
      message.warning('Please select a CSV file first');
      return;
    }

    // Validate required mappings
    if (!csvMapping.date || !csvMapping.transactionAmount || !csvMapping.fuelAmount) {
      message.warning('Please map Date, Transaction Amount, and Fuel Amount columns');
      return;
    }

    if (!defaultUnitForImport) {
      message.warning('Please select a default unit for import');
      return;
    }

    setCsvImporting(true);
    setCsvImportResult(null);

    try {
      const response = await importFuelReportsFromCsv(
        csvFile,
        csvMapping,
        defaultUnitForImport,
        defaultCurrencyForImport,
        defaultProductForImport
      );

      if (response?.success) {
        setCsvImportResult(response.data);
        message.success(response.message || `Import completed: ${response.data?.success || 0} successful, ${response.data?.failed || 0} failed`);

        if (response.data?.success > 0) {
          // Refresh fuel reports list
          await fetchFuelReports();
          // Reset form after a delay
          setTimeout(() => {
            setImportModalOpen(false);
            setCsvFile(null);
            setCsvHeaders([]);
            setCsvSampleRows([]);
            setCsvMapping({});
            setCsvImportResult(null);
            setDefaultUnitForImport("");
            setDefaultCurrencyForImport("USA");
            setDefaultProductForImport("");
          }, 3000);
        }
      } else {
        message.error(response?.message || 'Failed to import fuel reports');
      }
    } catch (error: any) {
      console.error('Error importing CSV:', error);
      message.error(error?.message || 'Failed to import fuel reports');
    } finally {
      setCsvImporting(false);
    }
  };

  const closeImportModal = () => {
    if (csvImporting) return;
    setImportModalOpen(false);
    setCsvFile(null);
    setCsvHeaders([]);
    setCsvSampleRows([]);
    setCsvMapping({});
    setCsvImportResult(null);
    setDefaultUnitForImport("");
    setDefaultCurrencyForImport("USA");
    setDefaultProductForImport("");
    if (csvFileInputRef.current) {
      csvFileInputRef.current.value = '';
    }
  };

  // OCR Receipt Upload Handlers
  const handleOcrFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];
    if (!validTypes.includes(file.type)) {
      message.error('Please upload a valid image file (JPEG, PNG, WebP) or PDF');
      e.target.value = '';
      return;
    }

    setOcrFile(file);
    setOcrExtracting(true);
    setOcrExtractedData(null);

    try {
      const response = await extractFuelReceipt(file);
      if (response?.success && response?.data) {
        setOcrExtractedData(response.data);
        message.success('Data extracted successfully! Please review and select a unit to create the fuel report.');
      } else {
        message.error(response?.message || 'Failed to extract data from receipt. Please try again.');
        setOcrFile(null);
      }
    } catch (error: any) {
      console.error('Error extracting receipt:', error);
      message.error(error?.message || 'Failed to extract data from receipt');
      setOcrFile(null);
    } finally {
      setOcrExtracting(false);
      e.target.value = '';
    }
  };

  const handleCreateFromOcr = () => {
    if (!ocrExtractedData) {
      message.warning('Please extract data from receipt first');
      return;
    }

    // Open sidebar with extracted data pre-filled
    setOcrModalOpen(false);
    setIsSidebarOpen(true);
  };

  const closeOcrModal = () => {
    if (ocrExtracting) return;
    setOcrModalOpen(false);
    setOcrFile(null);
    setOcrExtractedData(null);
    if (ocrFileInputRef.current) {
      ocrFileInputRef.current.value = '';
    }
  };



  // Static mock data for analytics (used when API returns little/no data)
  const STATIC_SPEND_TREND = [
    { month: "Jan", spend: 12400 },
    { month: "Feb", spend: 13100 },
    { month: "Mar", spend: 11800 },
    { month: "Apr", spend: 14200 },
    { month: "May", spend: 13900 },
    { month: "Jun", spend: 15200 },
    { month: "Jul", spend: 14800 },
    { month: "Aug", spend: 16100 },
    { month: "Sep", spend: 15500 },
    { month: "Oct", spend: 16800 },
    { month: "Nov", spend: 14200 },
    { month: "Dec", spend: 0 },
  ];
  const currentYear = new Date().getFullYear();
  const ytdConsumption = useMemo(() => {
    const fromData = fuelReports.reduce((acc, r) => {
      const amt = r.fuelAmount ?? (r.fuelAmounts?.[0] ?? parseFloat(r.volume || "0"));
      return acc + amt;
    }, 0);
    return fromData > 0 ? fromData : 125000; // Static fallback
  }, [fuelReports]);
  const spendTrendData = useMemo(() => {
    if (fuelReports.length < 3) return STATIC_SPEND_TREND;
    const byMonth: Record<string, number> = {};
    fuelReports.forEach((r) => {
      const d = r.date ? new Date(r.date) : new Date(r.createdAt);
      const key = d.toLocaleString("default", { month: "short" });
      byMonth[key] = (byMonth[key] || 0) + (r.transactionAmount ?? Number(r.cost) ?? 0);
    });
    return STATIC_SPEND_TREND.map((t) => ({
      month: t.month,
      spend: byMonth[t.month] ?? t.spend,
    }));
  }, [fuelReports]);
  const topConsumingTrucks = useMemo(() => {
    if (fuelReports.length < 3) return [];
    const byUnit: Record<string, number> = {};
    fuelReports.forEach((r) => {
      // Use the same logic as getVehicleDetails to extract unit number
      const vehicleId = r.vehicle?._id || "";
      const matched = vehicleId ? unitsMap.get(vehicleId) : undefined;

      let unitNo = "Unknown";
      if (matched) {
        unitNo = matched.unitNo || matched.licensePlate || "Unknown";
      } else {
        // Fallback to report data
        const unitData = r.unit || r.vehicle;
        unitNo =
          (unitData?.unitNo && unitData.unitNo !== 'N/A' ? unitData.unitNo : null) ||
          (r.vehicle?.unitNo && r.vehicle.unitNo !== 'N/A' ? r.vehicle.unitNo : null) ||
          r.vehicle?.plateNumber ||
          r.vehicle?.vinNumber ||
          "Unknown";
      }

      const amt = r.fuelAmount ?? (r.fuelAmounts?.[0] ?? parseFloat(r.volume || "0"));
      if (unitNo !== "Unknown" && amt > 0) {
        byUnit[unitNo] = (byUnit[unitNo] || 0) + amt;
      }
    });

    const result = Object.entries(byUnit)
      .filter(([unitNo]) => unitNo !== "Unknown" && unitNo !== "N/A")
      .map(([unitNo, consumption]) => ({ unitNo, consumption }))
      .sort((a, b) => b.consumption - a.consumption)
      .slice(0, 5);

    return result;
  }, [fuelReports, unitsMap]);

  // Filter by date range (client-side)
  const filteredReports = useMemo(() => {
    let list = fuelReports;
    if (startDateFilter) {
      list = list.filter((r) => {
        const d = r.date ? new Date(r.date) : new Date(r.createdAt);
        return d >= new Date(startDateFilter);
      });
    }
    if (endDateFilter) {
      list = list.filter((r) => {
        const d = r.date ? new Date(r.date) : new Date(r.createdAt);
        return d <= new Date(endDateFilter + "T23:59:59");
      });
    }
    return list;
  }, [fuelReports, startDateFilter, endDateFilter]);

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
    subtitle: string;
    icon: any;
    bgColor: string;
    iconColor: string;
  }) => (
    <div className={` rounded-lg p-3 shadow-sm border border-transparent hover:border-blue-100 transition-all border-2 border-red-700 bg-${iconColor}`}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <h3 className="text-sm font-bold text-primary mb-1">{title}</h3>
          <div className="flex items-baseline gap-2 mb-0.5">
            <span className="text-xl font-bold text-primary">{value}</span>
          </div>
          <p className="text-xs text-secondary">{subtitle}</p>
        </div>
        <div className={`${bgColor} rounded-lg p-2 shadow-sm`}>
          <Icon className={iconColor} size={20} />
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-card flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          <p className="mt-4 text-secondary">Loading fuel reports...</p>
        </div>
      </div>
    );
  }

  if (emptyStateMessage) {
    return (
      <div className="min-h-screen bg-card flex flex-col items-center justify-center text-center space-y-4 px-6">
        <div className="text-5xl text-gray-300">⛽</div>
        <div className="space-y-2 max-w-md">
          <h2 className="text-2xl font-semibold text-primary">
            No fuel reports available
          </h2>
          <p className="text-secondary">{emptyStateMessage}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-10" >
      <div className="relative w-full mx-auto p-2">

        <div className="relative z-10 px-4 pt-3 pb-6">
          <div className="mb-4 relative z-10">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-headings">Fuel Reports</h1>
                <div className="flex items-center gap-2 text-secondary">
                  <span className="text-xs">Manage fuel consumption</span>
                </div>
              </div>
              <button
                onClick={() => setIsSidebarOpen(true)}
                className="flex items-center gap-2 px-4 py-2 !text-white rounded-lg shadow-sm transition-all font-bold text-sm hover:opacity-90 bg-[var(--accent-navyblue)]"
              >
                <Plus className="w-4 h-4" />
                Create Fuel Report
              </button>
            </div>
          </div>

          {/* Analytics Dashboard */}
          <div className="space-y-4 mb-6">
            <h2 className="text-lg font-semibold text-headings">Fuel Analytics</h2>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="bg-card rounded-xl p-4 shadow-sm border border-theme">
                <h3 className="text-sm font-semibold text-secondary mb-2">YTD Consumption</h3>
                <p className="text-2xl font-bold text-primary">
                  {ytdConsumption.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  <span className="text-sm font-normal text-secondary ml-1">
                    {fuelReports[0]?.measurementUnit || "L"}
                  </span>
                </p>
                <p className="text-xs text-secondary mt-1">Total {currentYear}</p>
              </div>
              <div className="bg-card rounded-xl p-4 shadow-sm border border-theme lg:col-span-2">
                <h3 className="text-sm font-semibold text-secondary mb-3">Spend Trend</h3>
                <div className="h-32">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={spendTrendData}
                      style={{ backgroundColor: 'transparent' }} // ✅ remove light bg
                    >
                      <CartesianGrid
                        stroke="var(--border-color)"
                        strokeDasharray="3 3"
                      />

                      <XAxis
                        dataKey="month"
                        stroke="var(--text-secondary)"
                        tick={{ fontSize: 10 }}
                      />

                      <YAxis
                        stroke="var(--text-secondary)"
                        tick={{ fontSize: 10 }}
                        tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                      />

                      <Tooltip
                        cursor={{ stroke: 'transparent', fill: 'transparent' }} // ✅ remove hover bg
                        wrapperStyle={{
                          background: 'transparent',
                          outline: 'none'
                        }}
                        contentStyle={{
                          backgroundColor: 'var(--bg-card)',
                          border: '1px solid var(--border-color)',
                          borderRadius: '10px',
                          boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                          color: 'var(--text-primary)'
                        }}
                        itemStyle={{ color: 'var(--text-primary)' }}
                        labelStyle={{ color: 'var(--text-secondary)' }}
                        formatter={(v) => [`$${(v as number).toLocaleString()}`, "Spend"]}
                      />

                      <Line
                        type="monotone"
                        dataKey="spend"
                        stroke={FLEET_COLORS.primary}
                        strokeWidth={2}
                        dot={{ r: 3 }}
                        activeDot={{ r: 5 }} // ✅ better hover UX
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
            <div className="bg-card rounded-xl p-4 shadow-sm border border-theme">
              <h3 className="text-sm font-semibold text-secondary mb-3">Top Consuming Trucks</h3>
              {topConsumingTrucks.length > 0 ? (
                <div className="flex flex-wrap gap-3">
                  {topConsumingTrucks.map((t, i) => (
                    <div key={t.unitNo} className="flex items-center gap-2 px-3 py-2 bg-card rounded-lg">
                      <span className="text-xs font-bold text-secondary">#{i + 1}</span>
                      <span className="font-semibold text-primary">{t.unitNo}</span>
                      <span className="text-xs text-secondary">
                        {t.consumption.toLocaleString(undefined, { maximumFractionDigits: 0 })} L
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-secondary">Not enough fuel report data yet to rank trucks by consumption.</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 -mt-2 mb-4">
            <StatCard title="Total Reports" value={filteredReports.length} subtitle="Filtered" icon={FaClipboardList} bgColor="bg-card" iconColor="text-[var(--accent-blue)] bg-[var(--accent-blue)]/20" />
            <StatCard title="Total Fuel Cost" value={`$${filteredReports.reduce((a, r) => a + (r.transactionAmount ?? Number(r.cost) ?? 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} subtitle="Filtered" icon={FaFileInvoiceDollar} bgColor="bg-card" iconColor="text-[var(--accent-green)] bg-[var(--accent-green)]/20" />
            <StatCard
              title="Total Volume"
              value={`${filteredReports.reduce((a, r) => a + (r.fuelAmount ?? r.fuelAmounts?.[0] ?? parseFloat(r.volume || "0")), 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${fuelReports[0]?.measurementUnit || "L"}`}
              subtitle="Filtered"
              icon={FaGasPump}
              bgColor="bg-card"
              iconColor="text-[var(--accent-orange)] bg-[var(--accent-orange)]/20"
            />
          </div>

          <div className="bg-card rounded-xl shadow-lg border border-theme p-4 flex flex-col gap-4 mb-4">
            <div className="flex flex-col lg:flex-row lg:items-center gap-4">
              <div className="flex items-center gap-2">
                <label className="text-xs font-medium text-primary whitespace-nowrap">Start Date:</label>
                <input
                  type="date"
                  value={startDateFilter}
                  onChange={(e) => setStartDateFilter(e.target.value)}
                  className="px-3 py-2 border border-theme rounded-lg text-xs"
                  style={{ colorScheme: "dark" }}
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs font-medium text-primary whitespace-nowrap">End Date:</label>
                <input
                  type="date"
                  value={endDateFilter}
                  onChange={(e) => setEndDateFilter(e.target.value)}
                  className="px-3 py-2 border border-theme rounded-lg text-xs"
                  style={{ colorScheme: "dark" }}
                />
              </div>
              <div className="relative flex-1 max-w-xl">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-secondary" />
                <input
                  type="text"
                  placeholder="Search by driver, vehicle, transaction #..."
                  value={searchTerm}
                  onChange={handleSearchChange}
                  className="pl-10 pr-4 py-2 w-full border border-theme rounded-lg focus:ring-2 focus:border-transparent text-sm"
                  style={{ '--tw-ring-color': FLEET_COLORS.primary } as React.CSSProperties & { '--tw-ring-color': string }}
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs font-medium text-primary">Status:</label>
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="px-4 py-2 text-xs border border-theme rounded-lg
  bg-[var(--bg-card)] text-[var(--text-primary)]
  focus:ring-2 focus:ring-[var(--accent-blue)]
  focus:border-[var(--accent-blue)]
  outline-none cursor-pointer transition-all"
                >
                  <option
                    value="all"
                    className="bg-[var(--bg-card)] text-[var(--text-primary)]"
                  >
                    All Status
                  </option>

                  <option value="pending" className="bg-[var(--bg-card)] text-[var(--text-primary)]">
                    Pending
                  </option>

                  <option value="approved" className="bg-[var(--bg-card)] text-[var(--text-primary)]">
                    Approved
                  </option>

                  <option value="rejected" className="bg-[var(--bg-card)] text-[var(--text-primary)]">
                    Rejected
                  </option>
                </select>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setImportModalOpen(true)}
                className="flex items-center gap-2 px-3 py-2 border border-theme rounded-lg text-sm hover:bg-[rgba(255,255,255,0.03)] transition-colors"
              >
                <Upload className="w-4 h-4" />
                Import Fuel (CSV)
              </button>
              <button
                onClick={() => setOcrModalOpen(true)}
                className="flex items-center gap-2 px-3 py-2 border border-theme rounded-lg text-sm hover:bg-[rgba(255,255,255,0.03)] transition-colors"
              >
                <FileText className="w-4 h-4" />
                Upload Receipt (OCR)
              </button>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-card rounded-lg shadow-sm border border-theme overflow-hidden mx-4 mb-6">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-card">
                <tr>
                  <th className="px-6 py-2 text-xs font-semibold text-headings uppercase tracking-wider text-left">
                    Date
                  </th>
                  <th className="px-6 py-2 text-xs font-semibold text-headings uppercase tracking-wider text-left">
                    Transaction #
                  </th>
                  <th className="px-6 py-2 text-xs font-semibold text-headings uppercase tracking-wider text-left">
                    Unit
                  </th>
                  <th className="px-6 py-2 text-xs font-semibold text-headings uppercase tracking-wider text-left">
                    Product
                  </th>
                  <th className="px-6 py-2 text-xs font-semibold text-headings uppercase tracking-wider text-left">
                    City
                  </th>
                  <th className="px-6 py-2 text-xs font-semibold text-headings uppercase tracking-wider text-left">
                    State
                  </th>
                  <th className="px-6 py-2 text-xs font-semibold text-headings uppercase tracking-wider text-left">
                    Fuel Amount
                  </th>
                  <th className="px-6 py-2 text-xs font-semibold text-headings uppercase tracking-wider text-left">
                    Amount
                  </th>
                  <th className="px-6 py-2 text-xs font-semibold text-headings uppercase tracking-wider text-left">
                    Units
                  </th>
                  <th className="px-6 py-2 text-xs font-semibold text-headings uppercase tracking-wider text-left">
                    Currency
                  </th>
                  <th className="px-6 py-2 text-xs font-semibold text-headings uppercase tracking-wider text-left">
                    Payment Notes
                  </th>
                  <th className="px-6 py-2 text-xs font-semibold text-headings uppercase tracking-wider text-left">
                    Status
                  </th>
                  <th className="px-6 py-2 text-xs font-semibold text-headings uppercase tracking-wider text-left">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-theme divide-white/5">
                {filteredReports.length === 0 ? (
                  <tr>
                    <td
                      colSpan={13}
                      className="px-6 py-8 text-center text-secondary"
                    >
                      No fuel reports found
                    </td>
                  </tr>
                ) : (
                  filteredReports.map((report) => {
                    const unitData = report.unit || report.vehicle;
                    const unitDetails = unitData ? getVehicleDetails({ vehicle: unitData } as any) : getVehicleDetails(report);
                    const types = report.types || (report.type ? [report.type] : []);
                    const product = report.product || types[0] || report.type || 'N/A';
                    const fuelAmounts = report.fuelAmounts || [];
                    const fuelAmount = report.fuelAmount || null;
                    const units = report.units || [];
                    const measurementUnit = report.measurementUnit || '';
                    const transactionNumber = report.transactionNumber || report._id.slice(-8);
                    const city = report.city || report.cityLocation || 'N/A';
                    const paymentNotes = report.paymentNotes || '—';

                    return (
                      <tr key={report._id} className="hover:bg-[rgba(255,255,255,0.03)]">
                        <td className="px-6 py-2 text-xs text-primary font-medium">
                          {report.date ? new Date(report.date).toLocaleDateString() : new Date(report.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-2 text-xs font-semibold text-primary">
                          {transactionNumber}
                        </td>
                        <td className="px-6 py-2 text-xs text-secondary">
                          <div className="space-y-0.5">
                            <div className="font-semibold text-primary">
                              {unitDetails.primary !== 'N/A' ? unitDetails.primary : (report.vehicle?.plateNumber || report.unit?.makeModel || 'N/A')}
                            </div>
                            {unitDetails.secondary && unitDetails.secondary !== 'N/A' && (
                              <div className="text-[10px] text-secondary">{unitDetails.secondary}</div>
                            )}
                            {unitDetails.badge && unitDetails.badge !== 'N/A' && (
                              <span
                                className="inline-flex px-1.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide"
                                style={{
                                  backgroundColor:
                                    unitDetails.badge.toLowerCase().includes("trailer")
                                      ? "rgba(34, 197, 94, 0.15)"
                                      : "rgba(1, 106, 178, 0.15)",
                                  color:
                                    unitDetails.badge.toLowerCase().includes("trailer")
                                      ? "#15803d"
                                      : FLEET_COLORS.primary
                                }}
                              >
                                {unitDetails.badge}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-2 text-xs text-secondary">
                          {product}
                        </td>
                        <td className="px-6 py-2 text-xs text-secondary">
                          {city}
                        </td>
                        <td className="px-6 py-2 text-xs text-secondary">
                          {report.state || 'N/A'}
                        </td>
                        <td className="px-6 py-2 text-xs text-secondary">
                          {fuelAmounts.length > 0 ? (
                            <div className="space-y-1">
                              {fuelAmounts.map((amount, idx) => (
                                <div key={idx}>{amount.toFixed(2)}</div>
                              ))}
                            </div>
                          ) : (fuelAmount !== null && fuelAmount !== undefined ? fuelAmount.toFixed(2) : (report.volume ? `${report.volume} ${report.type || ''}` : 'N/A'))}
                        </td>
                        <td className="px-6 py-2 text-xs text-secondary">
                          {report.transactionAmount
                            ? `${report.currency === 'CAD' ? 'C$' : '$'}${Number(report.transactionAmount).toFixed(2)}`
                            : (report.cost ? `$${Number(report.cost).toFixed(2)}` : '-')}
                        </td>
                        <td className="px-6 py-2 text-xs text-secondary">
                          {units.length > 0 ? (
                            <div className="space-y-1">
                              {units.map((unit, idx) => (
                                <div key={idx}>{unit}</div>
                              ))}
                            </div>
                          ) : (measurementUnit ? measurementUnit : 'N/A')}
                        </td>
                        <td className="px-6 py-2 text-xs text-secondary">
                          {report.currency || 'USA'}
                        </td>
                        <td className="px-6 py-2 text-xs text-secondary max-w-[120px] truncate" title={paymentNotes}>
                          {paymentNotes}
                        </td>
                        <td className="px-6 py-2 text-xs text-secondary">
                          {report.status || '—'}
                        </td>
                        <td className="px-6 py-2">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => openEditModal(report)}
                              className="inline-flex items-center justify-center rounded-full hover:bg-[var(--accent-blue)]/20  transition-colors h-7 w-7 shadow-sm"
                              title="Edit fuel report"
                            >
                              <Edit className="w-3 h-3 text-[var(--accent-blue)]" />
                            </button>
                            <button
                              onClick={() => openDeleteModal(report)}
                              className="inline-flex items-center justify-center rounded-full hover:bg-[var(--accent-red)]/20  transition-colors h-7 w-7 shadow-sm "
                              title="Delete fuel report"
                            >
                              <Trash2 className="w-3 h-3 text-[var(--accent-red)]" />
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

          {/* Pagination Controls */}
          {total > 0 && (
            <div className="px-6 py-4 border-t border-theme flex items-center justify-between bg-card">
              <div className="text-sm text-primary">
                Showing <span className="font-medium">{(currentPage - 1) * pageSize + 1}</span> to{' '}
                <span className="font-medium">{Math.min(currentPage * pageSize, total)}</span> of{' '}
                <span className="font-medium">{total}</span> fuel reports
              </div>
              {totalPages > 1 && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className={`px-3 py-2 rounded-lg border ${currentPage === 1
                      ? 'bg-card text-secondary cursor-not-allowed border-theme'
                      : 'bg-card text-primary hover:bg-[rgba(255,255,255,0.03)] border-theme'
                      }`}
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <div className="flex gap-1">
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
                          className={`px-3 py-2 rounded-lg border ${currentPage === pageNum
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-card text-primary hover:bg-[rgba(255,255,255,0.03)] border-theme'
                            }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className={`px-3 py-2 rounded-lg border ${currentPage === totalPages
                      ? 'bg-card text-secondary cursor-not-allowed border-theme'
                      : 'bg-card text-primary hover:bg-[rgba(255,255,255,0.03)] border-theme'
                      }`}
                  >
                    <ChevronRight size={14} />
                  </button>
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="ml-4 px-3 py-2 rounded-lg border border-theme bg-card text-primary"
                  >
                    <option value={25}>25 per page</option>
                    <option value={50}>50 per page</option>
                    <option value={100}>100 per page</option>
                  </select>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Sidebar Component */}
      <NewFuelReportSidebar
        isOpen={isSidebarOpen}
        onClose={async (shouldRefresh = true) => {
          setIsSidebarOpen(false);
          setOcrExtractedData(null); // Clear OCR data when sidebar closes
          if (shouldRefresh) {
            // Reset to page 1 to show the newly created report (since sorted by createdAt desc)
            setCurrentPage(1);
            // Directly call fetchFuelReports to refresh the table immediately
            await fetchFuelReports();
          }
        }}
        units={units}
        unitsLoading={unitsLoading}
        currentUser={userInfo}
        initialData={ocrExtractedData}
      />

      {/* Edit Modal */}
      {editModalOpen && editingReport && (
        <>
          <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-[100]" onClick={closeEditModal} />
          <div className="fixed right-0 top-0 h-full w-full sm:w-[600px] bg-card border-l border-theme shadow-lg z-[101] flex flex-col">
            <div className="p-4 border-b border-theme flex-shrink-0" >
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-headings">Edit Fuel Report</h2>
                <button onClick={closeEditModal} className="text-headings/80 hover:text-headings">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-6 pb-20">
              <div className="bg-card p-4 rounded-md shadow-sm">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-primary mb-1">Location <span className="text-red-500">*</span></label>
                    <AddressSearch
                      placeholder="Search for an address..."
                      value={editForm.fullAddress}
                      onAddressSelect={(addressData) => {
                        setEditForm(prev => ({
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
                        setEditForm(prev => ({
                          ...prev,
                          fullAddress: value
                        }));
                      }}
                      className="w-full"
                    />
                    {editForm.state && (
                      <p className="text-xs text-secondary mt-1">
                        Selected: {editForm.state} {editForm.city && `- ${editForm.city}`}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-secondary mb-1">State</label>
                    <input
                      type="text"
                      value={editForm.state}
                      onChange={(e) => handleEditFieldChange("state", e.target.value)}
                      placeholder="e.g., Ontario, BC, Manitoba"
                      className="w-full px-3 py-2 border border-theme rounded-md focus:ring-2 focus:border-transparent"
                      style={focusRingStyle}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-headings mb-1">City</label>
                    <input
                      type="text"
                      value={editForm.city}
                      onChange={(e) => handleEditFieldChange("city", e.target.value)}
                      placeholder="e.g., Mississauga, Hope"
                      className="w-full px-3 py-2 border border-theme rounded-md focus:ring-2 focus:border-transparent"
                      style={focusRingStyle}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-headings mb-1">Transaction #</label>
                    <input
                      type="text"
                      value={editForm.transactionNumber}
                      onChange={(e) => handleEditFieldChange("transactionNumber", e.target.value)}
                      placeholder="Unique transaction ID"
                      className="w-full px-3 py-2 border border-theme rounded-md focus:ring-2 focus:border-transparent"
                      style={focusRingStyle}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-headings mb-1">Unit <span className="text-red-500">*</span></label>
                    <select
                      value={editForm.unit}
                      onChange={(e) => handleEditFieldChange("unit", e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-theme rounded-md
  bg-[var(--bg-card)] text-[var(--text-primary)]
  focus:ring-2 focus:ring-[var(--accent-blue)]
  focus:border-[var(--accent-blue)]
  outline-none cursor-pointer transition-all"
                      style={focusRingStyle}
                    >
                      <option
                        value=""
                        className="bg-[var(--bg-card)] text-[var(--text-primary)]"
                      >
                        Select Unit
                      </option>

                      {unitsLoading ? (
                        <option className="bg-[var(--bg-card)] text-[var(--text-primary)]">
                          Loading units...
                        </option>
                      ) : (
                        units?.map((unit) => (
                          <option
                            key={unit.id}
                            value={unit.id}
                            className="bg-[var(--bg-card)] text-[var(--text-primary)]"
                          >
                            {formatUnitLabel(unit)}
                          </option>
                        ))
                      )}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-headings mb-1">Product <span className="text-red-500">*</span></label>
                    <div className="flex gap-2">
                      <select
                        value={editForm.product || editForm.type}
                        onChange={(e) => {
                          const v = e.target.value;
                          handleEditFieldChange("product", v);
                          handleEditFieldChange("type", v);
                        }}
                        className="flex-1 px-3 py-2 text-sm border border-theme rounded-md
  bg-[var(--bg-card)] text-[var(--text-primary)]
  focus:ring-2 focus:ring-[var(--accent-blue)]
  focus:border-[var(--accent-blue)]
  outline-none cursor-pointer transition-all"
                        style={focusRingStyle}
                      >
                        <option
                          value=""
                          className="bg-[var(--bg-card)] text-[var(--text-primary)]"
                        >
                          Select Product
                        </option>

                        <option value="Truck Diesel" className="bg-[var(--bg-card)] text-[var(--text-primary)]">
                          Truck Diesel
                        </option>

                        <option value="Reefer Diesel" className="bg-[var(--bg-card)] text-[var(--text-primary)]">
                          Reefer Diesel
                        </option>

                        <option value="DEF" className="bg-[var(--bg-card)] text-[var(--text-primary)]">
                          DEF
                        </option>

                        {editFuelTypes
                          .filter((ft) => !['Truck Diesel', 'Reefer Diesel', 'DEF'].includes(ft.name))
                          .map((ft) => (
                            <option
                              key={ft._id}
                              value={ft.name}
                              className="bg-[var(--bg-card)] text-[var(--text-primary)]"
                            >
                              {ft.name}
                            </option>
                          ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => {
                          setShowEditAddTypeModal(true);
                          setNewEditTypeName('');
                        }}
                        className="px-3 py-2 bg-card border border-theme text-green-600 rounded-md hover:bg-green-100 transition-colors whitespace-nowrap"
                        title="Add new fuel type"
                      >
                        <Plus className="w-4 h-4 text-headings" />
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-headings mb-1">Transaction Amount</label>
                    <input
                      type="number"
                      step="0.01"
                      value={editForm.transactionAmount}
                      onChange={(e) => handleEditFieldChange("transactionAmount", e.target.value)}
                      placeholder="0.00"
                      className="w-full px-3 py-2 border border-theme rounded-md focus:ring-2 focus:border-transparent"
                      style={focusRingStyle}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-headings mb-1">Current Odometer</label>
                    <input
                      type="text"
                      value={editForm.currentOdometer}
                      onChange={(e) => handleEditFieldChange("currentOdometer", e.target.value)}
                      placeholder="Enter odometer reading"
                      className="w-full px-3 py-2 border border-theme rounded-md focus:ring-2 focus:border-transparent"
                      style={focusRingStyle}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-headings mb-1">Unit</label>
                    <div className="flex gap-2">
                      <select
                        value={editForm.measurementUnit}
                        onChange={(e) =>
                          handleEditFieldChange("measurementUnit", e.target.value)
                        }
                        className="flex-1 px-3 py-2 text-sm border border-theme rounded-md
  bg-[var(--bg-card)] text-[var(--text-primary)]
  focus:ring-2 focus:ring-[var(--accent-blue)]
  focus:border-[var(--accent-blue)]
  outline-none cursor-pointer transition-all
  disabled:opacity-60 disabled:cursor-not-allowed"
                        style={focusRingStyle}
                        disabled={loadingEditMeasurementUnits}
                      >
                        <option
                          value=""
                          className="bg-[var(--bg-card)] text-[var(--text-primary)]"
                        >
                          Select Unit
                        </option>

                        {loadingEditMeasurementUnits ? (
                          <option
                            disabled
                            className="bg-[var(--bg-card)] text-[var(--text-primary)]"
                          >
                            Loading...
                          </option>
                        ) : (
                          editMeasurementUnits.map((u) => (
                            <option
                              key={u._id}
                              value={u.name}
                              className="bg-[var(--bg-card)] text-[var(--text-primary)]"
                            >
                              {u.name}
                            </option>
                          ))
                        )}
                      </select>
                      <button
                        type="button"
                        onClick={() => {
                          setShowEditAddUnitModal(true);
                          setNewEditUnitName('');
                        }}
                        className="px-3 py-2 bg-card border border-theme text-green-600 rounded-md hover:bg-green-100 transition-colors whitespace-nowrap"
                        title="Add new unit"
                      >
                        <Plus className="w-4 h-4 text-headings" />
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-headings mb-1">Currency</label>
                    <select
                      value={editForm.currency}
                      onChange={(e) => handleEditFieldChange("currency", e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-theme rounded-md
  bg-[var(--bg-card)] text-[var(--text-primary)]
  focus:ring-2 focus:ring-[var(--accent-blue)]
  focus:border-[var(--accent-blue)]
  outline-none cursor-pointer transition-all"
                      style={{
                        ...focusRingStyle,
                        colorScheme: "dark"
                      }}
                    >
                      <option
                        value="USA"
                        className="bg-[var(--bg-card)] text-[var(--text-primary)]"
                      >
                        USA
                      </option>

                      <option
                        value="CAD"
                        className="bg-[var(--bg-card)] text-[var(--text-primary)]"
                      >
                        CAD
                      </option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-headings mb-1">Date</label>
                    <input
                      type="date"
                      value={editForm.date}
                      onChange={(e) => handleEditFieldChange("date", e.target.value)}
                      className="w-full px-3 py-2 border border-theme rounded-md focus:ring-2 focus:border-transparent"
                      style={{
                        ...(focusRingStyle || {}),
                        colorScheme: "dark"
                      }}

                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-headings mb-1">Fuel Vendor</label>
                    <div className="flex gap-2">
                      <select
                        value={editForm.fuelVendor}
                        onChange={(e) => handleEditFieldChange("fuelVendor", e.target.value)}
                        className="flex-1 px-3 py-2 border border-theme rounded-md focus:ring-2 focus:border-transparent"
                        style={focusRingStyle}
                      >
                        <option value="">Select Fuel Vendor</option>
                        {loadingEditFuelVendors ? (
                          <option disabled>Loading...</option>
                        ) : (
                          editFuelVendors.map((v) => (
                            <option key={v._id} value={v.name}>
                              {v.name}
                            </option>
                          ))
                        )}
                      </select>
                      <button
                        type="button"
                        onClick={() => {
                          setShowEditAddVendorModal(true);
                          setNewEditVendorName('');
                        }}
                        className="px-3 py-2 bg-card border border-theme text-green-600 rounded-md hover:bg-green-100 transition-colors whitespace-nowrap"
                        title="Add new fuel vendor"
                      >
                        <Plus className="w-4 h-4 text-headings" />
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-headings mb-1">Fuel Amount</label>
                    <input
                      type="number"
                      step="0.01"
                      value={editForm.fuelAmount}
                      onChange={(e) => handleEditFieldChange("fuelAmount", e.target.value)}
                      placeholder="0.00"
                      className="w-full px-3 py-2 border border-theme rounded-md focus:ring-2 focus:border-transparent"
                      style={focusRingStyle}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-headings mb-1">Payment Notes</label>
                    <textarea
                      value={editForm.paymentNotes}
                      onChange={(e) => handleEditFieldChange("paymentNotes", e.target.value)}
                      placeholder="Internal remarks or accounting references"
                      rows={2}
                      className="w-full px-3 py-2 border border-theme rounded-md focus:ring-2 focus:border-transparent"
                      style={focusRingStyle}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-headings mb-1">Status</label>
                    <select
                      value={editForm.status}
                      onChange={(e) => handleEditFieldChange("status", e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-theme rounded-md
  bg-[var(--bg-card)] text-[var(--text-primary)]
  focus:ring-2 focus:ring-[var(--accent-blue)]
  focus:border-[var(--accent-blue)]
  outline-none cursor-pointer transition-all"
                      style={{
                        ...focusRingStyle,
                        colorScheme: "dark"
                      }}
                    >
                      <option
                        value="pending"
                        className="bg-[var(--bg-card)] text-[var(--text-primary)]"
                      >
                        Pending
                      </option>

                      <option
                        value="approved"
                        className="bg-[var(--bg-card)] text-[var(--text-primary)]"
                      >
                        Approved
                      </option>

                      <option
                        value="rejected"
                        className="bg-[var(--bg-card)] text-[var(--text-primary)]"
                      >
                        Rejected
                      </option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex-shrink-0 bg-card px-6 py-4 flex justify-end gap-3 border-t border-theme">
              <button
                onClick={closeEditModal}
                disabled={editSubmitting}
                className="px-6 py-2 border border-theme rounded-lg text-headings hover:bg-[rgba(255,255,255,0.03)] transition-colors disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateSubmit}
                disabled={editSubmitting}
                className="px-6 py-2 rounded-lg !text-white font-semibold transition-colors disabled:opacity-60 bg-[var(--accent-navyblue)]"

              >
                {editSubmitting ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>

          {/* Add Fuel Type Modal for Edit */}
          {showEditAddTypeModal && (
            <>
              <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-[102]" onClick={() => setShowEditAddTypeModal(false)}></div>
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
                        value={newEditTypeName}
                        onChange={(e) => setNewEditTypeName(e.target.value)}
                        placeholder="e.g., Diesel, Gasoline, Electric"
                        className="w-full px-3 py-2 border border-theme rounded-md focus:ring-2 focus:border-transparent"
                        style={focusRingStyle}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            handleEditAddNewType();
                          }
                        }}
                        autoFocus
                      />
                    </div>
                    <div className="flex justify-end gap-3 pt-2">
                      <button
                        onClick={() => {
                          setShowEditAddTypeModal(false);
                          setNewEditTypeName('');
                        }}
                        disabled={addingEditType}
                        className="px-4 py-2 border border-theme rounded-lg text-primary hover:bg-[rgba(255,255,255,0.03)] transition-colors disabled:opacity-60"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleEditAddNewType}
                        disabled={addingEditType || !newEditTypeName.trim()}
                        className="px-4 py-2 rounded-lg !text-white transition-colors disabled:opacity-60"
                        style={{ background: FLEET_COLORS.gradient }}
                      >
                        {addingEditType ? 'Adding...' : 'Add Type'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Add Unit Modal for Edit */}
          {showEditAddUnitModal && (
            <>
              <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-[102]" onClick={() => setShowEditAddUnitModal(false)}></div>
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
                        value={newEditUnitName}
                        onChange={(e) => setNewEditUnitName(e.target.value)}
                        placeholder="e.g., L, gal, ml"
                        className="w-full px-3 py-2 border border-theme rounded-md focus:ring-2 focus:border-transparent"
                        style={focusRingStyle}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            handleEditAddNewUnit();
                          }
                        }}
                        autoFocus
                      />
                    </div>
                    <div className="flex justify-end gap-3 pt-2">
                      <button
                        onClick={() => {
                          setShowEditAddUnitModal(false);
                          setNewEditUnitName('');
                        }}
                        disabled={addingEditUnit}
                        className="px-4 py-2 border border-theme rounded-lg text-primary hover:bg-[rgba(255,255,255,0.03)] transition-colors disabled:opacity-60"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleEditAddNewUnit}
                        disabled={addingEditUnit || !newEditUnitName.trim()}
                        className="px-4 py-2 rounded-lg !text-white transition-colors disabled:opacity-60"
                        style={{ background: FLEET_COLORS.gradient }}
                      >
                        {addingEditUnit ? 'Adding...' : 'Add Unit'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Add Fuel Vendor Modal for Edit */}
          {showEditAddVendorModal && (
            <>
              <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-[102]" onClick={() => setShowEditAddVendorModal(false)}></div>
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
                        value={newEditVendorName}
                        onChange={(e) => setNewEditVendorName(e.target.value)}
                        placeholder="e.g., Shell, Chevron, Petro-Canada"
                        className="w-full px-3 py-2 border border-theme rounded-md focus:ring-2 focus:border-transparent"
                        style={focusRingStyle}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            handleEditAddNewVendor();
                          }
                        }}
                        autoFocus
                      />
                    </div>
                    <div className="flex justify-end gap-3 pt-2">
                      <button
                        onClick={() => {
                          setShowEditAddVendorModal(false);
                          setNewEditVendorName('');
                        }}
                        disabled={addingEditVendor}
                        className="px-4 py-2 border border-theme rounded-lg text-primary hover:bg-[rgba(255,255,255,0.03)] transition-colors disabled:opacity-60"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleEditAddNewVendor}
                        disabled={addingEditVendor || !newEditVendorName.trim()}
                        className="px-4 py-2 rounded-lg !text-white transition-colors disabled:opacity-60"
                        style={{ background: FLEET_COLORS.gradient }}
                      >
                        {addingEditVendor ? 'Adding...' : 'Add Vendor'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModalOpen && deleteTarget && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-card rounded-2xl shadow-2xl p-6 w-full max-w-md space-y-4">
            <div className="flex items-start gap-3">
              <div className="text-red-500 text-3xl">⚠️</div>
              <div>
                <h3 className="text-lg font-semibold text-primary">Delete Fuel Report</h3>
                <p className="text-sm text-secondary mt-1">
                  Are you sure you want to delete the fuel report for{" "}
                  <span className="font-medium text-primary">{renderVehicleLabel(deleteTarget)}</span>?
                  This action cannot be undone.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={closeDeleteModal}
                disabled={deleteLoading}
                className="px-4 py-2 rounded-lg bg-gray-200 text-primary hover:bg-gray-300 transition-colors disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={deleteLoading}
                className="px-4 py-2 rounded-lg bg-red-600 !text-white hover:bg-red-700 transition-colors disabled:opacity-60"
              >
                {deleteLoading ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import Fuel (CSV) Modal */}
      {importModalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-card rounded-2xl shadow-2xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-primary">Import Fuel Records (CSV)</h3>
              <button onClick={closeImportModal} disabled={csvImporting} className="text-secondary hover:text-secondary">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-secondary">Upload a CSV from your fuel provider (e.g., Flying J, Shell). Map columns to fields.</p>

            {/* File Upload */}
            {!csvFile && (
              <div
                className="border-2 border-dashed border-theme rounded-lg p-6 text-center cursor-pointer hover:border-blue-400 transition-colors"
                onClick={() => csvFileInputRef.current?.click()}
              >
                <input
                  ref={csvFileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleCsvFileSelect}
                  className="hidden"
                />
                <Upload className="w-10 h-10 mx-auto text-secondary mb-2" />
                <p className="text-sm text-secondary">Click to browse or drag & drop CSV file</p>
                <p className="text-xs text-secondary mt-1">Supported: CSV files only</p>
              </div>
            )}

            {/* Parsing State */}
            {csvParsing && (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                <p className="mt-2 text-sm text-secondary">Parsing CSV file...</p>
              </div>
            )}

            {/* Column Mapping */}
            {csvHeaders.length > 0 && !csvParsing && (
              <div className="space-y-4">
                <div className="bg-card border border-blue-200 rounded-lg p-4">
                  <p className="text-sm font-medium text-blue-900 mb-2">CSV File: {csvFile?.name}</p>
                  <p className="text-xs text-blue-700">Found {csvHeaders.length} columns, {csvSampleRows.length} sample rows</p>
                </div>

                {/* Default Values */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-primary mb-1">Default Unit <span className="text-red-500">*</span></label>
                    <select
                      value={defaultUnitForImport}
                      onChange={(e) => setDefaultUnitForImport(e.target.value)}
                      className="w-full px-3 py-2 border border-theme rounded-md focus:ring-2 focus:border-transparent text-sm"
                      style={focusRingStyle}
                    >
                      <option value="">Select Unit</option>
                      {units.map(unit => (
                        <option key={unit.id} value={unit.id}>
                          {formatUnitLabel(unit)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-primary mb-1">Default Currency</label>
                    <select
                      value={defaultCurrencyForImport}
                      onChange={(e) => setDefaultCurrencyForImport(e.target.value)}
                      className="w-full px-3 py-2 border border-theme rounded-md focus:ring-2 focus:border-transparent text-sm"
                      style={focusRingStyle}
                    >
                      <option value="USA">USA (USD)</option>
                      <option value="CAD">CAD</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-primary mb-1">Default Product</label>
                    <input
                      type="text"
                      value={defaultProductForImport}
                      onChange={(e) => setDefaultProductForImport(e.target.value)}
                      placeholder="e.g., Truck Diesel"
                      className="w-full px-3 py-2 border border-theme rounded-md focus:ring-2 focus:border-transparent text-sm"
                      style={focusRingStyle}
                    />
                  </div>
                </div>

                {/* Column Mapping */}
                <div className="border border-theme rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-primary mb-3">Map CSV Columns to Fields</h4>
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-primary mb-1">Date <span className="text-red-500">*</span></label>
                        <select
                          value={csvMapping.date || ""}
                          onChange={(e) => setCsvMapping(prev => ({ ...prev, date: e.target.value }))}
                          className="w-full px-2 py-1.5 border border-theme rounded-md text-xs"
                        >
                          <option value="">Select column...</option>
                          {csvHeaders.map(header => (
                            <option key={header} value={header}>{header}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-primary mb-1">Transaction Amount <span className="text-red-500">*</span></label>
                        <select
                          value={csvMapping.transactionAmount || ""}
                          onChange={(e) => setCsvMapping(prev => ({ ...prev, transactionAmount: e.target.value }))}
                          className="w-full px-2 py-1.5 border border-theme rounded-md text-xs"
                        >
                          <option value="">Select column...</option>
                          {csvHeaders.map(header => (
                            <option key={header} value={header}>{header}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-primary mb-1">Fuel Amount <span className="text-red-500">*</span></label>
                        <select
                          value={csvMapping.fuelAmount || ""}
                          onChange={(e) => setCsvMapping(prev => ({ ...prev, fuelAmount: e.target.value }))}
                          className="w-full px-2 py-1.5 border border-theme rounded-md text-xs"
                        >
                          <option value="">Select column...</option>
                          {csvHeaders.map(header => (
                            <option key={header} value={header}>{header}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-primary mb-1">Transaction Number</label>
                        <select
                          value={csvMapping.transactionNumber || ""}
                          onChange={(e) => setCsvMapping(prev => ({ ...prev, transactionNumber: e.target.value }))}
                          className="w-full px-2 py-1.5 border border-theme rounded-md text-xs"
                        >
                          <option value="">Select column...</option>
                          {csvHeaders.map(header => (
                            <option key={header} value={header}>{header}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-primary mb-1">Fuel Vendor</label>
                        <select
                          value={csvMapping.fuelVendor || ""}
                          onChange={(e) => setCsvMapping(prev => ({ ...prev, fuelVendor: e.target.value }))}
                          className="w-full px-2 py-1.5 border border-theme rounded-md text-xs"
                        >
                          <option value="">Select column...</option>
                          {csvHeaders.map(header => (
                            <option key={header} value={header}>{header}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-primary mb-1">Unit</label>
                        <select
                          value={csvMapping.unit || ""}
                          onChange={(e) => setCsvMapping(prev => ({ ...prev, unit: e.target.value }))}
                          className="w-full px-2 py-1.5 border border-theme rounded-md text-xs"
                        >
                          <option value="">Select column...</option>
                          {csvHeaders.map(header => (
                            <option key={header} value={header}>{header}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-primary mb-1">City</label>
                        <select
                          value={csvMapping.city || ""}
                          onChange={(e) => setCsvMapping(prev => ({ ...prev, city: e.target.value }))}
                          className="w-full px-2 py-1.5 border border-theme rounded-md text-xs"
                        >
                          <option value="">Select column...</option>
                          {csvHeaders.map(header => (
                            <option key={header} value={header}>{header}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-primary mb-1">State</label>
                        <select
                          value={csvMapping.state || ""}
                          onChange={(e) => setCsvMapping(prev => ({ ...prev, state: e.target.value }))}
                          className="w-full px-2 py-1.5 border border-theme rounded-md text-xs"
                        >
                          <option value="">Select column...</option>
                          {csvHeaders.map(header => (
                            <option key={header} value={header}>{header}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-primary mb-1">Address</label>
                        <select
                          value={csvMapping.address || ""}
                          onChange={(e) => setCsvMapping(prev => ({ ...prev, address: e.target.value }))}
                          className="w-full px-2 py-1.5 border border-theme rounded-md text-xs"
                        >
                          <option value="">Select column...</option>
                          {csvHeaders.map(header => (
                            <option key={header} value={header}>{header}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-primary mb-1">Odometer</label>
                        <select
                          value={csvMapping.odometer || ""}
                          onChange={(e) => setCsvMapping(prev => ({ ...prev, odometer: e.target.value }))}
                          className="w-full px-2 py-1.5 border border-theme rounded-md text-xs"
                        >
                          <option value="">Select column...</option>
                          {csvHeaders.map(header => (
                            <option key={header} value={header}>{header}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-primary mb-1">Product</label>
                        <select
                          value={csvMapping.product || ""}
                          onChange={(e) => setCsvMapping(prev => ({ ...prev, product: e.target.value }))}
                          className="w-full px-2 py-1.5 border border-theme rounded-md text-xs"
                        >
                          <option value="">Select column...</option>
                          {csvHeaders.map(header => (
                            <option key={header} value={header}>{header}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Sample Data Preview */}
                {csvSampleRows.length > 0 && (
                  <div className="border border-theme rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-primary mb-2">Sample Data Preview</h4>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead className="bg-card">
                          <tr>
                            {csvHeaders.map(header => (
                              <th key={header} className="px-2 py-1 text-left border border-theme">{header}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {csvSampleRows.slice(0, 3).map((row, idx) => (
                            <tr key={idx}>
                              {csvHeaders.map(header => (
                                <td key={header} className="px-2 py-1 border border-theme">{row[header] || '—'}</td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Import Result */}
                {csvImportResult && (
                  <div className={`border rounded-lg p-4 ${csvImportResult.failed > 0 ? 'bg-card border-yellow-200' : 'bg-green-50 border-green-200'}`}>
                    <p className="text-sm font-medium mb-2">
                      Import Result: <span className="text-green-600">{csvImportResult.success} successful</span>
                      {csvImportResult.failed > 0 && <span className="text-[#A855F7]">, {csvImportResult.failed} failed</span>}
                    </p>
                    {csvImportResult.errors.length > 0 && (
                      <div className="max-h-32 overflow-y-auto">
                        <p className="text-xs font-medium text-primary mb-1">Errors:</p>
                        <ul className="text-xs text-secondary list-disc list-inside">
                          {csvImportResult.errors.map((error, idx) => (
                            <li key={idx}>{error}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-2 border-t">
                  <button
                    onClick={closeImportModal}
                    disabled={csvImporting}
                    className="px-4 py-2 rounded-lg border border-theme text-primary hover:bg-[rgba(255,255,255,0.03)] disabled:opacity-60"
                  >
                    {csvImportResult ? 'Close' : 'Cancel'}
                  </button>
                  {!csvImportResult && (
                    <button
                      onClick={handleCsvImport}
                      disabled={csvImporting || !csvMapping.date || !csvMapping.transactionAmount || !csvMapping.fuelAmount || !defaultUnitForImport}
                      className="px-4 py-2 rounded-lg !text-white disabled:opacity-60 disabled:cursor-not-allowed"
                      style={{ background: FLEET_COLORS.gradient }}
                    >
                      {csvImporting ? 'Importing...' : 'Import'}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Upload Receipt (OCR) Modal */}
      {ocrModalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-card rounded-2xl shadow-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-primary">Upload Receipt (OCR)</h3>
              <button onClick={closeOcrModal} disabled={ocrExtracting} className="text-secondary hover:text-secondary">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-secondary">Upload a photo or PDF of your fuel receipt. AI will extract Total Amount, Gallons, Date, and other details.</p>

            {/* File Upload */}
            {!ocrFile && (
              <div
                className="border-2 border-dashed border-theme rounded-lg p-6 text-center cursor-pointer hover:border-blue-400 transition-colors"
                onClick={() => ocrFileInputRef.current?.click()}
              >
                <input
                  ref={ocrFileInputRef}
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp,application/pdf"
                  onChange={handleOcrFileSelect}
                  className="hidden"
                />
                <FileText className="w-10 h-10 mx-auto text-secondary mb-2" />
                <p className="text-sm text-secondary">Click to browse or drag & drop receipt</p>
                <p className="text-xs text-secondary mt-1">Supported: JPG, PNG, WebP, PDF</p>
              </div>
            )}

            {/* Extracting State */}
            {ocrExtracting && (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                <p className="mt-2 text-sm text-secondary">Extracting data from receipt...</p>
                <p className="text-xs text-secondary mt-1">This may take a few seconds</p>
              </div>
            )}

            {/* Extracted Data Preview */}
            {ocrExtractedData && !ocrExtracting && (
              <div className="space-y-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-5 h-5 text-green-600" />
                    <p className="text-sm font-medium text-green-900">Data extracted successfully!</p>
                  </div>
                  <p className="text-xs text-green-700">Review the extracted data below and click "Create Fuel Report" to proceed.</p>
                </div>

                {/* Extracted Data Display */}
                <div className="border border-theme rounded-lg p-4 space-y-3">
                  <h4 className="text-sm font-semibold text-primary">Extracted Information</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    {ocrExtractedData.transactionAmount && (
                      <div>
                        <span className="text-secondary">Transaction Amount:</span>
                        <span className="ml-2 font-medium text-primary">
                          ${parseFloat(ocrExtractedData.transactionAmount).toFixed(2)}
                        </span>
                      </div>
                    )}
                    {ocrExtractedData.fuelAmount && (
                      <div>
                        <span className="text-secondary">Fuel Amount:</span>
                        <span className="ml-2 font-medium text-primary">
                          {parseFloat(ocrExtractedData.fuelAmount).toFixed(2)} {ocrExtractedData.fuelAmountUnit || 'gallons'}
                        </span>
                      </div>
                    )}
                    {ocrExtractedData.date && (
                      <div>
                        <span className="text-secondary">Date:</span>
                        <span className="ml-2 font-medium text-primary">{ocrExtractedData.date}</span>
                      </div>
                    )}
                    {ocrExtractedData.fuelVendor && (
                      <div>
                        <span className="text-secondary">Vendor:</span>
                        <span className="ml-2 font-medium text-primary">{ocrExtractedData.fuelVendor}</span>
                      </div>
                    )}
                    {ocrExtractedData.transactionNumber && (
                      <div>
                        <span className="text-secondary">Transaction #:</span>
                        <span className="ml-2 font-medium text-primary">{ocrExtractedData.transactionNumber}</span>
                      </div>
                    )}
                    {ocrExtractedData.product && (
                      <div>
                        <span className="text-secondary">Product:</span>
                        <span className="ml-2 font-medium text-primary">{ocrExtractedData.product}</span>
                      </div>
                    )}
                    {ocrExtractedData.location?.city && (
                      <div>
                        <span className="text-secondary">City:</span>
                        <span className="ml-2 font-medium text-primary">{ocrExtractedData.location.city}</span>
                      </div>
                    )}
                    {ocrExtractedData.location?.state && (
                      <div>
                        <span className="text-secondary">State:</span>
                        <span className="ml-2 font-medium text-primary">{ocrExtractedData.location.state}</span>
                      </div>
                    )}
                    {ocrExtractedData.odometer && (
                      <div>
                        <span className="text-secondary">Odometer:</span>
                        <span className="ml-2 font-medium text-primary">{ocrExtractedData.odometer}</span>
                      </div>
                    )}
                    {ocrExtractedData.currency && (
                      <div>
                        <span className="text-secondary">Currency:</span>
                        <span className="ml-2 font-medium text-primary">{ocrExtractedData.currency}</span>
                      </div>
                    )}
                  </div>
                  {ocrExtractedData.location?.address && (
                    <div className="pt-2 border-t">
                      <span className="text-secondary text-sm">Address:</span>
                      <p className="mt-1 text-sm font-medium text-primary">{ocrExtractedData.location.address}</p>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-2 border-t">
                  <button
                    onClick={closeOcrModal}
                    disabled={ocrExtracting}
                    className="px-4 py-2 rounded-lg border border-theme text-primary hover:bg-[rgba(255,255,255,0.03)] disabled:opacity-60"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateFromOcr}
                    disabled={ocrExtracting}
                    className="px-4 py-2 rounded-lg !text-white disabled:opacity-60 disabled:cursor-not-allowed"
                    style={{ background: FLEET_COLORS.gradient }}
                  >
                    Create Fuel Report
                  </button>
                </div>
              </div>
            )}

            {/* File Selected but Not Extracted Yet */}
            {ocrFile && !ocrExtractedData && !ocrExtracting && (
              <div className="text-center py-4">
                <p className="text-sm text-secondary">File selected: {ocrFile.name}</p>
                <p className="text-xs text-secondary mt-1">Click the file input again to re-select or extract</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default FuelReports;

