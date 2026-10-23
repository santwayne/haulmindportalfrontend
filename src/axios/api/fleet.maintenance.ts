import { type AxiosResponse } from "axios";
import apiClient from "../apiClient";

interface Error {
    response?: {
        data?: {
            message: string;
        };
    };
}

export const getMaintenanceSchedule = async () => {
    try {
        const res: AxiosResponse = await apiClient.get(`admin/maintanance-details`);
        console.log("==getMaintenanceSchedule res ", res);
        return res.data;
    } catch (error: any) {
        const err = error as Error;
        return err.response?.data;
    }
};


export const getMaintenanceCostReport = async (filters?: {
    vehicleId?: string;
    year?: string | number;
}) => {
    try {
        const params = new URLSearchParams();
        if (filters?.vehicleId) params.append('vehicleId', filters.vehicleId);
        if (filters?.year) params.append('year', filters.year.toString());

        const res: AxiosResponse = await apiClient.get(
            `admin/maintenance-cost${params.toString() ? `?${params.toString()}` : ''}`
        );
        console.log("==getMaintenanceCostReport res ", res);
        return res.data;
    } catch (error: any) {
        const err = error as Error;
        return err.response?.data;
    }
};


export const listTrailers = async () => {
    try {
        const res: AxiosResponse = await apiClient.get(`dispatcher/trailer`);
        return res.data;
    } catch (error) {
        return (error as Error).response?.data;
    }
}