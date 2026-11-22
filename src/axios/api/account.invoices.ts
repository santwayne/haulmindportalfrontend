import { type AxiosResponse } from "axios";
import apiClient from "../apiClient";
import axios from "axios";

// Create a separate axios instance for public routes (no authentication needed)
const publicApiClient = axios.create({
  baseURL: import.meta.env.VITE_APP_BASE_URL?.replace('/api/v1', '') || 'http://localhost:3000'
});

interface Error {
    message?: string;
    response?: {
        data?: {
            message: string;
        };
    };
}


export const createInvoice = async (data: any) => {
    try {
        const res: AxiosResponse = await apiClient.post(`hr/create-invoice`, data);
        console.log("==createInvoice res", res);
        return res.data;
    } catch (error: any) {
        const err = error as Error;
        return err.response?.data;
    }
};

// List All Invoices
export const listInvoices = async () => {
    try {
        const res: AxiosResponse = await apiClient.get(`hr/list-invoice`);
        console.log("==listInvoices res", res);
        return res.data;
    } catch (error: any) {
        const err = error as Error;
        return err.response?.data;
    }
};

// Get Invoice by ID
export const getInvoiceById = async (id: string) => {
    try {
        const res: AxiosResponse = await apiClient.get(`hr/list-invoice/${id}`);
        console.log("==getInvoiceById res", res);
        return res.data;
    } catch (error: any) {
        const err = error as Error;
        return err.response?.data;
    }
};

// Update Invoice
export const updateInvoice = async (id: string, data: any) => {
    try {
        const res: AxiosResponse = await apiClient.put(`hr/update-invoice/${id}`, data);
        console.log("==updateInvoice res", res);
        return res.data;
    } catch (error: any) {
        const err = error as Error;
        return err.response?.data;
    }
};

// Delete Invoice
export const deleteInvoice = async (id: string) => {
    try {
        const res: AxiosResponse = await apiClient.delete(`hr/delete-invoice/${id}`);
        console.log("==deleteInvoice res", res);
        return res.data;
    } catch (error: any) {
        const err = error as Error;
        return err.response?.data;
    }
};

// Get trips for invoice creation (replaces listLoad)
export const listTrips = async () => {
    try {
        console.log('🚀 Making API call to: hr/invoice-trips');
        console.log('🔑 Token in localStorage:', localStorage.getItem('token'));
        
        const res: AxiosResponse = await apiClient.get(`hr/invoice-trips`);
        console.log('✅ API Response received:', res);
        console.log('✅ Response status:', res.status);
        console.log('✅ Response data:', res.data);
        return res.data;
    } catch (error) {
        console.error('❌ API Error:', error);
        console.error('❌ Error response:', (error as Error).response);
        console.error('❌ Error message:', (error as Error).message);
        
        return (error as Error).response?.data;
    }
}

// Legacy: Keep listLoad for backward compatibility (deprecated)
export const listLoad = async () =>{
    try {
        console.log('🚀 Making API call to: dispatcher/invoice-loads');
        console.log('🔑 Token in localStorage:', localStorage.getItem('token'));
        
        const res: AxiosResponse = await apiClient.get(`dispatcher/invoice-loads`);
        console.log('✅ API Response received:', res);
        console.log('✅ Response status:', res.status);
        console.log('✅ Response data:', res.data);
        return res.data;
    } catch (error) {
        console.error('❌ API Error:', error);
        console.error('❌ Error response:', (error as Error).response);
        console.error('❌ Error message:', (error as Error).message);
        
        return (error as Error).response?.data;
    }
}

// Create payment session for Stripe
export const createPaymentSession = async (invoiceId: string) => {
    try {
        const res: AxiosResponse = await apiClient.post(`hr/create-payment-session`, { invoiceId });
        console.log('Payment session created:', res);
        return res.data;
    } catch (error) {
        console.log(error);
        return (error as Error).response?.data;
    }
}

// Get public invoice (no authentication required)
export const getPublicInvoice = async (invoiceId: string) => {
    try {
        console.log('🔍 getPublicInvoice called with ID:', invoiceId);
        const url = `/api/public/invoice/${invoiceId}`;
        console.log('📡 Making request to:', url);
        console.log('📡 Full URL will be:', `${publicApiClient.defaults.baseURL}${url}`);
        
        const res: AxiosResponse = await publicApiClient.get(url);
        console.log('✅ Public invoice API response:', res);
        return res.data;
    } catch (error) {
        console.error('❌ Public invoice API error:', error);
        console.error('❌ Error response:', (error as Error).response?.data);
        return (error as Error).response?.data;
    }
}

// Test Stripe connection
export const testStripeConnection = async () => {
    try {
        const res: AxiosResponse = await apiClient.get(`hr/test-stripe`);
        console.log('Stripe connection test:', res);
        return res.data;
    } catch (error) {
        console.log(error);
        return (error as Error).response?.data;
    }
}
// Invoice + POD + border manifest in one PDF. The invoice PDF is drawn in the browser and the
// server appends the trip's documents (it can read them from S3; the browser can't).
export const downloadInvoicePacket = async (
    invoiceId: string,
    invoicePdf: Blob
): Promise<{ ok: true; blob: Blob; missing: string } | { ok: false; message: string }> => {
    try {
        const formData = new FormData();
        formData.append('invoicePdf', new File([invoicePdf], 'invoice.pdf', { type: 'application/pdf' }));
        const res: AxiosResponse<Blob> = await apiClient.post(`hr/invoice/${invoiceId}/packet`, formData, {
            responseType: 'blob',
            timeout: 120000,
        });
        const missing = decodeURIComponent(String(res.headers['x-packet-missing'] || ''));
        return { ok: true, blob: res.data, missing };
    } catch (error: unknown) {
        const data = (error as { response?: { data?: Blob } })?.response?.data;
        let message = 'Could not build the invoice packet';
        if (data instanceof Blob) {
            try { message = JSON.parse(await data.text())?.message || message; } catch { /* keep default */ }
        }
        return { ok: false, message };
    }
};

// Email the invoice with the POD and border manifest attached (one PDF)
export const emailInvoicePacket = async (
    invoiceId: string,
    invoicePdf: Blob,
    to?: string
): Promise<{ success: boolean; message: string; notes?: string[] }> => {
    try {
        const formData = new FormData();
        formData.append('invoicePdf', new File([invoicePdf], 'invoice.pdf', { type: 'application/pdf' }));
        if (to) formData.append('to', to);
        const res: AxiosResponse = await apiClient.post(`hr/invoice/${invoiceId}/email-packet`, formData, { timeout: 120000 });
        return res.data;
    } catch (error: unknown) {
        const data = (error as { response?: { data?: { message?: string } } })?.response?.data;
        return { success: false, message: data?.message || 'Email could not be sent' };
    }
};

// Default notes printed on every invoice without its own notes (e.g. factoring Notice of Assignment)
export const getInvoiceSettings = async (): Promise<{ invoiceNotes: string }> => {
    try {
        const res: AxiosResponse = await apiClient.get('hr/invoice-settings');
        return { invoiceNotes: res.data?.data?.invoiceNotes || '' };
    } catch {
        return { invoiceNotes: '' };
    }
};

export const updateInvoiceSettings = async (invoiceNotes: string): Promise<{ success: boolean; message: string }> => {
    try {
        const res: AxiosResponse = await apiClient.put('hr/invoice-settings', { invoiceNotes });
        return res.data;
    } catch (error: unknown) {
        const data = (error as { response?: { data?: { message?: string } } })?.response?.data;
        return { success: false, message: data?.message || 'Could not save' };
    }
};
