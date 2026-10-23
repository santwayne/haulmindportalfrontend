import apiClient from '../apiClient';
import type { AxiosResponse } from 'axios';

interface ApiError {
  response?: {
    data?: {
      message: string;
    };
  };
}

export interface Invoice {
  _id: string;
  clientName: string;
  clientEmail?: string;
  clientCompany?: string;
  loadId?: string;
  amount: string;
  currency: string;
  status: 'paid' | 'pending';
  invoiceDate: string | Date;
  dueDate: string | Date;
  paymentDate?: string | Date | null;
  invoiceUrl?: string;
  notes?: string;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface CreateInvoiceData {
  clientName: string;
  clientEmail?: string;
  clientCompany?: string;
  loadId?: string;
  amount: string;
  currency?: string;
  status?: 'paid' | 'pending';
  invoiceDate?: string | Date;
  dueDate: string | Date;
  paymentDate?: string | Date | null;
  notes?: string;
}

// Get all invoices
export const listInvoices = async () => {
  try {
    const res: AxiosResponse = await apiClient.get('hr/list-invoice');
    return res.data;
  } catch (error) {
    console.error('Error fetching invoices:', error);
    return (error as ApiError).response?.data;
  }
};

// Get invoice by ID
export const getInvoiceById = async (id: string) => {
  try {
    const res: AxiosResponse = await apiClient.get(`hr/list-invoice/${id}`);
    return res.data;
  } catch (error) {
    console.error('Error fetching invoice:', error);
    return (error as ApiError).response?.data;
  }
};

// Create new invoice
export const createInvoice = async (data: CreateInvoiceData) => {
  try {
    const res: AxiosResponse = await apiClient.post('hr/create-invoice', data);
    return res.data;
  } catch (error) {
    console.error('Error creating invoice:', error);
    return (error as ApiError).response?.data;
  }
};

// Update invoice
export const updateInvoice = async (id: string, data: Partial<CreateInvoiceData>) => {
  try {
    const res: AxiosResponse = await apiClient.put(`hr/update-invoice/${id}`, data);
    return res.data;
  } catch (error) {
    console.error('Error updating invoice:', error);
    return (error as ApiError).response?.data;
  }
};

// Delete invoice
export const deleteInvoice = async (id: string) => {
  try {
    const res: AxiosResponse = await apiClient.delete(`hr/delete-invoice/${id}`);
    return res.data;
  } catch (error) {
    console.error('Error deleting invoice:', error);
    return (error as ApiError).response?.data;
  }
};

