import { type AxiosResponse } from "axios";
import apiClient from "../apiClient";

interface Error {
    response?: {
        data?: {
            message: string;
        };
    };
}

// Get HOS/ELD data for compliance dashboard
export const getHOSEldData = async (params?: {
    startDate?: string;
    endDate?: string;
}) => {
    try {
        const queryParams = new URLSearchParams();
        if (params?.startDate) queryParams.append('startDate', params.startDate);
        if (params?.endDate) queryParams.append('endDate', params.endDate);
        
        const url = `compliance/hos-eld${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
        const res: AxiosResponse = await apiClient.get(url);
        return res.data;
    } catch (error: any) {
        const err = error as Error;
        return err.response?.data;
    }
};

// Sync HOS data from Samsara
export const syncHOSFromSamsara = async () => {
    try {
        const res: AxiosResponse = await apiClient.post(`compliance/hos-eld/sync`);
        return res.data;
    } catch (error: any) {
        const err = error as Error;
        return err.response?.data;
    }
};

// Keep old function name for backward compatibility
export const syncHOSFromGeotab = syncHOSFromSamsara;

// Get HOS data for a specific driver
export const getDriverHOS = async (driverId: string, params?: {
    startDate?: string;
    endDate?: string;
}) => {
    try {
        const queryParams = new URLSearchParams();
        if (params?.startDate) queryParams.append('startDate', params.startDate);
        if (params?.endDate) queryParams.append('endDate', params.endDate);
        
        const url = `compliance/hos-eld/driver/${driverId}${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
        const res: AxiosResponse = await apiClient.get(url);
        return res.data;
    } catch (error: any) {
        const err = error as Error;
        return err.response?.data;
    }
};

// Get vehicle ELD status
export const getVehicleELDStatus = async (vehicleId: string) => {
    try {
        const res: AxiosResponse = await apiClient.get(`compliance/hos-eld/vehicle/${vehicleId}`);
        return res.data;
    } catch (error: any) {
        const err = error as Error;
        return err.response?.data;
    }
};

// Submit HOS Audit
export const submitHOSAudit = async (auditData: {
    driverId: string;
    auditDate: string;
    drivingHours: number;
    onDutyHours: number;
    offDutyHours: number;
    violations: string[];
    notes?: string;
    auditorName?: string;
}) => {
    try {
        const res: AxiosResponse = await apiClient.post(`compliance/hos-eld/audit`, auditData);
        return res.data;
    } catch (error: any) {
        const err = error as Error;
        return err.response?.data;
    }
};

// Create HOS Audit Form record (full form with all fields)
export const createHosAuditForm = async (formData: FormData) => {
    try {
        const res: AxiosResponse = await apiClient.post(`compliance/hos-eld/audit-form`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return res.data;
    } catch (error: any) {
        const err = error as Error;
        return err.response?.data;
    }
};

// Get HOS Audit Form list
export const getHosAuditForms = async (params?: {
    driverId?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
}) => {
    try {
        const queryParams = new URLSearchParams();
        if (params?.driverId) queryParams.append('driverId', params.driverId);
        if (params?.startDate) queryParams.append('startDate', params.startDate);
        if (params?.endDate) queryParams.append('endDate', params.endDate);
        if (params?.page != null) queryParams.append('page', params.page.toString());
        if (params?.limit != null) queryParams.append('limit', params.limit.toString());
        const url = `compliance/hos-eld/audit-form${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
        const res: AxiosResponse = await apiClient.get(url);
        return res.data;
    } catch (error: any) {
        const err = error as Error;
        return err.response?.data;
    }
};

// Get signed URL for HOS Audit Form document
export const getHosAuditDocumentUrl = async (auditId: string, documentIndex: number) => {
    try {
        const res: AxiosResponse = await apiClient.get(`compliance/hos-eld/audit-form/${auditId}/document/${documentIndex}`);
        return res.data;
    } catch (error: any) {
        const err = error as Error;
        return err.response?.data;
    }
};

// Upload E-Log file
export const uploadELogFile = async (formData: FormData) => {
    try {
        const res: AxiosResponse = await apiClient.post(`compliance/hos-eld/e-logs/upload`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return res.data;
    } catch (error: any) {
        const err = error as Error;
        return err.response?.data;
    }
};

// Get E-Logs list
export const getELogs = async (params?: {
    driverId?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
}) => {
    try {
        const queryParams = new URLSearchParams();
        if (params?.driverId) queryParams.append('driverId', params.driverId);
        if (params?.startDate) queryParams.append('startDate', params.startDate);
        if (params?.endDate) queryParams.append('endDate', params.endDate);
        if (params?.page) queryParams.append('page', params.page.toString());
        if (params?.limit) queryParams.append('limit', params.limit.toString());
        
        const url = `compliance/hos-eld/e-logs${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
        const res: AxiosResponse = await apiClient.get(url);
        return res.data;
    } catch (error: any) {
        const err = error as Error;
        return err.response?.data;
    }
};

// Delete E-Log file
export const deleteELog = async (logId: string) => {
    try {
        const res: AxiosResponse = await apiClient.delete(`compliance/hos-eld/e-logs/${logId}`);
        return res.data;
    } catch (error: any) {
        const err = error as Error;
        return err.response?.data;
    }
};

// Download E-Log file
export const downloadELog = async (logId: string) => {
    try {
        const res: AxiosResponse = await apiClient.get(`compliance/hos-eld/e-logs/${logId}/download`, {
            responseType: 'blob',
        });
        return res.data;
    } catch (error: any) {
        const err = error as Error;
        return err.response?.data;
    }
};

