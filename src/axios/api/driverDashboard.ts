import apiClient from '../apiClient';
import type { AxiosResponse } from 'axios';

// Driver Dashboard Statistics
export const getDriverStats = async () => {
  try {
    const res: AxiosResponse = await apiClient.get('admin/driver/stats');
    return res.data;
  } catch (error) {
    console.log(error);
    return (error as any).response?.data;
  }
};

// Recent Driver Activities
export const getRecentDriverActivities = async (limit: number = 10) => {
  try {
    const res: AxiosResponse = await apiClient.get(`admin/activity-log/recent?limit=${limit}`);
    return res.data;
  } catch (error) {
    console.log(error);
    return (error as any).response?.data;
  }
};

// Driver Activities (using existing endpoint)
export const getDriverActivities = async () => {
  try {
    const res: AxiosResponse = await apiClient.get('admin/driver-activity');
    return res.data;
  } catch (error) {
    console.log(error);
    return (error as any).response?.data;
  }
};

// Driver Activity Logs
export const getDriverActivityLogs = async (page: number = 1, limit: number = 10) => {
  try {
    const res: AxiosResponse = await apiClient.get(`admin/activity-log?page=${page}&limit=${limit}`);
    return res.data;
  } catch (error) {
    console.log(error);
    return (error as any).response?.data;
  }
};

// Load Statistics
export const getLoadStats = async () => {
  try {
    const res: AxiosResponse = await apiClient.get('admin/load/stats');
    return res.data;
  } catch (error) {
    console.log(error);
    return (error as any).response?.data;
  }
};

// Safety Score Statistics
export const getSafetyStats = async () => {
  try {
    const res: AxiosResponse = await apiClient.get('admin/driver/safety-stats');
    return res.data;
  } catch (error) {
    console.log(error);
    return (error as any).response?.data;
  }
};

// HR Dashboard Statistics
export const getHRDashboard = async () => {
  try {
    const res: AxiosResponse = await apiClient.get('hr/dashboard');
    return res.data;
  } catch (error) {
    console.log(error);
    return (error as any).response?.data;
  }
};