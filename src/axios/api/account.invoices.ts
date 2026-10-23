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