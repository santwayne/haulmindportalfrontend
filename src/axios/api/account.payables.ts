/* eslint-disable @typescript-eslint/no-explicit-any -- API payloads (paystubs, settlements, bills) are untyped JSON */
import { type AxiosResponse } from "axios";
import apiClient from "../apiClient";

// Accounts Payable (bills) + carriers we sell loads to

const fail = (error: any) => error?.response?.data || { success: false, message: error?.message || 'Request failed' };

export interface BillPayment {
    _id: string;
    date: string;
    amount: number;
    method: string;
    reference?: string;
    notes?: string;
}

export interface Bill {
    _id: string;
    billNumber: string;
    vendor?: string | null;
    vendorName: string;
    vendorInvoiceNumber?: string;
    category: string;
    source: 'manual' | 'brokered_load';
    order?: string | null;
    orderNumber?: string;
    description?: string;
    billDate: string;
    dueDate?: string;
    amount: number;
    taxAmount: number;
    currency: string;
    paidAmount: number;
    balance: number;
    status: 'unpaid' | 'partial' | 'paid' | 'void';
    payments: BillPayment[];
    attachmentUrl?: string;
    attachmentName?: string;
    notes?: string;
    createdAt: string;
}

export const BILL_CATEGORIES = [
    'Carrier', 'Fuel', 'Repairs & Maintenance', 'Parts', 'Insurance', 'Tolls & Permits',
    'Rent', 'Utilities', 'Office', 'Professional Fees', 'Other',
];

export const listBills = async (params?: Record<string, string>) => {
    try {
        const res: AxiosResponse = await apiClient.get(`hr/bills`, { params });
        return res.data;
    } catch (error: any) { return fail(error); }
};

export const getBillStats = async () => {
    try {
        const res: AxiosResponse = await apiClient.get(`hr/bills/stats`);
        return res.data;
    } catch (error: any) { return fail(error); }
};

export const createBill = async (data: FormData) => {
    try {
        const res: AxiosResponse = await apiClient.post(`hr/bills`, data, { headers: { 'Content-Type': 'multipart/form-data' } });
        return res.data;
    } catch (error: any) { return fail(error); }
};

export const updateBill = async (id: string, data: FormData) => {
    try {
        const res: AxiosResponse = await apiClient.put(`hr/bills/${id}`, data, { headers: { 'Content-Type': 'multipart/form-data' } });
        return res.data;
    } catch (error: any) { return fail(error); }
};

export const deleteBill = async (id: string) => {
    try {
        const res: AxiosResponse = await apiClient.delete(`hr/bills/${id}`);
        return res.data;
    } catch (error: any) { return fail(error); }
};

export const recordBillPayment = async (id: string, data: { amount?: number; date?: string; method?: string; reference?: string; notes?: string }) => {
    try {
        const res: AxiosResponse = await apiClient.post(`hr/bills/${id}/payments`, data);
        return res.data;
    } catch (error: any) { return fail(error); }
};

export const deleteBillPayment = async (id: string, paymentId: string) => {
    try {
        const res: AxiosResponse = await apiClient.delete(`hr/bills/${id}/payments/${paymentId}`);
        return res.data;
    } catch (error: any) { return fail(error); }
};

export const getBillAttachmentUrl = async (id: string) => {
    try {
        const res: AxiosResponse = await apiClient.get(`hr/bills/${id}/attachment-url`);
        return res.data;
    } catch (error: any) { return fail(error); }
};

export const listCarriers = async (search?: string) => {
    try {
        const res: AxiosResponse = await apiClient.get(`hr/carriers`, { params: search ? { search } : {} });
        return res.data;
    } catch (error: any) { return fail(error); }
};

export const createCarrier = async (data: { name: string; phone?: string; email?: string; address?: string }) => {
    try {
        const res: AxiosResponse = await apiClient.post(`hr/carriers`, data);
        return res.data;
    } catch (error: any) { return fail(error); }
};
