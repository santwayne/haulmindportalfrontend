import apiClient from "../apiClient";

export interface GeneralRepairDto {
  _id: string;
  serviceDate: string;
  unitNumber: string;
  makeModel?: string;
  vinLicensePlate?: string;
  description: string;
  odometer?: number;
  parts?: string | Array<{ partId?: string; partName: string; partNumber: string; quantity: number }>;
  notes?: string;
  serviceProvider: string;
  customer?: string;
  customerId?: string;
  taxes?: { name: string; percentage: number }[];
  invoiceNumber?: string;
  amount?: number;
  duePayment?: string;
  unitSource?: string;
  unitReference?: string;
  status?: 'Created' | 'Assigned' | 'Shared' | 'in-progress' | 'completed';
  shared?: boolean;
  mechanicType?: 'internal' | 'external';
  externalMechanicCompany?: string;
  externalMechanicPhone?: string;
  externalMechanicEmail?: string;
  verificationStatus?: 'not-verified' | 'verified';
  verifiedBy?: string;
  verifiedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface GeneralRepairPayload {
  serviceDate: string;
  unitNumber: string;
  makeModel?: string;
  vinLicensePlate?: string;
  description: string;
  odometer?: number | string;
  parts?: string | Array<{ partId?: string; partName: string; partNumber: string; quantity: number }>;
  notes?: string;
  serviceProvider: string;
  customer?: string;
  customerId?: string;
  taxes?: { name: string; percentage: number }[];
  invoiceNumber?: string;
  amount?: number;
  duePayment?: string;
  unitSource?: string;
  unitReference?: string;
  mechanicType?: 'internal' | 'external';
  externalMechanicCompany?: string;
  externalMechanicPhone?: string;
  externalMechanicEmail?: string;
}

export interface GeneralRepairResponse {
  success: boolean;
  data: GeneralRepairDto[];
  message?: string;
  requiresCompanySetup?: boolean;
}

export const listGeneralRepairs = async (search?: string) => {
  const params = new URLSearchParams();
  if (search) params.set("search", search);
  const res = await apiClient.get<GeneralRepairResponse>(
    `/admin/fleet-maintenance/general-repairs${params.toString() ? `?${params.toString()}` : ""}`
  );
  return res.data;
};

export const createGeneralRepair = async (payload: GeneralRepairPayload) => {
  const res = await apiClient.post<{ success: boolean; data: GeneralRepairDto; message?: string }>(
    `/admin/fleet-maintenance/general-repairs`,
    payload
  );
  return res.data;
};

export const updateGeneralRepair = async (id: string, payload: GeneralRepairPayload) => {
  const res = await apiClient.put<{ success: boolean; data: GeneralRepairDto; message?: string }>(
    `/admin/fleet-maintenance/general-repairs/${id}`,
    payload
  );
  return res.data;
};

export const deleteGeneralRepair = async (id: string) => {
  const res = await apiClient.delete<{ success: boolean; message?: string }>(
    `/admin/fleet-maintenance/general-repairs/${id}`
  );
  return res.data;
};

export const sendMaintenanceOrderEmail = async (id: string) => {
  const res = await apiClient.post<{ success: boolean; message?: string }>(
    `/admin/fleet-maintenance/general-repairs/${id}/send-email`
  );
  return res.data;
};

export const verifyMaintenanceOrder = async (id: string) => {
  const res = await apiClient.post<{ success: boolean; data: GeneralRepairDto; message?: string }>(
    `/admin/fleet-maintenance/general-repairs/${id}/verify`
  );
  return res.data;
};

