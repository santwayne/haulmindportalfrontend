import apiClient from "../apiClient";

export interface CompletedPart {
  partName?: string;
  partNumber?: string;
  quantity?: number;
  cost?: number;
}

export interface MechanicOrder {
  _id: string;
  serviceDate?: string;
  unitNumber?: string;
  makeModel?: string;
  vinLicensePlate?: string;
  description?: string;
  odometer?: number;
  status?: string;
  customer?: string;
  serviceProvider?: string;
  invoiceNumber?: string;
  amount?: number;
  repairDetails?: string;
  verificationStatus?: string;
  completionDate?: string;
  completedParts?: CompletedPart[];
  completionTotalAmount?: number;
  invoiceUploadUrl?: string;
  invoiceSignedUrl?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
}

export interface ListMechanicOrdersResponse {
  success: boolean;
  data: MechanicOrder[];
  count: number;
  totalCount?: number;
  allCount?: number;
  completedCount?: number;
  pendingCount?: number;
  page?: number;
  limit?: number;
  totalPages?: number;
  message?: string;
}

export const listMechanicOrders = async (params?: {
  search?: string;
  status?: string;
  page?: number;
  limit?: number;
  mechanicId?: string;
}): Promise<ListMechanicOrdersResponse> => {
  const res = await apiClient.get("admin/fleet-maintenance/mechanic/orders", {
    params,
  });
  return res.data;
};

export interface MechanicDashboardData {
  total: number;
  completed: number;
  pending: number;
  completionRate: number;
  myAssigned: number;
  myCompleted: number;
  myPending: number;
  totalRepairAmount: number;
  avgRepairCost: number;
  recentOrders: Array<{
    id: string;
    unit?: string;
    description?: string;
    status?: string;
    date?: string;
  }>;
}

export interface MechanicDashboardResponse {
  success: boolean;
  data?: MechanicDashboardData;
  message?: string;
}

export const getMechanicDashboard = async (params?: {
  month?: number;
  year?: number;
}): Promise<MechanicDashboardResponse> => {
  const res = await apiClient.get("admin/fleet-maintenance/mechanic/dashboard", {
    params,
  });
  return res.data;
};

export interface UpdateOrderStatusResponse {
  success: boolean;
  message?: string;
  data?: MechanicOrder;
}

export const updateOrderStatus = async (
  id: string,
  status: "in-progress" | "completed"
): Promise<UpdateOrderStatusResponse> => {
  const res = await apiClient.patch(
    `admin/fleet-maintenance/general-repairs/${id}/status`,
    { status }
  );
  return res.data;
};

export interface CompleteRepairPayload {
  repairDetails: string;
  totalAmount: number;
  parts?: Array<{
    partId?: string;
    partName?: string;
    partNumber?: string;
    quantity?: number;
    cost?: number;
  }>;
}

export interface CompleteRepairResponse {
  success: boolean;
  message?: string;
  data?: MechanicOrder;
}

export const completeRepair = async (
  id: string,
  payload: CompleteRepairPayload,
  invoiceFile: File
): Promise<CompleteRepairResponse> => {
  const formData = new FormData();
  formData.append("repairDetails", payload.repairDetails);
  formData.append("totalAmount", String(payload.totalAmount));
  if (payload.parts && payload.parts.length > 0) {
    formData.append("parts", JSON.stringify(payload.parts));
  }
  formData.append("invoice", invoiceFile);

  const res = await apiClient.post(
    `admin/fleet-maintenance/general-repairs/${id}/complete`,
    formData
  );
  return res.data;
};

