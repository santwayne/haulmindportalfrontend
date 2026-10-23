import { type AxiosResponse } from "axios";
import apiClient from "../apiClient";

interface Error {
    response?: {
        data?: {
            message: string;
        };
    };
}

// Spare Parts API
export const getAllSpareParts = async (): Promise<any> => {
    try {
        const res: AxiosResponse = await apiClient.get(`admin/spareparts`);
        return res.data;
    } catch (error: unknown) {
        const err = error as Error;
        return err.response?.data;
    }
};

export const getSparePartById = async (id: string): Promise<any> => {
    try {
        const res: AxiosResponse = await apiClient.get(`admin/spareparts/${id}`);
        return res.data;
    } catch (error: unknown) {
        const err = error as Error;
        return err.response?.data;
    }
};

export const createSparePart = async (data: any): Promise<any> => {
    try {
        const res: AxiosResponse = await apiClient.post(`admin/spareparts`, data);
        return res.data;
    } catch (error: unknown) {
        const err = error as Error;
        return err.response?.data;
    }
};

export const updateSparePart = async (id: string, data: any): Promise<any> => {
    try {
        const res: AxiosResponse = await apiClient.put(`admin/spareparts/${id}`, data);
        return res.data;
    } catch (error: unknown) {
        const err = error as Error;
        return err.response?.data;
    }
};

export const deleteSparePart = async (id: string): Promise<any> => {
    try {
        const res: AxiosResponse = await apiClient.delete(`admin/spareparts/${id}`);
        return res.data;
    } catch (error: unknown) {
        const err = error as Error;
        return err.response?.data;
    }
};

export const useSparePart = async (id: string, data?: any): Promise<any> => {
    try {
        const res: AxiosResponse = await apiClient.put(`admin/spareparts/${id}/use`, data);
        return res.data;
    } catch (error: unknown) {
        const err = error as Error;
        return err.response?.data;
    }
};

// Suppliers API
export const getSuppliers = async (): Promise<any> => {
    try {
        const res: AxiosResponse = await apiClient.get(`admin/suppliers`);
        return res.data;
    } catch (error: unknown) {
        const err = error as Error;
        return err.response?.data;
    }
};

export const getSupplierById = async (id: string): Promise<any> => {
    try {
        const res: AxiosResponse = await apiClient.get(`admin/suppliers/${id}`);
        return res.data;
    } catch (error: unknown) {
        const err = error as Error;
        return err.response?.data;
    }
};

export const createSupplier = async (data: any): Promise<any> => {
    try {
        const res: AxiosResponse = await apiClient.post(`admin/suppliers`, data);
        return res.data;
    } catch (error: unknown) {
        const err = error as Error;
        return err.response?.data;
    }
};

export const updateSupplier = async (id: string, data: any): Promise<any> => {
    try {
        const res: AxiosResponse = await apiClient.put(`admin/suppliers/${id}`, data);
        return res.data;
    } catch (error: unknown) {
        const err = error as Error;
        return err.response?.data;
    }
};

export const deleteSupplier = async (id: string): Promise<any> => {
    try {
        const res: AxiosResponse = await apiClient.delete(`admin/suppliers/${id}`);
        return res.data;
    } catch (error: unknown) {
        const err = error as Error;
        return err.response?.data;
    }
};
