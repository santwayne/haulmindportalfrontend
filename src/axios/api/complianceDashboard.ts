import apiClient from "../apiClient";

export interface ComplianceSafetyAlert {
  unitNo: string;
  makeModel?: string;
  safetyExpiry: string;
  daysUntilExpiry: number;
  status: "expired" | "warning";
}

export interface CompliancePmService {
  type: string;
  dueAt: number;
  kmRemaining: number;
  status: "due" | "overdue" | "ok";
  dueDate?: string; // For days-based services
}

export interface CompliancePmUnit {
  unitNo: string;
  unitType?: string; // 'Truck' or 'Trailer'
  makeModel?: string;
  currentOdometer: number;
  nextServices: CompliancePmService[];
  overdueCount: number;
  dueCount: number;
}

export interface ComplianceInvoiceSummary {
  total: number;
  byType: {
    scheduled: number;
    general: number;
    safety: number;
  };
  count: number;
}

export interface FleetOperational {
  activeTrucks: number;
  outOfServiceTrucks: number;
  vehiclesUnderRepair: number;
  vehiclesWithPendingService: number;
}

export interface ComplianceAssetCounts {
  trucks: number;
  trailers: number;
  drivers: number;
  gpsOnline: number;
}

export interface ComplianceDocument {
  _id: string;
  documentType: string;
  documentNumber: string;
  expiryDate: string;
  issuedAt?: string;
  status: 'expired' | 'due';
  daysUntilExpiry: number | null;
  assetType: 'vehicle' | 'trailer';
  unitNo: string;
  makeModel: string;
  plateNumber: string;
  unitType: string;
}

export interface ComplianceDashboardResponse {
  success: boolean;
  requiresCompanySetup?: boolean;
  data: {
    safetyAlerts: ComplianceSafetyAlert[];
    pmStatus: CompliancePmUnit[];
    invoiceSummary: {
      month: ComplianceInvoiceSummary;
      ytd: ComplianceInvoiceSummary;
    };
    inactiveUnits: number;
    fleetOperational: FleetOperational;
    assetCounts?: ComplianceAssetCounts;
    complianceDocuments: ComplianceDocument[];
    pendingServicesByType?: { [serviceName: string]: number }; // Pending services grouped by service type
    overdueServicesCount?: number; // Count of overdue services from scheduled-services-log
  };
  message?: string;
}

export const fetchComplianceDashboard = async () => {
  const res = await apiClient.get<ComplianceDashboardResponse>('/admin/compliance/dashboard');
  return res.data;
};

