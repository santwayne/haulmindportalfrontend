import { type AxiosResponse } from "axios";
import apiClient from "../apiClient";

interface Error {
    response?: {
        data?: {
            message: string;
        };
    };
}

// Upload ELD document
export const uploadELDDocument = async (formData: FormData) => {
    try {
        const res: AxiosResponse = await apiClient.post(`hr/eld-documents/upload`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return res.data;
    } catch (error: any) {
        const err = error as Error;
        return err.response?.data || { success: false, message: 'Failed to upload ELD document' };
    }
};

// Get all ELD documents
export const getELDDocuments = async (params?: {
    page?: number;
    limit?: number;
    search?: string;
}) => {
    try {
        const queryParams = new URLSearchParams();
        if (params?.page) queryParams.append('page', params.page.toString());
        if (params?.limit) queryParams.append('limit', params.limit.toString());
        if (params?.search) queryParams.append('search', params.search);
        
        const url = `hr/eld-documents${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
        const res: AxiosResponse = await apiClient.get(url);
        return res.data;
    } catch (error: any) {
        const err = error as Error;
        return err.response?.data || { success: false, message: 'Failed to fetch ELD documents' };
    }
};

// Get ELD document by ID
export const getELDDocumentById = async (documentId: string) => {
    try {
        const res: AxiosResponse = await apiClient.get(`hr/eld-documents/${documentId}`);
        return res.data;
    } catch (error: any) {
        const err = error as Error;
        return err.response?.data || { success: false, message: 'Failed to fetch ELD document' };
    }
};

// Delete ELD document
export const deleteELDDocument = async (documentId: string) => {
    try {
        const res: AxiosResponse = await apiClient.delete(`hr/eld-documents/${documentId}`);
        return res.data;
    } catch (error: any) {
        const err = error as Error;
        return err.response?.data || { success: false, message: 'Failed to delete ELD document' };
    }
};

// Get signed URL for ELD document (for viewing/downloading)
export const getELDDocumentSignedUrl = async (documentId: string, disposition: 'inline' | 'attachment' = 'inline') => {
    try {
        // Ensure disposition is explicitly set to 'inline' or 'attachment'
        const dispositionParam = disposition === 'attachment' ? 'attachment' : 'inline';
        const res: AxiosResponse = await apiClient.get(`hr/eld-documents/${documentId}/signed-url`, {
            params: { disposition: dispositionParam }
        });
        return res.data;
    } catch (error: any) {
        const err = error as Error;
        return err.response?.data || { success: false, message: 'Failed to get signed URL for ELD document' };
    }
};

// Download ELD document
export const downloadELDDocument = async (documentId: string) => {
    try {
        // First get the signed URL
        const signedUrlResponse = await getELDDocumentSignedUrl(documentId, 'attachment');
        if (!signedUrlResponse.success || !signedUrlResponse.url) {
            throw new Error(signedUrlResponse.message || 'Failed to get signed URL');
        }
        
        // Download from the signed URL using fetch (since it's a full URL)
        const response = await fetch(signedUrlResponse.url);
        if (!response.ok) {
            throw new Error(`Failed to download file: ${response.statusText}`);
        }
        const blob = await response.blob();
        return blob;
    } catch (error: any) {
        const err = error as Error;
        throw err;
    }
};

// Update ELD document (metadata only)
export const updateELDDocument = async (documentId: string, data: {
    title?: string;
    description?: string;
    isActive?: boolean;
}) => {
    try {
        const res: AxiosResponse = await apiClient.put(`hr/eld-documents/${documentId}`, data);
        return res.data;
    } catch (error: any) {
        const err = error as Error;
        return err.response?.data || { success: false, message: 'Failed to update ELD document' };
    }
};


