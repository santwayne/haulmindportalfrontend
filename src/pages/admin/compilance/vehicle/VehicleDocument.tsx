import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import type { ReactNode, CSSProperties } from "react";
import { FaCar, FaPlus, FaEdit, FaTrash, FaFileUpload, FaFileAlt, FaTimes, FaCheckCircle, FaExclamationCircle, FaInfoCircle, FaEye, FaDownload, FaTrailer } from "react-icons/fa";
import {
  getVehicleDocument,
  createVehicleDocument,
  updateVehicleDocument,
  deleteVehicleDocument,
  getSignedVehicleDocumentUrl
} from "../../../../axios/api/compilance.vehicledoc";
import { useVehicles } from "../../../../customHooks/useVehicles";
import { useTrailers } from "../../../../customHooks/useTrailers";
import { FLEET_COLORS } from "../../fleetMaintenance/colorUtils";

const ACCENT_PRIMARY = FLEET_COLORS.primary;
const ACCENT_GRADIENT = FLEET_COLORS.gradient;
const focusRingStyle = {
  "--tw-ring-color": ACCENT_PRIMARY
} as CSSProperties & { "--tw-ring-color": string };
const notificationInfoStyle: CSSProperties = {
  backgroundColor: "rgba(1, 106, 178, 0.08)",
  borderColor: "rgba(1, 106, 178, 0.3)"
};

// Types
type AssetType = 'vehicle' | 'trailer';

interface Vehicle {
  _id: string;
  make?: string;
  model?: string;
  year?: number | null;
  plateNumber?: string;
  status?: string;
  internalId?: string;
  assetType?: AssetType;
  trailerName?: string;
  type?: string;
  capacity?: string;
}

interface DocumentFile {
  _id?: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  uploadedAt: string;
  fileType: string;
}

interface Document {
  _id: string;
  documentType: 'insurance' | 'permit' | 'fitness' | 'pollution' | 'driver_license' | 'logbook' | 'maintenance' | 'trailer_registration' | 'safety_inspection' | 'brake_certificate' | 'coupling_certificate' | 'other';
  documentNumber: string;
  expiryDate: string;
  issuedAt: string;
  status?: string;
  documentLocation?: string;
  files?: DocumentFile[];
  assetType?: AssetType;
  vehicleId?: string;
  trailerId?: string;
}

interface VehicleDocument {
  _id: string;
  assetType: AssetType;
  vehicle: Vehicle;
  documents: Document[];
}

interface FormData {
  vehicleId: string;
  trailerId: string;
  assetType: AssetType;
  documentType: 'insurance' | 'permit' | 'fitness' | 'pollution' | 'driver_license' | 'logbook' | 'maintenance' | 'trailer_registration' | 'safety_inspection' | 'brake_certificate' | 'coupling_certificate' | 'other';
  documentNumber: string;
  expiryDate: string;
  issuedAt: string;
}

type NotificationType = 'success' | 'error' | 'info';

interface Notification {
  id: number;
  type: NotificationType;
  message: string;
}

interface DeleteConfirmation {
  show: boolean;
  docId: string | null;
}

const normalizeAsset = (entity: any, explicitType?: AssetType): Vehicle => {
  const resolvedType: AssetType =
    explicitType || entity?.assetType || (entity?.trailer || entity?.type ? "trailer" : "vehicle");
  const id = entity?._id ? String(entity._id) : "";
  const yearValue =
    typeof entity?.year === "number"
      ? entity.year
      : entity?.year
        ? Number(entity.year)
        : null;

  return {
    _id: id,
    make:
      resolvedType === "trailer"
        ? entity?.trailer || entity?.make || "Trailer"
        : entity?.make || entity?.vehicle || "",
    model: entity?.model ?? entity?.type ?? "",
    year: yearValue,
    plateNumber: entity?.plateNumber || entity?.vehicleNumber || "",
    status: entity?.status || entity?.operationStatus || "available",
    internalId: entity?.internalId || "",
    assetType: resolvedType,
    trailerName: entity?.trailer,
    type: entity?.type,
    capacity: entity?.capacity,
  };
};

// Notification Component
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

