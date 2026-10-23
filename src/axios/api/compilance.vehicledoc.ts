import { type AxiosResponse } from 'axios'
import apiClient from '../apiClient'

interface Error {
    response?: {
        data?: {
            message: string,
        }
    }
}

export const getVehicleDocument = async () => {
    try {
        console.log('🚀 FRONTEND: Fetching vehicle documents from hr/vehicle-document');
        const res: AxiosResponse = await apiClient.get(`hr/vehicle-document`);
        console.log("📡 FRONTEND: Vehicle documents response:", res.data);
        return res.data;
    } catch (error: any) {
        console.error("❌ FRONTEND: Vehicle documents error:", error);
        const err = error as Error;
        return err.response?.data;
    }
};


export const createVehicleDocument = async (data: any) => {
    try {
        console.log('📤 FRONTEND: Creating vehicle document');
        // Log FormData contents (can't directly log FormData, but log what we can)
        if (data instanceof FormData) {
            console.log('📦 FRONTEND: FormData being sent');
            // Try to log entries if possible
            const entries: string[] = [];
            for (const [key, value] of data.entries()) {
                if (value instanceof File) {
                    entries.push(`${key}: File(${value.name}, ${value.size} bytes, ${value.type})`);
                } else {
                    entries.push(`${key}: ${value}`);
                }
            }
            console.log('📦 FRONTEND: FormData entries:', entries);
        } else {
            console.log('📦 FRONTEND: Data being sent:', data);
        }
        
        const res: AxiosResponse = await apiClient.post(`hr/vehicle-document`, data, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        });
        console.log("✅ FRONTEND: Vehicle document created successfully:", res.data);
        return res.data;
    } catch (error: any) {
        console.error("❌ FRONTEND: Vehicle document creation error:", error);
        console.error("❌ FRONTEND: Error response:", error.response?.data);
        const err = error as Error;
        return err.response?.data;
    }
};


export const updateVehicleDocument = async (id: string, data: any) => {
    try {
        console.log('📤 FRONTEND: Updating vehicle document', id);
        // Check if data is FormData
        const headers = data instanceof FormData
            ? { 'Content-Type': 'multipart/form-data' }
            : {};
        
        const res: AxiosResponse = await apiClient.put(`hr/vehicle-document/${id}`, data, { headers });
        console.log("✅ FRONTEND: Vehicle document updated successfully:", res.data);
        return res.data;
    } catch (error: any) {
        console.error("❌ FRONTEND: Vehicle document update error:", error);
        const err = error as Error;
        return err.response?.data;
    }
};


export const deleteVehicleDocument = async (id: string) => {
    try {
        const res: AxiosResponse = await apiClient.delete(`hr/vehicle-document/${id}`);
        console.log("==delete res ", res);
        return res.data;
    } catch (error: any) {
        const err = error as Error;
        return err.response?.data;
    }
};

export const getExpiringVehicleDocuments = async (days: number = 30) => {
  try {
    const response: AxiosResponse<{
      success: boolean;
      data: any[];
    }> = await apiClient.get(`/hr/vehicle-document/expiring?days=${days}`);
    
    return response.data;
  } catch (error: any) {
    console.error('Error fetching expiring vehicle documents:', error);
    // Return error structure instead of throwing
    return error?.response?.data || { success: false, message: error?.message || 'Failed to fetch expiring vehicle documents', data: [] };
  }
};

export const getSignedVehicleDocumentUrl = async (id: string, fileIndex: number = 0, disposition: 'inline' | 'attachment' = 'inline') => {
  try {
    const res = await apiClient.get(`hr/vehicle-document/${id}/signed-url?fileIndex=${fileIndex}&disposition=${disposition}`);
    return res.data;
  } catch (error) {
    console.log(error);
    return (error as any).response?.data;
  }
};