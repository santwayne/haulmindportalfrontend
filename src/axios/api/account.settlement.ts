import { type AxiosResponse } from "axios";
import apiClient from "../apiClient";

interface Error {
    response?: {
        data?: {
            message: string;
        };
    };
}

// ==================== SETTLEMENTS ====================

export const createSettlement = async (data: any) => {
    try {
        const res: AxiosResponse = await apiClient.post(`hr/settlement`, data);
        return res.data;
    } catch (error: any) {
        const err = error as Error;
        return err.response?.data;
    }
};

export const getSettlements = async (params?: {
    search?: string;
    status?: string;
    driver?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
}) => {
    try {
        let url = `hr/settlement`;
        const queryParams = new URLSearchParams();
        
        if (params?.search) queryParams.append('search', params.search);
        if (params?.status) queryParams.append('status', params.status);
        if (params?.driver) queryParams.append('driver', params.driver);
        if (params?.startDate) queryParams.append('startDate', params.startDate);
        if (params?.endDate) queryParams.append('endDate', params.endDate);
        if (params?.page) queryParams.append('page', params.page.toString());
        if (params?.limit) queryParams.append('limit', params.limit.toString());
        
        if (queryParams.toString()) {
            url += `?${queryParams.toString()}`;
        }
        
        const res: AxiosResponse = await apiClient.get(url);
        return res.data;
    } catch (error: any) {
        const err = error as Error;
        return err.response?.data;
    }
};

export const getSettlementById = async (id: string) => {
    try {
        const res: AxiosResponse = await apiClient.get(`hr/settlement/${id}`);
        return res.data;
    } catch (error: any) {
        const err = error as Error;
        return err.response?.data;
    }
};

export const updateSettlement = async (id: string, data: any) => {
    try {
        const res: AxiosResponse = await apiClient.put(`hr/settlement/${id}`, data);
        return res.data;
    } catch (error: any) {
        const err = error as Error;
        return err.response?.data;
    }
};

export const deleteSettlement = async (id: string) => {
    try {
        const res: AxiosResponse = await apiClient.delete(`hr/settlement/${id}`);
        return res.data;
    } catch (error: any) {
        const err = error as Error;
        return err.response?.data;
    }
};

export const getSettlementStats = async () => {
    try {
        const res: AxiosResponse = await apiClient.get(`hr/settlement/stats`);
        return res.data;
    } catch (error: any) {
        const err = error as Error;
        return err.response?.data;
    }
};

// ==================== DEDUCTIONS & ADDITIONS ====================

export const createDeductionAddition = async (data: any) => {
    try {
        const res: AxiosResponse = await apiClient.post(`hr/deduction-addition`, data);
        return res.data;
    } catch (error: any) {
        const err = error as Error;
        return err.response?.data;
    }
};

export const getDeductionAdditions = async (params?: {
    search?: string;
    type?: string;
    assignedTo?: string;
    isActive?: boolean;
    page?: number;
    limit?: number;
}) => {
    try {
        let url = `hr/deduction-addition`;
        const queryParams = new URLSearchParams();
        
        if (params?.search) queryParams.append('search', params.search);
        if (params?.type) queryParams.append('type', params.type);
        if (params?.assignedTo) queryParams.append('assignedTo', params.assignedTo);
        if (params?.isActive !== undefined) queryParams.append('isActive', params.isActive.toString());
        if (params?.page) queryParams.append('page', params.page.toString());
        if (params?.limit) queryParams.append('limit', params.limit.toString());
        
        if (queryParams.toString()) {
            url += `?${queryParams.toString()}`;
        }
        
        const res: AxiosResponse = await apiClient.get(url);
        return res.data;
    } catch (error: any) {
        const err = error as Error;
        return err.response?.data;
    }
};

export const getDeductionAdditionById = async (id: string) => {
    try {
        const res: AxiosResponse = await apiClient.get(`hr/deduction-addition/${id}`);
        return res.data;
    } catch (error: any) {
        const err = error as Error;
        return err.response?.data;
    }
};

export const updateDeductionAddition = async (id: string, data: any) => {
    try {
        const res: AxiosResponse = await apiClient.put(`hr/deduction-addition/${id}`, data);
        return res.data;
    } catch (error: any) {
        const err = error as Error;
        return err.response?.data;
    }
};

export const deleteDeductionAddition = async (id: string) => {
    try {
        const res: AxiosResponse = await apiClient.delete(`hr/deduction-addition/${id}`);
        return res.data;
    } catch (error: any) {
        const err = error as Error;
        return err.response?.data;
    }
};

// ==================== MILES TRACKING ====================

export const createMilesTracking = async (data: any) => {
    try {
        const res: AxiosResponse = await apiClient.post(`hr/miles-tracking`, data);
        return res.data;
    } catch (error: any) {
        const err = error as Error;
        return err.response?.data;
    }
};

export const getMilesTracking = async (params?: {
    search?: string;
    driver?: string;
    vehicle?: string;
    state?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
}) => {
    try {
        let url = `hr/miles-tracking`;
        const queryParams = new URLSearchParams();
        
        if (params?.search) queryParams.append('search', params.search);
        if (params?.driver) queryParams.append('driver', params.driver);
        if (params?.vehicle) queryParams.append('vehicle', params.vehicle);
        if (params?.state) queryParams.append('state', params.state);
        if (params?.startDate) queryParams.append('startDate', params.startDate);
        if (params?.endDate) queryParams.append('endDate', params.endDate);
        if (params?.page) queryParams.append('page', params.page.toString());
        if (params?.limit) queryParams.append('limit', params.limit.toString());
        
        if (queryParams.toString()) {
            url += `?${queryParams.toString()}`;
        }
        
        const res: AxiosResponse = await apiClient.get(url);
        return res.data;
    } catch (error: any) {
        const err = error as Error;
        return err.response?.data;
    }
};

export const getMilesTrackingById = async (id: string) => {
    try {
        const res: AxiosResponse = await apiClient.get(`hr/miles-tracking/${id}`);
        return res.data;
    } catch (error: any) {
        const err = error as Error;
        return err.response?.data;
    }
};

export const updateMilesTracking = async (id: string, data: any) => {
    try {
        const res: AxiosResponse = await apiClient.put(`hr/miles-tracking/${id}`, data);
        return res.data;
    } catch (error: any) {
        const err = error as Error;
        return err.response?.data;
    }
};

export const deleteMilesTracking = async (id: string) => {
    try {
        const res: AxiosResponse = await apiClient.delete(`hr/miles-tracking/${id}`);
        return res.data;
    } catch (error: any) {
        const err = error as Error;
        return err.response?.data;
    }
};

export const getMilesTrackingStats = async (params?: {
    startDate?: string;
    endDate?: string;
    driver?: string;
    vehicle?: string;
}) => {
    try {
        let url = `hr/miles-tracking/stats`;
        const queryParams = new URLSearchParams();
        
        if (params?.startDate) queryParams.append('startDate', params.startDate);
        if (params?.endDate) queryParams.append('endDate', params.endDate);
        if (params?.driver) queryParams.append('driver', params.driver);
        if (params?.vehicle) queryParams.append('vehicle', params.vehicle);
        
        if (queryParams.toString()) {
            url += `?${queryParams.toString()}`;
        }
        
        const res: AxiosResponse = await apiClient.get(url);
        return res.data;
    } catch (error: any) {
        const err = error as Error;
        return err.response?.data;
    }
};