function VehicleDocument() {
  const { vehicles } = useVehicles();
  const { trailers } = useTrailers();
  const modalBodyRef = useRef<HTMLDivElement>(null);

  const [vehicleDocuments, setVehicleDocuments] = useState<VehicleDocument[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [showDocModal, setShowDocModal] = useState<boolean>(false);
  const [editingDoc, setEditingDoc] = useState<Document | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [deleteConfirmation, setDeleteConfirmation] = useState<DeleteConfirmation>({
    show: false,
    docId: null
  });
  const [showViewModal, setShowViewModal] = useState<boolean>(false);
  const [viewingDoc, setViewingDoc] = useState<Document | null>(null);
  const [viewingFile, setViewingFile] = useState<any>(null);
  const [signedFileUrl, setSignedFileUrl] = useState<string | null>(null);
  const [loadingFileUrl, setLoadingFileUrl] = useState<boolean>(false);
  const [viewerError, setViewerError] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'all' | 'trailer'>('all');
  const [formData, setFormData] = useState<FormData>({
    vehicleId: "",
    trailerId: "",
    assetType: "vehicle",
    documentType: "insurance",
    documentNumber: "",
    expiryDate: "",
    issuedAt: ""
  });

  const normalizedVehicles = useMemo<Vehicle[]>(() => {
    if (!Array.isArray(vehicles)) {
      return [];
    }
    return vehicles.map((vehicle: any) => normalizeAsset(vehicle, "vehicle"));
  }, [vehicles]);

  const normalizedTrailers = useMemo<Vehicle[]>(() => {
    if (!Array.isArray(trailers)) {
      return [];
    }
    return trailers.map((trailer: any) => normalizeAsset(trailer, "trailer"));
  }, [trailers]);

  const addNotification = useCallback((type: NotificationType, message: string) => {
    const id = Date.now();
    setNotifications((prev) => [...prev, { id, type, message }]);
  }, []);

  const removeNotification = useCallback((id: number) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const fallbackEntries = useMemo<VehicleDocument[]>(() => {
    const vehicleEntries = normalizedVehicles.map((vehicle) => ({
      _id: vehicle._id,
      assetType: "vehicle" as AssetType,
      vehicle,
      documents: [],
    }));
    const trailerEntries = normalizedTrailers.map((trailer) => ({
      _id: trailer._id,
      assetType: "trailer" as AssetType,
      vehicle: trailer,
      documents: [],
    }));
    return [...vehicleEntries, ...trailerEntries];
  }, [normalizedVehicles, normalizedTrailers]);

  const fetchAllDocuments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getVehicleDocument();
      if (res?.success) {
        const mapped = new Map<string, VehicleDocument>();
        const documentsByVehicle = Array.isArray(res?.documentsByVehicle) ? res.documentsByVehicle : [];

        documentsByVehicle.forEach((item: any) => {
          const assetType: AssetType =
            item?.assetType === "trailer" || item?.assetType === "vehicle"
              ? item.assetType
              : item?.vehicle?.assetType === "trailer" ||
                item?.vehicle?.type ||
                item?.vehicle?.trailer
                ? "trailer"
                : "vehicle";

          const normalized = normalizeAsset(item.vehicle ?? item.trailer ?? {}, assetType);
          const key = `${assetType}:${normalized._id}`;

          const documents = Array.isArray(item?.documents)
            ? item.documents.map((doc: any) => ({
              ...doc,
              assetType:
                doc?.assetType === "trailer" || doc?.assetType === "vehicle"
                  ? doc.assetType
                  : assetType,
              vehicleId: doc?.vehicleId ? String(doc.vehicleId) : undefined,
              trailerId: doc?.trailerId ? String(doc.trailerId) : undefined,
            }))
            : [];

          mapped.set(key, {
            _id: normalized._id,
            assetType,
            vehicle: normalized,
            documents,
          });
        });

        fallbackEntries.forEach((entry) => {
          const key = `${entry.assetType}:${entry._id}`;
          if (!mapped.has(key)) {
            mapped.set(key, entry);
          }
        });

        setVehicleDocuments(Array.from(mapped.values()));
      } else {
        console.error("❌ Failed to load documents:", res?.message);
        addNotification("error", res?.message || "Failed to fetch documents");
        setVehicleDocuments(fallbackEntries);
      }
    } catch (err: any) {
      console.error("❌ Error fetching documents:", err);
      addNotification("error", err?.message || "Failed to fetch documents");
      setVehicleDocuments(fallbackEntries);
    }
    setLoading(false);
  }, [fallbackEntries, addNotification]);

  useEffect(() => {
    fetchAllDocuments();
  }, [fetchAllDocuments]);

  const handleAddDocument = () => {
    setEditingDoc(null);
    setSelectedFile(null);
    const defaultAssetType: AssetType = activeTab === 'trailer' ? 'trailer' : 'vehicle';
    setFormData({
      vehicleId: "",
      trailerId: "",
      assetType: defaultAssetType,
      documentType: "insurance",
      documentNumber: "",
      expiryDate: "",
      issuedAt: ""
    });
    setShowDocModal(true);
  };

  const handleEditDocument = (doc: Document, asset: VehicleDocument) => {
    setEditingDoc(doc);
    setSelectedFile(null);
    const inferredAssetType: AssetType =
      doc?.assetType === "trailer" || doc?.assetType === "vehicle"
        ? doc.assetType
        : asset?.assetType === "trailer"
          ? "trailer"
          : doc?.trailerId
            ? "trailer"
            : "vehicle";

    const rawId =
      inferredAssetType === "trailer"
        ? doc?.trailerId || asset?.vehicle?._id
        : doc?.vehicleId || asset?.vehicle?._id;
    const selectedAssetId = rawId ? String(rawId) : "";

    setFormData({
      vehicleId: inferredAssetType === "vehicle" ? selectedAssetId : "",
      trailerId: inferredAssetType === "trailer" ? selectedAssetId : "",
      assetType: inferredAssetType,
      documentType: doc.documentType || "insurance",
      documentNumber: doc.documentNumber || "",
      expiryDate: doc.expiryDate ? doc.expiryDate.split('T')[0] : "",
      issuedAt: doc.issuedAt ? doc.issuedAt.split('T')[0] : ""
    });
    setShowDocModal(true);
  };

  const handleDeleteDocument = async (docId: string) => {
    setDeleteConfirmation({ show: true, docId });
  };

  const handleViewDocument = (doc: Document) => {
    setViewingDoc(doc);
    setShowViewModal(true);
  };

  const confirmDelete = async () => {
    if (!deleteConfirmation.docId) return;

    try {
      const res = await deleteVehicleDocument(deleteConfirmation.docId);
      if (res?.success) {
        addNotification('success', res.message || "Document deleted successfully");
        fetchAllDocuments();
      } else {
        addNotification('error', res?.message || "Failed to delete document");
      }
    } catch (err: any) {
      addNotification('error', err?.message || "Error deleting document");
    }

    setDeleteConfirmation({ show: false, docId: null });
  };

  const cancelDelete = () => {
    setDeleteConfirmation({ show: false, docId: null });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    // Save scroll position before state update
    const scrollPosition = modalBodyRef.current?.scrollTop || 0;

    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });

    // Restore scroll position after state update
    setTimeout(() => {
      if (modalBodyRef.current) {
        modalBodyRef.current.scrollTop = scrollPosition;
      }
    }, 0);
  };

  const handleAssetTypeChange = (assetType: AssetType) => {
    // Save scroll position before state update
    const scrollPosition = modalBodyRef.current?.scrollTop || 0;

    setFormData((prev) => ({
      ...prev,
      assetType,
      vehicleId: assetType === "vehicle" ? prev.vehicleId : "",
      trailerId: assetType === "trailer" ? prev.trailerId : "",
    }));

    // Restore scroll position after state update
    setTimeout(() => {
      if (modalBodyRef.current) {
        modalBodyRef.current.scrollTop = scrollPosition;
      }
    }, 0);
  };

  const handleAssetSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    // Save scroll position before state update
    const scrollPosition = modalBodyRef.current?.scrollTop || 0;
    const value = e.target.value;

    setFormData((prev) => ({
      ...prev,
      vehicleId: prev.assetType === "vehicle" ? value : "",
      trailerId: prev.assetType === "trailer" ? value : "",
    }));

    // Restore scroll position after state update
    setTimeout(() => {
      if (modalBodyRef.current) {
        modalBodyRef.current.scrollTop = scrollPosition;
      }
    }, 0);
  };

  const handleSubmitDocument = async () => {
    const isTrailer = formData.assetType === "trailer";
    const selectedAssetId = isTrailer ? formData.trailerId : formData.vehicleId;

    if (!selectedAssetId || !formData.documentNumber || !formData.expiryDate || !formData.issuedAt) {
      addNotification('error', "Please fill all required fields");
      return;
    }

    setSubmitting(true);

    const data = new FormData();
    data.append("assetType", formData.assetType);
    if (isTrailer) {
      data.append("trailerId", selectedAssetId);
      data.append("vehicleId", "");
    } else {
      data.append("vehicleId", selectedAssetId);
      data.append("trailerId", "");
    }
    data.append("documentType", formData.documentType);
    data.append("documentNumber", formData.documentNumber);
    data.append("expiryDate", formData.expiryDate);
    data.append("issuedAt", formData.issuedAt);

    if (selectedFile) {
      data.append("document", selectedFile);
    }

    try {
      let res;
      if (editingDoc) {
        res = await updateVehicleDocument(editingDoc._id, data);
      } else {
        res = await createVehicleDocument(data);
      }

      if (res?.success) {
        addNotification('success', res.message || `Document ${editingDoc ? "updated" : "created"} successfully`);
        setShowDocModal(false);
        fetchAllDocuments();
      } else {
        addNotification('error', res?.message || `Failed to ${editingDoc ? "update" : "create"} document`);
      }
    } catch (err: any) {
      addNotification('error', err?.message || "Error submitting document");
    }

    setSubmitting(false);
  };

  const getStatusBadgeColor = (status?: string) => {
    switch (status?.toLowerCase()) {
      case "completed":
        return "bg-green-100 text-green-700 border border-green-200";
      case "expired":
        return "bg-red-100 text-red-700 border border-red-200";
      case "expiring-soon":
        return "bg-yellow-100 text-yellow-700 border border-yellow-200";
      default:
        return "bg-card text-primary border border-theme";
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const resolveAssetType = (value?: string): AssetType =>
    value === "trailer" ? "trailer" : "vehicle";

  const getVehicleTypeIcon = (value?: string) => {
    const assetType = resolveAssetType(value);
    if (assetType === "trailer") {
      return <FaTrailer className="text-green-600" size={20} />;
    }
    return <FaCar size={20} style={{ color: ACCENT_PRIMARY }} />;
  };

  const getDocumentTypeDisplayName = (docType: string) => {
    const typeMap: { [key: string]: string } = {
      'insurance': 'Insurance Certificate',
      'permit': 'Operating Permit',
      'fitness': 'Fitness Certificate',
      'pollution': 'Pollution Certificate',
      'driver_license': 'Driver License',
      'logbook': 'Logbook',
      'maintenance': 'Maintenance Record',
      'trailer_registration': 'Trailer Registration',
      'safety_inspection': 'Safety Inspection',
      'brake_certificate': 'Brake Certificate',
      'coupling_certificate': 'Coupling Certificate',
      'other': 'Other Document'
    };
    return typeMap[docType] || docType;
  };

  // Static vehicle type definitions
  const getVehicleTypeInfo = (value?: string) => {
    const assetType = resolveAssetType(value);
    const map: Record<AssetType, { name: string; icon: ReactNode; textStyle: CSSProperties; bgStyle: CSSProperties; description: string }> =
    {
      vehicle: {
        name: "Vehicle",
        icon: <FaCar size={20} style={{ color: ACCENT_PRIMARY }} />,
        textStyle: { color: ACCENT_PRIMARY },
        bgStyle: { backgroundColor: "rgba(1, 106, 178, 0.08)", borderColor: "rgba(1, 106, 178, 0.3)" },
        description: "Company vehicle / truck asset",
      },
      trailer: {
        name: "Trailer",
        icon: <FaTrailer className="text-green-600" size={20} />,
        textStyle: { color: "#15803d" },
        bgStyle: { backgroundColor: "rgba(34, 197, 94, 0.12)", borderColor: "rgba(34, 197, 94, 0.35)" },
        description: "Company trailer asset",
      },
    };
    return map[assetType];
  };

  const getSelectableAssets = useCallback(
    (assetTypeOverride?: AssetType) => {
      const resolvedType: AssetType =
        assetTypeOverride ||
        (activeTab === "trailer" ? "trailer" : "vehicle");
      return resolvedType === "trailer" ? normalizedTrailers : normalizedVehicles;
    },
    [activeTab, normalizedTrailers, normalizedVehicles]
  );

  const getDocumentsWithFallback = () => {
    if (vehicleDocuments.length) return vehicleDocuments;
    return fallbackEntries;
  };

  const getFilteredVehicles = () => {
    const docs = getDocumentsWithFallback();
    if (activeTab === "trailer") {
      return docs.filter((item) => item.assetType === "trailer");
    }
    // When activeTab is "all", only show vehicles (exclude trailers)
    return docs.filter((item) => item.assetType === "vehicle");
  };

  const tabStats = useMemo(() => {
    const docs = getDocumentsWithFallback();
    const vehicles = docs.filter((item) => item.assetType === "vehicle").length;
    const trailers = docs.filter((item) => item.assetType === "trailer").length;
    return { vehicles, trailers };
  }, [vehicleDocuments, fallbackEntries, activeTab]);

  const DocumentModal = () => {
    const currentAssetType = formData.assetType;
    const selectableAssets = getSelectableAssets(currentAssetType);
    const selectedAssetId = currentAssetType === "trailer" ? formData.trailerId : formData.vehicleId;
    const selectedAsset = selectableAssets.find((asset) => asset._id === selectedAssetId);
    const assetInfo = getVehicleTypeInfo(currentAssetType);

    return (
      <div
        className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4"
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            setShowDocModal(false);
          }
        }}
        onScroll={(e) => e.stopPropagation()}
      >
        <div
          className="bg-card rounded-2xl shadow-2xl w-full max-w-lg relative max-h-[90vh] flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Modal Header */}
          <div className="sticky top-0 bg-card border-b border-theme px-6 py-4 flex items-center justify-between rounded-t-2xl flex-shrink-0">
            <div className="flex items-center gap-3">
              {getVehicleTypeIcon(currentAssetType)}
              <div>
                <h3 className="text-xl font-bold text-primary">
                  {editingDoc ? "Update Document" : "Add New Document"}
                </h3>
                <p className="text-sm text-secondary mt-0.5">
                  {assetInfo.name} Documents
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowDocModal(false)}
              className="p-2 hover:bg-[rgba(255,255,255,0.03)] rounded-full transition-colors flex-shrink-0"
              disabled={submitting}
            >
              <FaTimes className="text-secondary" size={20} />
            </button>
          </div>

          {/* Modal Body - Scrollable */}
          <div
            ref={modalBodyRef}
            className="flex-1 overflow-y-auto p-6 space-y-5"
            style={{ scrollBehavior: 'auto' }}
            onScroll={(e) => e.stopPropagation()}
          >
            {/* Asset Type Selector */}
            {activeTab === "all" && (
              <div>
                <label className="block text-sm font-semibold text-primary mb-2">
                  Asset Type <span className="text-red-500">*</span>
                </label>
                <div className="flex items-center gap-3">
                  {(["vehicle", "trailer"] as AssetType[]).map((type) => {
                    const info = getVehicleTypeInfo(type);
                    const isActive = currentAssetType === type;
                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleAssetTypeChange(type);
                        }}
                        className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${isActive
                            ? "shadow-sm"
                            : "bg-card border-theme text-secondary hover:border-[#016ab2]/40"
                          }`}
                        style={isActive ? { ...info.bgStyle, color: info.textStyle.color } : undefined}
                      >
                        {info.icon}
                        {info.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Vehicle Type Context */}
            <div className="p-4 rounded-lg border" style={assetInfo.bgStyle}>
              <div className="flex items-center gap-3">
                {assetInfo.icon}
                <div>
                  <h4 className="font-bold text-lg" style={assetInfo.textStyle}>
                    {assetInfo.name} Documents
                  </h4>
                  <p className="text-sm text-secondary">
                    {currentAssetType === "trailer"
                      ? "Adding documentation for company trailers"
                      : "Adding documentation for company vehicles"}
                  </p>
                </div>
              </div>
            </div>

            {/* Select Vehicle/Trailer */}
            <div>
              <label className="block text-sm font-semibold text-primary mb-2">
                Select {currentAssetType === "trailer" ? "Trailer" : "Vehicle"} <span className="text-red-500">*</span>
                {currentAssetType === "trailer" && (
                  <span className="ml-2 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                    Trailers Only
                  </span>
                )}
              </label>
              <select
                className="w-full border border-theme rounded-lg p-3 bg-card focus:ring-2 focus:border-transparent transition-all"
                style={focusRingStyle}
                value={selectedAssetId}
                onChange={handleAssetSelectChange}
                required
                onFocus={(e) => {
                  e.stopPropagation();
                  // Prevent scroll on focus
                  if (modalBodyRef.current) {
                    const currentScroll = modalBodyRef.current.scrollTop;
                    setTimeout(() => {
                      if (modalBodyRef.current) {
                        modalBodyRef.current.scrollTop = currentScroll;
                      }
                    }, 0);
                  }
                }}
              >
                <option value="">-- Choose an {currentAssetType === "trailer" ? "Trailer" : "Asset"} --</option>
                {selectableAssets.length === 0 ? (
                  <option value="" disabled>
                    {currentAssetType === "trailer" ? "No trailers available" : "No vehicles available"}
                  </option>
                ) : (
                  selectableAssets.map((asset: Vehicle) => {
                    const info = getVehicleTypeInfo(asset.assetType);
                    return (
                      <option key={asset._id} value={asset._id}>
                        {info.name.toUpperCase()}:{" "}
                        {asset.assetType === "trailer"
                          ? `${asset.trailerName || asset.make || "Trailer"} (${asset.type || "Type N/A"})`
                          : `${asset.make ?? "Vehicle"} ${asset.model ?? ""} (${asset.year ?? "N/A"})`}{" "}
                        {asset.plateNumber ? `- ${asset.plateNumber}` : ""}
                      </option>
                    );
                  })
                )}
              </select>

              {/* Selected Vehicle Info */}
              {selectedAsset && (() => {
                const info = getVehicleTypeInfo(selectedAsset.assetType);
                return (
                  <div className="mt-3 p-4 rounded-lg border" style={info.bgStyle}>
                    <div className="flex items-center gap-3">
                      {info.icon}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-bold text-lg" style={info.textStyle}>
                            {info.name.toUpperCase()}
                          </span>
                          <span className="text-xs bg-card bg-opacity-50 px-2 py-1 rounded-full font-medium">
                            {info.description}
                          </span>
                        </div>
                        <p className="font-semibold text-primary text-lg">
                          {selectedAsset.assetType === "trailer"
                            ? selectedAsset.trailerName || selectedAsset.make
                            : `${selectedAsset.make ?? ""} ${selectedAsset.model ?? ""}`}
                        </p>
                        <p className="text-sm text-secondary">
                          {selectedAsset.assetType === "trailer"
                            ? `${selectedAsset.type || "Type N/A"}${selectedAsset.capacity ? ` • Capacity: ${selectedAsset.capacity}` : ""}`
                            : `${selectedAsset.year ?? "Year N/A"} • Plate: ${selectedAsset.plateNumber || "N/A"}`}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Document Type */}
            <div>
              <label className="block text-sm font-semibold text-primary mb-2">
                Document Type <span className="text-red-500">*</span>
                {selectedAsset && (
                  <span className="text-xs text-secondary ml-2">
                    ({selectedAsset.assetType === "trailer" ? "Trailer" : "Vehicle"} Documents)
                  </span>
                )}
              </label>
              <select
                name="documentType"
                className="w-full border border-theme rounded-lg p-3 focus:ring-2 focus:border-transparent transition-all"
                style={focusRingStyle}
                value={formData.documentType}
                onChange={handleInputChange}
                onFocus={(e) => {
                  e.stopPropagation();
                  // Prevent scroll on focus
                  if (modalBodyRef.current) {
                    const currentScroll = modalBodyRef.current.scrollTop;
                    setTimeout(() => {
                      if (modalBodyRef.current) {
                        modalBodyRef.current.scrollTop = currentScroll;
                      }
                    }, 0);
                  }
                }}
              >
                <option value="insurance">Insurance Certificate</option>
                <option value="permit">Operating Permit</option>
                <option value="fitness">Fitness Certificate</option>
                <option value="pollution">Pollution Certificate</option>
                <option value="driver_license">Driver License</option>
                <option value="logbook">Logbook</option>
                <option value="maintenance">Maintenance Record</option>
                {selectedAsset?.assetType === "trailer" && (
                  <>
                    <option value="trailer_registration">Trailer Registration</option>
                    <option value="safety_inspection">Safety Inspection</option>
                    <option value="brake_certificate">Brake Certificate</option>
                    <option value="coupling_certificate">Coupling Certificate</option>
                  </>
                )}
                <option value="other">Other Document</option>
              </select>
            </div>

            {/* Document Number */}
            <div>
              <label className="block text-sm font-semibold text-primary mb-2">
                Document Number <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="documentNumber"
                className="w-full border border-theme rounded-lg p-3 focus:ring-2 focus:border-transparent transition-all"
                style={focusRingStyle}
                value={formData.documentNumber}
                onChange={handleInputChange}
                onFocus={(e) => {
                  e.stopPropagation();
                  // Prevent scroll on focus
                  if (modalBodyRef.current) {
                    const currentScroll = modalBodyRef.current.scrollTop;
                    setTimeout(() => {
                      if (modalBodyRef.current) {
                        modalBodyRef.current.scrollTop = currentScroll;
                      }
                    }, 0);
                  }
                }}
                placeholder="Enter document number"
                required
              />
            </div>

            {/* Issued Date & Expiry Date */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-primary mb-2">
                  Issued Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  name="issuedAt"
                  className="w-full border border-theme rounded-lg p-3 focus:ring-2 focus:border-transparent transition-all"
                  style={focusRingStyle}
                  value={formData.issuedAt}
                  onChange={handleInputChange}
                  onFocus={(e) => {
                    e.stopPropagation();
                    // Prevent scroll on focus
                    if (modalBodyRef.current) {
                      const currentScroll = modalBodyRef.current.scrollTop;
                      setTimeout(() => {
                        if (modalBodyRef.current) {
                          modalBodyRef.current.scrollTop = currentScroll;
                        }
                      }, 0);
                    }
                  }}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-primary mb-2">
                  Expiry Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  name="expiryDate"
                  className="w-full border border-theme rounded-lg p-3 focus:ring-2 focus:border-transparent transition-all"
                  style={focusRingStyle}
                  value={formData.expiryDate}
                  onChange={handleInputChange}
                  onFocus={(e) => {
                    e.stopPropagation();
                    // Prevent scroll on focus
                    if (modalBodyRef.current) {
                      const currentScroll = modalBodyRef.current.scrollTop;
                      setTimeout(() => {
                        if (modalBodyRef.current) {
                          modalBodyRef.current.scrollTop = currentScroll;
                        }
                      }, 0);
                    }
                  }}
                  required
                />
              </div>
            </div>

            {/* Upload Document */}
            <div>
              <label className="block text-sm font-semibold text-primary mb-2">
                Upload Document
              </label>
              <div className="relative">
                <input
                  type="file"
                  className="w-full border border-theme rounded-lg p-3 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-[#016ab2]/10 file:text-[#016ab2] hover:file:bg-[#016ab2]/20 transition-all"
                  style={focusRingStyle}
                  onChange={handleFileChange}
                  onFocus={(e) => e.stopPropagation()}
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                />
              </div>
              {selectedFile && (
                <p className="text-sm text-green-600 mt-2 flex items-center gap-2">
                  <FaFileUpload /> Selected: {selectedFile.name}
                </p>
              )}
            </div>
          </div>

          {/* Modal Footer - Fixed at bottom */}
          <div className="sticky bottom-0 bg-card px-6 py-4 flex justify-end gap-3 border-t rounded-b-2xl flex-shrink-0">
            <button
              type="button"
              className="px-6 py-2.5 bg-card border border-theme text-primary rounded-lg hover:bg-[rgba(255,255,255,0.03)] font-medium transition-colors"
              onClick={() => setShowDocModal(false)}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="button"
              className="px-6 py-2.5 !text-white rounded-lg font-medium transition-colors shadow-md hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: ACCENT_GRADIENT }}
              onClick={handleSubmitDocument}
              disabled={submitting}
            >
              {submitting ? "Saving..." : editingDoc ? "Update Document" : "Add Document"}
            </button>
          </div>
        </div>
      </div>
    );
  };

  const ViewDocumentModal = () => (
    <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <div className="bg-card rounded-2xl shadow-2xl w-full max-w-4xl relative max-h-[90vh] flex flex-col">
        {/* Modal Header */}
        <div className="sticky top-0 bg-card border-b px-6 py-4 flex items-center justify-between rounded-t-2xl z-10 flex-shrink-0">
          <h3 className="text-xl font-bold text-primary">
            Document Details: {getDocumentTypeDisplayName(viewingDoc?.documentType || '')}
          </h3>
          <button
            onClick={() => {
              setShowViewModal(false);
              setViewingFile(null);
              setSignedFileUrl(null);
            }}
            className="p-2 hover:bg-[rgba(255,255,255,0.03)] rounded-full transition-colors"
          >
            <FaTimes className="text-secondary" size={20} />
          </button>
        </div>

        {/* Modal Body - Scrollable */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-6">
            {/* Document Information */}
            <div className="bg-card rounded-xl p-6">
              <h4 className="text-lg font-bold text-primary mb-4">Document Information</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-secondary mb-1">Document Number</label>
                  <p className="text-lg font-semibold text-primary">{viewingDoc?.documentNumber}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-secondary mb-1">Document Type</label>
                  <p className="text-lg font-semibold text-primary capitalize">{getDocumentTypeDisplayName(viewingDoc?.documentType || '')}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-secondary mb-1">Issued Date</label>
                  <p className="text-lg font-semibold text-primary">{formatDate(viewingDoc?.issuedAt || '')}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-secondary mb-1">Expiry Date</label>
                  <p className="text-lg font-semibold text-primary">{formatDate(viewingDoc?.expiryDate || '')}</p>
                </div>
              </div>
              {viewingDoc?.status && (
                <div className="mt-4">
                  <label className="block text-sm font-medium text-secondary mb-1">Status</label>
                  <span className={`text-sm px-3 py-1 rounded-full font-semibold ${getStatusBadgeColor(viewingDoc.status)}`}>
                    {viewingDoc.status}
                  </span>
                </div>
              )}
            </div>

            {/* Document Files */}
            <div>
              <h4 className="text-lg font-bold text-primary mb-4">Uploaded Files</h4>
              {viewingDoc?.files && viewingDoc.files.length > 0 ? (
                <div className="space-y-3">
                  {viewingDoc.files.map((file) => (
                    <div key={file._id || file.fileUrl} className="border border-theme rounded-xl p-4 hover:shadow-lg transition-all bg-card">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg" style={{ backgroundColor: "rgba(1, 106, 178, 0.1)" }}>
                            <FaFileAlt size={18} style={{ color: ACCENT_PRIMARY }} />
                          </div>
                          <div>
                            <p className="font-semibold text-primary">{file.fileName}</p>
                            <p className="text-sm text-secondary">
                              {(file.fileSize / 1024 / 1024).toFixed(2)} MB • {file.fileType.toUpperCase()}
                            </p>
                            <p className="text-xs text-secondary">
                              Uploaded: {formatDate(file.uploadedAt)}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            className="p-2.5 rounded-lg transition-all border"
                            style={{ color: ACCENT_PRIMARY, borderColor: "rgba(1, 106, 178, 0.3)" }}
                            onClick={async () => {
                              try {
                                if (!viewingDoc?._id) return;
                                const fileIndex = viewingDoc.files?.findIndex((f: any) => f.fileUrl === file.fileUrl || f._id === file._id) ?? 0;

                                // Get file extension to determine how to open it
                                const fileExt = file.fileName?.split('.').pop()?.toLowerCase() || file.fileType?.split('/').pop()?.toLowerCase() || '';
                                const isPdf = fileExt === 'pdf' || file.fileType?.toLowerCase().includes('pdf');
                                const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fileExt) || file.fileType?.toLowerCase().startsWith('image/');

                                if (isPdf || isImage) {
                                  // For PDFs and images, set the file to view and fetch signed URL
                                  setViewingFile(file);
                                  setLoadingFileUrl(true);
                                  setSignedFileUrl(null);
                                  setViewerError(false);

                                  try {
                                    const signedRes = await getSignedVehicleDocumentUrl(viewingDoc._id, fileIndex, 'inline');
                                    if (!signedRes || !signedRes.success) {
                                      console.error('❌ Failed to get signed URL:', signedRes);
                                      addNotification('error', 'Failed to generate preview URL. Please try again.');
                                      setLoadingFileUrl(false);
                                      return;
                                    }
                                    const url = signedRes.url || file.fileUrl;
                                    console.log('📄 PDF Signed URL for viewing:', url?.substring(0, 100) + '...');
                                    console.log('📄 URL includes inline:', url?.includes('response-content-disposition=inline'));
                                    setSignedFileUrl(url);

                                    // Set a timeout to detect if PDF doesn't load (10 seconds)
                                    if (isPdf) {
                                      setTimeout(() => {
                                        // Check if iframe/object has loaded content
                                        const iframe = document.querySelector('iframe[title="PDF Preview"]') as HTMLIFrameElement;
                                        const object = document.querySelector('object[type="application/pdf"]') as HTMLObjectElement;

                                        if (iframe || object) {
                                          // Try to detect if content loaded by checking if element is still in DOM
                                          // If after 10 seconds and no error was set, assume it might be blank
                                          // We'll let the onError handler manage this
                                        }
                                      }, 10000);
                                    }
                                  } catch (error) {
                                    console.error('Error getting signed URL:', error);
                                    setSignedFileUrl(file.fileUrl);
                                  } finally {
                                    setLoadingFileUrl(false);
                                  }
                                } else {
                                  // For other file types (Office docs, etc.), show message that they need to download
                                  addNotification('info', 'This file type cannot be previewed in the browser. Please use the download button to view it.');
                                }
                              } catch (error) {
                                console.error('Error viewing file:', error);
                                addNotification('error', 'Error loading file. Please try again.');
                              }
                            }}
                            title="View File"
                          >
                            <FaEye size={16} />
                          </button>
                          <button
                            className="p-2.5 text-green-600 hover:bg-green-50 rounded-lg transition-all border border-green-200"
                            onClick={async () => {
                              try {
                                if (!viewingDoc?._id) return;
                                const fileIndex = viewingDoc.files?.findIndex((f: any) => f.fileUrl === file.fileUrl || f._id === file._id) ?? 0;
                                const signedRes = await getSignedVehicleDocumentUrl(viewingDoc._id, fileIndex, 'attachment');
                                const url = signedRes?.success && signedRes?.url ? signedRes.url : file.fileUrl;
                                const link = document.createElement('a');
                                link.href = url;
                                link.download = file.fileName;
                                link.target = '_blank';
                                document.body.appendChild(link);
                                link.click();
                                document.body.removeChild(link);
                              } catch (error) {
                                console.error('Error downloading file:', error);
                                const link = document.createElement('a');
                                link.href = file.fileUrl;
                                link.download = file.fileName;
                                link.click();
                              }
                            }}
                            title="Download File"
                          >
                            <FaDownload size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-secondary bg-card rounded-xl">
                  <FaFileAlt size={40} className="mx-auto mb-3 opacity-30" />
                  <p className="text-sm font-medium">No files uploaded for this document</p>
                  {viewingDoc?.documentLocation && (
                    <button
                      className="mt-4 inline-flex items-center gap-2 px-4 py-2 !text-white rounded-lg transition-colors hover:opacity-90"
                      style={{ background: ACCENT_GRADIENT }}
                      onClick={async () => {
                        try {
                          if (!viewingDoc?._id) return;
                          const signedRes = await getSignedVehicleDocumentUrl(viewingDoc._id, 0, 'inline');
                          const url = signedRes?.success && signedRes?.url ? signedRes.url : viewingDoc.documentLocation;

                          // Get file extension from documentLocation
                          const urlMatch = url.match(/\.([^.?#]+)(\?|#|$)/);
                          const fileExt = urlMatch ? urlMatch[1].toLowerCase() : '';
                          const isPdf = fileExt === 'pdf';
                          const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fileExt);

                          if (isPdf || isImage) {
                            // Create a link without download attribute to open in browser
                            const link = document.createElement('a');
                            link.href = url;
                            link.target = '_blank';
                            link.rel = 'noopener noreferrer';
                            // Explicitly do NOT set download attribute
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                          } else {
                            // For other file types, show message
                            addNotification('info', 'This file type cannot be previewed in the browser. Please use the download button to view it.');
                          }
                        } catch (error) {
                          console.error('Error getting signed URL:', error);
                          // Fallback: try to open original URL
                          if (viewingDoc?.documentLocation) {
                            const urlMatch = viewingDoc.documentLocation.match(/\.([^.?#]+)(\?|#|$)/);
                            const fileExt = urlMatch ? urlMatch[1].toLowerCase() : '';
                            const isPdf = fileExt === 'pdf';
                            const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fileExt);

                            if (isPdf || isImage) {
                              const link = document.createElement('a');
                              link.href = viewingDoc.documentLocation;
                              link.target = '_blank';
                              link.rel = 'noopener noreferrer';
                              document.body.appendChild(link);
                              link.click();
                              document.body.removeChild(link);
                            } else {
                              addNotification('info', 'This file type cannot be previewed in the browser. Please use the download button to view it.');
                            }
                          }
                        }
                      }}
                    >
                      <FaEye size={16} /> View Document
                    </button>
                  )}
                </div>
              )}

              {/* File Preview Section */}
              {viewingFile && (
                <div className="p-6 border-t border-theme bg-card">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-lg font-bold text-primary">Preview: {viewingFile.fileName}</h4>
                    <button
                      onClick={() => {
                        setViewingFile(null);
                        setSignedFileUrl(null);
                        setViewerError(false);
                      }}
                      className="p-2 hover:bg-gray-200 rounded-full transition-colors"
                    >
                      <FaTimes className="text-secondary" size={16} />
                    </button>
                  </div>

                  {loadingFileUrl ? (
                    <div className="flex flex-col items-center justify-center h-[60vh] bg-card rounded-lg">
                      <div
                        className="animate-spin rounded-full h-12 w-12 border-b-4 mb-4"
                        style={{ borderColor: "rgba(1, 106, 178, 0.2)", borderBottomColor: ACCENT_PRIMARY }}
                      ></div>
                      <p className="text-secondary">Loading file...</p>
                    </div>
                  ) : !signedFileUrl ? (
                    <div className="flex flex-col items-center justify-center h-[60vh] bg-card rounded-lg border-2 border-dashed border-theme">
                      <FaFileAlt className="text-secondary mb-4" size={48} />
                      <p className="text-sm text-secondary mb-4">No file URL available.</p>
                      <button
                        onClick={async () => {
                          try {
                            if (!viewingDoc?._id) return;
                            const fileIndex = viewingDoc.files?.findIndex((f: any) => f.fileUrl === viewingFile.fileUrl || f._id === viewingFile._id) ?? 0;
                            const signedRes = await getSignedVehicleDocumentUrl(viewingDoc._id, fileIndex, 'inline');
                            if (signedRes?.success && signedRes?.url) {
                              setSignedFileUrl(signedRes.url);
                            }
                          } catch (error) {
                            console.error('Error retrying signed URL:', error);
                          }
                        }}
                        className="px-4 py-2 bg-blue-600 !text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                      >
                        <span className="text-white">Retry Loading</span>
                      </button>
                    </div>
                  ) : (() => {
                    const fileExt = viewingFile.fileName?.split('.').pop()?.toLowerCase() || viewingFile.fileType?.split('/').pop()?.toLowerCase() || '';
                    const isPdf = fileExt === 'pdf' || viewingFile.fileType?.toLowerCase().includes('pdf');
                    const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fileExt) || viewingFile.fileType?.toLowerCase().startsWith('image/');

                    if (isPdf) {
                      // Use hash fragment for PDF viewer parameters (doesn't affect signature)
                      // Ensure we have a valid URL
                      if (!signedFileUrl) {
                        return (
                          <div className="flex flex-col items-center justify-center h-[60vh] bg-card rounded-lg border-2 border-dashed border-theme">
                            <FaFileAlt className="text-secondary mb-4" size={48} />
                            <p className="text-sm text-secondary mb-4">No file URL available.</p>
                          </div>
                        );
                      }

                      // Use hash fragment for PDF viewer parameters (doesn't affect signature)
                      const pdfUrl = `${signedFileUrl}#toolbar=0`;
                      console.log('🔍 Loading PDF in iframe. URL length:', pdfUrl.length);
                      console.log('🔍 URL starts with:', pdfUrl.substring(0, 50));
                      console.log('🔍 URL contains inline param:', pdfUrl.includes('response-content-disposition=inline'));

                      return (
                        <div className="relative w-full">
                          <iframe
                            title="PDF Preview"
                            src={pdfUrl}
                            className="w-full h-[60vh] border rounded-lg bg-card"
                            style={{ minHeight: '60vh' }}
                            onError={(e) => {
                              console.error('❌ PDF iframe load error:', e);
                              setViewerError(true);
                            }}
                            onLoad={(e) => {
                              console.log('✅ PDF iframe onLoad triggered');
                              setViewerError(false);
                              // Additional verification after load
                              setTimeout(() => {
                                const iframe = e.currentTarget;
                                if (iframe && iframe.contentWindow) {
                                  try {
                                    // Try to check if PDF loaded (CORS will block but that's expected)
                                    console.log('✅ PDF iframe contentWindow accessible');
                                  } catch (err) {
                                    // CORS error is expected for S3, but PDF should still display
                                    console.log('ℹ️ CORS check (expected for S3):', err);
                                  }
                                }
                              }, 500);
                            }}
                          />
                          <div className="absolute bottom-4 right-4 flex gap-2">
                            <button
                              onClick={() => {
                                window.open(signedFileUrl, '_blank', 'noopener,noreferrer');
                              }}
                              className="px-3 py-2 bg-green-600 !text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium flex items-center gap-2 shadow-lg"
                            >
                              <FaEye size={14} className="text-white" />
                              <span className="text-white">Open in New Tab</span>
                            </button>
                            <button
                              onClick={async () => {
                                try {
                                  if (!viewingDoc?._id) return;
                                  const fileIndex = viewingDoc.files?.findIndex((f: any) => f.fileUrl === viewingFile.fileUrl || f._id === viewingFile._id) ?? 0;
                                  const signedRes = await getSignedVehicleDocumentUrl(viewingDoc._id, fileIndex, 'attachment');
                                  const url = signedRes?.success && signedRes?.url ? signedRes.url : signedFileUrl;
                                  const link = document.createElement('a');
                                  link.href = url || '';
                                  link.download = viewingFile.fileName;
                                  link.target = '_blank';
                                  document.body.appendChild(link);
                                  link.click();
                                  document.body.removeChild(link);
                                } catch (error) {
                                  console.error('Download error:', error);
                                }
                              }}
                              className="px-3 py-2 bg-blue-600 !text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium flex items-center gap-2 shadow-lg"
                            >
                              <FaDownload size={14} className="text-white" />
                              <span className="text-white">Download</span>
                            </button>
                          </div>
                          {viewerError && (
                            <div className="absolute inset-0 flex items-center justify-center bg-card bg-opacity-90 rounded-lg">
                              <div className="text-center p-4">
                                <FaFileAlt className="text-yellow-500 mb-2 mx-auto" size={32} />
                                <p className="text-sm text-secondary mb-3">PDF could not be displayed in viewer.</p>
                                <button
                                  onClick={() => {
                                    window.open(signedFileUrl, '_blank', 'noopener,noreferrer');
                                  }}
                                  className="px-4 py-2 bg-blue-600 !text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                                >
                                  <span className="text-white">Open in New Tab</span>
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    } else if (isImage) {
                      return (
                        <div className="flex flex-col items-center justify-center bg-card rounded-lg border p-4">
                          <img
                            src={signedFileUrl}
                            alt={viewingFile.fileName}
                            className="max-h-[60vh] w-auto mx-auto rounded-lg shadow-lg"
                            onError={(e) => {
                              console.error('Image load error:', e);
                              const target = e.currentTarget;
                              target.style.display = 'none';
                            }}
                          />
                        </div>
                      );
                    } else {
                      return (
                        <div className="flex flex-col items-center justify-center h-[60vh] bg-card rounded-lg border-2 border-dashed border-theme">
                          <FaFileAlt className="text-secondary mb-4" size={48} />
                          <p className="text-sm text-secondary mb-4">This file type cannot be previewed in the browser.</p>
                          <button
                            onClick={async () => {
                              try {
                                if (!viewingDoc?._id) return;
                                const fileIndex = viewingDoc.files?.findIndex((f: any) => f.fileUrl === viewingFile.fileUrl || f._id === viewingFile._id) ?? 0;
                                const signedRes = await getSignedVehicleDocumentUrl(viewingDoc._id, fileIndex, 'attachment');
                                const url = signedRes?.success && signedRes?.url ? signedRes.url : viewingFile.fileUrl;
                                const link = document.createElement('a');
                                link.href = url;
                                link.download = viewingFile.fileName;
                                link.target = '_blank';
                                document.body.appendChild(link);
                                link.click();
                                document.body.removeChild(link);
                              } catch (error) {
                                console.error('Download error:', error);
                              }
                            }}
                            className="px-4 py-2 bg-blue-600 !text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center gap-2"
                          >
                            <FaDownload size={16} className="text-white" />
                            <span className="text-white">Download to View</span>
                          </button>
                        </div>
                      );
                    }
                  })()}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="sticky bottom-0 bg-card px-6 py-4 flex justify-end gap-3 border-t rounded-b-2xl flex-shrink-0">
          <button
            type="button"
            className="px-6 py-2.5 bg-card border border-theme text-primary rounded-lg hover:bg-[rgba(255,255,255,0.03)] font-medium transition-colors"
            onClick={() => {
              setShowViewModal(false);
              setViewingFile(null);
              setSignedFileUrl(null);
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );

  const DeleteConfirmationModal = () => (
    <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <div className="bg-card rounded-2xl shadow-2xl w-full max-w-md relative">
        {/* Modal Header */}
        <div className="bg-card border-b border-red-100 px-6 py-4 flex items-center gap-3 rounded-t-2xl">
          <div className="p-2 bg-red-100 rounded-full">
            <FaTrash className="text-[#A855F7]" size={20} />
          </div>
          <h3 className="text-xl font-bold text-red-900">Delete Document</h3>
        </div>

        {/* Modal Body */}
        <div className="p-6">
          <p className="text-primary text-base">
            Are you sure you want to delete this document? This action cannot be undone.
          </p>
        </div>

        {/* Modal Footer */}
        <div className="bg-card px-6 py-4 flex justify-end gap-3 border-t rounded-b-2xl">
          <button
            type="button"
            className="px-6 py-2.5 bg-card border border-theme text-primary rounded-lg hover:bg-[rgba(255,255,255,0.03)] font-medium transition-colors"
            onClick={cancelDelete}
          >
            Cancel
          </button>
          <button
            type="button"
            className="px-6 py-2.5 bg-red-600 !text-white rounded-lg hover:bg-red-700 font-medium transition-colors shadow-md"
            onClick={confirmDelete}
          >
            Delete Document
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-6  min-h-screen bg-card">
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

      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-primary">Vehicle Documents</h1>
        <button
          onClick={handleAddDocument}
          className="flex items-center gap-2 px-5 py-3 !text-white rounded-lg shadow-lg hover:shadow-xl transition-all font-medium hover:opacity-90"
          style={{ background: ACCENT_GRADIENT }}
        >
          <FaPlus /> Add New Document
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-card rounded-xl shadow-lg border border-theme p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-card rounded-xl">
              <FaCar className="text-secondary" size={24} />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-primary">{tabStats.vehicles}</h3>
              <p className="text-secondary text-sm font-medium">Total Vehicles</p>
            </div>
          </div>
        </div>
        <div className="bg-card rounded-xl shadow-lg border border-theme p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-100 rounded-xl">
              <FaTrailer className="text-green-600" size={24} />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-green-600">{tabStats.trailers}</h3>
              <p className="text-secondary text-sm font-medium">Trailers</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-card rounded-xl shadow-lg border border-theme mb-6">
        <div className="flex border-b border-theme">
          <button
            onClick={() => setActiveTab('all')}
            className={`flex-1 px-6 py-4 text-sm font-semibold transition-all ${activeTab === 'all'
                ? 'border-b-2'
                : 'text-secondary hover:text-primary hover:bg-[rgba(255,255,255,0.03)]'
              }`}
            style={
              activeTab === 'all'
                ? { color: ACCENT_PRIMARY, borderColor: ACCENT_PRIMARY, backgroundColor: "rgba(1, 106, 178, 0.05)" }
                : undefined
            }
          >
            <div className="flex items-center justify-center gap-2">
              <FaCar className="text-secondary" size={16} />
              All Vehicles
              <span className="bg-card text-secondary px-2 py-1 rounded-full text-xs font-medium">
                {tabStats.vehicles}
              </span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('trailer')}
            className={`flex-1 px-6 py-4 text-sm font-semibold transition-all ${activeTab === 'trailer'
                ? 'text-green-600 border-b-2 border-green-600 bg-green-50'
                : 'text-secondary hover:text-primary hover:bg-[rgba(255,255,255,0.03)]'
              }`}
          >
            <div className="flex items-center justify-center gap-2">
              <FaTrailer className="text-green-500" size={16} />
              Trailers
              <span className="bg-green-100 text-green-600 px-2 py-1 rounded-full text-xs font-medium">
                {tabStats.trailers}
              </span>
            </div>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-16">
          <div
            className="animate-spin rounded-full h-16 w-16 border-b-4 mx-auto mb-4"
            style={{ borderColor: "rgba(1, 106, 178, 0.2)", borderBottomColor: ACCENT_PRIMARY }}
          ></div>
          <p className="text-secondary text-lg">Loading vehicles and documents...</p>
        </div>
      ) : getFilteredVehicles().length === 0 ? (
        <div className="bg-card shadow-lg rounded-2xl p-16 text-center text-secondary">
          {activeTab === 'all' ? (
            <>
              <FaCar size={64} className="mx-auto mb-4 text-gray-300" />
              <p className="text-xl font-semibold">No vehicles with documents found</p>
            </>
          ) : (
            <>
              <FaTrailer size={64} className="mx-auto mb-4 text-green-300" />
              <p className="text-xl font-semibold">No trailer documents found</p>
              <p className="text-secondary mt-2">Add documents for your trailers to see them here</p>
            </>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {getFilteredVehicles().map((item) => {
            const assetType = resolveAssetType(item.assetType);
            const headerStyle =
              assetType === "trailer"
                ? { background: "linear-gradient(to right, #22c55e, #15803d)" }
                : { background: ACCENT_GRADIENT };
            const title =
              assetType === "trailer"
                ? item.vehicle?.trailerName || item.vehicle?.make || "Trailer"
                : `${item.vehicle?.make ?? "Vehicle"} ${item.vehicle?.model ?? ""}`.trim();
            const subtitle =
              assetType === "trailer"
                ? `${item.vehicle?.type || "Type N/A"}${item.vehicle?.capacity ? ` • Capacity: ${item.vehicle.capacity}` : ""}`
                : `${item.vehicle?.year ?? "Year N/A"} • Plate: ${item.vehicle?.plateNumber || "N/A"}`;
            const statusLabel =
              assetType === "trailer"
                ? item.vehicle?.type || "Trailer"
                : item.vehicle?.status || "Vehicle";

            return (
              <div key={`${item.assetType}:${item._id}`} className="bg-card shadow-lg rounded-2xl overflow-hidden border border-theme">
                {/* Asset Header */}
                <div className="p-6 text-white" style={headerStyle}>
                  <div className="flex items-center gap-4">
                    <div className="p-4 bg-card text-black bg-opacity-20 rounded-xl backdrop-blur-sm">
                      {getVehicleTypeIcon(assetType)}
                    </div>
                    <div className="flex-1">
                      <h2 className="text-2xl font-bold">
                        {title}
                      </h2>
                      <p className="text-sm opacity-90 mt-1">
                        {subtitle}
                      </p>
                    </div>
                    <span className="px-4 py-1.5 text-black bg-card bg-opacity-20 rounded-full text-sm font-semibold capitalize backdrop-blur-sm">
                      {statusLabel}
                    </span>
                  </div>
                </div>

                {/* Documents List */}
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-primary flex items-center gap-2 text-lg">
                      <FaFileAlt style={{ color: ACCENT_PRIMARY }} />
                      Documents ({item.documents?.length || 0})
                    </h3>
                  </div>

                  {!item.documents || item.documents.length === 0 ? (
                    <div className="text-center py-12 text-secondary bg-card rounded-xl">
                      <FaFileAlt size={40} className="mx-auto mb-3 opacity-30" />
                      <p className="text-sm font-medium">No documents available</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {item.documents.map((doc) => (
                        <div
                          key={doc._id}
                          className="border border-theme rounded-xl p-4 hover:shadow-lg transition-all bg-gradient-to-r from-white to-gray-50"
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <div className="p-2 rounded-lg" style={{ backgroundColor: "rgba(1, 106, 178, 0.1)" }}>
                                <FaFileAlt size={18} style={{ color: ACCENT_PRIMARY }} />
                              </div>
                              <div>
                                <span className="font-bold !text-primary capitalize block text-lg">
                                  {getDocumentTypeDisplayName(doc.documentType)}
                                </span>
                                {doc.status && (
                                  <span className={`text-xs px-3 py-1 rounded-full font-semibold inline-block mt-1 ${getStatusBadgeColor(doc.status)}`}>
                                    {doc.status}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <button
                                className="p-2.5 text-[#00D1FF] hover:bg-blue-50 rounded-lg transition-all border border-blue-200"
                                onClick={() => handleViewDocument(doc)}
                                title="View Document"
                              >
                                <FaEye size={16} />
                              </button>
                              <button
                                className="p-2.5 rounded-lg transition-all border"
                                style={{ color: ACCENT_PRIMARY, borderColor: "rgba(1, 106, 178, 0.3)" }}
                                onClick={() => handleEditDocument(doc, item)}
                                title="Edit Document"
                              >
                                <FaEdit size={16} />
                              </button>
                              <button
                                className="p-2.5 text-[#A855F7] hover:bg-red-50 rounded-lg transition-all border border-red-200"
                                onClick={() => handleDeleteDocument(doc._id)}
                                title="Delete Document"
                              >
                                <FaTrash size={16} />
                              </button>
                            </div>
                          </div>
                          <div className="text-sm text-secondary space-y-1.5 ml-12">
                            <p className="flex items-center gap-2">
                              <span className="font-semibold text-primary">Number:</span>
                              <span className="font-mono bg-card px-2 py-0.5 rounded">{doc.documentNumber}</span>
                            </p>
                            <p className="flex items-center gap-2">
                              <span className="font-semibold text-primary">Issued:</span>
                              <span>{formatDate(doc.issuedAt)}</span>
                              <span className="text-secondary">•</span>
                              <span className="font-semibold text-primary">Expiry:</span>
                              <span>{formatDate(doc.expiryDate)}</span>
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showDocModal && <DocumentModal />}
      {showViewModal && <ViewDocumentModal />}
      {deleteConfirmation.show && <DeleteConfirmationModal />}

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
}

export default VehicleDocument;