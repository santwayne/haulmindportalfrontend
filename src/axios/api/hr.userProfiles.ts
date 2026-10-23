import apiClient from "../apiClient";

export type UserProfilesTimeRange = "1week" | "2weeks" | "1month";

export interface UserProfileDto {
  _id: string;
  name: string;
  email: string;
  role: string;
  phone?: string | null;
  joinDate?: string;
  status?: string;
  address?: string | null;
  city?: string | null;
  province?: string | null;
  postalCode?: string | null;
  country?: string | null;
  citizenshipStatus?: string | null;
  sinNumber?: string | null;
  dateOfBirth?: string | null;
  notes?: string | null;
  totalEarnings: number;
  baseSalary: number;
  bonus: number;
  deductions: number;
  invoices: number;
  milesDriven?: number;
  tripsCompleted?: number;
  daysWorked: number;
  totalHours: number;
  presentDays: number;
  absentDays: number;
  lateDays: number;
  leaveDays: number;
  cross_border_eligible?: boolean;
}

export interface UserProfilesResponse {
  success: boolean;
  message?: string;
  data: UserProfileDto[];
  requiresCompanySetup?: boolean;
  pagination?: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    pageSize: number;
    hasNextPage?: boolean;
    hasPrevPage?: boolean;
  };
  filters?: {
    timeRange?: UserProfilesTimeRange;
    startDate?: string;
    endDate?: string;
  };
}

export interface UserProfilesQuery {
  search?: string;
  role?: string;
  page?: number;
  limit?: number;
  timeRange?: UserProfilesTimeRange;
}

export const fetchUserProfiles = async (
  params: UserProfilesQuery = {}
): Promise<UserProfilesResponse> => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      query.set(key, String(value));
    }
  });

  const queryString = query.toString();
  const url = `/hr/user-profiles${queryString ? `?${queryString}` : ""}`;
  const res = await apiClient.get<UserProfilesResponse>(url);
  return res.data;
};


