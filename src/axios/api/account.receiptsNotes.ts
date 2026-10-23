import { type AxiosResponse } from "axios";
import apiClient from "../apiClient";

interface Error {
    response?: {
        data?: {
            message: string;
        };
    };
}

// ========== Receipts API ==========

// Create Receipt (with file upload)
export const createReceipt = async (data: FormData) => {
    try {
        const res: AxiosResponse = await apiClient.post(`hr/create-receipt`, data, {
            headers: {
                "Content-Type": "multipart/form-data",
            },
        });
        console.log("==createReceipt res", res);
        return res.data;
    } catch (error: any) {
        const err = error as Error;
        return err.response?.data;
    }
};

// List Receipts
export const listReceipts = async (params?: { search?: string; expenseType?: string }) => {
    try {
        const res: AxiosResponse = await apiClient.get(`hr/list-receipt`, { params });
        console.log("==listReceipts res", res);
        return res.data;
    } catch (error: any) {
        const err = error as Error;
        return err.response?.data;
    }
};

// Get Receipt Stats
export const getReceiptStats = async () => {
    try {
        const res: AxiosResponse = await apiClient.get(`hr/receipt/stats`);
        console.log("==getReceiptStats res", res);
        return res.data;
    } catch (error: any) {
        const err = error as Error;
        return err.response?.data;
    }
};

// Update Receipt
export const updateReceipt = async (id: string, data: FormData | Record<string, any>) => {
    try {
        const res: AxiosResponse = await apiClient.put(`hr/update-receipt/${id}`, data, {
            headers: data instanceof FormData ? { "Content-Type": "multipart/form-data" } : {},
        });
        console.log("==updateReceipt res", res);
        return res.data;
    } catch (error: any) {
        const err = error as Error;
        return err.response?.data;
    }
};

// Delete Receipt
export const deleteReceipt = async (id: string) => {
    try {
        const res: AxiosResponse = await apiClient.delete(`hr/delete-receipt/${id}`);
        console.log("==deleteReceipt res", res);
        return res.data;
    } catch (error: any) {
        const err = error as Error;
        return err.response?.data;
    }
};

// Get Receipt Signed URL
export const getReceiptSignedUrl = async (receiptId: string, disposition: 'inline' | 'attachment' = 'inline') => {
    try {
        const res: AxiosResponse = await apiClient.get(`hr/receipt/${receiptId}/signed-url`, {
            params: { disposition }
        });
        console.log("==getReceiptSignedUrl res", res);
        return res.data;
    } catch (error: any) {
        const err = error as Error;
        return err.response?.data;
    }
};

// ========== Financial Notes API ==========

// Create Financial Note
export const createFinancialNote = async (data: {
    noteTitle: string;
    noteContent: string;
    linkedTransactionType?: string;
    linkedTransactionId?: string;
    linkedTransaction?: string;
}) => {
    try {
        const res: AxiosResponse = await apiClient.post(`hr/create-financial-note`, data);
        console.log("==createFinancialNote res", res);
        return res.data;
    } catch (error: any) {
        const err = error as Error;
        return err.response?.data;
    }
};

// List Financial Notes
export const listFinancialNotes = async (params?: { search?: string }) => {
    try {
        const res: AxiosResponse = await apiClient.get(`hr/list-financial-note`, { params });
        console.log("==listFinancialNotes res", res);
        return res.data;
    } catch (error: any) {
        const err = error as Error;
        return err.response?.data;
    }
};

// Get Financial Note Stats
export const getFinancialNoteStats = async () => {
    try {
        const res: AxiosResponse = await apiClient.get(`hr/financial-note/stats`);
        console.log("==getFinancialNoteStats res", res);
        return res.data;
    } catch (error: any) {
        const err = error as Error;
        return err.response?.data;
    }
};

// Update Financial Note
export const updateFinancialNote = async (id: string, data: {
    noteTitle?: string;
    noteContent?: string;
    linkedTransactionType?: string;
    linkedTransactionId?: string;
    linkedTransaction?: string;
}) => {
    try {
        const res: AxiosResponse = await apiClient.put(`hr/update-financial-note/${id}`, data);
        console.log("==updateFinancialNote res", res);
        return res.data;
    } catch (error: any) {
        const err = error as Error;
        return err.response?.data;
    }
};

// Delete Financial Note
export const deleteFinancialNote = async (id: string) => {
    try {
        const res: AxiosResponse = await apiClient.delete(`hr/delete-financial-note/${id}`);
        console.log("==deleteFinancialNote res", res);
        return res.data;
    } catch (error: any) {
        const err = error as Error;
        return err.response?.data;
    }
};

