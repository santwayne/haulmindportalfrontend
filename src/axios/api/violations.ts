import apiClient from '../apiClient';

// Interfaces
export interface DriverViolation {
  _id: string;
  violationId: string;
  driver: {
    _id: string;
    name: string;
    email: string;
    internalId: string;
  } | null;
  vehicle: {
    _id: string;
    unitNo: string;
    licensePlate: string;
    makeModel: string;
    internalId: string;
  } | null;
  company: string;
  violationType: string;
  severity: string;
  date: string;
  location?: {
    address?: string;
    latitude?: number;
    longitude?: number;
    city?: string;
    state?: string;
    country?: string;
  };
  violationDetails?: {
    speedLimit?: number;
    actualSpeed?: number;
    speedOver?: number;
    duration?: number;
    gForce?: number;
    distance?: number;
  };
  source: string;
  geotabData?: {
    deviceId?: string;
    diagnosticId?: string;
    tripId?: string;
    eventId?: string;
  };
  ticketInfo?: {
    ticketNumber?: string;
    officerName?: string;
    officerBadge?: string;
    courtDate?: string;
    fineAmount?: number;
  };
  status: string;
  description?: string;
  notes?: string;
  driverAcknowledged: boolean;
  driverAcknowledgedAt?: string;
  driverComment?: string;
  reviewedBy?: {
    _id: string;
    name: string;
    email: string;
  };
  reviewedAt?: string;
  reviewNotes?: string;
  attachments?: Array<{
    fileUrl: string;
    fileName: string;
    fileType: string;
    fileSize: number;
    uploadedAt: string;
  }>;
  points: number;
  impactOnScore: number;
  resolution?: string;
  resolvedAt?: string;
  resolvedBy?: {
    _id: string;
    name: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface ViolationStats {
  total: number;
  byType: Record<string, number>;
  bySeverity: Record<string, number>;
  byStatus: Record<string, number>;
  bySource: Record<string, number>;
  topViolators: Array<{
    driver: {
      _id: string;
      name: string;
      email: string;
      internalId: string;
    };
    count: number;
    totalPoints: number;
  }>;
  monthlyTrend: Array<{
    year: number;
    month: number;
    count: number;
  }>;
  dateRange: {
    from: string;
    to: string;
  };
}

export interface DriverViolationSummary {
  driverId: string;
  totalViolations: number;
  totalPoints: number;
  byType: Record<string, number>;
  bySeverity: Record<string, number>;
  dateRange: {
    from: string;
    to: string;
    months: number;
  };
}

/**
 * Get all driver violations with filters
 */
export const getDriverViolations = async (params?: {
  driver?: string;
  vehicle?: string;
  violationType?: string;
  severity?: string;
  status?: string;
  source?: string;
  fromDate?: string;
  toDate?: string;
  search?: string;
  page?: number;
  limit?: number;
}) => {
  const queryParams = new URLSearchParams();
  
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        queryParams.set(key, String(value));
      }
    });
  }

  const res = await apiClient.get(`/violations?${queryParams.toString()}`);
  return res.data;
};

/**
 * Get violation statistics
 */
export const getViolationStats = async (params?: {
  fromDate?: string;
  toDate?: string;
  groupBy?: string;
}) => {
  const queryParams = new URLSearchParams();
  
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        queryParams.set(key, String(value));
      }
    });
  }

  const res = await apiClient.get(`/violations/stats?${queryParams.toString()}`);
  return res.data;
};

/**
 * Get driver's violation summary
 */
export const getDriverViolationSummary = async (driverId: string, months: number = 12) => {
  const res = await apiClient.get(`/violations/driver/${driverId}?months=${months}`);
  return res.data;
};

/**
 * Get violation by ID
 */
export const getViolationById = async (id: string) => {
  const res = await apiClient.get(`/violations/${id}`);
  return res.data;
};

/**
 * Create violation (manual entry)
 */
export const createViolation = async (violationData: Partial<DriverViolation>) => {
  const res = await apiClient.post('/violations', violationData);
  return res.data;
};

/**
 * Update violation
 */
export const updateViolation = async (id: string, violationData: Partial<DriverViolation>) => {
  const res = await apiClient.put(`/violations/${id}`, violationData);
  return res.data;
};

/**
 * Delete violation
 */
export const deleteViolation = async (id: string) => {
  const res = await apiClient.delete(`/violations/${id}`);
  return res.data;
};

/**
 * Sync violations from Geotab
 */
export const syncGeotabViolations = async (daysBack: number = 7) => {
  const res = await apiClient.post('/violations/sync-geotab', { daysBack });
  return res.data;
};

/**
 * Get violations for compliance monthly report (past 2 years)
 */
export const getViolationsForMonthlyReport = async () => {
  const toDate = new Date();
  const fromDate = new Date();
  fromDate.setFullYear(fromDate.getFullYear() - 2);

  const res = await apiClient.get(`/violations?fromDate=${fromDate.toISOString()}&toDate=${toDate.toISOString()}&limit=1000`);
  return res.data;
};

