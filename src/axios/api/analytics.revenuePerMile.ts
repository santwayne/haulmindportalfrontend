import apiClient from '../apiClient';
import type { AxiosResponse } from 'axios';
// 
export interface VehicleRevenueData {
  vehicleId: string;
  unitNumber: string;
  plateNumber: string;
  make: string;
  model: string;
  totalMiles: number;
  totalRevenue: number;
  revenuePerMile: number;
  orderCount: number;
}

export interface MonthlyTrendData {
  month: string;
  year: number;
  revenuePerMile: number;
  totalRevenue: number;
  totalMiles: number;
  orderCount: number;
}

export interface RevenuePerMileSummary {
  totalRevenue: number;
  totalMiles: number;
  averageRevenuePerMile: number;
  totalVehicles: number;
}

export interface RevenuePerMileResponse {
  success: boolean;
  message: string;
  data: {
    vehicleRevenue: VehicleRevenueData[];
    summary: RevenuePerMileSummary;
    monthlyTrend: MonthlyTrendData[];
  };
}

export const getRevenuePerMile = async (
  startDate?: string,
  endDate?: string,
  vehicleId?: string
): Promise<RevenuePerMileResponse> => {
  try {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    if (vehicleId) params.append('vehicleId', vehicleId);

    const res: AxiosResponse = await apiClient.get(
      `dispatcher/analytics/revenue-per-mile?${params.toString()}`
    );
    return res.data;
  } catch (error) {
    console.error('Error fetching revenue per mile:', error);
    throw error;
  }
};

export const getVehicleRevenuePerMile = async (
  vehicleId: string,
  startDate?: string,
  endDate?: string
): Promise<{
  success: boolean;
  message: string;
  data: VehicleRevenueData;
}> => {
  try {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);

    const res: AxiosResponse = await apiClient.get(
      `dispatcher/analytics/revenue-per-mile/${vehicleId}?${params.toString()}`
    );
    return res.data;
  } catch (error) {
    console.error('Error fetching vehicle revenue per mile:', error);
    throw error;
  }
};

