import apiClient from '../apiClient';

// ==================== CHART OF ACCOUNTS ====================

export interface ChartOfAccount {
  _id?: string;
  id?: number;
  number: string;
  name: string;
  type: 'Asset' | 'Liability' | 'Equity' | 'Revenue' | 'Expense';
  balance: number;
}

export const getChartOfAccounts = async (params?: { search?: string }) => {
  const response = await apiClient.get('/hr/account-config/chart-of-accounts', { params });
  return response.data;
};

export const createChartOfAccount = async (data: Omit<ChartOfAccount, '_id' | 'id'>) => {
  const response = await apiClient.post('/hr/account-config/chart-of-accounts', data);
  return response.data;
};

export const updateChartOfAccount = async (id: string, data: Partial<ChartOfAccount>) => {
  const response = await apiClient.put(`/hr/account-config/chart-of-accounts/${id}`, data);
  return response.data;
};

export const deleteChartOfAccount = async (id: string) => {
  const response = await apiClient.delete(`/hr/account-config/chart-of-accounts/${id}`);
  return response.data;
};

// ==================== TAX CODES ====================

export interface AccountTaxCode {
  _id?: string;
  id?: number;
  code: string;
  description: string;
  rate: number;
  category: 'Sales Tax' | 'IFTA' | 'Payroll';
}

export const getTaxCodes = async (params?: { search?: string }) => {
  const response = await apiClient.get('/hr/account-config/tax-codes', { params });
  return response.data;
};

export const createTaxCode = async (data: Omit<AccountTaxCode, '_id' | 'id'>) => {
  const response = await apiClient.post('/hr/account-config/tax-codes', data);
  return response.data;
};

export const updateTaxCode = async (id: string, data: Partial<AccountTaxCode>) => {
  const response = await apiClient.put(`/hr/account-config/tax-codes/${id}`, data);
  return response.data;
};

export const deleteTaxCode = async (id: string) => {
  const response = await apiClient.delete(`/hr/account-config/tax-codes/${id}`);
  return response.data;
};

// ==================== PAYMENT METHODS ====================

export interface PaymentMethod {
  _id?: string;
  id?: number;
  method: string;
  description: string;
  preferred: 'Driver' | 'Vendor' | 'Carrier';
}

export const getPaymentMethods = async (params?: { search?: string }) => {
  const response = await apiClient.get('/hr/account-config/payment-methods', { params });
  return response.data;
};

export const createPaymentMethod = async (data: Omit<PaymentMethod, '_id' | 'id'>) => {
  const response = await apiClient.post('/hr/account-config/payment-methods', data);
  return response.data;
};

export const updatePaymentMethod = async (id: string, data: Partial<PaymentMethod>) => {
  const response = await apiClient.put(`/hr/account-config/payment-methods/${id}`, data);
  return response.data;
};

export const deletePaymentMethod = async (id: string) => {
  const response = await apiClient.delete(`/hr/account-config/payment-methods/${id}`);
  return response.data;
};

// ==================== SMS BILLING ====================

export interface SmsBilling {
  _id?: string;
  id?: number;
  timestamp: string;
  recipient: string;
  content: string;
  cost: number;
  account: string;
}

export const getSmsBilling = async (params?: { search?: string; startDate?: string; endDate?: string }) => {
  const response = await apiClient.get('/hr/account-config/sms-billing', { params });
  return response.data;
};

export const getSmsBillingStats = async () => {
  const response = await apiClient.get('/hr/account-config/sms-billing/stats');
  return response.data;
};

