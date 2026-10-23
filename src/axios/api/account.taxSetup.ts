import apiClient from '../apiClient';

// ==================== IFTA RATES ====================

export interface IftaRate {
  _id?: string;
  id?: number;
  jurisdiction: string;
  rate: string;
  effectiveDate: string;
}

export const getIftaRates = async (params?: { search?: string }) => {
  const response = await apiClient.get('/hr/tax-setup/ifta-rates', { params });
  return response.data;
};

export const createIftaRate = async (data: Omit<IftaRate, '_id' | 'id'>) => {
  const response = await apiClient.post('/hr/tax-setup/ifta-rates', data);
  return response.data;
};

export const updateIftaRate = async (id: string, data: Partial<IftaRate>) => {
  const response = await apiClient.put(`/hr/tax-setup/ifta-rates/${id}`, data);
  return response.data;
};

export const deleteIftaRate = async (id: string) => {
  const response = await apiClient.delete(`/hr/tax-setup/ifta-rates/${id}`);
  return response.data;
};

// ==================== SALES TAX ====================

export interface SalesTaxRule {
  _id?: string;
  id?: number;
  name: string;
  type: 'Origin' | 'Destination';
  qbSync: boolean;
}

export const getSalesTaxRules = async (params?: { search?: string }) => {
  const response = await apiClient.get('/hr/tax-setup/sales-tax', { params });
  return response.data;
};

export const createSalesTaxRule = async (data: Omit<SalesTaxRule, '_id' | 'id'>) => {
  const response = await apiClient.post('/hr/tax-setup/sales-tax', data);
  return response.data;
};

export const updateSalesTaxRule = async (id: string, data: Partial<SalesTaxRule>) => {
  const response = await apiClient.put(`/hr/tax-setup/sales-tax/${id}`, data);
  return response.data;
};

export const deleteSalesTaxRule = async (id: string) => {
  const response = await apiClient.delete(`/hr/tax-setup/sales-tax/${id}`);
  return response.data;
};

// ==================== PAYROLL TAX ====================

export interface PayrollTaxFormula {
  _id?: string;
  id?: number;
  bracket: string;
  rate: string;
  classification: 'Employee' | 'Owner-Operator';
}

export const getPayrollTaxFormulas = async (params?: { search?: string }) => {
  const response = await apiClient.get('/hr/tax-setup/payroll-tax', { params });
  return response.data;
};

export const createPayrollTaxFormula = async (data: Omit<PayrollTaxFormula, '_id' | 'id'>) => {
  const response = await apiClient.post('/hr/tax-setup/payroll-tax', data);
  return response.data;
};

export const updatePayrollTaxFormula = async (id: string, data: Partial<PayrollTaxFormula>) => {
  const response = await apiClient.put(`/hr/tax-setup/payroll-tax/${id}`, data);
  return response.data;
};

export const deletePayrollTaxFormula = async (id: string) => {
  const response = await apiClient.delete(`/hr/tax-setup/payroll-tax/${id}`);
  return response.data;
};

// ==================== VENDOR TAX ====================

export interface VendorTax {
  _id?: string;
  id?: number;
  taxName: string;
  rate: string;
  payableAccount: string;
  expenseAccount: string;
}

export const getVendorTaxes = async (params?: { search?: string }) => {
  const response = await apiClient.get('/hr/tax-setup/vendor-tax', { params });
  return response.data;
};

export const createVendorTax = async (data: Omit<VendorTax, '_id' | 'id'>) => {
  const response = await apiClient.post('/hr/tax-setup/vendor-tax', data);
  return response.data;
};

export const updateVendorTax = async (id: string, data: Partial<VendorTax>) => {
  const response = await apiClient.put(`/hr/tax-setup/vendor-tax/${id}`, data);
  return response.data;
};

export const deleteVendorTax = async (id: string) => {
  const response = await apiClient.delete(`/hr/tax-setup/vendor-tax/${id}`);
  return response.data;
};

