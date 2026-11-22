import apiClient from '../apiClient';
import type { AxiosResponse } from 'axios';

export const getHRAuditTrail = async () => {
  try {
    const res: AxiosResponse = await apiClient.get('hr/audit-trail');
    return res.data;
  } catch (error: any) {
    console.error('❌ getHRAuditTrail API error:', error);
    return error?.response?.data || { success: false, message: 'Failed to fetch HR audit trail', data: [] };
  }
};
