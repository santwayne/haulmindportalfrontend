import type { AxiosResponse } from 'axios';
import apiClient from '../apiClient';

export interface AddressFields {
  streetAddress1: string;
  streetAddress2: string;
  city: string;
  provinceState: string;
  postalZip: string;
  country: string;
}

export interface FleetCustomer {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  contactPerson?: string;
  billing?: AddressFields;
  sameAsBilling?: boolean;
  shipping?: AddressFields;
  notes?: string;
  primaryPaymentMethod?: string;
  terms?: string;
  customerType?: string;
  businessNumber?: string;
  assignDefaultTaxCode?: boolean;
  openingBalanceAmount?: number | null;
  openingBalanceAsOf?: string | null;
  documents?: { name: string; size: number }[];
  company?: string;
  createdBy?: string;
  updatedBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateFleetCustomerPayload {
  name: string;
  email: string;
  phone?: string;
  contactPerson?: string;
  billing?: AddressFields;
  sameAsBilling?: boolean;
  shipping?: AddressFields;
  notes?: string;
  primaryPaymentMethod?: string;
  terms?: string;
  customerType?: string;
  businessNumber?: string;
  assignDefaultTaxCode?: boolean;
  openingBalanceAmount?: number | string | null;
  openingBalanceAsOf?: string | null;
  documents?: { name: string; size: number }[];
}

export interface UpdateFleetCustomerPayload extends CreateFleetCustomerPayload {}

export const getFleetCustomers = async (): Promise<{
  success: boolean;
  data: FleetCustomer[];
  count: number;
}> => {
  try {
    const res: AxiosResponse = await apiClient.get('hr/fleet-maintenance/customers');
    return res.data;
  } catch (error) {
    console.error('Error fetching fleet customers:', error);
    return (error as any)?.response?.data ?? { success: false, data: [], count: 0 };
  }
};

export const getFleetCustomerById = async (
  id: string
): Promise<{ success: boolean; data: FleetCustomer }> => {
  try {
    const res: AxiosResponse = await apiClient.get(`hr/fleet-maintenance/customers/${id}`);
    return res.data;
  } catch (error) {
    console.error('Error fetching fleet customer:', error);
    return (error as any)?.response?.data;
  }
};

export const createFleetCustomer = async (
  data: CreateFleetCustomerPayload
): Promise<{ success: boolean; message?: string; data?: FleetCustomer }> => {
  try {
    const res: AxiosResponse = await apiClient.post('hr/fleet-maintenance/customers', data);
    return res.data;
  } catch (error) {
    console.error('Error creating fleet customer:', error);
    return (error as any)?.response?.data ?? { success: false };
  }
};

export const updateFleetCustomer = async (
  id: string,
  data: UpdateFleetCustomerPayload
): Promise<{ success: boolean; message?: string; data?: FleetCustomer }> => {
  try {
    const res: AxiosResponse = await apiClient.put(`hr/fleet-maintenance/customers/${id}`, data);
    return res.data;
  } catch (error) {
    console.error('Error updating fleet customer:', error);
    return (error as any)?.response?.data ?? { success: false };
  }
};

export const deleteFleetCustomer = async (
  id: string
): Promise<{ success: boolean; message?: string }> => {
  try {
    const res: AxiosResponse = await apiClient.delete(`hr/fleet-maintenance/customers/${id}`);
    return res.data;
  } catch (error) {
    console.error('Error deleting fleet customer:', error);
    return (error as any)?.response?.data ?? { success: false };
  }
};
