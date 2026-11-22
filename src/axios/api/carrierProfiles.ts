import type { AxiosResponse } from 'axios';
import apiClient from '../apiClient';

// Carrier profiles (Canadian NSC / US FMCSA SMS). Stored separately from CVSA inspections:
// uploading a profile never creates or changes CVSA inspection records.

export type ProfileCountry = 'canada' | 'usa';

export interface ProfileInspection {
  reportNumber: string | null;
  date: string;
  jurisdiction: string | null;
  location: string | null;
  level: number | string | null;
  status: 'pass' | 'fail' | 'warning' | 'out-of-service';
  vehicleUnitNo: string | null;
  driverName: string | null;
  violations: { code: string; description: string; severity: string }[];
}

export interface ProfileConviction {
  description: string;
  section: string;
  ticketNumber: string;
  jurisdiction: string;
  violationDate: string | null;
  convictionDate: string | null;
  plate: string;
  weight: number;
  accidentInvolved: boolean;
}

export interface MonthRow {
  month: string;
  label: string;
  inspections: number;
  pass: number;
  fail: number;
  oos: number;
  passRate: number | null;
  oosRate: number | null;
  tickets: number;
  passRateChange: number | null;
  trend: 'up' | 'down' | 'same' | null;
}

export interface PeriodTotals {
  inspections: number;
  pass: number;
  fail: number;
  oos: number;
  tickets: number;
  passRate: number | null;
  oosRate: number | null;
}

export interface ProfileDashboard {
  profile: {
    _id: string;
    country: ProfileCountry;
    format: 'nsc' | 'sms' | 'ai';
    readBy: 'parser' | 'ai';
    fileName: string | null;
    carrierName: string | null;
    nscNumber: string | null;
    usdotNumber: string | null;
    safetyRating: string | null;
    profileDate: string | null;
    period?: string | null;
    uploadedAt: string;
    thresholds: { inspection: number | null; accident: number | null; conviction: number | null; overall: number | null } | null;
    printedTotals: Record<string, number | null> | null;
    accidents: number | null;
    fleet: { current: number | null; average: number | null } | null;
    checks: string[];
  };
  summary: {
    inspections: number;
    pass: number;
    fail: number;
    oos: number;
    passRate: number | null;
    oosRate: number | null;
    tickets: number;
    ticketsLast12: number;
    violations: number;
  };
  last12: PeriodTotals;
  prior12: PeriodTotals;
  monthly: MonthRow[];
  categories: { name: string; count: number }[];
  comparison: null | {
    previousProfileId: string;
    previousProfileDate: string | null;
    previousUploadedAt: string;
    inspections: number | null;
    pass: number | null;
    fail: number | null;
    oos: number | null;
    tickets: number | null;
    passRate: number | null;
    oosRate: number | null;
    overallThreshold: number | null;
    safetyRatingBefore: string | null;
    safetyRatingNow: string | null;
  };
  convictions: ProfileConviction[];
  inspections: ProfileInspection[];
}

export interface ProfileListItem {
  _id: string;
  country: ProfileCountry;
  format: string;
  readBy: string;
  fileName: string | null;
  carrierName: string | null;
  safetyRating: string | null;
  profileDate: string | null;
  uploadedAt: string;
  uploadedBy: string | null;
  inspections: number;
  tickets: number;
  checks: string[];
}

interface ApiResult<T> {
  success: boolean;
  message?: string;
  data: T;
}

const fail = <T,>(error: unknown, data: T): ApiResult<T> => {
  const e = error as { response?: { data?: ApiResult<T> } };
  return e.response?.data || { success: false, message: 'Network error. Please try again.', data };
};

export const uploadCarrierProfile = async (file: File): Promise<ApiResult<ProfileDashboard | null>> => {
  try {
    const formData = new FormData();
    formData.append('document', file);
    const res: AxiosResponse = await apiClient.post('admin/carrier-profiles/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 180000 // other layouts are read by AI, which can take a while
    });
    return res.data;
  } catch (error) {
    return fail(error, null);
  }
};

export const listCarrierProfiles = async (country?: ProfileCountry): Promise<ApiResult<ProfileListItem[]>> => {
  try {
    const res: AxiosResponse = await apiClient.get(`admin/carrier-profiles${country ? `?country=${country}` : ''}`);
    return res.data;
  } catch (error) {
    return fail(error, []);
  }
};

export const getCarrierProfileDashboard = async (country: ProfileCountry, profileId?: string): Promise<ApiResult<ProfileDashboard | null>> => {
  try {
    const q = new URLSearchParams({ country });
    if (profileId) q.append('profileId', profileId);
    const res: AxiosResponse = await apiClient.get(`admin/carrier-profiles/dashboard?${q.toString()}`);
    return res.data;
  } catch (error) {
    return fail(error, null);
  }
};

export const deleteCarrierProfile = async (id: string): Promise<ApiResult<null>> => {
  try {
    const res: AxiosResponse = await apiClient.delete(`admin/carrier-profiles/${id}`);
    return res.data;
  } catch (error) {
    return fail(error, null);
  }
};

// ─── CVSA inspection report reader ──────────────────────────────────────────
export interface CvsaReportData {
  country: 'canada' | 'usa' | null;
  date: string | null;
  timeOfInspection: string | null;
  location: string | null;
  jurisdiction: string | null;
  reportNumber: string | null;
  inspectionLevel: 'I' | 'II' | 'III' | 'IV' | 'V' | null;
  result: 'pass' | 'fail' | 'warning' | 'out-of-service' | null;
  inspectorName: string | null;
  driverName: string | null;
  driverLicenseNumber: string | null;
  vehiclePlate: string | null;
  vehicleUnitNumber: string | null;
  carrierUSDOTNumber: string | null;
  carrierMotorCarrierNumber: string | null;
  outOfServiceIssued: boolean;
  violations: { code: string; description: string; severity: 'minor' | 'major' | 'critical' }[];
  notes: string | null;
  matchedVehicleId: string | null;
  matchedDriverId: string | null;
}

/** Reads one CVSA inspection report (PDF or photo) to pre-fill the Add Inspection form. Saves nothing. */
export const extractCvsaReport = async (file: File): Promise<ApiResult<CvsaReportData | null>> => {
  try {
    const formData = new FormData();
    formData.append('document', file);
    const res: AxiosResponse = await apiClient.post('admin/cvsa-inspections/extract-report', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 150000
    });
    return res.data;
  } catch (error) {
    return fail(error, null);
  }
};
