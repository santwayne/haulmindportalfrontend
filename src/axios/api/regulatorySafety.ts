import apiClient from "../apiClient";

export interface RegulatorySafetyDto {
  _id: string;
  unitNo: string;
  unitType?: string;
  makeModel?: string;
  unitSource?: string;
  unitReference?: string;
  safetyExpiryDate: string;
  safetyDecalNumber: string;
  safetyPaperNumber?: string;
  shopName: string;
  invoiceNo?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RegulatorySafetyPayload {
  unitNo: string;
  unitType?: string;
  makeModel?: string;
  unitSource?: string;
  unitReference?: string;
  safetyExpiryDate: string;
  safetyDecalNumber: string;
  safetyPaperNumber?: string;
  shopName: string;
  invoiceNo?: string;
  notes?: string;
}

export interface RegulatorySafetyResponse {
  success: boolean;
  data: RegulatorySafetyDto[];
  message?: string;
  requiresCompanySetup?: boolean;
}

export const listRegulatorySafety = async (search?: string) => {
  const params = new URLSearchParams();
  if (search) params.set("search", search);
  const res = await apiClient.get<RegulatorySafetyResponse>(
    `/admin/fleet-maintenance/regulatory-safety${params.toString() ? `?${params.toString()}` : ""}`
  );
  return res.data;
};

export const createRegulatorySafety = async (payload: RegulatorySafetyPayload) => {
  const res = await apiClient.post<{ success: boolean; data: RegulatorySafetyDto; message?: string }>(
    `/admin/fleet-maintenance/regulatory-safety`,
    payload
  );
  return res.data;
};

export const updateRegulatorySafety = async (id: string, payload: RegulatorySafetyPayload) => {
  const res = await apiClient.put<{ success: boolean; data: RegulatorySafetyDto; message?: string }>(
    `/admin/fleet-maintenance/regulatory-safety/${id}`,
    payload
  );
  return res.data;
};

export const deleteRegulatorySafety = async (id: string) => {
  const res = await apiClient.delete<{ success: boolean; message?: string }>(
    `/admin/fleet-maintenance/regulatory-safety/${id}`
  );
  return res.data;
};

