import apiClient from "../apiClient";

export type FleetUnitType =
  | "Truck"
  | "Trailer"
  | "Reefer Trailer"
  | "Tri-Axle Trailer"
  | "Dry Van"
  | "Flatbed"
  | "Step Deck"
  | "Lowboy"
  | "Tank Trailer"
  | "Dump Trailer"
  | "Bus/Van";

export interface FleetUnitDto {
  _id: string;
  unitNo: string;
  internalId?: string;
  unitType: FleetUnitType;
  makeModel: string;
  make?: string;
  model?: string;
  vinNo: string;
  licensePlate: string;
  year?: number;
  truckType?: string;
  trailerType?: string;
  capacity?: string;
  initialOdometer: number;
  currentOdometer?: number;
  status: "Active" | "Inactive";
  operationStatus?: string;
  currentLocation?: {
    address?: string;
    latitude?: string;
    longitude?: string;
    updatedAt?: string | Date;
  };
  lastDate?: string;
  reason?: string;
  safetyExpiryDate?: string;
  safetyDecalNumber?: string;
  safetyPaperNumber?: string;
  lastInspectionShop?: string;
  lastInspectionInvoice?: string;
  serviceIntervalDays?: number;
  serviceIntervalMileage?: number;
  createdAt: string;
  updatedAt: string;
  referenceType?: "vehicle" | "trailer" | "custom";
  referenceId?: string;
  lastService?: FleetUnitServiceInfo | null;
  upcomingService?: FleetUnitServiceInfo | null;
  serviceHistory?: FleetUnitServiceInfo[];
  documents?: Array<{
    _id: string;
    documentType: string;
    documentNumber?: string;
    expiryDate?: string;
    issuedAt?: string;
    status?: string;
  }>;
}

export interface FleetUnitServiceInfo {
  _id: string;
  serviceType: string;
  status: "pending" | "in-progress" | "completed";
  serviceDate?: string;
  dueDate?: string;
  odometer?: number | null;
  invoiceNumber?: string | null;
  notes?: string | null;
  priority?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface FleetUnitSummary {
  totalUnits: number;
  activeUnits: number;
  inactiveUnits: number;
  trucks: number;
  trailers: number;
  expiringSoon: number;
  expired: number;
}

export interface FleetUnitsResponse {
  success: boolean;
  data: FleetUnitDto[];
  summary?: FleetUnitSummary;
  message?: string;
  requiresCompanySetup?: boolean;
}

export interface FleetUnitPayload {
  unitNo: string;
  internalId?: string;
  unitType: FleetUnitType;
  makeModel: string;
  vinNo: string;
  licensePlate: string;
  year?: number | string;
  truckType?: string;
  trailerType?: string;
  capacity?: string;
  initialOdometer?: number | string;
  currentOdometer?: number | string;
  status?: "Active" | "Inactive";
  operationStatus?: string;
  address?: string;
  lastDate?: string;
  reason?: string;
  safetyExpiryDate?: string;
  safetyDecalNumber?: string;
  safetyPaperNumber?: string;
  lastInspectionShop?: string;
  lastInspectionInvoice?: string;
  serviceIntervalDays?: number;
  serviceIntervalMileage?: number;
}

export const listFleetUnits = async (params?: {
  search?: string;
  status?: "active" | "inactive";
  category?: "all" | "trucks" | "trailers";
}) => {
  const query = new URLSearchParams();
  if (params?.search) query.set("search", params.search);
  if (params?.status) query.set("status", params.status);
  if (params?.category) query.set("category", params.category);

  const url = `/admin/fleet-maintenance/units${query.toString() ? `?${query.toString()}` : ""}`;
  const res = await apiClient.get<FleetUnitsResponse>(url);
  return res.data;
};

export const getFleetUnitById = async (id: string) => {
  const res = await apiClient.get<{ success: boolean; data: FleetUnitDto }>(`/admin/fleet-maintenance/units/${id}`);
  return res.data;
};

export const createFleetUnit = async (payload: FleetUnitPayload) => {
  try {
    const res = await apiClient.post<{ success: boolean; data: FleetUnitDto; message?: string; code?: string }>(
      `/admin/fleet-maintenance/units`,
      payload
    );
    return res.data;
  } catch (error: any) {
    return error?.response?.data ?? { success: false, message: 'Failed to create fleet unit' };
  }
};

export const updateFleetUnit = async (id: string, payload: FleetUnitPayload) => {
  const res = await apiClient.put<{ success: boolean; data: FleetUnitDto; message?: string }>(
    `/admin/fleet-maintenance/units/${id}`,
    payload
  );
  return res.data;
};

export const deleteFleetUnit = async (id: string) => {
  const res = await apiClient.delete<{ success: boolean; message?: string }>(
    `/admin/fleet-maintenance/units/${id}`
  );
  return res.data;
};


