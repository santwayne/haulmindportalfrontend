import { type AxiosResponse } from "axios";
import apiClient from "../apiClient";

interface Error {
    response?: {
        data?: {
            message: string;
        };
    };
}


export const DashboardStats = async () => {
    try {
        const res: AxiosResponse = await apiClient.get(`admin/fleet-management/dashboard-stats`);
        return res.data;
    } catch (error: any) {
        const err = error as Error;
        return err.response?.data;
    }
};

export const TrailerStats = async () => {
    try {
        const res: AxiosResponse = await apiClient.get(`dispatcher/trailer/stats`);
        return res.data;
    } catch (error: any) {
        const err = error as Error;
        return err.response?.data;
    }
};

export const UpcomingOverdue = async () => {
    try {
        const res: AxiosResponse = await apiClient.get(`admin/fleet-management/upcoming-overdue`);
        return res.data;
    } catch (error: any) {
        const err = error as Error;
        return err.response?.data;
    }
};

export const RecentWorkOrder = async () => {
    try {
        const res: AxiosResponse = await apiClient.get(`admin/fleet-management/recent-work-orders`);
        return res.data;
    } catch (error: any) {
        const err = error as Error;
        return err.response?.data;
    }
};

export const MonthlyCost = async () => {
    try {
        const res: AxiosResponse = await apiClient.get(`admin/fleet-management/monthly-cost`);
        return res.data;
    } catch (error: any) {
        const err = error as Error;
        return err.response?.data;
    }
};