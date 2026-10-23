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

export const getAccountsDashboard = async () => {
    try {
        const res: AxiosResponse = await apiClient.get(`hr/accounts-dashboard`);
        console.log("==getAccountsDashboard res", res);
        return res.data;
    } catch (error: any) {
        const err = error as Error;
        return err.response?.data;
    }
};

