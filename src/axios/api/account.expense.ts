import { type AxiosResponse } from "axios";
import apiClient from "../apiClient";

interface Error {
    response?: {
        data?: {
            message: string;
        };
    };
}

// Create Expense (with file upload)
export const createExpense = async (data: FormData) => {
    try {
        const res: AxiosResponse = await apiClient.post(`hr/create-expense`, data, {
            headers: {
                "Content-Type": "multipart/form-data",
            },
        });
        console.log("==createExpense res", res);
        return res.data;
    } catch (error: any) {
        const err = error as Error;
        return err.response?.data;
    }
};

// List Expenses
export const listExpenses = async () => {
    try {
        const res: AxiosResponse = await apiClient.get(`hr/list-expense`);
        console.log("==listExpenses res", res);
        return res.data;
    } catch (error: any) {
        const err = error as Error;
        return err.response?.data;
    }
};

// Update Expense
export const updateExpense = async (id: string, data: FormData | Record<string, any>) => {
    try {
        const res: AxiosResponse = await apiClient.put(`hr/update-expense/${id}`, data, {
            headers: data instanceof FormData ? { "Content-Type": "multipart/form-data" } : {},
        });
        console.log("==updateExpense res", res);
        return res.data;
    } catch (error: any) {
        const err = error as Error;
        return err.response?.data;
    }
};

// Delete Expense
export const deleteExpense = async (id: string) => {
    try {
        const res: AxiosResponse = await apiClient.delete(`hr/delete-expense/${id}`);
        console.log("==deleteExpense res", res);
        return res.data;
    } catch (error: any) {
        const err = error as Error;
        return err.response?.data;
    }
};

// Get Expense Receipt Signed URL
export const getExpenseReceiptSignedUrl = async (expenseId: string, disposition: 'inline' | 'attachment' = 'inline') => {
    try {
        const res: AxiosResponse = await apiClient.get(`hr/expense/${expenseId}/receipt-signed-url`, {
            params: { disposition }
        });
        console.log("==getExpenseReceiptSignedUrl res", res);
        return res.data;
    } catch (error: any) {
        const err = error as Error;
        return err.response?.data;
    }
};

// Extract Expense Data from Receipt using OpenAI
export const extractReceiptData = async (file: File) => {
    try {
        const formData = new FormData();
        formData.append('receipt', file);
        
        const res: AxiosResponse = await apiClient.post(`hr/extract-receipt`, formData, {
            headers: {
                "Content-Type": "multipart/form-data",
            },
        });
        console.log("==extractReceiptData res", res);
        return res.data;
    } catch (error: any) {
        const err = error as Error;
        return err.response?.data;
    }
};

// Expense Categories API
export const listExpenseCategories = async () => {
    try {
        const res: AxiosResponse = await apiClient.get(`hr/expense-categories`);
        return res.data;
    } catch (error: any) {
        const err = error as Error;
        return err.response?.data;
    }
};

export const createExpenseCategory = async (data: { name: string; status?: string }) => {
    try {
        const res: AxiosResponse = await apiClient.post(`hr/expense-categories`, data);
        return res.data;
    } catch (error: any) {
        const err = error as Error;
        return err.response?.data;
    }
};

export const updateExpenseCategory = async (id: string, data: { name?: string; status?: string }) => {
    try {
        const res: AxiosResponse = await apiClient.put(`hr/expense-categories/${id}`, data);
        return res.data;
    } catch (error: any) {
        const err = error as Error;
        return err.response?.data;
    }
};

export const deleteExpenseCategory = async (id: string) => {
    try {
        const res: AxiosResponse = await apiClient.delete(`hr/expense-categories/${id}`);
        return res.data;
    } catch (error: any) {
        const err = error as Error;
        return err.response?.data;
    }
};

// Expense Types API
export const listExpenseTypes = async (categoryId?: string) => {
    try {
        const url = categoryId 
            ? `hr/expense-types?categoryId=${categoryId}`
            : `hr/expense-types`;
        const res: AxiosResponse = await apiClient.get(url);
        return res.data;
    } catch (error: any) {
        const err = error as Error;
        return err.response?.data;
    }
};

export const createExpenseType = async (data: { name: string; categoryId: string; status?: string }) => {
    try {
        const res: AxiosResponse = await apiClient.post(`hr/expense-types`, data);
        return res.data;
    } catch (error: any) {
        const err = error as Error;
        return err.response?.data;
    }
};

export const updateExpenseType = async (id: string, data: { name?: string; categoryId?: string; status?: string }) => {
    try {
        const res: AxiosResponse = await apiClient.put(`hr/expense-types/${id}`, data);
        return res.data;
    } catch (error: any) {
        const err = error as Error;
        return err.response?.data;
    }
};

export const deleteExpenseType = async (id: string) => {
    try {
        const res: AxiosResponse = await apiClient.delete(`hr/expense-types/${id}`);
        return res.data;
    } catch (error: any) {
        const err = error as Error;
        return err.response?.data;
    }
};