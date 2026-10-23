import { type AxiosResponse } from "axios";
import apiClient from "../apiClient";

interface Error {
    message?: string;
    response?: {
        data?: {
            message: string;
        };
    };
}

export const getFinanceReport = async (params?: { period?: string; startDate?: string; endDate?: string }) => {
    try {
        const queryParams = new URLSearchParams();
        if (params?.period) queryParams.append('period', params.period);
        if (params?.startDate) queryParams.append('startDate', params.startDate);
        if (params?.endDate) queryParams.append('endDate', params.endDate);
        
        const queryString = queryParams.toString();
        const url = `hr/finance-report${queryString ? `?${queryString}` : ''}`;
        
        const res: AxiosResponse = await apiClient.get(url);
        console.log("==getFinanceReport res", res);
        return res.data;
    } catch (error: any) {
        const err = error as Error;
        return err.response?.data;
    }
};

